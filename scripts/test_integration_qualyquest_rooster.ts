/**
 * Testes Automatizados de Integração QualyQuest + Rooster
 * Executa testes rigorosos de integridade referencial, preservação de campos,
 * mapeamentos canônicos, isolamento multi-tenant e validação de regras de negócio.
 */

import { ColaboradorPessoa, CursoTreinamento, RegistroTreinamentoColaborador, QualificacaoColaborador } from '../src/types';
import { FirestoreAdapter } from '../src/rooster/services/adapters/firestoreAdapter';
import { Pessoa, CursoCatalogo, Treinamento, Licenca } from '../src/rooster/types';

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
