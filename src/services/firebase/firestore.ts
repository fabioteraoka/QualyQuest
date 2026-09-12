import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  UserProfile,
  SystemDiagnosticRecord,
  UserRole,
  UserStatus,
  UserInvitation,
  NCRecord,
  ManualRecord,
  OrganizationRecord,
  OrganizationConfiguration,
  OrganizationAuditEntry,
  ComparacaoRNCRecord,
  ValidatedKnowledgeRecord,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria,
} from '../../types';
import { INITIAL_RECORDS } from '../../data/initialRecords';
import { INITIAL_MANUALS } from '../../data/initialManuals';
import { 
  INITIAL_EXTERNAL_AUDITS, 
  INITIAL_AUDIT_FINDINGS, 
  INITIAL_AUDIT_LESSONS 
} from '../../data/initialAudits';

export const DEFAULT_ORGANIZATION_ID = 'org_impacto_aviation';

export const DEFAULT_ORG_CONFIG: OrganizationConfiguration = {
  setores: [
    'Qualidade / SGQ',
    'Manutenção / Calibração',
    'Engenharia / Publicações Técnicas',
    'Operações de Linha / Base',
    'Suprimentos / Almoxarifado',
    'Treinamento / RH Operacional',
    'Segurança Operacional (SGSO)',
  ],
  categorias: [
    'Calibração e Metrologia',
    'Controle de Documentos',
    'Treinamento e Qualificação',
    'Armazenamento e Segregação',
    'Procedimentos Operacionais',
    'Infraestrutura e Ferramentas',
    'Segurança Operacional (SGSO)',
  ],
  slasInternos: {
    p1Horas: 24,
    p2Horas: 72,
    p3Dias: 15,
    p4Dias: 30,
  },
  identidadeVisual: {
    corPrimaria: '#1e3a8a',
    siglaAeronautica: 'MRO',
    nomeExibicaoCurto: 'MRO SGQ',
  },
  parametrosApresentacao: {
    rodapePersonalizado: 'QualiGest SGQ • Garantia da Qualidade Aeronáutica',
    responsavelQualidadePadrao: 'Gestor da Garantia da Qualidade',
    cargoResponsavelPadrao: 'Responsável Técnico / SGQ',
  },
  checklistConfiguracao: {
    organizacaoConfigurada: true,
    identidadeVisualConfigurada: false,
    setoresCadastrados: true,
    usuariosCadastrados: false,
    responsaveisDefinidos: false,
    parametrosRevisados: false,
    primeiroManualInserido: false,
    primeiroRNCCadastrado: false,
    equipeOrientada: false,
  },
};

