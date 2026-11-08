/**
 * QUALIGEST DESIGN SYSTEM
 * Padrões Visuais Corporativos / Enterprise SGQ & Compliance Aeronáutico
 * Suporte completo a Modo Claro e Modo Escuro (Dual-Theme Harmonizado)
 */

export const DS = {
  // Cores Base e Semânticas
  colors: {
    bg: 'bg-slate-50 dark:bg-slate-950',
    surface: 'bg-white dark:bg-slate-900',
    surfaceSubtle: 'bg-slate-50/80 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-800',
    borderSubtle: 'border-slate-100 dark:border-slate-800/60',
    borderFocus: 'focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:dark:border-slate-500 focus:dark:ring-slate-500',
    textPrimary: 'text-slate-900 dark:text-slate-100',
    textSecondary: 'text-slate-600 dark:text-slate-300',
    textMuted: 'text-slate-400 dark:text-slate-400',
    navy: {
      900: 'bg-slate-900 dark:bg-slate-950',
      800: 'bg-slate-800 dark:bg-slate-900',
      text: 'text-slate-900 dark:text-slate-100',
    },
    brand: {
      primary: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900',
      accent: 'bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500',
      outline: 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
    },
    status: {
      sucesso: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/50',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800/80',
        dot: 'bg-emerald-600 dark:bg-emerald-400',
      },
      atencao: {
        bg: 'bg-amber-50 dark:bg-amber-950/50',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800/80',
        dot: 'bg-amber-500 dark:bg-amber-400',
      },
      critico: {
        bg: 'bg-rose-50 dark:bg-rose-950/50',
        text: 'text-rose-800 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800/80',
        dot: 'bg-rose-600 dark:bg-rose-400',
      },
      info: {
        bg: 'bg-blue-50 dark:bg-blue-950/50',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800/80',
        dot: 'bg-blue-600 dark:bg-blue-400',
      },
      ai: {
        bg: 'bg-indigo-50 dark:bg-indigo-950/50',
        text: 'text-indigo-800 dark:text-indigo-300',
        border: 'border-indigo-200 dark:border-indigo-800/80',
        dot: 'bg-indigo-600 dark:bg-indigo-400',
      },
      neutro: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400 dark:text-slate-400',
      },
    },
  },

  // Radius Padronizado
  radius: {
    input: 'rounded-[8px]',
    button: 'rounded-[8px]',
    card: 'rounded-[10px]',
    modal: 'rounded-[12px]',
    badge: 'rounded-[6px]',
  },

  // Sombras Reduzidas
  shadow: {
    none: 'shadow-none',
    card: 'shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] dark:shadow-none',
    dropdown: 'shadow-md dark:shadow-2xl',
    modal: 'shadow-xl dark:shadow-2xl',
  },

  // Tipografia Padronizada
  typography: {
    pageTitle: 'text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[26px]',
    pageSubtitle: 'text-sm text-slate-500 dark:text-slate-400 mt-1',
    sectionTitle: 'text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight',
    sectionSubtitle: 'text-xs text-slate-500 dark:text-slate-400 mt-0.5',
    cardTitle: 'text-sm font-semibold text-slate-800 dark:text-slate-100',
    body: 'text-sm text-slate-700 dark:text-slate-300 leading-normal',
    bodyMuted: 'text-sm text-slate-500 dark:text-slate-400',
    label: 'text-[12px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider',
    inputLabel: 'text-[13px] font-medium text-slate-800 dark:text-slate-200 block mb-1',
    meta: 'text-xs text-slate-500 dark:text-slate-400',
    code: 'font-mono text-xs text-slate-800 dark:text-slate-200',
  },
};

export const getStatusBadgeStyle = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('fechada') || s.includes('eficaz') || s.includes('vigente') || s.includes('conclu')) {
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80';
  }
  if (s.includes('em andamento') || s.includes('análise') || s.includes('revisão') || s.includes('atenção')) {
    return 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80';
  }
  if (s.includes('aberta') || s.includes('vencid') || s.includes('crític') || s.includes('ineficaz') || s.includes('bloquead')) {
    return 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/80';
  }
  if (s.includes('proposta') || s.includes('ia') || s.includes('sugestão')) {
    return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

export const getRiskBadgeStyle = (risk: string) => {
  const r = (risk || '').toLowerCase();
  if (r.includes('crítico') || r.includes('critico') || r.includes('extremo')) {
    return 'bg-rose-100 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800 font-bold';
  }
  if (r.includes('alto')) {
    return 'bg-orange-100 dark:bg-orange-950/70 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-800 font-bold';
  }
  if (r.includes('médio') || r.includes('medio')) {
    return 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-semibold';
  }
  if (r.includes('baixo')) {
    return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-medium';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
};
