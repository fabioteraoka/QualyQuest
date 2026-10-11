import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  ArrowRight,
  RefreshCw,
  FileCheck2,
  History,
  Archive,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Building,
  Calendar,
  Sparkles,
  Search,
  Filter,
  BookOpen,
  ArrowLeftRight,
  Check,
  AlertCircle,
  DownloadCloud,
  UploadCloud,
  Database,
  Lock,
} from 'lucide-react';
import {
  DocumentoControlado,
  RevisaoDocumental,
  RelatorioAuditoriaDuplicidades,
  GrupoDuplicidade,
  PlanoReconciliacao,
  PlanoReconciliacaoItem,
  ResultadoReconciliacao,
  ResultadoReconstrucaoIndices,
  ManualRecord,
  UserProfile,
} from '../types';
import {
  executarAuditoriaDuplicidades,
  simularReconciliacao,
  executarReconciliacaoFirestore,
  reconstruirIndicesUnicidade,
  normalizeDocumentCode,
} from '../services/documentControlAuditReconciliation';
import {
  ItemComparativoManualIA,
  RelatorioComparativoManuaisIA,
  executarComparativoAcervoComBancoManuaisIA,
  sincronizarItemBancoManuaisIA,
  sincronizarTodasPendenciasBancoManuaisIA,
} from '../services/manualsCrossCheckService';

interface DocumentDuplicityAuditViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  documentos: DocumentoControlado[];
  revisoes: RevisaoDocumental[];
  manuals?: ManualRecord[];
  onDocumentosUpdated?: () => void;
  onManualsUpdated?: () => void;
  showToast: (msg: string) => void;
}

