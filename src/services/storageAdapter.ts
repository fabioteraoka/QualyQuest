/**
 * Storage Abstraction Layer (Section 14)
 * Decouples UI and business logic from the underlying storage mechanism.
 * Allows seamless future migration to PostgreSQL, Cloud SQL or Firebase
 * without modifying UI components.
 */

export interface StorageAdapter<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  save(item: T): Promise<void>;
  saveAll(items: T[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteMultiple(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

export class LocalStorageAdapter<T extends { id: string }> implements StorageAdapter<T> {
  private key: string;
  private defaultItems: T[];

  constructor(key: string, defaultItems: T[] = []) {
    this.key = key;
    this.defaultItems = defaultItems;
  }

  async getAll(): Promise<T[]> {
    try {
      if (typeof window === 'undefined') return this.defaultItems;
      const raw = localStorage.getItem(this.key);
      if (!raw) return this.defaultItems;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : this.defaultItems;
    } catch (e) {
      console.warn(`[LocalStorageAdapter] Failed to load key ${this.key}:`, e);
      return this.defaultItems;
    }
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.getAll();
    return items.find((item) => item.id === id) || null;
  }

  async save(item: T): Promise<void> {
    const items = await this.getAll();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    await this.saveAll(items);
  }

  async saveAll(items: T[]): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.key, JSON.stringify(items));
    } catch (e) {
      console.warn(`[LocalStorageAdapter] Failed to save key ${this.key}:`, e);
    }
  }

  async delete(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((i) => i.id !== id);
    await this.saveAll(filtered);
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    const set = new Set(ids);
    const items = await this.getAll();
    const filtered = items.filter((i) => !set.has(i.id));
    await this.saveAll(filtered);
  }

  async clear(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(this.key);
    } catch (e) {
      console.warn(`[LocalStorageAdapter] Failed to clear key ${this.key}:`, e);
    }
  }
}
