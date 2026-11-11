import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  FileText,
  Sparkles,
  Link2,
  Paperclip,
  Check,
  AlertCircle,
  Building2,
  BookOpen,
  Calendar,
  User,
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Upload,
  Layers,
  ArrowRight,
  ExternalLink,
  History,
  Info,
  HelpCircle,
  Flag,
  FileCheck2,
  FolderOpen
} from 'lucide-react';
import {
  PreparacaoRequisitoAuditoria,
  OrigemRespostaAuditoria,
  StatusRespostaAuditoria,
  SituacaoProntidaoAuditoria,
  TipoPendenciaPreparacao,
  StatusPendenciaPreparacao,
  DocumentoControlado,
  EvidenciaRequisitoItem,
  ControleCentralSGQ,
  UserProfile,
  AvaliacaoQualidadeEvidencia
} from '../../types';
import {
  sugerirRespostaBaseadaEmFontes,
  avaliarProntidaoRequisito,
  adicionarPendencia,
  atualizarStatusPendencia,
  vincularDocumentoAoRequisito,
  vincularEvidenciaAoRequisito,
  salvarEdicaoResposta,
  aprovarValidacaoQualidade
} from '../../services/auditReadinessService';

interface AuditReadinessDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  preparacao: PreparacaoRequisitoAuditoria | null;
  onSave: (preparacaoAtualizada: PreparacaoRequisitoAuditoria) => Promise<void>;
  documentosDisponiveis: DocumentoControlado[];
  evidenciasDisponiveis: EvidenciaRequisitoItem[];
  controlesCentrais: ControleCentralSGQ[];
  currentUser?: UserProfile | null;
}

const ORIGEM_CONFIG: Record<
  OrigemRespostaAuditoria,
  { label: string; badge: string; desc: string; icon: string }
> = {
  AUTOMATICA: {
    label: 'Automática',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    desc: 'Informações suficientes encontradas nas fontes procedimentais e evidências ativas do SGQ.',
    icon: '⚡'
  },
  AUTOMATICA_COM_VALIDACAO: {
    label: 'Automática c/ Validação',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    desc: 'Resposta sugerida a partir de procedimentos do SGQ, aguardando revisão humana da Qualidade.',
    icon: '🤖'
  },
  COMPLEMENTACAO_NECESSARIA: {
    label: 'Complementação Necessária',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    desc: 'Resposta parcial baseada no controle central; pendente de registros ou evidências de campo.',
    icon: '⚠️'
  },
  TRATAMENTO_MANUAL: {
    label: 'Tratamento Manual',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    desc: 'Depende de atividade, manual de cliente ou informação técnica ainda não cadastrada.',
    icon: '✍️'
  }
};

const PRONTIDAO_CONFIG: Record<
  SituacaoProntidaoAuditoria,
  { label: string; badge: string; icon: any }
> = {
  PRONTO_PARA_AUDITORIA: {
    label: 'Pronto para Auditoria',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2
  },
  COM_PENDENCIAS_IMPEDITIVAS: {
    label: 'Pendências Impeditivas',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: XCircle
  },
  AGUARDANDO_VALIDACAO: {
    label: 'Aguardando Validação',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: Clock
  },
  EM_PREPARACAO: {
    label: 'Em Preparação',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertTriangle
  },
  NAO_INICIADA: {
    label: 'Não Iniciada',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: HelpCircle
  },
  EXCECAO_JUSTIFICADA: {
    label: 'Exceção Justificada',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: ShieldCheck
  }
};

