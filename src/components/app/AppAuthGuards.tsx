import React from 'react';
import { RefreshCw, Building2 } from 'lucide-react';
import { UserProfile, OrganizationRecord } from '../../types';
import { UserBlockedOrInactiveView } from '../UserBlockedOrInactiveView';
import { UserPendingOrganizationView } from '../UserPendingOrganizationView';
import { NewOrganizationOnboardingView } from '../NewOrganizationOnboardingView';

interface AppAuthGuardsProps {
  authLoading: boolean;
  user: any;
  userProfile: UserProfile | null;
  activeOrgId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setActiveOrganization: (org: OrganizationRecord | null) => void;
  children: React.ReactNode;
}

export const AppAuthGuards: React.FC<AppAuthGuardsProps> = ({
  authLoading,
  user,
  userProfile,
  activeOrgId,
  activeTab,
  setActiveTab,
  setActiveOrganization,
  children,
}) => {
  if (authLoading || (user && userProfile === null)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100 selection:bg-blue-600">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 animate-pulse">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white tracking-wide">QUALIGEST SGQ</h2>
            <p className="text-xs text-slate-400">Resolvendo perfil de usuário e credenciais aeronáuticas...</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-400 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700/60 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Autenticando sessão segura</span>
          </div>
        </div>
      </div>
    );
  }

  if (user && (userProfile?.status === 'INACTIVE' || userProfile?.status === 'INATIVO' || userProfile?.status === 'BLOQUEADO')) {
    return <UserBlockedOrInactiveView />;
  }

  if (user && (!activeOrgId || userProfile?.status === 'PENDENTE')) {
    if (activeTab === 'onboarding-novo-cliente') {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600">
          <header className="max-w-5xl w-full mx-auto flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide text-white">QUALIGEST SGQ</div>
                <div className="text-xs text-slate-400">Onboarding de Nova Organização Aeronáutica</div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              ← Voltar para Convites
            </button>
          </header>
          <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1">
            <NewOrganizationOnboardingView
              onOrganizationCreated={(newOrg) => {
                setActiveOrganization(newOrg);
                setActiveTab('dashboard');
              }}
              onCancel={() => setActiveTab('dashboard')}
            />
          </main>
        </div>
      );
    }

    return (
      <UserPendingOrganizationView
        onInvitationAccepted={() => setActiveTab('dashboard')}
        onOpenOnboarding={() => setActiveTab('onboarding-novo-cliente')}
      />
    );
  }

  return <>{children}</>;
};
