import React, { useState, useMemo } from 'react';
import {
  Layers,
  ShieldCheck,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Check,
  Info,
  Sliders,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  ControleCentralSGQ,
  RequisitoClienteItem,
  TipoOrigemRequisito
} from '../../types';

interface RequirementsCentralControlsMatrixTabProps {
  controles: ControleCentralSGQ[];
  requisitos: RequisitoClienteItem[];
  onSelectRequirement?: (reqId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const RequirementsCentralControlsMatrixTab: React.FC<RequirementsCentralControlsMatrixTabProps> = ({
  controles,
  requisitos,
  onSelectRequirement,
  onNavigateToTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedControlId, setSelectedControlId] = useState<string | 'TODOS'>('TODOS');
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);

  // Requisitos sem controle (lacunas)
  const requisitosSemControle = useMemo(() => {
    return requisitos.filter((r) => !r.controleCentralId && !r.controleCentralCodigo);
  }, [requisitos]);

  // Controles enriquecidos com requisitos vinculados
  const controlesComRequisitos = useMemo(() => {
    return controles.map((ctrl) => {
      const vinculados = requisitos.filter(
        (r) => r.controleCentralId === ctrl.id || r.controleCentralCodigo === ctrl.codigo
      );

      const clientesUnicos = Array.from(
        new Set(vinculados.map((r) => r.clienteNome).filter(Boolean) as string[])
      );
      const fontesUnicas = Array.from(
        new Set(vinculados.map((r) => r.fonteOrigem).filter(Boolean) as string[])
      );

      return {
        ...ctrl,
        vinculados,
        clientesUnicos,
        fontesUnicas,
      };
    });
  }, [controles, requisitos]);

  // Filtragem
  const controlesFiltrados = useMemo(() => {
    return controlesComRequisitos.filter((ctrl) => {
      if (selectedControlId !== 'TODOS' && ctrl.id !== selectedControlId) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = ctrl.codigo.toLowerCase().includes(term);
        const matchName = ctrl.nome.toLowerCase().includes(term);
        const matchReq = ctrl.vinculados.some(
          (r) =>
            r.numeroItem.toLowerCase().includes(term) ||
            r.tituloCurto.toLowerCase().includes(term) ||
            (r.clienteNome || '').toLowerCase().includes(term)
        );
        if (!matchCode && !matchName && !matchReq) return false;
      }
      return true;
    });
  }, [controlesComRequisitos, selectedControlId, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in text-xs">
      {/* 1. Header & Concept Explainer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Matriz Institucional: "Um Controle Central SGQ, Múltiplos Requisitos"
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            Demonstra como um único procedimento interno da IMPACTO (ex: Calibração de Ferramental, Fatores Humanos ou
            Acesso a Publicações) satisfaz simultaneamente exigências do RBAC 145, EASA Part-145, padrões IOSA e checklists
            de múltiplos operadores aéreos (Kalitta, Atlas, Avion, Placar).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowOnlyGaps(!showOnlyGaps)}
            className={`px-3 py-2 rounded-lg font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showOnlyGaps
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Ver Lacunas Sem Controle ({requisitosSemControle.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Gaps View if Toggled */}
      {showOnlyGaps && (
        <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-rose-900 dark:text-rose-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Requisitos sem Controle Central Associado ({requisitosSemControle.length})
            </h3>
            <button
              onClick={() => setShowOnlyGaps(false)}
              className="text-xs text-rose-700 hover:underline cursor-pointer"
            >
              Fechar Visualização de Lacunas
            </button>
          </div>
          <p className="text-rose-800 dark:text-rose-300">
            Estes requisitos foram cadastrados sem vínculo a um Controle Central SGQ da IMPACTO. Vincular cada requisito a
            um controle permite demonstrar sua evidência em lote para todos os auditores.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {requisitosSemControle.map((req, idx) => (
              <div
                key={`${req.id}-${idx}`}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-rose-200 dark:border-rose-800/60 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{req.numeroItem}</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                      {req.fonteOrigem || 'GERAL'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{req.tituloCurto}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{req.textoOriginal}</p>
                </div>
                {onSelectRequirement && (
                  <button
                    onClick={() => onSelectRequirement(req.id)}
                    className="w-full mt-2 py-1.5 text-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-medium rounded cursor-pointer"
                  >
                    Associar Controle Central
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar controle ou requisito vinculado..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <select
            value={selectedControlId}
            onChange={(e) => setSelectedControlId(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            <option value="TODOS">Todos os Controles ({controles.length})</option>
            {controles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Exibindo <strong>{controlesFiltrados.length}</strong> controles centrais
        </div>
      </div>

      {/* 4. Controls Matrix Cards */}
      <div className="space-y-4">
        {controlesFiltrados.map((ctrl) => (
          <div
            key={ctrl.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
          >
            {/* Control Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    {ctrl.codigo}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {ctrl.moduloOrigem}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Responsável: <strong>{ctrl.responsavelPadrao}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{ctrl.nome}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">{ctrl.descricao}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 block">
                  {ctrl.vinculados.length}
                </span>
                <span className="text-[10px] text-slate-400 block">requisitos atendidos</span>
              </div>
            </div>

            {/* Clientes & Fontes Atendidas por este controle */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-400 font-medium">Clientes atendidos:</span>
              {ctrl.clientesUnicos.length > 0 ? (
                ctrl.clientesUnicos.map((c) => (
                  <span
                    key={c}
                    className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900 text-[10px] font-semibold"
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic">Sem clientes específicos</span>
              )}

              <span className="text-slate-400 font-medium ml-2">Fontes:</span>
              {ctrl.fontesUnicas.map((f) => (
                <span
                  key={f}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px]"
                >
                  {f}
                </span>
              ))}
            </div>

            {/* Evidências Documentais Típicas deste Controle */}
            {ctrl.evidenciasTipicas && ctrl.evidenciasTipicas.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
                <strong className="text-slate-700 dark:text-slate-300 mr-2">Evidências Típicas Homologadas:</strong>
                <span className="text-slate-600 dark:text-slate-400">{ctrl.evidenciasTipicas.join(' • ')}</span>
              </div>
            )}

            {/* Requisitos Concretos Vinculados a este Controle */}
            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                Requisitos Multi-Fontes que convergem para este Controle ({ctrl.vinculados.length}):
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {ctrl.vinculados.map((req, idx) => (
                  <div
                    key={`${req.id}-${idx}`}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{req.numeroItem}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          ({req.fonteDocumentoNome || req.fonteOrigem})
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 truncate">{req.tituloCurto}</p>
                    </div>

                    {onSelectRequirement && (
                      <button
                        onClick={() => onSelectRequirement(req.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                        title="Ver detalhes do requisito"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