export const DocumentDuplicityAuditView: React.FC<DocumentDuplicityAuditViewProps> = ({
  organizationId,
  currentUser,
  documentos,
  revisoes,
  manuals = [],
  onDocumentosUpdated,
  onManualsUpdated,
  showToast,
}) => {
  // Aba principal: Auditoria do Acervo SGQ vs Conciliação com Banco de Manuais (IA)
  const [activeTabMode, setActiveTabMode] = useState<'duplicidades_acervo' | 'banco_manuais_ia'>('duplicidades_acervo');

  // Filtros da aba de duplicidades
  const [filterSeverity, setFilterSeverity] = useState<'TODOS' | 'CRITICO' | 'ALERTA' | 'ORFA'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Filtros da aba de conciliação IA
  const [filtroStatusIA, setFiltroStatusIA] = useState<
    'TODOS' | 'DIVERGENTES' | 'BANCO_IA_MAIS_RECENTE' | 'ACERVO_SGQ_MAIS_RECENTE' | 'APENAS_NO_BANCO_IA' | 'APENAS_NO_ACERVO_SGQ' | 'SINCRONIZADOS'
  >('TODOS');
  const [searchIA, setSearchIA] = useState('');

  // Seleção e plano de ação por grupo
  const [selectedMasters, setSelectedMasters] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [acoesEscolhidas, setAcoesEscolhidas] = useState<
    Record<string, 'CONSOLIDAR_MIGRANDO_REVISOES' | 'MANTER_LEGITIMO_DISTINTO'>
  >({});

  // Estados do Modal Interativo de Confirmação (Elimina window.confirm e window.alert)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [grupoParaConfirmar, setGrupoParaConfirmar] = useState<GrupoDuplicidade | null>(null);
  const [modalAcao, setModalAcao] = useState<'CONSOLIDAR_MIGRANDO_REVISOES' | 'MANTER_LEGITIMO_DISTINTO'>('CONSOLIDAR_MIGRANDO_REVISOES');
  const [modalMasterId, setModalMasterId] = useState('');
  const [modalJustificativa, setModalJustificativa] = useState('');
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  // Estados de execução e modal de simulação Dry-Run
  const [simulacaoResultado, setSimulacaoResultado] = useState<ResultadoReconciliacao | null>(null);
  const [isSimulacaoModalOpen, setIsSimulacaoModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [historicoAcoes, setHistoricoAcoes] = useState<string[]>([]);

  // Modal de confirmação individual de sincronização com Banco IA
  const [itemParaSincronizarIA, setItemParaSincronizarIA] = useState<ItemComparativoManualIA | null>(null);
  const [isModalIASyncOpen, setIsModalIASyncOpen] = useState(false);

  // 1. Relatório de auditoria de duplicidades no Acervo (read-only)
  const relatorio: RelatorioAuditoriaDuplicidades = useMemo(() => {
    return executarAuditoriaDuplicidades(organizationId, documentos, revisoes);
  }, [organizationId, documentos, revisoes]);

  // 2. Relatório comparativo com o Banco de Manuais (IA) (read-only)
  const relatorioIA: RelatorioComparativoManuaisIA = useMemo(() => {
    return executarComparativoAcervoComBancoManuaisIA(organizationId, documentos, revisoes, manuals);
  }, [organizationId, documentos, revisoes, manuals]);

  // Grupos filtrados do Acervo SGQ
  const gruposFiltrados = useMemo(() => {
    return relatorio.grupos.filter((grupo) => {
      if (filterSeverity === 'CRITICO' && grupo.grauSeveridade !== 'CRITICO_BLOQUEANTE') return false;
      if (filterSeverity === 'ALERTA' && grupo.grauSeveridade !== 'ALERTA_REVISAO_HUMANA') return false;
      if (filterSeverity === 'ORFA' && grupo.tipoConflito !== 'REVISAO_ORFA') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = grupo.descricao.toLowerCase().includes(term);
        const matchCode = grupo.documentos.some(
          (d) => d.codigo.toLowerCase().includes(term) || d.titulo.toLowerCase().includes(term)
        );
        return matchDesc || matchCode;
      }
      return true;
    });
  }, [relatorio, filterSeverity, searchTerm]);

  // Itens filtrados da Conciliação com Banco de Manuais (IA)
  const itensIAFiltrados = useMemo(() => {
    return relatorioIA.itens.filter((item) => {
      if (filtroStatusIA === 'DIVERGENTES' && item.statusComparacao === 'SINCRONIZADO') return false;
      if (filtroStatusIA === 'BANCO_IA_MAIS_RECENTE' && item.statusComparacao !== 'BANCO_IA_MAIS_RECENTE') return false;
      if (filtroStatusIA === 'ACERVO_SGQ_MAIS_RECENTE' && item.statusComparacao !== 'ACERVO_SGQ_MAIS_RECENTE') return false;
      if (filtroStatusIA === 'APENAS_NO_BANCO_IA' && item.statusComparacao !== 'APENAS_NO_BANCO_IA') return false;
      if (filtroStatusIA === 'APENAS_NO_ACERVO_SGQ' && item.statusComparacao !== 'APENAS_NO_ACERVO_SGQ') return false;
      if (filtroStatusIA === 'SINCRONIZADOS' && item.statusComparacao !== 'SINCRONIZADO') return false;

      if (searchIA.trim()) {
        const term = searchIA.toLowerCase();
        const matchCod = item.codigo.toLowerCase().includes(term);
        const matchTit = item.titulo.toLowerCase().includes(term);
        return matchCod || matchTit;
      }
      return true;
    });
  }, [relatorioIA, filtroStatusIA, searchIA]);

  // Manipuladores de seleção por grupo
  const handleSelectMaster = (grupoId: string, docId: string) => {
    setSelectedMasters((prev) => ({ ...prev, [grupoId]: docId }));
  };

  const handleSelectAcao = (
    grupoId: string,
    acao: 'CONSOLIDAR_MIGRANDO_REVISOES' | 'MANTER_LEGITIMO_DISTINTO'
  ) => {
    setAcoesEscolhidas((prev) => ({ ...prev, [grupoId]: acao }));
  };

  const handleJustificativaChange = (grupoId: string, text: string) => {
    setJustificativas((prev) => ({ ...prev, [grupoId]: text }));
  };

  // Simular Dry-Run
  const handleSimularGrupo = (grupo: GrupoDuplicidade) => {
    const masterId = selectedMasters[grupo.id] || grupo.documentoPrincipalSugeridoId || grupo.documentos[0]?.id;
    const acao = acoesEscolhidas[grupo.id] || 'CONSOLIDAR_MIGRANDO_REVISOES';
    const justif = justificativas[grupo.id] || grupo.justificativaSugerida || 'Simulação de consolidação SGQ';
    const secundarios = grupo.documentos.filter((d) => d.id !== masterId).map((d) => d.id);

    const plano: PlanoReconciliacao = {
      organizationId,
      criadoEm: new Date().toISOString(),
      responsavelNome: currentUser?.displayName || 'Gestor SGQ',
      itens: [
        {
          grupoId: grupo.id,
          documentoPrincipalId: masterId,
          documentosSecundariosIds: secundarios,
          acao,
          migrarRevisoes: true,
          migrarArquivos: true,
          migrarEvidenciasELogs: true,
          justificativaTecnica: justif,
        },
      ],
    };

    const res = simularReconciliacao(plano, relatorio);
    setSimulacaoResultado(res);
    setIsSimulacaoModalOpen(true);
  };

  // Abre Modal Interativo de Confirmação (Substitui confirm/alert)
  const handleAbrirModalConfirmacao = (grupo: GrupoDuplicidade) => {
    const masterId = selectedMasters[grupo.id] || grupo.documentoPrincipalSugeridoId || grupo.documentos[0]?.id;
    const acao = acoesEscolhidas[grupo.id] || 'CONSOLIDAR_MIGRANDO_REVISOES';
    const justif = justificativas[grupo.id] || grupo.justificativaSugerida || `Consolidação formal de cadastros duplicados conforme diretriz RBAC 145.109 / IS 145.109-001.`;

    setGrupoParaConfirmar(grupo);
    setModalMasterId(masterId);
    setModalAcao(acao);
    setModalJustificativa(justif);
    setModalErrorMessage(null);
    setIsConfirmModalOpen(true);
  };

  // Executa a reconciliação real após confirmação explícita no modal
  const handleConfirmarExecucaoModal = async () => {
    if (!grupoParaConfirmar) return;

    if (!modalJustificativa.trim()) {
      setModalErrorMessage('A justificativa técnica formal é obrigatória para registrar a reconciliação na auditoria SGQ.');
      return;
    }

    try {
      setIsProcessing(true);
      setModalErrorMessage(null);

      const secundarios = grupoParaConfirmar.documentos
        .filter((d) => d.id !== modalMasterId)
        .map((d) => d.id);

      const plano: PlanoReconciliacao = {
        organizationId,
        criadoEm: new Date().toISOString(),
        responsavelNome: currentUser?.displayName || 'Gestor SGQ',
        itens: [
          {
            grupoId: grupoParaConfirmar.id,
            documentoPrincipalId: modalMasterId,
            documentosSecundariosIds: secundarios,
            acao: modalAcao,
            migrarRevisoes: true,
            migrarArquivos: true,
            migrarEvidenciasELogs: true,
            justificativaTecnica: modalJustificativa.trim(),
          },
        ],
      };

      const res = await executarReconciliacaoFirestore(
        organizationId,
        plano,
        currentUser,
        documentos,
        revisoes
      );

      if (res.totalSucessos > 0) {
        showToast(`Reconciliação do grupo concluída com sucesso! Histórico preservado.`);
        setHistoricoAcoes((prev) => [
          `[${new Date().toLocaleTimeString('pt-BR')}] Grupo "${grupoParaConfirmar.id}" reconciliado: ${res.itens[0]?.mensagem}`,
          ...prev,
        ]);
        setIsConfirmModalOpen(false);
        setGrupoParaConfirmar(null);
        if (onDocumentosUpdated) onDocumentosUpdated();
      } else {
        setModalErrorMessage(res.itens[0]?.mensagem || 'Falha desconhecida na transação Firestore.');
      }
    } catch (err: any) {
      setModalErrorMessage(`Erro ao executar reconciliação: ${err.message || 'Erro de conexão ou permissão'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reconstrução de Índices de Unicidade
  const handleReconstruirIndices = async (dryRun: boolean) => {
    try {
      setIsProcessing(true);
      const res: ResultadoReconstrucaoIndices = await reconstruirIndicesUnicidade(
        organizationId,
        documentos,
        revisoes,
        dryRun,
        currentUser
      );

      if (!res.sucesso) {
        showToast(`Bloqueio de integridade: ${res.mensagem}`);
        setHistoricoAcoes((prev) => [
          `[${new Date().toLocaleTimeString('pt-BR')}] [BLOQUEIO] ${res.mensagem}`,
          ...prev,
        ]);
      } else {
        showToast(res.mensagem);
        setHistoricoAcoes((prev) => [
          `[${new Date().toLocaleTimeString('pt-BR')}] ${dryRun ? '[Dry-Run] ' : ''}Reconstrução de índices: ${res.totalIndicesGerados} índices verificados sem conflitos.`,
          ...prev,
        ]);
      }
    } catch (err: any) {
      showToast(`Erro ao reconstruir índices: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Conciliação de Item individual com Banco IA
  const handleExecutarSincronizacaoItemIA = async (item: ItemComparativoManualIA) => {
    try {
      setIsProcessingIA(true);
      const res = await sincronizarItemBancoManuaisIA(organizationId, item, currentUser);
      if (res.sucesso) {
        showToast(res.mensagem);
        setHistoricoAcoes((prev) => [
          `[${new Date().toLocaleTimeString('pt-BR')}] [Banco IA Conciliado] ${item.codigo}: ${res.mensagem}`,
          ...prev,
        ]);
        setIsModalIASyncOpen(false);
        setItemParaSincronizarIA(null);
        if (onDocumentosUpdated) onDocumentosUpdated();
        if (onManualsUpdated) onManualsUpdated();
      } else {
        showToast(res.mensagem);
      }
    } catch (err: any) {
      showToast(`Erro ao sincronizar com Banco IA: ${err.message}`);
    } finally {
      setIsProcessingIA(false);
    }
  };

  // Sincronizar Todas as Pendências com Banco IA
  const handleSincronizarTudoIA = async () => {
    const totalDivergentes = relatorioIA.itens.filter((i) => i.statusComparacao !== 'SINCRONIZADO').length;
    if (totalDivergentes === 0) {
      showToast('Todos os manuais já estão 100% sincronizados entre o Acervo SGQ e o Banco de Manuais (IA)!');
      return;
    }

    try {
      setIsProcessingIA(true);
      const res = await sincronizarTodasPendenciasBancoManuaisIA(organizationId, relatorioIA, currentUser);
      showToast(`Sincronização em lote concluída: ${res.sucessos} itens conciliados com sucesso!`);
      setHistoricoAcoes((prev) => [
        `[${new Date().toLocaleTimeString('pt-BR')}] [Lote Banco IA] ${res.sucessos} de ${res.totalProcessados} manuais conciliados.`,
        ...prev,
      ]);
      if (onDocumentosUpdated) onDocumentosUpdated();
      if (onManualsUpdated) onManualsUpdated();
    } catch (err: any) {
      showToast(`Erro na sincronização em lote: ${err.message}`);
    } finally {
      setIsProcessingIA(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Geral com Contexto Normativo */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white">
                  Auditoria de Integridade & Reconciliação Definitiva de Manuais
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  RBAC 145.109 / IS 145.109-001
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Unicidade Transacional & Banco IA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Diagnóstico de duplicidades cadastrais, códigos equivalentes por pontuação/caixa, revisões
                órfãs e consolidação segura com o Banco de Manuais (IA) e preservação cronológica imutável.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleReconstruirIndices(true)}
              disabled={isProcessing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Valida a consistência de índices sem alterar o Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              Simular Índices (Dry-Run)
            </button>
            <button
              onClick={() => handleReconstruirIndices(false)}
              disabled={isProcessing || relatorio.resumo.criticos > 0}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                relatorio.resumo.criticos > 0
                  ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
              title={
                relatorio.resumo.criticos > 0
                  ? 'Reconstrução bloqueada: resolva os conflitos críticos de código duplicado primeiro'
                  : 'Reconstrói atomicamente os índices transacionais no Firestore'
              }
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Reconstruir Índices
            </button>
          </div>
        </div>

        {/* Segmented Control de Camadas: Acervo SGQ vs Banco de Manuais (IA) */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTabMode('duplicidades_acervo')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === 'duplicidades_acervo'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800/40'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>1. Auditoria de Duplicidades no Acervo SGQ</span>
            {relatorio.resumo.criticos > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {relatorio.resumo.criticos}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTabMode('banco_manuais_ia')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTabMode === 'banco_manuais_ia'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-blue-950/40'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800/40'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>2. Verificação & Conciliação com Banco de Manuais (IA)</span>
            {(relatorioIA.totalBancoIAMaisRecente > 0 || relatorioIA.totalAcervoSGQMaisRecente > 0 || relatorioIA.totalApenasNoBancoIA > 0) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {relatorioIA.totalBancoIAMaisRecente + relatorioIA.totalAcervoSGQMaisRecente + relatorioIA.totalApenasNoBancoIA}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAMADA 1: AUDITORIA DE DUPLICIDADES NO ACERVO SGQ                        */}
      {/* ========================================================================= */}
      {activeTabMode === 'duplicidades_acervo' && (
        <div className="space-y-6">
          {/* Resumo de Indicadores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Manuais no Acervo</span>
              <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                {relatorio.totalDocumentosAnalisados}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="text-[11px] text-rose-300 block font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Conflitos Críticos
              </span>
              <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">
                {relatorio.resumo.criticos}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-[11px] text-amber-300 block font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Alertas de Similaridade
              </span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
                {relatorio.resumo.alertas}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
              <span className="text-[11px] text-sky-300 block font-medium flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-sky-400" />
                Revisões Órfãs
              </span>
              <span className="text-xl font-bold font-mono text-sky-400 mt-0.5 block">
                {relatorio.resumo.revisoesOrfas}
              </span>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Severidade:</span>
              {(['TODOS', 'CRITICO', 'ALERTA', 'ORFA'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterSeverity === sev
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sev === 'TODOS'
                    ? 'Todos'
                    : sev === 'CRITICO'
                    ? `Críticos (${relatorio.resumo.criticos})`
                    : sev === 'ALERTA'
                    ? `Alertas (${relatorio.resumo.alertas})`
                    : `Órfãs (${relatorio.resumo.revisoesOrfas})`}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código, título ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Lista de Grupos de Duplicidade */}
          <div className="space-y-4">
            {gruposFiltrados.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Nenhuma duplicidade pendente no Acervo SGQ</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Todos os manuais ativos possuem códigos unívocos, integridade transacional de revisões e
                  conformidade com os padrões da RBAC 145.109.
                </p>
              </div>
            ) : (
              gruposFiltrados.map((grupo, idx) => {
                const isExpanded = expandedGroupId === grupo.id || gruposFiltrados.length === 1;
                const masterId =
                  selectedMasters[grupo.id] || grupo.documentoPrincipalSugeridoId || grupo.documentos[0]?.id;
                const acao = acoesEscolhidas[grupo.id] || 'CONSOLIDAR_MIGRANDO_REVISOES';

                return (
                  <div
                    key={grupo.id}
                    className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                      grupo.grauSeveridade === 'CRITICO_BLOQUEANTE'
                        ? 'border-rose-500/40 shadow-rose-950/20'
                        : 'border-amber-500/40 shadow-amber-950/20'
                    }`}
                  >
                    {/* Cabeçalho do Card de Grupo */}
                    <div
                      onClick={() => setExpandedGroupId(isExpanded ? null : grupo.id)}
                      className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            grupo.grauSeveridade === 'CRITICO_BLOQUEANTE'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {grupo.grauSeveridade === 'CRITICO_BLOQUEANTE' ? (
                            <ShieldAlert className="w-5 h-5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-white">
                              Grupo #{idx + 1}: {grupo.chaveAgrupamento}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                grupo.tipoConflito === 'CODIGO_EXATO'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : grupo.tipoConflito === 'CODIGO_NORMALIZADO_EQUIVALENTE'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : grupo.tipoConflito === 'REVISAO_ORFA'
                                  ? 'bg-sky-500/20 text-sky-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {grupo.tipoConflito}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({grupo.documentos.length} cadastro(s) envolvido(s))
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{grupo.descricao}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-sky-400 font-medium hidden sm:inline">
                          {isExpanded ? 'Recolher detalhes' : 'Analisar & Reconciliar'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Conteúdo Expandido do Grupo */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-800 bg-slate-950/40 space-y-6">
                        {/* Exibição dos Documentos do Grupo */}
                        <div>
                          <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Cadastros Identificados no Acervo SGQ
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grupo.documentos.map((docItem) => {
                              const isMaster = docItem.id === masterId;
                              return (
                                <div
                                  key={docItem.id}
                                  onClick={() => handleSelectMaster(grupo.id, docItem.id)}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                                    isMaster
                                      ? 'bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/30'
                                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {isMaster && (
                                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Cadastro Principal (Master)
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold font-mono text-white">
                                        {docItem.codigo}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        (ID: {docItem.id})
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-200 font-medium line-clamp-2">
                                      {docItem.titulo}
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                                      <div>
                                        <span className="text-slate-500 block">Revisão Vigente:</span>
                                        <span className="text-emerald-400 font-mono font-bold">
                                          {docItem.numeroRevisao}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block">Total de Revisões:</span>
                                        <span className="text-slate-200 font-mono">
                                          {docItem.totalRevisoes} reg.
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block">Arquivo Físico:</span>
                                        <span
                                          className={`font-medium ${
                                            docItem.temArquivo ? 'text-sky-400' : 'text-slate-500'
                                          }`}
                                        >
                                          {docItem.temArquivo ? docItem.arquivoNome || 'Anexado' : 'Sem anexo'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block">Cadastrado em:</span>
                                        <span className="text-slate-400 font-mono">
                                          {docItem.createdAt?.split('T')[0] || '-'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectMaster(grupo.id, docItem.id);
                                        }}
                                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                          isMaster
                                            ? 'bg-emerald-600 text-white border-emerald-500'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                        }`}
                                      >
                                        {isMaster ? '✓ Selecionado como Master' : 'Eleger como Principal'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Exibição de Revisões Órfãs */}
                        {grupo.revisoesOrfas && grupo.revisoesOrfas.length > 0 && (
                          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
                            <h6 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-2">
                              <History className="w-4 h-4" />
                              Revisões Órfãs a serem reconectadas ao Master:
                            </h6>
                            <ul className="text-xs text-slate-300 space-y-1">
                              {grupo.revisoesOrfas.map((orf) => (
                                <li key={orf.id} className="font-mono text-[11px] text-slate-400">
                                  • ID: {orf.id} — {orf.numeroRevisao} ({orf.codigoDocumento} - {orf.tituloDocumento})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Painel de Decisão de Reconciliação */}
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h6 className="text-xs font-bold text-white">
                                Decisão de Reconciliação Técnica (SGQ)
                              </h6>
                              <p className="text-[11px] text-slate-400">
                                Defina o plano de ação formal para sanar a duplicidade sem perder histórico.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectAcao(grupo.id, 'CONSOLIDAR_MIGRANDO_REVISOES')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                  acao === 'CONSOLIDAR_MIGRANDO_REVISOES'
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                Consolidar no Master
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectAcao(grupo.id, 'MANTER_LEGITIMO_DISTINTO')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                  acao === 'MANTER_LEGITIMO_DISTINTO'
                                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                Manter Distintos
                              </button>
                            </div>
                          </div>

                          {/* Campo de Justificativa */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Justificativa Técnica para Auditoria:
                            </label>
                            <textarea
                              rows={2}
                              value={justificativas[grupo.id] ?? grupo.justificativaSugerida}
                              onChange={(e) => handleJustificativaChange(grupo.id, e.target.value)}
                              placeholder="Informe a fundamentação da decisão técnica para registro em auditoria..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          {/* Botões de Ação */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleSimularGrupo(grupo)}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Simular Impacto (Dry-Run)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirModalConfirmacao(grupo)}
                              disabled={isProcessing}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Consolidar no Master & Confirmar Reconciliação
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CAMADA 2: VERIFICAÇÃO & CONCILIAÇÃO COM BANCO DE MANUAIS (IA)             */}
      {/* ========================================================================= */}
      {activeTabMode === 'banco_manuais_ia' && (
        <div className="space-y-6">
          {/* Indicadores de Comparação Cruzada */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Acervo SGQ vs IA</span>
              <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                {relatorioIA.totalDocumentosSGQ} / {relatorioIA.totalManuaisIA}
              </span>
              <span className="text-[10px] text-slate-500">Cadastros totais</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-300 block font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Sincronizados
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                {relatorioIA.totalSincronizados}
              </span>
              <span className="text-[10px] text-emerald-500">100% alinhados</span>
            </div>

            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
              <span className="text-[11px] text-sky-300 block font-medium flex items-center gap-1">
                <DownloadCloud className="w-3.5 h-3.5 text-sky-400" />
                IA Mais Recente
              </span>
              <span className="text-xl font-bold font-mono text-sky-400 mt-0.5 block">
                {relatorioIA.totalBancoIAMaisRecente}
              </span>
              <span className="text-[10px] text-sky-500">Importar para SGQ</span>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <span className="text-[11px] text-indigo-300 block font-medium flex items-center gap-1">
                <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                SGQ Mais Recente
              </span>
              <span className="text-xl font-bold font-mono text-indigo-400 mt-0.5 block">
                {relatorioIA.totalAcervoSGQMaisRecente}
              </span>
              <span className="text-[10px] text-indigo-500">Atualizar Banco IA</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-[11px] text-amber-300 block font-medium flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Apenas no Banco IA
              </span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
                {relatorioIA.totalApenasNoBancoIA}
              </span>
              <span className="text-[10px] text-amber-500">Cadastrar no Acervo</span>
            </div>
          </div>

          {/* Barra de Filtros e Ação em Lote */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              {(
                [
                  'TODOS',
                  'DIVERGENTES',
                  'BANCO_IA_MAIS_RECENTE',
                  'ACERVO_SGQ_MAIS_RECENTE',
                  'APENAS_NO_BANCO_IA',
                  'APENAS_NO_ACERVO_SGQ',
                  'SINCRONIZADOS',
                ] as const
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroStatusIA(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filtroStatusIA === f
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'TODOS'
                    ? 'Todos'
                    : f === 'DIVERGENTES'
                    ? `Divergentes (${relatorioIA.totalBancoIAMaisRecente + relatorioIA.totalAcervoSGQMaisRecente + relatorioIA.totalApenasNoBancoIA})`
                    : f === 'BANCO_IA_MAIS_RECENTE'
                    ? `IA Nova (${relatorioIA.totalBancoIAMaisRecente})`
                    : f === 'ACERVO_SGQ_MAIS_RECENTE'
                    ? `SGQ Novo (${relatorioIA.totalAcervoSGQMaisRecente})`
                    : f === 'APENAS_NO_BANCO_IA'
                    ? `Apenas IA (${relatorioIA.totalApenasNoBancoIA})`
                    : f === 'APENAS_NO_ACERVO_SGQ'
                    ? `Apenas SGQ (${relatorioIA.totalApenasNoAcervoSGQ})`
                    : `Sincronizados (${relatorioIA.totalSincronizados})`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar manual ou código..."
                  value={searchIA}
                  onChange={(e) => setSearchIA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleSincronizarTudoIA}
                disabled={isProcessingIA || relatorioIA.itens.every((i) => i.statusComparacao === 'SINCRONIZADO')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  relatorioIA.itens.every((i) => i.statusComparacao === 'SINCRONIZADO')
                    ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                }`}
                title="Sincroniza automaticamente todas as divergências detectadas"
              >
                <ArrowLeftRight className={`w-3.5 h-3.5 ${isProcessingIA ? 'animate-spin' : ''}`} />
                Conciliar Todas as Pendências
              </button>
            </div>
          </div>

          {/* Lista de Manuais Comparados */}
          <div className="space-y-3">
            {itensIAFiltrados.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Nenhuma divergência encontrada</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  O Acervo de Controle Documental SGQ e o Banco de Manuais (IA) estão em perfeita harmonia.
                </p>
              </div>
            ) : (
              itensIAFiltrados.map((item) => {
                const isSync = item.statusComparacao === 'SINCRONIZADO';
                const isIAMaisNova = item.statusComparacao === 'BANCO_IA_MAIS_RECENTE';
                const isSGQMaisNova = item.statusComparacao === 'ACERVO_SGQ_MAIS_RECENTE';
                const isApenasIA = item.statusComparacao === 'APENAS_NO_BANCO_IA';
                const isApenasSGQ = item.statusComparacao === 'APENAS_NO_ACERVO_SGQ';

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all ${
                      isSync
                        ? 'border-slate-800 hover:border-slate-700'
                        : isIAMaisNova
                        ? 'border-sky-500/40 bg-sky-950/10'
                        : isSGQMaisNova
                        ? 'border-indigo-500/40 bg-indigo-950/10'
                        : isApenasIA
                        ? 'border-amber-500/40 bg-amber-950/10'
                        : 'border-slate-700 bg-slate-950/30'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Lado Esquerdo: Identificação e Badge */}
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-white">{item.codigo}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.origemTipo === 'INTERNO'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {item.origemTipo === 'INTERNO' ? 'Uso Interno Empresa' : item.origemTipo}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isSync
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isIAMaisNova
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                                : isSGQMaisNova
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : isApenasIA
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isSync
                              ? '✓ Sincronizado'
                              : isIAMaisNova
                              ? 'Banco IA Mais Recente'
                              : isSGQMaisNova
                              ? 'Acervo SGQ Mais Recente'
                              : isApenasIA
                              ? 'Apenas no Banco IA'
                              : 'Apenas no Acervo SGQ'}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-200">{item.titulo}</p>
                        <p className="text-[11px] text-slate-400">{item.detalheDiferenca}</p>
                      </div>

                      {/* Centro: Comparativo Lado a Lado */}
                      <div className="grid grid-cols-2 gap-3 min-w-[280px] bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                        {/* Acervo SGQ */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Acervo SGQ
                          </span>
                          <div className="font-mono font-bold text-white text-xs">
                            {item.revisaoSGQ || <span className="text-slate-500 font-normal">Não cadastrado</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {item.dataSGQ ? item.dataSGQ.split('T')[0] : '-'}
                          </span>
                        </div>

                        {/* Banco de Manuais IA */}
                        <div className="space-y-1 border-l border-slate-800 pl-3">
                          <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Banco IA
                          </span>
                          <div className="font-mono font-bold text-white text-xs">
                            {item.revisaoIA || <span className="text-slate-500 font-normal">Não indexado</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {item.dataIA ? item.dataIA.split('T')[0] : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Lado Direito: Ação de Conciliação */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.acaoRecomendada === 'IMPORTAR_REVISAO_PARA_SGQ' && (
                          <button
                            onClick={() => {
                              setItemParaSincronizarIA(item);
                              setIsModalIASyncOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                            Importar para Acervo SGQ
                          </button>
                        )}

                        {item.acaoRecomendada === 'ATUALIZAR_BANCO_IA' && (
                          <button
                            onClick={() => {
                              setItemParaSincronizarIA(item);
                              setIsModalIASyncOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            Atualizar Banco IA
                          </button>
                        )}

                        {item.acaoRecomendada === 'CADASTRAR_NO_ACERVO_SGQ' && (
                          <button
                            onClick={() => {
                              setItemParaSincronizarIA(item);
                              setIsModalIASyncOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            Cadastrar no Acervo SGQ
                          </button>
                        )}

                        {item.acaoRecomendada === 'PUBLICAR_NO_BANCO_IA' && (
                          <button
                            onClick={() => {
                              setItemParaSincronizarIA(item);
                              setIsModalIASyncOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Publicar no Banco IA
                          </button>
                        )}

                        {item.acaoRecomendada === 'NENHUMA' && (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 px-3 py-2 bg-emerald-950/20 rounded-xl border border-emerald-900/40">
                            <Check className="w-3.5 h-3.5" /> Em Conformidade
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Histórico Recente de Ações de Reconciliação */}
      {historicoAcoes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <h5 className="text-xs font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            Registro de Auditoria de Reconciliação Nesta Sessão
          </h5>
          <div className="space-y-1">
            {historicoAcoes.map((log, i) => (
              <p
                key={i}
                className="text-xs font-mono text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-900/40"
              >
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL INTERATIVO DE CONFIRMAÇÃO DE RECONCILIAÇÃO (SEM WINDOW.CONFIRM)     */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && grupoParaConfirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Confirmar Reconciliação Definitiva SGQ
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ação formal de consolidação documental com integridade transacional
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setGrupoParaConfirmar(null);
                }}
                disabled={isProcessing}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {modalErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalErrorMessage}</span>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Card Resumo do Manual Principal (Master) */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Manual Principal Eleito (Master)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    Preservado & Ativo
                  </span>
                </div>
                {(() => {
                  const masterDoc = grupoParaConfirmar.documentos.find((d) => d.id === modalMasterId);
                  return (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-white">
                          {masterDoc?.codigo || grupoParaConfirmar.chaveAgrupamento}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">(ID: {modalMasterId})</span>
                      </div>
                      <p className="text-xs text-slate-200 mt-0.5">{masterDoc?.titulo}</p>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        Revisão Atual: {masterDoc?.numeroRevisao || '-'}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Card dos Cadastros Secundários a Serem Inativados */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cadastros Secundários que serão Inativados Logicamente:
                </span>
                <div className="space-y-2">
                  {grupoParaConfirmar.documentos
                    .filter((d) => d.id !== modalMasterId)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-rose-400">{d.codigo}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {d.id}</span>
                        </div>
                        <p className="text-slate-300 line-clamp-1">{d.titulo}</p>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Revisão {d.numeroRevisao} • {d.totalRevisoes} revisões a migrar
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Justificativa Técnica Obrigatória */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200">
                  Justificativa Técnica para Auditoria (Obrigatória):
                </label>
                <textarea
                  rows={3}
                  value={modalJustificativa}
                  onChange={(e) => setModalJustificativa(e.target.value)}
                  placeholder="Descreva a fundamentação técnica para consolidação das revisões..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-slate-500">
                  Esta justificativa será registrada de forma indelével no log de auditoria SGQ e anexada
                  ao histórico de cada revisão migrada.
                </p>
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setGrupoParaConfirmar(null);
                }}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExecucaoModal}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processando Reconciliação no Firestore...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar e Aplicar no Firestore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO INDIVIDUAL COM BANCO DE MANUAIS IA                   */}
      {/* ========================================================================= */}
      {isModalIASyncOpen && itemParaSincronizarIA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                <h4 className="text-base font-bold text-white">Conciliar com Banco de Manuais (IA)</h4>
              </div>
              <button
                onClick={() => {
                  setIsModalIASyncOpen(false);
                  setItemParaSincronizarIA(null);
                }}
                disabled={isProcessingIA}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-mono text-sm font-bold text-white block">
                  {itemParaSincronizarIA.codigo}
                </span>
                <p className="text-slate-300">{itemParaSincronizarIA.titulo}</p>
                <p className="text-sky-300 text-[11px] pt-1">{itemParaSincronizarIA.detalheDiferenca}</p>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs">
                {itemParaSincronizarIA.acaoRecomendada === 'IMPORTAR_REVISAO_PARA_SGQ' &&
                  'Esta ação criará uma nova revisão formal no Acervo SGQ com os dados e vigência do Banco de Manuais (IA), atualizando a revisão vigente do documento.'}
                {itemParaSincronizarIA.acaoRecomendada === 'ATUALIZAR_BANCO_IA' &&
                  'Esta ação atualizará o registro do Banco de Manuais (IA) com a revisão vigente e vigência controlada no Acervo SGQ.'}
                {itemParaSincronizarIA.acaoRecomendada === 'CADASTRAR_NO_ACERVO_SGQ' &&
                  'Esta ação criará um novo Documento Controlado e sua respectiva Revisão Vigente no Acervo SGQ a partir do manual do Banco IA.'}
                {itemParaSincronizarIA.acaoRecomendada === 'PUBLICAR_NO_BANCO_IA' &&
                  'Esta ação indexará este documento do Acervo SGQ no Banco de Manuais (IA) para uso em inteligência artificial e buscas textuais.'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalIASyncOpen(false);
                  setItemParaSincronizarIA(null);
                }}
                disabled={isProcessingIA}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExecutarSincronizacaoItemIA(itemParaSincronizarIA)}
                disabled={isProcessingIA}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
              >
                {isProcessingIA ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Conciliando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Conciliação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Simulação (Dry-Run Preview) */}
      {isSimulacaoModalOpen && simulacaoResultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Relatório de Simulação de Reconciliação (Dry-Run)
              </h4>
              <button
                onClick={() => setIsSimulacaoModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-300">
                Nenhuma alteração foi realizada no Firestore. Esta simulação demonstra o resultado planejado:
              </p>
              {simulacaoResultado.itens.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 font-mono">Grupo: {item.grupoId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      Sucesso na Validação
                    </span>
                  </div>
                  <p className="text-slate-200">{item.mensagem}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                    <span>Revisões a Migrar: {item.totalRevisoesMigradas}</span>
                    <span>Índices a Atualizar: {item.totalIndicesAtualizados}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsSimulacaoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Fechar Simulação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
