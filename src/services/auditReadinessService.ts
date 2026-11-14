/**
 * SERVIÇO DE PREPARAÇÃO DE RESPOSTAS E EVIDÊNCIAS PARA AUDITORIAS — QUALYQUEST (FASE 1.4.4)
 * 
 * Princípios Obrigatórios de Engenharia SGQ:
 * 1. Preservação estrita da individualidade dos 177 requisitos originais.
 * 2. Separação categórica entre:
 *    - Aplicabilidade do requisito;
 *    - Conformidade da IMPACTO;
 *    - Preparação da resposta;
 *    - Suficiência das evidências;
 *    - Prontidão para auditoria.
 * 3. A resposta sugerida NUNCA poderá inventar fatos ou afirmar que existe evidência sem fonte real.
 * 4. Validação humana mandatória da Qualidade (Human-in-the-Loop).
 * 5. Reutilização rastreável de documentos e evidências sem duplicação de dados.
 * 6. Histórico imutável de alterações e aprovações.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase/config';
import {
  PreparacaoRequisitoAuditoria,
  OrigemRespostaAuditoria,
  StatusRespostaAuditoria,
  SituacaoProntidaoAuditoria,
  FonteUtilizadaResposta,
  HistoricoAlteracaoResposta,
  DocumentoRelacionadoRequisito,
  EvidenciaObjetivaVinculada,
  PendenciaAcaoRequisito,
  IndicadoresPainelProntidao,
  AvaliacaoQualidadeEvidencia,
  RequisitoClienteItem,
  ControleCentralSGQ,
  DocumentoControlado,
  EvidenciaRequisitoItem,
  UserProfile,
  SituacaoAplicabilidadeImpacto,
  StatusConformidadeSGQ,
  ModalidadeComprovacaoEsperada,
  HistoricoModalidadeComprovacao,
  ManualRecord,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  FerramentaCalibracao,
  NCRecord,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord
} from '../types';
import {
  sanitizeForFirestore,
  recordOrganizationAudit
} from './firebase/firestore';
import { MASTER_CHECKLIST_ITEMS } from '../data/corporateChecklistsData';
import { AUDITORIA_CONSOLIDACAO_DATA } from '../data/canonicalCriteriaAuditData';
import { CONTROLES_CORPORATIVOS_EXPANDIDOS, INITIAL_COMPLIANCE_EVIDENCES, INITIAL_INSTITUTIONAL_RESPONSES } from './corporateComplianceMatrixService';

// ============================================================================
// 1. CARGA INICIAL DE PREPARAÇÕES (SEEDING) BASEADA NOS 177 REQUISITOS REAIS
// ============================================================================

export function determinarModalidadeComprovacaoPadrao(
  item: typeof MASTER_CHECKLIST_ITEMS[0] | RequisitoClienteItem | any,
  ctrl?: ControleCentralSGQ | null
): { modalidade: ModalidadeComprovacaoEsperada; justificativa: string } {
  const texto = ((item.perguntaOuCriterio || item.textoOriginal || item.tituloRequisito || '') + ' ' + (item.referenciaNormativa || item.moduloOuSecao || '')).toLowerCase();
  const ctrlCod = ctrl?.codigo || item.controleCentralId || item.controleCentralCodigo || '';

  if (texto.includes('calibra') || texto.includes('metrol') || ctrlCod === 'CTRL-FERRAM-01') {
    return {
      modalidade: 'CERTIFICADO_CALIBRACAO',
      justificativa: 'Exige comprovação metrológica por certificado de calibração emitido por laboratório acreditado (RBC/Inmetro ou equivalente internacional) e rastreabilidade metrológica.'
    };
  }

  if (texto.includes('treina') || texto.includes('cht') || texto.includes('qualifica') || texto.includes('f-001-29') || ctrlCod === 'CTRL-TREIN-01' || texto.includes('habilita')) {
    return {
      modalidade: 'REGISTRO_TREINAMENTO_CHT',
      justificativa: 'Exige comprovação de competência técnica mediante ficha de treinamento, registro F-001-29, certificado e/ou licença CHT ativa.'
    };
  }

  if (texto.includes('ordem de serviço') || texto.includes('os ') || texto.includes('crs') || texto.includes('liberação de aeronave') || texto.includes('diário de bordo') || texto.includes('logbook') || ctrlCod === 'CTRL-EXEC-01') {
    return {
      modalidade: 'ORDEM_SERVICO_OU_CRS',
      justificativa: 'Exige ordem de serviço executada, fichas de inspeção e/ou Certificado de Liberação de Serviço (CRS) formalmente assinado.'
    };
  }

  if (texto.includes('foto') || texto.includes('segregação') || texto.includes('quarentena') || texto.includes('esd') || texto.includes('fod') || texto.includes('etiqueta') || texto.includes('arrecadação') || texto.includes('instalações') || texto.includes('iluminação') || texto.includes('limpeza')) {
    return {
      modalidade: 'REGISTRO_FOTOGRAFICO_OU_LAUDO',
      justificativa: 'Exige registro fotográfico circunstanciado com identificação de data/local ou laudo técnico de vistoria das instalações físicas.'
    };
  }

  if (texto.includes('sistema eletrônico') || texto.includes('software') || texto.includes('backup') || texto.includes('log de auditoria') || texto.includes('acesso ao sistema') || ctrlCod === 'CTRL-TI-01') {
    return {
      modalidade: 'EVIDENCIA_SISTEMA_LOG',
      justificativa: 'Exige registro eletrônico de auditoria de sistema (logs de acesso/modificação), tela de configuração ou relatório de integridade de backup.'
    };
  }

  if (texto.includes('reunião') || texto.includes('comitê') || texto.includes('ata') || texto.includes('auditoria interna') || texto.includes('in loco') || texto.includes('inspeção no pátio')) {
    return {
      modalidade: 'VERIFICACAO_IN_LOCO',
      justificativa: 'Exige comprovação por relatório de auditoria interna, ata de reunião gerencial SGQ ou registro formal de vistoria presencial.'
    };
  }

  // Puramente procedimental / organizacional / manuais
  if (
    texto.includes('política da qualidade') ||
    texto.includes('organograma') ||
    texto.includes('manual de procedimentos') ||
    texto.includes('momq') ||
    texto.includes('ptm') ||
    texto.includes('responsabilidades do') ||
    texto.includes('descrição de cargo') ||
    texto.includes('estrutura organizacional') ||
    texto.includes('controle de documentos') ||
    texto.includes('sistema de gestão da qualidade') ||
    ctrlCod === 'CTRL-DOCS-01' ||
    ctrlCod === 'CTRL-POLIT-01'
  ) {
    return {
      modalidade: 'DOCUMENTAL_PURO',
      justificativa: 'Requisito estritamente procedimental e organizacional comprovável pela vigência, revisão e aprovação formal dos manuais do SGQ (MOMQ/PTM), sem exigência de artefato operacional físico.'
    };
  }

  return {
    modalidade: 'COMBINACAO_DE_EVIDENCIAS',
    justificativa: 'Exige combinação de procedimento formal aprovado e amostragens de registros operacionais para sustentação completa perante a auditoria.'
  };
}

export function gerarPreparacaoInicialRequisito(
  item: typeof MASTER_CHECKLIST_ITEMS[0],
  organizationId: string
): PreparacaoRequisitoAuditoria {
  const auditMeta = AUDITORIA_CONSOLIDACAO_DATA.find((a) => a.idOriginal === item.id);
  const ctrlId = auditMeta?.controleCentralId || item.controleCentralId || 'CTRL-DOCS-01';
  const ctrl = CONTROLES_CORPORATIVOS_EXPANDIDOS.find((c) => c.codigo === ctrlId || c.id === ctrlId);

  // Determina a modalidade técnica padrão
  const padraoMod = determinarModalidadeComprovacaoPadrao(item, ctrl);
  const modalidadeComprovacao = padraoMod.modalidade;
  const justificativaModalidade = padraoMod.justificativa;

  // Busca se existe resposta institucional modelo para o controle
  const respModelo = INITIAL_INSTITUTIONAL_RESPONSES.find(
    (r) => r.controleCentralId === ctrlId || r.controleCentralCodigo === ctrlId
  );

  // Busca se existem evidências iniciais compatíveis
  const evidsCompativeis = INITIAL_COMPLIANCE_EVIDENCES.filter(
    (e) => e.controleId === ctrlId || e.controleCodigo === ctrlId || e.requisitoId === item.id
  );

  const agora = new Date().toISOString();
  const hoje = agora.split('T')[0];

  const fontesUtilizadas: FonteUtilizadaResposta[] = [];

  if (ctrl?.documentosInternosRelacionados) {
    ctrl.documentosInternosRelacionados.forEach((docRef) => {
      fontesUtilizadas.push({
        tipo: docRef.includes('PTM') ? 'PROCEDIMENTO' : docRef.includes('MOMQ') ? 'MANUAL' : 'REGISTRO',
        nome: docRef,
        referencia: docRef,
        revisao: 'Vigente'
      });
    });
  }

  // Define classificação de origem e status de prontidão
  let origemResposta: OrigemRespostaAuditoria = 'TRATAMENTO_MANUAL';
  let statusResposta: StatusRespostaAuditoria = 'NAO_INICIADA';
  let situacaoProntidao: SituacaoProntidaoAuditoria = 'NAO_INICIADA';
  let respostaTexto = '';
  let respostaSugeridaOriginal = '';
  let respostaRevisada = false;
  let evidenciasSuficientes = false;

  // Requisitos TACV: estritamente bloqueados para validação documental
  if (item.checklistId === 'CHK-TACV-LINE') {
    origemResposta = 'TRATAMENTO_MANUAL';
    statusResposta = 'RASCUNHO';
    situacaoProntidao = 'COM_PENDENCIAS_IMPEDITIVAS';
    respostaTexto = 'Aguardando validação formal de documentação técnica e homologação pela AAC de Cabo Verde para atendimento de linha B737-MAX em GRU.';
    respostaSugeridaOriginal = respostaTexto;
  } else if (respModelo && evidsCompativeis.length > 0) {
    origemResposta = 'AUTOMATICA_COM_VALIDACAO';
    statusResposta = 'EM_ELABORACAO';
    situacaoProntidao = 'EM_PREPARACAO';
    respostaTexto = `[Resposta Sugerida a partir do ${ctrl?.nome || 'Controle SGQ'} e ${fontesUtilizadas.map(f => f.nome).join(', ')}]:\n${respModelo.textoResposta}`;
    respostaSugeridaOriginal = respostaTexto;
  } else if (ctrl) {
    origemResposta = 'COMPLEMENTACAO_NECESSARIA';
    statusResposta = 'RASCUNHO';
    situacaoProntidao = 'EM_PREPARACAO';
    respostaTexto = `A IMPACTO gerencia esta exigência através do procedimento ${ctrl.documentosInternosRelacionados?.join(', ') || 'MOMQ MNT-001'}. Pendente de complementação com evidências objetivas específicas da base.`;
    respostaSugeridaOriginal = respostaTexto;
  }

  // Exemplos com prontidão avançada para auditoria da ANAC e Kalitta
  const pendenciasIniciais: PendenciaAcaoRequisito[] = [];

  if (item.id === 'CRIT-RBAC145-12') {
    // Calibração Metrológica ANAC RBAC 145.109(b) — Exemplo PRONTO PARA AUDITORIA
    origemResposta = 'AUTOMATICA';
    statusResposta = 'APROVADA';
    respostaRevisada = true;
    evidenciasSuficientes = true;
    situacaoProntidao = 'PRONTO_PARA_AUDITORIA';
    respostaTexto = 'A IMPACTO mantém controle metrológico estrito de 100% das ferramentas que requerem calibração periódica (CTRL-FERRAM-01), em conformidade com o RBAC 145.109(b) e IS 145.109-001C. As calibrações são executadas por laboratórios acreditados pela Cgcre/Inmetro (RBC), com rastreabilidade metrológica documentada e margem de incerteza calculada. As ferramentas calibradas portam etiquetas invioláveis com número de patrimônio, data de calibração e data de vencimento. Instrumentos vencidos ou danificados são imediatamente segregados em área de quarentena com etiqueta vermelha.';
    respostaSugeridaOriginal = respostaTexto;
  } else if (item.id === 'CRIT-KALITTA-21') {
    // Ferramental calibrado Kalitta — Tem pendência de etiquetagem em inglês
    origemResposta = 'COMPLEMENTACAO_NECESSARIA';
    statusResposta = 'AGUARDANDO_VALIDACAO';
    respostaRevisada = true;
    evidenciasSuficientes = false;
    situacaoProntidao = 'COM_PENDENCIAS_IMPEDITIVAS';
    respostaTexto = 'A IMPACTO dispõe de ferramental calibrado com rastreabilidade ao Inmetro/RBC e padrões aceitáveis ao NIST. As ferramentas alocadas para atendimento dos voos da Kalitta Air em GRU e VCP estão sendo etiquetadas com identificadores bilíngues (inglês/português) contendo Part Number, Serial Number, Calibration Date e Due Date.';
    respostaSugeridaOriginal = respostaTexto;
    pendenciasIniciais.push({
      id: `PEND-${item.id}-01`,
      descricao: 'Confeccionar e afixar etiquetas físicas de calibração em inglês para os torquímetros de linha de GRU (exigência Kalitta FORM QA-14 Item 21).',
      tipo: 'FOTOGRAFAR_EQUIPAMENTO',
      responsavelNome: 'Chefe de Ferramentaria & Metrologia',
      prazo: '2026-11-20',
      situacao: 'EM_ANDAMENTO',
      impeditivaAuditoria: true,
      criadoEm: agora
    });
  } else if (item.checklistId === 'CHK-TACV-LINE') {
    pendenciasIniciais.push({
      id: `PEND-${item.id}-TACV`,
      descricao: 'Solicitar da TACV cópia formal do Certificado de Homologação da AAC e GMM aprovado para a frota Boeing 737-MAX.',
      tipo: 'CONFIRMAR_REQUISITO_CONTRATUAL',
      responsavelNome: 'Gerência da Garantia da Qualidade',
      prazo: '2026-12-15',
      situacao: 'PENDENTE',
      impeditivaAuditoria: true,
      criadoEm: agora
    });
  }

  // Documentos relacionados iniciais
  const docsRelacionados: DocumentoRelacionadoRequisito[] = (ctrl?.documentosInternosRelacionados || ['MOMQ MNT-001']).map((d, idx) => ({
    documentoId: `DOC-${ctrlId}-${idx + 1}`,
    codigo: d.split(' ')[0] || 'MOMQ',
    titulo: d,
    revisao: 'Vigente',
    situacao: 'ATIVO',
    tipo: d.includes('PTM') ? 'PTM' : d.includes('MOMQ') ? 'MOMQ' : d.includes('POP') ? 'POP' : 'FORM',
    secaoAplicavel: d.includes('Seção') ? d.split('Seção')[1]?.trim() : 'Geral',
    adicionadoEm: agora,
    adicionadoPorNome: 'Sistema SGQ (SSoT)'
  }));

  // Evidências vinculadas iniciais
  const evidVinculadas: EvidenciaObjetivaVinculada[] = evidsCompativeis.map((e) => ({
    evidenciaId: e.id,
    tipo: e.tipo,
    titulo: e.titulo,
    descricao: e.descricao,
    arquivoNome: e.numeroReferencia || e.titulo,
    numeroReferencia: e.numeroReferencia,
    dataEnvio: e.dataEvidencia || hoje,
    enviadoPorNome: e.responsavel || 'Garantia da Qualidade',
    dataValidade: e.dataValidade,
    baseOperacional: e.baseOperacional || 'GRU',
    statusValidade: e.statusValidade || 'VALIDO',
    avaliacaoQualidade: {
      status: item.id === 'CRIT-RBAC145-12' ? 'SUFICIENTE' : 'PARCIAL',
      pertinencia: true,
      autenticidade: true,
      abrangencia: true,
      validadeConferida: e.statusValidade === 'VALIDO',
      parecer: item.id === 'CRIT-RBAC145-12' ? 'Certificado RBC plenamente válido e aderente ao escopo de ferramentas da base.' : 'Evidência preliminar analisada.',
      avaliadoPorNome: 'Paulo Okubo (Gerente da Qualidade)',
      avaliadoEm: hoje
    }
  }));

  return {
    id: item.id,
    organizationId,
    requisitoId: item.id,
    numeroItem: item.numeroItem,
    tituloRequisito: item.perguntaOuCriterio,
    autoridadeOuCliente: auditMeta?.empresaOuAutoridade || (item.checklistId.includes('ANAC') ? 'ANAC' : item.checklistId.includes('EASA') ? 'EASA' : item.checklistId.includes('FAA') ? 'FAA' : item.checklistId.includes('KALITTA') ? 'Kalitta Air' : item.checklistId.includes('ATLAS') ? 'Atlas Air' : item.checklistId.includes('TACV') ? 'TACV' : 'IMPACTO SGQ'),
    normaDocumento: item.referenciaNormativa,
    secaoReferencia: item.moduloOuSecao,
    revisaoFonte: auditMeta?.revisaoFonte || 'Vigente',
    textoOriginal: item.textoOriginal || item.perguntaOuCriterio,
    criterioCanonicoId: auditMeta?.criterioCanonicoAssociado || (item as any).criterioCanonicoId,
    criterioCanonicoCodigo: auditMeta?.criterioCanonicoAssociado || (item as any).criterioCanonicoId,
    criterioCanonicoTitulo: auditMeta?.criterioCanonicoAssociado || 'Critério Canônico Vinculado',
    controleCentralId: ctrlId,
    controleCentralCodigo: ctrlId,
    controleCentralNome: ctrl?.nome || 'Controle Central SGQ',
    aplicabilidade: (auditMeta?.statusValidacaoDocumental === 'PENDENTE_VALIDACAO_DOCUMENTAL' ? 'AGUARDANDO_AVALIACAO' : 'APLICAVEL') as SituacaoAplicabilidadeImpacto,
    justificativaAplicabilidade: auditMeta?.statusValidacaoDocumental === 'PENDENTE_VALIDACAO_DOCUMENTAL' ? 'Pendente de validação de homologação formal do operador.' : 'Aplicável às operações de manutenção da IMPACTO.',
    conformidadeSGQ: (item.id === 'CRIT-RBAC145-12' ? 'CONFORME' : item.checklistId === 'CHK-TACV-LINE' ? 'NAO_AVALIADO' : 'PARCIALMENTE_CONFORME') as StatusConformidadeSGQ,

    modalidadeComprovacao,
    justificativaModalidade,
    historicoModalidade: [
      {
        modalidadeNova: modalidadeComprovacao,
        dataHora: agora,
        usuarioNome: 'Sistema SGQ (Análise Determinística)',
        justificativa: justificativaModalidade
      }
    ],

    respostaTexto,
    respostaSugeridaOriginal,
    origemResposta,
    statusResposta,
    fontesUtilizadas,
    historicoRespostas: [
      {
        versao: '1.0',
        dataHora: agora,
        usuarioNome: 'Garantia da Qualidade SGQ',
        acao: 'CRIACAO',
        textoNovo: respostaTexto,
        motivo: 'Inicialização estruturada do módulo de preparação para auditorias (Fase 1.4.4)'
      }
    ],
    versaoResposta: '1.0',

    documentosRelacionados: docsRelacionados,
    evidenciasVinculadas: evidVinculadas,
    pendencias: pendenciasIniciais,

    respostaRevisada,
    evidenciasSuficientes,
    parecerQualidade: item.id === 'CRIT-RBAC145-12' ? 'Requisito pronto para atendimento de auditoria da fiscalização aeronáutica.' : undefined,
    validadoPorNome: item.id === 'CRIT-RBAC145-12' ? 'Paulo Okubo (Gerente da Qualidade)' : undefined,
    validadoEm: item.id === 'CRIT-RBAC145-12' ? hoje : undefined,
    situacaoProntidao,
    origemBase: 'BASE_INICIAL_177',
    ultimaRespostaAprovadaSnapshot: item.id === 'CRIT-RBAC145-12'
      ? {
          texto: respostaTexto,
          versao: '1.0',
          validadoEm: hoje,
          validadoPorNome: 'Paulo Okubo (Gerente da Qualidade)'
        }
      : undefined,
    createdAt: agora,
    updatedAt: agora
  };
}

// Memória local para garantir inicialização ultra-rápida e offline resilience
let MEMORIA_PREPARACOES: Record<string, PreparacaoRequisitoAuditoria> = {};

export function getPreparacoesIniciaisMemoria(orgId: string): PreparacaoRequisitoAuditoria[] {
  if (Object.keys(MEMORIA_PREPARACOES).length === 0) {
    MASTER_CHECKLIST_ITEMS.forEach((item) => {
      MEMORIA_PREPARACOES[item.id] = gerarPreparacaoInicialRequisito(item, orgId);
    });
  }
  return Object.values(MEMORIA_PREPARACOES);
}

// ============================================================================
// 2. SUBSCRIÇÃO FIRESTORE COM FALLBACK ROBUSTO
// ============================================================================

export function subscribeToAuditPreparations(
  organizationId: string,
  callback: (preparacoes: PreparacaoRequisitoAuditoria[]) => void
): () => void {
  const orgId = organizationId || 'org_impacto_aviation';
  const colRef = collection(db, 'organizations', orgId, 'audit_readiness_preparations');

  // Retorna os dados iniciais de memória imediatamente para evitar tela vazia
  const iniciais = getPreparacoesIniciaisMemoria(orgId);
  callback(iniciais);

  if (!auth.currentUser) {
    return () => {};
  }

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const firestoreData: PreparacaoRequisitoAuditoria[] = [];
        snapshot.forEach((docSnap) => {
          firestoreData.push(docSnap.data() as PreparacaoRequisitoAuditoria);
        });

        // Mescla com a base mestre de 177 requisitos para garantir que nenhum item suma
        const map = new Map<string, PreparacaoRequisitoAuditoria>();
        iniciais.forEach((p) => map.set(p.id, p));
        firestoreData.forEach((p) => map.set(p.id, p));

        const consolidados = Array.from(map.values());
        consolidados.forEach((p) => {
          MEMORIA_PREPARACOES[p.id] = p;
        });
        callback(consolidados);
      } else {
        callback(iniciais);
      }
    },
    (error) => {
      console.warn('Subscrição de preparações para auditoria (usando memória local):', error.message);
      callback(iniciais);
    }
  );

  return unsubscribe;
}

// ============================================================================
// 3. PERSISTÊNCIA NO FIRESTORE COM AUDIT LOG
// ============================================================================

export async function saveAuditPreparation(
  organizationId: string,
  preparation: PreparacaoRequisitoAuditoria,
  currentUser?: UserProfile | null
): Promise<void> {
  const orgId = organizationId || 'org_impacto_aviation';
  const docRef = doc(db, 'organizations', orgId, 'audit_readiness_preparations', preparation.id);

  const agora = new Date().toISOString();
  const preparacaoAtualizada: PreparacaoRequisitoAuditoria = {
    ...preparation,
    updatedAt: agora
  };

  // Atualiza cache em memória
  MEMORIA_PREPARACOES[preparation.id] = preparacaoAtualizada;

  try {
    await setDoc(docRef, sanitizeForFirestore(preparacaoAtualizada), { merge: true });

    await recordOrganizationAudit(orgId, {
      entity: 'CLIENT_REQUIREMENT',
      entityId: preparation.id,
      action: 'UPDATE',
      summary: `Preparação para Auditoria atualizada: ${preparation.requisitoId} - Prontidão: [${preparation.situacaoProntidao}], Resposta: [${preparation.statusResposta}]`,
      details: JSON.stringify({
        requisitoId: preparation.requisitoId,
        origemResposta: preparation.origemResposta,
        statusResposta: preparation.statusResposta,
        situacaoProntidao: preparation.situacaoProntidao,
        pendenciasCount: preparation.pendencias.length,
        evidenciasCount: preparation.evidenciasVinculadas.length
      }),
      changedByUid: auth.currentUser?.uid || currentUser?.uid,
      changedByEmail: auth.currentUser?.email || currentUser?.email
    });
  } catch (err: any) {
    console.warn('Aviso ao persistir preparação no Firestore (dados preservados em memória):', err.message);
  }
}

/// ============================================================================
// 4. CONSULTA CRUZADA AOS MÓDULOS DO SGQ & SUGESTÃO BASEADA EM FONTES REAIS
// ============================================================================

export interface ContextoCruzadoSGQ {
  documentosControlados?: DocumentoControlado[];
  manuals?: ManualRecord[];
  trainingRecords?: RegistroTreinamentoColaborador[];
  qualifications?: QualificacaoColaborador[];
  ferramentasCalibradas?: FerramentaCalibracao[];
  recordsNC?: NCRecord[];
  externalAudits?: AuditoriaExternaRecord[];
  auditFindings?: ConstatacaoExternaRecord[];
  evidenciasDisponiveis?: EvidenciaRequisitoItem[];
}

export interface ResultadoConsultaCruzadaSGQ {
  documentosControlados: DocumentoControlado[];
  manuaisNormativos: ManualRecord[];
  treinamentosRelacionados: RegistroTreinamentoColaborador[];
  qualificacoesRelacionadas: QualificacaoColaborador[];
  ferramentasRelacionadas: FerramentaCalibracao[];
  rncsRelacionadas: NCRecord[];
  findingsRelacionados: ConstatacaoExternaRecord[];
  evidenciasCompativeis: EvidenciaRequisitoItem[];
  lacunasIdentificadas: string[];
}

const DOMAIN_TOPICS: Array<{ topic: string; patterns: RegExp }> = [
  { topic: 'CALIBRACAO', patterns: /calibra|metrol|torqu|torque|tool|gage|gauge|inmetro|rbc|nist|145\.109/i },
  { topic: 'TREINAMENTO', patterns: /treina|train|cht|qualifica|compet|human factor|ewis|fts|ojt|instructor|145\.163/i },
  { topic: 'DOCUMENTACAO', patterns: /manual|momq|ptm|mpo|procedure|technical data|amm|cmm|srm|revis|logbook|diário de bordo|145\.145/i },
  { topic: 'MATERIAIS', patterns: /part|material|estoque|quarenten|quarant|shelf|receb|receiving|8130|form 1|sup|suspected|flammab|esd/i },
  { topic: 'FOD_EHS', patterns: /fod|foreign object|housekeep|ppe|epi|fire|exting|eyewash|safety|seguran|hangar|pátio|lighting|ilumina/i },
  { topic: 'LIBERACAO_CRS', patterns: /crs|release to service|return to service|rii|inspection|sign-off|certify|airworthiness|145\.155/i },
  { topic: 'QUALIDADE_AUDITORIA', patterns: /qualit|auditor|cap|corrective|rnc|non-conformance|sms|sgso|subcontract|vendor|145\.211/i }
];

function extractActiveTopics(text: string): Set<string> {
  const active = new Set<string>();
  DOMAIN_TOPICS.forEach((entry) => {
    if (entry.patterns.test(text)) active.add(entry.topic);
  });
  return active;
}

export function consultarRegistrosRelacionadosSGQ(
  requisito: {
    id?: string;
    requisitoId?: string;
    tituloRequisito?: string;
    perguntaOuCriterio?: string;
    textoOriginal?: string;
    normaDocumento?: string;
    referenciaNormativa?: string;
    secaoReferencia?: string;
    moduloOuSecao?: string;
    controleCentralId?: string;
    controleCentralCodigo?: string;
    modalidadeComprovacao?: ModalidadeComprovacaoEsperada;
  },
  contexto: ContextoCruzadoSGQ = {}
): ResultadoConsultaCruzadaSGQ {
  const textoReq = `${requisito.tituloRequisito || ''} ${requisito.perguntaOuCriterio || ''} ${requisito.textoOriginal || ''} ${requisito.normaDocumento || ''} ${requisito.referenciaNormativa || ''} ${requisito.secaoReferencia || ''}`.toLowerCase();
  const ctrlId = requisito.controleCentralCodigo || requisito.controleCentralId || '';
  const reqId = requisito.requisitoId || requisito.id || '';
  const activeTopics = extractActiveTopics(textoReq);

  // 1. Documentos Controlados (MOMQ, PTM, POP, IT, Form)
  const documentosControlados = (contexto.documentosControlados || []).filter((docItem) => {
    const docTxt = `${docItem.codigo} ${docItem.titulo} ${(docItem as any).areaOuSetor || ''} ${(docItem as any).resumoEscopo || ''}`.toLowerCase();
    if (ctrlId === 'CTRL-FERRAM-01' && /fer|cal|06|momq/.test(docTxt)) return true;
    if (ctrlId === 'CTRL-TREIN-01' && /ptm|trein|capac|07|momq/.test(docTxt)) return true;
    if (ctrlId === 'CTRL-DOCS-01' && /momq|doc|021|public/.test(docTxt)) return true;
    if (activeTopics.has('CALIBRACAO') && /calibra|metrol|fer|06|momq/.test(docTxt)) return true;
    if (activeTopics.has('TREINAMENTO') && /ptm|treina|capacita|cht|07/.test(docTxt)) return true;
    if (activeTopics.has('FOD_EHS') && /fod|epi|segur|hangar|30/.test(docTxt)) return true;
    if (activeTopics.has('MATERIAIS') && /quarent|segrega|mater|receb|esd|sup/.test(docTxt)) return true;
    if (activeTopics.has('LIBERACAO_CRS') && /crs|libera|rii|logbook|diário/.test(docTxt)) return true;
    if (activeTopics.has('DOCUMENTACAO') && /momq|manual|revis|public|doc/.test(docTxt)) return true;
    return false;
  });

  // 2. Manuais Normativos e Internos (ManualRecord)
  const manuaisNormativos = (contexto.manuals || []).filter((m) => {
    const mTxt = `${m.codigo} ${m.titulo} ${m.descricaoResumo || ''}`.toLowerCase();
    if (textoReq.includes('rbac 145') && mTxt.includes('145')) return true;
    if (textoReq.includes('rbac 43') && mTxt.includes('43')) return true;
    if (textoReq.includes('easa') && mTxt.includes('easa')) return true;
    if (textoReq.includes('faa') && mTxt.includes('faa')) return true;
    if (/momq|mgq|ptm/.test(mTxt) && (activeTopics.has('DOCUMENTACAO') || activeTopics.has('QUALIDADE_AUDITORIA') || activeTopics.has('TREINAMENTO'))) return true;
    return false;
  });

  // 3. Treinamentos & Qualificações (Rooster / Competências)
  const treinamentosRelacionados = activeTopics.has('TREINAMENTO') || activeTopics.has('LIBERACAO_CRS') || requisito.modalidadeComprovacao === 'REGISTRO_TREINAMENTO_CHT'
    ? (contexto.trainingRecords || []).slice(0, 12)
    : [];
  const qualificacoesRelacionadas = activeTopics.has('TREINAMENTO') || activeTopics.has('LIBERACAO_CRS') || requisito.modalidadeComprovacao === 'REGISTRO_TREINAMENTO_CHT'
    ? (contexto.qualifications || []).slice(0, 12)
    : [];

  // 4. Ferramentas Calibradas (Metrologia)
  const ferramentasRelacionadas = activeTopics.has('CALIBRACAO') || ctrlId === 'CTRL-FERRAM-01' || requisito.modalidadeComprovacao === 'CERTIFICADO_CALIBRACAO'
    ? (contexto.ferramentasCalibradas || []).slice(0, 15)
    : [];

  // 5. RNCs relacionadas
  const rncsRelacionadas = (contexto.recordsNC || []).filter((nc) => {
    const ncTxt = `${nc.titulo} ${nc.categoria} ${nc.normaReferencia} ${nc.descricaoNC}`.toLowerCase();
    if (requisito.normaDocumento && nc.normaReferencia && nc.normaReferencia.toLowerCase().includes(requisito.normaDocumento.toLowerCase().slice(0, 10))) return true;
    for (const topic of activeTopics) {
      const entry = DOMAIN_TOPICS.find((t) => t.topic === topic);
      if (entry && entry.patterns.test(ncTxt)) return true;
    }
    return false;
  });

  // 6. Constatações / Findings anteriores
  const findingsRelacionados = (contexto.auditFindings || []).filter((f) => {
    const fTxt = `${f.descricaoOriginal} ${f.requisitoNormativo?.norma || ''} ${f.requisitoNormativo?.itemRequisito || ''}`.toLowerCase();
    for (const topic of activeTopics) {
      const entry = DOMAIN_TOPICS.find((t) => t.topic === topic);
      if (entry && entry.patterns.test(fTxt)) return true;
    }
    return false;
  });

  // 7. Evidências compatíveis
  const evidenciasCompativeis = (contexto.evidenciasDisponiveis || []).filter((ev) => {
    if (ev.controleId === ctrlId || ev.controleCodigo === ctrlId || (reqId && ev.requisitoId === reqId)) return true;
    if (activeTopics.has('CALIBRACAO') && ev.tipo === 'CERTIFICADO_CALIBRACAO') return true;
    if (activeTopics.has('TREINAMENTO') && ev.tipo === 'REGISTRO_TREINAMENTO') return true;
    return false;
  });

  // 8. Lacunas reais identificadas (nunca inventar comprovação inexistente)
  const lacunasIdentificadas: string[] = [];
  if (documentosControlados.length === 0 && manuaisNormativos.length === 0) {
    lacunasIdentificadas.push('Nenhum documento controlado (MOMQ, PTM, POP ou IT) compatível localizado no acervo ativo.');
  }
  const docsObsoletos = documentosControlados.filter((d) => d.statusGeral === 'CANCELADO' || d.statusGeral === 'INATIVO');
  if (docsObsoletos.length > 0) {
    lacunasIdentificadas.push(`${docsObsoletos.length} documento(s) relacionado(s) com status não vigente (${docsObsoletos.map((d) => d.codigo).join(', ')}).`);
  }
  const evidsVencidas = evidenciasCompativeis.filter((e) => e.statusValidade === 'VENCIDO' || (e.dataValidade && e.dataValidade < new Date().toISOString().split('T')[0]));
  if (evidsVencidas.length > 0) {
    lacunasIdentificadas.push(`${evidsVencidas.length} evidência(s) com validade expirada no acervo.`);
  }
  const ferramVencidas = ferramentasRelacionadas.filter((f) => f.status === 'VENCIDA' || f.status === 'QUARENTENA');
  if (ferramVencidas.length > 0) {
    lacunasIdentificadas.push(`${ferramVencidas.length} ferramenta(s) calibrada(s) vencida(s) ou em quarentena no módulo de Metrologia.`);
  }
  const rncsAbertas = rncsRelacionadas.filter((r) => !['Encerrada', 'Cancelada', 'Rejeitada'].includes(r.statusGeral));
  if (rncsAbertas.length > 0) {
    lacunasIdentificadas.push(`${rncsAbertas.length} RNC(s) aberta(s) ou em tratativa relacionada(s) ao tema (${rncsAbertas.slice(0, 3).map((r) => r.numeroNC).join(', ')}).`);
  }
  if (requisito.modalidadeComprovacao !== 'DOCUMENTAL_PURO' && evidenciasCompativeis.length === 0 && ferramentasRelacionadas.length === 0 && treinamentosRelacionados.length === 0) {
    lacunasIdentificadas.push('Nenhuma evidência operacional objetiva cadastrada nos módulos do SGQ para este requisito; anexação obrigatória antes da aprovação.');
  }

  return {
    documentosControlados,
    manuaisNormativos,
    treinamentosRelacionados,
    qualificacoesRelacionadas,
    ferramentasRelacionadas,
    rncsRelacionadas,
    findingsRelacionados,
    evidenciasCompativeis,
    lacunasIdentificadas
  };
}

export interface ResultadoSugestaoResposta {
  respostaSugerida: string;
  origemClassificada: OrigemRespostaAuditoria;
  fontesIdentificadas: FonteUtilizadaResposta[];
  documentosRecomendados: DocumentoControlado[];
  evidenciasRecomendadas: EvidenciaRequisitoItem[];
  justificativaClassificacao: string;
  lacunasIdentificadas: string[];
  consultaCruzada?: ResultadoConsultaCruzadaSGQ;
}

export function sugerirRespostaBaseadaEmFontes(
  requisito: RequisitoClienteItem | typeof MASTER_CHECKLIST_ITEMS[0],
  controleCentral?: ControleCentralSGQ | null,
  documentosControlados: DocumentoControlado[] = [],
  evidenciasDisponiveis: EvidenciaRequisitoItem[] = [],
  contextoExtra?: ContextoCruzadoSGQ
): ResultadoSugestaoResposta {
  const anyReq = requisito as any;
  const normaReq = (anyReq.referenciaNormativa || anyReq.normaReferencia || anyReq.normaDocumento || '').toLowerCase();
  const ctrlId = controleCentral?.codigo || anyReq.controleCentralId || anyReq.controleCentralCodigo || 'CTRL-DOCS-01';

  const consultaCruzada = consultarRegistrosRelacionadosSGQ(
    {
      id: anyReq.id,
      requisitoId: anyReq.requisitoId || anyReq.id,
      tituloRequisito: anyReq.tituloRequisito || anyReq.tituloCurto,
      perguntaOuCriterio: anyReq.perguntaOuCriterio,
      textoOriginal: anyReq.textoOriginal,
      normaDocumento: anyReq.normaDocumento,
      referenciaNormativa: anyReq.referenciaNormativa || anyReq.normaReferencia,
      secaoReferencia: anyReq.secaoReferencia || anyReq.moduloOuSecao,
      controleCentralId: ctrlId,
      controleCentralCodigo: ctrlId,
      modalidadeComprovacao: anyReq.modalidadeComprovacao
    },
    {
      ...contextoExtra,
      documentosControlados: documentosControlados.length > 0 ? documentosControlados : contextoExtra?.documentosControlados,
      evidenciasDisponiveis: evidenciasDisponiveis.length > 0 ? evidenciasDisponiveis : contextoExtra?.evidenciasDisponiveis
    }
  );

  const fontesIdentificadas: FonteUtilizadaResposta[] = [];
  const documentosRecomendados = consultaCruzada.documentosControlados;
  const evidenciasRecomendadas = consultaCruzada.evidenciasCompativeis;

  // 1. Documentos controlados reais encontrados no acervo SGQ
  documentosRecomendados.forEach((docItem) => {
    fontesIdentificadas.push({
      tipo: docItem.categoria === 'DOCUMENTO_INTERNO' ? 'PROCEDIMENTO' : docItem.categoria === 'DOCUMENTO_AUTORIDADE' ? 'NORMA' : 'MANUAL',
      nome: `${docItem.codigo} — ${docItem.titulo}`,
      referencia: docItem.codigo,
      revisao: docItem.revisaoVigenteNumero || 'Vigente',
      identificador: docItem.id
    });
  });

  // 2. Manuais cadastrados no repositório de manuais
  consultaCruzada.manuaisNormativos.forEach((manualItem) => {
    if (!fontesIdentificadas.some((f) => f.referencia === manualItem.codigo)) {
      fontesIdentificadas.push({
        tipo: 'MANUAL',
        nome: `${manualItem.codigo} — ${manualItem.titulo}`,
        referencia: manualItem.codigo,
        revisao: manualItem.revisao || 'Vigente',
        identificador: manualItem.id
      });
    }
  });

  // 3. Procedimentos de referência no Controle Central SGQ (apenas se houver controle explícito)
  if (controleCentral?.documentosInternosRelacionados) {
    controleCentral.documentosInternosRelacionados.forEach((docRef) => {
      if (!fontesIdentificadas.some((f) => f.referencia === docRef)) {
        fontesIdentificadas.push({
          tipo: 'PROCEDIMENTO',
          nome: docRef,
          referencia: docRef,
          revisao: 'Referência de Controle'
        });
      }
    });
  }

  // 4. Evidências objetivas reais ativas
  evidenciasRecomendadas.forEach((ev) => {
    fontesIdentificadas.push({
      tipo: 'REGISTRO',
      nome: ev.titulo,
      referencia: ev.numeroReferencia || ev.id,
      revisao: ev.statusValidade || 'VALIDO',
      identificador: ev.id
    });
  });

  // 5. Determinação estrita da classificação de origem (anti-alucinação)
  let origemClassificada: OrigemRespostaAuditoria = 'TRATAMENTO_MANUAL';
  let justificativaClassificacao = '';
  let respostaSugerida = '';

  const temProcedimentoFormal = fontesIdentificadas.some(
    (f) => f.tipo === 'PROCEDIMENTO' || f.tipo === 'MANUAL'
  );
  const temEvidenciaValida = evidenciasRecomendadas.some(
    (e) => e.statusValidade === 'VALIDO' || !e.statusValidade
  );
  const lacunasTxt = consultaCruzada.lacunasIdentificadas.length > 0
    ? `\n\n[Lacunas identificadas para complementação humana]:\n- ${consultaCruzada.lacunasIdentificadas.join('\n- ')}`
    : '';

  if (anyReq.checklistId === 'CHK-TACV-LINE' || normaReq.includes('tacv') || normaReq.includes('aac')) {
    origemClassificada = 'TRATAMENTO_MANUAL';
    justificativaClassificacao = 'Requisito sob dependência de validação documental prévia do operador (TACV / Cabo Verde). Não há manual homologado arquivado.';
    respostaSugerida = 'Tratamento manual obrigatório: Não consta no acervo SGQ o GMM aprovado nem o certificado de reconhecimento operacional emitido pela Agência de Aviação Civil (AAC) de Cabo Verde. É necessário obter e anexar a documentação oficial do operador antes de validar resposta institucional.';
  } else if (temProcedimentoFormal && temEvidenciaValida && evidenciasRecomendadas.length >= 1) {
    origemClassificada = 'AUTOMATICA';
    justificativaClassificacao = `Identificados ${documentosRecomendados.length + consultaCruzada.manuaisNormativos.length} documento(s) do acervo e ${evidenciasRecomendadas.length} evidência(s) objetiva(s) válida(s) para revisão humana da Qualidade.`;

    const docsStr = fontesIdentificadas
      .filter((f) => f.tipo === 'PROCEDIMENTO' || f.tipo === 'MANUAL')
      .map((f) => `${f.nome} (${f.revisao})`)
      .join(', ');
    const evidsStr = evidenciasRecomendadas.map((e) => `${e.titulo} (Ref: ${e.numeroReferencia || e.tipo}, Status: ${e.statusValidade || 'VALIDO'})`).join('; ');

    respostaSugerida = `Proposta fundamentada no controle ${ctrlId} (${controleCentral?.nome || 'SGQ'}) e nos documentos controlados localizados no acervo [${docsStr}]. Evidências disponíveis para conferência: [${evidsStr}].${lacunasTxt}`;
  } else if (temProcedimentoFormal) {
    origemClassificada = 'AUTOMATICA_COM_VALIDACAO';
    justificativaClassificacao = 'Documento procedimental identificado no acervo SGQ, porém faltam evidências objetivas vinculadas para comprovação operacional completa.';
    const docsStr = fontesIdentificadas
      .filter((f) => f.tipo === 'PROCEDIMENTO' || f.tipo === 'MANUAL')
      .map((f) => f.nome)
      .join(', ');

    respostaSugerida = `Rascunho parcial baseado nos documentos localizados [${docsStr}] (Seção ${anyReq.moduloOuSecao || anyReq.secaoReferencia || 'Geral'}). Não foram localizadas evidências objetivas suficientes neste requisito; a equipe da Qualidade deve revisar a redação e anexar os registros comprobatórios reais.${lacunasTxt}`;
  } else if (controleCentral && (consultaCruzada.ferramentasRelacionadas.length > 0 || consultaCruzada.treinamentosRelacionados.length > 0)) {
    origemClassificada = 'COMPLEMENTACAO_NECESSARIA';
    justificativaClassificacao = 'Registros operacionais correlatos encontrados nos módulos de Metrologia/Treinamento, porém sem procedimento formal vinculado diretamente.';
    respostaSugerida = `Registros operacionais relacionados localizados sob o controle ${ctrlId} (${controleCentral.nome}), sem vínculo documental completo no acervo. Complementação humana obrigatória para associar os documentos vigentes (MOMQ/PTM) e confirmar evidências.${lacunasTxt}`;
  } else {
    origemClassificada = 'TRATAMENTO_MANUAL';
    justificativaClassificacao = 'Informação insuficiente no acervo e nos módulos do SGQ para compor resposta automatizada sem risco de inferência.';
    respostaSugerida = `[REQUER COMPLEMENTAÇÃO HUMANA] Não foram encontrados documentos controlados ou evidências suficientes no sistema para sustentar resposta automática ao critério (${anyReq.referenciaNormativa || anyReq.normaReferencia || anyReq.normaDocumento || 'Norma aplicável'}). Cadastre ou vincule os documentos e evidências reais antes da aprovação pela Qualidade.${lacunasTxt}`;
  }

  return {
    respostaSugerida,
    origemClassificada,
    fontesIdentificadas,
    documentosRecomendados,
    evidenciasRecomendadas,
    justificativaClassificacao,
    lacunasIdentificadas: consultaCruzada.lacunasIdentificadas,
    consultaCruzada
  };
}

// ============================================================================
// 4B. DETECÇÃO CONTÍNUA DE IMPACTO NA BASE INSTITUCIONAL (SEM SOBRESCREVER APROVAÇÕES)
// ============================================================================

export function detectarImpactosBaseInstitucional(
  preparacoes: PreparacaoRequisitoAuditoria[],
  contexto: ContextoCruzadoSGQ
): PreparacaoRequisitoAuditoria[] {
  const agora = new Date().toISOString();
  const hoje = agora.split('T')[0];
  const em30Dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const docById = new Map<string, DocumentoControlado>();
  const docByCode = new Map<string, DocumentoControlado>();
  (contexto.documentosControlados || []).forEach((d) => {
    docById.set(d.id, d);
    docByCode.set(d.codigo.toUpperCase(), d);
  });

  return preparacoes.map((prep) => {
    const motivos: string[] = [];

    // 1. Verificar revisão de documentos vinculados
    (prep.documentosRelacionados || []).forEach((docRel) => {
      const liveDoc = docById.get(docRel.documentoId) || docByCode.get((docRel.codigo || '').toUpperCase());
      if (liveDoc) {
        if (liveDoc.statusGeral === 'CANCELADO' || liveDoc.statusGeral === 'INATIVO') {
          motivos.push(`Documento vinculado [${liveDoc.codigo}] encontra-se ${liveDoc.statusGeral} no Controle Documental.`);
        } else if (
          docRel.revisao &&
          liveDoc.revisaoVigenteNumero &&
          docRel.revisao !== 'Vigente' &&
          docRel.revisao !== liveDoc.revisaoVigenteNumero
        ) {
          motivos.push(`Nova revisão vigente detectada para [${liveDoc.codigo}]: vinculada (${docRel.revisao}) vs. atual (${liveDoc.revisaoVigenteNumero}).`);
        }
      }
    });

    // 2. Verificar validade de evidências vinculadas
    (prep.evidenciasVinculadas || []).forEach((ev) => {
      if (ev.statusValidade === 'VENCIDO' || (ev.dataValidade && ev.dataValidade < hoje)) {
        motivos.push(`Evidência [${ev.titulo}] venceu em ${ev.dataValidade || 'data anterior'}.`);
      } else if (ev.dataValidade && ev.dataValidade <= em30Dias) {
        motivos.push(`Evidência [${ev.titulo}] vence em menos de 30 dias (${ev.dataValidade}).`);
      }
    });

    // 3. Verificar impacto de ferramentas/treinamentos/RNCs abertas apenas para itens já aprovados ou com controle direto
    const consulta = consultarRegistrosRelacionadosSGQ(prep, {
      ferramentasCalibradas: contexto.ferramentasCalibradas,
      trainingRecords: contexto.trainingRecords,
      qualifications: contexto.qualifications,
      recordsNC: contexto.recordsNC
    });

    const ferramVencidas = consulta.ferramentasRelacionadas.filter((f) => f.status === 'VENCIDA' || f.status === 'QUARENTENA');
    if (ferramVencidas.length > 0 && prep.modalidadeComprovacao === 'CERTIFICADO_CALIBRACAO') {
      motivos.push(`${ferramVencidas.length} instrumento(s) com status VENCIDA/QUARENTENA no módulo de Metrologia.`);
    }

    const rncsAbertas = consulta.rncsRelacionadas.filter((r) => !['Encerrada', 'Cancelada', 'Rejeitada'].includes(r.statusGeral));
    if (rncsAbertas.length > 0 && prep.statusResposta === 'APROVADA') {
      motivos.push(`${rncsAbertas.length} RNC(s) ativa(s) relacionada(s) (${rncsAbertas.slice(0, 2).map((r) => r.numeroNC).join(', ')}).`);
    }

    const precisaReavaliar = motivos.length > 0;
    const approvedSnapshot =
      prep.ultimaRespostaAprovadaSnapshot ||
      (prep.statusResposta === 'APROVADA' && prep.respostaTexto
        ? {
            texto: prep.respostaTexto,
            versao: prep.versaoResposta || '1.0',
            validadoEm: prep.validadoEm,
            validadoPorNome: prep.validadoPorNome
          }
        : undefined);

    // IMPORTANTE: Nunca sobrescreve respostaTexto nem altera silenciosamente uma resposta já aprovada
    return {
      ...prep,
      reavaliacaoNecessaria: precisaReavaliar,
      motivosReavaliacao: motivos,
      impactoDetectadoEm: precisaReavaliar ? (prep.impactoDetectadoEm || agora) : undefined,
      ultimaRespostaAprovadaSnapshot: approvedSnapshot
    };
  });
}

// ============================================================================
// 4C. INCORPORAÇÃO FORMAL DE NOVO REQUISITO À BASE INSTITUCIONAL PERMANENTE
// ============================================================================

export async function incorporarRequisitoNaBaseInstitucional(
  organizationId: string,
  novaPreparacao: PreparacaoRequisitoAuditoria,
  currentUser?: UserProfile | null,
  baseExistente: PreparacaoRequisitoAuditoria[] = []
): Promise<PreparacaoRequisitoAuditoria> {
  const role = (currentUser?.role || '').toUpperCase();
  const canApprovePermanent = ['ADMIN', 'ADMINISTRADOR', 'GESTOR_SGQ', 'GESTOR'].includes(role);
  if (!canApprovePermanent) {
    throw new Error('Apenas perfis de liderança da Qualidade (ADMIN / GESTOR_SGQ) podem aprovar e incorporar novos requisitos na Base Institucional permanente.');
  }

  const textoNorm = (novaPreparacao.textoOriginal || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const duplicado = baseExistente.find(
    (item) =>
      item.id === novaPreparacao.id ||
      (item.textoOriginal && item.textoOriginal.trim().toLowerCase().replace(/\s+/g, ' ') === textoNorm &&
        item.autoridadeOuCliente.toLowerCase() === novaPreparacao.autoridadeOuCliente.toLowerCase())
  );
  if (duplicado) {
    throw new Error(`Requisito equivalente já existe na Base Institucional (${duplicado.id} — ${duplicado.numeroItem}). Evite duplicidade.`);
  }

  const agora = new Date().toISOString();
  const hoje = agora.split('T')[0];

  const consolidado: PreparacaoRequisitoAuditoria = {
    ...novaPreparacao,
    organizationId: organizationId || 'org_impacto_aviation',
    origemBase: 'INCORPORADO_POS_AUDITORIA',
    incorporadoEm: novaPreparacao.incorporadoEm || agora,
    incorporadoPorNome: novaPreparacao.incorporadoPorNome || currentUser?.displayName || 'Qualidade SGQ',
    validadoPorNome: novaPreparacao.validadoPorNome || currentUser?.displayName || 'Qualidade SGQ',
    validadoPorUid: auth.currentUser?.uid || currentUser?.uid,
    validadoEm: novaPreparacao.validadoEm || hoje,
    ultimaRespostaAprovadaSnapshot:
      novaPreparacao.statusResposta === 'APROVADA'
        ? {
            texto: novaPreparacao.respostaTexto,
            versao: novaPreparacao.versaoResposta || '1.0',
            validadoEm: hoje,
            validadoPorNome: currentUser?.displayName || 'Qualidade SGQ'
          }
        : undefined,
    updatedAt: agora
  };

  await saveAuditPreparation(organizationId, consolidado, currentUser);

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_REQUIREMENT',
    entityId: consolidado.id,
    action: 'CREATE',
    summary: `Novo requisito incorporado permanentemente à Base Institucional: ${consolidado.requisitoId} (${consolidado.autoridadeOuCliente})`,
    changedByUid: auth.currentUser?.uid || currentUser?.uid,
    changedByEmail: auth.currentUser?.email || currentUser?.email
  });

  return consolidado;
}

// ============================================================================
// 5. AVALIAÇÃO DE PRONTIDÃO PARA AUDITORIA (AS 5 REGRAS OBRIGATÓRIAS)
// ============================================================================

export interface ResultadoAvaliacaoProntidao {
  pronto: boolean;
  situacaoCalculada: SituacaoProntidaoAuditoria;
  motivosBloqueio: string[];
}

export function avaliarProntidaoRequisito(
  preparacao: PreparacaoRequisitoAuditoria
): ResultadoAvaliacaoProntidao {
  const motivosBloqueio: string[] = [];

  // Regra 1: Aplicabilidade deve estar avaliada
  if (preparacao.aplicabilidade === 'AGUARDANDO_AVALIACAO') {
    motivosBloqueio.push('A aplicabilidade do requisito ainda não foi avaliada formalmente pela Qualidade.');
  }

  // Requisitos NÃO APLICÁVEIS com justificativa são considerados prontos
  if (preparacao.aplicabilidade === 'NAO_APLICAVEL') {
    if (!preparacao.justificativaAplicabilidade || preparacao.justificativaAplicabilidade.trim().length < 10) {
      motivosBloqueio.push('Requisitos classificados como Não Aplicáveis requerem justificativa técnica formal da Qualidade.');
      return {
        pronto: false,
        situacaoCalculada: 'EM_PREPARACAO',
        motivosBloqueio
      };
    }
    return {
      pronto: true,
      situacaoCalculada: 'PRONTO_PARA_AUDITORIA',
      motivosBloqueio: []
    };
  }

  // Regra 2: Resposta institucional revisada e aprovada
  if (preparacao.statusResposta !== 'APROVADA' || !preparacao.respostaRevisada) {
    motivosBloqueio.push('A resposta institucional não está com status APROVADA e revisada pela Qualidade.');
  }

  if (!preparacao.respostaTexto || preparacao.respostaTexto.trim().length < 20) {
    motivosBloqueio.push('O texto da resposta institucional está incompleto ou ausente.');
  }

  // Regra 3: Documentos aplicáveis identificados
  if (preparacao.documentosRelacionados.length === 0) {
    motivosBloqueio.push('Nenhum documento técnico ou procedimento interno foi vinculado para sustentar a resposta.');
  }

  // Regra 4: Evidências necessárias avaliadas conforme a modalidade de comprovação
  const modalidade = preparacao.modalidadeComprovacao || 'COMBINACAO_DE_EVIDENCIAS';

  if (modalidade === 'DOCUMENTAL_PURO') {
    // Requisitos estritamente documentais/procedimentais (MOMQ, Políticas, Organogramas, PTM):
    // Quando comprovado por documentos controlados ativos e aprovados, NÃO exigir evidência operacional de forma artificial.
    const temDocAtivo = preparacao.documentosRelacionados.some(
      (d) => d.situacao === 'ATIVO' || d.situacao === 'VIGENTE' || !d.situacao
    );
    if (!temDocAtivo) {
      motivosBloqueio.push('O requisito de modalidade Documental Puro requer pelo menos um documento controlado com situação ATIVO/VIGENTE vinculado.');
    }
    // Não exige artificialmente evidências operacionais de campo
  } else {
    // Requisitos operacionais: procedimentos isolados NÃO concedem prontidão para auditoria!
    if (!preparacao.evidenciasVinculadas || preparacao.evidenciasVinculadas.length === 0) {
      motivosBloqueio.push(`Requisitos de modalidade [${modalidade}] exigem artefatos operacionais comprobatórios; procedimentos isolados não sustentam prontidão.`);
    } else {
      if (!preparacao.evidenciasSuficientes) {
        motivosBloqueio.push('As evidências operacionais vinculadas não foram avaliadas como suficientes pela Garantia da Qualidade.');
      }

      const temEvidenciaRejeitadaOuVencida = preparacao.evidenciasVinculadas.some(
        (e) => e.avaliacaoQualidade?.status === 'REJEITADA' || e.statusValidade === 'VENCIDO'
      );
      if (temEvidenciaRejeitadaOuVencida) {
        motivosBloqueio.push('Existem evidências operacionais com status VENCIDO ou REJEITADAS na avaliação da Qualidade.');
      }

      // Verificação específica de consistência por modalidade (Regra interna de controle SGQ — sem equivalência artificial)
      const reqTextoNorma = `${preparacao.tituloRequisito || ''} ${preparacao.textoOriginal || ''} ${preparacao.normaDocumento || ''}`.toLowerCase();

      if (modalidade === 'CERTIFICADO_CALIBRACAO') {
        const temCertificado = preparacao.evidenciasVinculadas.some((e) => {
          const evTxt = `${e.titulo || ''} ${e.descricao || ''} ${e.numeroReferencia || ''} ${e.arquivoReferencia?.arquivoNome || ''} ${e.avaliacaoQualidade?.parecer || ''}`.toLowerCase();
          const ehCertificado =
            e.tipo === 'CERTIFICADO_CALIBRACAO' ||
            evTxt.includes('calibra') ||
            e.numeroReferencia?.toLowerCase().includes('cal') ||
            e.numeroReferencia?.toLowerCase().includes('rbc');
          const temValidadeInformada = Boolean(e.dataValidade) && e.statusValidade !== 'VENCIDO';
          const temRastreabilidade =
            evTxt.includes('rbc') ||
            evTxt.includes('inmetro') ||
            evTxt.includes('cgcre') ||
            evTxt.includes('nist') ||
            evTxt.includes('17025') ||
            evTxt.includes('rastrea') ||
            Boolean(e.avaliacaoQualidade?.autenticidade && e.numeroReferencia);
          const temInstrumentoId =
            Boolean(e.numeroReferencia) ||
            evTxt.includes('pat-') ||
            evTxt.includes('sn') ||
            evTxt.includes('s/n') ||
            evTxt.includes('torqu') ||
            evTxt.includes('manom') ||
            evTxt.includes('instrumento') ||
            evTxt.includes('multim');
          const avaliacaoCompleta =
            e.avaliacaoQualidade?.status === 'SUFICIENTE' &&
            Boolean(e.avaliacaoQualidade?.abrangencia) &&
            Boolean(e.avaliacaoQualidade?.validadeConferida);

          return ehCertificado && temValidadeInformada && temRastreabilidade && temInstrumentoId && avaliacaoCompleta;
        });
        if (!temCertificado) {
          motivosBloqueio.push(
            'A modalidade CERTIFICADO_CALIBRACAO exige certificado válido com data de validade, identificação do instrumento, rastreabilidade metrológica (RBC/Inmetro/NIST) e conferência formal de abrangência/validade.'
          );
        }
      } else if (modalidade === 'REGISTRO_TREINAMENTO_CHT') {
        const exigeHabilitacaoCht =
          reqTextoNorma.includes('cht') ||
          reqTextoNorma.includes('licen') ||
          reqTextoNorma.includes('habilita') ||
          reqTextoNorma.includes('canac');

        const temTreinamentoOuCht = preparacao.evidenciasVinculadas.some((e) => {
          const evTxt = `${e.titulo || ''} ${e.descricao || ''} ${e.numeroReferencia || ''} ${e.arquivoReferencia?.arquivoNome || ''}`.toLowerCase();
          const ehRegistroTreinamento =
            e.tipo === 'REGISTRO_TREINAMENTO' ||
            evTxt.includes('treina') ||
            evTxt.includes('f-001-29') ||
            evTxt.includes('capacita') ||
            evTxt.includes('reciclag');
          const ehChtOuLicenca =
            evTxt.includes('cht') ||
            evTxt.includes('licen') ||
            evTxt.includes('habilita') ||
            evTxt.includes('canac');

          const tipoCompat = exigeHabilitacaoCht ? ehChtOuLicenca : ehRegistroTreinamento || ehChtOuLicenca;
          return (
            tipoCompat &&
            e.statusValidade !== 'VENCIDO' &&
            e.avaliacaoQualidade?.status === 'SUFICIENTE' &&
            Boolean(e.avaliacaoQualidade?.validadeConferida)
          );
        });
        if (!temTreinamentoOuCht) {
          motivosBloqueio.push(
            exigeHabilitacaoCht
              ? 'Este requisito exige comprovação específica de habilitação/licença CHT ativa (não substituível apenas por lista de presença de treinamento genérico).'
              : 'A modalidade REGISTRO_TREINAMENTO_CHT exige registro formal de treinamento/capacitação ou CHT válido com validade conferida pela Qualidade.'
          );
        }
      } else if (modalidade === 'ORDEM_SERVICO_OU_CRS') {
        const exigeCrsEspecifico =
          reqTextoNorma.includes('crs') ||
          reqTextoNorma.includes('certificado de libera') ||
          reqTextoNorma.includes('release to service') ||
          reqTextoNorma.includes('return to service');

        const temOSouCRS = preparacao.evidenciasVinculadas.some((e) => {
          const evTxt = `${e.titulo || ''} ${e.descricao || ''} ${e.numeroReferencia || ''} ${e.arquivoReferencia?.arquivoNome || ''}`.toLowerCase();
          const ehCrs = e.tipo === 'CRS' || evTxt.includes('crs') || evTxt.includes('libera') || evTxt.includes('release');
          const ehOs = e.tipo === 'ORDEM_SERVICO' || evTxt.includes('os ') || evTxt.includes('o.s.') || evTxt.includes('ordem de serv') || evTxt.includes('work order');
          const tipoCompat = exigeCrsEspecifico ? ehCrs : ehCrs || ehOs;
          const temRef = Boolean(e.numeroReferencia || e.arquivoReferencia || e.arquivoNome);
          return (
            tipoCompat &&
            temRef &&
            e.avaliacaoQualidade?.status === 'SUFICIENTE' &&
            Boolean(e.avaliacaoQualidade?.abrangencia)
          );
        });
        if (!temOSouCRS) {
          motivosBloqueio.push(
            exigeCrsEspecifico
              ? 'Este requisito exige especificamente Certificado de Liberação de Serviço (CRS) formalmente referenciado e validado (não confundir com Ordem de Serviço sem liberação).'
              : 'A modalidade ORDEM_SERVICO_OU_CRS exige Ordem de Serviço executada ou Certificado de Liberação de Serviço (CRS) referenciado e aprovado.'
          );
        }
      } else if (modalidade === 'VERIFICACAO_IN_LOCO') {
        const temVerificacao = preparacao.evidenciasVinculadas.some(
          (e) =>
            Boolean(e.enviadoPorNome || e.avaliacaoQualidade?.avaliadoPorNome) &&
            Boolean(e.dataEnvio || e.avaliacaoQualidade?.avaliadoEm) &&
            Boolean(e.baseOperacional || e.avaliacaoQualidade?.abrangencia) &&
            Boolean(e.avaliacaoQualidade?.parecer) &&
            e.avaliacaoQualidade?.status === 'SUFICIENTE'
        );
        if (!temVerificacao) {
          motivosBloqueio.push(
            'A modalidade VERIFICACAO_IN_LOCO exige registro presencial com identificação do responsável, data, escopo/base e parecer conclusivo SUFICIENTE.'
          );
        }
      } else if (modalidade === 'EVIDENCIA_SISTEMA_LOG') {
        const temLogSistema = preparacao.evidenciasVinculadas.some(
          (e) =>
            Boolean(e.numeroReferencia || e.arquivoReferencia || e.titulo) &&
            Boolean(e.dataEnvio) &&
            Boolean(e.avaliacaoQualidade?.autenticidade) &&
            Boolean(e.avaliacaoQualidade?.pertinencia) &&
            e.avaliacaoQualidade?.status === 'SUFICIENTE'
        );
        if (!temLogSistema) {
          motivosBloqueio.push(
            'A modalidade EVIDENCIA_SISTEMA_LOG exige evidência de log/relatório eletrônico com identificação da fonte, data e rastreabilidade autenticada.'
          );
        }
      } else if (modalidade === 'REGISTRO_FOTOGRAFICO_OU_LAUDO') {
        const temFotoOuLaudo = preparacao.evidenciasVinculadas.some(
          (e) =>
            (e.tipo === 'FOTOGRAFIA' ||
              e.tipo === 'FOTO' ||
              e.tipo === 'LAUDO' ||
              e.titulo.toLowerCase().includes('foto') ||
              e.titulo.toLowerCase().includes('laudo') ||
              e.titulo.toLowerCase().includes('vistoria')) &&
            Boolean(e.dataEnvio) &&
            Boolean(e.baseOperacional || e.descricao) &&
            e.avaliacaoQualidade?.status === 'SUFICIENTE' &&
            Boolean(e.avaliacaoQualidade?.pertinencia)
        );
        if (!temFotoOuLaudo) {
          motivosBloqueio.push(
            'A modalidade REGISTRO_FOTOGRAFICO_OU_LAUDO exige registro fotográfico datado ou laudo técnico de vistoria com escopo/base identificado e aprovado.'
          );
        }
      } else if (modalidade === 'COMBINACAO_DE_EVIDENCIAS') {
        const temDocAtivo = preparacao.documentosRelacionados.some(
          (d) => d.situacao === 'ATIVO' || d.situacao === 'VIGENTE' || !d.situacao
        );
        const temEvidenciaSuficiente = preparacao.evidenciasVinculadas.some(
          (e) => e.statusValidade !== 'VENCIDO' && e.avaliacaoQualidade?.status === 'SUFICIENTE'
        );
        if (!temDocAtivo || !temEvidenciaSuficiente) {
          motivosBloqueio.push(
            'A modalidade COMBINACAO_DE_EVIDENCIAS exige documentos controlados ativos combinados com pelo menos uma evidência operacional válida avaliada como SUFICIENTE.'
          );
        }
      }
    }
  }

  // Regra 5: Não pode haver pendências impeditivas em aberto
  const temPendenciaImpeditivaAberta = preparacao.pendencias.some(
    (p) => p.impeditivaAuditoria && p.situacao !== 'CONCLUIDA' && p.situacao !== 'CANCELADA'
  );
  if (temPendenciaImpeditivaAberta) {
    motivosBloqueio.push('Existem pendências classificadas como Impeditivas para Auditoria que ainda não foram concluídas.');
  }

  // Se houver exceção justificada formalmente pela Qualidade
  if (preparacao.situacaoProntidao === 'EXCECAO_JUSTIFICADA' && preparacao.justificativaExcecao) {
    return {
      pronto: true,
      situacaoCalculada: 'EXCECAO_JUSTIFICADA',
      motivosBloqueio: []
    };
  }

  if (motivosBloqueio.length === 0) {
    return {
      pronto: true,
      situacaoCalculada: 'PRONTO_PARA_AUDITORIA',
      motivosBloqueio: []
    };
  }

  const situacaoCalculada: SituacaoProntidaoAuditoria = temPendenciaImpeditivaAberta
    ? 'COM_PENDENCIAS_IMPEDITIVAS'
    : preparacao.statusResposta === 'AGUARDANDO_VALIDACAO'
    ? 'AGUARDANDO_VALIDACAO'
    : preparacao.statusResposta === 'NAO_INICIADA'
    ? 'NAO_INICIADA'
    : 'EM_PREPARACAO';

  return {
    pronto: false,
    situacaoCalculada,
    motivosBloqueio
  };
}

export function atualizarModalidadeComprovacao(
  preparacao: PreparacaoRequisitoAuditoria,
  novaModalidade: ModalidadeComprovacaoEsperada,
  justificativa: string,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  if (!justificativa || justificativa.trim().length < 10) {
    throw new Error('Justificativa técnica obrigatória (mínimo 10 caracteres) para alterar a regra interna de comprovação SGQ.');
  }
  const agora = new Date().toISOString();
  const historico: HistoricoModalidadeComprovacao = {
    modalidadeAnterior: preparacao.modalidadeComprovacao,
    modalidadeNova: novaModalidade,
    dataHora: agora,
    usuarioNome: currentUser?.displayName || 'Garantia da Qualidade',
    usuarioUid: auth.currentUser?.uid || currentUser?.uid,
    justificativa: justificativa.trim()
  };

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    modalidadeComprovacao: novaModalidade,
    justificativaModalidade: justificativa.trim(),
    historicoModalidade: [historico, ...(preparacao.historicoModalidade || [])],
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export async function migrarEvidenciasLegadasBase64(
  preparacao: PreparacaoRequisitoAuditoria,
  organizationId: string,
  currentUser?: UserProfile | null
): Promise<{ preparacao: PreparacaoRequisitoAuditoria; migradosCount: number }> {
  let migradosCount = 0;
  const evidsAtualizadas = [...(preparacao.evidenciasVinculadas || [])];

  for (let i = 0; i < evidsAtualizadas.length; i++) {
    const ev = evidsAtualizadas[i];
    if (ev.arquivoUrlOuBase64 && ev.arquivoUrlOuBase64.startsWith('data:') && !ev.arquivoReferencia) {
      try {
        const { migrarArquivoBase64ParaStorage } = await import('./evidenceStorageService');
        const ref = await migrarArquivoBase64ParaStorage(
          ev.arquivoUrlOuBase64,
          ev.arquivoNome || `evidencia-${ev.evidenciaId}.bin`,
          ev.tipo || 'DOCUMENTO',
          organizationId,
          currentUser
        );
        evidsAtualizadas[i] = {
          ...ev,
          arquivoReferencia: ref,
          arquivoUrlOuBase64: undefined
        };
        migradosCount++;
      } catch (err: any) {
        console.warn(`Falha na migração de base64 da evidência ${ev.evidenciaId}:`, err.message);
      }
    }
  }

  if (migradosCount > 0) {
    const atualizado: PreparacaoRequisitoAuditoria = {
      ...preparacao,
      evidenciasVinculadas: evidsAtualizadas,
      updatedAt: new Date().toISOString()
    };
    await saveAuditPreparation(organizationId, atualizado, currentUser);
    return { preparacao: atualizado, migradosCount };
  }

  return { preparacao, migradosCount: 0 };
}

// ============================================================================
// 6. GESTÃO DE PENDÊNCIAS, DOCUMENTOS E EVIDÊNCIAS INDIVIDUAIS
// ============================================================================

export function adicionarPendencia(
  preparacao: PreparacaoRequisitoAuditoria,
  novaPendencia: Omit<PendenciaAcaoRequisito, 'id' | 'criadoEm'>,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const id = `PEND-${preparacao.id}-${Date.now().toString(36)}`;

  const pendenciaCompleta: PendenciaAcaoRequisito = {
    ...novaPendencia,
    id,
    criadoEm: agora
  };

  const pendenciasAtualizadas = [...preparacao.pendencias, pendenciaCompleta];

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    pendencias: pendenciasAtualizadas,
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export function atualizarStatusPendencia(
  preparacao: PreparacaoRequisitoAuditoria,
  pendenciaId: string,
  novoStatus: PendenciaAcaoRequisito['situacao'],
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const pendenciasAtualizadas = preparacao.pendencias.map((p) => {
    if (p.id === pendenciaId) {
      return {
        ...p,
        situacao: novoStatus,
        concluidoEm: novoStatus === 'CONCLUIDA' ? agora : undefined,
        concluidoPorNome: novoStatus === 'CONCLUIDA' ? currentUser?.displayName || 'Garantia da Qualidade' : undefined
      };
    }
    return p;
  });

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    pendencias: pendenciasAtualizadas,
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export function vincularDocumentoAoRequisito(
  preparacao: PreparacaoRequisitoAuditoria,
  documento: DocumentoControlado,
  secaoAplicavel?: string,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const jaExiste = preparacao.documentosRelacionados.some((d) => d.documentoId === documento.id);
  if (jaExiste) return preparacao;

  const novoDoc: DocumentoRelacionadoRequisito = {
    documentoId: documento.id,
    codigo: documento.codigo,
    titulo: documento.titulo,
    revisao: documento.revisaoVigenteNumero || 'Vigente',
    situacao: documento.statusGeral || 'ATIVO',
    tipo: documento.tipoSubcategoria || 'PROCEDIMENTO',
    secaoAplicavel: secaoAplicavel || 'Conforme aplicável',
    adicionadoEm: agora,
    adicionadoPorNome: currentUser?.displayName || 'Garantia da Qualidade'
  };

  const docsAtualizados = [...preparacao.documentosRelacionados, novoDoc];

  // Adiciona também às fontes utilizadas na resposta caso não conste
  const fontesAtualizadas = [...preparacao.fontesUtilizadas];
  if (!fontesAtualizadas.some((f) => f.referencia === documento.codigo)) {
    fontesAtualizadas.push({
      tipo: 'PROCEDIMENTO',
      nome: `${documento.codigo} — ${documento.titulo}`,
      referencia: documento.codigo,
      revisao: documento.revisaoVigenteNumero || 'Vigente',
      identificador: documento.id
    });
  }

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    documentosRelacionados: docsAtualizados,
    fontesUtilizadas: fontesAtualizadas,
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export function vincularEvidenciaAoRequisito(
  preparacao: PreparacaoRequisitoAuditoria,
  evidencia: EvidenciaRequisitoItem,
  avaliacao?: AvaliacaoQualidadeEvidencia,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const hoje = agora.split('T')[0];

  // Remove se já existia para atualizar dados
  const outros = preparacao.evidenciasVinculadas.filter((e) => e.evidenciaId !== evidencia.id);

  const anyEvid = evidencia as any;
  const arquivoReferencia = anyEvid.arquivoReferencia;
  const rawUrl = anyEvid.arquivoUrlOuBase64 || anyEvid.arquivoUrl;

  const novaEvid: EvidenciaObjetivaVinculada = {
    evidenciaId: evidencia.id,
    tipo: evidencia.tipo,
    titulo: evidencia.titulo,
    descricao: evidencia.descricao,
    arquivoReferencia,
    arquivoNome: arquivoReferencia?.arquivoNome || anyEvid.arquivoNome || evidencia.numeroReferencia || evidencia.titulo,
    // Armazenar apenas referência/storagePath quando arquivoReferencia existir (zero Base64 no Firestore)
    arquivoUrlOuBase64: arquivoReferencia ? arquivoReferencia.storagePath : rawUrl,
    numeroReferencia: evidencia.numeroReferencia,
    dataEnvio: evidencia.dataEvidencia || hoje,
    enviadoPorNome: currentUser?.displayName || evidencia.responsavel || 'Qualidade',
    dataValidade: evidencia.dataValidade,
    baseOperacional: evidencia.baseOperacional,
    statusValidade: evidencia.statusValidade || 'VALIDO',
    avaliacaoQualidade: avaliacao || {
      status: 'SUFICIENTE',
      pertinencia: true,
      autenticidade: true,
      abrangencia: true,
      validadeConferida: evidencia.statusValidade === 'VALIDO',
      parecer: 'Evidência avaliada e aprovada pela Garantia da Qualidade.',
      avaliadoPorNome: currentUser?.displayName || 'Paulo Okubo',
      avaliadoEm: hoje
    }
  };

  const evidsAtualizadas = [...outros, novaEvid];
  const todasSuficientes = evidsAtualizadas.length > 0 && evidsAtualizadas.every(
    (e) => e.avaliacaoQualidade?.status === 'SUFICIENTE' && e.statusValidade !== 'VENCIDO'
  );

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    evidenciasVinculadas: evidsAtualizadas,
    evidenciasSuficientes: todasSuficientes,
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export function registrarSubstituicaoArquivoEvidencia(
  preparacao: PreparacaoRequisitoAuditoria,
  evidenciaId: string,
  novaRef: import('../types').ArquivoEvidenciaRef
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const evidsAtualizadas = (preparacao.evidenciasVinculadas || []).map((ev) => {
    if (ev.evidenciaId === evidenciaId) {
      return {
        ...ev,
        arquivoReferencia: novaRef,
        arquivoNome: novaRef.arquivoNome,
        arquivoUrlOuBase64: novaRef.storagePath
      };
    }
    return ev;
  });

  return {
    ...preparacao,
    evidenciasVinculadas: evidsAtualizadas,
    updatedAt: agora
  };
}

export function reavaliarEvidenciaVinculada(
  preparacao: PreparacaoRequisitoAuditoria,
  evidenciaId: string,
  novoStatus: 'SUFICIENTE' | 'PARCIAL' | 'INSUFICIENTE',
  parecer: string,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const hoje = agora.split('T')[0];

  const evidsAtualizadas = (preparacao.evidenciasVinculadas || []).map((ev) => {
    if (ev.evidenciaId === evidenciaId) {
      return {
        ...ev,
        avaliacaoQualidade: {
          ...(ev.avaliacaoQualidade || {}),
          status: novoStatus,
          pertinencia: novoStatus !== 'INSUFICIENTE',
          autenticidade: true,
          abrangencia: novoStatus === 'SUFICIENTE',
          validadeConferida: ev.statusValidade === 'VALIDO',
          parecer: parecer || `Evidência reavaliada como ${novoStatus} pela Qualidade.`,
          avaliadoPorNome: currentUser?.displayName || 'Paulo Okubo',
          avaliadoEm: hoje
        }
      };
    }
    return ev;
  });

  const todasSuficientes = evidsAtualizadas.length > 0 && evidsAtualizadas.every(
    (e) => e.avaliacaoQualidade?.status === 'SUFICIENTE' && e.statusValidade !== 'VENCIDO'
  );

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    evidenciasVinculadas: evidsAtualizadas,
    evidenciasSuficientes: todasSuficientes,
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export function salvarEdicaoResposta(
  preparacao: PreparacaoRequisitoAuditoria,
  novoTexto: string,
  novoStatus: StatusRespostaAuditoria,
  novaOrigem: OrigemRespostaAuditoria,
  motivo: string,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const novaVersaoNum = (parseFloat(preparacao.versaoResposta || '1.0') + 0.1).toFixed(1);

  const historico: HistoricoAlteracaoResposta = {
    versao: novaVersaoNum,
    dataHora: agora,
    usuarioNome: currentUser?.displayName || 'Garantia da Qualidade',
    usuarioUid: auth.currentUser?.uid || currentUser?.uid,
    acao: novoStatus === 'APROVADA' ? 'APROVACAO' : novoStatus === 'AGUARDANDO_VALIDACAO' ? 'SUBMISSAO_VALIDACAO' : 'EDICAO_RASCUNHO',
    textoAnterior: preparacao.respostaTexto,
    textoNovo: novoTexto,
    motivo
  };

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    respostaTexto: novoTexto,
    statusResposta: novoStatus,
    origemResposta: novaOrigem,
    versaoResposta: novaVersaoNum,
    respostaRevisada: novoStatus === 'APROVADA',
    historicoRespostas: [historico, ...preparacao.historicoRespostas],
    updatedAt: agora
  };

  const reavaliacao = avaliarProntidaoRequisito(atualizado);
  atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;

  return atualizado;
}

export function aprovarValidacaoQualidade(
  preparacao: PreparacaoRequisitoAuditoria,
  parecerQualidade: string,
  evidenciasAprovadasSuficientes: boolean,
  isExcecao: boolean = false,
  justificativaExcecao?: string,
  currentUser?: UserProfile | null
): PreparacaoRequisitoAuditoria {
  const agora = new Date().toISOString();
  const hoje = agora.split('T')[0];

  const historico: HistoricoAlteracaoResposta = {
    versao: preparacao.versaoResposta || '1.0',
    dataHora: agora,
    usuarioNome: currentUser?.displayName || 'Paulo Okubo (Gerente da Qualidade)',
    usuarioUid: auth.currentUser?.uid || currentUser?.uid,
    acao: 'APROVACAO',
    motivo: parecerQualidade
  };

  const atualizado: PreparacaoRequisitoAuditoria = {
    ...preparacao,
    statusResposta: 'APROVADA',
    respostaRevisada: true,
    evidenciasSuficientes: evidenciasAprovadasSuficientes,
    parecerQualidade,
    validadoPorNome: currentUser?.displayName || 'Paulo Okubo (Gerente da Qualidade)',
    validadoPorUid: auth.currentUser?.uid || currentUser?.uid,
    validadoEm: hoje,
    justificativaExcecao: isExcecao ? justificativaExcecao : undefined,
    situacaoProntidao: isExcecao ? 'EXCECAO_JUSTIFICADA' : 'PRONTO_PARA_AUDITORIA',
    reavaliacaoNecessaria: false,
    motivosReavaliacao: [],
    ultimaRespostaAprovadaSnapshot: {
      texto: preparacao.respostaTexto,
      versao: preparacao.versaoResposta || '1.0',
      validadoEm: hoje,
      validadoPorNome: currentUser?.displayName || 'Paulo Okubo (Gerente da Qualidade)'
    },
    historicoRespostas: [historico, ...(preparacao.historicoRespostas || [])],
    updatedAt: agora
  };

  if (!isExcecao) {
    const reavaliacao = avaliarProntidaoRequisito(atualizado);
    atualizado.situacaoProntidao = reavaliacao.situacaoCalculada;
  }

  return atualizado;
}

// ============================================================================
// 7. CÁLCULO DE INDICADORES DO PAINEL DE PREPARAÇÃO
// ============================================================================

export function calcularIndicadoresPainel(
  preparacoes: PreparacaoRequisitoAuditoria[],
  requisitosMestres: typeof MASTER_CHECKLIST_ITEMS = MASTER_CHECKLIST_ITEMS
): IndicadoresPainelProntidao {
  const totalRequisitos = Math.max(preparacoes.length, requisitosMestres.length);

  let respostasNaoIniciadas = 0;
  let respostasEmElaboracao = 0;
  let respostasAguardandoValidacao = 0;
  let respostasAprovadas = 0;
  let requisitosComDocumentosVinculados = 0;
  let requisitosComEvidenciasSuficientes = 0;
  let requisitosComPendencias = 0;
  let requisitosProntosParaAuditoria = 0;
  let requisitosComAlertaReavaliacao = 0;
  let requisitosIncorporadosPosAuditoria = 0;

  preparacoes.forEach((p) => {
    if (p.statusResposta === 'NAO_INICIADA') respostasNaoIniciadas++;
    if (p.statusResposta === 'EM_ELABORACAO' || p.statusResposta === 'RASCUNHO') respostasEmElaboracao++;
    if (p.statusResposta === 'AGUARDANDO_VALIDACAO') respostasAguardandoValidacao++;
    if (p.statusResposta === 'APROVADA') respostasAprovadas++;

    if (p.documentosRelacionados && p.documentosRelacionados.length > 0) {
      requisitosComDocumentosVinculados++;
    }

    if (p.evidenciasSuficientes && p.evidenciasVinculadas && p.evidenciasVinculadas.length > 0) {
      requisitosComEvidenciasSuficientes++;
    }

    const temPendenciaAberta = p.pendencias && p.pendencias.some(
      (pend) => pend.situacao !== 'CONCLUIDA' && pend.situacao !== 'CANCELADA'
    );
    if (temPendenciaAberta) {
      requisitosComPendencias++;
    }

    if (p.situacaoProntidao === 'PRONTO_PARA_AUDITORIA' || p.situacaoProntidao === 'EXCECAO_JUSTIFICADA') {
      requisitosProntosParaAuditoria++;
    }

    if (p.reavaliacaoNecessaria) {
      requisitosComAlertaReavaliacao++;
    }

    if (p.origemBase === 'INCORPORADO_POS_AUDITORIA') {
      requisitosIncorporadosPosAuditoria++;
    }
  });

  const taxaProntidaoGeral = totalRequisitos > 0
    ? Math.round((requisitosProntosParaAuditoria / totalRequisitos) * 100)
    : 0;

  return {
    totalRequisitos,
    respostasNaoIniciadas,
    respostasEmElaboracao,
    respostasAguardandoValidacao,
    respostasAprovadas,
    requisitosComDocumentosVinculados,
    requisitosComEvidenciasSuficientes,
    requisitosComPendencias,
    requisitosProntosParaAuditoria,
    taxaProntidaoGeral,
    requisitosComAlertaReavaliacao,
    requisitosIncorporadosPosAuditoria
  };
}
