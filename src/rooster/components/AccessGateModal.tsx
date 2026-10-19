import React, { useEffect, useState } from 'react';
import { KeyRound, Lock, ShieldCheck, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  getConfiguredAccessHash,
  getSavedUserName,
  grantDeviceAccess,
  isDeviceAuthorized,
  saveUserName,
  setSharedAccessCode,
  verifyAccessCode,
} from '../services/accessControl';

interface AccessGateModalProps {
  onAccessGranted: (userName: string) => void;
  bypass?: boolean;
}

export const AccessGateModal: React.FC<AccessGateModalProps> = ({ onAccessGranted, bypass }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasConfiguredCode, setHasConfiguredCode] = useState<boolean | null>(null);

  // Form states
  const [accessCode, setAccessCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [userName, setUserName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (bypass) {
        grantDeviceAccess();
        const savedName = getSavedUserName() || 'Usuário SGQ';
        setIsOpen(false);
        setIsInitializing(false);
        onAccessGranted(savedName);
        return;
      }

      setIsInitializing(true);
      const authorized = isDeviceAuthorized();
      const savedName = getSavedUserName();

      if (authorized && savedName) {
        setIsOpen(false);
        setIsInitializing(false);
        onAccessGranted(savedName);
        return;
      }

      // Check whether access code is already registered in DB or localStorage
      const hash = await getConfiguredAccessHash();
      setHasConfiguredCode(!!hash);
      setUserName(savedName || '');
      setIsOpen(true);
      setIsInitializing(false);
    }

    checkAuth();
  }, [onAccessGranted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!userName.trim()) {
      setErrorMsg('Por favor, informe seu nome para rastreabilidade de auditoria.');
      return;
    }

    if (!accessCode.trim()) {
      setErrorMsg('Informe o código de acesso.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!hasConfiguredCode) {
        // Initial setup mode: creating the code for the first time
        if (accessCode.length < 4) {
          setErrorMsg('O código de acesso deve ter pelo menos 4 caracteres.');
          setIsSubmitting(false);
          return;
        }

        if (accessCode !== confirmCode) {
          setErrorMsg('A confirmação do código não confere com o código digitado.');
          setIsSubmitting(false);
          return;
        }

        await setSharedAccessCode(accessCode, userName.trim());
        saveUserName(userName.trim());
        grantDeviceAccess();
        setIsOpen(false);
        onAccessGranted(userName.trim());
      } else {
        // Verification mode
        const isValid = await verifyAccessCode(accessCode);
        if (!isValid) {
          setErrorMsg('Código de acesso incorreto. Verifique com a coordenação técnica.');
          setIsSubmitting(false);
          return;
        }

        saveUserName(userName.trim());
        grantDeviceAccess();
        setIsOpen(false);
        onAccessGranted(userName.trim());
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao validar código.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializing || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-in">
        {/* Top Header Badge */}
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Lock className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-300 block">
                Impacto Aviation
              </span>
              <h2 className="text-lg font-bold">
                {hasConfiguredCode ? 'Controle de Acesso Compartilhado' : 'Definição do Código da Equipe'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-sky-100/90 mt-2 leading-relaxed">
            {hasConfiguredCode
              ? 'Informe o código de acesso da equipe e seu nome para carregar os registros operacionais.'
              : 'Primeira inicialização: configure o código de acesso compartilhado que será utilizado pela equipe técnica.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Name (Traceability) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-700" />
              <span>Seu Nome (Identificação para Auditoria):</span>
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ex.: Carlos Mendes - Mecânico Líder"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-600"
            />
            <span className="text-[11px] text-slate-400">
              Registrado nas ações de criação, alteração e exclusão do sistema.
            </span>
          </div>

          {/* Access Code */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-700" />
              <span>{hasConfiguredCode ? 'Código de Acesso:' : 'Criar Código de Acesso:'}</span>
            </label>
            <input
              type="password"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder={hasConfiguredCode ? 'Digite o código da equipe' : 'Mínimo 4 caracteres'}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-600 font-mono"
            />
          </div>

          {/* Confirm Code (Only in initial setup) */}
          {!hasConfiguredCode && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                <span>Confirmar Código de Acesso:</span>
              </label>
              <input
                type="password"
                required
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Repita o mesmo código"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-600 font-mono"
              />
            </div>
          )}

          {/* 30-day device memory explanation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Acesso lembrado por 30 dias</span>
            </div>
            <p className="text-slate-500 leading-snug">
              O código é armazenado como hash SHA-256 no banco e o dispositivo permanece autorizado por 30 dias. Você pode revogar o acesso em Configurações a qualquer momento.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-sky-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Verificando...' : hasConfiguredCode ? 'Entrar no Sistema' : 'Salvar Código & Entrar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
