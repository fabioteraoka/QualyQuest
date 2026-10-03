/**
 * Tipos Oficiais de Integração: Impacto Aviation MRO ↔ QualyQuest
 * 
 * Regra Arquitetural:
 * - O Impacto Aviation MRO é a fonte oficial dos dados de manutenção (Bases, Técnicos, OS, Ferramentas).
 * - O QualyQuest é a fonte oficial dos registros de qualidade e conformidade (RNCs, Auditorias, SGQ).
 * - Esta integração é estritamente SOMENTE LEITURA no Impacto.
 * - Não duplicar registros: o QualyQuest apenas referencia IDs estáveis.
 */

export interface ImpactoBase {
  id: string; // ID estável no Impacto (ex: 'base_vcp')
  codigo: string; // Ex: 'VCP', 'SDU', 'BSB', 'CGH'
  nome: string; // Ex: 'Base Operacional Viracopos - Hangar 1'
  cidade: string;
  uf: string;
  ativo: boolean;
  capacidadeSimultanea?: number;
  urlNavegavel?: string; // URL no portal Impacto
}

export interface ImpactoTecnico {
  id: string; // ID estável no Impacto (ex: 'tec_imp_001')
  nome: string;
  cpfMascarado?: string;
  cht: string; // Certificado de Habilitação Técnica (ex: 'CHT-145892')
  chtValidade: string; // YYYY-MM-DD
  categoriasCht: string[]; // Ex: ['CEL', 'GMP', 'AVI']
  funcao: string; // Ex: 'Inspetor Chefe', 'Mecânico Especialista Avionics'
  baseId: string;
  baseNome?: string;
  email?: string;
  ativo: boolean;
  urlNavegavel?: string;
}

export interface ImpactoQualificacao {
  id: string; // ID estável no Impacto (ex: 'qual_imp_892')
  tecnicoId: string; // Referência estável ao técnico
  tecnicoNome?: string;
  titulo: string; // Ex: 'Qualificação Tipo Embraer E195-E2 Avionics'
  tipo: 'AERONAVE' | 'MOTOR' | 'END_TESTES' | 'AVIONICS' | 'ESTRUTURAS';
  emissor: string; // Ex: 'Impacto Aviation Training Center', 'Embraer'
  dataEmissao: string; // YYYY-MM-DD
  dataValidade?: string; // YYYY-MM-DD
  status: 'VIGENTE' | 'VENCIDO' | 'A_RENOVAR';
  urlNavegavel?: string;
}

export interface ImpactoTreinamento {
  id: string; // ID estável no Impacto (ex: 'tr_imp_5501')
  tecnicoId: string; // Referência estável ao técnico
  tecnicoNome?: string;
  cursoNome: string; // Ex: 'Fatores Humanos na Manutenção Aeronáutica (HF)'
  codigoCurso?: string; // Ex: 'HF-2026'
  cargaHoraria: number; // Em horas
  dataConclusao: string; // YYYY-MM-DD
  dataValidade?: string; // YYYY-MM-DD
  entidadeInstrutora: string; // Ex: 'Impacto Training Academy'
  aprovado: boolean;
  urlNavegavel?: string;
}

export interface ImpactoFerramenta {
  id: string; // ID estável no Impacto (ex: 'ferr_imp_302')
  codigo: string; // Código de identificação (ex: 'TORQ-001', 'MULT-014')
  descricao: string;
  fabricante?: string;
  numeroSerie: string;
  baseId: string;
  baseNome?: string;
  localizacao?: string; // Ex: 'Armário A2 - Ferramentaria VCP'
  statusCalibracao: 'CALIBRADO' | 'VENCIDO' | 'QUARENTENA' | 'EM_CALIBRACAO';
  dataUltimaCalibracao?: string; // YYYY-MM-DD
  dataProximaCalibracao?: string; // YYYY-MM-DD
  certificadoNumero?: string;
  laboratorioCalibracao?: string;
  urlNavegavel?: string;
}

export type StatusOrdemServicoImpacto =
  | 'ABERTA'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PECAS'
  | 'INSPECAO_QUALIDADE'
  | 'CONCLUIDA'
  | 'CANCELADA';

export interface ImpactoOrdemServico {
  id: string; // ID estável no Impacto (ex: 'os_imp_2026_0982')
  numero: string; // Código amigável (ex: 'OS-2026-0982')
  titulo: string;
  descricao: string;
  prefixoAeronave: string; // Ex: 'PR-GUQ'
  modeloAeronave: string; // Ex: 'Boeing 737-800'
  numeroSerieAeronave?: string;
  clienteNome: string; // Ex: 'Azul Linhas Aéreas'
  baseId: string;
  baseNome: string;
  tipoManutencao: string; // Ex: 'Check C', 'Linha de Voo', 'AOG'
  tecnicoResponsavelId: string; // ID estável do técnico
  tecnicoResponsavelNome: string;
  equipeTecnicaIds?: string[];
  dataAbertura: string; // YYYY-MM-DD
  dataPrevisaoConclusao?: string; // YYYY-MM-DD
  dataConclusao?: string; // YYYY-MM-DD
  status: StatusOrdemServicoImpacto;
  prioridade: 'AOG' | 'URGENTE' | 'ROTINA';
  urlNavegavel: string; // Link navegável oficial no Impacto Aviation MRO
}

