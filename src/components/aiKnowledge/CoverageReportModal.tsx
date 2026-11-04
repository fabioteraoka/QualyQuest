import React from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Layers, 
  Database, 
  Check, 
  Clock, 
  Info,
  Table,
  Hash
} from 'lucide-react';
import { RelatorioCoberturaDocumental } from '../../types/aiKnowledgeBase';

interface CoverageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RelatorioCoberturaDocumental | null;
  manualTitle?: string;
}

export const CoverageReportModal: React.FC<CoverageReportModalProps> = ({
  isOpen,
  onClose,
  report,
  manualTitle,
}) => {
  if (!isOpen || !report) return null;

  const isAprovado = report.statusFinal === 'APROVADO';
  const isRevisao = report.statusFinal === 'REQUER_REVISAO';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-5 text-white flex items-center justify-between border-b ${
          isAprovado 
            ? 'bg-emerald-950 border-emerald-900' 
            : isRevisao 
            ? 'bg-amber-950 border-amber-900' 
            : 'bg-rose-950 border-rose-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isAprovado 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' 
                : isRevisao 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30' 
                : 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
            }`}>
              {isAprovado ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Relatório de Cobertura Documental</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                  isAprovado 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                    : isRevisao 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                }`}>
                  {report.statusFinal}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {manualTitle || report.documentoId} • Auditoria de integridade e completude para IA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 bg-slate-50 flex-1">
          {/* Top Metrics Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 block">Cobertura Total</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{report.percentualCobertura}%</span>
                <span className="text-[10px] text-slate-400">extraído</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 block">Páginas Extraídas</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-600">{report.paginasExtraidas}</span>
                <span className="text-[10px] text-slate-400">/ {report.paginasTotais} págs</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 block">Subitens / Requisitos</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{report.subitensIdentificados}</span>
                <span className="text-[10px] text-slate-400">em {report.capitulosIdentificados} caps</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 block">Fragmentos Indexados</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-600">{report.fragmentosIndexados}</span>
                <span className="text-[10px] text-slate-400">/ {report.fragmentosCriados} criados</span>
              </div>
            </div>
          </div>

          {/* Detailed Pipeline Checklist Stages */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Checklist de Validação das 5 Barreiras Críticas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center space-y-1 ${
                report.uploadConcluido ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Check className={`w-4 h-4 ${report.uploadConcluido ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold">1. Upload Concluído</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center space-y-1 ${
                report.extracaoConcluida ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Check className={`w-4 h-4 ${report.extracaoConcluida ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold">2. Extração Integral</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center space-y-1 ${
                report.estruturaIdentificada ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Check className={`w-4 h-4 ${report.estruturaIdentificada ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold">3. Estrutura Mapeada</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center space-y-1 ${
                report.indexacaoConcluida ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Check className={`w-4 h-4 ${report.indexacaoConcluida ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-[11px] font-bold">4. Indexação Concluída</span>
              </div>

              <div className={`p-2.5 rounded-xl border flex flex-col items-center text-center space-y-1 ${
                report.validacaoAprovada ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' : 'bg-amber-50/50 border-amber-200 text-amber-800'
              }`}>
                <Check className={`w-4 h-4 ${report.validacaoAprovada ? 'text-emerald-600' : 'text-amber-500'}`} />
                <span className="text-[11px] font-bold">5. Validação Aprovada</span>
              </div>
            </div>
          </div>

          {/* Pages and Tables Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                Auditoria de Páginas e Folhas
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Páginas Totais Informadas:</span>
                  <span className="font-bold text-slate-800">{report.paginasTotais}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Páginas com Texto Extraído:</span>
                  <span className="font-bold text-emerald-700">{report.paginasExtraidas}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Páginas sem Conteúdo (Em Branco):</span>
                  <span className="font-bold text-slate-600">{report.paginasSemConteudo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Páginas com Falha de Leitura:</span>
                  <span className={`font-bold ${report.paginasComFalha > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {report.paginasComFalha}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-slate-600" />
                Estruturas e Tabelas Preservadas
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tabelas Identificadas:</span>
                  <span className="font-bold text-slate-800">{report.tabelasIdentificadas}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tabelas Convertidas em Markdown:</span>
                  <span className="font-bold text-emerald-700">{report.tabelasExtraidas}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Fragmentos com Falha:</span>
                  <span className={`font-bold ${report.fragmentosComFalha > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {report.fragmentosComFalha}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Versão do Extrator:</span>
                  <span className="font-mono text-slate-600">{report.versaoExtrator}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings and Limitations */}
          {report.avisos && report.avisos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <h5 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Avisos e Limitações Observadas ({report.avisos.length})
              </h5>
              <ul className="space-y-1 text-[11px] text-amber-800 list-disc list-inside">
                {report.avisos.map((aviso, idx) => (
                  <li key={idx}>{aviso}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Audit Timestamp */}
          <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-200 pt-3">
            <span>Processado e auditado em: {new Date(report.dataProcessamento).toLocaleString('pt-BR')}</span>
            <span>ID do Documento: <code className="font-mono text-slate-600">{report.documentoId}</code></span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
