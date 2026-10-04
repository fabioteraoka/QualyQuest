import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  Sliders,
  Layers,
  FileText,
  AlertCircle,
  HelpCircle,
  Tag,
  Plus,
  RefreshCw,
  ExternalLink,
  Download,
  Building2
} from 'lucide-react';
import {
  RequisitoAuditoriaExterna,
  SituacaoAtendimentoRequisito,
  EstadoAcompanhamentoRequisito,
  DecisaoOrganizacionalRequisito,
} from '../../types/auditRequirements';
import {
  AuditoriaExternaRecord,
  UserProfile,
  NCRecord
} from '../../types';
import { AuditRequirementDetailModal } from './AuditRequirementDetailModal';
import { KALITTA_QA14_METADATA, KALITTA_QA14_ITEMS } from '../../data/sampleKalittaQA14Checklist';

interface AuditRequirementsListViewProps {
  requirements: RequisitoAuditoriaExterna[];
  audits: AuditoriaExternaRecord[];
  userProfile?: UserProfile | null;
  rncs?: NCRecord[];
  onSaveRequirement: (req: RequisitoAuditoriaExterna) => Promise<void>;
  onSaveBatchRequirements?: (reqs: RequisitoAuditoriaExterna[]) => Promise<void>;
  onCriarRNC?: (payload: Partial<NCRecord>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const AuditRequirementsListView: React.FC<AuditRequirementsListViewProps> = ({
  requirements = [],
  audits = [],
  userProfile,
  rncs = [],
  onSaveRequirement,
  onSaveBatchRequirements,
  onCriarRNC,
  onNavigateToTab,
}) => {
  const [selectedAuditId, setSelectedAuditId] = useState<string>('TODAS');
  const [selectedSecao, setSelectedSecao] = useState<string>('TODAS');
  const [selectedSituacao, setSelectedSituacao] = useState<string>('TODAS');
  const [selectedAcompanhamento, setSelectedAcompanhamento] = useState<string>('TODAS');
  const [selectedDecisao, setSelectedDecisao] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de Detalhe e Avaliação do Requisito Individual
  const [activeReqModal, setActiveReqModal] = useState<RequisitoAuditoriaExterna | null>(null);
  const [loadingBatch, setLoadingBatch] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // Seções únicas
  const secoesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    requirements.forEach((r) => {
      if (r.capituloOuSecao) set.add(r.capituloOuSecao);
    });
    return Array.from(set).sort();
  }, [requirements]);

  // Filtragem dos requisitos
  const filteredRequirements = useMemo(() => {
    return requirements.filter((r) => {
      if (r.statusRegistro === 'CANCELADO') return false;

      const matchAudit = selectedAuditId === 'TODAS' || r.auditId === selectedAuditId;
      const matchSecao = selectedSecao === 'TODAS' || r.capituloOuSecao === selectedSecao;
      const matchSituacao = selectedSituacao === 'TODAS' || r.situacaoAtendimento === selectedSituacao;
      const matchAcompanhamento = selectedAcompanhamento === 'TODAS' || r.estadoAcompanhamento === selectedAcompanhamento;
      const matchDecisao = selectedDecisao === 'TODAS' || r.decisaoOrganizacional === selectedDecisao;

      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        r.numeroItem.toLowerCase().includes(term) ||
        r.textoOriginal.toLowerCase().includes(term) ||
        (r.perguntaOuCriterio && r.perguntaOuCriterio.toLowerCase().includes(term)) ||
        (r.referenciaNormativa && r.referenciaNormativa.toLowerCase().includes(term)) ||
        (r.setorResponsavel && r.setorResponsavel.toLowerCase().includes(term));

      return matchAudit && matchSecao && matchSituacao && matchAcompanhamento && matchDecisao && matchSearch;
    });
  }, [requirements, selectedAuditId, selectedSecao, selectedSituacao, selectedAcompanhamento, selectedDecisao, searchTerm]);

