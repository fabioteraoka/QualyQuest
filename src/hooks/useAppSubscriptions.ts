import { useState, useEffect } from 'react';
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
} from '../types';
import { RequisitoAuditoriaExterna } from '../types/auditRequirements';
import {
  subscribeToNonConformities,
  subscribeToManuals,
  subscribeToRNCComparisons,
  subscribeToValidatedKnowledge,
  subscribeToOrganization,
  ensureOrganization,
  DEFAULT_ORGANIZATION_ID,
  subscribeToExternalAudits,
  subscribeToAuditFindings,
  subscribeToAuditLessons,
  checkAndMigrateLegacyHyphenData,
} from '../services/firebase/firestore';
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
} from '../services/firebase/competenciesFirestore';
import {
  subscribeToDocumentosControlados,
  subscribeToRevisoesDocumentais,
  subscribeToFontesExternas,
  subscribeToSolicitacoesCliente,
  subscribeToLogsVerificacao,
  subscribeToEvidenciasConsulta,
} from '../services/firebase/documentControlFirestore';
import {
  subscribeToClientesExternos,
  subscribeToBasesOperacionais,
  subscribeToProgramasClientes,
  subscribeToControlesCentrais,
  subscribeToRequisitosClientes,
  subscribeToAvaliacoesRequisitos,
} from '../services/firebase/clientRequirementsFirestore';
import {
  subscribeToCalibratedTools,
  subscribeToSmartImportRecords,
  subscribeToImportTemplates,
} from '../services/firebase/smartImportFirestore';
import { subscribeToAuditRequirements } from '../services/firebase/auditRequirementsFirestore';

import { INITIAL_RECORDS } from '../data/initialRecords';
import { INITIAL_MANUALS } from '../data/initialManuals';
import { INITIAL_EXTERNAL_AUDITS, INITIAL_AUDIT_FINDINGS, INITIAL_AUDIT_LESSONS } from '../data/initialAudits';
import {
  INITIAL_PERSONS,
  INITIAL_COMPETENCIES,
  INITIAL_PERSON_COMPETENCIES,
  INITIAL_TRAINING_COURSES,
  INITIAL_TRAINING_RECORDS,
  INITIAL_QUALIFICATIONS,
  INITIAL_PERSON_DOCUMENTS,
  INITIAL_ACTIVITY_REQUIREMENTS,
} from '../data/initialCompetenciesData';
import {
  INITIAL_DOCUMENTOS_CONTROLADOS,
  INITIAL_REVISOES_DOCUMENTAIS,
  INITIAL_FONTES_EXTERNAS,
  INITIAL_SOLICITACOES_CLIENTE,
  INITIAL_LOGS_VERIFICACAO,
  INITIAL_EVIDENCIAS_CONSULTA,
} from '../data/initialDocumentControl';
import {
  INITIAL_CLIENTS,
  INITIAL_BASES,
  INITIAL_CLIENT_PROGRAMS,
  INITIAL_CENTRAL_CONTROLS,
  INITIAL_CLIENT_REQUIREMENTS,
  INITIAL_CLIENT_EVALUATIONS,
} from '../data/initialClientRequirements';
import { INITIAL_CALIBRATED_TOOLS } from '../data/initialCalibratedTools';

export interface UseAppSubscriptionsProps {
  user: any;
  userProfile: any;
  authLoading: boolean;
  activeOrgId: string;
}

