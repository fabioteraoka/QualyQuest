import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  ClienteExterno,
  BaseEstacaoOperacao,
  ProgramaChecklistCliente,
  ControleCentralSGQ,
  RequisitoClienteItem,
  AvaliacaoRequisitoCliente,
  ClientesControlesDashboardMetrics,
  MatrizCoberturaItem,
  RequisitoSemControleLacuna,
  UserProfile,
} from '../../types';
import {
  DEFAULT_ORGANIZATION_ID,
  OperationType,
  handleFirestoreError,
  sanitizeForFirestore,
  recordOrganizationAudit,
} from './firestore';
import {
  INITIAL_CLIENTS,
  INITIAL_BASES,
  INITIAL_CLIENT_PROGRAMS,
  INITIAL_CENTRAL_CONTROLS,
  INITIAL_CLIENT_REQUIREMENTS,
  INITIAL_CLIENT_EVALUATIONS,
} from '../../data/initialClientRequirements';

// ============================================================================
// 1. BASES E ESTAÇÕES OPERACIONAIS
// ============================================================================

export function subscribeToBasesOperacionais(
  organizationId: string,
  callback: (bases: BaseEstacaoOperacao[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'operational_bases');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_BASES.forEach((item) => {
              const docRef = doc(db, 'organizations', organizationId, 'operational_bases', item.id);
              batch.set(docRef, sanitizeForFirestore({ ...item, organizationId }));
            });
            await batch.commit();
          } catch (seedError) {
            console.warn('[clientRequirements] Auto-seed bases fallback to memory:', seedError);
            callback(INITIAL_BASES);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: BaseEstacaoOperacao[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as BaseEstacaoOperacao);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organizationId}/operational_bases`);
      callback(INITIAL_BASES);
    }
  );
}

export async function saveBaseOperacional(
  organizationId: string,
  base: Partial<BaseEstacaoOperacao>,
  currentUser?: UserProfile | null
): Promise<string> {
  const baseId = base.id || `BASE-${base.codigo || Date.now()}`;
  const now = new Date().toISOString();

  const record: BaseEstacaoOperacao = {
    id: baseId,
    organizationId,
    codigo: base.codigo || 'BASE',
    nome: base.nome || 'Estação de Linha',
    tipo: base.tipo || 'ESTACAO_LINHA',
    cidade: base.cidade || 'São Paulo',
    estado: base.estado || 'SP',
    pais: base.pais || 'Brasil',
    clientesAtendidosIds: base.clientesAtendidosIds || [],
    ativo: base.ativo !== undefined ? base.ativo : true,
    createdAt: base.createdAt || now,
    updatedAt: now,
  };

  const docRef = doc(db, 'organizations', organizationId, 'operational_bases', baseId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'EXTERNAL_CLIENT',
    entityId: baseId,
    action: 'UPDATE',
    summary: `Base/Estação salva: ${record.codigo} - ${record.nome}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });

  return baseId;
}

// ============================================================================
// 2. CLIENTES EXTERNOS
// ============================================================================

