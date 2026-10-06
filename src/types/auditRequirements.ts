/**
 * Tipos Oficiais para Gestão Inteligente de Auditorias Externas, Requisitos,
 * Respostas e Melhoria Contínua no QualiGest SGQ.
 * 
 * Regra Arquitetural:
 * - O checklist deixa de ser interpretado como bloco único.
 * - Cada pergunta/requisito é uma unidade de controle individual vinculada à auditoria.
 * - Separação estrita entre Situação Técnica de Atendimento e Estado Administrativo de Acompanhamento.
 * - Campo próprio para Decisão Organizacional (Manter, Implementar, Melhorar, etc.).
 */

import { EvidenciaAuditoriaItem } from '../types';

export type SituacaoAtendimentoRequisito =
  | 'ATENDIDO'                  // Existe evidência suficiente e aplicável
  | 'PARCIALMENTE_ATENDIDO'    // Parte atendida, mas há lacunas identificadas
  | 'NAO_ATENDIDO'             // Lacuna real identificada
  | 'NAO_APLICAVEL'            // Justificativa documentada de não aplicabilidade
  | 'EM_AVALIACAO'             // Ainda não há informações suficientes para conclusão
  | 'ATENDIMENTO_NAO_COMPROVADO'; // Há indícios, mas faltam evidências adequadas

export type EstadoAcompanhamentoRequisito =
  | 'NAO_INICIADO'
  | 'EM_ANALISE'
  | 'AGUARDANDO_INFORMACAO'
  | 'AGUARDANDO_IMPLEMENTACAO'
  | 'EM_IMPLEMENTACAO'
  | 'AGUARDANDO_EVIDENCIA'
  | 'EM_VALIDACAO'
  | 'CONCLUIDO'
  | 'SUSPENSO_CANCELADO';

export type DecisaoOrganizacionalRequisito =
  | 'MANTER_COMO_ESTA'          // Já atendido, não exige mudança imediata
  | 'IMPLEMENTAR'               // Ainda não implementado, deverá ser incorporado
  | 'MELHORAR'                  // Atendido, mas empresa decidiu elevar nível de controle
  | 'FORMALIZAR'                // Prática existe, mas precisa ser documentada
  | 'AVALIAR_APLICABILIDADE'    // Necessário estudo antes de decidir
  | 'NAO_IMPLEMENTAR_NAO_APLICAVEL' // Decisão fundamentada com justificativa formal
  | 'AGUARDAR_DECISAO';         // Depende de análise gerencial ou contratual

export interface ImpactosDecisaoOrganizacional {
  requerRevisaoProcedimento?: boolean;
  requerTreinamento?: boolean;
  requerAquisicaoRecurso?: boolean;
  requerRNC?: boolean;
  requerAuditoriaInterna?: boolean;
  procedimentosEnvolvidos?: string[];
  setoresImpactados?: string[];
  estimativaPrazoDias?: number;
  dataAlvo?: string;
  custoOuRecursoEstimado?: string;
}

export interface SugestaoRespostaRequisitoIA {
  interpretacaoLinguagemClara: string;
  oQueAuditorEstaSolicitando: string;
  oQueQualiGestEncontrou: string;
  documentosERegistrosSustentam: Array<{
    codigo: string;
    titulo: string;
    revisaoVigente: string;
    trechoRelevante?: string;
  }>;
  evidenciasExistentesELimitacoes: string;
  informacoesAusentesOuGaps: string;
  sugestaoRespostaPreliminar: string;
  sugestaoMelhoriaOuImplementacao?: string;
  localizacaoDocumentosParaConsulta?: string;
  grauConfianca: number; // 0 a 100
  requerConfirmacaoHumana: boolean;
  geradoEm: string;
}

