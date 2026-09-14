import React from 'react';
import { SlideApresentacao, NCRecord } from '../../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import { 
  AlertTriangle, 
  ArrowRight, 
  Milestone, 
  Info,
  Workflow,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface SlideVisualRendererProps {
  slide: SlideApresentacao;
  records?: NCRecord[];
}

export const SlideVisualRenderer: React.FC<SlideVisualRendererProps> = ({ slide }) => {
  // 1. TRATAMENTO FORMAL DE DADOS INSUFICIENTES
  if (slide.semDados) {
    return (
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-5 text-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-bold text-amber-300">Dados Insuficientes para Análise Estatística</h4>
        </div>
        <p className="text-xs text-amber-300/90 leading-relaxed">
          O QualiGest SGQ não inventa nem interpola tendências sem um histórico temporal com relevância estatística comprovada.
        </p>
        <p className="mt-2 text-[11px] text-amber-400/80 font-mono">
          Cadastre novas ocorrências ou conclua as verificações de eficácia pendentes para consolidar séries históricas.
        </p>
      </div>
    );
  }

  const grafico = slide.graficoDados;
  if (!grafico || grafico.tipo === 'nenhum') {
    return null;
  }

  // 2. MATRIZ DE RISCO AERONÁUTICO 5x5
  if (grafico.tipo === 'matriz-5x5') {
    const severidades = [
      { num: 5, rotulo: '5 - Catastrófica' },
      { num: 4, rotulo: '4 - Crítica' },
      { num: 3, rotulo: '3 - Significativa' },
      { num: 2, rotulo: '2 - Menor' },
      { num: 1, rotulo: '1 - Desprezível' },
    ];
    const probabilidades = [
      { num: 1, rotulo: '1 - Extrem. Improvável' },
      { num: 2, rotulo: '2 - Extrem. Remoto' },
      { num: 3, rotulo: '3 - Remoto' },
      { num: 4, rotulo: '4 - Provável' },
      { num: 5, rotulo: '5 - Frequente' },
    ];

    const contagem = grafico.matriz5x5?.contagem || {};

    const getCorCelula = (sev: number, prob: number) => {
      const score = sev * prob;
      if (score >= 15) return 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
      if (score >= 10) return 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold';
      if (score >= 5) return 'bg-yellow-500/15 border-yellow-500/50 text-yellow-200';
      return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200';
    };

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            {grafico.titulo || 'Matriz de Risco Aeronáutico 5x5 (Severidade x Probabilidade)'}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Crítico (≥15)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Alto (10-14)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Médio (5-9)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Baixo (1-4)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1.5 text-left text-slate-400 font-mono text-[10px] w-36">Severidade \ Probabilidade</th>
                {probabilidades.map(p => (
                  <th key={p.num} className="p-1.5 text-slate-300 font-medium text-[11px]">{p.rotulo}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {severidades.map(s => (
                <tr key={s.num}>
                  <td className="p-1.5 text-left font-medium text-slate-300 bg-slate-800/40 border border-slate-800 text-[11px]">
                    {s.rotulo}
                  </td>
                  {probabilidades.map(p => {
                    const qtd = contagem[`${s.num}-${p.num}`] || 0;
                    return (
                      <td key={p.num} className={`p-2 border border-slate-800/60 ${getCorCelula(s.num, p.num)}`}>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-mono">{qtd}</span>
                          {qtd > 0 && <span className="text-[10px] opacity-75">RNC(s)</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. ISHIKAWA 6M (DIAGRAMA E GRÁFICO DE BARRAS)
  if (grafico.tipo === 'ishikawa-6m') {
    const itens = grafico.itens || [];
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">
          {grafico.titulo || 'Estratificação Causal pelo Modelo 6M da Garantia da Qualidade'}
        </span>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itens} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="rotulo" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} 
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {itens.map((entry, index) => (
                  <Cell key={`cell-6m-${index}`} fill={entry.cor || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 4. GRÁFICO DE BARRAS PADRÃO (CONSUMO DIRETO DE grafico.itens)
  if (grafico.tipo === 'barras') {
    const itens = grafico.itens || [];
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">
          {grafico.titulo || 'Indicador Gráfico Consolidado'}
        </span>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={itens} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="rotulo" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} 
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {itens.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={entry.cor || '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 5. GRÁFICO DE PIZZA / ROSCA PADRÃO (CONSUMO DIRETO DE grafico.itens)
  if (grafico.tipo === 'pizza') {
    const itens = grafico.itens || [];
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block mb-2">
          {grafico.titulo || 'Distribuição Percentual de Indicadores'}
        </span>
        <div className="h-44 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={itens}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={4}
                dataKey="valor"
                nameKey="rotulo"
                label={({ rotulo, percent }) => `${rotulo.split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {itens.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={entry.cor || '#3b82f6'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 6. ECOSSISTEMA INTEGRADO (14 ETAPAS SEM SILOS)
  if (grafico.tipo === 'ecossistema') {
    const etapas = [
      { num: 1, titulo: 'Requisito', desc: 'RBAC / ISO / Fabricante' },
      { num: 2, titulo: 'Aplicabilidade', desc: 'Frota & Capacidade' },
      { num: 3, titulo: 'Processo', desc: 'Fluxos de Manutenção' },
      { num: 4, titulo: 'Documento', desc: 'MOE / MCM Vigente' },
      { num: 5, titulo: 'Pessoa', desc: 'Competência & CHT' },
      { num: 6, titulo: 'Auditoria', desc: 'Interna & Externa' },
      { num: 7, titulo: 'Achado', desc: 'Constatação Registrada' },
      { num: 8, titulo: 'RNC F 001-29', desc: 'Contenção em 24h' },
      { num: 9, titulo: 'Risco 5x5', desc: 'Severidade x Prob.' },
      { num: 10, titulo: 'Ação 5W2H', desc: 'Causa Raiz 6M' },
      { num: 11, titulo: 'Evidência', desc: 'Comprovação Técnica' },
      { num: 12, titulo: 'Eficácia', desc: 'Bloqueio de Reincidência' },
      { num: 13, titulo: 'Conhecimento', desc: 'Lição Aprendida' },
      { num: 14, titulo: 'Melhoria', desc: 'SGQ Vivo & Resiliente' },
    ];

    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
            <Workflow className="w-4 h-4" /> A Cadeia Circular Contínua do QualiGest SGQ (Zero Silos)
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono">
            14 Etapas Interligadas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {etapas.map((et, i) => (
            <div 
              key={et.num}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg p-2.5 flex flex-col justify-between transition-colors relative group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center text-[10px] font-bold font-mono">
                  {et.num}
                </span>
                {i < etapas.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-500 hidden sm:block" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors">
                {et.titulo}
              </h4>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {et.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 p-2.5 rounded-lg bg-blue-950/40 border border-blue-900/50 text-[11px] text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-400" />
          <span>
            <strong>Interligação Sistêmica:</strong> Um desvio registrado no Hangar atualiza a matriz de risco da Diretoria, audita a validade da CHT do executor e dispara a revisão preventiva do procedimento operacional correspondente.
          </span>
        </div>
      </div>
    );
  }

  // 7. RÉGUA DE MATURIDADE DO SGQ (NÍVEIS 1 A 5)
  if (grafico.tipo === 'regua-maturidade') {
    const niveis = [
      { num: 'N1', titulo: 'Registro', status: 'Concluído', desc: 'Ficha F 001-29 digitalizada e auditável' },
      { num: 'N2', titulo: 'Controle', status: 'Concluído', desc: 'Metodologias 5W2H, Ishikawa e 5 Porquês' },
      { num: 'N3', titulo: 'Integração', status: 'Concluído', desc: 'Conexão viva entre RNCs, CHTs e Manuais' },
      { num: 'N4', titulo: 'Prevenção', status: 'Em Operação', desc: 'Saúde do SGQ e Alertas em tempo real', atual: true },
      { num: 'N5', titulo: 'Inteligência', status: 'Roadmap', desc: 'Predição probabilística e frota segura' },
    ];

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Milestone className="w-4 h-4 text-blue-400" /> Régua de Maturidade da Garantia da Qualidade
          </span>
          <span className="text-xs font-bold text-blue-400 font-mono">
            Estágio Atual: NÍVEL 4 (Prevenção Sistêmica)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {niveis.map(n => (
            <div 
              key={n.num} 
              className={`p-3 rounded-lg border transition-all ${
                n.atual 
                  ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30' 
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-200">
                  {n.num}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  n.status === 'Concluído' ? 'bg-emerald-500/20 text-emerald-300' :
                  n.status === 'Em Operação' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {n.status}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">{n.titulo}</h4>
              <p className="text-[10px] text-slate-400 leading-snug">{n.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. ROADMAP ESTRATÉGICO DO QUALIGEST SGQ
  if (grafico.tipo === 'roadmap') {
    const fases = [
      {
        horizonte: 'Fase I — Consolidação Core',
        tempo: 'Ativo & Operacional',
        status: 'IMPLEMENTADO',
        corStatus: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        itens: ['Fluxo oficial F 001-29', 'Ishikawa 6M & 5 Porquês', 'Pessoas & CHTs integrados', 'Apresentação Gerencial Integrada'],
      },
      {
        horizonte: 'Fase II — Assistência Aumentada',
        tempo: 'Curto Prazo',
        status: 'HOMOLOGAÇÃO',
        corStatus: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        itens: ['Copiloto de Manuais regulatórios', 'Checagem pré-auditoria', 'Identificação semântica de similares', 'Human-in-the-loop estrito'],
      },
      {
        horizonte: 'Fase III — Integração Operacional',
        tempo: 'Médio Prazo',
        status: 'PLANEJADO',
        corStatus: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        itens: ['Conectores ERPs (SAP/Totvs)', 'Diários de bordo digitais', 'Fechamento automatizado de OS', 'Zero retrabalho no hangar'],
      },
      {
        horizonte: 'Fase IV — SGQ Preditivo',
        tempo: 'Longo Prazo',
        status: 'VISÃO FUTURA',
        corStatus: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        itens: ['Modelagem probabilística de falhas', 'Inteligência coletiva anonimizada', 'Análise preventiva de diretrizes', 'Segurança máxima de frota'],
      },
    ];

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono block mb-3">
          Mapa de Horizontes e Entregas do QualiGest SGQ
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {fases.map((f, idx) => (
            <div key={idx} className="bg-slate-800/70 border border-slate-700/60 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-400">{f.tempo}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${f.corStatus}`}>
                    {f.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mb-2">{f.horizonte}</h4>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {f.itens.map((it, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-blue-400 text-[10px] leading-tight">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
