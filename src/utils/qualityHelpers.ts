import { 
  AvaliacaoRisco, 
  NCRecord, 
  AlertaItem, 
  NivelRisco, 
  NivelSuporteDocumental, 
  TipoDocumento, 
  StatusVigenciaDocumento, 
  StatusGeralNC,
  ManualRecord,
  VersaoDocumentoConfig,
  OrganizationSLAConfig,
  StatusColaborador,
  ColaboradorPessoa,
  ConsolidadoMatrizRisco5x5,
  CelulaMatrizRisco5x5,
  ItemRNCMatrizRisco,
  MapaMatrizRisco5x5,
} from '../types';
import { normalizarStatusColaborador } from './smartImportEngine';

export const SEVERIDADES = [
  { valor: '1', label: '1 - Catastrófica', desc: 'Impacto severo na segurança/aeronavegabilidade ou paralisação' },
  { valor: '2', label: '2 - Crítica', desc: 'Não conformidade maior em auditoria regulatória (FAA/ANAC)' },
  { valor: '3', label: '3 - Moderada', desc: 'Desvio operacional com retrabalho ou impacto de processo' },
  { valor: '4', label: '4 - Menor', desc: 'Desvio pontual sem impacto na segurança ou entrega' },
  { valor: '5', label: '5 - Insignificante', desc: 'Oportunidade de melhoria ou ajuste documental simples' },
];

export const PROBABILIDADES = [
  { valor: 'A', label: 'A - Frequente', desc: 'Ocorre com alta regularidade' },
  { valor: 'B', label: 'B - Provável', desc: 'Pode ocorrer várias vezes no ciclo' },
  { valor: 'C', label: 'C - Remoto', desc: 'Ocorre esporadicamente entre bases' },
  { valor: 'D', label: 'D - Improvável', desc: 'Pouco provável de acontecer' },
  { valor: 'E', label: 'E - Extremamente Improvável', desc: 'Quase impossível de ocorrer' },
];

export function calcularNivelRisco(severidade: string, probabilidade: string): NivelRisco {
  const code = `${severidade}${probabilidade}`.toUpperCase();
  const criticos = ['1A', '1B', '1C', '2A', '2B', '3A'];
  const altos = ['1D', '2C', '3B', '4A'];
  const medios = ['1E', '2D', '2E', '3C', '3D', '4B', '4C', '5A', '5B'];

  if (criticos.includes(code)) return 'Crítico';
  if (altos.includes(code)) return 'Alto';
  if (medios.includes(code)) return 'Médio';
  return 'Baixo';
}

export function obterCorRisco(nivel: NivelRisco | string): { bg: string; text: string; border: string; badgeBg: string } {
  switch (nivel) {
    case 'Crítico':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', badgeBg: 'bg-rose-600 text-white' };
    case 'Alto':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', badgeBg: 'bg-amber-500 text-white' };
    case 'Médio':
      return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300', badgeBg: 'bg-yellow-500 text-slate-900' };
    case 'Baixo':
    default:
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', badgeBg: 'bg-emerald-600 text-white' };
  }
}

/**
 * Retorna as propriedades visuais e semânticas padronizadas do status de colaborador
 * Regra de Ouro: Identificação visual inequívoca (🟢 ATIVO, 🔵 EM TREINAMENTO, 🟡 RESTRITO, etc.)
 */
export function obterConfiguracaoStatusColaborador(status?: StatusColaborador | string): {
  status: StatusColaborador;
  label: string;
  badgeClass: string;
  iconeEmoji: string;
  corTexto: string;
  corBg: string;
  corBorda: string;
  descricao: string;
} {
  const norm = String(status || '').trim().toUpperCase();

  switch (norm) {
    case 'ATIVO':
      return {
        status: 'ATIVO',
        label: 'Ativo',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        iconeEmoji: '🟢',
        corTexto: 'text-emerald-700',
        corBg: 'bg-emerald-50',
        corBorda: 'border-emerald-300',
        descricao: 'Colaborador com vínculo ativo e disponibilidade operacional regular',
      };
    case 'EM_TREINAMENTO':
    case 'EM TREINAMENTO':
    case 'TREINAMENTO':
      return {
        status: 'EM_TREINAMENTO',
        label: 'Em Treinamento',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-300',
        iconeEmoji: '🔵',
        corTexto: 'text-sky-700',
        corBg: 'bg-sky-50',
        corBorda: 'border-sky-300',
        descricao: 'Período de capacitação supervisionada ou formação técnica',
      };
    case 'RESTRITO':
      return {
        status: 'RESTRITO',
        label: 'Restrito',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        iconeEmoji: '🟡',
        corTexto: 'text-amber-800',
        corBg: 'bg-amber-50',
        corBorda: 'border-amber-300',
        descricao: 'Possui restrição médica ou técnica delimitando seu escopo de atuação',
      };
    case 'SUSPENSO':
      return {
        status: 'SUSPENSO',
        label: 'Suspenso',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300',
        iconeEmoji: '🔴',
        corTexto: 'text-rose-700',
        corBg: 'bg-rose-50',
        corBorda: 'border-rose-300',
        descricao: 'Suspensão preventiva ou disciplinar com bloqueio operacional imediato',
      };
    case 'AFASTADO':
      return {
        status: 'AFASTADO',
        label: 'Afastado',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-300',
        iconeEmoji: '🟣',
        corTexto: 'text-purple-700',
        corBg: 'bg-purple-50',
        corBorda: 'border-purple-300',
        descricao: 'Afastamento temporário por licença médica, benefício previdenciário ou cessão',
      };
    case 'DESLIGADO':
      return {
        status: 'DESLIGADO',
        label: 'Desligado',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-400',
        iconeEmoji: '⚫',
        corTexto: 'text-slate-800',
        corBg: 'bg-slate-100',
        corBorda: 'border-slate-400',
        descricao: 'Colaborador desligado da organização (registro mantido para histórico e rastreabilidade)',
      };
    case 'INATIVO':
      return {
        status: 'INATIVO',
        label: 'Inativo (Histórico)',
        badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
        iconeEmoji: '🔘',
        corTexto: 'text-zinc-700',
        corBg: 'bg-zinc-100',
        corBorda: 'border-zinc-300',
        descricao: 'Registro inativo pré-existente (compatibilidade legada)',
      };
    case 'STATUS_NAO_INFORMADO':
    case 'NAO_INFORMADO':
    case 'NÃO INFORMADO':
    case 'SEM STATUS':
    case 'SEM_STATUS':
      return {
        status: 'STATUS_NAO_INFORMADO',
        label: 'Não Informado',
        badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
        iconeEmoji: '⚠️',
        corTexto: 'text-amber-900',
        corBg: 'bg-amber-50',
        corBorda: 'border-amber-300',
        descricao: 'Status operacional não informado no cadastro original (requer classificação)',
      };
    case 'OUTRO':
    default:
      return {
        status: 'OUTRO',
        label: status ? String(status) : 'Outro / Não Definido',
        badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
        iconeEmoji: '⚪',
        corTexto: 'text-slate-600',
        corBg: 'bg-slate-50',
        corBorda: 'border-slate-200',
        descricao: 'Status administrativo não categorizado no rol principal',
      };
  }
}

