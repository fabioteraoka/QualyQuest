import React, { useState, useEffect, useMemo } from 'react';
import {
  Plane,
  Users,
  Award,
  FileCheck2,
  AlertTriangle,
  Clock,
  Wrench,
  Grid,
  Database,
  ArrowLeft,
  RefreshCw,
  Printer,
  Sparkles,
  BookOpen,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  LayoutDashboard,
  Settings,
  History,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AppProvider, useApp, ActiveTab } from '../rooster/context/AppContext';
import { AccessGateModal } from '../rooster/components/AccessGateModal';
import { HelpDrawer } from '../rooster/components/HelpDrawer';
import { OnboardingTour } from '../rooster/components/OnboardingTour';
import { TopBar } from '../rooster/components/TopBar';
import { Sidebar as RoosterSidebar } from '../rooster/components/Sidebar';

// Views
import { AuditoriaView } from '../rooster/views/AuditoriaView';
import { CatalogoView } from '../rooster/views/CatalogoView';
import { ConferenciaView } from '../rooster/views/ConferenciaView';
import { ConfiguracoesView } from '../rooster/views/ConfiguracoesView';
import { DashboardView } from '../rooster/views/DashboardView';
import { DesignacoesView } from '../rooster/views/DesignacoesView';
import { FichaMecanicoView } from '../rooster/views/FichaMecanicoView';
import { ImportarExportarView } from '../rooster/views/ImportarExportarView';
import { LicencasView } from '../rooster/views/LicencasView';
import { ListaDesignacaoView } from '../rooster/views/ListaDesignacaoView';
import { ManualAjudaView } from '../rooster/views/ManualAjudaView';
import { MatrizesView } from '../rooster/views/MatrizesView';
import { MotoresView } from '../rooster/views/MotoresView';
import { PessoasView } from '../rooster/views/PessoasView';
import { ProximosVencimentosView } from '../rooster/views/ProximosVencimentosView';
import { RelatorioRosterView } from '../rooster/views/RelatorioRosterView';
import { TreinamentosView } from '../rooster/views/TreinamentosView';

import {
  ColaboradorPessoa,
  UserProfile,
  RegistroTreinamentoColaborador,
  CursoTreinamento,
  QualificacaoColaborador,
} from '../types';
import { loadDatabase, repository, reconcileCanonicalFirestoreData } from '../rooster/services/storage';

export interface RoosterModuleProps {
  initialTab?: ActiveTab;
  initialSelectedPessoaId?: string | null;
  organizationId?: string;
  userProfile?: UserProfile | null;
  qualigestPersons?: ColaboradorPessoa[];
  trainingRecords?: RegistroTreinamentoColaborador[];
  trainingCourses?: CursoTreinamento[];
  qualifications?: QualificacaoColaborador[];
  bases?: any[];
  onNavigateBackToSGQ?: () => void;
  embedded?: boolean;
}

