import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface EvidenceBinaryMetadata {
  fileId: string;
  organizationId: string;
  requisitoId?: string;
  storagePath: string;
  objectPath?: string;
  storageBucket?: string;
  storageBackend?: "gcs" | "local_ephemeral";
  objectGeneration?: string;
  arquivoNome: string;
  mimeType: string;
  tamanhoBytes: number;
  hashSha256: string;
  dataUpload: string;
  enviadoPorNome: string;
  enviadoPorUid?: string;
  versao: number;
  migradoDeBase64?: boolean;
  [key: string]: any;
}

export interface EvidenceAuditEntry {
  action: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  uid?: string;
  email?: string;
  role?: string;
  userOrganizationId?: string;
  requestedOrganizationId?: string;
  hashSha256?: string;
  fileName?: string;
  detail?: string;
  ip?: string;
}

export interface StorageHealthStatus {
  driverName: "gcs" | "local_ephemeral";
  isPersistent: boolean;
  bucketName?: string;
  bucketReachable: boolean;
  versioningEnabled?: boolean;
  retentionConfigured?: boolean;
  location?: string;
  serviceAccountEmail?: string;
  diagnosticCode: string;
  diagnosticMessage: string;
}

export interface ObjectStateResult {
  binaryExists: boolean;
  metadataExists: boolean;
  objectPath: string;
  objectGeneration?: string;
}

export interface EvidenceStorageBackend {
  readonly driverName: "gcs" | "local_ephemeral";
  readonly isPersistent: boolean;
  readonly bucketName?: string;
  buildObjectPath(orgId: string, hashSha256: string): string;
  probeHealth(): Promise<StorageHealthStatus>;
  putBinaryIfAbsent(
    orgId: string,
    hashSha256: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ created: boolean; objectPath: string; objectGeneration?: string }>;
  getBinary(orgId: string, hashSha256: string): Promise<{ buffer: Buffer; objectGeneration?: string } | null>;
  putMetadata(orgId: string, hashSha256: string, meta: EvidenceBinaryMetadata): Promise<void>;
  getMetadata(orgId: string, hashSha256: string): Promise<EvidenceBinaryMetadata | null>;
  checkObjectState(orgId: string, hashSha256: string): Promise<ObjectStateResult>;
  appendAuditEvent(entry: EvidenceAuditEntry): Promise<void>;
}

const ORG_ID_SAFE_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const SHA256_SAFE_REGEX = /^[a-f0-9]{64}$/i;

export function assertSafeOrgIdForStorage(rawOrgId: unknown): string {
  if (typeof rawOrgId !== "string" || !ORG_ID_SAFE_REGEX.test(rawOrgId.trim())) {
    throw Object.assign(new Error("Identificador de organização inválido ou inseguro."), {
      status: 400,
      code: "INVALID_ORGANIZATION_ID"
    });
  }
  return rawOrgId.trim();
}

export function assertSafeSha256ForStorage(rawHash: unknown): string {
  if (typeof rawHash !== "string" || !SHA256_SAFE_REGEX.test(rawHash.trim())) {
    throw Object.assign(new Error("Hash SHA-256 inválido ou malformado."), {
      status: 400,
      code: "INVALID_HASH_FORMAT"
    });
  }
  return rawHash.trim().toLowerCase();
}

export function buildCanonicalEvidenceObjectPath(orgId: string, hashSha256: string): string {
  const safeOrg = assertSafeOrgIdForStorage(orgId);
  const safeHash = assertSafeSha256ForStorage(hashSha256);
  return `organizations/${safeOrg}/evidences/${safeHash}`;
}

