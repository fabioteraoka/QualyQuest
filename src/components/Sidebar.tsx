import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Bell, 
  BookOpen, 
  Sparkles, 
  Plus, 
  ShieldCheck,
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
  Layers,
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
  UserCheck,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { AlertaItem, OrganizationRecord } from '../types';
import { useAuth } from '../hooks/useAuth';

export interface NavSubItem {
  id: string;
  label: string;
  aliases?: string[];
  badge?: string | number;
  badgeColor?: string;
  adminOnly?: boolean;
}

export interface NavItemDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  aliases?: string[];
  badge?: string | number;
  badgeColor?: string;
  adminOnly?: boolean;
  subItems?: NavSubItem[];
}

export interface NavGroupDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  items: NavItemDef[];
  adminOnly?: boolean;
}

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

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertas = [],
  onNewNC,
  onOpenExtractor,
  onOpenDiagnostics,
  onOpenTechnicalAudit,
  onOpenAuth,
  isOpenMobile = false,
  onCloseMobile,
  activeOrganization,
  onOpenChecklist,
  onOpenOnboarding,
}) => {
  const { user, userProfile } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isCompact, setIsCompact] = useState<boolean>(false);

  const alertasCriticos = (alertas || []).filter(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.tipoAlerta === 'VENCE_7_DIAS'
  );

  // Perfil administrativo / permissão de sistema
  const isAdminOrGestor = !userProfile || 
                          userProfile.role === 'ADMIN' || 
                          userProfile.role === 'ADMINISTRADOR' || 
                          userProfile.role === 'GESTOR_SGQ';

  const orgSigla = activeOrganization?.configuration?.identidadeVisual?.siglaAeronautica || 
                   (activeOrganization?.name ? activeOrganization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const orgName = activeOrganization?.name || 'QualiGest SGQ';

  /**
   * ESTRUTURA GLOBAL PADRONIZADA DE NAVEGAÇÃO LATERAL (QUALYQUEST / ROOSTER)
   * Domínios canônicos mandatados:
   * 1. Painel
   * 2. Pessoas e Colaboradores
   * 3. Treinamentos
   * 4. Cadastros Mestres (Bases & Locais Operacionais, Motores & Frota, Controles)
   * 5. Qualidade e Controles
   * 6. Relatórios
   * 7. Administração e Segurança
   * 8. Auditoria e Histórico
   * 9. Configurações e Ferramentas
   */
  const navGroups: NavGroupDef[] = [
    {
      id: 'painel',
      label: 'Painel',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Executivo',
          icon: <LayoutDashboard className="w-4 h-4 text-blue-400" />,
        },
        {
          id: 'saudeSGQ',
          label: 'Saúde do SGQ',
          aliases: ['visao-evolucao'],
          icon: <Activity className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'alertas',
          label: 'Pendências & Alertas',
          icon: <Bell className="w-4 h-4 text-rose-400" />,
          badge: alertasCriticos.length > 0 ? alertasCriticos.length : undefined,
          badgeColor: 'bg-rose-600 text-white animate-pulse',
        },
        {
          id: 'apresentacao',
          label: 'Apresentação Gerencial',
          icon: <Presentation className="w-4 h-4 text-sky-400" />,
        },
      ],
    },
    {
      id: 'pessoas-colaboradores',
      label: 'Pessoas e Colaboradores',
      items: [
        {
          id: 'pessoas-competencias',
          label: 'Lista de colaboradores',
          aliases: ['colaboradores-lista', 'rooster-pessoas', 'pessoas'],
          icon: <Users className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'colaborador-novo',
          label: 'Novo colaborador',
          icon: <UserPlus className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'rooster-ficha',
          label: 'Perfil do colaborador',
          aliases: ['colaborador-perfil', 'ficha'],
          icon: <UserCheck className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: 'cht-qualificacoes',
          label: 'Habilitações e licenças',
          aliases: ['rooster-licencas', 'licencas'],
          icon: <Award className="w-4 h-4 text-amber-400" />,
        },
      ],
    },
    {
      id: 'treinamentos',
      label: 'Treinamentos',
      items: [
        {
          id: 'rooster-catalogo',
          label: 'Catálogo de treinamentos',
          aliases: ['catalogo', 'treinamentos-catalogo'],
          icon: <BookOpen className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'modelos-capacitacao',
          label: 'Modelos de capacitação',
          icon: <Layers className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: 'rooster-matrizes',
          label: 'Matriz de treinamento',
          aliases: ['matriz-competencias', 'matrizes', 'aptidao-operacional'],
          icon: <Grid className="w-4 h-4 text-purple-400" />,
        },
        {
          id: 'treinamentos-qualificacoes',
          label: 'Registros de treinamento',
          aliases: ['rooster-treinamentos'],
          icon: <GraduationCap className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'importacao-certificados',
          label: 'Importação de certificados',
          aliases: ['importacao-inteligente'],
          icon: <UploadCloud className="w-4 h-4 text-teal-400" />,
        },
        {
          id: 'validacaoQueue',
          label: 'Fila de validação',
          icon: <CheckSquare className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'central-vencimentos-gaps',
          label: 'Vencimentos',
          aliases: ['rooster-vencimentos', 'vencimentos'],
          icon: <Clock className="w-4 h-4 text-rose-400" />,
        },
        {
          id: 'competencias-dashboard',
          label: 'Dashboard de treinamentos',
          icon: <BarChart3 className="w-4 h-4 text-sky-400" />,
        },
      ],
    },
    {
      id: 'cadastros-mestres',
      label: 'Cadastros Mestres',
      items: [
        {
          id: 'cadastros-bases',
          label: 'Bases e locais operacionais',
          aliases: ['rooster-bases', 'bases'],
          icon: <MapPin className="w-4 h-4 text-rose-400" />,
          badge: 'Mestre',
          badgeColor: 'bg-rose-900/60 text-rose-300 border border-rose-700/50',
        },
        {
          id: 'cadastros-funcoes-cargos',
          label: 'Funções e cargos',
          icon: <Briefcase className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'parametros-fluxo',
          label: 'Parâmetros necessários ao fluxo',
          aliases: ['outros-controles', 'configuracoes-org'],
          icon: <Sliders className="w-4 h-4 text-sky-400" />,
        },
      ],
    },
    {
      id: 'qualidade-controles',
      label: 'Qualidade e Controles',
      items: [
        {
          id: 'relatorio',
          label: 'Não Conformidades (RNC)',
          aliases: ['formulario'],
          icon: <FileText className="w-4 h-4 text-blue-400" />,
        },
        {
          id: 'incidencias',
          label: 'Análise & Indicadores',
          icon: <BarChart3 className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: 'validacaoQueue',
          label: 'Validação & Aprovação',
          icon: <CheckSquare className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'auditorias-gestao',
          label: 'Auditorias Internas & Externas',
          aliases: ['auditorias-dashboard', 'clientes-cronograma'],
          icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'smart-audit',
          label: 'Auditoria Inteligente & Clientes',
          aliases: ['clientes-requisitos'],
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        },
        {
          id: 'manuais',
          label: 'Banco de Manuais (IA)',
          icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: 'controle-documental',
          label: 'Acervo & Revisões (SGQ)',
          aliases: ['verificacao-controle', 'documentos-inativos'],
          icon: <FolderTree className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'ferramentas-metrologia',
          label: 'Ferramentas & Metrologia',
          icon: <Sliders className="w-4 h-4 text-amber-400" />,
        },
      ],
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      items: [
        {
          id: 'rooster-relatorio',
          label: 'Relatório do Roster',
          aliases: ['rooster-roster', 'rooster'],
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" />,
          badge: 'A4 / Excel',
          badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
        },
        {
          id: 'oficial',
          label: 'Dossiê Oficial F 001-29',
          icon: <FileCheck2 className="w-4 h-4 text-blue-400" />,
        },
        {
          id: 'historico-relatorios',
          label: 'Histórico & Documentos',
          icon: <History className="w-4 h-4 text-purple-400" />,
        },
        {
          id: 'auditorias-constatacoes',
          label: 'Constatações de Auditoria',
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
        },
        {
          id: 'rooster-conferencia',
          label: 'Conferência de Frota & Turno',
          aliases: ['conferencia'],
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        },
      ],
    },
    {
      id: 'administracao-seguranca',
      label: 'Administração e Segurança',
      adminOnly: true,
      items: [
        {
          id: 'admin-central',
          label: 'Usuários & Permissões (RBAC)',
          icon: <Shield className="w-4 h-4 text-indigo-400" />,
          adminOnly: true,
        },
        {
          id: 'configuracoes-org',
          label: 'Configurações Organizacionais',
          icon: <Building2 className="w-4 h-4 text-blue-400" />,
          adminOnly: true,
        },
        {
          id: 'system-designer',
          label: 'System Designer (ADRs)',
          icon: <Cpu className="w-4 h-4 text-slate-400" />,
          adminOnly: true,
        },
        {
          id: 'diagnosticos-tecnicos',
          label: 'Diagnósticos Técnicos',
          icon: <Activity className="w-4 h-4 text-teal-400" />,
          adminOnly: true,
        },
        {
          id: 'onboarding-novo-cliente',
          label: 'Implantação & Onboarding',
          icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
          adminOnly: true,
        },
      ],
    },
    {
      id: 'auditoria-historico',
      label: 'Auditoria e Histórico',
      items: [
        {
          id: 'admin-audit-trail',
          label: 'Audit Trail do Sistema',
          icon: <History className="w-4 h-4 text-amber-400" />,
          badge: 'Auditável',
          badgeColor: 'bg-amber-900/60 text-amber-300 border border-amber-700/50',
        },
      ],
    },
    {
      id: 'configuracoes-ferramentas',
      label: 'Configurações e Ferramentas',
      items: [
        {
          id: 'importacao-inteligente',
          label: 'Importação Inteligente',
          icon: <UploadCloud className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'extrator',
          label: 'Extrator de NCs com IA',
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        },
        {
          id: 'knowledgeBase',
          label: 'Base de Conhecimento SGQ',
          aliases: ['comparacaoRNC', 'knowledgeBase-melhoria'],
          icon: <Award className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'manual-utilizacao',
          label: 'Manual de Utilização',
          icon: <BookOpen className="w-4 h-4 text-blue-400" />,
        },
      ],
    },
  ];

  // Regra fundamental: A categoria que contém a página atual deverá permanecer expandida
  useEffect(() => {
    const activeGroup = navGroups.find((g) =>
      g.items.some(
        (item) =>
          item.id === activeTab ||
          item.aliases?.includes(activeTab) ||
          (item.id === 'relatorio' && (activeTab === 'formulario' || activeTab === 'oficial')) ||
          (item.id === 'knowledgeBase' && activeTab === 'knowledgeBase-melhoria')
      )
    );
    if (activeGroup) {
      setCollapsedGroups((prev) => {
        if (prev[activeGroup.id]) {
          return { ...prev, [activeGroup.id]: false };
        }
        return prev;
      });
    }
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (tabId: string) => {
    // Normalização canônica de atalhos e aliases
    const targetTab = tabId === 'knowledgeBase-melhoria' ? 'knowledgeBase' : tabId;
    setActiveTab(targetTab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewNCClick = () => {
    onNewNC();
    if (onCloseMobile) onCloseMobile();
  };

  // Verifica se um item é ativo com base no activeTab ou seus aliases
  const isItemActive = (item: NavItemDef) => {
    if (activeTab === item.id) return true;
    if (item.aliases?.includes(activeTab)) return true;
    if (item.id === 'relatorio' && (activeTab === 'formulario' || activeTab === 'oficial')) return true;
    if (item.id === 'knowledgeBase' && activeTab === 'knowledgeBase-melhoria') return true;
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand & Desktop Compact Toggle & Close Button for Mobile */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[8px] bg-slate-800 border border-slate-700/80 flex items-center justify-center text-white shadow-xs shrink-0">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          {!isCompact && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">QUALIGEST</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50 uppercase">
                  {orgSigla}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{orgName}</p>
            </div>
          )}
        </div>

        {/* Compact Mode Toggle (Desktop only) */}
        <button
          onClick={() => setIsCompact(!isCompact)}
          className="hidden lg:flex p-1.5 rounded-[6px] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isCompact ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
          aria-label={isCompact ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
        >
          {isCompact ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-[8px] hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Prominent Action Button: + Nova NC */}
      <div className="p-3 border-b border-slate-800/60 shrink-0">
        <button
          onClick={handleNewNCClick}
          title="+ Nova Não Conformidade"
          className={`w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-[8px] transition-all shadow-xs cursor-pointer ${
            isCompact ? 'px-2' : 'px-4'
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCompact && <span>+ Nova Não Conformidade</span>}
        </button>
      </div>

      {/* Unified Navigation Categories and Submenus */}
      <nav
        aria-label="Navegação Principal do Sistema"
        className="flex-1 px-2.5 py-3 space-y-3.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
      >
        {navGroups.map((group) => {
          // RBAC: Se o grupo inteiro for restrito a admin e o usuário for apenas consulta/colaborador, ocultar
          if (group.adminOnly && !isAdminOrGestor) {
            return null;
          }

          const isCollapsed = !isCompact && !!collapsedGroups[group.id];
          const hasActiveItem = group.items.some(isItemActive);

          return (
            <div key={group.id} className="space-y-1">
              {!isCompact ? (
                /* Cabeçalho de Categoria Expansível / Recolhível */
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
                /* Linha divisora minimalista no modo compacto */
                <div className="h-px bg-slate-800 my-2 mx-1" title={group.label} />
              )}

              {(!isCollapsed || isCompact) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    // RBAC para itens individuais
                    if (item.adminOnly && !isAdminOrGestor) {
                      return null;
                    }

                    const isActive = isItemActive(item);

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
                            {item.icon}
                          </span>
                          {!isCompact && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCompact && item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ml-1.5 ${
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-xs shrink-0">
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
                  {userProfile?.role || 'AUDITOR'} • {orgName}
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
      {/* 1. Desktop Persistent Sidebar with smooth collapse support */}
      <aside
        className={`hidden lg:flex ${
          isCompact ? 'w-18' : 'w-64'
        } bg-slate-900 text-slate-300 flex-col shrink-0 border-r border-slate-800 selection:bg-blue-600 selection:text-white h-screen sticky top-0 transition-all duration-200`}
      >
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Backdrop & Sliding Panel */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Drawer */}
          <div className="relative w-4/5 max-w-xs h-full bg-slate-900 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
