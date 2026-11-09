import React, { useState, useMemo } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCheck2,
  Info,
  ShieldCheck,
  Building2,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  Check,
  X,
  RefreshCw,
  Clock,
  Lock,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import {
  RequisitoClienteItem,
  UserProfile
} from '../../types';
import {
  getPacotesCargaHomologados,
  PacoteCargaRequisitos,
  compararRequisitosParaImportacao,
  ResultadoComparacaoCarga,
  executarCargaPacoteRequisitos
} from '../../services/requirementsDataLoadService';

interface RequirementsDataLoadTabProps {
  requisitosExistentes: RequisitoClienteItem[];
  onCargaConcluida: (novosItens: RequisitoClienteItem[]) => void;
  userProfile?: UserProfile | null;
  organizationId: string;
}

export const RequirementsDataLoadTab: React.FC<RequirementsDataLoadTabProps> = ({
  requisitosExistentes,
  onCargaConcluida,
  userProfile,
  organizationId,
}) => {
  const isConsulta = userProfile?.role === 'CONSULTA' || userProfile?.role === 'VIEWER';
  const pacotes = useMemo(() => getPacotesCargaHomologados(), []);

  const [selectedPacoteParaPreview, setSelectedPacoteParaPreview] = useState<PacoteCargaRequisitos | null>(null);
  const [comparacaoPreview, setComparacaoPreview] = useState<ResultadoComparacaoCarga | null>(null);
  const [modoCarga, setModoCarga] = useState<'SOMENTE_NOVOS' | 'NOVOS_E_ATUALIZACOES'>('SOMENTE_NOVOS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [reportResultado, setReportResultado] = useState<{
    pacoteNome: string;
    inseridos: number;
    atualizados: number;
    preservados: number;
    erros: string[];
  } | null>(null);

  // Manipulador de pré-visualização de um pacote
  const handleOpenPreview = (pacote: PacoteCargaRequisitos) => {
    setSelectedPacoteParaPreview(pacote);
    const comp = compararRequisitosParaImportacao(requisitosExistentes, pacote);
    setComparacaoPreview(comp);
  };

  // Executar carga de um único pacote após confirmação humana
  const handleConfirmarCarga = async () => {
    if (!selectedPacoteParaPreview || isConsulta) return;

    setIsProcessing(true);
    setProgressMsg(`Importando pacote "${selectedPacoteParaPreview.nome}" com integridade...`);

    try {
      const resultado = await executarCargaPacoteRequisitos(
        organizationId,
        selectedPacoteParaPreview,
        requisitosExistentes,
        modoCarga,
        userProfile
      );

      // Calcular lista consolidada de requisitos
      const novos = selectedPacoteParaPreview.requisitos;
      const idsExistentes = new Set(requisitosExistentes.map((r) => r.id));
      const itensAdicionados = novos.filter((n) => !idsExistentes.has(n.id));

      onCargaConcluida([...itensAdicionados, ...requisitosExistentes]);

      setReportResultado({
        pacoteNome: selectedPacoteParaPreview.nome,
        ...resultado,
      });

      setSelectedPacoteParaPreview(null);
      setComparacaoPreview(null);
    } catch (err: any) {
      console.error('Erro na carga:', err);
      alert(`Falha na carga: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
      setProgressMsg(null);
    }
  };

  // Carga Global Integrada (Todos os 7 pacotes)
  const handleCargaGlobal = async () => {
    if (isConsulta) {
      alert('Acesso restrito: Perfil de CONSULTA não possui permissão para executar carga de dados.');
      return;
    }

    const confirmGlobal = window.confirm(
      'Deseja carregar TODOS os 7 pacotes oficiais homologados (Kalitta 69 itens, Atlas 12 itens, RBAC 145, EASA, IOSA, Clientes e MOMQ)?\n\nNenhum registro existente válido será sobrescrito.'
    );
    if (!confirmGlobal) return;

    setIsProcessing(true);
    setProgressMsg('Executando carga global integrada dos requisitos oficiais...');

    let totalInseridos = 0;
    let totalAtualizados = 0;
    let totalPreservados = 0;
    const todosErros: string[] = [];
    let baseAtualizada = [...requisitosExistentes];

    try {
      for (const pacote of pacotes) {
        setProgressMsg(`Processando lote: ${pacote.nome}...`);
        const res = await executarCargaPacoteRequisitos(
          organizationId,
          pacote,
          baseAtualizada,
          'SOMENTE_NOVOS',
          userProfile
        );
        totalInseridos += res.inseridos;
        totalAtualizados += res.atualizados;
        totalPreservados += res.preservados;
        todosErros.push(...res.erros);

        // Atualizar lista em memória
        const idsExistentes = new Set(baseAtualizada.map((r) => r.id));
        const adicionados = pacote.requisitos.filter((r) => !idsExistentes.has(r.id));
        baseAtualizada = [...adicionados, ...baseAtualizada];
      }

      onCargaConcluida(baseAtualizada);

      setReportResultado({
        pacoteNome: 'Carga Global de Todos os 7 Pacotes Homologados',
        inseridos: totalInseridos,
        atualizados: totalAtualizados,
        preservados: totalPreservados,
        erros: todosErros,
      });
    } catch (err: any) {
      console.error('Erro na carga global:', err);
      alert(`Erro na carga global: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
      setProgressMsg(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in text-xs">
      {/* 1. Header Banner & Global Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-emerald-500" />
            Carga e Importação Segura de Requisitos Oficiais
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Importação controlada com pré-visualização mandatória, comparação de duplicidades e preservação absoluta
            de dados existentes (sem sobreposição indevida).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isConsulta && (
            <button
              onClick={handleCargaGlobal}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Carregar todos os 7 pacotes homologados em uma única operação segura"
            >
              <Sparkles className="w-4 h-4" />
              <span>Carga Global Completa (7 Pacotes)</span>
            </button>
          )}
        </div>
      </div>

      {/* Execution Report Notification if just finished */}
      {reportResultado && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Relatório de Carga Concluída: {reportResultado.pacoteNome}
            </h3>
            <button
              onClick={() => setReportResultado(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-emerald-800 dark:text-emerald-300">
            <div>
              Novos registros inseridos: <strong>{reportResultado.inseridos}</strong>
            </div>
            <div>
              Registros atualizados: <strong>{reportResultado.atualizados}</strong>
            </div>
            <div>
              Registros idênticos preservados: <strong>{reportResultado.preservados}</strong>
            </div>
          </div>
          {reportResultado.erros.length > 0 && (
            <div className="text-rose-700 dark:text-rose-300 text-[11px] pt-1">
              Erros encontrados: {reportResultado.erros.join('; ')}
            </div>
          )}
        </div>
      )}

      {/* Progress banner */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-blue-900 dark:text-blue-200">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>{progressMsg}</span>
        </div>
      )}

      {/* 2. Grid of Official Authentic Packages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            Pacotes Homologados Disponíveis para Carga ({pacotes.length})
          </h3>
          <span className="text-[11px] text-slate-400">Dados Comprovados das Fontes Primárias</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pacotes.map((pct) => {
            const itensJaPresentes = pct.requisitos.filter((r) =>
              requisitosExistentes.some((e) => e.numeroItem.trim().toUpperCase() === r.numeroItem.trim().toUpperCase())
            ).length;
            const todosJaImportados = itensJaPresentes === pct.totalItens;

            return (
              <div
                key={pct.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                      {pct.nome}
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {pct.totalItens} itens
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pct.descricao}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="block font-medium text-slate-400">Emissor Oficial:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{pct.emissor}</strong>
                    </div>
                    <div>
                      <span className="block font-medium text-slate-400">Revisão da Fonte:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{pct.edicaoRevisao}</strong>
                    </div>
                  </div>

                  {pct.observacaoIntegridade && (
                    <div className="text-[10px] bg-purple-50 dark:bg-purple-950/30 p-2 rounded text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40">
                      {pct.observacaoIntegridade}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {todosJaImportados ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        100% Presente ({itensJaPresentes}/{pct.totalItens})
                      </span>
                    ) : (
                      <span>
                        Presente na base: <strong>{itensJaPresentes}</strong> / {pct.totalItens}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenPreview(pct)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pré-visualizar & Carregar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. MODAL DE PRÉ-VISUALIZAÇÃO E CONFIRMAÇÃO HUMANA */}
      {selectedPacoteParaPreview && comparacaoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-500" />
                  Pré-Visualização Mandatória de Carga
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pacote: {selectedPacoteParaPreview.nome}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPacoteParaPreview(null);
                  setComparacaoPreview(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Novos a Inserir</span>
                  <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200">{comparacaoPreview.novos.length}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-medium">Já Preservados</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-200">{comparacaoPreview.identicosJaExistentes.length}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium">Com Atualização</span>
                  <span className="text-lg font-bold text-amber-900 dark:text-amber-200">{comparacaoPreview.atualizacoes.length}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block font-medium">Total do Pacote</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{comparacaoPreview.totalNoPacote}</span>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                  Modo de Importação Segura:
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={modoCarga === 'SOMENTE_NOVOS'}
                      onChange={() => setModoCarga('SOMENTE_NOVOS')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Inserir apenas novos registros ({comparacaoPreview.novos.length})</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={modoCarga === 'NOVOS_E_ATUALIZACOES'}
                      onChange={() => setModoCarga('NOVOS_E_ATUALIZACOES')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Inserir novos e atualizar complementos ({comparacaoPreview.novos.length + comparacaoPreview.atualizacoes.length})</span>
                  </label>
                </div>
              </div>

              {/* Sample list of items */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Amostra dos Itens do Pacote:
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {selectedPacoteParaPreview.requisitos.slice(0, 15).map((r, idx) => (
                    <div
                      key={`${r.id}-${idx}`}
                      className="p-2 rounded bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{r.numeroItem}</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate">{r.tituloCurto}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{r.categoria}</span>
                    </div>
                  ))}
                  {selectedPacoteParaPreview.requisitos.length > 15 && (
                    <div className="text-center text-[11px] text-slate-400 py-1">
                      ... mais {selectedPacoteParaPreview.requisitos.length - 15} itens autênticos neste pacote.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedPacoteParaPreview(null);
                  setComparacaoPreview(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCarga}
                disabled={isProcessing || isConsulta}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar & Executar Carga Segura</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
