import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  Lock
} from 'lucide-react';
import { RegistroImportacaoCompleto, UserProfile } from '../../types';

interface ImportReversalModalProps {
  importacao: RegistroImportacaoCompleto | null;
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmarReversao: (importacao: RegistroImportacaoCompleto, motivo: string) => Promise<void>;
}

export const ImportReversalModal: React.FC<ImportReversalModalProps> = ({
  importacao,
  user,
  isOpen,
  onClose,
  onConfirmarReversao,
}) => {
  const [motivo, setMotivo] = useState<string>('');
  const [isProcessando, setIsProcessando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen || !importacao) return null;

  const isGestorOuAdmin = user?.role === 'ADMIN' || user?.role === 'GESTOR_SGQ';
  const totalCriados = importacao.registrosCriadosQtd || importacao.registrosCriadosSnapshot?.length || 0;
  const totalAtualizados = importacao.registrosAtualizadosQtd || importacao.registrosAtualizadosSnapshot?.length || 0;

  const handleConfirmar = async () => {
    if (!motivo.trim()) {
      setErro('Informe obrigatoriamente a justificativa para a reversão desta importação (exigência ANAC/SGQ).');
      return;
    }
    setErro(null);
    setIsProcessando(true);
    try {
      await onConfirmarReversao(importacao, motivo.trim());
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao reverter importação.');
    } finally {
      setIsProcessando(false);
    }
  };

  return (
    <div
      id="modal-import-reversal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* CABEÇALHO DE ALERTA CRÍTICO */}
        <div className="p-5 border-b border-red-100 flex items-center justify-between bg-red-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl border border-red-200">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-red-800 uppercase tracking-wide">
                Governança & Rastreabilidade SGQ
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Reverter Importação no QualiGest
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessando}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-red-100/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-6 space-y-5">
          {/* DETALHES DA IMPORTAÇÃO SELECIONADA */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                {importacao.nomeArquivo}
              </span>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                {importacao.tipoControle}
              </span>
            </div>
            <div className="text-slate-600 grid grid-cols-2 gap-1 pt-1">
              <div>Importado em: <strong>{new Date(importacao.dataUpload).toLocaleString('pt-BR')}</strong></div>
              <div>Responsável: <strong>{importacao.usuarioNome || importacao.usuarioEmail}</strong></div>
            </div>
          </div>

          {/* QUADRO DE IMPACTO EXATO */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              Impacto Direto nos Cadastros Oficiais:
            </div>
            <ul className="text-xs text-amber-950 space-y-1.5 pl-4 list-disc">
              <li>
                <strong>{totalCriados} registro(s) criados</strong> por esta importação serão <span className="text-red-700 font-bold">excluídos</span> dos cadastros oficiais do módulo correspondente.
              </li>
              <li>
                <strong>{totalAtualizados} registro(s) atualizados</strong> retornarão automaticamente ao <span className="text-blue-800 font-bold">snapshot anterior</span> de seus dados originais.
              </li>
              <li>
                Esta ação gerará um registro formal de reversão na <strong>Trilha de Auditoria (Audit Trail)</strong> do SGQ com carimbo de data, hora e autoria.
              </li>
            </ul>
          </div>

          {!isGestorOuAdmin ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>Acesso Negado:</strong> A reversão de importações oficiais exige perfil <strong>GESTOR_SGQ</strong> ou <strong>ADMIN</strong>.
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Justificativa Obrigatória da Reversão (para conformidade ANAC/EASA): *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo da reversão (ex: planilha enviada com versão desatualizada da oficina de testes, erro de parametrização de setor)..."
                rows={3}
                disabled={isProcessando}
                className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:outline-red-500 text-slate-900 font-medium"
              />
            </div>
          )}

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
              {erro}
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessando}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Cancelar
          </button>

          {isGestorOuAdmin && (
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isProcessando || !motivo.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              {isProcessando ? 'Revertendo...' : 'Confirmar Reversão Segura'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
