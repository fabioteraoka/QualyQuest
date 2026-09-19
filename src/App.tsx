import React, { useState, useEffect, useMemo } from 'react';
import { 
  NCRecord, 
  ManualRecord, 
  ComparacaoRNCRecord, 
  ValidatedKnowledgeRecord, 
  ConhecimentoValidadoItem,
  OrganizationRecord,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria,
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  DocumentoEvidenciaPessoa,
  AtividadeCompetenciaRequerida,
  SugestaoIACompetencia,
  DocumentoControlado,
  RevisaoDocumental,
  FonteExternaControlada,
  SolicitacaoRevisaoCliente,
  LogVerificacaoFonteExterna,
  RegistroEvidenciaConsultaDocumento,
} from './types';
import {
  subscribeToNonConformities,
  subscribeToManuals,
  subscribeToRNCComparisons,
  subscribeToValidatedKnowledge,
  subscribeToOrganization,
  ensureOrganization,
  saveNonConformity,
  deleteNonConformity,
  deleteMultipleNonConformities,
  saveManual,
  deleteManual,
  bootstrapDemonstrationData,
  DEFAULT_ORGANIZATION_ID,
  subscribeToExternalAudits,
  subscribeToAuditFindings,
  subscribeToAuditLessons,
  saveExternalAudit,
  deleteExternalAudit,
  saveAuditFinding,
  deleteAuditFinding,
  criarRNCFromFinding,
  saveAuditLesson,
  deleteAuditLesson,
  promoverLicaoParaConhecimento,
  checkAndMigrateLegacyHyphenData,
} from './services/firebase/firestore';
import { saveManualToDB } from './utils/manualsStorage';
import { useAuth } from './hooks/useAuth';
import { gerarAlertas } from './utils/qualityHelpers';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { DashboardView } from './components/DashboardView';
import { SGQHealthView } from './components/SGQHealthView';
import { ReportListView } from './components/ReportListView';
import { DocumentExtractorView } from './components/DocumentExtractorView';
import { NCFormView } from './components/NCFormView';
import { IncidenceAnalyticsView } from './components/IncidenceAnalyticsView';
import { AlertsCenterView } from './components/AlertsCenterView';
import { OfficialReportView } from './components/OfficialReportView';
import { ManualsRepositoryView } from './components/ManualsRepositoryView';
import { RNCComparisonView } from './components/RNCComparisonView';
import { ValidationQueueView } from './components/ValidationQueueView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { QualityPresentationGeneratorView } from './components/QualityPresentationGeneratorView';
import { SystemArchitectureView } from './components/SystemArchitectureView';
import { InteractiveTourView } from './components/InteractiveTourView';
import { OrganizationSettingsView } from './components/OrganizationSettingsView';
import { NewOrganizationOnboardingView } from './components/NewOrganizationOnboardingView';
import { WelcomeAdminBanner } from './components/WelcomeAdminBanner';
import { InitialSetupChecklistModal } from './components/InitialSetupChecklistModal';
import { ComplianceAuditModal } from './components/ComplianceAuditModal';
import { TechnicalAuditModal } from './components/TechnicalAuditModal';
import { AuthModal } from './components/AuthModal';
import { FirebaseDiagnosticModal } from './components/FirebaseDiagnosticModal';
import { LocalDataMigrationModal } from './components/LocalDataMigrationModal';
import { detectLocalMaterial } from './services/localDataMigration';
import { NoTenantAssignedView } from './components/NoTenantAssignedView';
import { UserDeactivatedView } from './components/UserDeactivatedView';
import { CentralAdministrationView } from './components/CentralAdministrationView';
import { UserPendingOrganizationView } from './components/UserPendingOrganizationView';
import { UserBlockedOrInactiveView } from './components/UserBlockedOrInactiveView';
import { UserManualView } from './components/UserManualView';
import { AuditsManagementView } from './components/AuditsManagementView';
import { AuditFindingsView } from './components/AuditFindingsView';
import { AuditLessonsLearnedView } from './components/AuditLessonsLearnedView';
import { AuditsDashboardView } from './components/AuditsDashboardView';
import { PersonsCompetenciesView } from './components/PersonsCompetenciesView';
import { TrainingsQualificationsView } from './components/TrainingsQualificationsView';
import { ExpirationsGapsCenterView } from './components/ExpirationsGapsCenterView';
import { CompetenciesDashboardView } from './components/CompetenciesDashboardView';
import {
  subscribeToPersons,
  subscribeToCompetencies,
  subscribeToPersonCompetencies,
  subscribeToTrainingCourses,
  subscribeToTrainingRecords,
  subscribeToQualifications,
  subscribeToPersonDocuments,
  subscribeToActivityRequirements,
  subscribeToAiCompetencySuggestions,
} from './services/firebase/competenciesFirestore';
import { DocumentControlCenterView } from './components/DocumentControlCenterView';
import { VisionAndRoadmapView } from './components/VisionAndRoadmapView';
import {
  subscribeToDocumentosControlados,
  subscribeToRevisoesDocumentais,
  subscribeToFontesExternas,
  subscribeToSolicitacoesCliente,
  subscribeToLogsVerificacao,
  subscribeToEvidenciasConsulta,
} from './services/firebase/documentControlFirestore';
import { ClientAuditsManagementView } from './components/ClientAuditsManagementView';
import {
  subscribeToClientesExternos,
  subscribeToBasesOperacionais,
  subscribeToProgramasClientes,
  subscribeToControlesCentrais,
  subscribeToRequisitosClientes,
  subscribeToAvaliacoesRequisitos,
  saveAvaliacaoRequisito,
} from './services/firebase/clientRequirementsFirestore';
import {
  ClienteExterno,
  BaseEstacaoOperacao,
  ProgramaChecklistCliente,
  ControleCentralSGQ,
  RequisitoClienteItem,
  AvaliacaoRequisitoCliente,
  FerramentaCalibracao,
  RegistroImportacaoCompleto,
  TemplateMapeamentoAprovado,
} from './types';
import { SmartImportMigrationView } from './components/SmartImportMigrationView';
import { SmartAuditView } from './components/SmartAuditView';
import { SystemDesignerOfficialView } from './components/SystemDesignerOfficialView';
import {
  subscribeToCalibratedTools,
  subscribeToSmartImportRecords,
  subscribeToImportTemplates,
} from './services/firebase/smartImportFirestore';
import { RefreshCw, Sparkles, UploadCloud, Database, ShieldAlert, LayoutDashboard, FileText, Bell, Plus, Menu, Building2 } from 'lucide-react';