export const IMPACTO_ORG_CONFIG: OrganizationConfiguration = {
  setores: [
    'REC - Manutenção / Calibração',
    'Qualidade',
    'Engenharia / Publicações Técnicas',
    'Operações de Manutenção',
    'Suprimentos / Almoxarifado',
    'Treinamento / RH Operacional',
  ],
  categorias: [
    'Calibração e Metrologia',
    'Controle de Documentos',
    'Treinamento e Qualificação',
    'Armazenamento e Segregação',
    'Procedimentos Operacionais',
    'Infraestrutura e Ferramentas',
    'Segurança Operacional (SGSO)',
  ],
  slasInternos: {
    p1Horas: 24,
    p2Horas: 72,
    p3Dias: 15,
    p4Dias: 30,
  },
  identidadeVisual: {
    corPrimaria: '#1b2e88',
    siglaAeronautica: 'IMP',
    nomeExibicaoCurto: 'Impacto MRO',
  },
  parametrosApresentacao: {
    rodapePersonalizado: 'Impacto Aviation MRO • Sistema de Garantia da Qualidade & SGQ Aeronáutico',
    responsavelQualidadePadrao: 'Diretoria / Gestão SGQ',
    cargoResponsavelPadrao: 'Gestor da Garantia da Qualidade',
  },
  checklistConfiguracao: {
    organizacaoConfigurada: true,
    identidadeVisualConfigurada: true,
    setoresCadastrados: true,
    usuariosCadastrados: true,
    responsaveisDefinidos: true,
    parametrosRevisados: true,
    primeiroManualInserido: true,
    primeiroRNCCadastrado: true,
    equipeOrientada: true,
  },
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// 1. ORGANIZATIONS (TENANTS) SERVICE (organizations/{orgId})
// ----------------------------------------------------

export async function ensureOrganization(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  name?: string
): Promise<OrganizationRecord> {
  if (!orgId || !orgId.trim()) {
    throw new Error('ID de organização inválido ou não fornecido para ensureOrganization');
  }
  const cleanOrgId = orgId.trim();
  const path = `organizations/${cleanOrgId}`;
  try {
    const docRef = doc(db, 'organizations', cleanOrgId);
    const snap = await getDoc(docRef);
    const isImpacto = cleanOrgId === DEFAULT_ORGANIZATION_ID;
    const defaultName = isImpacto ? 'Impacto Aviation MRO' : 'Organização SGQ';
    const fallbackConfig = isImpacto ? IMPACTO_ORG_CONFIG : DEFAULT_ORG_CONFIG;

    if (snap.exists()) {
      const d = snap.data();
      return {
        id: d.id || cleanOrgId,
        name: d.name || name || defaultName,
        legalName: d.legalName || (isImpacto ? 'Impacto Aviation MRO Ltda.' : undefined),
        logoUrl: d.logoUrl || undefined,
        language: d.language || 'pt-BR',
        timezone: d.timezone || 'America/Sao_Paulo',
        status: d.status || 'ACTIVE',
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt || new Date().toISOString(),
        createdByUserUid: d.createdByUserUid,
        createdByUserEmail: d.createdByUserEmail,
        configuration: d.configuration || fallbackConfig,
        isDemoTenant: d.isDemoTenant || false,
      };
    }

    const now = new Date().toISOString();
    const newOrg: OrganizationRecord = {
      id: cleanOrgId,
      name: name || defaultName,
      legalName: isImpacto ? 'Impacto Aviation MRO Ltda.' : undefined,
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdByUserUid: auth.currentUser?.uid || 'system',
      createdByUserEmail: auth.currentUser?.email || 'system@qualigest',
      configuration: fallbackConfig,
      isDemoTenant: false,
    };

    await setDoc(docRef, sanitizeForFirestore(newOrg));
    return newOrg;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getOrganization(orgId: string): Promise<OrganizationRecord | null> {
  const path = `organizations/${orgId}`;
  try {
    const docRef = doc(db, 'organizations', orgId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const d = snap.data();
    const isImpacto = orgId === DEFAULT_ORGANIZATION_ID;
    const fallbackConfig = isImpacto ? IMPACTO_ORG_CONFIG : DEFAULT_ORG_CONFIG;

    return {
      id: d.id || orgId,
      name: d.name || (isImpacto ? 'Impacto Aviation MRO' : 'Organização SGQ'),
      legalName: d.legalName || undefined,
      logoUrl: d.logoUrl || undefined,
      language: d.language || 'pt-BR',
      timezone: d.timezone || 'America/Sao_Paulo',
      status: d.status || 'ACTIVE',
      createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt || '',
      updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt || '',
      createdByUserUid: d.createdByUserUid,
      createdByUserEmail: d.createdByUserEmail,
      configuration: d.configuration || fallbackConfig,
      isDemoTenant: d.isDemoTenant || false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToOrganization(
  orgId: string,
  callback: (org: OrganizationRecord | null) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'organizations', orgId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const d = snap.data();
      const isImpacto = orgId === DEFAULT_ORGANIZATION_ID;
      const fallbackConfig = isImpacto ? IMPACTO_ORG_CONFIG : DEFAULT_ORG_CONFIG;

      const org: OrganizationRecord = {
        id: d.id || orgId,
        name: d.name || (isImpacto ? 'Impacto Aviation MRO' : 'Organização SGQ'),
        legalName: d.legalName || undefined,
        logoUrl: d.logoUrl || undefined,
        language: d.language || 'pt-BR',
        timezone: d.timezone || 'America/Sao_Paulo',
        status: d.status || 'ACTIVE',
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt || '',
        updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt || '',
        createdByUserUid: d.createdByUserUid,
        createdByUserEmail: d.createdByUserEmail,
        configuration: d.configuration || fallbackConfig,
        isDemoTenant: d.isDemoTenant || false,
      };
      callback(org);
    },
    (err) => {
      console.warn(`Sincronização em tempo real da organização ${orgId}:`, err?.message);
      if (onError) onError(err);
    }
  );
}

export async function updateOrganization(
  orgId: string,
  updates: Partial<OrganizationRecord>
): Promise<void> {
  const path = `organizations/${orgId}`;
  try {
    const docRef = doc(db, 'organizations', orgId);
    const payload = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(docRef, payload);

    await recordOrganizationAudit(orgId, {
      entity: 'ORGANIZATION',
      entityId: orgId,
      action: 'UPDATE',
      changedByUid: auth.currentUser?.uid || 'system',
      changedByEmail: auth.currentUser?.email || 'system@qualigest',
      summary: `Configurações da organização ${orgId} atualizadas.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createOrganizationWithAdmin(params: {
  orgId: string;
  name: string;
  legalName?: string;
  logoUrl?: string;
  timezone?: string;
  language?: string;
  adminName: string;
  adminEmail: string;
  adminUid?: string;
  configuration?: Partial<OrganizationConfiguration>;
  isDemoTenant?: boolean;
}): Promise<{ organization: OrganizationRecord; adminProfile?: UserProfile }> {
  const {
    orgId,
    name,
    legalName,
    logoUrl,
    timezone = 'America/Sao_Paulo',
    language = 'pt-BR',
    adminName,
    adminEmail,
    adminUid,
    configuration,
    isDemoTenant = false,
  } = params;

  const path = `organizations/${orgId}`;
  try {
    const now = new Date().toISOString();
    
    // Merge provided config with standard defaults
    const mergedConfig: OrganizationConfiguration = {
      ...DEFAULT_ORG_CONFIG,
      ...configuration,
      setores: configuration?.setores?.length ? configuration.setores : DEFAULT_ORG_CONFIG.setores,
      categorias: configuration?.categorias?.length ? configuration.categorias : DEFAULT_ORG_CONFIG.categorias,
      slasInternos: {
        ...DEFAULT_ORG_CONFIG.slasInternos,
        ...(configuration?.slasInternos || {}),
      },
      identidadeVisual: {
        ...DEFAULT_ORG_CONFIG.identidadeVisual,
        ...(configuration?.identidadeVisual || {}),
        siglaAeronautica: configuration?.identidadeVisual?.siglaAeronautica || name.substring(0, 3).toUpperCase(),
      },
      parametrosApresentacao: {
        ...DEFAULT_ORG_CONFIG.parametrosApresentacao,
        rodapePersonalizado: `${name} • Sistema de Gestão e Garantia da Qualidade SGQ`,
        responsavelQualidadePadrao: adminName,
        ...(configuration?.parametrosApresentacao || {}),
      },
      checklistConfiguracao: {
        organizacaoConfigurada: true,
        identidadeVisualConfigurada: Boolean(logoUrl || configuration?.identidadeVisual?.corPrimaria),
        setoresCadastrados: true,
        usuariosCadastrados: true,
        responsaveisDefinidos: true,
        parametrosRevisados: true,
        primeiroManualInserido: false,
        primeiroRNCCadastrado: false,
        equipeOrientada: false,
      },
    };

    const newOrg: OrganizationRecord = {
      id: orgId,
      name,
      legalName,
      logoUrl,
      language,
      timezone,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdByUserUid: adminUid || auth.currentUser?.uid || 'onboarding',
      createdByUserEmail: adminEmail,
      configuration: mergedConfig,
      isDemoTenant,
    };

    // 1. Persist Organization
    const orgDocRef = doc(db, 'organizations', orgId);
    await setDoc(orgDocRef, sanitizeForFirestore(newOrg));

    // 2. Persist Initial Admin User Profile if UID is available
    let adminProfile: UserProfile | undefined;
    if (adminUid) {
      const userDocRef = doc(db, 'users', adminUid);
      adminProfile = {
        uid: adminUid,
        email: adminEmail,
        displayName: adminName,
        role: 'ADMIN',
        organizationId: orgId,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userDocRef, sanitizeForFirestore(adminProfile));
    }

    // 3. Initial Audit Trail Entry
    await recordOrganizationAudit(orgId, {
      entity: 'ORGANIZATION',
      entityId: orgId,
      action: 'CREATE',
      changedByUid: adminUid || auth.currentUser?.uid || 'onboarding',
      changedByEmail: adminEmail,
      summary: `Organização "${name}" (${orgId}) criada com sucesso e isolamento multi-tenant ativo.`,
    });

    return { organization: newOrg, adminProfile };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listOrganizations(): Promise<OrganizationRecord[]> {
  const path = 'organizations';
  try {
    const colRef = collection(db, 'organizations');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => {
      const data = d.data();
      const isImpacto = d.id === DEFAULT_ORGANIZATION_ID;
      const fallbackConfig = isImpacto ? IMPACTO_ORG_CONFIG : DEFAULT_ORG_CONFIG;
      return {
        id: data.id || d.id,
        name: data.name || (isImpacto ? 'Impacto Aviation MRO' : 'Organização SGQ'),
        legalName: data.legalName,
        logoUrl: data.logoUrl,
        language: data.language || 'pt-BR',
        timezone: data.timezone || 'America/Sao_Paulo',
        status: data.status || 'ACTIVE',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || '',
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
        createdByUserUid: data.createdByUserUid,
        createdByUserEmail: data.createdByUserEmail,
        configuration: data.configuration || fallbackConfig,
        isDemoTenant: data.isDemoTenant || false,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ----------------------------------------------------
// 2. USER PROFILES SERVICE (users/{uid})
// ----------------------------------------------------

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    const rawStatus = data.status || (data.ativo === false ? 'INATIVO' : 'ATIVO');
    const normalizedStatus: UserStatus = (rawStatus === 'ACTIVE' ? 'ATIVO' : rawStatus === 'INACTIVE' ? 'INATIVO' : rawStatus) as UserStatus;

    return {
      uid: data.uid || uid,
      email: data.email || '',
      displayName: data.displayName || '',
      role: (data.role as UserRole) || 'CONSULTA',
      organizationId: data.organizationId || '',
      setor: data.setor || data.sectorId || '',
      status: normalizedStatus || 'PENDENTE',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
      lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate().toISOString() : data.lastLoginAt,
      invitationId: data.invitationId || '',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'users', uid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      const rawStatus = data.status || (data.ativo === false ? 'INATIVO' : 'ATIVO');
      const normalizedStatus: UserStatus = (rawStatus === 'ACTIVE' ? 'ATIVO' : rawStatus === 'INACTIVE' ? 'INATIVO' : rawStatus) as UserStatus;

      const profile: UserProfile = {
        uid: data.uid || uid,
        email: data.email || '',
        displayName: data.displayName || '',
        role: (data.role as UserRole) || 'CONSULTA',
        organizationId: data.organizationId || '',
        setor: data.setor || data.sectorId || '',
        status: normalizedStatus || 'PENDENTE',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate().toISOString() : data.lastLoginAt,
        invitationId: data.invitationId || '',
      };
      callback(profile);
    },
    (err) => {
      console.warn(`Sincronização em tempo real do perfil do usuário ${uid}:`, err?.message);
      if (onError) onError(err);
    }
  );
}

// Helper to remove any undefined properties recursively to ensure clean Firestore serialization
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
    const res: any = {};
    for (const key of Object.keys(data)) {
      const val = (data as any)[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res;
  }
  return data;
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName?: string,
  organizationId: string = ''
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const existing = await getUserProfile(uid);
    const now = new Date().toISOString();
    if (existing) {
      // Atualiza data do último acesso de forma não bloqueante
      try {
        const docRef = doc(db, 'users', uid);
        await updateDoc(docRef, {
          lastLoginAt: now,
        });
      } catch {
        // não bloqueante
      }
      return existing;
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const isProjectOwner = cleanEmail === 'fteraoka@gmail.com';

    // 1. Verifica se há convite pendente emitido pela administração para este e-mail
    let matchedInvitation: UserInvitation | null = null;
    if (cleanEmail) {
      try {
        const invQuery = query(
          collection(db, 'userInvitations'),
          where('email', '==', cleanEmail),
          where('status', '==', 'PENDENTE')
        );
        const invSnap = await getDocs(invQuery);
        if (!invSnap.empty) {
          const invDoc = invSnap.docs[0];
          matchedInvitation = { id: invDoc.id, ...invDoc.data() } as UserInvitation;
        }
      } catch (invErr) {
        console.warn('Verificação de convite pré-existente (não-bloqueante):', invErr);
      }
    }

    let finalOrgId = '';
    let finalRole: UserRole = 'CONSULTA';
    let finalSector = '';
    let finalStatus: UserStatus = 'PENDENTE';

    if (matchedInvitation) {
      // Caso A — Possui convite/vínculo válido da organização:
      finalOrgId = matchedInvitation.organizationId;
      finalRole = matchedInvitation.role;
      finalSector = matchedInvitation.setor || '';
      finalStatus = 'ATIVO';

      try {
        const invDocRef = doc(db, 'userInvitations', matchedInvitation.id);
        await updateDoc(invDocRef, {
          status: 'ACEITO',
          acceptedAt: now,
          acceptedByUid: uid,
          acceptedByUserUid: uid,
          acceptedByEmail: cleanEmail,
          updatedAt: now,
        });

        await recordOrganizationAudit(finalOrgId, {
          entity: 'USER',
          entityId: uid,
          action: 'CREATE',
          changedByUid: uid,
          changedByEmail: cleanEmail,
          summary: `Usuário ${displayName || cleanEmail} ingressou na organização via convite (${matchedInvitation.role}, setor: ${matchedInvitation.setor || 'N/A'}).`,
          details: JSON.stringify({
            invitationId: matchedInvitation.id,
            role: matchedInvitation.role,
            setor: matchedInvitation.setor,
            code: matchedInvitation.code,
          }),
        });
      } catch (markErr) {
        console.warn('Aviso ao marcar convite como aceito:', markErr);
      }
    } else if (isProjectOwner) {
      // Caso Piloto / Admin Fundador: vincula à organização piloto com perfil ADMIN
      finalOrgId = organizationId || DEFAULT_ORGANIZATION_ID;
      finalRole = 'ADMIN';
      finalSector = 'Qualidade';
      finalStatus = 'ATIVO';

      try {
        await ensureOrganization(finalOrgId);
      } catch (orgErr) {
        console.warn('ensureOrganization não bloqueante:', orgErr);
      }
    } else if (organizationId) {
      // Se fornecido explicitamente pela aplicação
      finalOrgId = organizationId;
      finalRole = 'CONSULTA';
      finalStatus = 'PENDENTE';
    } else {
      // Caso B — Usuário comum sem convite:
      // Conta criada identificando a pessoa, MAS NÃO cria organização corporativa indevidamente.
      finalOrgId = '';
      finalRole = 'CONSULTA';
      finalStatus = 'PENDENTE';
    }

    const profileData: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: displayName || (cleanEmail.split('@')[0] || 'Usuário SGQ'),
      role: finalRole,
      organizationId: finalOrgId,
      setor: finalSector,
      status: finalStatus,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      invitationId: matchedInvitation?.id || '',
    };

    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, sanitizeForFirestore(profileData));

    return profileData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfile(uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'organizationId' | 'role' | 'status' | 'setor'>>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Real-time subscription to users belonging to a specific organization.
 */
export function subscribeToOrganizationUsers(
  orgId: string,
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!orgId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, 'users'), where('organizationId', '==', orgId));
  return onSnapshot(
    q,
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        users.push({
          uid: docSnap.id,
          email: d.email || '',
          displayName: d.displayName || d.email || 'Usuário',
          role: (d.role as UserRole) || 'CONSULTA',
          organizationId: d.organizationId || '',
          setor: d.setor || d.sectorId || '',
          status: (d.status as UserStatus) || 'ATIVO',
          createdAt: d.createdAt || '',
          updatedAt: d.updatedAt || '',
          lastLoginAt: d.lastLoginAt || '',
          createdByUid: d.createdByUid || '',
          createdByEmail: d.createdByEmail || '',
        });
      });
      // Ordena por nome
      users.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
      onUpdate(users);
    },
    (err) => {
      console.warn('Subscription to organization users warning:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Updates a user's role in the organization with audit trail.
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      role,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Updates a user's status (ACTIVE / INACTIVE / BLOQUEADO) in the organization.
 */
export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      status,
      ativo: status === 'ACTIVE' || status === 'ATIVO',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Atualiza perfil e setor de um usuário com validações e gravação imutável no Audit Trail.
 */
export async function updateUserRoleAndSector(
  targetUid: string,
  targetUserEmail: string,
  newRole: UserRole,
  newSector: string,
  actorProfile: UserProfile | null,
  orgId: string
): Promise<void> {
  if (actorProfile?.uid === targetUid && actorProfile?.role !== 'ADMIN') {
    throw new Error('Segurança: Você não possui autorização para alterar seu próprio perfil.');
  }

  const userRef = doc(db, 'users', targetUid);
  const currentSnap = await getDoc(userRef);
  const currentData = currentSnap.data();

  const oldRole = currentData?.role || 'N/A';
  const oldSector = currentData?.setor || 'N/A';

  // Proteção do último Administrador ativo da organização contra rebaixamento
  if ((oldRole === 'ADMIN' || oldRole === 'ADMINISTRADOR') && newRole !== 'ADMIN' && newRole !== 'ADMINISTRADOR') {
    const usersQuery = query(collection(db, 'users'), where('organizationId', '==', orgId));
    const usersSnap = await getDocs(usersQuery);
    const activeAdmins = usersSnap.docs.filter((d) => {
      const u = d.data();
      const isActive = u.status === 'ATIVO' || u.status === 'ACTIVE';
      const isAdmin = u.role === 'ADMIN' || u.role === 'ADMINISTRADOR';
      return isActive && isAdmin && d.id !== targetUid;
    });
    if (activeAdmins.length === 0) {
      throw new Error('Operação bloqueada: Não é permitido alterar o perfil do único Administrador ativo da organização.');
    }
  }

  await updateDoc(userRef, {
    role: newRole,
    setor: newSector,
    updatedAt: new Date().toISOString(),
  });

  await recordOrganizationAudit(orgId, {
    entity: 'USER',
    entityId: targetUid,
    action: 'UPDATE',
    changedByUid: actorProfile?.uid || auth.currentUser?.uid || 'admin',
    changedByEmail: actorProfile?.email || auth.currentUser?.email || 'admin@qualigest',
    summary: `Alteração de perfil/setor do usuário ${targetUserEmail}. Perfil: ${oldRole} → ${newRole} | Setor: ${oldSector} → ${newSector}.`,
    details: JSON.stringify({
      targetUid,
      targetEmail: targetUserEmail,
      oldRole,
      newRole,
      oldSector,
      newSector,
    }),
  });
}

/**
 * Modifica o status da conta do usuário (ATIVO, INATIVO, BLOQUEADO) com justificativa e Audit Trail.
 */
export async function setUserAccountStatus(
  targetUid: string,
  targetUserEmail: string,
  newStatus: UserStatus,
  reason: string,
  actorProfile: UserProfile | null,
  orgId: string
): Promise<void> {
  if (actorProfile?.uid === targetUid) {
    throw new Error('Segurança: Você não pode inativar ou bloquear sua própria conta.');
  }

  const userRef = doc(db, 'users', targetUid);
  const currentSnap = await getDoc(userRef);
  const currentData = currentSnap.data();
  const oldStatus = currentData?.status || 'ATIVO';

  // Proteção do último Administrador ativo da organização contra bloqueio/inativação
  if ((newStatus === 'INATIVO' || newStatus === 'BLOQUEADO') && (currentData?.role === 'ADMIN' || currentData?.role === 'ADMINISTRADOR')) {
    const usersQuery = query(collection(db, 'users'), where('organizationId', '==', orgId));
    const usersSnap = await getDocs(usersQuery);
    const activeAdmins = usersSnap.docs.filter((d) => {
      const u = d.data();
      const isActive = u.status === 'ATIVO' || u.status === 'ACTIVE';
      const isAdmin = u.role === 'ADMIN' || u.role === 'ADMINISTRADOR';
      return isActive && isAdmin && d.id !== targetUid;
    });
    if (activeAdmins.length === 0) {
      throw new Error('Operação bloqueada: Não é permitido inativar ou bloquear o único Administrador ativo da organização.');
    }
  }

  await updateDoc(userRef, {
    status: newStatus,
    ativo: newStatus === 'ATIVO' || newStatus === 'ACTIVE',
    updatedAt: new Date().toISOString(),
  });

  const actionName = newStatus === 'BLOQUEADO' ? 'BLOQUEIO_USUARIO' : newStatus === 'INATIVO' ? 'INATIVACAO_USUARIO' : 'ATIVACAO_USUARIO';

  await recordOrganizationAudit(orgId, {
    entity: 'USER',
    entityId: targetUid,
    action: 'STATUS_CHANGE',
    changedByUid: actorProfile?.uid || auth.currentUser?.uid || 'admin',
    changedByEmail: actorProfile?.email || auth.currentUser?.email || 'admin@qualigest',
    summary: `${actionName}: Status da conta ${targetUserEmail} alterado de ${oldStatus} para ${newStatus}. Motivo: ${reason || 'Ação administrativa'}.`,
    details: JSON.stringify({
      targetUid,
      targetEmail: targetUserEmail,
      oldStatus,
      newStatus,
      reason,
    }),
  });
}

/**
 * Criação de Convite de Usuário para ingresso na Organização (Fase 11)
 */
export async function createUserInvitation(
  orgId: string,
  data: {
    email: string;
    nome?: string;
    role: UserRole;
    setor?: string;
    notas?: string;
  },
  actorProfile?: UserProfile | null,
  orgName?: string
): Promise<UserInvitation> {
  const cleanEmail = data.email.toLowerCase().trim();

  // 1. Validação: Impede convidar usuário que já seja membro ativo desta organização
  try {
    const usersQuery = query(collection(db, 'users'), where('organizationId', '==', orgId));
    const usersSnap = await getDocs(usersQuery);
    const existingMember = usersSnap.docs.find((d) => (d.data().email || '').toLowerCase().trim() === cleanEmail);
    if (existingMember) {
      const uData = existingMember.data();
      if (uData.status === 'ATIVO' || uData.status === 'ACTIVE') {
        throw new Error(`O usuário ${cleanEmail} já é membro ativo desta organização com o perfil ${uData.role || 'definido'}.`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('já é membro')) throw err;
  }

  // 2. Validação: Impede duplicar convite pendente para o mesmo e-mail na organização
  try {
    const existingInvQuery = query(
      collection(db, 'userInvitations'),
      where('organizationId', '==', orgId),
      where('email', '==', cleanEmail),
      where('status', '==', 'PENDENTE')
    );
    const existingInvSnap = await getDocs(existingInvQuery);
    if (!existingInvSnap.empty) {
      const prev = existingInvSnap.docs[0].data() as UserInvitation;
      throw new Error(`Já existe um convite pendente para ${cleanEmail} com o código "${prev.code}". Você pode reenviar ou cancelar o convite existente.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Já existe um convite')) throw err;
  }

  const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const prefix = orgId.replace('org_', '').substring(0, 3).toUpperCase() || 'QG';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const code = `${prefix}-${randomNum}`;
  const now = new Date().toISOString();

  const invitation: UserInvitation = {
    id: invitationId,
    organizationId: orgId,
    organizationName: orgName || 'QualiGest SGQ',
    email: cleanEmail,
    nome: data.nome?.trim() || '',
    role: data.role,
    setor: data.setor || '',
    code,
    status: 'PENDENTE',
    createdByUid: actorProfile?.uid || auth.currentUser?.uid || 'admin',
    createdByEmail: actorProfile?.email || auth.currentUser?.email || 'admin@qualigest',
    createdAt: now,
    notas: data.notas || '',
  };

  const invRef = doc(db, 'userInvitations', invitationId);
  await setDoc(invRef, sanitizeForFirestore(invitation));

  await recordOrganizationAudit(orgId, {
    entity: 'USER',
    entityId: invitationId,
    action: 'CREATE',
    changedByUid: invitation.createdByUid,
    changedByEmail: invitation.createdByEmail,
    summary: `Convite de acesso gerado para ${cleanEmail} com perfil ${data.role} (Setor: ${data.setor || 'N/A'}, Código: ${code}).`,
    details: JSON.stringify({ email: cleanEmail, role: data.role, setor: data.setor, code }),
  });

  return invitation;
}

/**
 * Assinatura em tempo real aos convites emitidos para uma organização.
 */
export function subscribeToOrganizationInvitations(
  orgId: string,
  onUpdate: (invitations: UserInvitation[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!orgId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, 'userInvitations'), where('organizationId', '==', orgId));
  return onSnapshot(
    q,
    (snap) => {
      const list: UserInvitation[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserInvitation);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Aviso na sincronização de convites:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Busca convites pendentes associados ao e-mail do usuário autenticado.
 */
export async function getPendingInvitationsForEmail(email: string): Promise<UserInvitation[]> {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail) return [];
  try {
    const q = query(
      collection(db, 'userInvitations'),
      where('email', '==', cleanEmail),
      where('status', '==', 'PENDENTE')
    );
    const snap = await getDocs(q);
    const list: UserInvitation[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as UserInvitation);
    });
    return list;
  } catch (err) {
    console.warn('Erro ao consultar convites por email:', err);
    return [];
  }
}

/**
 * Aceitação de convite por código ou ID pelo próprio usuário logado.
 */
export async function acceptUserInvitation(
  invitationIdOrCode: string,
  userUid: string,
  userEmail: string,
  displayName?: string
): Promise<{ success: boolean; message: string; invitation?: UserInvitation }> {
  const cleanInput = invitationIdOrCode.trim().toUpperCase();
  const cleanEmail = userEmail.toLowerCase().trim();

  let targetDocSnap: any = null;
  const docDirectRef = doc(db, 'userInvitations', invitationIdOrCode.trim());
  const directSnap = await getDoc(docDirectRef);
  if (directSnap.exists()) {
    targetDocSnap = directSnap;
  } else {
    const q = query(
      collection(db, 'userInvitations'),
      where('code', '==', cleanInput),
      where('status', '==', 'PENDENTE')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      targetDocSnap = snap.docs[0];
    }
  }

  if (!targetDocSnap || !targetDocSnap.exists()) {
    return { success: false, message: 'Código de convite não encontrado ou inválido.' };
  }

  const invitation = { id: targetDocSnap.id, ...targetDocSnap.data() } as UserInvitation;

  if (invitation.status === 'ACEITO') {
    return { success: false, message: 'Este convite já foi utilizado e não pode ser aceito novamente.' };
  }
  if (invitation.status === 'CANCELADO') {
    return { success: false, message: 'Este convite foi cancelado pelo administrador da organização.' };
  }
  if (invitation.status === 'EXPIRADO') {
    return { success: false, message: 'Este convite expirou. Solicite um novo convite ao gestor.' };
  }
  if (invitation.status !== 'PENDENTE') {
    return { success: false, message: `Este convite está com status ${invitation.status} e não pode ser aceito.` };
  }

  if (invitation.email && invitation.email.toLowerCase().trim() !== cleanEmail) {
    return {
      success: false,
      message: `Este convite foi emitido exclusivamente para o endereço "${invitation.email}". Você está conectado como "${cleanEmail}".`,
    };
  }

  // Verifica se a organização vinculada existe e está ativa
  const orgRef = doc(db, 'organizations', invitation.organizationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    return { success: false, message: 'A organização vinculada a este convite não foi encontrada no sistema.' };
  }
  const orgData = orgSnap.data();
  if (orgData.status && orgData.status !== 'ACTIVE' && orgData.status !== 'ATIVO') {
    return { success: false, message: 'A organização vinculada a este convite encontra-se inativa ou suspensa.' };
  }

  const now = new Date().toISOString();

  // 1. Marca convite como ACEITO
  const invRef = doc(db, 'userInvitations', invitation.id);
  await updateDoc(invRef, {
    status: 'ACEITO',
    acceptedAt: now,
    acceptedByUid: userUid,
    acceptedByUserUid: userUid,
    acceptedByEmail: cleanEmail,
    updatedAt: now,
  });

  // 2. Cria ou atualiza perfil do usuário atomicamente com setDoc merge
  const userRef = doc(db, 'users', userUid);
  const userSnap = await getDoc(userRef);
  const existingData = userSnap.exists() ? userSnap.data() : {};

  const updatedProfile: UserProfile = {
    uid: userUid,
    email: cleanEmail,
    displayName: displayName || existingData.displayName || cleanEmail.split('@')[0] || 'Usuário SGQ',
    role: invitation.role,
    organizationId: invitation.organizationId,
    setor: invitation.setor || existingData.setor || '',
    status: 'ATIVO',
    createdAt: existingData.createdAt || now,
    updatedAt: now,
    lastLoginAt: now,
    invitationId: invitation.id,
  };

  await setDoc(userRef, sanitizeForFirestore(updatedProfile), { merge: true });

  // 3. Registra no Audit Trail imutável da organização vinculada
  try {
    await recordOrganizationAudit(invitation.organizationId, {
      entity: 'USER',
      entityId: userUid,
      action: 'CREATE',
      changedByUid: userUid,
      changedByEmail: cleanEmail,
      summary: `Usuário ${updatedProfile.displayName} aceitou convite (${invitation.code}) e ingressou na organização "${invitation.organizationName || orgData.name}" com perfil ${invitation.role} (Setor: ${invitation.setor || 'Geral'}).`,
      details: JSON.stringify({
        invitationId: invitation.id,
        code: invitation.code,
        role: invitation.role,
        setor: invitation.setor,
        acceptedAt: now,
      }),
    });
  } catch (auditErr) {
    console.warn('Aviso ao registrar trilha de auditoria de convite aceito:', auditErr);
  }

  return {
    success: true,
    message: `Vínculo aprovado com sucesso! Bem-vindo(a) à organização ${invitation.organizationName || orgData.name}.`,
    invitation: {
      ...invitation,
      status: 'ACEITO',
      acceptedAt: now,
      acceptedByUid: userUid,
    },
  };
}

/**
 * Cancelamento de convite pendente.
 */
export async function cancelUserInvitation(
  invitationId: string,
  actorProfile: UserProfile | null
): Promise<void> {
  const invRef = doc(db, 'userInvitations', invitationId);
  const snap = await getDoc(invRef);
  if (!snap.exists()) return;
  const data = snap.data() as UserInvitation;

  if (data.status === 'ACEITO') {
    throw new Error('Operação bloqueada: Este convite já foi aceito e não pode ser cancelado.');
  }

  await updateDoc(invRef, {
    status: 'CANCELADO',
    updatedAt: new Date().toISOString(),
  });

  await recordOrganizationAudit(data.organizationId, {
    entity: 'USER',
    entityId: invitationId,
    action: 'STATUS_CHANGE',
    changedByUid: actorProfile?.uid || auth.currentUser?.uid || 'admin',
    changedByEmail: actorProfile?.email || auth.currentUser?.email || 'admin@qualigest',
    summary: `Convite ${data.code} para ${data.email} foi CANCELADO pelo administrador.`,
    details: JSON.stringify({ invitationId, code: data.code, targetEmail: data.email }),
  });
}

/**
 * Reenvio / renovação de convite pendente.
 */
export async function resendUserInvitation(
  invitationId: string,
  actorProfile: UserProfile | null
): Promise<UserInvitation | null> {
  const invRef = doc(db, 'userInvitations', invitationId);
  const snap = await getDoc(invRef);
  if (!snap.exists()) return null;
  const data = snap.data() as UserInvitation;

  if (data.status === 'ACEITO') {
    throw new Error('Operação bloqueada: Este convite já foi aceito e não pode ser revalidado.');
  }

  const now = new Date().toISOString();
  await updateDoc(invRef, {
    status: 'PENDENTE',
    updatedAt: now,
  });

  await recordOrganizationAudit(data.organizationId, {
    entity: 'USER',
    entityId: invitationId,
    action: 'UPDATE',
    changedByUid: actorProfile?.uid || auth.currentUser?.uid || 'admin',
    changedByEmail: actorProfile?.email || auth.currentUser?.email || 'admin@qualigest',
    summary: `Convite ${data.code} para ${data.email} foi revalidado/reenviado pelo administrador.`,
    details: JSON.stringify({ invitationId, code: data.code, targetEmail: data.email }),
  });

  return { ...data, status: 'PENDENTE', updatedAt: now };
}

// ----------------------------------------------------
// 3. AUDIT TRAIL LOGGING (organizations/{orgId}/auditTrails/{auditId})
// ----------------------------------------------------

export async function recordOrganizationAudit(
  orgId: string,
  entry: Omit<OrganizationAuditEntry, 'id' | 'organizationId' | 'changedAt'>
): Promise<void> {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `organizations/${orgId}/auditTrails/${auditId}`;
  try {
    const docRef = doc(db, 'organizations', orgId, 'auditTrails', auditId);
    const fullEntry: OrganizationAuditEntry = {
      id: auditId,
      organizationId: orgId,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      changedAt: new Date().toISOString(),
      changedByUid: entry.changedByUid || auth.currentUser?.uid || 'anon',
      changedByEmail: entry.changedByEmail || auth.currentUser?.email || 'anon@qualigest',
      details: entry.details,
      summary: entry.summary,
    };
    await setDoc(docRef, sanitizeForFirestore(fullEntry));
  } catch (e) {
    console.warn('Audit trail write notification:', e);
  }
}

// ----------------------------------------------------
// 4. NON-CONFORMITIES (RNCs) SERVICE (organizations/{orgId}/nonConformities/{ncId})
// ----------------------------------------------------

/**
 * Real-time listener for Non-Conformities of an organization.
 * When any account creates, updates, or deletes an NC, all other accounts receive changes instantaneously.
 */
export function subscribeToNonConformities(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  onUpdate: (ncs: NCRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `organizations/${orgId}/nonConformities`;
  try {
    const colRef = collection(db, 'organizations', orgId, 'nonConformities');
    const q = query(colRef, orderBy('atualizadoEm', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: NCRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data() as NCRecord;
          return {
            ...d,
            id: docSnap.id,
            criadoEm: d.criadoEm || new Date().toISOString(),
            atualizadoEm: d.atualizadoEm || new Date().toISOString(),
            historicoPrazos: Array.isArray(d.historicoPrazos) ? d.historicoPrazos : [],
            evidenciasObjetivas: Array.isArray(d.evidenciasObjetivas) ? d.evidenciasObjetivas : [],
            trilhaAuditoria: Array.isArray(d.trilhaAuditoria) ? d.trilhaAuditoria : [],
            decisoesSugestoes: Array.isArray(d.decisoesSugestoes) ? d.decisoesSugestoes : [],
            tags: Array.isArray(d.tags) ? d.tags : [],
          };
        });
        onUpdate(records);
      },
      (error) => {
        console.error('onSnapshot error in nonConformities:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error attaching nonConformities onSnapshot listener:', error);
    if (onError) onError(error);
    return () => {};
  }
}

export async function saveNonConformity(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  nc: NCRecord,
  authorProfile?: UserProfile | null
): Promise<void> {
  if (authorProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Usuários com papel de CONSULTA possuem acesso estritamente somente leitura no SGQ.');
  }

  const ncId = nc.id || `nc_${Date.now()}`;
  const path = `organizations/${orgId}/nonConformities/${ncId}`;
  const now = new Date().toISOString();

  const cleanNC: NCRecord = {
    ...nc,
    id: ncId,
    criadoEm: nc.criadoEm || now,
    atualizadoEm: now,
    historicoPrazos: Array.isArray(nc.historicoPrazos) ? nc.historicoPrazos : [],
    evidenciasObjetivas: Array.isArray(nc.evidenciasObjetivas) ? nc.evidenciasObjetivas : [],
    trilhaAuditoria: Array.isArray(nc.trilhaAuditoria) ? nc.trilhaAuditoria : [],
    decisoesSugestoes: Array.isArray(nc.decisoesSugestoes) ? nc.decisoesSugestoes : [],
    tags: Array.isArray(nc.tags) ? nc.tags : [],
  };

  try {
    const docRef = doc(db, 'organizations', orgId, 'nonConformities', ncId);
    await setDoc(docRef, sanitizeForFirestore(cleanNC), { merge: true });

    // Record organizational audit log
    await recordOrganizationAudit(orgId, {
      entity: 'NON_CONFORMITY',
      entityId: ncId,
      action: nc.criadoEm === now ? 'CREATE' : 'UPDATE',
      changedByUid: authorProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: authorProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `RNC #${cleanNC.numeroNC} salva/atualizada: ${cleanNC.titulo}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNonConformity(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  ncId: string,
  authorProfile?: UserProfile | null
): Promise<void> {
  if (authorProfile?.role && authorProfile.role !== 'ADMIN' && authorProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de Não Conformidade é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${orgId}/nonConformities/${ncId}`;
  try {
    const docRef = doc(db, 'organizations', orgId, 'nonConformities', ncId);
    await deleteDoc(docRef);

    // Record organizational audit log
    await recordOrganizationAudit(orgId, {
      entity: 'NON_CONFORMITY',
      entityId: ncId,
      action: 'DELETE',
      changedByUid: authorProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: authorProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `RNC com ID ${ncId} excluída permanentemente.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteMultipleNonConformities(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  ncIds: string[],
  authorProfile?: UserProfile | null
): Promise<void> {
  if (!ncIds || ncIds.length === 0) return;
  if (authorProfile?.role && authorProfile.role !== 'ADMIN' && authorProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de Não Conformidades é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${orgId}/nonConformities`;
  try {
    const batch = writeBatch(db);
    ncIds.forEach((id) => {
      const docRef = doc(db, 'organizations', orgId, 'nonConformities', id);
      batch.delete(docRef);
    });
    await batch.commit();

    await recordOrganizationAudit(orgId, {
      entity: 'NON_CONFORMITY',
      entityId: ncIds.join(', '),
      action: 'DELETE',
      changedByUid: authorProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: authorProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `${ncIds.length} RNCs excluídas permanentemente.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// 5. MANUALS & REGULATORY DOCUMENTS SERVICE (organizations/{orgId}/manuals/{manualId})
// ----------------------------------------------------

/**
 * Real-time listener for Manuals of an organization.
 * Changes to documents, revisions, and chapters propagate seamlessly in real time.
 */
export function subscribeToManuals(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  onUpdate: (manuals: ManualRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `organizations/${orgId}/manuals`;
  try {
    const colRef = collection(db, 'organizations', orgId, 'manuals');
    const q = query(colRef, orderBy('atualizadoEm', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const manuals: ManualRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data() as ManualRecord;
          return {
            ...d,
            id: docSnap.id,
            setoresAplicaveis: Array.isArray(d.setoresAplicaveis) ? d.setoresAplicaveis : [],
            capitulos: Array.isArray(d.capitulos) ? d.capitulos : [],
            versoesConfiguracao: Array.isArray(d.versoesConfiguracao) ? d.versoesConfiguracao : [],
            historicoAlteracoes: Array.isArray(d.historicoAlteracoes) ? d.historicoAlteracoes : [],
            criadoEm: d.criadoEm || new Date().toISOString(),
            atualizadoEm: d.atualizadoEm || new Date().toISOString(),
          };
        });
        onUpdate(manuals);
      },
      (error) => {
        console.error('onSnapshot error in manuals:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error attaching manuals onSnapshot listener:', error);
    if (onError) onError(error);
    return () => {};
  }
}

export async function saveManual(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  manual: ManualRecord,
  authorProfile?: UserProfile | null
): Promise<void> {
  if (authorProfile?.role && authorProfile.role !== 'ADMIN' && authorProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Gestão de manuais normativos é restrita a GESTOR_SGQ e ADMIN.');
  }

  const manualId = manual.id || `manual_${Date.now()}`;
  const path = `organizations/${orgId}/manuals/${manualId}`;
  const now = new Date().toISOString();

  // Asynchronously upload heavy binary to backend file cache if base64 is present
  if (manual.arquivoBase64 && manual.arquivoBase64.length > 50000) {
    try {
      fetch(`/api/manual-files/${manualId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: manual.arquivoNome,
          mimeType: manual.arquivoMimeType,
          base64: manual.arquivoBase64,
        }),
      }).catch((e) => console.warn('Manual file backend caching notice:', e));
    } catch {
      // Non-blocking
    }
  }

  // FIRESTORE SIZE LIMIT SAFEGUARD:
  // Firestore documents have a strict 1,048,576 byte (1 MiB) ceiling.
  // Large files (such as PDFs converted to base64 exceeding 1MB) MUST NOT be stored inline in Firestore.
  // We keep the file in local IndexedDB and server cache, and store metadata + chapters + compact text in Firestore.
  let firestoreBase64 = manual.arquivoBase64;
  let cleanFullText = manual.arquivoTextoCompleto;
  let cleanConteudoTexto = manual.conteudoTexto;

  // If base64 alone is heavier than 300KB, strip it from Firestore document
  if (firestoreBase64 && firestoreBase64.length > 300000) {
    firestoreBase64 = undefined;
  }

  // Cap large textual fields to safe thresholds
  if (cleanFullText && cleanFullText.length > 150000) {
    cleanFullText = cleanFullText.substring(0, 150000);
  }
  if (cleanConteudoTexto && cleanConteudoTexto.length > 150000) {
    cleanConteudoTexto = cleanConteudoTexto.substring(0, 150000);
  }

  // Check combined footprint: if still exceeding 600KB, omit base64 and truncate text further
  const roughFootprint = (firestoreBase64?.length || 0) + (cleanFullText?.length || 0) + (cleanConteudoTexto?.length || 0);
  if (roughFootprint > 600000) {
    firestoreBase64 = undefined;
    if (cleanFullText && cleanFullText.length > 50000) {
      cleanFullText = cleanFullText.substring(0, 50000);
    }
    if (cleanConteudoTexto && cleanConteudoTexto.length > 50000) {
      cleanConteudoTexto = cleanConteudoTexto.substring(0, 50000);
    }
  }

  const cleanManual: ManualRecord = {
    ...manual,
    id: manualId,
    criadoEm: manual.criadoEm || now,
    atualizadoEm: now,
    arquivoBase64: firestoreBase64,
    arquivoTextoCompleto: cleanFullText,
    conteudoTexto: cleanConteudoTexto,
    setoresAplicaveis: Array.isArray(manual.setoresAplicaveis) ? manual.setoresAplicaveis : [],
    capitulos: Array.isArray(manual.capitulos) ? manual.capitulos : [],
    versoesConfiguracao: Array.isArray(manual.versoesConfiguracao) ? manual.versoesConfiguracao : [],
    historicoAlteracoes: Array.isArray(manual.historicoAlteracoes) ? manual.historicoAlteracoes : [],
  };

  try {
    const docRef = doc(db, 'organizations', orgId, 'manuals', manualId);
    await setDoc(docRef, sanitizeForFirestore(cleanManual), { merge: true });

    // Record organizational audit log
    await recordOrganizationAudit(orgId, {
      entity: 'MANUAL',
      entityId: manualId,
      action: manual.criadoEm === now ? 'CREATE' : 'UPDATE',
      changedByUid: authorProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: authorProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Manual ${cleanManual.codigo} (${cleanManual.revisao}) salvo: ${cleanManual.titulo}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteManual(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  manualId: string,
  authorProfile?: UserProfile | null
): Promise<void> {
  if (authorProfile?.role && authorProfile.role !== 'ADMIN' && authorProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de manuais normativos é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${orgId}/manuals/${manualId}`;
  try {
    const docRef = doc(db, 'organizations', orgId, 'manuals', manualId);
    await deleteDoc(docRef);

    // Record organizational audit log
    await recordOrganizationAudit(orgId, {
      entity: 'MANUAL',
      entityId: manualId,
      action: 'DELETE',
      changedByUid: authorProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: authorProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Manual com ID ${manualId} excluído permanentemente do Firestore.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// 6. EXPLICIT DEMONSTRATION DATA BOOTSTRAP (INITIAL SEED)
// ----------------------------------------------------

/**
 * Explicitly bootstraps demonstration data into the organization's Firestore collections.
 * NEVER executed automatically. Only called by direct user intent via button with confirmation.
 */
export async function bootstrapDemonstrationData(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  authorProfile?: UserProfile | null
): Promise<{ ncsCount: number; manualsCount: number }> {
  try {
    await ensureOrganization(orgId);

    // 1. Seed Manuals
    for (const manual of INITIAL_MANUALS) {
      await saveManual(orgId, manual, authorProfile);
    }

    // 2. Seed NCs
    for (const nc of INITIAL_RECORDS) {
      await saveNonConformity(orgId, nc, authorProfile);
    }

    await recordOrganizationAudit(orgId, {
      entity: 'ORGANIZATION',
      entityId: orgId,
      action: 'BOOTSTRAP',
      changedByUid: authorProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: authorProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Demonstração SGQ inicializada (${INITIAL_RECORDS.length} NCs, ${INITIAL_MANUALS.length} Manuais).`,
    });

    return {
      ncsCount: INITIAL_RECORDS.length,
      manualsCount: INITIAL_MANUALS.length,
    };
  } catch (error) {
    console.error('Error during manual bootstrap to Firestore:', error);
    throw error;
  }
}

// ----------------------------------------------------
// 7. SYSTEM DIAGNOSTICS SERVICE (systemDiagnostics/{testId})
// ----------------------------------------------------

export function subscribeToSystemDiagnostics(
  onUpdate: (records: SystemDiagnosticRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = 'systemDiagnostics';
  try {
    const colRef = collection(db, 'systemDiagnostics');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: SystemDiagnosticRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            testId: docSnap.id,
            createdByUid: d.createdByUid || d.authorUid || '',
            createdByEmail: d.createdByEmail || d.authorEmail || '',
            message: d.message || d.payload || '',
            status: d.status || 'ATIVO',
            lastModifiedByEmail: d.lastModifiedByEmail,
            lastModifiedByUid: d.lastModifiedByUid,
            createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt || '',
            updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : d.updatedAt || '',
          };
        });
        onUpdate(records);
      },
      (error) => {
        console.error('onSnapshot Error in systemDiagnostics:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error attaching onSnapshot listener:', error);
    if (onError) onError(error);
    return () => {};
  }
}

export async function createSystemDiagnostic(params: {
  message: string;
  status?: string;
}): Promise<SystemDiagnosticRecord> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuário deve estar autenticado para registrar teste diagnóstico.');
  }

  const testId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `systemDiagnostics/${testId}`;
  const now = new Date().toISOString();

  const record: SystemDiagnosticRecord = {
    testId,
    createdByUid: currentUser.uid,
    createdByEmail: currentUser.email || 'anônimo',
    message: params.message.trim(),
    status: params.status || 'ATIVO',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'systemDiagnostics', testId);
    await setDoc(docRef, sanitizeForFirestore(record));
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSystemDiagnostic(
  testId: string,
  params: {
    message?: string;
    status?: string;
  }
): Promise<void> {
  const currentUser = auth.currentUser;
  const path = `systemDiagnostics/${testId}`;
  try {
    const docRef = doc(db, 'systemDiagnostics', testId);
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (params.message !== undefined) updateData.message = params.message.trim();
    if (params.status !== undefined) updateData.status = params.status;
    if (currentUser) {
      updateData.lastModifiedByEmail = currentUser.email || 'anônimo';
      updateData.lastModifiedByUid = currentUser.uid;
    }

    await updateDoc(docRef, sanitizeForFirestore(updateData));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSystemDiagnostic(testId: string): Promise<void> {
  const path = `systemDiagnostics/${testId}`;
  try {
    const docRef = doc(db, 'systemDiagnostics', testId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// FASE 3: COMPARAÇÃO DE RNCS RESPONDIDAS & VALIDAÇÃO
// ----------------------------------------------------

/**
 * Escuta em tempo real a coleção de Comparações de RNCs da Organização
 */
export function subscribeToRNCComparisons(
  organizationId: string,
  onUpdate: (comparisons: ComparacaoRNCRecord[]) => void,
  onError?: (error: any) => void
): () => void {
  const path = `organizations/${organizationId}/rncComparisons`;
  try {
    const comparisonsRef = collection(db, 'organizations', organizationId, 'rncComparisons');
    const q = query(comparisonsRef, orderBy('atualizadoEm', 'desc'), limit(200));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ComparacaoRNCRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ComparacaoRNCRecord);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('onSnapshot error in rncComparisons:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error attaching rncComparisons onSnapshot listener:', error);
    if (onError) onError(error);
    return () => {};
  }
}

/**
 * Salva ou atualiza um registro de comparação de RNC respondida
 */
export async function saveRNCComparison(
  organizationId: string,
  comparison: ComparacaoRNCRecord,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Usuários com papel de CONSULTA não podem validar ou salvar comparações de RNC.');
  }

  const path = `organizations/${organizationId}/rncComparisons/${comparison.id}`;
  const now = new Date().toISOString();
  const dataToSave: ComparacaoRNCRecord = {
    ...comparison,
    atualizadoEm: now,
    uploadedPorUid: comparison.uploadedPorUid || userProfile?.uid || auth.currentUser?.uid || 'anon',
    uploadedPorEmail: comparison.uploadedPorEmail || userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
    auditorAprovadorUid: comparison.auditorAprovadorUid || userProfile?.uid || auth.currentUser?.uid || 'anon',
    auditorAprovadorEmail: comparison.auditorAprovadorEmail || userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'rncComparisons', comparison.id);
    await setDoc(docRef, sanitizeForFirestore(dataToSave), { merge: true });

    // Registrar trilha de auditoria
    await recordOrganizationAudit(organizationId, {
      entity: 'RNC_COMPARISON',
      entityId: comparison.id,
      action: comparison.statusGeral === 'APLICADO_NA_RNC' ? 'APPLY_TO_RNC' : 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Validação RNC ${comparison.numeroNCAssociada || comparison.id}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui um registro de comparação
 */
export async function deleteRNCComparison(
  organizationId: string,
  comparisonId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de comparação de RNC é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/rncComparisons/${comparisonId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'rncComparisons', comparisonId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'RNC_COMPARISON',
      entityId: comparisonId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de comparação ${comparisonId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// FASE 3: BASE DE CONHECIMENTO VALIDADA (SGQ)
// ----------------------------------------------------

/**
 * Escuta em tempo real a coleção de Conhecimento Validado do SGQ
 */
export function subscribeToValidatedKnowledge(
  organizationId: string,
  onUpdate: (knowledgeList: ValidatedKnowledgeRecord[]) => void,
  onError?: (error: any) => void
): () => void {
  const path = `organizations/${organizationId}/validatedKnowledge`;
  try {
    const knowledgeRef = collection(db, 'organizations', organizationId, 'validatedKnowledge');
    const q = query(knowledgeRef, orderBy('atualizadoEm', 'desc'), limit(200));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ValidatedKnowledgeRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ValidatedKnowledgeRecord);
        });
        onUpdate(list);
      },
      (error) => {
        console.error('onSnapshot error in validatedKnowledge:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error('Error attaching validatedKnowledge onSnapshot listener:', error);
    if (onError) onError(error);
    return () => {};
  }
}

/**
 * Salva ou atualiza um Padrão de Conhecimento Validado
 */
export async function saveValidatedKnowledge(
  organizationId: string,
  knowledge: ValidatedKnowledgeRecord,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Usuários com papel de CONSULTA não podem criar ou alterar conhecimento SGQ.');
  }

  // Segregation of Duties and Gestor validation for Level 5 / PADRAO_SGQ
  if (knowledge.nivelMaturidade === 5 || knowledge.status === 'PADRAO_SGQ') {
    if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
      throw new Error('Permissão negada: Promoção para Nível 5 / Padrão Corporativo SGQ é restrita a GESTOR_SGQ e ADMIN.');
    }

    // Segregation of Duties check: Author cannot self-approve promotion to Level 5
    if (knowledge.criadoPorUid && userProfile?.uid && knowledge.criadoPorUid === userProfile.uid) {
      throw new Error('Violação de Segregação de Funções: O mesmo autor não pode autoaprovar a elevação para Nível 5 (Padrão Corporativo SGQ). Requer homologação independente por outro Auditor Líder ou Gestor SGQ.');
    }
  }

  const path = `organizations/${organizationId}/validatedKnowledge/${knowledge.id}`;
  const now = new Date().toISOString();
  const dataToSave: ValidatedKnowledgeRecord = {
    ...knowledge,
    atualizadoEm: now,
    validadoPorUid: knowledge.validadoPorUid || userProfile?.uid || auth.currentUser?.uid || 'anon',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'validatedKnowledge', knowledge.id);
    await setDoc(docRef, sanitizeForFirestore(dataToSave), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'VALIDATED_KNOWLEDGE',
      entityId: knowledge.id,
      action: knowledge.status === 'PADRAO_SGQ' ? 'PROMOTE_PATTERN' : 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Conhecimento SGQ: ${knowledge.tituloPadrao}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui um padrão de conhecimento
 */
export async function deleteValidatedKnowledge(
  organizationId: string,
  knowledgeId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de padrões de conhecimento é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/validatedKnowledge/${knowledgeId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'validatedKnowledge', knowledgeId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'VALIDATED_KNOWLEDGE',
      entityId: knowledgeId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão de conhecimento ${knowledgeId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Alias para compatibilidade
export const saveNCRecord = saveNonConformity;

// ============================================================================
// FASE 8: GESTÃO DE AUDITORIAS EXTERNAS, CONSTATAÇÕES, RESPOSTAS E APRENDIZADO
// ============================================================================

/**
 * Escuta auditorias externas de uma organização em tempo real
 */
export function subscribeToExternalAudits(
  organizationId: string,
  callback: (audits: AuditoriaExternaRecord[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const auditsRef = collection(db, 'organizations', organizationId, 'externalAudits');

  const unsubscribe = onSnapshot(
    auditsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Se for a Impacto Aviation e estiver vazio, semeia os dados iniciais
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_EXTERNAL_AUDITS.forEach((audit) => {
              const docRef = doc(db, 'organizations', organizationId, 'externalAudits', audit.id);
              batch.set(docRef, sanitizeForFirestore(audit));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_EXTERNAL_AUDITS locais', e);
          }
          callback(INITIAL_EXTERNAL_AUDITS);
          return;
        }
        callback([]);
        return;
      }

      const list: AuditoriaExternaRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AuditoriaExternaRecord);
      });

      // Ordenar por data de início decrescente
      list.sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''));
      callback(list);
    },
    (error) => {
      console.error('Erro na subscrição de externalAudits:', error);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_EXTERNAL_AUDITS);
      } else {
        callback([]);
      }
    }
  );

  return unsubscribe;
}

/**
 * Salva ou atualiza uma auditoria externa
 */
export async function saveExternalAudit(
  organizationId: string,
  audit: AuditoriaExternaRecord,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode cadastrar ou alterar auditorias.');
  }

  const path = `organizations/${organizationId}/externalAudits/${audit.id}`;
  const now = new Date().toISOString();
  const dataToSave = {
    ...audit,
    organizationId,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'externalAudits', audit.id);
    await setDoc(docRef, sanitizeForFirestore(dataToSave), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: audit.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Auditoria Externa salva: ${audit.numeroAuditoria} (${audit.entidadeAuditora})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui uma auditoria externa (Restrito a GESTOR_SGQ e ADMIN)
 */
export async function deleteExternalAudit(
  organizationId: string,
  auditId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de auditoria é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/externalAudits/${auditId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'externalAudits', auditId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: auditId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão da auditoria ${auditId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Escuta constatações (findings) de auditoria externa em tempo real
 */
export function subscribeToAuditFindings(
  organizationId: string,
  callback: (findings: ConstatacaoExternaRecord[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const findingsRef = collection(db, 'organizations', organizationId, 'auditFindings');

  const unsubscribe = onSnapshot(
    findingsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_AUDIT_FINDINGS.forEach((finding) => {
              const docRef = doc(db, 'organizations', organizationId, 'auditFindings', finding.id);
              batch.set(docRef, sanitizeForFirestore(finding));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_AUDIT_FINDINGS locais', e);
          }
          callback(INITIAL_AUDIT_FINDINGS);
          return;
        }
        callback([]);
        return;
      }

      const list: ConstatacaoExternaRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ConstatacaoExternaRecord);
      });

      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callback(list);
    },
    (error) => {
      console.error('Erro na subscrição de auditFindings:', error);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_AUDIT_FINDINGS);
      } else {
        callback([]);
      }
    }
  );

  return unsubscribe;
}

/**
 * Salva ou atualiza uma constatação de auditoria externa
 */
export async function saveAuditFinding(
  organizationId: string,
  finding: ConstatacaoExternaRecord,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode alterar constatações.');
  }

  const path = `organizations/${organizationId}/auditFindings/${finding.id}`;
  const now = new Date().toISOString();
  const dataToSave = {
    ...finding,
    organizationId,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'auditFindings', finding.id);
    await setDoc(docRef, sanitizeForFirestore(dataToSave), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: finding.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Constatação de Auditoria salva: ${finding.numeroExterno} (Status: ${finding.status})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui uma constatação de auditoria externa
 */
export async function deleteAuditFinding(
  organizationId: string,
  findingId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão de constatação é restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/auditFindings/${findingId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'auditFindings', findingId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: findingId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão da constatação ${findingId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Cria uma RNC Interna F 001-29 a partir de uma constatação de auditoria externa
 * Estabelece o vínculo bidirecional estrito sem perda ou duplicação de escopo
 */
export async function criarRNCFromFinding(
  organizationId: string,
  finding: ConstatacaoExternaRecord,
  audit: AuditoriaExternaRecord | undefined,
  userProfile?: UserProfile | null
): Promise<{ rncId: string; numeroNC: string }> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode gerar RNC interna.');
  }

  const rncId = `NC-${Date.now()}`;
  const numeroNC = String(Date.now()).slice(-4);
  const hoje = new Date().toISOString().split('T')[0];

  const novaRNC: NCRecord = {
    id: rncId,
    codigoFormulario: 'F 001-29',
    revisao: '00',
    dataEmissaoFormulario: hoje,
    numeroNC: numeroNC,
    titulo: `Constatação Externa ${finding.numeroExterno} - ${audit?.entidadeAuditora || 'Auditoria Externa'}`,
    tipoAcao: 'Corretiva',
    descricaoNC: `[ORIGEM AUDITORIA EXTERNA ${audit?.numeroAuditoria || ''} - ${finding.numeroExterno}]\n${finding.descricaoOriginal}\n\nInterpretação Técnica SGQ:\n${finding.interpretacaoInterna || 'Pendente de análise.'}`,
    normaReferencia: `${finding.requisitoNormativo?.norma || 'Norma Aeronáutica'} ${finding.requisitoNormativo?.itemRequisito || ''}`.trim(),
    setor: finding.setorResponsavel || 'Geral',
    categoria: 'Auditoria Externa',
    responsavel: finding.responsavelNome || userProfile?.displayName || 'Qualidade SGQ',
    avaliacaoRiscoInicial: {
      severidade: finding.nivelRisco === 'Crítico' ? '5' : (finding.nivelRisco === 'Alto' ? '4' : '3'),
      probabilidade: 'C',
      codigo: finding.nivelRisco === 'Crítico' ? '5C' : (finding.nivelRisco === 'Alto' ? '4C' : '3C'),
      nivel: finding.nivelRisco || 'Médio',
      nivelRisco: finding.nivelRisco || 'Médio',
      justificativa: `Classificação originada de finding de auditoria externa (${finding.classificacao}).`,
    },
    prazoResposta: finding.prazoResposta || hoje,
    dataIdentificacao: hoje,
    auditor: audit?.auditoresNomes?.join(', ') || 'Auditor Externo',
    preAnaliseContencao: {
      descricao: finding.respostaOficial?.correcaoImediata || 'Ação de contenção em definição pela equipe técnica.',
      responsavel: finding.responsavelNome || userProfile?.displayName || 'SGQ',
      dataLimite: finding.prazoResposta || hoje,
      status: finding.respostaOficial?.correcaoImediata ? 'Concluída' : 'Pendente',
    },
    analiseCausaRaiz: {
      metodologia: '5 Porquês',
      cincoPorques: ['Por que ocorreu a constatação do auditor?'],
      detalhes: finding.respostaOficial?.analiseCausa || 'Análise causal formal a ser conduzida pela equipe de manutenção/SGQ.',
      statusValidacao: 'HIPÓTESE – REQUER VALIDAÇÃO HUMANA',
    },
    acaoCorretiva: {
      descricao: finding.respostaOficial?.acaoCorretiva || 'Plano de ação corretiva a ser estruturado.',
      responsavel: finding.responsavelNome || 'SGQ',
      dataPrazo: finding.prazoResposta || hoje,
      status: 'Em Andamento',
    },
    verificacaoEficacia: {
      metodo: 'Reauditoria / Inspeção de Acompanhamento',
      encerrado: 'Pendente',
    },
    statusGeral: 'Em Andamento',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    historicoPrazos: [],
    origemAuditoriaExterna: {
      auditoriaId: finding.auditId,
      numeroAuditoria: audit?.numeroAuditoria || finding.auditId,
      constatacaoId: finding.id,
      numeroConstatacaoExterna: finding.numeroExterno,
      entidadeAuditora: audit?.entidadeAuditora || 'Auditoria Externa',
      dataVinculo: new Date().toISOString(),
    },
    trilhaAuditoria: [
      {
        data: new Date().toISOString(),
        usuario: userProfile?.displayName || 'SGQ',
        campoModificado: 'Origem da RNC',
        valorAnterior: 'N/A',
        novoValor: `Gerada a partir da Constatação ${finding.numeroExterno} da auditoria ${audit?.numeroAuditoria || ''}`,
        motivo: 'Vínculo formal com constatação de auditoria externa',
      },
    ],
  };

  // Salva a nova RNC
  await saveNonConformity(organizationId, novaRNC, userProfile);

  // Atualiza a constatação externa com a referência à RNC
  const findingAtualizado: ConstatacaoExternaRecord = {
    ...finding,
    rncInternaCriadaId: rncId,
    numeroRNCInterna: numeroNC,
    trilhaAuditoria: [
      ...(finding.trilhaAuditoria || []),
      {
        data: new Date().toISOString(),
        usuario: userProfile?.displayName || 'SGQ',
        campoModificado: 'RNC Interna Gerada',
        valorAnterior: 'Nenhuma',
        novoValor: `RNC-${numeroNC} (${rncId}) vinculada formalmente`,
        motivo: 'Geração de RNC interna para tratamento F 001-29',
      },
    ],
  };
  await saveAuditFinding(organizationId, findingAtualizado, userProfile);

  return { rncId, numeroNC };
}

/**
 * Escuta lições aprendidas de auditorias externas
 */
export function subscribeToAuditLessons(
  organizationId: string,
  callback: (lessons: LicaoAprendidaAuditoria[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const lessonsRef = collection(db, 'organizations', organizationId, 'auditLessonsLearned');

  const unsubscribe = onSnapshot(
    lessonsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_AUDIT_LESSONS.forEach((lesson) => {
              const docRef = doc(db, 'organizations', organizationId, 'auditLessonsLearned', lesson.id);
              batch.set(docRef, sanitizeForFirestore(lesson));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_AUDIT_LESSONS locais', e);
          }
          callback(INITIAL_AUDIT_LESSONS);
          return;
        }
        callback([]);
        return;
      }

      const list: LicaoAprendidaAuditoria[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as LicaoAprendidaAuditoria);
      });

      list.sort((a, b) => (b.dataCriacao || '').localeCompare(a.dataCriacao || ''));
      callback(list);
    },
    (error) => {
      console.error('Erro na subscrição de auditLessonsLearned:', error);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_AUDIT_LESSONS);
      } else {
        callback([]);
      }
    }
  );

  return unsubscribe;
}

/**
 * Salva uma lição aprendida de auditoria externa
 */
export async function saveAuditLesson(
  organizationId: string,
  lesson: LicaoAprendidaAuditoria,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Perfil CONSULTA não pode criar lições aprendidas.');
  }

  const path = `organizations/${organizationId}/auditLessonsLearned/${lesson.id}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'auditLessonsLearned', lesson.id);
    await setDoc(docRef, sanitizeForFirestore({ ...lesson, organizationId }), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: lesson.id,
      action: 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Lição Aprendida de Auditoria: ${lesson.titulo}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui uma lição aprendida
 */
export async function deleteAuditLesson(
  organizationId: string,
  lessonId: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão restrita a GESTOR_SGQ e ADMIN.');
  }

  const path = `organizations/${organizationId}/auditLessonsLearned/${lessonId}`;
  try {
    const docRef = doc(db, 'organizations', organizationId, 'auditLessonsLearned', lessonId);
    await deleteDoc(docRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: lessonId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Exclusão da lição aprendida ${lessonId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Promove uma Lição Aprendida para Candidata à Base de Conhecimento SGQ (N1-N5)
 * Governança estrita: nunca promovida automaticamente para N5 (PADRAO_SGQ)
 */
export async function promoverLicaoParaConhecimento(
  organizationId: string,
  lesson: LicaoAprendidaAuditoria,
  userProfile?: UserProfile | null
): Promise<string> {
  const knowledgeId = `KNOW-AUD-${Date.now()}`;
  const now = new Date().toISOString();

  const candidato: ValidatedKnowledgeRecord = {
    id: knowledgeId,
    tituloPadrao: `Lição de Auditoria: ${lesson.titulo}`,
    categoria: lesson.ondeAplicarConhecimento?.[0] || 'Qualidade SGQ',
    setor: lesson.setor || 'SGQ',
    contextoDesvio: lesson.oQueAconteceu,
    causaValidada: lesson.porQueAconteceu,
    acoesCorretivasRecomendadas: [lesson.oQueFuncionou, lesson.oQueFazerDiferente].filter(Boolean),
    nivelMaturidade: 3,
    status: 'EM_ANALISE_SGQ',
    justificativaSGQ: `Candidatura gerada a partir da Lição Aprendida ${lesson.id}`,
    criadoEm: now,
    atualizadoEm: now,
    validadoPorUid: userProfile?.uid || 'sgq',
    criadoPorUid: userProfile?.uid || 'sgq',
  };

  await saveValidatedKnowledge(organizationId, candidato, userProfile);

  // Atualiza a lição aprendida com a referência do padrão
  await saveAuditLesson(
    organizationId,
    {
      ...lesson,
      promovidoParaConhecimentoId: knowledgeId,
    },
    userProfile
  );

  return knowledgeId;
}

