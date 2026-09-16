import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Layers,
  Sparkles,
  FileText,
  ExternalLink,
  Plus,
  RefreshCw,
  Calendar,
  MapPin,
  Check,
  AlertCircle,
  X,
  ChevronRight,
  Info,
  Sliders,
  Plane,
  FileCheck,
  HelpCircle,
  Link as LinkIcon,
  Tag,
  BookOpen,
  ArrowUpRight,
  Cpu
} from 'lucide-react';
import {
  ClienteExterno,
  BaseEstacaoOperacao,
  ProgramaChecklistCliente,
  ControleCentralSGQ,
  RequisitoClienteItem,
  AvaliacaoRequisitoCliente,
  CriticidadeRequisito,
  ResultadoAvaliacaoRequisito,
  UserProfile,
  OrganizationRecord,
  NCRecord
} from '../types';
import {
  executarPreAvaliacaoRequisito,
  construirPayloadRNCDeRequisitoCliente
} from '../services/clientRequirementsEngine';
import {
  calcularMetricasDashboardClientes
} from '../services/firebase/clientRequirementsFirestore';

interface ClientAuditsManagementViewProps {
  clientes: ClienteExterno[];
  bases: BaseEstacaoOperacao[];
  programas: ProgramaChecklistCliente[];
  controles: ControleCentralSGQ[];
  requisitos: RequisitoClienteItem[];
  avaliacoes: AvaliacaoRequisitoCliente[];
  activeOrganization?: OrganizationRecord | null;
  userProfile?: UserProfile | null;
  onSaveAvaliacao: (avaliacao: Partial<AvaliacaoRequisitoCliente>) => Promise<void>;
  onCriarRNCDeRequisito?: (rncPayload: Partial<NCRecord>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ClientAuditsManagementView: React.FC<ClientAuditsManagementViewProps> = ({
  clientes,
  bases,
  programas,
  controles,
  requisitos,
  avaliacoes,
  activeOrganization,
  userProfile,
  onSaveAvaliacao,
  onCriarRNCDeRequisito,
  onNavigateToTab,
}) => {
  // Navigation internal tab
  const [subTab, setSubTab] = useState<'cockpit' | 'clientes' | 'requisitos' | 'matriz' | 'cronograma'>('requisitos');

  // Filters
  const [selectedClienteFilter, setSelectedClienteFilter] = useState<string>('TODOS');
  const [selectedBaseFilter, setSelectedBaseFilter] = useState<string>('TODOS');
  const [selectedCriticidadeFilter, setSelectedCriticidadeFilter] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Assessment Modal state
  const [evaluatingRequisito, setEvaluatingRequisito] = useState<RequisitoClienteItem | null>(null);
  const [selectedBaseForEvaluation, setSelectedBaseForEvaluation] = useState<string>('BASE-SOD');
  const [evaluationResult, setEvaluationResult] = useState<ResultadoAvaliacaoRequisito>('CONFORME');
  const [evaluationJustification, setEvaluationJustification] = useState<string>('');
  const [evaluationEvidenceTitle, setEvaluationEvidenceTitle] = useState<string>('');
  const [evaluationEvidenceRef, setEvaluationEvidenceRef] = useState<string>('');
  const [savingEvaluation, setSavingEvaluation] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Metrics computation
  const { metrics, matrizCobertura, lacunas } = useMemo(() => {
    return calcularMetricasDashboardClientes(clientes, programas, requisitos, avaliacoes, bases, controles);
  }, [clientes, programas, requisitos, avaliacoes, bases, controles]);

  // Filtered Requirements
  const filteredRequisitos = useMemo(() => {
    return requisitos.filter((req) => {
      // Cliente filter
      if (selectedClienteFilter !== 'TODOS' && req.clienteId !== selectedClienteFilter && req.clienteNome !== selectedClienteFilter) {
        return false;
      }

      // Base filter
      if (selectedBaseFilter !== 'TODOS') {
        const baseItem = bases.find((b) => b.id === selectedBaseFilter);
        const baseCod = baseItem?.codigo;
        if (req.aplicabilidadeRegras?.basesAplicaveis && baseCod) {
          if (!req.aplicabilidadeRegras.basesAplicaveis.includes(baseCod)) {
            return false;
          }
        }
      }

      // Criticidade filter
      if (selectedCriticidadeFilter !== 'TODOS' && req.criticidade !== selectedCriticidadeFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNumber = req.numeroItem.toLowerCase().includes(term);
        const matchTitle = req.tituloCurto.toLowerCase().includes(term);
        const matchText = req.textoOriginal.toLowerCase().includes(term);
        const matchCtrl = (req.controleCentralNome || '').toLowerCase().includes(term);
        const matchClient = req.clienteNome.toLowerCase().includes(term);
        if (!matchNumber && !matchTitle && !matchText && !matchCtrl && !matchClient) {
          return false;
        }
      }

      return true;
    });
  }, [requisitos, selectedClienteFilter, selectedBaseFilter, selectedCriticidadeFilter, searchTerm, bases]);

  // Open Evaluation Modal
  const handleOpenEvaluationModal = (req: RequisitoClienteItem) => {
    setEvaluatingRequisito(req);
    // Find base
    const defaultBaseId = req.aplicabilidadeRegras?.basesAplicaveis?.[0]
      ? bases.find((b) => b.codigo === req.aplicabilidadeRegras.basesAplicaveis?.[0])?.id || 'BASE-SOD'
      : 'BASE-SOD';
    setSelectedBaseForEvaluation(defaultBaseId);

    // Existing evaluation?
    const existing = avaliacoes.find((a) => a.requisitoId === req.id && a.baseId === defaultBaseId);
    if (existing) {
      setEvaluationResult(existing.resultado);
      setEvaluationJustification(existing.justificativa || '');
      setEvaluationEvidenceTitle(existing.evidencias?.[0]?.titulo || '');
      setEvaluationEvidenceRef(existing.evidencias?.[0]?.numeroReferencia || '');
    } else {
      setEvaluationResult('CONFORME');
      setEvaluationJustification('');
      setEvaluationEvidenceTitle('');
      setEvaluationEvidenceRef('');
    }
  };

  // Submit Evaluation
  const handleSaveEvaluation = async () => {
    if (!evaluatingRequisito) return;
    setSavingEvaluation(true);

    try {
      const selectedBaseObj = bases.find((b) => b.id === selectedBaseForEvaluation);
      const baseCodigo = selectedBaseObj?.codigo || 'SOD';
      const baseNome = selectedBaseObj?.nome || 'Base Operacional';

      // Smart pre-evaluation engine analysis
      const preAnalysis = executarPreAvaliacaoRequisito(
        evaluatingRequisito,
        controles.find((c) => c.id === evaluatingRequisito.controleCentralId)
      );

      const payload: Partial<AvaliacaoRequisitoCliente> = {
        organizationId: activeOrganization?.id || 'org_impacto_aviation',
        clienteId: evaluatingRequisito.clienteId,
        clienteNome: evaluatingRequisito.clienteNome,
        programaId: evaluatingRequisito.programaId,
        programaCodigo: evaluatingRequisito.programaCodigo,
        requisitoId: evaluatingRequisito.id,
        numeroItem: evaluatingRequisito.numeroItem,
        tituloRequisito: evaluatingRequisito.tituloCurto,
        baseId: selectedBaseForEvaluation,
        baseCodigo,
        baseNome,
        dataAvaliacao: new Date().toISOString().split('T')[0],
        dataValidade: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        proximaAvaliacao: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        resultado: evaluationResult,
        metodoVerificacao: evaluatingRequisito.metodoVerificacao,
        determinacaoAutomatica: {
          status: preAnalysis.status,
          justificativa: preAnalysis.justificativa,
          evidenciasIdentificadas: preAnalysis.evidenciasIdentificadas,
          confiancaScore: preAnalysis.confiancaScore,
          analisadoEm: new Date().toISOString(),
        },
        avaliadorUid: userProfile?.uid || 'user_sgq',
        avaliadorNome: userProfile?.displayName || 'Auditor SGQ',
        justificativa: evaluationJustification || preAnalysis.justificativa,
        evidencias: evaluationEvidenceTitle
          ? [
              {
                id: `EVID-${Date.now()}`,
                tipo: 'DOCUMENTO',
                titulo: evaluationEvidenceTitle,
                numeroReferencia: evaluationEvidenceRef,
                dataEvidencia: new Date().toISOString().split('T')[0],
                responsavel: userProfile?.displayName || 'Garantia da Qualidade',
                organizationId: activeOrganization?.id || 'org_impacto_aviation',
              },
            ]
          : [],
      };

      await onSaveAvaliacao(payload);

      setFeedbackMessage({
        type: 'success',
        text: `Avaliação do requisito ${evaluatingRequisito.numeroItem} registrada com sucesso na base ${baseCodigo}.`,
      });
      setEvaluatingRequisito(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Erro ao registrar avaliação: ${err.message || 'Falha de comunicação'}`,
      });
    } finally {
      setSavingEvaluation(false);
    }
  };

  // Generate RNC from failed requirement
  const handleGerarRNC = (req: RequisitoClienteItem) => {
    const defaultBaseObj = bases.find((b) => b.id === selectedBaseForEvaluation) || bases[0];
    const rncPayload = construirPayloadRNCDeRequisitoCliente(
      req,
      {
        baseId: defaultBaseObj?.id || 'BASE-SOD',
        baseCodigo: defaultBaseObj?.codigo || 'SOD',
        baseNome: defaultBaseObj?.nome || 'Base Principal',
        justificativa: evaluationJustification || 'Não conformidade constatada durante auditoria periódica de cliente.',
      },
      userProfile,
      `NC-${Math.floor(100 + Math.random() * 900)}`
    );

    if (onCriarRNCDeRequisito) {
      onCriarRNCDeRequisito(rncPayload);
      setEvaluatingRequisito(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header com Princípio Fundamental do SGQ */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                FASE 13 — SGQ AERONÁUTICO
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> Multi-Tenant Isolado
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Auditorias, Requisitos e Controles de Clientes
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Arquitetura de governança contínua para atendimento unificado aos checklists contratuais de operadores aéreos (Atlas Air Q2059, Kalitta Air QA-14 e homologação SWISS).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onNavigateToTab?.('smart-audit')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              Auditoria Inteligente (Exceções)
            </button>
            <button
              onClick={() => onNavigateToTab?.('system-designer')}
              className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-purple-600" />
              System Designer
            </button>
            <button
              onClick={() => setSubTab('matriz')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-600" />
              Matriz de Cobertura
            </button>
            <button
              onClick={() => onNavigateToTab?.('apresentacao')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Apresentação Gerencial
            </button>
          </div>
        </div>

        {/* Card do Princípio Fundamental */}
        <div className="mt-5 p-4 rounded-lg bg-blue-50/70 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Princípio Fundamental de Arquitetura SGQ
              </div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5">
                "UM CONTROLE, VÁRIOS REQUISITOS"
              </div>
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                O QualiGest não multiplica checklists. Ele mapeia os mesmos controles centrais (Treinamentos, Calibração, Controle Documental e RNCs) para atender simultaneamente a múltiplos clientes sem retrabalho.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 md:border-l border-blue-200/70 pt-3 md:pt-0 md:pl-6">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">{metrics.totalClientes}</div>
              <div className="text-[11px] text-slate-500">Clientes Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{metrics.taxaConformidadeGeral}%</div>
              <div className="text-[11px] text-slate-500">Conformidade Global</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{metrics.taxaCoberturaControles}%</div>
              <div className="text-[11px] text-slate-500">Cobertura SGQ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('requisitos')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'requisitos'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Requisitos & Avaliações ({requisitos.length})
        </button>
        <button
          onClick={() => setSubTab('cockpit')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'cockpit'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Cockpit Executivo & Clientes
        </button>
        <button
          onClick={() => setSubTab('matriz')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'matriz'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          Matriz de Cobertura SGQ ({controles.length})
        </button>
        <button
          onClick={() => setSubTab('cronograma')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'cronograma'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Cronograma por Base ({bases.length})
        </button>
      </div>

      {/* VIEW 1: REQUISITOS & AVALIAÇÃO ASSISTIDA */}
      {subTab === 'requisitos' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código, título, texto ou controle central..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro Cliente */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Cliente:</span>
                <select
                  value={selectedClienteFilter}
                  onChange={(e) => setSelectedClienteFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="TODOS">Todos os Clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Base */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Base:</span>
                <select
                  value={selectedBaseFilter}
                  onChange={(e) => setSelectedBaseFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="TODOS">Todas as Bases</option>
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.codigo} - {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Criticidade */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Criticidade:</span>
                <select
                  value={selectedCriticidadeFilter}
                  onChange={(e) => setSelectedCriticidadeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="TODOS">Todas</option>
                  <option value="CRITICO">Crítico</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Banner SWISS Integrity Notice quando filtrado para SWISS ou se houver cliente sem requisitos cadastrados */}
          {(selectedClienteFilter === 'CLI-SWISS' || selectedClienteFilter === 'TODOS') && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <strong>Protocolo de Integridade SGQ (SWISS International Air Lines):</strong> Estrutura de acolhimento homologada e ativa. Conforme a diretriz de integridade do QualiGest SGQ, nenhum requisito fictício ou presumido foi inserido. Os requisitos oficiais serão cadastrados mediante disponibilização formal da documentação técnica pela companhia aérea.
              </div>
            </div>
          )}

          {/* Lista de Requisitos */}
          <div className="space-y-3">
            {filteredRequisitos.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium">Nenhum requisito encontrado para os filtros selecionados.</p>
                <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou o cliente selecionado.</p>
              </div>
            ) : (
              filteredRequisitos.map((req) => {
                // Avaliação recente
                const avaliacaoRecente = avaliacoes.find((a) => a.requisitoId === req.id);
                const controleAssoc = controles.find((c) => c.id === req.controleCentralId || c.codigo === req.controleCentralCodigo);
                const preAnalise = executarPreAvaliacaoRequisito(req, controleAssoc);

                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold shrink-0 ${
                            req.criticidade === 'CRITICO'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : req.criticidade === 'ALTO'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {req.numeroItem}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {req.tituloCurto}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                              {req.clienteNome} • {req.programaCodigo}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                              {req.categoria}
                            </span>
                            <span className="text-xs text-slate-400">
                              Periodicidade: <strong>{req.periodicidade}</strong>
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed italic">
                            "{req.textoOriginal}"
                          </p>
                        </div>
                      </div>

                      {/* Ações e Status */}
                      <div className="flex items-center gap-3 shrink-0 lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* Status da Avaliação Humana */}
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">Status Avaliado</div>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              avaliacaoRecente?.resultado === 'CONFORME'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : avaliacaoRecente?.resultado === 'ATENCAO'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : avaliacaoRecente?.resultado === 'NAO_CONFORME'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {avaliacaoRecente ? avaliacaoRecente.resultado : 'PENDENTE'}
                          </span>
                        </div>

                        {/* Botão de Avaliação (Human-in-the-Loop) */}
                        <button
                          onClick={() => handleOpenEvaluationModal(req)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          Avaliar
                        </button>
                      </div>
                    </div>

                    {/* SSoT: Vínculo com Controle Central SGQ e Sugestão IA */}
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Vínculo Central */}
                      <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                          Controle Central SGQ Associado
                        </div>
                        {controleAssoc ? (
                          <div className="mt-1">
                            <div className="text-xs font-semibold text-slate-800">
                              {controleAssoc.codigo} — {controleAssoc.nome}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Módulo Origem: <span className="font-mono text-slate-700">{controleAssoc.moduloOrigem}</span> • Resp: {controleAssoc.responsavelPadrao}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-amber-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Nenhum controle central associado (Lacuna de Cobertura)
                          </div>
                        )}
                      </div>

                      {/* Pré-Avaliação Assistida por IA (Human-in-the-Loop) */}
                      <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            Pré-Avaliação Assistida (Sugestão IA)
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                              preAnalise.status === 'VERDE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : preAnalise.status === 'AMARELO'
                                ? 'bg-amber-100 text-amber-800'
                                : preAnalise.status === 'VERMELHO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {preAnalise.status} ({preAnalise.confiancaScore}% Confiança)
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {preAnalise.justificativa}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: COCKPIT EXECUTIVO & CLIENTES */}
      {subTab === 'cockpit' && (
        <div className="space-y-6">
          {/* Grid de Clientes Atendidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clientes.map((c) => {
              const reqsCliente = requisitos.filter((r) => r.clienteId === c.id);
              const avalsCliente = avaliacoes.filter((a) => a.clienteId === c.id);
              const conformes = avalsCliente.filter((a) => a.resultado === 'CONFORME').length;
              const taxa = avalsCliente.length > 0 ? Math.round((conformes / avalsCliente.length) * 100) : 100;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-100 text-blue-800">
                        {c.sigla} • {c.codigo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.status === 'ATIVO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{c.nome}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.observacoes}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div>
                        Contato: <strong className="text-slate-800">{c.contatoPrincipal?.nome || 'N/A'}</strong>
                      </div>
                      <div>
                        Email: <span className="font-mono text-slate-700">{c.contatoPrincipal?.email || 'N/A'}</span>
                      </div>
                      <div>
                        Programas Ativos: <strong>{c.programasAtivosCount || 1}</strong>
                      </div>
                      <div>
                        Requisitos Mapeados: <strong>{reqsCliente.length}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400">Conformidade</div>
                      <div className="text-lg font-bold text-slate-900">{taxa}%</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClienteFilter(c.id);
                        setSubTab('requisitos');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Ver Itens <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bases e Conformidade por Base */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Desempenho por Estação e Base Operacional
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Status de auditoria e avaliações dos requisitos de clientes nas bases homologadas.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Código</th>
                    <th className="pb-3">Nome da Estação</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Localização</th>
                    <th className="pb-3">Clientes Atendidos</th>
                    <th className="pb-3 text-right">Avaliações</th>
                    <th className="pb-3 text-right">Taxa Conformidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bases.map((base) => {
                    const avalsBase = avaliacoes.filter((a) => a.baseId === base.id || a.baseCodigo === base.codigo);
                    const conformes = avalsBase.filter((a) => a.resultado === 'CONFORME').length;
                    const taxa = avalsBase.length > 0 ? Math.round((conformes / avalsBase.length) * 100) : 100;

                    return (
                      <tr key={base.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-900">{base.codigo}</td>
                        <td className="py-3 font-medium text-slate-800">{base.nome}</td>
                        <td className="py-3 text-slate-600">
                          {base.tipo === 'BASE_PRINCIPAL' ? 'Hangar Principal' : 'Estação de Linha'}
                        </td>
                        <td className="py-3 text-slate-600">
                          {base.cidade}/{base.estado}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {base.clientesAtendidosIds.map((cid) => {
                              const cl = clientes.find((c) => c.id === cid);
                              return (
                                <span
                                  key={cid}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700"
                                >
                                  {cl?.codigo || cid}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 text-right font-semibold text-slate-900">{avalsBase.length}</td>
                        <td className="py-3 text-right font-bold text-emerald-600">{taxa}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MATRIZ DE COBERTURA & LACUNAS */}
      {subTab === 'matriz' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Matriz de Cobertura SGQ ("Um Controle, Vários Requisitos")
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Demonstra como cada controle interno do QualiGest atende requisitos de múltiplos operadores.
                </p>
              </div>
              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                {matrizCobertura.length} Controles Centrais Mapeados
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Código Controle</th>
                    <th className="pb-3">Controle Central SGQ</th>
                    <th className="pb-3">Módulo de Origem</th>
                    <th className="pb-3">Clientes Atendidos</th>
                    <th className="pb-3">Itens Cobertos</th>
                    <th className="pb-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrizCobertura.map((mc) => (
                    <tr key={mc.controleCentralId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono font-bold text-blue-700">{mc.controleCodigo}</td>
                      <td className="py-3 font-semibold text-slate-900">{mc.controleNome}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
                          {mc.moduloOrigem}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {Array.from(new Set(mc.requisitosAtendidos.map((ra) => ra.clienteNome))).map((cNome) => (
                            <span
                              key={cNome}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                            >
                              {cNome}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {mc.requisitosAtendidos.map((ra) => (
                            <span
                              key={ra.requisitoId}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-800 border border-slate-200"
                            >
                              {ra.numeroItem}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setSearchTerm(mc.controleCodigo);
                            setSubTab('requisitos');
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          Ver Requisitos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análise de Lacunas (Gap Analysis) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Análise de Lacunas (Requisitos Sem Controle Central Vinculado)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Requisitos que ainda não possuem um controle central no QualiGest SGQ e dependem de evidência manual ou criação de controle operacional.
            </p>

            {lacunas.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Excelente: 100% dos requisitos mapeados possuem controles centrais SGQ ativos. Nenhuma lacuna operacional detectada.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {lacunas.map((lac) => (
                  <div
                    key={lac.requisitoId}
                    className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {lac.numeroItem} — {lac.titulo} ({lac.clienteNome})
                      </div>
                      <div className="text-slate-600 mt-0.5">{lac.recomendacaoAcao}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-200 text-amber-900 shrink-0">
                      {lac.criticidade}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: CRONOGRAMA & PRÓXIMAS AVALIAÇÕES */}
      {subTab === 'cronograma' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Cronograma de Avaliações Periódicas por Base Operacional
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rastreamento temporal da validade das avaliações dos checklists dos clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {avaliacoes.map((av) => (
              <div
                key={av.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-100 text-blue-800">
                      {av.baseCodigo} • {av.numeroItem}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        av.resultado === 'CONFORME'
                          ? 'bg-emerald-100 text-emerald-800'
                          : av.resultado === 'ATENCAO'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {av.resultado}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900">{av.tituloRequisito}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{av.clienteNome}</p>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-600">
                    <div>
                      Avaliado em: <strong>{av.dataAvaliacao}</strong>
                    </div>
                    <div>
                      Próxima Revisão: <strong className="text-blue-700">{av.proximaAvaliacao || 'Em 90 dias'}</strong>
                    </div>
                    <div>
                      Avaliador: <span>{av.avaliadorNome}</span>
                    </div>
                  </div>
                </div>

                {av.rncGeradaId && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    RNC Aberta: {av.numeroRNCGerada || 'F 001-29'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE AVALIAÇÃO (HUMAN-IN-THE-LOOP) */}
      {evaluatingRequisito && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {evaluatingRequisito.numeroItem} • {evaluatingRequisito.programaCodigo}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Avaliação de Requisito de Cliente
                </h3>
              </div>
              <button
                onClick={() => setEvaluatingRequisito(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Contexto do Requisito */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">{evaluatingRequisito.tituloCurto}</div>
                <div className="text-slate-600 mt-1 italic">"{evaluatingRequisito.textoOriginal}"</div>
                <div className="text-slate-500 mt-2 flex items-center gap-3">
                  <span>Cliente: <strong>{evaluatingRequisito.clienteNome}</strong></span>
                  <span>Criticidade: <strong>{evaluatingRequisito.criticidade}</strong></span>
                </div>
              </div>

              {/* Sugestão Inteligente IA (Diretriz: IA não aprova, apenas sugere) */}
              {(() => {
                const pre = executarPreAvaliacaoRequisito(
                  evaluatingRequisito,
                  controles.find((c) => c.id === evaluatingRequisito.controleCentralId)
                );
                return (
                  <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-indigo-950">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Determinação Preliminar Assistida (Sugestão IA)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-900 text-[10px]">
                        Confiança: {pre.confiancaScore}%
                      </span>
                    </div>
                    <p className="text-indigo-900 mt-1 leading-relaxed">{pre.justificativa}</p>
                    {pre.alertaRisco && (
                      <p className="text-rose-700 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {pre.alertaRisco}
                      </p>
                    )}
                    <div className="text-slate-500 text-[11px] mt-2 font-medium">
                      Diretriz SGQ: A IA apenas sugere hipóteses. A aprovação de conformidade é ato privativo do auditor humano.
                    </div>
                  </div>
                );
              })()}

              {/* Seleção de Base */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estação / Base da Avaliação:
                </label>
                <select
                  value={selectedBaseForEvaluation}
                  onChange={(e) => setSelectedBaseForEvaluation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                >
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.codigo} - {b.nome} ({b.cidade}/{b.estado})
                    </option>
                  ))}
                </select>
              </div>

              {/* Resultado Oficial Escolhido pelo Humano */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resultado Oficial da Inspeção (Decisão Humana):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CONFORME', 'ATENCAO', 'NAO_CONFORME', 'NA'] as ResultadoAvaliacaoRequisito[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setEvaluationResult(res)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        evaluationResult === res
                          ? res === 'CONFORME'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : res === 'ATENCAO'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : res === 'NAO_CONFORME'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Justificativa do Auditor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justificativa & Observações do Auditor:
                </label>
                <textarea
                  rows={3}
                  value={evaluationJustification}
                  onChange={(e) => setEvaluationJustification(e.target.value)}
                  placeholder="Descreva as constatações presenciais, verificação de selos, registros ou motivos de não atendimento..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Evidência Objetiva */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">Evidência Objetiva Registrada</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Título da Evidência (ex: Certificado RBC 2026)"
                    value={evaluationEvidenceTitle}
                    onChange={(e) => setEvaluationEvidenceTitle(e.target.value)}
                    className="p-2 text-xs rounded-md border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Nº Referência / Registro (ex: CAL-084-2026)"
                    value={evaluationEvidenceRef}
                    onChange={(e) => setEvaluationEvidenceRef(e.target.value)}
                    className="p-2 text-xs rounded-md border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Ação de Abrir RNC Oficial se Não Conforme */}
              {(evaluationResult === 'NAO_CONFORME' || evaluationResult === 'ATENCAO') && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-3">
                  <div className="text-xs text-rose-900">
                    <strong>Ação Corretiva Exigida:</strong> Deseja abrir formalmente uma Não Conformidade oficial (F 001-29) vinculada a este item?
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGerarRNC(evaluatingRequisito)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    + Abrir RNC F 001-29
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEvaluatingRequisito(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingEvaluation}
                onClick={handleSaveEvaluation}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {savingEvaluation ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Salvar Avaliação Oficial
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
