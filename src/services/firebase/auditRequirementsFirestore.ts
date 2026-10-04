/**
 * Serviço Firestore para Gestão Inteligente de Requisitos de Auditorias Externas
 * e Ciclo de Vida do Envio (Cancelamento, Arquivamento, Exclusão Segura e Restauração)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  RequisitoAuditoriaExterna,
  RequisitoOrganizacionalReutilizavel,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  UserProfile,
  NCRecord,
} from '../../types';
import {
  OperationType,
  handleFirestoreError,
  recordOrganizationAudit,
  sanitizeForFirestore,
} from './firestore';

/**
 * Escuta requisitos de auditorias de uma organização em tempo real.
 * Se auditId for fornecido, filtra apenas os requisitos daquela auditoria.
 */
export function subscribeToAuditRequirements(
  organizationId: string,
  auditId: string | null | undefined,
  callback: (requirements: RequisitoAuditoriaExterna[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const reqsCollectionRef = collection(db, 'organizations', organizationId, 'auditRequirements');
  const q = auditId && auditId !== 'TODAS'
    ? query(reqsCollectionRef, where('auditId', '==', auditId))
    : reqsCollectionRef;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: RequisitoAuditoriaExterna[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RequisitoAuditoriaExterna);
      });

      // Ordenar por ordem ou número do item
      list.sort((a, b) => {
        const orderA = a.hierarquia?.ordem ?? 0;
        const orderB = b.hierarquia?.ordem ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.numeroItem || '').localeCompare(b.numeroItem || '', undefined, { numeric: true });
      });

      callback(list);
    },
    (error) => {
      console.error('Erro na subscrição de auditRequirements:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Salva ou atualiza um requisito de auditoria externa com trilha de auditoria
 */
export async function saveAuditRequirement(
  organizationId: string,
  requirement: RequisitoAuditoriaExterna,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode alterar requisitos de auditoria.');
  }

  const path = `organizations/${organizationId}/auditRequirements/${requirement.id}`;
  const now = new Date().toISOString();

  const dataToSave: RequisitoAuditoriaExterna = {
    ...requirement,
    organizationId,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'auditRequirements', requirement.id);
    await setDoc(docRef, sanitizeForFirestore(dataToSave), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: requirement.auditId,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Requisito ${requirement.numeroItem} atualizado na auditoria ${requirement.numeroAuditoria} (Atendimento: ${requirement.situacaoAtendimento}, Decisão: ${requirement.decisaoOrganizacional || 'NÃO DEFINIDA'})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Gravação em lote de requisitos de auditoria (ex: 69 itens do Kalitta QA-14)
 */
export async function saveAuditRequirementsBatch(
  organizationId: string,
  requirements: RequisitoAuditoriaExterna[],
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode importar requisitos de auditoria.');
  }
  if (!requirements || requirements.length === 0) return;

  const now = new Date().toISOString();
  const chunkSize = 400; // Limite do batch do Firestore é 500

  for (let i = 0; i < requirements.length; i += chunkSize) {
    const chunk = requirements.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((req) => {
      const docRef = doc(db, 'organizations', organizationId, 'auditRequirements', req.id);
      const dataToSave = {
        ...req,
        organizationId,
        updatedAt: now,
      };
      batch.set(docRef, sanitizeForFirestore(dataToSave), { merge: true });
    });

    await batch.commit();
  }

  await recordOrganizationAudit(organizationId, {
    entity: 'AUDIT',
    entityId: requirements[0].auditId,
    action: 'CREATE',
    changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
    changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
    summary: `Importação em lote de ${requirements.length} requisitos na auditoria ${requirements[0].numeroAuditoria}`,
  });
}

/**
 * Análise de dependências antes de exclusão de auditoria
 */
export interface AuditDependencyCheckResult {
  canDeleteSafely: boolean;
  hasRNCs: boolean;
  hasSentResponses: boolean;
  hasAcceptedResponses: boolean;
  rncNumbers: string[];
  totalRequirements: number;
  totalFindings: number;
  blockingReason?: string;
  recommendation: 'EXCLUIR' | 'CANCELAR_LOGICAMENTE' | 'ARQUIVAR';
}

export async function checkAuditDependencies(
  organizationId: string,
  auditId: string
): Promise<AuditDependencyCheckResult> {
  const reqsRef = collection(db, 'organizations', organizationId, 'auditRequirements');
  const qReqs = query(reqsRef, where('auditId', '==', auditId));
  const reqsSnap = await getDocs(qReqs);

  const findingsRef = collection(db, 'organizations', organizationId, 'auditFindings');
  const qFindings = query(findingsRef, where('auditId', '==', auditId));
  const findingsSnap = await getDocs(qFindings);

  const rncNumbers = new Set<string>();
  let hasSentResponses = false;
  let hasAcceptedResponses = false;

  reqsSnap.forEach((docSnap) => {
    const r = docSnap.data() as RequisitoAuditoriaExterna;
    if (r.rncNumero) rncNumbers.add(r.rncNumero);
    if (r.respostaOficialEnviada) hasSentResponses = true;
    if (r.statusAceitacaoAuditor === 'ACEITA') hasAcceptedResponses = true;
  });

  findingsSnap.forEach((docSnap) => {
    const f = docSnap.data() as ConstatacaoExternaRecord;
    if (f.numeroRNCInterna) rncNumbers.add(f.numeroRNCInterna);
    if (f.status === 'ENVIADA' || f.status === 'ACEITA' || f.status === 'ENCERRADA') {
      hasSentResponses = true;
    }
    if (f.status === 'ACEITA' || f.status === 'ENCERRADA') {
      hasAcceptedResponses = true;
    }
  });

  const hasRNCs = rncNumbers.size > 0;
  const totalRequirements = reqsSnap.size;
  const totalFindings = findingsSnap.size;

  if (hasAcceptedResponses || hasRNCs) {
    return {
      canDeleteSafely: false,
      hasRNCs,
      hasSentResponses,
      hasAcceptedResponses,
      rncNumbers: Array.from(rncNumbers),
      totalRequirements,
      totalFindings,
      blockingReason: hasAcceptedResponses
        ? 'Esta auditoria possui respostas formais aceitas/homologadas pelo auditor ou autoridade externa.'
        : `Esta auditoria possui ${rncNumbers.size} RNC(s) vinculada(s) (${Array.from(rncNumbers).join(', ')}). A exclusão definitiva destruiria a rastreabilidade regulatória mandatória.`,
      recommendation: 'CANCELAR_LOGICAMENTE',
    };
  }

  if (hasSentResponses) {
    return {
      canDeleteSafely: false,
      hasRNCs: false,
      hasSentResponses: true,
      hasAcceptedResponses: false,
      rncNumbers: [],
      totalRequirements,
      totalFindings,
      blockingReason: 'Esta auditoria já possui respostas enviadas ao cliente/auditor. A exclusão apagará o histórico da comunicação oficial.',
      recommendation: 'CANCELAR_LOGICAMENTE',
    };
  }

  return {
    canDeleteSafely: true,
    hasRNCs: false,
    hasSentResponses: false,
    hasAcceptedResponses: false,
    rncNumbers: [],
    totalRequirements,
    totalFindings,
    recommendation: 'EXCLUIR',
  };
}

/**
 * Cancelamento Lógico Controlado da Auditoria e Itens Derivados em Cascata
 * Retira os itens dos painéis operacionais sem destruir o histórico necessário.
 */
export async function cancelAuditAndCascadingItems(
  organizationId: string,
  auditId: string,
  motivoCancelamento: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Cancelamento de auditoria é restrito a GESTOR_SGQ e ADMIN.');
  }
  if (!motivoCancelamento || motivoCancelamento.trim().length < 5) {
    throw new Error('Por favor, informe a justificativa detalhada do cancelamento do envio.');
  }

  const now = new Date().toISOString();
  const userName = userProfile?.displayName || auth.currentUser?.email || 'Gestor SGQ';
  const userUid = userProfile?.uid || auth.currentUser?.uid || 'anon';

  // 1. Atualizar a Auditoria para CANCELADA
  const auditDocRef = doc(db, 'organizations', organizationId, 'externalAudits', auditId);
  const auditSnap = await getDoc(auditDocRef);
  const auditData = auditSnap.data() as AuditoriaExternaRecord | undefined;

  await setDoc(
    auditDocRef,
    {
      status: 'CANCELADA',
      motivoCancelamento,
      canceladoPorNome: userName,
      canceladoPorUid: userUid,
      canceladoEm: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // 2. Atualizar todos os Requisitos vinculados para statusRegistro: 'CANCELADO'
  const reqsRef = collection(db, 'organizations', organizationId, 'auditRequirements');
  const qReqs = query(reqsRef, where('auditId', '==', auditId));
  const reqsSnap = await getDocs(qReqs);

  if (!reqsSnap.empty) {
    const batch = writeBatch(db);
    reqsSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        statusRegistro: 'CANCELADO',
        estadoAcompanhamento: 'SUSPENSO_CANCELADO',
        motivoCancelamento,
        updatedAt: now,
      });
    });
    await batch.commit();
  }

  // 3. Atualizar Constatações / Findings vinculados para status: 'CANCELADA'
  const findingsRef = collection(db, 'organizations', organizationId, 'auditFindings');
  const qFindings = query(findingsRef, where('auditId', '==', auditId));
  const findingsSnap = await getDocs(qFindings);

  if (!findingsSnap.empty) {
    const batchFindings = writeBatch(db);
    findingsSnap.forEach((docSnap) => {
      batchFindings.update(docSnap.ref, {
        status: 'CANCELADA',
        observacoesCancelamento: motivoCancelamento,
        canceladoEm: now,
        canceladoPor: userName,
        updatedAt: now,
      });
    });
    await batchFindings.commit();
  }

  // 4. Registrar na Trilha de Auditoria
  await recordOrganizationAudit(organizationId, {
    entity: 'AUDIT',
    entityId: auditId,
    action: 'CANCEL_SUBMISSION',
    changedByUid: userUid,
    changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
    summary: `Envio cancelado da auditoria ${auditData?.numeroAuditoria || auditId}: "${motivoCancelamento}" (${reqsSnap.size} requisitos e ${findingsSnap.size} constatações desativados dos painéis operacionais).`,
  });
}

