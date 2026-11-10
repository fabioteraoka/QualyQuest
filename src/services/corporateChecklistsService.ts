/**
 * Serviço Corporativo de Checklists de Auditoria e Execuções
 * IMPACTO Aviation MRO (QualyQuest SGQ)
 * 
 * Coleções Firestore:
 * - organizations/{orgId}/corporate_checklists
 * - organizations/{orgId}/corporate_checklist_items
 * - organizations/{orgId}/checklist_executions
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase/config';
import {
  ChecklistAuditoriaMestre,
  CriterioChecklistMestre,
  ExecucaoChecklistAuditoria,
  ItemAvaliadoExecucaoChecklist,
  UserProfile,
  NCRecord
} from '../types';
import {
  MASTER_CHECKLISTS,
  MASTER_CHECKLIST_ITEMS
} from '../data/corporateChecklistsData';
import {
  recordOrganizationAudit,
  sanitizeForFirestore,
  saveNonConformity
} from './firebase/firestore';

// ============================================================================
// SUBSCRIÇÕES EM TEMPO REAL
// ============================================================================

/**
 * Escuta os Checklists Mestres da organização
 */
export function subscribeToCorporateChecklists(
  organizationId: string,
  callback: (checklists: ChecklistAuditoriaMestre[]) => void
): () => void {
  if (!organizationId) {
    callback(MASTER_CHECKLISTS);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'corporate_checklists');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(MASTER_CHECKLISTS);
        return;
      }

      const list: ChecklistAuditoriaMestre[] = [];
      const seen = new Set<string>();
      snapshot.forEach((snap) => {
        const data = snap.data() as ChecklistAuditoriaMestre;
        const id = snap.id || data.id;
        if (!seen.has(id)) {
          seen.add(id);
          list.push({ ...data, id });
        }
      });

      // Ordenar por código
      list.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar corporate_checklists, utilizando base local:', err);
      callback(MASTER_CHECKLISTS);
    }
  );

  return unsubscribe;
}

/**
 * Escuta os Critérios de um Checklist específico ou de todos
 */
export function subscribeToCorporateChecklistItems(
  organizationId: string,
  checklistId: string | null | undefined,
  callback: (items: CriterioChecklistMestre[]) => void
): () => void {
  if (!organizationId) {
    if (checklistId && checklistId !== 'TODOS') {
      callback(MASTER_CHECKLIST_ITEMS.filter((i) => i.checklistId === checklistId));
    } else {
      callback(MASTER_CHECKLIST_ITEMS);
    }
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'corporate_checklist_items');
  const q = checklistId && checklistId !== 'TODOS'
    ? query(colRef, where('checklistId', '==', checklistId))
    : colRef;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (checklistId && checklistId !== 'TODOS') {
          callback(MASTER_CHECKLIST_ITEMS.filter((i) => i.checklistId === checklistId));
        } else {
          callback(MASTER_CHECKLIST_ITEMS);
        }
        return;
      }

      const list: CriterioChecklistMestre[] = [];
      const seen = new Set<string>();
      snapshot.forEach((snap) => {
        const data = snap.data() as CriterioChecklistMestre;
        const id = snap.id || data.id;
        if (!seen.has(id)) {
          seen.add(id);
          list.push({ ...data, id });
        }
      });

      list.sort((a, b) => a.ordem - b.ordem);
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar corporate_checklist_items, utilizando base local:', err);
      if (checklistId && checklistId !== 'TODOS') {
        callback(MASTER_CHECKLIST_ITEMS.filter((i) => i.checklistId === checklistId));
      } else {
        callback(MASTER_CHECKLIST_ITEMS);
      }
    }
  );

  return unsubscribe;
}

/**
 * Escuta as Execuções de Auditoria
 */
export function subscribeToChecklistExecutions(
  organizationId: string,
  callback: (executions: ExecucaoChecklistAuditoria[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'checklist_executions');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: ExecucaoChecklistAuditoria[] = [];
      const seen = new Set<string>();
      snapshot.forEach((snap) => {
        const data = snap.data() as ExecucaoChecklistAuditoria;
        const id = snap.id || data.id;
        if (!seen.has(id)) {
          seen.add(id);
          list.push({ ...data, id });
        }
      });

      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar checklist_executions:', err);
      callback([]);
    }
  );

  return unsubscribe;
}

