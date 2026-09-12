import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Sliders, 
  Clock, 
  FolderTree, 
  History, 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical, 
  Mail, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  UserX, 
  UserCheck, 
  Edit3, 
  Trash2, 
  Copy, 
  RefreshCw, 
  Send, 
  KeyRound, 
  ExternalLink, 
  BarChart3, 
  Sparkles,
  Info,
  Check,
  X,
  ChevronRight,
  Shield,
  Layers,
  Save
} from 'lucide-react';
import { 
  OrganizationRecord, 
  UserProfile, 
  UserRole, 
  UserStatus, 
  UserInvitation, 
  OrganizationAuditEntry, 
  ModuloSistema, 
  AcaoPermissao 
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { 
  subscribeToOrganizationUsers, 
  subscribeToOrganizationInvitations, 
  createUserInvitation, 
  cancelUserInvitation, 
  resendUserInvitation, 
  updateUserRoleAndSector, 
  setUserAccountStatus, 
  updateOrganization, 
  recordOrganizationAudit,
  DEFAULT_ORG_CONFIG
} from '../services/firebase/firestore';
import { 
  MAPA_PERMISSOES_PADRAO, 
  ROLES_METADATA, 
  canManageUsers, 
  canAssignRole, 
  normalizeUserRole,
  isUserActiveStatus 
} from '../services/security/authorization';
import { OrganizationBrandLogo } from './OrganizationBrandLogo';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase/config';

interface CentralAdministrationViewProps {
  organization: OrganizationRecord | null;
  onOrganizationUpdated?: (updatedOrg: OrganizationRecord) => void;
  initialSubTab?: 'visao-geral' | 'usuarios' | 'perfis-permissoes' | 'organizacao' | 'setores' | 'configuracoes-slas' | 'audit-trail';
}

export const CentralAdministrationView: React.FC<CentralAdministrationViewProps> = ({
  organization,
  onOrganizationUpdated,
  initialSubTab = 'visao-geral',
}) => {
  const { userProfile, user } = useAuth();
  const currentOrgId = organization?.id || userProfile?.organizationId || '';
  const isOrgAdmin = userProfile?.role === 'ADMIN' || userProfile?.role === 'ADMINISTRADOR';
  const hasUserManagementPower = canManageUsers(userProfile?.role);

  // Active Submenu
  const [activeSubTab, setActiveSubTab] = useState<
    'visao-geral' | 'usuarios' | 'perfis-permissoes' | 'organizacao' | 'setores' | 'configuracoes-slas' | 'audit-trail'
  >(initialSubTab);

  // Users and Invitations state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [invitationsList, setInvitationsList] = useState<UserInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<OrganizationAuditEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Feedback notifications
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  // Subscriptions
  useEffect(() => {
    if (!currentOrgId) {
      setUsersList([]);
      setInvitationsList([]);
      setLoadingData(false);
      return;
    }
    setLoadingData(true);

    const unsubUsers = subscribeToOrganizationUsers(
      currentOrgId,
      (list) => {
        setUsersList(list);
        setLoadingData(false);
      },
      (err) => console.warn('Erro ao sincronizar usuários:', err)
    );

    const unsubInvites = subscribeToOrganizationInvitations(
      currentOrgId,
      (list) => setInvitationsList(list),
      (err) => console.warn('Erro ao sincronizar convites:', err)
    );

    // Audit trail listener for this organization
    const auditQuery = query(
      collection(db, 'organizations', currentOrgId, 'auditTrails'),
      orderBy('changedAt', 'desc'),
      limit(50)
    );
    const unsubAudit = onSnapshot(auditQuery, (snap) => {
      const logs: OrganizationAuditEntry[] = [];
      snap.forEach((d) => logs.push({ id: d.id, ...d.data() } as OrganizationAuditEntry));
      setAuditLogs(logs);
    });

    return () => {
      unsubUsers();
      unsubInvites();
      unsubAudit();
    };
  }, [currentOrgId]);

  // ----------------------------------------------------
  // USERS TAB STATE & FILTERS
  // ----------------------------------------------------
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('TODOS');
  const [filterSector, setFilterSector] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [userViewMode, setUserViewMode] = useState<'usuarios' | 'convites'>('usuarios');

  // Modal: Invite User
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('AUDITOR');
  const [inviteSector, setInviteSector] = useState('');
  const [inviteNotas, setInviteNotas] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [lastGeneratedInvite, setLastGeneratedInvite] = useState<UserInvitation | null>(null);

  // Modal: Edit User Role & Sector
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<UserProfile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('AUDITOR');
  const [editSector, setEditSector] = useState('');
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);

  // Modal: Change Status (Inactivate/Block)
  const [userToChangeStatus, setUserToChangeStatus] = useState<{ user: UserProfile; newStatus: UserStatus } | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isSavingStatusChange, setIsSavingStatusChange] = useState(false);

  // ----------------------------------------------------
  // ORGANIZATION FORM STATE
  // ----------------------------------------------------
  const currentConfig = organization?.configuration || DEFAULT_ORG_CONFIG;
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [orgLegalName, setOrgLegalName] = useState(organization?.legalName || '');
  const [orgSigla, setOrgSigla] = useState(currentConfig.identidadeVisual?.siglaAeronautica || '');
  const [orgLogoUrl, setOrgLogoUrl] = useState(organization?.logoUrl || currentConfig.identidadeVisual?.logoUrl || '');
  const [orgTimezone, setOrgTimezone] = useState(organization?.timezone || 'America/Sao_Paulo');
  const [orgLanguage, setOrgLanguage] = useState(organization?.language || 'pt-BR');
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Sectors state
  const [setoresList, setSetoresList] = useState<string[]>([...(currentConfig.setores || DEFAULT_ORG_CONFIG.setores)]);
  const [novoSetorInput, setNovoSetorInput] = useState('');

  // SLAs state
  const [slaP1, setSlaP1] = useState(currentConfig.slasInternos?.p1Horas || 24);
  const [slaP2, setSlaP2] = useState(currentConfig.slasInternos?.p2Horas || 72);
  const [slaP3, setSlaP3] = useState(currentConfig.slasInternos?.p3Dias || 15);
  const [slaP4, setSlaP4] = useState(currentConfig.slasInternos?.p4Dias || 30);

  // ----------------------------------------------------
  // COMPUTED STATS FOR EXECUTIVE DASHBOARD
  // ----------------------------------------------------
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => u.status === 'ATIVO' || u.status === 'ACTIVE').length;
  const pendingInvites = invitationsList.filter((i) => i.status === 'PENDENTE').length;
  const inactiveOrBlockedUsers = usersList.filter((u) => u.status === 'INATIVO' || u.status === 'BLOQUEADO' || u.status === 'INACTIVE').length;
  const adminUsers = usersList.filter((u) => u.role === 'ADMIN' || u.role === 'ADMINISTRADOR').length;
  const usersWithoutSector = usersList.filter((u) => !u.setor && !u.sectorId).length;

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch = 
      userSearchTerm === '' ||
      (u.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.setor || '').toLowerCase().includes(userSearchTerm.toLowerCase());

    const matchesRole = filterRole === 'TODOS' || u.role === filterRole;
    const matchesSector = filterSector === 'TODOS' || (u.setor || u.sectorId || 'Sem Setor') === filterSector;
    
    let matchesStatus = true;
    if (filterStatus === 'ATIVO') matchesStatus = u.status === 'ATIVO' || u.status === 'ACTIVE';
    else if (filterStatus === 'INATIVO') matchesStatus = u.status === 'INATIVO' || u.status === 'INACTIVE';
    else if (filterStatus === 'BLOQUEADO') matchesStatus = u.status === 'BLOQUEADO';
    else if (filterStatus === 'PENDENTE') matchesStatus = u.status === 'PENDENTE';

    return matchesSearch && matchesRole && matchesSector && matchesStatus;
  });

  // Filtered invitations
  const filteredInvitations = invitationsList.filter((i) => {
    return (
      userSearchTerm === '' ||
      (i.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (i.nome || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (i.code || '').toLowerCase().includes(userSearchTerm.toLowerCase())
    );
  });

  // ----------------------------------------------------
  // HANDLERS: USER INVITATION
  // ----------------------------------------------------
  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteNome('');
    setInviteRole('AUDITOR');
    setInviteSector(setoresList[0] || 'Qualidade');
    setInviteNotas('');
    setLastGeneratedInvite(null);
    setIsInviteModalOpen(true);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentOrgId) return;

    // Check permission to assign role
    if (!canAssignRole(userProfile?.role, inviteRole)) {
      showFeedback('error', 'Você não possui permissão para convidar um usuário com este nível de acesso.');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const invite = await createUserInvitation(
        currentOrgId,
        {
          email: inviteEmail.trim(),
          nome: inviteNome.trim(),
          role: inviteRole,
          setor: inviteSector,
          notas: inviteNotas,
        },
        userProfile,
        organization?.name
      );

      setLastGeneratedInvite(invite);
      showFeedback('success', `Convite gerado com sucesso para ${invite.email} (Código: ${invite.code}).`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao gerar convite.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este convite? O código perderá a validade imediatamente.')) return;
    try {
      await cancelUserInvitation(invitationId, userProfile);
      showFeedback('success', 'Convite cancelado com sucesso.');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao cancelar convite.');
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    try {
      const updated = await resendUserInvitation(invitationId, userProfile);
      if (updated) {
        showFeedback('success', `Convite para ${updated.email} revalidado com sucesso.`);
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao revalidar convite.');
    }
  };

  // ----------------------------------------------------
  // HANDLERS: EDIT USER ROLE & SECTOR
  // ----------------------------------------------------
  const handleOpenEditUser = (u: UserProfile) => {
    setSelectedUserToEdit(u);
    setEditRole(u.role);
    setEditSector(u.setor || u.sectorId || setoresList[0] || '');
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit || !currentOrgId) return;

    if (!canAssignRole(userProfile?.role, editRole)) {
      showFeedback('error', 'Permissão insuficiente para atribuir este perfil.');
      return;
    }

    setIsSavingUserEdit(true);
    try {
      await updateUserRoleAndSector(
        selectedUserToEdit.uid,
        selectedUserToEdit.email,
        editRole,
        editSector,
        userProfile,
        currentOrgId
      );
      showFeedback('success', `Perfil de ${selectedUserToEdit.displayName || selectedUserToEdit.email} atualizado com sucesso.`);
      setSelectedUserToEdit(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao atualizar dados do usuário.');
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  // ----------------------------------------------------
  // HANDLERS: CHANGE STATUS (ACTIVATE / INACTIVATE / BLOCK)
  // ----------------------------------------------------
  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToChangeStatus || !currentOrgId) return;

    setIsSavingStatusChange(true);
    try {
      await setUserAccountStatus(
        userToChangeStatus.user.uid,
        userToChangeStatus.user.email,
        userToChangeStatus.newStatus,
        statusChangeReason.trim(),
        userProfile,
        currentOrgId
      );
      showFeedback(
        'success',
        `Status do usuário ${userToChangeStatus.user.email} alterado para ${userToChangeStatus.newStatus}.`
      );
      setUserToChangeStatus(null);
      setStatusChangeReason('');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Erro ao alterar status do usuário.');
    } finally {
      setIsSavingStatusChange(false);
    }
  };

  // ----------------------------------------------------
  // HANDLERS: SAVE ORGANIZATION SETTINGS
  // ----------------------------------------------------
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !currentOrgId) return;

    setIsSavingOrg(true);
    try {
      const updatedConfig = {
        ...currentConfig,
        setores: setoresList,
        slasInternos: {
          p1Horas: Number(slaP1),
          p2Horas: Number(slaP2),
          p3Dias: Number(slaP3),
          p4Dias: Number(slaP4),
        },
        identidadeVisual: {
          ...currentConfig.identidadeVisual,
          siglaAeronautica: orgSigla.toUpperCase(),
          logoUrl: orgLogoUrl,
        },
      };

      const updatedOrg: OrganizationRecord = {
        ...organization,
        name: orgName,
        legalName: orgLegalName,
        logoUrl: orgLogoUrl,
        timezone: orgTimezone,
        language: orgLanguage,
        configuration: updatedConfig,
        updatedAt: new Date().toISOString(),
      };

      await updateOrganization(currentOrgId, updatedOrg);
      if (onOrganizationUpdated) onOrganizationUpdated(updatedOrg);

      await recordOrganizationAudit(currentOrgId, {
        entity: 'ORGANIZATION',
        entityId: currentOrgId,
        action: 'UPDATE',
        changedByUid: userProfile?.uid || 'admin',
        changedByEmail: userProfile?.email || 'admin@qualigest',
        summary: `Dados cadastrais e parâmetros da organização foram atualizados pelo administrador.`,
        details: JSON.stringify({ name: orgName, legalName: orgLegalName, sigla: orgSigla }),
      });

      showFeedback('success', 'Configurações da Organização salvas com sucesso!');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Falha ao salvar dados da organização.');
    } finally {
      setIsSavingOrg(false);
    }
  };

  // Sectors manipulation
  const handleAddSetor = () => {
    const val = novoSetorInput.trim();
    if (!val) return;
    if (setoresList.includes(val)) {
      showFeedback('error', 'Este setor já está cadastrado.');
      return;
    }
    setSetoresList([...setoresList, val]);
    setNovoSetorInput('');
  };

  const handleRemoveSetor = (indexToRemove: number) => {
    if (setoresList.length <= 1) {
      showFeedback('error', 'A organização precisa manter ao menos 1 setor técnico ativo.');
      return;
    }
    setSetoresList(setoresList.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Administração Central & Governança SGQ
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80 font-mono">
                  FASE 11
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-medium">
                  Multi-Tenant Auditável
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Gestão centralizada de usuários, vínculos corporativos, matriz RBAC de permissões e configurações da organização.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Organização Ativa</div>
              <div className="text-sm font-semibold text-white">{organization?.name || 'QualiGest SGQ'}</div>
            </div>
            <OrganizationBrandLogo
              organization={organization}
              logoUrl={organization?.logoUrl || currentConfig.identidadeVisual?.logoUrl}
              orgName={organization?.name || 'QualiGest SGQ'}
              siglaAeronautica={currentConfig.identidadeVisual?.siglaAeronautica}
              size="md"
            />
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-700/80 text-rose-200'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}
      </div>

      {/* Submenu Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-700/60 no-scrollbar">
        {[
          { id: 'visao-geral', label: 'Visão Geral & Indicadores', icon: <BarChart3 className="w-4 h-4" /> },
          { 
            id: 'usuarios', 
            label: 'Usuários & Acessos', 
            icon: <Users className="w-4 h-4" />,
            badge: pendingInvites > 0 ? pendingInvites : undefined
          },
          { id: 'perfis-permissoes', label: 'Perfis & Permissões', icon: <Shield className="w-4 h-4" /> },
          { id: 'organizacao', label: 'Minha Organização', icon: <Building2 className="w-4 h-4" /> },
          { id: 'setores', label: 'Setores Técnicos', icon: <FolderTree className="w-4 h-4" /> },
          { id: 'configuracoes-slas', label: 'Configurações & SLAs', icon: <Sliders className="w-4 h-4" /> },
          { id: 'audit-trail', label: 'Trilha de Auditoria (Audit)', icon: <History className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 1: VISÃO GERAL & INDICADORES */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'visao-geral' && (
        <div className="space-y-6">
          {/* Metrics Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Total Membros</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{totalUsers}</div>
              <div className="text-[11px] text-slate-400 mt-1">vinculados ao tenant</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Usuários Ativos</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">{activeUsers}</div>
              <div className="text-[11px] text-slate-400 mt-1">em operação plena</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Convites Pendentes</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400 tracking-tight">{pendingInvites}</div>
              <div className="text-[11px] text-slate-400 mt-1">aguardando aceite</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Inativos / Bloq.</span>
                <UserX className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 tracking-tight">{inactiveOrBlockedUsers}</div>
              <div className="text-[11px] text-slate-400 mt-1">acesso restrito</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Administradores</span>
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-400 tracking-tight">{adminUsers}</div>
              <div className="text-[11px] text-slate-400 mt-1">gestores com acesso total</div>
            </div>
          </div>

          {/* Governance Alerts & Action Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alertas de Governança */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Alertas de Governança & Conformidade SGQ
              </h2>

              <div className="space-y-3">
                {pendingInvites > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-start gap-3">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-amber-200">
                        {pendingInvites} convite(s) pendente(s) de ativação
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Colaboradores foram convidados mas ainda não aceitaram o ingresso na organização.
                      </div>
                      <button
                        onClick={() => {
                          setActiveSubTab('usuarios');
                          setUserViewMode('convites');
                        }}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 mt-1 flex items-center gap-1"
                      >
                        Gerenciar convites pendentes <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Nenhum convite pendente. Todos os usuários convidados já foram acolhidos.</span>
                  </div>
                )}

                {usersWithoutSector > 0 ? (
                  <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/60 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-blue-200">
                        {usersWithoutSector} usuário(s) sem setor atribuído
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Definir o setor do usuário permite rastreabilidade precisa no envio e tratamento de RNCs.
                      </div>
                      <button
                        onClick={() => {
                          setActiveSubTab('usuarios');
                          setUserViewMode('usuarios');
                        }}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1"
                      >
                        Atribuir setores aos colaboradores <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>100% dos membros possuem setor técnico configurado.</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Isolamento Tenant: Dados restritos exclusivamente à organização <strong className="text-white font-mono">{organization?.id}</strong>.</span>
                </div>
              </div>
            </div>

            {/* Distribuição de Perfis no Tenant */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Distribuição de Perfis de Acesso (RBAC)
              </h2>

              <div className="space-y-2.5">
                {(Object.keys(ROLES_METADATA) as UserRole[])
                  .filter((role, idx, arr) => arr.indexOf(role) === idx && role !== 'ADMINISTRADOR')
                  .map((role) => {
                    const count = usersList.filter((u) => normalizeUserRole(u.role) === normalizeUserRole(role)).length;
                    const meta = ROLES_METADATA[role];
                    const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                    return (
                      <div key={role} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.role}
                          </span>
                          <span className="text-xs text-slate-300 truncate">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-slate-400">{pct}%</span>
                          <strong className="text-white font-mono">{count}</strong>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 2: USUÁRIOS E ACESSOS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'usuarios' && (
        <div className="space-y-6">
          {/* Action Bar & Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* View Mode Toggle: Cadastrados vs Convites */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
              <button
                onClick={() => setUserViewMode('usuarios')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  userViewMode === 'usuarios'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Usuários Ativos ({totalUsers})</span>
              </button>

              <button
                onClick={() => setUserViewMode('convites')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  userViewMode === 'convites'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Convites Emitidos ({invitationsList.length})</span>
                {pendingInvites > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                    {pendingInvites}
                  </span>
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={userViewMode === 'usuarios' ? 'Buscar usuário por nome, email ou setor...' : 'Buscar convite por código, email...'}
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Filters and New Invite Action */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {userViewMode === 'usuarios' && (
                <>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-slate-300 text-xs focus:outline-hidden"
                  >
                    <option value="TODOS">Todos os Perfis</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="GESTOR_SGQ">Gestor SGQ</option>
                    <option value="QUALIDADE">Qualidade</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="MANUTENCAO">Manutenção</option>
                    <option value="TREINAMENTO">Treinamento</option>
                    <option value="CONSULTA">Consulta</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-slate-300 text-xs focus:outline-hidden"
                  >
                    <option value="TODOS">Todos os Status</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                  </select>
                </>
              )}

              {hasUserManagementPower && (
                <button
                  onClick={handleOpenInviteModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0 shadow-sm transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Convidar Usuário</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW: USUÁRIOS ATIVOS */}
          {userViewMode === 'usuarios' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Nome / Identificação</th>
                      <th className="px-4 py-3.5">E-mail Corporativo</th>
                      <th className="px-4 py-3.5">Perfil RBAC</th>
                      <th className="px-4 py-3.5">Setor Técnico</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Último Acesso</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                          Nenhum usuário encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const meta = ROLES_METADATA[normalizeUserRole(u.role)];
                        const isActive = isUserActiveStatus(u.status);
                        const isBloqueado = u.status === 'BLOQUEADO';
                        const isCurrentLoggedUser = u.uid === user?.uid;

                        return (
                          <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white flex items-center gap-2">
                                {u.displayName || u.email.split('@')[0]}
                                {isCurrentLoggedUser && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                                    Você
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 font-mono text-slate-300">{u.email}</td>
                            <td className="px-4 py-4">
                              <span className={`inline-block text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded border ${meta.badgeBg} ${meta.badgeText}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-300">
                              {u.setor || u.sectorId ? (
                                <span className="flex items-center gap-1.5">
                                  <FolderTree className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{u.setor || u.sectorId}</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Não atribuído</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isActive
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                    : isBloqueado
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : isBloqueado ? 'bg-rose-400' : 'bg-slate-400'}`} />
                                {u.status || 'ATIVO'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-400 text-[11px]">
                              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/D'}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {hasUserManagementPower ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Edit Role/Sector */}
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                                    title="Editar Perfil e Setor"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Toggle Active / Inactive / Block */}
                                  {!isCurrentLoggedUser && (
                                    <>
                                      {isActive ? (
                                        <button
                                          onClick={() => setUserToChangeStatus({ user: u, newStatus: 'INATIVO' })}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                                          title="Inativar Acesso do Usuário"
                                        >
                                          <UserX className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setUserToChangeStatus({ user: u, newStatus: 'ATIVO' })}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                                          title="Reativar Acesso do Usuário"
                                        >
                                          <UserCheck className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Block User */}
                                      {!isBloqueado ? (
                                        <button
                                          onClick={() => setUserToChangeStatus({ user: u, newStatus: 'BLOQUEADO' })}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                          title="Bloquear Acesso"
                                        >
                                          <Lock className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setUserToChangeStatus({ user: u, newStatus: 'ATIVO' })}
                                          className="p-1.5 rounded-lg text-rose-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                                          title="Desbloquear Usuário"
                                        >
                                          <Unlock className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Leitura</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: CONVITES EMITIDOS */}
          {userViewMode === 'convites' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Código Convite</th>
                      <th className="px-4 py-3.5">E-mail Convidado</th>
                      <th className="px-4 py-3.5">Nome Previsto</th>
                      <th className="px-4 py-3.5">Perfil</th>
                      <th className="px-4 py-3.5">Setor</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Criado em</th>
                      <th className="px-5 py-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredInvitations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                          Nenhum convite emitido no momento.
                        </td>
                      </tr>
                    ) : (
                      filteredInvitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono font-bold text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-800">
                              {inv.code}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-white">{inv.email}</td>
                          <td className="px-4 py-4 text-slate-300">{inv.nome || '—'}</td>
                          <td className="px-4 py-4">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {inv.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-300">{inv.setor || 'Geral'}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                inv.status === 'ACEITO'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : inv.status === 'PENDENTE'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-400 text-[11px]">
                            {new Date(inv.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.status === 'PENDENTE' && (
                                <>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(inv.code);
                                      showFeedback('success', `Código ${inv.code} copiado para a área de transferência!`);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                    title="Copiar Código do Convite"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleResendInvite(inv.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                                    title="Revalidar Convite"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleCancelInvite(inv.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                    title="Cancelar Convite"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 3: PERFIS E PERMISSÕES (MATRIZ RBAC) */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'perfis-permissoes' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Matriz de Acessos & Permissões por Perfil (RBAC Aeronáutico)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Diretrizes de autorização estrita em conformidade com o RBAC 145 e os requisitos de auditoria do SGQ.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  Segurança Estrita
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <th className="px-4 py-3.5 min-w-[160px]">Módulo do SGQ</th>
                    <th className="px-3 py-3.5 text-center min-w-[100px] text-rose-300">Admin</th>
                    <th className="px-3 py-3.5 text-center min-w-[110px] text-blue-300">Gestor SGQ</th>
                    <th className="px-3 py-3.5 text-center min-w-[110px] text-indigo-300">Qualidade</th>
                    <th className="px-3 py-3.5 text-center min-w-[100px] text-amber-300">Auditor</th>
                    <th className="px-3 py-3.5 text-center min-w-[110px] text-slate-300">Manutenção</th>
                    <th className="px-3 py-3.5 text-center min-w-[110px] text-emerald-300">Treinamento</th>
                    <th className="px-3 py-3.5 text-center min-w-[100px] text-slate-400">Consulta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[
                    { modulo: 'DASHBOARD' as ModuloSistema, label: 'Dashboard & Indicadores' },
                    { modulo: 'RNC' as ModuloSistema, label: 'Não Conformidades (RNC / CAPA)' },
                    { modulo: 'AUDITORIAS' as ModuloSistema, label: 'Auditorias Externas & Findings' },
                    { modulo: 'DOCUMENTOS' as ModuloSistema, label: 'Controle Documental & Revisões' },
                    { modulo: 'TREINAMENTOS' as ModuloSistema, label: 'Treinamentos, CHTs & Competências' },
                    { modulo: 'USUARIOS' as ModuloSistema, label: 'Gestão de Usuários & Convites' },
                    { modulo: 'CONFIGURACOES' as ModuloSistema, label: 'Configurações da Org & SLAs' },
                  ].map((row) => (
                    <tr key={row.modulo} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-white">{row.label}</td>
                      
                      {/* ADMIN */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-bold">
                          Total
                        </span>
                      </td>

                      {/* GESTOR SGQ */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300">
                          {row.modulo === 'CONFIGURACOES' ? 'SLAs / Geral' : 'Aprovação'}
                        </span>
                      </td>

                      {/* QUALIDADE */}
                      <td className="px-3 py-3.5 text-center">
                        {MAPA_PERMISSOES_PADRAO.QUALIDADE[row.modulo]?.length > 0 ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800 text-indigo-300">
                            {row.modulo === 'RNC' ? 'Criar / Tratar' : 'Operar'}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* AUDITOR */}
                      <td className="px-3 py-3.5 text-center">
                        {MAPA_PERMISSOES_PADRAO.AUDITOR[row.modulo]?.length > 0 ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300">
                            {row.modulo === 'AUDITORIAS' ? 'Apontar' : 'Consultar'}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* MANUTENCAO */}
                      <td className="px-3 py-3.5 text-center">
                        {row.modulo === 'RNC' ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            Apontar / Ação
                          </span>
                        ) : MAPA_PERMISSOES_PADRAO.MANUTENCAO[row.modulo]?.length > 0 ? (
                          <span className="text-[11px] font-mono text-slate-400">Consulta</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* TREINAMENTO */}
                      <td className="px-3 py-3.5 text-center">
                        {row.modulo === 'TREINAMENTOS' ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold">
                            Gestão CHTs
                          </span>
                        ) : MAPA_PERMISSOES_PADRAO.TREINAMENTO[row.modulo]?.length > 0 ? (
                          <span className="text-[11px] font-mono text-slate-400">Consulta</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* CONSULTA */}
                      <td className="px-3 py-3.5 text-center">
                        {MAPA_PERMISSOES_PADRAO.CONSULTA[row.modulo]?.length > 0 ? (
                          <span className="text-[11px] font-mono text-slate-400">Somente Leitura</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 4: MINHA ORGANIZAÇÃO */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'organizacao' && (
        <form onSubmit={handleSaveOrganization} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Dados Cadastrais & Identidade Visual da Organização
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Informações corporativas e parâmetros aeronáuticos exibidos em relatórios oficiais F 001-29 e fichas de auditoria.
              </p>
            </div>
            {isOrgAdmin && (
              <button
                type="submit"
                disabled={isSavingOrg}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingOrg ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nome Fantasia da Organização
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isOrgAdmin}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Razão Social (Legal Name)
                </label>
                <input
                  type="text"
                  value={orgLegalName}
                  onChange={(e) => setOrgLegalName(e.target.value)}
                  disabled={!isOrgAdmin}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Sigla Aeronáutica Oficial
                </label>
                <input
                  type="text"
                  value={orgSigla}
                  maxLength={6}
                  onChange={(e) => setOrgSigla(e.target.value.toUpperCase())}
                  disabled={!isOrgAdmin}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60 uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">Utilizada nos prefixos dos códigos de convite e RNCs (Ex: IMP, QG).</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  URL da Logomarca Corporativa (PNG/SVG)
                </label>
                <input
                  type="text"
                  value={orgLogoUrl}
                  onChange={(e) => setOrgLogoUrl(e.target.value)}
                  disabled={!isOrgAdmin}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Fuso Horário Operacional
                </label>
                <select
                  value={orgTimezone}
                  onChange={(e) => setOrgTimezone(e.target.value)}
                  disabled={!isOrgAdmin}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60"
                >
                  <option value="America/Sao_Paulo">Horário de Brasília (America/Sao_Paulo)</option>
                  <option value="America/Manaus">Horário de Manaus (America/Manaus)</option>
                  <option value="America/Cuiaba">Horário de Cuiabá (America/Cuiaba)</option>
                </select>
              </div>

              {/* Preview Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center gap-4">
                <OrganizationBrandLogo
                  organization={organization ? {
                    ...organization,
                    name: orgName || organization.name,
                    logoUrl: orgLogoUrl || organization.logoUrl,
                  } : null}
                  logoUrl={orgLogoUrl}
                  orgName={orgName}
                  siglaAeronautica={orgSigla}
                  size="lg"
                />
                <div>
                  <div className="text-xs font-semibold text-white">{orgName || 'Nome da Oficina'}</div>
                  <div className="text-[11px] text-slate-400">{orgLegalName || 'Razão Social'}</div>
                  <div className="text-[10px] font-mono text-blue-400 mt-1">Sigla: {orgSigla || 'SGQ'}</div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 5: SETORES TÉCNICOS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'setores' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-400" />
                Gestão de Setores Técnicos da Organização
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Departamentos utilizados para atribuição de responsabilidades, roteamento de RNCs e alocação de equipe.
              </p>
            </div>
            {isOrgAdmin && (
              <button
                onClick={handleSaveOrganization}
                disabled={isSavingOrg}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Setores</span>
              </button>
            )}
          </div>

          {/* Add Setor Input */}
          {isOrgAdmin && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome do novo setor (ex: Ensaios Não Destrutivos - END)..."
                value={novoSetorInput}
                onChange={(e) => setNovoSetorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSetor();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSetor}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Adicionar
              </button>
            </div>
          )}

          {/* Sectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {setoresList.map((setor, idx) => (
              <div
                key={setor}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-blue-950 text-blue-400 border border-blue-900/60 flex items-center justify-center font-mono text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-white truncate">{setor}</span>
                </div>
                {isOrgAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSetor(idx)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Remover Setor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 6: CONFIGURAÇÕES & SLAS */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'configuracoes-slas' && (
        <form onSubmit={handleSaveOrganization} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                SLAs de Atendimento Interno do SGQ
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Definição dos prazos limites de resposta para cada prioridade de Não Conformidade (P1 a P4).
              </p>
            </div>
            {isOrgAdmin && (
              <button
                type="submit"
                disabled={isSavingOrg}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salvar SLAs</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* P1 */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-rose-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  P1 • Crítica
                </span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-[11px] text-slate-400">Impacto direto na segurança de voo ou aeronavegabilidade.</p>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                  Prazo de Contenção (Horas)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={slaP1}
                  onChange={(e) => setSlaP1(Number(e.target.value))}
                  disabled={!isOrgAdmin}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-hidden focus:border-rose-500"
                />
              </div>
            </div>

            {/* P2 */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  P2 • Alta
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">Desvios de procedimento ou falha recorrente relevante.</p>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                  Prazo de Investigação (Horas)
                </label>
                <input
                  type="number"
                  min={12}
                  max={168}
                  value={slaP2}
                  onChange={(e) => setSlaP2(Number(e.target.value))}
                  disabled={!isOrgAdmin}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* P3 */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  P3 • Média
                </span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-[11px] text-slate-400">Desvios documentais ou não conformidades pontuais.</p>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                  Plano de Ação (Dias)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={slaP3}
                  onChange={(e) => setSlaP3(Number(e.target.value))}
                  disabled={!isOrgAdmin}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* P4 */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  P4 • Baixa
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400">Oportunidades de melhoria ou pequenos reparos.</p>
              <div>
                <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                  Prazo de Resolução (Dias)
                </label>
                <input
                  type="number"
                  min={5}
                  max={90}
                  value={slaP4}
                  onChange={(e) => setSlaP4(Number(e.target.value))}
                  disabled={!isOrgAdmin}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-hidden focus:border-slate-500"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-VIEW 7: AUDIT TRAIL ADMINISTRATIVO */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'audit-trail' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Trilha de Auditoria Administrativa (Audit Trail Imutável)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Histórico criptográfico e rastreável de todas as ações de usuários, convites e governança organizacional.
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
              {auditLogs.length} eventos registrados
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum evento registrado no Audit Trail desta organização até o momento.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900">
                        {log.action}
                      </span>
                      <span className="font-semibold text-white">{log.summary || log.entity}</span>
                    </div>
                    {log.details && (
                      <div className="text-[11px] text-slate-400 mt-1 font-mono truncate max-w-2xl">
                        {log.details}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-slate-400">
                    <div>{log.changedByEmail || 'Sistema'}</div>
                    <div className="text-slate-500 font-mono">
                      {new Date(log.changedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CONVIDAR USUÁRIO */}
      {/* ---------------------------------------------------- */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                Convidar Colaborador para a Organização
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {lastGeneratedInvite ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
                  <div className="font-semibold text-sm text-emerald-100">Convite Gerado com Sucesso!</div>
                  <p className="mt-1">
                    O convite para <strong className="text-white">{lastGeneratedInvite.email}</strong> foi registrado.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Código de Convite Único:</div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-blue-900">
                    <span className="font-mono text-lg font-bold text-blue-400 tracking-wider">
                      {lastGeneratedInvite.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lastGeneratedInvite.code);
                        showFeedback('success', 'Código copiado com sucesso!');
                      }}
                      className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Envie este código para o colaborador. Ao fazer login no QualiGest com este e-mail, ele ingressará diretamente na sua organização com o perfil <strong>{lastGeneratedInvite.role}</strong>.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setLastGeneratedInvite(null);
                      setInviteEmail('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
                  >
                    Convidar Outro
                  </button>
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    E-mail do Colaborador *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tecnico@suaoficina.com.br"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Nome Completo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={inviteNome}
                    onChange={(e) => setInviteNome(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Perfil de Acesso (RBAC) *
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
                    >
                      {isOrgAdmin && <option value="ADMIN">Administrador</option>}
                      <option value="GESTOR_SGQ">Gestor do SGQ</option>
                      <option value="QUALIDADE">Qualidade</option>
                      <option value="AUDITOR">Auditor</option>
                      <option value="MANUTENCAO">Manutenção</option>
                      <option value="TREINAMENTO">Treinamento</option>
                      <option value="CONSULTA">Consulta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      Setor Técnico *
                    </label>
                    <select
                      value={inviteSector}
                      onChange={(e) => setInviteSector(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
                    >
                      {setoresList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Notas Internas / Justificativa
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Observações de contratação, alocação de equipe ou auditoria..."
                    value={inviteNotas}
                    onChange={(e) => setInviteNotas(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingInvite || !inviteEmail.trim()}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingInvite ? 'Emitindo...' : 'Emitir Convite'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: EDIT USER ROLE & SECTOR */}
      {/* ---------------------------------------------------- */}
      {selectedUserToEdit && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                Editar Perfil & Setor do Usuário
              </h3>
              <button
                onClick={() => setSelectedUserToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="text-slate-400">Usuário:</div>
                <div className="text-white font-semibold text-sm">{selectedUserToEdit.displayName}</div>
                <div className="font-mono text-slate-400 text-[11px]">{selectedUserToEdit.email}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Novo Perfil de Acesso
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
                >
                  {isOrgAdmin && <option value="ADMIN">Administrador</option>}
                  <option value="GESTOR_SGQ">Gestor do SGQ</option>
                  <option value="QUALIDADE">Qualidade</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="MANUTENCAO">Manutenção</option>
                  <option value="TREINAMENTO">Treinamento</option>
                  <option value="CONSULTA">Consulta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Setor Técnico
                </label>
                <select
                  value={editSector}
                  onChange={(e) => setEditSector(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-hidden focus:border-blue-500"
                >
                  {setoresList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUserToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {isSavingUserEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: CHANGE STATUS (ACTIVATE / INACTIVATE / BLOCK) */}
      {/* ---------------------------------------------------- */}
      {userToChangeStatus && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                Confirmar Alteração de Status
              </h3>
              <button
                onClick={() => setUserToChangeStatus(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Você está prestes a alterar o status do usuário{' '}
                <strong className="text-white">{userToChangeStatus.user.email}</strong> para{' '}
                <span className="font-bold text-amber-400 uppercase">{userToChangeStatus.newStatus}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Justificativa Administrativa (Obrigatória para Audit Trail) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Desligamento de colaborador, término de contrato, afastamento médico, suspensão preventiva..."
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserToChangeStatus(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingStatusChange || !statusChangeReason.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {isSavingStatusChange ? 'Gravando...' : 'Confirmar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
