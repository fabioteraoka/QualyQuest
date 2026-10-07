/**
 * Cache em memória no cliente para análises do Gemini.
 * Evita chamadas de rede repetidas quando o usuário clica no mesmo botão ou visualiza o mesmo registro.
 * Não persiste dados sensíveis no LocalStorage.
 */

interface ClientCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class GeminiClientCache {
  private cache = new Map<string, ClientCacheEntry<any>>();
  private maxItems = 150;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = 10 * 60 * 1000): void {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const geminiClientCache = new GeminiClientCache();
