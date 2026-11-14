import React from 'react';
import {
  NCRecord,
  ManualRecord,
  ComparacaoRNCRecord,
  ValidatedKnowledgeRecord,
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
  ClienteExterno,
  BaseEstacaoOperacao,
  ProgramaChecklistCliente,
  ControleCentralSGQ,
  RequisitoClienteItem,
  AvaliacaoRequisitoCliente,
  FerramentaCalibracao,
  RegistroImportacaoCompleto,
  TemplateMapeamentoAprovado,
  PreparacaoRequisitoAuditoria,
} from '../../types';
import {
  RequisitoAuditoriaExterna,
  PreAuditoriaConsolidada,
} from '../../types/auditRequirements';
import { DashboardView } from '../DashboardView';
import { SGQHealthView } from '../SGQHealthView';
import { ReportListView } from '../ReportListView';
import { DocumentExtractorView } from '../DocumentExtractorView';
import { NCFormView } from '../NCFormView';
import { IncidenceAnalyticsView } from '../IncidenceAnalyticsView';
import { AlertsCenterView } from '../AlertsCenterView';
import { OfficialReportView } from '../OfficialReportView';
import { ManualsRepositoryView } from '../ManualsRepositoryView';
import { RNCComparisonView } from '../RNCComparisonView';
import { ValidationQueueView } from '../ValidationQueueView';
import { KnowledgeBaseView } from '../KnowledgeBaseView';
import { QualityPresentationGeneratorView } from '../QualityPresentationGeneratorView';
import { TechnicalDiagnosticsCenterView } from '../TechnicalDiagnosticsCenterView';
import { InteractiveTourView } from '../InteractiveTourView';
import { OrganizationSettingsView } from '../OrganizationSettingsView';
import { NewOrganizationOnboardingView } from '../NewOrganizationOnboardingView';
import { CentralAdministrationView } from '../CentralAdministrationView';
import { UserManualView } from '../UserManualView';
import { AuditsManagementView } from '../AuditsManagementView';
import { AuditFindingsView } from '../AuditFindingsView';
import { AuditLessonsLearnedView } from '../AuditLessonsLearnedView';
import { AuditsDashboardView } from '../AuditsDashboardView';
import { PersonsCompetenciesView } from '../PersonsCompetenciesView';
import { TrainingsQualificationsView } from '../TrainingsQualificationsView';
import { ExpirationsGapsCenterView } from '../ExpirationsGapsCenterView';
import { CompetenciesDashboardView } from '../CompetenciesDashboardView';
import { DocumentControlCenterView } from '../DocumentControlCenterView';
import { ClientAuditsManagementView } from '../ClientAuditsManagementView';
import { FerramentasMetrologiaView } from '../FerramentasMetrologiaView';
import { SmartImportMigrationView } from '../SmartImportMigrationView';
import { SmartAuditView } from '../SmartAuditView';
import { RequirementsLibraryView } from '../RequirementsLibraryView';
import { AuditChecklistsLibraryView } from '../checklists/AuditChecklistsLibraryView';
import { SystemDesignerOfficialView } from '../SystemDesignerOfficialView';
import { RoosterModule } from '../RoosterModule';
import { canUserAccessTab } from '../../config/navigationRegistry';
import { Lock, ArrowLeft } from 'lucide-react';