// ============================================================================
// CARGA / SEEDING IDEMPOTENTE
// ============================================================================

/**
 * Persiste no Firestore todos os 11 checklists mestres e seus critérios caso ainda não existam
 */
export async function seedCorporateChecklistsIfEmpty(
  organizationId: string,
  currentUser?: UserProfile | null
): Promise<{ checklistsSeeded: number; itemsSeeded: number }> {
  if (!organizationId) return { checklistsSeeded: 0, itemsSeeded: 0 };

  const checkCol = collection(db, 'organizations', organizationId, 'corporate_checklists');
  const snap = await getDocs(checkCol);

  // Se já houver checklists salvos, verificar se os 22 itens do RBAC 145 estão presentes
  if (!snap.empty) {
    const itemCol = collection(db, 'organizations', organizationId, 'corporate_checklist_items');
    const qRbac145 = query(itemCol, where('checklistCodigo', '==', 'CHK-ANAC-RBAC145'));
    const rbacSnap = await getDocs(qRbac145);
    if (rbacSnap.size >= 22) {
      return { checklistsSeeded: 0, itemsSeeded: 0 };
    }
  }

  const userUid = currentUser?.uid || auth.currentUser?.uid || 'system_seed';
  const userName = currentUser?.displayName || currentUser?.email || 'Sistema SGQ';
  const now = new Date().toISOString();

  // 1. Gravar Checklists Mestres
  const batch1 = writeBatch(db);
  MASTER_CHECKLISTS.forEach((chk) => {
    const docRef = doc(db, 'organizations', organizationId, 'corporate_checklists', chk.id);
    batch1.set(docRef, sanitizeForFirestore({
      ...chk,
      organizationId,
      createdAt: chk.createdAt || now,
      updatedAt: now
    }), { merge: true });
  });
  await batch1.commit();

  // 2. Gravar Critérios em lotes de até 400
  const chunkSize = 350;
  for (let i = 0; i < MASTER_CHECKLIST_ITEMS.length; i += chunkSize) {
    const chunk = MASTER_CHECKLIST_ITEMS.slice(i, i + chunkSize);
    const itemBatch = writeBatch(db);
    chunk.forEach((item) => {
      const docRef = doc(db, 'organizations', organizationId, 'corporate_checklist_items', item.id);
      itemBatch.set(docRef, sanitizeForFirestore({
        ...item,
        checklistId: item.checklistId,
        checklistCodigo: item.checklistCodigo
      }), { merge: true });
    });
    await itemBatch.commit();
  }

  await recordOrganizationAudit(organizationId, {
    entity: 'SYSTEM',
    entityId: 'corporate_checklists_seed',
    action: 'CREATE',
    summary: `Seeding de ${MASTER_CHECKLISTS.length} Checklists Corporativos e ${MASTER_CHECKLIST_ITEMS.length} Critérios por ${userName}`,
    changedByUid: userUid,
    changedByEmail: currentUser?.email || 'admin@qualigest.aero',
    details: JSON.stringify({
      checklistsCount: MASTER_CHECKLISTS.length,
      itemsCount: MASTER_CHECKLIST_ITEMS.length,
      rbac145CriteriaCount: 22
    })
  });

  return {
    checklistsSeeded: MASTER_CHECKLISTS.length,
    itemsSeeded: MASTER_CHECKLIST_ITEMS.length
  };
}

// ============================================================================
// GESTÃO DE EXECUÇÃO DE AUDITORIAS
// ============================================================================

/**
 * Cria ou inicializa uma nova Execução de Auditoria baseada em um Checklist Mestre
 */
