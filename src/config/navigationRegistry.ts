import { UserProfile } from '../types';

export type NavIconKey =
  | 'dashboard'
  | 'activity'
  | 'bell'
  | 'presentation'
  | 'users'
  | 'userPlus'
  | 'award'
  | 'fileCheck'
  | 'plane'
  | 'bookOpen'
  | 'grid'
  | 'graduationCap'
  | 'uploadCloud'
  | 'checkSquare'
  | 'clock'
  | 'barChart'
  | 'mapPin'
  | 'briefcase'
  | 'wrench'
  | 'fileText'
  | 'shieldCheck'
  | 'sparkles'
  | 'bookMarked'
  | 'folderTree'
  | 'sliders'
  | 'fileSpreadsheet'
  | 'alertCircle'
  | 'alertTriangle'
  | 'shield'
  | 'building'
  | 'cpu'
  | 'history';

export type NavAccessPolicy =
  | 'ALL'
  | 'WRITE_ALLOWED'      // Bloqueia CONSULTA / VIEWER
  | 'AUDITOR_OR_ABOVE'   // ADMIN, GESTOR_SGQ, AUDITOR
  | 'ADMIN_OR_GESTOR';   // ADMIN, ADMINISTRADOR, GESTOR_SGQ

export interface NavItemDef {
  id: string;
  label: string;
  pageTitle: string;
  iconKey: NavIconKey;
  aliases?: string[];
  badge?: string | number;
  badgeColor?: string;
  access?: NavAccessPolicy;
  showInMenu?: boolean;
  mobileQuickNav?: boolean;
}

export interface NavGroupDef {
  id: string;
  label: string;
  access?: NavAccessPolicy;
  items: NavItemDef[];
}

