import {
  Base,
  Configuracao,
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
  Usuario,
} from '../types';

export const INITIAL_BASES: Base[] = [
  { id: 'CNF', sigla: 'CNF', nome: 'Belo Horizonte / Confins', tipo: 'ESTACAO_LINHA', cidade: 'Confins', estado: 'MG', ativa: true },
  { id: 'GIG', sigla: 'GIG', nome: 'Rio de Janeiro / Galeão', tipo: 'ESTACAO_LINHA', cidade: 'Rio de Janeiro', estado: 'RJ', ativa: true },
  { id: 'GRU', sigla: 'GRU', nome: 'São Paulo / Guarulhos', tipo: 'SUB_BASE', cidade: 'Guarulhos', estado: 'SP', ativa: true },
  { id: 'REC', sigla: 'REC', nome: 'Recife / Hub Central', tipo: 'BASE_PRINCIPAL', cidade: 'Recife', estado: 'PE', ativa: true },
  { id: 'VCP', sigla: 'VCP', nome: 'Campinas / Viracopos', tipo: 'SUB_BASE', cidade: 'Campinas', estado: 'SP', ativa: true },
  { id: 'SOD', sigla: 'SOD', nome: 'Sorocaba / Hangar Manutenção', tipo: 'HANGAR', cidade: 'Sorocaba', estado: 'SP', ativa: true },
];

