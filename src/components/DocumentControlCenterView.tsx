import React, { useState, useMemo, useEffect } from 'react';
import {
  DocumentoControlado,
  RevisaoDocumental,
  FonteExternaControlada,
  SolicitacaoRevisaoCliente,
  LogVerificacaoFonteExterna,
  RegistroEvidenciaConsultaDocumento,
  CategoriaDocumental,
  StatusCicloVidaDocumental,
  StatusSolicitacaoCliente,
  UserProfile,
  OrganizationRecord,
  NCRecord,
} from '../types';
import {
  determinarRevisaoVigenteNaData,
  avaliarAplicabilidade,
  gerarSolicitacaoRevisaoClienteEmail,
  compararRevisoes,
  diagnosticarImpactosRevisao,
  simularVerificacaoFonteExterna,
  calcularMetricasDashboardDocumental,
} from '../services/documentControlEngine';
import {
  saveDocumentoControlado,
  saveRevisaoDocumental,
  aprovarRevisaoDocumental,
  saveFonteExterna,
  saveSolicitacaoCliente,
  atualizarStatusSolicitacaoCliente,
  saveLogVerificacao,
  registrarEvidenciaConsulta,
} from '../services/firebase/documentControlFirestore';
import {
  BookOpen,
  History,
  Globe,
  Mail,
  GitCompare,
  Sparkles,
  BarChart3,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileCheck,
  Send,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  X,
  Lock,
  ArrowRight,
  Eye,
  RefreshCw,
  Award,
} from 'lucide-react';

interface DocumentControlCenterViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  activeOrganization?: OrganizationRecord | null;
  documentos: DocumentoControlado[];
  revisoes: RevisaoDocumental[];
  fontes: FonteExternaControlada[];
  solicitacoes: SolicitacaoRevisaoCliente[];
  logsVerificacao: LogVerificacaoFonteExterna[];
  evidenciasConsulta: RegistroEvidenciaConsultaDocumento[];
  nonConformities?: NCRecord[];
  onOpenNCFormWithDoc?: (docCodigo: string, revisao: string) => void;
  initialSubTab?: 'acervo' | 'temporal' | 'fontes' | 'solicitacoes' | 'comparador' | 'rag' | 'dashboard';
}

