import React from 'react';
import { ShieldX, LogOut, AlertOctagon, HelpCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const UserBlockedOrInactiveView: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const isBloqueado = userProfile?.status === 'BLOQUEADO';
  const statusLabel = isBloqueado ? 'Conta Bloqueada' : 'Acesso Inativo';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-rose-600 selection:text-white">
      <header className="max-w-xl w-full mx-auto py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          QualiGest SGQ • Controle de Acesso
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </header>

      <main className="max-w-md w-full mx-auto my-auto text-center py-8">
        <div className="p-8 rounded-2xl bg-slate-900/90 border border-rose-900/60 shadow-2xl backdrop-blur-xs">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 mx-auto mb-5 shadow-lg shadow-rose-950/50">
            {isBloqueado ? <AlertOctagon className="w-8 h-8" /> : <ShieldX className="w-8 h-8" />}
          </div>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-rose-950 border border-rose-800 text-rose-300 mb-4">
            {statusLabel}
          </div>

          <h1 className="text-xl font-bold tracking-tight text-white mb-2">
            Acesso Temporariamente Suspenso
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            O acesso para o usuário <strong className="text-white font-mono text-xs">{user?.email}</strong> foi 
            definido como <span className="text-rose-300 font-semibold">{statusLabel}</span> pelo Administrador da Organização.
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-left text-xs text-slate-400 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>O que devo fazer?</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Entre em contato com o Gestor da Qualidade ou Administrador do QualiGest em sua empresa para reativação ou atualização das suas credenciais técnicas.
            </p>
          </div>

          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Desconectar e Entrar com Outra Conta</span>
          </button>
        </div>
      </main>

      <footer className="max-w-xl w-full mx-auto py-4 text-center text-xs text-slate-400 border-t border-slate-800/80">
        Governança e Rastreabilidade Aeronáutica • RBAC 145 / SGQ
      </footer>
    </div>
  );
};
