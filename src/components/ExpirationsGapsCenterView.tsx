import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award,
  BookOpen,
  Calendar,
  Zap,
  CheckSquare,
  Eye,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  DocumentoEvidenciaPessoa,
  AtividadeCompetenciaRequerida,
  SugestaoIACompetencia,
  UserProfile,
  FaixaVencimentoItem,
  GapCompetenciaItem,
} from '../types';
import {
  consolidarCentralVencimentos,
  diagnosticarGapsOrganizacionais,
  verificarPodeExecutarAtividade,
  calcularDiasParaVencimento,
} from '../services/competenciesEngine';
import { saveAiCompetencySuggestion } from '../services/firebase/competenciesFirestore';

interface ExpirationsGapsCenterViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  persons: ColaboradorPessoa[];
  competencies: CompetenciaItem[];
  personCompetencies: CompetenciaColaborador[];
  qualifications: QualificacaoColaborador[];
  trainingRecords: RegistroTreinamentoColaborador[];
  documents: DocumentoEvidenciaPessoa[];
  activities: AtividadeCompetenciaRequerida[];
  aiSuggestions: SugestaoIACompetencia[];
  initialSubTab?: 'VENCIMENTOS' | 'GAPS' | 'SIMULADOR' | 'IA_SUGESTOES';
}