export function subscribeToClientesExternos(
  organizationId: string,
  callback: (clientes: ClienteExterno[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'external_clients');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_CLIENTS.forEach((item) => {
              const docRef = doc(db, 'organizations', organizationId, 'external_clients', item.id);
              batch.set(docRef, sanitizeForFirestore({ ...item, organizationId }));
            });
            await batch.commit();
          } catch (seedError) {
            console.warn('[clientRequirements] Auto-seed clients fallback to memory:', seedError);
            callback(INITIAL_CLIENTS);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: ClienteExterno[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ClienteExterno);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organizationId}/external_clients`);
      callback(INITIAL_CLIENTS);
    }
  );
}

export async function saveClienteExterno(
  organizationId: string,
  cliente: Partial<ClienteExterno>,
  currentUser?: UserProfile | null
): Promise<string> {
  const clienteId = cliente.id || `CLI-${(cliente.codigo || Date.now().toString()).toUpperCase()}`;
  const now = new Date().toISOString();

  const record: ClienteExterno = {
    id: clienteId,
    organizationId,
    codigo: cliente.codigo || 'CLIENTE',
    nome: cliente.nome || 'Cliente Operador',
    sigla: cliente.sigla || cliente.codigo || '',
    status: cliente.status || 'ATIVO',
    contatoPrincipal: cliente.contatoPrincipal,
    idiomaPadrao: cliente.idiomaPadrao || 'EN',
    basesRelacionadasIds: cliente.basesRelacionadasIds || [],
    observacoes: cliente.observacoes || '',
    responsavelInterno: cliente.responsavelInterno || currentUser?.displayName || 'Garantia da Qualidade',
    programasAtivosCount: cliente.programasAtivosCount || 0,
    totalRequisitosCount: cliente.totalRequisitosCount || 0,
    taxaConformidade: cliente.taxaConformidade ?? 100,
    createdAt: cliente.createdAt || now,
    updatedAt: now,
  };

  const docRef = doc(db, 'organizations', organizationId, 'external_clients', clienteId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'EXTERNAL_CLIENT',
    entityId: clienteId,
    action: 'UPDATE',
    summary: `Cliente externo cadastrado/atualizado: ${record.codigo} - ${record.nome}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });

  return clienteId;
}

export async function deleteClienteExterno(
  organizationId: string,
  clienteId: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'external_clients', clienteId);
  await deleteDoc(docRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'EXTERNAL_CLIENT',
    entityId: clienteId,
    action: 'DELETE',
    summary: `Cliente externo excluído: ${clienteId}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });
}

// ============================================================================
// 3. PROGRAMAS E CHECKLISTS DE CLIENTES
// ============================================================================

export function subscribeToProgramasClientes(
  organizationId: string,
  callback: (programas: ProgramaChecklistCliente[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'client_programs');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_CLIENT_PROGRAMS.forEach((item) => {
              const docRef = doc(db, 'organizations', organizationId, 'client_programs', item.id);
              batch.set(docRef, sanitizeForFirestore({ ...item, organizationId }));
            });
            await batch.commit();
          } catch (seedError) {
            console.warn('[clientRequirements] Auto-seed programs fallback to memory:', seedError);
            callback(INITIAL_CLIENT_PROGRAMS);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: ProgramaChecklistCliente[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ProgramaChecklistCliente);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organizationId}/client_programs`);
      callback(INITIAL_CLIENT_PROGRAMS);
    }
  );
}

export async function saveProgramaCliente(
  organizationId: string,
  programa: Partial<ProgramaChecklistCliente>,
  currentUser?: UserProfile | null
): Promise<string> {
  const programaId = programa.id || `PROG-${Date.now()}`;
  const now = new Date().toISOString();

  const record: ProgramaChecklistCliente = {
    id: programaId,
    organizationId,
    clienteId: programa.clienteId || '',
    clienteNome: programa.clienteNome || '',
    codigo: programa.codigo || 'CHK-01',
    nome: programa.nome || 'Programa de Auditoria de Estação',
    revisao: programa.revisao || 'Vigente',
    dataEmissao: programa.dataEmissao,
    dataVigencia: programa.dataVigencia || now.split('T')[0],
    status: programa.status || 'VIGENTE',
    periodicidadePadrao: programa.periodicidadePadrao || 'SEMESTRAL',
    escopoAplicabilidade: programa.escopoAplicabilidade || '',
    documentoFonteNome: programa.documentoFonteNome,
    observacoes: programa.observacoes,
    totalItens: programa.totalItens || 0,
    createdAt: programa.createdAt || now,
    updatedAt: now,
  };

  const docRef = doc(db, 'organizations', organizationId, 'client_programs', programaId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_PROGRAM',
    entityId: programaId,
    action: 'UPDATE',
    summary: `Programa de auditoria salvo: ${record.codigo} - ${record.nome}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });

  return programaId;
}

export async function deleteProgramaCliente(
  organizationId: string,
  programaId: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'client_programs', programaId);
  await deleteDoc(docRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_PROGRAM',
    entityId: programaId,
    action: 'DELETE',
    summary: `Programa de auditoria excluído: ${programaId}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });
}

