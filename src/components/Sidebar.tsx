import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Bell,
  BookOpen,
  Sparkles,
  Plus,
  ShieldCheck,
  BookMarked,
  Activity,
  LogIn,
  X,
  CheckSquare,
  Award,
  Presentation,
  Cpu,
  Building2,
  Sliders,
  FileCheck2,
  Users,
  GraduationCap,
  Clock,
  History,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Plane,
  MapPin,
  Wrench,
  Grid,
  FileSpreadsheet,
  AlertTriangle,
  AlertCircle,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { AlertaItem, OrganizationRecord } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from './common/ThemeToggle';
import {
  NAV_GROUPS,
  NavIconKey,
  NavItemDef,
  checkAccessPolicy,
  isNavItemActive,
  resolveCanonicalTabId,
} from '../config/navigationRegistry';

export type { NavGroupDef, NavItemDef } from '../config/navigationRegistry';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertas: AlertaItem[];
  onNewNC: () => void;
  onOpenExtractor: () => void;
  onOpenDiagnostics?: () => void;
  onOpenTechnicalAudit?: () => void;
  onOpenAuth?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  activeOrganization?: OrganizationRecord | null;
  onOpenChecklist?: () => void;
  onOpenOnboarding?: () => void;
}

function renderNavIcon(iconKey: NavIconKey): React.ReactNode {
  const cls = 'w-4 h-4';
  switch (iconKey) {
    case 'dashboard': return <LayoutDashboard className={`${cls} text-blue-400`} />;
    case 'activity': return <Activity className={`${cls} text-emerald-400`} />;
    case 'bell': return <Bell className={`${cls} text-rose-400`} />;
    case 'presentation': return <Presentation className={`${cls} text-sky-400`} />;
    case 'users': return <Users className={`${cls} text-emerald-400`} />;
    case 'userPlus': return <UserPlus className={`${cls} text-sky-400`} />;
    case 'award': return <Award className={`${cls} text-amber-400`} />;
    case 'fileCheck': return <FileCheck2 className={`${cls} text-emerald-400`} />;
    case 'plane': return <Plane className={`${cls} text-sky-400`} />;
    case 'bookOpen': return <BookOpen className={`${cls} text-sky-400`} />;
    case 'grid': return <Grid className={`${cls} text-purple-400`} />;
    case 'graduationCap': return <GraduationCap className={`${cls} text-emerald-400`} />;
    case 'uploadCloud': return <UploadCloud className={`${cls} text-teal-400`} />;
    case 'checkSquare': return <CheckSquare className={`${cls} text-amber-400`} />;
    case 'clock': return <Clock className={`${cls} text-rose-400`} />;
    case 'barChart': return <BarChart3 className={`${cls} text-sky-400`} />;
    case 'mapPin': return <MapPin className={`${cls} text-rose-400`} />;
    case 'briefcase': return <Briefcase className={`${cls} text-amber-400`} />;
    case 'wrench': return <Wrench className={`${cls} text-sky-400`} />;
    case 'fileText': return <FileText className={`${cls} text-blue-400`} />;
    case 'shieldCheck': return <ShieldCheck className={`${cls} text-emerald-400`} />;
    case 'sparkles': return <Sparkles className={`${cls} text-purple-400`} />;
    case 'bookMarked': return <BookMarked className={`${cls} text-emerald-400`} />;
    case 'folderTree': return <FolderTree className={`${cls} text-sky-400`} />;
    case 'sliders': return <Sliders className={`${cls} text-amber-400`} />;
    case 'fileSpreadsheet': return <FileSpreadsheet className={`${cls} text-emerald-400`} />;
    case 'alertCircle': return <AlertCircle className={`${cls} text-rose-400`} />;
    case 'alertTriangle': return <AlertTriangle className={`${cls} text-amber-400`} />;
    case 'shield': return <Shield className={`${cls} text-indigo-400`} />;
    case 'building': return <Building2 className={`${cls} text-blue-400`} />;
    case 'cpu': return <Cpu className={`${cls} text-slate-400`} />;
    case 'history': return <History className={`${cls} text-amber-400`} />;
    default: return <LayoutDashboard className={`${cls} text-slate-400`} />;
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertas = [],
  onNewNC,
  onOpenDiagnostics,
  onOpenAuth,
  isOpenMobile = false,
  onCloseMobile,
  activeOrganization,
}) => {
  const { user, userProfile } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isCompact, setIsCompact] = useState<boolean>(false);

  const alertasCriticos = (alertas || []).filter(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.tipoAlerta === 'VENCE_7_DIAS'
  );

  const canCreateNC = checkAccessPolicy('WRITE_ALLOWED', userProfile);

  const orgSigla =
    activeOrganization?.configuration?.identidadeVisual?.siglaAeronautica ||
    (activeOrganization?.name ? activeOrganization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const orgName = activeOrganization?.name || 'QualiGest SGQ';

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.filter((g) => checkAccessPolicy(g.access, userProfile))
      .map((g) => ({
        ...g,
        items: g.items
          .filter((item) => item.showInMenu !== false && checkAccessPolicy(item.access, userProfile))
          .map((item) => {
            if (item.id === 'alertas' && alertasCriticos.length > 0) {
              return {
                ...item,
                badge: alertasCriticos.length,
                badgeColor: 'bg-rose-600 text-white',
              };
            }
            return item;
          }),
      }))
      .filter((g) => g.items.length > 0);
  }, [userProfile, alertasCriticos.length]);

  useEffect(() => {
    const activeGroup = visibleGroups.find((g) => g.items.some((item) => isNavItemActive(item, activeTab)));
    if (activeGroup) {
      setCollapsedGroups((prev) => {
        if (prev[activeGroup.id]) {
          return { ...prev, [activeGroup.id]: false };
        }
        return prev;
      });
    }
  }, [activeTab, visibleGroups]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (tabId: string) => {
    setActiveTab(resolveCanonicalTabId(tabId));
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewNCClick = () => {
    onNewNC();
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand & Compact Toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[8px] bg-slate-800 border border-slate-700/80 flex items-center justify-center text-white shadow-xs shrink-0">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          {!isCompact && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white whitespace-nowrap">QUALIGEST</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50 uppercase">
                  {orgSigla}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{orgName}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCompact(!isCompact)}
          className="hidden lg:flex p-1.5 rounded-[6px] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isCompact ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
          aria-label={isCompact ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
        >
          {isCompact ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-[8px] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Prominent Action Button: + Nova NC (apenas perfis com escrita) */}
      {canCreateNC && (
        <div className="p-3 border-b border-slate-800/60 shrink-0">
          <button
            type="button"
            onClick={handleNewNCClick}
            title="Nova Não Conformidade"
            className={`w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-[8px] transition-all shadow-xs cursor-pointer ${
              isCompact ? 'px-2' : 'px-4'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCompact && <span className="whitespace-nowrap">Nova Não Conformidade</span>}
          </button>
        </div>
      )}

      {/* Navigation Categories and Items (from NavigationRegistry SSoT) */}
      <nav
        aria-label="Navegação Principal do Sistema"
        className="flex-1 px-2.5 py-3 space-y-3.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
      >
        {visibleGroups.map((group) => {
          const isCollapsed = !isCompact && !!collapsedGroups[group.id];
          const hasActiveItem = group.items.some((item) => isNavItemActive(item, activeTab));

          return (
            <div key={group.id} className="space-y-1">
              {!isCompact ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  className={`w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer select-none text-left ${
                    hasActiveItem
                      ? 'text-blue-300 font-extrabold bg-blue-950/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{group.label}</span>
                  <span className="text-slate-500 ml-1 shrink-0">
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
              ) : (
                <div className="h-px bg-slate-800 my-2 mx-1" title={group.label} />
              )}

              {(!isCollapsed || isCompact) && (
                <div className="space-y-0.5">
                  {group.items.map((item: NavItemDef) => {
                    const isActive = isNavItemActive(item, activeTab);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        title={isCompact ? item.label : undefined}
                        className={`w-full flex items-center justify-between px-2.5 py-1.75 rounded-[7px] text-xs font-medium transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold shadow-xs border border-slate-700/90 ring-1 ring-blue-500/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        } ${isCompact ? 'justify-center px-2 py-2' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                            {renderNavIcon(item.iconKey)}
                          </span>
                          {!isCompact && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCompact && item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold tabular-nums shrink-0 ml-1.5 ${
                              item.badgeColor || 'bg-slate-700 text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* System Info / User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-xs shrink-0 space-y-2">
        {!isCompact && (
          <div className="px-1">
            <ThemeToggle variant="sidebar" />
          </div>
        )}
        {user ? (
          <div
            onClick={() => {
              if (onOpenDiagnostics) onOpenDiagnostics();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-[6px] hover:bg-slate-800/80 cursor-pointer transition-colors"
            title="Abrir diagnósticos e detalhes da sessão"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 border border-indigo-500 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
              {user.email ? user.email.substring(0, 2) : 'US'}
            </div>
            {!isCompact && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {userProfile?.displayName || user.email?.split('@')[0] || 'Usuário SGQ'}
                </p>
                <p className="text-[10px] text-indigo-400 truncate">
                  {userProfile?.role || 'AUDITOR'} · {orgName}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => {
              if (onOpenAuth) onOpenAuth();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-slate-800/80 cursor-pointer transition-colors"
            title="Clique para autenticar no Firebase"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0 uppercase">
                {orgSigla.substring(0, 3)}
              </div>
              {!isCompact && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{orgName}</p>
                  <p className="text-[10px] text-slate-500 truncate">Sessão Local</p>
                </div>
              )}
            </div>
            {!isCompact && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1 border border-slate-700 shrink-0 ml-2">
                <LogIn className="w-3 h-3 text-indigo-400" />
                Entrar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex ${
          isCompact ? 'w-18' : 'w-64'
        } bg-slate-900 text-slate-300 flex-col shrink-0 border-r border-slate-800 selection:bg-blue-600 selection:text-white h-screen sticky top-0 transition-all duration-200`}
      >
        {sidebarContent}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-4/5 max-w-xs h-full bg-slate-900 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
