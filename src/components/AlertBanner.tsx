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
          ? 'bg-rose-50/90 border-rose-200 text-rose-950'
          : 'bg-amber-50/90 border-amber-200 text-amber-950'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-[6px] shrink-0 ${
              isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isCritical ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-semibold">
              <span>Alerta de Prazos e Cumprimento Normativo:</span>
              {vencidas.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-rose-600 text-white">
                  {vencidas.length} Vencida(s)
                </span>
              )}
              {vencendoHoje.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-amber-600 text-white">
                  {vencendoHoje.length} Vence Hoje
                </span>
              )}
              {proximos7Dias.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                  {proximos7Dias.length} Próximos 7 dias
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isCritical
                ? 'Existem Não Conformidades com prazo vencido. Ações corretivas e validação de contenção são requeridas com urgência.'
                : 'Acompanhe os prazos de resposta e ações de contenção para evitar desvios em auditorias.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={onOpenAlertsTab}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-[6px] transition-colors shadow-xs"
          >
            <span>Gerenciar Prazos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-[6px] hover:bg-black/5 transition-colors"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
