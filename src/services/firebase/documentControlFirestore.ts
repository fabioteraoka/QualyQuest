import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  DocumentoControlado,
  RevisaoDocumental,
  FonteExternaControlada,
  SolicitacaoRevisaoCliente,
  LogVerificacaoFonteExterna,
  RegistroEvidenciaConsultaDocumento,
  UserProfile,
  StatusSolicitacaoCliente,
} from '../../types';
import {
  DEFAULT_ORGANIZATION_ID,
  OperationType,
  handleFirestoreError,
  sanitizeForFirestore,
  recordOrganizationAudit,
} from './firestore';
import {
  INITIAL_DOCUMENTOS_CONTROLADOS,
  INITIAL_REVISOES_DOCUMENTAIS,
  INITIAL_FONTES_EXTERNAS,
  INITIAL_SOLICITACOES_CLIENTE,
  INITIAL_LOGS_VERIFICACAO,
  INITIAL_EVIDENCIAS_CONSULTA,
} from '../../data/initialDocumentControl';

// ============================================================================
// 1. DOCUMENTOS CONTROLADOS (IDENTIDADE LÓGICA)
// ============================================================================

export function subscribeToDocumentosControlados(
  organizationId: string,
  callback: (documentos: DocumentoControlado[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'controlled_documents');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_DOCUMENTOS_CONTROLADOS.forEach((docItem) => {
              const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', docItem.id);
              batch.set(docRef, sanitizeForFirestore({ ...docItem, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_DOCUMENTOS_CONTROLADOS locais', e);
          }
          callback(INITIAL_DOCUMENTOS_CONTROLADOS);
        } else {
          callback([]);
        }
        return;
      }

      const list: DocumentoControlado[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as DocumentoControlado);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar documentos controlados:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_DOCUMENTOS_CONTROLADOS : []);
    }
  );
}

export interface DependenciasDocumentoResult {
  podeExcluir: boolean;
  totalRevisoes: number;
  totalConsultas: number;
  totalSolicitacoes: number;
  totalRNCs: number;
  totalVinculos: number;
  motivosBloqueio: string[];
  detalhes: string[];
}

/**
 * Verifica se um documento controlado possui revisões, consultas, solicitações ou RNCs vinculadas.
 * Conforme regulamentações aeronáuticas (RBAC 145 / MOMQ / EASA), documentos com histórico
 * não podem ser excluídos fisicamente, devendo ser inativados/obsoletados.
 */
export function verificarDependenciasDocumento(
  documentoId: string,
  codigoDoc: string,
  revisoes: RevisaoDocumental[] = [],
  evidenciasConsulta: RegistroEvidenciaConsultaDocumento[] = [],
  solicitacoes: SolicitacaoRevisaoCliente[] = [],
  nonConformities: any[] = []
): DependenciasDocumentoResult {
  const revs = revisoes.filter((r) => r.documentoId === documentoId);
  const consultas = evidenciasConsulta.filter((e) => e.documentoId === documentoId);
  const solics = solicitacoes.filter((s) => s.documentoId === documentoId);
  const rncs = nonConformities.filter(
    (nc) =>
      nc.documentoId === documentoId ||
      (nc.documentoReferencia &&
        typeof nc.documentoReferencia === 'string' &&
        nc.documentoReferencia.toLowerCase().includes(codigoDoc.toLowerCase()))
  );

  const motivosBloqueio: string[] = [];
  if (revs.length > 0) motivosBloqueio.push(`${revs.length} revisão(ões) cronológica(s) vinculada(s)`);
  if (consultas.length > 0) motivosBloqueio.push(`${consultas.length} registro(s) de evidência de consulta`);
  if (solics.length > 0) motivosBloqueio.push(`${solics.length} solicitação(ões) de cliente vinculada(s)`);
  if (rncs.length > 0) motivosBloqueio.push(`${rncs.length} RNC(s) referenciando este documento`);

  return {
    podeExcluir: motivosBloqueio.length === 0,
    totalRevisoes: revs.length,
    totalConsultas: consultas.length,
    totalSolicitacoes: solics.length,
    totalRNCs: rncs.length,
    totalVinculos: motivosBloqueio.length,
    motivosBloqueio,
    detalhes: motivosBloqueio,
  };
}

