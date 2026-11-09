import React, { useState, useMemo } from 'react';
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
  ExternalLink,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  FileCheck2,
  Sparkles,
  Link2,
  Check,
  Calendar,
  AlertCircle,
  Download,
  Upload,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import {
  RequisitoClienteItem,
  ControleCentralSGQ,
  RespostaInstitucionalAprovada,
  EvidenciaRequisitoItem,
  StatusConformidadeSGQ,
  SituacaoAplicabilidadeImpacto,
  StatusRespostaInstitucional,
  UserProfile,
  ClienteExterno,
  TipoOrigemRequisito
} from '../../types';
import {
  saveInstitutionalResponse,
  deleteInstitutionalResponse,
  saveComplianceEvidence,
  deleteComplianceEvidence,
  updateRequisitoConformidadeEAplicabilidade,
  preCarregarRespostasEEvidenciasParaAuditoria,
  ResultadoPreCarregamentoAuditoria
} from '../../services/corporateComplianceMatrixService';

interface RequirementsCorporateComplianceMatrixTabProps {
  organizationId: string;
  requisitos: RequisitoClienteItem[];
  controles: ControleCentralSGQ[];
  clientes: ClienteExterno[];
  respostasInstitucionais: RespostaInstitucionalAprovada[];
  evidencias: EvidenciaRequisitoItem[];
  currentUser?: UserProfile | null;
  onSelectRequisito?: (reqId: string) => void;
}

const STATUS_CONFORMIDADE_CONFIG: Record<
  StatusConformidadeSGQ,
  { label: string; badgeClass: string; icon: any; desc: string }
> = {
  CONFORME: {
    label: 'Conforme',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2,
    desc: 'Atendido integralmente com evidência objetiva válida e ativa.'
  },
  PARCIALMENTE_CONFORME: {
    label: 'Parcialmente Conforme',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertTriangle,
    desc: 'Atendido parcialmente; pendente de complemento procedimental ou evidência adicional.'
  },
  NAO_CONFORME: {
    label: 'Não Conforme',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: XCircle,
    desc: 'Não conformidade constatada perante o requisito aplicável.'
  },
  AGUARDANDO_EVIDENCIA: {
    label: 'Aguardando Evidência',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: Clock,
    desc: 'Processo descrito, porém ausência de certificado, registro ou documento formal comprobatório.'
  },
  REAVALIACAO_NECESSARIA: {
    label: 'Reavaliação Necessária',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
    icon: AlertCircle,
    desc: 'Revisão normativa identificada na fonte ou evidência vencida requer nova avaliação.'
  },
  NAO_AVALIADO: {
    label: 'Não Avaliado',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: HelpCircleIcon,
    desc: 'Requisito cadastrado no acervo aguardando avaliação pela Garantia da Qualidade.'
  }
};

function HelpCircleIcon(props: any) {
  return <Clock {...props} />;
}

const STATUS_APLICABILIDADE_CONFIG: Record<
  SituacaoAplicabilidadeImpacto,
  { label: string; badgeClass: string; icon: any }
> = {
  APLICAVEL: {
    label: 'Aplicável',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300',
    icon: Check
  },
  PARCIALMENTE_APLICAVEL: {
    label: 'Parcialmente Aplicável',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300',
    icon: AlertTriangle
  },
  NAO_APLICAVEL: {
    label: 'Não Aplicável',
    badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
    icon: X
  },
  AGUARDANDO_AVALIACAO: {
    label: 'Pendente de Avaliação',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300',
    icon: Clock
  }
};

export const RequirementsCorporateComplianceMatrixTab: React.FC<
  RequirementsCorporateComplianceMatrixTabProps
