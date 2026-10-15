import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Sliders, 
  Building2, 
  Users, 
  FileText, 
  Printer, 
  Sparkles, 
  Clock, 
  Scale, 
  Award, 
  Layers, 
  Compass, 
  Lock, 
  Activity, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info,
  Flame,
  ArrowRight,
  UserCheck,
  Plane,
  Trash2,
  History,
} from 'lucide-react';
import { OrganizationRecord } from '../types';

interface UserManualViewProps {
  organization: OrganizationRecord | null;
  onNavigateToTab?: (tab: string) => void;
}

export const UserManualView: React.FC<UserManualViewProps> = ({
  organization,
  onNavigateToTab,
}) => {
  const [activeSection, setActiveSection] = useState<string>('manual-geral');
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [simuladorConcluidos, setSimuladorConcluidos] = useState<Record<number, boolean>>({});

  const orgName = organization?.name || 'Sua Organização SGQ';
  const orgSigla = organization?.configuration?.identidadeVisual?.siglaAeronautica || 'SGQ';

  // 35 Capítulos Oficiais do Manual de Utilização (Fases 1 a 15, ADRs, Smart Import & Roadmap)
  const chapters = useMemo(() => [
    {
      id: 1,
      title: '1. Apresentação do QualiGest SGQ',
      category: 'Fundamentos',
      summary: 'Objetivo, escopo aeronáutico e visão geral do sistema.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O <strong>QualiGest SGQ</strong> é uma plataforma integrada de Gestão e Garantia da Qualidade Aeronáutica, projetada especificamente para organizações de manutenção (MRO), operadores aéreos e centros de serviços homologados sob os regulamentos <strong>ANAC RBAC 145</strong> e <strong>EASA Part-145</strong>.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">Qual problema o sistema resolve?</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Elimina planilhas desconectadas e relatórios isolados que comprometem auditorias regulatórias.</li>
              <li>Padroniza o ciclo de vida da RNC conforme o formulário oficial <strong>F 001-29</strong>.</li>
              <li>Introduz governança estrita entre <em>hipóteses de causa</em> e <em>fatos comprovados</em>, impedindo conclusões precipitadas.</li>
              <li>Acelera a aprendizagem organizacional com a esteira de conhecimento <strong>N1 a N5</strong>.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: '2. Primeiro Acesso e Associação de Organização',
      category: 'Acesso',
      summary: 'Autenticação, vinculação ao tenant e política de ausência de organização.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O acesso ao QualiGest é protegido por autenticação segura (E-mail/Senha ou Google OAuth). Cada conta de usuário deve pertencer obrigatoriamente a uma organização (tenant).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="block text-slate-900 font-bold mb-1">Usuário com Organização Vinculada</strong>
              <p className="text-slate-600">Entra diretamente no ambiente do seu tenant ({orgName}), visualizando apenas RNCs, manuais, indicadores e configurações da sua empresa.</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <strong className="block text-amber-900 font-bold mb-1">Usuário Sem Organização (Tenant Zero)</strong>
              <p className="text-amber-800">É impedido de ver qualquer dado. A tela de proteção direciona para solicitar vinculação ao seu Administrador ou realizar o onboarding de um novo cliente.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: '3. Perfis de Usuário e Segregação (RBAC 145)',
      category: 'Acesso',
      summary: 'Papéis operacionais: ADMIN, GESTOR_SGQ, AUDITOR e CONSULTA.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O controle de acesso baseado em funções (RBAC) garante a segregação de responsabilidades exigida pelos manuais da qualidade (MOMQ):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2.5 text-left">Perfil</th>
                  <th className="p-2.5 text-left">Permissões Permitidas</th>
                  <th className="p-2.5 text-left">Restrições / Bloqueios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-bold text-purple-700">ADMIN</td>
                  <td className="p-2.5 text-slate-700">Acesso irrestrito ao tenant; gestão de usuários (ativar/desativar), configuração de setores, SLAs e identidade visual.</td>
                  <td className="p-2.5 text-slate-500">Não pode acessar dados de outros clientes/tenants.</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-blue-700">GESTOR_SGQ</td>
                  <td className="p-2.5 text-slate-700">Aprovação e encerramento de RNCs, homologação de conhecimento N1-N5, validação de eficácia, geração de relatórios oficiais.</td>
                  <td className="p-2.5 text-slate-500">Não pode alterar estrutura de usuários ou tenant.</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-emerald-700">AUDITOR</td>
                  <td className="p-2.5 text-slate-700">Abertura de RNCs, registro de contenção, preenchimento de causa e proposta de plano 5W2H.</td>
                  <td className="p-2.5 text-slate-500">Não pode homologar encerramento de RNC nem aprovar decisões finais de SGQ.</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-600">CONSULTA</td>
                  <td className="p-2.5 text-slate-700">Visualização de Dashboard, leitura de relatórios e busca de manuais.</td>
                  <td className="p-2.5 text-slate-500">Bloqueio estrito contra qualquer criação, edição ou deleção.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: '4. Nova Arquitetura de Navegação do QualiGest',
      category: 'Interface',
      summary: 'Estrutura dos 8 blocos organizacionais, jornada operacional e atalhos contextuais.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            O QualiGest SGQ adota uma arquitetura de navegação centrada na <strong>utilização real dos processos da organização aeronáutica</strong>, organizada em 8 blocos de governança fundamentais:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <strong className="block text-blue-900 font-bold mb-1">1. INÍCIO</strong>
              <p className="text-blue-800">Dashboard Executivo, Pendências & Alertas, Saúde do SGQ e Apresentação Gerencial.</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <strong className="block text-indigo-900 font-bold mb-1">2. QUALIDADE</strong>
              <p className="text-indigo-800">Não Conformidades (Lista & Kanban), Análise & Indicadores (Pareto), Fila de Validação & Aprovação e Base de Conhecimento.</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <strong className="block text-amber-900 font-bold mb-1">3. AUDITORIAS & CLIENTES</strong>
              <p className="text-amber-800">Auditorias, Clientes & Requisitos ("Um Controle, Vários Requisitos"), Auditoria Inteligente com IA e Calendário de Auditorias.</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <strong className="block text-emerald-900 font-bold mb-1">4. PESSOAS & COMPETÊNCIAS</strong>
              <p className="text-emerald-800">Colaboradores, Treinamentos, CHTs & Qualificações, Vencimentos & Gaps e Simulador de Aptidão Operacional.</p>
            </div>
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <strong className="block text-sky-900 font-bold mb-1">5. DOCUMENTOS</strong>
              <p className="text-sky-800">Acervo Documental, Revisões e Histórico, Conhecimento Temporal na Data da OS, Fontes Oficiais Externas, Solicitações de Revisão e Comparador.</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <strong className="block text-purple-900 font-bold mb-1">6. RECURSOS & CONTROLES</strong>
              <p className="text-purple-800">Ferramentas & Metrologia Calibrada, Importação Inteligente de Dados e Outros Controles Centrais.</p>
            </div>
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <strong className="block text-teal-900 font-bold mb-1">7. CONHECIMENTO & MELHORIA</strong>
              <p className="text-teal-800">Lições Aprendidas de Auditorias, Soluções Validadas, Extrator de NCs com IA e Manuais Oficiais.</p>
            </div>
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg">
              <strong className="block text-slate-900 font-bold mb-1">8. ADMINISTRAÇÃO</strong>
              <p className="text-slate-800">Organização, Usuários & Permissões (RBAC), Trilha de Auditoria (Audit Trail), Implantação/Onboarding e Centro de Diagnósticos Técnicos.</p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <strong className="text-slate-900 font-bold block mb-1">Jornada Operacional Padrão:</strong>
            <p className="text-slate-600">
              A navegação segue a lógica: <strong>Módulo → Registro → Abas e Ações Relacionadas → Evidências → Histórico</strong>. Ações frequentes como a <em>Ficha Oficial F 001-29</em> são acessadas contextualmente dentro do próprio registro ou relatório, sem sobrecarregar a barra lateral permanente.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: '5. Dashboard Executivo e Indicadores',
      category: 'Gestão',
      summary: 'Leitura dos cartões analíticos, matrizes e tendências do SGQ.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O Dashboard fornece uma fotografia instantânea e fidedigna da qualidade da sua organização:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <strong className="block text-slate-800 font-bold mb-1">Total de RNCs & Status</strong>
              <p className="text-slate-600">Contabiliza abertas, em contenção, sob análise de causa, aguardando eficácia e encerradas.</p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <strong className="block text-rose-900 font-bold mb-1">RNCs Críticas & Alertas</strong>
              <p className="text-rose-700">Destaque imediato para desvios com Risco Crítico (5A-5E) ou ações com prazos expirados.</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <strong className="block text-emerald-900 font-bold mb-1">Taxa de Eficácia</strong>
              <p className="text-emerald-700">Percentual de ações que eliminaram a causa raiz sem ocorrência de reincidência.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      title: '6. Fluxo de Vida Completo da RNC F 001-29',
      category: 'RNC',
      summary: 'Da constatação na inspeção até o encerramento com eficácia comprovada.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O processo segue rigidamente as diretrizes da ANAC para garantia contínua da aeronavegabilidade:
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="p-2 bg-blue-100 text-blue-800 rounded">1. Abertura</span>
            <span className="p-2 text-slate-400">→</span>
            <span className="p-2 bg-amber-100 text-amber-800 rounded">2. Contenção</span>
            <span className="p-2 text-slate-400">→</span>
            <span className="p-2 bg-purple-100 text-purple-800 rounded">3. Causa Raiz</span>
            <span className="p-2 text-slate-400">→</span>
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded">4. Ação 5W2H</span>
            <span className="p-2 text-slate-400">→</span>
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded">5. Verificação</span>
            <span className="p-2 text-slate-400">→</span>
            <span className="p-2 bg-slate-200 text-slate-800 rounded">6. Encerramento</span>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      title: '7. Bloco 1 — Identificação da Ocorrência',
      category: 'RNC',
      summary: 'Campos obrigatórios: Código, Tipo, Setor, Origem, Base e Responsável.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>Ao abrir uma RNC, preencha:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li><strong>Código RNC:</strong> Gerado automaticamente (ex: RNC-2026-001) ou customizado pelo tenant.</li>
            <li><strong>Setor:</strong> Selecione o setor operacional cadastrado nas configurações da sua organização (ex: Aviônicos, Motores, Célula, NDT, Almoxarifado).</li>
            <li><strong>Tipo de Desvio:</strong> Real ou Potencial.</li>
            <li><strong>Origem:</strong> Auditoria Interna, Auditoria ANAC, Relato Voluntário, Inspeção de Recebimento ou Operação.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 8,
      title: '8. Bloco 2 — Descrição e Evidências Objetivas',
      category: 'RNC',
      summary: 'Como registrar o fato de forma técnica, impessoal e auditável.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Uma Não Conformidade aeronáutica deve ser descrita sem juízos de valor, baseando-se estritamente em evidências objetivas:
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900">
            <strong>Exemplo Incorreto:</strong> "O mecânico esqueceu de assinar a ficha e a oficina estava desorganizada."
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
            <strong>Exemplo Correto (Auditável):</strong> "Durante inspeção amostral na O.S. 2026-4412 (Aeronave PR-XYZ), constatou-se a ausência de carimbo de inspeção de torque na etapa 04 do Manual de Manutenção AMM 24-00-01, contrariando o item 3.4 do MOMQ."
          </div>
        </div>
      ),
    },
    {
      id: 9,
      title: '9. Bloco 3 — Ação de Contenção Imediata',
      category: 'RNC',
      summary: 'Bloqueio de itens não conformes e proteção da aeronavegabilidade.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            A <strong>Contenção</strong> é a ação imediata executada para impedir que o desvio se propague ou coloque em risco o voo ou peças em estoque:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Segregação física de componentes em quarentena com etiqueta vermelha.</li>
            <li>Suspensão temporária do serviço até reavaliação pelo inspetor responsável.</li>
            <li>Reteste ou reinspeção 100% no lote afetado.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 10,
      title: '10. Bloco 4 & 8 — Matriz de Risco 5x5 (Doc 9859 OACI) e Painel do Dashboard',
      category: 'RNC',
      summary: 'Cálculo de Severidade (1 a 5) x Probabilidade (A a E), consolidação de RNCs por célula e espelho fiel com o PPTX.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>O QualiGest adota a matriz 5x5 preconizada no Manual de Gestão da Segurança Operacional (Doc 9859 OACI / ANAC):</p>
          <div className="grid grid-cols-3 gap-2 text-center font-bold">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded">ACEITÁVEL (Verde)</div>
            <div className="p-2 bg-amber-100 text-amber-800 rounded">TOLERÁVEL (Amarelo)</div>
            <div className="p-2 bg-rose-100 text-rose-800 rounded">INACEITÁVEL (Vermelho)</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">Consolidação Unificada da Matriz 5x5 (Single Source of Truth)</h4>
            <p className="text-slate-600 leading-relaxed">
              Tanto o <strong>Dashboard Principal</strong> quanto o <strong>Slide 6 da Apresentação Gerencial (PPTX)</strong> utilizam exatamente o mesmo motor de consolidação (<code>consolidarRNCsPorMatrizRisco</code>). As células com ocorrências apresentam quantidade destacada em alto contraste e identificação nominal dos códigos das RNCs (ex: RNC-2026-001) via tooltip e tabela de rastreabilidade.
            </p>
          </div>
          <p className="text-slate-500">
            Toda RNC iniciada em nível Tolerável ou Inaceitável deve demonstrar, no Bloco 8, que o risco residual após as ações corretivas atingiu o nível Aceitável ou Tolerável com mitigação controlada.
          </p>
        </div>
      ),
    },
    {
      id: 11,
      title: '11. Bloco 5 — Análise de Causa Raiz (Ishikawa & 5 Porquês)',
      category: 'RNC',
      summary: 'Governança entre hipóteses levantadas e causa raiz comprovada.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>A investigação de causas utiliza duas metodologias integradas:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li><strong>Diagrama de Ishikawa (6M):</strong> Método, Mão de Obra, Máquina, Material, Meio Ambiente e Medição.</li>
            <li><strong>Técnica dos 5 Porquês:</strong> Aprofundamento sucessivo até atingir a falha sistêmica do processo.</li>
          </ul>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 font-semibold">
            Regra Fundamental: Sugestões geradas por IA são classificadas como <em>Hipóteses sob Investigação</em>. Nenhuma hipótese torna-se Causa Raiz sem homologação formal de um Gestor/Auditor humano.
          </div>
        </div>
      ),
    },
    {
      id: 12,
      title: '12. Bloco 6 — Requisitos Normativos Aplicáveis',
      category: 'RNC',
      summary: 'Vinculação a RBAC 145, EASA Part-145, MOMQ e manuais dos fabricantes.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Vincule a RNC aos requisitos normativos infringidos. O sistema permite pesquisar e consultar a biblioteca de manuais da organização em tempo real, anexando o número do parágrafo, edição e revisão vigente.
          </p>
        </div>
      ),
    },
    {
      id: 13,
      title: '13. Bloco 7 — Plano de Ação Corretiva (5W2H)',
      category: 'RNC',
      summary: 'What, Why, Where, When, Who, How e How Much para eliminação da causa.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>O plano de ação corretiva deve ser estruturado em 5W2H detalhado:</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded"><strong>O que será feito? (What):</strong> Ação tangível.</div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded"><strong>Por que será feito? (Why):</strong> Eliminar a causa raiz.</div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded"><strong>Onde será feito? (Where):</strong> Setor, oficina ou base.</div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded"><strong>Quem executará? (Who):</strong> Responsável nominal.</div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded"><strong>Quando? (When):</strong> Prazo limite (conforme SLA).</div>
            <div className="p-2 bg-slate-50 border border-slate-200 rounded"><strong>Como? (How):</strong> Procedimento passo a passo.</div>
          </div>
        </div>
      ),
    },
    {
      id: 14,
      title: '14. Bloco 9 — Acompanhamento e SLAs da Organização',
      category: 'RNC',
      summary: 'Monitoramento de prazos contratuais e internos de atendimento.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Cada organização possui metas de SLA configuradas no painel administrativo:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li><strong>P1 (Crítico):</strong> RNCs com impacto em aeronavegabilidade imediata ({organization?.configuration?.slasInternos?.p1Horas || 24}h).</li>
            <li><strong>P2 (Alto):</strong> Desvios sistêmicos ou de auditoria regulatória ({organization?.configuration?.slasInternos?.p2Horas || 72}h).</li>
            <li><strong>P3 (Médio):</strong> Desvios operacionais com prazo padrão ({organization?.configuration?.slasInternos?.p3Dias || 15} dias).</li>
            <li><strong>P4 (Baixo):</strong> Oportunidades de melhoria contínua ({organization?.configuration?.slasInternos?.p4Dias || 30} dias).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 15,
      title: '15. Bloco 10 — Verificação de Eficácia, Não Eficácia e Ciclos de Ação Corretiva',
      category: 'RNC',
      summary: 'Avaliação de eficácia, registro estruturado de não eficácia, governança de ciclos sucessivos e preservação integral do histórico.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Não basta implementar a ação corretiva; a Garantia da Qualidade (SGQ) deve testar e comprovar a sua <strong>eficácia</strong> após o período de observação pré-estabelecido (30, 60 ou 90 dias), conforme preconizado pelo <strong>RBAC 145</strong> e manuais de procedimentos da qualidade (MOMQ).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
              <strong className="text-emerald-900 block font-bold">1. Ação Eficaz (Conclusão com Sucesso)</strong>
              <p className="text-emerald-800 text-[11px]">
                O processo operou pelo período estipulado sem qualquer reincidência do desvio fático. As evidências documentais confirmam a eliminação da causa raiz e o encerramento formal pode prosseguir para aprovação do GESTOR_SGQ.
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1">
              <strong className="text-rose-900 block font-bold">2. Ação Não Eficaz (Reabertura & Novo Ciclo)</strong>
              <p className="text-rose-800 text-[11px]">
                O desvio voltou a ocorrer ou o resultado esperado não foi atingido. A RNC <strong>não pode ser encerrada</strong>. É obrigatório registrar a Análise de Não Eficácia e instaurar um novo ciclo de ação corretiva, preservando 100% dos dados da primeira tentativa.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Passo a Passo: Como Tratar uma Ação Não Eficaz e Instaurar Novo Ciclo
            </h4>
            <ol className="text-xs text-slate-700 space-y-2.5 list-decimal list-inside">
              <li>
                <strong>1. Acessar a RNC em Monitoramento:</strong> Abra o formulário da RNC na aba <em>"6. Eficácia"</em>.
              </li>
              <li>
                <strong>2. Registrar Decisão de Não Eficácia:</strong> No campo <em>"Decisão de Encerramento"</em>, selecione <em>"NÃO - Ação Ineficaz (Reabrir NC)"</em>. O status da RNC será automaticamente reclassificado para <strong>Reaberta</strong>.
              </li>
              <li>
                <strong>3. Preencher a Análise de Não Eficácia:</strong> O sistema exibirá o bloco específico de análise. Documente:
                <ul className="list-disc list-inside pl-4 text-slate-600 space-y-1 mt-1 text-[11px]">
                  <li><strong>Resultado Esperado:</strong> o padrão ou meta estabelecido para a ação original.</li>
                  <li><strong>Resultado Observado:</strong> o fato real verificado na auditoria/inspeção.</li>
                  <li><strong>Evidências Objetivas:</strong> fotos, relatórios, ordens de serviço ou registros auditados.</li>
                  <li><strong>Justificativa do Insucesso:</strong> por que o método adotado anteriormente falhou.</li>
                  <li><strong>Validade da Causa Raiz:</strong> confirme se a causa raiz anterior continua válida ou se requer revisão.</li>
                  <li><strong>Mudanças na Nova Tentativa:</strong> o que será feito de diferente para garantir o bloqueio definitivo.</li>
                </ul>
              </li>
              <li>
                <strong>4. Definir a Nova Ação do Próximo Ciclo:</strong> Informe a descrição da nova ação corretiva, responsável nominal, novo prazo de conclusão e o novo período previsto para verificação da eficácia.
              </li>
              <li>
                <strong>5. Formalizar e Criar o Novo Ciclo:</strong> Clique no botão <em>"Registrar Análise & Instaurar Ciclo 2"</em>. O sistema arquivará o Ciclo 1 como <em>"INEFICAZ_REABERTO"</em> com todos os seus dados preservados, ativará o Ciclo 2 e atualizará a trilha de auditoria.
              </li>
              <li>
                <strong>6. Consultar o Histórico de Ciclos Anteriores:</strong> Na aba <em>"4. Ação"</em> ou <em>"6. Eficácia"</em>, expanda o painel <em>"Histórico de Ciclos de Ação Corretiva"</em> para consultar detalhadamente qualquer tentativa passada, seus prazos, pareceres e evidências.
              </li>
              <li>
                <strong>7. Acompanhar Prazos e SLAs:</strong> O novo ciclo passa a ser monitorado pela Central de Alertas e pelos indicadores executivos de eficácia do SGQ.
              </li>
              <li>
                <strong>8. Nova Verificação de Eficácia:</strong> Ao término do novo período de teste, realize nova auditoria. Se novamente ineficaz, um Ciclo 3 poderá ser instaurado sem sobrescrever os anteriores; se eficaz, a RNC poderá ser encerrada formalmente.
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 16,
      title: '16. Bloco 11 — Encerramento e Aprovação Formal',
      category: 'RNC',
      summary: 'Critérios obrigatórios e autoridade de encerramento do GESTOR_SGQ.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>Para que uma RNC seja encerrada formalmente no QualiGest:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>Todos os 11 blocos do formulário oficial F 001-29 devem estar preenchidos.</li>
            <li>A causa raiz deve possuir vínculo comprovado com a evidência.</li>
            <li>O risco residual deve estar em patamar seguro.</li>
            <li>A eficácia deve ter parecer favorável do Inspetor / Auditor.</li>
            <li>O GESTOR_SGQ assina digitalmente o registro.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 17,
      title: '17. Central de Alertas e Prazos Críticos',
      category: 'Gestão',
      summary: 'Classificação de urgência: Vencidas, Vence Hoje e Vence em 7 Dias.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            A Central de Alertas monitora todos os prazos em tempo real com base no fuso horário do tenant ({organization?.timezone || 'America/Sao_Paulo'}):
          </p>
          <p>Qualquer ação vencida gera destaque visual vermelho no topo de todas as telas até que sua tratativa seja formalmente atualizada.</p>
        </div>
      ),
    },
    {
      id: 18,
      title: '18. Biblioteca de Manuais e Extração Automatizada',
      category: 'Manuais',
      summary: 'Gestão de MOMQ, MGM, MOE, manuais de fabricantes e extração por IA.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Armazene e consulte os manuais operacionais e de qualidade da sua organização. O <strong>Extrator de NCs com IA</strong> permite analisar relatórios técnicos brutos ou relatórios de auditoria e sugerir o preenchimento automático dos blocos da RNC, economizando tempo de digitação.
          </p>
        </div>
      ),
    },
    {
      id: 19,
      title: '19. Comparação Semântica de RNCs',
      category: 'Aprendizado',
      summary: 'Detecção de reincidências e padrões: Idêntico, Equivalente e Complementar.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>O motor de comparação semântica avalia causas e desvios históricos do seu tenant e classifica as correlações:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <span className="p-2 bg-rose-50 text-rose-800 border border-rose-200 rounded">IDENTICO</span>
            <span className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded">EQUIVALENTE</span>
            <span className="p-2 bg-blue-50 text-blue-800 border border-blue-200 rounded">COMPLEMENTAR</span>
            <span className="p-2 bg-purple-50 text-purple-800 border border-purple-200 rounded">DIVERGENTE</span>
            <span className="p-2 bg-slate-50 text-slate-700 border border-slate-200 rounded">CONTRADITORIO</span>
          </div>
        </div>
      ),
    },
    {
      id: 20,
      title: '20. Base de Conhecimento e Maturação N1 a N5',
      category: 'Aprendizado',
      summary: 'Evolução do aprendizado: Hipótese (N1) até Lição Aprendida Homologada (N5).',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>A esteira de conhecimento aeronáutico do QualiGest impede que palpites contaminem os padrões da oficina:</p>
          <ul className="space-y-1 text-slate-600 list-disc list-inside">
            <li><strong>N1 (Hipótese):</strong> Sugestão gerada por IA ou relato inicial.</li>
            <li><strong>N2 (Correlação):</strong> Padrão identificado entre duas ou mais ocorrências.</li>
            <li><strong>N3 (Validação Técnica):</strong> Auditor confirma a relação causa-efeito.</li>
            <li><strong>N4 (Eficácia Comprovada):</strong> Ação eliminou o desvio em inspeção posterior.</li>
            <li><strong>N5 (Conhecimento Homologado):</strong> O GESTOR_SGQ promove o aprendizado para recomendação oficial nos treinamentos e manuais da organização.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 21,
      title: '21. Gerador de Apresentação Gerencial (16:9)',
      category: 'Relatórios',
      summary: 'Exportação executiva para reuniões de análise crítica da direção.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Gera apresentações profissionais no formato widescreen (16:9) prontas para a Reunião de Análise Crítica da Direção (RAC). Contém a identidade visual, logotipo, cores, metas de SLA e estatísticas exclusivas da sua organização, sem necessidade de retrabalho manual em editores de slides.
          </p>
        </div>
      ),
    },
    {
      id: 22,
      title: '22. Conheça o QualiGest (Tour Funcional)',
      category: 'Interface',
      summary: 'Módulo de tour guiado para novos colaboradores e demonstração institucional.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Apresenta as dimensões de valor da plataforma, servindo como ferramenta de treinamento rápido para novos colaboradores e inspetores recém-admitidos.
          </p>
        </div>
      ),
    },
    {
      id: 23,
      title: '23. Arquitetura do Sistema e Fluxo de Dados',
      category: 'Técnico',
      summary: 'Entrada, Validação Humana, Firestore Real-Time e Segurança de Nuvem.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            O QualiGest foi construído com arquitetura Zero Trust:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Sincronização reativa instantânea via Firestore (`onSnapshot`).</li>
            <li>Isolamento de subcoleções por Tenant ID (`organizations/&#123;orgId&#125;/*`).</li>
            <li>Regras de segurança que validam o status do usuário em cada requisição de escrita ou leitura.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 24,
      title: '24. Administração da Organização (Tenant)',
      category: 'Admin',
      summary: 'Configuração de setores, categorias, identidade visual e SLAs contratuais.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            O Administrador do tenant ({orgName}) possui autonomia completa para personalizar o QualiGest de acordo com a estrutura da sua oficina, adicionando setores customizados, categorias de desvio e identidade visual.
          </p>
        </div>
      ),
    },
    {
      id: 25,
      title: '25. Segurança, Privacidade e Isolamento de Dados',
      category: 'Segurança',
      summary: 'Garantia de não-vazamento entre clientes e trilha de auditoria inviolável.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>
            Cada cliente do QualiGest opera em um compartimento lógico estritamente segregado. Nenhuma query, busca ou IA tem permissão para cruzar fronteiras entre diferentes organizações. Cada ação relevante gera registro na Trilha de Auditoria com carimbo de tempo, e-mail do autor e payload modificado.
          </p>
        </div>
      ),
    },
    {
      id: 26,
      title: '26. Perguntas Frequentes (FAQ Operacional)',
      category: 'Suporte',
      summary: 'Respostas para as principais dúvidas de uso do dia a dia.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <strong className="text-slate-900 block font-bold">1. Posso alterar uma RNC após o encerramento?</strong>
            <p className="text-slate-600">Não. Por requisitos da ANAC, RNCs encerradas são imutáveis. Caso novas evidências surjam, uma RNC complementar referenciando a anterior deve ser aberta.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <strong className="text-slate-900 block font-bold">2. A IA pode preencher e aprovar a RNC sozinha?</strong>
            <p className="text-slate-600">Não. O QualiGest adota a política "Human-in-the-Loop". Toda sugestão da IA exige revisão e aprovação formal por um auditor ou gestor qualificado.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <strong className="text-slate-900 block font-bold">3. Como imprimo a ficha oficial em duas vias?</strong>
            <p className="text-slate-600">Acesse "Ficha Oficial F 001-29", selecione a RNC desejada e clique em "Imprimir / Salvar PDF". O modelo já está diagramado em conformidade com o padrão homologado.</p>
          </div>
        </div>
      ),
    },
    {
      id: 27,
      title: '27. Solução de Problemas e Diagnóstico',
      category: 'Suporte',
      summary: 'Orientações para erros de conexão, permissão negada ou atualização de perfil.',
      content: (
        <div className="space-y-3 text-xs text-slate-700">
          <p>Em caso de comportamento inesperado:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li><strong>Aviso de "Permissão Negada":</strong> Verifique se seu perfil de usuário possui a prerrogativa necessária (ex: apenas ADMIN altera configurações da organização).</li>
            <li><strong>Falha de Sincronização:</strong> Clique no botão "Diagnóstico" na barra superior para verificar a integridade da conexão com a nuvem Firestore.</li>
            <li><strong>Sessão Bloqueada (Usuário Inativo):</strong> Contate o Administrador da sua organização para reativar seu acesso no painel de membros.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 28,
      title: '28. Visão Mestre, Arquitetura e Roadmap Estratégico (Fase 12)',
      category: 'Estratégia & Futuro',
      summary: 'A trajetória de maturidade em 5 níveis, governança de IA copiloto e horizonte evolutivo.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>O Futuro Planejado do QualiGest SGQ</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              O QualiGest SGQ foi projetado como um sistema vivo que amadurece junto com a organização de manutenção ou operador aéreo, percorrendo 5 níveis de excelência:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
              <div className="p-2 bg-white rounded border border-blue-200">
                <span className="font-bold text-blue-800 block text-[11px]">N1 — Básico</span>
                <p className="text-[10px] text-slate-600">Formulários oficiais F 001-29 e registro digital.</p>
              </div>
              <div className="p-2 bg-white rounded border border-blue-200">
                <span className="font-bold text-blue-800 block text-[11px]">N2 — Digitalizado</span>
                <p className="text-[10px] text-slate-600">Ishikawa 6M, 5 Porquês, 5W2H e Matriz de Risco 5x5.</p>
              </div>
              <div className="p-2 bg-white rounded border border-blue-200 bg-blue-100/50">
                <span className="font-bold text-blue-900 block text-[11px]">N3 — Integrado ★</span>
                <p className="text-[10px] text-slate-700 font-medium">Saúde SGQ, Manuais e Matriz de Competências (Atual).</p>
              </div>
              <div className="p-2 bg-white rounded border border-blue-200">
                <span className="font-bold text-blue-800 block text-[11px]">N4 — Inteligente</span>
                <p className="text-[10px] text-slate-600">Copiloto IA assistido com supervisão humana 100%.</p>
              </div>
              <div className="p-2 bg-white rounded border border-blue-200">
                <span className="font-bold text-blue-800 block text-[11px]">N5 — Preditivo</span>
                <p className="text-[10px] text-slate-600">Antecipação de riscos sistêmicos e benchmarking.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Princípios Inegociáveis:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>IA como Copiloto:</strong> A inteligência artificial nunca toma decisões de conformidade de forma autônoma. O parecer e a assinatura de engenharia/SGQ são sempre humanos.</li>
              <li><strong>Zero Regressão:</strong> Nenhuma evolução tecnológica quebra fluxos ou requisitos regulatórios já homologados.</li>
              <li><strong>Dados Reais:</strong> O sistema não projeta ou interpola métricas quando a amostragem for insuficiente, preservando a idoneidade do SGQ.</li>
            </ul>
          </div>

          {onNavigateToTab && (
            <div className="pt-2">
              <button
                onClick={() => onNavigateToTab('apresentacao')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 cursor-pointer shadow-xs"
              >
                <Compass className="w-4 h-4" />
                <span>Explorar Apresentação Gerencial & Evolução Integrada</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 29,
      title: '29. Auditorias, Requisitos e Controles de Clientes (Fase 13)',
      category: 'Auditorias & Clientes',
      summary: 'Arquitetura "Um Controle, Vários Requisitos", Cockpit por Base Operacional e Pré-avaliação IA supervisionada.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-sky-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Princípio Central: "Um Controle, Vários Requisitos"</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              Diferentes clientes (Ex: Petrobras, Shell, CHC, Vale) e autoridades podem auditar os mesmos processos da organização (Treinamentos, Calibração, Ferramental, FDM). O QualiGest não cria silos ou checklists redundantes: um único Controle Central SGQ alimenta evidências para múltiplos requisitos contratuais simultaneamente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">1. Cockpit & Bases</span>
              <p className="text-slate-600 text-[11px]">
                Monitoramento da taxa de conformidade geral e individualizada por estação operacional (ex: SBRJ, SBME, SBPS).
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">2. Pré-Avaliação com IA</span>
              <p className="text-slate-600 text-[11px]">
                A IA analisa as evidências anexadas e sugere probabilidade de conformidade e lacunas. O Auditor Humano valida obrigatoriamente.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">3. Geração Direta de RNC</span>
              <p className="text-slate-600 text-[11px]">
                Qualquer não conformidade identificada em auditoria de cliente gera automaticamente uma RNC F 001-29 com vínculo rastreável.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
            <span className="font-bold block">Importante — Diretrizes Aeronáuticas de Conformidade:</span>
            <p>
              A IA do QualiGest atua exclusivamente como assistente consultivo. Toda aprovação formal de conformidade, classificação de severidade e encerramento de plano de ação permanecem sob a responsabilidade nominal de auditores e gestores qualificados.
            </p>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('clientes-requisitos')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Requisitos & Avaliações</span>
              </button>
              <button
                onClick={() => onNavigateToTab('clientes-matriz')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer shadow-xs"
              >
                <span>Ver Matriz de Cobertura SGQ</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 30,
      title: '30. Gestão Consolidada de Pessoas, Competências 360° & Governança Operacional',
      category: 'Pessoas & Competências',
      summary: 'Dossiê 360° do técnico, novos status operacionais (Ativo, Em Treinamento, Restrito, Suspenso, Afastado), tabela executiva de efetivo e navegação por status.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Visão 360° do Colaborador, Status Operacionais & Blindagem de Aptidão</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              O módulo de Pessoas & Competências centraliza a ficha completa do colaborador técnico em 8 abas de governança: <strong>Cadastro</strong>, <strong>Competências</strong>, <strong>Treinamentos</strong>, <strong>CHTs/Qualificações ANAC</strong>, <strong>Autorizações Técnicas</strong>, <strong>Aptidão & Restrições</strong>, <strong>Vencimentos</strong> e <strong>Histórico de Auditoria</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-[12px]">Status Operacional vs Aptidão Técnica</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                O sistema separa com precisão o <strong>Status Operacional</strong> (disponibilidade contratual/escala: <code>ATIVO</code>, <code>EM_TREINAMENTO</code>, <code>RESTRITO</code>, <code>SUSPENSO</code>, <code>AFASTADO</code>, <code>DESLIGADO</code>) da <strong>Aptidão Operacional</strong> (habilitação técnica: <code>APTO</code>, <code>APTO_COM_RESTRICAO</code>, <code>NAO_APTO</code>, <code>EM_AVALIACAO</code>). Um colaborador ATIVO pode estar Não Apto para uma tarefa específica caso sua CHT ou curso de Fatores Humanos esteja vencido.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block text-[12px]">Tabela Executiva de Efetivo & Filtros Diretos</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                O <strong>Dashboard de Competências</strong> apresenta a distribuição quantitativa e percentual do efetivo por status. Clicar em qualquer card de status no Dashboard ou nos chips de filtro da tela de Colaboradores filtra instantaneamente a relação nominal dos técnicos com aquele status específico.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <span className="font-bold text-slate-900 block text-[12px]">Apresentação Gerencial Dinâmica (Slide 10)</span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              No gerador PPTX, o Slide 10 reflete o Quadro Executivo de Status Operacional e os slides seguintes trazem o detalhamento nominal do efetivo em lotes organizados, sem comprimir informações e respeitando o limite seguro de visualização.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
            <span className="font-bold block">Diretriz Regulamentar ANAC RBAC 145.163 / EASA Part-145:</span>
            <p>
              Toda emissão de Atestado de Liberação de Aeronave (APRS) requer validação de CHT ativa e curso de fatores humanos vigente no ciclo bienal. Qualquer restrição ativa é sinalizada como barreira de segurança operacional.
            </p>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('pessoas-competencias')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Painel de Colaboradores</span>
              </button>
              <button
                onClick={() => onNavigateToTab('competencias-dashboard')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer shadow-xs"
              >
                <span>Ver Dashboard Executivo</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 31,
      title: '31. Auditoria Inteligente por Requisitos com Resolução por Exceção (Fase 13 Avançada)',
      category: 'Auditorias & Clientes',
      summary: 'Checklists regulatórios Kalitta QA-14 / EASA / ANAC, árvore hierárquica por Seções, Resolução por Exceção em lote e geração direta de RNC F 001-29.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-sky-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>Resolução por Exceção: Máxima Eficiência em Auditorias Extensas</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              Auditorias regulatórias e de grandes clientes aéreos frequentemente contêm centenas de itens (ex: Checklist <strong>Kalitta Air QA-14</strong> com 11 seções detalhadas). O paradigma tradicional de preenchimento individual e moroso é substituído pela <strong>Resolução por Exceção</strong>: itens conformes são confirmados em lote pelo auditor líder, concentrando a atenção técnica estritamente nas exceções, observações e desvios que demandam ação corretiva.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">1. Árvore Hierárquica</span>
              <p className="text-slate-600 text-[11px]">
                Navegação intuitiva por seções operacionais (Hangar, Ferramental, Publicações, Pessoal, Segurança) com contadores em tempo real de conformidade.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">2. Confirmação em Lote</span>
              <p className="text-slate-600 text-[11px]">
                Botão de aprovação em massa para seções integralmente aderentes, acelerando a auditoria sem abrir mão de evidências obrigatórias.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">3. Desvio → RNC Automática</span>
              <p className="text-slate-600 text-[11px]">
                Marcar um item como Não Conforme abre instantaneamente o modal de emissão da RNC F 001-29 pré-preenchida com o requisito e norma aplicável.
              </p>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('smart-audit')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Auditoria Inteligente</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 32,
      title: '32. System Designer Permanente & Registro Oficial de ADRs (Fase 14)',
      category: 'Arquitetura & Governança',
      summary: 'Arquitetura viva, registro imutável de Decisões Arquiteturais (ADRs), topologia de sistemas, matriz de integração de dados e rastreabilidade técnica.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-purple-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>System Designer Oficial: Governança Tecnológica Documentada e Viva</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              Em atendimento às melhores práticas de engenharia de software aeronáutico, o QualiGest SGQ mantém o <strong>System Designer Oficial Permanente</strong>. Este módulo atua como o registro fidedigno da arquitetura do sistema, assegurando que todas as decisões estruturais, padrões de segurança e interfaces permaneçam acessíveis para auditorias técnicas e homologação contínua.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">Registro de Decisões Arquiteturais (ADRs)</span>
              <p className="text-slate-600 text-[11px]">
                Catálogo histórico de Architectural Decision Records documentando contexto, opções avaliadas, decisão adotada e consequências para o SGQ (ex: isolamento multi-tenant Firestore, motor SSoT 70/30, resiliência server-side com fallback).
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">Topologia & Contratos de Interface</span>
              <p className="text-slate-600 text-[11px]">
                Diagramas de componentes em camadas (Frontend React 19 SPA, Backend Node.js Express, Cloud Firestore ABAC e Provedores IA), com matriz de fluxo de dados e inventário de coleções.
              </p>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('system-designer')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer shadow-xs"
              >
                <span>Acessar System Designer Oficial</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 33,
      title: '33. Motor de Importação Inteligente & Reconciliação com Reversão (Fase 15)',
      category: 'Recursos & Controles',
      summary: 'Wizard de 4 etapas: Upload e Detecção, Mapeamento Inteligente com IA Gemini, Validação com Diff e Reconciliação com Reversão Segura (Undo).',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Importação Segura em 4 Etapas com Reconciliação e Desfazer</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              O módulo de <strong>Importação Inteligente (Fase 15)</strong> resolve o desafio crítico de migração e carga de dados de ferramentas legadas, planilhas Excel e acervos antigos sem risco de corrupção ou duplicidade no banco operacional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Etapa 1: Upload & Tipo</span>
              <p className="text-slate-600">Detecção automática do tipo de dado (Colaboradores, Treinamentos, Manuais, Ferramental) via parser local XLSX/CSV.</p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Etapa 2: Mapeamento IA</span>
              <p className="text-slate-600">Sugestão semântica de colunas assistida por IA Gemini com templates homologados reutilizáveis.</p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Etapa 3: Diff & Validação</span>
              <p className="text-slate-600">Pré-visualização colorida de adições (verde), atualizações (azul) e deduplicação sem conflito.</p>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Etapa 4: Carga & Undo</span>
              <p className="text-slate-600">Gravação em lote no Firestore com histórico e botão de reversão completa (Undo) caso necessário.</p>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('smart-import')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer shadow-xs"
              >
                <span>Abrir Importação Inteligente</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 34,
      title: '34. Conectores e API de Integração MRO (Impacto MRO Connect)',
      category: 'Recursos & Controles',
      summary: 'Proxy server-side seguro (`/api/impacto/*`), integração com Ordens de Serviço (OS), Ferramental, Pessoal e contingência offline.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Conectividade Hangar: Integração com Sistemas de Produção MRO</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              O QualiGest SGQ se conecta de forma segura aos sistemas de gestão operacional da oficina através do <strong>Impacto MRO Connect</strong>. Todas as chamadas trafegam pelo proxy do servidor Node.js Express (`server.ts`), mantendo chaves de API restritas e protegidas contra exposição no navegador.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">Ordens de Serviço (OS)</span>
              <p className="text-slate-600 text-[11px]">
                Consulta em tempo real de OSs ativas, aeronaves no hangar, escopo de tarefas e histórico de qualidade do atendimento.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">Ferramental Calibrado</span>
              <p className="text-slate-600 text-[11px]">
                Sincronização de certificados de calibração RBC, validade de torquímetros e bloqueio de ferramentas em quarentena.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">Contingência Operacional</span>
              <p className="text-slate-600 text-[11px]">
                Caso o ERP ou conexão externa oscile, o sistema opera em modo de contingência garantindo que nenhuma inspeção seja paralisada.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 35,
      title: '35. Visão de Futuro & Horizontes de Evolução Tecnológica (Roadmap Estratégico)',
      category: 'Fundamentos',
      summary: 'Os 4 Horizontes de Evolução Tecnológica do QualiGest SGQ (H1 a H4), compromissos de desenvolvimento contínuo e arquitetura preditiva.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Planejamento Estratégico & Horizontes de Evolução (H1 a H4)</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              O desenvolvimento do QualiGest é orientado pela metodologia dos <strong>Quatro Horizontes de Inovação</strong>, assegurando evolução sustentável, blindagem contra regressão e aderência constante às diretrizes internacionais da ANAC, EASA e FAA.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
              <span className="font-bold text-emerald-950 block text-[12px]">H1: Core Consolidado (100% Homologado)</span>
              <p className="text-emerald-800 text-[11px]">
                Fases 1 a 15 ativas em produção: Formulário F 001-29, Ishikawa 6M, Matriz 5x5, Pessoas/CHTs, Máquina Temporal Documental, Metrologia RBC, Apresentação 70/30, Auditoria por Exceção, System Designer ADRs e Smart Import.
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
              <span className="font-bold text-amber-950 block text-[12px]">H2: Conectores ERP & MRO Connect (Em Andamento)</span>
              <p className="text-amber-800 text-[11px]">
                Expansão dos conectores com ERPs de grande porte (SAP, Totvs, Quantum), Diário de Bordo Eletrônico (ELB) e automação de leitura de códigos de barras de ferramentas.
              </p>
            </div>
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg space-y-1">
              <span className="font-bold text-sky-950 block text-[12px]">H3: SGQ Preditivo & Confiabilidade ATA 100 (Planejado)</span>
              <p className="text-sky-800 text-[11px]">
                Modelagem estocástica de falhas em frotas de aeronaves, alertas cruzados de Diretrizes de Aeronavegabilidade (AD/DA) e predição de reposição de componentes críticos.
              </p>
            </div>
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg space-y-1">
              <span className="font-bold text-slate-900 block text-[12px]">H4: Ecossistema Global Inter-MRO (Visão Futura)</span>
              <p className="text-slate-700 text-[11px]">
                Rede colaborativa segura e anonimizada entre centros de serviços para intercâmbio de lições aprendidas, benchmarking normativo e inteligência coletiva em segurança operacional.
              </p>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('visao-roadmap')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 cursor-pointer shadow-xs"
              >
                <span>Abrir Visão e Roadmap Completo</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 36,
      title: '36. Alinhamento do Banco de Manuais (IA) com o Acervo & Revisões (SGQ)',
      category: 'Manuais',
      summary: 'Como verificar correspondência, identificar referências oficiais vigentes, interpretar alertas e atualizar o Banco IA de forma controlada.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O <strong>QualyQuest</strong> integra de forma inteligente o módulo <strong>Acervo & Revisões</strong> (Controle Documental do SGQ) ao módulo <strong>Banco de Manuais (IA)</strong>. O objetivo essencial é manter os dois módulos alinhados, garantindo que as rotinas de Inteligência Artificial consultem sempre a versão oficial mais recente nas análises e fundamentações de <strong>Não Conformidades (NCs / RNCs)</strong>.
          </p>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-700" />
              Por que esta integração é mandatória para a Governança SGQ?
            </h4>
            <ul className="text-xs text-purple-900 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Fundamentação de NCs:</strong> A IA utiliza o conteúdo do Banco de Manuais para apontar requisitos violados em itens de inspeção. Se um manual na IA estiver defasado (ex: Rev. 10 vs Rev. 12 oficial), a análise técnica se torna vulnerável em auditorias regulatórias (RBAC 145 / EASA).
              </li>
              <li>
                <strong>Verificação Automatizada e em Lote:</strong> O sistema checa automaticamente fontes públicas (robô ANAC/FAA) e, em paralelo, afere a sincronicidade dos manuais da IA contra o acervo com um único clique.
              </li>
              <li>
                <strong>Atualização Controlada:</strong> A detecção de nova revisão oficial <em>jamais substitui automaticamente</em> o manual na IA de forma cega. A atualização segue um fluxo assistido, no qual o responsável técnico revisa os dados e registra formalmente a justificativa no log de auditoria.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Classificação e Confiabilidade das Revisões e Datas (Critérios SGQ)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Revisão Oficial Confirmada
                </span>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Atestada diretamente por fonte pública oficial (robô ANAC/FAA), catálogo oficial do fabricante ou portal regulador com data de vigência comprovada.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 space-y-1">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Revisão Registrada no Acervo
                </span>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Cadastrada formalmente pelo setor de controle documental no SGQ, mas ainda pendente de confirmação por robô ou fonte pública externa.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 space-y-1">
                <span className="font-bold text-purple-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Revisão do Banco de Manuais (IA)
                </span>
                <p className="text-purple-800 text-[11px] leading-relaxed">
                  Versão atualmente indexada para o motor de inteligência artificial gerar fundamentações e requisitos em análises de NCs.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Segregação Rigorosa da Data de Upload
                </span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  A data de envio/upload de arquivos é puramente administrativa e <strong>nunca é aceita como evidência de vigência</strong> ou atualização documental.
                </p>
              </div>
            </div>

            <div className="mt-2 p-2.5 rounded-lg bg-slate-100 border border-slate-300 text-[11px] text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">Tratamento de Incertezas Cronológicas e Alfanuméricas:</span>
              <p>
                Revisões com formatos alfanuméricos com sufixos (ex: <em>Rev. 12B vs 12A</em>), formatos heterogêneos sem padrão numérico ou sem ordem cronológica demonstrável sinalizam obrigatoriamente <strong>Necessidade de Análise Manual</strong>. O sistema proíbe categoricamente declarações automáticas de conformidade nesses cenários.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Como Interpretar os Alertas no Acervo & Revisões
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-900 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Sincronizado (IA Alinhado)
                </span>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  A revisão no Banco IA corresponde exatamente à referência oficial mais recente. A IA está apta para fundamentar NCs com total conformidade.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="font-bold text-rose-900 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Alerta: Banco IA Desatualizado
                </span>
                <p className="text-rose-800 text-[11px] mt-0.5">
                  O acervo ou fonte oficial indica revisão superior (ex: Rev. 12), mas a IA possui versão anterior (ex: Rev. 10). Requer atualização controlada.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                <span className="font-bold text-sky-900 block flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-sky-600" />
                  Acervo SGQ Desatualizado
                </span>
                <p className="text-sky-800 text-[11px] mt-0.5">
                  O repositório de IA possui revisão mais recente que o registro controlado no acervo. Requer atualização do controle documental do SGQ.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  Sem Correspondência / Análise Manual
                </span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  O documento não possui vínculo confiável ou apresenta dúvida cronológica/técnica. O sistema impede falsas declarações de conformidade e solicita vinculação manual.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Passo a Passo: Como Realizar a Verificação e Atualização Controlada
            </h4>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside">
              <li>
                <strong>Acessar o Acervo & Revisões:</strong> No menu lateral, clique em <em>Acervo & Revisões (SGQ)</em>.
              </li>
              <li>
                <strong>Disparar a Verificação:</strong> Clique no botão <em>"Verificar Banco IA (NCs)"</em> ou <em>"Verificar Atualizações"</em> no cabeçalho para varrer as fontes públicas e aferir o alinhamento com a IA simultaneamente.
              </li>
              <li>
                <strong>Identificar Divergências:</strong> Localize os cartões com o selo vermelho <em>"IA Desatualizado"</em> ou o banner de aviso no topo.
              </li>
              <li>
                <strong>Abrir o Modal de Alinhamento:</strong> Clique no botão <em>"Banco IA"</em> ou <em>"Checar IA"</em> no cartão do documento para abrir o comparativo detalhado.
              </li>
              <li>
                <strong>Conferir e Validar Dados:</strong> Confira a revisão oficial confirmada, a revisão do acervo, a fonte utilizada e a data de vigência oficial (segregada da data de upload).
              </li>
              <li>
                <strong>Confirmar Atualização Controlada:</strong> Clique em <em>"Atualizar Banco IA (Controlado)"</em>, insira a <strong>justificativa técnica formal</strong> (mínimo de 15 caracteres) e confirme. Usuários apenas visualizadores (Viewer) são bloqueados.
              </li>
              <li>
                <strong>Rastreabilidade e Prevenção de Conflitos:</strong> O sistema realiza verificação otimista de concorrência, atualiza o manual na IA, registra o log em <em>LogVerificacaoFonteExterna</em> e audita formalmente a transação, mantendo intactos todos os registros anteriores.
              </li>
              <li>
                <strong>Impacto nas NCs:</strong> As rotinas de auditoria e fundamentação de NCs passam a adotar imediatamente o manual atualizado e a nova revisão vigente.
              </li>
            </ol>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('controle-documental')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Acervo & Revisões (SGQ)</span>
              </button>
              <button
                onClick={() => onNavigateToTab('manuais')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Banco de Manuais (IA)</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 37,
      title: '37. Controle Documental de Empresas e Frotas (MEL, AMM, IPC & Cobranças)',
      category: 'Controle Documental & Acervo Técnico',
      summary: 'Centralização de manuais de operadores clientes (MEL, AMM, IPC), suporte a múltiplas MELs coexistentes por frota, segregação estrita entre revisão e recebimento, histórico rastreável de cobranças e relatórios executivos.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O <strong>QualyQuest</strong> dispõe de um módulo dedicado para <strong>Controle Documental de Empresas e Frotas</strong>, permitindo que a <strong>IMPACTO Aviation</strong> controle de ponta a ponta as publicações técnicas dos operadores e clientes atendidos (como <em>Atlas Air, Kalitta Air, SWISS</em>, entre outros).
          </p>

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-700" />
              Diretrizes de Governança por Empresa & Frota (RBAC 145.109 / FAA Part 145)
            </h4>
            <ul className="text-xs text-sky-900 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Múltiplas MELs Coexistentes:</strong> Uma mesma empresa cliente pode possuir várias frotas e mais de uma MEL (ex: <em>MEL Boeing 737-800</em> e <em>MEL Airbus A320</em>). Cada MEL possui chave e controle próprios, associados à respectiva frota ou aplicação. A atualização da MEL de uma frota jamais sobrescreve ou altera os demais registros.
              </li>
              <li>
                <strong>Segregação Estrita (Revisão vs Recebimento):</strong> A situação da revisão documental (vigência oficial) é rigorosamente separada da situação de recebimento do arquivo. Um manual pode estar vigente oficialmente e pendente de recebimento; da mesma forma, um arquivo recebido pode estar desatualizado ou com pendência apontada na conferência.
              </li>
              <li>
                <strong>Histórico Imutável de Cobranças:</strong> Todas as interações com a empresa são registradas com data, canal (e-mail, portal, telefone, WhatsApp, reunião), responsável e resultado, preservando integralmente o histórico anterior.
              </li>
              <li>
                <strong>Mensagens Prontas para Envio Manual:</strong> O sistema prepara a minuta da mensagem de cobrança em Português ou Inglês com um clique para cópia, sem simular envios automáticos inexistentes.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Procedimento Passo a Passo: Operação do Controle de Empresas e Frotas
            </h4>
            <ol className="text-xs text-slate-700 space-y-2.5 list-decimal list-inside">
              <li>
                <strong>1. Acessar a Sub-Aba "Empresas & Frotas":</strong> No menu lateral, acesse <em>Acervo & Revisões (SGQ)</em> e clique na sub-aba <strong>3. Empresas & Frotas</strong>.
              </li>
              <li>
                <strong>2. Selecionar ou Filtrar a Empresa Atendida:</strong> Na visão por empresa, selecione o cliente contratante (ex: <em>Atlas Air, Inc.</em>) para carregar todos os manuais técnicos vinculados ao operador.
              </li>
              <li>
                <strong>3. Cadastrar Novo Documento / MEL por Frota:</strong> Clique no botão <em>"Nova MEL / Manual de Frota"</em>. Selecione a empresa, defina o tipo (MEL, AMM, IPC, etc.), informe obrigatoriamente a <strong>Frota Aplicável</strong> (ex: <em>Boeing 737-800</em>), o código do manual e a revisão inicial de referência.
              </li>
              <li>
                <strong>4. Cadastrar Múltiplas MELs para a Mesma Empresa:</strong> Para cadastrar uma segunda MEL da mesma empresa, repita o processo informando a nova frota (ex: <em>Airbus A320</em>). O QualyQuest registrará a nova MEL mantendo a primeira intacta.
              </li>
              <li>
                <strong>5. Consultar a Situação Documental:</strong> No painel, verifique a comparação entre a <em>Revisão Oficial Vigente</em> e a <em>Revisão Recebida</em>. Divergências são destacadas em vermelho (Desatualizado) ou amarelo (Análise Manual Obrigatória).
              </li>
              <li>
                <strong>6. Registrar Solicitação e Cobrança:</strong> Clique no botão <em>"Cobrar / Interagir"</em> no cartão do documento. Selecione o canal utilizado, registre o resultado da ação, defina o novo prazo acordado para retorno e clique em <em>"Copiar Texto"</em> para enviar a minuta formalizada pelo canal oficial da sua empresa.
              </li>
              <li>
                <strong>7. Acompanhar Prazos e Vencimentos:</strong> No painel de cobranças, consulte as solicitações com prazo ultrapassado e o histórico de cada tentativa de contato realizada.
              </li>
              <li>
                <strong>8. Registrar Recebimento do Arquivo:</strong> Quando o operador fornecer o manual atualizado, clique em <em>"Registrar Recebimento"</em>, informe a revisão declarada no documento e a data efetiva de recebimento. O status avançará para <em>"Aguardando Conferência"</em>.
              </li>
              <li>
                <strong>9. Realizar a Conferência Técnica SGQ:</strong> Clique no botão <em>"Conferir Técnico"</em>. Verifique a lista de páginas efetivas (LEP) e a aplicabilidade da frota. Registre o parecer formal e homologue como <em>"Conferido e Aceito"</em> ou <em>"Recebido com Pendência"</em>.
              </li>
              <li>
                <strong>10. Consultar Relatórios Executivos da Qualidade:</strong> Na sub-aba <em>"Relatório Executivo"</em>, acompanhe a tabela consolidada por empresa, verifique a taxa de pendências e exporte os dados em formato CSV para apresentações gerenciais e auditorias regulatórias.
              </li>
            </ol>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('controle-documental')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Controle de Empresas & Frotas</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 38,
      title: '38. Histórico de Treinamentos & Correções Rastreáveis (Edição e Auditoria)',
      category: 'Pessoas & Competências',
      summary: 'Procedimento para consultar, editar e corrigir registros de treinamento (incluindo importações automáticas), com validação de datas, recálculo de validades e trilha de auditoria com justificativa obrigatória.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            O <strong>QualyQuest SGQ</strong> fornece recursos completos para a gestão transparente e rastreável do histórico de capacitação técnica, atendendo às exigências do <strong>RBAC 145.163</strong> e aos padrões de auditoria da <strong>IMPACTO Aviation</strong>.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Diretrizes de Auditoria e Imutabilidade Histórica
            </h4>
            <ul className="text-xs text-amber-900 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Edição Responsável:</strong> A correção de registros de treinamento (especialmente aqueles provenientes de importação automática) é permitida para perfis com permissão operacional (ADMIN, GESTOR_SGQ e AUDITOR). Perfis com perfil somente de consulta (CONSULTA) estão estritamente bloqueados.
              </li>
              <li>
                <strong>Trilha de Auditoria Obrigatória:</strong> Ao alterar datas, validades ou dados críticos, o sistema solicita obrigatoriamente a <em>Justificativa da Correção</em>. O valor anterior, o valor corrigido, o usuário logado e o carimbo de data/hora são preservados em <code>historicoCorrecoes</code>.
              </li>
              <li>
                <strong>Atualização Automática de Prazos e Alertas:</strong> Ao salvar a alteração de data de realização ou validade, o motor de qualificação recalcula imediatamente a situação de vencimento (Válido, A Vencer, Vencido), sincronizando o Dossiê 360°, a Central de Alertas e os relatórios executivos.
              </li>
              <li>
                <strong>Identificação de Origem:</strong> Registros carregados por rotinas automáticas exibem o selo identificador <em>"Importado Automaticamente"</em> para transparência em auditorias.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Passo a Passo: Como Corrigir um Treinamento no Histórico
            </h4>
            <ol className="text-xs text-slate-700 space-y-2.5 list-decimal list-inside">
              <li>
                <strong>1. Acessar a Tela de Treinamentos:</strong> No menu lateral, selecione <em>Treinamentos & Qualificações</em> ou acesse a aba <em>Treinamentos</em> dentro do Dossiê 360° do colaborador.
              </li>
              <li>
                <strong>2. Localizar o Registro do Funcionário:</strong> Utilize os filtros por funcionário, curso ou situação de validade para encontrar o registro desejado.
              </li>
              <li>
                <strong>3. Acionar a Edição:</strong> Clique no botão com ícone de lápis <em>"Editar"</em> na linha do registro correspondente.
              </li>
              <li>
                <strong>4. Ajustar os Campos Pertinentes:</strong> Modifique a <em>Data de Realização</em>, <em>Data de Validade/Reciclagem</em>, <em>Carga Horária</em>, <em>Instituição Ministrante</em> ou <em>Resultado/Nota</em> conforme o certificado comprobatório.
              </li>
              <li>
                <strong>5. Registrar o Motivo da Correção:</strong> No campo de justificativa, descreva sucintamente a razão da alteração (ex: <em>"Ajuste da data de realização conforme Certificado nº 2024-884 anexado ao dossiê físico"</em>).
              </li>
              <li>
                <strong>6. Confirmar e Salvar:</strong> Clique em <em>"Salvar Registro"</em> e confirme a operação no modal de confirmação. As alterações passam a vigorar imediatamente.
              </li>
            </ol>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('treinamentos')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Painel de Treinamentos</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 39,
      title: '39. Gestão Integrada de Bases Operacionais (Estações e Desativação Lógica)',
      category: 'Estrutura & Bases Operacionais',
      summary: 'Cadastro, edição e desativação lógica de bases e estações operacionais da IMPACTO, garantindo integridade referencial com funcionários e registros históricos sem exclusão física destrutiva.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            As operações de manutenção da <strong>IMPACTO Aviation</strong> ocorrem em diferentes aeródromos e estações operacionais (como VCP, GRU, GIG, BSB, MAO, CNF, entre outros). A correta gestão das bases garante a alocação precisa do efetivo técnico e o controle de auditorias por localidade.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-700" />
              Princípios de Governança de Bases Operacionais
            </h4>
            <ul className="text-xs text-emerald-900 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Desativação Lógica vs Exclusão Física:</strong> Para preservar o histórico regulatório de funcionários, ordens de serviço e inspeções, o sistema <em>não exclui fisicamente</em> bases operacionais que possuam vínculos históricos. Em caso de encerramento de operações em uma localidade, a base é marcada como <code>Inativa</code>.
              </li>
              <li>
                <strong>Unicidade de Código/Sigla IATA/ICAO:</strong> Cada base deve possuir um código exclusivo no tenant, prevenindo cadastros em duplicidade.
              </li>
              <li>
                <strong>Seleção Inteligente nos Cadastros:</strong> Bases inativas deixam de ser sugeridas para novas alocações de colaboradores, mas continuam visíveis em consultas e relatórios retroativos de conformidade.
              </li>
              <li>
                <strong>Isolamento Multi-Tenant:</strong> As bases operacionais são estritamente particionadas por organização (<code>organizationId</code>).
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Como Gerenciar Bases Operacionais no QualyQuest
            </h4>
            <ol className="text-xs text-slate-700 space-y-2.5 list-decimal list-inside">
              <li>
                <strong>1. Acessar a Aba de Bases:</strong> Na tela <em>Pessoas & Competências</em>, clique na sub-aba <strong>Bases Operacionais</strong>.
              </li>
              <li>
                <strong>2. Cadastrar Nova Base:</strong> Clique em <em>"Nova Base Operacional"</em>. Preencha o Nome da Base (ex: <em>Base Viracopos - Hangar 1</em>), Código/Sigla (ex: <em>VCP</em>), Responsável Técnico, Endereço e Observações operacionais.
              </li>
              <li>
                <strong>3. Editar Informações de uma Base:</strong> Na listagem de bases, clique em <em>"Editar"</em> para atualizar o responsável, contatos ou observações sem alterar a chave primária da base.
              </li>
              <li>
                <strong>4. Desativar uma Base Encerrada:</strong> Utilize o botão <em>"Desativar"</em>. O sistema exibirá o aviso de proteção e manterá todos os técnicos previamente vinculados àquela estação intactos para efeito de auditoria ANAC.
              </li>
              <li>
                <strong>5. Vínculo no Cadastro do Colaborador:</strong> Na ficha de cadastro do funcionário, selecione a base ativa na lista suspensa correspondente.
              </li>
            </ol>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('pessoas-competencias')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Gestão de Bases</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 40,
      title: '40. Matriz de Competências, Níveis Técnicos e Autorizações da IMPACTO',
      category: 'Pessoas & Competências',
      summary: 'Estrutura da Matriz de Competências, distinção formal entre Treinamento x Competência x Autorização Técnica, níveis 1 a 5, processo de concessão, comitê de avaliação e periodicidade de reavaliação.',
      content: (
        <div className="space-y-4">
          <p className="text-slate-700 leading-relaxed">
            A <strong>Matriz de Competências Técnicas</strong> é o instrumento oficial que define com precisão quais atividades, inspeções e manutenções cada colaborador está formalmente qualificado e autorizado a executar na <strong>IMPACTO Aviation</strong>.
          </p>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-700" />
              Distinção Fundamental: Treinamento vs Competência vs Autorização
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                <span className="font-bold text-indigo-950 block">1. Treinamento Realizado</span>
                <p className="text-slate-600 leading-relaxed">
                  Evidência de que o técnico completou a instrução teórica ou prática (ex: curso de Familiarização Boeing 737NG). <em>O treinamento por si só NÃO constitui autorização para liberação de serviço.</em>
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                <span className="font-bold text-indigo-950 block">2. Competência Avaliada</span>
                <p className="text-slate-600 leading-relaxed">
                  Demonstração prática de habilidade e proficiência técnica em determinada tarefa, inspecionada e avaliada por um examinador/instrutor credenciado.
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                <span className="font-bold text-indigo-950 block">3. Autorização Técnica (APRS)</span>
                <p className="text-slate-600 leading-relaxed">
                  Concessão formal emitida pelo Diretor de Manutenção / Gestor SGQ autorizando o mecânico a assinar a liberação de aeronave ou componente sob escopo específico.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Níveis de Competência Padronizados (Escala 1 a 5)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-md">
                <span className="font-bold text-slate-900 block">Nível 1 — Básico</span>
                <p className="text-slate-600 mt-1">Conhecimento teórico elementar; atua sob supervisão direta contínua.</p>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-md">
                <span className="font-bold text-slate-900 block">Nível 2 — Prático</span>
                <p className="text-slate-600 mt-1">Executa rotinas padronizadas sob acompanhamento de técnico sênior.</p>
              </div>
              <div className="p-2.5 bg-white border border-blue-200 rounded-md">
                <span className="font-bold text-blue-900 block">Nível 3 — Autônomo</span>
                <p className="text-slate-600 mt-1">Executa manutenções preventivas e corretivas com plena autonomia técnica.</p>
              </div>
              <div className="p-2.5 bg-white border border-indigo-200 rounded-md">
                <span className="font-bold text-indigo-900 block">Nível 4 — Inspetor</span>
                <p className="text-slate-600 mt-1">Habilitado a realizar inspeções RII e aprovação de liberação de serviço (APRS).</p>
              </div>
              <div className="p-2.5 bg-white border border-purple-200 rounded-md">
                <span className="font-bold text-purple-900 block">Nível 5 — Especialista</span>
                <p className="text-slate-600 mt-1">Instrutor técnico, avaliador de bancada e solucionador de panes complexas (troubleshooting).</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Fluxo Operacional de Atribuição e Reavaliação
            </h4>
            <ol className="text-xs text-slate-700 space-y-2 list-decimal list-inside">
              <li>
                <strong>1. Catálogo Central de Competências:</strong> As competências são cadastradas por Categoria (Célula, Motores, Aviônicos, END/NDT, Qualidade, Apoio de Rampa), Tipo de Atividade (Inspeção, Manutenção, Calibração) e Modelo/Família de Aeronave.
              </li>
              <li>
                <strong>2. Atribuição ao Colaborador:</strong> Na aba <em>Matriz de Competências</em> ou no Dossiê 360°, selecione o colaborador e a competência correspondente.
              </li>
              <li>
                <strong>3. Parâmetros de Concessão:</strong> Defina o Nível (1 a 5), a Data de Avaliação/Concessão, o Responsável Técnico Avaliador, a Periodicidade de Reavaliação (ex: 12 ou 24 meses) e o Número da Portaria / Documento de Autorização.
              </li>
              <li>
                <strong>4. Situações Possíveis:</strong> As competências transitam entre <code>Ativa</code>, <code>Em Treinamento</code>, <code>Exige Reavaliação</code>, <code>Suspensa</code> ou <code>Revogada</code>.
              </li>
              <li>
                <strong>5. Relatórios e Matriz Cruzada:</strong> Visualize a grade cruzada (Colaboradores x Competências) para rápido planejamento de escalas operacionais e atendimento a auditorias de clientes.
              </li>
            </ol>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('pessoas-competencias')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Matriz de Competências</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 41,
      title: '41. Controle de Cursos por Frota, Níveis Técnicos e Reciclagens Vinculadas',
      category: 'Pessoas & Competências',
      summary: 'Gestão de cursos estruturados por família de aeronaves (Airbus A320, Boeing 737, ATR, Embraer), níveis técnicos modulares (Familiarização, Ramp & Transit, Motor, etc.), variantes de motor, reciclagens vinculadas e matriz por funcionário e frota.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            No setor aeronáutico, um treinamento não pode ser tratado apenas pelo nome genérico de uma aeronave. Para a frota <strong>Airbus A320</strong>, por exemplo, coexistem diferentes níveis e cursos com escopos distintos (como <em>Familiarização / Nível 1</em>, <em>Ramp & Transit / Nível 2</em>, <em>Line & Base Maintenance / Nível 3</em>, cursos específicos de motorização <em>CFM56</em> ou <em>LEAP-1A</em> e reciclagens periódicas).
          </p>

          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-sky-700" />
              Princípios Operacionais de Frotas e Níveis Técnicos
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-sky-950">
              <li>
                <strong>Cursos por Família/Frota:</strong> Cada curso do catálogo pode ser associado formalmente a uma frota (ex: <em>Airbus A320, Boeing 737, ATR 42/72, Embraer 190/195</em> ou <em>Geral</em>).
              </li>
              <li>
                <strong>Múltiplos Níveis Não-Cumulativos:</strong> A conclusão de um nível básico (ex: Familiarização) <em>não concede automaticamente</em> os níveis superiores (Ramp & Transit ou Line Maintenance). Cada nível deve ser comprovado individualmente.
              </li>
              <li>
                <strong>Múltiplas Frotas por Colaborador:</strong> O mesmo técnico pode possuir níveis distintos em diferentes frotas (ex: Nível 3 em A320 e Nível 1 em B737).
              </li>
              <li>
                <strong>Reciclagens com Preservação do Curso Inicial:</strong> Uma reciclagem operacional renova a validade do requisito, mas <em>não apaga nem sobrescreve o treinamento inicial</em> do mecânico, mantendo o histórico de instrução completo.
              </li>
              <li>
                <strong>Variantes e Motorização:</strong> Permite especificar variantes de aeronave e motor (ex: <em>CFM56, LEAP-1A, PW1100G</em>) quando exigido por contrato ou manual.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Matriz por Funcionário e Frota: Como Interpretar os Indicadores
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Na aba <strong>Matriz por Frota & Níveis</strong>, o SGQ consulta a qualificação consolidada de cada mecânico por família de aeronave:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-blue-900 block flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  1. Treinamento Realizado
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Indica que o mecânico concluiu a carga horária do curso/nível e obteve aprovação teórica e prática.
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-900 block flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  2. Competência Avaliada
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Avaliação prática e OJT com examinador credenciado conforme a matriz de proficiência operacional.
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-emerald-900 block flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  3. Autorização Formal (APRS)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Portaria, OS técnica ou credencial formal expedida pela Gestão da Qualidade da IMPACTO.
                </p>
              </div>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('pessoas-competencias')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 cursor-pointer shadow-xs"
              >
                <span>Acessar Matriz por Frota</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 42,
      title: '42. Exclusão em Lote do Histórico de Treinamentos (Calibração e Auditoria SGQ)',
      category: 'Pessoas & Competências',
      summary: 'Funcionalidade administrativa para expurgo em massa de registros de cursos importados durante a calibração de modelos documentais, com seleção múltipla, confirmação segura e justificativa obrigatória no log de auditoria.',
      content: (
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Durante a calibração de modelos de importação documental ou integração de planilhas legadas, lotes de cursos podem necessitar de reprocessamento integral. Para evitar a remoção manual individual de dezenas de registros, o <strong>QualyQuest SGQ</strong> disponibiliza a <strong>Exclusão em Lote</strong> com estrita rastreabilidade regulatória.
          </p>

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-700" />
              Salvaguardas de Auditoria e Segurança RBAC
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-rose-950">
              <li>
                <strong>Acesso Restrito:</strong> Operação restrita a usuários com perfil <code>ADMIN</code> e <code>GESTOR_SGQ</code>. Perfis de consulta (<code>CONSULTA</code> / <code>VIEWER</code>) estão tecnicamente bloqueados.
              </li>
              <li>
                <strong>Justificativa Técnica Obrigatória:</strong> É mandatório registrar a justificativa formal (mínimo 5 caracteres) descrevendo a razão do expurgo (ex: <em>"Calibração do modelo de importação de cursos; remoção do lote importado com divergência de datas"</em>).
              </li>
              <li>
                <strong>Log Permanente no Firestore:</strong> A operação é gravada na coleção de auditoria com o UID, e-mail do executor, data/hora e identificadores de todos os registros removidos.
              </li>
              <li>
                <strong>Atualização Instantânea dos Motores SGQ:</strong> Ao concluir o expurgo, os indicadores de vencimento, a matriz de frota e o Dossiê 360° são imediatamente recalculados.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Passo a Passo: Como Executar a Exclusão em Lote
            </h4>
            <ol className="text-xs text-slate-700 space-y-2.5 list-decimal list-inside">
              <li>
                <strong>1. Acessar o Histórico de Treinamentos:</strong> Na tela <em>Treinamentos & Qualificações</em>, abra a sub-aba <strong>Treinamentos (Histórico)</strong>.
              </li>
              <li>
                <strong>2. Filtrar os Registros Desejados:</strong> Utilize os filtros por <em>Origem</em> (ex: <em>"Apenas Importados Automaticamente"</em>), <em>Frota</em>, <em>Nível Técnico</em> ou <em>Colaborador</em> para isolar os registros importados incorretamente.
              </li>
              <li>
                <strong>3. Seleção em Massa:</strong> Marque a caixa de seleção no cabeçalho da tabela para marcar todos os registros visíveis daquela página ou lote, ou selecione registros específicos linha a linha.
              </li>
              <li>
                <strong>4. Barra de Ações Flutuante:</strong> Observe a barra azul suspensa indicando a quantidade de itens selecionados e clique em <em>"Excluir Selecionados em Lote"</em>.
              </li>
              <li>
                <strong>5. Modal de Conferência e Justificativa:</strong> No modal de confirmação, revise a lista prévia dos treinamentos que serão expurgados e digite obrigatoriamente a justificativa técnica.
              </li>
              <li>
                <strong>6. Confirmar Exclusão:</strong> Clique em <em>"Confirmar Exclusão"</em>. Acompanhe a barra de progresso em tempo real até a conclusão bem-sucedida.
              </li>
            </ol>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab('treinamentos')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer shadow-xs"
              >
                <span>Ir para Histórico de Treinamentos</span>
              </button>
            </div>
          )}
        </div>
      ),
    },
  ], [organization, orgName, orgSigla]);

  // Filtro de capítulos por busca
  const filteredChapters = useMemo(() => {
    if (!searchTerm.trim()) return chapters;
    const term = searchTerm.toLowerCase();
    return chapters.filter((c) => 
      c.title.toLowerCase().includes(term) || 
      c.summary.toLowerCase().includes(term) ||
      c.category.toLowerCase().includes(term)
    );
  }, [chapters, searchTerm]);

  const selectedChapter = useMemo(() => {
    return chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  }, [chapters, selectedChapterId]);

  // Lista de 12 Passos para o Teste do "Novo Usuário"
  const passosNovoUsuario = [
    { id: 1, step: 'Onde entrar e autenticar', desc: 'Identificar o modal de login ou botão de autenticação no cabeçalho.', tab: 'dashboard' },
    { id: 2, step: 'Verificar a organização ativa', desc: 'Conferir o nome e sigla da organização no cabeçalho e menu lateral.', tab: 'configuracoes-org' },
    { id: 3, step: 'Identificar seu perfil RBAC', desc: 'Verificar se você está como ADMIN, GESTOR_SGQ, AUDITOR ou CONSULTA.', tab: 'configuracoes-org' },
    { id: 4, step: 'Onde criar uma nova RNC', desc: 'Localizar o botão "Nova RNC" no menu lateral ou dashboard.', tab: 'formulario' },
    { id: 5, step: 'Como avaliar o risco inicial', desc: 'Selecionar severidade (1-5) e probabilidade (A-E) na Matriz 5x5 interativa.', tab: 'formulario' },
    { id: 6, step: 'Como registrar a causa raiz', desc: 'Preencher a análise de causa (Ishikawa/5 Porquês) distinguindo hipótese de fato.', tab: 'formulario' },
    { id: 7, step: 'Como criar o plano de ação', desc: 'Elaborar o 5W2H com responsável nominal, prazo e método de implementação.', tab: 'formulario' },
    { id: 8, step: 'Como acompanhar os prazos', desc: 'Consultar a Central de Alertas e verificar os dias restantes conforme o SLA.', tab: 'alertas' },
    { id: 9, step: 'Como verificar a eficácia', desc: 'Registrar evidência objetiva de que o desvio foi eliminado após observação.', tab: 'formulario' },
    { id: 10, step: 'Como encerrar a RNC', desc: 'Validar aprovação formal com assinatura eletrônica do GESTOR_SGQ.', tab: 'formulario' },
    { id: 11, step: 'Onde consultar manuais técnicos', desc: 'Pesquisar normas vigentes na Biblioteca de Manuais e MOMQ.', tab: 'manuais' },
    { id: 12, step: 'Onde visualizar indicadores gerais', desc: 'Analisar tendências de Pareto, taxa de eficácia e gráficos executivos.', tab: 'dashboard' },
  ];

  const handleToggleSimulador = (id: number) => {
    setSimuladorConcluidos((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-cyan-600" />
            <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              DOCUMENTAÇÃO OFICIAL DO QUALIGEST SGQ
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              TENANT: {orgSigla}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Manual de Utilização & Governança da Qualidade
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Guia completo de operação, segregação de funções, gestão de risco 5x5 e implantação multi-tenant.
          </p>
        </div>

        {/* Action: Quick Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSection('manual-geral')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              activeSection === 'manual-geral'
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Manual de Utilização ({chapters.length} Capítulos)
          </button>
          <button
            onClick={() => setActiveSection('manual-admin')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              activeSection === 'manual-admin'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Manual do Administrador
          </button>
          <button
            onClick={() => setActiveSection('manual-implantacao')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              activeSection === 'manual-implantacao'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Implantação de Novo Cliente
          </button>
          <button
            onClick={() => setActiveSection('manual-tecnico')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              activeSection === 'manual-tecnico'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Manual Técnico & Arquitetura (Fase 12)
          </button>
          <button
            onClick={() => setActiveSection('simulador-usuario')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              activeSection === 'simulador-usuario'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Simulador "Novo Usuário"
          </button>
        </div>
      </div>

      {/* SECTION 1: MANUAL DE UTILIZAÇÃO GERAL (27 CAPÍTULOS) */}
      {activeSection === 'manual-geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Chapter List & Search */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[12px] p-4 shadow-xs space-y-3 flex flex-col h-[700px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar capítulo, norma ou termo..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Capítulos Oficiais ({filteredChapters.length})
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredChapters.map((chap) => {
                const isSelected = chap.id === selectedChapterId;
                return (
                  <button
                    key={chap.id}
                    onClick={() => setSelectedChapterId(chap.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors cursor-pointer flex items-start justify-between gap-2 border ${
                      isSelected
                        ? 'bg-cyan-50/80 border-cyan-300 text-cyan-950 font-bold'
                        : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{chap.title}</div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{chap.summary}</p>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      {chap.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Chapter Detailed Content */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 uppercase">
                    {selectedChapter.category}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">Capítulo {selectedChapter.id} de {chapters.length}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedChapter.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedChapter.summary}
                </p>
              </div>

              {/* Dynamic Chapter Render */}
              <div className="prose prose-slate max-w-none text-sm">
                {selectedChapter.content}
              </div>
            </div>

            {/* Bottom Navigation between chapters */}
            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                disabled={selectedChapterId <= 1}
                onClick={() => setSelectedChapterId((prev) => Math.max(1, prev - 1))}
                className="text-xs font-semibold px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
              >
                ← Capítulo Anterior
              </button>

              <button
                disabled={selectedChapterId >= chapters.length}
                onClick={() => setSelectedChapterId((prev) => Math.min(chapters.length, prev + 1))}
                className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                Próximo Capítulo →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MANUAL DO ADMINISTRADOR (SEÇÃO 18) */}
      {activeSection === 'manual-admin' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                GUIA OFICIAL DE GOVERNANÇA E ADMINISTRAÇÃO
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Manual do Administrador do Tenant (ADMIN)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instruções completas para gestão de usuários, parâmetros regulatórios, SLAs e segurança.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <span>1. Gestão de Equipe e Controle de Acesso (RBAC)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Como Administrador, você possui permissão para visualizar todos os membros associados ao seu tenant, alterar seus papéis (GESTOR_SGQ, AUDITOR, CONSULTA) e revogar acessos instantaneamente alternando o status para <strong>INATIVO</strong>.
              </p>
              <p className="text-slate-500 italic">
                Regra de Proteção: O sistema impede que você desative ou rebaixe sua própria conta para evitar bloqueios acidentais de administração.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>2. Parametrização de Setores e Categorias</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Acesse a aba <strong>Configurações da Org</strong> para adicionar ou remover setores operacionais (ex: Linha de Voo, Hangar 2, Pintura) e categorias de não conformidade conforme o escopo da sua homologação ANAC.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>3. Configuração de SLAs Regulatórios</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Defina os prazos limites para tratativa de RNCs conforme a severidade de risco: P1 (horas para risco crítico), P2 (desvios de auditoria), P3 (dias úteis médios) e P4 (melhorias contínuas).
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>4. Identidade Visual e Documentos</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Configure a URL do logotipo da empresa, sigla aeronáutica ({orgSigla}), cor primária institucional e texto padrão do rodapé que constará na Ficha Oficial F 001-29 e nas apresentações executivas.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Scale className="w-4 h-4 text-purple-600" />
                <span>5. Governança da Evolução & Matriz de Decisão (Fase 12)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Utilize os 10 critérios objetivos da Matriz de Decisão Estratégica (Segurança de Voo, Conformidade ANAC/EASA, Redução de Carga de Trabalho, etc.) para aprovar personalizações e priorizar novas demandas do comitê SGQ.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>6. Supervisão de Inteligência Artificial</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Como administrador, assegure que todo parecer analítico gerado por IA atue estritamente como copiloto consultivo, exigindo validação, revisão e assinatura de um responsável técnico credenciado (Human-in-the-Loop).
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('configuracoes-org')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 cursor-pointer shadow-xs"
              >
                <Sliders className="w-4 h-4" />
                <span>Abrir Painel de Configurações da Organização</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: MANUAL DE IMPLANTAÇÃO DE NOVA ORGANIZAÇÃO (SEÇÃO 19) */}
      {activeSection === 'manual-implantacao' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                PROCEDIMENTO OPERACIONAL PADRÃO (POP-001)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Procedimento de Implantação de Novo Cliente
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Roteiro detalhado para provisionar uma nova organização do zero sem depender da equipe técnica de desenvolvimento.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sequência Oficial de Ativação do Tenant</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-3 bg-white border border-emerald-200 rounded">
                  <span className="font-bold text-emerald-800 block mb-1">Passo 1: Onboarding</span>
                  <p className="text-slate-600 text-[11px]">Acessar "Novo Cliente / Onboarding", preencher Nome da Empresa, Razão Social, E-mail do Administrador e Sigla.</p>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded">
                  <span className="font-bold text-emerald-800 block mb-1">Passo 2: Configuração</span>
                  <p className="text-slate-600 text-[11px]">Revisar a lista de setores operacionais e ajustar os SLAs de atendimento de Não Conformidades.</p>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded">
                  <span className="font-bold text-emerald-800 block mb-1">Passo 3: Manuais</span>
                  <p className="text-slate-600 text-[11px]">Inserir o primeiro manual normativo do cliente (ex: MOMQ / MGM) na Biblioteca de Manuais.</p>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded">
                  <span className="font-bold text-emerald-800 block mb-1">Passo 4: Homologação</span>
                  <p className="text-slate-600 text-[11px]">Criar a primeira RNC de teste no formulário oficial, verificar geração da ficha F 001-29 e liberar para a equipe.</p>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded">
                  <span className="font-bold text-emerald-800 block mb-1">Passo 5: Maturidade</span>
                  <p className="text-slate-600 text-[11px]">Avaliar o nível inicial na Régua N1 a N5 para traçar a evolução contínua da organização.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
              <h4 className="font-bold text-slate-800">Garantia de Isolamento de Dados:</h4>
              <p className="text-slate-600 leading-relaxed">
                Ao provisionar uma nova organização, o QualiGest inicializa um novo documento segregado no Firestore. Nenhuma RNC, histórico ou manual confidencial de clientes anteriores é copiado. O novo cliente começa com o ambiente 100% limpo e seguro para suas auditorias.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('onboarding-novo-cliente')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer shadow-xs"
              >
                <Building2 className="w-4 h-4" />
                <span>Iniciar Onboarding de Nova Organização</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: MANUAL TÉCNICO & ARQUITETURA DO SISTEMA (FASE 12) */}
      {activeSection === 'manual-tecnico' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-amber-600" />
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                MANUAL TÉCNICO & DIRETRIZES DE ENGENHARIA (FASE 12)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Arquitetura, Segurança Zero-Trust e Padrões de Código
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Referência definitiva para desenvolvedores, arquitetos e auditores de segurança do QualiGest SGQ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>1. Multi-Tenancy Estrito e Isolamento de Dados</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Todas as entidades sensíveis (RNCs, auditorias, membros, configurações) são segregadas na raiz pelo identificador da organização (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">organizationId</code>). Consultas transversais sem filtro de organização são terminantemente proibidas tanto no cliente quanto no Firestore Security Rules.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>2. Trilha de Auditoria Append-Only</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                A subcoleção <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">auditTrails</code> é imutável: operações de exclusão ou alteração são bloqueadas por regra de segurança (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">allow update, delete: if false</code>). Qualquer mutação de RNC ou configuração gera hash e registro de autoria irrefutável.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>3. Governança de IA com Chaves Server-Side</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Todas as integrações cognitivas e chamadas a modelos fundacionais (Gemini) utilizam rotas seguras backend (<code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">/api/*</code>). Nenhuma chave de API reside no front-end. Toda sugestão analítica passa por enriquecimento de contexto baseado nos manuais normativos vigentes do tenant.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>4. Política de Tolerância Zero para Dados Fictícios</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Relatórios executivos e apresentações PPTX não inventam dados ou extrapolam tendências sem base fática. Quando a amostragem for escassa ou nula, o sistema expressa claramente a condição de dados insuficientes com as recomendações de amostragem cabíveis.
              </p>
            </div>
          </div>

          {onNavigateToTab && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onNavigateToTab('apresentacao')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-500 cursor-pointer shadow-xs"
              >
                <Compass className="w-4 h-4" />
                <span>Abrir Apresentação Gerencial & Evolução Integrada</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: SIMULADOR E TESTE "NOVO USUÁRIO" (SEÇÃO 22) */}
      {activeSection === 'simulador-usuario' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                AUDITORIA DE USABILIDADE OPERACIONAL
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Checklist Interativo do Novo Usuário
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simule o fluxo de uma pessoa que nunca utilizou o QualiGest SGQ. Conclua os 12 passos para certificar que o sistema é autoexplicativo.
            </p>
          </div>

          <div className="space-y-2.5">
            {passosNovoUsuario.map((item) => {
              const isDone = Boolean(simuladorConcluidos[item.id]);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                    isDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleSimulador(item.id)}
                      className={`mt-0.5 p-1 rounded transition-colors cursor-pointer ${
                        isDone ? 'text-emerald-600 bg-emerald-100' : 'text-slate-400 bg-white border border-slate-300'
                      }`}
                      title="Marcar como concluído"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.id}. {item.step}</span>
                        {isDone && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Verificado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab(item.tab)}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Ir para a Tela</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Status */}
          <div className="p-4 bg-slate-900 text-white rounded-lg flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs font-bold text-slate-300 block">Progresso do Teste de Usabilidade</span>
              <p className="text-sm font-extrabold text-cyan-400">
                {Object.values(simuladorConcluidos || {}).filter(Boolean).length} de 12 passos validados
              </p>
            </div>
            <button
              onClick={() => {
                const allDone: Record<number, boolean> = {};
                passosNovoUsuario.forEach((p) => { allDone[p.id] = true; });
                setSimuladorConcluidos(allDone);
              }}
              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Homologar Todos os Passos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