export interface DistribuicaoStatusOficial {
  ATIVO: number;
  EM_TREINAMENTO: number;
  RESTRITO: number;
  SUSPENSO: number;
  AFASTADO: number;
  DESLIGADO: number;
  INATIVO: number;
  STATUS_NAO_INFORMADO: number;
  OUTRO: number;
  TODOS: number;
}

/**
 * Função ÚNICA E CENTRALIZADA para contabilização oficial de colaboradores por status
 * Consumida obrigatoriamente por: Dashboard, Lista, Filtros, Dossiê 360°, PPT e Cabeçalhos.
 * Proibido assumir status ausente = ATIVO. Colaboradores sem status são classificados como STATUS_NAO_INFORMADO.
 */
export function contabilizarColaboradoresPorStatus(
  colaboradores: ColaboradorPessoa[]
): DistribuicaoStatusOficial {
  const counts: DistribuicaoStatusOficial = {
    ATIVO: 0,
    EM_TREINAMENTO: 0,
    RESTRITO: 0,
    SUSPENSO: 0,
    AFASTADO: 0,
    DESLIGADO: 0,
    INATIVO: 0,
    STATUS_NAO_INFORMADO: 0,
    OUTRO: 0,
    TODOS: colaboradores ? colaboradores.length : 0,
  };

  if (!colaboradores || colaboradores.length === 0) {
    return counts;
  }

  colaboradores.forEach((p) => {
    const st = normalizarStatusColaborador(p.status);
    if (counts[st] !== undefined) {
      counts[st]++;
    } else {
      counts.OUTRO++;
    }
  });

  return counts;
}

/**
 * Função central e ÚNICA FONTE DE VERDADE para a Matriz de Risco 5x5
 * Utilizada rigorosamente tanto pelo Dashboard (RiskMatrixWidget) quanto pelo gerador PPTX.
 * Origem estrita: NCRecord.avaliacaoRiscoInicial (severidade + probabilidade).
 */
export function consolidarRNCsPorMatrizRisco(records: NCRecord[]): ConsolidadoMatrizRisco5x5 {
  const mapaProbNum: Record<string, string> = {
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
    '5': 'E',
  };

  // Inicializa o mapa com todas as 25 células da matriz 5x5
  const matriz: MapaMatrizRisco5x5 = {};
  SEVERIDADES.forEach((s) => {
    PROBABILIDADES.forEach((p) => {
      const codigo = `${s.valor}${p.valor}`.toUpperCase();
      const nivel = calcularNivelRisco(s.valor, p.valor);
      matriz[codigo] = {
        codigo,
        severidade: s.valor,
        probabilidade: p.valor,
        nivel,
        quantidade: 0,
        rncs: [],
      };
    });
  });

  let totalRNCsAvaliadas = 0;
  let totalSemAvaliacao = 0;

  records.forEach((record) => {
    const aval = record.avaliacaoRiscoInicial;
    if (!aval) {
      totalSemAvaliacao++;
      return;
    }

    let codigo = aval.codigo ? String(aval.codigo).trim().toUpperCase() : '';

    if (!codigo && aval.severidade && aval.probabilidade) {
      let sevStr = String(aval.severidade).trim();
      let probStr = String(aval.probabilidade).trim().toUpperCase();
      if (mapaProbNum[probStr]) {
        probStr = mapaProbNum[probStr];
      }
      codigo = `${sevStr}${probStr}`;
    }

    // Se a célula existe na matriz de 25 posições
    if (codigo && matriz[codigo]) {
      const celula = matriz[codigo];
      celula.quantidade++;
      totalRNCsAvaliadas++;

      const itemRNC: ItemRNCMatrizRisco = {
        id: record.id,
        numero: record.numeroNC || record.id,
        titulo: record.titulo || record.descricaoNC || 'Desvio sem descrição',
        setor: record.setor,
        status: record.statusGeral || 'Aberta',
        severidade: celula.severidade,
        probabilidade: celula.probabilidade,
        nivel: celula.nivel,
      };

      celula.rncs.push(itemRNC);
    } else {
      totalSemAvaliacao++;
    }
  });

  // Totais por nível de risco agregados diretamente da matriz consolidada
  let totalCriticos = 0;
  let totalAltos = 0;
  let totalMedios = 0;
  let totalBaixos = 0;

  Object.values(matriz).forEach((c) => {
    if (c.nivel === 'Crítico') totalCriticos += c.quantidade;
    else if (c.nivel === 'Alto') totalAltos += c.quantidade;
    else if (c.nivel === 'Médio') totalMedios += c.quantidade;
    else if (c.nivel === 'Baixo') totalBaixos += c.quantidade;
  });

  // Lista de células que possuem pelo menos 1 RNC, ordenadas por criticidade
  const ordemNivel: Record<NivelRisco, number> = {
    'Crítico': 4,
    'Alto': 3,
    'Médio': 2,
    'Baixo': 1,
  };

  const celulasComRNCs = Object.values(matriz)
    .filter((c) => c.quantidade > 0)
    .sort((a, b) => {
      const nivelDiff = ordemNivel[b.nivel] - ordemNivel[a.nivel];
      if (nivelDiff !== 0) return nivelDiff;
      return b.quantidade - a.quantidade;
    });

  return {
    matriz,
    totalRNCsAvaliadas,
    totalSemAvaliacao,
    totalCriticos,
    totalAltos,
    totalMedios,
    totalBaixos,
    celulasComRNCs,
  };
}