export async function saveDocumentoControlado(
  organizationId: string,
  documento: DocumentoControlado,
  currentUser?: UserProfile | null,
  previousDocument?: DocumentoControlado | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  if (user.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode cadastrar ou editar documentos controlados.');
  }

  const isNew = !previousDocument && !documento.createdAt;
  const now = new Date().toISOString();
  const payload: DocumentoControlado = {
    ...documento,
    organizationId,
    updatedAt: now,
    createdAt: documento.createdAt || now,
    statusGeral: documento.statusGeral || 'ATIVO',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documento.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: documento.id,
      action: isNew ? 'CREATE' : 'UPDATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: isNew
        ? `Cadastro de documento controlado: ${documento.codigo} — ${documento.titulo}`
        : `Edição de metadados do documento: ${documento.codigo} — ${documento.titulo}`,
      previousValue: previousDocument
        ? JSON.stringify({
            codigo: previousDocument.codigo,
            titulo: previousDocument.titulo,
            categoria: previousDocument.categoria,
            emissor: previousDocument.emissor,
            responsavelNome: previousDocument.responsavelNome,
            statusGeral: previousDocument.statusGeral,
            exigeEvidenciaLeitura: previousDocument.exigeEvidenciaLeitura,
          })
        : undefined,
      newValue: JSON.stringify({
        codigo: documento.codigo,
        titulo: documento.titulo,
        categoria: documento.categoria,
        emissor: documento.emissor,
        responsavelNome: documento.responsavelNome,
        statusGeral: documento.statusGeral,
        exigeEvidenciaLeitura: documento.exigeEvidenciaLeitura,
      }),
      reason: isNew ? 'Novo documento inserido no Acervo SGQ' : 'Atualização de metadados documentais',
      origin: 'CONTROLE_DOCUMENTAL',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'controlled_documents');
    throw err;
  }
}

/**
 * Inativação Lógica / Obsolescência de Documento Controlado
 * Remove o documento do acervo ativo mas preserva integralmente revisões e evidências.
 */
export async function inactivateDocumentoControlado(
  organizationId: string,
  documentoId: string,
  motivo: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  if (user.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode inativar documentos.');
  }

  const now = new Date().toISOString();
  try {
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documentoId);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        statusGeral: 'INATIVO',
        updatedAt: now,
        inativadoEm: now,
        inativadoPor: user.displayName,
        motivoInativacao: motivo || 'Inativação/Obsolescência com preservação de acervo histórico',
      }),
      { merge: true }
    );

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: documentoId,
      action: 'INACTIVATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Inativação/Obsolescência de Documento: ID ${documentoId}. Motivo: ${motivo}`,
      previousValue: 'statusGeral: ATIVO',
      newValue: 'statusGeral: INATIVO',
      reason: motivo,
      origin: 'CONTROLE_DOCUMENTAL',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'controlled_documents');
    throw err;
  }
}

/**
 * Reativação Lógica de Documento Controlado no Acervo Vigente
 */
export async function reactivateDocumentoControlado(
  organizationId: string,
  documentoId: string,
  motivo: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  if (user.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode reativar documentos.');
  }

  const now = new Date().toISOString();
  try {
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documentoId);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        statusGeral: 'ATIVO',
        updatedAt: now,
        reativadoEm: now,
        reativadoPor: user.displayName,
        motivoReativacao: motivo || 'Reativação para acervo documental vigente',
      }),
      { merge: true }
    );

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: documentoId,
      action: 'REACTIVATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Reativação de Documento no Acervo Vigente: ID ${documentoId}. Motivo: ${motivo}`,
      previousValue: 'statusGeral: INATIVO',
      newValue: 'statusGeral: ATIVO',
      reason: motivo,
      origin: 'CONTROLE_DOCUMENTAL',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'controlled_documents');
    throw err;
  }
}

/**
 * Exclusão Física de Documento Controlado
 */
