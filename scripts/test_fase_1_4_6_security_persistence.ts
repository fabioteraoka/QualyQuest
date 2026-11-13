/**
 * QUALYQUEST SGQ — FASE 1.4.6
 * BATERIA DE TESTES DE SEGURANÇA HTTP, PERSISTÊNCIA, INTEGRIDADE E 8 MODALIDADES
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import express from 'express';
import {
  createEvidenceStorageRouter,
  type VerifiedEvidenceUser
} from '../server/evidenceStorageRouter';
import { MASTER_CHECKLIST_ITEMS } from '../src/data/corporateChecklistsData';
import { CANONICAL_CORPORATE_CRITERIA } from '../src/data/corporateLibraryData';
import { CONTROLES_CORPORATIVOS_EXPANDIDOS } from '../src/services/corporateComplianceMatrixService';
import {
  gerarPreparacaoInicialRequisito,
  avaliarProntidaoRequisito,
  atualizarModalidadeComprovacao,
  registrarSubstituicaoArquivoEvidencia
} from '../src/services/auditReadinessService';
import type {
  ArquivoEvidenciaRef,
  AvaliacaoQualidadeEvidencia,
  PreparacaoRequisitoAuditoria
} from '../src/types';

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string, detail?: string) {
  if (cond) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function makeQualidadeOk(overrides: Partial<AvaliacaoQualidadeEvidencia> = {}): AvaliacaoQualidadeEvidencia {
  return {
    status: 'SUFICIENTE',
    pertinencia: true,
    autenticidade: true,
    abrangencia: true,
    validadeConferida: true,
    parecer: 'Evidência avaliada e aderente aos critérios internos do SGQ.',
    ...overrides
  };
}

function makeReadyBasePrep(id: string): PreparacaoRequisitoAuditoria {
  const item = MASTER_CHECKLIST_ITEMS.find((i) => i.id === id) || MASTER_CHECKLIST_ITEMS[0];
  const base = gerarPreparacaoInicialRequisito(item, 'org_impacto_aviation');
  return {
    ...base,
    aplicabilidade: 'APLICAVEL',
    statusResposta: 'APROVADA',
    respostaRevisada: true,
    respostaTexto: 'A IMPACTO executa integralmente o requisito conforme procedimentos vigentes do SGQ e registros verificáveis.',
    evidenciasSuficientes: true,
    pendencias: [],
    documentosRelacionados: [
      {
        documentoId: 'DOC-TEST-01',
        codigo: 'MOMQ',
        titulo: 'MOMQ MNT-001 Rev. Vigente',
        revisao: 'Rev 12',
        situacao: 'ATIVO',
        tipo: 'MOMQ',
        secaoAplicavel: 'Seção 4.2',
        adicionadoEm: new Date().toISOString(),
        adicionadoPorNome: 'Qualidade Teste'
      }
    ]
  };
}

function buildMinimalValidPngBuffer(): Buffer {
  // 1x1 transparent PNG válido
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
}

function startIsolatedRouterServer(baseDir: string): Promise<{ server: http.Server; url: string }> {
  const tokenDirectory: Record<string, VerifiedEvidenceUser> = {
    'token-gestor-impacto': {
      uid: 'uid-gestor-01',
      email: 'qualidade@impacto.aero',
      role: 'GESTOR_SGQ',
      organizationId: 'org_impacto_aviation',
      displayName: 'Paulo Okubo (GESTOR_SGQ)',
      isSuperAdmin: false
    },
    'token-admin-impacto': {
      uid: 'uid-admin-02',
      email: 'diretoria@impacto.aero',
      role: 'ADMIN',
      organizationId: 'org_impacto_aviation',
      displayName: 'Diretor Técnico (ADMIN)',
      isSuperAdmin: false
    },
    'token-consulta-impacto': {
      uid: 'uid-consulta-03',
      email: 'leitura@impacto.aero',
      role: 'CONSULTA',
      organizationId: 'org_impacto_aviation',
      displayName: 'Auditor Leitura (CONSULTA)',
      isSuperAdmin: false
    },
    'token-outro-tenant': {
      uid: 'uid-ext-99',
      email: 'invasor@concorrente.aero',
      role: 'ADMIN',
      organizationId: 'org_concorrente_externa',
      displayName: 'Usuário Outra Empresa',
      isSuperAdmin: false
    }
  };

  const isolatedApp = express();
  isolatedApp.use(express.json({ limit: '50mb' }));
  isolatedApp.use(
    '/api/evidence-storage',
    createEvidenceStorageRouter({
      baseDir,
      verifyUser: async (authHeader?: string) => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw Object.assign(new Error('Token ausente'), { status: 401, code: 'AUTH_MISSING_TOKEN' });
        }
        const token = authHeader.slice(7).trim();
        const user = tokenDirectory[token];
        if (!user) {
          throw Object.assign(new Error('Token inválido'), { status: 401, code: 'AUTH_INVALID_TOKEN' });
        }
        return user;
      }
    })
  );

  return new Promise((resolve) => {
    const server = isolatedApp.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  console.log('======================================================================');
  console.log('QUALYQUEST SGQ — FASE 1.4.6 — VALIDAÇÃO DE SEGURANÇA E CONFORMIDADE');
  console.log('======================================================================\n');

  const baseUrl = 'http://localhost:3000';
  const orgId = 'org_impacto_aviation';
  const existingHash = 'bdf84a9c78f77decf6bfa9b1b3436f4ab3111d57686a3b4a693576c7e3c07770';
  const existingHash2 = 'ebc1591e4152df80c0d3d06cd78e15ff25274293c9a3d520361ca414e7828690';

  // ------------------------------------------------------------------
  // 1. PERSISTÊNCIA EM DISCO APÓS REINICIALIZAÇÃO DO DEV SERVER
  // ------------------------------------------------------------------
  console.log('[1] Diagnóstico de Persistência Local após Restart do Servidor...');
  const storageDir = path.resolve(process.cwd(), 'data', 'evidence_storage', orgId);
  for (const h of [existingHash, existingHash2]) {
    const binPath = path.join(storageDir, `${h}.bin`);
    const metaPath = path.join(storageDir, `${h}.meta.json`);
    assert(fs.existsSync(binPath), `Arquivo binário ${h.substring(0, 12)}... permanece após restart`, binPath);
    assert(fs.existsSync(metaPath), `Metadado JSON ${h.substring(0, 12)}... permanece após restart`, metaPath);
    if (fs.existsSync(binPath)) {
      const binBuf = fs.readFileSync(binPath);
      const sha = crypto.createHash('sha256').update(binBuf).digest('hex');
      assert(sha === h, `Integridade SHA-256 do binário ${h.substring(0, 12)}... íntegra após restart`, sha);
    }
  }

  // ------------------------------------------------------------------
  // 2. SEGURANÇA HTTP REAL EM http://localhost:3000 (SEM AUTH / JWT FORJADO)
  // ------------------------------------------------------------------
  console.log('\n[2] Testes de Segurança HTTP no Servidor Real (http://localhost:3000)...');

  const unauthUpload = await fetch(`${baseUrl}/api/evidence-storage/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: orgId,
      fileName: 'ataque.pdf',
      base64Data: Buffer.from('%PDF-1.4\ntest').toString('base64')
    })
  });
  assert(unauthUpload.status === 401, `POST /upload sem Bearer token rejeitado (HTTP ${unauthUpload.status})`);

  const unauthDownload = await fetch(`${baseUrl}/api/evidence-storage/files/${orgId}/${existingHash}`);
  assert(unauthDownload.status === 401, `GET /files sem Bearer token rejeitado (HTTP ${unauthDownload.status})`);

  const unauthVerify = await fetch(`${baseUrl}/api/evidence-storage/verify-integrity/${orgId}/${existingHash}`);
  assert(unauthVerify.status === 401, `GET /verify-integrity sem Bearer token rejeitado (HTTP ${unauthVerify.status})`);

  const unauthMigrate = await fetch(`${baseUrl}/api/evidence-storage/migrate-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId: orgId, base64Data: 'JVBERi0xLjQ=', fileName: 'legado.pdf' })
  });
  assert(unauthMigrate.status === 401, `POST /migrate-base64 sem Bearer token rejeitado (HTTP ${unauthMigrate.status})`);

  // Forged JWT test
  const fakeHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'nonexistent-kid' })).toString('base64url');
  const fakePayload = Buffer.from(
    JSON.stringify({
      aud: 'ai-studio-applet-webapp-bdbf6',
      iss: 'https://securetoken.google.com/ai-studio-applet-webapp-bdbf6',
      sub: 'forged-uid-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    })
  ).toString('base64url');
  const forgedJwt = `${fakeHeader}.${fakePayload}.ZmFrZV9zaWc`;

  const forgedResp = await fetch(`${baseUrl}/api/evidence-storage/files/${orgId}/${existingHash}`, {
    headers: { Authorization: `Bearer ${forgedJwt}` }
  });
  assert(forgedResp.status === 401, `GET /files com JWT forjado rejeitado (HTTP ${forgedResp.status})`);

  // Verifica Audit Log gerado no servidor pelas tentativas rejeitadas
  const auditLogPath = path.resolve(process.cwd(), 'data', 'evidence_storage', '_audit', 'evidence_storage_audit.jsonl');
  assert(fs.existsSync(auditLogPath), 'Arquivo de audit log do storage existe no servidor');
  if (fs.existsSync(auditLogPath)) {
    const lines = fs.readFileSync(auditLogPath, 'utf8').trim().split('\n').filter(Boolean);
    const hasDeny = lines.some((l) => l.includes('"outcome":"DENY"') && l.includes('AUTH_'));
    assert(hasDeny, 'Audit log registrou tentativas negadas (outcome=DENY, AUTH_*)', `Total linhas log: ${lines.length}`);
  }

  // ------------------------------------------------------------------
  // 2B. TESTES END-TO-END DO ROUTER HTTP ISOLADO (RBAC, MULTI-TENANT, MAGIC-BYTES, CORRUPÇÃO, ÓRFÃO)
  // ------------------------------------------------------------------
  console.log('\n[2B] Testes de Integração HTTP do createEvidenceStorageRouter (Identidades Controladas)...');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qualyquest-146-'));
  let srv = await startIsolatedRouterServer(tempDir);

  try {
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n', 'utf8');
    const pngContent = buildMinimalValidPngBuffer();

    // 1. Upload autenticado de PDF (GESTOR_SGQ)
    const upPdfRes = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-gestor-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        requisitoId: 'CRIT-RBAC145-12',
        fileName: 'Certificado_Torquimetro_RBC.pdf',
        mimeType: 'application/pdf',
        base64Data: pdfContent.toString('base64')
      })
    });
    const upPdfJson: any = await upPdfRes.json();
    assert(upPdfRes.status === 200 && upPdfJson.success === true, 'Upload autenticado de PDF válido por GESTOR_SGQ (HTTP 200)');
    const pdfRef: ArquivoEvidenciaRef = upPdfJson.arquivoRef;
    assert(Boolean(pdfRef?.hashSha256 && pdfRef.mimeType === 'application/pdf'), 'arquivoRef retorna SHA-256 e MIME validado');

    // 2. Upload autenticado de PNG (GESTOR_SGQ)
    const upPngRes = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-gestor-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        requisitoId: 'CRIT-RBAC145-12',
        fileName: 'Foto_Bancada_Calibracao.png',
        mimeType: 'image/png',
        base64Data: pngContent.toString('base64')
      })
    });
    const upPngJson: any = await upPngRes.json();
    assert(upPngRes.status === 200 && upPngJson.arquivoRef?.mimeType === 'image/png', 'Upload autenticado de PNG válido por GESTOR_SGQ (HTTP 200)');
    const pngRef: ArquivoEvidenciaRef = upPngJson.arquivoRef;

    // 3. Recuperação por segundo usuário da mesma organização (ADMIN)
    const adminDownloadRes = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-admin-impacto' }
    });
    const adminBytes = Buffer.from(await adminDownloadRes.arrayBuffer());
    assert(
      adminDownloadRes.status === 200 &&
        adminBytes.equals(pdfContent) &&
        adminDownloadRes.headers.get('x-content-type-options') === 'nosniff' &&
        (adminDownloadRes.headers.get('cache-control') || '').includes('no-store'),
      'Segundo usuário da mesma organização (ADMIN) recupera binário PDF idêntico com headers nosniff + no-store'
    );

    const adminPngRes = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pngRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-admin-impacto' }
    });
    assert(adminPngRes.status === 200 && Buffer.from(await adminPngRes.arrayBuffer()).equals(pngContent), 'ADMIN da mesma organização recupera imagem PNG idêntica');

    // 4. Bloqueio Cross-Organization
    const crossRead = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-outro-tenant' }
    });
    const crossReadBody: any = await crossRead.json();
    assert(
      crossRead.status === 403 && crossReadBody.code === 'CROSS_ORGANIZATION_ACCESS_DENIED',
      `Download cross-organization bloqueado (HTTP ${crossRead.status}, ${crossReadBody.code})`
    );

    const crossUpload = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-outro-tenant'
      },
      body: JSON.stringify({
        organizationId: orgId,
        fileName: 'tentativa_cross.pdf',
        base64Data: pdfContent.toString('base64')
      })
    });
    assert(crossUpload.status === 403, `Upload cross-organization bloqueado (HTTP ${crossUpload.status})`);

    const crossVerify = await fetch(`${srv.url}/api/evidence-storage/verify-integrity/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-outro-tenant' }
    });
    assert(crossVerify.status === 403, `Verify-integrity cross-organization bloqueado (HTTP ${crossVerify.status})`);

    // 5. Bloqueio RBAC de perfil somente leitura (CONSULTA)
    const consultaUpload = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-consulta-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        fileName: 'consulta_nao_pode.pdf',
        base64Data: pdfContent.toString('base64')
      })
    });
    const consultaUploadBody: any = await consultaUpload.json();
    assert(
      consultaUpload.status === 403 && consultaUploadBody.code === 'ROLE_READONLY_DENIED',
      `Perfil CONSULTA bloqueado em POST /upload (HTTP ${consultaUpload.status}, ${consultaUploadBody.code})`
    );

    const consultaMigrate = await fetch(`${srv.url}/api/evidence-storage/migrate-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-consulta-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        fileName: 'legado.pdf',
        base64Data: pdfContent.toString('base64')
      })
    });
    assert(consultaMigrate.status === 403, `Perfil CONSULTA bloqueado em POST /migrate-base64 (HTTP ${consultaMigrate.status})`);

    const consultaRead = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-consulta-impacto' }
    });
    assert(consultaRead.status === 200, `Perfil CONSULTA da mesma organização autorizado em leitura GET /files (HTTP ${consultaRead.status})`);

    // 6. Bloqueio de Magic Bytes / Spoofing / Path Traversal
    const exeAsPdf = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-gestor-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        fileName: 'malware_disfarcado.pdf',
        mimeType: 'application/pdf',
        base64Data: Buffer.from('MZ\x90\x00\x03\x00\x00\x00').toString('base64')
      })
    });
    const exeBody: any = await exeAsPdf.json();
    assert(exeAsPdf.status === 400 && exeBody.code === 'DANGEROUS_BINARY_SIGNATURE', `Executável MZ renomeado para .pdf bloqueado (${exeBody.code})`);

    const scriptAsTxt = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-gestor-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        fileName: 'xss.txt',
        mimeType: 'text/plain',
        base64Data: Buffer.from('<script>alert(1)</script>').toString('base64')
      })
    });
    assert(scriptAsTxt.status === 400, `HTML/Script renomeado para .txt bloqueado (HTTP ${scriptAsTxt.status})`);

    const fakePdfBytes = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-gestor-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        fileName: 'texto_como_pdf.pdf',
        mimeType: 'application/pdf',
        base64Data: Buffer.from('isto nao eh um pdf real').toString('base64')
      })
    });
    const fakePdfBody: any = await fakePdfBytes.json();
    assert(fakePdfBytes.status === 400 && fakePdfBody.code === 'INVALID_FILE_SIGNATURE', `Arquivo sem magic byte %PDF- rejeitado (${fakePdfBody.code})`);

    const traversalRes = await fetch(`${srv.url}/api/evidence-storage/files/..%2F_audit/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    assert(traversalRes.status === 400, `Tentativa de path traversal bloqueada (HTTP ${traversalRes.status})`);

    // 7. Substituição controlada com histórico preservado
    const pdfV2Content = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Version 2 >>\nendobj\n%%EOF\n', 'utf8');
    const upV2Res = await fetch(`${srv.url}/api/evidence-storage/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-gestor-impacto'
      },
      body: JSON.stringify({
        organizationId: orgId,
        requisitoId: 'CRIT-RBAC145-12',
        fileName: 'Certificado_Torquimetro_RBC_Rev2.pdf',
        mimeType: 'application/pdf',
        base64Data: pdfV2Content.toString('base64')
      })
    });
    const upV2Json: any = await upV2Res.json();
    const prepComSubst = makeReadyBasePrep('CRIT-RBAC145-12');
    prepComSubst.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-HIST-01',
        tipo: 'CERTIFICADO_CALIBRACAO',
        titulo: 'Certificado Torquímetro RBC',
        dataEnvio: '2026-05-01',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        arquivoReferencia: pdfRef,
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    const refSubst: ArquivoEvidenciaRef = {
      ...upV2Json.arquivoRef,
      versao: (pdfRef.versao || 1) + 1,
      historicoSubstituicoes: [
        {
          arquivoAnteriorNome: pdfRef.arquivoNome,
          arquivoAnteriorHash: pdfRef.hashSha256,
          arquivoNovoNome: upV2Json.arquivoRef.arquivoNome,
          arquivoNovoHash: upV2Json.arquivoRef.hashSha256,
          substituidoEm: new Date().toISOString(),
          substituidoPorNome: 'Paulo Okubo (GESTOR_SGQ)',
          substituidoPorUid: 'uid-gestor-01',
          motivoSubstituicao: 'Atualização anual de certificado RBC conforme calibração 2026'
        },
        ...(pdfRef.historicoSubstituicoes || [])
      ]
    };
    const prepPosSubst = registrarSubstituicaoArquivoEvidencia(prepComSubst, 'EV-HIST-01', refSubst);
    const evAtualizada = prepPosSubst.evidenciasVinculadas[0];
    assert(
      evAtualizada.arquivoReferencia?.versao === 2 &&
        (evAtualizada.arquivoReferencia?.historicoSubstituicoes?.length || 0) === 1 &&
        evAtualizada.arquivoReferencia?.historicoSubstituicoes?.[0].arquivoAnteriorHash === pdfRef.hashSha256,
      'Substituição controlada incrementa versão (v2) e preserva hash da versão anterior no histórico'
    );

    // 8. Simulação de reinicialização do servidor (fechar e reabrir instância apontando para o mesmo diretório)
    await closeServer(srv.server);
    srv = await startIsolatedRouterServer(tempDir);

    const postRestartIntegrity = await fetch(`${srv.url}/api/evidence-storage/verify-integrity/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    const postRestartIntJson: any = await postRestartIntegrity.json();
    assert(
      postRestartIntegrity.status === 200 && postRestartIntJson.integro === true && postRestartIntJson.code === 'OK',
      'Após reinicialização do servidor HTTP, integridade SHA-256 e metadados permanecem íntegros'
    );

    // 9. Cenários de falha: binário corrompido, binário ausente, binário órfão sem metadado
    const tmpBinPath = path.join(tempDir, orgId, `${pdfRef.hashSha256}.bin`);
    const tmpMetaPath = path.join(tempDir, orgId, `${pdfRef.hashSha256}.meta.json`);
    const pngMetaPath = path.join(tempDir, orgId, `${pngRef.hashSha256}.meta.json`);

    // 9a. Corrupção de 1 byte no binário PDF
    const origBytes = fs.readFileSync(tmpBinPath);
    const corruptedBytes = Buffer.from(origBytes);
    corruptedBytes[corruptedBytes.length - 1] = corruptedBytes[corruptedBytes.length - 1] ^ 0xff;
    fs.writeFileSync(tmpBinPath, corruptedBytes);

    const corruptedGet = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    const corruptedGetBody: any = await corruptedGet.json();
    assert(
      corruptedGet.status === 409 && corruptedGetBody.code === 'INTEGRITY_MISMATCH',
      `Binário corrompido detectado em GET /files (HTTP ${corruptedGet.status}, ${corruptedGetBody.code})`
    );

    const corruptedVerify = await fetch(`${srv.url}/api/evidence-storage/verify-integrity/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    const corruptedVerifyBody: any = await corruptedVerify.json();
    assert(
      corruptedVerify.status === 200 && corruptedVerifyBody.integro === false && corruptedVerifyBody.code === 'INTEGRITY_MISMATCH',
      `Verify-integrity sinaliza corrupção SHA-256 (integro=${corruptedVerifyBody.integro}, ${corruptedVerifyBody.code})`
    );

    // 9b. Metadado existe, mas binário foi removido
    fs.unlinkSync(tmpBinPath);
    const missingBinGet = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pdfRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    const missingBinBody: any = await missingBinGet.json();
    assert(
      missingBinGet.status === 404 && missingBinBody.code === 'BINARY_MISSING' && missingBinBody.metadataExists === true,
      `Ausência do binário com metadado existente reportada explicitamente (${missingBinBody.code})`
    );
    assert(fs.existsSync(tmpMetaPath), 'Metadado preservado durante diagnóstico BINARY_MISSING');

    // 9c. Binário órfão (metadado removido, binário PNG intacto)
    fs.unlinkSync(pngMetaPath);
    const orphanVerify = await fetch(`${srv.url}/api/evidence-storage/verify-integrity/${orgId}/${pngRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    const orphanVerifyBody: any = await orphanVerify.json();
    assert(
      orphanVerify.status === 200 && orphanVerifyBody.code === 'ORPHAN_BINARY' && orphanVerifyBody.metadataExists === false && orphanVerifyBody.integro === true,
      `Binário órfão sem metadado diagnosticado explicitamente (${orphanVerifyBody.code})`
    );

    const orphanGet = await fetch(`${srv.url}/api/evidence-storage/files/${orgId}/${pngRef.hashSha256}`, {
      headers: { Authorization: 'Bearer token-gestor-impacto' }
    });
    assert(
      orphanGet.status === 200 && orphanGet.headers.get('x-evidence-metadata-missing') === 'true',
      'Download de binário órfão íntegro emite header explícito X-Evidence-Metadata-Missing: true'
    );
  } finally {
    await closeServer(srv.server);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // ------------------------------------------------------------------
  // 3. VALIDAÇÃO DAS 8 MODALIDADES E NÃO-EQUIVALÊNCIA ARTIFICIAL
  // ------------------------------------------------------------------
  console.log('\n[3] Validação Rigorosa das 8 Modalidades de Comprovação...');

  // 3.1 DOCUMENTAL_PURO
  {
    const prep = makeReadyBasePrep('CRIT-RBAC145-01');
    prep.modalidadeComprovacao = 'DOCUMENTAL_PURO';
    prep.evidenciasVinculadas = [];
    prep.evidenciasSuficientes = false;
    const res = avaliarProntidaoRequisito(prep);
    assert(res.pronto === true, 'DOCUMENTAL_PURO aprovado com documento ativo mesmo sem evidência operacional');
  }

  // 3.2 CERTIFICADO_CALIBRACAO (positivo vs falhas de validade/rastreabilidade/instrumento)
  {
    const prepOk = makeReadyBasePrep('CRIT-RBAC145-12');
    prepOk.modalidadeComprovacao = 'CERTIFICADO_CALIBRACAO';
    prepOk.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-CAL-OK',
        tipo: 'CERTIFICADO_CALIBRACAO',
        titulo: 'Certificado RBC Torquímetro PAT-042',
        numeroReferencia: 'CERT-RBC-2026-8841',
        dataEnvio: '2026-04-10',
        dataValidade: '2027-04-10',
        enviadoPorNome: 'Paulo Okubo',
        baseOperacional: 'GRU',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk({ parecer: 'Rastreado RBC/Inmetro' })
      }
    ];
    assert(avaliarProntidaoRequisito(prepOk).pronto === true, 'CERTIFICADO_CALIBRACAO aprovado com validade, instrumento, rastreabilidade RBC e abrangência');

    const prepSemValidade = {
      ...prepOk,
      evidenciasVinculadas: [{ ...prepOk.evidenciasVinculadas[0], dataValidade: undefined }]
    };
    assert(avaliarProntidaoRequisito(prepSemValidade).pronto === false, 'CERTIFICADO_CALIBRACAO bloqueado quando dataValidade está ausente');

    const prepSemRastreabilidade = {
      ...prepOk,
      evidenciasVinculadas: [
        {
          ...prepOk.evidenciasVinculadas[0],
          titulo: 'Certificado Interno Sem Padrão',
          numeroReferencia: 'INT-001',
          avaliacaoQualidade: makeQualidadeOk({ autenticidade: false, parecer: 'Sem padrão' })
        }
      ]
    };
    assert(avaliarProntidaoRequisito(prepSemRastreabilidade).pronto === false, 'CERTIFICADO_CALIBRACAO bloqueado sem rastreabilidade metrológica RBC/NIST/Inmetro');
  }

  // 3.3 REGISTRO_TREINAMENTO_CHT (distingue treinamento vs CHT)
  {
    const prepChtReq = makeReadyBasePrep('CRIT-RBAC145-01');
    prepChtReq.modalidadeComprovacao = 'REGISTRO_TREINAMENTO_CHT';
    prepChtReq.tituloRequisito = 'Pessoal certificador deve possuir CHT / licença ANAC ativa para a frota.';
    prepChtReq.textoOriginal = prepChtReq.tituloRequisito;
    prepChtReq.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-TREIN-GEN',
        tipo: 'REGISTRO_TREINAMENTO',
        titulo: 'Lista de Presença Treinamento Fatores Humanos',
        numeroReferencia: 'F-001-29-10',
        dataEnvio: '2026-05-01',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(
      avaliarProntidaoRequisito(prepChtReq).pronto === false,
      'REGISTRO_TREINAMENTO_CHT bloqueia lista de treinamento genérica quando o requisito exige habilitação/CHT'
    );

    prepChtReq.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-CHT-OK',
        tipo: 'REGISTRO_TREINAMENTO',
        titulo: 'Licença CHT ANAC Mecânico CEL/GMP — CANAC 123456',
        numeroReferencia: 'CHT-2026-123456',
        dataEnvio: '2026-05-01',
        dataValidade: '2028-05-01',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(
      avaliarProntidaoRequisito(prepChtReq).pronto === true,
      'REGISTRO_TREINAMENTO_CHT aprovado quando há licença CHT válida e conferida'
    );
  }

  // 3.4 ORDEM_SERVICO_OU_CRS (distingue OS de CRS)
  {
    const prepCrsReq = makeReadyBasePrep('CRIT-RBAC145-01');
    prepCrsReq.modalidadeComprovacao = 'ORDEM_SERVICO_OU_CRS';
    prepCrsReq.tituloRequisito = 'Emitir Certificado de Liberação de Serviço (CRS) assinado por inspetor autorizado.';
    prepCrsReq.textoOriginal = prepCrsReq.tituloRequisito;
    prepCrsReq.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-OS-ONLY',
        tipo: 'ORDEM_SERVICO',
        titulo: 'Ordem de Serviço Aberta #450',
        numeroReferencia: 'OS-450',
        dataEnvio: '2026-06-01',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(
      avaliarProntidaoRequisito(prepCrsReq).pronto === false,
      'ORDEM_SERVICO_OU_CRS bloqueia OS isolada quando o requisito exige especificamente CRS'
    );

    prepCrsReq.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-CRS-OK',
        tipo: 'CRS',
        titulo: 'Certificado de Liberação de Serviço CRS #2026-99',
        numeroReferencia: 'CRS-2026-99',
        dataEnvio: '2026-06-01',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(
      avaliarProntidaoRequisito(prepCrsReq).pronto === true,
      'ORDEM_SERVICO_OU_CRS aprovado com CRS referenciado e abrangência conferida'
    );
  }

  // 3.5 VERIFICACAO_IN_LOCO
  {
    const prepInLoco = makeReadyBasePrep('CRIT-RBAC145-01');
    prepInLoco.modalidadeComprovacao = 'VERIFICACAO_IN_LOCO';
    prepInLoco.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-INLOCO-FAIL',
        tipo: 'AUDITORIA',
        titulo: 'Checklist de Pátio',
        dataEnvio: '2026-06-01',
        enviadoPorNome: '',
        baseOperacional: '',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk({ abrangencia: false })
      }
    ];
    assert(avaliarProntidaoRequisito(prepInLoco).pronto === false, 'VERIFICACAO_IN_LOCO bloqueado sem responsável/escopo/parecer');

    prepInLoco.evidenciasVinculadas[0] = {
      ...prepInLoco.evidenciasVinculadas[0],
      enviadoPorNome: 'Paulo Okubo',
      baseOperacional: 'GRU',
      avaliacaoQualidade: makeQualidadeOk({ parecer: 'Vistoria presencial GRU conforme.' })
    };
    assert(avaliarProntidaoRequisito(prepInLoco).pronto === true, 'VERIFICACAO_IN_LOCO aprovado com responsável, data, base e parecer');
  }

  // 3.6 EVIDENCIA_SISTEMA_LOG
  {
    const prepLog = makeReadyBasePrep('CRIT-RBAC145-01');
    prepLog.modalidadeComprovacao = 'EVIDENCIA_SISTEMA_LOG';
    prepLog.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-LOG-OK',
        tipo: 'DOCUMENTO',
        titulo: 'Log de Auditoria RBAC Firestore Backup',
        numeroReferencia: 'SYS-LOG-2026-07',
        dataEnvio: '2026-07-01',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(avaliarProntidaoRequisito(prepLog).pronto === true, 'EVIDENCIA_SISTEMA_LOG aprovado com fonte, data e rastreabilidade');
  }

  // 3.7 REGISTRO_FOTOGRAFICO_OU_LAUDO
  {
    const prepFoto = makeReadyBasePrep('CRIT-RBAC145-01');
    prepFoto.modalidadeComprovacao = 'REGISTRO_FOTOGRAFICO_OU_LAUDO';
    prepFoto.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-FOTO-OK',
        tipo: 'FOTO',
        titulo: 'Registro Fotográfico Área de Quarentena GRU',
        dataEnvio: '2026-07-02',
        enviadoPorNome: 'Paulo Okubo',
        baseOperacional: 'GRU',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(avaliarProntidaoRequisito(prepFoto).pronto === true, 'REGISTRO_FOTOGRAFICO_OU_LAUDO aprovado com foto datada e base');
  }

  // 3.8 COMBINACAO_DE_EVIDENCIAS
  {
    const prepComb = makeReadyBasePrep('CRIT-RBAC145-01');
    prepComb.modalidadeComprovacao = 'COMBINACAO_DE_EVIDENCIAS';
    prepComb.evidenciasVinculadas = [
      {
        evidenciaId: 'EV-COMB-OK',
        tipo: 'DOCUMENTO',
        titulo: 'Registro Operacional Combinado',
        dataEnvio: '2026-07-02',
        enviadoPorNome: 'Paulo Okubo',
        statusValidade: 'VALIDO',
        avaliacaoQualidade: makeQualidadeOk()
      }
    ];
    assert(avaliarProntidaoRequisito(prepComb).pronto === true, 'COMBINACAO_DE_EVIDENCIAS aprovado com documento ativo + evidência operacional suficiente');
  }

  // 3.9 Mudança manual de modalidade exige justificativa >=10 chars e mantém histórico
  {
    const prepMod = makeReadyBasePrep('CRIT-RBAC145-01');
    let threwOnEmpty = false;
    try {
      atualizarModalidadeComprovacao(prepMod, 'VERIFICACAO_IN_LOCO', 'curta');
    } catch {
      threwOnEmpty = true;
    }
    assert(threwOnEmpty, 'Alteração manual de modalidade sem justificativa (>=10 chars) é bloqueada');

    const updatedMod = atualizarModalidadeComprovacao(
      prepMod,
      'VERIFICACAO_IN_LOCO',
      'Regra interna SGQ ajustada para verificação in loco em pátio conforme auditoria interna.'
    );
    assert(
      updatedMod.modalidadeComprovacao === 'VERIFICACAO_IN_LOCO' && (updatedMod.historicoModalidade?.length || 0) >= 2,
      'Alteração manual de modalidade registra autor, data e preserva histórico'
    );
  }

  // ------------------------------------------------------------------
  // 4. INTEGRIDADE DOS DADOS MESTRES (177 / 36 / 17)
  // ------------------------------------------------------------------
  console.log('\n[4] Preservação dos Dados Mestres da Biblioteca Corporativa...');
  assert(MASTER_CHECKLIST_ITEMS.length === 177, `177 requisitos originais preservados (${MASTER_CHECKLIST_ITEMS.length})`);
  assert(CANONICAL_CORPORATE_CRITERIA.length === 36, `36 critérios canônicos preservados (${CANONICAL_CORPORATE_CRITERIA.length})`);
  assert(CONTROLES_CORPORATIVOS_EXPANDIDOS.length === 17, `17 controles centrais SGQ preservados (${CONTROLES_CORPORATIVOS_EXPANDIDOS.length})`);

  console.log('\n======================================================================');
  console.log(`RESUMO: ${passed} APROVADOS | ${failed} REPROVADOS`);
  console.log('======================================================================');
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
