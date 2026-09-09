import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '../services/firebase/auth';
import { subscribeToUserProfile } from '../services/firebase/firestore';
import { UserProfile } from '../types';

export type AuthStatus = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  status: AuthStatus;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('LOADING');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = AuthService.subscribeToAuth((firebaseUser, profile) => {
      setUser(firebaseUser);
      setUserProfile(profile);
      setStatus(firebaseUser ? 'AUTHENTICATED' : 'UNAUTHENTICATED');

      if (firebaseUser) {
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
        unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (updatedProfile) => {
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const clearError = () => setError(null);

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await AuthService.loginWithEmail(email, pass);
      setUser(res.user);
      setUserProfile(res.profile);
      setStatus('AUTHENTICATED');
    } catch (err: any) {
      let msg = 'Falha ao autenticar usuário.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        msg = 'Email ou senha incorretos.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Endereço de email inválido.';
      } else if (err?.code === 'auth/user-disabled') {
        msg = 'Esta conta de usuário foi desativada pelo administrador.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName?: string) => {
    setError(null);
    try {
      const res = await AuthService.registerWithEmail(email, pass, displayName);
      setUser(res.user);
      setUserProfile(res.profile);
      setStatus('AUTHENTICATED');
    } catch (err: any) {
      let msg = 'Falha ao criar conta.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'Este endereço de email já está cadastrado.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'A senha deve ter no mínimo 6 caracteres.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Endereço de email inválido.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const res = await AuthService.loginWithGoogle();
      setUser(res.user);
      setUserProfile(res.profile);
      setStatus('AUTHENTICATED');
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      const msg = err?.message || 'Falha ao realizar login com Google.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await AuthService.logout();
      setUser(null);
      setUserProfile(null);
      setStatus('UNAUTHENTICATED');
    } catch (err: any) {
      setError(err?.message || 'Erro ao encerrar sessão.');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await AuthService.resetPassword(email);
    } catch (err: any) {
      let msg = 'Falha ao enviar email de recuperação.';
      if (err?.code === 'auth/user-not-found') {
        msg = 'Nenhuma conta encontrada com este email.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Email inválido.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        status,
        loading: status === 'LOADING',
        error,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return context;
}
