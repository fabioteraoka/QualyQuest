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
  Trash2,
  SlidersHorizontal,
  FolderPlus,
  ArrowRight
} from 'lucide-react';
import {
  ChecklistAuditoriaMestre,
  CriterioChecklistMestre,
  ExecucaoChecklistAuditoria,
  ItemAvaliadoExecucaoChecklist,
  TipoEntidadeChecklist,
  EvidenciaRequisitoItem,
  UserProfile,
  NCRecord,
  CriterioBibliotecaCorporativa,
  FonteVinculoCriterio,
  CriterioAjusteAuditoria
} from '../../types';
import {
  subscribeToCorporateLibraryCriteria,
  seedCorporateLibraryIfEmpty,
  montarChecklistDinamico,
  inicializarExecucaoDinamica,
  adicionarCriterioAuditoria,
  excluirCriterioAuditoria,
  subscribeToChecklistExecutions,
  saveChecklistExecution,
  gerarRNCFromCriterioNC
} from '../../services/corporateChecklistsService';
import { CANONICAL_CORPORATE_CRITERIA } from '../../data/corporateLibraryData';
import { INITIAL_COMPLIANCE_EVIDENCES } from '../../services/corporateComplianceMatrixService';

interface AuditChecklistsLibraryViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  evidenciasDisponiveis?: EvidenciaRequisitoItem[];
  onNavigateToRNC?: (rncId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

const AUTORIDADES_FILTRO = [
  { id: 'TODAS', label: 'Todas as Fontes (36 Canônicos)', icon: '🌐' },
  { id: 'ANAC', label: 'ANAC (RBAC 145 / 43 / IS)', icon: '🏛️' },
  { id: 'EASA', label: 'EASA (Part-145)', icon: '🇪🇺' },
  { id: 'FAA', label: 'FAA (14 CFR 145 / 43)', icon: '🇺🇸' },
  { id: 'IOSA', label: 'IATA / IOSA (ISM)', icon: '✈️' },
  { id: 'Kalitta Air', label: 'Kalitta Air (QA-14)', icon: '📦' },
  { id: 'Atlas Air', label: 'Atlas Air (Q2059)', icon: '🛫' },
  { id: 'TACV', label: 'Cabo Verde (TACV)', icon: '🇨🇻' },
  { id: 'IMPACTO SGQ', label: 'IMPACTO SGQ / Internas', icon: '🏢' }
];

export const AuditChecklistsLibraryView: React.FC<AuditChecklistsLibraryViewProps> = ({
  organizationId,
  currentUser,
  evidenciasDisponiveis = INITIAL_COMPLIANCE_EVIDENCES,
  onNavigateToRNC,
  onNavigateToTab
}) => {
  const orgId = organizationId || 'org_impacto_aviation';
  const isConsulta = currentUser?.role === 'CONSULTA' || currentUser?.role === 'VIEWER';

  // Sub-abas principais da visão
  const [activeTab, setActiveTab] = useState<'biblioteca-central' | 'montar-auditoria' | 'historico-auditorias'>('biblioteca-central');

  // Estados da Biblioteca Canônica
  const [criteriosCanônicos, setCriteriosCanônicos] = useState<CriterioBibliotecaCorporativa[]>(CANONICAL_CORPORATE_CRITERIA);
  const [execucoes, setExecucoes] = useState<ExecucaoChecklistAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  // Filtros da Biblioteca Central
  const [filtroAutoridade, setFiltroAutoridade] = useState<string>('TODAS');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [selectedCriterioModal, setSelectedCriterioModal] = useState<CriterioBibliotecaCorporativa | null>(null);

  // Estados do Assistente de Montagem Dinâmica de Auditoria
  const [builderOrigem, setBuilderOrigem] = useState<string>('ANAC');
  const [builderNomeAuditoria, setBuilderNomeAuditoria] = useState<string>('Auditoria de Vigilância Contínua ANAC RBAC 145');
  const [builderCodigoChecklist, setBuilderCodigoChecklist] = useState<string>('AUD-DIN-ANAC-145');
  const [builderNumeroAuditoria, setBuilderNumeroAuditoria] = useState<string>(`AUD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [builderAuditorLider, setBuilderAuditorLider] = useState<string>(currentUser?.displayName || 'Paulo Okubo (Auditor Líder SGQ)');
  const [builderBaseOperacional, setBuilderBaseOperacional] = useState<string>('GRU - Aeroporto Internacional de Guarulhos');
  const [builderEscopo, setBuilderEscopo] = useState<string>('Auditoria periódica de conformidade regulatória e contratual.');
  const [builderCriteriosIds, setBuilderCriteriosIds] = useState<string[]>([]);
  const [criteriosExcluidosBuilder, setCriteriosExcluidosBuilder] = useState<Record<string, string>>({}); // { critId: justificativa }
  const [criteriosExtrasBuilder, setCriteriosExtrasBuilder] = useState<Record<string, string>>({}); // { critId: justificativa }

  // Modal de inclusão / exclusão com justificativa
  const [justificativaModal, setJustificativaModal] = useState<{
    aberto: boolean;
    tipo: 'EXCLUIR' | 'INCLUIR_EXTRA';
    criterio: CriterioBibliotecaCorporativa | null;
    justificativa: string;
  }>({
    aberto: false,
    tipo: 'EXCLUIR',
    criterio: null,
    justificativa: ''
  });

  // Modal de Adicionar Critério Extra da Biblioteca Central
  const [modalAdicionarExtraAberto, setModalAdicionarExtraAberto] = useState(false);
  const [buscaExtra, setBuscaExtra] = useState('');

  // Estado da Execução Ativa (Auditoria em andamento)
  const [activeExecution, setActiveExecution] = useState<ExecucaoChecklistAuditoria | null>(null);
  const [filtroStatusItem, setFiltroStatusItem] = useState<'TODOS' | 'PENDENTE' | 'C' | 'NC' | 'NA'>('TODOS');
  const [salvandoExecucao, setSalvandoExecucao] = useState(false);
  const [itemParaEvidencias, setItemParaEvidencias] = useState<ItemAvaliadoExecucaoChecklist | null>(null);

  // Escutar Biblioteca Canônica e Execuções no Firestore
  useEffect(() => {
    const unsubCriteria = subscribeToCorporateLibraryCriteria(orgId, (criteria) => {
      if (criteria && criteria.length > 0) {
        setCriteriosCanônicos(criteria);
      }
    });

    const unsubExecs = subscribeToChecklistExecutions(orgId, (execs) => {
      setExecucoes(execs);
    });

    return () => {
      unsubCriteria();
      unsubExecs();
    };
  }, [orgId]);

  // Montagem dinâmica dos critérios ao mudar o builderOrigem
  useEffect(() => {
    const correspondentes = montarChecklistDinamico(criteriosCanônicos, {
      autoridadeOuCliente: builderOrigem === 'MULTI_ORIGEM' ? 'TODAS' : builderOrigem
    });
    setBuilderCriteriosIds(correspondentes.map((c) => c.id));
    setCriteriosExcluidosBuilder({});
    setCriteriosExtrasBuilder({});

    // Sugerir títulos e códigos
    if (builderOrigem === 'ANAC') {
      setBuilderNomeAuditoria('Auditoria de Vigilância Contínua — ANAC RBAC 145 / 43');
      setBuilderCodigoChecklist('CHK-DIN-ANAC-145');
    } else if (builderOrigem === 'Kalitta Air') {
      setBuilderNomeAuditoria('Auditoria Contratual de Estação — Kalitta Air (FORM QA-14)');
      setBuilderCodigoChecklist('CHK-DIN-KALITTA-QA14');
    } else if (builderOrigem === 'EASA') {
      setBuilderNomeAuditoria('Auditoria de Aprovação Estrangeira — EASA Part-145');
      setBuilderCodigoChecklist('CHK-DIN-EASA-145');
    } else if (builderOrigem === 'FAA') {
      setBuilderNomeAuditoria('Foreign Repair Station Audit — FAA 14 CFR Part 145');
      setBuilderCodigoChecklist('CHK-DIN-FAA-145');
    } else if (builderOrigem === 'IOSA') {
      setBuilderNomeAuditoria('Auditoria de Padronização IOSA — ISM MNT & ORG');
      setBuilderCodigoChecklist('CHK-DIN-IOSA-ISM');
    } else if (builderOrigem === 'Atlas Air') {
      setBuilderNomeAuditoria('Auditoria de Prestador de Manutenção — Atlas Air Q2059');
      setBuilderCodigoChecklist('CHK-DIN-ATLAS-Q2059');
    } else if (builderOrigem === 'TACV') {
      setBuilderNomeAuditoria('Auditoria de Manutenção de Linha B737-MAX — Cabo Verde Airlines');
      setBuilderCodigoChecklist('CHK-DIN-TACV-LINE');
    } else if (builderOrigem === 'IMPACTO SGQ') {
      setBuilderNomeAuditoria('Auditoria Interna Integrada do Sistema de Gestão da Qualidade');
      setBuilderCodigoChecklist('CHK-DIN-INT-SGQ');
    } else {
      setBuilderNomeAuditoria('Auditoria Personalizada Multi-Origem IMPACTO SGQ');
      setBuilderCodigoChecklist('CHK-DIN-PERSONALIZADA');
    }
  }, [builderOrigem, criteriosCanônicos]);

  // Seeding inicial idempotente
  const handleSeedBanco = async () => {
    try {
      setLoading(true);
      const res = await seedCorporateLibraryIfEmpty(orgId, currentUser);
      if (res.criteriaSeeded > 0) {
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: `Banco de dados sincronizado: ${res.criteriaSeeded} critérios canônicos e ${res.totalLinks} vínculos normativos persistidos com sucesso!`
        });
      } else {
        setFeedbackMsg({
          tipo: 'info',
          texto: 'A Biblioteca Corporativa Única já está 100% sincronizada no Firestore.'
        });
      }
    } catch (e: any) {
      setFeedbackMsg({ tipo: 'erro', texto: `Erro na sincronização: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Critérios filtrados na Biblioteca Central
  const criteriosFiltradosBiblioteca = useMemo(() => {
    return montarChecklistDinamico(criteriosCanônicos, {
      autoridadeOuCliente: filtroAutoridade,
      categoria: filtroCategoria,
      termoBusca
    });
  }, [criteriosCanônicos, filtroAutoridade, filtroCategoria, termoBusca]);

  // Categorias únicas existentes
  const categoriasUnicas = useMemo(() => {
    const set = new Set<string>();
    criteriosCanônicos.forEach((c) => set.add(c.categoria));
    return Array.from(set).sort();
  }, [criteriosCanônicos]);

  // Total de vínculos somados
  const totalVinculosNormativos = useMemo(() => {
    return criteriosCanônicos.reduce((acc, c) => acc + (c.fontesVinculadas || []).length, 0);
  }, [criteriosCanônicos]);

  // Critérios ativos no builder dinâmico
  const criteriosBuilderAtivos = useMemo(() => {
    const list: CriterioBibliotecaCorporativa[] = [];
    builderCriteriosIds.forEach((id) => {
      // Se não foi excluído com justificativa
      if (!criteriosExcluidosBuilder[id]) {
        const c = criteriosCanônicos.find((item) => item.id === id);
        if (c) list.push(c);
      }
    });
    // Adicionar extras incluídos
    Object.keys(criteriosExtrasBuilder).forEach((extraId) => {
      if (!builderCriteriosIds.includes(extraId)) {
        const c = criteriosCanônicos.find((item) => item.id === extraId);
        if (c) list.push(c);
      }
    });
    return list;
  }, [criteriosCanônicos, builderCriteriosIds, criteriosExcluidosBuilder, criteriosExtrasBuilder]);

  // Confirmar exclusão de critério com justificativa no Builder
  const handleConfirmarJustificativa = () => {
    if (!justificativaModal.criterio || !justificativaModal.justificativa.trim()) {
      alert('Por favor, informe a justificativa técnica para o registro no histórico de auditoria.');
      return;
    }

    const cid = justificativaModal.criterio.id;

    if (justificativaModal.tipo === 'EXCLUIR') {
      setCriteriosExcluidosBuilder((prev) => ({
        ...prev,
        [cid]: justificativaModal.justificativa.trim()
      }));
    } else {
      setCriteriosExtrasBuilder((prev) => ({
        ...prev,
        [cid]: justificativaModal.justificativa.trim()
      }));
    }

    setJustificativaModal({ aberto: false, tipo: 'EXCLUIR', criterio: null, justificativa: '' });
  };

  // Iniciar Auditoria a partir do Builder
  const handleIniciarAuditoriaDinamica = () => {
    if (criteriosBuilderAtivos.length === 0) {
      alert('Selecione ao menos um critério para compor o checklist de auditoria.');
      return;
    }
    if (!builderNumeroAuditoria.trim() || !builderAuditorLider.trim()) {
      alert('Preencha o Número da Auditoria e o Auditor Líder.');
      return;
    }

    const novaExecucao = inicializarExecucaoDinamica({
      organizationId: orgId,
      numeroAuditoria: builderNumeroAuditoria.trim(),
      checklistCodigo: builderCodigoChecklist.trim(),
      checklistNome: builderNomeAuditoria.trim(),
      auditorLider: builderAuditorLider.trim(),
      baseOperacional: builderBaseOperacional.trim(),
      escopoAuditado: builderEscopo.trim(),
      origemTipo: builderOrigem === 'ANAC' ? 'AUTORIDADE_ANAC' :
                  builderOrigem === 'EASA' ? 'AUTORIDADE_EASA' :
                  builderOrigem === 'FAA' ? 'AUTORIDADE_FAA' :
                  builderOrigem === 'IOSA' ? 'PADRAO_IOSA' :
                  ['Kalitta Air', 'Atlas Air', 'TACV'].includes(builderOrigem) ? 'CLIENTE_OPERADOR' :
                  builderOrigem === 'MULTI_ORIGEM' ? 'MULTI_ORIGEM' : 'INTERNO_SGQ',
      origemNome: builderOrigem,
      normaReferencia: builderOrigem,
      criteriosSelecionados: criteriosBuilderAtivos
    });

    // Registrar critérios excluídos no histórico congelado da execução
    const ajustes: CriterioAjusteAuditoria[] = [];
    Object.entries(criteriosExcluidosBuilder).forEach(([critId, just]: [string, string]) => {
      const crit = criteriosCanônicos.find((c) => c.id === critId);
      if (crit) {
        ajustes.push({
          criterioId: crit.id,
          codigoUnico: crit.codigoUnico,
          tipoAjuste: 'EXCLUIDO_DO_ESCOPO',
          justificativa: just,
          dataAjuste: new Date().toISOString(),
          responsavelNome: currentUser?.displayName || 'Auditor Líder'
        });
      }
    });

    Object.entries(criteriosExtrasBuilder).forEach(([critId, just]: [string, string]) => {
      const crit = criteriosCanônicos.find((c) => c.id === critId);
      if (crit) {
        ajustes.push({
          criterioId: crit.id,
          codigoUnico: crit.codigoUnico,
          tipoAjuste: 'INCLUIDO_EXTRA',
          justificativa: just,
          dataAjuste: new Date().toISOString(),
          responsavelNome: currentUser?.displayName || 'Auditor Líder'
        });
      }
    });

    novaExecucao.criteriosAjustados = ajustes;
    setActiveExecution(novaExecucao);
  };

  // Salvar execução no Firestore
  const handleSalvarExecucao = async (finalizar: boolean = false) => {
    if (!activeExecution) return;
    try {
      setSalvandoExecucao(true);
      const execAtualizada: ExecucaoChecklistAuditoria = {
        ...activeExecution,
        statusExecucao: finalizar ? 'CONCLUIDA' : 'EM_ANDAMENTO',
        concluidaEm: finalizar ? new Date().toISOString() : undefined,
        concluidaPorNome: finalizar ? (currentUser?.displayName || 'Auditor Líder') : undefined
      };

      await saveChecklistExecution(orgId, execAtualizada, currentUser);
      setActiveExecution(execAtualizada);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: finalizar
          ? `Auditoria ${execAtualizada.numeroAuditoria} FINALIZADA com sucesso! Índice de conformidade: ${execAtualizada.taxaConformidade}%`
          : `Auditoria ${execAtualizada.numeroAuditoria} salva no Firestore.`
      });

      if (finalizar) {
        setActiveTab('historico-auditorias');
      }
    } catch (e: any) {
      setFeedbackMsg({ tipo: 'erro', texto: `Erro ao salvar auditoria: ${e.message}` });
    } finally {
      setSalvandoExecucao(false);
    }
  };

  // Alterar status de item avaliado (C / NC / NA)
  const handleSetItemStatus = (criterioId: string, status: 'C' | 'NC' | 'NA') => {
    if (!activeExecution || isConsulta) return;
    const itemAtual = activeExecution.itensAvaliados[criterioId];
    if (!itemAtual) return;

    setActiveExecution({
      ...activeExecution,
      itensAvaliados: {
        ...activeExecution.itensAvaliados,
        [criterioId]: {
          ...itemAtual,
          status
        }
      }
    });
  };

  // Atualizar observação do auditor no item
  const handleUpdateItemObs = (criterioId: string, observacoesAuditor: string) => {
    if (!activeExecution || isConsulta) return;
    const itemAtual = activeExecution.itensAvaliados[criterioId];
    if (!itemAtual) return;

    setActiveExecution({
      ...activeExecution,
      itensAvaliados: {
        ...activeExecution.itensAvaliados,
        [criterioId]: {
          ...itemAtual,
          observacoesAuditor
        }
      }
    });
  };

  // Abrir RNC Oficial para critério NC
  const handleGerarRNC = async (item: ItemAvaliadoExecucaoChecklist) => {
    if (!activeExecution || isConsulta) return;
    const critCanônico = criteriosCanônicos.find((c) => c.id === item.criterioId) || {
      id: item.criterioId,
      numeroItem: item.numeroItem,
      perguntaOuCriterio: item.perguntaOuCriterio,
      referenciaNormativa: item.referenciaNormativa,
      criticidade: 'CRITICA' as const
    };

    try {
      setSalvandoExecucao(true);
      const res = await gerarRNCFromCriterioNC(
        orgId,
        activeExecution,
        critCanônico as any,
        item,
        currentUser
      );

      // Atualizar localmente
      setActiveExecution({
        ...activeExecution,
        itensAvaliados: {
          ...activeExecution.itensAvaliados,
          [item.criterioId]: {
            ...item,
            rncId: res.rncId,
            rncNumero: res.numeroNC
          }
        }
      });

      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Não Conformidade ${res.numeroNC} (F 001-29) gerada e vinculada ao item ${item.numeroItem} da auditoria!`
      });
    } catch (e: any) {
      setFeedbackMsg({ tipo: 'erro', texto: `Erro ao gerar RNC: ${e.message}` });
    } finally {
      setSalvandoExecucao(false);
    }
  };

  // Toggle de vínculo de evidência corporativa
  const handleToggleEvidenciaItem = (evidenciaId: string) => {
    if (!activeExecution || !itemParaEvidencias || isConsulta) return;
    const cid = itemParaEvidencias.criterioId;
    const itemAtual = activeExecution.itensAvaliados[cid];
    if (!itemAtual) return;

    const idsAtuais = itemAtual.evidenciasVinculadasIds || [];
    const novosIds = idsAtuais.includes(evidenciaId)
      ? idsAtuais.filter((id) => id !== evidenciaId)
      : [...idsAtuais, evidenciaId];

    const itemAtualizado = {
      ...itemAtual,
      evidenciasVinculadasIds: novosIds
    };

    setActiveExecution({
      ...activeExecution,
      itensAvaliados: {
        ...activeExecution.itensAvaliados,
        [cid]: itemAtualizado
      }
    });

    setItemParaEvidencias(itemAtualizado);
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* CABEÇALHO PRINCIPAL DA BIBLIOTECA CORPORATIVA UNIFICADA              */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Base Canônica Unificada Multi-Fonte
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                QualyQuest MRO SGQ • Sem Duplicações
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Biblioteca Corporativa Única de Requisitos e Critérios de Auditoria
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-4xl">
              Base canônica centralizada reunindo todos os requisitos e critérios técnicos aeronáuticos. As auditorias para{' '}
              <strong className="text-slate-800 dark:text-slate-200">ANAC, EASA, FAA, IOSA, Kalitta, Atlas, TACV e Internas</strong>{' '}
              são montadas dinamicamente a partir desta biblioteca central, preservando equivalências técnicas e referências originais.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('montar-auditoria')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              Montar Nova Auditoria
            </button>
            <button
              onClick={handleSeedBanco}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border border-slate-300 dark:border-slate-700"
              title="Garante que todos os 36 critérios canônicos e 177 vínculos estejam gravados no Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar Banco
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMsg && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-sm flex items-center justify-between border ${
              feedbackMsg.tipo === 'sucesso'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : feedbackMsg.tipo === 'erro'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
            }`}
          >
            <span>{feedbackMsg.texto}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPIs DA BIBLIOTECA ÚNICA */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Critérios Canônicos Únicos</span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {criteriosCanônicos.length}
            </span>
            <span className="text-[11px] text-slate-500 block">Consolidados sem duplicação</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Vínculos Normativos</span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {totalVinculosNormativos}
            </span>
            <span className="text-[11px] text-slate-500 block">ANAC, EASA, FAA, Clientes</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Fontes & Autoridades</span>
            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-400">8</span>
            <span className="text-[11px] text-slate-500 block">Regulatórias & Operadores</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Auditorias em Histórico</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
              {execucoes.length}
            </span>
            <span className="text-[11px] text-slate-500 block">Execuções registradas</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Auditorias Concluídas</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {execucoes.filter((e) => e.statusExecucao === 'CONCLUIDA').length}
            </span>
            <span className="text-[11px] text-slate-500 block">Com índice e RNCs</span>
          </div>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('biblioteca-central')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'biblioteca-central'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Biblioteca Central de Critérios ({criteriosCanônicos.length} Canônicos)
          </button>
          <button
            onClick={() => setActiveTab('montar-auditoria')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'montar-auditoria'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Montagem Dinâmica de Auditorias
          </button>
          <button
            onClick={() => setActiveTab('historico-auditorias')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'historico-auditorias'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Histórico de Execuções ({execucoes.length})
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: BIBLIOTECA CENTRAL DE CRITÉRIOS CANÔNICOS                     */}
      {/* ==================================================================== */}
      {activeTab === 'biblioteca-central' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS MULTI-FONTE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar por código (CRIT-CORP-*), pergunta, controle SGQ, norma ou operador..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="TODAS">Todas as Categorias de Processo</option>
                  {categoriasUnicas.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CHIPS DE AUTORIDADES E OPERADORES */}
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Filtrar por Vínculo de Origem (Apenas critérios aplicáveis à fonte):
              </span>
              <div className="flex flex-wrap gap-2">
                {AUTORIDADES_FILTRO.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFiltroAutoridade(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      filtroAutoridade === item.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LISTA DE CRITÉRIOS CANÔNICOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Exibindo <strong>{criteriosFiltradosBiblioteca.length}</strong> de{' '}
                <strong>{criteriosCanônicos.length}</strong> critérios canônicos únicos
              </span>
              <span className="text-xs text-slate-500">
                Cada critério central atende a múltiplas normas e clientes sem duplicação
              </span>
            </div>

            {criteriosFiltradosBiblioteca.map((crit) => (
              <div
                key={crit.id}
                onClick={() => setSelectedCriterioModal(crit)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono">
                        {crit.codigoUnico}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {crit.categoria}
                      </span>
                      {crit.controleCentralId && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {crit.controleCentralId}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          crit.criticidade === 'CRITICA'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : crit.criticidade === 'ALTA'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {crit.criticidade}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {crit.titulo}
                    </h3>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {crit.perguntaOuCriterio}
                    </p>

                    <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <strong className="text-slate-700 dark:text-slate-300">Evidência Esperada:</strong>
                      <span>{crit.orientacaoEvidencia}</span>
                    </div>
                  </div>

                  {/* VÍNCULOS COM AUTORIDADES / CLIENTES (MULTI-FONTE) */}
                  <div className="lg:w-80 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 shrink-0">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                        Vínculos Normativos ({crit.fontesVinculadas.length})
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Ver equivalências</span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {crit.fontesVinculadas.map((fonte, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-1">
                            {fonte.autoridadeOuCliente}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[130px]" title={fonte.itemOuSecaoNorma}>
                            {fonte.itemOuSecaoNorma}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {criteriosFiltradosBiblioteca.length === 0 && (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nenhum critério encontrado</h3>
                <p className="text-sm text-slate-500 mt-1">Ajuste os filtros de autoridade ou termo de busca.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: MONTAGEM DINÂMICA DE AUDITORIAS                               */}
      {/* ==================================================================== */}
      {activeTab === 'montar-auditoria' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                Montagem Dinâmica de Checklist de Auditoria
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Selecione a autoridade reguladora, operador cliente ou escopo. O sistema selecionará automaticamente os critérios canônicos pertinentes da Biblioteca Central Única, permitindo inclusões e exclusões com justificativa técnica rastreável.
              </p>
            </div>

            {/* PASSO 1: SELEÇÃO DA ORIGEM / CLIENTE */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                1. Autoridade, Cliente ou Tipo de Auditoria de Origem:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { id: 'ANAC', label: 'ANAC (RBAC 145/43)', icon: '🏛️', sub: 'Surveillance & Homologação' },
                  { id: 'Kalitta Air', label: 'Kalitta Air (QA-14)', icon: '📦', sub: '69 itens de linha & oficina' },
                  { id: 'EASA', label: 'EASA (Part-145)', icon: '🇪🇺', sub: 'Foreign MRO AMO' },
                  { id: 'FAA', label: 'FAA (Part 145 / BASA)', icon: '🇺🇸', sub: 'Foreign Repair Station' },
                  { id: 'IOSA', label: 'IATA / IOSA (ISM)', icon: '✈️', sub: 'Padrão Setorial MNT/ORG' },
                  { id: 'Atlas Air', label: 'Atlas Air (Q2059)', icon: '🛫', sub: 'Formulário Q2059 de Linha' },
                  { id: 'TACV', label: 'TACV Cabo Verde', icon: '🇨🇻', sub: 'Estação de Linha B737-MAX' },
                  { id: 'IMPACTO SGQ', label: 'Auditoria Interna SGQ', icon: '🏢', sub: 'Sistema e Processos SGQ' },
                  { id: 'MULTI_ORIGEM', label: 'Multi-Origem Personalizada', icon: '⚙️', sub: 'Seleção livre da biblioteca' }
                ].map((origem) => (
                  <button
                    key={origem.id}
                    onClick={() => setBuilderOrigem(origem.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      builderOrigem === origem.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{origem.icon}</div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{origem.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{origem.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* PASSO 2: PARÂMETROS DA AUDITORIA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Número da Auditoria
                </label>
                <input
                  type="text"
                  value={builderNumeroAuditoria}
                  onChange={(e) => setBuilderNumeroAuditoria(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Auditor Líder
                </label>
                <input
                  type="text"
                  value={builderAuditorLider}
                  onChange={(e) => setBuilderAuditorLider(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Base Operacional
                </label>
                <input
                  type="text"
                  value={builderBaseOperacional}
                  onChange={(e) => setBuilderBaseOperacional(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Código do Checklist
                </label>
                <input
                  type="text"
                  value={builderCodigoChecklist}
                  onChange={(e) => setBuilderCodigoChecklist(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            {/* PASSO 3: CRITÉRIOS MONTADOS AUTOMATICAMENTE E AJUSTES DE ESCOPO */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Critérios Selecionados da Biblioteca Central ({criteriosBuilderAtivos.length} Ativos)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Critérios canônicos vinculados à fonte{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{builderOrigem}</strong>. Você pode excluir critérios do escopo ou adicionar itens extras da biblioteca.
                  </span>
                </div>

                <button
                  onClick={() => setModalAdicionarExtraAberto(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  Incluir Critério Extra da Biblioteca
                </button>
              </div>

              {/* LISTA DOS CRITÉRIOS ATIVOS NO CHECKLIST DINÂMICO */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                {criteriosBuilderAtivos.map((crit, idx) => {
                  const isExtra = !!criteriosExtrasBuilder[crit.id];
                  const fontePertinente = crit.fontesVinculadas.find((f) =>
                    f.autoridadeOuCliente.toLowerCase().includes(builderOrigem.toLowerCase())
                  ) || crit.fontesVinculadas[0];

                  return (
                    <div
                      key={crit.id}
                      className="p-3.5 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {crit.codigoUnico}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • {fontePertinente ? `${fontePertinente.normaDocumento} (${fontePertinente.itemOuSecaoNorma})` : crit.categoria}
                          </span>
                          {isExtra && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              EXTRAORDINÁRIO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 pl-8">
                          {crit.perguntaOuCriterio}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          setJustificativaModal({
                            aberto: true,
                            tipo: 'EXCLUIR',
                            criterio: crit,
                            justificativa: ''
                          })
                        }
                        className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 shrink-0"
                        title="Excluir critério deste escopo de auditoria com justificativa"
                      >
                        Excluir do Escopo
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* CRITÉRIOS EXCLUÍDOS COM JUSTIFICATIVA (LOG VISUAL) */}
              {Object.keys(criteriosExcluidosBuilder).length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 block">
                    Critérios Excluídos do Escopo com Justificativa ({Object.keys(criteriosExcluidosBuilder).length}):
                  </span>
                  <div className="space-y-1">
                    {Object.entries(criteriosExcluidosBuilder).map(([cid, just]) => {
                      const c = criteriosCanônicos.find((item) => item.id === cid);
                      return (
                        <div key={cid} className="text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                          <span>
                            <strong>{c?.codigoUnico || cid}</strong>: {just}
                          </span>
                          <button
                            onClick={() => {
                              const copy = { ...criteriosExcluidosBuilder };
                              delete copy[cid];
                              setCriteriosExcluidosBuilder(copy);
                            }}
                            className="text-xs text-blue-600 hover:underline ml-2"
                          >
                            Reverter
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* BOTÃO PARA INICIAR A AUDITORIA */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Ao iniciar, o QualyQuest criará uma execução com snapshot congelado dos critérios e histórico independente.
              </span>
              <button
                onClick={handleIniciarAuditoriaDinamica}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                Iniciar Execução da Auditoria ({criteriosBuilderAtivos.length} Critérios)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: HISTÓRICO DE AUDITORIAS REALIZADAS                            */}
      {/* ==================================================================== */}
      {activeTab === 'historico-auditorias' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-emerald-600" />
              Histórico de Execuções e Auditorias no Firestore
            </h2>
            <p className="text-xs text-slate-500">
              Registros imutáveis de auditorias realizadas. Cada execução mantém o snapshot da versão dos critérios utilizada no momento da avaliação.
            </p>
          </div>

          <div className="space-y-3">
            {execucoes.map((exec) => (
              <div
                key={exec.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {exec.numeroAuditoria}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                        exec.statusExecucao === 'CONCLUIDA'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}
                    >
                      {exec.statusExecucao === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}
                    </span>
                    <span className="text-xs text-slate-500">
                      • Base: <strong>{exec.baseOperacional}</strong>
                    </span>
                    <span className="text-xs text-slate-500">
                      • Auditor: <strong>{exec.auditorLider}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {exec.checklistNome}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <span>Data: {exec.dataAuditoria}</span>
                    <span>Total de Itens: <strong>{exec.totalItens}</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Conformes (C): {exec.totalConforme}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Não Conformes (NC): {exec.totalNaoConforme}
                    </span>
                    <span className="text-slate-500">
                      Não Aplicáveis (NA): {exec.totalNaoAplicavel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Conformidade</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {exec.taxaConformidade}%
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveExecution(exec)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    Abrir Auditoria
                  </button>
                </div>
              </div>
            ))}

            {execucoes.length === 0 && (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nenhuma auditoria realizada ainda</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Vá até a aba &ldquo;Montagem Dinâmica de Auditorias&rdquo; para criar e executar sua primeira auditoria.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL / TELA DE EXECUÇÃO EM TEMPO REAL                                */}
      {/* ==================================================================== */}
      {activeExecution && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* CABEÇALHO DA EXECUÇÃO */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    {activeExecution.numeroAuditoria}
                  </span>
                  <span className="text-xs text-slate-500">
                    Base: <strong>{activeExecution.baseOperacional}</strong>
                  </span>
                  <span className="text-xs text-slate-500">
                    Auditor: <strong>{activeExecution.auditorLider}</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {activeExecution.checklistNome}
                </h2>
              </div>

              {/* PLACAR DE CONFORMIDADE */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Índice de Conformidade</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {activeExecution.taxaConformidade}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSalvarExecucao(false)}
                    disabled={salvandoExecucao || isConsulta}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Rascunho
                  </button>
                  <button
                    onClick={() => handleSalvarExecucao(true)}
                    disabled={salvandoExecucao || isConsulta}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Finalizar Auditoria
                  </button>
                  <button
                    onClick={() => setActiveExecution(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* FILTRO DE ITENS POR STATUS */}
            {(() => {
              const itensAtivosExecucao = (Object.values(activeExecution.itensAvaliados || {}) as ItemAvaliadoExecucaoChecklist[]);
              return (
                <>
                  <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto text-xs">
                    <span className="text-slate-500 font-medium">Filtrar itens:</span>
                    {[
                      { id: 'TODOS', label: `Todos (${itensAtivosExecucao.length})` },
                      {
                        id: 'PENDENTE',
                        label: `Pendentes (${
                          itensAtivosExecucao.filter((i) => i.status === 'PENDENTE').length
                        })`
                      },
                      {
                        id: 'C',
                        label: `Conforme (${
                          itensAtivosExecucao.filter((i) => i.status === 'C').length
                        })`
                      },
                      {
                        id: 'NC',
                        label: `Não Conforme (${
                          itensAtivosExecucao.filter((i) => i.status === 'NC').length
                        })`
                      },
                      {
                        id: 'NA',
                        label: `Não Aplicável (${
                          itensAtivosExecucao.filter((i) => i.status === 'NA').length
                        })`
                      }
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setFiltroStatusItem(st.id as any)}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          filtroStatusItem === st.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* CORPO DOS ITENS DA AUDITORIA */}
                  <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {itensAtivosExecucao
                      .filter((item: ItemAvaliadoExecucaoChecklist) => (filtroStatusItem === 'TODOS' ? true : item.status === filtroStatusItem))
                      .map((item: ItemAvaliadoExecucaoChecklist) => {
                        const critCanônico = criteriosCanônicos.find((c) => c.id === item.criterioId);

                  return (
                    <div
                      key={item.criterioId}
                      className={`p-4 rounded-xl border transition-all ${
                        item.status === 'C'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : item.status === 'NC'
                          ? 'bg-rose-50/50 dark:bg-rose-950/25 border-rose-300 dark:border-rose-800'
                          : item.status === 'NA'
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center justify-center">
                              {item.numeroItem}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {item.codigoUnico || critCanônico?.codigoUnico || item.criterioId}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">
                              {item.referenciaNormativa}
                            </span>
                            {critCanônico?.controleCentralId && (
                              <span className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                [{critCanônico.controleCentralId}]
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {item.perguntaOuCriterio}
                          </p>

                          {critCanônico && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <strong>Evidência Esperada:</strong> {critCanônico.orientacaoEvidencia}
                            </p>
                          )}
                        </div>

                        {/* BOTÕES C / NC / NA */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSetItemStatus(item.criterioId, 'C')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              item.status === 'C'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            C
                          </button>
                          <button
                            onClick={() => handleSetItemStatus(item.criterioId, 'NC')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              item.status === 'NC'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-rose-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            NC
                          </button>
                          <button
                            onClick={() => handleSetItemStatus(item.criterioId, 'NA')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              item.status === 'NA'
                                ? 'bg-slate-700 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            NA
                          </button>
                        </div>
                      </div>

                      {/* CONSTATAÇÃO E OBSERVAÇÕES DO AUDITOR */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                            Constatação / Observações do Auditor
                          </label>
                          <textarea
                            value={item.observacoesAuditor || ''}
                            onChange={(e) => handleUpdateItemObs(item.criterioId, e.target.value)}
                            placeholder="Descreva a constatação objetiva, referências documentais inspecionadas..."
                            rows={2}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* EVIDÊNCIAS VINCULADAS E ABERTURA DE RNC */}
                        <div className="flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Evidências Corporativas Reutilizadas ({item.evidenciasVinculadasIds?.length || 0})
                            </span>
                            <button
                              onClick={() => setItemParaEvidencias(item)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Vincular Evidência
                            </button>
                          </div>

                          {/* SE ITEM FOR NC: ABERTURA DE RNC OFICIAL */}
                          {item.status === 'NC' && (
                            <div className="p-2.5 bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-lg flex items-center justify-between">
                              <div className="text-xs text-rose-900 dark:text-rose-200">
                                <strong>Constatação NC:</strong> Requer emissão de RNC oficial F 001-29.
                                {item.rncNumero && (
                                  <span className="block font-mono font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                                    Vinculada: {item.rncNumero}
                                  </span>
                                )}
                              </div>
                              {!item.rncNumero ? (
                                <button
                                  onClick={() => handleGerarRNC(item)}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shrink-0 ml-2"
                                >
                                  🚨 Abrir RNC Oficial (F 001-29)
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> RNC Aberta
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE JUSTIFICATIVA TÉCNICA (INCLUIR / EXCLUIR CRITÉRIO)          */}
      {/* ==================================================================== */}
      {justificativaModal.aberto && justificativaModal.criterio && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              {justificativaModal.tipo === 'EXCLUIR'
                ? 'Justificativa de Exclusão do Escopo'
                : 'Justificativa de Inclusão Extraordinária'}
            </h3>

            <p className="text-xs text-slate-500">
              Critério: <strong>{justificativaModal.criterio.codigoUnico}</strong> — {justificativaModal.criterio.titulo}
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Justificativa Técnica Obrigatória:
              </label>
              <textarea
                value={justificativaModal.justificativa}
                onChange={(e) =>
                  setJustificativaModal({ ...justificativaModal, justificativa: e.target.value })
                }
                rows={3}
                placeholder={
                  justificativaModal.tipo === 'EXCLUIR'
                    ? 'Ex: Não aplicável à base de linha por não possuir oficina de ensaios END...'
                    : 'Ex: Exigência contratual específica solicitada pelo auditor sênior...'
                }
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setJustificativaModal({ aberto: false, tipo: 'EXCLUIR', criterio: null, justificativa: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarJustificativa}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Confirmar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE SELEÇÃO DE EVIDÊNCIAS CORPORATIVAS                          */}
      {/* ==================================================================== */}
      {itemParaEvidencias && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-emerald-600" />
                  Vincular Evidência Corporativa Existente
                </h3>
                <span className="text-xs text-slate-500">
                  Item {itemParaEvidencias.numeroItem}: {itemParaEvidencias.perguntaOuCriterio}
                </span>
              </div>
              <button onClick={() => setItemParaEvidencias(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {evidenciasDisponiveis.map((ev) => {
                const isVinculado = (itemParaEvidencias.evidenciasVinculadasIds || []).includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    onClick={() => handleToggleEvidenciaItem(ev.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isVinculado
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 font-medium'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {ev.titulo}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Ref: {ev.numeroReferencia || 'Arquivada'} • {ev.tipo}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        isVinculado
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isVinculado ? 'Vinculada' : 'Vincular'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setItemParaEvidencias(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Concluir Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DETALHES DO CRITÉRIO CANÔNICO DA BIBLIOTECA                    */}
      {/* ==================================================================== */}
      {selectedCriterioModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedCriterioModal.codigoUnico}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedCriterioModal.titulo}
                </h3>
              </div>
              <button onClick={() => setSelectedCriterioModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Pergunta Canônica de Auditoria:
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedCriterioModal.perguntaOuCriterio}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Evidência Objetiva Esperada:
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedCriterioModal.orientacaoEvidencia}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Controle Corporativo SGQ:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedCriterioModal.controleCentralId} — {selectedCriterioModal.controleCentralNome}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Criticidade e Processo:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedCriterioModal.criticidade} • {selectedCriterioModal.processo}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Vínculos Formais com Normas e Clientes ({selectedCriterioModal.fontesVinculadas.length}):
                </span>
                <div className="space-y-2">
                  {selectedCriterioModal.fontesVinculadas.map((fonte, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div>
                        <strong className="text-slate-900 dark:text-white">{fonte.autoridadeOuCliente}</strong>
                        <span className="text-slate-500 ml-1">({fonte.normaDocumento})</span>
                        <div className="text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                          {fonte.itemOuSecaoNorma} • Rev: {fonte.revisaoVigente}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {fonte.obrigatoriedade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedCriterioModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PARA ADICIONAR CRITÉRIO EXTRA NO BUILDER                       */}
      {/* ==================================================================== */}
      {modalAdicionarExtraAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Incluir Critério Extra da Biblioteca Central
                </h3>
                <span className="text-xs text-slate-500">
                  Selecione qualquer critério canônico da base única para adicionar a este checklist.
                </span>
              </div>
              <button onClick={() => setModalAdicionarExtraAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <input
                type="text"
                placeholder="Filtrar por código, título ou pergunta..."
                value={buscaExtra}
                onChange={(e) => setBuscaExtra(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {criteriosCanônicos
                .filter(
                  (c) =>
                    !builderCriteriosIds.includes(c.id) &&
                    (buscaExtra.trim() === '' ||
                      c.codigoUnico.toLowerCase().includes(buscaExtra.toLowerCase()) ||
                      c.titulo.toLowerCase().includes(buscaExtra.toLowerCase()) ||
                      c.perguntaOuCriterio.toLowerCase().includes(buscaExtra.toLowerCase()))
                )
                .map((crit) => (
                  <div
                    key={crit.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {crit.codigoUnico}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {crit.titulo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {crit.perguntaOuCriterio}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setModalAdicionarExtraAberto(false);
                        setJustificativaModal({
                          aberto: true,
                          tipo: 'INCLUIDO_EXTRA',
                          criterio: crit,
                          justificativa: ''
                        });
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0"
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