export interface AppViewRouterProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeOrgId: string;
  user: any;
  userProfile: any;
  activeOrganization: OrganizationRecord | null;
  setActiveOrganization: (org: OrganizationRecord | null) => void;

  records: NCRecord[];
  manuals: ManualRecord[];
  comparacoes: ComparacaoRNCRecord[];
  knowledgeList: ValidatedKnowledgeRecord[];
  alertas: any[];
  selectedNC: NCRecord | null;
  setSelectedNC: (nc: NCRecord | null) => void;
  formInitialTab: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia';
  reportFilterStatus?: string;
  initialPersonStatusFilter: string;
  setInitialPersonStatusFilter: (status: string) => void;

  // Handlers
  handleViewOfficial: (nc: NCRecord) => void;
  handleNewNC: () => void;
  handleEditNC: (nc: NCRecord, initialTab?: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia') => void;
  handleDeleteNC: (id: string) => Promise<void>;
  handleDeleteMultipleNC: (ids: string[]) => Promise<void>;
  handleAuditNC: (nc: NCRecord) => void;
  handleSaveNC: (nc: NCRecord) => Promise<void>;
  handleOpenReportWithFilter: (statusFilter?: string) => void;
  handleUpdateDeadline: (ncId: string, novaData: string, motivo: string, tipoPrazo?: 'TRATAMENTO' | 'EFICACIA') => Promise<void>;
  handleSaveManual: (manual: ManualRecord) => Promise<void>;
  handleDeleteManual: (id: string) => Promise<void>;
  setIsMigrationModalOpen: (open: boolean) => void;
  setIsTechnicalAuditModalOpen: (open: boolean) => void;
  setIsDiagnosticsModalOpen: (open: boolean) => void;
  setIsChecklistModalOpen: (open: boolean) => void;

  // Auditorias
  externalAudits: AuditoriaExternaRecord[];
  auditFindings: ConstatacaoExternaRecord[];
  auditLessons: LicaoAprendidaAuditoria[];
  auditRequirements: RequisitoAuditoriaExterna[];
  selectedAuditForFindings: AuditoriaExternaRecord | null;
  setSelectedAuditForFindings: (audit: AuditoriaExternaRecord | null) => void;
  handleSaveAudit: (audit: AuditoriaExternaRecord) => Promise<void>;
  handleDeleteAudit: (auditId: string, forceDelete?: boolean) => Promise<void>;
  handleCancelAudit: (auditId: string, motivo: string) => Promise<void>;
  handleRestoreAudit: (auditId: string) => Promise<void>;
  handleArchiveAudit: (auditId: string) => Promise<void>;
  handleSaveAuditRequirement: (req: RequisitoAuditoriaExterna) => Promise<void>;
  handleSaveBatchAuditRequirements: (reqs: RequisitoAuditoriaExterna[]) => Promise<void>;
  handleSaveFinding: (finding: ConstatacaoExternaRecord) => Promise<void>;
  handleDeleteFinding: (findingId: string) => Promise<void>;
  handleCriarRNCFromFinding: (finding: ConstatacaoExternaRecord, audit: AuditoriaExternaRecord) => Promise<void>;
  handleSaveLesson: (lesson: LicaoAprendidaAuditoria) => Promise<void>;
  handleCandidatarKnowledge: (licao: LicaoAprendidaAuditoria) => Promise<void>;
  preparacoesInstitucionais?: PreparacaoRequisitoAuditoria[];
  setPreparacoesInstitucionais?: React.Dispatch<React.SetStateAction<PreparacaoRequisitoAuditoria[]>>;
  preAudits?: PreAuditoriaConsolidada[];
  handleSavePreAudit?: (preAudit: PreAuditoriaConsolidada) => Promise<void>;

  // Pessoas & Competências
  persons: ColaboradorPessoa[];
  setPersons: React.Dispatch<React.SetStateAction<ColaboradorPessoa[]>>;
  competencies: CompetenciaItem[];
  personCompetencies: CompetenciaColaborador[];
  qualifications: QualificacaoColaborador[];
  setQualifications: React.Dispatch<React.SetStateAction<QualificacaoColaborador[]>>;
  trainingRecords: RegistroTreinamentoColaborador[];
  setTrainingRecords: React.Dispatch<React.SetStateAction<RegistroTreinamentoColaborador[]>>;
  trainingCourses: CursoTreinamento[];
  setTrainingCourses: React.Dispatch<React.SetStateAction<CursoTreinamento[]>>;
  personDocuments: DocumentoEvidenciaPessoa[];
  activityRequirements: AtividadeCompetenciaRequerida[];
  aiCompetencySuggestions: SugestaoIACompetencia[];

  // Documentos & Fontes
  documentosControlados: DocumentoControlado[];
  setDocumentosControlados: React.Dispatch<React.SetStateAction<DocumentoControlado[]>>;
  revisoesDocumentais: RevisaoDocumental[];
  fontesExternas: FonteExternaControlada[];
  solicitacoesCliente: SolicitacaoRevisaoCliente[];
  logsVerificacaoFontes: LogVerificacaoFonteExterna[];
  evidenciasConsultaDoc: RegistroEvidenciaConsultaDocumento[];

  // Clientes & Requisitos
  clientesExternos: ClienteExterno[];
  basesOperacionais: BaseEstacaoOperacao[];
  programasClientes: ProgramaChecklistCliente[];
  setProgramasClientes: React.Dispatch<React.SetStateAction<ProgramaChecklistCliente[]>>;
  controlesCentrais: ControleCentralSGQ[];
  requisitosClientes: RequisitoClienteItem[];
  setRequisitosClientes: React.Dispatch<React.SetStateAction<RequisitoClienteItem[]>>;
  avaliacoesRequisitos: AvaliacaoRequisitoCliente[];
  handleSaveAvaliacaoCliente: (avaliacao: AvaliacaoRequisitoCliente) => Promise<void>;
  handleCriarRNCDeRequisito: (requisito: RequisitoClienteItem, clienteNome: string) => Promise<void>;

  // Metrologia & Smart Import
  ferramentasCalibradas: FerramentaCalibracao[];
  setFerramentasCalibradas: React.Dispatch<React.SetStateAction<FerramentaCalibracao[]>>;
  smartImports: RegistroImportacaoCompleto[];
  templatesAprovados: TemplateMapeamentoAprovado[];
  setTemplatesAprovados: React.Dispatch<React.SetStateAction<TemplateMapeamentoAprovado[]>>;
}

