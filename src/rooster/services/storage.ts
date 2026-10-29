import * as XLSX from 'xlsx';
import {
  buildInitialCleanDatabase,
  buildImpactoOfficialInitialDatabase,
  getOfficialImpactoRawPayload,
} from '../data/initialData';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  AeronaveDesignacao,
  Auditoria,
  Base,
  CategoriaPessoa,
  Configuracao,
  CursoCatalogo,
  DesignacaoAeronave,
  DesignacaoBase,
  DesignacaoFuncao,
  DesignacaoPessoa,
  EasaType,
  FuncaoDesignacao,
  Licenca,
  MotorCatalogo,
  Pessoa,
  SimNaoVazio,
  SituacaoPessoa,
  Treinamento,
  TreinamentoMotor,
  Usuario,
} from '../types';
import { parseDataBrParaIso } from '../utils/businessRules';
import { normalizePersonName, normalizeMatriculaOrCanac } from '../../utils/personNormalization';
import { FirestoreAdapter } from './adapters/firestoreAdapter';
import { LocalAdapter } from './adapters/localAdapter';
import { StorageAdapter } from './storageInterface';

export const STORAGE_KEY = 'impacto_aviation_roster_db_v2';
export const OFFICIAL_BACKUP_KEY = 'impacto_aviation_official_backup';

export async function sha256(message: string): Promise<string> {
  const enc = new TextEncoder().encode(message.trim());
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface DatabaseState {
  pessoas: Pessoa[];
  bases: Base[];
  licencas: Licenca[];
  cursosCatalogo: CursoCatalogo[];
  motoresCatalogo: MotorCatalogo[];
  treinamentos: Treinamento[];
  treinamentosMotor: TreinamentoMotor[];
  designacoesPessoa: DesignacaoPessoa[];
  designacoesBase: DesignacaoBase[];
  designacoesFuncao: DesignacaoFuncao[];
  designacoesAeronave: DesignacaoAeronave[];
  configuracao: Configuracao;
  usuarios: Usuario[];
  auditoria: Auditoria[];
}

export interface RawImportPayload {
  meta?: {
    sistema?: string;
    versao_esquema?: number;
    gerado_em?: string;
    observacao?: string;
    contagens?: Record<string, number>;
  };
  base?: any[];
  pessoa?: any[];
  licenca?: any[];
  curso_catalogo?: any[];
  treinamento?: any[];
  motor_catalogo?: any[];
  treinamento_motor?: any[];
  designacao_pessoa?: any[];
  designacao_base?: any[];
  designacao_funcao?: any[];
  designacao_aeronave?: any[];
  configuracao?: any;
}

export interface EntityImportStats {
  entidade: string;
  nomeExibicao: string;
  esperado?: number;
  noArquivo: number;
  novos: number;
  alterados: number;
  rejeitados: number;
  gravados?: number;
  status: 'OK' | 'DIVERGENCIA';
}

export interface ImportIssue {
  linha?: number;
  entidade: string;
  id?: string;
  campo?: string;
  motivo: string;
  severidade: 'erro' | 'aviso';
}

export interface ImportValidationReport {
  stats: Record<string, EntityImportStats>;
  issues: ImportIssue[];
  totalRegistrosNoArquivo: number;
  totalErros: number;
  totalAvisos: number;
  canCommit: boolean;
  modo: 'substituir' | 'mesclar';
  nomeArquivo?: string;
}

export interface SanityCheckItem {
  titulo: string;
  descricao: string;
  esperado: string;
  encontrado: string;
  aprovado: boolean;
}

export interface PostImportConferenceData {
  sucesso: boolean;
  dataHora: string;
  nomeArquivo: string;
  modo: 'substituir' | 'mesclar';
  totalGravados: number;
  tabelaResumo: EntityImportStats[];
  mecanicos: Pessoa[];
  administrativos: Pessoa[];
  verificacoesSanidade: SanityCheckItem[];
  backupJson: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Listener notification error', e);
    }
  });
}

let _activeAdapter: StorageAdapter | null = null;
let _hasAutoInitialized = false;

function resolveAdapter(): StorageAdapter {
  if (!_activeAdapter) {
    _activeAdapter = isFirebaseConfigured() ? new FirestoreAdapter() : new LocalAdapter();
  }
  if (!_hasAutoInitialized && typeof window !== 'undefined') {
    _hasAutoInitialized = true;
    _activeAdapter.init().catch((err) => {
      console.warn('Erro ao inicializar adaptador de armazenamento:', err);
    });
  }
  return _activeAdapter;
}

export const activeAdapter: StorageAdapter = new Proxy({} as StorageAdapter, {
  get(_target, prop, receiver) {
    const adapter = resolveAdapter();
    const value = Reflect.get(adapter, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(adapter);
    }
    return value;
  },
  set(_target, prop, value, receiver) {
    const adapter = resolveAdapter();
    return Reflect.set(adapter, prop, value, receiver);
  },
});

export function setOrganizationId(orgId: string): void {
  const adapter = resolveAdapter();
  if (adapter && typeof (adapter as any).setOrganizationId === 'function') {
    (adapter as any).setOrganizationId(orgId);
  }
}

export function getActiveAdapter(): StorageAdapter {
  return resolveAdapter();
}

export function setActiveAdapter(adapter: StorageAdapter | null): void {
  _activeAdapter = adapter;
}

export function addStorageListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToDatabase(listener: Listener): () => void {
  return activeAdapter.subscribe(listener);
}

let memoryDb: DatabaseState | null = null;

export function loadDatabase(): DatabaseState {
  if (activeAdapter && activeAdapter.isCloud) {
    const cloudDb = activeAdapter.getDatabase();
    if (cloudDb) {
      return cloudDb;
    }
  }

  if (memoryDb) return memoryDb;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.bases) && Array.isArray(parsed.pessoas)) {
        memoryDb = parsed;
        return memoryDb!;
      }
    }
  } catch (err) {
    console.warn('Falha ao ler localStorage, iniciando banco limpo...', err);
  }

  // Initial database: populate with official Impacto Aviation MRO catalog and initial mechanics
  const initialData = buildImpactoOfficialInitialDatabase();
  memoryDb = {
    ...initialData,
    auditoria: [
      {
        id: 'AUD-001',
        timestamp: new Date().toISOString(),
        usuario_nome: 'Sistema',
        acao: 'CRIAR',
        tabela: 'sistema',
        registro_id: 'INIT',
        detalhes: 'Base de dados oficial Impacto Aviation MRO inicializada com sucesso.',
      },
    ],
  };

  persistDatabase(memoryDb);
  return memoryDb;
}

export function persistDatabase(db: DatabaseState): void {
  memoryDb = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Erro ao salvar no localStorage', err);
  }
  notify();
}

export function recordAudit(
  acao: Auditoria['acao'],
  tabela: string,
  registro_id: string,
  detalhes: string,
  dados_antes?: any,
  dados_depois?: any,
  usuario_nome = 'Alysson Rabelo'
) {
  const db = loadDatabase();
  const novaAuditoria: Auditoria = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    usuario_nome,
    acao,
    tabela,
    registro_id,
    detalhes,
    dados_antes,
    dados_depois,
  };
  db.auditoria.unshift(novaAuditoria);
  if (db.auditoria.length > 500) {
    db.auditoria = db.auditoria.slice(0, 500);
  }
  persistDatabase(db);
}

// ------------------- VALUE CONVERTERS -------------------

export function parseExcelDate(val: any): string | null {
  if (val == null || val === '' || val === 'N/A' || val === 'NA' || val === '-' || val === 'X') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '0');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parsedBr = parseDataBrParaIso(str);
  if (parsedBr) return parsedBr;
  return null;
}

export function parseTextString(val: any): string {
  if (val == null) return '';
  return String(val).trim();
}

export function parseNullableString(val: any): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'N/A' || s === 'NA') return null;
  return s;
}

export function parseBoolean(val: any, defaultVal = false): boolean {
  if (val === true || val === 1 || val === '1') return true;
  if (val === false || val === 0 || val === '0') return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (['true', 'sim', 's', 'yes', 'y', '1', 'ativo'].includes(s)) return true;
    if (['false', 'não', 'nao', 'n', 'no', '0', 'inativo'].includes(s)) return false;
  }
  return defaultVal;
}

export function parseSimNao(val: any, defaultVal: SimNaoVazio = ''): SimNaoVazio {
  if (val == null) return defaultVal;
  const s = String(val).trim().toUpperCase();
  if (s === 'SIM' || s === 'S' || s === 'TRUE' || s === '1') return 'SIM';
  if (s === 'NÃO' || s === 'NAO' || s === 'N' || s === 'FALSE' || s === '0') return 'NÃO';
  return defaultVal;
}

export function parseNumber(val: any, defaultVal = 0): number {
  if (val == null || val === '') return defaultVal;
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

// ------------------- PARSERS (JSON & XLSX) -------------------

export function parseImportJson(jsonText: string): RawImportPayload {
  const parsed = JSON.parse(jsonText);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('O arquivo não contém um objeto JSON válido.');
  }
  return parsed as RawImportPayload;
}

function findSheet(wb: XLSX.WorkBook, candidates: string[]): XLSX.WorkSheet | undefined {
  const normCandidates = candidates.map((c) =>
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );
  for (const sheetName of wb.SheetNames) {
    const norm = sheetName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (normCandidates.includes(norm)) {
      return wb.Sheets[sheetName];
    }
  }
  return undefined;
}