export const NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'painel',
    label: 'Painel',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Executivo',
        pageTitle: 'Dashboard Executivo',
        iconKey: 'dashboard',
        mobileQuickNav: true,
      },
      {
        id: 'saudeSGQ',
        label: 'Saúde do SGQ',
        pageTitle: 'Saúde & Integridade do SGQ',
        iconKey: 'activity',
      },
      {
        id: 'alertas',
        label: 'Pendências & Alertas',
        pageTitle: 'Central de Prazos & Notificações',
        iconKey: 'bell',
        mobileQuickNav: true,
      },
      {
        id: 'apresentacao',
        label: 'Apresentação Gerencial',
        pageTitle: 'Apresentação Gerencial da Qualidade',
        iconKey: 'presentation',
        aliases: ['visao-evolucao'],
      },
    ],
  },
  {
    id: 'pessoas-colaboradores',
    label: 'Pessoas e Colaboradores',
    items: [
      {
        id: 'pessoas-competencias',
        label: 'Colaboradores & Perfis',
        pageTitle: 'Colaboradores, Competências & Perfis Técnicos',
        iconKey: 'users',
        aliases: ['colaboradores-lista', 'rooster-pessoas', 'pessoas', 'rooster-ficha', 'colaborador-perfil', 'ficha'],
      },
      {
        id: 'colaborador-novo',
        label: 'Novo Colaborador',
        pageTitle: 'Novo Cadastro de Colaborador',
        iconKey: 'userPlus',
        access: 'WRITE_ALLOWED',
      },
      {
        id: 'cht-qualificacoes',
        label: 'Habilitações e Licenças',
        pageTitle: 'Habilitações Técnicas, CHTs & Licenças',
        iconKey: 'award',
        aliases: ['rooster-licencas', 'licencas'],
      },
      {
        id: 'rooster-designacao',
        label: 'Lista de Designação Técnica',
        pageTitle: 'Lista de Designação Técnica MRO (F 001-29)',
        iconKey: 'fileCheck',
        aliases: ['designacao', 'lista-designacao'],
        badge: 'F 001-29',
        badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
      },
      {
        id: 'rooster-designacoes-crud',
        label: 'Designações & Frotas (APRS)',
        pageTitle: 'Designações & Autorizações por Frota (APRS)',
        iconKey: 'plane',
        aliases: ['designacoes_crud', 'designacoes', 'autorizacoes-frotas'],
      },
    ],
  },
  {
    id: 'treinamentos',
    label: 'Treinamentos',
    items: [
      {
        id: 'rooster-catalogo',
        label: 'Catálogo de Treinamentos',
        pageTitle: 'Catálogo Oficial de Treinamentos',
        iconKey: 'bookOpen',
        aliases: ['catalogo', 'treinamentos-catalogo'],
      },
      {
        id: 'rooster-matrizes',
        label: 'Matriz & Capacitação',
        pageTitle: 'Matriz de Treinamentos & Modelos de Capacitação',
        iconKey: 'grid',
        aliases: ['modelos-capacitacao', 'matriz-competencias', 'matrizes', 'aptidao-operacional'],
      },
      {
        id: 'treinamentos-qualificacoes',
        label: 'Registros de Treinamento',
        pageTitle: 'Treinamentos, CHTs & Qualificações',
        iconKey: 'graduationCap',
        aliases: ['rooster-treinamentos'],
      },
      {
        id: 'importacao-certificados',
        label: 'Importação de Certificados',
        pageTitle: 'Importação em Lote de Certificados',
        iconKey: 'uploadCloud',
        access: 'WRITE_ALLOWED',
      },
      {
        id: 'validacao-treinamentos',
        label: 'Fila de Validação (Certificados)',
        pageTitle: 'Fila de Validação de Certificados & Registros',
        iconKey: 'checkSquare',
        aliases: ['validacaoQueue-treinamentos', 'fila-certificados'],
        access: 'WRITE_ALLOWED',
      },
      {
        id: 'central-vencimentos-gaps',
        label: 'Vencimentos & Gaps',
        pageTitle: 'Central de Vencimentos & Gaps Críticos',
        iconKey: 'clock',
        aliases: ['rooster-vencimentos', 'vencimentos'],
      },
      {
        id: 'competencias-dashboard',
        label: 'Dashboard de Treinamentos',
        pageTitle: 'Dashboard de Competências & Compliance',
        iconKey: 'barChart',
      },
    ],
  },
  {
    id: 'cadastros-mestres',
    label: 'Cadastros Mestres',
    items: [
      {
        id: 'cadastros-bases',
        label: 'Bases e Locais Operacionais',
        pageTitle: 'Bases e Locais Operacionais',
        iconKey: 'mapPin',
        aliases: ['rooster-bases', 'bases'],
        badge: 'Mestre',
        badgeColor: 'bg-rose-900/60 text-rose-300 border border-rose-700/50',
      },
      {
        id: 'cadastros-funcoes-cargos',
        label: 'Funções e Cargos',
        pageTitle: 'Catálogo de Funções & Cargos Técnicos',
        iconKey: 'briefcase',
      },
      {
        id: 'rooster-motores',
        label: 'Motores & Frotas',
        pageTitle: 'Catálogo de Motores & Frotas MRO',
        iconKey: 'wrench',
      },
    ],
  },
  {
    id: 'qualidade-controles',
    label: 'Qualidade e Auditorias',
    items: [
      {
        id: 'relatorio',
        label: 'Não Conformidades (RNC)',
        pageTitle: 'Registros de Não Conformidade (RNC)',
        iconKey: 'fileText',
        aliases: ['formulario'],
        mobileQuickNav: true,
      },
      {
        id: 'incidencias',
        label: 'Análise & Indicadores',
        pageTitle: 'Análise de Incidências & Diagrama de Pareto',
        iconKey: 'barChart',
      },
      {
        id: 'validacao-qualidade',
        label: 'Validação & Aprovação (RNC)',
        pageTitle: 'Fila de Validação de RNCs',
        iconKey: 'checkSquare',
        aliases: ['validacaoQueue', 'aprovacao-qualidade'],
        access: 'AUDITOR_OR_ABOVE',
      },
      {
        id: 'auditorias-gestao',
        label: 'Auditorias Internas & Externas',
        pageTitle: 'Gestão de Auditorias Externas & Internas',
        iconKey: 'shieldCheck',
        aliases: ['auditorias-dashboard', 'clientes-cronograma'],
      },
      {
        id: 'preparacao-auditorias',
        label: 'Base Institucional (177 Req.)',
        pageTitle: 'Base Institucional de Requisitos, Respostas e Evidências',
        iconKey: 'shieldCheck',
        aliases: ['preparacao-requisitos', 'prontidao-auditorias'],
        badge: '177+ Base',
        badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
      },
      {
        id: 'smart-audit',
        label: 'Auditoria Inteligente & Pré-Auditoria',
        pageTitle: 'Auditoria Inteligente, Importação & Pré-Auditoria',
        iconKey: 'sparkles',
        aliases: ['pre-auditoria'],
      },
      {
        id: 'clientes-requisitos',
        label: 'Requisitos de Clientes & Matriz',
        pageTitle: 'Auditorias & Requisitos de Clientes',
        iconKey: 'building',
        aliases: ['clientes-matriz', 'clientes-cockpit', 'outros-controles'],
      },
      {
        id: 'biblioteca-checklists',
        label: 'Checklists de Auditoria',
        pageTitle: 'Biblioteca Corporativa de Checklists de Auditoria',
        iconKey: 'fileCheck',
        aliases: ['checklists-auditoria', 'checklists-corporativos'],
      },
      {
        id: 'biblioteca-requisitos',
        label: 'Biblioteca Normativa & Fontes',
        pageTitle: 'Biblioteca Central de Requisitos Multi-Fontes',
        iconKey: 'bookMarked',
        aliases: ['requisitos-mestre', 'requisitos-normativos'],
      },
      {
        id: 'manuais',
        label: 'Banco de Manuais (IA)',
        pageTitle: 'Biblioteca de Manuais & Normas SGQ',
        iconKey: 'bookOpen',
      },
      {
        id: 'controle-documental',
        label: 'Controle Documental & Revisões',
        pageTitle: 'Controle Documental & Acervo Técnico',
        iconKey: 'folderTree',
        aliases: [
          'verificacao-controle',
          'documentos-inativos',
          'historico-relatorios',
          'consulta-temporal',
          'fontes-externas',
          'documentos-dashboard',
          'documentos-revisoes',
          'documentos-solicitacoes',
          'documentos-comparador',
          'empresas-frotas',
          'documentos-empresas-frotas',
        ],
      },
      {
        id: 'ferramentas-metrologia',
        label: 'Ferramentas & Metrologia',
        pageTitle: 'Gestão Metrológica & Ferramental Calibrado (RBC)',
        iconKey: 'sliders',
      },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    items: [
      {
        id: 'rooster-relatorio',
        label: 'Relatório do Roster',
        pageTitle: 'Relatório Oficial do Roster MRO',
        iconKey: 'fileSpreadsheet',
        aliases: ['rooster-roster', 'rooster'],
        badge: 'A4 / Excel',
        badgeColor: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50',
      },
      {
        id: 'oficial',
        label: 'Dossiê Oficial F 001-29',
        pageTitle: 'Ficha Oficial F 001-29',
        iconKey: 'fileCheck',
      },
      {
        id: 'auditorias-constatacoes',
        label: 'Constatações & Lições',
        pageTitle: 'Constatações de Auditorias (Findings) & Respostas Oficiais',
        iconKey: 'alertCircle',
        aliases: ['auditorias-licoes'],
      },
      {
        id: 'rooster-conferencia',
        label: 'Conferência de Frota & Turno',
        pageTitle: 'Conferência Operacional de Frota & Turno',
        iconKey: 'alertTriangle',
        aliases: ['conferencia'],
      },
    ],
  },
  {
    id: 'administracao-seguranca',
    label: 'Administração e Segurança',
    access: 'ADMIN_OR_GESTOR',
    items: [
      {
        id: 'admin-central',
        label: 'Usuários & Permissões (RBAC)',
        pageTitle: 'Gestão Central de Organizações, Usuários & Permissões',
        iconKey: 'shield',
        access: 'ADMIN_OR_GESTOR',
      },
      {
        id: 'configuracoes-org',
        label: 'Configurações & Parâmetros',
        pageTitle: 'Configurações da Organização & Parâmetros Operacionais',
        iconKey: 'building',
        aliases: ['parametros-fluxo'],
        access: 'ADMIN_OR_GESTOR',
      },
      {
        id: 'admin-audit-trail',
        label: 'Audit Trail do Sistema',
        pageTitle: 'Trilha de Auditoria Imutável do Sistema',
        iconKey: 'history',
        access: 'ADMIN_OR_GESTOR',
      },
      {
        id: 'system-designer',
        label: 'System Designer (ADRs)',
        pageTitle: 'System Designer Oficial do QualiGest (Arquitetura & ADRs)',
        iconKey: 'cpu',
        access: 'ADMIN_OR_GESTOR',
      },
      {
        id: 'diagnosticos-tecnicos',
        label: 'Diagnósticos Técnicos',
        pageTitle: 'Arquitetura & Diagnósticos Técnicos do Sistema',
        iconKey: 'activity',
        aliases: ['arquitetura'],
        access: 'ADMIN_OR_GESTOR',
      },
      {
        id: 'onboarding-novo-cliente',
        label: 'Implantação & Onboarding',
        pageTitle: 'Onboarding & Implantação de Nova Organização',
        iconKey: 'checkSquare',
        access: 'ADMIN_OR_GESTOR',
      },
    ],
  },
  {
    id: 'configuracoes-ferramentas',
    label: 'Ferramentas e Conhecimento',
    items: [
      {
        id: 'importacao-inteligente',
        label: 'Importação Inteligente (Dados)',
        pageTitle: 'Importação Inteligente & Migração de Planilhas',
        iconKey: 'uploadCloud',
        access: 'WRITE_ALLOWED',
      },
      {
        id: 'extrator',
        label: 'Extrator de NCs com IA',
        pageTitle: 'Assistente Extrator de NCs com IA',
        iconKey: 'sparkles',
        access: 'WRITE_ALLOWED',
      },
      {
        id: 'knowledgeBase',
        label: 'Base de Conhecimento SGQ',
        pageTitle: 'Base de Conhecimento Validada SGQ',
        iconKey: 'award',
        aliases: ['comparacaoRNC', 'knowledgeBase-melhoria'],
      },
      {
        id: 'manual-utilizacao',
        label: 'Manual de Utilização',
        pageTitle: 'Manual de Utilização & Governança da Qualidade',
        iconKey: 'bookOpen',
        aliases: ['conhecaQualigest', 'tour-interativo'],
      },
    ],
  },
];

