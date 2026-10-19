import React, { useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  CloudOff,
  Download,
  Filter,
  HelpCircle,
  Layers,
  MapPin,
  Printer,
  Search,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const TopBar: React.FC = () => {
  const {
    db,
    filtroBase,
    setFiltroBase,
    filtroCategoria,
    setFiltroCategoria,
    filtroSituacao,
    setFiltroSituacao,
    buscaGlobal,
    setBuscaGlobal,
    dataReferencia,
    setDataReferencia,
    faixas,
    setFaixas,
    currentUser,
    setCurrentUser,
    triggerPrint,
    activeTab,
    isOffline,
  } = useApp();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shortcut key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' to focus search
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // 'Ctrl+P' or 'Cmd+P' to trigger app print
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerPrint]);

  const bases = [{ id: 'TOTAL', nome: 'Todas as Bases (TOTAL)' }, ...db.bases];

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Offline Status Warning Bar */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1 text-xs font-bold flex items-center justify-center gap-2 border-b border-amber-600 shadow-2xs">
          <CloudOff className="w-3.5 h-3.5 text-slate-950 shrink-0" />
          <span>Offline — alterações serão sincronizadas</span>
        </div>
      )}

      {/* Primary Top Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-900 flex items-center justify-center text-white font-bold text-base shadow-xs">
            IA
          </div>
          <div className="leading-tight">
            <span className="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap block">
              IMPACTO AVIATION
            </span>
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap block">
              Roster &amp; Designação Técnica
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={buscaGlobal}
            onChange={(e) => setBuscaGlobal(e.target.value)}
            placeholder="Buscar mecânico, CANAC, licença ou frota... (Pressione '/' para buscar)"
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-600 focus:border-sky-600 transition-colors"
          />
          {buscaGlobal && (
            <button
              onClick={() => setBuscaGlobal('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* User Role Switcher & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User selector for demo permissions */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = db.usuarios.find((u) => u.id === e.target.value);
                if (found) setCurrentUser(found);
              }}
              className="bg-transparent text-slate-700 font-medium focus:outline-hidden cursor-pointer"
            >
              {db.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.perfil})
                </option>
              ))}
            </select>
          </div>

          {/* Contextual Help Button */}
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('open-help-drawer', { detail: { topic: activeTab } })
              )
            }
            title="Ajuda contextual sobre esta tela (?)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-700" />
            <span className="hidden sm:inline">Ajuda</span>
          </button>

          {/* Quick Print Button */}
          <button
            onClick={triggerPrint}
            title="Imprimir visualização atual (Ctrl+P)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-sky-700" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Global Filter & Parameters Bar */}
      <div className="bg-slate-50/80 border-t border-slate-200/60 px-6 py-2 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          {/* Base Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span className="font-semibold text-slate-700">Base:</span>
            <select
              value={filtroBase}
              onChange={(e) => setFiltroBase(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-600 cursor-pointer"
            >
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id === 'TOTAL' ? 'TOTAL (Todas)' : `${b.id} - ${b.nome}`}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria Filter */}
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="font-semibold text-slate-700">Categoria:</span>
            <div className="inline-flex rounded border border-slate-300 bg-white overflow-hidden text-[11px]">
              {(['Mecânico', 'Administrativo', 'Todos'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(cat)}
                  className={`px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    filtroCategoria === cat
                      ? 'bg-sky-800 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Situação Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Situação:</span>
            <div className="inline-flex rounded border border-slate-300 bg-white overflow-hidden text-[11px]">
              {(['Ativo', 'Inativo', 'Todos'] as const).map((sit) => (
                <button
                  key={sit}
                  onClick={() => setFiltroSituacao(sit)}
                  className={`px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                    filtroSituacao === sit
                      ? 'bg-sky-800 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sit}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reference Date and Alert Ranges */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Data de Referência */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-300 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span className="font-semibold text-slate-700">Data Ref.:</span>
            <input
              type="date"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
              className="text-xs font-mono font-medium text-slate-900 border-none bg-transparent focus:outline-hidden"
            />
            <button
              onClick={() => setDataReferencia('2026-10-15')}
              title="Restaurar data base de auditoria (15/10/2026)"
              className="text-[10px] text-sky-700 hover:underline px-1 cursor-pointer font-medium"
            >
              (Auditoria)
            </button>
          </div>

          {/* Faixas de Alerta (30 / 60 / 90) */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-300 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-slate-700">Faixas (dias):</span>
            <div className="flex items-center gap-1 font-mono text-xs">
              <input
                type="number"
                min="1"
                max="365"
                value={faixas.faixa_1}
                onChange={(e) =>
                  setFaixas({ ...faixas, faixa_1: parseInt(e.target.value) || 30 })
                }
                className="w-10 px-1 py-0.5 text-center bg-orange-50 text-orange-950 font-bold border border-orange-200 rounded"
                title="1ª Faixa (Laranja)"
              />
              <span className="text-slate-400">/</span>
              <input
                type="number"
                min="1"
                max="365"
                value={faixas.faixa_2}
                onChange={(e) =>
                  setFaixas({ ...faixas, faixa_2: parseInt(e.target.value) || 60 })
                }
                className="w-10 px-1 py-0.5 text-center bg-yellow-50 text-yellow-950 font-bold border border-yellow-200 rounded"
                title="2ª Faixa (Amarelo)"
              />
              <span className="text-slate-400">/</span>
              <input
                type="number"
                min="1"
                max="365"
                value={faixas.faixa_3}
                onChange={(e) =>
                  setFaixas({ ...faixas, faixa_3: parseInt(e.target.value) || 90 })
                }
                className="w-10 px-1 py-0.5 text-center bg-amber-50 text-amber-950 font-bold border border-amber-200 rounded"
                title="3ª Faixa (Amarelo Claro)"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