const RoosterInternalWorkspace: React.FC<{
  onNavigateBackToSGQ?: () => void;
  embedded?: boolean;
  qualigestPersons?: ColaboradorPessoa[];
  trainingRecords?: RegistroTreinamentoColaborador[];
  trainingCourses?: CursoTreinamento[];
  qualifications?: QualificacaoColaborador[];
  organizationId?: string;
}> = ({
  onNavigateBackToSGQ,
  embedded,
  qualigestPersons = [],
  trainingRecords = [],
  trainingCourses = [],
  qualifications = [],
  organizationId,
}) => {
  const {
    db,
    activeTab,
    setActiveTab,
    toastMessage,
    currentUser,
    setCurrentUser,
    triggerPrint,
    showToast,
  } = useApp();

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string>('dashboard');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isCompactNav, setIsCompactNav] = useState(embedded ?? false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  // Reconciliação canônica explícita com o Firestore
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const stats = await reconcileCanonicalFirestoreData({
        orgId: organizationId || 'org_impacto_aviation',
        persons: qualigestPersons,
        trainingRecords,
        courses: trainingCourses,
        qualifications,
        userName: currentUser.nome,
      });

      const total =
        stats.persistedPersons +
        stats.persistedCourses +
        stats.persistedTrainings +
        stats.persistedQualifications;

      if (total > 0) {
        showToast(
          `Persistência confirmada no Firestore: ${stats.persistedPersons} colaboradores, ${stats.persistedCourses} cursos, ${stats.persistedTrainings} treinamentos, ${stats.persistedQualifications} licenças.`
        );
      } else {
        showToast('Dados canônicos de pessoas, cursos e treinamentos já estão 100% íntegros com o Firestore.');
      }
    } catch (err: any) {
      showToast(`Falha na sincronização Firestore: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
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

  // Primary navigation tabs for embedded / quick mode
  const quickTabs: Array<{ id: ActiveTab; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'pessoas', label: 'Pessoas & Mecânicos', icon: Users, badge: `${db.pessoas.length}` },
    { id: 'ficha', label: 'Ficha do Mecânico (Dossiê)', icon: UserCheck },
    { id: 'designacao', label: 'Lista de Designação', icon: FileCheck2, badge: 'A4' },
    { id: 'conferencia', label: 'Conferência de Frota', icon: AlertTriangle },
    { id: 'licencas', label: 'Licenças (ANAC/FAA)', icon: Award, badge: `${db.licencas.length}` },
    { id: 'treinamentos', label: 'Treinamentos', icon: BookOpen },
    { id: 'motores', label: 'Motores Habilitados', icon: Wrench },
    { id: 'matrizes', label: 'Matrizes de Frota', icon: Grid },
    { id: 'vencimentos', label: 'Próximos Vencimentos', icon: Clock },
    { id: 'dashboard', label: 'Dashboard MRO', icon: LayoutDashboard },
    { id: 'importar', label: 'Importar / Exportar', icon: Database },
  ];

  return (
    <div className="bg-slate-50 flex flex-col text-slate-800 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Session Access Gate (bypassed for logged-in SGQ users) */}
      <AccessGateModal onAccessGranted={handleAccessGranted} bypass={true} />

      {/* Integration Header Bar */}
      <div className="no-print bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          {onNavigateBackToSGQ && (
            <button
              onClick={onNavigateBackToSGQ}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Voltar ao SGQ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <Plane className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">
                IMPACTO AVIATION — Roster &amp; Mecânicos
              </span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-bold">
                ANAC RBAC 145 / EASA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gestão integrada de pessoal técnico, licenças CHT/CCT, matrizes de frota e designação oficial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {qualigestPersons.length > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSyncing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              title="Sincronizar colaboradores do SGQ para o banco do Roster no Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : `Sincronizar SGQ (${qualigestPersons.length})`}</span>
            </button>
          )}

          <button
            onClick={triggerPrint}
            className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Imprimir relatório atual ou lista de designação"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir A4</span>
          </button>

          <button
            onClick={() => setIsCompactNav(!isCompactNav)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isCompactNav ? 'Exibir barra lateral completa' : 'Exibir abas compactas'}
          >
            {isCompactNav ? <Maximize2 className="w-3.5 h-3.5 text-sky-400" /> : <Minimize2 className="w-3.5 h-3.5 text-sky-400" />}
            <span>{isCompactNav ? 'Menu Completo' : 'Modo Compacto'}</span>
          </button>
        </div>
      </div>

      {/* TopBar do Rooster com Filtros Rápidos (Base, Categoria, Busca Global) */}
      <TopBar />

      {/* Quick Tabs horizontal sub-navigation when in compact/embedded mode */}
      {isCompactNav && (
        <div className="no-print bg-white border-b border-slate-200 px-4 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-thin shadow-2xs">
          {quickTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-sky-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-sky-800 text-sky-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty DB Banner */}
      {isDatabaseEmpty && (
        <div className="no-print bg-amber-500 text-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-amber-600 shadow-xs z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="font-bold">
              Banco de dados de mecânicos aguardando registros ou sincronização com SGQ.
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
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span>Importar planilha (.xlsx)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden min-h-[750px]">
        {!isCompactNav && <RoosterSidebar />}
        <main className="flex-1 overflow-y-auto max-h-[calc(100vh-140px)] print:max-h-none print:overflow-visible p-4">
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

export const RoosterModule: React.FC<RoosterModuleProps> = ({
  initialTab = 'pessoas',
  initialSelectedPessoaId,
  organizationId,
  userProfile,
  qualigestPersons = [],
  trainingRecords = [],
  trainingCourses = [],
  qualifications = [],
  bases = [],
  onNavigateBackToSGQ,
  embedded = false,
}) => {
  return (
    <AppProvider
      initialTab={initialTab}
      initialSelectedPessoaId={initialSelectedPessoaId}
      organizationId={organizationId}
      externalUser={{
        nome: userProfile?.displayName,
        email: userProfile?.email,
        role: userProfile?.role,
      }}
      syncPersons={qualigestPersons}
      syncTrainingRecords={trainingRecords}
      syncTrainingCourses={trainingCourses}
      syncQualifications={qualifications}
      syncBases={bases}
    >
      <RoosterInternalWorkspace
        onNavigateBackToSGQ={onNavigateBackToSGQ}
        embedded={embedded}
        qualigestPersons={qualigestPersons}
        trainingRecords={trainingRecords}
        trainingCourses={trainingCourses}
        qualifications={qualifications}
        organizationId={organizationId}
      />
    </AppProvider>
  );
};

export default RoosterModule;
