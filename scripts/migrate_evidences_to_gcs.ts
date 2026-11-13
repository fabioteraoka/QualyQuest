/**
 * QUALYQUEST SGQ — FASE 1.4.7
 * MIGRAÇÃO CONTROLADA E IDEMPOTENTE DE EVIDÊNCIAS LOCAIS PARA GCS / FIREBASE STORAGE
 *
 * Uso:
 *   npx tsx scripts/migrate_evidences_to_gcs.ts --dry-run
 *   npx tsx scripts/migrate_evidences_to_gcs.ts --execute
 *
 * Segurança:
 * - Nunca remove arquivos locais antes ou durante a migração.
 * - Verifica existência e acessibilidade real do bucket antes de tentar qualquer envio.
 * - Valida SHA-256 antes do envio e após download/verificação do objeto no bucket.
 * - Suporta execução repetida (idempotente via ifGenerationMatch=0 e comparação de hash).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GcsStorageBackend, type EvidenceBinaryMetadata } from "../server/evidenceStorageBackend";

export interface LocalEvidenceInventoryItem {
  organizationId: string;
  hashSha256: string;
  binaryPath: string;
  metaPath: string;
  binaryExists: boolean;
  metadataExists: boolean;
  calculatedSha256?: string;
  sizeBytes?: number;
  metadata?: EvidenceBinaryMetadata | null;
  status: "VALID" | "ORPHAN_BINARY" | "BINARY_MISSING" | "HASH_MISMATCH" | "DUPLICATE_HASH";
}

export interface MigrationExecutionReport {
  timestamp: string;
  mode: "dry-run" | "execute";
  bucketName: string;
  bucketReachable: boolean;
  bucketDiagnosticCode: string;
  bucketDiagnosticMessage: string;
  arquivosIdentificados: number;
  arquivosMigrados: number;
  arquivosJaExistentesNoDestino: number;
  arquivosComHashDivergente: number;
  arquivosAusentes: number;
  arquivosOrfaos: number;
  registrosMetadataAtualizados: number;
  errosEPendencias: string[];
  itens: Array<{
    organizationId: string;
    hashSha256: string;
    objectPath: string;
    resultado:
      | "MIGRATED"
      | "ALREADY_EXISTS_IDENTICAL"
      | "DRY_RUN_READY"
      | "SKIPPED_BUCKET_UNAVAILABLE"
      | "CONFLICT_HASH_MISMATCH"
      | "MISSING_BINARY"
      | "ORPHAN_NO_METADATA"
      | "ERROR";
    objectGeneration?: string;
    detail?: string;
  }>;
}

export function inventoryLocalEvidenceStorage(baseDir: string): LocalEvidenceInventoryItem[] {
  const results: LocalEvidenceInventoryItem[] = [];
  if (!fs.existsSync(baseDir)) return results;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const dirEntry of entries) {
    if (!dirEntry.isDirectory() || dirEntry.name === "_audit") continue;
    const orgId = dirEntry.name;
    const orgDir = path.join(baseDir, orgId);
    const files = fs.readdirSync(orgDir);

    const hashes = new Set<string>();
    for (const f of files) {
      if (f.endsWith(".bin")) hashes.add(f.replace(/\.bin$/, ""));
      else if (f.endsWith(".meta.json")) hashes.add(f.replace(/\.meta\.json$/, ""));
    }

    for (const hashSha256 of Array.from(hashes).sort()) {
      const binaryPath = path.join(orgDir, `${hashSha256}.bin`);
      const metaPath = path.join(orgDir, `${hashSha256}.meta.json`);
      const binaryExists = fs.existsSync(binaryPath);
      const metadataExists = fs.existsSync(metaPath);

      let calculatedSha256: string | undefined;
      let sizeBytes: number | undefined;
      let metadata: EvidenceBinaryMetadata | null = null;

      if (binaryExists) {
        const buf = fs.readFileSync(binaryPath);
        calculatedSha256 = crypto.createHash("sha256").update(buf).digest("hex");
        sizeBytes = buf.length;
      }
      if (metadataExists) {
        try {
          metadata = JSON.parse(fs.readFileSync(metaPath, "utf8")) as EvidenceBinaryMetadata;
        } catch {
          metadata = null;
        }
      }

      let status: LocalEvidenceInventoryItem["status"] = "VALID";
      if (!binaryExists && metadataExists) status = "BINARY_MISSING";
      else if (binaryExists && calculatedSha256 !== hashSha256.toLowerCase()) status = "HASH_MISMATCH";
      else if (binaryExists && !metadataExists) status = "ORPHAN_BINARY";

      results.push({
        organizationId: orgId,
        hashSha256,
        binaryPath,
        metaPath,
        binaryExists,
        metadataExists,
        calculatedSha256,
        sizeBytes,
        metadata,
        status
      });
    }
  }

  return results;
}

export async function runEvidenceMigrationToGcs(options: {
  baseDir: string;
  backend: GcsStorageBackend;
  execute: boolean;
  responsavelTecnico?: string;
}): Promise<MigrationExecutionReport> {
  const inventory = inventoryLocalEvidenceStorage(options.baseDir);
  const health = await options.backend.probeHealth();
  const responsavel = options.responsavelTecnico || "Engenharia QualyQuest SGQ";

  const report: MigrationExecutionReport = {
    timestamp: new Date().toISOString(),
    mode: options.execute ? "execute" : "dry-run",
    bucketName: options.backend.bucketName,
    bucketReachable: health.bucketReachable,
    bucketDiagnosticCode: health.diagnosticCode,
    bucketDiagnosticMessage: health.diagnosticMessage,
    arquivosIdentificados: inventory.length,
    arquivosMigrados: 0,
    arquivosJaExistentesNoDestino: 0,
    arquivosComHashDivergente: 0,
    arquivosAusentes: 0,
    arquivosOrfaos: 0,
    registrosMetadataAtualizados: 0,
    errosEPendencias: [],
    itens: []
  };

  if (!health.bucketReachable) {
    report.errosEPendencias.push(
      `Bucket '${options.backend.bucketName}' inacessível (${health.diagnosticCode}): ${health.diagnosticMessage}`
    );
  }

  for (const item of inventory) {
    const objectPath = options.backend.buildObjectPath(item.organizationId, item.hashSha256);

    if (item.status === "BINARY_MISSING") {
      report.arquivosAusentes++;
      report.errosEPendencias.push(`Binário ausente para ${item.organizationId}/${item.hashSha256}`);
      report.itens.push({
        organizationId: item.organizationId,
        hashSha256: item.hashSha256,
        objectPath,
        resultado: "MISSING_BINARY",
        detail: "Metadado local existe, mas arquivo .bin ausente."
      });
      continue;
    }

    if (item.status === "HASH_MISMATCH") {
      report.arquivosComHashDivergente++;
      report.errosEPendencias.push(
        `Hash local divergente em ${item.organizationId}/${item.hashSha256}: calculado=${item.calculatedSha256}`
      );
      report.itens.push({
        organizationId: item.organizationId,
        hashSha256: item.hashSha256,
        objectPath,
        resultado: "CONFLICT_HASH_MISMATCH",
        detail: `SHA-256 calculado (${item.calculatedSha256}) difere do nome do arquivo.`
      });
      continue;
    }

    if (item.status === "ORPHAN_BINARY") {
      report.arquivosOrfaos++;
    }

    if (!health.bucketReachable) {
      report.itens.push({
        organizationId: item.organizationId,
        hashSha256: item.hashSha256,
        objectPath,
        resultado: "SKIPPED_BUCKET_UNAVAILABLE",
        detail: health.diagnosticMessage
      });
      continue;
    }

    if (!options.execute) {
      report.itens.push({
        organizationId: item.organizationId,
        hashSha256: item.hashSha256,
        objectPath,
        resultado: item.status === "ORPHAN_BINARY" ? "ORPHAN_NO_METADATA" : "DRY_RUN_READY",
        detail: `Pronto para migração (${item.sizeBytes} bytes)`
      });
      continue;
    }

    try {
      const localBuffer = fs.readFileSync(item.binaryPath);
      const preUploadHash = crypto.createHash("sha256").update(localBuffer).digest("hex");
      if (preUploadHash !== item.hashSha256.toLowerCase()) {
        report.arquivosComHashDivergente++;
        report.itens.push({
          organizationId: item.organizationId,
          hashSha256: item.hashSha256,
          objectPath,
          resultado: "CONFLICT_HASH_MISMATCH"
        });
        continue;
      }

      const contentType = item.metadata?.mimeType || "application/octet-stream";
      const putRes = await options.backend.putBinaryIfAbsent(item.organizationId, item.hashSha256, localBuffer, contentType);

      // Verificação pós-envio obrigatória: baixa e recalcula SHA-256
      const remoteObj = await options.backend.getBinary(item.organizationId, item.hashSha256);
      if (!remoteObj) {
        throw new Error("Objeto não encontrado no bucket imediatamente após envio.");
      }
      const postUploadHash = crypto.createHash("sha256").update(remoteObj.buffer).digest("hex");
      if (postUploadHash !== preUploadHash) {
        report.arquivosComHashDivergente++;
        throw new Error(`Divergência SHA-256 pós-upload: local=${preUploadHash}, remoto=${postUploadHash}`);
      }

      if (item.metadata) {
        const updatedMeta: EvidenceBinaryMetadata = {
          ...item.metadata,
          objectPath,
          storageBucket: options.backend.bucketName,
          storageBackend: "gcs",
          objectGeneration: putRes.objectGeneration || remoteObj.objectGeneration,
          migradoParaBucketEm: new Date().toISOString(),
          migradoPor: responsavel
        };
        await options.backend.putMetadata(item.organizationId, item.hashSha256, updatedMeta);
        report.registrosMetadataAtualizados++;
      }

      if (putRes.created) {
        report.arquivosMigrados++;
        report.itens.push({
          organizationId: item.organizationId,
          hashSha256: item.hashSha256,
          objectPath,
          resultado: "MIGRATED",
          objectGeneration: putRes.objectGeneration || remoteObj.objectGeneration,
          detail: "Migrado e verificado SHA-256 pós-upload com sucesso."
        });
      } else {
        report.arquivosJaExistentesNoDestino++;
        report.itens.push({
          organizationId: item.organizationId,
          hashSha256: item.hashSha256,
          objectPath,
          resultado: "ALREADY_EXISTS_IDENTICAL",
          objectGeneration: putRes.objectGeneration || remoteObj.objectGeneration,
          detail: "Objeto idêntico já existente no bucket; validado SHA-256."
        });
      }
    } catch (err: any) {
      report.errosEPendencias.push(`${item.organizationId}/${item.hashSha256}: ${err?.message || err}`);
      report.itens.push({
        organizationId: item.organizationId,
        hashSha256: item.hashSha256,
        objectPath,
        resultado: "ERROR",
        detail: err?.message || String(err)
      });
    }
  }

  return report;
}

// Execução direta via CLI
const isCliEntry = process.argv[1] && path.resolve(process.argv[1]).endsWith("migrate_evidences_to_gcs.ts");
if (isCliEntry) {
  const execute = process.argv.includes("--execute");
  const cfgPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const bucketName = (process.env.EVIDENCE_STORAGE_BUCKET || cfg.storageBucket || "").trim();
  const baseDir = path.resolve(process.cwd(), "data", "evidence_storage");

  const backend = new GcsStorageBackend({ bucketName });
  runEvidenceMigrationToGcs({ baseDir, backend, execute })
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      if (!report.bucketReachable || report.errosEPendencias.length > 0) {
        process.exitCode = 2;
      }
    })
    .catch((err) => {
      console.error("Erro fatal na migração:", err);
      process.exit(1);
    });
}