export function useAppSubscriptions({ user, userProfile, authLoading, activeOrgId }: UseAppSubscriptionsProps) {
  // Real-time Firestore state
  const [records, setRecords] = useState<NCRecord[]>([]);
  const [manuals, setManuals] = useState<ManualRecord[]>([]);
  const [comparacoes, setComparacoes] = useState<ComparacaoRNCRecord[]>([]);
  const [knowledgeList, setKnowledgeList] = useState<ValidatedKnowledgeRecord[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<OrganizationRecord | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingManuals, setLoadingManuals] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Auditorias Externas e Requisitos
  const [externalAudits, setExternalAudits] = useState<AuditoriaExternaRecord[]>([]);
  const [auditFindings, setAuditFindings] = useState<ConstatacaoExternaRecord[]>([]);
  const [auditLessons, setAuditLessons] = useState<LicaoAprendidaAuditoria[]>([]);
  const [auditRequirements, setAuditRequirements] = useState<RequisitoAuditoriaExterna[]>([]);
  const [selectedAuditForFindings, setSelectedAuditForFindings] = useState<AuditoriaExternaRecord | null>(null);

  // Pessoas, Competências, Treinamentos e Qualificações
  const [persons, setPersons] = useState<ColaboradorPessoa[]>([]);
  const [competencies, setCompetencies] = useState<CompetenciaItem[]>([]);
  const [personCompetencies, setPersonCompetencies] = useState<CompetenciaColaborador[]>([]);
  const [trainingCourses, setTrainingCourses] = useState<CursoTreinamento[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<RegistroTreinamentoColaborador[]>([]);
  const [qualifications, setQualifications] = useState<QualificacaoColaborador[]>([]);
  const [personDocuments, setPersonDocuments] = useState<DocumentoEvidenciaPessoa[]>([]);
  const [activityRequirements, setActivityRequirements] = useState<AtividadeCompetenciaRequerida[]>([]);
  const [aiCompetencySuggestions, setAiCompetencySuggestions] = useState<SugestaoIACompetencia[]>([]);

  // Controle Documental, Revisões e Fontes Externas
  const [documentosControlados, setDocumentosControlados] = useState<DocumentoControlado[]>([]);
  const [revisoesDocumentais, setRevisoesDocumentais] = useState<RevisaoDocumental[]>([]);
  const [fontesExternas, setFontesExternas] = useState<FonteExternaControlada[]>([]);
  const [solicitacoesCliente, setSolicitacoesCliente] = useState<SolicitacaoRevisaoCliente[]>([]);
  const [logsVerificacaoFontes, setLogsVerificacaoFontes] = useState<LogVerificacaoFonteExterna[]>([]);
  const [evidenciasConsultaDoc, setEvidenciasConsultaDoc] = useState<RegistroEvidenciaConsultaDocumento[]>([]);

  // Auditorias, Requisitos e Controles de Clientes
  const [clientesExternos, setClientesExternos] = useState<ClienteExterno[]>([]);
  const [basesOperacionais, setBasesOperacionais] = useState<BaseEstacaoOperacao[]>([]);
  const [programasClientes, setProgramasClientes] = useState<ProgramaChecklistCliente[]>([]);
  const [controlesCentrais, setControlesCentrais] = useState<ControleCentralSGQ[]>([]);
  const [requisitosClientes, setRequisitosClientes] = useState<RequisitoClienteItem[]>([]);
  const [avaliacoesRequisitos, setAvaliacoesRequisitos] = useState<AvaliacaoRequisitoCliente[]>([]);

  // Importação Inteligente, Metrologia e Modelos Homologados
  const [ferramentasCalibradas, setFerramentasCalibradas] = useState<FerramentaCalibracao[]>([]);
  const [smartImports, setSmartImports] = useState<RegistroImportacaoCompleto[]>([]);
  const [templatesAprovados, setTemplatesAprovados] = useState<TemplateMapeamentoAprovado[]>([]);

  useEffect(() => {
    // Aguarda finalização da verificação de autenticação
    if (authLoading) return;

    // Se o usuário não estiver autenticado, carrega dados de demonstração em memória
    // e NÃO abre listeners de Firestore sem credenciais
    if (!user) {
      setRecords(INITIAL_RECORDS);
      setManuals(INITIAL_MANUALS);
      setComparacoes([]);
      setKnowledgeList([]);
      setExternalAudits(INITIAL_EXTERNAL_AUDITS);
      setAuditFindings(INITIAL_AUDIT_FINDINGS);
      setAuditLessons(INITIAL_AUDIT_LESSONS);
      setPersons(INITIAL_PERSONS);
      setCompetencies(INITIAL_COMPETENCIES);
      setPersonCompetencies(INITIAL_PERSON_COMPETENCIES);
      setTrainingCourses(INITIAL_TRAINING_COURSES);
      setTrainingRecords(INITIAL_TRAINING_RECORDS);
      setQualifications(INITIAL_QUALIFICATIONS);
      setPersonDocuments(INITIAL_PERSON_DOCUMENTS);
      setActivityRequirements(INITIAL_ACTIVITY_REQUIREMENTS);
      setAiCompetencySuggestions([]);
      setDocumentosControlados(INITIAL_DOCUMENTOS_CONTROLADOS);
      setRevisoesDocumentais(INITIAL_REVISOES_DOCUMENTAIS);
      setFontesExternas(INITIAL_FONTES_EXTERNAS);
      setSolicitacoesCliente(INITIAL_SOLICITACOES_CLIENTE);
      setLogsVerificacaoFontes(INITIAL_LOGS_VERIFICACAO);
      setEvidenciasConsultaDoc(INITIAL_EVIDENCIAS_CONSULTA);
      setClientesExternos(INITIAL_CLIENTS);
      setBasesOperacionais(INITIAL_BASES);
      setProgramasClientes(INITIAL_CLIENT_PROGRAMS);
      setControlesCentrais(INITIAL_CENTRAL_CONTROLS);
      setRequisitosClientes(INITIAL_CLIENT_REQUIREMENTS);
      setAvaliacoesRequisitos(INITIAL_CLIENT_EVALUATIONS);
      setFerramentasCalibradas(INITIAL_CALIBRATED_TOOLS);
      setSmartImports([]);
      setLoadingRecords(false);
      setLoadingManuals(false);
      setFirestoreError(null);
      return;
    }

    // Limpeza de memória imediata na transição de tenant
    setRecords([]);
    setManuals([]);
    setComparacoes([]);
    setKnowledgeList([]);
    setExternalAudits([]);
    setAuditFindings([]);
    setAuditLessons([]);
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
      },
      (err) => {
        console.warn('Sincronização de RNCs com Firestore:', err?.message || err);
        setFirestoreError(err?.message || 'Falha ao sincronizar Não Conformidades.');
        setLoadingRecords(false);
        setRecords((prev) => (prev.length > 0 ? prev : INITIAL_RECORDS));
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
        console.warn('Sincronização de Manuais:', err?.message || err);
        setLoadingManuals(false);
        setManuals((prev) => (prev.length > 0 ? prev : INITIAL_MANUALS));
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
          ensureOrganization(activeOrgId)
            .then((created) => {
              setActiveOrganization(created);
            })
            .catch((err) => {
              console.warn('Falha ao inicializar organização padrão:', err);
            });
        }
      },
      (err) => {
        console.warn('Sincronização em tempo real da organização:', err?.message);
      }
    );

    // 6. Subscribe to External Audits (Fase 8)
    const unsubscribeAudits = subscribeToExternalAudits(activeOrgId, (auditsList) => {
      setExternalAudits(auditsList.length > 0 ? auditsList : INITIAL_EXTERNAL_AUDITS);
    });

    // 7. Subscribe to Audit Findings (Fase 8)
    const unsubscribeFindings = subscribeToAuditFindings(activeOrgId, (findingsList) => {
      setAuditFindings(findingsList.length > 0 ? findingsList : INITIAL_AUDIT_FINDINGS);
    });

    // 8. Subscribe to Audit Lessons Learned (Fase 8)
    const unsubscribeLessons = subscribeToAuditLessons(activeOrgId, (lessonsList) => {
      setAuditLessons(lessonsList.length > 0 ? lessonsList : INITIAL_AUDIT_LESSONS);
    });

    // 8.1 Subscribe to Audit Requirements (Fase 8 & 15)
    const unsubscribeAuditReqs = subscribeToAuditRequirements(activeOrgId, null, (reqsList) => {
      setAuditRequirements(reqsList);
    });

    // 9. Subscribe to Phase 9: Pessoas, Competências, Treinamentos e Qualificações
    const unsubscribePersons = subscribeToPersons(activeOrgId, (list) => {
      setPersons(list.length > 0 ? list : INITIAL_PERSONS);
    });
    const unsubscribeCompetencies = subscribeToCompetencies(activeOrgId, (list) => {
      setCompetencies(list.length > 0 ? list : INITIAL_COMPETENCIES);
    });
    const unsubscribePersonCompetencies = subscribeToPersonCompetencies(activeOrgId, (list) => {
      setPersonCompetencies(list.length > 0 ? list : INITIAL_PERSON_COMPETENCIES);
    });
    const unsubscribeTrainingCourses = subscribeToTrainingCourses(activeOrgId, (list) => {
      setTrainingCourses(list.length > 0 ? list : INITIAL_TRAINING_COURSES);
    });
    const unsubscribeTrainingRecords = subscribeToTrainingRecords(activeOrgId, (list) => {
      setTrainingRecords(list.length > 0 ? list : INITIAL_TRAINING_RECORDS);
    });
    const unsubscribeQualifications = subscribeToQualifications(activeOrgId, (list) => {
      setQualifications(list.length > 0 ? list : INITIAL_QUALIFICATIONS);
    });
    const unsubscribeDocuments = subscribeToPersonDocuments(activeOrgId, (list) => {
      setPersonDocuments(list.length > 0 ? list : INITIAL_PERSON_DOCUMENTS);
    });
    const unsubscribeActivities = subscribeToActivityRequirements(activeOrgId, (list) => {
      setActivityRequirements(list.length > 0 ? list : INITIAL_ACTIVITY_REQUIREMENTS);
    });
    const unsubscribeAiSuggestions = subscribeToAiCompetencySuggestions(activeOrgId, (list) =>
      setAiCompetencySuggestions(list)
    );

    // 10. Subscribe to Phase 10: Controle Documental, Revisões, Fontes Externas e RAG
    const unsubscribeDocumentos = subscribeToDocumentosControlados(activeOrgId, (list) => {
      setDocumentosControlados(list.length > 0 ? list : INITIAL_DOCUMENTOS_CONTROLADOS);
    });
    const unsubscribeRevisoes = subscribeToRevisoesDocumentais(activeOrgId, (list) => {
      setRevisoesDocumentais(list.length > 0 ? list : INITIAL_REVISOES_DOCUMENTAIS);
    });
    const unsubscribeFontes = subscribeToFontesExternas(activeOrgId, (list) => {
      setFontesExternas(list.length > 0 ? list : INITIAL_FONTES_EXTERNAS);
    });
    const unsubscribeSolicitacoes = subscribeToSolicitacoesCliente(activeOrgId, (list) =>
      setSolicitacoesCliente(list)
    );
    const unsubscribeLogsFontes = subscribeToLogsVerificacao(activeOrgId, (list) => setLogsVerificacaoFontes(list));
    const unsubscribeEvidencias = subscribeToEvidenciasConsulta(activeOrgId, (list) =>
      setEvidenciasConsultaDoc(list)
    );

    // 11. Subscribe to Phase 13: Auditorias, Requisitos e Controles de Clientes
    const unsubscribeClientes = subscribeToClientesExternos(activeOrgId, (list) => {
      setClientesExternos(list.length > 0 ? list : INITIAL_CLIENTS);
    });
    const unsubscribeBases = subscribeToBasesOperacionais(activeOrgId, (list) => {
      setBasesOperacionais(list.length > 0 ? list : INITIAL_BASES);
    });
    const unsubscribeProgramas = subscribeToProgramasClientes(activeOrgId, (list) => {
      setProgramasClientes(list.length > 0 ? list : INITIAL_CLIENT_PROGRAMS);
    });
    const unsubscribeControles = subscribeToControlesCentrais(activeOrgId, (list) => {
      setControlesCentrais(list.length > 0 ? list : INITIAL_CENTRAL_CONTROLS);
    });
    const unsubscribeRequisitos = subscribeToRequisitosClientes(activeOrgId, (list) => {
      setRequisitosClientes(list.length > 0 ? list : INITIAL_CLIENT_REQUIREMENTS);
    });
    const unsubscribeAvaliacoes = subscribeToAvaliacoesRequisitos(activeOrgId, (list) => {
      setAvaliacoesRequisitos(list.length > 0 ? list : INITIAL_CLIENT_EVALUATIONS);
    });

    // 12. Subscribe to Phase 14: Importação Inteligente, Metrologia e Modelos Homologados
    const unsubscribeTools = subscribeToCalibratedTools(activeOrgId, (list) => {
      setFerramentasCalibradas(list.length > 0 ? list : INITIAL_CALIBRATED_TOOLS);
    });
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
      unsubscribeAuditReqs();
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
  }, [activeOrgId, user?.uid, authLoading]);

  return {
    records,
    setRecords,
    manuals,
    setManuals,
    comparacoes,
    setComparacoes,
    knowledgeList,
    setKnowledgeList,
    activeOrganization,
    setActiveOrganization,
    loadingRecords,
    loadingManuals,
    firestoreError,
    setFirestoreError,
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
    setCompetencies,
    personCompetencies,
    setPersonCompetencies,
    trainingCourses,
    setTrainingCourses,
    trainingRecords,
    setTrainingRecords,
    qualifications,
    setQualifications,
    personDocuments,
    setPersonDocuments,
    activityRequirements,
    setActivityRequirements,
    aiCompetencySuggestions,
    setAiCompetencySuggestions,
    documentosControlados,
    setDocumentosControlados,
    revisoesDocumentais,
    setRevisoesDocumentais,
    fontesExternas,
    setFontesExternas,
    solicitacoesCliente,
    setSolicitacoesCliente,
    logsVerificacaoFontes,
    setLogsVerificacaoFontes,
    evidenciasConsultaDoc,
    setEvidenciasConsultaDoc,
    clientesExternos,
    setClientesExternos,
    basesOperacionais,
    setBasesOperacionais,
    programasClientes,
    setProgramasClientes,
    controlesCentrais,
    setControlesCentrais,
    requisitosClientes,
    setRequisitosClientes,
    avaliacoesRequisitos,
    setAvaliacoesRequisitos,
    ferramentasCalibradas,
    setFerramentasCalibradas,
    smartImports,
    setSmartImports,
    templatesAprovados,
    setTemplatesAprovados,
  };
}
