import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  OperationType,
  handleFirestoreError,
  recordOrganizationAudit,
  sanitizeForFirestore,
} from './firestore';
import type { UserProfile } from '../../types';
import type {
  AuditoriaPreparacao,
  ItemAuditoriaPreparacao,
} from '../../types/auditPrep';

function getUserRoleUpper(userProfile?: UserProfile | null): string {
  return String(userProfile?.role || '').toUpperCase();
}

export function canUserWriteAuditPrep(userProfile?: UserProfile | null): boolean {
  const role = getUserRoleUpper(userProfile);
  if (!role) return true; // Modo demonstração local quando não autenticado
  return role !== 'CONSULTA' && role !== 'VIEWER' && role !== 'GUEST';
}

export function canUserDeleteOrApproveAuditPrep(userProfile?: UserProfile | null): boolean {
  const role = getUserRoleUpper(userProfile);
  if (!role) return true;
  return role === 'ADMIN' || role === 'ADMINISTRADOR' || role === 'GESTOR_SGQ' || role === 'GESTOR' || role === 'AUDITOR';
}

export function canUserDeleteAuditPrep(userProfile?: UserProfile | null): boolean {
  const role = getUserRoleUpper(userProfile);
  if (!role) return true;
  return role === 'ADMIN' || role === 'ADMINISTRADOR' || role === 'GESTOR_SGQ' || role === 'GESTOR';
}

export function subscribeToAuditPreparations(
  organizationId: string,
  callback: (audits: AuditoriaPreparacao[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!organizationId || !auth.currentUser) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'audit_preparations');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AuditoriaPreparacao[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AuditoriaPreparacao);
      });
      list.sort((a, b) => (b.dataAuditoria || b.createdAt || '').localeCompare(a.dataAuditoria || a.createdAt || ''));
      callback(list);
    },
    (error) => {
      console.error('[auditPrepFirestore] Erro ao escutar audit_preparations:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export function subscribeToAuditPrepItems(
  organizationId: string,
  callback: (items: ItemAuditoriaPreparacao[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!organizationId || !auth.currentUser) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'audit_preparation_items');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ItemAuditoriaPreparacao[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ItemAuditoriaPreparacao);
      });
      list.sort((a, b) => {
        if ((a.ordem ?? 0) !== (b.ordem ?? 0)) return (a.ordem ?? 0) - (b.ordem ?? 0);
        return (a.numeroItem || '').localeCompare(b.numeroItem || '', undefined, { numeric: true });
      });
      callback(list);
    },
    (error) => {
      console.error('[auditPrepFirestore] Erro ao escutar audit_preparation_items:', error);
      onError?.(error);
      callback([]);
    }
  );
}

