import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Bot,
  RefreshCw,
  Printer
} from 'lucide-react';
import { RelatorioVerificacaoLoteIA, DiagnosticoAlinhamentoManualIA } from '../services/manualsCrossCheckService';
import { DocumentoControlado } from '../types';

interface BatchIAReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RelatorioVerificacaoLoteIA | null;
  onSelectDocForDetail: (doc: DocumentoControlado) => void;
  documentos: DocumentoControlado[];
}

export const BatchIAReportModal: React.FC<BatchIAReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onSelectDocForDetail,
  documentos,
}) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Relatório de Alinhamento: Banco de Manuais (IA) vs Acervo SGQ
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Auditoria em Lote
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Executado em {new Date(report.geradoEm).toLocaleString('pt-BR')} • {report.totalVerificados} publicações ativas analisadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo em KPIs */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/40 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Total Verificados:</span>
            <span className="text-lg font-bold text-white font-mono">{report.totalVerificados}</span>
            <span className="text-[10px] text-slate-500 block">Manuais ativos</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-emerald-300 block text-[11px]">Sincronizados (OK):</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{report.totalSincronizados}</span>
            <span className="text-[10px] text-emerald-500/80 block">Revisões iguais</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <span className="text-rose-300 block text-[11px]">Banco IA Desatualizado:</span>
            <span className="text-lg font-bold text-rose-400 font-mono">{report.totalBancoIADesatualizado}</span>
            <span className="text-[10px] text-rose-500/80 block">Requer atualização</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30">
            <span className="text-sky-300 block text-[11px]">Acervo Desatualizado:</span>
            <span className="text-lg font-bold text-sky-400 font-mono">{report.totalAcervoDesatualizado}</span>
            <span className="text-[10px] text-sky-500/80 block">IA mais recente</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <span className="text-amber-300 block text-[11px]">Sem Correspondência:</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{report.totalSemCorrespondencia}</span>
            <span className="text-[10px] text-amber-500/80 block">Vínculo pendente</span>
          </div>
        </div>

        {/* Tabela com lista completa de diagnósticos */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] uppercase border-b border-slate-800 font-mono">
                  <th className="py-2.5 px-3">Código & Título</th>
                  <th className="py-2.5 px-3">Ref. Oficial (Acervo)</th>
                  <th className="py-2.5 px-3">Banco IA (NCs)</th>
                  <th className="py-2.5 px-3">Diagnóstico</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {report.diagnosticos.map((d) => {
                  const docOriginal = documentos.find((doc) => doc.id === d.documentoId);
                  return (
                    <tr key={d.documentoId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white font-mono">{d.codigoDocumento}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={d.tituloDocumento}>
                          {d.tituloDocumento}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        <span className="text-sky-300 font-bold">{d.revisaoOficialReferencia || 'N/A'}</span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={d.origemReferenciaOficial}>
                          {d.origemReferenciaOficial}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {d.manualIA ? (
                          <div>
                            <span className="text-purple-300 font-bold">{d.revisaoNoBancoIA || 'Sem rev.'}</span>
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {d.manualIA.codigo}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Não encontrado</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.statusSincroniaIA === 'SINCRONIZADO'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : d.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : d.statusSincroniaIA === 'ACERVO_DESATUALIZADO'
                              ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                              : d.statusSincroniaIA === 'SEM_CORRESPONDENCIA'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {d.statusSincroniaIA === 'SINCRONIZADO' && '✓ Sincronizado'}
                          {d.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' && '⚠️ IA Desatualizado'}
                          {d.statusSincroniaIA === 'ACERVO_DESATUALIZADO' && 'ℹ️ Acervo Desatualizado'}
                          {d.statusSincroniaIA === 'SEM_CORRESPONDENCIA' && '⚪ Sem Vínculo'}
                          {d.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA' && '❓ Não Confirmada'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {docOriginal && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDocForDetail(docOriginal);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Detalhar</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            A conformidade do Banco de Manuais assegura integridade jurídica nas análises de Não Conformidades (NCs).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs cursor-pointer"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