  // Estatísticas calculadas
  const metrics = useMemo(() => {
    const activeReqs = requirements.filter((r) => r.statusRegistro !== 'CANCELADO');
    const total = activeReqs.length;
    const atendidos = activeReqs.filter((r) => r.situacaoAtendimento === 'ATENDIDO').length;
    const parcialmente = activeReqs.filter((r) => r.situacaoAtendimento === 'PARCIALMENTE_ATENDIDO').length;
    const naoAtendidos = activeReqs.filter((r) => r.situacaoAtendimento === 'NAO_ATENDIDO').length;
    const emAvaliacao = activeReqs.filter((r) => r.situacaoAtendimento === 'EM_AVALIACAO' || r.situacaoAtendimento === 'ATENDIMENTO_NAO_COMPROVADO').length;
    const naoAplicavel = activeReqs.filter((r) => r.situacaoAtendimento === 'NAO_APLICAVEL').length;

    const decisaoManter = activeReqs.filter((r) => r.decisaoOrganizacional === 'MANTER_COMO_ESTA').length;
    const decisaoImplementar = activeReqs.filter((r) => r.decisaoOrganizacional === 'IMPLEMENTAR').length;
    const decisaoMelhorar = activeReqs.filter((r) => r.decisaoOrganizacional === 'MELHORAR').length;
    const decisaoFormalizar = activeReqs.filter((r) => r.decisaoOrganizacional === 'FORMALIZAR').length;

    const concluidos = activeReqs.filter((r) => r.estadoAcompanhamento === 'CONCLUIDO').length;
    const emImplementacao = activeReqs.filter((r) => r.estadoAcompanhamento === 'EM_IMPLEMENTACAO' || r.estadoAcompanhamento === 'AGUARDANDO_IMPLEMENTACAO').length;

    return {
      total,
      atendidos,
      parcialmente,
      naoAtendidos,
      emAvaliacao,
      naoAplicavel,
      decisaoManter,
      decisaoImplementar,
      decisaoMelhorar,
      decisaoFormalizar,
      concluidos,
      emImplementacao,
    };
  }, [requirements]);

  // Auditoria do requisito selecionado
  const currentReqAudit = useMemo(() => {
    if (!activeReqModal) return null;
    return audits.find((a) => a.id === activeReqModal.auditId) || null;
  }, [activeReqModal, audits]);

