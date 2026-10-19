import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cloud,
  FileCheck2,
  KeyRound,
  Lock,
  LogOut,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getSavedUserName,
  revokeDeviceAccess,
  saveUserName,
  setSharedAccessCode,
  verifyAccessCode,
} from '../services/accessControl';
import { activeAdapter, repository, restoreOfficialBackup } from '../services/storage';
import { Configuracao, Usuario } from '../types';

export const ConfiguracoesView: React.FC = () => {
  const {
    db,
    currentUser,
    setCurrentUser,
    showToast,
    setActiveTab,
    isCloud,
    isOffline,
  } = useApp();

  const [config, setConfig] = useState<Configuracao>({ ...db.configuracao });

  // User Name (Traceability)
  const [userNameInput, setUserNameInput] = useState(getSavedUserName() || currentUser.nome);
  const [userNameSaved, setUserNameSaved] = useState(false);

  // Access Code Management
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmNewCode, setConfirmNewCode] = useState('');
  const [codeChangeError, setCodeChangeError] = useState('');
  const [codeChangeSuccess, setCodeChangeSuccess] = useState('');
  const [isChangingCode, setIsChangingCode] = useState(false);

  // Migration State
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    repository.saveConfiguracao(config, currentUser.nome);
    showToast('Configurações salvas e aplicadas em todo o sistema!');
  };

  const handleSaveUserName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNameInput.trim()) return;
    saveUserName(userNameInput.trim());
    setUserNameSaved(true);
    showToast('Nome atualizado para auditoria!');
    setTimeout(() => setUserNameSaved(false), 3000);
  };

  const handleChangeAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeChangeError('');
    setCodeChangeSuccess('');

    if (newCode.length < 4) {
      setCodeChangeError('O novo código deve possuir no mínimo 4 caracteres.');
      return;
    }

    if (newCode !== confirmNewCode) {
      setCodeChangeError('A confirmação não confere com o novo código.');
      return;
    }

    setIsChangingCode(true);
    try {
      const isCurrentValid = await verifyAccessCode(currentCode);
      if (!isCurrentValid) {
        setCodeChangeError('Código de acesso atual incorreto.');
        setIsChangingCode(false);
        return;
      }

      await setSharedAccessCode(newCode, userNameInput || currentUser.nome);
      setCodeChangeSuccess('Código de acesso alterado com sucesso! Atualizado no banco.');
      setCurrentCode('');
      setNewCode('');
      setConfirmNewCode('');
      showToast('Código de acesso atualizado com sucesso!');
    } catch (err: any) {
      setCodeChangeError(err?.message || 'Erro ao alterar código.');
    } finally {
      setIsChangingCode(false);
    }
  };

  const handleLogoutDevice = () => {
    if (confirm('Deseja realmente sair deste dispositivo? Será necessário digitar o código de acesso novamente.')) {
      revokeDeviceAccess();
      window.location.reload();
    }
  };

  const handleExecuteMigration = async () => {
    setIsMigrating(true);
    setMigrationProgress(5);
    setMigrationStatus('Iniciando transferência para o Firestore...');
    setMigrationResult(null);

    try {
      if (!activeAdapter.isCloud || !activeAdapter.migrateLocalToCloud) {
        throw new Error('O adaptador atual não está em modo Nuvem. Configure as variáveis VITE_FIREBASE_* primeiro.');
      }

      const res = await activeAdapter.migrateLocalToCloud(
        db,
        userNameInput || currentUser.nome,
        (pct, etapa) => {
          setMigrationProgress(pct);
          setMigrationStatus(etapa);
        }
      );

      setMigrationResult(`Sucesso! ${res.totalMigrados} registros foram sincronizados com o Firestore.`);
      showToast('Migração concluída com sucesso!');
    } catch (err: any) {
      setMigrationResult(`Erro na migração: ${err?.message || err}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Discreet Security Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 space-y-1">
          <span className="font-bold block">Proteção e Acesso Simplificado</span>
          <p className="leading-relaxed">
            Este sistema utiliza um modelo de <strong>acesso simplificado compartilhado</strong> (código de equipe + rastreabilidade por nome), ideal para operação ágil em hangares e bases operacionais sem fricção de senhas individuais. Para segurança reforçada baseada em login por usuário (Firebase Auth e regras <code>request.auth != null</code>), consulte a seção <strong>&quot;Evolução&quot;</strong> do README.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Configurações do Sistema &amp; Parâmetros Operacionais</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerenciamento de acesso, migração em nuvem, faixas de alerta e dados institucionais.
        </p>
      </div>

      {/* Card: Identificação para Auditoria (Seu Nome) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
          <User className="w-4 h-4 text-sky-700" />
          <span>1. Identificação do Operador (Rastreabilidade de Auditoria)</span>
        </div>
        <p className="text-xs text-slate-500">
          Informe seu nome ou cargo. Ele será gravado automaticamente em <code>atualizado_por</code> e na coleção <code>auditoria</code> a cada inserção ou modificação de dados.
        </p>
        <form onSubmit={handleSaveUserName} className="flex flex-wrap items-center gap-3 pt-1">
          <input
            type="text"
            required
            value={userNameInput}
            onChange={(e) => setUserNameInput(e.target.value)}
            placeholder="Ex.: Carlos Mendes - Mecânico Líder"
            className="flex-1 min-w-[260px] text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-600 font-medium"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Meu Nome</span>
          </button>
          {userNameSaved && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Salvo no dispositivo!</span>
            </span>
          )}
        </form>
      </div>

      {/* Card: Código de Acesso Compartilhado */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <KeyRound className="w-4 h-4 text-sky-700" />
            <span>2. Código de Acesso Compartilhado da Equipe</span>
          </div>
          <button
            onClick={handleLogoutDevice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold transition-colors cursor-pointer"
            title="Exclui o token deste navegador e solicita o código na próxima abertura"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair deste dispositivo</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          O código é armazenado como hash <strong>SHA-256</strong> em <code>configuracao/acesso</code>. Os dispositivos autorizados permanecem conectados por 30 dias.
        </p>

        {codeChangeError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{codeChangeError}</span>
          </div>
        )}

        {codeChangeSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{codeChangeSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangeAccessCode} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Código de Acesso Atual:
            </label>
            <input
              type="password"
              required
              value={currentCode}
              onChange={(e) => setCurrentCode(e.target.value)}
              placeholder="Digite o código atual"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Novo Código de Acesso:
            </label>
            <input
              type="password"
              required
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Confirmar Novo Código:
            </label>
            <input
              type="password"
              required
              value={confirmNewCode}
              onChange={(e) => setConfirmNewCode(e.target.value)}
              placeholder="Repita o novo código"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end pt-1">
            <button
              type="submit"
              disabled={isChangingCode}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5 text-sky-300" />
              <span>{isChangingCode ? 'Atualizando código...' : 'Atualizar Código da Equipe'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Card: Migração para a Nuvem Firestore */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-sky-200 pb-2">
          <div className="flex items-center gap-2 text-sky-950 font-bold text-sm">
            <Cloud className="w-4 h-4 text-sky-800" />
            <span>3. Migração de Dados Locais para a Nuvem (Firebase Firestore)</span>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isCloud ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {isCloud ? 'Firebase Configurado' : 'Modo Local (Fallback)'}
          </span>
        </div>

        <p className="text-xs text-sky-900 leading-relaxed">
          Transfere todo o banco de dados carregado no navegador diretamente para o Firestore compartilhado da organização em lotes seguros (batches de até 400 documentos). Os documentos utilizam o mesmo ID do registro, tornando a migração <strong>idempotente</strong> (não duplica se executada novamente).
        </p>

        {/* Counts preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-white p-2.5 rounded-lg border border-sky-200">
            <span className="text-slate-500 block">Pessoas / Mecânicos:</span>
            <span className="text-base font-bold text-slate-900">{db.pessoas.length}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-sky-200">
            <span className="text-slate-500 block">Licenças (ANAC/FAA):</span>
            <span className="text-base font-bold text-slate-900">{db.licencas.length}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-sky-200">
            <span className="text-slate-500 block">Treinamentos:</span>
            <span className="text-base font-bold text-slate-900">{db.treinamentos.length}</span>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-sky-200">
            <span className="text-slate-500 block">Designações Técnicas:</span>
            <span className="text-base font-bold text-slate-900">
              {db.designacoesPessoa.length + db.designacoesBase.length + db.designacoesFuncao.length + db.designacoesAeronave.length}
            </span>
          </div>
        </div>

        {/* Migration Action Button */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowMigrationModal(true)}
            disabled={!isCloud || isMigrating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-sky-300" />
            <span>Migrar dados locais para a nuvem</span>
          </button>

          {!isCloud && (
            <span className="text-xs text-amber-800 font-semibold">
              (Disponível quando as variáveis VITE_FIREBASE_* estiverem configuradas no ambiente)
            </span>
          )}
        </div>

        {/* Migration Modal */}
        {showMigrationModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 text-sky-950 font-bold text-base">
                <Cloud className="w-5 h-5 text-sky-800" />
                <span>Confirmar Migração para Nuvem</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Você está prestes a transferir <strong>{db.pessoas.length} colaboradores</strong>, <strong>{db.treinamentos.length} treinamentos</strong> e todas as designações da memória deste navegador para o banco Firestore compartilhado.
              </p>

              {isMigrating && (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>{migrationStatus}</span>
                    <span>{migrationProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-sky-800 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${migrationProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {migrationResult && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                  {migrationResult}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMigrationModal(false)}
                  disabled={isMigrating}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMigration}
                  disabled={isMigrating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isMigrating ? 'Gravando lotes...' : 'Confirmar & Gravar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Card: Faixas de Alerta */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>4. Faixas de Alerta de Vencimento (Dias)</span>
          </div>

          <p className="text-xs text-slate-500">
            A alteração dos valores numéricos atualiza imediatamente os rótulos (ex.: &quot;≤30d&quot;), cores e contagens de todos os relatórios e do Dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                1ª Faixa (Laranja / Alerta Imediato):
              </label>
              <input
                type="number"
                min="1"
                max="365"
                required
                value={config.faixa_1}
                onChange={(e) => setConfig({ ...config, faixa_1: parseInt(e.target.value) || 30 })}
                className="w-full text-xs p-2 bg-orange-50/50 border border-orange-300 rounded font-mono font-bold text-orange-950"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Padrão: 30 dias</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                2ª Faixa (Amarelo / Alerta Médio):
              </label>
              <input
                type="number"
                min="1"
                max="365"
                required
                value={config.faixa_2}
                onChange={(e) => setConfig({ ...config, faixa_2: parseInt(e.target.value) || 60 })}
                className="w-full text-xs p-2 bg-yellow-50/50 border border-yellow-300 rounded font-mono font-bold text-yellow-950"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Padrão: 60 dias</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                3ª Faixa (Amarelo Claro / Planejamento):
              </label>
              <input
                type="number"
                min="1"
                max="365"
                required
                value={config.faixa_3}
                onChange={(e) => setConfig({ ...config, faixa_3: parseInt(e.target.value) || 90 })}
                className="w-full text-xs p-2 bg-amber-50/50 border border-amber-300 rounded font-mono font-bold text-amber-950"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Padrão: 90 dias</span>
            </div>
          </div>
        </div>

        {/* Card: Parâmetros Institucionais */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
            <FileCheck2 className="w-4 h-4 text-sky-700" />
            <span>5. Dados Institucionais &amp; Parâmetros de Impressão</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Data de Referência (Simulações e Auditoria):
              </label>
              <input
                type="date"
                required
                value={config.data_referencia}
                onChange={(e) => setConfig({ ...config, data_referencia: e.target.value })}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Padrão da auditoria: 15/10/2026
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Responsável Técnico Oficial:
              </label>
              <input
                type="text"
                required
                value={config.responsavel_tecnico}
                onChange={(e) => setConfig({ ...config, responsavel_tecnico: e.target.value })}
                placeholder="Ex.: Alysson Rabelo - Technical Responsible"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Impresso no rodapé da Lista de Designação
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Limite de Linhas por Página A4 (Alerta):
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={config.limite_linhas_pagina}
                onChange={(e) =>
                  setConfig({ ...config, limite_linhas_pagina: parseInt(e.target.value) || 40 })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Recomendado para caber em 1 página: 40 linhas
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Destacar Vencimentos na Lista de Designação:
              </label>
              <select
                value={config.destacar_vencimentos_padrao ? 'SIM' : 'NAO'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    destacar_vencimentos_padrao: e.target.value === 'SIM',
                  })
                }
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              >
                <option value="SIM">SIM (Cores de alerta ativadas por padrão)</option>
                <option value="NAO">NÃO (Impressão monocromática formal)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card: Perfis de Usuário */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
            <Shield className="w-4 h-4 text-sky-700" />
            <span>6. Controle de Perfis e Permissões (RBAC)</span>
          </div>

          <p className="text-xs text-slate-500">
            Alterne o usuário ativo no canto superior direito para testar os perfis de acesso:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {db.usuarios.map((u) => {
              const isSelected = currentUser.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => setCurrentUser(u)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-50 border-sky-600 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{u.nome}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        u.perfil === 'Admin'
                          ? 'bg-purple-100 text-purple-900'
                          : u.perfil === 'Editor'
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.perfil}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">{u.email}</div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    {u.perfil === 'Admin' && 'Permissão total (cadastro, faixas, auditoria)'}
                    {u.perfil === 'Editor' && 'CRUD de licenças, treinamentos e pessoas'}
                    {u.perfil === 'Leitor' && 'Somente consulta e impressão de relatórios'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card: Restauração da Base Oficial */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-sky-700" />
            <span>7. Base Oficial Salva &amp; Restauração</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Restaure a cópia oficial auditada salva anteriormente na máquina ou recarregue a qualquer momento.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={async () => {
                if (confirm('Deseja restaurar a última base oficial salva?')) {
                  const ok = await restoreOfficialBackup(userNameInput || currentUser.nome);
                  if (ok) showToast('Base oficial restaurada com sucesso!');
                  else alert('Falha ao restaurar base oficial.');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Base Oficial de Referência</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('importar')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            >
              <span>Gerenciar Importação &amp; Exportação (.json / .xlsx)</span>
            </button>
          </div>
        </div>

        {currentUser.perfil !== 'Leitor' && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-900 text-white rounded-xl text-xs font-semibold hover:bg-sky-800 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações Globais</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
