import { ManualRecord, VersaoDocumentoConfig } from '../types';
import { INITIAL_MANUALS } from '../data/initialManuals';
import { loadManualsFromDB, saveManualToDB, deleteManualFromDB } from '../utils/manualsStorage';

export class ManualsRepository {
  private cache: ManualRecord[] | null = null;

  async getAll(): Promise<ManualRecord[]> {
    if (this.cache && this.cache.length > 0) {
      return this.cache;
    }
    const loaded = await loadManualsFromDB();
    this.cache = loaded && loaded.length > 0 ? loaded : INITIAL_MANUALS;
    return this.cache;
  }

  async getById(id: string): Promise<ManualRecord | null> {
    const list = await this.getAll();
    return list.find((m) => m.id === id) || null;
  }

  async getByCodeAndVersion(codigo: string, revisao?: string): Promise<ManualRecord | null> {
    const list = await this.getAll();
    const cleanCode = codigo.trim().toLowerCase();
    
    // First match both code and revision
    if (revisao) {
      const cleanRev = revisao.trim().toLowerCase();
      const exact = list.find(
        (m) => m.codigo.toLowerCase() === cleanCode && m.revisao.toLowerCase() === cleanRev
      );
      if (exact) return exact;
    }

    // Otherwise match by code
    return list.find((m) => m.codigo.toLowerCase() === cleanCode) || null;
  }

  async save(manual: ManualRecord): Promise<void> {
    const list = await this.getAll();
    const idx = list.findIndex((m) => m.id === manual.id);
    if (idx >= 0) {
      list[idx] = manual;
    } else {
      list.unshift(manual);
    }
    this.cache = [...list];
    await saveManualToDB(manual);
  }

  async addVersionToManual(manualId: string, version: VersaoDocumentoConfig): Promise<ManualRecord | null> {
    const manual = await this.getById(manualId);
    if (!manual) return null;

    const existingVersions = manual.versoesConfiguracao || [];
    const updatedVersions = [version, ...existingVersions.filter(v => v.id !== version.id)];

    const updatedManual: ManualRecord = {
      ...manual,
      versoesConfiguracao: updatedVersions,
      atualizadoEm: new Date().toISOString(),
    };

    await this.save(updatedManual);
    return updatedManual;
  }

  async delete(id: string): Promise<void> {
    if (this.cache) {
      this.cache = this.cache.filter((m) => m.id !== id);
    }
    await deleteManualFromDB(id);
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const manualsRepository = new ManualsRepository();
