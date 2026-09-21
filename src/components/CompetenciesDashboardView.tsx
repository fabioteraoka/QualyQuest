import React, { useMemo } from 'react';
import {
  BarChart3,
  Users,
  GraduationCap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Download,
  Printer,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  DocumentoEvidenciaPessoa,
  AtividadeCompetenciaRequerida,
  FaixaVencimentoItem,
} from '../types';
import {
  calcularMetricasDashboardCompetencias,
  consolidarCentralVencimentos,
  diagnosticarGapsOrganizacionais,
} from '../services/competenciesEngine';

interface CompetenciesDashboardViewProps {
  organizationId: string;
  persons: ColaboradorPessoa[];
  competencies: CompetenciaItem[];
  personCompetencies: CompetenciaColaborador[];
  qualifications: QualificacaoColaborador[];
  trainingRecords: RegistroTreinamentoColaborador[];
  documents: DocumentoEvidenciaPessoa[];
  activities: AtividadeCompetenciaRequerida[];
  onNavigateToPersons?: () => void;
  onNavigateToPersonsWithStatus?: (status: string) => void;
  onNavigateToTrainings?: () => void;
  onNavigateToExpirations?: () => void;
}

export const CompetenciesDashboardView: React.FC<CompetenciesDashboardViewProps> = ({
  organizationId,
  persons = [],
  competencies = [],
  personCompetencies = [],
  qualifications = [],
  trainingRecords = [],
  documents = [],
  activities = [],
  onNavigateToPersons,
  onNavigateToPersonsWithStatus,
  onNavigateToTrainings,
  onNavigateToExpirations,
}) => {
  // Gaps detectados
  const gaps = useMemo(() => {
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

  // Cálculo de Métricas Executivas
  const metricas = useMemo(() => {
    return calcularMetricasDashboardCompetencias(
      persons,
      personCompetencies,
      qualifications,
      trainingRecords,
      documents,
      gaps,
      competencies
    );
  }, [persons, personCompetencies, qualifications, trainingRecords, documents, gaps, competencies]);

  // Vencimentos consolidados
  const vencimentos = useMemo(() => {
    return consolidarCentralVencimentos(
      qualifications,
      trainingRecords,
      documents,
      personCompetencies
    );
  }, [qualifications, trainingRecords, documents, personCompetencies]);

  // Vencimentos críticos (Vencidos ou até 7 dias)
  const vencimentosCriticos = useMemo(() => {
    return vencimentos.filter(
      (v) => v.faixa === 'VENCIDO' || v.faixa === 'HOJE' || v.faixa === '7_DIAS'
    );
  }, [vencimentos]);

  // Exportação CSV de Relatório de Pessoas e Vencimentos
  const exportarRelatorioCSV = () => {
    const headers = [
      'Colaborador',
      'Matricula',
      'Setor',
      'Tipo Item',
      'Titulo',
      'Data Validade',
      'Dias Restantes',
      'Bloqueio Operacional',
      'Faixa',
    ];

    const rows = vencimentos.map((v) => [
      `"${v.colaboradorNome}"`,
      `"${v.colaboradorMatricula || ''}"`,
      `"${v.setor || ''}"`,
      `"${v.tipoItem}"`,
      `"${v.titulo}"`,
      `"${v.dataValidade}"`,
      v.diasParaVencer,
      v.bloqueiaOperacao ? 'SIM' : 'NAO',
      `"${v.faixa}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_qualigest_competencias_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 uppercase tracking-wider">
              Painel Gerencial Executivo
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Dashboard de Pessoas, Competências & Habilitações</h1>
          <p className="text-sm text-slate-600">
            Visão consolidada de prontidão operacional, conformidade regulamentar e prevenção de bloqueios técnicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportarRelatorioCSV}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Relatório CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </button>
        </div>
      </div>

      {/* KPI Cards Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: % Colaboradores Qualificados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Prontidão Operacional
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {metricas.taxaColaboradoresQualificados}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Colaboradores sem bloqueio ativo
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: % Treinamentos em Dia */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Treinamentos em Dia
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {metricas.taxaTreinamentosEmDia}%
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Conformidade com a grade regulamentar
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Gaps Operacionais Críticos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gaps Críticos Detectados
            </span>
            <div className="text-3xl font-extrabold text-rose-600 mt-1">
              {metricas.gapsCriticosComBloqueio}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Exigem treinamento ou qualificação
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Total de Colaboradores Ativos e Status Operacional */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Efetivo Ativo
              </span>
              {onNavigateToPersonsWithStatus && (
                <button
                  onClick={() => onNavigateToPersonsWithStatus('ATIVO')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline transition"
                  title="Clique para ver quem está ativo atualmente"
                >
                  Ver Ativos →
                </button>
              )}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {metricas.colaboradoresAtivos}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
              {Boolean(metricas.colaboradoresEmTreinamento && metricas.colaboradoresEmTreinamento > 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateToPersonsWithStatus && onNavigateToPersonsWithStatus('EM_TREINAMENTO')}
                  className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px] hover:bg-sky-200 transition"
                  title="Filtrar colaboradores em treinamento"
                >
                  {metricas.colaboradoresEmTreinamento} em treinamento
                </button>
              )}
              {Boolean(metricas.colaboradoresSuspensos && metricas.colaboradoresSuspensos > 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateToPersonsWithStatus && onNavigateToPersonsWithStatus('SUSPENSO')}
                  className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] hover:bg-rose-200 transition"
                  title="Filtrar colaboradores suspensos"
                >
                  {metricas.colaboradoresSuspensos} suspenso{metricas.colaboradoresSuspensos! > 1 ? 's' : ''}
                </button>
              )}
              {Boolean(metricas.colaboradoresRestritos && metricas.colaboradoresRestritos > 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateToPersonsWithStatus && onNavigateToPersonsWithStatus('RESTRITO')}
                  className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] hover:bg-amber-200 transition"
                  title="Filtrar colaboradores restritos"
                >
                  {metricas.colaboradoresRestritos} restrito{metricas.colaboradoresRestritos! > 1 ? 's' : ''}
                </button>
              )}
              {Boolean(metricas.colaboradoresAfastados && metricas.colaboradoresAfastados > 0) && (
                <button
                  type="button"
                  onClick={() => onNavigateToPersonsWithStatus && onNavigateToPersonsWithStatus('AFASTADO')}
                  className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px] hover:bg-purple-200 transition"
                  title="Filtrar colaboradores afastados"
                >
                  {metricas.colaboradoresAfastados} afastado{metricas.colaboradoresAfastados! > 1 ? 's' : ''}
                </button>
              )}
              {!metricas.colaboradoresSuspensos && !metricas.colaboradoresRestritos && !metricas.colaboradoresAfastados && !metricas.colaboradoresEmTreinamento && (
                <span className="text-slate-500">
                  {metricas.colaboradoresComRestricao > 0
                    ? `${metricas.colaboradoresComRestricao} com restrição ativa`
                    : '100% disponíveis sem restrições'}
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 ml-3">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* VISÃO EXECUTIVA DE EFETIVO POR STATUS OPERACIONAL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Visão Executiva de Efetivo
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Distribuição oficial de colaboradores por status operacional com acesso direto à lista filtrada.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            Total Cadastrado: <strong className="text-slate-900">{metricas.totalColaboradores} colaboradores</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-4">Status Operacional</th>
                <th className="py-2.5 px-4 text-center">Quantidade</th>
                <th className="py-2.5 px-4 text-center">% do Efetivo</th>
                <th className="py-2.5 px-4 text-right">Ação Direta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {/* Linha Ativos */}
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span>Ativos (Disponíveis para Escala / Execução)</span>
                </td>
                <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                  {metricas.colaboradoresAtivos}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                  {metricas.totalColaboradores > 0
                    ? `${Math.round((metricas.colaboradoresAtivos / metricas.totalColaboradores) * 100)}%`
                    : '0%'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('ATIVO') : onNavigateToPersons && onNavigateToPersons()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition"
                  >
                    Ver Ativos ({metricas.colaboradoresAtivos}) →
                  </button>
                </td>
              </tr>

              {/* Linha Em Treinamento */}
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                  <span>Em Treinamento (Capacitação / Onboarding)</span>
                </td>
                <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                  {metricas.colaboradoresEmTreinamento || 0}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                  {metricas.totalColaboradores > 0
                    ? `${Math.round(((metricas.colaboradoresEmTreinamento || 0) / metricas.totalColaboradores) * 100)}%`
                    : '0%'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('EM_TREINAMENTO') : onNavigateToPersons && onNavigateToPersons()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1 rounded-lg border border-sky-200 transition"
                  >
                    Ver Lista ({metricas.colaboradoresEmTreinamento || 0}) →
                  </button>
                </td>
              </tr>

              {/* Linha Restritos */}
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Restritos (Atividades Limitadas)</span>
                </td>
                <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                  {metricas.colaboradoresRestritos || 0}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                  {metricas.totalColaboradores > 0
                    ? `${Math.round(((metricas.colaboradoresRestritos || 0) / metricas.totalColaboradores) * 100)}%`
                    : '0%'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('RESTRITO') : onNavigateToPersons && onNavigateToPersons()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg border border-amber-200 transition"
                  >
                    Ver Lista ({metricas.colaboradoresRestritos || 0}) →
                  </button>
                </td>
              </tr>

              {/* Linha Suspensos */}
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                  <span>Suspensos (Medida Cautelar / Averiguação)</span>
                </td>
                <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                  {metricas.colaboradoresSuspensos || 0}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                  {metricas.totalColaboradores > 0
                    ? `${Math.round(((metricas.colaboradoresSuspensos || 0) / metricas.totalColaboradores) * 100)}%`
                    : '0%'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('SUSPENSO') : onNavigateToPersons && onNavigateToPersons()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-200 transition"
                  >
                    Ver Lista ({metricas.colaboradoresSuspensos || 0}) →
                  </button>
                </td>
              </tr>

              {/* Linha Afastados */}
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  <span>Afastados (Licença Médica / Atestado)</span>
                </td>
                <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                  {metricas.colaboradoresAfastados || 0}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                  {metricas.totalColaboradores > 0
                    ? `${Math.round(((metricas.colaboradoresAfastados || 0) / metricas.totalColaboradores) * 100)}%`
                    : '0%'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('AFASTADO') : onNavigateToPersons && onNavigateToPersons()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 transition"
                  >
                    Ver Lista ({metricas.colaboradoresAfastados || 0}) →
                  </button>
                </td>
              </tr>

              {/* Linha Desligados */}
              <tr className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  <span>Desligados (Inativos / Histórico)</span>
                </td>
                <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                  {metricas.colaboradoresDesligados || 0}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                  {metricas.totalColaboradores > 0
                    ? `${Math.round(((metricas.colaboradoresDesligados || 0) / metricas.totalColaboradores) * 100)}%`
                    : '0%'}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('DESLIGADO') : onNavigateToPersons && onNavigateToPersons()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg border border-slate-300 transition"
                  >
                    Ver Lista ({metricas.colaboradoresDesligados || 0}) →
                  </button>
                </td>
              </tr>

              {/* Linha Outros */}
              {(metricas.colaboradoresOutros || 0) > 0 && (
                <tr className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-4 flex items-center gap-2 font-semibold text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span>Outros (Status Personalizado)</span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-extrabold text-slate-900 text-base">
                    {metricas.colaboradoresOutros}
                  </td>
                  <td className="py-2.5 px-4 text-center text-xs text-slate-600 font-medium">
                    {metricas.totalColaboradores > 0
                      ? `${Math.round(((metricas.colaboradoresOutros || 0) / metricas.totalColaboradores) * 100)}%`
                      : '0%'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => onNavigateToPersonsWithStatus ? onNavigateToPersonsWithStatus('OUTRO') : onNavigateToPersons && onNavigateToPersons()}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition"
                    >
                      Ver Lista ({metricas.colaboradoresOutros}) →
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid de Seções de Análise */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Alerta: Vencimentos Críticos Imediatos */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">
                Itens Vencidos ou Próximos do Vencimento (≤ 7 dias)
              </h2>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {vencimentosCriticos.length} críticos
            </span>
          </div>

          {vencimentosCriticos.length === 0 ? (
            <div className="p-8 text-center text-emerald-800 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-emerald-600" />
              <p className="font-bold text-sm">Nenhum vencimento crítico nos próximos 7 dias!</p>
              <p className="text-xs text-emerald-700">Todas as CHTs e treinamentos operacionais estão regulares.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {vencimentosCriticos.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.titulo}</span>
                      <span className="font-mono text-[10px] bg-white border border-rose-200 text-rose-700 px-1 py-0.2 rounded font-semibold">
                        {item.tipoItem}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      {item.colaboradorNome} • {item.setor}
                    </p>
                    <p className="font-semibold text-rose-800">
                      Vencimento: {item.dataValidade} (
                      {item.diasParaVencer < 0
                        ? `Vencido há ${Math.abs(item.diasParaVencer)} dias`
                        : item.diasParaVencer === 0
                        ? 'Vence Hoje'
                        : `Vence em ${item.diasParaVencer} dias`}
                      )
                    </p>
                  </div>

                  {item.bloqueiaOperacao && (
                    <span className="shrink-0 px-2 py-1 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Bloqueio
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distribuição de Conformidade por Setor */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Distribuição e Conformidade por Setor
            </h2>
            <span className="text-xs text-slate-500 font-medium">SGQ Aeronáutico</span>
          </div>

          <div className="space-y-4">
            {Object.keys(metricas?.distribuicaoPorSetor || {}).length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl">
                SEM DADOS SUFICIENTES
              </div>
            ) : (
              Object.entries(
                (metricas?.distribuicaoPorSetor || {}) as Record<
                  string,
                  { totalPessoas: number; qualificados: number; gaps: number; vencidos: number; taxaConformidade: number }
                >
              ).map(([nomeSetor, dados]) => (
                <div key={nomeSetor} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{nomeSetor}</span>
                    <span className="font-mono text-slate-600">
                      {dados.totalPessoas} colaboradores ({dados.qualificados} qualificados)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${dados.taxaConformidade}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Taxa de Conformidade: {dados.taxaConformidade}%</span>
                    {dados.gaps > 0 && (
                      <span className="text-rose-600 font-medium">
                        {dados.gaps} gaps detectados
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resumo da Central de Vencimentos em Faixas */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Faixas Temporais Regulamentares de Vencimentos
              </h2>
              <p className="text-xs text-slate-600">
                Classificação padronizada para planejamento de reciclagens e renovações de licenças ANAC.
              </p>
            </div>
            {onNavigateToExpirations && (
              <button
                onClick={onNavigateToExpirations}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Ver Central Completa →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <div className="text-2xl font-black text-rose-700">
                {metricas.vencidosTotal}
              </div>
              <div className="font-bold text-rose-900 mt-1 uppercase tracking-wider text-[11px]">
                Vencidos
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
              <div className="text-2xl font-black text-rose-600">
                {metricas.vencendoHoje}
              </div>
              <div className="font-bold text-rose-800 mt-1 uppercase tracking-wider text-[11px]">
                Vence Hoje
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-2xl font-black text-amber-700">
                {metricas.vencendo7Dias}
              </div>
              <div className="font-bold text-amber-900 mt-1 uppercase tracking-wider text-[11px]">
                Até 7 Dias
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <div className="text-2xl font-black text-amber-600">
                {metricas.vencendo15Dias}
              </div>
              <div className="font-bold text-amber-800 mt-1 uppercase tracking-wider text-[11px]">
                Até 15 Dias
              </div>
            </div>

            <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <div className="text-2xl font-black text-yellow-700">
                {metricas.vencendo30Dias}
              </div>
              <div className="font-bold text-yellow-900 mt-1 uppercase tracking-wider text-[11px]">
                Até 30 Dias
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-2xl font-black text-blue-700">
                {metricas.vencendo60Dias}
              </div>
              <div className="font-bold text-blue-900 mt-1 uppercase tracking-wider text-[11px]">
                Até 60 Dias
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-black text-slate-700">
                {metricas.vencendo90Dias}
              </div>
              <div className="font-bold text-slate-800 mt-1 uppercase tracking-wider text-[11px]">
                Até 90 Dias
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
