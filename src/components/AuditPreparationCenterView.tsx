import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit3,
  FileDown,
  FileText,
  FolderOpen,
  History,
  Loader2,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { auth } from '../services/firebase/config';
import {
  canUserDeleteAuditPrep,
  canUserDeleteOrApproveAuditPrep,
  canUserWriteAuditPrep,
  deleteAuditPrepAndItems,
  deleteAuditPrepItem,
  saveAuditPrep,
  saveAuditPrepItem,
  saveAuditPrepItemsBatch,
  subscribeToAuditPrepItems,
  subscribeToAuditPreparations,
  toggleArchiveAuditPrep,
} from '../services/firebase/auditPrepFirestore';
import { getEvidenceFileUrl } from '../services/evidenceStorageService';
import {
  SITUACAO_LABELS,
  exportAuditPrepToDocx,
  exportAuditPrepToPdf,
} from '../utils/auditPrepReportGenerator';
import {
  AuditoriaPreparacao,
  EvidenciaVinculadaPrep,
  FonteImportacaoItemPrep,
  HistoricoAlteracaoItemPrep,
  ItemAuditoriaPreparacao,
  SituacaoItemAuditoriaPrep,
  SugestaoIAAuditoriaPrep,
  TipoAuditoriaPreparacao,
  calcularResumoAuditoriaPrep,
  isItemRespondidoPrep,
} from '../types/auditPrep';
import type {
  AuditoriaExternaRecord,
  DocumentoControlado,
  FerramentaCalibracao,
  ManualRecord,
  NCRecord,
  OrganizationRecord,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  RevisaoDocumental,
  UserProfile,
} from '../types';
import type { RequisitoAuditoriaExterna } from '../types/auditRequirements';
import {
  AuditFormModal,
  AuditImportModal,
  ConfirmActionModal,
  EvidencePickerModal,
  ExistingItemsMatchModal,
  ImportedItemDraft,
  PreviousAuditsSearchModal,
} from './audit-prep/AuditPrepModals';
import type { MatchConfidenceType, PreviousItemCandidate } from '../utils/auditPrepMatcher';

export interface AuditPreparationCenterViewProps {
  activeOrganization: OrganizationRecord | null;
  userProfile?: UserProfile | null;
  documentosControlados: DocumentoControlado[];
  revisoesDocumentais?: RevisaoDocumental[];
  manuals: ManualRecord[];
  trainingRecords: RegistroTreinamentoColaborador[];
  qualifications: QualificacaoColaborador[];
  ferramentasCalibradas: FerramentaCalibracao[];
  records: NCRecord[];
  externalAudits?: AuditoriaExternaRecord[];
  auditRequirements?: RequisitoAuditoriaExterna[];
  onNavigateToTab?: (tab: string) => void;
}

type MainArea = 'AUDITORIAS' | 'ITENS' | 'RELATORIO';

const SITUACAO_CHOICE_OPTIONS: Array<{
  value: 'ATENDIDO' | 'NAO_ATENDIDO' | 'NAO_APLICAVEL';
  label: string;
  activeClass: string;
  idleClass: string;
}> = [
  {
    value: 'ATENDIDO',
    label: 'Conforme',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    idleClass:
      'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400',
  },
  {
    value: 'NAO_ATENDIDO',
    label: 'Não Conforme',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs',
    idleClass:
      'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-500 hover:text-rose-700 dark:hover:text-rose-400',
  },
  {
    value: 'NAO_APLICAVEL',
    label: 'Não Aplicável',
    activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs',
    idleClass:
      'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
  },
];

const SITUACAO_OPTIONS: Array<{ value: SituacaoItemAuditoriaPrep; label: string }> = [
  { value: 'PENDENTE_DE_AVALIACAO', label: 'Pendente de Avaliação' },
  { value: 'ATENDIDO', label: 'Conforme' },
  { value: 'NAO_ATENDIDO', label: 'Não Conforme' },
  { value: 'NAO_APLICAVEL', label: 'Não Aplicável' },
];

const TIPOS_FILTRO: Array<'TODOS' | TipoAuditoriaPreparacao> = [
  'TODOS',
  'ANAC',
  'EASA',
  'FAA',
  'IOSA',
  'Cliente',
  'Auditoria Interna',
  'Outros',
];

function formatDateBr(iso?: string): string {
  if (!iso) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('pt-BR');
}

function formatDateTimeBr(iso?: string): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('pt-BR');
}

function getSituacaoTextClass(sit: SituacaoItemAuditoriaPrep): string {
  switch (sit) {
    case 'ATENDIDO':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'PARCIALMENTE_ATENDIDO':
      return 'text-amber-700 dark:text-amber-400';
    case 'NAO_ATENDIDO':
      return 'text-rose-700 dark:text-rose-400';
    case 'NAO_APLICAVEL':
      return 'text-slate-500 dark:text-slate-400';
    default:
      return 'text-slate-700 dark:text-slate-300';
  }
}

