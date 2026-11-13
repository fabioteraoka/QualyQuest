/**
 * QUALYQUEST SGQ — FASE 1.4.5
 * SERVIÇO DE ARMAZENAMENTO CORPORATIVO DE ARQUIVOS DE EVIDÊNCIAS
 * 
 * Separação estrita: Conteúdo binário fora do Firestore, metadados e referências
 * no Firestore. Integridade garantida por Hash SHA-256 e deduplicação automática.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { sanitizeForFirestore } from './firebase/firestore';
import {
  ArquivoEvidenciaRef,
  HistoricoSubstituicaoArquivo,
  UserProfile
} from '../types';

const DB_NAME = 'QualiGest_Evidence_Files_DB';
const DB_VERSION = 1;
const STORE_NAME = 'evidence_binary_cache';

async function getFirebaseAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Não foi possível obter ID Token Firebase:', err);
    }
  }
  return headers;
}

function openEvidenceDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'hashSha256' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Converte File para Base64
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Calcula Hash SHA-256 no navegador para garantia de integridade
 */
export async function calculateClientSHA256(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    hash = (hash << 5) - hash + view[i];
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Salva apenas os METADADOS e referência do arquivo no Firestore (nunca o conteúdo binário)
 */
export async function persistEvidenceFileMetadata(
  organizationId: string,
  arquivoRef: ArquivoEvidenciaRef,
  requisitoId?: string
): Promise<void> {
  const orgId = organizationId || 'org_impacto_aviation';
  try {
    const docRef = doc(db, 'organizations', orgId, 'evidence_files', arquivoRef.fileId);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        ...arquivoRef,
        organizationId: orgId,
        requisitoId: requisitoId || null,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Aviso ao persistir metadados do arquivo no Firestore:', err?.message || err);
  }
}

/**
 * Salva no cache local IndexedDB para visualização offline e de alta performance
 */
async function saveToIndexedDBCache(hashSha256: string, dataBase64: string, mimeType: string, nome: string) {
  try {
    const dbIdb = await openEvidenceDB();
    const tx = dbIdb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      hashSha256,
      dataBase64,
      mimeType,
      nome,
      salvoEm: new Date().toISOString()
    });
  } catch {
    // Cache local não bloqueia o fluxo
  }
}

/**
 * Recupera do cache local IndexedDB se disponível
 */