  // Carga Rápida do Checklist Kalitta QA-14 diretamente para o SGQ
  const handleFastLoadKalitta = async () => {
    if (!onSaveBatchRequirements) {
      showNotification('error', 'Função de gravação em lote não disponível.');
      return;
    }

    setLoadingBatch(true);
    try {
      const targetAuditId = selectedAuditId !== 'TODAS' ? selectedAuditId : `AUD-${Date.now()}`;
      const numeroAuditoria = 'AUD-2026-KALITTA-01';

      const novosRequisitos: RequisitoAuditoriaExterna[] = KALITTA_QA14_ITEMS.map((item, idx) => ({
        id: `KALITTA-QA14-${item.numeroItem.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`,
        organizationId: 'org_impacto_aviation',
        auditId: targetAuditId,
        numeroAuditoria,
        clienteOuEntidade: 'Kalitta Air',
        dataAuditoria: '2026-09-01',
        numeroItem: item.numeroItem,
        capituloOuSecao: item.capituloOuSecao,
        hierarquia: {
          capitulo: item.capituloOuSecao,
          secao: item.capituloOuSecao,
          ordem: idx + 1,
        },
        tituloCurto: item.perguntaOuCriterio.slice(0, 60),
        textoOriginal: item.textoOriginal,
        perguntaOuCriterio: item.perguntaOuCriterio,
        referenciaNormativa: item.referenciaNormativa,
        campoRespostaOriginal: item.campoRespostaOriginal,
        situacaoAtendimento: 'EM_AVALIACAO',
        estadoAcompanhamento: 'NAO_INICIADO',
        prioridade: item.criticidadeSugerida,
        setorResponsavel:
          item.categoriaSugerida === 'Pessoas e Treinamentos'
            ? 'Treinamento e Qualificação'
            : item.categoriaSugerida === 'Ferramental e Calibração'
            ? 'Metrologia e Ferramental'
            : item.categoriaSugerida === 'Controle Documental'
            ? 'Engenharia e Publicações Técnicas'
            : 'Manutenção de Linha',
        responsavelInterno: userProfile?.displayName || 'Garantia da Qualidade SGQ',
        decisaoOrganizacional: 'AVALIAR_APLICABILIDADE',
        localizacaoOrigem: {
          pagina: item.paginaOrigem,
          documentoNome: 'QA 14 Line Maintenance Rev 4.pdf',
        },
        grauConfiancaExtracao: 99,
        necessitaRevisaoHumana: false,
        statusRegistro: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        criadoPorUid: userProfile?.uid || 'user_sgq',
        criadoPorNome: userProfile?.displayName || 'QualiGest SGQ',
        trilhaAuditoria: [
          {
            dataHora: new Date().toISOString(),
            usuarioUid: userProfile?.uid || 'user_sgq',
            usuarioNome: userProfile?.displayName || 'QualiGest SGQ',
            acao: 'CRIACAO',
            detalhes: 'Extração oficial de item do FORM QA-14 Line Maintenance Station Audit Checklist (Kalitta Air Rev 4).',
          },
        ],
      }));

      await onSaveBatchRequirements(novosRequisitos);
      showNotification('success', `Checklist Kalitta QA-14 incorporado com sucesso! ${novosRequisitos.length} requisitos registrados.`);
    } catch (err: any) {
      showNotification('error', `Falha ao gravar requisitos: ${err.message}`);
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Banner Principal com Identificação e Carga Rápida */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800/50 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                CONTROLE INDIVIDUALIZADO DE REQUISITOS • FORM QA-14
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                7 Páginas • 69 Itens Estruturados
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Requisitos de Auditorias e Checklists Técnicos
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl mt-1">
              Cada pergunta do checklist de auditoria externa é uma unidade autônoma de controle. 
              Avalie a <strong>Situação Técnica de Atendimento</strong> (Atendido / Lacuna), acompanhe o <strong>Estado Administrativo</strong> e defina a <strong>Decisão Organizacional</strong> (Manter, Implementar, Melhorar).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {requirements.length === 0 && (
              <button
                onClick={handleFastLoadKalitta}
                disabled={loadingBatch}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loadingBatch ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Carregar Checklist Kalitta QA-14 (69 Itens)</span>
              </button>
            )}

            {requirements.length > 0 && (
              <button
                onClick={handleFastLoadKalitta}
                disabled={loadingBatch}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Sincronizar novamente itens padrão do FORM QA-14"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBatch ? 'animate-spin' : ''}`} />
                <span>Recarregar Modelo Kalitta</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard de Métricas Técnicas e Decisões */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total de Itens</span>
            <div className="text-xl font-bold text-white mt-0.5">{metrics.total}</div>
            <span className="text-[10px] text-slate-500">Unidades de controle</span>
          </div>

          <div className="bg-emerald-950/30 rounded-xl p-3 border border-emerald-900/40">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Atendidos</span>
            <div className="text-xl font-bold text-emerald-300 mt-0.5">{metrics.atendidos}</div>
            <span className="text-[10px] text-emerald-500/80">Evidência comprovada</span>
          </div>

          <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-900/40">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Parcial / Atenção</span>
            <div className="text-xl font-bold text-amber-300 mt-0.5">{metrics.parcialmente}</div>
            <span className="text-[10px] text-amber-500/80">Exige complementação</span>
          </div>

          <div className="bg-rose-950/30 rounded-xl p-3 border border-rose-900/40">
            <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Não Atendidos (Gaps)</span>
            <div className="text-xl font-bold text-rose-300 mt-0.5">{metrics.naoAtendidos}</div>
            <span className="text-[10px] text-rose-500/80">Lacunas a tratar</span>
          </div>

          <div className="bg-sky-950/30 rounded-xl p-3 border border-sky-900/40">
            <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">Em Avaliação</span>
            <div className="text-xl font-bold text-sky-300 mt-0.5">{metrics.emAvaliacao}</div>
            <span className="text-[10px] text-sky-500/80">Aguardando auditoria</span>
          </div>

          <div className="bg-purple-950/30 rounded-xl p-3 border border-purple-900/40">
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Decisões: Ação</span>
            <div className="text-xl font-bold text-purple-300 mt-0.5">
              {metrics.decisaoImplementar + metrics.decisaoMelhorar + metrics.decisaoFormalizar}
            </div>
            <span className="text-[10px] text-purple-400/80">Implementar / Elevar</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nº, pergunta, norma (GMM, CFR...), setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
            <span className="text-slate-500 font-medium whitespace-nowrap">Capítulo/Seção:</span>
            <select
              value={selectedSecao}
              onChange={(e) => setSelectedSecao(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas as Seções ({secoesDisponiveis.length})</option>
              {secoesDisponiveis.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha Secundária de Filtros de Estado e Decisão */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Situação de Atendimento:</label>
            <select
              value={selectedSituacao}
              onChange={(e) => setSelectedSituacao(e.target.value)}
              className="w-full px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-800 text-[11px]"
            >
              <option value="TODAS">Todas as Situações</option>
              <option value="ATENDIDO">Atendido</option>
              <option value="PARCIALMENTE_ATENDIDO">Parcialmente Atendido</option>
              <option value="NAO_ATENDIDO">Não Atendido (Gap)</option>
              <option value="EM_AVALIACAO">Em Avaliação</option>
              <option value="ATENDIMENTO_NAO_COMPROVADO">Atendimento Não Comprovado</option>
              <option value="NAO_APLICAVEL">Não Aplicável</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Acompanhamento:</label>
            <select
              value={selectedAcompanhamento}
              onChange={(e) => setSelectedAcompanhamento(e.target.value)}
              className="w-full px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-800 text-[11px]"
            >
              <option value="TODAS">Todos os Estados</option>
              <option value="NAO_INICIADO">Não Iniciado</option>
              <option value="EM_ANALISE">Em Análise</option>
              <option value="EM_IMPLEMENTACAO">Em Implementação</option>
              <option value="AGUARDANDO_EVIDENCIA">Aguardando Evidência</option>
              <option value="EM_VALIDACAO">Em Validação</option>
              <option value="CONCLUIDO">Concluído</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Decisão Organizacional:</label>
            <select
              value={selectedDecisao}
              onChange={(e) => setSelectedDecisao(e.target.value)}
              className="w-full px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-800 text-[11px]"
            >
              <option value="TODAS">Todas as Decisões</option>
              <option value="MANTER_COMO_ESTA">Manter como está</option>
              <option value="IMPLEMENTAR">Implementar novo controle</option>
              <option value="MELHORAR">Elevar nível de controle</option>
              <option value="FORMALIZAR">Formalizar procedimento</option>
              <option value="AVALIAR_APLICABILIDADE">Avaliar aplicabilidade</option>
              <option value="NAO_IMPLEMENTAR_NAO_APLICAVEL">Não implementar (Não aplicável)</option>
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-[11px] text-slate-500 py-1 font-medium">
              Exibindo <strong>{filteredRequirements.length}</strong> de {requirements.length} itens
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Requisitos em Cards Estruturados */}
      {filteredRequirements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum requisito encontrado para os filtros atuais</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Ajuste a busca ou carregue os 69 itens do checklist oficial Kalitta Air FORM QA-14 para iniciar o controle.
          </p>
          {requirements.length === 0 && (
            <button
              onClick={handleFastLoadKalitta}
              disabled={loadingBatch}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Carregar Checklist Modelo Kalitta QA-14 (69 Itens)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequirements.map((req) => {
            const isAtendido = req.situacaoAtendimento === 'ATENDIDO';
            const isParcial = req.situacaoAtendimento === 'PARCIALMENTE_ATENDIDO';
            const isNaoAtendido = req.situacaoAtendimento === 'NAO_ATENDIDO';
            const isEmAvaliacao = req.situacaoAtendimento === 'EM_AVALIACAO' || req.situacaoAtendimento === 'ATENDIMENTO_NAO_COMPROVADO';

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-xs transition-all hover:shadow-sm"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Identificação, Seção e Pergunta */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        Item {req.numeroItem}
                      </span>

                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {req.capituloOuSecao}
                      </span>

                      {req.referenciaNormativa && (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200" title="Referência Normativa">
                          Ref: {req.referenciaNormativa}
                        </span>
                      )}

                      {req.localizacaoOrigem?.pagina && (
                        <span className="text-[10px] text-slate-400">
                          Pág. {req.localizacaoOrigem.pagina}
                        </span>
                      )}
                    </div>

                    {/* Texto Original em Inglês */}
                    <div className="text-xs text-slate-900 font-medium">
                      {req.textoOriginal}
                    </div>

                    {/* Critério ou Tradução em Português */}
                    {req.perguntaOuCriterio && req.perguntaOuCriterio !== req.textoOriginal && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong className="text-slate-700">Critério SGQ:</strong> {req.perguntaOuCriterio}
                      </div>
                    )}
                  </div>

                  {/* Badges de Situação Técnica, Estado e Ação */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Badge Situação de Atendimento */}
                    <div className="text-center min-w-[130px]">
                      <span
                        className={`inline-block w-full px-2.5 py-1 rounded-md text-[10px] font-bold ${
                          isAtendido
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isParcial
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : isNaoAtendido
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isEmAvaliacao
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {req.situacaoAtendimento === 'ATENDIDO' && '✓ ATENDIDO'}
                        {req.situacaoAtendimento === 'PARCIALMENTE_ATENDIDO' && '⚠ PARCIAL'}
                        {req.situacaoAtendimento === 'NAO_ATENDIDO' && '✗ NÃO ATENDIDO'}
                        {req.situacaoAtendimento === 'EM_AVALIACAO' && '⏳ EM AVALIAÇÃO'}
                        {req.situacaoAtendimento === 'ATENDIMENTO_NAO_COMPROVADO' && '⏳ NÃO COMPROVADO'}
                        {req.situacaoAtendimento === 'NAO_APLICAVEL' && 'N/A NÃO APLICÁVEL'}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Situação Técnica</span>
                    </div>

                    {/* Badge Decisão Organizacional */}
                    <div className="text-center min-w-[130px]">
                      <span
                        className={`inline-block w-full px-2 py-1 rounded-md text-[10px] font-semibold ${
                          req.decisaoOrganizacional === 'MANTER_COMO_ESTA'
                            ? 'bg-slate-100 text-slate-800 border border-slate-200'
                            : req.decisaoOrganizacional === 'IMPLEMENTAR'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : req.decisaoOrganizacional === 'MELHORAR'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : req.decisaoOrganizacional === 'FORMALIZAR'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {req.decisaoOrganizacional === 'MANTER_COMO_ESTA' && 'Manter como está'}
                        {req.decisaoOrganizacional === 'IMPLEMENTAR' && '★ Implementar'}
                        {req.decisaoOrganizacional === 'MELHORAR' && '▲ Elevar controle'}
                        {req.decisaoOrganizacional === 'FORMALIZAR' && '📄 Formalizar'}
                        {req.decisaoOrganizacional === 'AVALIAR_APLICABILIDADE' && 'Estudar aplicação'}
                        {req.decisaoOrganizacional === 'NAO_IMPLEMENTAR_NAO_APLICAVEL' && 'Não implementar'}
                        {(!req.decisaoOrganizacional || req.decisaoOrganizacional === 'AGUARDAR_DECISAO') && 'Aguardando decisão'}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Decisão SGQ</span>
                    </div>

                    {/* Botão de Avaliar e Abrir Modal Completo */}
                    <button
                      onClick={() => setActiveReqModal(req)}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <span>Avaliar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Completo de Avaliação, IA e Resposta do Requisito Individual */}
      {activeReqModal && (
        <AuditRequirementDetailModal
          isOpen={Boolean(activeReqModal)}
          onClose={() => setActiveReqModal(null)}
          requisito={activeReqModal}
          auditoria={currentReqAudit}
          userProfile={userProfile}
          rncs={rncs}
          onSaveRequirement={async (updatedReq) => {
            await onSaveRequirement(updatedReq);
            setActiveReqModal(updatedReq);
            showNotification('success', `Requisito ${updatedReq.numeroItem} atualizado com sucesso!`);
          }}
          onCriarRNC={onCriarRNC}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
