import React, { useState } from 'react';
import { 
  Compass, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Presentation, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Play, 
  RefreshCw, 
  Sparkles, 
  Award, 
  Activity, 
  Scale, 
  FileCheck,
  Terminal,
  ChevronRight,
  HelpCircle,
  Clock,
  Eye,
  Download
} from 'lucide-react';
import { NCRecord } from '../types';

interface InteractiveTourViewProps {
  records?: NCRecord[];
  onNavigateToTab: (tabId: string) => void;
  onOpenAuditModal?: () => void;
}

type TourSection = 'fluxo-sgq' | 'aprendizagem' | 'seguranca-multitenant' | 'apresentacao-autofit' | 'redteam-sandbox';

export const InteractiveTourView: React.FC<InteractiveTourViewProps> = ({
  records = [],
  onNavigateToTab,
  onOpenAuditModal
}) => {
  const [activeSection, setActiveSection] = useState<TourSection>('fluxo-sgq');

  // Interactive Simulator States
  // 1. Risco 5x5 Simulator
  const [simSeveridade, setSimSeveridade] = useState<number>(4);
  const [simProbabilidade, setSimProbabilidade] = useState<number>(3);
  const simScore = simSeveridade * simProbabilidade;
  const simCriticidade = simScore >= 15 ? 'P1 - Crítica (24h)' : simScore >= 10 ? 'P2 - Alta (72h)' : simScore >= 5 ? 'P3 - Média (15d)' : 'P4 - Baixa (30d)';
  const simCor = simScore >= 15 ? 'text-rose-400 bg-rose-950/60 border-rose-700/60' : simScore >= 10 ? 'text-amber-400 bg-amber-950/60 border-amber-700/60' : 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60';

  // 2. Red Team Interactive Sandbox
  const [runningAttack, setRunningAttack] = useState<string | null>(null);
  const [attackLogs, setAttackLogs] = useState<Array<{ id: string; tipo: string; payload: string; resultado: 'BLOQUEADO' | 'SUCESSO'; detalhe: string }>>([
    {
      id: 'log-01',
      tipo: 'MT-01 (Cross-Tenant Infiltration)',
      payload: 'GET /organizations/org_latam_mro/nonConformities com token de org_qualigest_principal',
      resultado: 'BLOQUEADO',
      detalhe: 'Regra Firestore userBelongsToOrg() avaliada como FALSE. Retorno 403 PERMISSION_DENIED.'
    },
    {
      id: 'log-02',
      tipo: 'MT-02 (Privilege Escalation)',
      payload: 'PATCH /users/uid_auditor { role: "ADMIN" }',
      resultado: 'BLOQUEADO',
      detalhe: 'Regra users/{userId} bloqueia auto-elevação de papel. Retorno 403 PERMISSION_DENIED.'
    },
    {
      id: 'log-03',
      tipo: 'MT-03 (Audit Trail Tampering)',
      payload: 'DELETE /organizations/org_principal/auditTrails/audit_9918',
      resultado: 'BLOQUEADO',
      detalhe: 'Audit Trail é estritamente Append-Only (allow update, delete: if false). Retorno 403.'
    }
  ]);

  const handleSimularAtaque = (tipo: string, payload: string, detalhe: string) => {
    setRunningAttack(tipo);
    setTimeout(() => {
      setAttackLogs(prev => [
        {
          id: `log-${Date.now()}`,
          tipo,
          payload,
          resultado: 'BLOQUEADO',
          detalhe
        },
        ...prev
      ]);
      setRunningAttack(null);
    }, 800);
  };

  // 3. Auto-Fit Interactive Demo
  const [demoTextLength, setDemoTextLength] = useState<'curto' | 'medio' | 'extremo'>('extremo');
  const demoTexts = {
    curto: 'Discrepância dimensional constatada no bordo de ataque durante inspeção pré-voo.',
    medio: 'Discrepância dimensional recorrente identificada na longarina da asa esquerda durante a desmontagem para inspeção C-Check, exigindo NDT ultrassônico e contenção imediata com quarentena de lote.',
    extremo: 'Discrepância crítica identificada no conjunto atuador do flap esquerdo durante revisão pesada da aeronave PT-TGB. A análise causal via 5 Porquês e Ishikawa 6M evidenciou torque inadequado durante o último overhaul na oficina de componentes de terceiros, com ausência de calibração documentada no torquímetro eletrônico modelo TQ-802, descumprindo o item 4.2.1 do Manual Geral de Manutenção (MGM-01 Rev 08) e as diretrizes normativas da RBAC 145.'
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-[12px] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-[8px] bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono">
                TOUR INTERATIVO & HOMOLOGAÇÃO
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                FASE 6.2 — CERTIFICADO
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Conheça o QualiGest SGQ
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Área de demonstração técnica interativa do Sistema Integrado de Gestão e Garantia da Qualidade Aeronáutica.
              Experimente em tempo real o fluxo regulatório F 001-29, os mecanismos de proteção Multi-Tenant, o motor de aprendizagem e o gerador executivo Auto-Fit.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateToTab('apresentacao')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Apresentação Gerencial & Evolução</span>
            </button>

            <button
              onClick={() => onNavigateToTab('formulario')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Nova RNC Oficial</span>
            </button>

            <button
              onClick={() => onNavigateToTab('apresentacao')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              <Presentation className="w-4 h-4" />
              <span>Ver Apresentação PPTX</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection('fluxo-sgq')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'fluxo-sgq'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>1. Ciclo Normativo F 001-29</span>
          </button>

          <button
            onClick={() => setActiveSection('aprendizagem')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'aprendizagem'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>2. Aprendizagem N1 a N5</span>
          </button>

          <button
            onClick={() => setActiveSection('seguranca-multitenant')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'seguranca-multitenant'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>3. Multi-Tenant & RBAC</span>
          </button>

          <button
            onClick={() => setActiveSection('apresentacao-autofit')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'apresentacao-autofit'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>4. Auto-Fit PPTX Engine</span>
          </button>

          <button
            onClick={() => setActiveSection('redteam-sandbox')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
              activeSection === 'redteam-sandbox'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>5. Red Team Sandbox</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: FLUXO NORMATIVO F 001-29 INTERATIVO */}
      {activeSection === 'fluxo-sgq' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  Os 11 Blocos Normativos da Ficha Oficial F 001-29
                </h2>
                <p className="text-xs text-slate-500">
                  O padrão aeronáutico impõe rastreabilidade estrita em todas as etapas, desde a detecção até a eficácia temporal.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                100% CONFORME RBAC 145 / ANAC
              </span>
            </div>

            {/* Visual Workflow Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {[
                { step: '01', title: 'Identificação', desc: 'Origem, aeronave, prefixo, OS e criticidade preliminar.' },
                { step: '02', title: 'Matriz de Risco', desc: 'Severidade x Probabilidade (1 a 5) com P1 a P4.' },
                { step: '03', title: 'Contenção', desc: 'Disposição física imediata do material em quarentena.' },
                { step: '04', title: 'Causa Raiz', desc: '5 Porquês combinados com Ishikawa (6M aeronáutico).' },
                { step: '05', title: 'Ação Corretiva', desc: 'Plano 5W2H com prazos e responsáveis designados.' },
                { step: '06', title: 'Eficácia 90d', desc: 'Verificação em 30/60/90 dias com bloqueio de reincidência.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-[10px] bg-slate-50 border border-slate-200/80 hover:border-blue-400 transition-all">
                  <span className="text-[10px] font-mono font-bold text-blue-600 block">{item.step}</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Interactive Widget: Matriz de Risco 5x5 Simulator */}
            <div className="mt-6 p-5 rounded-[10px] bg-slate-900 text-white border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Simulador Interativo da Matriz de Risco 5x5
                  </h3>
                  <p className="text-xs text-slate-400">
                    Altere a Severidade e a Probabilidade para ver a categorização imediata do SGQ aeronáutico.
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-[8px] border text-xs font-mono font-bold ${simCor}`}>
                  Score: {simScore} | Criticidade: {simCriticidade}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Sliders */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold">Severidade (1 a 5):</span>
                      <span className="font-mono text-blue-400 font-bold">{simSeveridade}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={simSeveridade}
                      onChange={(e) => setSimSeveridade(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>1: Desprezível</span>
                      <span>3: Moderado</span>
                      <span>5: Catastrófico</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-semibold">Probabilidade (1 a 5):</span>
                      <span className="font-mono text-blue-400 font-bold">{simProbabilidade}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={simProbabilidade}
                      onChange={(e) => setSimProbabilidade(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>1: Extremamente Improvável</span>
                      <span>3: Ocasional</span>
                      <span>5: Frequente</span>
                    </div>
                  </div>
                </div>

                {/* Live Consequence Box */}
                <div className="p-4 rounded-[8px] bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">
                      Impacto Operacional & Prazos Vinculados
                    </span>
                    <p className="text-xs text-slate-200 mt-2">
                      {simScore >= 15 ? (
                        <>🚨 <strong>Notificação Imediata à Diretoria Técnica:</strong> Exige convocação de comitê de segurança de voo, emissão de alerta operacional e prazo de contenção mandatório em até 24 horas.</>
                      ) : simScore >= 10 ? (
                        <>⚠️ <strong>Acompanhamento Prioritário:</strong> Notificação ao Gestor do SGQ e contenção em 72 horas com quarentena obrigatória de peças correlatas.</>
                      ) : (
                        <>✅ <strong>Tratamento Padrão:</strong> Análise de causa raiz dentro do ciclo ordinário de manutenção (15 a 30 dias).</>
                      )}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Regra de Segurança: Bloqueio de Autoaprovação Ativo</span>
                    <button
                      onClick={() => onNavigateToTab('formulario')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Preencher no Formulário <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: APRENDIZAGEM CONTROLADA N1-N5 */}
      {activeSection === 'aprendizagem' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Ciclo de Aprendizagem Contínua: Níveis N1 a N5
                </h2>
                <p className="text-xs text-slate-500">
                  O SGQ aeronáutico evolui de Não Conformidades isoladas para Padrões Homologados com rigorosa segregação de funções.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('comparacaoRNC')}
                className="text-xs px-3 py-1.5 rounded-[6px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 cursor-pointer"
              >
                Abrir Comparador de RNCs →
              </button>
            </div>

            {/* 5 Levels Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { nivel: 'N1', titulo: 'RNC Isolada', tag: 'Dado Bruto', desc: 'Registro pontual de falha sem correlação temporal ainda estabelecida.' },
                { nivel: 'N2', titulo: 'RNC Similar', tag: 'Detecção IA', desc: 'Identificação algorítmica de causa ou sintoma semelhante em outra OS.' },
                { nivel: 'N3', titulo: 'Comparada', tag: 'Pareamento', desc: 'RNC analisada e pareada pelo Auditor na Fila de Validação.' },
                { nivel: 'N4', titulo: 'Validada', tag: 'Lição Aprendida', desc: 'Solução validada como lição aplicável a outros operadores da frota.' },
                { nivel: 'N5', titulo: 'Padrão SGQ', tag: 'Homologado', desc: 'Elevação a procedimento corporativo obrigatório com assinatura do Gestor SGQ.' },
              ].map((lvl, idx) => (
                <div key={idx} className="p-4 rounded-[10px] bg-slate-50 border border-slate-200/80 hover:border-indigo-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold font-mono text-indigo-600">{lvl.nivel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">{lvl.tag}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{lvl.titulo}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{lvl.desc}</p>
                  </div>
                  {lvl.nivel === 'N5' && (
                    <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-rose-600 font-semibold">
                      🔒 Bloqueado a autoaprovação (apenas Gestor SGQ distinto pode aprovar)
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Live Interactive Action */}
            <div className="mt-6 p-4 rounded-[8px] bg-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-indigo-800 text-indigo-200">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Experimente a Fila de Validação em Tempo Real</h4>
                  <p className="text-[11px] text-indigo-200">
                    Valide pares de RNCs, promova causas de N3 para N4 e audite as evidências de eficácia.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('validacaoQueue')}
                className="px-4 py-2 rounded-[8px] bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
              >
                Acessar Fila de Validação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MULTI-TENANT & RBAC */}
      {activeSection === 'seguranca-multitenant' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Isolamento Multi-Tenant e Matriz RBAC
                </h2>
                <p className="text-xs text-slate-500">
                  Estrutura de isolamento hermético entre operadores aeronáuticos com regras de segurança no Firestore.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                ZERO-TRUST ATIVO
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pillar A: Multi-Tenant Partitioning */}
              <div className="p-4 rounded-[10px] bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" /> Particionamento por Tenant
                </h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="p-2.5 rounded bg-white border border-slate-200 font-mono text-[11px]">
                    /organizations/<strong>{'{organizationId}'}</strong>/nonConformities/{'{ncId}'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Nenhum documento possui visibilidade global. Consultas sem o predicado de organização são sumariamente rejeitadas com erro <code>PERMISSION_DENIED</code> no Firestore.
                  </p>
                </div>
              </div>

              {/* Pillar B: RBAC Matrix */}
              <div className="p-4 rounded-[10px] bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Papéis e Atribuições
                </h3>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-800">ADMIN</span>
                    <span className="text-slate-500">Controle total da organização e configuração</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-bold text-blue-700">GESTOR_SGQ</span>
                    <span className="text-slate-500">Aprovação de eficácia, exclusão e promoção N5</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-bold text-amber-700">AUDITOR</span>
                    <span className="text-slate-500">Abertura de RNCs, investigação e pareamento</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-600">CONSULTA</span>
                    <span className="text-slate-500">Apenas leitura, sem mutação de dados</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Trail Immutability Guarantee */}
            <div className="mt-4 p-4 rounded-[8px] bg-slate-900 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono">Regra de Imutabilidade do Audit Trail</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700">
                  WRITE-ONCE APPEND-ONLY
                </span>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 mt-2 p-2.5 rounded bg-slate-950/80 border border-slate-800 overflow-x-auto">
{`match /organizations/{orgId}/auditTrails/{auditId} {
  allow get, list: if userBelongsToOrg(orgId);
  allow create: if !exists(...); // Apenas criação única
  allow update, delete: if false; // TOTALMENTE IMUTÁVEL
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: AUTO-FIT PPTX ENGINE */}
      {activeSection === 'apresentacao-autofit' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Presentation className="w-5 h-5 text-blue-600" />
                  Motor de Auto-Fit e Blindagem de Layout dos 17 Slides
                </h2>
                <p className="text-xs text-slate-500">
                  Arquitetura de renderização corporativa 16:9 imune a estouro de texto, colisões com rodapé ou sobreposição de cards.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                13.333" × 7.500" WIDESCREEN
              </span>
            </div>

            {/* Live Interactive Test of Auto-Fit Logic */}
            <div className="p-5 rounded-[10px] bg-slate-900 text-white border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  Simulador de Truncamento & Tipografia Dinâmica
                </span>
                <div className="flex items-center gap-1.5">
                  {(['curto', 'medio', 'extremo'] as const).map(len => (
                    <button
                      key={len}
                      onClick={() => setDemoTextLength(len)}
                      className={`text-xs px-2.5 py-1 rounded font-mono cursor-pointer ${
                        demoTextLength === len ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {len.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Texto Bruto ({demoTexts[demoTextLength].length} caracteres):</span>
                  <span className="font-mono text-emerald-400">
                    Envelope Seguro: Máx 170 chars / Redução de fonte para 14pt se &gt; 55 chars
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic">"{demoTexts[demoTextLength]}"</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400">
                  <span>Resultado PPTX: Zero estouro, quebra em limites de palavras (...) com margem preservada de 0.20" até o rodapé.</span>
                  <button
                    onClick={() => onNavigateToTab('apresentacao')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Gerar PPTX Real <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: RED TEAM INTERACTIVE SANDBOX */}
      {activeSection === 'redteam-sandbox' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-rose-600" />
                  Red Team Adversarial Sandbox (Cenários de Teste MT-01 a MT-08)
                </h2>
                <p className="text-xs text-slate-500">
                  Simule ataques e tentativas de violação de segurança para comprovar o bloqueio pelas regras de governança.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                AUDITORIA ADVERSARIAL HOMOLOGADA
              </span>
            </div>

            {/* Attack Launcher Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleSimularAtaque(
                  'MT-01 (Invasão Cross-Tenant)',
                  'GET /organizations/org_latam_mro/nonConformities com token de org_qualigest_principal',
                  'Regra Firestore userBelongsToOrg() avaliada como FALSE. Retorno 403 PERMISSION_DENIED imediato.'
                )}
                disabled={runningAttack !== null}
                className="p-3.5 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-left border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-rose-400 font-mono">TESTE MT-01</span>
                  <Play className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Invasão Cross-Tenant</h4>
                <p className="text-[11px] text-slate-400 mt-1">Tentativa de ler dados de outro operador aeronáutico.</p>
              </button>

              <button
                onClick={() => handleSimularAtaque(
                  'MT-02 (Elevação de Privilégio)',
                  'PATCH /users/uid_auditor { role: "ADMIN" }',
                  'Regra users/{userId} bloqueia auto-elevação de papel via token sem privilégio raiz.'
                )}
                disabled={runningAttack !== null}
                className="p-3.5 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-left border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-amber-400 font-mono">TESTE MT-02</span>
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Elevação de Privilégio</h4>
                <p className="text-[11px] text-slate-400 mt-1">Auditor tentando se autopromover para Administrador Geral.</p>
              </button>

              <button
                onClick={() => handleSimularAtaque(
                  'MT-03 (Adulteração de Audit Trail)',
                  'DELETE /organizations/org_principal/auditTrails/audit_9918',
                  'Subcoleção auditTrails é Append-Only. Tentativa de DELETE gera 403 PERMISSION_DENIED.'
                )}
                disabled={runningAttack !== null}
                className="p-3.5 rounded-[8px] bg-slate-900 hover:bg-slate-800 text-left border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-indigo-400 font-mono">TESTE MT-03</span>
                  <Play className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Adulterar Trilha de Auditoria</h4>
                <p className="text-[11px] text-slate-400 mt-1">Tentativa de expurgar registros de log de mutação.</p>
              </button>
            </div>

            {/* Live Attack Logs Terminal */}
            <div className="mt-4 p-4 rounded-[8px] bg-slate-950 text-white border border-slate-800 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="text-slate-400 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Terminal de Resposta de Segurança Zero-Trust
                </span>
                {runningAttack && (
                  <span className="text-amber-400 animate-pulse">Disparando Payload Adversarial...</span>
                )}
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {attackLogs.map(log => (
                  <div key={log.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 font-bold">{log.tipo}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                        {log.resultado}
                      </span>
                    </div>
                    <div className="text-slate-400">Payload: <code className="text-slate-200">{log.payload}</code></div>
                    <div className="text-emerald-400 mt-0.5">Evidência: {log.detalhe}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
