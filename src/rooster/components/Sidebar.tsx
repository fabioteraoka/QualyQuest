import React from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Database,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Grid,
  HelpCircle,
  History,
  LayoutDashboard,
  MapPin,
  Plane,
  Settings,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { ActiveTab, useApp } from '../context/AppContext';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  highlight?: boolean;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isCloud, isOffline } = useApp();

  const primaryItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'designacao',
      label: 'Lista de Designação',
      icon: FileCheck2,
      highlight: true,
      badge: 'Oficial A4',
    },
    { id: 'roster', label: 'Relatório do Roster', icon: FileSpreadsheet, highlight: true },
    { id: 'conferencia', label: 'Conferência de Frota', icon: AlertTriangle },
  ];

  const cadastrosMestresItems: NavItem[] = [
    { id: 'pessoas', label: 'Pessoas & Colaboradores', icon: Users },
    { id: 'bases', label: 'Bases & Locais Operacionais', icon: MapPin, highlight: true },
    { id: 'ficha', label: 'Ficha do Mecânico', icon: UserCheck },
    { id: 'licencas', label: 'Habilitações & Licenças', icon: Award },
    { id: 'catalogo', label: 'Catálogo de Treinamentos', icon: BookOpen },
    { id: 'treinamentos', label: 'Treinamentos Realizados', icon: CalendarCheck },
    { id: 'motores', label: 'Motores & Frota', icon: Wrench },
  ];

  const analysisItems: NavItem[] = [
    { id: 'matrizes', label: 'Matrizes (Mapas de Calor)', icon: Grid },
    { id: 'vencimentos', label: 'Próximos Vencimentos', icon: Clock },
  ];

  const systemItems: NavItem[] = [
    { id: 'designacoes_crud', label: 'Designações (Tabelas)', icon: Plane },
    { id: 'importar', label: 'Importar / Exportar Excel', icon: Database },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
    { id: 'auditoria', label: 'Auditoria & Histórico', icon: History },
    { id: 'manual', label: 'Manual / Ajuda', icon: HelpCircle, highlight: true },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-5">
      <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-sky-900 text-white shadow-xs font-semibold'
                  : item.highlight
                  ? 'text-sky-950 bg-sky-50/70 hover:bg-sky-100/70 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-sky-700'
                      : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-sky-200 text-sky-900'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="no-print w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col justify-between overflow-y-auto h-[calc(100vh-73px)] p-3">
      <div>
        {renderNavGroup('Relatórios & Dashboard', primaryItems)}
        {renderNavGroup('Cadastros Mestres', cadastrosMestresItems)}
        {renderNavGroup('Análise & Qualidade', analysisItems)}
        {renderNavGroup('Sistema & Governança', systemItems)}
      </div>

      {/* Footer Info & Connection Status */}
      <div className="border-t border-slate-200 pt-3 px-2 text-[11px] text-slate-500 space-y-2">
        {/* Connection Status Badge */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
          <div className="flex items-center gap-1.5 truncate">
            {isCloud ? (
              isOffline ? (
                <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              )
            ) : (
              <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="text-[10px] font-semibold text-slate-700 truncate">
              {isCloud
                ? isOffline
                  ? 'Nuvem (Offline / Cache)'
                  : 'Nuvem (Firebase)'
                : 'Armazenamento Local'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isCloud
                ? isOffline
                  ? 'bg-amber-500'
                  : 'bg-emerald-500 animate-pulse'
                : 'bg-slate-400'
            }`}
            title={isCloud ? (isOffline ? 'Offline' : 'Online sincronizado') : 'Local'}
          />
        </div>

        <div className="flex items-center justify-between font-medium">
          <span>Impacto Aviation</span>
          <span className="text-slate-400 font-mono">v1.2.0</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
          Organização de Manutenção Aeronáutica ANAC / EASA
        </p>
      </div>
    </aside>
  );
};
