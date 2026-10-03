import { VinculoImpactoMro } from './types/impactoMro';

export type TipoAcao = 'Corretiva' | 'Preventiva' | 'Oportunidade de Melhoria';

// Vínculo opcional com Auditoria Externa (Fase 8)
export interface VinculoAuditoriaExterna {
  auditoriaId: string;
  numeroAuditoria: string;
  constatacaoId: string;
  numeroConstatacaoExterna: string;
  entidadeAuditora: string;
  dataVinculo: string;
}

export type SeveridadeRisco = '1' | '2' | '3' | '4' | '5';
export type ProbabilidadeRisco = 'A' | 'B' | 'C' | 'D' | 'E';
export type NivelRisco = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';

export interface AvaliacaoRisco {
  severidade: SeveridadeRisco | string;
  probabilidade: ProbabilidadeRisco | string;
  codigo: string; // Ex: '2C', '1A', '4E'
  nivel: NivelRisco;
  nivelRisco?: NivelRisco;
  justificativa?: string;
}

// Workflow completo de ciclo de vida da Não Conformidade
export type StatusGeralNC =
  | 'Rascunho'
  | 'Aberta'
  | 'Em Investigação'
  | 'Ação Corretiva'
  | 'Aguardando Eficácia'
  | 'Aguardando Aprovação'
  | 'Encerrada'
  | 'Rejeitada'
  | 'Cancelada'
  | 'Suspensa'
  // Compatibilidade com estados legados
  | 'Em Contenção'
  | 'Em Análise de Causa'
  | 'Ação em Andamento'
  | 'Em Andamento'
  | 'Reaberta'
  | 'Atrasada';

export type MetodoVerificacaoEficacia = 
  | 'Documental' 
  | 'Visual' 
  | 'Entrevista' 
  | 'Outro'
  | 'Reauditoria / Inspeção de Acompanhamento'
  | 'Reauditoria';

// Classificação de tipo de documento
export type TipoDocumento = 
  | 'Documento Normativo Oficial'
  | 'Manual Interno'
  | 'Procedimento (POP)'
  | 'Instrução de Trabalho (IT)'
  | 'Evidência'
  | 'Informação de IA'
  | 'Informação do Usuário';

// Status de vigência documental
export type StatusVigenciaDocumento = 
  | 'Vigente'
  | 'Em Revisão'
  | 'Obsoleto'
  | 'Vigência não verificada'
  | 'Vigência não determinada — requer validação humana';

// Origem da Informação
export type OrigemInformacao = 
  | 'MANUAL'
  | 'REGULAMENTO'
  | 'DOCUMENTO IMPORTADO'
  | 'USUÁRIO'
  | 'IA GEMINI'
  | 'MOTOR DETERMINÍSTICO'
  | 'REGRA DO SISTEMA';

// Distinção clara de tipos de evidência (Seção 10)
export type TipoEvidencia = 
  | 'Evidência Objetiva'
  | 'Declaração'
  | 'Hipótese'
  | 'Conclusão Validada';

export interface EvidenciaItem {
  id: string;
  descricao: string;
  tipo: TipoEvidencia;
  fonteOrigem: OrigemInformacao;
  documentoVinculadoId?: string;
  documentoVinculadoNome?: string;
  anexoNome?: string;
  dataRegistro: string;
  registradoPor: string;
  validadoPorResponsavel?: boolean;
  observacoes?: string;
}

// Nível qualitativo de suporte documental (Seção 6 - elimina números falsos de confiança)
export type NivelSuporteDocumental = 
  | 'Evidência forte'
  | 'Evidência moderada'
  | 'Evidência limitada'
  | 'Evidência insuficiente';

// Trilha de Auditoria e Rastreabilidade (Seção 8)
export type OrigemAlteracao = 
  | 'Alteração manual pelo usuário'
  | 'Gerada pela IA'
  | 'Importada de documento'
  | 'Modificada pelo usuário'
  | 'Aprovada'
  | 'Rejeitada'
  | 'Harmonização IA 5 Porquês'
  | 'Harmonização Total IA'
  | 'Regra do Sistema';

// Modelo de Decisão Estruturada para Sugestões da IA / Motor SGQ (Ponto 2)
export type StatusDecisaoSugestao = 'PENDENTE' | 'ACEITA' | 'EDITADA' | 'REJEITADA';

export interface SuggestionDecision {
  id: string;
  field: 'contencao' | 'cincoPorques' | 'ishikawa' | 'acaoCorretiva' | 'enquadramento' | 'titulo' | 'setor' | 'categoria' | string;
  fieldLabel: string;
  suggestedValue: any;
  finalValue: any;
  source: OrigemInformacao | string;
  status: StatusDecisaoSugestao;
  justificativa?: string;
  user: string;
  timestamp: string;
}

export interface RegistroAuditoriaNC {
  id?: string;
  dataHora?: string;
  data?: string; // alias for dataHora
  usuario: string;
  campoAlterado?: string;
  campoModificado?: string; // alias for campoAlterado
  valorAnterior: string;
  novoValor: string;
  origem?: OrigemAlteracao | string;
  tipoEvento?: 'CRIACAO' | 'EDICAO' | 'SUGESTAO_ACEITA' | 'SUGESTAO_EDITADA' | 'SUGESTAO_REJEITADA' | 'AVALIACAO_RISCO' | 'STATUS_CHANGE' | 'ENCERRAMENTO' | string;
  decisaoHumana?: 'Aceita' | 'Editada' | 'Rejeitada' | 'Rascunho';
  justificativa?: string;
  motivo?: string; // alias for justificativa
}

// Versão de documento para controle de configuração (Seção 3)
export interface VersaoDocumentoConfig {
  id: string;
  revisaoOuEmenda: string; // Ex: 'Emenda 07', 'Rev. 14'
  dataPublicacao?: string;
  inicioVigencia: string; // YYYY-MM-DD
  fimVigencia?: string; // YYYY-MM-DD
  fonte: string; // Ex: 'ANAC - Portal Oficial', 'SGQ Interno'
  status: StatusVigenciaDocumento;
  resumoAlteracoes?: string;
  arquivoNome?: string;
  arquivoTamanho?: string;
}

export interface PreAnaliseContencao {
  descricao: string;
  responsavel: string;
  dataLimite: string; // YYYY-MM-DD
  dataConclusao?: string;
  status: 'Pendente' | 'Concluída' | 'Não Aplicável';
  observacoes?: string;
  origem?: OrigemInformacao;
  validadoPorHumano?: boolean;
}

export interface AnaliseCausaRaiz {
  metodologia: '5 Porquês' | 'Ishikawa' | 'Texto Livre';
  cincoPorques: string[]; // Quantidade variável de porquês (Seção 9)
  explicacaoCausaSistemica?: string;
  ishikawa?: {
    metodo?: string;
    maquina?: string;
    maoDeObra?: string;
    material?: string;
    medicao?: string;
    meioAmbiente?: string;
  };
  detalhes: string;
  statusValidacao?: 'HIPÓTESE – REQUER VALIDAÇÃO HUMANA' | 'VALIDADA PELO RESPONSÁVEL' | 'REJEITADA';
  evidenciasSustentacao?: string[];
  evidenciasFaltantes?: string[];
  perguntasInvestigacao?: string[];
  nivelSuporteDocumental?: NivelSuporteDocumental;
  validadoPorResponsavel?: boolean;
  responsavelValidacao?: string;
  dataValidacao?: string;
  coerenciaAvaliada?: CoerenciaCausaRaizResultado;
}

// Diagnóstico de Coerência Causal dos 5 Porquês com a Conclusão & Ação Corretiva
export interface CoerenciaCausaRaizResultado {
  coerente: boolean;
  grauCoerencia: 'Alta' | 'Moderada' | 'Baixa' | 'Incoerente';
  scoreCoerencia: number; // 0 a 100
  diagnostico: string;
  analiseEncadeamento: Array<{
    nivel: number;
    titulo: string;
    texto: string;
    status: 'Conectado' | 'Salto Lógico' | 'Desconectado' | 'Causa Raiz Conclusiva';
    observacao: string;
  }>;
  saltosLogicosIdentificados: string[];
  conclusaoSugeridaCoerente: string;
  cincoPorquesSugeridosCoerentes: string[];
  acaoCorretivaSugeridaAlinhada: string;
  justificativaSistemica?: string;
  recomendacoesSGQ: string[];
  dataAvaliacao?: string;
  origemMotor?: string;
}

export interface AcaoCorretiva {
  descricao: string;
  comoSeraFeito?: string;
  responsavel: string;
  dataPrazo: string; // YYYY-MM-DD
  dataConclusao?: string;
  status: 'Não Iniciada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
  assinaturaResponsavel?: string;
  validadoPorHumano?: boolean;
}

export interface VerificacaoEficacia {
  metodo: MetodoVerificacaoEficacia;
  outroMetodoDetalhe?: string;
  avaliacaoRiscoResidual?: AvaliacaoRisco;
  encerrado: 'SIM' | 'NÃO' | 'Pendente';
  motivo?: string;
  dataVerificacao?: string;
  dataPrevista?: string; // Data prevista para comprovação da eficácia
  prazoEficacia?: string; // Data limite para auditoria de eficácia
  resultado?: 'EFICAZ' | 'INEFICAZ' | 'PENDENTE';
  auditorVerificador?: string;
  evidencias?: string;
  criterioAprovacao?: string;
}

export interface HistoricoPrazo {
  id: string;
  dataAnterior: string;
  novaData: string;
  motivo: string;
  usuario: string;
  alteradoEm: string;
}

// Vínculo normativo com controle de configuração (Seção 3)
export interface DocumentoNormativoAplicavel {
  manualOuRegulamentoId?: string;
  codigo: string; // Ex: 'RBAC 145', 'MOMQ'
  titulo?: string;
  revisaoOuEmenda: string; // Ex: 'Emenda 07'
  tipo: TipoDocumento;
  fonte: string; // Ex: 'ANAC Oficial', 'SGQ Interno'
  statusVigenciaNaData: StatusVigenciaDocumento;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  capituloOuItem?: string; // Ex: '145.109' ou '3.4.3'
  tituloRequisito?: string;
  trechoRequisito?: string;
  localizadoNaBase: boolean; // Se false -> "Requisito não localizado na base documental."
}

// ----------------------------------------------------
// ANÁLISE E SUGESTÃO DO SETOR RESPONSÁVEL (SEÇÃO 6)
// ----------------------------------------------------
export interface AnaliseSetorResponsavel {
  setorSugerido: string;
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE';
  justificativa: string;
  setoresCandidatos?: Array<{ setor: string; relevancia: string; justificativa?: string }>;
  origem: 'ANALISE_HEURISTICA_HISTORICO' | 'IA_GEMINI_ANALYSIS' | 'CONHECIMENTO_SGQ' | 'FALLBACK_DETERMINISTICO';
  dataHora: string;
  requerAtencaoDivergencia?: boolean;
  setorInformado?: string;
  decisaoFinal?: string;
  usuarioDecisor?: string;
  dataHoraDecisao?: string;
  statusDecisao?: 'ACEITA' | 'DIVERGENTE_MANTIDA' | 'ALTERADA_MANUALMENTE' | 'PENDENTE';
  justificativaDivergencia?: string;
}

export interface NCRecord {
  id: string;
  // Cabeçalho Oficial (F 001-29)
  codigoFormulario: string; // Ex: 'F 001-29'
  revisao: string; // Ex: '00'
  dataEmissaoFormulario: string; // Ex: '02/09/2025'
  numeroNC: string; // Ex: '05' ou 'NC-05'
  titulo: string; // Ex: 'Pré Auditoria FAA'
  tipoAcao: TipoAcao;

  // 1. Descrição e Detalhes
  descricaoNC: string;
  normaReferencia: string; // Ex: 'MOMQ 3.4.3', 'ISO 9001:2015 7.1.5', 'RBAC 145'
  documentoNormativoAplicavel?: DocumentoNormativoAplicavel;
  versaoDocumentoId?: string; // ID da versão do documento normativo aplicável na data da ocorrência
  setor: string; // Ex: 'REC - Calibração', 'Manutenção de Linha', 'Qualidade'
  categoria: string; // Ex: 'Calibração e Metrologia', 'Controle Documental', etc.
  responsavel?: string; // Responsável Geral pela Não Conformidade / Tratativa
  avaliacaoRiscoInicial: AvaliacaoRisco;
  prazoResposta: string; // YYYY-MM-DD (Prazo de Resposta da NC)
  dataIdentificacao: string; // YYYY-MM-DD
  auditor: string; // Ex: 'Paulo Okubo'

  // Evidências e Declarações Estruturadas
  evidenciasObjetivas?: EvidenciaItem[];

  // 2. Pré-Análise da Causa e Ação de Contenção
  preAnaliseContencao: PreAnaliseContencao;

  // 3. Análise da Causa Raiz
  analiseCausaRaiz: AnaliseCausaRaiz;

  // 4. Ação Corretiva
  acaoCorretiva: AcaoCorretiva;

  // 6. Verificação da Eficácia
  verificacaoEficacia: VerificacaoEficacia;

  // Metadados do Sistema e Rastreabilidade
  statusGeral: StatusGeralNC;
  criadoEm: string;
  atualizadoEm: string;
  historicoPrazos: HistoricoPrazo[];
  trilhaAuditoria?: RegistroAuditoriaNC[];
  decisoesSugestoes?: SuggestionDecision[]; // Registro de decisões humanas sobre sugestões (Ponto 2 e 3)
  tags?: string[];
  documentoOrigemNome?: string;
  aprovadoPor?: string;
  dataAprovacao?: string;
  justificativaFechamento?: string;
  dataEncerramento?: string; // Data formal de encerramento da NC (YYYY-MM-DD)
  dataConclusaoTratamento?: string; // Data da conclusão das ações corretivas (YYYY-MM-DD)
  prazoEficacia?: string; // Data limite / prevista para análise ou comprovação de eficácia (YYYY-MM-DD)
  dataLimiteTratamento?: string; // Sinônimo do prazoResposta da tratativa (YYYY-MM-DD)
  prioridadeInteligente?: PrioridadeInteligente;
  explicacoesIA?: Record<string, ExplicacaoIAItem>;
  analiseSetor?: AnaliseSetorResponsavel;
  origemAuditoriaExterna?: VinculoAuditoriaExterna;
  origemRequisitoCliente?: VinculoRequisitoCliente;
  origemImpactoMro?: VinculoImpactoMro;
}

