/**
 * Cache em memória no cliente para análises do Gemini.
 * Estritamente isolado por Tenant (organizationId).
 * Evita chamadas de rede repetidas quando o usuário revisita o mesmo registro ou reabre modais.
 * Não persiste dados sensíveis no LocalStorage.
 */

export interface ClientCacheKeyOptions {
  organizationId: string;
  operation: string;
  input: any;
  promptVersion?: string;
  schemaVersion?: string;
}

interface ClientCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  organizationId: string;
}

class GeminiClientCache {
  private cache = new Map<string, ClientCacheEntry<any>>();
  private maxItems = 150;

  /**
   * Constrói chave determinística com prefixo estrito do tenant
   */
  generateKey(options: ClientCacheKeyOptions): string {
    const { organizationId, operation, input, promptVersion = 'v1', schemaVersion = 'v1' } = options;
    const org = (organizationId || 'public').trim();
    let normalizedInput = '';
    try {
      normalizedInput = typeof input === 'string' ? input.trim() : JSON.stringify(input);
    } catch {
      normalizedInput = String(input);
    }
    return `[ORG:${org}][OP:${operation}][PV:${promptVersion}][SV:${schemaVersion}]:${normalizedInput}`;
  }

  get<T>(key: string, organizationId?: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Se organizationId for fornecido, valida isolamento
    if (organizationId && entry.organizationId !== organizationId) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = 15 * 60 * 1000, organizationId = 'public'): void {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
      organizationId,
    });
  }

  invalidateByOrganization(orgId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.organizationId === orgId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const geminiClientCache = new GeminiClientCache();
