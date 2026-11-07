/**
 * Tipos e Estruturas para o Acervo de IA e Ingestão Documental Completa (QualyQuest SGQ)
 * Em conformidade rigorosa com os requisitos de hierarquia documental, chunking inteligente,
 * relatório de cobertura auditável, importação estruturada JSON e enquadramento de NCs.
 */

export type FormatoArquivoDocumento = 'JSON' | 'PDF' | 'DOCX' | 'TXT' | 'OUTRO';

export type StatusIndexacaoFragmento = 'INDEXADO' | 'PENDENTE' | 'ERRO';

export type StatusValidacaoCobertura = 'APROVADO' | 'REQUER_REVISAO' | 'REPROVADO';

export type EstagioEtapaProcessamento = 
  | 'UPLOAD_CONCLUIDO'
  | 'EXTRACAO_CONCLUIDA'
  | 'ESTRUTURA_IDENTIFICADA'
  | 'INDEXACAO_CONCLUIDA'
  | 'VALIDACAO_APROVADA'
  | 'VALIDACAO_COM_AVISOS';

export type StatusTarefaIngestao = 
  | 'EM_FILA'
  | 'PROCESSANDO'
  | 'CONCLUIDO'
  | 'PAUSADO_ERRO'
  | 'RETOMANDO'
  | 'FALHA';

/**
 * Representação de uma tabela estruturada preservada no fragmento
 */
export interface TabelaEstruturada {
  titulo?: string;
  colunas?: string[];
  linhas?: string[][];
  markdown: string;
}

/**
 * Estrutura canônica de um fragmento documental (Chunk Hierárquico)
 * Atende aos requisitos da Seção 4 da especificação.
 */
export interface FragmentoDocumento {
  id: string; // Ex: frag_MOMQ_rev14_cap3_sec3.4_sub3.4.3_ord1
  documentoId: string;
  nomeDocumento: string;
  codigo: string; // Ex: MOMQ, MNT-001
  revisao: string; // Ex: Rev. 14, 07
  idioma: string; // Ex: pt-BR
  capitulo: string; // Ex: '3' ou '2'
  capituloTitulo?: string; // Ex: 'Controle de Ferramentas, Equipamentos e Metrologia'
  secao: string; // Ex: '3.4' ou '2.4'
  subitem: string; // Ex: '3.4.3' ou '2.4.3'
  titulo: string; // Ex: 'Gestão e Controle Centralizado de Calibração'
  pagina: number | null; // Ex: 35 ou null se documento sem paginação física
  conteudo: string; // Texto integral do fragmento / requisito
  ordem: number; // 1, 2, 3...
  totalFragmentos: number; // Total no documento
  processadoEm: string; // ISO 8601
  versaoMecanismo: string; // Ex: 'v2.5-hierarchical-chunker'
  statusIndexacao: StatusIndexacaoFragmento;
  contextoHierarquico: string; // Ex: "MOMQ Rev. 14 > Cap. 3 Controle de Ferramentas > Seção 3.4 Metrologia > Subitem 3.4.3 Gestão e Controle de Calibração"
  tabelas?: TabelaEstruturada[];
  palavrasChave?: string[];
  procedimentoRelacionado?: string;
  responsabilidade?: string;
  controlePrevisto?: string;
  evidenciaDocumental?: string;
  tokensBusca: string[]; // Termos normalizados para busca híbrida (textual + semântica)
  hashConteudo: string; // Hash SHA-256 para idempotência e detecção de duplicidades
  isRevisaoVigente?: boolean;
}

/**
 * Relatório de Cobertura Documental Auditável
 * Atende aos requisitos da Seção 6 da especificação.
 */
export interface RelatorioCoberturaDocumental {
  id: string;
  documentoId: string;
  codigo: string;
  revisao: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  formato: FormatoArquivoDocumento;
  paginasTotais: number;
  paginasExtraidas: number;
  paginasSemConteudo: number;
  paginasComFalha: number;
  capitulosIdentificados: number;
  secoesIdentificadas: number;
  subitensIdentificados: number;
  fragmentosCriados: number;
  fragmentosIndexados: number;
  fragmentosComFalha: number;
  percentualCobertura: number; // 0.0 a 100.0%
  avisosELimitacoes: string[];
  statusValidacao: StatusValidacaoCobertura;
  statusEtapa: EstagioEtapaProcessamento;
  tabelasExtraidasTotal: number;
  ocrAplicado: boolean;
  tempoProcessamentoMs: number;
  timestamp: string;
}

/**
 * Controle de Tarefas de Processamento em Lote com Retomada
 * Atende aos requisitos da Seção 3 e 5 da especificação.
 */
