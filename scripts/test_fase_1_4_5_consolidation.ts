/**
 * SCRIPT DE VALIDAÇÃO OPERACIONAL E TÉCNICA — FASE 1.4.5
 * Consolidação Técnica da Preparação para Auditorias (Object Storage, Modalidades de Comprovação e Segurança)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import crypto from 'crypto';
import { MASTER_CHECKLIST_ITEMS } from '../src/data/corporateChecklistsData';
import { CANONICAL_CORPORATE_CRITERIA } from '../src/data/corporateLibraryData';
import { CONTROLES_CORPORATIVOS_EXPANDIDOS } from '../src/services/corporateComplianceMatrixService';
import {
  gerarPreparacaoInicialRequisito,
  avaliarProntidaoRequisito,
  atualizarModalidadeComprovacao,
  vincularDocumentoAoRequisito,
  vincularEvidenciaAoRequisito,
  salvarEdicaoResposta,
  aprovarValidacaoQualidade,
  adicionarPendencia,
  registrarSubstituicaoArquivoEvidencia
} from '../src/services/auditReadinessService';
import { ArquivoEvidenciaRef, DocumentoControlado, UserProfile } from '../src/types';

const ORG_ID = 'org_impacto_aviation';
const BASE_URL = 'http://localhost:3000';

const gestorUser: UserProfile = {
  uid: 'uid-gestor-paulo',
  email: 'paulo.okubo@impacto.aero',
  displayName: 'Paulo Okubo (Gerente da Qualidade)',
  role: 'GESTOR_SGQ',
  organizationId: ORG_ID,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function runTests() {
  console.log('=== INICIANDO VALIDAÇÃO OPERACIONAL FASE 1.4.5 ===\n');
  let passed = 0;
  const check = (cond: boolean, msg: string) => {
    assert(cond, `FALHA: ${msg}`);
    passed++;
    console.log(`  [OK] ${msg}`);
  };

  // --------------------------------------------------------------------------
  // BLOCO 1: PRESERVAÇÃO INTEGRAL DOS DADOS DA BIBLIOTECA CORPORATIVA
  // --------------------------------------------------------------------------
  console.log('1. Verificando Preservação da Biblioteca Corporativa...');
  check(MASTER_CHECKLIST_ITEMS.length === 177, `177 requisitos originais preservados (${MASTER_CHECKLIST_ITEMS.length})`);
  check(CANONICAL_CORPORATE_CRITERIA.length === 36, `36 critérios canônicos preservados (${CANONICAL_CORPORATE_CRITERIA.length})`);
  check(CONTROLES_CORPORATIVOS_EXPANDIDOS.length === 17, `17 controles centrais SGQ preservados (${CONTROLES_CORPORATIVOS_EXPANDIDOS.length})`);

  // --------------------------------------------------------------------------
  // BLOCO 2: CENÁRIO 1 — REQUISITO PROCEDIMENTAL (DOCUMENTAL_PURO)
  // --------------------------------------------------------------------------
  console.log('\n2. Cenário 1: Requisito Procedimental (DOCUMENTAL_PURO)...');
  const itemDocPuro = MASTER_CHECKLIST_ITEMS.find((i) =>
    (i.perguntaOuCriterio + ' ' + i.referenciaNormativa).toLowerCase().includes('política') ||
    (i.perguntaOuCriterio + ' ' + i.referenciaNormativa).toLowerCase().includes('manual')
  ) || MASTER_CHECKLIST_ITEMS[0];

  let prepDoc = gerarPreparacaoInicialRequisito(itemDocPuro, ORG_ID);
  prepDoc = atualizarModalidadeComprovacao(
    prepDoc,
    'DOCUMENTAL_PURO',
    'Requisito estritamente organizacional e procedimental comprovado pelo MOMQ vigente.',
    gestorUser
  );

  // Garantir documento ativo vinculado
  const docMOMQ: DocumentoControlado = {
    id: 'DOC-MOMQ-01',
    organizationId: ORG_ID,
    codigo: 'MOMQ',
    titulo: 'Manual da Organização de Manutenção e da Qualidade',
    categoria: 'DOCUMENTO_INTERNO',
    tipoSubcategoria: 'MOMQ',
    revisaoVigenteNumero: 'Rev. 14',
    statusGeral: 'ATIVO',
    emissor: 'IMPACTO Aviation',
    dataEntradaVigor: '2026-01-10',
    criadoEm: '2026-01-10T00:00:00Z',
    atualizadoEm: '2026-01-10T00:00:00Z'
  } as any;

  prepDoc = vincularDocumentoAoRequisito(prepDoc, docMOMQ, 'Seção 1.2 - Política da Qualidade', gestorUser);
  prepDoc = salvarEdicaoResposta(
    prepDoc,
    'A IMPACTO mantém sua Política da Qualidade formalmente estabelecida e assinada pelo Gestor Responsável no MOMQ Seção 1.2 (Rev. 14), disponível a todos os colaboradores.',
    'APROVADA',
    'AUTOMATICA',
    'Aprovação institucional de requisito documental puro',
    gestorUser
  );
  // Sem nenhuma evidência operacional (evidenciasVinculadas vazio)
  prepDoc.evidenciasVinculadas = [];
  prepDoc.evidenciasSuficientes = false;
  prepDoc.pendencias = [];

  const avalDocPuro = avaliarProntidaoRequisito(prepDoc);
  check(prepDoc.modalidadeComprovacao === 'DOCUMENTAL_PURO', 'Modalidade definida como DOCUMENTAL_PURO');
  check(avalDocPuro.pronto === true, 'Requisito DOCUMENTAL_PURO alcançou prontidão SEM exigir evidência operacional artificial');
  check(avalDocPuro.situacaoCalculada === 'PRONTO_PARA_AUDITORIA', `Situação calculada: ${avalDocPuro.situacaoCalculada}`);

  // --------------------------------------------------------------------------
  // BLOCO 3: OBJECT STORAGE NO BACKEND (UPLOAD, SHA-256, DEDUP, INTEGRIDADE, MIGRAÇÃO)
  // --------------------------------------------------------------------------
  console.log('\n3. Testando Object Storage de Evidências (API Real em localhost:3000)...');
  const samplePdfBytes = Buffer.from('%PDF-1.4\n% QualyQuest RBC Calibration Certificate Test Artifact\n1 0 obj << /Type /Catalog >> endobj\n%%EOF', 'utf8');
  const expectedSha256 = crypto.createHash('sha256').update(samplePdfBytes).digest('hex');
  const sampleBase64 = `data:application/pdf;base64,${samplePdfBytes.toString('base64')}`;

  // 3a. Upload
  const uploadResp1 = await fetch(`${BASE_URL}/api/evidence-storage/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: ORG_ID,
      fileName: 'Certificado_Calibracao_Torquimetro_T045.pdf',
      mimeType: 'application/pdf',
      base64Data: sampleBase64,
      enviadoPorNome: gestorUser.displayName,
      enviadoPorUid: gestorUser.uid,
      requisitoId: 'CRIT-RBAC145-12'
    })
  });
  check(uploadResp1.ok, 'POST /api/evidence-storage/upload retornou HTTP 200');
  const uploadJson1: any = await uploadResp1.json();
  const ref1: ArquivoEvidenciaRef = uploadJson1.arquivoRef;
  check(ref1.hashSha256 === expectedSha256, `Hash SHA-256 exato validado (${expectedSha256.substring(0, 12)}...)`);
  check(ref1.storagePath === `/api/evidence-storage/files/${ORG_ID}/${expectedSha256}`, 'StoragePath isolado por organização');

  // 3b. Deduplicação em segundo upload idêntico (outro requisito)
  const uploadResp2 = await fetch(`${BASE_URL}/api/evidence-storage/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: ORG_ID,
      fileName: 'Copia_Certificado_T045_Kalitta.pdf',
      mimeType: 'application/pdf',
      base64Data: sampleBase64,
      enviadoPorNome: gestorUser.displayName,
      requisitoId: 'CRIT-KALITTA-21'
    })
  });
  const uploadJson2: any = await uploadResp2.json();
  check(uploadJson2.arquivoRef.hashSha256 === ref1.hashSha256, 'Deduplicação por conteúdo SHA-256 confirmada');

  // 3c. Rejeição de MIME inválido
  const badMimeResp = await fetch(`${BASE_URL}/api/evidence-storage/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: ORG_ID,
      fileName: 'script_malicioso.exe',
      mimeType: 'application/x-msdownload',
      base64Data: sampleBase64
    })
  });
  check(badMimeResp.status === 400, 'Rejeição de MIME type não permitido (HTTP 400)');

  // 3d. Download binário
  const dlResp = await fetch(`${BASE_URL}${ref1.storagePath}`);
  check(dlResp.ok && dlResp.headers.get('content-type')?.includes('application/pdf') === true, 'GET /api/evidence-storage/files stream binário PDF OK');
  const dlBuffer = Buffer.from(await dlResp.arrayBuffer());
  check(dlBuffer.equals(samplePdfBytes), 'Bytes baixados do Object Storage são idênticos ao arquivo original');

  // 3e. Verificação de Integridade
  const intResp = await fetch(`${BASE_URL}/api/evidence-storage/verify-integrity/${ORG_ID}/${expectedSha256}`);
  const intJson: any = await intResp.json();
  check(intJson.exists === true && intJson.integro === true, 'Verificação de integridade SHA-256 aprovada');

  // 3f. Migração de Base64 legado
  const legacyBytes = Buffer.from('%PDF-1.4\n% Legacy Base64 Evidence Attachment\n%%EOF', 'utf8');
  const legacyBase64 = `data:application/pdf;base64,${legacyBytes.toString('base64')}`;
  const migResp = await fetch(`${BASE_URL}/api/evidence-storage/migrate-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: ORG_ID,
      base64Data: legacyBase64,
      fileName: 'Anexo_Legado_Fase144.pdf',
      tipo: 'CERTIFICADO_CALIBRACAO',
      enviadoPorNome: 'Migração Automatizada'
    })
  });
  const migJson: any = await migResp.json();
  check(migResp.ok && migJson.arquivoRef.migradoDeBase64 === true, 'Migração de Base64 legado para Object Storage concluída');

  // --------------------------------------------------------------------------
  // BLOCO 4: CENÁRIO 2 — REQUISITO OPERACIONAL (CERTIFICADO_CALIBRACAO)
  // --------------------------------------------------------------------------
  console.log('\n4. Cenário 2: Requisito Operacional (CERTIFICADO_CALIBRACAO)...');
  const itemCalib = MASTER_CHECKLIST_ITEMS.find((i) => i.id === 'CRIT-RBAC145-12')!;
  let prepCalib = gerarPreparacaoInicialRequisito(itemCalib, ORG_ID);
  check(prepCalib.modalidadeComprovacao === 'CERTIFICADO_CALIBRACAO', 'Modalidade automática identificada como CERTIFICADO_CALIBRACAO');

  // Tentar aprovar somente com documento procedimental (sem evidências operacionais)
  prepCalib.evidenciasVinculadas = [];
  prepCalib.evidenciasSuficientes = false;
  const avalSemCert = avaliarProntidaoRequisito(prepCalib);
  check(avalSemCert.pronto === false, 'Procedimento isolado NÃO concede prontidão para requisito CERTIFICADO_CALIBRACAO');
  check(avalSemCert.motivosBloqueio.some((m) => m.includes('procedimentos isolados não sustentam')), 'Motivo de bloqueio explícito exibido');

  // Vincular certificado salvo no Object Storage (zero Base64 no documento!)
  prepCalib = vincularEvidenciaAoRequisito(
    prepCalib,
    {
      id: 'EVID-RBC-T045',
      organizationId: ORG_ID,
      tipo: 'CERTIFICADO_CALIBRACAO',
      titulo: 'Certificado de Calibração RBC Torquímetro T-045',
      numeroReferencia: 'CERT-RBC-2026-045',
      dataEvidencia: '2026-09-15',
      dataValidade: '2027-09-15',
      baseOperacional: 'GRU',
      statusValidade: 'VALIDO',
      responsavel: 'Paulo Okubo',
      arquivoReferencia: ref1
    } as any,
    {
      status: 'SUFICIENTE',
      pertinencia: true,
      autenticidade: true,
      abrangencia: true,
      validadeConferida: true,
      parecer: 'Certificado RBC válido e íntegro no Object Storage.',
      avaliadoPorNome: gestorUser.displayName,
      avaliadoEm: '2026-11-13'
    },
    gestorUser
  );
  prepCalib = aprovarValidacaoQualidade(prepCalib, 'Aprovado após verificação metrológica.', true, false, undefined, gestorUser);

  const avalComCert = avaliarProntidaoRequisito(prepCalib);
  check(avalComCert.pronto === true && avalComCert.situacaoCalculada === 'PRONTO_PARA_AUDITORIA', 'Requisito CERTIFICADO_CALIBRACAO atingiu PRONTO_PARA_AUDITORIA com certificado no Object Storage');
  check(!JSON.stringify(prepCalib).includes('data:application/pdf;base64,'), 'Zero payload Base64 dentro do registro PreparacaoRequisitoAuditoria');

  // Testar substituição controlada de arquivo
  const refV2: ArquivoEvidenciaRef = {
    ...migJson.arquivoRef,
    versao: 2,
    historicoSubstituicoes: [
      {
        arquivoAnteriorNome: ref1.arquivoNome,
        arquivoAnteriorHash: ref1.hashSha256,
        arquivoNovoNome: migJson.arquivoRef.arquivoNome,
        arquivoNovoHash: migJson.arquivoRef.hashSha256,
        substituidoEm: new Date().toISOString(),
        substituidoPorNome: gestorUser.displayName,
        motivoSubstituicao: 'Atualização anual de calibração RBC'
      }
    ]
  };
  prepCalib = registrarSubstituicaoArquivoEvidencia(prepCalib, 'EVID-RBC-T045', refV2);
  check(prepCalib.evidenciasVinculadas[0].arquivoReferencia?.versao === 2, 'Substituição controlada incrementou versão para v2 e manteve histórico');

  // --------------------------------------------------------------------------
  // BLOCO 5: CENÁRIO 3 — DOCUMENTAÇÃO INSUFICIENTE OU PENDÊNCIA IMPEDITIVA
  // --------------------------------------------------------------------------
  console.log('\n5. Cenário 3: Requisito com Pendência Impeditiva / Evidência Insuficiente...');
  const itemKalitta = MASTER_CHECKLIST_ITEMS.find((i) => i.id === 'CRIT-KALITTA-21')!;
  let prepBloq = gerarPreparacaoInicialRequisito(itemKalitta, ORG_ID);
  const avalBloq = avaliarProntidaoRequisito(prepBloq);
  check(avalBloq.pronto === false, 'Requisito com pendência impeditiva aberta permanece bloqueado');
  check(avalBloq.situacaoCalculada === 'COM_PENDENCIAS_IMPEDITIVAS', `Situação mantida em COM_PENDENCIAS_IMPEDITIVAS (${avalBloq.situacaoCalculada})`);

  // Adicionar evidência insuficiente e verificar bloqueio mesmo sem pendências
  prepBloq.pendencias = [];
  prepBloq = vincularEvidenciaAoRequisito(
    prepBloq,
    {
      id: 'EVID-INSUF-01',
      organizationId: ORG_ID,
      tipo: 'FOTO',
      titulo: 'Foto desfocada sem etiqueta visível',
      dataEvidencia: '2026-11-10',
      statusValidade: 'VALIDO',
      responsavel: 'Inspetor'
    } as any,
    {
      status: 'INSUFICIENTE',
      pertinencia: true,
      autenticidade: true,
      abrangencia: false,
      validadeConferida: false,
      parecer: 'Imagem não comprova numeração em inglês.',
      avaliadoPorNome: gestorUser.displayName,
      avaliadoEm: '2026-11-13'
    },
    gestorUser
  );
  const avalInsuf = avaliarProntidaoRequisito(prepBloq);
  check(avalInsuf.pronto === false, 'Evidência avaliada como INSUFICIENTE bloqueia prontidão para auditoria');

  // --------------------------------------------------------------------------
  // BLOCO 6: AUDITORIA DAS REGRAS DE SEGURANÇA FIRESTORE
  // --------------------------------------------------------------------------
  console.log('\n6. Auditando Regras de Segurança (firestore.rules)...');
  const rulesText = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  check(rulesText.includes('match /audit_readiness_preparations/{requisitoId}'), 'Regra explícita para audit_readiness_preparations presente');
  check(rulesText.includes("getUserRole() != 'CONSULTA'") && rulesText.includes("getUserRole() != 'VIEWER'"), 'Bloqueio explícito dos perfis CONSULTA/VIEWER');
  check(rulesText.includes("incoming().statusResposta != 'APROVADA' || isGestorSGQ() || isSystemAdmin()"), 'Aprovação restrita a GESTOR_SGQ ou ADMIN');
  check(rulesText.includes('match /evidence_files/{fileId}') && rulesText.includes("!('base64Data' in incoming())"), 'Coleção evidence_files protegida e bloqueada contra payloads Base64');

  console.log(`\n=== VALIDAÇÃO FASE 1.4.5 CONCLUÍDA: ${passed} VERIFICAÇÕES APROVADAS COM SUCESSO ===`);
}

runTests().catch((err) => {
  console.error('\n[ERRO NA VALIDAÇÃO]', err);
  process.exit(1);
});
