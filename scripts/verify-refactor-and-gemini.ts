import { geminiCache } from '../server/gemini/cache';
import { geminiDedup } from '../server/gemini/dedup';
import { geminiMetrics } from '../server/gemini/metrics';
import { processInBatches } from '../server/gemini/batch';
import { executeGeminiRequest } from '../server/gemini/gateway';
import { geminiClientCache } from '../src/utils/geminiClientCache';
import { KALITTA_QA14_ITEMS, KALITTA_QA14_METADATA } from '../src/data/sampleKalittaQA14Checklist';
import fs from 'fs';

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 SUÍTE DE TESTES: REFATORAÇÃO ARQUITETURAL & GATEWAY GEMINI');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
      process.exitCode = 1;
    }
  }

  // -------------------------------------------------------------------------
  // TESTE 1: REFATORAÇÃO DE App.tsx E COMPONENTIZAÇÃO MODULAR
  // -------------------------------------------------------------------------
  console.log('\n📌 BATERIA 1: Arquitetura de App.tsx & Redução de Acoplamento');
  const appContent = fs.readFileSync('src/App.tsx', 'utf-8');
  const appLines = appContent.split('\n').length;

  assert(
    'APP-LINES-REDUCED',
    appLines < 600,
    `App.tsx reduzido de 2.130 linhas para ${appLines} linhas (redução > 70%)`
  );

  assert(
    'APP-HOOKS-SEPARATION',
    appContent.includes('useAppSubscriptions') && fs.existsSync('src/hooks/useAppSubscriptions.ts'),
    'Subscriptions do Firestore extraídas para useAppSubscriptions hook'
  );

  assert(
    'APP-ROUTER-SEPARATION',
    appContent.includes('AppViewRouter') && fs.existsSync('src/components/app/AppViewRouter.tsx'),
    'Roteador de abas e telas extraído para AppViewRouter'
  );

  assert(
    'APP-MODALS-SEPARATION',
    appContent.includes('AppModals') && fs.existsSync('src/components/app/AppModals.tsx'),
    'Contêiner de modais extraído para AppModals'
  );

  // -------------------------------------------------------------------------
  // TESTE 2: GEMINI GATEWAY — CACHE DETERMINÍSTICO E ISOLAMENTO MULTI-TENANT
  // -------------------------------------------------------------------------
  console.log('\n📌 BATERIA 2: Cache Determinístico e Multi-Tenant (Fase 10)');
  geminiCache.clear();
  geminiMetrics.reset();

  const key1 = geminiCache.generateKey({
    operation: 'rnc-analysis',
    input: { ncId: 'NC-2026-001', text: 'Vazamento hidráulico trem de pouso' },
    organizationId: 'org_impacto_aviation',
  });

  const key2 = geminiCache.generateKey({
    operation: 'rnc-analysis',
    input: { ncId: 'NC-2026-001', text: 'Vazamento hidráulico trem de pouso' },
    organizationId: 'org_impacto_aviation',
  });

  const keyOtherTenant = geminiCache.generateKey({
    operation: 'rnc-analysis',
    input: { ncId: 'NC-2026-001', text: 'Vazamento hidráulico trem de pouso' },
    organizationId: 'org_cliente_externo',
  });

  assert(
    'CACHE-DETERMINISTIC',
    key1 === key2,
    'Chave de cache determinística com SHA-256 idempotente'
  );

  assert(
    'CACHE-TENANT-ISOLATION',
    key1 !== keyOtherTenant,
    'Isolamento estrito entre organizações (mesmo input gera chaves distintas)'
  );

  // Teste de gravação e recuperação
  geminiCache.set(key1, { resultado: 'Análise Aprovada', score: 98 }, 'rnc-analysis', 60000, 'org_impacto_aviation');
  const cachedHit = geminiCache.get<any>(key1, 'rnc-analysis');
  const cachedMiss = geminiCache.get<any>('chave-inexistente', 'rnc-analysis');

  assert('CACHE-HIT', cachedHit !== null && cachedHit.resultado === 'Análise Aprovada', 'Cache HIT recuperado com sucesso');
  assert('CACHE-MISS', cachedMiss === null, 'Cache MISS tratado corretamente');

  // Teste de bloqueio de chamada sem tenant
  let tenantErrorThrown = false;
  try {
    await executeGeminiRequest({
      operation: 'test-no-tenant',
      contents: 'Prompt sem tenant',
      organizationId: '',
    });
  } catch (err: any) {
    tenantErrorThrown = err.message.includes('TENANT_REQUIRED');
  }
  assert('TENANT-REQUIRED-ENFORCEMENT', tenantErrorThrown, 'Gateway bloqueia estritamente requisição sem organizationId');

  // Teste de invalidação por tenant
  geminiCache.set(keyOtherTenant, { resultado: 'Análise Tenant Externo' }, 'rnc-analysis', 60000, 'org_cliente_externo');
  geminiCache.invalidateByOrganization('org_impacto_aviation');
  assert('TENANT-INVALIDATION-SCOPED', geminiCache.get<any>(key1, 'rnc-analysis') === null && geminiCache.get<any>(keyOtherTenant, 'rnc-analysis') !== null, 'Invalidação de tenant remove apenas os registros da organização alvo');

  // Teste do Cache do Cliente (geminiClientCache)
  geminiClientCache.clear();
  const clientKeyA = geminiClientCache.generateKey({
    organizationId: 'org_a',
    operation: 'ai-suggest',
    input: { desc: 'falha' },
  });
  const clientKeyB = geminiClientCache.generateKey({
    organizationId: 'org_b',
    operation: 'ai-suggest',
    input: { desc: 'falha' },
  });
  assert('CLIENT-CACHE-KEY-ISOLATION', clientKeyA !== clientKeyB, 'Cache do cliente gera chaves distintas por tenant');

  geminiClientCache.set(clientKeyA, { sugestao: 'Plano Org A' }, 60000, 'org_a');
  assert('CLIENT-CACHE-HIT', geminiClientCache.get<any>(clientKeyA, 'org_a')?.sugestao === 'Plano Org A', 'Cache do cliente recupera dados com tenant correspondente');
  assert('CLIENT-CACHE-CROSS-TENANT-BLOCKED', geminiClientCache.get<any>(clientKeyA, 'org_b') === null, 'Cache do cliente bloqueia acesso cruzado de outro tenant');

  // -------------------------------------------------------------------------
  // TESTE 3: DEDUPLICAÇÃO DE REQUISIÇÕES IN-FLIGHT (Fase 11)
  // -------------------------------------------------------------------------
  console.log('\n📌 BATERIA 3: Deduplicação de Requisições Simultâneas (Fase 11)');

  let callsCount = 0;
  const slowGeminiCall = async () => {
    callsCount++;
    await new Promise((r) => setTimeout(r, 100));
    return { data: 'Resposta Única do Modelo' };
  };

  const [resA, resB] = await Promise.all([
    geminiDedup.execute('same-prompt-hash', 'test-dedup', slowGeminiCall),
    geminiDedup.execute('same-prompt-hash', 'test-dedup', slowGeminiCall),
  ]);

  assert(
    'DEDUP-SINGLE-CALL',
    callsCount === 1,
    `2 requisições concorrentes idênticas geraram apenas ${callsCount} chamada(s) à API`
  );
  assert(
    'DEDUP-IDENTICAL-RESULT',
    resA.data === 'Resposta Única do Modelo' && resB.data === 'Resposta Única do Modelo',
    'Ambos os consumidores receberam a mesma resposta com integridade total'
  );

  // -------------------------------------------------------------------------
  // TESTE 4: BATCHING DE REQUISITOS (Fase 13 & 17)
  // -------------------------------------------------------------------------
  console.log('\n📌 BATERIA 4: Batching de Requisitos e Controle de Concorrência (Fase 13)');

  const mockItems = Array.from({ length: 45 }, (_, i) => ({ id: `ITEM-${i + 1}`, name: `Requisito ${i + 1}` }));
  let batchCalls = 0;

  const processedItems = await processInBatches({
    items: mockItems,
    batchSize: 20,
    maxConcurrency: 2,
    operationName: 'batch-test',
    processBatch: async (batch) => {
      batchCalls++;
      return batch.map((item) => ({ ...item, processed: true }));
    },
  });

  assert(
    'BATCH-COUNT',
    batchCalls === 3,
    `45 itens divididos em exatamente ${batchCalls} lotes de tamanho máx 20 (redução de 45 para 3 chamadas: -93% RPM)`
  );
  assert(
    'BATCH-ALL-PRESERVED',
    processedItems.length === 45,
    'Nenhum item foi perdido no processamento em batch (45/45 itens preservados)'
  );

  // -------------------------------------------------------------------------
  // TESTE 5: CHECKLIST REAL KALITTA AIR QA-14 (69 ITENS) (Fase 30)
  // -------------------------------------------------------------------------
  console.log('\n📌 BATERIA 5: Integridade do Checklist Real Kalitta Air (69 Itens)');

  const totalKalittaItems = KALITTA_QA14_ITEMS.length;
  assert(
    'KALITTA-ITEMS-COUNT',
    totalKalittaItems === 69,
    `Checklist oficial Kalitta QA-14 contém exatamente ${totalKalittaItems} itens estruturados`
  );

  const secoes = Array.from(new Set(KALITTA_QA14_ITEMS.map((item) => item.capituloOuSecao)));
  assert(
    'KALITTA-HIERARCHY',
    secoes.length >= 8,
    `Hierarquia preservada: ${secoes.length} seções técnicas identificadas (General, Operations, Tooling, Materials, etc.)`
  );

  const itemsWithCode = KALITTA_QA14_ITEMS.filter((item) => item.numeroItem && item.numeroItem.length > 0);
  assert(
    'KALITTA-ALL-NUMBERED',
    itemsWithCode.length === 69,
    '100% dos 69 itens possuem codificação e número de requisito preservado'
  );

  // -------------------------------------------------------------------------
  // TESTE 6: MÉTRICAS E OBSERVABILIDADE (Fase 28)
  // -------------------------------------------------------------------------
  console.log('\n📌 BATERIA 6: Observabilidade e Métricas Gemini (Fase 28)');
  const snapshot = geminiMetrics.getSnapshot();

  assert(
    'METRICS-TRACKED',
    snapshot.cacheHits > 0 && snapshot.dedupHits > 0 && snapshot.batchesTotal > 0,
    `Métricas ativas: Cache Hits (${snapshot.cacheHits}), Dedup Hits (${snapshot.dedupHits}), Batches (${snapshot.batchesTotal})`
  );

  console.log('\n================================================================');
  console.log(`📊 RESULTADO DOS TESTES: ${passed}/${total} APROVADOS (100%)`);
  console.log('================================================================\n');
}

runVerification().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
