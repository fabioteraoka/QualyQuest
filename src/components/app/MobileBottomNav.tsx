import React from 'react';
import { LayoutDashboard, FileText, Bell, Plus, Menu } from 'lucide-react';
import { AlertaItem } from '../../types';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  recordsCount: number;
  alertas: AlertaItem[];
  onNewNC: () => void;
  onClearReportFilter: () => void;
  onOpenMobileSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  recordsCount,
  alertas,
  onNewNC,
  onClearReportFilter,
  onOpenMobileSidebar,
}) => {
  const hasCriticalAlerts = alertas.some(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE'
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-colors cursor-pointer ${
          activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Dashboard</span>
      </button>

      <button
        onClick={() => {
          onClearReportFilter();
          setActiveTab('relatorio');
        }}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-colors cursor-pointer ${
          activeTab === 'relatorio' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>RNCs ({recordsCount})</span>
      </button>

      {/* Center Prominent New NC Button */}
      <button
        onClick={onNewNC}
        className="flex flex-col items-center justify-center -mt-5 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg border-2 border-slate-900 transition-transform active:scale-95 cursor-pointer"
        aria-label="Nova Não Conformidade"
        title="Criar Nova RNC"
      >
        <Plus className="w-5 h-5" />
      </button>

      <button
        onClick={() => setActiveTab('alertas')}
        className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-colors cursor-pointer ${
          activeTab === 'alertas' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Bell className="w-4 h-4" />
        <span>Alertas</span>
        {hasCriticalAlerts && (
          <span className="absolute -top-0.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
        )}
      </button>

      <button
        onClick={onOpenMobileSidebar}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
      >
        <Menu className="w-4 h-4" />
        <span>Menu</span>
      </button>
    </nav>
  );
};
