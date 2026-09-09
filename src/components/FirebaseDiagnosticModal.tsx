import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { testFirestoreConnection } from '../services/firebase/config';
import {
  subscribeToSystemDiagnostics,
  createSystemDiagnostic,
  updateSystemDiagnostic,
  deleteSystemDiagnostic,
  bootstrapDemonstrationData,
  DEFAULT_ORGANIZATION_ID,
} from '../services/firebase/firestore';
import { SystemDiagnosticRecord, NCRecord, ManualRecord } from '../types';
import {
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Trash2,
  RefreshCw,
  X,
  User,
  Activity,
  Layers,
  Key,
  Edit3,
  Radio,
  Send,
  Globe,
  Lock,
  FileText,
  Clock,
  Check,
  AlertTriangle,
  Building2,
  UploadCloud,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface FirebaseDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onOpenMigration?: () => void;
  ncCount?: number;
  manualsCount?: number;
}

export const FirebaseDiagnosticModal: React.FC<FirebaseDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenMigration,
  ncCount = 0,
  manualsCount = 0,
}) => {
  const { user, userProfile, logout } = useAuth();

  // Active Organization
  const activeOrgId = userProfile?.organizationId || DEFAULT_ORGANIZATION_ID;

  // Connection status
  const [connStatus, setConnStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingConn, setTestingConn] = useState(false);

  // Real-time Firestore state
  const [diagnosticsList, setDiagnosticsList] = useState<SystemDiagnosticRecord[]>([]);
  const [isListenerActive, setIsListenerActive] = useState(false);
  const [listenerError, setListenerError] = useState<string | null>(null);

  // Operations Feedback State
  const [lastOpStatus, setLastOpStatus] = useState<{
    op: 'CREATE' | 'UPDATE' | 'DELETE' | 'PING' | 'BOOTSTRAP';
    status: 'SUCCESS' | 'ERROR';
    docId?: string;
    message: string;
    timestamp: string;
  } | null>(null);

  // Create Form State
  const [newMessage, setNewMessage] = useState('Teste de Persistência e Sincronização Multiusuário');
  const [newStatus, setNewStatus] = useState<'ATIVO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'>('ATIVO');
  const [isCreating, setIsCreating] = useState(false);

  // Bootstrap State
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [showBootstrapConfirm, setShowBootstrapConfirm] = useState(false);

  // Edit Inline State
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [editStatus, setEditStatus] = useState<string>('ATIVO');
  const [isUpdating, setIsUpdating] = useState(false);

  // Event Logs for Real-time feed
  const [eventLogs, setEventLogs] = useState<{ id: string; timestamp: string; text: string; type: 'info' | 'success' | 'warning' }[]>([]);
  const snapshotCountRef = useRef(0);

  const addEventLog = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setEventLogs((prev) => [
      { id: `${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, timestamp: time, text, type },
      ...prev.slice(0, 40),
    ]);
  };

  // ----------------------------------------------------
  // REAL-TIME LISTENER (onSnapshot) WITH CLEANUP
  // ----------------------------------------------------
  useEffect(() => {
    if (!isOpen) {
      setIsListenerActive(false);
      return;
    }

    // Ping Firestore on open
    handleTestConnection();

    if (!user) {
      setIsListenerActive(false);
      setDiagnosticsList([]);
      return;
    }

    addEventLog(`Conectando streams Firestore realtime (Org: ${activeOrgId}, UID: ${user.uid.substring(0, 8)})...`, 'info');

    // Subscribe to Firestore onSnapshot
    const unsubscribe = subscribeToSystemDiagnostics(
      (records) => {
        snapshotCountRef.current += 1;
        setDiagnosticsList(records);
        setIsListenerActive(true);
        setListenerError(null);
        addEventLog(
          `Snapshot #${snapshotCountRef.current} recebido: ${records.length} registro(s) em systemDiagnostics.`,
          'success'
        );
      },
      (error) => {
        console.error('Realtime listener error:', error);
        setIsListenerActive(false);
        setListenerError(error.message || 'Erro no listener realtime');
        addEventLog(`Falha no listener realtime: ${error.message}`, 'warning');
      }
    );

    // Unsubscribe cleanup on unmount or session switch
    return () => {
      addEventLog('Desconectando listeners realtime (cleanup).', 'info');
      unsubscribe();
      setIsListenerActive(false);
    };
  }, [isOpen, user?.uid, activeOrgId]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingConn(true);
    try {
      const res = await testFirestoreConnection();
      setConnStatus(res);
      setLastOpStatus({
        op: 'PING',
        status: res.ok ? 'SUCCESS' : 'ERROR',
        message: res.message,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
    } catch (e: any) {
      const errMsg = e?.message || 'Erro ao conectar ao Firestore';
      setConnStatus({ ok: false, message: errMsg });
      setLastOpStatus({
        op: 'PING',
        status: 'ERROR',
        message: errMsg,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
    } finally {
      setTestingConn(false);
    }
  };

  // EXPLICIT BOOTSTRAP OPERATION (ONLY BY DIRECT USER INTENT)
  const handleExecuteBootstrap = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setIsBootstrapping(true);
    setShowBootstrapConfirm(false);
    try {
      addEventLog(`Iniciando carga de dados demonstrativos na organização "${activeOrgId}"...`, 'info');
      const res = await bootstrapDemonstrationData(activeOrgId, userProfile);
      setLastOpStatus({
        op: 'BOOTSTRAP',
        status: 'SUCCESS',
        message: `Bootstrap concluído: ${res.ncsCount} Não Conformidades e ${res.manualsCount} Manuais gravados no Firestore.`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
      addEventLog(`BOOTSTRAP [SUCCESS]: ${res.ncsCount} RNCs e ${res.manualsCount} Manuais persistidos no Firestore.`, 'success');
    } catch (err: any) {
      setLastOpStatus({
        op: 'BOOTSTRAP',
        status: 'ERROR',
        message: err?.message || 'Erro ao executar carga de dados no Firestore',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
      addEventLog(`BOOTSTRAP [ERROR]: ${err?.message || err}`, 'warning');
    } finally {
      setIsBootstrapping(false);
    }
  };

  // CREATE OPERATION
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!newMessage.trim()) return;

    setIsCreating(true);
    try {
      const created = await createSystemDiagnostic({
        message: newMessage.trim(),
        status: newStatus,
      });

      setLastOpStatus({
        op: 'CREATE',
        status: 'SUCCESS',
        docId: created.testId,
        message: `Documento "${created.testId}" gravado com sucesso no Firestore.`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });

      addEventLog(`CREATE [SUCCESS]: Documento "${created.testId}" persistido no Firestore.`, 'success');
      setNewMessage('Novo teste multiusuário');
    } catch (err: any) {
      setLastOpStatus({
        op: 'CREATE',
        status: 'ERROR',
        message: err?.message || 'Falha ao criar documento no Firestore',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
      addEventLog(`CREATE [ERROR]: ${err?.message || err}`, 'warning');
    } finally {
      setIsCreating(false);
    }
  };

  // UPDATE OPERATION
  const handleStartEdit = (docItem: SystemDiagnosticRecord) => {
    setEditingTestId(docItem.testId);
    setEditMessage(docItem.message);
    setEditStatus(docItem.status);
  };

  const handleSaveEdit = async (testId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setIsUpdating(true);
    try {
      await updateSystemDiagnostic(testId, {
        message: editMessage.trim(),
        status: editStatus,
      });

      setLastOpStatus({
        op: 'UPDATE',
        status: 'SUCCESS',
        docId: testId,
        message: `Documento "${testId}" atualizado no Firestore.`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });

      addEventLog(`UPDATE [SUCCESS]: Documento "${testId}" atualizado.`, 'success');
      setEditingTestId(null);
    } catch (err: any) {
      setLastOpStatus({
        op: 'UPDATE',
        status: 'ERROR',
        docId: testId,
        message: err?.message || 'Falha ao atualizar documento',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
      addEventLog(`UPDATE [ERROR]: ${err?.message || err}`, 'warning');
    } finally {
      setIsUpdating(false);
    }
  };

  // DELETE OPERATION
  const handleDeleteTest = async (testId: string) => {
    if (!user) return;
    try {
      await deleteSystemDiagnostic(testId);

      setLastOpStatus({
        op: 'DELETE',
        status: 'SUCCESS',
        docId: testId,
        message: `Documento "${testId}" excluído do Firestore. Não será recriado no reload.`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });

      addEventLog(`DELETE [SUCCESS]: Documento "${testId}" removido do Firestore.`, 'info');
    } catch (err: any) {
      setLastOpStatus({
        op: 'DELETE',
        status: 'ERROR',
        docId: testId,
        message: err?.message || 'Falha ao excluir documento',
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });
      addEventLog(`DELETE [ERROR]: ${err?.message || err}`, 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-[12px] shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-blue-600 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Painel de Infraestrutura & Firestore SGQ</h2>
                {isListenerActive ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    FIRESTORE REALTIME: ATIVO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                    LISTENER: AGUARDANDO AUTH
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Fase 2: Cloud Firestore como Fonte Única de Verdade Multiusuário</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">

          {/* SECTION 1: TENANCY & REAL-TIME INVENTORY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Non-Conformities Counter */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-[8px] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 block">Não Conformidades (RNC)</span>
                <span className="text-xl font-bold text-blue-950 font-mono">{ncCount}</span>
                <span className="text-[10px] text-blue-600 block">no Firestore</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-700">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Manuals Counter */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-[8px] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 block">Biblioteca de Manuais</span>
                <span className="text-xl font-bold text-indigo-950 font-mono">{manualsCount}</span>
                <span className="text-[10px] text-indigo-600 block">no Firestore</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-700">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            {/* Tenant Organization */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-[8px] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">Organização (Tenant)</span>
                <span className="text-xs font-bold text-emerald-950 truncate block max-w-[140px]" title={activeOrgId}>
                  {activeOrgId}
                </span>
                <span className="text-[10px] text-emerald-600 block">Multi-tenant Isolado</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-700">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* SECTION 2: AUTHENTICATION & FIRESTORE CONFIG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Box: AUTHENTICATION */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[8px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  AUTHENTICATION & RBAC
                </span>
                {user ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                    Sessão Ativa
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full">
                    Não Autenticado
                  </span>
                )}
              </div>

              {user ? (
                <div className="space-y-1 text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 font-mono">
                  <p><span className="text-slate-400 font-sans">User:</span> <strong>{userProfile?.displayName || user.email?.split('@')[0] || 'Usuário'}</strong></p>
                  <p><span className="text-slate-400 font-sans">Email:</span> <strong className="text-slate-900">{user.email}</strong></p>
                  <p className="truncate"><span className="text-slate-400 font-sans">UID:</span> <code className="text-blue-700">{user.uid}</code></p>
                  <p><span className="text-slate-400 font-sans">Role:</span> <strong className="text-emerald-700 font-sans">{userProfile?.role || 'AUDITOR'}</strong></p>
                  <p className="truncate"><span className="text-slate-400 font-sans">Tenant:</span> <strong className="text-slate-800 font-sans">{userProfile?.organizationId || DEFAULT_ORGANIZATION_ID}</strong></p>
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => logout()}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                    >
                      Trocar de Conta (Logout)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-600">
                    Faça login com a <strong>Conta A</strong> e <strong>Conta B</strong> para validar a sincronização multiusuário real de RNCs e Manuais.
                  </p>
                  <button
                    onClick={() => { onClose(); onOpenAuth(); }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[6px] text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Entrar / Criar Conta
                  </button>
                </div>
              )}
            </div>

            {/* Box: FIREBASE & FIRESTORE CONFIG */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[8px] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  INFRAESTRUTURA FIRESTORE
                </span>
                <button
                  onClick={handleTestConnection}
                  disabled={testingConn}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${testingConn ? 'animate-spin' : ''}`} />
                  Ping
                </button>
              </div>

              <div className="space-y-1.5 text-[11px] bg-white p-2.5 rounded border border-slate-200">
                <div className="font-mono space-y-0.5 text-[10px] text-slate-600">
                  <p><span className="text-slate-400 font-sans">Project ID:</span> <strong className="text-slate-900">ai-studio-applet-webapp-bdbf6</strong></p>
                  <p className="truncate"><span className="text-slate-400 font-sans">Database:</span> <strong className="text-slate-900">ai-studio-qualigestgestode-97a188de-6117-44a7-be8d-44d92563ba38</strong></p>
                  <p><span className="text-slate-400 font-sans">Hierarchy:</span> <code className="text-blue-700 font-bold">organizations/{'{orgId}'}/nonConformities</code></p>
                </div>
                <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[11px]">
                  {connStatus?.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className={connStatus?.ok ? 'text-emerald-800 font-medium' : 'text-slate-700'}>
                    {connStatus?.message || 'Verificando conexão com Firestore...'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* SECTION 3: EXPLICIT BOOTSTRAP DEMO DATA (INTENTIONAL ONLY) */}
          <div className="p-3.5 bg-slate-900 text-white rounded-[8px] space-y-2 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-100 text-xs">Carga de Demonstração SGQ no Firestore</span>
              </div>
              <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded font-mono border border-blue-700/50">
                Ação Explícita
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O banco de dados Firestore não restaura dados automaticamente após exclusões. Caso queira popular a organização atual com os 5 exemplos de RNCs aeronáuticas e os 3 manuais padrão (MOMQ, RBAC 145 e ISO 9001), utilize o botão abaixo:
            </p>

            {!showBootstrapConfirm ? (
              <button
                type="button"
                onClick={() => setShowBootstrapConfirm(true)}
                disabled={isBootstrapping || !user}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-[6px] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Carregar Demonstração Inicial no Firestore</span>
              </button>
            ) : (
              <div className="p-2.5 bg-slate-800 rounded border border-slate-700 space-y-2">
                <p className="text-[11px] text-amber-300 font-medium">
                  Confirmar carga inicial? Isso irá gravar no Firestore da organização os registros de demonstração (com trilha de auditoria).
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExecuteBootstrap}
                    disabled={isBootstrapping}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    {isBootstrapping ? 'Gravando no Firestore...' : 'Sim, Gravar no Firestore'}
                  </button>
                  <button
                    onClick={() => setShowBootstrapConfirm(false)}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: LOCAL BROWSER RECOVERY (INDEXEDDB / LOCALSTORAGE) */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[8px] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-amber-950 text-xs">Recuperar Dados do Navegador (IndexedDB)</span>
              </div>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-semibold">
                Sincronização
              </span>
            </div>
            
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Inseriu manuais ou registros antes da atualização e a nuvem está vazia? O seu material pode estar salvo na memória local deste navegador. Utilize esta ferramenta para escanear o IndexedDB e migrar tudo para o Firestore.
            </p>

            {onOpenMigration && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMigration();
                }}
                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-[6px] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Abrir Ferramenta de Recuperação Local</span>
              </button>
            )}
          </div>

          {/* SECTION 5: LAST OPERATION FEEDBACK */}
          {lastOpStatus && (
            <div
              className={`p-3 rounded-[8px] border text-xs flex items-center justify-between ${
                lastOpStatus.status === 'SUCCESS'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {lastOpStatus.status === 'SUCCESS' ? (
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <div>
                  <span className="font-mono font-bold mr-1.5">
                    [{lastOpStatus.op}]: {lastOpStatus.status}
                  </span>
                  <span>{lastOpStatus.message}</span>
                </div>
              </div>
              <span className="font-mono text-[10px] opacity-75">{lastOpStatus.timestamp}</span>
            </div>
          )}

          {/* SECTION 5: REAL-TIME TECHNICAL DIAGNOSTIC CRUD TESTER */}
          <div className="p-4 bg-slate-900 text-white rounded-[8px] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Operação CREATE: Testador Técnico Multiusuário
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">systemDiagnostics</span>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Mensagem do Teste</label>
                  <input
                    type="text"
                    required
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ex: Mensagem gravada pela Conta A..."
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-[6px] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-[6px] text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                    <option value="CONCLUIDO">CONCLUÍDO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  O documento será gravado no Firestore e propagado via <code>onSnapshot</code>.
                </span>
                <button
                  type="submit"
                  disabled={isCreating || !user}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-[6px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Gravando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Executar CREATE</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 6: REAL-TIME SYNCED DOCUMENTS (READ / UPDATE / DELETE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Documentos Técnicos no Firestore ({diagnosticsList.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">
                Fonte: Cloud Firestore (zero cache local)
              </span>
            </div>

            {diagnosticsList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-[8px] text-center text-slate-500 text-xs space-y-1">
                <Radio className="w-6 h-6 text-slate-400 mx-auto mb-1 animate-pulse" />
                <p className="font-medium text-slate-700">Nenhum documento técnico em systemDiagnostics.</p>
                <p className="text-[11px]">
                  {user
                    ? 'Execute a operação CREATE acima para persistir um documento no banco compartilhado.'
                    : 'Faça login para visualizar e interagir com os documentos.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {diagnosticsList.map((docItem) => {
                  const isAuthor = user?.uid === docItem.createdByUid;
                  const isEditing = editingTestId === docItem.testId;

                  return (
                    <div
                      key={docItem.testId}
                      className="p-3 bg-white border border-slate-200 rounded-[8px] shadow-xs hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {docItem.testId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              docItem.status === 'CONCLUIDO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : docItem.status === 'EM_ANDAMENTO'
                                ? 'bg-blue-100 text-blue-800'
                                : docItem.status === 'CANCELADO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {docItem.status}
                          </span>
                          {isAuthor && (
                            <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-semibold">
                              Criador: Você
                            </span>
                          )}
                        </div>

                        {/* Actions: UPDATE and DELETE */}
                        <div className="flex items-center gap-1">
                          {!isEditing ? (
                            <>
                              <button
                                onClick={() => handleStartEdit(docItem)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                title="Executar operação UPDATE (teste multiusuário)"
                              >
                                <Edit3 className="w-3 h-3 text-blue-600" />
                                UPDATE
                              </button>
                              <button
                                onClick={() => handleDeleteTest(docItem.testId)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                title="Executar operação DELETE permanente no Firestore"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                DELETE
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveEdit(docItem.testId)}
                                disabled={isUpdating}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                {isUpdating ? 'Salvando...' : 'Confirmar UPDATE'}
                              </button>
                              <button
                                onClick={() => setEditingTestId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content or Edit Form */}
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-blue-300 rounded text-xs text-slate-900 focus:outline-none focus:bg-white"
                            />
                          </div>
                          <div>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-blue-300 rounded text-xs text-slate-900 focus:outline-none focus:bg-white"
                            >
                              <option value="ATIVO">ATIVO</option>
                              <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                              <option value="CONCLUIDO">CONCLUÍDO</option>
                              <option value="CANCELADO">CANCELADO</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-800 text-xs font-medium bg-slate-50/70 p-2 rounded border border-slate-100">
                          {docItem.message}
                        </p>
                      )}

                      {/* Metadata Footer */}
                      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-100 font-mono">
                        <span>
                          Criado por: <strong className="text-slate-700 font-sans">{docItem.createdByEmail}</strong> (UID: {docItem.createdByUid.substring(0, 8)}...)
                        </span>
                        <span>
                          {docItem.lastModifiedByEmail && (
                            <span className="text-blue-600 mr-2">
                              Modificado por: <strong>{docItem.lastModifiedByEmail}</strong>
                            </span>
                          )}
                          {docItem.updatedAt ? new Date(docItem.updatedAt).toLocaleTimeString('pt-BR') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 7: REAL-TIME EVENT FEED */}
          <div className="p-3 bg-slate-950 text-slate-300 rounded-[8px] border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Feed de Eventos Realtime (onSnapshot Stream)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {eventLogs.length} eventos
              </span>
            </div>

            <div className="space-y-1 font-mono text-[10px] max-h-24 overflow-y-auto pr-1">
              {eventLogs.length === 0 ? (
                <p className="text-slate-600">Nenhum evento registrado ainda.</p>
              ) : (
                eventLogs.map((ev) => (
                  <p
                    key={ev.id}
                    className={`leading-tight ${
                      ev.type === 'success'
                        ? 'text-emerald-400'
                        : ev.type === 'warning'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="text-slate-600 mr-1.5">[{ev.timestamp}]</span>
                    {ev.text}
                  </p>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Firebase Auth + Multi-tenant Firestore onSnapshot • Fase 2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-[6px] font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
