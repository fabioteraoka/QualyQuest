import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileText,
  Search,
  Filter,
  Layers,
  Building2,
  BookOpen,
  Plus,
  Edit3,
  Save,
  Check,
  Calendar,
  AlertCircle,
  Download,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  Award,
  Sparkles,
  Paperclip,
  CheckSquare,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import {
  PreparacaoRequisitoAuditoria,
  OrigemRespostaAuditoria,
  StatusRespostaAuditoria,
  SituacaoProntidaoAuditoria,
  DocumentoControlado,
  EvidenciaRequisitoItem,
  ControleCentralSGQ,
  UserProfile,
  OrganizationRecord,
  ClienteExterno,
  SituacaoAplicabilidadeImpacto,
  StatusConformidadeSGQ
} from '../../types';
import {
  subscribeToAuditPreparations,
  saveAuditPreparation,
  calcularIndicadoresPainel,
  getPreparacoesIniciaisMemoria
} from '../../services/auditReadinessService';
import { AuditReadinessDetailModal } from './AuditReadinessDetailModal';
import { MASTER_CHECKLIST_ITEMS } from '../../data/corporateChecklistsData';
import { AUDITORIA_CONSOLIDACAO_DATA } from '../../data/canonicalCriteriaAuditData';

interface AuditReadinessDashboardViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  documentosControlados?: DocumentoControlado[];
  evidenciasDisponiveis?: EvidenciaRequisitoItem[];
  controlesCentrais?: ControleCentralSGQ[];
  clientes?: ClienteExterno[];
  onNavigateToTab?: (tab: string) => void;
}

const ORIGEM_BADGE: Record<OrigemRespostaAuditoria, { label: string; badge: string; icon: string }> = {
  AUTOMATICA: {
    label: 'Automática',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: '⚡'
  },
  AUTOMATICA_COM_VALIDACAO: {
    label: 'Automática c/ Validação',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '🤖'
  },
  COMPLEMENTACAO_NECESSARIA: {
    label: 'Complementação Nec.',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '⚠️'
  },
  TRATAMENTO_MANUAL: {
    label: 'Tratamento Manual',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: '✍️'
  }
};

const PRONTIDAO_BADGE: Record<SituacaoProntidaoAuditoria, { label: string; badge: string; icon: any }> = {
  PRONTO_PARA_AUDITORIA: {
    label: 'Pronto p/ Auditoria',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2
  },
  COM_PENDENCIAS_IMPEDITIVAS: {
    label: 'Pendências Impeditivas',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: XCircle
  },
  AGUARDANDO_VALIDACAO: {
    label: 'Aguardando Validação',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: Clock
  },
  EM_PREPARACAO: {
    label: 'Em Preparação',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertTriangle
  },
  NAO_INICIADA: {
    label: 'Não Iniciada',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: HelpCircle
  },
  EXCECAO_JUSTIFICADA: {
    label: 'Exceção Justificada',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: ShieldCheck
  }
};

