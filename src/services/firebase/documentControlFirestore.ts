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

export async function saveDocumentoControlado(
  organizationId: string,
  documento: DocumentoControlado,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  const payload: DocumentoControlado = {
    ...documento,
    organizationId,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documento.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: documento.id,
      action: 'UPDATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Documento controlado salvo: ${documento.codigo} — ${documento.titulo}`,
      details: JSON.stringify({
        codigo: documento.codigo,
        categoria: documento.categoria,
        revisaoVigenteNumero: documento.revisaoVigenteNumero,
      }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'controlled_documents');
    throw err;
  }
}

export async function deleteDocumentoControlado(
  organizationId: string,
  documentoId: string,
  codigoDocumento: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const user = currentUser || {
    displayName: auth.currentUser?.displayName || 'Sistema SGQ',
    email: auth.currentUser?.email || 'sgq@impacto.aero',
    uid: auth.currentUser?.uid || 'system',
    role: 'ADMIN',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'controlled_documents', documentoId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: documentoId,
      action: 'DELETE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Exclusão controlada de documento: ${codigoDocumento}`,
      details: JSON.stringify({ documentoId, codigoDocumento }),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'controlled_documents');
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