export async function saveAuditPrep(
  organizationId: string,
  audit: AuditoriaPreparacao,
  userProfile?: UserProfile | null,
  isNew: boolean = false
): Promise<void> {
  if (!canUserWriteAuditPrep(userProfile)) {
    throw new Error('Permissão negada: perfil somente leitura não pode criar ou editar auditorias.');
  }

  const path = `organizations/${organizationId}/audit_preparations/${audit.id}`;
  const now = new Date().toISOString();
  const payload: AuditoriaPreparacao = {
    ...audit,
    organizationId,
    updatedAt: now,
    atualizadoPorUid: userProfile?.uid || auth.currentUser?.uid || 'local',
    atualizadoPorNome: userProfile?.displayName || auth.currentUser?.email || 'Qualidade IMPACTO',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'audit_preparations', audit.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: audit.id,
      action: isNew ? 'CREATE' : 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `${isNew ? 'Auditoria criada' : 'Auditoria atualizada'} na Central de Preparação: ${audit.nome} (${audit.entidade} — ${audit.tipo})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleArchiveAuditPrep(
  organizationId: string,
  audit: AuditoriaPreparacao,
  arquivar: boolean,
  userProfile?: UserProfile | null
): Promise<void> {
  if (!canUserWriteAuditPrep(userProfile)) {
    throw new Error('Permissão negada: perfil somente leitura não pode arquivar ou restaurar auditorias.');
  }

  const now = new Date().toISOString();
  const actorName = userProfile?.displayName || auth.currentUser?.email || 'Qualidade IMPACTO';
  const updated: AuditoriaPreparacao = {
    ...audit,
    arquivada: arquivar,
    status: arquivar ? 'ARQUIVADA' : 'EM_PREPARACAO',
    arquivadaEm: arquivar ? now : undefined,
    arquivadaPorNome: arquivar ? actorName : undefined,
    updatedAt: now,
  };

  await saveAuditPrep(organizationId, updated, userProfile, false);
}

export async function deleteAuditPrepAndItems(
  organizationId: string,
  auditId: string,
  auditNome: string,
  userProfile?: UserProfile | null
): Promise<void> {
  if (!canUserDeleteAuditPrep(userProfile)) {
    throw new Error('Permissão negada: apenas Gestor SGQ ou Administrador pode excluir auditorias.');
  }

  const path = `organizations/${organizationId}/audit_preparations/${auditId}`;
  try {
    const itemsRef = collection(db, 'organizations', organizationId, 'audit_preparation_items');
    const qItems = query(itemsRef, where('auditId', '==', auditId));
    const snap = await getDocs(qItems);

    if (!snap.empty) {
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    const auditRef = doc(db, 'organizations', organizationId, 'audit_preparations', auditId);
    await deleteDoc(auditRef);

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: auditId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Auditoria "${auditNome}" excluída com ${snap.size} item(ns) na Central de Preparação.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveAuditPrepItem(
  organizationId: string,
  item: ItemAuditoriaPreparacao,
  userProfile?: UserProfile | null,
  isNew: boolean = false
): Promise<void> {
  if (!canUserWriteAuditPrep(userProfile)) {
    throw new Error('Permissão negada: perfil somente leitura não pode editar itens da auditoria.');
  }

  const path = `organizations/${organizationId}/audit_preparation_items/${item.id}`;
  const now = new Date().toISOString();
  const payload: ItemAuditoriaPreparacao = {
    ...item,
    organizationId,
    updatedAt: now,
    atualizadoPorUid: userProfile?.uid || auth.currentUser?.uid || 'local',
    atualizadoPorNome: userProfile?.displayName || auth.currentUser?.email || 'Qualidade IMPACTO',
  };

  try {
    const docRef = doc(db, 'organizations', organizationId, 'audit_preparation_items', item.id);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: item.auditId,
      action: isNew ? 'CREATE' : 'UPDATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Item ${item.numeroItem} (${item.situacao}) ${isNew ? 'adicionado' : 'atualizado'} na auditoria ${item.auditId}.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAuditPrepItemsBatch(
  organizationId: string,
  items: ItemAuditoriaPreparacao[],
  userProfile?: UserProfile | null
): Promise<void> {
  if (!canUserWriteAuditPrep(userProfile)) {
    throw new Error('Permissão negada: perfil somente leitura não pode importar itens de auditoria.');
  }
  if (!items || items.length === 0) return;

  const now = new Date().toISOString();
  const path = `organizations/${organizationId}/audit_preparation_items`;
  try {
    for (let i = 0; i < items.length; i += 400) {
      const chunk = items.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, 'organizations', organizationId, 'audit_preparation_items', item.id);
        batch.set(
          docRef,
          sanitizeForFirestore({
            ...item,
            organizationId,
            updatedAt: now,
          }),
          { merge: true }
        );
      });
      await batch.commit();
    }

    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: items[0].auditId,
      action: 'CREATE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Importação de ${items.length} item(ns) na auditoria ${items[0].auditId} (Fonte: ${items[0].fonteImportacao?.nomeArquivo || items[0].fonteImportacao?.tipo || 'Manual'}).`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAuditPrepItem(
  organizationId: string,
  item: ItemAuditoriaPreparacao,
  userProfile?: UserProfile | null
): Promise<void> {
  if (!canUserDeleteAuditPrep(userProfile)) {
    throw new Error('Permissão negada: apenas Gestor SGQ ou Administrador pode excluir itens.');
  }

  const path = `organizations/${organizationId}/audit_preparation_items/${item.id}`;
  try {
    await deleteDoc(doc(db, 'organizations', organizationId, 'audit_preparation_items', item.id));
    await recordOrganizationAudit(organizationId, {
      entity: 'AUDIT',
      entityId: item.auditId,
      action: 'DELETE',
      changedByUid: userProfile?.uid || auth.currentUser?.uid || 'anon',
      changedByEmail: userProfile?.email || auth.currentUser?.email || 'anon@qualigest',
      summary: `Item ${item.numeroItem} excluído da auditoria ${item.auditId}.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
