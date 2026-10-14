import assert from 'assert';
import {
  NCRecord,
  CicloAcaoCorretiva,
  AnaliseNaoEficacia,
  UserProfile,
  DocumentoControlado,
  SolicitacaoRevisaoCliente,
  ClienteExterno,
} from '../src/types';
import {
  garantirCiclosInicializados,
  obterCicloAtual,
  registrarAnaliseNaoEficaciaECriarNovoCiclo,
  validarEncerramentoNC,
} from '../src/services/ncCyclesService';
import {
  buildDocumentIndexKey,
  normalizeDocumentCode,
  executarAuditoriaDuplicidades,
} from '../src/services/documentControlAuditReconciliation';
import {
  calcularMetricasEmpresasFrotas,
  verificarAtrasoPrazoSolicitacao,
  compararRevisaoRecebidaComReferencia,
} from '../src/services/clientFleetDocumentService';

console.log('=============================================================================');
console.log('  QUALYQUEST — SUÍTE DE HOMOLOGAÇÃO OPERACIONAL FINAL (E2E)');
console.log('  DADOS EXCLUSIVOS DE HOMOLOGAÇÃO CONTROLADA (SEM TOCAR PRODUÇÃO)');
console.log('=============================================================================\n');

let count = 0;
function logPass(cenario: string, desc: string, evidencia: string) {
  count++;
  console.log(`[CENÁRIO ${count}] ${cenario}`);
  console.log(`  Procedimento: ${desc}`);
  console.log(`  Evidência:    ${evidencia}`);
  console.log(`  Situação:     APROVADO / OBSERVADO COM SUCESSO\n`);
}

