import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, X, Clock } from 'lucide-react';
import { AlertaItem } from '../types';

interface AlertBannerProps {
  alertas: AlertaItem[];
  onOpenAlertsTab: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alertas = [],
  onOpenAlertsTab,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const safeAlertas = alertas || [];
  const vencidas = safeAlertas.filter((a) => a.tipoAlerta === 'VENCIDA');
  const vencendoHoje = safeAlertas.filter((a) => a.tipoAlerta === 'VENCE_HOJE');
  const proximos7Dias = safeAlertas.filter((a) => a.tipoAlerta === 'VENCE_7_DIAS');

  const totalCriticos = vencidas.length + vencendoHoje.length + proximos7Dias.length;

  if (dismissed || totalCriticos === 0) return null;

  const isCritical = vencidas.length > 0;

  return (
    <div
      className={`border-b px-4 py-2.5 sm:px-6 transition-all ${
        isCritical
          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
          : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-[6px] shrink-0 ${
              isCritical
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isCritical ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-semibold">
              <span className="text-slate-900 dark:text-slate-100">Alerta de Prazos e Cumprimento Normativo:</span>
              {vencidas.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-rose-600 text-white shadow-xs">
                  {vencidas.length} Vencida(s)
                </span>
              )}
              {vencendoHoje.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-amber-600 text-white shadow-xs">
                  {vencendoHoje.length} Vence Hoje
                </span>
              )}
              {proximos7Dias.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {proximos7Dias.length} Próximos 7 dias
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isCritical
                ? 'Existem Não Conformidades com prazo vencido. Ações corretivas e validação de contenção são requeridas com urgência.'
                : 'Acompanhe os prazos de resposta e ações de contenção para evitar desvios em auditorias.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={onOpenAlertsTab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 hover:dark:bg-white text-white dark:text-slate-900 text-xs font-medium rounded-[6px] transition-colors shadow-xs cursor-pointer"
          >
            <span>Gerenciar Prazos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