export const ExpirationsGapsCenterView: React.FC<ExpirationsGapsCenterViewProps> = ({
  organizationId,
  userProfile,
  persons = [],
  competencies = [],
  personCompetencies = [],
  qualifications = [],
  trainingRecords = [],
  documents = [],
  activities = [],
  aiSuggestions = [],
  initialSubTab = 'VENCIMENTOS',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'VENCIMENTOS' | 'GAPS' | 'SIMULADOR' | 'IA_SUGESTOES'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Filtros de Vencimento
  const [selectedFaixa, setSelectedFaixa] = useState<string>('TODAS');
  const [searchTermVenc, setSearchTermVenc] = useState('');
  const [filterBloqueiaApenas, setFilterBloqueiaApenas] = useState(false);

  // Filtros de Gaps
  const [selectedSetorGap, setSelectedSetorGap] = useState('TODOS');
  const [filterGapCriticoApenas, setFilterGapCriticoApenas] = useState(false);

  // Simulador
  const [simColaboradorId, setSimColaboradorId] = useState<string>(persons[0]?.id || '');
  const [simAtividadeId, setSimAtividadeId] = useState<string>(activities[0]?.id || '');

  // Consolidar Vencimentos via Engine
  const centralVencimentos = useMemo(() => {
    return consolidarCentralVencimentos(
      qualifications,
      trainingRecords,
      documents,
      personCompetencies
    );
  }, [qualifications, trainingRecords, documents, personCompetencies]);

  // Vencimentos filtrados
  const vencimentosFiltrados = useMemo(() => {
    return centralVencimentos.filter((item) => {
      const matchFaixa = selectedFaixa === 'TODAS' || item.faixa === selectedFaixa;
      const matchSearch =
        searchTermVenc === '' ||
        item.colaboradorNome.toLowerCase().includes(searchTermVenc.toLowerCase()) ||
        item.titulo.toLowerCase().includes(searchTermVenc.toLowerCase()) ||
        (item.setor && item.setor.toLowerCase().includes(searchTermVenc.toLowerCase()));
      const matchBloqueio = !filterBloqueiaApenas || item.bloqueiaOperacao;

      return matchFaixa && matchSearch && matchBloqueio;
    });
  }, [centralVencimentos, selectedFaixa, searchTermVenc, filterBloqueiaApenas]);

  // Contagem por faixa
  const contagemPorFaixa = useMemo(() => {
    const counts: Record<string, number> = {
      VENCIDOS: 0,
      VENCE_HOJE: 0,
      VENCE_7_DIAS: 0,
      VENCE_15_DIAS: 0,
      VENCE_30_DIAS: 0,
      VENCE_60_DIAS: 0,
      VENCE_90_DIAS: 0,
      FUTUROS: 0,
    };
    centralVencimentos.forEach((item) => {
      if (counts[item.faixa] !== undefined) {
        counts[item.faixa]++;
      }
    });
    return counts;
  }, [centralVencimentos]);

  // Diagnóstico de Gaps via Engine
  const gapsDiagnostico = useMemo(() => {
    return diagnosticarGapsOrganizacionais(
      persons,
      competencies,
      personCompetencies,
      qualifications,
      trainingRecords,
      activities,
      []
    );
  }, [persons, competencies, personCompetencies, qualifications, trainingRecords, activities]);

  // Gaps filtrados
  const gapsFiltrados = useMemo(() => {
    return gapsDiagnostico.filter((gap) => {
      const matchSetor = selectedSetorGap === 'TODOS' || gap.setor === selectedSetorGap;
      const matchCritico = !filterGapCriticoApenas || gap.criticidade === 'CRITICA';
      return matchSetor && matchCritico;
    });
  }, [gapsDiagnostico, selectedSetorGap, filterGapCriticoApenas]);

  // Simulação de atividade
  const resultadoSimulador = useMemo(() => {
    const colab = persons.find((p) => p.id === simColaboradorId);
    const atv = activities.find((a) => a.id === simAtividadeId);
    if (!colab || !atv) return null;

    return {
      colaborador: colab,
      atividade: atv,
      resultado: verificarPodeExecutarAtividade(
        colab,
        atv,
        personCompetencies,
        qualifications,
        trainingRecords
      ),
    };
  }, [simColaboradorId, simAtividadeId, persons, activities, personCompetencies, qualifications, trainingRecords]);

  // Handler para decisões humanas em sugestões de IA
  const handleDecisaoHumanaSugestao = async (
    sugestao: SugestaoIACompetencia,
    decisao: 'ACEITA' | 'REJEITADA'
  ) => {
    let justificativa = '';
    if (decisao === 'REJEITADA') {
      const mot = prompt('Por favor, informe a justificativa técnica para rejeitar esta sugestão da IA:');
      if (!mot) return;
      justificativa = mot;
    }

    const payload: SugestaoIACompetencia = {
      ...sugestao,
      decisaoHumana: decisao,
      observacoesDecisao: justificativa || undefined,
      usuarioAvaliadorEmail: userProfile?.email || userProfile?.displayName || 'sgq',
      dataAvaliacao: new Date().toISOString(),
    };

    try {
      await saveAiCompetencySuggestion(organizationId, payload, userProfile);
    } catch (err: any) {
      alert(`Erro ao registrar decisão: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
              SGQ Aeronáutico — Gestão de Riscos & Compliance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Central de Vencimentos, Gaps & Bloqueio Operacional</h1>
          <p className="text-sm text-slate-600">
            Monitoramento em faixas temporais regulamentares, diagnóstico de lacunas técnicas e liberação de atividades.
          </p>
        </div>
      </div>

      {/* Navegação Secundária */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('VENCIMENTOS')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'VENCIMENTOS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" /> Central de Vencimentos ({centralVencimentos.length})
        </button>
        <button
          onClick={() => setActiveSubTab('GAPS')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'GAPS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" /> Diagnóstico de Gaps ({gapsDiagnostico.length})
        </button>
        <button
          onClick={() => setActiveSubTab('SIMULADOR')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'SIMULADOR'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-600" /> Simulador de Bloqueio Operacional
        </button>
        <button
          onClick={() => setActiveSubTab('IA_SUGESTOES')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'IA_SUGESTOES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" /> Sugestões de IA & RNCs ({aiSuggestions.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: CENTRAL DE VENCIMENTOS EM FAIXAS TEMPORAIS                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'VENCIMENTOS' && (
        <div className="space-y-6">
          {/* Faixas Cards Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { id: 'TODAS', label: 'Todos', count: centralVencimentos.length, color: 'bg-slate-100 text-slate-700' },
              { id: 'VENCIDOS', label: 'Vencidos', count: contagemPorFaixa.VENCIDOS, color: 'bg-rose-100 text-rose-800 font-bold' },
              { id: 'VENCE_HOJE', label: 'Hoje', count: contagemPorFaixa.VENCE_HOJE, color: 'bg-rose-50 text-rose-700 font-bold' },
              { id: 'VENCE_7_DIAS', label: '7 Dias', count: contagemPorFaixa.VENCE_7_DIAS, color: 'bg-amber-100 text-amber-800' },
              { id: 'VENCE_15_DIAS', label: '15 Dias', count: contagemPorFaixa.VENCE_15_DIAS, color: 'bg-amber-50 text-amber-700' },
              { id: 'VENCE_30_DIAS', label: '30 Dias', count: contagemPorFaixa.VENCE_30_DIAS, color: 'bg-yellow-100 text-yellow-800' },
              { id: 'VENCE_60_DIAS', label: '60 Dias', count: contagemPorFaixa.VENCE_60_DIAS, color: 'bg-blue-50 text-blue-700' },
              { id: 'VENCE_90_DIAS', label: '90 Dias', count: contagemPorFaixa.VENCE_90_DIAS, color: 'bg-slate-50 text-slate-600' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFaixa(f.id)}
                className={`p-3 rounded-xl border text-center transition ${
                  selectedFaixa === f.id
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                } ${f.color}`}
              >
                <div className="text-lg font-extrabold">{f.count}</div>
                <div className="text-[11px] truncate uppercase tracking-wider">{f.label}</div>
              </button>
            ))}
          </div>

          {/* Filtros de Vencimentos */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, qualificação, treinamento ou setor..."
                value={searchTermVenc}
                onChange={(e) => setSearchTermVenc(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterBloqueiaApenas}
                onChange={(e) => setFilterBloqueiaApenas(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="font-semibold text-rose-800">Apenas Itens que Bloqueiam Operação</span>
            </label>
          </div>

          {/* Tabela de Vencimentos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Item / Título</th>
                    <th className="p-3">Colaborador / Setor</th>
                    <th className="p-3">Data Vencimento</th>
                    <th className="p-3 text-center">Dias Restantes</th>
                    <th className="p-3 text-center">Bloqueio Operacional</th>
                    <th className="p-3 text-center">Faixa SGQ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {vencimentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                        Nenhum vencimento localizado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    vencimentosFiltrados.map((item) => {
                      const isVencido = item.diasRestantes < 0;
                      const isCritico = item.diasRestantes <= 7;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition ${
                            isVencido ? 'bg-rose-50/40' : isCritico ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="p-3 font-mono text-[11px] font-semibold text-slate-600">
                            {item.tipo}
                          </td>
                          <td className="p-3 font-medium text-slate-900">
                            <div>{item.titulo}</div>
                            {item.detalhes && (
                              <div className="text-[11px] text-slate-500">{item.detalhes}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">
                            <div className="font-semibold">{item.colaboradorNome}</div>
                            <div className="text-[11px] text-slate-500">{item.setor}</div>
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-800">
                            {item.dataVencimento}
                          </td>
                          <td className="p-3 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                isVencido
                                  ? 'bg-rose-100 text-rose-800'
                                  : isCritico
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-slate-700'
                              }`}
                            >
                              {item.diasRestantes < 0
                                ? `Vencido há ${Math.abs(item.diasRestantes)}d`
                                : item.diasRestantes === 0
                                ? 'Vence Hoje'
                                : `${item.diasRestantes} dias`}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {item.bloqueiaOperacaoSeVencido ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full text-[11px]">
                                <AlertTriangle className="w-3 h-3" /> SIM (Mandatório)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Apenas Alerta</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-semibold text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.faixa}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: DIAGNÓSTICO DE GAPS OPERACIONAIS                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'GAPS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Diagnóstico Preventivo de Gaps de Competências</h2>
              <p className="text-xs text-slate-600">
                Detecção determinística de lacunas técnicas que impedem ou colocam em risco atividades da organização.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterGapCriticoApenas}
                  onChange={(e) => setFilterGapCriticoApenas(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold text-rose-800">Apenas Gaps Críticos</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gapsFiltrados.length === 0 ? (
              <div className="col-span-full bg-emerald-50 border border-emerald-200 p-8 rounded-xl text-center text-emerald-800">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                <p className="font-bold text-base">Nenhum Gap Crítico Detectado!</p>
                <p className="text-xs mt-1">Todos os colaboradores ativos atendem aos requisitos das atividades mapeadas.</p>
              </div>
            ) : (
              gapsFiltrados.map((gap) => (
                <div
                  key={gap.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {gap.tipoGap}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            gap.criticidade === 'CRITICA'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {gap.criticidade}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{gap.colaboradorNome}</h3>
                      <p className="text-xs text-slate-500">{gap.setor}</p>
                    </div>

                    {gap.bloqueiaOperacao && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Bloqueio Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {gap.descricaoGap}
                  </p>

                  <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                    <p className="text-slate-600">
                      <strong>Impacto na Atividade:</strong> {gap.atividadeNome}
                    </p>
                    {gap.treinamentoRecomendadoTitulo && (
                      <p className="text-blue-700 font-semibold flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Ação Recomendada: {gap.treinamentoRecomendadoTitulo}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: SIMULADOR DE BLOQUEIO OPERACIONAL                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'SIMULADOR' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Simulador de Conformidade: Pode Executar a Atividade?
            </h2>
            <p className="text-sm text-slate-600">
              Teste interativo em tempo real para verificar se um colaborador possui todas as competências, treinamentos vigentes e CHTs exigidos para uma ordem de serviço.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="font-semibold text-xs text-slate-700 block mb-1">
                Selecione o Colaborador
              </label>
              <select
                value={simColaboradorId}
                onChange={(e) => setSimColaboradorId(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              >
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.matricula}) — {p.funcao} • {p.setor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-xs text-slate-700 block mb-1">
                Selecione a Atividade Operacional
              </label>
              <select
                value={simAtividadeId}
                onChange={(e) => setSimAtividadeId(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigoAtividade} — {a.nomeAtividade} ({a.setorResponsavel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resultado da Simulação */}
          {resultadoSimulador && (
            <div
              className={`p-6 rounded-2xl border space-y-4 ${
                resultadoSimulador.resultado.podeExecutar
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-rose-50/70 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {resultadoSimulador.resultado.podeExecutar ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                    <XCircle className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <h3
                    className={`text-lg font-extrabold ${
                      resultadoSimulador.resultado.podeExecutar
                        ? 'text-emerald-900'
                        : 'text-rose-900'
                    }`}
                  >
                    {resultadoSimulador.resultado.podeExecutar
                      ? 'EXECUÇÃO AUTORIZADA — CONFORMIDADE COMPLETA'
                      : 'BLOQUEIO OPERACIONAL — EXECUÇÃO NÃO PERMITIDA'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Atividade: <strong>{resultadoSimulador.atividade.nomeAtividade}</strong> • Colaborador:{' '}
                    <strong>{resultadoSimulador.colaborador.nome}</strong>
                  </p>
                </div>
              </div>

              {resultadoSimulador.resultado.motivosBloqueio.length > 0 && (
                <div className="bg-white/80 border border-rose-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Motivos Determinantes do Bloqueio:
                  </h4>
                  <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
                    {resultadoSimulador.resultado.motivosBloqueio.map((m, idx) => (
                      <li key={idx} className="font-medium">
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resultadoSimulador.resultado.alertasNaoImpeditivos.length > 0 && (
                <div className="bg-white/80 border border-amber-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> Alertas Não Impeditivos:
                  </h4>
                  <ul className="list-disc list-inside text-xs text-amber-800 space-y-1">
                    {resultadoSimulador.resultado.alertasNaoImpeditivos.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white/60 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                <h4 className="font-bold text-slate-800">Requisitos Regulamentares da Atividade:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <strong className="block text-slate-500 text-[11px]">Nível Mínimo Exigido:</strong>
                    <span>Nível {resultadoSimulador.atividade.nivelMinimoRequerido} de 5</span>
                  </div>
                  <div>
                    <strong className="block text-slate-500 text-[11px]">Qualificação Obrigatória:</strong>
                    <span>{resultadoSimulador.atividade.qualificacaoObrigatoria || 'Nenhuma'}</span>
                  </div>
                  <div>
                    <strong className="block text-slate-500 text-[11px]">Autorização RTS/RII:</strong>
                    <span>
                      {resultadoSimulador.atividade.exigeAutorizacaoRTS ? 'Exige RTS' : ''}{' '}
                      {resultadoSimulador.atividade.exigeAutorizacaoRII ? 'Exige RII' : ''}
                      {!resultadoSimulador.atividade.exigeAutorizacaoRTS &&
                      !resultadoSimulador.atividade.exigeAutorizacaoRII
                        ? 'Não requer'
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: SUGESTÕES DE IA COM AVALIAÇÃO HUMANA                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'IA_SUGESTOES' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900 space-y-1">
              <p className="font-bold text-sm">Governança de IA com Avaliação Humana Obrigatória</p>
              <p>
                As hipóteses de correlação entre não conformidades (RNCs), auditorias externas e necessidades de capacitação são sugestões.
                Nenhuma alteração em perfil ou matrícula é feita sem validação expressa do Gestor SGQ.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {aiSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                        {sug.origemTipo} ({sug.origemNumero})
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          sug.confianca === 'ALTA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Confiança: {sug.confianca}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{sug.titulo}</h3>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      sug.decisaoHumana === 'ACEITA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sug.decisaoHumana === 'REJEITADA'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sug.decisaoHumana}
                  </span>
                </div>

                <div className="text-xs space-y-2 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p>
                    <strong className="text-slate-900">Hipótese Identificada:</strong> {sug.hipotese}
                  </p>
                  <p>
                    <strong className="text-slate-900">Justificativa Causal:</strong> {sug.justificativa}
                  </p>
                  {sug.treinamentoSugeridoTitulo && (
                    <p className="text-blue-700 font-semibold">
                      Treinamento Sugerido: {sug.treinamentoSugeridoTitulo}
                    </p>
                  )}
                  {sug.colaboradorSugeridoNome && (
                    <p className="text-slate-600">
                      Colaborador Vinculado: {sug.colaboradorSugeridoNome}
                    </p>
                  )}
                </div>

                {sug.decisaoHumana === 'PENDENTE' ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleDecisaoHumanaSugestao(sug, 'REJEITADA')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Rejeitar Sugestão
                    </button>
                    <button
                      onClick={() => handleDecisaoHumanaSugestao(sug, 'ACEITA')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Aceitar & Encaminhar ao Plano SGQ
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      Avaliado por: <strong>{sug.validadoPorNome}</strong> em {sug.validadoEm}
                    </span>
                    {sug.justificativaHumana && (
                      <span className="italic text-slate-600">
                        Motivo: "{sug.justificativaHumana}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
