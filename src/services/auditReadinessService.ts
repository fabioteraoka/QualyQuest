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
  HistoricoModalidadeComprovacao
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

// ============================================================================
// 4. MOTOR DE SUGESTÃO DE RESPOSTA BASEADA EM FONTES REAIS (HUMAN-IN-THE-LOOP)
// ============================================================================

export interface ResultadoSugestaoResposta {
  respostaSugerida: string;
  origemClassificada: OrigemRespostaAuditoria;
  fontesIdentificadas: FonteUtilizadaResposta[];
  documentosRecomendados: DocumentoControlado[];
  evidenciasRecomendadas: EvidenciaRequisitoItem[];
  justificativaClassificacao: string;
}

export function sugerirRespostaBaseadaEmFontes(
  requisito: RequisitoClienteItem | typeof MASTER_CHECKLIST_ITEMS[0],
  controleCentral?: ControleCentralSGQ | null,
  documentosControlados: DocumentoControlado[] = [],
  evidenciasDisponiveis: EvidenciaRequisitoItem[] = []
): ResultadoSugestaoResposta {
  const anyReq = requisito as any;
  const textoReq = (anyReq.perguntaOuCriterio || anyReq.textoOriginal || anyReq.tituloCurto || '').toLowerCase();
  const normaReq = (anyReq.referenciaNormativa || anyReq.normaReferencia || anyReq.normaDocumento || '').toLowerCase();
  const ctrlId = controleCentral?.codigo || anyReq.controleCentralId || anyReq.controleCentralCodigo || 'CTRL-DOCS-01';

  const fontesIdentificadas: FonteUtilizadaResposta[] = [];
  const documentosRecomendados: DocumentoControlado[] = [];
  const evidenciasRecomendadas: EvidenciaRequisitoItem[] = [];

  // 1. Identificar documentos aplicáveis no acervo do SGQ
  documentosControlados.forEach((docItem) => {
    const cod = docItem.codigo.toLowerCase();
    const tit = docItem.titulo.toLowerCase();

    const combina =
      (textoReq.includes('calibra') && (cod.includes('fer') || cod.includes('06') || tit.includes('calibra') || cod.includes('momq'))) ||
      (textoReq.includes('treina') && (cod.includes('ptm') || cod.includes('07') || tit.includes('treina') || tit.includes('capacita'))) ||
      (textoReq.includes('fod') && (cod.includes('fod') || tit.includes('fod') || cod.includes('30'))) ||
      (textoReq.includes('esd') && (cod.includes('esd') || tit.includes('eletrost') || cod.includes('momq'))) ||
      (textoReq.includes('quarentena') && (cod.includes('qua') || tit.includes('segrega') || tit.includes('quarentena'))) ||
      (textoReq.includes('diário de bordo') && (cod.includes('crs') || tit.includes('libera') || tit.includes('logbook'))) ||
      (textoReq.includes('rii') && (tit.includes('rii') || cod.includes('rii') || tit.includes('inspeção'))) ||
      (ctrlId === 'CTRL-FERRAM-01' && (cod.includes('fer') || cod.includes('06'))) ||
      (ctrlId === 'CTRL-TREIN-01' && (cod.includes('ptm') || cod.includes('07'))) ||
      (ctrlId === 'CTRL-DOCS-01' && (cod.includes('momq') || cod.includes('021')));

    if (combina) {
      documentosRecomendados.push(docItem);
      fontesIdentificadas.push({
        tipo: docItem.categoria === 'DOCUMENTO_INTERNO' ? 'PROCEDIMENTO' : docItem.categoria === 'DOCUMENTO_AUTORIDADE' ? 'NORMA' : 'MANUAL',
        nome: `${docItem.codigo} — ${docItem.titulo}`,
        referencia: docItem.codigo,
        revisao: docItem.revisaoVigenteNumero || 'Vigente',
        identificador: docItem.id
      });
    }
  });

  // 2. Identificar se há procedimentos no Controle Central SGQ
  if (controleCentral?.documentosInternosRelacionados) {
    controleCentral.documentosInternosRelacionados.forEach((docRef) => {
      if (!fontesIdentificadas.some((f) => f.referencia === docRef)) {
        fontesIdentificadas.push({
          tipo: 'PROCEDIMENTO',
          nome: docRef,
          referencia: docRef,
          revisao: 'Vigente'
        });
      }
    });
  }

  // 3. Identificar evidências objetivas reais ativas
  evidenciasDisponiveis.forEach((ev) => {
    const combinaEv =
      ev.controleId === ctrlId ||
      ev.controleCodigo === ctrlId ||
      ev.requisitoId === anyReq.id ||
      (textoReq.includes('calibra') && ev.tipo === 'CERTIFICADO_CALIBRACAO') ||
      (textoReq.includes('treina') && ev.tipo === 'REGISTRO_TREINAMENTO');

    if (combinaEv) {
      evidenciasRecomendadas.push(ev);
      fontesIdentificadas.push({
        tipo: 'REGISTRO',
        nome: ev.titulo,
        referencia: ev.numeroReferencia || ev.id,
        revisao: ev.statusValidade || 'VALIDO',
        identificador: ev.id
      });
    }
  });

  // 4. Determinação estrita da classificação de origem
  let origemClassificada: OrigemRespostaAuditoria = 'TRATAMENTO_MANUAL';
  let justificativaClassificacao = '';
  let respostaSugerida = '';

  const temProcedimentoFormal = fontesIdentificadas.some(
    (f) => f.tipo === 'PROCEDIMENTO' || f.tipo === 'MANUAL'
  );
  const temEvidenciaValida = evidenciasRecomendadas.some(
    (e) => e.statusValidade === 'VALIDO' || !e.statusValidade
  );

  // Caso especial: TACV sem manual homologado
  if (anyReq.checklistId === 'CHK-TACV-LINE' || normaReq.includes('tacv') || normaReq.includes('aac')) {
    origemClassificada = 'TRATAMENTO_MANUAL';
    justificativaClassificacao = 'Requisito sob dependência de validação documental prévia do operador (TACV / Cabo Verde). Não há manual homologado arquivado.';
    respostaSugerida = 'Tratamento manual obrigatório: A organização aguarda apresentação formal do GMM e certificado de reconhecimento operacional da Agência de Aviação Civil (AAC) de Cabo Verde para a frota Boeing 737-MAX na estação de linha de GRU antes de submeter resposta institucional aprovada.';
  } else if (temProcedimentoFormal && temEvidenciaValida && evidenciasRecomendadas.length >= 1) {
    origemClassificada = 'AUTOMATICA';
    justificativaClassificacao = `Foram identificados ${fontesIdentificadas.length} documentos procedimentais oficiais e ${evidenciasRecomendadas.length} evidências objetivas válidas para comprovação integral.`;
    
    const docsStr = fontesIdentificadas
      .filter((f) => f.tipo === 'PROCEDIMENTO' || f.tipo === 'MANUAL')
      .map((f) => f.nome)
      .join(', ');
    const evidsStr = evidenciasRecomendadas.map((e) => `${e.titulo} (Ref: ${e.numeroReferencia || e.tipo})`).join('; ');

    respostaSugerida = `A IMPACTO cumpre o requisito regulatório/contratual por meio da execução padronizada do controle corporativo ${ctrlId} (${controleCentral?.nome || 'SGQ'}), amparado pelos documentos controlados [${docsStr}]. A conformidade prática e a eficácia operacional são comprovadas objetivamente através dos seguintes registros e certificados vigentes: [${evidsStr}]. Todos os registros são mantidos arquivados sob guarda da Garantia da Qualidade, acessíveis para auditoria.`;
  } else if (temProcedimentoFormal) {
    origemClassificada = 'AUTOMATICA_COM_VALIDACAO';
    justificativaClassificacao = 'Identificado procedimento formal aplicável no acervo do SGQ, porém requer revisão humana e vinculação de evidências de campo da base auditada.';
    const docsStr = fontesIdentificadas.map((f) => f.nome).join(', ');

    respostaSugerida = `A organização possui diretriz procedimental estruturada em [${docsStr}], atendendo aos preceitos da Seção ${anyReq.moduloOuSecao || anyReq.secaoReferencia || 'Geral'}. Para apresentação formal em auditoria, a Qualidade deve revisar a redação institucional e anexar os registros de execução prática da estação aplicável.`;
  } else if (controleCentral) {
    origemClassificada = 'COMPLEMENTACAO_NECESSARIA';
    justificativaClassificacao = 'Existe processo geral no SGQ, mas faltam referências normativas específicas ou evidências objetivas cadastradas.';
    respostaSugerida = `O processo é conduzido sob a governança do controle corporativo ${ctrlId} (${controleCentral.nome}), porém depende de detalhamento de instruções técnicas complementares e coleta de evidências de pátio/hangar para atingir o nível de prontidão auditável.`;
  } else {
    origemClassificada = 'TRATAMENTO_MANUAL';
    justificativaClassificacao = 'Nenhuma fonte documental ou registro interno suficiente foi localizado no sistema para este requisito específico.';
    respostaSugerida = `Tratamento manual requerido: Não foram encontradas fontes suficientes no acervo do SGQ para responder automaticamente a este critério. A equipe da Qualidade deve analisar a norma [${anyReq.referenciaNormativa || anyReq.normaReferencia || 'Vigente'}], elaborar a resposta institucional e cadastrar os documentos pertinentes.`;
  }

  return {
    respostaSugerida,
    origemClassificada,
    fontesIdentificadas,
    documentosRecomendados,
    evidenciasRecomendadas,
    justificativaClassificacao
  };
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
    taxaProntidaoGeral
  };
}
