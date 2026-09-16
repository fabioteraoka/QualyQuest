import { UserRole, UserStatus, ModuloSistema, AcaoPermissao, MapaPermissoesPerfil } from '../../types';

/**
 * Matriz Padrão de Permissões por Perfil do QualiGest SGQ (Fase 11)
 * Regra: Autorização é estrita tanto na interface quanto nas regras de backend.
 */
export const MAPA_PERMISSOES_PADRAO: MapaPermissoesPerfil = {
  ADMIN: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'encerrar'],
    AUDITORIAS: ['visualizar', 'criar', 'editar', 'excluir', 'encerrar'],
    DOCUMENTOS: ['visualizar', 'criar', 'editar', 'inativar', 'excluir', 'revisar', 'aprovar'],
    TREINAMENTOS: ['visualizar', 'criar', 'cadastrar', 'editar', 'inativar', 'excluir', 'aprovar'],
    USUARIOS: ['visualizar', 'criar', 'editar', 'inativar', 'excluir'],
    CONFIGURACOES: ['visualizar', 'editar'],
  },
  ADMINISTRADOR: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar', 'criar', 'editar', 'excluir', 'aprovar', 'encerrar'],
    AUDITORIAS: ['visualizar', 'criar', 'editar', 'excluir', 'encerrar'],
    DOCUMENTOS: ['visualizar', 'criar', 'editar', 'inativar', 'excluir', 'revisar', 'aprovar'],
    TREINAMENTOS: ['visualizar', 'criar', 'cadastrar', 'editar', 'inativar', 'excluir', 'aprovar'],
    USUARIOS: ['visualizar', 'criar', 'editar', 'inativar', 'excluir'],
    CONFIGURACOES: ['visualizar', 'editar'],
  },
  GESTOR_SGQ: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar', 'criar', 'editar', 'aprovar', 'encerrar'],
    AUDITORIAS: ['visualizar', 'criar', 'editar', 'encerrar'],
    DOCUMENTOS: ['visualizar', 'criar', 'editar', 'inativar', 'revisar', 'aprovar'],
    TREINAMENTOS: ['visualizar', 'cadastrar', 'editar', 'inativar', 'aprovar'],
    USUARIOS: ['visualizar', 'criar', 'editar', 'inativar'],
    CONFIGURACOES: ['visualizar', 'editar'],
  },
  QUALIDADE: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar', 'criar', 'editar', 'aprovar'],
    AUDITORIAS: ['visualizar', 'criar', 'editar'],
    DOCUMENTOS: ['visualizar', 'criar', 'editar', 'inativar', 'revisar'],
    TREINAMENTOS: ['visualizar', 'cadastrar', 'editar', 'inativar'],
    USUARIOS: ['visualizar'],
    CONFIGURACOES: ['visualizar'],
  },
  AUDITOR: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar', 'criar', 'editar'],
    AUDITORIAS: ['visualizar', 'criar', 'editar'],
    DOCUMENTOS: ['visualizar'],
    TREINAMENTOS: ['visualizar'],
    USUARIOS: [],
    CONFIGURACOES: [],
  },
  MANUTENCAO: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar', 'criar', 'editar'],
    AUDITORIAS: ['visualizar'],
    DOCUMENTOS: ['visualizar'],
    TREINAMENTOS: ['visualizar'],
    USUARIOS: [],
    CONFIGURACOES: [],
  },
  TREINAMENTO: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar'],
    AUDITORIAS: ['visualizar'],
    DOCUMENTOS: ['visualizar'],
    TREINAMENTOS: ['visualizar', 'cadastrar', 'editar', 'aprovar'],
    USUARIOS: ['visualizar'],
    CONFIGURACOES: [],
  },
  CONSULTA: {
    DASHBOARD: ['visualizar'],
    RNC: ['visualizar'],
    AUDITORIAS: ['visualizar'],
    DOCUMENTOS: ['visualizar'],
    TREINAMENTOS: ['visualizar'],
    USUARIOS: [],
    CONFIGURACOES: [],
  },
};

/**
 * Normaliza o perfil de usuário para fins de compatibilidade
 */
export function normalizeUserRole(role?: string): UserRole {
  if (!role) return 'CONSULTA';
  const upper = role.toUpperCase();
  if (upper === 'ADMINISTRADOR' || upper === 'ADMIN') return 'ADMIN';
  if (upper === 'GESTOR_SGQ' || upper === 'GESTOR') return 'GESTOR_SGQ';
  if (upper === 'QUALIDADE') return 'QUALIDADE';
  if (upper === 'AUDITOR') return 'AUDITOR';
  if (upper === 'MANUTENCAO' || upper === 'MANUTENÇÃO') return 'MANUTENCAO';
  if (upper === 'TREINAMENTO') return 'TREINAMENTO';
  return 'CONSULTA';
}

/**
 * Determina se o usuário tem permissão para uma dada ação em um módulo
 */
