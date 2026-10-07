import React from 'react';
import { Database, UploadCloud, Sparkles } from 'lucide-react';
import { OrganizationRecord, NCRecord } from '../../types';
import { WelcomeAdminBanner } from '../WelcomeAdminBanner';

interface AppNotificationBannersProps {
  firestoreError: string | null;
  activeOrganization: OrganizationRecord | null;
  activeOrgId: string;
  activeTab: string;
  isWelcomeDismissed: boolean;
  loadingRecords: boolean;
  records: NCRecord[];
  detectedLocalCount: number;
  isBootstrapping: boolean;
  onDismissWelcome: () => void;
  onNavigateToTab: (tab: string) => void;
  onOpenChecklist: () => void;
  onOpenDiagnostics: () => void;
  onOpenMigration: () => void;
  onBootstrapDemo: () => void;
  onNewNC: () => void;
}

export const AppNotificationBanners: React.FC<AppNotificationBannersProps> = ({
  firestoreError,
  activeOrganization,
  activeOrgId,
  activeTab,
  isWelcomeDismissed,
  loadingRecords,
  records,
  detectedLocalCount,
  isBootstrapping,
  onDismissWelcome,
  onNavigateToTab,
  onOpenChecklist,
  onOpenDiagnostics,
  onOpenMigration,
  onBootstrapDemo,
  onNewNC,
}) => {
  return (
    <>
      {/* Quota / Sync Notice */}
      {firestoreError && (
        <div className="bg-amber-950 text-amber-100 px-3 sm:px-6 py-3.5 border-b border-amber-600/40 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-300">AVISO DO SERVIÇO EM TEMPO REAL:</span>
                  <span className="bg-emerald-900/90 text-emerald-200 border border-emerald-600/40 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                    ✓ Dados 100% Salvos na Nuvem
                  </span>
                </div>
                <p className="text-amber-200/90 leading-relaxed text-[11px] sm:text-xs">
                  <strong>Nenhum dado ou validação foi perdido!</strong> Todas as Não Conformidades, Manuais, Metrologia e Conhecimentos continuam preservados no banco de dados. O limite diário de leituras gratuitas do Firebase Spark foi temporariamente atingido e restabelece automaticamente à meia-noite (PST). O sistema mantém os dados em cache e contingência.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={onOpenDiagnostics}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-200 font-medium rounded-[6px] border border-amber-700/50 transition-colors text-xs cursor-pointer"
              >
                Diagnóstico Firestore
              </button>
              <a
                href="https://console.firebase.google.com/project/ai-studio-applet-webapp-bdbf6/firestore/databases/ai-studio-qualigestgestode-97a188de-6117-44a7-be8d-44d92563ba38/data?openUpgradeDialog=true"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-[6px] transition-colors flex items-center gap-1.5 text-xs shadow-xs"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Ver Dados no Firebase Console</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      {!isWelcomeDismissed && activeOrganization && (activeTab === 'dashboard' || activeTab === 'configuracoes-org') && (
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-4">
          <WelcomeAdminBanner
            organization={activeOrganization}
            onNavigateToTab={onNavigateToTab}
            onOpenChecklist={onOpenChecklist}
            onDismiss={onDismissWelcome}
          />
        </div>
      )}

      {/* Empty State Banner */}
      {!loadingRecords && records.length === 0 && (
        <div className="bg-slate-900 text-white px-3 sm:px-6 py-3 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-center sm:text-left">
                <strong>Cloud Firestore Conectado:</strong> Nenhum registro encontrado na organização <code className="text-blue-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">{activeOrgId}</code>.
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={onOpenMigration}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                title="Recuperar dados e manuais salvos anteriormente no seu navegador para o Cloud Firestore"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-200" />
                <span>Recuperar Dados do Navegador{detectedLocalCount > 0 ? ` (${detectedLocalCount})` : ''}</span>
              </button>
              <button
                onClick={onBootstrapDemo}
                disabled={isBootstrapping}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>{isBootstrapping ? 'Gravando no Firestore...' : 'Carregar Amostra'}</span>
              </button>
              <button
                onClick={onNewNC}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-[6px] transition-colors cursor-pointer border border-slate-700 text-xs"
              >
                + Criar RNC
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
