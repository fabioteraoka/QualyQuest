import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface VerifiedEvidenceUser {
  uid: string;
  email: string;
  role: string;
  organizationId: string;
  displayName: string;
  isSuperAdmin: boolean;
}

export interface EvidenceStorageRouterDeps {
  baseDir: string;
  verifyUser: (authHeader?: string) => Promise<VerifiedEvidenceUser>;
}

const ORG_ID_SAFE_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;
const SHA256_SAFE_REGEX = /^[a-f0-9]{64}$/i;

export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain"
]);

export const ALLOWED_EVIDENCE_EXTENSIONS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".xlsx", ".xls", ".docx", ".doc", ".txt"
]);

export function isSameOrganization(userOrgId: string, requestedOrgId: string): boolean {
  if (!userOrgId || !requestedOrgId) return false;
  if (userOrgId === requestedOrgId) return true;
  const legacyPair = new Set(["org_impacto_aviation", "org-impacto-aviation"]);
  return legacyPair.has(userOrgId) && legacyPair.has(requestedOrgId);
}

export function assertSafeOrgId(rawOrgId: unknown): string {
  if (typeof rawOrgId !== "string" || !ORG_ID_SAFE_REGEX.test(rawOrgId.trim())) {
    throw Object.assign(new Error("Identificador de organização inválido ou inseguro."), { status: 400, code: "INVALID_ORGANIZATION_ID" });
  }
  return rawOrgId.trim();
}

export function assertSafeSha256(rawHash: unknown): string {
  if (typeof rawHash !== "string" || !SHA256_SAFE_REGEX.test(rawHash.trim())) {
    throw Object.assign(new Error("Hash SHA-256 inválido ou malformado."), { status: 400, code: "INVALID_HASH_FORMAT" });
  }
  return rawHash.trim().toLowerCase();
}

export function resolveSafeEvidencePaths(baseDir: string, orgId: string, hashSha256: string) {
  const safeBase = path.resolve(baseDir);
  const safeOrg = assertSafeOrgId(orgId);
  const safeHash = assertSafeSha256(hashSha256);
  const orgDir = path.resolve(safeBase, safeOrg);
  if (!orgDir.startsWith(safeBase + path.sep)) {
    throw Object.assign(new Error("Tentativa de path traversal bloqueada."), { status: 400, code: "PATH_TRAVERSAL_BLOCKED" });
  }
  const binaryPath = path.resolve(orgDir, `${safeHash}.bin`);
  const metaPath = path.resolve(orgDir, `${safeHash}.meta.json`);
  if (!binaryPath.startsWith(orgDir + path.sep) || !metaPath.startsWith(orgDir + path.sep)) {
    throw Object.assign(new Error("Caminho de arquivo fora do escopo da organização."), { status: 400, code: "PATH_TRAVERSAL_BLOCKED" });
  }
  return { safeOrg, safeHash, orgDir, binaryPath, metaPath };
}

export function sanitizeEvidenceFileName(rawName: string): string {
  const base = path.basename(String(rawName || "")).replace(/[\x00-\x1f\r\n"\\\/]/g, "_").trim();
  if (!base || base === "." || base === "..") {
    throw Object.assign(new Error("Nome de arquivo inválido."), { status: 400, code: "INVALID_FILENAME" });
  }
  return base.slice(0, 180);
}

export function detectDangerousPayload(buffer: Buffer): string | null {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return "Executável Windows/PE (MZ) bloqueado por política de segurança.";
  }
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return "Executável ELF Linux bloqueado por política de segurança.";
  }
  if (buffer.length >= 4 && ((buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa))) {
    return "Binário Mach-O bloqueado por política de segurança.";
  }
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return "Script executável (#!) bloqueado por política de segurança.";
  }
  const headText = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (headText.startsWith("<script") || headText.startsWith("<!doctype html") || headText.startsWith("<html") || headText.startsWith("<svg")) {
    return "Conteúdo HTML/SVG potencialmente executável bloqueado por política de segurança.";
  }
  return null;
}

