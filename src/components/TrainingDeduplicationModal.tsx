import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Search,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Check,
  Filter
} from 'lucide-react';
import { RegistroTreinamentoColaborador, UserProfile } from '../types';
import {
  analisarDuplicidadesTreinamento,
  AnaliseDuplicidadesTreinamentoResult
} from '../services/competenciesEngine';
import { batchDeleteTrainingRecords } from '../services/firebase/competenciesFirestore';

interface TrainingDeduplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  userProfile?: UserProfile | null;
  trainingRecords: RegistroTreinamentoColaborador[];
  onRegistrosRemovidos?: (idsRemovidos: string[]) => void;
}

export const TrainingDeduplicationModal: React.FC<TrainingDeduplicationModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  userProfile,
  trainingRecords = [],
  onRegistrosRemovidos,
}) => {
  const [filtroBusca, setFiltroBusca] = useState('');
  const [isProcessando, setIsProcessando] = useState(false);
  const [progresso, setProgresso] = useState<{ removidos: number; total: number } | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Executa análise das duplicidades
  const analise: AnaliseDuplicidadesTreinamentoResult = useMemo(() => {
    return analisarDuplicidadesTreinamento(trainingRecords);
  }, [trainingRecords]);

  // Filtra os grupos para visualização
  const gruposFiltrados = useMemo(() => {
    if (!filtroBusca.trim()) return analise.gruposComDuplicidade;
    const termo = filtroBusca.toLowerCase().trim();
    return analise.gruposComDuplicidade.filter(
      (g) =>
        g.colaboradorNome.toLowerCase().includes(termo) ||
        g.treinamentoTitulo.toLowerCase().includes(termo)
    );
  }, [analise, filtroBusca]);

  if (!isOpen) return null;

  const handleExecutarDeduplicacao = async () => {
    if (analise.totalDuplicidadesParaRemover === 0) return;
    if (userProfile?.role === 'CONSULTA') {
      alert('Usuário com perfil de CONSULTA não possui permissão para expurgar registros.');
      return;
    }

    const confirmacao = window.confirm(
      `Confirma a limpeza de ${analise.totalDuplicidadesParaRemover.toLocaleString()} registros duplicados no Firestore?\n\nO sistema manterá rigorosamente o ciclo mais recente de cada curso por colaborador e removerá apenas as cópias redundantes de importações anteriores.`
    );
    if (!confirmacao) return;

    setIsProcessando(true);
    setMensagemSucesso(null);
    setProgresso({ removidos: 0, total: analise.totalDuplicidadesParaRemover });

    try {
      const idsParaExcluir = [...analise.todosIdsParaRemover];
      await batchDeleteTrainingRecords(
        organizationId,
        idsParaExcluir,
        userProfile,
        (removidos, total) => {
          setProgresso({ removidos, total });
        }
      );

      if (onRegistrosRemovidos) {
        onRegistrosRemovidos(idsParaExcluir);
      }

      setMensagemSucesso(
        `Deduplicação concluída com sucesso! ${idsParaExcluir.length.toLocaleString()} registros redundantes foram eliminados. A base agora conta com ${analise.totalGruposUnicos.toLocaleString()} capacitações únicas consolidadas.`
      );
    } catch (err: any) {
      alert(`Erro durante a deduplicação em lote: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Deduplicação & Saneamento de Histórico de Cursos
              </h2>
              <p className="text-xs text-slate-400">
                Higienização de registros acumulados por importações repetidas (RBAC 145 / MOMQ)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessando}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          {/* Métricas do Diagnóstico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Total no Banco de Dados
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {analise.totalRegistrosGerais.toLocaleString('pt-BR')}
              </p>
              <span className="text-[11px] text-slate-500">Linhas de histórico cadastradas</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">
                Capacitações Únicas Legítimas
              </span>
              <p className="text-2xl font-black text-emerald-800 mt-1">
                {analise.totalGruposUnicos.toLocaleString('pt-BR')}
              </p>
              <span className="text-[11px] text-emerald-700">Pares únicos (Colaborador + Curso)</span>
            </div>

            <div className={`p-4 rounded-xl border ${
              analise.totalDuplicidadesParaRemover > 0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <span className="text-[11px] font-semibold block uppercase tracking-wider">
                Cópias Redundantes / A Remover
              </span>
              <p className="text-2xl font-black mt-1">
                {analise.totalDuplicidadesParaRemover.toLocaleString('pt-BR')}
              </p>
              <span className="text-[11px] opacity-80">
                {analise.totalDuplicidadesParaRemover > 0
                  ? 'Excedentes duplicados detectados'
                  : 'Nenhuma duplicidade encontrada'}
              </span>
            </div>
          </div>

          {/* Feedback de Sucesso */}
          {mensagemSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Operação Concluída com Sucesso</p>
                <p className="text-xs text-emerald-800 mt-0.5">{mensagemSucesso}</p>
              </div>
            </div>
          )}

          {/* Barra de Progresso durante a exclusão */}
          {isProcessando && progresso && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Expurgando registros redundantes no Firestore...
                </span>
                <span>
                  {progresso.removidos.toLocaleString()} / {progresso.total.toLocaleString()} (
                  {Math.round((progresso.removidos / (progresso.total || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-purple-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((progresso.removidos / (progresso.total || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Lista de Grupos Afetados */}
          {analise.totalDuplicidadesParaRemover > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Detalhamento de Cursos com Múltiplas Ocorrências ({analise.gruposComDuplicidade.length} cursos afetados)
                </h3>
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador ou curso..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-purple-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Colaborador</th>
                      <th className="p-2.5">Curso / Treinamento</th>
                      <th className="p-2.5 text-center">Cópias</th>
                      <th className="p-2.5">Registro Preservado (Mais Recente)</th>
                      <th className="p-2.5 text-center">Ação do Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {gruposFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400">
                          Nenhum registro encontrado para a busca informada.
                        </td>
                      </tr>
                    ) : (
                      gruposFiltrados.slice(0, 100).map((grupo) => (
                        <tr key={grupo.chave} className="hover:bg-purple-50/30">
                          <td className="p-2.5 font-bold text-slate-900">{grupo.colaboradorNome}</td>
                          <td className="p-2.5 text-slate-700">{grupo.treinamentoTitulo}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                              {grupo.totalRegistros} cópias
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            <span className="font-semibold text-emerald-800">
                              Validade: {grupo.registroPreservado.dataValidade || 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Realizado em: {grupo.registroPreservado.dataRealizacao || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              Manter 1, excluir {grupo.idsParaRemover.length}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {gruposFiltrados.length > 100 && (
                <p className="text-[11px] text-slate-500 text-right">
                  Exibindo primeiros 100 de {gruposFiltrados.length} grupos com duplicidade.
                </p>
              )}
            </div>
          )}

          {analise.totalDuplicidadesParaRemover === 0 && !mensagemSucesso && (
            <div className="p-8 text-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">Base de Dados Íntegra e Normalizada</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não foram identificadas duplicidades de treinamentos no momento. Cada colaborador possui apenas o registro correspondente ao ciclo de capacitação mais recente.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Processamento em lotes atômicos com registro em Audit Trail.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessando}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
            >
              Fechar
            </button>
            {analise.totalDuplicidadesParaRemover > 0 && (
              <button
                onClick={handleExecutarDeduplicacao}
                disabled={isProcessando}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isProcessando ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deduplicando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Expurgar {analise.totalDuplicidadesParaRemover.toLocaleString()} Cópias Redundantes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
