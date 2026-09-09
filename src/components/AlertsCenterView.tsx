import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  RefreshCw, 
  CalendarPlus, 
  FileText,
  User
} from 'lucide-react';
import { NCRecord, AlertaItem } from '../types';
import { formatarData, calcularDiasRestantes, obterCorRisco, obterCorStatus } from '../utils/qualityHelpers';

interface AlertsCenterViewProps {
  records: NCRecord[];
  alertas: AlertaItem[];
  onSelectNC: (nc: NCRecord) => void;
  onUpdateDeadline: (ncId: string, novaData: string, motivo: string) => void;
  onAuditNC?: (nc: NCRecord) => void;
}

export const AlertsCenterView: React.FC<AlertsCenterViewProps> = ({
  records = [],
  alertas = [],
  onSelectNC,
  onUpdateDeadline,
  onAuditNC,
}) => {
  const safeRecords = records || [];
  const safeAlertas = alertas || [];
  const [selectedAlertForExtension, setSelectedAlertForExtension] = useState<AlertaItem | null>(null);
  const [novaData, setNovaData] = useState('');
  const [motivoProrrogacao, setMotivoProrrogacao] = useState('');
  const [notifiedMessage, setNotifiedMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'todos' | 'critico' | 'atencao' | 'acompanhamento'>('todos');

  // Categorização rigorosa SGQ
  const criticos = safeAlertas.filter(
    (a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE' || a.nivelRisco === 'Crítico' || a.nivelRisco === 'Alto'
  );
  const atencao = safeAlertas.filter(
    (a) => (a.tipoAlerta === 'VENCE_7_DIAS' || a.nivelRisco === 'Médio') && !criticos.some(c => c.id === a.id)
  );
  const acompanhamento = safeAlertas.filter(
    (a) => (a.tipoAlerta === 'VENCE_15_DIAS' || a.tipoAlerta === 'AGUARDANDO_EFICACIA' || a.nivelRisco === 'Baixo') &&
           !criticos.some(c => c.id === a.id) &&
           !atencao.some(t => t.id === a.id)
  );

  const handleOpenExtensionModal = (alerta: AlertaItem) => {
    setSelectedAlertForExtension(alerta);
    setNovaData('');
    setMotivoProrrogacao('');
  };

  const handleConfirmExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForExtension || !novaData || !motivoProrrogacao.trim()) return;

    onUpdateDeadline(selectedAlertForExtension.ncId, novaData, motivoProrrogacao);
    setSelectedAlertForExtension(null);
    setNotifiedMessage(`Prazo da NC #${selectedAlertForExtension.numeroNC} prorrogado com sucesso para ${formatarData(novaData)}.`);
    setTimeout(() => setNotifiedMessage(null), 4000);
  };

  const handleSimulateNotification = (alerta: AlertaItem) => {
    setNotifiedMessage(`Notificação formal emitida para o responsável (${alerta.responsavel}) e auditor (${alerta.auditor}).`);
    setTimeout(() => setNotifiedMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-[12px] border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Central de Notificações & Prazos Normativos</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Gestão de Alertas e Prazos Regulatórios
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Classificação automatizada por gravidade: Crítico, Atenção e Acompanhamento
          </p>
        </div>

        {/* Categories Tab Pill (Horizontal scroll on mobile) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-[8px] border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full shrink-0">
          <button
            onClick={() => setActiveTab('todos')}
            className={`px-2.5 py-1.5 rounded-[6px] transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'todos' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({safeAlertas.length})
          </button>
          <button
            onClick={() => setActiveTab('critico')}
            className={`px-2.5 py-1.5 rounded-[6px] transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeTab === 'critico' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span>Crítico</span>
            <span className="text-[10px] bg-rose-800 text-white px-1.5 py-0.2 rounded-full">{criticos.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('atencao')}
            className={`px-2.5 py-1.5 rounded-[6px] transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeTab === 'atencao' ? 'bg-amber-500 text-white shadow-xs font-bold' : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span>Atenção</span>
            <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.2 rounded-full">{atencao.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('acompanhamento')}
            className={`px-2.5 py-1.5 rounded-[6px] transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeTab === 'acompanhamento' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span>Acompanhamento</span>
            <span className="text-[10px] bg-blue-800 text-white px-1.5 py-0.2 rounded-full">{acompanhamento.length}</span>
          </button>
        </div>
      </div>

      {notifiedMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-[8px] text-xs text-emerald-800 flex items-center space-x-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{notifiedMessage}</span>
        </div>
      )}

      {/* Categories Content */}
      <div className="space-y-6">
        {/* 1. CRÍTICO */}
        {(activeTab === 'todos' || activeTab === 'critico') && criticos.length > 0 && (
          <div className="bg-rose-50/40 border border-rose-200 rounded-[12px] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/80">
              <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>Nível Crítico • Prazos Vencidos ou Risco Elevado ({criticos.length})</span>
              </div>
              <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-[4px]">
                Ação Imediata
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {criticos.map((alerta) => {
                const nc = records.find(r => r.id === alerta.ncId);
                return (
                  <div key={alerta.id} className="bg-white p-4 rounded-[8px] border border-rose-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900">#{alerta.numeroNC}</span>
                          <span className="text-xs font-bold text-slate-800">{alerta.titulo}</span>
                        </div>
                        <span className="text-[11px] font-bold text-rose-600 block mt-0.5">
                          {alerta.tipoAlerta === 'VENCIDA' 
                            ? `Atrasado há ${Math.abs(alerta.diasRestantes)} dia(s) (Venceu em ${formatarData(alerta.prazo)})`
                            : `Vence HOJE (${formatarData(alerta.prazo)}) - Risco ${alerta.nivelRisco}`}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold ${obterCorRisco(alerta.nivelRisco).badgeBg}`}>
                        {alerta.nivelRisco}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-[6px] border border-slate-100 flex items-center justify-between">
                      <span>Responsável: <strong>{alerta.responsavel}</strong></span>
                      <span>Auditor: <strong>{alerta.auditor}</strong></span>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleSimulateNotification(alerta)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        title="Enviar lembrete formal"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Notificar</span>
                      </button>

                      <button
                        onClick={() => handleOpenExtensionModal(alerta)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-[6px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                      >
                        <CalendarPlus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Prorrogar</span>
                      </button>

                      {nc && (
                        <button
                          onClick={() => onSelectNC(nc)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[6px] text-xs font-bold shadow-xs transition-colors"
                        >
                          Tratar NC
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. ATENÇÃO */}
        {(activeTab === 'todos' || activeTab === 'atencao') && atencao.length > 0 && (
          <div className="bg-amber-50/40 border border-amber-200 rounded-[12px] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Nível Atenção • Prazos em 7 Dias ou Risco Médio ({atencao.length})</span>
              </div>
              <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-[4px]">
                Acompanhar
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {atencao.map((alerta) => {
                const nc = records.find(r => r.id === alerta.ncId);
                return (
                  <div key={alerta.id} className="bg-white p-4 rounded-[8px] border border-amber-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900">#{alerta.numeroNC}</span>
                          <span className="text-xs font-bold text-slate-800">{alerta.titulo}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-700 block mt-0.5">
                          Expira em {alerta.diasRestantes} dia(s) ({formatarData(alerta.prazo)})
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-[4px] font-bold ${obterCorRisco(alerta.nivelRisco).badgeBg}`}>
                        {alerta.nivelRisco}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-[6px] border border-slate-100 flex items-center justify-between">
                      <span>Responsável: <strong>{alerta.responsavel}</strong></span>
                      <span>Auditor: <strong>{alerta.auditor}</strong></span>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => handleSimulateNotification(alerta)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Notificar</span>
                      </button>

                      {nc && (
                        <button
                          onClick={() => onSelectNC(nc)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-[6px] text-xs font-bold shadow-xs transition-colors"
                        >
                          Ver Detalhes
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. ACOMPANHAMENTO */}
        {(activeTab === 'todos' || activeTab === 'acompanhamento') && acompanhamento.length > 0 && (
          <div className="bg-blue-50/40 border border-blue-200 rounded-[12px] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
              <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Nível Acompanhamento • No Prazo ou Aguardando Auditoria de Eficácia ({acompanhamento.length})</span>
              </div>
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-[4px]">
                Monitoramento
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {acompanhamento.map((alerta) => {
                const nc = records.find(r => r.id === alerta.ncId);
                return (
                  <div key={alerta.id} className="bg-white p-4 rounded-[8px] border border-blue-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-900">#{alerta.numeroNC}</span>
                          <span className="text-xs font-bold text-slate-800">{alerta.titulo}</span>
                        </div>
                        <span className="text-[11px] text-blue-700 font-medium block mt-0.5">
                          {alerta.tipoAlerta === 'AGUARDANDO_EFICACIA' 
                            ? `Plano de ação concluído. Auditor ${alerta.auditor} deve auditar evidências.`
                            : `Vencimento em ${formatarData(alerta.prazo)} (restam ${alerta.diasRestantes} dias)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      {nc && (
                        <button
                          onClick={() => onSelectNC(nc)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-bold shadow-xs transition-colors"
                        >
                          {alerta.tipoAlerta === 'AGUARDANDO_EFICACIA' ? 'Auditar Eficácia' : 'Ver Detalhes'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {safeAlertas.length === 0 && (
          <div className="bg-white p-12 rounded-[12px] border border-slate-200 shadow-xs text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Nenhum alerta pendente</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Todas as Não Conformidades estão dentro do prazo regulatório e com tratamento em dia.
            </p>
          </div>
        )}
      </div>

      {/* Modal for Deadline Extension */}
      {selectedAlertForExtension && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] max-w-md w-full p-5 shadow-2xl border border-slate-300 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Prorrogar Prazo da RNC #{selectedAlertForExtension.numeroNC}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedAlertForExtension.titulo} (Prazo atual: {formatarData(selectedAlertForExtension.prazo)})
              </p>
            </div>

            <form onSubmit={handleConfirmExtension} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Data de Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full text-xs p-2 rounded-[8px] border border-slate-300 focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificativa Técnica da Prorrogação *
                </label>
                <textarea
                  rows={3}
                  required
                  value={motivoProrrogacao}
                  onChange={(e) => setMotivoProrrogacao(e.target.value)}
                  className="w-full text-xs p-2 rounded-[8px] border border-slate-300 focus:ring-1 focus:ring-slate-500"
                  placeholder="Ex: Atraso no retorno de calibração externa RBC pelo laboratório credenciado."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlertForExtension(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-[8px] text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-[8px] text-xs font-bold shadow-xs transition-colors"
                >
                  Confirmar Prorrogação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
