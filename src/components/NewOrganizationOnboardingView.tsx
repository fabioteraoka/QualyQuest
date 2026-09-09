import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  Sliders, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { OrganizationRecord, OrganizationConfiguration } from '../types';
import { createOrganizationWithAdmin, DEFAULT_ORG_CONFIG } from '../services/firebase/firestore';
import { useAuth } from '../hooks/useAuth';

interface NewOrganizationOnboardingViewProps {
  onOrganizationCreated?: (org: OrganizationRecord) => void;
  onCancel?: () => void;
}

export const NewOrganizationOnboardingView: React.FC<NewOrganizationOnboardingViewProps> = ({
  onOrganizationCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Organization basic info
  const [orgName, setOrgName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [customOrgId, setCustomOrgId] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [language, setLanguage] = useState('pt-BR');

  // Step 2: Initial Administrator
  const [adminName, setAdminName] = useState(user?.displayName || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');

  // Step 3: Quality Configuration
  const [setores, setSetores] = useState<string[]>([...DEFAULT_ORG_CONFIG.setores]);
  const [novoSetor, setNovoSetor] = useState('');
  const [categorias, setCategorias] = useState<string[]>([...DEFAULT_ORG_CONFIG.categorias]);
  const [novaCategoria, setNovaCategoria] = useState('');

  const [p1Horas, setP1Horas] = useState<number>(DEFAULT_ORG_CONFIG.slasInternos.p1Horas);
  const [p2Horas, setP2Horas] = useState<number>(DEFAULT_ORG_CONFIG.slasInternos.p2Horas);
  const [p3Dias, setP3Dias] = useState<number>(DEFAULT_ORG_CONFIG.slasInternos.p3Dias);
  const [p4Dias, setP4Dias] = useState<number>(DEFAULT_ORG_CONFIG.slasInternos.p4Dias);

  const [siglaAeronautica, setSiglaAeronautica] = useState('');
  const [corPrimaria, setCorPrimaria] = useState('#1e3a8a');
  const [logoUrl, setLogoUrl] = useState('');

  // Step 4: Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<OrganizationRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate ID from Name
  const generatedOrgId = customOrgId.trim()
    ? customOrgId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    : `org_${orgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 24)}`;

  const handleAddSetor = () => {
    if (novoSetor.trim() && !setores.includes(novoSetor.trim())) {
      setSetores([...setores, novoSetor.trim()]);
      setNovoSetor('');
    }
  };

  const handleRemoveSetor = (indexToRemove: number) => {
    setSetores(setores.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddCategoria = () => {
    if (novaCategoria.trim() && !categorias.includes(novaCategoria.trim())) {
      setCategorias([...categorias, novaCategoria.trim()]);
      setNovaCategoria('');
    }
  };

  const handleRemoveCategoria = (indexToRemove: number) => {
    setCategorias(categorias.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFinalize = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const finalSigla = (siglaAeronautica.trim() || orgName.trim().substring(0, 3)).toUpperCase();
      const config: Partial<OrganizationConfiguration> = {
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
          siglaAeronautica: finalSigla,
          logoUrl: logoUrl.trim() || undefined,
          nomeExibicaoCurto: orgName.trim(),
        },
        parametrosApresentacao: {
          rodapePersonalizado: `${orgName.trim()} • Sistema de Garantia da Qualidade SGQ`,
          responsavelQualidadePadrao: adminName.trim(),
          cargoResponsavelPadrao: 'Responsável Técnico / SGQ',
        },
      };

      const result = await createOrganizationWithAdmin({
        orgId: generatedOrgId,
        name: orgName.trim(),
        legalName: legalName.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        timezone,
        language,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminUid: user?.uid,
        configuration: config,
        isDemoTenant: false,
      });

      setCreatedOrg(result.organization);
      if (onOrganizationCreated) {
        onOrganizationCreated(result.organization);
      }
    } catch (err: any) {
      console.error('Failed to create organization:', err);
      setErrorMessage(err?.message || 'Erro ao criar organização. Verifique as permissões.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4">
      {/* Header */}
      <div className="mb-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>QualiGest SGQ Multi-Tenancy Comercial</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Onboarding de Nova Organização
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Provisione um ambiente SGQ 100% segregado, autônomo e em conformidade regulatória (ANAC RBAC 145 & EASA Part-145) com identidade visual e SLAs próprios.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="mb-8 bg-white border border-slate-200 rounded-[12px] p-4 shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className={`flex flex-col items-center gap-1.5 ${currentStep >= 1 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${currentStep >= 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
              1
            </div>
            <span className="hidden sm:inline">Organização</span>
          </div>
          <div className={`flex flex-col items-center gap-1.5 ${currentStep >= 2 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${currentStep >= 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
              2
            </div>
            <span className="hidden sm:inline">Administrador</span>
          </div>
          <div className={`flex flex-col items-center gap-1.5 ${currentStep >= 3 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${currentStep >= 3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
              3
            </div>
            <span className="hidden sm:inline">Configuração</span>
          </div>
          <div className={`flex flex-col items-center gap-1.5 ${currentStep >= 4 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${currentStep >= 4 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'}`}>
              4
            </div>
            <span className="hidden sm:inline">Ativação</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-[8px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Falha no Provisionamento</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Step 1: Organização */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              Etapa 1 — Identificação da Organização
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Comercial / Fantasia *
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Ex: Empresa Teste MRO ou ABC Aviation"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Utilizado nos cabeçalhos, relatórios e apresentações PPTX oficiais.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razão Social (Opcional)
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Ex: ABC Manutenção Aeronáutica Ltda."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID do Tenant (Firestore)
              </label>
              <input
                type="text"
                value={customOrgId}
                onChange={(e) => setCustomOrgId(e.target.value)}
                placeholder={generatedOrgId}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono text-slate-600 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Identificador único de partição no Firestore: <code className="text-blue-700 font-bold">{generatedOrgId}</code>
              </p>
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
                <option value="America/Sao_Paulo">Horário de Brasília (UTC-3)</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="UTC">UTC Universal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Idioma do Sistema
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (Aviation Technical)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
            ) : <div />}

            <button
              type="button"
              disabled={!orgName.trim()}
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Avançar para Administrador</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Administrador Inicial */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              Etapa 2 — Administrador Inicial do Tenant
            </h2>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Papel de Acesso Seguro (ADMIN)</span>
              O usuário inicial terá autoridade máxima dentro do tenant <code className="font-mono font-bold">{generatedOrgId}</code> para cadastrar novos auditores, configurar setores e validar padrões N5, mantendo isolamento absoluto de outras organizações.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Administrador *
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Ex: Carlos Mendonça"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo *
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@empresa.com.br"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              type="button"
              disabled={!adminName.trim() || !adminEmail.trim()}
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Avançar para Configuração SGQ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configurações SGQ */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              Etapa 3 — Parâmetros Operacionais e Identidade Visual
            </h2>
          </div>

          {/* Setores Customizáveis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800">
                Setores da Organização ({setores.length})
              </label>
              <span className="text-[11px] text-slate-400">Personalize para a estrutura do cliente</span>
            </div>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={novoSetor}
                onChange={(e) => setNovoSetor(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSetor(); } }}
                placeholder="Ex: Hangar 2 / Aviônica, Manutenção de Motores..."
                className="flex-1 text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSetor}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {setores.map((setor, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
                >
                  {setor}
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

          {/* SLAs Internos */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-800 mb-2">
              SLAs Internos de Atendimento (Compromisso da Organização)
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Separado da regra normativa imediata (RBAC 145), define as metas internas de resolução por criticidade.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg">
                <span className="block text-[11px] font-bold text-rose-800 mb-1">P1 — Crítico</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p1Horas}
                    onChange={(e) => setP1Horas(Number(e.target.value))}
                    className="w-16 p-1 text-xs font-bold text-rose-900 bg-white border border-rose-300 rounded text-center"
                    min={1}
                  />
                  <span className="text-[11px] text-rose-700 font-semibold">horas</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                <span className="block text-[11px] font-bold text-amber-800 mb-1">P2 — Alto</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p2Horas}
                    onChange={(e) => setP2Horas(Number(e.target.value))}
                    className="w-16 p-1 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded text-center"
                    min={1}
                  />
                  <span className="text-[11px] text-amber-700 font-semibold">horas</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <span className="block text-[11px] font-bold text-blue-800 mb-1">P3 — Médio</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p3Dias}
                    onChange={(e) => setP3Dias(Number(e.target.value))}
                    className="w-16 p-1 text-xs font-bold text-blue-900 bg-white border border-blue-300 rounded text-center"
                    min={1}
                  />
                  <span className="text-[11px] text-blue-700 font-semibold">dias</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">P4 — Baixo</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p4Dias}
                    onChange={(e) => setP4Dias(Number(e.target.value))}
                    className="w-16 p-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded text-center"
                    min={1}
                  />
                  <span className="text-[11px] text-slate-600 font-semibold">dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* Identidade Visual */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-3">
              Identidade Visual da Organização
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sigla Aeronáutica (3 letras)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={siglaAeronautica}
                  onChange={(e) => setSiglaAeronautica(e.target.value.toUpperCase())}
                  placeholder={orgName.substring(0, 3).toUpperCase() || 'ABC'}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono uppercase font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cor Primária Institucional
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-10 h-9 p-0.5 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-24 text-xs p-2 rounded-lg border border-slate-300 font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL do Logotipo (Opcional)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              <span>Revisar e Ativar Ambiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Finalização e Ativação */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">
              Etapa 4 — Revisão e Ativação do Ambiente Segregado
            </h2>
          </div>

          {createdOrg ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Organização "{createdOrg.name}" Ativada com Sucesso!
              </h3>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">
                O ambiente multi-tenant foi provisionado sob o ID <code className="font-mono font-bold text-blue-700">{createdOrg.id}</code>. Todas as coleções de Não Conformidades, Manuais, Trilha de Auditoria e Base de Conhecimento estão isoladas com regras de segurança ativas.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-md mx-auto text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tenant:</span>
                  <span className="font-bold text-slate-800">{createdOrg.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Administrador:</span>
                  <span className="font-bold text-slate-800">{createdOrg.createdByUserEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Setores Ativos:</span>
                  <span className="font-bold text-slate-800">{createdOrg.configuration?.setores?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SLA P1 (Crítico):</span>
                  <span className="font-bold text-rose-700">{createdOrg.configuration?.slasInternos?.p1Horas}h</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (onCancel) onCancel();
                    window.location.reload();
                  }}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Concluir e Acessar Painel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-800 border-b border-slate-200 pb-2">
                  <span>Resumo do Provisionamento</span>
                  <span className="text-emerald-700 flex items-center gap-1 font-mono">
                    <Lock className="w-3.5 h-3.5" />
                    Isolamento Firestore Ativo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><strong>Organização:</strong> {orgName}</div>
                  <div><strong>Tenant ID:</strong> <code className="font-mono text-blue-700">{generatedOrgId}</code></div>
                  <div><strong>Administrador:</strong> {adminName} ({adminEmail})</div>
                  <div><strong>Sigla / Cor:</strong> {siglaAeronautica || orgName.substring(0, 3).toUpperCase()} / {corPrimaria}</div>
                  <div><strong>Setores Cadastrados:</strong> {setores.length} setores</div>
                  <div><strong>SLAs Definidos:</strong> P1: {p1Horas}h | P2: {p2Horas}h | P3: {p3Dias}d | P4: {p4Dias}d</div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/60 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção:</strong> Nenhuma RNC ou dado confidencial de clientes existentes (como a Impacto Aviation) será copiado para esta nova organização. O ambiente começará limpo, pronto para auditorias e registros reais.
                </span>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalize}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Provisionando Tenant no Firestore...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Ativar Organização</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
