import React, { useState } from 'react';
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
  Scale,
  CheckSquare,
  Award,
  Presentation,
  Cpu,
  Building2,
  Sliders,
  FileCheck2,
  Lightbulb,
  Users,
  GraduationCap,
  Clock,
  History,
  Globe,
  Layers,
  ClipboardCheck,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  FolderTree
} from 'lucide-react';
import { AlertaItem, OrganizationRecord } from '../types';
import { useAuth } from '../hooks/useAuth';

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

  const alertasCriticos = (alertas || []).filter(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.tipoAlerta === 'VENCE_7_DIAS'
  );

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleItemClick = (tabId: string) => {
    // Normalização de atalhos seletivos
    const targetTab = tabId === 'knowledgeBase-melhoria' ? 'knowledgeBase' : tabId;
    setActiveTab(targetTab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewNCClick = () => {
    onNewNC();
    if (onCloseMobile) onCloseMobile();
  };

  const orgSigla = activeOrganization?.configuration?.identidadeVisual?.siglaAeronautica || 
                   (activeOrganization?.name ? activeOrganization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const orgName = activeOrganization?.name || 'QualiGest SGQ';

  // Perfil administrativo / permissão de sistema
  const isAdminOrGestor = !userProfile || 
                          userProfile.role === 'ADMIN' || 
                          userProfile.role === 'ADMINISTRADOR' || 
                          userProfile.role === 'GESTOR_SGQ';

  /**
   * NOVA ARQUITETURA DEFINITIVA DE NAVEGAÇÃO DO QUALIGEST
   * Estruturada estritamente conforme as 8 seções mandatadas:
   * 1. INÍCIO
   * 2. QUALIDADE
   * 3. AUDITORIAS & CLIENTES
   * 4. PESSOAS & COMPETÊNCIAS
   * 5. DOCUMENTOS
   * 6. RECURSOS & CONTROLES
   * 7. CONHECIMENTO & MELHORIA
   * 8. ADMINISTRAÇÃO
   */
  const navGroups = [
    {
      id: 'inicio',
      label: 'INÍCIO',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Executivo',
          icon: <LayoutDashboard className="w-4 h-4 text-blue-400" />,
        },
        {
          id: 'alertas',
          label: 'Pendências & Alertas',
          icon: <Bell className="w-4 h-4 text-rose-400" />,
          badge: alertasCriticos.length > 0 ? alertasCriticos.length : undefined,
          badgeColor: 'bg-rose-600 text-white',
        },
        {
          id: 'saudeSGQ',
          label: 'Saúde do SGQ',
          icon: <Activity className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'apresentacao',
          label: 'Apresentação Gerencial',
          icon: <Presentation className="w-4 h-4 text-sky-400" />,
        },
      ],
    },
    {
      id: 'qualidade',
      label: 'QUALIDADE',
      items: [
        {
          id: 'relatorio',
          label: 'Não Conformidades',
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
          id: 'knowledgeBase',
          label: 'Base de Conhecimento',
          icon: <Award className="w-4 h-4 text-emerald-400" />,
        },
      ],
    },
    {
      id: 'auditorias-clientes',
      label: 'AUDITORIAS & CLIENTES',
      items: [
        {
          id: 'auditorias-gestao',
          label: 'Auditorias',
          icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'clientes-requisitos',
          label: 'Clientes & Requisitos',
          icon: <ClipboardCheck className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'smart-audit',
          label: 'Auditoria Inteligente',
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        },
        {
          id: 'clientes-cronograma',
          label: 'Calendário de Auditorias',
          icon: <Clock className="w-4 h-4 text-emerald-400" />,
        },
      ],
    },
    {
      id: 'pessoas-competencias-group',
      label: 'PESSOAS & COMPETÊNCIAS',
      items: [
        {
          id: 'pessoas-competencias',
          label: 'Colaboradores',
          icon: <Users className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'treinamentos-qualificacoes',
          label: 'Treinamentos',
          icon: <GraduationCap className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'cht-qualificacoes',
          label: 'CHTs & Qualificações',
          icon: <Award className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'central-vencimentos-gaps',
          label: 'Vencimentos & Gaps',
          icon: <Clock className="w-4 h-4 text-rose-400" />,
        },
        {
          id: 'aptidao-operacional',
          label: 'Aptidão Operacional',
          icon: <Activity className="w-4 h-4 text-indigo-400" />,
        },
      ],
    },
    {
      id: 'documentos-group',
      label: 'DOCUMENTOS',
      items: [
        {
          id: 'controle-documental',
          label: 'Acervo & Biblioteca',
          icon: <BookOpen className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'verificacao-controle',
          label: 'Verificação & Controle',
          icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: 'historico-relatorios',
          label: 'Histórico & Relatórios',
          icon: <History className="w-4 h-4 text-emerald-400" />,
        },
      ],
    },
    {
      id: 'recursos-controles',
      label: 'RECURSOS & CONTROLES',
      items: [
        {
          id: 'ferramentas-metrologia',
          label: 'Ferramentas & Metrologia',
          icon: <Sliders className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'importacao-inteligente',
          label: 'Importação de Dados',
          icon: <UploadCloud className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'outros-controles',
          label: 'Outros Controles',
          icon: <Layers className="w-4 h-4 text-emerald-400" />,
        },
      ],
    },
    {
      id: 'conhecimento-melhoria',
      label: 'CONHECIMENTO & MELHORIA',
      items: [
        {
          id: 'knowledgeBase-melhoria',
          label: 'Base de Conhecimento',
          icon: <Award className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'auditorias-licoes',
          label: 'Lições Aprendidas',
          icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'comparacaoRNC',
          label: 'Soluções Validadas',
          icon: <CheckSquare className="w-4 h-4 text-cyan-400" />,
        },
        {
          id: 'extrator',
          label: 'Extrator de NCs com IA',
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        },
        {
          id: 'manual-utilizacao',
          label: 'Manual de Utilização',
          icon: <BookOpen className="w-4 h-4 text-blue-400" />,
        },
      ],
    },
    {
      id: 'administracao',
      label: 'ADMINISTRAÇÃO',
      items: [
        {
          id: 'configuracoes-org',
          label: 'Organização',
          icon: <Building2 className="w-4 h-4 text-blue-400" />,
        },
        {
          id: 'admin-central',
          label: 'Usuários & Permissões',
          icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
        },
        {
          id: 'admin-audit-trail',
          label: 'Auditoria do Sistema',
          icon: <History className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'onboarding-novo-cliente',
          label: 'Implantação e Onboarding',
          icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'diagnosticos-tecnicos',
          label: 'Diagnósticos Técnicos',
          icon: <Cpu className="w-4 h-4 text-slate-400" />,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand & Close Button for Mobile */}
      <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[8px] bg-slate-800 border border-slate-700/80 flex items-center justify-center text-white shadow-xs shrink-0">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">QUALIGEST</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50 uppercase">
                {orgSigla}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight truncate">{orgName}</p>
          </div>
        </div>

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
      <div className="p-3.5 sm:p-4 border-b border-slate-800/60 shrink-0">
        <button
          onClick={handleNewNCClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-[8px] transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Não Conformidade</span>
        </button>
      </div>

      {/* Navigation Groups (8 Consolidated Blocks) */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.id];

          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer select-none transition-colors"
              >
                <span>{group.label}</span>
                <span className="text-slate-500">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
              </button>

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = 
                      activeTab === item.id || 
                      (item.id === 'knowledgeBase-melhoria' && activeTab === 'knowledgeBase') ||
                      (item.id === 'relatorio' && (activeTab === 'oficial' || activeTab === 'formulario'));

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-[7px] text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold shadow-xs border border-slate-700/80'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
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
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {userProfile?.displayName || user.email?.split('@')[0] || 'Usuário SGQ'}
              </p>
              <p className="text-[10px] text-indigo-400 truncate">
                {userProfile?.role || 'AUDITOR'} • {orgName}
              </p>
            </div>
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
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{orgName}</p>
                <p className="text-[10px] text-slate-500 truncate">Sessão Local</p>
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1 border border-slate-700 shrink-0 ml-2">
              <LogIn className="w-3 h-3 text-indigo-400" />
              Entrar
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 border-r border-slate-800 selection:bg-blue-600 selection:text-white h-screen sticky top-0">
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
