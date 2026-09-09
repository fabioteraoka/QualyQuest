/**
 * QUALIGEST DESIGN SYSTEM
 * Padrões Visuais Corporativos / Enterprise SGQ & Compliance Aeronáutico
 */

export const DS = {
  // Cores Base e Semânticas
  colors: {
    bg: 'bg-slate-50',
    surface: 'bg-white',
    surfaceSubtle: 'bg-slate-50/80',
    border: 'border-slate-200',
    borderSubtle: 'border-slate-100',
    borderFocus: 'focus:border-slate-400 focus:ring-1 focus:ring-slate-400',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    navy: {
      900: 'bg-slate-900',
      800: 'bg-slate-800',
      text: 'text-slate-900',
    },
    brand: {
      primary: 'bg-slate-900 hover:bg-slate-800 text-white',
      accent: 'bg-blue-700 hover:bg-blue-800 text-white',
      outline: 'border border-slate-300 hover:bg-slate-100 text-slate-700',
    },
    status: {
      sucesso: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-600',
      },
      atencao: {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      },
      critico: {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dot: 'bg-rose-600',
      },
      info: {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        dot: 'bg-blue-600',
      },
      ai: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        dot: 'bg-indigo-600',
      },
      neutro: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
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
    card: 'shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]',
    dropdown: 'shadow-md',
    modal: 'shadow-xl',
  },

  // Tipografia Padronizada
  typography: {
    pageTitle: 'text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]',
    pageSubtitle: 'text-sm text-slate-500 mt-1',
    sectionTitle: 'text-base font-semibold text-slate-900 tracking-tight',
    sectionSubtitle: 'text-xs text-slate-500 mt-0.5',
    cardTitle: 'text-sm font-semibold text-slate-800',
    body: 'text-sm text-slate-700 leading-normal',
    bodyMuted: 'text-sm text-slate-500',
    label: 'text-[12px] font-semibold text-slate-700 uppercase tracking-wider',
    inputLabel: 'text-[13px] font-medium text-slate-800 block mb-1',
    meta: 'text-xs text-slate-500',
    code: 'font-mono text-xs',
  },
};

export const getStatusBadgeStyle = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s.includes('fechada') || s.includes('eficaz') || s.includes('vigente') || s.includes('conclu')) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
  if (s.includes('em andamento') || s.includes('análise') || s.includes('revisão') || s.includes('atenção')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (s.includes('aberta') || s.includes('vencid') || s.includes('crític') || s.includes('ineficaz') || s.includes('bloquead')) {
    return 'bg-rose-50 text-rose-800 border-rose-200';
  }
  if (s.includes('proposta') || s.includes('ia') || s.includes('sugestão')) {
    return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export const getRiskBadgeStyle = (risk: string) => {
  const r = (risk || '').toLowerCase();
  if (r.includes('crítico') || r.includes('critico') || r.includes('extremo')) {
    return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
  }
  if (r.includes('alto')) {
    return 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
  }
  if (r.includes('médio') || r.includes('medio')) {
    return 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
  }
  if (r.includes('baixo')) {
    return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-medium';
  }
  return 'bg-slate-100 text-slate-700 border-slate-300';
};
