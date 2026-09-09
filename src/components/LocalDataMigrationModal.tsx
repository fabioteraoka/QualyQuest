import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Database,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  BookOpen,
  Layers,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  HardDrive,
  User,
  ExternalLink,
} from 'lucide-react';
import { ManualRecord, NCRecord, UserProfile } from '../types';
import { detectLocalMaterial, migrateLocalDataToFirestore, LocalDataSummary } from '../services/localDataMigration';

interface LocalDataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrgId: string;
  userProfile?: UserProfile | null;
  currentRecords?: NCRecord[];
  currentManuals?: ManualRecord[];
  onOpenAuthModal?: () => void;
  onMigrationComplete?: () => void;
}

export const LocalDataMigrationModal: React.FC<LocalDataMigrationModalProps> = ({
  isOpen,
  onClose,
  activeOrgId,
  userProfile,
  currentRecords = [],
  currentManuals = [],
  onOpenAuthModal,
  onMigrationComplete,
}) => {
  const [scanning, setScanning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [summary, setSummary] = useState<LocalDataSummary | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });
  const [migrationResult, setMigrationResult] = useState<{
    manualsMigrated: number;
    recordsMigrated: number;
    errors: string[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'manuais' | 'rncs'>('manuais');
  const [forceAll, setForceAll] = useState(true);

  // Scan local data when opened
  useEffect(() => {
    if (!isOpen) return;

    const runScan = async () => {
      setScanning(true);
      setMigrationResult(null);
      try {
        const detected = await detectLocalMaterial(currentRecords, currentManuals);
        setSummary(detected);
        if (detected.localManuals.length === 0 && detected.localRecords.length > 0) {
          setActiveTab('rncs');
        }
      } catch (err) {
        console.error('Erro ao verificar dados locais:', err);
      } finally {
        setScanning(false);
      }
    };

    runScan();
  }, [isOpen, currentRecords.length, currentManuals.length]);

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    if (!userProfile) {
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        alert('É necessário estar autenticado para salvar dados no Cloud Firestore.');
      }
      return;
    }

    setMigrating(true);
    setProgressMsg('Iniciando sincronização com o banco em nuvem...');
    setMigrationResult(null);

    try {
      const result = await migrateLocalDataToFirestore(activeOrgId, userProfile, {
        forceMigrateAll: forceAll,
        onProgress: (msg, current, total) => {
          setProgressMsg(msg);
          setProgressCount({ current, total });
        },
      });

      setMigrationResult(result);
      if (onMigrationComplete) {
        onMigrationComplete();
      }
    } catch (err: any) {
      console.error('Erro durante a migração:', err);
      alert(`Falha na migração: ${err?.message || err}`);
    } finally {
      setMigrating(false);
    }
  };

  const totalToMigrate = forceAll
    ? (summary?.localManuals.length || 0) + (summary?.localRecords.length || 0)
    : (summary?.unmigratedManuals.length || 0) + (summary?.unmigratedRecords.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recuperar Dados do Navegador</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Sincronize manuais e RNCs do armazenamento local (IndexedDB) para o Cloud Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={migrating}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-semibold text-sm text-blue-950 mb-1">
                Como funciona a recuperação do seu material:
              </p>
              Nas versões anteriores à sincronização multiusuário, manuais e RNCs eram guardados diretamente na memória do navegador. Esta ferramenta localiza esse acervo e transfere cópias completas para a organização <strong className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-950">{activeOrgId}</strong> no Cloud Firestore.
            </div>
          </div>

          {/* User auth requirement check */}
          {!userProfile ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold text-amber-950">Acesso Restrito: Autenticação Necessária</p>
                  Para salvar material no banco de dados na nuvem, você precisa estar conectado à sua conta com permissões de administrador.
                </div>
              </div>
              {onOpenAuthModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer"
                >
                  Fazer Login
                </button>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  Autenticado como: <strong>{userProfile.email}</strong> ({userProfile.role})
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                Nuvem Pronta
              </span>
            </div>
          )}

          {/* Scanning or results */}
          {scanning ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-700">Examinando armazenamento local e IndexedDB...</p>
            </div>
          ) : summary && (
            <div className="space-y-4">
              {/* Counter pills */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('manuais')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    activeTab === 'manuais'
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Manuais Locais
                    </span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {summary.localManuals.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {summary.unmigratedManuals.length > 0
                      ? `${summary.unmigratedManuals.length} ainda não sincronizados na nuvem`
                      : 'Disponíveis no navegador'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rncs')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    activeTab === 'rncs'
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      RNCs Locais
                    </span>
                    <span className="text-base font-bold text-slate-900 font-mono">
                      {summary.localRecords.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {summary.unmigratedRecords.length > 0
                      ? `${summary.unmigratedRecords.length} ainda não sincronizados na nuvem`
                      : 'Disponíveis no navegador'}
                  </p>
                </button>
              </div>

              {/* Items List for inspection */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>
                    {activeTab === 'manuais' ? 'Manuais encontrados no dispositivo' : 'Não Conformidades locais'}
                  </span>
                  <span className="text-slate-500 font-normal">
                    {activeTab === 'manuais' ? summary.localManuals.length : summary.localRecords.length} item(ns)
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {activeTab === 'manuais' ? (
                    summary.localManuals.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Nenhum manual encontrado no armazenamento deste navegador.
                      </div>
                    ) : (
                      summary.localManuals.map((m) => (
                        <div key={m.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold text-slate-900 truncate">
                                <span className="font-mono text-blue-700">{m.codigo}</span> - {m.titulo}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Revisão: {m.revisao} • {m.capitulos?.length || 0} capítulos • Arquivo: {m.arquivoNome || 'PDF/Doc'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded shrink-0">
                            {m.status || 'Disponível'}
                          </span>
                        </div>
                      ))
                    )
                  ) : (
                    summary.localRecords.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Nenhuma RNC encontrada no armazenamento deste navegador.
                      </div>
                    ) : (
                      summary.localRecords.map((r) => (
                        <div key={r.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold text-slate-900 truncate">
                                <span className="font-mono text-indigo-700">#{r.numeroNC}</span> - {r.titulo}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Setor: {r.setor} • Risco: {r.avaliacaoRiscoInicial?.codigo || 'N/A'} • Status: {r.statusGeral}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded shrink-0">
                            {r.statusGeral}
                          </span>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>

              {/* Migration Result Message */}
              {migrationResult && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Sincronização Concluída com Sucesso!
                  </div>
                  <p className="text-xs text-emerald-800">
                    Foram transferidos para o Cloud Firestore da organização <strong>{activeOrgId}</strong>:{' '}
                    <strong>{migrationResult.manualsMigrated}</strong> manual(is) e{' '}
                    <strong>{migrationResult.recordsMigrated}</strong> Não Conformidade(s).
                  </p>
                  {migrationResult.errors.length > 0 && (
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-100/50 p-2 rounded">
                      <strong>Avisos durante a transferência:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {migrationResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Progress during execution */}
              {migrating && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-950">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      Gravando no Cloud Firestore...
                    </span>
                    <span className="font-mono">
                      {progressCount.current} de {progressCount.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                      style={{
                        width: `${progressCount.total > 0 ? (progressCount.current / progressCount.total) * 100 : 15}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-blue-700 truncate">{progressMsg}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {summary?.totalLocalItems ? (
              <span>
                Total no dispositivo: <strong>{summary.totalLocalItems}</strong> registros
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              disabled={migrating}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {migrationResult ? 'Fechar' : 'Cancelar'}
            </button>

            <button
              onClick={handleStartMigration}
              disabled={migrating || scanning || !summary || totalToMigrate === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {migrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  Transferir Tudo para a Nuvem ({totalToMigrate})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