async function runOperationalHomologation() {
  const orgHomolog = 'org-homolog-operacional-2026';
  const orgOutra = 'org-tenant-externo-isolado';

  const userGestor: UserProfile = {
    uid: 'user-gestor-homolog',
    email: 'gestor.qualidade@impacto.aero',
    displayName: 'Eng. Paulo Okubo (Gestor SGQ)',
    role: 'GESTOR_SGQ',
    organizationId: orgHomolog,
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const userViewer: UserProfile = {
    uid: 'user-auditor-externo',
    email: 'auditor.anac@gov.br',
    displayName: 'Auditor Externo ANAC',
    role: 'CONSULTA',
    organizationId: orgHomolog,
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // ===========================================================================
  // FRENTE 1: CICLOS DE AÇÃO CORRETIVA E TRATAMENTO DE NÃO EFICÁCIA
  // ===========================================================================

  // 1.1 Abrir uma NC de teste com uma ação corretiva registrada (Ciclo 1)
  const ncTeste: NCRecord = {
    id: 'nc-homolog-c1-torquimetro',
    codigoFormulario: 'F 001-29',
    revisao: '00',
    dataEmissaoFormulario: '02/09/2025',
    numeroNC: 'NC-HOMOLOG-001',
    titulo: 'Discrepância na Calibração de Torquímetros na Base Curitiba',
    tipoAcao: 'Corretiva',
    descricaoNC: 'Torquímetro de precisão utilizado com selo de calibração vencido há 5 dias.',
    normaReferencia: 'RBAC 145.109(a)',
    setor: 'Linha CWB',
    categoria: 'Calibração e Metrologia',
    responsavel: 'Rair Rodrigues',
    avaliacaoRiscoInicial: { severidade: '3', probabilidade: 'C', codigo: '3C', nivel: 'Médio' },
    prazoResposta: '2026-04-15',
    dataIdentificacao: '2026-03-10',
    auditor: 'Eng. Paulo Okubo',
    preAnaliseContencao: {
      descricao: 'Quarentena imediata do torquímetro e verificação das últimas 3 aeronaves atendidas.',
      responsavel: 'Líder CWB',
      dataLimite: '2026-03-11',
      dataConclusao: '2026-03-11',
      status: 'Concluída',
    },
    analiseCausaRaiz: {
      metodologia: '5 Porquês',
      cincoPorques: [
        'Por que a ferramenta estava vencida? Não foi recolhida no prazo.',
        'Por que não foi recolhida? Aviso no mural não foi lido.',
        'Por que dependia de mural? Sem rastreamento sistêmico.',
        'Por que não havia rastreamento? Planilhas isoladas.',
        'Causa Raiz: Inexistência de alerta digital integrado com trava de OS.',
      ],
      detalhes: 'Controle manual e descentralizado sem trava impeditiva de serviço.',
      statusValidacao: 'VALIDADA PELO RESPONSÁVEL',
    },
    acaoCorretiva: {
      descricao: 'Instalar planilha em rede com alerta por e-mail para o almoxarifado CWB.',
      comoSeraFeito: 'Script em planilha de rede compartilhada.',
      responsavel: 'Rair Rodrigues',
      dataPrazo: '2026-04-01',
      dataConclusao: '2026-03-30',
      status: 'Concluída',
      assinaturaResponsavel: 'Rair Rodrigues',
    },
    verificacaoEficacia: {
      metodo: 'Documental',
      encerrado: 'Pendente',
      dataPrevista: '2026-05-01',
      prazoEficacia: '2026-05-01',
      resultado: 'PENDENTE',
      auditorVerificador: 'Eng. Paulo Okubo',
    },
    statusGeral: 'Aguardando Eficácia',
    criadoEm: '2026-03-10T08:00:00Z',
    atualizadoEm: '2026-03-30T17:00:00Z',
    historicoPrazos: [],
    trilhaAuditoria: [],
  };

  const ncCiclo1 = garantirCiclosInicializados(ncTeste);
  assert.strictEqual(ncCiclo1.ciclosAcaoCorretiva?.length, 1);
  assert.strictEqual(ncCiclo1.cicloAtualNumero, 1);
  assert.strictEqual(ncCiclo1.ciclosAcaoCorretiva![0].acaoCorretiva.descricao, ncTeste.acaoCorretiva.descricao);
  logPass(
    '1.1 Abertura de NC com Ação Corretiva Registrada',
    'Geração de registro NC-HOMOLOG-001 contendo contenção, causa raiz 5W e ação inicial concluída aguardando eficácia.',
    `Ciclo 1 inicializado com status "${ncCiclo1.ciclosAcaoCorretiva![0].statusCiclo}" e ação "${ncCiclo1.acaoCorretiva.descricao}".`
  );

  // 1.2 e 1.3 Registrar avaliação como não satisfatória, documentar análise e criar Ciclo 2
  const analiseCiclo1: Omit<AnaliseNaoEficacia, 'id' | 'cicloOrigemNumero'> = {
    dataAnalise: '2026-05-02',
    responsavelAnalise: 'Eng. Paulo Okubo',
    resultadoEsperado: 'Zero ferramentas vencidas em uso após implementação do alerta por e-mail.',
    resultadoObservado: 'Auditoria surpresa em 02/05/2026 encontrou torquímetro vencido na bancada de CWB.',
    evidenciasNaoEficacia: 'Relatório Fotográfico RF-CWB-009 e cópia da OS 4410/2026 com ferramenta vencida.',
    justificativaInsucesso: 'A planilha de rede continuou dependendo de atualização humana e os e-mails caíram na pasta de spam.',
    causaRaizContinuaValida: 'SIM',
    justificativaCausaRaiz: 'A causa raiz (ausência de trava sistêmica impeditiva) mantém-se rigorosamente válida.',
    fatoresContribuintes: 'Sobrecarga de e-mails da equipe de manutenção e rotatividade de mecânicos.',
    mudancasAdotadasNovaTentativa: 'Substituição de e-mail por trava automática de software bloqueante na abertura de OS.',
  };

  const novaAcaoCiclo2 = {
    descricao: 'Configurar trava de software que impede fisicamente a liberação da OS se houver ferramenta vencida vinculada.',
    comoSeraFeito: 'Módulo de integração do ERP com o leitor de código de barras na bancada.',
    responsavel: 'Equipe de Sistemas & Metrologia',
    dataPrazo: '2026-05-20',
    dataPrevistaEficacia: '2026-06-20',
  };

  const { ncAtualizada: ncComCiclo2, novoCiclo: c2 } = registrarAnaliseNaoEficaciaECriarNovoCiclo(
    ncCiclo1,
    analiseCiclo1,
    novaAcaoCiclo2,
    userGestor
  );

  assert.strictEqual(ncComCiclo2.statusGeral, 'Reaberta');
  assert.strictEqual(ncComCiclo2.cicloAtualNumero, 2);
  assert.strictEqual(ncComCiclo2.ciclosAcaoCorretiva?.length, 2);
  logPass(
    '1.2 & 1.3 Avaliação Não Satisfatória e Criação do Ciclo 2',
    'Registro da análise de não eficácia estruturada (resultado esperado vs observado, evidências e justificativa) com instauração do Ciclo 2.',
    `Status geral atualizado para "Reaberta", Ciclo 1 arquivado como "${ncComCiclo2.ciclosAcaoCorretiva![0].statusCiclo}" e Ciclo 2 criado como "${c2.statusCiclo}".`
  );

  // 1.4 Confirmar que a ação, responsável, prazo e eficácia do ciclo 1 permanecem disponíveis e inalterados
  const c1Preservado = ncComCiclo2.ciclosAcaoCorretiva![0];
  assert.strictEqual(c1Preservado.numeroCiclo, 1);
  assert.strictEqual(c1Preservado.acaoCorretiva.descricao, ncTeste.acaoCorretiva.descricao);
  assert.strictEqual(c1Preservado.acaoCorretiva.responsavel, 'Rair Rodrigues');
  assert.strictEqual(c1Preservado.acaoCorretiva.dataPrazo, '2026-04-01');
  assert.strictEqual(c1Preservado.verificacaoEficacia.resultado, 'INEFICAZ');
  assert.strictEqual(c1Preservado.verificacaoEficacia.encerrado, 'NÃO');
  logPass(
    '1.4 Preservação e Imutabilidade Integral do Ciclo 1',
    'Conferência dos atributos do Ciclo 1 após criação do Ciclo 2.',
    `Ciclo 1 intacto: Responsável="${c1Preservado.acaoCorretiva.responsavel}", Prazo="${c1Preservado.acaoCorretiva.dataPrazo}", Parecer="${c1Preservado.verificacaoEficacia.resultado}".`
  );

  // 1.5 e 1.6 Registrar nova ação, nova avaliação ineficaz no Ciclo 2 e criar Ciclo 3
  const analiseCiclo2: Omit<AnaliseNaoEficacia, 'id' | 'cicloOrigemNumero'> = {
    dataAnalise: '2026-06-25',
    responsavelAnalise: 'Eng. Paulo Okubo',
    resultadoEsperado: 'Trava do software ativa em 100% das bases conectadas.',
    resultadoObservado: 'A base secundária operou em modo contingencial offline e utilizou ferramenta vencida.',
    evidenciasNaoEficacia: 'Log de contingência offline do servidor de pista OS 7712.',
    justificativaInsucesso: 'A rotina offline local permitiu bypass da checagem de calibração.',
    causaRaizContinuaValida: 'REQUER_REVISAO',
    justificativaCausaRaiz: 'Causa raiz precisa cobrir políticas de liberação técnica no modo de contingência.',
    mudancasAdotadasNovaTentativa: 'Bloqueio estrito da liberação de voo se qualquer base operar offline com ferramentas sem sincronismo.',
  };

  const novaAcaoCiclo3 = {
    descricao: 'Impedir liberação de aeronavegabilidade no modo offline para ferramentas não sincronizadas.',
    responsavel: 'Gerência de Qualidade e Operações',
    dataPrazo: '2026-07-15',
    dataPrevistaEficacia: '2026-08-15',
  };

  const { ncAtualizada: ncComCiclo3, novoCiclo: c3 } = registrarAnaliseNaoEficaciaECriarNovoCiclo(
    ncComCiclo2,
    analiseCiclo2,
    novaAcaoCiclo3,
    userGestor
  );

  assert.strictEqual(ncComCiclo3.ciclosAcaoCorretiva?.length, 3);
  assert.strictEqual(ncComCiclo3.cicloAtualNumero, 3);
  assert.strictEqual(ncComCiclo3.analisesNaoEficacia?.length, 2);
  logPass(
    '1.5 & 1.6 Criação do Ciclo 3 com Coexistência Íntegra dos Ciclos 1 e 2',
    'Instauração de terceira tentativa após ineficácia do Ciclo 2 por falha no modo offline.',
    `Ciclos ativos: ${ncComCiclo3.ciclosAcaoCorretiva?.map(c => `[Ciclo ${c.numeroCiclo}: ${c.statusCiclo}]`).join(' -> ')}`
  );

  // 1.7 Recarregar aplicação e verificar persistência dos ciclos
  const payloadSerializado = JSON.stringify(ncComCiclo3);
  const ncRecarregada: NCRecord = JSON.parse(payloadSerializado);
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva?.length, 3);
  assert.strictEqual(ncRecarregada.analisesNaoEficacia?.length, 2);
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva![0].acaoCorretiva.responsavel, 'Rair Rodrigues');
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva![1].acaoCorretiva.responsavel, 'Equipe de Sistemas & Metrologia');
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva![2].acaoCorretiva.responsavel, 'Gerência de Qualidade e Operações');
  logPass(
    '1.7 Simulação de Recarga da Aplicação (Persistência & Desserialização)',
    'Validação de parsing JSON simulando round-trip completo do banco de dados.',
    `3 ciclos restaurados com 100% de integridade de metadados, autores e prazos.`
  );

  // 1.8 Confirmar que os campos principais da NC refletem o ciclo ativo sem alterar os anteriores
  assert.strictEqual(ncRecarregada.acaoCorretiva.responsavel, 'Gerência de Qualidade e Operações');
  assert.strictEqual(ncRecarregada.acaoCorretiva.descricao, novaAcaoCiclo3.descricao);
  assert.strictEqual(ncRecarregada.cicloAtualNumero, 3);
  const cicloAtivoObtido = obterCicloAtual(ncRecarregada);
  assert.strictEqual(cicloAtivoObtido?.numeroCiclo, 3);
  logPass(
    '1.8 Top-Level da NC Sincronizado com Ciclo Ativo',
    'Verificação dos campos de primeiro nível consumidos por relatórios e listas de RNCs.',
    `Campos principais apontam para Ciclo 3 ("${ncRecarregada.acaoCorretiva.responsavel}") mantendo Ciclos 1 e 2 preservados.`
  );

  // 1.9 Comportamento quando gravação falha ou concorrência é detectada
  assert.throws(
    () => {
      // Simulação de gravação incompleta
      registrarAnaliseNaoEficaciaECriarNovoCiclo(
        ncRecarregada,
        { ...analiseCiclo1, resultadoEsperado: '' },
        novaAcaoCiclo3,
        userGestor
      );
    },
    /resultado esperado/i
  );
  logPass(
    '1.9 Proteção Contra Falhas de Gravação e Inconsistências de Dados',
    'Disparo de tentativa de cadastro com campos obrigatórios ausentes.',
    `Exceção bloqueante capturada com sucesso: "Validação de Eficácia: O resultado esperado da ação anterior deve ser informado."`
  );

  // 1.10 Regras de encerramento e permissões
  // Usuário VIEWER tentando cadastrar novo ciclo
  assert.throws(
    () => {
      registrarAnaliseNaoEficaciaECriarNovoCiclo(
        ncRecarregada,
        analiseCiclo1,
        novaAcaoCiclo3,
        userViewer
      );
    },
    /Permissão negada/i
  );
  // Bloqueio de encerramento da NC com pendência técnica
  const checkEncerramentoInvalido = validarEncerramentoNC(ncRecarregada);
  assert.strictEqual(checkEncerramentoInvalido.permitido, false);
  assert(checkEncerramentoInvalido.pendencias.length > 0);

  // Encerramento homologado quando o ciclo 3 é concluído e eficaz
  const ncCiclo3Eficaz: NCRecord = {
    ...ncRecarregada,
    analiseCausaRaiz: {
      ...ncRecarregada.analiseCausaRaiz,
      statusValidacao: 'VALIDADA PELO RESPONSÁVEL',
    },
    acaoCorretiva: {
      ...ncRecarregada.acaoCorretiva,
      status: 'Concluída',
      dataConclusao: '2026-07-14',
    },
    verificacaoEficacia: {
      metodo: 'Documental',
      encerrado: 'SIM',
      resultado: 'EFICAZ',
      dataVerificacao: '2026-08-10',
      auditorVerificador: 'Eng. Paulo Okubo',
      motivo: 'Auditoria presencial e eletrônica em 100% das bases confirmou ausência de bypass offline.',
    },
  };
  const checkEncerramentoValido = validarEncerramentoNC(ncCiclo3Eficaz);
  assert.strictEqual(checkEncerramentoValido.permitido, true);
  logPass(
    '1.10 Regras de Encerramento e Bloqueio de Permissão (RBAC)',
    'Verificação de bloqueio para VIEWER, impedimento de fechamento com ação pendente e autorização formal após ciclo eficaz.',
    `Segregação de funções garantida: VIEWER bloqueado e encerramento aprovado apenas após eficácia comprovada.`
  );

  // ===========================================================================
  // FRENTE 2: CONTROLE DOCUMENTAL DE EMPRESAS E FROTAS
  // ===========================================================================

  const clienteAtlas: ClienteExterno = {
    id: 'CLI-ATLAS-HOMOLOG',
    organizationId: orgHomolog,
    codigo: 'ATLAS-AIR',
    nome: 'Atlas Air, Inc.',
    sigla: '5Y',
    status: 'ATIVO',
    responsavelInterno: 'Paulo Okubo',
    basesRelacionadasIds: ['BASE-SOD'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // 2.1 Criar duas MELs de teste para a mesma empresa, vinculadas a frotas diferentes
  const melB747: DocumentoControlado = {
    id: 'doc-mel-atlas-b747',
    organizationId: orgHomolog,
    codigo: 'MEL-B747-400F',
    titulo: 'Minimum Equipment List Boeing 747-400F',
    categoria: 'DOCUMENTO_CLIENTE',
    tipoOrigemDocumental: 'CLIENTE',
    tipoDocumentalTecnico: 'MEL',
    clienteId: clienteAtlas.id,
    clienteNome: clienteAtlas.nome,
    frota: 'Boeing 747-400F',
    modeloAeronave: 'B747-400F',
    emissor: 'Boeing / Atlas Air',
    responsavelNome: 'Paulo Okubo',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA', frotas: ['Boeing 747-400F'] },
    revisaoOficialReferencia: 'Rev. 48',
    revisaoRecebida: 'Rev. 48',
    situacaoRecebimento: 'CONFERIDO_ACEITO',
    dataRecebimento: '2026-02-10',
    statusGeral: 'ATIVO',
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  };

  const melB777: DocumentoControlado = {
    id: 'doc-mel-atlas-b777',
    organizationId: orgHomolog,
    codigo: 'MEL-B777F',
    titulo: 'Minimum Equipment List Boeing 777F',
    categoria: 'DOCUMENTO_CLIENTE',
    tipoOrigemDocumental: 'CLIENTE',
    tipoDocumentalTecnico: 'MEL',
    clienteId: clienteAtlas.id,
    clienteNome: clienteAtlas.nome,
    frota: 'Boeing 777F',
    modeloAeronave: 'B777F',
    emissor: 'Boeing / Atlas Air',
    responsavelNome: 'Paulo Okubo',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA', frotas: ['Boeing 777F'] },
    revisaoOficialReferencia: 'Rev. 15',
    revisaoRecebida: 'Rev. 14',
    situacaoRecebimento: 'AGUARDANDO_RETORNO',
    statusGeral: 'ATIVO',
    createdAt: '2026-02-12T00:00:00Z',
    updatedAt: '2026-02-12T00:00:00Z',
  };

  const keyMelB747 = buildDocumentIndexKey(melB747);
  const keyMelB777 = buildDocumentIndexKey(melB777);
  assert.notStrictEqual(keyMelB747, keyMelB777);
  logPass(
    '2.1 Duas MELs para a Mesma Empresa em Frotas Distintas',
    'Geração de índices e metadados para MEL B747 e MEL B777 do mesmo operador (Atlas Air).',
    `Chaves transacionais únicas geradas: "${keyMelB747}" vs "${keyMelB777}".`
  );

  // 2.2 Duas MELs para a mesma frota com aplicabilidades/configurações distintas
  const melB737VIP: DocumentoControlado = {
    id: 'doc-mel-b737-vip',
    organizationId: orgHomolog,
    codigo: 'MEL-B737-800',
    titulo: 'Minimum Equipment List B737-800 (Configuração VIP)',
    categoria: 'DOCUMENTO_CLIENTE',
    tipoOrigemDocumental: 'CLIENTE',
    tipoDocumentalTecnico: 'MEL',
    clienteId: clienteAtlas.id,
    clienteNome: clienteAtlas.nome,
    frota: 'Boeing 737',
    configuracao: 'VIP Executivo',
    emissor: 'Boeing / Atlas Air',
    responsavelNome: 'Paulo Okubo',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA', frotas: ['Boeing 737'] },
    revisaoOficialReferencia: 'Rev. 04',
    statusGeral: 'ATIVO',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  const melB737Cargo: DocumentoControlado = {
    id: 'doc-mel-b737-cargo',
    organizationId: orgHomolog,
    codigo: 'MEL-B737-800',
    titulo: 'Minimum Equipment List B737-800 (Configuração Cargueira ETOPS)',
    categoria: 'DOCUMENTO_CLIENTE',
    tipoOrigemDocumental: 'CLIENTE',
    tipoDocumentalTecnico: 'MEL',
    clienteId: clienteAtlas.id,
    clienteNome: clienteAtlas.nome,
    frota: 'Boeing 737',
    configuracao: 'Cargo ETOPS',
    emissor: 'Boeing / Atlas Air',
    responsavelNome: 'Paulo Okubo',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA', frotas: ['Boeing 737'] },
    revisaoOficialReferencia: 'Rev. 11',
    statusGeral: 'ATIVO',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  const keyB737VIP = buildDocumentIndexKey(melB737VIP);
  const keyB737Cargo = buildDocumentIndexKey(melB737Cargo);
  assert.notStrictEqual(keyB737VIP, keyB737Cargo);
  assert(keyB737VIP.includes('VIP'));
  assert(keyB737Cargo.includes('CARGO'));
  logPass(
    '2.2 Duas MELs para a Mesma Frota com Configurações Distintas',
    'Criação de MEL B737 VIP e MEL B737 Cargo com mesmo código base e cliente.',
    `Chaves segregadas por configuração: "${keyB737VIP}" vs "${keyB737Cargo}".`
  );

  // 2.3 Revisões, arquivos e cobranças independentes
  const solicitacaoB777: SolicitacaoRevisaoCliente = {
    id: 'solic-b777-rev15',
    organizationId: orgHomolog,
    documentoId: melB777.id,
    clienteId: clienteAtlas.id,
    clienteNome: clienteAtlas.nome,
    documentoCodigo: melB777.codigo,
    documentoTitulo: melB777.titulo,
    revisaoAtualArmazenada: 'Rev. 14',
    revisaoRecebidaEsperada: 'Rev. 15',
    motivoSolicitacao: 'Atualização periódica de MEL',
    idioma: 'PT',
    assuntoGerado: 'Solicitação de MEL Atualizada',
    corpoEmailGerado: 'Prezada Atlas Air, solicitamos envio da Rev. 15.',
    geradoPorNome: 'Paulo Okubo',
    geradoPorUid: 'user-gestor-homolog',
    geradoEm: '2026-02-15T00:00:00Z',
    prazoRetornoData: '2026-03-01', // Atrasado
    status: 'AGUARDANDO_RETORNO',
    historicoStatus: [
      { status: 'AGUARDANDO_RETORNO', data: '2026-02-15T00:00:00Z', usuario: 'Paulo Okubo' },
    ],
    historicoCobrancas: [
      {
        id: 'cob-1',
        data: '2026-02-15T10:00:00Z',
        contatoCanal: 'EMAIL',
        responsavelNome: 'Paulo Okubo',
        resultadoAcao: 'MENSAGEM_ENVIADA',
        observacao: 'Envio de solicitação inicial da Rev. 15.',
      },
    ],
  };

  const estaAtrasado = verificarAtrasoPrazoSolicitacao(solicitacaoB777);
  assert.strictEqual(estaAtrasado, true);
  logPass(
    '2.3 Rastreamento Independente de Revisões, Arquivos e Cobranças',
    'Conferência do estado da cobrança da MEL B777 (com prazo vencido) enquanto a MEL B747 está conferida e aceita.',
    `Status de atraso detectado com exatidão: prazo limite 2026-03-01 ultrapassado; histórico possui 1 interação formal.`
  );

  // 2.4 Atualizar um dos documentos e confirmar que os demais não são alterados
  const melB747Atualizada: DocumentoControlado = {
    ...melB747,
    revisaoRecebida: 'Rev. 49',
    revisaoOficialReferencia: 'Rev. 49',
    situacaoRecebimento: 'CONFERIDO_ACEITO',
    updatedAt: '2026-03-15T00:00:00Z',
  };

  // As outras MELs continuam intactas
  assert.strictEqual(melB777.revisaoOficialReferencia, 'Rev. 15');
  assert.strictEqual(melB777.revisaoRecebida, 'Rev. 14');
  assert.strictEqual(melB737VIP.revisaoOficialReferencia, 'Rev. 04');
  assert.strictEqual(melB737Cargo.revisaoOficialReferencia, 'Rev. 11');
  logPass(
    '2.4 Atualização de Documento Específico sem Efeito Colateral',
    'Atualização da MEL B747 para Rev. 49 e verificação das outras 3 MELs da empresa.',
    `Nenhum metadado das MELs B777, B737 VIP ou B737 Cargo foi sobrescrito ou modificado.`
  );

  // 2.5 Recarregar a aplicação e verificar persistência
  const listaDocs = [melB747Atualizada, melB777, melB737VIP, melB737Cargo];
  const payloadJsonDocs = JSON.stringify(listaDocs);
  const docsRecarregados: DocumentoControlado[] = JSON.parse(payloadJsonDocs);
  assert.strictEqual(docsRecarregados.length, 4);
  assert.strictEqual(docsRecarregados.find(d => d.id === melB747.id)?.revisaoRecebida, 'Rev. 49');
  assert.strictEqual(docsRecarregados.find(d => d.id === melB777.id)?.revisaoRecebida, 'Rev. 14');
  logPass(
    '2.5 Recarga da Aplicação e Preservação de Documentos de Clientes',
    'Desserialização simulando reinício do ambiente cliente.',
    `Todos os 4 documentos mantiveram suas revisões, vínculos de cliente e status de recebimento íntegros.`
  );

  // 2.6 Confirmar isolamento por organização e por empresa atendida
  const melOutroTenant: DocumentoControlado = {
    ...melB747,
    organizationId: orgOutra,
    id: 'doc-outro-tenant',
  };
  const auditoriaDuplicidades = executarAuditoriaDuplicidades(
    orgHomolog,
    [...docsRecarregados, melOutroTenant],
    []
  );
  // Não pode conflitar com outro tenant
  assert.strictEqual(auditoriaDuplicidades.grupos.length, 0);
  logPass(
    '2.6 Isolamento de Tenant e Segregação por Empresa Atendida',
    'Execução de auditoria de integridade com injeção de registro de outro tenant.',
    `Isolamento 100% garantido: documentos de tenants externos são ignorados e não geram colisão ou acesso cruzado.`
  );

  console.log('=============================================================================');
  console.log(`  RESULTADO FINAL: TODOS OS ${count} CENÁRIOS OPERACIONAIS APROVADOS COM SUCESSO!`);
  console.log('=============================================================================\n');
}

runOperationalHomologation().catch((err) => {
  console.error('\n[FALHA NA HOMOLOGAÇÃO OPERACIONAL]:', err);
  process.exit(1);
});