// Mapa auxiliar de títulos para aliases legados cujo título específico vale a pena preservar
const LEGACY_TAB_TITLES: Record<string, string> = {
  formulario: 'Cadastro / Edição de RNC',
  'visao-evolucao': 'Visão Mestre & Roadmap Estratégico',
  comparacaoRNC: 'Comparação & Validação de RNCs Respondidas',
  conhecaQualigest: 'Conheça o QualiGest SGQ (Tour & Homologação)',
  'tour-interativo': 'Conheça o QualiGest SGQ (Tour & Homologação)',
  arquitetura: 'Arquitetura do Sistema SGQ',
  'auditorias-licoes': 'Lições Aprendidas de Auditorias Externas',
  'auditorias-dashboard': 'Dashboard Analítico de Auditorias',
  'consulta-temporal': 'Conhecimento Temporal & RAG Auditável',
  'fontes-externas': 'Fontes Oficiais Externas & Verificação',
  'documentos-dashboard': 'Dashboard Executivo de Controle Documental',
  'documentos-inativos': 'Arquivo de Manuais Inativos & Consolidados',
  'clientes-matriz': 'Matriz de Cobertura SGQ — Um Controle, Vários Requisitos',
  'clientes-cockpit': 'Cockpit & Estações de Clientes',
  'pre-auditoria': 'Pré-Auditoria Consolidada vs. Base Institucional',
};

