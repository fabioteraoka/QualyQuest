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
} from '../../types';
import { RequisitoAuditoriaExterna } from '../../types/auditRequirements';
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
import { SystemDesignerOfficialView } from '../SystemDesignerOfficialView';

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
          onSaveManual={props.handleSaveManual}
          onDeleteManual={props.handleDeleteManual}
          onOpenMigrationModal={() => props.setIsMigrationModalOpen(true)}
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

    case 'validacaoQueue':
      return (
        <ValidationQueueView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          records={props.records}
          onNavigateToComparison={() => setActiveTab('comparacaoRNC')}
          onNavigateToRecord={props.handleViewOfficial}
        />
      );

    case 'knowledgeBase':
      return (
        <KnowledgeBaseView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          records={props.records}
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

    case 'pessoas-competencias':
      return (
        <PersonsCompetenciesView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          competencies={props.competencies}
          personCompetencies={props.personCompetencies}
          qualifications={props.qualifications}
          trainingRecords={props.trainingRecords}
          documents={props.personDocuments}
          activities={props.activityRequirements}
          nonConformities={props.records}
          bases={props.basesOperacionais}
          initialStatusFilter={props.initialPersonStatusFilter}
          onNavigateToTrainings={() => setActiveTab('treinamentos-qualificacoes')}
          onNavigateToExpirations={() => setActiveTab('central-vencimentos-gaps')}
          onNavigateToImport={() => setActiveTab('importacao-inteligente')}
        />
      );

    case 'treinamentos-qualificacoes':
    case 'cht-qualificacoes':
      return (
        <TrainingsQualificationsView
          organizationId={props.activeOrgId}
          userProfile={props.userProfile}
          persons={props.persons}
          trainingCourses={props.trainingCourses}
          trainingRecords={props.trainingRecords}
          qualifications={props.qualifications}
          documents={props.personDocuments}
          initialTab={activeTab === 'cht-qualificacoes' ? 'QUALIFICACOES' : 'CURSOS'}
          onNavigateToImport={() => setActiveTab('importacao-inteligente')}
          onRegistrosRemovidos={(ids) =>
            props.setTrainingRecords((prev) => prev.filter((x) => !ids.includes(x.id)))
          }
        />
      );

    case 'central-vencimentos-gaps':
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
          onNavigateToImport={() => setActiveTab('importacao-inteligente')}
          onRegistrosRemovidos={(ids) =>
            props.setTrainingRecords((prev) => prev.filter((x) => !ids.includes(x.id)))
          }
        />
      );

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
      return (
        <DocumentControlCenterView
          organizationId={props.activeOrgId}
          currentUser={props.userProfile}
          activeOrganization={props.activeOrganization}
          documentos={props.documentosControlados}
          revisoes={props.revisoesDocumentais}
          fontes={props.fontesExternas}
          solicitacoes={props.solicitacoesCliente}
          logsVerificacao={props.logsVerificacaoFontes}
          evidenciasConsulta={props.evidenciasConsultaDoc}
          nonConformities={props.records}
          initialSubTab={
            activeTab === 'verificacao-controle' ||
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
          documentos={props.documentosControlados}
          pessoas={props.persons}
          audits={props.externalAudits}
          findings={props.auditFindings}
          lessons={props.auditLessons}
          rncs={props.records}
          activeOrganization={props.activeOrganization}
          userProfile={props.userProfile}
          auditRequirements={props.auditRequirements}
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

    case 'system-designer':
      return <SystemDesignerOfficialView />;

    default:
      return null;
  }
};
