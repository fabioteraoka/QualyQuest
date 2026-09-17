import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  DocumentoEvidenciaPessoa,
  AtividadeCompetenciaRequerida,
  SugestaoIACompetencia,
  UserProfile,
} from '../../types';
import {
  DEFAULT_ORGANIZATION_ID,
  OperationType,
  handleFirestoreError,
  sanitizeForFirestore,
  recordOrganizationAudit,
} from './firestore';
import {
  INITIAL_PERSONS,
  INITIAL_COMPETENCIES,
  INITIAL_TRAINING_COURSES,
  INITIAL_QUALIFICATIONS,
  INITIAL_TRAINING_RECORDS,
  INITIAL_PERSON_COMPETENCIES,
  INITIAL_PERSON_DOCUMENTS,
  INITIAL_ACTIVITY_REQUIREMENTS,
} from '../../data/initialCompetenciesData';

// ============================================================================
// 1. PESSOAS / COLABORADORES
// ============================================================================

export function subscribeToPersons(
  organizationId: string,
  callback: (persons: ColaboradorPessoa[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'persons');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_PERSONS.forEach((p) => {
              const docRef = doc(db, 'organizations', organizationId, 'persons', p.id);
              batch.set(docRef, sanitizeForFirestore({ ...p, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_PERSONS locais', e);
          }
          callback(INITIAL_PERSONS);
          return;
        }
        callback([]);
        return;
      }

      const list: ColaboradorPessoa[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as ColaboradorPessoa);
      });
      list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar persons no Firestore:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_PERSONS);
      } else {
        callback([]);
      }
    }
  );
}

export interface DependenciasPessoaResult {
  podeExcluir: boolean;
  totalTreinamentos: number;
  totalCompetencias: number;
  totalQualificacoes: number;
  totalDocumentos: number;
  totalRNCs: number;
  totalVinculos: number;
  motivosBloqueio: string[];
  detalhes: string[];
}

/**
 * Verifica se uma pessoa possui dependências e histórico vinculados no SGQ
 * Conforme RBAC 145 / EASA, a exclusão física é terminantemente proibida se houver histórico.
 */
export function verificarDependenciasPessoa(
  personId: string,
  trainingRecords: RegistroTreinamentoColaborador[] = [],
  personCompetencies: CompetenciaColaborador[] = [],
  qualifications: QualificacaoColaborador[] = [],
  documents: DocumentoEvidenciaPessoa[] = [],
  nonConformities: any[] = []
): DependenciasPessoaResult {
  const treinos = trainingRecords.filter((t) => t.colaboradorId === personId);
  const comps = personCompetencies.filter((c) => c.colaboradorId === personId);
  const quals = qualifications.filter((q) => q.colaboradorId === personId);
  const docs = documents.filter((d) => d.colaboradorId === personId);
  const rncs = nonConformities.filter(
    (nc) =>
      nc.responsavelImplementacaoId === personId ||
      nc.auditorId === personId ||
      (nc.responsavelImplementacao &&
        typeof nc.responsavelImplementacao === 'string' &&
        nc.responsavelImplementacao.toLowerCase().includes(personId.toLowerCase()))
  );

  const motivosBloqueio: string[] = [];
  if (treinos.length > 0) motivosBloqueio.push(`${treinos.length} registro(s) de treinamento concluído/em andamento`);
  if (comps.length > 0) motivosBloqueio.push(`${comps.length} competência(s) atribuída(s) na matriz`);
  if (quals.length > 0) motivosBloqueio.push(`${quals.length} habilitação(ões) ou qualificação(ões) técnica(s)`);
  if (docs.length > 0) motivosBloqueio.push(`${docs.length} documento(s) ou certificado(s) de evidência`);
  if (rncs.length > 0) motivosBloqueio.push(`${rncs.length} RNC(s) vinculada(s)`);

  return {
    podeExcluir: motivosBloqueio.length === 0,
    totalTreinamentos: treinos.length,
    totalCompetencias: comps.length,
    totalQualificacoes: quals.length,
    totalDocumentos: docs.length,
    totalRNCs: rncs.length,
    totalVinculos: motivosBloqueio.length,
    motivosBloqueio,
    detalhes: motivosBloqueio,
  };
}

