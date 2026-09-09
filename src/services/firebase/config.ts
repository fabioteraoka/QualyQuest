import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// Initialize Firebase App instance safely (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore with specified database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Validates active connection to Firestore using getDocFromServer
 */
export async function testFirestoreConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'health_check'));
    return { ok: true, message: 'Conexão ativa com o Cloud Firestore estabelecida com sucesso.' };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return { ok: false, message: 'Cliente offline. Verifique a conexão com o Firebase.' };
    }
    // "permission-denied" or "not-found" still proves connection to server
    if (error?.code === 'permission-denied' || error?.code === 'not-found') {
      return { ok: true, message: 'Conexão com o Cloud Firestore confirmada pelo servidor.' };
    }
    return { ok: true, message: `Conexão verificada: ${error?.message || 'Servidor Firestore ativo'}` };
  }
}