export class LocalEphemeralStorageBackend implements EvidenceStorageBackend {
  readonly driverName = "local_ephemeral" as const;
  readonly isPersistent = false;
  private readonly baseDir: string;
  private readonly auditDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    this.auditDir = path.join(this.baseDir, "_audit");
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
    if (!fs.existsSync(this.auditDir)) fs.mkdirSync(this.auditDir, { recursive: true });
  }

  buildObjectPath(orgId: string, hashSha256: string): string {
    return buildCanonicalEvidenceObjectPath(orgId, hashSha256);
  }

  private resolvePaths(orgId: string, hashSha256: string) {
    const safeOrg = assertSafeOrgIdForStorage(orgId);
    const safeHash = assertSafeSha256ForStorage(hashSha256);
    const orgDir = path.resolve(this.baseDir, safeOrg);
    if (!orgDir.startsWith(this.baseDir + path.sep)) {
      throw Object.assign(new Error("Tentativa de path traversal bloqueada."), {
        status: 400,
        code: "PATH_TRAVERSAL_BLOCKED"
      });
    }
    const binaryPath = path.resolve(orgDir, `${safeHash}.bin`);
    const metaPath = path.resolve(orgDir, `${safeHash}.meta.json`);
    if (!binaryPath.startsWith(orgDir + path.sep) || !metaPath.startsWith(orgDir + path.sep)) {
      throw Object.assign(new Error("Caminho fora do escopo da organização."), {
        status: 400,
        code: "PATH_TRAVERSAL_BLOCKED"
      });
    }
    return { orgDir, binaryPath, metaPath, objectPath: `organizations/${safeOrg}/evidences/${safeHash}` };
  }

  async probeHealth(): Promise<StorageHealthStatus> {
    return {
      driverName: "local_ephemeral",
      isPersistent: false,
      bucketReachable: false,
      diagnosticCode: "EPHEMERAL_CONTAINER_FILESYSTEM",
      diagnosticMessage:
        "Armazenamento em filesystem local do container. NÃO é persistente entre deploys, recriações de container ou múltiplas réplicas."
    };
  }

  async putBinaryIfAbsent(orgId: string, hashSha256: string, buffer: Buffer) {
    const { orgDir, binaryPath, objectPath } = this.resolvePaths(orgId, hashSha256);
    if (!fs.existsSync(orgDir)) fs.mkdirSync(orgDir, { recursive: true });
    if (fs.existsSync(binaryPath)) {
      return { created: false, objectPath };
    }
    fs.writeFileSync(binaryPath, buffer);
    return { created: true, objectPath };
  }

  async getBinary(orgId: string, hashSha256: string) {
    const { binaryPath } = this.resolvePaths(orgId, hashSha256);
    if (!fs.existsSync(binaryPath)) return null;
    return { buffer: fs.readFileSync(binaryPath) };
  }

  async putMetadata(orgId: string, hashSha256: string, meta: EvidenceBinaryMetadata): Promise<void> {
    const { orgDir, metaPath } = this.resolvePaths(orgId, hashSha256);
    if (!fs.existsSync(orgDir)) fs.mkdirSync(orgDir, { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
  }

  async getMetadata(orgId: string, hashSha256: string): Promise<EvidenceBinaryMetadata | null> {
    const { metaPath } = this.resolvePaths(orgId, hashSha256);
    if (!fs.existsSync(metaPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf8")) as EvidenceBinaryMetadata;
    } catch {
      return null;
    }
  }

  async checkObjectState(orgId: string, hashSha256: string): Promise<ObjectStateResult> {
    const { binaryPath, metaPath, objectPath } = this.resolvePaths(orgId, hashSha256);
    return {
      binaryExists: fs.existsSync(binaryPath),
      metadataExists: fs.existsSync(metaPath),
      objectPath
    };
  }

  async appendAuditEvent(entry: EvidenceAuditEntry): Promise<void> {
    try {
      const logLine = JSON.stringify({
        timestamp: new Date().toISOString(),
        backend: "local_ephemeral",
        ...entry
      });
      fs.appendFileSync(path.join(this.auditDir, "evidence_storage_audit.jsonl"), logLine + "\n", "utf8");
    } catch (err) {
      console.warn("Aviso ao gravar audit log de evidências:", err);
    }
  }
}

export interface GcsBackendOptions {
  bucketName: string;
  apiBaseUrl?: string; // Default: https://storage.googleapis.com/storage/v1
  uploadBaseUrl?: string; // Default: https://storage.googleapis.com/upload/storage/v1
  getAccessToken?: () => Promise<string | null>;
  localAuditFallbackDir?: string;
}

interface CachedGcsToken {
  accessToken: string;
  expiresAtMs: number;
  serviceAccountEmail?: string;
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export class GcsStorageBackend implements EvidenceStorageBackend {
  readonly driverName = "gcs" as const;
  readonly isPersistent = true;
  readonly bucketName: string;
  private readonly apiBaseUrl: string;
  private readonly uploadBaseUrl: string;
  private readonly customTokenProvider?: () => Promise<string | null>;
  private readonly localAuditFallbackDir?: string;
  private cachedToken: CachedGcsToken | null = null;

  constructor(options: GcsBackendOptions) {
    if (!options.bucketName || !options.bucketName.trim()) {
      throw new Error("EVIDENCE_STORAGE_BUCKET obrigatório para GcsStorageBackend.");
    }
    this.bucketName = options.bucketName.trim();
    this.apiBaseUrl = (options.apiBaseUrl || "https://storage.googleapis.com/storage/v1").replace(/\/+$/, "");
    this.uploadBaseUrl = (options.uploadBaseUrl || "https://storage.googleapis.com/upload/storage/v1").replace(/\/+$/, "");
    this.customTokenProvider = options.getAccessToken;
    this.localAuditFallbackDir = options.localAuditFallbackDir;
  }

  buildObjectPath(orgId: string, hashSha256: string): string {
    return buildCanonicalEvidenceObjectPath(orgId, hashSha256);
  }

  private buildMetaObjectPath(orgId: string, hashSha256: string): string {
    return `${this.buildObjectPath(orgId, hashSha256)}.meta.json`;
  }

  private loadServiceAccountCredentials(): { client_email: string; private_key: string; token_uri?: string } | null {
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawJson && rawJson.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.client_email && parsed.private_key) return parsed;
      } catch {
        // Ignora JSON inválido
      }
    }

    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && fs.existsSync(credPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(credPath, "utf8"));
        if (parsed.client_email && parsed.private_key) return parsed;
      } catch {
        // Ignora arquivo inválido
      }
    }
    return null;
  }

  private async resolveAccessToken(): Promise<{ token: string; serviceAccountEmail?: string }> {
    if (this.customTokenProvider) {
      const custom = await this.customTokenProvider();
      if (!custom) {
        throw Object.assign(new Error("Provedor de credencial GCS não retornou token."), {
          status: 503,
          code: "GCS_CREDENTIALS_UNAVAILABLE"
        });
      }
      return { token: custom };
    }

    const nowMs = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAtMs > nowMs + 60_000) {
      return {
        token: this.cachedToken.accessToken,
        serviceAccountEmail: this.cachedToken.serviceAccountEmail
      };
    }

    // 1. Service Account JSON (GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT_JSON)
    const sa = this.loadServiceAccountCredentials();
    if (sa) {
      const iat = Math.floor(nowMs / 1000);
      const exp = iat + 3600;
      const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
      const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const claim = toBase64Url(
        JSON.stringify({
          iss: sa.client_email,
          scope: "https://www.googleapis.com/auth/devstorage.read_write",
          aud: tokenUri,
          iat,
          exp
        })
      );
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(`${header}.${claim}`);
      const sig = toBase64Url(signer.sign(sa.private_key));
      const assertion = `${header}.${claim}.${sig}`;

      const resp = await fetch(tokenUri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion
        })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw Object.assign(new Error(`Falha ao autenticar Service Account no OAuth2 GCS (HTTP ${resp.status}): ${txt}`), {
          status: 503,
          code: "GCS_AUTH_EXCHANGE_FAILED"
        });
      }
      const data: any = await resp.json();
      this.cachedToken = {
        accessToken: data.access_token,
        expiresAtMs: nowMs + (Number(data.expires_in) || 3500) * 1000,
        serviceAccountEmail: sa.client_email
      };
      return { token: this.cachedToken.accessToken, serviceAccountEmail: sa.client_email };
    }

    // 2. GCE / Cloud Run Metadata Server (Workload Identity / Attached SA)
    try {
      const metaTokenResp = await fetch(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(2000) }
      );
      if (metaTokenResp.ok) {
        const tokenData: any = await metaTokenResp.json();
        let saEmail: string | undefined;
        try {
          const emailResp = await fetch(
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email",
            { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(1500) }
          );
          if (emailResp.ok) saEmail = (await emailResp.text()).trim();
        } catch {
          // opcional
        }
        if (tokenData?.access_token) {
          this.cachedToken = {
            accessToken: tokenData.access_token,
            expiresAtMs: nowMs + (Number(tokenData.expires_in) || 1800) * 1000,
            serviceAccountEmail: saEmail
          };
          return { token: this.cachedToken.accessToken, serviceAccountEmail: saEmail };
        }
      }
    } catch {
      // Metadata server indisponível fora do GCP
    }

    throw Object.assign(
      new Error("Credenciais GCS/Firebase Admin ausentes (GOOGLE_APPLICATION_CREDENTIALS ou Metadata Server sem permissão)."),
      { status: 503, code: "GCS_CREDENTIALS_UNAVAILABLE" }
    );
  }

  private mapGcsError(status: number, bodyText: string, context: string): Error {
    if (status === 404 && bodyText.toLowerCase().includes("bucket")) {
      return Object.assign(new Error(`Bucket GCS/Firebase Storage não existe ou não está ativado (${this.bucketName}): ${context}`), {
        status: 503,
        code: "GCS_BUCKET_NOT_FOUND"
      });
    }
    if (status === 403) {
      return Object.assign(new Error(`Permissão IAM negada no bucket ${this.bucketName} durante ${context}.`), {
        status: 503,
        code: "GCS_PERMISSION_DENIED"
      });
    }
    if (status === 401) {
      return Object.assign(new Error(`Credencial GCS rejeitada durante ${context}.`), {
        status: 503,
        code: "GCS_UNAUTHORIZED"
      });
    }
    return Object.assign(new Error(`Falha GCS HTTP ${status} em ${context}: ${bodyText.slice(0, 300)}`), {
      status: 502,
      code: "GCS_REQUEST_FAILED"
    });
  }

  async probeHealth(): Promise<StorageHealthStatus> {
    try {
      const { token, serviceAccountEmail } = await this.resolveAccessToken();
      const resp = await fetch(`${this.apiBaseUrl}/b/${encodeURIComponent(this.bucketName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await resp.text();
      if (!resp.ok) {
        const mapped: any = this.mapGcsError(resp.status, text, "probeHealth");
        return {
          driverName: "gcs",
          isPersistent: true,
          bucketName: this.bucketName,
          bucketReachable: false,
          serviceAccountEmail,
          diagnosticCode: mapped.code || `HTTP_${resp.status}`,
          diagnosticMessage: mapped.message
        };
      }
      const bucketMeta: any = JSON.parse(text);
      return {
        driverName: "gcs",
        isPersistent: true,
        bucketName: this.bucketName,
        bucketReachable: true,
        versioningEnabled: Boolean(bucketMeta?.versioning?.enabled),
        retentionConfigured: Boolean(bucketMeta?.retentionPolicy?.retentionPeriod),
        location: bucketMeta?.location,
        serviceAccountEmail,
        diagnosticCode: "GCS_BUCKET_OPERATIONAL",
        diagnosticMessage: `Bucket ${this.bucketName} acessível e operacional (location=${bucketMeta?.location || "N/A"}, versioning=${Boolean(bucketMeta?.versioning?.enabled)}).`
      };
    } catch (err: any) {
      return {
        driverName: "gcs",
        isPersistent: true,
        bucketName: this.bucketName,
        bucketReachable: false,
        diagnosticCode: err?.code || "GCS_PROBE_ERROR",
        diagnosticMessage: err?.message || "Erro ao consultar saúde do bucket GCS."
      };
    }
  }

  async putBinaryIfAbsent(
    orgId: string,
    hashSha256: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ created: boolean; objectPath: string; objectGeneration?: string }> {
    const objectPath = this.buildObjectPath(orgId, hashSha256);
    const { token } = await this.resolveAccessToken();

    // Upload idempotente via precondition ifGenerationMatch=0
    const uploadUrl = `${this.uploadBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o?uploadType=media&name=${encodeURIComponent(
      objectPath
    )}&ifGenerationMatch=0`;

    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType || "application/octet-stream"
      },
      body: new Uint8Array(buffer)
    });

    if (resp.status === 412) {
      // Objeto já existe no bucket: validar que não há colisão/corrupção de hash
      const existing = await this.getBinary(orgId, hashSha256);
      if (existing) {
        const existingHash = crypto.createHash("sha256").update(existing.buffer).digest("hex");
        if (existingHash.toLowerCase() !== hashSha256.toLowerCase()) {
          throw Object.assign(
            new Error("Conflito crítico de integridade no bucket: objeto já existente possui SHA-256 divergente."),
            { status: 409, code: "INTEGRITY_MISMATCH" }
          );
        }
        return { created: false, objectPath, objectGeneration: existing.objectGeneration };
      }
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw this.mapGcsError(resp.status, txt, `upload ${objectPath}`);
    }

    const objJson: any = await resp.json();
    return {
      created: true,
      objectPath,
      objectGeneration: objJson?.generation ? String(objJson.generation) : undefined
    };
  }

  async getBinary(orgId: string, hashSha256: string): Promise<{ buffer: Buffer; objectGeneration?: string } | null> {
    const objectPath = this.buildObjectPath(orgId, hashSha256);
    const { token } = await this.resolveAccessToken();

    const metaUrl = `${this.apiBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(objectPath)}`;
    const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (metaResp.status === 404) {
      const txt = await metaResp.text().catch(() => "");
      if (txt.toLowerCase().includes("bucket")) throw this.mapGcsError(404, txt, `getBinary(${objectPath})`);
      return null;
    }
    if (!metaResp.ok) {
      throw this.mapGcsError(metaResp.status, await metaResp.text().catch(() => ""), `getBinary meta ${objectPath}`);
    }
    const objMeta: any = await metaResp.json();

    const dlUrl = `${metaUrl}?alt=media`;
    const dlResp = await fetch(dlUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (dlResp.status === 404) return null;
    if (!dlResp.ok) {
      throw this.mapGcsError(dlResp.status, await dlResp.text().catch(() => ""), `getBinary media ${objectPath}`);
    }
    const arrayBuf = await dlResp.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuf),
      objectGeneration: objMeta?.generation ? String(objMeta.generation) : undefined
    };
  }

  async putMetadata(orgId: string, hashSha256: string, meta: EvidenceBinaryMetadata): Promise<void> {
    const metaObjectPath = this.buildMetaObjectPath(orgId, hashSha256);
    const { token } = await this.resolveAccessToken();
    const uploadUrl = `${this.uploadBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o?uploadType=media&name=${encodeURIComponent(
      metaObjectPath
    )}`;

    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(meta, null, 2)
    });

    if (!resp.ok) {
      throw this.mapGcsError(resp.status, await resp.text().catch(() => ""), `putMetadata ${metaObjectPath}`);
    }
  }

  async getMetadata(orgId: string, hashSha256: string): Promise<EvidenceBinaryMetadata | null> {
    const metaObjectPath = this.buildMetaObjectPath(orgId, hashSha256);
    const { token } = await this.resolveAccessToken();
    const url = `${this.apiBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(metaObjectPath)}?alt=media`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (resp.status === 404) return null;
    if (!resp.ok) {
      throw this.mapGcsError(resp.status, await resp.text().catch(() => ""), `getMetadata ${metaObjectPath}`);
    }
    try {
      return (await resp.json()) as EvidenceBinaryMetadata;
    } catch {
      return null;
    }
  }

  async checkObjectState(orgId: string, hashSha256: string): Promise<ObjectStateResult> {
    const objectPath = this.buildObjectPath(orgId, hashSha256);
    const metaObjectPath = this.buildMetaObjectPath(orgId, hashSha256);
    const { token } = await this.resolveAccessToken();

    const [binResp, metaResp] = await Promise.all([
      fetch(`${this.apiBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(objectPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${this.apiBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(metaObjectPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    if (binResp.status === 403) {
      throw this.mapGcsError(403, await binResp.text().catch(() => ""), `checkObjectState ${objectPath}`);
    }
    if (binResp.status === 404) {
      const txt = await binResp.text().catch(() => "");
      if (txt.toLowerCase().includes("bucket")) {
        throw this.mapGcsError(404, txt, `checkObjectState ${objectPath}`);
      }
    }

    let objectGeneration: string | undefined;
    if (binResp.ok) {
      const binJson: any = await binResp.json().catch(() => null);
      if (binJson?.generation) objectGeneration = String(binJson.generation);
    }

    return {
      binaryExists: binResp.ok,
      metadataExists: metaResp.ok,
      objectPath,
      objectGeneration
    };
  }

  async appendAuditEvent(entry: EvidenceAuditEntry): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      backend: "gcs",
      bucketName: this.bucketName,
      ...entry
    };

    if (this.localAuditFallbackDir) {
      try {
        if (!fs.existsSync(this.localAuditFallbackDir)) fs.mkdirSync(this.localAuditFallbackDir, { recursive: true });
        fs.appendFileSync(path.join(this.localAuditFallbackDir, "evidence_storage_audit.jsonl"), JSON.stringify(payload) + "\n", "utf8");
      } catch {
        // não bloqueia
      }
    }

    try {
      const { token } = await this.resolveAccessToken();
      const dateDay = payload.timestamp.slice(0, 10);
      const evtName = `_audit/events/${dateDay}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.json`;
      await fetch(
        `${this.uploadBaseUrl}/b/${encodeURIComponent(this.bucketName)}/o?uploadType=media&name=${encodeURIComponent(evtName)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify(payload)
        }
      );
    } catch {
      // falha no audit persistente não derruba resposta de bloqueio 401/403
    }
  }
}