export function validateMagicBytesAndResolveMime(buffer: Buffer, fileName: string, declaredMime?: string): string {
  if (buffer.length === 0) {
    throw Object.assign(new Error("Arquivo vazio não é permitido."), { status: 400, code: "EMPTY_FILE" });
  }
  const dangerousReason = detectDangerousPayload(buffer);
  if (dangerousReason) {
    throw Object.assign(new Error(dangerousReason), { status: 400, code: "DANGEROUS_BINARY_SIGNATURE" });
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EVIDENCE_EXTENSIONS.has(ext)) {
    throw Object.assign(new Error(`Extensão de arquivo não permitida: ${ext || "(sem extensão)"}`), { status: 400, code: "DISALLOWED_EXTENSION" });
  }

  const startsWithAscii = (txt: string) => buffer.subarray(0, txt.length).toString("ascii") === txt;
  const startsWithBytes = (bytes: number[]) => bytes.every((b, idx) => buffer[idx] === b);

  const isPdf = startsWithAscii("%PDF-");
  const isPng = startsWithBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpeg = startsWithBytes([0xff, 0xd8, 0xff]);
  const isGif = startsWithAscii("GIF87a") || startsWithAscii("GIF89a");
  const isWebp = buffer.length >= 12 && startsWithAscii("RIFF") && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  const isZipOffice = startsWithBytes([0x50, 0x4b, 0x03, 0x04]);
  const isOle2Office = startsWithBytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  if (ext === ".pdf") {
    if (!isPdf) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um PDF legítimo (%PDF-)."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "application/pdf";
  }
  if (ext === ".png") {
    if (!isPng) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um PNG legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "image/png";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    if (!isJpeg) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um JPEG legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "image/jpeg";
  }
  if (ext === ".gif") {
    if (!isGif) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um GIF legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "image/gif";
  }
  if (ext === ".webp") {
    if (!isWebp) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um WEBP legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "image/webp";
  }
  if (ext === ".docx") {
    if (!isZipOffice) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um DOCX legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === ".xlsx") {
    if (!isZipOffice) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um XLSX legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (ext === ".doc") {
    if (!isOle2Office) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um DOC legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "application/msword";
  }
  if (ext === ".xls") {
    if (!isOle2Office) throw Object.assign(new Error("Assinatura binária inválida: o arquivo não corresponde a um XLS legítimo."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    return "application/vnd.ms-excel";
  }
  if (ext === ".txt") {
    if (buffer.includes(0x00)) {
      throw Object.assign(new Error("Arquivo texto contém bytes nulos binários inválidos."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
    }
    return "text/plain";
  }

  if (declaredMime && !ALLOWED_EVIDENCE_MIME_TYPES.has(declaredMime)) {
    throw Object.assign(new Error(`Tipo MIME não permitido: ${declaredMime}`), { status: 400, code: "DISALLOWED_MIME" });
  }
  throw Object.assign(new Error("Formato de arquivo não validado."), { status: 400, code: "INVALID_FILE_SIGNATURE" });
}

export function sniffSafeMimeFromBinary(buffer: Buffer): string {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "application/octet-stream";
}

export function canModifyEvidenceStorage(role: string): boolean {
  const upper = (role || "CONSULTA").toUpperCase();
  return upper !== "CONSULTA" && upper !== "VIEWER";
}

export function createEvidenceStorageRouter(deps: EvidenceStorageRouterDeps): express.Router {
  const router = express.Router();
  const baseDir = path.resolve(deps.baseDir);
  const auditDir = path.join(baseDir, "_audit");

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const recordAudit = (entry: {
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
  }) => {
    try {
      const logLine = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...entry
      });
      fs.appendFileSync(path.join(auditDir, "evidence_storage_audit.jsonl"), logLine + "\n", "utf8");
    } catch (err) {
      console.warn("Aviso ao gravar audit log de evidências:", err);
    }
  };

  router.post("/upload", async (req, res) => {
    let verifiedUser: VerifiedEvidenceUser | null = null;
    const requestedOrgRaw = req.body?.organizationId;
    try {
      verifiedUser = await deps.verifyUser(req.headers.authorization);
      const { fileName, mimeType, base64Data, requisitoId } = req.body || {};

      const orgId = requestedOrgRaw ? assertSafeOrgId(requestedOrgRaw) : assertSafeOrgId(verifiedUser.organizationId);
      if (!verifiedUser.isSuperAdmin && !isSameOrganization(verifiedUser.organizationId, orgId)) {
        recordAudit({
          action: "UPLOAD",
          outcome: "DENY",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: orgId,
          fileName: String(fileName || ""),
          detail: "Cross-organization upload blocked",
          ip: req.ip
        });
        return res.status(403).json({ error: "Acesso negado: tentativa de envio de evidência para outra organização.", code: "CROSS_ORGANIZATION_ACCESS_DENIED" });
      }

      if (!canModifyEvidenceStorage(verifiedUser.role)) {
        recordAudit({
          action: "UPLOAD",
          outcome: "DENY",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: orgId,
          fileName: String(fileName || ""),
          detail: "Read-only role attempted upload",
          ip: req.ip
        });
        return res.status(403).json({ error: `Perfil [${verifiedUser.role}] não possui permissão para enviar arquivos de evidência.`, code: "ROLE_READONLY_DENIED" });
      }

      if (!fileName || !base64Data) {
        return res.status(400).json({ error: "fileName e base64Data são obrigatórios.", code: "MISSING_REQUIRED_FIELDS" });
      }

      const safeFileName = sanitizeEvidenceFileName(fileName);
      const cleanBase64 = String(base64Data).includes("base64,") ? String(base64Data).split("base64,")[1] : String(base64Data);
      const buffer = Buffer.from(cleanBase64, "base64");

      const MAX_SIZE = 25 * 1024 * 1024;
      if (buffer.length > MAX_SIZE) {
        return res.status(400).json({ error: `Arquivo excede o limite máximo permitido de 25 MB (Tamanho: ${(buffer.length / (1024 * 1024)).toFixed(1)} MB).`, code: "FILE_TOO_LARGE" });
      }

      const validatedMime = validateMagicBytesAndResolveMime(buffer, safeFileName, mimeType);
      const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      const fileId = `FILE-${hashSha256.substring(0, 16).toUpperCase()}`;

      const { orgDir, binaryPath, metaPath } = resolveSafeEvidencePaths(baseDir, orgId, hashSha256);
      if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
      }

      if (!fs.existsSync(binaryPath)) {
        fs.writeFileSync(binaryPath, buffer);
      }

      const metaData = {
        fileId,
        organizationId: orgId,
        requisitoId: typeof requisitoId === "string" ? requisitoId.slice(0, 128) : undefined,
        storagePath: `/api/evidence-storage/files/${orgId}/${hashSha256}`,
        arquivoNome: safeFileName,
        mimeType: validatedMime,
        tamanhoBytes: buffer.length,
        hashSha256,
        dataUpload: new Date().toISOString(),
        enviadoPorNome: verifiedUser.displayName,
        enviadoPorUid: verifiedUser.uid,
        versao: 1
      };

      fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), "utf8");

      recordAudit({
        action: "UPLOAD",
        outcome: "ALLOW",
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        role: verifiedUser.role,
        userOrganizationId: verifiedUser.organizationId,
        requestedOrganizationId: orgId,
        hashSha256,
        fileName: safeFileName,
        detail: `Stored ${buffer.length} bytes (${validatedMime})`,
        ip: req.ip
      });

      return res.json({ success: true, arquivoRef: metaData });
    } catch (err: any) {
      const status = err?.status || 500;
      recordAudit({
        action: "UPLOAD",
        outcome: status === 401 || status === 403 || status === 400 ? "DENY" : "ERROR",
        uid: verifiedUser?.uid,
        email: verifiedUser?.email,
        role: verifiedUser?.role,
        userOrganizationId: verifiedUser?.organizationId,
        requestedOrganizationId: typeof requestedOrgRaw === "string" ? requestedOrgRaw : undefined,
        detail: `${err?.code || "ERR"}: ${err?.message || "Erro no upload"}`,
        ip: req.ip
      });
      return res.status(status).json({ error: err?.message || "Erro interno no upload de evidência.", code: err?.code || "UPLOAD_ERROR" });
    }
  });

  router.get("/files/:organizationId/:hashSha256", async (req, res) => {
    let verifiedUser: VerifiedEvidenceUser | null = null;
    const { organizationId, hashSha256 } = req.params;
    try {
      verifiedUser = await deps.verifyUser(req.headers.authorization);
      const { safeOrg, safeHash, binaryPath, metaPath } = resolveSafeEvidencePaths(baseDir, organizationId, hashSha256);

      if (!verifiedUser.isSuperAdmin && !isSameOrganization(verifiedUser.organizationId, safeOrg)) {
        recordAudit({
          action: "DOWNLOAD",
          outcome: "DENY",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: safeOrg,
          hashSha256: safeHash,
          detail: "Cross-organization file access blocked",
          ip: req.ip
        });
        return res.status(403).json({ error: "Acesso negado: arquivo pertence a outra organização.", code: "CROSS_ORGANIZATION_ACCESS_DENIED" });
      }

      const binaryExists = fs.existsSync(binaryPath);
      const metadataExists = fs.existsSync(metaPath);

      if (!binaryExists && metadataExists) {
        recordAudit({
          action: "DOWNLOAD",
          outcome: "ERROR",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: safeOrg,
          hashSha256: safeHash,
          detail: "Metadata exists but binary file is missing",
          ip: req.ip
        });
        return res.status(404).json({
          exists: false,
          metadataExists: true,
          integro: false,
          code: "BINARY_MISSING",
          error: "Metadados existem, porém o arquivo binário está ausente no armazenamento local."
        });
      }

      if (!binaryExists) {
        return res.status(404).json({
          exists: false,
          metadataExists: false,
          integro: false,
          code: "FILE_NOT_FOUND",
          error: "Arquivo não encontrado no armazenamento de objetos."
        });
      }

      const buffer = fs.readFileSync(binaryPath);
      const calculatedHash = crypto.createHash("sha256").update(buffer).digest("hex");
      if (calculatedHash !== safeHash) {
        recordAudit({
          action: "DOWNLOAD",
          outcome: "ERROR",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: safeOrg,
          hashSha256: safeHash,
          detail: `Integrity mismatch on read: expected=${safeHash}, got=${calculatedHash}`,
          ip: req.ip
        });
        return res.status(409).json({
          exists: true,
          integro: false,
          code: "INTEGRITY_MISMATCH",
          error: "Falha de integridade SHA-256: arquivo binário divergente do hash registrado."
        });
      }

      let mimeType = sniffSafeMimeFromBinary(buffer);
      let fileName = `${safeHash}.bin`;

      if (metadataExists) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
          if (meta.mimeType && ALLOWED_EVIDENCE_MIME_TYPES.has(meta.mimeType)) {
            mimeType = meta.mimeType;
          }
          if (meta.arquivoNome) {
            fileName = sanitizeEvidenceFileName(meta.arquivoNome);
          }
        } catch {
          // fallback para sniffing seguro
        }
      } else {
        res.setHeader("X-Evidence-Metadata-Missing", "true");
      }

      recordAudit({
        action: "DOWNLOAD",
        outcome: "ALLOW",
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        role: verifiedUser.role,
        userOrganizationId: verifiedUser.organizationId,
        requestedOrganizationId: safeOrg,
        hashSha256: safeHash,
        fileName,
        detail: metadataExists ? "Served verified binary" : "Served orphan binary without metadata",
        ip: req.ip
      });

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(buffer);
    } catch (err: any) {
      const status = err?.status || 500;
      recordAudit({
        action: "DOWNLOAD",
        outcome: status === 401 || status === 403 || status === 400 ? "DENY" : "ERROR",
        uid: verifiedUser?.uid,
        email: verifiedUser?.email,
        role: verifiedUser?.role,
        userOrganizationId: verifiedUser?.organizationId,
        requestedOrganizationId: organizationId,
        hashSha256,
        detail: `${err?.code || "ERR"}: ${err?.message || "Erro ao recuperar arquivo"}`,
        ip: req.ip
      });
      return res.status(status).json({ error: err?.message || "Erro interno ao recuperar evidência.", code: err?.code || "DOWNLOAD_ERROR" });
    }
  });

  router.post("/migrate-base64", async (req, res) => {
    let verifiedUser: VerifiedEvidenceUser | null = null;
    const requestedOrgRaw = req.body?.organizationId;
    try {
      verifiedUser = await deps.verifyUser(req.headers.authorization);
      const { base64Data, fileName, tipo } = req.body || {};

      const orgId = requestedOrgRaw ? assertSafeOrgId(requestedOrgRaw) : assertSafeOrgId(verifiedUser.organizationId);
      if (!verifiedUser.isSuperAdmin && !isSameOrganization(verifiedUser.organizationId, orgId)) {
        recordAudit({
          action: "MIGRATE_BASE64",
          outcome: "DENY",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: orgId,
          detail: "Cross-organization migration blocked",
          ip: req.ip
        });
        return res.status(403).json({ error: "Acesso negado: migração bloqueada para outra organização.", code: "CROSS_ORGANIZATION_ACCESS_DENIED" });
      }

      if (!canModifyEvidenceStorage(verifiedUser.role)) {
        recordAudit({
          action: "MIGRATE_BASE64",
          outcome: "DENY",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: orgId,
          detail: "Read-only role attempted base64 migration",
          ip: req.ip
        });
        return res.status(403).json({ error: `Perfil [${verifiedUser.role}] não possui permissão para migrar evidências.`, code: "ROLE_READONLY_DENIED" });
      }

      if (!base64Data) {
        return res.status(400).json({ error: "base64Data é obrigatório para migração.", code: "MISSING_BASE64" });
      }

      const safeFileName = sanitizeEvidenceFileName(fileName || `Evidencia_${tipo || "Anexo"}.pdf`);
      const cleanBase64 = String(base64Data).includes("base64,") ? String(base64Data).split("base64,")[1] : String(base64Data);
      const buffer = Buffer.from(cleanBase64, "base64");

      if (buffer.length > 25 * 1024 * 1024) {
        return res.status(400).json({ error: "Arquivo legado excede o limite de 25 MB.", code: "FILE_TOO_LARGE" });
      }

      const resolvedMime = validateMagicBytesAndResolveMime(buffer, safeFileName);
      const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      const fileId = `FILE-MIG-${hashSha256.substring(0, 14).toUpperCase()}`;

      const { orgDir, binaryPath, metaPath } = resolveSafeEvidencePaths(baseDir, orgId, hashSha256);
      if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
      }

      if (!fs.existsSync(binaryPath)) {
        fs.writeFileSync(binaryPath, buffer);
      }

      const metaData = {
        fileId,
        organizationId: orgId,
        storagePath: `/api/evidence-storage/files/${orgId}/${hashSha256}`,
        arquivoNome: safeFileName,
        mimeType: resolvedMime,
        tamanhoBytes: buffer.length,
        hashSha256,
        dataUpload: new Date().toISOString(),
        enviadoPorNome: verifiedUser.displayName,
        enviadoPorUid: verifiedUser.uid,
        versao: 1,
        migradoDeBase64: true
      };

      fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), "utf8");

      recordAudit({
        action: "MIGRATE_BASE64",
        outcome: "ALLOW",
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        role: verifiedUser.role,
        userOrganizationId: verifiedUser.organizationId,
        requestedOrganizationId: orgId,
        hashSha256,
        fileName: safeFileName,
        detail: `Migrated ${buffer.length} bytes (${resolvedMime})`,
        ip: req.ip
      });

      return res.json({ success: true, arquivoRef: metaData });
    } catch (err: any) {
      const status = err?.status || 500;
      recordAudit({
        action: "MIGRATE_BASE64",
        outcome: status === 401 || status === 403 || status === 400 ? "DENY" : "ERROR",
        uid: verifiedUser?.uid,
        email: verifiedUser?.email,
        role: verifiedUser?.role,
        userOrganizationId: verifiedUser?.organizationId,
        requestedOrganizationId: typeof requestedOrgRaw === "string" ? requestedOrgRaw : undefined,
        detail: `${err?.code || "ERR"}: ${err?.message || "Erro na migração"}`,
        ip: req.ip
      });
      return res.status(status).json({ error: err?.message || "Erro na migração de base64.", code: err?.code || "MIGRATE_ERROR" });
    }
  });

  router.get("/verify-integrity/:organizationId/:hashSha256", async (req, res) => {
    let verifiedUser: VerifiedEvidenceUser | null = null;
    const { organizationId, hashSha256 } = req.params;
    try {
      verifiedUser = await deps.verifyUser(req.headers.authorization);
      const { safeOrg, safeHash, binaryPath, metaPath } = resolveSafeEvidencePaths(baseDir, organizationId, hashSha256);

      if (!verifiedUser.isSuperAdmin && !isSameOrganization(verifiedUser.organizationId, safeOrg)) {
        recordAudit({
          action: "VERIFY_INTEGRITY",
          outcome: "DENY",
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          role: verifiedUser.role,
          userOrganizationId: verifiedUser.organizationId,
          requestedOrganizationId: safeOrg,
          hashSha256: safeHash,
          detail: "Cross-organization integrity verify blocked",
          ip: req.ip
        });
        return res.status(403).json({ error: "Acesso negado: verificação bloqueada para outra organização.", code: "CROSS_ORGANIZATION_ACCESS_DENIED" });
      }

      const binaryExists = fs.existsSync(binaryPath);
      const metadataExists = fs.existsSync(metaPath);

      if (!binaryExists && metadataExists) {
        return res.status(404).json({
          exists: false,
          metadataExists: true,
          integro: false,
          code: "BINARY_MISSING",
          error: "Metadados existem, porém o binário está ausente no storage."
        });
      }

      if (!binaryExists) {
        return res.status(404).json({
          exists: false,
          metadataExists: false,
          integro: false,
          code: "FILE_NOT_FOUND",
          error: "Arquivo inexistente no storage."
        });
      }

      const buffer = fs.readFileSync(binaryPath);
      const calculatedHash = crypto.createHash("sha256").update(buffer).digest("hex");
      const integro = calculatedHash.toLowerCase() === safeHash.toLowerCase();

      recordAudit({
        action: "VERIFY_INTEGRITY",
        outcome: "ALLOW",
        uid: verifiedUser.uid,
        email: verifiedUser.email,
        role: verifiedUser.role,
        userOrganizationId: verifiedUser.organizationId,
        requestedOrganizationId: safeOrg,
        hashSha256: safeHash,
        detail: `integro=${integro}, metadataExists=${metadataExists}`,
        ip: req.ip
      });

      return res.json({
        exists: true,
        metadataExists,
        integro,
        code: !metadataExists ? "ORPHAN_BINARY" : integro ? "OK" : "INTEGRITY_MISMATCH",
        tamanhoBytes: buffer.length,
        hashOriginal: safeHash,
        hashCalculado: calculatedHash
      });
    } catch (err: any) {
      const status = err?.status || 500;
      recordAudit({
        action: "VERIFY_INTEGRITY",
        outcome: status === 401 || status === 403 || status === 400 ? "DENY" : "ERROR",
        uid: verifiedUser?.uid,
        email: verifiedUser?.email,
        role: verifiedUser?.role,
        userOrganizationId: verifiedUser?.organizationId,
        requestedOrganizationId: organizationId,
        hashSha256,
        detail: `${err?.code || "ERR"}: ${err?.message || "Erro na verificação"}`,
        ip: req.ip
      });
      return res.status(status).json({ error: err?.message || "Erro ao verificar integridade.", code: err?.code || "VERIFY_ERROR" });
    }
  });

  return router;
}