export * from './types/impactoMro';

export interface VinculoRequisitoCliente {
  clienteId: string;
  clienteNome: string;
  programaId: string;
  programaCodigo: string;
  requisitoId: string;
  numeroItem: string;
  baseId?: string;
  baseCodigo?: string;
  dataVinculo: string;
}

// ----------------------------------------------------
// GOVERNANÇA ONTOLÓGICA DA INFORMAÇÃO SGQ (FASE 5)
// ----------------------------------------------------
export type OntologicalClassification = 
  | 'FACT'               // Fato documental / evidência objetiva comprovada
  | 'USER_RESPONSE'      // Resposta factual do executor / técnico de campo
  | 'AI_SUGGESTION'      // Hipótese preliminar gerada por IA / motor
  | 'INFERENCE'          // Síntese / correlação derivada sob análise
  | 'VALIDATED_KNOWLEDGE';// Padrão formalmente homologado pelo SGQ

// ----------------------------------------------------
// PRIORIZAÇÃO INTELIGENTE EXPLICÁVEL (FASE 5)
// ----------------------------------------------------
export type NivelPrioridadeInteligente = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';

export interface FatoresPrioridade {
  riscoScore: number;         // 1 a 20 (baseado na matriz 5x5)
  atrasoDias: number;         // Dias de vencimento (positivo = atrasado)
  recorrenciaScore: number;   // 0 a 10 (baseado em histórico no setor/categoria)
  impactoScore: number;       // 1 a 10 (impacto operacional / aeronavegabilidade)
  pendenciaEficacia: boolean; // Se está aguardando verificação de eficácia
}

export interface PrioridadeInteligente {
  nivel: NivelPrioridadeInteligente;
  scoreGeral: number; // 0 a 100
  justificativaExplicavel: string;
  fatores: FatoresPrioridade;
  calculadoEm: string;
}

// ----------------------------------------------------
// PAINEL DE SAÚDE E ÍNDICE DE INTEGRIDADE DO SGQ (FASE 5)
// ----------------------------------------------------
export type CategoriaSaudeSGQ = 'RNC' | 'CONHECIMENTO' | 'DOCUMENTACAO' | 'GOVERNANCA' | 'SEGURANCA';
export type SeveridadeSaudeSGQ = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';
export type StatusIntegridadeSGQ = 'BOM' | 'ATENCAO' | 'CRITICO';

export interface ItemSaudeSGQ {
  id: string;
  categoria: CategoriaSaudeSGQ;
  severidade: SeveridadeSaudeSGQ;
  titulo: string;
  descricao: string;
  targetId?: string;
  targetNumeroNC?: string;
  targetType?: 'RNC' | 'MANUAL' | 'KNOWLEDGE' | 'USER' | 'AUDIT';
  acaoSugerida: string;
  resolvido?: boolean;
}

export interface RelatorioSaudeSGQ {
  scoreIntegridade: number; // 0 a 100%
  statusIntegridade: StatusIntegridadeSGQ;
  breakdown: {
    rnc: number;          // 0 a 100%
    conhecimento: number; // 0 a 100%
    documentacao: number; // 0 a 100%
    governanca: number;   // 0 a 100%
    seguranca: number;    // 0 a 100%
  };
  totalItensCriticos: number;
  totalItensAlerta: number;
  totalItensNormais: number;
  itens: ItemSaudeSGQ[];
  geradoEm: string;
}

// ----------------------------------------------------
// EXPLICABILIDADE DA IA ("Por que o QualiGest sugeriu isso?")
// ----------------------------------------------------
export interface ExplicacaoIAItem {
  campoId: string;
  tituloCampo: string;
  oQueFoiSugerido: string;
  porQueFoiSugerido: string;
  evidenciasConsideradas: string[];
  rncsSemelhantesConsultadas: string[];
  padroesConhecimentoUtilizados: string[];
  nivelConfianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  ontologia: OntologicalClassification;
  modeloOuMotor: string;
  geradoEm: string;
}

// ----------------------------------------------------
// MODO AUDITORIA TÉCNICA DO QUALIGEST (FASE 5)
// ----------------------------------------------------
export type CategoriaAuditoriaTecnica = 'SEGURANCA' | 'INTEGRIDADE_DADOS' | 'GOVERNANCA' | 'IA_FALLBACK' | 'AUDIT_TRAIL';

export interface ItemAuditoriaTecnica {
  id: string;
  categoria: CategoriaAuditoriaTecnica;
  nome: string;
  status: 'OK' | 'ATENCAO' | 'CRITICO';
  detalhe: string;
  evidencias: string[];
  recomendacao?: string;
}

export interface RelatorioAuditoriaTecnica {
  checks: ItemAuditoriaTecnica[];
  totalOk: number;
  totalAtencao: number;
  totalCritico: number;
  statusGeral: 'CONFORME' | 'REQUER_ATENCAO' | 'NAO_CONFORME';
  scoreConformidade: number; // 0 a 100%
  executadoEm: string;
  auditorEmail: string;
}

export interface AlertaItem {
  id: string;
  ncId: string;
  numeroNC: string;
  titulo: string;
  tipoAlerta: 'VENCIDA' | 'VENCE_HOJE' | 'VENCE_7_DIAS' | 'VENCE_15_DIAS' | 'AGUARDANDO_EFICACIA' | 'EFICACIA_VENCIDA' | 'EFICACIA_PROXIMA' | 'RISCO_CRITICO';
  diasRestantes: number;
  prazo: string;
  responsavel: string;
  auditor: string;
  nivelRisco: NivelRisco;
  mensagem: string;
  subtipoPrazo?: 'TRATAMENTO' | 'EFICACIA' | 'ENCERRAMENTO';
  prazoEficacia?: string;
  dataEncerramento?: string;
}

export interface FiltrosNC {
  busca: string;
  status: string;
  nivelRisco: string;
  setor: string;
  categoria: string;
  tipoAcao: string;
  periodo: string;
  apenasAlertas: boolean;
  tipoDocumento?: string;
}

export type StatusManual = 'Vigente' | 'Em Revisão' | 'Obsoleto' | 'Vigência não verificada' | 'Vigência não determinada — requer validação humana';

export interface ManualCapitulo {
  id: string;
  numero: string; // Ex: '3.4.3' ou '7.1.5'
  titulo: string; // Ex: 'Controle de Ferramental e Metrologia'
  requisitoTexto: string; // Conteúdo normativo / regras mandatórias
  palavrasChave?: string[];
  fonteOficial?: string;
}

export interface ManualRecord {
  id: string;
  codigo: string; // Ex: 'MOMQ', 'MGQ', 'MOE', 'SGSO', 'RBAC 145', 'ISO 9001'
  titulo: string; // Ex: 'Manual da Organização de Manutenção da Qualidade'
  revisao: string; // Ex: 'Rev. 14' ou 'Emenda 07'
  tipoDocumento?: TipoDocumento;
  dataEmissao?: string;
  dataVigencia: string; // YYYY-MM-DD (Início de vigência)
  dataFimVigencia?: string; // YYYY-MM-DD (Fim de vigência, se obsoleto)
  dataVencimentoRevisao?: string;
  orgaoRegulador?: string; // Ex: 'ANAC', 'FAA', 'ISO', 'SGQ Interno'
  fonte: string; // Ex: 'Portal ANAC / DOU', 'Repositório SGQ Interno'
  setoresAplicaveis: string[];
  descricaoResumo: string;
  conteudoTexto: string; // Conteúdo textual ou capítulos indexados
  arquivoTextoCompleto?: string;
  arquivoBase64?: string;
  arquivoMimeType?: string;
  arquivoNome?: string;
  arquivoTamanho?: string;
  capitulos?: ManualCapitulo[];
  versoesConfiguracao?: VersaoDocumentoConfig[]; // Controle de configuração de versões (Seção 3)
  status: StatusManual;
  criadoEm: string;
  atualizadoEm: string;
  historicoAlteracoes?: Array<{
    versao: string;
    data: string;
    autor: string;
    descricao: string;
  }>;
}

export interface ConsultaManualResposta {
  pergunta: string;
  resposta: string;
  manualConsultado: string;
  revisaoConsultada: string;
  citacoes: Array<{
    capitulo: string;
    titulo: string;
    trecho: string;
    fonteDoc?: string;
  }>;
  recomendacoesAuditoria?: string[];
  nivelSuporteDocumental: NivelSuporteDocumental;
  justificativaSuporte: string;
  dataConsulta: string;
  origemMotor: OrigemInformacao;
}

export type VereditoPertinencia = 
  | 'Procedente' 
  | 'Parcialmente Procedente' 
  | 'Não Procedente' 
  | 'Enquadramento Incorreto'
  | 'Inconclusivo';

// Estrutura rigorosa de auditoria de conformidade (Seção 11)
export interface ItemAuditoriaConformidade {
  requisitoNormativo: string;
  fonteDocumental: string;
  trechoReferencia: string;
  evidenciaEncontrada: string;
  avaliacaoTecnica: string;
  lacunaIdentificada: string;
  conclusao: string;
  localizadoNaBase: boolean;
}

export interface AuditoriaPertinenciaResultado {
  ncId: string;
  veredicto: VereditoPertinencia;
  nivelSuporteDocumental: NivelSuporteDocumental; // Substitui percentual falso por categoria qualitativa
  justificativaNivelSuporte: string;
  resumoVeredito: string;
  origemMotor: OrigemInformacao; // 'IA GEMINI' | 'MOTOR DETERMINÍSTICO'
  
  // Trilha estruturada de auditoria (Seção 11)
  trilhaAuditoriaConformidade?: ItemAuditoriaConformidade[];

  validacaoRevisao: {
    manualCitado: string;
    revisaoCitada?: string;
    revisaoVigenteCadastrada?: string;
    revisaoAplicavelNaData?: string; // Versão aplicável na data da ocorrência (Ponto 6)
    dataReferenciaUtilizada?: string;
    statusRevisao: StatusManual | 'Desatualizada / Incorreta' | 'Não Cadastrada no Banco' | 'Vigência não verificada' | 'Vigência não determinada — requer validação humana';
    observacaoRevisao: string;
    fonteVerificacao?: string;
  };
  enquadramentoRecomendado: {
    manualCorreto: string;
    capituloItemCorreto: string;
    tituloRequisito: string;
    trechoNormativoRelevante: string;
    localizadoNaBase: boolean;
  };
  analiseCritica: string;
  justificativaTecnica: string;
  evidenciasExigidas: string[];
  evidenciasFaltantes?: string[];
  perguntasInvestigacao?: string[];
  ajustesSugeridos: {
    normaReferenciaSugerida?: string;
    tituloSugerido?: string;
    tipoAcaoSugerido?: TipoAcao;
    riscoSugerido?: AvaliacaoRisco;
    acaoContencaoSugerida?: string;
    planoAcaoSugerido?: string;
  };
  manuaisConsultados: string[];
  dataAnalise: string;
}

// ----------------------------------------------------
// FASE 11: INFRAESTRUTURA DE ORGANIZAÇÕES, USUÁRIOS, PERFIS E PERMISSÕES
// ----------------------------------------------------

export type UserRole = 
  | 'ADMIN' 
  | 'ADMINISTRADOR'
  | 'GESTOR_SGQ' 
  | 'QUALIDADE' 
  | 'AUDITOR' 
  | 'MANUTENCAO' 
  | 'TREINAMENTO' 
  | 'CONSULTA';

export type UserStatus = 'ATIVO' | 'INATIVO' | 'PENDENTE' | 'BLOQUEADO' | 'ACTIVE' | 'INACTIVE';

export type StatusConviteUsuario = 'PENDENTE' | 'ACEITO' | 'CANCELADO' | 'EXPIRADO';

export interface UserInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  nome?: string;
  role: UserRole;
  setor?: string;
  code: string; // Código de convite curto legível (ex: IMP-7294)
  status: StatusConviteUsuario;
  createdByUid: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  acceptedByUid?: string;
  notas?: string;
}

export type ModuloSistema = 
  | 'DASHBOARD'
  | 'RNC'
  | 'AUDITORIAS'
  | 'DOCUMENTOS'
  | 'TREINAMENTOS'
  | 'USUARIOS'
  | 'CONFIGURACOES';

export type AcaoPermissao = 
  | 'visualizar'
  | 'criar'
  | 'editar'
  | 'excluir'
  | 'aprovar'
  | 'encerrar'
  | 'revisar'
  | 'cadastrar'
  | 'inativar';

export interface ItemPermissaoModulo {
  modulo: ModuloSistema;
  nomeModulo: string;
  acoesPermitidas: AcaoPermissao[];
}

export type MapaPermissoesPerfil = Record<UserRole, Record<ModuloSistema, AcaoPermissao[]>>;

export interface OrganizationSLAConfig {
  p1Horas: number; // Crítico - SLA interno de contenção/tratativa (ex: 24h)
  p2Horas: number; // Alto (ex: 72h)
  p3Dias: number;  // Médio (ex: 15 dias)
  p4Dias: number;  // Baixo (ex: 30 dias)
}

export interface OrganizationChecklistConfig {
  organizacaoConfigurada: boolean;
  identidadeVisualConfigurada: boolean;
  setoresCadastrados: boolean;
  usuariosCadastrados: boolean;
  responsaveisDefinidos: boolean;
  parametrosRevisados: boolean;
  primeiroManualInserido: boolean;
  primeiroRNCCadastrado: boolean;
  equipeOrientada: boolean;
}