export function parseImportXlsx(wb: XLSX.WorkBook): RawImportPayload {
  const payload: RawImportPayload = {
    meta: {
      sistema: 'Impacto Aviation - Importação XLSX',
      versao_esquema: 1,
      gerado_em: new Date().toISOString().slice(0, 10),
    },
  };

  const sheetBase = findSheet(wb, ['base', 'bases']);
  if (sheetBase) {
    payload.base = XLSX.utils.sheet_to_json<any>(sheetBase, { raw: true, defval: null });
  }

  const sheetPessoa = findSheet(wb, ['pessoa', 'pessoas']);
  if (sheetPessoa) {
    payload.pessoa = XLSX.utils.sheet_to_json<any>(sheetPessoa, { raw: true, defval: null });
  }

  const sheetLicenca = findSheet(wb, ['licenca', 'licencas', 'licenças', 'licença']);
  if (sheetLicenca) {
    payload.licenca = XLSX.utils.sheet_to_json<any>(sheetLicenca, { raw: true, defval: null });
  }

  const sheetCurso = findSheet(wb, ['curso_catalogo', 'cursos_catalogo', 'curso', 'cursos', 'cursos catalogo']);
  if (sheetCurso) {
    payload.curso_catalogo = XLSX.utils.sheet_to_json<any>(sheetCurso, { raw: true, defval: null });
  }

  const sheetTreinamento = findSheet(wb, ['treinamento', 'treinamentos']);
  if (sheetTreinamento) {
    payload.treinamento = XLSX.utils.sheet_to_json<any>(sheetTreinamento, { raw: true, defval: null });
  }

  const sheetMotor = findSheet(wb, ['motor_catalogo', 'motores_catalogo', 'motor', 'motores', 'motores catalogo']);
  if (sheetMotor) {
    payload.motor_catalogo = XLSX.utils.sheet_to_json<any>(sheetMotor, { raw: true, defval: null });
  }

  const sheetTrnMotor = findSheet(wb, [
    'treinamento_motor',
    'treinamentos_motor',
    'treinamentos_motores',
    'treinamento_motores',
  ]);
  if (sheetTrnMotor) {
    payload.treinamento_motor = XLSX.utils.sheet_to_json<any>(sheetTrnMotor, { raw: true, defval: null });
  }

  const sheetDesPessoa = findSheet(wb, [
    'designacao_pessoa',
    'designacoes_pessoa',
    'designacao',
    'designacoes',
    'designações',
  ]);
  if (sheetDesPessoa) {
    payload.designacao_pessoa = XLSX.utils.sheet_to_json<any>(sheetDesPessoa, { raw: true, defval: null });
  }

  const sheetDesBase = findSheet(wb, [
    'designacao_base',
    'designacoes_base',
    'designacao_bases',
    'designacoes bases',
  ]);
  if (sheetDesBase) {
    payload.designacao_base = XLSX.utils.sheet_to_json<any>(sheetDesBase, { raw: true, defval: null });
  }

  const sheetDesFuncao = findSheet(wb, [
    'designacao_funcao',
    'designacoes_funcao',
    'designacao_funcoes',
    'designacoes funcoes',
  ]);
  if (sheetDesFuncao) {
    payload.designacao_funcao = XLSX.utils.sheet_to_json<any>(sheetDesFuncao, { raw: true, defval: null });
  }

  const sheetDesAero = findSheet(wb, [
    'designacao_aeronave',
    'designacoes_aeronave',
    'designacao_aeronaves',
    'designacoes aeronaves',
  ]);
  if (sheetDesAero) {
    payload.designacao_aeronave = XLSX.utils.sheet_to_json<any>(sheetDesAero, { raw: true, defval: null });
  }

  const sheetConfig = findSheet(wb, ['configuracao', 'configuracoes', 'config', 'configurações']);
  if (sheetConfig) {
    const rawRows = XLSX.utils.sheet_to_json<any>(sheetConfig, { raw: true, defval: null });
    if (rawRows.length > 0) {
      // Check if it's key-value or row-based
      const firstRow = rawRows[0];
      if (('chave' in firstRow || 'parametro' in firstRow) && ('valor' in firstRow || 'value' in firstRow)) {
        const confObj: any = {};
        for (const row of rawRows) {
          const k = String(row.chave || row.parametro || '').trim();
          const v = row.valor ?? row.value;
          if (k) confObj[k] = v;
        }
        payload.configuracao = confObj;
      } else {
        payload.configuracao = firstRow;
      }
    }
  }

  return payload;
}

// ------------------- VALIDATION ENGINE -------------------

const ENTITY_CONFIG: Array<{ key: keyof RawImportPayload; nome: string; pk: string }> = [
  { key: 'base', nome: 'Bases Operacionais', pk: 'id' },
  { key: 'pessoa', nome: 'Pessoas (Mecânicos / ADM)', pk: 'id' },
  { key: 'curso_catalogo', nome: 'Catálogo de Cursos', pk: 'id' },
  { key: 'motor_catalogo', nome: 'Catálogo de Motores', pk: 'id' },
  { key: 'licenca', nome: 'Licenças (ANAC / FAA)', pk: 'id' },
  { key: 'treinamento', nome: 'Treinamentos Realizados', pk: 'id' },
  { key: 'treinamento_motor', nome: 'Vínculos Treinamento × Motor', pk: 'treinamento_id+motor_id' },
  { key: 'designacao_pessoa', nome: 'Designações (Pessoa)', pk: 'pessoa_id' },
  { key: 'designacao_base', nome: 'Designações de Base', pk: 'pessoa_id+base_id' },
  { key: 'designacao_funcao', nome: 'Designações de Função', pk: 'pessoa_id+funcao' },
  { key: 'designacao_aeronave', nome: 'Designações de Aeronave', pk: 'pessoa_id+aeronave' },
];

