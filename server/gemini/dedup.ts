import { geminiMetrics } from './metrics';

export class GeminiRequestDeduplicator {
  private inFlightMap = new Map<string, Promise<any>>();

  /**
   * Executa a fábrica da Promise apenas se não houver outra solicitação idêntica em andamento.
   * Se houver, junta-se à Promise existente.
   */
  async execute<T>(key: string, operation: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.inFlightMap.get(key);
    if (existing) {
      geminiMetrics.recordDedupHit(operation);
      return existing as Promise<T>;
    }

    const promise = factory()
      .finally(() => {
        this.inFlightMap.delete(key);
      });

    this.inFlightMap.set(key, promise);
    return promise;
  }

  inFlightCount(): number {
    return this.inFlightMap.size;
  }
}

export const geminiDedup = new GeminiRequestDeduplicator();
