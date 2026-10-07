import crypto from 'crypto';
import { geminiMetrics } from './metrics';

export interface CacheEntry<T> {
  key: string;
  data: T;
  createdAt: number;
  expiresAt: number;
  operation: string;
  organizationId?: string;
  sizeBytes: number;
}

export interface CacheKeyOptions {
  operation: string;
  input: any;
  promptVersion?: string;
  schemaVersion?: string;
  model?: string;
  organizationId?: string;
}

export class GeminiResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(maxEntries = 1000, defaultTtlMs = 12 * 60 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Constrói chave determinística SHA-256 normalizada
   */
  generateKey(options: CacheKeyOptions): string {
    const { operation, input, promptVersion = 'v1', schemaVersion = 'v1', model = 'default', organizationId = 'public' } = options;

    let normalizedInputString: string;
    if (typeof input === 'string') {
      normalizedInputString = input.trim().replace(/\r\n/g, '\n');
    } else {
      try {
        normalizedInputString = JSON.stringify(input, Object.keys(input || {}).sort());
      } catch {
        normalizedInputString = String(input);
      }
    }

    const rawPayload = `[OP:${operation}][ORG:${organizationId}][MODEL:${model}][PV:${promptVersion}][SV:${schemaVersion}]:${normalizedInputString}`;
    return crypto.createHash('sha256').update(rawPayload).digest('hex');
  }

  get<T>(key: string, operation: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      geminiMetrics.recordCacheMiss();
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      geminiMetrics.recordCacheMiss();
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    geminiMetrics.recordCacheHit(operation);
    return entry.data as T;
  }

  set<T>(key: string, data: T, operation: string, ttlMs?: number, organizationId?: string): void {
    const ttl = ttlMs || this.defaultTtlMs;
    const now = Date.now();

    // Evict oldest if full
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    let approxBytes = 500;
    try {
      approxBytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch {
      // ignore
    }

    this.cache.set(key, {
      key,
      data,
      createdAt: now,
      expiresAt: now + ttl,
      operation,
      organizationId,
      sizeBytes: approxBytes,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateByOrganization(orgId: string): void {
    for (const [k, v] of this.cache.entries()) {
      if (v.organizationId === orgId) {
        this.cache.delete(k);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const geminiCache = new GeminiResponseCache();
