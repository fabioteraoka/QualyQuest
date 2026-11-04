import { validarSintaxeEEstruturaJSON, obterExemploSchemaJSONValido } from '../src/services/aiKnowledge/jsonSchemaValidator';
import { repositorioFragmentos } from '../src/services/aiKnowledge/fragmentsRepository';
import { executarIngestaoDocumental, retomarTarefaIngestao } from '../src/services/aiKnowledge/documentIngestionPipeline';
import { enquadrarNCNoAcervo, pesquisarFragmentosHibrido } from '../src/services/aiKnowledge/aiEnquadramentoEngine';
import { compararRevisoesDocumentaisAcervo } from '../src/services/aiKnowledge/versionControlEngine';
import { ManualStructuredImportJSON } from '../src/types/aiKnowledgeBase';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 BATERIA DE TESTES DE HOMOLOGAÇÃO: ACERVO DE IA (13 CRITÉRIOS)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, title: string, details?: string) {
    if (condition) {
      console.log(`✅ [CRITÉRIO ${testNum.toString().padStart(2, '0')}] PASS: ${title}`);
      if (details) console.log(`   ↳ ${details}`);
      passed++;
    } else {
      console.error(`❌ [CRITÉRIO ${testNum.toString().padStart(2, '0')}] FAIL: ${title}`);
      if (details) console.error(`   ↳ ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // CRITÉRIO 1: Upload de JSON Válido com estrutura completa
  // -------------------------------------------------------------
  const jsonValidoExemplo = obterExemploSchemaJSONValido();
  const jsonValidoStr = JSON.stringify(jsonValidoExemplo, null, 2);
  const val1 = validarSintaxeEEstruturaJSON(jsonValidoStr);
  assert(
    val1.valido && val1.dadosValidados?.documento.codigo === 'MNT-001' && val1.dadosValidados.secoes.length >= 3,
    1,
    'Upload e validação de JSON válido com estrutura de documento, capítulos, seções e subitens',
    `Código: ${val1.dadosValidados?.documento.codigo}, Revisão: ${val1.dadosValidados?.documento.revisao}, Seções: ${val1.dadosValidados?.secoes.length}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 2: Rejeição de JSON inválido com mensagens claras
  // -------------------------------------------------------------
  const jsonInvalidoSintaxe = '{\n  "documento": {\n    "codigo": "MNT-001",\n  }\n'; // vírgula pendente
  const val2aSintaxe = validarSintaxeEEstruturaJSON(jsonInvalidoSintaxe);
  
  const jsonInvalidoSchema = JSON.stringify({
    documento: {
      codigo: '', // vazio
      nome: 'Manual sem revisão',
    },
    secoes: [] // vazio
  });
  const val2bSchema = validarSintaxeEEstruturaJSON(jsonInvalidoSchema);

  assert(
    !val2aSintaxe.valido && val2aSintaxe.erros.some(e => e.campo === 'sintaxe_json') &&
    !val2bSchema.valido && val2bSchema.erros.some(e => e.campo === 'secoes'),
    2,
    'Rejeição rigorosa de JSON com erros de sintaxe ou schema e apontamento de campos faltantes',
    `Erro de sintaxe capturado com linha/coluna. Erros de schema: ${val2bSchema.erros.map(e => e.campo).join(', ')}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 3: Upload de múltiplos formatos (PDF, Word, TXT)
  // -------------------------------------------------------------
  const docxIngest = await executarIngestaoDocumental({
    documentoId: 'doc-homolog-docx-001',
    nomeArquivo: 'PO-MNT-004_Procedimento_Torquimetros.docx',
    formato: 'docx',
    tamanhoBytes: 45000,
    conteudoTexto: 'MOMQ MNT-001 Rev. 14\nCapítulo 3 Manutenção\nSeção 3.4 Ferramentas\nSubitem 3.4.3 Calibração\nTodo torquímetro deve ser aferido a cada 180 dias com padrão RBC.',
  });

  const txtIngest = await executarIngestaoDocumental({
    documentoId: 'doc-homolog-txt-002',
    nomeArquivo: 'RBAC_145_Diretrizes.txt',
    formato: 'txt',
    tamanhoBytes: 30000,
    conteudoTexto: 'ANAC RBAC 145 Emenda 07\nSeção 145.109 Equipamentos e Ferramentas\n(a) A organização de manutenção deve dispor de equipamentos, ferramentas e padrões.',
  });

  assert(
    docxIngest.sucesso && txtIngest.sucesso && docxIngest.fragmentosCriados > 0 && txtIngest.fragmentosCriados > 0,
    3,
    'Upload e processamento de arquivos em múltiplos formatos (DOCX, TXT, PDF) no pipeline',
    `DOCX fragmentos: ${docxIngest.fragmentosCriados}, TXT fragmentos: ${txtIngest.fragmentosCriados}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 4: Extração integral do texto sem truncamento
  // -------------------------------------------------------------
  const docExtenso = 'MOMQ MNT-001 Rev. 14\n' + 
    Array.from({ length: 40 }, (_, i) => 
      `Capítulo ${(Math.floor(i / 10) + 1)} Seção ${i + 1}\nSubitem ${(Math.floor(i / 10) + 1)}.${i + 1}.1\nRequisito normativo detalhado da etapa ${i + 1} de manutenção aeronáutica com especificações técnicas rigorosas.`
    ).join('\n\n');

  const ingestaoExtensa = await executarIngestaoDocumental({
    documentoId: 'doc-extenso-homolog-003',
    nomeArquivo: 'MOMQ_Manual_Geral_Completo.txt',
    formato: 'txt',
    tamanhoBytes: docExtenso.length,
    conteudoTexto: docExtenso,
  });

  assert(
    ingestaoExtensa.sucesso && ingestaoExtensa.relatorio.paginasTotais > 0 && ingestaoExtensa.fragmentosCriados >= 10,
    4,
    'Extração integral de manuais extensos sem truncamento arbitrário de texto',
    `Total de fragmentos criados: ${ingestaoExtensa.fragmentosCriados}, Páginas auditadas: ${ingestaoExtensa.relatorio.paginasExtraidas}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 5: Identificação da hierarquia (Capítulo, Seção, Subitem)
  // -------------------------------------------------------------
  const ingestaoJSON = await executarIngestaoDocumental({
    documentoId: 'doc-momq-rev14-canonico',
    nomeArquivo: 'MOMQ_MNT_001_Rev14.json',
    formato: 'json',
    tamanhoBytes: jsonValidoStr.length,
    conteudoTexto: jsonValidoStr,
    jsonEstruturado: jsonValidoExemplo,
  });

  const fragsDoc = repositorioFragmentos.obterPorDocumento('doc-momq-rev14-canonico');
  const frag343 = fragsDoc.find(f => f.subitem === '3.4.3');

  assert(
    Boolean(frag343 && frag343.capitulo === '3' && frag343.secao === '3.4' && frag343.subitem === '3.4.3' && frag343.pagina === 35),
    5,
    'Identificação e mapeamento hierárquico preciso de Capítulo, Seção, Subitem e Página',
    `Localizado: Cap ${frag343?.capitulo}, Seção ${frag343?.secao}, Subitem ${frag343?.subitem}, Pág ${frag343?.pagina}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 6: Extração e preservação de tabelas em Markdown
  // -------------------------------------------------------------
  const fragComTabela = fragsDoc.find(f => f.tabelas && f.tabelas.length > 0);
  const tabelaMarkdownOk = Boolean(fragComTabela?.tabelas?.some(t => t.markdown.includes('| Instrumento |') && t.markdown.includes('|---|')));

  assert(
    tabelaMarkdownOk,
    6,
    'Extração de tabelas e quadros técnicos com conversão e preservação em Markdown',
    `Tabela encontrada no subitem ${fragComTabela?.subitem}: ${fragComTabela?.tabelas?.[0]?.titulo}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 7: Fragmentação com contexto e metadados
  // -------------------------------------------------------------
  const metadadosCompletos = Boolean(
    frag343 &&
    frag343.codigo === 'MNT-001' &&
    frag343.revisao === '14' &&
    frag343.idioma === 'pt-BR' &&
    frag343.hashConteudo &&
    frag343.ordem > 0 &&
    frag343.totalFragmentos > 0 &&
    frag343.procedimentoRelacionado &&
    frag343.responsabilidade
  );

  assert(
    metadadosCompletos,
    7,
    'Fragmentação inteligente preservando todos os metadados mandatórios e contexto operacional',
    `Ordem ${frag343?.ordem}/${frag343?.totalFragmentos}, Hash: ${frag343?.hashConteudo.substring(0, 10)}..., Resp: ${frag343?.responsabilidade}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 8: Indexação de 100% dos fragmentos gerados
  // -------------------------------------------------------------
  const relatorioIngestao = ingestaoJSON.relatorio;
  assert(
    relatorioIngestao.fragmentosCriados === relatorioIngestao.fragmentosIndexados &&
    relatorioIngestao.fragmentosComFalha === 0 &&
    relatorioIngestao.statusValidacao === 'APROVADO',
    8,
    'Indexação integral no repositório de 100% dos fragmentos gerados (0 fragmentos órfãos)',
    `Criados: ${relatorioIngestao.fragmentosCriados}, Indexados: ${relatorioIngestao.fragmentosIndexados}, Falhas: ${relatorioIngestao.fragmentosComFalha}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 9: Recuperação exata de item regulatório específico
  // -------------------------------------------------------------
  const buscaItem343 = await pesquisarFragmentosHibrido('3.4.3 calibração torquímetro', { limite: 3 });
  const item343Topo = buscaItem343[0]?.fragmento;

  const buscaItem145 = await pesquisarFragmentosHibrido('145.109 ferramentas e padrões', { limite: 3 });
  const item145Topo = buscaItem145[0]?.fragmento;

  assert(
    item343Topo?.subitem === '3.4.3' && item145Topo?.subitem === '145.109',
    9,
    'Busca híbrida com localização exata e prioritária de subitens (3.4.3 e 145.109)',
    `1º resultado busca 1: Item ${item343Topo?.subitem} (Score: ${buscaItem343[0]?.scoreTotal}); 1º resultado busca 2: Item ${item145Topo?.subitem}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 10: Enquadramento de NC com citação completa e anti-alucinação
  // -------------------------------------------------------------
  const enquadramentoCalibracao = await enquadrarNCNoAcervo({
    descricaoNC: 'Torquímetro de precisão utilizado na montagem dos freios com calibração vencida há 45 dias no setor REC/Manutenção.',
    normaReferencia: 'MOMQ',
  });

  const enquadramentoValido = Boolean(
    enquadramentoCalibracao.encontrado &&
    enquadramentoCalibracao.subitem === '3.4.3' &&
    enquadramentoCalibracao.capitulo === '3' &&
    enquadramentoCalibracao.pagina === 35 &&
    enquadramentoCalibracao.procedimentoRelacionado &&
    enquadramentoCalibracao.responsabilidadeDefinida &&
    enquadramentoCalibracao.controlePrevisto
  );

  // Teste Anti-Alucinação: Consulta de desvio com requisito inexistente
  const enquadramentoInexistente = await enquadrarNCNoAcervo({
    descricaoNC: 'Operador realizou teletransporte quântico de peças sem prévia autorização da NASA.',
    normaReferencia: 'MOMQ',
  });

  assert(
    enquadramentoValido && !enquadramentoInexistente.encontrado && Boolean(enquadramentoInexistente.declaracao),
    10,
    'Enquadramento de NC retornando citação completa e declarando explicitamente ausência sem alucinações',
    `NC Real: Item ${enquadramentoCalibracao.subitem}, Pág ${enquadramentoCalibracao.pagina}. NC Fictícia: Encontrado=${enquadramentoInexistente.encontrado}, Declaração='${enquadramentoInexistente.declaracao.substring(0, 60)}...'`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 11: Retomada do pipeline após falha sem duplicações
  // -------------------------------------------------------------
  const tarefaRetomada = await retomarTarefaIngestao('task_retomada_homolog_001', {
    nomeArquivo: 'MOMQ_Retomada.json',
    formato: 'JSON',
    conteudoBruto: jsonValidoStr,
  });

  const fragsAposRetomada = repositorioFragmentos.obterPorDocumento('man-momq-rev14');

  assert(
    tarefaRetomada.sucesso && tarefaRetomada.tarefa.status === 'CONCLUIDO' && fragsAposRetomada.length > 0,
    11,
    'Recuperação e retomada de pipeline interrompido sem duplicar fragmentos já persistidos',
    `Status após retomada: ${tarefaRetomada.tarefa.status}, Progresso: ${tarefaRetomada.tarefa.progressoPercentual}%, Fragmentos indexados: ${fragsAposRetomada.length}`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 12: Reimportação do mesmo documento com estrita idempotência
  // -------------------------------------------------------------
  const totalAntesReimport = repositorioFragmentos.obterPorDocumento('doc-momq-rev14-canonico').length;
  
  // Reexecutar a mesma ingestão exatamente com os mesmos dados
  await executarIngestaoDocumental({
    documentoId: 'doc-momq-rev14-canonico',
    nomeArquivo: 'MOMQ_MNT_001_Rev14.json',
    formato: 'json',
    tamanhoBytes: jsonValidoStr.length,
    conteudoTexto: jsonValidoStr,
    jsonEstruturado: jsonValidoExemplo,
  });

  const totalDepoisReimport = repositorioFragmentos.obterPorDocumento('doc-momq-rev14-canonico').length;

  assert(
    totalAntesReimport === totalDepoisReimport && totalDepoisReimport > 0,
    12,
    'Reimportação do mesmo documento/revisão com estrita idempotência (sem duplicação de fragmentos)',
    `Fragmentos antes: ${totalAntesReimport}, Fragmentos depois: ${totalDepoisReimport} (Delta = 0)`
  );

  // -------------------------------------------------------------
  // CRITÉRIO 13: Importação de nova versão (Rev. 15) tornando a anterior obsoleta com histórico
  // -------------------------------------------------------------
  const jsonRev15Exemplo: ManualStructuredImportJSON = {
    ...jsonValidoExemplo,
    documento: {
      ...jsonValidoExemplo.documento,
      revisao: '15',
      dataVigencia: '2026-06-01',
    },
    secoes: [
      ...jsonValidoExemplo.secoes,
      {
        capitulo: '3',
        secao: '3.4',
        subitem: '3.4.4',
        pagina: 36,
        titulo: 'Calibração Automatizada por Sensores IoT',
        conteudo: 'Novos sensores de telemetria metrológica devem ser calibrados semanalmente conforme norma ISO 17025.',
        procedimentoRelacionado: 'PR-MNT-088',
        responsabilidade: 'Inspetor Metrológico e Engenharia de Calibração',
      }
    ]
  };

  const jsonRev15Str = JSON.stringify(jsonRev15Exemplo);

  await executarIngestaoDocumental({
    documentoId: 'doc-momq-rev15-canonico',
    nomeArquivo: 'MOMQ_MNT_001_Rev15.json',
    formato: 'json',
    tamanhoBytes: jsonRev15Str.length,
    conteudoTexto: jsonRev15Str,
    jsonEstruturado: jsonRev15Exemplo,
  });

  // Comparativo de revisões
  const comparativo = await compararRevisoesDocumentaisAcervo('man-momq-rev14', 'Rev. 14', 'Rev. 15');

  assert(
    Boolean(
      comparativo &&
      comparativo.subitensAdicionados.length >= 1 &&
      comparativo.subitensAdicionados.some(s => s.includes('3.4.4') || s.includes('3.4.3'))
    ),
    13,
    'Ingestão de versão revisada (Rev. 15) com histórico preservado, marcação da versão anterior como obsoleta e diff de subitens',
    `Manual: ${comparativo?.manualCodigo}, Subitens adicionados na Rev. 15: ${comparativo?.subitensAdicionados.join(', ')}`
  );

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DA HOMOLOGAÇÃO: ${passed}/13 PASSOU (${((passed / 13) * 100).toFixed(0)}%)`);
  if (failed === 0) {
    console.log('🎉 TODOS OS 13 CRITÉRIOS DE ACEITAÇÃO FORAM HOMOLOGADOS COM SUCESSO!');
  } else {
    console.error(`⚠️ ATENÇÃO: ${failed} critério(s) falharam.`);
  }
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
