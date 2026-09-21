import React, { useMemo, useState } from 'react';
import { AvaliacaoRisco, NCRecord, NivelRisco, CelulaMatrizRisco5x5, ItemRNCMatrizRisco } from '../types';
import { 
  SEVERIDADES, 
  PROBABILIDADES, 
  calcularNivelRisco, 
  obterCorRisco, 
  consolidarRNCsPorMatrizRisco,
  obterCorStatus
} from '../utils/qualityHelpers';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, X, ExternalLink, FileText } from 'lucide-react';
import { Badge } from '../design-system/components';
import { DS, getRiskBadgeStyle } from '../design-system/tokens';

interface RiskMatrixWidgetProps {
  value?: AvaliacaoRisco;
  onChange?: (val: AvaliacaoRisco) => void;
  interactive?: boolean;
  records?: NCRecord[];
  onSelectCell?: (code: string) => void;
  selectedCode?: string;
}

export const RiskMatrixWidget: React.FC<RiskMatrixWidgetProps> = ({
  value,
  onChange,
  interactive = false,
  records = [],
  onSelectCell,
  selectedCode,
}) => {
  const [modalCelulaAberta, setModalCelulaAberta] = useState<CelulaMatrizRisco5x5 | null>(null);

  // Consolidação Única e Oficial da Matriz 5x5
  const dadosConsolidados = useMemo(() => {
    return consolidarRNCsPorMatrizRisco(records);
  }, [records]);

  const currentCode = value?.codigo || selectedCode || '';

  const getCellColor = (sev: string, prob: string) => {
    const code = `${sev}${prob}`.toUpperCase();
    const level = calcularNivelRisco(sev, prob);
    const isCurrent = currentCode.toUpperCase() === code;

    let bgClass = '';
    if (level === 'Crítico') {
      bgClass = isCurrent
        ? 'bg-rose-700 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
    } else if (level === 'Alto') {
      bgClass = isCurrent
        ? 'bg-amber-600 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
    } else if (level === 'Médio') {
      bgClass = isCurrent
        ? 'bg-yellow-500 text-slate-950 font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-yellow-50 text-yellow-900 border-yellow-200 hover:bg-yellow-100';
    } else {
      bgClass = isCurrent
        ? 'bg-emerald-700 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    }

    return { bgClass, level, code, isCurrent };
  };

  const handleCellClick = (sev: string, prob: string) => {
    const code = `${sev}${prob}`.toUpperCase();
    const nivel = calcularNivelRisco(sev, prob);
    const celula = dadosConsolidados.matriz[code];

    if (interactive && onChange) {
      onChange({
        severidade: sev,
        probabilidade: prob,
        codigo: code,
        nivel: nivel,
      });
    }

    if (onSelectCell) {
      onSelectCell(code);
    }

    // Se houver registros na célula ou em modo Dashboard, permite abrir visualização de detalhes
    if (celula && celula.quantidade > 0) {
      setModalCelulaAberta(celula);
    }
  };

  return (
    <div className="bg-white rounded-[10px] border border-slate-200 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
      {/* Header com destaque executivo ao resultado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h4 className={DS.typography.sectionTitle}>
              Matriz de Avaliação de Risco 5x5
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              MOMQ / RBAC 145
            </span>
          </div>
          <p className={DS.typography.sectionSubtitle}>
            {interactive
              ? 'Selecione a interseção entre Severidade do Modo de Falha e Probabilidade de Ocorrência.'
              : 'Mapeamento consolidado das Não Conformidades por severidade e probabilidade.'}
          </p>
        </div>

        {/* Destaque do Resultado Calculado (em modo formulário) */}
        {value?.codigo && (
          <div className="p-2.5 rounded-[8px] bg-slate-900 text-white flex items-center gap-3 shrink-0">
            <div className="text-left">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                Nível de Risco
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                {value.nivel?.toUpperCase()} ({value.codigo})
              </span>
            </div>
            <div className="border-l border-slate-700 pl-3 text-right">
              <span className="text-[10px] text-slate-300 block">Sev: <strong>{value.severidade}</strong></span>
              <span className="text-[10px] text-slate-300 block">Prob: <strong>{value.probabilidade}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Resumo Executivo das RNCs por Nível de Risco (quando records fornecidos) */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/70 text-center">
            <span className="text-[11px] font-bold text-rose-800 uppercase block">Crítico</span>
            <span className="text-xl font-extrabold text-rose-900">{dadosConsolidados.totalCriticos}</span>
          </div>
          <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase block">Alto</span>
            <span className="text-xl font-extrabold text-amber-900">{dadosConsolidados.totalAltos}</span>
          </div>
          <div className="p-2.5 rounded-lg border border-yellow-200 bg-yellow-50/70 text-center">
            <span className="text-[11px] font-bold text-yellow-900 uppercase block">Médio</span>
            <span className="text-xl font-extrabold text-yellow-950">{dadosConsolidados.totalMedios}</span>
          </div>
          <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-center">
            <span className="text-[11px] font-bold text-emerald-800 uppercase block">Baixo</span>
            <span className="text-xl font-extrabold text-emerald-900">{dadosConsolidados.totalBaixos}</span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase block">Sem Avaliação</span>
            <span className="text-xl font-extrabold text-slate-700">{dadosConsolidados.totalSemAvaliacao}</span>
          </div>
        </div>
      )}

      {/* Grid da Matriz 5x5 */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[340px]">
          <thead>
            <tr>
              <th className="p-2.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 w-32 text-left">
                Severidade \ Prob.
              </th>
              {PROBABILIDADES.map((p) => (
                <th
                  key={p.valor}
                  className="p-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200"
                  title={p.desc}
                >
                  <span className="font-bold">{p.valor}</span>
                  <span className="hidden sm:block text-[10px] text-slate-500 font-normal truncate max-w-[80px]">
                    {p.label.split('-')[1] || p.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEVERIDADES.map((s) => (
              <tr key={s.valor}>
                <td
                  className="p-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 text-left"
                  title={s.desc}
                >
                  <span className="font-bold">{s.valor}</span>
                  <span className="text-[10px] text-slate-500 font-normal hidden sm:inline ml-1">
                    {s.label.split('-')[1] || s.label}
                  </span>
                </td>
                {PROBABILIDADES.map((p) => {
                  const { bgClass, code, level, isCurrent } = getCellColor(s.valor, p.valor);
                  const celula = dadosConsolidados.matriz[code];
                  const count = celula ? celula.quantidade : 0;
                  const isClickable = interactive || count > 0;

                  return (
                    <td
                      key={p.valor}
                      onClick={() => handleCellClick(s.valor, p.valor)}
                      className={`p-2 border border-slate-200 transition-colors ${bgClass} ${
                        isClickable ? 'cursor-pointer hover:opacity-90' : ''
                      }`}
                      title={`Posição ${code} (${level}): ${count} RNC(s) registradas. Clique para detalhar.`}
                    >
                      <div className="flex flex-col items-center justify-center min-h-[44px]">
                        <span className="text-xs font-bold">{code}</span>
                        {count > 0 ? (
                          <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold shadow-xs">
                            {count} RNC{count > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-1">0</span>
                        )}
                        {isCurrent && !count && (
                          <span className="text-[10px] font-bold opacity-90 mt-0.5">✓</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda de Risco Corporativa */}
      <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-700"></span> Crítico
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-600"></span> Alto
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-yellow-500"></span> Médio
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-700"></span> Baixo
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Total de RNCs avaliadas: <strong>{dadosConsolidados.totalRNCsAvaliadas}</strong> de <strong>{records.length}</strong>
        </span>
      </div>

      {/* Modal de Detalhamento das RNCs da Célula Clicada */}
      {modalCelulaAberta && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Topo do Modal */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white ${
                  modalCelulaAberta.nivel === 'Crítico' ? 'bg-rose-700' :
                  modalCelulaAberta.nivel === 'Alto' ? 'bg-amber-600' :
                  modalCelulaAberta.nivel === 'Médio' ? 'bg-yellow-600' : 'bg-emerald-700'
                }`}>
                  {modalCelulaAberta.codigo} • Risco {modalCelulaAberta.nivel}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    RNCs na Célula {modalCelulaAberta.codigo} (Sev {modalCelulaAberta.severidade} x Prob {modalCelulaAberta.probabilidade})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalCelulaAberta.quantidade} registro{modalCelulaAberta.quantidade > 1 ? 's' : ''} mapeado{modalCelulaAberta.quantidade > 1 ? 's' : ''} nesta classificação
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalCelulaAberta(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo: Lista das RNCs */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {modalCelulaAberta.rncs.map((rnc) => {
                const corStatus = obterCorStatus(rnc.status);
                return (
                  <div
                    key={rnc.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800">
                          {rnc.numero}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Setor: <strong>{rnc.setor || 'Geral'}</strong>
                        </span>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${corStatus.bg} ${corStatus.text}`}>
                        {rnc.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium line-clamp-2">
                      {rnc.titulo}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setModalCelulaAberta(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
