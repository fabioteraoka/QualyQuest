import {
  BaseRoster,
  ConfiguracaoRoster,
  CursoCatalogo,
  DesignacaoAeronave,
  DesignacaoBase,
  DesignacaoFuncao,
  DesignacaoPessoa,
  Licenca,
  MotorCatalogo,
  Pessoa,
  Treinamento,
  TreinamentoMotor,
  UsuarioRoster,
} from '../types/roster';

export const INITIAL_ROSTER_BASES: BaseRoster[] = [
  { id: 'CNF', nome: 'Belo Horizonte / Confins', ativa: true },
  { id: 'GIG', nome: 'Rio de Janeiro / Galeão', ativa: true },
  { id: 'GRU', nome: 'São Paulo / Guarulhos', ativa: true },
  { id: 'REC', nome: 'Recife / Guararapes', ativa: true },
  { id: 'VCP', nome: 'Campinas / Viracopos', ativa: true },
];

export const INITIAL_ROSTER_MOTORES: MotorCatalogo[] = [
  { id: 'MC-001', fabricante: 'GE', modelo: '' },
  { id: 'MC-002', fabricante: 'CFM', modelo: '' },
  { id: 'MC-003', fabricante: 'IAE', modelo: '' },
  { id: 'MC-004', fabricante: 'PW', modelo: '' },
  { id: 'MC-005', fabricante: 'RR', modelo: '' },
  { id: 'MC-006', fabricante: 'GE', modelo: 'CF6-80C2' },
  { id: 'MC-007', fabricante: 'IAE', modelo: 'V2500' },
  { id: 'MC-008', fabricante: 'GE', modelo: 'GE90' },
  { id: 'MC-009', fabricante: 'CFM', modelo: 'CFM56' },
  { id: 'MC-010', fabricante: 'CFM', modelo: 'LEAP-1A' },
  { id: 'MC-011', fabricante: 'PW', modelo: 'PW1100G' },
  { id: 'MC-012', fabricante: 'GE', modelo: 'CF6-80' },
  { id: 'MC-013', fabricante: 'RR', modelo: 'TRENT 700' },
  { id: 'MC-014', fabricante: 'RR', modelo: 'TRENT 7000' },
  { id: 'MC-015', fabricante: 'CFM', modelo: 'LEAP-1B' },
  { id: 'MC-016', fabricante: 'CFM', modelo: 'CFM56-7B' },
  { id: 'MC-017', fabricante: 'CFM', modelo: 'CFM56-3' },
];