export function validateImportPayload(
  payload: RawImportPayload,
  mode: 'substituir' | 'mesclar' = 'substituir'
): ImportValidationReport {
  const currentDb = loadDatabase();
  const issues: ImportIssue[] = [];
  const stats: Record<string, EntityImportStats> = {};
  let totalRegistrosNoArquivo = 0;

  // Expected counts from meta if available
  const metaContagens = payload.meta?.contagens || {};

  // Build ID lookup sets for FK validation
  const baseIds = new Set<string>();
  const pessoaIds = new Set<string>();
  const cursoIds = new Set<string>();
  const motorIds = new Set<string>();
  const treinamentoIds = new Set<string>();

  // If merging, include existing IDs from DB
  if (mode === 'mesclar') {
    currentDb.bases.forEach((b) => baseIds.add(b.id));
    currentDb.pessoas.forEach((p) => pessoaIds.add(p.id));
    currentDb.cursosCatalogo.forEach((c) => cursoIds.add(c.id));
    currentDb.motoresCatalogo.forEach((m) => motorIds.add(m.id));
    currentDb.treinamentos.forEach((t) => treinamentoIds.add(t.id));
  }

  // Also collect IDs from the payload itself
  if (Array.isArray(payload.base)) {
    payload.base.forEach((b) => b?.id && baseIds.add(String(b.id).trim()));
  }
  if (Array.isArray(payload.pessoa)) {
    payload.pessoa.forEach((p) => p?.id && pessoaIds.add(String(p.id).trim()));
  }
  if (Array.isArray(payload.curso_catalogo)) {
    payload.curso_catalogo.forEach((c) => c?.id && cursoIds.add(String(c.id).trim()));
  }
  if (Array.isArray(payload.motor_catalogo)) {
    payload.motor_catalogo.forEach((m) => m?.id && motorIds.add(String(m.id).trim()));
  }
  if (Array.isArray(payload.treinamento)) {
    payload.treinamento.forEach((t) => t?.id && treinamentoIds.add(String(t.id).trim()));
  }

  // 1. Validate Base
  const baseRows = Array.isArray(payload.base) ? payload.base : [];
  let baseNovos = 0,
    baseAlt = 0,
    baseRej = 0;
  baseRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const id = parseTextString(row.id);
    const nome = parseTextString(row.nome);
    if (!id) {
      issues.push({
        linha: idx + 1,
        entidade: 'base',
        campo: 'id',
        motivo: 'Base sem identificador (id obrigatório)',
        severidade: 'erro',
      });
      baseRej++;
      return;
    }
    const exists = currentDb.bases.some((b) => b.id === id);
    if (exists && mode === 'mesclar') baseAlt++;
    else baseNovos++;
  });
  stats['base'] = {
    entidade: 'base',
    nomeExibicao: 'Bases Operacionais',
    esperado: metaContagens['base'],
    noArquivo: baseRows.length,
    novos: baseNovos,
    alterados: baseAlt,
    rejeitados: baseRej,
    status: metaContagens['base'] !== undefined && metaContagens['base'] !== baseRows.length ? 'DIVERGENCIA' : 'OK',
  };

  // 2. Validate Pessoa
  const pessoaRows = Array.isArray(payload.pessoa) ? payload.pessoa : [];
  let pessoaNovos = 0,
    pessoaAlt = 0,
    pessoaRej = 0;
  pessoaRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const id = parseTextString(row.id);
    const nome = parseTextString(row.nome);
    const baseId = parseTextString(row.base_principal_id);
    if (!id || !nome) {
      issues.push({
        linha: idx + 1,
        entidade: 'pessoa',
        id: id || undefined,
        campo: !id ? 'id' : 'nome',
        motivo: 'Pessoa sem ID ou sem Nome completo',
        severidade: 'erro',
      });
      pessoaRej++;
      return;
    }
    if (baseId && !baseIds.has(baseId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'pessoa',
        id,
        campo: 'base_principal_id',
        motivo: `Base principal '${baseId}' não encontrada no catálogo de bases`,
        severidade: 'aviso',
      });
    }
    const exists = currentDb.pessoas.some((p) => p.id === id);
    if (exists && mode === 'mesclar') pessoaAlt++;
    else pessoaNovos++;
  });
  stats['pessoa'] = {
    entidade: 'pessoa',
    nomeExibicao: 'Pessoas (Mecânicos / ADM)',
    esperado: metaContagens['pessoa'],
    noArquivo: pessoaRows.length,
    novos: pessoaNovos,
    alterados: pessoaAlt,
    rejeitados: pessoaRej,
    status: metaContagens['pessoa'] !== undefined && metaContagens['pessoa'] !== pessoaRows.length ? 'DIVERGENCIA' : 'OK',
  };

  // 3. Validate Cursos Catalogo
  const cursoRows = Array.isArray(payload.curso_catalogo) ? payload.curso_catalogo : [];
  let cursoNovos = 0,
    cursoAlt = 0,
    cursoRej = 0;
  cursoRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const id = parseTextString(row.id);
    const curso = parseTextString(row.curso);
    if (!id || !curso) {
      issues.push({
        linha: idx + 1,
        entidade: 'curso_catalogo',
        campo: !id ? 'id' : 'curso',
        motivo: 'Curso de catálogo sem ID ou sem nome do curso',
        severidade: 'erro',
      });
      cursoRej++;
      return;
    }
    const exists = currentDb.cursosCatalogo.some((c) => c.id === id);
    if (exists && mode === 'mesclar') cursoAlt++;
    else cursoNovos++;
  });
  stats['curso_catalogo'] = {
    entidade: 'curso_catalogo',
    nomeExibicao: 'Catálogo de Cursos',
    esperado: metaContagens['curso_catalogo'],
    noArquivo: cursoRows.length,
    novos: cursoNovos,
    alterados: cursoAlt,
    rejeitados: cursoRej,
    status:
      metaContagens['curso_catalogo'] !== undefined && metaContagens['curso_catalogo'] !== cursoRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 4. Validate Motores Catalogo
  const motorRows = Array.isArray(payload.motor_catalogo) ? payload.motor_catalogo : [];
  let motorNovos = 0,
    motorAlt = 0,
    motorRej = 0;
  motorRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const id = parseTextString(row.id);
    const fabricante = parseTextString(row.fabricante);
    if (!id || !fabricante) {
      issues.push({
        linha: idx + 1,
        entidade: 'motor_catalogo',
        campo: !id ? 'id' : 'fabricante',
        motivo: 'Motor sem ID ou sem Fabricante',
        severidade: 'erro',
      });
      motorRej++;
      return;
    }
    const exists = currentDb.motoresCatalogo.some((m) => m.id === id);
    if (exists && mode === 'mesclar') motorAlt++;
    else motorNovos++;
  });
  stats['motor_catalogo'] = {
    entidade: 'motor_catalogo',
    nomeExibicao: 'Catálogo de Motores',
    esperado: metaContagens['motor_catalogo'],
    noArquivo: motorRows.length,
    novos: motorNovos,
    alterados: motorAlt,
    rejeitados: motorRej,
    status:
      metaContagens['motor_catalogo'] !== undefined && metaContagens['motor_catalogo'] !== motorRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 5. Validate Licenca
  const licRows = Array.isArray(payload.licenca) ? payload.licenca : [];
  let licNovos = 0,
    licAlt = 0,
    licRej = 0;
  licRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const id = parseTextString(row.id);
    const pessoaId = parseTextString(row.pessoa_id);
    if (!id || !pessoaId) {
      issues.push({
        linha: idx + 1,
        entidade: 'licenca',
        id: id || undefined,
        campo: !id ? 'id' : 'pessoa_id',
        motivo: 'Licença sem ID ou sem pessoa_id',
        severidade: 'erro',
      });
      licRej++;
      return;
    }
    if (!pessoaIds.has(pessoaId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'licenca',
        id,
        campo: 'pessoa_id',
        motivo: `Mecânico/Pessoa '${pessoaId}' referenciada na licença não encontrada`,
        severidade: 'erro',
      });
      licRej++;
      return;
    }
    const exists = currentDb.licencas.some((l) => l.id === id);
    if (exists && mode === 'mesclar') licAlt++;
    else licNovos++;
  });
  stats['licenca'] = {
    entidade: 'licenca',
    nomeExibicao: 'Licenças (ANAC / FAA)',
    esperado: metaContagens['licenca'],
    noArquivo: licRows.length,
    novos: licNovos,
    alterados: licAlt,
    rejeitados: licRej,
    status: metaContagens['licenca'] !== undefined && metaContagens['licenca'] !== licRows.length ? 'DIVERGENCIA' : 'OK',
  };

  // 6. Validate Treinamento
  const trnRows = Array.isArray(payload.treinamento) ? payload.treinamento : [];
  let trnNovos = 0,
    trnAlt = 0,
    trnRej = 0;
  trnRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const id = parseTextString(row.id);
    const pessoaId = parseTextString(row.pessoa_id);
    const cursoId = parseTextString(row.curso_id);
    const dtExec = parseExcelDate(row.data_execucao);
    if (!id || !pessoaId || !cursoId) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento',
        id: id || undefined,
        campo: 'id/pessoa_id/curso_id',
        motivo: 'Treinamento sem ID, pessoa_id ou curso_id',
        severidade: 'erro',
      });
      trnRej++;
      return;
    }
    if (!pessoaIds.has(pessoaId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento',
        id,
        campo: 'pessoa_id',
        motivo: `Pessoa '${pessoaId}' referenciada no treinamento não encontrada`,
        severidade: 'erro',
      });
      trnRej++;
      return;
    }
    if (!cursoIds.has(cursoId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento',
        id,
        campo: 'curso_id',
        motivo: `Curso '${cursoId}' referenciado no treinamento não encontrado no catálogo`,
        severidade: 'aviso',
      });
    }
    if (!dtExec) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento',
        id,
        campo: 'data_execucao',
        motivo: `Data de execução inválida ou vazia no treinamento ${id}`,
        severidade: 'aviso',
      });
    }
    const exists = currentDb.treinamentos.some((t) => t.id === id);
    if (exists && mode === 'mesclar') trnAlt++;
    else trnNovos++;
  });
  stats['treinamento'] = {
    entidade: 'treinamento',
    nomeExibicao: 'Treinamentos Realizados',
    esperado: metaContagens['treinamento'],
    noArquivo: trnRows.length,
    novos: trnNovos,
    alterados: trnAlt,
    rejeitados: trnRej,
    status:
      metaContagens['treinamento'] !== undefined && metaContagens['treinamento'] !== trnRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 7. Validate Treinamento Motor
  const trnMotorRows = Array.isArray(payload.treinamento_motor) ? payload.treinamento_motor : [];
  let tmNovos = 0,
    tmAlt = 0,
    tmRej = 0;
  trnMotorRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const tId = parseTextString(row.treinamento_id);
    const mId = parseTextString(row.motor_id);
    if (!tId || !mId) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento_motor',
        campo: 'treinamento_id/motor_id',
        motivo: 'Vínculo Treinamento-Motor sem treinamento_id ou motor_id',
        severidade: 'erro',
      });
      tmRej++;
      return;
    }
    if (!treinamentoIds.has(tId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento_motor',
        campo: 'treinamento_id',
        motivo: `Treinamento '${tId}' não encontrado para vínculo com motor`,
        severidade: 'aviso',
      });
    }
    if (!motorIds.has(mId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'treinamento_motor',
        campo: 'motor_id',
        motivo: `Motor '${mId}' não encontrado no catálogo`,
        severidade: 'aviso',
      });
    }
    const exists = currentDb.treinamentosMotor.some((tm) => tm.treinamento_id === tId && tm.motor_id === mId);
    if (exists && mode === 'mesclar') tmAlt++;
    else tmNovos++;
  });
  stats['treinamento_motor'] = {
    entidade: 'treinamento_motor',
    nomeExibicao: 'Vínculos Treinamento × Motor',
    esperado: metaContagens['treinamento_motor'],
    noArquivo: trnMotorRows.length,
    novos: tmNovos,
    alterados: tmAlt,
    rejeitados: tmRej,
    status:
      metaContagens['treinamento_motor'] !== undefined &&
      metaContagens['treinamento_motor'] !== trnMotorRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 8. Validate Designacao Pessoa
  const desPessoaRows = Array.isArray(payload.designacao_pessoa) ? payload.designacao_pessoa : [];
  let dpNovos = 0,
    dpAlt = 0,
    dpRej = 0;
  desPessoaRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const pId = parseTextString(row.pessoa_id);
    if (!pId) {
      issues.push({
        linha: idx + 1,
        entidade: 'designacao_pessoa',
        campo: 'pessoa_id',
        motivo: 'Designação sem pessoa_id',
        severidade: 'erro',
      });
      dpRej++;
      return;
    }
    if (!pessoaIds.has(pId)) {
      issues.push({
        linha: idx + 1,
        entidade: 'designacao_pessoa',
        campo: 'pessoa_id',
        motivo: `Mecânico '${pId}' na designação não encontrado`,
        severidade: 'erro',
      });
      dpRej++;
      return;
    }
    const exists = currentDb.designacoesPessoa.some((dp) => dp.pessoa_id === pId);
    if (exists && mode === 'mesclar') dpAlt++;
    else dpNovos++;
  });
  stats['designacao_pessoa'] = {
    entidade: 'designacao_pessoa',
    nomeExibicao: 'Designações (Pessoa)',
    esperado: metaContagens['designacao_pessoa'],
    noArquivo: desPessoaRows.length,
    novos: dpNovos,
    alterados: dpAlt,
    rejeitados: dpRej,
    status:
      metaContagens['designacao_pessoa'] !== undefined &&
      metaContagens['designacao_pessoa'] !== desPessoaRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 9. Validate Designacao Base
  const desBaseRows = Array.isArray(payload.designacao_base) ? payload.designacao_base : [];
  let dbNovos = 0,
    dbAlt = 0,
    dbRej = 0;
  desBaseRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const pId = parseTextString(row.pessoa_id);
    const bId = parseTextString(row.base_id);
    if (!pId || !bId) {
      issues.push({
        linha: idx + 1,
        entidade: 'designacao_base',
        campo: 'pessoa_id/base_id',
        motivo: 'Designação de base sem pessoa_id ou base_id',
        severidade: 'erro',
      });
      dbRej++;
      return;
    }
    const exists = currentDb.designacoesBase.some((dbItem) => dbItem.pessoa_id === pId && dbItem.base_id === bId);
    if (exists && mode === 'mesclar') dbAlt++;
    else dbNovos++;
  });
  stats['designacao_base'] = {
    entidade: 'designacao_base',
    nomeExibicao: 'Designações de Base',
    esperado: metaContagens['designacao_base'],
    noArquivo: desBaseRows.length,
    novos: dbNovos,
    alterados: dbAlt,
    rejeitados: dbRej,
    status:
      metaContagens['designacao_base'] !== undefined && metaContagens['designacao_base'] !== desBaseRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 10. Validate Designacao Funcao
  const desFuncaoRows = Array.isArray(payload.designacao_funcao) ? payload.designacao_funcao : [];
  let dfNovos = 0,
    dfAlt = 0,
    dfRej = 0;
  desFuncaoRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const pId = parseTextString(row.pessoa_id);
    const func = parseTextString(row.funcao);
    if (!pId || !func) {
      issues.push({
        linha: idx + 1,
        entidade: 'designacao_funcao',
        campo: 'pessoa_id/funcao',
        motivo: 'Designação de função sem pessoa_id ou funcao',
        severidade: 'erro',
      });
      dfRej++;
      return;
    }
    const exists = currentDb.designacoesFuncao.some((dfItem) => dfItem.pessoa_id === pId && dfItem.funcao === func);
    if (exists && mode === 'mesclar') dfAlt++;
    else dfNovos++;
  });
  stats['designacao_funcao'] = {
    entidade: 'designacao_funcao',
    nomeExibicao: 'Designações de Função',
    esperado: metaContagens['designacao_funcao'],
    noArquivo: desFuncaoRows.length,
    novos: dfNovos,
    alterados: dfAlt,
    rejeitados: dfRej,
    status:
      metaContagens['designacao_funcao'] !== undefined &&
      metaContagens['designacao_funcao'] !== desFuncaoRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // 11. Validate Designacao Aeronave
  const desAeroRows = Array.isArray(payload.designacao_aeronave) ? payload.designacao_aeronave : [];
  let daNovos = 0,
    daAlt = 0,
    daRej = 0;
  desAeroRows.forEach((row, idx) => {
    totalRegistrosNoArquivo++;
    const pId = parseTextString(row.pessoa_id);
    const aero = parseTextString(row.aeronave);
    if (!pId || !aero) {
      issues.push({
        linha: idx + 1,
        entidade: 'designacao_aeronave',
        campo: 'pessoa_id/aeronave',
        motivo: 'Designação de aeronave sem pessoa_id ou aeronave',
        severidade: 'erro',
      });
      daRej++;
      return;
    }
    const exists = currentDb.designacoesAeronave.some((daItem) => daItem.pessoa_id === pId && daItem.aeronave === aero);
    if (exists && mode === 'mesclar') daAlt++;
    else daNovos++;
  });
  stats['designacao_aeronave'] = {
    entidade: 'designacao_aeronave',
    nomeExibicao: 'Designações de Aeronave',
    esperado: metaContagens['designacao_aeronave'],
    noArquivo: desAeroRows.length,
    novos: daNovos,
    alterados: daAlt,
    rejeitados: daRej,
    status:
      metaContagens['designacao_aeronave'] !== undefined &&
      metaContagens['designacao_aeronave'] !== desAeroRows.length
        ? 'DIVERGENCIA'
        : 'OK',
  };

  // Configuration check
  if (payload.configuracao) {
    stats['configuracao'] = {
      entidade: 'configuracao',
      nomeExibicao: 'Parâmetros Operacionais',
      noArquivo: 1,
      novos: 0,
      alterados: 1,
      rejeitados: 0,
      status: 'OK',
    };
  }

  const totalErros = issues.filter((i) => i.severidade === 'erro').length;
  const totalAvisos = issues.filter((i) => i.severidade === 'aviso').length;

  return {
    stats,
    issues,
    totalRegistrosNoArquivo,
    totalErros,
    totalAvisos,
    canCommit: totalErros === 0,
    modo: mode,
  };
}

