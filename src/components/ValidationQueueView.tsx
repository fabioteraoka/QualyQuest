import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Trash2,
  Filter,
  Search,
  BookOpen,
  ArrowUpRight,
  Layers,
  Scale,
  RefreshCw,
  FileText,
  Sliders,
  Check,
} from 'lucide-react';
import {
  ComparacaoRNCRecord,
  StatusComparacao,
  UserProfile,
  NCRecord,
} from '../types';
import {
  subscribeToRNCComparisons,
  deleteRNCComparison,
  saveRNCComparison,
  saveNCRecord,
} from '../services/firebase/firestore';

interface ValidationQueueViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  records: NCRecord[];
  onNavigateToComparison?: () => void;
  onNavigateToRecord?: (record: NCRecord) => void;
}

export const ValidationQueueView: React.FC<ValidationQueueViewProps> = ({
  organizationId,
  userProfile,
  records,
  onNavigateToComparison,
  onNavigateToRecord,
}) => {
  const [comparisons, setComparisons] = useState<ComparacaoRNCRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedComp, setSelectedComp] = useState<ComparacaoRNCRecord | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Escuta em tempo real no Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToRNCComparisons(
      organizationId,
      (list) => {
        setComparisons(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar comparações:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId]);

  // Filtragem dos registros
  const filteredList = comparisons.filter((item) => {
    const matchesStatus = filterStatus === 'TODAS' || item.statusGeral === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      (item.numeroNCAssociada && item.numeroNCAssociada.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.nomeArquivoFonte.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.correspondencia.tituloNC && item.correspondencia.tituloNC.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Estatísticas do Painel
  const totalComparisons = comparisons.length;
  const pendentes = comparisons.filter((c) => c.statusGeral === 'PENDENTE_VALIDACAO' || c.statusGeral === 'DUVIDA_ASSOCIACAO').length;
  const aplicadas = comparisons.filter((c) => c.statusGeral === 'APLICADO_NA_RNC').length;
  const promovidas = comparisons.filter((c) => c.statusGeral === 'PROMOVIDO_A_PADRAO').length;
  const mediaConcordancia = totalComparisons > 0
    ? Math.round(comparisons.reduce((acc, c) => acc + (c.resumoComparacao?.taxaConcordancia || 0), 0) / totalComparisons)
    : 0;

  const handleDelete = async (comp: ComparacaoRNCRecord) => {
    if (!window.confirm(`Confirma a exclusão do registro de comparação "${comp.nomeArquivoFonte}"?`)) return;
    try {
      await deleteRNCComparison(organizationId, comp.id, userProfile);
      setActionMsg('Registro excluído com sucesso.');
      if (selectedComp?.id === comp.id) setSelectedComp(null);
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const getStatusBadge = (status: StatusComparacao) => {
    switch (status) {
      case 'PENDENTE_VALIDACAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> Pendente Validação
          </span>
        );
      case 'DUVIDA_ASSOCIACAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <HelpCircle className="w-3 h-3 text-rose-600" /> Dúvida na Associação
          </span>
        );
      case 'VALIDADO_CONVERGENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Validado Convergente
          </span>
        );
      case 'VALIDADO_COM_DIVERGENCIAS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Scale className="w-3 h-3 text-blue-600" /> Validado c/ Divergências
          </span>
        );
      case 'APLICADO_NA_RNC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Check className="w-3 h-3 text-indigo-600" /> Aplicado na RNC
          </span>
        );
      case 'PROMOVIDO_A_PADRAO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <BookOpen className="w-3 h-3 text-purple-600" /> Padrão SGQ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                GOVERNANÇA & TRILHA DE VALIDAÇÃO
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Fila de Validação de RNCs Respondidas
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Monitore todas as análises comparativas da organização, resolva pendências de associação e acompanhe a taxa de concordância do sistema.
            </p>
          </div>

          {onNavigateToComparison && (
            <button
              onClick={onNavigateToComparison}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all shrink-0"
            >
              <FileText className="w-4 h-4" /> Nova Comparação
            </button>
          )}
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Analisadas</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalComparisons}</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pendentes de Validação</p>
            <p className="text-2xl font-black text-amber-900 mt-1">{pendentes}</p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-800">Aplicadas na RNC</p>
            <p className="text-2xl font-black text-indigo-900 mt-1">{aplicadas}</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Concordância Média</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">{mediaConcordancia}%</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número de NC, arquivo ou título..."
            className="text-sm w-full border-none focus:ring-0 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs p-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="TODAS">Todos os Status</option>
            <option value="PENDENTE_VALIDACAO">Pendentes de Validação</option>
            <option value="DUVIDA_ASSOCIACAO">Dúvidas na Associação</option>
            <option value="VALIDADO_COM_DIVERGENCIAS">Validados com Divergências</option>
            <option value="VALIDADO_CONVERGENTE">Validados Convergentes</option>
            <option value="APLICADO_NA_RNC">Aplicados na RNC</option>
            <option value="PROMOVIDO_A_PADRAO">Promovidos a Padrão SGQ</option>
          </select>
        </div>
      </div>

      {/* Lista de Registros da Fila */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm">Carregando fila de validação em tempo real...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Nenhum registro de comparação encontrado.</p>
            <p className="text-xs text-slate-400">
              Faça o upload do primeiro documento respondido para iniciar a validação.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((comp) => {
              const matchedNC = records.find((r) => r.id === comp.rncIdAssociada);

              return (
                <div
                  key={comp.id}
                  className="p-5 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {comp.numeroNCAssociada || 'Sem NC Vinculada'}
                      </span>
                      {getStatusBadge(comp.statusGeral)}
                      <span className="text-xs text-slate-400">
                        • {new Date(comp.dataUpload).toLocaleDateString('pt-BR')} às {new Date(comp.dataUpload).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-700">
                      Arquivo: <span className="font-mono text-slate-600">{comp.nomeArquivoFonte}</span>
                    </p>

                    {comp.correspondencia.tituloNC && (
                      <p className="text-xs text-slate-600 line-clamp-1">
                        Título: {comp.correspondencia.tituloNC}
                      </p>
                    )}

                    {/* Resumo dos Campos */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {comp.resumoComparacao.convergentes} Convergentes
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {comp.resumoComparacao.complementares} Complementares
                      </span>
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                        {comp.resumoComparacao.divergentes} Divergentes
                      </span>
                      <span className="font-bold text-indigo-600">
                        Taxa de Concordância: {comp.resumoComparacao.taxaConcordancia}%
                      </span>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => setSelectedComp(comp)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspecionar Detalhes
                    </button>

                    {matchedNC && onNavigateToRecord && (
                      <button
                        onClick={() => onNavigateToRecord(matchedNC)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-indigo-200"
                      >
                        Ver RNC <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(comp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Excluir comparação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Drawer de Detalhes da Comparação */}
      {selectedComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    INSPEÇÃO DE VALIDAÇÃO
                  </span>
                  {getStatusBadge(selectedComp.statusGeral)}
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedComp.numeroNCAssociada || 'Sem Número'} — {selectedComp.nomeArquivoFonte}
                </h3>
              </div>
              <button
                onClick={() => setSelectedComp(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Corpo do Modal com Campos Comparados */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-lg font-bold text-emerald-800">{selectedComp.resumoComparacao.convergentes}</span>
                  <p className="text-emerald-600 font-medium">Convergentes</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-lg font-bold text-amber-800">{selectedComp.resumoComparacao.complementares}</span>
                  <p className="text-amber-600 font-medium">Complementares</p>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                  <span className="text-lg font-bold text-orange-800">{selectedComp.resumoComparacao.divergentes}</span>
                  <p className="text-orange-600 font-medium">Divergentes</p>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="text-lg font-bold text-indigo-800">{selectedComp.resumoComparacao.taxaConcordancia}%</span>
                  <p className="text-indigo-600 font-medium">Concordância</p>
                </div>
              </div>

              {selectedComp.parecerAuditorSGQ && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="text-xs font-bold text-slate-700">Parecer do Auditor SGQ:</p>
                  <p className="text-xs text-slate-600 italic">{selectedComp.parecerAuditorSGQ}</p>
                </div>
              )}

              {/* Lista dos Campos */}
              <div className="space-y-3 pt-2">
                {selectedComp.camposComparados.map((campo) => (
                  <div key={campo.campoId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{campo.nomeCampo}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border">
                        {campo.classificacao}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-white rounded border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">QualiGest Original / IA</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{campo.valorOriginalQualiGest || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-indigo-50/50 rounded border border-indigo-200">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Resposta do Usuário (Prevalência)</p>
                        <p className="text-slate-900 font-medium whitespace-pre-wrap">{campo.valorRespostaUsuario || 'N/A'}</p>
                      </div>
                    </div>

                    {campo.explicacaoAnalise && (
                      <p className="text-[11px] text-slate-500 italic pt-1">{campo.explicacaoAnalise}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedComp(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
