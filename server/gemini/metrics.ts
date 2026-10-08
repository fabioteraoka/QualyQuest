export interface GeminiMetricsSnapshot {
  requestsTotal: number;
  cacheHits: number;
  cacheMisses: number;
  dedupHits: number;
  actualGeminiRequests: number;
  batchesTotal: number;
  itemsBatchedTotal: number;
  retriesTotal: number;
  fallbacksTotal: number;
  rateLimit429Count: number;
  unavailable503Count: number;
  totalLatencyMs: number;
  totalGeminiLatencyMs: number;
  averageLatencyMs: number;
  averageGeminiLatencyMs: number;
  averageEndToEndLatencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  realPromptTokens: number;
  realCandidatesTokens: number;
  realTotalTokens: number;
  byOperation: Record<string, { requests: number; cacheHits: number; dedupHits: number; errors: number }>;
}

class GeminiMetricsCollector {
  private metrics: GeminiMetricsSnapshot = {
    requestsTotal: 0,
    cacheHits: 0,
    cacheMisses: 0,
    dedupHits: 0,
    actualGeminiRequests: 0,
    batchesTotal: 0,
    itemsBatchedTotal: 0,
    retriesTotal: 0,
    fallbacksTotal: 0,
    rateLimit429Count: 0,
    unavailable503Count: 0,
    totalLatencyMs: 0,
    totalGeminiLatencyMs: 0,
    averageLatencyMs: 0,
    averageGeminiLatencyMs: 0,
    averageEndToEndLatencyMs: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    realPromptTokens: 0,
    realCandidatesTokens: 0,
    realTotalTokens: 0,
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

  recordActualGeminiRequest() {
    this.metrics.actualGeminiRequests++;
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
    this.metrics.totalGeminiLatencyMs += ms;
    if (this.metrics.actualGeminiRequests > 0) {
      this.metrics.averageGeminiLatencyMs = Math.round(this.metrics.totalGeminiLatencyMs / this.metrics.actualGeminiRequests);
    } else {
      this.metrics.averageGeminiLatencyMs = ms;
    }
    if (this.metrics.requestsTotal > 0) {
      this.metrics.averageEndToEndLatencyMs = Math.round(this.metrics.totalLatencyMs / this.metrics.requestsTotal);
      this.metrics.averageLatencyMs = this.metrics.averageGeminiLatencyMs;
    }
  }

  recordTokens(inputEstimate: number, outputEstimate: number) {
    this.metrics.estimatedInputTokens += inputEstimate;
    this.metrics.estimatedOutputTokens += outputEstimate;
  }

  recordRealTokens(promptTokens?: number, candidatesTokens?: number, totalTokens?: number) {
    if (typeof promptTokens === 'number') this.metrics.realPromptTokens += promptTokens;
    if (typeof candidatesTokens === 'number') this.metrics.realCandidatesTokens += candidatesTokens;
    if (typeof totalTokens === 'number') {
      this.metrics.realTotalTokens += totalTokens;
    } else if (typeof promptTokens === 'number' && typeof candidatesTokens === 'number') {
      this.metrics.realTotalTokens += promptTokens + candidatesTokens;
    }
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
      actualGeminiRequests: 0,
      batchesTotal: 0,
      itemsBatchedTotal: 0,
      retriesTotal: 0,
      fallbacksTotal: 0,
      rateLimit429Count: 0,
      unavailable503Count: 0,
      totalLatencyMs: 0,
      totalGeminiLatencyMs: 0,
      averageLatencyMs: 0,
      averageGeminiLatencyMs: 0,
      averageEndToEndLatencyMs: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      realPromptTokens: 0,
      realCandidatesTokens: 0,
      realTotalTokens: 0,
      byOperation: {},
    };
  }
}

export const geminiMetrics = new GeminiMetricsCollector();
