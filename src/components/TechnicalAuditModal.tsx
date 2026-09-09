import React, { useState, useMemo } from 'react';
import { NCRecord, ManualRecord, ConhecimentoValidadoItem, ComparacaoRNCRecord, RelatorioAuditoriaTecnica, CategoriaAuditoriaTecnica } from '../types';
import { executarAuditoriaTecnica } from '../utils/technicalAuditEvaluator';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  RefreshCw, 
  Download, 
  FileText, 
  Lock, 
  Database, 
  Cpu, 
  History,
  Scale
} from 'lucide-react';

interface TechnicalAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: NCRecord[];
  manuals: ManualRecord[];
  knowledge: ConhecimentoValidadoItem[];
  comparacoes: ComparacaoRNCRecord[];
  userEmail?: string;
}

export const TechnicalAuditModal: React.FC<TechnicalAuditModalProps> = ({
  isOpen,
  onClose,
  records,
  manuals,
  knowledge,
  comparacoes,
  userEmail = 'auditor@qualigest.aero',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoriaAuditoriaTecnica | 'TODAS'>('TODAS');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditTimestamp, setAuditTimestamp] = useState<Date>(new Date());

  const auditReport: RelatorioAuditoriaTecnica = useMemo(() => {
    return executarAuditoriaTecnica(records, manuals, knowledge, comparacoes, userEmail);
  }, [records, manuals, knowledge, comparacoes, userEmail, auditTimestamp]);

  if (!isOpen) return null;

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setAuditTimestamp(new Date());
      setIsAuditing(false);
    }, 600);
  };

  const handleExportReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `auditoria_tecnica_qualigest_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredChecks = auditReport.checks.filter((check) => {
    if (selectedCategory !== 'TODAS' && check.categoria !== selectedCategory) return false;
    return true;
  });

  const getCategoryIcon = (cat: CategoriaAuditoriaTecnica) => {
    switch (cat) {
      case 'SEGURANCA':
        return <Lock className="w-4 h-4 text-emerald-600" />;
      case 'INTEGRIDADE_DADOS':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'GOVERNANCA':
        return <Scale className="w-4 h-4 text-purple-600" />;
      case 'IA_FALLBACK':
        return <Cpu className="w-4 h-4 text-indigo-600" />;
      case 'AUDIT_TRAIL':
        return <History className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-[12px] shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Modo de Auditoria Técnica do QualiGest</h2>
              <p className="text-[11px] text-slate-400">
                Auditoria estrutural de Segurança, RBAC, Integridade de Dados, IA & Trilha de Auditoria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3 rounded-[8px] border border-slate-200 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Conformidade Técnica
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {auditReport.scoreConformidade}%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  auditReport.statusGeral === 'CONFORME'
                    ? 'bg-emerald-100 text-emerald-800'
                    : auditReport.statusGeral === 'REQUER_ATENCAO'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {auditReport.statusGeral}
              </span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-[8px] border border-slate-200 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Testes Aprovados (OK)
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-emerald-600 font-bold text-xl">
              <CheckCircle2 className="w-5 h-5" />
              <span>{auditReport.totalOk} checks</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-[8px] border border-slate-200 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Requer Atenção
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-amber-600 font-bold text-xl">
              <AlertTriangle className="w-5 h-5" />
              <span>{auditReport.totalAtencao} checks</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-[8px] border border-slate-200 shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
              Itens Críticos
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-rose-600 font-bold text-xl">
              <XCircle className="w-5 h-5" />
              <span>{auditReport.totalCritico} checks</span>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['TODAS', 'SEGURANCA', 'INTEGRIDADE_DADOS', 'GOVERNANCA', 'IA_FALLBACK', 'AUDIT_TRAIL'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'TODAS'
                    ? 'Todos os Checks'
                    : cat === 'SEGURANCA'
                    ? 'Segurança'
                    : cat === 'INTEGRIDADE_DADOS'
                    ? 'Integridade'
                    : cat === 'GOVERNANCA'
                    ? 'Governança'
                    : cat === 'IA_FALLBACK'
                    ? 'IA & Fallback'
                    : 'Audit Trail'}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-3 py-1.5 text-xs font-semibold rounded-[6px] bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>Reexecutar Auditoria</span>
            </button>

            <button
              onClick={handleExportReport}
              className="px-3 py-1.5 text-xs font-semibold rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {/* Audit Checks Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
          {filteredChecks.map((check) => {
            const isOk = check.status === 'OK';
            const isAtencao = check.status === 'ATENCAO';

            return (
              <div
                key={check.id}
                className={`p-4 rounded-[10px] border transition-all ${
                  isOk
                    ? 'bg-emerald-50/20 border-emerald-200'
                    : isAtencao
                    ? 'bg-amber-50/20 border-amber-200'
                    : 'bg-rose-50/20 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded-[4px] bg-white border border-slate-200">
                        {getCategoryIcon(check.categoria)}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{check.nome}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isOk
                            ? 'bg-emerald-600 text-white'
                            : isAtencao
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{check.detalhe}</p>

                    {/* Evidence Points */}
                    <div className="pt-2 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Evidências Auditadas:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5 pl-1">
                        {check.evidencias.map((ev, idx) => (
                          <li key={idx} className="font-mono text-[11px] text-slate-600">
                            {ev}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {check.recomendacao && (
                      <div className="mt-2 p-2 rounded-[6px] bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span><strong>Recomendação:</strong> {check.recomendacao}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Auditor Responsável: <strong>{userEmail}</strong></span>
          <span>Executado em: {new Date(auditReport.executadoEm).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};
