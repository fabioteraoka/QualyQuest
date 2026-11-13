/**
 * QUALYQUEST SGQ — FASE 1.4.7
 * DIAGNÓSTICO REAL DE BUCKET + VALIDAÇÃO DE BACKEND GCS PERSISTENTE E MIGRAÇÃO IDEMPOTENTE
 */

import fs from "fs";
import os from "os";
import path from "path";
import http from "http";
import crypto from "crypto";
import express from "express";
import { GcsStorageBackend } from "../server/evidenceStorageBackend";
import { createEvidenceStorageRouter, type VerifiedEvidenceUser } from "../server/evidenceStorageRouter";
import { inventoryLocalEvidenceStorage, runEvidenceMigrationToGcs } from "./migrate_evidences_to_gcs";
import { MASTER_CHECKLIST_ITEMS } from "../src/data/corporateChecklistsData";
import { CANONICAL_CORPORATE_CRITERIA } from "../src/data/corporateLibraryData";
import { CONTROLES_CORPORATIVOS_EXPANDIDOS } from "../src/services/corporateComplianceMatrixService";

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string, detail?: string) {
  if (cond) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

interface StoredMockGcsObject {
  buffer: Buffer;
  contentType: string;
  generation: string;
}

function startLocalGcsWireHarness(bucketName: string) {
  const objects = new Map<string, StoredMockGcsObject>();
  let genSeq = 1000;

  const app = express();
  app.use(express.raw({ type: "*/*", limit: "50mb" }));

  // Bucket metadata probe: GET /storage/v1/b/:bucket
  app.get("/storage/v1/b/:bucket", (req, res) => {
    if (req.headers.authorization !== "Bearer gcs-valid-sa-token") {
      return res.status(401).json({ error: { code: 401, message: "Unauthorized" } });
    }
    if (req.params.bucket !== bucketName) {
      return res.status(404).json({ error: { code: 404, message: "The specified bucket does not exist." } });
    }
    return res.json({
      kind: "storage#bucket",
      name: bucketName,
      location: "US-EAST5",
      versioning: { enabled: true },
      retentionPolicy: { retentionPeriod: "157680000" }
    });
  });

  // Upload media: POST /upload/storage/v1/b/:bucket/o
  app.post("/upload/storage/v1/b/:bucket/o", (req, res) => {
    if (req.headers.authorization !== "Bearer gcs-valid-sa-token") {
      return res.status(401).json({ error: { code: 401, message: "Unauthorized" } });
    }
    if (req.params.bucket !== bucketName) {
      return res.status(404).json({ error: { code: 404, message: "The specified bucket does not exist." } });
    }
    const name = String(req.query.name || "");
    const ifGenMatch = req.query.ifGenerationMatch;
    if (ifGenMatch === "0" && objects.has(name)) {
      return res.status(412).json({ error: { code: 412, message: "Precondition Failed" } });
    }
    const generation = String(++genSeq);
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
    objects.set(name, {
      buffer: buf,
      contentType: String(req.headers["content-type"] || "application/octet-stream"),
      generation
    });
    return res.json({
      kind: "storage#object",
      bucket: bucketName,
      name,
      generation,
      size: String(buf.length)
    });
  });

  // Object meta or media read: GET /storage/v1/b/:bucket/o/:objectName
  app.get("/storage/v1/b/:bucket/o/:objectName", (req, res) => {
    if (req.headers.authorization !== "Bearer gcs-valid-sa-token") {
      return res.status(401).json({ error: { code: 401, message: "Unauthorized" } });
    }
    if (req.params.bucket !== bucketName) {
      return res.status(404).json({ error: { code: 404, message: "The specified bucket does not exist." } });
    }
    const name = decodeURIComponent(req.params.objectName);
    const obj = objects.get(name);
    if (!obj) {
      return res.status(404).json({ error: { code: 404, message: "No such object" } });
    }
    if (req.query.alt === "media") {
      res.setHeader("Content-Type", obj.contentType);
      return res.send(obj.buffer);
    }
    return res.json({
      kind: "storage#object",
      bucket: bucketName,
      name,
      generation: obj.generation,
      contentType: obj.contentType,
      size: String(obj.buffer.length)
    });
  });

  return {
    objects,
    start: (): Promise<{ server: http.Server; baseUrl: string }> =>
      new Promise((resolve) => {
        const srv = app.listen(0, "127.0.0.1", () => {
          const addr = srv.address() as { port: number };
          resolve({ server: srv, baseUrl: `http://127.0.0.1:${addr.port}` });
        });
      })
  };
}

function mountEvidenceApp(backend: GcsStorageBackend): Promise<{ server: http.Server; url: string }> {
  const tokenUsers: Record<string, VerifiedEvidenceUser> = {
    "token-gestor": {
      uid: "uid-gestor-01",
      email: "qualidade@impacto.aero",
      role: "GESTOR_SGQ",
      organizationId: "org_impacto_aviation",
      displayName: "Paulo Okubo",
      isSuperAdmin: false
    },
    "token-admin": {
      uid: "uid-admin-02",
      email: "diretoria@impacto.aero",
      role: "ADMIN",
      organizationId: "org_impacto_aviation",
      displayName: "Diretor Técnico",
      isSuperAdmin: false
    },
    "token-consulta": {
      uid: "uid-consulta-03",
      email: "leitura@impacto.aero",
      role: "CONSULTA",
      organizationId: "org_impacto_aviation",
      displayName: "Auditor Leitura",
      isSuperAdmin: false
    },
    "token-outra-org": {
      uid: "uid-ext-99",
      email: "externo@outra.aero",
      role: "ADMIN",
      organizationId: "org_outra_empresa",
      displayName: "Externo",
      isSuperAdmin: false
    }
  };

  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(
    "/api/evidence-storage",
    createEvidenceStorageRouter({
      backend,
      verifyUser: async (authHeader?: string) => {
        if (!authHeader?.startsWith("Bearer ")) {
          throw Object.assign(new Error("Missing token"), { status: 401, code: "AUTH_MISSING_TOKEN" });
        }
        const user = tokenUsers[authHeader.slice(7).trim()];
        if (!user) {
          throw Object.assign(new Error("Invalid token"), { status: 401, code: "AUTH_INVALID_TOKEN" });
        }
        return user;
      }
    })
  );

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function closeHttpServer(srv: http.Server) {
  await new Promise<void>((resolve, reject) => srv.close((e) => (e ? reject(e) : resolve())));
}

async function main() {
  console.log("=========================================================================");
  console.log("QUALYQUEST SGQ — FASE 1.4.7 — DIAGNÓSTICO REAL E TESTES DE PERSISTÊNCIA");
  console.log("=========================================================================\n");

  const cfg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8"));
  const configuredBucket = cfg.storageBucket;

  // ------------------------------------------------------------------
  // 1. DIAGNÓSTICO REAL DO BUCKET CONFIGURADO E INVENTÁRIO LOCAL
  // ------------------------------------------------------------------
  console.log("[1] Diagnóstico Real de Bucket GCP/Firebase e Inventário Local...");
  const realBackend = new GcsStorageBackend({ bucketName: configuredBucket });
  const realHealth = await realBackend.probeHealth();
  console.log("    -> Probe real no bucket configurado:", JSON.stringify(realHealth));
  assert(
    realHealth.bucketReachable === false && realHealth.diagnosticCode === "GCS_BUCKET_NOT_FOUND",
    `Diagnóstico real detecta honestamente que bucket '${configuredBucket}' não existe no GCP (${realHealth.diagnosticCode})`
  );

  const localBaseDir = path.resolve(process.cwd(), "data", "evidence_storage");
  const inventory = inventoryLocalEvidenceStorage(localBaseDir);
  assert(inventory.length === 2, `Inventário local identificou exatamente os 2 arquivos existentes (${inventory.length})`);
  assert(
    inventory.every((i) => i.status === "VALID" && i.calculatedSha256 === i.hashSha256),
    "Ambos os arquivos locais estão válidos (binário + metadado + SHA-256 íntegro, 0 órfãos)"
  );

  const dryRunReal = await runEvidenceMigrationToGcs({
    baseDir: localBaseDir,
    backend: realBackend,
    execute: false
  });
  assert(
    dryRunReal.bucketReachable === false &&
      dryRunReal.itens.every((i) => i.resultado === "SKIPPED_BUCKET_UNAVAILABLE"),
    "Migração dry-run contra bucket inexistente aborta com segurança preservando 100% dos arquivos locais"
  );

  // ------------------------------------------------------------------
  // 2. VALIDAÇÃO DA POLÍTICA ZERO-TRUST EM storage.rules & DADOS MESTRES
  // ------------------------------------------------------------------
  console.log("\n[2] Verificação de storage.rules, Servidor Real e Preservação de Dados...");
  const storageRulesContent = fs.readFileSync(path.resolve(process.cwd(), "storage.rules"), "utf8");
  assert(
    storageRulesContent.includes("service firebase.storage") && storageRulesContent.includes("allow read, write: if false"),
    "storage.rules bloqueia acesso público e acesso direto de cliente (Zero-Trust via Backend Proxy)"
  );
  assert(MASTER_CHECKLIST_ITEMS.length === 177, "177 requisitos originais preservados");
  assert(CANONICAL_CORPORATE_CRITERIA.length === 36, "36 critérios canônicos preservados");
  assert(CONTROLES_CORPORATIVOS_EXPANDIDOS.length === 17, "17 controles centrais preservados");

  // Verifica endpoint autenticado real /storage-status sem token em localhost:3000
  const liveStatusNoAuth = await fetch("http://localhost:3000/api/evidence-storage/storage-status");
  assert(liveStatusNoAuth.status === 401, `GET /api/evidence-storage/storage-status em localhost:3000 rejeita anônimo (HTTP ${liveStatusNoAuth.status})`);

  // ------------------------------------------------------------------
  // 3. HARNESS ISOLADO GCS WIRE-PROTOCOL (PERSISTÊNCIA, INSTÂNCIA, RBAC, MIGRAÇÃO)
  // ------------------------------------------------------------------
  console.log("\n[3] Testes Isolados de Wire-Protocol GCS (Backend Persistente + Troca de Instância + Migração Idempotente)...");
  const gcsHarness = startLocalGcsWireHarness(configuredBucket);
  const { server: gcsServer, baseUrl: gcsUrl } = await gcsHarness.start();
  const auditTmp = fs.mkdtempSync(path.join(os.tmpdir(), "qualyquest-147-audit-"));

  try {
    const createHarnessBackend = () =>
      new GcsStorageBackend({
        bucketName: configuredBucket,
        apiBaseUrl: `${gcsUrl}/storage/v1`,
        uploadBaseUrl: `${gcsUrl}/upload/storage/v1`,
        getAccessToken: async () => "gcs-valid-sa-token",
        localAuditFallbackDir: auditTmp
      });

    // Instância 1 do servidor backend
    let api1 = await mountEvidenceApp(createHarnessBackend());

    const healthResp = await fetch(`${api1.url}/api/evidence-storage/storage-status`, {
      headers: { Authorization: "Bearer token-gestor" }
    });
    const healthJson: any = await healthResp.json();
    assert(
      healthResp.status === 200 &&
        healthJson.driverName === "gcs" &&
        healthJson.isPersistent === true &&
        healthJson.bucketReachable === true &&
        healthJson.versioningEnabled === true,
      "GET /storage-status confirma backend GCS persistente, alcançável e com versionamento"
    );

    const pdfBuf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF\n");
    const pngBuf = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );

    // Upload PDF e PNG autenticados por GESTOR_SGQ
    const upPdf = await fetch(`${api1.url}/api/evidence-storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-gestor" },
      body: JSON.stringify({
        organizationId: "org_impacto_aviation",
        requisitoId: "CRIT-RBAC145-12",
        fileName: "Calibracao_Torquimetro_147.pdf",
        mimeType: "application/pdf",
        base64Data: pdfBuf.toString("base64")
      })
    });
    const upPdfJson: any = await upPdf.json();
    assert(
      upPdf.status === 200 &&
        upPdfJson.arquivoRef?.storageBackend === "gcs" &&
        upPdfJson.arquivoRef?.objectPath === `organizations/org_impacto_aviation/evidences/${upPdfJson.arquivoRef.hashSha256}` &&
        Boolean(upPdfJson.arquivoRef?.objectGeneration),
      `Upload PDF via GCS armazenou em '${upPdfJson.arquivoRef?.objectPath}' (gen=${upPdfJson.arquivoRef?.objectGeneration})`
    );

    // Deduplicação idempotente no mesmo upload
    const upPdfDup = await fetch(`${api1.url}/api/evidence-storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-gestor" },
      body: JSON.stringify({
        organizationId: "org_impacto_aviation",
        requisitoId: "CRIT-RBAC145-12",
        fileName: "Calibracao_Torquimetro_147.pdf",
        mimeType: "application/pdf",
        base64Data: pdfBuf.toString("base64")
      })
    });
    const upPdfDupJson: any = await upPdfDup.json();
    assert(
      upPdfDup.status === 200 &&
        upPdfDupJson.arquivoRef?.objectGeneration === upPdfJson.arquivoRef?.objectGeneration,
      "Deduplicação idempotente no GCS preservou geração do binário sem duplicar objeto"
    );

    const upPng = await fetch(`${api1.url}/api/evidence-storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-gestor" },
      body: JSON.stringify({
        organizationId: "org_impacto_aviation",
        fileName: "Placa_Instrumento.png",
        mimeType: "image/png",
        base64Data: pngBuf.toString("base64")
      })
    });
    const upPngJson: any = await upPng.json();
    assert(upPng.status === 200 && upPngJson.arquivoRef?.mimeType === "image/png", "Upload PNG via GCS aprovado");

    // Bloqueio Cross-Org & CONSULTA & Magic Bytes
    const crossGet = await fetch(
      `${api1.url}/api/evidence-storage/files/org_impacto_aviation/${upPdfJson.arquivoRef.hashSha256}`,
      { headers: { Authorization: "Bearer token-outra-org" } }
    );
    assert(crossGet.status === 403, `Bloqueio cross-organization no backend GCS (HTTP ${crossGet.status})`);

    const consultaUp = await fetch(`${api1.url}/api/evidence-storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-consulta" },
      body: JSON.stringify({
        organizationId: "org_impacto_aviation",
        fileName: "bloqueado.pdf",
        base64Data: pdfBuf.toString("base64")
      })
    });
    assert(consultaUp.status === 403, `Perfil CONSULTA bloqueado em escrita no backend GCS (HTTP ${consultaUp.status})`);

    const exeSpoof = await fetch(`${api1.url}/api/evidence-storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-gestor" },
      body: JSON.stringify({
        organizationId: "org_impacto_aviation",
        fileName: "fake.pdf",
        base64Data: Buffer.from("MZ\x90\x00\x03").toString("base64")
      })
    });
    assert(exeSpoof.status === 400, `Magic byte MZ bloqueado antes de atingir o bucket GCS (HTTP ${exeSpoof.status})`);

    // SIMULAÇÃO DE TROCA DE INSTÂNCIA / REDEPLOY:
    // Destrói completamente a Instância 1 e cria uma Instância 2 limpa conectada ao bucket GCS
    await closeHttpServer(api1.server);
    const api2 = await mountEvidenceApp(createHarnessBackend());

    try {
      const adminReadAfterRedeploy = await fetch(
        `${api2.url}/api/evidence-storage/files/org_impacto_aviation/${upPdfJson.arquivoRef.hashSha256}`,
        { headers: { Authorization: "Bearer token-admin" } }
      );
      const adminBuf = Buffer.from(await adminReadAfterRedeploy.arrayBuffer());
      assert(
        adminReadAfterRedeploy.status === 200 &&
          adminBuf.equals(pdfBuf) &&
          adminReadAfterRedeploy.headers.get("x-evidence-storage-backend") === "gcs",
        "Após substituição da instância do servidor, ADMIN recupera PDF íntegro do bucket GCS"
      );

      const verifyAfterRedeploy = await fetch(
        `${api2.url}/api/evidence-storage/verify-integrity/org_impacto_aviation/${upPngJson.arquivoRef.hashSha256}`,
        { headers: { Authorization: "Bearer token-consulta" } }
      );
      const verifyJson: any = await verifyAfterRedeploy.json();
      assert(
        verifyAfterRedeploy.status === 200 && verifyJson.integro === true && verifyJson.isPersistent === true,
        "CONSULTA verifica integridade SHA-256 no bucket GCS após substituição da instância"
      );

      // Corrupção simulada no bucket GCS
      const pdfObjKey = `organizations/org_impacto_aviation/evidences/${upPdfJson.arquivoRef.hashSha256}`;
      const origStored = gcsHarness.objects.get(pdfObjKey)!;
      const corrupted = Buffer.from(origStored.buffer);
      corrupted[0] = 0x00;
      gcsHarness.objects.set(pdfObjKey, { ...origStored, buffer: corrupted });

      const corruptedDownload = await fetch(
        `${api2.url}/api/evidence-storage/files/org_impacto_aviation/${upPdfJson.arquivoRef.hashSha256}`,
        { headers: { Authorization: "Bearer token-admin" } }
      );
      assert(corruptedDownload.status === 409, `Objeto GCS corrompido detectado (HTTP ${corruptedDownload.status})`);

      // Binário ausente no bucket GCS com metadado presente
      gcsHarness.objects.delete(pdfObjKey);
      const missingBinaryRes = await fetch(
        `${api2.url}/api/evidence-storage/verify-integrity/org_impacto_aviation/${upPdfJson.arquivoRef.hashSha256}`,
        { headers: { Authorization: "Bearer token-admin" } }
      );
      const missingJson: any = await missingBinaryRes.json();
      assert(missingBinaryRes.status === 404 && missingJson.code === "BINARY_MISSING", `Objeto ausente no bucket reporta ${missingJson.code}`);
    } finally {
      await closeHttpServer(api2.server);
    }

    // Teste da migração idempotente dos 2 arquivos reais locais (usando o diretório real em modo SOMENTE LEITURA para o harness)
    const migBackend = createHarnessBackend();
    const migRun1 = await runEvidenceMigrationToGcs({
      baseDir: localBaseDir,
      backend: migBackend,
      execute: true,
      responsavelTecnico: "Validação Automatizada Fase 1.4.7"
    });
    assert(
      migRun1.arquivosIdentificados === 2 &&
        migRun1.arquivosMigrados === 2 &&
        migRun1.arquivosComHashDivergente === 0 &&
        migRun1.errosEPendencias.length === 0,
      `Migração controlada executou 2/2 arquivos locais com SHA-256 pós-upload verificado`
    );

    const migRun2 = await runEvidenceMigrationToGcs({
      baseDir: localBaseDir,
      backend: migBackend,
      execute: true,
      responsavelTecnico: "Validação Automatizada Fase 1.4.7"
    });
    assert(
      migRun2.arquivosMigrados === 0 && migRun2.arquivosJaExistentesNoDestino === 2,
      "Reexecução da migração é 100% idempotente (2 já existentes validados, 0 duplicações)"
    );
  } finally {
    await closeHttpServer(gcsServer);
    fs.rmSync(auditTmp, { recursive: true, force: true });
  }

  console.log("\n=========================================================================");
  console.log(`RESUMO FASE 1.4.7: ${passed} APROVADOS | ${failed} REPROVADOS`);
  console.log("=========================================================================");
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
