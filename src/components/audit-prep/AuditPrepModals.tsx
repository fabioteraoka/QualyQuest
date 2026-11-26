import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Check,
  Search,
  Paperclip,
  Copy,
  Database,
  Loader2,
  Trash2,
} from 'lucide-react';
import type {
  DocumentoControlado,
  FerramentaCalibracao,
  ManualRecord,
  NCRecord,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  UserProfile,
} from '../../types';
import type { RequisitoAuditoriaExterna } from '../../types/auditRequirements';
import {
  AuditoriaPreparacao,
  EvidenciaVinculadaPrep,
  FonteImportacaoItemPrep,
  ItemAuditoriaPreparacao,
  SituacaoItemAuditoriaPrep,
  TipoAuditoriaPreparacao,
  TipoEvidenciaVinculadaPrep,
  isItemRespondidoPrep,
} from '../../types/auditPrep';
import { uploadEvidenceFile } from '../../services/evidenceStorageService';
import {
  MatchConfidenceType,
  PreviousItemCandidate,
  buildPreviousItemCandidates,
  findBestQuestionMatch,
} from '../../utils/auditPrepMatcher';
import { SITUACAO_LABELS } from '../../utils/auditPrepReportGenerator';

const TIPOS_AUDITORIA: TipoAuditoriaPreparacao[] = [
  'ANAC',
  'EASA',
  'FAA',
  'IOSA',
  'Cliente',
  'Auditoria Interna',
  'Outros',
];

function fileToPlainBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const clean = res.includes('base64,') ? res.split('base64,')[1] : res;
      resolve(clean);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// 1. MODAL DE CONFIRMAÇÃO (SUBSTITUI window.confirm)