export default function App() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  // Quando autenticado, utiliza o tenant vinculado do perfil ou o tenant padrão operacional.
  // Em modo demo local não autenticado, utiliza DEFAULT_ORGANIZATION_ID.
  const activeOrgId = (user && userProfile?.organizationId) ? userProfile.organizationId : DEFAULT_ORGANIZATION_ID;

  // Real-time Firestore state
  const [records, setRecords] = useState<NCRecord[]>([]);
  const [manuals, setManuals] = useState<ManualRecord[]>([]);
  const [comparacoes, setComparacoes] = useState<ComparacaoRNCRecord[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<ValidatedKnowledgeRecord[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<OrganizationRecord | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingManuals, setLoadingManuals] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'visao-evolucao'
    | 'conhecaQualigest'
    | 'saudeSGQ'
    | 'apresentacao'
    | 'arquitetura'
    | 'relatorio'
    | 'extrator'
    | 'formulario'
    | 'incidencias'
    | 'alertas'
    | 'oficial'
    | 'manuais'
    | 'comparacaoRNC'
    | 'validacaoQueue'
    | 'knowledgeBase'
    | 'admin-central'
    | 'configuracoes-org'
    | 'onboarding-novo-cliente'
    | 'manual-utilizacao'
    | 'auditorias-gestao'
    | 'auditorias-constatacoes'
    | 'auditorias-licoes'
    | 'auditorias-dashboard'
    | 'pessoas-competencias'
    | 'treinamentos-qualificacoes'
    | 'central-vencimentos-gaps'
    | 'competencias-dashboard'
    | 'controle-documental'
    | 'consulta-temporal'
    | 'fontes-externas'
    | 'documentos-dashboard'
    | 'clientes-requisitos'
    | 'clientes-matriz'
    | 'clientes-cockpit'
    | 'smart-audit'
    | 'system-designer'
    | 'importacao-inteligente'
  >('dashboard');

  // FASE 8: State de Auditorias Externas
  const [externalAudits, setExternalAudits] = useState<AuditoriaExternaRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<ConstatacaoExternaRecord[]>([]);
  const [auditLessons, setAuditLessons] = useState<LicaoAprendidaAuditoria[]>([]);
  const [selectedAuditForFindings, setSelectedAuditForFindings] = useState<AuditoriaExternaRecord | null>(null);

  // FASE 9: State de Pessoas, Competências, Treinamentos e Qualificações
  const [persons, setPersons] = useState<ColaboradorPessoa[]>([]);
  const [competencies, setCompetencies] = useState<CompetenciaItem[]>([]);
  const [personCompetencies, setPersonCompetencies] = useState<CompetenciaColaborador[]>([]);
  const [trainingCourses, setTrainingCourses] = useState<CursoTreinamento[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<RegistroTreinamentoColaborador[]>([]);
  const [qualifications, setQualifications] = useState<QualificacaoColaborador[]>([]);
  const [personDocuments, setPersonDocuments] = useState<DocumentoEvidenciaPessoa[]>([]);
  const [activityRequirements, setActivityRequirements] = useState<AtividadeCompetenciaRequerida[]>([]);
  const [aiCompetencySuggestions, setAiCompetencySuggestions] = useState<SugestaoIACompetencia[]>([]);

  // FASE 10: State de Controle Documental, Revisões e Fontes Externas
  const [documentosControlados, setDocumentosControlados] = useState<DocumentoControlado[]>([]);
  const [revisoesDocumentais, setRevisoesDocumentais] = useState<RevisaoDocumental[]>([]);
  const [fontesExternas, setFontesExternas] = useState<FonteExternaControlada[]>([]);
  const [solicitacoesCliente, setSolicitacoesCliente] = useState<SolicitacaoRevisaoCliente[]>([]);
  const [logsVerificacaoFontes, setLogsVerificacaoFontes] = useState<LogVerificacaoFonteExterna[]>([]);
  const [evidenciasConsultaDoc, setEvidenciasConsultaDoc] = useState<RegistroEvidenciaConsultaDocumento[]>([]);

  // FASE 13: State de Auditorias, Requisitos e Controles de Clientes ("Um Controle, Vários Requisitos")
  const [clientesExternos, setClientesExternos] = useState<ClienteExterno[]>([]);
  const [basesOperacionais, setBasesOperacionais] = useState<BaseEstacaoOperacao[]>([]);
  const [programasClientes, setProgramasClientes] = useState<ProgramaChecklistCliente[]>([]);
  const [controlesCentrais, setControlesCentrais] = useState<ControleCentralSGQ[]>([]);
  const [requisitosClientes, setRequisitosClientes] = useState<RequisitoClienteItem[]>([]);
  const [avaliacoesRequisitos, setAvaliacoesRequisitos] = useState<AvaliacaoRequisitoCliente[]>([]);

  // FASE 14: State de Importação Inteligente, Metrologia e Modelos Homologados
  const [ferramentasCalibradas, setFerramentasCalibradas] = useState<FerramentaCalibracao[]>([]);
  const [smartImports, setSmartImports] = useState<RegistroImportacaoCompleto[]>([]);
  const [templatesAprovados, setTemplatesAprovados] = useState<TemplateMapeamentoAprovado[]>([]);

  // Multi-Tenant Setup Checklist Modal & Welcome Banner State
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isWelcomeDismissed, setIsWelcomeDismissed] = useState(false);

  // Currently selected NC for detail or edit or official sheet
  const [selectedNC, setSelectedNC] = useState<NCRecord | null>(null);
  const [formInitialTab, setFormInitialTab] = useState<'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia'>('dados');
  const [reportFilterStatus, setReportFilterStatus] = useState<string | undefined>(undefined);

  // AI Compliance Audit State
  const [auditTargetNC, setAuditTargetNC] = useState<NCRecord | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // FASE 5: Technical Audit Modal State
  const [isTechnicalAuditModalOpen, setIsTechnicalAuditModalOpen] = useState(false);

  // Firebase Auth & Diagnostic Modals State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);

  // Local Browser Data Migration Modal State & Auto-detection
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [detectedLocalCount, setDetectedLocalCount] = useState<number>(0);

  // Global search term for header
  const [headerSearchTerm, setHeaderSearchTerm] = useState('');

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Bootstrap Demo Data State
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  // ----------------------------------------------------
  // REAL-TIME FIRESTORE SUBSCRIPTIONS (SOURCE OF TRUTH)
  // ----------------------------------------------------
  useEffect(() => {
    // Immediate memory cleanup upon tenant transition to prevent cross-tenant data retention
    setRecords([]);
    setManuals([]);
    setComparacoes([]);
    setKnowledgeList([]);
    setExternalAudits([]);
    setAuditFindings([]);
    setAuditLessons([]);
    setSelectedNC(null);
    setSelectedAuditForFindings(null);
    setActiveOrganization(null);

    // Se o usuário autenticado não possui tenant vinculado, suspende sincronização
    if (!activeOrgId) {
      setLoadingRecords(false);
      setLoadingManuals(false);
      return;
    }

    setLoadingRecords(true);
    setLoadingManuals(true);
    setFirestoreError(null);

    // Auto-migração não-bloqueante de dados gravados anteriormente com hífen
    if (activeOrgId === DEFAULT_ORGANIZATION_ID) {
      checkAndMigrateLegacyHyphenData().catch((err) => {
        console.warn('Auto-migração de dados com hífen finalizada ou ignorada:', err);
      });
    }

    // 1. Subscribe to Non-Conformities in Firestore
    const unsubscribeNCs = subscribeToNonConformities(
      activeOrgId,
      (firestoreNCs) => {
        setRecords(firestoreNCs);
        setLoadingRecords(false);
        // Auto-select first NC if currently selected is null or deleted
        setSelectedNC((prev) => {
          if (!prev) return firestoreNCs[0] || null;
          const found = firestoreNCs.find((r) => r?.id === prev?.id);
          return found || firestoreNCs[0] || null;
        });
      },
      (err) => {
        console.error('Erro na sincronização de RNCs:', err);
        setFirestoreError(err.message || 'Falha ao sincronizar Não Conformidades.');
        setLoadingRecords(false);
      }
    );

    // 2. Subscribe to Manuals in Firestore
    const unsubscribeManuals = subscribeToManuals(
      activeOrgId,
      (firestoreManuals) => {
        setManuals(firestoreManuals);
        setLoadingManuals(false);
      },
      (err) => {
        console.error('Erro na sincronização de Manuais:', err);
        setLoadingManuals(false);
      }
    );

    // 3. Subscribe to RNC Comparisons
    const unsubscribeComparisons = subscribeToRNCComparisons(
      activeOrgId,
      (firestoreComparisons) => {
        setComparacoes(firestoreComparisons);
      },
      (err) => {
        console.warn('Sincronização de Comparações:', err?.message);
      }
    );

    // 4. Subscribe to Validated Knowledge
    const unsubscribeKnowledge = subscribeToValidatedKnowledge(
      activeOrgId,
      (firestoreKnowledge) => {
        setKnowledgeList(firestoreKnowledge);
      },
      (err) => {
        console.warn('Sincronização de Conhecimento:', err?.message);
      }
    );

    // 5. Subscribe to Active Organization Configuration & Visual Identity
    const unsubscribeOrg = subscribeToOrganization(
      activeOrgId,
      (org) => {
        if (org) {
          setActiveOrganization(org);
        } else if (activeOrgId === DEFAULT_ORGANIZATION_ID) {
          // If default demo organization document doesn't exist yet, bootstrap it
          ensureOrganization(activeOrgId).then((created) => {
            setActiveOrganization(created);
          }).catch((err) => {
            console.warn('Falha ao inicializar organização padrão:', err);
          });
        }
      },
      (err) => {
        console.warn('Sincronização em tempo real da organização:', err?.message);
      }
    );

    // 6. Subscribe to External Audits (Fase 8)
    const unsubscribeAudits = subscribeToExternalAudits(
      activeOrgId,
      (auditsList) => {
        setExternalAudits(auditsList);
      }
    );

    // 7. Subscribe to Audit Findings (Fase 8)
    const unsubscribeFindings = subscribeToAuditFindings(
      activeOrgId,
      (findingsList) => {
        setAuditFindings(findingsList);
      }
    );

    // 8. Subscribe to Audit Lessons Learned (Fase 8)
    const unsubscribeLessons = subscribeToAuditLessons(
      activeOrgId,
      (lessonsList) => {
        setAuditLessons(lessonsList);
      }
    );

    // 9. Subscribe to Phase 9: Pessoas, Competências, Treinamentos e Qualificações
    const unsubscribePersons = subscribeToPersons(activeOrgId, (list) => setPersons(list));
    const unsubscribeCompetencies = subscribeToCompetencies(activeOrgId, (list) => setCompetencies(list));
    const unsubscribePersonCompetencies = subscribeToPersonCompetencies(activeOrgId, (list) => setPersonCompetencies(list));
    const unsubscribeTrainingCourses = subscribeToTrainingCourses(activeOrgId, (list) => setTrainingCourses(list));
    const unsubscribeTrainingRecords = subscribeToTrainingRecords(activeOrgId, (list) => setTrainingRecords(list));
    const unsubscribeQualifications = subscribeToQualifications(activeOrgId, (list) => setQualifications(list));
    const unsubscribeDocuments = subscribeToPersonDocuments(activeOrgId, (list) => setPersonDocuments(list));
    const unsubscribeActivities = subscribeToActivityRequirements(activeOrgId, (list) => setActivityRequirements(list));
    const unsubscribeAiSuggestions = subscribeToAiCompetencySuggestions(activeOrgId, (list) => setAiCompetencySuggestions(list));

    // 10. Subscribe to Phase 10: Controle Documental, Revisões, Fontes Externas e RAG
    const unsubscribeDocumentos = subscribeToDocumentosControlados(activeOrgId, (list) => setDocumentosControlados(list));
    const unsubscribeRevisoes = subscribeToRevisoesDocumentais(activeOrgId, (list) => setRevisoesDocumentais(list));
    const unsubscribeFontes = subscribeToFontesExternas(activeOrgId, (list) => setFontesExternas(list));
    const unsubscribeSolicitacoes = subscribeToSolicitacoesCliente(activeOrgId, (list) => setSolicitacoesCliente(list));
    const unsubscribeLogsFontes = subscribeToLogsVerificacao(activeOrgId, (list) => setLogsVerificacaoFontes(list));
    const unsubscribeEvidencias = subscribeToEvidenciasConsulta(activeOrgId, (list) => setEvidenciasConsultaDoc(list));

    // 11. Subscribe to Phase 13: Auditorias, Requisitos e Controles de Clientes
    const unsubscribeClientes = subscribeToClientesExternos(activeOrgId, (list) => setClientesExternos(list));
    const unsubscribeBases = subscribeToBasesOperacionais(activeOrgId, (list) => setBasesOperacionais(list));
    const unsubscribeProgramas = subscribeToProgramasClientes(activeOrgId, (list) => setProgramasClientes(list));
    const unsubscribeControles = subscribeToControlesCentrais(activeOrgId, (list) => setControlesCentrais(list));
    const unsubscribeRequisitos = subscribeToRequisitosClientes(activeOrgId, (list) => setRequisitosClientes(list));
    const unsubscribeAvaliacoes = subscribeToAvaliacoesRequisitos(activeOrgId, (list) => setAvaliacoesRequisitos(list));

    // 12. Subscribe to Phase 14: Importação Inteligente, Metrologia e Modelos Homologados
    const unsubscribeTools = subscribeToCalibratedTools(activeOrgId, (list) => setFerramentasCalibradas(list));
    const unsubscribeImports = subscribeToSmartImportRecords(activeOrgId, (list) => setSmartImports(list));
    const unsubscribeTemplates = subscribeToImportTemplates(activeOrgId, (list) => setTemplatesAprovados(list));

    return () => {
      unsubscribeNCs();
      unsubscribeManuals();
      unsubscribeComparisons();
      unsubscribeKnowledge();
      unsubscribeOrg();
      unsubscribeAudits();
      unsubscribeFindings();
      unsubscribeLessons();
      unsubscribePersons();
      unsubscribeCompetencies();
      unsubscribePersonCompetencies();
      unsubscribeTrainingCourses();
      unsubscribeTrainingRecords();
      unsubscribeQualifications();
      unsubscribeDocuments();
      unsubscribeActivities();
      unsubscribeAiSuggestions();
      unsubscribeDocumentos();
      unsubscribeRevisoes();
      unsubscribeFontes();
      unsubscribeSolicitacoes();
      unsubscribeLogsFontes();
      unsubscribeEvidencias();
      unsubscribeClientes();
      unsubscribeBases();
      unsubscribeProgramas();
      unsubscribeControles();
      unsubscribeRequisitos();
      unsubscribeAvaliacoes();
      unsubscribeTools();
      unsubscribeImports();
      unsubscribeTemplates();
    };
  }, [activeOrgId, user?.uid]);

  // Scan for local material (IndexedDB / LocalStorage) to assist user in recovering data
  useEffect(() => {
    detectLocalMaterial(records, manuals)
      .then((summary) => {
        setDetectedLocalCount(summary.totalLocalItems);
      })
      .catch((err) => {
        console.warn('Detecção de dados locais:', err);
      });
  }, [records.length, manuals.length]);

  // Real-time automatic alerts calculation with tenant SLAs
  const alertas = useMemo(() => {
    return gerarAlertas(records, activeOrganization?.configuration?.slasInternos);
  }, [records, activeOrganization?.configuration?.slasInternos]);

  // Handle Save / Update NC in Firestore
  const handleSaveNC = async (savedNC: NCRecord) => {
    try {
      await saveNonConformity(activeOrgId, savedNC, userProfile);
      setSelectedNC(savedNC);
      setActiveTab('oficial');
    } catch (e: any) {
      console.error('Erro ao salvar RNC no Firestore:', e);
      alert(`Falha ao salvar RNC: ${e?.message || e}`);
    }
  };

  // Handle Delete Single NC from Firestore
  const handleDeleteNC = async (id: string) => {
    try {
      await deleteNonConformity(activeOrgId, id, userProfile);
      if (selectedNC?.id === id) {
        setSelectedNC(null);
      }
    } catch (e: any) {
      console.error('Erro ao excluir RNC do Firestore:', e);
      alert(`Falha ao excluir RNC: ${e?.message || e}`);
    }
  };

  // Handle Delete Multiple NCs from Firestore
  const handleDeleteMultipleNC = async (ids: string[]) => {
    try {
      await deleteMultipleNonConformities(activeOrgId, ids, userProfile);
      if (selectedNC && ids.includes(selectedNC.id)) {
        setSelectedNC(null);
      }
    } catch (e: any) {
      console.error('Erro ao excluir múltiplas RNCs do Firestore:', e);
      alert(`Falha ao excluir RNCs: ${e?.message || e}`);
    }
  };

  // Handle Manual Save / Update in Firestore
  const handleSaveManual = async (manual: ManualRecord) => {
    try {
      await saveManualToDB(manual);
      await saveManual(activeOrgId, manual, userProfile);
    } catch (e: any) {
      console.error('Erro ao salvar manual no Firestore:', e);
      alert(`Falha ao salvar manual: ${e?.message || e}`);
    }
  };

  // Handle Delete Manual from Firestore
  const handleDeleteManual = async (id: string) => {
    try {
      await deleteManual(activeOrgId, id, userProfile);
    } catch (e: any) {
      console.error('Erro ao excluir manual do Firestore:', e);
      alert(`Falha ao excluir manual: ${e?.message || e}`);
    }
  };

  // Trigger AI Compliance Audit for an NC
  const handleAuditNC = (nc: NCRecord) => {
    setAuditTargetNC(nc);
    setIsAuditModalOpen(true);
  };

  // Apply suggestions from AI Compliance Audit to the NC
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

  // Handle Deadline Extension from Alerts Center
  const handleUpdateDeadline = async (ncId: string, novaData: string, motivo: string) => {
    const target = records.find((r) => r.id === ncId);
    if (!target) return;

    const novoHistorico = [
      ...(target.historicoPrazos || []),
      {
        id: `prazo_${Date.now()}`,
        dataAnterior: target.prazoResposta,
        novaData,
        motivo,
        alteradoEm: new Date().toISOString(),
        usuario: userProfile?.displayName || user?.email || 'Gestão da Qualidade',
      },
    ];

    const updatedNC: NCRecord = {
      ...target,
      prazoResposta: novaData,
      historicoPrazos: novoHistorico,
      atualizadoEm: new Date().toISOString(),
    };

    try {
      await saveNonConformity(activeOrgId, updatedNC, userProfile);
    } catch (e) {
      console.error('Erro ao prorrogar prazo no Firestore:', e);
    }
  };

  // Explicit Bootstrap Demo Data Action
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

  // Open Official View
  const handleViewOfficial = (nc: NCRecord) => {
    setSelectedNC(nc);
    setActiveTab('oficial');
  };

  // Open Edit View
  const handleEditNC = (nc: NCRecord, initialTab: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia' = 'dados') => {
    setSelectedNC(nc);
    setFormInitialTab(initialTab);
    setActiveTab('formulario');
  };

  // Open New NC View
  const handleNewNC = () => {
    setSelectedNC(null);
    setFormInitialTab('dados');
    setActiveTab('formulario');
  };

  // Open Report Tab with preset status filter
  const handleOpenReportWithFilter = (statusFilter?: string) => {
    setReportFilterStatus(statusFilter);
    setActiveTab('relatorio');
  };

  // FASE 8 Handlers: Gestão de Auditorias Externas
  const handleSaveAudit = async (audit: AuditoriaExternaRecord) => {
    try {
      await saveExternalAudit(activeOrgId, audit, userProfile);
    } catch (e: any) {
      console.error('Erro ao salvar auditoria externa:', e);
      alert(`Falha ao salvar auditoria: ${e?.message || e}`);
    }
  };

  const handleDeleteAudit = async (auditId: string) => {
    try {
      await deleteExternalAudit(activeOrgId, auditId, userProfile);
    } catch (e: any) {
      console.error('Erro ao excluir auditoria externa:', e);
      alert(`Falha ao excluir auditoria: ${e?.message || e}`);
    }
  };

  const handleSaveFinding = async (finding: ConstatacaoExternaRecord) => {
    try {
      await saveAuditFinding(activeOrgId, finding, userProfile);
    } catch (e: any) {
      console.error('Erro ao salvar constatação:', e);
      alert(`Falha ao salvar constatação: ${e?.message || e}`);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    try {
      await deleteAuditFinding(activeOrgId, findingId, userProfile);
    } catch (e: any) {
      console.error('Erro ao excluir constatação:', e);
      alert(`Falha ao excluir constatação: ${e?.message || e}`);
    }
  };

  const handleSaveLesson = async (lesson: LicaoAprendidaAuditoria) => {
    try {
      await saveAuditLesson(activeOrgId, lesson, userProfile);
    } catch (e: any) {
      console.error('Erro ao salvar lição aprendida:', e);
      alert(`Falha ao salvar lição: ${e?.message || e}`);
    }
  };

  const handleCriarRNCFromFinding = async (finding: ConstatacaoExternaRecord, audit?: AuditoriaExternaRecord) => {
    return await criarRNCFromFinding(activeOrgId, finding, audit, userProfile);
  };

  const handleCandidatarKnowledge = async (lesson: LicaoAprendidaAuditoria) => {
    try {
      await promoverLicaoParaConhecimento(activeOrgId, lesson, userProfile);
      alert('Lição submetida com sucesso como candidata à Base de Conhecimento SGQ (status: EM_ANALISE_SGQ).');
    } catch (e: any) {
      console.error('Erro ao promover lição aprendida:', e);
      alert(`Falha ao submeter lição: ${e?.message || e}`);
    }
  };

  // FASE 13 Handlers: Auditorias, Requisitos e Controles de Clientes
  const handleSaveAvaliacaoCliente = async (avaliacao: Partial<AvaliacaoRequisitoCliente>) => {
    await saveAvaliacaoRequisito(activeOrgId, avaliacao, userProfile);
  };

  const handleCriarRNCDeRequisito = (rncPayload: Partial<NCRecord>) => {
    setSelectedNC(rncPayload as NCRecord);
    setFormInitialTab('dados');
    setActiveTab('formulario');
  };

  const getTitleForTab = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Executivo';
      case 'visao-evolucao': return 'Visão Mestre, Arquitetura & Roadmap Estratégico (FASE 12)';
      case 'saudeSGQ': return 'Saúde & Integridade do SGQ';
      case 'relatorio': return 'Registros de Não Conformidade (RNC)';
      case 'manuais': return 'Biblioteca de Manuais & Normas SGQ';
      case 'extrator': return 'Assistente Extrator de NCs com IA';
      case 'formulario': return selectedNC ? `Edição de RNC #${selectedNC.numeroNC}` : 'Novo Cadastro de RNC';
      case 'incidencias': return 'Análise de Incidências & Diagrama de Pareto';
      case 'alertas': return 'Central de Prazos & Notificações';
      case 'oficial': return 'Ficha Oficial F 001-29';
      case 'comparacaoRNC': return 'Comparação & Validação de RNCs Respondidas';
      case 'validacaoQueue': return 'Fila de Validação de RNCs';
      case 'knowledgeBase': return 'Base de Conhecimento Validada SGQ';
      case 'conhecaQualigest': return 'Conheça o QualiGest SGQ (Tour & Homologação)';
      case 'apresentacao': return 'Apresentação Gerencial da Qualidade';
      case 'arquitetura': return 'Arquitetura do Sistema SGQ';
      case 'admin-central': return 'Gestão Central de Organizações, Usuários & Permissões (FASE 11)';
      case 'configuracoes-org': return 'Configurações da Organização & Identidade';
      case 'onboarding-novo-cliente': return 'Onboarding & Implantação de Nova Organização';
      case 'manual-utilizacao': return 'Manual de Utilização & Governança da Qualidade';
      case 'auditorias-gestao': return 'Gestão de Auditorias Externas';
      case 'auditorias-constatacoes': return 'Constatações de Auditorias (Findings) & Respostas Oficiais';
      case 'auditorias-licoes': return 'Lições Aprendidas de Auditorias Externas';
      case 'auditorias-dashboard': return 'Dashboard Analítico de Auditorias';
      case 'pessoas-competencias': return 'Matriz de Competências & Pessoas';
      case 'treinamentos-qualificacoes': return 'Treinamentos, CHTs & Qualificações';
      case 'central-vencimentos-gaps': return 'Central de Vencimentos & Gaps Críticos';
      case 'competencias-dashboard': return 'Dashboard de Competências & Compliance';
      case 'controle-documental': return 'Controle Documental & Acervo Técnico';
      case 'consulta-temporal': return 'Conhecimento Temporal & RAG Auditável';
      case 'fontes-externas': return 'Fontes Oficiais Externas & Verificação';
      case 'documentos-dashboard': return 'Dashboard Executivo de Controle Documental';
      case 'clientes-requisitos': return 'Auditorias & Requisitos de Clientes (FASE 13)';
      case 'clientes-matriz': return 'Matriz de Cobertura SGQ — Um Controle, Vários Requisitos';
      case 'clientes-cockpit': return 'Cockpit & Estações de Clientes';
      case 'smart-audit': return 'Auditoria Inteligente por Requisitos & Resolução por Exceção (FASE 15)';
      case 'system-designer': return 'System Designer Oficial do QualiGest (Arquitetura, Coleções & ADRs)';
      default: return 'Sistema de Qualidade';
    }
  };

  // Estado 1: Carregamento inicial de autenticação e perfil
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

  // Estado 2: Usuário inativo ou bloqueado
  if (user && (userProfile?.status === 'INACTIVE' || userProfile?.status === 'INATIVO' || userProfile?.status === 'BLOQUEADO')) {
    return <UserBlockedOrInactiveView />;
  }

  // Estado 3: Usuário pendente de vínculo com organização
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
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
        onInvitationAccepted={() => {
          setActiveTab('dashboard');
        }}
        onOpenOnboarding={() => {
          setActiveTab('onboarding-novo-cliente');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Enterprise Sidebar (Desktop Persistent & Mobile Slide-Out Drawer) */}
      <Sidebar
        activeTab={activeTab}
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
        {/* Global Header */}
        <Header
          alertas={alertas}
          activeOrganization={activeOrganization}
          onOpenChecklist={() => setIsChecklistModalOpen(true)}
          onOpenOnboarding={() => setActiveTab('onboarding-novo-cliente')}
          onOpenManual={() => setActiveTab('manual-utilizacao')}
          onOpenAlerts={() => setActiveTab('alertas')}
          searchTerm={headerSearchTerm}
          onSearchChange={setHeaderSearchTerm}
          currentViewTitle={getTitleForTab(activeTab)}
          onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Global Alerts Banner for critical / expired deadlines */}
        <AlertBanner
          alertas={alertas}
          onOpenAlertsTab={() => setActiveTab('alertas')}
        />

        {/* Welcome & Multi-Tenant Activation Banner */}
        {!isWelcomeDismissed && activeOrganization && (activeTab === 'dashboard' || activeTab === 'configuracoes-org') && (
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-4">
            <WelcomeAdminBanner
              organization={activeOrganization}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
              onOpenChecklist={() => setIsChecklistModalOpen(true)}
              onDismiss={() => setIsWelcomeDismissed(true)}
            />
          </div>
        )}

        {/* Cloud Firestore Multi-User Connectivity Banner when database is empty */}
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
                  onClick={() => setIsMigrationModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                  title="Recuperar dados e manuais salvos anteriormente no seu navegador para o Cloud Firestore"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-amber-200" />
                  <span>Recuperar Dados do Navegador{detectedLocalCount > 0 ? ` (${detectedLocalCount})` : ''}</span>
                </button>
                <button
                  onClick={handleBootstrapDemo}
                  disabled={isBootstrapping}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                  <span>{isBootstrapping ? 'Gravando no Firestore...' : 'Carregar Amostra'}</span>
                </button>
                <button
                  onClick={handleNewNC}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-[6px] transition-colors cursor-pointer border border-slate-700 text-xs"
                >
                  + Criar RNC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content View with responsive padding and mobile bottom clearance */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {loadingRecords && records.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium text-slate-700">Sincronizando registros com o Cloud Firestore...</p>
              <p className="text-xs text-slate-400">Garantindo única fonte de verdade multiusuário em tempo real</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  records={records}
                  manualsCount={manuals.length}
                  alertas={alertas}
                  onSelectNC={handleViewOfficial}
                  onViewOfficial={handleViewOfficial}
                  onNewNC={handleNewNC}
                  onOpenExtractor={() => setActiveTab('extrator')}
                  onOpenReportTab={handleOpenReportWithFilter}
                  onOpenAlertsTab={() => setActiveTab('alertas')}
                  onOpenManualsTab={() => setActiveTab('manuais')}
                  onOpenPresentationTab={() => setActiveTab('apresentacao')}
                  onOpenArchitectureTab={() => setActiveTab('arquitetura')}
                  onOpenTourTab={() => setActiveTab('conhecaQualigest')}
                  onAuditNC={handleAuditNC}
                />
              )}

              {/* FASE 12.1: REDIRECIONAMENTO INTEGRADO DE VISÃO E EVOLUÇÃO PARA A APRESENTAÇÃO GERENCIAL (BLOCO 7) */}
              {activeTab === 'visao-evolucao' && (
                <QualityPresentationGeneratorView
                  records={records}
                  manuals={manuals}
                  knowledgeList={knowledgeList}
                  comparacoes={comparacoes}
                  organization={activeOrganization}
                  organizacaoNome={
                    activeOrganization?.name ||
                    (userProfile?.organizationId === 'org_impacto_aviation'
                      ? 'Impacto Aviation MRO'
                      : 'Organização SGQ')
                  }
                  usuarioResponsavel={userProfile?.displayName || user?.email || 'Gestão da Qualidade'}
                  externalAudits={externalAudits}
                  auditFindings={auditFindings}
                  auditLessons={auditLessons}
                  persons={persons}
                  competencies={competencies}
                  personCompetencies={personCompetencies}
                  qualifications={qualifications}
                  trainingRecords={trainingRecords}
                  trainingCourses={trainingCourses}
                  personDocuments={personDocuments}
                  documentosControlados={documentosControlados}
                  alertas={alertas}
                  initialSlideId={15}
                  onNavigateToArchitecture={() => setActiveTab('arquitetura')}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* FASE 6.2: TOUR INTERATIVO & HOMOLOGAÇÃO "CONHEÇA O QUALIGEST" */}
              {activeTab === 'conhecaQualigest' && (
                <InteractiveTourView
                  records={records}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  onOpenAuditModal={() => setIsTechnicalAuditModalOpen(true)}
                />
              )}

              {/* FASE 5: TAB SAÚDE DO SGQ & ÍNDICE DE INTEGRIDADE */}
              {activeTab === 'saudeSGQ' && (
                <SGQHealthView
                  records={records}
                  manuals={manuals}
                  comparacoes={comparacoes}
                  knowledgeList={knowledgeList}
                  knowledge={knowledgeList}
                  onNavigateTab={(tab) => setActiveTab(tab as any)}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  onOpenAuditModal={() => setIsTechnicalAuditModalOpen(true)}
                  onSelectNC={(nc, tab) => handleEditNC(nc, tab)}
                  onSelectRecord={(nc, tab) => handleEditNC(nc, tab)}
                />
              )}

              {/* TAB: APRESENTAÇÃO GERENCIAL DA QUALIDADE & EVOLUÇÃO (FASE 12.1) */}
              {activeTab === 'apresentacao' && (
                <QualityPresentationGeneratorView
                  records={records}
                  manuals={manuals}
                  knowledgeList={knowledgeList}
                  comparacoes={comparacoes}
                  organization={activeOrganization}
                  organizacaoNome={
                    activeOrganization?.name ||
                    (userProfile?.organizationId === 'org_impacto_aviation'
                      ? 'Impacto Aviation MRO'
                      : 'Organização SGQ')
                  }
                  usuarioResponsavel={userProfile?.displayName || user?.email || 'Gestão da Qualidade'}
                  externalAudits={externalAudits}
                  auditFindings={auditFindings}
                  auditLessons={auditLessons}
                  persons={persons}
                  competencies={competencies}
                  personCompetencies={personCompetencies}
                  qualifications={qualifications}
                  trainingRecords={trainingRecords}
                  trainingCourses={trainingCourses}
                  personDocuments={personDocuments}
                  documentosControlados={documentosControlados}
                  alertas={alertas}
                  onNavigateToArchitecture={() => setActiveTab('arquitetura')}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* TAB: ARQUITETURA FUNCIONAL E TÉCNICA REAL (FASE 6.1) */}
              {activeTab === 'arquitetura' && (
                <SystemArchitectureView
                  onNavigateToPresentation={() => setActiveTab('apresentacao')}
                />
              )}

              {/* TAB 2: RELATÓRIO GERAL (TABELA / KANBAN) */}
              {activeTab === 'relatorio' && (
                <ReportListView
                  records={records}
                  onSelectNC={handleViewOfficial}
                  onEditNC={handleEditNC}
                  onViewOfficial={handleViewOfficial}
                  onNewNC={handleNewNC}
                  onDeleteNC={handleDeleteNC}
                  onDeleteMultipleNC={handleDeleteMultipleNC}
                  onAuditNC={handleAuditNC}
                  initialStatusFilter={reportFilterStatus}
                />
              )}

              {/* TAB 3: BANCO DE DADOS DE MANUAIS & REVISÕES VIGENTES */}
              {activeTab === 'manuais' && (
                <ManualsRepositoryView
                  manuals={manuals}
                  onSaveManual={handleSaveManual}
                  onDeleteManual={handleDeleteManual}
                  onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
                />
              )}

              {/* TAB 4: EXTRATOR DE DOCUMENTOS IA */}
              {activeTab === 'extrator' && (
                <DocumentExtractorView
                  onSaveExtracted={handleSaveNC}
                  onEditExtracted={(nc) => {
                    setSelectedNC(nc);
                    setFormInitialTab('dados');
                    setActiveTab('formulario');
                  }}
                  onCancel={() => setActiveTab('dashboard')}
                />
              )}

              {/* TAB 5: FORMULÁRIO DE CADASTRO E EDIÇÃO MANUAL (PASSO A PASSO) */}
              {activeTab === 'formulario' && (
                <NCFormView
                  initialData={selectedNC}
                  initialTab={formInitialTab}
                  manuals={manuals}
                  organization={activeOrganization}
                  onSave={handleSaveNC}
                  onCancel={() => setActiveTab(selectedNC ? 'oficial' : 'relatorio')}
                  onDelete={handleDeleteNC}
                  onAuditNC={handleAuditNC}
                />
              )}

              {/* TAB 6: MONITORAMENTO DE INCIDÊNCIAS (PARETO) */}
              {activeTab === 'incidencias' && (
                <IncidenceAnalyticsView
                  records={records}
                />
              )}

              {/* TAB 7: CENTRAL DE ALERTAS & PRAZOS */}
              {activeTab === 'alertas' && (
                <AlertsCenterView
                  records={records}
                  alertas={alertas}
                  onSelectNC={handleViewOfficial}
                  onUpdateDeadline={handleUpdateDeadline}
                  onAuditNC={handleAuditNC}
                />
              )}

              {/* TAB 8: FICHA OFICIAL F 001-29 / IMPRESSÃO */}
              {activeTab === 'oficial' && (
                <OfficialReportView
                  nc={selectedNC || records[0]}
                  record={selectedNC || records[0]}
                  organization={activeOrganization}
                  onBack={() => setActiveTab('relatorio')}
                  onEdit={() => handleEditNC(selectedNC || records[0])}
                  onDelete={handleDeleteNC}
                  onAuditNC={handleAuditNC}
                />
              )}

              {/* TAB 9: COMPARAÇÃO & VALIDAÇÃO DE RNCs RESPONDIDAS (FASE 3) */}
              {activeTab === 'comparacaoRNC' && (
                <RNCComparisonView
                  organizationId={activeOrgId}
                  userProfile={userProfile}
                  records={records}
                  manuals={manuals}
                  onSelectRecord={handleViewOfficial}
                  onNavigateToTab={(tabId: any) => setActiveTab(tabId)}
                />
              )}

              {/* TAB 10: FILA DE VALIDAÇÃO DE RNCs RESPONDIDAS */}
              {activeTab === 'validacaoQueue' && (
                <ValidationQueueView
                  organizationId={activeOrgId}
                  userProfile={userProfile}
                  records={records}
                  onNavigateToComparison={() => setActiveTab('comparacaoRNC')}
                  onNavigateToRecord={handleViewOfficial}
                />
              )}

              {/* TAB 11: BASE DE CONHECIMENTO VALIDADA DO SGQ */}
              {activeTab === 'knowledgeBase' && (
                <KnowledgeBaseView
                  organizationId={activeOrgId}
                  userProfile={userProfile}
                  records={records}
                  onNavigateToComparison={() => setActiveTab('comparacaoRNC')}
                />
              )}

              {/* FASE 11: GESTÃO CENTRALIZADA DE ORGANIZAÇÕES, USUÁRIOS E PERMISSÕES */}
              {activeTab === 'admin-central' && (
                <CentralAdministrationView
                  organization={activeOrganization}
                  onOrganizationUpdated={(updated) => setActiveOrganization(updated)}
                />
              )}

              {/* TAB 12: CONFIGURAÇÕES DA ORGANIZAÇÃO (MULTI-TENANCY COMERCIAL) */}
              {activeTab === 'configuracoes-org' && (
                <OrganizationSettingsView
                  organization={activeOrganization}
                  onOrganizationUpdated={(updated) => setActiveOrganization(updated)}
                />
              )}

              {/* TAB 13: ONBOARDING DE NOVO CLIENTE / NOVA ORGANIZAÇÃO */}
              {activeTab === 'onboarding-novo-cliente' && (
                <NewOrganizationOnboardingView
                  onOrganizationCreated={(newOrg) => {
                    setActiveOrganization(newOrg);
                    setActiveTab('configuracoes-org');
                    setIsChecklistModalOpen(true);
                  }}
                  onCancel={() => setActiveTab('dashboard')}
                />
              )}

              {/* TAB 14: MANUAL DE UTILIZAÇÃO E GOVERNANÇA (FASE 7.2) */}
              {activeTab === 'manual-utilizacao' && (
                <UserManualView
                  organization={activeOrganization}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* FASE 8: GESTÃO DE AUDITORIAS EXTERNAS RECEBIDAS */}
              {activeTab === 'auditorias-gestao' && (
                <AuditsManagementView
                  audits={externalAudits}
                  findings={auditFindings}
                  userProfile={userProfile}
                  activeOrganization={activeOrganization}
                  onSelectAuditForFindings={(audit) => {
                    setSelectedAuditForFindings(audit);
                    setActiveTab('auditorias-constatacoes');
                  }}
                  onSaveAudit={handleSaveAudit}
                  onDeleteAudit={handleDeleteAudit}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* FASE 8: CONSTATAÇÕES DE AUDITORIAS (FINDINGS), RESPOSTAS E EVIDÊNCIAS */}
              {activeTab === 'auditorias-constatacoes' && (
                <AuditFindingsView
                  audits={externalAudits}
                  findings={auditFindings}
                  selectedAuditId={selectedAuditForFindings?.id}
                  rncRecords={records}
                  manuals={manuals}
                  validatedKnowledge={knowledgeList}
                  userProfile={userProfile}
                  onBackToAudits={() => setActiveTab('auditorias-gestao')}
                  onSaveFinding={handleSaveFinding}
                  onDeleteFinding={handleDeleteFinding}
                  onCriarRNCFromFinding={handleCriarRNCFromFinding}
                  onOpenLessonForm={(finding, audit) => {
                    setActiveTab('auditorias-licoes');
                  }}
                  onNavigateToNC={(ncId) => {
                    const nc = records.find((r) => r.id === ncId);
                    if (nc) {
                      setSelectedNC(nc);
                      setActiveTab('oficial');
                    }
                  }}
                />
              )}

              {/* FASE 8: LIÇÕES APRENDIDAS DE AUDITORIAS EXTERNAS */}
              {activeTab === 'auditorias-licoes' && (
                <AuditLessonsLearnedView
                  lessons={auditLessons}
                  audits={externalAudits}
                  findings={auditFindings}
                  userProfile={userProfile}
                  onSaveLesson={handleSaveLesson}
                  onCandidatarKnowledge={handleCandidatarKnowledge}
                  onNavigateToKnowledge={() => setActiveTab('knowledgeBase')}
                />
              )}

              {/* FASE 8: DASHBOARD ANALÍTICO DE AUDITORIAS */}
              {activeTab === 'auditorias-dashboard' && (
                <AuditsDashboardView
                  audits={externalAudits}
                  findings={auditFindings}
                  lessons={auditLessons}
                  onBackToAudits={() => setActiveTab('auditorias-gestao')}
                  onNavigateToFindings={() => setActiveTab('auditorias-constatacoes')}
                  onNavigateToLessons={() => setActiveTab('auditorias-licoes')}
                />
              )}

              {/* FASE 9: PESSOAS, COMPETÊNCIAS & MATRIZ TÉCNICA */}
              {activeTab === 'pessoas-competencias' && (
                <PersonsCompetenciesView
                  organizationId={activeOrgId}
                  userProfile={userProfile}
                  persons={persons}
                  competencies={competencies}
                  personCompetencies={personCompetencies}
                  qualifications={qualifications}
                  trainingRecords={trainingRecords}
                  documents={personDocuments}
                  activities={activityRequirements}
                  nonConformities={records}
                />
              )}

              {/* FASE 9: TREINAMENTOS, CHTs & QUALIFICAÇÕES */}
              {activeTab === 'treinamentos-qualificacoes' && (
                <TrainingsQualificationsView
                  organizationId={activeOrgId}
                  userProfile={userProfile}
                  persons={persons}
                  trainingCourses={trainingCourses}
                  trainingRecords={trainingRecords}
                  qualifications={qualifications}
                  documents={personDocuments}
                />
              )}

              {/* FASE 9: CENTRAL DE VENCIMENTOS & GAPS */}
              {activeTab === 'central-vencimentos-gaps' && (
                <ExpirationsGapsCenterView
                  organizationId={activeOrgId}
                  userProfile={userProfile}
                  persons={persons}
                  competencies={competencies}
                  personCompetencies={personCompetencies}
                  qualifications={qualifications}
                  trainingRecords={trainingRecords}
                  documents={personDocuments}
                  activities={activityRequirements}
                  aiSuggestions={aiCompetencySuggestions}
                />
              )}

              {/* FASE 9: DASHBOARD EXECUTIVO DE COMPETÊNCIAS */}
              {activeTab === 'competencias-dashboard' && (
                <CompetenciesDashboardView
                  organizationId={activeOrgId}
                  persons={persons}
                  competencies={competencies}
                  personCompetencies={personCompetencies}
                  qualifications={qualifications}
                  trainingRecords={trainingRecords}
                  documents={personDocuments}
                  activities={activityRequirements}
                  onNavigateToPersons={() => setActiveTab('pessoas-competencias')}
                  onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
                  onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
                />
              )}

              {/* FASE 10: CONTROLE DOCUMENTAL, REVISÕES & FONTES EXTERNAS */}
              {(activeTab === 'controle-documental' ||
                activeTab === 'consulta-temporal' ||
                activeTab === 'fontes-externas' ||
                activeTab === 'documentos-dashboard') && (
                <DocumentControlCenterView
                  organizationId={activeOrgId}
                  currentUser={userProfile}
                  activeOrganization={activeOrganization}
                  documentos={documentosControlados}
                  revisoes={revisoesDocumentais}
                  fontes={fontesExternas}
                  solicitacoes={solicitacoesCliente}
                  logsVerificacao={logsVerificacaoFontes}
                  evidenciasConsulta={evidenciasConsultaDoc}
                  nonConformities={records}
                  initialSubTab={
                    activeTab === 'consulta-temporal'
                      ? 'temporal'
                      : activeTab === 'fontes-externas'
                      ? 'fontes'
                      : activeTab === 'documentos-dashboard'
                      ? 'dashboard'
                      : 'acervo'
                  }
                  onOpenNCFormWithDoc={() => {
                    setActiveTab('formulario');
                  }}
                />
              )}

              {/* FASE 13: AUDITORIAS, REQUISITOS E CONTROLES DE CLIENTES */}
              {(activeTab === 'clientes-requisitos' ||
                activeTab === 'clientes-matriz' ||
                activeTab === 'clientes-cockpit') && (
                <ClientAuditsManagementView
                  clientes={clientesExternos}
                  bases={basesOperacionais}
                  programas={programasClientes}
                  controles={controlesCentrais}
                  requisitos={requisitosClientes}
                  avaliacoes={avaliacoesRequisitos}
                  activeOrganization={activeOrganization}
                  userProfile={userProfile}
                  initialTab={
                    activeTab === 'clientes-matriz'
                      ? 'matriz'
                      : activeTab === 'clientes-cockpit'
                      ? 'cockpit'
                      : 'requisitos'
                  }
                  onSaveAvaliacao={handleSaveAvaliacaoCliente}
                  onCriarRNCDeRequisito={handleCriarRNCDeRequisito}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* FASE 14: IMPORTAÇÃO INTELIGENTE E MIGRAÇÃO DE CONTROLES EXISTENTES */}
              {activeTab === 'importacao-inteligente' && (
                <SmartImportMigrationView
                  organization={activeOrganization}
                  user={userProfile}
                  pessoas={persons}
                  treinamentos={trainingCourses}
                  registrosTreinamento={trainingRecords}
                  documentos={documentosControlados}
                  ferramentasCalibradas={ferramentasCalibradas}
                  smartImports={smartImports}
                  templatesAprovados={templatesAprovados}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  onAdicionarPessoa={(p) => setPersons((prev) => [p, ...prev.filter((x) => x.id !== p.id)])}
                  onAdicionarCurso={(c) => setTrainingCourses((prev) => [c, ...prev.filter((x) => x.id !== c.id)])}
                  onAdicionarRegistroTreinamento={(r) => setTrainingRecords((prev) => [r, ...prev.filter((x) => x.id !== r.id)])}
                  onAdicionarFerramenta={(f) => setFerramentasCalibradas((prev) => [f, ...prev.filter((x) => x.id !== f.id)])}
                  onRemoverFerramenta={(toolId) => setFerramentasCalibradas((prev) => prev.filter((x) => x.id !== toolId))}
                  onRemoverRegistroTreinamento={(recordId) => setTrainingRecords((prev) => prev.filter((x) => x.id !== recordId))}
                  onRemoverPessoa={(personId) => setPersons((prev) => prev.filter((x) => x.id !== personId))}
                  onRemoverCurso={(courseId) => setTrainingCourses((prev) => prev.filter((x) => x.id !== courseId))}
                  onAdicionarQualificacao={(q) => setQualifications((prev) => [q, ...prev.filter((x) => x.id !== q.id)])}
                  onRemoverQualificacao={(qualId) => setQualifications((prev) => prev.filter((x) => x.id !== qualId))}
                  onCriarRncSugerida={(dadosRnc) => {
                    handleNewNC();
                  }}
                />
              )}

              {/* FASE 15: AUDITORIA INTELIGENTE POR REQUISITOS E RESOLUÇÃO POR EXCEÇÃO */}
              {activeTab === 'smart-audit' && (
                <SmartAuditView
                  clientes={clientesExternos}
                  bases={basesOperacionais}
                  programas={programasClientes}
                  controles={controlesCentrais}
                  requisitos={requisitosClientes}
                  avaliacoes={avaliacoesRequisitos}
                  ferramentas={ferramentasCalibradas}
                  treinamentos={trainingRecords}
                  documentos={documentosControlados}
                  pessoas={persons}
                  activeOrganization={activeOrganization}
                  userProfile={userProfile}
                  onSaveAvaliacao={handleSaveAvaliacaoCliente}
                  onCriarRNCDeRequisito={handleCriarRNCDeRequisito}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* FASE 15: SYSTEM DESIGNER DO QUALIGEST */}
              {activeTab === 'system-designer' && (
                <SystemDesignerOfficialView />
              )}
            </>
          )}
        </main>

        {/* Modal de Checklist de Implantação de Novo Cliente */}
        <InitialSetupChecklistModal
          isOpen={isChecklistModalOpen}
          onClose={() => setIsChecklistModalOpen(false)}
          organization={activeOrganization}
          onNavigateToTab={(tab) => {
            setIsChecklistModalOpen(false);
            setActiveTab(tab as any);
          }}
          onUpdateOrganization={(updated) => setActiveOrganization(updated)}
        />

        {/* Global AI Compliance Audit Modal */}
        <ComplianceAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => {
            setIsAuditModalOpen(false);
            setAuditTargetNC(null);
          }}
          nc={auditTargetNC}
          manuals={manuals}
          onApplySuggestions={handleApplyAuditSuggestions}
        />

        {/* FASE 5: Technical Audit Modal (Hardening, Security, Data Integrity, AI Fallback) */}
        <TechnicalAuditModal
          isOpen={isTechnicalAuditModalOpen}
          onClose={() => setIsTechnicalAuditModalOpen(false)}
          records={records}
          manuals={manuals}
          comparacoes={comparacoes}
          knowledgeList={knowledgeList}
          userProfile={userProfile}
        />

        {/* Firebase Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* Firebase & Firestore Diagnostic Modal */}
        <FirebaseDiagnosticModal
          isOpen={isDiagnosticsModalOpen}
          onClose={() => setIsDiagnosticsModalOpen(false)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenMigration={() => setIsMigrationModalOpen(true)}
          ncCount={records.length}
          manualsCount={manuals.length}
        />

        {/* Local Browser Data Migration Modal (IndexedDB to Cloud Firestore) */}
        <LocalDataMigrationModal
          isOpen={isMigrationModalOpen}
          onClose={() => setIsMigrationModalOpen(false)}
          activeOrgId={activeOrgId}
          userProfile={userProfile}
          currentRecords={records}
          currentManuals={manuals}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        {/* Mobile Bottom Navigation Bar (< lg) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 px-3 py-2 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setReportFilterStatus(undefined);
              setActiveTab('relatorio');
            }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'relatorio' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>RNCs ({records.length})</span>
          </button>

          {/* Center Prominent New NC Button */}
          <button
            onClick={handleNewNC}
            className="flex flex-col items-center justify-center -mt-5 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-lg border-2 border-slate-900 transition-transform active:scale-95 cursor-pointer"
            aria-label="Nova Não Conformidade"
            title="Criar Nova RNC"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('alertas')}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === 'alertas' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alertas</span>
            {alertas.filter((a) => a.tipoAlerta === 'VENCIDA' || a.tipoAlerta === 'VENCE_HOJE').length > 0 && (
              <span className="absolute -top-0.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
            )}
          </button>

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-[6px] text-[10px] font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </nav>

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
  );
}
