import React, { useState, useMemo } from 'react';
import { NCRecord, ManualRecord, ConhecimentoValidadoItem, ComparacaoRNCRecord, RelatorioSaudeSGQ, CategoriaSaudeSGQ, SeveridadeSaudeSGQ, ItemSaudeSGQ } from '../types';
import { avaliarSaudeSGQ } from '../utils/sgqHealthEvaluator';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Award, 
  BookOpen, 
  Lock, 
  Scale, 
  ArrowUpRight, 
  RefreshCw, 
  Filter, 
  Download,
  Search,
  Sparkles
} from 'lucide-react';

interface SGQHealthViewProps {
  records: NCRecord[];
  manuals: ManualRecord[];
  knowledge?: ConhecimentoValidadoItem[];
  knowledgeList?: ConhecimentoValidadoItem[];
  comparacoes: ComparacaoRNCRecord[];
  onSelectNC?: (nc: NCRecord, initialTab?: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia') => void;
  onSelectRecord?: (nc: NCRecord, initialTab?: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia') => void;
  onNavigateTab?: (tab: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenAuditModal?: () => void;
}

export const SGQHealthView: React.FC<SGQHealthViewProps> = (props) => {
  const {
    records = [],
    manuals = [],
    knowledge = props.knowledgeList || [],
    comparacoes = [],
    onSelectNC = props.onSelectRecord,
    onNavigateTab = props.onNavigateToTab,
    onOpenAuditModal,
  } = props;

  const [selectedCategory, setSelectedCategory] = useState<CategoriaSaudeSGQ | 'TODAS'>('TODAS');
  const [selectedSeveridade, setSelectedSeveridade] = useState<SeveridadeSaudeSGQ | 'TODAS'>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const healthReport: RelatorioSaudeSGQ = useMemo(() => {
    return avaliarSaudeSGQ(records, manuals, knowledge, comparacoes);
  }, [records, manuals, knowledge, comparacoes, lastRefreshed]);

  const filteredItems = useMemo(() => {
    return healthReport.itens.filter((item) => {
      if (selectedCategory !== 'TODAS' && item.categoria !== selectedCategory) return false;
      if (selectedSeveridade !== 'TODAS' && item.severidade !== selectedSeveridade) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          item.titulo.toLowerCase().includes(q) ||
          item.descricao.toLowerCase().includes(q) ||
          (item.targetNumeroNC && item.targetNumeroNC.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [healthReport, selectedCategory, selectedSeveridade, searchTerm]);

  const handleActionClick = (item: ItemSaudeSGQ) => {
    const navigate = onNavigateTab || props.onNavigateToTab;
    const select = onSelectNC || props.onSelectRecord;

    if (item.targetType === 'RNC') {
      const found = records.find(
        (r) =>
          (item.targetId && r.id === item.targetId) ||
          (item.targetNumeroNC && r.numeroNC === item.targetNumeroNC)
      );

      // Determina a aba do formulário correspondente à pendência encontrada
      let tab: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia' = 'dados';
      if (item.id.includes('causa')) {
        tab = 'causa';
      } else if (item.id.includes('acao')) {
        tab = 'acao';
      } else if (item.id.includes('eficacia')) {
        tab = 'eficacia';
      } else if (item.id.includes('atrasada')) {
        tab = 'acao';
      }

      if (found) {
        if (select) {
          select(found, tab);
        }
        if (navigate) {
          navigate('formulario');
        }
      } else {
        if (navigate) navigate('relatorio');
      }
    } else if (item.targetType === 'KNOWLEDGE' || item.categoria === 'CONHECIMENTO') {
      if (navigate) navigate('knowledgeBase');
    } else if (item.targetType === 'MANUAL' || item.categoria === 'DOCUMENTACAO') {
      if (navigate) navigate('manuais');
    } else if (item.targetType === 'AUDIT' || item.categoria === 'GOVERNANCA') {
      if (navigate) navigate('validacaoQueue');
    } else if (item.targetType === 'USER' || item.categoria === 'SEGURANCA') {
      if (onOpenAuditModal) {
        onOpenAuditModal();
      } else if (navigate) {
        navigate('dashboard');
      }
    } else if (navigate) {
      navigate('relatorio');
    }
  };

  const getStatusBadge = (status: 'BOM' | 'ATENCAO' | 'CRITICO') => {
    switch (status) {
      case 'BOM':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Status Conforme (Saudável)',
        };
      case 'ATENCAO':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: 'Requer Atenção SGQ',
        };
      case 'CRITICO':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          label: 'Intervenção Crítica Necessária',
        };
    }
  };

  const statusBadge = getStatusBadge(healthReport.statusIntegridade);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-[12px] p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-blue-600/30 text-blue-400 border border-blue-500/40">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Painel de Saúde & Integridade do SGQ</h1>
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50">
              FASE 5
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Monitoramento proativo da conformidade de RNCs, vigência de manuais, maturidade da base de conhecimento,
            segurança multi-tenant e governança da qualidade aeronáutica.
          </p>
          {onOpenAuditModal && (
            <div className="pt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAuditModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Auditoria Técnica & Hardening</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Integrity Index Card */}
        <div className="flex items-center gap-4 bg-slate-950/70 p-4 rounded-[10px] border border-slate-800 shrink-0 w-full md:w-auto justify-between md:justify-start">
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Índice de Integridade
            </span>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-3xl font-black text-white font-mono">{healthReport.scoreIntegridade}%</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
              <span className="text-[11px] font-medium text-slate-300">{statusBadge.label}</span>
            </div>
          </div>

          <button
            onClick={() => setLastRefreshed(new Date())}
            className="p-2 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Recalcular Indicadores de Saúde"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Breakdown Metrics Grid (5 Pilares SGQ) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. RNC */}
        <div className="bg-white p-3.5 rounded-[10px] border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Gestão RNC
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">{healthReport.breakdown.rnc}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                healthReport.breakdown.rnc >= 80 ? 'bg-emerald-500' : healthReport.breakdown.rnc >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthReport.breakdown.rnc}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Prazos, 5 Porquês & Ações</span>
        </div>

        {/* 2. Conhecimento */}
        <div className="bg-white p-3.5 rounded-[10px] border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              Conhecimento
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">{healthReport.breakdown.conhecimento}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                healthReport.breakdown.conhecimento >= 80 ? 'bg-emerald-500' : healthReport.breakdown.conhecimento >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthReport.breakdown.conhecimento}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Maturidade & Evidências</span>
        </div>

        {/* 3. Documentação */}
        <div className="bg-white p-3.5 rounded-[10px] border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-600" />
              Manuais & Normas
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">{healthReport.breakdown.documentacao}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                healthReport.breakdown.documentacao >= 80 ? 'bg-emerald-500' : healthReport.breakdown.documentacao >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthReport.breakdown.documentacao}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Vigência & Requisitos</span>
        </div>

        {/* 4. Governança */}
        <div className="bg-white p-3.5 rounded-[10px] border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-purple-600" />
              Governança
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">{healthReport.breakdown.governanca}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                healthReport.breakdown.governanca >= 80 ? 'bg-emerald-500' : healthReport.breakdown.governanca >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthReport.breakdown.governanca}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Fila de Validação & Homologações</span>
        </div>

        {/* 5. Segurança */}
        <div className="bg-white p-3.5 rounded-[10px] border border-slate-200 shadow-xs space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Segurança
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">{healthReport.breakdown.seguranca}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                healthReport.breakdown.seguranca >= 80 ? 'bg-emerald-500' : healthReport.breakdown.seguranca >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${healthReport.breakdown.seguranca}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Multi-Tenant & RBAC</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-[10px] border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Tabs */}
          {(['TODAS', 'RNC', 'CONHECIMENTO', 'DOCUMENTACAO', 'GOVERNANCA', 'SEGURANCA'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-[6px] transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'TODAS'
                ? 'Todas as Áreas'
                : cat === 'RNC'
                ? 'RNC'
                : cat === 'CONHECIMENTO'
                ? 'Conhecimento'
                : cat === 'DOCUMENTACAO'
                ? 'Documentação'
                : cat === 'GOVERNANCA'
                ? 'Governança'
                : 'Segurança'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar apontamentos de saúde..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedSeveridade}
            onChange={(e) => setSelectedSeveridade(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[6px] text-slate-700 font-medium focus:outline-none"
          >
            <option value="TODAS">Todas as Severidades</option>
            <option value="CRITICO">🔴 Crítico</option>
            <option value="ALTO">🟠 Alto</option>
            <option value="MEDIO">🟡 Médio</option>
            <option value="BAIXO">🟢 Baixo</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
          <span>Apontamentos e Oportunidades de Correção ({filteredItems.length})</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {healthReport.totalItensCriticos} Críticos
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {healthReport.totalItensAlerta} Alertas
            </span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-[10px] border border-slate-200 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Nenhum apontamento pendente nesta categoria</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Todas as Não Conformidades, Manuais e Padrões de Conhecimento atendem aos critérios de conformidade e integridade regulatória.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCritico = item.severidade === 'CRITICO';
            const isAlto = item.severidade === 'ALTO';
            const isMedio = item.severidade === 'MEDIO';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-[10px] p-4 border transition-all hover:shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isCritico
                    ? 'border-rose-300 bg-rose-50/20'
                    : isAlto
                    ? 'border-amber-300 bg-amber-50/10'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isCritico
                          ? 'bg-rose-600 text-white'
                          : isAlto
                          ? 'bg-amber-500 text-white'
                          : isMedio
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {item.severidade}
                    </span>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {item.categoria}
                    </span>

                    {item.targetNumeroNC && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {item.targetNumeroNC}
                      </span>
                    )}

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.titulo}</h4>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{item.descricao}</p>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 pt-1">
                    <span className="text-blue-600 font-semibold">Ação Sugerida:</span>
                    <span>{item.acaoSugerida}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleActionClick(item)}
                  className="px-3.5 py-2 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer w-full md:w-auto justify-center"
                >
                  <span>Resolver Pendência</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