export const AuditReadinessDashboardView: React.FC<AuditReadinessDashboardViewProps> = ({
  organizationId,
  currentUser,
  documentosControlados = [],
  evidenciasDisponiveis = [],
  controlesCentrais = [],
  clientes = [],
  onNavigateToTab
}) => {
  const orgId = organizationId || 'org_impacto_aviation';

  // Subscrição das Preparações
  const [preparacoes, setPreparacoes] = useState<PreparacaoRequisitoAuditoria[]>(() =>
    getPreparacoesIniciaisMemoria(orgId)
  );

  useEffect(() => {
    const unsub = subscribeToAuditPreparations(orgId, (dados) => {
      if (dados && dados.length > 0) {
        setPreparacoes(dados);
      }
    });
    return () => unsub();
  }, [orgId]);

  // Modal de Detalhe Individual
  const [selectedPreparacao, setSelectedPreparacao] = useState<PreparacaoRequisitoAuditoria | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros de Consulta
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroAutoridade, setFiltroAutoridade] = useState<string>('TODAS');
  const [filtroProntidao, setFiltroProntidao] = useState<string>('TODAS');
  const [filtroOrigemResposta, setFiltroOrigemResposta] = useState<string>('TODAS');
  const [filtroStatusResposta, setFiltroStatusResposta] = useState<string>('TODAS');
  const [filtroAplicabilidade, setFiltroAplicabilidade] = useState<string>('TODAS');
  const [filtroApenasPendencias, setFiltroApenasPendencias] = useState(false);

  // Indicadores do Painel Consolidados
  const indicadores = useMemo(() => {
    return calcularIndicadoresPainel(preparacoes, MASTER_CHECKLIST_ITEMS);
  }, [preparacoes]);

  // Lista Filtrada de Requisitos
  const filteredPreparacoes = useMemo(() => {
    return preparacoes.filter((p) => {
      // 1. Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = p.requisitoId.toLowerCase().includes(term);
        const matchItem = p.numeroItem.toLowerCase().includes(term);
        const matchTitle = (p.tituloRequisito || '').toLowerCase().includes(term);
        const matchText = (p.textoOriginal || '').toLowerCase().includes(term);
        const matchNorm = (p.normaDocumento || '').toLowerCase().includes(term);
        const matchCtrl = (p.controleCentralCodigo || '').toLowerCase().includes(term);

        if (!matchId && !matchItem && !matchTitle && !matchText && !matchNorm && !matchCtrl) {
          return false;
        }
      }

      // 2. Filtro de Autoridade / Cliente
      if (filtroAutoridade !== 'TODAS') {
        if (!p.autoridadeOuCliente.toLowerCase().includes(filtroAutoridade.toLowerCase())) {
          return false;
        }
      }

      // 3. Filtro de Prontidão
      if (filtroProntidao !== 'TODAS') {
        if (p.situacaoProntidao !== filtroProntidao) return false;
      }

      // 4. Filtro de Origem da Resposta
      if (filtroOrigemResposta !== 'TODAS') {
        if (p.origemResposta !== filtroOrigemResposta) return false;
      }

      // 5. Filtro de Status da Resposta
      if (filtroStatusResposta !== 'TODAS') {
        if (p.statusResposta !== filtroStatusResposta) return false;
      }

      // 6. Filtro de Aplicabilidade
      if (filtroAplicabilidade !== 'TODAS') {
        if (p.aplicabilidade !== filtroAplicabilidade) return false;
      }

      // 7. Filtro rápido de pendências
      if (filtroApenasPendencias) {
        const temPend = p.pendencias && p.pendencias.some((pend) => pend.situacao !== 'CONCLUIDA' && pend.situacao !== 'CANCELADA');
        if (!temPend) return false;
      }

      return true;
    });
  }, [
    preparacoes,
    searchTerm,
    filtroAutoridade,
    filtroProntidao,
    filtroOrigemResposta,
    filtroStatusResposta,
    filtroAplicabilidade,
    filtroApenasPendencias
  ]);

  // Salvar alteração do modal individual
  const handleSaveModal = async (atualizado: PreparacaoRequisitoAuditoria) => {
    await saveAuditPreparation(orgId, atualizado, currentUser);
    setPreparacoes((prev) => {
      const idx = prev.findIndex((p) => p.id === atualizado.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = atualizado;
        return next;
      }
      return [atualizado, ...prev];
    });
    setSelectedPreparacao(atualizado);
  };

  const handleOpenDetail = (p: PreparacaoRequisitoAuditoria) => {
    setSelectedPreparacao(p);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">

      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-lg border border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40 uppercase tracking-wider">
              QualyQuest SGQ — Fase 1.4.4
            </span>
            <span className="text-xs text-slate-400">Preparação Contínua para Auditorias</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Painel de Preparação de Respostas & Evidências
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Tratamento preventivo e individualizado dos 177 requisitos regulatórios e contratuais. Elaboração de respostas institucionais ancoradas em procedimentos do MOMQ/PTM, vinculação de evidências objetivas válidas e controle rigoroso de pendências impeditivas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Índice Geral de Prontidão</span>
            <span className="text-2xl font-black text-emerald-400">
              {indicadores.taxaProntidaoGeral}%
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Indicadores Consolidados (Métricas da Seção 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Total Requisitos */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium block">Total de Requisitos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{indicadores.totalRequisitos}</span>
            <span className="text-[10px] text-slate-400 font-mono">11 Checklists</span>
          </div>
        </div>

        {/* Prontos para Auditoria */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Prontos para Auditoria
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">{indicadores.requisitosProntosParaAuditoria}</span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{indicadores.taxaProntidaoGeral}% do acervo</span>
          </div>
        </div>

        {/* Respostas Aprovadas */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 shadow-xs">
          <span className="text-blue-700 dark:text-blue-400 text-xs font-bold block flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Respostas Aprovadas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-blue-900 dark:text-blue-100">{indicadores.respostasAprovadas}</span>
            <span className="text-[10px] text-slate-400">de {indicadores.totalRequisitos}</span>
          </div>
        </div>

        {/* Com Evidências Suficientes */}
        <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
          <span className="text-indigo-700 dark:text-indigo-400 text-xs font-bold block flex items-center gap-1">
            <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
            Evidências Suficientes
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100">{indicadores.requisitosComEvidenciasSuficientes}</span>
            <span className="text-[10px] text-slate-400">validadas</span>
          </div>
        </div>

        {/* Requisitos com Pendências */}
        <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 shadow-xs">
          <span className="text-rose-700 dark:text-rose-400 text-xs font-bold block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Requisitos c/ Pendências
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-rose-900 dark:text-rose-100">{indicadores.requisitosComPendencias}</span>
            <span className="text-[10px] text-rose-600 font-semibold">ações abertas</span>
          </div>
        </div>

      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Busca textual */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, pergunta, norma, seção ou controle..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Filtro de Autoridade / Cliente */}
          <select
            value={filtroAutoridade}
            onChange={(e) => setFiltroAutoridade(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="TODAS">Todas as Autoridades / Clientes</option>
            <option value="ANAC">ANAC (RBAC 145 / 43)</option>
            <option value="EASA">EASA (Part-145)</option>
            <option value="FAA">FAA (14 CFR 145 / 43)</option>
            <option value="IOSA">IOSA (IATA ISM)</option>
            <option value="Kalitta Air">Kalitta Air (FORM QA-14)</option>
            <option value="Atlas Air">Atlas Air (FORM Q2059)</option>
            <option value="TACV">TACV (Cabo Verde)</option>
            <option value="IMPACTO">IMPACTO SGQ (Interno)</option>
          </select>

          {/* Filtro de Prontidão */}
          <select
            value={filtroProntidao}
            onChange={(e) => setFiltroProntidao(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="TODAS">Todas as Situações de Prontidão</option>
            <option value="PRONTO_PARA_AUDITORIA">Pronto para Auditoria</option>
            <option value="COM_PENDENCIAS_IMPEDITIVAS">Com Pendências Impeditivas</option>
            <option value="AGUARDANDO_VALIDACAO">Aguardando Validação</option>
            <option value="EM_PREPARACAO">Em Preparação</option>
            <option value="NAO_INICIADA">Não Iniciada</option>
            <option value="EXCECAO_JUSTIFICADA">Exceção Justificada</option>
          </select>

          {/* Filtro de Origem da Resposta */}
          <select
            value={filtroOrigemResposta}
            onChange={(e) => setFiltroOrigemResposta(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="TODAS">Todas as Origens de Resposta</option>
            <option value="AUTOMATICA">Automática</option>
            <option value="AUTOMATICA_COM_VALIDACAO">Automática c/ Validação</option>
            <option value="COMPLEMENTACAO_NECESSARIA">Complementação Necessária</option>
            <option value="TRATAMENTO_MANUAL">Tratamento Manual</option>
          </select>

          {/* Toggle Apenas com Pendências */}
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={filtroApenasPendencias}
              onChange={(e) => setFiltroApenasPendencias(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span>Apenas com Pendências</span>
          </label>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>Exibindo <strong>{filteredPreparacoes.length}</strong> de <strong>{preparacoes.length}</strong> requisitos catalogados</span>
          {(searchTerm || filtroAutoridade !== 'TODAS' || filtroProntidao !== 'TODAS' || filtroOrigemResposta !== 'TODAS' || filtroApenasPendencias) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroAutoridade('TODAS');
                setFiltroProntidao('TODAS');
                setFiltroOrigemResposta('TODAS');
                setFiltroStatusResposta('TODAS');
                setFiltroAplicabilidade('TODAS');
                setFiltroApenasPendencias(false);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Requisitos e Prontidão */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-28">Código / Fonte</th>
                <th className="py-3 px-3 min-w-[280px]">Requisito Original & Norma</th>
                <th className="py-3 px-3 w-36">Controle SGQ</th>
                <th className="py-3 px-3 w-40">Resposta Institucional</th>
                <th className="py-3 px-3 w-28 text-center">Docs & Evidências</th>
                <th className="py-3 px-3 w-28 text-center">Pendências</th>
                <th className="py-3 px-3 w-36">Prontidão</th>
                <th className="py-3 px-3 w-24 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredPreparacoes.map((p) => {
                const ProntIcon = PRONTIDAO_BADGE[p.situacaoProntidao]?.icon || HelpCircle;
                const temPendImpeditiva = p.pendencias?.some((pend) => pend.impeditivaAuditoria && pend.situacao !== 'CONCLUIDA' && pend.situacao !== 'CANCELADA');

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Código / Fonte */}
                    <td className="py-3 px-3 align-top font-mono">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{p.requisitoId}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {p.autoridadeOuCliente}
                      </span>
                    </td>

                    {/* Requisito Original & Norma */}
                    <td className="py-3 px-3 align-top">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {p.tituloRequisito}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <strong className="text-slate-700 dark:text-slate-300">{p.normaDocumento}</strong> ({p.secaoReferencia})
                      </div>
                    </td>

                    {/* Controle SGQ */}
                    <td className="py-3 px-3 align-top">
                      <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        {p.controleCentralCodigo || p.controleCentralId}
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">
                        {p.controleCentralNome}
                      </span>
                    </td>

                    {/* Resposta Institucional */}
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${ORIGEM_BADGE[p.origemResposta]?.badge}`}>
                          <span>{ORIGEM_BADGE[p.origemResposta]?.icon}</span>
                          <span>{ORIGEM_BADGE[p.origemResposta]?.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Status: <strong className={p.statusResposta === 'APROVADA' ? 'text-emerald-600' : 'text-amber-600'}>{p.statusResposta}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Docs & Evidências */}
                    <td className="py-3 px-3 align-top text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {p.documentosRelacionados?.length || 0} docs
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          p.evidenciasSuficientes ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.evidenciasVinculadas?.length || 0} evidências
                        </span>
                      </div>
                    </td>

                    {/* Pendências */}
                    <td className="py-3 px-3 align-top text-center">
                      {p.pendencias && p.pendencias.length > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {p.pendencias.filter((pend) => pend.situacao !== 'CONCLUIDA' && pend.situacao !== 'CANCELADA').length} abertas
                          </span>
                          {temPendImpeditiva && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              IMPEDITIVA
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Prontidão */}
                    <td className="py-3 px-3 align-top">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${PRONTIDAO_BADGE[p.situacaoProntidao]?.badge}`}>
                        <ProntIcon className="w-3 h-3 shrink-0" />
                        <span>{PRONTIDAO_BADGE[p.situacaoProntidao]?.label}</span>
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="py-3 px-3 align-top text-center">
                      <button
                        onClick={() => handleOpenDetail(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 dark:text-blue-400 dark:hover:bg-blue-600 rounded-lg transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                      >
                        <span>Tratar</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhe Individual */}
      <AuditReadinessDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preparacao={selectedPreparacao}
        onSave={handleSaveModal}
        documentosDisponiveis={documentosControlados}
        evidenciasDisponiveis={evidenciasDisponiveis}
        controlesCentrais={controlesCentrais}
        currentUser={currentUser}
      />

    </div>
  );
};
