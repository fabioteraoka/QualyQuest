export interface GeminiMetricsSnapshot {
  requestsTotal: number;
  cacheHits: number;
  cacheMisses: number;
  dedupHits: number;
  batchesTotal: number;
  itemsBatchedTotal: number;
  retriesTotal: number;
  fallbacksTotal: number;
  rateLimit429Count: number;
  unavailable503Count: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  byOperation: Record<string, { requests: number; cacheHits: number; dedupHits: number; errors: number }>;
}

class GeminiMetricsCollector {
  private metrics: GeminiMetricsSnapshot = {
    requestsTotal: 0,
    cacheHits: 0,
    cacheMisses: 0,
    dedupHits: 0,
    batchesTotal: 0,
    itemsBatchedTotal: 0,
    retriesTotal: 0,
    fallbacksTotal: 0,
    rateLimit429Count: 0,
    unavailable503Count: 0,
    totalLatencyMs: 0,
    averageLatencyMs: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    byOperation: {},
  };

  private ensureOp(op: string) {
    if (!this.metrics.byOperation[op]) {
      this.metrics.byOperation[op] = { requests: 0, cacheHits: 0, dedupHits: 0, errors: 0 };
    }
  }

  recordRequest(operation: string) {
    this.metrics.requestsTotal++;
    this.ensureOp(operation);
    this.metrics.byOperation[operation].requests++;
  }

  recordCacheHit(operation: string) {
    this.metrics.cacheHits++;
    this.ensureOp(operation);
    this.metrics.byOperation[operation].cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  recordDedupHit(operation: string) {
    this.metrics.dedupHits++;
    this.ensureOp(operation);
    this.metrics.byOperation[operation].dedupHits++;
  }

  recordBatch(itemCount: number) {
    this.metrics.batchesTotal++;
    this.metrics.itemsBatchedTotal += itemCount;
  }

  recordRetry() {
    this.metrics.retriesTotal++;
  }

  recordFallback() {
    this.metrics.fallbacksTotal++;
  }

  record429() {
    this.metrics.rateLimit429Count++;
  }

  record503() {
    this.metrics.unavailable503Count++;
  }

  recordError(operation: string) {
    this.ensureOp(operation);
    this.metrics.byOperation[operation].errors++;
  }

  recordLatency(ms: number) {
    this.metrics.totalLatencyMs += ms;
    if (this.metrics.requestsTotal > 0) {
      this.metrics.averageLatencyMs = Math.round(this.metrics.totalLatencyMs / this.metrics.requestsTotal);
    }
  }

  recordTokens(inputEstimate: number, outputEstimate: number) {
    this.metrics.estimatedInputTokens += inputEstimate;
    this.metrics.estimatedOutputTokens += outputEstimate;
  }

  getSnapshot(): GeminiMetricsSnapshot {
    return { ...this.metrics, byOperation: { ...this.metrics.byOperation } };
  }

  reset() {
    this.metrics = {
      requestsTotal: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dedupHits: 0,
      batchesTotal: 0,
      itemsBatchedTotal: 0,
      retriesTotal: 0,
      fallbacksTotal: 0,
      rateLimit429Count: 0,
      unavailable503Count: 0,
      totalLatencyMs: 0,
      averageLatencyMs: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      byOperation: {},
    };
  }
}

export const geminiMetrics = new GeminiMetricsCollector();