export function obterCorStatus(status: StatusGeralNC | string): { bg: string; text: string; dot: string; label: string } {
  switch (status) {
    case 'Rascunho':
      return { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', label: 'Rascunho' };
    case 'Aberta':
      return { bg: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-500', label: 'Aberta' };
    case 'Em Investigação':
    case 'Em Análise de Causa':
      return { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500', label: 'Em Investigação' };
    case 'Em Contenção':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Em Contenção' };
    case 'Ação Corretiva':
    case 'Ação em Andamento':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Ação Corretiva' };
    case 'Aguardando Eficácia':
      return { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500', label: 'Aguardando Eficácia' };
    case 'Aguardando Aprovação':
      return { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500', label: 'Aguardando Aprovação' };
    case 'Encerrada':
      return { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600', label: 'Encerrada' };
    case 'Rejeitada':
      return { bg: 'bg-rose-100', text: 'text-rose-800', dot: 'bg-rose-600', label: 'Rejeitada' };
    case 'Cancelada':
      return { bg: 'bg-neutral-200', text: 'text-neutral-700', dot: 'bg-neutral-500', label: 'Cancelada' };
    case 'Suspensa':
      return { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500', label: 'Suspensa' };
    case 'Reaberta':
      return { bg: 'bg-orange-100', text: 'text-orange-900', dot: 'bg-orange-600', label: 'Reaberta' };
    case 'Atrasada':
      return { bg: 'bg-rose-100', text: 'text-rose-900', dot: 'bg-rose-600', label: 'Atrasada' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-800', dot: 'bg-slate-500', label: status };
  }
}

/**
 * Retorna os estilos visuais para os níveis qualitativos de suporte documental (Seção 6)
 */
export function obterEstiloSuporteDocumental(nivel?: NivelSuporteDocumental | string): {
  bg: string;
  text: string;
  border: string;
  label: string;
  descricao: string;
} {
  switch (nivel) {
    case 'Evidência forte':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
        label: 'Evidência forte',
        descricao: 'Comprovada por requisito normativo cadastrado e evidência objetiva direta.',
      };
    case 'Evidência moderada':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-300',
        label: 'Evidência moderada',
        descricao: 'Enquadramento consistente, porém pendente de checagem complementar in loco.',
      };
    case 'Evidência limitada':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        label: 'Evidência limitada',
        descricao: 'Fato relatado não cita código de instrumento, lote ou data precisa.',
      };
    case 'Evidência insuficiente':
    default:
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        label: 'Evidência insuficiente',
        descricao: 'Requisito não localizado na base cadastrada ou evidências inconclusivas.',
      };
  }
}

/**
 * Retorna os estilos visuais para a vigência documental (Seção 2 & Seção 3)
 */
export function obterEstiloVigencia(status?: StatusVigenciaDocumento | string): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'Vigente':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Vigente' };
    case 'Em Revisão':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Em Revisão' };
    case 'Obsoleto':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Obsoleto' };
    case 'Vigência não determinada — requer validação humana':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', label: 'Vigência não determinada — requer validação humana' };
    case 'Vigência não verificada':
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: status || 'Vigência não verificada' };
  }
}

/**
 * Retorna os estilos para tipos de documentos (Seção 2)
 */
export function obterEstiloTipoDocumento(tipo?: TipoDocumento | string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (tipo) {
    case 'Documento Normativo Oficial':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'Manual Interno':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'Procedimento (POP)':
      return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
    case 'Instrução de Trabalho (IT)':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
    case 'Evidência':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'Informação de IA':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  }
}

export function formatarData(dataStr?: string): string {
  if (!dataStr) return '-';
  if (dataStr.includes('-')) {
    const [year, month, day] = dataStr.split('T')[0].split('-');
    if (year && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return dataStr;
}

export function formatarDataHora(dataHoraStr?: string): string {
  if (!dataHoraStr) return '-';
  try {
    const d = new Date(dataHoraStr);
    if (isNaN(d.getTime())) return dataHoraStr;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataHoraStr;
  }
}

export function calcularDiasRestantes(prazoStr: string): number {
  if (!prazoStr) return 999;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let targetDate: Date;
  if (prazoStr.includes('/')) {
    const parts = prazoStr.split('/');
    if (parts.length === 3) {
      targetDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      targetDate = new Date(prazoStr);
    }
  } else {
    targetDate = new Date(prazoStr);
  }

  if (isNaN(targetDate.getTime())) return 999;

  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validação rigorosa para fechamento / encerramento de Não Conformidade
 */
export function validarEncerramentoNC(nc: NCRecord): { valido: boolean; erros: string[] } {
  const erros: string[] = [];

  if (!nc.acaoCorretiva?.descricao || nc.acaoCorretiva.descricao.trim().length < 10) {
    erros.push('Ação Corretiva deve estar preenchida e detalhada.');
  }

  if (nc.acaoCorretiva?.status !== 'Concluída') {
    erros.push('O status da Ação Corretiva deve ser "Concluída".');
  }

  if (!nc.verificacaoEficacia?.dataVerificacao) {
    erros.push('A data de verificação de eficácia deve estar preenchida.');
  }

  if (!nc.verificacaoEficacia?.auditorVerificador) {
    erros.push('O auditor responsável pela verificação de eficácia deve estar identificado.');
  }

  if (!nc.verificacaoEficacia?.avaliacaoRiscoResidual?.codigo) {
    erros.push('A avaliação de Risco Residual pós-ação deve estar definida na matriz 5x5.');
  }

  if (nc.verificacaoEficacia?.encerrado !== 'SIM') {
    erros.push('O parecer de encerramento da eficácia deve estar marcado como "SIM".');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

export function gerarAlertas(ncs: NCRecord[], slas?: OrganizationSLAConfig): AlertaItem[] {
  const alertas: AlertaItem[] = [];

  ncs.forEach((nc) => {
    // 1. Consideração rigorosa da Data de Encerramento e Status Formal
    const isEncerrada =
      Boolean(nc.dataEncerramento) ||
      nc.statusGeral === 'Encerrada' ||
      nc.verificacaoEficacia?.encerrado === 'SIM';

    const isCanceladaOuRejeitada = nc.statusGeral === 'Cancelada' || nc.statusGeral === 'Rejeitada';
    if (isEncerrada || isCanceladaOuRejeitada) {
      return;
    }

    const nivelRisco = nc.avaliacaoRiscoInicial?.nivel || 'Médio';
    
    // Identificação de tratativa concluída / fase de eficácia
    const isAguardandoEficacia =
      nc.statusGeral === 'Aguardando Eficácia' ||
      nc.acaoCorretiva?.status === 'Concluída' ||
      Boolean(nc.dataConclusaoTratamento);

    // 1. FLUXO DE EFICÁCIA (Tratamento já concluído, controle exclusivo da análise/comprovação de eficácia)
    if (isAguardandoEficacia) {
      // Se a auditoria de eficácia já foi executada/comprovada, não gera alerta de atraso
      const eficaciaJaComprovada =
        Boolean(nc.verificacaoEficacia?.dataVerificacao) ||
        nc.verificacaoEficacia?.resultado === 'EFICAZ';

      if (eficaciaJaComprovada) {
        return;
      }

      const dataPrazoEficacia = nc.prazoEficacia || nc.verificacaoEficacia?.prazoEficacia || nc.verificacaoEficacia?.dataPrevista;
      
      let diasEficacia: number;
      let prazoFormatado: string;

      if (dataPrazoEficacia) {
        diasEficacia = calcularDiasRestantes(dataPrazoEficacia);
        prazoFormatado = dataPrazoEficacia;
      } else {
        const baseData = nc.acaoCorretiva?.dataConclusao || nc.dataConclusaoTratamento || nc.dataIdentificacao || nc.criadoEm;
        const baseDt = new Date(baseData);
        const dtDefault = new Date(baseDt.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        diasEficacia = calcularDiasRestantes(dtDefault);
        prazoFormatado = dtDefault;
      }

      if (diasEficacia < 0) {
        alertas.push({
          id: `alerta-${nc.id}-eficacia-vencida`,
          ncId: nc.id,
          numeroNC: nc.numeroNC,
          titulo: nc.titulo,
          tipoAlerta: 'EFICACIA_VENCIDA',
          subtipoPrazo: 'EFICACIA',
          prazoEficacia: prazoFormatado,
          diasRestantes: diasEficacia,
          prazo: prazoFormatado,
          responsavel: nc.verificacaoEficacia?.auditorVerificador || nc.auditor || 'Auditor SGQ',
          auditor: nc.auditor,
          nivelRisco,
          mensagem: `Comprovação da Eficácia da NC ${nc.numeroNC} está VENCIDA há ${Math.abs(diasEficacia)} dia(s) (${formatarData(prazoFormatado)}). Auditor deve avaliar as ações e formalizar o laudo.`,
        });
      } else if (diasEficacia <= 7) {
        alertas.push({
          id: `alerta-${nc.id}-eficacia-proxima`,
          ncId: nc.id,
          numeroNC: nc.numeroNC,
          titulo: nc.titulo,
          tipoAlerta: 'EFICACIA_PROXIMA',
          subtipoPrazo: 'EFICACIA',
          prazoEficacia: prazoFormatado,
          diasRestantes: diasEficacia,
          prazo: prazoFormatado,
          responsavel: nc.verificacaoEficacia?.auditorVerificador || nc.auditor || 'Auditor SGQ',
          auditor: nc.auditor,
          nivelRisco,
          mensagem: `Análise de Eficácia da NC ${nc.numeroNC} vence em ${diasEficacia} dia(s) (${formatarData(prazoFormatado)}).`,
        });
      } else {
        alertas.push({
          id: `alerta-${nc.id}-eficacia-agendada`,
          ncId: nc.id,
          numeroNC: nc.numeroNC,
          titulo: nc.titulo,
          tipoAlerta: 'AGUARDANDO_EFICACIA',
          subtipoPrazo: 'EFICACIA',
          prazoEficacia: prazoFormatado,
          diasRestantes: diasEficacia,
          prazo: prazoFormatado,
          responsavel: nc.verificacaoEficacia?.auditorVerificador || nc.auditor || 'Auditor SGQ',
          auditor: nc.auditor,
          nivelRisco,
          mensagem: `Tratativa concluída no prazo. Auditoria de eficácia programada para ${formatarData(prazoFormatado)} (${diasEficacia}d restantes).`,
        });
      }

      // Finaliza este item para não disparar alerta falso de vencimento do tratamento
      return;
    }

    // 2. FLUXO DE RESPOSTA / TRATAMENTO DA NC (Aberta, Em Análise, Ação em Andamento)
    const dias = calcularDiasRestantes(nc.prazoResposta);

    // Verificação de SLA por prioridade de risco se configurado no tenant
    if (slas) {
      const dataCriacaoOuIdentificacao = nc.dataIdentificacao || nc.criadoEm;
      if (dataCriacaoOuIdentificacao) {
        const dataInicio = new Date(dataCriacaoOuIdentificacao);
        const agora = new Date();
        const diffHoras = (agora.getTime() - dataInicio.getTime()) / (1000 * 60 * 60);
        const diffDias = diffHoras / 24;

        if (nivelRisco === 'Crítico' && slas.p1Horas && diffHoras > slas.p1Horas && nc.statusGeral === 'Aberta') {
          alertas.push({
            id: `alerta-${nc.id}-sla-p1`,
            ncId: nc.id,
            numeroNC: nc.numeroNC,
            titulo: nc.titulo,
            tipoAlerta: 'VENCIDA',
            subtipoPrazo: 'TRATAMENTO',
            diasRestantes: Math.round(-diffDias),
            prazo: nc.prazoResposta,
            responsavel: nc.acaoCorretiva?.responsavel || 'Não atribuído',
            auditor: nc.auditor,
            nivelRisco,
            mensagem: `SLA P1 Excedido: NC Crítica ${nc.numeroNC} ultrapassou o limite contratual de ${slas.p1Horas}h (${Math.round(diffHoras)}h decorridas).`,
          });
        } else if (nivelRisco === 'Alto' && slas.p2Horas && diffHoras > slas.p2Horas && nc.statusGeral === 'Aberta') {
          alertas.push({
            id: `alerta-${nc.id}-sla-p2`,
            ncId: nc.id,
            numeroNC: nc.numeroNC,
            titulo: nc.titulo,
            tipoAlerta: 'VENCIDA',
            subtipoPrazo: 'TRATAMENTO',
            diasRestantes: Math.round(-diffDias),
            prazo: nc.prazoResposta,
            responsavel: nc.acaoCorretiva?.responsavel || 'Não atribuído',
            auditor: nc.auditor,
            nivelRisco,
            mensagem: `SLA P2 Excedido: NC de Alto Risco ${nc.numeroNC} ultrapassou o limite de ${slas.p2Horas}h.`,
          });
        }
      }
    }

    if (dias < 0) {
      alertas.push({
        id: `alerta-${nc.id}-overdue`,
        ncId: nc.id,
        numeroNC: nc.numeroNC,
        titulo: nc.titulo,
        tipoAlerta: 'VENCIDA',
        subtipoPrazo: 'TRATAMENTO',
        diasRestantes: dias,
        prazo: nc.prazoResposta,
        responsavel: nc.acaoCorretiva?.responsavel || nc.preAnaliseContencao?.responsavel || 'Não atribuído',
        auditor: nc.auditor,
        nivelRisco,
        mensagem: `Prazo de Resposta / Tratamento da NC ${nc.numeroNC} expirou há ${Math.abs(dias)} dia(s) (${formatarData(nc.prazoResposta)}). Ação requerida urgente!`,
      });
    } else if (dias === 0) {
      alertas.push({
        id: `alerta-${nc.id}-today`,
        ncId: nc.id,
        numeroNC: nc.numeroNC,
        titulo: nc.titulo,
        tipoAlerta: 'VENCE_HOJE',
        subtipoPrazo: 'TRATAMENTO',
        diasRestantes: 0,
        prazo: nc.prazoResposta,
        responsavel: nc.acaoCorretiva?.responsavel || 'Não atribuído',
        auditor: nc.auditor,
        nivelRisco: nc.avaliacaoRiscoInicial?.nivel || 'Médio',
        mensagem: `Atenção: O prazo de resposta / tratamento da NC ${nc.numeroNC} vence HOJE!`,
      });
    } else if (dias <= 7) {
      alertas.push({
        id: `alerta-${nc.id}-7d`,
        ncId: nc.id,
        numeroNC: nc.numeroNC,
        titulo: nc.titulo,
        tipoAlerta: 'VENCE_7_DIAS',
        subtipoPrazo: 'TRATAMENTO',
        diasRestantes: dias,
        prazo: nc.prazoResposta,
        responsavel: nc.acaoCorretiva?.responsavel || 'Não atribuído',
        auditor: nc.auditor,
        nivelRisco: nc.avaliacaoRiscoInicial?.nivel || 'Médio',
        mensagem: `Prazo de tratamento prestes a expirar em ${dias} dia(s) (${formatarData(nc.prazoResposta)}).`,
      });
    } else if (dias <= 15) {
      alertas.push({
        id: `alerta-${nc.id}-15d`,
        ncId: nc.id,
        numeroNC: nc.numeroNC,
        titulo: nc.titulo,
        tipoAlerta: 'VENCE_15_DIAS',
        subtipoPrazo: 'TRATAMENTO',
        diasRestantes: dias,
        prazo: nc.prazoResposta,
        responsavel: nc.acaoCorretiva?.responsavel || 'Não atribuído',
        auditor: nc.auditor,
        nivelRisco: nc.avaliacaoRiscoInicial?.nivel || 'Médio',
        mensagem: `Vencimento do tratamento em ${dias} dias. Verifique o andamento do plano de ação.`,
      });
    }
  });

  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Determina a versão/revisão normativa aplicável com base na data da ocorrência/identificação da NC (Ponto 6).
 * Se a ocorrência se deu antes de uma nova revisão entrar em vigor, retorna a revisão vigente na época.
 */
export interface ResultadoVersaoAplicavel {
  manualCodigo: string;
  revisaoAplicavelNaData: string;
  revisaoAtualVigente: string;
  dataOcorrenciaReferencia: string;
  ehRevisaoAtual: boolean;
  statusVigenciaNaData: StatusVigenciaDocumento;
  observacaoTemporal: string;
  fonteVersao: string;
}

export function obterVersaoNormativaAplicavel(
  manual?: ManualRecord,
  dataOcorrencia?: string
): ResultadoVersaoAplicavel {
  const manualCodigo = manual?.codigo || 'SGQ';
  const revisaoAtual = manual?.revisao || 'Não cadastrada';
  const dataRef = dataOcorrencia ? dataOcorrencia.split('T')[0] : new Date().toISOString().split('T')[0];
  const versoes = manual?.versoesConfiguracao || [];

  if (!manual) {
    return {
      manualCodigo: 'Não identificado',
      revisaoAplicavelNaData: 'Vigência não determinada — requer validação humana',
      revisaoAtualVigente: 'Não cadastrada',
      dataOcorrenciaReferencia: dataRef,
      ehRevisaoAtual: false,
      statusVigenciaNaData: 'Vigência não determinada — requer validação humana',
      observacaoTemporal: 'Documento normativo não localizado no acervo. Vigência não determinada — requer validação humana.',
      fonteVersao: 'Não identificada',
    };
  }

  // Se o manual possuir configurações estruturadas de versão temporal
  if (versoes.length > 0) {
    // Busca versão onde inicioVigencia <= dataRef e (!fimVigencia ou fimVigencia >= dataRef)
    const versaoCorrespondente = versoes.find((v) => {
      const inicio = v.inicioVigencia;
      const fim = v.fimVigencia;
      if (inicio && dataRef < inicio) return false;
      if (fim && dataRef > fim) return false;
      return true;
    });

    if (versaoCorrespondente) {
      const ehAtual = versaoCorrespondente.revisaoOuEmenda.trim().toLowerCase() === revisaoAtual.trim().toLowerCase();
      const observacao = ehAtual
        ? `Na data de referência (${formatarData(dataRef)}), a versão vigente era a ${versaoCorrespondente.revisaoOuEmenda}, que corresponde à versão atual cadastrada.`
        : `ATENÇÃO: Na data da ocorrência (${formatarData(dataRef)}), a versão aplicável era a ${versaoCorrespondente.revisaoOuEmenda} (vigente de ${formatarData(versaoCorrespondente.inicioVigencia)} até ${versaoCorrespondente.fimVigencia ? formatarData(versaoCorrespondente.fimVigencia) : 'atual'}). A versão atual do acervo é a ${revisaoAtual}.`;

      return {
        manualCodigo,
        revisaoAplicavelNaData: versaoCorrespondente.revisaoOuEmenda,
        revisaoAtualVigente: revisaoAtual,
        dataOcorrenciaReferencia: dataRef,
        ehRevisaoAtual: ehAtual,
        statusVigenciaNaData: versaoCorrespondente.status || (ehAtual ? 'Vigente' : 'Obsoleto'),
        observacaoTemporal: observacao,
        fonteVersao: versaoCorrespondente.fonte || manual.fonte || 'SGQ Interno',
      };
    }

    // Se data for anterior à primeira versão registrada
    const primeiraVersao = [...versoes].sort((a, b) => (a.inicioVigencia || '').localeCompare(b.inicioVigencia || ''))[0];
    if (primeiraVersao && dataRef < (primeiraVersao.inicioVigencia || '')) {
      return {
        manualCodigo,
        revisaoAplicavelNaData: 'Vigência não determinada — requer validação humana',
        revisaoAtualVigente: revisaoAtual,
        dataOcorrenciaReferencia: dataRef,
        ehRevisaoAtual: false,
        statusVigenciaNaData: 'Vigência não determinada — requer validação humana',
        observacaoTemporal: `A data da ocorrência (${formatarData(dataRef)}) é anterior ao início da primeira revisão catalogada (${primeiraVersao.revisaoOuEmenda} em ${formatarData(primeiraVersao.inicioVigencia)}). Vigência não determinada — requer validação humana.`,
        fonteVersao: manual.fonte || 'SGQ Interno',
      };
    }

    // Se não for possível determinar inequivocamente entre as versões
    return {
      manualCodigo,
      revisaoAplicavelNaData: 'Vigência não determinada — requer validação humana',
      revisaoAtualVigente: revisaoAtual,
      dataOcorrenciaReferencia: dataRef,
      ehRevisaoAtual: false,
      statusVigenciaNaData: 'Vigência não determinada — requer validação humana',
      observacaoTemporal: `Não foi possível determinar inequivocamente a versão normativa aplicável na data ${formatarData(dataRef)} para o documento ${manualCodigo}. Vigência não determinada — requer validação humana.`,
      fonteVersao: manual.fonte || 'SGQ Interno',
    };
  }

  // Se o manual tiver dataVigencia e a data da ocorrência estiver no período comprovado
  if (manual.dataVigencia && dataRef >= manual.dataVigencia && (!manual.dataFimVigencia || dataRef <= manual.dataFimVigencia)) {
    return {
      manualCodigo,
      revisaoAplicavelNaData: manual.revisao || 'Rev. 01',
      revisaoAtualVigente: manual.revisao || 'Rev. 01',
      dataOcorrenciaReferencia: dataRef,
      ehRevisaoAtual: true,
      statusVigenciaNaData: (manual.status as any) || 'Vigente',
      observacaoTemporal: `Data da ocorrência (${formatarData(dataRef)}) abrangida pela vigência cadastrada (${manual.revisao}, início em ${formatarData(manual.dataVigencia)}).`,
      fonteVersao: manual.fonte || 'SGQ Interno',
    };
  }

  // Sem comprovação inequívoca de vigência na data: NÃO assumir 'Vigente'
  return {
    manualCodigo,
    revisaoAplicavelNaData: 'Vigência não determinada — requer validação humana',
    revisaoAtualVigente: revisaoAtual,
    dataOcorrenciaReferencia: dataRef,
    ehRevisaoAtual: false,
    statusVigenciaNaData: 'Vigência não determinada — requer validação humana',
    observacaoTemporal: `Data da ocorrência (${formatarData(dataRef)}) não possui comprovação inequívoca de vigência para a versão cadastrada (${revisaoAtual}). Vigência não determinada — requer validação humana.`,
    fonteVersao: manual.fonte || 'SGQ Interno',
  };
}

/**
 * Alias explícito para obter a versão normativa aplicável com base na data da ocorrência
 */
export const getApplicableDocumentVersion = obterVersaoNormativaAplicavel;

// ----------------------------------------------------
// PRIORIZAÇÃO INTELIGENTE EXPLICÁVEL (FASE 5)
// ----------------------------------------------------
import { PrioridadeInteligente, NivelPrioridadeInteligente, FatoresPrioridade } from '../types';

export function calcularPrioridadeInteligente(nc: NCRecord, todasNCs: NCRecord[] = []): PrioridadeInteligente {
  const hoje = new Date();
  const isEncerrada = nc.statusGeral === 'Encerrada' || nc.verificacaoEficacia?.encerrado === 'SIM';

  // 1. Fator Risco (0 a 35 pontos)
  let riscoScore = 10;
  const nivelRisco = nc.avaliacaoRiscoInicial?.nivel || 'Médio';
  if (nivelRisco === 'Crítico') riscoScore = 35;
  else if (nivelRisco === 'Alto') riscoScore = 25;
  else if (nivelRisco === 'Médio') riscoScore = 15;
  else riscoScore = 5;

  // 2. Fator Atraso em dias (0 a 30 pontos)
  let atrasoDias = 0;
  let atrasoScore = 0;
  const isTratamentoConcluido = isEncerrada || nc.statusGeral === 'Aguardando Eficácia' || nc.acaoCorretiva?.status === 'Concluída';

  if (!isEncerrada) {
    if (!isTratamentoConcluido && nc.prazoResposta) {
      const prazo = new Date(nc.prazoResposta);
      atrasoDias = Math.floor((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
      if (atrasoDias > 0) {
        atrasoScore = Math.min(30, 10 + atrasoDias * 2);
      } else if (atrasoDias >= -7) {
        atrasoScore = 8; // Vence nos próximos 7 dias
      }
    } else if (isTratamentoConcluido && nc.statusGeral === 'Aguardando Eficácia') {
      const dataPrazoEficacia = nc.prazoEficacia || nc.verificacaoEficacia?.prazoEficacia || nc.verificacaoEficacia?.dataPrevista;
      if (dataPrazoEficacia) {
        const prazoEf = new Date(dataPrazoEficacia);
        const atrasoEf = Math.floor((hoje.getTime() - prazoEf.getTime()) / (1000 * 60 * 60 * 24));
        if (atrasoEf > 0) {
          atrasoScore = Math.min(25, 10 + atrasoEf * 1.5);
          atrasoDias = atrasoEf;
        }
      }
    }
  }

  // 3. Fator Recorrência histórica no setor/categoria (0 a 20 pontos)
  let recorrenciaCount = 0;
  if (todasNCs.length > 0) {
    recorrenciaCount = todasNCs.filter(
      (r) => r.id !== nc.id && (r.setor === nc.setor || r.categoria === nc.categoria)
    ).length;
  }
  const recorrenciaScore = Math.min(20, recorrenciaCount * 4);

  // 4. Fator Impacto Operacional / Aeronavegabilidade (0 a 15 pontos)
  let impactoScore = 5;
  if (nc.normaReferencia?.includes('RBAC 145') || nc.normaReferencia?.includes('14 CFR')) {
    impactoScore += 5;
  }
  if (nc.descricaoNC?.toLowerCase().includes('aeronave') || nc.descricaoNC?.toLowerCase().includes('voo') || nc.descricaoNC?.toLowerCase().includes('calibra')) {
    impactoScore += 5;
  }
  impactoScore = Math.min(15, impactoScore);

  // 5. Pendência de Eficácia (>60 dias sem fechar)
  const pendenciaEficacia = Boolean(
    nc.acaoCorretiva?.status === 'Concluída' &&
    nc.verificacaoEficacia?.encerrado === 'Pendente'
  );
  if (pendenciaEficacia && !isEncerrada) {
    atrasoScore += 10;
  }

  // Score Geral (0 a 100)
  let scoreGeral = isEncerrada ? 0 : Math.min(100, riscoScore + atrasoScore + recorrenciaScore + impactoScore);

  // Classificação do Nível
  let nivel: NivelPrioridadeInteligente = 'BAIXO';
  if (scoreGeral >= 70) nivel = 'CRITICO';
  else if (scoreGeral >= 45) nivel = 'ALTO';
  else if (scoreGeral >= 25) nivel = 'MEDIO';
  else nivel = 'BAIXO';

  // Justificativa Explicável Transparente
  const justificativaParts: string[] = [];
  if (riscoScore >= 25) justificativaParts.push(`Risco ${nivelRisco}`);
  if (atrasoDias > 0) justificativaParts.push(`Atraso de ${atrasoDias} dia(s)`);
  else if (atrasoDias >= -7 && atrasoDias <= 0) justificativaParts.push(`Vence em breve (${Math.abs(atrasoDias)}d)`);
  if (recorrenciaCount >= 2) justificativaParts.push(`Recorrência no setor/categoria (${recorrenciaCount} ocorrências)`);
  if (pendenciaEficacia) justificativaParts.push('Eficácia pendente de auditoria');
  if (justificativaParts.length === 0) justificativaParts.push('Tratativa sob controle dentro do prazo regulamentar');

  const justificativaExplicavel = isEncerrada
    ? 'RNC encerrada formalmente no SGQ.'
    : `Prioridade ${nivel} decorrente de: ${justificativaParts.join(' + ')}.`;

  const fatores: FatoresPrioridade = {
    riscoScore,
    atrasoDias,
    recorrenciaScore,
    impactoScore,
    pendenciaEficacia,
  };

  return {
    nivel,
    scoreGeral,
    justificativaExplicavel,
    fatores,
    calculadoEm: new Date().toISOString(),
  };
}

export function obterEstiloPrioridade(nivel?: NivelPrioridadeInteligente | string): {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  iconColor: string;
  label: string;
} {
  switch (nivel) {
    case 'CRITICO':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-300',
        badgeBg: 'bg-rose-600 text-white',
        iconColor: 'text-rose-600',
        label: 'Crítico',
      };
    case 'ALTO':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        badgeBg: 'bg-amber-500 text-white',
        iconColor: 'text-amber-600',
        label: 'Alto',
      };
    case 'MEDIO':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-300',
        badgeBg: 'bg-blue-600 text-white',
        iconColor: 'text-blue-600',
        label: 'Médio',
      };
    case 'BAIXO':
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        badgeBg: 'bg-slate-600 text-white',
        iconColor: 'text-slate-600',
        label: 'Baixo',
      };
  }
}

// ----------------------------------------------------
// DETECÇÃO APROFUNDADA DE RECORRÊNCIAS SGQ (FASE 5)
// ----------------------------------------------------
export interface ClusterRecorrenciaSGQ {
  id: string;
  titulo: string;
  tipoCluster: 'SETOR' | 'CATEGORIA' | 'CAUSA_RAIZ' | 'NORMA';
  chaveAgrupamento: string;
  quantidadeOcorrencias: number;
  rncsAssociadas: Array<{
    id: string;
    numeroNC: string;
    titulo: string;
    setor: string;
    data: string;
    status: string;
    eficaz: boolean;
  }>;
  taxaEficaciaPercentual: number;
  acoesMaisComuns: string[];
  nivelAlerta: 'CRITICO' | 'ALTO' | 'MEDIO';
  sugestaoPreventivaSGQ: string;
}

export function analisarRecorrenciasSGQ(records: NCRecord[] = []): ClusterRecorrenciaSGQ[] {
  const clusters: ClusterRecorrenciaSGQ[] = [];
  if (records.length === 0) return clusters;

  // Agrupamento por Categoria
  const porCategoria = new Map<string, NCRecord[]>();
  // Agrupamento por Setor
  const porSetor = new Map<string, NCRecord[]>();

  records.forEach((r) => {
    const cat = r.categoria?.trim() || 'Outros';
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat)!.push(r);

    const set = r.setor?.trim() || 'Geral';
    if (!porSetor.has(set)) porSetor.set(set, []);
    porSetor.get(set)!.push(r);
  });

  // Processar clusters de Categoria com >= 2 ocorrências
  porCategoria.forEach((listaNCs, cat) => {
    if (listaNCs.length >= 2) {
      const eficazes = listaNCs.filter((n) => n.verificacaoEficacia?.encerrado === 'SIM').length;
      const taxa = Math.round((eficazes / listaNCs.length) * 100);

      const acoes = listaNCs
        .map((n) => n.acaoCorretiva?.descricao?.trim())
        .filter((a): a is string => Boolean(a && a.length > 5))
        .slice(0, 3);

      clusters.push({
        id: `cluster-cat-${cat.toLowerCase().replace(/\s+/g, '-')}`,
        titulo: `Recorrência na Categoria: ${cat}`,
        tipoCluster: 'CATEGORIA',
        chaveAgrupamento: cat,
        quantidadeOcorrencias: listaNCs.length,
        rncsAssociadas: listaNCs.map((n) => ({
          id: n.id,
          numeroNC: n.numeroNC,
          titulo: n.titulo,
          setor: n.setor,
          data: n.dataIdentificacao || n.criadoEm,
          status: n.statusGeral,
          eficaz: n.verificacaoEficacia?.encerrado === 'SIM',
        })),
        taxaEficaciaPercentual: taxa,
        acoesMaisComuns: acoes.length > 0 ? acoes : ['Revisão de procedimentos operacionais e treinamento de equipe'],
        nivelAlerta: listaNCs.length >= 4 ? 'CRITICO' : listaNCs.length >= 3 ? 'ALTO' : 'MEDIO',
        sugestaoPreventivaSGQ: `Consolidar treinamento formal e instituir checklist obrigatório para a categoria ${cat}.`,
      });
    }
  });

  return clusters.sort((a, b) => b.quantidadeOcorrencias - a.quantidadeOcorrencias);
}


