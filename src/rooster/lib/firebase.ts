import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { app, auth, db } from '../../services/firebase/config';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(db);
}

export function getFirebaseApp(): FirebaseApp | null {
  return app || null;
}

export function getFirestoreDb(): Firestore | null {
  return db || null;
}
