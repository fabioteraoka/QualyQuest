import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plane,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Send,
  MessageSquare,
  FileCheck,
  ShieldAlert,
  ChevronRight,
  Download,
  Copy,
  ExternalLink,
  HelpCircle,
  Calendar,
  User,
  Phone,
  Mail,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import {
  DocumentoControlado,
  SolicitacaoRevisaoCliente,
  ClienteExterno,
  UserProfile,
  InteracaoCobrancaItem,
  CanalCobrancaDocumental,
  ResultadoAcaoCobranca,
} from '../types';
import {
  calcularMetricasEmpresasFrotas,
  compararRevisaoRecebidaComReferencia,
  verificarAtrasoPrazoSolicitacao,
  prepararMensagemCobranca,
} from '../services/clientFleetDocumentService';
import {
  registrarInteracaoCobranca,
  registrarRecebimentoDocumento,
  registrarConferenciaDocumento,
  encerrarSolicitacaoDocumentoControlado,
  saveDocumentoControlado,
  saveSolicitacaoCliente,
} from '../services/firebase/documentControlFirestore';

interface ClientFleetDocumentControlViewProps {
  organizationId: string;
  documentos: DocumentoControlado[];
  solicitacoes: SolicitacaoRevisaoCliente[];
  clientes: ClienteExterno[];
  currentUser?: UserProfile | null;
  onRefresh?: () => void;
  showToast?: (msg: string) => void;
  onOpenFilePreview?: (doc: DocumentoControlado) => void;
}

