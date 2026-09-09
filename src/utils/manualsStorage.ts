import { ManualRecord } from '../types';
import { INITIAL_MANUALS } from '../data/initialManuals';

const DB_NAME = 'QualiGest_SGQ_DB';
const DB_VERSION = 1;
const STORE_NAME = 'manuals_full_v1';
const FALLBACK_KEY = 'qualigest_sgq_manuals_v1';
const SEEDED_FLAG_KEY = 'qualigest_sgq_manuals_seeded_v1';

/**
 * Opens or initializes IndexedDB for storing heavy manual binaries and full text
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado no ambiente.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Loads all manuals from IndexedDB with fallback to localStorage.
 * Ensures deleted manuals NEVER reappear on reload.
 */
export async function loadManualsFromDB(): Promise<ManualRecord[]> {
  // 1. Check if IndexedDB has items
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const items: ManualRecord[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (items && items.length > 0) {
      return items;
    }
  } catch (err) {
    console.warn('IndexedDB load fallback to localStorage:', err);
  }

  // 2. Check localStorage
  try {
    const saved = localStorage.getItem(FALLBACK_KEY);
    const isSeeded = localStorage.getItem(SEEDED_FLAG_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // If user deleted all manuals, parsed is [] - respect it!
        return parsed;
      }
    } else if (isSeeded === 'true') {
      // Was seeded before and emptied
      return [];
    }
  } catch (e) {
    console.warn('LocalStorage load error:', e);
  }

  // 3. First time app is loaded ever: seed initial manuals into storage once
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(INITIAL_MANUALS));
    localStorage.setItem(SEEDED_FLAG_KEY, 'true');

    // Seed into IndexedDB as well
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    for (const m of INITIAL_MANUALS) {
      store.put(m);
    }
  } catch (e) {
    console.warn('Could not seed initial manuals to storage:', e);
  }

  return INITIAL_MANUALS;
}

/**
 * Saves a single manual record to IndexedDB and localStorage
 */
export async function saveManualToDB(manual: ManualRecord): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.put(manual);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save error:', err);
  }

  // Also sync lightweight version (omitting heavy base64 to avoid quota limits) to localStorage for redundancy
  try {
    const lightRecord: ManualRecord = {
      ...manual,
      arquivoBase64: undefined,
      arquivoTextoCompleto: manual.arquivoTextoCompleto ? manual.arquivoTextoCompleto.substring(0, 15000) : undefined,
      conteudoTexto: manual.conteudoTexto ? manual.conteudoTexto.substring(0, 15000) : '',
    };
    const saved = localStorage.getItem(FALLBACK_KEY);
    let list: ManualRecord[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex((m) => m.id === manual.id);
    if (idx >= 0) {
      list[idx] = lightRecord;
    } else {
      list.unshift(lightRecord);
    }
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
    localStorage.setItem(SEEDED_FLAG_KEY, 'true');
  } catch (e) {
    console.warn('LocalStorage quota limit reached (IndexedDB retains complete full file):', e);
  }
}

/**
 * Sanitizes manuals array for API requests by stripping heavy raw base64 binaries
 */
export function sanitizeManualsForAPI(manuals: ManualRecord[]): any[] {
  if (!Array.isArray(manuals)) return [];
  return manuals.map((m) => ({
    id: m.id,
    codigo: m.codigo || 'MANUAL',
    titulo: m.titulo || '',
    revisao: m.revisao || 'Rev. 01',
    dataVigencia: m.dataVigencia || '',
    orgaoRegulador: m.orgaoRegulador || 'SGQ',
    setoresAplicaveis: m.setoresAplicaveis || [],
    descricaoResumo: m.descricaoResumo || '',
    status: m.status || 'Vigente',
    capitulos: (m.capitulos || []).map((c) => ({
      numero: c.numero,
      titulo: c.titulo,
      requisitoTexto: c.requisitoTexto ? c.requisitoTexto.substring(0, 2000) : '',
    })),
    conteudoTexto: m.conteudoTexto ? m.conteudoTexto.substring(0, 6000) : '',
    arquivoTextoCompleto: m.arquivoTextoCompleto ? m.arquivoTextoCompleto.substring(0, 6000) : undefined,
  }));
}

/**
 * Deletes a manual permanently from both IndexedDB and localStorage
 */
