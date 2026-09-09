import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Sparkles, 
  BarChart3, 
  Bell, 
  Printer,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { AlertaItem } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertas: AlertaItem[];
  onOpenExtractor: () => void;
  onNewNC: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  alertas = [],
  onOpenExtractor,
  onNewNC,
}) => {
  const alertasCriticos = (alertas || []).filter(a => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.tipoAlerta === 'VENCE_7_DIAS');

  return (
    <header className="bg-white text-slate-800 sticky top-0 z-40 border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100 text-white transition-transform group-hover:scale-105">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                  Sistema de Gestão de Qualidade
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold uppercase tracking-wider">
                  SGQ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Monitoramento de Não Conformidades e Garantia</p>
            </div>
          </div>

          {/* Nav items (Bento Style Tabs) */}
          <nav className="hidden lg:flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-relatorio-btn"
              onClick={() => setActiveTab('relatorio')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'relatorio'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Relatório</span>
            </button>

            <button
              id="nav-incidencias-btn"
              onClick={() => setActiveTab('incidencias')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'incidencias'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              <span>Incidências</span>
            </button>

            <button
              id="nav-manuais-btn"
              onClick={() => setActiveTab('manuais')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manuais'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Banco de Manuais</span>
            </button>

            <button
              id="nav-oficial-btn"
              onClick={() => setActiveTab('oficial')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'oficial'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Ficha F 001-29</span>
            </button>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* System Online Status Pill */}
            <div className="hidden sm:flex bg-white border border-slate-200 rounded-lg px-3 py-1.5 items-center gap-2 shadow-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Sistema Online</span>
            </div>

            {/* Alertas */}
            <button
              id="nav-alertas-btn"
              onClick={() => setActiveTab('alertas')}
              className={`relative p-2 rounded-lg border transition-all ${
                activeTab === 'alertas' 
                  ? 'bg-amber-50 text-amber-700 border-amber-300' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs'
              }`}
              title="Central de Alertas & Prazos"
            >
              <Bell className="w-4 h-4" />
              {alertasCriticos.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                  {alertasCriticos.length}
                </span>
              )}
            </button>

            {/* Extrair Documento IA */}
            <button
              id="nav-extrair-ia-btn"
              onClick={onOpenExtractor}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Extração IA</span>
              <span className="md:hidden">IA</span>
            </button>

            {/* Novo Registro Manual */}
            <button
              id="nav-nova-nc-btn"
              onClick={onNewNC}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">+ Nova Não Conformidade</span>
              <span className="sm:hidden">+ Nova NC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bottom strip */}
      <div className="lg:hidden flex items-center justify-around bg-slate-50 py-2 px-2 border-t border-slate-200 text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${activeTab === 'dashboard' ? 'text-indigo-600 font-bold bg-white shadow-xs' : 'text-slate-500'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('relatorio')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${activeTab === 'relatorio' ? 'text-emerald-600 font-bold bg-white shadow-xs' : 'text-slate-500'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Relatório</span>
        </button>
        <button
          onClick={() => setActiveTab('incidencias')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${activeTab === 'incidencias' ? 'text-purple-600 font-bold bg-white shadow-xs' : 'text-slate-500'}`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Incidências</span>
        </button>
        <button
          onClick={() => setActiveTab('manuais')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${activeTab === 'manuais' ? 'text-indigo-600 font-bold bg-white shadow-xs' : 'text-slate-500'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Manuais</span>
        </button>
        <button
          onClick={() => setActiveTab('oficial')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${activeTab === 'oficial' ? 'text-amber-600 font-bold bg-white shadow-xs' : 'text-slate-500'}`}
        >
          <Printer className="w-4 h-4" />
          <span>Ficha F 001</span>
        </button>
        <button
          onClick={() => setActiveTab('alertas')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${activeTab === 'alertas' ? 'text-rose-600 font-bold bg-white shadow-xs' : 'text-slate-500'}`}
        >
          <Bell className="w-4 h-4" />
          <span>Alertas ({alertasCriticos.length})</span>
        </button>
      </div>
    </header>
  );
};
