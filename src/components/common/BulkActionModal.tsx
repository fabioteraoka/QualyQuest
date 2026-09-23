import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  Power,
  RotateCcw,
  Tag,
  X,
  Loader2,
  Info,
} from 'lucide-react';
import { StatusColaborador } from '../../types';
import { ResultadoAnaliseLote } from '../../services/bulkManagementService';

interface BulkActionModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  tipoEntidade: 'COLABORADOR' | 'FERRAMENTA';
  acao: 'EXCLUIR' | 'INATIVAR' | 'REATIVAR' | 'CLASSIFICAR_STATUS';
  analise: ResultadoAnaliseLote<T>;
  onConfirmar: (dados: {
    somentePermitidos: boolean;
    motivo: string;
    novoStatus?: StatusColaborador;
    statusCustomizado?: string;
  }) => Promise<void>;
}

export function BulkActionModal<T extends { id: string; [key: string]: any }>({
  isOpen,
  onClose,
  tipoEntidade,
  acao,
  analise,
  onConfirmar,
}: BulkActionModalProps<T>) {
  const [motivo, setMotivo] = useState('');
  const [novoStatus, setNovoStatus] = useState<StatusColaborador>('ATIVO');
  const [statusCustomizado, setStatusCustomizado] = useState('');
  const [textoConfirmacao, setTextoConfirmacao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = analise.totalSelecionado;
  const qtdPermitidos = analise.permitidos.length;
  const qtdBloqueados = analise.bloqueados.length;
  const textoObrigatorioExclusao = `EXCLUIR ${qtdPermitidos} REGISTROS`;

  const precisaConfirmacaoDigitada = acao === 'EXCLUIR' && qtdPermitidos > 0;
  const podeExecutar =
    qtdPermitidos > 0 &&
    motivo.trim().length >= 5 &&
    (!precisaConfirmacaoDigitada || textoConfirmacao === textoObrigatorioExclusao) &&
    !processando;

  const handleExecutar = async () => {
    if (!podeExecutar) return;
    setProcessando(true);
    setErro(null);
    try {
      await onConfirmar({
        somentePermitidos: true,
        motivo: motivo.trim(),
        novoStatus,
        statusCustomizado: statusCustomizado.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao processar ação em lote.');
    } finally {
      setProcessando(false);
    }
  };

  const getTituloAcao = () => {
    switch (acao) {
      case 'EXCLUIR':
        return 'Exclusão em Lote';
      case 'INATIVAR':
        return 'Inativação Lógica em Lote';
      case 'REATIVAR':
        return 'Reativação em Lote';
      case 'CLASSIFICAR_STATUS':
        return 'Classificação de Status em Lote';
    }
  };

  const getIconeAcao = () => {
    switch (acao) {
      case 'EXCLUIR':
        return <Trash2 className="w-5 h-5 text-rose-600" />;
      case 'INATIVAR':
        return <Power className="w-5 h-5 text-amber-600" />;
      case 'REATIVAR':
        return <RotateCcw className="w-5 h-5 text-emerald-600" />;
      case 'CLASSIFICAR_STATUS':
        return <Tag className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100">{getIconeAcao()}</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{getTituloAcao()}</h3>
              <p className="text-xs text-slate-500">
                {tipoEntidade === 'COLABORADOR' ? 'Colaboradores Selecionados' : 'Instrumentos Selecionados'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processando}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quadro de Análise e Triagem de Dependências */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Selecionados
              </span>
              <span className="text-xl font-bold text-slate-900">{total}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                Permitidos
              </span>
              <span className="text-xl font-bold text-emerald-800">{qtdPermitidos}</span>
            </div>
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                Bloqueados
              </span>
              <span className="text-xl font-bold text-rose-800">{qtdBloqueados}</span>
            </div>
          </div>

          {/* Avisos de Bloqueio por Dependências */}
          {qtdBloqueados > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">
                    {qtdBloqueados} registro(s) possuem histórico ou dependências ativas e não podem ser {acao.toLowerCase()}s.
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Conforme os requisitos do RBAC 145 / EASA, a rastreabilidade histórica é inviolável.
                    Você pode processar os <strong>{qtdPermitidos} registro(s) permitidos</strong> sem necessidade de seleção individual.
                  </p>
                </div>
              </div>

              {/* Lista dos bloqueados (máximo 5 detalhados) */}
              <div className="max-h-32 overflow-y-auto bg-white/80 p-2 rounded-lg border border-amber-200/60 divide-y divide-slate-100 text-[11px]">
                {analise.bloqueados.slice(0, 5).map((b, idx) => (
                  <div key={b.item.id || idx} className="py-1">
                    <span className="font-medium text-slate-800">
                      {b.item.nome || b.item.codigoPatrimonio || b.item.id}:
                    </span>{' '}
                    <span className="text-rose-600">{b.motivoBloqueio}</span>
                    {b.detalhesBloqueio && b.detalhesBloqueio.length > 0 && (
                      <span className="text-slate-500 block text-[10px] pl-2">
                        • {b.detalhesBloqueio.join(' • ')}
                      </span>
                    )}
                  </div>
                ))}
                {analise.bloqueados.length > 5 && (
                  <p className="text-[10px] text-slate-500 pt-1 italic">
                    ...e mais {analise.bloqueados.length - 5} registro(s) com vínculos preservados.
                  </p>
                )}
              </div>
            </div>
          )}

          {qtdPermitidos === 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Nenhum dos registros selecionados pode sofrer esta operação no momento.</span>
            </div>
          )}
        </div>

        {/* Formulário de Configuração da Ação */}
        {qtdPermitidos > 0 && (
          <div className="space-y-3.5 pt-2 border-t border-slate-100 text-xs">
            {/* Seletor de Novo Status quando acao === 'CLASSIFICAR_STATUS' */}
            {acao === 'CLASSIFICAR_STATUS' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Novo Status Operacional *</label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value as StatusColaborador)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="ATIVO">🟢 ATIVO (Disponível para escalas e manutenção)</option>
                  <option value="EM_TREINAMENTO">🔵 EM TREINAMENTO (Capacitação / Integração)</option>
                  <option value="RESTRITO">🟡 RESTRITO (Restrição médica ou técnica ativa)</option>
                  <option value="SUSPENSO">🔴 SUSPENSO (Bloqueio preventivo)</option>
                  <option value="AFASTADO">🟣 AFASTADO (Licença médica ou INSS)</option>
                  <option value="INATIVO">🔘 INATIVO (Retirado de operação mantendo histórico)</option>
                  <option value="DESLIGADO">⚫ DESLIGADO (Ex-colaborador)</option>
                  <option value="OUTRO">⚪ OUTRO (Especificar abaixo)</option>
                </select>
                {novoStatus === 'OUTRO' && (
                  <input
                    type="text"
                    value={statusCustomizado}
                    onChange={(e) => setStatusCustomizado(e.target.value)}
                    placeholder="Especifique o status customizado..."
                    className="w-full p-2 mt-1.5 border border-slate-300 rounded-lg"
                  />
                )}
              </div>
            )}

            {/* Motivo Obrigatório para Trilha de Auditoria */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Justificativa / Motivo Regulatório * (Audit Trail)
              </label>
              <textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Informe o motivo da alteração em lote para o histórico de auditoria..."
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
              />
              <span className="text-[10px] text-slate-500">Mínimo de 5 caracteres.</span>
            </div>

            {/* Confirmação Digitada para Exclusão */}
            {precisaConfirmacaoDigitada && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Confirmação de Segurança Requerida</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  Esta ação excluirá fisicamente <strong>{qtdPermitidos}</strong> registros órfãos sem histórico vinculado.
                  Para confirmar, digite exatamente:{' '}
                  <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold text-rose-900 select-all">
                    {textoObrigatorioExclusao}
                  </code>
                </p>
                <input
                  type="text"
                  value={textoConfirmacao}
                  onChange={(e) => setTextoConfirmacao(e.target.value)}
                  placeholder={textoObrigatorioExclusao}
                  className="w-full p-2 border border-rose-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>
            )}

            {erro && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer com Ações */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={processando}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Cancelar
          </button>

          {qtdPermitidos > 0 && (
            <button
              type="button"
              onClick={handleExecutar}
              disabled={!podeExecutar}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition shadow-xs ${
                acao === 'EXCLUIR'
                  ? podeExecutar
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-rose-300 cursor-not-allowed'
                  : acao === 'INATIVAR'
                  ? podeExecutar
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-amber-300 cursor-not-allowed'
                  : podeExecutar
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-300 cursor-not-allowed'
              }`}
            >
              {processando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando lote...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Confirmar {getTituloAcao()} ({qtdPermitidos})
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