export interface PropostaVerificacaoAuditoriaInterna {
  objetivoVerificacao: string;
  perguntaAuditoriaInterna: string;
  evidenciaEsperada: string;
  documentosRegistrosConsultar: string[];
  processoOuSetor: string;
  historicoProblemasAnteriores?: string;
  orientacaoAuditorInterno: string;
  incluidoNoProgramaAnual?: boolean;
  codigoAuditoriaInternaAlvo?: string;
}

export interface LogTrilhaRequisito {
  dataHora: string;
  usuarioUid: string;
  usuarioNome: string;
  acao: 'CRIACAO' | 'EDICAO_TEXTO' | 'MUDANCA_ATENDIMENTO' | 'MUDANCA_ACOMPANHAMENTO' | 'DECISAO_ORGANIZACIONAL' | 'RESPOSTA_ENVIADA' | 'EVIDENCIA_VINCULADA' | 'RNC_VINCULADA' | 'CANCELAMENTO' | 'RESTAURACAO';
  detalhes: string;
  de?: string;
  para?: string;
}

export interface RequisitoAuditoriaExterna {
  id: string; // Ex: 'AUDREQ-1712345678-01'
  organizationId: string;
  auditId: string; // ID da AuditoriaExternaRecord
  numeroAuditoria: string; // Ex: 'AUD-2026-KALITTA-01'
  clienteOuEntidade: string; // Ex: 'Kalitta Air', 'ANAC'
  dataAuditoria?: string;

  // Identificação e Hierarquia do Requisito
  numeroItem: string; // Ex: '1', '2', '8', '27', 'Q2059-01'
  capituloOuSecao: string; // Ex: 'General Operations', 'Training', 'Parts and Materials', 'Calibrated Tooling'
  hierarquia: {
    capitulo?: string;
    secao?: string;
    subitem?: string;
    ordem: number;
  };
  tituloCurto: string;
  textoOriginal: string; // Texto integral da pergunta/requisito
  perguntaOuCriterio?: string;
  referenciaNormativa?: string; // Ex: 'GMM 7.8, 14 CFR 43.13, 14 CFR 145.209'
  orientacaoAuditor?: string;
  campoRespostaOriginal?: string; // Ex: 'YES / NO / NA', campos de formulário como 'Airframe: Powerplant: A&P:'
  evidenciaSolicitada?: string;

  // Situação e Acompanhamento
  situacaoAtendimento: SituacaoAtendimentoRequisito;
  estadoAcompanhamento: EstadoAcompanhamentoRequisito;
  prioridade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  setorResponsavel: string;
  responsavelInterno: string;
  prazo?: string;
  acoesNecessarias?: string;

  // Decisão Organizacional
  decisaoOrganizacional?: DecisaoOrganizacionalRequisito;
  justificativaDecisao?: string;
  responsavelDecisao?: string;
  dataDecisao?: string;
  impactosDecisao?: ImpactosDecisaoOrganizacional;

  // Resposta Oficial e Evidências
  respostaOficialEnviada?: string;
  dataRespostaEnviada?: string;
  statusAceitacaoAuditor?: 'PENDENTE' | 'ACEITA' | 'REJEITADA' | 'EM_ANALISE';
  parecerAuditorExterno?: string;
  evidencias?: EvidenciaAuditoriaItem[];

  // Inteligência & Acervo
  sugestaoRespostaIA?: SugestaoRespostaRequisitoIA;
  documentosRelacionados?: Array<{
    documentoId?: string;
    codigo: string;
    titulo: string;
    revisao?: string;
  }>;

  // Vínculos com RNC e Requisito Reutilizável
  rncId?: string;
  rncNumero?: string;
  requisitoOrganizacionalId?: string; // Vínculo com base de conhecimento consolidada
  propostaAuditoriaInterna?: PropostaVerificacaoAuditoriaInterna;

