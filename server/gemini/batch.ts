import { geminiMetrics } from './metrics';

export interface BatchProcessingOptions<T, R> {
  items: T[];
  batchSize: number;
  maxConcurrency?: number;
  operationName: string;
  processBatch: (batch: T[], batchIndex: number) => Promise<R[]>;
}

/**
 * Utilitário de Batching com controle de concorrência e preservação de ordem.
 * Agrupa itens para reduzir chamadas Gemini e consumo de RPM/tokens.
 */
export async function processInBatches<T, R>(options: BatchProcessingOptions<T, R>): Promise<R[]> {
  const { items, batchSize, maxConcurrency = 2, operationName, processBatch } = options;

  if (!items || items.length === 0) {
    return [];
  }

  // Dividir em lotes
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  geminiMetrics.recordBatch(items.length);

  const results: R[] = [];

  // Executar lotes com concorrência controlada
  for (let i = 0; i < batches.length; i += maxConcurrency) {
    const concurrentChunk = batches.slice(i, i + maxConcurrency);
    const chunkPromises = concurrentChunk.map((batch, idx) => {
      const realBatchIdx = i + idx;
      return processBatch(batch, realBatchIdx);
    });

    const chunkResults = await Promise.all(chunkPromises);
    for (const batchRes of chunkResults) {
      if (Array.isArray(batchRes)) {
        results.push(...batchRes);
      }
    }
  }

  return results;
}
