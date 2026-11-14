import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from './config';
import { PreAuditoriaConsolidada } from '../../types/auditRequirements';
import { UserProfile } from '../../types';
import { sanitizeForFirestore, recordOrganizationAudit } from './firestore';

export function subscribeToPreAudits(
  organizationId: string,
  callback: (items: PreAuditoriaConsolidada[]) => void
): () => void {
  if (!organizationId || !auth.currentUser) {
    return () => {};
  }

  const ref = collection(db, `organizations/${organizationId}/pre_audits`);
  return onSnapshot(
    ref,
    (snap) => {
      const lista: PreAuditoriaConsolidada[] = snap.docs.map((d) => ({
        ...(d.data() as PreAuditoriaConsolidada),
        id: d.id
      }));
      lista.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      callback(lista);
    },
    (err) => {
      console.error('[preAuditsFirestore] Erro na subscrição de pre_audits:', err);
    }
  );
}

export async function savePreAudit(
  organizationId: string,
  preAudit: PreAuditoriaConsolidada,
  currentUser?: UserProfile | null
): Promise<PreAuditoriaConsolidada> {
  const role = (currentUser?.role || '').toUpperCase();
  if (role === 'CONSULTA' || role === 'VIEWER') {
    throw new Error('Perfil de CONSULTA não possui permissão para gravar pré-auditorias.');
  }

  if (
    (preAudit.statusPreAuditoria === 'PRONTA_PARA_AUDITORIA' ||
      preAudit.statusPreAuditoria === 'FINALIZADA_CONGELADA') &&
    !['ADMIN', 'ADMINISTRADOR', 'GESTOR_SGQ', 'GESTOR'].includes(role) &&
    auth.currentUser
  ) {
    // Rebaixa para CONSOLIDADA_COM_PENDENCIAS caso usuário não gestor salve rascunho antes da aprovação
    preAudit = {
      ...preAudit,
      statusPreAuditoria: 'CONSOLIDADA_COM_PENDENCIAS'
    };
  }

  const orgId = organizationId || preAudit.organizationId || 'org_impacto_aviation';
  const payload: PreAuditoriaConsolidada = {
    ...preAudit,
    organizationId: orgId,
    updatedAt: new Date().toISOString()
  };

  if (auth.currentUser) {
    const docRef = doc(db, `organizations/${orgId}/pre_audits/${payload.id}`);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

    await recordOrganizationAudit(orgId, {
      entity: 'EXTERNAL_AUDIT',
      entityId: payload.id,
      action: 'UPDATE',
      summary: `Pré-auditoria consolidada [${payload.numeroAuditoria}] atualizada (${payload.resumo.totalItens} itens; ${payload.snapshots?.length || 0} snapshot(s)).`,
      changedByUid: auth.currentUser.uid,
      changedByEmail: auth.currentUser.email || currentUser?.email
    });
  }

  return payload;
}