// ------------------- TRANSACTION COMMIT (TUDO OU NADA) -------------------

export async function commitImportPayload(
  payload: RawImportPayload,
  mode: 'substituir' | 'mesclar' = 'substituir',
  usuarioNome = 'Admin',
  sourceName = 'Arquivo Importado'
): Promise<PostImportConferenceData> {
  const validation = validateImportPayload(payload, mode);
  if (!validation.canCommit) {
    const errorMessages = validation.issues
      .filter((i) => i.severidade === 'erro')
      .slice(0, 5)
      .map((i) => `[${i.entidade}] ${i.motivo}`)
      .join('; ');
    throw new Error(`Falha na transação de integridade ("tudo-ou-nada"): ${errorMessages}`);
  }

  const currentDb = loadDatabase();
  const now = new Date().toISOString();

  // Create working clone
  const newDb: DatabaseState = mode === 'substituir'
    ? {
        ...buildInitialCleanDatabase(),
        usuarios: currentDb.usuarios,
        auditoria: currentDb.auditoria,
      }
    : {
        pessoas: [...currentDb.pessoas],
        bases: [...currentDb.bases],
        licencas: [...currentDb.licencas],
        cursosCatalogo: [...currentDb.cursosCatalogo],
        motoresCatalogo: [...currentDb.motoresCatalogo],
        treinamentos: [...currentDb.treinamentos],
        treinamentosMotor: [...currentDb.treinamentosMotor],
        designacoesPessoa: [...currentDb.designacoesPessoa],
        designacoesBase: [...currentDb.designacoesBase],
        designacoesFuncao: [...currentDb.designacoesFuncao],
        designacoesAeronave: [...currentDb.designacoesAeronave],
        configuracao: { ...currentDb.configuracao },
        usuarios: currentDb.usuarios,
        auditoria: currentDb.auditoria,
      };

  // LOAD ORDER:
  // 1. base
  if (Array.isArray(payload.base)) {
    if (mode === 'substituir') newDb.bases = [];
    for (const r of payload.base) {
      const id = parseTextString(r.id);
      const nome = parseTextString(r.nome || id);
      const ativa = parseBoolean(r.ativa, true);
      if (!id) continue;
      const sigla = parseTextString((r as any).sigla || id).toUpperCase();
      const tipo = ((r as any).tipo || 'ESTACAO_LINHA') as any;
      const cidade = parseTextString((r as any).cidade || '');
      const estado = parseTextString((r as any).estado || '').toUpperCase();
      const idx = newDb.bases.findIndex((b) => b.id === id);
      const item: Base = {
        id,
        sigla,
        nome,
        tipo,
        cidade,
        estado,
        pais: parseTextString((r as any).pais || 'Brasil'),
        endereco: parseTextString((r as any).endereco || ''),
        codigo_iata: parseTextString((r as any).codigo_iata || ''),
        codigo_icao: parseTextString((r as any).codigo_icao || ''),
        ativa,
        observacoes: parseTextString((r as any).observacoes || ''),
      };
      if (idx >= 0) newDb.bases[idx] = item;
      else newDb.bases.push(item);
    }
  }

  // 2. pessoa
  if (Array.isArray(payload.pessoa)) {
    if (mode === 'substituir') newDb.pessoas = [];
    for (const r of payload.pessoa) {
      const id = parseTextString(r.id);
      const nome = parseTextString(r.nome);
      if (!id || !nome) continue;
      const categoria: CategoriaPessoa = r.categoria === 'Administrativo' ? 'Administrativo' : 'Mecânico';
      const situacao: SituacaoPessoa = r.situacao === 'Inativo' ? 'Inativo' : 'Ativo';
      const base_principal_id = parseTextString(r.base_principal_id || 'GRU');
      const cliente_ou_area = parseNullableString(r.cliente_ou_area) || '';
      const canac = parseNullableString(r.canac) || '';

      const normNome = normalizePersonName(nome);
      const normCanac = normalizeMatriculaOrCanac(canac);

      const idx = newDb.pessoas.findIndex((p) => {
        if (p.id === id) return true;
        if (normCanac && p.canac && normalizeMatriculaOrCanac(p.canac) === normCanac) return true;
        if (normNome && normalizePersonName(p.nome) === normNome) return true;
        return false;
      });

      const existingPerson = idx >= 0 ? newDb.pessoas[idx] : null;
      const targetId = existingPerson ? existingPerson.id : id;

      const item: Pessoa = {
        id: targetId,
        nome: existingPerson?.nome || nome,
        categoria,
        situacao,
        base_principal_id: base_principal_id || existingPerson?.base_principal_id || 'GRU',
        cliente_ou_area: cliente_ou_area || existingPerson?.cliente_ou_area || '',
        canac: canac || existingPerson?.canac || '',
        criado_em: existingPerson?.criado_em || r.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      };
      if (idx >= 0) newDb.pessoas[idx] = item;
      else newDb.pessoas.push(item);
    }
  }

  // 3. curso_catalogo
  if (Array.isArray(payload.curso_catalogo)) {
    if (mode === 'substituir') newDb.cursosCatalogo = [];
    for (const r of payload.curso_catalogo) {
      const id = parseTextString(r.id);
      const curso = parseTextString(r.curso);
      if (!id || !curso) continue;
      const grupo = r.grupo === 'Doutrinação' ? 'Doutrinação' : 'Frota';
      const frota = parseNullableString(r.frota) || '';
      const variante = parseNullableString(r.variante) || '';
      const validade_dias = parseNumber(r.validade_dias, 1825);
      const ativo = parseBoolean(r.ativo, true);

      const idx = newDb.cursosCatalogo.findIndex((c) => c.id === id);
      const item: CursoCatalogo = { id, grupo, frota, variante, curso, validade_dias, ativo };
      if (idx >= 0) newDb.cursosCatalogo[idx] = item;
      else newDb.cursosCatalogo.push(item);
    }
  }

  // 4. motor_catalogo
  if (Array.isArray(payload.motor_catalogo)) {
    if (mode === 'substituir') newDb.motoresCatalogo = [];
    for (const r of payload.motor_catalogo) {
      const id = parseTextString(r.id);
      const fabricante = parseTextString(r.fabricante) as any;
      const modelo = parseNullableString(r.modelo) || '';
      if (!id || !fabricante) continue;

      const idx = newDb.motoresCatalogo.findIndex((m) => m.id === id);
      const item: MotorCatalogo = { id, fabricante, modelo };
      if (idx >= 0) newDb.motoresCatalogo[idx] = item;
      else newDb.motoresCatalogo.push(item);
    }
  }

  // 5. licenca
  if (Array.isArray(payload.licenca)) {
    if (mode === 'substituir') newDb.licencas = [];
    for (const r of payload.licenca) {
      const id = parseTextString(r.id);
      const pessoa_id = parseTextString(r.pessoa_id);
      if (!id || !pessoa_id) continue;
      const orgao = r.orgao === 'FAA' ? 'FAA' : 'ANAC';
      const tipo = r.tipo === 'CCT' ? 'CCT' : r.tipo === 'AMP' ? 'AMP' : 'CHT';
      const habilitacao = parseTextString(r.habilitacao).toUpperCase() as any;
      const numero = parseTextString(r.numero);
      const data_vencimento = parseExcelDate(r.data_vencimento);
      const data_expedicao = parseExcelDate(r.data_expedicao);

      const idx = newDb.licencas.findIndex((l) => l.id === id);
      const item: Licenca = {
        id,
        pessoa_id,
        orgao,
        tipo,
        habilitacao: habilitacao || '',
        numero,
        data_vencimento,
        data_expedicao,
        criado_em: r.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      };
      if (idx >= 0) newDb.licencas[idx] = item;
      else newDb.licencas.push(item);
    }
  }

  // 6. treinamento
  if (Array.isArray(payload.treinamento)) {
    if (mode === 'substituir') newDb.treinamentos = [];
    for (const r of payload.treinamento) {
      const id = parseTextString(r.id);
      const pessoa_id = parseTextString(r.pessoa_id);
      const curso_id = parseTextString(r.curso_id);
      const data_execucao = parseExcelDate(r.data_execucao) || '';
      if (!id || !pessoa_id || !curso_id) continue;
      const validade_dias_override = r.validade_dias_override != null ? Number(r.validade_dias_override) : null;
      const motor_original = parseNullableString(r.motor_original) || '';
      const observacao = parseNullableString(r.observacao) || '';
      const substituido_por = parseNullableString(r.substituido_por);

      const idx = newDb.treinamentos.findIndex((t) => t.id === id);
      const item: Treinamento = {
        id,
        pessoa_id,
        curso_id,
        data_execucao,
        validade_dias_override,
        motor_original,
        observacao,
        substituido_por,
        criado_em: r.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      };
      if (idx >= 0) newDb.treinamentos[idx] = item;
      else newDb.treinamentos.push(item);
    }
  }

  // 7. treinamento_motor
  if (Array.isArray(payload.treinamento_motor)) {
    if (mode === 'substituir') newDb.treinamentosMotor = [];
    for (const r of payload.treinamento_motor) {
      const treinamento_id = parseTextString(r.treinamento_id);
      const motor_id = parseTextString(r.motor_id);
      if (!treinamento_id || !motor_id) continue;

      const exists = newDb.treinamentosMotor.some(
        (tm) => tm.treinamento_id === treinamento_id && tm.motor_id === motor_id
      );
      if (!exists) {
        newDb.treinamentosMotor.push({ treinamento_id, motor_id });
      }
    }
  }

  // 8. designacao_pessoa
  if (Array.isArray(payload.designacao_pessoa)) {
    if (mode === 'substituir') newDb.designacoesPessoa = [];
    for (const r of payload.designacao_pessoa) {
      const pessoa_id = parseTextString(r.pessoa_id);
      if (!pessoa_id) continue;
      const imp = parseTextString(r.imp);
      const easa_type: EasaType = r.easa_type === 'SIM' ? 'SIM' : r.easa_type === 'NÃO' ? 'NÃO' : 'N/A';
      const incluir_na_lista = parseBoolean(r.incluir_na_lista, true);
      const nome_na_lista = parseNullableString(r.nome_na_lista) || undefined;

      const idx = newDb.designacoesPessoa.findIndex((dp) => dp.pessoa_id === pessoa_id);
      const item: DesignacaoPessoa = { pessoa_id, imp, easa_type, incluir_na_lista, nome_na_lista };
      if (idx >= 0) newDb.designacoesPessoa[idx] = item;
      else newDb.designacoesPessoa.push(item);
    }
  }

  // 9. designacao_base
  if (Array.isArray(payload.designacao_base)) {
    if (mode === 'substituir') newDb.designacoesBase = [];
    for (const r of payload.designacao_base) {
      const pessoa_id = parseTextString(r.pessoa_id);
      const base_id = parseTextString(r.base_id);
      if (!pessoa_id || !base_id) continue;

      const exists = newDb.designacoesBase.some(
        (dbItem) => dbItem.pessoa_id === pessoa_id && dbItem.base_id === base_id
      );
      if (!exists) {
        newDb.designacoesBase.push({ pessoa_id, base_id });
      }
    }
  }

  // 10. designacao_funcao
  if (Array.isArray(payload.designacao_funcao)) {
    if (mode === 'substituir') newDb.designacoesFuncao = [];
    for (const r of payload.designacao_funcao) {
      const pessoa_id = parseTextString(r.pessoa_id);
      const funcao = parseTextString(r.funcao) as FuncaoDesignacao;
      const valor = parseSimNao(r.valor, 'NÃO');
      if (!pessoa_id || !funcao) continue;

      const idx = newDb.designacoesFuncao.findIndex((df) => df.pessoa_id === pessoa_id && df.funcao === funcao);
      const item: DesignacaoFuncao = { pessoa_id, funcao, valor };
      if (idx >= 0) newDb.designacoesFuncao[idx] = item;
      else newDb.designacoesFuncao.push(item);
    }
  }

  // 11. designacao_aeronave
  if (Array.isArray(payload.designacao_aeronave)) {
    if (mode === 'substituir') newDb.designacoesAeronave = [];
    for (const r of payload.designacao_aeronave) {
      const pessoa_id = parseTextString(r.pessoa_id);
      const aeronave = parseTextString(r.aeronave) as AeronaveDesignacao;
      const valor = parseSimNao(r.valor, 'NÃO');
      if (!pessoa_id || !aeronave) continue;

      const idx = newDb.designacoesAeronave.findIndex((da) => da.pessoa_id === pessoa_id && da.aeronave === aeronave);
      const item: DesignacaoAeronave = { pessoa_id, aeronave, valor };
      if (idx >= 0) newDb.designacoesAeronave[idx] = item;
      else newDb.designacoesAeronave.push(item);
    }
  }

  // 12. configuracao
  if (payload.configuracao) {
    const c = payload.configuracao;
    newDb.configuracao = {
      faixa_1: parseNumber(c.faixa_1, newDb.configuracao.faixa_1),
      faixa_2: parseNumber(c.faixa_2, newDb.configuracao.faixa_2),
      faixa_3: parseNumber(c.faixa_3, newDb.configuracao.faixa_3),
      data_referencia: parseExcelDate(c.data_referencia) || c.data_referencia || newDb.configuracao.data_referencia,
      responsavel_tecnico: parseTextString(c.responsavel_tecnico) || newDb.configuracao.responsavel_tecnico,
      destacar_vencimentos_padrao: parseBoolean(
        c.destacar_vencimentos_padrao,
        newDb.configuracao.destacar_vencimentos_padrao
      ),
      limite_linhas_pagina: parseNumber(c.limite_linhas_pagina, newDb.configuracao.limite_linhas_pagina),
      logo_url: c.logo_url || newDb.configuracao.logo_url,
      assinatura_url: c.assinatura_url || newDb.configuracao.assinatura_url,
    };
  }

  // Persist updated database
  persistDatabase(newDb);

  // Save official backup to localStorage
  try {
    const cleanBackupObj: RawImportPayload = {
      meta: {
        sistema: 'Roster de Treinamentos - Impacto Aviation',
        versao_esquema: 1,
        gerado_em: now.slice(0, 10),
        observacao: `Último backup oficial salvo em ${now}.`,
        contagens: {
          base: newDb.bases.length,
          pessoa: newDb.pessoas.length,
          licenca: newDb.licencas.length,
          curso_catalogo: newDb.cursosCatalogo.length,
          treinamento: newDb.treinamentos.length,
          motor_catalogo: newDb.motoresCatalogo.length,
          treinamento_motor: newDb.treinamentosMotor.length,
          designacao_pessoa: newDb.designacoesPessoa.length,
          designacao_base: newDb.designacoesBase.length,
          designacao_funcao: newDb.designacoesFuncao.length,
          designacao_aeronave: newDb.designacoesAeronave.length,
        },
      },
      base: newDb.bases,
      pessoa: newDb.pessoas,
      licenca: newDb.licencas,
      curso_catalogo: newDb.cursosCatalogo,
      treinamento: newDb.treinamentos,
      motor_catalogo: newDb.motoresCatalogo,
      treinamento_motor: newDb.treinamentosMotor,
      designacao_pessoa: newDb.designacoesPessoa,
      designacao_base: newDb.designacoesBase,
      designacao_funcao: newDb.designacoesFuncao,
      designacao_aeronave: newDb.designacoesAeronave,
      configuracao: newDb.configuracao,
    };
    localStorage.setItem(OFFICIAL_BACKUP_KEY, JSON.stringify(cleanBackupObj));
  } catch (err) {
    console.warn('Não foi possível salvar backup oficial no localStorage:', err);
  }

  // Record audit log
  const totalGravados =
    newDb.bases.length +
    newDb.pessoas.length +
    newDb.licencas.length +
    newDb.cursosCatalogo.length +
    newDb.treinamentos.length +
    newDb.motoresCatalogo.length +
    newDb.treinamentosMotor.length +
    newDb.designacoesPessoa.length +
    newDb.designacoesBase.length +
    newDb.designacoesFuncao.length +
    newDb.designacoesAeronave.length;

  recordAudit(
    'IMPORTAR',
    'sistema',
    'IMPORT_TRANSACTION',
    `Importação concluída (${sourceName}, modo: ${mode}). Total de registros gravados: ${totalGravados}.`,
    null,
    { sourceName, modo: mode, totalGravados },
    usuarioNome
  );

  if (activeAdapter && activeAdapter.isCloud) {
    const cloudConf = await activeAdapter.importBatch(payload, mode, usuarioNome, sourceName);
    return cloudConf;
  }

  // Build Conference Data
  return generateConferenceData(newDb, payload, mode, sourceName, totalGravados);
}

