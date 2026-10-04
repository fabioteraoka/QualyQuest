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
