import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  BookOpen,
  Layers,
  Sparkles,
  Eye,
  FileCheck2,
  FileCode,
  Building2,
  FileQuestion,
  ChevronRight,
  UploadCloud,
  Check,
  X,
  History,
  Plus,
  Save,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import {
  FonteNormativaPersistente,
  AnaliseImpactoQualidadeRecord,
  TipoAcessoFonte,
  StatusAcessoConteudo,
  StatusMonitoramentoFonte,
  PeriodicidadeMonitoramento,
  RequisitoClienteItem,
  UserProfile,
  ClienteExterno
} from '../../types';
import {
  subscribeToMonitoredSources,
  subscribeToQualityImpactReviews,
  saveMonitoredSource,
  deleteMonitoredSource,
  verifySingleSource,
  verifyAllPublicSources,
  homologateAndIncorporateQualityReview,
  determinarStatusMonitoramento
} from '../../services/sourceMonitoringService';
import {
  ResultadoComparacaoRevisaoFonte,
  getAmostrasRequisitosPesquisados,
  AmostraRequisitoPesquisado
} from '../../services/externalRequirementsMatrixService';

interface RequirementsExternalSourcesMatrixTabProps {
  organizationId?: string;
  currentUser?: UserProfile | null;
  requisitosCadastrados: RequisitoClienteItem[];
  clientes?: ClienteExterno[];
  onOpenRequirementDetail?: (reqId: string) => void;
}

const TIPO_ACESSO_CONFIG: Record<
  TipoAcessoFonte,
  { label: string; badgeClass: string; icon: string; desc: string }
> = {
  PUBLICA_AUTOMATICA: {
    label: 'Pública (API / XML Oficial)',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: '⚡',
    desc: 'Fonte pública com consulta estruturada em formato aberto (ex: EASA eRules XML, eCFR FAA).'
  },
  PUBLICA_MANUAL: {
    label: 'Pública (Portal Oficial)',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '🌐',
    desc: 'Portal oficial da autoridade com verificação direta de portarias/emendas (ex: ANAC Legislação).'
  },
  PRIVADA_LICENCIADA: {
    label: 'Privada (Exige Licença / Autoral)',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: '🔒',
    desc: 'Padrão proprietário com proteção de copyright (ex: IATA IOSA ISM). Acesso restrito a metadados.'
  },
  CLIENTE_ENVIO_PENDENTE: {
    label: 'Cliente (Depende de Envio Formal)',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '📥',
    desc: 'Checklist específico do operador aéreo contratual. Depende de envio e protocolo formal do cliente.'
  },
  INTERNO_CONTROLADO: {
    label: 'Interno IMPACTO (SGQ Controlado)',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    icon: '🏢',
    desc: 'Documentação interna controlada pelo SGQ da IMPACTO (MOMQ, PTM, Formulários F 001).'
  }
};

const STATUS_MONITORAMENTO_CONFIG: Record<
  StatusMonitoramentoFonte,
  { label: string; badgeClass: string; icon: any }
> = {
  EM_DIA: {
    label: 'Em Dia',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
    icon: CheckCircle2
  },
  PROXIMO_DO_VENCIMENTO: {
    label: 'Próximo do Vencimento',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300',
    icon: Clock
  },
  PENDENTE_VERIFICACAO: {
    label: 'Verificação Pendente',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300',
    icon: AlertTriangle
  },
  DIVERGENCIA_IDENTIFICADA: {
    label: 'Divergência Detectada',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 font-bold',
    icon: ShieldAlert
  },
  FALHA_CONSULTA: {
    label: 'Falha de Conexão',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300',
    icon: AlertCircle
  },
  AGUARDANDO_DOCUMENTO_EXTERNO: {
    label: 'Aguardando Documento',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
    icon: Lock
  }
};