export const AuditPreparationCenterView: React.FC<AuditPreparationCenterViewProps> = ({
  activeOrganization,
  userProfile,
  documentosControlados,
  revisoesDocumentais = [],
  manuals,
  trainingRecords,
  qualifications,
  ferramentasCalibradas,
  records,
  auditRequirements = [],
}) => {
  const orgId = activeOrganization?.id || userProfile?.organizationId || 'org_impacto_aviation';
  const orgName = activeOrganization?.name || 'IMPACTO AVIATION MRO';
  const actorUid = userProfile?.uid || auth.currentUser?.uid || 'local_user';
  const actorName = userProfile?.displayName || userProfile?.email || auth.currentUser?.email || 'Qualidade IMPACTO';

  const canWrite = canUserWriteAuditPrep(userProfile);
  const canApprove = canUserDeleteOrApproveAuditPrep(userProfile);
  const canDelete = canUserDeleteAuditPrep(userProfile);

  // Estado principal das 3 áreas
  const [activeArea, setActiveArea] = useState<MainArea>('AUDITORIAS');
  const [audits, setAudits] = useState<AuditoriaPreparacao[]>([]);
  const [allItems, setAllItems] = useState<ItemAuditoriaPreparacao[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Filtros Área A
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<'TODOS' | TipoAuditoriaPreparacao>('TODOS');
  const [showArchived, setShowArchived] = useState(false);

  // Filtros Área B
  const [itemSearch, setItemSearch] = useState('');
  const [itemSituacaoFilter, setItemSituacaoFilter] = useState<'TODOS' | SituacaoItemAuditoriaPrep>('TODOS');

  // Modais e feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<AuditoriaPreparacao | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExistingMatchOpen, setIsExistingMatchOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isPreviousSearchOpen, setIsPreviousSearchOpen] = useState(false);
  const [previousSearchForCurrentItem, setPreviousSearchForCurrentItem] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Editor do Item (Área B)
  const [isCreatingManualItem, setIsCreatingManualItem] = useState(false);
  const [draftNumero, setDraftNumero] = useState('');
  const [draftPergunta, setDraftPergunta] = useState('');
  const [draftReferencia, setDraftReferencia] = useState('');
  const [draftResposta, setDraftResposta] = useState('');
  const [draftEvidencias, setDraftEvidencias] = useState<EvidenciaVinculadaPrep[]>([]);
  const [draftSituacao, setDraftSituacao] = useState<SituacaoItemAuditoriaPrep>('PENDENTE_DE_AVALIACAO');
  const [draftObservacoes, setDraftObservacoes] = useState('');
  const [draftSugestaoIA, setDraftSugestaoIA] = useState<SugestaoIAAuditoriaPrep | undefined>(undefined);
  const [draftReutilizadaDe, setDraftReutilizadaDe] = useState<ItemAuditoriaPreparacao['reutilizadaDe']>(undefined);
  const [draftOrigemResposta, setDraftOrigemResposta] =
    useState<ItemAuditoriaPreparacao['origemResposta']>('NAO_PREENCHIDA');
  const [draftValidadoQualidade, setDraftValidadoQualidade] = useState(false);

  const [savingItem, setSavingItem] = useState(false);
  const [loadingAiSuggestion, setLoadingAiSuggestion] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Chaves locais para uso offline/demo quando sem login Firebase
  const localAuditsKey = `qualyquest_audit_prep_${orgId}_audits`;
  const localItemsKey = `qualyquest_audit_prep_${orgId}_items`;

  useEffect(() => {
    let unsubAudits = () => {};
    let unsubItems = () => {};

    if (auth.currentUser) {
      setLoadingData(true);
      let auditsLoaded = false;
      let itemsLoaded = false;
      const checkDone = () => {
        if (auditsLoaded && itemsLoaded) setLoadingData(false);
      };

      unsubAudits = subscribeToAuditPreparations(
        orgId,
        (list) => {
          setAudits(list);
          auditsLoaded = true;
          checkDone();
        },
        () => {
          auditsLoaded = true;
          checkDone();
        }
      );

      unsubItems = subscribeToAuditPrepItems(
        orgId,
        (list) => {
          setAllItems(list);
          itemsLoaded = true;
          checkDone();
        },
        () => {
          itemsLoaded = true;
          checkDone();
        }
      );
    } else {
      try {
        const storedA = localStorage.getItem(localAuditsKey);
        const storedI = localStorage.getItem(localItemsKey);
        setAudits(storedA ? JSON.parse(storedA) : []);
        setAllItems(storedI ? JSON.parse(storedI) : []);
      } catch {
        setAudits([]);
        setAllItems([]);
      }
      setLoadingData(false);
    }

    return () => {
      unsubAudits();
      unsubItems();
    };
  }, [orgId, auth.currentUser?.uid]);

  const persistLocalFallback = (nextAudits?: AuditoriaPreparacao[], nextItems?: ItemAuditoriaPreparacao[]) => {
    if (auth.currentUser) return;
    try {
      if (nextAudits) localStorage.setItem(localAuditsKey, JSON.stringify(nextAudits));
      if (nextItems) localStorage.setItem(localItemsKey, JSON.stringify(nextItems));
    } catch {
      // ignora erro de quota localStorage
    }
  };

  // Auditoria selecionada e seus itens
  const selectedAudit = useMemo(
    () => audits.find((a) => a.id === selectedAuditId) || null,
    [audits, selectedAuditId]
  );

  const itemsByAudit = useMemo(() => {
    const map = new Map<string, ItemAuditoriaPreparacao[]>();
    allItems.forEach((it) => {
      const arr = map.get(it.auditId) || [];
      arr.push(it);
      map.set(it.auditId, arr);
    });
    return map;
  }, [allItems]);

  const selectedAuditItems = useMemo(() => {
    if (!selectedAuditId) return [];
    return (itemsByAudit.get(selectedAuditId) || []).slice().sort((a, b) => {
      if ((a.ordem ?? 0) !== (b.ordem ?? 0)) return (a.ordem ?? 0) - (b.ordem ?? 0);
      return (a.numeroItem || '').localeCompare(b.numeroItem || '', undefined, { numeric: true });
    });
  }, [itemsByAudit, selectedAuditId]);

  const selectedAuditResumo = useMemo(
    () => calcularResumoAuditoriaPrep(selectedAuditItems),
    [selectedAuditItems]
  );

  const selectedItem = useMemo(
    () => selectedAuditItems.find((it) => it.id === selectedItemId) || null,
    [selectedAuditItems, selectedItemId]
  );

  // Sincroniza rascunho quando usuário seleciona um item diferente
  useEffect(() => {
    if (isCreatingManualItem) return;
    if (!selectedItem) {
      setDraftNumero('');
      setDraftPergunta('');
      setDraftReferencia('');
      setDraftResposta('');
      setDraftEvidencias([]);
      setDraftSituacao('PENDENTE_DE_AVALIACAO');
      setDraftObservacoes('');
      setDraftSugestaoIA(undefined);
      setDraftReutilizadaDe(undefined);
      setDraftOrigemResposta('NAO_PREENCHIDA');
      setDraftValidadoQualidade(false);
      return;
    }
    setDraftNumero(selectedItem.numeroItem);
    setDraftPergunta(selectedItem.perguntaOriginal);
    setDraftReferencia(selectedItem.referenciaNormativa || '');
    setDraftResposta(selectedItem.respostaImpacto || '');
    setDraftEvidencias(selectedItem.evidencias || []);
    setDraftSituacao(selectedItem.situacao);
    setDraftObservacoes(selectedItem.observacoesPendencias || '');
    setDraftSugestaoIA(selectedItem.sugestaoIA);
    setDraftReutilizadaDe(selectedItem.reutilizadaDe);
    setDraftOrigemResposta(selectedItem.origemResposta || 'NAO_PREENCHIDA');
    setDraftValidadoQualidade(Boolean(selectedItem.validadoQualidade));
  }, [selectedItem, isCreatingManualItem]);

  // Pool de evidências reutilizáveis sem duplicação de arquivo
  const existingEvidencesPool = useMemo(() => {
    const auditMap = new Map<string, string>();
    audits.forEach((a) => auditMap.set(a.id, a.nome));
    const list: Array<EvidenciaVinculadaPrep & { origemItemNumero?: string; origemAuditNome?: string }> = [];
    allItems.forEach((it) => {
      (it.evidencias || []).forEach((ev) => {
        list.push({
          ...ev,
          origemItemNumero: it.numeroItem,
          origemAuditNome: auditMap.get(it.auditId),
        });
      });
    });
    return list;
  }, [allItems, audits]);

  // Auditorias filtradas na Área A
  const filteredAudits = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return audits.filter((a) => {
      if (!showArchived && a.arquivada) return false;
      if (auditTypeFilter !== 'TODOS' && a.tipo !== auditTypeFilter) return false;
      if (!q) return true;
      return (
        a.nome.toLowerCase().includes(q) ||
        a.entidade.toLowerCase().includes(q) ||
        a.tipo.toLowerCase().includes(q) ||
        a.responsavelPreparacao.toLowerCase().includes(q)
      );
    });
  }, [audits, showArchived, auditTypeFilter, auditSearch]);

  // Itens filtrados na Área B
  const filteredAuditItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return selectedAuditItems.filter((it) => {
      if (itemSituacaoFilter !== 'TODOS' && it.situacao !== itemSituacaoFilter) return false;
      if (!q) return true;
      return (
        it.numeroItem.toLowerCase().includes(q) ||
        it.perguntaOriginal.toLowerCase().includes(q) ||
        (it.referenciaNormativa || '').toLowerCase().includes(q) ||
        (it.respostaImpacto || '').toLowerCase().includes(q)
      );
    });
  }, [selectedAuditItems, itemSearch, itemSituacaoFilter]);

  // Checklist de prontidão dinâmica (Área C) — clique em uma das 3 opções já conta como resposta e evidência é opcional
  const readinessChecks = useMemo(() => {
    const semResposta = selectedAuditItems.filter((i) => !isItemRespondidoPrep(i));
    const comEvidencia = selectedAuditItems.filter(
      (i) => Boolean(i.evidencias && i.evidencias.length > 0)
    );
    const reutilizadasSemConfirmacao = selectedAuditItems.filter(
      (i) => i.reutilizadaDe && !i.reutilizadaDe.validadeVerificada
    );
    const aguardandoValidacao = selectedAuditItems.filter(
      (i) => isItemRespondidoPrep(i) && !i.validadoQualidade
    );
    const pendenciasAbertas = selectedAuditItems.filter(
      (i) =>
        i.situacao === 'NAO_ATENDIDO' ||
        i.situacao === 'PARCIALMENTE_ATENDIDO' ||
        i.situacao === 'PENDENTE_DE_AVALIACAO' ||
        (i.observacoesPendencias && i.observacoesPendencias.trim().length > 0)
    );
    return {
      semResposta,
      comEvidencia,
      reutilizadasSemConfirmacao,
      aguardandoValidacao,
      pendenciasAbertas,
    };
  }, [selectedAuditItems]);

  // Handlers de Auditoria (Área A)
  const handleSaveAuditForm = async (values: {
    nome: string;
    entidade: string;
    tipo: TipoAuditoriaPreparacao;
    dataAuditoria: string;
    periodo: string;
    responsavelPreparacao: string;
    observacoes: string;
  }) => {
    const now = new Date().toISOString();
    const isNew = !editingAudit;
    const payload: AuditoriaPreparacao = editingAudit
      ? {
          ...editingAudit,
          ...values,
          periodo: values.periodo || undefined,
          observacoes: values.observacoes || undefined,
          atualizadoPorUid: actorUid,
          atualizadoPorNome: actorName,
          updatedAt: now,
        }
      : {
          id: `AUD-PREP-${Date.now()}`,
          organizationId: orgId,
          ...values,
          periodo: values.periodo || undefined,
          observacoes: values.observacoes || undefined,
          status: 'EM_PREPARACAO',
          arquivada: false,
          criadoPorUid: actorUid,
          criadoPorNome: actorName,
          atualizadoPorUid: actorUid,
          atualizadoPorNome: actorName,
          createdAt: now,
          updatedAt: now,
        };

    if (auth.currentUser) {
      await saveAuditPrep(orgId, payload, userProfile, isNew);
    } else {
      const next = [payload, ...audits.filter((a) => a.id !== payload.id)];
      setAudits(next);
      persistLocalFallback(next, undefined);
    }

    setSelectedAuditId(payload.id);
    setFeedback({
      type: 'success',
      text: isNew ? `Auditoria "${payload.nome}" cadastrada.` : `Auditoria "${payload.nome}" atualizada.`,
    });
  };

  const handleToggleArchive = async (audit: AuditoriaPreparacao) => {
    const arquivar = !audit.arquivada;
    try {
      if (auth.currentUser) {
        await toggleArchiveAuditPrep(orgId, audit, arquivar, userProfile);
      } else {
        const now = new Date().toISOString();
        const next = audits.map((a) =>
          a.id === audit.id
            ? {
                ...a,
                arquivada: arquivar,
                status: (arquivar ? 'ARQUIVADA' : 'EM_PREPARACAO') as AuditoriaPreparacao['status'],
                arquivadaEm: arquivar ? now : undefined,
                arquivadaPorNome: arquivar ? actorName : undefined,
                updatedAt: now,
              }
            : a
        );
        setAudits(next);
        persistLocalFallback(next, undefined);
      }
      setFeedback({
        type: 'success',
        text: arquivar
          ? `Auditoria "${audit.nome}" arquivada.`
          : `Auditoria "${audit.nome}" restaurada.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Não foi possível alterar o arquivamento.' });
    }
  };

  const requestDeleteAudit = (audit: AuditoriaPreparacao) => {
    const count = (itemsByAudit.get(audit.id) || []).length;
    setConfirmDialog({
      open: true,
      title: 'Excluir Auditoria',
      message: `Deseja excluir definitivamente "${audit.nome}" (${audit.entidade}) e seus ${count} item(ns) cadastrado(s)? Esta ação não afeta outros módulos do SGQ.`,
      confirmLabel: 'Excluir Auditoria',
      destructive: true,
      onConfirm: async () => {
        if (auth.currentUser) {
          await deleteAuditPrepAndItems(orgId, audit.id, audit.nome, userProfile);
        } else {
          const nextA = audits.filter((a) => a.id !== audit.id);
          const nextI = allItems.filter((it) => it.auditId !== audit.id);
          setAudits(nextA);
          setAllItems(nextI);
          persistLocalFallback(nextA, nextI);
        }
        if (selectedAuditId === audit.id) {
          setSelectedAuditId('');
          setSelectedItemId('');
          setActiveArea('AUDITORIAS');
        }
        setFeedback({ type: 'success', text: `Auditoria "${audit.nome}" excluída.` });
      },
    });
  };

  // Handlers de Importação e Itens (Área B)
  const handleConfirmImport = async (
    drafts: ImportedItemDraft[],
    fonte: FonteImportacaoItemPrep
  ) => {
    if (!selectedAudit) return;
    const now = new Date().toISOString();
    const baseOrder = selectedAuditItems.length;
    let reusedCount = 0;

    const newItems: ItemAuditoriaPreparacao[] = drafts.map((d, idx) => {
      const applyMatch = Boolean(d.applyMatchedAnswer && d.matchedCandidate);
      const cand = applyMatch ? d.matchedCandidate! : undefined;

      const situacaoInicial: SituacaoItemAuditoriaPrep =
        cand && cand.situacao && cand.situacao !== 'PENDENTE_DE_AVALIACAO'
          ? cand.situacao
          : 'PENDENTE_DE_AVALIACAO';

      const respostaInicial = cand ? (cand.resposta || '').trim() : '';

      const evidenciasIniciais: EvidenciaVinculadaPrep[] =
        cand && d.includeMatchedEvidences !== false && cand.evidencias?.length > 0
          ? cand.evidencias.map((ev, evIdx) => ({
              ...ev,
              evidenciaId: `EV-REUSE-${Date.now()}-${idx}-${evIdx}-${Math.random().toString(36).slice(2, 5)}`,
              anexadoEm: now,
              anexadoPorNome: actorName,
            }))
          : [];

      const referenciaInicial =
        d.referenciaNormativa.trim() || (cand ? cand.referenciaNormativa || '' : '');

      const historico: HistoricoAlteracaoItemPrep[] = [
        {
          id: `HIST-${Date.now()}-${idx}`,
          dataHora: now,
          usuarioUid: actorUid,
          usuarioNome: actorName,
          acao: 'CRIACAO',
          situacaoNova: situacaoInicial,
          detalhes: `Item importado de ${fonte.tipo} (${fonte.nomeArquivo || 'arquivo'}).`,
        },
      ];

      if (cand) {
        reusedCount++;
        const tipoMatchLabel =
          d.matchType === 'EXATA'
            ? 'pergunta idêntica'
            : d.matchType === 'SEMANTICA_IA'
              ? 'equivalência semântica'
              : 'pergunta equivalente';
        historico.unshift({
          id: `HIST-REUSE-${Date.now()}-${idx}`,
          dataHora: now,
          usuarioUid: actorUid,
          usuarioNome: actorName,
          acao: 'REUTILIZACAO_AUDITORIA',
          situacaoNova: situacaoInicial,
          detalhes: `Resposta e confirmação (${SITUACAO_LABELS[situacaoInicial]}) trazidas automaticamente de "${cand.auditNome}" · Item ${cand.itemNumero} (${d.matchScore || 0}% · ${tipoMatchLabel}${d.matchReason ? `: ${d.matchReason}` : ''}).`,
        });
      }

      return {
        id: `ITEM-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        organizationId: orgId,
        auditId: selectedAudit.id,
        ordem: baseOrder + idx + 1,
        numeroItem: d.numeroItem.trim() || String(baseOrder + idx + 1),
        perguntaOriginal: d.perguntaOriginal.trim(),
        referenciaNormativa: referenciaInicial,
        respostaImpacto: respostaInicial,
        evidencias: evidenciasIniciais,
        situacao: situacaoInicial,
        observacoesPendencias: '',
        fonteImportacao: fonte,
        origemResposta: cand ? 'REUTILIZADA_AUDITORIA_ANTERIOR' : 'NAO_PREENCHIDA',
        ...(cand
          ? {
              reutilizadaDe: {
                auditId: cand.auditId,
                auditNome: cand.auditNome,
                entidade: cand.entidade,
                dataAuditoria: cand.dataAuditoria,
                itemNumero: cand.itemNumero,
                validadeVerificada: false,
              },
            }
          : {}),
        validadoQualidade: false,
        criadoPorUid: actorUid,
        criadoPorNome: actorName,
        atualizadoPorUid: actorUid,
        atualizadoPorNome: actorName,
        createdAt: now,
        updatedAt: now,
        historicoAlteracoes: historico,
      };
    });

    if (auth.currentUser) {
      await saveAuditPrepItemsBatch(orgId, newItems, userProfile);
    } else {
      const next = [...allItems, ...newItems];
      setAllItems(next);
      persistLocalFallback(undefined, next);
    }

    if (newItems[0]) {
      setIsCreatingManualItem(false);
      setSelectedItemId(newItems[0].id);
    }
    setFeedback({
      type: 'success',
      text:
        reusedCount > 0
          ? `${newItems.length} item(ns) importado(s) de "${fonte.nomeArquivo}" (${reusedCount} já com resposta/confirmação trazida de listas anteriores — confirme a validade ao revisar).`
          : `${newItems.length} item(ns) importado(s) de "${fonte.nomeArquivo}" com preservação do texto original.`,
    });
  };

  const handleStartNewManualItem = () => {
    setIsCreatingManualItem(true);
    setSelectedItemId('');
    setDraftNumero(String(selectedAuditItems.length + 1));
    setDraftPergunta('');
    setDraftReferencia('');
    setDraftResposta('');
    setDraftEvidencias([]);
    setDraftSituacao('PENDENTE_DE_AVALIACAO');
    setDraftObservacoes('');
    setDraftSugestaoIA(undefined);
    setDraftReutilizadaDe(undefined);
    setDraftOrigemResposta('NAO_PREENCHIDA');
    setDraftValidadoQualidade(false);
    setShowHistory(false);
  };

  const handleSaveItemForm = async () => {
    if (!selectedAudit) return;
    if (!draftNumero.trim()) {
      setFeedback({ type: 'error', text: 'Informe o número do item.' });
      return;
    }
    if (!draftPergunta.trim()) {
      setFeedback({ type: 'error', text: 'Informe a pergunta ou requisito original.' });
      return;
    }

    setSavingItem(true);
    try {
      const now = new Date().toISOString();
      if (isCreatingManualItem || !selectedItem) {
        const newId = `ITEM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const hasMarkedAnswer =
          draftSituacao !== 'PENDENTE_DE_AVALIACAO' || Boolean(draftResposta.trim());
        const origemResp: ItemAuditoriaPreparacao['origemResposta'] = hasMarkedAnswer
          ? draftOrigemResposta === 'NAO_PREENCHIDA'
            ? 'MANUAL'
            : draftOrigemResposta
          : 'NAO_PREENCHIDA';

        const created: ItemAuditoriaPreparacao = {
          id: newId,
          organizationId: orgId,
          auditId: selectedAudit.id,
          ordem: selectedAuditItems.length + 1,
          numeroItem: draftNumero.trim(),
          perguntaOriginal: draftPergunta.trim(),
          referenciaNormativa: draftReferencia.trim(),
          respostaImpacto: draftResposta.trim(),
          evidencias: draftEvidencias,
          situacao: draftSituacao,
          observacoesPendencias: draftObservacoes.trim(),
          fonteImportacao: {
            tipo: 'MANUAL',
            importadoEm: now,
            importadoPorNome: actorName,
          },
          origemResposta: origemResp,
          sugestaoIA: draftSugestaoIA,
          reutilizadaDe: draftReutilizadaDe,
          validadoQualidade: Boolean(draftValidadoQualidade && hasMarkedAnswer),
          validadoQualidadePorNome:
            draftValidadoQualidade && hasMarkedAnswer ? actorName : undefined,
          validadoQualidadeEm:
            draftValidadoQualidade && hasMarkedAnswer ? now : undefined,
          criadoPorUid: actorUid,
          criadoPorNome: actorName,
          atualizadoPorUid: actorUid,
          atualizadoPorNome: actorName,
          createdAt: now,
          updatedAt: now,
          historicoAlteracoes: [
            {
              id: `HIST-${Date.now()}`,
              dataHora: now,
              usuarioUid: actorUid,
              usuarioNome: actorName,
              acao: 'CRIACAO',
              situacaoNova: draftSituacao,
              detalhes: 'Item cadastrado manualmente na auditoria.',
            },
          ],
        };

        if (auth.currentUser) {
          await saveAuditPrepItem(orgId, created, userProfile, true);
        } else {
          const next = [...allItems, created];
          setAllItems(next);
          persistLocalFallback(undefined, next);
        }

        setIsCreatingManualItem(false);
        setSelectedItemId(created.id);
        setFeedback({ type: 'success', text: `Item ${created.numeroItem} cadastrado.` });
      } else {
        const respostaChanged = (selectedItem.respostaImpacto || '') !== draftResposta.trim();
        const situacaoChanged = selectedItem.situacao !== draftSituacao;
        const evidenciasChanged =
          (selectedItem.evidencias?.length || 0) !== draftEvidencias.length;
        const obsChanged = (selectedItem.observacoesPendencias || '') !== draftObservacoes.trim();
        const perguntasChanged =
          selectedItem.numeroItem !== draftNumero.trim() ||
          selectedItem.perguntaOriginal !== draftPergunta.trim() ||
          (selectedItem.referenciaNormativa || '') !== draftReferencia.trim();

        const historico = [...(selectedItem.historicoAlteracoes || [])];
        if (respostaChanged || situacaoChanged || evidenciasChanged || obsChanged || perguntasChanged) {
          const mudancas: string[] = [];
          if (perguntasChanged) mudancas.push('texto/referência do item');
          if (respostaChanged) mudancas.push('resposta da IMPACTO');
          if (situacaoChanged)
            mudancas.push(`situação (${SITUACAO_LABELS[selectedItem.situacao]} → ${SITUACAO_LABELS[draftSituacao]})`);
          if (evidenciasChanged)
            mudancas.push(`evidências (${selectedItem.evidencias?.length || 0} → ${draftEvidencias.length})`);
          if (obsChanged) mudancas.push('observações/pendências');

          const snapshot: HistoricoAlteracaoItemPrep = {
            id: `HIST-${Date.now()}`,
            dataHora: now,
            usuarioUid: actorUid,
            usuarioNome: actorName,
            acao: 'EDICAO',
            situacaoAnterior: selectedItem.situacao,
            situacaoNova: draftSituacao,
            respostaAnterior: respostaChanged ? selectedItem.respostaImpacto : undefined,
            evidenciasAnterioresCount: selectedItem.evidencias?.length || 0,
            detalhes: `Alteração em: ${mudancas.join(', ')}.`,
          };
          historico.unshift(snapshot);
        }

        const hasMarkedAnswer =
          draftSituacao !== 'PENDENTE_DE_AVALIACAO' || Boolean(draftResposta.trim());
        let origemResp = draftOrigemResposta;
        if (hasMarkedAnswer && origemResp === 'NAO_PREENCHIDA') {
          origemResp = 'MANUAL';
        } else if (!hasMarkedAnswer) {
          origemResp = 'NAO_PREENCHIDA';
        }

        const updated: ItemAuditoriaPreparacao = {
          ...selectedItem,
          numeroItem: draftNumero.trim(),
          perguntaOriginal: draftPergunta.trim(),
          referenciaNormativa: draftReferencia.trim(),
          respostaImpacto: draftResposta.trim(),
          evidencias: draftEvidencias,
          situacao: draftSituacao,
          observacoesPendencias: draftObservacoes.trim(),
          origemResposta: origemResp,
          sugestaoIA: draftSugestaoIA,
          reutilizadaDe: draftReutilizadaDe,
          validadoQualidade: Boolean(draftValidadoQualidade && hasMarkedAnswer),
          validadoQualidadePorNome:
            draftValidadoQualidade && hasMarkedAnswer
              ? selectedItem.validadoQualidadePorNome || actorName
              : undefined,
          validadoQualidadeEm:
            draftValidadoQualidade && hasMarkedAnswer
              ? selectedItem.validadoQualidadeEm || now
              : undefined,
          atualizadoPorUid: actorUid,
          atualizadoPorNome: actorName,
          updatedAt: now,
          historicoAlteracoes: historico,
        };

        if (auth.currentUser) {
          await saveAuditPrepItem(orgId, updated, userProfile, false);
        } else {
          const next = allItems.map((x) => (x.id === updated.id ? updated : x));
          setAllItems(next);
          persistLocalFallback(undefined, next);
        }

        setFeedback({ type: 'success', text: `Item ${updated.numeroItem} salvo com histórico preservado.` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao salvar item.' });
    } finally {
      setSavingItem(false);
    }
  };

  // Marcação rápida com 1 clique nas 3 opções (Conforme, Não Conforme, Não Aplicável) — já considera como resposta
  const handleQuickSelectSituacao = async (
    targetItem: ItemAuditoriaPreparacao,
    nextSituacao: 'ATENDIDO' | 'NAO_ATENDIDO' | 'NAO_APLICAVEL'
  ) => {
    if (!canWrite) return;
    const isSameItemInEditor = !isCreatingManualItem && selectedItem?.id === targetItem.id;
    const now = new Date().toISOString();
    const historico = [...(targetItem.historicoAlteracoes || [])];

    if (targetItem.situacao !== nextSituacao) {
      historico.unshift({
        id: `HIST-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        dataHora: now,
        usuarioUid: actorUid,
        usuarioNome: actorName,
        acao: 'EDICAO',
        situacaoAnterior: targetItem.situacao,
        situacaoNova: nextSituacao,
        detalhes: `Avaliação marcada como ${SITUACAO_LABELS[nextSituacao]}.`,
      });
    }

    const baseResposta = isSameItemInEditor ? draftResposta.trim() : targetItem.respostaImpacto;
    const baseEvidencias = isSameItemInEditor ? draftEvidencias : targetItem.evidencias;
    const baseObs = isSameItemInEditor ? draftObservacoes.trim() : targetItem.observacoesPendencias;
    const baseNumero = isSameItemInEditor && draftNumero.trim() ? draftNumero.trim() : targetItem.numeroItem;
    const basePergunta = isSameItemInEditor && draftPergunta.trim() ? draftPergunta.trim() : targetItem.perguntaOriginal;
    const baseRef = isSameItemInEditor ? draftReferencia.trim() : targetItem.referenciaNormativa;

    const origemResp =
      targetItem.origemResposta === 'NAO_PREENCHIDA' ? 'MANUAL' : targetItem.origemResposta;

    const updated: ItemAuditoriaPreparacao = {
      ...targetItem,
      numeroItem: baseNumero,
      perguntaOriginal: basePergunta,
      referenciaNormativa: baseRef,
      respostaImpacto: baseResposta,
      evidencias: baseEvidencias,
      observacoesPendencias: baseObs,
      situacao: nextSituacao,
      origemResposta: origemResp,
      atualizadoPorUid: actorUid,
      atualizadoPorNome: actorName,
      updatedAt: now,
      historicoAlteracoes: historico,
    };

    if (isSameItemInEditor) {
      setDraftSituacao(nextSituacao);
      setDraftOrigemResposta(origemResp);
    }

    try {
      if (auth.currentUser) {
        await saveAuditPrepItem(orgId, updated, userProfile, false);
      } else {
        const next = allItems.map((x) => (x.id === updated.id ? updated : x));
        setAllItems(next);
        persistLocalFallback(undefined, next);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao salvar marcação do item.' });
    }
  };

  const handleToggleQualityValidation = async () => {
    if (!selectedItem || !canApprove) return;
    const hasAnswer =
      draftSituacao !== 'PENDENTE_DE_AVALIACAO' || Boolean(draftResposta.trim());
    if (!hasAnswer) {
      setFeedback({
        type: 'error',
        text: 'Selecione Conforme, Não Conforme ou Não Aplicável (ou preencha uma resposta) antes de validar pela Qualidade.',
      });
      return;
    }

    const nextValid = !draftValidadoQualidade;
    const now = new Date().toISOString();
    const historico = [...(selectedItem.historicoAlteracoes || [])];
    historico.unshift({
      id: `HIST-VAL-${Date.now()}`,
      dataHora: now,
      usuarioUid: actorUid,
      usuarioNome: actorName,
      acao: 'VALIDACAO_QUALIDADE',
      situacaoAnterior: selectedItem.situacao,
      situacaoNova: draftSituacao,
      detalhes: nextValid
        ? `Resposta validada pela Qualidade (${actorName}).`
        : `Validação da Qualidade removida por ${actorName} para revisão.`,
    });

    const updatedSugestao = draftSugestaoIA
      ? { ...draftSugestaoIA, validadaPelaQualidade: nextValid }
      : undefined;

    const updated: ItemAuditoriaPreparacao = {
      ...selectedItem,
      numeroItem: draftNumero.trim(),
      perguntaOriginal: draftPergunta.trim(),
      referenciaNormativa: draftReferencia.trim(),
      respostaImpacto: draftResposta.trim(),
      evidencias: draftEvidencias,
      situacao: draftSituacao,
      observacoesPendencias: draftObservacoes.trim(),
      sugestaoIA: updatedSugestao,
      reutilizadaDe: draftReutilizadaDe
        ? {
            ...draftReutilizadaDe,
            validadeVerificada: nextValid ? true : draftReutilizadaDe.validadeVerificada,
            verificadaPorNome: nextValid ? actorName : draftReutilizadaDe.verificadaPorNome,
            verificadaEm: nextValid ? now : draftReutilizadaDe.verificadaEm,
          }
        : undefined,
      validadoQualidade: nextValid,
      validadoQualidadePorNome: nextValid ? actorName : undefined,
      validadoQualidadeEm: nextValid ? now : undefined,
      atualizadoPorUid: actorUid,
      atualizadoPorNome: actorName,
      updatedAt: now,
      historicoAlteracoes: historico,
    };

    try {
      if (auth.currentUser) {
        await saveAuditPrepItem(orgId, updated, userProfile, false);
      } else {
        const next = allItems.map((x) => (x.id === updated.id ? updated : x));
        setAllItems(next);
        persistLocalFallback(undefined, next);
      }
      setDraftValidadoQualidade(nextValid);
      setDraftSugestaoIA(updatedSugestao);
      setFeedback({
        type: 'success',
        text: nextValid
          ? `Item ${updated.numeroItem} validado pela Qualidade.`
          : `Validação do item ${updated.numeroItem} reaberta.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao registrar validação.' });
    }
  };

  const handleRequestAISuggestion = async () => {
    if (!selectedAudit) return;
    if (!draftPergunta.trim()) {
      setFeedback({ type: 'error', text: 'Informe a pergunta/requisito antes de solicitar sugestão.' });
      return;
    }
    setLoadingAiSuggestion(true);
    try {
      const previousAuditsAndAnswers = allItems
        .filter((it) => it.auditId !== selectedAudit.id && it.respostaImpacto?.trim())
        .map((it) => {
          const aud = audits.find((a) => a.id === it.auditId);
          return {
            auditNome: aud?.nome || 'Auditoria Anterior',
            entidade: aud?.entidade || '',
            dataAuditoria: aud?.dataAuditoria || '',
            itemNumero: it.numeroItem,
            pergunta: it.perguntaOriginal,
            referencia: it.referenciaNormativa,
            resposta: it.respostaImpacto,
          };
        });

      const resp = await fetch('/api/audit-prep/suggest-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          audit: {
            nome: selectedAudit.nome,
            entidade: selectedAudit.entidade,
            tipo: selectedAudit.tipo,
            dataAuditoria: selectedAudit.dataAuditoria,
          },
          item: {
            numeroItem: draftNumero.trim() || '1',
            perguntaOriginal: draftPergunta.trim(),
            referenciaNormativa: draftReferencia.trim(),
          },
          sgqContext: {
            documentosControlados: documentosControlados.map((d) => ({
              id: d.id,
              codigo: d.codigo,
              titulo: d.titulo,
              categoria: d.categoria,
              tipoSubcategoria: d.tipoSubcategoria,
              tipoOrigemDocumental: d.tipoOrigemDocumental,
              emissor: d.emissor,
              proprietario: d.proprietario || d.proprietarioCessor,
              numeroRevisao: d.numeroRevisao || d.revisaoVigenteNumero,
              statusGeral: d.statusGeral,
              detalhes: d.detalhesUltimaVerificacao,
              aplicabilidade: d.aplicabilidadePadrao
                ? `${(d.aplicabilidadePadrao.processos || []).join(', ')} — ${d.aplicabilidadePadrao.observacoesAplicabilidade || ''}`
                : '',
            })),
            revisoesDocumentais: revisoesDocumentais
              .filter((rv) => rv.statusCicloVida === 'VIGENTE' || rv.conteudoTextoIntegral || (rv.capitulosIndexados && rv.capitulosIndexados.length > 0))
              .slice(0, 30)
              .map((rv) => ({
                documentoId: rv.documentoId,
                codigoDocumento: rv.codigoDocumento,
                tituloDocumento: rv.tituloDocumento,
                numeroRevisao: rv.numeroRevisao,
                origemRevisao: rv.origemRevisao,
                escopoAlteracoes: rv.escopoAlteracoes,
                conteudoTextoIntegral: (rv.conteudoTextoIntegral || '').slice(0, 12000),
                capitulosIndexados: (rv.capitulosIndexados || []).map((c) => ({
                  numero: c.numero,
                  titulo: c.titulo,
                  requisitoTexto: c.requisitoTexto,
                  palavrasChave: c.palavrasChave,
                })),
              })),
            manuals: manuals.map((m) => ({
              codigo: m.codigo,
              titulo: m.titulo,
              revisao: m.revisao,
              status: m.status,
              tipoDocumento: m.tipoDocumento,
              proprietario: m.proprietario,
              orgaoRegulador: m.orgaoRegulador,
              fonte: m.fonte,
              descricaoResumo: m.descricaoResumo,
              conteudoTexto: (m.arquivoTextoCompleto || m.conteudoTexto || '').slice(0, 16000),
              capitulos: (m.capitulos || []).map((c) => ({
                numero: c.numero,
                titulo: c.titulo,
                requisitoTexto: c.requisitoTexto,
                palavrasChave: c.palavrasChave,
              })),
            })),
            trainingRecords: trainingRecords.slice(0, 60).map((t) => ({
              cursoNome: t.cursoNome,
              pessoaNome: t.pessoaNome,
              dataValidade: t.dataValidade,
            })),
            qualifications: qualifications.slice(0, 60).map((q) => ({
              tipo: q.tipo,
              numero: q.numero,
              dataValidade: q.dataValidade,
            })),
            ferramentasCalibradas: ferramentasCalibradas.slice(0, 60).map((f) => ({
              codigo: f.codigo,
              status: f.status,
              dataProximaCalibracao: f.dataProximaCalibracao,
            })),
            nonConformities: records.slice(0, 40).map((r) => ({
              numeroNC: r.numeroNC,
              titulo: r.titulo,
              normaReferencia: r.normaReferencia,
              statusGeral: r.statusGeral,
            })),
            previousAuditsAndAnswers,
            availableEvidences: existingEvidencesPool.slice(0, 50),
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success || !data?.sugestao) {
        throw new Error(data?.error || 'Não foi possível gerar a sugestão.');
      }

      setDraftSugestaoIA({
        ...data.sugestao,
        validadaPelaQualidade: false,
      });
      setFeedback({
        type: 'success',
        text: 'Sugestão de resposta gerada com base nos documentos e registros reais do SGQ. Revise antes de aplicar.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao consultar sugestão de IA.' });
    } finally {
      setLoadingAiSuggestion(false);
    }
  };

  const handleApplyAISuggestionAsDraft = () => {
    if (!draftSugestaoIA) return;
    setDraftResposta(draftSugestaoIA.respostaSugerida);
    setDraftOrigemResposta('APROVADA_APOS_IA');
    setDraftValidadoQualidade(false);
    setFeedback({
      type: 'success',
      text: 'Sugestão aplicada no campo "Resposta da IMPACTO" como rascunho. Revise, anexe evidências e clique em Salvar Alterações.',
    });
  };

  const handleConfirmReusedValidity = async () => {
    if (!draftReutilizadaDe) return;
    const now = new Date().toISOString();
    const verifiedRef = {
      ...draftReutilizadaDe,
      validadeVerificada: true,
      verificadaPorNome: actorName,
      verificadaEm: now,
    };
    setDraftReutilizadaDe(verifiedRef);

    if (selectedItem && !isCreatingManualItem) {
      const historico: HistoricoAlteracaoItemPrep[] = [
        {
          id: `HIST-VERIF-${Date.now()}`,
          dataHora: now,
          usuarioUid: actorUid,
          usuarioNome: actorName,
          acao: 'REUTILIZACAO_AUDITORIA',
          situacaoNova: draftSituacao,
          detalhes: `Validade e aplicabilidade da resposta reutilizada de "${verifiedRef.auditNome}" confirmada por ${actorName}.`,
        },
        ...(selectedItem.historicoAlteracoes || []),
      ];
      const updated: ItemAuditoriaPreparacao = {
        ...selectedItem,
        reutilizadaDe: verifiedRef,
        atualizadoPorUid: actorUid,
        atualizadoPorNome: actorName,
        updatedAt: now,
        historicoAlteracoes: historico,
      };
      try {
        if (auth.currentUser) {
          await saveAuditPrepItem(orgId, updated, userProfile, false);
        } else {
          const next = allItems.map((x) => (x.id === updated.id ? updated : x));
          setAllItems(next);
          persistLocalFallback(undefined, next);
        }
        setFeedback({
          type: 'success',
          text: `Validade da resposta reutilizada confirmada para o Item ${selectedItem.numeroItem}.`,
        });
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'Erro ao confirmar validade da resposta reutilizada.' });
      }
    }
  };

  const handleApplyPreviousAnswer = (match: {
    auditId: string;
    auditNome: string;
    entidade: string;
    dataAuditoria: string;
    itemNumero: string;
    resposta: string;
    situacao?: SituacaoItemAuditoriaPrep;
    referenciaNormativa?: string;
    evidencias?: EvidenciaVinculadaPrep[];
  }) => {
    setDraftResposta(match.resposta);
    if (match.situacao && match.situacao !== 'PENDENTE_DE_AVALIACAO') {
      setDraftSituacao(match.situacao);
    }
    if (!draftReferencia.trim() && match.referenciaNormativa) {
      setDraftReferencia(match.referenciaNormativa);
    }
    setDraftOrigemResposta('REUTILIZADA_AUDITORIA_ANTERIOR');
    setDraftValidadoQualidade(false);
    setDraftReutilizadaDe({
      auditId: match.auditId,
      auditNome: match.auditNome,
      entidade: match.entidade,
      dataAuditoria: match.dataAuditoria,
      itemNumero: match.itemNumero,
      validadeVerificada: false,
    });
    if (match.evidencias && match.evidencias.length > 0) {
      const existingKeys = new Set(
        draftEvidencias.map((e) => e.arquivoRef?.hashSha256 || `${e.tipo}:${e.referencia}`)
      );
      const extras = match.evidencias
        .filter((e) => !existingKeys.has(e.arquivoRef?.hashSha256 || `${e.tipo}:${e.referencia}`))
        .map((e) => ({
          ...e,
          evidenciaId: `EV-HIST-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          anexadoEm: new Date().toISOString(),
          anexadoPorNome: actorName,
        }));
      if (extras.length > 0) {
        setDraftEvidencias((prev) => [...prev, ...extras]);
      }
    }
    setFeedback({
      type: 'success',
      text: `Resposta reutilizada de "${match.auditNome}". Confirme a validade e aplicabilidade antes de validar.`,
    });
  };

  const handleApplyExistingMatches = async (
    selections: Array<{
      item: ItemAuditoriaPreparacao;
      candidate: PreviousItemCandidate;
      score: number;
      matchType: MatchConfidenceType;
      reason: string;
      includeEvidences: boolean;
    }>
  ) => {
    if (!selectedAudit || selections.length === 0) return;
    const now = new Date().toISOString();

    const updatedItems: ItemAuditoriaPreparacao[] = selections.map((sel, idx) => {
      const { item, candidate, score, matchType, reason, includeEvidences } = sel;
      const nextSituacao: SituacaoItemAuditoriaPrep =
        candidate.situacao && candidate.situacao !== 'PENDENTE_DE_AVALIACAO'
          ? candidate.situacao
          : item.situacao;

      const nextResposta = (candidate.resposta || '').trim() || item.respostaImpacto;
      const nextRef = item.referenciaNormativa?.trim() || candidate.referenciaNormativa || '';

      let mergedEvidences = [...(item.evidencias || [])];
      if (includeEvidences && candidate.evidencias?.length > 0) {
        const existingKeys = new Set(
          mergedEvidences.map((e) => e.arquivoRef?.hashSha256 || `${e.tipo}:${e.referencia}`)
        );
        const extras = candidate.evidencias
          .filter((e) => !existingKeys.has(e.arquivoRef?.hashSha256 || `${e.tipo}:${e.referencia}`))
          .map((e, evIdx) => ({
            ...e,
            evidenciaId: `EV-BATCH-${Date.now()}-${idx}-${evIdx}-${Math.random().toString(36).slice(2, 5)}`,
            anexadoEm: now,
            anexadoPorNome: actorName,
          }));
        mergedEvidences = [...mergedEvidences, ...extras];
      }

      const tipoLabel =
        matchType === 'EXATA'
          ? 'pergunta idêntica'
          : matchType === 'SEMANTICA_IA'
            ? 'equivalência semântica'
            : 'pergunta equivalente';

      const reutilizadaRef = {
        auditId: candidate.auditId,
        auditNome: candidate.auditNome,
        entidade: candidate.entidade,
        dataAuditoria: candidate.dataAuditoria,
        itemNumero: candidate.itemNumero,
        validadeVerificada: false,
      };

      const historico: HistoricoAlteracaoItemPrep[] = [
        {
          id: `HIST-BATCH-REUSE-${Date.now()}-${idx}`,
          dataHora: now,
          usuarioUid: actorUid,
          usuarioNome: actorName,
          acao: 'REUTILIZACAO_AUDITORIA',
          situacaoAnterior: item.situacao,
          situacaoNova: nextSituacao,
          respostaAnterior: item.respostaImpacto || undefined,
          detalhes: `Resposta e confirmação (${SITUACAO_LABELS[nextSituacao]}) trazidas de "${candidate.auditNome}" · Item ${candidate.itemNumero} (${score}% · ${tipoLabel}${reason ? `: ${reason}` : ''}).`,
        },
        ...(item.historicoAlteracoes || []),
      ];

      return {
        ...item,
        referenciaNormativa: nextRef,
        respostaImpacto: nextResposta,
        evidencias: mergedEvidences,
        situacao: nextSituacao,
        origemResposta: 'REUTILIZADA_AUDITORIA_ANTERIOR',
        reutilizadaDe: reutilizadaRef,
        validadoQualidade: false,
        atualizadoPorUid: actorUid,
        atualizadoPorNome: actorName,
        updatedAt: now,
        historicoAlteracoes: historico,
      };
    });

    if (auth.currentUser) {
      await saveAuditPrepItemsBatch(orgId, updatedItems, userProfile);
    } else {
      const updatedMap = new Map(updatedItems.map((u) => [u.id, u]));
      const next = allItems.map((it) => updatedMap.get(it.id) || it);
      setAllItems(next);
      persistLocalFallback(undefined, next);
    }

    const updatedCurrent = selectedItem
      ? updatedItems.find((u) => u.id === selectedItem.id)
      : undefined;
    if (updatedCurrent && !isCreatingManualItem) {
      setDraftReferencia(updatedCurrent.referenciaNormativa);
      setDraftResposta(updatedCurrent.respostaImpacto);
      setDraftEvidencias(updatedCurrent.evidencias);
      setDraftSituacao(updatedCurrent.situacao);
      setDraftOrigemResposta(updatedCurrent.origemResposta);
      setDraftReutilizadaDe(updatedCurrent.reutilizadaDe);
      setDraftValidadoQualidade(false);
    }

    setFeedback({
      type: 'success',
      text: `${updatedItems.length} item(ns) atualizado(s) com respostas e marcações de outras listas. Confirme a validade ao revisar.`,
    });
  };

  const handleDownloadEvidence = async (ev: EvidenciaVinculadaPrep) => {
    if (!ev.arquivoRef) return;
    try {
      const url = await getEvidenceFileUrl(ev.arquivoRef, orgId);
      const link = document.createElement('a');
      link.href = url;
      link.download = ev.arquivoRef.arquivoNome || `${ev.titulo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (url.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Não foi possível abrir o arquivo da evidência.' });
    }
  };

  const handleDeleteCurrentItem = () => {
    if (!selectedItem) return;
    setConfirmDialog({
      open: true,
      title: 'Excluir Item da Auditoria',
      message: `Confirmar a exclusão do Item ${selectedItem.numeroItem}?`,
      confirmLabel: 'Excluir Item',
      destructive: true,
      onConfirm: async () => {
        if (auth.currentUser) {
          await deleteAuditPrepItem(orgId, selectedItem, userProfile);
        } else {
          const next = allItems.filter((x) => x.id !== selectedItem.id);
          setAllItems(next);
          persistLocalFallback(undefined, next);
        }
        setSelectedItemId('');
        setFeedback({ type: 'success', text: `Item ${selectedItem.numeroItem} excluído.` });
      },
    });
  };

  const handleExportDocx = async () => {
    if (!selectedAudit) return;
    setExportingDocx(true);
    try {
      await exportAuditPrepToDocx(selectedAudit, selectedAuditItems, orgName);
      setFeedback({ type: 'success', text: 'Relatório Word (.docx) gerado e baixado com sucesso.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao gerar arquivo Word.' });
    } finally {
      setExportingDocx(false);
    }
  };

  const handleExportPdf = () => {
    if (!selectedAudit) return;
    setExportingPdf(true);
    try {
      exportAuditPrepToPdf(selectedAudit, selectedAuditItems, orgName);
      setFeedback({ type: 'success', text: 'Relatório PDF gerado e baixado com sucesso.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao gerar arquivo PDF.' });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal e Navegação das 3 Áreas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Central de Preparação para Auditorias
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {orgName} · Cadastrar auditoria · Inserir perguntas · Preparar respostas · Anexar evidências · Gerar documento
            </p>
          </div>

          {/* Seletor das 3 Áreas Principais */}
          <div
            role="tablist"
            aria-label="Áreas da Central de Preparação para Auditorias"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 self-start lg:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeArea === 'AUDITORIAS'}
              onClick={() => setActiveArea('AUDITORIAS')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeArea === 'AUDITORIAS'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              A. Auditorias ({audits.filter((a) => !a.arquivada).length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeArea === 'ITENS'}
              onClick={() => setActiveArea('ITENS')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeArea === 'ITENS'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              B. Itens da Auditoria{selectedAudit ? ` (${selectedAuditItems.length})` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeArea === 'RELATORIO'}
              onClick={() => setActiveArea('RELATORIO')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeArea === 'RELATORIO'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              C. Preparação e Relatório
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs ${
              feedback.type === 'error'
                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-medium underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* ===================================================================
          ÁREA A — AUDITORIAS
         =================================================================== */}
      {activeArea === 'AUDITORIAS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar por nome, entidade ou responsável..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <select
                value={auditTypeFilter}
                onChange={(e) => setAuditTypeFilter(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {TIPOS_FILTRO.map((t) => (
                  <option key={t} value={t}>
                    {t === 'TODOS' ? 'Todos os tipos' : t}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Mostrar arquivadas</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviousSearchForCurrentItem(false);
                  setIsPreviousSearchOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Consultar Auditorias Anteriores</span>
              </button>

              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAudit(null);
                    setIsAuditModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Auditoria</span>
                </button>
              )}
            </div>
          </div>

          {loadingData ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando auditorias...</span>
            </div>
          ) : filteredAudits.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nenhuma auditoria cadastrada para os filtros selecionados.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre uma auditoria real para importar seu checklist (Excel, Word ou PDF) ou inserir itens manualmente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Entidade</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium text-right">Itens</th>
                    <th className="px-4 py-3 font-medium text-right">Conformes</th>
                    <th className="px-4 py-3 font-medium text-right">Pendentes</th>
                    <th className="px-4 py-3 font-medium">Situação Geral</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredAudits.map((aud) => {
                    const audItems = itemsByAudit.get(aud.id) || [];
                    const resumo = calcularResumoAuditoriaPrep(audItems);
                    const pendentesCount = resumo.pendentes + resumo.parcialmenteAtendidos + resumo.naoAtendidos;
                    return (
                      <tr
                        key={aud.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {aud.nome}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {aud.tipo} · Resp.: {aud.responsavelPreparacao}
                            {aud.arquivada ? ' · Arquivada' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{aud.entidade}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {formatDateBr(aud.dataAuditoria)}
                          {aud.periodo && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {aud.periodo}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {resumo.totalItens}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {resumo.atendidos}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                          {pendentesCount}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {aud.arquivada ? 'Arquivada' : resumo.situacaoGeral}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAuditId(aud.id);
                                const firstItem = audItems[0];
                                setSelectedItemId(firstItem ? firstItem.id : '');
                                setIsCreatingManualItem(false);
                                setActiveArea('ITENS');
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Abrir</span>
                            </button>

                            {canWrite && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAudit(aud);
                                    setIsAuditModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title="Editar auditoria"
                                  aria-label={`Editar ${aud.nome}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(aud)}
                                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                  title={aud.arquivada ? 'Restaurar auditoria' : 'Arquivar auditoria'}
                                  aria-label={aud.arquivada ? `Restaurar ${aud.nome}` : `Arquivar ${aud.nome}`}
                                >
                                  {aud.arquivada ? (
                                    <ArchiveRestore className="w-3.5 h-3.5" />
                                  ) : (
                                    <Archive className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => requestDeleteAudit(aud)}
                                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Excluir auditoria"
                                aria-label={`Excluir ${aud.nome}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          ÁREA B — ITENS DA AUDITORIA
         =================================================================== */}
      {activeArea === 'ITENS' && (
        <div className="space-y-4">
          {!selectedAudit ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Selecione uma auditoria na Área A para cadastrar ou preparar seus itens.
              </p>
              {audits.length > 0 && (
                <div className="max-w-sm mx-auto">
                  <select
                    value={selectedAuditId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedAuditId(id);
                      const first = (itemsByAudit.get(id) || [])[0];
                      setSelectedItemId(first ? first.id : '');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">Escolher auditoria...</option>
                    {audits.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.entidade})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={() => setActiveArea('AUDITORIAS')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ir para A. Auditorias</span>
              </button>
            </div>
          ) : (
            <>
              {/* Barra de Contexto da Auditoria Selecionada */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      onClick={() => setActiveArea('AUDITORIAS')}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Auditorias</span>
                    </button>
                    <span aria-hidden="true">/</span>
                    <span>{selectedAudit.entidade}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedAudit.tipo}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatDateBr(selectedAudit.dataAuditoria)}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedAudit.nome}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    <span>Total: {selectedAuditResumo.totalItens}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Conformes: {selectedAuditResumo.atendidos}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-700 dark:text-rose-400">
                      Não Conformes: {selectedAuditResumo.naoAtendidos}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Não Aplicáveis: {selectedAuditResumo.naoAplicaveis}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700 dark:text-amber-400">
                      Pendentes: {selectedAuditResumo.pendentes + selectedAuditResumo.parcialmenteAtendidos}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canWrite && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importar (XLSX / DOCX / PDF)</span>
                      </button>
                      {selectedAuditItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsExistingMatchOpen(true)}
                          className="px-3.5 py-2 text-xs font-medium rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Verificar Outras Listas</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStartNewManualItem}
                        className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Item Manual</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveArea('RELATORIO')}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Gerar Relatório</span>
                  </button>
                </div>
              </div>

              {/* Workspace Dividido: Lista de Itens + Editor dos 7 Campos */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Coluna Esquerda: Lista de Itens */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Filtrar itens por número, texto ou referência..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={itemSituacaoFilter}
                        onChange={(e) => setItemSituacaoFilter(e.target.value as any)}
                        className="flex-1 min-w-[150px] px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                      >
                        <option value="TODOS">Todas as situações</option>
                        {SITUACAO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[70vh] overflow-y-auto">
                    {filteredAuditItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                        <p>Nenhum item encontrado nesta auditoria.</p>
                        {canWrite && (
                          <p>Use &ldquo;Importar (XLSX / DOCX / PDF)&rdquo; ou &ldquo;Novo Item Manual&rdquo; acima.</p>
                        )}
                      </div>
                    ) : (
                      filteredAuditItems.map((it) => {
                        const isSelected = !isCreatingManualItem && selectedItemId === it.id;
                        const respondido = isItemRespondidoPrep(it);
                        return (
                          <div
                            key={it.id}
                            className={`px-4 py-3 transition-colors space-y-2 ${
                              isSelected
                                ? 'bg-blue-50/80 dark:bg-blue-950/40'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingManualItem(false);
                                setSelectedItemId(it.id);
                                setShowHistory(false);
                              }}
                              className="w-full text-left cursor-pointer space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                                  Item {it.numeroItem}
                                </span>
                                <span className={`font-medium ${getSituacaoTextClass(it.situacao)}`}>
                                  {SITUACAO_LABELS[it.situacao]}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                                {it.perguntaOriginal}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                <span>{respondido ? 'Respondido' : 'Sem resposta'}</span>
                                {(it.evidencias?.length || 0) > 0 && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Evidências: {it.evidencias.length}</span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span>
                                  {it.validadoQualidade ? 'Validado pela Qualidade' : 'Rascunho'}
                                </span>
                                {it.reutilizadaDe && !it.reutilizadaDe.validadeVerificada && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                                      Reutilizada · Confirmar validade
                                    </span>
                                  </>
                                )}
                              </div>
                            </button>

                            {/* 3 opções rápidas por item: clique já salva e conta como resposta */}
                            {canWrite && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {SITUACAO_CHOICE_OPTIONS.map((opt) => {
                                  const active = it.situacao === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => handleQuickSelectSituacao(it, opt.value)}
                                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                        active ? opt.activeClass : opt.idleClass
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Coluna Direita: Editor dos 7 Campos do Item */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                  {!isCreatingManualItem && !selectedItem ? (
                    <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Selecione um item à esquerda ou clique em &ldquo;Novo Item Manual&rdquo;.
                      </p>
                      <p>Cada item reúne exatamente 7 campos objetivos para preparação e atendimento.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {isCreatingManualItem
                              ? 'Novo Item Manual'
                              : `Item ${selectedItem?.numeroItem}`}
                          </h3>
                          {selectedItem && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Origem: {selectedItem.fonteImportacao?.nomeArquivo || selectedItem.fonteImportacao?.tipo || 'Manual'}
                              {' · '}Criado por {selectedItem.criadoPorNome} em{' '}
                              {formatDateTimeBr(selectedItem.createdAt)}
                              {selectedItem.atualizadoPorNome && (
                                <>
                                  {' · '}Última edição por {selectedItem.atualizadoPorNome} em{' '}
                                  {formatDateTimeBr(selectedItem.updatedAt)}
                                </>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedItem && canApprove && (
                            <button
                              type="button"
                              onClick={handleToggleQualityValidation}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                draftValidadoQualidade
                                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>
                                {draftValidadoQualidade
                                  ? 'Validado pela Qualidade'
                                  : 'Validar pela Qualidade'}
                              </span>
                            </button>
                          )}
                          {selectedItem && canDelete && (
                            <button
                              type="button"
                              onClick={handleDeleteCurrentItem}
                              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Excluir item"
                              aria-label="Excluir item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Aviso de Reutilização de Auditoria Anterior */}
                      {draftReutilizadaDe && !draftReutilizadaDe.validadeVerificada && (
                        <div className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                            <div className="font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>
                                Resposta reutilizada de auditoria anterior — confirmar validade e aplicabilidade
                              </span>
                            </div>
                            <p className="text-[11px]">
                              Origem: {draftReutilizadaDe.auditNome} ({draftReutilizadaDe.entidade} ·{' '}
                              {formatDateBr(draftReutilizadaDe.dataAuditoria)} · Item {draftReutilizadaDe.itemNumero})
                            </p>
                          </div>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={handleConfirmReusedValidity}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-700 hover:bg-amber-800 text-white whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Confirmar Validade
                            </button>
                          )}
                        </div>
                      )}

                      {/* Os 7 Campos Principais */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            1. Número do item *
                          </label>
                          <input
                            type="text"
                            disabled={!canWrite}
                            value={draftNumero}
                            onChange={(e) => setDraftNumero(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            3. Referência normativa ou documental
                          </label>
                          <input
                            type="text"
                            disabled={!canWrite}
                            value={draftReferencia}
                            onChange={(e) => setDraftReferencia(e.target.value)}
                            placeholder="Ex.: RBAC 145.109(a) / MOMQ Seção 4.2"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          2. Pergunta ou requisito original *
                        </label>
                        <textarea
                          rows={3}
                          disabled={!canWrite}
                          value={draftPergunta}
                          onChange={(e) => setDraftPergunta(e.target.value)}
                          placeholder="Texto original da pergunta ou requisito da auditoria..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>

                      {/* Campo 4: Resposta da IMPACTO + Assistentes (IA & Auditoria Anterior) */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            4. Resposta / Comentário da IMPACTO (opcional se marcado Conforme / Não Conforme / Não Aplicável)
                          </label>
                          {canWrite && (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviousSearchForCurrentItem(true);
                                  setIsPreviousSearchOpen(true);
                                }}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
                              >
                                <Search className="w-3.5 h-3.5" />
                                <span>Reutilizar de Auditoria Anterior</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRequestAISuggestion}
                                disabled={loadingAiSuggestion}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                              >
                                {loadingAiSuggestion ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                                <span>Sugerir Resposta com IA</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <textarea
                          rows={5}
                          disabled={!canWrite}
                          value={draftResposta}
                          onChange={(e) => {
                            setDraftResposta(e.target.value);
                            if (draftValidadoQualidade) setDraftValidadoQualidade(false);
                          }}
                          placeholder="Opcional quando já marcado Conforme, Não Conforme ou Não Aplicável. Detalhe aqui procedimentos, capítulos ou observações complementares..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>

                      {/* Rascunho da Sugestão de IA (claramente separado da resposta oficial) */}
                      {draftSugestaoIA && (
                        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                              Sugestão Preliminar da IA (Não Validada pela Qualidade)
                            </div>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={handleApplyAISuggestionAsDraft}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Aplicar Sugestão como Rascunho
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                            {draftSugestaoIA.respostaSugerida}
                          </div>

                          {draftSugestaoIA.fontesEncontradas.length > 0 && (
                            <div className="text-xs space-y-1">
                              <div className="font-medium text-slate-700 dark:text-slate-300">
                                Fontes reais consultadas no SGQ:
                              </div>
                              <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                                {draftSugestaoIA.fontesEncontradas.map((f, idx) => (
                                  <li key={`${f.codigo}-${idx}`}>
                                    [{f.tipo === 'PROCEDIMENTO_NORMA'
                                      ? 'Procedimento/Norma'
                                      : f.tipo === 'AUDITORIA_ANTERIOR'
                                      ? 'Auditoria Anterior'
                                      : 'Evidência/Registro'}] {f.codigo} · {f.titulo} · Rev.: {f.revisao}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {draftSugestaoIA.lacunasOuFaltantes.length > 0 && (
                            <div className="text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                              <div className="font-semibold">Lacunas ou informações pendentes:</div>
                              {draftSugestaoIA.lacunasOuFaltantes.map((l, idx) => (
                                <div key={idx}>• {l}</div>
                              ))}
                            </div>
                          )}

                          {draftSugestaoIA.conflitosOuDivergencias.length > 0 && (
                            <div className="text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5">
                              <div className="font-semibold">Divergências identificadas:</div>
                              {draftSugestaoIA.conflitosOuDivergencias.map((c, idx) => (
                                <div key={idx}>• {c}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Campo 5: Evidências Associadas (opcional) */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                            5. Evidências associadas ({draftEvidencias.length}) — opcional (ex.: verificação visual)
                          </label>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => setIsEvidenceModalOpen(true)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>Anexar / Vincular Evidência</span>
                            </button>
                          )}
                        </div>

                        {draftEvidencias.length === 0 ? (
                          <div className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                            Nenhuma evidência anexada (opcional — itens verificados visualmente ou sem anexo são válidos normalmente).
                          </div>
                        ) : (
                          <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800">
                            {draftEvidencias.map((ev) => (
                              <div
                                key={ev.evidenciaId}
                                className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {ev.titulo}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {ev.tipo} · Ref.: {ev.referencia}
                                    {ev.dataValidade ? ` · Validade: ${formatDateBr(ev.dataValidade)}` : ''}
                                    {ev.origemModulo ? ` · ${ev.origemModulo}` : ''}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {ev.arquivoRef && (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadEvidence(ev)}
                                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Baixar</span>
                                    </button>
                                  )}
                                  {canWrite && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraftEvidencias((prev) =>
                                          prev.filter((x) => x.evidenciaId !== ev.evidenciaId)
                                        )
                                      }
                                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                      aria-label={`Remover evidência ${ev.titulo}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Campos 6 e 7: Avaliação em 3 opções e Observações/Pendências */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            6. Avaliação (clique já registra como resposta)
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            {SITUACAO_CHOICE_OPTIONS.map((opt) => {
                              const active = draftSituacao === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={!canWrite}
                                  onClick={() => {
                                    if (selectedItem && !isCreatingManualItem) {
                                      void handleQuickSelectSituacao(selectedItem, opt.value);
                                    } else {
                                      setDraftSituacao(opt.value);
                                      if (draftOrigemResposta === 'NAO_PREENCHIDA') {
                                        setDraftOrigemResposta('MANUAL');
                                      }
                                    }
                                  }}
                                  className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                                    active ? opt.activeClass : opt.idleClass
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            7. Observações e pendências
                          </label>
                          <input
                            type="text"
                            disabled={!canWrite}
                            value={draftObservacoes}
                            onChange={(e) => setDraftObservacoes(e.target.value)}
                            placeholder="Ação pendente, prazo interno ou nota ao auditor..."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>

                      {/* Ações de Salvamento e Histórico */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        {selectedItem && (
                          <button
                            type="button"
                            onClick={() => setShowHistory((s) => !s)}
                            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>
                              Histórico de alterações ({selectedItem.historicoAlteracoes?.length || 0})
                            </span>
                            {showHistory ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {canWrite && (
                          <div className="flex items-center gap-2 ml-auto">
                            {isCreatingManualItem && (
                              <button
                                type="button"
                                onClick={() => setIsCreatingManualItem(false)}
                                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleSaveItemForm}
                              disabled={savingItem}
                              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                            >
                              {savingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>{isCreatingManualItem ? 'Cadastrar Item' : 'Salvar Alterações'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {showHistory && selectedItem && (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 max-h-64 overflow-y-auto">
                          {(selectedItem.historicoAlteracoes || []).length === 0 ? (
                            <p className="p-3 text-xs text-slate-500">Nenhuma alteração registrada.</p>
                          ) : (
                            selectedItem.historicoAlteracoes.map((h) => (
                              <div key={h.id} className="p-3 text-xs space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {h.usuarioNome} · {h.acao}
                                  </span>
                                  <span className="tabular-nums">{formatDateTimeBr(h.dataHora)}</span>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300">{h.detalhes}</p>
                                {h.respostaAnterior && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded">
                                    Resposta anterior preservada: {h.respostaAnterior}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================
          ÁREA C — PREPARAÇÃO E GERAÇÃO DO RELATÓRIO
         =================================================================== */}
      {activeArea === 'RELATORIO' && (
        <div className="space-y-4">
          {!selectedAudit ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Selecione uma auditoria para revisar a prontidão e gerar o relatório em Word ou PDF.
              </p>
              <button
                type="button"
                onClick={() => setActiveArea('AUDITORIAS')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ir para A. Auditorias</span>
              </button>
            </div>
          ) : (
            <>
              {/* Barra de Exportação Real Word + PDF */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Relatório de Preparação — {selectedAudit.nome}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Documento editável em Word (.docx) e PDF gerado exclusivamente com os dados reais cadastrados nesta auditoria.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportDocx}
                    disabled={exportingDocx}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {exportingDocx ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>Gerar Word (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {exportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>Gerar PDF (.pdf)</span>
                  </button>
                </div>
              </div>

              {/* Checklist Dinâmico de Prontidão e Lacunas */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Verificação de Prontidão antes da Emissão
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">Sem Resposta</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                      {readinessChecks.semResposta.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">Com Evidência Anexada (opcional)</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-1">
                      {readinessChecks.comEvidencia.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">Reutilizadas sem Confirmação</div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                      {readinessChecks.reutilizadasSemConfirmacao.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">Aguardando Validação Qualidade</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                      {readinessChecks.aguardandoValidacao.length}
                    </div>
                  </div>
                </div>

                {readinessChecks.pendenciasAbertas.length > 0 || readinessChecks.reutilizadasSemConfirmacao.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800">
                    {Array.from(
                      new Map(
                        [
                          ...readinessChecks.reutilizadasSemConfirmacao,
                          ...readinessChecks.pendenciasAbertas,
                        ].map((i) => [i.id, i])
                      ).values()
                    ).map((it) => (
                      <div
                        key={it.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            Item {it.numeroItem}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className={getSituacaoTextClass(it.situacao)}>
                            {SITUACAO_LABELS[it.situacao]}
                          </span>
                          {it.observacoesPendencias && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {it.observacoesPendencias}
                              </span>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingManualItem(false);
                            setSelectedItemId(it.id);
                            setActiveArea('ITENS');
                          }}
                          className="px-3 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Revisar Item
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Todos os itens foram avaliados e não há pendências abertas.</span>
                  </div>
                )}
              </div>

              {/* Pré-visualização Estruturada (CAPA · RESUMO · DETALHAMENTO · PENDÊNCIAS) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-2">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    CAPA DO DOCUMENTO
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedAudit.nome}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="font-medium">Entidade:</span> {selectedAudit.entidade}
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span> {selectedAudit.tipo}
                    </div>
                    <div className="tabular-nums">
                      <span className="font-medium">Data:</span> {formatDateBr(selectedAudit.dataAuditoria)}
                    </div>
                    <div>
                      <span className="font-medium">Período:</span> {selectedAudit.periodo || 'Não aplicável'}
                    </div>
                    <div>
                      <span className="font-medium">Responsável:</span> {selectedAudit.responsavelPreparacao}
                    </div>
                    <div>
                      <span className="font-medium">Situação Geral:</span> {selectedAuditResumo.situacaoGeral}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    1. RESUMO
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs tabular-nums">
                    <div>Total: <strong>{selectedAuditResumo.totalItens}</strong></div>
                    <div className="text-emerald-700 dark:text-emerald-400">
                      Conformes: <strong>{selectedAuditResumo.atendidos}</strong>
                    </div>
                    <div className="text-rose-700 dark:text-rose-400">
                      Não Conformes: <strong>{selectedAuditResumo.naoAtendidos}</strong>
                    </div>
                    <div>Não Aplicáveis: <strong>{selectedAuditResumo.naoAplicaveis}</strong></div>
                    <div>Pendentes: <strong>{selectedAuditResumo.pendentes + selectedAuditResumo.parcialmenteAtendidos}</strong></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    2. DETALHAMENTO DOS ITENS ({selectedAuditItems.length})
                  </div>
                  {selectedAuditItems.length === 0 ? (
                    <p className="text-xs text-slate-500">Nenhum item cadastrado nesta auditoria.</p>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800">
                      {selectedAuditItems.map((it) => (
                        <div key={it.id} className="p-4 space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                              Item {it.numeroItem}
                            </span>
                            <span className={`font-semibold ${getSituacaoTextClass(it.situacao)}`}>
                              {SITUACAO_LABELS[it.situacao]}
                            </span>
                          </div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {it.perguntaOriginal}
                          </p>
                          {it.referenciaNormativa && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Referência: {it.referenciaNormativa}
                            </p>
                          )}
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                            <span className="font-medium">Resposta da IMPACTO:</span>{' '}
                            {it.respostaImpacto?.trim() ||
                              (it.situacao !== 'PENDENTE_DE_AVALIACAO'
                                ? `Avaliação registrada diretamente como: ${SITUACAO_LABELS[it.situacao]}.`
                                : 'Não preenchida.')}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-medium">Evidências:</span>{' '}
                            {it.evidencias?.length > 0
                              ? it.evidencias.map((e) => `${e.titulo} (${e.referencia})`).join('; ')
                              : 'Sem anexo (evidência opcional / verificação visual).'}
                          </p>
                          {it.observacoesPendencias?.trim() && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400">
                              <span className="font-medium">Pendência/Observação:</span>{' '}
                              {it.observacoesPendencias}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modais Auxiliares */}
      {isAuditModalOpen && (
        <AuditFormModal
          open={isAuditModalOpen}
          initialAudit={editingAudit}
          defaultResponsavel={actorName}
          onSave={handleSaveAuditForm}
          onClose={() => {
            setIsAuditModalOpen(false);
            setEditingAudit(null);
          }}
        />
      )}

      {isImportModalOpen && selectedAudit && (
        <AuditImportModal
          open={isImportModalOpen}
          organizationId={orgId}
          userName={actorName}
          audits={audits}
          allItems={allItems}
          historicalRequirements={auditRequirements}
          currentAuditId={selectedAudit.id}
          onImportConfirm={handleConfirmImport}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {isExistingMatchOpen && selectedAudit && (
        <ExistingItemsMatchModal
          open={isExistingMatchOpen}
          organizationId={orgId}
          currentAuditId={selectedAudit.id}
          currentAuditName={selectedAudit.nome}
          currentItems={selectedAuditItems}
          audits={audits}
          allItems={allItems}
          historicalRequirements={auditRequirements}
          onApplyMatches={handleApplyExistingMatches}
          onClose={() => setIsExistingMatchOpen(false)}
        />
      )}

      {isEvidenceModalOpen && (
        <EvidencePickerModal
          open={isEvidenceModalOpen}
          organizationId={orgId}
          userProfile={userProfile}
          currentItemId={selectedItem?.id || 'NOVO-ITEM'}
          existingEvidencesPool={existingEvidencesPool}
          documentosControlados={documentosControlados}
          manuals={manuals}
          trainingRecords={trainingRecords}
          qualifications={qualifications}
          ferramentasCalibradas={ferramentasCalibradas}
          records={records}
          onAttachEvidence={(ev) => {
            setDraftEvidencias((prev) => [...prev, ev]);
            setFeedback({
              type: 'success',
              text: `Evidência "${ev.titulo}" vinculada ao rascunho. Clique em "Salvar Alterações" para persistir no item.`,
            });
          }}
          onClose={() => setIsEvidenceModalOpen(false)}
        />
      )}

      {isPreviousSearchOpen && (
        <PreviousAuditsSearchModal
          open={isPreviousSearchOpen}
          audits={audits}
          allItems={allItems}
          historicalRequirements={auditRequirements}
          currentAuditId={selectedAudit?.id}
          canApplyToCurrentItem={
            previousSearchForCurrentItem &&
            canWrite &&
            Boolean(selectedAudit && (selectedItem || isCreatingManualItem))
          }
          onApplyToCurrentItem={handleApplyPreviousAnswer}
          onClose={() => setIsPreviousSearchOpen(false)}
        />
      )}

      {confirmDialog && (
        <ConfirmActionModal
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destructive}
          busy={confirmBusy}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={async () => {
            setConfirmBusy(true);
            try {
              await confirmDialog.onConfirm();
              setConfirmDialog(null);
            } catch (err: any) {
              setFeedback({ type: 'error', text: err?.message || 'Erro ao executar operação.' });
              setConfirmDialog(null);
            } finally {
              setConfirmBusy(false);
            }
          }}
        />
      )}
    </div>
  );
};
