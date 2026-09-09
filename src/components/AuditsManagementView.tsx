import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  TipoAuditoriaExterna,
  StatusAuditoriaExterna,
  UserProfile,
  OrganizationRecord
} from '../types';

interface AuditsManagementViewProps {
  audits: AuditoriaExternaRecord[];
  findings: ConstatacaoExternaRecord[];
  userProfile?: UserProfile | null;
  activeOrganization?: OrganizationRecord | null;
  onSelectAuditForFindings: (audit: AuditoriaExternaRecord) => void;
  onSaveAudit: (audit: AuditoriaExternaRecord) => Promise<void>;
  onDeleteAudit?: (auditId: string) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export const AuditsManagementView: React.FC<AuditsManagementViewProps> = ({
  audits,
  findings,
  userProfile,
  activeOrganization,
  onSelectAuditForFindings,
  onSaveAudit,
  onDeleteAudit,
  onNavigateToTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuditDetail, setSelectedAuditDetail] = useState<AuditoriaExternaRecord | null>(null);

  // Form State para Nova Auditoria
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
    const matchStatus = selectedStatus === 'TODOS' || audit.status === selectedStatus;

    return matchSearch && matchType && matchStatus;
  });

  // Estatísticas calculadas
  const totalAuditorias = audits.length;
  const auditoriasAbertas = audits.filter((a) => a.status !== 'ENCERRADA' && a.status !== 'CANCELADA').length;
  const auditoriasEncerradas = audits.filter((a) => a.status === 'ENCERRADA').length;
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
      responsavelInterno: userProfile?.displayName || 'Garantia da Qualidade',
      prazoGlobalResposta: '',
      dataRecebimento: new Date().toISOString().split('T')[0],
      status: 'RECEBIDA',
    });
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
      status: formData.status as StatusAuditoriaExterna || 'RECEBIDA',
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

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Seção de Auditorias Externas */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase">
              <Shield className="w-4 h-4" />
              <span>Gestão Integrada SGQ Aeronáutico • Fase 8</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Auditorias Externas Recebidas
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Controle de ponta a ponta de auditorias ANAC, EASA, FAA, Clientes e Certificações: 
              constatações, respostas oficiais, evidências, aceitação e aprendizado.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToTab('auditorias-dashboard')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Dashboard Analítico</span>
            </button>

            {canEdit && (
              <button
                onClick={handleOpenNewAudit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Auditoria</span>
              </button>
            )}
          </div>
        </div>

        {/* Cards de Resumo Rápido */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
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
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Órgãos / Tipos</option>
            <option value="ANAC">ANAC (RBAC 145)</option>
            <option value="EASA">EASA (Part-145)</option>
            <option value="FAA">FAA (14 CFR 145)</option>
            <option value="Cliente">Auditoria de Cliente</option>
            <option value="Certificação">Certificação Externa</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="EM_RESPOSTA">Em Elaboração de Resposta</option>
            <option value="AGUARDANDO_ACEITACAO">Aguardando Aceitação</option>
            <option value="ACEITA">Aceita / Homologada</option>
            <option value="ENCERRADA">Encerrada</option>
          </select>
        </div>
      </div>

      {/* Lista de Auditorias */}
      <div className="space-y-4">
        {filteredAudits.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Nenhuma auditoria encontrada</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não há registros de auditorias externas correspondentes aos filtros selecionados. 
              Utilize o botão "Nova Auditoria" para cadastrar uma notificação de autoridade ou cliente.
            </p>
          </div>
        ) : (
          filteredAudits.map((audit) => {
            const auditFindings = findings.filter((f) => f.auditId === audit.id);
            const maioresCount = auditFindings.filter((f) => f.classificacao === 'MAIOR').length;
            const menoresCount = auditFindings.filter((f) => f.classificacao === 'MENOR').length;
            const aceitasCount = auditFindings.filter((f) => f.status === 'ACEITA' || f.status === 'ENCERRADA').length;

            return (
              <div
                key={audit.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Informações Principais */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {audit.numeroAuditoria}
                      </span>

                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        audit.tipo === 'ANAC' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : audit.tipo === 'EASA' || audit.tipo === 'FAA'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {audit.tipo}
                      </span>

                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        audit.status === 'ENCERRADA' || audit.status === 'ACEITA'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : audit.status === 'EM_RESPOSTA' || audit.status === 'AGUARDANDO_ACEITACAO'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {audit.status.replace(/_/g, ' ')}
                      </span>

                      {audit.referenciaExterna && (
                        <span className="text-xs text-slate-500 font-medium">
                          • Ref: {audit.referenciaExterna}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {audit.entidadeAuditora}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {audit.escopo}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
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

                  {/* Resumo de Constatações e Ações */}
                  <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 flex items-center gap-4 min-w-[190px]">
                      <div>
                        <div className="text-xs font-semibold text-slate-600">Constatações</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold text-slate-900">{auditFindings.length}</span>
                          {maioresCount > 0 && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              {maioresCount} Maior
                            </span>
                          )}
                          {menoresCount > 0 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              {menoresCount} Menor
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-l border-slate-200 pl-3">
                        <div className="text-xs font-semibold text-slate-600">Aceitas</div>
                        <div className="text-lg font-bold text-emerald-700 mt-1">
                          {aceitasCount}/{auditFindings.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAuditDetail(audit)}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Ver Detalhes do Evento"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectAuditForFindings(audit)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                      >
                        <span>Gerenciar Constatações</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                Cadastrar Nova Auditoria Externa
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
                  placeholder="Ex: Agência Nacional de Aviação Civil (ANAC) ou Pantanal Linhas Aéreas"
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
                <label className="block text-slate-600 font-medium mb-1">Referência Externa (Ofício / Carta)</label>
                <input
                  type="text"
                  value={formData.referenciaExterna || ''}
                  onChange={(e) => setFormData({ ...formData, referenciaExterna: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  placeholder="Ex: Ofício nº 1249/2026/GAC"
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
    </div>
  );
};
