import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { auth } from './config';
import { ensureUserProfile, getUserProfile } from './firestore';
import { UserProfile } from '../../types';

export interface AuthStateChangeCallback {
  (user: User | null, profile: UserProfile | null): void;
}

export class AuthService {
  private static googleProvider = new GoogleAuthProvider();

  /**
   * Logs in with Email and Password
   */
  static async loginWithEmail(email: string, pass: string): Promise<{ user: User; profile: UserProfile }> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const profile = await ensureUserProfile(cred.user.uid, cred.user.email || email, cred.user.displayName || undefined);
      return { user: cred.user, profile };
    } catch (error: any) {
      console.error('AuthService.loginWithEmail error:', error);
      throw error;
    }
  }

  /**
   * Registers a new account with Email and Password
   */
  static async registerWithEmail(email: string, pass: string, displayName?: string): Promise<{ user: User; profile: UserProfile }> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (displayName && cred.user) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch (nameErr) {
          console.warn('Could not update Auth displayName:', nameErr);
        }
      }
      const profile = await ensureUserProfile(cred.user.uid, cred.user.email || email, displayName);
      return { user: cred.user, profile };
    } catch (error: any) {
      console.error('AuthService.registerWithEmail error:', error);
      throw error;
    }
  }

  /**
   * Logs in with Google via Popup
   */
  static async loginWithGoogle(): Promise<{ user: User; profile: UserProfile }> {
    try {
      const cred = await signInWithPopup(auth, this.googleProvider);
      const profile = await ensureUserProfile(cred.user.uid, cred.user.email || '', cred.user.displayName || undefined);
      return { user: cred.user, profile };
    } catch (error: any) {
      console.error('AuthService.loginWithGoogle error:', error);
      throw error;
    }
  }

  /**
   * Sends password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      console.error('AuthService.resetPassword error:', error);
      throw error;
    }
  }

  /**
   * Logs out current user session
   */
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('AuthService.logout error:', error);
      throw error;
    }
  }

  /**
   * Observes authentication state changes with Firestore profile resolution
   */
  static subscribeToAuth(callback: AuthStateChangeCallback): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid) || 
            await ensureUserProfile(firebaseUser.uid, firebaseUser.email || '', firebaseUser.displayName || undefined);
          callback(firebaseUser, profile);
        } catch (e) {
          console.warn('Error loading user profile during auth transition:', e);
          callback(firebaseUser, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
            role: 'CONSULTA',
            organizationId: '',
            setor: '',
            status: 'PENDENTE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        callback(null, null);
      }
    });
  }
}