export async function deleteDocumentoControlado(
  organizationId: string,
  documentoId: string,
  codigoDocumentoOuUser?: string | UserProfile | null,
  currentUser?: UserProfile | null | string,
  motivoExclusao?: string,
  dependencias?: DependenciasDocumentoResult,
  forcarExclusaoComHistorico: boolean = false
): Promise<void> {
  // Normalizar parâmetros caso seja chamado com (orgId, docId, currentUser, motivo, ...)
  let codigoDoc = '';
  let userParam: UserProfile | null = null;
  let motivo = motivoExclusao || '';

  if (typeof codigoDocumentoOuUser === 'string') {
    codigoDoc = codigoDocumentoOuUser;
    userParam = (currentUser as UserProfile) || null;
  } else {
    userParam = (codigoDocumentoOuUser as UserProfile) || null;
    if (typeof currentUser === 'string') {
      motivo = currentUser;
    }
  }

  const user = userParam || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  if (user.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não tem permissão para excluir documentos.');
  }

  if (dependencias && !dependencias.podeExcluir && !forcarExclusaoComHistorico) {
    throw new Error(
      `Exclusão física bloqueada: este documento possui ${dependencias.motivosBloqueio?.join(
        ', '
      ) || 'vínculos históricos'}. Para manter conformidade aeronáutica (RBAC 145 / MOMQ / EASA), confirme a remoção de histórico ou utilize a Inativação/Obsolescência.`
    );
  }

  try {
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documentoId);
    await deleteDoc(docRef);

    // Se solicitado excluir junto o histórico/revisões vinculadas (limpeza de importações/duplicidades)
    if (forcarExclusaoComHistorico !== false) {
      try {
        const revsCol = collection(db, 'organizations', organizationId, 'document_revisions');
        const qRev = query(revsCol, where('documentoId', '==', documentoId));
        const revSnap = await getDocs(qRev);
        if (!revSnap.empty) {
          const batch = writeBatch(db);
          revSnap.forEach((snap) => {
            batch.delete(snap.ref);
          });
          await batch.commit();
        }
      } catch (errRev) {
        console.warn('Aviso: Erro ao limpar revisões do documento excluído:', errRev);
      }
    }

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: documentoId,
      action: 'DELETE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Exclusão definitiva de documento: ${codigoDoc || documentoId} (${documentoId})`,
      reason: motivo || 'Exclusão física solicitada pelo usuário no Acervo Documental',
      origin: 'CONTROLE_DOCUMENTAL',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'controlled_documents');
    throw err;
  }
}

/**
 * Exclui fisicamente uma revisão documental específica de um documento.
 */
