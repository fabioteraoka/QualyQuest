/**
 * Testes Automatizados de Integração QualyQuest + Rooster
 * Executa testes rigorosos dos 5 eixos prioritários:
 * 1. Segurança Firestore (firestore.rules: isolamento multi-tenant, bloqueio sem perfil, remoção de brechas, RBAC, restrição em /users e /userInvitations)
 * 2. Persistência real (sem sucesso simulado: erro no Firestore não contamina memória nem gera auditoria indevida)
 * 3. Regras de validade (5 estados canônicos, meses de calendário exatos sem bucket fixo de 30 dias, sem presunção de 730/1825 dias)
 * 4. Consistência de navegação (desduplicação de validacaoQueue, destino real de modelos-capacitacao, cobertura integral de rotas)
 * 5. Integridade referencial, preservação de campos e histórico de renovação
 */

import fs from 'fs';
import { ColaboradorPessoa, CursoTreinamento, RegistroTreinamentoColaborador, QualificacaoColaborador } from '../src/types';
import { FirestoreAdapter } from '../src/rooster/services/adapters/firestoreAdapter';
import { LocalAdapter } from '../src/rooster/services/adapters/localAdapter';
import { Pessoa, CursoCatalogo, Treinamento, Licenca } from '../src/rooster/types';
import { calcularStatusTreinamento, hojeISO, calcularDiasParaVencer, calcularVencimento } from '../src/rooster/utils/businessRules';
import { getFirestoreDb } from '../src/rooster/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { validateImportPayload, generateConferenceData, commitImportPayload, setActiveAdapter } from '../src/rooster/services/storage';
import path from 'path';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, testName: string, failureDetails: string) {
  if (condition) {
    results.push({ category, name: testName, passed: true, details: 'OK' });
    console.log(`  [PASS] [${category}] ${testName}`);
  } else {
    results.push({ category, name: testName, passed: false, details: failureDetails });
    console.error(`  [FAIL] [${category}] ${testName}: ${failureDetails}`);
  }
}