// ============================================================================
export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                destructive ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60 ${
              destructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. MODAL DE CRIAÇÃO / EDIÇÃO DE AUDITORIA (7 CAMPOS EXATOS)
// ============================================================================
export interface AuditFormModalProps {
  open: boolean;
  initialAudit?: AuditoriaPreparacao | null;
  defaultResponsavel: string;
  onSave: (values: {
    nome: string;
    entidade: string;
    tipo: TipoAuditoriaPreparacao;
    dataAuditoria: string;
    periodo: string;
    responsavelPreparacao: string;
    observacoes: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const AuditFormModal: React.FC<AuditFormModalProps> = ({
  open,
  initialAudit,
  defaultResponsavel,
  onSave,
  onClose,
}) => {
  const [nome, setNome] = useState(initialAudit?.nome || '');
  const [entidade, setEntidade] = useState(initialAudit?.entidade || '');
  const [tipo, setTipo] = useState<TipoAuditoriaPreparacao>(initialAudit?.tipo || 'ANAC');
  const [dataAuditoria, setDataAuditoria] = useState(
    initialAudit?.dataAuditoria || new Date().toISOString().slice(0, 10)
  );
  const [periodo, setPeriodo] = useState(initialAudit?.periodo || '');
  const [responsavelPreparacao, setResponsavelPreparacao] = useState(
    initialAudit?.responsavelPreparacao || defaultResponsavel
  );
  const [observacoes, setObservacoes] = useState(initialAudit?.observacoes || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Informe o nome da auditoria.');
      return;
    }
    if (!entidade.trim()) {
      setError('Informe a entidade auditora ou cliente.');
      return;
    }
    if (!responsavelPreparacao.trim()) {
      setError('Informe o responsável pela preparação.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        nome: nome.trim(),
        entidade: entidade.trim(),
        tipo,
        dataAuditoria,
        periodo: periodo.trim(),
        responsavelPreparacao: responsavelPreparacao.trim(),
        observacoes: observacoes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar auditoria.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {initialAudit ? 'Editar Auditoria' : 'Cadastrar Nova Auditoria'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preencha os dados de identificação e responsabilidade da preparação.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nome da auditoria *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Auditoria de Renovação RBAC 145 — Base REC"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Entidade auditora ou cliente *
              </label>
              <input
                type="text"
                value={entidade}
                onChange={(e) => setEntidade(e.target.value)}
                placeholder="Ex.: ANAC, LATAM, Azul, Petrobras"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo de auditoria *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoAuditoriaPreparacao)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {TIPOS_AUDITORIA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data da auditoria *
              </label>
              <input
                type="date"
                value={dataAuditoria}
                onChange={(e) => setDataAuditoria(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Período (quando aplicável)
              </label>
              <input
                type="text"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ex.: 14/07/2026 a 16/07/2026"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Responsável pela preparação *
              </label>
              <input
                type="text"
                value={responsavelPreparacao}
                onChange={(e) => setResponsavelPreparacao(e.target.value)}
                placeholder="Nome do responsável técnico ou Gestor SGQ"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Escopo, oficinas abrangidas, pré-requisitos combinados com o auditor..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{initialAudit ? 'Salvar Alterações' : 'Cadastrar Auditoria'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MODAL DE IMPORTAÇÃO DE ARQUIVOS (XLSX / DOCX / PDF)
// ============================================================================
export interface ImportedItemDraft {
  tempId: string;
  numeroItem: string;
  perguntaOriginal: string;
  referenciaNormativa: string;
  matchedCandidate?: PreviousItemCandidate;
  matchScore?: number;
  matchType?: MatchConfidenceType;
  matchReason?: string;
  applyMatchedAnswer?: boolean;
  includeMatchedEvidences?: boolean;
}

export interface AuditImportModalProps {
  open: boolean;
  organizationId: string;
  userName: string;
  audits?: AuditoriaPreparacao[];
  allItems?: ItemAuditoriaPreparacao[];
  historicalRequirements?: RequisitoAuditoriaExterna[];
  currentAuditId?: string;
  onImportConfirm: (
    items: ImportedItemDraft[],
    fonte: FonteImportacaoItemPrep
  ) => Promise<void>;
  onClose: () => void;
}

export const AuditImportModal: React.FC<AuditImportModalProps> = ({
  open,
  organizationId,
  userName,
  audits = [],
  allItems = [],
  historicalRequirements = [],
  currentAuditId,
  onImportConfirm,
  onClose,
}) => {
  const [parsing, setParsing] = useState(false);
  const [matchingSemantic, setMatchingSemantic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileFormat, setFileFormat] = useState<'EXCEL' | 'WORD' | 'PDF'>('EXCEL');
  const [hashSha256, setHashSha256] = useState('');
  const [origemExtracao, setOrigemExtracao] = useState('');
  const [draftItems, setDraftItems] = useState<ImportedItemDraft[]>([]);
  const [includeMatchedEvidences, setIncludeMatchedEvidences] = useState(true);
  const [matchStatusInfo, setMatchStatusInfo] = useState<{
    checkedCandidates: number;
    aiCheckedCount: number;
    aiAvailable: boolean;
    warning?: string;
  } | null>(null);

  const previousCandidates = useMemo(
    () => buildPreviousItemCandidates(audits, allItems, historicalRequirements, currentAuditId),
    [audits, allItems, historicalRequirements, currentAuditId]
  );

  const matchedCount = useMemo(
    () => draftItems.filter((d) => Boolean(d.matchedCandidate)).length,
    [draftItems]
  );
  const selectedReuseCount = useMemo(
    () => draftItems.filter((d) => Boolean(d.matchedCandidate && d.applyMatchedAnswer)).length,
    [draftItems]
  );

  const runCrossLanguageMatching = async (itemsToCheck: ImportedItemDraft[]) => {
    if (previousCandidates.length === 0 || itemsToCheck.length === 0) {
      setMatchStatusInfo({
        checkedCandidates: previousCandidates.length,
        aiCheckedCount: 0,
        aiAvailable: false,
      });
      return;
    }

    const needSemantic = itemsToCheck.filter(
      (m) => !m.matchedCandidate || (m.matchScore || 0) < 78
    );
    if (needSemantic.length === 0) {
      setMatchStatusInfo({
        checkedCandidates: previousCandidates.length,
        aiCheckedCount: 0,
        aiAvailable: true,
      });
      return;
    }

    setMatchingSemantic(true);
    try {
      const resp = await fetch('/api/audit-prep/match-previous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          importedItems: needSemantic.slice(0, 250).map((it) => ({
            tempId: it.tempId,
            numeroItem: it.numeroItem,
            perguntaOriginal: it.perguntaOriginal,
            referenciaNormativa: it.referenciaNormativa,
          })),
          candidates: previousCandidates.slice(0, 250).map((c) => ({
            key: c.key,
            auditId: c.auditId,
            auditNome: c.auditNome,
            entidade: c.entidade,
            dataAuditoria: c.dataAuditoria,
            itemNumero: c.itemNumero,
            pergunta: c.pergunta,
            referenciaNormativa: c.referenciaNormativa,
            resposta: c.resposta,
            situacao: c.situacao,
            validadoQualidade: c.validadoQualidade,
            origem: c.origem,
          })),
        }),
      });
      const matchJson = await resp.json();
      if (!resp.ok || !matchJson?.success) {
        throw new Error(matchJson?.error || 'Falha ao consultar equivalência semântica.');
      }

      const candMap = new Map(previousCandidates.map((c) => [c.key, c]));
      if (matchJson.matches) {
        setDraftItems((prev) =>
          prev.map((item) => {
            const m = matchJson.matches[item.tempId];
            if (!m) return item;
            const cand = candMap.get(m.candidateKey);
            if (!cand) return item;
            if (item.matchScore && item.matchScore > m.score) return item;
            return {
              ...item,
              matchedCandidate: cand,
              matchScore: m.score,
              matchType: m.matchType,
              matchReason: m.reason,
              applyMatchedAnswer: m.score >= 68,
            };
          })
        );
      }

      const meta = matchJson.meta || {};
      setMatchStatusInfo({
        checkedCandidates: Number(meta.totalCandidatesChecked ?? previousCandidates.length),
        aiCheckedCount: Number(meta.aiCheckedCount ?? 0),
        aiAvailable: Boolean(meta.aiAvailable),
        warning: meta.aiError
          ? 'IA indisponível temporariamente — comparação feita por vocabulário técnico multilíngue.'
          : meta.aiAvailable === false
            ? 'IA não configurada — comparação feita por vocabulário técnico multilíngue.'
            : undefined,
      });
    } catch {
      setMatchStatusInfo({
        checkedCandidates: previousCandidates.length,
        aiCheckedCount: 0,
        aiAvailable: false,
        warning:
          'Não foi possível consultar o servidor de equivalência semântica; mantida a comparação automática local.',
      });
    } finally {
      setMatchingSemantic(false);
    }
  };

  if (!open) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toUpperCase();
    if (!['XLSX', 'XLS', 'CSV', 'DOCX', 'PDF'].includes(ext)) {
      setError('Formato não suportado. Selecione um arquivo Excel (.xlsx/.xls/.csv), Word (.docx) ou PDF (.pdf).');
      return;
    }

    setError(null);
    setParsing(true);
    setMatchingSemantic(false);
    setMatchStatusInfo(null);
    setDraftItems([]);
    setFileName(file.name);

    try {
      const base64 = await fileToPlainBase64(file);
      const resp = await fetch('/api/audit-prep/parse-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          nomeArquivo: file.name,
          formato: ext,
          organizationId,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível extrair os itens do arquivo.');
      }

      const mapped: ImportedItemDraft[] = (data.itens || []).map((it: any, idx: number) => {
        const perguntaOriginal = String(it.perguntaOriginal || '').trim();
        const referenciaNormativa = String(it.referenciaNormativa || '').trim();
        const match =
          previousCandidates.length > 0
            ? findBestQuestionMatch({ perguntaOriginal, referenciaNormativa }, previousCandidates)
            : null;
        return {
          tempId: `IMP-${Date.now()}-${idx}`,
          numeroItem: String(it.numeroItem || idx + 1),
          perguntaOriginal,
          referenciaNormativa,
          matchedCandidate: match?.candidate,
          matchScore: match?.score,
          matchType: match?.matchType,
          matchReason: match?.reason,
          applyMatchedAnswer: match ? match.score >= 68 : false,
          includeMatchedEvidences: true,
        };
      });

      if (mapped.length === 0) {
        throw new Error('Nenhum item identificável foi localizado neste arquivo.');
      }

      setFileFormat(ext === 'DOCX' ? 'WORD' : ext === 'PDF' ? 'PDF' : 'EXCEL');
      setHashSha256(String(data.hashSha256 || ''));
      setOrigemExtracao(String(data.origemExtracao || ''));
      setDraftItems(mapped);

      void runCrossLanguageMatching(mapped);
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar o arquivo enviado.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    const valid = draftItems
      .filter((d) => d.perguntaOriginal.trim().length > 0)
      .map((d) => ({
        ...d,
        includeMatchedEvidences,
      }));
    if (valid.length === 0) {
      setError('Mantenha ao menos um item válido para importar.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onImportConfirm(valid, {
        tipo: fileFormat,
        nomeArquivo: fileName,
        hashSha256: hashSha256 || undefined,
        importadoEm: new Date().toISOString(),
        importadoPorNome: userName,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao gravar itens importados.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Importar Perguntas e Requisitos de Arquivo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aceita Excel (.xlsx), Word (.docx) e PDF (.pdf). Preserva numeração e texto original sem criar itens sintéticos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50/70 dark:bg-slate-950/50">
            {parsing ? (
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-2" />
            ) : (
              <Upload className="w-7 h-7 text-slate-400 mb-2" />
            )}
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {parsing
                ? 'Lendo documento e identificando itens originais...'
                : fileName
                ? `Arquivo selecionado: ${fileName}`
                : 'Clique para selecionar Excel (.xlsx), Word (.docx) ou PDF (.pdf)'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              A IA auxilia na leitura preservando numeração e redação original da fonte documental.
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.pdf"
              onChange={handleFileSelect}
              disabled={parsing}
              className="hidden"
            />
          </label>

          {error && (
            <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {draftItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {draftItems.length} item(ns) extraído(s)
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>Fonte: {fileName}</span>
                  {origemExtracao && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>Leitura: {origemExtracao}</span>
                    </>
                  )}
                </div>
                {matchingSemantic ? (
                  <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando equivalências (inclusive em outros idiomas)...</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {previousCandidates.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void runCrossLanguageMatching(draftItems)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Reverificar equivalências
                      </button>
                    )}
                    <span>Revise antes de gravar na auditoria</span>
                  </div>
                )}
              </div>

              {previousCandidates.length === 0 ? (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400">
                  Comparação automática entre listas: nenhuma outra auditoria possui itens já respondidos ou marcados (Conforme / Não Conforme / Não Aplicável) para trazer respostas.
                </div>
              ) : !matchingSemantic && matchedCount === 0 && matchStatusInfo ? (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Comparado com {matchStatusInfo.checkedCandidates} item(ns) respondido(s) de outras listas (inclusive em outros idiomas): nenhuma pergunta equivalente localizada.
                    {matchStatusInfo.warning ? ` (${matchStatusInfo.warning})` : ''}
                  </span>
                </div>
              ) : null}

              {matchStatusInfo?.warning && matchedCount > 0 && (
                <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] text-amber-800 dark:text-amber-300">
                  {matchStatusInfo.warning}
                </div>
              )}

              {/* Resumo de correspondências encontradas em outras listas */}
              {matchedCount > 0 && (
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                      {matchedCount} pergunta(s) igual(is) ou equivalente(s) localizada(s) em outras listas ({selectedReuseCount} selecionada(s) para trazer resposta/marcação)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftItems((prev) =>
                            prev.map((x) =>
                              x.matchedCandidate ? { ...x, applyMatchedAnswer: true } : x
                            )
                          )
                        }
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        Trazer Todas ({matchedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftItems((prev) =>
                            prev.map((x) =>
                              x.matchedCandidate ? { ...x, applyMatchedAnswer: false } : x
                            )
                          )
                        }
                        className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                      >
                        Desmarcar Todas
                      </button>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-[11px] text-emerald-900 dark:text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMatchedEvidences}
                      onChange={(e) => setIncludeMatchedEvidences(e.target.checked)}
                      className="rounded border-emerald-400"
                    />
                    <span>Trazer também as referências de evidências vinculadas (quando existirem)</span>
                  </label>
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2 font-medium w-24">Número</th>
                      <th className="px-3 py-2 font-medium">Pergunta / Requisito Original</th>
                      <th className="px-3 py-2 font-medium w-40">Referência</th>
                      <th className="px-3 py-2 font-medium w-12 text-right">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {draftItems.map((item, idx) => (
                      <tr key={item.tempId} className="align-top">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.numeroItem}
                            onChange={(e) =>
                              setDraftItems((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, numeroItem: e.target.value } : x))
                              )
                            }
                            className="w-full px-2 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="px-3 py-2 space-y-2">
                          <textarea
                            rows={2}
                            value={item.perguntaOriginal}
                            onChange={(e) =>
                              setDraftItems((prev) =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, perguntaOriginal: e.target.value } : x
                                )
                              )
                            }
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                          {item.matchedCandidate && (
                            <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                  {item.matchType === 'EXATA'
                                    ? 'Pergunta idêntica (100%)'
                                    : item.matchType === 'SEMANTICA_IA'
                                    ? `Equivalente por IA / outro idioma (${item.matchScore}%)`
                                    : `Equivalente (${item.matchScore}%)`}
                                  {' · '}
                                  {item.matchedCandidate.auditNome} (Item {item.matchedCandidate.itemNumero})
                                </span>
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                  Marcação: {SITUACAO_LABELS[item.matchedCandidate.situacao]}
                                </span>
                              </div>
                              {item.matchReason && (
                                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                                  {item.matchReason}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="font-medium">Pergunta anterior:</span>{' '}
                                {item.matchedCandidate.pergunta}
                              </p>
                              {item.matchedCandidate.resposta?.trim() && (
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/60 p-1.5 rounded border border-slate-200/70 dark:border-slate-800">
                                  <span className="font-medium">Resposta anterior:</span>{' '}
                                  {item.matchedCandidate.resposta.slice(0, 220)}
                                  {item.matchedCandidate.resposta.length > 220 ? '...' : ''}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-900 dark:text-emerald-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(item.applyMatchedAnswer)}
                                    onChange={(e) =>
                                      setDraftItems((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, applyMatchedAnswer: e.target.checked } : x
                                        )
                                      )
                                    }
                                    className="rounded border-emerald-400"
                                  />
                                  <span>
                                    Trazer resposta e confirmação ({SITUACAO_LABELS[item.matchedCandidate.situacao]})
                                  </span>
                                </label>
                                {item.matchedCandidate.evidencias.length > 0 && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    +{item.matchedCandidate.evidencias.length} evidência(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.referenciaNormativa}
                            onChange={(e) =>
                              setDraftItems((prev) =>
                                prev.map((x, i) =>
                                  i === idx ? { ...x, referenciaNormativa: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Opcional"
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            aria-label="Remover linha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || parsing || draftItems.length === 0}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Importar {draftItems.length > 0 ? `(${draftItems.length} itens)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MODAL DE ASSOCIAÇÃO / REAPROVEITAMENTO DE EVIDÊNCIAS
// ============================================================================
export interface EvidencePickerModalProps {
  open: boolean;
  organizationId: string;
  userProfile?: UserProfile | null;
  currentItemId: string;
  existingEvidencesPool: Array<EvidenciaVinculadaPrep & { origemItemNumero?: string; origemAuditNome?: string }>;
  documentosControlados: DocumentoControlado[];
  manuals: ManualRecord[];
  trainingRecords: RegistroTreinamentoColaborador[];
  qualifications: QualificacaoColaborador[];
  ferramentasCalibradas: FerramentaCalibracao[];
  records: NCRecord[];
  onAttachEvidence: (ev: EvidenciaVinculadaPrep) => void;
  onClose: () => void;
}

export const EvidencePickerModal: React.FC<EvidencePickerModalProps> = ({
  open,
  organizationId,
  userProfile,
  currentItemId,
  existingEvidencesPool,
  documentosControlados,
  manuals,
  trainingRecords,
  qualifications,
  ferramentasCalibradas,
  records,
  onAttachEvidence,
  onClose,
}) => {
  const [mode, setMode] = useState<'ARQUIVO' | 'SGQ' | 'REAPROVEITAR'>('ARQUIVO');
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchSgq, setSearchSgq] = useState('');
  const [searchPool, setSearchPool] = useState('');

  const actorName = userProfile?.displayName || userProfile?.email || 'Qualidade IMPACTO';

  const sgqItems = useMemo(() => {
    const q = searchSgq.trim().toLowerCase();
    const list: Array<{
      id: string;
      tipo: TipoEvidenciaVinculadaPrep;
      titulo: string;
      referencia: string;
      dataValidade?: string;
      origemModulo: string;
    }> = [];

    documentosControlados.forEach((d) => {
      list.push({
        id: `DOC-${d.id}`,
        tipo: 'DOCUMENTO_SGQ',
        titulo: `${d.codigo} — ${d.titulo}`,
        referencia: `${d.codigo} (Rev. ${d.numeroRevisao || 'N/I'})`,
        dataValidade: d.dataValidade || d.proximaRevisao,
        origemModulo: 'Controle Documental',
      });
    });
    manuals.forEach((m) => {
      list.push({
        id: `MAN-${m.id}`,
        tipo: 'DOCUMENTO_SGQ',
        titulo: `${m.codigo} — ${m.titulo}`,
        referencia: `${m.codigo} (Rev. ${m.revisao || 'N/I'})`,
        origemModulo: 'Banco de Manuais',
      });
    });
    trainingRecords.forEach((t) => {
      list.push({
        id: `TRN-${t.id}`,
        tipo: 'TREINAMENTO',
        titulo: `${t.cursoNome || 'Treinamento'} — ${t.pessoaNome || 'Colaborador'}`,
        referencia: t.certificadoNumero || t.id,
        dataValidade: t.dataValidade,
        origemModulo: 'Treinamentos',
      });
    });
    qualifications.forEach((ql) => {
      list.push({
        id: `QLF-${ql.id}`,
        tipo: 'TREINAMENTO',
        titulo: `${ql.tipo || 'Habilitação'} ${ql.numero || ''} — ${ql.pessoaNome || ''}`.trim(),
        referencia: ql.numero || ql.id,
        dataValidade: ql.dataValidade,
        origemModulo: 'Habilitações/CHT',
      });
    });
    ferramentasCalibradas.forEach((f) => {
      list.push({
        id: `MET-${f.id}`,
        tipo: 'CALIBRACAO',
        titulo: `${f.codigo || f.id} — ${f.descricao || f.nome || 'Instrumento'}`,
        referencia: f.numeroCertificado || f.codigo || f.id,
        dataValidade: f.dataProximaCalibracao,
        origemModulo: 'Metrologia',
      });
    });
    records.forEach((r) => {
      list.push({
        id: `RNC-${r.id}`,
        tipo: 'RNC',
        titulo: `RNC ${r.numeroNC} — ${r.titulo}`,
        referencia: r.numeroNC,
        origemModulo: 'Não Conformidades',
      });
    });

    if (!q) return list.slice(0, 60);
    return list
      .filter(
        (x) =>
          x.titulo.toLowerCase().includes(q) ||
          x.referencia.toLowerCase().includes(q) ||
          x.origemModulo.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [searchSgq, documentosControlados, manuals, trainingRecords, qualifications, ferramentasCalibradas, records]);

  const filteredPool = useMemo(() => {
    const q = searchPool.trim().toLowerCase();
    const dedup = new Map<string, EvidenciaVinculadaPrep & { origemItemNumero?: string; origemAuditNome?: string }>();
    existingEvidencesPool.forEach((ev) => {
      const key = ev.arquivoRef?.hashSha256 || `${ev.tipo}:${ev.referencia}:${ev.titulo}`;
      if (!dedup.has(key)) dedup.set(key, ev);
    });
    const list = Array.from(dedup.values());
    if (!q) return list;
    return list.filter(
      (ev) =>
        ev.titulo.toLowerCase().includes(q) ||
        ev.referencia.toLowerCase().includes(q) ||
        (ev.origemAuditNome || '').toLowerCase().includes(q)
    );
  }, [existingEvidencesPool, searchPool]);

  if (!open) return null;

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Selecione um arquivo de evidência para anexar.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const arquivoRef = await uploadEvidenceFile(file, organizationId, userProfile, currentItemId);
      const novaEvidencia: EvidenciaVinculadaPrep = {
        evidenciaId: `EV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        titulo: titulo.trim() || file.name,
        tipo: 'ARQUIVO',
        referencia: referencia.trim() || file.name,
        dataValidade: dataValidade || undefined,
        arquivoRef,
        origemModulo: 'Anexo Direto',
        observacao: observacao.trim() || undefined,
        anexadoEm: new Date().toISOString(),
        anexadoPorNome: actorName,
      };
      onAttachEvidence(novaEvidencia);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar arquivo de evidência.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Associar Evidência ao Item
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anexe um novo arquivo, vincule um registro do SGQ ou reaproveite uma evidência já cadastrada sem duplicar arquivos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMode('ARQUIVO')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                mode === 'ARQUIVO'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Anexar Arquivo</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('SGQ')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                mode === 'SGQ'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Vincular Módulo SGQ</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('REAPROVEITAR')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                mode === 'REAPROVEITAR'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Reaproveitar Existente ({filteredPool.length})</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {mode === 'ARQUIVO' && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Arquivo comprobatório (PDF, imagem, Excel ou Word — máx. 25 MB) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.xls,.docx,.doc,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f && !titulo) setTitulo(f.name.replace(/\.[^/.]+$/, ''));
                    if (f && !referencia) setReferencia(f.name);
                  }}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:text-xs file:font-medium file:bg-slate-50 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título da evidência
                  </label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex.: Certificado de Calibração Torquímetro T-04"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código / Referência
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ex.: CERT-RBC-2026-019"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Data de validade (se aplicável)
                  </label>
                  <input
                    type="date"
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Observação
                  </label>
                  <input
                    type="text"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex.: Comprovação da base REC"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enviar e Vincular Evidência</span>
                </button>
              </div>
            </form>
          )}

          {mode === 'SGQ' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchSgq}
                  onChange={(e) => setSearchSgq(e.target.value)}
                  placeholder="Buscar documentos controlados, manuais, treinamentos, CHTs, calibrações ou RNCs..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {sgqItems.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">Nenhum registro encontrado nos módulos do SGQ.</p>
                ) : (
                  sgqItems.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {entry.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {entry.origemModulo} · Ref.: {entry.referencia}
                          {entry.dataValidade ? ` · Validade: ${entry.dataValidade}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAttachEvidence({
                            evidenciaId: `EV-${Date.now()}-${entry.id}`,
                            titulo: entry.titulo,
                            tipo: entry.tipo,
                            referencia: entry.referencia,
                            dataValidade: entry.dataValidade,
                            origemModulo: entry.origemModulo,
                            anexadoEm: new Date().toISOString(),
                            anexadoPorNome: actorName,
                          });
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Vincular
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {mode === 'REAPROVEITAR' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPool}
                  onChange={(e) => setSearchPool(e.target.value)}
                  placeholder="Filtrar evidências já associadas em itens ou auditorias anteriores..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {filteredPool.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">
                    Nenhuma evidência prévia disponível para reaproveitamento ainda.
                  </p>
                ) : (
                  filteredPool.map((ev) => (
                    <div
                      key={ev.evidenciaId}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                          {ev.titulo}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ev.tipo} · Ref.: {ev.referencia}
                          {ev.origemAuditNome ? ` · Origem: ${ev.origemAuditNome}` : ''}
                          {ev.arquivoRef ? ' · Arquivo único preservado (sem duplicação)' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAttachEvidence({
                            ...ev,
                            evidenciaId: `EV-REUSO-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
                            anexadoEm: new Date().toISOString(),
                            anexadoPorNome: actorName,
                          });
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Reaproveitar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. MODAL DE BUSCA E REUTILIZAÇÃO EM AUDITORIAS ANTERIORES
// ============================================================================
export interface PreviousAuditsSearchModalProps {
  open: boolean;
  audits: AuditoriaPreparacao[];
  allItems: ItemAuditoriaPreparacao[];
  historicalRequirements?: RequisitoAuditoriaExterna[];
  currentAuditId?: string;
  canApplyToCurrentItem?: boolean;
  onApplyToCurrentItem?: (match: {
    auditId: string;
    auditNome: string;
    entidade: string;
    dataAuditoria: string;
    itemNumero: string;
    resposta: string;
    situacao?: SituacaoItemAuditoriaPrep;
    referenciaNormativa?: string;
    evidencias?: EvidenciaVinculadaPrep[];
  }) => void;
  onClose: () => void;
}

export const PreviousAuditsSearchModal: React.FC<PreviousAuditsSearchModalProps> = ({
  open,
  audits,
  allItems,
  historicalRequirements = [],
  currentAuditId,
  canApplyToCurrentItem = false,
  onApplyToCurrentItem,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [includeEvidences, setIncludeEvidences] = useState(true);

  const entries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const auditMap = new Map<string, AuditoriaPreparacao>();
    audits.forEach((a) => auditMap.set(a.id, a));

    const results: Array<{
      key: string;
      auditId: string;
      auditNome: string;
      entidade: string;
      dataAuditoria: string;
      itemNumero: string;
      pergunta: string;
      referenciaNormativa: string;
      resposta: string;
      situacao: SituacaoItemAuditoriaPrep;
      evidencias: EvidenciaVinculadaPrep[];
      origem: 'CENTRAL_AUDITORIAS' | 'HISTORICO_SGQ';
    }> = [];

    allItems.forEach((it) => {
      if (currentAuditId && it.auditId === currentAuditId) return;
      if (!isItemRespondidoPrep(it)) return;
      const a = auditMap.get(it.auditId);
      results.push({
        key: `PREP-${it.id}`,
        auditId: it.auditId,
        auditNome: a?.nome || 'Auditoria Anterior',
        entidade: a?.entidade || 'Entidade não informada',
        dataAuditoria: a?.dataAuditoria || it.updatedAt.slice(0, 10),
        itemNumero: it.numeroItem,
        pergunta: it.perguntaOriginal,
        referenciaNormativa: it.referenciaNormativa,
        resposta: it.respostaImpacto || '',
        situacao: it.situacao,
        evidencias: it.evidencias || [],
        origem: 'CENTRAL_AUDITORIAS',
      });
    });

    // Inclui também referências históricas já gravadas no módulo legado (somente leitura)
    historicalRequirements.forEach((req) => {
      const resp = (req.respostaInstitucional || req.notasPreparacao || '').trim();
      if (!resp) return;
      results.push({
        key: `HIST-${req.id}`,
        auditId: req.auditoriaId || req.id,
        auditNome: req.auditoriaNome || 'Acervo Histórico SGQ',
        entidade: req.clienteNome || req.autoridadeOrigem || 'Histórico SGQ',
        dataAuditoria: req.updatedAt ? req.updatedAt.slice(0, 10) : '',
        itemNumero: req.codigo || req.numeroItem || '-',
        pergunta: req.requisitoOriginal || req.titulo || '',
        referenciaNormativa: req.normaReferencia || '',
        resposta: resp,
        situacao:
          req.statusAtendimento === 'CONFORME'
            ? 'ATENDIDO'
            : req.statusAtendimento === 'NAO_CONFORME'
            ? 'NAO_ATENDIDO'
            : req.statusAtendimento === 'NAO_APLICAVEL'
            ? 'NAO_APLICAVEL'
            : 'PENDENTE_DE_AVALIACAO',
        evidencias: [],
        origem: 'HISTORICO_SGQ',
      });
    });

    if (!q) return results.slice(0, 50);
    return results
      .filter(
        (r) =>
          r.pergunta.toLowerCase().includes(q) ||
          r.resposta.toLowerCase().includes(q) ||
          r.referenciaNormativa.toLowerCase().includes(q) ||
          r.auditNome.toLowerCase().includes(q) ||
          r.entidade.toLowerCase().includes(q) ||
          r.itemNumero.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [audits, allItems, historicalRequirements, currentAuditId, searchTerm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Buscar Respostas em Auditorias Anteriores
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consulte respostas anteriores da IMPACTO. Ao reutilizar, o sistema sinaliza que validade e aplicabilidade precisam ser confirmadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por pergunta, referência normativa, resposta, cliente ou auditoria..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          {canApplyToCurrentItem && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEvidences}
                onChange={(e) => setIncludeEvidences(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Vincular também referências de evidências</span>
            </label>
          )}
        </div>

        <div className="p-6 pt-2 overflow-y-auto flex-1 space-y-3">
          {entries.length === 0 ? (
            <div className="p-8 text-center border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500">
              Nenhuma resposta anterior compatível encontrada com o filtro atual.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.key}
                className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {entry.auditNome}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{entry.entidade}</span>
                    {entry.dataAuditoria && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">{entry.dataAuditoria}</span>
                      </>
                    )}
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono">Item {entry.itemNumero}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {SITUACAO_LABELS[entry.situacao]}
                    </span>
                  </div>
                  {canApplyToCurrentItem && onApplyToCurrentItem && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyToCurrentItem({
                          auditId: entry.auditId,
                          auditNome: entry.auditNome,
                          entidade: entry.entidade,
                          dataAuditoria: entry.dataAuditoria,
                          itemNumero: entry.itemNumero,
                          resposta: entry.resposta,
                          situacao: entry.situacao,
                          referenciaNormativa: entry.referenciaNormativa,
                          evidencias: includeEvidences ? entry.evidencias : [],
                        });
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Reutilizar neste Item</span>
                    </button>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {entry.pergunta}
                </p>
                {entry.referenciaNormativa && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Referência: {entry.referenciaNormativa}
                  </p>
                )}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {entry.resposta.trim()
                    ? entry.resposta
                    : `Avaliação marcada como: ${SITUACAO_LABELS[entry.situacao]} (sem texto adicional).`}
                </div>
                {entry.evidencias.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evidências vinculadas ({entry.evidencias.length}):{' '}
                    {entry.evidencias.map((e) => e.titulo).join(', ')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. MODAL DE VERIFICAÇÃO EM LOTE PARA LISTA JÁ IMPORTADA (MULTILÍNGUE)
// ============================================================================
export interface ExistingItemMatchDraft {
  item: ItemAuditoriaPreparacao;
  matchedCandidate?: PreviousItemCandidate;
  matchScore?: number;
  matchType?: MatchConfidenceType;
  matchReason?: string;
  applyMatchedAnswer: boolean;
}

export interface ExistingItemsMatchModalProps {
  open: boolean;
  organizationId: string;
  currentAuditId: string;
  currentAuditName: string;
  currentItems: ItemAuditoriaPreparacao[];
  audits: AuditoriaPreparacao[];
  allItems: ItemAuditoriaPreparacao[];
  historicalRequirements?: RequisitoAuditoriaExterna[];
  onApplyMatches: (
    selected: Array<{
      item: ItemAuditoriaPreparacao;
      candidate: PreviousItemCandidate;
      score: number;
      matchType: MatchConfidenceType;
      reason: string;
      includeEvidences: boolean;
    }>
  ) => Promise<void>;
  onClose: () => void;
}

export const ExistingItemsMatchModal: React.FC<ExistingItemsMatchModalProps> = ({
  open,
  organizationId,
  currentAuditId,
  currentAuditName,
  currentItems,
  audits,
  allItems,
  historicalRequirements = [],
  onApplyMatches,
  onClose,
}) => {
  const [onlyPending, setOnlyPending] = useState(true);
  const [includeEvidences, setIncludeEvidences] = useState(true);
  const [matchingSemantic, setMatchingSemantic] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExistingItemMatchDraft[]>([]);
  const [statusInfo, setStatusInfo] = useState<{
    checkedCandidates: number;
    warning?: string;
  } | null>(null);

  const previousCandidates = useMemo(
    () => buildPreviousItemCandidates(audits, allItems, historicalRequirements, currentAuditId),
    [audits, allItems, historicalRequirements, currentAuditId]
  );

  const targetItems = useMemo(() => {
    return currentItems.filter((it) => (onlyPending ? !isItemRespondidoPrep(it) : true));
  }, [currentItems, onlyPending]);

  const runBatchCheck = async (itemsToScan: ItemAuditoriaPreparacao[]) => {
    setError(null);
    const initialRows: ExistingItemMatchDraft[] = itemsToScan.map((item) => {
      const det =
        previousCandidates.length > 0
          ? findBestQuestionMatch(
              {
                perguntaOriginal: item.perguntaOriginal,
                referenciaNormativa: item.referenciaNormativa,
              },
              previousCandidates
            )
          : null;
      return {
        item,
        matchedCandidate: det?.candidate,
        matchScore: det?.score,
        matchType: det?.matchType,
        matchReason: det?.reason,
        applyMatchedAnswer: Boolean(det && det.score >= 68),
      };
    });
    setRows(initialRows);

    if (previousCandidates.length === 0 || itemsToScan.length === 0) {
      setStatusInfo({ checkedCandidates: previousCandidates.length });
      return;
    }

    const needSemantic = initialRows.filter(
      (r) => !r.matchedCandidate || (r.matchScore || 0) < 78
    );
    if (needSemantic.length === 0) {
      setStatusInfo({ checkedCandidates: previousCandidates.length });
      return;
    }

    setMatchingSemantic(true);
    try {
      const resp = await fetch('/api/audit-prep/match-previous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          importedItems: needSemantic.slice(0, 250).map((r) => ({
            tempId: r.item.id,
            numeroItem: r.item.numeroItem,
            perguntaOriginal: r.item.perguntaOriginal,
            referenciaNormativa: r.item.referenciaNormativa,
          })),
          candidates: previousCandidates.slice(0, 250).map((c) => ({
            key: c.key,
            auditId: c.auditId,
            auditNome: c.auditNome,
            entidade: c.entidade,
            dataAuditoria: c.dataAuditoria,
            itemNumero: c.itemNumero,
            pergunta: c.pergunta,
            referenciaNormativa: c.referenciaNormativa,
            resposta: c.resposta,
            situacao: c.situacao,
            validadoQualidade: c.validadoQualidade,
            origem: c.origem,
          })),
        }),
      });
      const matchJson = await resp.json();
      if (!resp.ok || !matchJson?.success) {
        throw new Error(matchJson?.error || 'Falha ao verificar equivalências entre listas.');
      }

      const candMap = new Map(previousCandidates.map((c) => [c.key, c]));
      if (matchJson.matches) {
        setRows((prev) =>
          prev.map((row) => {
            const m = matchJson.matches[row.item.id];
            if (!m) return row;
            const cand = candMap.get(m.candidateKey);
            if (!cand) return row;
            if (row.matchScore && row.matchScore > m.score) return row;
            return {
              ...row,
              matchedCandidate: cand,
              matchScore: m.score,
              matchType: m.matchType,
              matchReason: m.reason,
              applyMatchedAnswer: m.score >= 68,
            };
          })
        );
      }

      const meta = matchJson.meta || {};
      setStatusInfo({
        checkedCandidates: Number(meta.totalCandidatesChecked ?? previousCandidates.length),
        warning: meta.aiError
          ? 'IA indisponível temporariamente — comparação feita por vocabulário técnico multilíngue.'
          : meta.aiAvailable === false
            ? 'IA não configurada — comparação feita por vocabulário técnico multilíngue.'
            : undefined,
      });
    } catch {
      setStatusInfo({
        checkedCandidates: previousCandidates.length,
        warning:
          'Não foi possível consultar o servidor de equivalência semântica; mantida a comparação automática local.',
      });
    } finally {
      setMatchingSemantic(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void runBatchCheck(targetItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onlyPending, currentAuditId]);

  const matchedRows = useMemo(
    () => rows.filter((r) => Boolean(r.matchedCandidate)),
    [rows]
  );
  const selectedRows = useMemo(
    () => matchedRows.filter((r) => r.applyMatchedAnswer),
    [matchedRows]
  );

  if (!open) return null;

  const handleApplySelected = async () => {
    if (selectedRows.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      await onApplyMatches(
        selectedRows.map((r) => ({
          item: r.item,
          candidate: r.matchedCandidate!,
          score: r.matchScore || 0,
          matchType: r.matchType || 'EQUIVALENTE',
          reason: r.matchReason || 'Equivalência encontrada em outra lista',
          includeEvidences,
        }))
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao aplicar respostas reutilizadas.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Verificar Perguntas Equivalentes em Outras Listas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auditoria atual: {currentAuditName} · Compara perguntas já cadastradas (inclusive em outros idiomas) com outras listas respondidas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyPending}
                  onChange={(e) => setOnlyPending(e.target.checked)}
                  disabled={matchingSemantic || applying}
                  className="rounded border-slate-300"
                />
                <span>Verificar apenas itens pendentes/sem resposta ({currentItems.filter((i) => !isItemRespondidoPrep(i)).length})</span>
              </label>
              <label className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEvidences}
                  onChange={(e) => setIncludeEvidences(e.target.checked)}
                  disabled={applying}
                  className="rounded border-slate-300"
                />
                <span>Trazer também referências de evidências</span>
              </label>
            </div>

            {previousCandidates.length > 0 && targetItems.length > 0 && (
              <button
                type="button"
                onClick={() => void runBatchCheck(targetItems)}
                disabled={matchingSemantic || applying}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {matchingSemantic ? 'Verificando...' : 'Reverificar agora'}
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {matchingSemantic && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                Comparando {targetItems.length} item(ns) desta auditoria com {previousCandidates.length} item(ns) respondido(s) de outras listas (inclusive em outros idiomas)...
              </span>
            </div>
          )}

          {statusInfo?.warning && (
            <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] text-amber-800 dark:text-amber-300">
              {statusInfo.warning}
            </div>
          )}

          {previousCandidates.length === 0 ? (
            <div className="p-6 text-center border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
              Nenhuma outra auditoria possui itens marcados (Conforme / Não Conforme / Não Aplicável) ou respondidos para reutilização.
            </div>
          ) : targetItems.length === 0 ? (
            <div className="p-6 text-center border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
              Todos os itens desta auditoria já possuem resposta ou marcação registrada. Desmarque o filtro acima caso queira comparar mesmo os itens já respondidos.
            </div>
          ) : !matchingSemantic && matchedRows.length === 0 ? (
            <div className="p-6 text-center border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
              Comparados {targetItems.length} item(ns) desta lista com {statusInfo?.checkedCandidates ?? previousCandidates.length} item(ns) respondido(s) de outras listas: nenhuma correspondência encontrada.
            </div>
          ) : matchedRows.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                  {matchedRows.length} item(ns) com pergunta igual ou equivalente encontrada ({selectedRows.length} selecionado(s) para aplicar)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.matchedCandidate ? { ...r, applyMatchedAnswer: true } : r
                        )
                      )
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    Selecionar Todos ({matchedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.matchedCandidate ? { ...r, applyMatchedAnswer: false } : r
                        )
                      )
                    }
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {matchedRows.map((row) => {
                  const cand = row.matchedCandidate!;
                  return (
                    <div
                      key={row.item.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <label className="inline-flex items-start gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.applyMatchedAnswer}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.item.id === row.item.id
                                    ? { ...x, applyMatchedAnswer: e.target.checked }
                                    : x
                                )
                              )
                            }
                            className="mt-0.5 rounded border-emerald-500"
                          />
                          <span>
                            Item {row.item.numeroItem}: {row.item.perguntaOriginal}
                          </span>
                        </label>
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {row.matchType === 'EXATA'
                            ? 'Idêntica (100%)'
                            : row.matchType === 'SEMANTICA_IA'
                              ? `Equivalente IA / outro idioma (${row.matchScore}%)`
                              : `Equivalente (${row.matchScore}%)`}
                        </span>
                      </div>

                      <div className="pl-6 space-y-1 text-[11px]">
                        <div className="text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Origem: {cand.auditNome} · Item {cand.itemNumero}
                          </span>
                          {' · '}
                          <span className="font-semibold">
                            Marcação: {SITUACAO_LABELS[cand.situacao]}
                          </span>
                          {cand.evidencias.length > 0 && (
                            <>
                              {' · '}
                              <span>+{cand.evidencias.length} evidência(s)</span>
                            </>
                          )}
                        </div>
                        {row.matchReason && (
                          <p className="text-emerald-800 dark:text-emerald-300">{row.matchReason}</p>
                        )}
                        <p className="text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Pergunta anterior:</span> {cand.pergunta}
                        </p>
                        {cand.resposta.trim() && (
                          <p className="p-2 rounded bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Resposta anterior:</span>{' '}
                            {cand.resposta.slice(0, 260)}
                            {cand.resposta.length > 260 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Fechar
          </button>
          {matchedRows.length > 0 && (
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={applying || selectedRows.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {applying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Aplicar Selecionadas ({selectedRows.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

