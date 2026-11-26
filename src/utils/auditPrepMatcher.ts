import type {
  AuditoriaPreparacao,
  EvidenciaVinculadaPrep,
  ItemAuditoriaPreparacao,
  SituacaoItemAuditoriaPrep,
} from '../types/auditPrep.ts';
import { isItemRespondidoPrep } from '../types/auditPrep.ts';
import type { RequisitoAuditoriaExterna } from '../types/auditRequirements.ts';

export type MatchConfidenceType = 'EXATA' | 'EQUIVALENTE' | 'SEMANTICA_IA';

export interface PreviousItemCandidate {
  key: string;
  auditId: string;
  auditNome: string;
  entidade: string;
  dataAuditoria: string;
  itemNumero: string;
  pergunta: string;
  referenciaNormativa: string;
  resposta: string;
  situacao: SituacaoItemAuditoriaPrep;
  validadoQualidade: boolean;
  evidencias: EvidenciaVinculadaPrep[];
  origem: 'CENTRAL_AUDITORIAS' | 'HISTORICO_SGQ';
}

export interface QuestionMatchResult {
  candidate: PreviousItemCandidate;
  score: number; // 0..100
  matchType: MatchConfidenceType;
  reason: string;
}

const STOPWORDS = new Set([
  // Português
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre', 'ate', 'ante',
  'que', 'qual', 'quais', 'como', 'onde', 'quando', 'se', 'e', 'ou',
  'ao', 'aos', 'aonde', 'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa',
  'existe', 'existem', 'possui', 'possuem', 'mantem', 'mante', 'ha', 'tem', 'têm',
  'esta', 'estao', 'sao', 'foi', 'foram', 'ser', 'estar', 'fazer', 'realiza', 'realizam',
  'todo', 'toda', 'todos', 'todas', 'cada', 'mesmo', 'mesma', 'forma', 'maneira', 'meio',
  'organizacao', 'empresa', 'oficina', 'om', 'impacto', 'item', 'requisito', 'pergunta',
  // Inglês
  'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'does', 'do', 'did', 'has', 'have', 'had', 'can', 'could', 'must', 'shall', 'should', 'will', 'would',
  'of', 'in', 'on', 'for', 'to', 'and', 'or', 'with', 'without', 'by', 'from', 'at', 'an', 'as', 'into', 'per',
  'if', 'whether', 'all', 'any', 'each', 'every', 'there', 'how', 'what', 'which', 'when', 'where', 'who',
  'ensure', 'ensures', 'ensuring', 'maintain', 'maintains', 'maintained', 'establish', 'established',
  'organization', 'company', 'facility', 'station', 'repair', 'shop', 'mro', 'aviation', 'aircraft',
  // Espanhol
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al', 'en', 'con', 'sin', 'por', 'para',
  'sobre', 'entre', 'que', 'cual', 'cuales', 'como', 'donde', 'cuando', 'si', 'y', 'o',
  'existe', 'existen', 'posee', 'mantiene', 'esta', 'estan', 'son', 'tiene', 'tienen',
  'organizacion', 'empresa', 'taller', 'todo', 'toda', 'todos', 'todas',
]);

