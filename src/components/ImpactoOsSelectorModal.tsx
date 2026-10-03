import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  CheckCircle2,
  ExternalLink,
  Plane,
  X,
  RefreshCw,
  AlertCircle,
  Building2,
  Clock,
  UserCheck,
} from 'lucide-react';
import { ImpactoOrdemServico, VinculoImpactoMro } from '../types/impactoMro';
import { impactoMroApi } from '../services/impactoMroApi';

interface ImpactoOsSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOS: (vinculo: VinculoImpactoMro) => void;
  currentLinkedOsId?: string;
}

export const ImpactoOsSelectorModal: React.FC<ImpactoOsSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectOS,
  currentLinkedOsId,
}) => {
  const [loading, setLoading] = useState(false);
  const [ordensServico, setOrdensServico] = useState<ImpactoOrdemServico[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      carregarOrdensServico();
    }
  }, [isOpen]);

  const carregarOrdensServico = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await impactoMroApi.getOrdensServico();
      if (resp.success && resp.data) {
        setOrdensServico(resp.data);
      } else {
        setError(resp.error || 'Não foi possível carregar as Ordens de Serviço do Impacto Aviation MRO.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão com o Impacto Aviation MRO.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = ordensServico.filter((os) => {
    const q = search.toLowerCase();
    return (
      os.numero.toLowerCase().includes(q) ||
      os.prefixoAeronave.toLowerCase().includes(q) ||
      os.modeloAeronave.toLowerCase().includes(q) ||
      os.titulo.toLowerCase().includes(q) ||
      os.clienteNome.toLowerCase().includes(q) ||
      os.tecnicoResponsavelNome.toLowerCase().includes(q)
    );
  });

  const handleSelect = (os: ImpactoOrdemServico) => {
    const vinculo: VinculoImpactoMro = {
      origem: 'Impacto Aviation MRO',
      ordemServicoId: os.id, // ID estável do Impacto
      numeroOS: os.numero,
      tituloOS: os.titulo,
      prefixoAeronave: os.prefixoAeronave,
      modeloAeronave: os.modeloAeronave,
      tipoManutencao: os.tipoManutencao,
      baseId: os.baseId,
      baseNome: os.baseNome,
      tecnicoId: os.tecnicoResponsavelId, // ID estável do técnico
      tecnicoNome: os.tecnicoResponsavelNome,
      dataAberturaOS: os.dataAbertura,
      statusOS: os.status,
      urlNavegavel: os.urlNavegavel,
      dataVinculo: new Date().toISOString(),
    };

    onSelectOS(vinculo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                Fonte Externa Oficial
              </span>
              <span className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Impacto Aviation MRO
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight">
              Vincular RNC a uma Ordem de Serviço de Manutenção
            </h3>
            <p className="text-xs text-slate-400">
              Selecione a OS oficial do Impacto Aviation MRO para rastreabilidade de aeronave, técnico e evidências.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Busca */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número da OS, prefixo de aeronave (ex: PR-AZL), modelo ou técnico..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={carregarOrdensServico}
            disabled={loading}
            className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Atualizar lista a partir do Impacto Aviation MRO"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Lista de OS */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading && (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-600 font-medium">Carregando Ordens de Serviço do Impacto...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center space-y-2 bg-rose-50 rounded-xl border border-rose-200">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-xs text-rose-800 font-semibold">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhuma Ordem de Serviço encontrada com os critérios informados.
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((os) => {
              const isSelected = currentLinkedOsId === os.id;
              return (
                <div
                  key={os.id}
                  className={`p-4 rounded-xl border transition-all text-xs space-y-2.5 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {os.numero}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {os.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          os.prioridade === 'AOG'
                            ? 'bg-rose-600 text-white'
                            : os.prioridade === 'URGENTE'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {os.prioridade}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{os.titulo}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelect(os)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'OS Vinculada' : 'Selecionar OS'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">{os.descricao}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Plane className="w-3 h-3 text-slate-400" />
                      <span><strong>{os.prefixoAeronave}</strong> ({os.modeloAeronave})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{os.baseNome}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>{os.tecnicoResponsavelNome}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Abertura: {os.dataAbertura}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Origem oficial: <strong>Impacto Aviation MRO</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