export const INITIAL_ROSTER_CURSOS: CursoCatalogo[] = [
  // Doutrinação
  { id: 'CC-001', grupo: 'Doutrinação', frota: '', variante: '', curso: 'AVSEC', validade_dias: 730, ativo: true },
  { id: 'CC-002', grupo: 'Doutrinação', frota: '', variante: '', curso: 'PISOA', validade_dias: 730, ativo: true },
  { id: 'CC-003', grupo: 'Doutrinação', frota: '', variante: '', curso: 'Integração e Seg Operacional', validade_dias: 100000, ativo: true },
  { id: 'CC-004', grupo: 'Doutrinação', frota: '', variante: '', curso: 'Direção Defensiva', validade_dias: 730, ativo: true },
  { id: 'CC-005', grupo: 'Doutrinação', frota: '', variante: '', curso: 'PPSP', validade_dias: 1825, ativo: true },
  { id: 'CC-006', grupo: 'Doutrinação', frota: '', variante: '', curso: 'MOMQ', validade_dias: 1095, ativo: true },
  { id: 'CC-007', grupo: 'Doutrinação', frota: '', variante: '', curso: 'SGSO', validade_dias: 1825, ativo: true },
  { id: 'CC-008', grupo: 'Doutrinação', frota: '', variante: '', curso: 'Human Factors', validade_dias: 1825, ativo: true },

  // Frota B737 Classic
  { id: 'CC-009', grupo: 'Frota', frota: 'B737 Classic', variante: 'B737 CLASSIC 3/4/5', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-010', grupo: 'Frota', frota: 'B737 Classic', variante: 'B737 CLASSIC 3/4/5', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-011', grupo: 'Frota', frota: 'B737 Classic', variante: 'B737 CLASSIC 3/4/5', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-012', grupo: 'Frota', frota: 'B737 Classic', variante: 'B737 CLASSIC 3/4/5', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota B737 NG/MAX
  { id: 'CC-013', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 NG', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-014', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 NG', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-015', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 NG', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-016', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 NG', curso: 'Refreshment', validade_dias: 1825, ativo: true },
  { id: 'CC-017', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 MAX', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-018', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 MAX', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-019', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 MAX', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-020', grupo: 'Frota', frota: 'B737 NG/MAX', variante: 'B737 MAX', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota B747
  { id: 'CC-021', grupo: 'Frota', frota: 'B747', variante: 'B747-400', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-022', grupo: 'Frota', frota: 'B747', variante: 'B747-400', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-023', grupo: 'Frota', frota: 'B747', variante: 'B747-400', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-024', grupo: 'Frota', frota: 'B747', variante: 'B747-400', curso: 'Refreshment', validade_dias: 1825, ativo: true },
  { id: 'CC-025', grupo: 'Frota', frota: 'B747', variante: 'B747-800', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-026', grupo: 'Frota', frota: 'B747', variante: 'B747-800', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-027', grupo: 'Frota', frota: 'B747', variante: 'B747-800', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-028', grupo: 'Frota', frota: 'B747', variante: 'B747-800', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota B767
  { id: 'CC-029', grupo: 'Frota', frota: 'B767', variante: 'B767', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-030', grupo: 'Frota', frota: 'B767', variante: 'B767', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-031', grupo: 'Frota', frota: 'B767', variante: 'B767', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-032', grupo: 'Frota', frota: 'B767', variante: 'B767', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota B777
  { id: 'CC-033', grupo: 'Frota', frota: 'B777', variante: 'B777', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-034', grupo: 'Frota', frota: 'B777', variante: 'B777', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-035', grupo: 'Frota', frota: 'B777', variante: 'B777', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-036', grupo: 'Frota', frota: 'B777', variante: 'B777', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota A320 Family
  { id: 'CC-037', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-038', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-039', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-040', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321', curso: 'Refreshment', validade_dias: 1825, ativo: true },
  { id: 'CC-041', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321 NEO', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-042', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321 NEO', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-043', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321 NEO', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-044', grupo: 'Frota', frota: 'A320 Family', variante: 'A320F / 321 NEO', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota A330
  { id: 'CC-045', grupo: 'Frota', frota: 'A330', variante: 'A330', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-046', grupo: 'Frota', frota: 'A330', variante: 'A330', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-047', grupo: 'Frota', frota: 'A330', variante: 'A330', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-048', grupo: 'Frota', frota: 'A330', variante: 'A330', curso: 'Refreshment', validade_dias: 1825, ativo: true },
  { id: 'CC-049', grupo: 'Frota', frota: 'A330', variante: 'A330 NEO', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-050', grupo: 'Frota', frota: 'A330', variante: 'A330 NEO', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-051', grupo: 'Frota', frota: 'A330', variante: 'A330 NEO', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-052', grupo: 'Frota', frota: 'A330', variante: 'A330 NEO', curso: 'Refreshment', validade_dias: 1825, ativo: true },

  // Frota E190-E2
  { id: 'CC-053', grupo: 'Frota', frota: 'E190-E2', variante: 'E190E2', curso: 'Familiarization', validade_dias: 1825, ativo: true },
  { id: 'CC-054', grupo: 'Frota', frota: 'E190-E2', variante: 'E190E2', curso: 'Ramp & Transit', validade_dias: 1825, ativo: true },
  { id: 'CC-055', grupo: 'Frota', frota: 'E190-E2', variante: 'E190E2', curso: 'Line & Base', validade_dias: 1825, ativo: true },
  { id: 'CC-056', grupo: 'Frota', frota: 'E190-E2', variante: 'E190E2', curso: 'Refreshment', validade_dias: 1825, ativo: true },
];

export const INITIAL_ROSTER_CONFIG: ConfiguracaoRoster = {
  faixa_1: 30,
  faixa_2: 60,
  faixa_3: 90,
  data_referencia: new Date().toISOString().split('T')[0],
  responsavel_tecnico: 'Alysson Rabelo - Responsável Técnico Impacto Aviation',
  destacar_vencimentos_padrao: true,
  limite_linhas_pagina: 40,
};

export const INITIAL_ROSTER_USUARIOS: UsuarioRoster[] = [
  {
    id: 'USR-01',
    nome: 'Alysson Rabelo',
    email: 'alysson.rabelo@impactoaviation.com',
    perfil: 'Admin',
  },
  {
    id: 'USR-02',
    nome: 'Planejamento / PCP',
    email: 'pcp@impactoaviation.com',
    perfil: 'Editor',
  },
  {
    id: 'USR-03',
    nome: 'Garantia da Qualidade SGQ',
    email: 'qualidade@impactoaviation.com',
    perfil: 'Leitor',
  },
];

export function buildCleanRosterDatabase() {
  return {
    pessoas: [] as Pessoa[],
    bases: INITIAL_ROSTER_BASES,
    licencas: [] as Licenca[],
    cursosCatalogo: INITIAL_ROSTER_CURSOS,
    motoresCatalogo: INITIAL_ROSTER_MOTORES,
    treinamentos: [] as Treinamento[],
    treinamentosMotor: [] as TreinamentoMotor[],
    designacoesPessoa: [] as DesignacaoPessoa[],
    designacoesBase: [] as DesignacaoBase[],
    designacoesFuncao: [] as DesignacaoFuncao[],
    designacoesAeronave: [] as DesignacaoAeronave[],
    configuracao: INITIAL_ROSTER_CONFIG,
    usuarios: INITIAL_ROSTER_USUARIOS,
    auditoria: [],
  };
}
