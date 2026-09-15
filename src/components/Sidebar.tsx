import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Bell, 
  BookOpen, 
  Sparkles, 
  Printer, 
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
  Compass,
  Building2,
  Sliders,
  FileCheck2,
  Lightbulb,
  Users,
  GraduationCap,
  Clock,
  History,
  Globe,
  Milestone,
  Layers,
  ClipboardCheck
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
  const alertasCriticos = (alertas || []).filter(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.tipoAlerta === 'VENCE_7_DIAS'
  );

  const handleItemClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const handleNewNCClick = () => {
    onNewNC();
    if (onCloseMobile) onCloseMobile();
  };

  const orgSigla = activeOrganization?.configuration?.identidadeVisual?.siglaAeronautica || 
                   (activeOrganization?.name ? activeOrganization.name.substring(0, 3).toUpperCase() : 'SGQ');
  const orgName = activeOrganization?.name || 'QualiGest SGQ';
  const orgLegalName = activeOrganization?.legalName || orgName;

  const navGroups = [
    {
      label: 'Visão Geral & Gestão',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Executivo',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'conhecaQualigest',
          label: 'Conheça o QualiGest',
          icon: <Compass className="w-4 h-4 text-emerald-400" />,
          tag: 'TOUR',
        },
        {
          id: 'saudeSGQ',
          label: 'Saúde do SGQ',
          icon: <Activity className="w-4 h-4" />,
          tag: 'FASE 5',
        },
        {
          id: 'apresentacao',
          label: 'Apresentação Gerencial & Evolução',
          icon: <Presentation className="w-4 h-4 text-sky-400" />,
          tag: 'FASE 12.1',
        },
        {
          id: 'arquitetura',
          label: 'Arquitetura do Sistema',
          icon: <Cpu className="w-4 h-4" />,
          tag: 'REAL',
        },
        {
          id: 'relatorio',
          label: 'Registros de RNC',
          icon: <FileText className="w-4 h-4" />,
        },
        {
          id: 'incidencias',
          label: 'Incidências & Pareto',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: 'alertas',
          label: 'Central de Alertas',
          icon: <Bell className="w-4 h-4" />,
          badge: alertasCriticos.length > 0 ? alertasCriticos.length : undefined,
          badgeColor: 'bg-rose-600 text-white',
        },
      ],
    },
    {
      label: 'Auditorias Externas',
      items: [
        {
          id: 'auditorias-gestao',
          label: 'Auditorias Recebidas',
          icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
          tag: 'FASE 8',
        },
        {
          id: 'auditorias-constatacoes',
          label: 'Constatações (Findings)',
          icon: <FileCheck2 className="w-4 h-4 text-blue-400" />,
        },
        {
          id: 'auditorias-licoes',
          label: 'Lições Aprendidas',
          icon: <Lightbulb className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'auditorias-dashboard',
          label: 'Dashboard de Auditorias',
          icon: <BarChart3 className="w-4 h-4 text-purple-400" />,
        },
      ],
    },
    {
      label: 'Auditorias & Requisitos de Clientes',
      items: [
        {
          id: 'clientes-requisitos',
          label: 'Requisitos & Avaliações',
          icon: <ClipboardCheck className="w-4 h-4 text-sky-400" />,
          tag: 'FASE 13',
        },
        {
          id: 'clientes-matriz',
          label: 'Matriz de Cobertura SGQ',
          icon: <Layers className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'clientes-cockpit',
          label: 'Cockpit & Bases Clientes',
          icon: <Building2 className="w-4 h-4 text-indigo-400" />,
        },
      ],
    },
    {
      label: 'Pessoas & Competências',
      items: [
        {
          id: 'pessoas-competencias',
          label: 'Colaboradores & Matriz',
          icon: <Users className="w-4 h-4 text-emerald-400" />,
          tag: 'FASE 9',
        },
        {
          id: 'treinamentos-qualificacoes',
          label: 'Treinamentos & CHTs',
          icon: <GraduationCap className="w-4 h-4 text-sky-400" />,
        },
        {
          id: 'central-vencimentos-gaps',
          label: 'Vencimentos & Gaps',
          icon: <Clock className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'competencias-dashboard',
          label: 'Dashboard de Competências',
          icon: <BarChart3 className="w-4 h-4 text-indigo-400" />,
        },
      ],
    },
    {
      label: 'Aprendizado & Validação',
      items: [
        {
          id: 'comparacaoRNC',
          label: 'Comparação de RNCs',
          icon: <Scale className="w-4 h-4" />,
          tag: 'FASE 3',
        },
        {
          id: 'validacaoQueue',
          label: 'Fila de Validação',
          icon: <CheckSquare className="w-4 h-4" />,
        },
        {
          id: 'knowledgeBase',
          label: 'Base de Conhecimento SGQ',
          icon: <Award className="w-4 h-4" />,
        },
      ],
    },
    {
      label: 'Controle Documental & Revisões',
      items: [
        {
          id: 'controle-documental',
          label: 'Controle Documental',
          icon: <BookOpen className="w-4 h-4 text-sky-400" />,
          tag: 'FASE 10',
        },
        {
          id: 'consulta-temporal',
          label: 'Conhecimento Temporal',
          icon: <History className="w-4 h-4 text-emerald-400" />,
        },
        {
          id: 'fontes-externas',
          label: 'Fontes Oficiais & Verificação',
          icon: <Globe className="w-4 h-4 text-amber-400" />,
        },
        {
          id: 'documentos-dashboard',
          label: 'Dashboard Documental',
          icon: <BarChart3 className="w-4 h-4 text-indigo-400" />,
        },
      ],
    },
    {
      label: 'Conhecimento & Compliance',
      items: [
        {
          id: 'manual-utilizacao',
          label: 'Manual de Utilização',
          icon: <BookOpen className="w-4 h-4 text-cyan-400" />,
          tag: 'DOC',
        },
        {
          id: 'manuais',
          label: 'Biblioteca de Manuais',
          icon: <BookOpen className="w-4 h-4" />,
        },
        {
          id: 'extrator',
          label: 'Extrator de NCs (IA)',
          icon: <Sparkles className="w-4 h-4" />,
          tag: 'IA',
        },
      ],
    },
    {
      label: 'Administração & Multi-Tenant',
      items: [
        {
          id: 'admin-central',
          label: 'Gestão Central & Usuários',
          icon: <ShieldCheck className="w-4 h-4 text-blue-400" />,
          tag: 'FASE 11',
        },
        {
          id: 'configuracoes-org',
          label: 'Configurações da Org',
          icon: <Sliders className="w-4 h-4" />,
        },
        {
          id: 'onboarding-novo-cliente',
          label: 'Novo Cliente / Onboarding',
          icon: <Building2 className="w-4 h-4" />,
          tag: 'MULTI',
        },
        {
          id: 'oficial',
          label: 'Ficha Oficial F 001-29',
          icon: <Printer className="w-4 h-4" />,
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

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${
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

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          item.badgeColor || 'bg-slate-700 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.tag && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                        {item.tag}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System Info / User Footer */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 text-xs shrink-0 space-y-2">
        {/* Activation Checklist Link */}
        {onOpenChecklist && (
          <button
            onClick={() => {
              onOpenChecklist();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] bg-slate-800/80 hover:bg-slate-800 text-blue-300 hover:text-blue-200 border border-blue-900/50 transition-colors text-[11px] font-semibold cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Checklist de Ativação</span>
            </div>
            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
              9 ETAPAS
            </span>
          </button>
        )}

        {onOpenTechnicalAudit && (
          <button
            onClick={() => {
              onOpenTechnicalAudit();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-indigo-900/50 transition-colors text-[11px] font-semibold cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Modo Auditoria Técnica</span>
            </div>
            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
              AUDIT
            </span>
          </button>
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