export interface OrganizationConfiguration {
  setores: string[];
  categorias: string[];
  slasInternos: OrganizationSLAConfig;
  identidadeVisual: {
    logoUrl?: string;
    corPrimaria?: string;
    siglaAeronautica?: string;
    nomeExibicaoCurto?: string;
  };
  parametrosApresentacao?: {
    rodapePersonalizado?: string;
    responsavelQualidadePadrao?: string;
    cargoResponsavelPadrao?: string;
  };
  checklistConfiguracao?: OrganizationChecklistConfig;
}

export interface OrganizationRecord {
  id: string; // Ex: 'org_impacto_aviation' ou 'org_abc_mro'
  name: string; // Ex: 'Impacto Aviation MRO' ou 'ABC Aviation Maintenance'
  legalName?: string; // Razão social
  logoUrl?: string;
  language?: string; // Ex: 'pt-BR', 'en-US'
  timezone?: string; // Ex: 'America/Sao_Paulo'
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  createdByUserUid?: string;
  createdByUserEmail?: string;
  configuration?: OrganizationConfiguration;
  isDemoTenant?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string; // ID da organização à qual o usuário pertence
  sectorId?: string;
  setor?: string; // Setor do usuário (ex: 'Qualidade', 'Manutenção')
  status: UserStatus;
  createdAt: string; // ISO string ou Timestamp serializado
  updatedAt: string;
  lastLoginAt?: string;
  createdByUid?: string;
  createdByEmail?: string;
  invitationId?: string;
}

export interface SystemDiagnosticRecord {
  testId: string;
  createdByUid: string;
  createdByEmail: string;
  message: string;
  status: 'ATIVO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | string;
  lastModifiedByEmail?: string;
  lastModifiedByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAuditEntry {
  id: string;
  organizationId: string;
  entity: 'NON_CONFORMITY' | 'MANUAL' | 'USER' | 'ORGANIZATION' | 'RNC_COMPARISON' | 'VALIDATED_KNOWLEDGE' | 'PERSON' | 'COMPETENCY' | 'DOCUMENT_CONTROL' | string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'INACTIVATE' | 'REACTIVATE' | 'BOOTSTRAP' | 'STATUS_CHANGE' | 'VALIDATE_DECISION' | 'APPLY_TO_RNC' | 'PROMOTE_PATTERN' | string;
  changedAt: string;
  changedByUid: string;
  changedByEmail: string;
  details?: string;
  summary?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  origin?: string;
}

// ----------------------------------------------------
// MÓDULO: VALIDAÇÃO, COMPARAÇÃO E APRENDIZADO DE RNCS RESPONDIDAS
// ----------------------------------------------------

export type ClassificacaoDiferenca = 
  | 'CONVERGENTE'       // 🟢 A resposta é compatível com a análise anterior
  | 'COMPLEMENTAR'      // 🟡 O usuário acrescentou detalhes/melhorias
  | 'DIVERGENTE'        // 🟠 Resposta apresenta interpretação diferente (Prevalece resposta do usuário)
  | 'CONTRADITORIO'     // 🔴 Resposta contradiz diretamente
  | 'NAO_INFORMADO'     // ⚪ Informação não localizada no documento
  | 'NOVA_INFORMACAO';  // 🔵 Novo conhecimento que não existia na análise inicial

export type NivelConfianca = 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE';

export type MetodoIdentificacaoRNC = 
  | 'NUMERO_EXATO' 
  | 'CODIGO_SIMILAR' 
  | 'ANALISE_SEMANTICA' 
  | 'MANUAL_HUMANA';

export interface CorrespondenciaRNC {
  rncId?: string;
  numeroNC?: string;
  tituloNC?: string;
  confianca: number; // 0 a 100
  nivelConfianca: NivelConfianca;
  metodoIdentificacao: MetodoIdentificacaoRNC;
  multiplasOpcoes?: Array<{
    rncId: string;
    numeroNC: string;
    titulo: string;
    setor?: string;
    confianca: number;
    motivoSimilaridade: string;
  }>;
  duvidaMotivo?: string;
  confirmadoManualmente?: boolean;
}

export type CampoComparadoTipo =
  | 'identificacao'
  | 'descricao'
  | 'contencao'
  | 'causaRaiz'
  | 'cincoPorques'
  | 'ishikawa'
  | 'acaoCorretiva'
  | 'verificacaoEficacia'
  | 'risco'
  | 'normaReferencia';

export type DecisaoPrevalencia = 'ACEITAR_RESPOSTA_USUARIO' | 'MANTER_ORIGINAL' | 'MESCLAR_AMBOS' | 'EDITAR_MANUALMENTE';

export interface DecisaoValidacaoCampo {
  campoId: string;
  decisao: DecisaoPrevalencia;
  valorFinalAprovado: string;
  justificativa: string;
}

export interface ItemComparacaoCampo {
  campoId: CampoComparadoTipo;
  nomeCampo: string;
  valorOriginalQualiGest: string;
  valorRespostaUsuario: string;
  classificacao: ClassificacaoDiferenca;
  explicacaoAnalise: string;
  sugestaoPrevalencia: 'RESPOSTA_USUARIO' | 'ANALISE_ORIGINAL' | 'NECESSITA_REVISAO';
  decisaoHumana?: 'ACEITAR_RESPOSTA' | 'MANTER_ORIGINAL' | 'REVISAR_MANUALMENTE';
  valorFinalValidado?: string;
  justificativaDecisao?: string;
  validadoPor?: string;
  validadoEm?: string;
  tipoDiferenca?: 'SEMANTICA_EQUIVALENTE' | 'NOVO_FATO' | 'DISCORDANCIA_CAUSAL' | 'COMPLEMENTO_PLANO' | 'ERRO_ENQUADRAMENTO';
}

export type StatusComparacao =
  | 'PENDENTE_PROCESSAMENTO'
  | 'PENDENTE_VALIDACAO'
  | 'DUVIDA_ASSOCIACAO'
  | 'VALIDADO_COM_DIVERGENCIAS'
  | 'VALIDADO_CONVERGENTE'
  | 'REJEITADO'
  | 'APLICADO_NA_RNC'
  | 'PROMOVIDO_A_PADRAO';

export interface ComparacaoRNCRecord {
  id: string;
  documentoFonteId: string;
  nomeArquivoFonte: string;
  tipoArquivoFonte: 'DOCX' | 'PDF' | 'TXT' | 'TEXTO_COLADO';
  textoOriginalExtraido: string;
  tamanhoArquivo?: number;
  dataUpload: string;
  uploadedPorUid?: string;
  uploadedPorEmail?: string;
  
  // Associação com RNC do QualiGest
  rncIdAssociada?: string;
  numeroNCAssociada?: string;
  correspondencia: CorrespondenciaRNC;

  // Status do Fluxo
  statusGeral: StatusComparacao;

  // Comparação Campo a Campo
  camposComparados: ItemComparacaoCampo[];

  // Resumo Quantitativo
  resumoComparacao: {
    totalCampos: number;
    convergentes: number;
    complementares: number;
    divergentes: number;
    contraditorios: number;
    novasInformacoes: number;
    naoInformados: number;
    taxaConcordancia: number; // Percentual 0 a 100%
    principaisDivergencias: string[];
    principaisComplementos: string[];
  };

  // Proposta de Atualização da RNC
  propostaAtualizacaoRNC?: {
    descricaoNC?: string;
    setor?: string;
    normaReferencia?: string;
    preAnaliseContencao?: Partial<PreAnaliseContencao>;
    analiseCausaRaiz?: Partial<AnaliseCausaRaiz>;
    acaoCorretiva?: Partial<AcaoCorretiva>;
    verificacaoEficacia?: Partial<VerificacaoEficacia>;
    avaliacaoRiscoInicial?: Partial<AvaliacaoRisco>;
  };

  // Validação do Auditor
  auditorAprovadorEmail?: string;
  auditorAprovadorUid?: string;
  dataValidacaoAuditor?: string;
  parecerAuditorSGQ?: string;

  // Rastreabilidade e Versionamento
  aplicadaNaRNCEm?: string;
  aplicadaPorUsuario?: string;
  versaoGeradaRNC?: string;
  historicoDecisoes: any[];

  criadoEm: string;
  atualizadoEm: string;
}

// ----------------------------------------------------
// BASE DE CONHECIMENTO VALIDADA (PADRÕES DE SGQ / APRENDIZADO)
// ----------------------------------------------------

export type NivelMaturidadeConhecimento = 
  | 1 // Nível 1: Evidência (Resposta isolada do usuário)
  | 2 // Nível 2: Comparação (Diferença identificada pelo sistema)
  | 3 // Nível 3: Validação (Responsável humano validou)
  | 4 // Nível 4: Conhecimento Validado (Aprovado para reutilização no setor)
  | 5; // Nível 5: Padrão do SGQ (Recorrente e aprovado pela Gestão para influenciar IA)

export type StatusConhecimento = 'PROPOSTO' | 'EM_ANALISE_SGQ' | 'VALIDADO' | 'PADRAO_SGQ' | 'OBSOLETO' | 'ARQUIVADO';

export interface ValidatedKnowledgeRecord {
  id: string;
  tituloPadrao: string;
  categoria: string; // Ex: 'Metrologia & Calibração', 'Controle Documental', 'Motores'
  setor: string; // Ex: 'Oficina REC', 'Célula', 'Linha'
  contextoDesvio: string; // Situação fática ou sintoma comum
  
  // Causa Raiz Validada
  causaValidada: string;
  metodologiaRecomendada?: '5_PORQUES' | 'ISHIKAWA' | 'OUTRA';
  desdobramentoPorques?: string[];
  
  // Ações Corretivas Eficazes
  acoesCorretivasRecomendadas: string[];
  acoesContencaoRecomendadas?: string[];
  contencoesRecomendadas?: string[];
  normasAplicaveis?: string[];
  normaCapituloRef?: string; // Ex: 'MOMQ Cap. 3.4.3 - Calibração'

  // Governança e Maturidade
  nivelMaturidade: NivelMaturidadeConhecimento;
  status: StatusConhecimento;
  nivelConfianca?: 'ALTA' | 'MEDIA';
  
  // Rastreabilidade e Evidências
  rncsOrigemIds?: string[]; // IDs das RNCs que originaram o padrão
  rncsOrigemNumeros?: string[]; // Ex: ['NC-001', 'NC-007', 'NC-014']
  documentosFonteOrigem?: string[];
  frequenciaObservada?: number;
  quantidadeOcorrencias?: number;
  taxaSucessoEficacia?: number; // Percentual de RNCs com esse padrão que tiveram eficácia SIM
  
  primeiraOcorrenciaEm?: string;
  ultimaOcorrenciaEm?: string;
  criadoPorUid?: string;
  criadoPorEmail?: string;
  validadoPorGestor?: string;
  validadoPorUid?: string;
  validadoPorEmail?: string;
  dataValidacao?: string;
  justificativaConhecimento?: string;
  justificativaSGQ?: string;