  // Metadados de Extração e Controle
  localizacaoOrigem?: {
    pagina?: number;
    aba?: string;
    linha?: number;
    documentoNome?: string;
  };
  grauConfiancaExtracao: number; // 0-100
  necessitaRevisaoHumana: boolean;
  statusRegistro: 'ATIVO' | 'CANCELADO' | 'ARQUIVADO';
  motivoCancelamento?: string;

  createdAt: string;
  updatedAt: string;
  criadoPorUid: string;
  criadoPorNome: string;
  trilhaAuditoria: LogTrilhaRequisito[];
}

export interface RequisitoOrganizacionalReutilizavel {
  id: string; // Ex: 'REQ-ORG-CALIB-01'
  organizationId: string;
  codigoPadrao: string; // Ex: 'REQ-FERR-CALIBRACAO'
  tituloConsolidado: string;
  descricaoConsolidada: string;
  temaOuCategoria: string; // Ex: 'Calibrated Tooling', 'Training', 'Dangerous Goods'
  referenciasNormativasPrincipais: string[]; // ['14 CFR 145.209', 'RBAC 145.109', 'ISO 9001:2015']
  
  // Requisitos de auditorias agrupados sob esta referência
  auditoriasHistorico: Array<{
    auditId: string;
    numeroAuditoria: string;
    clienteOuEntidade: string;
    dataAuditoria: string;
    numeroItemOriginal: string;
    textoOriginalAuditor: string;
    situacaoAtendimento: SituacaoAtendimentoRequisito;
    respostaEnviada?: string;
    statusAceitacaoAuditor?: 'ACEITA' | 'REJEITADA' | 'EM_ANALISE' | 'PENDENTE';
    evidenciasUtilizadas?: string[];
  }>;

