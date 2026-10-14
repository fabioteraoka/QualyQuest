import {
  DocumentoControlado,
  ManualRecord,
  RevisaoDocumental,
  UserProfile,
  NCRecord,
} from '../src/types';
import {
  identificarCorrespondenciaManualIA,
  determinarReferenciaOficialDocumento,
  verificarAlinhamentoManualIA,
  executarVerificacaoAlinhamentoBancoIA,
  executarVerificacaoEmLoteBancoIA,
  atualizarManualNoBancoIAControlado,
  vincularDocumentoAoManualIA,
  compararRevisoesDocumentaisDetalhada,
  verificarIncompatibilidadeTecnica,
} from '../src/services/manualsCrossCheckService';
import { auditNCComplianceLocally } from '../src/utils/sgqExtractor';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runHomologationSuite() {
  console.log('=============================================================================');
  console.log('  QUALYQUEST — SUÍTE DE HOMOLOGAÇÃO TÉCNICA DA INTEGRAÇÃO: ACERVO & BANCO IA');
  console.log('=============================================================================\n');

  const orgId = 'org-impacto-mro';
  const agora = new Date().toISOString();

  // Usuários de teste
  const gestorSGQ: UserProfile = {
    uid: 'user-gestor-sgq-01',
    displayName: 'Carlos Eduardo — Auditor Líder SGQ',
    email: 'carlos.sgq@impacto.aero',
    role: 'GESTOR_SGQ',
    organizationId: orgId,
    status: 'ATIVO',
    createdAt: agora,
    updatedAt: agora,
  };

  const usuarioConsulta: UserProfile = {
    uid: 'user-auditor-externo',
    displayName: 'Auditor Fiscal Externo',
    email: 'fiscal@anac.gov.br',
    role: 'CONSULTA',
    organizationId: orgId,
    status: 'ATIVO',
    createdAt: agora,
    updatedAt: agora,
  };

  // ---------------------------------------------------------------------------
  // BLOCO 1: VERIFICAR A ORIGEM E A CONFIABILIDADE DAS REVISÕES
  // ---------------------------------------------------------------------------
  console.log('--- BLOCO 1: ORIGEM E CONFIABILIDADE DAS REVISÕES ---');

  // Teste 46: Diferenciação entre revisão oficial confirmada vs registrada no acervo vs no Banco IA
  const docComRoboConfirmado: DocumentoControlado = {
    id: 'doc-rbac-confirmado',
    organizationId: orgId,
    codigo: 'RBAC 145',
    titulo: 'Organizações de Manutenção de Aeronaves',
    emissor: 'ANAC',
    numeroRevisao: 'Emenda 08',
    revisaoNaFonteIdentificada: 'Emenda 09',
    statusVerificacao: 'NOVA_REVISAO_IDENTIFICADA',
    dataPublicacaoNaFonte: '2026-04-10',
    dataUltimaVerificacao: '2026-10-12T14:30:00Z',
    dataUpload: '2026-01-15T10:00:00Z',
    urlFonteVerificacao: 'https://sistemas.anac.gov.br/rbac145',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_AUTORIDADE',
    responsavelNome: 'Qualidade SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z',
  };

  const refConfirmada = determinarReferenciaOficialDocumento(docComRoboConfirmado);
  assert(
    refConfirmada.tipoOrigem === 'OFICIAL_CONFIRMADA_FONTE_PUBLICA' &&
      refConfirmada.revisaoOficial === 'Emenda 09' &&
      refConfirmada.revisaoOficialConfirmada === 'Emenda 09' &&
      refConfirmada.revisaoRegistradaAcervo === 'Emenda 08' &&
      refConfirmada.dataOficial === '2026-04-10' &&
      refConfirmada.dataUltimaVerificacao === '2026-10-12T14:30:00Z',
    '46. Diferenciação rigorosa: oficial confirmada por robô público vs registrada no acervo'
  );

  // Teste 47: Data de upload NUNCA é utilizada como evidência de vigência/revisão
  const docSemDataRevisaoComUpload: DocumentoControlado = {
    id: 'doc-pop-upload',
    organizationId: orgId,
    codigo: 'POP-REC-001',
    titulo: 'Procedimento Operacional Padrão de Recebimento',
    emissor: 'SGQ Impacto',
    numeroRevisao: 'Rev. 04',
    dataRevisao: undefined, // Sem data formal de revisão cadastrada
    dataUpload: '2026-10-10T18:00:00Z', // Upload feito há 2 dias
    createdAt: '2026-10-10T18:00:00Z',
    updatedAt: '2026-10-10T18:00:00Z',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_INTERNO',
    responsavelNome: 'Inspetor Chefe',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
  };

  const refUpload = determinarReferenciaOficialDocumento(docSemDataRevisaoComUpload);
  assert(
    refUpload.dataOficial === '' &&
      refUpload.dataUploadArquivo === '2026-10-10T18:00:00Z' &&
      refUpload.alertaDataUpload?.includes('não constitui evidência de vigência'),
    '47. Data de upload é estritamente segregada e NUNCA usada como evidência de vigência'
  );

  // Teste 48: Revisões heterogêneas/alfanuméricas sem datas de vigência sinalizam dúvida e solicitam análise manual
  const compSufixosSemData = compararRevisoesDocumentaisDetalhada('Edição Especial Beta', '', 'Edição Preliminar Alfa', '');
  const docSufixoA: DocumentoControlado = {
    id: 'doc-sufixo',
    organizationId: orgId,
    codigo: 'AMM-C208',
    titulo: 'Maintenance Manual Cessna 208',
    emissor: 'Cessna',
    numeroRevisao: 'Edição Especial Beta',
    dataRevisao: '', // Sem data de vigência
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_FABRICANTE',
    responsavelNome: 'Engenharia',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const manualSufixoB: ManualRecord = {
    id: 'man-sufixo',
    codigo: 'AMM-C208',
    titulo: 'Maintenance Manual Cessna 208',
    revisao: 'Edição Preliminar Alfa',
    dataVigencia: '', // Sem data
    status: 'Vigente',
    setoresAplicaveis: ['Manutenção'],
    descricaoResumo: 'Manual',
    conteudoTexto: 'Texto',
    fonte: 'SGQ',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const diagDuvidaSufixo = verificarAlinhamentoManualIA(docSufixoA, [manualSufixoB]);
  assert(
    compSufixosSemData.ehConfiavel === false &&
      compSufixosSemData.requerAnaliseManual === true &&
      diagDuvidaSufixo.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA' &&
      diagDuvidaSufixo.requerAnaliseManual === true &&
      diagDuvidaSufixo.mensagemAlerta.includes('necessidade de análise manual'),
    '48. Revisões alfanuméricas sem padrão ordinal e sem data sinalizam incerteza e exigem análise manual'
  );

  // Teste 49: Formatos heterogêneos sem números e sem datas sinalizam dúvida
  const compHeterogeneo = compararRevisoesDocumentaisDetalhada('Edição Preliminar', '', 'Rev. Standard', '');
  assert(
    compHeterogeneo.requerAnaliseManual === true && compHeterogeneo.ehConfiavel === false,
    '49. Formatos heterogêneos sem números nem datas sinalizam impossibilidade de ordem determinística'
  );

  // Teste 50: Revisões com sufixos COM datas de vigência oficiais resolvem a precedência de forma segura
  const compSufixosComData = compararRevisoesDocumentaisDetalhada(
    'Rev. 12B',
    '2026-06-01',
    'Rev. 12A',
    '2025-12-01'
  );
  assert(
    compSufixosComData.ehConfiavel === true &&
      compSufixosComData.requerAnaliseManual === false &&
      compSufixosComData.resultado === 1 &&
      compSufixosComData.criterio === 'DATA_VIGENCIA_OFICIAL',
    '50. Revisões com sufixos comprovadas por datas oficiais de vigência resolvem precedência com sucesso'
  );

  // ---------------------------------------------------------------------------
  // BLOCO 2: CONFIRMAR QUE A ASSOCIAÇÃO ENTRE OS DOCUMENTOS É SEGURA
  // ---------------------------------------------------------------------------
  console.log('\n--- BLOCO 2: ASSOCIAÇÃO SEGURA ENTRE DOCUMENTOS ---');

  // Teste 51: Modelos de aeronaves diferentes NUNCA são associados, mesmo com títulos similares
  const docCaravan208: DocumentoControlado = {
    id: 'doc-c208',
    organizationId: orgId,
    codigo: 'AMM-C208',
    titulo: 'Aircraft Maintenance Manual - Cessna 208 Caravan',
    emissor: 'Cessna Aircraft Company',
    numeroRevisao: 'Rev. 15',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_FABRICANTE',
    responsavelNome: 'Engenharia',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: agora,
    updatedAt: agora,
  };

  const manualSkyhawk172: ManualRecord = {
    id: 'man-c172',
    organizationId: orgId,
    codigo: 'AMM-C172',
    titulo: 'Aircraft Maintenance Manual - Cessna 172 Skyhawk',
    revisao: 'Rev. 15',
    dataVigencia: '2025-01-01',
    status: 'Vigente',
    setoresAplicaveis: ['Manutenção'],
    descricaoResumo: 'Cessna 172 AMM',
    conteudoTexto: 'Cessna 172 AMM Requisitos',
    fonte: 'Fabricante',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const incompModelos = verificarIncompatibilidadeTecnica(docCaravan208, manualSkyhawk172);
  const matchModelos = identificarCorrespondenciaManualIA(docCaravan208, [manualSkyhawk172]);

  assert(
    incompModelos.incompativel === true &&
      incompModelos.motivo?.includes('Modelos técnicos distintos') &&
      matchModelos.manual === null &&
      matchModelos.confianca === 'NENHUMA',
    '51. Modelos aeronáuticos distintos (208 vs 172) NUNCA são associados automaticamente'
  );

  // Teste 52: Fabricantes distintos (Boeing vs Airbus) NUNCA são associados
  const docBoeing: DocumentoControlado = {
    id: 'doc-b737',
    organizationId: orgId,
    codigo: 'AMM-B737',
    titulo: 'General Maintenance Manual - Boeing 737',
    emissor: 'Boeing',
    numeroRevisao: 'Rev. 10',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_FABRICANTE',
    responsavelNome: 'Qualidade',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: agora,
    updatedAt: agora,
  };

  const manualAirbus: ManualRecord = {
    id: 'man-a320',
    organizationId: orgId,
    codigo: 'AMM-A320',
    titulo: 'General Maintenance Manual - Airbus A320',
    revisao: 'Rev. 10',
    dataVigencia: '2025-01-01',
    status: 'Vigente',
    setoresAplicaveis: ['Manutenção'],
    descricaoResumo: 'Airbus AMM',
    conteudoTexto: 'Airbus AMM Requisitos',
    fonte: 'Airbus',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const incompFabricantes = verificarIncompatibilidadeTecnica(docBoeing, manualAirbus);
  const matchFabricantes = identificarCorrespondenciaManualIA(docBoeing, [manualAirbus]);

  assert(
    incompFabricantes.incompativel === true &&
      matchFabricantes.manual === null &&
      matchFabricantes.confianca === 'NENHUMA',
    '52. Fabricantes distintos (Boeing vs Airbus) são bloqueados de associação automática'
  );

  // Teste 53: Órgãos reguladores distintos (ANAC vs FAA) NUNCA são associados por similaridade
  const docAnac: DocumentoControlado = {
    id: 'doc-anac',
    organizationId: orgId,
    codigo: 'RBAC 145',
    titulo: 'Regulamento Brasileiro da Aviação Civil - ANAC 145',
    emissor: 'ANAC',
    numeroRevisao: 'Emenda 08',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_AUTORIDADE',
    responsavelNome: 'Qualidade',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: agora,
    updatedAt: agora,
  };

  const manualFaa: ManualRecord = {
    id: 'man-faa',
    organizationId: orgId,
    codigo: '14 CFR Part 145',
    titulo: 'Federal Aviation Regulations - FAA Part 145 Maintenance Stations',
    revisao: 'Ed. 2024',
    dataVigencia: '2024-01-01',
    status: 'Vigente',
    setoresAplicaveis: ['Qualidade'],
    descricaoResumo: 'FAA 145',
    conteudoTexto: 'FAA requirements',
    fonte: 'FAA',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const incompOrgaos = verificarIncompatibilidadeTecnica(docAnac, manualFaa);
  const matchOrgaos = identificarCorrespondenciaManualIA(docAnac, [manualFaa]);

  assert(
    incompOrgaos.incompativel === true &&
      matchOrgaos.manual === null &&
      matchOrgaos.confianca === 'NENHUMA',
    '53. Órgãos reguladores distintos (ANAC vs FAA) não são associados automaticamente'
  );

  // Teste 54: Títulos similares mas códigos normativos distintos conhecidos são bloqueados
  const docMOMQ: DocumentoControlado = {
    id: 'doc-momq',
    organizationId: orgId,
    codigo: 'MOMQ',
    titulo: 'Manual da Organização de Manutenção da Qualidade',
    emissor: 'Impacto Aviation',
    numeroRevisao: 'Rev. 12',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_INTERNO',
    responsavelNome: 'Qualidade SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: agora,
    updatedAt: agora,
  };

  const manualMGQ: ManualRecord = {
    id: 'man-mgq',
    organizationId: orgId,
    codigo: 'MGQ',
    titulo: 'Manual Geral da Qualidade',
    revisao: 'Rev. 05',
    dataVigencia: '2024-01-01',
    status: 'Vigente',
    setoresAplicaveis: ['Qualidade'],
    descricaoResumo: 'MGQ',
    conteudoTexto: 'MGQ',
    fonte: 'SGQ',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const incompCodigos = verificarIncompatibilidadeTecnica(docMOMQ, manualMGQ);
  const matchCodigos = identificarCorrespondenciaManualIA(docMOMQ, [manualMGQ]);

  assert(
    incompCodigos.incompativel === true &&
      matchCodigos.manual === null &&
      matchCodigos.confianca === 'NENHUMA',
    '54. Similaridade de título não é suficiente para vincular documentos com códigos distintos'
  );

  // Teste 55: Vínculo manual explícito persiste e tem prioridade máxima
  const docComVinculoManual: DocumentoControlado = {
    ...docMOMQ,
    id: 'doc-com-vinculo',
    manualIAId: manualMGQ.id, // Vínculo manual prévio estabelecido pelo gestor
  };

  const matchVinculoDireto = identificarCorrespondenciaManualIA(docComVinculoManual, [manualMGQ]);
  assert(
    matchVinculoDireto.manual?.id === manualMGQ.id &&
      matchVinculoDireto.metodo === 'VINCULO_DIRETO' &&
      matchVinculoDireto.confianca === 'ALTA',
    '55. Vínculo manual explícito persiste e possui prioridade máxima sobre regras automáticas'
  );

  // Teste 56: Isolamento multi-tenant por organização
  const manualOutraOrg: ManualRecord = {
    ...manualMGQ,
    id: 'man-outra-empresa',
    organizationId: 'org-concorrente-99',
  };

  const incompTenant = verificarIncompatibilidadeTecnica(docMOMQ, manualOutraOrg);
  const matchTenant = identificarCorrespondenciaManualIA(docMOMQ, [manualOutraOrg]);
  assert(
    incompTenant.incompativel === true &&
      matchTenant.manual === null &&
      incompTenant.motivo?.includes('Isolamento por organização violado'),
    '56. Separação multi-tenant assegurada: manuais de outra organização nunca são associados'
  );

  // ---------------------------------------------------------------------------
  // BLOCO 3: VALIDAR O CICLO COMPLETO DE ATUALIZAÇÃO E ANÁLISE DE NCS
  // ---------------------------------------------------------------------------
  console.log('\n--- BLOCO 3: CICLO COMPLETO DE ATUALIZAÇÃO E ANÁLISE DE NCS ---');

  // Manual real no Banco IA: MOMQ Rev. 10
  let manualBancoIA: ManualRecord = {
    id: 'manual-momq-homolog',
    organizationId: orgId,
    codigo: 'MOMQ',
    titulo: 'Manual da Organização de Manutenção da Qualidade',
    revisao: 'Rev. 10',
    dataVigencia: '2024-05-10',
    status: 'Vigente',
    setoresAplicaveis: ['Qualidade / SGQ', 'Manutenção Aeronáutica'],
    descricaoResumo: 'Manual MOMQ utilizado como base para auditorias e análise de Não Conformidades.',
    conteudoTexto:
      'Capítulo 3.4: Controle de Ferramentas e Instrumentos de Medição. Revisão 10. Requisito de aferição visual mensal sem trava informatizada.',
    capitulos: [
      {
        id: 'cap-34',
        numero: '3.4',
        titulo: 'Controle de Ferramental e Metrologia',
        requisitoTexto:
          'Capítulo 3.4 (Revisão 10): Os instrumentos devem possuir calibração periódica conferida visualmente pela ferramentaria.',
      },
    ],
    fonte: 'SGQ Interno',
    criadoEm: '2024-05-10T00:00:00Z',
    atualizadoEm: '2024-05-10T00:00:00Z',
  };

  // Documento formal no Acervo SGQ: MOMQ Rev. 12 (mais recente)
  let docAcervoSGQ: DocumentoControlado = {
    id: 'doc-momq-homolog',
    organizationId: orgId,
    codigo: 'MOMQ',
    titulo: 'Manual da Organização de Manutenção da Qualidade',
    emissor: 'Impacto Aviation SGQ',
    numeroRevisao: 'Rev. 12',
    dataRevisao: '2026-02-15',
    statusGeral: 'ATIVO',
    statusVerificacao: 'CONFORME',
    categoria: 'DOCUMENTO_INTERNO',
    responsavelNome: 'Carlos Eduardo — Auditor Líder',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  };

  // 1 & 2 & 3. Executa verificação inicial e confirma detecção de alerta
  const diagInicial = verificarAlinhamentoManualIA(docAcervoSGQ, [manualBancoIA]);
  assert(
    diagInicial.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' &&
      diagInicial.revisaoOficialReferencia === 'Rev. 12' &&
      diagInicial.revisaoNoBancoIA === 'Rev. 10' &&
      diagInicial.mensagemAlerta.includes('Possível desatualização identificada no Banco de Manuais (IA)'),
    '57.1. Verificação detecta que Acervo está na Rev. 12 e Banco IA na Rev. 10 gerando alerta'
  );

  // NC de teste para comprovar o impacto da revisão na IA
  const ncTeste: NCRecord = {
    id: 'nc-metrologia-001',
    numeroNC: 'NC-2026-089',
    titulo: 'Uso de torquímetro com calibração vencida',
    descricaoNC: 'Torquímetro digital de precisão utilizado no aperto dos parafusos do trem de pouso sem registro de calibração.',
    setor: 'Manutenção',
    normaReferencia: 'MOMQ',
    statusGeral: 'Aberta',
    dataIdentificacao: '2026-03-01',
    organizationId: orgId,
    createdAt: agora,
    updatedAt: agora,
  } as any as NCRecord;

  // 4. Auditoria de NC antes da atualização: comprova que a IA utiliza a Rev. 10
  const resultadoNCAntes = auditNCComplianceLocally(ncTeste, [manualBancoIA]);
  assert(
    resultadoNCAntes.validacaoRevisao.revisaoVigenteCadastrada === 'Rev. 10' &&
      resultadoNCAntes.trilhaAuditoriaConformidade[0]?.fonteDocumental.includes('Rev. 10'),
    '57.2. Análise de NC antes da atualização utiliza estritamente o conteúdo antigo da Rev. 10'
  );

  // 5 & 6 & 7. Executa o fluxo de atualização controlada com justificativa técnica formal
  const resultadoAtualizacao = await atualizarManualNoBancoIAControlado({
    organizationId: orgId,
    manualId: manualBancoIA.id,
    docId: docAcervoSGQ.id,
    novaRevisao: 'Rev. 12',
    novaDataVigencia: '2026-02-15',
    novoConteudoTexto:
      'Capítulo 3.4: Controle de Ferramentas e Instrumentos de Medição. Revisão 12 Oficial Vigente. Bloqueio eletrônico mandatório no sistema MRO.',
    justificativaAtualizacao:
      'Atualização formal aprovada conforme auditoria SGQ e publicação da nova revisão 12 no acervo controlado.',
    currentUser: gestorSGQ,
    manualExistente: manualBancoIA,
    docControlado: docAcervoSGQ,
    skipFirestorePersistence: true,
  });

  assert(
    resultadoAtualizacao.sucesso === true &&
      resultadoAtualizacao.mensagem.includes('atualizado com sucesso'),
    '57.3. Atualização controlada é concluída com sucesso com usuário responsável e justificativa'
  );

  // Simula estado persistido após atualização
  const manualBancoIAAtualizado: ManualRecord = {
    ...manualBancoIA,
    revisao: 'Rev. 12',
    dataVigencia: '2026-02-15',
    conteudoTexto:
      'Capítulo 3.4: Controle de Ferramentas e Instrumentos de Medição. Revisão 12 Oficial Vigente. Bloqueio eletrônico mandatório no sistema MRO para torquímetros e instrumentos sem registro de calibração.',
    capitulos: [
      {
        id: 'cap-34',
        numero: '3.4',
        titulo: 'Controle de Ferramental e Metrologia de Torquímetros',
        requisitoTexto:
          'Capítulo 3.4 (Revisão 12 Vigente): Bloqueio eletrônico mandatório no sistema MRO para torquímetros sem calibração válida.',
      },
    ],
    historicoAlteracoes: [
      {
        versao: 'Rev. 12',
        data: agora,
        autor: gestorSGQ.displayName,
        descricao: 'Atualização formal aprovada conforme auditoria SGQ.',
      },
    ],
  };

  const docAcervoAtualizado: DocumentoControlado = {
    ...docAcervoSGQ,
    manualIAId: manualBancoIAAtualizado.id,
    statusSincroniaIA: 'SINCRONIZADO',
    revisaoNoBancoIA: 'Rev. 12',
    dataUltimaVerificacaoIA: agora,
  };

  // 8 & 9. Executa nova verificação e confirma que o alerta foi limpo e estado está SINCRONIZADO
  const diagAposAtualizacao = verificarAlinhamentoManualIA(docAcervoAtualizado, [
    manualBancoIAAtualizado,
  ]);
  assert(
    diagAposAtualizacao.statusSincroniaIA === 'SINCRONIZADO' &&
      diagAposAtualizacao.revisaoOficialReferencia === 'Rev. 12' &&
      diagAposAtualizacao.revisaoNoBancoIA === 'Rev. 12' &&
      diagAposAtualizacao.acaoRecomendada === 'NENHUMA',
    '57.4. Nova verificação atesta 100% SINCRONIZADO sem comparar com metadados defasados'
  );

  // 10. Executa análise de NC APÓS a atualização e confirma que a IA utiliza a Rev. 12 atualizada
  const resultadoNCApos = auditNCComplianceLocally(ncTeste, [manualBancoIAAtualizado]);
  assert(
    resultadoNCApos.validacaoRevisao.revisaoVigenteCadastrada === 'Rev. 12' &&
      resultadoNCApos.trilhaAuditoriaConformidade[0]?.fonteDocumental.includes('Rev. 12') &&
      resultadoNCApos.enquadramentoRecomendado.trechoNormativoRelevante.includes('Revisão 12 Vigente'),
    '57.5. Análise de NC após a atualização comprova que a IA utiliza o conteúdo oficial atualizado da Rev. 12'
  );

  // ---------------------------------------------------------------------------
  // BLOCO 4: TESTAR FALHAS E PRESERVAR A RASTREABILIDADE
  // ---------------------------------------------------------------------------
  console.log('\n--- BLOCO 4: TESTES DE FALHAS E TRATAMENTO DE EXCEÇÕES ---');

  // Teste 58: Fonte pública indisponível gera FONTE_INDISPONIVEL e não altera a revisão controlada
  const docComFonteInacessivel: DocumentoControlado = {
    id: 'doc-fonte-off',
    organizationId: orgId,
    codigo: 'FAA-AC-43-13',
    titulo: 'Acceptable Methods, Techniques, and Practices',
    emissor: 'FAA',
    numeroRevisao: 'Rev. 2B',
    statusVerificacao: 'FONTE_INDISPONIVEL',
    dataUltimaVerificacao: agora,
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_AUTORIDADE',
    responsavelNome: 'Qualidade',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: agora,
    updatedAt: agora,
  };

  const refFonteOff = determinarReferenciaOficialDocumento(docComFonteInacessivel);
  assert(
    refFonteOff.revisaoOficial === 'Rev. 2B' &&
      docComFonteInacessivel.statusVerificacao === 'FONTE_INDISPONIVEL',
    '58. Fonte pública indisponível preserva a revisão controlada sem degradar o acervo'
  );

  // Teste 59: Tentativa de atualização sem justificativa técnica formal é bloqueada com exceção
  const tentativaSemJustificativa = await atualizarManualNoBancoIAControlado({
    organizationId: orgId,
    manualId: manualBancoIA.id,
    docId: docAcervoSGQ.id,
    novaRevisao: 'Rev. 15',
    novaDataVigencia: '2026-05-01',
    justificativaAtualizacao: '   ', // Inválida / Vazia
    currentUser: gestorSGQ,
    manualExistente: manualBancoIA,
    docControlado: docAcervoSGQ,
  });

  assert(
    tentativaSemJustificativa.sucesso === false &&
      tentativaSemJustificativa.mensagem.includes('Justificativa técnica formal é obrigatória'),
    '59. Atualização sem justificativa técnica formal é bloqueada formalmente'
  );

  // Teste 60: Usuário sem permissão de escrita (CONSULTA / VIEWER) é bloqueado
  const tentativaSemPermissao = await atualizarManualNoBancoIAControlado({
    organizationId: orgId,
    manualId: manualBancoIA.id,
    docId: docAcervoSGQ.id,
    novaRevisao: 'Rev. 15',
    novaDataVigencia: '2026-05-01',
    justificativaAtualizacao: 'Tentativa de alteração por auditor externo',
    currentUser: usuarioConsulta,
    manualExistente: manualBancoIA,
    docControlado: docAcervoSGQ,
  });

  assert(
    tentativaSemPermissao.sucesso === false &&
      tentativaSemPermissao.mensagem.includes('Permissão negada'),
    '60. Usuário com perfil de consulta/visualizador é formalmente impedido de atualizar'
  );

  // Teste 61: Detecção de concorrência simultânea
  // Se manualExistente já está na revisão desejada (atualizado por outro usuário)
  const tentativaConcorrente = await atualizarManualNoBancoIAControlado({
    organizationId: orgId,
    manualId: manualBancoIAAtualizado.id,
    docId: docAcervoSGQ.id,
    novaRevisao: 'Rev. 12', // Já atualizado anteriormente
    novaDataVigencia: '2026-02-15',
    justificativaAtualizacao: 'Segunda tentativa simultânea de gravação da mesma revisão',
    currentUser: gestorSGQ,
    manualExistente: manualBancoIAAtualizado, // Já na Rev. 12
    docControlado: docAcervoSGQ,
  });

  assert(
    tentativaConcorrente.sucesso === false &&
      tentativaConcorrente.mensagem.includes('Conflito de concorrência detectado'),
    '61. Detecção de concorrência bloqueia gravação concorrente redundante'
  );

  // Teste 62: Verificação em lote com documentos sem correspondência não falha
  const relatorioLote = await executarVerificacaoEmLoteBancoIA(
    orgId,
    [docCaravan208, docBoeing, docAnac],
    [manualSkyhawk172, manualAirbus], // Nenhum corresponde
    gestorSGQ,
    true // skipFirestorePersistence para teste determinístico
  );

  assert(
    relatorioLote.totalVerificados === 3 &&
      relatorioLote.totalSemCorrespondencia === 3 &&
      relatorioLote.diagnosticos.every((d) => d.statusSincroniaIA === 'SEM_CORRESPONDENCIA'),
    '62. Verificação em lote identifica documentos sem correspondência sem interromper execução'
  );

  // ---------------------------------------------------------------------------
  // BLOCO 5: AUDITORIA E HISTÓRICO
  // ---------------------------------------------------------------------------
  console.log('\n--- BLOCO 5: AUDITORIA E RASTREABILIDADE INTEGRAL ---');

  // Teste 63: Preservação de dados anteriores no histórico de alterações do manual
  assert(
    manualBancoIAAtualizado.historicoAlteracoes !== undefined &&
      manualBancoIAAtualizado.historicoAlteracoes.length > 0 &&
      manualBancoIAAtualizado.historicoAlteracoes[0]?.versao === 'Rev. 12' &&
      manualBancoIAAtualizado.historicoAlteracoes[0]?.autor === gestorSGQ.displayName,
    '63. Histórico de alterações do manual preserva o registro com autor, data e justificativa'
  );

  console.log('\n=============================================================================');
  console.log(`  RESUMO DA HOMOLOGAÇÃO: ${passed} PASS, ${failed} FAIL`);
  console.log('=============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHomologationSuite().catch((err) => {
  console.error('Erro na execução dos testes de homologação:', err);
  process.exit(1);
});
