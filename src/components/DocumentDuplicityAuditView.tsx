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
  UserProfile,
} from '../types';
import {
  executarAuditoriaDuplicidades,
  simularReconciliacao,
  executarReconciliacaoFirestore,
  reconstruirIndicesUnicidade,
  normalizeDocumentCode,
} from '../services/documentControlAuditReconciliation';

interface DocumentDuplicityAuditViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  documentos: DocumentoControlado[];
  revisoes: RevisaoDocumental[];
  onDocumentosUpdated?: () => void;
  showToast: (msg: string) => void;
}

export const DocumentDuplicityAuditView: React.FC<DocumentDuplicityAuditViewProps> = ({
  organizationId,
  currentUser,
  documentos,
  revisoes,
  onDocumentosUpdated,
  showToast,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'TODOS' | 'CRITICO' | 'ALERTA' | 'ORFA'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // Estados de reconciliação para grupos
  const [selectedMasters, setSelectedMasters] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [acoesEscolhidas, setAcoesEscolhidas] = useState<
    Record<string, 'CONSOLIDAR_MIGRANDO_REVISOES' | 'MANTER_LEGITIMO_DISTINTO'>
  >({});

  // Estados de execução e modal de simulação
  const [simulacaoResultado, setSimulacaoResultado] = useState<ResultadoReconciliacao | null>(null);
  const [isSimulacaoModalOpen, setIsSimulacaoModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historicoAcoes, setHistoricoAcoes] = useState<string[]>([]);

  // Executa a auditoria read-only
  const relatorio: RelatorioAuditoriaDuplicidades = useMemo(() => {
    return executarAuditoriaDuplicidades(organizationId, documentos, revisoes);
  }, [organizationId, documentos, revisoes]);

  // Grupos filtrados
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

  // Manipular seleção de master para um grupo
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

  // Simular reconciliação de um grupo
  const handleSimularGrupo = (grupo: GrupoDuplicidade) => {
    const masterId = selectedMasters[grupo.id] || grupo.documentoPrincipalSugeridoId || grupo.documentos[0]?.id;
    const acao = acoesEscolhidas[grupo.id] || 'CONSOLIDAR_MIGRANDO_REVISOES';
    const justif = justificativas[grupo.id] || grupo.justificativaSugerida;

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

  // Executar reconciliação real de um grupo
  const handleExecutarGrupo = async (grupo: GrupoDuplicidade) => {
    const masterId = selectedMasters[grupo.id] || grupo.documentoPrincipalSugeridoId || grupo.documentos[0]?.id;
    const acao = acoesEscolhidas[grupo.id] || 'CONSOLIDAR_MIGRANDO_REVISOES';
    const justif = justificativas[grupo.id] || grupo.justificativaSugerida;

    if (!justif.trim()) {
      alert('Justificativa técnica é obrigatória para executar a reconciliação e registrar na auditoria.');
      return;
    }

    const confirmMsg =
      acao === 'MANTER_LEGITIMO_DISTINTO'
        ? `Confirma marcar o grupo "${grupo.id}" como documentos legítimos distintos?`
        : `Confirma consolidar o grupo no manual principal (ID: ${masterId})?\nAs revisões dos demais cadastros serão migradas com integridade e os registros secundários serão inativados logicamente com preservação histórica.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsProcessing(true);
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
          `[${new Date().toLocaleTimeString('pt-BR')}] Grupo "${grupo.id}" reconciliado: ${res.itens[0]?.mensagem}`,
          ...prev,
        ]);
        if (onDocumentosUpdated) onDocumentosUpdated();
      } else {
        alert(`Falha na reconciliação: ${res.itens[0]?.mensagem || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      alert(`Erro ao executar reconciliação: ${err.message}`);
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
        alert(
          `Bloqueio de Integridade:\n${res.mensagem}\n\nConflitos que impedem a reconstrução:\n` +
            res.conflitos
              .map((c) => `• Código "${c.codigo}": ${c.documentosConflitantes.map((d) => d.id).join(', ')}`)
              .join('\n')
        );
      } else {
        showToast(res.mensagem);
        setHistoricoAcoes((prev) => [
          `[${new Date().toLocaleTimeString('pt-BR')}] ${dryRun ? '[Dry-Run] ' : ''}Reconstrução de índices: ${res.totalIndicesGerados} índices verificados sem conflitos.`,
          ...prev,
        ]);
      }
    } catch (err: any) {
      alert(`Erro ao reconstruir índices: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com Contexto Normativo */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white">
                  Auditoria de Integridade & Reconciliação Definitiva de Manuais Duplicados
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  RBAC 145.109 / IS 145.109-001
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Unicidade Transacional Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Diagnóstico de duplicidades cadastrais, códigos equivalentes por pontuação/caixa, revisões
                órfãs e consolidação segura com histórico cronológico imutável.
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

        {/* Resumo de Indicadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
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
            <h4 className="text-base font-bold text-white">Nenhuma duplicidade detectada no acervo</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Todos os manuais ativos possuem códigos unívocos, revisões associadas aos seus documentos-pai
              válidos e integridade cadastral 100% em conformidade com o SGQ.
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
                        Cadastros Identificados no Acervo
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

                    {/* Exibição de Revisões Órfãs (se houver) */}
                    {grupo.revisoesOrfas && grupo.revisoesOrfas.length > 0 && (
                      <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
                        <h6 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-2">
                          <History className="w-4 h-4" />
                          Revisões Órfãs a serem reconectadas:
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

                    {/* Painel de Ação de Reconciliação */}
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
                                ? 'bg-indigo-600 text-white border-indigo-500'
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
                                ? 'bg-amber-600 text-white border-amber-500'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            Manter Distintos
                          </button>
                        </div>
                      </div>

                      {/* Campo de Justificativa Obrigatória */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Justificativa Técnica para Auditoria (Obrigatória):
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
                          onClick={() => handleExecutarGrupo(grupo)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmar Reconciliação SGQ
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

      {/* Histórico Recente de Ações de Reconciliação */}
      {historicoAcoes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
          <h5 className="text-xs font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            Registro de Auditoria de Reconciliação Nesta Sessão
          </h5>
          <div className="space-y-1">
            {historicoAcoes.map((log, i) => (
              <p key={i} className="text-xs font-mono text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-900/40">
                {log}
              </p>
            ))}
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
