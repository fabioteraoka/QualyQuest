import React, { useState } from 'react';
import {
  Shield,
  FileCheck2,
  Calendar,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  FileText,
  Users,
  Upload,
  Layers,
  HelpCircle,
  Lightbulb,
  Check,
  X,
  AlertCircle,
  Trash2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  RespostaOficialConstatacao,
  EvidenciaAuditoriaItem,
  RetornoAuditorExterno,
  ClassificacaoConstatacao,
  StatusConstatacao,
  UserProfile,
  NCRecord,
  ManualRecord,
  ValidatedKnowledgeRecord,
  SimilaridadeConstatacaoItem
} from '../types';
import {
  buscarConstatacoesSemelhantes,
  sugerirRespostaHeuristica,
  SugestaoRespostaAuditoriaOutput
} from '../utils/auditIntelligence';
import { geminiClientCache } from '../utils/geminiClientCache';

interface AuditFindingsViewProps {
  audits: AuditoriaExternaRecord[];
  findings: ConstatacaoExternaRecord[];
  selectedAuditId?: string | null;
  rncRecords: NCRecord[];
  manuals: ManualRecord[];
  validatedKnowledge: ValidatedKnowledgeRecord[];
  userProfile?: UserProfile | null;
  onBackToAudits: () => void;
  onSaveFinding: (finding: ConstatacaoExternaRecord) => Promise<void>;
  onDeleteFinding?: (findingId: string) => Promise<void>;
  onCriarRNCFromFinding: (finding: ConstatacaoExternaRecord, audit?: AuditoriaExternaRecord) => Promise<{ rncId: string; numeroNC: string }>;
  onOpenLessonForm?: (finding: ConstatacaoExternaRecord, audit?: AuditoriaExternaRecord) => void;
  onNavigateToNC?: (ncId: string) => void;
}