export function inicializarExecucaoChecklist(
  checklist: ChecklistAuditoriaMestre,
  criterios: CriterioChecklistMestre[],
  params: {
    numeroAuditoria: string;
    auditorLider: string;
    baseOperacional: string;
    escopoAuditado: string;
    dataAuditoria?: string;
  }
): ExecucaoChecklistAuditoria {
  const itensAvaliados: Record<string, ItemAvaliadoExecucaoChecklist> = {};

  criterios.forEach((crit) => {
    itensAvaliados[crit.id] = {
      criterioId: crit.id,
      numeroItem: crit.numeroItem,
      moduloOuSecao: crit.moduloOuSecao,
      referenciaNormativa: crit.referenciaNormativa,
      perguntaOuCriterio: crit.perguntaOuCriterio,
      status: 'PENDENTE',
      evidenciasVinculadasIds: [],
      observacoesAuditor: '',
      responsavelCorrecao: '',
      prazoCorrecao: ''
    };
  });

  const now = new Date().toISOString();

  return {
    id: `EXEC-${Date.now()}-${checklist.codigo.replace(/[^a-zA-Z0-9]/g, '')}`,
    organizationId: checklist.organizationId,
    checklistId: checklist.id,
    checklistCodigo: checklist.codigo,
    checklistNome: checklist.nome,
    numeroAuditoria: params.numeroAuditoria,
    dataAuditoria: params.dataAuditoria || now.split('T')[0],
    auditorLider: params.auditorLider,
    auditoresAcompanhantes: [],
    baseOperacional: params.baseOperacional,
    escopoAuditado: params.escopoAuditado,
    statusExecucao: 'EM_ANDAMENTO',
    itensAvaliados,
    totalItens: criterios.length,
    totalConforme: 0,
    totalNaoConforme: 0,
    totalNaoAplicavel: 0,
    totalPendente: criterios.length,
    taxaConformidade: 0,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Salva ou atualiza a execução de uma auditoria no Firestore
 */
export async function saveChecklistExecution(
  organizationId: string,
  execution: ExecucaoChecklistAuditoria,
  currentUser?: UserProfile | null
): Promise<void> {
  if (!organizationId || !execution) return;

  // Recalcular métricas
  const itens = Object.values(execution.itensAvaliados || {});
  const totalConforme = itens.filter((i) => i.status === 'C').length;
  const totalNaoConforme = itens.filter((i) => i.status === 'NC').length;
  const totalNaoAplicavel = itens.filter((i) => i.status === 'NA').length;
  const totalPendente = itens.filter((i) => i.status === 'PENDENTE').length;
  const totalAvaliadosAplicaveis = totalConforme + totalNaoConforme;
  const taxaConformidade = totalAvaliadosAplicaveis > 0
    ? Math.round((totalConforme / totalAvaliadosAplicaveis) * 100)
    : 0;

  const now = new Date().toISOString();
  const updatedExecution: ExecucaoChecklistAuditoria = {
    ...execution,
    totalItens: itens.length,
    totalConforme,
    totalNaoConforme,
    totalNaoAplicavel,
    totalPendente,
    taxaConformidade,
    updatedAt: now
  };

  const docRef = doc(db, 'organizations', organizationId, 'checklist_executions', execution.id);
  await setDoc(docRef, sanitizeForFirestore(updatedExecution), { merge: true });

  const userUid = currentUser?.uid || auth.currentUser?.uid || 'anon';
  const userName = currentUser?.displayName || currentUser?.email || 'Auditor SGQ';

  await recordOrganizationAudit(organizationId, {
    entity: 'AUDIT',
    entityId: execution.id,
    action: 'UPDATE',
    summary: `Execução ${execution.numeroAuditoria} salva: ${totalConforme} C, ${totalNaoConforme} NC, ${totalNaoAplicavel} NA por ${userName}`,
    changedByUid: userUid,
    changedByEmail: currentUser?.email || 'auditor@qualigest.aero',
    details: JSON.stringify({
      executionId: execution.id,
      taxaConformidade,
      totalNaoConforme,
      statusExecucao: execution.statusExecucao
    })
  });
}

/**
 * Gera automaticamente uma RNC (Formulário F 001-29) a partir de um critério marcado como NC
 */
export async function gerarRNCFromCriterioNC(
  organizationId: string,
  execution: ExecucaoChecklistAuditoria,
  criterio: CriterioChecklistMestre,
  avaliacaoItem: ItemAvaliadoExecucaoChecklist,
  currentUser?: UserProfile | null
): Promise<{ rncId: string; numeroNC: string }> {
  const agora = new Date();
  const ano = agora.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const numeroNC = `RNC-${ano}-${timestamp}`;
  const rncId = `nc-${Date.now()}`;

  const novaRNC: NCRecord = {
    id: rncId,
    codigoFormulario: 'F 001-29',
    revisao: '00',
    dataEmissaoFormulario: agora.toISOString().split('T')[0],
    numeroNC,
    titulo: `Não Conformidade em Auditoria [${execution.checklistCodigo}]: Item ${criterio.numeroItem}`,
    tipoAcao: 'Corretiva',
    descricaoNC: `Durante auditoria ${execution.numeroAuditoria} (${execution.checklistNome}), constatou-se que o item ${criterio.numeroItem} não atende ao padrão regulatório:\n\n${criterio.perguntaOuCriterio}\n\nConstatação do Auditor:\n${avaliacaoItem.observacoesAuditor || 'Não conformidade identificada na verificação objetiva.'}`,
    normaReferencia: criterio.referenciaNormativa || 'RBAC 145',
    setor: 'Garantia da Qualidade / SGQ',
    categoria: 'Auditoria Externa',
    responsavel: avaliacaoItem.responsavelCorrecao || 'Engenharia da Qualidade',
    auditor: execution.auditorLider || currentUser?.displayName || 'Auditor Líder',
    dataIdentificacao: execution.dataAuditoria || agora.toISOString().split('T')[0],
    prazoResposta: avaliacaoItem.prazoCorrecao || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    statusGeral: 'Aberta',
    avaliacaoRiscoInicial: {
      severidade: criterio.criticidade === 'CRITICA' ? '3' : '2',
      probabilidade: 'C',
      codigo: criterio.criticidade === 'CRITICA' ? '3C' : '2C',
      nivel: criterio.criticidade === 'CRITICA' ? 'Alto' : 'Médio'
    },
    preAnaliseContencao: {
      descricao: 'Contenção imediata: Segregação física e notificação ao Responsável Técnico.',
      responsavel: avaliacaoItem.responsavelCorrecao || 'Supervisor de Área',
      dataLimite: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pendente'
    },
    analiseCausaRaiz: {
      metodologia: '5 Porquês',
      cincoPorques: ['', '', '', '', ''],
      ishikawa: {
        metodo: '',
        maquina: '',
        maoDeObra: '',
        material: '',
        medicao: '',
        meioAmbiente: ''
      },
      detalhes: 'Pendente de abertura e investigação pelo setor responsável.'
    },
    acaoCorretiva: {
      descricao: '',
      comoSeraFeito: '',
      responsavel: avaliacaoItem.responsavelCorrecao || 'Gestor da Qualidade',
      dataPrazo: avaliacaoItem.prazoCorrecao || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Não Iniciada'
    },
    verificacaoEficacia: {
      metodo: 'Reauditoria / Inspeção de Acompanhamento',
      encerrado: 'Pendente',
      dataPrevista: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      resultado: 'PENDENTE'
    },
    ciclosAcaoCorretiva: [],
    historicoPrazos: [],
    criadoEm: agora.toISOString(),
    atualizadoEm: agora.toISOString(),
    tags: [execution.checklistCodigo, 'Auditoria', 'QualyQuest', criterio.numeroItem]
  };

  // Salvar a RNC no Firestore
  await saveNonConformity(organizationId, novaRNC);

  // Atualizar o item da execução com o vínculo da RNC
  const itensAvaliadosAtualizados = {
    ...execution.itensAvaliados,
    [criterio.id]: {
      ...avaliacaoItem,
      rncId,
      rncNumero: numeroNC
    }
  };

  await saveChecklistExecution(
    organizationId,
    {
      ...execution,
      itensAvaliados: itensAvaliadosAtualizados
    },
    currentUser
  );

  return { rncId, numeroNC };
}
