import React from 'react';
import { ShieldAlert, Building2, PlusCircle, LogOut, Activity, Lock, ArrowRight } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';

interface NoTenantAssignedViewProps {
  user: User | null;
  userProfile: UserProfile | null;
  onStartOnboarding: () => void;
  onLogout: () => void;
  onOpenDiagnostics?: () => void;
}

export const NoTenantAssignedView: React.FC<NoTenantAssignedViewProps> = ({
  user,
  userProfile,
  onStartOnboarding,
  onLogout,
  onOpenDiagnostics,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
        {/* Insignia Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-2xs">
          <Building2 className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-800 text-xs font-semibold mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>Isolamento Multi-Tenant Garantido</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Nenhuma Organização SGQ Vinculada
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto mb-6">
          Sua conta foi autenticada com sucesso, porém ainda não está vinculada a nenhuma organização aeronáutica credenciada. Por segurança regulatória, nenhum dado de outros clientes pode ser exibido.
        </p>

        {/* User Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left mb-6 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Usuário:</span>
            <span>{userProfile?.displayName || user?.displayName || 'Usuário Autenticado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">E-mail:</span>
            <span className="font-mono text-slate-800">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">Perfil Regulatório:</span>
            <span className="font-semibold text-blue-600">{userProfile?.role || 'Aguardando vínculo'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provisionar Nova Organização</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>

        {onOpenDiagnostics && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenDiagnostics}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Verificar Diagnóstico de Conexão Firestore</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