// ============================================================================
// 4. CONTROLES CENTRAIS SGQ ("Um Controle, Vários Requisitos")
// ============================================================================

export function subscribeToControlesCentrais(
  organizationId: string,
  callback: (controles: ControleCentralSGQ[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'central_controls');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_CENTRAL_CONTROLS.forEach((item) => {
              const docRef = doc(db, 'organizations', organizationId, 'central_controls', item.id);
              batch.set(docRef, sanitizeForFirestore({ ...item, organizationId }));
            });
            await batch.commit();
          } catch (seedError) {
            console.warn('[clientRequirements] Auto-seed central controls fallback to memory:', seedError);
            callback(INITIAL_CENTRAL_CONTROLS);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: ControleCentralSGQ[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ControleCentralSGQ);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organizationId}/central_controls`);
      callback(INITIAL_CENTRAL_CONTROLS);
    }
  );
}

export async function saveControleCentral(
  organizationId: string,
  controle: Partial<ControleCentralSGQ>,
  currentUser?: UserProfile | null
): Promise<string> {
  const controleId = controle.id || `CTRL-${Date.now()}`;
  const now = new Date().toISOString();

  const record: ControleCentralSGQ = {
    id: controleId,
    organizationId,
    codigo: controle.codigo || 'CTRL-NOVO',
    nome: controle.nome || 'Controle SGQ',
    moduloOrigem: controle.moduloOrigem || 'OperacionalSGQ',
    descricao: controle.descricao || '',
    responsavelPadrao: controle.responsavelPadrao || 'Garantia da Qualidade',
    evidenciasTipicas: controle.evidenciasTipicas || [],
    status: controle.status || 'ATIVO',
    requisitosVinculadosCount: controle.requisitosVinculadosCount || 0,
    createdAt: controle.createdAt || now,
    updatedAt: now,
  };

  const docRef = doc(db, 'organizations', organizationId, 'central_controls', controleId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'CENTRAL_CONTROL',
    entityId: controleId,
    action: 'UPDATE',
    summary: `Controle Central SGQ salvo: ${record.codigo} - ${record.nome}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });

  return controleId;
}

export async function deleteControleCentral(
  organizationId: string,
  controleId: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'central_controls', controleId);
  await deleteDoc(docRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'CENTRAL_CONTROL',
    entityId: controleId,
    action: 'DELETE',
    summary: `Controle Central SGQ excluído: ${controleId}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });
}

// ============================================================================
// 5. REQUISITOS DE CLIENTES
// ============================================================================

export function subscribeToRequisitosClientes(
  organizationId: string,
  callback: (requisitos: RequisitoClienteItem[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'client_requirements');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_CLIENT_REQUIREMENTS.forEach((item) => {
              const docRef = doc(db, 'organizations', organizationId, 'client_requirements', item.id);
              batch.set(docRef, sanitizeForFirestore({ ...item, organizationId }));
            });
            await batch.commit();
          } catch (seedError) {
            console.warn('[clientRequirements] Auto-seed requirements fallback to memory:', seedError);
            callback(INITIAL_CLIENT_REQUIREMENTS);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: RequisitoClienteItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RequisitoClienteItem);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organizationId}/client_requirements`);
      callback(INITIAL_CLIENT_REQUIREMENTS);
    }
  );
}