  criadoEm: string;
  atualizadoEm: string;
}

export interface MetricasDesempenhoIA {
  totalAnalisesComparadas: number;
  taxaConcordanciaGeral: number;
  taxaDivergenciaGeral: number;
  taxaComplementacaoGeral: number;
  taxaRejeicaoGeral: number;
  sugestoesAceitas: number;
  sugestoesEditadas: number;
  sugestoesRejeitadas: number;
  breakdownPorSetor: Record<string, { total: number; concordancia: number; divergencia: number; complementacao: number }>;
  breakdownPorCategoria: Record<string, { total: number; concordancia: number; divergencia: number; complementacao: number }>;
  principaisCausasDivergentes: Array<{ campo: string; frequencia: number; descricao: string }>;
  principaisPadroesIdentificados: Array<{ titulo: string; ocorrencias: number; setor: string }>;
}

export type ConhecimentoValidadoItem = ValidatedKnowledgeRecord;

// ----------------------------------------------------
// GERADOR DE APRESENTAÇÃO GERENCIAL DA QUALIDADE (FASE 6.1)
// ----------------------------------------------------
export type PeriodoApresentacao = 
  | 'TODOS' 
  | 'ULTIMOS_30_DIAS' 
  | 'ULTIMOS_90_DIAS' 
  | 'ANO_ATUAL' 
  | 'PERSONALIZADO';

export type TipoApresentacao = 'COMPLETA' | 'EXECUTIVA';

export interface FiltrosApresentacao {
  periodo: PeriodoApresentacao;
  dataInicio?: string;
  dataFim?: string;
  setor?: string;
  tipo: TipoApresentacao;
}

export interface SlideMetricaItem {
  rotulo: string;
  valor: string | number;
  subtitulo?: string;
  status?: 'normal' | 'alerta' | 'critico' | 'sucesso';
}

export type BlocoApresentacao = 
  | 'IDENTIDADE'
  | 'VISAO_EXECUTIVA'
  | 'GRAFICOS_DASHBOARD'
  | 'ECOSSISTEMA'
  | 'CAUSALIDADE'
  | 'PRIORIZACAO'
  | 'MATURIDADE_EVOLUCAO'
  | 'CONCLUSAO'
  | 'PESSOAS_COMPETENCIAS';

export type TipoVisualizacaoSlide = 
  | 'capa'
  | 'kpis'
  | 'grafico-barras'
  | 'grafico-pizza'
  | 'grafico-linhas'
  | 'matriz-risco'
  | 'tabela-executiva'
  | 'ecossistema'
  | 'regua-maturidade'
  | 'roadmap'
  | 'matriz-decisao'
  | 'conclusao'
  | 'rastreabilidade';

export interface SlideGraficoDadoItem {
  rotulo: string;
  valor: number;
  cor?: string;
  subtitulo?: string;
  percentual?: number;
}

export interface SlideGraficoDados {
  tipo: 'barras' | 'pizza' | 'linhas' | 'matriz-5x5' | 'ishikawa-6m' | 'ecossistema' | 'regua-maturidade' | 'roadmap' | 'nenhum';
  titulo?: string;
  unidade?: string;
  itens: SlideGraficoDadoItem[];
  matriz5x5?: {
    contagem: Record<string, number>;
    celulas?: MapaMatrizRisco5x5;
    totalCriticos: number;
    totalAltos: number;
    totalMedios: number;
    totalBaixos: number;
  };
  ishikawa?: {
    metodo: number;
    maoDeObra: number;
    maquina: number;
    material: number;
    meioAmbiente: number;
    medicao: number;
    total: number;
  };
  serieTemporal?: Array<{
    periodo: string;
    total: number;
    encerradas: number;
  }>;
}

export interface SlideApresentacao {
  id: number;
  numero: number;
  titulo: string;
  subtitulo: string;
  categoria: string;
  bloco?: BlocoApresentacao;
  tipoVisualizacao?: TipoVisualizacaoSlide;
  metricasPrincipais: SlideMetricaItem[];
  pontosChave: string[];
  tabelaDados?: {
    colunas: string[];
    linhas: (string | number)[][];
    destaques?: Record<number, string>;
  };
  graficoDados?: SlideGraficoDados;
  dadosGrafico?: {
    tipo: 'barras' | 'pizza' | 'linhas' | 'dispersao' | 'matriz';
    itens: any[];
    config?: Record<string, any>;
  };
  explicacaoGrafico?: {
    oQueMostra: string;
    porQueImportante: string;
    oQueGestaoIdentifica: string;
    dadosInsuficientes?: boolean;
  };
  blocoEvolucao?: boolean;
  imagemDestaque?: string;
  decisaoSugerida?: string;
  alertaOuNota?: string;
  semDados?: boolean;
  origemRastreabilidade: string;
}

// ----------------------------------------------------
// ESTABILIZAÇÃO GEOMÉTRICA E AUTO-FIT (FASE 12.3)
// ----------------------------------------------------
export interface BoundingBox {
  id: string;
  tipo: 'HEADER' | 'CARD_KPI' | 'GRAFICO' | 'TABELA' | 'TEXTO_ANALISE' | 'BANNER_SEM_DADOS' | 'FOOTER' | 'IMAGEM' | 'CONTAINER';
  x: number; // Em polegadas
  y: number; // Em polegadas
  w: number; // Largura em polegadas
  h: number; // Altura em polegadas
}

export interface SafeBounds {
  slideWidth: number;
  slideHeight: number;
  safeLeft: number;
  safeRight: number;
  safeTop: number;
  safeBottom: number;
  headerBottom: number;
  footerTop: number;
  guardMarginBottom: number;
}

export type TipoInfracaoGeometrica =
  | 'OVERFLOW_HORIZONTAL'
  | 'OVERFLOW_VERTICAL'
  | 'FORA_DA_SAFE_AREA'
  | 'SOBREPOSICAO'
  | 'COLISAO_RODAPE'
  | 'COLISAO_CABECALHO';

export interface InfracaoGeometrica {
  slideNumero: number;
  elementoId: string;
  tipoInfracao: TipoInfracaoGeometrica;
  detalhes: string;
  envelope: BoundingBox;
}

export type ClassificacaoDensidadeSlide = 'ADEQUADO' | 'ALTA_DENSIDADE' | 'OVERFLOW';

export interface ResultadoIntegridadeVisualSlide {
  slideId: number;
  numero: number;
  titulo: string;
  aprovado: boolean;
  scoreDensidade: number; // 0 a 100%
  classificacaoDensidade: ClassificacaoDensidadeSlide;
  margemInferiorRodape: number; // Em polegadas
  infracoes: InfracaoGeometrica[];
  elementosInspecionados: BoundingBox[];
}

export interface RelatorioIntegridadeVisual {
  aprovado: boolean;
  timestamp: string;
  totalSlidesAuditados: number;
  totalElementosAuditados: number;
  slidesComInfracao: number;
  infracoesDetectadas: InfracaoGeometrica[];
  densidadeGeral: ClassificacaoDensidadeSlide;
  margemSegurancaRodapeMinima: number;
  safeBoundsUtilizados: SafeBounds;
  detalhesPorSlide: ResultadoIntegridadeVisualSlide[];
}

export interface RelatorioCertificacaoIntegrada {
  homologado: boolean;
  timestamp: string;
  paridadeDados: {
    status: 'APROVADO' | 'REPROVADO';
    totalVerificacoesCruzadas: number;
    divergencias: string[];
  };
  integridadeVisual: {
    status: 'APROVADO' | 'REPROVADO';
    totalElementosAuditados: number;
    infracoes: InfracaoGeometrica[];
    densidadeGeral: ClassificacaoDensidadeSlide;
    margemSegurancaRodapeMinima: number;
  };
}

export interface RelatorioApresentacaoQualidade {
  geradoEm: string;
  versaoSistema: string;
  organizacao: string;
  responsavel: string;
  filtros: FiltrosApresentacao;
  resumoExecutivo: {
    periodoFormatado: string;
    totalRNCs: number;
    sgqHealthScore: number;
    riscosCriticos: number;
    acoesAtrasadas: number;
    recorrencias: number;
    principaisPontosAtencao: string[];
  };
  slides: SlideApresentacao[];
}

// ----------------------------------------------------
// ARQUITETURA FUNCIONAL E TÉCNICA REAL (FASE 6.1)
// ----------------------------------------------------
export interface ModuloArquitetura {
  id: string;
  nome: string;
  categoria: 'GESTAO_CORE' | 'INVESTIGACAO' | 'APRENDIZADO' | 'GOVERNANCA' | 'SEGURANCA' | 'SERVICOS_IA';
  finalidade: string;
  entradas: string[];
  processamento: string;
  saidas: string[];
  dependencias: string[];
  permissoesRBAC: string;
  colecoesFirestore: string[];
  mecanismoAuditoria: string;
  icone: string;
}

// ============================================================================
// FASE 8: GESTÃO DE AUDITORIAS EXTERNAS, CONSTATAÇÕES, RESPOSTAS E APRENDIZADO
// ============================================================================

export type TipoAuditoriaExterna = 
  | 'ANAC' 
  | 'EASA' 
  | 'FAA' 
  | 'Cliente' 
  | 'Certificação' 
  | 'Recorrente' 
  | 'Especial' 
  | 'Outra' 
  | string;

export type StatusAuditoriaExterna = 
  | 'RECEBIDA'
  | 'EM_ANALISE'
  | 'EM_RESPOSTA'
  | 'AGUARDANDO_EVIDENCIAS'
  | 'ENVIADA'
  | 'AGUARDANDO_ACEITACAO'
  | 'ACEITA'
  | 'COM_PENDENCIA'
  | 'ENCERRADA'
  | 'CANCELADA';

export type ClassificacaoConstatacao = 
  | 'MAIOR'
  | 'MENOR'
  | 'OBSERVACAO'
  | 'OPORTUNIDADE_MELHORIA';

export type StatusConstatacao = 
  | 'ABERTA'
  | 'EM_ANALISE'
  | 'RESPOSTA_ELABORADA'
  | 'ENVIADA'
  | 'ACEITA'
  | 'ACEITA_PARCIALMENTE'
  | 'REJEITADA'
  | 'COMPLEMENTO_SOLICITADO'
  | 'ENCERRADA';

export type TipoPrazoAuditoria = 
  | 'NORMATIVO'
  | 'CONTRATUAL'
  | 'INTERNO_SGQ'
  | 'DEFINIDO_AUDITOR';

export type TipoEvidenciaAuditoria = 
  | 'Documental'
  | 'Registro de Sistema'
  | 'Certificado de Calibração'
  | 'Ordem de Serviço (OS)'
  | 'Registro Fotográfico'
  | 'Treinamento / Certificação'
  | 'Procedimento Revisado'
  | 'Outro';

export interface EvidenciaAuditoriaItem {
  id: string;
  codigo: string;
  tipo: TipoEvidenciaAuditoria;
  descricao: string;
  documentoNome: string;
  documentoRevisao?: string;
  dataRegistro: string;
  responsavel: string;
  arquivoNome?: string;
  arquivoUrlOuHash?: string;
  statusValidacao: 'VALIDADA' | 'PENDENTE_VALIDACAO' | 'REJEITADA';
  observacoes?: string;
}

export interface RequisitoNormativoVinculado {
  norma: string; // Ex: 'ANAC RBAC 145', 'EASA Part-145', 'MOMQ'
  itemRequisito: string; // Ex: '145.109(a)'
  descricaoRequisito: string;
  comoImpactoImplementa: string; // Como a Impacto cumpre este requisito
  procedimentoInternoRef: string; // Ex: 'MOMQ Seção 3.4.2'
  revisaoProcedimento?: string;
}

export interface RespostaOficialConstatacao {
  id: string;
  versao: number;
  respostaFactual: string;
  analiseCausa: string;
  correcaoImediata: string;
  acaoCorretiva: string;
  acaoPreventiva?: string;
  responsavel: string;
  prazoExecucao: string;
  referenciasDocumentais: string[];
  evidenciasIds: string[];
  statusAprovacao: 'RASCUNHO' | 'SUGESTAO_IA' | 'REVISAO_INTERNA' | 'APROVADA_GESTOR' | 'ENVIADA_AO_AUDITOR';
  autorNome: string;
  aprovadorNome?: string;
  dataHoraAprovacao?: string;
  sugestaoOriginalIA?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  updatedAt?: string;
}

export interface RetornoAuditorExterno {
  id: string;
  dataRetorno: string;
  decisao: 'ACEITA' | 'REJEITADA' | 'ACEITA_PARCIALMENTE' | 'SOLICITACAO_COMPLEMENTO';
  auditorNome: string;
  parecerAuditor: string;
  documentoRetornoRef?: string;
  prazoComplementar?: string;
  registradoPor: string;
  dataRegistro: string;
}

export interface LicaoAprendidaAuditoria {
  id: string;
  auditId: string;
  findingId?: string;
  organizationId: string;
  origemTipo?: string;
  setor?: string;
  processosImpactados?: string[];
  titulo: string;
  oQueAconteceu: string;
  porQueAconteceu?: string;
  oQueFoiFeito?: string;
  oQueFuncionou?: string;
  oQueNaoFuncionou?: string;
  oQueFazerDiferente?: string;
  oQueDevemosFazerDiferente?: string;
  riscoRecorrencia?: 'BAIXO' | 'MEDIO' | 'ALTO';
  ondeAplicarConhecimento?: string[];
  ondeAplicar?: string;
  tags?: string[];
  statusValidacao?: string;
  candidataBaseConhecimento?: boolean;
  autorNome?: string;
  criadoEm?: string;
  updatedAt?: string;
  candidatoConhecimentoNivel?: number; // 1 a 5
  promovidoParaConhecimentoId?: string;
  criadoPor?: string;
  dataCriacao?: string;
}

export interface ConstatacaoExternaRecord {
  id: string;
  auditId: string;
  organizationId: string;
  numeroExterno: string; // Ex: 'FIND-001', 'NC-01/ANAC'
  classificacao: ClassificacaoConstatacao;
  descricaoOriginal: string; // Texto original do auditor externo (PRESERVADO INALTERADO)
  interpretacaoInterna?: string; // Interpretação técnica da organização
  requisitoNormativo: RequisitoNormativoVinculado;
  processoAuditado?: string;
  setorResponsavel: string;
  responsavelNome: string;
  nivelRisco: NivelRisco;
  prazoResposta: string; // YYYY-MM-DD
  tipoPrazo: TipoPrazoAuditoria;
  status: StatusConstatacao;
  respostaOficial?: RespostaOficialConstatacao;
  historicoRespostas?: RespostaOficialConstatacao[];
  evidencias: EvidenciaAuditoriaItem[];
  retornosAuditor: RetornoAuditorExterno[];
  rncInternaCriadaId?: string;
  numeroRNCInterna?: string;
  licaoAprendidaId?: string;
  trilhaAuditoria: RegistroAuditoriaNC[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditoriaExternaRecord {
  id: string;
  organizationId: string;
  numeroAuditoria: string; // Ex: 'AUD-2026-ANAC-01'
  tipo: TipoAuditoriaExterna;
  origem: string; // Ex: 'ANAC - Superintendência de Padrões Operacionais'
  entidadeAuditora: string; // Ex: 'Agência Nacional de Aviação Civil'
  auditoresNomes: string[];
  dataInicio: string;
  dataTermino: string;
  escopo: string;
  local: string;
  aeronaveOuProcesso?: string;
  contratoOuCliente?: string;
  referenciaExterna: string; // Ex: 'Ofício de Auditoria nº 042/2026'
  status: StatusAuditoriaExterna;
  responsavelInterno: string;
  observacoes?: string;
  documentosRecebidosNomes: string[];
  dataRecebimento: string;
  prazoGlobalResposta: string;
  dataEncerramento?: string;
  findingsCount: {
    total: number;
    maiores: number;
    menores: number;
    observacoes: number;
    abertas: number;
    respondidas: number;
    aceitas: number;
    rejeitadas: number;
  };
  createdAt: string;
  updatedAt: string;
  createdByUserUid: string;
}

export interface SimilaridadeConstatacaoItem {
  tipoSimilaridade: 
    | 'MESMO_PROBLEMA'
    | 'PROBLEMA_SEMELHANTE'
    | 'MESMA_CAUSA'
    | 'CAUSA_DIFERENTE'
    | 'MESMO_REQUISITO'
    | 'APENAS_SIMILARIDADE_TEXTUAL';
  scoreSimilaridade: number; // 0 a 100
  findingAnteriorId: string;
  numeroAuditoria: string;
  numeroFinding: string;
  descricao: string;
  requisito: string;
  respostaAnterior: string;
  evidenciasAceitas: string[];
  resultadoAuditor: string;
  justificativaSemelhanca: string;
}

export interface AuditoriaDashboardMetrics {
  totalAuditorias: number;
  auditoriasAbertas: number;
  auditoriasEncerradas: number;
  totalFindings: number;
  findingsAbertos: number;
  findingsVencidos: number;
  findingsRespondidos: number;
  findingsAceitos: number;
  findingsRejeitados: number;
  taxaAceitacao: number; // percentual 0 a 100
  prazoMedioRespostaDias: number;
  distribuicaoPorOrigem: Record<string, number>;
  distribuicaoPorSetor: Record<string, number>;
  distribuicaoPorRequisito: Record<string, number>;
  principaisCausas: Array<{ causa: string; total: number }>;
  reincidenciasDetectadas: number;
  semDados: boolean;

  // Aliases e propriedades para compatibilidade com AuditsDashboardView
  totalConstatacoes?: number;
  constatacoesAbertas?: number;
  constatacoesVencidas?: number;
  constatacoesNoPrazo?: number;
  constatacoesVencendoEm15Dias?: number;
  taxaAceitacaoPrimeiraSubmissao?: number | null;
  tempoMedioRespostaDias?: number | null;
  auditoriasPorTipo?: Record<string, number>;
  constatacoesPorClassificacao?: {
    MAIOR: number;
    MENOR: number;
    OBSERVACAO: number;
    OPORTUNIDADE_MELHORIA: number;
  };
  constatacoesPorSetor?: Record<string, number>;
}

// ============================================================================
// FASE 9: PESSOAS, COMPETÊNCIAS, TREINAMENTOS, QUALIFICAÇÕES E VENCIMENTOS
// ============================================================================

export type StatusColaborador = 
  | 'ATIVO' 
  | 'EM_TREINAMENTO'
  | 'RESTRITO' 
  | 'SUSPENSO' 
  | 'AFASTADO' 
  | 'DESLIGADO'
  | 'INATIVO' // Preservado para retrocompatibilidade histórica sem perda de dados
  | 'STATUS_NAO_INFORMADO' // Regra obrigatória: registros sem status no cadastro original
  | 'OUTRO';

export interface ItemRNCMatrizRisco {
  id: string;
  numero: string;
  titulo: string;
  setor?: string;
  status: string;
  severidade: string;
  probabilidade: string;
  nivel: NivelRisco;
}

export interface CelulaMatrizRisco5x5 {
  codigo: string; // Ex: '4C'
  severidade: string; // '1' a '5'
  probabilidade: string; // 'A' a 'E'
  nivel: NivelRisco; // 'Crítico' | 'Alto' | 'Médio' | 'Baixo'
  quantidade: number;
  rncs: ItemRNCMatrizRisco[];
}

export type MapaMatrizRisco5x5 = Record<string, CelulaMatrizRisco5x5>;

export interface ConsolidadoMatrizRisco5x5 {
  matriz: MapaMatrizRisco5x5;
  totalRNCsAvaliadas: number;
  totalSemAvaliacao: number;
  totalCriticos: number;
  totalAltos: number;
  totalMedios: number;
  totalBaixos: number;
  celulasComRNCs: CelulaMatrizRisco5x5[];
}

export type FuncaoOperacionalColaborador =
  | 'Mecânico'
  | 'Inspetor'
  | 'Técnico'
  | 'Supervisor'
  | 'Inspetor de Qualidade'
  | 'Técnico de Planejamento'
  | 'Almoxarife'
  | 'Especialista'
  | 'Instrutor'
  | string;

export interface RestricaoOperacional {
  possuiRestricao: boolean;
  motivo?: string;
  dataInicio?: string;
  dataFim?: string;
  impedeExecucao: boolean; // Se true: bloqueia atribuição/execução; se false: apenas alerta
  apenasAlerta: boolean;
  registradoPor?: string;
  registradoEm?: string;
}

export interface ColaboradorPessoa {
  id: string;
  organizationId: string;
  nome: string;
  matricula: string; // Código interno, ex: 'IMP-1042'
  setor: string; // Setor controlado pela organização
  baseOperacional?: string; // Ex: 'REC - Recife / Hub Central', 'SOD - Sorocaba'
  baseOperacionalId?: string; // Ex: 'base-rec-hub', 'BASE-SOD'
  funcao: FuncaoOperacionalColaborador;
  cargoOperacional?: string;
  status: StatusColaborador;
  statusCustomizado?: string; // Configuração organizacional adicional
  dataAdmissao?: string;
  contatoCorporativo?: string;
  observacoes?: string;
  restricaoOperacional?: RestricaoOperacional;
  inativadoEm?: string;
  inativadoPor?: string;
  motivoInativacao?: string;
  reativadoEm?: string;
  reativadoPor?: string;
  motivoReativacao?: string;
  camposCustomizados?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  criadoPor: string;
  criadoPorUid: string;
}

export type Person = ColaboradorPessoa;

export type CriticidadeCompetencia = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface NivelCompetenciaDefinicao {
  nivel: number; // 1 a 5
  nome: string; // Ex: 'Nível 1 — Conhecimento'
  descricao: string;
}

export interface CompetenciaItem {
  id: string;
  organizationId: string;
  codigo: string; // Ex: 'COMP-INS-01', 'COMP-SUP-01'
  nome: string; // Ex: 'Inspeção Visual de Célula', 'Recebimento de Materiais Aeronáuticos'
  descricao: string;
  setoresAplicaveis: string[];
  funcoesAplicaveis: string[];
  criticidade: CriticidadeCompetencia;
  niveisDefinidos: NivelCompetenciaDefinicao[];
  treinamentosRequeridosIds: string[]; // Cursos de treinamento que desenvolvem esta competência
  qualificacaoObrigatoria?: string;
  status: 'ATIVA' | 'INATIVA';
  createdAt: string;
  updatedAt: string;
  criadoPorUid?: string;
}

export type StatusCompetenciaColaborador =
  | 'NAO_QUALIFICADO'
  | 'EM_TREINAMENTO'
  | 'QUALIFICADO'
  | 'VENCENDO'
  | 'VENCIDO'
  | 'SUSPENSO'
  | 'BLOQUEADO';

export interface CompetenciaColaborador {
  id: string;
  organizationId: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorMatricula: string;
  setor: string;
  competenciaId: string;
  competenciaCodigo: string;
  competenciaNome: string;
  nivelAtual: number; // 1 a 5
  status: StatusCompetenciaColaborador;
  dataConcessao?: string;
  dataValidade?: string;
  qualificacaoVinculadaId?: string;
  evidenciasIds?: string[];
  responsavelValidacaoNome?: string;
  responsavelValidacaoUid?: string;
  dataValidacao?: string;
  observacoes?: string;
  restricoesEspecificas?: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoTreinamento =
  | 'INICIAL'
  | 'RECORRENTE'
  | 'RECICLAGEM'
  | 'OJT'
  | 'PRATICO'
  | 'TEORICO'
  | 'PROCEDIMENTAL'
  | 'SEGURANCA'
  | 'QUALIDADE'
  | 'AERONAUTICO'
  | 'FABRICANTE'
  | 'REGULATORIO';

export type ModalidadeTreinamento = 'PRESENCIAL' | 'EAD' | 'HIBRIDO' | 'ON_THE_JOB';

export type OrigemPrazoValidade =
  | 'REGULAMENTO' // Regulamento ANAC/EASA
  | 'PROGRAMA_TREINAMENTO' // Manual de Treinamento da Organização
  | 'INTERNO_SGQ' // Procedimento SGQ interno
  | 'CLIENTE_FABRICANTE'; // Requisito de fabricante ou cliente

export interface CursoTreinamento {
  id: string;
  organizationId: string;
  codigo: string; // Ex: 'TRN-EWIS-01', 'TRN-FTS-02'
  titulo: string; // Ex: 'EWIS - Electrical Wiring Interconnection System'
  tipo: TipoTreinamento;
  modalidade: ModalidadeTreinamento;
  cargaHorariaHoras: number;
  ementa: string;
  recorrente: boolean;
  periodicidadeMeses?: number; // Ex: 24 meses
  origemPrazo: OrigemPrazoValidade;
  toleranciaDias?: number; // Janela de tolerância operacional
  competenciasDesenvolvidasIds: string[];
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
  updatedAt: string;
  criadoPorUid?: string;
}

export type ResultadoTreinamento = 'APROVADO' | 'REPROVADO' | 'PARTICIPOU' | 'EM_ANDAMENTO';

export interface RegistroTreinamentoColaborador {
  id: string;
  organizationId: string;
  treinamentoId: string;
  treinamentoCodigo: string;
  treinamentoTitulo: string;
  treinamentoNome?: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorMatricula: string;
  dataRealizacao: string; // YYYY-MM-DD
  dataConclusao?: string;
  dataValidade?: string; // YYYY-MM-DD
  cargaHoraria: number;
  instrutor: string;
  entidadeInstrutora?: string;
  resultado: ResultadoTreinamento;
  aproveitamentoPercentual?: number; // 0 a 100
  documentoCertificadoId?: string;
  numeroCertificado?: string;
  observacoes?: string;
  validadoPorSGQUid?: string;
  validadoPorSGQNome?: string;
  dataValidacaoSGQ?: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoQualificacao =
  | 'CHT_ANAC'
  | 'AUTORIZACAO_INTERNA'
  | 'QUALIFICACAO_NDT'
  | 'INSPETOR_RII'
  | 'HABILITACAO_EMPRESA'
  | 'CERTIFICACAO_FABRICANTE'
  | 'OUTRA';

export type StatusQualificacao =
  | 'VALIDA'
  | 'VENCENDO'
  | 'VENCIDA'
  | 'SUSPENSA'
  | 'REVOGADA';

export interface QualificacaoColaborador {
  id: string;
  organizationId: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorMatricula: string;
  tipo: TipoQualificacao;
  titulo: string; // Ex: 'CHT ANAC - Célula e GMP', 'Autorização RTS (Return to Service)'
  escopo: string; // Ex: 'Aeronaves Cessna 208 Caravan, Beechcraft King Air B200'
  competenciaRelacionadaId?: string;
  emissor: string; // Ex: 'ANAC', 'Impacto Aviation MRO - Diretoria Técnica'
  numeroRegistro: string; // Ex: 'CANAC 145892', 'AUT-IMP-2026-04'
  dataEmissao: string;
  dataValidade?: string;
  possuiValidade: boolean;
  status: StatusQualificacao;
  limitacoesOperacionais?: string;
  bloqueiaOperacaoSeVencida: boolean; // IMPEDE EXECUÇÃO vs APENAS ALERTA
  documentoComprobatorioId?: string;
  documentoComprobatorioNome?: string;
  responsavelValidacaoUid: string;
  responsavelValidacaoNome: string;
  dataValidacao: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TipoDocumentoPessoa =
  | 'CERTIFICADO'
  | 'CHT'
  | 'HABILITACAO'
  | 'DECLARACAO'
  | 'AVALIACAO_PRATICA'
  | 'FICHA_OJT'
  | 'AUTORIZACAO_INTERNA'
  | 'EXAME_MEDICO_AERONAUTICO'
  | 'OUTRO';

export type StatusValidadeDocumento =
  | 'VALIDO'
  | 'VENCENDO_HOJE'
  | 'VENCENDO_7_DIAS'
  | 'VENCENDO_15_DIAS'
  | 'VENCENDO_30_DIAS'
  | 'VENCENDO_60_DIAS'
  | 'VENCENDO_90_DIAS'
  | 'VENCIDO'
  | 'SEM_VALIDADE';

export interface DocumentoEvidenciaPessoa {
  id: string;
  organizationId: string;
  colaboradorId: string;
  colaboradorNome: string;
  tipoDocumento: TipoDocumentoPessoa;
  titulo: string;
  numeroDocumento?: string;
  emissor: string;
  dataEmissao: string;
  dataValidade?: string;
  possuiValidade: boolean;
  statusValidade: StatusValidadeDocumento;
  referenciaArquivoOuLink?: string;
  hashArquivo?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  registradoPorUid?: string;
}

export interface AtividadeCompetenciaRequerida {
  id: string;
  organizationId: string;
  codigoAtividade: string; // Ex: 'ATV-REC-01', 'ATV-INSP-RII'
  nomeAtividade: string;
  setor: string;
  criticidade: 'NORMAL' | 'CRITICA_SEGURANCA' | 'MANDATORIA_ANAC';
  competenciasExigidas: Array<{
    competenciaId: string;
    competenciaNome: string;
    nivelMinimo: number;
  }>;
  qualificacoesExigidasTipos?: TipoQualificacao[];
  treinamentosMandatoriosIds?: string[];
  impedeExecucaoSemQualificacao: boolean;
  status: 'ATIVA' | 'INATIVA';
  createdAt: string;
  updatedAt: string;
}

export type TipoGapCompetencia =
  | 'COMPETENCIA_AUSENTE'
  | 'NIVEL_INSUFICIENTE'
  | 'QUALIFICACAO_VENCIDA'
  | 'TREINAMENTO_VENCIDO'
  | 'DOCUMENTO_AUSENTE'
  | 'DOCUMENTO_EXPIRADO'
  | 'RESTRICAO_ATIVA';

export interface GapCompetenciaItem {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorMatricula: string;
  setor: string;
  funcao: string;
  competenciaId?: string;
  competenciaNome?: string;
  tipoGap: TipoGapCompetencia;
  descricaoGap: string;
  nivelRequerido?: number;
  nivelAtual?: number;
  treinamentoSugeridoId?: string;
  treinamentoSugeridoTitulo?: string;
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  bloqueiaOperacao: boolean;
  dataIdentificacao: string;
}

export interface SugestaoIACompetencia {
  id: string;
  organizationId: string;
  tipo:
    | 'SUGESTAO_GAP'
    | 'SUGESTAO_TREINAMENTO'
    | 'CORRELACAO_RNC_COMPETENCIA'
    | 'CORRELACAO_FINDING_COMPETENCIA'
    | 'ANALISE_DESCRICAO_FUNCAO';
  titulo: string;
  hipoteseSugestao: string;
  justificativa: string;
  fonteAnalise: string; // RNC #001-29, Finding ANAC, Procedimento MOMQ, etc.
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  entidadeAlvoTipo: 'COLABORADOR' | 'RNC' | 'FINDING' | 'SETOR';
  entidadeAlvoId: string;
  entidadeAlvoNome?: string;
  decisaoHumana: 'PENDENTE' | 'ACEITA' | 'REJEITADA' | 'EDITADA';
  usuarioAvaliadorEmail?: string;
  dataAvaliacao?: string;
  observacoesDecisao?: string;
  createdAt: string;
}

export interface FaixaVencimentoItem {
  id: string;
  tipoItem: 'QUALIFICACAO' | 'TREINAMENTO' | 'DOCUMENTO' | 'COMPETENCIA' | 'FERRAMENTA' | 'RNC' | 'MANUAL';
  colaboradorId?: string;
  colaboradorNome: string;
  colaboradorMatricula?: string;
  setor: string;
  titulo: string;
  subtitulo?: string;
  dataValidade: string;
  diasParaVencer: number; // negativo se vencido
  faixa: 'VENCIDO' | 'HOJE' | '7_DIAS' | '15_DIAS' | '30_DIAS' | '60_DIAS' | '90_DIAS' | 'FUTURO';
  bloqueiaOperacao: boolean;
  status: string;
  documentoId?: string;
  entidadeOriginalId?: string;
  categoriaOrigem?: 'PESSOAS' | 'METROLOGIA' | 'DOCUMENTOS' | 'RNC';
}

export interface CompetenciasDashboardMetrics {
  totalColaboradores: number;
  colaboradoresAtivos: number;
  colaboradoresInativos: number;
  colaboradoresComRestricao: number;
  colaboradoresSuspensos?: number;
  colaboradoresAfastados?: number;
  colaboradoresRestritos?: number;
  colaboradoresDesligados?: number;
  colaboradoresEmTreinamento?: number;
  colaboradoresStatusNaoInformado?: number;
  colaboradoresOutros?: number;
  distribuicaoPorStatus?: Record<StatusColaborador, number> | Record<string, number>;
  totalCompetencias: number;
  taxaColaboradoresQualificados: number; // 0 a 100
  taxaTreinamentosEmDia: number; // 0 a 100
  vencidosTotal: number;
  vencendoHoje: number;
  vencendo7Dias: number;
  vencendo15Dias: number;
  vencendo30Dias: number;
  vencendo60Dias: number;
  vencendo90Dias: number;
  totalGapsIdentificados: number;
  gapsCriticosComBloqueio: number;
  pessoasEmTreinamento: number;
  distribuicaoPorSetor: Record<string, {
    totalPessoas: number;
    qualificados: number;
    gaps: number;
    vencidos: number;
    taxaConformidade: number;
  }>;
  semDados: boolean;
}

// ----------------------------------------------------
// FASE 10: CONTROLE DOCUMENTAL, REVISÕES, FONTES EXTERNAS E CONHECIMENTO TEMPORAL
// ----------------------------------------------------

export type CategoriaDocumental =
  | 'DOCUMENTO_INTERNO'
  | 'DOCUMENTO_AUTORIDADE'
  | 'DOCUMENTO_FABRICANTE'
  | 'DOCUMENTO_CLIENTE'
  | 'OUTRO_CONTROLADO';

export type StatusCicloVidaDocumental =
  | 'RASCUNHO'
  | 'EM_ANALISE'
  | 'EM_APROVACAO'
  | 'APROVADO'
  | 'VIGENTE'
  | 'SUBSTITUIDO'
  | 'OBSOLETO'
  | 'CANCELADO';

export interface AplicabilidadeDocumental {
  organizacaoId?: string;
  setores?: string[];
  processos?: string[];
  atividades?: string[];
  aeronaves?: string[];
  modelos?: string[];
  componentes?: string[];
  clientes?: string[];
  contratos?: string[];
  frotas?: string[];
  requisitosRegulatorios?: string[];
  escopoRegulatorio?: string;
  periodoValidadeInicio?: string;
  periodoValidadeFim?: string;
  statusDeterminacao: 'DETERMINADA' | 'NAO_DETERMINADA_REQUER_VALIDACAO_HUMANA';
  observacoesAplicabilidade?: string;
}

export interface DocumentoControlado {
  id: string;
  organizationId: string;
  codigo: string; // Ex: 'MOMQ', 'POP-REC-001', 'RBAC 145', 'AMM-C208', 'CLI-AZUL-01'
  titulo: string;
  categoria: CategoriaDocumental;
  tipoSubcategoria?: string; // Ex: 'MOMQ', 'POP', 'IT', 'FORM', 'POLITICA', 'RBAC', 'IS', 'AMM', 'IPC', 'CMM', 'SB', 'AD'
  emissor: string; // Ex: 'Impacto Aviation MRO', 'ANAC', 'Cessna Aircraft Company', 'Azul Linhas Aéreas'
  clienteNome?: string;
  fabricanteNome?: string;
  autoridadeNome?: string;
  responsavelNome: string;
  responsavelUid?: string;
  revisaoVigenteId?: string;
  revisaoVigenteNumero?: string;
  fonteOficialCadastrada?: boolean;
  fonteExternaId?: string;
  frequenciaVerificacaoDias?: number;
  ultimaVerificacaoExterna?: string;
  proximaVerificacaoExterna?: string;
  exigeEvidenciaLeitura: boolean;
  aplicabilidadePadrao: AplicabilidadeDocumental;
  statusGeral: 'ATIVO' | 'INATIVO' | 'CANCELADO';
  status?: string;
  inativadoEm?: string;
  inativadoPor?: string;
  motivoInativacao?: string;
  reativadoEm?: string;
  reativadoPor?: string;
  motivoReativacao?: string;
  revisaoAtual?: string;
  dataAprovacao?: string;
  aprovadorNome?: string;
  tags?: string[];
  camposCustomizados?: Record<string, any>;
  metadadosImportacao?: Record<string, any>;

  // NOVOS CAMPOS: MÓDULO DE VERIFICAÇÃO AUTOMÁTICA VS. MANUAL & RELATÓRIO DE CONFORMIDADE
  areaPublicacao?: string; // Área temática da publicação (ex: 'Regulamentação Aeronáutica', 'Manuais de Voo & Linha', 'SGQ & Procedimentos')
  proprietarioCessor?: string; // Proprietário ou Cessor do manual (ex: 'IMPACTO', 'ANAC', 'BOEING', 'KALITTA')
  numeroRevisao?: string; // Sinônimo direto para Número da Revisão (ex: 'Rev. 08', 'Emenda 09', 'Rev. 107')
  dataRevisao?: string; // Sinônimo direto para Data da Revisão
  tipoVerificacao?: 'AUTOMATICO' | 'MANUAL'; // Classificação de Automação
  urlFonteVerificacao?: string; // Mapeamento de Fonte (URL pública para robô ou portal restrito)
  statusVerificacao?: 'CONFORME' | 'NOVA_REVISAO_IDENTIFICADA' | 'PENDENTE_VERIFICACAO' | 'ERRO_FONTE';
  dataUltimaVerificacao?: string; // ISO string da última verificação
  detalhesUltimaVerificacao?: string; // Mensagem de conformidade ou detalhes da nova revisão encontrada
  revisaoNaFonteIdentificada?: string; // Revisão encontrada na fonte oficial durante a última checagem
  contatoClienteNome?: string; // Nome do ponto focal técnico do cliente
  contatoClienteEmail?: string; // E-mail para notificação automática de solicitação de revisão
  portalFabricanteUrl?: string; // URL do portal restrito do fabricante (MyBoeingFleet, AirbusWorld, Cessna 1View)
  portalFabricanteInstrucoes?: string; // Orientações de login / credencial do fabricante
  ultimaNotificacaoClienteEm?: string; // Data ISO da última notificação enviada ao cliente
  ultimoAlertaFabricanteEm?: string; // Data ISO do último alerta / verificação do fabricante

  // ARMAZENAMENTO DE ARQUIVOS / REPOSITÓRIO (ACERVO & BIBLIOTECA)
  arquivoUrl?: string; // URL pública ou link de acesso do arquivo vigente
  arquivoCaminho?: string; // Caminho no storage/repositório (ex: '/acervo/manuais/{docId}/{fileName}')
  arquivoNome?: string; // Nome original do arquivo (ex: 'MOMQ_Rev08.pdf')
  arquivoMimeType?: string; // MIME type (ex: 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  arquivoTamanhoBytes?: number; // Tamanho em bytes
  dataUpload?: string; // Data ISO do upload do arquivo vigente
  arquivoBase64?: string; // Armazenamento do binário para download e visualização offline

  createdAt: string;
  updatedAt: string;
}

export interface RevisaoDocumental {
  id: string;
  organizationId: string;
  documentoId: string;
  codigoDocumento: string;
  tituloDocumento: string;
  numeroRevisao: string; // Ex: 'Rev. 06', 'Rev. 07', 'Rev. 08', 'Emenda 07'
  dataEmissao: string;
  dataEntradaVigor: string;
  dataSubstituicao?: string;
  statusCicloVida: StatusCicloVidaDocumental;
  aprovadoPorNome?: string;
  aprovadoPorUid?: string;
  dataAprovacao?: string;
  justificativaAprovacao?: string;
  escopoAlteracoes?: string;
  paginasOuSecoesAlteradas?: string[];
  aplicabilidadeEspecifica?: AplicabilidadeDocumental;
  origemRevisao: 'INTERNA' | 'FONTE_EXTERNA_OFICIAL' | 'CLIENTE_FORNECIDA' | 'IMPORTACAO';
  fonteVerificacao?: string;
  urlFonteExterna?: string;
  arquivoNome?: string;
  arquivoTamanhoBytes?: number;
  arquivoMimeType?: string;
  arquivoHashSha256?: string;
  arquivoUrl?: string;
  arquivoCaminho?: string;
  dataUpload?: string;
  arquivoBase64?: string;
  conteudoTextoIntegral?: string;
  capitulosIndexados?: ManualCapitulo[];
  observacoes?: string;
  ehImutavel: boolean;
  substituidaPorRevisaoId?: string;
  substituidaPorRevisaoNumero?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FonteExternaControlada {
  id: string;
  organizationId: string;
  nome: string; // Ex: 'Portal ANAC - Legislação RBAC', 'FAA Regulatory & Guidance Library', 'Cessna Customer Support Portal'
  tipoFonte: 'AUTORIDADE' | 'FABRICANTE' | 'CLIENTE' | 'OUTRA';
  urlBase?: string;
  responsavelVerificacaoNome: string;
  frequenciaDias: number;
  ultimaVerificacao?: string;
  proximaVerificacao?: string;
  ultimoResultadoStatus?: 'CONFORME_SEM_ALTERACAO' | 'NOVA_REVISAO_IDENTIFICADA' | 'ERRO_OU_INDISPONIVEL';
  ultimoResultadoDetalhes?: string;
  evidenciaRegistro?: string;
  status: 'ATIVA' | 'INATIVA';
  createdAt: string;
  updatedAt: string;
}

export interface LogVerificacaoFonteExterna {
  id: string;
  organizationId: string;
  fonteId: string;
  fonteNome: string;
  documentoId: string;
  codigoDocumento: string;
  revisaoAtualControlada: string;
  revisaoIdentificadaNaFonte?: string;
  statusVerificacao: 'CONFORME' | 'NOVA_REVISAO_IDENTIFICADA' | 'FONTE_INDISPONIVEL';
  mensagem: string;
  requerValidacaoHumana: boolean;
  validacaoHumanaStatus: 'PENDENTE' | 'VALIDADA_NOVA_REVISAO_ACEITA' | 'FALSO_POSITIVO_REJEITADA';
  dataVerificacao: string;
  executadoPor: string;
  evidenciaUrlOuTexto?: string;
}

export type StatusSolicitacaoCliente =
  | 'SOLICITACAO_GERADA'
  | 'ENVIADA_PELO_USUARIO'
  | 'AGUARDANDO_CLIENTE'
  | 'RECEBIDA'
  | 'CONFIRMADA_VIGENTE'
  | 'NOVA_REVISAO_RECEBIDA'
  | 'EM_ANALISE'
  | 'VALIDADA'
  | 'REJEITADA'
  | 'ENCERRADA';

export type IdiomaSolicitacao = 'EN' | 'PT' | 'ES';

export interface SolicitacaoRevisaoCliente {
  id: string;
  organizationId: string;
  clienteNome: string;
  destinatarioNome?: string;
  destinatarioEmail?: string;
  documentoId: string;
  documentoCodigo: string;
  documentoTitulo: string;
  revisaoAtualArmazenada: string;
  motivoSolicitacao: string;
  prazoDesejadoDias?: number;
  dataLimiteResposta?: string;
  idioma: IdiomaSolicitacao;
  assuntoGerado: string;
  corpoEmailGerado: string;
  status: StatusSolicitacaoCliente;
  geradoPorNome: string;
  geradoPorUid: string;
  geradoEm: string;
  enviadoPeloUsuarioEm?: string;
  respostaRecebidaEm?: string;
  novaRevisaoRecebidaNumero?: string;
  observacoes?: string;
  historicoStatus: Array<{ status: StatusSolicitacaoCliente; data: string; usuario: string; observacao?: string }>;
}

export interface ResultadoComparacaoRevisoes {
  revisaoAnteriorId: string;
  revisaoAnteriorNumero: string;
  revisaoNovaId: string;
  revisaoNovaNumero: string;
  secoesAlteradas: Array<{
    secao: string;
    tipoModificacao: 'ADICIONADO' | 'REMOVIDO' | 'MODIFICADO' | 'SEM_ALTERACAO';
    resumo?: string;
  }>;
  camposMetadadosModificados: Array<{ campo: string; anterior: string; novo: string }>;
  resumoDiferencas: string;
  nivelPrecisao: 'ALTA' | 'ESTIMADA' | 'PARCIAL_NAO_DETERMINADA';
  dataComparacao: string;
}

export interface ImpactoRevisaoItem {
  id: string;
  organizationId: string;
  documentoId: string;
  codigoDocumento: string;
  revisaoId: string;
  numeroRevisao: string;
  areaAfetada: 'PROCEDIMENTO' | 'INSTRUCAO' | 'TREINAMENTO' | 'COMPETENCIA' | 'PESSOA' | 'AUDITORIA' | 'RNC' | 'RISCO' | 'PROCESSO';
  itemAfetadoId?: string;
  itemAfetadoTitulo: string;
  descricaoImpacto: string;
  acaoSugerida: string;
  statusValidacaoHumana: 'SUGESTAO_PENDENTE' | 'CONFIRMADO_EM_TRATATIVA' | 'DESCONSIDERADO_NAO_APLICAVEL';
  validadoPorNome?: string;
  dataValidacao?: string;
  createdAt: string;
}

export interface RegistroEvidenciaConsultaDocumento {
  id: string;
  organizationId: string;
  documentoId: string;
  codigoDocumento: string;
  revisaoId: string;
  numeroRevisao: string;
  usuarioNome: string;
  usuarioUid: string;
  dataHora: string;
  finalidadeConsulta: 'EXECUCAO_MANUTENCAO' | 'AUDITORIA' | 'INVESTIGACAO_RNC' | 'TREINAMENTO' | 'CONSULTA_GERAL';
  referenciaOperacional?: string;
  declaracaoLeituraConfirmada: boolean;
}

export interface ResultadoVigenciaTemporal {
  dataReferencia: string;
  documentoId: string;
  codigoDocumento: string;
  tituloDocumento: string;
  revisaoVigenteNaData?: RevisaoDocumental;
  revisaoVigenteHoje?: RevisaoDocumental;
  statusDeterminacao: 'DETERMINADO' | 'NAO_DETERMINADO_REQUER_VALIDACAO_HUMANA' | 'DOCUMENTO_NAO_EXISTIA_NA_DATA';
  justificativaRastreavel: string;
  revisaoVigenteNaDataDiferenteDeHoje: boolean;
}

export interface DocumentosDashboardMetrics {
  totalDocumentosControlados: number;
  documentosVigentes: number;
  documentosObsoletos: number;
  documentosEmAnalise: number;
  documentosAguardandoAprovacao: number;
  revisoesExternasIdentificadasNaoValidadas: number;
  solicitacoesClientesPendentes: number;
  documentosSemVerificacaoRecente: number;
  distribuicaoPorCategoria: Record<CategoriaDocumental, number>;
  distribuicaoPorSetor: Record<string, number>;
  distribuicaoPorOrigem: Record<string, number>;
  totalRevisoesArmazenadas: number;
  semDados: boolean;

  // Aliases e propriedades para compatibilidade direta com DocumentControlCenterView
  totalDocumentos?: number;
  totalRevisoesVigentes?: number;
  fontesExternasAtivas?: number;
  fontesVerificacaoVencida?: number;
  discrepanciasPendentesValidacao?: number;
  solicitacoesClientePendentes?: number;
  revisoesEmTransicao?: number;
  taxaConformidadeDocumental?: number;
  distribuicaoCategorias?: Record<string, number>;
}

// ==========================================
// FASE 13: AUDITORIAS, REQUISITOS E CONTROLES DE CLIENTES
// ==========================================

export type StatusClienteExterno = 'ATIVO' | 'INATIVO' | 'EM_HOMOLOGACAO';
export type PeriodicidadeAvaliacao = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'EVENTUAL' | 'PERSONALIZADA';
export type MetodoVerificacaoRequisito = 'AUTOMATICO' | 'ASSISTIDO' | 'MANUAL' | 'DOCUMENTAL';
export type CriticidadeRequisito = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';
export type ResultadoAvaliacaoRequisito = 'CONFORME' | 'ATENCAO' | 'NAO_CONFORME' | 'NA' | 'PENDENTE' | 'VERIFICACAO_NECESSARIA';
export type StatusDeterminacaoPrevia = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA' | 'AZUL';

export interface BaseEstacaoOperacao {
  id: string;
  organizationId: string;
  codigo: string; // Ex: 'SOD', 'GRU', 'VCP', 'GIG', 'CNF'
  nome: string; // Ex: 'Base Principal Sorocaba', 'Estação Linha Guarulhos'
  tipo: 'BASE_PRINCIPAL' | 'ESTACAO_LINHA' | 'SUBCONTRATADA';
  cidade: string;
  estado: string;
  pais: string;
  clientesAtendidosIds: string[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClienteExterno {
  id: string;
  organizationId: string;
  codigo: string; // Ex: 'ATLAS', 'KALITTA', 'SWISS'
  nome: string; // Ex: 'Atlas Air, Inc.', 'Kalitta Air, LLC', 'SWISS International Air Lines'
  sigla: string;
  status: StatusClienteExterno;
  contatoPrincipal?: {
    nome: string;
    cargo: string;
    email: string;
    telefone?: string;
  };
  idiomaPadrao?: 'PT' | 'EN';
  basesRelacionadasIds: string[];
  observacoes?: string;
  responsavelInterno: string;
  programasAtivosCount?: number;
  totalRequisitosCount?: number;
  taxaConformidade?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramaChecklistCliente {
  id: string;
  organizationId: string;
  clienteId: string;
  clienteNome: string;
  codigo: string; // Ex: 'Q2059', 'QA-14'
  nome: string; // Ex: 'Station Audit Checklist Q2059', 'Quality Assurance Checklist QA-14'
  revisao: string; // Ex: 'Vigente', 'Rev. 4'
  dataEmissao?: string;
  dataVigencia: string;
  status: 'VIGENTE' | 'EM_REVISAO' | 'OBSOLETO';
  periodicidadePadrao: PeriodicidadeAvaliacao;
  escopoAplicabilidade: string;
  documentoFonteNome?: string;
  observacoes?: string;
  totalItens: number;
  createdAt: string;
  updatedAt: string;
}

export interface ControleCentralSGQ {
  id: string;
  organizationId: string;
  codigo: string; // Ex: 'CTRL-TREIN-01', 'CTRL-FERRAM-01', 'CTRL-DOCS-01'
  nome: string; // Ex: 'Qualificação e Treinamento Periódico de Técnicos'
  moduloOrigem: 'PessoasTreinamentos' | 'ControleDocumental' | 'Auditorias' | 'RNC' | 'Manuais' | 'OperacionalSGQ';
  descricao: string;
  responsavelPadrao: string;
  evidenciasTipicas: string[];
  status: 'ATIVO' | 'EM_REVISAO';
  requisitosVinculadosCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RequisitoClienteItem {
  id: string;
  organizationId: string;
  clienteId: string;
  clienteNome: string;
  programaId: string;
  programaCodigo: string;
  numeroItem: string; // Ex: 'Q2059-01', 'QA-14-1.2'
  tituloCurto: string;
  textoOriginal: string;
  categoria: string; // Ex: 'Housekeeping', 'Tooling / Calibration', 'Training', etc.
  aplicabilidadeRegras: {
    basesAplicaveis?: string[];
    tiposEstacao?: string[];
    requerRII?: boolean;
    requerETOPS?: boolean;
    justificativaNaoAplicavelPadrao?: string;
  };
  periodicidade: PeriodicidadeAvaliacao;
  metodoVerificacao: MetodoVerificacaoRequisito;
  evidenciaEsperada: string;
  criterioAceitacao?: string;
  controleCentralId?: string; // SSoT: Vínculo com Controle Central SGQ ("Um controle, vários requisitos")
  controleCentralCodigo?: string;
  controleCentralNome?: string;
  moduloOrigemSugerido?: string;
  criticidade: CriticidadeRequisito;
  status: 'ATIVO' | 'INATIVO' | 'EM_REVISAO';
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenciaRequisitoItem {
  id: string;
  tipo: 'DOCUMENTO' | 'REGISTRO_TREINAMENTO' | 'CERTIFICADO_CALIBRACAO' | 'RNC' | 'AUDITORIA' | 'FOTO' | 'LINK';
  titulo: string;
  descricao?: string;
  referenciaId?: string; // id do treinamento, documento, ou RNC
  numeroReferencia?: string; // ex: 'RNC-2026-004', 'AMM B747 Rev 42'
  dataEvidencia: string;
  responsavel: string;
  urlOuArquivo?: string;
  fotoBase64?: string; // Foto de evidência física de pátio / hangar
  arquivoNome?: string;
  arquivoTamanho?: number;
  arquivoTipo?: string;
  organizationId: string;
  // Rastreabilidade estrita: Cliente -> Programa -> Requisito -> Controle -> Evidência -> Data -> Usuário
  clienteId?: string;
  clienteNome?: string;
  programaId?: string;
  programaCodigo?: string;
  requisitoId?: string;
  numeroItem?: string;
  controleId?: string;
  controleCodigo?: string;
  usuarioUid?: string;
  usuarioNome?: string;
}

export interface PerguntaInteligenteResolucao {
  id: string;
  pergunta: string;
  contexto: string;
  opcaoSim: string;
  acaoSimTipo: 'ANEXAR_CERTIFICADO' | 'VINCULAR_DADO' | 'CONFIRMAR_USO';
  opcaoNao: string;
  acaoNaoTipo: 'REGISTRAR_SEGREGAÇÃO' | 'ABRIR_RNC' | 'BLOQUEAR_ESCALA' | 'VINCULAR_DADO';
  respondida?: boolean;
  respostaEscolhida?: 'SIM' | 'NAO';
  justificativaResposta?: string;
  respondidoPor?: string;
  respondidoEm?: string;
}

export interface SugestaoResolucaoIA {
  oQueFalta: string;
  porQueImpedeConformidade: string;
  evidenciasQuePoderiamSolucionar?: string[];
  evidenciasPossiveis?: string[];
  controleSugeridoMelhorar: string;
  procedimentoRelacionado: string;
  sugestaoAcao: string;
  sugestaoRespostaCliente: string;
  statusDecisao?: 'PENDENTE' | 'ACEITO' | 'EDITADO' | 'REJEITADO';
  respostaEditada?: string;
  decididoPor?: string;
  decididoEm?: string;
}

export interface AuditoriaRequisitoLog {
  dataHora: string;
  usuarioUid: string;
  usuarioNome: string;
  acao: string;
  resultadoAnterior?: ResultadoAvaliacaoRequisito;
  resultadoNovo?: ResultadoAvaliacaoRequisito;
  justificativa?: string;
}

export interface AvaliacaoRequisitoCliente {
  id: string;
  organizationId: string;
  clienteId: string;
  clienteNome: string;
  programaId: string;
  programaCodigo: string;
  requisitoId: string;
  numeroItem: string;
  tituloRequisito: string;
  baseId: string;
  baseCodigo: string;
  baseNome: string;
  dataAvaliacao: string;
  dataValidade?: string;
  proximaAvaliacao?: string;
  resultado: ResultadoAvaliacaoRequisito;
  metodoVerificacao: MetodoVerificacaoRequisito;
  
  // Determinação Automática / Assistida (Human-in-the-Loop)
  determinacaoAutomatica?: {
    status: StatusDeterminacaoPrevia; // VERDE, AMARELO, VERMELHO, CINZA, AZUL
    justificativa: string;
    evidenciasIdentificadas: string[];
    confiancaScore: number; // 0 a 100
    analisadoEm: string;
    fonteEvidencia?: string;
    dataEvidencia?: string;
    controleUtilizado?: string;
  };
  
  // Fase 15: Auditoria Inteligente e Resolução por Exceção
  isExcecao?: boolean; // True se requer intervenção (NÃO CONFORME, ATENÇÃO, VERIFICAÇÃO NECESSÁRIA)
  resolvidoAutomaticamente?: boolean;
  perguntaInteligente?: PerguntaInteligenteResolucao;
  sugestaoResolucao?: SugestaoResolucaoIA;
  
  avaliadorUid: string;
  avaliadorNome: string;
  aprovadorUid?: string;
  aprovadorNome?: string;
  
  justificativa?: string;
  comentario?: string;
  
  // Vínculo bidirecional com RNC (F 001-29)
  rncGeradaId?: string;
  numeroRNCGerada?: string;
  
  evidencias: EvidenciaRequisitoItem[];
  historicoAlteracoes: AuditoriaRequisitoLog[];
  
  createdAt: string;
  updatedAt: string;
}

export interface MatrizCoberturaItem {
  controleCentralId: string;
  controleCodigo: string;
  controleNome: string;
  moduloOrigem: string;
  requisitosAtendidos: {
    requisitoId: string;
    numeroItem: string;
    clienteId: string;
    clienteNome: string;
    programaCodigo: string;
    criticidade: CriticidadeRequisito;
  }[];
  totalClientesAtendidos: number;
}

export interface RequisitoSemControleLacuna {
  requisitoId: string;
  clienteId: string;
  clienteNome: string;
  programaCodigo: string;
  numeroItem: string;
  titulo: string;
  criticidade: CriticidadeRequisito;
  recomendacaoAcao: string;
}

export interface ClientesControlesDashboardMetrics {
  totalClientes: number;
  totalProgramas: number;
  totalRequisitos: number;
  totalBases: number;
  totalAvaliacoesRealizadas: number;
  conformesCount: number;
  atencaoCount: number;
  naoConformesCount: number;
  pendentesCount: number;
  naCount: number;
  taxaConformidadeGeral: number; // %
  requisitosComControleCount: number;
  requisitosSemControleCount: number; // Lacunas
  taxaCoberturaControles: number; // %
  rncsVinculadasCount: number;
  distribuicaoPorCliente: Record<string, { total: number; conformes: number; naoConformes: number; pendentes: number; taxa: number }>;
  distribuicaoPorBase: Record<string, { total: number; conformes: number; naoConformes: number; pendentes: number; taxa: number }>;
  semDados: boolean;
}

// ============================================================================
// FASE 14 — IMPORTAÇÃO INTELIGENTE E MIGRAÇÃO DE CONTROLES EXISTENTES
// ============================================================================

export type TipoControleImportacao = 
  | 'TREINAMENTOS'
  | 'CALIBRACAO_FERRAMENTAL'
  | 'CONTROLE_DOCUMENTAL'
  | 'NAO_CONFORMIDADES'
  | 'REQUISITOS_CLIENTES'
  | 'OUTROS';

export type FormatoArquivoSuportado = 'XLSX' | 'XLS' | 'CSV' | 'DOCX' | 'PDF' | 'JSON';

export type StatusImportacao = 'RASCUNHO' | 'ANALISADO' | 'VALIDADO' | 'IMPORTADO' | 'COM_ERROS' | 'CANCELADO' | 'REVERTIDA';

export type NivelAlertaQualidade = 'OK' | 'ATENCAO' | 'ERRO';

export type AcaoConflitoDuplicidade = 'CRIAR_NOVO' | 'ATUALIZAR' | 'MANTER_EXISTENTE' | 'IGNORAR';

export type ClassificacaoReconciliacao = 
  | 'NOVO'
  | 'EXISTENTE_IGUAL'
  | 'EXISTENTE_ALTERADO'
  | 'POSSIVEL_DUPLICIDADE'
  | 'INVALIDO';

export type DecisaoReconciliacao = 'CRIAR' | 'ATUALIZAR' | 'IGNORAR' | 'REVISAR' | 'CANCELAR';

export interface CampoDivergente {
  campo: string;
  label: string;
  valorAtual: any;
  valorImportado: any;
}

export interface MapeamentoCampoItem {
  colunaOrigem: string;
  campoQualigest: string;
  campoLabel: string;
  obrigatorio: boolean;
  tipoDado: 'string' | 'date' | 'number' | 'boolean' | 'enum';
  confiancaIA: number; // 0 a 100
  exemploValor?: string;
  descricao?: string;
  classificacaoUso?: 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO';
  sugestaoIA?: 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO';
}

export interface TemplateMapeamentoAprovado {
  id: string;
  organizationId: string;
  nomeTemplate: string;
  nome?: string; // alias conveniente para nomeTemplate
  tipoControle: TipoControleImportacao;
  colunasDetectadas: string[];
  mapeamentos: Record<string, string>; // colunaOrigem -> campoQualigest
  classificacaoCampos?: Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'>;
  camposPersonalizados?: { campo: string; label: string; tipo?: string; descricao?: string; isCustom?: boolean }[];
  camposCustomizados?: { campo: string; label: string; tipo?: string; descricao?: string; isCustom?: boolean }[];
  criadoPor: string;
  criadoPorNome?: string;
  criadoPorUid?: string;
  dataAprovacao: string;
  criadoEm?: string;
  atualizadoEm?: string;
  totalVezesUsado: number;
  vezesUtilizado?: number;
}

export interface RegistroLinhaImportacao {
  indiceLinha: number;
  dadosOriginais: Record<string, any>;
  dadosMapeados: Record<string, any>;
  statusQualidade: NivelAlertaQualidade;
  mensagensValidacao: string[];
  duplicidadeDetectada: boolean;
  acaoDuplicidade: AcaoConflitoDuplicidade;
  registroExistenteId?: string;
  registroExistenteResumo?: string;
  selecionadoParaImportar: boolean;
  classificacaoReconciliacao?: ClassificacaoReconciliacao;
  camposDivergentes?: CampoDivergente[];
  dadosExistentesSnapshot?: Record<string, any>;
  decisaoUsuario?: DecisaoReconciliacao;
  pessoaAcao?: 'CRIAR_PESSOA' | 'VINCULAR_EXISTENTE' | 'IGNORAR';
  pessoaIdVinculada?: string;
  pessoaNomeVinculada?: string;
  cursoAcao?: 'CRIAR_CURSO' | 'VINCULAR_EXISTENTE' | 'IGNORAR';
  cursoIdVinculado?: string;
  documentoAcao?: 'CRIAR_DOCUMENTO' | 'NOVA_REVISAO' | 'IGNORAR';
  origemSugestao?: 'AI_SUGGESTION';
  decisaoHumana?: 'HUMAN_APPROVED' | 'HUMAN_EDITED' | 'HUMAN_REJECTED';
}

export interface PreviaEstruturaArquivo {
  linhaCabecalho: number;
  totalLinhasPreambulo: number;
  linhasPreambulo: string[];
  totalLinhasDados: number;
  colunasDetectadas: string[];
  tipoIdentificado: TipoControleImportacao;
  confiancaPercentual: number;
  amostraLinhas: Record<string, any>[];
  camposObrigatorios: string[];
  camposOpcionais: string[];
  totalLinhasProblemas: number;
}

export interface ResumoPreviaImportacao {
  totalLinhas: number;
  registrosNovos: number;
  registrosAtualizacoes: number;
  registrosDuplicados: number;
  registrosComErro: number;
  registrosComAtencao: number;
  registrosIgnorados: number;
  evidenciasIdentificadas: number;
  registrosIguais?: number;
  registrosAlterados?: number;
  possiveisDuplicidades?: number;
  registrosInvalidos?: number;
}

export type TipoOportunidadeMelhoria = 
  | 'VALIDADE_AUSENTE'
  | 'TREINAMENTO_OBRIGATORIO_FALTANTE'
  | 'EVIDENCIA_AUSENTE'
  | 'CURSO_DUPLICADO'
  | 'NOMENCLATURA_DIVERGENTE'
  | 'CALIBRACAO_VENCIDA_OU_PROXIMA'
  | 'DOCUMENTO_SEM_REVISAO'
  | 'EQUIPAMENTO_SEM_IDENTIFICACAO'
  | 'PESSOA_NAO_CADASTRADA'
  | 'LACUNA_REQUISITO_CLIENTE'
  | 'OUTRA';

export interface OportunidadeMelhoriaImportacao {
  id: string;
  tipo: TipoOportunidadeMelhoria;
  titulo: string;
  descricao: string;
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  registrosAfetados: number;
  detalhesLinhas?: string[];
  acoesDisponiveis: ('CRIAR_ACAO' | 'CRIAR_RNC' | 'CORRIGIR_DADOS' | 'IGNORAR')[];
  status: 'PENDENTE' | 'ACAO_CRIADA' | 'RNC_CRIADA' | 'CORRIGIDO' | 'IGNORADO';
  rncIdGerada?: string;
  acaoPlanoTexto?: string;
}

export type ModuloSnapshotImportacao = 
  | 'CALIBRATED_TOOL' 
  | 'PERSON' 
  | 'TRAINING_COURSE' 
  | 'TRAINING_RECORD' 
  | 'CONTROLLED_DOCUMENT' 
  | 'DOCUMENT_REVISION';

export interface SnapshotRegistroCriado {
  modulo: ModuloSnapshotImportacao;
  id: string;
  dados: any;
}

export interface SnapshotRegistroAtualizado {
  modulo: ModuloSnapshotImportacao;
  id: string;
  dadosAnteriores: any;
  dadosNovos: any;
}

export interface RegistroImportacaoCompleto {
  id: string;
  organizationId: string;
  nomeArquivo: string;
  tipoArquivo: FormatoArquivoSuportado;
  tamanhoBytes: number;
  hashSha256?: string;
  dataUpload: string;
  usuarioUid: string;
  usuarioEmail: string;
  usuarioNome?: string;
  tipoControleIdentificado?: TipoControleImportacao;
  tipoControle?: TipoControleImportacao;
  confiancaIdentificacaoIA?: number;
  confiancaPercentual?: number;
  finalidadeProvavel?: string;
  finalidadeIdentificada?: string;
  status: StatusImportacao;
  totalLinhas?: number;
  registrosCriadosQtd?: number;
  registrosAtualizadosQtd?: number;
  registrosIgnoradosQtd?: number;
  oportunidadesGeradasQtd?: number;
  mapeamentoUtilizado?: Record<string, string>;
  classificacaoCamposUtilizada?: Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'>;
  colunasDetectadas?: string[];
  linhaCabecalhoDetectada?: number;
  linhasPreambuloDetectadas?: string[];
  resumo?: ResumoPreviaImportacao;
  registrosGeradosIds: string[];
  registrosAtualizadosIds?: string[];
  oportunidadesDetectadas?: OportunidadeMelhoriaImportacao[];
  templateIdUtilizado?: string;
  templateNomeUtilizado?: string;
  arquivoBase64Preview?: string;
  origem?: 'UPLOAD_HUMANO' | 'MIGRACAO_LEGADA';
  reversivel?: boolean;
  revertida?: boolean;
  revertidaEm?: string;
  revertidaPorNome?: string;
  revertidaPorUid?: string;
  motivoReversao?: string;
  registrosCriadosSnapshot?: SnapshotRegistroCriado[];
  registrosAtualizadosSnapshot?: SnapshotRegistroAtualizado[];
  criadoEm?: string;
  atualizadoEm?: string;
}

/**
 * Ferramenta / Instrumento Calibrado (Metrologia Aeronáutica RBAC 145.109 / EASA)
 */
export interface FerramentaCalibracao {
  id: string;
  organizationId: string;
  codigoPatrimonio: string; // Ex: 'TQ-023', 'MULT-004'
  descricao: string; // Ex: 'Torquímetro de Estalo 20-100 Nm'
  fabricante: string;
  modelo?: string;
  numeroSerie: string;
  setor: string; // Ex: 'REC - Manutenção / Hangar'
  baseOperacionalId?: string;
  baseOperacionalNome?: string;
  status: 'CALIBRADA' | 'VENCIDA' | 'PROXIMA_VENCIMENTO' | 'EM_CALIBRACAO' | 'QUARANTENA' | 'QUARENTENA' | 'DESCARTE' | 'INATIVA' | 'SEM_DATA_INFORMADA' | 'PENDENTE_VERIFICACAO';
  ativo?: boolean;
  localizacao?: string;
  responsavelNome?: string;
  origemVencimento?: 'CALCULADO_AUTOMATICO' | 'INFORMADO_MANUAL' | 'CORRECAO_HISTORICA';
  divergenciaMetrologicaDetectada?: boolean;
  mensagemDivergencia?: string;
  dataUltimaCalibracao: string; // YYYY-MM-DD
  dataProximaCalibracao: string; // YYYY-MM-DD
  frequenciaMeses: number;
  laboratorioCalibrador: string;
  numeroCertificado: string;
  evidenciaCertificadoUrl?: string;
  certificadoAnexo?: {
    nomeArquivo: string;
    tamanhoBytes?: number;
    tipoArquivo?: string;
    urlOuBase64?: string;
    dataUpload?: string;
  };
  tolerancia?: string;
  observacoes?: string;
  historicoCalibracoes?: {
    id: string;
    data: string;
    certificado: string;
    laboratorio: string;
    validadeAte: string;
    observacao?: string;
    registradoPor?: string;
    registradoEm?: string;
    certificadoAnexo?: {
      nomeArquivo: string;
      urlOuBase64?: string;
      dataUpload?: string;
      tamanhoBytes?: number;
      tipoArquivo?: string;
    };
    foiCorrigido?: boolean;
    corrigidoEm?: string;
    corrigidoPor?: string;
    motivoCorrecao?: string;
    valoresAnteriores?: {
      data?: string;
      validadeAte?: string;
      certificado?: string;
      laboratorio?: string;
    };
  }[];
  historicoAlteracoesCadastrais?: {
    id: string;
    dataHora: string;
    usuarioNome: string;
    usuarioUid?: string;
    tipoOperacao: 'EDICAO_CADASTRO' | 'CORRECAO_DATA' | 'NOVA_CALIBRACAO' | 'INATIVACAO' | 'REATIVACAO' | 'QUARENTENA';
    resumo: string;
    detalhes?: Record<string, { anterior: any; novo: any }>;
    motivo?: string;
  }[];
  origemImportacaoId?: string;
  origemArquivoNome?: string;
  camposCustomizados?: Record<string, any>;
  criadoEm: string;
  atualizadoEm: string;
}

export interface FiltrosImportacao {
  termoBusca?: string;
  tipoControle?: TipoControleImportacao | 'TODOS';
  status?: StatusImportacao | 'TODOS';
  dataInicio?: string;
  dataFim?: string;
}

// ==========================================
// FASE 15: SYSTEM DESIGNER DO QUALIGEST & ADRs
// ==========================================

export interface ArchitectureDecisionRecord {
  id: string; // Ex: 'ADR-001'
  numero: number;
  titulo: string;
  status: 'PROPOSTO' | 'ACEITO' | 'SUPERSEDED' | 'DEPRECATED';
  dataDecisao: string;
  versaoSistema: string;
  contextoProblema: string;
  decisao: string;
  motivoJustificativa: string;
  impactoArquitetural: string;
  modulosAfetados: string[];
  regrasAssociadas: string[];
  autor: string;
}

export interface SystemDesignerModule {
  id: string;
  nome: string;
  faseOrigem: string;
  descricao: string;
  icone: string;
  categoria: 'GOVERNANCA' | 'OPERACAO' | 'COMPLIANCE' | 'PESSOAS' | 'INTELIGENCIA';
  colecoesFirestore: string[];
  rotasOuTabs: string[];
  dependenciasModulosIds: string[];
  modulosConsumidoresIds: string[];
  regrasSegurancaAplicaveis: string[];
  recursosIA: string[];
}

export interface SystemDesignerCollection {
  nomeColecao: string;
  caminhoFirestore: string;
  descricao: string;
  multiTenantCampo: string; // 'organizationId'
  indicesObrigatorios: string[];
  regrasPermissaoRBAC: string;
  entidadeTypeScript: string;
  origemDados: string;
  volumeEstimado: string;
}

export interface SystemDesignerFlow {
  id: string;
  titulo: string;
  descricao: string;
  etapas: {
    ordem: number;
    nome: string;
    modulo: string;
    ator: 'USUARIO' | 'IA_GEMINI' | 'SISTEMA_FIRESTORE' | 'AUDITOR_EXTERNO';
    descricao: string;
    evidenciaGerada?: string;
  }[];
}

export interface SystemDesignerRule {
  id: string;
  codigo: string;
  titulo: string;
  categoria: 'SEGURANCA_RBAC' | 'ISOLAMENTO_TENANT' | 'GOVERNANCA_IA' | 'AUDIT_TRAIL' | 'INTEGRIDADE_DADOS';
  descricao: string;
  inviolavel: boolean;
  consequenciaViolacao: string;
  exemploPratico: string;
}



