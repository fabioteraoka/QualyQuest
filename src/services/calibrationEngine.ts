/**
 * QUALIGEST SGQ — MOTOR CENTRAL DE METROLOGIA & FERRAMENTAS
 * Lógica Central Unificada de Calibração, Recálculo Dinâmico,
 * Tratamento de Datas Brasileiras e Gestão Operacional (RBAC 145.109 / EASA)
 */

import { FerramentaCalibracao, UserProfile } from '../types';

export interface ResultadoValidacaoData {
  valida: boolean;
  isoString?: string;      // YYYY-MM-DD
  dataBR?: string;         // DD/MM/AAAA
  ambigua?: boolean;       // true se dia e mês forem ambíguos (<= 12)
  interpretacao?: string;  // Ex: "04 de maio de 2026 (DD/MM/AAAA)"
  mensagemErro?: string;
}

export interface PreviaRecalculoMetrologico {
  dataCalibracaoAtual: string;
  dataCalibracaoNova: string;
  frequenciaMesesAtual: number;
  frequenciaMesesNova: number;
  vencimentoAtual: string;
  vencimentoCalculado: string;
  statusAtual: FerramentaCalibracao['status'];
  statusPrevisto: FerramentaCalibracao['status'];
  saldoDiasAtual: number;
  saldoDiasPrevisto: number;
  divergenciaDetectada: boolean;
  mensagemDivergencia?: string;
  origemVencimento: 'CALCULADO_AUTOMATICO' | 'INFORMADO_MANUAL' | 'CORRECAO_HISTORICA';
}

export interface IndicadoresOperacionaisMetrologia {
  totalCadastradas: number;
  operacionaisDisponiveis: number; // Ativas, calibradas e fora de quarentena
  calibradas: number;
  proximasVencimento: number;
  vencidas: number;
  emQuarentena: number;
  inativas: number;
  semDataOuIncompletas: number;
  taxaConformidadeOperacional: number; // % sobre ativas
  totalCertificadosAnexados: number;
  taxaCoberturaCertificados: number;
}

/**
 * 1. TRATAMENTO E PARSER SEGURO DE DATAS
 * Não inverte Dia e Mês, suporta DD/MM/AAAA, AAAA-MM-DD, Seriais do Excel,
 * e evita drift de fuso horário.
 */