export async function savePerson(
  organizationId: string,
  person: ColaboradorPessoa,
  userProfile?: UserProfile | null,
  previousPerson?: ColaboradorPessoa | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode cadastrar ou alterar colaboradores.');
  }

  const isNew = !previousPerson && !person.createdAt;
  const path = `organizations/${organizationId}/persons/${person.id}`;
  const now = new Date().toISOString();
  const payload: ColaboradorPessoa = {
    ...person,
    organizationId,
    updatedAt: now,
    createdAt: person.createdAt || now,
    criadoPor: person.criadoPor || userProfile?.displayName || 'SGQ',
    criadoPorUid: person.criadoPorUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'persons', person.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'PERSON',
      entityId: person.id,
      action: isNew ? 'CREATE' : 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: isNew
        ? `Cadastro de Colaborador: ${person.nome} (${person.matricula}) - Setor: ${person.setor}`
        : `Atualização de Colaborador: ${person.nome} (${person.matricula}) - Setor: ${person.setor}`,
      previousValue: previousPerson
        ? JSON.stringify({
            nome: previousPerson.nome,
            matricula: previousPerson.matricula,
            funcao: previousPerson.funcao,
            setor: previousPerson.setor,
            cargoOperacional: previousPerson.cargoOperacional,
            status: previousPerson.status,
            restricao: previousPerson.restricaoOperacional?.possuiRestricao,
          })
        : undefined,
      newValue: JSON.stringify({
        nome: person.nome,
        matricula: person.matricula,
        funcao: person.funcao,
        setor: person.setor,
        cargoOperacional: person.cargoOperacional,
        status: person.status,
        restricao: person.restricaoOperacional?.possuiRestricao,
      }),
      reason: isNew ? 'Cadastro inicial de colaborador no SGQ' : 'Atualização cadastral/operacional',
      origin: 'PESSOAS_COMPETENCIAS',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Inativação Lógica de Colaborador (preserva histórico e rastreabilidade integral)
 */
export async function inactivatePerson(
  organizationId: string,
  personId: string,
  motivo: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode inativar colaboradores.');
  }

  const path = `organizations/${organizationId}/persons/${personId}`;
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, 'organizations', organizationId, 'persons', personId);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        status: 'INATIVO',
        updatedAt: now,
        inativadoEm: now,
        inativadoPor: userProfile?.displayName || auth.currentUser?.displayName || 'SGQ',
        motivoInativacao: motivo || 'Inativação administrativa com preservação de histórico',
      }),
      { merge: true }
    );

    await recordOrganizationAudit(organizationId, {
      entity: 'PERSON',
      entityId: personId,
      action: 'INACTIVATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Inativação de colaborador: ID ${personId}. Motivo: ${motivo}`,
      previousValue: 'status: ATIVO',
      newValue: 'status: INATIVO',
      reason: motivo,
      origin: 'PESSOAS_COMPETENCIAS',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Reativação Lógica de Colaborador
 */
export async function reactivatePerson(
  organizationId: string,
  personId: string,
  motivo: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode reativar colaboradores.');
  }

  const path = `organizations/${organizationId}/persons/${personId}`;
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, 'organizations', organizationId, 'persons', personId);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        status: 'ATIVO',
        updatedAt: now,
        reativadoEm: now,
        reativadoPor: userProfile?.displayName || auth.currentUser?.displayName || 'SGQ',
        motivoReativacao: motivo || 'Reativação de colaborador no SGQ ativo',
      }),
      { merge: true }
    );

    await recordOrganizationAudit(organizationId, {
      entity: 'PERSON',
      entityId: personId,
      action: 'REACTIVATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Reativação de colaborador: ID ${personId}. Motivo: ${motivo}`,
      previousValue: 'status: INATIVO',
      newValue: 'status: ATIVO',
      reason: motivo,
      origin: 'PESSOAS_COMPETENCIAS',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Exclusão Física de Colaborador (Somente se não possuir qualquer dependência ou histórico)
 */
export async function deletePerson(
  organizationId: string,
  personId: string,
  userProfile?: UserProfile | null,
  motivoExclusao?: string,
  dependencias?: DependenciasPessoaResult
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão física é estritamente restrita a GESTOR_SGQ e ADMIN.');
  }

  if (dependencias && !dependencias.podeExcluir) {
    throw new Error(
      `Exclusão física bloqueada: este colaborador possui ${dependencias.motivosBloqueio.join(
        ', '
      )}. Conforme normas aeronáuticas (RBAC 145 / EASA), utilize a Inativação Lógica para preservar a rastreabilidade.`
    );
  }

  const path = `organizations/${organizationId}/persons/${personId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'persons', personId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'PERSON',
      entityId: personId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão definitiva de colaborador sem vínculos históricos: ID ${personId}`,
      reason: motivoExclusao || 'Exclusão física de cadastro órfão sem histórico vinculado',
      origin: 'PESSOAS_COMPETENCIAS',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ============================================================================
// 2. CATÁLOGO DE COMPETÊNCIAS
// ============================================================================

export function subscribeToCompetencies(
  organizationId: string,
  callback: (competencies: CompetenciaItem[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'competencies');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_COMPETENCIES.forEach((c) => {
              const docRef = doc(db, 'organizations', organizationId, 'competencies', c.id);
              batch.set(docRef, sanitizeForFirestore({ ...c, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_COMPETENCIES locais', e);
          }
          callback(INITIAL_COMPETENCIES);
          return;
        }
        callback([]);
        return;
      }

      const list: CompetenciaItem[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as CompetenciaItem);
      });
      list.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar competencies no Firestore:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_COMPETENCIES);
      } else {
        callback([]);
      }
    }
  );
}