export const RequirementsExternalSourcesMatrixTab: React.FC<RequirementsExternalSourcesMatrixTabProps> = ({
  organizationId = 'org_impacto_aviation',
  currentUser,
  requisitosCadastrados,
  clientes = [],
  onOpenRequirementDetail
}) => {
  // Estado das fontes e revisões carregadas do Firestore
  const [fontes, setFontes] = useState<FonteNormativaPersistente[]>([]);
  const [reviews, setReviews] = useState<AnaliseImpactoQualidadeRecord[]>([]);

  // Filtros da tabela
  const [selectedFamilia, setSelectedFamilia] = useState<string>('TODAS');
  const [selectedTipoAcesso, setSelectedTipoAcesso] = useState<string>('TODOS');
  const [selectedStatusMonitoramento, setSelectedStatusMonitoramento] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modos de visualização
  const [viewMode, setViewMode] = useState<'matriz_fontes' | 'fila_aprovacao' | 'requisitos_extraidos'>('matriz_fontes');
  const [filtroOrigemRequisitos, setFiltroOrigemRequisitos] = useState<string>('TODOS');

  // Estados de verificação e progresso
  const [selectedFonteParaVerificacao, setSelectedFonteParaVerificacao] = useState<FonteNormativaPersistente | null>(null);
  const [resultadoDiffModal, setResultadoDiffModal] = useState<ResultadoComparacaoRevisaoFonte | null>(null);
  const [isVerifyingSingle, setIsVerifyingSingle] = useState<boolean>(false);

  // Verificação em lote com progresso
  const [isBatchVerifying, setIsBatchVerifying] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number; current: string } | null>(null);

  // Modais de cadastro e upload
  const [isNewSourceModalOpen, setIsNewSourceModalOpen] = useState<boolean>(false);
  const [newSourceForm, setNewSourceForm] = useState<Partial<FonteNormativaPersistente>>({
    autoridadeOuEntidade: '',
    codigoDocumento: '',
    tituloDocumento: '',
    familia: 'CLIENTE',
    tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
    statusAcesso: 'AGUARDANDO_DOCUMENTO',
    periodicidadeMonitoramento: 'TRIMESTRAL',
    revisaoVigenteIdentificada: 'Em análise inicial',
    urlOficialConsulta: '',
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: ''
  });

  const [selectedFonteParaUpload, setSelectedFonteParaUpload] = useState<FonteNormativaPersistente | null>(null);
  const [uploadEdicaoForm, setUploadEdicaoForm] = useState({
    novaRevisaoOuEdicao: '',
    dataRecebimento: new Date().toISOString().split('T')[0],
    dataVigencia: '',
    observacoesEntrega: '',
    responsavelRecebimento: currentUser?.displayName || 'Garantia da Qualidade SGQ'
  });

  // Modal de Homologação da Qualidade
  const [reviewParaHomologar, setReviewParaHomologar] = useState<AnaliseImpactoQualidadeRecord | null>(null);
  const [decisaoHomologacao, setDecisaoHomologacao] = useState<'APLICAVEL' | 'NAO_APLICAVEL' | 'PARCIALMENTE_APLICAVEL'>('APLICAVEL');
  const [justificativaHomologacao, setJustificativaHomologacao] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Subscrições do Firestore em tempo real
  useEffect(() => {
    const unsubSources = subscribeToMonitoredSources(organizationId, (data) => {
      setFontes(data);
    });

    const unsubReviews = subscribeToQualityImpactReviews(organizationId, (data) => {
      setReviews(data);
    });

    return () => {
      unsubSources();
      unsubReviews();
    };
  }, [organizationId]);

  // Amostras de requisitos pesquisados
  const requisitosPesquisados = useMemo(() => getAmostrasRequisitosPesquisados(), []);

  // 10 Indicadores Obrigatórios da Seção 11 do QualyQuest Fase 1.3
  const indicadores = useMemo(() => {
    const totalFontes = fontes.length;
    const publicasAtivas = fontes.filter(
      (f) => f.tipoAcesso === 'PUBLICA_AUTOMATICA' || f.tipoAcesso === 'PUBLICA_MANUAL'
    ).length;
    const restritasAguardando = fontes.filter(
      (f) =>
        f.statusAcesso === 'AGUARDANDO_DOCUMENTO' ||
        f.statusAcesso === 'AGUARDANDO_ACESSO_AUTORIZADO' ||
        f.tipoAcesso === 'PRIVADA_LICENCIADA'
    ).length;
    const monitoramentoAutomatico = fontes.filter(
      (f) => f.modalidadeAtualizacao === 'AUTOMATICA_API_XML'
    ).length;
    const monitoramentoManual = fontes.filter(
      (f) => f.modalidadeAtualizacao !== 'AUTOMATICA_API_XML'
    ).length;

    const emDia = fontes.filter(
      (f) => determinarStatusMonitoramento(f) === 'EM_DIA'
    ).length;
    const pendentes = fontes.filter((f) => {
      const st = determinarStatusMonitoramento(f);
      return st === 'PENDENTE_VERIFICACAO' || st === 'PROXIMO_DO_VENCIMENTO';
    }).length;
    const divergencias = fontes.filter((f) => f.ultimaDivergenciaDetectada).length;
    const itensAguardandoQualidade = reviews.filter((r) => r.status === 'PENDENTE').length;

    // Data da última verificação geral
    let ultimaVerificacaoGeral = 'Pendente';
    const datas = fontes.map((f) => f.dataUltimaConsulta).filter(Boolean);
    if (datas.length > 0) {
      datas.sort().reverse();
      ultimaVerificacaoGeral = datas[0];
    }

    return {
      totalFontes,
      publicasAtivas,
      restritasAguardando,
      monitoramentoAutomatico,
      monitoramentoManual,
      emDia,
      pendentes,
      divergencias,
      itensAguardandoQualidade,
      ultimaVerificacaoGeral
    };
  }, [fontes, reviews]);

  // Filtro de fontes da tabela
  const fontesFiltradas = useMemo(() => {
    return fontes.filter((fonte) => {
      if (selectedFamilia !== 'TODAS' && fonte.familia !== selectedFamilia) return false;
      if (selectedTipoAcesso !== 'TODOS' && fonte.tipoAcesso !== selectedTipoAcesso) return false;
      if (selectedStatusMonitoramento !== 'TODOS') {
        const st = determinarStatusMonitoramento(fonte);
        if (st !== selectedStatusMonitoramento) return false;
      }
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase();
        const bateu =
          fonte.codigoDocumento.toLowerCase().includes(termo) ||
          fonte.tituloDocumento.toLowerCase().includes(termo) ||
          fonte.autoridadeOuEntidade.toLowerCase().includes(termo) ||
          fonte.revisaoVigenteIdentificada.toLowerCase().includes(termo);
        if (!bateu) return false;
      }
      return true;
    });
  }, [fontes, selectedFamilia, selectedTipoAcesso, selectedStatusMonitoramento, searchTerm]);

  // Ação: Verificar Fonte Individual
  const handleVerificarFonteIndividual = async (fonte: FonteNormativaPersistente) => {
    setSelectedFonteParaVerificacao(fonte);
    setIsVerifyingSingle(true);
    setFeedbackMsg(null);

    try {
      const outcome = await verifySingleSource(fonte, currentUser);
      setResultadoDiffModal(outcome.diff);

      if (outcome.diff.temDivergenciaRevisao) {
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: `Divergência detectada para ${fonte.codigoDocumento}: nova revisão registrada na Fila da Qualidade.`
        });
      } else {
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: `${fonte.codigoDocumento} verificado: acervo em conformidade com a fonte oficial.`
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: `Erro ao verificar fonte: ${err.message || 'Falha de conexão'}`
      });
    } finally {
      setIsVerifyingSingle(false);
    }
  };

  // Ação: Verificar Todas as Fontes Públicas (Lote)
  const handleVerificarTodasPublicas = async () => {
    setIsBatchVerifying(true);
    setBatchProgress({ completed: 0, total: fontes.length, current: 'Iniciando verificação...' });
    setFeedbackMsg(null);

    try {
      const { updatedSources, generatedReviews } = await verifyAllPublicSources(
        organizationId,
        fontes,
        currentUser,
        (completed, total, current) => {
          setBatchProgress({ completed, total, current });
        }
      );

      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Verificação em lote concluída: ${updatedSources.length} fontes consultadas via APIs oficiais. ${generatedReviews.length} nova(s) divergência(s) detectada(s).`
      });
    } catch (err: any) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: `Falha na verificação em lote: ${err.message}`
      });
    } finally {
      setIsBatchVerifying(false);
      setTimeout(() => setBatchProgress(null), 3000);
    }
  };

  // Ação: Cadastrar Nova Fonte / Organização
  const handleSalvarNovaFonte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceForm.codigoDocumento || !newSourceForm.autoridadeOuEntidade) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Código do Documento e Autoridade são obrigatórios.' });
      return;
    }

    try {
      await saveMonitoredSource(organizationId, newSourceForm, currentUser);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Fonte "${newSourceForm.codigoDocumento}" cadastrada com sucesso na biblioteca corporativa.`
      });
      setIsNewSourceModalOpen(false);
      setNewSourceForm({
        autoridadeOuEntidade: '',
        codigoDocumento: '',
        tituloDocumento: '',
        familia: 'CLIENTE',
        tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
        statusAcesso: 'AGUARDANDO_DOCUMENTO',
        periodicidadeMonitoramento: 'TRIMESTRAL',
        revisaoVigenteIdentificada: 'Em análise inicial',
        urlOficialConsulta: '',
        aplicabilidadePadraoImpacto: 'APLICAVEL',
        justificativaAplicabilidade: ''
      });
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao salvar fonte.' });
    }
  };

  // Ação: Registrar Upload de Nova Edição (Fontes Restritas / Privadas)
  const handleRegistrarUploadEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFonteParaUpload || !uploadEdicaoForm.novaRevisaoOuEdicao) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const updatedSource: Partial<FonteNormativaPersistente> = {
        ...selectedFonteParaUpload,
        revisaoVigenteIdentificada: uploadEdicaoForm.novaRevisaoOuEdicao,
        statusAcesso: 'CONTEUDO_EXTRAIDO',
        dataUltimaConsulta: uploadEdicaoForm.dataRecebimento,
        dataVigencia: uploadEdicaoForm.dataVigencia || selectedFonteParaUpload.dataVigencia,
        observacoesIntegridade: `${selectedFonteParaUpload.observacoesIntegridade || ''} [Upload formal registrado em ${uploadEdicaoForm.dataRecebimento} por ${uploadEdicaoForm.responsavelRecebimento}: ${uploadEdicaoForm.observacoesEntrega}]`,
        resultadoUltimaConsulta: {
          data: now,
          sucesso: true,
          mensagem: `Nova edição "${uploadEdicaoForm.novaRevisaoOuEdicao}" protocolada e cadastrada no acervo formal.`
        }
      };

      await saveMonitoredSource(organizationId, updatedSource, currentUser);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Nova edição de "${selectedFonteParaUpload.codigoDocumento}" protocolada com sucesso. Metadados atualizados.`
      });
      setSelectedFonteParaUpload(null);
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao registrar edição.' });
    }
  };

  // Ação: Homologar e Incorporar da Qualidade
  const handleExecutarHomologacao = async () => {
    if (!reviewParaHomologar) return;
    if (!justificativaHomologacao.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'A justificativa técnica da Gerência da Qualidade é obrigatória.' });
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const res = await homologateAndIncorporateQualityReview(
        organizationId,
        reviewParaHomologar,
        decisaoHomologacao,
        justificativaHomologacao,
        currentUser
      );

      setFeedbackMsg({
        tipo: 'sucesso',
        texto: res.message
      });
      setReviewParaHomologar(null);
      setJustificativaHomologacao('');
    } catch (err: any) {
      setFeedbackMsg({ tipo: 'erro', texto: err.message || 'Erro ao homologar revisão.' });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Governança e Rastreabilidade */}
      <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Monitoramento Corporativo Periódico de Fontes & Revisões
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Fase 1.3
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-4xl">
                Varredura periódica de fontes públicas oficiais (ANAC, EASA, eCFR FAA), controle de licenças e checklists
                de clientes. Detecção de revisões, análise de impacto SGQ e homologação humana da Garantia da Qualidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerificarTodasPublicas}
              disabled={isBatchVerifying}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              title="Executa varredura real via APIs públicas oficiais no eCFR FAA, EASA e ANAC"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBatchVerifying ? 'animate-spin' : ''}`} />
              <span>{isBatchVerifying ? 'Consultando...' : 'Verificar Fontes Públicas'}</span>
            </button>

            <button
              onClick={() => setIsNewSourceModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Fonte</span>
            </button>
          </div>
        </div>

        {/* 10 Indicadores Obrigatórios da Fase 1.3 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 mt-4 pt-3 border-t border-slate-800 text-center">
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">1. Total Fontes</span>
            <span className="text-sm font-bold text-white">{indicadores.totalFontes}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">2. Públicas Ativas</span>
            <span className="text-sm font-bold text-blue-400">{indicadores.publicasAtivas}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">3. Restritas/Docs</span>
            <span className="text-sm font-bold text-purple-400">{indicadores.restritasAguardando}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">4. Auto (API/XML)</span>
            <span className="text-sm font-bold text-emerald-400">{indicadores.monitoramentoAutomatico}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">5. Manual/Upload</span>
            <span className="text-sm font-bold text-amber-400">{indicadores.monitoramentoManual}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">6. No Prazo</span>
            <span className="text-sm font-bold text-emerald-300">{indicadores.emDia}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-amber-400 block font-medium">7. Pendentes</span>
            <span className="text-sm font-bold text-amber-300">{indicadores.pendentes}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-rose-400 block font-medium">8. Divergências</span>
            <span className="text-sm font-bold text-rose-400">{indicadores.divergencias}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-yellow-400 block font-medium">9. Fila SGQ</span>
            <span className="text-sm font-bold text-yellow-300">{indicadores.itensAguardandoQualidade}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[9px] text-slate-400 block font-medium">10. Última Checagem</span>
            <span className="text-[11px] font-mono font-bold text-slate-200 block truncate">
              {indicadores.ultimaVerificacaoGeral}
            </span>
          </div>
        </div>

        {/* Barra de Progresso da Verificação em Lote */}
        {batchProgress && (
          <div className="mt-3 p-3 bg-blue-950/70 rounded-lg border border-blue-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-blue-300 font-semibold">{batchProgress.current}</span>
              <span className="text-blue-200 font-mono">
                {batchProgress.completed} de {batchProgress.total} ({Math.round((batchProgress.completed / Math.max(1, batchProgress.total)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(batchProgress.completed / Math.max(1, batchProgress.total)) * 100}%`
                }}
              />
            </div>
          </div>
        )}
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

      {/* Sub-Navegação interna da aba */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setViewMode('matriz_fontes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            viewMode === 'matriz_fontes'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriz de Fontes Monitoradas ({fontes.length})</span>
        </button>

        <button
          onClick={() => setViewMode('fila_aprovacao')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer relative ${
            viewMode === 'fila_aprovacao'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Fila de Homologação SGQ</span>
          {reviews.filter((r) => r.status === 'PENDENTE').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {reviews.filter((r) => r.status === 'PENDENTE').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setViewMode('requisitos_extraidos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            viewMode === 'requisitos_extraidos'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Requisitos Rastreáveis ({requisitosPesquisados.length})</span>
        </button>
      </div>

      {/* VIEW: MATRIZ DE FONTES MONITORADAS */}
      {viewMode === 'matriz_fontes' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código (ex: RBAC 145, Part-145, QA-14), título ou órgão..."
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

            <div className="flex items-center gap-2">
              <select
                value={selectedFamilia}
                onChange={(e) => setSelectedFamilia(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODAS">Todas as Famílias</option>
                <option value="ANAC">ANAC (Brasil)</option>
                <option value="EASA">EASA (Europa)</option>
                <option value="FAA">FAA (EUA)</option>
                <option value="IOSA">IATA / IOSA</option>
                <option value="CLIENTE">Clientes Operadores</option>
                <option value="INTERNO_IMPACTO">Internos IMPACTO</option>
              </select>

              <select
                value={selectedTipoAcesso}
                onChange={(e) => setSelectedTipoAcesso(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODOS">Todos os Tipos de Acesso</option>
                <option value="PUBLICA_AUTOMATICA">Pública (API / XML)</option>
                <option value="PUBLICA_MANUAL">Pública (Portal Oficial)</option>
                <option value="PRIVADA_LICENCIADA">Privada Licenciada</option>
                <option value="CLIENTE_ENVIO_PENDENTE">Cliente (Envio Pendente)</option>
                <option value="INTERNO_CONTROLADO">Interno Controlado</option>
              </select>

              <select
                value={selectedStatusMonitoramento}
                onChange={(e) => setSelectedStatusMonitoramento(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="TODOS">Status do Monitoramento</option>
                <option value="EM_DIA">Em Dia</option>
                <option value="PROXIMO_DO_VENCIMENTO">Próximo do Vencimento</option>
                <option value="PENDENTE_VERIFICACAO">Pendente Verificação</option>
                <option value="DIVERGENCIA_IDENTIFICADA">Divergência Detectada</option>
                <option value="AGUARDANDO_DOCUMENTO_EXTERNO">Aguardando Documento</option>
              </select>
            </div>
          </div>

          {/* Tabela de Fontes Monitoradas */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5">Fonte / Órgão</th>
                  <th className="py-3 px-3.5">Documento</th>
                  <th className="py-3 px-3.5">Acesso & Periodicidade</th>
                  <th className="py-3 px-3.5">Status de Monitoramento</th>
                  <th className="py-3 px-3.5">Revisão Vigente</th>
                  <th className="py-3 px-3.5">Datas (Última / Próxima)</th>
                  <th className="py-3 px-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {fontesFiltradas.map((fonte) => {
                  const cfgAcesso = TIPO_ACESSO_CONFIG[fonte.tipoAcesso] || TIPO_ACESSO_CONFIG.PUBLICA_MANUAL;
                  const stMon = determinarStatusMonitoramento(fonte);
                  const cfgStatus = STATUS_MONITORAMENTO_CONFIG[stMon] || STATUS_MONITORAMENTO_CONFIG.EM_DIA;
                  const StatusIcon = cfgStatus.icon;

                  return (
                    <tr
                      key={fonte.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        stMon === 'DIVERGENCIA_IDENTIFICADA'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : ''
                      }`}
                    >
                      {/* Autoridade */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {fonte.autoridadeOuEntidade}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {fonte.familia}
                        </span>
                      </td>

                      {/* Documento */}
                      <td className="py-3 px-3.5 align-top max-w-[220px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {fonte.codigoDocumento}
                        </div>
                        <div
                          className="text-[11px] text-slate-600 dark:text-slate-400 truncate"
                          title={fonte.tituloDocumento}
                        >
                          {fonte.tituloDocumento}
                        </div>
                        {fonte.limitaAcesso && (
                          <div className="text-[10px] text-purple-700 dark:text-purple-300 mt-1 flex items-center gap-1 font-medium bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            <Lock className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{fonte.limitaAcesso}</span>
                          </div>
                        )}
                      </td>

                      {/* Tipo de Acesso e Periodicidade */}
                      <td className="py-3 px-3.5 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfgAcesso.badgeClass}`}
                            title={cfgAcesso.desc}
                          >
                            <span>{cfgAcesso.icon}</span>
                            <span>{cfgAcesso.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            Frequência: {fonte.periodicidadeMonitoramento}
                          </span>
                        </div>
                      </td>

                      {/* Status de Monitoramento */}
                      <td className="py-3 px-3.5 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfgStatus.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{cfgStatus.label}</span>
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {fonte.totalItensExtraidos} requisitos ativos
                        </div>
                      </td>

                      {/* Revisão Identificada */}
                      <td className="py-3 px-3.5 align-top max-w-[180px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-200 text-[11px]">
                          {fonte.revisaoVigenteIdentificada}
                        </div>
                        {fonte.dataVigencia && (
                          <span className="text-[10px] text-slate-500 block">
                            Vigência: {fonte.dataVigencia}
                          </span>
                        )}
                      </td>

                      {/* Datas (Última / Próxima) */}
                      <td className="py-3 px-3.5 align-top whitespace-nowrap">
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                          Última: {fonte.dataUltimaConsulta || 'Não realizada'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Próxima: {fonte.dataProximaConsulta || 'N/D'}
                        </div>
                        {fonte.urlOficialConsulta && fonte.urlOficialConsulta.startsWith('http') && (
                          <a
                            href={fonte.urlOficialConsulta}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                          >
                            <span>Link Oficial</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 align-top text-right space-y-1">
                        <button
                          onClick={() => handleVerificarFonteIndividual(fonte)}
                          disabled={isVerifyingSingle && selectedFonteParaVerificacao?.id === fonte.id}
                          className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 border border-blue-200 dark:border-blue-800"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${
                              isVerifyingSingle && selectedFonteParaVerificacao?.id === fonte.id
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                          <span>Verificar</span>
                        </button>

                        {(fonte.tipoAcesso === 'PRIVADA_LICENCIADA' ||
                          fonte.tipoAcesso === 'CLIENTE_ENVIO_PENDENTE') && (
                          <button
                            onClick={() => {
                              setSelectedFonteParaUpload(fonte);
                              setUploadEdicaoForm({
                                novaRevisaoOuEdicao: '',
                                dataRecebimento: new Date().toISOString().split('T')[0],
                                dataVigencia: '',
                                observacoesEntrega: '',
                                responsavelRecebimento: currentUser?.displayName || 'Garantia da Qualidade SGQ'
                              });
                            }}
                            className="px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-semibold transition-colors cursor-pointer block w-full text-right border border-purple-200 dark:border-purple-800"
                          >
                            + Nova Edição
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: FILA DE HOMOLOGAÇÃO DA GARANTIA DA QUALIDADE */}
      {viewMode === 'fila_aprovacao' && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Fila de Homologação SGQ (Regra de Intervenção Humana):</span>
                <p className="text-[11px] mt-0.5">
                  Toda divergência identificada em fontes oficiais requer análise de impacto nos pilares da organização
                  (MOMQ, PTM, Formulários, Ferramental) e aprovação formal pela Gerência da Qualidade antes da incorporação.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-1 rounded bg-amber-200/60 dark:bg-amber-900/60">
              {reviews.filter((r) => r.status === 'PENDENTE').length} pendência(s)
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Nenhuma divergência normativa pendente de homologação.
              </div>
              <p>Todas as fontes monitoradas coincidem integralmente com as revisões vigentes aprovadas no SGQ.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {rev.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                        Divergência detectada em {rev.codigoDocumento}: {rev.revisaoAnterior} → {rev.revisaoNova}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rev.status === 'PENDENTE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : rev.status === 'INCORPORADO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rev.status === 'PENDENTE'
                          ? 'Aguardando Homologação SGQ'
                          : rev.status === 'INCORPORADO'
                          ? 'Homologado e Incorporado'
                          : 'Rejeitado'}
                      </span>
                      {rev.status === 'PENDENTE' && (
                        <button
                          onClick={() => {
                            setReviewParaHomologar(rev);
                            setDecisaoHomologacao('APLICAVEL');
                            setJustificativaHomologacao(
                              `Aprovação da revisão ${rev.revisaoNova} de ${rev.codigoDocumento} com impacto controlado no MOMQ e PTM.`
                            );
                          }}
                          className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Avaliar & Homologar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pilares Afetados */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    <div
                      className={`p-2 rounded-lg border ${
                        rev.impactoMOMQ?.afetado
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200'
                      }`}
                    >
                      <span className="font-semibold block text-[10px]">Impacto MOMQ</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {rev.impactoMOMQ?.afetado ? 'Sim (Capítulos)' : 'Não'}
                      </span>
                      {rev.impactoMOMQ?.capitulosAfetados && (
                        <span className="text-[9px] text-slate-500 block truncate">
                          {rev.impactoMOMQ.capitulosAfetados}
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        rev.impactoPTM?.afetado
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200'
                      }`}
                    >
                      <span className="font-semibold block text-[10px]">Impacto PTM (Treinamento)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {rev.impactoPTM?.afetado ? 'Sim (Cursos)' : 'Não'}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        rev.impactoFormularios?.afetado
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200'
                      }`}
                    >
                      <span className="font-semibold block text-[10px]">Formulários F 001</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {rev.impactoFormularios?.afetado ? 'Sim (Revisar)' : 'Não'}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        rev.impactoFerramental?.afetado
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200'
                      }`}
                    >
                      <span className="font-semibold block text-[10px]">Ferramental</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {rev.impactoFerramental?.afetado ? 'Sim' : 'Sem impacto'}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-lg border ${
                        rev.impactoProcessosManutencao?.afetado
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200'
                      }`}
                    >
                      <span className="font-semibold block text-[10px]">Processos de Linha</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {rev.impactoProcessosManutencao?.afetado ? 'Sim' : 'Sem impacto'}
                      </span>
                    </div>
                  </div>

                  {/* Resumo de Diffs */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                      Requisitos Afetados: {rev.itensNovosCount} novo(s), {rev.itensAlteradosCount} alterado(s), {rev.itensRevogadosCount} revogado(s)
                    </span>
                    <div className="space-y-1">
                      {rev.detalhesDiff?.map((d, dIdx) => (
                        <div
                          key={dIdx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {d.codigoItem} — {d.titulo}
                            </span>
                            <span className="text-[10px] ml-2 px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {d.tipoMudanca}
                            </span>
                            {d.textoNovo && (
                              <p className="text-slate-600 dark:text-slate-400 italic text-[10px] mt-0.5">
                                "{d.textoNovo}"
                              </p>
                            )}
                          </div>
                          {d.impactoSugerido && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                              {d.impactoSugerido}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {rev.status === 'INCORPORADO' && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-[11px] text-emerald-900 dark:text-emerald-200">
                      <span className="font-bold">Homologado em {rev.incorporadoEm?.split('T')[0]}</span> por{' '}
                      <span className="font-semibold">{rev.incorporadoPorNome}</span>. Justificativa:{' '}
                      <em>{rev.justificativaDecisao}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: REQUISITOS EXTRAÍDOS E RASTREABILIDADE */}
      {viewMode === 'requisitos_extraidos' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Filtrar por Família Normativa:</span>
              <div className="flex flex-wrap gap-1">
                {['TODOS', 'REGULATORIO_ANAC', 'REGULATORIO_EASA', 'PADRAO_SETORIAL_IOSA', 'CONTRATUAL_CLIENTE', 'BOA_PRATICA_REFERENCIA'].map((origem) => (
                  <button
                    key={origem}
                    onClick={() => setFiltroOrigemRequisitos(origem)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      filtroOrigemRequisitos === origem
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {origem === 'TODOS'
                      ? 'Todos'
                      : origem === 'REGULATORIO_ANAC'
                      ? 'ANAC'
                      : origem === 'REGULATORIO_EASA'
                      ? 'EASA'
                      : origem === 'PADRAO_SETORIAL_IOSA'
                      ? 'IOSA (Setorial)'
                      : origem === 'CONTRATUAL_CLIENTE'
                      ? 'Clientes'
                      : 'FAA / Referência'}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-slate-500 text-[11px]">
              Exibindo {requisitosPesquisados.length} requisitos rastreados e verificados
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requisitosPesquisados
              .filter((r) => filtroOrigemRequisitos === 'TODOS' || r.fonteOrigem === filtroOrigemRequisitos)
              .map((req, idx) => (
                <div
                  key={`${req.id}-${idx}`}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {req.codigoReferenciaOriginal}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {req.entidadeEmissora} • {req.edicaoRevisaoFonte}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {req.tituloCurto}
                    </h4>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic font-serif leading-relaxed">
                      "{req.textoOriginal}"
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Capítulo / Subitem:</span> {req.capituloSecaoSubitem}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Justificativa de Aplicabilidade:</span> {req.justificativaAplicabilidade}
                      </div>
                      {req.controleCentralId && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Controle Central SGQ:</span>{' '}
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{req.controleCentralId}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Evidência Esperada:</span> {req.evidenciaEsperada}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      Consulta: {req.dataUltimaConsulta}
                    </span>
                    {req.urlOficialFonte && req.urlOficialFonte.startsWith('http') && (
                      <a
                        href={req.urlOficialFonte}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Fonte Oficial</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL: DIFF E COMPARAÇÃO DE REVISÃO DA FONTE */}
      {selectedFonteParaVerificacao && resultadoDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <span>Resultado da Verificação: {selectedFonteParaVerificacao.codigoDocumento}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparação automatizada contra a autoridade oficial e geração de diffs estruturados.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFonteParaVerificacao(null);
                  setResultadoDiffModal(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                resultadoDiffModal.temDivergenciaRevisao
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {resultadoDiffModal.temDivergenciaRevisao ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span
                  className={
                    resultadoDiffModal.temDivergenciaRevisao
                      ? 'text-amber-900 dark:text-amber-200'
                      : 'text-emerald-900 dark:text-emerald-200'
                  }
                >
                  {resultadoDiffModal.mensagemConclusiva}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px]">
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                  <span className="text-slate-500 block">Revisão no Acervo:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {resultadoDiffModal.revisaoAtualNoSistema}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                  <span className="text-slate-500 block">Fonte Oficial:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {resultadoDiffModal.revisaoIdentificadaNaFonte}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                  <span className="text-slate-500 block">Itens Novos:</span>
                  <span className="font-bold text-emerald-600">
                    {resultadoDiffModal.itensNovos.length}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg">
                  <span className="text-slate-500 block">Itens Alterados:</span>
                  <span className="font-bold text-amber-600">
                    {resultadoDiffModal.itensAlterados.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Diffs de texto side-by-side se houver alterações */}
            {resultadoDiffModal.itensAlterados.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Diferenças de Redação Identificadas:
                </h4>
                {resultadoDiffModal.itensAlterados.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100">
                      {item.codigoItem} — {item.titulo}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200">
                        <span className="font-semibold text-rose-800 dark:text-rose-300 block text-[10px]">
                          Texto Anterior ({item.revisaoAnterior}):
                        </span>
                        <p className="text-rose-900 dark:text-rose-200 italic mt-0.5">"{item.textoAnterior}"</p>
                      </div>
                      <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[10px]">
                          Novo Texto Oficial ({item.revisaoNova}):
                        </span>
                        <p className="text-emerald-900 dark:text-emerald-200 italic mt-0.5">"{item.textoNovo}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Salvaguarda de Auditorias Anteriores */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-900 dark:text-blue-200">
              <span className="font-bold block">Regra SGQ de Não-Alteração Retroativa:</span>
              Snapshots de auditorias concluídas anteriormente permanecem 100% inalterados com a redação normativa
              vigente na época do checklist. A nova revisão tramitará na Fila de Homologação da Qualidade.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedFonteParaVerificacao(null);
                  setResultadoDiffModal(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HOMOLOGAÇÃO FORMAL DA QUALIDADE */}
      {reviewParaHomologar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Homologação SGQ: {reviewParaHomologar.codigoDocumento}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aprovação da revisão {reviewParaHomologar.revisaoNova} e incorporação ao acervo da IMPACTO.
                </p>
              </div>
              <button
                onClick={() => setReviewParaHomologar(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Decisão da Garantia da Qualidade *
                </label>
                <select
                  value={decisaoHomologacao}
                  onChange={(e) => setDecisaoHomologacao(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="APLICAVEL">Aplicável Integralmente (Incorporar ao Acervo)</option>
                  <option value="PARCIALMENTE_APLICAVEL">Parcialmente Aplicável (Requer Suplemento)</option>
                  <option value="NAO_APLICAVEL">Não Aplicável à Operação da IMPACTO</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Justificativa Técnica do Gestor da Qualidade *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva a fundamentação técnica da aprovação, adequações necessárias no MOMQ/PTM e diretrizes aos mecânicos..."
                  value={justificativaHomologacao}
                  onChange={(e) => setJustificativaHomologacao(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-[11px] text-emerald-900 dark:text-emerald-200">
                <span className="font-bold block">Assinatura Digital Rastreável:</span>
                Responsável: <span className="font-semibold">{currentUser?.displayName || 'Gerente da Qualidade'}</span> ({currentUser?.email || 'qualidade@impacto.aero'})
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReviewParaHomologar(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingApproval}
                  onClick={handleExecutarHomologacao}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingApproval ? 'Homologando...' : 'Homologar e Incorporar ao Acervo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROTOCOLO DE NOVA EDIÇÃO (FONTES RESTRITAS / CLIENTES) */}
      {selectedFonteParaUpload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-purple-600" />
                  <span>Protocolar Nova Edição / Checklist</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fonte: {selectedFonteParaUpload.codigoDocumento} ({selectedFonteParaUpload.autoridadeOuEntidade})
                </p>
              </div>
              <button
                onClick={() => setSelectedFonteParaUpload(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarUploadEdicao} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Identificação da Nova Revisão / Edição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ISM Edição 18 Rev 1, Checklist QA-14 Rev. 5, Q2059 Rev. 03"
                  value={uploadEdicaoForm.novaRevisaoOuEdicao}
                  onChange={(e) =>
                    setUploadEdicaoForm({ ...uploadEdicaoForm, novaRevisaoOuEdicao: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data de Recebimento / Protocolo
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadEdicaoForm.dataRecebimento}
                    onChange={(e) =>
                      setUploadEdicaoForm({ ...uploadEdicaoForm, dataRecebimento: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Data de Vigência Oficial
                  </label>
                  <input
                    type="date"
                    value={uploadEdicaoForm.dataVigencia}
                    onChange={(e) =>
                      setUploadEdicaoForm({ ...uploadEdicaoForm, dataVigencia: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações de Recebimento e Anexo
                </label>
                <textarea
                  rows={2}
                  placeholder="Canal de recebimento (email do cliente, portal de fornecedor, cópia licenciada)..."
                  value={uploadEdicaoForm.observacoesEntrega}
                  onChange={(e) =>
                    setUploadEdicaoForm({ ...uploadEdicaoForm, observacoesEntrega: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedFonteParaUpload(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Protocolar Edição no Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO DE NOVA FONTE NORMATIVA */}
      {isNewSourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span>Cadastrar Nova Fonte Normativa / Organização</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adicione novos órgãos reguladores, padrões setoriais ou checklists de clientes ao monitoramento.
                </p>
              </div>
              <button
                onClick={() => setIsNewSourceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaFonte} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Código do Documento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: RBAC 145, Part-145, TACV-AUDIT-01"
                    value={newSourceForm.codigoDocumento || ''}
                    onChange={(e) =>
                      setNewSourceForm({ ...newSourceForm, codigoDocumento: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Autoridade ou Entidade Emissora *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cabo Verde AAC, Transport Canada, Swiss SGQ"
                    value={newSourceForm.autoridadeOuEntidade || ''}
                    onChange={(e) =>
                      setNewSourceForm({ ...newSourceForm, autoridadeOuEntidade: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título Completo do Documento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Regulamento de Homologação de Organizações de Manutenção de Cabo Verde"
                  value={newSourceForm.tituloDocumento || ''}
                  onChange={(e) =>
                    setNewSourceForm({ ...newSourceForm, tituloDocumento: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Família
                  </label>
                  <select
                    value={newSourceForm.familia || 'CLIENTE'}
                    onChange={(e) =>
                      setNewSourceForm({ ...newSourceForm, familia: e.target.value as any })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ANAC">ANAC (Brasil)</option>
                    <option value="EASA">EASA (Europa)</option>
                    <option value="FAA">FAA (EUA)</option>
                    <option value="IOSA">IATA / IOSA</option>
                    <option value="CLIENTE">Cliente Operador</option>
                    <option value="OUTRA_AUTORIDADE">Outra Autoridade</option>
                    <option value="INTERNO_IMPACTO">Interno IMPACTO</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Acesso
                  </label>
                  <select
                    value={newSourceForm.tipoAcesso || 'CLIENTE_ENVIO_PENDENTE'}
                    onChange={(e) =>
                      setNewSourceForm({ ...newSourceForm, tipoAcesso: e.target.value as any })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="PUBLICA_AUTOMATICA">Pública Automática (API)</option>
                    <option value="PUBLICA_MANUAL">Pública Manual (Portal)</option>
                    <option value="PRIVADA_LICENCIADA">Privada Licenciada</option>
                    <option value="CLIENTE_ENVIO_PENDENTE">Cliente Envio Pendente</option>
                    <option value="INTERNO_CONTROLADO">Interno Controlado</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Periodicidade
                  </label>
                  <select
                    value={newSourceForm.periodicidadeMonitoramento || 'TRIMESTRAL'}
                    onChange={(e) =>
                      setNewSourceForm({
                        ...newSourceForm,
                        periodicidadeMonitoramento: e.target.value as PeriodicidadeMonitoramento
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="MENSAL">Mensal (30 dias)</option>
                    <option value="TRIMESTRAL">Trimestral (90 dias)</option>
                    <option value="SEMESTRAL">Semestral (180 dias)</option>
                    <option value="MANUAL">Manual / Conforme Demanda</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  URL Oficial da Fonte / Portal da Autoridade
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newSourceForm.urlOficialConsulta || ''}
                  onChange={(e) =>
                    setNewSourceForm({ ...newSourceForm, urlOficialConsulta: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Justificativa de Aplicabilidade à IMPACTO
                </label>
                <textarea
                  rows={2}
                  placeholder="Fundamento técnico e contratual para o monitoramento deste documento..."
                  value={newSourceForm.justificativaAplicabilidade || ''}
                  onChange={(e) =>
                    setNewSourceForm({ ...newSourceForm, justificativaAplicabilidade: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewSourceModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Cadastrar Fonte no Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
