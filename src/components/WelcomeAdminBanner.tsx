import React from 'react';
import { 
  Sparkles, 
  Building2, 
  Users, 
  BookOpen, 
  FileText, 
  CheckSquare, 
  ArrowRight, 
  X, 
  ShieldCheck 
} from 'lucide-react';
import { OrganizationRecord } from '../types';

interface WelcomeAdminBannerProps {
  organization: OrganizationRecord | null;
  onNavigateToTab: (tabId: string) => void;
  onOpenChecklist: () => void;
  onDismiss?: () => void;
}

export const WelcomeAdminBanner: React.FC<WelcomeAdminBannerProps> = ({
  organization,
  onNavigateToTab,
  onOpenChecklist,
  onDismiss,
}) => {
  const orgName = organization?.name || 'sua organização';
  const sigla = organization?.configuration?.identidadeVisual?.siglaAeronautica || 'SGQ';

  return (
    <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-[14px] p-6 text-white shadow-md overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute -right-8 -top-8 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Ocultar aviso de boas-vindas"
          aria-label="Fechar banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              AMBIENTE ATIVO: {sigla}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ANAC RBAC 145 & EASA Part-145
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Bem-vindo ao QualiGest SGQ, {orgName}!
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Seu ambiente corporativo está 100% provisionado com isolamento multi-tenant ativo no Firestore. Para iniciar as operações de auditoria e garantia da qualidade, siga os primeiros passos abaixo:
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenChecklist}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Checklist de Ativação</span>
          </button>

          <button
            onClick={() => onNavigateToTab('configuracoes-org')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Configurar Setores</span>
          </button>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
        <button
          onClick={() => onNavigateToTab('configuracoes-org')}
          className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <Building2 className="w-4 h-4 text-blue-400" />
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <span className="text-xs font-bold text-slate-200 block">1. Configurar Parâmetros</span>
          <span className="text-[10px] text-slate-400">Setores, SLAs e Logotipo</span>
        </button>

        <button
          onClick={() => onNavigateToTab('seguranca')}
          className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <Users className="w-4 h-4 text-indigo-400" />
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <span className="text-xs font-bold text-slate-200 block">2. Cadastrar Usuários</span>
          <span className="text-[10px] text-slate-400">Auditores e Inspetores</span>
        </button>

        <button
          onClick={() => onNavigateToTab('manuais')}
          className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <span className="text-xs font-bold text-slate-200 block">3. Cadastrar Manuais</span>
          <span className="text-[10px] text-slate-400">MGM, MOE e Procedimentos</span>
        </button>

        <button
          onClick={() => onNavigateToTab('formulario')}
          className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <FileText className="w-4 h-4 text-rose-400" />
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-rose-400 transition-colors" />
          </div>
          <span className="text-xs font-bold text-slate-200 block">4. Registrar RNC</span>
          <span className="text-[10px] text-slate-400">Primeira Não Conformidade</span>
        </button>
      </div>
    </div>
  );
};
