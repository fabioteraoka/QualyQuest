import React from 'react';
import {
  X,
  Award,
  Calendar,
  Building2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck
} from 'lucide-react';
import { FerramentaCalibracao } from '../../types';

interface ToolCalibrationHistoryModalProps {
  tool: FerramentaCalibracao | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ToolCalibrationHistoryModal: React.FC<ToolCalibrationHistoryModalProps> = ({
  tool,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !tool) return null;

  const historico = tool.historicoCalibracoes || [];

  return (
    <div
      id="modal-tool-calibration-history"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* CABEÇALHO */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                  {tool.codigoPatrimonio}
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  RBAC 145.109 / EASA
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {tool.descricao}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* FICHA RESUMO DA FERRAMENTA */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">Número de Série:</span>
              <strong className="text-slate-900 font-mono">{tool.numeroSerie}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Fabricante:</span>
              <strong className="text-slate-900">{tool.fabricante} {tool.modelo ? `(${tool.modelo})` : ''}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Setor / Localização:</span>
              <strong className="text-slate-900 truncate block">{tool.setor}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Última Calibração Vigente:</span>
              <strong className="text-blue-900">{tool.dataUltimaCalibracao}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Próxima Calibração:</span>
              <strong className="text-slate-900">{tool.dataProximaCalibracao}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Certificado RBC Atual:</span>
              <strong className="text-purple-900 font-mono">{tool.numeroCertificado || '—'}</strong>
            </div>
          </div>

          {/* TIMELINE DE CALIBRAÇÕES ANTERIORES E ATUAIS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              Histórico Completo de Calibrações ({historico.length + 1} evento(s)):
            </h4>

            {/* Evento Atual Vigente */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Calibração Atual Vigente
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                  Em Vigência
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 text-emerald-950">
                <div>Data: <strong>{tool.dataUltimaCalibracao}</strong></div>
                <div>Validade: <strong>{tool.dataProximaCalibracao}</strong></div>
                <div>Certificado: <strong className="font-mono">{tool.numeroCertificado || '—'}</strong></div>
                <div className="col-span-2">Laboratório: <strong>{tool.laboratorioCalibrador}</strong></div>
              </div>
            </div>

            {/* Eventos Históricos Preservados */}
            {historico.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                Nenhum evento anterior registrado. Calibrações atualizadas via importação inteligente serão arquivadas aqui cronologicamente.
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Calibração Anterior #{historico.length - idx}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Registrado em {item.data}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-slate-700">
                      <div>Data: <strong>{item.data}</strong></div>
                      <div>Validade: <strong>{item.validadeAte || '—'}</strong></div>
                      <div>Certificado: <strong className="font-mono text-purple-700">{item.certificado || '—'}</strong></div>
                      <div className="col-span-2 text-slate-600">Laboratório: {item.laboratorio}</div>
                    </div>
                    {item.observacao && (
                      <p className="text-[11px] text-slate-500 italic pt-0.5 border-t border-slate-100">
                        {item.observacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
