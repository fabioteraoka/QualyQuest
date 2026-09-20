import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Database, 
  Activity, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink,
  Lock,
  Code
} from 'lucide-react';
import { SystemArchitectureView } from './SystemArchitectureView';
import { SystemDesignerOfficialView } from './SystemDesignerOfficialView';
import { useAuth } from '../hooks/useAuth';
import { OrganizationRecord } from '../types';

interface TechnicalDiagnosticsCenterViewProps {
  organization?: OrganizationRecord | null;
  onOpenTechnicalAuditModal?: () => void;
  onOpenFirebaseDiagnosticsModal?: () => void;
  onNavigateToPresentation?: () => void;
  initialSubTab?: 'visao-geral' | 'arquitetura' | 'system-designer' | 'auditoria-tecnica' | 'infraestrutura';
}

export const TechnicalDiagnosticsCenterView: React.FC<TechnicalDiagnosticsCenterViewProps> = ({
  organization,
  onOpenTechnicalAuditModal,
  onOpenFirebaseDiagnosticsModal,
  onNavigateToPresentation,
  initialSubTab = 'visao-geral',
}) => {
  const [subTab, setSubTab] = useState<'visao-geral' | 'arquitetura' | 'system-designer' | 'auditoria-tecnica' | 'infraestrutura'>(initialSubTab);
  const { user, userProfile } = useAuth();

  const orgId = organization?.id || userProfile?.organizationId || 'org_impacto_aviation';
  const orgName = organization?.name || 'Impacto Aviation MRO';

  return (
    <div className="space-y-6">
      {/* Header do Centro de Diagnósticos Técnicos */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Cpu className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Diagnósticos Técnicos & Arquitetura</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                ADMIN / TI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ambiente de governança técnica, especificações de engenharia (ADRs), integridade do Cloud Firestore e monitoramento da infraestrutura.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenTechnicalAuditModal && (
              <button
                onClick={onOpenTechnicalAuditModal}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                <span>Modo Auditoria Técnica</span>
              </button>
            )}

            {onOpenFirebaseDiagnosticsModal && (
              <button
                onClick={onOpenFirebaseDiagnosticsModal}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>Diagnóstico Firebase</span>
              </button>
            )}
          </div>
        </div>

        {/* Subabas de Navegação Técnica */}
        <div className="flex items-center gap-1 mt-6 border-b border-slate-800 overflow-x-auto pb-0.5">
          <button
            onClick={() => setSubTab('visao-geral')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              subTab === 'visao-geral'
                ? 'bg-slate-800 text-white border-t-2 border-blue-500 border-x border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Visão Geral & Integridade</span>
          </button>

          <button
            onClick={() => setSubTab('arquitetura')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              subTab === 'arquitetura'
                ? 'bg-slate-800 text-white border-t-2 border-blue-500 border-x border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Arquitetura do Sistema</span>
          </button>

          <button
            onClick={() => setSubTab('system-designer')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              subTab === 'system-designer'
                ? 'bg-slate-800 text-white border-t-2 border-blue-500 border-x border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>System Designer (ADRs)</span>
          </button>

          <button
            onClick={() => setSubTab('infraestrutura')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              subTab === 'infraestrutura'
                ? 'bg-slate-800 text-white border-t-2 border-blue-500 border-x border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Infraestrutura & Cache</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Subaba Selecionada */}
      {subTab === 'visao-geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-Tenant Ativo</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ISOLADO
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{orgName}</p>
                <p className="text-xs font-mono text-slate-500">{orgId}</p>
              </div>
              <p className="text-xs text-slate-500">
                Todas as queries do Firestore são rigorosamente filtradas por <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">organizationId</code> garantindo isolamento estrito.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Segurança & RBAC</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {userProfile?.role || 'LOCAL'}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Perfil: {userProfile?.role || 'AUDITOR (Sessão Local)'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'Acesso Administrativo Local'}</p>
              </div>
              <p className="text-xs text-slate-500">
                Regras de Firestore ativas com validação de papéis nos níveis de leitura, escrita, aprovação e encerramento.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sincronização Cloud</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ONLINE
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Firestore em Tempo Real</p>
                <p className="text-xs text-slate-500">Persistência Cloud com fallback IndexedDB</p>
              </div>
              <p className="text-xs text-slate-500">
                Eventos de Snapshot ativos para RNCs, Pessoas, Treinamentos, Auditorias e Documentos Controlados.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Verificações Rápidas de Hardening Técnico</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Isolamento Multi-Organização:</strong>
                  <p className="text-slate-500">Coleções do Firestore com restrição por tenant ativo e chaves compostas.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Trilha de Auditoria (Audit Trail):</strong>
                  <p className="text-slate-500">Registro indelével de operações críticas (criação, edição, exclusão de RNCs e dados).</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Tolerância a Falhas & Modo Offline:</strong>
                  <p className="text-slate-500">Cache em navegador para manter a oficina operacional caso ocorra queda de link.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Integração de Inteligência Artificial:</strong>
                  <p className="text-slate-500">Módulo Gemini para extração de relatórios e assistência preditiva com fallback seguro.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'arquitetura' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <SystemArchitectureView onNavigateToPresentation={onNavigateToPresentation} />
        </div>
      )}

      {subTab === 'system-designer' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <SystemDesignerOfficialView />
        </div>
      )}

      {subTab === 'infraestrutura' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Status de Infraestrutura e Cache do Navegador</h3>
            <p className="text-xs text-slate-500">Monitoramento da pilha de tecnologia e serviços integrados ao QualiGest.</p>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  Google Cloud Firestore
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">CONECTADO</span>
              </div>
              <p className="text-xs text-slate-500">
                Banco de dados NoSQL transacional multi-tenant com replicação regional e sincronização reativa em tempo real.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-indigo-600" />
                  Ambiente de Execução
                </span>
                <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">CLOUD RUN / NODE 20</span>
              </div>
              <p className="text-xs text-slate-500">
                Container em produção com proxy reverso Nginx e porta de borda 3000 conforme padrão de implantação.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Motor de IA (Gemini 2.5)
                </span>
                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono">HABILITADO</span>
              </div>
              <p className="text-xs text-slate-500">
                Serviço de análise cognitiva e extração automatizada de RNCs com fallback local para operação sem chave.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