// Dicionário multilíngue aeronáutico / SGQ (PT / EN / ES) -> conceito canônico
const CANONICAL_SYNONYMS: Record<string, string> = {
  // Metrologia e calibração
  calibracao: 'calibracao',
  calibracoes: 'calibracao',
  calibrado: 'calibracao',
  calibrada: 'calibracao',
  calibrados: 'calibracao',
  calibradas: 'calibracao',
  calibrar: 'calibracao',
  afericao: 'calibracao',
  aferido: 'calibracao',
  metrologia: 'calibracao',
  metrologico: 'calibracao',
  metrologica: 'calibracao',
  calibration: 'calibracao',
  calibrations: 'calibracao',
  calibrated: 'calibracao',
  calibrate: 'calibracao',
  calibracion: 'calibracao',
  calibrado_es: 'calibracao',
  measuring: 'medicao',
  measure: 'medicao',
  measurement: 'medicao',
  medicao: 'medicao',
  medicion: 'medicao',
  precision: 'medicao',
  precisao: 'medicao',
  test: 'ensaio_teste',
  testing: 'ensaio_teste',
  rbc: 'rastreavel_padrao',
  inmetro: 'rastreavel_padrao',
  nist: 'rastreavel_padrao',
  national: 'rastreavel_padrao',
  nacionais: 'rastreavel_padrao',
  standards: 'rastreavel_padrao',
  padrao: 'rastreavel_padrao',
  padroes: 'rastreavel_padrao',
  rastreavel: 'rastreavel',
  rastreaveis: 'rastreavel',
  rastreabilidade: 'rastreavel',
  traceable: 'rastreavel',
  traceability: 'rastreavel',
  trazabilidad: 'rastreavel',
  trazable: 'rastreavel',

  // Ferramentas e equipamentos
  ferramenta: 'ferramenta',
  ferramentas: 'ferramenta',
  ferramental: 'ferramenta',
  instrumento: 'ferramenta',
  instrumentos: 'ferramenta',
  equipamento: 'ferramenta',
  equipamentos: 'ferramenta',
  dispositivo: 'ferramenta',
  dispositivos: 'ferramenta',
  torquimetro: 'ferramenta',
  torquimetros: 'ferramenta',
  tool: 'ferramenta',
  tools: 'ferramenta',
  tooling: 'ferramenta',
  equipment: 'ferramenta',
  device: 'ferramenta',
  devices: 'ferramenta',
  gauge: 'ferramenta',
  gauges: 'ferramenta',
  gage: 'ferramenta',
  gages: 'ferramenta',
  torque: 'ferramenta',
  wrench: 'ferramenta',
  wrenches: 'ferramenta',
  herramienta: 'ferramenta',
  herramientas: 'ferramenta',
  equipo: 'ferramenta',
  equipos: 'ferramenta',
  shadow: 'controle_ferramenta',
  board: 'controle_ferramenta',
  crib: 'controle_ferramenta',
  ferramentaria: 'controle_ferramenta',

  // Treinamento e competências
  treinamento: 'treinamento',
  treinamentos: 'treinamento',
  capacitacao: 'treinamento',
  curso: 'treinamento',
  cursos: 'treinamento',
  reciclagem: 'treinamento',
  recorrente: 'recorrente',
  periodico: 'recorrente',
  periodica: 'recorrente',
  inicial: 'inicial',
  initial: 'inicial',
  training: 'treinamento',
  train: 'treinamento',
  trained: 'treinamento',
  recurrent: 'recorrente',
  refresher: 'recorrente',
  capacitacion: 'treinamento',
  entrenamiento: 'treinamento',
  ojt: 'treinamento',
  ewis: 'ewis',
  fts: 'fts',
  fuel: 'fts',
  tank: 'fts',
  combustivel: 'fts',
  tanque: 'fts',
  hf: 'fatores_humanos',
  human: 'fatores_humanos',
  factors: 'fatores_humanos',
  fatores: 'fatores_humanos',
  humanos: 'fatores_humanos',
  hazmat: 'artigos_perigosos',
  dangerous: 'artigos_perigosos',
  goods: 'artigos_perigosos',
  perigosos: 'artigos_perigosos',
  artigos: 'artigos_perigosos',
  dgr: 'artigos_perigosos',
  mercancias: 'artigos_perigosos',
  peligrosas: 'artigos_perigosos',

  // Qualificações / CHT / Licenças / Carimbo / Designação
  qualificacao: 'qualificacao',
  qualificacoes: 'qualificacao',
  qualificado: 'qualificacao',
  qualificada: 'qualificacao',
  qualificados: 'qualificacao',
  qualificadas: 'qualificacao',
  habilitacao: 'qualificacao',
  habilitacoes: 'qualificacao',
  habilitado: 'qualificacao',
  habilitada: 'qualificacao',
  habilitados: 'qualificacao',
  cht: 'qualificacao',
  licenca: 'qualificacao',
  licencas: 'qualificacao',
  autorizacao: 'qualificacao',
  autorizacoes: 'qualificacao',
  autorizado: 'qualificacao',
  autorizados: 'qualificacao',
  designacao: 'qualificacao',
  designado: 'qualificacao',
  designados: 'qualificacao',
  competencia: 'qualificacao',
  competencias: 'qualificacao',
  qualification: 'qualificacao',
  qualifications: 'qualificacao',
  qualified: 'qualificacao',
  license: 'qualificacao',
  licenses: 'qualificacao',
  licensed: 'qualificacao',
  authorization: 'qualificacao',
  authorizations: 'qualificacao',
  authorized: 'qualificacao',
  competency: 'qualificacao',
  competence: 'qualificacao',
  certifying: 'certificador',
  certificador: 'certificador',
  certificadores: 'certificador',
  stamp: 'carimbo',
  stamps: 'carimbo',
  carimbo: 'carimbo',
  carimbos: 'carimbo',
  sello: 'carimbo',
  sellos: 'carimbo',
  roster: 'listagem_pessoal',
  listagem: 'listagem_pessoal',
  relacao: 'listagem_pessoal',
  signature: 'assinatura',
  assinatura: 'assinatura',
  firma: 'assinatura',

  // Pessoas / Mecânicos
  mecanico: 'pessoal',
  mecanicos: 'pessoal',
  tecnico: 'pessoal',
  tecnicos: 'pessoal',
  colaborador: 'pessoal',
  colaboradores: 'pessoal',
  pessoal: 'pessoal',
  funcionario: 'pessoal',
  funcionarios: 'pessoal',
  inspetor: 'pessoal',
  inspetores: 'pessoal',
  personnel: 'pessoal',
  staff: 'pessoal',
  employee: 'pessoal',
  employees: 'pessoal',
  mechanic: 'pessoal',
  mechanics: 'pessoal',
  technician: 'pessoal',
  technicians: 'pessoal',
  inspector: 'pessoal',
  inspectors: 'pessoal',
  personal: 'pessoal',
  mecanico_es: 'pessoal',

  // Manuais e procedimentos
  manual: 'procedimento',
  manuais: 'procedimento',
  manuals: 'procedimento',
  momq: 'procedimento',
  moe: 'procedimento',
  mgq: 'procedimento',
  qcm: 'procedimento',
  gmm: 'procedimento',
  ipm: 'procedimento',
  rsm: 'procedimento',
  ptm: 'procedimento',
  procedimento: 'procedimento',
  procedimentos: 'procedimento',
  pop: 'procedimento',
  instrucao: 'procedimento',
  instrucoes: 'procedimento',
  procedure: 'procedimento',
  procedures: 'procedimento',
  procedimiento: 'procedimento',
  procedimientos: 'procedimento',
  policy: 'politica',
  policies: 'politica',
  politica: 'politica',
  politicas: 'politica',
  acessivel: 'acessivel',
  acessiveis: 'acessivel',
  accessible: 'acessivel',
  available: 'acessivel',
  disponivel: 'acessivel',
  disponiveis: 'acessivel',

  // Publicações técnicas e diretrizes
  publicacao: 'publicacao',
  publicacoes: 'publicacao',
  publication: 'publicacao',
  publications: 'publicacao',
  publicacion: 'publicacao',
  publicaciones: 'publicacao',
  technical: 'tecnico_dados',
  tecnica: 'tecnico_dados',
  tecnicas: 'tecnico_dados',
  data: 'tecnico_dados',
  dados: 'tecnico_dados',
  documentacao: 'publicacao',
  documentation: 'publicacao',
  document: 'documento',
  documents: 'documento',
  documento: 'documento',
  documentos: 'documento',
  boletim: 'boletim_servico',
  boletins: 'boletim_servico',
  bulletin: 'boletim_servico',
  bulletins: 'boletim_servico',
  sb: 'boletim_servico',
  sbs: 'boletim_servico',
  diretriz: 'diretriz_aeronavegabilidade',
  diretrizes: 'diretriz_aeronavegabilidade',
  airworthiness: 'diretriz_aeronavegabilidade',
  directive: 'diretriz_aeronavegabilidade',
  directives: 'diretriz_aeronavegabilidade',
  da: 'diretriz_aeronavegabilidade',
  das: 'diretriz_aeronavegabilidade',
  ad: 'diretriz_aeronavegabilidade',
  ads: 'diretriz_aeronavegabilidade',
  cmm: 'publicacao',
  amm: 'publicacao',
  ipc: 'publicacao',
  srm: 'publicacao',
  oem: 'fabricante',
  manufacturer: 'fabricante',
  fabricante: 'fabricante',

  // Peças, materiais, recebimento, vida útil, liberação e SUP
  peca: 'peca_material',
  pecas: 'peca_material',
  componente: 'peca_material',
  componentes: 'peca_material',
  material: 'peca_material',
  materiais: 'peca_material',
  consumivel: 'peca_material',
  consumiveis: 'peca_material',
  estoque: 'almoxarifado',
  almoxarifado: 'almoxarifado',
  part: 'peca_material',
  parts: 'peca_material',
  component: 'peca_material',
  components: 'peca_material',
  materials: 'peca_material',
  consumable: 'peca_material',
  consumables: 'peca_material',
  hardware: 'peca_material',
  stock: 'almoxarifado',
  stores: 'almoxarifado',
  warehouse: 'almoxarifado',
  almacen: 'almoxarifado',
  repuestos: 'peca_material',
  recebimento: 'recebimento',
  receiving: 'recebimento',
  incoming: 'recebimento',
  recepcion: 'recebimento',
  inspecao: 'inspecao',
  inspecoes: 'inspecao',
  inspection: 'inspecao',
  inspections: 'inspecao',
  inspeccion: 'inspecao',
  vida: 'vida_util',
  util: 'vida_util',
  perecivel: 'vida_util',
  pereciveis: 'vida_util',
  shelf: 'vida_util',
  life: 'vida_util',
  perishable: 'vida_util',
  expiration: 'vida_util',
  expiry: 'vida_util',
  caducidad: 'vida_util',
  etiqueta: 'liberacao_etiqueta',
  etiquetas: 'liberacao_etiqueta',
  tag: 'liberacao_etiqueta',
  tags: 'liberacao_etiqueta',
  serviceable: 'liberacao_etiqueta',
  unserviceable: 'inservivel',
  inservivel: 'inservivel',
  servivel: 'liberacao_etiqueta',
  release: 'liberacao_etiqueta',
  liberacao: 'liberacao_etiqueta',
  crs: 'liberacao_etiqueta',
  retorno: 'liberacao_etiqueta',
  return: 'liberacao_etiqueta',
  8130: 'liberacao_etiqueta',
  segvoo: 'liberacao_etiqueta',
  sevo: 'liberacao_etiqueta',
  suspected: 'sup_nao_aprovada',
  unapproved: 'sup_nao_aprovada',
  sup: 'sup_nao_aprovada',
  suspeita: 'sup_nao_aprovada',
  counterfeit: 'sup_nao_aprovada',
  falsificada: 'sup_nao_aprovada',

  // Registros, ordens de serviço, retenção e arquivo
  registro: 'registro',
  registros: 'registro',
  ficha: 'registro',
  fichas: 'registro',
  ordem: 'ordem_servico',
  ordens: 'ordem_servico',
  servico: 'ordem_servico',
  work: 'ordem_servico',
  order: 'ordem_servico',
  orders: 'ordem_servico',
  task: 'ordem_servico',
  card: 'ordem_servico',
  cards: 'ordem_servico',
  wo: 'ordem_servico',
  logbook: 'registro',
  certificado: 'certificado',
  certificados: 'certificado',
  certificate: 'certificado',
  certificates: 'certificado',
  evidencia: 'registro',
  evidencias: 'registro',
  evidence: 'registro',
  comprovacao: 'registro',
  arquivo: 'arquivamento',
  arquivamento: 'arquivamento',
  arquivado: 'arquivamento',
  arquivadas: 'arquivamento',
  archive: 'arquivamento',
  archived: 'arquivamento',
  retention: 'arquivamento',
  retencao: 'arquivamento',
  retencion: 'arquivamento',
  backup: 'arquivamento',
  record: 'registro',
  records: 'registro',
  registro_es: 'registro',

  // Auditoria, RNC, Ação Corretiva e SGSO/SMS
  auditoria: 'auditoria',
  auditorias: 'auditoria',
  audit: 'auditoria',
  audits: 'auditoria',
  interna: 'interno',
  internas: 'interno',
  interno: 'interno',
  internal: 'interno',
  self: 'interno',
  qualidade: 'qualidade',
  quality: 'qualidade',
  calidad: 'qualidade',
  sgso: 'sgso',
  sms: 'sgso',
  safety: 'seguranca',
  seguranca: 'seguranca',
  seguridad: 'seguranca',
  conformidade: 'rnc',
  conformidades: 'rnc',
  nonconformity: 'rnc',
  nonconformities: 'rnc',
  rnc: 'rnc',
  discrepancia: 'rnc',
  discrepancias: 'rnc',
  discrepancy: 'rnc',
  discrepancies: 'rnc',
  achado: 'rnc',
  achados: 'rnc',
  finding: 'rnc',
  findings: 'rnc',
  corretiva: 'acao_corretiva',
  corretivas: 'acao_corretiva',
  corrective: 'acao_corretiva',
  preventiva: 'acao_corretiva',
  preventive: 'acao_corretiva',
  capa: 'acao_corretiva',
  root: 'causa_raiz',
  cause: 'causa_raiz',
  causa: 'causa_raiz',
  raiz: 'causa_raiz',

  // Validade / Vigência / Revisão / Vencimento
  atualizado: 'vigente',
  atualizada: 'vigente',
  atualizados: 'vigente',
  atualizadas: 'vigente',
  vigente: 'vigente',
  vigentes: 'vigente',
  valido: 'vigente',
  valida: 'vigente',
  validos: 'vigente',
  validas: 'vigente',
  validade: 'vigente',
  revisao: 'revisao',
  revisado: 'revisao',
  revisada: 'revisao',
  revision: 'revisao',
  revised: 'revisao',
  current: 'vigente',
  valid: 'vigente',
  up: 'vigente',
  date: 'vigente',
  vigencia: 'vigente',
  vencido: 'vencido',
  vencida: 'vencido',
  vencidos: 'vencido',
  vencidas: 'vencido',
  expired: 'vencido',
  overdue: 'vencido',
  outdated: 'vencido',
  caducado: 'vencido',

  // Controle / Gestão
  controle: 'controle',
  controlado: 'controle',
  controlada: 'controle',
  controlados: 'controle',
  controladas: 'controle',
  monitoramento: 'controle',
  gestao: 'controle',
  gerenciamento: 'controle',
  control: 'controle',
  controlled: 'controle',
  controls: 'controle',
  monitoring: 'controle',
  management: 'controle',
  gestion: 'controle',

  // Fornecedor / Subcontratado
  subcontratado: 'fornecedor',
  subcontratados: 'fornecedor',
  subcontratada: 'fornecedor',
  terceirizado: 'fornecedor',
  terceirizados: 'fornecedor',
  fornecedor: 'fornecedor',
  fornecedores: 'fornecedor',
  supplier: 'fornecedor',
  suppliers: 'fornecedor',
  vendor: 'fornecedor',
  vendors: 'fornecedor',
  subcontractor: 'fornecedor',
  subcontractors: 'fornecedor',
  subcontracted: 'fornecedor',
  approved: 'aprovado',
  aprovado: 'aprovado',
  aprovados: 'aprovado',
  aprobado: 'aprovado',
  proveedor: 'fornecedor',
  proveedores: 'fornecedor',

  // Segregação / Identificação
  segregado: 'segregacao',
  segregados: 'segregacao',
  segregada: 'segregacao',
  segregacao: 'segregacao',
  segregated: 'segregacao',
  segregation: 'segregacao',
  quarentena: 'segregacao',
  quarantine: 'segregacao',
  cuarentena: 'segregacao',
  lacrado: 'segregacao',
  locked: 'segregacao',
  identificado: 'identificacao',
  identificados: 'identificacao',
  identificacao: 'identificacao',
  identified: 'identificacao',
  identification: 'identificacao',
  rejected: 'segregacao',
  rejeitado: 'segregacao',

  // Instalações / Hangar / Segurança / FOD / ESD / Meio Ambiente
  hangar: 'instalacao',
  instalacao: 'instalacao',
  instalacoes: 'instalacao',
  bancada: 'instalacao',
  area: 'instalacao',
  areas: 'instalacao',
  facilities: 'instalacao',
  housing: 'instalacao',
  limpeza: 'limpeza',
  cleanliness: 'limpeza',
  housekeeping: 'limpeza',
  lighting: 'iluminacao',
  iluminacao: 'iluminacao',
  ventilation: 'ventilacao',
  ventilacao: 'ventilacao',
  temperature: 'ambiente_clima',
  temperatura: 'ambiente_clima',
  humidity: 'ambiente_clima',
  umidade: 'ambiente_clima',
  environmental: 'ambiente_clima',
  fod: 'fod',
  foreign: 'fod',
  object: 'fod',
  fire: 'incendio',
  fogo: 'incendio',
  incendio: 'incendio',
  extinguisher: 'incendio',
  extinguishers: 'incendio',
  extintor: 'incendio',
  extintores: 'incendio',
  ppe: 'epi',
  epi: 'epi',
  epis: 'epi',
  esd: 'esd',
  electrostatic: 'esd',
  eletrostatica: 'esd',

  // Capacidade, Drogas & Álcool, Processos Especiais
  capacidade: 'capacidade',
  capability: 'capacidade',
  capabilities: 'capacidade',
  rating: 'capacidade',
  ratings: 'capacidade',
  opspecs: 'capacidade',
  escopo: 'capacidade',
  scope: 'capacidade',
  drug: 'drogas_alcool',
  alcohol: 'drogas_alcool',
  drogas: 'drogas_alcool',
  alcool: 'drogas_alcool',
  psicoativas: 'drogas_alcool',
  toxicologico: 'drogas_alcool',
  ndt: 'end_ndt',
  nondestructive: 'end_ndt',
  destrutivos: 'end_ndt',
  welding: 'soldagem',
  solda: 'soldagem',
  soldagem: 'soldagem',
  battery: 'bateria',
  batteries: 'bateria',
  bateria: 'bateria',
  baterias: 'bateria',
  oxygen: 'oxigenio',
  oxigenio: 'oxigenio',
};