export const AppViewRouter: React.FC<AppViewRouterProps> = (props) => {
  const { activeTab, setActiveTab } = props;

  if (!canUserAccessTab(activeTab, props.userProfile)) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Acesso Restrito pelo Perfil RBAC
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          O perfil atual ({props.userProfile?.role || 'Visitante'}) não possui permissão para acessar esta funcionalidade.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard Executivo
        </button>
      </div>
    );
  }

  switch (activeTab) {
    case 'dashboard':
      return (
        <DashboardView
          records={props.records}
          manualsCount={props.manuals.length}
          alertas={props.alertas}
          onSelectNC={props.handleViewOfficial}
          onViewOfficial={props.handleViewOfficial}
          onNewNC={props.handleNewNC}
          onOpenExtractor={() => setActiveTab('extrator')}
          onOpenReportTab={props.handleOpenReportWithFilter}
          onOpenAlertsTab={() => setActiveTab('alertas')}
          onOpenManualsTab={() => setActiveTab('manuais')}
          onOpenPresentationTab={() => setActiveTab('apresentacao')}
          onOpenArchitectureTab={() => setActiveTab('arquitetura')}
          onOpenTourTab={() => setActiveTab('conhecaQualigest')}
          onAuditNC={props.handleAuditNC}
        />
      );

    case 'visao-evolucao':
      return (
        <QualityPresentationGeneratorView
          records={props.records}
          manuals={props.manuals}
          knowledgeList={props.knowledgeList}
          comparacoes={props.comparacoes}
          organization={props.activeOrganization}
          organizacaoNome={
            props.activeOrganization?.name ||
            (props.userProfile?.organizationId === 'org_impacto_aviation'
              ? 'Impacto Aviation MRO'
              : 'Organização SGQ')
          }
          usuarioResponsavel={props.userProfile?.displayName || props.user?.email || 'Gestão da Qualidade'}
          externalAudits={props.externalAudits}
          auditFindings={props.auditFindings}
          auditLessons={props.auditLessons}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          trainingCourses={props.trainingCourses}
          personDocuments={props.personDocuments}
          documentosControlados={props.documentosControlados}
          ferramentasCalibradas={props.ferramentasCalibradas}
          alertas={props.alertas}
          initialSlideId={15}
          onNavigateToArchitecture={() => setActiveTab('arquitetura')}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'conhecaQualigest':
    case 'tour-interativo':
      return (
        <InteractiveTourView
          records={props.records}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onOpenAuditModal={() => props.setIsTechnicalAuditModalOpen(true)}
        />
      );

    case 'saudeSGQ':
      return (
        <SGQHealthView
          records={props.records}
          manuals={props.manuals}
          comparacoes={props.comparacoes}
          knowledgeList={props.knowledgeList}
          knowledge={props.knowledgeList}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onOpenAuditModal={() => props.setIsTechnicalAuditModalOpen(true)}
          onSelectNC={(nc, tab) => props.handleEditNC(nc, tab)}
          onSelectRecord={(nc, tab) => props.handleEditNC(nc, tab)}
        />
      );

    case 'apresentacao':
      return (
        <QualityPresentationGeneratorView
          records={props.records}
          manuals={props.manuals}
          knowledgeList={props.knowledgeList}
          comparacoes={props.comparacoes}
          organization={props.activeOrganization}
          organizacaoNome={
            props.activeOrganization?.name ||
            (props.userProfile?.organizationId === 'org_impacto_aviation'
              ? 'Impacto Aviation MRO'
              : 'Organização SGQ')
          }
          usuarioResponsavel={props.userProfile?.displayName || props.user?.email || 'Gestão da Qualidade'}
          externalAudits={props.externalAudits}
          auditFindings={props.auditFindings}
          auditLessons={props.auditLessons}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          trainingCourses={props.trainingCourses}
          personDocuments={props.personDocuments}
          documentosControlados={props.documentosControlados}
          ferramentasCalibradas={props.ferramentasCalibradas}
          alertas={props.alertas}
          onNavigateToArchitecture={() => setActiveTab('arquitetura')}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'diagnosticos-tecnicos':
    case 'arquitetura':
      return (
        <TechnicalDiagnosticsCenterView
          organization={props.activeOrganization}
          onOpenTechnicalAuditModal={() => props.setIsTechnicalAuditModalOpen(true)}
          onOpenFirebaseDiagnosticsModal={() => props.setIsDiagnosticsModalOpen(true)}
          onNavigateToPresentation={() => setActiveTab('apresentacao')}
          initialSubTab={activeTab === 'arquitetura' ? 'arquitetura' : 'visao-geral'}
        />
      );

    case 'relatorio':
      return (
        <ReportListView
          records={props.records}
          onSelectNC={props.handleViewOfficial}
          onEditNC={props.handleEditNC}
          onViewOfficial={props.handleViewOfficial}
          onNewNC={props.handleNewNC}
          onDeleteNC={props.handleDeleteNC}
          onDeleteMultipleNC={props.handleDeleteMultipleNC}
          onAuditNC={props.handleAuditNC}
          initialStatusFilter={props.reportFilterStatus}
        />
      );

    case 'manuais':
      return (
        <ManualsRepositoryView
          manuals={props.manuals}
          documentosControlados={props.documentosControlados}
          onSaveManual={props.handleSaveManual}
          onDeleteManual={props.handleDeleteManual}
          onOpenMigrationModal={() => props.setIsMigrationModalOpen(true)}
          onNavigateToAcervo={() => props.setActiveTab('controle-documental')}
        />
      );

    case 'extrator':
      return (
        <DocumentExtractorView
          onSaveExtracted={props.handleSaveNC}
          onEditExtracted={(nc) => {
            props.setSelectedNC(nc);
            props.handleEditNC(nc, 'dados');
          }}
          onCancel={() => setActiveTab('dashboard')}
        />
      );

    case 'formulario':
      return (
        <NCFormView
          initialData={props.selectedNC}
          initialTab={props.formInitialTab}
          manuals={props.manuals}
          organization={props.activeOrganization}
          onSave={props.handleSaveNC}
          onCancel={() => setActiveTab(props.selectedNC ? 'oficial' : 'relatorio')}
          onDelete={props.handleDeleteNC}
          onAuditNC={props.handleAuditNC}
        />
      );

    case 'incidencias':
      return <IncidenceAnalyticsView records={props.records} />;

    case 'alertas':
      return (
        <AlertsCenterView
          records={props.records}
          alertas={props.alertas}
          onSelectNC={props.handleViewOfficial}
          onUpdateDeadline={props.handleUpdateDeadline}
          onAuditNC={props.handleAuditNC}
        />
      );

    case 'oficial':
      return (
        <OfficialReportView
          nc={props.selectedNC || props.records[0]}
          record={props.selectedNC || props.records[0]}
          organization={props.activeOrganization}
          onBack={() => setActiveTab('relatorio')}
          onEdit={() => props.handleEditNC(props.selectedNC || props.records[0])}
          onDelete={props.handleDeleteNC}
          onAuditNC={props.handleAuditNC}
        />
      );

    case 'comparacaoRNC':
      return (
        <RNCComparisonView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          records={props.records}
          manuals={props.manuals}
          onSelectRecord={props.handleViewOfficial}
          onNavigateToTab={(tabId: any) => setActiveTab(tabId)}
        />
      );

    case 'validacao-qualidade':
    case 'validacaoQueue':
    case 'aprovacao-qualidade':
      return (
        <ValidationQueueView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          records={props.records}
          initialComparisons={props.comparacoes}
          onNavigateToComparison={() => setActiveTab('comparacaoRNC')}
          onNavigateToRecord={props.handleViewOfficial}
        />
      );

    case 'validacao-treinamentos':
    case 'validacaoQueue-treinamentos':
    case 'fila-certificados':
      return (
        <SmartImportMigrationView
          organization={props.activeOrganization}
          user={props.userProfile}
          pessoas={props.persons}
          treinamentos={props.trainingCourses}
          registrosTreinamento={props.trainingRecords}
          documentos={props.documentosControlados}
          ferramentasCalibradas={props.ferramentasCalibradas}
          smartImports={props.smartImports}
          templatesAprovados={props.templatesAprovados}
          onRemoverTemplate={(id) => props.setTemplatesAprovados((prev) => prev.filter((t) => t.id !== id))}
          onSalvarTemplate={(tpl) =>
            props.setTemplatesAprovados((prev) => [tpl, ...prev.filter((t) => t.id !== tpl.id)])
          }
          initialTab="HISTORICO"
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onAdicionarPessoa={(p) => props.setPersons((prev) => [p, ...prev.filter((x) => x.id !== p.id)])}
          onAdicionarCurso={(c) =>
            props.setTrainingCourses((prev) => [c, ...prev.filter((x) => x.id !== c.id)])
          }
          onAdicionarRegistroTreinamento={(r) =>
            props.setTrainingRecords((prev) => [r, ...prev.filter((x) => x.id !== r.id)])
          }
          onAdicionarFerramenta={(f) =>
            props.setFerramentasCalibradas((prev) => [f, ...prev.filter((x) => x.id !== f.id)])
          }
          onRemoverFerramenta={(toolId) =>
            props.setFerramentasCalibradas((prev) => prev.filter((x) => x.id !== toolId))
          }
          onRemoverRegistroTreinamento={(recordId) =>
            props.setTrainingRecords((prev) => prev.filter((r) => r.id !== recordId))
          }
        />
      );

    case 'knowledgeBase':
      return (
        <KnowledgeBaseView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          records={props.records}
          initialKnowledgeList={props.knowledgeList}
          initialComparisons={props.comparacoes}
          onNavigateToComparison={() => setActiveTab('comparacaoRNC')}
        />
      );

    case 'admin-central':
    case 'admin-audit-trail':
      return (
        <CentralAdministrationView
          organization={props.activeOrganization}
          initialSubTab={activeTab === 'admin-audit-trail' ? 'audit-trail' : 'usuarios'}
          onOrganizationUpdated={(updated) => props.setActiveOrganization(updated)}
        />
      );

    case 'configuracoes-org':
    case 'parametros-fluxo':
      return (
        <OrganizationSettingsView
          organization={props.activeOrganization}
          onOrganizationUpdated={(updated) => props.setActiveOrganization(updated)}
        />
      );

    case 'onboarding-novo-cliente':
      return (
        <NewOrganizationOnboardingView
          onOrganizationCreated={(newOrg) => {
            props.setActiveOrganization(newOrg);
            setActiveTab('configuracoes-org');
            props.setIsChecklistModalOpen(true);
          }}
          onCancel={() => setActiveTab('dashboard')}
        />
      );

    case 'manual-utilizacao':
      return (
        <UserManualView
          organization={props.activeOrganization}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'auditorias-gestao':
      return (
        <AuditsManagementView
          audits={props.externalAudits}
          findings={props.auditFindings}
          requirements={props.auditRequirements}
          rncs={props.records}
          userProfile={props.userProfile}
          activeOrganization={props.activeOrganization}
          onSelectAuditForFindings={(audit) => {
            props.setSelectedAuditForFindings(audit);
            setActiveTab('auditorias-constatacoes');
          }}
          onSaveAudit={props.handleSaveAudit}
          onDeleteAudit={props.handleDeleteAudit}
          onCancelAudit={props.handleCancelAudit}
          onRestoreAudit={props.handleRestoreAudit}
          onArchiveAudit={props.handleArchiveAudit}
          onSaveRequirement={props.handleSaveAuditRequirement}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'auditorias-constatacoes':
      return (
        <AuditFindingsView
          audits={props.externalAudits}
          findings={props.auditFindings}
          selectedAuditId={props.selectedAuditForFindings?.id}
          rncRecords={props.records}
          manuals={props.manuals}
          validatedKnowledge={props.knowledgeList}
          userProfile={props.userProfile}
          onBackToAudits={() => setActiveTab('auditorias-gestao')}
          onSaveFinding={props.handleSaveFinding}
          onDeleteFinding={props.handleDeleteFinding}
          onCriarRNCFromFinding={props.handleCriarRNCFromFinding}
          onOpenLessonForm={(_finding, _audit) => {
            setActiveTab('auditorias-licoes');
          }}
          onNavigateToNC={(ncId) => {
            const nc = props.records.find((r) => r.id === ncId);
            if (nc) {
              props.setSelectedNC(nc);
              setActiveTab('oficial');
            }
          }}
        />
      );

    case 'auditorias-licoes':
      return (
        <AuditLessonsLearnedView
          lessons={props.auditLessons}
          audits={props.externalAudits}
          findings={props.auditFindings}
          userProfile={props.userProfile}
          onSaveLesson={props.handleSaveLesson}
          onCandidatarKnowledge={props.handleCandidatarKnowledge}
          onNavigateToKnowledge={() => setActiveTab('knowledgeBase')}
        />
      );

    case 'auditorias-dashboard':
      return (
        <AuditsDashboardView
          audits={props.externalAudits}
          findings={props.auditFindings}
          lessons={props.auditLessons}
          onBackToAudits={() => setActiveTab('auditorias-gestao')}
          onNavigateToFindings={() => setActiveTab('auditorias-constatacoes')}
          onNavigateToLessons={() => setActiveTab('auditorias-licoes')}
        />
      );

    // 1. COLABORADORES, NOVO COLABORADOR & FUNÇÕES
    case 'colaboradores-lista':
    case 'colaborador-novo':
    case 'cadastros-funcoes-cargos':
    case 'pessoas-competencias':
    case 'rooster-pessoas':
    case 'pessoas':
      return (
        <PersonsCompetenciesView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          trainingCourses={props.trainingCourses}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          nonConformities={props.records}
          bases={props.basesOperacionais}
          initialStatusFilter={props.initialPersonStatusFilter}
          initialSubTab={activeTab === 'cadastros-funcoes-cargos' ? 'FUNCOES_CARGOS' : 'COLABORADORES'}
          initialOpenNovoColaborador={activeTab === 'colaborador-novo'}
          onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
          onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
          onNavigateToImport={() => setActiveTab('importacao-certificados')}
        />
      );

    // FICHA INDIVIDUAL DO MECÂNICO (ROOSTER MRO)
    case 'rooster-ficha':
    case 'ficha':
    case 'colaborador-perfil':
      return (
        <PersonsCompetenciesView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          trainingCourses={props.trainingCourses}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          nonConformities={props.records}
          bases={props.basesOperacionais}
          initialStatusFilter={props.initialPersonStatusFilter}
          initialSubTab="ROOSTER_MRO"
          initialRoosterTab="ficha"
          onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
          onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
          onNavigateToImport={() => setActiveTab('importacao-certificados')}
        />
      );

    // MATRIZ DE COMPETÊNCIAS & MODELOS DE CAPACITAÇÃO CANÔNICA
    case 'rooster-matrizes':
    case 'matrizes':
    case 'matriz-competencias':
    case 'modelos-capacitacao':
      return (
        <PersonsCompetenciesView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          trainingCourses={props.trainingCourses}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          nonConformities={props.records}
          bases={props.basesOperacionais}
          initialStatusFilter={props.initialPersonStatusFilter}
          initialSubTab="MATRIZ"
          onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
          onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
          onNavigateToImport={() => setActiveTab('importacao-certificados')}
        />
      );

    // 3 & 4. TREINAMENTOS, QUALIFICAÇÕES & CATÁLOGO CANÔNICO
    case 'treinamentos-qualificacoes':
    case 'rooster-treinamentos':
    case 'rooster-catalogo':
    case 'catalogo':
    case 'treinamentos-catalogo':
    case 'cht-qualificacoes':
    case 'rooster-licencas':
    case 'licencas': {
      const initialTabVal =
        activeTab === 'cht-qualificacoes' || activeTab === 'rooster-licencas' || activeTab === 'licencas'
          ? 'QUALIFICACOES'
          : activeTab === 'rooster-catalogo' || activeTab === 'catalogo' || activeTab === 'treinamentos-catalogo'
          ? 'CURSOS'
          : 'REGISTROS';

      return (
        <TrainingsQualificationsView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          trainingCourses={props.trainingCourses}
          trainingRecords={props.trainingRecords}
          qualifications={props.qualifications}
          documents={props.personDocuments}
          initialTab={initialTabVal}
          onNavigateToImport={() => setActiveTab('importacao-certificados')}
          onNavigateToRooster={(roosterTab) => {
            if (roosterTab === 'designacao') setActiveTab('rooster-designacao');
            else if (roosterTab === 'conferencia') setActiveTab('rooster-conferencia');
            else setActiveTab('rooster-designacoes-crud');
          }}
          onRegistrosRemovidos={(ids) =>
            props.setTrainingRecords((prev) => prev.filter((x) => !ids.includes(x.id)))
          }
        />
      );
    }

    // 5. CENTRAL UNIFICADA DE VENCIMENTOS & GAPS OPERACIONAIS
    case 'central-vencimentos-gaps':
    case 'rooster-vencimentos':
    case 'vencimentos':
    case 'aptidao-operacional':
      return (
        <ExpirationsGapsCenterView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          aiSuggestions={props.aiCompetencySuggestions}
          ferramentas={props.ferramentasCalibradas}
          documentosControlados={props.documentosControlados}
          recordsNC={props.records}
          initialSubTab={activeTab === 'aptidao-operacional' ? 'SIMULADOR' : 'VENCIMENTOS'}
          onNavigateToImport={() => setActiveTab('importacao-certificados')}
          onRegistrosRemovidos={(ids) =>
            props.setTrainingRecords((prev) => prev.filter((x) => !ids.includes(x.id)))
          }
        />
      );

    // 7. MÓDULOS TÉCNICOS ESPECIALIZADOS DE DESIGNAÇÃO, ROSTER & CONFERÊNCIA MRO (F 001-29)
    case 'rooster-mro':
    case 'rooster':
    case 'rooster-relatorio':
    case 'rooster-roster':
    case 'rooster-designacao':
    case 'designacao':
    case 'lista-designacao':
    case 'rooster-designacoes-crud':
    case 'designacoes_crud':
    case 'designacoes':
    case 'rooster-conferencia':
    case 'conferencia':
    case 'cadastros-bases':
    case 'rooster-bases':
    case 'bases':
    case 'rooster-motores': {
      const roosterTab =
        activeTab === 'rooster-relatorio' || activeTab === 'rooster-roster' || activeTab === 'rooster'
          ? 'roster'
          : activeTab === 'rooster-designacoes-crud' || activeTab === 'designacoes_crud' || activeTab === 'designacoes'
          ? 'designacoes_crud'
          : activeTab === 'rooster-conferencia' || activeTab === 'conferencia'
          ? 'conferencia'
          : activeTab === 'cadastros-bases' || activeTab === 'rooster-bases' || activeTab === 'bases'
          ? 'bases'
          : activeTab === 'rooster-motores'
          ? 'motores'
          : 'designacao';

      return (
        <PersonsCompetenciesView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          trainingCourses={props.trainingCourses}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          nonConformities={props.records}
          bases={props.basesOperacionais}
          initialStatusFilter={props.initialPersonStatusFilter}
          initialSubTab="ROOSTER_MRO"
          initialRoosterTab={roosterTab}
          onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
          onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
          onNavigateToImport={() => setActiveTab('importacao-certificados')}
        />
      );
    }

    case 'competencias-dashboard':
      return (
        <CompetenciesDashboardView
          organizationId={props.activeOrgId}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          onNavigateToPersons={() => {
            props.setInitialPersonStatusFilter('TODOS');
            setActiveTab('pessoas-competencias');
          }}
          onNavigateToPersonsWithStatus={(status) => {
            props.setInitialPersonStatusFilter(status);
            setActiveTab('pessoas-competencias');
          }}
          onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
          onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
        />
      );

    case 'controle-documental':
    case 'verificacao-controle':
    case 'historico-relatorios':
    case 'consulta-temporal':
    case 'fontes-externas':
    case 'documentos-dashboard':
    case 'documentos-revisoes':
    case 'documentos-solicitacoes':
    case 'documentos-comparador':
    case 'documentos-inativos':
    case 'empresas-frotas':
    case 'documentos-empresas-frotas':
      return (
        <DocumentControlCenterView
          organizationId={props.activeOrgId}
          currentUser={props.userProfile}
          activeOrganization={props.activeOrganization}
          documentos={props.documentosControlados}
          revisoes={props.revisoesDocumentais}
          manuals={props.manuals}
          onManualsUpdated={props.handleSaveManual ? () => {} : undefined}
          fontes={props.fontesExternas}
          solicitacoes={props.solicitacoesCliente}
          logsVerificacao={props.logsVerificacaoFontes}
          evidenciasConsulta={props.evidenciasConsultaDoc}
          nonConformities={props.records}
          clientesExternos={props.clientesExternos}
          initialSubTab={
            activeTab === 'empresas-frotas' || activeTab === 'documentos-empresas-frotas'
              ? 'empresas-frotas'
              : activeTab === 'documentos-inativos'
              ? 'inativos'
              : activeTab === 'verificacao-controle' ||
                activeTab === 'fontes-externas' ||
                activeTab === 'documentos-solicitacoes'
              ? 'verificacao'
              : activeTab === 'historico-relatorios' ||
                activeTab === 'documentos-revisoes' ||
                activeTab === 'consulta-temporal' ||
                activeTab === 'documentos-comparador'
              ? 'historico'
              : 'acervo'
          }
          onOpenNCFormWithDoc={() => {
            setActiveTab('formulario');
          }}
        />
      );

    case 'clientes-requisitos':
    case 'clientes-matriz':
    case 'clientes-cockpit':
    case 'clientes-cronograma':
    case 'outros-controles':
      return (
        <ClientAuditsManagementView
          clientes={props.clientesExternos}
          bases={props.basesOperacionais}
          programas={props.programasClientes}
          controles={props.controlesCentrais}
          requisitos={props.requisitosClientes}
          avaliacoes={props.avaliacoesRequisitos}
          activeOrganization={props.activeOrganization}
          userProfile={props.userProfile}
          initialTab={
            activeTab === 'clientes-matriz'
              ? 'matriz'
              : activeTab === 'clientes-cockpit'
              ? 'cockpit'
              : activeTab === 'clientes-cronograma'
              ? 'cronograma'
              : 'requisitos'
          }
          onSaveAvaliacao={props.handleSaveAvaliacaoCliente}
          onCriarRNCDeRequisito={props.handleCriarRNCDeRequisito}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'ferramentas-metrologia':
      return (
        <FerramentasMetrologiaView
          organization={props.activeOrganization}
          user={props.userProfile}
          ferramentasCalibradas={props.ferramentasCalibradas}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onAdicionarFerramenta={(f) =>
            props.setFerramentasCalibradas((prev) => [f, ...prev.filter((x) => x.id !== f.id)])
          }
          onRemoverFerramenta={(toolId) =>
            props.setFerramentasCalibradas((prev) => prev.filter((x) => x.id !== toolId))
          }
        />
      );

    case 'importacao-inteligente':
    case 'importacao-certificados':
      return (
        <SmartImportMigrationView
          organization={props.activeOrganization}
          user={props.userProfile}
          pessoas={props.persons}
          treinamentos={props.trainingCourses}
          registrosTreinamento={props.trainingRecords}
          documentos={props.documentosControlados}
          ferramentasCalibradas={props.ferramentasCalibradas}
          smartImports={props.smartImports}
          templatesAprovados={props.templatesAprovados}
          onRemoverTemplate={(id) => props.setTemplatesAprovados((prev) => prev.filter((t) => t.id !== id))}
          onSalvarTemplate={(tpl) =>
            props.setTemplatesAprovados((prev) => [tpl, ...prev.filter((t) => t.id !== tpl.id)])
          }
          initialTab="WIZARD"
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
          onAdicionarPessoa={(p) => props.setPersons((prev) => [p, ...prev.filter((x) => x.id !== p.id)])}
          onAdicionarCurso={(c) =>
            props.setTrainingCourses((prev) => [c, ...prev.filter((x) => x.id !== c.id)])
          }
          onAdicionarRegistroTreinamento={(r) =>
            props.setTrainingRecords((prev) => [r, ...prev.filter((x) => x.id !== r.id)])
          }
          onAdicionarFerramenta={(f) =>
            props.setFerramentasCalibradas((prev) => [f, ...prev.filter((x) => x.id !== f.id)])
          }
          onRemoverFerramenta={(toolId) =>
            props.setFerramentasCalibradas((prev) => prev.filter((x) => x.id !== toolId))
          }
          onRemoverRegistroTreinamento={(recordId) =>
            props.setTrainingRecords((prev) => prev.filter((x) => x.id !== recordId))
          }
          onRemoverPessoa={(personId) => props.setPersons((prev) => prev.filter((x) => x.id !== personId))}
          onRemoverCurso={(courseId) =>
            props.setTrainingCourses((prev) => prev.filter((x) => x.id !== courseId))
          }
          onAdicionarQualificacao={(q) =>
            props.setQualifications((prev) => [q, ...prev.filter((x) => x.id !== q.id)])
          }
          onRemoverQualificacao={(qualId) =>
            props.setQualifications((prev) => prev.filter((x) => x.id !== qualId))
          }
          onAdicionarDocumento={(doc) =>
            props.setDocumentosControlados((prev) => [doc, ...prev.filter((x) => x.id !== doc.id)])
          }
          onRemoverDocumento={(docId) =>
            props.setDocumentosControlados((prev) => prev.filter((x) => x.id !== docId))
          }
          onCriarRncSugerida={(_dadosRnc) => {
            props.handleNewNC();
          }}
        />
      );

    case 'smart-audit':
    case 'pre-auditoria':
      return (
        <SmartAuditView
          clientes={props.clientesExternos}
          bases={props.basesOperacionais}
          programas={props.programasClientes}
          controles={props.controlesCentrais}
          requisitos={props.requisitosClientes}
          avaliacoes={props.avaliacoesRequisitos}
          ferramentas={props.ferramentasCalibradas}
          treinamentos={props.trainingRecords}
          qualificacoes={props.qualifications}
          documentos={props.documentosControlados}
          manuals={props.manuals}
          pessoas={props.persons}
          audits={props.externalAudits}
          findings={props.auditFindings}
          lessons={props.auditLessons}
          rncs={props.records}
          activeOrganization={props.activeOrganization}
          userProfile={props.userProfile}
          auditRequirements={props.auditRequirements}
          preparacoesInstitucionais={props.preparacoesInstitucionais}
          setPreparacoesInstitucionais={props.setPreparacoesInstitucionais}
          preAudits={props.preAudits}
          onSavePreAudit={props.handleSavePreAudit}
          initialMode={activeTab === 'pre-auditoria' ? 'PRE_AUDITORIA' : undefined}
          onSaveAuditRequirement={props.handleSaveAuditRequirement}
          onSaveAuditRequirementsBatch={props.handleSaveBatchAuditRequirements}
          onSaveAvaliacao={props.handleSaveAvaliacaoCliente}
          onCriarRNCDeRequisito={props.handleCriarRNCDeRequisito}
          onSaveAudit={props.handleSaveAudit}
          onSaveFinding={props.handleSaveFinding}
          onSaveLesson={props.handleSaveLesson}
          onSaveRequirement={async (req) => {
            props.setRequisitosClientes((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
          }}
          onSaveProgram={async (prog) => {
            props.setProgramasClientes((prev) => [prog, ...prev.filter((p) => p.id !== prog.id)]);
          }}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'biblioteca-checklists':
    case 'checklists-auditoria':
    case 'checklists-corporativos':
      return (
        <AuditChecklistsLibraryView
          organizationId={props.activeOrgId}
          currentUser={props.userProfile}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'preparacao-auditorias':
    case 'preparacao-requisitos':
      return (
        <RequirementsLibraryView
          requisitos={props.requisitosClientes}
          setRequisitos={props.setRequisitosClientes}
          clientes={props.clientesExternos}
          bases={props.basesOperacionais}
          controles={props.controlesCentrais}
          programas={props.programasClientes}
          activeOrganization={props.activeOrganization}
          userProfile={props.userProfile}
          documentosControlados={props.documentosControlados}
          manuals={props.manuals}
          trainingRecords={props.trainingRecords}
          qualifications={props.qualifications}
          ferramentasCalibradas={props.ferramentasCalibradas}
          recordsNC={props.records}
          externalAudits={props.externalAudits}
          auditFindings={props.auditFindings}
          initialSubTab="preparacao_auditoria"
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'biblioteca-requisitos':
    case 'requisitos-mestre':
    case 'requisitos-normativos':
      return (
        <RequirementsLibraryView
          requisitos={props.requisitosClientes}
          setRequisitos={props.setRequisitosClientes}
          clientes={props.clientesExternos}
          bases={props.basesOperacionais}
          controles={props.controlesCentrais}
          programas={props.programasClientes}
          activeOrganization={props.activeOrganization}
          userProfile={props.userProfile}
          documentosControlados={props.documentosControlados}
          manuals={props.manuals}
          trainingRecords={props.trainingRecords}
          qualifications={props.qualifications}
          ferramentasCalibradas={props.ferramentasCalibradas}
          recordsNC={props.records}
          externalAudits={props.externalAudits}
          auditFindings={props.auditFindings}
          onNavigateToTab={(tab) => setActiveTab(tab as any)}
        />
      );

    case 'system-designer':
      return <SystemDesignerOfficialView />;

    default:
      console.warn(`[AppViewRouter] Rota não reconhecida: "${activeTab}". Redirecionando para Dashboard.`);
      return (
        <DashboardView
          records={props.records}
          manualsCount={props.manuals.length}
          alertas={props.alertas}
          onSelectNC={props.handleViewOfficial}
          onViewOfficial={props.handleViewOfficial}
          onNewNC={props.handleNewNC}
          onOpenExtractor={() => setActiveTab('extrator')}
          onOpenReportTab={props.handleOpenReportWithFilter}
          onOpenAlertsTab={() => setActiveTab('alertas')}
          onOpenManualsTab={() => setActiveTab('manuais')}
          onOpenPresentationTab={() => setActiveTab('apresentacao')}
          onOpenArchitectureTab={() => setActiveTab('arquitetura')}
          onOpenTourTab={() => setActiveTab('conhecaQualigest')}
          onAuditNC={props.handleAuditNC}
        />
      );
  }
};
