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
  ArrowRight,
  FileCheck,
  HelpCircle,
  CheckSquare,
  ShieldAlert,
  CalendarClock,
  UserCheck,
  Activity
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
  CriterioAjusteAuditoria,
  ControleCentralSGQ,
  RequisitoClienteItem,
  RespostaInstitucionalAprovada,
  StatusConformidadeSGQ,
  SituacaoAplicabilidadeImpacto
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
import {
  AUDITORIA_CONSOLIDACAO_DATA,
  ItemAuditoriaConsolidacao,
  TipoRelacionamentoNormativo,
  StatusValidacaoDocumental
} from '../../data/canonicalCriteriaAuditData';
import {
  calcularIndicadoresPainelQualidade,
  getResumoAuditoriaConsolidacao,
  validarAplicabilidadeEvidencia
} from '../../services/continuousComplianceService';
import {
  CONTROLES_CORPORATIVOS_EXPANDIDOS,
  INITIAL_COMPLIANCE_EVIDENCES,
  INITIAL_INSTITUTIONAL_RESPONSES
} from '../../services/corporateComplianceMatrixService';

interface AuditChecklistsLibraryViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  evidenciasDisponiveis?: EvidenciaRequisitoItem[];
  controlesCentrais?: ControleCentralSGQ[];
  requisitosCadastrados?: RequisitoClienteItem[];
  onNavigateToRNC?: (rncId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

const AUTORIDADES_FILTRO = [
  { id: 'TODAS', label: 'Todas as Fontes', icon: '🌐' },
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
  controlesCentrais = CONTROLES_CORPORATIVOS_EXPANDIDOS,
  requisitosCadastrados = [],
  onNavigateToRNC,
  onNavigateToTab
}) => {
  const orgId = organizationId || 'org_impacto_aviation';
  const isConsulta = currentUser?.role === 'CONSULTA' || currentUser?.role === 'VIEWER';

  // Sub-abas principais da visão
  const [activeTab, setActiveTab] = useState<
    'painel-qualidade' | 'auditoria-consolidacao' | 'matriz-controles-ssot' | 'montar-auditoria' | 'historico-auditorias'
  >('painel-qualidade');

  // Estados da Biblioteca Canônica
  const [criteriosCanônicos, setCriteriosCanônicos] = useState<CriterioBibliotecaCorporativa[]>(CANONICAL_CORPORATE_CRITERIA);
  const [execucoes, setExecucoes] = useState<ExecucaoChecklistAuditoria[]>([]);
  const [controlesState, setControlesState] = useState<ControleCentralSGQ[]>(controlesCentrais);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  // Filtros da Auditoria da Consolidação (Fase 1.4.1)
  const [filtroRelacionamento, setFiltroRelacionamento] = useState<string>('TODOS');
  const [buscaConsolidacao, setBuscaConsolidacao] = useState<string>('');
  const [filtroStatusDocumental, setFiltroStatusDocumental] = useState<string>('TODOS');
  const [itemAuditoriaModal, setItemAuditoriaModal] = useState<ItemAuditoriaConsolidacao | null>(null);

  // Filtros da Matriz de Controles SSoT
  const [filtroControleStatusConf, setFiltroControleStatusConf] = useState<string>('TODOS');
  const [filtroControleProcesso, setFiltroControleProcesso] = useState<string>('TODOS');
  const [buscaControle, setBuscaControle] = useState<string>('');
  const [controleSelecionadoModal, setControleSelecionadoModal] = useState<ControleCentralSGQ | null>(null);

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

  // Modal de justificativa
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

  // Modal Adicionar Extra
  const [modalAdicionarExtraAberto, setModalAdicionarExtraAberto] = useState(false);
  const [buscaExtra, setBuscaExtra] = useState('');

  // Execução Ativa
  const [activeExecution, setActiveExecution] = useState<ExecucaoChecklistAuditoria | null>(null);
  const [filtroStatusItem, setFiltroStatusItem] = useState<'TODOS' | 'PENDENTE' | 'C' | 'NC' | 'NA'>('TODOS');
  const [salvandoExecucao, setSalvandoExecucao] = useState(false);
  const [itemParaEvidencias, setItemParaEvidencias] = useState<ItemAvaliadoExecucaoChecklist | null>(null);

  // Escutar Biblioteca Canônica e Execuções
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

  // Cálculo dos Indicadores do Painel de Trabalho da Qualidade
  const indicadoresQualidade = useMemo(() => {
    return calcularIndicadoresPainelQualidade(
      controlesState,
      requisitosCadastrados,
      evidenciasDisponiveis,
      INITIAL_INSTITUTIONAL_RESPONSES
    );
  }, [controlesState, requisitosCadastrados, evidenciasDisponiveis]);

  // Resumo da Auditoria de Consolidação (Fase 1.4.1)
  const resumoConsolidacao = useMemo(() => {
    return getResumoAuditoriaConsolidacao();
  }, []);

  // Itens filtrados da Auditoria de Consolidação
  const itensConsolidacaoFiltrados = useMemo(() => {
    return AUDITORIA_CONSOLIDACAO_DATA.filter((item) => {
      const matchRel = filtroRelacionamento === 'TODOS' || item.tipoRelacionamento === filtroRelacionamento;
      const matchDoc = filtroStatusDocumental === 'TODOS' || item.statusValidacaoDocumental === filtroStatusDocumental;
      const matchBusca =
        !buscaConsolidacao.trim() ||
        item.idOriginal.toLowerCase().includes(buscaConsolidacao.toLowerCase()) ||
        item.empresaOuAutoridade.toLowerCase().includes(buscaConsolidacao.toLowerCase()) ||
        item.normaSecao.toLowerCase().includes(buscaConsolidacao.toLowerCase()) ||
        item.textoOriginal.toLowerCase().includes(buscaConsolidacao.toLowerCase()) ||
        item.criterioCanonicoAssociado.toLowerCase().includes(buscaConsolidacao.toLowerCase()) ||
        item.controleCentralId.toLowerCase().includes(buscaConsolidacao.toLowerCase());
      return matchRel && matchDoc && matchBusca;
    });
  }, [filtroRelacionamento, filtroStatusDocumental, buscaConsolidacao]);

  // Controles filtrados na Matriz SSoT
  const controlesFiltrados = useMemo(() => {
    return controlesState.filter((ctrl) => {
      const matchConf = filtroControleStatusConf === 'TODOS' || ctrl.statusConformidade === filtroControleStatusConf;
      const matchProc = filtroControleProcesso === 'TODOS' || ctrl.processoRelacionado === filtroControleProcesso;
      const matchBusca =
        !buscaControle.trim() ||
        ctrl.codigo.toLowerCase().includes(buscaControle.toLowerCase()) ||
        ctrl.nome.toLowerCase().includes(buscaControle.toLowerCase()) ||
        ctrl.responsavelPadrao.toLowerCase().includes(buscaControle.toLowerCase()) ||
        (ctrl.documentosInternosRelacionados || []).some((d) => d.toLowerCase().includes(buscaControle.toLowerCase()));
      return matchConf && matchProc && matchBusca;
    });
  }, [controlesState, filtroControleStatusConf, filtroControleProcesso, buscaControle]);

  // Processos únicos de controles
  const processosUnicosControles = useMemo(() => {
    const set = new Set<string>();
    controlesState.forEach((c) => {
      if (c.processoRelacionado) set.add(c.processoRelacionado);
    });
    return Array.from(set).sort();
  }, [controlesState]);

  // Critérios ativos no builder dinâmico
  const criteriosBuilderAtivos = useMemo(() => {
    const list: CriterioBibliotecaCorporativa[] = [];
    builderCriteriosIds.forEach((id) => {
      if (!criteriosExcluidosBuilder[id]) {
        const c = criteriosCanônicos.find((item) => item.id === id);
        if (c) list.push(c);
      }
    });
    Object.keys(criteriosExtrasBuilder).forEach((extraId) => {
      if (!builderCriteriosIds.includes(extraId)) {
        const c = criteriosCanônicos.find((item) => item.id === extraId);
        if (c) list.push(c);
      }
    });
    return list;
  }, [criteriosCanônicos, builderCriteriosIds, criteriosExcluidosBuilder, criteriosExtrasBuilder]);

  // Seeding do banco
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

  // Confirmar inclusão/exclusão com justificativa
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

  // Iniciar Auditoria
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

  // Vincular evidência corporativa com verificação de aplicabilidade e validade
  const handleToggleEvidenciaItem = (evidencia: EvidenciaRequisitoItem) => {
    if (!activeExecution || !itemParaEvidencias || isConsulta) return;
    const cid = itemParaEvidencias.criterioId;
    const itemAtual = activeExecution.itensAvaliados[cid];
    if (!itemAtual) return;

    // Validação formal da evidência (Seção 6 e 8)
    const validacao = validarAplicabilidadeEvidencia(evidencia, {
      baseOperacional: activeExecution.baseOperacional,
      clienteOuAutoridade: activeExecution.origemNome || 'GERAL'
    });

    if (!validacao.valida) {
      alert(`Atenção: ${validacao.motivo}`);
      return;
    }

    const idsAtuais = itemAtual.evidenciasVinculadasIds || [];
    const novosIds = idsAtuais.includes(evidencia.id)
      ? idsAtuais.filter((id) => id !== evidencia.id)
      : [...idsAtuais, evidencia.id];

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
      {/* CABEÇALHO DA BIBLIOTECA CENTRAL E GESTÃO CONTÍNUA (FASE 1.4.1)       */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gestão Contínua da Conformidade & Auditoria SSoT
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Fase 1.4.1 • Rastreabilidade Ponta a Ponta
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Biblioteca Corporativa Central de Requisitos e Auditorias
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-4xl">
              Gestão contínua da conformidade da IMPACTO Aviation MRO. Mapeia controles permanentes (`CTRL-*`), respostas institucionais aprovadas e requisitos individuais rastreáveis da ANAC, EASA, FAA, IOSA, Kalitta, Atlas e TACV, com montagem dinâmica de checklists e snapshots históricos imutáveis.
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
              title="Garante que todos os critérios canônicos e vínculos estejam persistidos no Firestore"
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

        {/* NAVEGAÇÃO DE SUB-ABAS (5 ABAS PRINCIPAIS) */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('painel-qualidade')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'painel-qualidade'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Painel Contínuo da Qualidade
          </button>
          <button
            onClick={() => setActiveTab('auditoria-consolidacao')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'auditoria-consolidacao'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Auditoria da Consolidação & Rastreabilidade (177 Itens)
          </button>
          <button
            onClick={() => setActiveTab('matriz-controles-ssot')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'matriz-controles-ssot'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Matriz de Controles Corporativos (SSoT)
          </button>
          <button
            onClick={() => setActiveTab('montar-auditoria')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
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
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'historico-auditorias'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Histórico de Execuções ({execucoes.length})
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ABA 1: PAINEL CONTÍNUO DA QUALIDADE (QUALITY COMPLIANCE DASHBOARD)   */}
      {/* ==================================================================== */}
      {activeTab === 'painel-qualidade' && (
        <div className="space-y-6">
          {/* CARDS DE INDICADORES EM TEMPO REAL */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Sem Responsável</span>
              <span className="text-xl font-bold text-amber-600">
                {indicadoresQualidade.controlesSemResponsavel}
              </span>
              <span className="text-[10px] text-slate-400 block">Controles órfãos</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Sem Aplicabilidade</span>
              <span className="text-xl font-bold text-indigo-600">
                {indicadoresQualidade.requisitosSemAplicabilidade}
              </span>
              <span className="text-[10px] text-slate-400 block">Requisitos pendentes</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Não Avaliados</span>
              <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
                {indicadoresQualidade.requisitosNaoAvaliadosConformidade}
              </span>
              <span className="text-[10px] text-slate-400 block">Conformidade pendente</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Controles NC</span>
              <span className="text-xl font-bold text-rose-600">
                {indicadoresQualidade.controlesNaoConformes}
              </span>
              <span className="text-[10px] text-slate-400 block">Requerem RNC</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Evidências Ausentes</span>
              <span className="text-xl font-bold text-orange-600">
                {indicadoresQualidade.evidenciasAusentes}
              </span>
              <span className="text-[10px] text-slate-400 block">Sem comprovação</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Evidências Vencidas</span>
              <span className="text-xl font-bold text-rose-500">
                {indicadoresQualidade.evidenciasVencidas}
              </span>
              <span className="text-[10px] text-slate-400 block">Data expirada</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Avaliações Vencidas</span>
              <span className="text-xl font-bold text-red-600">
                {indicadoresQualidade.avaliacoesPeriodicasVencidas}
              </span>
              <span className="text-[10px] text-slate-400 block">Prazo periódico</span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <span className="text-[11px] text-slate-500 block truncate">Pendente Doc.</span>
              <span className="text-xl font-bold text-purple-600">
                {indicadoresQualidade.registrosPendentesDocumentacao}
              </span>
              <span className="text-[10px] text-slate-400 block">Ex: TACV / IOSA</span>
            </div>
          </div>

          {/* PAINEL DE AÇÃO IMEDIATA DA GERÊNCIA DA QUALIDADE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertas Críticos de Acompanhamento Contínuo
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900 dark:text-amber-200">Reavaliações Periódicas SGQ:</strong>
                    <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                      Os controles corporativos possuem ciclo de verificação (mensal, trimestral ou semestral). Mantenha as datas atualizadas no Firestore antes das inspeções externas.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-900 dark:text-blue-200">Separação Estrita de Status:</strong>
                    <p className="text-blue-800 dark:text-blue-300 mt-0.5">
                      No QualyQuest, <strong>Aplicabilidade</strong> e <strong>Conformidade</strong> são campos independentes. A ausência de evidência nunca é tratada como conformidade presumida.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Diferenças Críticas Identificadas na Auditoria
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white">CRIT-CORP-025 (Liberação CLA / EASA / FAA):</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    CLA ANAC F 001-021, EASA Form 1 e FAA 8130-3 <strong>NÃO SÃO INTERCAMBIÁVEIS</strong>. Cada um é um ato legal de autoridade distinta sob acordos bilaterais específicos.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white">CRIT-CORP-011 (Calibração NIST vs RBC):</strong>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Clientes FAR 121 (Kalitta/Atlas) e FAA exigem calibração NIST e etiquetas físicas em língua inglesa com datas legíveis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 2: AUDITORIA DA CONSOLIDAÇÃO & RASTREABILIDADE (177 REGISTROS)   */}
      {/* ==================================================================== */}
      {activeTab === 'auditoria-consolidacao' && (
        <div className="space-y-4">
          {/* RESUMO ESTATÍSTICO DA AUDITORIA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Matriz de Auditoria da Consolidação Normativa (177 Registros Originais)
            </h2>
            <p className="text-xs text-slate-500">
              Rastreabilidade individual de cada requisito dos 11 checklists originais. Demonstra o tipo de relacionamento técnico com os critérios canônicos e controles SGQ, sem presumir equivalência indevida.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <span className="text-slate-500 block">Equivalentes</span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {resumoConsolidacao.equivalentes}
                </span>
                <span className="text-[10px] text-slate-400 block">Mesmo teor técnico</span>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                <span className="text-slate-500 block">Parcialmente Equivalentes</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {resumoConsolidacao.parcialmenteEquivalentes}
                </span>
                <span className="text-[10px] text-slate-400 block">Nuances de escopo/prazo</span>
              </div>

              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl">
                <span className="text-slate-500 block">Relacionados, Não Equivalentes</span>
                <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {resumoConsolidacao.relacionadosNaoEquivalentes}
                </span>
                <span className="text-[10px] text-slate-400 block">Mesmo tema, base distinta</span>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                <span className="text-slate-500 block">Específicos da Fonte</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {resumoConsolidacao.especificosDaFonte}
                </span>
                <span className="text-[10px] text-slate-400 block">RII, NIST, GMM, CLA</span>
              </div>

              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
                <span className="text-slate-500 block">Pendente de Validação</span>
                <span className="text-lg font-bold text-rose-700 dark:text-rose-400">
                  {resumoConsolidacao.naoDeterminadoOuPendente}
                </span>
                <span className="text-[10px] text-slate-400 block">Ex: TACV B737-MAX</span>
              </div>
            </div>
          </div>

          {/* FILTROS DA MATRIZ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filtrar por código original (ex: QA14-01, CRIT-RBAC145-22), texto, norma ou controle..."
                value={buscaConsolidacao}
                onChange={(e) => setBuscaConsolidacao(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <select
              value={filtroRelacionamento}
              onChange={(e) => setFiltroRelacionamento(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            >
              <option value="TODOS">Todos os Relacionamentos</option>
              <option value="Equivalente">Equivalente</option>
              <option value="Parcialmente equivalente">Parcialmente equivalente</option>
              <option value="Relacionado, mas não equivalente">Relacionado, mas não equivalente</option>
              <option value="Específico da fonte">Específico da fonte</option>
              <option value="Não foi possível determinar">Não foi possível determinar / Pendente</option>
            </select>

            <select
              value={filtroStatusDocumental}
              onChange={(e) => setFiltroStatusDocumental(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            >
              <option value="TODOS">Todas as Validações Documentais</option>
              <option value="VALIDADO_OFICIAL">Validado Oficial</option>
              <option value="PENDENTE_VALIDACAO_DOCUMENTAL">Pendente de Validação Documental</option>
            </select>
          </div>

          {/* TABELA DE RASTREABILIDADE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3">Código Original</th>
                    <th className="p-3">Fonte / Empresa</th>
                    <th className="p-3">Norma & Seção</th>
                    <th className="p-3">Texto Original Inalterado</th>
                    <th className="p-3">Controle SGQ</th>
                    <th className="p-3">Classificação</th>
                    <th className="p-3">Justificativa Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {itensConsolidacaoFiltrados.map((item) => (
                    <tr
                      key={item.idOriginal}
                      onClick={() => setItemAuditoriaModal(item)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.idOriginal}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {item.empresaOuAutoridade}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.normaSecao}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={item.textoOriginal}>
                        {item.textoOriginal}
                      </td>
                      <td className="p-3 font-mono font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {item.controleCentralId}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.tipoRelacionamento === 'Equivalente'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : item.tipoRelacionamento === 'Parcialmente equivalente'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                              : item.tipoRelacionamento === 'Específico da fonte'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                              : item.tipoRelacionamento === 'Não foi possível determinar'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                          }`}
                        >
                          {item.tipoRelacionamento}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.justificativaTecnica}>
                        {item.justificativaTecnica}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 3: MATRIZ DE CONTROLES CORPORATIVOS SSoT                         */}
      {/* ==================================================================== */}
      {activeTab === 'matriz-controles-ssot' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-emerald-600" />
              Controles Corporativos Centrais do SGQ (Single Source of Truth)
            </h2>
            <p className="text-xs text-slate-500">
              Cada controle central gerencia múltiplos requisitos individuais de diferentes autoridades e clientes. Mantém dois status independentes: <strong>Aplicabilidade</strong> e <strong>Conformidade</strong>.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar controle por código (ex: CTRL-METROL-01, CTRL-CRS-01), nome ou responsável..."
                value={buscaControle}
                onChange={(e) => setBuscaControle(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <select
              value={filtroControleStatusConf}
              onChange={(e) => setFiltroControleStatusConf(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            >
              <option value="TODOS">Todos os Status de Conformidade</option>
              <option value="CONFORME">Conforme</option>
              <option value="PARCIALMENTE_CONFORME">Parcialmente Conforme</option>
              <option value="NAO_CONFORME">Não Conforme</option>
              <option value="AGUARDANDO_EVIDENCIA">Aguardando Evidência</option>
            </select>

            <select
              value={filtroControleProcesso}
              onChange={(e) => setFiltroControleProcesso(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
            >
              <option value="TODOS">Todos os Processos</option>
              {processosUnicosControles.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* LISTA DE CONTROLES SSoT */}
          <div className="space-y-3">
            {controlesFiltrados.map((ctrl) => (
              <div
                key={ctrl.id}
                onClick={() => setControleSelecionadoModal(ctrl)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 rounded-2xl p-5 shadow-sm transition-all cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {ctrl.codigo}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {ctrl.processoRelacionado || ctrl.moduloOrigem}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ctrl.statusConformidade === 'CONFORME'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                        }`}
                      >
                        {ctrl.statusConformidade || 'CONFORME'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Avaliação: {ctrl.periodicidadeAcompanhamento || 'MENSAL'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {ctrl.nome}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {ctrl.descricao}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-500">
                      <span>Responsável: <strong>{ctrl.responsavelPadrao}</strong></span>
                      <span>Próxima Avaliação: <strong>{ctrl.dataProximaAvaliacao || '2026-12-01'}</strong></span>
                      <span>Doc. Interno: <strong>{ctrl.documentosInternosRelacionados?.[0] || 'MOMQ MNT-001'}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                      Ver Requisitos & Evidências <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ABA 4: MONTAGEM DINÂMICA DE AUDITORIAS                               */}
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
                Selecione a fonte ou cliente. O sistema selecionará automaticamente os critérios canônicos da base única, permitindo inclusões e exclusões de escopo com justificativa técnica rastreável.
              </p>
            </div>

            {/* SELEÇÃO DA ORIGEM */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                1. Autoridade ou Cliente para Auditoria:
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

            {/* DADOS DA AUDITORIA */}
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

            {/* CRITÉRIOS MONTADOS AUTOMATICAMENTE */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Critérios Selecionados da Biblioteca Central ({criteriosBuilderAtivos.length} Ativos)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Critérios canônicos vinculados à fonte{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{builderOrigem}</strong>.
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

              {/* LISTA DOS CRITÉRIOS ATIVOS */}
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

              {/* CRITÉRIOS EXCLUÍDOS COM JUSTIFICATIVA */}
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
                Ao iniciar, o QualyQuest gerará uma execução congelada imutável no Firestore.
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
      {/* ABA 5: HISTÓRICO DE AUDITORIAS CONCLUÍDAS E EM ANDAMENTO            */}
      {/* ==================================================================== */}
      {activeTab === 'historico-auditorias' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Histórico de Auditorias Congelado (Imutável)
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
                      C: {exec.totalConforme}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      NC: {exec.totalNaoConforme}
                    </span>
                    <span className="text-slate-500">
                      NA: {exec.totalNaoAplicavel}
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
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
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
      {/* MODAL DETALHES DE ITEM DA AUDITORIA DA CONSOLIDAÇÃO                  */}
      {/* ==================================================================== */}
      {itemAuditoriaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {itemAuditoriaModal.idOriginal} • {itemAuditoriaModal.empresaOuAutoridade}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {itemAuditoriaModal.normaSecao}
                </h3>
              </div>
              <button onClick={() => setItemAuditoriaModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Texto Original Inalterado da Norma / Checklist:
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl leading-relaxed font-mono">
                  &ldquo;{itemAuditoriaModal.textoOriginal}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Classificação de Equivalência:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {itemAuditoriaModal.tipoRelacionamento}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Controle Corporativo SGQ:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm font-mono">
                    {itemAuditoriaModal.controleCentralId}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Justificativa Técnica da Relação:
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {itemAuditoriaModal.justificativaTecnica}
                </p>
              </div>

              {itemAuditoriaModal.diferencaCritica && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
                  <strong className="text-amber-900 dark:text-amber-200 block mb-0.5">Diferença Crítica / Nuance Identificada:</strong>
                  <p className="text-amber-800 dark:text-amber-300">
                    {itemAuditoriaModal.diferencaCritica}
                  </p>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Revisão Oficial da Fonte:
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-mono">
                  {itemAuditoriaModal.revisaoFonte}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Documento Interno da IMPACTO:
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  {itemAuditoriaModal.documentoInternoImpacto || 'MOMQ MNT-001 / PTM MNT-002'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setItemAuditoriaModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DETALHES DE CONTROLE CORPORATIVO SSoT                          */}
      {/* ==================================================================== */}
      {controleSelecionadoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {controleSelecionadoModal.codigo}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {controleSelecionadoModal.nome}
                </h3>
              </div>
              <button onClick={() => setControleSelecionadoModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Responsável:</span>
                  <strong className="text-slate-900 dark:text-white">{controleSelecionadoModal.responsavelPadrao}</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Processo:</span>
                  <strong className="text-slate-900 dark:text-white">{controleSelecionadoModal.processoRelacionado || 'SGQ'}</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Conformidade:</span>
                  <strong className="text-emerald-600">{controleSelecionadoModal.statusConformidade || 'CONFORME'}</strong>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="text-slate-500 block">Próxima Avaliação:</span>
                  <strong className="text-slate-900 dark:text-white">{controleSelecionadoModal.dataProximaAvaliacao || '2026-12-01'}</strong>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Documentos Internos Controlados da IMPACTO:
                </span>
                <div className="space-y-1">
                  {(controleSelecionadoModal.documentosInternosRelacionados || ['MOMQ MNT-001']).map((docNome, i) => (
                    <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                      📄 {docNome}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Evidências Típicas Esperadas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(controleSelecionadoModal.evidenciasTipicas || []).map((ev, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ✓ {ev}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Requisitos de Fontes Relacionados a este Controle:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.controleCentralId === controleSelecionadoModal.codigo).map((item) => (
                    <div key={item.idOriginal} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900 dark:text-white">{item.empresaOuAutoridade}:</strong> {item.normaSecao}
                        <span className="text-slate-500 block truncate max-w-md">{item.textoOriginal}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        {item.tipoRelacionamento}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setControleSelecionadoModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                Fechar Controle
              </button>
            </div>
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
      {/* MODAL DE SELEÇÃO DE EVIDÊNCIAS COM VALIDAÇÃO DE APLICABILIDADE      */}
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
                    onClick={() => handleToggleEvidenciaItem(ev)}
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
                        Ref: {ev.numeroReferencia || 'Arquivada'} • {ev.tipo} • Validade: {ev.dataValidade || 'Permanente'}
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