export const AuditFindingsView: React.FC<AuditFindingsViewProps> = ({
  audits,
  findings,
  selectedAuditId,
  rncRecords,
  manuals,
  validatedKnowledge,
  userProfile,
  onBackToAudits,
  onSaveFinding,
  onDeleteFinding,
  onCriarRNCFromFinding,
  onOpenLessonForm,
  onNavigateToNC,
}) => {
  const [currentAuditId, setCurrentAuditId] = useState<string>(selectedAuditId || 'TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassificacao, setSelectedClassificacao] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODAS');

  // Finding Selecionado para Detalhes / Edição
  const [selectedFinding, setSelectedFinding] = useState<ConstatacaoExternaRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'resposta' | 'evidencias' | 'retorno' | 'similaridade'>('dados');

  // Estado da Assistência de IA
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<SugestaoRespostaAuditoriaOutput | null>(null);

  // Modais de Criação de Finding e Evidência
  const [isNewFindingModalOpen, setIsNewFindingModalOpen] = useState(false);
  const [isNewEvidenciaModalOpen, setIsNewEvidenciaModalOpen] = useState(false);
  const [isRetornoModalOpen, setIsRetornoModalOpen] = useState(false);

  // Form de Novo Finding
  const [newFindingForm, setNewFindingForm] = useState<Partial<ConstatacaoExternaRecord>>({
    numeroExterno: '',
    classificacao: 'MENOR',
    descricaoOriginal: '',
    interpretacaoInterna: '',
    requisitoNormativo: {
      norma: 'ANAC RBAC 145',
      itemRequisito: '145.109',
      descricaoRequisito: '',
      comoImpactoImplementa: '',
      procedimentoInternoRef: 'MOMQ',
    },
    setorResponsavel: 'Qualidade / SGQ',
    responsavelNome: userProfile?.displayName || 'SGQ',
    nivelRisco: 'Médio',
    prazoResposta: new Date().toISOString().split('T')[0],
    tipoPrazo: 'DEFINIDO_AUDITOR',
    status: 'ABERTA',
  });

  // Form de Nova Evidência
  const [newEvidenciaForm, setNewEvidenciaForm] = useState<Partial<EvidenciaAuditoriaItem>>({
    codigo: `EV-0${(selectedFinding?.evidencias?.length || 0) + 1}`,
    tipo: 'Documental',
    descricao: '',
    documentoNome: '',
    documentoRevisao: 'Rev. 00',
    dataRegistro: new Date().toISOString().split('T')[0],
    responsavel: userProfile?.displayName || 'SGQ',
    statusValidacao: 'VALIDADA',
  });

  // Form de Retorno do Auditor
  const [retornoForm, setRetornoForm] = useState<Partial<RetornoAuditorExterno>>({
    dataRetorno: new Date().toISOString().split('T')[0],
    decisao: 'ACEITA',
    auditorNome: '',
    parecerAuditor: '',
    documentoRetornoRef: '',
    prazoComplementar: '',
  });

  const canEdit = userProfile?.role !== 'CONSULTA';
  const isGestorSGQ = userProfile?.role === 'GESTOR_SGQ' || userProfile?.role === 'ADMIN';

  // Auditoria Atual Selecionada (se houver)
  const currentAudit = audits.find((a) => a.id === currentAuditId);

  // Filtragem dos Findings
  const filteredFindings = findings.filter((f) => {
    const matchAudit = currentAuditId === 'TODAS' || f.auditId === currentAuditId;
    const matchSearch =
      f.numeroExterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.descricaoOriginal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.requisitoNormativo?.itemRequisito && f.requisitoNormativo.itemRequisito.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.setorResponsavel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClassificacao === 'TODAS' || f.classificacao === selectedClassificacao;
    const matchStat = selectedStatus === 'TODAS' || f.status === selectedStatus;

    return matchAudit && matchSearch && matchClass && matchStat;
  });

  // Casos semelhantes para o finding atualmente selecionado
  const similarCases: SimilaridadeConstatacaoItem[] = selectedFinding
    ? buscarConstatacoesSemelhantes(selectedFinding, findings, audits, rncRecords, validatedKnowledge)
    : [];

  // Dispara Assistente IA para Elaboração de Resposta
  const handleConsultAiAssistant = async () => {
    if (!selectedFinding) return;
    setIsAiLoading(true);

    const orgId = userProfile?.organizationId || 'org_impacto_aviation';
    const cacheKey = geminiClientCache.generateKey({
      organizationId: orgId,
      operation: 'audit-assist',
      input: {
        findingId: selectedFinding.id,
        desc: selectedFinding.descricaoOriginal,
        auditId: currentAudit?.id,
      },
    });

    const cached = geminiClientCache.get<any>(cacheKey, orgId);
    if (cached) {
      setAiSuggestion(cached);
      setIsAiLoading(false);
      return;
    }

    try {
      // Tenta chamar o endpoint de IA no backend
      const response = await fetch('/api/audit-assist', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
          'x-user-org-id': userProfile?.organizationId || '',
        },
        body: JSON.stringify({
          organizationId: orgId,
          finding: selectedFinding,
          auditoria: currentAudit,
          similarCases: similarCases.slice(0, 2),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sugestao) {
          geminiClientCache.set(cacheKey, data.sugestao, 30 * 60 * 1000, orgId);
          setAiSuggestion(data.sugestao);
          setIsAiLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend AI indisponível, usando fallback heurístico local:', err);
    }

    // Fallback heurístico resiliente garantido
    const fallback = sugerirRespostaHeuristica(selectedFinding, manuals, similarCases);
    setAiSuggestion(fallback);
    setIsAiLoading(false);
  };

  // Aplica a sugestão da IA aos campos de resposta oficial da constatação
  const handleApplyAiSuggestion = () => {
    if (!selectedFinding || !aiSuggestion) return;

    const respostaAtualizada: RespostaOficialConstatacao = {
      id: selectedFinding.respostaOficial?.id || `RESP-${Date.now()}`,
      versao: (selectedFinding.respostaOficial?.versao || 0) + 1,
      respostaFactual: aiSuggestion.respostaFactualSugerida,
      analiseCausa: aiSuggestion.analiseCausaPreliminar,
      correcaoImediata: aiSuggestion.correcaoImediataSugerida,
      acaoCorretiva: aiSuggestion.acaoCorretivaSugerida,
      acaoPreventiva: aiSuggestion.acaoPreventivaSugerida || '',
      responsavel: selectedFinding.responsavelNome || userProfile?.displayName || 'SGQ',
      prazoExecucao: selectedFinding.prazoResposta || new Date().toISOString().split('T')[0],
      referenciasDocumentais: aiSuggestion.documentosRecomendados || [],
      evidenciasIds: selectedFinding.respostaOficial?.evidenciasIds || [],
      statusAprovacao: 'SUGESTAO_IA', // Marcada explicitamente como sugestão preliminar!
      autorNome: userProfile?.displayName || 'SGQ',
      sugestaoOriginalIA: `Sugestão gerada por IA (${aiSuggestion.origem}) em ${new Date().toLocaleString()}`,
      criadoEm: selectedFinding.respostaOficial?.criadoEm || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const findingSalvo: ConstatacaoExternaRecord = {
      ...selectedFinding,
      interpretacaoInterna: aiSuggestion.interpretacaoTecnica,
      respostaOficial: respostaAtualizada,
      status: selectedFinding.status === 'ABERTA' ? 'EM_ANALISE' : selectedFinding.status,
    };

    setSelectedFinding(findingSalvo);
    onSaveFinding(findingSalvo);
    setAiSuggestion(null);
    setActiveTab('resposta');
  };

  // Salva nova evidência
  const handleSaveEvidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding || !newEvidenciaForm.descricao) return;

    const novaEvidencia: EvidenciaAuditoriaItem = {
      id: `EVID-${Date.now()}`,
      codigo: newEvidenciaForm.codigo || `EV-0${(selectedFinding.evidencias?.length || 0) + 1}`,
      tipo: newEvidenciaForm.tipo || 'Documental',
      descricao: newEvidenciaForm.descricao,
      documentoNome: newEvidenciaForm.documentoNome || 'Evidência_Registrada.pdf',
      documentoRevisao: newEvidenciaForm.documentoRevisao || 'Rev. 00',
      dataRegistro: newEvidenciaForm.dataRegistro || new Date().toISOString().split('T')[0],
      responsavel: newEvidenciaForm.responsavel || userProfile?.displayName || 'SGQ',
      statusValidacao: newEvidenciaForm.statusValidacao || 'VALIDADA',
      observacoes: newEvidenciaForm.observacoes || '',
    };

    const findingAtualizado: ConstatacaoExternaRecord = {
      ...selectedFinding,
      evidencias: [...(selectedFinding.evidencias || []), novaEvidencia],
      updatedAt: new Date().toISOString(),
    };

    await onSaveFinding(findingAtualizado);
    setSelectedFinding(findingAtualizado);
    setIsNewEvidenciaModalOpen(false);
  };

  // Salva retorno do auditor
  const handleSaveRetornoAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding || !retornoForm.parecerAuditor) return;

    const novoRetorno: RetornoAuditorExterno = {
      id: `RET-${Date.now()}`,
      dataRetorno: retornoForm.dataRetorno || new Date().toISOString().split('T')[0],
      decisao: retornoForm.decisao || 'ACEITA',
      auditorNome: retornoForm.auditorNome || currentAudit?.auditoresNomes?.[0] || 'Auditor Externo',
      parecerAuditor: retornoForm.parecerAuditor,
      documentoRetornoRef: retornoForm.documentoRetornoRef || '',
      prazoComplementar: retornoForm.prazoComplementar || '',
      registradoPor: userProfile?.displayName || 'SGQ',
      dataRegistro: new Date().toISOString(),
    };

    let novoStatus: StatusConstatacao = selectedFinding.status;
    if (novoRetorno.decisao === 'ACEITA') {
      novoStatus = 'ACEITA';
    } else if (novoRetorno.decisao === 'REJEITADA') {
      novoStatus = 'REJEITADA';
    } else if (novoRetorno.decisao === 'ACEITA_PARCIALMENTE') {
      novoStatus = 'ACEITA_PARCIALMENTE';
    } else if (novoRetorno.decisao === 'SOLICITACAO_COMPLEMENTO') {
      novoStatus = 'COMPLEMENTO_SOLICITADO';
    }

    const findingAtualizado: ConstatacaoExternaRecord = {
      ...selectedFinding,
      status: novoStatus,
      retornosAuditor: [...(selectedFinding.retornosAuditor || []), novoRetorno],
      updatedAt: new Date().toISOString(),
      trilhaAuditoria: [
        ...(selectedFinding.trilhaAuditoria || []),
        {
          data: new Date().toISOString(),
          usuario: userProfile?.displayName || 'SGQ',
          campoModificado: 'Retorno do Auditor',
          valorAnterior: selectedFinding.status,
          novoValor: `${novoRetorno.decisao} - Parecer registrado`,
          motivo: 'Registro formal da decisão da autoridade/cliente',
        },
      ],
    };

    await onSaveFinding(findingAtualizado);
    setSelectedFinding(findingAtualizado);
    setIsRetornoModalOpen(false);
  };

  // Salva novo finding
  const handleSaveNewFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFindingForm.numeroExterno || !newFindingForm.descricaoOriginal) {
      alert('Preencha o número externo e a descrição original do auditor.');
      return;
    }

    const auditIdTarget = currentAuditId !== 'TODAS' ? currentAuditId : (audits[0]?.id || 'AUD-01');

    const novoFinding: ConstatacaoExternaRecord = {
      id: `FIND-${Date.now()}`,
      auditId: auditIdTarget,
      organizationId: currentAudit?.organizationId || 'org_impacto_aviation',
      numeroExterno: newFindingForm.numeroExterno,
      classificacao: newFindingForm.classificacao || 'MENOR',
      descricaoOriginal: newFindingForm.descricaoOriginal,
      interpretacaoInterna: newFindingForm.interpretacaoInterna || '',
      requisitoNormativo: newFindingForm.requisitoNormativo || {
        norma: 'ANAC RBAC 145',
        itemRequisito: '145.109',
        descricaoRequisito: '',
        comoImpactoImplementa: '',
        procedimentoInternoRef: 'MOMQ',
      },
      processoAuditado: newFindingForm.processoAuditado || 'Oficinas de Manutenção',
      setorResponsavel: newFindingForm.setorResponsavel || 'Qualidade / SGQ',
      responsavelNome: newFindingForm.responsavelNome || userProfile?.displayName || 'SGQ',
      nivelRisco: newFindingForm.nivelRisco || 'Médio',
      prazoResposta: newFindingForm.prazoResposta || new Date().toISOString().split('T')[0],
      tipoPrazo: newFindingForm.tipoPrazo || 'DEFINIDO_AUDITOR',
      status: 'ABERTA',
      evidencias: [],
      retornosAuditor: [],
      trilhaAuditoria: [
        {
          data: new Date().toISOString(),
          usuario: userProfile?.displayName || 'SGQ',
          campoModificado: 'Criação do Finding',
          valorAnterior: 'N/A',
          novoValor: `${newFindingForm.numeroExterno} cadastrado`,
          motivo: 'Registro da constatação de auditoria externa',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveFinding(novoFinding);
    setIsNewFindingModalOpen(false);
    setSelectedFinding(novoFinding);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Navegação Superior */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToAudits}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Voltar para a lista de auditorias"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                <span>Gestão de Constatações & Respostas Oficiais</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {currentAudit ? `${currentAudit.numeroAuditoria} — ${currentAudit.entidadeAuditora}` : 'Todas as Constatações de Auditorias'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={currentAuditId}
              onChange={(e) => setCurrentAuditId(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAS">Todas as Auditorias</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.numeroAuditoria} ({a.tipo})
                </option>
              ))}
            </select>

            {canEdit && (
              <button
                onClick={() => setIsNewFindingModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Constatação</span>
              </button>
            )}
          </div>
        </div>

        {/* Informações rápidas da auditoria selecionada */}
        {currentAudit && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 font-medium">Órgão:</span>{' '}
              <span className="font-semibold text-slate-800">{currentAudit.tipo}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Período:</span>{' '}
              <span className="font-semibold text-slate-800">{currentAudit.dataInicio} a {currentAudit.dataTermino}</span>
            </div>
            {currentAudit.prazoGlobalResposta && (
              <div>
                <span className="text-slate-400 font-medium">Prazo Global:</span>{' '}
                <span className="font-semibold text-amber-700">{currentAudit.prazoGlobalResposta}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 font-medium">Responsável SGQ:</span>{' '}
              <span className="font-semibold text-slate-800">{currentAudit.responsavelInterno}</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid Principal: Lista à Esquerda / Detalhes à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Lista de Constatações (4 ou 5 colunas no desktop) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar constatações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedClassificacao}
                onChange={(e) => setSelectedClassificacao(e.target.value)}
                className="w-1/2 text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white text-slate-700"
              >
                <option value="TODAS">Todas Classes</option>
                <option value="MAIOR">Maior</option>
                <option value="MENOR">Menor</option>
                <option value="OBSERVACAO">Observação</option>
                <option value="OPORTUNIDADE_MELHORIA">Oportunidade</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-1/2 text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white text-slate-700"
              >
                <option value="TODAS">Todos Status</option>
                <option value="ABERTA">Aberta</option>
                <option value="EM_ANALISE">Em Análise</option>
                <option value="RESPOSTA_ELABORADA">Com Resposta</option>
                <option value="ACEITA">Aceita</option>
                <option value="ENCERRADA">Encerrada</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredFindings.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                Nenhuma constatação encontrada para os filtros aplicados.
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedFinding?.id === finding.id;
                return (
                  <div
                    key={finding.id}
                    onClick={() => {
                      setSelectedFinding(finding);
                      setAiSuggestion(null);
                    }}
                    className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {finding.numeroExterno}
                      </span>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        finding.classificacao === 'MAIOR'
                          ? 'bg-red-100 text-red-800'
                          : finding.classificacao === 'MENOR'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {finding.classificacao}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {finding.descricaoOriginal}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                      <span className="font-medium text-slate-700 truncate max-w-[140px]">
                        {finding.requisitoNormativo?.norma} {finding.requisitoNormativo?.itemRequisito}
                      </span>

                      <span className={`px-2 py-0.5 rounded font-medium ${
                        finding.status === 'ACEITA' || finding.status === 'ENCERRADA'
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : finding.status === 'RESPOSTA_ELABORADA'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {finding.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Badge se já possui RNC interna vinculada */}
                    {finding.numeroRNCInterna && (
                      <div className="mt-2 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center justify-between">
                        <span>RNC F 001-29 vinculada: NC-{finding.numeroRNCInterna}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Detalhe Aprofundado da Constatação (8 colunas) */}
        <div className="lg:col-span-8">
          {!selectedFinding ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                Selecione uma constatação para gerenciar
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No painel ao lado, clique em qualquer finding para visualizar o texto original do auditor,
                redigir a resposta oficial com apoio da IA, anexar evidências e consultar recorrência histórica.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Cabeçalho do Finding */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {selectedFinding.numeroExterno}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        selectedFinding.classificacao === 'MAIOR'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : selectedFinding.classificacao === 'MENOR'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        CLASSIFICAÇÃO: {selectedFinding.classificacao}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        RISCO: {selectedFinding.nivelRisco}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">
                      Setor: <strong className="text-slate-800">{selectedFinding.setorResponsavel}</strong> • Responsável: <strong className="text-slate-800">{selectedFinding.responsavelNome}</strong> • Prazo: <strong className="text-amber-800">{selectedFinding.prazoResposta}</strong> ({selectedFinding.tipoPrazo})
                    </p>
                  </div>

                  {/* Ações Estratégicas: RNC Interna e Lição Aprendida */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!selectedFinding.rncInternaCriadaId ? (
                      canEdit && (
                        <button
                          onClick={async () => {
                            if (confirm(`Deseja gerar uma Não Conformidade interna F 001-29 a partir do finding ${selectedFinding.numeroExterno}?`)) {
                              const res = await onCriarRNCFromFinding(selectedFinding, currentAudit);
                              alert(`RNC Interna F 001-29 gerada com sucesso: NC-${res.numeroNC}`);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Gerar RNC Interna (F 001-29)</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => onNavigateToNC?.(selectedFinding.rncInternaCriadaId!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Ver RNC F 001-29 (NC-{selectedFinding.numeroRNCInterna})</span>
                      </button>
                    )}

                    {(selectedFinding.status === 'ACEITA' || selectedFinding.status === 'ENCERRADA') && onOpenLessonForm && (
                      <button
                        onClick={() => onOpenLessonForm(selectedFinding, currentAudit)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Extrair Lição Aprendida</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Abas de Navegação Interna */}
                <div className="flex items-center gap-1 mt-5 border-b border-slate-200 overflow-x-auto text-xs font-medium">
                  <button
                    onClick={() => setActiveTab('dados')}
                    className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer ${
                      activeTab === 'dados' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    1. Requisito & Finding
                  </button>

                  <button
                    onClick={() => setActiveTab('resposta')}
                    className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'resposta' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>2. Resposta Oficial</span>
                    {selectedFinding.respostaOficial?.statusAprovacao && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                        {selectedFinding.respostaOficial.statusAprovacao}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('evidencias')}
                    className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'evidencias' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>3. Evidências</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full">
                      {selectedFinding.evidencias?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('retorno')}
                    className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'retorno' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>4. Retorno do Auditor</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full">
                      {selectedFinding.retornosAuditor?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('similaridade')}
                    className={`pb-2.5 px-3 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'similaridade' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-purple-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Histórico / Similaridade</span>
                    {similarCases.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full font-bold">
                        {similarCases.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Conteúdo da Aba Selecionada */}
              <div className="p-6 space-y-6">
                {/* ABA 1: DADOS, TEXTO ORIGINAL DO AUDITOR & REQUISITO NORMATIVO */}
                {activeTab === 'dados' && (
                  <div className="space-y-5">
                    {/* Texto Original do Auditor */}
                    <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-amber-700" />
                          Texto Original do Auditor Externo (Preservado Inalterado)
                        </span>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Imutabilidade Garantida
                        </span>
                      </div>
                      <p className="text-xs text-slate-900 font-medium leading-relaxed bg-white/80 p-3 rounded border border-amber-200/80 select-text">
                        "{selectedFinding.descricaoOriginal}"
                      </p>
                    </div>

                    {/* Interpretação Técnica Interna */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Interpretação Técnica Interna SGQ
                      </label>
                      <textarea
                        rows={3}
                        value={selectedFinding.interpretacaoInterna || ''}
                        onChange={(e) => setSelectedFinding({ ...selectedFinding, interpretacaoInterna: e.target.value })}
                        disabled={!canEdit}
                        placeholder="Insira a interpretação técnica da equipe sobre o que foi apontado..."
                        className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Requisito Normativo Aplicável */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        Requisito Normativo & Procedimento Aplicável
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500">Norma Regulamentadora:</span>
                          <p className="font-semibold text-slate-900">{selectedFinding.requisitoNormativo?.norma || 'RBAC 145'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Item do Requisito:</span>
                          <p className="font-mono font-bold text-blue-700">{selectedFinding.requisitoNormativo?.itemRequisito || '145.109'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-500">Descrição do Requisito:</span>
                          <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1">
                            {selectedFinding.requisitoNormativo?.descricaoRequisito || 'Requisito regulatório aeronáutico aplicável ao processo inspecionado.'}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-500">Como a Organização Implementa o Requisito:</span>
                          <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1">
                            {selectedFinding.requisitoNormativo?.comoImpactoImplementa || 'Procedimentos do MOMQ e instruções técnicas de trabalho.'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Procedimento Interno Referência:</span>
                          <p className="font-semibold text-slate-900">{selectedFinding.requisitoNormativo?.procedimentoInternoRef || 'MOMQ'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Revisão Vigente:</span>
                          <p className="font-semibold text-slate-900">{selectedFinding.requisitoNormativo?.revisaoProcedimento || 'Vigente'}</p>
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => onSaveFinding(selectedFinding)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 2: RESPOSTA OFICIAL DA ORGANIZAÇÃO (COM ASSISTENTE IA) */}
                {activeTab === 'resposta' && (
                  <div className="space-y-5">
                    {/* Barra de Ação da IA */}
                    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-4 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span>Assistente IA para Respostas Oficiais de Auditoria</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Analisa o finding, os manuais SGQ e histórico de respostas aceitas para propor uma minuta profissional de resposta.
                        </p>
                      </div>

                      <button
                        onClick={handleConsultAiAssistant}
                        disabled={isAiLoading || !canEdit}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAiLoading ? 'Analisando Requisitos...' : 'Gerar Minuta com IA'}</span>
                      </button>
                    </div>

                    {/* Exibição da Sugestão da IA (se gerada) */}
                    {aiSuggestion && (
                      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-amber-700" />
                            Minuta Proposta pela IA ({aiSuggestion.origem})
                          </span>
                          <button
                            onClick={() => setAiSuggestion(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-xs text-slate-700 space-y-2 bg-white/90 p-3.5 rounded-lg border border-amber-200">
                          <p><strong>Interpretação:</strong> {aiSuggestion.interpretacaoTecnica}</p>
                          <p><strong>Resposta Factual:</strong> {aiSuggestion.respostaFactualSugerida}</p>
                          <p><strong>Causa Raiz Sugerida:</strong> {aiSuggestion.analiseCausaPreliminar}</p>
                          <p><strong>Correção Imediata:</strong> {aiSuggestion.correcaoImediataSugerida}</p>
                          <p><strong>Ação Corretiva:</strong> {aiSuggestion.acaoCorretivaSugerida}</p>
                          {aiSuggestion.evidenciasNecessarias?.length > 0 && (
                            <div>
                              <strong>Evidências Necessárias:</strong>
                              <ul className="list-disc pl-5 mt-1">
                                {aiSuggestion.evidenciasNecessarias.map((ev, i) => (
                                  <li key={i}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] text-amber-800 bg-amber-100/80 p-2 rounded border border-amber-200 font-medium">
                          {aiSuggestion.advertenciaGovernanca}
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setAiSuggestion(null)}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                          >
                            Descartar
                          </button>
                          <button
                            onClick={handleApplyAiSuggestion}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Aplicar à Resposta Oficial
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formulário Oficial da Resposta da IMPACTO */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          1. Declaração Factual da Resposta
                        </label>
                        <textarea
                          rows={3}
                          value={selectedFinding.respostaOficial?.respostaFactual || ''}
                          onChange={(e) => {
                            const resp = selectedFinding.respostaOficial || {
                              id: `RESP-${Date.now()}`,
                              versao: 1,
                              respostaFactual: '',
                              analiseCausa: '',
                              correcaoImediata: '',
                              acaoCorretiva: '',
                              responsavel: selectedFinding.responsavelNome || 'SGQ',
                              prazoExecucao: selectedFinding.prazoResposta || '',
                              referenciasDocumentais: [],
                              evidenciasIds: [],
                              statusAprovacao: 'RASCUNHO',
                              autorNome: userProfile?.displayName || 'SGQ',
                              criadoEm: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            setSelectedFinding({
                              ...selectedFinding,
                              respostaOficial: { ...resp, respostaFactual: e.target.value },
                            });
                          }}
                          disabled={!canEdit}
                          placeholder="Descreva com precisão o que foi verificado no chão de fábrica e na documentação..."
                          className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          2. Análise da Causa Raiz
                        </label>
                        <textarea
                          rows={3}
                          value={selectedFinding.respostaOficial?.analiseCausa || ''}
                          onChange={(e) => {
                            const resp = selectedFinding.respostaOficial || {
                              id: `RESP-${Date.now()}`,
                              versao: 1,
                              respostaFactual: '',
                              analiseCausa: '',
                              correcaoImediata: '',
                              acaoCorretiva: '',
                              responsavel: selectedFinding.responsavelNome || 'SGQ',
                              prazoExecucao: selectedFinding.prazoResposta || '',
                              referenciasDocumentais: [],
                              evidenciasIds: [],
                              statusAprovacao: 'RASCUNHO',
                              autorNome: userProfile?.displayName || 'SGQ',
                              criadoEm: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            setSelectedFinding({
                              ...selectedFinding,
                              respostaOficial: { ...resp, analiseCausa: e.target.value },
                            });
                          }}
                          disabled={!canEdit}
                          placeholder="Identifique por que o desvio ocorreu no processo..."
                          className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            3. Correção Imediata (Contenção)
                          </label>
                          <textarea
                            rows={3}
                            value={selectedFinding.respostaOficial?.correcaoImediata || ''}
                            onChange={(e) => {
                              const resp = selectedFinding.respostaOficial!;
                              setSelectedFinding({
                                ...selectedFinding,
                                respostaOficial: { ...resp, correcaoImediata: e.target.value },
                              });
                            }}
                            disabled={!canEdit}
                            placeholder="Ações imediatas para conter e segregar o desvio..."
                            className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            4. Ação Corretiva Duradoura
                          </label>
                          <textarea
                            rows={3}
                            value={selectedFinding.respostaOficial?.acaoCorretiva || ''}
                            onChange={(e) => {
                              const resp = selectedFinding.respostaOficial!;
                              setSelectedFinding({
                                ...selectedFinding,
                                respostaOficial: { ...resp, acaoCorretiva: e.target.value },
                              });
                            }}
                            disabled={!canEdit}
                            placeholder="Ações para eliminar a causa raiz e prevenir reincidência..."
                            className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Controle de Versão e Aprovação */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-slate-500">Status da Resposta:</span>{' '}
                          <span className="font-bold text-slate-900">
                            {selectedFinding.respostaOficial?.statusAprovacao || 'RASCUNHO'}
                          </span>
                          {selectedFinding.respostaOficial?.aprovadorNome && (
                            <span className="text-slate-500 ml-2">
                              (Aprovada por {selectedFinding.respostaOficial.aprovadorNome})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isGestorSGQ && selectedFinding.respostaOficial && selectedFinding.respostaOficial.statusAprovacao !== 'APROVADA_GESTOR' && (
                            <button
                              onClick={() => {
                                const resp = selectedFinding.respostaOficial!;
                                const findingAprovado: ConstatacaoExternaRecord = {
                                  ...selectedFinding,
                                  respostaOficial: {
                                    ...resp,
                                    statusAprovacao: 'APROVADA_GESTOR',
                                    aprovadorNome: userProfile?.displayName || 'Gestor SGQ',
                                    dataHoraAprovacao: new Date().toISOString(),
                                  },
                                  status: 'RESPOSTA_ELABORADA',
                                };
                                setSelectedFinding(findingAprovado);
                                onSaveFinding(findingAprovado);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                            >
                              Homologar Resposta (Gestor SGQ)
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => onSaveFinding(selectedFinding)}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                            >
                              Salvar Rascunho
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 3: EVIDÊNCIAS OBJETIVAS */}
                {activeTab === 'evidencias' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Evidências Objetivas Vinculadas à Resposta
                      </h4>

                      {canEdit && (
                        <button
                          onClick={() => setIsNewEvidenciaModalOpen(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Evidência</span>
                        </button>
                      )}
                    </div>

                    {(!selectedFinding.evidencias || selectedFinding.evidencias.length === 0) ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                        Nenhuma evidência cadastrada para esta constatação. Clique no botão acima para adicionar certificados RBC, OSs, fotos ou atas de treinamento.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedFinding.evidencias.map((ev) => (
                          <div
                            key={ev.id}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                  {ev.codigo}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                  {ev.tipo}
                                </span>
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  {ev.statusValidacao}
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 font-medium">{ev.descricao}</p>
                              <p className="text-[11px] text-slate-500">
                                Arquivo / Doc: <strong>{ev.documentoNome}</strong> ({ev.documentoRevisao || 'Rev. 00'}) • Data: {ev.dataRegistro} • Resp: {ev.responsavel}
                              </p>
                            </div>

                            {canEdit && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Remover evidência ${ev.codigo}?`)) {
                                    const atualizado: ConstatacaoExternaRecord = {
                                      ...selectedFinding,
                                      evidencias: selectedFinding.evidencias.filter((item) => item.id !== ev.id),
                                    };
                                    setSelectedFinding(atualizado);
                                    await onSaveFinding(atualizado);
                                  }
                                }}
                                className="text-slate-400 hover:text-red-600 p-1 rounded"
                                title="Excluir Evidência"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 4: RETORNO DO AUDITOR EXTERNO */}
                {activeTab === 'retorno' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Histórico de Retornos e Pareceres da Autoridade / Auditor
                      </h4>

                      {canEdit && (
                        <button
                          onClick={() => setIsRetornoModalOpen(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar Retorno do Auditor</span>
                        </button>
                      )}
                    </div>

                    {(!selectedFinding.retornosAuditor || selectedFinding.retornosAuditor.length === 0) ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                        Nenhum parecer formal de retorno registrado ainda. Assim que o auditor externo emitir a análise da resposta, registre o resultado aqui.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedFinding.retornosAuditor.map((ret) => (
                          <div
                            key={ret.id}
                            className={`border rounded-xl p-4 shadow-xs space-y-2 ${
                              ret.decisao === 'ACEITA'
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : ret.decisao === 'REJEITADA'
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-amber-50/50 border-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                                ret.decisao === 'ACEITA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ret.decisao === 'REJEITADA'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                DECISÃO: {ret.decisao.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                Data: {ret.dataRetorno} • Auditor: {ret.auditorNome}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 bg-white p-3 rounded border border-slate-200 leading-relaxed font-medium">
                              "{ret.parecerAuditor}"
                            </p>

                            {ret.prazoComplementar && (
                              <p className="text-xs text-amber-800 font-semibold">
                                Prazo complementar concedido pelo auditor: {ret.prazoComplementar}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 5: HISTÓRICO & SIMILARIDADE ("JÁ TIVEMOS ALGO PARECIDO?") */}
                {activeTab === 'similaridade' && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                        <Sparkles className="w-4 h-4 text-purple-700" />
                        <span>Busca Inteligente de Recorrência ("Já tivemos algo parecido?")</span>
                      </div>
                      <p className="text-xs text-purple-800 mt-1">
                        Varredura heurística e semântica comparando o finding atual contra constatações de auditorias passadas,
                        respostas homologadas e RNCs internas F 001-29.
                      </p>
                    </div>

                    {similarCases.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                        Nenhuma constatação anterior semelhante identificada no acervo do SGQ.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {similarCases.map((caso, i) => (
                          <div
                            key={i}
                            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 hover:border-purple-300 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {caso.numeroFinding}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  caso.tipoSimilaridade === 'MESMO_PROBLEMA'
                                    ? 'bg-red-100 text-red-800'
                                    : caso.tipoSimilaridade === 'MESMO_REQUISITO'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {caso.tipoSimilaridade.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Relevância: {caso.scoreSimilaridade}%
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 font-medium">
                              "{caso.descricao}"
                            </p>

                            <p className="text-xs text-slate-500">
                              {caso.justificativaSemelhanca}
                            </p>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                              <p className="text-slate-800">
                                <strong>Resposta Adotada na Época:</strong> {caso.respostaAnterior}
                              </p>
                              <p className="text-emerald-700 font-semibold">
                                <strong>Resultado com o Auditor:</strong> {caso.resultadoAuditor}
                              </p>
                              <p className="text-slate-600">
                                <strong>Evidências Aceitas:</strong> {caso.evidenciasAceitas.join('; ')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Finding */}
      {isNewFindingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveNewFinding} className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Registrar Constatação de Auditoria Externa
              </h3>
              <button
                type="button"
                onClick={() => setIsNewFindingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Identificação / Nº Externo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: FIND-01/ANAC-2026"
                  value={newFindingForm.numeroExterno || ''}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, numeroExterno: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Classificação do Auditor *</label>
                <select
                  value={newFindingForm.classificacao || 'MENOR'}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, classificacao: e.target.value as ClassificacaoConstatacao })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="MAIOR">Maior (Crítica / Afetação Sistêmica)</option>
                  <option value="MENOR">Menor (Desvio Pontual de Procedimento)</option>
                  <option value="OBSERVACAO">Observação do Auditor</option>
                  <option value="OPORTUNIDADE_MELHORIA">Oportunidade de Melhoria</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">
                  Texto Original do Auditor (Exatamente como emitido no relatório) *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Cole aqui o texto inalterado do auditor externo..."
                  value={newFindingForm.descricaoOriginal || ''}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, descricaoOriginal: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Norma Citada</label>
                <input
                  type="text"
                  placeholder="Ex: ANAC RBAC 145"
                  value={newFindingForm.requisitoNormativo?.norma || ''}
                  onChange={(e) => setNewFindingForm({
                    ...newFindingForm,
                    requisitoNormativo: { ...newFindingForm.requisitoNormativo!, norma: e.target.value },
                  })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Item do Requisito</label>
                <input
                  type="text"
                  placeholder="Ex: 145.109(b)"
                  value={newFindingForm.requisitoNormativo?.itemRequisito || ''}
                  onChange={(e) => setNewFindingForm({
                    ...newFindingForm,
                    requisitoNormativo: { ...newFindingForm.requisitoNormativo!, itemRequisito: e.target.value },
                  })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Setor Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: REC - Manutenção / Calibração"
                  value={newFindingForm.setorResponsavel || ''}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, setorResponsavel: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Prazo Limite para Resposta</label>
                <input
                  type="date"
                  value={newFindingForm.prazoResposta || ''}
                  onChange={(e) => setNewFindingForm({ ...newFindingForm, prazoResposta: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewFindingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Salvar Constatação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nova Evidência */}
      {isNewEvidenciaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveEvidencia} className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Adicionar Evidência Objetiva
              </h3>
              <button
                type="button"
                onClick={() => setIsNewEvidenciaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Código</label>
                  <input
                    type="text"
                    value={newEvidenciaForm.codigo || ''}
                    onChange={(e) => setNewEvidenciaForm({ ...newEvidenciaForm, codigo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tipo de Evidência</label>
                  <select
                    value={newEvidenciaForm.tipo || 'Documental'}
                    onChange={(e) => setNewEvidenciaForm({ ...newEvidenciaForm, tipo: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Documental">Documental</option>
                    <option value="Certificado de Calibração">Certificado de Calibração RBC</option>
                    <option value="Ordem de Serviço (OS)">Ordem de Serviço (OS)</option>
                    <option value="Registro Fotográfico">Registro Fotográfico</option>
                    <option value="Treinamento / Certificação">Treinamento / Certificação</option>
                    <option value="Procedimento Revisado">Procedimento Revisado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Descrição Detalhada *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o que este documento ou registro comprova..."
                  value={newEvidenciaForm.descricao || ''}
                  onChange={(e) => setNewEvidenciaForm({ ...newEvidenciaForm, descricao: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nome do Arquivo / Dossiê</label>
                  <input
                    type="text"
                    placeholder="Ex: Certificado_RBC_88219.pdf"
                    value={newEvidenciaForm.documentoNome || ''}
                    onChange={(e) => setNewEvidenciaForm({ ...newEvidenciaForm, documentoNome: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Revisão / Emissão</label>
                  <input
                    type="text"
                    placeholder="Ex: Rev. 01 ou 28/08/2026"
                    value={newEvidenciaForm.documentoRevisao || ''}
                    onChange={(e) => setNewEvidenciaForm({ ...newEvidenciaForm, documentoRevisao: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewEvidenciaModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Salvar Evidência
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Registrar Retorno do Auditor */}
      {isRetornoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveRetornoAuditor} className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Registrar Parecer do Auditor Externo
              </h3>
              <button
                type="button"
                onClick={() => setIsRetornoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Decisão do Auditor *</label>
                  <select
                    value={retornoForm.decisao || 'ACEITA'}
                    onChange={(e) => setRetornoForm({ ...retornoForm, decisao: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="ACEITA">ACEITA (Homologada satisfatoriamente)</option>
                    <option value="REJEITADA">REJEITADA (Ação insatisfatória)</option>
                    <option value="ACEITA_PARCIALMENTE">ACEITA PARCIALMENTE</option>
                    <option value="SOLICITACAO_COMPLEMENTO">SOLICITAÇÃO DE COMPLEMENTO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Data do Parecer</label>
                  <input
                    type="date"
                    value={retornoForm.dataRetorno || ''}
                    onChange={(e) => setRetornoForm({ ...retornoForm, dataRetorno: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nome do Auditor / Inspetor</label>
                <input
                  type="text"
                  placeholder="Ex: INSP. Carlos Mendonça (ANAC)"
                  value={retornoForm.auditorNome || ''}
                  onChange={(e) => setRetornoForm({ ...retornoForm, auditorNome: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Parecer Formal do Auditor *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Insira os comentários e parecer exato da autoridade ou cliente..."
                  value={retornoForm.parecerAuditor || ''}
                  onChange={(e) => setRetornoForm({ ...retornoForm, parecerAuditor: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Documento de Retorno</label>
                  <input
                    type="text"
                    placeholder="Ex: Ofício_ANAC_Retorno.pdf"
                    value={retornoForm.documentoRetornoRef || ''}
                    onChange={(e) => setRetornoForm({ ...retornoForm, documentoRetornoRef: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Prazo Adicional (se houver)</label>
                  <input
                    type="date"
                    value={retornoForm.prazoComplementar || ''}
                    onChange={(e) => setRetornoForm({ ...retornoForm, prazoComplementar: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRetornoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Salvar Parecer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
