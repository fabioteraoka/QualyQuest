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
  Camera,
  Upload,
  UploadCloud,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  BookOpen,
  ArrowRight,
  FileCheck2,
  Sliders,
  Eye,
  RefreshCw,
  Plus,
  Zap,
  Tag,
  Info,
  ChevronDown,
  History
} from 'lucide-react';
import {
  ClienteExterno,
  BaseEstacaoOperacao,
  ProgramaChecklistCliente,
  ControleCentralSGQ,
  RequisitoClienteItem,
  AvaliacaoRequisitoCliente,
  ResultadoAvaliacaoRequisito,
  UserProfile,
  OrganizationRecord,
  NCRecord,
  FerramentaCalibracao,
  RegistroTreinamentoColaborador,
  DocumentoControlado,
  Person,
  EvidenciaRequisitoItem,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria
} from '../types';
import {
  executarAuditoriaInteligenteRequisito,
  calcularResumoAuditoriaPorExcecao,
  ResultadoAvaliacaoInteligenteItem
} from '../services/smartAuditEngine';
import { SmartAuditPreparationView } from './smart-audit/SmartAuditPreparationView';
import { SmartAuditHistoryView } from './smart-audit/SmartAuditHistoryView';
import { SmartAuditInternalLessonsView } from './smart-audit/SmartAuditInternalLessonsView';
import { SmartAuditImportView } from './smart-audit/SmartAuditImportView';
import { AuditRequirementsListView } from './smart-audit/AuditRequirementsListView';
import { RequisitoAuditoriaExterna } from '../types/auditRequirements';

interface SmartAuditViewProps {
  clientes: ClienteExterno[];
  bases: BaseEstacaoOperacao[];
  programas: ProgramaChecklistCliente[];
  controles: ControleCentralSGQ[];
  requisitos: RequisitoClienteItem[];
  avaliacoes: AvaliacaoRequisitoCliente[];
  ferramentas: FerramentaCalibracao[];
  treinamentos: RegistroTreinamentoColaborador[];
  documentos: DocumentoControlado[];
  pessoas: Person[];
  activeOrganization?: OrganizationRecord | null;
  userProfile?: UserProfile | null;
  onSaveAvaliacao: (avaliacao: Partial<AvaliacaoRequisitoCliente>) => Promise<void>;
  onCriarRNCDeRequisito?: (rncPayload: Partial<NCRecord>) => void;
  onNavigateToTab?: (tab: string) => void;

  // Integração com módulos oficiais para Fluxos A e B
  audits?: AuditoriaExternaRecord[];
  findings?: ConstatacaoExternaRecord[];
  lessons?: LicaoAprendidaAuditoria[];
  rncs?: NCRecord[];
  onSaveAudit?: (audit: AuditoriaExternaRecord) => Promise<void>;
  onSaveFinding?: (finding: ConstatacaoExternaRecord) => Promise<void>;
  onSaveLesson?: (lesson: LicaoAprendidaAuditoria) => Promise<void>;
  onSaveRequirement?: (req: RequisitoClienteItem) => Promise<void>;
  onSaveProgram?: (prog: ProgramaChecklistCliente) => Promise<void>;
  auditRequirements?: RequisitoAuditoriaExterna[];
  onSaveAuditRequirement?: (req: RequisitoAuditoriaExterna) => Promise<void>;
  onSaveAuditRequirementsBatch?: (reqs: RequisitoAuditoriaExterna[]) => Promise<void>;
}

