import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  Clock, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { 
  getPendingInvitationsForEmail, 
  acceptUserInvitation 
} from '../services/firebase/firestore';
import { UserInvitation } from '../types';

interface UserPendingOrganizationViewProps {
  onInvitationAccepted?: () => void;
}

export const UserPendingOrganizationView: React.FC<UserPendingOrganizationViewProps> = ({
  onInvitationAccepted,
}) => {
  const { user, userProfile, logout } = useAuth();
  const [invitationCode, setInvitationCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [pendingInvitations, setPendingInvitations] = useState<UserInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!user?.email) return;
    setLoadingInvitations(true);
    setErrorMessage(null);
    try {
      const list = await getPendingInvitationsForEmail(user.email);
      setPendingInvitations(list);
    } catch (err: any) {
      console.warn('Erro ao carregar convites pendentes:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [user?.email]);

  const handleAcceptByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationCode.trim() || !user) return;
    setSubmittingCode(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await acceptUserInvitation(
        invitationCode.trim(),
        user.uid,
        user.email || '',
        user.displayName || userProfile?.displayName
      );

      if (res.success) {
        setSuccessMessage('Vínculo aprovado com sucesso! Redirecionando...');
        setTimeout(() => {
          if (onInvitationAccepted) onInvitationAccepted();
          window.location.reload();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Código de convite inválido ou expirado.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao validar código de convite.');
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleAcceptDirectInvitation = async (invitation: UserInvitation) => {
    if (!user) return;
    setAcceptingId(invitation.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await acceptUserInvitation(
        invitation.id,
        user.uid,
        user.email || '',
        user.displayName || userProfile?.displayName
      );

      if (res.success) {
        setSuccessMessage(`Bem-vindo à ${invitation.organizationName || 'Organização'}! Redirecionando...`);
        setTimeout(() => {
          if (onInvitationAccepted) onInvitationAccepted();
          window.location.reload();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Falha ao aceitar convite.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar aceitação de convite.');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-blue-600 selection:text-white">
      {/* Top Bar with user identity and logout */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
              QUALIGEST SGQ
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80 font-mono">
                RBAC 145 / ISO 9001
              </span>
            </div>
            <div className="text-xs text-slate-400">Sistema de Gestão da Qualidade Aeronáutica</div>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 border border-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair da Conta</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl w-full mx-auto my-8 flex-1 flex flex-col justify-center">
        {/* Card Container */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xs">
          
          {/* Status Badge */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Vínculo Organizacional Pendente
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 truncate max-w-[200px]" title={user?.email || ''}>
              {user?.email}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Conta de Usuário Identificada
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Olá, <span className="font-semibold text-white">{user?.displayName || user?.email}</span>. 
              Sua conta pessoal foi autenticada com segurança. No QualiGest, 
              <span className="text-blue-300 font-medium"> conta de usuário não é organização</span>: para acessar registros de RNC, auditorias, manuais e competências técnicas, você deve ingressar na organização à qual pertence.
            </p>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{successMessage}</div>
            </div>
          )}

          {/* Section 1: Detected Invitations for user's email */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Convites Disponíveis para seu E-mail
              </h2>
              <button
                onClick={fetchInvitations}
                disabled={loadingInvitations}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                title="Atualizar lista de convites"
              >
                <RefreshCw className={`w-3 h-3 ${loadingInvitations ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {loadingInvitations ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Consultando convites corporativos registrados...</span>
              </div>
            ) : pendingInvitations.length > 0 ? (
              <div className="space-y-3">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl bg-slate-900 border border-blue-900/40 hover:border-blue-700/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-semibold text-white text-sm truncate">
                          {inv.organizationName || 'Organização SGQ'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/80">
                          {inv.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>Perfil: <strong className="text-slate-200">{inv.role}</strong></span>
                        {inv.setor && (
                          <span>Setor: <strong className="text-slate-200">{inv.setor}</strong></span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptDirectInvitation(inv)}
                      disabled={acceptingId === inv.id}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
                    >
                      {acceptingId === inv.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Vinculando...</span>
                        </>
                      ) : (
                        <>
                          <span>Aceitar & Ingressar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                Nenhum convite pré-configurado encontrado para o endereço <span className="font-mono text-slate-300">{user?.email}</span>. Se seu administrador gerou um código, insira-o no campo abaixo.
              </div>
            )}
          </div>

          {/* Section 2: Insert Invitation Code */}
          <div className="pt-6 border-t border-slate-800/80">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Inserir Código de Convite da Organização
            </h2>
            <form onSubmit={handleAcceptByCode} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ex: IMP-7294 ou código de convite"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors uppercase"
                />
                <button
                  type="submit"
                  disabled={submittingCode || !invitationCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
                >
                  {submittingCode ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar & Entrar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                O código de convite é fornecido pelo Administrador ou Gestor SGQ da sua oficina ou operador aéreo.
              </p>
            </form>
          </div>

          {/* Governance Footer Info */}
          <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-start gap-2.5 text-[11px] text-slate-400 leading-normal">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <strong>Diretriz de Segurança Aeronáutica:</strong> O QualiGest impede a criação desordenada de novas organizações a cada cadastro. Isto assegura que todas as não conformidades e evidências permaneçam isoladas sob governança corporativa auditável.
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto py-4 text-center text-xs text-slate-400 border-t border-slate-800/80">
        QualiGest SGQ • Gestão Centralizada de Organizações, Usuários e Acessos
      </footer>
    </div>
  );
};