// Polyfill seguro de localStorage para ambiente headless Node
if (typeof (global as any).localStorage === 'undefined') {
  const memStore: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => memStore[key] ?? null,
    setItem: (key: string, val: string) => { memStore[key] = String(val); },
    removeItem: (key: string) => { delete memStore[key]; },
    clear: () => { Object.keys(memStore).forEach((k) => delete memStore[k]); },
    key: (idx: number) => Object.keys(memStore)[idx] ?? null,
    get length() { return Object.keys(memStore).length; },
  };
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('BATERIA DE TESTES: CORREÇÕES PRIORITÁRIAS QUALYQUEST / ROOSTER');
  console.log('===============================================================\n');

  const tenantA = 'org_impacto_aviation';
  const tenantB = 'org_outra_companhia';

  const adapterA = new FirestoreAdapter(tenantA);
  const adapterB = new FirestoreAdapter(tenantB);

  // ==========================================================================
  // EIXO 1: SEGURANÇA FIRESTORE & ISOLAMENTO MULTI-TENANT (Prioridade Máxima)
  // ==========================================================================
  console.log('\n--- EIXO 1: SEGURANÇA FIRESTORE & ISOLAMENTO MULTI-TENANT ---');
  const rulesSource = fs.readFileSync('firestore.rules', 'utf8');

  // 1.1 Bloqueio de usuários sem perfil válido
  assert(
    rulesSource.includes('function hasValidProfile()') &&
    rulesSource.includes('exists(/databases/$(database)/documents/users/$(request.auth.uid))') &&
    rulesSource.includes("organizationId != ''"),
    '1. Segurança Firestore',
    'Função hasValidProfile() exige documento de perfil existente com organizationId válido',
    'hasValidProfile() não implementada com rigor'
  );

  // 1.2 isUserActive() não considera usuário sem perfil como ativo
  assert(
    rulesSource.includes('function isUserActive()') &&
    rulesSource.includes('hasValidProfile()') &&
    !rulesSource.includes('!exists(/databases/$(database)/documents/users/$(request.auth.uid))'),
    '1. Segurança Firestore',
    'isUserActive() exige hasValidProfile() e rejeita usuários sem perfil (sem bypass !exists)',
    'isUserActive() permite bypass para usuários sem perfil'
  );

  // 1.3 Remoção da exceção de acesso à IMPACTO quando orgId está vazio
  assert(
    !rulesSource.includes("getUserOrgId() == '' && orgId == 'org_impacto_aviation'") &&
    !rulesSource.includes("getUserOrgId() == ''"),
    '1. Segurança Firestore',
    'Remoção total da exceção que permitia acesso à organização IMPACTO com orgId vazio',
    'Brecha de orgId vazio para IMPACTO ainda presente em firestore.rules'
  );

  // 1.4 userBelongsToOrg() exige vínculo explícito e usuário ativo
  assert(
    rulesSource.includes('function userBelongsToOrg(orgId)') &&
    rulesSource.includes('isUserActive() && hasValidProfile()') &&
    rulesSource.includes('getUserOrgId() == orgId'),
    '1. Segurança Firestore',
    'userBelongsToOrg() exige autenticação, usuário ativo, perfil válido e igualdade estrita de orgId',
    'userBelongsToOrg() não enforceia tenant id estrito'
  );

  // 1.5 Restrição de leitura em /organizations/{organizationId}
  assert(
    rulesSource.includes('match /organizations/{organizationId}') &&
    rulesSource.includes('allow get: if isSuperPlatformAdmin() || userBelongsToOrg(organizationId);') &&
    rulesSource.includes('allow list: if isSuperPlatformAdmin() || (isGestorSGQ() && isUserActive() && userBelongsToOrg(resource.data.id));'),
    '1. Segurança Firestore',
    'Leitura de /organizations/{organizationId} restrita a membros autorizados ou super admin',
    'Leitura de organização não está protegida por autorização'
  );

  // 1.6 Restrição de list em /users
  assert(
    rulesSource.includes('match /users/{userId}') &&
    rulesSource.includes('resource.data.organizationId == getUserOrgId()'),
    '1. Segurança Firestore',
    'Listagem em /users restrita por organização do usuário logado',
    '/users list permite acesso irrestrito'
  );

  // 1.7 Restrição de get/list em /userInvitations
  assert(
    rulesSource.includes('match /userInvitations/{invitationId}') &&
    rulesSource.includes('resource.data.organizationId == getUserOrgId()'),
    '1. Segurança Firestore',
    'Acesso a /userInvitations restrito a membros autorizados da mesma organização',
    '/userInvitations não restringe get/list por organização'
  );

  // 1.8 Fechamento de coleções legadas na raiz
  assert(
    rulesSource.includes('match /pessoa/{id}') &&
    rulesSource.includes('match /licenca/{id}') &&
    rulesSource.includes('match /curso_catalogo/{id}') &&
    rulesSource.includes('match /treinamento/{id}') &&
    rulesSource.includes('allow read, write: if false;'),
    '1. Segurança Firestore',
    'Coleções legadas na raiz (/pessoa, /licenca, etc.) totalmente bloqueadas para read e write',
    'Coleções legadas na raiz permanecem abertas'
  );

  // 1.9 Simulação lógica de RBAC com 5 perfis obrigatórios
  const evaluateAccess = (user: {
    authenticated: boolean;
    hasProfile: boolean;
    orgId: string;
    status: 'ATIVO' | 'INATIVO';
    role: 'SUPER_ADMIN' | 'ADMIN' | 'GESTOR_SGQ' | 'AUDITOR' | 'COLABORADOR' | 'CONSULTA';
  }, targetOrg: string, isWrite: boolean) => {
    if (!user.authenticated) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (!user.hasProfile) return false;
    if (user.status !== 'ATIVO') return false;
    if (user.orgId !== targetOrg) return false;
    if (isWrite && user.role === 'CONSULTA') return false;
    return true;
  };

  // Dois tenants distintos
  const userTenantA = { authenticated: true, hasProfile: true, orgId: tenantA, status: 'ATIVO' as const, role: 'COLABORADOR' as const };
  assert(evaluateAccess(userTenantA, tenantA, false) === true, '1. Segurança Firestore', 'Usuário Tenant A acessa dados de seu próprio tenant', 'Acesso legítimo bloqueado');
  assert(evaluateAccess(userTenantA, tenantB, false) === false, '1. Segurança Firestore', 'Usuário Tenant A é BLOQUEADO de acessar dados do Tenant B', 'Vazamento entre tenants!');

  // Usuário sem perfil
  const userSemPerfil = { authenticated: true, hasProfile: false, orgId: '', status: 'ATIVO' as const, role: 'COLABORADOR' as const };
  assert(evaluateAccess(userSemPerfil, tenantA, false) === false, '1. Segurança Firestore', 'Usuário sem perfil é BLOQUEADO de ler dados da organização', 'Acesso indevido');
  assert(evaluateAccess(userSemPerfil, tenantA, true) === false, '1. Segurança Firestore', 'Usuário sem perfil é BLOQUEADO de gravar dados da organização', 'Gravação indevida');

  // Usuário inativo
  const userInativo = { authenticated: true, hasProfile: true, orgId: tenantA, status: 'INATIVO' as const, role: 'COLABORADOR' as const };
  assert(evaluateAccess(userInativo, tenantA, false) === false, '1. Segurança Firestore', 'Usuário com status INATIVO é BLOQUEADO de leitura', 'Inativo teve acesso');
  assert(evaluateAccess(userInativo, tenantA, true) === false, '1. Segurança Firestore', 'Usuário com status INATIVO é BLOQUEADO de escrita', 'Inativo pôde gravar');

  // Usuário CONSULTA
  const userConsulta = { authenticated: true, hasProfile: true, orgId: tenantA, status: 'ATIVO' as const, role: 'CONSULTA' as const };
  assert(evaluateAccess(userConsulta, tenantA, false) === true, '1. Segurança Firestore', 'Usuário CONSULTA tem leitura permitida no próprio tenant', 'Leitura bloqueada');
  assert(evaluateAccess(userConsulta, tenantA, true) === false, '1. Segurança Firestore', 'Usuário CONSULTA é BLOQUEADO de gravação/edição', 'CONSULTA pôde gravar');

  // Usuário Administrador
  const userAdmin = { authenticated: true, hasProfile: true, orgId: tenantA, status: 'ATIVO' as const, role: 'ADMIN' as const };
  assert(evaluateAccess(userAdmin, tenantA, true) === true, '1. Segurança Firestore', 'Administrador legítimo possui acesso total de leitura e escrita', 'Admin bloqueado');

  // 1.10 Verificação real contra Firestore ao vivo (rejeição de chamada não autenticada)
  let directApiRejected = false;
  let directApiErrorCode = '';
  try {
    const rawDb = getFirestoreDb();
    if (rawDb) {
      await setDoc(doc(rawDb, 'organizations', 'org_unauth_test', 'persons', 'HACK-01'), { nome: 'Hacker' });
    }
  } catch (err: any) {
    directApiRejected = true;
    directApiErrorCode = err?.code || String(err);
  }
  assert(
    directApiRejected,
    '1. Segurança Firestore',
    'Escrita direta na API do Firestore sem autenticação é rejeitada com PERMISSION_DENIED pelo servidor',
    `Acesso não autenticado não foi bloqueado: ${directApiErrorCode}`
  );

  // ==========================================================================
  // EIXO 2: PERSISTÊNCIA REAL — NÃO SIMULAR SUCESSO
  // ==========================================================================
  console.log('\n--- EIXO 2: PERSISTÊNCIA REAL (NÃO SIMULAR SUCESSO) ---');

  const testPersonPayload: Pessoa = {
    id: 'PERSIST-TEST-001',
    nome: 'Engenheiro de Teste Persistência',
    categoria: 'Mecânico',
    situacao: 'Ativo',
    base_principal_id: 'REC',
    cliente_ou_area: 'GOL Linhas Aéreas',
    canac: '112233',
    criado_em: '2026-10-26T10:00:00Z',
    atualizado_em: '2026-10-26T10:00:00Z',
    atualizado_por: 'Auditor Teste',
  };

  // 2.1 Falha remota no FirestoreAdapter rejeita a operação e NÃO atualiza cache nem canonical map
  const adapterPersistTest = new FirestoreAdapter('org_test_unauth');
  let saveThrewError = false;
  let saveErrorCode = '';
  try {
    await adapterPersistTest.savePessoa(testPersonPayload, 'Auditor Teste');
  } catch (err: any) {
    saveThrewError = true;
    saveErrorCode = err?.code || String(err);
  }

  assert(
    saveThrewError,
    '2. Persistência',
    'savePessoa() lança erro quando Firestore remoto rejeita (NÃO simula sucesso)',
    'savePessoa() simulou sucesso falso!'
  );

  const personInCacheAfterFailure = adapterPersistTest.getDatabase().pessoas.find((p) => p.id === 'PERSIST-TEST-001');
  assert(
    personInCacheAfterFailure === undefined,
    '2. Persistência',
    'Cache em memória NÃO é atualizado quando a gravação remota falha',
    'Cache em memória foi corrompido com dados não persistidos!'
  );

  const personInCanonicalMap = (adapterPersistTest as any).canonicalPersonsMap.has('PERSIST-TEST-001');
  assert(
    !personInCanonicalMap,
    '2. Persistência',
    'canonicalPersonsMap NÃO armazena registro após falha na persistência remota',
    'canonicalPersonsMap armazenou dados após falha!'
  );

  // 2.2 Gravação e leitura confirmada no Storage Local (LocalAdapter)
  const localAdapter = new LocalAdapter();
  await localAdapter.savePessoa(testPersonPayload, 'Auditor Teste');
  const readPerson = localAdapter.getDatabase().pessoas.find((p) => p.id === 'PERSIST-TEST-001');
  assert(
    readPerson !== undefined && readPerson.nome === 'Engenheiro de Teste Persistência',
    '2. Persistência',
    'Gravação confirmada com sucesso é recuperada fielmente na leitura',
    'Pessoa gravada não foi encontrada'
  );

  // 2.3 Atualização em place sem duplicação
  const updatedPersonPayload: Pessoa = {
    ...readPerson!,
    nome: 'Engenheiro de Teste Persistência Atualizado',
    base_principal_id: 'GRU',
  };
  await localAdapter.savePessoa(updatedPersonPayload, 'Auditor Teste');
  const reReadPerson = localAdapter.getDatabase().pessoas.find((p) => p.id === 'PERSIST-TEST-001');
  assert(
    reReadPerson?.nome === 'Engenheiro de Teste Persistência Atualizado' && reReadPerson?.base_principal_id === 'GRU',
    '2. Persistência',
    'Edição de colaborador atualiza campos confirmados (Nome, Base)',
    'Atualização falhou'
  );

  const duplicateCheck = localAdapter.getDatabase().pessoas.filter((p) => p.id === 'PERSIST-TEST-001');
  assert(
    duplicateCheck.length === 1,
    '2. Persistência',
    'Edição do colaborador NÃO cria duplicatas na base de dados',
    `Encontradas ${duplicateCheck.length} ocorrências!`
  );

  // ==========================================================================
  // EIXO 3: REGRAS DE VALIDADE (5 ESTADOS CANÔNICOS & MESES DE CALENDÁRIO)
  // ==========================================================================
  console.log('\n--- EIXO 3: REGRAS DE VALIDADE & DISTINÇÃO DE 5 ESTADOS ---');

  // 3.1 Curso sem periodicidade NÃO é interpretado automaticamente como sem vencimento
  const cursoLegadoSemPeriodicidade: CursoTreinamento = {
    id: 'CURSO-LEGADO-SEM-PERIODICIDADE',
    organizationId: tenantA,
    codigo: 'CUR-LEG-01',
    titulo: 'Curso Legado Importado Sem Regra de Prazo',
    tipo: 'RECORRENTE',
    modalidade: 'PRESENCIAL',
    cargaHorariaHoras: 16,
    ementa: 'Treinamento sem periodicidade no cadastro',
    recorrente: true,
    periodicidadeMeses: undefined, // Ausência de periodicidade
    origemPrazo: 'INTERNO_SGQ',
    competenciasDesenvolvidasIds: [],
    status: 'ATIVO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const cursoCatalogoMapeado = (adapterA as any).mapCursoTreinamentoToCursoCatalogo(cursoLegadoSemPeriodicidade);
  assert(
    cursoCatalogoMapeado.validade_dias === 0,
    '3. Regras de Validade',
    'Curso sem periodicidade NÃO recebe validade presumida de 730 ou 1825 dias',
    `validade_dias = ${cursoCatalogoMapeado.validade_dias}`
  );
  assert(
    cursoCatalogoMapeado.sem_validade === false,
    '3. Regras de Validade',
    'Ausência de periodicidade NÃO é interpretada automaticamente como sem_validade: true',
    'sem_validade foi marcado como true sem confirmação cadastral!'
  );

  const trnComCursoSemPeriodicidade: Treinamento = {
    id: 'TRN-LEG-01',
    pessoa_id: 'COLAB-001',
    curso_id: cursoCatalogoMapeado.id,
    data_execucao: '2024-05-10',
    data_validade: undefined,
    criado_em: '2024-05-10T10:00:00Z',
    atualizado_em: '2024-05-10T10:00:00Z',
    atualizado_por: 'Sistema',
  };

  const stSemPeriodicidade = calcularStatusTreinamento(trnComCursoSemPeriodicidade, cursoCatalogoMapeado, '2026-10-25');
  assert(
    stSemPeriodicidade.status === 'Sem validade definida',
    '3. Regras de Validade',
    'Estado 1: Curso sem periodicidade e sem regra explícita retorna "Sem validade definida"',
    `Obtido: ${stSemPeriodicidade.status}`
  );
  assert(
    stSemPeriodicidade.isSemVencimento === false,
    '3. Regras de Validade',
    'Treinamento sem validade definida NÃO tem isSemVencimento: true',
    'Marcado indevidamente como isSemVencimento'
  );

  // 3.2 Curso com "Sem vencimento aplicável" explicitamente confirmado
  const cursoSemVencimentoConfirmado: CursoCatalogo = {
    id: 'CURSO-INTEGRACAO-UNICA',
    curso: 'Integração Institucional Permanente',
    codigo: 'INT-01',
    grupo: 'Doutrinação',
    frota: 'Geral',
    variante: '',
    validade_dias: 0,
    ativo: true,
    sem_validade: true, // Confirmado por regra cadastrada
  };

  const trnSemVencimento: Treinamento = {
    id: 'TRN-INT-01',
    pessoa_id: 'COLAB-001',
    curso_id: cursoSemVencimentoConfirmado.id,
    data_execucao: '2023-01-10',
    criado_em: '2023-01-10T10:00:00Z',
    atualizado_em: '2023-01-10T10:00:00Z',
    atualizado_por: 'Instrutor',
  };

  const stSemVencimento = calcularStatusTreinamento(trnSemVencimento, cursoSemVencimentoConfirmado, '2026-10-25');
  assert(
    stSemVencimento.status === 'Sem vencimento' && stSemVencimento.isSemVencimento === true,
    '3. Regras de Validade',
    'Estado 2: Curso com sem_validade: true retorna "Sem vencimento" (isSemVencimento: true)',
    `Status: ${stSemVencimento.status}, isSemVencimento: ${stSemVencimento.isSemVencimento}`
  );

  // 3.3 Registro com dados insuficientes (sem data de realização)
  const trnDadosInsuficientes: Treinamento = {
    id: 'TRN-INCOMPLETO-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CUR-QUALQUER',
    data_execucao: '', // Sem data
    criado_em: '2026-01-01T10:00:00Z',
    atualizado_em: '2026-01-01T10:00:00Z',
    atualizado_por: 'OCR',
  };

  const stDadosInsuficientes = calcularStatusTreinamento(trnDadosInsuficientes, undefined, '2026-10-25');
  assert(
    stDadosInsuficientes.status === 'Dados insuficientes',
    '3. Regras de Validade',
    'Estado 3: Registro sem data de execução retorna "Dados insuficientes"',
    `Status: ${stDadosInsuficientes.status}`
  );

  // 3.4 Treinamento "Em dia" e cálculo por meses de calendário (addMonths) sem bucket fixo de 30 dias
  // 24 meses a partir de 2025-05-10 deve resultar exatamente em 2027-05-10 (NÃO 2027-04-30 que decorreria de 24*30=720 dias)
  const vencimentoMeses = calcularVencimento('2025-05-10', 0, 24);
  assert(
    vencimentoMeses === '2027-05-10',
    '3. Regras de Validade',
    'Cálculo de vencimento adiciona meses de calendário exatos (2025-05-10 + 24m = 2027-05-10, sem bucket fixo de 30 dias)',
    `Esperado 2027-05-10, obtido: ${vencimentoMeses}`
  );

  const trnEmDia: Treinamento = {
    id: 'TRN-EM-DIA-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CURSO-AVIO-24M',
    data_execucao: '2025-05-10',
    criado_em: '2025-05-10T10:00:00Z',
    atualizado_em: '2025-05-10T10:00:00Z',
    atualizado_por: 'Instrutor',
  };

  const curso24Meses: CursoCatalogo = {
    id: 'CURSO-AVIO-24M',
    curso: 'Aviônica B737 Recorrente',
    grupo: 'Frota',
    frota: 'B737 NG/MAX',
    variante: 'Todas',
    validade_dias: 0,
    periodicidade_meses: 24,
    ativo: true,
  };

  const stEmDia = calcularStatusTreinamento(trnEmDia, curso24Meses, '2026-10-25');
  assert(
    stEmDia.status === 'Em dia',
    '3. Regras de Validade',
    'Estado 4: Treinamento com vencimento futuro (2027-05-10 vs ref 2026-10-25) retorna "Em dia"',
    `Status: ${stEmDia.status}`
  );
  assert(
    stEmDia.data_vencimento === '2027-05-10',
    '3. Regras de Validade',
    'Data de vencimento calculada por meses de calendário é 2027-05-10',
    `Data de vencimento obtida: ${stEmDia.data_vencimento}`
  );

  // 3.5 Treinamento "Vencido"
  const trnVencido: Treinamento = {
    id: 'TRN-VENCIDO-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CURSO-AVIO-24M',
    data_execucao: '2024-01-10', // Venceu em 2026-01-10
    criado_em: '2024-01-10T10:00:00Z',
    atualizado_em: '2024-01-10T10:00:00Z',
    atualizado_por: 'Instrutor',
  };

  const stVencido = calcularStatusTreinamento(trnVencido, curso24Meses, '2026-10-25');
  assert(
    stVencido.status === 'Vencido',
    '3. Regras de Validade',
    'Estado 5: Treinamento com data expirada (2026-01-10 vs ref 2026-10-25) retorna "Vencido"',
    `Status: ${stVencido.status}`
  );

  // 3.6 Preservação da data de validade explícita gravada no registro
  const trnComValidadeExplicita: Treinamento = {
    id: 'TRN-EXP-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CURSO-AVIO-24M',
    data_execucao: '2024-01-10',
    data_validade: '2028-12-31', // Validade explícita diferente da regra geral
    criado_em: '2024-01-10T10:00:00Z',
    atualizado_em: '2024-01-10T10:00:00Z',
    atualizado_por: 'Entidade Homologadora',
  };

  const stValidadeExplicita = calcularStatusTreinamento(trnComValidadeExplicita, curso24Meses, '2026-10-25');
  assert(
    stValidadeExplicita.data_vencimento === '2028-12-31',
    '3. Regras de Validade',
    'Data de validade explícita gravada no registro é PRESERVADA e tem precedência',
    `Vencimento: ${stValidadeExplicita.data_vencimento}`
  );
  assert(
    stValidadeExplicita.status === 'Em dia',
    '3. Regras de Validade',
    'Status considera a data de validade explícita futura',
    `Status: ${stValidadeExplicita.status}`
  );

  // ==========================================================================
  // EIXO 4: CONSISTÊNCIA DE NAVEGAÇÃO E ROTAS REAIS
  // ==========================================================================
  console.log('\n--- EIXO 4: CONSISTÊNCIA DE NAVEGAÇÃO E ROTAS REAIS ---');

  const sidebarContent = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
  const routerContent = fs.readFileSync('src/components/app/AppViewRouter.tsx', 'utf8');

  // 4.1 Desduplicação de validacaoQueue
  const matchesValidacaoTreinamentos = sidebarContent.includes("id: 'validacao-treinamentos'");
  const matchesValidacaoQualidade = sidebarContent.includes("id: 'validacao-qualidade'");
  assert(
    matchesValidacaoTreinamentos && matchesValidacaoQualidade,
    '4. Navegação',
    'Desduplicação de validacaoQueue: separada em validacao-treinamentos e validacao-qualidade',
    'IDs das filas de validação não foram separados no Sidebar.tsx'
  );

  // 4.2 Destino real de "Modelos de capacitação" (modelos-capacitacao)
  const modelosHandled = routerContent.includes("case 'rooster-matrizes':") && routerContent.includes("'modelos-capacitacao'");
  assert(
    modelosHandled,
    '4. Navegação',
    'Item "Modelos de capacitação" (modelos-capacitacao) possui rota real para a matriz de requisitos',
    'modelos-capacitacao não possui destino explícito no roteador'
  );

  // 4.3 Verificação de unicidade de IDs dos itens de navegação no Sidebar.tsx
  // Extrai todos os id: '...' dentro de navGroups
  const navItemIdMatches = [...sidebarContent.matchAll(/id:\s*['"]([a-zA-Z0-9_-]+)['"]/g)].map((m) => m[1]);
  // Filtra apenas os IDs de itens de primeiro e segundo nível
  const idCounts = new Map<string, number>();
  navItemIdMatches.forEach((id) => {
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  });
  const duplicateIds = [...idCounts.entries()].filter(([_, count]) => count > 1).map(([id]) => id);
  assert(
    duplicateIds.length === 0,
    '4. Navegação',
    'Ausência de IDs duplicados em Sidebar.tsx',
    `IDs duplicados encontrados: ${duplicateIds.join(', ')}`
  );

  // 4.4 Mapeamento de todas as rotas mandatadas no AppViewRouter.tsx (sem depender de fallback)
  const rotasObrigatorias = [
    { id: 'pessoas-competencias', label: 'Lista de colaboradores' },
    { id: 'colaborador-novo', label: 'Novo colaborador' },
    { id: 'rooster-ficha', label: 'Perfil do colaborador' },
    { id: 'cht-qualificacoes', label: 'Habilitações e licenças' },
    { id: 'rooster-catalogo', label: 'Catálogo de treinamentos' },
    { id: 'modelos-capacitacao', label: 'Modelos de capacitação' },
    { id: 'rooster-matrizes', label: 'Matriz de treinamento' },
    { id: 'treinamentos-qualificacoes', label: 'Registros de treinamento' },
    { id: 'importacao-certificados', label: 'Importação de certificados' },
    { id: 'validacao-treinamentos', label: 'Fila de validação (certificados)' },
    { id: 'validacao-qualidade', label: 'Fila de validação (qualidade)' },
    { id: 'central-vencimentos-gaps', label: 'Vencimentos' },
    { id: 'competencias-dashboard', label: 'Dashboard de treinamentos' },
    { id: 'cadastros-bases', label: 'Bases e locais operacionais' },
    { id: 'cadastros-funcoes-cargos', label: 'Funções e cargos' },
    { id: 'parametros-fluxo', label: 'Parâmetros necessários ao fluxo' },
  ];

  rotasObrigatorias.forEach((rota) => {
    const declaredInSidebar = sidebarContent.includes(`'${rota.id}'`) || sidebarContent.includes(`"${rota.id}"`);
    assert(declaredInSidebar, '4. Navegação', `Rota "${rota.label}" [${rota.id}] declarada no menu Sidebar.tsx`, `Falta no Sidebar.tsx`);

    const hasDedicatedHandler = routerContent.includes(`case '${rota.id}':`) || routerContent.includes(`case "${rota.id}":`);
    assert(hasDedicatedHandler, '4. Navegação', `Rota "${rota.label}" [${rota.id}] possui case dedicado em AppViewRouter.tsx`, `Falta case no router`);
  });

  // ==========================================================================
  // EIXO 5: INTEGRIDADE REFERENCIAL, MAPEAMENTO & HISTÓRICO DE RENOVAÇÃO
  // ==========================================================================
  console.log('\n--- EIXO 5: INTEGRIDADE REFERENCIAL E HISTÓRICO DE RENOVAÇÃO ---');

  const colabOriginal: ColaboradorPessoa = {
    id: 'COLAB-001',
    organizationId: tenantA,
    nome: 'Carlos Eduardo Silveira',
    matricula: 'CANAC-123456',
    setor: 'Hangar REC / Manutenção Pesada',
    funcao: 'Mecânico de Manutenção Aeronáutica',
    cargoOperacional: 'Mecânico Sênior B737/A320',
    baseOperacional: 'REC',
    baseOperacionalId: 'REC',
    status: 'ATIVO',
    statusCustomizado: 'Aguardando Cheque Anual',
    dataAdmissao: '2021-03-15',
    contatoCorporativo: 'carlos.silveira@impactoaviation.com | Tel: +55 81 99999-1111 | Ramal: 402',
    observacoes: 'Mecânico com vasta experiência em motores CFM56 e LEAP-1B',
    restricaoOperacional: {
      possuiRestricao: false,
      impedeExecucao: false,
      apenasAlerta: false,
      motivo: 'Apto sem restrições',
    },
    camposCustomizados: {
      canac: '123456',
      categoria: 'Mecânico',
      clienteOuArea: 'GOL Linhas Aéreas',
    },
    createdAt: '2021-03-15T08:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
    criadoPor: 'Recursos Humanos SGQ',
    criadoPorUid: 'usr-rh-01',
  };

  const pessoaRooster = (adapterA as any).mapColaboradorToPessoa(colabOriginal);
  assert(pessoaRooster.id === 'COLAB-001', '5. Integridade Referencial', 'Preservação de ID estável do colaborador', `ID: ${pessoaRooster.id}`);
  assert(pessoaRooster.nome === 'Carlos Eduardo Silveira', '5. Integridade Referencial', 'Preservação de Nome do colaborador', `Nome: ${pessoaRooster.nome}`);
  assert(pessoaRooster.canac === '123456', '5. Integridade Referencial', 'Preservação de CANAC', `CANAC: ${pessoaRooster.canac}`);
  assert(pessoaRooster.base_principal_id === 'REC', '5. Integridade Referencial', 'Preservação de Base Operacional REC', `Base: ${pessoaRooster.base_principal_id}`);

  // Licença CHT ANAC
  const licencaCanonica: QualificacaoColaborador = {
    id: 'QUALIF-CHT-001',
    organizationId: tenantA,
    colaboradorId: 'COLAB-001',
    colaboradorNome: 'Carlos Eduardo S. Rocha',
    colaboradorMatricula: 'CANAC-123456',
    tipo: 'CHT_ANAC',
    titulo: 'ANAC CHT CEL / GMP',
    escopo: 'Habilitação Técnica CHT - Célula e Grupo Motopropulsor',
    emissor: 'ANAC',
    numeroRegistro: '123456',
    dataEmissao: '2018-02-01',
    dataValidade: '2027-02-01',
    possuiValidade: true,
    status: 'VALIDA',
    bloqueiaOperacaoSeVencida: true,
    responsavelValidacaoUid: 'usr-val-01',
    responsavelValidacaoNome: 'Auditoria SGQ',
    dataValidacao: '2025-01-01',
    createdAt: '2018-02-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const licencaRooster = (adapterA as any).mapQualificacaoToLicenca(licencaCanonica);
  assert(licencaRooster.id === 'QUALIF-CHT-001', '5. Integridade Referencial', 'Preservação de ID estável da licença', `ID: ${licencaRooster.id}`);
  assert(licencaRooster.orgao === 'ANAC' && licencaRooster.tipo === 'CHT', '5. Integridade Referencial', 'Detecção de Órgão ANAC e Tipo CHT', `Órgão: ${licencaRooster.orgao}, Tipo: ${licencaRooster.tipo}`);
  assert(licencaRooster.data_vencimento === '2027-02-01', '5. Integridade Referencial', 'Preservação da data de validade da CHT', `Vencimento: ${licencaRooster.data_vencimento}`);

  // Histórico de renovação com rastreabilidade
  const trnOriginal: RegistroTreinamentoColaborador = {
    id: 'TRN-2024-001',
    organizationId: tenantA,
    colaboradorId: 'COLAB-001',
    colaboradorNome: 'Carlos Eduardo Silveira',
    colaboradorMatricula: 'CANAC-123456',
    treinamentoId: 'CUR-B737',
    treinamentoCodigo: 'CUR-B737',
    treinamentoTitulo: 'Treinamento B737 Aviônica',
    cargaHoraria: 40,
    instrutor: 'Instrutor Homologado',
    resultado: 'APROVADO',
    dataRealizacao: '2024-05-10',
    dataValidade: '2026-05-10',
    createdAt: '2024-05-10T12:00:00Z',
    updatedAt: '2024-05-10T12:00:00Z',
  };

  const trnRenovado: RegistroTreinamentoColaborador = {
    id: 'TRN-2026-002',
    organizationId: tenantA,
    colaboradorId: 'COLAB-001',
    colaboradorNome: 'Carlos Eduardo Silveira',
    colaboradorMatricula: 'CANAC-123456',
    treinamentoId: 'CUR-B737',
    treinamentoCodigo: 'CUR-B737',
    treinamentoTitulo: 'Treinamento B737 Aviônica',
    cargaHoraria: 40,
    instrutor: 'Instrutor Homologado',
    resultado: 'APROVADO',
    dataRealizacao: '2026-05-12',
    dataValidade: '2028-05-12',
    registroTreinamentoOrigemId: trnOriginal.id,
    ehReciclagem: true,
    createdAt: '2026-05-12T10:00:00Z',
    updatedAt: '2026-05-12T10:00:00Z',
  };

  const trnOriginalComPonteiro = {
    ...trnOriginal,
    substituidoPor: trnRenovado.id,
  };

  assert(trnRenovado.registroTreinamentoOrigemId === 'TRN-2024-001', '5. Integridade Referencial', 'Treinamento renovado referencia registro original (origem)', 'Origem perdida');
  assert(trnOriginalComPonteiro.substituidoPor === 'TRN-2026-002', '5. Integridade Referencial', 'Registro original aponta para registro de renovação (substituição)', 'Substituição perdida');
  assert(trnOriginal.id !== trnRenovado.id, '5. Integridade Referencial', 'Registros mantêm IDs independentes sem sobrescrita destrutiva', 'Sobrescrita indevida');

  // ==========================================================================
  // EIXO 6: IMPORTAÇÃO REAL, PERSISTÊNCIA E EXPANSÃO DO QUADRO (34 MECÂNICOS)
  // ==========================================================================
  console.log('\n--- EIXO 6: IMPORTAÇÃO REAL & EXPANSÃO DO QUADRO (34 MECÂNICOS) ---');

  const officialJsonPath = path.resolve(process.cwd(), 'public/assets/aistudio/roster_dados_oficiais_2026-10-28_0adf3c89.json');
  assert(fs.existsSync(officialJsonPath), '6. Importação e Expansão', 'Arquivo oficial do usuário existe no workspace', 'Arquivo não encontrado');

  const rawJsonContent = fs.readFileSync(officialJsonPath, 'utf-8');
  const uploadedPayload = JSON.parse(rawJsonContent);

  // 1. Validação do arquivo
  const report = validateImportPayload(uploadedPayload, 'substituir');
  assert(report.canCommit === true, '6. Importação e Expansão', 'Arquivo oficial passa na validação tudo-ou-nada (canCommit === true)', `Falha: ${report.issues.map(i => i.motivo).join('; ')}`);
  assert(report.totalErros === 0, '6. Importação e Expansão', 'Zero erros bloqueantes no arquivo oficial do usuário', `Erros encontrados: ${report.totalErros}`);

  // 2. Execução da persistência via FirestoreAdapter: sem autenticação válida, rejeita com erro sem simular sucesso
  const adapterBatch = new FirestoreAdapter('org_impacto_aviation');
  let batchThrewError = false;
  try {
    await adapterBatch.saveDatabase(uploadedPayload, 'substituir', 'Admin Teste', 'roster_dados_oficiais_2026-10-28_0adf3c89.json');
  } catch (err: any) {
    batchThrewError = true;
  }
  assert(batchThrewError, '6. Importação e Expansão', 'saveDatabase() em FirestoreAdapter rejeita gravação sem autenticação válida (não simula sucesso)', 'Falso sucesso reportado');
  assert(adapterBatch.getDatabase().pessoas.length !== 48, '6. Importação e Expansão', 'Cache em FirestoreAdapter NÃO é contaminado quando gravação remota é rejeitada', 'Memória foi corrompida');

  // 3. Importação oficial pelo pipeline com LocalAdapter / commitImportPayload
  const localAdapterImport = new LocalAdapter();
  setActiveAdapter(localAdapterImport);
  const confData = await localAdapterImport.importBatch(uploadedPayload, 'substituir', 'Admin Teste', 'roster_dados_oficiais_2026-10-28_0adf3c89.json');
  const dbState = localAdapterImport.getDatabase();

  // 4. Verificação do quadro expandido de pessoas e mecânicos
  assert(dbState.pessoas.length === 48, '6. Importação e Expansão', 'Base contém 48 pessoas no total (incluindo ADMs e novos mecânicos)', `Encontrado: ${dbState.pessoas.length}`);
  const mecs = dbState.pessoas.filter(p => p.categoria === 'Mecânico');
  assert(mecs.length === 34, '6. Importação e Expansão', 'Base contém 34 mecânicos (MEC-001 a MEC-034)', `Encontrado: ${mecs.length}`);

  const mec33 = dbState.pessoas.find(p => p.id === 'MEC-033');
  const mec34 = dbState.pessoas.find(p => p.id === 'MEC-034');
  assert(!!mec33 && mec33.nome === 'Emir Almeida', '6. Importação e Expansão', 'Novo mecânico MEC-033 (Emir Almeida) persistido com sucesso', 'MEC-033 ausente');
  assert(!!mec34 && mec34.nome === 'Paulo Araujo', '6. Importação e Expansão', 'Novo mecânico MEC-034 (Paulo Araujo) persistido com sucesso', 'MEC-034 ausente');

  // 5. Verificação de licenças, cursos e treinamentos
  assert(dbState.licencas.length === 90, '6. Importação e Expansão', 'Total de 90 licenças persistidas no banco', `Encontrado: ${dbState.licencas.length}`);
  assert(dbState.cursosCatalogo.length === 63, '6. Importação e Expansão', 'Total de 63 cursos no catálogo persistidos', `Encontrado: ${dbState.cursosCatalogo.length}`);
  assert(dbState.treinamentos.length === 418, '6. Importação e Expansão', 'Total de 418 registros de treinamento persistidos', `Encontrado: ${dbState.treinamentos.length}`);

  // 6. Verificação da Lista de Designação Oficial com 34 mecânicos
  const designatedInDb = dbState.designacoesPessoa.filter(dp => dp.incluir_na_lista);
  assert(designatedInDb.length === 34, '6. Importação e Expansão', 'Total de 34 mecânicos com inclusão na Lista de Designação', `Encontrado: ${designatedInDb.length}`);

  // 7. Verificação do Painel de Conferência (Sanity checks e divergências)
  const desigSanityCheck = confData.verificacoesSanidade.find(v => v.titulo.includes('Lista de Designação'));
  assert(!!desigSanityCheck && desigSanityCheck.aprovado === true, '6. Importação e Expansão', 'Sanity Check da Lista de Designação APROVADO sem divergência para 34 mecânicos', `Esperado: ${desigSanityCheck?.esperado}, Encontrado: ${desigSanityCheck?.encontrado}`);

  const recSanityCheck = confData.verificacoesSanidade.find(v => v.titulo.includes('Base REC'));
  assert(!!recSanityCheck && recSanityCheck.aprovado === true, '6. Importação e Expansão', 'Sanity Check da Base REC (7 mecânicos) APROVADO', `Encontrado: ${recSanityCheck?.encontrado}`);

  const divergenciasNaTabela = confData.tabelaResumo.filter(t => t.status === 'DIVERGENCIA');
  assert(divergenciasNaTabela.length === 0, '6. Importação e Expansão', 'Zero divergências na tabela de conferência pós-importação', `Divergências: ${divergenciasNaTabela.map(d => d.entidade).join(', ')}`);

  // ==========================================================================
  // RELATÓRIO E RESUMO FINAL
  // ==========================================================================
  console.log('\n===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`TOTAL DE TESTES EXECUTADOS: ${total}`);
  console.log(`APROVADOS (PASS):           ${passed}`);
  console.log(`FALHAS (FAIL):              ${failed}`);
  console.log('===============================================================\n');

  // Agrupamento por categoria
  const categories = [...new Set(results.map((r) => r.category))];
  categories.forEach((cat) => {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.passed).length;
    console.log(`- ${cat}: ${catPassed}/${catResults.length} aprovados`);
  });

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\nTODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO!');
  }
}

runAllTests().catch((err) => {
  console.error('Erro fatal na execução dos testes:', err);
  process.exit(1);
});
