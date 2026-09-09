import { ManualRecord, NCRecord, UserProfile } from '../types';
import { loadManualsFromDB, saveManualToDB } from '../utils/manualsStorage';
import { migrateNCRecord } from './ncRepository';
import { saveManual, saveNonConformity, recordOrganizationAudit, DEFAULT_ORGANIZATION_ID } from './firebase/firestore';

const RECORDS_STORAGE_KEY = 'qualigest_sgq_records_v1';
const MANUALS_STORAGE_KEY = 'qualigest_sgq_manuals_v1';

export interface LocalDataSummary {
  localManuals: ManualRecord[];
  localRecords: NCRecord[];
  unmigratedManuals: ManualRecord[];
  unmigratedRecords: NCRecord[];
  hasUnmigratedData: boolean;
  totalLocalItems: number;
}

/**
 * Scans browser IndexedDB and LocalStorage to detect any manuals or RNCs
 * that were created before Firestore migration or during offline sessions.
 */
export async function detectLocalMaterial(
  currentFirestoreRecords: NCRecord[] = [],
  currentFirestoreManuals: ManualRecord[] = []
): Promise<LocalDataSummary> {
  let localManuals: ManualRecord[] = [];
  let localRecords: NCRecord[] = [];

  // 1. Scan Manuals from IndexedDB & LocalStorage
  try {
    const loadedManuals = await loadManualsFromDB();
    if (Array.isArray(loadedManuals) && loadedManuals.length > 0) {
      localManuals = loadedManuals;
    }
  } catch (e) {
    console.warn('Erro ao ler manuais locais para detecção de migração:', e);
  }

  // 2. Scan NC Records from LocalStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawRecords = window.localStorage.getItem(RECORDS_STORAGE_KEY);
      if (rawRecords) {
        const parsed = JSON.parse(rawRecords);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localRecords = parsed.map(migrateNCRecord);
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao ler RNCs locais para detecção de migração:', e);
  }

  // 3. Compare with what is already present in Firestore
  const firestoreNCIds = new Set(currentFirestoreRecords.map((r) => r.id));
  const firestoreManualIds = new Set(currentFirestoreManuals.map((m) => m.id));
  const firestoreManualCodes = new Set(currentFirestoreManuals.map((m) => m.codigo?.trim().toLowerCase()));

  // An item is unmigrated if its ID or unique identifier is not in Firestore
  const unmigratedManuals = localManuals.filter((m) => {
    if (firestoreManualIds.has(m.id)) return false;
    const cleanCode = m.codigo?.trim().toLowerCase();
    if (cleanCode && firestoreManualCodes.has(cleanCode)) return false;
    return true;
  });

  const unmigratedRecords = localRecords.filter((r) => {
    return !firestoreNCIds.has(r.id);
  });

  return {
    localManuals,
    localRecords,
    unmigratedManuals,
    unmigratedRecords,
    hasUnmigratedData: unmigratedManuals.length > 0 || unmigratedRecords.length > 0,
    totalLocalItems: localManuals.length + localRecords.length,
  };
}

/**
 * Migrates local manuals and RNCs to the active Firestore organization.
 * Cleans up payload to respect Firestore size limits while keeping full binaries in local IndexedDB.
 */
export async function migrateLocalDataToFirestore(
  orgId: string = DEFAULT_ORGANIZATION_ID,
  userProfile?: UserProfile | null,
  options?: {
    forceMigrateAll?: boolean;
    onProgress?: (message: string, current: number, total: number) => void;
  }
): Promise<{ manualsMigrated: number; recordsMigrated: number; errors: string[] }> {
  const errors: string[] = [];
  let manualsMigrated = 0;
  let recordsMigrated = 0;

  // 1. Detect data
  const summary = await detectLocalMaterial([], []);
  const manualsToMigrate = options?.forceMigrateAll ? summary.localManuals : (summary.unmigratedManuals.length > 0 ? summary.unmigratedManuals : summary.localManuals);
  const recordsToMigrate = options?.forceMigrateAll ? summary.localRecords : (summary.unmigratedRecords.length > 0 ? summary.unmigratedRecords : summary.localRecords);

  const total = manualsToMigrate.length + recordsToMigrate.length;
  let processed = 0;

  // 2. Migrate Manuals
  for (const manual of manualsToMigrate) {
    processed++;
    if (options?.onProgress) {
      options.onProgress(`Migrando manual: ${manual.codigo} - ${manual.titulo}`, processed, total);
    }

    try {
      // Ensure binary is safe in local IndexedDB
      await saveManualToDB(manual);

      // Create a payload optimized for Firestore (strip raw base64 if exceeds 500KB to stay safely under 1MB doc limit)
      const firestoreManual: ManualRecord = {
        ...manual,
        arquivoBase64: manual.arquivoBase64 && manual.arquivoBase64.length > 600000 
          ? undefined 
          : manual.arquivoBase64,
        arquivoTextoCompleto: manual.arquivoTextoCompleto && manual.arquivoTextoCompleto.length > 300000
          ? manual.arquivoTextoCompleto.substring(0, 300000)
          : manual.arquivoTextoCompleto,
        conteudoTexto: manual.conteudoTexto && manual.conteudoTexto.length > 300000
          ? manual.conteudoTexto.substring(0, 300000)
          : manual.conteudoTexto,
      };

      await saveManual(orgId, firestoreManual, userProfile);
      manualsMigrated++;
    } catch (err: any) {
      console.error(`Erro ao migrar manual ${manual.codigo}:`, err);
      errors.push(`Manual ${manual.codigo}: ${err?.message || err}`);
    }
  }

  // 3. Migrate Records (RNCs)
  for (const nc of recordsToMigrate) {
    processed++;
    if (options?.onProgress) {
      options.onProgress(`Migrando RNC: #${nc.numeroNC} - ${nc.titulo}`, processed, total);
    }

    try {
      await saveNonConformity(orgId, nc, userProfile);
      recordsMigrated++;
    } catch (err: any) {
      console.error(`Erro ao migrar RNC #${nc.numeroNC}:`, err);
      errors.push(`RNC #${nc.numeroNC}: ${err?.message || err}`);
    }
  }

  // 4. Record audit log
  try {
    await recordOrganizationAudit(orgId, {
      entity: 'ORGANIZATION',
      entityId: orgId,
      action: 'BOOTSTRAP',
      changedByUid: userProfile?.uid || 'anon',
      changedByEmail: userProfile?.email || 'anon@qualigest',
      summary: `Sincronização de dados locais para Cloud Firestore concluída: ${manualsMigrated} manuais e ${recordsMigrated} RNCs migrados.`,
    });
  } catch (auditErr) {
    console.warn('Erro ao registrar auditoria de migração:', auditErr);
  }

  return {
    manualsMigrated,
    recordsMigrated,
    errors,
  };
}
