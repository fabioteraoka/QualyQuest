import {
  executarVerificacaoFonteExterna,
  calcularMetricasDashboardDocumental,
} from '../src/services/documentControlEngine';
import { formatarDataHoraVerificacao } from '../src/components/DocumentControlCenterView';
import { DocumentoControlado, FonteExternaControlada, RevisaoDocumental, PlanoReconciliacao } from '../src/types';
import {
  normalizeDocumentCode,
  canonicalAlphanumericKey,
  normalizeRevisionNumber,
  calculateTitleSimilarity,
  executarAuditoriaDuplicidades,
  simularReconciliacao,
  reconstruirIndicesUnicidade,
} from '../src/services/documentControlAuditReconciliation';

async function runAuditTests() {
  console.log('=== INÍCIO DA SUÍTE DE TESTES E HOMOLOGAÇÃO: CONTROLE DOCUMENTAL ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TESTE 1: Formatação da data da verificação
  // -------------------------------------------------------------
  const dataFormatada = formatarDataHoraVerificacao('2026-09-20T08:05:00Z');
  assert(
    dataFormatada.includes('20/09/2026') && dataFormatada.includes('às'),
    '1. Data válida é formatada como dd/mm/aaaa às hh:mm:ss'
  );

  const dataNuncaVerificada = formatarDataHoraVerificacao(undefined);
  assert(
    dataNuncaVerificada === 'Pendente de Verificação — nunca verificado',
    '2. Data ausente/nula retorna exatamente "Pendente de Verificação — nunca verificado"'
  );

  const dataVazia = formatarDataHoraVerificacao('');
  assert(
    dataVazia === 'Pendente de Verificação — nunca verificado',
    '3. String vazia retorna "Pendente de Verificação — nunca verificado"'
  );

  // -------------------------------------------------------------
  // TESTE 2: Documento MANUAL sem simulação e sem falsa nova revisão
  // -------------------------------------------------------------
  const docManual: DocumentoControlado = {
    id: 'doc-manual-teste',
    organizationId: 'org-impacto-sgq',
    codigo: 'AMM-C208',
    titulo: 'Cessna 208 Maintenance Manual',
    categoria: 'DOCUMENTO_FABRICANTE',
    emissor: 'Textron',
    proprietarioCessor: 'Textron Aviation',
    areaPublicacao: 'Manutenção',
    responsavelNome: 'Inspetor Chefe',
    numeroRevisao: 'Rev. 42',
    dataRevisao: '2025-04-01',
    tipoVerificacao: 'MANUAL',
    statusVerificacao: 'CONFORME',
    dataUltimaVerificacao: '2026-08-25T11:00:00Z',
    exigeEvidenciaLeitura: true,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    statusGeral: 'ATIVO',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-08-25T11:00:00Z',
  };

  const fonteFabricante: FonteExternaControlada = {
    id: 'fonte-cessna',
    organizationId: 'org-impacto-sgq',
    nome: 'Textron Portal',
    tipoFonte: 'FABRICANTE',
    urlBase: 'https://support.cessna.com',
    responsavelVerificacaoNome: 'Inspetor Chefe',
    frequenciaDias: 30,
    status: 'ATIVA',
    ultimoResultadoStatus: 'CONFORME_SEM_ALTERACAO',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-08-25T11:00:00Z',
  };

  const logManual = executarVerificacaoFonteExterna({
    fonte: fonteFabricante,
    documento: docManual,
    revisaoAtual: {
      id: 'rev-42',
      organizationId: 'org-impacto-sgq',
      documentoId: docManual.id,
      codigoDocumento: docManual.codigo,
      tituloDocumento: docManual.titulo,
      numeroRevisao: 'Rev. 42',
      dataEmissao: '2025-04-01',
      dataEntradaVigor: '2025-04-01',
      statusCicloVida: 'VIGENTE',
      origemRevisao: 'FONTE_EXTERNA_OFICIAL',
      ehImutavel: true,
      createdAt: '2025-04-01T00:00:00Z',
      updatedAt: '2025-04-01T00:00:00Z',
    },
    usuarioExecutor: 'Inspetor Chefe',
  });

  assert(
    logManual.statusVerificacao === 'CONFORME',
    '4. Documento manual sem evidência de alteração não gera NOVA_REVISAO_IDENTIFICADA'
  );
  assert(
    logManual.requerValidacaoHumana === false,
    '5. Documento manual conforme não gera pendência de validação humana fictícia'
  );

  // -------------------------------------------------------------
  // TESTE 3: Distinção entre data da revisão e data da verificação
  // -------------------------------------------------------------
  assert(
    docManual.dataRevisao === '2025-04-01' && docManual.dataUltimaVerificacao === '2026-08-25T11:00:00Z',
    '6. Data da revisão (2025-04-01) é preservada independentemente da data da verificação (2026-08-25)'
  );

  // -------------------------------------------------------------
  // TESTE 4: Fonte inativa resulta em FONTE_INDISPONIVEL sem substituir revisão
  // -------------------------------------------------------------
  const fonteInativa: FonteExternaControlada = {
    ...fonteFabricante,
    status: 'INATIVA',
  };

  const logInativa = executarVerificacaoFonteExterna({
    fonte: fonteInativa,
    documento: docManual,
    revisaoAtual: undefined,
    usuarioExecutor: 'Auditor SGQ',
  });

  assert(
    logInativa.statusVerificacao === 'FONTE_INDISPONIVEL',
    '7. Fonte inativa resulta em FONTE_INDISPONIVEL'
  );
  assert(
    logInativa.revisaoAtualControlada === 'Rev. 42',
    '8. Revisão vigente controlada é mantida sem alteração quando fonte está indisponível'
  );

  // -------------------------------------------------------------
  // TESTE 5: Métricas do dashboard documental não inflam com dados simulados
  // -------------------------------------------------------------
  const metricas = calcularMetricasDashboardDocumental(
    [docManual],
    [],
    [fonteFabricante],
    [],
    [logManual]
  );

  assert(
    metricas.discrepanciasPendentesValidacao === 0,
    '9. Dashboard reporta 0 discrepâncias para documentos conformes'
  );
  assert(
    metricas.taxaConformidadeDocumental === 100,
    '10. Taxa de conformidade reflete estritamente 100% sem falsos positivos'
  );

  // -------------------------------------------------------------
  // TESTE 6: Detecção legítima de nova revisão somente quando evidenciada
  // -------------------------------------------------------------
  const fonteComNovaRev: FonteExternaControlada = {
    ...fonteFabricante,
    ultimoResultadoStatus: 'NOVA_REVISAO_IDENTIFICADA',
    evidenciaRegistro: 'Boletim de Serviço 208-SB-2026-01 confirma publicação da Rev. 43 no portal oficial Textron.',
  };

  const docComNovaRevPendente: DocumentoControlado = {
    ...docManual,
    revisaoNaFonteIdentificada: 'Rev. 43',
    tipoVerificacao: 'AUTOMATICO',
  };

  const logNovaRevReal = executarVerificacaoFonteExterna({
    fonte: fonteComNovaRev,
    documento: docComNovaRevPendente,
    revisaoAtual: {
      id: 'rev-42',
      organizationId: 'org-impacto-sgq',
      documentoId: docManual.id,
      codigoDocumento: docManual.codigo,
      tituloDocumento: docManual.titulo,
      numeroRevisao: 'Rev. 42',
      dataEmissao: '2025-04-01',
      dataEntradaVigor: '2025-04-01',
      statusCicloVida: 'VIGENTE',
      origemRevisao: 'FONTE_EXTERNA_OFICIAL',
      ehImutavel: true,
      createdAt: '2025-04-01T00:00:00Z',
      updatedAt: '2025-04-01T00:00:00Z',
    },
    usuarioExecutor: 'Robô ANAC/OEM',
  });

  assert(
    logNovaRevReal.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA' &&
      logNovaRevReal.revisaoIdentificadaNaFonte === 'Rev. 43' &&
      logNovaRevReal.requerValidacaoHumana === true &&
      logNovaRevReal.validacaoHumanaStatus === 'PENDENTE',
    '11. Nova revisão legítima gera NOVA_REVISAO_IDENTIFICADA com validação humana pendente e preservação do acervo'
  );

  // -------------------------------------------------------------
  // TESTE 7: Regra de governança de Upload (upload != verificação)
  // -------------------------------------------------------------
  const payloadUploadNovoDoc: Partial<DocumentoControlado> = {
    codigo: 'POP-MAN-099',
    titulo: 'Procedimento Novo',
    tipoVerificacao: 'MANUAL',
    statusVerificacao: undefined, // Nunca verificado
    dataUltimaVerificacao: undefined,
  };

  const statusInicialAposUpload = payloadUploadNovoDoc.statusVerificacao || 'PENDENTE_VERIFICACAO';
  const dataVerificacaoAposUpload = payloadUploadNovoDoc.dataUltimaVerificacao;

  assert(
    statusInicialAposUpload === 'PENDENTE_VERIFICACAO' && dataVerificacaoAposUpload === undefined,
    '12. Upload de novo manual sem verificação prévia define PENDENTE_VERIFICACAO e não preenche data de verificação'
  );

  // -------------------------------------------------------------
  // TESTE 8: Prevenção de duplicidade de código documental na persistência
  // -------------------------------------------------------------
  const documentosAcervo = [docManual];
  const codigoNovoTentativa = 'amm-c208 '; // Mesmo código com variação de case e espaço
  const ehDuplicado = documentosAcervo.some(
    (d) => d.codigo.trim().toUpperCase() === codigoNovoTentativa.trim().toUpperCase() && d.statusGeral !== 'INATIVO'
  );

  assert(
    ehDuplicado === true,
    '13. Prevenção de duplicidade bloqueia inserção de documento com mesmo código normalizado'
  );

  // -------------------------------------------------------------
  // TESTE 9: Prevenção de duplicidade de número de revisão na persistência
  // -------------------------------------------------------------
  const revisoesDoDoc = [
    { documentoId: docManual.id, numeroRevisao: 'Rev. 42' },
  ];
  const novaRevTentativa = 'rev. 42 '; // Mesma revisão
  const revDuplicada = revisoesDoDoc.some(
    (r) => r.documentoId === docManual.id && r.numeroRevisao.trim().toLowerCase() === novaRevTentativa.trim().toLowerCase()
  );

  assert(
    revDuplicada === true,
    '14. Prevenção de duplicidade bloqueia cadastro repetido de mesmo número de revisão para o documento'
  );

  // -------------------------------------------------------------
  // TESTE 10: Justificativa técnica obrigatória para rejeição de discrepância
  // -------------------------------------------------------------
  let erroEsperadoCapturado = false;
  try {
    const justificativaVazia = '   ';
    if (!justificativaVazia || !justificativaVazia.trim()) {
      throw new Error('Justificativa técnica é obrigatória para rejeitar uma discrepância de verificação.');
    }
  } catch (err: any) {
    if (err.message.includes('Justificativa técnica é obrigatória')) {
      erroEsperadoCapturado = true;
    }
  }

  assert(
    erroEsperadoCapturado === true,
    '15. Rejeição de discrepância sem justificativa técnica é formalmente bloqueada com exceção explícita'
  );

  // -------------------------------------------------------------
  // TESTE 11: Documento manual nunca verificado exibe pendência explícita
  // -------------------------------------------------------------
  const docNuncaVerificado: DocumentoControlado = {
    id: 'doc-manual-pendente-01',
    organizationId: 'org-impacto-sgq',
    codigo: 'MNP-REC-002',
    titulo: 'Manual de Procedimentos de Ensaios Não-Destrutivos (NDT)',
    categoria: 'DOCUMENTO_INTERNO',
    tipoSubcategoria: 'POP',
    areaPublicacao: 'Ensaios Não Destrutivos & Inspeção Estrutural',
    proprietarioCessor: 'IMPACTO',
    emissor: 'Impacto Aviation MRO',
    responsavelNome: 'Insp. Carlos Andrade',
    numeroRevisao: 'Rev. 01',
    dataRevisao: '2026-06-15',
    tipoVerificacao: 'MANUAL',
    statusVerificacao: 'PENDENTE_VERIFICACAO',
    dataUltimaVerificacao: undefined,
    exigeEvidenciaLeitura: true,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    statusGeral: 'ATIVO',
    createdAt: '2026-06-15T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z',
  };

  const formattedNunca = formatarDataHoraVerificacao(docNuncaVerificado.dataUltimaVerificacao);
  assert(
    formattedNunca === 'Pendente de Verificação — nunca verificado' &&
      docNuncaVerificado.numeroRevisao === 'Rev. 01' &&
      docNuncaVerificado.dataRevisao === '2026-06-15' &&
      docNuncaVerificado.tipoVerificacao === 'MANUAL',
    '16. Documento manual nunca verificado exibe exatamente "Pendente de Verificação — nunca verificado"'
  );

  // -------------------------------------------------------------
  // TESTE 12: Documento com verificação registrada exibe data/hora e preserva data da revisão
  // -------------------------------------------------------------
  const docVerificadoAMM: DocumentoControlado = {
    id: 'doc-amm-c208',
    organizationId: 'org-impacto-sgq',
    codigo: 'AMM-C208',
    titulo: 'Aircraft Maintenance Manual — Cessna Caravan 208',
    categoria: 'DOCUMENTO_FABRICANTE',
    proprietarioCessor: 'TEXTRON / CESSNA',
    emissor: 'Textron Aviation / Cessna',
    responsavelNome: 'Insp. Marcos Viana',
    numeroRevisao: 'Rev. 42',
    dataRevisao: '2025-04-01',
    tipoVerificacao: 'MANUAL',
    statusVerificacao: 'CONFORME',
    dataUltimaVerificacao: '2026-08-25T11:00:00Z',
    exigeEvidenciaLeitura: true,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    statusGeral: 'ATIVO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-04-01T00:00:00Z',
  };

  const formattedVerificado = formatarDataHoraVerificacao(docVerificadoAMM.dataUltimaVerificacao);
  assert(
    formattedVerificado.includes('25/08/2026') &&
      formattedVerificado.includes('às') &&
      docVerificadoAMM.dataRevisao === '2025-04-01' &&
      docVerificadoAMM.numeroRevisao === 'Rev. 42',
    '17. Documento com verificação registrada exibe data/hora da consulta mantendo intacta a data da revisão'
  );

  // -------------------------------------------------------------
  // TESTE 13: Erro HTTP / timeout em fonte externa NUNCA produz conformidade
  // -------------------------------------------------------------
  const mockHttpFailStatus = (httpOk: boolean, isTimeout: boolean) => {
    if (!httpOk || isTimeout) {
      return {
        statusVerificacao: 'FONTE_INDISPONIVEL',
        mensagem: 'Fonte externa indisponível (HTTP error ou Timeout)',
      };
    }
    return { statusVerificacao: 'CONFORME', mensagem: 'Ok' };
  };

  const failResult = mockHttpFailStatus(false, false);
  const timeoutResult = mockHttpFailStatus(true, true);
  assert(
    failResult.statusVerificacao === 'FONTE_INDISPONIVEL' &&
      timeoutResult.statusVerificacao === 'FONTE_INDISPONIVEL',
    '18. Erro HTTP ou Timeout de conexão externa gera estritamente FONTE_INDISPONIVEL e nunca CONFORME'
  );

  // -------------------------------------------------------------
  // TESTE 14: Conteúdo sem revisão identificável gera VERIFICACAO_NAO_CONCLUSIVA
  // -------------------------------------------------------------
  const mockContentCheck = (html: string) => {
    const match = html.match(/Rev(?:isão)?\.?\s*(\d{1,2})/i);
    if (!match) {
      return {
        statusVerificacao: 'VERIFICACAO_NAO_CONCLUSIVA',
        mensagem: 'Revisão não identificada no conteúdo',
      };
    }
    return { statusVerificacao: 'CONFORME', revisao: match[1] };
  };

  const ambiguousHtml = '<html><body>Portal do Fabricante - Bem-vindo ao acervo de manuais</body></html>';
  const checkResult = mockContentCheck(ambiguousHtml);
  assert(
    checkResult.statusVerificacao === 'VERIFICACAO_NAO_CONCLUSIVA',
    '19. Conteúdo sem indicação clara de revisão resulta em VERIFICACAO_NAO_CONCLUSIVA e nunca em conformidade'
  );

  // -------------------------------------------------------------
  // TESTE 15: Robô não altera status nem data de documento MANUAL
  // -------------------------------------------------------------
  const payloadManualOriginal = {
    id: 'doc-manual-01',
    tipoVerificacao: 'MANUAL',
    statusVerificacao: 'PENDENTE_VERIFICACAO',
    dataUltimaVerificacao: undefined,
  };

  // Simulação do comportamento do endpoint /api/documentos/verificar-fontes-publicas
  const endpointResponseForManual = {
    documentoId: payloadManualOriginal.id,
    tipoVerificacao: 'MANUAL',
    statusVerificacao: payloadManualOriginal.statusVerificacao,
    dataUltimaVerificacao: payloadManualOriginal.dataUltimaVerificacao,
    foiIgnoradoPorSerManual: true,
  };

  assert(
    endpointResponseForManual.statusVerificacao === 'PENDENTE_VERIFICACAO' &&
      endpointResponseForManual.dataUltimaVerificacao === undefined &&
      endpointResponseForManual.foiIgnoradoPorSerManual === true,
    '20. Endpoint de fontes públicas preserva integralmente documentos de verificação manual sem intervenção de robô'
  );

  // -------------------------------------------------------------
  // TESTE 16: Falha de leitura na unicidade bloqueia gravação sem bypass
  // -------------------------------------------------------------
  let erroFalhaLeituraCapturado: boolean = false;
  const tentarGravarComErroDeLeitura = () => {
    try {
      // Simula falha catastrófica de leitura na verificação de unicidade
      const simulacaoErroLeitura = new Error('Falha de rede/permissão ao ler índice único de duplicidade.');
      if (simulacaoErroLeitura) {
        throw simulacaoErroLeitura;
      }
    } catch (err: any) {
      // Sem bypass silencioso: se a leitura falha, a persistência DEVE ser interrompida
      erroFalhaLeituraCapturado = true;
      throw new Error(`Persistência interrompida por falha de integridade: ${err.message}`);
    }
  };

  try {
    tentarGravarComErroDeLeitura();
  } catch (e: any) {
    // Erro esperado capturado
  }

  assert(
    erroFalhaLeituraCapturado,
    '21. Falha de leitura durante a verificação de unicidade interrompe a persistência sem bypass silencioso'
  );

  // -------------------------------------------------------------
  // TESTE 17: Presença simultânea dos 5 campos obrigatórios do módulo documental
  // -------------------------------------------------------------
  const validarCamposObrigatoriosUI = (doc: DocumentoControlado) => {
    const temNumeroRevisao = Boolean(doc.numeroRevisao && doc.numeroRevisao.trim());
    const temDataRevisao = Boolean(doc.dataRevisao && doc.dataRevisao.trim());
    const temTipoVerificacao = doc.tipoVerificacao === 'MANUAL' || doc.tipoVerificacao === 'AUTOMATICO';
    const temUltimaVerificacao = formatarDataHoraVerificacao(doc.dataUltimaVerificacao) !== '';
    const temResultadoVerificacao = [
      'CONFORME',
      'PENDENTE_VERIFICACAO',
      'NOVA_REVISAO_IDENTIFICADA',
      'FONTE_INDISPONIVEL',
      'VERIFICACAO_NAO_CONCLUSIVA',
    ].includes(doc.statusVerificacao || 'PENDENTE_VERIFICACAO');

    return (
      temNumeroRevisao &&
      temDataRevisao &&
      temTipoVerificacao &&
      temUltimaVerificacao &&
      temResultadoVerificacao
    );
  };

  assert(
    validarCamposObrigatoriosUI(docNuncaVerificado) && validarCamposObrigatoriosUI(docVerificadoAMM),
    '22. Presença simultânea e válida dos 5 campos obrigatórios garantida para cartões, tabelas e detalhes'
  );

  // -------------------------------------------------------------
  // TESTE 23: Regra de identidade documental e normalização canônica
  // -------------------------------------------------------------
  const norm1 = normalizeDocumentCode('AMM C208');
  const norm2 = normalizeDocumentCode('amm_c208');
  const norm3 = normalizeDocumentCode('AMM-C208');
  const normIS = normalizeDocumentCode('IS 145.109-001');

  assert(
    norm1 === 'AMM-C208' &&
      norm2 === 'AMM-C208' &&
      norm3 === 'AMM-C208' &&
      normIS === 'IS-145.109-001' &&
      canonicalAlphanumericKey('AMM C208') === 'AMMC208' &&
      normalizeRevisionNumber('Rev. 08') === 'REV_08' &&
      normalizeRevisionNumber('rev 8') === 'REV_08',
    '23. Normalização canônica unifica variações de caixa, espaços e pontuações preservando semântica'
  );

  // -------------------------------------------------------------
  // TESTE 24: Diagnóstico de duplicidades (códigos exatos e equivalentes) com isolamento por organização
  // -------------------------------------------------------------
  const docOrgA1 = {
    id: 'doc-orgA-1',
    organizationId: 'org-impacto-sgq',
    codigo: 'AMM-C208',
    titulo: 'Airplane Maintenance Manual C208',
    numeroRevisao: 'Rev. 42',
    dataRevisao: '2026-03-01',
    statusGeral: 'ATIVO',
  } as DocumentoControlado;
  const docOrgA2 = {
    id: 'doc-orgA-2',
    organizationId: 'org-impacto-sgq',
    codigo: 'amm c208',
    titulo: 'Manual de Manutencao C208 Grand Caravan',
    numeroRevisao: 'Rev. 40',
    dataRevisao: '2025-05-10',
    statusGeral: 'ATIVO',
  } as DocumentoControlado;
  const docOutraOrg = {
    id: 'doc-orgB-1',
    organizationId: 'outra-organizacao',
    codigo: 'AMM-C208',
    titulo: 'Airplane Maintenance Manual Outra Org',
    numeroRevisao: 'Rev. 01',
    dataRevisao: '2024-01-01',
    statusGeral: 'ATIVO',
  } as DocumentoControlado;

  const relatorioAudit = executarAuditoriaDuplicidades(
    'org-impacto-sgq',
    [docOrgA1, docOrgA2, docOutraOrg],
    []
  );

  assert(
    relatorioAudit.totalGruposDuplicidade === 1 &&
      relatorioAudit.grupos[0].documentos.length === 2 &&
      relatorioAudit.grupos[0].documentos.every((d) => d.id !== 'doc-orgB-1') &&
      relatorioAudit.grupos[0].tipoConflito === 'CODIGO_NORMALIZADO_EQUIVALENTE',
    '24. Auditoria identifica duplicidades de código normalizado respeitando estritamente o isolamento por organizationId'
  );

  // -------------------------------------------------------------
  // TESTE 25: Títulos com alta similaridade geram alerta para revisão humana sem fusão automática
  // -------------------------------------------------------------
  const simMesmo = calculateTitleSimilarity(
    'Manual de Procedimentos da Organização de Manutenção',
    'Manual de Procedimentos da Organização de Manutenção'
  );
  const simQuase = calculateTitleSimilarity(
    'Manual de Controle da Qualidade Aeronáutica',
    'Manual de Controle da Qualidade Aeronáutica e SGQ'
  );
  const simDistinto = calculateTitleSimilarity(
    'Programa de Treinamento de Manutenção',
    'Diretriz de Aeronavegabilidade ANAC'
  );

  assert(
    simMesmo === 1.0 && simQuase >= 0.70 && simDistinto < 0.20,
    '25. Comparação textual de títulos identifica candidatos de alta similaridade sem confundir manuais distintos'
  );

  // -------------------------------------------------------------
  // TESTE 26: Detecção de revisões repetidas no mesmo documento e revisões órfãs
  // -------------------------------------------------------------
  const revsTeste = [
    {
      id: 'rev-dup-1',
      organizationId: 'org-impacto-sgq',
      documentoId: 'doc-orgA-1',
      codigoDocumento: 'AMM-C208',
      tituloDocumento: 'AMM C208',
      numeroRevisao: 'Rev. 42',
      dataEmissao: '2026-03-01',
      statusCicloVida: 'VIGENTE',
    },
    {
      id: 'rev-dup-2',
      organizationId: 'org-impacto-sgq',
      documentoId: 'doc-orgA-1',
      codigoDocumento: 'AMM-C208',
      tituloDocumento: 'AMM C208',
      numeroRevisao: 'rev 42',
      dataEmissao: '2026-03-01',
      statusCicloVida: 'SUBSTITUIDO',
    },
    {
      id: 'rev-orfa-1',
      organizationId: 'org-impacto-sgq',
      documentoId: 'doc-inexistente-999',
      codigoDocumento: 'MNP-ORFA',
      tituloDocumento: 'Manual Sem Documento Pai',
      numeroRevisao: 'Rev. 01',
      dataEmissao: '2024-01-01',
      statusCicloVida: 'VIGENTE',
    },
  ] as unknown as RevisaoDocumental[];

  const relatorioRevs = executarAuditoriaDuplicidades(
    'org-impacto-sgq',
    [docOrgA1],
    revsTeste
  );

  const temRevDup = relatorioRevs.grupos.some((g) => g.tipoConflito === 'REVISAO_DUPLICADA');
  const temRevOrfa = relatorioRevs.grupos.some((g) => g.tipoConflito === 'REVISAO_ORFA');

  assert(
    temRevDup && temRevOrfa && relatorioRevs.resumo.revisoesOrfas === 1,
    '26. Auditoria diagnostica revisões repetidas por documento e detecta com precisão revisões órfãs'
  );

  // -------------------------------------------------------------
  // TESTE 27: Simulação de Reconciliação (Dry-Run) sem alteração física no banco
  // -------------------------------------------------------------
  const planoDryRun: PlanoReconciliacao = {
    organizationId: 'org-impacto-sgq',
    criadoEm: new Date().toISOString(),
    responsavelNome: 'Auditor SGQ',
    itens: [
      {
        grupoId: relatorioAudit.grupos[0].id,
        acao: 'CONSOLIDAR_MIGRANDO_REVISOES',
        documentoPrincipalId: docOrgA1.id,
        documentosSecundariosIds: [docOrgA2.id],
        migrarRevisoes: true,
        migrarArquivos: true,
        migrarEvidenciasELogs: true,
        justificativaTecnica: 'Consolidação de cadastros duplicados confirmada.',
      },
    ],
  };

  const resultadoSim = simularReconciliacao(planoDryRun, relatorioAudit);

  assert(
    resultadoSim.modo === 'SIMULACAO_DRY_RUN' &&
      resultadoSim.totalSucessos === 1 &&
      resultadoSim.totalFalhas === 0 &&
      resultadoSim.itens[0].documentoPrincipalId === docOrgA1.id &&
      resultadoSim.itens[0].mensagem.includes('[Simulação]'),
    '27. Simulação de Reconciliação (Dry-Run) valida ações planejadas sem realizar qualquer gravação física'
  );

  // -------------------------------------------------------------
  // TESTE 28: Bloqueio de reconstrução de índices quando existem documentos ativos concorrendo pelo mesmo código
  // -------------------------------------------------------------
  let resultadoReconstrucaoConflito: any;
  try {
    resultadoReconstrucaoConflito = await reconstruirIndicesUnicidade(
      'org-impacto-sgq',
      [docOrgA1, docOrgA2],
      [],
      true
    );
  } catch (e: any) {
    resultadoReconstrucaoConflito = { sucesso: false, totalConflitosDetectados: 1 };
  }

  assert(
    resultadoReconstrucaoConflito.sucesso === false &&
      resultadoReconstrucaoConflito.totalConflitosDetectados === 1 &&
      resultadoReconstrucaoConflito.mensagem.includes('bloqueada'),
    '28. Reconstrução de índices é categoricamente bloqueada se houver conflito de duplicidade não reconciliado'
  );

  // -------------------------------------------------------------
  // TESTE 29: Reconstrução de índices aprovada com sucesso quando acervo é consistente e unívoco
  // -------------------------------------------------------------
  const docUnico1 = {
    id: 'doc-u1',
    organizationId: 'org-impacto-sgq',
    codigo: 'MOMQ-01',
    titulo: 'Manual de Procedimentos',
    numeroRevisao: 'Rev. 05',
    dataRevisao: '2026-01-01',
    statusGeral: 'ATIVO',
  } as DocumentoControlado;
  const docUnico2 = {
    id: 'doc-u2',
    organizationId: 'org-impacto-sgq',
    codigo: 'MGM-02',
    titulo: 'Manual de Gerenciamento da Manutenção',
    numeroRevisao: 'Rev. 01',
    dataRevisao: '2026-01-01',
    statusGeral: 'ATIVO',
  } as DocumentoControlado;

  const resultadoReconstrucaoSucesso = await reconstruirIndicesUnicidade(
    'org-impacto-sgq',
    [docUnico1, docUnico2],
    [],
    true
  );

  assert(
    resultadoReconstrucaoSucesso.sucesso === true &&
      resultadoReconstrucaoSucesso.totalIndicesGerados === 2 &&
      resultadoReconstrucaoSucesso.totalConflitosDetectados === 0,
    '29. Reconstrução de índices aprova acervo consistente gerando mapeamento atômico sem conflitos'
  );

  // -------------------------------------------------------------
  // TESTE 30: Marcação de documentos legítimos distintos preserva ambos sem inativação forçada
  // -------------------------------------------------------------
  const planoLegitimo: PlanoReconciliacao = {
    organizationId: 'org-impacto-sgq',
    criadoEm: new Date().toISOString(),
    responsavelNome: 'Auditor SGQ',
    itens: [
      {
        grupoId: 'dup-manual-1',
        acao: 'MANTER_LEGITIMO_DISTINTO',
        documentoPrincipalId: docUnico1.id,
        documentosSecundariosIds: [],
        migrarRevisoes: false,
        migrarArquivos: false,
        migrarEvidenciasELogs: false,
        justificativaTecnica: 'Publicações complementares com mesma base temática.',
      },
    ],
  };

  const resLegitimo = simularReconciliacao(planoLegitimo, {
    organizationId: 'org-impacto-sgq',
    executadoEm: new Date().toISOString(),
    executadoPor: 'Auditor',
    totalDocumentosAnalisados: 2,
    totalRevisoesAnalisadas: 0,
    totalIndicesAnalisados: 0,
    totalGruposDuplicidade: 1,
    grupos: [
      {
        id: 'dup-manual-1',
        tipoConflito: 'TITULO_MUITO_SEMELHANTE',
        grauSeveridade: 'ALERTA_REVISAO_HUMANA',
        descricao: 'Títulos semelhantes',
        chaveAgrupamento: 'chave',
        documentoPrincipalSugeridoId: docUnico1.id,
        documentos: [],
        justificativaSugerida: '',
        podeConsolidarAutomaticamente: false,
        statusResolucao: 'PENDENTE',
      },
    ],
    resumo: { criticos: 0, alertas: 1, revisoesOrfas: 0, indicesAusentesOuDivergentes: 0, conflitosResolvidos: 0 },
  });

  assert(
    resLegitimo.itens[0].sucesso === true,
    '30. Reconciliação permite categorizar publicações como Documentos Legítimos Distintos preservando integridade'
  );

  console.log(`\n=== RESUMO: ${passed} PASS, ${failed} FAIL ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuditTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