export function hasPermission(
  role: UserRole | undefined,
  modulo: ModuloSistema,
  acao: AcaoPermissao
): boolean {
  if (!role) return false;
  const normalizedRole = normalizeUserRole(role);
  const moduloAcoes = MAPA_PERMISSOES_PADRAO[normalizedRole]?.[modulo] || [];
  return moduloAcoes.includes(acao);
}

/**
 * Verifica se o status do usuário permite operação normal no sistema
 */
export function isUserActiveStatus(status?: UserStatus | string): boolean {
  if (!status) return true;
  const s = status.toUpperCase();
  return s === 'ATIVO' || s === 'ACTIVE';
}

/**
 * Retorna se o usuário pode gerenciar outros usuários
 */
export function canManageUsers(role?: UserRole): boolean {
  if (!role) return false;
  const normalized = normalizeUserRole(role);
  return normalized === 'ADMIN' || normalized === 'GESTOR_SGQ';
}

/**
 * Impede que um usuário comum promova a si próprio ou a outro a ADMIN
 * Apenas ADMIN pode atribuir papel de ADMIN
 */
export function canAssignRole(actorRole: UserRole | undefined, targetRoleToAssign: UserRole): boolean {
  if (!actorRole) return false;
  const actor = normalizeUserRole(actorRole);
  const target = normalizeUserRole(targetRoleToAssign);

  // Apenas ADMIN pode atribuir ADMIN ou ADMINISTRADOR
  if (target === 'ADMIN' || target === 'ADMINISTRADOR') {
    return actor === 'ADMIN' || actor === 'ADMINISTRADOR';
  }

  // GESTOR_SGQ pode atribuir papéis operacionais
  if (actor === 'GESTOR_SGQ') {
    return true;
  }

  return actor === 'ADMIN' || actor === 'ADMINISTRADOR';
}

/**
 * Metadados informativos de cada perfil para exibição na UI
 */
export interface RoleMetadata {
  role: UserRole;
  label: string;
  descricao: string;
  badgeBg: string;
  badgeText: string;
  hierarquiaNivel: number; // 1 (maior) a 7 (menor)
}

export const ROLES_METADATA: Record<UserRole, RoleMetadata> = {
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrador da Organização',
    descricao: 'Acesso pleno a configurações, permissões, usuários, auditorias e exclusão.',
    badgeBg: 'bg-rose-950/40 border-rose-800/80',
    badgeText: 'text-rose-300',
    hierarquiaNivel: 1,
  },
  ADMINISTRADOR: {
    role: 'ADMINISTRADOR',
    label: 'Administrador da Organização',
    descricao: 'Acesso pleno a configurações, permissões, usuários, auditorias e exclusão.',
    badgeBg: 'bg-rose-950/40 border-rose-800/80',
    badgeText: 'text-rose-300',
    hierarquiaNivel: 1,
  },
  GESTOR_SGQ: {
    role: 'GESTOR_SGQ',
    label: 'Gestor do SGQ',
    descricao: 'Gestão completa do SGQ, aprovação de CAPAs, auditorias e gerenciamento de equipe.',
    badgeBg: 'bg-blue-950/40 border-blue-800/80',
    badgeText: 'text-blue-300',
    hierarquiaNivel: 2,
  },
  QUALIDADE: {
    role: 'QUALIDADE',
    label: 'Especialista da Qualidade',
    descricao: 'Emissão e análise de RNCs, investigação de causa raiz e elaboração de planos de ação.',
    badgeBg: 'bg-indigo-950/40 border-indigo-800/80',
    badgeText: 'text-indigo-300',
    hierarquiaNivel: 3,
  },
  AUDITOR: {
    role: 'AUDITOR',
    label: 'Auditor Interno / Externo',
    descricao: 'Registro de auditorias, constatações (findings), apontamento de evidências e RNCs.',
    badgeBg: 'bg-amber-950/40 border-amber-800/80',
    badgeText: 'text-amber-300',
    hierarquiaNivel: 4,
  },
  MANUTENCAO: {
    role: 'MANUTENCAO',
    label: 'Técnico de Manutenção',
    descricao: 'Apontamento operacional de ocorrências, respostas de contenção e consulta a manuais.',
    badgeBg: 'bg-slate-800/80 border-slate-700',
    badgeText: 'text-slate-300',
    hierarquiaNivel: 5,
  },
  TREINAMENTO: {
    role: 'TREINAMENTO',
    label: 'Gestor de Treinamento & CHT',
    descricao: 'Gestão de qualificações, CHTs ANAC, reciclagens regulamentares e matriz de competências.',
    badgeBg: 'bg-emerald-950/40 border-emerald-800/80',
    badgeText: 'text-emerald-300',
    hierarquiaNivel: 6,
  },
  CONSULTA: {
    role: 'CONSULTA',
    label: 'Consulta (Somente Leitura)',
    descricao: 'Acesso exclusivamente para leitura e acompanhamento de relatórios e indicadores.',
    badgeBg: 'bg-slate-900 border-slate-700/60',
    badgeText: 'text-slate-400',
    hierarquiaNivel: 7,
  },
};
