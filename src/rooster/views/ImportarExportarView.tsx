import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileCheck2,
  FileCode,
  FileSpreadsheet,
  FileText,
  Layers,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PainelConferencia } from '../components/PainelConferencia';
import { useApp } from '../context/AppContext';
import {
  commitImportPayload,
  exportBackupJson,
  exportDatabaseToExcel,
  generateConferenceData,
  ImportValidationReport,
  parseImportJson,
  parseImportXlsx,
  PostImportConferenceData,
  RawImportPayload,
  restoreOfficialBackup,
  validateImportPayload,
} from '../services/storage';

export const ImportarExportarView: React.FC = () => {
  const {
    db,
    currentUser,
    showToast,
    lastConferenceData,
    setLastConferenceData,
    loadEmbeddedOfficial,
    isLoadingEmbedded,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeImportTab, setActiveImportTab] = useState<'upload' | 'paste'>('upload');
  const [importMode, setImportMode] = useState<'substituir' | 'mesclar'>('substituir');
  const [pastedJsonText, setPastedJsonText] = useState<string>('');

  const [fileName, setFileName] = useState<string>('');
  const [loadedPayload, setLoadedPayload] = useState<RawImportPayload | null>(null);
  const [validationReport, setValidationReport] = useState<ImportValidationReport | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Handle file select (.json or .xlsx)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError(null);
    setIsProcessing(true);

    const isJson = file.name.toLowerCase().endsWith('.json');
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    const reader = new FileReader();

    if (isJson) {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const payload = parseImportJson(text);
          setLoadedPayload(payload);
          const report = validateImportPayload(payload, importMode);
          report.nomeArquivo = file.name;
          setValidationReport(report);
        } catch (err: any) {
          setImportError(`Erro ao processar arquivo JSON: ${err?.message || err}`);
          setLoadedPayload(null);
          setValidationReport(null);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const payload = parseImportXlsx(wb);
          setLoadedPayload(payload);
          const report = validateImportPayload(payload, importMode);
          report.nomeArquivo = file.name;
          setValidationReport(report);
        } catch (err: any) {
          setImportError(`Erro ao processar planilha Excel: ${err?.message || err}`);
          setLoadedPayload(null);
          setValidationReport(null);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Formato não suportado. Por favor, selecione um arquivo .json ou .xlsx.');
      setIsProcessing(false);
    }
  };

  // Handle pasted JSON parse
  const handleParsePastedJson = () => {
    if (!pastedJsonText.trim()) {
      setImportError('Por favor, cole o conteúdo JSON antes de validar.');
      return;
    }
    setImportError(null);
    setIsProcessing(true);
    try {
      const payload = parseImportJson(pastedJsonText);
      setLoadedPayload(payload);
      setFileName('JSON Colado via Interface');
      const report = validateImportPayload(payload, importMode);
      report.nomeArquivo = 'JSON Colado via Interface';
      setValidationReport(report);
    } catch (err: any) {
      setImportError(`JSON Inválido: ${err?.message || err}`);
      setLoadedPayload(null);
      setValidationReport(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run validation if user switches mode
  const handleModeChange = (newMode: 'substituir' | 'mesclar') => {
    setImportMode(newMode);
    if (loadedPayload) {
      const report = validateImportPayload(loadedPayload, newMode);
      report.nomeArquivo = fileName;
      setValidationReport(report);
    }
  };

  // Cancel import preview
  const handleCancel = () => {
    setLoadedPayload(null);
    setValidationReport(null);
    setFileName('');
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm import with all-or-nothing transaction
  const handleConfirmImport = () => {
    if (!loadedPayload || !validationReport) return;
    if (!validationReport.canCommit) {
      alert('A importação não pode ser concluída pois existem erros bloqueantes de integridade.');
      return;
    }

    setIsProcessing(true);
    try {
      const confData = commitImportPayload(loadedPayload, importMode, currentUser.nome, fileName || 'Arquivo');
      setLastConferenceData(confData);
      showToast('Dados importados com sucesso! Painel de conferência atualizado.');
      handleCancel();
    } catch (err: any) {
      alert(`Falha na transação de importação: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore Official Reference Backup
  const handleRestoreOfficial = async () => {
    if (
      confirm(
        'Deseja restaurar a Base Oficial de Referência (32 mecânicos ativos, frotas e regras oficiais)? Esta ação substituirá os dados atuais pela última base oficial verificada.'
      )
    ) {
      setIsProcessing(true);
      try {
        const ok = await restoreOfficialBackup(currentUser.nome);
        if (ok) {
          const freshDb = commitImportPayload; // DB already reloaded
          // Generate conference
          const conf = generateConferenceData(db, undefined, 'substituir', 'Último Arquivo Oficial Restaurado');
          setLastConferenceData(conf);
          showToast('Base oficial restaurada com sucesso!');
        } else {
          alert('Não foi possível restaurar a base oficial.');
        }
      } catch (err: any) {
        alert(`Erro na restauração: ${err?.message || err}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* View Title */}
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Importar &amp; Exportar Dados do Roster</span>
          <span className="text-xs bg-sky-100 text-sky-950 font-bold px-2 py-0.5 rounded border border-sky-200">
            JSON Único ou XLSX Multi-Abas
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Carregamento oficial dos dados relacionais (mecânicos, treinamentos, licenças e designações) com validação tudo-ou-nada e recálculo automático de regras.
        </p>
      </div>

      {/* Conference Panel (shown if there was a recent import or user requested conference) */}
      {lastConferenceData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Resultado da Última Importação / Conferência Oficial</span>
            </span>
            <button
              onClick={() => setLastConferenceData(null)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer font-medium"
            >
              Ocultar painel
            </button>
          </div>
          <PainelConferencia data={lastConferenceData} />
        </div>
      )}

      {/* Official Embedded Seed Load Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-900 text-white flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5 text-sky-200" />
          </div>
          <div>
            <h3 className="font-bold text-sky-950 text-sm">
              Carga Inicial / Restaurar Base Oficial (32 Mecânicos + 14 Administrativos)
            </h3>
            <p className="text-xs text-sky-800">
              Restaura instantaneamente os dados oficiais extraídos da organização com Claudio Jair (MEC-005) &amp; Franco (MEC-011) vencidos, REC com 7 mecânicos e 32 técnicos designados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadEmbeddedOfficial}
            disabled={isLoadingEmbedded || isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingEmbedded ? 'animate-spin' : ''}`} />
            <span>{isLoadingEmbedded ? 'Carregando...' : 'Carregar Dados Oficiais Embutidos'}</span>
          </button>

          <button
            onClick={handleRestoreOfficial}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restaurar Último Backup Salvo</span>
          </button>
        </div>
      </div>

      {/* Main Import Interface Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-700" />
              <span>Importar Arquivo Oficial</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecione o arquivo no seu computador (.json ou .xlsx) ou cole o JSON diretamente.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs">
            <span className="font-semibold text-slate-700 pl-1">Modo:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="substituir"
                checked={importMode === 'substituir'}
                onChange={() => handleModeChange('substituir')}
                className="text-sky-900 focus:ring-sky-900"
              />
              <span className="font-semibold text-slate-800">Substituir tudo</span>
              <span className="text-[10px] text-slate-400">(Padrão / Transação Limpa)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="mesclar"
                checked={importMode === 'mesclar'}
                onChange={() => handleModeChange('mesclar')}
                className="text-sky-900 focus:ring-sky-900"
              />
              <span className="font-semibold text-slate-800">Mesclar</span>
              <span className="text-[10px] text-slate-400">(Atualiza por PK)</span>
            </label>
          </div>
        </div>

        {/* Tab Selector: Upload File vs Paste JSON */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setActiveImportTab('upload');
              setImportError(null);
            }}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeImportTab === 'upload'
                ? 'border-sky-900 text-sky-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Selecionar Arquivo (.json ou .xlsx)</span>
          </button>
          <button
            onClick={() => {
              setActiveImportTab('paste');
              setImportError(null);
            }}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeImportTab === 'paste'
                ? 'border-sky-900 text-sky-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Colar JSON</span>
          </button>
        </div>

        {/* Tab 1: Upload File */}
        {activeImportTab === 'upload' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json, .xlsx, .xls"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-sky-600 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 group"
            >
              <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                {fileName || 'Clique para escolher o arquivo (.json ou .xlsx)'}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Suporta o arquivo oficial único <strong>roster_dados_oficiais.json</strong> ou a planilha Excel com as 12 abas normalizadas.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>.json</span>
                <span>•</span>
                <span>.xlsx</span>
                <span>•</span>
                <span>Leitura no navegador via FileReader &amp; SheetJS</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Paste JSON */}
        {activeImportTab === 'paste' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Cole abaixo o conteúdo do arquivo <code className="font-mono text-sky-900">roster_dados_oficiais.json</code>:
              </label>
              <button
                type="button"
                onClick={() => {
                  setPastedJsonText(exportBackupJson());
                  showToast('Exemplo preenchido no campo de texto!');
                }}
                className="text-[11px] text-sky-800 hover:underline cursor-pointer"
              >
                Preencher com modelo estruturado atual
              </button>
            </div>

            <textarea
              rows={8}
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              placeholder='{\n  "meta": { "sistema": "Roster de Treinamentos - Impacto Aviation", ... },\n  "base": [ ... ],\n  "pessoa": [ ... ],\n  "licenca": [ ... ],\n  "treinamento": [ ... ]\n}'
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:border-sky-800 focus:bg-white transition-colors"
            />

            <div className="flex justify-end">
              <button
                onClick={handleParsePastedJson}
                disabled={isProcessing || !pastedJsonText.trim()}
                className="px-4 py-2 bg-sky-900 text-white rounded-md text-xs font-semibold hover:bg-sky-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? 'Validando...' : 'Processar e Pré-Visualizar JSON'}
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {importError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-950 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Erro ao interpretar arquivo:</span>
              <div>{importError}</div>
            </div>
          </div>
        )}

        {/* Pre-Visualization Section Before Committing */}
        {validationReport && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-sky-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Pré-visualização Antes de Gravar ({validationReport.nomeArquivo})
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">
                  Total de registros detectados: <strong className="text-slate-900">{validationReport.totalRegistrosNoArquivo}</strong>
                </span>
                {validationReport.totalErros > 0 && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-950 font-bold rounded border border-rose-200">
                    {validationReport.totalErros} erros bloqueantes
                  </span>
                )}
                {validationReport.totalAvisos > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-950 font-semibold rounded border border-amber-200">
                    {validationReport.totalAvisos} avisos
                  </span>
                )}
              </div>
            </div>

            {/* Validation issues display */}
            {validationReport.issues.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Ocorrências e Inconsistências Detectadas:
                </div>
                {validationReport.issues.map((iss, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 py-1 border-b border-slate-200 last:border-0 ${
                      iss.severidade === 'erro' ? 'text-rose-900 font-semibold' : 'text-amber-900'
                    }`}
                  >
                    {iss.severidade === 'erro' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span>
                      [Linha {iss.linha ?? '?'}] <strong>{iss.entidade}</strong>
                      {iss.id ? ` (ID: ${iss.id})` : ''}
                      {iss.campo ? ` [${iss.campo}]` : ''}: {iss.motivo}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Entity Stats Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Entidade Relacional</th>
                    <th className="py-2.5 px-3 text-center">Registros no Arquivo</th>
                    <th className="py-2.5 px-3 text-center">Novos</th>
                    <th className="py-2.5 px-3 text-center">Alterados</th>
                    <th className="py-2.5 px-3 text-center">Rejeitados</th>
                    <th className="py-2.5 px-3 text-center">Conferência (Meta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.values(validationReport.stats).map((st: any) => (
                    <tr key={st.entidade} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {st.nomeExibicao}
                        <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                          ({st.entidade})
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                        {st.noArquivo}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-800 font-semibold">
                        {st.novos}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-sky-800 font-semibold">
                        {st.alterados}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-rose-800 font-semibold">
                        {st.rejeitados}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {st.esperado !== undefined ? (
                          st.esperado === st.noArquivo ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                              Esperado ({st.esperado}) ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                              Difere do Meta ({st.esperado})
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">Sem meta</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Buttons: Confirm or Cancel */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                {!validationReport.canCommit && (
                  <span className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    <span>Corrija os erros para habilitar a gravação.</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={!validationReport.canCommit || isProcessing}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Gravando dados...' : 'Confirmar Importação (Transação Tudo-ou-Nada)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Download className="w-4 h-4 text-sky-700" />
          <span>Exportações Oficiais do Banco de Dados</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Gere arquivos com a estrutura completa e normalizada das 12 entidades relacionais para auditoria, backup externo ou compartilhamento.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => {
              exportDatabaseToExcel();
              showToast('Planilha Excel multi-abas oficial baixada com sucesso!');
            }}
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">
                  Planilha Excel Oficial (.xlsx)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  12 abas normalizadas (base, pessoa, licenca, curso_catalogo, etc.)
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
          </button>

          <button
            onClick={() => {
              const jsonStr = exportBackupJson();
              const blob = new Blob([jsonStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `roster_dados_oficiais_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showToast('Backup JSON oficial baixado com sucesso!');
            }}
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 group-hover:text-sky-950">
                  Arquivo JSON Único (.json)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Formato canônico com metadados, contagens e integridade
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