export function findNavItemByTab(tabId: string): { group: NavGroupDef; item: NavItemDef } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === tabId || item.aliases?.includes(tabId)) {
        return { group, item };
      }
    }
  }
  return null;
}

export function resolveCanonicalTabId(tabId: string): string {
  if (!tabId) return 'dashboard';
  if (tabId === 'tour-interativo') return 'conhecaQualigest';
  if (tabId === 'knowledgeBase-melhoria') return 'knowledgeBase';
  const found = findNavItemByTab(tabId);
  return found ? found.item.id : tabId;
}

export function isNavItemActive(item: NavItemDef, activeTab: string): boolean {
  if (activeTab === item.id) return true;
  if (item.aliases?.includes(activeTab)) return true;
  return false;
}

export function checkAccessPolicy(policy: NavAccessPolicy | undefined, userProfile?: UserProfile | null): boolean {
  if (!policy || policy === 'ALL') return true;
  // Quando não autenticado (modo demonstração local), permitir navegação de leitura e bloquear apenas escrita administrativa se houver perfil restrito
  if (!userProfile) {
    return policy !== 'ADMIN_OR_GESTOR';
  }
  const role = String(userProfile.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'ADMINISTRADOR';
  const isGestor = role === 'GESTOR_SGQ' || role === 'GESTOR';
  const isAuditor = role === 'AUDITOR';
  const isReadOnly = role === 'CONSULTA' || role === 'VIEWER';

  if (policy === 'ADMIN_OR_GESTOR') {
    return isAdmin || isGestor;
  }
  if (policy === 'AUDITOR_OR_ABOVE') {
    return isAdmin || isGestor || isAuditor;
  }
  if (policy === 'WRITE_ALLOWED') {
    return !isReadOnly;
  }
  return true;
}

export function canUserAccessTab(tabId: string, userProfile?: UserProfile | null): boolean {
  const found = findNavItemByTab(tabId);
  if (!found) return true;
  if (found.group.access && !checkAccessPolicy(found.group.access, userProfile)) {
    return false;
  }
  if (found.item.access && !checkAccessPolicy(found.item.access, userProfile)) {
    return false;
  }
  return true;
}

export function getTitleFromNavigationRegistry(tabId: string, selectedNCNumber?: string): string {
  if (tabId === 'formulario') {
    return selectedNCNumber ? `Edição de RNC #${selectedNCNumber}` : 'Novo Cadastro de RNC';
  }
  if (LEGACY_TAB_TITLES[tabId]) {
    return LEGACY_TAB_TITLES[tabId];
  }
  const found = findNavItemByTab(tabId);
  if (found) {
    return found.item.pageTitle;
  }
  return 'Sistema de Qualidade';
}
