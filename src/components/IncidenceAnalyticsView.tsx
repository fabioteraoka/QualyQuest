import React, { useMemo } from 'react';
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
  Cell,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Repeat, 
  Flame, 
  PieChart as PieIcon 
} from 'lucide-react';
import { NCRecord } from '../types';
import { obterCorRisco } from '../utils/qualityHelpers';

interface IncidenceAnalyticsViewProps {
  records: NCRecord[];
  onSelectCategory?: (cat: string) => void;
}

export const IncidenceAnalyticsView: React.FC<IncidenceAnalyticsViewProps> = ({
  records = [],
}) => {
  const safeRecords = records || [];
  // 1. Pareto of Categories / Incidences
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    safeRecords.forEach((r) => {
      const cat = r.categoria || 'Outras';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const total = sorted.reduce((acc, curr) => acc + curr.count, 0);
    let cumulative = 0;

    return sorted.map((item) => {
      cumulative += item.count;
      return {
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
        cumulativePercentage: total > 0 ? Math.round((cumulative / total) * 100) : 0,
      };
    });
  }, [safeRecords]);

  // 2. Breakdown by Sector / Base (Incidências por Base)
  const sectorData = useMemo(() => {
    const counts: Record<string, { total: number; criticas: number }> = {};
    safeRecords.forEach((r) => {
      const sec = r.setor || 'Geral';
      if (!counts[sec]) {
        counts[sec] = { total: 0, criticas: 0 };
      }
      counts[sec].total += 1;
      if (r.avaliacaoRiscoInicial?.nivel === 'Crítico' || r.avaliacaoRiscoInicial?.nivel === 'Alto') {
        counts[sec].criticas += 1;
      }
    });

    return Object.entries(counts).map(([name, val]) => ({
      name,
      total: val.total,
      criticas: val.criticas,
    }));
  }, [safeRecords]);

  // 3. Risk Matrix Distribution (Initial vs Residual)
  const riskDistribution = useMemo(() => {
    const initial = { Crítico: 0, Alto: 0, Médio: 0, Baixo: 0 };
    const residual = { Crítico: 0, Alto: 0, Médio: 0, Baixo: 0 };

    safeRecords.forEach((r) => {
      const nivelInit = r.avaliacaoRiscoInicial?.nivel || 'Médio';
      initial[nivelInit] = (initial[nivelInit] || 0) + 1;

      if (r.verificacaoEficacia?.avaliacaoRiscoResidual?.nivel) {
        const nivelRes = r.verificacaoEficacia.avaliacaoRiscoResidual.nivel;
        residual[nivelRes] = (residual[nivelRes] || 0) + 1;
      }
    });

    return [
      { name: 'Crítico', Inicial: initial.Crítico, Residual: residual.Crítico },
      { name: 'Alto', Inicial: initial.Alto, Residual: residual.Alto },
      { name: 'Médio', Inicial: initial.Médio, Residual: residual.Médio },
      { name: 'Baixo', Inicial: initial.Baixo, Residual: residual.Baixo },
    ];
  }, [records]);

  // 4. Status Pie Distribution
  const statusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      counts[r.statusGeral] = (counts[r.statusGeral] || 0) + 1;
    });

    const COLORS: Record<string, string> = {
      Aberta: '#64748b',
      'Em Contenção': '#f59e0b',
      'Em Análise de Causa': '#a855f7',
      'Ação em Andamento': '#3b82f6',
      'Aguardando Eficácia': '#6366f1',
      Encerrada: '#10b981',
      Reaberta: '#ea580c',
      Atrasada: '#e11d48',
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name] || '#94a3b8',
    }));
  }, [records]);

  // Recurring Incidences Finder
  const topRecurring = useMemo(() => {
    return categoryData.slice(0, 3);
  }, [categoryData]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Indicadores & Análise Causa-Efeito</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Monitoramento de Incidências & Reincidências (SGQ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Análise de Pareto 80/20, vulnerabilidades por setor/base e mitigação de risco após ações corretivas.
          </p>
        </div>

        {/* Highlight badge */}
        <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl flex items-center space-x-3 shrink-0">
          <Repeat className="w-5 h-5 text-indigo-600" />
          <div className="text-xs">
            <span className="font-bold text-indigo-900 block">Maior Reincidência:</span>
            <span className="text-indigo-700 font-semibold">{topRecurring[0]?.name || 'Nenhuma'} ({topRecurring[0]?.count || 0} ocorrências)</span>
          </div>
        </div>
      </div>

      {/* Row 1: Pareto Chart & Recurring Notice in Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pareto Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center space-x-2">
                <span>Diagrama de Pareto: Incidências por Categoria</span>
              </h3>
              <p className="text-xs text-slate-500">
                Frequência de não conformidades e percentual acumulado (Princípio de Pareto 80/20).
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Ocorrências', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: any, name: any) => [name === 'cumulativePercentage' ? `${value}%` : value, name === 'cumulativePercentage' ? 'Acumulado' : 'Quantidade']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="count" name="Qtd. Ocorrências" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" name="% Acumulado (Pareto)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 3 Reincidências Focus Box */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center space-x-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Gargalos Críticos</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Categorias prioritárias para auditoria interna de processo e revisão normativa:
            </p>

            <div className="space-y-3">
              {categoryData.slice(0, 4).map((cat, idx) => (
                <div key={cat.name} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {cat.name}
                    </span>
                    <span className="text-indigo-700 font-extrabold">{cat.count} NCs ({cat.percentage}%)</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-900">
            <strong>Recomendação SGQ:</strong> Concentrar esforços de treinamento e auditoria nas duas primeiras causas resolverá mais de 60% das não conformidades recorrentes.
          </div>
        </div>
      </div>

      {/* Row 2: Sector Distribution & Risk Reduction (Initial vs Residual) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Setor Breakdown */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-base text-slate-800 mb-1">
              Distribuição por Setor / Base
            </h3>
            <p className="text-xs text-slate-500">
              Comparativo de total de apontamentos versus desvios de alta criticidade por setor.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="total" name="Total de NCs" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="criticas" name="NCs Críticas / Altas" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Mitigation (Initial vs Residual) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-base text-slate-800 mb-1">
              Mitigação de Risco: Inicial vs Residual
            </h3>
            <p className="text-xs text-slate-500">
              Demonstração da redução de criticidade após implementação e auditoria de eficácia das ações corretivas.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Inicial" name="Risco Inicial na Abertura" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Residual" name="Risco Residual após Eficácia" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
