export type CategoriaPessoa = 'Mecânico' | 'Administrativo';
export type SituacaoPessoa = 'Ativo' | 'Inativo';

export interface Pessoa {
  id: string; // MEC-001, ADM-001
  nome: string;
  categoria: CategoriaPessoa;
  situacao: SituacaoPessoa;
  base_principal_id: string;
  cliente_ou_area: string;
  canac: string;
  matricula?: string;
  setor?: string;
  funcao?: string;
  cargo_operacional?: string;
  data_admissao?: string;
  contato_corporativo?: string;
  observacoes?: string;
  status_customizado?: string;
  restricao_operacional?: {
    possuiRestricao: boolean;
    motivo?: string;
    dataInicio?: string;
    dataFim?: string;
    impedeExecucao?: boolean;
    apenasAlerta?: boolean;
    registradoPor?: string;
    registradoEm?: string;
  };
  criado_em: string;
  atualizado_em: string;
  atualizado_por: string;
}

export interface Base {
  id: string; // CNF, GIG, GRU, REC, VCP
  nome: string;
  ativa: boolean;
}

export type OrgaoLicenca = 'ANAC' | 'FAA';
export type TipoLicenca = 'CHT' | 'CCT' | 'AMP';
export type HabilitacaoLicenca = 'AVI' | 'CEL' | 'GMP' | '';

export interface Licenca {
  id: string;
  pessoa_id: string;
  orgao: OrgaoLicenca;
  tipo: TipoLicenca;
  habilitacao: HabilitacaoLicenca;
  numero: string;
  data_vencimento: string | null; // ISO YYYY-MM-DD
  data_expedicao: string | null; // ISO YYYY-MM-DD
  status?: 'VALIDA' | 'VENCIDA' | 'SUSPENSA' | 'REVOGADA';
  escopo?: string;
  limitacoes_operacionais?: string;
  bloqueia_operacao_se_vencida?: boolean;
  documento_comprobatorio_id?: string;
  responsavel_validacao_nome?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
  atualizado_por: string;
}

export type GrupoCurso = 'Doutrinação' | 'Frota';

export interface CursoCatalogo {
  id: string;
  grupo: GrupoCurso;
  frota: string; // e.g. B737 Classic, B737 NG/MAX, B747, B767, B777, A320 Family, A330, E190-E2
  variante: string; // e.g. B737 CLASSIC 3/4/5, B737 NG, B737 MAX, B747-400, B747-800, B767, B777, A320F / 321, A320F / 321 NEO, A330, A330 NEO, E190E2
  curso: string; // Familiarization, Ramp & Transit, Line & Base, Refreshment, etc.
  validade_dias: number;
  ativo: boolean;
  codigo?: string;
  tipo?: 'INICIAL' | 'RECORRENTE' | 'ATUALIZACAO' | 'QUALIFICACAO_ESPECIAL' | 'OJT' | 'DIALOGO_SEGURANCA' | string;
  modalidade?: 'PRESENCIAL' | 'EAD' | 'HIBRIDO' | 'PRATICO_HANGAR' | string;
  carga_horaria_horas?: number;
  ementa?: string;
  recorrente?: boolean;
  periodicidade_meses?: number;
  origem_prazo?: 'REGULAMENTO' | 'FABRICANTE' | 'SGQ_INTERNO' | 'CLIENTE' | string;
  nivel_ou_modulo?: string;
  sem_validade?: boolean;
}

export interface Treinamento {
  id: string;
  pessoa_id: string;
  curso_id: string;
  data_execucao: string; // ISO YYYY-MM-DD
  validade_dias_override?: number | null;
  motor_original?: string;
  observacao?: string;
  resultado?: 'APROVADO' | 'REPROVADO' | 'PENDENTE' | 'EM_ANDAMENTO';
  instrutor?: string;
  carga_horaria?: number;
  numero_certificado?: string;
  registro_treinamento_origem_id?: string;
  data_validade?: string;
  substituido_por?: string | null; // ID of replacing training record
  criado_em: string;
  atualizado_em: string;
  atualizado_por: string;
}

export type FabricanteMotor = 'GE' | 'PW' | 'RR' | 'CFM' | 'IAE';

export interface MotorCatalogo {
  id: string;
  fabricante: FabricanteMotor;
  modelo: string;
}

export interface TreinamentoMotor {
  treinamento_id: string;
  motor_id: string;
}

export type EasaType = 'SIM' | 'NÃO' | 'N/A';

export interface DesignacaoPessoa {
  pessoa_id: string;
  imp: string;
  easa_type: EasaType;
  incluir_na_lista: boolean;
  nome_na_lista?: string;
}

export interface DesignacaoBase {
  pessoa_id: string;
  base_id: string;
}

export type FuncaoDesignacao = 'Executante' | 'Supervisor' | 'IIO' | 'Inspetor' | 'APRS';
export type SimNaoVazio = 'SIM' | 'NÃO' | '';

export interface DesignacaoFuncao {
  pessoa_id: string;
  funcao: FuncaoDesignacao;
  valor: SimNaoVazio;
}

export type AeronaveDesignacao = 'B737' | 'E190E2' | 'A320FAM' | 'A330' | 'B767' | 'B777';

export interface DesignacaoAeronave {
  pessoa_id: string;
  aeronave: AeronaveDesignacao;
  valor: SimNaoVazio;
}

export interface Configuracao {
  faixa_1: number; // default 30
  faixa_2: number; // default 60
  faixa_3: number; // default 90
  data_referencia: string; // ISO YYYY-MM-DD
  responsavel_tecnico: string;
  logo_url?: string;
  assinatura_url?: string;
  destacar_vencimentos_padrao: boolean;
  limite_linhas_pagina: number;
}

export type PerfilUsuario = 'Admin' | 'Editor' | 'Leitor';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

export type AcaoAuditoria = 'CRIAR' | 'EDITAR' | 'EXCLUIR' | 'IMPORTAR' | 'RENOVAR';

export interface Auditoria {
  id: string;
  timestamp: string;
  usuario_nome: string;
  acao: AcaoAuditoria;
  tabela: string;
  registro_id: string;
  detalhes: string;
  dados_antes?: any;
  dados_depois?: any;
}

export type ItemStatus =
  | 'Vencido'
  | 'Vence ≤30d'
  | 'Vence ≤60d'
  | 'Vence ≤90d'
  | 'Em dia'
  | 'Sem vencimento'
  | 'Sem registro';

export interface CalculoVencimentoResult {
  data_vencimento: string | null;
  dias_para_vencer: number | null;
  status: ItemStatus;
}

export type AlertaConferencia =
  | 'OK'
  | 'Vencido'
  | 'Sem registro'
  | 'Vigente s/ designação';

export interface ConferenciaItem {
  pessoa_id: string;
  aeronave: AeronaveDesignacao;
  designado: SimNaoVazio;
  treinamentos_count: number;
  vigentes_count: number;
  status_conferencia: AlertaConferencia;
}