export function isAnoBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function obterUltimoDiaMes(ano: number, mes: number): number {
  switch (mes) {
    case 2:
      return isAnoBissexto(ano) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Converte data ISO YYYY-MM-DD para padrão brasileiro DD/MM/AAAA
 * sem usar Date() para evitar que fuso horário mude o dia.
 */
export function formatarDataBR(isoStr?: string | null): string {
  if (!isoStr) return '—';
  const str = String(isoStr).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return str;
}

/**
 * Parser de datas robusto que aceita múltiplos formatos e nunca inverte DD/MM.
 */
export function parseDataSegura(valor: any): ResultadoValidacaoData {
  if (valor === undefined || valor === null || valor === '') {
    return { valida: false, mensagemErro: 'Data não informada' };
  }

  // 1. Número serial do Excel (ex: 45520)
  if (typeof valor === 'number' || (/^\d{5}$/.test(String(valor).trim()) && Number(valor) > 25000 && Number(valor) < 70000)) {
    const num = Number(valor);
    // Excel epoch: 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + num * 86400000;
    const dt = new Date(ms);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return {
      valida: true,
      isoString,
      dataBR: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
      ambigua: false,
      interpretacao: `${d} de ${obterNomeMes(m)} de ${y} (Serial Excel)`,
    };
  }

  let str = String(valor).trim();

  // Limpa prefixos de timestamp se houver (ex: "2026-05-04T00:00:00.000Z" ou "04/05/2026 14:30")
  if (str.includes('T')) {
    str = str.split('T')[0].trim();
  } else if (str.includes(' ')) {
    str = str.split(' ')[0].trim();
  }

  // 2. Formato ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= obterUltimoDiaMes(y, m)) {
      const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        valida: true,
        isoString,
        dataBR: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
        ambigua: false,
        interpretacao: `${d} de ${obterNomeMes(m)} de ${y} (Padrão ISO)`,
      };
    }
    return { valida: false, mensagemErro: 'Dia ou mês fora do intervalo válido' };
  }

  // 3. Formato Brasileiro / Latino: DD/MM/AAAA ou DD-MM-AAAA ou DD.MM.AAAA
  const brMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (brMatch) {
    const d = Number(brMatch[1]);
    const m = Number(brMatch[2]);
    let y = Number(brMatch[3]);
    if (y < 100) {
      y += y >= 70 ? 1900 : 2000;
    }

    // Regra estrita: se d <= 12 e m <= 12, é potencialmente ambíguo,
    // MAS no contexto do QualiGest SGQ (sistema aeronáutico brasileiro) a regra padrão é DD/MM/AAAA.
    const ehAmbigua = d <= 12 && m <= 12 && d !== m;

    if (m >= 1 && m <= 12 && d >= 1 && d <= obterUltimoDiaMes(y, m)) {
      const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        valida: true,
        isoString,
        dataBR: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
        ambigua: ehAmbigua,
        interpretacao: `${d} de ${obterNomeMes(m)} de ${y} (DD/MM/AAAA)`,
      };
    } else if (d > 12 && m <= 12) {
      // Dia > 12 com certeza é DD/MM/AAAA
      if (d <= obterUltimoDiaMes(y, m)) {
        const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return {
          valida: true,
          isoString,
          dataBR: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
          ambigua: false,
          interpretacao: `${d} de ${obterNomeMes(m)} de ${y}`,
        };
      }
    }
  }

  // 4. Formatos com nomes de meses abreviados (ex: "15/Jan/2026", "28-Fev-2025")
  const mesTextoMatch = str.match(/^(\d{1,2})[\/\.\s-]+([a-zA-ZçÇãÃéÉ]+)[\/\.\s-]+(\d{2,4})$/);
  if (mesTextoMatch) {
    const d = Number(mesTextoMatch[1]);
    const nomeMes = mesTextoMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let y = Number(mesTextoMatch[3]);
    if (y < 100) y += y >= 70 ? 1900 : 2000;

    const mapaMeses: Record<string, number> = {
      jan: 1, janeiro: 1, january: 1,
      fev: 2, fevereiro: 2, feb: 2, february: 2,
      mar: 3, marco: 3, march: 3,
      abr: 4, abril: 4, apr: 4, april: 4,
      mai: 5, maio: 5, may: 5,
      jun: 6, junho: 6, june: 6,
      jul: 7, julho: 7, july: 7,
      ago: 8, agosto: 8, aug: 8, august: 8,
      set: 9, setembro: 9, sep: 9, september: 9,
      out: 10, outubro: 10, oct: 10, october: 10,
      nov: 11, novembro: 11, november: 11,
      dez: 12, dezembro: 12, dec: 12, december: 12,
    };

    const mesNum = mapaMeses[nomeMes] || mapaMeses[nomeMes.slice(0, 3)];
    if (mesNum && d >= 1 && d <= obterUltimoDiaMes(y, mesNum)) {
      const isoString = `${y}-${String(mesNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return {
        valida: true,
        isoString,
        dataBR: `${String(d).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}/${y}`,
        ambigua: false,
        interpretacao: `${d} de ${obterNomeMes(mesNum)} de ${y}`,
      };
    }
  }

  return { valida: false, mensagemErro: `Formato de data irreconhecível: "${str}"` };
}

function obterNomeMes(m: number): string {
  const nomes = [
    '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return nomes[m] || '';
}

/**
 * 2. CÁLCULO SEGURO DO PRÓXIMO VENCIMENTO METROLÓGICO
 * Respeita periodicidade em meses, controla virada de ano e ajuste
 * de meses com menos dias (ex: 31/01 -> 28/02 ou 29/02).
 */
export function calcularProximoVencimento(dataUltimaISO: string, frequenciaMeses: number): string {
  const parsed = parseDataSegura(dataUltimaISO);
  if (!parsed.valida || !parsed.isoString) {
    return new Date().toISOString().split('T')[0];
  }

  const [anoStr, mesStr, diaStr] = parsed.isoString.split('-');
  let ano = Number(anoStr);
  let mes = Number(mesStr);
  const diaOriginal = Number(diaStr);

  const freq = Math.max(1, Math.round(Number(frequenciaMeses) || 12));

  // Adiciona meses
  mes += freq;
  while (mes > 12) {
    mes -= 12;
    ano += 1;
  }

  // Limita o dia ao último dia do mês calculado
  const maxDias = obterUltimoDiaMes(ano, mes);
  const diaFinal = Math.min(diaOriginal, maxDias);

  return `${ano}-${String(mes).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
}

/**
 * Calcula saldo de dias entre hoje e a data de vencimento
 */
export function calcularSaldoDias(dataProximaISO?: string): number {
  if (!dataProximaISO) return -9999;
  const parsed = parseDataSegura(dataProximaISO);
  if (!parsed.valida || !parsed.isoString) return -9999;

  const hojeStr = new Date().toISOString().split('T')[0];
  const [y1, m1, d1] = hojeStr.split('-').map(Number);
  const [y2, m2, d2] = parsed.isoString.split('-').map(Number);

  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);

  return Math.round((t2 - t1) / 86400000);
}

/**
 * 3. DETERMINAÇÃO CENTRALIZADA DO STATUS METROLÓGICO
 * Regra Principal: Uma única lógica em todo o sistema.
 */
export function determinarStatusMetrologico(params: {
  dataProximaCalibracao?: string;
  dataUltimaCalibracao?: string;
  ativo?: boolean;
  statusManual?: string;
  diasAntecedenciaProxima?: number;
  divergenciaDetectada?: boolean;
}): {
  status: FerramentaCalibracao['status'];
  saldoDias: number;
  rotuloStatus: string;
  corBadge: string;
  corTexto: string;
  corBorda: string;
  corFundo: string;
  isOperacionalLiberada: boolean;
} {
  const {
    dataProximaCalibracao,
    dataUltimaCalibracao,
    ativo,
    statusManual,
    diasAntecedenciaProxima = 30,
    divergenciaDetectada,
  } = params;

  // 1. Ferramenta Inativa
  if (ativo === false || statusManual === 'INATIVA') {
    return {
      status: 'INATIVA',
      saldoDias: 0,
      rotuloStatus: 'Inativa (Fora de Operação)',
      corBadge: 'bg-slate-100 text-slate-600 border-slate-300',
      corTexto: 'text-slate-600',
      corBorda: 'border-slate-300',
      corFundo: 'bg-slate-50',
      isOperacionalLiberada: false,
    };
  }

  // 2. Quarentena (prioridade máxima sobre datas válidas)
  if (statusManual === 'QUARENTENA' || statusManual === 'QUARANTENA') {
    return {
      status: 'QUARENTENA',
      saldoDias: calcularSaldoDias(dataProximaCalibracao),
      rotuloStatus: 'Em Quarentena (Bloqueada)',
      corBadge: 'bg-purple-100 text-purple-800 border-purple-300',
      corTexto: 'text-purple-700',
      corBorda: 'border-purple-400',
      corFundo: 'bg-purple-50',
      isOperacionalLiberada: false,
    };
  }

  // 3. Descarte
  if (statusManual === 'DESCARTE') {
    return {
      status: 'DESCARTE',
      saldoDias: 0,
      rotuloStatus: 'Descarte Homologado',
      corBadge: 'bg-zinc-200 text-zinc-700 border-zinc-400',
      corTexto: 'text-zinc-700',
      corBorda: 'border-zinc-400',
      corFundo: 'bg-zinc-100',
      isOperacionalLiberada: false,
    };
  }

  // 4. Sem data informada
  if (!dataProximaCalibracao || !dataUltimaCalibracao) {
    return {
      status: 'SEM_DATA_INFORMADA',
      saldoDias: 0,
      rotuloStatus: 'Sem Data Confiável',
      corBadge: 'bg-orange-100 text-orange-800 border-orange-300',
      corTexto: 'text-orange-700',
      corBorda: 'border-orange-300',
      corFundo: 'bg-orange-50',
      isOperacionalLiberada: false,
    };
  }

  const saldoDias = calcularSaldoDias(dataProximaCalibracao);

  // 5. Vencida (Prioridade máxima de segurança sobre divergências)
  if (saldoDias <= 0) {
    return {
      status: 'VENCIDA',
      saldoDias,
      rotuloStatus: saldoDias < 0 ? `Vencida (${Math.abs(saldoDias)}d atrás)` : 'Vence Hoje',
      corBadge: 'bg-rose-100 text-rose-800 border-rose-300',
      corTexto: 'text-rose-700',
      corBorda: 'border-rose-400',
      corFundo: 'bg-rose-50',
      isOperacionalLiberada: false,
    };
  }

  // 6. Divergência detectada (instrumento ainda com saldo > 0, mas requer conferência de periodicidade)
  if (divergenciaDetectada) {
    return {
      status: 'PENDENTE_VERIFICACAO',
      saldoDias,
      rotuloStatus: 'Pendente Verificação (Divergência)',
      corBadge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      corTexto: 'text-yellow-700',
      corBorda: 'border-yellow-300',
      corFundo: 'bg-yellow-50',
      isOperacionalLiberada: false,
    };
  }

  // 7. Próxima do Vencimento
  if (saldoDias <= diasAntecedenciaProxima) {
    return {
      status: 'PROXIMA_VENCIMENTO',
      saldoDias,
      rotuloStatus: `Vence em ${saldoDias} dias`,
      corBadge: 'bg-amber-100 text-amber-800 border-amber-300',
      corTexto: 'text-amber-700',
      corBorda: 'border-amber-400',
      corFundo: 'bg-amber-50',
      isOperacionalLiberada: true, // Ainda liberada, mas com alerta
    };
  }

  // 8. Calibrada Regular
  return {
    status: 'CALIBRADA',
    saldoDias,
    rotuloStatus: `Calibrada (${saldoDias}d)`,
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    corTexto: 'text-emerald-700',
    corBorda: 'border-emerald-400',
    corFundo: 'bg-emerald-50',
    isOperacionalLiberada: true,
  };
}

/**
 * 4. RECÁLCULO AUTOMÁTICO COMPLETO DA FERRAMENTA
 * Produz a prévia para apresentação no modal antes de gravar.
 */
export function calcularPreviaRecalculo(
  ferramentaAtual: FerramentaCalibracao,
  novaDataCalibracao: string,
  novaFrequenciaMeses: number,
  novoVencimentoManual?: string
): PreviaRecalculoMetrologico {
  const parsedData = parseDataSegura(novaDataCalibracao);
  const dataFinalISO = parsedData.valida && parsedData.isoString ? parsedData.isoString : ferramentaAtual.dataUltimaCalibracao;
  const freqFinal = Math.max(1, Number(novaFrequenciaMeses) || 12);

  const vencimentoCalculado = calcularProximoVencimento(dataFinalISO, freqFinal);
  const vencimentoFinal = novoVencimentoManual && novoVencimentoManual.trim() ? novoVencimentoManual.trim() : vencimentoCalculado;

  // Verifica se o vencimento informado difere do calculado matematicamente
  let divergencia = false;
  let msgDiv: string | undefined = undefined;

  if (vencimentoFinal !== vencimentoCalculado) {
    divergencia = true;
    msgDiv = `Vencimento manual (${formatarDataBR(vencimentoFinal)}) diverge da fórmula (${formatarDataBR(vencimentoCalculado)}).`;
  }

  const saldoAtual = calcularSaldoDias(ferramentaAtual.dataProximaCalibracao);
  const saldoPrevisto = calcularSaldoDias(vencimentoFinal);

  const resStatusAtual = determinarStatusMetrologico({
    dataProximaCalibracao: ferramentaAtual.dataProximaCalibracao,
    dataUltimaCalibracao: ferramentaAtual.dataUltimaCalibracao,
    ativo: ferramentaAtual.ativo,
    statusManual: ferramentaAtual.status,
  });

  const resStatusPrevisto = determinarStatusMetrologico({
    dataProximaCalibracao: vencimentoFinal,
    dataUltimaCalibracao: dataFinalISO,
    ativo: ferramentaAtual.ativo,
    statusManual: ferramentaAtual.status === 'QUARENTENA' ? 'QUARENTENA' : undefined,
    divergenciaDetectada: divergencia,
  });

  return {
    dataCalibracaoAtual: ferramentaAtual.dataUltimaCalibracao,
    dataCalibracaoNova: dataFinalISO,
    frequenciaMesesAtual: ferramentaAtual.frequenciaMeses || 12,
    frequenciaMesesNova: freqFinal,
    vencimentoAtual: ferramentaAtual.dataProximaCalibracao,
    vencimentoCalculado: vencimentoFinal,
    statusAtual: resStatusAtual.status,
    statusPrevisto: resStatusPrevisto.status,
    saldoDiasAtual: saldoAtual,
    saldoDiasPrevisto: saldoPrevisto,
    divergenciaDetectada: divergencia,
    mensagemDivergencia: msgDiv,
    origemVencimento: divergencia ? 'INFORMADO_MANUAL' : 'CALCULADO_AUTOMATICO',
  };
}

/**
 * OPERAÇÃO A: EDITAR CADASTRO DA FERRAMENTA
 * Altera campos cadastrais sem criar evento fictício de calibração no histórico.
 */
export function executarEdicaoCadastro(
  ferramentaOriginal: FerramentaCalibracao,
  camposAlterados: Partial<FerramentaCalibracao>,
  usuario: UserProfile | null
): { ferramentaAtualizada: FerramentaCalibracao; resumoAlteracoes: string } {
  const novaData = camposAlterados.dataUltimaCalibracao || ferramentaOriginal.dataUltimaCalibracao;
  const novaFreq = camposAlterados.frequenciaMeses || ferramentaOriginal.frequenciaMeses || 12;

  // Recalcula datas e status
  const previa = calcularPreviaRecalculo(
    ferramentaOriginal,
    novaData,
    novaFreq,
    camposAlterados.dataProximaCalibracao
  );

  const statusManualPreservado =
    (camposAlterados.status === 'QUARENTENA' || camposAlterados.status === 'QUARANTENA' || ferramentaOriginal.status === 'QUARENTENA' || ferramentaOriginal.status === 'QUARANTENA')
      ? 'QUARENTENA'
      : (camposAlterados.status === 'INATIVA' || ferramentaOriginal.status === 'INATIVA')
      ? 'INATIVA'
      : (camposAlterados.status === 'DESCARTE' || ferramentaOriginal.status === 'DESCARTE')
      ? 'DESCARTE'
      : undefined;

  const statusFinal = determinarStatusMetrologico({
    dataProximaCalibracao: previa.vencimentoCalculado,
    dataUltimaCalibracao: previa.dataCalibracaoNova,
    ativo: camposAlterados.ativo !== undefined ? camposAlterados.ativo : ferramentaOriginal.ativo,
    statusManual: statusManualPreservado,
    divergenciaDetectada: previa.divergenciaDetectada,
  }).status;

  const alteracoesDetalhadas: Record<string, { anterior: any; novo: any }> = {};
  const chaves: (keyof FerramentaCalibracao)[] = [
    'codigoPatrimonio', 'descricao', 'fabricante', 'modelo', 'numeroSerie',
    'setor', 'localizacao', 'responsavelNome', 'frequenciaMeses', 'dataUltimaCalibracao',
    'dataProximaCalibracao', 'status', 'ativo', 'tolerancia', 'observacoes'
  ];

  chaves.forEach((k) => {
    if (camposAlterados[k] !== undefined && camposAlterados[k] !== ferramentaOriginal[k]) {
      alteracoesDetalhadas[k] = {
        anterior: ferramentaOriginal[k],
        novo: camposAlterados[k],
      };
    }
  });

  const historicoCadastral = ferramentaOriginal.historicoAlteracoesCadastrais || [];
  const novoRegistroCadastral = {
    id: `alt-${Date.now()}`,
    dataHora: new Date().toISOString(),
    usuarioNome: usuario?.displayName || usuario?.email || 'Usuário SGQ',
    usuarioUid: usuario?.uid,
    tipoOperacao: 'EDICAO_CADASTRO' as const,
    resumo: `Cadastro editado: ${Object.keys(alteracoesDetalhadas).join(', ') || 'Nenhuma alteração'}`,
    detalhes: alteracoesDetalhadas,
  };

  const ferramentaAtualizada: FerramentaCalibracao = {
    ...ferramentaOriginal,
    ...camposAlterados,
    dataUltimaCalibracao: previa.dataCalibracaoNova,
    dataProximaCalibracao: previa.vencimentoCalculado,
    frequenciaMeses: previa.frequenciaMesesNova,
    origemVencimento: previa.origemVencimento,
    divergenciaMetrologicaDetectada: previa.divergenciaDetectada,
    mensagemDivergencia: previa.mensagemDivergencia,
    status: statusFinal,
    historicoAlteracoesCadastrais: [novoRegistroCadastral, ...historicoCadastral],
    atualizadoEm: new Date().toISOString(),
  };

  return {
    ferramentaAtualizada,
    resumoAlteracoes: novoRegistroCadastral.resumo,
  };
}

/**
 * OPERAÇÃO B: REGISTRAR NOVA CALIBRAÇÃO
 * Registra calibração realizada, adiciona novo evento ao histórico e atualiza dados vigentes.
 */
export function executarNovaCalibracao(
  ferramentaOriginal: FerramentaCalibracao,
  dadosCalib: {
    data: string;
    certificado: string;
    laboratorio: string;
    validadeAte?: string;
    observacao?: string;
    certificadoAnexo?: FerramentaCalibracao['certificadoAnexo'];
  },
  usuario: UserProfile | null
): FerramentaCalibracao {
  const parsedData = parseDataSegura(dadosCalib.data);
  const dataCalibISO = parsedData.valida && parsedData.isoString ? parsedData.isoString : new Date().toISOString().split('T')[0];
  const freq = ferramentaOriginal.frequenciaMeses || 12;

  // Próximo vencimento calculado automaticamente a menos que explicitamente indicado
  const validadeCalculada = calcularProximoVencimento(dataCalibISO, freq);
  const validadeFinal = dadosCalib.validadeAte && dadosCalib.validadeAte.trim()
    ? dadosCalib.validadeAte.trim()
    : validadeCalculada;

  const divergencia = validadeFinal !== validadeCalculada;

  const statusCalculado = determinarStatusMetrologico({
    dataProximaCalibracao: validadeFinal,
    dataUltimaCalibracao: dataCalibISO,
    ativo: ferramentaOriginal.ativo,
    statusManual: ferramentaOriginal.status === 'QUARENTENA' ? 'QUARENTENA' : undefined,
    divergenciaDetectada: divergencia,
  }).status;

  const novoEventoHistorico = {
    id: `calib-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    data: dataCalibISO,
    certificado: dadosCalib.certificado.trim(),
    laboratorio: dadosCalib.laboratorio.trim(),
    validadeAte: validadeFinal,
    observacao: dadosCalib.observacao?.trim() || 'Calibração periódica RBC registrada',
    registradoPor: usuario?.displayName || usuario?.email || 'Inspetor Metrologia',
    registradoEm: new Date().toISOString(),
    certificadoAnexo: dadosCalib.certificadoAnexo,
  };

  const historicoAntigo = ferramentaOriginal.historicoCalibracoes || [];
  const historicoCadastral = ferramentaOriginal.historicoAlteracoesCadastrais || [];

  const novoRegistroCadastral = {
    id: `alt-calib-${Date.now()}`,
    dataHora: new Date().toISOString(),
    usuarioNome: usuario?.displayName || usuario?.email || 'Inspetor Metrologia',
    usuarioUid: usuario?.uid,
    tipoOperacao: 'NOVA_CALIBRACAO' as const,
    resumo: `Nova calibração registrada: Certificado ${dadosCalib.certificado} (${dadosCalib.laboratorio}) com validade até ${formatarDataBR(validadeFinal)}`,
  };

  return {
    ...ferramentaOriginal,
    dataUltimaCalibracao: dataCalibISO,
    dataProximaCalibracao: validadeFinal,
    numeroCertificado: dadosCalib.certificado.trim(),
    laboratorioCalibrador: dadosCalib.laboratorio.trim(),
    status: statusCalculado,
    origemVencimento: divergencia ? 'INFORMADO_MANUAL' : 'CALCULADO_AUTOMATICO',
    divergenciaMetrologicaDetectada: divergencia,
    mensagemDivergencia: divergencia ? `Vencimento manual (${formatarDataBR(validadeFinal)}) difere do prazo regulamentar (${formatarDataBR(validadeCalculada)}).` : undefined,
    certificadoAnexo: dadosCalib.certificadoAnexo || ferramentaOriginal.certificadoAnexo,
    evidenciaCertificadoUrl: dadosCalib.certificadoAnexo?.urlOuBase64 || ferramentaOriginal.evidenciaCertificadoUrl,
    historicoCalibracoes: [novoEventoHistorico, ...historicoAntigo],
    historicoAlteracoesCadastrais: [novoRegistroCadastral, ...historicoCadastral],
    atualizadoEm: new Date().toISOString(),
  };
}

/**
 * OPERAÇÃO C: CORRIGIR CALIBRAÇÃO OU DATA JÁ REGISTRADA
 * Permite consertar erro em data ou certificado com justificativa mandatória,
 * preservando rastreabilidade e recalculando os dados vigentes.
 */
export function executarCorrecaoCalibracao(
  ferramentaOriginal: FerramentaCalibracao,
  dadosCorrecao: {
    eventoHistoricoId?: string; // Se omitido, corrige a calibração vigente atual
    novaDataCalibracao: string;
    novoCertificado?: string;
    novoLaboratorio?: string;
    novoVencimento?: string;
    motivoJustificativa: string;
    novoCertificadoAnexo?: FerramentaCalibracao['certificadoAnexo'];
  },
  usuario: UserProfile | null
): { ferramentaAtualizada: FerramentaCalibracao; sucesso: boolean; mensagem: string } {
  if (!dadosCorrecao.motivoJustificativa || dadosCorrecao.motivoJustificativa.trim().length < 5) {
    return {
      ferramentaAtualizada: ferramentaOriginal,
      sucesso: false,
      mensagem: 'Justificativa mandatória deve conter ao menos 5 caracteres para fins de Audit Trail.',
    };
  }

  const parsedData = parseDataSegura(dadosCorrecao.novaDataCalibracao);
  if (!parsedData.valida || !parsedData.isoString) {
    return {
      ferramentaAtualizada: ferramentaOriginal,
      sucesso: false,
      mensagem: 'Data de calibração corrigida é inválida.',
    };
  }

  const novaDataISO = parsedData.isoString;
  const freq = ferramentaOriginal.frequenciaMeses || 12;
  const vencimentoCalculado = calcularProximoVencimento(novaDataISO, freq);
  const vencimentoFinal = dadosCorrecao.novoVencimento && dadosCorrecao.novoVencimento.trim()
    ? dadosCorrecao.novoVencimento.trim()
    : vencimentoCalculado;

  const divergencia = vencimentoFinal !== vencimentoCalculado;

  const statusCalculado = determinarStatusMetrologico({
    dataProximaCalibracao: vencimentoFinal,
    dataUltimaCalibracao: novaDataISO,
    ativo: ferramentaOriginal.ativo,
    statusManual: ferramentaOriginal.status === 'QUARENTENA' ? 'QUARENTENA' : undefined,
    divergenciaDetectada: divergencia,
  }).status;

  // Atualiza no histórico de calibrações
  const historicoAntigo = [...(ferramentaOriginal.historicoCalibracoes || [])];
  const targetId = dadosCorrecao.eventoHistoricoId;

  let registroCorrigidoIdx = targetId ? historicoAntigo.findIndex((h) => h.id === targetId) : 0;
  if (registroCorrigidoIdx < 0 && historicoAntigo.length > 0) {
    registroCorrigidoIdx = 0;
  }

  const valoresAnteriores: Record<string, any> = {
    data: ferramentaOriginal.dataUltimaCalibracao,
    validadeAte: ferramentaOriginal.dataProximaCalibracao,
    certificado: ferramentaOriginal.numeroCertificado,
    laboratorio: ferramentaOriginal.laboratorioCalibrador,
  };

  if (registroCorrigidoIdx >= 0 && historicoAntigo[registroCorrigidoIdx]) {
    const itemAntigo = historicoAntigo[registroCorrigidoIdx];
    valoresAnteriores.data = itemAntigo.data;
    valoresAnteriores.validadeAte = itemAntigo.validadeAte;
    valoresAnteriores.certificado = itemAntigo.certificado;
    valoresAnteriores.laboratorio = itemAntigo.laboratorio;

    historicoAntigo[registroCorrigidoIdx] = {
      ...itemAntigo,
      data: novaDataISO,
      validadeAte: vencimentoFinal,
      certificado: dadosCorrecao.novoCertificado?.trim() || itemAntigo.certificado,
      laboratorio: dadosCorrecao.novoLaboratorio?.trim() || itemAntigo.laboratorio,
      certificadoAnexo: dadosCorrecao.novoCertificadoAnexo || itemAntigo.certificadoAnexo,
      foiCorrigido: true,
      corrigidoEm: new Date().toISOString(),
      corrigidoPor: usuario?.displayName || usuario?.email || 'Gestor SGQ',
      motivoCorrecao: dadosCorrecao.motivoJustificativa.trim(),
      valoresAnteriores,
    };
  }

  const historicoCadastral = ferramentaOriginal.historicoAlteracoesCadastrais || [];
  const novoRegistroCadastral = {
    id: `corr-${Date.now()}`,
    dataHora: new Date().toISOString(),
    usuarioNome: usuario?.displayName || usuario?.email || 'Gestor SGQ',
    usuarioUid: usuario?.uid,
    tipoOperacao: 'CORRECAO_DATA' as const,
    resumo: `Correção de calibração: Data alterada de ${formatarDataBR(valoresAnteriores.data)} para ${formatarDataBR(novaDataISO)}. Vencimento recalculado para ${formatarDataBR(vencimentoFinal)}. Motivo: ${dadosCorrecao.motivoJustificativa}`,
    motivo: dadosCorrecao.motivoJustificativa.trim(),
    detalhes: {
      dataUltimaCalibracao: { anterior: valoresAnteriores.data, novo: novaDataISO },
      dataProximaCalibracao: { anterior: valoresAnteriores.validadeAte, novo: vencimentoFinal },
    },
  };

  const ferramentaAtualizada: FerramentaCalibracao = {
    ...ferramentaOriginal,
    dataUltimaCalibracao: novaDataISO,
    dataProximaCalibracao: vencimentoFinal,
    numeroCertificado: dadosCorrecao.novoCertificado?.trim() || ferramentaOriginal.numeroCertificado,
    laboratorioCalibrador: dadosCorrecao.novoLaboratorio?.trim() || ferramentaOriginal.laboratorioCalibrador,
    status: statusCalculado,
    origemVencimento: 'CORRECAO_HISTORICA',
    divergenciaMetrologicaDetectada: divergencia,
    mensagemDivergencia: divergencia ? `Vencimento manual (${formatarDataBR(vencimentoFinal)}) difere da regra de ${freq} meses (${formatarDataBR(vencimentoCalculado)}).` : undefined,
    certificadoAnexo: dadosCorrecao.novoCertificadoAnexo || ferramentaOriginal.certificadoAnexo,
    evidenciaCertificadoUrl: dadosCorrecao.novoCertificadoAnexo?.urlOuBase64 || ferramentaOriginal.evidenciaCertificadoUrl,
    historicoCalibracoes: historicoAntigo,
    historicoAlteracoesCadastrais: [novoRegistroCadastral, ...historicoCadastral],
    atualizadoEm: new Date().toISOString(),
  };

  return {
    ferramentaAtualizada,
    sucesso: true,
    mensagem: `Calibração corrigida com sucesso! Novo vencimento calculado: ${formatarDataBR(vencimentoFinal)} (${statusCalculado}).`,
  };
}

/**
 * 5. CÁLCULO DE INDICADORES OPERACIONAIS CENTRALIZADOS
 */
export function calcularIndicadoresOperacionaisMetrologia(
  ferramentas: FerramentaCalibracao[]
): IndicadoresOperacionaisMetrologia {
  let totalCadastradas = ferramentas.length;
  let operacionaisDisponiveis = 0;
  let calibradas = 0;
  let proximasVencimento = 0;
  let vencidas = 0;
  let emQuarentena = 0;
  let inativas = 0;
  let semDataOuIncompletas = 0;
  let totalCertificadosAnexados = 0;

  ferramentas.forEach((f) => {
    const isAtivo = f.ativo !== false;
    const temAnexo = Boolean(
      f.certificadoAnexo?.urlOuBase64 ||
      f.certificadoAnexo?.nomeArquivo ||
      f.evidenciaCertificadoUrl
    );
    if (temAnexo) totalCertificadosAnexados++;

    if (!isAtivo) {
      inativas++;
      return;
    }

    if (f.status === 'QUARENTENA') {
      emQuarentena++;
      return;
    }

    if (!f.dataUltimaCalibracao || !f.dataProximaCalibracao) {
      semDataOuIncompletas++;
      return;
    }

    // Calcula status real pelo motor
    const st = determinarStatusMetrologico({
      dataProximaCalibracao: f.dataProximaCalibracao,
      dataUltimaCalibracao: f.dataUltimaCalibracao,
      ativo: f.ativo,
      statusManual: f.status,
    });

    if (st.status === 'VENCIDA') {
      vencidas++;
    } else if (st.status === 'PROXIMA_VENCIMENTO') {
      proximasVencimento++;
      operacionaisDisponiveis++;
    } else if (st.status === 'CALIBRADA') {
      calibradas++;
      operacionaisDisponiveis++;
    }
  });

  const ativasTotal = totalCadastradas - inativas;
  const taxaConformidade = ativasTotal > 0 ? Math.round((operacionaisDisponiveis / ativasTotal) * 100) : 100;
  const taxaCobertura = ativasTotal > 0 ? Math.round((totalCertificadosAnexados / ativasTotal) * 100) : 100;

  return {
    totalCadastradas,
    operacionaisDisponiveis,
    calibradas,
    proximasVencimento,
    vencidas,
    emQuarentena,
    inativas,
    semDataOuIncompletas,
    taxaConformidadeOperacional: taxaConformidade,
    totalCertificadosAnexados,
    taxaCoberturaCertificados: taxaCobertura,
  };
}
