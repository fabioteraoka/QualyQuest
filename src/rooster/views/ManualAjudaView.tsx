import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cloud,
  Database,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Grid,
  HelpCircle,
  History,
  KeyRound,
  Layers,
  Lock,
  MapPin,
  Plane,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Section {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  category: string;
  icon: React.ElementType;
}

export const ManualAjudaView: React.FC = () => {
  const { triggerPrint, isCloud, isOffline } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('cap-1-primeiros-passos');
  const [isTourOpen, setIsTourOpen] = useState(false);

  const sections: Section[] = [
    {
      id: 'cap-1-primeiros-passos',
      number: 1,
      title: '1. Primeiros Passos, Acesso e Modos de Operação',
      shortTitle: '1. Primeiros Passos & Acesso',
      category: 'Início',
      icon: KeyRound,
    },
    {
      id: 'cap-2-carga-dados',
      number: 2,
      title: '2. Carregar os Dados Oficiais (JSON / Excel)',
      shortTitle: '2. Carga de Dados Oficiais',
      category: 'Dados',
      icon: Upload,
    },
    {
      id: 'cap-3-dashboard',
      number: 3,
      title: '3. Dashboard & Indicadores de Prontidão',
      shortTitle: '3. Dashboard & Indicadores',
      category: 'Operação',
      icon: Layers,
    },
    {
      id: 'cap-4-status-cores',
      number: 4,
      title: '4. Significado dos Status, Cores e Cálculos',
      shortTitle: '4. Status, Cores & Vencimentos',
      category: 'Regras',
      icon: Clock,
    },
    {
      id: 'cap-5-ficha-mecanico',
      number: 5,
      title: '5. Ficha 360° do Mecânico de Manutenção',
      shortTitle: '5. Ficha do Mecânico',
      category: 'Pessoal',
      icon: UserCheck,
    },
    {
      id: 'cap-6-cadastros-crud',
      number: 6,
      title: '6. Cadastros, Turmas em Lote e Renovações',
      shortTitle: '6. Cadastros & Renovações',
      category: 'Cadastros',
      icon: Users,
    },
    {
      id: 'cap-7-designacoes-conferencia',
      number: 7,
      title: '7. Designações Técnicas & Conferência de Frota',
      shortTitle: '7. Designações & Conferência',
      category: 'Conformidade',
      icon: AlertTriangle,
    },
    {
      id: 'cap-8-imprimir-designacao',
      number: 8,
      title: '8. Emissão e Impressão da Lista de Designação A4',
      shortTitle: '8. Lista de Designação A4',
      category: 'Documentos',
      icon: FileCheck2,
    },
    {
      id: 'cap-9-relatorio-roster',
      number: 9,
      title: '9. Relatório do Roster por Base Operacional',
      shortTitle: '9. Relatório do Roster',
      category: 'Relatórios',
      icon: FileSpreadsheet,
    },
    {
      id: 'cap-10-matrizes-vencimentos',
      number: 10,
      title: '10. Matrizes de Treinamento e Próximos Vencimentos',
      shortTitle: '10. Matrizes & Próximos Vencimentos',
      category: 'Análise',
      icon: Grid,
    },
    {
      id: 'cap-11-backup-nuvem',
      number: 11,
      title: '11. Backup, Restauração e Migração para a Nuvem',
      shortTitle: '11. Backup & Nuvem',
      category: 'Nuvem & Infra',
      icon: Cloud,
    },
    {
      id: 'cap-12-rotina-recomendada',
      number: 12,
      title: '12. Rotina Recomendada (Checklist Semanal / Mensal)',
      shortTitle: '12. Rotinas & Checklist',
      category: 'Procedimentos',
      icon: CalendarCheck,
    },
    {
      id: 'cap-13-faq-solucoes',
      number: 13,
      title: '13. Perguntas Frequentes (FAQ) & Resolução de Problemas',
      shortTitle: '13. FAQ & Solução de Problemas',
      category: 'Suporte',
      icon: HelpCircle,
    },
    {
      id: 'cap-14-glossario',
      number: 14,
      title: '14. Glossário Técnico Aeronáutico (ANAC, FAA, EASA)',
      shortTitle: '14. Glossário Aeronáutico',
      category: 'Referência',
      icon: BookOpen,
    },
    {
      id: 'cap-15-seguranca-acesso',
      number: 15,
      title: '15. Sobre a Segurança, Firestore e Boas Práticas',
      shortTitle: '15. Segurança & Boas Práticas',
      category: 'Segurança',
      icon: ShieldCheck,
    },
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.shortTitle.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [searchQuery, sections]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 text-sky-300 rounded-full text-xs font-semibold border border-sky-400/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentação Técnica Homologada • 15 Capítulos Oficiais</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Manual de Operação do Sistema de Roster &amp; Designação
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Guia completo de procedimentos para gestão de treinamentos, habilitações ANAC/FAA, frotas homologadas e geração da Lista Oficial de Designação da Impacto Aviation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-onboarding-tour'))}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-800 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer border border-sky-600/40"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Iniciar Tour Interativo</span>
          </button>

          <button
            onClick={triggerPrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-800" />
            <span>Imprimir Manual (A4 Retrato)</span>
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-sky-600/20 to-transparent pointer-events-none" />
      </div>

      {/* Main Grid: Sticky Sidebar + 15 Chapters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Navigator (Sticky on Desktop) */}
        <div className="no-print lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs sticky top-20 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar nos 15 capítulos..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-600 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Topics List */}
            <div className="space-y-0.5 pt-1 max-h-[calc(100vh-280px)] overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 block mb-1">
                Índice dos Capítulos
              </span>
              {filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollTo(sec.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-sky-900 text-white font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{sec.shortTitle}</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>

            {/* Quick Status Pill */}
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center justify-between">
                <span>Persistência Ativa:</span>
                <span className="font-semibold text-slate-800">
                  {isCloud ? 'Nuvem (Firestore)' : 'Armazenamento Local'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status de Conexão:</span>
                <span className={`font-semibold ${isOffline ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {isOffline ? 'Offline (Cache Ativo)' : 'Online Sincronizado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area: All 15 Chapters */}
        <div className="lg:col-span-3 space-y-8 print:col-span-4 print:space-y-6">
          {/* Chapter 1: Primeiros Passos */}
          <section id="cap-1-primeiros-passos" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">1. Primeiros Passos, Acesso e Modos de Operação</h2>
                <p className="text-xs text-slate-500">Conceito, primeiro acesso, código compartilhado, identificação e modo offline</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                O <strong>Sistema de Roster &amp; Designação da Impacto Aviation</strong> é uma plataforma técnica desenvolvida para gerenciar com precisão regulamentar as habilitações, licenças ANAC/FAA, qualificações em motores e designações de pessoal de manutenção aeronáutica (RBAC 145 / EASA Part-145).
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-xs">Passo a passo no primeiro uso:</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700">
                  <li><strong>Abertura do Sistema:</strong> Abra o endereço da aplicação no navegador (Chrome, Edge, Firefox ou Safari).</li>
                  <li><strong>Definição do Código de Acesso:</strong> Na primeira execução em uma base sem código definido, a tela solicitará a criação de um <em>Código de Acesso Compartilhado</em> (mínimo 4 caracteres). Guarde esse código para compartilhar com os demais membros da equipe técnica autorizada.</li>
                  <li><strong>Identificação do Operador (&quot;Seu Nome&quot;):</strong> Informe seu nome e função (ex.: <em>Carlos Mendes - Mecânico Líder</em>). O sistema salvará essa informação no navegador e a usará para assinar todas as ações no registro de <code>auditoria</code>.</li>
                  <li><strong>Lembrar dispositivo por 30 dias:</strong> Após a digitação correta do código, o navegador mantém o acesso autorizado por 30 dias contínuos. Para encerrar manualmente a sessão em computadores públicos, utilize o botão <em>&quot;Sair deste dispositivo&quot;</em> na aba <em>Configurações</em>.</li>
                  <li><strong>Modo Online × Modo Offline:</strong> Se a conexão com a internet cair no hangar, o aviso <em>&quot;Offline — alterações serão sincronizadas&quot;</em> surge discretamente na barra superior. Todo o sistema continua 100% navegável graças ao cache local persistente multi-abas do Firestore.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Chapter 2: Carga de Dados Oficiais */}
          <section id="cap-2-carga-dados" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">2. Carregar os Dados Oficiais (JSON / Excel)</h2>
                <p className="text-xs text-slate-500">Importação segura tudo-ou-nada, modos de carga e conferência pós-importação</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                O sistema é distribuído com o banco limpo por padrão para garantir total conformidade de segurança e não expor dados reais em repositórios. A carga inicial é feita através do menu <strong>&quot;Importar / Exportar Excel&quot;</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Modo Substituir Tudo:</span>
                  <p className="text-[11px] text-slate-600">
                    Limpa as tabelas existentes e substitui integralmente pelo conteúdo do arquivo. Recomendado para a primeira implantação ou restauração oficial periódica.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 block text-xs">Modo Mesclar / Atualizar:</span>
                  <p className="text-[11px] text-slate-600">
                    Mantém registros existentes e atualiza/insere apenas os novos registros encontrados no arquivo (upsert determinístico por ID).
                  </p>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 space-y-1.5 text-sky-950">
                <span className="font-bold block text-xs">Painel de Conferência Pós-Importação:</span>
                <p className="text-[11px] text-sky-900 leading-relaxed">
                  Imediatamente após o processamento, o sistema exibe o painel de validação comparando o total de registros esperados × gravados e executa testes automáticos de sanidade: verificação de mecânicos específicos (ex.: Claudio Jair MEC-005, Franco MEC-011) e contagem da base REC (7 mecânicos). Se houver divergências, o painel aponta a linha exata.
                </p>
              </div>
            </div>
          </section>

          {/* Chapter 3: Dashboard */}
          <section id="cap-3-dashboard" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">3. Dashboard &amp; Indicadores de Prontidão Operacional</h2>
                <p className="text-xs text-slate-500">Cartões de semáforo, filtros rápidos, visão por frota e tabela detalhada</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                O Dashboard calcula em tempo real o estado de prontidão de todo o quadro técnico contra a <strong>Data de Referência</strong> selecionada.
              </p>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs">Como operar o Dashboard:</h3>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-700">
                  <li><strong>Filtro de Base:</strong> No cabeçalho superior, selecione <em>TOTAL</em> (todas as bases consolidadas) ou isole uma base específica (ex.: <em>REC</em>, <em>GRU</em>, <em>BSB</em>). Todos os números reagem instantaneamente.</li>
                  <li><strong>Cartões de Status (Semáforo):</strong> Clique diretamente sobre qualquer cartão (Vencidos, ≤30d, ≤60d, ≤90d, Em dia) para filtrar a tabela inferior apenas pelos mecânicos naquela condição.</li>
                  <li><strong>Situação por Frota / Variante:</strong> Painel cruzado que mostra quantos mecânicos estão 100% aptos em cada modelo de aeronave (ATR 72, A320 Family, Boeing 737 NG/MAX, Embraer E-Jets).</li>
                  <li><strong>Clique para Ficha 360°:</strong> Ao clicar no nome ou código de qualquer mecânico na tabela, o sistema redireciona diretamente para a Ficha individual do colaborador.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Chapter 4: Status, Cores e Cálculos */}
          <section id="cap-4-status-cores" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">4. Significado dos Status, Cores e Fórmula de Vencimento</h2>
                <p className="text-xs text-slate-500">Cálculo matemático rigoroso e legenda visual padronizada</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-[11px]">
                <span className="font-bold text-slate-900 font-sans block text-xs">Fórmula Oficial de Vencimento:</span>
                <code>data_vencimento = data_execucao + validade_dias</code><br />
                <code>dias_restantes = diferenca_em_dias(data_vencimento, data_referencia)</code>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="font-bold text-rose-950 block">Vencido (Vermelho)</span>
                  <span className="text-[11px] text-rose-800">dias_restantes &lt; 0. Bloqueia formalmente liberação de aeronave.</span>
                </div>
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="font-bold text-orange-950 block">≤ 30 dias (Laranja)</span>
                  <span className="text-[11px] text-orange-800">Alerta máximo: curso deve ser agendado com urgência.</span>
                </div>
                <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="font-bold text-yellow-950 block">≤ 60 dias (Amarelo)</span>
                  <span className="text-[11px] text-yellow-800">Alerta médio: planejamento das próximas reciclagens.</span>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="font-bold text-amber-950 block">≤ 90 dias (Amarelo Claro)</span>
                  <span className="text-[11px] text-amber-800">Planejamento prévio da escala semestral.</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="font-bold text-emerald-950 block">Em Dia (Verde)</span>
                  <span className="text-[11px] text-emerald-800">Mais de 90 dias de vigência restante.</span>
                </div>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block">Sem Vencimento / Sem Registro</span>
                  <span className="text-[11px] text-slate-600">Curso vitalício (validade = 0) ou curso nunca executado pelo mecânico.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 5: Ficha 360° do Mecânico */}
          <section id="cap-5-ficha-mecanico" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">5. Ficha 360° do Mecânico de Manutenção</h2>
                <p className="text-xs text-slate-500">Painel completo com licenças, treinamentos, motores e designações</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                A <strong>Ficha do Mecânico</strong> centraliza todos os dados regulamentares do colaborador em uma visualização única para apresentação a auditores ou planejamento de escalas.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-700">
                <li><strong>Identificação Completa:</strong> Código IMP, Nome Completo, Código ANAC (CANAC), Base de Lotação e Categoria Técnica.</li>
                <li><strong>Licenças ANAC &amp; Estrangeiras:</strong> CHT com validade individual por especialidade (CEL, GMP, AVI) e número da licença FAA A&amp;P.</li>
                <li><strong>Histórico de Treinamentos:</strong> Lista ordenada com status de semáforo, datas de realização, validades e botões para renovação imediata com 1 clique.</li>
                <li><strong>Motores Habilitados:</strong> Motores aeronáuticos vinculados aos treinamentos de tipo realizados (ex.: CFM56-7B, LEAP-1B, V2500).</li>
                <li><strong>Designações Ativas:</strong> Funções técnicas que o mecânico está formalmente designado a exercer (RII, Run-Up, NDT, Boroscopia, etc.).</li>
              </ul>
            </div>
          </section>

          {/* Chapter 6: Cadastros CRUD */}
          <section id="cap-6-cadastros-crud" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">6. Cadastros, Turmas em Lote e Renovações Rastreáveis</h2>
                <p className="text-xs text-slate-500">Inclusão individual, lançamento coletivo, reciclagens e histórico sem perda</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-slate-900 block text-xs">Lançamento de Turma em Lote:</span>
                  <p className="text-[11px] text-slate-600">
                    Na tela <em>Treinamentos</em>, use a aba <strong>&quot;Lançar Curso em Lote&quot;</strong>. Selecione o curso ministrado, a data de execução, a turma e marque os vários mecânicos que participaram. Todos os registros são gerados em um único clique.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-slate-900 block text-xs">Renovação sem Apagar Histórico:</span>
                  <p className="text-[11px] text-slate-600">
                    Ao renovar um curso através do botão <em>&quot;Renovar&quot;</em>, o registro antigo é mantido e recebe o ponteiro <code>substituido_por = novo_id</code>. Auditores da ANAC podem consultar todas as edições históricas passadas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 7: Designações & Conferência */}
          <section id="cap-7-designacoes-conferencia" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">7. Designações Técnicas &amp; Conferência de Frota</h2>
                <p className="text-xs text-slate-500">Matriz de designações, preenchimento SIM/NÃO e prevenção de divergências</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                A conformidade técnica exige que cada mecânico designado tenha seus treinamentos rigorosamente em dia. A tela <strong>Conferência de Frota</strong> cruza automaticamente essas duas dimensões.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-[11px] space-y-1">
                  <span className="font-bold block">Linhas em Amarelo (A Preencher):</span>
                  <p>
                    Indicam que uma aeronave ou função ainda não teve sua designação formalizada como SIM ou NÃO. O sistema bloqueia a emissão final enquanto houver pendências não preenchidas.
                  </p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-[11px] space-y-1">
                  <span className="font-bold block">Alerta Crítico &quot;Vencido&quot;:</span>
                  <p>
                    O mecânico está assinalado como <strong>SIM</strong> na frota, porém seu curso de tipo está vencido. Ação corretiva imediata: retirar a designação ou agendar reciclagem.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 8: Imprimir Lista de Designação */}
          <section id="cap-8-imprimir-designacao" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">8. Emissão e Impressão da Lista de Designação A4</h2>
                <p className="text-xs text-slate-500">Formulário homologatório oficial em A4 paisagem com assinatura do RT</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-xs">Instruções para impressão sem cortes:</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-700">
                  <li>Acesse o menu <strong>&quot;Lista de Designação&quot;</strong>.</li>
                  <li>Escolha a base desejada (ex.: <em>TOTAL</em> ou <em>REC</em>).</li>
                  <li>Defina o seletor <strong>&quot;Destacar Vencimentos&quot;</strong>: ativado para auditoria interna ou desativado para apresentação formal monocromática.</li>
                  <li>Clique no botão <strong>&quot;Imprimir Lista A4 (Paisagem)&quot;</strong> ou use o atalho <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl+P</kbd>.</li>
                  <li><strong>Configurações da Impressora:</strong> Selecione tamanho de papel <strong>A4</strong>, orientação <strong>Paisagem (Landscape)</strong>, desmarque a opção <em>&quot;Cabeçalhos e rodapés&quot;</em> e configure a escala para <em>&quot;Ajustar à página&quot;</em>.</li>
                  <li>O formulário contém o cabeçalho institucional oficial e o bloco de carimbo e assinatura de <strong>Alysson Rabelo (Responsável Técnico)</strong>.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Chapter 9: Relatório do Roster */}
          <section id="cap-9-relatorio-roster" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">9. Relatório do Roster por Base Operacional</h2>
                <p className="text-xs text-slate-500">Relatório detalhado nos modos Completo, Somente Pendências e Somente Licenças</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                O <strong>Relatório do Roster</strong> oferece três visões especializadas para a coordenação de treinamento:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                <li><strong>Completo:</strong> Apresenta todos os cursos de todos os colaboradores da base, independentemente do status.</li>
                <li><strong>Somente Pendências:</strong> Filtra exclusivamente os cursos vencidos ou nos alertas de 30/60/90 dias. Ideal para emitir ordens de reciclagem.</li>
                <li><strong>Somente Licenças:</strong> Foca na situação das CHTs ANAC e licenças FAA dos mecânicos da base selecionada.</li>
              </ul>
            </div>
          </section>

          {/* Chapter 10: Matrizes e Próximos Vencimentos */}
          <section id="cap-10-matrizes-vencimentos" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">10. Matrizes de Treinamento e Próximos Vencimentos</h2>
                <p className="text-xs text-slate-500">Mapas térmicos de qualificação e filtro cronológico de vencimentos</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                A aba <strong>Matrizes (Mapas de Calor)</strong> monta uma tabela bidimensional cruzando <em>Pessoas × Cursos Catalogo</em>, colorindo cada célula conforme o semáforo. Permite aos líderes de hangar bater o olho e identificar se a equipe do turno da noite possui todas as certificações obrigatórias vigentes antes do início dos trabalhos.
              </p>
            </div>
          </section>

          {/* Chapter 11: Backup e Nuvem */}
          <section id="cap-11-backup-nuvem" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">11. Backup, Restauração e Migração para a Nuvem</h2>
                <p className="text-xs text-slate-500">Exportações periódicas, integridade dos arquivos e sincronização em tempo real</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Recomenda-se realizar o download semanal do backup completo através da aba <em>Importar / Exportar Excel</em> nos formatos <code>.json</code> e <code>.xlsx</code> (planilha com 12 abas normalizadas).
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block text-xs">Migrar Dados Locais para a Nuvem:</span>
                <p className="text-[11px] text-slate-600">
                  Na aba <em>Configurações</em>, utilize o botão <strong>&quot;Migrar dados locais para a nuvem&quot;</strong>. O sistema efetua a carga em lotes seguros de 400 registros para o Firestore, preservando as chaves primárias e sem duplicidades.
                </p>
              </div>
            </div>
          </section>

          {/* Chapter 12: Rotina Recomendada */}
          <section id="cap-12-rotina-recomendada" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">12. Rotina Recomendada (Checklist Semanal &amp; Mensal)</h2>
                <p className="text-xs text-slate-500">Boas práticas operacionais para manter a organização sempre auditável</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 block text-xs">Checklist Semanal:</span>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    <li>✓ Abrir o Dashboard e verificar os cartões <em>Vencidos</em> e <em>≤30 dias</em>.</li>
                    <li>✓ Lançar treinamentos executados na semana via <em>Lançar em Lote</em>.</li>
                    <li>✓ Acessar <em>Conferência de Frota</em> e resolver células em amarelo.</li>
                    <li>✓ Exportar backup em JSON para arquivo de segurança local.</li>
                  </ul>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 block text-xs">Checklist Mensal:</span>
                  <ul className="space-y-1 text-[11px] text-slate-700">
                    <li>✓ Imprimir a <em>Lista de Designação Oficial</em> das bases ativas.</li>
                    <li>✓ Coletar a assinatura física do Responsável Técnico.</li>
                    <li>✓ Revisar admissões e desligamentos de pessoal em <em>Pessoas</em>.</li>
                    <li>✓ Atualizar as validades das CHTs ANAC recém-revalidadas.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 13: FAQ & Resolução de Problemas */}
          <section id="cap-13-faq-solucoes" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">13. Perguntas Frequentes (FAQ) &amp; Solução de Problemas</h2>
                <p className="text-xs text-slate-500">Respostas rápidas para dúvidas corriqueiras de operação</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 block">P: Esqueci o código de acesso da equipe. O que fazer?</span>
                <p className="text-[11px] text-slate-600">
                  R: O código pode ser visualizado ou redefinido por qualquer usuário com permissão de Administrador através do console do Firebase na coleção <code>configuracao/acesso</code>, ou alterado diretamente em <em>Configurações</em> em qualquer dispositivo já autorizado.
                </p>
              </div>
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 block">P: Os dados sumiram ou o sistema iniciou em branco. Como recuperar?</span>
                <p className="text-[11px] text-slate-600">
                  R: Acesse <em>Importar / Exportar Excel</em> e selecione o arquivo <code>roster_dados_oficiais.json</code> ou use o botão <em>&quot;Restaurar Base Oficial de Referência&quot;</em> em <em>Configurações</em>. Se o Firebase estiver ativo, verifique a conexão com a internet.
                </p>
              </div>
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-900 block">P: A Lista de Designação saiu cortada na impressora. Como ajustar?</span>
                <p className="text-[11px] text-slate-600">
                  R: Certifique-se de selecionar orientação <strong>Paisagem</strong> e marcar <strong>&quot;Ajustar à página&quot;</strong> na janela de impressão do navegador. Em <em>Configurações</em>, certifique-se de que o limite de linhas por página está ajustado para 40.
                </p>
              </div>
            </div>
          </section>

          {/* Chapter 14: Glossário */}
          <section id="cap-14-glossario" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">14. Glossário Técnico Aeronáutico (ANAC, FAA, EASA)</h2>
                <p className="text-xs text-slate-500">Significado das siglas e termos regulamentares empregados no sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">CHT:</span>
                <span className="text-[11px] text-slate-600 ml-1">Certificado de Habilitação Técnica emitido pela ANAC (CEL, GMP, AVI).</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">CANAC:</span>
                <span className="text-[11px] text-slate-600 ml-1">Código de identificação do aeronauta/aeroviário cadastrado na ANAC.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">FAA A&amp;P:</span>
                <span className="text-[11px] text-slate-600 ml-1">Licença americana Airframe and Powerplant emitida pela FAA.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">RII:</span>
                <span className="text-[11px] text-slate-600 ml-1">Required Inspection Items (Itens de Inspeção Obrigatória em Manutenção).</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">Run-Up:</span>
                <span className="text-[11px] text-slate-600 ml-1">Autorização técnica para teste de motores no solo em aeronave.</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">APRS:</span>
                <span className="text-[11px] text-slate-600 ml-1">Aprovação para Retorno ao Serviço (Liberação formal de voo).</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">Line &amp; Base:</span>
                <span className="text-[11px] text-slate-600 ml-1">Manutenção de Linha (Trânsito e Pernoite) × Manutenção de Base (Hangar).</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono">Refreshment:</span>
                <span className="text-[11px] text-slate-600 ml-1">Curso periódico de reciclagem mandatória (ex.: 24 ou 36 meses).</span>
              </div>
            </div>
          </section>

          {/* Chapter 15: Segurança e Firestore */}
          <section id="cap-15-seguranca-acesso" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4 scroll-mt-24">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-sky-900 text-white flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">15. Sobre a Segurança, Firestore e Boas Práticas</h2>
                <p className="text-xs text-slate-500">Transparência técnica, limites da proteção simplificada e evolução futura</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Declaração de Limitação de Segurança (Honestidade Técnica):</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  O sistema foi desenhado a pedido para ter <strong>máxima simplicidade operacional sem chaves de segurança gerenciadas pelo usuário</strong>. O código compartilhado é verificado no cliente contra o hash SHA-256 salvo no Firestore. Esta é uma <em>barreira leve contra acessos indevidos casuais</em>, e <strong>não</strong> uma segurança de nível bancário ou autenticação individual criptográfica.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <h3 className="font-bold text-slate-900 text-xs">Camadas de proteção aplicadas:</h3>
                <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-700">
                  <li><strong>Hash Criptográfico SHA-256:</strong> O código digitado nunca é gravado em texto puro, apenas seu hash hashArray de 64 caracteres.</li>
                  <li><strong>Regras de Segurança Escopadas (<code>firestore.rules</code>):</strong> O Firestore bloqueia formalmente qualquer documento fora das 12 coleções do app (sem cláusulas abertas <code>match /&#123;document=**&#125;</code>).</li>
                  <li><strong>Repositório Limpo:</strong> O arquivo de dados oficial não é incluído no GitHub/Render (incluso no <code>.gitignore</code>).</li>
                  <li><strong>Rastreabilidade de Auditoria:</strong> Toda alteração grava data, hora, IP/dispositivo e o nome informado pelo operador.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 block text-xs">Caminho de Evolução para Login Individual:</span>
                <p className="text-[11px] text-slate-600">
                  Para empresas que exigirem login por e-mail e senha individual, o sistema permite ativar o <strong>Firebase Authentication</strong> alterando apenas o adaptador de autenticação, sem precisar mexer em nenhuma tela ou cálculo do sistema. Consulte a seção &quot;Evolução&quot; do README do projeto.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
