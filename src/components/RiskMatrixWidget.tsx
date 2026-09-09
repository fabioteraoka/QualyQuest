import React from 'react';
import { AvaliacaoRisco, NCRecord, NivelRisco } from '../types';
import { SEVERIDADES, PROBABILIDADES, calcularNivelRisco, obterCorRisco } from '../utils/qualityHelpers';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';
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
  const currentCode = value?.codigo || selectedCode || '';
  const currentLevel = value?.nivel || (currentCode ? calcularNivelRisco(currentCode[0] || '3', currentCode[1] || 'C') : '');

  const getCellColor = (sev: string, prob: string) => {
    const code = `${sev}${prob}`;
    const level = calcularNivelRisco(sev, prob);
    const isCurrent = currentCode.toUpperCase() === code.toUpperCase();

    let bgClass = '';
    if (level === 'Crítico') {
      bgClass = isCurrent
        ? 'bg-rose-700 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
    } else if (level === 'Alto') {
      bgClass = isCurrent
        ? 'bg-orange-600 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100';
    } else if (level === 'Médio') {
      bgClass = isCurrent
        ? 'bg-amber-500 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
    } else {
      bgClass = isCurrent
        ? 'bg-emerald-700 text-white font-bold ring-2 ring-slate-900 shadow-sm'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    }

    return { bgClass, level, code, isCurrent };
  };

  const handleCellClick = (sev: string, prob: string) => {
    const code = `${sev}${prob}`;
    const nivel = calcularNivelRisco(sev, prob);
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
  };

  // Count active records per cell
  const getCellRecordsCount = (sev: string, prob: string) => {
    const code = `${sev}${prob}`.toUpperCase();
    return records.filter((r) => r.avaliacaoRiscoInicial?.codigo?.toUpperCase() === code).length;
  };

  return (
    <div className="bg-white rounded-[10px] border border-slate-200 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
      {/* Header com destaque executivo ao resultado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h4 className={DS.typography.sectionTitle}>
            Matriz de Avaliação de Risco 5x5
          </h4>
          <p className={DS.typography.sectionSubtitle}>
            {interactive
              ? 'Selecione a interseção entre Severidade do Modo de Falha e Probabilidade de Ocorrência.'
              : 'Mapeamento consolidado das Não Conformidades por criticidade regulatória.'}
          </p>
        </div>

        {/* Destaque do Resultado Calculado */}
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

      {/* Grid da Matriz */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[320px]">
          <thead>
            <tr>
              <th className="p-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 w-28 text-left">
                Severidade \ Prob.
              </th>
              {PROBABILIDADES.map((p) => (
                <th
                  key={p.valor}
                  className="p-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200"
                  title={p.desc}
                >
                  <span className="font-bold">{p.valor}</span>
                  <span className="hidden sm:block text-[10px] text-slate-500 font-normal truncate max-w-[65px]">
                    {p.label.split('-')[1]}
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
                    {s.label.split('-')[1]}
                  </span>
                </td>
                {PROBABILIDADES.map((p) => {
                  const { bgClass, code, level, isCurrent } = getCellColor(s.valor, p.valor);
                  const count = getCellRecordsCount(s.valor, p.valor);

                  return (
                    <td
                      key={p.valor}
                      onClick={() => handleCellClick(s.valor, p.valor)}
                      className={`p-2 border border-slate-200 transition-colors ${bgClass} ${
                        interactive ? 'cursor-pointer' : ''
                      }`}
                      title={`Código ${code} - Risco ${level}: Severidade ${s.label} x Probabilidade ${p.label}`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-bold">{code}</span>
                        {count > 0 && (
                          <span className="mt-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-bold">
                            {count} NC{count > 1 ? 's' : ''}
                          </span>
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
            <span className="w-2.5 h-2.5 rounded-[2px] bg-orange-600"></span> Alto
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-500"></span> Médio
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-700"></span> Baixo
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Padrão MOMQ / RBAC 145</span>
      </div>
    </div>
  );
};
