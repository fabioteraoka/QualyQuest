import React, { useState, useMemo } from 'react';
import {
  Shield,
  FileCheck2,
  Calendar,
  Building2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  FileText,
  Users,
  MapPin,
  X,
  Edit3,
  Ban,
  RotateCcw,
  Archive,
  Trash2,
  ListChecks,
  BookOpen,
  AlertCircle,
  Check,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  TipoAuditoriaExterna,
  StatusAuditoriaExterna,
  UserProfile,
  OrganizationRecord,
  NCRecord
} from '../types';
import {
  RequisitoAuditoriaExterna,
} from '../types/auditRequirements';
import {
  checkAuditDependencies,
  AuditDependencyCheckResult
} from '../services/firebase/auditRequirementsFirestore';
import { AuditRequirementDetailModal } from './smart-audit/AuditRequirementDetailModal';

interface AuditsManagementViewProps {
  audits: AuditoriaExternaRecord[];
  findings: ConstatacaoExternaRecord[];
  requirements?: RequisitoAuditoriaExterna[];
  rncs?: NCRecord[];
  userProfile?: UserProfile | null;
  activeOrganization?: OrganizationRecord | null;
  onSelectAuditForFindings: (audit: AuditoriaExternaRecord) => void;
  onSaveAudit: (audit: AuditoriaExternaRecord) => Promise<void>;
  onDeleteAudit?: (auditId: string, forceDelete?: boolean) => Promise<void>;
  onCancelAudit?: (auditId: string, motivo: string) => Promise<void>;
  onRestoreAudit?: (auditId: string) => Promise<void>;
  onArchiveAudit?: (auditId: string) => Promise<void>;
  onSaveRequirement?: (req: RequisitoAuditoriaExterna) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export const AuditsManagementView: React.FC<AuditsManagementViewProps> = ({
  audits,
  findings,
  requirements = [],
  rncs = [],
  userProfile,
  activeOrganization,
  onSelectAuditForFindings,
  onSaveAudit,
  onDeleteAudit,
  onCancelAudit,
  onRestoreAudit,
  onArchiveAudit,
  onSaveRequirement,
  onNavigateToTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditoriaExternaRecord | null>(null);

  // Estados para Gestão de Envio (Cancelamento, Arquivamento, Exclusão e Restauração)
  const [auditToCancel, setAuditToCancel] = useState<AuditoriaExternaRecord | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState<string>('');
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const [auditToDelete, setAuditToDelete] = useState<AuditoriaExternaRecord | null>(null);
  const [dependencyCheck, setDependencyCheck] = useState<AuditDependencyCheckResult | null>(null);
  const [checkingDeps, setCheckingDeps] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [forceTestDeleteChecked, setForceTestDeleteChecked] = useState<boolean>(false);

  // Modal para Visualização dos Requisitos da Auditoria
  const [viewingReqsAudit, setViewingReqsAudit] = useState<AuditoriaExternaRecord | null>(null);
  const [selectedReqDetail, setSelectedReqDetail] = useState<RequisitoAuditoriaExterna | null>(null);
  const [reqSearchTerm, setReqSearchTerm] = useState<string>('');
  const [reqSecaoFilter, setReqSecaoFilter] = useState<string>('TODAS');

  // Form State para Nova Auditoria / Edição
  const [formData, setFormData] = useState<Partial<AuditoriaExternaRecord>>({
    numeroAuditoria: '',
    tipo: 'ANAC',
    entidadeAuditora: '',
    origem: '',
    auditoresNomes: [''],
    dataInicio: new Date().toISOString().split('T')[0],
    dataTermino: new Date().toISOString().split('T')[0],
    escopo: '',
    local: 'Instalações Principais',
    referenciaExterna: '',
    responsavelInterno: userProfile?.displayName || '',
    prazoGlobalResposta: '',
    dataRecebimento: new Date().toISOString().split('T')[0],
    status: 'RECEBIDA',
  });

  const canEdit = userProfile?.role !== 'CONSULTA';
  const isGestorOuAdmin = userProfile?.role === 'GESTOR_SGQ' || userProfile?.role === 'ADMIN';

  // Filtros
  const filteredAudits = audits.filter((audit) => {
    const matchSearch =
      audit.numeroAuditoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.entidadeAuditora.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.escopo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (audit.referenciaExterna && audit.referenciaExterna.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchType = selectedType === 'TODOS' || audit.tipo === selectedType;
    const matchStatus =
      selectedStatus === 'TODOS'
        ? true
        : selectedStatus === 'ARQUIVADA'
        ? audit.status === 'ARQUIVADA' || audit.isArquivada
        : audit.status === selectedStatus;

    return matchSearch && matchType && matchStatus;
  });

  // Estatísticas calculadas
  const totalAuditorias = audits.length;
  const auditoriasAbertas = audits.filter((a) => a.status !== 'ENCERRADA' && a.status !== 'CANCELADA' && a.status !== 'ARQUIVADA').length;
  const auditoriasEncerradas = audits.filter((a) => a.status === 'ENCERRADA').length;
  const auditoriasCanceladas = audits.filter((a) => a.status === 'CANCELADA').length;
  const totalFindings = findings.length;

  const handleOpenNewAudit = () => {
    setFormData({
      numeroAuditoria: `AUD-${new Date().getFullYear()}-0${audits.length + 1}`,
      tipo: 'ANAC',
      entidadeAuditora: 'Agência Nacional de Aviação Civil (ANAC)',
      origem: 'ANAC - SPO / GAC',
      auditoresNomes: [''],
      dataInicio: new Date().toISOString().split('T')[0],
      dataTermino: new Date().toISOString().split('T')[0],
      escopo: '',
      local: 'Hangar e Oficinas de Manutenção',
      referenciaExterna: '',
      responsavelInterno: userProfile?.displayName || 'Garantia da Qualidade SGQ',
      prazoGlobalResposta: '',
      dataRecebimento: new Date().toISOString().split('T')[0],
      status: 'RECEBIDA',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditAudit = (audit: AuditoriaExternaRecord) => {
    setFormData({ ...audit });
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numeroAuditoria || !formData.entidadeAuditora) {
      alert('Por favor, preencha o número da auditoria e a entidade auditora.');
      return;
    }

    const auditToSave: AuditoriaExternaRecord = {
      id: formData.id || `AUD-${Date.now()}`,
      organizationId: activeOrganization?.id || 'org_impacto_aviation',
      numeroAuditoria: formData.numeroAuditoria,
      tipo: formData.tipo || 'Outra',
      origem: formData.origem || formData.entidadeAuditora || 'Auditoria Externa',
      entidadeAuditora: formData.entidadeAuditora,
      auditoresNomes: formData.auditoresNomes?.filter(Boolean) || ['Auditor Externo'],
      dataInicio: formData.dataInicio || new Date().toISOString().split('T')[0],
      dataTermino: formData.dataTermino || new Date().toISOString().split('T')[0],
      escopo: formData.escopo || 'Auditoria de Conformidade Aeronáutica',
      local: formData.local || 'Instalações da Organização',
      aeronaveOuProcesso: formData.aeronaveOuProcesso || '',
      contratoOuCliente: formData.contratoOuCliente || '',
      referenciaExterna: formData.referenciaExterna || '',
      status: (formData.status as StatusAuditoriaExterna) || 'RECEBIDA',
      responsavelInterno: formData.responsavelInterno || userProfile?.displayName || 'SGQ',
      observacoes: formData.observacoes || '',
      documentosRecebidosNomes: formData.documentosRecebidosNomes || [],
      dataRecebimento: formData.dataRecebimento || new Date().toISOString().split('T')[0],
      prazoGlobalResposta: formData.prazoGlobalResposta || '',
      findingsCount: formData.findingsCount || {
        total: 0,
        maiores: 0,
        menores: 0,
        observacoes: 0,
        abertas: 0,
        respondidas: 0,
        aceitas: 0,
        rejeitadas: 0,
      },
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserUid: userProfile?.uid || 'user_anon',
    };

    await onSaveAudit(auditToSave);
    setIsModalOpen(false);
  };

  // Handler para Iniciar Exclusão Segura com Verificação de Dependências
  const handleInitiateDelete = async (audit: AuditoriaExternaRecord) => {
    setAuditToDelete(audit);
    setForceTestDeleteChecked(false);
    setCheckingDeps(true);
    try {
      const orgId = activeOrganization?.id || 'org_impacto_aviation';
      const result = await checkAuditDependencies(orgId, audit.id);
      setDependencyCheck(result);
    } catch (err: any) {
      alert(`Erro ao verificar dependências: ${err.message}`);
      setAuditToDelete(null);
    } finally {
      setCheckingDeps(false);
    }
  };

  // Confirmar Exclusão Definitiva (Normal ou Forçada para Testes)
  const handleConfirmDelete = async (force: boolean = false) => {
    if (!auditToDelete || !onDeleteAudit) return;
    setDeleteLoading(true);
    try {
      await onDeleteAudit(auditToDelete.id, force);
      setAuditToDelete(null);
      setDependencyCheck(null);
      setForceTestDeleteChecked(false);
    } catch (err: any) {
      alert(`Falha ao excluir: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Confirmar Cancelamento Lógico Controlado
  const handleConfirmCancelSubmission = async () => {
    if (!auditToCancel || !onCancelAudit) return;
    if (!motivoCancelamento.trim() || motivoCancelamento.trim().length < 5) {
      alert('Por favor, informe a justificativa detalhada do cancelamento.');
      return;
    }
    setCancelLoading(true);
    try {
      await onCancelAudit(auditToCancel.id, motivoCancelamento.trim());
      setAuditToCancel(null);
      setMotivoCancelamento('');
    } catch (err: any) {
      alert(`Falha ao cancelar: ${err.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  // Requisitos da Auditoria em Visualização
  const auditRequirementsList = useMemo(() => {
    if (!viewingReqsAudit) return [];
    return requirements.filter((r) => r.auditId === viewingReqsAudit.id);
  }, [requirements, viewingReqsAudit]);

  const auditReqSections = useMemo(() => {
    const set = new Set<string>();
    auditRequirementsList.forEach((r) => {
      if (r.capituloOuSecao) set.add(r.capituloOuSecao);
    });
    return Array.from(set).sort();
  }, [auditRequirementsList]);

  const filteredAuditReqs = useMemo(() => {
    return auditRequirementsList.filter((r) => {
      const matchSec = reqSecaoFilter === 'TODAS' || r.capituloOuSecao === reqSecaoFilter;
      const term = reqSearchTerm.toLowerCase();
      const matchSearch =
        !term ||
        r.numeroItem.toLowerCase().includes(term) ||
        r.textoOriginal.toLowerCase().includes(term) ||
        (r.referenciaNormativa && r.referenciaNormativa.toLowerCase().includes(term));
      return matchSec && matchSearch;
    });
  }, [auditRequirementsList, reqSecaoFilter, reqSearchTerm]);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Seção de Auditorias Externas */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase">
              <Shield className="w-4 h-4" />
              <span>Gestão Integrada SGQ Aeronáutico • Fase 8 & 15</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Auditorias Externas e Checklists Recebidos
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Gestão de eventos de auditoria ANAC, FAA, EASA, Clientes e Certificações. Controle individualizado de requisitos,
              constatações (findings), ciclo de vida do envio (cancelamento, arquivamento e restauração).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigateToTab('smart-audit')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Acessar Auditoria Inteligente e Checklist Kalitta QA-14"
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart Audit (FORM QA-14)</span>
            </button>

            <button
              onClick={() => onNavigateToTab('auditorias-dashboard')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Dashboard Analítico</span>
            </button>

            {canEdit && (
              <button
                onClick={handleOpenNewAudit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Auditoria</span>
              </button>
            )}
          </div>
        </div>

        {/* Cards de Resumo Rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total de Auditorias</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{totalAuditorias}</div>
            <span className="text-[11px] text-slate-500">Histórico corporativo</span>
          </div>

          <div className="bg-amber-50/60 rounded-lg p-3.5 border border-amber-200/80">
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">Em Andamento / Resposta</span>
            <div className="text-2xl font-bold text-amber-900 mt-1">{auditoriasAbertas}</div>
            <span className="text-[11px] text-amber-700">Com tratativa ativa</span>
          </div>

          <div className="bg-emerald-50/60 rounded-lg p-3.5 border border-emerald-200/80">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Encerradas / Aceitas</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{auditoriasEncerradas}</div>
            <span className="text-[11px] text-emerald-700">Homologadas pelo auditor</span>
          </div>

          <div className="bg-blue-50/60 rounded-lg p-3.5 border border-blue-200/80">
            <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Total de Constatações</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{totalFindings}</div>
            <span className="text-[11px] text-blue-700">Findings registrados</span>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número, entidade, escopo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Órgãos</option>
            <option value="ANAC">ANAC</option>
            <option value="EASA">EASA</option>
            <option value="FAA">FAA</option>
            <option value="Cliente">Clientes Aéreos</option>
            <option value="Certificação">Certificações</option>
            <option value="Outra">Outros</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="EM_RESPOSTA">Em Resposta</option>
            <option value="AGUARDANDO_EVIDENCIAS">Aguardando Evidências</option>
            <option value="ENVIADA">Enviada</option>
            <option value="AGUARDANDO_ACEITACAO">Aguardando Aceitação</option>
            <option value="ACEITA">Aceita</option>
            <option value="ENCERRADA">Encerrada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="ARQUIVADA">Arquivada</option>
          </select>
        </div>
      </div>

      {/* Lista de Auditorias em Cards */}
      <div className="space-y-4">
        {filteredAudits.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Nenhuma auditoria encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Não encontramos nenhum registro correspondente aos filtros de busca selecionados.
            </p>
            {canEdit && (
              <button
                onClick={handleOpenNewAudit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Auditoria Externa</span>
              </button>
            )}
          </div>
        ) : (
          filteredAudits.map((audit) => {
            const auditFindings = findings.filter((f) => f.auditId === audit.id);
            const auditReqs = requirements.filter((r) => r.auditId === audit.id);
            const maioresCount = auditFindings.filter((f) => f.classificacao === 'MAIOR').length;
            const menoresCount = auditFindings.filter((f) => f.classificacao === 'MENOR').length;
            const aceitasCount = auditFindings.filter((f) => f.status === 'ACEITA' || f.status === 'ENCERRADA').length;

            const isCancelled = audit.status === 'CANCELADA';
            const isArchived = audit.status === 'ARQUIVADA' || audit.isArquivada;

            return (
              <div
                key={audit.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all ${
                  isCancelled
                    ? 'border-rose-200 bg-rose-50/20'
                    : isArchived
                    ? 'border-slate-300 bg-slate-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Informações Principais da Auditoria */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {audit.numeroAuditoria}
                      </span>

                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {audit.tipo}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          audit.status === 'ENCERRADA' || audit.status === 'ACEITA'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : audit.status === 'CANCELADA'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : audit.status === 'ARQUIVADA'
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {audit.status}
                      </span>

                      {/* Badge de Requisitos Vinculados (Kalitta QA-14 ou Outros) */}
                      {auditReqs.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-amber-700" />
                          <span>{auditReqs.length} Requisitos Estruturados</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {audit.entidadeAuditora}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                        {audit.escopo}
                      </p>
                    </div>

                    {/* Justificativa de Cancelamento em destaque se aplicável */}
                    {isCancelled && audit.motivoCancelamento && (
                      <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                        <strong>Envio Cancelado:</strong> {audit.motivoCancelamento}
                        {audit.canceladoPorNome && (
                          <span className="text-[11px] text-rose-600 block mt-0.5">
                            Por: {audit.canceladoPorNome} em {audit.canceladoEm?.split('T')[0]}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Período: {audit.dataInicio} a {audit.dataTermino}</span>
                      </div>

                      {audit.prazoGlobalResposta && (
                        <div className="flex items-center gap-1 font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Prazo Resposta: {audit.prazoGlobalResposta}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Responsável: {audit.responsavelInterno}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo de Requisitos, Constatações e Ações */}
                  <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 flex items-center gap-4 min-w-[200px]">
                      <div>
                        <div className="text-xs font-semibold text-slate-600">Constatações</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold text-slate-900">{auditFindings.length}</span>
                          {maioresCount > 0 && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              {maioresCount} M
                            </span>
                          )}
                          {menoresCount > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              {menoresCount} m
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-3">
                        <div className="text-xs font-semibold text-slate-600">Requisitos</div>
                        <div className="text-lg font-bold text-amber-700 mt-1">
                          {auditReqs.length}
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-3">
                        <div className="text-xs font-semibold text-slate-600">Aceitas</div>
                        <div className="text-lg font-bold text-emerald-700 mt-1">
                          {aceitasCount}/{auditFindings.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Botão para Ver Requisitos do Checklist */}
                      {auditReqs.length > 0 && (
                        <button
                          onClick={() => setViewingReqsAudit(audit)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition-colors cursor-pointer"
                          title="Visualizar os requisitos individuais deste checklist"
                        >
                          <ListChecks className="w-3.5 h-3.5 text-amber-700" />
                          <span>Requisitos ({auditReqs.length})</span>
                        </button>
                      )}

                      {/* Botão Gerenciar Constatações (Findings) */}
                      <button
                        onClick={() => onSelectAuditForFindings(audit)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                        title="Gerenciar constatações, causas-raízes e respostas oficiais"
                      >
                        <span>Findings</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão Ver Detalhes */}
                      <button
                        onClick={() => setSelectedAuditDetail(audit)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Ver Ficha Completa do Evento"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {/* Botão Editar Dados */}
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEditAudit(audit)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Editar Cadastro da Auditoria"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Gestão de Envio: Cancelamento Controlado */}
                      {isGestorOuAdmin && !isCancelled && (
                        <button
                          onClick={() => {
                            setAuditToCancel(audit);
                            setMotivoCancelamento('');
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar Envio desta Auditoria (Cascata controlada)"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      {/* Gestão de Envio: Reverter Cancelamento */}
                      {isGestorOuAdmin && isCancelled && onRestoreAudit && (
                        <button
                          onClick={() => onRestoreAudit(audit.id)}
                          className="p-2 text-rose-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Restaurar Auditoria Cancelada nos painéis operacionais"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      {/* Gestão de Envio: Arquivar */}
                      {canEdit && !isArchived && onArchiveAudit && (
                        <button
                          onClick={() => onArchiveAudit(audit.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Arquivar Auditoria"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}

                      {/* Exclusão Definitiva Segura com Verificação de Dependências */}
                      {isGestorOuAdmin && onDeleteAudit && (
                        <button
                          onClick={() => handleInitiateDelete(audit)}
                          className="p-2 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Definitivamente (Validação Rigorosa)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Requisitos do Checklist da Auditoria Selecionada */}
      {viewingReqsAudit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Requisitos Estruturados • {viewingReqsAudit.numeroAuditoria}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewingReqsAudit.entidadeAuditora} • {auditRequirementsList.length} itens controlados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReqsAudit(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros Internos do Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar no checklist..."
                  value={reqSearchTerm}
                  onChange={(e) => setReqSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500">Seção:</span>
                <select
                  value={reqSecaoFilter}
                  onChange={(e) => setReqSecaoFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                >
                  <option value="TODAS">Todas as Seções ({auditReqSections.length})</option>
                  {auditReqSections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista com Rolagem */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {filteredAuditReqs.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                        Item {req.numeroItem}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {req.capituloOuSecao}
                      </span>
                      {req.referenciaNormativa && (
                        <span className="text-[10px] font-mono text-slate-500">
                          Ref: {req.referenciaNormativa}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 font-medium text-[11px]">
                      {req.textoOriginal}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.situacaoAtendimento === 'ATENDIDO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.situacaoAtendimento === 'PARCIALMENTE_ATENDIDO'
                          ? 'bg-amber-100 text-amber-800'
                          : req.situacaoAtendimento === 'NAO_ATENDIDO'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {req.situacaoAtendimento}
                    </span>

                    <button
                      onClick={() => setSelectedReqDetail(req)}
                      className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] cursor-pointer"
                    >
                      Avaliar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setViewingReqsAudit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento de Envio da Auditoria (Em Cascata) */}
      {auditToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cancelar Envio da Auditoria
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {auditToCancel.numeroAuditoria} — {auditToCancel.entidadeAuditora}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Efeito Cascata Controlado:</span>
              </div>
              <p>
                O cancelamento marca esta auditoria como <strong>CANCELADA</strong>, desativa seus requisitos e constatações dos painéis operacionais,
                mas preserva o histórico e a trilha de auditoria regulatória exigida pelas autoridades aeronáuticas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Justificativa Obrigatória do Cancelamento *
              </label>
              <textarea
                rows={3}
                required
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Descreva detalhadamente o motivo do cancelamento do envio (ex: auditoria cancelada pelo órgão, documento emitido com erro material, etc.)..."
                className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAuditToCancel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelLoading || !motivoCancelamento.trim()}
                onClick={handleConfirmCancelSubmission}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão Definitiva com Validação Rigorosa de Dependências */}
      {auditToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  Validação de Exclusão Definitiva
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {auditToDelete.numeroAuditoria}
                </p>
              </div>
            </div>

            {checkingDeps ? (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p>Verificando dependências regulatórias, RNCs e histórico de respostas...</p>
              </div>
            ) : dependencyCheck?.canDeleteSafely ? (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Exclusão Permitida (Sem Dependências Bloqueantes)</span>
                  </div>
                  <p>
                    Esta auditoria não possui RNCs nem respostas aceitas/enviadas ao auditor externo.
                    A remoção excluirá permanentemente {dependencyCheck.totalRequirements} requisitos e {dependencyCheck.totalFindings} constatações vinculadas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-rose-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Exclusão Definitiva Bloqueada por Integridade Regulatória</span>
                  </div>
                  <p className="leading-relaxed">
                    {dependencyCheck?.blockingReason}
                  </p>
                  <p className="text-[11px] font-semibold text-rose-900 pt-1">
                    Em produção operacional: Utilize o <strong>Cancelamento Lógico</strong> ou <strong>Arquivamento</strong> para suspender a exibição sem destruir a rastreabilidade.
                  </p>
                </div>

                {/* Opções alternativas recomendadas em produção */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const a = auditToDelete;
                      setAuditToDelete(null);
                      setDependencyCheck(null);
                      setAuditToCancel(a);
                      setMotivoCancelamento('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Usar Cancelamento Lógico</span>
                  </button>

                  {onArchiveAudit && (
                    <button
                      type="button"
                      onClick={async () => {
                        const id = auditToDelete.id;
                        setAuditToDelete(null);
                        setDependencyCheck(null);
                        await onArchiveAudit(id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arquivar Auditoria</span>
                    </button>
                  )}
                </div>

                {/* Painel do Modo de Testes / Homologação */}
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Modo de Testes / Homologação (Sobrescrita de Exclusão)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Você está testando o sistema ou limpando dados de homologação? Administradores e Gestores SGQ podem forçar a exclusão definitiva, apagando todos os registros, requisitos e constatações vinculadas.
                  </p>
                  <label className="flex items-start gap-2 pt-1 cursor-pointer border-t border-amber-200">
                    <input
                      type="checkbox"
                      checked={forceTestDeleteChecked}
                      onChange={(e) => setForceTestDeleteChecked(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-amber-950">
                      Estou testando o sistema e desejo forçar a exclusão definitiva desta auditoria e de todos os seus dados vinculados.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAuditToDelete(null);
                  setDependencyCheck(null);
                  setForceTestDeleteChecked(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Voltar
              </button>

              {dependencyCheck?.canDeleteSafely ? (
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => handleConfirmDelete(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleteLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmar Exclusão Definitiva</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={deleteLoading || !forceTestDeleteChecked}
                  onClick={() => handleConfirmDelete(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                  title={!forceTestDeleteChecked ? 'Marque a confirmação de teste acima para liberar o botão' : 'Excluir definitivamente'}
                >
                  {deleteLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Forçar Exclusão (Modo Testes)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhe Completo do Evento de Auditoria */}
      {selectedAuditDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedAuditDetail.numeroAuditoria}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedAuditDetail.entidadeAuditora}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Tipo / Órgão:</span>
                <p className="font-semibold text-slate-800">{selectedAuditDetail.tipo}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Status:</span>
                <p className="font-semibold text-slate-800">{selectedAuditDetail.status}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Período de Execução:</span>
                <p className="font-semibold text-slate-800">{selectedAuditDetail.dataInicio} até {selectedAuditDetail.dataTermino}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Data de Recebimento Notificação:</span>
                <p className="font-semibold text-slate-800">{selectedAuditDetail.dataRecebimento || 'Não informada'}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Prazo Global de Resposta:</span>
                <p className="font-semibold text-amber-700">{selectedAuditDetail.prazoGlobalResposta || 'Não especificado'}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Responsável Interno SGQ:</span>
                <p className="font-semibold text-slate-800">{selectedAuditDetail.responsavelInterno}</p>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <span className="text-slate-500 font-medium">Equipe de Auditores Externos:</span>
              <p className="font-semibold text-slate-800">{selectedAuditDetail.auditoresNomes?.join(', ') || 'Não declarada'}</p>
            </div>

            <div className="text-xs space-y-1">
              <span className="text-slate-500 font-medium">Escopo Detalhado da Auditoria:</span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                {selectedAuditDetail.escopo}
              </div>
            </div>

            {selectedAuditDetail.observacoes && (
              <div className="text-xs space-y-1">
                <span className="text-slate-500 font-medium">Observações Gerais / Instruções:</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">{selectedAuditDetail.observacoes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedAuditDetail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const a = selectedAuditDetail;
                  setSelectedAuditDetail(null);
                  onSelectAuditForFindings(a);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Acessar Constatações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Auditoria */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveSubmit} className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {formData.id ? 'Editar Dados da Auditoria Externa' : 'Cadastrar Nova Auditoria Externa'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Número de Registro Interno *</label>
                <input
                  type="text"
                  required
                  value={formData.numeroAuditoria || ''}
                  onChange={(e) => setFormData({ ...formData, numeroAuditoria: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: AUD-2026-ANAC-02"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tipo de Auditoria / Autoridade *</label>
                <select
                  value={formData.tipo || 'ANAC'}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoAuditoriaExterna })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="ANAC">ANAC (RBAC 145)</option>
                  <option value="EASA">EASA (Part-145)</option>
                  <option value="FAA">FAA (14 CFR 145)</option>
                  <option value="Cliente">Cliente Contratante / Linha Aérea</option>
                  <option value="Certificação">Órgão Certificador</option>
                  <option value="Outra">Outra Auditoria Externa</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Entidade / Organização Auditora *</label>
                <input
                  type="text"
                  required
                  value={formData.entidadeAuditora || ''}
                  onChange={(e) => setFormData({ ...formData, entidadeAuditora: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  placeholder="Ex: Kalitta Air, Agência Nacional de Aviação Civil (ANAC)"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Data Início</label>
                <input
                  type="date"
                  value={formData.dataInicio || ''}
                  onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Data Término</label>
                <input
                  type="date"
                  value={formData.dataTermino || ''}
                  onChange={(e) => setFormData({ ...formData, dataTermino: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Data Recebimento do Relatório</label>
                <input
                  type="date"
                  value={formData.dataRecebimento || ''}
                  onChange={(e) => setFormData({ ...formData, dataRecebimento: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Prazo Limite Global de Resposta</label>
                <input
                  type="date"
                  value={formData.prazoGlobalResposta || ''}
                  onChange={(e) => setFormData({ ...formData, prazoGlobalResposta: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Referência Externa (Ofício / Carta / Formulário)</label>
                <input
                  type="text"
                  value={formData.referenciaExterna || ''}
                  onChange={(e) => setFormData({ ...formData, referenciaExterna: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  placeholder="Ex: FORM QA-14 REV: 4"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Responsável Interno SGQ</label>
                <input
                  type="text"
                  value={formData.responsavelInterno || ''}
                  onChange={(e) => setFormData({ ...formData, responsavelInterno: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Escopo da Auditoria</label>
                <textarea
                  rows={3}
                  value={formData.escopo || ''}
                  onChange={(e) => setFormData({ ...formData, escopo: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  placeholder="Descreva o escopo da auditoria, áreas avaliadas e processos cobertos..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Salvar Auditoria
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Detalhe Individual do Requisito quando clicado no modal de requisitos */}
      {selectedReqDetail && (
        <AuditRequirementDetailModal
          isOpen={Boolean(selectedReqDetail)}
          onClose={() => setSelectedReqDetail(null)}
          requisito={selectedReqDetail}
          auditoria={viewingReqsAudit}
          userProfile={userProfile}
          rncs={rncs}
          onSaveRequirement={async (updatedReq) => {
            if (onSaveRequirement) {
              await onSaveRequirement(updatedReq);
            }
            setSelectedReqDetail(updatedReq);
          }}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
