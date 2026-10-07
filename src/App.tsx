import React, { useState, useEffect, useMemo } from 'react';
import { NCRecord } from './types';
import { DEFAULT_ORGANIZATION_ID, bootstrapDemonstrationData } from './services/firebase/firestore';
import { useAuth } from './hooks/useAuth';
import { useAppSubscriptions } from './hooks/useAppSubscriptions';
import { useAuditActions } from './hooks/useAuditActions';
import { useNCActions } from './hooks/useNCActions';
import { gerarAlertas } from './utils/qualityHelpers';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { detectLocalMaterial } from './services/localDataMigration';
import { AppViewRouter } from './components/app/AppViewRouter';
import { AppModals } from './components/app/AppModals';
import { AppAuthGuards } from './components/app/AppAuthGuards';
import { AppNotificationBanners } from './components/app/AppNotificationBanners';
import { MobileBottomNav } from './components/app/MobileBottomNav';
import { getTitleForTab } from './components/app/tabTitles';
import { saveNonConformity } from './services/firebase/firestore';
import { saveAvaliacaoRequisito } from './services/firebase/clientRequirementsFirestore';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const activeOrgId = (user && userProfile?.organizationId) ? userProfile.organizationId : DEFAULT_ORGANIZATION_ID;

  // Subscriptions & Real-Time Collections Hook
  const {
    records,
    setRecords,
    manuals,
    setManuals,
    comparacoes,
    knowledgeList,
    activeOrganization,
    setActiveOrganization,
    loadingRecords,
    firestoreError,
    externalAudits,
    setExternalAudits,
    auditFindings,
    setAuditFindings,
    auditLessons,
    setAuditLessons,
    auditRequirements,
    setAuditRequirements,
    selectedAuditForFindings,
    setSelectedAuditForFindings,
    persons,
    setPersons,
    competencies,
    personCompetencies,
    trainingCourses,
    setTrainingCourses,
    trainingRecords,
    setTrainingRecords,
    qualifications,
    setQualifications,
    personDocuments,
    activityRequirements,
    aiCompetencySuggestions,
    documentosControlados,
    setDocumentosControlados,
    revisoesDocumentais,
    fontesExternas,
    solicitacoesCliente,
    logsVerificacaoFontes,
    evidenciasConsultaDoc,
    clientesExternos,
    basesOperacionais,
    programasClientes,
    setProgramasClientes,
    controlesCentrais,
    requisitosClientes,
    setRequisitosClientes,
    avaliacoesRequisitos,
    setAvaliacoesRequisitos,
    ferramentasCalibradas,
    setFerramentasCalibradas,
    smartImports,
    templatesAprovados,
    setTemplatesAprovados,
  } = useAppSubscriptions({ user, userProfile, authLoading, activeOrgId });

  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Multi-Tenant Setup Checklist Modal & Welcome Banner State
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isWelcomeDismissed, setIsWelcomeDismissed] = useState(false);
  const [initialPersonStatusFilter, setInitialPersonStatusFilter] = useState<string>('TODOS');

  // Currently selected NC for detail or edit or official sheet
  const [selectedNC, setSelectedNC] = useState<NCRecord | null>(null);
  const [formInitialTab, setFormInitialTab] = useState<'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia'>('dados');
  const [reportFilterStatus, setReportFilterStatus] = useState<string | undefined>(undefined);

  // Modals state
  const [auditTargetNC, setAuditTargetNC] = useState<NCRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTechnicalAuditModalOpen, setIsTechnicalAuditModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [detectedLocalCount, setDetectedLocalCount] = useState<number>(0);

  // Global search & mobile drawer
  const [headerSearchTerm, setHeaderSearchTerm] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // Extracted Action Handlers: NCs & Manuals
  const {
    handleSaveNC,
    handleDeleteNC,
    handleDeleteMultipleNC,
    handleSaveManual,
    handleDeleteManual,
    handleUpdateDeadline,
  } = useNCActions({
    activeOrgId,
    user,
    userProfile,
    records,
    setRecords,
    manuals,
    setManuals,
    selectedNC,
    setSelectedNC,
    setActiveTab,
  });

  // Extracted Action Handlers: Audits
  const {
    handleSaveAudit,
    handleDeleteAudit,
    handleCancelAudit,
    handleRestoreAudit,
    handleArchiveAudit,
    handleSaveAuditRequirement,
    handleSaveBatchAuditRequirements,
    handleSaveFinding,
    handleDeleteFinding,
    handleSaveLesson,
    handleCriarRNCFromFinding,
    handleCandidatarKnowledge,
  } = useAuditActions({
    activeOrgId,
    user,
    userProfile,
    setExternalAudits,
    setAuditRequirements,
    setAuditFindings,
    setAuditLessons,
  });

  // Scan local material to assist data recovery
  useEffect(() => {
    detectLocalMaterial(records, manuals)
      .then((summary) => setDetectedLocalCount(summary.totalLocalItems))
      .catch((err) => console.warn('Detecção de dados locais:', err));
  }, [records.length, manuals.length]);

  // Automatic alerts calculation
  const alertas = useMemo(() => {
    return gerarAlertas(records, activeOrganization?.configuration?.slasInternos);
  }, [records, activeOrganization?.configuration?.slasInternos]);

  const handleSaveAvaliacaoCliente = async (avaliacao: any) => {
    if (user) {
      await saveAvaliacaoRequisito(activeOrgId, avaliacao, userProfile);
    }
    if (avaliacao.id) {
      setAvaliacoesRequisitos((prev) => {
        const idx = prev.findIndex((av) => av.id === avaliacao.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...avaliacao };
          return next;
        }
        return [avaliacao, ...prev];
      });
    }
  };

  const handleCriarRNCDeRequisito = (rncPayload: any) => {
    setSelectedNC(rncPayload as NCRecord);
    setFormInitialTab('dados');
    setActiveTab('formulario');
  };

  const handleAuditNC = (nc: NCRecord) => {
    setAuditTargetNC(nc);
    setIsAuditModalOpen(true);
  };

  const handleApplyAuditSuggestions = async (updates: Partial<NCRecord>) => {
    if (!auditTargetNC) return;
    const updatedNC: NCRecord = {
      ...auditTargetNC,
      ...updates,
      atualizadoEm: new Date().toISOString(),
    };
    try {
      await saveNonConformity(activeOrgId, updatedNC, userProfile);
      setSelectedNC(updatedNC);
    } catch (e) {
      console.error('Erro ao aplicar sugestões da auditoria no Firestore:', e);
    }
  };

  const handleBootstrapDemo = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBootstrapping(true);
    try {
      await bootstrapDemonstrationData(activeOrgId, userProfile);
    } catch (e: any) {
      alert(`Erro ao inicializar dados: ${e?.message || e}`);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleViewOfficial = (nc: NCRecord) => {
    setSelectedNC(nc);
    setActiveTab('oficial');
  };

  const handleEditNC = (nc: NCRecord, initialTab: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia' = 'dados') => {
    setSelectedNC(nc);
    setFormInitialTab(initialTab);
    setActiveTab('formulario');
  };

  const handleNewNC = () => {
    setSelectedNC(null);
    setFormInitialTab('dados');
    setActiveTab('formulario');
  };

  const handleOpenReportWithFilter = (statusFilter?: string) => {
    setReportFilterStatus(statusFilter);
    setActiveTab('relatorio');
  };

  return (
    <AppAuthGuards
      authLoading={authLoading}
      user={user}
      userProfile={userProfile}
      activeOrgId={activeOrgId}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      setActiveOrganization={setActiveOrganization}
    >
      <div className="min-h-screen bg-slate-100/70 text-slate-800 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab as any}
          setActiveTab={(tab) => {
            if (tab === 'relatorio') {
              setReportFilterStatus(undefined);
            }
            setActiveTab(tab as any);
          }}
          alertas={alertas}
          activeOrganization={activeOrganization}
          onOpenChecklist={() => setIsChecklistModalOpen(true)}
          onOpenOnboarding={() => setActiveTab('onboarding-novo-cliente')}
          onNewNC={handleNewNC}
          onOpenExtractor={() => setActiveTab('extrator')}
          onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenTechnicalAudit={() => setIsTechnicalAuditModalOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Layout Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            alertas={alertas}
            activeOrganization={activeOrganization}
            onOpenChecklist={() => setIsChecklistModalOpen(true)}
            onOpenOnboarding={() => setActiveTab('onboarding-novo-cliente')}
            onOpenManual={() => setActiveTab('manual-utilizacao')}
            onOpenAlerts={() => setActiveTab('alertas')}
            searchTerm={headerSearchTerm}
            onSearchChange={setHeaderSearchTerm}
            currentViewTitle={getTitleForTab(activeTab, selectedNC?.numeroNC)}
            onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          <AlertBanner
            alertas={alertas}
            onOpenAlertsTab={() => setActiveTab('alertas')}
          />

          <AppNotificationBanners
            firestoreError={firestoreError}
            activeOrganization={activeOrganization}
            activeOrgId={activeOrgId}
            activeTab={activeTab}
            isWelcomeDismissed={isWelcomeDismissed}
            loadingRecords={loadingRecords}
            records={records}
            detectedLocalCount={detectedLocalCount}
            isBootstrapping={isBootstrapping}
            onDismissWelcome={() => setIsWelcomeDismissed(true)}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
            onOpenChecklist={() => setIsChecklistModalOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
            onOpenMigration={() => setIsMigrationModalOpen(true)}
            onBootstrapDemo={handleBootstrapDemo}
            onNewNC={handleNewNC}
          />

          {/* Main Content Router */}
          <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto overflow-x-hidden">
            {loadingRecords && records.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-700">Sincronizando registros com o Cloud Firestore...</p>
                <p className="text-xs text-slate-400">Garantindo única fonte de verdade multiusuário em tempo real</p>
              </div>
            ) : (
              <AppViewRouter
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeOrgId={activeOrgId}
                user={user}
                userProfile={userProfile}
                activeOrganization={activeOrganization}
                setActiveOrganization={setActiveOrganization}
                records={records}
                manuals={manuals}
                comparacoes={comparacoes}
                knowledgeList={knowledgeList}
                alertas={alertas}
                selectedNC={selectedNC}
                setSelectedNC={setSelectedNC}
                formInitialTab={formInitialTab}
                reportFilterStatus={reportFilterStatus}
                initialPersonStatusFilter={initialPersonStatusFilter}
                setInitialPersonStatusFilter={setInitialPersonStatusFilter}
                handleViewOfficial={handleViewOfficial}
                handleNewNC={handleNewNC}
                handleEditNC={handleEditNC}
                handleDeleteNC={handleDeleteNC}
                handleDeleteMultipleNC={handleDeleteMultipleNC}
                handleAuditNC={handleAuditNC}
                handleSaveNC={handleSaveNC}
                handleOpenReportWithFilter={handleOpenReportWithFilter}
                handleUpdateDeadline={handleUpdateDeadline}
                handleSaveManual={handleSaveManual}
                handleDeleteManual={handleDeleteManual}
                setIsMigrationModalOpen={setIsMigrationModalOpen}
                setIsTechnicalAuditModalOpen={setIsTechnicalAuditModalOpen}
                setIsDiagnosticsModalOpen={setIsDiagnosticsModalOpen}
                setIsChecklistModalOpen={setIsChecklistModalOpen}
                externalAudits={externalAudits}
                auditFindings={auditFindings}
                auditLessons={auditLessons}
                auditRequirements={auditRequirements}
                selectedAuditForFindings={selectedAuditForFindings}
                setSelectedAuditForFindings={setSelectedAuditForFindings}
                handleSaveAudit={handleSaveAudit}
                handleDeleteAudit={handleDeleteAudit}
                handleCancelAudit={handleCancelAudit}
                handleRestoreAudit={handleRestoreAudit}
                handleArchiveAudit={handleArchiveAudit}
                handleSaveAuditRequirement={handleSaveAuditRequirement}
                handleSaveBatchAuditRequirements={handleSaveBatchAuditRequirements}
                handleSaveFinding={handleSaveFinding}
                handleDeleteFinding={handleDeleteFinding}
                handleCriarRNCFromFinding={handleCriarRNCFromFinding}
                handleSaveLesson={handleSaveLesson}
                handleCandidatarKnowledge={handleCandidatarKnowledge}
                persons={persons}
                setPersons={setPersons}
                competencies={competencies}
                personCompetencies={personCompetencies}
                qualifications={qualifications}
                setQualifications={setQualifications}
                trainingRecords={trainingRecords}
                setTrainingRecords={setTrainingRecords}
                trainingCourses={trainingCourses}
                setTrainingCourses={setTrainingCourses}
                personDocuments={personDocuments}
                activityRequirements={activityRequirements}
                aiCompetencySuggestions={aiCompetencySuggestions}
                documentosControlados={documentosControlados}
                setDocumentosControlados={setDocumentosControlados}
                revisoesDocumentais={revisoesDocumentais}
                fontesExternas={fontesExternas}
                solicitacoesCliente={solicitacoesCliente}
                logsVerificacaoFontes={logsVerificacaoFontes}
                evidenciasConsultaDoc={evidenciasConsultaDoc}
                clientesExternos={clientesExternos}
                basesOperacionais={basesOperacionais}
                programasClientes={programasClientes}
                setProgramasClientes={setProgramasClientes}
                controlesCentrais={controlesCentrais}
                requisitosClientes={requisitosClientes}
                setRequisitosClientes={setRequisitosClientes}
                avaliacoesRequisitos={avaliacoesRequisitos}
                handleSaveAvaliacaoCliente={handleSaveAvaliacaoCliente}
                handleCriarRNCDeRequisito={handleCriarRNCDeRequisito}
                ferramentasCalibradas={ferramentasCalibradas}
                setFerramentasCalibradas={setFerramentasCalibradas}
                smartImports={smartImports}
                templatesAprovados={templatesAprovados}
                setTemplatesAprovados={setTemplatesAprovados}
              />
            )}
          </main>

          {/* Global Modals Container */}
          <AppModals
            isChecklistModalOpen={isChecklistModalOpen}
            setIsChecklistModalOpen={setIsChecklistModalOpen}
            activeOrganization={activeOrganization}
            setActiveOrganization={setActiveOrganization}
            setActiveTab={setActiveTab}
            isAuditModalOpen={isAuditModalOpen}
            setIsAuditModalOpen={setIsAuditModalOpen}
            auditTargetNC={auditTargetNC}
            setAuditTargetNC={setAuditTargetNC}
            manuals={manuals}
            onApplyAuditSuggestions={handleApplyAuditSuggestions}
            isTechnicalAuditModalOpen={isTechnicalAuditModalOpen}
            setIsTechnicalAuditModalOpen={setIsTechnicalAuditModalOpen}
            records={records}
            comparacoes={comparacoes}
            knowledgeList={knowledgeList}
            userProfile={userProfile}
            isAuthModalOpen={isAuthModalOpen}
            setIsAuthModalOpen={setIsAuthModalOpen}
            isDiagnosticsModalOpen={isDiagnosticsModalOpen}
            setIsDiagnosticsModalOpen={setIsDiagnosticsModalOpen}
            isMigrationModalOpen={isMigrationModalOpen}
            setIsMigrationModalOpen={setIsMigrationModalOpen}
            activeOrgId={activeOrgId}
          />

          {/* Mobile Bottom Navigation Bar (< lg) */}
          <MobileBottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            recordsCount={records.length}
            alertas={alertas}
            onNewNC={handleNewNC}
            onClearReportFilter={() => setReportFilterStatus(undefined)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-3.5 px-4 sm:px-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>
                <strong className="text-slate-700">QUALIGEST SGQ</strong> — Sistema de Garantia da Qualidade, Auditorias Regulatórias & Não Conformidades
              </span>
              <span className="text-[11px] text-slate-400">
                Padrão Aeronáutico F 001-29 | Cloud Firestore Multi-Tenant | Sincronização em Tempo Real
              </span>
            </div>
          </footer>
        </div>
      </div>
    </AppAuthGuards>
  );
}
