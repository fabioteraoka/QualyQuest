import React from 'react';
import { Search, Bell, ShieldCheck, Activity, LogIn, Menu, CheckSquare, Sparkles, BookOpen } from 'lucide-react';
import { AlertaItem, OrganizationRecord } from '../types';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  alertas: AlertaItem[];
  onOpenAlerts: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  currentViewTitle?: string;
  onOpenAuth?: () => void;
  onOpenDiagnostics?: () => void;
  onToggleMobileMenu?: () => void;
  activeOrganization?: OrganizationRecord | null;
  onOpenChecklist?: () => void;
  onOpenOnboarding?: () => void;
  onOpenManual?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  alertas = [],
  onOpenAlerts,
  searchTerm = '',
  onSearchChange,
  currentViewTitle = 'Dashboard',
  onOpenAuth,
  onOpenDiagnostics,
  onToggleMobileMenu,
  activeOrganization,
  onOpenChecklist,
  onOpenOnboarding,
  onOpenManual,
}) => {
  const { user, userProfile } = useAuth();

  const alertasCriticos = (alertas || []).filter(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.tipoAlerta === 'VENCE_7_DIAS'
  );

  const orgSigla = activeOrganization?.configuration?.identidadeVisual?.siglaAeronautica ||
                   (activeOrganization?.name ? activeOrganization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const orgName = activeOrganization?.name || 'QualiGest SGQ';
  const orgLegalName = activeOrganization?.legalName || orgName;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-xs">
      {/* Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-[8px] hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200 shrink-0 cursor-pointer"
            aria-label="Abrir Menu Principal"
            title="Menu Principal"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-extrabold text-slate-900 text-xs sm:text-base tracking-tight shrink-0">QUALIGEST</span>
            <span className="text-slate-300 text-xs hidden xs:inline">•</span>
            <span className="text-[10px] sm:text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0 hidden xs:inline uppercase">
              {orgSigla}
            </span>
            {activeOrganization?.isDemoTenant && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0 hidden sm:inline">
                DEMO
              </span>
            )}
            <span className="text-slate-300 text-xs hidden xs:inline">|</span>
            <span className="text-xs sm:text-sm text-slate-700 font-semibold truncate max-w-[140px] sm:max-w-[280px] md:max-w-none">
              {currentViewTitle}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">
            {orgLegalName} • Sistema de Garantia da Qualidade & SGQ Aeronáutico
          </p>
        </div>
      </div>

      {/* Center Search / Action (Desktop) */}
      <div className="flex-1 max-w-md hidden md:flex items-center">
        {onSearchChange && (
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por código, setor, norma ou descrição..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Right Controls: Checklist + Alertas + Diagnostics + User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Manual de Utilização Shortcut */}
        {onOpenManual && (
          <button
            onClick={onOpenManual}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-[8px] bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-xs font-semibold text-cyan-800 transition-colors cursor-pointer"
            title="Manual de Utilização Oficial do QualiGest SGQ"
          >
            <BookOpen className="w-4 h-4 text-cyan-600 shrink-0" />
            <span className="hidden xl:inline text-[11px]">Manual SGQ</span>
          </button>
        )}

        {/* Activation Checklist Shortcut */}
        {onOpenChecklist && (
          <button
            onClick={onOpenChecklist}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-[8px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 transition-colors cursor-pointer"
            title="Abrir checklist de prontidão e ativação do cliente"
          >
            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden xl:inline text-[11px]">Checklist de Ativação</span>
          </button>
        )}

        {/* Firebase Diagnostics Button */}
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Diagnóstico da infraestrutura Firebase & Firestore"
          >
            <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden xl:inline text-[11px]">Diagnóstico</span>
          </button>
        )}

        {/* Compliance Status Indicator (Desktop only) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-[11px] font-medium">Firestore Online</span>
        </div>

        {/* Alertas Button */}
        <button
          onClick={onOpenAlerts}
          className={`relative p-2 rounded-[8px] border transition-colors cursor-pointer ${
            alertasCriticos.length > 0
              ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="Central de Alertas"
        >
          <Bell className="w-4 h-4" />
          {alertasCriticos.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {alertasCriticos.length}
            </span>
          )}
        </button>

        {/* User Pill with Real Auth & Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
          {user ? (
            <div
              onClick={onOpenDiagnostics}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              title="Clique para ver detalhes da conta e diagnóstico"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[8px] bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold uppercase shrink-0">
                {user.email ? user.email.substring(0, 2) : 'US'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px] lg:max-w-[140px]">
                  {userProfile?.displayName || user.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-[10px] text-indigo-600 font-medium leading-tight">
                  {userProfile?.role || 'AUDITOR'}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