/**
 * Reversão / Restauração Segura de Auditoria Cancelada
 */
export async function restoreCancelledAudit(
  organizationId: string,
  auditId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Restauração de auditoria é restrita a GESTOR_SGQ e ADMIN.');
  }

  const now = new Date().toISOString();
  const auditDocRef = doc(db, 'organizations', organizationId, 'externalAudits', auditId);
  await setDoc(
    auditDocRef,
    {
      status: 'RECEBIDA',
      motivoCancelamento: null,
      canceladoPorNome: null,
      canceladoPorUid: null,
      canceladoEm: null,
      updatedAt: now,
    },
    { merge: true }
  );

  // Restaurar Requisitos
  const reqsRef = collection(db, 'organizations', organizationId, 'auditRequirements');
  const qReqs = query(reqsRef, where('auditId', '==', auditId));
  const reqsSnap = await getDocs(qReqs);

  if (!reqsSnap.empty) {
    const batch = writeBatch(db);
    reqsSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        statusRegistro: 'ATIVO',
        estadoAcompanhamento: 'NAO_INICIADO',
        updatedAt: now,
      });
    });
    await batch.commit();
  }

  // Restaurar Findings
  const findingsRef = collection(db, 'organizations', organizationId, 'auditFindings');
  const qFindings = query(findingsRef, where('auditId', '==', auditId));
  const findingsSnap = await getDocs(qFindings);

  if (!findingsSnap.empty) {
    const batchFindings = writeBatch(db);
    findingsSnap.forEach((docSnap) => {
      batchFindings.update(docSnap.ref, {
        status: 'ABERTA',
        updatedAt: now,
      });
    });
    await batchFindings.commit();
  }

  await recordOrganizationAudit(organizationId, {
    entity: 'AUDIT',
    entityId: auditId,
    action: 'RESTORE_SUBMISSION',
    changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
    changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
    summary: `Auditoria ${auditId} restaurada para o estado ativo nos painéis operacionais.`,
  });
}