export interface TarefaIngestaoDocumento {
  id: string; // UUID da tarefa
  organizationId: string;
  documentoId: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  formato: FormatoArquivoDocumento;
  etapaAtual: number; // 1 a 10
  nomeEtapa: string;
  progressoPercentual: number; // 0 a 100%
  paginasProcessadas: number;
  paginasTotais: number;
  fragmentosProcessados: number;
  fragmentosTotais: number;
  status: StatusTarefaIngestao;
  erroDetalhe?: string;
  avisos: string[];
  relatorioCobertura?: RelatorioCoberturaDocumental;
  iniciadoEm: string;
  atualizadoEm: string;
  concluidoEm?: string;
  canResume: boolean;
  lastSuccessfulChunkIndex: number;
}

/**
 * Schema Oficial para Importação Estruturada por JSON
 * Atende aos requisitos da Seção 7 da especificação.
 */
export interface SecaoImportacaoJSON {
  capitulo: string | number;
  capituloTitulo?: string;
  secao: string | number;
  subitem: string | number;
  pagina?: number;
  titulo: string;
  conteudo: string;
  tabelas?: Array<{
    titulo?: string;
    markdown?: string;
    colunas?: string[];
    linhas?: string[][];
  }>;
  palavrasChave?: string[];
  procedimentoRelacionado?: string;
  responsabilidade?: string;
  responsabilidades?: string[];
  controlePrevisto?: string;
  controlesObrigatorios?: string[];
  evidenciaDocumental?: string;
  evidenciasExigidas?: string[];
}

export interface DocumentoMetadadosJSON {
  codigo: string;
  nome?: string;
  titulo?: string;
  revisao: string;
  tipoDocumento?: string;
  idioma?: string;
  orgaoRegulador?: string;
  dataVigencia?: string;
  dataRevisao?: string;
  dataAprovacao?: string;
  setoresAplicaveis?: string[];
  descricaoResumo?: string;
  proprietario?: string;
  assessor?: string;
  documentoControladoId?: string;
}

export interface ManualStructuredImportJSON {
  $schema?: string;
  versaoSchema?: string; // Ex: '1.0'
  documento: DocumentoMetadadosJSON;
  secoes: SecaoImportacaoJSON[];
}

/**
 * Resultado do Enquadramento de Não Conformidade (NC) pela IA
 * Atende aos requisitos da Seção 8 da especificação.
 */
export interface ResultadoEnquadramentoNC {
  encontrado: boolean;
  declaracao: string; // Caso não encontre, declaração formal de ausência de requisito
  requisitoAplicavel?: string; // Trecho literal exato do manual
  documentoNome?: string;
  codigo?: string;
  revisao?: string;
  capitulo?: string;
  secao?: string;
  subitem?: string;
  pagina?: number | null;
  procedimentoRelacionado?: string;
  responsabilidadeDefinida?: string;
  controlePrevisto?: string;
  evidenciaDocumentalPertinente?: string;
  contextoIntegral?: string;
  grauAderencia?: number; // 0 a 100%
  fragmentoId?: string;
  citacaoFormatada?: string; // Ex: "MOMQ Rev. 14, Cap. 3, Seção 3.4, Subitem 3.4.3 (Pág. 35)"
  metodoBuscaUtilizado?: 'EXATO_ITEM' | 'HIBRIDO_SEMANTICO_TEXTUAL' | 'FALLBACK_DETERMINISTICO';
  manuaisConsultados?: string[];
  fragmentosRelevantesAdicionais?: Array<{
    manual: string;
    revisao: string;
    subitem: string;
    titulo: string;
    trecho: string;
    pagina?: number | null;
    aderencia: number;
  }>;
}

/**
 * Histórico de Versão e Comparativo entre Revisões
 * Atende aos requisitos da Seção 9 da especificação.
 */
export interface RegistroHistoricoRevisaoManual {
  revisao: string;
  dataRevisao: string;
  dataVigencia: string;
  fimVigencia?: string;
  status: 'Vigente' | 'Substituído' | 'Obsoleto';
  totalFragmentos: number;
  totalCapitulos: number;
  resumoAlteracoes?: string;
  substituidoPorRevisao?: string;
  criadoEm: string;
}

export interface ComparativoRevisoesManual {
  manualCodigo: string;
  revisaoAnterior: string;
  revisaoNova: string;
  subitensAdicionados: string[];
  subitensRemovidos: string[];
  subitensAlterados: Array<{
    subitem: string;
    titulo: string;
    alteracaoResumo: string;
  }>;
  totalFragmentosAnterior: number;
  totalFragmentosNovo: number;
  dataComparacao: string;
}

export const AI_KNOWLEDGE_BASE_MODULE = true;