export async function deleteManualFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }

  try {
    const saved = localStorage.getItem(FALLBACK_KEY);
    let list: ManualRecord[] = saved ? JSON.parse(saved) : [...INITIAL_MANUALS];
    list = list.filter((m) => m.id !== id);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
    localStorage.setItem(SEEDED_FLAG_KEY, 'true');
  } catch (e) {
    console.warn('LocalStorage delete error:', e);
  }
}

/**
 * Downloads the stored original file (from Base64 in memory, IndexedDB, or server file cache, with full text fallback)
 */
export async function downloadOriginalManualFile(manual: ManualRecord): Promise<void> {
  let base64 = manual.arquivoBase64;
  let mime = manual.arquivoMimeType || 'application/pdf';
  let fileName = manual.arquivoNome || `${manual.codigo}_${manual.revisao}.pdf`;

  // 1. If binary is not in memory, check local IndexedDB
  if (!base64 && manual.id) {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const localManual: ManualRecord | undefined = await new Promise((resolve) => {
        const req = store.get(manual.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });
      if (localManual?.arquivoBase64) {
        base64 = localManual.arquivoBase64;
        mime = localManual.arquivoMimeType || mime;
        fileName = localManual.arquivoNome || fileName;
      }
    } catch (e) {
      console.warn('Could not read file binary from IndexedDB:', e);
    }
  }

  // 2. If not in IndexedDB, check server file cache
  if (!base64 && manual.id) {
    try {
      const res = await fetch(`/api/manual-files/${manual.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.base64) {
          base64 = data.base64;
          mime = data.mimeType || mime;
          fileName = data.fileName || fileName;
        }
      }
    } catch (e) {
      console.warn('Could not read from backend file cache:', e);
    }
  }

  // 3. If binary found, convert and download
  if (base64) {
    try {
      const rawData = base64.replace(/^data:[^;]+;base64,/, '');
      const byteCharacters = atob(rawData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    } catch (err) {
      console.warn('Failed to parse base64 binary for download:', err);
    }
  }

  // 4. Fallback to generating full text document
  const fullText = buildFullManualText(manual);
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = manual.arquivoNome 
    ? (manual.arquivoNome.endsWith('.txt') ? manual.arquivoNome : `${manual.arquivoNome.replace(/\.[^.]+$/, '')}_Integral.txt`)
    : `${manual.codigo}_${manual.revisao}_Integral.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Builds the complete comprehensive textual representation of the manual for AI and full-text viewing
 */
export function buildFullManualText(manual: ManualRecord): string {
  const parts: string[] = [];

  parts.push(`================================================================================`);
  parts.push(`MANUAL: ${manual.codigo} - ${manual.titulo}`);
  parts.push(`REVISÃO VIGENTE: ${manual.revisao} | DATA VIGÊNCIA: ${manual.dataVigencia}`);
  parts.push(`ÓRGÃO REGULADOR / ESCOPO: ${manual.orgaoRegulador || 'SGQ / ANAC / ISO'}`);
  parts.push(`SETORES APLICÁVEIS: ${(manual.setoresAplicaveis || []).join(', ')}`);
  parts.push(`STATUS: ${manual.status}`);
  parts.push(`================================================================================\n`);

  if (manual.descricaoResumo) {
    parts.push(`[OBJETIVO E ESCOPO DO DOCUMENTO]`);
    parts.push(`${manual.descricaoResumo}\n`);
  }

  if (manual.capitulos && manual.capitulos.length > 0) {
    parts.push(`[CAPÍTULOS E REQUISITOS NORMATIVOS DETALHADOS]`);
    manual.capitulos.forEach((cap) => {
      parts.push(`--- Item ${cap.numero}: ${cap.titulo} ---`);
      parts.push(cap.requisitoTexto);
      if (cap.palavrasChave && cap.palavrasChave.length > 0) {
        parts.push(`Palavras-chave: ${cap.palavrasChave.join(', ')}`);
      }
      parts.push('');
    });
  }

  if (manual.arquivoTextoCompleto && manual.arquivoTextoCompleto.trim().length > 0) {
    parts.push(`\n[TEXTO INTEGRAL EXTRAÍDO DO ARQUIVO ORIGINAL]`);
    parts.push(manual.arquivoTextoCompleto);
  } else if (manual.conteudoTexto && manual.conteudoTexto.trim().length > 0) {
    parts.push(`\n[CONTEÚDO NORMATIVO INTEGRAL]`);
    parts.push(manual.conteudoTexto);
  }

  return parts.join('\n');
}