export const ClientFleetDocumentControlView: React.FC<ClientFleetDocumentControlViewProps> = ({
  organizationId,
  documentos,
  solicitacoes,
  clientes,
  currentUser,
  onRefresh,
  showToast,
  onOpenFilePreview,
}) => {
  // Navegação Interna da Visão
  const [activeTab, setActiveTab] = useState<'geral' | 'empresas' | 'cobrancas' | 'relatorio'>('geral');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('TODAS');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipoDoc, setSelectedTipoDoc] = useState<string>('TODOS');
  const [selectedFrota, setSelectedFrota] = useState<string>('TODAS');
  const [selectedSituacaoRecebimento, setSelectedSituacaoRecebimento] = useState<string>('TODAS');

  // Modais
  const [isCobrancaModalOpen, setIsCobrancaModalOpen] = useState(false);
  const [selectedDocForCobranca, setSelectedDocForCobranca] = useState<DocumentoControlado | null>(null);
  const [selectedSolicitacaoForCobranca, setSelectedSolicitacaoForCobranca] = useState<SolicitacaoRevisaoCliente | null>(null);

  const [isRecebimentoModalOpen, setIsRecebimentoModalOpen] = useState(false);
  const [selectedDocForRecebimento, setSelectedDocForRecebimento] = useState<DocumentoControlado | null>(null);

  const [isConferenciaModalOpen, setIsConferenciaModalOpen] = useState(false);
  const [selectedDocForConferencia, setSelectedDocForConferencia] = useState<DocumentoControlado | null>(null);

  const [isNovoDocModalOpen, setIsNovoDocModalOpen] = useState(false);

  // Estados de Formulário
  const [cobrancaCanal, setCobrancaCanal] = useState<CanalCobrancaDocumental>('EMAIL');
  const [cobrancaResultado, setCobrancaResultado] = useState<ResultadoAcaoCobranca>('MENSAGEM_ENVIADA');
  const [cobrancaObservacao, setCobrancaObservacao] = useState('');
  const [cobrancaNovaData, setCobrancaNovaData] = useState('');
  const [cobrancaIdioma, setCobrancaIdioma] = useState<'PT' | 'EN'>('PT');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const [recRevisao, setRecRevisao] = useState('');
  const [recData, setRecData] = useState(new Date().toISOString().split('T')[0]);
  const [recArquivoNome, setRecArquivoNome] = useState('');

  const [confAprovado, setConfAprovado] = useState(true);
  const [confParecer, setConfParecer] = useState('');
  const [confRevisaoFinal, setConfRevisaoFinal] = useState('');

  // Cálculo de Métricas com Dados Reais
  const metricas = useMemo(() => {
    return calcularMetricasEmpresasFrotas(documentos, solicitacoes, clientes);
  }, [documentos, solicitacoes, clientes]);

  // Lista de Documentos de Clientes
  const docsClientes = useMemo(() => {
    return documentos.filter(
      (d) =>
        d.categoria === 'DOCUMENTO_CLIENTE' ||
        d.tipoOrigemDocumental === 'CLIENTE' ||
        Boolean(d.clienteId) ||
        Boolean(d.proprietarioCessor && d.proprietarioCessor !== 'IMPACTO')
    );
  }, [documentos]);

  // Lista de Frotas Únicas presentes nos documentos
  const frotasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    docsClientes.forEach((d) => {
      if (d.frota && d.frota.trim()) set.add(d.frota.trim());
      if (d.frotas) d.frotas.forEach((f) => f && set.add(f.trim()));
    });
    return Array.from(set).sort();
  }, [docsClientes]);

  // Filtro de Documentos
  const docsFiltrados = useMemo(() => {
    return docsClientes.filter((d) => {
      if (selectedClienteId !== 'TODAS' && d.clienteId !== selectedClienteId) {
        return false;
      }
      if (selectedTipoDoc !== 'TODOS') {
        if (selectedTipoDoc === 'MEL' && !d.codigo.toUpperCase().includes('MEL') && d.tipoDocumentalTecnico !== 'MEL') {
          return false;
        }
        if (selectedTipoDoc === 'AMM' && !d.codigo.toUpperCase().includes('AMM') && d.tipoDocumentalTecnico !== 'AMM') {
          return false;
        }
        if (selectedTipoDoc === 'IPC' && !d.codigo.toUpperCase().includes('IPC') && d.tipoDocumentalTecnico !== 'IPC') {
          return false;
        }
      }
      if (selectedFrota !== 'TODAS') {
        const hasFrota =
          d.frota?.toLowerCase().includes(selectedFrota.toLowerCase()) ||
          d.frotas?.some((f) => f.toLowerCase().includes(selectedFrota.toLowerCase()));
        if (!hasFrota) return false;
      }
      if (selectedSituacaoRecebimento !== 'TODAS') {
        const sit = d.situacaoRecebimento || 'PENDENTE_SOLICITACAO';
        if (sit !== selectedSituacaoRecebimento) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          d.codigo.toLowerCase().includes(q) ||
          d.titulo.toLowerCase().includes(q) ||
          (d.clienteNome && d.clienteNome.toLowerCase().includes(q)) ||
          (d.frota && d.frota.toLowerCase().includes(q)) ||
          (d.modeloAeronave && d.modeloAeronave.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [docsClientes, selectedClienteId, selectedTipoDoc, selectedFrota, selectedSituacaoRecebimento, searchTerm]);

  // Helper para Encontrar Solicitação do Documento
  const getSolicitacaoDoc = (docId: string): SolicitacaoRevisaoCliente | undefined => {
    return solicitacoes.find((s) => s.documentoId === docId && s.status !== 'SOLICITACAO_ENCERRADA');
  };

  // Handlers de Ações
  const handleOpenCobranca = (doc: DocumentoControlado) => {
    setSelectedDocForCobranca(doc);
    const sol = getSolicitacaoDoc(doc.id);
    setSelectedSolicitacaoForCobranca(sol || null);
    setCobrancaCanal(sol?.canalContato || 'EMAIL');
    setCobrancaResultado('MENSAGEM_ENVIADA');
    setCobrancaObservacao('');
    setCobrancaNovaData('');
    // Idioma
    const clienteNomeUpper = (doc.clienteNome || '').toUpperCase();
    if (clienteNomeUpper.includes('ATLAS') || clienteNomeUpper.includes('KALITTA') || clienteNomeUpper.includes('SWISS')) {
      setCobrancaIdioma('EN');
    } else {
      setCobrancaIdioma('PT');
    }
    setCopiedMsg(false);
    setIsCobrancaModalOpen(true);
  };

  const handleSalvarInteracaoCobranca = async () => {
    if (!selectedDocForCobranca) return;
    try {
      let sol = selectedSolicitacaoForCobranca;
      if (!sol) {
        // Cria solicitação inicial se ainda não existia
        const solId = `sol-${Date.now()}-${selectedDocForCobranca.id}`;
        const msg = prepararMensagemCobranca(selectedDocForCobranca, null, cobrancaIdioma);
        const novaSol: SolicitacaoRevisaoCliente = {
          id: solId,
          organizationId,
          clienteId: selectedDocForCobranca.clienteId,
          clienteNome: selectedDocForCobranca.clienteNome || 'Cliente',
          frota: selectedDocForCobranca.frota,
          modeloAeronave: selectedDocForCobranca.modeloAeronave,
          documentoId: selectedDocForCobranca.id,
          documentoCodigo: selectedDocForCobranca.codigo,
          documentoTitulo: selectedDocForCobranca.titulo,
          revisaoAtualArmazenada: selectedDocForCobranca.numeroRevisao || 'N/D',
          motivoSolicitacao: 'Acompanhamento periódico de vigência documental de frota',
          idioma: cobrancaIdioma,
          assuntoGerado: msg.assunto,
          corpoEmailGerado: msg.corpo,
          status: 'SOLICITACAO_ENVIADA',
          canalContato: cobrancaCanal,
          geradoPorNome: currentUser?.displayName || 'Gestor SGQ',
          geradoPorUid: currentUser?.uid || 'user',
          geradoEm: new Date().toISOString(),
          prazoRetornoData: cobrancaNovaData || undefined,
          historicoStatus: [
            {
              status: 'SOLICITACAO_ENVIADA',
              data: new Date().toISOString(),
              usuario: currentUser?.displayName || 'Gestor SGQ',
              observacao: 'Solicitação inicial gerada e registrada no controle de frotas.',
            },
          ],
        };
        await saveSolicitacaoCliente(organizationId, novaSol, currentUser);
        sol = novaSol;
      }

      const interacao: InteracaoCobrancaItem = {
        id: `inter-${Date.now()}`,
        data: new Date().toISOString(),
        responsavelNome: currentUser?.displayName || 'Gestor SGQ',
        responsavelUid: currentUser?.uid,
        contatoNome: selectedDocForCobranca.contatoFornecedorNome,
        contatoCanal: cobrancaCanal,
        resultadoAcao: cobrancaResultado,
        observacao: cobrancaObservacao.trim(),
        novaDataCombinada: cobrancaNovaData || undefined,
      };

      const novoStatus = cobrancaResultado === 'ARQUIVO_RECEBIDO' ? 'DOCUMENTO_RECEBIDO' : 'AGUARDANDO_RETORNO';
      await registrarInteracaoCobranca(organizationId, sol, interacao, novoStatus, currentUser);

      // Atualiza situação de recebimento no documento se ainda estava pendente
      if (selectedDocForCobranca.situacaoRecebimento === 'PENDENTE_SOLICITACAO') {
        await saveDocumentoControlado(
          organizationId,
          {
            ...selectedDocForCobranca,
            situacaoRecebimento: 'SOLICITADO',
            updatedAt: new Date().toISOString(),
          },
          currentUser
        );
      }

      setIsCobrancaModalOpen(false);
      showToast?.('Interação de cobrança registrada com sucesso no histórico auditável!');
      onRefresh?.();
    } catch (err: any) {
      alert(`Erro ao registrar cobrança: ${err.message || 'Falha inesperada'}`);
    }
  };

  const handleOpenRecebimento = (doc: DocumentoControlado) => {
    setSelectedDocForRecebimento(doc);
    setRecRevisao(doc.revisaoOficialReferencia || doc.numeroRevisao || '');
    setRecData(new Date().toISOString().split('T')[0]);
    setRecArquivoNome('');
    setIsRecebimentoModalOpen(true);
  };

  const handleSalvarRecebimento = async () => {
    if (!selectedDocForRecebimento) return;
    if (!recRevisao.trim()) {
      alert('Informe o número da revisão recebida no arquivo.');
      return;
    }
    try {
      await registrarRecebimentoDocumento(
        organizationId,
        selectedDocForRecebimento,
        {
          revisaoRecebida: recRevisao.trim(),
          dataRecebimento: recData,
          arquivoNome: recArquivoNome.trim() || undefined,
        },
        currentUser
      );

      // Se houver solicitação aberta, atualiza seu status
      const sol = getSolicitacaoDoc(selectedDocForRecebimento.id);
      if (sol && sol.status !== 'DOCUMENTO_RECEBIDO') {
        const interacao: InteracaoCobrancaItem = {
          id: `inter-${Date.now()}`,
          data: new Date().toISOString(),
          responsavelNome: currentUser?.displayName || 'Gestor SGQ',
          contatoCanal: 'PORTAL',
          resultadoAcao: 'ARQUIVO_RECEBIDO',
          observacao: `Arquivo recebido na revisão ${recRevisao.trim()} em ${recData}. Encaminhado para conferência técnica.`,
        };
        await registrarInteracaoCobranca(organizationId, sol, interacao, 'DOCUMENTO_RECEBIDO', currentUser);
      }

      setIsRecebimentoModalOpen(false);
      showToast?.(`Recebimento do documento "${selectedDocForRecebimento.codigo}" registrado. Aguardando conferência.`);
      onRefresh?.();
    } catch (err: any) {
      alert(`Erro ao registrar recebimento: ${err.message || 'Falha inesperada'}`);
    }
  };

  const handleOpenConferencia = (doc: DocumentoControlado) => {
    setSelectedDocForConferencia(doc);
    setConfAprovado(true);
    setConfParecer('Documento conferido conforme a lista de páginas efetivas (LEP) e aplicabilidade da frota.');
    setConfRevisaoFinal(doc.revisaoRecebida || doc.numeroRevisao || '');
    setIsConferenciaModalOpen(true);
  };

  const handleSalvarConferencia = async () => {
    if (!selectedDocForConferencia) return;
    if (!confParecer.trim()) {
      alert('Informe o parecer técnico da conferência.');
      return;
    }
    try {
      await registrarConferenciaDocumento(
        organizationId,
        selectedDocForConferencia,
        {
          aprovado: confAprovado,
          parecerTecnico: confParecer.trim(),
          revisaoConfirmada: confAprovado ? confRevisaoFinal.trim() : undefined,
        },
        currentUser
      );

      setIsConferenciaModalOpen(false);
      showToast?.(
        confAprovado
          ? `Conferência concluída: Documento "${selectedDocForConferencia.codigo}" ACEITO e homologado!`
          : `Conferência registrada com pendência para "${selectedDocForConferencia.codigo}".`
      );
      onRefresh?.();
    } catch (err: any) {
      alert(`Erro ao salvar conferência: ${err.message || 'Falha inesperada'}`);
    }
  };

  const handleEncerrarSolicitacao = async (doc: DocumentoControlado) => {
    const sol = getSolicitacaoDoc(doc.id);
    if (!sol) {
      alert('Não há solicitação ativa vinculada a este documento.');
      return;
    }
    const just = prompt('Informe a justificativa formal para encerramento da solicitação (mínimo 10 caracteres):');
    if (!just) return;

    try {
      const res = await encerrarSolicitacaoDocumentoControlado(
        organizationId,
        sol,
        doc,
        just,
        false,
        currentUser
      );

      if (!res.sucesso) {
        alert(res.mensagem);
        return;
      }

      showToast?.(res.mensagem);
      onRefresh?.();
    } catch (err: any) {
      alert(`Erro ao encerrar: ${err.message}`);
    }
  };

  const handleCopiarMensagem = (doc: DocumentoControlado) => {
    const msg = prepararMensagemCobranca(doc, getSolicitacaoDoc(doc.id), cobrancaIdioma);
    const textoCompleto = `ASSUNTO: ${msg.assunto}\n\n${msg.corpo}`;
    navigator.clipboard.writeText(textoCompleto);
    setCopiedMsg(true);
    showToast?.('Mensagem de cobrança copiada para a área de transferência! Envie pelo canal oficial da sua empresa.');
    setTimeout(() => setCopiedMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER E CARDS DE MÉTRICAS CONSOLIDADAS                                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Controle por Empresa & Frota (SGQ / RBAC 145)</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Controle Documental de Empresas e Frotas
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Gestão centralizada de manuais técnicos de operadores atendidos (MELs, AMMs, IPCs).
              Cada MEL e manual possui registro, frota, revisão, cobrança e recebimento 100% independentes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsNovoDocModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova MEL / Manual de Frota</span>
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Atualizar dados"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grade de Indicadores Reais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium block">Empresas Atendidas</span>
            <div className="text-xl font-bold text-white mt-1 flex items-baseline gap-1">
              {metricas.totalEmpresasAtendidas}
              <span className="text-[10px] text-slate-500">clientes</span>
            </div>
            <span className="text-[9px] text-slate-500 block mt-0.5">Atlas, Kalitta, etc.</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium block">MELs Controladas</span>
            <div className="text-xl font-bold text-sky-400 mt-1 flex items-baseline gap-1">
              {metricas.totalMelsControladas}
              <span className="text-[10px] text-slate-500">por frota</span>
            </div>
            <span className="text-[9px] text-sky-500/80 block mt-0.5">Controle individual</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium block">Pendentes Solicitação</span>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {metricas.documentosPendentesSolicitacao}
            </div>
            <span className="text-[9px] text-amber-500/80 block mt-0.5">A solicitar envio</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium block">Aguardando Conferência</span>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              {metricas.documentosAguardandoConferencia}
            </div>
            <span className="text-[9px] text-indigo-500/80 block mt-0.5">Arquivo recebido</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium block">Revisão Desatualizada</span>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {metricas.revisoesPossivelmenteDesatualizadas}
            </div>
            <span className="text-[9px] text-rose-500/80 block mt-0.5">Requer atualização</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-medium block">Cobranças / Atraso</span>
            <div className="text-xl font-bold text-amber-300 mt-1 flex items-baseline gap-1">
              {metricas.cobrancasNecessarias}
              {metricas.solicitacoesPrazoUltrapassado > 0 && (
                <span className="text-[10px] text-rose-400 font-semibold">
                  ({metricas.solicitacoesPrazoUltrapassado} venc.)
                </span>
              )}
            </div>
            <span className="text-[9px] text-amber-500/80 block mt-0.5">Acompanhamento</span>
          </div>
        </div>

        {/* Sub-Navegação */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'geral'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            1. Visão Geral & Documentos ({docsFiltrados.length})
          </button>
          <button
            onClick={() => setActiveTab('empresas')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'empresas'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            2. Visão por Empresa & Múltiplas MELs
          </button>
          <button
            onClick={() => setActiveTab('cobrancas')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'cobrancas'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            3. Solicitações & Histórico de Cobranças
          </button>
          <button
            onClick={() => setActiveTab('relatorio')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'relatorio'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            4. Relatório Executivo da Qualidade
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTROS DA VISÃO GERAL                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'geral' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, título, frota, modelo ou empresa..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden"
              >
                <option value="TODAS">Todas as Empresas</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome} ({cli.codigo})
                  </option>
                ))}
              </select>

              <select
                value={selectedFrota}
                onChange={(e) => setSelectedFrota(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden"
              >
                <option value="TODAS">Todas as Frotas</option>
                {frotasDisponiveis.map((f) => (
                  <option key={f} value={f}>
                    Frota: {f}
                  </option>
                ))}
              </select>

              <select
                value={selectedTipoDoc}
                onChange={(e) => setSelectedTipoDoc(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden"
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="MEL">Apenas MEL (Minimum Equipment List)</option>
                <option value="AMM">Apenas AMM (Aircraft Maintenance Manual)</option>
                <option value="IPC">Apenas IPC (Illustrated Parts Catalog)</option>
              </select>

              <select
                value={selectedSituacaoRecebimento}
                onChange={(e) => setSelectedSituacaoRecebimento(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden"
              >
                <option value="TODAS">Todas as Situações de Recebimento</option>
                <option value="PENDENTE_SOLICITACAO">Pendente de Solicitação</option>
                <option value="SOLICITADO">Solicitado à Empresa</option>
                <option value="AGUARDANDO_RETORNO">Aguardando Retorno</option>
                <option value="AGUARDANDO_CONFERENCIA">Aguardando Conferência</option>
                <option value="CONFERIDO_ACEITO">Conferido e Aceito</option>
                <option value="RECEBIDO_COM_PENDENCIA">Com Pendência Apontada</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA 1: VISÃO GERAL & LISTA DE DOCUMENTOS                               */}
      {/* ========================================================================= */}
      {activeTab === 'geral' && (
        <div className="space-y-4">
          {docsFiltrados.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum documento de cliente localizado com os filtros</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Cadastre novas MELs ou manuais técnicos de frota usando o botão acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {docsFiltrados.map((doc) => {
                const sol = getSolicitacaoDoc(doc.id);
                const revOficial = doc.numeroRevisao || doc.revisaoOficialReferencia || doc.revisaoVigenteNumero || 'N/D';
                const revRecebida = doc.revisaoRecebida || 'Pendente';
                const comp = compararRevisaoRecebidaComReferencia(revOficial, doc.revisaoRecebida);
                const atrasada = sol ? verificarAtrasoPrazoSolicitacao(sol) : false;
                const isMel = doc.tipoDocumentalTecnico === 'MEL' || doc.codigo.toUpperCase().includes('MEL');

                return (
                  <div
                    key={doc.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                            {doc.codigo}
                          </span>

                          {isMel && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Plane className="w-3 h-3 text-purple-400" />
                              MEL (Minimum Equipment List)
                            </span>
                          )}

                          {doc.frota && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              Frota: {doc.frota}
                            </span>
                          )}

                          {doc.modeloAeronave && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {doc.modeloAeronave}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-amber-500/20">
                            {doc.clienteNome || doc.proprietarioCessor || 'Empresa Cliente'}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-200">
                          {doc.titulo}
                        </h3>
                        {doc.observacoesAplicabilidade && (
                          <p className="text-[11px] text-slate-400 italic">
                            Aplicabilidade: {doc.observacoesAplicabilidade}
                          </p>
                        )}
                      </div>

                      {/* Botões de Ações Rápidas */}
                      <div className="flex flex-wrap items-center gap-2">
                        {onOpenFilePreview && doc.arquivoUrl && (
                          <button
                            onClick={() => onOpenFilePreview(doc)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            title="Visualizar documento arquivado"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Arquivo</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenCobranca(doc)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Cobrar / Interagir</span>
                        </button>

                        <button
                          onClick={() => handleOpenRecebimento(doc)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Registrar Recebimento</span>
                        </button>

                        {doc.situacaoRecebimento === 'AGUARDANDO_CONFERENCIA' && (
                          <button
                            onClick={() => handleOpenConferencia(doc)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Conferir Técnico</span>
                          </button>
                        )}

                        {sol && sol.status !== 'SOLICITACAO_ENCERRADA' && (
                          <button
                            onClick={() => handleEncerrarSolicitacao(doc)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                            title="Encerrar solicitação"
                          >
                            Encerrar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de Status Segregada: Situação Documental vs Situação de Recebimento vs Cobrança */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                      {/* Situação Documental */}
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Situação Documental (Vigência)
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300">Oficial: <strong className="text-white">{revOficial}</strong></span>
                          <span className="text-slate-300">Recebida: <strong className="text-white">{revRecebida}</strong></span>
                        </div>
                        <div className="mt-1">
                          {comp.status === 'CONFORME_VIGENTE' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Revisão Conforme
                            </span>
                          )}
                          {comp.status === 'RECEBIDO_DESATUALIZADO' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              Recebido Desatualizado
                            </span>
                          )}
                          {comp.status === 'RECEBIDO_POSTERIOR' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-semibold">
                              <Info className="w-3 h-3" />
                              Nova Revisão Detectada
                            </span>
                          )}
                          {comp.status === 'ANALISE_MANUAL_OBRIGATORIA' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                              <ShieldAlert className="w-3 h-3" />
                              Análise Manual Obrigatória
                            </span>
                          )}
                          {comp.status === 'REVISAO_NAO_CONFIRMADA' && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3" />
                              Pendente Confirmação
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Situação de Recebimento */}
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Situação de Recebimento (Arquivo)
                        </span>
                        <div>
                          {doc.situacaoRecebimento === 'CONFERIDO_ACEITO' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Conferido e Aceito
                            </span>
                          ) : doc.situacaoRecebimento === 'AGUARDANDO_CONFERENCIA' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              Aguardando Conferência SGQ
                            </span>
                          ) : doc.situacaoRecebimento === 'RECEBIDO_COM_PENDENCIA' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Com Pendência Técnica
                            </span>
                          ) : doc.situacaoRecebimento === 'SOLICITADO' || doc.situacaoRecebimento === 'AGUARDANDO_RETORNO' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              Solicitado à Empresa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Pendente de Solicitação
                            </span>
                          )}
                        </div>
                        {doc.dataRecebimento && (
                          <span className="text-[10px] text-slate-400 block">
                            Recebido em: {doc.dataRecebimento}
                          </span>
                        )}
                        {doc.conferidoPorNome && (
                          <span className="text-[10px] text-slate-400 block truncate" title={doc.parecerConferencia}>
                            Conferido por: {doc.conferidoPorNome}
                          </span>
                        )}
                      </div>

                      {/* Situação da Solicitação e Cobrança */}
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Cobrança & Solicitação
                        </span>
                        <div className="flex items-center gap-2">
                          {atrasada ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <AlertTriangle className="w-3 h-3" />
                              Prazo Ultrapassado
                            </span>
                          ) : sol ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {sol.status}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">Sem solicitação ativa</span>
                          )}
                        </div>
                        {sol?.prazoRetornoData && (
                          <span className="text-[10px] text-slate-400 block">
                            Prazo combinado: {sol.prazoRetornoData}
                          </span>
                        )}
                        {sol?.dataUltimaInteracao && (
                          <span className="text-[10px] text-slate-500 block">
                            Última interação: {new Date(sol.dataUltimaInteracao).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA 2: VISÃO POR EMPRESA & MÚLTIPLAS MELS                               */}
      {/* ========================================================================= */}
      {activeTab === 'empresas' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              Selecione uma Empresa para Gestão Isolada de Frotas e Múltiplas MELs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientes.map((cli) => {
                const cliDocs = documentos.filter((d) => d.clienteId === cli.id || d.clienteNome === cli.nome);
                const cliMels = cliDocs.filter((d) => d.tipoDocumentalTecnico === 'MEL' || d.codigo.toUpperCase().includes('MEL'));
                const isSelected = selectedClienteId === cli.id;

                return (
                  <button
                    key={cli.id}
                    onClick={() => setSelectedClienteId(cli.id)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/50 shadow-md ring-1 ring-sky-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-sky-400">{cli.codigo}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {cliDocs.length} docs
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1 truncate">{cli.nome}</h4>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                      <Plane className="w-3.5 h-3.5 text-purple-400" />
                      <span>{cliMels.length} MELs registradas</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destaque das Múltiplas MELs da Empresa Selecionada */}
          {selectedClienteId !== 'TODAS' && (
            <div className="space-y-4">
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">
                      Múltiplas MELs (Minimum Equipment Lists) da Empresa Selecionada
                    </h3>
                  </div>
                  <span className="text-xs text-purple-300">
                    Controle estritamente individualizado por Frota / Aplicação
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Conforme a regulamentação aeronáutica, um mesmo operador possui MELs específicas para cada frota e configuração.
                  No QualyQuest, a atualização da MEL de uma frota jamais sobrescreve os dados, revisões ou cobranças das outras.
                </p>
              </div>

              {/* Lista de MELs desta Empresa */}
              {(() => {
                const melsDaEmpresa = docsClientes.filter(
                  (d) =>
                    (d.clienteId === selectedClienteId || d.clienteNome === selectedClienteId) &&
                    (d.tipoDocumentalTecnico === 'MEL' || d.codigo.toUpperCase().includes('MEL'))
                );

                if (melsDaEmpresa.length === 0) {
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                      Nenhuma MEL cadastrada para esta empresa. Clique em "Nova MEL / Manual de Frota" para cadastrar.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {melsDaEmpresa.map((mel) => {
                      const sol = getSolicitacaoDoc(mel.id);
                      const revOficial = mel.numeroRevisao || mel.revisaoOficialReferencia || mel.revisaoVigenteNumero || 'N/D';
                      const revRec = mel.revisaoRecebida || 'Pendente';
                      const comp = compararRevisaoRecebidaComReferencia(revOficial, mel.revisaoRecebida);

                      return (
                        <div
                          key={mel.id}
                          className="bg-slate-900 border border-purple-500/20 rounded-2xl p-5 space-y-3 shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-white bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-500/30">
                                  {mel.codigo}
                                </span>
                                <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                  Frota: {mel.frota || 'Geral'}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white mt-1.5">{mel.titulo}</h4>
                              {mel.modeloAeronave && (
                                <span className="text-[11px] text-slate-400 block">
                                  Modelo: {mel.modeloAeronave}
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              ID: {mel.id.substring(0, 10)}...
                            </span>
                          </div>

                          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Revisão Oficial:</span>
                              <strong className="text-white">{revOficial}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Revisão Recebida:</span>
                              <strong className="text-white">{revRec}</strong>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800">
                              <span className="text-slate-400">Situação:</span>
                              <span
                                className={`font-semibold ${
                                  comp.status === 'CONFORME_VIGENTE'
                                    ? 'text-emerald-400'
                                    : comp.status === 'RECEBIDO_DESATUALIZADO'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {comp.detalhes}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleOpenCobranca(mel)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Cobrar esta MEL</span>
                            </button>
                            <button
                              onClick={() => handleOpenRecebimento(mel)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Receber Revisão</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ABA 3: SOLICITAÇÕES & HISTÓRICO DE COBRANÇAS                           */}
      {/* ========================================================================= */}
      {activeTab === 'cobrancas' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Painel de Solicitações e Histórico Completo de Interações
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cada cobrança é registrada com data, responsável, canal utilizado e resultado da ação, sem sobrescrever registros históricos anteriores.
            </p>
          </div>

          {solicitacoes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Nenhuma solicitação de revisão registrada no sistema.
            </div>
          ) : (
            <div className="space-y-3">
              {solicitacoes.map((sol) => {
                const atrasada = verificarAtrasoPrazoSolicitacao(sol);

                return (
                  <div
                    key={sol.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                            {sol.documentoCodigo}
                          </span>
                          <span className="text-xs font-semibold text-amber-300">
                            {sol.clienteNome}
                          </span>
                          {sol.frota && (
                            <span className="text-xs text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/20">
                              Frota: {sol.frota}
                            </span>
                          )}
                          {atrasada && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Prazo Ultrapassado
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">{sol.documentoTitulo}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Prazo Acordado:</span>
                        <strong className={atrasada ? 'text-rose-400' : 'text-slate-200'}>
                          {sol.prazoRetornoData || sol.dataLimiteResposta || 'Não especificado'}
                        </strong>
                      </div>
                    </div>

                    {/* Histórico de Interações */}
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2">
                      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Histórico de Interações e Cobranças ({sol.historicoCobrancas?.length || 0})
                      </h5>

                      {(!sol.historicoCobrancas || sol.historicoCobrancas.length === 0) ? (
                        <p className="text-xs text-slate-500 italic">
                          Solicitação gerada sem interações subsequentes registradas.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {sol.historicoCobrancas.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="text-xs p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200">
                                    Canal: {item.contatoCanal}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-sky-300">
                                    {item.resultadoAcao}
                                  </span>
                                </div>
                                {item.observacao && (
                                  <p className="text-[11px] text-slate-400">{item.observacao}</p>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 sm:text-right shrink-0">
                                <div>{new Date(item.data).toLocaleString('pt-BR')}</div>
                                <div>Por: {item.responsavelNome}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ABA 4: RELATÓRIO EXECUTIVO DA QUALIDADE                                */}
      {/* ========================================================================= */}
      {activeTab === 'relatorio' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  Relatório de Controle Documental por Empresa e Frota
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Métricas em tempo real geradas estritamente com base nos registros persistidos.
                </p>
              </div>

              <button
                onClick={() => {
                  const headers = ['Empresa', 'Total Docs', 'MELs', 'Pendentes', 'Aguardando Conf.', 'Desatualizados', 'Cobrancas Atrasadas'];
                  const rows = Object.values(metricas.distribuicaoPorEmpresa).map((d: any) => [
                    `"${d.clienteNome}"`,
                    d.totalDocs,
                    d.melsCount,
                    d.pendentes,
                    d.aguardandoConferencia,
                    d.desatualizados,
                    d.cobrancasAtrasadas,
                  ]);
                  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `relatorio_documental_empresas_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-3 px-3">Empresa / Operador</th>
                    <th className="py-3 px-3 text-center">Total Docs</th>
                    <th className="py-3 px-3 text-center">MELs Controladas</th>
                    <th className="py-3 px-3 text-center">Pendentes Envio</th>
                    <th className="py-3 px-3 text-center">Aguardando Conferência</th>
                    <th className="py-3 px-3 text-center">Desatualizados</th>
                    <th className="py-3 px-3 text-center">Cobranças Atrasadas</th>
                    <th className="py-3 px-3 text-right">Última Interação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(metricas.distribuicaoPorEmpresa)
                    .filter(([_, d]: [string, any]) => d.totalDocs > 0)
                    .map(([empId, d]: [string, any]) => (
                      <tr key={empId} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-semibold text-white">
                          {d.clienteNome}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-200">
                          {d.totalDocs}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-purple-400">
                          {d.melsCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.pendentes > 0 ? (
                            <span className="font-bold text-amber-400">{d.pendentes}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.aguardandoConferencia > 0 ? (
                            <span className="font-bold text-indigo-400">{d.aguardandoConferencia}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.desatualizados > 0 ? (
                            <span className="font-bold text-rose-400">{d.desatualizados}</span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.cobrancasAtrasadas > 0 ? (
                            <span className="font-bold text-rose-400">{d.cobrancasAtrasadas}</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">
                          {d.ultimaInteracao
                            ? new Date(d.ultimaInteracao).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL DE REGISTRO DE COBRANÇA / INTERAÇÃO                              */}
      {/* ========================================================================= */}
      {isCobrancaModalOpen && selectedDocForCobranca && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Registrar Cobrança: {selectedDocForCobranca.codigo}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Empresa: {selectedDocForCobranca.clienteNome} | Frota: {selectedDocForCobranca.frota || 'Geral'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCobrancaModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Opções da Interação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Canal de Contato Utilizado:</label>
                  <select
                    value={cobrancaCanal}
                    onChange={(e) => setCobrancaCanal(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="EMAIL">E-mail Oficial</option>
                    <option value="PORTAL">Portal do Operador / Fabricante</option>
                    <option value="TELEFONE">Contato Telefônico</option>
                    <option value="WHATSAPP">WhatsApp Corporativo</option>
                    <option value="REUNIAO">Reunião Técnica / Alinhamento</option>
                    <option value="OUTRO">Outro Canal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Resultado da Ação:</label>
                  <select
                    value={cobrancaResultado}
                    onChange={(e) => setCobrancaResultado(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="MENSAGEM_ENVIADA">Mensagem / Notificação Enviada</option>
                    <option value="CONTATO_REALIZADO">Contato Realizado com Sucesso</option>
                    <option value="PROMESSA_ENVIO">Promessa de Envio pela Empresa</option>
                    <option value="ARQUIVO_RECEBIDO">Arquivo Enviado pela Empresa</option>
                    <option value="SEM_RESPOSTA">Sem Retorno / Mensagem Pendente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Nova Data Combinada para Retorno (se acordado):</label>
                <input
                  type="date"
                  value={cobrancaNovaData}
                  onChange={(e) => setCobrancaNovaData(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Observações e Resposta Recebida:</label>
                <textarea
                  value={cobrancaObservacao}
                  onChange={(e) => setCobrancaObservacao(e.target.value)}
                  rows={2}
                  placeholder="Ex: Contato com o Eng. Paulo da Atlas Air; informou que a MEL Rev. 14 será emitida na próxima semana..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              {/* Mensagem Pronta para Cópia Manual (Não finge envio) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white">Preparar Mensagem de Cobrança:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCobrancaIdioma('PT')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${cobrancaIdioma === 'PT' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-slate-800'}`}
                    >
                      PT
                    </button>
                    <button
                      type="button"
                      onClick={() => setCobrancaIdioma('EN')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${cobrancaIdioma === 'EN' ? 'bg-sky-500 text-white' : 'text-slate-400 bg-slate-800'}`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopiarMensagem(selectedDocForCobranca)}
                      className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedMsg ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800/80 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {prepararMensagemCobranca(selectedDocForCobranca, selectedSolicitacaoForCobranca, cobrancaIdioma).corpo}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCobrancaModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarInteracaoCobranca}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Registro de Cobrança</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL DE REGISTRO DE RECEBIMENTO DO DOCUMENTO                          */}
      {/* ========================================================================= */}
      {isRecebimentoModalOpen && selectedDocForRecebimento && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              Registrar Recebimento de Arquivo: {selectedDocForRecebimento.codigo}
            </h3>
            <p className="text-xs text-slate-400">
              O registro de recebimento altera a situação para "Aguardando Conferência" e preserva o histórico documental.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Número da Revisão Recebida no Arquivo:</label>
                <input
                  type="text"
                  value={recRevisao}
                  onChange={(e) => setRecRevisao(e.target.value)}
                  placeholder="Ex: Rev. 14, Emenda 09, Edição 2026"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Data Efetiva do Recebimento:</label>
                <input
                  type="date"
                  value={recData}
                  onChange={(e) => setRecData(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Nome do Arquivo / Referência:</label>
                <input
                  type="text"
                  value={recArquivoNome}
                  onChange={(e) => setRecArquivoNome(e.target.value)}
                  placeholder="Ex: MEL_B737_AtlasAir_Rev14.pdf"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRecebimentoModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarRecebimento}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL DE CONFERÊNCIA TÉCNICA SGQ                                       */}
      {/* ========================================================================= */}
      {isConferenciaModalOpen && selectedDocForConferencia && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              Conferência Técnica SGQ: {selectedDocForConferencia.codigo}
            </h3>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Revisão Declarada:</span>
                <strong className="text-white">{selectedDocForConferencia.revisaoRecebida || 'N/D'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Frota / Aplicação:</span>
                <strong className="text-white">{selectedDocForConferencia.frota || 'Geral'}</strong>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Resultado da Conferência:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-emerald-300 cursor-pointer">
                    <input
                      type="radio"
                      name="aprovado"
                      checked={confAprovado}
                      onChange={() => setConfAprovado(true)}
                    />
                    <span>Conferido e Aceito (Aprovado)</span>
                  </label>
                  <label className="flex items-center gap-2 text-rose-300 cursor-pointer">
                    <input
                      type="radio"
                      name="aprovado"
                      checked={!confAprovado}
                      onChange={() => setConfAprovado(false)}
                    />
                    <span>Recebido com Pendência (Rejeitado)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Revisão Final Confirmada:</label>
                <input
                  type="text"
                  value={confRevisaoFinal}
                  onChange={(e) => setConfRevisaoFinal(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Parecer Técnico Formal do Auditor/Responsável:</label>
                <textarea
                  value={confParecer}
                  onChange={(e) => setConfParecer(e.target.value)}
                  rows={3}
                  required
                  placeholder="Justifique a conformidade de acordo com LEP, assinaturas de aprovação e escopo da frota..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConferenciaModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarConferencia}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Concluir Conferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL DE CADASTRO DE NOVA MEL / MANUAL DE FROTA                       */}
      {/* ========================================================================= */}
      {isNovoDocModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-400" />
                Cadastrar Novo Documento de Frota / MEL
              </h3>
              <button
                onClick={() => setIsNovoDocModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const codigo = form.get('codigo') as string;
                const titulo = form.get('titulo') as string;
                const clienteId = form.get('clienteId') as string;
                const frota = form.get('frota') as string;
                const modeloAeronave = form.get('modeloAeronave') as string;
                const tipoDoc = form.get('tipoDoc') as any;
                const revInicial = form.get('revInicial') as string;
                const emissor = form.get('emissor') as string;
                const obs = form.get('observacoes') as string;

                const cliObj = clientes.find((c) => c.id === clienteId);
                const clienteNome = cliObj ? cliObj.nome : 'Empresa Atendida';

                const newDocId = `doc-frota-${Date.now()}`;
                const novoDoc: DocumentoControlado = {
                  id: newDocId,
                  organizationId,
                  codigo: codigo.trim(),
                  titulo: titulo.trim(),
                  categoria: 'DOCUMENTO_CLIENTE',
                  tipoOrigemDocumental: 'CLIENTE',
                  tipoDocumentalTecnico: tipoDoc,
                  clienteId: clienteId || undefined,
                  clienteNome,
                  frota: frota.trim() || undefined,
                  modeloAeronave: modeloAeronave.trim() || undefined,
                  emissor: emissor.trim() || clienteNome,
                  responsavelNome: currentUser?.displayName || 'Eng. Paulo Okubo',
                  numeroRevisao: revInicial.trim() || 'Rev. 01',
                  revisaoVigenteNumero: revInicial.trim() || 'Rev. 01',
                  situacaoRecebimento: 'PENDENTE_SOLICITACAO',
                  observacoesAplicabilidade: obs.trim() || undefined,
                  exigeEvidenciaLeitura: false,
                  aplicabilidadePadrao: {
                    statusDeterminacao: 'DETERMINADA',
                    clientes: [clienteNome],
                    frotas: frota ? [frota.trim()] : [],
                  },
                  statusGeral: 'ATIVO',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                try {
                  await saveDocumentoControlado(organizationId, novoDoc, currentUser);
                  setIsNovoDocModalOpen(false);
                  showToast?.(`Documento "${codigo}" cadastrado com sucesso para a frota "${frota}" de ${clienteNome}!`);
                  onRefresh?.();
                } catch (err: any) {
                  alert(`Erro ao cadastrar: ${err.message}`);
                }
              }}
              className="p-6 overflow-y-auto space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Empresa Atendida:</label>
                  <select name="clienteId" required className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white">
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo Documental:</label>
                  <select name="tipoDoc" required className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white">
                    <option value="MEL">MEL — Minimum Equipment List</option>
                    <option value="AMM">AMM — Aircraft Maintenance Manual</option>
                    <option value="IPC">IPC — Illustrated Parts Catalog</option>
                    <option value="CMM">CMM — Component Maintenance Manual</option>
                    <option value="WDM">WDM — Wiring Diagram Manual</option>
                    <option value="FCOM">FCOM — Flight Crew Operating Manual</option>
                    <option value="OUTRO">Outro Manual Específico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Frota Aplicável:</label>
                  <input
                    type="text"
                    name="frota"
                    placeholder="Ex: Boeing 737-800, Airbus A320, B747-400F"
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Modelo da Aeronave:</label>
                  <input
                    type="text"
                    name="modeloAeronave"
                    placeholder="Ex: B737-800, A320-214, B777F"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Código Oficial do Documento:</label>
                <input
                  type="text"
                  name="codigo"
                  placeholder="Ex: MEL-B737-ATLAS ou MEL-A320-ATLAS"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Múltiplas MELs da mesma empresa coexistem harmoniosamente associadas a cada frota.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Título do Documento:</label>
                <input
                  type="text"
                  name="titulo"
                  placeholder="Ex: Minimum Equipment List — Frota B737-800 (Atlas Air)"
                  required
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Revisão Inicial de Referência:</label>
                  <input
                    type="text"
                    name="revInicial"
                    defaultValue="Rev. 01"
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Emissor / Proprietário:</label>
                  <input
                    type="text"
                    name="emissor"
                    placeholder="Ex: Atlas Air, Kalitta, Boeing"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Observações de Aplicabilidade (opcional):</label>
                <input
                  type="text"
                  name="observacoes"
                  placeholder="Ex: Aplicável às aeronaves N801AA a N820AA, configuração ETOPS 180"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNovoDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
                >
                  Cadastrar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
