import React, { useMemo } from 'react';
import {
  Shield,
  FileCheck2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  Building2,
  BarChart3,
  TrendingUp,
  Award,
  BookOpen
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria
} from '../types';
import { calcularMetricasAuditoria } from '../utils/auditIntelligence';

interface AuditsDashboardViewProps {
  audits: AuditoriaExternaRecord[];
  findings: ConstatacaoExternaRecord[];
  lessons: LicaoAprendidaAuditoria[];
  onBackToAudits: () => void;
  onNavigateToFindings: () => void;
  onNavigateToLessons: () => void;
}

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

export const AuditsDashboardView: React.FC<AuditsDashboardViewProps> = ({
  audits,
  findings,
  lessons,
  onBackToAudits,
  onNavigateToFindings,
  onNavigateToLessons,
}) => {
  const metricas = useMemo(() => {
    return calcularMetricasAuditoria(audits, findings);
  }, [audits, findings]);

  // Dados para Gráficos
  const dadosPorTipo = useMemo(() => {
    return Object.entries(metricas.auditoriasPorTipo).map(([name, value]) => ({
      name,
      value,
    }));
  }, [metricas]);

  const dadosPorClassificacao = useMemo(() => {
    return [
      { name: 'Maiores', value: metricas.constatacoesPorClassificacao.MAIOR, color: '#ef4444' },
      { name: 'Menores', value: metricas.constatacoesPorClassificacao.MENOR, color: '#f59e0b' },
      { name: 'Observações', value: metricas.constatacoesPorClassificacao.OBSERVACAO, color: '#3b82f6' },
      { name: 'Oportunidades', value: metricas.constatacoesPorClassificacao.OPORTUNIDADE_MELHORIA, color: '#10b981' },
    ].filter((item) => item.value > 0);
  }, [metricas]);

  const dadosPorSetor = useMemo(() => {
    return Object.entries(metricas.constatacoesPorSetor).map(([name, count]) => ({
      name,
      count,
    }));
  }, [metricas]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToAudits}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Voltar para Auditorias"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <BarChart3 className="w-4 h-4" />
                <span>Indicadores de Desempenho SGQ • Fase 8</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Dashboard de Auditorias Externas & Autoridades
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Visão executiva e analítica de conformidade perante ANAC, EASA, FAA, Clientes e Entidades Certificadoras.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToFindings}
              className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
            >
              Ver Todas as Constatações
            </button>
            <button
              onClick={onNavigateToLessons}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              Lições Aprendidas ({lessons.length})
            </button>
          </div>
        </div>

        {/* Indicadores Principais em Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total de Auditorias</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{metricas.totalAuditorias}</div>
            <span className="text-[11px] text-slate-500">{metricas.auditoriasEncerradas} encerradas</span>
          </div>

          <div className="bg-blue-50/60 rounded-lg p-3.5 border border-blue-200">
            <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Total de Findings</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{metricas.totalConstatacoes}</div>
            <span className="text-[11px] text-blue-700">{metricas.constatacoesAbertas} em tratativa ativa</span>
          </div>

          <div className="bg-emerald-50/60 rounded-lg p-3.5 border border-emerald-200">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Aceitação em 1ª Submissão</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              {metricas.taxaAceitacaoPrimeiraSubmissao !== null ? `${metricas.taxaAceitacaoPrimeiraSubmissao}%` : 'S/ Dados'}
            </div>
            <span className="text-[11px] text-emerald-700">Qualidade das respostas</span>
          </div>

          <div className="bg-amber-50/60 rounded-lg p-3.5 border border-amber-200">
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">Tempo Médio de Resposta</span>
            <div className="text-2xl font-bold text-amber-900 mt-1">
              {metricas.tempoMedioRespostaDias !== null ? `${metricas.tempoMedioRespostaDias} dias` : 'S/ Dados'}
            </div>
            <span className="text-[11px] text-amber-700">Agilidade organizacional</span>
          </div>

          <div className="bg-purple-50/60 rounded-lg p-3.5 border border-purple-200">
            <span className="text-xs font-medium text-purple-800 uppercase tracking-wide">Lições Aprendidas</span>
            <div className="text-2xl font-bold text-purple-900 mt-1">{lessons.length}</div>
            <span className="text-[11px] text-purple-700">Conhecimento gerado</span>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Auditorias por Órgão / Tipo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Distribuição por Autoridade / Tipo de Auditoria
            </h3>
            <span className="text-xs text-slate-500 font-medium">Controle de Origem</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPorTipo} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name="Auditorias" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Constatações por Classificação */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Constatações por Severidade / Classificação
            </h3>
            <span className="text-xs text-slate-500 font-medium">Perfil de Gravidade</span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {dadosPorClassificacao.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma constatação cadastrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPorClassificacao}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    fontSize={11}
                  >
                    {dadosPorClassificacao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 3: Constatações por Setor */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Concentração de Constatações por Setor / Oficina
            </h3>
            <span className="text-xs text-slate-500 font-medium">Foco para Ações Preventivas</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosPorSetor} margin={{ top: 10, right: 20, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Constatações" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Painel de Prazos de Resposta */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Monitoramento Tempestivo de Prazos perante Autoridades</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-emerald-800 font-bold block">No Prazo / Conformes</span>
              <span className="text-emerald-700 text-[11px]">Respostas dentro da data limite</span>
            </div>
            <span className="text-xl font-bold text-emerald-900">{metricas.constatacoesNoPrazo}</span>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-amber-800 font-bold block">Vencendo em até 15 dias</span>
              <span className="text-amber-700 text-[11px]">Atenção imediata requerida</span>
            </div>
            <span className="text-xl font-bold text-amber-900">{metricas.constatacoesVencendoEm15Dias}</span>
          </div>

          <div className="p-3.5 bg-red-50 rounded-lg border border-red-200 flex items-center justify-between">
            <div>
              <span className="text-red-800 font-bold block">Vencidas sem Resposta</span>
              <span className="text-red-700 text-[11px]">Risco de sanção regulatória</span>
            </div>
            <span className="text-xl font-bold text-red-900">{metricas.constatacoesVencidas}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
