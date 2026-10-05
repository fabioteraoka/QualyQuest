import React, { useState } from 'react';
import {
  Compass,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Cpu,
  BookOpen,
  Award,
  Globe,
  Sliders,
  Scale,
  Sparkles,
  HelpCircle,
  FileText,
  Building2,
  Lock,
  ChevronRight,
  Info,
  ChevronDown,
  Target,
  Filter,
  Check,
  Zap,
  Users,
  Eye,
  GitBranch,
  Search,
  ExternalLink,
  Presentation
} from 'lucide-react';
import { OrganizationRecord } from '../types';

interface VisionAndRoadmapViewProps {
  organization?: OrganizationRecord | null;
  onNavigateToTab?: (tab: string) => void;
}

type Language = 'PT' | 'EN' | 'ES';
type SectionTab = 
  | 'visao' 
  | 'principios' 
  | 'arquitetura' 
  | 'pilares' 
  | 'maturidade' 
  | 'roadmap' 
  | 'framework' 
  | 'priorizacao';

export const VisionAndRoadmapView: React.FC<VisionAndRoadmapViewProps> = ({
  organization,
  onNavigateToTab,
}) => {
  const [lang, setLang] = useState<Language>('PT');
  const [activeTab, setActiveTab] = useState<SectionTab>('visao');
  const [filterPilar, setFilterPilar] = useState<string>('TODOS');
  const [expandedPilar, setExpandedPilar] = useState<number | null>(null);
  const [expandedPrinciple, setExpandedPrinciple] = useState<number | null>(null);

  const orgName = organization?.name || 'QualiGest SGQ Enterprise';

  // Dicionário i18n essencial
  const t = {
    PT: {
      badge: 'FASE 15 — VISÃO MESTRE, ARQUITETURA & ROADMAP ESTRATÉGICO',
      title: 'Visão Mestre, Arquitetura e Roadmap Estratégico',
      subtitle: 'Diretrizes permanentes de governança, princípios de engenharia da qualidade e evolução contínua do QualiGest SGQ.',
      principleQuote: '“O objetivo não é criar mais controles. É transformar os controles existentes em informação útil para tomar melhores decisões.”',
      operationalQuote: '“Qualidade sem atrito: aumentar controle, conformidade, segurança e aprendizado sem travar a operação.”',
      tabVision: 'Visão do Produto & Escopo',
      tabPrinciples: '10 Princípios do QualiGest',
      tabArch: 'Mapa Mestre de Arquitetura',
      tabPillars: '12 Pilares de Evolução',
      tabMaturity: 'Níveis de Maturidade (1 a 6)',
      tabRoadmap: 'Roadmap Estratégico',
      tabFramework: 'Framework Regulatório',
      tabPriority: 'Matriz de Priorização',
      btnPresentation: 'Apresentação Gerencial',
      btnManual: 'Manual de Utilização',
      btnArchitecture: 'Diagrama Técnico',
      implemented: 'IMPLEMENTADO',
      inHomologation: 'EM HOMOLOGAÇÃO',
      planned: 'PLANEJADO',
      future: 'FUTURO',
    },
    EN: {
      badge: 'PHASE 12 — MASTER VISION & ARCHITECTURE',
      title: 'Master Vision, Architecture & Strategic Roadmap',
      subtitle: 'Permanent governance guidelines, quality engineering principles, and continuous evolution of QualiGest QMS.',
      principleQuote: '“The goal is not to create more controls. It is to transform existing controls into actionable information to make better decisions.”',
      operationalQuote: '“Frictionless Quality: increase control, compliance, safety, and learning without grinding operations to a halt.”',
      tabVision: 'Product Vision & Scope',
      tabPrinciples: '10 QualiGest Principles',
      tabArch: 'Master Architecture Map',
      tabPillars: '12 Evolution Pillars',
      tabMaturity: 'Maturity Levels (1 to 6)',
      tabRoadmap: 'Strategic Roadmap',
      tabFramework: 'Regulatory Framework',
      tabPriority: 'Prioritization Matrix',
      btnPresentation: 'Executive Presentation',
      btnManual: 'User Manual',
      btnArchitecture: 'Technical Diagram',
      implemented: 'IMPLEMENTED',
      inHomologation: 'IN HOMOLOGATION',
      planned: 'PLANNED',
      future: 'FUTURE',
    },
    ES: {
      badge: 'FASE 12 — VISIÓN MAESTRA Y ARQUITECTURA',
      title: 'Visión Maestra, Arquitectura y Hoja de Ruta Estratégica',
      subtitle: 'Directrices permanentes de gobernanza, principios de ingeniería de calidad y evolución continua de QualiGest SGQ.',
      principleQuote: '“El objetivo no es crear más controles. Es transformar los controles existentes en información útil para tomar mejores decisiones.”',
      operationalQuote: '“Calidad sin fricción: aumentar control, conformidad, seguridad y aprendizaje sin trabar la operación.”',
      tabVision: 'Visión del Producto y Alcance',
      tabPrinciples: '10 Principios de QualiGest',
      tabArch: 'Mapa Maestro de Arquitectura',
      tabPillars: '12 Pilares de Evolución',
      tabMaturity: 'Niveles de Madurez (1 a 6)',
      tabRoadmap: 'Hoja de Ruta Estratégica',
      tabFramework: 'Marco Regulatorio',
      tabPriority: 'Matriz de Priorización',
      btnPresentation: 'Presentación Ejecutiva',
      btnManual: 'Manual de Usuario',
      btnArchitecture: 'Diagrama Técnico',
      implemented: 'IMPLEMENTADO',
      inHomologation: 'EN HOMOLOGACIÓN',
      planned: 'PLANIFICADO',
      future: 'FUTURO',
    },
  }[lang];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Master Header Card */}
      <div className="bg-slate-900 text-white rounded-[12px] p-6 sm:p-8 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                {t.badge}
              </span>
              <span className="text-xs text-slate-400">• Tenant: <strong className="text-white">{orgName}</strong></span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t.title}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Language Selector + Quick Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              {(['PT', 'EN', 'ES'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    lang === l ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {onNavigateToTab && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateToTab('apresentacao')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abrir apresentação gerencial com slides e gráficos reais"
                >
                  <Presentation className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t.btnPresentation}</span>
                </button>
                <button
                  onClick={() => onNavigateToTab('manual-utilizacao')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.btnManual}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quotes Strip */}
        <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5 text-blue-200 bg-blue-950/40 p-3 rounded-lg border border-blue-900/60">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white uppercase tracking-wider text-[10px]">Princípio Central do Projeto</span>
              <p className="italic text-slate-300 mt-0.5">{t.principleQuote}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-emerald-200 bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/60">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white uppercase tracking-wider text-[10px]">Princípio Operacional</span>
              <p className="italic text-slate-300 mt-0.5">{t.operationalQuote}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 bg-white p-2 rounded-[10px] shadow-xs">
        {[
          { id: 'visao', label: t.tabVision, icon: <Compass className="w-4 h-4" /> },
          { id: 'principios', label: t.tabPrinciples, icon: <Award className="w-4 h-4" /> },
          { id: 'arquitetura', label: t.tabArch, icon: <Layers className="w-4 h-4" /> },
          { id: 'pilares', label: t.tabPillars, icon: <Target className="w-4 h-4" /> },
          { id: 'maturidade', label: t.tabMaturity, icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'roadmap', label: t.tabRoadmap, icon: <GitBranch className="w-4 h-4" /> },
          { id: 'framework', label: t.tabFramework, icon: <Globe className="w-4 h-4" /> },
          { id: 'priorizacao', label: t.tabPriority, icon: <Scale className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SectionTab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: VISÃO & O QUE NÃO É */}
      {activeTab === 'visao' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Card: O que é vs O que NÃO é */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* O QUE É */}
            <div className="bg-white border-2 border-emerald-200 rounded-[12px] p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">O que é o QualiGest SGQ</h2>
                    <p className="text-xs text-slate-500">Escopo Primário e Missão do Sistema</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  O <strong>QualiGest SGQ</strong> é uma plataforma integrada para gestão da <strong>qualidade, conformidade, riscos, auditorias, não conformidades, competências, documentação, evidências, conhecimento organizacional e melhoria contínua</strong>.
                </p>

                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block">Principais Capacidades Ativas:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>RNCs & Formulário Oficial F 001-29</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Auditorias Externas & Findings</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Controle Documental & Revisões</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Pessoas, Matriz CHT & Gaps</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Governança Multi-Tenant & RBAC</span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>Copiloto IA sob Governança Humana</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-100 text-xs text-emerald-800 font-medium">
                Construído para garantir conformidade contínua com ANAC RBAC 145, EASA Part-145, FAA e ISO 9001.
              </div>
            </div>

            {/* O QUE NÃO É */}
            <div className="bg-white border-2 border-rose-200 rounded-[12px] p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">O que o QualiGest NÃO pretende ser</h2>
                    <p className="text-xs text-slate-500">Fronteiras Arquiteturais Estritas (Fora de Escopo)</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  O QualiGest <strong>não deve tentar substituir todos os sistemas operacionais</strong> da organização. Qualquer função que não tenha relação direta com gestão, garantia, controle, conformidade, risco, evidência ou melhoria da qualidade <strong>não pertence ao QualiGest</strong>.
                </p>

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900 space-y-1.5">
                  <span className="font-bold block uppercase tracking-wider text-[10px] text-rose-950">Exclusões Rígidas do Escopo:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className="flex items-center gap-1.5">✕ CAMO (Aeronavegabilidade Contínua)</span>
                    <span className="flex items-center gap-1.5">✕ Gerenciamento de Frota / Aeronaves</span>
                    <span className="flex items-center gap-1.5">✕ Cumprimento de AD / DA e SB</span>
                    <span className="flex items-center gap-1.5">✕ Vistorias de Pré-compra de Aeronaves</span>
                    <span className="flex items-center gap-1.5">✕ ERP de Manutenção Geral</span>
                    <span className="flex items-center gap-1.5">✕ Controle de OS de Produção</span>
                    <span className="flex items-center gap-1.5">✕ Horas e Ciclos de Motores</span>
                    <span className="flex items-center gap-1.5">✕ Módulos Operacionais de Hangar</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-rose-100 text-xs text-rose-800 font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Diretriz: Estes temas pertencem a sistemas dedicados e não serão implementados no QualiGest.</span>
              </div>
            </div>
          </div>

          {/* Ciclo de Vida do Projeto */}
          <div className="bg-slate-50 border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-600" />
              <span>O Ciclo de Evolução Obrigatório do QualiGest</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Nenhuma funcionalidade é criada por simples interesse técnico. O QualiGest segue o ciclo disciplinado:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2 text-center text-xs font-semibold">
              {[
                { n: '1', name: 'Visão' },
                { n: '2', name: 'Necessidade' },
                { n: '3', name: 'Prioridade' },
                { n: '4', name: 'Arquitetura' },
                { n: '5', name: 'Implementação' },
                { n: '6', name: 'Teste' },
                { n: '7', name: 'Homologação' },
                { n: '8', name: 'Uso Real' },
                { n: '9', name: 'Medição' },
                { n: '10', name: 'Melhoria' },
                { n: '11', name: 'Documentação' },
              ].map((step, idx) => (
                <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col justify-center">
                  <span className="text-[10px] text-blue-600 font-mono font-bold">{step.n}</span>
                  <span className="text-slate-800 text-[11px] mt-0.5">{step.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 10 PRINCÍPIOS DO QUALIGEST */}
      {activeTab === 'principios' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Princípios Inegociáveis de Arquitetura e Engenharia:</strong>
              Estes 10 princípios orientam todas as decisões de código, experiência do usuário, integridade de dados e auditoria no sistema.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                num: '4.1',
                title: 'Qualidade sem atrito operacional',
                icon: <Zap className="w-5 h-5 text-amber-500" />,
                desc: 'O sistema deve aumentar controle, conformidade, segurança e capacidade de decisão sem criar burocracia desnecessária. Toda tela deve justificar seu valor para quem preenche.',
              },
              {
                num: '4.2',
                title: 'Controle proporcional ao risco',
                icon: <Scale className="w-5 h-5 text-blue-500" />,
                desc: 'Quanto maior o risco, maior o nível de controle. Processos de baixo impacto operacional não devem receber a mesma complexidade imposta a processos de alta criticidade de segurança.',
              },
              {
                num: '4.3',
                title: 'Evidência acima de opinião',
                icon: <FileText className="w-5 h-5 text-emerald-500" />,
                desc: 'Decisões importantes na Qualidade devem ser sustentadas por fatos, métricas consolidadas e registros rastreáveis, nunca por impressões subjetivas.',
              },
              {
                num: '4.4',
                title: 'Rastreabilidade ponta a ponta',
                icon: <Clock className="w-5 h-5 text-purple-500" />,
                desc: 'Informações críticas devem permitir reconstruir com precisão matemática: quem realizou, o quê, quando, por quê, qual decisão foi tomada, qual evidência embasou e qual o resultado obtido.',
              },
              {
                num: '4.5',
                title: 'Melhoria contínua',
                icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
                desc: 'Uma não conformidade não é apenas um registro a ser fechado burocraticamente. Deve gerar aprendizado institucional, medidas preventivas e enriquecimento da base de conhecimento.',
              },
              {
                num: '4.6',
                title: 'Humano no controle (Governança de IA)',
                icon: <ShieldCheck className="w-5 h-5 text-rose-500" />,
                desc: 'A IA apoia a Qualidade sugerindo, comparando, identificando padrões e resumindo. A IA NUNCA transforma hipótese em fato, causa raiz, aprovação ou norma oficial sem chancela humana qualificada.',
              },
              {
                num: '4.7',
                title: 'Simplicidade na resolução',
                icon: <Sparkles className="w-5 h-5 text-cyan-500" />,
                desc: 'Se duas soluções forem igualmente seguras e eficazes, preferir estritamente a mais simples. Evitar o acúmulo de artefatos desnecessários.',
              },
              {
                num: '4.8',
                title: 'Escalabilidade e Neutralidade',
                icon: <Globe className="w-5 h-5 text-teal-500" />,
                desc: 'Construir módulos neutros que possam ser utilizados por qualquer oficina aeronáutica ou centro de serviços sem carregar regras locais amarradas ao código-fonte.',
              },
              {
                num: '4.9',
                title: 'Segurança e Isolamento por padrão',
                icon: <Lock className="w-5 h-5 text-slate-700" />,
                desc: 'Falhas de autenticação, perfil ou organização nunca devem resultar em elevação de privilégios ou vazamento de dados entre empresas (isolamento estrito multi-tenant no Firestore).',
              },
              {
                num: '4.10',
                title: 'Dados conectados em cadeia contínua',
                icon: <GitBranch className="w-5 h-5 text-blue-600" />,
                desc: 'Sempre que fizer sentido, informações relacionadas devem se conectar: Requisito → Processo → Documento → Pessoa → Auditoria → RNC → Risco → Ação → Eficácia → Conhecimento → Melhoria.',
              },
            ].map((p) => (
              <div
                key={p.num}
                className="bg-white border border-slate-200 rounded-[10px] p-5 shadow-xs hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                      {p.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">Princípio {p.num}</span>
                      <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-2 pl-1">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MAPA MESTRE DE ARQUITETURA */}
      {activeTab === 'arquitetura' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Visual Diagram Block */}
          <div className="bg-slate-950 text-white rounded-[12px] p-6 sm:p-8 border border-slate-800 shadow-md">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 mb-2">
              DIAGRAMA ESTRUTURAL DO PRODUTO
            </h3>
            <h2 className="text-xl font-extrabold text-white mb-6">
              Arquitetura Funcional QualiGest SGQ
            </h2>

            {/* Tree ASCII Visual representation in Styled Cards */}
            <div className="flex flex-col items-center max-w-2xl mx-auto space-y-4">
              {/* Root Node */}
              <div className="px-6 py-3 bg-blue-600 text-white font-extrabold text-sm rounded-xl shadow-lg border border-blue-400 text-center tracking-wider">
                QUALIGEST SGQ
              </div>

              <div className="w-0.5 h-6 bg-slate-700" />

              {/* Split Branches */}
              <div className="grid grid-cols-2 gap-8 w-full">
                {/* Branch Left: GESTÃO */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-full py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-xs text-blue-300">
                    GESTÃO DA QUALIDADE
                  </div>
                  <div className="w-0.5 h-4 bg-slate-700" />
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded text-center text-[11px] font-mono text-slate-300">
                      RNC (F 001-29)
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded text-center text-[11px] font-mono text-slate-300">
                      AUDITORIA
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded text-center text-[11px] font-mono text-slate-300">
                      DOCS & REVISÕES
                    </div>
                  </div>
                </div>

                {/* Branch Right: INTELIGÊNCIA */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-full py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-xs text-indigo-300">
                    INTELIGÊNCIA & GOVERNANÇA
                  </div>
                  <div className="w-0.5 h-4 bg-slate-700" />
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded text-center text-[11px] font-mono text-slate-300">
                      DADOS REAIS
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded text-center text-[11px] font-mono text-slate-300">
                      IA COPILOT
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded text-center text-[11px] font-mono text-slate-300">
                      CONHECIMENTO
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-0.5 h-6 bg-slate-700" />

              {/* Convergence Node */}
              <div className="px-6 py-2.5 bg-emerald-600/20 border border-emerald-500 text-emerald-300 font-bold text-xs rounded-lg shadow-sm text-center">
                MELHORIA CONTÍNUA (PDCA & CAPA)
              </div>
            </div>
          </div>

          {/* Modelo de Relacionamento e Cadeia de Dados Conectados */}
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Cadeia de Rastreabilidade Integrada (13 Elos)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-6">
              A arquitetura conceitual do QualiGest conecta requisitos regulatórios ao resultado final de aprendizado organizacional, sem criar links artificiais ou relações desnecessárias no banco de dados.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {[
                { elo: '1. REQUISITO', desc: 'Norma ANAC, EASA, FAA ou ISO', color: 'bg-slate-100 text-slate-800' },
                { elo: '2. APLICABILIDADE', desc: 'Setor, frota ou posto', color: 'bg-slate-100 text-slate-800' },
                { elo: '3. PROCESSO', desc: 'Fluxo operacional formal', color: 'bg-slate-100 text-slate-800' },
                { elo: '4. DOCUMENTO', desc: 'Manual controlado AMM/MOE', color: 'bg-blue-50 text-blue-900 border-blue-200' },
                { elo: '5. PESSOA / CHT', desc: 'Técnico e competências', color: 'bg-blue-50 text-blue-900 border-blue-200' },
                { elo: '6. AUDITORIA', desc: 'Inspeção interna ou externa', color: 'bg-purple-50 text-purple-900 border-purple-200' },
                { elo: '7. CONSTATAÇÃO', desc: 'Finding ou não conformidade', color: 'bg-amber-50 text-amber-900 border-amber-200' },
                { elo: '8. RNC (F 001-29)', desc: 'Registro de contenção e causa', color: 'bg-rose-50 text-rose-900 border-rose-200' },
                { elo: '9. RISCO 5x5', desc: 'Severidade x Probabilidade', color: 'bg-rose-50 text-rose-900 border-rose-200' },
                { elo: '10. AÇÃO 5W2H', desc: 'Plano corretivo com SLA', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
                { elo: '11. EFICÁCIA', desc: 'Auditoria após 30-60 dias', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
                { elo: '12. EVIDÊNCIA', desc: 'Arquivo, foto e assinatura', color: 'bg-cyan-50 text-cyan-900 border-cyan-200' },
                { elo: '13. CONHECIMENTO', desc: 'Lição aprendida N1 a N5', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
                { elo: '14. MELHORIA', desc: 'Mitigação definitiva de falha', color: 'bg-emerald-600 text-white font-bold' },
              ].map((item, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${item.color}`}>
                  <span className="font-bold text-[11px] block">{item.elo}</span>
                  <span className="text-[10px] opacity-80 mt-1">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 12 PILARES DE EVOLUÇÃO */}
      {activeTab === 'pilares' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Os 12 Pilares Estratégicos do QualiGest
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Filtrar:</span>
              {['TODOS', 'IMPLEMENTADOS', 'PLANEJADOS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterPilar(f)}
                  className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${
                    filterPilar === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 1,
                name: 'PILAR 1 — Governança & Multi-Tenant',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Organizações e tenants isolados', 'RBAC (Admin, Gestor, Auditor, Consulta)', 'Audit Trail imutável append-only', 'Segregação de funções estrita'],
              },
              {
                id: 2,
                name: 'PILAR 2 — Não Conformidades e CAPA',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Formulário F 001-29', 'Contenção imediata (<24h)', '5 Porquês e Diagrama Ishikawa 6M', 'Plano 5W2H e Verificação de Eficácia'],
              },
              {
                id: 3,
                name: 'PILAR 3 — Auditoria e Assurance',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Auditorias externas recebidas', 'Findings maiores e menores', 'Prazos de resposta a autoridades', 'Tendências de auditoria'],
              },
              {
                id: 4,
                name: 'PILAR 4 — Compliance & Requisitos',
                status: 'PLANEJADO',
                badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
                itens: ['Mapeamento Requisito → Processo', 'Evidência vinculada à norma', 'Demonstração de conformidade instantânea', 'Rastreabilidade de atendimento'],
              },
              {
                id: 5,
                name: 'PILAR 5 — Controle Documental',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Acervo AMM, CMM e MOE', 'Máquina temporal de vigência', 'Comparador visual de revisões', 'Monitoramento de fontes externas'],
              },
              {
                id: 6,
                name: 'PILAR 6 — Pessoas e Competências',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Dossiê técnico e licenças CHT', 'Radar de competências por posto', 'Central preditiva de vencimentos', 'Alerta automático de gaps'],
              },
              {
                id: 7,
                name: 'PILAR 7 — Gestão de Riscos',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Matriz de Risco Aeronáutico 5x5', 'Evolução para riscos organizacionais', 'Riscos de processo e conformidade', 'Eficácia dos controles'],
              },
              {
                id: 8,
                name: 'PILAR 8 — Gestão de Mudanças (MOC)',
                status: 'FUTURO',
                badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
                itens: ['Avaliação de impacto de mudanças', 'Mudança → Docs → Pessoas → Treinamentos', 'Auditoria de transição', 'Controle pré e pós-implementação'],
              },
              {
                id: 9,
                name: 'PILAR 9 — Conhecimento Organizacional',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Esteira de maturidade N1 a N5', 'Banco de lições aprendidas', 'Causas recorrentes e soluções testadas', 'Prevenção de reincidências'],
              },
              {
                id: 10,
                name: 'PILAR 10 — Indicadores e Inteligência',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['SGQ Health Score (6 dimensões)', 'MTTR e velocidade de resolução', 'Análise de Pareto de falhas', 'Apresentação Executiva PPTX'],
              },
              {
                id: 11,
                name: 'PILAR 11 — IA como Copiloto Especialista',
                status: 'IMPLEMENTADO',
                badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                itens: ['Sugestão contextual via Gemini', 'Auditoria textual adversarial', 'Governança estrita: humano valida', 'Chaves isoladas no backend'],
              },
              {
                id: 12,
                name: 'PILAR 12 — Excelência Operacional',
                status: 'FUTURO',
                badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
                itens: ['Evolução contínua do SGQ', 'Previsibilidade preditiva', 'Cultura de segurança sem punição', 'Melhoria contínua institucionalizada'],
              },
            ]
              .filter((p) => {
                if (filterPilar === 'IMPLEMENTADOS') return p.status === 'IMPLEMENTADO';
                if (filterPilar === 'PLANEJADOS') return p.status === 'PLANEJADO' || p.status === 'FUTURO';
                return true;
              })
              .map((pilar) => (
                <div key={pilar.id} className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500">#{pilar.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${pilar.badgeColor}`}>
                        {pilar.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight mb-3">
                      {pilar.name}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {pilar.itens.map((it, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: NÍVEIS DE MATURIDADE (1 A 6) */}
      {activeTab === 'maturidade' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-slate-900 mb-0.5">Maturidade Conceitual do Produto:</strong>
              Estes 6 níveis representam a trajetória evolutiva do QualiGest como sistema inteligente. Não se tratam de certificações ou selos externos de autoridades, mas sim de marcos da capacidade funcional do SGQ.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                lvl: 'Nível 1',
                title: 'REGISTRO',
                desc: 'O sistema registra acontecimentos e desvios.',
                status: 'ALCANÇADO',
                color: 'bg-slate-100 text-slate-800 border-slate-300',
                detail: 'Cadastramento do formulário F 001-29, registro de ocorrências e contenções com carimbo temporal.',
              },
              {
                lvl: 'Nível 2',
                title: 'CONTROLE',
                desc: 'O sistema controla responsáveis, prazos e evidências.',
                status: 'ALCANÇADO',
                color: 'bg-blue-100 text-blue-800 border-blue-300',
                detail: 'Cronogramas 5W2H, alertas de SLA automáticos aos 7 e 15 dias, controle de revisões de manuais e CHTs.',
              },
              {
                lvl: 'Nível 3',
                title: 'INTEGRAÇÃO',
                desc: 'Os módulos passam a compartilhar informações em rede.',
                status: 'ALCANÇADO',
                color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                detail: 'RNCs interligadas com auditorias externas, colaboradores, manuais vigentes e esteira de conhecimento.',
              },
              {
                lvl: 'Nível 4',
                title: 'PREVENÇÃO',
                desc: 'O sistema identifica tendências, riscos e vulnerabilidades.',
                status: 'EM HOMOLOGAÇÃO',
                color: 'bg-amber-100 text-amber-800 border-amber-300',
                detail: 'Radar de vencimento preditivo de qualificações, gráficos de Pareto, matriz 5x5 e detecção de reincidências.',
              },
              {
                lvl: 'Nível 5',
                title: 'INTELIGÊNCIA',
                desc: 'O sistema utiliza dados históricos e IA para apoiar decisões.',
                status: 'ALCANÇADO',
                color: 'bg-purple-100 text-purple-800 border-purple-300',
                detail: 'Copiloto Gemini contextual, auditoria técnica adversarial e apresentações executivas geradas sob demanda.',
              },
              {
                lvl: 'Nível 6',
                title: 'EXCELÊNCIA',
                desc: 'A organização aprende, antecipa problemas e melhora continuamente.',
                status: 'VISÃO DE LONGO PRAZO',
                color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                detail: 'Cultura justa estabelecida, zero reincidência em causas estruturais e ciclo virtuoso de aprendizagem institucional.',
              },
            ].map((m, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-[12px] p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-blue-600">{m.lvl}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${m.color}`}>
                      {m.status}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">{m.title}</h3>
                  <p className="text-xs font-medium text-slate-700 mb-3">{m.desc}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{m.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ROADMAP ESTRATÉGICO */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Legenda de Status */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-700">Convenção de Status do Roadmap:</span>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>🟢 {t.implemented}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>🟡 {t.inHomologation}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-blue-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>🔵 {t.planned}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>⚪ {t.future}</span>
              </span>
            </div>
          </div>

          {/* Próxima Etapa Imediata Destaque */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-[12px] p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                HORIZONTE ATUAL CONSOLIDADO — FASES 1 A 15 EM PRODUÇÃO
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Fases 1 a 15 Homologadas com Zero Regressão
            </h3>
            <p className="text-xs text-slate-700 mt-1 mb-3">
              O ecossistema QualiGest opera com 15 fases interconectadas sem silos de informação, com blindagem multi-tenant e SSoT garantida:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-800">
              <div className="p-2 bg-white rounded border border-emerald-200">✓ F 001-29 Digital & 6M</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Multi-Tenant Firestore ABAC</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Extrator IA Gemini</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Pessoas & CHTs ANAC</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Consulta Temporal na Data da OS</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Metrologia RBC & Créditos</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Apresentação 70/30 PPTX</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Auditoria por Exceção (Fase 13)</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ System Designer & ADRs (Fase 14)</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Smart Import & Undo (Fase 15)</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Impacto MRO API Connect</div>
              <div className="p-2 bg-white rounded border border-emerald-200">✓ Teste de Espelho 100%</div>
            </div>
          </div>

          {/* Timeline de Fases */}
          <div className="space-y-3">
            {[
              {
                fase: 'Fases Iniciais (1 a 5)',
                title: 'Fundação do Sistema SGQ & Investigação Causal',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Workflow oficial da RNC (F 001-29), contenção imediata, 5 Porquês, Ishikawa 6M, Matriz de Risco 5x5 e Base de Conhecimento N1-N5.',
              },
              {
                fase: 'Fases 6 a 8',
                title: 'Inteligência Analítica, Multi-Tenancy & Saúde SGQ',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Dashboard analítico com Pareto 80/20, motor sgqHealth de integridade, central de alertas preditivos e segregação estrita por tenant.',
              },
              {
                fase: 'Fase 9',
                title: 'Pessoas, Competências 360° e CHTs ANAC',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Controle rigoroso de CHTs aeronáuticas (CEL, GMP, AVI), reciclagens obrigatórias, status operacional vs aptidão e central de gaps.',
              },
              {
                fase: 'Fase 10',
                title: 'Controle Documental & Máquina Temporal na Data da OS',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Publicações controladas F 001-02-1, consulta temporal reversa na data da OS, comparador visual de revisões e monitoramento de fontes externas.',
              },
              {
                fase: 'Fase 11',
                title: 'Gestão Metrológica, Ferramentas Calibradas & Conta de Créditos',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Rastreabilidade RBC de instrumentos (torquímetros, multímetros, manômetros), balanço de créditos e controle de quarentena.',
              },
              {
                fase: 'Fase 12',
                title: 'Apresentação Gerencial Oficial 70/30 & Visão Mestre',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Motor SSoT com 20 slides auto-fit geométrico (Web e PPTX Widescreen nativo), Teste de Espelho e Governança Estratégica.',
              },
              {
                fase: 'Fase 13',
                title: 'Auditorias de Clientes & Resolução por Exceção',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Arquitetura "Um Controle, Vários Requisitos", checklist Kalitta QA-14 / EASA, cockpit multi-base e confirmação de conformidade em lote.',
              },
              {
                fase: 'Fase 14',
                title: 'System Designer Oficial Permanente & Registro de ADRs',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Catálogo imutável de Decisões Arquiteturais (ADRs), topologia de sistemas, matriz de integração de dados e rastreabilidade técnica viva.',
              },
              {
                fase: 'Fase 15',
                title: 'Motor de Importação Inteligente de Dados & Reconciliação',
                status: '🟢 IMPLEMENTADO',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                desc: 'Wizard em 4 etapas: detecção de dados, mapeamento por IA Gemini, visualização de diff de reconciliação e reversão segura de carga (Undo).',
              },
              {
                fase: 'Horizonte II',
                title: 'Conectores ERPs & MRO Connect Ampliados',
                status: '🟡 EM ANDAMENTO',
                badge: 'bg-amber-50 text-amber-700 border-amber-300',
                desc: 'Expansão de conectores com SAP, Totvs, Quantum, Diário de Bordo Eletrônico (ELB) e leitura de códigos de barras de ferramentas.',
              },
              {
                fase: 'Horizonte III',
                title: 'SGQ Preditivo & Confiabilidade de Frota ATA 100',
                status: '🔵 PLANEJADO',
                badge: 'bg-blue-50 text-blue-700 border-blue-300',
                desc: 'Modelagem probabilística de falhas em frotas, cruzamento antecipado de Diretrizes de Aeronavegabilidade (AD/DA) e predição de componentes.',
              },
              {
                fase: 'Horizonte IV',
                title: 'Ecossistema Global Inter-MRO de Segurança Operacional',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Rede colaborativa segura e anonimizada entre centros de manutenção para inteligência coletiva e benchmarking regulatório.',
              },
              {
                fase: 'Fase 17',
                title: 'Gestão de Mudanças (MOC)',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Workflow formal de análise de impacto antes da alteração de instalações, ferramentas, manuais ou processos.',
              },
              {
                fase: 'Fase 18',
                title: 'Conhecimento Organizacional & Repositório Corporativo',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Indexação semântica profunda de soluções testadas, mitigação definitiva de reincidências sistêmicas.',
              },
              {
                fase: 'Fase 19',
                title: 'Quality Intelligence & IA Avançada',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Modelos preditivos de correlação temporal, detecção precoce de anomalias e geração automatizada de relatórios.',
              },
              {
                fase: 'Fase 20',
                title: 'Indicadores e Excelência Operacional',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Dashboards executivos multinível, análise estatística SPC e benchmarking interno entre bases.',
              },
              {
                fase: 'Fase 21',
                title: 'Framework Regulatório Internacional',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Mapeamento matricial dinâmico de requisitos ANAC, EASA, FAA, ICAO e ISO.',
              },
              {
                fase: 'Fase 22',
                title: 'Maturidade e Excelência Contínua do SGQ',
                status: '⚪ FUTURO',
                badge: 'bg-slate-50 text-slate-700 border-slate-300',
                desc: 'Consolidação final do Nível 6 de Maturidade, cultura justa enraizada e autonomia operacional sustentável.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 uppercase">{item.fase}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.badge}`}>
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 max-w-3xl">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: FRAMEWORK REGULATÓRIO */}
      {activeTab === 'framework' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 text-white rounded-[12px] p-6 border border-slate-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 mb-2">
              ESTRUTURAÇÃO CONCEITUAL
            </h3>
            <h2 className="text-lg font-bold text-white mb-4">
              Core QualiGest & Frameworks Regulatórios Internacionais
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              O QualiGest é projetado para suportar diferentes referências normativas sem se transformar em uma coleção desordenada de formulários desconexos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mb-6">
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-xs font-bold text-blue-300 block">QUALIDADE</span>
                <span className="text-[10px] text-slate-400">Garantia e Processos</span>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-xs font-bold text-amber-300 block">RISCO</span>
                <span className="text-[10px] text-slate-400">Segurança Operacional & Mitigação</span>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-xs font-bold text-emerald-300 block">COMPLIANCE</span>
                <span className="text-[10px] text-slate-400">Evidências e Conformidade</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">ANAC</div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">EASA</div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">FAA</div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">ISO 9001</div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">ICAO</div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-slate-300">CLIENTES</div>
            </div>
          </div>

          {/* Distinção Fundamental */}
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Distinção Regulatória Obrigatória
            </h3>
            <p className="text-xs text-slate-600">
              Para preservar a seriedade técnica e legal, o QualiGest e sua documentação diferenciam com clareza absoluta:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                <strong className="block text-blue-900 font-bold mb-1">REQUISITO REGULATÓRIO</strong>
                <p className="text-blue-800 text-[11px]">Exigência legal mandatória emanada pela autoridade competente (ex: RBAC 145.211).</p>
              </div>
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <strong className="block text-emerald-900 font-bold mb-1">BOA PRÁTICA</strong>
                <p className="text-emerald-800 text-[11px]">Recomendação técnica reconhecida pela indústria aeronáutica para aumento da confiabilidade.</p>
              </div>
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg">
                <strong className="block text-purple-900 font-bold mb-1">FUNCIONALIDADE QUALIGEST</strong>
                <p className="text-purple-800 text-[11px]">Recurso computacional desenvolvido no software para facilitar o controle e automação.</p>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
                <strong className="block text-amber-900 font-bold mb-1">DECISÃO INTERNA</strong>
                <p className="text-amber-800 text-[11px]">Diretriz corporativa estabelecida pela gestão da organização em seus manuais homologados.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Aviso de Neutralidade:</strong> O software QualiGest não declara nem insinua ser homologado ou aprovado formalmente pelas autoridades citadas, mas sim projetado tecnicamente para permitir o atendimento auditável aos seus requisitos.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: MATRIZ DE PRIORIZAÇÃO & REGRA SEM ATRITO */}
      {activeTab === 'priorizacao' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Card Principal: A Pergunta de Ouro */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-950">
                A Regra Central: “Qualidade Sem Atrito”
              </h3>
            </div>
            <p className="text-base sm:text-lg font-bold text-amber-950 leading-snug">
              “Estamos aumentando o controle ou apenas aumentando o trabalho?”
            </p>
            <p className="text-xs text-amber-900 mt-2 leading-relaxed">
              Se uma proposta de nova tela ou campo estiver apenas aumentando o trabalho manual sem agregar capacidade de decisão ou controle de risco, o desenho <strong>deve ser imediatamente simplificado</strong>.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-300 rounded-md text-xs font-mono font-bold text-amber-900 shadow-2xs">
              <span>Menor esforço possível</span>
              <span>+</span>
              <span>Controle adequado</span>
              <span>+</span>
              <span>Evidência suficiente</span>
            </div>
          </div>

          {/* Matriz dos 10 Critérios de Priorização */}
          <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
              Matriz dos 10 Critérios de Decisão para Novas Fases
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <th className="px-4 py-2.5 rounded-l-lg">Critério</th>
                    <th className="px-4 py-2.5">Pergunta Avaliativa</th>
                    <th className="px-4 py-2.5">Impacto no Desenvolvimento</th>
                    <th className="px-4 py-2.5 rounded-r-lg text-right">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { crit: '1. Valor', q: 'Isso gera valor real para a operação?', imp: 'Eliminação de desperdício', peso: 'Alto' },
                    { crit: '2. Qualidade', q: 'Melhora a gestão e garantia da qualidade?', imp: 'Eficácia de ações', peso: 'Alto' },
                    { crit: '3. Risco', q: 'Reduz ou controla riscos operacionais e de segurança?', imp: 'Mitigação de falhas', peso: 'Crítico' },
                    { crit: '4. Compliance', q: 'Melhora a capacidade de demonstrar conformidade?', imp: 'Prontidão de auditoria', peso: 'Crítico' },
                    { crit: '5. Operação', q: 'Facilita ou prejudica a rotina de quem executa?', imp: 'Qualidade sem atrito', peso: 'Crítico' },
                    { crit: '6. Evidência', q: 'Melhora a rastreabilidade ponta a ponta?', imp: 'Audit Trail e comprovação', peso: 'Alto' },
                    { crit: '7. Integração', q: 'Conecta informações importantes em rede?', imp: 'Eliminação de silos', peso: 'Médio' },
                    { crit: '8. Conhecimento', q: 'Preserva aprendizado para evitar reincidências?', imp: 'Base N1 a N5', peso: 'Médio' },
                    { crit: '9. Complexidade', q: 'A complexidade técnica é justificável e sustentável?', imp: 'Custo de manutenção', peso: 'Alto' },
                    { crit: '10. Segurança', q: 'Mantém isolamento multi-tenant e segurança?', imp: 'Zero elevação de privilégio', peso: 'Invocável' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.crit}</td>
                      <td className="px-4 py-3 text-slate-700">{row.q}</td>
                      <td className="px-4 py-3 text-slate-600">{row.imp}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.peso === 'Crítico' || row.peso === 'Invocável'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {row.peso}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