  melhorPraticaRegistrada?: string;
  procedimentoPadraoInternoRef?: string;
  evidenciasTipicasRecomendadas: string[];
  totalOcorrencias: number;
  recorrenciaAlertada: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtracaoChecklistResultado {
  sucesso: boolean;
  nomeArquivo: string;
  clienteDetectado: string;
  codigoChecklist: string;
  revisaoChecklist: string;
  dataChecklist?: string;
  totalItensIdentificados: number;
  secoesIdentificadas: string[];
  grauConfiancaGeral: number;
  tipoDocumentoDetectado?: 'AUDITORIA_REALIZADA' | 'CHECKLIST_PRE_AUDITORIA' | 'RESPOSTA_AUDITORIA' | 'DOCUMENTO_COMPLEMENTAR';
  hashSha256?: string;
  tamanhoBytes?: number;
  itens: Array<{
    tempId: string;
    numeroItem: string;
    capituloOuSecao: string;
    textoOriginal: string;
    perguntaOuCriterio?: string;
    referenciaNormativa?: string;
    orientacaoAuditor?: string;
    campoRespostaOriginal?: string;
    evidenciaSolicitada?: string;
    categoriaSugerida?: string;
    criticidadeSugerida?: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
    grauConfianca: number;
    necessitaRevisaoHumana: boolean;
    paginaOrigem?: number;
  }>;
  resumoExecutivo: string;
}

// -------------------------------------------------------------------------
// FASE AUDITORIA INTELIGENTE: MEMÓRIA DE AUDITORIAS, PRECEDENTES E APRENDIZADO
// -------------------------------------------------------------------------

/**
 * Categorias Rígidas de Fontes (Regra Fundamental 3):
 * A IA deve sempre distinguir e a UI expor claramente.
 */
export type TipoFonteAuditoria =
  | 'FONTE_REGULATORIA'    // AD, RBAC, IS, 14 CFR, EASA, autoridade
  | 'FONTE_INTERNA'        // Manual, procedimento, MOE, MOMQ, MPO, IT, formulário com revisão
  | 'EVIDENCIA'            // Registro, certificado RBC, O.S., logbook, CRS, foto
  | 'PRECEDENTE_AUDITORIA' // Resposta anteriormente aceita por auditor externo (NUNCA verdade regulatória)
  | 'INFERENCIA_IA';       // Sugestão ou interpretação gerada pela IA, sujeita à validação humana

export interface FonteIdentificadaItem {
  id: string;
  categoria: TipoFonteAuditoria;
  rotuloCategoria: string;
  identificador: string; // Ex: 'RBAC 145.109', 'MPO-12 Rev. 04', 'Certificado RBC 88219', 'Auditoria SWISS 2025'
  tituloOuDescricao: string;
  revisaoCitada?: string;
  revisaoVigenteNoAcervo?: string;
  divergenciaRevisao?: boolean;
  trechoRelevante?: string;
  confiabilidade: number; // 0-100
  disponivelNoSistema: boolean;
  caminhoOuLink?: string;
}

/**
 * Status de Conhecimento e Governança da Memória (Regra 20)
 */
export type StatusConhecimentoAprendizado =
  | 'PROPOSED'         // Proposta pela IA ou importação
  | 'REVIEW_REQUIRED' // Requer revisão humana ou técnica
  | 'VALIDATED'       // Validado oficialmente por gestor SGQ
  | 'SUPERSEDED'      // Substituído por nova revisão ou decisão
  | 'REJECTED'        // Rejeitado como aprendizado institucional
  | 'ARCHIVED';       // Histórico arquivado

/**
 * Nível de Correspondência / Matching de Precedente (Regra 29)
 */
export type NivelMatchingAuditoria =
  | 'NIVEL_1_EXATO'       // Mesmo requisito / mesmo código normativo / mesma pergunta exata
  | 'NIVEL_2_DOCUMENTAL'  // Mesmo manual / mesmo procedimento / mesmo formulário
  | 'NIVEL_3_SEMANTICO'   // Pergunta ou desvio com termos tecnicamente semelhantes
  | 'NIVEL_4_RELACIONADO'; // Macrotema ou processo afim

/**
 * Cobertura de Preparação para o Requisito (Regra 15)
 */
export type CoberturaPreparacaoRequisito =
  | 'FULL_COVERAGE'     // Precedente aceito + manual vigente + evidência disponível
  | 'PARTIAL_COVERAGE'  // Manual identificado mas evidência factual pendente
  | 'GAP';              // Requisito sem documentação ou precedente localizado

export interface GapAuditoriaItem {
  id: string;
  tipo: 'DOCUMENTAL' | 'OPERACIONAL' | 'AUDITORIA';
  titulo: string;
  descricao: string;
  acaoRecomendada: string;
}

/**
 * Registro de Aprendizado Organizacional da Auditoria (Audit Learning Record)
 * Derivado de NCs encerradas, respostas aceitas e precedentes reais.
 */
export interface AuditLearningRecord {
  id: string; // Ex: 'LRN-2026-001'
  organizationId: string;
  auditIdOrigem: string;
  numeroAuditoriaOrigem: string;
  entidadeAuditora: string;
  tipoAuditoria: 'EXTERNAL' | 'INTERNAL' | 'CUSTOMER' | 'AUTHORITY' | 'LESSOR' | 'SUPPLIER' | 'OTHER';
  
  // Requisito e Constatação Original
  numeroItemRequisito: string;
  perguntaOriginal: string;
  requisitoNormativo: string;
  textoOriginalNC?: string;
  classificacaoOriginal?: 'MAIOR' | 'MENOR' | 'OBSERVACAO';
  categoriaProcesso: string; // 'Metrologia e Ferramental', 'Pessoas e Treinamentos', etc.
  
  // Solução Factual e Ações
  causaRaizApurada: string;
  correcaoImediataExecutada: string;
  acaoCorretivaImplementada: string;
  respostaApresentada: string;
  evidenciasApresentadas: Array<{
    tipo: 'CERTIFICADO' | 'TREINAMENTO' | 'PROCEDIMENTO' | 'ORDEM_SERVICO' | 'FOTO' | 'OUTRO';
    codigoOuNumero: string;
    descricao: string;
    dataRegistro?: string;
  }>;
  
