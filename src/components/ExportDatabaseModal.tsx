import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  FileText, 
  FileCode2, 
  CheckCircle2, 
  Layers, 
  X, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { NCRecord } from '../types';
import { exportToExcel, exportToCSV, exportToJSON } from '../utils/exportHelpers';

interface ExportDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  allRecords: NCRecord[];
  filteredRecords?: NCRecord[];
  selectedRecords?: NCRecord[];
}

export const ExportDatabaseModal: React.FC<ExportDatabaseModalProps> = ({
  isOpen,
  onClose,
  allRecords,
  filteredRecords,
  selectedRecords = [],
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasSelected = selectedRecords.length > 0;
  const filteredCount = filteredRecords ? filteredRecords.length : allRecords.length;

  const getTargetRecords = (): NCRecord[] => {
    if (exportScope === 'selected' && hasSelected) return selectedRecords;
    if (exportScope === 'filtered' && filteredRecords) return filteredRecords;
    return allRecords;
  };

  const handleExecuteExport = () => {
    const recordsToExport = getTargetRecords();
    if (!recordsToExport.length) {
      setExportError('Nenhum registro selecionado para exportação.');
      return;
    }
    setExportError(null);

    if (exportFormat === 'xlsx') {
      exportToExcel(recordsToExport, 'banco_dados_sgq_rnc');
    } else if (exportFormat === 'csv') {
      exportToCSV(recordsToExport, 'banco_dados_sgq_rnc');
    } else if (exportFormat === 'json') {
      exportToJSON(recordsToExport, 'backup_banco_dados_sgq');
    }

    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1800);
  };

  const targetCount = getTargetRecords().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-[12px] max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[8px] bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Exportar Banco de Dados SGQ
              </h3>
              <p className="text-xs text-slate-500">
                Gere arquivos compatíveis com Excel, Power BI, ERPs e auditorias formais.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-[6px] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {exportError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[8px] text-xs text-rose-700 flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Scope Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            1. Escopo dos Dados a Exportar
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setExportScope('all')}
              className={`p-2.5 rounded-[8px] border text-left transition-all ${
                exportScope === 'all'
                  ? 'border-slate-900 bg-slate-900 text-white font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="text-xs font-semibold">Toda a Base</div>
              <div className={`text-[11px] font-normal mt-0.5 ${exportScope === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                {allRecords.length} RNCs
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportScope('filtered')}
              className={`p-2.5 rounded-[8px] border text-left transition-all ${
                exportScope === 'filtered'
                  ? 'border-slate-900 bg-slate-900 text-white font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="text-xs font-semibold">Filtradas</div>
              <div className={`text-[11px] font-normal mt-0.5 ${exportScope === 'filtered' ? 'text-slate-300' : 'text-slate-500'}`}>
                {filteredCount} RNCs
              </div>
            </button>

            <button
              type="button"
              disabled={!hasSelected}
              onClick={() => setExportScope('selected')}
              className={`p-2.5 rounded-[8px] border text-left transition-all ${
                !hasSelected
                  ? 'opacity-40 cursor-not-allowed border-slate-200 bg-white'
                  : exportScope === 'selected'
                  ? 'border-slate-900 bg-slate-900 text-white font-bold'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="text-xs font-semibold">Marcadas</div>
              <div className={`text-[11px] font-normal mt-0.5 ${exportScope === 'selected' ? 'text-slate-300' : 'text-slate-500'}`}>
                {selectedRecords.length} RNCs
              </div>
            </button>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            2. Formato do Arquivo
          </label>
          <div className="space-y-2">
            <label
              onClick={() => setExportFormat('xlsx')}
              className={`flex items-start p-2.5 rounded-[8px] border cursor-pointer transition-all ${
                exportFormat === 'xlsx'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'xlsx'}
                onChange={() => setExportFormat('xlsx')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Microsoft Excel (.xlsx)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-emerald-100 text-emerald-800">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Planilha formatada com abas da base de dados, plano de ações e resumo executivo SGQ.
                </p>
              </div>
            </label>

            <label
              onClick={() => setExportFormat('csv')}
              className={`flex items-start p-2.5 rounded-[8px] border cursor-pointer transition-all ${
                exportFormat === 'csv'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'csv'}
                onChange={() => setExportFormat('csv')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="ml-3 flex-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  CSV Padrão UTF-8 (.csv)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Arquivo delimitado por ponto e vírgula com encoding UTF-8 com BOM.
                </p>
              </div>
            </label>

            <label
              onClick={() => setExportFormat('json')}
              className={`flex items-start p-2.5 rounded-[8px] border cursor-pointer transition-all ${
                exportFormat === 'json'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={exportFormat === 'json'}
                onChange={() => setExportFormat('json')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="ml-3 flex-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-blue-600" />
                  JSON Estruturado (.json)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cópia completa e aninhada do banco de dados para integração com APIs REST ou backup técnico.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Total a exportar: <strong>{targetCount}</strong> RNC(s)
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={downloadSuccess}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Arquivo Gerado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar Arquivo ({exportFormat.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
