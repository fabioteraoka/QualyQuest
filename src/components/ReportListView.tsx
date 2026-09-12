import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  PlusCircle, 
  Kanban, 
  Table as TableIcon, 
  Trash2, 
  Edit3, 
  Eye, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  CheckSquare,
  Square,
  Layers,
  ChevronDown
} from 'lucide-react';
import { NCRecord, StatusGeralNC } from '../types';
import { formatarData, calcularDiasRestantes, obterCorRisco, obterCorStatus } from '../utils/qualityHelpers';
import { exportToExcel, exportToCSV } from '../utils/exportHelpers';
import { printElement } from '../utils/printHelpers';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ExportDatabaseModal } from './ExportDatabaseModal';

interface ReportListViewProps {
  records: NCRecord[];
  onSelectNC: (nc: NCRecord) => void;
  onEditNC: (nc: NCRecord) => void;
  onViewOfficial: (nc: NCRecord) => void;
  onNewNC: () => void;
  onDeleteNC: (id: string) => void;
  onDeleteMultipleNC?: (ids: string[]) => void;
  onAuditNC?: (nc: NCRecord) => void;
  initialStatusFilter?: string;
}

export const ReportListView: React.FC<ReportListViewProps> = ({
  records = [],
  onSelectNC,
  onEditNC,
  onViewOfficial,
  onNewNC,
  onDeleteNC,
  onDeleteMultipleNC,
  onAuditNC,
  initialStatusFilter,
}) => {
  const safeRecords = useMemo(() => (records || []).filter((r): r is NCRecord => Boolean(r && r.id)), [records]);
  const [viewMode, setViewMode] = useState<'tabela' | 'kanban'>('tabela');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'ALL');
  const [riscoFilter, setRiscoFilter] = useState('ALL');
  const [setorFilter, setSetorFilter] = useState('ALL');
  const [categoriaFilter, setCategoriaFilter] = useState('ALL');
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [itemToDelete, setItemToDelete] = useState<NCRecord | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Distinct Setores and Categorias
  const setores = useMemo(() => {
    const set = new Set<string>();
    safeRecords.forEach(r => r.setor && set.add(r.setor));
    return Array.from(set);
  }, [safeRecords]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    safeRecords.forEach(r => r.categoria && set.add(r.categoria));
    return Array.from(set);
  }, [safeRecords]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return safeRecords.filter((r) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          r.numeroNC?.toLowerCase().includes(q) ||
          r.titulo?.toLowerCase().includes(q) ||
          r.descricaoNC?.toLowerCase().includes(q) ||
          r.auditor?.toLowerCase().includes(q) ||
          r.responsavel?.toLowerCase().includes(q) ||
          r.normaReferencia?.toLowerCase().includes(q) ||
          r.acaoCorretiva?.responsavel?.toLowerCase().includes(q) ||
          r.preAnaliseContencao?.responsavel?.toLowerCase().includes(q) ||
          r.setor?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && r.statusGeral !== statusFilter) {
        return false;
      }

      // Risco
      if (riscoFilter !== 'ALL' && r.avaliacaoRiscoInicial?.nivel !== riscoFilter) {
        return false;
      }

      // Setor
      if (setorFilter !== 'ALL' && r.setor !== setorFilter) {
        return false;
      }

      // Categoria
      if (categoriaFilter !== 'ALL' && r.categoria !== categoriaFilter) {
        return false;
      }

      // Tipo Ação
      if (tipoFilter !== 'ALL' && r.tipoAcao !== tipoFilter) {
        return false;
      }

      // Only Overdue
      if (onlyOverdue) {
        const dias = calcularDiasRestantes(r.prazoResposta);
        if (dias >= 0 || r.statusGeral === 'Encerrada') return false;
      }

      return true;
    });
  }, [records, search, statusFilter, riscoFilter, setorFilter, categoriaFilter, tipoFilter, onlyOverdue]);

  // Selected records objects
  const selectedRecords = useMemo(() => {
    return safeRecords.filter(r => selectedIds.includes(r.id));
  }, [safeRecords, selectedIds]);

  // Checkbox handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r?.id).filter(Boolean) as string[]);
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Direct Excel download
  const handleQuickExcel = () => {
    exportToExcel(filteredRecords.length > 0 ? filteredRecords : safeRecords, 'banco_dados_sgq_rnc');
  };

  const handlePrintConsolidated = () => {
    const tableEl = document.getElementById('report-table-view') || document.querySelector('table');
    if (tableEl) {
      printElement(tableEl as HTMLElement, 'Relatorio_Consolidado_RNC');
    } else {
      window.print();
    }
  };

  // Confirm Single Delete
  const handleConfirmSingleDelete = () => {
    if (itemToDelete) {
      onDeleteNC(itemToDelete.id);
      setSelectedIds(prev => prev.filter(id => id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  // Confirm Batch Delete
  const handleConfirmBatchDelete = () => {
    if (onDeleteMultipleNC) {
      onDeleteMultipleNC(selectedIds);
    } else {
      selectedIds.forEach(id => onDeleteNC(id));
    }
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  // Kanban Columns Definition
  const kanbanColumns: { status: StatusGeralNC; title: string; color: string }[] = [
    { status: 'Aberta', title: '1. Abertas', color: 'border-slate-300' },
    { status: 'Em Contenção', title: '2. Em Contenção', color: 'border-amber-300' },
    { status: 'Em Análise de Causa', title: '3. Causa Raiz', color: 'border-purple-300' },
    { status: 'Ação em Andamento', title: '4. Ação Corretiva', color: 'border-blue-300' },
    { status: 'Aguardando Eficácia', title: '5. Auditar Eficácia', color: 'border-indigo-300' },
    { status: 'Encerrada', title: '6. Encerradas', color: 'border-emerald-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Relatório de Não Conformidades & Ações Corretivas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visão gerencial consolidada com exclusão de registros, exportação completa para Excel (.xlsx) e controle de fluxo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 text-xs shrink-0">
            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'tabela' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'kanban' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Quick Excel Export */}
          <button
            onClick={handleQuickExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 transition-all hover:scale-[1.02] cursor-pointer"
            title="Exportar base completa para planilha Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Exportar Excel (.xlsx)</span>
            <span className="sm:hidden">Excel</span>
          </button>

          {/* Advanced Export Options Modal */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Opções de exportação (Excel, CSV, JSON)"
          >
            <Download className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="hidden sm:inline">Exportação</span>
          </button>

          <button
            onClick={handlePrintConsolidated}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Imprimir visualização"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={onNewNC}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>+ Nova NC</span>
          </button>
        </div>
      </div>

      {/* Floating Batch Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-3.5 px-5 rounded-2xl shadow-xl border border-indigo-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-slideDown">
          <div className="flex items-center space-x-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center font-bold text-white text-xs">
              {selectedIds.length}
            </span>
            <span className="font-semibold">
              {selectedIds.length === 1 ? '1 registro selecionado' : `${selectedIds.length} registros selecionados`}
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-indigo-200 hover:text-white underline ml-2"
            >
              Desmarcar todos
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportToExcel(selectedRecords, 'rnc_selecionadas')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Selecionadas ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir Selecionadas</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por Nº NC, título, norma, auditor ou descrição..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700"
            >
              <option value="ALL">Status: Todos</option>
              <option value="Aberta">Aberta</option>
              <option value="Em Contenção">Em Contenção</option>
              <option value="Em Análise de Causa">Em Análise de Causa</option>
              <option value="Ação em Andamento">Ação em Andamento</option>
              <option value="Aguardando Eficácia">Aguardando Eficácia</option>
              <option value="Encerrada">Encerrada</option>
              <option value="Reaberta">Reaberta</option>
            </select>
          </div>

          {/* Risco Filter */}
          <div>
            <select
              value={riscoFilter}
              onChange={(e) => setRiscoFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700"
            >
              <option value="ALL">Risco: Todos</option>
              <option value="Crítico">Crítico (1A, 2A, 1C)</option>
              <option value="Alto">Alto (2C, 3B, 1D)</option>
              <option value="Médio">Médio (3C, 2D, 1E)</option>
              <option value="Baixo">Baixo (4E, 5E)</option>
            </select>
          </div>

          {/* Setor Filter */}
          <div>
            <select
              value={setorFilter}
              onChange={(e) => setSetorFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700 truncate"
            >
              <option value="ALL">Setor: Todos</option>
              {setores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Categoria Filter */}
          <div>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700 truncate"
            >
              <option value="ALL">Categoria: Todas</option>
              {categorias.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Tags & Reset */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setOnlyOverdue(!onlyOverdue)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                onlyOverdue
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Apenas Prazos Vencidos</span>
            </button>

            {(search || statusFilter !== 'ALL' || riscoFilter !== 'ALL' || setorFilter !== 'ALL' || categoriaFilter !== 'ALL' || onlyOverdue) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setRiscoFilter('ALL');
                  setSetorFilter('ALL');
                  setCategoriaFilter('ALL');
                  setOnlyOverdue(false);
                }}
                className="text-slate-500 hover:text-slate-800 underline ml-2"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          <span className="text-slate-500 font-medium">
            Exibindo <strong>{filteredRecords.length}</strong> de <strong>{records.length}</strong> Não Conformidades
          </span>
        </div>
      </div>

      {/* VIEW: TABELA / CARDS DETALHADOS */}
      {viewMode === 'tabela' && (
        <div id="report-table-view" className="space-y-3">
          {/* Mobile Cards Layout (< md screens) */}
          <div className="md:hidden space-y-3">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((nc) => {
                const dias = calcularDiasRestantes(nc.prazoResposta);
                const isOverdue = dias < 0 && nc.statusGeral !== 'Encerrada';
                const isSelected = selectedIds.includes(nc.id);

                return (
                  <div
                    key={nc.id}
                    className={`bg-white rounded-xl border p-4 shadow-xs transition-colors ${
                      isSelected ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200'
                    }`}
                  >
                    {/* Card Top Row: Checkbox + NC Number + Status */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(nc.id, e as any)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <button
                          onClick={() => onSelectNC(nc)}
                          className="font-mono font-bold text-xs text-indigo-600 hover:underline"
                        >
                          #{nc.numeroNC}
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">({nc.tipoAcao})</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            obterCorRisco(nc.avaliacaoRiscoInicial?.nivel || 'Médio').badgeBg
                          }`}
                        >
                          {nc.avaliacaoRiscoInicial?.codigo || '2C'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            obterCorStatus(nc.statusGeral).bg
                          } ${obterCorStatus(nc.statusGeral).text}`}
                        >
                          {nc.statusGeral}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="py-2.5 space-y-1.5" onClick={() => onSelectNC(nc)}>
                      <h4 className="font-semibold text-xs text-slate-900 line-clamp-1 cursor-pointer hover:text-indigo-600">
                        {nc.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {nc.descricaoNC}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          {nc.setor || 'Setor N/A'}
                        </span>
                        {nc.normaReferencia && (
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                            {nc.normaReferencia}
                          </span>
                        )}
                        <span className={`font-semibold ml-auto ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                          Prazo: {formatarData(nc.prazoResposta)} {isOverdue && '(EXPIRADO)'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 gap-2">
                      <div className="text-[10px] text-slate-400 truncate">
                        Auditor: <strong className="text-slate-600">{nc.auditor || '-'}</strong>
                      </div>

                      <div className="flex items-center gap-1">
                        {onAuditNC && (
                          <button
                            onClick={() => onAuditNC(nc)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Auditar com IA"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>IA</span>
                          </button>
                        )}
                        <button
                          onClick={() => onViewOfficial(nc)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200"
                          title="Ficha Oficial F 001-29"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditNC(nc)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(nc)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                Nenhuma não conformidade encontrada com os filtros selecionados.
              </div>
            )}
          </div>

          {/* Desktop Table Layout (>= md screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                        onChange={handleToggleSelectAll}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Selecionar / Desmarcar todos"
                      />
                    </th>
                    <th className="py-3 px-3">Nº NC</th>
                    <th className="py-3 px-3">Título & Norma</th>
                    <th className="py-3 px-3">Setor / Base</th>
                    <th className="py-3 px-3">Matriz Risco</th>
                    <th className="py-3 px-3">Data / Prazo</th>
                    <th className="py-3 px-3">Auditor</th>
                    <th className="py-3 px-3">Responsável Ação</th>
                    <th className="py-3 px-3">Status SGQ</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((nc) => {
                      const dias = calcularDiasRestantes(nc.prazoResposta);
                      const isOverdue = dias < 0 && nc.statusGeral !== 'Encerrada';
                      const isSelected = selectedIds.includes(nc.id);

                      return (
                        <tr 
                          key={nc.id} 
                          className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectRow(nc.id, e as any)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            <button
                              onClick={() => onSelectNC(nc)}
                              className="hover:text-indigo-600 hover:underline font-mono font-bold"
                            >
                              #{nc.numeroNC}
                            </button>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {nc.tipoAcao}
                            </div>
                          </td>

                          <td className="py-3 px-3 max-w-[280px]">
                            <div className="font-medium text-slate-900 truncate">
                              {nc.titulo}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {nc.descricaoNC}
                            </div>
                            {nc.normaReferencia && (
                              <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                {nc.normaReferencia}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                            <div className="font-medium">{nc.setor}</div>
                            <div className="text-[10px] text-slate-400">{nc.categoria}</div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${obterCorRisco(nc.avaliacaoRiscoInicial?.nivel || 'Médio').badgeBg}`}>
                              {nc.avaliacaoRiscoInicial?.codigo || '2C'}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                              {formatarData(nc.prazoResposta)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isOverdue ? `(EXPIRADO)` : `${dias}d restantes`}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                            {nc.auditor}
                          </td>

                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            <div className="font-medium">{nc.responsavel || nc.acaoCorretiva?.responsavel || '-'}</div>
                            <div className="text-[10px] text-slate-400">
                              {nc.acaoCorretiva?.status || 'Não iniciada'}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${obterCorStatus(nc.statusGeral).bg} ${obterCorStatus(nc.statusGeral).text}`}>
                              {nc.statusGeral}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              {onAuditNC && (
                                <button
                                  onClick={() => onAuditNC(nc)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200/80 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs hover:scale-105"
                                  title="Verificar Pertinência e Enquadramento com IA contra Manuais"
                                >
                                  <Sparkles className="w-3 h-3 text-indigo-600" />
                                  <span className="hidden xl:inline">Auditar IA</span>
                                </button>
                              )}
                              <button
                                onClick={() => onViewOfficial(nc)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Visualizar Ficha Oficial F 001-29"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onEditNC(nc)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Editar Não Conformidade"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setItemToDelete(nc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Nenhuma não conformidade encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: KANBAN FLOW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {kanbanColumns.map((col) => {
            const colRecords = filteredRecords.filter(r => r.statusGeral === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-100/70 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col min-h-[450px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {col.title}
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-xs">
                    {colRecords.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                  {colRecords.map((nc) => {
                    const dias = calcularDiasRestantes(nc.prazoResposta);
                    const isOverdue = dias < 0 && nc.statusGeral !== 'Encerrada';

                    return (
                      <div
                        key={nc.id}
                        onClick={() => onSelectNC(nc)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all space-y-2 group relative"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-mono font-bold text-slate-900">
                            #{nc.numeroNC}
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${obterCorRisco(nc.avaliacaoRiscoInicial?.nivel || 'Médio').badgeBg}`}>
                              {nc.avaliacaoRiscoInicial?.codigo || '2C'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(nc);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-opacity"
                              title="Excluir Não Conformidade"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h5 className="text-xs font-bold text-slate-800 line-clamp-2">
                          {nc.titulo}
                        </h5>

                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {nc.descricaoNC}
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Setor: <strong>{(nc.setor || 'Geral').split('-')[0]}</strong></span>
                          <div className="flex items-center gap-1.5">
                            {onAuditNC && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAuditNC(nc);
                                }}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                title="Auditar Pertinência com IA"
                              >
                                <Sparkles className="w-3 h-3" />
                              </button>
                            )}
                            <span className={isOverdue ? 'text-rose-600 font-bold' : 'font-medium'}>
                              {formatarData(nc.prazoResposta)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colRecords.length === 0 && (
                    <div className="h-32 flex items-center justify-center text-center text-slate-400 text-xs italic">
                      Nenhum item nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        record={itemToDelete}
      />

      {/* Batch Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={handleConfirmBatchDelete}
        count={selectedIds.length}
      />

      {/* Export Database Modal */}
      <ExportDatabaseModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allRecords={safeRecords}
        filteredRecords={filteredRecords}
        selectedRecords={selectedRecords}
      />
    </div>
  );
};
