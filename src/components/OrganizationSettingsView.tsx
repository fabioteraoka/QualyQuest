import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Sliders, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Palette, 
  FileText, 
  ShieldCheck,
  RotateCcw,
  Users,
  UserCheck,
  UserX,
  Shield,
  Lock
} from 'lucide-react';
import { OrganizationRecord, OrganizationConfiguration, UserProfile, UserRole } from '../types';
import { 
  updateOrganization, 
  DEFAULT_ORG_CONFIG, 
  subscribeToOrganizationUsers, 
  updateUserRole, 
  updateUserStatus 
} from '../services/firebase/firestore';
import { OrganizationBrandLogo } from './OrganizationBrandLogo';
import { useAuth } from '../hooks/useAuth';

interface OrganizationSettingsViewProps {
  organization: OrganizationRecord | null;
  onOrganizationUpdated?: (updatedOrg: OrganizationRecord) => void;
}

export const OrganizationSettingsView: React.FC<OrganizationSettingsViewProps> = ({
  organization,
  onOrganizationUpdated,
}) => {
  const { userProfile, user } = useAuth();
  const isAdmin = userProfile?.role === 'ADMIN';
  const currentConfig = organization?.configuration || DEFAULT_ORG_CONFIG;

  // Form State
  const [name, setName] = useState(organization?.name || '');
  const [legalName, setLegalName] = useState(organization?.legalName || '');
  const [timezone, setTimezone] = useState(organization?.timezone || 'America/Sao_Paulo');
  const [language, setLanguage] = useState(organization?.language || 'pt-BR');

  // Sectors & Categories
  const [setores, setSetores] = useState<string[]>([...(currentConfig.setores || DEFAULT_ORG_CONFIG.setores)]);
  const [novoSetor, setNovoSetor] = useState('');
  const [categorias, setCategorias] = useState<string[]>([...(currentConfig.categorias || DEFAULT_ORG_CONFIG.categorias)]);
  const [novaCategoria, setNovaCategoria] = useState('');

  // SLAs
  const [p1Horas, setP1Horas] = useState<number>(currentConfig.slasInternos?.p1Horas || 24);
  const [p2Horas, setP2Horas] = useState<number>(currentConfig.slasInternos?.p2Horas || 72);
  const [p3Dias, setP3Dias] = useState<number>(currentConfig.slasInternos?.p3Dias || 15);
  const [p4Dias, setP4Dias] = useState<number>(currentConfig.slasInternos?.p4Dias || 30);

  // Users in Tenant State (RBAC)
  const [tenantUsers, setTenantUsers] = useState<UserProfile[]>([]);
  const [userActionMessage, setUserActionMessage] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  useEffect(() => {
    if (!organization?.id) {
      setTenantUsers([]);
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    const unsub = subscribeToOrganizationUsers(
      organization.id,
      (users) => {
        setTenantUsers(users);
        setLoadingUsers(false);
      },
      () => setLoadingUsers(false)
    );
    return () => unsub();
  }, [organization?.id]);

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    if (!isAdmin) {
      setUserActionMessage('Erro: Apenas administradores podem alterar o status de membros.');
      return;
    }
    if (targetUser.uid === user?.uid) {
      setUserActionMessage('Aviso: Você não pode desativar seu próprio acesso de Administrador.');
      return;
    }
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUserStatus(targetUser.uid, newStatus);
      setUserActionMessage(`Status de ${targetUser.displayName || targetUser.email} alterado para ${newStatus}.`);
      setTimeout(() => setUserActionMessage(null), 3500);
    } catch (err: any) {
      setUserActionMessage(`Erro ao atualizar status: ${err?.message || 'Permissão negada'}`);
    }
  };

  const handleChangeUserRole = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!isAdmin) {
      setUserActionMessage('Erro: Apenas administradores podem alterar perfis de permissão.');
      return;
    }
    if (targetUser.uid === user?.uid && newRole !== 'ADMIN') {
      setUserActionMessage('Aviso: Você não pode rebaixar seu próprio perfil de Administrador.');
      return;
    }
    try {
      await updateUserRole(targetUser.uid, newRole);
      setUserActionMessage(`Perfil de ${targetUser.displayName || targetUser.email} atualizado para ${newRole}.`);
      setTimeout(() => setUserActionMessage(null), 3500);
    } catch (err: any) {
      setUserActionMessage(`Erro ao atualizar perfil: ${err?.message || 'Permissão negada'}`);
    }
  };

  // Branding & Presentation
  const [corPrimaria, setCorPrimaria] = useState(currentConfig.identidadeVisual?.corPrimaria || '#1e3a8a');
  const [siglaAeronautica, setSiglaAeronautica] = useState(currentConfig.identidadeVisual?.siglaAeronautica || '');
  const [logoUrl, setLogoUrl] = useState(organization?.logoUrl || currentConfig.identidadeVisual?.logoUrl || '');
  const [rodapePersonalizado, setRodapePersonalizado] = useState(currentConfig.parametrosApresentacao?.rodapePersonalizado || '');
  const [responsavelQualidadePadrao, setResponsavelQualidadePadrao] = useState(currentConfig.parametrosApresentacao?.responsavelQualidadePadrao || '');
  const [cargoResponsavelPadrao, setCargoResponsavelPadrao] = useState(currentConfig.parametrosApresentacao?.cargoResponsavelPadrao || 'Gestor da Garantia da Qualidade');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAddSetor = () => {
    if (novoSetor.trim() && !setores.includes(novoSetor.trim())) {
      setSetores([...setores, novoSetor.trim()]);
      setNovoSetor('');
    }
  };

  const handleRemoveSetor = (index: number) => {
    setSetores(setores.filter((_, idx) => idx !== index));
  };

  const handleAddCategoria = () => {
    if (novaCategoria.trim() && !categorias.includes(novaCategoria.trim())) {
      setCategorias([...categorias, novaCategoria.trim()]);
      setNovaCategoria('');
    }
  };

  const handleRemoveCategoria = (index: number) => {
    setCategorias(categorias.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const updatedConfiguration: OrganizationConfiguration = {
        ...currentConfig,
        setores,
        categorias,
        slasInternos: {
          p1Horas: Number(p1Horas) || 24,
          p2Horas: Number(p2Horas) || 72,
          p3Dias: Number(p3Dias) || 15,
          p4Dias: Number(p4Dias) || 30,
        },
        identidadeVisual: {
          corPrimaria,
          siglaAeronautica: siglaAeronautica.toUpperCase().trim() || name.substring(0, 3).toUpperCase(),
          logoUrl: logoUrl.trim() || undefined,
          nomeExibicaoCurto: name,
        },
        parametrosApresentacao: {
          rodapePersonalizado: rodapePersonalizado.trim() || `${name} • Sistema de Garantia da Qualidade SGQ`,
          responsavelQualidadePadrao: responsavelQualidadePadrao.trim(),
          cargoResponsavelPadrao: cargoResponsavelPadrao.trim(),
        },
      };

      const updates: Partial<OrganizationRecord> = {
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        timezone,
        language,
        configuration: updatedConfiguration,
      };

      await updateOrganization(organization.id, updates);

      const completeUpdatedOrg: OrganizationRecord = {
        ...organization,
        ...updates,
      };

      setSaveSuccess(true);
      if (onOrganizationUpdated) {
        onOrganizationUpdated(completeUpdatedOrg);
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving organization settings:', err);
      setSaveError(err?.message || 'Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 px-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              TENANT: {organization?.id || 'org_padrao'}
            </span>
            {organization?.isDemoTenant && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                AMBIENTE DEMONSTRAÇÃO
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configurações da Organização
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie setores operacionais, SLAs internos, identidade visual e parâmetros regulatórios do seu tenant.
          </p>
        </div>

        {/* Dynamic Logo Preview */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Identidade Visual Ativa
          </div>
          <OrganizationBrandLogo 
            organization={{
              ...organization,
              name: name || organization?.name || 'Organização',
              legalName,
              logoUrl: logoUrl || undefined,
              id: organization?.id || 'preview',
              status: 'ACTIVE',
              createdAt: '',
              updatedAt: '',
              configuration: {
                ...currentConfig,
                identidadeVisual: {
                  corPrimaria,
                  siglaAeronautica: siglaAeronautica || name.substring(0, 3).toUpperCase(),
                }
              }
            }} 
            width={190} 
            height={48} 
          />
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configurações salvas e aplicadas em tempo real com sucesso!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloco 1: Dados Institucionais */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">1. Dados da Organização</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Comercial / Fantasia *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fuso Horário
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="America/Sao_Paulo">Brasília (UTC-3)</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="UTC">UTC Universal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Idioma
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (Technical)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sigla Aeronáutica (3-4 letras)
              </label>
              <input
                type="text"
                maxLength={4}
                value={siglaAeronautica}
                onChange={(e) => setSiglaAeronautica(e.target.value.toUpperCase())}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 uppercase font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cor Primária
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-9 h-9 rounded border border-slate-300 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-24 text-xs p-2 rounded-lg border border-slate-300 font-mono text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Setores Operacionais */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-800">
                2. Setores & Bases Cadastradas ({setores.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Alimenta sugestões e filtros do formulário RNC
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={novoSetor}
              onChange={(e) => setNovoSetor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSetor(); } }}
              placeholder="Digite o novo setor (ex: Hangar 3 / Aviônica)..."
              className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSetor}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Setor</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
            {setores.map((s, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 shadow-2xs"
              >
                <span>{s}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSetor(idx)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remover setor"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Bloco 3: SLAs Internos */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">
              3. SLAs Internos de Resolução (Metas da Organização)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg">
              <span className="block text-xs font-bold text-rose-800 mb-1">P1 — Crítico</span>
              <p className="text-[10px] text-rose-600 mb-2">Artigos inseguros / Risco Severo</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={p1Horas}
                  onChange={(e) => setP1Horas(Number(e.target.value))}
                  className="w-16 p-1.5 text-xs font-bold text-rose-900 bg-white border border-rose-300 rounded text-center"
                />
                <span className="text-xs font-semibold text-rose-800">horas</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg">
              <span className="block text-xs font-bold text-amber-800 mb-1">P2 — Alto</span>
              <p className="text-[10px] text-amber-600 mb-2">Desvios de processo / Auditorias</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={p2Horas}
                  onChange={(e) => setP2Horas(Number(e.target.value))}
                  className="w-16 p-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded text-center"
                />
                <span className="text-xs font-semibold text-amber-800">horas</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg">
              <span className="block text-xs font-bold text-blue-800 mb-1">P3 — Médio</span>
              <p className="text-[10px] text-blue-600 mb-2">Desvios operacionais pontuais</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={p3Dias}
                  onChange={(e) => setP3Dias(Number(e.target.value))}
                  className="w-16 p-1.5 text-xs font-bold text-blue-900 bg-white border border-blue-300 rounded text-center"
                />
                <span className="text-xs font-semibold text-blue-800">dias</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="block text-xs font-bold text-slate-800 mb-1">P4 — Baixo</span>
              <p className="text-[10px] text-slate-500 mb-2">Oportunidades de melhoria</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={p4Dias}
                  onChange={(e) => setP4Dias(Number(e.target.value))}
                  className="w-16 p-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded text-center"
                />
                <span className="text-xs font-semibold text-slate-700">dias</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 4: Parâmetros de Apresentação e Relatório */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">
              4. Parâmetros de Relatórios e Apresentações PPTX
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Responsável Técnico / SGQ Padrão
              </label>
              <input
                type="text"
                value={responsavelQualidadePadrao}
                onChange={(e) => setResponsavelQualidadePadrao(e.target.value)}
                placeholder="Ex: Carlos Mendonça"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo / Função do Responsável
              </label>
              <input
                type="text"
                value={cargoResponsavelPadrao}
                onChange={(e) => setCargoResponsavelPadrao(e.target.value)}
                placeholder="Ex: Gestor da Garantia da Qualidade"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rodapé Personalizado dos Relatórios
              </label>
              <input
                type="text"
                value={rodapePersonalizado}
                onChange={(e) => setRodapePersonalizado(e.target.value)}
                placeholder={`${name} • Sistema de Garantia da Qualidade SGQ`}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bloco 5: Gestão de Usuários & Controle de Acesso (RBAC) */}
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  5. Membros da Organização & Controle de Acesso (RBAC)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Gerencie usuários associados a este tenant. Segregação estrita conforme RBAC 145 / EASA Part-145.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isAdmin ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {isAdmin ? 'ADMINISTRADOR (Acesso Total)' : `PERFIL: ${userProfile?.role || 'CONSULTA'} (Somente Leitura)`}
              </span>
            </div>
          </div>

          {userActionMessage && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              userActionMessage.startsWith('Erro') || userActionMessage.startsWith('Aviso')
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{userActionMessage}</span>
            </div>
          )}

          {!isAdmin && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Apenas usuários com perfil <strong>ADMIN</strong> podem alterar papéis operacionais ou revogar acessos de membros.</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">Nome / Usuário</th>
                  <th className="py-2.5 px-3">E-mail</th>
                  <th className="py-2.5 px-3">Perfil RBAC</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações de Governança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenantUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      {loadingUsers ? 'Carregando equipe do tenant...' : 'Nenhum outro membro registrado diretamente neste tenant ainda.'}
                    </td>
                  </tr>
                ) : (
                  tenantUsers.map((u) => {
                    const isCurrentUser = u.uid === user?.uid;
                    return (
                      <tr key={u.uid} className={`hover:bg-slate-50/50 ${isCurrentUser ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{u.displayName || 'Sem nome'}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                                Você
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="py-2.5 px-3">
                          {isAdmin && !isCurrentUser ? (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeUserRole(u, e.target.value as UserRole)}
                              className="text-xs p-1 rounded border border-slate-300 font-medium bg-white focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="GESTOR_SGQ">GESTOR_SGQ</option>
                              <option value="AUDITOR">AUDITOR</option>
                              <option value="CONSULTA">CONSULTA</option>
                            </select>
                          ) : (
                            <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {u.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isAdmin && !isCurrentUser ? (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                                u.status === 'ACTIVE'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Revogar acesso do usuário' : 'Reativar acesso do usuário'}
                            >
                              {u.status === 'ACTIVE' ? (
                                <>
                                  <UserX className="w-3 h-3" />
                                  <span>Desativar</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>Reativar</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              {isCurrentUser ? 'Sessão ativa' : 'Protegido'}
                            </span>
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

        {/* Action Button Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!isAdmin && (
            <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
              Modo visualização: perfil atual não permite gravar configurações da organização.
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving || !isAdmin}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando Alterações...' : 'Salvar Configurações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
