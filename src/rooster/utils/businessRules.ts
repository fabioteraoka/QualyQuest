import { addDays, addMonths, differenceInCalendarDays, format, isValid, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AeronaveDesignacao,
  AlertaConferencia,
  Configuracao,
  CursoCatalogo,
  ItemStatus,
  Licenca,
  MotorCatalogo,
  Pessoa,
  SimNaoVazio,
  Treinamento,
} from '../types';

export const AERONAVE_PARA_FROTAS: Record<AeronaveDesignacao, string[]> = {
  B737: ['B737 Classic', 'B737 NG/MAX'],
  E190E2: ['E190-E2'],
  A320FAM: ['A320 Family'],
  A330: ['A330'],
  B767: ['B767'],
  B777: ['B777'],
};

export function formatarDataBr(dataIso: string | null | undefined): string {
  if (!dataIso) return '-';
  try {
    const d = parseISO(dataIso);
    if (!isValid(d)) return '-';
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

export function hojeISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function parseDataBrParaIso(dataBr: string): string | null {
  if (!dataBr || !dataBr.trim()) return null;
  const limpo = dataBr.trim();
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return limpo;
  // Parse dd/MM/yyyy
  const parsed = parse(limpo, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) {
    return format(parsed, 'yyyy-MM-dd');
  }
  // Try JS Date
  const d = new Date(limpo);
  if (isValid(d)) {
    return format(d, 'yyyy-MM-dd');
  }
  return null;
}

export function calcularVencimento(
  dataExecucao: string | null | undefined,
  validadeDias?: number | null,
  periodicidadeMeses?: number | null
): string | null {
  if (!dataExecucao || !dataExecucao.trim()) return null;
  if (validadeDias !== undefined && validadeDias !== null && validadeDias >= 36500) return null; // Sem vencimento
  try {
    const dataExec = parseISO(dataExecucao);
    if (!isValid(dataExec)) return null;
    
    // Adição de meses de calendário real (RBAC 121/145), sem aproximações arbitrárias de 30 dias
    if (typeof periodicidadeMeses === 'number' && periodicidadeMeses > 0) {
      const dataVenc = addMonths(dataExec, periodicidadeMeses);
      return format(dataVenc, 'yyyy-MM-dd');
    }

    if (typeof validadeDias === 'number' && validadeDias > 0) {
      const dataVenc = addDays(dataExec, validadeDias);
      return format(dataVenc, 'yyyy-MM-dd');
    }

    return null;
  } catch {
    return null;
  }
}

export function calcularDiasParaVencer(
  dataVencimento: string | null | undefined,
  dataReferencia: string
): number | null {
  if (!dataVencimento) return null;
  try {
    const venc = parseISO(dataVencimento);
    const ref = parseISO(dataReferencia);
    if (!isValid(venc) || !isValid(ref)) return null;
    return differenceInCalendarDays(venc, ref);
  } catch {
    return null;
  }
}

export function calcularStatus(
  dataVencimento: string | null | undefined,
  hasExecucao: boolean,
  isSemVencimento: boolean,
  dataReferencia: string,
  faixas: { faixa_1: number; faixa_2: number; faixa_3: number }
): ItemStatus {
  if (!hasExecucao) {
    return 'Sem registro';
  }

  if (isSemVencimento || !dataVencimento) {
    return 'Sem vencimento';
  }

  const dias = calcularDiasParaVencer(dataVencimento, dataReferencia);
  if (dias === null) {
    return 'Sem registro';
  }

  if (dias < 0) {
    return 'Vencido';
  }

  if (dias <= faixas.faixa_1) {
    return `Vence ≤${faixas.faixa_1}d` as ItemStatus;
  }

  if (dias <= faixas.faixa_2) {
    return `Vence ≤${faixas.faixa_2}d` as ItemStatus;
  }

  if (dias <= faixas.faixa_3) {
    return `Vence ≤${faixas.faixa_3}d` as ItemStatus;
  }

  return 'Em dia';
}

export function getStatusGravidade(status: ItemStatus): number {
  if (status === 'Vencido') return 8;
  if (status === 'Dados insuficientes') return 7;
  if (status === 'Sem validade definida') return 6;
  if (status.startsWith('Vence ≤') && (status.includes('30') || status.endsWith('1d'))) return 5;
  if (status.startsWith('Vence ≤') && (status.includes('60') || status.endsWith('2d'))) return 4;
  if (status.startsWith('Vence ≤')) return 3;
  if (status === 'Em dia') return 2;
  if (status === 'Sem vencimento') return 1;
  return 0; // Sem registro
}

export function piorStatus(statusList: ItemStatus[]): ItemStatus {
  if (!statusList || statusList.length === 0) return 'Sem registro';
  let maxGravidade = -1;
  let worst: ItemStatus = 'Sem registro';

  for (const s of statusList) {
    const grav = getStatusGravidade(s);
    if (grav > maxGravidade) {
      maxGravidade = grav;
      worst = s;
    }
  }

  return worst;
}

export interface StatusColors {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  badgeText: string;
}

export function getStatusColor(status: ItemStatus): StatusColors {
  if (status === 'Vencido') {
    return {
      bg: '#F4B6B6',
      text: '#7F0000',
      border: '#E37A7A',
      badgeBg: 'bg-red-100 text-red-900 border-red-300',
      badgeText: 'text-red-900',
    };
  }
  if (status === 'Dados insuficientes') {
    return {
      bg: '#F8CECC',
      text: '#B85450',
      border: '#E37A7A',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      badgeText: 'text-rose-900',
    };
  }
  if (status === 'Sem validade definida') {
    return {
      bg: '#FFF2CC',
      text: '#7F6000',
      border: '#D6B656',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      badgeText: 'text-amber-900',
    };
  }
  if (status.startsWith('Vence ≤') && (status.includes('30') || status.includes('faixa_1'))) {
    return {
      bg: '#F8CBAD',
      text: '#833C0B',
      border: '#E8A573',
      badgeBg: 'bg-orange-100 text-orange-950 border-orange-300',
      badgeText: 'text-orange-950',
    };
  }
  if (status.startsWith('Vence ≤') && (status.includes('60') || status.includes('faixa_2'))) {
    return {
      bg: '#FFE699',
      text: '#7F6000',
      border: '#E5C966',
      badgeBg: 'bg-yellow-100 text-yellow-950 border-yellow-300',
      badgeText: 'text-yellow-950',
    };
  }
  if (status.startsWith('Vence ≤')) {
    return {
      bg: '#FFF2CC',
      text: '#7F6000',
      border: '#EFE099',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeText: 'text-amber-900',
    };
  }
  if (status === 'Em dia') {
    return {
      bg: '#C6E0B4',
      text: '#375623',
      border: '#9EC486',
      badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      badgeText: 'text-emerald-950',
    };
  }
  if (status === 'Sem vencimento') {
    return {
      bg: '#DDEBF7',
      text: '#1F4E79',
      border: '#A7C7E7',
      badgeBg: 'bg-sky-100 text-sky-950 border-sky-300',
      badgeText: 'text-sky-950',
    };
  }
  // Sem registro
  return {
    bg: '#EDEDED',
    text: '#7F7F7F',
    border: '#D0D0D0',
    badgeBg: 'bg-slate-100 text-slate-600 border-slate-300',
    badgeText: 'text-slate-600',
  };
}

export function parseMotoresTexto(texto: string | undefined | null, catalogo: MotorCatalogo[]): string[] {
  if (!texto || !texto.trim()) return [];
  const normalized = texto
    .replace(/\r?\n/g, ', ')
    .replace(/&/g, ', ')
    .replace(/\//g, ', ')
    .replace(/;/g, ', ');

  const tokens = normalized
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const matchedIds = new Set<string>();

  for (const raw of tokens) {
    const clean = raw
      .toUpperCase()
      .replace(/LEAP\s+1B/g, 'LEAP-1B')
      .replace(/LEAP\s+1A/g, 'LEAP-1A')
      .replace(/GE\s+90/g, 'GE90')
      .replace(/PW\s*1100(G)?/g, 'PW1100G')
      .replace(/CFM\s*56\s*-?\s*3/g, 'CFM56-3')
      .replace(/CFM\s*56\s*-?\s*7B/g, 'CFM56-7B')
      .replace(/TRENT\s*7000/g, 'TRENT 7000')
      .replace(/TRENT\s*700/g, 'TRENT 700');

    for (const motor of catalogo) {
      if (motor.modelo && clean.includes(motor.modelo.toUpperCase())) {
        matchedIds.add(motor.id);
      } else if (!motor.modelo && clean === motor.fabricante.toUpperCase()) {
        matchedIds.add(motor.id);
      }
    }
  }

  return Array.from(matchedIds);
}

export function calcularStatusLicenca(licenca: Licenca, dataReferencia: string, config: Configuracao): ItemStatus {
  if (licenca.tipo === 'CCT' || licenca.tipo === 'AMP') {
    return 'Sem vencimento';
  }
  if (!licenca.data_vencimento) {
    return 'Sem registro';
  }
  return calcularStatus(
    licenca.data_vencimento,
    true,
    false,
    dataReferencia,
    config
  );
}

export const CONFIG_PADRAO: Configuracao = {
  faixa_1: 30,
  faixa_2: 60,
  faixa_3: 90,
  data_referencia: format(new Date(), 'yyyy-MM-dd'),
  responsavel_tecnico: 'Responsável Técnico SGQ',
  destacar_vencimentos_padrao: true,
  limite_linhas_pagina: 25,
};

export function calcularStatusTreinamento(
  treinamento: Treinamento,
  curso: CursoCatalogo | undefined,
  dataReferencia: string = hojeISO(),
  config: Configuracao = CONFIG_PADRAO
): { data_vencimento: string | null; dias_para_vencer: number | null; status: ItemStatus; isSemVencimento: boolean; motivoStatus?: string } {
  // Caso 1: Dados insuficientes (registro sem data de realização/execução informada)
  if (!treinamento.data_execucao || !treinamento.data_execucao.trim()) {
    return { data_vencimento: null, dias_para_vencer: null, status: 'Dados insuficientes', isSemVencimento: false, motivoStatus: 'Data de realização não informada' };
  }

  // Caso 2: Validade explícita informada no registro (ex: de certificado homologado ou registro formal)
  if (treinamento.data_validade && treinamento.data_validade.trim()) {
    const data_vencimento = treinamento.data_validade.trim();
    const dias_para_vencer = calcularDiasParaVencer(data_vencimento, dataReferencia);
    const status = calcularStatus(data_vencimento, true, false, dataReferencia, config);
    return { data_vencimento, dias_para_vencer, status, isSemVencimento: false };
  }

  // Caso 3: Curso ausente no catálogo -> Sem validade definida
  if (!curso) {
    return { data_vencimento: null, dias_para_vencer: null, status: 'Sem validade definida', isSemVencimento: false, motivoStatus: 'Curso não localizado no catálogo' };
  }

  // Caso 4: Sem vencimento aplicável, confirmado por regra cadastrada
  if (curso.sem_validade === true || (treinamento.validade_dias_override !== undefined && treinamento.validade_dias_override !== null && treinamento.validade_dias_override >= 36500)) {
    return { data_vencimento: null, dias_para_vencer: null, status: 'Sem vencimento', isSemVencimento: true, motivoStatus: 'Sem vencimento aplicável, confirmado por regra cadastrada' };
  }

  // Caso 5: Override explícito de validade no treinamento (dias)
  if (treinamento.validade_dias_override !== undefined && treinamento.validade_dias_override !== null && treinamento.validade_dias_override > 0) {
    const data_vencimento = calcularVencimento(treinamento.data_execucao, treinamento.validade_dias_override);
    const dias_para_vencer = data_vencimento ? calcularDiasParaVencer(data_vencimento, dataReferencia) : null;
    const status = calcularStatus(data_vencimento, true, false, dataReferencia, config);
    return { data_vencimento, dias_para_vencer, status, isSemVencimento: false };
  }

  // Caso 6: Regra de periodicidade por meses cadastrada no curso (ex: 12, 24, 36 meses - calendário real)
  if (typeof curso.periodicidade_meses === 'number' && curso.periodicidade_meses > 0) {
    const data_vencimento = calcularVencimento(treinamento.data_execucao, null, curso.periodicidade_meses);
    const dias_para_vencer = data_vencimento ? calcularDiasParaVencer(data_vencimento, dataReferencia) : null;
    const status = calcularStatus(data_vencimento, true, false, dataReferencia, config);
    return { data_vencimento, dias_para_vencer, status, isSemVencimento: false };
  }

  // Caso 7: Validade em dias cadastrada no curso
  if (typeof curso.validade_dias === 'number' && curso.validade_dias > 0) {
    const data_vencimento = calcularVencimento(treinamento.data_execucao, curso.validade_dias);
    const dias_para_vencer = data_vencimento ? calcularDiasParaVencer(data_vencimento, dataReferencia) : null;
    const status = calcularStatus(data_vencimento, true, false, dataReferencia, config);
    return { data_vencimento, dias_para_vencer, status, isSemVencimento: false };
  }

  // Caso 8: Curso sem periodicidade e sem regra de validade definida
  // A ausência de periodicidade NÃO pode ser interpretada automaticamente como ausência de vencimento!
  return {
    data_vencimento: null,
    dias_para_vencer: null,
    status: 'Sem validade definida',
    isSemVencimento: false,
    motivoStatus: 'Sem periodicidade ou validade definida no catálogo',
  };
}

export function conferirDesignacao(
  pessoaId: string,
  aeronave: AeronaveDesignacao,
  designacaoValor: SimNaoVazio,
  treinamentos: Treinamento[],
  cursosMap: Map<string, CursoCatalogo>,
  dataReferencia: string,
  config: Configuracao
): AlertaConferencia {
  const frotasAlvo = AERONAVE_PARA_FROTAS[aeronave] || [];

  const treinamentosDaAeronave = treinamentos.filter((t) => {
    if (t.pessoa_id !== pessoaId) return false;
    const curso = cursosMap.get(t.curso_id);
    return curso && frotasAlvo.includes(curso.frota);
  });

  const vigentes = treinamentosDaAeronave.filter((t) => {
    const curso = cursosMap.get(t.curso_id);
    const { status } = calcularStatusTreinamento(t, curso, dataReferencia, config);
    return status === 'Em dia' || status === 'Sem vencimento' || status.startsWith('Vence ≤');
  });

  if (designacaoValor === 'SIM') {
    if (vigentes.length > 0) return 'OK';
    if (treinamentosDaAeronave.length > 0) return 'Vencido';
    return 'Sem registro';
  }

  // Not designated (NÃO or empty)
  if (vigentes.length > 0) {
    return 'Vigente s/ designação';
  }

  return 'OK';
}