> = ({
  organizationId,
  requisitos,
  controles,
  clientes,
  respostasInstitucionais,
  evidencias,
  currentUser,
  onSelectRequisito
}) => {
  // Modos de Visualização Principal: Requisitos | Controles | Respostas | Evidências
  const [activeView, setActiveView] = useState<
    'requisitos' | 'controles' | 'respostas' | 'evidencias'
  >('requisitos');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFonte, setSelectedFonte] = useState<string>('TODAS');
  const [selectedConformidade, setSelectedConformidade] = useState<string>('TODAS');
  const [selectedAplicabilidade, setSelectedAplicabilidade] = useState<string>('TODAS');
  const [selectedProcesso, setSelectedProcesso] = useState<string>('TODOS');
  const [selectedCliente, setSelectedCliente] = useState<string>('TODOS');
  const [onlyPendenteEvidencia, setOnlyPendenteEvidencia] = useState(false);

  // Modais de Edição e Ação
  const [selectedReqForEvaluation, setSelectedReqForEvaluation] = useState<RequisitoClienteItem | null>(null);
  const [evalForm, setEvalForm] = useState({
    aplicabilidade: 'APLICAVEL' as SituacaoAplicabilidadeImpacto,
    justificativaAplicabilidade: '',
    conformidade: 'CONFORME' as StatusConformidadeSGQ,
    constatacaoConformidade: '',
    controleCentralId: '',
    respostaInstitucionalId: '',
    respostaInstitucionalTexto: '',
    evidenciasVinculadasIds: [] as string[]
  });

  // Modal de Resposta Institucional
  const [isModalRespostaOpen, setIsModalRespostaOpen] = useState(false);
  const [editingResposta, setEditingResposta] = useState<Partial<RespostaInstitucionalAprovada> | null>(null);

  // Modal de Evidência
  const [isModalEvidenciaOpen, setIsModalEvidenciaOpen] = useState(false);
  const [editingEvidencia, setEditingEvidencia] = useState<Partial<EvidenciaRequisitoItem> | null>(null);

  // Modal de Integração com Auditoria
  const [isModalAuditoriaOpen, setIsModalAuditoriaOpen] = useState(false);
  const [resultadoPreCarga, setResultadoPreCarga] = useState<ResultadoPreCarregamentoAuditoria | null>(null);
  const [selectedChecklistTeste, setSelectedChecklistTeste] = useState<string>('QA-14');

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================================================
  // INDICADORES DE CONFORMIDADE CALCULADOS A PARTIR DE DADOS REAIS
  // ==========================================================================
  const metricas = useMemo(() => {
    const total = requisitos.length;
    let aplicaveis = 0;
    let naoAvaliadosAplicabilidade = 0;
    let conformes = 0;
    let parcialmenteConformes = 0;
    let naoConformes = 0;
    let aguardandoEvidencia = 0;
    let reavaliacaoNecessaria = 0;
    let naoAvaliadosConformidade = 0;

    requisitos.forEach((r) => {
      const sit = r.aplicabilidadeContexto?.situacao || 'APLICAVEL';
      if (sit === 'APLICAVEL') aplicaveis++;
      if (sit === 'AGUARDANDO_AVALIACAO') naoAvaliadosAplicabilidade++;

      const conf = r.statusConformidade || 'NAO_AVALIADO';
      if (conf === 'CONFORME') conformes++;
      else if (conf === 'PARCIALMENTE_CONFORME') parcialmenteConformes++;
      else if (conf === 'NAO_CONFORME') naoConformes++;
      else if (conf === 'AGUARDANDO_EVIDENCIA') aguardandoEvidencia++;
      else if (conf === 'REAVALIACAO_NECESSARIA') reavaliacaoNecessaria++;
      else naoAvaliadosConformidade++;
    });

    // Evidências vencidas ou próximas
    const hoje = new Date().toISOString().split('T')[0];
    let evidenciasVencidas = 0;
    let evidenciasVencendo30Dias = 0;

    evidencias.forEach((ev) => {
      if (ev.dataValidade) {
        if (ev.dataValidade < hoje) {
          evidenciasVencidas++;
        } else {
          const dVal = new Date(ev.dataValidade).getTime();
          const dHoje = new Date(hoje).getTime();
          const diffDias = Math.ceil((dVal - dHoje) / (1000 * 60 * 60 * 24));
          if (diffDias <= 30) {
            evidenciasVencendo30Dias++;
          }
        }
      }
    });

    // Taxa de conformidade líquida real (Conformes / Total de Aplicáveis)
    const taxaConformidadeReal = aplicaveis > 0 ? Math.round((conformes / aplicaveis) * 100) : 0;

    return {
      total,
      aplicaveis,
      naoAvaliadosAplicabilidade,
      conformes,
      parcialmenteConformes,
      naoConformes,
      aguardandoEvidencia,
      reavaliacaoNecessaria,
      naoAvaliadosConformidade,
      evidenciasVencidas,
      evidenciasVencendo30Dias,
      taxaConformidadeReal,
      totalControles: controles.length,
      totalRespostas: respostasInstitucionais.length,
      totalEvidencias: evidencias.length
    };
  }, [requisitos, controles, respostasInstitucionais, evidencias]);

  // Lista de Processos SGQ únicos
  const processosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    controles.forEach((c) => {
      if (c.processoRelacionado) set.add(c.processoRelacionado);
    });
    requisitos.forEach((r) => {
      if (r.processoResponsavel) set.add(r.processoResponsavel);
    });
    return Array.from(set).sort();
  }, [controles, requisitos]);

  // Filtro de Requisitos
  const requisitosFiltrados = useMemo(() => {
    return requisitos.filter((req) => {
      if (selectedFonte !== 'TODAS') {
        if (selectedFonte === 'PADRAO_SETORIAL_IOSA') {
          if (req.fonteOrigem !== 'PADRAO_SETORIAL_IOSA' && !req.isIosaSetorial) return false;
        } else if (req.fonteOrigem !== selectedFonte) {
          return false;
        }
      }

      if (selectedConformidade !== 'TODAS') {
        const conf = req.statusConformidade || 'NAO_AVALIADO';
        if (conf !== selectedConformidade) return false;
      }

      if (selectedAplicabilidade !== 'TODAS') {
        const sit = req.aplicabilidadeContexto?.situacao || 'APLICAVEL';
        if (sit !== selectedAplicabilidade) return false;
      }

      if (selectedProcesso !== 'TODOS') {
        const proc = req.processoResponsavel || '';
        if (!proc.toLowerCase().includes(selectedProcesso.toLowerCase())) return false;
      }

      if (selectedCliente !== 'TODOS') {
        if (req.clienteId !== selectedCliente && req.clienteNome !== selectedCliente) {
          return false;
        }
      }

      if (onlyPendenteEvidencia) {
        const semEvidencia =
          !req.evidenciasVinculadasIds || req.evidenciasVinculadasIds.length === 0;
        const conf = req.statusConformidade || 'NAO_AVALIADO';
        if (!semEvidencia && conf !== 'AGUARDANDO_EVIDENCIA') return false;
      }

      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const match =
          req.numeroItem.toLowerCase().includes(t) ||
          (req.tituloCurto || '').toLowerCase().includes(t) ||
          (req.textoOriginal || '').toLowerCase().includes(t) ||
          (req.codigoReferenciaOriginal || '').toLowerCase().includes(t) ||
          (req.controleCentralCodigo || '').toLowerCase().includes(t) ||
          (req.clienteNome || '').toLowerCase().includes(t);
        if (!match) return false;
      }

      return true;
    });
  }, [
    requisitos,
    selectedFonte,
    selectedConformidade,
    selectedAplicabilidade,
    selectedProcesso,
    selectedCliente,
    onlyPendenteEvidencia,
    searchTerm
  ]);

  // Abrir Modal de Avaliação do Requisito
  const handleOpenEvaluationModal = (req: RequisitoClienteItem) => {
    setSelectedReqForEvaluation(req);

    // Localiza resposta existente ou padrão
    const respId = req.respostaInstitucionalId || '';
    const resp = respostasInstitucionais.find(
      (r) =>
        r.id === respId ||
        (req.controleCentralId && r.controleCentralId === req.controleCentralId)
    );

    setEvalForm({
      aplicabilidade: req.aplicabilidadeContexto?.situacao || 'APLICAVEL',
      justificativaAplicabilidade: req.aplicabilidadeContexto?.justificativaFormal || (req.aplicabilidadeContexto as any)?.justificativa || '',
      conformidade: req.statusConformidade || 'CONFORME',
      constatacaoConformidade: req.constatacaoConformidade || '',
      controleCentralId: req.controleCentralId || 'CTRL-DOCS-01',
      respostaInstitucionalId: resp?.id || '',
      respostaInstitucionalTexto: req.respostaInstitucionalTexto || resp?.textoResposta || '',
      evidenciasVinculadasIds: req.evidenciasVinculadasIds || []
    });
  };

  // Salvar Avaliação do Requisito
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqForEvaluation) return;

    setIsSaving(true);
    setFeedbackMsg(null);

    const ctrl = controles.find((c) => c.id === evalForm.controleCentralId);

    try {
      await updateRequisitoConformidadeEAplicabilidade(
        organizationId,
        selectedReqForEvaluation.id,
        {
          aplicabilidade: evalForm.aplicabilidade,
          justificativaAplicabilidade: evalForm.justificativaAplicabilidade,
          conformidade: evalForm.conformidade,
          constatacaoConformidade: evalForm.constatacaoConformidade,
          controleCentralId: evalForm.controleCentralId,
          controleCentralCodigo: ctrl?.codigo,
          controleCentralNome: ctrl?.nome,
          respostaInstitucionalId: evalForm.respostaInstitucionalId,
          respostaInstitucionalTexto: evalForm.respostaInstitucionalTexto,
          evidenciasVinculadasIds: evalForm.evidenciasVinculadasIds
        },
        currentUser
      );

      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Requisito ${selectedReqForEvaluation.numeroItem} atualizado: Aplicabilidade [${evalForm.aplicabilidade}] e Conformidade [${evalForm.conformidade}].`
      });
      setSelectedReqForEvaluation(null);
    } catch (err: any) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: err.message || 'Erro ao salvar avaliação do requisito.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Resposta Institucional
  const handleSaveResposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResposta || !editingResposta.titulo || !editingResposta.textoResposta) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Título e Texto da Resposta Institucional são obrigatórios.' });
      return;
    }

    try {
      await saveInstitutionalResponse(organizationId, editingResposta, currentUser);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Resposta Institucional "${editingResposta.titulo}" salva com sucesso.`
      });
      setIsModalRespostaOpen(false);
      setEditingResposta(null);
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao salvar resposta.' });
    }
  };

  // Salvar Evidência
  const handleSaveEvidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvidencia || !editingEvidencia.titulo) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Título da Evidência é obrigatório.' });
      return;
    }

    try {
      await saveComplianceEvidence(organizationId, editingEvidencia, currentUser);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Evidência "${editingEvidencia.titulo}" registrada no acervo auditável.`
      });
      setIsModalEvidenciaOpen(false);
      setEditingEvidencia(null);
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao salvar evidência.' });
    }
  };

  // Executar Demonstração de Pré-Carregamento para Auditoria
  const handleExecutarPreCarregamentoAuditoria = () => {
    const itensSimulados =
      selectedChecklistTeste === 'QA-14'
        ? requisitos.filter((r) => r.programaCodigo === 'QA-14').map((r) => ({
            id: r.id,
            numeroItem: r.numeroItem,
            pergunta: r.perguntaAuditoria || r.tituloCurto,
            controleId: r.controleCentralId
          }))
        : requisitos.filter((r) => r.programaCodigo === 'Q2059').map((r) => ({
            id: r.id,
            numeroItem: r.numeroItem,
            pergunta: r.perguntaAuditoria || r.tituloCurto,
            controleId: r.controleCentralId
          }));

    const res = preCarregarRespostasEEvidenciasParaAuditoria(
      itensSimulados,
      requisitos,
      respostasInstitucionais,
      evidencias
    );

    setResultadoPreCarga(res);
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal de Trabalho Contínuo da Qualidade */}
      <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Matriz Corporativa de Conformidade SGQ
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fase 1.4
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-4xl">
                Ferramenta contínua da Garantia da Qualidade para acompanhamento preventivo de requisitos da ANAC, EASA,
                FAA, IOSA e Clientes. <span className="font-semibold text-amber-300">Regra SGQ:</span> status independente
                de aplicabilidade e conformidade, respostas institucionais pré-validadas e evidências rastreáveis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsModalAuditoriaOpen(true);
                handleExecutarPreCarregamentoAuditoria();
              }}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Integração: Simula a recuperação de respostas e evidências aprovadas para uma auditoria externa"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pré-Carga em Auditoria</span>
            </button>

            <button
              onClick={() => {
                setEditingResposta({
                  titulo: '',
                  textoResposta: '',
                  versao: '1.0',
                  status: 'RASCUNHO',
                  requisitosRelacionadosIds: [],
                  documentosEvidenciasIds: [],
                  referenciasProcedimentos: []
                });
                setIsModalRespostaOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Resposta</span>
            </button>

            <button
              onClick={() => {
                setEditingEvidencia({
                  tipo: 'DOCUMENTO',
                  titulo: '',
                  dataEvidencia: new Date().toISOString().split('T')[0],
                  baseOperacional: 'SOD',
                  processoSetor: 'Garantia da Qualidade'
                });
                setIsModalEvidenciaOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nova Evidência</span>
            </button>
          </div>
        </div>

        {/* Dashboard de Indicadores Reais de Conformidade */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">Total de Requisitos</span>
            <span className="text-sm font-bold text-white">{metricas.total}</span>
            <span className="text-[9px] text-slate-500 block">Acervo Multi-Fontes</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-emerald-400 block font-medium">Conformes Comprovados</span>
            <span className="text-sm font-bold text-emerald-400">{metricas.conformes}</span>
            <span className="text-[9px] text-emerald-500 block">Com evidência ativa</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-amber-400 block font-medium">Parcialmente Conformes</span>
            <span className="text-sm font-bold text-amber-400">{metricas.parcialmenteConformes}</span>
            <span className="text-[9px] text-amber-500 block">Em adequação</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-indigo-400 block font-medium">Aguardando Evidência</span>
            <span className="text-sm font-bold text-indigo-400">{metricas.aguardandoEvidencia}</span>
            <span className="text-[9px] text-indigo-500 block">Falta comprovação</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-rose-400 block font-medium">Não Conformes</span>
            <span className="text-sm font-bold text-rose-400">{metricas.naoConformes}</span>
            <span className="text-[9px] text-rose-500 block">Exigem RNC imediata</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-yellow-400 block font-medium">Evidências Vencendo</span>
            <span className="text-sm font-bold text-yellow-400">
              {metricas.evidenciasVencendo30Dias + metricas.evidenciasVencidas}
            </span>
            <span className="text-[9px] text-yellow-500 block">
              {metricas.evidenciasVencidas} vencida(s)
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-sky-400 block font-medium">Respostas Aprovadas</span>
            <span className="text-sm font-bold text-sky-400">{metricas.totalRespostas}</span>
            <span className="text-[9px] text-sky-500 block">Prontas para auditoria</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-blue-400 block font-medium">Taxa Conformidade Real</span>
            <span className="text-sm font-bold text-blue-300">{metricas.taxaConformidadeReal}%</span>
            <span className="text-[9px] text-blue-500 block">Conforme / Aplicável</span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navegação de Trabalho da Matriz */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('requisitos')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'requisitos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Matriz de Requisitos ({requisitosFiltrados.length})</span>
          </button>

          <button
            onClick={() => setActiveView('controles')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'controles'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Controles Corporativos ({controles.length})</span>
          </button>

          <button
            onClick={() => setActiveView('respostas')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'respostas'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Respostas Institucionais ({respostasInstitucionais.length})</span>
          </button>

          <button
            onClick={() => setActiveView('evidencias')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'evidencias'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Evidências Objetivas ({evidencias.length})</span>
            {metricas.evidenciasVencidas > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                {metricas.evidenciasVencidas} vencida(s)
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyPendenteEvidencia}
              onChange={(e) => setOnlyPendenteEvidencia(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Apenas com Evidência Pendente</span>
          </label>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: MATRIZ DE REQUISITOS (TRABALHO CONTÍNUO DA QUALIDADE) */}
      {/* ===================================================================== */}
      {activeView === 'requisitos' && (
        <div className="space-y-4">
          {/* Barra de Filtros Multi-Dimensionais */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, texto do requisito, autoridade ou controle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-0 focus:outline-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedFonte}
                onChange={(e) => setSelectedFonte(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODAS">Todas as Fontes</option>
                <option value="REGULATORIO_ANAC">ANAC (Brasil)</option>
                <option value="REGULATORIO_EASA">EASA (Europa)</option>
                <option value="BOA_PRATICA_REFERENCIA">FAA / Referência</option>
                <option value="PADRAO_SETORIAL_IOSA">IATA / IOSA</option>
                <option value="CONTRATUAL_CLIENTE">Clientes / Operadores</option>
                <option value="INTERNO_IMPACTO">Interno IMPACTO</option>
              </select>

              <select
                value={selectedConformidade}
                onChange={(e) => setSelectedConformidade(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODAS">Conformidade (Todas)</option>
                <option value="CONFORME">Conforme</option>
                <option value="PARCIALMENTE_CONFORME">Parcialmente Conforme</option>
                <option value="NAO_CONFORME">Não Conforme</option>
                <option value="AGUARDANDO_EVIDENCIA">Aguardando Evidência</option>
                <option value="REAVALIACAO_NECESSARIA">Reavaliação Necessária</option>
                <option value="NAO_AVALIADO">Não Avaliado</option>
              </select>

              <select
                value={selectedAplicabilidade}
                onChange={(e) => setSelectedAplicabilidade(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODAS">Aplicabilidade (Todas)</option>
                <option value="APLICAVEL">Aplicável</option>
                <option value="PARCIALMENTE_APLICAVEL">Parcialmente Aplicável</option>
                <option value="NAO_APLICAVEL">Não Aplicável</option>
                <option value="AGUARDANDO_AVALIACAO">Pendente</option>
              </select>

              <select
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODOS">Todos os Clientes</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.codigo} — {cli.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela Central de Trabalho da Qualidade */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Código & Autoridade</th>
                  <th className="py-3 px-3.5">Requisito Original</th>
                  <th className="py-3 px-3.5">Aplicabilidade SGQ</th>
                  <th className="py-3 px-3.5">Conformidade SGQ</th>
                  <th className="py-3 px-3.5">Controle Central & Resposta</th>
                  <th className="py-3 px-3.5">Evidências de Suporte</th>
                  <th className="py-3 px-3.5 text-right">Avaliar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {requisitosFiltrados.slice(0, 100).map((req) => {
                  const sit = req.aplicabilidadeContexto?.situacao || 'APLICAVEL';
                  const cfgApli = STATUS_APLICABILIDADE_CONFIG[sit] || STATUS_APLICABILIDADE_CONFIG.APLICAVEL;
                  const conf = req.statusConformidade || 'CONFORME';
                  const cfgConf = STATUS_CONFORMIDADE_CONFIG[conf] || STATUS_CONFORMIDADE_CONFIG.CONFORME;
                  const ConfIcon = cfgConf.icon;

                  const evidsVinculadas = evidencias.filter(
                    (ev) =>
                      req.evidenciasVinculadasIds?.includes(ev.id) ||
                      (req.controleCentralId && ev.controleId === req.controleCentralId)
                  );

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Código e Origem */}
                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                          {req.numeroItem}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {req.entidadeEmissora || req.clienteNome || 'ANAC'}
                        </span>
                        {req.codigoReferenciaOriginal && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-mono truncate max-w-[140px]">
                            {req.codigoReferenciaOriginal}
                          </span>
                        )}
                      </td>

                      {/* Texto do Requisito */}
                      <td className="py-3 px-3.5 align-top max-w-[280px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1" title={req.tituloCurto}>
                          {req.tituloCurto}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic font-serif mt-0.5">
                          "{req.textoOriginal}"
                        </p>
                        {req.procedimentoInternoRef && (
                          <span className="text-[10px] text-slate-500 block mt-1">
                            Ref: {req.procedimentoInternoRef}
                          </span>
                        )}
                      </td>

                      {/* Aplicabilidade */}
                      <td className="py-3 px-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfgApli.badgeClass}`}
                        >
                          <cfgApli.icon className="w-2.5 h-2.5" />
                          <span>{cfgApli.label}</span>
                        </span>
                        {req.aplicabilidadeContexto?.justificativa && (
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px] mt-1" title={req.aplicabilidadeContexto.justificativa}>
                            {req.aplicabilidadeContexto.justificativa}
                          </p>
                        )}
                      </td>

                      {/* Conformidade */}
                      <td className="py-3 px-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfgConf.badgeClass}`}
                          title={cfgConf.desc}
                        >
                          <ConfIcon className="w-2.5 h-2.5" />
                          <span>{cfgConf.label}</span>
                        </span>
                        {req.dataUltimaAvaliacaoConformidade && (
                          <span className="text-[10px] text-slate-400 block font-mono mt-1">
                            Avaliado: {req.dataUltimaAvaliacaoConformidade}
                          </span>
                        )}
                      </td>

                      {/* Controle Central & Resposta */}
                      <td className="py-3 px-3.5 align-top max-w-[220px]">
                        {req.controleCentralCodigo ? (
                          <div className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            {req.controleCentralCodigo}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                            Sem controle vinculado
                          </span>
                        )}
                        {req.respostaInstitucionalTexto ? (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5" title={req.respostaInstitucionalTexto}>
                            {req.respostaInstitucionalTexto}
                          </p>
                        ) : (
                          <span className="text-[10px] text-slate-400 block">Resposta padrão do SGQ</span>
                        )}
                      </td>

                      {/* Evidências */}
                      <td className="py-3 px-3.5 align-top">
                        {evidsVinculadas.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{evidsVinculadas.length} evidência(s) ativa(s)</span>
                            </span>
                            <span className="text-[9px] text-slate-500 block truncate max-w-[140px]" title={evidsVinculadas[0].titulo}>
                              {evidsVinculadas[0].titulo}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Pendente evidência</span>
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-3.5 align-top text-right">
                        <button
                          onClick={() => handleOpenEvaluationModal(req)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Avaliar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {requisitosFiltrados.length > 100 && (
            <p className="text-center text-xs text-slate-500">
              Exibindo os primeiros 100 registros de {requisitosFiltrados.length}. Utilize os filtros acima para refinar a busca.
            </p>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: CONTROLES CORPORATIVOS PERMANENTES (UM CONTROLE, N REQUISITOS) */}
      {/* ===================================================================== */}
      {activeView === 'controles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {controles.map((ctrl) => {
            const reqsVinculados = requisitos.filter(
              (r) => r.controleCentralId === ctrl.id || r.controleCentralCodigo === ctrl.codigo
            );
            const respVinculada = respostasInstitucionais.find(
              (r) => r.controleCentralId === ctrl.id || r.controleCentralCodigo === ctrl.codigo
            );
            const evidsCtrl = evidencias.filter((e) => e.controleId === ctrl.id || e.controleCodigo === ctrl.codigo);

            return (
              <div
                key={ctrl.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {ctrl.codigo}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {ctrl.nome}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {ctrl.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {ctrl.descricao}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Processo Relacionado:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {ctrl.processoRelacionado || 'Garantia da Qualidade'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Responsável SGQ:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {ctrl.responsavelPadrao}
                      </span>
                    </div>
                  </div>

                  {/* Resposta Institucional Padronizada */}
                  {respVinculada && (
                    <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                      <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1 text-[11px]">
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span>Resposta Institucional Aprovada ({respVinculada.versao}):</span>
                      </span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                        "{respVinculada.textoResposta}"
                      </p>
                    </div>
                  )}

                  {/* Requisitos Multi-Fontes Atendidos por este Controle */}
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] block">
                      Requisitos Vinculados ({reqsVinculados.length} itens de autoridades e clientes):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {reqsVinculados.slice(0, 8).map((r) => (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          title={`${r.numeroItem} - ${r.tituloCurto}`}
                        >
                          {r.numeroItem}
                        </span>
                      ))}
                      {reqsVinculados.length > 8 && (
                        <span className="text-[10px] text-slate-500 font-mono self-center">
                          +{reqsVinculados.length - 8} outros
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé do Controle: Evidências */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>{evidsCtrl.length} evidência(s) vinculada(s)</span>
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Periodicidade: {ctrl.periodicidadeAcompanhamento || 'MENSAL'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: ACERVO DE RESPOSTAS INSTITUCIONAIS APROVADAS */}
      {/* ===================================================================== */}
      {activeView === 'respostas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {respostasInstitucionais.map((resp) => (
              <div
                key={resp.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Versão {resp.versao}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {resp.titulo}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        resp.status === 'APROVADA'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : resp.status === 'EM_VALIDACAO'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {resp.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-serif italic leading-relaxed">
                    "{resp.textoResposta}"
                  </div>

                  {resp.controleCentralCodigo && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Controle Associado:</span>{' '}
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {resp.controleCentralCodigo}
                      </span>
                    </div>
                  )}

                  {resp.referenciasProcedimentos && resp.referenciasProcedimentos.length > 0 && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Procedimentos Citados:</span>{' '}
                      {resp.referenciasProcedimentos.join(', ')}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Aprovado por: {resp.aprovadoPorNome || resp.elaboradoPorNome}</span>
                  <button
                    onClick={() => {
                      setEditingResposta({ ...resp });
                      setIsModalRespostaOpen(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar Resposta</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 4: ACERVO DE EVIDÊNCIAS OBJETIVAS */}
      {/* ===================================================================== */}
      {activeView === 'evidencias' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Título & Referência</th>
                  <th className="py-3 px-3.5">Tipo</th>
                  <th className="py-3 px-3.5">Setor & Base</th>
                  <th className="py-3 px-3.5">Emissão & Validade</th>
                  <th className="py-3 px-3.5">Status Validade</th>
                  <th className="py-3 px-3.5">Controle Vinculado</th>
                  <th className="py-3 px-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {evidencias.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3.5 align-top max-w-[240px]">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate" title={ev.titulo}>
                        {ev.titulo}
                      </div>
                      {ev.numeroReferencia && (
                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5">
                          {ev.numeroReferencia}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ev.tipo}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span className="text-slate-800 dark:text-slate-200 block font-medium">
                        {ev.processoSetor || 'Qualidade'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Base: {ev.baseOperacional || 'SOD'}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap font-mono text-[11px]">
                      <div>Emissão: {ev.dataEmissao || ev.dataEvidencia}</div>
                      <div className="text-slate-500">Validade: {ev.dataValidade || 'Permanente'}</div>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ev.statusValidade === 'VALIDO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : ev.statusValidade === 'PROXIMO_VENCIMENTO'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {ev.statusValidade === 'VALIDO'
                          ? 'Vigente'
                          : ev.statusValidade === 'PROXIMO_VENCIMENTO'
                          ? 'Vence em 30d'
                          : 'Vencida'}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-top whitespace-nowrap font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      {ev.controleCodigo || 'Geral'}
                    </td>

                    <td className="py-3 px-3.5 align-top text-right">
                      <button
                        onClick={() => {
                          setEditingEvidencia({ ...ev });
                          setIsModalEvidenciaOpen(true);
                        }}
                        className="text-slate-600 dark:text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: AVALIAÇÃO DE CONFORMIDADE E APLICABILIDADE (SEPARADOS) */}
      {/* ===================================================================== */}
      {selectedReqForEvaluation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {selectedReqForEvaluation.numeroItem} • {selectedReqForEvaluation.entidadeEmissora}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedReqForEvaluation.tituloCurto}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReqForEvaluation(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic font-serif leading-relaxed">
              "{selectedReqForEvaluation.textoOriginal}"
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              {/* BLOCO 1: APLICABILIDADE INDEPENDENTE */}
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
                <span className="font-bold text-blue-900 dark:text-blue-200 block text-[11px]">
                  1. Avaliação de Aplicabilidade à IMPACTO (Obrigação Legal / Contratual):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={evalForm.aplicabilidade}
                      onChange={(e) =>
                        setEvalForm({
                          ...evalForm,
                          aplicabilidade: e.target.value as SituacaoAplicabilidadeImpacto
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    >
                      <option value="APLICAVEL">Aplicável</option>
                      <option value="PARCIALMENTE_APLICAVEL">Parcialmente Aplicável</option>
                      <option value="NAO_APLICAVEL">Não Aplicável</option>
                      <option value="AGUARDANDO_AVALIACAO">Pendente de Avaliação</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Justificativa técnica da aplicabilidade..."
                      value={evalForm.justificativaAplicabilidade}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, justificativaAplicabilidade: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: CONFORMIDADE INDEPENDENTE */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px]">
                  2. Avaliação de Conformidade Operacional (Comprovação Prática por Evidência):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={evalForm.conformidade}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, conformidade: e.target.value as StatusConformidadeSGQ })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                    >
                      <option value="CONFORME">Conforme (Evidência Válida Comprovada)</option>
                      <option value="PARCIALMENTE_CONFORME">Parcialmente Conforme</option>
                      <option value="NAO_CONFORME">Não Conforme (RNC Necessária)</option>
                      <option value="AGUARDANDO_EVIDENCIA">Aguardando Evidência Objetiva</option>
                      <option value="REAVALIACAO_NECESSARIA">Reavaliação Necessária</option>
                      <option value="NAO_AVALIADO">Não Avaliado</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Constatação técnica do auditor/avaliador..."
                      value={evalForm.constatacaoConformidade}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, constatacaoConformidade: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: VÍNCULO COM CONTROLE CORPORATIVO E RESPOSTA INSTITUCIONAL */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Controle Central SGQ Associado
                    </label>
                    <select
                      value={evalForm.controleCentralId}
                      onChange={(e) =>
                        setEvalForm({ ...evalForm, controleCentralId: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {controles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} — {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Resposta Institucional Padrão
                    </label>
                    <select
                      value={evalForm.respostaInstitucionalId}
                      onChange={(e) => {
                        const rId = e.target.value;
                        const found = respostasInstitucionais.find((r) => r.id === rId);
                        setEvalForm({
                          ...evalForm,
                          respostaInstitucionalId: rId,
                          respostaInstitucionalTexto: found?.textoResposta || ''
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Selecione uma resposta cadastrada...</option>
                      {respostasInstitucionais.map((resp) => (
                        <option key={resp.id} value={resp.id}>
                          {resp.titulo} (v{resp.versao})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Texto da Resposta Institucional (Customizável para este requisito)
                  </label>
                  <textarea
                    rows={3}
                    value={evalForm.respostaInstitucionalTexto}
                    onChange={(e) =>
                      setEvalForm({ ...evalForm, respostaInstitucionalTexto: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-serif"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReqForEvaluation(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Avaliação no SGQ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CADASTRO / EDIÇÃO DE RESPOSTA INSTITUCIONAL APROVADA */}
      {/* ===================================================================== */}
      {isModalRespostaOpen && editingResposta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>
                    {editingResposta.id ? 'Editar Resposta Institucional' : 'Nova Resposta Institucional Aprovada'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Padronize respostas técnicas reutilizáveis para auditorias de clientes e autoridades.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalRespostaOpen(false);
                  setEditingResposta(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResposta} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título da Resposta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resposta Padrão sobre Calibração de Ferramental"
                  value={editingResposta.titulo || ''}
                  onChange={(e) => setEditingResposta({ ...editingResposta, titulo: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Texto Técnico Aprovado *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Descreva o procedimento formal adotado pela IMPACTO, com referências normativas e salvaguardas..."
                  value={editingResposta.textoResposta || ''}
                  onChange={(e) =>
                    setEditingResposta({ ...editingResposta, textoResposta: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-serif leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Controle Central Associado
                  </label>
                  <select
                    value={editingResposta.controleCentralId || ''}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const c = controles.find((x) => x.id === cId);
                      setEditingResposta({
                        ...editingResposta,
                        controleCentralId: cId,
                        controleCentralCodigo: c?.codigo
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Selecione um controle...</option>
                    {controles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} — {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Situação da Resposta
                  </label>
                  <select
                    value={editingResposta.status || 'APROVADA'}
                    onChange={(e) =>
                      setEditingResposta({
                        ...editingResposta,
                        status: e.target.value as StatusRespostaInstitucional
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value="APROVADA">Aprovada (Pronta para Auditorias)</option>
                    <option value="EM_VALIDACAO">Em Validação</option>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="DESATUALIZADA">Desatualizada</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalRespostaOpen(false);
                    setEditingResposta(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Resposta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: CADASTRO DE NOVA EVIDÊNCIA DE CONFORMIDADE */}
      {/* ===================================================================== */}
      {isModalEvidenciaOpen && editingEvidencia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600" />
                  <span>
                    {editingEvidencia.id ? 'Editar Evidência Objetiva' : 'Cadastrar Nova Evidência Objetiva'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Vincule certificados RBC, registros de treinamento, tags de peças ou relatórios operacionais.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalEvidenciaOpen(false);
                  setEditingEvidencia(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvidencia} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título da Evidência *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Certificado de Calibração RBC — Torquímetro PAT-042"
                  value={editingEvidencia.titulo || ''}
                  onChange={(e) => setEditingEvidencia({ ...editingEvidencia, titulo: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Evidência
                  </label>
                  <select
                    value={editingEvidencia.tipo || 'DOCUMENTO'}
                    onChange={(e) => setEditingEvidencia({ ...editingEvidencia, tipo: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="CERTIFICADO_CALIBRACAO">Certificado de Calibração</option>
                    <option value="REGISTRO_TREINAMENTO">Registro de Treinamento</option>
                    <option value="DOCUMENTO">Documento / Procedimento</option>
                    <option value="AUDITORIA">Relatório de Auditoria</option>
                    <option value="RNC">RNC Fechada com Eficácia</option>
                    <option value="FOTO">Foto de Campo / Pátio</option>
                    <option value="LINK">Link de Sistema Externo</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Número de Referência / Protocolo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CERT-RBC-2026-8841, ATA-HF-02"
                    value={editingEvidencia.numeroReferencia || ''}
                    onChange={(e) =>
                      setEditingEvidencia({ ...editingEvidencia, numeroReferencia: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    value={editingEvidencia.dataEmissao || editingEvidencia.dataEvidencia || ''}
                    onChange={(e) =>
                      setEditingEvidencia({
                        ...editingEvidencia,
                        dataEmissao: e.target.value,
                        dataEvidencia: e.target.value
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data de Validade
                  </label>
                  <input
                    type="date"
                    value={editingEvidencia.dataValidade || ''}
                    onChange={(e) =>
                      setEditingEvidencia({ ...editingEvidencia, dataValidade: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Base Operacional
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SOD, GRU, VCP"
                    value={editingEvidencia.baseOperacional || 'SOD'}
                    onChange={(e) =>
                      setEditingEvidencia({ ...editingEvidencia, baseOperacional: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Localização do Arquivo / Pasta Física ou Link
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pasta MET-2026 / F 001-06, https://..."
                  value={editingEvidencia.urlOuArquivo || ''}
                  onChange={(e) =>
                    setEditingEvidencia({ ...editingEvidencia, urlOuArquivo: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalEvidenciaOpen(false);
                    setEditingEvidencia(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Evidência</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: INTEGRAÇÃO COM AUDITORIA EXTERNA (PRÉ-CARGA INTELIGENTE) */}
      {/* ===================================================================== */}
      {isModalAuditoriaOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>Integração: Pré-Carga de Respostas e Evidências em Auditoria</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conforme Seção 9 do QualyQuest: recupera respostas institucionais aprovadas e evidências da Matriz Corporativa.
                </p>
              </div>
              <button
                onClick={() => setIsModalAuditoriaOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Selecione o Checklist de Auditoria para Simulação:
                </span>
                <select
                  value={selectedChecklistTeste}
                  onChange={(e) => setSelectedChecklistTeste(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="QA-14">Kalitta Air — Checklist Form QA-14 (69 Itens)</option>
                  <option value="Q2059">Atlas Air — Checklist Q2059 (12 Itens)</option>
                </select>
                <button
                  type="button"
                  onClick={handleExecutarPreCarregamentoAuditoria}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  Executar Pré-Carga
                </button>
              </div>

              {resultadoPreCarga && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Itens Analisados</span>
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {resultadoPreCarga.totalItensAnalisados}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300">
                      <span className="text-[10px] text-emerald-700 block">Itens Completos</span>
                      <span className="text-base font-bold text-emerald-600">
                        {resultadoPreCarga.itensCompletos}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-300">
                      <span className="text-[10px] text-blue-700 block">Respostas Vinculadas</span>
                      <span className="text-base font-bold text-blue-600">
                        {resultadoPreCarga.totalRespostasRecuperadas}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300">
                      <span className="text-[10px] text-amber-700 block">Aguardando Evidência</span>
                      <span className="text-base font-bold text-amber-600">
                        {resultadoPreCarga.itensPendentes}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                      Amostra dos Resultados Pré-Carregados:
                    </span>
                    {resultadoPreCarga.detalhesItens.slice(0, 15).map((det, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {det.numeroItem}
                          </span>{' '}
                          — <span className="text-slate-700 dark:text-slate-300">{det.pergunta}</span>
                          {det.respostaRecuperada && (
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 italic truncate max-w-md">
                              Resposta: "{det.respostaRecuperada}"
                            </p>
                          )}
                          {det.evidenciasEncontradas.length > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                              Evidências: {det.evidenciasEncontradas.join(', ')}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            det.statusSugerido === 'CONFORME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {det.statusSugerido}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalAuditoriaOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