export const SmartAuditView: React.FC<SmartAuditViewProps> = ({
  clientes = [],
  bases = [],
  programas = [],
  controles = [],
  requisitos = [],
  avaliacoes = [],
  ferramentas = [],
  treinamentos = [],
  documentos = [],
  pessoas = [],
  activeOrganization,
  userProfile,
  onSaveAvaliacao,
  onCriarRNCDeRequisito,
  onNavigateToTab,
  audits = [],
  findings = [],
  lessons = [],
  rncs = [],
  onSaveAudit,
  onSaveFinding,
  onSaveLesson,
  onSaveRequirement,
  onSaveProgram,
  auditRequirements = [],
  onSaveAuditRequirement,
  onSaveAuditRequirementsBatch,
}) => {
  // Navigation & Filtering State
  const [activeMode, setActiveMode] = useState<
    'EXCECOES' | 'PREPARACAO' | 'HISTORICO' | 'APRENDIZADO' | 'TODOS' | 'MATURIDADE' | 'IMPORTAR' | 'REQUISITOS_AUDITORIA'
  >('EXCECOES');
  const [selectedCliente, setSelectedCliente] = useState<string>('TODOS');
  const [selectedBase, setSelectedBase] = useState<string>('BASE-SOD');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Photo & Evidence Upload Modal
  const [evidenceModalItem, setEvidenceModalItem] = useState<ResultadoAvaliacaoInteligenteItem | null>(null);
  const [evidencePhotoBase64, setEvidencePhotoBase64] = useState<string>('');
  const [evidenceTitle, setEvidenceTitle] = useState<string>('');
  const [evidenceRef, setEvidenceRef] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<'FOTO' | 'DOCUMENTO' | 'CERTIFICADO_CALIBRACAO'>('FOTO');
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);

  // Resolution Suggestion Modal / Edit
  const [editingSuggestionItem, setEditingSuggestionItem] = useState<ResultadoAvaliacaoInteligenteItem | null>(null);
  const [editedResponseText, setEditedResponseText] = useState<string>('');

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Base selecionada
  const currentBaseObj = useMemo(() => {
    return bases.find((b) => b.id === selectedBase) || bases[0] || { id: 'BASE-SOD', codigo: 'SOD', nome: 'Sorocaba' };
  }, [bases, selectedBase]);

  // Executa avaliação automática em todos os requisitos para a base selecionada com dados oficiais
  const avaliacoesCalculadas = useMemo(() => {
    return requisitos.map((req) => {
      const ctrl = controles.find((c) => c.id === req.controleCentralId || c.codigo === req.controleCentralCodigo);
      const res = executarAuditoriaInteligenteRequisito(req, ctrl, {
        ferramentas,
        treinamentos,
        documentos,
        pessoas,
        rncs,
        audits,
        findings,
        lessons,
        baseCodigo: currentBaseObj.codigo,
      });

      // Se já houver avaliação humana salva no Firestore, prioriza ela
      const salva = avaliacoes.find((a) => a.requisitoId === req.id && (a.baseId === selectedBase || a.baseCodigo === currentBaseObj.codigo));
      if (salva) {
        return {
          ...res,
          resultado: salva.resultado,
          justificativaConclusao: salva.justificativa || res.justificativaConclusao,
          isExcecao: salva.resultado === 'NAO_CONFORME' || salva.resultado === 'ATENCAO' || salva.resultado === 'VERIFICACAO_NECESSARIA',
          evidenciasIdentificadas: salva.evidencias && salva.evidencias.length > 0 ? salva.evidencias : res.evidenciasIdentificadas,
          perguntaInteligente: salva.perguntaInteligente || res.perguntaInteligente,
          sugestaoResolucao: salva.sugestaoResolucao || res.sugestaoResolucao,
        };
      }
      return res;
    });
  }, [requisitos, controles, ferramentas, treinamentos, documentos, pessoas, rncs, audits, findings, lessons, currentBaseObj, selectedBase, avaliacoes]);

  // Resumo estatístico
  const resumo = useMemo(() => {
    return calcularResumoAuditoriaPorExcecao(avaliacoesCalculadas);
  }, [avaliacoesCalculadas]);

  // Filtragem dos itens exibidos
  const itensExibidos = useMemo(() => {
    return avaliacoesCalculadas.filter((item) => {
      // Filtro de Cliente
      if (selectedCliente !== 'TODOS') {
        if (item.requisito.clienteId !== selectedCliente && item.requisito.clienteNome !== selectedCliente) {
          return false;
        }
      }

      // Filtro de Modo
      if (activeMode === 'EXCECOES' && !item.isExcecao) {
        return false;
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = item.requisito.numeroItem.toLowerCase().includes(term);
        const matchTitle = item.requisito.tituloCurto.toLowerCase().includes(term);
        const matchText = item.requisito.textoOriginal.toLowerCase().includes(term);
        const matchClient = item.requisito.clienteNome.toLowerCase().includes(term);
        if (!matchNum && !matchTitle && !matchText && !matchClient) {
          return false;
        }
      }

      return true;
    });
  }, [avaliacoesCalculadas, selectedCliente, activeMode, searchTerm]);

  // Handlers para Perguntas Inteligentes
  const handleAnswerQuestion = async (
    item: ResultadoAvaliacaoInteligenteItem,
    resposta: 'SIM' | 'NAO'
  ) => {
    if (!item.perguntaInteligente) return;
    const isSim = resposta === 'SIM';
    const acao = isSim ? item.perguntaInteligente.acaoSimTipo : item.perguntaInteligente.acaoNaoTipo;

    let novoResultado: ResultadoAvaliacaoRequisito = item.resultado;
    let novaJustificativa = `${item.justificativaConclusao} [Ação do Auditor: Escolha "${isSim ? item.perguntaInteligente.opcaoSim : item.perguntaInteligente.opcaoNao}"]`;

    if (isSim) {
      if (acao === 'ANEXAR_CERTIFICADO') {
        // Abre modal para anexar certificado/foto
        setEvidenceModalItem(item);
        setEvidenceTitle(`Certificado/Evidência: ${item.requisito.numeroItem}`);
        setEvidenceType('CERTIFICADO_CALIBRACAO');
        return;
      }
      novoResultado = 'CONFORME';
    } else {
      if (acao === 'REGISTRAR_SEGREGAÇÃO' || acao === 'ABRIR_RNC') {
        novoResultado = 'NAO_CONFORME';
        if (onCriarRNCDeRequisito) {
          onCriarRNCDeRequisito({
            origemDetectada: 'AUDITORIA_INTERNA',
            numeroFormulario: 'F 001-29',
            revisaoFormulario: '00',
            dataEmissaoFormulario: '02/09/2025',
            processoSetor: 'Manutenção de Linha / Pátio',
            aeronaveAplicavel: 'B747-400F / B777F',
            responsavelEmissao: userProfile?.displayName || 'Auditor SGQ',
            descricaoDetalhadaNaoConformidade: `Não conformidade gerada a partir da auditoria de cliente ${item.requisito.clienteNome} (${item.requisito.numeroItem} - ${item.requisito.tituloCurto}): ${item.justificativaConclusao}`,
            requisitoDescumprido: `${item.requisito.numeroItem} - ${item.requisito.textoOriginal}`,
            evidenciasObjetivas: (item.evidenciasIdentificadas || []).map((e) => `${e.titulo} (${e.numeroReferencia || ''})`).join('; ') || 'Registro de auditoria interna',
            acaoImediataContencao: item.sugestaoResolucao?.sugestaoAcao || 'Segregação física imediata e abertura de RNC.',
            statusGeral: 'REGISTRADA',
          });
          showNotification('info', 'RNC F 001-29 aberta e pré-preenchida com sucesso!');
        }
      }
    }

    const payload: Partial<AvaliacaoRequisitoCliente> = {
      organizationId: activeOrganization?.id || 'org_impacto_aviation',
      clienteId: item.requisito.clienteId,
      clienteNome: item.requisito.clienteNome,
      programaId: item.requisito.programaId,
      programaCodigo: item.requisito.programaCodigo,
      requisitoId: item.requisito.id,
      numeroItem: item.requisito.numeroItem,
      tituloRequisito: item.requisito.tituloCurto,
      baseId: currentBaseObj.id,
      baseCodigo: currentBaseObj.codigo,
      baseNome: currentBaseObj.nome,
      dataAvaliacao: new Date().toISOString().split('T')[0],
      resultado: novoResultado,
      metodoVerificacao: item.requisito.metodoVerificacao,
      justificativa: novaJustificativa,
      isExcecao: novoResultado === 'NAO_CONFORME' || novoResultado === 'ATENCAO' || novoResultado === 'VERIFICACAO_NECESSARIA',
      perguntaInteligente: {
        ...item.perguntaInteligente,
        respondida: true,
        respostaEscolhida: resposta,
        respondidoPor: userProfile?.displayName || 'Auditor SGQ',
        respondidoEm: new Date().toISOString(),
      },
      avaliadorUid: userProfile?.uid || 'user_sgq',
      avaliadorNome: userProfile?.displayName || 'Auditor SGQ',
      evidencias: item.evidenciasIdentificadas,
      historicoAlteracoes: [
        {
          dataHora: new Date().toISOString(),
          usuarioUid: userProfile?.uid || 'user_sgq',
          usuarioNome: userProfile?.displayName || 'Auditor SGQ',
          acao: `Resposta à Pergunta Inteligente: ${resposta}`,
          resultadoAnterior: item.resultado,
          resultadoNovo: novoResultado,
        },
      ],
    };

    await onSaveAvaliacao(payload);
    showNotification('success', `Item ${item.requisito.numeroItem} atualizado para ${novoResultado}.`);
  };

  // Salvar Evidência Fotográfica ou Documental
  const handleSaveEvidence = async () => {
    if (!evidenceModalItem) return;
    setUploadingEvidence(true);

    try {
      const novaEvidencia: EvidenciaRequisitoItem = {
        id: `EVID-${Date.now()}`,
        tipo: evidenceType,
        titulo: evidenceTitle || `Evidência ${evidenceType} - ${evidenceModalItem.requisito.numeroItem}`,
        numeroReferencia: evidenceRef || `REF-${Date.now().toString().slice(-6)}`,
        dataEvidencia: new Date().toISOString().split('T')[0],
        responsavel: userProfile?.displayName || 'Auditor SGQ',
        organizationId: activeOrganization?.id || 'org_impacto_aviation',
        clienteId: evidenceModalItem.requisito.clienteId,
        clienteNome: evidenceModalItem.requisito.clienteNome,
        programaId: evidenceModalItem.requisito.programaId,
        requisitoId: evidenceModalItem.requisito.id,
        numeroItem: evidenceModalItem.requisito.numeroItem,
        controleId: evidenceModalItem.controleUtilizado?.id,
        controleCodigo: evidenceModalItem.controleUtilizado?.codigo,
        usuarioUid: userProfile?.uid || 'user_sgq',
        usuarioNome: userProfile?.displayName || 'Auditor SGQ',
        fotoBase64: evidencePhotoBase64 || undefined,
      };

      const evidenciasAtuais = evidenceModalItem.evidenciasIdentificadas || [];
      const listaAtualizada = [...evidenciasAtuais, novaEvidencia];

      const payload: Partial<AvaliacaoRequisitoCliente> = {
        organizationId: activeOrganization?.id || 'org_impacto_aviation',
        clienteId: evidenceModalItem.requisito.clienteId,
        clienteNome: evidenceModalItem.requisito.clienteNome,
        programaId: evidenceModalItem.requisito.programaId,
        programaCodigo: evidenceModalItem.requisito.programaCodigo,
        requisitoId: evidenceModalItem.requisito.id,
        numeroItem: evidenceModalItem.requisito.numeroItem,
        tituloRequisito: evidenceModalItem.requisito.tituloCurto,
        baseId: currentBaseObj.id,
        baseCodigo: currentBaseObj.codigo,
        baseNome: currentBaseObj.nome,
        dataAvaliacao: new Date().toISOString().split('T')[0],
        resultado: 'CONFORME', // Evidência anexada resolve a exceção
        metodoVerificacao: evidenceModalItem.requisito.metodoVerificacao,
        justificativa: `Conformidade comprovada documentalmente através da evidência "${novaEvidencia.titulo}" adicionada em ${novaEvidencia.dataEvidencia}.`,
        isExcecao: false,
        evidencias: listaAtualizada,
        avaliadorUid: userProfile?.uid || 'user_sgq',
        avaliadorNome: userProfile?.displayName || 'Auditor SGQ',
        historicoAlteracoes: [
          {
            dataHora: new Date().toISOString(),
            usuarioUid: userProfile?.uid || 'user_sgq',
            usuarioNome: userProfile?.displayName || 'Auditor SGQ',
            acao: `Evidência ${evidenceType} anexada`,
            resultadoAnterior: evidenceModalItem.resultado,
            resultadoNovo: 'CONFORME',
          },
        ],
      };

      await onSaveAvaliacao(payload);
      showNotification('success', `Evidência anexada e item ${evidenceModalItem.requisito.numeroItem} marcado como CONFORME!`);
      setEvidenceModalItem(null);
      setEvidencePhotoBase64('');
      setEvidenceTitle('');
      setEvidenceRef('');
    } catch (err: any) {
      showNotification('error', `Erro ao salvar evidência: ${err.message}`);
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Aceitar Sugestão de Resolução IA
  const handleAcceptSuggestion = async (
    item: ResultadoAvaliacaoInteligenteItem,
    statusDecisao: 'ACEITO' | 'REJEITADO' | 'EDITADO',
    textoPersonalizado?: string
  ) => {
    if (!item.sugestaoResolucao) return;

    const payload: Partial<AvaliacaoRequisitoCliente> = {
      organizationId: activeOrganization?.id || 'org_impacto_aviation',
      clienteId: item.requisito.clienteId,
      clienteNome: item.requisito.clienteNome,
      programaId: item.requisito.programaId,
      programaCodigo: item.requisito.programaCodigo,
      requisitoId: item.requisito.id,
      numeroItem: item.requisito.numeroItem,
      tituloRequisito: item.requisito.tituloCurto,
      baseId: currentBaseObj.id,
      baseCodigo: currentBaseObj.codigo,
      baseNome: currentBaseObj.nome,
      dataAvaliacao: new Date().toISOString().split('T')[0],
      resultado: item.resultado,
      metodoVerificacao: item.requisito.metodoVerificacao,
      justificativa: textoPersonalizado || item.sugestaoResolucao.sugestaoRespostaCliente,
      sugestaoResolucao: {
        ...item.sugestaoResolucao,
        statusDecisao,
        respostaEditada: textoPersonalizado,
        decididoPor: userProfile?.displayName || 'Auditor SGQ',
        decididoEm: new Date().toISOString(),
      },
      avaliadorUid: userProfile?.uid || 'user_sgq',
      avaliadorNome: userProfile?.displayName || 'Auditor SGQ',
      evidencias: item.evidenciasIdentificadas,
      historicoAlteracoes: [
        {
          dataHora: new Date().toISOString(),
          usuarioUid: userProfile?.uid || 'user_sgq',
          usuarioNome: userProfile?.displayName || 'Auditor SGQ',
          acao: `Decisão de Resolução: ${statusDecisao}`,
          resultadoNovo: item.resultado,
        },
      ],
    };

    await onSaveAvaliacao(payload);
    showNotification('success', `Decisão registrada para o item ${item.requisito.numeroItem}.`);
    setEditingSuggestionItem(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header com Identidade Visual Aeronáutica */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-900/60 text-sky-400 border border-sky-700/50 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                FASE 15 — AUDITORIA INTELIGENTE POR REQUISITOS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                Resolução por Exceção
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Auditoria Inteligente por Requisitos & Cockpit de Exceções
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1">
              Avaliação automatizada contra os controles internos do QualiGest. O sistema analisa ferramentas, treinamentos e documentos existentes,
              resolve o que já possui evidência e apresenta <strong>somente as exceções pendentes de ação humana</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setActiveMode('IMPORTAR');
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              Importar Novo Checklist (IA)
            </button>
            <button
              onClick={() => onNavigateToTab?.('system-designer')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              System Designer
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Base Operacional */}
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span className="text-slate-400">Base Ativa:</span>
              <select
                value={selectedBase}
                onChange={(e) => setSelectedBase(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {bases.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.codigo} - {b.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Cliente */}
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Cliente:</span>
              <select
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="TODOS" className="bg-slate-900 text-white">Todos os Clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Busca por Texto */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar requisito ou controle..."
                className="bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 w-56"
              />
            </div>
          </div>

          {/* Seletor de Modo de Exibição 2.0 */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs flex-wrap">
            <button
              onClick={() => setActiveMode('EXCECOES')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === 'EXCECOES'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Cockpit de Exceções ({resumo.totalExcecoes})
            </button>
            <button
              onClick={() => setActiveMode('PREPARACAO')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === 'PREPARACAO'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              Preparação Inteligente (Fluxo B)
            </button>
            <button
              onClick={() => setActiveMode('HISTORICO')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === 'HISTORICO'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 text-purple-400" />
              Memória Histórica (Fluxo A)
            </button>
            <button
              onClick={() => setActiveMode('APRENDIZADO')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeMode === 'APRENDIZADO'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Aprendizado Interno
            </button>
            <button
              onClick={() => setActiveMode('TODOS')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeMode === 'TODOS'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Todos ({resumo.totalRequisitos})
            </button>
            <button
              onClick={() => setActiveMode('MATURIDADE')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeMode === 'MATURIDADE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Maturidade
            </button>
            <button
              onClick={() => setActiveMode('REQUISITOS_AUDITORIA')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === 'REQUISITOS_AUDITORIA'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-900 text-amber-300 hover:text-white border border-amber-500/30'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Requisitos / Checklists ({auditRequirements.length})</span>
            </button>
            <button
              onClick={() => setActiveMode('IMPORTAR')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeMode === 'IMPORTAR'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-900 text-sky-400 hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Smart Import Real
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Métricas de Resolução por Exceção */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Total Requisitos</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{resumo.totalRequisitos}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Em escopo da base {currentBaseObj.codigo}</div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-4">
          <div className="text-xs text-emerald-400 flex items-center justify-between font-medium">
            <span>🟢 Conformes</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{resumo.totalConformes}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Evidências automáticas comprovadas</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>⚪ Não Aplicáveis</span>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-300 mt-1">{resumo.totalNaoAplicaveis}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Fora do escopo local</div>
        </div>

        <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-4">
          <div className="text-xs text-amber-400 flex items-center justify-between font-medium">
            <span>🟡 Atenção</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{resumo.totalAtencao}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">Vencendo &lt; 30d ou parcial</div>
        </div>

        <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-4">
          <div className="text-xs text-rose-400 flex items-center justify-between font-medium">
            <span>🔴 Não Conformes</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{resumo.totalNaoConformes}</div>
          <div className="text-[11px] text-rose-500/80 mt-0.5">Desvios objetivos identificados</div>
        </div>

        <div className="bg-slate-900/90 border border-sky-900/40 rounded-xl p-4">
          <div className="text-xs text-sky-400 flex items-center justify-between font-medium">
            <span>🔵 Verificação</span>
            <Camera className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-300 mt-1">{resumo.totalVerificacaoNecessaria}</div>
          <div className="text-[11px] text-sky-500/80 mt-0.5">Requer foto física de pátio/hangar</div>
        </div>
      </div>

      {/* Banner de Eficiência por Exceção */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {resumo.percentualAutomatizado}% da Auditoria Resolvida por Dados Preexistentes
            </div>
            <div className="text-xs text-slate-400">
              De {resumo.totalRequisitos} requisitos auditados, {resumo.totalResolvidosAutomaticamente} foram comprovados automaticamente. Restam apenas <strong>{resumo.totalExcecoes} itens</strong> para intervenção do auditor.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            Tempo estimado economizado: ~14h
          </span>
        </div>
      </div>

      {/* VISÃO: EXCEÇÕES OU TODOS OS REQUISITOS */}
      {(activeMode === 'EXCECOES' || activeMode === 'TODOS') && (
        <div className="space-y-4">
          {itensExibidos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">Nenhuma Exceção Pendente!</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                Todos os requisitos auditados para esta base operacional foram comprovados documentalmente e atendem aos critérios de conformidade.
              </p>
              <button
                onClick={() => setActiveMode('TODOS')}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Visualizar Todos os Requisitos
              </button>
            </div>
          ) : (
            itensExibidos.map((item) => {
              const req = item.requisito;
              const isException = item.isExcecao;

              return (
                <div
                  key={req.id}
                  className={`bg-slate-900 border rounded-2xl p-5 transition-all ${
                    item.resultado === 'NAO_CONFORME'
                      ? 'border-rose-800/60 hover:border-rose-600/80 shadow-lg shadow-rose-950/20'
                      : item.resultado === 'ATENCAO'
                      ? 'border-amber-800/60 hover:border-amber-600/80 shadow-lg shadow-amber-950/20'
                      : item.resultado === 'VERIFICACAO_NECESSARIA'
                      ? 'border-sky-800/60 hover:border-sky-600/80 shadow-lg shadow-sky-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Topo do Card: Badge do Item + Cliente + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-sm text-sky-400 bg-sky-950/80 border border-sky-800/60 px-2.5 py-0.5 rounded-lg">
                        {req.numeroItem}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {req.clienteNome}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {req.programaCodigo}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {req.categoria || 'Geral'}
                      </span>
                      {req.criticidade && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            req.criticidade === 'CRITICO'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {req.criticidade}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                          item.resultado === 'CONFORME'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : item.resultado === 'NAO_CONFORME'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : item.resultado === 'ATENCAO'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : item.resultado === 'VERIFICACAO_NECESSARIA'
                            ? 'bg-sky-950/80 text-sky-300 border border-sky-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.resultado === 'CONFORME' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {item.resultado === 'NAO_CONFORME' && <AlertCircle className="w-3.5 h-3.5" />}
                        {item.resultado === 'ATENCAO' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.resultado === 'VERIFICACAO_NECESSARIA' && <Camera className="w-3.5 h-3.5" />}
                        {item.resultado.replace('_', ' ')}
                      </span>

                      <span className="text-[11px] font-mono text-slate-500">
                        Confiança: {item.confiancaScore}%
                      </span>
                    </div>
                  </div>

                  {/* Descrição do Requisito */}
                  <div className="mt-3">
                    <h4 className="text-base font-bold text-white">{req.tituloCurto}</h4>
                    <p className="text-sm text-slate-300 mt-1 italic bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                      "{req.textoOriginal}"
                    </p>
                  </div>

                  {/* Conclusão Automática & Controle Utilizado */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        Conclusão do Motor de Regras:
                      </div>
                      <p className="text-slate-400 leading-relaxed">{item.justificativaConclusao}</p>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Fonte: <span className="text-slate-400 font-medium">{item.fonteDados}</span> ({item.dataEvidencia})
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        Controle Central Relacionado ("Um Controle → Vários Requisitos"):
                      </div>
                      {item.controleUtilizado ? (
                        <div>
                          <div className="text-emerald-300 font-medium">
                            {item.controleUtilizado.codigo} — {item.controleUtilizado.nome}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{item.controleUtilizado.descricao}</p>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Módulo: <span className="font-mono">{item.controleUtilizado.moduloOrigem}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic">
                          Nenhum controle central associado. O requisito depende de verificação direta.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evidências Identificadas */}
                  {item.evidenciasIdentificadas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-sky-400" />
                        Evidências Auditáveis Vinculadas ({item.evidenciasIdentificadas.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.evidenciasIdentificadas.map((ev, evIdx) => (
                          <div
                            key={ev.id || evIdx}
                            className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                          >
                            <Tag className="w-3 h-3 text-sky-400" />
                            <span className="text-slate-200 font-medium">{ev.titulo}</span>
                            {ev.numeroReferencia && (
                              <span className="text-slate-500 font-mono text-[10px]">
                                ({ev.numeroReferencia})
                              </span>
                            )}
                            {ev.fotoBase64 && (
                              <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded text-[10px]">
                                Foto Anexa
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BLOCÃO DE EXCEÇÃO: Perguntas Inteligentes + Ações Rápidas */}
                  {isException && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                      {/* Pergunta Inteligente Orientada à Resolução */}
                      {item.perguntaInteligente && (
                        <div className="bg-slate-950 border border-sky-900/50 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                              <HelpCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                                Pergunta Inteligente para Resolução da Exceção
                              </div>
                              <div className="text-sm font-semibold text-white mt-0.5">
                                {item.perguntaInteligente.pergunta}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {item.perguntaInteligente.contexto}
                              </div>

                              {/* Botões de Resolução Rápida */}
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => handleAnswerQuestion(item, 'SIM')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {item.perguntaInteligente.opcaoSim}
                                </button>
                                <button
                                  onClick={() => handleAnswerQuestion(item, 'NAO')}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  {item.perguntaInteligente.opcaoNao}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sugestão de Resolução IA + Proposta de Resposta ao Cliente */}
                      {item.sugestaoResolucao && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                              Plano de Resolução Sugerido & Resposta Formal ao Cliente
                            </span>
                            {item.sugestaoResolucao.statusDecisao && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-purple-300 uppercase">
                                {item.sugestaoResolucao.statusDecisao}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                            <div>
                              <strong className="text-slate-400">O que está faltando:</strong> {item.sugestaoResolucao.oQueFalta}
                            </div>
                            <div>
                              <strong className="text-slate-400">Impacto regulatório:</strong> {item.sugestaoResolucao.porQueImpedeConformidade}
                            </div>
                            <div>
                              <strong className="text-slate-400">Ação recomendada:</strong> {item.sugestaoResolucao.sugestaoAcao}
                            </div>
                            <div>
                              <strong className="text-slate-400">Procedimento SGQ:</strong> {item.sugestaoResolucao.procedimentoRelacionado}
                            </div>
                          </div>

                          {/* Resposta Formal ao Cliente */}
                          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 mt-2">
                            <div className="text-[11px] text-slate-400 font-semibold mb-1">
                              Sugestão de Resposta Formal para o Auditor/Cliente:
                            </div>
                            <p className="text-slate-200 italic font-mono text-[11px]">
                              "{item.sugestaoResolucao.sugestaoRespostaCliente}"
                            </p>
                          </div>

                          {/* Botões de Decisão Humana (Human-in-the-Loop) */}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={() => {
                                setEditingSuggestionItem(item);
                                setEditedResponseText(item.sugestaoResolucao?.sugestaoRespostaCliente || '');
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                            >
                              Editar Resposta
                            </button>
                            <button
                              onClick={() => handleAcceptSuggestion(item, 'REJEITADO')}
                              className="px-3 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-medium border border-rose-800/40"
                            >
                              Rejeitar
                            </button>
                            <button
                              onClick={() => handleAcceptSuggestion(item, 'ACEITO')}
                              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              Aceitar Sugestão
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botões de Ação Final no Card */}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEvidenceModalItem(item);
                              setEvidenceTitle(`Evidência Fotográfica - ${item.requisito.numeroItem}`);
                              setEvidenceType('FOTO');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-semibold border border-sky-800/60 flex items-center gap-1.5 transition-all"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Anexar Foto de Pátio/Hangar
                          </button>

                          <button
                            onClick={() => {
                              setEvidenceModalItem(item);
                              setEvidenceTitle(`Documento/Certificado - ${item.requisito.numeroItem}`);
                              setEvidenceType('DOCUMENTO');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Anexar Documento/Certificado
                          </button>
                        </div>

                        {item.resultado === 'NAO_CONFORME' && onCriarRNCDeRequisito && (
                          <button
                            onClick={() => {
                              onCriarRNCDeRequisito({
                                origemDetectada: 'AUDITORIA_INTERNA',
                                numeroFormulario: 'F 001-29',
                                revisaoFormulario: '00',
                                dataEmissaoFormulario: '02/09/2025',
                                processoSetor: 'Manutenção de Linha / Pátio',
                                aeronaveAplicavel: 'B747-400F / B777F',
                                responsavelEmissao: userProfile?.displayName || 'Auditor SGQ',
                                descricaoDetalhadaNaoConformidade: `Não conformidade gerada a partir da auditoria de cliente ${item.requisito.clienteNome} (${item.requisito.numeroItem} - ${item.requisito.tituloCurto}): ${item.justificativaConclusao}`,
                                requisitoDescumprido: `${item.requisito.numeroItem} - ${item.requisito.textoOriginal}`,
                                evidenciasObjetivas: (item.evidenciasIdentificadas || []).map((e) => `${e.titulo} (${e.numeroReferencia || ''})`).join('; ') || 'Registro de auditoria interna',
                                acaoImediataContencao: item.sugestaoResolucao?.sugestaoAcao || 'Segregação física imediata e abertura de RNC.',
                                statusGeral: 'REGISTRADA',
                              });
                              showNotification('info', 'RNC F 001-29 aberta e vinculada ao requisito!');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Criar RNC F 001-29 Imediata
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VISÃO: MATURIDADE SGQ ("Um Controle → Vários Requisitos") */}
      {activeMode === 'MATURIDADE' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Painel de Maturidade SGQ: "Um Controle Central → Múltiplos Requisitos"
            </h3>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Demonstração de como os controles centrais do QualiGest atendem transversalmente diferentes clientes aéreos, eliminando redundâncias
              e garantindo que uma única calibração ou treinamento comprove conformidade perante Atlas, Kalitta, SWISS e novos contratantes.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Controle Central SGQ</th>
                    <th className="py-3 px-4">Módulo de Origem</th>
                    <th className="py-3 px-4">Requisitos de Clientes Cobertos</th>
                    <th className="py-3 px-4">Clientes Atendidos</th>
                    <th className="py-3 px-4">Status de Cobertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {controles.map((ctrl) => {
                    const reqsAtendidos = requisitos.filter(
                      (r) => r.controleCentralId === ctrl.id || r.controleCentralCodigo === ctrl.codigo
                    );
                    const clientesIds = Array.from(new Set(reqsAtendidos.map((r) => r.clienteNome)));

                    return (
                      <tr key={ctrl.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{ctrl.codigo}</div>
                          <div className="text-slate-400">{ctrl.nome}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {ctrl.moduloOrigem}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-sky-400">{reqsAtendidos.length} requisitos</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {clientesIds.map((cNome) => (
                              <span key={cNome} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                                {cNome}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                            100% Unificado
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISÃO: PREPARAÇÃO INTELIGENTE DE AUDITORIA (FLUXO B) */}
      {activeMode === 'PREPARACAO' && (
        <SmartAuditPreparationView
          itens={itensExibidos}
          documentos={documentos}
          currentBaseCodigo={currentBaseObj.codigo}
          onAnswerQuestion={handleAnswerQuestion}
          onAcceptSuggestion={handleAcceptSuggestion}
          onOpenEvidenceModal={(item, tipo) => {
            setEvidenceModalItem(item);
            setEvidenceTitle(`Evidência ${tipo} - ${item.requisito.numeroItem}`);
            setEvidenceType(tipo === 'FOTO' ? 'FOTO' : 'DOCUMENTO');
          }}
          onOpenRNCModal={(item) => {
            if (onCriarRNCDeRequisito) {
              onCriarRNCDeRequisito({
                origemDetectada: 'AUDITORIA_INTERNA',
                numeroFormulario: 'F 001-29',
                revisaoFormulario: '00',
                dataEmissaoFormulario: new Date().toISOString().split('T')[0],
                processoSetor: 'Manutenção de Linha / Pátio',
                aeronaveAplicavel: 'B747-400F / B777F',
                responsavelEmissao: userProfile?.displayName || 'Auditor SGQ',
                descricaoDetalhadaNaoConformidade: `Não conformidade gerada a partir da auditoria de cliente ${item.requisito.clienteNome} (${item.requisito.numeroItem} - ${item.requisito.tituloCurto}): ${item.justificativaConclusao}`,
                requisitoDescumprido: `${item.requisito.numeroItem} - ${item.requisito.textoOriginal}`,
                evidenciasObjetivas: (item.evidenciasIdentificadas || []).map((e) => `${e.titulo} (${e.numeroReferencia || ''})`).join('; ') || 'Registro de auditoria',
                acaoImediataContencao: item.sugestaoResolucao?.sugestaoAcao || 'Segregação física imediata e abertura de RNC.',
                statusGeral: 'REGISTRADA',
              });
              showNotification('info', 'RNC F 001-29 aberta e vinculada ao requisito!');
            }
          }}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* VISÃO: MEMÓRIA HISTÓRICA DE AUDITORIAS E CONSTATAÇÕES (FLUXO A) */}
      {activeMode === 'HISTORICO' && (
        <SmartAuditHistoryView
          audits={audits}
          findings={findings}
          rncs={rncs}
          userProfile={userProfile}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* VISÃO: APRENDIZADO PARA AUDITORIAS INTERNAS */}
      {activeMode === 'APRENDIZADO' && (
        <SmartAuditInternalLessonsView
          itens={avaliacoesCalculadas}
          lessons={lessons}
          userProfile={userProfile}
          onSaveLesson={onSaveLesson}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* VISÃO: REQUISITOS INDIVIDUALIZADOS DE AUDITORIAS E CHECKLISTS (FORM QA-14) */}
      {activeMode === 'REQUISITOS_AUDITORIA' && (
        <AuditRequirementsListView
          requirements={auditRequirements}
          audits={audits}
          userProfile={userProfile}
          rncs={rncs}
          onSaveRequirement={async (req) => {
            if (onSaveAuditRequirement) {
              await onSaveAuditRequirement(req);
            }
          }}
          onSaveBatchRequirements={onSaveAuditRequirementsBatch}
          onCriarRNC={onCriarRNCDeRequisito}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* VISÃO: SMART IMPORT REAL DE ARQUIVOS E AUDITORIAS */}
      {activeMode === 'IMPORTAR' && (
        <SmartAuditImportView
          existingAudits={audits}
          existingRequirements={requisitos}
          userProfile={userProfile}
          activeOrganization={activeOrganization}
          onSaveAudit={onSaveAudit}
          onSaveFinding={onSaveFinding}
          onSaveRequirement={onSaveRequirement}
          onSaveProgram={onSaveProgram}
          onSaveLesson={onSaveLesson}
          onSaveAuditRequirementsBatch={onSaveAuditRequirementsBatch}
          onImportComplete={() => {
            setActiveMode('REQUISITOS_AUDITORIA');
          }}
        />
      )}

      {/* MODAL DE ANEXAR FOTO OU DOCUMENTO COM RASTREABILIDADE */}
      {evidenceModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Anexar Evidência Auditável</h3>
              </div>
              <button onClick={() => setEvidenceModalItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rastreabilidade Obrigatória */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-300 uppercase tracking-wide text-[10px]">
                Cadeia de Rastreabilidade Aeronáutica
              </div>
              <div className="text-sky-300 font-mono text-[11px]">
                {evidenceModalItem.requisito.clienteNome} → {evidenceModalItem.requisito.programaCodigo} → Item {evidenceModalItem.requisito.numeroItem} → {evidenceModalItem.controleUtilizado?.codigo || 'SGQ'} → {currentBaseObj.codigo}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Título da Evidência</label>
                <input
                  type="text"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  placeholder="Ex: Foto dos cilindros no pátio com tranca / Certificado RBC nº 4921"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Número de Referência / Protocolo</label>
                <input
                  type="text"
                  value={evidenceRef}
                  onChange={(e) => setEvidenceRef(e.target.value)}
                  placeholder="Ex: RBC-2026-0994 / OS-2026-441"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Upload de Foto / Arquivo */}
              <div>
                <label className="text-slate-300 font-medium block mb-1">Upload da Imagem ou Arquivo</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-6 text-center bg-slate-950/60 cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEvidencePhotoBase64(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {evidencePhotoBase64 ? (
                    <div className="space-y-2">
                      <img
                        src={evidencePhotoBase64}
                        alt="Preview Evidência"
                        className="max-h-44 mx-auto rounded-lg border border-slate-700"
                      />
                      <div className="text-xs text-emerald-400 font-medium">Arquivo carregado com sucesso! Clique para trocar.</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Camera className="w-8 h-8 text-slate-500 mx-auto" />
                      <div className="text-sm font-semibold text-white">Clique para selecionar foto ou documento</div>
                      <div className="text-[11px] text-slate-500">Suporta JPG, PNG, PDF ou capturas de câmera de tablet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEvidenceModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEvidence}
                disabled={uploadingEvidence}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                {uploadingEvidence ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Salvar Evidência & Comprovar Item
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE RESPOSTA FORMAL AO AUDITOR */}
      {editingSuggestionItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Editar Resposta Formal ao Cliente</h3>
              <button onClick={() => setEditingSuggestionItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Requisito: <strong>{editingSuggestionItem.requisito.numeroItem} - {editingSuggestionItem.requisito.tituloCurto}</strong>
            </div>

            <textarea
              value={editedResponseText}
              onChange={(e) => setEditedResponseText(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSuggestionItem(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAcceptSuggestion(editingSuggestionItem, 'EDITADO', editedResponseText)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                Salvar Resposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
