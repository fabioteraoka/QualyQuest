import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  X,
  Building2,
  Calendar,
  Tag,
  Info,
  BookOpen,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Copy,
  ChevronDown,
  History,
  Link as LinkIcon,
  Wrench,
  Award,
  Sliders,
  Send,
  HelpCircle
} from 'lucide-react';
import {
  RequisitoAuditoriaExterna,
  SituacaoAtendimentoRequisito,
  EstadoAcompanhamentoRequisito,
  DecisaoOrganizacionalRequisito,
  SugestaoRespostaRequisitoIA,
} from '../../types/auditRequirements';
import { geminiClientCache } from '../../utils/geminiClientCache';
import {
  AuditoriaExternaRecord,
  UserProfile,
  NCRecord,
  EvidenciaAuditoriaItem
} from '../../types';

interface AuditRequirementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisito: RequisitoAuditoriaExterna | null;
  auditoria?: AuditoriaExternaRecord | null;
  userProfile?: UserProfile | null;
  rncs?: NCRecord[];
  onSaveRequirement: (requisito: RequisitoAuditoriaExterna) => Promise<void>;
  onCriarRNC?: (payload: Partial<NCRecord>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AuditRequirementDetailModal: React.FC<AuditRequirementDetailModalProps> = ({
  isOpen,
  onClose,
  requisito,
  auditoria,
  userProfile,
  rncs = [],
  onSaveRequirement,
  onCriarRNC,
  onNavigateToTab,
}) => {
  if (!isOpen || !requisito) return null;

  const [activeTab, setActiveTab] = useState<'avaliacao' | 'decisao' | 'resposta' | 'evidencias' | 'historico'>('avaliacao');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados editáveis
  const [situacao, setSituacao] = useState<SituacaoAtendimentoRequisito>(requisito.situacaoAtendimento);
  const [estado, setEstado] = useState<EstadoAcompanhamentoRequisito>(requisito.estadoAcompanhamento);
  const [prioridade, setPrioridade] = useState(requisito.prioridade || 'ALTA');
  const [setor, setSetor] = useState(requisito.setorResponsavel || 'Garantia da Qualidade / SGQ');
  const [responsavel, setResponsavel] = useState(requisito.responsavelInterno || userProfile?.displayName || '');
  const [prazo, setPrazo] = useState(requisito.prazo || '');
  const [acoes, setAcoes] = useState(requisito.acoesNecessarias || '');

  // Decisão Organizacional
  const [decisao, setDecisao] = useState<DecisaoOrganizacionalRequisito | undefined>(requisito.decisaoOrganizacional);
  const [justificativaDecisao, setJustificativaDecisao] = useState(requisito.justificativaDecisao || '');
  const [responsavelDecisao, setResponsavelDecisao] = useState(requisito.responsavelDecisao || userProfile?.displayName || '');
  const [impactoEsperado, setImpactoEsperado] = useState(requisito.impactosDecisao?.custoOuRecursoEstimado || '');
  const [reqRevisaoProc, setReqRevisaoProc] = useState(requisito.impactosDecisao?.requerRevisaoProcedimento || false);
  const [reqTreinamento, setReqTreinamento] = useState(requisito.impactosDecisao?.requerTreinamento || false);
  const [reqRecurso, setReqRecurso] = useState(requisito.impactosDecisao?.requerAquisicaoRecurso || false);
  const [reqRNC, setReqRNC] = useState(requisito.impactosDecisao?.requerRNC || false);
  const [reqAuditoriaInterna, setReqAuditoriaInterna] = useState(requisito.impactosDecisao?.requerAuditoriaInterna || false);

  // Resposta Oficial
  const [respostaOficial, setRespostaOficial] = useState(requisito.respostaOficialEnviada || '');
  const [statusAceitacao, setStatusAceitacao] = useState(requisito.statusAceitacaoAuditor || 'PENDENTE');
  const [parecerAuditor, setParecerAuditor] = useState(requisito.parecerAuditorExterno || '');

  // Assistência IA
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSugestao, setAiSugestao] = useState<SugestaoRespostaRequisitoIA | null>(requisito.sugestaoRespostaIA || null);

  // Vínculo com RNC
  const [selectedRncId, setSelectedRncId] = useState(requisito.rncId || '');

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Consultar Assistente IA via Endpoint
  const handleConsultarIA = async () => {
    setLoadingAi(true);
    const targetOrg = auditoria?.organizationId || (auditoria as any)?.orgId || 'org_impacto_aviation';
    const cacheKey = geminiClientCache.generateKey({
      organizationId: targetOrg,
      operation: 'assist-requirement-response',
      input: {
        reqItem: requisito.numeroItem,
        reqText: requisito.textoOriginal,
        norma: requisito.referenciaNormativa,
        auditNum: auditoria?.numeroAuditoria || requisito.numeroAuditoria,
      },
    });

    const cached = geminiClientCache.get<any>(cacheKey, targetOrg);
    if (cached) {
      setAiSugestao(cached);
      showToast('success', 'Sugestão recuperada do cache local instantâneo (0 RPM)');
      setLoadingAi(false);
      return;
    }

    try {
      const response = await fetch('/api/smart-audit/assist-requirement-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': targetOrg,
        },
        body: JSON.stringify({
          organizationId: targetOrg,
          requisito: {
            numeroItem: requisito.numeroItem,
            textoOriginal: requisito.textoOriginal,
            capituloOuSecao: requisito.capituloOuSecao,
            referenciaNormativa: requisito.referenciaNormativa,
          },
          auditoria: {
            numeroAuditoria: auditoria?.numeroAuditoria || requisito.numeroAuditoria,
            clienteOuEntidade: auditoria?.entidadeAuditora || requisito.clienteOuEntidade,
            escopo: auditoria?.escopo,
          },
          contexto: {
            baseCodigo: 'SOD',
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.sugestao) {
        setAiSugestao(data.sugestao);
        geminiClientCache.set(cacheKey, data.sugestao, 30 * 60 * 1000, targetOrg);
        showToast('success', 'Assistência inteligente gerada com base no acervo oficial QualiGest!');
      } else {
        throw new Error(data.error || 'Falha ao consultar assistente de IA');
      }
    } catch (err: any) {
      showToast('error', `Erro na assistência: ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  // Aplicar Sugestão à Resposta Oficial
  const handleApplySuggestion = () => {
    if (!aiSugestao) return;
    setRespostaOficial(aiSugestao.sugestaoRespostaPreliminar);
    setActiveTab('resposta');
    showToast('success', 'Sugestão copiada para a Resposta Oficial (você pode editar antes de enviar).');
  };

  // Salvar Alterações na Ficha do Requisito
  const handleSave = async () => {
    setSaving(true);
    try {
      const agora = new Date().toISOString();
      const userName = userProfile?.displayName || 'Usuário SGQ';
      const userUid = userProfile?.uid || 'anon';

      const novaTrilha = [
        ...(requisito.trilhaAuditoria || []),
        {
          dataHora: agora,
          usuarioUid: userUid,
          usuarioNome: userName,
          acao: 'MUDANCA_ATENDIMENTO' as const,
          detalhes: `Situação técnica atualizada para ${situacao}, estado: ${estado}, decisão: ${decisao || 'N/A'}.`,
        },
      ];

      const rncObj = rncs.find((r) => r.id === selectedRncId);

      const atualizado: RequisitoAuditoriaExterna = {
        ...requisito,
        situacaoAtendimento: situacao,
        estadoAcompanhamento: estado,
        prioridade,
        setorResponsavel: setor,
        responsavelInterno: responsavel,
        prazo,
        acoesNecessarias: acoes,
        decisaoOrganizacional: decisao,
        justificativaDecisao,
        responsavelDecisao,
        dataDecisao: decisao ? agora.split('T')[0] : undefined,
        impactosDecisao: {
          requerRevisaoProcedimento: reqRevisaoProc,
          requerTreinamento: reqTreinamento,
          requerAquisicaoRecurso: reqRecurso,
          requerRNC: reqRNC,
          requerAuditoriaInterna: reqAuditoriaInterna,
          custoOuRecursoEstimado: impactoEsperado,
        },
        respostaOficialEnviada: respostaOficial,
        statusAceitacaoAuditor: statusAceitacao as any,
        parecerAuditorExterno: parecerAuditor,
        sugestaoRespostaIA: aiSugestao || undefined,
        rncId: selectedRncId || undefined,
        rncNumero: rncObj?.numero || (selectedRncId ? `RNC-${selectedRncId.slice(-4)}` : undefined),
        trilhaAuditoria: novaTrilha,
        updatedAt: agora,
      };

      await onSaveRequirement(atualizado);
      showToast('success', 'Ficha do requisito atualizada com sucesso no SGQ!');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      showToast('error', `Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Abrir criação de RNC a partir do requisito
  const handleOpenRncCreation = () => {
    if (!onCriarRNC) return;
    onCriarRNC({
      origemDetectada: 'AUDITORIA_EXTERNA',
      processoSetor: setor || 'Manutenção e Operações',
      descricaoDetalhadaNaoConformidade: `Não conformidade identificada no requisito ${requisito.numeroItem} da auditoria ${requisito.numeroAuditoria} (${requisito.clienteOuEntidade}): ${requisito.textoOriginal}`,
      requisitoDescumprido: `${requisito.numeroItem} - ${requisito.referenciaNormativa || 'Checklist de Auditoria Externa'}`,
      statusGeral: 'REGISTRADA',
    });
    showToast('success', 'Formulário de RNC aberto com os dados do requisito pré-preenchidos.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 shrink-0 flex items-start justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                Item {requisito.numeroItem}
              </span>
              <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {requisito.capituloOuSecao}
              </span>
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                {requisito.clienteOuEntidade} • {requisito.numeroAuditoria}
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white leading-snug">
              {requisito.tituloCurto || `Requisito ${requisito.numeroItem}`}
            </h3>
            {requisito.referenciaNormativa && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Referência Normativa: <strong>{requisito.referenciaNormativa}</strong></span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação Toast */}
        {feedback && (
          <div className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Texto Original do Requisito */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 shrink-0">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Texto Original Integral da Pergunta / Requisito:
          </span>
          <p className="text-xs text-slate-900 font-medium bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed">
            {requisito.textoOriginal}
          </p>
          {requisito.campoRespostaOriginal && (
            <div className="mt-1.5 text-[11px] text-slate-500">
              Campo original de resposta: <strong className="text-slate-700">{requisito.campoRespostaOriginal}</strong>
            </div>
          )}
        </div>

        {/* Abas de Navegação Interna */}
        <div className="flex items-center gap-1 px-4 pt-2 bg-slate-100/70 border-b border-slate-200 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('avaliacao')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'avaliacao'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Atendimento & Acompanhamento</span>
          </button>

          <button
            onClick={() => setActiveTab('decisao')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'decisao'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Decisão Organizacional</span>
            {decisao && <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />}
          </button>

          <button
            onClick={() => setActiveTab('resposta')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'resposta'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Resposta & Assistente IA</span>
          </button>

          <button
            onClick={() => setActiveTab('evidencias')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'evidencias'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Evidências & RNC</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'historico'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trilha de Auditoria</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* ABA 1: ATENDIMENTO & ACOMPANHAMENTO */}
          {activeTab === 'avaliacao' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Situação de Atendimento Técnico */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Situação de Atendimento Técnico:</span>
                    <span className="text-[10px] text-slate-500">Conformidade objetiva</span>
                  </div>
                  <select
                    value={situacao}
                    onChange={(e) => setSituacao(e.target.value as SituacaoAtendimentoRequisito)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-xs focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="ATENDIDO">● ATENDIDO (Evidência suficiente e aplicável)</option>
                    <option value="PARCIALMENTE_ATENDIDO">● PARCIALMENTE ATENDIDO (Atendimento com lacunas)</option>
                    <option value="NAO_ATENDIDO">● NÃO ATENDIDO (Lacuna real identificada)</option>
                    <option value="NAO_APLICAVEL">● NÃO APLICÁVEL (Com justificativa documentada)</option>
                    <option value="EM_AVALIACAO">● EM AVALIAÇÃO (Análise preliminar em andamento)</option>
                    <option value="ATENDIMENTO_NAO_COMPROVADO">● ATENDIMENTO NÃO COMPROVADO (Indícios sem prova)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 italic">
                    Avalia se a empresa possui processos e registros em conformidade técnica com o requisito do auditor.
                  </p>
                </div>

                {/* Estado de Acompanhamento Administrativo */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Estado de Acompanhamento Administrativo:</span>
                    <span className="text-[10px] text-slate-500">Fluxo de trabalho</span>
                  </div>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as EstadoAcompanhamentoRequisito)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-xs focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="NAO_INICIADO">NÃO INICIADO</option>
                    <option value="EM_ANALISE">EM ANÁLISE</option>
                    <option value="AGUARDANDO_INFORMACAO">AGUARDANDO INFORMAÇÃO</option>
                    <option value="AGUARDANDO_IMPLEMENTACAO">AGUARDANDO IMPLEMENTAÇÃO</option>
                    <option value="EM_IMPLEMENTACAO">EM IMPLEMENTAÇÃO</option>
                    <option value="AGUARDANDO_EVIDENCIA">AGUARDANDO EVIDÊNCIA</option>
                    <option value="EM_VALIDACAO">EM VALIDAÇÃO</option>
                    <option value="CONCLUIDO">CONCLUÍDO</option>
                    <option value="SUSPENSO_CANCELADO">SUSPENSO / CANCELADO</option>
                  </select>
                  <p className="text-[11px] text-slate-500 italic">
                    Independente do atendimento técnico. Um item pode estar "Não Atendido" e simultaneamente "Em Implementação".
                  </p>
                </div>
              </div>

              {/* Responsáveis, Setor e Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Setor Responsável:</label>
                  <input
                    type="text"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Responsável Interno:</label>
                  <input
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Prioridade:</label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as any)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5 font-bold"
                  >
                    <option value="CRITICA">CRÍTICA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="BAIXA">BAIXA</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Prazo Limite:</label>
                  <input
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              {/* Ações Necessárias */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ações Necessárias / Observações Técnicas:</label>
                <textarea
                  value={acoes}
                  onChange={(e) => setAcoes(e.target.value)}
                  rows={3}
                  placeholder="Descreva as ações imediatas, investigações ou providências necessárias para sustentação do requisito..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs"
                />
              </div>
            </div>
          )}

          {/* ABA 2: DECISÃO ORGANIZACIONAL */}
          {activeTab === 'decisao' && (
            <div className="space-y-4 text-xs">
              <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-700" />
                  <h4 className="font-bold text-purple-900 text-sm">Decisão da Empresa sobre o Requisito</h4>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">
                  Permite à organização decidir estrategicamente o que fazer: implementar uma nova prática, elevar o nível de controle, manter como está ou justificar formalmente a não aplicabilidade.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Decisão Estratégica:</label>
                  <select
                    value={decisao || ''}
                    onChange={(e) => setDecisao((e.target.value || undefined) as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-xs focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">(Selecione a decisão da empresa...)</option>
                    <option value="MANTER_COMO_ESTA">● Manter como está (Já atendido, sem mudança imediata)</option>
                    <option value="IMPLEMENTAR">● Implementar (Não implementado, deve ser incorporado)</option>
                    <option value="MELHORAR">● Melhorar (Atendido, mas empresa decidiu elevar eficiência/controle)</option>
                    <option value="FORMALIZAR">● Formalizar (A prática existe, mas precisa ser documentada)</option>
                    <option value="AVALIAR_APLICABILIDADE">● Avaliar aplicabilidade (Necessário estudo antes de decidir)</option>
                    <option value="NAO_IMPLEMENTAR_NAO_APLICAVEL">● Não implementar / Não aplicável (Decisão fundamentada)</option>
                    <option value="AGUARDAR_DECISAO">● Aguardar decisão gerencial / contratual</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Responsável pela Decisão:</label>
                  <input
                    type="text"
                    value={responsavelDecisao}
                    onChange={(e) => setResponsavelDecisao(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justificativa e Fundamentação da Decisão:</label>
                <textarea
                  value={justificativaDecisao}
                  onChange={(e) => setJustificativaDecisao(e.target.value)}
                  rows={3}
                  placeholder="Fundamente os motivos técnicos, normativos ou gerenciais da decisão..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs"
                />
              </div>

              {/* Impactos Esperados */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Impactos Operacionais Decorrentes da Decisão:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqRevisaoProc}
                      onChange={(e) => setReqRevisaoProc(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Requer alteração de procedimento</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqTreinamento}
                      onChange={(e) => setReqTreinamento(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Requer treinamento da equipe</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqRecurso}
                      onChange={(e) => setReqRecurso(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Requer aquisição de ferramenta/recurso</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqRNC}
                      onChange={(e) => setReqRNC(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Requer abertura de RNC</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqAuditoriaInterna}
                      onChange={(e) => setReqAuditoriaInterna(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Requer verificação em auditoria interna</span>
                  </label>
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Estimativa de Recurso / Custo / Observações:</label>
                  <input
                    type="text"
                    value={impactoEsperado}
                    onChange={(e) => setImpactoEsperado(e.target.value)}
                    placeholder="Ex: Custo estimado de calibração RBC, 4 horas de treinamento para 6 técnicos, etc."
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: RESPOSTA OFICIAL & ASSISTENTE INTELIGENTE IA */}
          {activeTab === 'resposta' && (
            <div className="space-y-4 text-xs">
              
              {/* Assistente IA */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-4 rounded-xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="font-bold text-purple-900 text-sm">
                      Assistente Contextual de Resposta (IA & Acervo SGQ)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleConsultarIA}
                    disabled={loadingAi}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                    <span>{loadingAi ? 'Consultando Acervo...' : 'Consultar Acervo & Gerar Sugestão'}</span>
                  </button>
                </div>

                {aiSugestao ? (
                  <div className="space-y-3 pt-2">
                    <div className="bg-white p-3.5 rounded-lg border border-purple-100 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Interpretação e O que o Auditor Busca:
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          Confiança: {aiSugestao.grauConfianca}%
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {aiSugestao.interpretacaoLinguagemClara}
                      </p>
                      <p className="text-slate-600 text-[11px] pt-1">
                        <strong>Solicitação objetiva:</strong> {aiSugestao.oQueAuditorEstaSolicitando}
                      </p>
                    </div>

                    {/* Documentos do Acervo */}
                    {aiSugestao.documentosERegistrosSustentam && aiSugestao.documentosERegistrosSustentam.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-purple-100 space-y-1">
                        <span className="font-bold text-slate-800 block text-[11px]">
                          Documentos Internos Vigentes no Acervo que Sustentam a Resposta:
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {aiSugestao.documentosERegistrosSustentam.map((doc, idx) => (
                            <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-800 rounded font-semibold text-[11px] flex items-center gap-1 border border-slate-200">
                              <BookOpen className="w-3 h-3 text-indigo-600" />
                              <strong>{doc.codigo}</strong> ({doc.revisaoVigente}) — {doc.titulo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gaps e Evidências */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                        <span className="font-bold text-emerald-800 text-[11px] block">Evidências Encontradas:</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {aiSugestao.evidenciasExistentesELimitacoes}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1">
                        <span className="font-bold text-amber-800 text-[11px] block">Informações / Gaps Pendentes:</span>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {aiSugestao.informacoesAusentesOuGaps}
                        </p>
                      </div>
                    </div>

                    {/* Sugestão de Resposta */}
                    <div className="bg-white p-3.5 rounded-lg border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 text-xs">
                          Sugestão de Resposta Formal Preliminar:
                        </span>
                        <button
                          type="button"
                          onClick={handleApplySuggestion}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center gap-1 border border-purple-200 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar para Resposta Oficial</span>
                        </button>
                      </div>
                      <p className="text-slate-800 font-mono text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                        {aiSugestao.sugestaoRespostaPreliminar}
                      </p>
                      {aiSugestao.sugestaoMelhoriaOuImplementacao && (
                        <p className="text-slate-500 text-[11px] italic">
                          <strong>Oportunidade de Melhoria:</strong> {aiSugestao.sugestaoMelhoriaOuImplementacao}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Clique no botão acima para que a inteligência do QualiGest busque nos manuais, procedimentos, revisões vigentes e históricos de auditorias as evidências e a proposta de resposta.
                  </p>
                )}
              </div>

              {/* Resposta Oficial Enviada */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">
                      Resposta Oficial Enviada ao Auditor / Cliente:
                    </label>
                    <span className="text-[11px] text-slate-500">Armazenada separadamente da sugestão da IA</span>
                  </div>
                  <textarea
                    value={respostaOficial}
                    onChange={(e) => setRespostaOficial(e.target.value)}
                    rows={4}
                    placeholder="Redija ou revise a resposta técnica formal a ser transmitida ao auditor..."
                    className="w-full border border-slate-300 rounded-lg p-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status de Aceitação pelo Auditor Externo:</label>
                    <select
                      value={statusAceitacao}
                      onChange={(e) => setStatusAceitacao(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold"
                    >
                      <option value="PENDENTE">PENDENTE DE ENVIO / RESPOSTA</option>
                      <option value="EM_ANALISE">EM ANÁLISE PELO AUDITOR</option>
                      <option value="ACEITA">ACEITA PELO AUDITOR (RESPOSTA_ACEITA)</option>
                      <option value="REJEITADA">REJEITADA / NECESSITA COMPLEMENTAÇÃO</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Parecer / Observação do Auditor:</label>
                    <input
                      type="text"
                      value={parecerAuditor}
                      onChange={(e) => setParecerAuditor(e.target.value)}
                      placeholder="Ex: Ação aceita conforme relatório final ou ofício complementar..."
                      className="w-full border border-slate-200 rounded-lg p-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: EVIDÊNCIAS & RNC */}
          {activeTab === 'evidencias' && (
            <div className="space-y-4 text-xs">
              
              {/* Bloco de Integração com RNC */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Vínculo com Relatório de Não Conformidade (RNC)</h4>
                  </div>
                  {onCriarRNC && (
                    <button
                      type="button"
                      onClick={handleOpenRncCreation}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Abrir Nova RNC Oficial</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Caso o requisito aponte uma não conformidade real comprovada, vincule a uma RNC existente ou inicie uma nova RNC sem duplicar dados.
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Vincular a uma RNC Existente no Sistema:</label>
                    <select
                      value={selectedRncId}
                      onChange={(e) => setSelectedRncId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono font-medium"
                    >
                      <option value="">(Nenhuma RNC vinculada)</option>
                      {rncs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.numero} — {r.titulo || r.descricaoDetalhadaNaoConformidade?.slice(0, 60)} ({r.statusGeral})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedRncId && (
                    <button
                      type="button"
                      onClick={() => setSelectedRncId('')}
                      className="mt-5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              </div>

              {/* Bloco de Auditoria Interna (F 001-08) */}
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-700" />
                    <h4 className="font-bold text-indigo-900 text-sm">
                      Preparação para Auditoria Interna (F 001-08)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-200 text-indigo-900">
                    Melhoria Contínua
                  </span>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Transforme os pontos críticos deste requisito em itens do checklist do Programa Anual de Auditorias Internas para verificação prévia de eficácia.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReqAuditoriaInterna(true);
                      showToast('success', 'Requisito marcado para incorporação ao programa de auditoria interna.');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sugerir Inclusão no Programa F 001-08</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: TRILHA DE AUDITORIA */}
          {activeTab === 'historico' && (
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-800 block">Histórico de Alterações e Rastreabilidade:</span>
              {(!requisito.trilhaAuditoria || requisito.trilhaAuditoria.length === 0) ? (
                <p className="text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-slate-200">
                  Nenhuma alteração registrada até o momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {requisito.trilhaAuditoria.map((log, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">{log.acao}</span>
                        <p className="text-slate-600">{log.detalhes}</p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500">
                        <div>{log.usuarioNome}</div>
                        <div>{new Date(log.dataHora).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Ações de Salvamento */}
        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Última revisão: <strong>{new Date(requisito.updatedAt).toLocaleDateString('pt-BR')}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Gravando...' : 'Salvar Ficha do Requisito'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