/**
 * Arquivamento de Auditoria
 */
export async function archiveAudit(
  organizationId: string,
  auditId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode arquivar auditorias.');
  }

  const now = new Date().toISOString();
  const auditDocRef = doc(db, 'organizations', organizationId, 'externalAudits', auditId);
  await setDoc(
    auditDocRef,
    {
      status: 'ARQUIVADA',
      isArquivada: true,
      updatedAt: now,
    },
    { merge: true }
  );

  await recordOrganizationAudit(organizationId, {
    entity: 'AUDIT',
    entityId: auditId,
    action: 'ARCHIVE',
    changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
    changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
    summary: `Auditoria ${auditId} arquivada.`,
  });
}

/**
 * Exclusão definitiva de auditoria e dependências após validação estrita
 * Permite forceDelete=true para fins de homologação e testes no sistema
 */
export async function deleteAuditWithDependencyCheck(
  organizationId: string,
  auditId: string,
  userProfile?: UserProfile | null,
  forceDelete: boolean = false
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão definitiva é restrita a GESTOR_SGQ e ADMIN.');
  }

  const check = await checkAuditDependencies(organizationId, auditId);
  if (!check.canDeleteSafely && !forceDelete) {
    throw new Error(
      `Exclusão bloqueada por integridade: ${check.blockingReason} Utilize o Cancelamento Lógico ou Arquivamento para preservar a rastreabilidade.`
    );
  }

  // 1. Apagar Requisitos em batch
  const reqsRef = collection(db, 'organizations', organizationId, 'auditRequirements');
  const qReqs = query(reqsRef, where('auditId', '==', auditId));
  const reqsSnap = await getDocs(qReqs);
  if (!reqsSnap.empty) {
    const batch = writeBatch(db);
    reqsSnap.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }

  // 2. Apagar Findings em batch
  const findingsRef = collection(db, 'organizations', organizationId, 'auditFindings');
  const qFindings = query(findingsRef, where('auditId', '==', auditId));
  const findingsSnap = await getDocs(qFindings);
  if (!findingsSnap.empty) {
    const batchFindings = writeBatch(db);
    findingsSnap.forEach((docSnap) => batchFindings.delete(docSnap.ref));
    await batchFindings.commit();
  }

  // 3. Apagar a Auditoria
  const auditDocRef = doc(db, 'organizations', organizationId, 'externalAudits', auditId);
  await deleteDoc(auditDocRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'AUDIT',
    entityId: auditId,
    action: forceDelete ? 'FORCE_DELETE' : 'DELETE',
    changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
    changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
    summary: `${forceDelete ? '[MODO DE TESTES / FORÇADO] ' : ''}Exclusão definitiva da auditoria ${auditId} (${reqsSnap.size} requisitos e ${findingsSnap.size} constatações removidos).`,
  });
}