// ------------------- POST-IMPORT CONFERENCE DATA GENERATOR -------------------

export function generateConferenceData(
  db: DatabaseState,
  payload?: RawImportPayload,
  mode: 'substituir' | 'mesclar' = 'substituir',
  sourceName = 'Base de Dados Ativa',
  totalGravadosCount?: number
): PostImportConferenceData {
  const metaContagens = payload?.meta?.contagens || {};

  const summaryList: EntityImportStats[] = [
    {
      entidade: 'base',
      nomeExibicao: 'Bases Operacionais',
      esperado: metaContagens['base'],
      noArquivo: payload?.base?.length ?? db.bases.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.bases.length,
      status: metaContagens['base'] !== undefined && metaContagens['base'] !== db.bases.length ? 'DIVERGENCIA' : 'OK',
    },
    {
      entidade: 'pessoa',
      nomeExibicao: 'Pessoas (Mecânicos & ADM)',
      esperado: metaContagens['pessoa'],
      noArquivo: payload?.pessoa?.length ?? db.pessoas.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.pessoas.length,
      status: metaContagens['pessoa'] !== undefined && metaContagens['pessoa'] !== db.pessoas.length ? 'DIVERGENCIA' : 'OK',
    },
    {
      entidade: 'licenca',
      nomeExibicao: 'Licenças (ANAC / FAA)',
      esperado: metaContagens['licenca'],
      noArquivo: payload?.licenca?.length ?? db.licencas.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.licencas.length,
      status: metaContagens['licenca'] !== undefined && metaContagens['licenca'] !== db.licencas.length ? 'DIVERGENCIA' : 'OK',
    },
    {
      entidade: 'curso_catalogo',
      nomeExibicao: 'Catálogo de Cursos',
      esperado: metaContagens['curso_catalogo'],
      noArquivo: payload?.curso_catalogo?.length ?? db.cursosCatalogo.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.cursosCatalogo.length,
      status:
        metaContagens['curso_catalogo'] !== undefined && metaContagens['curso_catalogo'] !== db.cursosCatalogo.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'treinamento',
      nomeExibicao: 'Treinamentos Realizados',
      esperado: metaContagens['treinamento'],
      noArquivo: payload?.treinamento?.length ?? db.treinamentos.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.treinamentos.length,
      status:
        metaContagens['treinamento'] !== undefined && metaContagens['treinamento'] !== db.treinamentos.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'motor_catalogo',
      nomeExibicao: 'Catálogo de Motores',
      esperado: metaContagens['motor_catalogo'],
      noArquivo: payload?.motor_catalogo?.length ?? db.motoresCatalogo.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.motoresCatalogo.length,
      status:
        metaContagens['motor_catalogo'] !== undefined && metaContagens['motor_catalogo'] !== db.motoresCatalogo.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'treinamento_motor',
      nomeExibicao: 'Vínculos Treinamento × Motor',
      esperado: metaContagens['treinamento_motor'],
      noArquivo: payload?.treinamento_motor?.length ?? db.treinamentosMotor.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.treinamentosMotor.length,
      status:
        metaContagens['treinamento_motor'] !== undefined &&
        metaContagens['treinamento_motor'] !== db.treinamentosMotor.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'designacao_pessoa',
      nomeExibicao: 'Designações (Pessoa)',
      esperado: metaContagens['designacao_pessoa'],
      noArquivo: payload?.designacao_pessoa?.length ?? db.designacoesPessoa.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.designacoesPessoa.length,
      status:
        metaContagens['designacao_pessoa'] !== undefined &&
        metaContagens['designacao_pessoa'] !== db.designacoesPessoa.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'designacao_base',
      nomeExibicao: 'Designações de Base',
      esperado: metaContagens['designacao_base'],
      noArquivo: payload?.designacao_base?.length ?? db.designacoesBase.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.designacoesBase.length,
      status:
        metaContagens['designacao_base'] !== undefined &&
        metaContagens['designacao_base'] !== db.designacoesBase.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'designacao_funcao',
      nomeExibicao: 'Designações de Função',
      esperado: metaContagens['designacao_funcao'],
      noArquivo: payload?.designacao_funcao?.length ?? db.designacoesFuncao.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.designacoesFuncao.length,
      status:
        metaContagens['designacao_funcao'] !== undefined &&
        metaContagens['designacao_funcao'] !== db.designacoesFuncao.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
    {
      entidade: 'designacao_aeronave',
      nomeExibicao: 'Designações de Aeronave',
      esperado: metaContagens['designacao_aeronave'],
      noArquivo: payload?.designacao_aeronave?.length ?? db.designacoesAeronave.length,
      novos: 0,
      alterados: 0,
      rejeitados: 0,
      gravados: db.designacoesAeronave.length,
      status:
        metaContagens['designacao_aeronave'] !== undefined &&
        metaContagens['designacao_aeronave'] !== db.designacoesAeronave.length
          ? 'DIVERGENCIA'
          : 'OK',
    },
  ];

  const total =
    totalGravadosCount ??
    db.bases.length +
      db.pessoas.length +
      db.licencas.length +
      db.cursosCatalogo.length +
      db.treinamentos.length +
      db.motoresCatalogo.length +
      db.treinamentosMotor.length +
      db.designacoesPessoa.length +
      db.designacoesBase.length +
      db.designacoesFuncao.length +
      db.designacoesAeronave.length;

  const mecanicos = db.pessoas.filter((p) => p.categoria === 'Mecânico');
  const administrativos = db.pessoas.filter((p) => p.categoria === 'Administrativo');

  // Sanity Checks Checklist
  // 1. Claudio Jair da Silva: CHT vencida em 2026-01-31?
  const claudio = db.pessoas.find(
    (p) => p.nome.toLowerCase().includes('claudio jair') || p.id === 'MEC-005'
  );
  let claudioCheck = false;
  let claudioMsg = 'Não encontrado';
  if (claudio) {
    const claudioLics = db.licencas.filter((l) => l.pessoa_id === claudio.id && l.tipo === 'CHT');
    const vencimentos = claudioLics.map((l) => l.data_vencimento).filter(Boolean);
    const has20260131 = vencimentos.some((v) => v === '2026-01-31');
    claudioCheck = has20260131;
    claudioMsg = has20260131
      ? 'Confirmado: CHT com vencimento em 2026-01-31 (Vencida)'
      : `Vencimentos encontrados: ${vencimentos.join(', ') || 'Nenhum'}`;
  }

  // 2. Franco Pusceddu: CHT vencida em 2023-02-28?
  const franco = db.pessoas.find(
    (p) => p.nome.toLowerCase().includes('franco') || p.id === 'MEC-011'
  );
  let francoCheck = false;
  let francoMsg = 'Não encontrado';
  if (franco) {
    const francoLics = db.licencas.filter((l) => l.pessoa_id === franco.id && l.tipo === 'CHT');
    const vencimentos = francoLics.map((l) => l.data_vencimento).filter(Boolean);
    const has20230228 = vencimentos.some((v) => v === '2023-02-28');
    francoCheck = has20230228;
    francoMsg = has20230228
      ? 'Confirmado: CHT com vencimento em 2023-02-28 (Vencida)'
      : `Vencimentos encontrados: ${vencimentos.join(', ') || 'Nenhum'}`;
  }

  // 3. Base REC: 7 mecânicos?
  const mecRec = mecanicos.filter((m) => {
    const isPrincipal = m.base_principal_id === 'REC';
    const isDesig = db.designacoesBase.some((dbItem) => dbItem.pessoa_id === m.id && dbItem.base_id === 'REC');
    return isPrincipal || isDesig;
  });
  const recCheck = mecRec.length === 7;
  const recMsg = `${mecRec.length} mecânicos vinculados à base REC (Esperado: 7)`;

  // 4. Total de mecânicos na Lista de Designação (suporta expansões dinâmicas do quadro)
  const mecDesignados = db.designacoesPessoa.filter((dp) => dp.incluir_na_lista);
  const esperadoDesignados =
    metaContagens['designacao_pessoa'] ??
    (payload?.designacao_pessoa
      ? payload.designacao_pessoa.filter((d: any) => d.incluir_na_lista).length
      : (mecDesignados.length > 0 ? mecDesignados.length : 32));
  const desigCheck = mecDesignados.length === esperadoDesignados || (mecDesignados.length >= 32 && !metaContagens['designacao_pessoa']);
  const desigMsg = `${mecDesignados.length} mecânicos com inclusão na Lista de Designação (Esperado: ${esperadoDesignados})`;

  const verificacoesSanidade: SanityCheckItem[] = [
    {
      titulo: 'Claudio Jair da Silva (MEC-005)',
      descricao: 'Validação da CHT vencida em 2026-01-31',
      esperado: '2026-01-31',
      encontrado: claudioMsg,
      aprovado: claudioCheck,
    },
    {
      titulo: 'Franco Alcides Pusceddu (MEC-011)',
      descricao: 'Validação da CHT vencida em 2023-02-28',
      esperado: '2023-02-28',
      encontrado: francoMsg,
      aprovado: francoCheck,
    },
    {
      titulo: 'Contingente da Base REC (Recife)',
      descricao: 'Mecânicos com base principal ou designação em REC',
      esperado: '7 mecânicos',
      encontrado: recMsg,
      aprovado: recCheck,
    },
    {
      titulo: 'Total na Lista de Designação Oficial',
      descricao: 'Mecânicos com incluir_na_lista habilitado',
      esperado: `${esperadoDesignados} mecânicos`,
      encontrado: desigMsg,
      aprovado: desigCheck,
    },
  ];

  return {
    sucesso: true,
    dataHora: new Date().toISOString(),
    nomeArquivo: sourceName,
    modo: mode,
    totalGravados: total,
    tabelaResumo: summaryList,
    mecanicos,
    administrativos,
    verificacoesSanidade,
    backupJson: exportBackupJson(),
  };
}

// ------------------- EMBEDDED SEED LOADER & RESTORE -------------------

export async function loadEmbeddedOfficialData(usuarioNome = 'Admin'): Promise<PostImportConferenceData> {
  try {
    const response = await fetch('/seed/roster_dados_oficiais.json');
    if (response.ok) {
      const jsonText = await response.text();
      const payload = parseImportJson(jsonText);
      return await commitImportPayload(payload, 'substituir', usuarioNome, 'roster_dados_oficiais.json (Embutido)');
    }
  } catch (err) {
    console.info('Carregando base oficial interna Impacto Aviation...', err);
  }
  const payload = getOfficialImpactoRawPayload();
  return await commitImportPayload(payload, 'substituir', usuarioNome, 'Roster Oficial Impacto Aviation MRO');
}

export async function restoreOfficialBackup(usuarioNome = 'Admin'): Promise<boolean> {
  // 1. Try saved backup in localStorage
  try {
    const rawBackup = localStorage.getItem(OFFICIAL_BACKUP_KEY);
    if (rawBackup) {
      const payload = parseImportJson(rawBackup);
      await commitImportPayload(payload, 'substituir', usuarioNome, 'Backup Oficial Salvo');
      return true;
    }
  } catch (err) {
    console.warn('Erro ao restaurar do localStorage, tentando arquivo embutido...', err);
  }

  // 2. Fallback: load embedded seed
  try {
    await loadEmbeddedOfficialData(usuarioNome);
    return true;
  } catch (err) {
    console.error('Falha ao restaurar dados oficiais:', err);
    return false;
  }
}

// ------------------- EXPORT IMPLEMENTATIONS -------------------

export function exportDatabaseToExcel(): void {
  const db = loadDatabase();
  const wb = XLSX.utils.book_new();

  // Exactly matching the 12 tabs specified in section 4
  const wsBase = XLSX.utils.json_to_sheet(db.bases);
  XLSX.utils.book_append_sheet(wb, wsBase, 'base');

  const wsPessoa = XLSX.utils.json_to_sheet(db.pessoas);
  XLSX.utils.book_append_sheet(wb, wsPessoa, 'pessoa');

  const wsLicenca = XLSX.utils.json_to_sheet(db.licencas);
  XLSX.utils.book_append_sheet(wb, wsLicenca, 'licenca');

  const wsCurso = XLSX.utils.json_to_sheet(db.cursosCatalogo);
  XLSX.utils.book_append_sheet(wb, wsCurso, 'curso_catalogo');

  const wsTreinamento = XLSX.utils.json_to_sheet(db.treinamentos);
  XLSX.utils.book_append_sheet(wb, wsTreinamento, 'treinamento');

  const wsMotor = XLSX.utils.json_to_sheet(db.motoresCatalogo);
  XLSX.utils.book_append_sheet(wb, wsMotor, 'motor_catalogo');

  const wsTrnMotor = XLSX.utils.json_to_sheet(db.treinamentosMotor);
  XLSX.utils.book_append_sheet(wb, wsTrnMotor, 'treinamento_motor');

  const wsDesPessoa = XLSX.utils.json_to_sheet(db.designacoesPessoa);
  XLSX.utils.book_append_sheet(wb, wsDesPessoa, 'designacao_pessoa');

  const wsDesBase = XLSX.utils.json_to_sheet(db.designacoesBase);
  XLSX.utils.book_append_sheet(wb, wsDesBase, 'designacao_base');

  const wsDesFuncao = XLSX.utils.json_to_sheet(db.designacoesFuncao);
  XLSX.utils.book_append_sheet(wb, wsDesFuncao, 'designacao_funcao');

  const wsDesAero = XLSX.utils.json_to_sheet(db.designacoesAeronave);
  XLSX.utils.book_append_sheet(wb, wsDesAero, 'designacao_aeronave');

  const wsConfig = XLSX.utils.json_to_sheet([db.configuracao]);
  XLSX.utils.book_append_sheet(wb, wsConfig, 'configuracao');

  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `Impacto_Aviation_Roster_Oficial_${dateStr}.xlsx`);
}