  // Decisão do Auditor Externo
  resultadoAuditor: 'ACEITA' | 'REJEITADA' | 'PARCIAL' | 'ENCERRADA';
  comentarioAuditor?: string;
  motivoEncerramento?: string;
  dataHomologacao?: string;

  // Contexto Documental no Momento da Auditoria (Versionamento Rígido - Regra 21)
  documentosUtilizadosNaEpoca: Array<{
    codigo: string;
    titulo: string;
    revisaoNaEpoca: string;
    trechoRelevante?: string;
  }>;

  // Status de Governança
  statusConhecimento: StatusConhecimentoAprendizado;
  validadoPorNome?: string;
  validadoPorUid?: string;
  validadoEm?: string;
  observacoesValidacao?: string;

  // Estatísticas de Reutilização
  vezesReutilizadoEmPreparacao: number;
  ultimaVezConsultado?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Padrão Recorrente de Auditoria (Regra 17 & 18)
 */
export interface PadraoRecorrenteAuditoria {
  id: string;
  temaOuProcesso: string;
  totalOcorrencias: number;
  auditoriasEnvolvidas: Array<{
    ano: number;
    numeroAuditoria: string;
    clienteOuEntidade: string;
    tipoResultado: 'OBSERVACAO' | 'RESPOSTA_ACEITA' | 'NC' | 'QUESTIONADO_NOVAMENTE';
  }>;
  respostasHistoricasResumo: string;
  ultimaAcaoImplementada: string;
  situacaoAtual: 'EFICAZ' | 'NECESSITA_VALIDACAO_EFICACIA' | 'REINCIDENCIA_CRITICA';
  recomendacaoSGQ: string;
}

/**
 * Proposta Estruturada de Preparação de Resposta com Anti-Alucinação (Regra 10, 13, 14, 25)
 */
export interface PropostaPreparacaoRequisitoOutput {
  pergunta: string;
  requisitoNumero: string;
  cobertura: CoberturaPreparacaoRequisito;
  grauConfianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  scoreConfiancaNumerico: number; // 0-100
  
  // Precedente Histórico Localizado (Classificado estritamente como Precedente Interno)
  precedenteEncontrado?: {
    auditoriaId: string;
    numeroAuditoria: string;
    ano: string;
    cliente: string;
    resultadoAuditor: string;
    respostaAceita: string;
    nivelMatching: NivelMatchingAuditoria;
    scoreSimilaridade: number;
    avisoPrecedente: string; // "PRECEDENTE INTERNO DE AUDITORIA - NÃO CONSTITUI VERDADE REGULATÓRIA"
  };

  // Fontes Utilizadas Rigorosamente Categorizadas (A, B, C, D, E)
  fontesUtilizadas: FonteIdentificadaItem[];
  
  // Avaliação Temporal Documental
  alertaRevisaoDocumental?: {
    documentoCodigo: string;
    revisaoHistorica: string;
    revisaoVigente: string;
    divergente: boolean;
    mensagemAlerta: string;
  };

  // Resposta Sugerida (ou Declaração de Ausência)
  hasInformacaoSuficiente: boolean;
  respostaSugeridaSintetizada: string;
  advertenciaAntiAlucinacao?: string; // "INFORMAÇÃO NÃO ENCONTRADA" ou "CONFLITO DE FONTES — REVISÃO HUMANA NECESSÁRIA"

  // Gaps Identificados
  gaps: GapAuditoriaItem[];
  
  // Decisão Humana
  decisaoHumana?: {
    status: 'ACEITAR_SUGESTAO' | 'EDITAR' | 'REJEITAR' | 'MARCAR_PARA_REVISAO';
    respostaEditada?: string;
    responsavelNome?: string;
    dataDecisao?: string;
    observacao?: string;
  };
}
