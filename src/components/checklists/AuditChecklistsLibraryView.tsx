import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  FileText,
  Save,
  Check,
  X,
  ExternalLink,
  Plus,
  RefreshCw,
  Download,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Sparkles,
  Award,
  Link2,
  AlertCircle,
  FileCheck2,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import {
  ChecklistAuditoriaMestre,
  CriterioChecklistMestre,
  ExecucaoChecklistAuditoria,
  ItemAvaliadoExecucaoChecklist,
  TipoEntidadeChecklist,
  EvidenciaRequisitoItem,
  UserProfile,
  NCRecord
} from '../../types';
import {
  subscribeToCorporateChecklists,
  subscribeToCorporateChecklistItems,
  subscribeToChecklistExecutions,
  seedCorporateChecklistsIfEmpty,
  inicializarExecucaoChecklist,
  saveChecklistExecution,
  gerarRNCFromCriterioNC
} from '../../services/corporateChecklistsService';
import {
  MASTER_CHECKLISTS,
  MASTER_CHECKLIST_ITEMS
} from '../../data/corporateChecklistsData';
import { INITIAL_COMPLIANCE_EVIDENCES } from '../../services/corporateComplianceMatrixService';

interface AuditChecklistsLibraryViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  evidenciasDisponiveis?: EvidenciaRequisitoItem[];
  onNavigateToRNC?: (rncId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

const ENTIDADE_CONFIG: Record<
  TipoEntidadeChecklist,
  { label: string; badgeClass: string; icon: string; desc: string }
> = {
  AUTORIDADE_ANAC: {
    label: 'ANAC (Brasil)',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '🏛️',
    desc: 'Regulamentação Brasileira Primária (RBAC 145 / RBAC 43 / IS)'
  },
  AUTORIDADE_EASA: {
    label: 'EASA (Europa)',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    icon: '🇪🇺',
    desc: 'Regulação Aeronáutica Europeia para MRO Estrangeiro (Part-145)'
  },
  AUTORIDADE_FAA: {
    label: 'FAA (EUA)',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: '🇺🇸',
    desc: 'Regulação Norte-Americana e Acordo Bilateral BASA (14 CFR 145 & 43)'
  },
  PADRAO_IOSA: {
    label: 'IATA / IOSA',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: '✈️',
    desc: 'Padrão Setorial de Auditoria Operacional (ISM MNT & ORG)'
  },
  CLIENTE_OPERADOR: {
    label: 'Clientes & Operadores',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '🤝',
    desc: 'Checklists Contratuais de Clientes e Leasing (Kalitta, Atlas, TACV)'
  },
  INTERNO_SGQ: {
    label: 'Auditorias Internas IMPACTO',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: '🏢',
    desc: 'Auditorias do Sistema de Gestão da Qualidade, SGSO e Operações'
  }
};

export const AuditChecklistsLibraryView: React.FC<AuditChecklistsLibraryViewProps> = ({
  organizationId,
  currentUser,
  evidenciasDisponiveis = INITIAL_COMPLIANCE_EVIDENCES,
  onNavigateToRNC,
  onNavigateToTab
}) => {
  const orgId = organizationId || 'org_impacto_aviation';
  const isConsulta = currentUser?.role === 'CONSULTA' || currentUser?.role === 'VIEWER';

  // Estados principais
  const [checklists, setChecklists] = useState<ChecklistAuditoriaMestre[]>(MASTER_CHECKLISTS);
  const [criterios, setCriterios] = useState<CriterioChecklistMestre[]>(MASTER_CHECKLIST_ITEMS);
  const [execucoes, setExecucoes] = useState<ExecucaoChecklistAuditoria[]>([]);

  // Filtros
  const [selectedEntidade, setSelectedEntidade] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChecklistForView, setSelectedChecklistForView] = useState<ChecklistAuditoriaMestre | null>(null);

  // Execução ativa de auditoria (Modal)
  const [activeExecution, setActiveExecution] = useState<ExecucaoChecklistAuditoria | null>(null);
  const [activeChecklistForExec, setActiveChecklistForExec] = useState<ChecklistAuditoriaMestre | null>(null);
  const [execModalModuleFilter, setExecModalModuleFilter] = useState<string>('TODOS');
  const [savingExecution, setSavingExecution] = useState(false);
  const [executionFeedback, setExecutionFeedback] = useState<string | null>(null);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Modal de anexar evidência do acervo
  const [evidenceModalCriterioId, setEvidenceModalCriterioId] = useState<string | null>(null);

  // Inicialização e Subscrições
  useEffect(() => {
    if (!orgId) return;

    // Subscrição dos checklists mestres
    const unsubChecklists = subscribeToCorporateChecklists(orgId, (list) => {
      if (list && list.length > 0) setChecklists(list);
    });

    // Subscrição dos critérios
    const unsubItems = subscribeToCorporateChecklistItems(orgId, null, (items) => {
      if (items && items.length > 0) setCriterios(items);
    });

    // Subscrição das execuções
    const unsubExecs = subscribeToChecklistExecutions(orgId, (execs) => {
      setExecucoes(execs);
    });

    return () => {
      unsubChecklists();
      unsubItems();
      unsubExecs();
    };
  }, [orgId]);

  // Seeding inicial no Firestore
  const handleSeedDatabase = async () => {
    setSeedingLoading(true);
    try {
      const res = await seedCorporateChecklistsIfEmpty(orgId, currentUser);
      setExecutionFeedback(`Banco atualizado: ${res.checklistsSeeded} checklists e ${res.itemsSeeded} critérios persistidos com sucesso!`);
      setTimeout(() => setExecutionFeedback(null), 5000);
    } catch (err: any) {
      console.error('Erro ao semear checklists:', err);
      setExecutionFeedback('Erro ao persistir checklists no banco.');
    } finally {
      setSeedingLoading(false);
    }
  };

  // Filtragem dos Checklists
  const filteredChecklists = useMemo(() => {
    return checklists.filter((chk) => {
      if (selectedEntidade !== 'TODAS' && chk.tipoEntidade !== selectedEntidade) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = (chk.codigo || '').toLowerCase().includes(term);
        const matchName = (chk.nome || '').toLowerCase().includes(term);
        const matchAuth = (chk.autoridadeOuCliente || '').toLowerCase().includes(term);
        const matchNorm = (chk.normaDocumentoReferencia || '').toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchAuth && !matchNorm) return false;
      }
      return true;
    });
  }, [checklists, selectedEntidade, searchTerm]);

  // Critérios do checklist selecionado para visualização
  const currentViewCriteria = useMemo(() => {
    if (!selectedChecklistForView) return [];
    return criterios
      .filter((c) => c.checklistCodigo === selectedChecklistForView.codigo || c.checklistId === selectedChecklistForView.id)
      .sort((a, b) => a.ordem - b.ordem);
  }, [selectedChecklistForView, criterios]);

  // Iniciar uma nova execução de checklist
  const handleStartExecution = (chk: ChecklistAuditoriaMestre) => {
    const chkCriterios = criterios
      .filter((c) => c.checklistCodigo === chk.codigo || c.checklistId === chk.id)
      .sort((a, b) => a.ordem - b.ordem);

    const ano = new Date().getFullYear();
    const codigoLimpo = chk.codigo.replace('CHK-', '');
    const numAuditoria = `AUD-${ano}-${codigoLimpo}-${Date.now().toString().slice(-4)}`;

    const novaExecucao = inicializarExecucaoChecklist(chk, chkCriterios, {
      numeroAuditoria: numAuditoria,
      auditorLider: currentUser?.displayName || currentUser?.email || 'Auditor da Qualidade SGQ',
      baseOperacional: 'Base Principal (SOROCABA / GRU)',
      escopoAuditado: chk.escopoAplicabilidade
    });

    setActiveChecklistForExec(chk);
    setActiveExecution(novaExecucao);
    setExecModalModuleFilter('TODOS');
  };

  // Atualizar avaliação de um critério na execução ativa
  const handleUpdateItemStatus = (criterioId: string, status: 'C' | 'NC' | 'NA' | 'PENDENTE') => {
    if (!activeExecution) return;

    const itemAtual = activeExecution.itensAvaliados[criterioId];
    if (!itemAtual) return;

    const itensAtualizados = {
      ...activeExecution.itensAvaliados,
      [criterioId]: {
        ...itemAtual,
        status
      }
    };

    setActiveExecution({
      ...activeExecution,
      itensAvaliados: itensAtualizados
    });
  };

  // Atualizar observação ou responsável do critério
  const handleUpdateItemField = (criterioId: string, field: 'observacoesAuditor' | 'responsavelCorrecao' | 'prazoCorrecao', value: string) => {
    if (!activeExecution) return;

    const itemAtual = activeExecution.itensAvaliados[criterioId];
    if (!itemAtual) return;

    const itensAtualizados = {
      ...activeExecution.itensAvaliados,
      [criterioId]: {
        ...itemAtual,
        [field]: value
      }
    };

    setActiveExecution({
      ...activeExecution,
      itensAvaliados: itensAtualizados
    });
  };

  // Vincular/desvincular evidência a um item da auditoria
  const handleToggleEvidenceToItem = (criterioId: string, evidenciaId: string) => {
    if (!activeExecution) return;

    const itemAtual = activeExecution.itensAvaliados[criterioId];
    if (!itemAtual) return;

    const atuais = itemAtual.evidenciasVinculadasIds || [];
    const novos = atuais.includes(evidenciaId)
      ? atuais.filter((id) => id !== evidenciaId)
      : [...atuais, evidenciaId];

    const itensAtualizados = {
      ...activeExecution.itensAvaliados,
      [criterioId]: {
        ...itemAtual,
        evidenciasVinculadasIds: novos
      }
    };

    setActiveExecution({
      ...activeExecution,
      itensAvaliados: itensAtualizados
    });
  };

  // Salvar a execução no Firestore
  const handleSaveActiveExecution = async (concluir: boolean = false) => {
    if (!activeExecution) return;

    setSavingExecution(true);
    try {
      const execParaSalvar: ExecucaoChecklistAuditoria = {
        ...activeExecution,
        statusExecucao: concluir ? 'CONCLUIDA' : 'EM_ANDAMENTO',
        concluidaEm: concluir ? new Date().toISOString() : activeExecution.concluidaEm,
        concluidaPorNome: concluir ? (currentUser?.displayName || 'Auditor SGQ') : activeExecution.concluidaPorNome
      };

      await saveChecklistExecution(orgId, execParaSalvar, currentUser);
      setExecutionFeedback(concluir ? 'Auditoria concluída e persistida com sucesso!' : 'Progresso da auditoria salvo com sucesso!');
      setTimeout(() => setExecutionFeedback(null), 4000);

      if (concluir) {
        setActiveExecution(null);
        setActiveChecklistForExec(null);
      }
    } catch (err: any) {
      console.error('Erro ao salvar auditoria:', err);
      setExecutionFeedback('Erro ao salvar a execução.');
    } finally {
      setSavingExecution(false);
    }
  };

  // Gerar RNC automática para item não conforme
  const handleGenerateRNC = async (criterio: CriterioChecklistMestre) => {
    if (!activeExecution) return;

    const avaliacao = activeExecution.itensAvaliados[criterio.id];
    if (!avaliacao) return;

    try {
      setSavingExecution(true);
      const res = await gerarRNCFromCriterioNC(orgId, activeExecution, criterio, avaliacao, currentUser);
      setExecutionFeedback(`RNC ${res.numeroNC} gerada com sucesso e vinculada ao item ${criterio.numeroItem}!`);
      setTimeout(() => setExecutionFeedback(null), 5000);

      // Atualizar o estado local
      const itensAtualizados = {
        ...activeExecution.itensAvaliados,
        [criterio.id]: {
          ...avaliacao,
          rncId: res.rncId,
          rncNumero: res.numeroNC
        }
      };

      setActiveExecution({
        ...activeExecution,
        itensAvaliados: itensAtualizados
      });
    } catch (err: any) {
      console.error('Erro ao gerar RNC:', err);
      setExecutionFeedback('Falha ao gerar RNC automática.');
    } finally {
      setSavingExecution(false);
    }
  };

  // Métricas gerais
  const stats = useMemo(() => {
    const totalChecklists = checklists.length;
    const totalCriterios = criterios.length;
    const rbac145Count = criterios.filter((c) => c.checklistCodigo === 'CHK-ANAC-RBAC145').length;
    const totalExecucoes = execucoes.length;
    const totalConcluidas = execucoes.filter((e) => e.statusExecucao === 'CONCLUIDA').length;

    return { totalChecklists, totalCriterios, rbac145Count, totalExecucoes, totalConcluidas };
  }, [checklists, criterios, execucoes]);

  return (
    <div className="space-y-6">
      {/* Header Executivo da Biblioteca */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Biblioteca Corporativa de Checklists de Auditoria
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                    Fase 1.4 Complementar
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Checklists previamente estruturados e executáveis para ANAC, EASA, FAA, IOSA, Operadores e Auditorias Internas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedDatabase}
              disabled={seedingLoading || isConsulta}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Garante persistência de todos os 11 checklists e 22 critérios do RBAC 145 no Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seedingLoading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Banco</span>
            </button>
          </div>
        </div>

        {/* Notificação / Feedback */}
        {executionFeedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{executionFeedback}</span>
          </div>
        )}

        {/* Cards de Métricas em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Checklists Ativos</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalChecklists}</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60">
            <span className="text-blue-700 dark:text-blue-400 block text-[11px] font-medium">RBAC 145 (Planilha Oficial)</span>
            <span className="text-xl font-bold text-blue-900 dark:text-blue-200">{stats.rbac145Count} Critérios</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60">
            <span className="text-purple-700 dark:text-purple-400 block text-[11px] font-medium">Critérios Estruturados</span>
            <span className="text-xl font-bold text-purple-900 dark:text-purple-200">{stats.totalCriterios}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
            <span className="text-amber-700 dark:text-amber-400 block text-[11px] font-medium">Auditorias Realizadas</span>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-200">{stats.totalExecucoes}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-emerald-700 dark:text-emerald-400 block text-[11px] font-medium">Concluídas & Arquivadas</span>
            <span className="text-xl font-bold text-emerald-900 dark:text-emerald-200">{stats.totalConcluidas}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, nome da autoridade, cliente ou norma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Autoridade:</span>
          <select
            value={selectedEntidade}
            onChange={(e) => setSelectedEntidade(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="TODAS">Todas as Autoridades e Fontes</option>
            <option value="AUTORIDADE_ANAC">🏛️ ANAC (RBAC 145 / 43 / IS)</option>
            <option value="AUTORIDADE_EASA">🇪🇺 EASA (Part-145)</option>
            <option value="AUTORIDADE_FAA">🇺🇸 FAA (14 CFR 145 / 43)</option>
            <option value="PADRAO_IOSA">✈️ IATA / IOSA (MNT & ORG)</option>
            <option value="CLIENTE_OPERADOR">🤝 Clientes (Kalitta / Atlas / TACV)</option>
            <option value="INTERNO_SGQ">🏢 Auditorias Internas (SGQ / SGSO)</option>
          </select>
        </div>
      </div>

      {/* Grade de Checklists Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChecklists.map((chk) => {
          const cfg = ENTIDADE_CONFIG[chk.tipoEntidade] || {
            label: chk.tipoEntidade,
            badgeClass: 'bg-slate-100 text-slate-800',
            icon: '📋',
            desc: ''
          };

          const isRbac145 = chk.codigo === 'CHK-ANAC-RBAC145';

          return (
            <div
              key={chk.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white dark:bg-slate-900 hover:shadow-md ${
                isRbac145
                  ? 'border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {chk.revisao}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 block">
                    {chk.codigo}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 line-clamp-2">
                    {chk.nome}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {chk.escopoAplicabilidade}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Norma de Referência:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[180px]">
                      {chk.normaDocumentoReferencia}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Critérios Estruturados:</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      {chk.totalItens} critérios
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Vigência:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {chk.dataVigencia}
                    </span>
                  </div>
                </div>

                {/* Tags dos Módulos */}
                <div className="flex flex-wrap gap-1">
                  {chk.modulos.slice(0, 3).map((mod, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {mod}
                    </span>
                  ))}
                  {chk.modulos.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      +{chk.modulos.length - 3} módulos
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => setSelectedChecklistForView(chk)}
                  className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Critérios ({chk.totalItens})</span>
                </button>

                <button
                  onClick={() => handleStartExecution(chk)}
                  disabled={isConsulta}
                  className="py-2 px-3 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  title="Iniciar checklist de auditoria em campo"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auditar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: VISUALIZAÇÃO COMPLETA DE CRITÉRIOS DO CHECKLIST             */}
      {/* ===================================================================== */}
      {selectedChecklistForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Cabeçalho */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    {selectedChecklistForView.codigo} • {selectedChecklistForView.revisao}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {selectedChecklistForView.nome}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedChecklistForView.autoridadeOuCliente} • {currentViewCriteria.length} critérios estruturados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChecklistForView(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Rolagem */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {currentViewCriteria.map((crit, idx) => (
                <div
                  key={crit.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px]">
                        Item {crit.numeroItem}
                      </span>
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        {crit.moduloOuSecao}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                      {crit.referenciaNormativa}
                    </span>
                  </div>

                  <p className="font-medium text-slate-900 dark:text-slate-100 text-xs leading-relaxed">
                    {crit.perguntaOuCriterio}
                  </p>

                  <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1 text-[11px]">
                    <span className="text-slate-500 font-semibold block">Evidência Objetiva Esperada:</span>
                    <p className="text-slate-700 dark:text-slate-300">{crit.orientacaoEvidencia}</p>
                    {crit.controleCentralNome && (
                      <div className="pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Controle SGQ Vinculado: {crit.controleCentralNome}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Total de {currentViewCriteria.length} critérios oficiais prontos para execução.
              </span>
              <button
                onClick={() => {
                  const chk = selectedChecklistForView;
                  setSelectedChecklistForView(null);
                  handleStartExecution(chk);
                }}
                disabled={isConsulta}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Auditoria com Este Checklist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: EXECUÇÃO INTERATIVA DA AUDITORIA (C, NC, NA, EVIDÊNCIAS, RNC)*/}
      {/* ===================================================================== */}
      {activeExecution && activeChecklistForExec && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl">
            {/* Header da Execução */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950/80 rounded-t-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-500 text-slate-950">
                      EM EXECUÇÃO
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {activeExecution.numeroAuditoria}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {activeExecution.checklistNome}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auditor Líder: {activeExecution.auditorLider} • Base: {activeExecution.baseOperacional}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSaveActiveExecution(false)}
                    disabled={savingExecution || isConsulta}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Rascunho</span>
                  </button>

                  <button
                    onClick={() => handleSaveActiveExecution(true)}
                    disabled={savingExecution || isConsulta}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir Auditoria</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveExecution(null);
                      setActiveChecklistForExec(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Placar de Progresso da Auditoria */}
              <div className="grid grid-cols-4 gap-2 mt-4 text-xs font-semibold text-center">
                {(() => {
                  const itens = Object.values(activeExecution.itensAvaliados || {}) as ItemAvaliadoExecucaoChecklist[];
                  const cCount = itens.filter((i) => i.status === 'C').length;
                  const ncCount = itens.filter((i) => i.status === 'NC').length;
                  const naCount = itens.filter((i) => i.status === 'NA').length;
                  const pCount = itens.filter((i) => i.status === 'PENDENTE').length;
                  return (
                    <>
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <span className="block text-[10px]">Conformes (C)</span>
                        <span className="text-base font-bold">{cCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <span className="block text-[10px]">Não Conformes (NC)</span>
                        <span className="text-base font-bold">{ncCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <span className="block text-[10px]">Não Aplicável (NA)</span>
                        <span className="text-base font-bold">{naCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <span className="block text-[10px]">Pendentes</span>
                        <span className="text-base font-bold">{pCount}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Filtro por Módulo dentro da Execução */}
            <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-slate-500 font-medium whitespace-nowrap">Módulo:</span>
                <select
                  value={execModalModuleFilter}
                  onChange={(e) => setExecModalModuleFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs cursor-pointer"
                >
                  <option value="TODOS">Todos os Módulos ({activeChecklistForExec.modulos.length})</option>
                  {activeChecklistForExec.modulos.map((mod, idx) => (
                    <option key={idx} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-500 text-[11px]">
                Marque C, NC ou NA para cada critério. NC permite gerar RNC instantânea.
              </span>
            </div>

            {/* Lista com Rolagem dos Critérios da Auditoria */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {criterios
                .filter(
                  (c) =>
                    c.checklistCodigo === activeChecklistForExec.codigo ||
                    c.checklistId === activeChecklistForExec.id
                )
                .filter(
                  (c) =>
                    execModalModuleFilter === 'TODOS' ||
                    c.moduloOuSecao.includes(execModalModuleFilter) ||
                    execModalModuleFilter.includes(c.moduloOuSecao)
                )
                .sort((a, b) => a.ordem - b.ordem)
                .map((crit) => {
                  const avaliacao = activeExecution.itensAvaliados[crit.id] || {
                    criterioId: crit.id,
                    numeroItem: crit.numeroItem,
                    moduloOuSecao: crit.moduloOuSecao,
                    referenciaNormativa: crit.referenciaNormativa,
                    perguntaOuCriterio: crit.perguntaOuCriterio,
                    status: 'PENDENTE',
                    evidenciasVinculadasIds: [],
                    observacoesAuditor: '',
                    responsavelCorrecao: '',
                    prazoCorrecao: ''
                  };

                  const isNC = avaliacao.status === 'NC';
                  const isC = avaliacao.status === 'C';
                  const isNA = avaliacao.status === 'NA';

                  return (
                    <div
                      key={crit.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isNC
                          ? 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
                          : isC
                          ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : isNA
                          ? 'border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/30 opacity-75'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {/* Topo do Critério */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
                            Item {crit.numeroItem}
                          </span>
                          <span className="text-slate-500 text-[11px] font-medium">
                            {crit.moduloOuSecao}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                            {crit.referenciaNormativa}
                          </span>

                          {/* Botões C / NC / NA */}
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemStatus(crit.id, 'C')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                isC
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                              }`}
                            >
                              C (Conforme)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateItemStatus(crit.id, 'NC')}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                isNC
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950'
                              }`}
                            >
                              NC (Não Conforme)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateItemStatus(crit.id, 'NA')}
                              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                isNA
                                  ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              NA
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Texto do Requisito */}
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-xs mt-2.5 leading-relaxed">
                        {crit.perguntaOuCriterio}
                      </p>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                        Evidência esperada: {crit.orientacaoEvidencia}
                      </div>

                      {/* Observações e Ação para NC */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                            Constatação / Observações do Auditor:
                          </label>
                          <textarea
                            rows={2}
                            value={avaliacao.observacoesAuditor || ''}
                            onChange={(e) => handleUpdateItemField(crit.id, 'observacoesAuditor', e.target.value)}
                            placeholder="Descreva a evidência verificada ou o desvio encontrado..."
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Evidências Objetivas Vinculadas ({avaliacao.evidenciasVinculadasIds?.length || 0}):
                            </label>
                            <button
                              type="button"
                              onClick={() => setEvidenceModalCriterioId(crit.id)}
                              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Vincular do Acervo</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1 min-h-[32px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60">
                            {avaliacao.evidenciasVinculadasIds && avaliacao.evidenciasVinculadasIds.length > 0 ? (
                              avaliacao.evidenciasVinculadasIds.map((evId) => {
                                const ev = evidenciasDisponiveis.find((e) => e.id === evId);
                                return (
                                  <span
                                    key={evId}
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                  >
                                    <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                    <span>{ev?.titulo || evId}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleEvidenceToItem(crit.id, evId)}
                                      className="text-emerald-600 hover:text-emerald-900 ml-0.5 cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Nenhuma evidência anexada ainda.
                              </span>
                            )}
                          </div>

                          {/* Se for NC: Botão de Gerar RNC ou Badge de RNC já gerada */}
                          {isNC && (
                            <div className="pt-2 flex items-center justify-between">
                              {avaliacao.rncNumero ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>RNC Gerada: {avaliacao.rncNumero}</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleGenerateRNC(crit)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>🚨 Abrir RNC Oficial (F 001-29)</span>
                                </button>
                              )}

                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Responsável..."
                                  value={avaliacao.responsavelCorrecao || ''}
                                  onChange={(e) => handleUpdateItemField(crit.id, 'responsavelCorrecao', e.target.value)}
                                  className="w-32 px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                                <input
                                  type="date"
                                  value={avaliacao.prazoCorrecao || ''}
                                  onChange={(e) => handleUpdateItemField(crit.id, 'prazoCorrecao', e.target.value)}
                                  className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Rodapé da Execução */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0 rounded-b-2xl">
              <span className="text-xs text-slate-500">
                Auditando {activeChecklistForExec.nome} ({activeChecklistForExec.autoridadeOuCliente}).
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveActiveExecution(false)}
                  disabled={savingExecution || isConsulta}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Salvar Rascunho
                </button>

                <button
                  onClick={() => handleSaveActiveExecution(true)}
                  disabled={savingExecution || isConsulta}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir e Salvar Auditoria</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: SELEÇÃO E VINCULAÇÃO DE EVIDÊNCIAS OBJETIVAS DO ACERVO       */}
      {/* ===================================================================== */}
      {evidenceModalCriterioId && activeExecution && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Vincular Evidência do Acervo Corporativo SGQ
                </h4>
              </div>
              <button
                onClick={() => setEvidenceModalCriterioId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              <p className="text-slate-500 mb-2">
                Selecione as evidências auditáveis ativas para comprovar a conformidade deste critério:
              </p>

              {evidenciasDisponiveis.map((ev) => {
                const vinculada = (
                  activeExecution.itensAvaliados[evidenceModalCriterioId]?.evidenciasVinculadasIds || []
                ).includes(ev.id);

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleToggleEvidenceToItem(evidenceModalCriterioId, ev.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      vinculada
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs">{ev.titulo}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-600">
                          {ev.baseOperacional || 'Base Sorocaba'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ev.descricao || ev.numeroReferencia || 'Evidência física/documental arquivada'} • Validade: {ev.dataValidade || 'Permanente'}
                      </p>
                    </div>

                    <div className="shrink-0 ml-3">
                      {vinculada ? (
                        <span className="p-1.5 rounded-full bg-emerald-600 text-white block">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end shrink-0">
              <button
                onClick={() => setEvidenceModalCriterioId(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
              >
                Concluir Seleção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