export function exportBackupJson(): string {
  const db = loadDatabase();
  const exportObj: RawImportPayload = {
    meta: {
      sistema: 'Roster de Treinamentos - Impacto Aviation',
      versao_esquema: 1,
      gerado_em: new Date().toISOString().slice(0, 10),
      observacao: 'Dados oficiais extraídos do sistema relacional Impacto Aviation.',
      contagens: {
        base: db.bases.length,
        pessoa: db.pessoas.length,
        licenca: db.licencas.length,
        curso_catalogo: db.cursosCatalogo.length,
        treinamento: db.treinamentos.length,
        motor_catalogo: db.motoresCatalogo.length,
        treinamento_motor: db.treinamentosMotor.length,
        designacao_pessoa: db.designacoesPessoa.length,
        designacao_base: db.designacoesBase.length,
        designacao_funcao: db.designacoesFuncao.length,
        designacao_aeronave: db.designacoesAeronave.length,
      },
    },
    base: db.bases,
    pessoa: db.pessoas,
    licenca: db.licencas,
    curso_catalogo: db.cursosCatalogo,
    treinamento: db.treinamentos,
    motor_catalogo: db.motoresCatalogo,
    treinamento_motor: db.treinamentosMotor,
    designacao_pessoa: db.designacoesPessoa,
    designacao_base: db.designacoesBase,
    designacao_funcao: db.designacoesFuncao,
    designacao_aeronave: db.designacoesAeronave,
    configuracao: db.configuracao,
  };
  return JSON.stringify(exportObj, null, 2);
}