export async function saveRequisitoCliente(
  organizationId: string,
  requisito: Partial<RequisitoClienteItem>,
  currentUser?: UserProfile | null
): Promise<string> {
  const reqId = requisito.id || `REQ-${Date.now()}`;
  const now = new Date().toISOString();

  const record: RequisitoClienteItem = {
    id: reqId,
    organizationId,
    clienteId: requisito.clienteId || '',
    clienteNome: requisito.clienteNome || '',
    programaId: requisito.programaId || '',
    programaCodigo: requisito.programaCodigo || '',
    numeroItem: requisito.numeroItem || 'REQ-01',
    tituloCurto: requisito.tituloCurto || 'Item de Auditoria',
    textoOriginal: requisito.textoOriginal || '',
    categoria: requisito.categoria || 'Geral',
    aplicabilidadeRegras: requisito.aplicabilidadeRegras || {},
    periodicidade: requisito.periodicidade || 'MENSAL',
    metodoVerificacao: requisito.metodoVerificacao || 'DOCUMENTAL',
    evidenciaEsperada: requisito.evidenciaEsperada || '',
    controleCentralId: requisito.controleCentralId,
    controleCentralCodigo: requisito.controleCentralCodigo,
    controleCentralNome: requisito.controleCentralNome,
    moduloOrigemSugerido: requisito.moduloOrigemSugerido,
    criticidade: requisito.criticidade || 'MEDIO',
    status: requisito.status || 'ATIVO',
    observacoes: requisito.observacoes,
    createdAt: requisito.createdAt || now,
    updatedAt: now,
  };

  const docRef = doc(db, 'organizations', organizationId, 'client_requirements', reqId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_REQUIREMENT',
    entityId: reqId,
    action: 'UPDATE',
    summary: `Requisito de cliente salvo: ${record.numeroItem} - ${record.tituloCurto}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });

  return reqId;
}

export async function deleteRequisitoCliente(
  organizationId: string,
  requisitoId: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'client_requirements', requisitoId);
  await deleteDoc(docRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_REQUIREMENT',
    entityId: requisitoId,
    action: 'DELETE',
    summary: `Requisito de cliente excluído: ${requisitoId}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });
}

// ============================================================================
// 6. AVALIAÇÕES DE REQUISITOS (AUDITORIAS / HOMOLOGAÇÃO)
// ============================================================================