export async function deleteRevisaoDocumental(
  organizationId: string,
  revisaoId: string,
  documentoId: string,
  currentUser?: UserProfile | null,
  motivo?: string
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  if (user.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não tem permissão para excluir revisões.');
  }

  try {
    const revRef = doc(db, 'organizations', organizationId, 'document_revisions', revisaoId);
    await deleteDoc(revRef);

    // Verificar se o documento possui esta revisão como a vigente e atualizar se necessário
    try {
      const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documentoId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.revisaoVigenteId === revisaoId) {
          const revsCol = collection(db, 'organizations', organizationId, 'document_revisions');
          const qRev = query(revsCol, where('documentoId', '==', documentoId));
          const remSnap = await getDocs(qRev);
          if (!remSnap.empty) {
            const remainingRevs = remSnap.docs.map((d) => d.data() as RevisaoDocumental);
            remainingRevs.sort((a, b) => (b.dataEntradaVigor || '').localeCompare(a.dataEntradaVigor || ''));
            const novaVigente = remainingRevs[0];
            await updateDoc(docRef, {
              revisaoVigenteId: novaVigente.id,
              revisaoVigenteNumero: novaVigente.numeroRevisao,
              updatedAt: new Date().toISOString(),
            });
          } else {
            await updateDoc(docRef, {
              revisaoVigenteId: null,
              revisaoVigenteNumero: 'S/R',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Aviso ao sincronizar documento pai após exclusão da revisão:', e);
    }

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: revisaoId,
      action: 'DELETE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Exclusão de revisão documental: ${revisaoId} (Doc: ${documentoId})`,
      reason: motivo || 'Exclusão física de revisão solicitada no SGQ',
      origin: 'CONTROLE_DOCUMENTAL',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'document_revisions');
    throw err;
  }
}

// ============================================================================
// 2. REVISÕES DOCUMENTAIS (VERSÕES IMUTÁVEIS)
// ============================================================================

export function subscribeToRevisoesDocumentais(
  organizationId: string,
  callback: (revisoes: RevisaoDocumental[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'document_revisions');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_REVISOES_DOCUMENTAIS.forEach((rev) => {
              const docRef = doc(db, 'organizations', organizationId, 'document_revisions', rev.id);
              batch.set(docRef, sanitizeForFirestore({ ...rev, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_REVISOES_DOCUMENTAIS locais', e);
          }
          callback(INITIAL_REVISOES_DOCUMENTAIS);
        } else {
          callback([]);
        }
        return;
      }

      const list: RevisaoDocumental[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as RevisaoDocumental);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar revisões documentais:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_REVISOES_DOCUMENTAIS : []);
    }
  );
}

export async function saveRevisaoDocumental(
  organizationId: string,
  revisao: RevisaoDocumental,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  const payload: RevisaoDocumental = {
    ...revisao,
    organizationId,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'document_revisions', revisao.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: revisao.id,
      action: 'CREATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Revisão ${revisao.numeroRevisao} registrada para o documento ${revisao.codigoDocumento} [Status: ${revisao.statusCicloVida}]`,
      details: JSON.stringify({
        documentoId: revisao.documentoId,
        numeroRevisao: revisao.numeroRevisao,
        statusCicloVida: revisao.statusCicloVida,
        dataEntradaVigor: revisao.dataEntradaVigor,
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'document_revisions');
    throw err;
  }
}

/**
 * APROVAÇÃO FORMAL DE NOVA REVISÃO COM ENTRADA EM VIGOR
 * Transforma a revisão anterior em 'SUBSTITUIDO' e a nova em 'VIGENTE' de forma atômica.
 */
export async function aprovarRevisaoDocumental(
  organizationId: string,
  novaRevisao: RevisaoDocumental,
  revisaoAnterior?: RevisaoDocumental,
  justificativa?: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Eng. Paulo Okubo',
    email: auth.currentUser?.email || 'qualidade@impacto.aero',
    uid: auth.currentUser?.uid || 'usr-okubo',
    role: 'ADMIN',
  };

  const hoje = new Date().toISOString().split('T')[0];

  try {
    const batch = writeBatch(db);

    // 1. Atualizar revisão anterior (se houver) para SUBSTITUIDO
    if (revisaoAnterior) {
      const prevRef = doc(db, 'organizations', organizationId, 'document_revisions', revisaoAnterior.id);
      const prevPayload: Partial<RevisaoDocumental> = {
        statusCicloVida: 'SUBSTITUIDO',
        dataSubstituicao: novaRevisao.dataEntradaVigor || hoje,
        substituidaPorRevisaoId: novaRevisao.id,
        substituidaPorRevisaoNumero: novaRevisao.numeroRevisao,
        updatedAt: new Date().toISOString(),
      };
      batch.update(prevRef, sanitizeForFirestore(prevPayload));
    }

    // 2. Atualizar nova revisão para VIGENTE / APROVADO
    const newRef = doc(db, 'organizations', organizationId, 'document_revisions', novaRevisao.id);
    const newPayload: RevisaoDocumental = {
      ...novaRevisao,
      statusCicloVida: 'VIGENTE',
      aprovadoPorNome: user.displayName || user.email,
      aprovadoPorUid: user.uid,
      dataAprovacao: hoje,
      justificativaAprovacao: justificativa || 'Aprovação técnica formal no QualiGest SGQ.',
      ehImutavel: true,
      updatedAt: new Date().toISOString(),
    };
    batch.set(newRef, sanitizeForFirestore(newPayload), { merge: true });

    // 3. Atualizar o ponteiro de revisão vigente no DocumentoControlado
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', novaRevisao.documentoId);
    batch.update(
      docRef,
      sanitizeForFirestore({
        revisaoVigenteId: novaRevisao.id,
        revisaoVigenteNumero: novaRevisao.numeroRevisao,
        updatedAt: new Date().toISOString(),
      })
    );

    await batch.commit();

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: novaRevisao.id,
      action: 'UPDATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `HOMOLOGAÇÃO: Revisão ${novaRevisao.numeroRevisao} do documento ${novaRevisao.codigoDocumento} aprovada e declarada VIGENTE.`,
      details: JSON.stringify({
        revisaoId: novaRevisao.id,
        numeroRevisao: novaRevisao.numeroRevisao,
        substituiuRevisao: revisaoAnterior?.numeroRevisao,
        justificativa,
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'document_revisions');
    throw err;
  }
}

// ============================================================================
// 3. FONTES EXTERNAS CONTROLADAS
// ============================================================================

export function subscribeToFontesExternas(
  organizationId: string,
  callback: (fontes: FonteExternaControlada[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'external_document_sources');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_FONTES_EXTERNAS.forEach((fonte) => {
              const docRef = doc(db, 'organizations', organizationId, 'external_document_sources', fonte.id);
              batch.set(docRef, sanitizeForFirestore({ ...fonte, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_FONTES_EXTERNAS locais', e);
          }
          callback(INITIAL_FONTES_EXTERNAS);
        } else {
          callback([]);
        }
        return;
      }

      const list: FonteExternaControlada[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as FonteExternaControlada);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar fontes externas:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_FONTES_EXTERNAS : []);
    }
  );
}

export async function saveFonteExterna(
  organizationId: string,
  fonte: FonteExternaControlada,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  const payload: FonteExternaControlada = {
    ...fonte,
    organizationId,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'external_document_sources', fonte.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: fonte.id,
      action: 'UPDATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Fonte externa de publicação cadastrada/atualizada: ${fonte.nome}`,
      details: JSON.stringify({ tipoFonte: fonte.tipoFonte, urlBase: fonte.urlBase }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'external_document_sources');
    throw err;
  }
}

// ============================================================================
// 4. SOLICITAÇÕES DE REVISÃO A CLIENTES
// ============================================================================

export function subscribeToSolicitacoesCliente(
  organizationId: string,
  callback: (solicitacoes: SolicitacaoRevisaoCliente[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'client_revision_requests');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_SOLICITACOES_CLIENTE.forEach((sol) => {
              const docRef = doc(db, 'organizations', organizationId, 'client_revision_requests', sol.id);
              batch.set(docRef, sanitizeForFirestore({ ...sol, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_SOLICITACOES_CLIENTE locais', e);
          }
          callback(INITIAL_SOLICITACOES_CLIENTE);
        } else {
          callback([]);
        }
        return;
      }

      const list: SolicitacaoRevisaoCliente[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as SolicitacaoRevisaoCliente);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar solicitações de clientes:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_SOLICITACOES_CLIENTE : []);
    }
  );
}

export async function saveSolicitacaoCliente(
  organizationId: string,
  solicitacao: SolicitacaoRevisaoCliente,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  const payload: SolicitacaoRevisaoCliente = {
    ...solicitacao,
    organizationId,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'client_revision_requests', solicitacao.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: solicitacao.id,
      action: 'CREATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Solicitação de revisão técnica gerada para o cliente ${solicitacao.clienteNome} [${solicitacao.documentoCodigo}]`,
      details: JSON.stringify({
        clienteNome: solicitacao.clienteNome,
        documentoCodigo: solicitacao.documentoCodigo,
        idioma: solicitacao.idioma,
        status: solicitacao.status,
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'client_revision_requests');
    throw err;
  }
}

export async function atualizarStatusSolicitacaoCliente(
  organizationId: string,
  solicitacao: SolicitacaoRevisaoCliente,
  novoStatus: StatusSolicitacaoCliente,
  observacao: string,
  novaRevisaoNumero?: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  const agora = new Date().toISOString();

  const novoHistorico = [
    ...(solicitacao.historicoStatus || []),
    {
      status: novoStatus,
      data: agora,
      usuario: user.displayName || user.email,
      observacao,
    },
  ];

  const payload: Partial<SolicitacaoRevisaoCliente> = {
    status: novoStatus,
    observacoes: observacao,
    historicoStatus: novoHistorico,
  };

  if (novoStatus === 'ENVIADA_PELO_USUARIO' && !solicitacao.enviadoPeloUsuarioEm) {
    payload.enviadoPeloUsuarioEm = agora;
  }
  if (novoStatus === 'RECEBIDA' && !solicitacao.respostaRecebidaEm) {
    payload.respostaRecebidaEm = agora;
  }
  if (novaRevisaoNumero) {
    payload.novaRevisaoRecebidaNumero = novaRevisaoNumero;
  }

  try {
    const docRef = doc(db, 'organizations', organizationId, 'client_revision_requests', solicitacao.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: solicitacao.id,
      action: 'STATUS_CHANGE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Status da solicitação de revisão alterado para "${novoStatus}" [Cliente: ${solicitacao.clienteNome}]`,
      details: JSON.stringify({ novoStatus, observacao, novaRevisaoNumero }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'client_revision_requests');
    throw err;
  }
}

// ============================================================================
// 5. LOGS DE VERIFICAÇÃO EM FONTES EXTERNAS
// ============================================================================

export function subscribeToLogsVerificacao(
  organizationId: string,
  callback: (logs: LogVerificacaoFonteExterna[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'external_verification_logs');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_LOGS_VERIFICACAO.forEach((log) => {
              const docRef = doc(db, 'organizations', organizationId, 'external_verification_logs', log.id);
              batch.set(docRef, sanitizeForFirestore({ ...log, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_LOGS_VERIFICACAO locais', e);
          }
          callback(INITIAL_LOGS_VERIFICACAO);
        } else {
          callback([]);
        }
        return;
      }

      const list: LogVerificacaoFonteExterna[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as LogVerificacaoFonteExterna);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar logs de verificação:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_LOGS_VERIFICACAO : []);
    }
  );
}

export async function saveLogVerificacao(
  organizationId: string,
  log: LogVerificacaoFonteExterna,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  const payload: LogVerificacaoFonteExterna = {
    ...log,
    organizationId,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'external_verification_logs', log.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: log.id,
      action: 'CREATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Verificação em fonte externa executada: ${log.fonteNome} — Doc ${log.codigoDocumento} [Resultado: ${log.statusVerificacao}]`,
      details: JSON.stringify({
        codigoDocumento: log.codigoDocumento,
        statusVerificacao: log.statusVerificacao,
        requerValidacaoHumana: log.requerValidacaoHumana,
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'external_verification_logs');
    throw err;
  }
}

// ============================================================================
// 6. EVIDÊNCIAS DE CONSULTA E LEITURA (SEÇÃO 21)
// ============================================================================

export function subscribeToEvidenciasConsulta(
  organizationId: string,
  callback: (evidencias: RegistroEvidenciaConsultaDocumento[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'document_consult_evidences');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_EVIDENCIAS_CONSULTA.forEach((ev) => {
              const docRef = doc(db, 'organizations', organizationId, 'document_consult_evidences', ev.id);
              batch.set(docRef, sanitizeForFirestore({ ...ev, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_EVIDENCIAS_CONSULTA locais', e);
          }
          callback(INITIAL_EVIDENCIAS_CONSULTA);
        } else {
          callback([]);
        }
        return;
      }

      const list: RegistroEvidenciaConsultaDocumento[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as RegistroEvidenciaConsultaDocumento);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar evidências de consulta:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_EVIDENCIAS_CONSULTA : []);
    }
  );
}

export async function registrarEvidenciaConsulta(
  organizationId: string,
  evidencia: RegistroEvidenciaConsultaDocumento,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || evidencia.usuarioNome,
    email: auth.currentUser?.email || 'operador@impacto.aero',
    uid: auth.currentUser?.uid || evidencia.usuarioUid,
    role: 'CONSULTA',
  };

  const payload: RegistroEvidenciaConsultaDocumento = {
    ...evidencia,
    organizationId,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'document_consult_evidences', evidencia.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: evidencia.id,
      action: 'CREATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `EVIDÊNCIA DE CONSULTA: ${evidencia.usuarioNome} consultou ${evidencia.codigoDocumento} (${evidencia.numeroRevisao}) — Finalidade: ${evidencia.finalidadeConsulta}`,
      details: JSON.stringify({
        codigoDocumento: evidencia.codigoDocumento,
        numeroRevisao: evidencia.numeroRevisao,
        referenciaOperacional: evidencia.referenciaOperacional,
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'document_consult_evidences');
    throw err;
  }
}

export const subscribeToLogsVerificacaoFontes = subscribeToLogsVerificacao;