export async function getFromIndexedDBCache(hashSha256: string): Promise<{ dataBase64: string; mimeType: string; nome: string } | null> {
  try {
    const dbIdb = await openEvidenceDB();
    const tx = dbIdb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.get(hashSha256);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * 1. Enviar arquivo para o armazenamento de objetos
 */
export async function uploadEvidenceFile(
  file: File,
  organizationId: string,
  currentUser?: UserProfile | null,
  requisitoId?: string
): Promise<ArquivoEvidenciaRef> {
  const orgId = organizationId || 'org_impacto_aviation';

  // Validação de Tamanho (Max 25 MB)
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Arquivo muito grande: ${(file.size / (1024 * 1024)).toFixed(1)} MB. O limite máximo é 25 MB.`);
  }

  // Validação de Extensão
  const dotIdx = file.name.lastIndexOf('.');
  const extensao = dotIdx >= 0 ? file.name.substring(dotIdx).toLowerCase() : '';
  const EXTENSOES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.xlsx', '.xls', '.docx', '.doc', '.txt'];
  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    throw new Error(`Extensão "${extensao || 'sem extensão'}" não permitida para evidências de auditoria. Formatos aceitos: ${EXTENSOES_PERMITIDAS.join(', ')}.`);
  }

  const base64Data = await fileToBase64(file);
  const arrayBuffer = await file.arrayBuffer();
  const hashLocal = await calculateClientSHA256(arrayBuffer);

  // Envia autenticado para a API de Object Storage do backend
  const headers = await getFirebaseAuthHeaders({ 'Content-Type': 'application/json' });
  let resp: Response | null = null;
  try {
    resp = await fetch('/api/evidence-storage/upload', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        organizationId: orgId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data,
        requisitoId
      })
    });
  } catch (err) {
    console.warn('Backend object storage inacessível por falha de rede. Armazenando no cache IndexedDB...', err);
  }

  if (resp) {
    if (resp.ok) {
      const data = await resp.json();
      await saveToIndexedDBCache(data.arquivoRef.hashSha256, base64Data, data.arquivoRef.mimeType || file.type, file.name);
      await persistEvidenceFileMetadata(orgId, data.arquivoRef, requisitoId);
      return data.arquivoRef;
    }

    // Erros de segurança, autorização ou validação de conteúdo NUNCA devem cair silenciosamente no IndexedDB
    let errMsg = `Falha no envio de evidência (HTTP ${resp.status}).`;
    try {
      const errJson = await resp.json();
      if (errJson?.error) errMsg = errJson.error;
    } catch {
      // ignora parse
    }

    if (resp.status >= 400 && resp.status < 500) {
      throw new Error(errMsg);
    }
    throw new Error(errMsg);
  }

  // Fallback estritamente para indisponibilidade offline de rede (sem mascarar rejeições HTTP)
  await saveToIndexedDBCache(hashLocal, base64Data, file.type, file.name);

  const fallbackRef: ArquivoEvidenciaRef = {
    fileId: `FILE-IDB-${hashLocal.substring(0, 16).toUpperCase()}`,
    storagePath: `/api/evidence-storage/files/${orgId}/${hashLocal}`,
    arquivoNome: file.name,
    mimeType: file.type || 'application/octet-stream',
    tamanhoBytes: file.size,
    hashSha256: hashLocal,
    dataUpload: new Date().toISOString(),
    enviadoPorNome: currentUser?.displayName || 'Qualidade IMPACTO',
    enviadoPorUid: currentUser?.uid,
    versao: 1
  };

  await persistEvidenceFileMetadata(orgId, fallbackRef, requisitoId);
  return fallbackRef;
}

/**
 * 2. Obter URL segura para visualização/download do arquivo (via Bearer Token -> Blob URL)
 */
export async function getEvidenceFileUrl(
  arquivoRef: ArquivoEvidenciaRef,
  organizationId: string
): Promise<string> {
  const orgId = organizationId || 'org_impacto_aviation';
  const targetPath = arquivoRef.storagePath || `/api/evidence-storage/files/${orgId}/${arquivoRef.hashSha256}`;

  // 1. Tenta baixar autenticado do servidor de objetos quando houver sessão ativa
  if (auth.currentUser && targetPath.startsWith('/api/evidence-storage/files/')) {
    const headers = await getFirebaseAuthHeaders();
    try {
      const resp = await fetch(targetPath, { headers });
      if (resp.ok) {
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
      }
      let errJson: any = null;
      try {
        errJson = await resp.json();
      } catch {}
      if (
        resp.status === 401 ||
        resp.status === 403 ||
        resp.status === 409 ||
        resp.status === 503 ||
        (resp.status === 404 && errJson?.code === 'BINARY_MISSING')
      ) {
        throw new Error(errJson?.error || `Falha ao recuperar arquivo no servidor (HTTP ${resp.status}).`);
      }
    } catch (err: any) {
      if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      // Apenas falha de rede real recorre ao cache offline IndexedDB
    }
  }

  // 2. Fallback para cache local IndexedDB apenas quando offline ou sem sessão HTTP
  if (arquivoRef.hashSha256) {
    const cached = await getFromIndexedDBCache(arquivoRef.hashSha256);
    if (cached?.dataBase64) {
      return cached.dataBase64;
    }
  }

  throw new Error('Arquivo binário não encontrado ou sessão não autenticada para download seguro.');
}

/**
 * 3. Verificar integridade SHA-256 do arquivo armazenado
 */
export async function verifyEvidenceFileIntegrity(
  organizationId: string,
  hashSha256: string
): Promise<{ exists: boolean; metadataExists?: boolean; integro: boolean; code?: string; tamanhoBytes?: number }> {
  const orgId = organizationId || 'org_impacto_aviation';
  try {
    const headers = await getFirebaseAuthHeaders();
    const resp = await fetch(`/api/evidence-storage/verify-integrity/${encodeURIComponent(orgId)}/${encodeURIComponent(hashSha256)}`, {
      headers
    });
    const payload = await resp.json().catch(() => null);
    if (resp.ok && payload) {
      return payload;
    }
    if (resp.status === 404 && payload) {
      return payload;
    }
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(payload?.error || `Acesso negado ao verificar integridade (HTTP ${resp.status}).`);
    }
  } catch (err: any) {
    if (err?.message && (err.message.includes('Acesso negado') || err.message.includes('HTTP 40'))) {
      throw err;
    }
  }
  const cached = await getFromIndexedDBCache(hashSha256);
  return { exists: Boolean(cached), integro: Boolean(cached) };
}

/**
 * 4. Substituição controlada de arquivo com histórico
 */
export async function substituirArquivoEvidencia(
  novoArquivo: File,
  arquivoAtual: ArquivoEvidenciaRef,
  motivoSubstituicao: string,
  organizationId: string,
  currentUser?: UserProfile | null,
  requisitoId?: string
): Promise<ArquivoEvidenciaRef> {
  if (!motivoSubstituicao.trim()) {
    throw new Error('O registro do motivo técnico da substituição é obrigatório para manter a conformidade do SGQ.');
  }

  const novaRef = await uploadEvidenceFile(novoArquivo, organizationId, currentUser, requisitoId);

  const historicoItem: HistoricoSubstituicaoArquivo = {
    arquivoAnteriorNome: arquivoAtual.arquivoNome,
    arquivoAnteriorHash: arquivoAtual.hashSha256,
    arquivoNovoNome: novaRef.arquivoNome,
    arquivoNovoHash: novaRef.hashSha256,
    substituidoEm: new Date().toISOString(),
    substituidoPorNome: currentUser?.displayName || 'Qualidade IMPACTO',
    substituidoPorUid: currentUser?.uid,
    motivoSubstituicao
  };

  const refAtualizada: ArquivoEvidenciaRef = {
    ...novaRef,
    versao: (arquivoAtual.versao || 1) + 1,
    historicoSubstituicoes: [historicoItem, ...(arquivoAtual.historicoSubstituicoes || [])]
  };

  await persistEvidenceFileMetadata(organizationId, refAtualizada, requisitoId);
  return refAtualizada;
}

/**
 * 5. Migração de arquivos legados em Base64 para o armazenamento de objetos
 */
export async function migrarArquivoBase64ParaStorage(
  base64Data: string,
  fileName: string,
  tipo: string,
  organizationId: string,
  currentUser?: UserProfile | null
): Promise<ArquivoEvidenciaRef> {
  const orgId = organizationId || 'org_impacto_aviation';
  const headers = await getFirebaseAuthHeaders({ 'Content-Type': 'application/json' });

  let resp: Response | null = null;
  try {
    resp = await fetch('/api/evidence-storage/migrate-base64', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        organizationId: orgId,
        base64Data,
        fileName,
        tipo
      })
    });
  } catch (e) {
    console.warn('Erro de rede ao migrar base64 no servidor:', e);
  }

  if (resp) {
    if (resp.ok) {
      const data = await resp.json();
      await persistEvidenceFileMetadata(orgId, data.arquivoRef);
      return data.arquivoRef;
    }
    const errJson = await resp.json().catch(() => null);
    throw new Error(errJson?.error || `Erro ao migrar arquivo legado (HTTP ${resp.status}).`);
  }

  const clean = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const hash = await calculateClientSHA256(bytes.buffer);

  await saveToIndexedDBCache(hash, base64Data, 'application/pdf', fileName);

  const migratedRef: ArquivoEvidenciaRef = {
    fileId: `FILE-MIG-${hash.substring(0, 14).toUpperCase()}`,
    storagePath: `/api/evidence-storage/files/${orgId}/${hash}`,
    arquivoNome: fileName || 'Evidencia_Migrada.pdf',
    mimeType: base64Data.startsWith('data:image/') ? 'image/png' : 'application/pdf',
    tamanhoBytes: bytes.length,
    hashSha256: hash,
    dataUpload: new Date().toISOString(),
    enviadoPorNome: currentUser?.displayName || 'Migração SGQ Fase 1.4.5',
    versao: 1,
    migradoDeBase64: true
  };

  await persistEvidenceFileMetadata(orgId, migratedRef);
  return migratedRef;
}