export async function saveCompetency(
  organizationId: string,
  competency: CompetenciaItem,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode cadastrar competências.');
  }

  const path = `organizations/${organizationId}/competencies/${competency.id}`;
  const now = new Date().toISOString();
  const payload: CompetenciaItem = {
    ...competency,
    organizationId,
    updatedAt: now,
    createdAt: competency.createdAt || now,
    criadoPorUid: competency.criadoPorUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'competencies', competency.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: competency.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Competência Atualizada: ${competency.codigo} - ${competency.nome}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCompetency(
  organizationId: string,
  competencyId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/competencies/${competencyId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'competencies', competencyId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: competencyId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de competência: ${competencyId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 3. VÍNCULOS DE COMPETÊNCIA DO COLABORADOR
// ============================================================================

export function subscribeToPersonCompetencies(
  organizationId: string,
  callback: (list: CompetenciaColaborador[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'personCompetencies');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_PERSON_COMPETENCIES.forEach((pc) => {
              const docRef = doc(db, 'organizations', organizationId, 'personCompetencies', pc.id);
              batch.set(docRef, sanitizeForFirestore({ ...pc, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_PERSON_COMPETENCIES locais', e);
          }
          callback(INITIAL_PERSON_COMPETENCIES);
          return;
        }
        callback([]);
        return;
      }

      const list: CompetenciaColaborador[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as CompetenciaColaborador);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar personCompetencies:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_PERSON_COMPETENCIES);
      } else {
        callback([]);
      }
    }
  );
}

export async function savePersonCompetency(
  organizationId: string,
  item: CompetenciaColaborador,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode alterar competências.');
  }

  const path = `organizations/${organizationId}/personCompetencies/${item.id}`;
  const now = new Date().toISOString();
  const payload: CompetenciaColaborador = {
    ...item,
    organizationId,
    updatedAt: now,
    createdAt: item.createdAt || now,
    responsavelValidacaoNome: item.responsavelValidacaoNome || userProfile?.displayName || 'SGQ',
    responsavelValidacaoUid: item.responsavelValidacaoUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
    dataValidacao: item.dataValidacao || now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'personCompetencies', item.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: item.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Validação de Competência para ${item.colaboradorNome}: ${item.competenciaNome} (Nível ${item.nivelAtual})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonCompetency(
  organizationId: string,
  itemId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/personCompetencies/${itemId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'personCompetencies', itemId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: itemId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de competência atribuída: ${itemId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 4. CURSOS E PROGRAMAS DE TREINAMENTO
// ============================================================================

export function subscribeToTrainingCourses(
  organizationId: string,
  callback: (courses: CursoTreinamento[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'trainingCourses');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_TRAINING_COURSES.forEach((c) => {
              const docRef = doc(db, 'organizations', organizationId, 'trainingCourses', c.id);
              batch.set(docRef, sanitizeForFirestore({ ...c, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_TRAINING_COURSES locais', e);
          }
          callback(INITIAL_TRAINING_COURSES);
          return;
        }
        callback([]);
        return;
      }

      const list: CursoTreinamento[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as CursoTreinamento);
      });
      list.sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar trainingCourses:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_TRAINING_COURSES);
      } else {
        callback([]);
      }
    }
  );
}

export async function saveTrainingCourse(
  organizationId: string,
  course: CursoTreinamento,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode alterar cursos.');
  }

  const path = `organizations/${organizationId}/trainingCourses/${course.id}`;
  const now = new Date().toISOString();
  const payload: CursoTreinamento = {
    ...course,
    organizationId,
    updatedAt: now,
    createdAt: course.createdAt || now,
    criadoPorUid: course.criadoPorUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'trainingCourses', course.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: course.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Curso de Treinamento Atualizado: ${course.codigo} - ${course.titulo}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTrainingCourse(
  organizationId: string,
  courseId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/trainingCourses/${courseId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'trainingCourses', courseId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: courseId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão do curso de treinamento ${courseId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 5. REGISTROS DE TREINAMENTO REALIZADOS
// ============================================================================

export function subscribeToTrainingRecords(
  organizationId: string,
  callback: (records: RegistroTreinamentoColaborador[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'trainingRecords');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_TRAINING_RECORDS.forEach((r) => {
              const docRef = doc(db, 'organizations', organizationId, 'trainingRecords', r.id);
              batch.set(docRef, sanitizeForFirestore({ ...r, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_TRAINING_RECORDS locais', e);
          }
          callback(INITIAL_TRAINING_RECORDS);
          return;
        }
        callback([]);
        return;
      }

      const list: RegistroTreinamentoColaborador[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as RegistroTreinamentoColaborador);
      });
      list.sort((a, b) => (b.dataRealizacao || '').localeCompare(a.dataRealizacao || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar trainingRecords:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_TRAINING_RECORDS);
      } else {
        callback([]);
      }
    }
  );
}

export async function saveTrainingRecord(
  organizationId: string,
  record: RegistroTreinamentoColaborador,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode lançar treinamentos.');
  }

  const path = `organizations/${organizationId}/trainingRecords/${record.id}`;
  const now = new Date().toISOString();
  const payload: RegistroTreinamentoColaborador = {
    ...record,
    organizationId,
    updatedAt: now,
    createdAt: record.createdAt || now,
    validadoPorSGQNome: record.validadoPorSGQNome || userProfile?.displayName || 'SGQ',
    validadoPorSGQUid: record.validadoPorSGQUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
    dataValidacaoSGQ: record.dataValidacaoSGQ || now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'trainingRecords', record.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: record.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Registro de Treinamento: ${record.treinamentoTitulo} para ${record.colaboradorNome} (${record.resultado})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTrainingRecord(
  organizationId: string,
  recordId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/trainingRecords/${recordId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'trainingRecords', recordId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: recordId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão do registro de treinamento ${recordId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 6. QUALIFICAÇÕES, HABILITAÇÕES E AUTORIZAÇÕES (CHTs, RTS, RII, NDT)
// ============================================================================

export function subscribeToQualifications(
  organizationId: string,
  callback: (qualifications: QualificacaoColaborador[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'qualifications');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_QUALIFICATIONS.forEach((q) => {
              const docRef = doc(db, 'organizations', organizationId, 'qualifications', q.id);
              batch.set(docRef, sanitizeForFirestore({ ...q, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_QUALIFICATIONS locais', e);
          }
          callback(INITIAL_QUALIFICATIONS);
          return;
        }
        callback([]);
        return;
      }

      const list: QualificacaoColaborador[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as QualificacaoColaborador);
      });
      list.sort((a, b) => (a.dataValidade || '').localeCompare(b.dataValidade || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar qualifications:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_QUALIFICATIONS);
      } else {
        callback([]);
      }
    }
  );
}

export async function saveQualification(
  organizationId: string,
  qualification: QualificacaoColaborador,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode alterar qualificações.');
  }

  const path = `organizations/${organizationId}/qualifications/${qualification.id}`;
  const now = new Date().toISOString();
  const payload: QualificacaoColaborador = {
    ...qualification,
    organizationId,
    updatedAt: now,
    createdAt: qualification.createdAt || now,
    responsavelValidacaoNome: qualification.responsavelValidacaoNome || userProfile?.displayName || 'SGQ',
    responsavelValidacaoUid: qualification.responsavelValidacaoUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
    dataValidacao: qualification.dataValidacao || now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'qualifications', qualification.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: qualification.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Qualificação de ${qualification.colaboradorNome}: ${qualification.titulo} (${qualification.numeroRegistro}) - Status: ${qualification.status}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteQualification(
  organizationId: string,
  qualificationId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/qualifications/${qualificationId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'qualifications', qualificationId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: qualificationId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de qualificação ${qualificationId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 7. DOCUMENTOS E EVIDÊNCIAS DE PESSOAS
// ============================================================================

export function subscribeToPersonDocuments(
  organizationId: string,
  callback: (docs: DocumentoEvidenciaPessoa[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'personDocuments');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_PERSON_DOCUMENTS.forEach((d) => {
              const docRef = doc(db, 'organizations', organizationId, 'personDocuments', d.id);
              batch.set(docRef, sanitizeForFirestore({ ...d, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_PERSON_DOCUMENTS locais', e);
          }
          callback(INITIAL_PERSON_DOCUMENTS);
          return;
        }
        callback([]);
        return;
      }

      const list: DocumentoEvidenciaPessoa[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as DocumentoEvidenciaPessoa);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar personDocuments:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_PERSON_DOCUMENTS);
      } else {
        callback([]);
      }
    }
  );
}

export async function savePersonDocument(
  organizationId: string,
  docItem: DocumentoEvidenciaPessoa,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode registrar documentos.');
  }

  const path = `organizations/${organizationId}/personDocuments/${docItem.id}`;
  const now = new Date().toISOString();
  const payload: DocumentoEvidenciaPessoa = {
    ...docItem,
    organizationId,
    updatedAt: now,
    createdAt: docItem.createdAt || now,
    registradoPorUid: docItem.registradoPorUid || userProfile?.uid || auth.currentUser?.uid || 'sgq',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'personDocuments', docItem.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: docItem.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Documento de ${docItem.colaboradorNome}: ${docItem.titulo} (${docItem.tipoDocumento})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePersonDocument(
  organizationId: string,
  docId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/personDocuments/${docId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'personDocuments', docId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: docId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de documento de evidência ${docId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 8. ATIVIDADES E REQUISITOS OPERACIONAIS (MATRIZ ATIVIDADE x COMPETÊNCIA)
// ============================================================================

export function subscribeToActivityRequirements(
  organizationId: string,
  callback: (activities: AtividadeCompetenciaRequerida[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'activityRequirements');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_ACTIVITY_REQUIREMENTS.forEach((a) => {
              const docRef = doc(db, 'organizations', organizationId, 'activityRequirements', a.id);
              batch.set(docRef, sanitizeForFirestore({ ...a, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_ACTIVITY_REQUIREMENTS locais', e);
          }
          callback(INITIAL_ACTIVITY_REQUIREMENTS);
          return;
        }
        callback([]);
        return;
      }

      const list: AtividadeCompetenciaRequerida[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as AtividadeCompetenciaRequerida);
      });
      list.sort((a, b) => (a.codigoAtividade || '').localeCompare(b.codigoAtividade || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar activityRequirements:', err?.message);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_ACTIVITY_REQUIREMENTS);
      } else {
        callback([]);
      }
    }
  );
}

export async function saveActivityRequirement(
  organizationId: string,
  activity: AtividadeCompetenciaRequerida,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode alterar atividades.');
  }

  const path = `organizations/${organizationId}/activityRequirements/${activity.id}`;
  const now = new Date().toISOString();
  const payload: AtividadeCompetenciaRequerida = {
    ...activity,
    organizationId,
    updatedAt: now,
    createdAt: activity.createdAt || now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'activityRequirements', activity.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: activity.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Atividade e Requisitos: ${activity.codigoAtividade} - ${activity.nomeAtividade}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteActivityRequirement(
  organizationId: string,
  activityId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/activityRequirements/${activityId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'activityRequirements', activityId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'ORGANIZATION' as any,
      entityId: activityId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de requisito de atividade ${activityId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 9. SUGESTÕES DE IA (GOVERNANÇA COM AVALIAÇÃO HUMANA)
// ============================================================================

export function subscribeToAiCompetencySuggestions(
  organizationId: string,
  callback: (suggestions: SugestaoIACompetencia[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'aiCompetencySuggestions');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: SugestaoIACompetencia[] = [];
      snapshot.forEach((snap) => {
        list.push({ id: snap.id, ...snap.data() } as SugestaoIACompetencia);
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar aiCompetencySuggestions:', err?.message);
      callback([]);
    }
  );
}

export async function saveAiCompetencySuggestion(
  organizationId: string,
  suggestion: SugestaoIACompetencia,
  userProfile?: UserProfile | null
): Promise<void> {
  const path = `organizations/${organizationId}/aiCompetencySuggestions/${suggestion.id}`;
  const now = new Date().toISOString();
  const payload: SugestaoIACompetencia = {
    ...suggestion,
    organizationId,
    createdAt: suggestion.createdAt || now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'aiCompetencySuggestions', suggestion.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    if (suggestion.decisaoHumana !== 'PENDENTE') {
      await recordOrganizationAudit(organizationId, {
        entity: 'ORGANIZATION' as any,
        entityId: suggestion.id,
        action: 'UPDATE',
        changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
        changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
        summary: `Decisão Humana em Sugestão de Competência: ${suggestion.decisaoHumana} - ${suggestion.titulo}`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