export const INITIAL_MOTORES: MotorCatalogo[] = [
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

export const INITIAL_CURSOS: CursoCatalogo[] = [
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

export const INITIAL_CONFIG: Configuracao = {
  faixa_1: 30,
  faixa_2: 60,
  faixa_3: 90,
  data_referencia: '2026-10-15',
  responsavel_tecnico: 'Alysson Rabelo - Technical Responsible',
  destacar_vencimentos_padrao: true,
  limite_linhas_pagina: 40,
};

export const INITIAL_USUARIOS: Usuario[] = [
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
    nome: 'Auditor de Qualidade',
    email: 'auditoria@impactoaviation.com',
    perfil: 'Leitor',
  },
];

/**
 * Returns a clean initial database with catalogs and configuration,
 * but 0 persons, 0 licenses, 0 trainings and 0 designations.
 * No synthetic or fictional mechanics are generated.
 */
export function buildInitialCleanDatabase() {
  return {
    pessoas: [] as Pessoa[],
    bases: INITIAL_BASES,
    licencas: [] as Licenca[],
    cursosCatalogo: INITIAL_CURSOS,
    motoresCatalogo: INITIAL_MOTORES,
    treinamentos: [] as Treinamento[],
    treinamentosMotor: [] as TreinamentoMotor[],
    designacoesPessoa: [] as DesignacaoPessoa[],
    designacoesBase: [] as DesignacaoBase[],
    designacoesFuncao: [] as DesignacaoFuncao[],
    designacoesAeronave: [] as DesignacaoAeronave[],
    configuracao: INITIAL_CONFIG,
    usuarios: INITIAL_USUARIOS,
  };
}

export function buildImpactoOfficialInitialDatabase() {
  const clean = buildInitialCleanDatabase();

  const pessoas: Pessoa[] = [
    {
      id: 'MEC-001',
      nome: 'Carlos Eduardo Silva',
      categoria: 'Mecânico',
      situacao: 'Ativo',
      base_principal_id: 'REC',
      cliente_ou_area: 'Manutenção de Linha / Trânsito',
      canac: '124859',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
    {
      id: 'MEC-002',
      nome: 'Marcelo Ferreira Santos',
      categoria: 'Mecânico',
      situacao: 'Ativo',
      base_principal_id: 'GRU',
      cliente_ou_area: 'Hangar & Linha Internacional',
      canac: '118472',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
    {
      id: 'MEC-003',
      nome: 'Juliana Almeida Rocha',
      categoria: 'Mecânico',
      situacao: 'Ativo',
      base_principal_id: 'CNF',
      cliente_ou_area: 'Manutenção de Linha',
      canac: '139501',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
    {
      id: 'MEC-004',
      nome: 'Rodrigo Neves Barbosa',
      categoria: 'Mecânico',
      situacao: 'Ativo',
      base_principal_id: 'REC',
      cliente_ou_area: 'Estruturas & Célula',
      canac: '145920',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
    {
      id: 'MEC-005',
      nome: 'Fernando Dias Toledo',
      categoria: 'Mecânico',
      situacao: 'Ativo',
      base_principal_id: 'VCP',
      cliente_ou_area: 'Linha Carga & Trânsito',
      canac: '160112',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
    {
      id: 'MEC-006',
      nome: 'André Souza Castro',
      categoria: 'Mecânico',
      situacao: 'Ativo',
      base_principal_id: 'GIG',
      cliente_ou_area: 'Linha Internacional',
      canac: '152309',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
    {
      id: 'ADM-001',
      nome: 'Patricia Lima Mendes',
      categoria: 'Administrativo',
      situacao: 'Ativo',
      base_principal_id: 'REC',
      cliente_ou_area: 'Planejamento e Controle (PCM)',
      canac: '',
      criado_em: '2024-01-10T08:00:00.000Z',
      atualizado_em: '2024-01-10T08:00:00.000Z',
      atualizado_por: 'Sistema',
    },
  ];

  const licencas: Licenca[] = [
    // Carlos Eduardo Silva
    { id: 'LIC-001', pessoa_id: 'MEC-001', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'CEL', numero: '124859', data_vencimento: null, data_expedicao: '2016-04-12', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-002', pessoa_id: 'MEC-001', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'GMP', numero: '124859', data_vencimento: null, data_expedicao: '2016-04-12', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-003', pessoa_id: 'MEC-001', orgao: 'ANAC', tipo: 'CHT', habilitacao: '', numero: '124859', data_vencimento: '2027-08-20', data_expedicao: '2022-08-20', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-004', pessoa_id: 'MEC-001', orgao: 'FAA', tipo: 'AMP', habilitacao: '', numero: 'A&P-3928190', data_vencimento: null, data_expedicao: '2019-11-05', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },

    // Marcelo Ferreira Santos
    { id: 'LIC-005', pessoa_id: 'MEC-002', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'AVI', numero: '118472', data_vencimento: null, data_expedicao: '2015-08-10', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-006', pessoa_id: 'MEC-002', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'CEL', numero: '118472', data_vencimento: null, data_expedicao: '2015-08-10', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-007', pessoa_id: 'MEC-002', orgao: 'ANAC', tipo: 'CHT', habilitacao: '', numero: '118472', data_vencimento: '2027-04-15', data_expedicao: '2022-04-15', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },

    // Juliana Almeida Rocha
    { id: 'LIC-008', pessoa_id: 'MEC-003', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'CEL', numero: '139501', data_vencimento: null, data_expedicao: '2018-09-01', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-009', pessoa_id: 'MEC-003', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'GMP', numero: '139501', data_vencimento: null, data_expedicao: '2018-09-01', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-010', pessoa_id: 'MEC-003', orgao: 'ANAC', tipo: 'CHT', habilitacao: '', numero: '139501', data_vencimento: '2026-11-20', data_expedicao: '2021-11-20', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },

    // Rodrigo Neves Barbosa
    { id: 'LIC-011', pessoa_id: 'MEC-004', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'CEL', numero: '145920', data_vencimento: null, data_expedicao: '2019-02-18', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-012', pessoa_id: 'MEC-004', orgao: 'ANAC', tipo: 'CHT', habilitacao: '', numero: '145920', data_vencimento: '2028-02-18', data_expedicao: '2023-02-18', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },

    // Fernando Dias Toledo
    { id: 'LIC-013', pessoa_id: 'MEC-005', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'GMP', numero: '160112', data_vencimento: null, data_expedicao: '2020-07-22', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-014', pessoa_id: 'MEC-005', orgao: 'ANAC', tipo: 'CHT', habilitacao: '', numero: '160112', data_vencimento: '2027-09-18', data_expedicao: '2022-09-18', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },

    // André Souza Castro
    { id: 'LIC-015', pessoa_id: 'MEC-006', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'CEL', numero: '152309', data_vencimento: null, data_expedicao: '2019-05-14', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-016', pessoa_id: 'MEC-006', orgao: 'ANAC', tipo: 'CCT', habilitacao: 'GMP', numero: '152309', data_vencimento: null, data_expedicao: '2019-05-14', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-017', pessoa_id: 'MEC-006', orgao: 'ANAC', tipo: 'CHT', habilitacao: '', numero: '152309', data_vencimento: '2027-03-22', data_expedicao: '2022-03-22', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
    { id: 'LIC-018', pessoa_id: 'MEC-006', orgao: 'FAA', tipo: 'AMP', habilitacao: '', numero: 'A&P-4102941', data_vencimento: null, data_expedicao: '2021-03-10', criado_em: '2024-01-10T08:00:00Z', atualizado_em: '2024-01-10T08:00:00Z', atualizado_por: 'Sistema' },
  ];

  const designacoesPessoa: DesignacaoPessoa[] = [
    { pessoa_id: 'MEC-001', imp: 'IMP-101', easa_type: 'SIM', incluir_na_lista: true, nome_na_lista: 'Carlos E. Silva' },
    { pessoa_id: 'MEC-002', imp: 'IMP-102', easa_type: 'SIM', incluir_na_lista: true, nome_na_lista: 'Marcelo F. Santos' },
    { pessoa_id: 'MEC-003', imp: 'IMP-103', easa_type: 'SIM', incluir_na_lista: true, nome_na_lista: 'Juliana A. Rocha' },
    { pessoa_id: 'MEC-004', imp: 'IMP-104', easa_type: 'NÃO', incluir_na_lista: true, nome_na_lista: 'Rodrigo N. Barbosa' },
    { pessoa_id: 'MEC-005', imp: 'IMP-105', easa_type: 'NÃO', incluir_na_lista: true, nome_na_lista: 'Fernando D. Toledo' },
    { pessoa_id: 'MEC-006', imp: 'IMP-106', easa_type: 'SIM', incluir_na_lista: true, nome_na_lista: 'André S. Castro' },
  ];

  const designacoesBase: DesignacaoBase[] = [
    { pessoa_id: 'MEC-001', base_id: 'REC' },
    { pessoa_id: 'MEC-001', base_id: 'GRU' },
    { pessoa_id: 'MEC-002', base_id: 'GRU' },
    { pessoa_id: 'MEC-002', base_id: 'VCP' },
    { pessoa_id: 'MEC-003', base_id: 'CNF' },
    { pessoa_id: 'MEC-003', base_id: 'GIG' },
    { pessoa_id: 'MEC-004', base_id: 'REC' },
    { pessoa_id: 'MEC-005', base_id: 'VCP' },
    { pessoa_id: 'MEC-006', base_id: 'GIG' },
    { pessoa_id: 'MEC-006', base_id: 'GRU' },
  ];

  const designacoesFuncao: DesignacaoFuncao[] = [
    // Carlos Eduardo Silva
    { pessoa_id: 'MEC-001', funcao: 'APRS', valor: 'SIM' },
    { pessoa_id: 'MEC-001', funcao: 'Inspetor', valor: 'SIM' },
    { pessoa_id: 'MEC-001', funcao: 'IIO', valor: 'SIM' },
    { pessoa_id: 'MEC-001', funcao: 'Supervisor', valor: 'SIM' },
    { pessoa_id: 'MEC-001', funcao: 'Executante', valor: 'SIM' },

    // Marcelo Ferreira Santos
    { pessoa_id: 'MEC-002', funcao: 'APRS', valor: 'SIM' },
    { pessoa_id: 'MEC-002', funcao: 'Inspetor', valor: 'SIM' },
    { pessoa_id: 'MEC-002', funcao: 'IIO', valor: 'SIM' },
    { pessoa_id: 'MEC-002', funcao: 'Supervisor', valor: 'SIM' },
    { pessoa_id: 'MEC-002', funcao: 'Executante', valor: 'SIM' },

    // Juliana Almeida Rocha
    { pessoa_id: 'MEC-003', funcao: 'APRS', valor: 'SIM' },
    { pessoa_id: 'MEC-003', funcao: 'Inspetor', valor: 'SIM' },
    { pessoa_id: 'MEC-003', funcao: 'IIO', valor: 'NÃO' },
    { pessoa_id: 'MEC-003', funcao: 'Supervisor', valor: 'SIM' },
    { pessoa_id: 'MEC-003', funcao: 'Executante', valor: 'SIM' },

    // Rodrigo Neves Barbosa
    { pessoa_id: 'MEC-004', funcao: 'APRS', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', funcao: 'Inspetor', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', funcao: 'IIO', valor: 'SIM' },
    { pessoa_id: 'MEC-004', funcao: 'Supervisor', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', funcao: 'Executante', valor: 'SIM' },

    // Fernando Dias Toledo
    { pessoa_id: 'MEC-005', funcao: 'APRS', valor: 'SIM' },
    { pessoa_id: 'MEC-005', funcao: 'Inspetor', valor: 'NÃO' },
    { pessoa_id: 'MEC-005', funcao: 'IIO', valor: 'NÃO' },
    { pessoa_id: 'MEC-005', funcao: 'Supervisor', valor: 'SIM' },
    { pessoa_id: 'MEC-005', funcao: 'Executante', valor: 'SIM' },

    // André Souza Castro
    { pessoa_id: 'MEC-006', funcao: 'APRS', valor: 'SIM' },
    { pessoa_id: 'MEC-006', funcao: 'Inspetor', valor: 'SIM' },
    { pessoa_id: 'MEC-006', funcao: 'IIO', valor: 'SIM' },
    { pessoa_id: 'MEC-006', funcao: 'Supervisor', valor: 'SIM' },
    { pessoa_id: 'MEC-006', funcao: 'Executante', valor: 'SIM' },
  ];

  const designacoesAeronave: DesignacaoAeronave[] = [
    // Carlos Eduardo Silva
    { pessoa_id: 'MEC-001', aeronave: 'B737', valor: 'SIM' },
    { pessoa_id: 'MEC-001', aeronave: 'A320FAM', valor: 'SIM' },
    { pessoa_id: 'MEC-001', aeronave: 'E190E2', valor: 'NÃO' },
    { pessoa_id: 'MEC-001', aeronave: 'A330', valor: 'NÃO' },
    { pessoa_id: 'MEC-001', aeronave: 'B767', valor: 'NÃO' },
    { pessoa_id: 'MEC-001', aeronave: 'B777', valor: 'NÃO' },

    // Marcelo Ferreira Santos
    { pessoa_id: 'MEC-002', aeronave: 'B737', valor: 'SIM' },
    { pessoa_id: 'MEC-002', aeronave: 'B767', valor: 'SIM' },
    { pessoa_id: 'MEC-002', aeronave: 'B777', valor: 'SIM' },
    { pessoa_id: 'MEC-002', aeronave: 'A320FAM', valor: 'NÃO' },
    { pessoa_id: 'MEC-002', aeronave: 'A330', valor: 'NÃO' },
    { pessoa_id: 'MEC-002', aeronave: 'E190E2', valor: 'NÃO' },

    // Juliana Almeida Rocha
    { pessoa_id: 'MEC-003', aeronave: 'A320FAM', valor: 'SIM' },
    { pessoa_id: 'MEC-003', aeronave: 'A330', valor: 'SIM' },
    { pessoa_id: 'MEC-003', aeronave: 'B737', valor: 'NÃO' },
    { pessoa_id: 'MEC-003', aeronave: 'B767', valor: 'NÃO' },
    { pessoa_id: 'MEC-003', aeronave: 'B777', valor: 'NÃO' },
    { pessoa_id: 'MEC-003', aeronave: 'E190E2', valor: 'NÃO' },

    // Rodrigo Neves Barbosa
    { pessoa_id: 'MEC-004', aeronave: 'E190E2', valor: 'SIM' },
    { pessoa_id: 'MEC-004', aeronave: 'B737', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', aeronave: 'A320FAM', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', aeronave: 'A330', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', aeronave: 'B767', valor: 'NÃO' },
    { pessoa_id: 'MEC-004', aeronave: 'B777', valor: 'NÃO' },

    // Fernando Dias Toledo
    { pessoa_id: 'MEC-005', aeronave: 'B737', valor: 'SIM' },
    { pessoa_id: 'MEC-005', aeronave: 'A320FAM', valor: 'NÃO' },
    { pessoa_id: 'MEC-005', aeronave: 'A330', valor: 'NÃO' },
    { pessoa_id: 'MEC-005', aeronave: 'B767', valor: 'NÃO' },
    { pessoa_id: 'MEC-005', aeronave: 'B777', valor: 'NÃO' },
    { pessoa_id: 'MEC-005', aeronave: 'E190E2', valor: 'NÃO' },

    // André Souza Castro
    { pessoa_id: 'MEC-006', aeronave: 'B767', valor: 'SIM' },
    { pessoa_id: 'MEC-006', aeronave: 'B777', valor: 'SIM' },
    { pessoa_id: 'MEC-006', aeronave: 'A330', valor: 'SIM' },
    { pessoa_id: 'MEC-006', aeronave: 'B737', valor: 'NÃO' },
    { pessoa_id: 'MEC-006', aeronave: 'A320FAM', valor: 'NÃO' },
    { pessoa_id: 'MEC-006', aeronave: 'E190E2', valor: 'NÃO' },
  ];

  const treinamentos: Treinamento[] = [
    // Carlos Eduardo Silva
    { id: 'TRN-001', pessoa_id: 'MEC-001', curso_id: 'CC-001', data_execucao: '2025-03-10', criado_em: '2025-03-10T10:00:00Z', atualizado_em: '2025-03-10T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-002', pessoa_id: 'MEC-001', curso_id: 'CC-007', data_execucao: '2024-06-15', criado_em: '2024-06-15T10:00:00Z', atualizado_em: '2024-06-15T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-003', pessoa_id: 'MEC-001', curso_id: 'CC-008', data_execucao: '2024-06-15', criado_em: '2024-06-15T10:00:00Z', atualizado_em: '2024-06-15T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-004', pessoa_id: 'MEC-001', curso_id: 'CC-011', data_execucao: '2023-05-20', motor_original: 'CFM56-7B', criado_em: '2023-05-20T10:00:00Z', atualizado_em: '2023-05-20T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-005', pessoa_id: 'MEC-001', curso_id: 'CC-039', data_execucao: '2023-10-18', motor_original: 'CFM56, LEAP-1A', criado_em: '2023-10-18T10:00:00Z', atualizado_em: '2023-10-18T10:00:00Z', atualizado_por: 'Sistema' },

    // Marcelo Ferreira Santos
    { id: 'TRN-006', pessoa_id: 'MEC-002', curso_id: 'CC-001', data_execucao: '2025-02-12', criado_em: '2025-02-12T10:00:00Z', atualizado_em: '2025-02-12T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-007', pessoa_id: 'MEC-002', curso_id: 'CC-007', data_execucao: '2024-04-10', criado_em: '2024-04-10T10:00:00Z', atualizado_em: '2024-04-10T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-008', pessoa_id: 'MEC-002', curso_id: 'CC-008', data_execucao: '2024-04-10', criado_em: '2024-04-10T10:00:00Z', atualizado_em: '2024-04-10T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-009', pessoa_id: 'MEC-002', curso_id: 'CC-011', data_execucao: '2023-04-14', motor_original: 'CFM56-7B', criado_em: '2023-04-14T10:00:00Z', atualizado_em: '2023-04-14T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-010', pessoa_id: 'MEC-002', curso_id: 'CC-031', data_execucao: '2023-07-22', motor_original: 'GE90', criado_em: '2023-07-22T10:00:00Z', atualizado_em: '2023-07-22T10:00:00Z', atualizado_por: 'Sistema' },

    // Juliana Almeida Rocha
    { id: 'TRN-011', pessoa_id: 'MEC-003', curso_id: 'CC-001', data_execucao: '2025-01-15', criado_em: '2025-01-15T10:00:00Z', atualizado_em: '2025-01-15T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-012', pessoa_id: 'MEC-003', curso_id: 'CC-007', data_execucao: '2024-03-20', criado_em: '2024-03-20T10:00:00Z', atualizado_em: '2024-03-20T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-013', pessoa_id: 'MEC-003', curso_id: 'CC-039', data_execucao: '2023-08-11', motor_original: 'LEAP-1A, V2500', criado_em: '2023-08-11T10:00:00Z', atualizado_em: '2023-08-11T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-014', pessoa_id: 'MEC-003', curso_id: 'CC-047', data_execucao: '2023-11-05', motor_original: 'TRENT 700', criado_em: '2023-11-05T10:00:00Z', atualizado_em: '2023-11-05T10:00:00Z', atualizado_por: 'Sistema' },

    // Rodrigo Neves Barbosa
    { id: 'TRN-015', pessoa_id: 'MEC-004', curso_id: 'CC-001', data_execucao: '2025-02-18', criado_em: '2025-02-18T10:00:00Z', atualizado_em: '2025-02-18T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-016', pessoa_id: 'MEC-004', curso_id: 'CC-055', data_execucao: '2023-09-02', motor_original: 'PW1100G', criado_em: '2023-09-02T10:00:00Z', atualizado_em: '2023-09-02T10:00:00Z', atualizado_por: 'Sistema' },

    // Fernando Dias Toledo
    { id: 'TRN-017', pessoa_id: 'MEC-005', curso_id: 'CC-001', data_execucao: '2025-04-05', criado_em: '2025-04-05T10:00:00Z', atualizado_em: '2025-04-05T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-018', pessoa_id: 'MEC-005', curso_id: 'CC-010', data_execucao: '2023-03-19', motor_original: 'CFM56-7B', criado_em: '2023-03-19T10:00:00Z', atualizado_em: '2023-03-19T10:00:00Z', atualizado_por: 'Sistema' },

    // André Souza Castro
    { id: 'TRN-019', pessoa_id: 'MEC-006', curso_id: 'CC-001', data_execucao: '2025-01-22', criado_em: '2025-01-22T10:00:00Z', atualizado_em: '2025-01-22T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-020', pessoa_id: 'MEC-006', curso_id: 'CC-031', data_execucao: '2023-06-14', motor_original: 'GE90', criado_em: '2023-06-14T10:00:00Z', atualizado_em: '2023-06-14T10:00:00Z', atualizado_por: 'Sistema' },
    { id: 'TRN-021', pessoa_id: 'MEC-006', curso_id: 'CC-047', data_execucao: '2023-10-30', motor_original: 'TRENT 700, TRENT 7000', criado_em: '2023-10-30T10:00:00Z', atualizado_em: '2023-10-30T10:00:00Z', atualizado_por: 'Sistema' },
  ];

  const treinamentosMotor: TreinamentoMotor[] = [
    { treinamento_id: 'TRN-004', motor_id: 'MC-016' }, // CFM56-7B
    { treinamento_id: 'TRN-005', motor_id: 'MC-009' }, // CFM56
    { treinamento_id: 'TRN-005', motor_id: 'MC-010' }, // LEAP-1A
    { treinamento_id: 'TRN-009', motor_id: 'MC-016' }, // CFM56-7B
    { treinamento_id: 'TRN-010', motor_id: 'MC-008' }, // GE90
    { treinamento_id: 'TRN-013', motor_id: 'MC-010' }, // LEAP-1A
    { treinamento_id: 'TRN-013', motor_id: 'MC-007' }, // V2500
    { treinamento_id: 'TRN-014', motor_id: 'MC-013' }, // TRENT 700
    { treinamento_id: 'TRN-016', motor_id: 'MC-011' }, // PW1100G
    { treinamento_id: 'TRN-018', motor_id: 'MC-016' }, // CFM56-7B
    { treinamento_id: 'TRN-020', motor_id: 'MC-008' }, // GE90
    { treinamento_id: 'TRN-021', motor_id: 'MC-013' }, // TRENT 700
    { treinamento_id: 'TRN-021', motor_id: 'MC-014' }, // TRENT 7000
  ];

  return {
    ...clean,
    pessoas,
    licencas,
    designacoesPessoa,
    designacoesBase,
    designacoesFuncao,
    designacoesAeronave,
    treinamentos,
    treinamentosMotor,
  };
}

export function getOfficialImpactoRawPayload(): any {
  const db = buildImpactoOfficialInitialDatabase();
  return {
    meta: {
      sistema: 'Impacto Aviation Roster MRO',
      versao_esquema: 1,
      gerado_em: new Date().toISOString(),
      observacao: 'Roster Oficial Impacto Aviation MRO - ANAC RBAC 145 / EASA',
      contagens: {
        base: db.bases.length,
        pessoa: db.pessoas.length,
        licenca: db.licencas.length,
        cursoCatalogo: db.cursosCatalogo.length,
        motorCatalogo: db.motoresCatalogo.length,
        treinamento: db.treinamentos.length,
        treinamentoMotor: db.treinamentosMotor.length,
        designacaoPessoa: db.designacoesPessoa.length,
        designacaoBase: db.designacoesBase.length,
        designacaoFuncao: db.designacoesFuncao.length,
        designacaoAeronave: db.designacoesAeronave.length,
      },
    },
    base: db.bases,
    pessoa: db.pessoas,
    licenca: db.licencas,
    cursoCatalogo: db.cursosCatalogo,
    motorCatalogo: db.motoresCatalogo,
    treinamento: db.treinamentos,
    treinamentoMotor: db.treinamentosMotor,
    designacaoPessoa: db.designacoesPessoa,
    designacaoBase: db.designacoesBase,
    designacaoFuncao: db.designacoesFuncao,
    designacaoAeronave: db.designacoesAeronave,
    configuracao: [db.configuracao],
    usuario: db.usuarios,
  };
}

// Deprecated alias for backwards compatibility
export const buildSeedDatabase = buildInitialCleanDatabase;

