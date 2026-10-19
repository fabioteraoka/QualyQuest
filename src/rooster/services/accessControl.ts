import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from '../lib/firebase';

const LOCAL_STORAGE_ACCESS_HASH = 'roster_access_hash_sha256';
const LOCAL_STORAGE_SESSION_TOKEN = 'roster_session_granted_until';
const LOCAL_STORAGE_USER_NAME = 'roster_user_display_name';

/**
 * Computes a SHA-256 hash string for an access code using the standard Web Crypto API.
 */
export async function sha256Hex(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retrieves the currently configured access hash.
 * Checks Firestore ('configuracao/acesso') first if configured; falls back to localStorage.
 */
export async function getConfiguredAccessHash(): Promise<string | null> {
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const docRef = doc(db, 'configuracao', 'acesso');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && typeof data.hash_sha256 === 'string' && data.hash_sha256.length > 0) {
            // Keep local backup in sync
            localStorage.setItem(LOCAL_STORAGE_ACCESS_HASH, data.hash_sha256);
            return data.hash_sha256;
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar configuracao/acesso no Firestore, usando fallback local:', err);
    }
  }

  return localStorage.getItem(LOCAL_STORAGE_ACCESS_HASH);
}

/**
 * Sets a new shared access code. Saves SHA-256 hash in Firestore and localStorage.
 */
export async function setSharedAccessCode(newCode: string, usuarioNome: string): Promise<void> {
  const hash = await sha256Hex(newCode);

  // Always update localStorage
  localStorage.setItem(LOCAL_STORAGE_ACCESS_HASH, hash);

  // If Firebase is configured, update Firestore document configuracao/acesso
  if (isFirebaseConfigured()) {
    try {
      const db = getFirestoreDb();
      if (db) {
        const docRef = doc(db, 'configuracao', 'acesso');
        await setDoc(
          docRef,
          {
            hash_sha256: hash,
            atualizado_em: new Date().toISOString(),
            atualizado_por: usuarioNome || 'Sistema',
            tipo: 'codigo_compartilhado_equipe',
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Não foi possível sincronizar o hash com o Firestore:', err);
    }
  }

  // Authorize current device for 30 days
  grantDeviceAccess();
}

/**
 * Validates a plain text access code against the stored hash.
 */
export async function verifyAccessCode(plainCode: string): Promise<boolean> {
  const storedHash = await getConfiguredAccessHash();
  if (!storedHash) return false;
  const inputHash = await sha256Hex(plainCode);
  return inputHash === storedHash;
}

/**
 * Checks whether the current device holds an active authorization (valid for 30 days).
 */
export function isDeviceAuthorized(): boolean {
  const untilStr = localStorage.getItem(LOCAL_STORAGE_SESSION_TOKEN);
  if (!untilStr) return false;
  const until = parseInt(untilStr, 10);
  if (isNaN(until) || Date.now() > until) {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_TOKEN);
    return false;
  }
  return true;
}

/**
 * Grants access to this device for 30 days.
 */
export function grantDeviceAccess(): void {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const expiry = Date.now() + thirtyDaysMs;
  localStorage.setItem(LOCAL_STORAGE_SESSION_TOKEN, expiry.toString());
}

/**
 * Revokes access on this device ("Sair deste dispositivo").
 */
export function revokeDeviceAccess(): void {
  localStorage.removeItem(LOCAL_STORAGE_SESSION_TOKEN);
}

/**
 * Gets the stored user's display name for traceability.
 */
export function getSavedUserName(): string {
  return localStorage.getItem(LOCAL_STORAGE_USER_NAME) || '';
}

/**
 * Saves the user's display name.
 */
export function saveUserName(nome: string): void {
  if (nome && nome.trim()) {
    localStorage.setItem(LOCAL_STORAGE_USER_NAME, nome.trim());
  }
}
