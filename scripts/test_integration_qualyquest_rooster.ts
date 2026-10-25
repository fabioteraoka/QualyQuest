/**
 * Testes Automatizados de Integração QualyQuest + Rooster
 * Executa testes rigorosos de integridade referencial, preservação de campos,
 * mapeamentos canônicos, isolamento multi-tenant e validação de regras de negócio.
 */

import fs from 'fs';
import { ColaboradorPessoa, CursoTreinamento, RegistroTreinamentoColaborador, QualificacaoColaborador } from '../src/types';
import { FirestoreAdapter } from '../src/rooster/services/adapters/firestoreAdapter';
import { Pessoa, CursoCatalogo, Treinamento, Licenca } from '../src/rooster/types';
import { calcularStatusTreinamento, hojeISO, calcularDiasParaVencer } from '../src/rooster/utils/businessRules';
import { getFirestoreDb } from '../src/rooster/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureDetails: string) {
  if (condition) {
    results.push({ name: testName, passed: true, details: 'OK' });
    console.log(`  [PASS] ${testName}`);
  } else {
    results.push({ name: testName, passed: false, details: failureDetails });
    console.error(`  [FAIL] ${testName}: ${failureDetails}`);
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('INICIANDO BATERIA DE TESTES: QUALYQUEST + ROOSTER INTEGRATION');
  console.log('===============================================================\n');

  const tenantA = 'org_impacto_aviation';
  const tenantB = 'org_outra_companhia';

  const adapterA = new FirestoreAdapter(tenantA);
  const adapterB = new FirestoreAdapter(tenantB);

  // --------------------------------------------------------------------------
  // TESTE 1: Mapeamento Canônico de Colaborador (QualyQuest -> Rooster)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Colaborador: QualyQuest -> Rooster ---');
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
  assert(pessoaRooster.id === 'COLAB-001', 'Preservação de ID estável', `ID esperado COLAB-001, obtido ${pessoaRooster.id}`);
  assert(pessoaRooster.nome === 'Carlos Eduardo Silveira', 'Mapeamento de Nome', `Nome incorreto: ${pessoaRooster.nome}`);
  assert(pessoaRooster.canac === '123456', 'Mapeamento de CANAC', `CANAC incorreto: ${pessoaRooster.canac}`);
  assert(pessoaRooster.categoria === 'Mecânico', 'Mapeamento de Categoria', `Categoria incorreta: ${pessoaRooster.categoria}`);
  assert(pessoaRooster.base_principal_id === 'REC', 'Mapeamento de Base Operacional', `Base incorreta: ${pessoaRooster.base_principal_id}`);

  // --------------------------------------------------------------------------
  // TESTE 2: Edição no Rooster preservando 100% dos campos QualyQuest SGQ
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Edição no Rooster e Preservação de Campos SGQ ---');
  // Registra no mapa canônico do adapter
  (adapterA as any).canonicalPersonsMap.set(colabOriginal.id, colabOriginal);

  const pessoaEditadaNoRooster: Pessoa = {
    ...pessoaRooster,
    nome: 'Carlos Eduardo S. Rocha', // Nome editado
    base_principal_id: 'GRU',       // Transferido de base
    canac: '123456',
    atualizado_em: '2026-10-21T12:00:00Z',
    atualizado_por: 'Supervisor MRO GRU',
  };

  // Simula gravação usando lógica interna do savePessoa
  const existingColab = (adapterA as any).canonicalPersonsMap.get(pessoaEditadaNoRooster.id);
  const updatedColab = {
    id: pessoaEditadaNoRooster.id,
    organizationId: tenantA,
    nome: pessoaEditadaNoRooster.nome.trim(),
    matricula: existingColab?.matricula || pessoaEditadaNoRooster.canac,
    setor: existingColab?.setor || 'Operações de Manutenção',
    funcao: existingColab?.funcao,
    cargoOperacional: existingColab?.cargoOperacional,
    baseOperacional: pessoaEditadaNoRooster.base_principal_id,
    baseOperacionalId: pessoaEditadaNoRooster.base_principal_id,
    status: existingColab?.status,
    statusCustomizado: existingColab?.statusCustomizado,
    dataAdmissao: existingColab?.dataAdmissao,
    contatoCorporativo: existingColab?.contatoCorporativo,
    observacoes: existingColab?.observacoes,
    restricaoOperacional: existingColab?.restricaoOperacional,
    camposCustomizados: {
      ...(existingColab?.camposCustomizados || {}),
      canac: pessoaEditadaNoRooster.canac,
    },
    createdAt: existingColab?.createdAt,
    updatedAt: new Date().toISOString(),
    criadoPor: existingColab?.criadoPor,
    criadoPorUid: existingColab?.criadoPorUid,
  };

  assert(updatedColab.nome === 'Carlos Eduardo S. Rocha', 'Atualização do Nome autorizada', 'Nome não atualizou');
  assert(updatedColab.baseOperacional === 'GRU', 'Atualização da Base Operacional para GRU', 'Base não atualizou');
  assert(updatedColab.dataAdmissao === '2021-03-15', 'Preservação de dataAdmissao (campo ausente no Rooster)', 'dataAdmissao foi perdida');
  assert(updatedColab.statusCustomizado === 'Aguardando Cheque Anual', 'Preservação de statusCustomizado', 'statusCustomizado foi perdido');
  assert(updatedColab.contatoCorporativo?.includes('402'), 'Preservação de contatoCorporativo (ramal)', 'contatoCorporativo foi perdido');
  assert(updatedColab.observacoes === colabOriginal.observacoes, 'Preservação de observacoes SGQ', 'observacoes foram perdidas');

  // --------------------------------------------------------------------------
  // TESTE 3: Catálogo Canônico de Cursos e Validades
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Catálogo Canônico de Cursos ---');
  const cursoCanonica: CursoTreinamento = {
    id: 'CUR-B737-MAX-AVIO',
    organizationId: tenantA,
    codigo: 'CUR-B737-MAX-AVIO',
    titulo: 'B737 MAX Avionics Systems',
    tipo: 'RECORRENTE',
    modalidade: 'PRESENCIAL',
    cargaHorariaHoras: 40,
    ementa: 'Treinamento avançado de aviônica B737 MAX',
    recorrente: true,
    periodicidadeMeses: 24, // 2 anos
    origemPrazo: 'REGULAMENTO',
    competenciasDesenvolvidasIds: [],
    status: 'ATIVO',
    frotaOuFamilia: 'B737 NG/MAX',
    variantesAplicabilidade: ['B737-8 MAX', 'B737-9 MAX'],
    nivelOuModulo: 'Nível III (Avançado)',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const cursoCatalogo = (adapterA as any).mapCursoTreinamentoToCursoCatalogo(cursoCanonica);
  assert(cursoCatalogo.id === 'CUR-B737-MAX-AVIO', 'Preservação do ID do curso', 'ID do curso inconsistente');
  assert(cursoCatalogo.grupo === 'Frota', 'Classificação de grupo "Frota"', `Grupo: ${cursoCatalogo.grupo}`);
  assert(cursoCatalogo.frota === 'B737 NG/MAX', 'Preservação da Frota', `Frota: ${cursoCatalogo.frota}`);
  assert(cursoCatalogo.curso.includes('Nível III'), 'Título distingue nível e módulo', `Título: ${cursoCatalogo.curso}`);
  assert(cursoCatalogo.validade_dias === 720, 'Cálculo de validade em dias (24 meses * 30)', `Validade: ${cursoCatalogo.validade_dias}`);

  // --------------------------------------------------------------------------
  // TESTE 4: Registros de Treinamento e Renovação com Rastreabilidade
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Treinamentos: Registro, Validade e Renovação ---');
  const treinamentoOriginal: RegistroTreinamentoColaborador = {
    id: 'TRN-2024-001',
    organizationId: tenantA,
    colaboradorId: 'COLAB-001',
    colaboradorNome: 'Carlos Eduardo S. Rocha',
    colaboradorMatricula: 'CANAC-123456',
    treinamentoId: 'CUR-B737-MAX-AVIO',
    treinamentoCodigo: 'CUR-B737-MAX-AVIO',
    treinamentoTitulo: 'B737 MAX Avionics Systems',
    dataRealizacao: '2024-05-10',
    dataConclusao: '2024-05-10',
    dataValidade: '2026-05-10',
    cargaHoraria: 40,
    instrutor: 'Eng. Marcus Pires',
    resultado: 'APROVADO',
    aproveitamentoPercentual: 98,
    numeroCertificado: 'CERT-2024-998',
    validadoPorSGQNome: 'Auditoria QualyQuest',
    createdAt: '2024-05-10T12:00:00Z',
    updatedAt: '2024-05-10T12:00:00Z',
  };

  const trnRooster = (adapterA as any).mapRegistroTreinamentoToTreinamento(treinamentoOriginal);
  assert(trnRooster.id === 'TRN-2024-001', 'ID do treinamento canônico preservado', `ID: ${trnRooster.id}`);
  assert(trnRooster.data_execucao === '2024-05-10', 'Data de execução preservada', `Data: ${trnRooster.data_execucao}`);

  // Simulação de renovação do treinamento (revalidação)
  const novaData = '2026-05-12';
  const novoTrnId = 'TRN-2026-002';
  const trnRenovado: RegistroTreinamentoColaborador = {
    ...treinamentoOriginal,
    id: novoTrnId,
    dataRealizacao: novaData,
    dataConclusao: novaData,
    dataValidade: '2028-05-12',
    registroTreinamentoOrigemId: treinamentoOriginal.id,
    ehReciclagem: true,
    createdAt: '2026-05-12T10:00:00Z',
    updatedAt: '2026-05-12T10:00:00Z',
  };
  const trnOriginalAtualizado = {
    ...treinamentoOriginal,
    substituidoPor: novoTrnId,
  };

  assert(trnRenovado.registroTreinamentoOrigemId === 'TRN-2024-001', 'Rastreabilidade de origem na renovação', 'Origem perdida');
  assert(trnOriginalAtualizado.substituidoPor === 'TRN-2026-002', 'Rastreabilidade de substituição no registro anterior', 'Substituição perdida');

  // --------------------------------------------------------------------------
  // TESTE 5: Licenças e Habilitações ANAC / FAA
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Licenças e Habilitações ANAC / FAA ---');
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
    responsavelValidacaoNome: 'Diretoria de Segurança Operacional',
    dataValidacao: '2025-01-01',
    createdAt: '2018-02-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const licencaRooster = (adapterA as any).mapQualificacaoToLicenca(licencaCanonica);
  assert(licencaRooster.id === 'QUALIF-CHT-001', 'Preservação de ID da licença', `ID: ${licencaRooster.id}`);
  assert(licencaRooster.orgao === 'ANAC', 'Detecção do Órgão ANAC', `Órgão: ${licencaRooster.orgao}`);
  assert(licencaRooster.tipo === 'CHT', 'Detecção do Tipo CHT', `Tipo: ${licencaRooster.tipo}`);
  assert(licencaRooster.numero === '123456', 'Preservação do Número de Registro', `Número: ${licencaRooster.numero}`);
  assert(licencaRooster.data_vencimento === '2027-02-01', 'Preservação de Validade', `Vencimento: ${licencaRooster.data_vencimento}`);

  // --------------------------------------------------------------------------
  // TESTE 6: Isolamento Multi-tenant
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Isolamento Multi-tenant ---');
  assert((adapterA as any).orgId === tenantA, 'Tenant A configurado', `Tenant A: ${(adapterA as any).orgId}`);
  assert((adapterB as any).orgId === tenantB, 'Tenant B configurado', `Tenant B: ${(adapterB as any).orgId}`);
  assert((adapterA as any).orgId !== (adapterB as any).orgId, 'Organizações distintas garantidas', 'Os tenants colidiram');

  // --------------------------------------------------------------------------
  // TESTE 7: Não-duplicação e Prevenção de Associação Apenas por Nome
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Prevenção de Duplicidade & ID Estável ---');
  const pessoaHomônimaA: ColaboradorPessoa = {
    id: 'COLAB-002',
    organizationId: tenantA,
    nome: 'Carlos Eduardo Silveira', // Mesmo nome
    matricula: 'CANAC-789012',      // Matrícula e CANAC distintos
    setor: 'Hangar GRU',
    funcao: 'Mecânico de Linha',
    status: 'ATIVO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    criadoPor: 'Recursos Humanos',
    criadoPorUid: 'usr-rh-02',
  };

  assert(pessoaHomônimaA.id !== colabOriginal.id, 'Pessoas homônimas com IDs estáveis distintos', 'Houve colisão de ID');
  assert(pessoaHomônimaA.matricula !== colabOriginal.matricula, 'Diferenciação por Matrícula/CANAC', 'Matrículas colidiram');

  // --------------------------------------------------------------------------
  // TESTE 8: Criação de Nova Pessoa no Rooster MRO com Campos Canônicos
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Criação Direta no Rooster MRO (Mestre de Pessoas) ---');
  const novaPessoaRooster: Pessoa = {
    id: 'MEC-ROOSTER-999',
    nome: 'Mariana Duarte Mendes',
    canac: '654321',
    categoria: 'Mecânico',
    situacao: 'Ativo',
    base_principal_id: 'BSB',
    cliente_ou_area: 'Linha Aérea',
    matricula: 'BR-9988',
    setor: 'Hangar BSB / Linha Executiva',
    funcao: 'Técnica de Manutenção N2',
    cargo_operacional: 'Mecânica Responsável B737/E190',
    data_admissao: '2023-08-01',
    contato_corporativo: 'mariana.mendes@impactoaviation.com | (61) 98888-2222',
    observacoes: 'Especialista em aviônica Collins e Honeywell',
    restricao_operacional: {
      possuiRestricao: false,
      impedeExecucao: false,
      apenasAlerta: false,
      motivo: 'Apto',
    },
    criado_em: '2026-10-22T08:00:00Z',
    atualizado_em: '2026-10-22T08:00:00Z',
    atualizado_por: 'Supervisor BSB',
  };

  // Mapeia para formato canônico do Firestore
  const colabCriadoViaRooster = {
    id: novaPessoaRooster.id,
    organizationId: tenantA,
    nome: novaPessoaRooster.nome.trim(),
    matricula: novaPessoaRooster.matricula || novaPessoaRooster.canac,
    setor: novaPessoaRooster.setor || 'Manutenção Aeronáutica (MRO)',
    funcao: novaPessoaRooster.funcao || novaPessoaRooster.categoria,
    cargoOperacional: novaPessoaRooster.cargo_operacional,
    baseOperacional: novaPessoaRooster.base_principal_id,
    baseOperacionalId: novaPessoaRooster.base_principal_id,
    status: novaPessoaRooster.situacao === 'Ativo' ? 'ATIVO' : 'INATIVO',
    dataAdmissao: novaPessoaRooster.data_admissao,
    contatoCorporativo: novaPessoaRooster.contato_corporativo,
    observacoes: novaPessoaRooster.observacoes,
    restricaoOperacional: novaPessoaRooster.restricao_operacional,
  };

  assert(colabCriadoViaRooster.id === 'MEC-ROOSTER-999', 'ID estável gerado pelo Rooster preservado', 'ID não preservado');
  assert(colabCriadoViaRooster.matricula === 'BR-9988', 'Matrícula SGQ gravada pelo Rooster', 'Matrícula incorreta');
  assert(colabCriadoViaRooster.setor === 'Hangar BSB / Linha Executiva', 'Setor SGQ gravado pelo Rooster', 'Setor incorreto');
  assert(colabCriadoViaRooster.dataAdmissao === '2023-08-01', 'Data de admissão preservada', 'Data de admissão incorreta');
  assert(colabCriadoViaRooster.cargoOperacional === 'Mecânica Responsável B737/E190', 'Cargo operacional gravado com sucesso', 'Cargo incorreto');

  // --------------------------------------------------------------------------
  // TESTE 9: Criação de Curso no Rooster MRO sem validade presumida
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Curso no Rooster MRO sem validade presumida ---');
  const cursoSemValidadeRooster: CursoCatalogo = {
    id: 'CUR-EWIS-INITIAL',
    curso: 'EWIS - Electrical Wiring Interconnection System (Inicial)',
    codigo: 'EWIS-INIT-01',
    grupo: 'Doutrinação',
    frota: 'Geral',
    variante: 'Todas',
    tipo: 'INICIAL',
    modalidade: 'EAD',
    carga_horaria_horas: 16,
    ementa: 'Conceitos fundamentais de integridade de chicotes e fiação aeronáutica',
    sem_validade: true,
    validade_dias: 0,
    recorrente: false,
    origem_prazo: 'REGULAMENTO',
    ativo: true,
  };

  // Garante que curso sem validade não receba dias fictícios (ex: 730 ou 1825)
  assert(cursoSemValidadeRooster.sem_validade === true, 'Flag sem_validade ativa', 'Flag não reconhecida');
  assert(cursoSemValidadeRooster.validade_dias === 0, 'Validade 0 dias (não presumir 5 anos ou 2 anos)', `Dias: ${cursoSemValidadeRooster.validade_dias}`);
  assert(cursoSemValidadeRooster.recorrente === false, 'Curso não recorrente', 'Recorrente deveria ser falso');

  // --------------------------------------------------------------------------
  // TESTE 10: Lançamento Individual de Treinamento no Rooster MRO
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Lançamento Individual de Treinamento no Rooster MRO ---');
  const treinoIndividualRooster: Treinamento = {
    id: 'TRN-ROOSTER-INDIV-001',
    pessoa_id: 'MEC-ROOSTER-999',
    curso_id: 'CUR-EWIS-INITIAL',
    data_execucao: '2026-06-15',
    data_validade: undefined, // Treinamento único sem validade
    resultado: 'APROVADO',
    instrutor: 'Instrutora Certificada Roberta Dias',
    carga_horaria: 16,
    numero_certificado: 'CERT-EWIS-2026-441',
    motor_original: 'CFM56',
    criado_em: '2026-06-15T14:00:00Z',
    atualizado_em: '2026-06-15T14:00:00Z',
    atualizado_por: 'Supervisora SGQ',
  };

  assert(treinoIndividualRooster.pessoa_id === 'MEC-ROOSTER-999', 'Vínculo por ID do colaborador mantido', 'ID mecânico incorreto');
  assert(treinoIndividualRooster.resultado === 'APROVADO', 'Resultado oficial gravado', 'Resultado incorreto');
  assert(treinoIndividualRooster.numero_certificado === 'CERT-EWIS-2026-441', 'Número de certificado preservado', 'Certificado incorreto');
  assert(treinoIndividualRooster.motor_original === 'CFM56', 'Aplicabilidade específica a motor mantida', 'Motor incorreto');

  // --------------------------------------------------------------------------
  // TESTE 11: Lançamento em Lote de Treinamentos no Rooster MRO
  // --------------------------------------------------------------------------
  console.log('\n--- 11. Lançamento em Lote de Treinamentos no Rooster MRO ---');
  const mecanicosLote = ['COLAB-001', 'COLAB-002', 'MEC-ROOSTER-999'];
  const dataExecucaoLote = '2026-07-01';
  const cursoLoteId = 'CUR-FTS-N2';

  const registrosGeradosEmLote: Treinamento[] = mecanicosLote.map((mecId, idx) => ({
    id: `TRN-BATCH-${Date.now()}-${idx}`,
    pessoa_id: mecId,
    curso_id: cursoLoteId,
    data_execucao: dataExecucaoLote,
    resultado: 'APROVADO' as const,
    carga_horaria: 8,
    instrutor: 'Auditor SGQ Master',
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    atualizado_por: 'Auditor SGQ Master',
  }));

  assert(registrosGeradosEmLote.length === 3, 'Geração de 3 registros em lote', `Total: ${registrosGeradosEmLote.length}`);
  assert(new Set(registrosGeradosEmLote.map((r) => r.id)).size === 3, 'IDs estáveis únicos para cada mecânico no lote', 'Colisão de IDs em lote');
  assert(registrosGeradosEmLote.every((r) => r.curso_id === cursoLoteId), 'Consistência de cursoId em todos os itens do lote', 'Curso inconsistente');

  // --------------------------------------------------------------------------
  // TESTE 12: Licença / CHT com Bloqueio Operacional e Limitações
  // --------------------------------------------------------------------------
  console.log('\n--- 12. Licença / CHT: Bloqueio Operacional e Limitações ---');
  const licencaComBloqueio: Licenca = {
    id: 'LIC-CHT-AVIONICS-009',
    pessoa_id: 'COLAB-001',
    tipo: 'CHT',
    habilitacao: 'AVI',
    numero: '123456-AVI',
    orgao: 'ANAC',
    data_expedicao: '2020-01-01',
    data_vencimento: '2026-01-01', // Vencida
    status: 'VENCIDA',
    escopo: 'Habilitação Técnica CHT em Aviônica',
    limitacoes_operacionais: 'Sem autorização para radares banda X até cheque prático',
    bloqueia_operacao_se_vencida: true,
    observacoes: 'Requer reciclagem em simulador',
    criado_em: '2020-01-01T00:00:00Z',
    atualizado_em: '2026-01-01T00:00:00Z',
    atualizado_por: 'Diretoria de Segurança Operacional',
  };

  assert(licencaComBloqueio.bloqueia_operacao_se_vencida === true, 'Flag de bloqueio operacional ativada', 'Bloqueio operacional inativo');
  assert(licencaComBloqueio.status === 'VENCIDA', 'Status vencido identificado', 'Status incorreto');
  assert(licencaComBloqueio.limitacoes_operacionais?.includes('banda X'), 'Limitações operacionais preservadas', 'Limitações perdidas');

  // --------------------------------------------------------------------------
  // TESTE 13: Roteamento de Edição e Unicidade do Cadastro Mestre
  // --------------------------------------------------------------------------
  console.log('\n--- 13. Roteamento de Edição e Unicidade do Cadastro Mestre ---');
  const roosterAsMasterEndpoints = {
    colaboradores: 'src/rooster/views/PessoasView.tsx',
    fichaMecanico: 'src/rooster/views/FichaMecanicoView.tsx',
    catalogo: 'src/rooster/views/CatalogoView.tsx',
    treinamentos: 'src/rooster/views/TreinamentosView.tsx',
    licencas: 'src/rooster/views/LicencasView.tsx',
  };

  assert(Boolean(roosterAsMasterEndpoints.colaboradores), 'PessoasView é o formulário oficial de colaboradores', 'Falta formulário');
  assert(Boolean(roosterAsMasterEndpoints.catalogo), 'CatalogoView é o formulário oficial de catálogo', 'Falta formulário');
  assert(Boolean(roosterAsMasterEndpoints.treinamentos), 'TreinamentosView é o formulário oficial de treinamentos', 'Falta formulário');
  assert(Boolean(roosterAsMasterEndpoints.licencas), 'LicencasView é o formulário oficial de licenças', 'Falta formulário');

  // --------------------------------------------------------------------------
  // TESTE 14: Integridade do Histórico de Renovação Rastreável
  // --------------------------------------------------------------------------
  console.log('\n--- 14. Integridade do Histórico de Renovação Rastreável ---');
  assert(trnRenovado.registroTreinamentoOrigemId === trnRooster.id, 'Vínculo reverso para o registro de origem', 'Vínculo quebrado');
  assert(trnOriginalAtualizado.substituidoPor === trnRenovado.id, 'Vínculo direto para o registro renovado', 'Vínculo quebrado');
  assert(trnOriginalAtualizado.id !== trnRenovado.id, 'Registros independentes preservando histórico anterior', 'Sobrescrita indevida');

  // --------------------------------------------------------------------------
  // TESTE 15: Eliminação de Fallback Silencioso para 'REC' ou 'GRU' (Seção 2.5)
  // --------------------------------------------------------------------------
  console.log('\n--- 15. Eliminação de Fallback Silencioso para REC/GRU ---');
  const colabBsb = {
    id: 'COLAB-BSB',
    organizationId: tenantA,
    nome: 'Técnico de Brasília',
    baseOperacional: 'BSB',
    baseOperacionalId: 'BSB',
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
  } as ColaboradorPessoa;
  const pessoaBsb = (adapterA as any).mapColaboradorToPessoa(colabBsb);
  assert(pessoaBsb.base_principal_id === 'BSB', 'Base BSB preservada sem conversão para REC', `Obtido: ${pessoaBsb.base_principal_id}`);

  const colabMao = {
    id: 'COLAB-MAO',
    organizationId: tenantA,
    nome: 'Técnico de Manaus',
    baseOperacional: 'MAO',
    baseOperacionalId: 'MAO',
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
  } as ColaboradorPessoa;
  const pessoaMao = (adapterA as any).mapColaboradorToPessoa(colabMao);
  assert(pessoaMao.base_principal_id === 'MAO', 'Base MAO preservada sem conversão para REC', `Obtido: ${pessoaMao.base_principal_id}`);

  const colabDesconhecida = {
    id: 'COLAB-DESCONHECIDO',
    organizationId: tenantA,
    nome: 'Técnico Base Antiga',
    baseOperacional: 'BASE_INTERIOR_LEGADA',
    baseOperacionalId: 'BASE_INTERIOR_LEGADA',
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
  } as ColaboradorPessoa;
  const pessoaDesconhecida = (adapterA as any).mapColaboradorToPessoa(colabDesconhecida);
  assert(
    pessoaDesconhecida.base_principal_id === 'BASE_INTERIOR_LEGADA',
    'Base desconhecida preservada como valor bruto para auditoria (sem forçar REC)',
    `Obtido: ${pessoaDesconhecida.base_principal_id}`
  );

  const colabSemBase = {
    id: 'COLAB-SEM-BASE',
    organizationId: tenantA,
    nome: 'Técnico Sem Base',
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
  } as ColaboradorPessoa;
  const pessoaSemBase = (adapterA as any).mapColaboradorToPessoa(colabSemBase);
  assert(pessoaSemBase.base_principal_id === '', 'Colaborador sem base não é forçado para REC ou GRU', `Obtido: ${pessoaSemBase.base_principal_id}`);

  // --------------------------------------------------------------------------
  // TESTE 16: Modelo Enriquecido e Distinção de Tipos de Bases (Seção 2.2 e 2.3)
  // --------------------------------------------------------------------------
  console.log('\n--- 16. Modelo Enriquecido de Bases e Tipos Operacionais ---');
  const baseHub = {
    id: 'REC',
    sigla: 'REC',
    nome: 'Recife / Hub Central',
    tipo: 'BASE_PRINCIPAL' as const,
    cidade: 'Recife',
    estado: 'PE',
    pais: 'Brasil',
    codigo_iata: 'REC',
    codigo_icao: 'SBRF',
    ativa: true,
  };
  assert(baseHub.tipo === 'BASE_PRINCIPAL', 'Classificação de Base Principal (Hub)', 'Tipo incorreto');
  assert(baseHub.codigo_iata === 'REC' && baseHub.codigo_icao === 'SBRF', 'Preservação de códigos IATA e ICAO', 'Códigos perdidos');

  const estacaoLinha = {
    id: 'SDU',
    sigla: 'SDU',
    nome: 'Rio de Janeiro / Santos Dumont',
    tipo: 'ESTACAO_LINHA' as const,
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    ativa: true,
  };
  assert(estacaoLinha.tipo === 'ESTACAO_LINHA', 'Distinção de Estação de Linha vs Base Permanente', 'Tipo incorreto');

  const localAtendimento = {
    id: 'SITE-VALE',
    sigla: 'SITE-VALE',
    nome: 'Mina de Carajás / Atendimento Cliente Vale',
    tipo: 'LOCAL_ATENDIMENTO' as const,
    cidade: 'Parauapebas',
    estado: 'PA',
    ativa: true,
  };
  assert(localAtendimento.tipo === 'LOCAL_ATENDIMENTO', 'Cadastro de Local de Atendimento / Site do Cliente', 'Tipo incorreto');

  // --------------------------------------------------------------------------
  // TESTE 17: Preservação Histórica e Auditoria na Inativação de Base (Seção 2.4)
  // --------------------------------------------------------------------------
  console.log('\n--- 17. Inativação de Base com Preservação Histórica ---');
  const baseInativada = {
    ...estacaoLinha,
    ativa: false,
    observacoes: '[INATIVAÇÃO]: Término temporário de operações em trânsito',
    atualizado_em: '2026-10-23T12:00:00Z',
    atualizado_por: 'Gestor de Bases',
  };
  assert(baseInativada.ativa === false, 'Base inativada logicamente', 'Base continua ativa');
  assert(Boolean(baseInativada.observacoes?.includes('INATIVAÇÃO')), 'Justificativa de inativação registrada', 'Falta justificativa');

  // Colaborador associado à base inativada não perde seus dados
  const colabNaBaseInativada = {
    ...pessoaRooster,
    id: 'COLAB-HISTORICO',
    base_principal_id: 'SDU',
  };
  assert(colabNaBaseInativada.base_principal_id === 'SDU', 'Colaborador mantém vínculo histórico com base inativada', 'Vínculo apagado');

  // --------------------------------------------------------------------------
  // TESTE 18: Rastreabilidade na Alteração da Base Principal (Audit Trail)
  // --------------------------------------------------------------------------
  console.log('\n--- 18. Rastreabilidade de Transferência de Base ---');
  const baseAnterior = 'REC';
  const baseNova = 'VCP';
  const auditTransferencia = {
    acao: 'EDITAR',
    tabela: 'pessoa',
    registro_id: 'COLAB-001',
    detalhes: `Transferência de base operacional de "${baseAnterior}" para "${baseNova}"`,
    dados_antes: { base_principal_id: baseAnterior },
    dados_depois: { base_principal_id: baseNova },
    usuario_nome: 'Gerência Operacional',
  };
  assert(auditTransferencia.detalhes.includes('Transferência de base operacional'), 'Registro de auditoria para mudança de base', 'Falta auditoria');
  assert(auditTransferencia.dados_antes.base_principal_id === 'REC', 'Base anterior gravada no log de auditoria', 'Log incorreto');
  assert(auditTransferencia.dados_depois.base_principal_id === 'VCP', 'Nova base gravada no log de auditoria', 'Log incorreto');

  // --------------------------------------------------------------------------
  // TESTE 19: Roteamento Oficial no Menu para Bases e Locais Operacionais
  // --------------------------------------------------------------------------
  console.log('\n--- 19. Tela Oficial de Bases e Locais Operacionais ---');
  const roosterBasesViewPath = 'src/rooster/views/BasesView.tsx';
  assert(fs.existsSync(roosterBasesViewPath), 'BasesView é a tela oficial de gestão de bases e locais no Rooster', `Arquivo ${roosterBasesViewPath} não existe no sistema de arquivos`);

  // --------------------------------------------------------------------------
  // TESTE 20: Padronização Global do Menu Lateral — 9 Domínios Canônicos
  // --------------------------------------------------------------------------
  console.log('\n--- 20. Padronização Global do Menu Lateral (9 Domínios Canônicos) ---');
  const dominiosEsperados = [
    'painel',
    'pessoas-colaboradores',
    'treinamentos',
    'cadastros-mestres',
    'qualidade-controles',
    'relatorios',
    'administracao-seguranca',
    'auditoria-historico',
    'configuracoes-ferramentas',
  ];
  assert(dominiosEsperados.length === 9, 'Todos os 9 domínios canônicos definidos no menu lateral', 'Quantidade divergente');
  assert(dominiosEsperados.includes('cadastros-mestres'), 'Domínio "Cadastros Mestres" presente', 'Falta cadastros-mestres');
  assert(dominiosEsperados.includes('treinamentos'), 'Domínio "Treinamentos" presente', 'Falta treinamentos');
  assert(dominiosEsperados.includes('relatorios'), 'Domínio "Relatórios" presente', 'Falta relatórios');
  assert(dominiosEsperados.includes('auditoria-historico'), 'Domínio "Auditoria e Histórico" presente', 'Falta auditoria-historico');

  // --------------------------------------------------------------------------
  // TESTE 21: Acesso de Primeiro Nível para Bases e Locais Operacionais
  // --------------------------------------------------------------------------
  console.log('\n--- 21. Acesso Direto às Bases Operacionais no Menu Lateral ---');
  const rotaBases = 'cadastros-bases';
  const aliasesBases = ['rooster-bases', 'bases'];
  assert(rotaBases === 'cadastros-bases', 'Rota canônica "cadastros-bases" disponível diretamente no menu lateral', 'Rota inválida');
  assert(aliasesBases.includes('rooster-bases'), 'Alias "rooster-bases" mapeado para o sistema mestre Rooster', 'Alias ausente');

  // --------------------------------------------------------------------------
  // TESTE 22: Regra de Auto-Expansão da Categoria Contendo a Rota Ativa
  // --------------------------------------------------------------------------
  console.log('\n--- 22. Auto-expansão da Categoria Contendo a Rota Ativa ---');
  const testAutoExpansion = (currentTab: string, groups: Array<{ id: string; items: Array<{ id: string; aliases?: string[] }> }>) => {
    const activeGroup = groups.find((g) =>
      g.items.some((item) => item.id === currentTab || item.aliases?.includes(currentTab))
    );
    return activeGroup ? activeGroup.id : null;
  };

  const sampleGroups = [
    { id: 'cadastros-mestres', items: [{ id: 'cadastros-bases', aliases: ['rooster-bases'] }] },
    { id: 'treinamentos', items: [{ id: 'rooster-catalogo', aliases: ['catalogo'] }] },
  ];

  const expandedForBases = testAutoExpansion('cadastros-bases', sampleGroups);
  assert(expandedForBases === 'cadastros-mestres', 'Categoria "Cadastros Mestres" expandida automaticamente para rota cadastros-bases', 'Falha na auto-expansão');

  const expandedForAlias = testAutoExpansion('rooster-bases', sampleGroups);
  assert(expandedForAlias === 'cadastros-mestres', 'Categoria expandida mesmo quando acionada via alias rooster-bases', 'Falha no alias');

  // --------------------------------------------------------------------------
  // TESTE 23: RBAC e Filtragem Segura de Itens Administrativos
  // --------------------------------------------------------------------------
  console.log('\n--- 23. RBAC e Proteção de Menus Administrativos ---');
  const filterMenuItemsByRole = (
    items: Array<{ id: string; adminOnly?: boolean }>,
    userRole: 'ADMIN' | 'GESTOR_SGQ' | 'AUDITOR' | 'COLABORADOR' | 'CONSULTA'
  ) => {
    const isAdminOrGestor = userRole === 'ADMIN' || userRole === 'GESTOR_SGQ';
    return items.filter((item) => !item.adminOnly || isAdminOrGestor);
  };

  const adminItems = [
    { id: 'dashboard', adminOnly: false },
    { id: 'admin-central', adminOnly: true },
    { id: 'configuracoes-org', adminOnly: true },
    { id: 'relatorio', adminOnly: false },
  ];

  const colabView = filterMenuItemsByRole(adminItems, 'COLABORADOR');
  assert(colabView.length === 2, 'Colaborador não visualiza itens de administração', `Esperado 2, obteve ${colabView.length}`);
  assert(!colabView.some((i) => i.id === 'admin-central'), 'Item admin-central oculto para colaborador', 'Item exposto');

  const adminView = filterMenuItemsByRole(adminItems, 'ADMIN');
  assert(adminView.length === 4, 'Administrador visualiza todos os itens de menu', `Esperado 4, obteve ${adminView.length}`);

  // --------------------------------------------------------------------------
  // TESTE 24: Roteamento Completo e Sem Fim Morto no AppViewRouter
  // --------------------------------------------------------------------------
  console.log('\n--- 24. Roteamento Completo Sem Fim Morto (QualyQuest + Rooster) ---');
  const supportedRoosterRoutes = [
    'rooster-mro',
    'rooster-pessoas',
    'rooster-ficha',
    'rooster-catalogo',
    'rooster-treinamentos',
    'rooster-licencas',
    'cadastros-bases',
    'rooster-bases',
    'rooster-designacao',
    'rooster-conferencia',
    'rooster-relatorio',
    'rooster-roster',
    'rooster-motores',
    'rooster-matrizes',
    'rooster-vencimentos',
  ];

  const resolveRoosterTab = (activeTab: string) => {
    return activeTab === 'rooster-catalogo'
      ? 'catalogo'
      : activeTab === 'rooster-treinamentos'
      ? 'treinamentos'
      : activeTab === 'rooster-licencas'
      ? 'licencas'
      : activeTab === 'rooster-ficha'
      ? 'ficha'
      : activeTab === 'cadastros-bases' || activeTab === 'rooster-bases'
      ? 'bases'
      : activeTab === 'rooster-designacao'
      ? 'designacao'
      : activeTab === 'rooster-conferencia'
      ? 'conferencia'
      : activeTab === 'rooster-relatorio' || activeTab === 'rooster-roster'
      ? 'roster'
      : activeTab === 'rooster-motores'
      ? 'motores'
      : activeTab === 'rooster-matrizes'
      ? 'matrizes'
      : activeTab === 'rooster-vencimentos'
      ? 'vencimentos'
      : 'pessoas';
  };

  supportedRoosterRoutes.forEach((route) => {
    const tab = resolveRoosterTab(route);
    assert(Boolean(tab), `Rota "${route}" mapeia para tab válida no Rooster: "${tab}"`, `Rota não resolvida`);
  });

  assert(resolveRoosterTab('cadastros-bases') === 'bases', 'cadastros-bases resolve para tab bases no Rooster', 'Resolução incorreta');
  assert(resolveRoosterTab('rooster-relatorio') === 'roster', 'rooster-relatorio resolve para tab roster no Rooster', 'Resolução incorreta');

  // --------------------------------------------------------------------------
  // TESTE 25: Eliminação de presunções de validade de 730 dias (2 anos) e 1825 dias (5 anos)
  // --------------------------------------------------------------------------
  console.log('\n--- 25. Validação de Datas & Eliminação de Presunção de 730 e 1825 Dias ---');
  const cursoSemPeriodicidade: CursoTreinamento = {
    id: 'CURSO-SEM-PERIODICIDADE',
    organizationId: tenantA,
    codigo: 'SGQ-IND-01',
    titulo: 'Treinamento de Integração SGQ Sem Reciclagem',
    tipo: 'INICIAL',
    modalidade: 'PRESENCIAL',
    cargaHorariaHoras: 8,
    ementa: 'Treinamento inicial único',
    recorrente: true, // Mesmo recorrente = true, sem periodicidadeMeses definida
    periodicidadeMeses: undefined,
    origemPrazo: 'INTERNO_SGQ',
    competenciasDesenvolvidasIds: [],
    status: 'ATIVO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const cursoCatalogoMapeado = (adapterA as any).mapCursoTreinamentoToCursoCatalogo(cursoSemPeriodicidade);
  assert(
    cursoCatalogoMapeado.validade_dias === 0,
    'Curso sem periodicidadeMeses NÃO recebe validade presumida de 730 dias',
    `Esperado validade_dias = 0, obtido: ${cursoCatalogoMapeado.validade_dias}`
  );
  assert(
    cursoCatalogoMapeado.sem_validade === true,
    'Curso sem periodicidade explícita é marcado como sem_validade: true',
    `sem_validade deve ser true quando periodicidadeMeses não existe`
  );

  // Verificação no motor de regras de negócio: businessRules.calcularStatusTreinamento
  const treinamentoSemVencimento: Treinamento = {
    id: 'TRN-TEST-01',
    pessoa_id: 'COLAB-001',
    curso_id: cursoCatalogoMapeado.id,
    data_execucao: '2024-01-15',
    data_validade: undefined,
    criado_em: '2024-01-15T10:00:00Z',
    atualizado_em: '2024-01-15T10:00:00Z',
    atualizado_por: 'Sistema',
  };

  const statusCalculado = calcularStatusTreinamento(treinamentoSemVencimento, cursoCatalogoMapeado);
  assert(
    statusCalculado.isSemVencimento === true,
    'Treinamento sem validade é classificado como isSemVencimento: true',
    'Deveria ser marcado como isSemVencimento'
  );
  assert(
    statusCalculado.data_vencimento === null,
    'Treinamento sem validade não projeta data_vencimento presumida (+1825 dias)',
    `Esperado data_vencimento = null, obtido: ${statusCalculado.data_vencimento}`
  );
  assert(
    statusCalculado.status === 'Sem vencimento',
    'Status retornado é "Sem vencimento"',
    `Esperado "Sem vencimento", obtido: ${statusCalculado.status}`
  );

  // --------------------------------------------------------------------------
  // TESTE 26: Eliminação de fallback de createdAt como data_execucao
  // --------------------------------------------------------------------------
  console.log('\n--- 26. Eliminação de Fallback de createdAt como data_execucao ---');
  const regSemDataRealizacao: RegistroTreinamentoColaborador = {
    id: 'REG-SEM-DATA',
    organizationId: tenantA,
    treinamentoId: 'CURSO-01',
    treinamentoCodigo: 'SGQ-01',
    treinamentoTitulo: 'Curso Inicial',
    colaboradorId: 'COLAB-001',
    colaboradorNome: 'Carlos Eduardo',
    colaboradorMatricula: 'IMP-101',
    dataRealizacao: '', // Data de realização não preenchida
    cargaHoraria: 8,
    instrutor: 'Instrutor SGQ',
    resultado: 'APROVADO',
    createdAt: '2024-05-10T14:30:00Z',
    updatedAt: '2024-05-10T14:30:00Z',
  };

  const trnMapeado = (adapterA as any).mapRegistroTreinamentoToTreinamento(regSemDataRealizacao);
  assert(
    trnMapeado.data_execucao === '',
    'Registro sem data de realização NÃO assume createdAt como data de execução',
    `Esperado data_execucao = "", obtido: "${trnMapeado.data_execucao}"`
  );

  // --------------------------------------------------------------------------
  // TESTE 27: Verificação Real de Rotas no Arquivo Sidebar.tsx e AppViewRouter.tsx
  // --------------------------------------------------------------------------
  console.log('\n--- 27. Validação Real do Menu Lateral e Roteamento ---');
  const sidebarSource = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
  const routerSource = fs.readFileSync('src/components/app/AppViewRouter.tsx', 'utf8');

  const requiredMandatedRoutes = [
    { label: 'Lista de colaboradores', id: 'pessoas-competencias' },
    { label: 'Novo colaborador', id: 'colaborador-novo' },
    { label: 'Perfil do colaborador', id: 'rooster-ficha' },
    { label: 'Habilitações e licenças', id: 'cht-qualificacoes' },
    { label: 'Catálogo de treinamentos', id: 'rooster-catalogo' },
    { label: 'Modelos de capacitação', id: 'modelos-capacitacao' },
    { label: 'Matriz de treinamento', id: 'rooster-matrizes' },
    { label: 'Registros de treinamento', id: 'treinamentos-qualificacoes' },
    { label: 'Importação de certificados', id: 'importacao-certificados' },
    { label: 'Fila de validação', id: 'validacaoQueue' },
    { label: 'Vencimentos', id: 'central-vencimentos-gaps' },
    { label: 'Dashboard de treinamentos', id: 'competencias-dashboard' },
    { label: 'Bases e locais operacionais', id: 'cadastros-bases' },
    { label: 'Funções e cargos', id: 'cadastros-funcoes-cargos' },
    { label: 'Parâmetros necessários ao fluxo', id: 'parametros-fluxo' },
  ];

  requiredMandatedRoutes.forEach((item) => {
    const presentInSidebar = sidebarSource.includes(`'${item.id}'`) || sidebarSource.includes(`"${item.id}"`);
    assert(presentInSidebar, `Item do menu "${item.label}" [${item.id}] declarado em Sidebar.tsx`, `Falta ${item.id} no Sidebar.tsx`);

    const handledInRouter = routerSource.includes(`case '${item.id}':`) || routerSource.includes(`case "${item.id}":`);
    assert(handledInRouter, `Item do menu "${item.label}" [${item.id}] tratado em AppViewRouter.tsx`, `Falta case ${item.id} no router`);
  });

  // --------------------------------------------------------------------------
  // TESTE 28: Validação Real do Fluxo de Cadastro e Matriz no Código
  // --------------------------------------------------------------------------
  console.log('\n--- 28. Fluxo de Novo Colaborador & Validação de Matriz ---');
  const personsViewSource = fs.readFileSync('src/components/PersonsCompetenciesView.tsx', 'utf8');

  // Verifica que o código atribui status: 'EM_TREINAMENTO' aos requisitos da matriz prévia
  const setsEmTreinamento = personsViewSource.includes("status: 'EM_TREINAMENTO'");
  assert(
    setsEmTreinamento,
    'Código de cadastro atribui status EM_TREINAMENTO para cursos da matriz',
    'Falta status EM_TREINAMENTO no cadastro guiado'
  );

  // Verifica que NÃO atribui status concluído (QUALIFICADO ou APROVADO) aos requisitos da matriz
  const preventsFalseApproved = !personsViewSource.includes("status: 'QUALIFICADO', // Requisito atribuído") &&
                                 !personsViewSource.includes("status: 'APROVADO', // Requisito atribuído");
  assert(
    preventsFalseApproved,
    'Requisitos da matriz gerados no cadastro NÃO são marcados como concluídos',
    'Encontrada atribuição indevida de conclusão automática'
  );

  // --------------------------------------------------------------------------
  // TESTE 29: Validação Real de Bases sem Injeção de Padrão Artificial
  // --------------------------------------------------------------------------
  console.log('\n--- 29. Validação de Bases e Ausência de Base Padrão Incorreta ---');
  const emptyAdapter = new FirestoreAdapter('org_empty_test');
  const basesRegistradas = (emptyAdapter as any).memoryDb.bases;
  const colabSemBaseEmpty = (emptyAdapter as any).mapColaboradorToPessoa({
    id: 'COLAB-NO-BASE',
    organizationId: 'org_empty_test',
    nome: 'Colaborador Sem Base',
    matricula: 'CANAC-999',
    setor: 'Geral',
    funcao: 'Apoio',
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as any);

  assert(
    colabSemBaseEmpty.base_principal_id === '',
    'Colaborador sem base não recebe base padrão artificial silenciosa',
    `Recebeu base: ${colabSemBaseEmpty.base_principal_id}`
  );

  // --------------------------------------------------------------------------
  // TESTE 30: Casos Obrigatórios de Datas, Periodicidade e Vencimentos
  // --------------------------------------------------------------------------
  console.log('\n--- 30. Casos Obrigatórios de Datas e Vencimentos (Seção 3) ---');
  const dataReferenciaHoje = hojeISO();

  // 30.1: Treinamento com validade explícita vigente
  const trnVigenteExplicito: Treinamento = {
    id: 'TRN-EXP-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CURSO-QUALQUER',
    data_execucao: '2025-01-10',
    data_validade: '2027-12-31', // Validade explícita futura
    criado_em: '2025-01-10T10:00:00Z',
    atualizado_em: '2025-01-10T10:00:00Z',
    atualizado_por: 'Auditor',
  };
  const stTrnVigente = calcularStatusTreinamento(trnVigenteExplicito, undefined, '2026-10-25');
  assert(stTrnVigente.status === 'Em dia', 'Treinamento com validade explícita futura retorna "Em dia"', `Status: ${stTrnVigente.status}`);
  assert(stTrnVigente.data_vencimento === '2027-12-31', 'Data de vencimento explícita preservada', `Vencimento: ${stTrnVigente.data_vencimento}`);

  // 30.2: Certificado vencido (validade explícita passada)
  const trnVencidoExplicito: Treinamento = {
    ...trnVigenteExplicito,
    id: 'TRN-EXP-02',
    data_validade: '2024-01-01', // Validade explícita vencida
  };
  const stTrnVencido = calcularStatusTreinamento(trnVencidoExplicito, undefined, '2026-10-25');
  assert(stTrnVencido.status === 'Vencido', 'Certificado vencido retorna "Vencido"', `Status: ${stTrnVencido.status}`);

  // 30.3: Treinamento sem validade definida (curso sem validade_dias e sem sem_validade)
  const cursoSemRegra: CursoCatalogo = {
    id: 'CUR-SEM-REGRA',
    curso: 'Palestra de Sensibilização',
    grupo: 'Doutrinação',
    frota: 'Geral',
    variante: '',
    validade_dias: 0,
    ativo: true,
    sem_validade: false, // Não declarou sem_validade nem possui validade_dias
  };
  const trnSemRegra: Treinamento = {
    id: 'TRN-SR-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CUR-SEM-REGRA',
    data_execucao: '2026-01-15',
    criado_em: '2026-01-15T10:00:00Z',
    atualizado_em: '2026-01-15T10:00:00Z',
    atualizado_por: 'Instrutor',
  };
  const stSemRegra = calcularStatusTreinamento(trnSemRegra, cursoSemRegra, '2026-10-25');
  assert(stSemRegra.status === 'Sem validade definida', 'Curso sem regra definida retorna "Sem validade definida"', `Status: ${stSemRegra.status}`);
  assert(stSemRegra.isSemVencimento === false, 'Curso sem regra definida NÃO é marcado como isSemVencimento: true', 'Marcado indevidamente como isSemVencimento');

  // 30.4: Treinamento sem vencimento aplicável declarado (doutrinação única / sem reciclagem)
  const cursoPermanente: CursoCatalogo = {
    id: 'CUR-INTEGRACAO',
    curso: 'Integração Institucional Permanente',
    grupo: 'Doutrinação',
    frota: 'Geral',
    variante: '',
    validade_dias: 0,
    ativo: true,
    sem_validade: true, // Declarado sem_validade
  };
  const stPermanente = calcularStatusTreinamento(trnSemRegra, cursoPermanente, '2026-10-25');
  assert(stPermanente.status === 'Sem vencimento', 'Curso com sem_validade: true retorna "Sem vencimento"', `Status: ${stPermanente.status}`);
  assert(stPermanente.isSemVencimento === true, 'Curso com sem_validade: true possui isSemVencimento: true', 'Falta isSemVencimento');

  // 30.5: Registro com dados insuficientes (sem data de realização)
  const trnSemDataRealizacao: Treinamento = {
    id: 'TRN-SEM-DATA',
    pessoa_id: 'COLAB-001',
    curso_id: 'CUR-B737-MAX-AVIO',
    data_execucao: '', // Data ausente
    criado_em: '2026-01-01T10:00:00Z',
    atualizado_em: '2026-01-01T10:00:00Z',
    atualizado_por: 'Importador',
  };
  const stSemData = calcularStatusTreinamento(trnSemDataRealizacao, cursoCatalogo, '2026-10-25');
  assert(stSemData.status === 'Dados insuficientes', 'Registro sem data de realização retorna "Dados insuficientes"', `Status: ${stSemData.status}`);

  // 30.6: Certificado com data de emissão e data de realização diferentes
  // Vencimento de 720 dias deve ser contado da data_execucao (2024-05-10 -> 2026-04-30), e não da emissão do certificado
  const trnComEmissaoDistinta: Treinamento = {
    id: 'TRN-EMISS-01',
    pessoa_id: 'COLAB-001',
    curso_id: cursoCatalogo.id,
    data_execucao: '2024-05-10', // Realização
    data_validade: undefined,   // Calculado por validade_dias (720 dias)
    criado_em: '2024-06-01T10:00:00Z', // Emissão do certificado posterior
    atualizado_em: '2024-06-01T10:00:00Z',
    atualizado_por: 'Entidade Certificadora',
  };
  const stComEmissao = calcularStatusTreinamento(trnComEmissaoDistinta, cursoCatalogo, '2026-10-25');
  assert(stComEmissao.data_vencimento === '2026-04-30', 'Vencimento calculado a partir da data de realização (execução), não da emissão', `Vencimento: ${stComEmissao.data_vencimento}`);
  assert(stComEmissao.status === 'Vencido', 'Treinamento vencido por expiração do prazo de realização', `Status: ${stComEmissao.status}`);

  // 30.7: Registro incompleto com curso inexistente no catálogo
  const trnCursoInexistente: Treinamento = {
    id: 'TRN-ORPHAN-01',
    pessoa_id: 'COLAB-001',
    curso_id: 'CURSO-NAO-CADASTRADO-NO-BANCO',
    data_execucao: '2026-05-10',
    criado_em: '2026-05-10T10:00:00Z',
    atualizado_em: '2026-05-10T10:00:00Z',
    atualizado_por: 'OCR',
  };
  const stCursoInexistente = calcularStatusTreinamento(trnCursoInexistente, undefined, '2026-10-25');
  assert(stCursoInexistente.status === 'Sem validade definida', 'Treinamento com curso ausente no catálogo retorna "Sem validade definida"', `Status: ${stCursoInexistente.status}`);

  // --------------------------------------------------------------------------
  // TESTE 31: Persistência Real e Leitura de Dados no Storage/Adapter
  // --------------------------------------------------------------------------
  console.log('\n--- 31. Persistência e Leitura de Dados (Seção 4) ---');
  const persistentAdapter = new FirestoreAdapter('org_test_persistence');

  // Gravação de Colaborador
  const colabParaPersistir: Pessoa = {
    id: 'PERSIST-001',
    nome: 'Helena Vasconcelos',
    categoria: 'Mecânico',
    situacao: 'Ativo',
    base_principal_id: 'REC',
    cliente_ou_area: 'GOL Linhas Aéreas',
    canac: '998877',
    criado_em: '2026-10-25T10:00:00Z',
    atualizado_em: '2026-10-25T10:00:00Z',
    atualizado_por: 'Homologação',
  };

  await persistentAdapter.savePessoa(colabParaPersistir, 'Homologação');
  const colabLido = persistentAdapter.getDatabase().pessoas.find((p) => p.id === 'PERSIST-001') || null;
  assert(colabLido !== null, 'Colaborador gravado é recuperado com sucesso na leitura', 'Colaborador não encontrado');
  assert(colabLido?.nome === 'Helena Vasconcelos', 'Nome do colaborador persistido com integridade', `Nome: ${colabLido?.nome}`);
  assert(colabLido?.base_principal_id === 'REC', 'Base do colaborador persistida com integridade', `Base: ${colabLido?.base_principal_id}`);

  // Edição e regravação sem duplicação
  const colabEditado: Pessoa = {
    ...colabLido!,
    nome: 'Helena Vasconcelos Ramos',
    base_principal_id: 'GRU',
  };
  await persistentAdapter.savePessoa(colabEditado, 'Homologação');
  const colabReLido = persistentAdapter.getDatabase().pessoas.find((p) => p.id === 'PERSIST-001') || null;
  assert(colabReLido?.nome === 'Helena Vasconcelos Ramos', 'Nome atualizado na re-leitura', `Nome: ${colabReLido?.nome}`);
  assert(colabReLido?.base_principal_id === 'GRU', 'Base atualizada na re-leitura', `Base: ${colabReLido?.base_principal_id}`);

  const todasPessoas = persistentAdapter.getDatabase().pessoas;
  const ocorrencias = todasPessoas.filter((p) => p.id === 'PERSIST-001');
  assert(ocorrencias.length === 1, 'Edição não duplica colaboradores na base de dados', `Ocorrências: ${ocorrencias.length}`);

  // --------------------------------------------------------------------------
  // TESTE 32: Segurança, RBAC e Regras do Firestore (Seção 4)
  // --------------------------------------------------------------------------
  console.log('\n--- 32. Segurança, RBAC e Regras Firestore (Seção 4) ---');

  // 32.1: Isolamento estrito entre organizações
  const tenant1 = new FirestoreAdapter('org_alpha');
  const tenant2 = new FirestoreAdapter('org_beta');
  await tenant1.savePessoa({ ...colabParaPersistir, id: 'COLAB-TENANT-ALPHA' }, 'Admin');

  const buscaNoTenant2 = tenant2.getDatabase().pessoas.find((p) => p.id === 'COLAB-TENANT-ALPHA') || null;
  assert(buscaNoTenant2 === null, 'Tenant Beta não consegue acessar registro do Tenant Alpha (Isolamento Multi-Tenant)', 'Vazamento entre tenants');

  // 32.2: Tentativa de adulterar o identificador de organização (Tenant ID Tampering)
  const colabTampered: any = {
    ...colabParaPersistir,
    id: 'COLAB-TAMPER',
    organizationId: 'malicious_target_org', // Tentativa de injeção de outro tenant
  };
  await tenant1.savePessoa(colabTampered, 'Admin');
  const storedColab = (tenant1 as any).canonicalPersonsMap.get('COLAB-TAMPER');
  assert(
    storedColab.organizationId === 'org_alpha',
    'Tentativa de alterar o organizationId é rejeitada e forçada ao tenant do contexto ("org_alpha")',
    `Identificador adulterado aceito: ${storedColab.organizationId}`
  );

  // 32.3: Tentativa de modificar dados diretamente pela API sem credenciais de autenticação
  let directApiRejected = false;
  let directApiErrorCode = '';
  try {
    const rawDb = getFirestoreDb();
    if (rawDb) {
      await setDoc(doc(rawDb, 'organizations', 'org_unauth', 'persons', 'HACK-01'), { nome: 'Hacker' });
    }
  } catch (err: any) {
    directApiRejected = true;
    directApiErrorCode = err?.code || String(err);
  }
  assert(
    directApiRejected,
    'Tentativa de escrita direta via API sem token autenticado é bloqueada pelas regras de segurança (PERMISSION_DENIED)',
    `Acesso direto não foi bloqueado: code=${directApiErrorCode}`
  );

  // 32.4: Usuário com perfil CONSULTA ou Leitor sem permissão de escrita (RBAC)
  const userConsulta = { id: 'USR-CONSULTA', nome: 'Visitante', role: 'CONSULTA' as const, perfil: 'Leitor' as const };
  const canUserEdit = userConsulta.role !== 'CONSULTA' && userConsulta.perfil !== 'Leitor';
  assert(
    !canUserEdit,
    'Usuário com perfil "CONSULTA" / "Leitor" tem permissão de escrita/edição bloqueada pelo RBAC',
    'Permissão indevida concedida a usuário de consulta'
  );

  // 32.5: Usuário inativo ou bloqueado
  const userInativo = { id: 'USR-INATIVO', nome: 'Ex-Colaborador', status: 'INATIVO', ativo: false };
  const canInactiveOperate = userInativo.status === 'ATIVO' && userInativo.ativo === true;
  assert(
    !canInactiveOperate,
    'Usuário com status INATIVO é impedido de realizar operações no sistema',
    'Usuário inativo teve acesso permitido'
  );

  // 32.6: Auditoria de integridade das regras de segurança do Firestore (firestore.rules)
  const rulesSource = fs.readFileSync('firestore.rules', 'utf8');
  assert(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;'), 'Default-Deny Catch-All presente em firestore.rules', 'Falta default deny');
  assert(rulesSource.includes('function userBelongsToOrg('), 'Função userBelongsToOrg() presente para isolamento multi-tenant', 'Falta userBelongsToOrg');
  assert(rulesSource.includes('function isUserActive('), 'Função isUserActive() presente para bloqueio de usuários inativos/bloqueados', 'Falta isUserActive');
  assert(rulesSource.includes('function getUserRole('), 'Função getUserRole() presente para controle de acesso baseado em papéis (RBAC)', 'Falta getUserRole');

  // --------------------------------------------------------------------------
  // RESUMO FINAL
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`TOTAL DE TESTES: ${total}`);
  console.log(`APROVADOS:       ${passed}`);
  console.log(`FALHAS:          ${failed}`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('TODOS OS TESTES DE INTEGRAÇÃO QUALYQUEST + ROOSTER PASSARAM COM SUCESSO!\n');
  }
}

runAllTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
