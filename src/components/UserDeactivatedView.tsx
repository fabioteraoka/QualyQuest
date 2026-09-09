import React from 'react';
import { UserX, ShieldAlert, LogOut, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';

interface UserDeactivatedViewProps {
  user: User | null;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export const UserDeactivatedView: React.FC<UserDeactivatedViewProps> = ({
  user,
  userProfile,
  onLogout,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 sm:p-8 shadow-sm text-center">
        {/* Deactivated Insignia */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-2xs">
          <UserX className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/80 text-red-800 text-xs font-semibold mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>Controle de Acesso em Tempo Real</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Conta Desativada
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Esta conta de usuário foi desativada pelo Administrador do SGQ da organização. Todas as operações de leitura, consulta e gravação foram revogadas no Firestore.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left mb-6 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">E-mail:</span>
            <span className="font-mono text-slate-800">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Status:</span>
            <span className="font-bold text-red-600 uppercase">INATIVO</span>
          </div>
          {userProfile?.organizationId && (
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Organização:</span>
              <span className="font-mono">{userProfile.organizationId}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );
};
