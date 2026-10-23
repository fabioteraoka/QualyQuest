/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Sparkles, Upload } from 'lucide-react';
import { AccessGateModal } from './components/AccessGateModal';
import { HelpDrawer } from './components/HelpDrawer';
import { OnboardingTour } from './components/OnboardingTour';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AppProvider, useApp } from './context/AppContext';
import { AuditoriaView } from './views/AuditoriaView';
import { BasesView } from './views/BasesView';
import { CatalogoView } from './views/CatalogoView';
import { ConferenciaView } from './views/ConferenciaView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { DashboardView } from './views/DashboardView';
import { DesignacoesView } from './views/DesignacoesView';
import { FichaMecanicoView } from './views/FichaMecanicoView';
import { ImportarExportarView } from './views/ImportarExportarView';
import { LicencasView } from './views/LicencasView';
import { ListaDesignacaoView } from './views/ListaDesignacaoView';
import { ManualAjudaView } from './views/ManualAjudaView';
import { MatrizesView } from './views/MatrizesView';
import { MotoresView } from './views/MotoresView';
import { PessoasView } from './views/PessoasView';
import { ProximosVencimentosView } from './views/ProximosVencimentosView';
import { RelatorioRosterView } from './views/RelatorioRosterView';
import { TreinamentosView } from './views/TreinamentosView';

const AppContent: React.FC = () => {
  const { db, activeTab, setActiveTab, toastMessage, showToast, currentUser, setCurrentUser } = useApp();

  // Contextual help drawer
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string>('dashboard');

  // First use onboarding tour
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    const handleOpenHelp = (e: any) => {
      setHelpTopic(e.detail?.topic || activeTab);
      setIsHelpOpen(true);
    };

    const handleOpenTour = () => {
      setIsTourOpen(true);
    };

    window.addEventListener('open-help-drawer', handleOpenHelp);
    window.addEventListener('open-onboarding-tour', handleOpenTour);

    return () => {
      window.removeEventListener('open-help-drawer', handleOpenHelp);
      window.removeEventListener('open-onboarding-tour', handleOpenTour);
    };
  }, [activeTab]);

  const handleAccessGranted = (userName: string) => {
    if (userName && currentUser && currentUser.nome !== userName) {
      setCurrentUser({
        ...currentUser,
        nome: userName,
      });
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'designacao':
        return <ListaDesignacaoView />;
      case 'roster':
        return <RelatorioRosterView />;
      case 'conferencia':
        return <ConferenciaView />;
      case 'pessoas':
        return <PessoasView />;
      case 'bases':
        return <BasesView />;
      case 'ficha':
        return <FichaMecanicoView />;
      case 'licencas':
        return <LicencasView />;
      case 'treinamentos':
        return <TreinamentosView />;
      case 'motores':
        return <MotoresView />;
      case 'matrizes':
        return <MatrizesView />;
      case 'vencimentos':
        return <ProximosVencimentosView />;
      case 'catalogo':
        return <CatalogoView />;
      case 'designacoes_crud':
        return <DesignacoesView />;
      case 'importar':
        return <ImportarExportarView />;
      case 'configuracoes':
        return <ConfiguracoesView />;
      case 'auditoria':
        return <AuditoriaView />;
      case 'manual':
        return <ManualAjudaView />;
      default:
        return <DashboardView />;
    }
  };

  const isDatabaseEmpty = db.pessoas.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Shared access gate modal */}
      <AccessGateModal onAccessGranted={handleAccessGranted} />

      {/* Top Header */}
      <TopBar />

      {/* Banner for Empty Database on First Execution */}
      {isDatabaseEmpty && (
        <div className="no-print bg-amber-500 text-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-amber-600 shadow-xs z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="font-bold">
              Banco de dados vazio — aguardando importação do arquivo oficial de dados.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTourOpen(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tour de Primeiro Uso</span>
            </button>
            <button
              onClick={() => setActiveTab('importar')}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>Importar arquivo (.json ou .xlsx)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto h-[calc(100vh-73px)] print:h-auto print:overflow-visible">
          {renderActiveView()}
        </main>
      </div>

      {/* Slide-out Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        topicKey={helpTopic}
      />

      {/* Onboarding Tour Modal */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
