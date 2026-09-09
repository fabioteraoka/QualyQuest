import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { NCRecord } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record?: NCRecord | null;
  count?: number;
  title?: string;
  description?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  record,
  count,
  title,
  description,
}) => {
  if (!isOpen) return null;

  const isMultiple = (count && count > 1) || false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-[12px] max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-[8px] bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <Trash2 className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-[6px] hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {title || (isMultiple ? `Excluir ${count} Não Conformidades?` : 'Excluir Não Conformidade?')}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {description || 'Esta ação removerá permanentemente o(s) registro(s) do banco de dados do sistema SGQ e não poderá ser desfeita.'}
          </p>
        </div>

        {record && (
          <div className="p-3 bg-slate-50 rounded-[8px] border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-mono font-bold text-slate-800">
              <span>#{record.numeroNC}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-slate-200 text-slate-700">
                {record.statusGeral}
              </span>
            </div>
            <p className="font-semibold text-slate-800 line-clamp-1">{record.titulo}</p>
            <p className="text-[11px] text-slate-500 line-clamp-2">{record.descricaoNC}</p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            {isMultiple ? `Sim, Excluir (${count})` : 'Sim, Excluir Registro'}
          </button>
        </div>
      </div>
    </div>
  );
};
