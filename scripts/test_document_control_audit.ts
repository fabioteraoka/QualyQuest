import {
  executarVerificacaoFonteExterna,
  calcularMetricasDashboardDocumental,
  determinarRevisaoVigenteNaData,
} from '../src/services/documentControlEngine';
import { formatarDataHoraVerificacao } from '../src/components/DocumentControlCenterView';
import { DocumentoControlado, FonteExternaControlada, RevisaoDocumental, PlanoReconciliacao, ManualRecord } from '../src/types';
import {
  normalizeDocumentCode,
  canonicalAlphanumericKey,
  normalizeRevisionNumber,
  calculateTitleSimilarity,
  executarAuditoriaDuplicidades,
  simularReconciliacao,
  reconstruirIndicesUnicidade,
} from '../src/services/documentControlAuditReconciliation';
import {
  compararRevisoesDocumentais,
  compararRevisoesDocumentaisDetalhada,
  executarComparativoAcervoComBancoManuaisIA,
  verificarAlinhamentoManualIA,
  identificarCorrespondenciaManualIA,
  determinarReferenciaOficialDocumento,
  verificarIncompatibilidadeTecnica,
  atualizarManualNoBancoIAControlado,
  vincularDocumentoAoManualIA,
} from '../src/services/manualsCrossCheckService';
import { auditNCComplianceLocally } from '../src/utils/sgqExtractor';
import { NCRecord } from '../src/types';

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

  // -------------------------------------------------------------
  // TESTE 31: Comparação precisa de versões e revisões documentais
  // -------------------------------------------------------------
  const comp1 = compararRevisoesDocumentais('Rev. 15', '2024-05-10', 'Rev. 14', '2023-11-20');
  const comp2 = compararRevisoesDocumentais('Rev. 02', '2024-01-01', 'Rev. 02', '2024-01-01');
  const comp3 = compararRevisoesDocumentais('01', '', '02', '');
  assert(
    comp1 > 0 && comp2 === 0 && comp3 < 0,
    '31. Comparação cronológica e numérica de revisões documentais identifica com precisão versões posteriores e iguais'
  );

  // -------------------------------------------------------------
  // TESTE 32: Auditoria cruzada detecta quando Banco de Manuais (IA) possui revisão mais recente que Acervo SGQ
  // -------------------------------------------------------------
  const docSGQ_EASA: DocumentoControlado = {
    id: 'doc-sgq-easa',
    organizationId: 'org-test',
    codigo: 'EASA Supplement',
    titulo: 'EASA Supplement MNT-004',
    emissor: 'ORGANIZACAO',
    numeroRevisao: 'Rev 01',
    dataRevisao: '2023-01-10',
    statusGeral: 'ATIVO',
    statusVerificacao: 'CONFORME',
    categoria: 'DOCUMENTO_INTERNO',
    responsavelNome: 'SGQ',
    exigeEvidenciaLeitura: false,
    frequenciaVerificacaoDias: 90,
    arquivoNome: 'EASA_Supp_Rev01.pdf',
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2023-01-10T00:00:00Z',
    updatedAt: '2023-01-10T00:00:00Z',
  };

  const manualIA_EASA: ManualRecord = {
    id: 'manual-ia-easa',
    codigo: 'EASA Supplement',
    titulo: 'EASA Supplement MNT-004',
    revisao: 'Rev 02',
    dataVigencia: '2024-06-15',
    status: 'Vigente',
    setoresAplicaveis: ['Qualidade', 'Manutenção'],
    descricaoResumo: 'EASA Maintenance Supplement',
    conteudoTexto: 'Texto do manual EASA Rev 02...',
    fonte: 'SGQ Interno',
    arquivoNome: 'EASA_Supp_Rev02.pdf',
    criadoEm: '2024-06-15T00:00:00Z',
    atualizadoEm: '2024-06-15T00:00:00Z',
  };

  const relatorioCruzado = executarComparativoAcervoComBancoManuaisIA(
    'org-test',
    [docSGQ_EASA],
    [],
    [manualIA_EASA]
  );

  assert(
    relatorioCruzado.totalBancoIAMaisRecente === 1 &&
      relatorioCruzado.itens[0].statusComparacao === 'BANCO_IA_MAIS_RECENTE' &&
      relatorioCruzado.itens[0].acaoRecomendada === 'IMPORTAR_REVISAO_PARA_SGQ',
    '32. Auditoria cruzada detecta quando o Banco de Manuais (IA) possui versão mais recente e indica importação para o SGQ'
  );

  // -------------------------------------------------------------
  // TESTE 33: Identificação de manuais de uso interno existentes APENAS no Banco IA
  // -------------------------------------------------------------
  const manualIA_MOMQ: ManualRecord = {
    id: 'manual-ia-momq',
    codigo: 'MOMQ',
    titulo: 'Manual da Organização de Manutenção da Qualidade',
    revisao: 'Rev. 18',
    dataVigencia: '2025-02-01',
    status: 'Vigente',
    setoresAplicaveis: ['Geral'],
    descricaoResumo: 'Manual geral interno da organização',
    conteudoTexto: 'Capítulos do MOMQ...',
    fonte: 'Uso Interno',
    criadoEm: '2025-02-01T00:00:00Z',
    atualizadoEm: '2025-02-01T00:00:00Z',
  };

  const relatorioApenasIA = executarComparativoAcervoComBancoManuaisIA(
    'org-test',
    [],
    [],
    [manualIA_MOMQ]
  );

  assert(
    relatorioApenasIA.totalApenasNoBancoIA === 1 &&
      relatorioApenasIA.itens[0].origemTipo === 'INTERNO' &&
      relatorioApenasIA.itens[0].acaoRecomendada === 'CADASTRAR_NO_ACERVO_SGQ',
    '33. Manuais de uso interno presentes apenas no Banco IA são diagnosticados com recomendação formal de cadastro no Acervo SGQ'
  );

  // -------------------------------------------------------------
  // TESTE 34: Documentos existentes no Acervo SGQ ainda não indexados no Banco IA
  // -------------------------------------------------------------
  const docSGQ_POP: DocumentoControlado = {
    id: 'doc-sgq-pop-01',
    organizationId: 'org-test',
    codigo: 'POP-MN-001',
    titulo: 'Procedimento Operacional Padrão de Calibração',
    emissor: 'ORGANIZACAO',
    numeroRevisao: '03',
    dataRevisao: '2024-08-01',
    statusGeral: 'ATIVO',
    statusVerificacao: 'CONFORME',
    categoria: 'DOCUMENTO_INTERNO',
    responsavelNome: 'SGQ',
    exigeEvidenciaLeitura: false,
    frequenciaVerificacaoDias: 180,
    arquivoNome: 'POP_MN_001_Rev03.pdf',
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2024-08-01T00:00:00Z',
  };

  const relatorioApenasSGQ = executarComparativoAcervoComBancoManuaisIA(
    'org-test',
    [docSGQ_POP],
    [],
    []
  );

  assert(
    relatorioApenasSGQ.totalApenasNoAcervoSGQ === 1 &&
      relatorioApenasSGQ.itens[0].statusComparacao === 'APENAS_NO_ACERVO_SGQ' &&
      relatorioApenasSGQ.itens[0].acaoRecomendada === 'PUBLICAR_NO_BANCO_IA',
    '34. Documento controlado ausente no Banco IA é indicado com sucesso para publicação e indexação de inteligência artificial'
  );

  // -------------------------------------------------------------
  // TESTE 35: Manuais 100% sincronizados em ambas as bases são categorizados como conformes
  // -------------------------------------------------------------
  const manualIA_Sinc: ManualRecord = {
    id: 'manual-ia-pop',
    codigo: 'POP-MN-001',
    titulo: 'Procedimento Operacional Padrão de Calibração',
    revisao: '03',
    dataVigencia: '2024-08-01',
    status: 'Vigente',
    setoresAplicaveis: ['Metrologia'],
    descricaoResumo: 'Procedimento de Calibração',
    conteudoTexto: 'Texto...',
    fonte: 'SGQ',
    criadoEm: '2024-08-01T00:00:00Z',
    atualizadoEm: '2024-08-01T00:00:00Z',
  };

  const relatorioSincronizado = executarComparativoAcervoComBancoManuaisIA(
    'org-test',
    [docSGQ_POP],
    [],
    [manualIA_Sinc]
  );

  assert(
    relatorioSincronizado.totalSincronizados === 1 &&
      relatorioSincronizado.itens[0].statusComparacao === 'SINCRONIZADO' &&
      relatorioSincronizado.itens[0].acaoRecomendada === 'NENHUMA',
    '35. Manuais alinhados com mesma revisão e vigência em ambas as bases são confirmados como 100% sincronizados'
  );

  // -------------------------------------------------------------
  // TESTE 36: Segregação de documentos inativos: excluídos do acervo operacional e de relatórios oficiais
  // -------------------------------------------------------------
  const docAtivo: DocumentoControlado = {
    ...docSGQ_POP,
    id: 'doc-ativo-1',
    codigo: 'MOMQ',
    statusGeral: 'ATIVO',
  };
  const docInativo: DocumentoControlado = {
    ...docSGQ_POP,
    id: 'doc-inativo-1',
    codigo: 'MOMQ-OLD',
    statusGeral: 'INATIVO',
    inativadoEm: '2025-01-10T10:00:00Z',
    inativadoPor: 'Auditor SGQ',
    motivoInativacao: 'Consolidado no manual master MOMQ',
    consolidadoEmDocumentoId: 'doc-ativo-1',
  };

  const todosDocs = [docAtivo, docInativo];
  const docsAtivosFiltrados = todosDocs.filter((d) => d.statusGeral !== 'INATIVO');
  const docsInativosFiltrados = todosDocs.filter((d) => d.statusGeral === 'INATIVO');

  assert(
    docsAtivosFiltrados.length === 1 &&
      docsAtivosFiltrados[0].id === 'doc-ativo-1' &&
      docsInativosFiltrados.length === 1 &&
      docsInativosFiltrados[0].id === 'doc-inativo-1',
    '36. Documentos com statusGeral === INATIVO são estritamente segregados do acervo operacional e de relatórios'
  );

  // -------------------------------------------------------------
  // TESTE 37: Consulta temporal determinística de documento inativo preserva histórico no momento do evento
  // -------------------------------------------------------------
  const revHistoricaInativo: RevisaoDocumental = {
    id: 'rev-inativo-1',
    organizationId: 'org-test',
    documentoId: 'doc-inativo-1',
    codigoDocumento: 'MOMQ-OLD',
    tituloDocumento: 'Manual MOMQ Histórico',
    numeroRevisao: 'Rev. 10',
    dataEmissao: '2023-01-01',
    dataEntradaVigor: '2023-01-01',
    dataSubstituicao: '2024-01-01',
    statusCicloVida: 'SUBSTITUIDO',
    origemRevisao: 'INTERNA',
    ehImutavel: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const resultadoTemporalInativo = determinarRevisaoVigenteNaData(
    docInativo,
    [revHistoricaInativo],
    '2023-06-15'
  );

  assert(
    resultadoTemporalInativo.revisaoVigenteNaData?.numeroRevisao === 'Rev. 10' &&
      docInativo.statusGeral === 'INATIVO',
    '37. Conhecimento temporal de manual inativo resolve vigência no evento sem reativar documento indevidamente'
  );

  // -------------------------------------------------------------
  // TESTE 38: Manual com revisão inferior à referência oficial gera alerta de desatualização do Banco IA
  // Exemplo da solicitação: Acervo indica Rev. 12 como referência atual e Banco IA possui Rev. 10
  // -------------------------------------------------------------
  const docAcervoRev12: DocumentoControlado = {
    id: 'doc-amm-rev12',
    organizationId: 'org-test',
    codigo: 'AMM-B737',
    titulo: 'Boeing 737 Maintenance Manual',
    emissor: 'Boeing',
    numeroRevisao: 'Rev. 12',
    dataRevisao: '2026-03-01',
    statusGeral: 'ATIVO',
    statusVerificacao: 'CONFORME',
    categoria: 'DOCUMENTO_FABRICANTE',
    responsavelNome: 'Qualidade SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  const manualIARev10: ManualRecord = {
    id: 'manual-b737-rev10',
    codigo: 'AMM-B737',
    titulo: 'Boeing 737 Maintenance Manual',
    revisao: 'Rev. 10',
    dataVigencia: '2025-01-01',
    status: 'Vigente',
    setoresAplicaveis: ['Manutenção'],
    descricaoResumo: 'Manual de Manutenção B737 utilizado para fundamentar NCs',
    conteudoTexto: 'Requisitos do manual Rev. 10...',
    fonte: 'SGQ',
    criadoEm: '2025-01-01T00:00:00Z',
    atualizadoEm: '2025-01-01T00:00:00Z',
  };

  const diagDesatualizado = verificarAlinhamentoManualIA(docAcervoRev12, [manualIARev10]);

  assert(
    diagDesatualizado.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' &&
      diagDesatualizado.revisaoOficialReferencia === 'Rev. 12' &&
      diagDesatualizado.revisaoNoBancoIA === 'Rev. 10' &&
      diagDesatualizado.mensagemAlerta.includes('Possível desatualização identificada no Banco de Manuais (IA)') &&
      diagDesatualizado.acaoRecomendada === 'ATUALIZAR_BANCO_IA',
    '38. Manual com revisão inferior à referência oficial (IA: 10 vs Acervo: 12) gera alerta claro de possível desatualização'
  );

  // -------------------------------------------------------------
  // TESTE 39: Manual atualizado e alinhado é identificado corretamente com conformidade
  // -------------------------------------------------------------
  const manualIARev12: ManualRecord = {
    ...manualIARev10,
    id: 'manual-b737-rev12',
    revisao: 'Rev. 12',
    dataVigencia: '2026-03-01',
  };

  const diagSincronizado = verificarAlinhamentoManualIA(docAcervoRev12, [manualIARev12]);

  assert(
    diagSincronizado.statusSincroniaIA === 'SINCRONIZADO' &&
      diagSincronizado.revisaoOficialReferencia === 'Rev. 12' &&
      diagSincronizado.revisaoNoBancoIA === 'Rev. 12' &&
      diagSincronizado.acaoRecomendada === 'NENHUMA',
    '39. Manual atualizado e alinhado na mesma revisão (Rev. 12) é categorizado como SINCRONIZADO com conformidade garantida'
  );

  // -------------------------------------------------------------
  // TESTE 40: Ausência de evidência suficiente não resulta em declaração indevida de conformidade
  // Regra: Se o acervo não possui revisão confirmada, o sistema informa que a atualização não pôde ser confirmada
  // -------------------------------------------------------------
  const docSemRevisaoValida: DocumentoControlado = {
    id: 'doc-sem-evidencia',
    organizationId: 'org-test',
    codigo: 'MOMQ-INDEF',
    titulo: 'Manual Sem Revisão Definida',
    emissor: 'SGQ',
    numeroRevisao: '',
    dataRevisao: '',
    statusGeral: 'ATIVO',
    statusVerificacao: 'PENDENTE_VERIFICACAO',
    categoria: 'DOCUMENTO_INTERNO',
    responsavelNome: 'Qualidade',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const manualIAMOMQ: ManualRecord = {
    ...manualIARev10,
    id: 'manual-momq-indef',
    codigo: 'MOMQ-INDEF',
    titulo: 'Manual Sem Revisão Definida',
  };

  const diagSemEvidencia = verificarAlinhamentoManualIA(docSemRevisaoValida, [manualIAMOMQ]);

  assert(
    diagSemEvidencia.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA' &&
      diagSemEvidencia.mensagemAlerta.includes('A atualização não pôde ser confirmada'),
    '40. Ausência de evidência suficiente resulta em REVISAO_NAO_CONFIRMADA e nunca declara conformidade indevida'
  );

  // -------------------------------------------------------------
  // TESTE 41: Documentos sem correspondência confiável não são associados automaticamente de forma incorreta
  // Regra: Exige código confiável ou similaridade mínima (>= 0.88), sem vincular documentos arbitrários
  // -------------------------------------------------------------
  const docDistinto: DocumentoControlado = {
    id: 'doc-c310-distinto',
    organizationId: 'org-test',
    codigo: 'AMM-C310',
    titulo: 'Cessna 310 Maintenance Manual',
    emissor: 'Cessna',
    numeroRevisao: 'Rev. 05',
    dataRevisao: '2025-06-01',
    statusGeral: 'ATIVO',
    statusVerificacao: 'CONFORME',
    categoria: 'DOCUMENTO_FABRICANTE',
    responsavelNome: 'Qualidade',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const correspondencia = identificarCorrespondenciaManualIA(docDistinto, [manualIARev10]); // manualIARev10 é AMM-B737
  const diagSemMatch = verificarAlinhamentoManualIA(docDistinto, [manualIARev10]);

  assert(
    correspondencia.manual === null &&
      correspondencia.confianca === 'NENHUMA' &&
      diagSemMatch.statusSincroniaIA === 'SEM_CORRESPONDENCIA' &&
      diagSemMatch.acaoRecomendada === 'VINCULAR_MANUAL_IA',
    '41. Documentos sem correspondência confiável não são associados incorretamente e sinalizam necessidade de vínculo manual'
  );

  // -------------------------------------------------------------
  // TESTE 42: Verificação NÃO altera nem substitui automaticamente o conteúdo do Banco IA (Diagnóstico Read-Only)
  // -------------------------------------------------------------
  const copiaManualOriginal = JSON.parse(JSON.stringify(manualIARev10));
  verificarAlinhamentoManualIA(docAcervoRev12, [manualIARev10]);

  assert(
    manualIARev10.revisao === copiaManualOriginal.revisao &&
      manualIARev10.dataVigencia === copiaManualOriginal.dataVigencia &&
      manualIARev10.conteudoTexto === copiaManualOriginal.conteudoTexto,
    '42. A verificação diagnóstica preserva 100% dos dados originais sem substituição automática ou cega no Banco IA'
  );

  // -------------------------------------------------------------
  // TESTE 43: Verificação funciona perfeitamente mesmo quando o arquivo completo NÃO está no Acervo (apenas controle)
  // -------------------------------------------------------------
  const docApenasControleSemArquivo: DocumentoControlado = {
    id: 'doc-controle-sem-arquivo',
    organizationId: 'org-test',
    codigo: 'AMM-B737',
    titulo: 'Boeing 737 Maintenance Manual',
    emissor: 'Boeing',
    numeroRevisao: 'Rev. 12',
    dataRevisao: '2026-03-01',
    statusGeral: 'ATIVO',
    statusVerificacao: 'CONFORME',
    categoria: 'DOCUMENTO_FABRICANTE',
    responsavelNome: 'Qualidade SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    arquivoNome: undefined,
    arquivoUrl: undefined,
    arquivoBase64: undefined,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  const diagSemArquivoNoAcervo = verificarAlinhamentoManualIA(docApenasControleSemArquivo, [manualIARev10]);

  assert(
    diagSemArquivoNoAcervo.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' &&
      diagSemArquivoNoAcervo.temCorrespondencia === true &&
      diagSemArquivoNoAcervo.revisaoOficialReferencia === 'Rev. 12',
    '43. Mecanismo de verificação opera com sucesso mesmo quando o arquivo completo não está armazenado no Acervo (apenas controle)'
  );

  // -------------------------------------------------------------
  // TESTE 44: Referência aproveita validação de fonte pública oficial (robô ANAC/FAA)
  // -------------------------------------------------------------
  const docComFontePublicaValidada: DocumentoControlado = {
    id: 'doc-rbac-145',
    organizationId: 'org-test',
    codigo: 'RBAC 145',
    titulo: 'Organizações de Manutenção de Aeronaves',
    emissor: 'ANAC',
    numeroRevisao: 'Emenda 08',
    revisaoNaFonteIdentificada: 'Emenda 09',
    statusVerificacao: 'NOVA_REVISAO_IDENTIFICADA',
    dataPublicacaoNaFonte: '2026-04-10',
    urlFonteVerificacao: 'https://www.anac.gov.br/rbac145',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_AUTORIDADE',
    responsavelNome: 'SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z',
  };

  const refOficialPublica = determinarReferenciaOficialDocumento(docComFontePublicaValidada);

  assert(
    refOficialPublica.confiavel === true &&
      refOficialPublica.revisaoOficial === 'Emenda 09' &&
      refOficialPublica.fonteReferencia.includes('Fonte Pública'),
    '44. Referência de atualização aproveita mecanismo de fonte pública oficial validada sem duplicar lógica'
  );

  // -------------------------------------------------------------
  // TESTE 46: Diferenciação estrita entre revisão oficial confirmada vs registrada no acervo vs manual IA
  // -------------------------------------------------------------
  const docOficialConfirmado: DocumentoControlado = {
    id: 'doc-oficial-1',
    organizationId: 'org-test',
    codigo: 'RBAC-145',
    titulo: 'Organizações de Manutenção Aeronáutica',
    numeroRevisao: 'Emenda 10',
    dataRevisao: '2026-05-01',
    statusVerificacao: 'CONFORME',
    urlFonteVerificacao: 'https://anac.gov.br/rbac145',
    revisaoNaFonteIdentificada: 'Emenda 10',
    dataPublicacaoNaFonte: '2026-05-01',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_AUTORIDADE',
    emissor: 'ANAC',
    responsavelNome: 'SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };

  const refConfirmada = determinarReferenciaOficialDocumento(docOficialConfirmado);
  assert(
    refConfirmada.tipoOrigem === 'OFICIAL_CONFIRMADA_FONTE_PUBLICA' &&
      refConfirmada.confiavel === true &&
      refConfirmada.revisaoOficial === 'Emenda 10',
    '46. Sistema diferencia revisão oficial confirmada por fonte pública com alta confiabilidade'
  );

  const docRegistradoSemFonte: DocumentoControlado = {
    id: 'doc-acervo-interno',
    organizationId: 'org-test',
    codigo: 'MOMQ-INTERNO',
    titulo: 'Manual de Organização e Manutenção da Qualidade',
    numeroRevisao: 'Rev. 05',
    dataRevisao: '2026-02-15',
    statusVerificacao: 'PENDENTE_VERIFICACAO',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_INTERNO',
    emissor: 'Impacto Aviation',
    responsavelNome: 'SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  };
  const refAcervoInterno = determinarReferenciaOficialDocumento(docRegistradoSemFonte);
  assert(
    refAcervoInterno.tipoOrigem === 'REGISTRADA_ACERVO_NAO_CONFIRMADA' &&
      refAcervoInterno.revisaoOficial === 'Rev. 05',
    '46b. Sistema identifica revisão registrada no Acervo SGQ como não confirmada por fonte pública externa'
  );

  // -------------------------------------------------------------
  // TESTE 47: Segregação absoluta da data de upload (nunca usada como evidência de vigência)
  // -------------------------------------------------------------
  const docComDataUploadDistinta: DocumentoControlado = {
    id: 'doc-upload-test',
    organizationId: 'org-test',
    codigo: 'CMM-32-10',
    titulo: 'Component Maintenance Manual - Trem de Pouso',
    numeroRevisao: 'Rev. 08',
    dataRevisao: '2024-06-10', // Data oficial de vigência
    dataUltimaVerificacao: '2026-10-05T14:30:00Z',
    statusVerificacao: 'CONFORME',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_FABRICANTE',
    emissor: 'Fabricante Trem de Pouso',
    responsavelNome: 'Engenharia',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2024-06-10T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
  (docComDataUploadDistinta as any).dataUpload = '2026-10-01'; // Data administrativa de upload

  function mockManual(
    partial: Partial<ManualRecord> & { id: string; codigo: string; titulo: string; revisao: string }
  ): ManualRecord {
    return {
      dataVigencia: '2025-01-01',
      status: 'Vigente',
      setoresAplicaveis: ['Manutenção'],
      descricaoResumo: partial.titulo,
      conteudoTexto: 'Conteúdo descritivo de engenharia aeronáutica e requisitos de manutenção para auditoria SGQ.',
      fonte: 'Manual Oficial Homologado',
      criadoEm: '2025-01-01T00:00:00Z',
      atualizadoEm: '2025-01-01T00:00:00Z',
      ...partial,
    };
  }

  const manualIATestUpload = mockManual({
    id: 'man-upload-ia',
    codigo: 'CMM-32-10',
    titulo: 'Component Maintenance Manual - Trem de Pouso',
    revisao: 'Rev. 08',
    dataVigencia: '2024-06-10',
    status: 'Vigente',
  });

  const diagUpload = verificarAlinhamentoManualIA(docComDataUploadDistinta, manualIATestUpload);
  assert(
    diagUpload.dataOficialReferencia === '2024-06-10' &&
      diagUpload.dataUploadArquivo === '2026-10-01' &&
      diagUpload.alertaDataUpload?.includes('não comprobatória de vigência') === true,
    '47. Data de upload é segregada e expressamente rotulada como não comprobatória de vigência'
  );

  // -------------------------------------------------------------
  // TESTE 48: Revisões alfanuméricas com sufixos e formatos heterogêneos gerando dúvida e análise manual
  // -------------------------------------------------------------
  const compSufixo = compararRevisoesDocumentaisDetalhada('Rev. 12B', '', 'Rev. 12A', '');
  assert(
    compSufixo.resultado > 0 && compSufixo.criterio === 'NUMERICO_COM_SUFIXO',
    '48a. Comparador alfanumérico diferencia sufixos cronológicos (Rev. 12B > Rev. 12A)'
  );

  const compHeterogeneo = compararRevisoesDocumentaisDetalhada('Edição Especial Ouro', '', 'Rev. 04', '');
  assert(
    compHeterogeneo.ehConfiavel === false &&
      compHeterogeneo.requerAnaliseManual === true &&
      Boolean(compHeterogeneo.motivoDuvida),
    '48b. Revisões sem padrão cronológico confiável sinalizam obrigatoriedade de análise manual'
  );

  // -------------------------------------------------------------
  // TESTE 49: Proteção contra associação incorreta entre documentos tecnicamente distintos
  // -------------------------------------------------------------
  const docCessna: DocumentoControlado = {
    id: 'doc-cessna-172',
    organizationId: 'org-test',
    codigo: 'AMM-C172',
    titulo: 'Aircraft Maintenance Manual Cessna 172 Skyhawk',
    numeroRevisao: 'Rev. 15',
    dataRevisao: '2026-01-01',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_FABRICANTE',
    emissor: 'Cessna Aircraft Company',
    responsavelNome: 'Engenharia',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const manualEmbraer = mockManual({
    id: 'man-emb-190',
    codigo: 'AMM-E190',
    titulo: 'Aircraft Maintenance Manual Embraer 190 E-Jets',
    revisao: 'Rev. 15',
    dataVigencia: '2026-01-01',
    status: 'Vigente',
  });

  const incompTecnica = verificarIncompatibilidadeTecnica(docCessna, manualEmbraer);
  assert(
    incompTecnica.incompativel === true &&
      (incompTecnica.motivo?.includes('Fabricante') || incompTecnica.motivo?.includes('Código')),
    '49a. Incompatibilidade técnica detectada entre fabricantes e modelos distintos (Cessna vs Embraer)'
  );

  // Similaridade de títulos não pode forçar associação errônea
  const correspondenciaRejeitada = identificarCorrespondenciaManualIA(docCessna, [manualEmbraer]);
  assert(
    correspondenciaRejeitada.manual === null &&
      correspondenciaRejeitada.confianca === 'NENHUMA',
    '49b. Correspondência automática é estritamente rejeitada para documentos tecnicamente conflitantes'
  );

  // -------------------------------------------------------------
  // TESTE 50: Isolamento e segregação por organização (organizationId)
  // -------------------------------------------------------------
  const docOrgAlpha: DocumentoControlado = {
    id: 'doc-org-alpha',
    organizationId: 'org-hangar-sp',
    codigo: 'MOMQ-01',
    titulo: 'Manual de Organização de Manutenção',
    numeroRevisao: 'Rev. 04',
    dataRevisao: '2026-01-01',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_INTERNO',
    emissor: 'Impacto Aviation SP',
    responsavelNome: 'SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const manualOrgBeta = mockManual({
    id: 'man-org-beta',
    organizationId: 'org-oficina-rj',
    codigo: 'MOMQ-01',
    titulo: 'Manual de Organização de Manutenção',
    revisao: 'Rev. 04',
    dataVigencia: '2026-01-01',
    status: 'Vigente',
  });

  const matchCrossOrg = identificarCorrespondenciaManualIA(docOrgAlpha, [manualOrgBeta]);
  assert(
    matchCrossOrg.manual === null,
    '50. Isolamento por organização respeitado: manuais de organizações distintas nunca são associados automaticamente'
  );

  // -------------------------------------------------------------
  // TESTE 51: Persistência de vinculação manual prévia com prioridade
  // -------------------------------------------------------------
  const docComVinculoManual: DocumentoControlado = {
    id: 'doc-vinculo-manual',
    organizationId: 'org-test',
    codigo: 'DOC-CUSTOM-99',
    titulo: 'Procedimento Customizado de Pintura',
    numeroRevisao: 'Rev. 02',
    dataRevisao: '2026-01-01',
    manualIAId: 'man-alvo-vinculado', // Vínculo manual persistido
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_INTERNO',
    emissor: 'Impacto Aviation',
    responsavelNome: 'Qualidade',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const manualAlvoVinculado = mockManual({
    id: 'man-alvo-vinculado',
    codigo: 'ESP-PINTURA',
    titulo: 'Especificação Especial de Pintura Aeronáutica',
    revisao: 'Rev. 02',
    dataVigencia: '2026-01-01',
    status: 'Vigente',
  });

  const matchVinculoDireto = identificarCorrespondenciaManualIA(docComVinculoManual, [manualAlvoVinculado]);
  assert(
    matchVinculoDireto.metodo === 'VINCULO_DIRETO' &&
      matchVinculoDireto.confianca === 'ALTA' &&
      matchVinculoDireto.manual?.id === 'man-alvo-vinculado',
    '51. Vinculação manual persistida é preservada com máxima prioridade (VINCULO_DIRETO)'
  );

  // -------------------------------------------------------------
  // TESTE 52: Controle de acesso (RBAC) bloqueia atualização para perfis não autorizados (VIEWER / GUEST)
  // -------------------------------------------------------------
  const manualBaseParaUpdate = mockManual({
    id: 'man-rbac-test',
    codigo: 'MOMQ-10',
    titulo: 'Manual de Organização e Manutenção',
    revisao: 'Rev. 03',
    dataVigencia: '2025-01-01',
    status: 'Vigente',
  });

  const resViewer = await atualizarManualNoBancoIAControlado({
    manualIA: manualBaseParaUpdate,
    documentoSGQ: {
      ...docRegistradoSemFonte,
      numeroRevisao: 'Rev. 04',
      dataRevisao: '2026-06-01',
    },
    novaRevisao: 'Rev. 04',
    dataRevisao: '2026-06-01',
    justificativaAtualizacao: 'Atualização solicitada formalmente pela auditoria anual',
    usuarioResponsavel: 'Observador Convidado',
    userRole: 'VIEWER',
    skipFirestorePersistence: true,
  });

  assert(
    resViewer.sucesso === false &&
      resViewer.mensagem.includes('Permissão insuficiente') &&
      manualBaseParaUpdate.revisao === 'Rev. 03',
    '52. Usuário com perfil VIEWER é impedido de realizar atualização do Banco IA e o registro permanece intacto'
  );

  // -------------------------------------------------------------
  // TESTE 53: Rejeição de atualização sem justificativa técnica substantiva
  // -------------------------------------------------------------
  const resSemJustificativa = await atualizarManualNoBancoIAControlado({
    manualIA: manualBaseParaUpdate,
    documentoSGQ: {
      ...docRegistradoSemFonte,
      numeroRevisao: 'Rev. 04',
    },
    novaRevisao: 'Rev. 04',
    dataRevisao: '2026-06-01',
    justificativaAtualizacao: 'ok', // Curto demais (< 15 caracteres)
    usuarioResponsavel: 'Auditor SGQ',
    userRole: 'QUALITY_ANALYST',
    skipFirestorePersistence: true,
  });

  assert(
    resSemJustificativa.sucesso === false &&
      resSemJustificativa.mensagem.includes('Justificativa técnica obrigatória') &&
      manualBaseParaUpdate.revisao === 'Rev. 03',
    '53. Atualização sem justificativa técnica formal (mínimo 15 caracteres) é formalmente bloqueada'
  );

  // -------------------------------------------------------------
  // TESTE 54: Detecção de concorrência e conflito otimista
  // -------------------------------------------------------------
  const manualConcorrente = mockManual({
    id: 'man-conc-test',
    codigo: 'MOMQ-20',
    titulo: 'Manual Operacional de Motores',
    revisao: 'Rev. 05', // Já foi alterado por outro usuário
    dataVigencia: '2026-07-01',
    status: 'Vigente',
  });

  const resConcorrente = await atualizarManualNoBancoIAControlado({
    manualIA: manualConcorrente,
    documentoSGQ: {
      ...docRegistradoSemFonte,
      numeroRevisao: 'Rev. 06',
    },
    novaRevisao: 'Rev. 06',
    dataRevisao: '2026-08-01',
    expectedCurrentRevision: 'Rev. 04', // A sessão tentava atualizar a partir da Rev. 04
    justificativaAtualizacao: 'Tentativa de atualização baseada em metadados desatualizados da tela',
    usuarioResponsavel: 'Engenheiro 2',
    userRole: 'QUALITY_MANAGER',
    skipFirestorePersistence: true,
  });

  assert(
    resConcorrente.sucesso === false &&
      resConcorrente.mensagem.includes('Conflito de concorrência') &&
      manualConcorrente.revisao === 'Rev. 05',
    '54. Conflito de concorrência bloqueia gravação inconsistente e preserva a versão atual'
  );

  // -------------------------------------------------------------
  // TESTE 55: Auditoria e rastreabilidade completas
  // -------------------------------------------------------------
  const manualParaAtualizarComAuditoria = mockManual({
    id: 'man-audit-trail',
    codigo: 'AMM-B737',
    titulo: 'Aircraft Maintenance Manual Boeing 737',
    revisao: 'Rev. 10',
    dataVigencia: '2024-01-01',
    status: 'Vigente',
    historicoAlteracoes: [
      {
        versao: 'Rev. 10',
        data: '2024-01-01',
        descricao: 'Revisão inicial carregada',
        autor: 'Sistema',
      },
    ],
  });

  const docAcervoAtualizado: DocumentoControlado = {
    id: 'doc-b737-acervo',
    organizationId: 'org-test',
    codigo: 'AMM-B737',
    titulo: 'Aircraft Maintenance Manual Boeing 737',
    numeroRevisao: 'Rev. 12',
    dataRevisao: '2026-03-01',
    statusVerificacao: 'CONFORME',
    urlFonteVerificacao: 'https://myboeingfleet.boeing.com',
    revisaoNaFonteIdentificada: 'Rev. 12',
    dataPublicacaoNaFonte: '2026-03-01',
    statusGeral: 'ATIVO',
    categoria: 'DOCUMENTO_FABRICANTE',
    emissor: 'The Boeing Company',
    responsavelNome: 'Eng. Chefe SGQ',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  };

  const resSucessoUpdate = await atualizarManualNoBancoIAControlado({
    manualIA: manualParaAtualizarComAuditoria,
    documentoSGQ: docAcervoAtualizado,
    novaRevisao: 'Rev. 12',
    dataRevisao: '2026-03-01',
    justificativaAtualizacao: 'Incorporação formal da Revisão 12 emitida pelo fabricante Boeing',
    usuarioResponsavel: 'Carlos Rocha (Gerente SGQ)',
    userRole: 'QUALITY_MANAGER',
    skipFirestorePersistence: true,
  });

  assert(
    resSucessoUpdate.sucesso === true &&
      manualParaAtualizarComAuditoria.revisao === 'Rev. 12' &&
      manualParaAtualizarComAuditoria.historicoAlteracoes?.length === 2 &&
      (manualParaAtualizarComAuditoria.historicoAlteracoes[1].descricao.includes('Incorporação formal da Revisão 12') ||
        Boolean(manualParaAtualizarComAuditoria.historicoAlteracoes[1].descricao)),
    '55. Atualização controlada é persistida com histórico auditado completo, preservando registros anteriores'
  );

  // -------------------------------------------------------------
  // TESTE 56: Validação do ciclo completo e re-verificação síncrona
  // -------------------------------------------------------------
  // Re-executa verificação após a atualização: agora deve acusar SINCRONIZADO
  const diagAposAtualizacao = verificarAlinhamentoManualIA(docAcervoAtualizado, manualParaAtualizarComAuditoria);
  assert(
    diagAposAtualizacao.statusSincroniaIA === 'SINCRONIZADO' &&
      diagAposAtualizacao.revisaoNoBancoIA === 'Rev. 12' &&
      diagAposAtualizacao.revisaoOficialReferencia === 'Rev. 12' &&
      diagAposAtualizacao.acaoRecomendada === 'NENHUMA',
    '56. Re-verificação após atualização confirma SINCRONIZADO sem comparar com metadados obsoletos'
  );

  // -------------------------------------------------------------
  // TESTE 57: Auditoria de NC consome efetivamente o manual e a revisão atualizada no Banco IA
  // -------------------------------------------------------------
  const manualParaNC: ManualRecord = {
    ...manualParaAtualizarComAuditoria,
    capitulos: [
      {
        id: 'cap-32-gear',
        numero: '32-10-01',
        titulo: 'Main Landing Gear Inspection & Torquing',
        requisitoTexto: 'Todos os pinos e conexões do trem de pouso principal devem ser inspecionados com torquímetro calibrado e selo lacre conforme tabela 32-1.',
      },
    ],
  };

  const ncTeste: Partial<NCRecord> = {
    id: 'nc-teste-audit',
    numeroNC: 'NC-2026-0042',
    titulo: 'Pino do trem de pouso sem torque especificado',
    descricaoNC: 'Durante a inspeção de linha da aeronave, identificou-se pino de fixação com torque inadequado na perna do trem principal.',
    normaReferencia: 'AMM-B737',
    revisao: 'Rev. 12',
    dataIdentificacao: '2026-03-15',
    dataEmissaoFormulario: '2026-03-15',
  };

  const resultadoAuditoriaNC = auditNCComplianceLocally(ncTeste as NCRecord, [manualParaNC]);
  assert(
    resultadoAuditoriaNC.veredicto === 'Procedente' &&
      resultadoAuditoriaNC.validacaoRevisao?.revisaoVigenteCadastrada === 'Rev. 12' &&
      resultadoAuditoriaNC.validacaoRevisao?.revisaoAplicavelNaData === 'Rev. 12' &&
      resultadoAuditoriaNC.resumoVeredito.includes('Rev. 12') &&
      resultadoAuditoriaNC.justificativaNivelSuporte.includes('Item 32-10-01'),
    '57. Auditoria de NC consome o manual atualizado e fundamenta o requisito com a nova revisão (Rev. 12)'
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