export function subscribeToAvaliacoesRequisitos(
  organizationId: string,
  callback: (avaliacoes: AvaliacaoRequisitoCliente[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'client_evaluations');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_CLIENT_EVALUATIONS.forEach((item) => {
              const docRef = doc(db, 'organizations', organizationId, 'client_evaluations', item.id);
              batch.set(docRef, sanitizeForFirestore({ ...item, organizationId }));
            });
            await batch.commit();
          } catch (seedError) {
            console.warn('[clientRequirements] Auto-seed evaluations fallback to memory:', seedError);
            callback(INITIAL_CLIENT_EVALUATIONS);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: AvaliacaoRequisitoCliente[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AvaliacaoRequisitoCliente);
      });
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organizationId}/client_evaluations`);
      callback(INITIAL_CLIENT_EVALUATIONS);
    }
  );
}

export async function saveAvaliacaoRequisito(
  organizationId: string,
  avaliacao: Partial<AvaliacaoRequisitoCliente>,
  currentUser?: UserProfile | null
): Promise<string> {
  const avaliacaoId = avaliacao.id || `AVAL-${Date.now()}`;
  const now = new Date().toISOString();

  const record: AvaliacaoRequisitoCliente = {
    id: avaliacaoId,
    organizationId,
    clienteId: avaliacao.clienteId || '',
    clienteNome: avaliacao.clienteNome || '',
    programaId: avaliacao.programaId || '',
    programaCodigo: avaliacao.programaCodigo || '',
    requisitoId: avaliacao.requisitoId || '',
    numeroItem: avaliacao.numeroItem || '',
    tituloRequisito: avaliacao.tituloRequisito || '',
    baseId: avaliacao.baseId || '',
    baseCodigo: avaliacao.baseCodigo || '',
    baseNome: avaliacao.baseNome || '',
    dataAvaliacao: avaliacao.dataAvaliacao || now.split('T')[0],
    dataValidade: avaliacao.dataValidade,
    proximaAvaliacao: avaliacao.proximaAvaliacao,
    resultado: avaliacao.resultado || 'PENDENTE',
    metodoVerificacao: avaliacao.metodoVerificacao || 'DOCUMENTAL',
    determinacaoAutomatica: avaliacao.determinacaoAutomatica,
    avaliadorUid: avaliacao.avaliadorUid || currentUser?.uid || 'user_sgq',
    avaliadorNome: avaliacao.avaliadorNome || currentUser?.displayName || 'Auditor SGQ',
    aprovadorUid: avaliacao.aprovadorUid,
    aprovadorNome: avaliacao.aprovadorNome,
    justificativa: avaliacao.justificativa,
    comentario: avaliacao.comentario,
    rncGeradaId: avaliacao.rncGeradaId,
    numeroRNCGerada: avaliacao.numeroRNCGerada,
    evidencias: avaliacao.evidencias || [],
    historicoAlteracoes: avaliacao.historicoAlteracoes || [],
    createdAt: avaliacao.createdAt || now,
    updatedAt: now,
  };

  const docRef = doc(db, 'organizations', organizationId, 'client_evaluations', avaliacaoId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_EVALUATION',
    entityId: avaliacaoId,
    action: 'UPDATE',
    summary: `Avaliação de requisito registrada: ${record.numeroItem} na base ${record.baseCodigo} - Resultado: ${record.resultado}`,
    changedByUid: currentUser?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: currentUser?.displayName || auth.currentUser?.email || 'SGQ Auditor',
  });

  return avaliacaoId;
}

// ============================================================================
// 7. CÁLCULO DE MÉTRICAS E MATRIZ DE COBERTURA
// ============================================================================

export function calcularMetricasDashboardClientes(
  clientes: ClienteExterno[],
  programas: ProgramaChecklistCliente[],
  requisitos: RequisitoClienteItem[],
  avaliacoes: AvaliacaoRequisitoCliente[],
  bases: BaseEstacaoOperacao[],
  controles: ControleCentralSGQ[]
): {
  metrics: ClientesControlesDashboardMetrics;
  matrizCobertura: MatrizCoberturaItem[];
  lacunas: RequisitoSemControleLacuna[];
} {
  const totalClientes = clientes.length;
  const totalProgramas = programas.length;
  const totalRequisitos = requisitos.length;
  const totalBases = bases.length;
  const totalAvaliacoesRealizadas = avaliacoes.length;

  let conformesCount = 0;
  let atencaoCount = 0;
  let naoConformesCount = 0;
  let pendentesCount = 0;
  let naCount = 0;
  let rncsVinculadasCount = 0;

  const distribuicaoPorCliente: Record<string, { total: number; conformes: number; naoConformes: number; pendentes: number; taxa: number }> = {};
  const distribuicaoPorBase: Record<string, { total: number; conformes: number; naoConformes: number; pendentes: number; taxa: number }> = {};

  clientes.forEach((c) => {
    distribuicaoPorCliente[c.codigo] = { total: 0, conformes: 0, naoConformes: 0, pendentes: 0, taxa: 100 };
  });

  bases.forEach((b) => {
    distribuicaoPorBase[b.codigo] = { total: 0, conformes: 0, naoConformes: 0, pendentes: 0, taxa: 100 };
  });

  avaliacoes.forEach((av) => {
    if (av.resultado === 'CONFORME') conformesCount++;
    else if (av.resultado === 'ATENCAO') atencaoCount++;
    else if (av.resultado === 'NAO_CONFORME') naoConformesCount++;
    else if (av.resultado === 'NA') naCount++;
    else pendentesCount++;

    if (av.rncGeradaId) {
      rncsVinculadasCount++;
    }

    // Por Cliente
    const clienteKey = clientes.find((c) => c.id === av.clienteId)?.codigo || av.clienteNome || 'OUTRO';
    if (!distribuicaoPorCliente[clienteKey]) {
      distribuicaoPorCliente[clienteKey] = { total: 0, conformes: 0, naoConformes: 0, pendentes: 0, taxa: 100 };
    }
    distribuicaoPorCliente[clienteKey].total++;
    if (av.resultado === 'CONFORME') distribuicaoPorCliente[clienteKey].conformes++;
    if (av.resultado === 'NAO_CONFORME') distribuicaoPorCliente[clienteKey].naoConformes++;
    if (av.resultado === 'PENDENTE') distribuicaoPorCliente[clienteKey].pendentes++;

    // Por Base
    const baseKey = av.baseCodigo || 'OUTRO';
    if (!distribuicaoPorBase[baseKey]) {
      distribuicaoPorBase[baseKey] = { total: 0, conformes: 0, naoConformes: 0, pendentes: 0, taxa: 100 };
    }
    distribuicaoPorBase[baseKey].total++;
    if (av.resultado === 'CONFORME') distribuicaoPorBase[baseKey].conformes++;
    if (av.resultado === 'NAO_CONFORME') distribuicaoPorBase[baseKey].naoConformes++;
    if (av.resultado === 'PENDENTE') distribuicaoPorBase[baseKey].pendentes++;
  });

  // Calcular taxas de conformidade por cliente
  Object.keys(distribuicaoPorCliente).forEach((k) => {
    const item = distribuicaoPorCliente[k];
    const avaliados = item.total - item.pendentes;
    item.taxa = avaliados > 0 ? Math.round((item.conformes / avaliados) * 1000) / 10 : 100;
  });

  // Calcular taxas de conformidade por base
  Object.keys(distribuicaoPorBase).forEach((k) => {
    const item = distribuicaoPorBase[k];
    const avaliados = item.total - item.pendentes;
    item.taxa = avaliados > 0 ? Math.round((item.conformes / avaliados) * 1000) / 10 : 100;
  });

  const avaliadosValidos = totalAvaliacoesRealizadas - pendentesCount - naCount;
  const taxaConformidadeGeral = avaliadosValidos > 0 ? Math.round((conformesCount / avaliadosValidos) * 1000) / 10 : 92.3;

  // Matriz de Cobertura ("Um Controle, Vários Requisitos")
  const matrizCobertura: MatrizCoberturaItem[] = controles.map((ctrl) => {
    const requisitosAtendidos = requisitos
      .filter((r) => r.controleCentralId === ctrl.id || r.controleCentralCodigo === ctrl.codigo)
      .map((r) => ({
        requisitoId: r.id,
        numeroItem: r.numeroItem,
        clienteId: r.clienteId,
        clienteNome: r.clienteNome,
        programaCodigo: r.programaCodigo,
        criticidade: r.criticidade,
      }));

    const clientesUnicos = new Set(requisitosAtendidos.map((ra) => ra.clienteId));

    return {
      controleCentralId: ctrl.id,
      controleCodigo: ctrl.codigo,
      controleNome: ctrl.nome,
      moduloOrigem: ctrl.moduloOrigem,
      requisitosAtendidos,
      totalClientesAtendidos: clientesUnicos.size,
    };
  });

  // Análise de Lacunas: Requisitos sem controle central
  const lacunas: RequisitoSemControleLacuna[] = requisitos
    .filter((r) => !r.controleCentralId && !r.controleCentralCodigo)
    .map((r) => ({
      requisitoId: r.id,
      clienteId: r.clienteId,
      clienteNome: r.clienteNome,
      programaCodigo: r.programaCodigo,
      numeroItem: r.numeroItem,
      titulo: r.tituloCurto,
      criticidade: r.criticidade,
      recomendacaoAcao: `Criar ou associar um controle central SGQ ao requisito ${r.numeroItem} para assegurar conformidade contínua.`,
    }));

  const requisitosComControleCount = requisitos.filter((r) => !!r.controleCentralId || !!r.controleCentralCodigo).length;
  const requisitosSemControleCount = lacunas.length;
  const taxaCoberturaControles = totalRequisitos > 0 ? Math.round((requisitosComControleCount / totalRequisitos) * 1000) / 10 : 100;

  const metrics: ClientesControlesDashboardMetrics = {
    totalClientes,
    totalProgramas,
    totalRequisitos,
    totalBases,
    totalAvaliacoesRealizadas,
    conformesCount,
    atencaoCount,
    naoConformesCount,
    pendentesCount,
    naCount,
    taxaConformidadeGeral,
    requisitosComControleCount,
    requisitosSemControleCount,
    taxaCoberturaControles,
    rncsVinculadasCount,
    distribuicaoPorCliente,
    distribuicaoPorBase,
    semDados: totalClientes === 0,
  };

  return { metrics, matrizCobertura, lacunas };
}