export interface ImpactoEtapaManutencao {
  id: string;
  descricao: string;
  executadoPor: string;
  tecnicoId?: string;
  dataExecucao?: string;
  status: 'PENDENTE' | 'EXECUTADO' | 'INSPECIONADO';
  inspetorAprovador?: string;
}

export interface ImpactoDiscrepancia {
  id: string;
  codigo: string;
  descricao: string;
  itemAta?: string;
  acaoTomada?: string;
  dataRegistro: string;
  resolvida: boolean;
}

export interface ImpactoPecaSubstituida {
  partNumber: string;
  serialNumberRemovido?: string;
  serialNumberInstalado?: string;
  descricao: string;
  certificacaoForm1?: string;
  lote?: string;
}

export interface ImpactoAlertaQualidade {
  tipo:
    | 'FERRAMENTA_VENCIDA'
    | 'TECNICO_SEM_HABILITACAO'
    | 'TREINAMENTO_EXPIRADO'
    | 'DESVIO_PROCEDIMENTO'
    | 'PRAZO_AOG'
    | 'DISCREPANCIA_ABERTA';
  severidade: 'CRITICO' | 'ALTO' | 'MEDIO' | 'INFO';
  mensagem: string;
  itemReferencia: string;
}

export interface ImpactoContextoQualidadeOS {
  ordemServico: ImpactoOrdemServico;
  base: ImpactoBase;
  tecnicoResponsavel: ImpactoTecnico;
  equipeTecnica: ImpactoTecnico[];
  qualificacoesEnvolvidas: ImpactoQualificacao[];
  treinamentosEnvolvidos: ImpactoTreinamento[];
  ferramentasUtilizadas: ImpactoFerramenta[];
  etapasManutencao: ImpactoEtapaManutencao[];
  discrepanciasManutencao: ImpactoDiscrepancia[];
  pecasSubstituidas: ImpactoPecaSubstituida[];
  alertasQualidadeDetectados: ImpactoAlertaQualidade[];
  resumoAuditavel: string;
  metadadosConsulta: {
    consultadoEm: string;
    fonteOficial: 'Impacto Aviation MRO' | string;
    statusConexao: ImpactoConnectionStatus;
    versaoApi: string;
    cachedAt?: string;
  };
}

export type ImpactoConnectionStatus =
  | 'ONLINE'
  | 'OFFLINE_INDISPONIVEL'
  | 'ULTIMA_CONSULTA_CONHECIDA';

export interface ImpactoMeta {
  total?: number;
  statusConexao: ImpactoConnectionStatus;
  tempoRespostaMs?: number;
  cachedAt?: string;
  aviso?: string;
  [key: string]: any;
}

/**
 * Envelope Canônico da API Oficial Impacto Aviation MRO
 * Formato padrão: success/version/timestamp/source/data/meta
 */
export interface ImpactoApiResponse<T> {
  success: boolean;
  version: string;
  timestamp: string;
  source: string; // Ex: 'Impacto Aviation MRO'
  data: T | null;
  meta: ImpactoMeta;
  error?: string;
}

export interface ImpactoApiHealth {
  status: 'ok' | 'degraded' | 'offline';
  servico: string;
  fonteOficial: 'Impacto Aviation MRO';
  urlConfigurada: string;
  autenticado: boolean;
  timestamp: string;
  tempoRespostaMs?: number;
  versao: string;
}

/**
 * Modelo de Vinculação QualyQuest ↔ Impacto Aviation MRO
 * Armazenado na NCRecord do QualyQuest
 */
export interface VinculoImpactoMro {
  origem: 'Impacto Aviation MRO';
  ordemServicoId: string; // ID estável da OS no Impacto (ex: 'os_imp_0982')
  numeroOS: string; // Código amigável (ex: 'OS-2026-0982')
  tituloOS?: string;
  prefixoAeronave?: string; // Ex: 'PR-GUQ'
  modeloAeronave?: string; // Ex: 'Boeing 737-800'
  tipoManutencao?: string; // Ex: 'Check C'
  baseId?: string; // ID estável da base (ex: 'base_vcp')
  baseNome?: string;
  tecnicoId?: string; // ID estável do técnico (ex: 'tec_imp_001')
  tecnicoNome?: string;
  tecnicoCht?: string;
  dataAberturaOS?: string;
  statusOS?: StatusOrdemServicoImpacto | string;
  urlNavegavel?: string; // Link direto para abrir a OS no Impacto MRO
  dataVinculo: string; // Data ISO em que o vínculo foi criado
  vinculadoPor?: string; // Auditor / usuário que realizou o vínculo
}