export const AuditReadinessDetailModal: React.FC<AuditReadinessDetailModalProps> = ({
  isOpen,
  onClose,
  preparacao,
  onSave,
  documentosDisponiveis,
  evidenciasDisponiveis,
  controlesCentrais,
  currentUser
}) => {
  if (!isOpen || !preparacao) return null;

  const isConsulta = currentUser?.role === 'CONSULTA' || currentUser?.role === 'VIEWER';

  // Sub-abas do formulário individual
  const [activeArea, setActiveArea] = useState<
    'identificacao' | 'resposta' | 'documentos' | 'evidencias' | 'pendencias' | 'validacao'
  >('resposta');

  // Estado local para edição da resposta institucional
  const [textoRespostaEdit, setTextoRespostaEdit] = useState<string>(preparacao.respostaTexto || '');
  const [statusRespostaEdit, setStatusRespostaEdit] = useState<StatusRespostaAuditoria>(preparacao.statusResposta || 'RASCUNHO');
  const [origemRespostaEdit, setOrigemRespostaEdit] = useState<OrigemRespostaAuditoria>(preparacao.origemResposta || 'TRATAMENTO_MANUAL');
  const [motivoEdicao, setMotivoEdicao] = useState<string>('');

  // Estado local para adicionar documento existente
  const [docSelecionadoId, setDocSelecionadoId] = useState<string>('');
  const [docSecaoAplicavel, setDocSecaoAplicavel] = useState<string>('');

  // Estado local para vincular evidência existente
  const [evidSelecionadaId, setEvidSelecionadaId] = useState<string>('');
  const [evidParecerQualidade, setEvidParecerQualidade] = useState<string>('Evidência objetiva aderente ao requisito.');

  // Estado local para nova evidência enviada
  const [showUploadEvidencia, setShowUploadEvidencia] = useState(false);
  const [novaEvidTitulo, setNovaEvidTitulo] = useState('');
  const [novaEvidTipo, setNovaEvidTipo] = useState('DOCUMENTO');
  const [novaEvidRef, setNovaEvidRef] = useState('');
  const [novaEvidValidade, setNovaEvidValidade] = useState('');
  const [novaEvidBase, setNovaEvidBase] = useState('GRU');

  // Estado local para nova pendência
  const [showNovaPendencia, setShowNovaPendencia] = useState(false);
  const [pendenciaDesc, setPendenciaDesc] = useState('');
  const [pendenciaTipo, setPendenciaTipo] = useState<TipoPendenciaPreparacao>('ATUALIZAR_PROCEDIMENTO');
  const [pendenciaResp, setPendenciaResp] = useState(currentUser?.displayName || 'Garantia da Qualidade');
  const [pendenciaPrazo, setPendenciaPrazo] = useState(new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0]);
  const [pendenciaImpeditiva, setPendenciaImpeditiva] = useState(true);

  // Estado para validação final da Qualidade
  const [parecerFinal, setParecerFinal] = useState<string>(preparacao.parecerQualidade || '');
  const [evidenciasAprovadasSuficientes, setEvidenciasAprovadasSuficientes] = useState<boolean>(preparacao.evidenciasSuficientes);
  const [isExcecao, setIsExcecao] = useState<boolean>(preparacao.situacaoProntidao === 'EXCECAO_JUSTIFICADA');
  const [justificativaExcecao, setJustificativaExcecao] = useState<string>(preparacao.justificativaExcecao || '');

  // Feedback e loading
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  // Controle central associado
  const controleAssociado = useMemo(() => {
    return controlesCentrais.find(
      (c) => c.codigo === preparacao.controleCentralId || c.id === preparacao.controleCentralId
    );
  }, [preparacao.controleCentralId, controlesCentrais]);

  // Avaliação de prontidão em tempo real das 5 regras
  const avaliacaoProntidao = useMemo(() => {
    return avaliarProntidaoRequisito(preparacao);
  }, [preparacao]);

  // Ação 1: Gerar Sugestão Baseada em Fontes Reais
  const handleGerarSugestao = () => {
    const res = sugerirRespostaBaseadaEmFontes(
      {
        id: preparacao.requisitoId,
        numeroItem: preparacao.numeroItem,
        perguntaOuCriterio: preparacao.tituloRequisito,
        referenciaNormativa: preparacao.normaDocumento,
        moduloOuSecao: preparacao.secaoReferencia,
        controleCentralId: preparacao.controleCentralId
      } as any,
      controleAssociado,
      documentosDisponiveis,
      evidenciasDisponiveis
    );

    setTextoRespostaEdit(res.respostaSugerida);
    setOrigemRespostaEdit(res.origemClassificada);
    setStatusRespostaEdit('EM_ELABORACAO');
    setMotivoEdicao(`Sugestão automática gerada a partir de ${res.fontesIdentificadas.length} fontes e registros do SGQ.`);

    setFeedback({
      tipo: 'sucesso',
      msg: `Sugestão gerada com sucesso! Fontes identificadas: ${res.fontesIdentificadas.length}. Classificação: ${ORIGEM_CONFIG[res.origemClassificada].label}.`
    });
  };

  // Ação 2: Salvar Resposta (Rascunho, Validação ou Aprovação)
  const handleSalvarResposta = async (statusDestino: StatusRespostaAuditoria) => {
    if (isConsulta) {
      alert('Perfil de CONSULTA não possui permissão para editar respostas.');
      return;
    }
    if (!textoRespostaEdit.trim()) {
      alert('O texto da resposta não pode ficar em branco.');
      return;
    }

    setSaving(true);
    try {
      const atualizado = salvarEdicaoResposta(
        preparacao,
        textoRespostaEdit,
        statusDestino,
        origemRespostaEdit,
        motivoEdicao || `Alteração de status para ${statusDestino}`,
        currentUser
      );
      await onSave(atualizado);
      setStatusRespostaEdit(statusDestino);
      setFeedback({ tipo: 'sucesso', msg: `Resposta salva com status: [${statusDestino}]!` });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao salvar resposta.' });
    } finally {
      setSaving(false);
    }
  };

  // Ação 3: Vincular Documento Existente
  const handleVincularDocumento = async () => {
    if (!docSelecionadoId) return;
    const docObj = documentosDisponiveis.find((d) => d.id === docSelecionadoId);
    if (!docObj) return;

    setSaving(true);
    try {
      const atualizado = vincularDocumentoAoRequisito(preparacao, docObj, docSecaoAplicavel, currentUser);
      await onSave(atualizado);
      setDocSelecionadoId('');
      setDocSecaoAplicavel('');
      setFeedback({ tipo: 'sucesso', msg: `Documento [${docObj.codigo}] vinculado com sucesso!` });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao vincular documento.' });
    } finally {
      setSaving(false);
    }
  };

  // Ação 4: Vincular Evidência Existente
  const handleVincularEvidenciaExistente = async () => {
    if (!evidSelecionadaId) return;
    const evidObj = evidenciasDisponiveis.find((e) => e.id === evidSelecionadaId);
    if (!evidObj) return;

    setSaving(true);
    try {
      const avaliacao: AvaliacaoQualidadeEvidencia = {
        status: 'SUFICIENTE',
        pertinencia: true,
        autenticidade: true,
        abrangencia: true,
        validadeConferida: evidObj.statusValidade === 'VALIDO',
        parecer: evidParecerQualidade || 'Evidência vinculada e avaliada pela Qualidade.',
        avaliadoPorNome: currentUser?.displayName || 'Paulo Okubo',
        avaliadoEm: new Date().toISOString().split('T')[0]
      };

      const atualizado = vincularEvidenciaAoRequisito(preparacao, evidObj, avaliacao, currentUser);
      await onSave(atualizado);
      setEvidSelecionadaId('');
      setFeedback({ tipo: 'sucesso', msg: `Evidência [${evidObj.titulo}] vinculada e avaliada!` });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao vincular evidência.' });
    } finally {
      setSaving(false);
    }
  };

  // Ação 5: Cadastrar Nova Evidência
  const handleCriarNovaEvidencia = async () => {
    if (!novaEvidTitulo.trim()) {
      alert('Informe o título da evidência.');
      return;
    }

    setSaving(true);
    try {
      const novaEvidId = `EVID-CUSTOM-${Date.now().toString(36)}`;
      const novaEvid: EvidenciaRequisitoItem = {
        id: novaEvidId,
        organizationId: preparacao.organizationId,
        tipo: novaEvidTipo as any,
        titulo: novaEvidTitulo,
        numeroReferencia: novaEvidRef,
        dataEvidencia: new Date().toISOString().split('T')[0],
        dataEmissao: new Date().toISOString().split('T')[0],
        dataValidade: novaEvidValidade || undefined,
        baseOperacional: novaEvidBase,
        statusValidade: novaEvidValidade && new Date(novaEvidValidade) < new Date() ? 'VENCIDO' : 'VALIDO',
        responsavel: currentUser?.displayName || 'Qualidade',
        requisitoId: preparacao.requisitoId,
        controleId: preparacao.controleCentralId
      };

      const avaliacao: AvaliacaoQualidadeEvidencia = {
        status: 'SUFICIENTE',
        pertinencia: true,
        autenticidade: true,
        abrangencia: true,
        validadeConferida: novaEvid.statusValidade === 'VALIDO',
        parecer: 'Nova evidência cadastrada e aprovada pela Qualidade.',
        avaliadoPorNome: currentUser?.displayName || 'Paulo Okubo',
        avaliadoEm: new Date().toISOString().split('T')[0]
      };

      const atualizado = vincularEvidenciaAoRequisito(preparacao, novaEvid, avaliacao, currentUser);
      await onSave(atualizado);

      setShowUploadEvidencia(false);
      setNovaEvidTitulo('');
      setNovaEvidRef('');
      setNovaEvidValidade('');
      setFeedback({ tipo: 'sucesso', msg: 'Nova evidência anexada e vinculada!' });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao anexar evidência.' });
    } finally {
      setSaving(false);
    }
  };

  // Ação 6: Adicionar Pendência
  const handleAdicionarPendencia = async () => {
    if (!pendenciaDesc.trim()) {
      alert('Informe a descrição da pendência.');
      return;
    }

    setSaving(true);
    try {
      const atualizado = adicionarPendencia(
        preparacao,
        {
          descricao: pendenciaDesc,
          tipo: pendenciaTipo,
          responsavelNome: pendenciaResp,
          prazo: pendenciaPrazo,
          situacao: 'PENDENTE',
          impeditivaAuditoria: pendenciaImpeditiva,
          observacoes: 'Cadastrada no módulo de preparação para auditorias (Fase 1.4.4)'
        },
        currentUser
      );
      await onSave(atualizado);

      setShowNovaPendencia(false);
      setPendenciaDesc('');
      setFeedback({ tipo: 'sucesso', msg: 'Pendência registrada com sucesso!' });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao adicionar pendência.' });
    } finally {
      setSaving(false);
    }
  };

  // Ação 7: Concluir Pendência
  const handleAlternarStatusPendencia = async (pendenciaId: string, statusAtual: StatusPendenciaPreparacao) => {
    const novoStatus: StatusPendenciaPreparacao = statusAtual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA';
    setSaving(true);
    try {
      const atualizado = atualizarStatusPendencia(preparacao, pendenciaId, novoStatus, currentUser);
      await onSave(atualizado);
      setFeedback({ tipo: 'sucesso', msg: `Pendência marcada como ${novoStatus}!` });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro ao atualizar pendência.' });
    } finally {
      setSaving(false);
    }
  };

  // Ação 8: Aprovar Validação da Qualidade
  const handleAprovarQualidade = async () => {
    if (isConsulta) {
      alert('Apenas Gestores da Qualidade podem aprovar a preparação.');
      return;
    }
    if (isExcecao && !justificativaExcecao.trim()) {
      alert('Para aprovar como Exceção Justificada, é obrigatório registrar a justificativa técnica.');
      return;
    }

    setSaving(true);
    try {
      const atualizado = aprovarValidacaoQualidade(
        preparacao,
        parecerFinal || 'Requisito analisado e considerado preparado para auditoria.',
        evidenciasAprovadasSuficientes,
        isExcecao,
        justificativaExcecao,
        currentUser
      );
      await onSave(atualizado);
      setFeedback({ tipo: 'sucesso', msg: 'Validação da Qualidade registrada com sucesso!' });
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e.message || 'Erro na validação da Qualidade.' });
    } finally {
      setSaving(false);
    }
  };

  const ProntidaoIcon = PRONTIDAO_CONFIG[preparacao.situacaoProntidao]?.icon || HelpCircle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header Superior com Identificação e Prontidão */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-start justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                {preparacao.requisitoId}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                {preparacao.autoridadeOuCliente}
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {preparacao.normaDocumento} — {preparacao.secaoReferencia}
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${PRONTIDAO_CONFIG[preparacao.situacaoProntidao]?.badge}`}>
                <ProntidaoIcon className="w-3 h-3" />
                <span>{PRONTIDAO_CONFIG[preparacao.situacaoProntidao]?.label}</span>
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {preparacao.tituloRequisito}
            </h2>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Critério: <strong className="text-slate-700 dark:text-slate-300">{preparacao.criterioCanonicoId || 'N/A'}</strong></span>
              <span>•</span>
              <span>Controle SGQ: <strong className="text-slate-700 dark:text-slate-300">{preparacao.controleCentralCodigo || preparacao.controleCentralId}</strong></span>
              <span>•</span>
              <span>Origem da Resposta: <strong className="text-blue-600 dark:text-blue-400">{ORIGEM_CONFIG[preparacao.origemResposta]?.label}</strong></span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`px-5 py-2 text-xs flex items-center justify-between ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-b border-rose-200 dark:border-rose-800'
          }`}>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="text-[11px] font-bold underline cursor-pointer">Fechar</button>
          </div>
        )}

        {/* Sub-Aba Navigation */}
        <div className="flex items-center gap-1 px-5 pt-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveArea('resposta')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeArea === 'resposta'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resposta Institucional</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              preparacao.statusResposta === 'APROVADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {preparacao.statusResposta}
            </span>
          </button>

          <button
            onClick={() => setActiveArea('documentos')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeArea === 'documentos'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Documentos Relacionados ({preparacao.documentosRelacionados?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveArea('evidencias')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeArea === 'evidencias'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Evidências Objetivas ({preparacao.evidenciasVinculadas?.length || 0})</span>
            {preparacao.evidenciasSuficientes && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
          </button>

          <button
            onClick={() => setActiveArea('pendencias')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeArea === 'pendencias'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Pendências & Ações ({preparacao.pendencias?.length || 0})</span>
            {preparacao.pendencias?.some((p) => p.impeditivaAuditoria && p.situacao !== 'CONCLUIDA') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveArea('validacao')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeArea === 'validacao'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Validação da Qualidade</span>
            {avaliacaoProntidao.pronto ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-bold">PRONTO</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">{avaliacaoProntidao.motivosBloqueio.length} impedimentos</span>
            )}
          </button>

          <button
            onClick={() => setActiveArea('identificacao')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeArea === 'identificacao'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Texto Original & Metadados</span>
          </button>
        </div>

        {/* Conteúdo Principal Scrollável */}
        <div className="flex-1 overflow-y-auto p-5 text-sm space-y-4">

          {/* ================================================================ */}
          {/* ÁREA B: RESPOSTA INSTITUCIONAL                                    */}
          {/* ================================================================ */}
          {activeArea === 'resposta' && (
            <div className="space-y-4">
              
              {/* Barra de Ações Rápidas da Resposta */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGerarSugestao}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Sugerir Resposta Baseada em Fontes Reais</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Origem:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${ORIGEM_CONFIG[origemRespostaEdit].badge}`}>
                      {ORIGEM_CONFIG[origemRespostaEdit].icon} {ORIGEM_CONFIG[origemRespostaEdit].label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Versão: <strong>{preparacao.versaoResposta || '1.0'}</strong></span>
                </div>
              </div>

              {/* Alerta de Diretriz Regulamentar */}
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Diretriz QualyQuest:</strong> A resposta sugerida NUNCA afirma que uma atividade é executada ou que existe evidência sem que isso esteja comprovado nos documentos cadastrados (MOMQ, PTM, POPs, Formulários e Certificados).
                </div>
              </div>

              {/* Fontes Utilizadas */}
              {preparacao.fontesUtilizadas && preparacao.fontesUtilizadas.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Fontes Documentais e Registros Utilizados para Sustentar a Resposta:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {preparacao.fontesUtilizadas.map((fonte, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="text-[10px] font-bold uppercase text-slate-400">{fonte.tipo}:</span>
                        <span>{fonte.nome}</span>
                        {fonte.revisao && <span className="text-[10px] text-blue-600 font-mono">({fonte.revisao})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Editor da Resposta */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Texto da Resposta Institucional (a ser apresentada ao auditor):
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {textoRespostaEdit.length} caracteres
                  </span>
                </div>

                <textarea
                  value={textoRespostaEdit}
                  onChange={(e) => setTextoRespostaEdit(e.target.value)}
                  rows={6}
                  placeholder="Redija ou edite a resposta institucional detalhada, citando procedimentos do SGQ, responsáveis e evidências..."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-sans leading-relaxed focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Motivo da alteração */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Motivo da Revisão / Observações da Edição:
                </label>
                <input
                  type="text"
                  value={motivoEdicao}
                  onChange={(e) => setMotivoEdicao(e.target.value)}
                  placeholder="Ex: Inclusão do procedimento POP-FER-01 e ajuste de redação para auditoria ANAC..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Botões de Salvamento e Status da Resposta */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Status da Resposta:</span>
                  <select
                    value={statusRespostaEdit}
                    onChange={(e) => setStatusRespostaEdit(e.target.value as StatusRespostaAuditoria)}
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                  >
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="EM_ELABORACAO">Em Elaboração</option>
                    <option value="AGUARDANDO_VALIDACAO">Aguardando Validação</option>
                    <option value="APROVADA">Aprovada pela Qualidade</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSalvarResposta('RASCUNHO')}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Salvar Rascunho
                  </button>

                  <button
                    onClick={() => handleSalvarResposta('AGUARDANDO_VALIDACAO')}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                  >
                    Submeter p/ Validação
                  </button>

                  {!isConsulta && (
                    <button
                      onClick={() => handleSalvarResposta('APROVADA')}
                      disabled={saving}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-xs"
                    >
                      Aprovar Resposta
                    </button>
                  )}
                </div>
              </div>

              {/* Histórico de Alterações */}
              {preparacao.historicoRespostas && preparacao.historicoRespostas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                    <History className="w-4 h-4 text-slate-400" />
                    Histórico de Versões e Alterações:
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                    {preparacao.historicoRespostas.map((h, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Versão {h.versao} — {h.acao}</span>
                          <span>{new Date(h.dataHora).toLocaleString('pt-BR')} por <strong>{h.usuarioNome}</strong></span>
                        </div>
                        {h.motivo && <p className="text-slate-600 dark:text-slate-400 text-xs italic">{h.motivo}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================================================================ */}
          {/* ÁREA C: DOCUMENTOS RELACIONADOS                                  */}
          {/* ================================================================ */}
          {activeArea === 'documentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Documentos Controlados do SGQ Vinculados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Procedimentos, manuais (MOMQ/PTM), instruções e formulários que sustentam a resposta.
                  </p>
                </div>
              </div>

              {/* Seletor para vincular documento existente sem duplicação */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  + Vincular Documento Existente do Acervo:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={docSelecionadoId}
                    onChange={(e) => setDocSelecionadoId(e.target.value)}
                    className="flex-1 min-w-[240px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">Selecione um documento do acervo...</option>
                    {documentosDisponiveis.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo} — {d.titulo} (Rev: {d.revisaoVigenteNumero || 'Vigente'}) [{d.statusGeral}]
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={docSecaoAplicavel}
                    onChange={(e) => setDocSecaoAplicavel(e.target.value)}
                    placeholder="Seção aplicável (ex: Seção 3.4.2)"
                    className="w-48 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />

                  <button
                    onClick={handleVincularDocumento}
                    disabled={!docSelecionadoId || saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    Vincular Documento
                  </button>
                </div>
              </div>

              {/* Lista de Documentos Vinculados */}
              <div className="space-y-2">
                {preparacao.documentosRelacionados && preparacao.documentosRelacionados.length > 0 ? (
                  preparacao.documentosRelacionados.map((docItem, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono text-xs font-bold">
                          {docItem.codigo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{docItem.titulo}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Rev: {docItem.revisao || 'Vigente'}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {docItem.situacao}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Seção aplicável: <strong className="text-slate-700 dark:text-slate-300">{docItem.secaoAplicavel || 'Geral'}</strong>
                            <span className="mx-2">•</span>
                            Vinculado por: {docItem.adicionadoPorNome}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs">
                    Nenhum documento formal vinculado. Vincule procedimentos do MOMQ/PTM para fundamentar a resposta.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÁREA D: EVIDÊNCIAS OBJETIVAS                                     */}
          {/* ================================================================ */}
          {activeArea === 'evidencias' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Evidências Objetivas e Registros de Campo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Certificados RBC/NIST, fichas de treinamento, fotos de ferramentas e registros operacionais.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUploadEvidencia(!showUploadEvidencia)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Nova Evidência</span>
                  </button>
                </div>
              </div>

              {/* Seletor para Reutilizar Evidência Existente no Sistema */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Reutilizar Evidência Já Cadastrada no Sistema:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={evidSelecionadaId}
                    onChange={(e) => setEvidSelecionadaId(e.target.value)}
                    className="flex-1 min-w-[240px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">Selecione uma evidência do acervo...</option>
                    {evidenciasDisponiveis.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.titulo} [{e.tipo}] — Ref: {e.numeroReferencia || e.id} ({e.statusValidade || 'VALIDO'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={evidParecerQualidade}
                    onChange={(e) => setEvidParecerQualidade(e.target.value)}
                    placeholder="Parecer da Qualidade sobre esta evidência..."
                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />

                  <button
                    onClick={handleVincularEvidenciaExistente}
                    disabled={!evidSelecionadaId || saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    Vincular e Avaliar
                  </button>
                </div>
              </div>

              {/* Formulário para Upload / Adição Rápida de Evidência */}
              {showUploadEvidencia && (
                <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      Cadastrar e Anexar Nova Evidência Objetiva
                    </span>
                    <button onClick={() => setShowUploadEvidencia(false)} className="text-xs text-slate-400 hover:text-slate-600">
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Título da Evidência:</label>
                      <input
                        type="text"
                        value={novaEvidTitulo}
                        onChange={(e) => setNovaEvidTitulo(e.target.value)}
                        placeholder="Ex: Certificado RBC Torquímetro T-045"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Evidência:</label>
                      <select
                        value={novaEvidTipo}
                        onChange={(e) => setNovaEvidTipo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="CERTIFICADO_CALIBRACAO">Certificado de Calibração</option>
                        <option value="REGISTRO_TREINAMENTO">Registro de Treinamento</option>
                        <option value="DOCUMENTO">Documento / Procedimento</option>
                        <option value="FOTO">Fotografia de Campo / Shadow Board</option>
                        <option value="RNC">RNC / Ação Corretiva</option>
                        <option value="AUDITORIA">Relatório de Auditoria</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Nº Referência / Certificado:</label>
                      <input
                        type="text"
                        value={novaEvidRef}
                        onChange={(e) => setNovaEvidRef(e.target.value)}
                        placeholder="Ex: CERT-RBC-2026-9042"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Data de Validade (se aplicável):</label>
                      <input
                        type="date"
                        value={novaEvidValidade}
                        onChange={(e) => setNovaEvidValidade(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Base Operacional:</label>
                      <select
                        value={novaEvidBase}
                        onChange={(e) => setNovaEvidBase(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="GRU">GRU - Guarulhos</option>
                        <option value="VCP">VCP - Viracopos</option>
                        <option value="GIG">GIG - Galeão</option>
                        <option value="SOD">SOD - Sorocaba (Hangar)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleCriarNovaEvidencia}
                        disabled={saving}
                        className="w-full py-1.5 px-3 rounded text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                      >
                        Salvar e Anexar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Evidências com Avaliação da Qualidade */}
              <div className="space-y-2">
                {preparacao.evidenciasVinculadas && preparacao.evidenciasVinculadas.length > 0 ? (
                  preparacao.evidenciasVinculadas.map((evItem, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <Paperclip className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{evItem.titulo}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                                {evItem.tipo}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                evItem.statusValidade === 'VALIDO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {evItem.statusValidade || 'VALIDO'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Ref: <strong>{evItem.numeroReferencia || 'N/A'}</strong> | Base: <strong>{evItem.baseOperacional || 'Geral'}</strong>
                              {evItem.dataValidade && <span> | Validade: <strong>{evItem.dataValidade}</strong></span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            evItem.avaliacaoQualidade?.status === 'SUFICIENTE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : evItem.avaliacaoQualidade?.status === 'PARCIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            Qualidade: {evItem.avaliacaoQualidade?.status || 'AVALIADA'}
                          </span>
                        </div>
                      </div>

                      {/* Parecer da Qualidade */}
                      {evItem.avaliacaoQualidade && (
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-1">
                            <span>Pertinência: <strong>{evItem.avaliacaoQualidade.pertinencia ? 'SIM' : 'NÃO'}</strong></span>
                            <span>Autenticidade: <strong>{evItem.avaliacaoQualidade.autenticidade ? 'SIM' : 'NÃO'}</strong></span>
                            <span>Abrangência: <strong>{evItem.avaliacaoQualidade.abrangencia ? 'SIM' : 'NÃO'}</strong></span>
                            <span>Validade Conferida: <strong>{evItem.avaliacaoQualidade.validadeConferida ? 'SIM' : 'NÃO'}</strong></span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            "{evItem.avaliacaoQualidade.parecer}" — {evItem.avaliacaoQualidade.avaliadoPorNome} ({evItem.avaliacaoQualidade.avaliadoEm})
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs">
                    Nenhuma evidência vinculada. A Qualidade deve vincular ou anexar certificados, fotos ou registros válidos para comprovar conformidade.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÁREA E: PENDÊNCIAS E AÇÕES NECESSÁRIAS                           */}
          {/* ================================================================ */}
          {activeArea === 'pendencias' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Pendências e Ações para Prontidão de Auditoria
                  </h3>
                  <p className="text-xs text-slate-500">
                    O que falta para deixar o requisito 100% pronto (atualizar procedimento, coletar evidência, etc.).
                  </p>
                </div>

                <button
                  onClick={() => setShowNovaPendencia(!showNovaPendencia)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nova Pendência</span>
                </button>
              </div>

              {/* Formulário Nova Pendência */}
              {showNovaPendencia && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Registrar Nova Ação / Pendência</span>
                    <button onClick={() => setShowNovaPendencia(false)} className="text-xs text-slate-400">Cancelar</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Descrição da Ação Necessária:</label>
                      <input
                        type="text"
                        value={pendenciaDesc}
                        onChange={(e) => setPendenciaDesc(e.target.value)}
                        placeholder="Ex: Coletar foto da etiqueta de calibração em inglês do torquímetro Snap-On em GRU"
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Pendência:</label>
                      <select
                        value={pendenciaTipo}
                        onChange={(e) => setPendenciaTipo(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="ATUALIZAR_PROCEDIMENTO">Atualizar Procedimento</option>
                        <option value="DISPONIBILIZAR_REGISTRO">Disponibilizar Registro</option>
                        <option value="SOLICITAR_CERTIFICADO">Solicitar Certificado</option>
                        <option value="FOTOGRAFAR_EQUIPAMENTO">Fotografar Equipamento / Placa</option>
                        <option value="VERIFICACAO_OPERACIONAL">Realizar Verificação Operacional</option>
                        <option value="COLETAR_EVIDENCIA_BASE">Coletar Evidência em Base</option>
                        <option value="CONFIRMAR_REQUISITO_CONTRATUAL">Confirmar Requisito Contratual</option>
                        <option value="OUTRA">Outra Ação</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Responsável:</label>
                      <input
                        type="text"
                        value={pendenciaResp}
                        onChange={(e) => setPendenciaResp(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Prazo Limite:</label>
                      <input
                        type="date"
                        value={pendenciaPrazo}
                        onChange={(e) => setPendenciaPrazo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-rose-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pendenciaImpeditiva}
                          onChange={(e) => setPendenciaImpeditiva(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span>Impeditiva para Auditoria (Bloqueia status Pronto)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleAdicionarPendencia}
                      disabled={saving}
                      className="px-3.5 py-1.5 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
                    >
                      Registrar Pendência
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Pendências Cadastradas */}
              <div className="space-y-2">
                {preparacao.pendencias && preparacao.pendencias.length > 0 ? (
                  preparacao.pendencias.map((pendItem) => {
                    const isConcluida = pendItem.situacao === 'CONCLUIDA';
                    return (
                      <div
                        key={pendItem.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          isConcluida
                            ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-70'
                            : pendItem.impeditivaAuditoria
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => handleAlternarStatusPendencia(pendItem.id, pendItem.situacao)}
                            className="mt-0.5 cursor-pointer text-slate-400 hover:text-emerald-600"
                          >
                            {isConcluida ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <div className="w-4 h-4 rounded border border-slate-400 hover:border-emerald-600" />
                            )}
                          </button>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-semibold ${isConcluida ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                {pendItem.descricao}
                              </span>
                              {pendItem.impeditivaAuditoria && !isConcluida && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                  IMPEDITIVA
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                                {pendItem.tipo}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Responsável: <strong>{pendItem.responsavelNome}</strong> | Prazo: <strong>{pendItem.prazo}</strong>
                              {isConcluida && <span className="text-emerald-600 font-semibold ml-2">✓ Concluída em {pendItem.concluidoEm?.split('T')[0]}</span>}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isConcluida ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {pendItem.situacao}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-xs">
                    Nenhuma pendência cadastrada para este requisito. Se houver ações necessárias antes da auditoria, cadastre-as acima.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÁREA F: VALIDAÇÃO DA QUALIDADE E PRONTIDÃO                       */}
          {/* ================================================================ */}
          {activeArea === 'validacao' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Gating de Prontidão para Auditoria (As 5 Regras Obrigatórias)
                </h3>
                <p className="text-xs text-slate-500">
                  Um requisito somente pode ser classificado como PRONTO quando todas as condições técnicas forem cumpridas.
                </p>
              </div>

              {/* Checklist Visual das 5 Regras */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                {/* Regra 1 */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  preparacao.aplicabilidade !== 'AGUARDANDO_AVALIACAO'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                }`}>
                  {preparacao.aplicabilidade !== 'AGUARDANDO_AVALIACAO' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100">1. Aplicabilidade Avaliada</strong>
                    <span className="text-slate-500">
                      Situação: <strong>{preparacao.aplicabilidade}</strong>
                    </span>
                  </div>
                </div>

                {/* Regra 2 */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  preparacao.statusResposta === 'APROVADA' && preparacao.respostaRevisada
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                }`}>
                  {preparacao.statusResposta === 'APROVADA' && preparacao.respostaRevisada ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100">2. Resposta Institucional Aprovada</strong>
                    <span className="text-slate-500">
                      Status: <strong>{preparacao.statusResposta}</strong> (Revisada: {preparacao.respostaRevisada ? 'SIM' : 'NÃO'})
                    </span>
                  </div>
                </div>

                {/* Regra 3 */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  preparacao.documentosRelacionados && preparacao.documentosRelacionados.length > 0
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                }`}>
                  {preparacao.documentosRelacionados && preparacao.documentosRelacionados.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100">3. Documentos Aplicáveis Vinculados</strong>
                    <span className="text-slate-500">
                      Total de documentos: <strong>{preparacao.documentosRelacionados?.length || 0}</strong>
                    </span>
                  </div>
                </div>

                {/* Regra 4 */}
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  preparacao.evidenciasSuficientes && preparacao.evidenciasVinculadas?.length > 0
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                }`}>
                  {preparacao.evidenciasSuficientes && preparacao.evidenciasVinculadas?.length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100">4. Evidências Avaliadas como Suficientes</strong>
                    <span className="text-slate-500">
                      Suficiência: <strong>{preparacao.evidenciasSuficientes ? 'SIM' : 'NÃO'}</strong> ({preparacao.evidenciasVinculadas?.length || 0} vinculadas)
                    </span>
                  </div>
                </div>

                {/* Regra 5 */}
                <div className={`p-3 rounded-xl border sm:col-span-2 flex items-start gap-2.5 ${
                  !preparacao.pendencias?.some((p) => p.impeditivaAuditoria && p.situacao !== 'CONCLUIDA' && p.situacao !== 'CANCELADA')
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                }`}>
                  {!preparacao.pendencias?.some((p) => p.impeditivaAuditoria && p.situacao !== 'CONCLUIDA' && p.situacao !== 'CANCELADA') ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100">5. Sem Pendências Impeditivas em Aberto</strong>
                    <span className="text-slate-500">
                      Pendências impeditivas abertas:{' '}
                      <strong>
                        {preparacao.pendencias?.filter((p) => p.impeditivaAuditoria && p.situacao !== 'CONCLUIDA' && p.situacao !== 'CANCELADA').length || 0}
                      </strong>
                    </span>
                  </div>
                </div>

              </div>

              {/* Lista de Impedimentos (se houver) */}
              {avaliacaoProntidao.motivosBloqueio.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                  <span className="font-bold block flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    Motivos de Bloqueio para a Prontidão de Auditoria:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {avaliacaoProntidao.motivosBloqueio.map((motivo, idx) => (
                      <li key={idx}>{motivo}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Registro do Parecer Formal da Qualidade */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Parecer Formal da Garantia da Qualidade:
                </span>

                <textarea
                  value={parecerFinal}
                  onChange={(e) => setParecerFinal(e.target.value)}
                  rows={3}
                  placeholder="Registre o parecer técnico conclusivo da Qualidade, aprovando a resposta e confirmando a validade das evidências..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evidenciasAprovadasSuficientes}
                      onChange={(e) => setEvidenciasAprovadasSuficientes(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Evidências analisadas e formalmente consideradas suficientes</span>
                  </label>

                  <label className="flex items-center gap-2 font-medium text-purple-700 dark:text-purple-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isExcecao}
                      onChange={(e) => setIsExcecao(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Aprovar com Exceção Justificada (sem apagar pendências)</span>
                  </label>
                </div>

                {isExcecao && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300">
                      Justificativa Técnica da Exceção (Mandatória):
                    </label>
                    <input
                      type="text"
                      value={justificativaExcecao}
                      onChange={(e) => setJustificativaExcecao(e.target.value)}
                      placeholder="Ex: Auditoria extraordinária autorizada pela Gerência de Qualidade mediante termo de responsabilidade..."
                      className="w-full px-3 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleAprovarQualidade}
                    disabled={saving || (!avaliacaoProntidao.pronto && !isExcecao)}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isExcecao ? 'Aprovar com Exceção Justificada' : 'Aprovar e Classificar como Pronto para Auditoria'}</span>
                  </button>
                </div>
              </div>

              {/* Registro do Validador se já aprovado */}
              {preparacao.validadoPorNome && (
                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <span>Validação registrada por: <strong>{preparacao.validadoPorNome}</strong></span>
                  <span>Data: <strong>{preparacao.validadoEm}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* ÁREA A: IDENTIFICAÇÃO E TEXTO ORIGINAL                           */}
          {/* ================================================================ */}
          {activeArea === 'identificacao' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Código e Título:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preparacao.requisitoId}</span>
                  <p className="text-slate-600 dark:text-slate-400">{preparacao.tituloRequisito}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Fonte / Norma / Revisão:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preparacao.autoridadeOuCliente}</span>
                  <p className="text-slate-600 dark:text-slate-400">{preparacao.normaDocumento} ({preparacao.revisaoFonte})</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Critério Canônico Relacionado:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preparacao.criterioCanonicoId || 'N/A'}</span>
                  <p className="text-slate-600 dark:text-slate-400">{preparacao.criterioCanonicoTitulo}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Controle Central do SGQ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preparacao.controleCentralCodigo || preparacao.controleCentralId}</span>
                  <p className="text-slate-600 dark:text-slate-400">{preparacao.controleCentralNome}</p>
                </div>
              </div>

              {/* Texto Original Ipsis Litteris */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Texto Original do Requisito (Ipsis Litteris da Fonte Oficial):
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-800 dark:text-slate-200 leading-relaxed italic">
                  "{preparacao.textoOriginal}"
                </div>
              </div>

              {/* Aplicabilidade e Conformidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Situação de Aplicabilidade na IMPACTO:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preparacao.aplicabilidade}</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">{preparacao.justificativaAplicabilidade || 'Sem justificativa cadastrada'}</p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Situação de Conformidade SGQ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{preparacao.conformidadeSGQ}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer do Modal */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>Última atualização: {new Date(preparacao.updatedAt).toLocaleString('pt-BR')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