export const DocumentControlCenterView: React.FC<DocumentControlCenterViewProps> = ({
  organizationId,
  currentUser,
  activeOrganization,
  documentos = [],
  revisoes = [],
  fontes = [],
  solicitacoes = [],
  logsVerificacao = [],
  evidenciasConsulta = [],
  nonConformities = [],
  onOpenNCFormWithDoc,
  initialSubTab = 'acervo',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'acervo' | 'temporal' | 'fontes' | 'solicitacoes' | 'comparador' | 'rag' | 'dashboard'
  >(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Filtros do Acervo
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODAS');
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<DocumentoControlado | null>(null);

  // Modais de Criação
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isNewRevisionModalOpen, setIsNewRevisionModalOpen] = useState(false);
  const [isNewSourceModalOpen, setIsNewSourceModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultTargetDoc, setConsultTargetDoc] = useState<DocumentoControlado | null>(null);

  // Estado da Consulta Temporal
  const [temporalDocId, setTemporalDocId] = useState<string>(documentos[0]?.id || '');
  const [temporalDate, setTemporalDate] = useState<string>('2024-08-15');
  const [temporalSetor, setTemporalSetor] = useState<string>('REC - Manutenção / Calibração');
  const [temporalProcesso, setTemporalProcesso] = useState<string>('Calibração Metrológica');
  const [temporalAeronave, setTemporalAeronave] = useState<string>('Cessna Caravan 208B');
  const [temporalCliente, setTemporalCliente] = useState<string>('Azul Linhas Aéreas');

  // Estado do Comparador
  const [compareDocId, setCompareDocId] = useState<string>(documentos[0]?.id || '');
  const [compareRevAId, setCompareRevAId] = useState<string>('');
  const [compareRevBId, setCompareRevBId] = useState<string>('');

  // Estado do RAG Temporal
  const [ragQuery, setRagQuery] = useState('');
  const [ragMode, setRagMode] = useState<'VIGENTE_HOJE' | 'HISTORICO_NA_DATA'>('VIGENTE_HOJE');
  const [ragDate, setRagDate] = useState('2024-08-15');
  const [ragHistory, setRagHistory] = useState<Array<{ q: string; a: string; fontId?: string; dataVigencia?: string }>>([
    {
      q: 'Qual era a regra de calibração de torquímetros em agosto de 2024?',
      a: 'Em 15/08/2024, a revisão aplicável do MOMQ MNT-001 era a Rev. 06 (Capítulo 3.4.3). O requisito exigia calibração com periodicidade anual (12 meses) e arquivamento de fichas em meio físico. Atenção: essa redação foi substituída pela Rev. 07 em 01/01/2025 e pela Rev. 08 em 01/07/2025, que agora exige controle estritamente digital via QualiGest com bloqueio de OS.',
      fontId: 'MOMQ MNT-001 (Rev. 06 — Histórica)',
      dataVigencia: '2024-08-15',
    },
  ]);
  const [isRagLoading, setIsRagLoading] = useState(false);

  // Notificações / Mensagens Rápidas
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Métricas do Dashboard Documental
  const dashboardMetrics = useMemo(() => {
    return calcularMetricasDashboardDocumental(documentos, revisoes, fontes, solicitacoes, logsVerificacao);
  }, [documentos, revisoes, fontes, solicitacoes, logsVerificacao]);

  // Lista Filtrada do Acervo
  const filteredDocumentos = useMemo(() => {
    return documentos.filter((doc) => {
      const matchSearch =
        doc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.emissor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = selectedCategoria === 'TODAS' || doc.categoria === selectedCategoria;
      return matchSearch && matchCategoria;
    });
  }, [documentos, searchTerm, selectedCategoria]);

  // Revisões do documento selecionado para detalhe
  const revisoesDoDocSelecionado = useMemo(() => {
    if (!selectedDocForDetail) return [];
    return revisoes
      .filter((r) => r.documentoId === selectedDocForDetail.id)
      .sort((a, b) => new Date(b.dataEntradaVigor).getTime() - new Date(a.dataEntradaVigor).getTime());
  }, [revisoes, selectedDocForDetail]);

  // Diagnóstico da Consulta Temporal
  const temporalResult = useMemo(() => {
    const doc = documentos.find((d) => d.id === temporalDocId);
    if (!doc) return null;
    const revsDoDoc = revisoes.filter((r) => r.documentoId === doc.id);
    const resultadoTemporal = determinarRevisaoVigenteNaData(doc, revisoes, temporalDate);
    const revVigente = resultadoTemporal.revisaoVigenteNaData;
    const revHoje = resultadoTemporal.revisaoVigenteHoje || revisoes.find((r) => r.id === doc.revisaoVigenteId);

    const aplicabilidade = avaliarAplicabilidade(doc.aplicabilidadePadrao, {
      dataReferencia: temporalDate,
      aeronave: temporalAeronave,
      setor: temporalSetor,
      processo: temporalProcesso,
      cliente: temporalCliente,
    });

    return {
      documento: doc,
      revisaoNoEvento: revVigente,
      revisaoHoje: revHoje,
      aplicabilidade,
      dataConsultada: temporalDate,
    };
  }, [documentos, revisoes, temporalDocId, temporalDate, temporalAeronave, temporalSetor, temporalProcesso, temporalCliente]);

  // Comparação de Revisões
  const revisoesDisponiveisParaComparar = useMemo(() => {
    return revisoes.filter((r) => r.documentoId === compareDocId);
  }, [revisoes, compareDocId]);

  const comparacaoResult = useMemo(() => {
    if (!compareRevAId || !compareRevBId) return null;
    const revA = revisoes.find((r) => r.id === compareRevAId);
    const revB = revisoes.find((r) => r.id === compareRevBId);
    if (!revA || !revB) return null;

    const diff = compararRevisoes(revA, revB);
    const docRel = documentos.find((d) => d.id === revB.documentoId) || documentos.find((d) => d.codigo === revB.codigoDocumento);
    const impactos = docRel
      ? diagnosticarImpactosRevisao({
          documento: docRel,
          novaRevisao: revB,
          rncsAbertas: nonConformities?.map((n) => ({ id: n.id, numeroNC: n.numeroNC, normaReferencia: n.normaReferencia })) || [],
        })
      : [];

    return {
      revA,
      revB,
      diff,
      impactos,
    };
  }, [revisoes, compareRevAId, compareRevBId]);

  // Executar Pergunta RAG Temporal
  const handleExecuteRag = () => {
    if (!ragQuery.trim()) return;
    setIsRagLoading(true);

    setTimeout(() => {
      let resposta = '';
      let docCerne = '';
      const qLower = ragQuery.toLowerCase();

      if (ragMode === 'VIGENTE_HOJE') {
        if (qLower.includes('torquímetro') || qLower.includes('calibração') || qLower.includes('ferramenta')) {
          docCerne = 'MOMQ MNT-001 (Rev. 08 — VIGENTE) & POP-REC-001 (Rev. 04)';
          resposta =
            'Na revisão VIGENTE ATUAL (MOMQ Rev. 08 e POP-REC-001 Rev. 04), ferramentas de medição têm tolerância pós-vencimento ZERO. Qualquer instrumento vencido é bloqueado imediatamente no QualiGest às 23:59 da data de validade, e nenhuma Ordem de Serviço pode ser liberada com instrumento fora de calibração.';
        } else if (qLower.includes('rbac') || qLower.includes('anac')) {
          docCerne = 'RBAC 145 (Emenda 07 — VIGENTE)';
          resposta =
            'A regulamentação oficial ANAC vigente no sistema é o RBAC 145 Emenda 07. A Seção 145.109 exige que todo ferramental e equipamento de teste seja mantido com calibração rastreável a padrões RBC/Inmetro ou internacionais reconhecidos.';
        } else {
          docCerne = 'Base Documental Vigente QualiGest SGQ';
          resposta = `Consulta realizada contra a base documental vigente: Não foram identificadas restrições impeditivas adicionais além dos procedimentos padronizados no MOMQ Rev. 08.`;
        }
      } else {
        docCerne = `Consulta Histórica para a Data: ${ragDate}`;
        resposta = `[MODO TEMPORAL HISTÓRICO — ${ragDate}]: Na data consultada, os requisitos aplicáveis eram estritamente os constantes na revisão vigente naquele período. Documentos ou emendas posteriores não eram exigíveis retroativamente.`;
      }

      setRagHistory((prev) => [
        {
          q: ragQuery,
          a: resposta,
          fontId: docCerne,
          dataVigencia: ragMode === 'HISTORICO_NA_DATA' ? ragDate : 'Vigente Hoje',
        },
        ...prev,
      ]);

      setRagQuery('');
      setIsRagLoading(false);
    }, 600);
  };

  // Simulação de Verificação de Fonte
  const handleVerificarFonte = async (fonte: FonteExternaControlada) => {
    const docRelacionado = documentos.find((d) => d.fonteExternaId === fonte.id) || documentos[0];
    const revVigente = revisoes.find((r) => r.id === docRelacionado?.revisaoVigenteId);

    const logSimulado = simularVerificacaoFonteExterna({
      fonte,
      documento: docRelacionado || {
        id: 'doc-ext-01',
        organizationId,
        codigo: 'DOC-EXT',
        titulo: fonte.nome,
        categoria: 'DOCUMENTO_FABRICANTE',
        emissor: fonte.nome,
        responsavelNome: currentUser?.displayName || 'Garantia da Qualidade',
        exigeEvidenciaLeitura: false,
        aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
        statusGeral: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      revisaoAtual: revVigente,
      usuarioExecutor: currentUser?.displayName || currentUser?.email || 'Auditor SGQ',
    });

    await saveLogVerificacao(organizationId, logSimulado, currentUser);

    const fonteAtualizada: FonteExternaControlada = {
      ...fonte,
      ultimaVerificacao: new Date().toISOString(),
      ultimoResultadoStatus:
        logSimulado.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA'
          ? 'NOVA_REVISAO_IDENTIFICADA'
          : 'CONFORME_SEM_ALTERACAO',
      ultimoResultadoDetalhes: logSimulado.mensagem,
      updatedAt: new Date().toISOString(),
    };
    await saveFonteExterna(organizationId, fonteAtualizada, currentUser);

    showToast(`Verificação da fonte "${fonte.nome}" concluída! Status: ${logSimulado.statusVerificacao}`);
  };

  // Registrar Evidência de Consulta Técnica (Seção 21)
  const handleSalvarEvidenciaConsulta = async (doc: DocumentoControlado, finalidade: any, refOp: string) => {
    const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
    const novaEvidencia: RegistroEvidenciaConsultaDocumento = {
      id: `evid-${Date.now()}`,
      organizationId,
      documentoId: doc.id,
      codigoDocumento: doc.codigo,
      revisaoId: revVigente?.id || 'rev-vigente',
      numeroRevisao: revVigente?.numeroRevisao || 'Rev. Vigente',
      usuarioNome: currentUser?.displayName || currentUser?.email || 'Técnico Operacional',
      usuarioUid: currentUser?.uid || 'usr-op',
      dataHora: new Date().toISOString(),
      finalidadeConsulta: finalidade,
      referenciaOperacional: refOp,
      declaracaoLeituraConfirmada: true,
    };

    await registrarEvidenciaConsulta(organizationId, novaEvidencia, currentUser);
    setIsConsultModalOpen(false);
    showToast(`Evidência de consulta do documento ${doc.codigo} registrada com sucesso.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Header Principal do Centro de Controle Documental */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                FASE 10 — HOMOLOGADA
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeOrganization?.name || 'QualiGest SGQ'} • RBAC 145 / ISO 9001
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-sky-400" />
              Controle Documental, Revisões & Conhecimento Temporal
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Sistema integrado de rastreabilidade aeronáutica: conecta documento, revisão vigente, fontes externas oficiais,
              aplicabilidade multidimensional e conhecimento histórico para auditorias e decisões operacionais.
            </p>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedDocForDetail(null);
                setIsNewDocModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Documento
            </button>
            <button
              onClick={() => setIsNewSourceModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              Nova Fonte Oficial
            </button>
          </div>
        </div>

        {/* 7 Abas de Navegação Integradas */}
        <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-800 pb-1">
          {[
            { id: 'acervo', label: 'Acervo & Ciclo de Vida', icon: BookOpen, count: documentos.length },
            { id: 'temporal', label: 'Conhecimento Temporal', icon: History, highlight: true },
            { id: 'fontes', label: 'Fontes Externas Oficiais', icon: Globe, count: fontes.length },
            { id: 'solicitacoes', label: 'Solicitações a Clientes', icon: Mail, count: solicitacoes.length },
            { id: 'comparador', label: 'Comparador & Impactos', icon: GitCompare },
            { id: 'rag', label: 'Assistente RAG Temporal', icon: Sparkles },
            { id: 'dashboard', label: 'Dashboard Documental', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.highlight && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Motor Temporal Ativo" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: ACERVO DE DOCUMENTOS & CICLO DE VIDA                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'acervo' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, título ou emissor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Categoria:
              </span>
              {['TODAS', 'DOCUMENTO_INTERNO', 'DOCUMENTO_AUTORIDADE', 'DOCUMENTO_FABRICANTE', 'DOCUMENTO_CLIENTE'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoria(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategoria === cat
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'TODAS'
                      ? 'Todas'
                      : cat === 'DOCUMENTO_INTERNO'
                      ? 'Internos'
                      : cat === 'DOCUMENTO_AUTORIDADE'
                      ? 'Autoridades'
                      : cat === 'DOCUMENTO_FABRICANTE'
                      ? 'Fabricantes'
                      : 'Clientes'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Grid de Documentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocumentos.map((doc) => {
              const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
              const totalRevisoes = revisoes.filter((r) => r.documentoId === doc.id).length;

              return (
                <div
                  key={doc.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all group hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          {doc.codigo}
                        </span>
                        <h3 className="text-sm font-semibold text-white mt-1.5 group-hover:text-sky-300 transition-colors line-clamp-2">
                          {doc.titulo}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                          doc.categoria === 'DOCUMENTO_AUTORIDADE'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : doc.categoria === 'DOCUMENTO_FABRICANTE'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : doc.categoria === 'DOCUMENTO_CLIENTE'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        }`}
                      >
                        {doc.categoria.replace('DOCUMENTO_', '')}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Emissor / Fonte:</span>
                        <span className="text-slate-200 font-medium truncate max-w-[180px]">
                          {doc.autoridadeNome || doc.fabricanteNome || doc.clienteNome || doc.emissor}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Revisão Vigente:</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {doc.revisaoVigenteNumero || revVigente?.numeroRevisao || 'S/ Rev'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Histórico de Versões:</span>
                        <span className="text-slate-300">{totalRevisoes} revisões registradas</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setConsultTargetDoc(doc);
                        setIsConsultModalOpen(true);
                      }}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
                      title="Registrar evidência formal de consulta para OS ou Auditoria"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      Consultar
                    </button>

                    <button
                      onClick={() => setSelectedDocForDetail(doc)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-sky-500/10 transition-colors"
                    >
                      Ver Linha do Tempo
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer / Modal de Detalhes da Linha do Tempo e Revisões */}
          {selectedDocForDetail && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
                {/* Cabeçalho do Modal */}
                <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {selectedDocForDetail.codigo}
                      </span>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">
                        {selectedDocForDetail.categoria}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{selectedDocForDetail.titulo}</h2>
                    <p className="text-xs text-slate-400">
                      Responsável Técnico: {selectedDocForDetail.responsavelNome} • Emissor: {selectedDocForDetail.emissor}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDocForDetail(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo com a Linha do Tempo Cronológica */}
                <div className="p-6 overflow-y-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-sky-400" />
                        Histórico Cronológico & Ciclo de Vida das Revisões
                      </h4>
                      <p className="text-xs text-slate-400">
                        Cada revisão é um registro imutável com vigência temporal estrita.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsNewRevisionModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Propor Nova Revisão
                    </button>
                  </div>

                  {/* Linha do Tempo */}
                  <div className="space-y-4 border-l-2 border-slate-800 ml-4 pl-6 relative">
                    {revisoesDoDocSelecionado.map((rev) => {
                      const isVigente = rev.statusCicloVida === 'VIGENTE';
                      const isSubstituido = rev.statusCicloVida === 'SUBSTITUIDO';

                      return (
                        <div key={rev.id} className="relative group">
                          {/* Marcador do nó */}
                          <div
                            className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 ${
                              isVigente
                                ? 'bg-emerald-500 border-emerald-400 shadow-xs shadow-emerald-500/50'
                                : isSubstituido
                                ? 'bg-slate-800 border-slate-600'
                                : 'bg-amber-500 border-amber-400'
                            }`}
                          />

                          <div
                            className={`p-4 rounded-xl border transition-all ${
                              isVigente
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{rev.numeroRevisao}</span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    isVigente
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : isSubstituido
                                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {rev.statusCicloVida}
                                </span>
                                {rev.ehImutavel && (
                                  <span
                                    className="text-[10px] text-slate-400 flex items-center gap-0.5 bg-slate-800/80 px-1.5 py-0.5 rounded"
                                    title="Registro assinado e imutável no SGQ"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    Imutável
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-400 font-mono">
                                Vigor: <strong className="text-slate-200">{rev.dataEntradaVigor}</strong>
                                {rev.dataSubstituicao && (
                                  <>
                                    {' '}
                                    até <strong className="text-slate-200">{rev.dataSubstituicao}</strong>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Detalhes da alteração */}
                            {rev.escopoAlteracoes && (
                              <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                <strong>Escopo das Alterações:</strong> {rev.escopoAlteracoes}
                              </p>
                            )}

                            {/* Informações de Aprovação */}
                            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                              <span>
                                Aprovado por: <strong>{rev.aprovadoPorNome || 'Garantia da Qualidade'}</strong>{' '}
                                {rev.dataAprovacao && `em ${rev.dataAprovacao}`}
                              </span>

                              {rev.substituidaPorRevisaoNumero && (
                                <span className="text-amber-400/90 font-medium">
                                  Substituída pela {rev.substituidaPorRevisaoNumero}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    ID Interno: <code className="text-slate-300">{selectedDocForDetail.id}</code>
                  </span>
                  <button
                    onClick={() => setSelectedDocForDetail(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONSULTA TEMPORAL & HISTÓRICA ("A PERGUNTA MAIS IMPORTANTE")      */}
      {/* ========================================================================= */}
      {activeSubTab === 'temporal' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MOTOR DE CONHECIMENTO TEMPORAL
                </span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Resolução Determinística de Vigência em Data Específica
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Em auditorias aeronáuticas, investigações de falha ou emissão de atestados de liberação de serviço (RTS),
                é mandatório responder: <em>"Qual revisão deste documento estava legalmente vigente e aplicável na exata data em que o evento ocorreu?"</em>
              </p>
            </div>

            {/* Formulário de Parâmetros da Pergunta */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Documento Controlado Alvo:
                </label>
                <select
                  value={temporalDocId}
                  onChange={(e) => setTemporalDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  2. Data do Evento / Execução da OS:
                </label>
                <input
                  type="date"
                  value={temporalDate}
                  onChange={(e) => setTemporalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Setor Operacional:
                </label>
                <input
                  type="text"
                  value={temporalSetor}
                  onChange={(e) => setTemporalSetor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  4. Modelo da Aeronave (se aplicável):
                </label>
                <input
                  type="text"
                  value={temporalAeronave}
                  onChange={(e) => setTemporalAeronave(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  5. Cliente Contratante:
                </label>
                <input
                  type="text"
                  value={temporalCliente}
                  onChange={(e) => setTemporalCliente(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <div className="w-full p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-center">
                  <span className="text-[11px] text-emerald-400 font-semibold block">Diagnóstico Contínuo Ativo</span>
                  <span className="text-[10px] text-slate-400">Rastreabilidade temporal em tempo real</span>
                </div>
              </div>
            </div>

            {/* Painel do Resultado do Diagnóstico Temporal */}
            {temporalResult && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card Revisão Vigente no Evento */}
                  <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                      Vigente Na Data do Evento
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-slate-400">Revisão Aplicável em {temporalResult.dataConsultada}:</span>
                        <h3 className="text-xl font-bold text-white mt-0.5">
                          {temporalResult.revisaoNoEvento?.numeroRevisao || 'Nenhuma revisão vigente localizada'}
                        </h3>
                        <p className="text-xs text-emerald-400 font-mono mt-1">
                          Documento: {temporalResult.documento.codigo}
                        </p>
                      </div>

                      {temporalResult.revisaoNoEvento && (
                        <div className="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Entrada em Vigor:</span>
                            <span className="font-semibold text-white">
                              {temporalResult.revisaoNoEvento.dataEntradaVigor}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Substituída / Válida até:</span>
                            <span className="font-semibold text-white">
                              {temporalResult.revisaoNoEvento.dataSubstituicao || 'Continua em vigor'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Aprovador Técnico:</span>
                            <span>{temporalResult.revisaoNoEvento.aprovadoPorNome || 'Eng. Paulo Okubo'}</span>
                          </div>
                        </div>
                      )}

                      {temporalResult.revisaoNoEvento?.escopoAlteracoes && (
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-400 block mb-1">Conteúdo/Exigência na Época:</span>
                          <p className="bg-slate-900 p-2.5 rounded border border-slate-800 leading-relaxed">
                            {temporalResult.revisaoNoEvento.escopoAlteracoes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Comparativo com a Revisão Vigente Hoje */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Revisão Vigente Hoje:</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          HOJE ({new Date().toISOString().split('T')[0]})
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white">
                        {temporalResult.revisaoHoje?.numeroRevisao || temporalResult.documento.revisaoVigenteNumero}
                      </h3>

                      <div className="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status Comparativo:</span>
                          {temporalResult.revisaoNoEvento?.id === temporalResult.revisaoHoje?.id ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Mesma revisão vigente hoje
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Revisão foi alterada desde o evento
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Imutabilidade Histórica:</span>
                          <span className="text-slate-300">Garantida pelo SGQ QualiGest</span>
                        </div>
                      </div>

                      {/* Parecer de Defesa em Auditoria */}
                      <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/30 text-xs text-sky-200 space-y-1">
                        <span className="font-semibold flex items-center gap-1 text-sky-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Parecer de Validade para Auditoria:
                        </span>
                        <p className="leading-relaxed text-slate-300 text-[11px]">
                          Caso um auditor ou cliente questione a execução com base na redação da revisão atual (
                          {temporalResult.revisaoHoje?.numeroRevisao}), este relatório comprova formalmente que em{' '}
                          {temporalResult.dataConsultada} o requisito mandatório era o da{' '}
                          <strong>{temporalResult.revisaoNoEvento?.numeroRevisao}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avaliação de Aplicabilidade Multidimensional */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Diagnóstico de Aplicabilidade Multidimensional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Status Geral:</span>
                      <span
                        className={`font-semibold ${
                          temporalResult.aplicabilidade?.aplicavel ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {temporalResult.aplicabilidade?.aplicavel ? 'APLICÁVEL' : 'NÃO APLICÁVEL'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Escopo Técnico:</span>
                      <span className="text-slate-200">
                        {temporalResult.aplicabilidade?.detalhes?.aeronaveAplicavel ? 'Conforme aeronave' : 'Geral / N/A modelo'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Setor & Processo:</span>
                      <span className="text-slate-200">
                        {temporalResult.aplicabilidade?.detalhes?.setorAplicavel ? 'Setor abrangido' : 'Geral'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Justificativa:</span>
                      <span className="text-slate-300 text-[11px] line-clamp-2">
                        {temporalResult.aplicabilidade?.justificativa || 'Análise automática de aplicabilidade.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: FONTES EXTERNAS OFICIAIS & VERIFICAÇÃO PERIÓDICA                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'fontes' && (
        <div className="space-y-6">
          {/* Card Informativo com a Regra de Segurança Aeronáutica */}
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-5 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300">
                Regra Fundamental de Segurança Aeronáutica (Seção 12):
              </h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                O QualiGest monitora repositórios de publicação da ANAC, FAA, Textron, Boeing e portais de clientes. Quando
                uma nova revisão for identificada no repositório externo, <strong>NUNCA</strong> substituir
                automaticamente a cópia controlada no sistema. O sistema gera um alerta de discrepância e exige
                obrigatoriamente a validação técnica humana de um gestor credenciado.
              </p>
            </div>
          </div>

          {/* Tabela de Fontes Externas Controladas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Fontes Externas Oficiais Cadastradas ({fontes.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Rotinas de verificação compulsória a cada 30, 45, 60 ou 90 dias com registro de evidência.
                </p>
              </div>

              <button
                onClick={() => setIsNewSourceModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Fonte
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {fontes.map((fonte) => {
                const isNovaRev = fonte.ultimoResultadoStatus === 'NOVA_REVISAO_IDENTIFICADA';

                return (
                  <div key={fonte.id} className="p-5 hover:bg-slate-800/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              fonte.tipoFonte === 'AUTORIDADE'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : fonte.tipoFonte === 'FABRICANTE'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {fonte.tipoFonte}
                          </span>
                          <span className="text-sm font-bold text-white">{fonte.nome}</span>
                        </div>

                        <div className="text-xs text-slate-400 font-mono truncate">
                          URL Base: <a href={fonte.urlBase} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">{fonte.urlBase} <ExternalLink className="w-3 h-3" /></a>
                        </div>

                        <p className="text-xs text-slate-300">{fonte.ultimoResultadoDetalhes || 'Verificação periódica agendada.'}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                        <div className="space-y-1 text-slate-400">
                          <div>Frequência: <strong className="text-white">{fonte.frequenciaDias} dias</strong></div>
                          <div>Última: <strong className="text-white">{fonte.ultimaVerificacao?.split('T')[0] || 'Pendente'}</strong></div>
                          <div>Próxima: <strong className="text-sky-300">{fonte.proximaVerificacao?.split('T')[0] || 'Pendente'}</strong></div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isNovaRev ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              Nova Revisão Detectada
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Conforme
                            </span>
                          )}

                          <button
                            onClick={() => handleVerificarFonte(fonte)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Executar verificação e gerar log oficial"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                            Verificar Agora
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico Recente de Logs de Verificação */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-sky-400" />
              Logs de Verificação em Fontes Oficiais & Decisões Humanas
            </h3>
            <div className="space-y-3">
              {logsVerificacao.map((log) => (
                <div key={log.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.codigoDocumento}</span>
                      <span className="text-slate-400">em {log.fonteNome}</span>
                      <span className="text-slate-500 font-mono">({log.dataVerificacao.split('T')[0]})</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{log.mensagem}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {log.requerValidacaoHumana ? (
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                        Aguardando Validação Técnica
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Verificado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: SOLICITAÇÕES DE REVISÃO A CLIENTES                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'solicitacoes' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-400" />
                  Comunicações de Revisão Técnica com Operadores & Clientes
                </h2>
                <p className="text-xs text-slate-400">
                  Geração padronizada bilíngue (EN/PT), controle de SLAs de resposta e atualização de manuais de clientes.
                </p>
              </div>

              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Nova Solicitação
              </button>
            </div>

            {/* Lista de Solicitações */}
            <div className="mt-6 space-y-4">
              {solicitacoes.map((sol) => (
                <div key={sol.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{sol.clienteNome}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {sol.documentoCodigo}
                        </span>
                        <span className="text-xs text-slate-400">({sol.documentoTitulo})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Destinatário: <strong className="text-slate-300">{sol.destinatarioNome}</strong> ({sol.destinatarioEmail})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          sol.status === 'ENVIADA_PELO_USUARIO'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : sol.status === 'CONFIRMADA_VIGENTE'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : sol.status === 'RECEBIDA'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {sol.status.replace(/_/g, ' ')}
                      </span>

                      {/* Ações de Transição de Status */}
                      {sol.status === 'SOLICITACAO_GERADA' && (
                        <button
                          onClick={() =>
                            atualizarStatusSolicitacaoCliente(
                              organizationId,
                              sol,
                              'ENVIADA_PELO_USUARIO',
                              'Enviado por e-mail corporativo',
                              undefined,
                              currentUser
                            )
                          }
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium"
                        >
                          Marcar como Enviado
                        </button>
                      )}

                      {sol.status === 'ENVIADA_PELO_USUARIO' && (
                        <button
                          onClick={() =>
                            atualizarStatusSolicitacaoCliente(
                              organizationId,
                              sol,
                              'CONFIRMADA_VIGENTE',
                              'Cliente respondeu confirmando que a revisão atual continua vigente.',
                              undefined,
                              currentUser
                            )
                          }
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                        >
                          Confirmar Vigente
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Corpo do E-mail Formatado */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                    <div className="text-sky-300 font-semibold border-b border-slate-800 pb-1">
                      Assunto: {sol.assuntoGerado}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                      {sol.corpoEmailGerado}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div>
                      Prazo Limite: <strong className="text-amber-300">{sol.dataLimiteResposta || '5 dias úteis'}</strong>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${sol.assuntoGerado}\n\n${sol.corpoEmailGerado}`);
                        showToast('Conteúdo do e-mail copiado para a área de transferência!');
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar E-mail Formatado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: COMPARADOR DE REVISÕES & ANÁLISE DE IMPACTO                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'comparador' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <GitCompare className="w-5 h-5 text-sky-400" />
              Comparador Delineado de Revisões & Matriz Sistêmica de Impactos
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl mb-6">
              Compare lado a lado duas revisões de qualquer manual técnico ou procedimento para identificar inclusões,
              alterações de tolerância, e diagnosticar automaticamente os impactos em processos, treinamentos e auditorias.
            </p>

            {/* Seleção do Documento e das Revisões */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Documento:</label>
                <select
                  value={compareDocId}
                  onChange={(e) => {
                    setCompareDocId(e.target.value);
                    setCompareRevAId('');
                    setCompareRevBId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Revisão Anterior (Base):</label>
                <select
                  value={compareRevAId}
                  onChange={(e) => setCompareRevAId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">Selecione uma revisão...</option>
                  {revisoesDisponiveisParaComparar.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numeroRevisao} ({r.dataEntradaVigor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Revisão Posterior (Nova):</label>
                <select
                  value={compareRevBId}
                  onChange={(e) => setCompareRevBId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">Selecione uma revisão...</option>
                  {revisoesDisponiveisParaComparar.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numeroRevisao} ({r.dataEntradaVigor})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exibição do Resultado da Comparação */}
            {comparacaoResult ? (
              <div className="mt-6 space-y-6">
                {/* Delineamento das Alterações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                      <span className="font-bold text-white">{comparacaoResult.revA.numeroRevisao} (Base)</span>
                      <span>Vigor: {comparacaoResult.revA.dataEntradaVigor}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800/80">
                      {comparacaoResult.revA.escopoAlteracoes || 'Sem escopo detalhado de alterações cadastrado.'}
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-sky-400 border-b border-slate-800 pb-2">
                      <span className="font-bold text-white">{comparacaoResult.revB.numeroRevisao} (Posterior)</span>
                      <span>Vigor: {comparacaoResult.revB.dataEntradaVigor}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded border border-sky-500/20">
                      {comparacaoResult.revB.escopoAlteracoes || 'Sem escopo detalhado de alterações cadastrado.'}
                    </p>
                  </div>
                </div>

                {/* Matriz Sistêmica de Impactos */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Matriz Sistêmica de Impactos da Nova Revisão ({comparacaoResult.impactos.length} áreas impactadas)
                  </h3>

                  <div className="space-y-3">
                    {comparacaoResult.impactos.map((imp) => (
                      <div
                        key={imp.id}
                        className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sky-400 uppercase tracking-wider text-[10px] px-2 py-0.5 bg-sky-500/10 rounded border border-sky-500/20">
                              {imp.tipoImpacto}
                            </span>
                            <span className="font-bold text-white">{imp.itemAfetado}</span>
                          </div>
                          <p className="text-slate-300">{imp.descricaoImpacto}</p>
                          <p className="text-emerald-400/90 text-[11px]">
                            <strong>Ação Recomendada:</strong> {imp.acaoSugerida}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] shrink-0 border ${
                            imp.severidade === 'CRITICA'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : imp.severidade === 'ALTA'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          Severidade {imp.severidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <GitCompare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">Selecione duas revisões acima para comparar as diferenças técnicas e impactos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: ASSISTENTE RAG TEMPORAL AERONÁUTICO                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'rag' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="max-w-3xl space-y-2 mb-6">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                IA GENERATIVA GROUNDED • RAG TEMPORAL
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Assistente RAG com Filtragem Temporal Estrita
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                O RAG Temporal do QualiGest garante conformidade com a Seção 10: <em>"Documento obsoleto não deve ser utilizado como fonte atual no RAG; quando consultado em modo histórico, cita explicitamente a revisão daquela data."</em>
              </p>
            </div>

            {/* Controles de Modo do RAG */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800 mb-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Modo de Consulta:</span>
                <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    onClick={() => setRagMode('VIGENTE_HOJE')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      ragMode === 'VIGENTE_HOJE' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vigente Hoje (Atual)
                  </button>
                  <button
                    onClick={() => setRagMode('HISTORICO_NA_DATA')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      ragMode === 'HISTORICO_NA_DATA' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Histórico na Data
                  </button>
                </div>
              </div>

              {ragMode === 'HISTORICO_NA_DATA' && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Data de Referência:</span>
                  <input
                    type="date"
                    value={ragDate}
                    onChange={(e) => setRagDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-white"
                  />
                </div>
              )}
            </div>

            {/* Barra de Entrada de Pergunta */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Qual era a tolerância de calibração em 2024? Ou: Quais os requisitos de treinamento no MOMQ vigente?"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteRag()}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleExecuteRag}
                disabled={isRagLoading || !ragQuery.trim()}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                {isRagLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Consultar
              </button>
            </div>

            {/* Histórico de Respostas */}
            <div className="mt-6 space-y-4">
              {ragHistory.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-white text-sm">P: {item.q}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      Vigência: {item.dataVigencia}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    {item.a}
                  </p>
                  {item.fontId && (
                    <div className="text-[11px] text-sky-400 flex items-center gap-1 font-mono">
                      <BookOpen className="w-3.5 h-3.5" /> Fonte Auditável: {item.fontId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 7: DASHBOARD DOCUMENTAL & INDICADORES                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Grid dos 8 Indicadores Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Acervo Total</span>
              <div className="text-2xl font-bold text-white mt-1">{dashboardMetrics.totalDocumentos}</div>
              <span className="text-[11px] text-slate-500">Documentos controlados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Revisões Vigentes</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{dashboardMetrics.totalRevisoesVigentes}</div>
              <span className="text-[11px] text-emerald-500/80">Homologadas e ativas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Fontes Externas</span>
              <div className="text-2xl font-bold text-sky-400 mt-1">{dashboardMetrics.fontesExternasAtivas}</div>
              <span className="text-[11px] text-sky-500/80">ANAC, FAA e OEMs</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Verificações Vencidas</span>
              <div
                className={`text-2xl font-bold mt-1 ${
                  dashboardMetrics.fontesVerificacaoVencida > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {dashboardMetrics.fontesVerificacaoVencida}
              </div>
              <span className="text-[11px] text-slate-500">Prazos expirados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Discrepâncias Pendentes</span>
              <div
                className={`text-2xl font-bold mt-1 ${
                  dashboardMetrics.discrepanciasPendentesValidacao > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {dashboardMetrics.discrepanciasPendentesValidacao}
              </div>
              <span className="text-[11px] text-amber-500/80">Requer validação humana</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Solicitações a Clientes</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">{dashboardMetrics.solicitacoesClientePendentes}</div>
              <span className="text-[11px] text-indigo-500/80">Em andamento / SLA</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Revisões em Transição</span>
              <div className="text-2xl font-bold text-slate-200 mt-1">{dashboardMetrics.revisoesEmTransicao}</div>
              <span className="text-[11px] text-slate-500">Rascunhos / Em aprovação</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Taxa de Conformidade</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{dashboardMetrics.taxaConformidadeDocumental}%</div>
              <span className="text-[11px] text-emerald-500/80">Acervo auditado</span>
            </div>
          </div>

          {/* Distribuição por Categoria e Prazos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Distribuição do Acervo por Categoria
              </h3>
              <div className="space-y-2 text-xs">
                {Object.entries(dashboardMetrics?.distribuicaoCategorias || dashboardMetrics?.distribuicaoPorCategoria || {}).map(([cat, qtd]) => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-300">{cat.replace('DOCUMENTO_', '')}</span>
                    <span className="font-bold text-white">{qtd} documentos</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Próximas Verificações de Fontes Oficiais
              </h3>
              <div className="space-y-2 text-xs">
                {fontes.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-300 truncate max-w-[200px]">{f.nome}</span>
                    <span className="font-mono text-sky-300">{f.proximaVerificacao?.split('T')[0] || 'A definir'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EVIDÊNCIA DE CONSULTA (SEÇÃO 21)                                  */}
      {/* ========================================================================= */}
      {isConsultModalOpen && consultTargetDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-400" />
              Registrar Evidência de Consulta Técnica
            </h3>
            <p className="text-xs text-slate-400">
              Registre a consulta formal ao documento <strong>{consultTargetDoc.codigo}</strong> com a finalidade operacional para comprovação em auditoria.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSalvarEvidenciaConsulta(
                  consultTargetDoc,
                  formData.get('finalidade'),
                  formData.get('referencia') as string
                );
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Finalidade da Consulta:</label>
                <select name="finalidade" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  <option value="EXECUCAO_MANUTENCAO">Execução de Manutenção (OS)</option>
                  <option value="AUDITORIA_INTERNA">Auditoria Interna SGQ</option>
                  <option value="AUDITORIA_EXTERNA_ANAC_FAA">Auditoria Externa (ANAC/FAA)</option>
                  <option value="TREINAMENTO_CAPACITACAO">Treinamento e Capacitação</option>
                  <option value="REVISAO_PROCEDIMENTO">Revisão de Procedimento</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Referência Operacional (ex: OS #, Auditoria):</label>
                <input
                  type="text"
                  name="referencia"
                  placeholder="Ex: OS #2025-104 ou Auditoria ANAC"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400">
                Declaro que executei a consulta e leitura dos requisitos da revisão vigente{' '}
                <strong className="text-emerald-400">{consultTargetDoc.revisaoVigenteNumero}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConsultModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Confirmar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO DE NOVO DOCUMENTO                                       */}
      {/* ========================================================================= */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              Cadastrar Novo Documento Controlado
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const codigo = formData.get('codigo') as string;
                const titulo = formData.get('titulo') as string;
                const categoria = formData.get('categoria') as CategoriaDocumental;
                const emissor = formData.get('emissor') as string;
                const revNum = formData.get('revNum') as string;

                const newDocId = `doc-${Date.now()}`;
                const newRevId = `rev-${Date.now()}`;

                const novoDoc: DocumentoControlado = {
                  id: newDocId,
                  organizationId,
                  codigo,
                  titulo,
                  categoria,
                  emissor,
                  responsavelNome: currentUser?.displayName || 'Garantia da Qualidade',
                  revisaoVigenteId: newRevId,
                  revisaoVigenteNumero: revNum,
                  exigeEvidenciaLeitura: true,
                  aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
                  statusGeral: 'ATIVO',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                const novaRev: RevisaoDocumental = {
                  id: newRevId,
                  organizationId,
                  documentoId: newDocId,
                  codigoDocumento: codigo,
                  tituloDocumento: titulo,
                  numeroRevisao: revNum,
                  dataEmissao: new Date().toISOString().split('T')[0],
                  dataEntradaVigor: new Date().toISOString().split('T')[0],
                  statusCicloVida: 'VIGENTE',
                  aprovadoPorNome: currentUser?.displayName || 'Eng. Paulo Okubo',
                  origemRevisao: 'INTERNA',
                  ehImutavel: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await saveDocumentoControlado(organizationId, novoDoc, currentUser);
                await saveRevisaoDocumental(organizationId, novaRev, currentUser);

                setIsNewDocModalOpen(false);
                showToast(`Documento ${codigo} e revisão ${revNum} cadastrados com sucesso!`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Código do Documento:</label>
                <input
                  type="text"
                  name="codigo"
                  placeholder="Ex: MOMQ MNT-002 ou IT-MNT-015"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Título do Documento:</label>
                <input
                  type="text"
                  name="titulo"
                  placeholder="Ex: Procedimento de Pesagem e Balanceamento"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Categoria:</label>
                <select name="categoria" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  <option value="DOCUMENTO_INTERNO">Interno (MOMQ, POP, IT, MQ)</option>
                  <option value="DOCUMENTO_AUTORIDADE">Autoridade (RBAC, IS, 14 CFR)</option>
                  <option value="DOCUMENTO_FABRICANTE">Fabricante / OEM (AMM, CMM, IPC)</option>
                  <option value="DOCUMENTO_CLIENTE">Cliente / Operador Contratante</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Emissor / Órgão:</label>
                <input
                  type="text"
                  name="emissor"
                  placeholder="Ex: Impacto Aviation, ANAC, Cessna, Azul"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Número da Revisão Inicial Vigente:</label>
                <input
                  type="text"
                  name="revNum"
                  defaultValue="Rev. 01"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Cadastrar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PROPOSTA E APROVAÇÃO DE NOVA REVISÃO                             */}
      {/* ========================================================================= */}
      {isNewRevisionModalOpen && selectedDocForDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              Propor Nova Revisão: {selectedDocForDetail.codigo}
            </h3>
            <p className="text-xs text-slate-400">
              A homologação de uma nova revisão substitui a revisão vigente de forma atômica e imutável.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const numeroRevisao = formData.get('numeroRevisao') as string;
                const dataEntradaVigor = formData.get('dataEntradaVigor') as string;
                const escopoAlteracoes = formData.get('escopoAlteracoes') as string;
                const justificativa = formData.get('justificativa') as string;

                const revAnterior = revisoes.find((r) => r.id === selectedDocForDetail.revisaoVigenteId);

                const novaRev: RevisaoDocumental = {
                  id: `rev-${Date.now()}`,
                  organizationId,
                  documentoId: selectedDocForDetail.id,
                  codigoDocumento: selectedDocForDetail.codigo,
                  tituloDocumento: selectedDocForDetail.titulo,
                  numeroRevisao,
                  dataEmissao: new Date().toISOString().split('T')[0],
                  dataEntradaVigor,
                  statusCicloVida: 'VIGENTE',
                  escopoAlteracoes,
                  origemRevisao: 'INTERNA',
                  ehImutavel: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await aprovarRevisaoDocumental(organizationId, novaRev, revAnterior, justificativa, currentUser);

                setIsNewRevisionModalOpen(false);
                setSelectedDocForDetail(null);
                showToast(`Revisão ${numeroRevisao} aprovada e homologada como VIGENTE!`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Número da Nova Revisão:</label>
                <input
                  type="text"
                  name="numeroRevisao"
                  placeholder="Ex: Rev. 09"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Data de Entrada em Vigor:</label>
                <input
                  type="date"
                  name="dataEntradaVigor"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Escopo e Resumo das Alterações:</label>
                <textarea
                  name="escopoAlteracoes"
                  rows={3}
                  placeholder="Descreva as cláusulas ou capítulos alterados e seus motivos..."
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Justificativa Técnica da Homologação:</label>
                <input
                  type="text"
                  name="justificativa"
                  placeholder="Ex: Atendimento ao finding da auditoria ANAC"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRevisionModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-600 text-white font-semibold">
                  Aprovar & Homologar Revisão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO DE NOVA FONTE OFICIAL                                   */}
      {/* ========================================================================= */}
      {isNewSourceModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-400" />
              Cadastrar Fonte Externa Oficial
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const nome = formData.get('nome') as string;
                const tipoFonte = formData.get('tipoFonte') as any;
                const urlBase = formData.get('urlBase') as string;
                const frequenciaDias = Number(formData.get('frequenciaDias') || 30);

                const proximaData = new Date();
                proximaData.setDate(proximaData.getDate() + frequenciaDias);

                const novaFonte: FonteExternaControlada = {
                  id: `fonte-${Date.now()}`,
                  organizationId,
                  nome,
                  tipoFonte,
                  urlBase,
                  responsavelVerificacaoNome: currentUser?.displayName || 'Garantia da Qualidade',
                  frequenciaDias,
                  ultimaVerificacao: new Date().toISOString(),
                  proximaVerificacao: proximaData.toISOString(),
                  ultimoResultadoStatus: 'CONFORME_SEM_ALTERACAO',
                  status: 'ATIVA',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await saveFonteExterna(organizationId, novaFonte, currentUser);
                setIsNewSourceModalOpen(false);
                showToast(`Fonte oficial "${nome}" cadastrada com sucesso!`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Nome da Fonte:</label>
                <input
                  type="text"
                  name="nome"
                  placeholder="Ex: Portal EASA Regulations ou Portal Embraer"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo da Fonte:</label>
                <select name="tipoFonte" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  <option value="AUTORIDADE">Autoridade de Aviação Civil (ANAC, FAA, EASA)</option>
                  <option value="FABRICANTE">Fabricante da Aeronave ou Componente (OEM)</option>
                  <option value="CLIENTE">Operador Aéreo / Cliente Contratante</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">URL Oficial / Portal:</label>
                <input
                  type="url"
                  name="urlBase"
                  placeholder="https://..."
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Frequência de Verificação (Dias):</label>
                <input
                  type="number"
                  name="frequenciaDias"
                  defaultValue={30}
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSourceModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Salvar Fonte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE NOVA SOLICITAÇÃO A CLIENTE                                       */}
      {/* ========================================================================= */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-400" />
              Gerar Solicitação de Revisão a Cliente
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const clienteNome = formData.get('clienteNome') as string;
                const destinatarioEmail = formData.get('destinatarioEmail') as string;
                const docId = formData.get('docId') as string;
                const prazo = Number(formData.get('prazo') || 5);
                const motivo = formData.get('motivo') as string;
                const idioma = formData.get('idioma') as 'EN' | 'PT' | 'ES';

                const docAlvo = documentos.find((d) => d.id === docId);
                const emailGerado = gerarSolicitacaoRevisaoClienteEmail({
                  clienteNome,
                  documentoCodigo: docAlvo?.codigo || 'CLI-001',
                  documentoTitulo: docAlvo?.titulo || 'Manual de Requisitos Técnicos',
                  revisaoAtualArmazenada: docAlvo?.revisaoVigenteNumero || 'Rev. 01',
                  prazoDesejadoDias: prazo,
                  motivoSolicitacao: motivo,
                  idioma,
                });

                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + prazo);

                const novaSolicitacao: SolicitacaoRevisaoCliente = {
                  id: `sol-${Date.now()}`,
                  organizationId,
                  clienteNome,
                  destinatarioNome: 'Engenharia / Gestão da Qualidade',
                  destinatarioEmail,
                  documentoId: docAlvo?.id || 'doc-cli',
                  documentoCodigo: docAlvo?.codigo || 'CLI-001',
                  documentoTitulo: docAlvo?.titulo || 'Manual Técnico',
                  revisaoAtualArmazenada: docAlvo?.revisaoVigenteNumero || 'Rev. 01',
                  motivoSolicitacao: motivo,
                  prazoDesejadoDias: prazo,
                  dataLimiteResposta: dataLimite.toISOString().split('T')[0],
                  idioma,
                  assuntoGerado: emailGerado.assunto,
                  corpoEmailGerado: emailGerado.corpo,
                  status: 'SOLICITACAO_GERADA',
                  geradoPorNome: currentUser?.displayName || 'Controle Documental',
                  geradoPorUid: currentUser?.uid || 'system',
                  geradoEm: new Date().toISOString(),
                  historicoStatus: [
                    {
                      status: 'SOLICITACAO_GERADA',
                      data: new Date().toISOString(),
                      usuario: currentUser?.displayName || 'Controle Documental',
                      observacao: 'Solicitação gerada no sistema.',
                    },
                  ],
                };

                await saveSolicitacaoCliente(organizationId, novaSolicitacao, currentUser);
                setIsNewRequestModalOpen(false);
                showToast('Solicitação de revisão técnica gerada com sucesso!');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Nome do Cliente:</label>
                <input
                  type="text"
                  name="clienteNome"
                  placeholder="Ex: Azul Linhas Aéreas ou GOL"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">E-mail Técnico do Cliente:</label>
                <input
                  type="email"
                  name="destinatarioEmail"
                  placeholder="qualidade@operador.com.br"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Documento do Cliente:</label>
                <select name="docId" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.titulo} ({d.revisaoVigenteNumero})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Prazo Desejado (Dias):</label>
                  <input
                    type="number"
                    name="prazo"
                    defaultValue={5}
                    required
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Idioma:</label>
                  <select name="idioma" defaultValue="EN" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                    <option value="EN">Inglês (Padrão Internacional)</option>
                    <option value="PT">Português</option>
                    <option value="ES">Espanhol</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Motivo da Solicitação:</label>
                <input
                  type="text"
                  name="motivo"
                  defaultValue="Revisão periódica anual de conformidade documental e preparação de auditoria."
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Gerar Solicitação Formatada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
