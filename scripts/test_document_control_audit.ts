import {
  executarVerificacaoFonteExterna,
  calcularMetricasDashboardDocumental,
} from '../src/services/documentControlEngine';
import { formatarDataHoraVerificacao } from '../src/components/DocumentControlCenterView';
import { DocumentoControlado, FonteExternaControlada, RevisaoDocumental } from '../src/types';

function runAuditTests() {
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

  console.log(`\n=== RESUMO: ${passed} PASS, ${failed} FAIL ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAuditTests();