function normalizeStem(token: string): string {
  if (CANONICAL_SYNONYMS[token]) return token;
  // Plurais / flexões simples PT/EN/ES quando não mapeados diretamente
  if (token.length > 5 && token.endsWith('oes')) return `${token.slice(0, -3)}ao`;
  if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('es') && !token.endsWith('ses')) {
    const candidate = token.slice(0, -2);
    if (CANONICAL_SYNONYMS[candidate]) return candidate;
  }
  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) {
    const candidate = token.slice(0, -1);
    if (CANONICAL_SYNONYMS[candidate]) return candidate;
  }
  return token;
}

export function normalizeQuestionText(text: string): string {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(?:item|req(?:uisito)?|pergunta|question|q)?\s*\d+(?:[.\-/]\d+)*[a-z]?\s*[-.):]?\s*/i, '')
    .replace(/[^a-z0-9./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeQuestionTokens(text: string): string[] {
  const norm = normalizeQuestionText(text);
  const rawTokens = norm
    .replace(/[./]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  const canonicalSet = new Set<string>();
  for (const tk of rawTokens) {
    const stemmed = normalizeStem(tk);
    const mapped = CANONICAL_SYNONYMS[stemmed] || CANONICAL_SYNONYMS[tk] || stemmed;
    if (!STOPWORDS.has(mapped)) {
      canonicalSet.add(mapped);
    }
  }
  return Array.from(canonicalSet);
}

function getBigrams(str: string): Set<string> {
  const clean = str.replace(/\s+/g, ' ').trim();
  const bigrams = new Set<string>();
  if (clean.length < 2) return bigrams;
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.add(clean.slice(i, i + 2));
  }
  return bigrams;
}

function computeCharDice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ba = getBigrams(a);
  const bb = getBigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;
  let inter = 0;
  ba.forEach((bg) => {
    if (bb.has(bg)) inter++;
  });
  return (2 * inter) / (ba.size + bb.size);
}

function extractNormCodes(ref?: string): string[] {
  if (!ref) return [];
  const matches = ref
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/\d{2,3}\.\d+[a-z0-9()-]*/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function mapLegacyStatusToSituacao(status?: string): SituacaoItemAuditoriaPrep {
  const s = String(status || '').toUpperCase();
  if (s === 'CONFORME' || s === 'ATENDIDO' || s === 'APROVADO') return 'ATENDIDO';
  if (s === 'PARCIALMENTE_ATENDIDO') return 'PARCIALMENTE_ATENDIDO';
  if (s === 'NAO_CONFORME' || s === 'NAO_ATENDIDO' || s === 'REPROVADO') return 'NAO_ATENDIDO';
  if (s === 'NAO_APLICAVEL') return 'NAO_APLICAVEL';
  return 'PENDENTE_DE_AVALIACAO';
}

export function buildPreviousItemCandidates(
  audits: AuditoriaPreparacao[],
  allItems: ItemAuditoriaPreparacao[],
  historicalRequirements: RequisitoAuditoriaExterna[] = [],
  excludeAuditId?: string
): PreviousItemCandidate[] {
  const auditMap = new Map<string, AuditoriaPreparacao>();
  audits.forEach((a) => auditMap.set(a.id, a));

  const results: PreviousItemCandidate[] = [];

  allItems.forEach((it) => {
    if (excludeAuditId && it.auditId === excludeAuditId) return;
    if (!isItemRespondidoPrep(it)) return;
    const a = auditMap.get(it.auditId);
    results.push({
      key: `PREP-${it.id}`,
      auditId: it.auditId,
      auditNome: a?.nome || 'Auditoria Anterior',
      entidade: a?.entidade || 'Entidade não informada',
      dataAuditoria: a?.dataAuditoria || (it.updatedAt ? it.updatedAt.slice(0, 10) : ''),
      itemNumero: it.numeroItem,
      pergunta: it.perguntaOriginal,
      referenciaNormativa: it.referenciaNormativa || '',
      resposta: it.respostaImpacto || '',
      situacao: it.situacao,
      validadoQualidade: Boolean(it.validadoQualidade),
      evidencias: it.evidencias || [],
      origem: 'CENTRAL_AUDITORIAS',
    });
  });

  historicalRequirements.forEach((req) => {
    const resp = (req.respostaOficialEnviada || req.justificativaDecisao || '').trim();
    const sit = mapLegacyStatusToSituacao(req.situacaoAtendimento);
    if (!resp && sit === 'PENDENTE_DE_AVALIACAO') return;
    results.push({
      key: `HIST-${req.id}`,
      auditId: req.auditId || req.id,
      auditNome: req.numeroAuditoria || 'Acervo Histórico SGQ',
      entidade: req.clienteOuEntidade || 'Histórico SGQ',
      dataAuditoria: req.dataAuditoria || (req.updatedAt ? req.updatedAt.slice(0, 10) : ''),
      itemNumero: req.numeroItem || '-',
      pergunta: req.textoOriginal || req.tituloCurto || '',
      referenciaNormativa: req.referenciaNormativa || '',
      resposta: resp,
      situacao: sit,
      validadoQualidade: req.situacaoAtendimento === 'ATENDIDO',
      evidencias: [],
      origem: 'HISTORICO_SGQ',
    });
  });

  // Prioriza itens da Central, validados pela Qualidade, com resposta textual e mais recentes
  results.sort((a, b) => {
    if (a.origem !== b.origem) return a.origem === 'CENTRAL_AUDITORIAS' ? -1 : 1;
    if (a.validadoQualidade !== b.validadoQualidade) return a.validadoQualidade ? -1 : 1;
    const aHasText = a.resposta.trim().length > 0 ? 1 : 0;
    const bHasText = b.resposta.trim().length > 0 ? 1 : 0;
    if (aHasText !== bHasText) return bHasText - aHasText;
    return (b.dataAuditoria || '').localeCompare(a.dataAuditoria || '');
  });

  return results;
}

export function findBestQuestionMatch(
  query: { perguntaOriginal: string; referenciaNormativa?: string },
  candidates: PreviousItemCandidate[]
): QuestionMatchResult | null {
  const qNorm = normalizeQuestionText(query.perguntaOriginal);
  if (qNorm.length < 6) return null;

  const qTokens = canonicalizeQuestionTokens(query.perguntaOriginal);
  const qSet = new Set(qTokens);
  const qRefCodes = extractNormCodes(query.referenciaNormativa);

  let best: QuestionMatchResult | null = null;

  for (const cand of candidates) {
    const cNorm = normalizeQuestionText(cand.pergunta);
    if (cNorm.length < 6) continue;

    if (qNorm === cNorm) {
      const exactResult: QuestionMatchResult = {
        candidate: cand,
        score: 100,
        matchType: 'EXATA',
        reason: 'Pergunta idêntica encontrada em outra auditoria',
      };
      if (
        !best ||
        best.score < 100 ||
        (!best.candidate.validadoQualidade && cand.validadoQualidade) ||
        (best.candidate.origem === 'HISTORICO_SGQ' && cand.origem === 'CENTRAL_AUDITORIAS') ||
        (!best.candidate.resposta && cand.resposta)
      ) {
        best = exactResult;
      }
      continue;
    }

    const cTokens = canonicalizeQuestionTokens(cand.pergunta);
    const cSet = new Set(cTokens);

    let sharedCount = 0;
    qSet.forEach((tk) => {
      if (cSet.has(tk)) sharedCount++;
    });

    const unionSize = qSet.size + cSet.size - sharedCount;
    const jaccard = unionSize > 0 ? sharedCount / unionSize : 0;
    const minSize = Math.min(qSet.size, cSet.size);
    const overlap = minSize > 0 ? sharedCount / minSize : 0;
    const charDice = computeCharDice(qNorm, cNorm);

    const cRefCodes = extractNormCodes(cand.referenciaNormativa);
    const sharesNormCode =
      qRefCodes.length > 0 && qRefCodes.some((code) => cRefCodes.includes(code));

    // Evita falsos positivos por coincidência isolada de 1 palavra genérica
    if (sharedCount < 2 && charDice < 0.72 && !(sharesNormCode && sharedCount >= 1 && overlap >= 0.4)) {
      continue;
    }

    const blendedSim = 0.4 * overlap + 0.36 * jaccard + 0.24 * charDice;
    // Em comparação multilíngue (ex.: EN vs PT), os bigramas de caracteres são baixos mesmo quando os conceitos batem
    const conceptSim = sharedCount >= 2 ? 0.56 * overlap + 0.44 * jaccard : 0;
    let sim = Math.max(blendedSim, 0.92 * conceptSim);
    if (sharesNormCode) sim += 0.12;
    const score = Math.min(99, Math.round(sim * 100));

    if (score < 58) continue;

    const reason =
      score >= 85
        ? 'Redação / exigência praticamente idêntica'
        : sharesNormCode
        ? 'Pergunta equivalente e mesma referência normativa'
        : conceptSim > blendedSim + 0.08
        ? 'Equivalência técnica identificada entre idiomas'
        : 'Pergunta equivalente por palavras-chave técnicas';

    const tieBreakerScore =
      score +
      (cand.origem === 'CENTRAL_AUDITORIAS' ? 0.4 : 0) +
      (cand.validadoQualidade ? 0.3 : 0) +
      (cand.resposta.trim() ? 0.2 : 0);

    const currentBestTie = best
      ? best.score +
        (best.candidate.origem === 'CENTRAL_AUDITORIAS' ? 0.4 : 0) +
        (best.candidate.validadoQualidade ? 0.3 : 0) +
        (best.candidate.resposta.trim() ? 0.2 : 0)
      : -1;

    if (tieBreakerScore > currentBestTie) {
      best = {
        candidate: cand,
        score,
        matchType: 'EQUIVALENTE',
        reason,
      };
    }
  }

  return best;
}