export async function restoreBackupJson(jsonString: string, usuarioNome = 'Admin'): Promise<boolean> {
  try {
    const payload = parseImportJson(jsonString);
    await commitImportPayload(payload, 'substituir', usuarioNome, 'Restauração Backup JSON');
    return true;
  } catch (err) {
    console.error('Erro ao restaurar backup JSON:', err);
    return false;
  }
}

// ------------------- CRUD REPOSITORIES -------------------

export const repository = {
  getDatabase: () => loadDatabase(),

  resetToSeed: () => {
    restoreOfficialBackup('Admin');
  },

  // Pessoas
  getPessoas: (): Pessoa[] => loadDatabase().pessoas,
  getPessoaById: (id: string): Pessoa | undefined => loadDatabase().pessoas.find((p) => p.id === id),
  savePessoa: async (pessoa: Pessoa, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.savePessoa(pessoa, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.pessoas.findIndex((p) => p.id === pessoa.id);
    const now = new Date().toISOString();
    let acao: Auditoria['acao'] = 'CRIAR';
    let antes: any = null;

    if (idx >= 0) {
      acao = 'EDITAR';
      antes = { ...db.pessoas[idx] };
      db.pessoas[idx] = { ...pessoa, atualizado_em: now, atualizado_por: usuarioNome };
    } else {
      db.pessoas.push({
        ...pessoa,
        criado_em: pessoa.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      });
    }

    persistDatabase(db);
    recordAudit(
      acao,
      'pessoa',
      pessoa.id,
      `${acao === 'CRIAR' ? 'Criou' : 'Editou'} pessoa ${pessoa.nome}`,
      antes,
      pessoa,
      usuarioNome
    );
  },
  deletePessoa: async (id: string, usuarioNome = 'Admin'): Promise<Pessoa | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await activeAdapter.deletePessoa(id, usuarioNome);
    }
    const db = loadDatabase();
    const idx = db.pessoas.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const removed = db.pessoas[idx];
    db.pessoas.splice(idx, 1);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'pessoa', id, `Excluiu pessoa ${removed.nome}`, removed, null, usuarioNome);
    return removed;
  },

  // Bases
  getBases: (): Base[] => loadDatabase().bases,
  saveBase: async (base: Base, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveBase(base, usuarioNome);
      return;
    }
    await (activeAdapter as any).saveBase(base, usuarioNome);
  },
  inativarBase: async (id: string, motivo: string, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await (activeAdapter as any).inativarBase(id, motivo, usuarioNome);
      return;
    }
    await (activeAdapter as any).inativarBase(id, motivo, usuarioNome);
  },
  reativarBase: async (id: string, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await (activeAdapter as any).reativarBase(id, usuarioNome);
      return;
    }
    await (activeAdapter as any).reativarBase(id, usuarioNome);
  },
  deleteBase: async (id: string, usuarioNome = 'Admin'): Promise<Base | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await (activeAdapter as any).deleteBase(id, usuarioNome);
    }
    return await (activeAdapter as any).deleteBase(id, usuarioNome);
  },

  // Licencas
  getLicencas: (): Licenca[] => loadDatabase().licencas,
  getLicencasByPessoa: (pessoaId: string): Licenca[] => loadDatabase().licencas.filter((l) => l.pessoa_id === pessoaId),
  saveLicenca: async (licenca: Licenca, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveLicenca(licenca, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.licencas.findIndex((l) => l.id === licenca.id);
    const now = new Date().toISOString();
    let acao: Auditoria['acao'] = 'CRIAR';
    let antes: any = null;

    if (idx >= 0) {
      acao = 'EDITAR';
      antes = { ...db.licencas[idx] };
      db.licencas[idx] = { ...licenca, atualizado_em: now, atualizado_por: usuarioNome };
    } else {
      db.licencas.push({
        ...licenca,
        criado_em: licenca.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      });
    }

    persistDatabase(db);
    recordAudit(
      acao,
      'licenca',
      licenca.id,
      `${acao === 'CRIAR' ? 'Cadastrou' : 'Atualizou'} licença ${licenca.orgao} ${licenca.tipo} ${licenca.habilitacao || ''}`,
      antes,
      licenca,
      usuarioNome
    );
  },
  deleteLicenca: async (id: string, usuarioNome = 'Admin'): Promise<Licenca | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await activeAdapter.deleteLicenca(id, usuarioNome);
    }
    const db = loadDatabase();
    const idx = db.licencas.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    const removed = db.licencas[idx];
    db.licencas.splice(idx, 1);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'licenca', id, `Excluiu licença ${removed.numero}`, removed, null, usuarioNome);
    return removed;
  },

  // Cursos Catalogo
  getCursos: (): CursoCatalogo[] => loadDatabase().cursosCatalogo,
  saveCurso: async (curso: CursoCatalogo, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveCurso(curso, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.cursosCatalogo.findIndex((c) => c.id === curso.id);
    if (idx >= 0) {
      db.cursosCatalogo[idx] = curso;
    } else {
      db.cursosCatalogo.push(curso);
    }
    persistDatabase(db);
    recordAudit('EDITAR', 'curso_catalogo', curso.id, `Salva curso do catálogo ${curso.curso} (Validade: ${curso.validade_dias}d)`, null, curso, usuarioNome);
  },
  saveCursoCatalogo: async (curso: CursoCatalogo, usuarioNome = 'Admin'): Promise<void> => {
    await repository.saveCurso(curso, usuarioNome);
  },
  deleteCurso: async (id: string, usuarioNome = 'Admin'): Promise<CursoCatalogo | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await activeAdapter.deleteCurso(id, usuarioNome);
    }
    const db = loadDatabase();
    const idx = db.cursosCatalogo.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const removed = db.cursosCatalogo[idx];
    db.cursosCatalogo.splice(idx, 1);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'curso_catalogo', id, `Excluiu curso ${removed.curso}`, removed, null, usuarioNome);
    return removed;
  },

  // Treinamentos
  getTreinamentos: (): Treinamento[] => loadDatabase().treinamentos,
  getTreinamentosByPessoa: (pessoaId: string): Treinamento[] =>
    loadDatabase().treinamentos.filter((t) => t.pessoa_id === pessoaId),
  saveTreinamento: async (
    treinamento: Treinamento,
    motoresIds: string[] = [],
    usuarioNome = 'Admin'
  ): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveTreinamento(treinamento, motoresIds, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.treinamentos.findIndex((t) => t.id === treinamento.id);
    const now = new Date().toISOString();
    let acao: Auditoria['acao'] = 'CRIAR';
    let antes: any = null;

    if (idx >= 0) {
      acao = 'EDITAR';
      antes = { ...db.treinamentos[idx] };
      db.treinamentos[idx] = { ...treinamento, atualizado_em: now, atualizado_por: usuarioNome };
    } else {
      db.treinamentos.push({
        ...treinamento,
        criado_em: treinamento.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      });
    }

    db.treinamentosMotor = db.treinamentosMotor.filter((tm) => tm.treinamento_id !== treinamento.id);
    motoresIds.forEach((mId) => {
      db.treinamentosMotor.push({ treinamento_id: treinamento.id, motor_id: mId });
    });

    persistDatabase(db);
    recordAudit(
      acao,
      'treinamento',
      treinamento.id,
      `${acao === 'CRIAR' ? 'Lançou' : 'Atualizou'} treinamento (Data: ${treinamento.data_execucao})`,
      antes,
      treinamento,
      usuarioNome
    );
  },
  deleteTreinamento: async (id: string, usuarioNome = 'Admin'): Promise<Treinamento | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await activeAdapter.deleteTreinamento(id, usuarioNome);
    }
    const db = loadDatabase();
    const idx = db.treinamentos.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    const removed = db.treinamentos[idx];
    db.treinamentos.splice(idx, 1);
    db.treinamentosMotor = db.treinamentosMotor.filter((tm) => tm.treinamento_id !== id);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'treinamento', id, `Excluiu treinamento ${id}`, removed, null, usuarioNome);
    return removed;
  },
  renovarTreinamento: async (antigoId: string, novaData: string, usuarioNome = 'Admin'): Promise<Treinamento | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await activeAdapter.renovarTreinamento(antigoId, novaData, usuarioNome);
    }
    const db = loadDatabase();
    const antigo = db.treinamentos.find((t) => t.id === antigoId);
    if (!antigo) return null;

    const novoId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const novo: Treinamento = {
      ...antigo,
      id: novoId,
      data_execucao: novaData,
      substituido_por: null,
      criado_em: now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    antigo.substituido_por = novoId;
    antigo.atualizado_em = now;
    antigo.atualizado_por = usuarioNome;

    db.treinamentos.push(novo);

    const motoresAntigos = db.treinamentosMotor.filter((tm) => tm.treinamento_id === antigoId);
    motoresAntigos.forEach((tm) => {
      db.treinamentosMotor.push({ treinamento_id: novoId, motor_id: tm.motor_id });
    });

    persistDatabase(db);
    recordAudit(
      'RENOVAR',
      'treinamento',
      novoId,
      `Renovou treinamento ${antigo.curso_id} para ${novaData} (Substituiu ${antigoId})`,
      antigo,
      novo,
      usuarioNome
    );
    return novo;
  },

  // Motores
  getMotores: (): MotorCatalogo[] => loadDatabase().motoresCatalogo,
  saveMotor: async (motor: MotorCatalogo, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveMotor(motor, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.motoresCatalogo.findIndex((m) => m.id === motor.id);
    if (idx >= 0) {
      db.motoresCatalogo[idx] = motor;
    } else {
      db.motoresCatalogo.push(motor);
    }
    persistDatabase(db);
    recordAudit('EDITAR', 'motor_catalogo', motor.id, `Salva motor ${motor.fabricante} ${motor.modelo}`, null, motor, usuarioNome);
  },
  deleteMotor: async (id: string, usuarioNome = 'Admin'): Promise<MotorCatalogo | null> => {
    if (activeAdapter && activeAdapter.isCloud) {
      return await activeAdapter.deleteMotor(id, usuarioNome);
    }
    const db = loadDatabase();
    const idx = db.motoresCatalogo.findIndex((m) => m.id === id);
    if (idx < 0) return null;
    const removed = db.motoresCatalogo[idx];
    db.motoresCatalogo.splice(idx, 1);
    db.treinamentosMotor = db.treinamentosMotor.filter((tm) => tm.motor_id !== id);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'motor_catalogo', id, `Excluiu motor ${removed.fabricante} ${removed.modelo}`, removed, null, usuarioNome);
    return removed;
  },

  // Designacoes
  saveDesignacaoPessoa: async (dp: DesignacaoPessoa, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveDesignacaoPessoa(dp, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.designacoesPessoa.findIndex((d) => d.pessoa_id === dp.pessoa_id);
    if (idx >= 0) db.designacoesPessoa[idx] = dp;
    else db.designacoesPessoa.push(dp);
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_pessoa', dp.pessoa_id, `Atualizou designação pessoa ${dp.pessoa_id} (IMP: ${dp.imp})`, null, dp, usuarioNome);
  },
  setDesignacaoBases: async (pessoaId: string, bases: string[], usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.setDesignacaoBases(pessoaId, bases, usuarioNome);
      return;
    }
    const db = loadDatabase();
    db.designacoesBase = db.designacoesBase.filter((b) => b.pessoa_id !== pessoaId);
    bases.forEach((bId) => {
      db.designacoesBase.push({ pessoa_id: pessoaId, base_id: bId });
    });
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_base', pessoaId, `Atualizou bases designadas para ${pessoaId}: ${bases.join(', ')}`, null, bases, usuarioNome);
  },
  setDesignacaoBasesForPessoa: async (pessoaId: string, bases: string[], usuarioNome = 'Admin'): Promise<void> => {
    await repository.setDesignacaoBases(pessoaId, bases, usuarioNome);
  },
  setDesignacaoFuncao: async (
    pessoaId: string,
    funcao: FuncaoDesignacao,
    valor: SimNaoVazio,
    usuarioNome = 'Admin'
  ): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.setDesignacaoFuncao(pessoaId, funcao, valor, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.designacoesFuncao.findIndex((df) => df.pessoa_id === pessoaId && df.funcao === funcao);
    if (idx >= 0) db.designacoesFuncao[idx].valor = valor;
    else db.designacoesFuncao.push({ pessoa_id: pessoaId, funcao, valor });
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_funcao', `${pessoaId}-${funcao}`, `Função ${funcao} = ${valor} para ${pessoaId}`, null, { funcao, valor }, usuarioNome);
  },
  setDesignacaoAeronave: async (
    pessoaId: string,
    aeronave: AeronaveDesignacao,
    valor: SimNaoVazio,
    usuarioNome = 'Admin'
  ): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.setDesignacaoAeronave(pessoaId, aeronave, valor, usuarioNome);
      return;
    }
    const db = loadDatabase();
    const idx = db.designacoesAeronave.findIndex((da) => da.pessoa_id === pessoaId && da.aeronave === aeronave);
    if (idx >= 0) db.designacoesAeronave[idx].valor = valor;
    else db.designacoesAeronave.push({ pessoa_id: pessoaId, aeronave, valor });
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_aeronave', `${pessoaId}-${aeronave}`, `Aeronave ${aeronave} = ${valor} para ${pessoaId}`, null, { aeronave, valor }, usuarioNome);
  },

  // Configuracao
  saveConfiguracao: async (config: Configuracao, usuarioNome = 'Admin'): Promise<void> => {
    if (activeAdapter && activeAdapter.isCloud) {
      await activeAdapter.saveConfiguracao(config, usuarioNome);
      return;
    }
    const db = loadDatabase();
    db.configuracao = { ...config };
    persistDatabase(db);
    recordAudit('EDITAR', 'configuracao', 'GLOBAL', `Atualizou parâmetros operacionais do sistema`, null, config, usuarioNome);
  },
};

