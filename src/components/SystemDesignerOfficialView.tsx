import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  GitBranch,
  BookOpen,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  ExternalLink,
  Code2,
  Lock,
  Server,
  Terminal,
  Sparkles,
  Info,
  Check,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  SYSTEM_DESIGNER_MODULES,
  SYSTEM_DESIGNER_COLLECTIONS,
  SYSTEM_DESIGNER_FLOWS,
  SYSTEM_DESIGNER_RULES,
  ARCHITECTURE_DECISION_RECORDS
} from '../data/systemDesignerData';

export const SystemDesignerOfficialView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<
    'MANIFESTO' | 'ARQUITETURA' | 'MODULOS' | 'COLECOES' | 'FLUXOS' | 'REGRAS' | 'ADRS'
  >('MANIFESTO');

  // ADR Filter & Search
  const [adrSearch, setAdrSearch] = useState<string>('');
  const [selectedAdrId, setSelectedAdrId] = useState<string>('ADR-004');

  // Module filter
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<string>('TODAS');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Copiar Markdown para Clipboard
  const handleCopyMarkdownExport = () => {
    const text = `# QUALIGEST SGQ — DOSSIÊ DO SYSTEM DESIGNER
Versão Arquitetural: v2.8.0 Enterprise | Homologado RBAC 145 / EASA Part-145

## PRINCÍPIOS FUNDAMENTAIS
1. Multi-Tenant Absoluto: Isolamento estrito por organizationId em todas as coleções do Firestore.
2. Governança de IA (Human-in-the-Loop): "IA sugere → humano valida → sistema registra". Nenhuma hipótese vira fato sem validação.
3. Um Controle Central → Vários Requisitos: SSoT (Single Source of Truth) que elimina redundâncias de auditoria.
4. Resolução por Exceção: Motor de regras valida dados preexistentes e apresenta ao auditor somente as lacunas reais.

## MÓDULOS REGISTRADOS
${SYSTEM_DESIGNER_MODULES.map((m) => `- [${m.id}] ${m.nome} (${m.faseOrigem})`).join('\n')}

## CATÁLOGO DE ADRs
${ARCHITECTURE_DECISION_RECORDS.map((a) => `### ${a.id} — ${a.titulo} (${a.status})
Data: ${a.dataDecisao} | Versão: ${a.versaoSistema}
Contexto: ${a.contextoProblema}
Decisão: ${a.decisao}
Impacto: ${a.impactoArquitetural}
`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const filteredAdrs = useMemo(() => {
    return ARCHITECTURE_DECISION_RECORDS.filter((adr) => {
      if (adrSearch.trim()) {
        const t = adrSearch.toLowerCase();
        return (
          adr.id.toLowerCase().includes(t) ||
          adr.titulo.toLowerCase().includes(t) ||
          adr.decisao.toLowerCase().includes(t) ||
          adr.contextoProblema.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [adrSearch]);

  const selectedAdr = useMemo(() => {
    return ARCHITECTURE_DECISION_RECORDS.find((a) => a.id === selectedAdrId) || ARCHITECTURE_DECISION_RECORDS[0];
  }, [selectedAdrId]);

  const filteredModules = useMemo(() => {
    if (moduleCategoryFilter === 'TODAS') return SYSTEM_DESIGNER_MODULES;
    return SYSTEM_DESIGNER_MODULES.filter((m) => m.categoria === moduleCategoryFilter);
  }, [moduleCategoryFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* Toast de Cópia */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          Dossiê Técnico copiado para a Área de Transferência!
        </div>
      )}

      {/* Header Institucional de Engenharia de Software SGQ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                SYSTEM DESIGNER DO QUALIGEST
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                v2.8.0 Enterprise Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                OFICIAL
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Repositório Permanente de Arquitetura, Dados & Decisões (ADRs)
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl mt-1">
              Desenho arquitetural vivo do QualiGest SGQ. Registra formalmente a topologia full-stack, os dicionários de coleções do Firestore,
              as regras de segurança multi-tenant e o histórico imutável de decisões de engenharia de software aeronáutico.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCopyMarkdownExport}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Exportar Dossiê Markdown
            </button>
          </div>
        </div>

        {/* Abas de Navegação Interna do System Designer */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          {[
            { id: 'MANIFESTO', label: '1. Manifesto & Princípios', icon: BookOpen },
            { id: 'ARQUITETURA', label: '2. Arquitetura Full-Stack', icon: Server },
            { id: 'MODULOS', label: '3. Mapa de Módulos (15)', icon: Layers },
            { id: 'COLECOES', label: '4. Dicionário Firestore', icon: Database },
            { id: 'FLUXOS', label: '5. Fluxos Operacionais', icon: GitBranch },
            { id: 'REGRAS', label: '6. Regras Invioláveis', icon: ShieldCheck },
            { id: 'ADRS', label: '7. Catálogo de ADRs', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-2 shrink-0 transition-all ${
                  isSel
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. SEÇÃO: MANIFESTO & PRINCÍPIOS */}
      {activeSection === 'MANIFESTO' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Tenant Absoluto</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toda entidade possui <code>organizationId</code> mandatório. Acesso entre organizações é blindado por regras criptográficas e Firestore Security Rules.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Human-in-the-Loop</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                "IA sugere → humano valida → sistema registra." A IA nunca aprova requisitos, nunca inventa dados e nunca assume responsabilidade técnica de engenheiro aeronáutico.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">1 Controle → Vários Requisitos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Eliminação de controles duplicados. Um único processo de calibração ou qualificação técnica atende transversalmente requisitos de Atlas, Kalitta, SWISS e ANAC.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Resolução por Exceção</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O software resolve previamente o que possui evidência objetiva e apresenta ao auditor humano SOMENTE os desvios, atenções ou lacunas reais.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Manifesto de Engenharia & Garantia da Qualidade QualiGest
            </h3>
            <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                O <strong>QualiGest SGQ</strong> foi construído sobre a premissa de que a segurança de voo depende de integridade de dados e conformidade estrita com normas internacionais como ANAC RBAC 145, EASA Part-145 e FAA Part 145.
              </p>
              <p>
                Sistemas tradicionais de qualidade costumam ser repositórios passivos de arquivos ou formulários isolados. O QualiGest opera como um <strong>organismo unificado de conformidade</strong>, onde um dado cadastrado na ferramentaria ou no treinamento reflete imediatamente na resposta a auditorias de clientes globais.
              </p>
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-purple-300">
                Regra de Ouro: Todo novo recurso adicionado ao sistema DEVE possuir um ADR correspondente, um modelo de dados com organizationId e garantia de que nenhum dado fictício seja apresentado como evidência de homologação.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SEÇÃO: ARQUITETURA FULL-STACK */}
      {activeSection === 'ARQUITETURA' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-purple-400" />
              Topologia Full-Stack e Camadas de Execução
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              Arquitetura de microsserviços em container com proxy reverso NGINX na porta 3000, backend Node/Express e frontend React 18 SPA.
            </p>

            <div className="mt-6 space-y-4">
              {/* Camada 1: Client / Frontend */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 uppercase font-mono">
                    CAMADA 1 • CLIENT-SIDE SPA (VITE + REACT 18 + TAILWIND)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Porta 3000 Ingress</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">React Hooks & State</strong>
                    <span className="text-slate-400 text-[11px]">Gerenciamento reativo de RNCs, checklists e auditoria por exceção.</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Tailwind CSS & Lucide Icons</strong>
                    <span className="text-slate-400 text-[11px]">Design System aeronáutico com tipografia de alta legibilidade.</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">PptxGenJS & PDF Engines</strong>
                    <span className="text-slate-400 text-[11px]">Geração de relatórios executivos F 001-29 e apresentações sem mock data.</span>
                  </div>
                </div>
              </div>

              {/* Camada 2: Backend API / Express */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase font-mono">
                    CAMADA 2 • BACKEND ENGINE & AI GATEWAY (EXPRESS + TSX)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">/api/*</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Google Gemini API Gateway</strong>
                    <span className="text-slate-400 text-[11px]">Server-side proxy protegido com GEMINI_API_KEY (sem exposição no browser).</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Parser de Arquivos (PDF/DOCX/XLSX)</strong>
                    <span className="text-slate-400 text-[11px]">Extração estruturada de checklists legados e cálculo de hash SHA-256.</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Motor Heurístico de Contingência</strong>
                    <span className="text-slate-400 text-[11px]">Fallback determinístico caso o serviço de IA apresente indisponibilidade transitória.</span>
                  </div>
                </div>
              </div>

              {/* Camada 3: Cloud Database & Persistence */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase font-mono">
                    CAMADA 3 • PERSISTÊNCIA & SEGURANÇA (FIREBASE FIRESTORE & AUTH)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Multi-Tenant Scoped</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Firestore Multi-Tenant Collections</strong>
                    <span className="text-slate-400 text-[11px]">Segregação de dados por organizationId com índices compostos.</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Firebase Authentication & RBAC</strong>
                    <span className="text-slate-400 text-[11px]">Perfis granulares (Admin, Gestor SGQ, Auditor, Inspetor, Técnico).</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-850">
                    <strong className="text-white block">Trilha de Auditoria Imutável</strong>
                    <span className="text-slate-400 text-[11px]">Coleção audit_trails com registro append-only de alterações críticas.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEÇÃO: MAPA DE MÓDULOS */}
      {activeSection === 'MODULOS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Módulos do Sistema & Relacionamentos
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Catálogo dos 15 módulos operacionais do QualiGest com mapeamento de coleções e dependências.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Categoria:</span>
              <select
                value={moduleCategoryFilter}
                onChange={(e) => setModuleCategoryFilter(e.target.value)}
                className="bg-slate-900 text-xs text-white border border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="TODAS">Todas as Categorias</option>
                <option value="GOVERNANCA">Governança</option>
                <option value="OPERACAO">Operação</option>
                <option value="COMPLIANCE">Compliance</option>
                <option value="PESSOAS">Pessoas</option>
                <option value="INTELIGENCIA">Inteligência</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModules.map((mod) => (
              <div
                key={mod.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950 text-purple-300 border border-purple-800/40">
                      {mod.faseOrigem}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{mod.categoria}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{mod.nome}</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{mod.descricao}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-500">Coleções Firestore:</span>{' '}
                    <span className="text-sky-400 font-mono">
                      {mod.colecoesFirestore.length > 0 ? mod.colecoesFirestore.join(', ') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Recursos de IA:</span>{' '}
                    <span className="text-purple-300">
                      {mod.recursosIA.length > 0 ? mod.recursosIA.join(' • ') : 'Nenhum'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SEÇÃO: DICIONÁRIO FIRESTORE */}
      {activeSection === 'COLECOES' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-purple-400" />
              Dicionário Oficial de Coleções Firestore (Schema Multi-Tenant)
            </h3>
            <p className="text-xs text-slate-400 mb-6 max-w-3xl">
              Todas as coleções do QualiGest possuem partição obrigatória por <code>organizationId</code>. As queries no Firestore
              são indexadas compostamente para performance submilisegundo em pátio.
            </p>

            <div className="space-y-4">
              {SYSTEM_DESIGNER_COLLECTIONS.map((col) => (
                <div key={col.nomeColecao} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800/60">
                        {col.nomeColecao}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{col.caminhoFirestore}</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Entidade: {col.entidadeTypeScript}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{col.descricao}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-850 text-[11px]">
                    <div>
                      <strong className="text-slate-400">Índices Compostos:</strong>
                      <div className="text-slate-300 font-mono text-[10px] mt-0.5">
                        {col.indicesObrigatorios.join(' | ')}
                      </div>
                    </div>
                    <div>
                      <strong className="text-slate-400">Regras RBAC:</strong>
                      <div className="text-slate-300 text-[11px] mt-0.5">{col.regrasPermissaoRBAC}</div>
                    </div>
                    <div>
                      <strong className="text-slate-400">Origem & Volume:</strong>
                      <div className="text-slate-300 text-[11px] mt-0.5">{col.volumeEstimado}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SEÇÃO: FLUXOS OPERACIONAIS */}
      {activeSection === 'FLUXOS' && (
        <div className="space-y-6">
          {SYSTEM_DESIGNER_FLOWS.map((flow) => (
            <div key={flow.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase bg-purple-950 px-2 py-0.5 rounded border border-purple-800/40">
                  {flow.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{flow.titulo}</h3>
                <p className="text-xs text-slate-400 mt-1">{flow.descricao}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {flow.etapas.map((step) => (
                  <div key={step.ordem} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs">
                        {step.ordem}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {step.ator}
                      </span>
                    </div>
                    <div className="font-semibold text-white text-xs">{step.nome}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{step.descricao}</p>
                    {step.evidenciaGerada && (
                      <div className="pt-2 border-t border-slate-900 text-[10px] text-emerald-400">
                        ✓ Evidência: {step.evidenciaGerada}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. SEÇÃO: REGRAS INVIOLÁVEIS */}
      {activeSection === 'REGRAS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Regras Críticas & Políticas Invioláveis do QualiGest
            </h3>
            <p className="text-xs text-slate-400 mb-6 max-w-3xl">
              Diretrizes de conformidade arquitetural que não podem ser flexibilizadas em nenhuma circunstância ou nova funcionalidade.
            </p>

            <div className="space-y-4">
              {SYSTEM_DESIGNER_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-slate-950 p-5 rounded-xl border ${
                    rule.inviolavel ? 'border-rose-900/50' : 'border-slate-800'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-400">{rule.codigo}</span>
                      <span className="text-sm font-bold text-white">{rule.titulo}</span>
                    </div>
                    {rule.inviolavel && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60 uppercase">
                        Inviolável
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{rule.descricao}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
                    <div className="text-rose-400">
                      <strong>Consequência de Violação:</strong> {rule.consequenciaViolacao}
                    </div>
                    <div className="text-slate-400 font-mono">
                      <strong>Exemplo Prático:</strong> {rule.exemploPratico}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SEÇÃO: CATÁLOGO OFICIAL DE ADRs */}
      {activeSection === 'ADRS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Esquerda: Lista de ADRs */}
            <div className="space-y-3 lg:col-span-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={adrSearch}
                  onChange={(e) => setAdrSearch(e.target.value)}
                  placeholder="Pesquisar decisões (ADRs)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredAdrs.map((adr) => {
                  const isSel = adr.id === selectedAdrId;
                  return (
                    <div
                      key={adr.id}
                      onClick={() => setSelectedAdrId(adr.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? 'bg-purple-950/60 border-purple-600 shadow-md shadow-purple-950/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold text-purple-400">{adr.id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                          {adr.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-1">{adr.titulo}</div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{adr.decisao}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Detalhe da ADR Selecionada */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800/40">
                      {selectedAdr.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedAdr.dataDecisao} • Versão: {selectedAdr.versaoSistema}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedAdr.titulo}</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {selectedAdr.status}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[11px] mb-1">
                    1. Contexto & Problema de Negócio
                  </h4>
                  <p className="text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-850 leading-relaxed">
                    {selectedAdr.contextoProblema}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[11px] mb-1">
                    2. Decisão Arquitetural Adotada
                  </h4>
                  <p className="text-white font-medium bg-slate-950 p-3.5 rounded-xl border border-purple-900/40 leading-relaxed">
                    {selectedAdr.decisao}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[11px] mb-1">
                    3. Justificativa & Conformidade Regulatória
                  </h4>
                  <p className="text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-850 leading-relaxed">
                    {selectedAdr.motivoJustificativa}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-300 uppercase tracking-wide text-[11px] mb-1">
                    4. Impacto Técnico no Sistema
                  </h4>
                  <p className="text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-850 leading-relaxed">
                    {selectedAdr.impactoArquitetural}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Autor: <strong className="text-slate-300">{selectedAdr.autor}</strong></span>
                  <span>Módulos Afetados: <strong className="text-purple-400 font-mono">{selectedAdr.modulosAfetados.join(', ')}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