/**
 * Reconcilia dados canônicos diretamente no Firestore com confirmação real de persistência.
 */
export async function reconcileCanonicalFirestoreData(options: {
  orgId: string;
  persons?: any[];
  trainingRecords?: any[];
  courses?: any[];
  qualifications?: any[];
  userName?: string;
}): Promise<{
  persistedPersons: number;
  persistedCourses: number;
  persistedTrainings: number;
  persistedQualifications: number;
}> {
  if (options.orgId) {
    setOrganizationId(options.orgId);
  }

  const result = {
    persistedPersons: 0,
    persistedCourses: 0,
    persistedTrainings: 0,
    persistedQualifications: 0,
  };

  const userName = options.userName || 'Reconciliação Canônica';

  if (activeAdapter && activeAdapter.isCloud) {
    // 1. Sincroniza Pessoas se fornecidas
    if (options.persons && Array.isArray(options.persons)) {
      for (const p of options.persons) {
        if (p.id && p.nome) {
          const mappedPessoa: Pessoa = {
            id: p.id,
            nome: p.nome,
            categoria: (p.camposCustomizados?.categoria || (p.funcao || '').toLowerCase().includes('adm')) ? 'Administrativo' : 'Mecânico',
            situacao: p.status === 'INATIVO' || p.status === 'DESLIGADO' ? 'Inativo' : 'Ativo',
            base_principal_id: (p.baseOperacionalId || p.baseOperacional || 'REC').split(' - ')[0].trim().toUpperCase(),
            cliente_ou_area: p.camposCustomizados?.clienteOuArea || p.setor || p.cargoOperacional || '',
            canac: p.camposCustomizados?.canac || p.matricula || '',
            criado_em: p.createdAt || new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            atualizado_por: userName,
          };
          await activeAdapter.savePessoa(mappedPessoa, userName);
          result.persistedPersons++;
        }
      }
    }

    // 2. Sincroniza Catálogo de Cursos se fornecido
    if (options.courses && Array.isArray(options.courses)) {
      for (const c of options.courses) {
        if (c.id && (c.titulo || c.curso)) {
          const isFrota = c.frotaOuFamilia && c.frotaOuFamilia !== 'Geral' && c.frotaOuFamilia !== 'Doutrinação';
          const validadeDias = c.validade_dias || (c.periodicidadeMeses ? c.periodicidadeMeses * 30 : 730);
          const mappedCurso: CursoCatalogo = {
            id: c.id,
            grupo: isFrota ? 'Frota' : 'Doutrinação',
            frota: c.frotaOuFamilia || c.frota || '',
            variante: Array.isArray(c.variantesAplicabilidade) ? c.variantesAplicabilidade.join(', ') : (c.variante || ''),
            curso: c.titulo || c.curso,
            validade_dias: validadeDias,
            ativo: c.status !== 'INATIVO',
          };
          await activeAdapter.saveCurso(mappedCurso, userName);
          result.persistedCourses++;
        }
      }
    }

    // 3. Sincroniza Registros de Treinamento se fornecidos
    if (options.trainingRecords && Array.isArray(options.trainingRecords)) {
      for (const tr of options.trainingRecords) {
        if (tr.id && (tr.colaboradorId || tr.pessoa_id)) {
          const mappedTrn: Treinamento = {
            id: tr.id,
            pessoa_id: tr.colaboradorId || tr.pessoa_id,
            curso_id: tr.treinamentoId || tr.curso_id || '',
            data_execucao: tr.dataRealizacao || tr.dataConclusao || tr.data_execucao || new Date().toISOString().split('T')[0],
            observacao: tr.observacoes || tr.observacao || '',
            substituido_por: tr.substituidoPor || tr.substituido_por || null,
            criado_em: tr.createdAt || tr.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            atualizado_por: tr.instrutor || userName,
          };
          await activeAdapter.saveTreinamento(mappedTrn, [], userName);
          result.persistedTrainings++;
        }
      }
    }

    // 4. Sincroniza Qualificações e Licenças se fornecidas
    if (options.qualifications && Array.isArray(options.qualifications)) {
      for (const q of options.qualifications) {
        if (q.id && (q.colaboradorId || q.pessoa_id)) {
          const emissorUpper = (q.emissor || q.orgao || 'ANAC').toUpperCase();
          const orgao = emissorUpper.includes('FAA') ? 'FAA' : 'ANAC';
          let tipo: any = 'CHT';
          const textAll = `${q.titulo || ''} ${q.escopo || ''} ${q.tipo || ''}`.toUpperCase();
          if (textAll.includes('CCT')) tipo = 'CCT';
          else if (textAll.includes('AMP')) tipo = 'AMP';

          const mappedLic: Licenca = {
            id: q.id,
            pessoa_id: q.colaboradorId || q.pessoa_id,
            orgao,
            tipo,
            habilitacao: q.habilitacao || '',
            numero: q.numeroRegistro || q.numero || '',
            data_vencimento: q.dataValidade || q.data_vencimento || null,
            data_expedicao: q.dataEmissao || q.data_expedicao || null,
            criado_em: q.createdAt || q.criado_em || new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            atualizado_por: q.responsavelValidacaoNome || userName,
          };
          await activeAdapter.saveLicenca(mappedLic, userName);
          result.persistedQualifications++;
        }
      }
    }
  }

  return result;
}

export function syncWithQualigest(options: {
  orgId?: string;
  persons?: any[];
  trainingRecords?: any[];
  userProfile?: any;
}): void {
  if (options.orgId) {
    setOrganizationId(options.orgId);
  }
  // Se o adaptador de nuvem estiver ativo, os listeners em tempo real do Firestore já
  // mantêm a fonte de verdade sincronizada diretamente das coleções canônicas organizations/{orgId}/*
  if (activeAdapter && activeAdapter.isCloud) {
    return;
  }
}
