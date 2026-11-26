import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import { createAuditPrepRouter } from '../server/auditPrepRouter.ts';
import {
  AuditoriaPreparacao,
  ItemAuditoriaPreparacao,
  calcularResumoAuditoriaPrep,
  isItemRespondidoPrep,
} from '../src/types/auditPrep.ts';
import {
  canUserDeleteAuditPrep,
  canUserDeleteOrApproveAuditPrep,
  canUserWriteAuditPrep,
} from '../src/services/firebase/auditPrepFirestore.ts';
import {
  buildAuditPrepDocxBuffer,
  buildAuditPrepPdf,
} from '../src/utils/auditPrepReportGenerator.ts';
import {
  buildPreviousItemCandidates,
  findBestQuestionMatch,
} from '../src/utils/auditPrepMatcher.ts';
import type { UserProfile } from '../src/types.ts';

let passed = 0;
let failed = 0;

function check(cond: boolean, label: string, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function run() {
  console.log('=== VALIDAÇÃO INTEGRADA — CENTRAL DE PREPARAÇÃO PARA AUDITORIAS ===\n');

  // 1. Resumo, Clique como Resposta e Evidência Opcional (Área A & Área C)
  console.log('1. Cálculos de Resumo, Clique como Resposta e Evidência Opcional');
  const sampleItems: ItemAuditoriaPreparacao[] = [
    {
      id: 'IT-1',
      organizationId: 'org_impacto_aviation',
      auditId: 'AUD-1',
      ordem: 1,
      numeroItem: '1.1',
      perguntaOriginal: 'A oficina mantém o MOMQ atualizado e acessível ao pessoal técnico?',
      referenciaNormativa: 'RBAC 145.207',
      respostaImpacto: 'Sim, MOMQ Rev. 12 disponível no Controle Documental.',
      evidencias: [
        {
          evidenciaId: 'EV-1',
          titulo: 'MOMQ Rev. 12',
          tipo: 'DOCUMENTO_SGQ',
          referencia: 'MOMQ-01 Rev.12',
          anexadoEm: '2026-06-01T10:00:00Z',
          anexadoPorNome: 'Qualidade',
        },
      ],
      situacao: 'ATENDIDO',
      observacoesPendencias: '',
      fonteImportacao: {
        tipo: 'EXCEL',
        nomeArquivo: 'checklist_anac.xlsx',
        importadoEm: '2026-06-01T09:00:00Z',
        importadoPorNome: 'Qualidade',
      },
      origemResposta: 'MANUAL',
      validadoQualidade: true,
      validadoQualidadePorNome: 'Gestor SGQ',
      validadoQualidadeEm: '2026-06-01T11:00:00Z',
      criadoPorUid: 'u1',
      criadoPorNome: 'Qualidade',
      createdAt: '2026-06-01T09:00:00Z',
      updatedAt: '2026-06-01T11:00:00Z',
      historicoAlteracoes: [],
    },
    {
      id: 'IT-2',
      organizationId: 'org_impacto_aviation',
      auditId: 'AUD-1',
      ordem: 2,
      numeroItem: '1.2',
      perguntaOriginal: 'Os torquímetros estão com calibração válida rastreável à RBC?',
      referenciaNormativa: 'RBAC 145.109(b)',
      respostaImpacto: '', // sem texto adicional, apenas clique em Conforme
      evidencias: [], // verificação visual sem evidência anexa (opcional)
      situacao: 'ATENDIDO',
      observacoesPendencias: '',
      fonteImportacao: {
        tipo: 'EXCEL',
        nomeArquivo: 'checklist_anac.xlsx',
        importadoEm: '2026-06-01T09:00:00Z',
        importadoPorNome: 'Qualidade',
      },
      origemResposta: 'MANUAL',
      validadoQualidade: false,
      criadoPorUid: 'u1',
      criadoPorNome: 'Qualidade',
      createdAt: '2026-06-01T09:00:00Z',
      updatedAt: '2026-06-01T09:00:00Z',
      historicoAlteracoes: [],
    },
    {
      id: 'IT-3',
      organizationId: 'org_impacto_aviation',
      auditId: 'AUD-1',
      ordem: 3,
      numeroItem: '1.3',
      perguntaOriginal: 'Existe evidência de treinamento recorrente FTS e EWIS?',
      referenciaNormativa: 'IS 145-009',
      respostaImpacto: '',
      evidencias: [],
      situacao: 'PENDENTE_DE_AVALIACAO',
      observacoesPendencias: 'Aguardando lista de presença turma maio/2026',
      fonteImportacao: {
        tipo: 'MANUAL',
        importadoEm: '2026-06-01T09:00:00Z',
        importadoPorNome: 'Qualidade',
      },
      origemResposta: 'NAO_PREENCHIDA',
      validadoQualidade: false,
      criadoPorUid: 'u1',
      criadoPorNome: 'Qualidade',
      createdAt: '2026-06-01T09:00:00Z',
      updatedAt: '2026-06-01T09:00:00Z',
      historicoAlteracoes: [],
    },
  ];

  const resumo = calcularResumoAuditoriaPrep(sampleItems);
  check(resumo.totalItens === 3, 'Total de itens calculado corretamente (3)');
  check(resumo.atendidos === 2, 'Conformes calculado corretamente (2)');
  check(resumo.pendentes === 1, 'Pendentes calculado corretamente (1)');
  check(isItemRespondidoPrep(sampleItems[1]) === true, 'Item clicado como Conforme sem texto adicional já é considerado respondido');
  check(isItemRespondidoPrep(sampleItems[2]) === false, 'Item pendente sem texto continua não respondido');

  const visualOnlyAuditSummary = calcularResumoAuditoriaPrep([
    sampleItems[1],
    { ...sampleItems[2], situacao: 'NAO_APLICAVEL', observacoesPendencias: '' },
  ]);
  check(
    visualOnlyAuditSummary.situacaoGeral === 'Pronta para Auditoria',
    'Auditoria com itens Conforme/Não Aplicável sem evidência anexa (verificação visual) fica Pronta para Auditoria'
  );

  // 2. RBAC Helpers
  console.log('\n2. Regras RBAC (Leitura, Escrita, Aprovação, Exclusão)');
  const viewer: UserProfile = {
    uid: 'v1',
    email: 'v@impacto.com',
    displayName: 'Consulta',
    role: 'CONSULTA' as any,
    organizationId: 'org_impacto_aviation',
    status: 'ATIVO',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  };
  const editor: UserProfile = { ...viewer, uid: 'e1', role: 'EDITOR' as any };
  const auditor: UserProfile = { ...viewer, uid: 'a1', role: 'AUDITOR' as any };
  const gestor: UserProfile = { ...viewer, uid: 'g1', role: 'GESTOR_SGQ' as any };

  check(!canUserWriteAuditPrep(viewer), 'Perfil CONSULTA bloqueado para escrita');
  check(canUserWriteAuditPrep(editor), 'Perfil EDITOR liberado para escrita');
  check(!canUserDeleteOrApproveAuditPrep(editor), 'Perfil EDITOR não pode validar pela Qualidade');
  check(canUserDeleteOrApproveAuditPrep(auditor), 'Perfil AUDITOR pode validar pela Qualidade');
  check(!canUserDeleteAuditPrep(auditor), 'Perfil AUDITOR não pode excluir auditorias');
  check(canUserDeleteAuditPrep(gestor), 'Perfil GESTOR_SGQ pode excluir auditorias');

  // 3. Testes HTTP do Backend (/api/audit-prep/parse-items & /suggest-answer)
  console.log('\n3. Endpoints /api/audit-prep (Excel, Word, PDF e Sugestão SGQ)');
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use('/api/audit-prep', createAuditPrepRouter());

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const addr = server.address() as any;
    const baseUrl = `http://127.0.0.1:${addr.port}/api/audit-prep`;

    // 3a. Rejeitar importação sem fonte documental
    const respNoSource = await fetch(`${baseUrl}/parse-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: 'YWJj', nomeArquivo: '', formato: 'XLSX' }),
    });
    const noSourceJson: any = await respNoSource.json();
    check(
      respNoSource.status === 400 && noSourceJson.code === 'SOURCE_REQUIRED',
      'Rejeita importação sem fonte documental identificável (SOURCE_REQUIRED)'
    );

    // 3b. Importação XLSX real preservando numeração e redação original
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      {
        Item: '4.1.2',
        Pergunta: 'A organização mantém registro de calibração atualizado para todos os instrumentos?',
        Referencia: 'RBAC 145.109(b)',
      },
      {
        Item: '4.1.3',
        Pergunta: 'Os mecânicos possuem CHT válida para as aeronaves da lista de capacidade?',
        Referencia: 'RBAC 145.153',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
    const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const respXlsx = await fetch(`${baseUrl}/parse-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: xlsxBuf.toString('base64'),
        nomeArquivo: 'checklist_rbac145.xlsx',
        formato: 'XLSX',
        organizationId: 'org_impacto_aviation',
      }),
    });
    const xlsxJson: any = await respXlsx.json();
    check(respXlsx.ok && xlsxJson.success, 'Importação XLSX retornou sucesso');
    check(
      xlsxJson.itens?.length === 2 &&
        xlsxJson.itens[0].numeroItem === '4.1.2' &&
        xlsxJson.itens[0].perguntaOriginal ===
          'A organização mantém registro de calibração atualizado para todos os instrumentos?',
      'Importação XLSX preservou numeração e texto original sem distorções'
    );

    // 3c. Importação DOCX real
    const docxSample = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun('1.1 O MOMQ contempla os procedimentos de controle de publicações técnicas? (RBAC 145.109)'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun('1.2 As fichas de serviço e ordens de serviço são arquivadas por 5 anos? (RBAC 145.219)'),
              ],
            }),
          ],
        },
      ],
    });
    const docxBuf = await Packer.toBuffer(docxSample);
    const respDocx = await fetch(`${baseUrl}/parse-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: docxBuf.toString('base64'),
        nomeArquivo: 'auditoria_cliente.docx',
        formato: 'DOCX',
        organizationId: 'org_impacto_aviation',
      }),
    });
    const docxJson: any = await respDocx.json();
    check(
      respDocx.ok && docxJson.success && docxJson.itens?.length === 2,
      `Importação DOCX extraiu 2 itens corretamente (obtido: ${docxJson.itens?.length})`
    );

    // 3d. Importação PDF real
    const pdfDoc = new jsPDF();
    pdfDoc.text('2.1 Existe lista de designação técnica atualizada (F 001-29)? RBAC 145.157', 15, 20);
    pdfDoc.text('2.2 O controle de ferramentas calibradas identifica instrumentos vencidos? RBAC 145.109', 15, 32);
    const pdfArrayBuf = pdfDoc.output('arraybuffer');
    const pdfBuf = Buffer.from(pdfArrayBuf);
    const respPdf = await fetch(`${baseUrl}/parse-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: pdfBuf.toString('base64'),
        nomeArquivo: 'roteiro_anac.pdf',
        formato: 'PDF',
        organizationId: 'org_impacto_aviation',
      }),
    });
    const pdfJson: any = await respPdf.json();
    check(
      respPdf.ok && pdfJson.success && pdfJson.itens?.length >= 2,
      `Importação PDF extraiu itens corretamente (obtido: ${pdfJson.itens?.length})`
    );

    // 3e. Sugestão com IA fundamentada vs informação insuficiente
    const respSuggestFound = await fetch(`${baseUrl}/suggest-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_impacto_aviation',
        audit: { nome: 'Auditoria ANAC', entidade: 'ANAC', tipo: 'ANAC', dataAuditoria: '2026-07-15' },
        item: {
          numeroItem: '4.1.2',
          perguntaOriginal: 'A organização mantém registro de calibração para ferramentas e instrumentos?',
          referenciaNormativa: 'RBAC 145.109(b)',
        },
        sgqContext: {
          documentosControlados: [
            {
              codigo: 'PTM-04',
              titulo: 'Procedimento de Calibração de Ferramentas e Metrologia',
              categoria: 'Metrologia',
              numeroRevisao: 'Rev. 05',
              statusGeral: 'VIGENTE',
            },
          ],
          manuals: [],
          trainingRecords: [],
          qualifications: [],
          ferramentasCalibradas: [{ codigo: 'TORQ-01', status: 'CALIBRADA', dataProximaCalibracao: '2026-12-01' }],
          nonConformities: [],
          previousAuditsAndAnswers: [],
          availableEvidences: [],
        },
      }),
    });
    const suggestFoundJson: any = await respSuggestFound.json();
    check(
      respSuggestFound.ok &&
        suggestFoundJson.success &&
        suggestFoundJson.sugestao?.validadaPelaQualidade === false &&
        suggestFoundJson.sugestao?.fontesEncontradas?.some((f: any) => f.codigo === 'PTM-04'),
      'Sugestão SGQ citou documento real PTM-04 e manteve validadaPelaQualidade = false'
    );

    const respSuggestMissing = await fetch(`${baseUrl}/suggest-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_impacto_aviation',
        audit: { nome: 'Auditoria EASA', entidade: 'EASA', tipo: 'EASA', dataAuditoria: '2026-08-10' },
        item: {
          numeroItem: '9.9',
          perguntaOriginal: 'Existe procedimento específico para operações suborbitais experimentais?',
          referenciaNormativa: 'XYZ-999',
        },
        sgqContext: {
          documentosControlados: [],
          manuals: [],
          trainingRecords: [],
          qualifications: [],
          ferramentasCalibradas: [],
          nonConformities: [],
          previousAuditsAndAnswers: [],
          availableEvidences: [],
        },
      }),
    });
    const suggestMissingJson: any = await respSuggestMissing.json();
    check(
      respSuggestMissing.ok &&
        suggestMissingJson.sugestao?.informacaoInsuficiente === true &&
        String(suggestMissingJson.sugestao?.respostaSugerida || '').includes('INFORMAÇÃO NÃO ENCONTRADA'),
      'Retorna INFORMAÇÃO NÃO ENCONTRADA quando base SGQ não possui dados suficientes (anti-alucinação)'
    );

    // 3f. Priorização de manuais internos (MOMQ/PTM) com citação de capítulo e texto escrito do procedimento sobre normas externas (RBAC 145)
    const respSuggestManualChapter = await fetch(`${baseUrl}/suggest-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_impacto_aviation',
        audit: { nome: 'Auditoria ANAC', entidade: 'ANAC', tipo: 'ANAC', dataAuditoria: '2026-07-15' },
        item: {
          numeroItem: '5.1',
          perguntaOriginal: 'Como a oficina realiza a gestão e controle centralizado de calibração de ferramentas e instrumentos?',
          referenciaNormativa: 'RBAC 145.109(b)',
        },
        sgqContext: {
          documentosControlados: [
            {
              codigo: 'RBAC 145',
              titulo: 'Regulamento Brasileiro da Aviação Civil - Organizações de Manutenção',
              categoria: 'NORMA_EXTERNA',
              tipoOrigemDocumental: 'EXTERNO',
              emissor: 'ANAC',
              numeroRevisao: 'Emenda 07',
              statusGeral: 'VIGENTE',
            },
            {
              codigo: 'MOMQ',
              titulo: 'Manual da Organização de Manutenção da Qualidade',
              categoria: 'DOCUMENTO_INTERNO',
              tipoOrigemDocumental: 'INTERNO',
              proprietario: 'IMPACTO Aviation MRO',
              numeroRevisao: 'Rev. 14',
              statusGeral: 'VIGENTE',
            },
          ],
          manuals: [
            {
              codigo: 'RBAC 145',
              titulo: 'Regulamento Brasileiro da Aviação Civil - Organizações de Manutenção',
              tipoDocumento: 'Documento Normativo Oficial',
              orgaoRegulador: 'ANAC',
              revisao: 'Emenda 07',
              status: 'VIGENTE',
              conteudoTexto: '145.109(b) A organização deve assegurar calibração rastreável de equipamentos.',
              capitulos: [
                {
                  numero: '145.109(b)',
                  titulo: 'Equipamentos e Ferramentas',
                  requisitoTexto: 'Exigência regulatória de calibração rastreável para oficina certificada.',
                  palavrasChave: ['calibracao', 'ferramentas'],
                },
              ],
            },
            {
              codigo: 'MOMQ',
              titulo: 'Manual da Organização de Manutenção da Qualidade',
              tipoDocumento: 'Manual Interno',
              proprietario: 'IMPACTO Aviation MRO',
              revisao: 'Rev. 14',
              status: 'VIGENTE',
              conteudoTexto:
                'CAPÍTULO 3 — CONTROLE METROLÓGICO\n3.4.3 Gestão e Controle Centralizado de Calibração: O Controle da Qualidade mantém o registro mestre de todas as ferramentas calibradas, emitindo alertas 30 dias antes do vencimento e segregando instrumentos vencidos em armário lacrado.',
              capitulos: [
                {
                  numero: '3.4.3',
                  titulo: 'Gestão e Controle Centralizado de Calibração',
                  requisitoTexto:
                    'O Controle da Qualidade mantém o registro mestre de todas as ferramentas calibradas, emitindo alertas 30 dias antes do vencimento e segregando instrumentos vencidos em armário lacrado.',
                  palavrasChave: ['calibracao', 'ferramentas', 'instrumentos', 'gestao'],
                },
              ],
            },
          ],
          revisoesDocumentais: [],
          trainingRecords: [],
          qualifications: [],
          ferramentasCalibradas: [],
          nonConformities: [],
          previousAuditsAndAnswers: [],
          availableEvidences: [],
        },
      }),
    });
    const suggestChapterJson: any = await respSuggestManualChapter.json();
    const textoSugerido = String(suggestChapterJson.sugestao?.respostaSugerida || '');
    const fontes = suggestChapterJson.sugestao?.fontesEncontradas || [];
    const idxMomq = textoSugerido.indexOf('MOMQ');
    const idxRbac = textoSugerido.indexOf('RBAC 145');
    check(
      respSuggestManualChapter.ok &&
        suggestChapterJson.success &&
        textoSugerido.includes('MOMQ') &&
        textoSugerido.includes('3.4.3') &&
        textoSugerido.includes('segregando instrumentos vencidos') &&
        (idxRbac === -1 || (idxMomq !== -1 && idxMomq < idxRbac)) &&
        fontes[0]?.codigo === 'MOMQ',
      'Prioriza manual interno da empresa (MOMQ) sobre norma externa (RBAC 145) citando capítulo 3.4.3 e texto do procedimento'
    );

    // 3g. Comparação automática de perguntas idênticas ou equivalentes ao importar nova lista
    const prevAudit: AuditoriaPreparacao = {
      id: 'AUD-OLD',
      organizationId: 'org_impacto_aviation',
      nome: 'Auditoria ANAC Anterior',
      entidade: 'ANAC',
      tipo: 'ANAC',
      dataAuditoria: '2026-01-15',
      responsavelPreparacao: 'Gestor SGQ',
      status: 'CONCLUIDA',
      arquivada: false,
      criadoPorUid: 'u1',
      criadoPorNome: 'Qualidade',
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-01-15T09:00:00Z',
    };
    const matcherCandidates = buildPreviousItemCandidates([prevAudit], [
      { ...sampleItems[0], auditId: 'AUD-OLD' },
      { ...sampleItems[1], auditId: 'AUD-OLD' }, // clique apenas em Conforme sem resposta textual
      { ...sampleItems[2], auditId: 'AUD-OLD' }, // pendente (não deve entrar como respondido)
    ]);
    check(
      matcherCandidates.length === 2,
      `buildPreviousItemCandidates incluiu item com texto e item clicado apenas como Conforme (excluiu pendente): ${matcherCandidates.length}`
    );

    const exactMatch = findBestQuestionMatch(
      {
        perguntaOriginal: 'A oficina mantém o MOMQ atualizado e acessível ao pessoal técnico?',
        referenciaNormativa: 'RBAC 145.207',
      },
      matcherCandidates
    );
    check(
      Boolean(exactMatch) && exactMatch?.score === 100 && exactMatch?.matchType === 'EXATA',
      'findBestQuestionMatch detecta pergunta idêntica com 100% (EXATA)'
    );

    const equivMatch = findBestQuestionMatch(
      {
        perguntaOriginal: 'Os equipamentos de medição possuem aferição vigente com rastreabilidade RBC?',
        referenciaNormativa: 'RBAC 145.109(b)',
      },
      matcherCandidates
    );
    check(
      Boolean(equivMatch) &&
        equivMatch?.candidate.itemNumero === '1.2' &&
        equivMatch?.candidate.situacao === 'ATENDIDO' &&
        equivMatch.score >= 58,
      `findBestQuestionMatch detecta equivalência aeronáutica com item clicado como Conforme (score: ${equivMatch?.score ?? 0}%)`
    );

    const respMatchEndpoint = await fetch(`${baseUrl}/match-previous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_impacto_aviation',
        importedItems: [
          {
            tempId: 'IMP-1',
            numeroItem: '10.1',
            perguntaOriginal: 'A oficina mantém o MOMQ atualizado e acessível ao pessoal técnico?',
            referenciaNormativa: 'RBAC 145.207',
          },
          {
            tempId: 'IMP-2',
            numeroItem: '10.2',
            perguntaOriginal: 'Os equipamentos de medição possuem aferição vigente com rastreabilidade RBC?',
            referenciaNormativa: 'RBAC 145.109(b)',
          },
          {
            tempId: 'IMP-EN-1',
            numeroItem: '10.3',
            perguntaOriginal: 'Does the repair station maintain current Quality Control Manual (QCM) accessible to technical personnel?',
            referenciaNormativa: '',
          },
          {
            tempId: 'IMP-EN-2',
            numeroItem: '10.4',
            perguntaOriginal: 'Are torque wrenches and measuring tools calibrated and traceable to national standards?',
            referenciaNormativa: '',
          },
          {
            tempId: 'IMP-ES-1',
            numeroItem: '10.5',
            perguntaOriginal: '¿Los equipos de medición y herramientas tienen calibración vigente y trazable?',
            referenciaNormativa: '',
          },
        ],
        candidates: matcherCandidates,
      }),
    });
    const matchEndpointJson: any = await respMatchEndpoint.json();
    check(
      respMatchEndpoint.ok &&
        matchEndpointJson.success &&
        matchEndpointJson.matches?.['IMP-1']?.score === 100 &&
        matchEndpointJson.matches?.['IMP-2']?.candidateKey === 'PREP-IT-2',
      'Endpoint POST /api/audit-prep/match-previous retorna correspondências exata e equivalente para importação'
    );
    check(
      matchEndpointJson.matches?.['IMP-EN-1']?.candidateKey === 'PREP-IT-1' &&
        matchEndpointJson.matches?.['IMP-EN-2']?.candidateKey === 'PREP-IT-2' &&
        matchEndpointJson.matches?.['IMP-ES-1']?.candidateKey === 'PREP-IT-2',
      `Endpoint POST /api/audit-prep/match-previous identifica equivalência entre idiomas (EN->PT: ${matchEndpointJson.matches?.['IMP-EN-1']?.score ?? 0}% / ${matchEndpointJson.matches?.['IMP-EN-2']?.score ?? 0}%, ES->PT: ${matchEndpointJson.matches?.['IMP-ES-1']?.score ?? 0}%)`
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 4. Geração Real de Relatório Word (.docx) e PDF (.pdf)
  console.log('\n4. Geração Real de Relatórios Word (.docx) e PDF (.pdf)');
  const sampleAudit: AuditoriaPreparacao = {
    id: 'AUD-1',
    organizationId: 'org_impacto_aviation',
    nome: 'Auditoria de Renovação RBAC 145',
    entidade: 'ANAC',
    tipo: 'ANAC',
    dataAuditoria: '2026-07-15',
    periodo: '15/07/2026 a 17/07/2026',
    responsavelPreparacao: 'Gestor da Qualidade IMPACTO',
    observacoes: 'Escopo células e motores.',
    status: 'EM_PREPARACAO',
    arquivada: false,
    criadoPorUid: 'u1',
    criadoPorNome: 'Qualidade',
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-01T09:00:00Z',
  };

  const docxBuffer = await buildAuditPrepDocxBuffer(sampleAudit, sampleItems, 'IMPACTO AVIATION MRO');
  check(
    docxBuffer.length > 2000 && docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b,
    `Word (.docx) gerado com assinatura ZIP/DOCX válida (${docxBuffer.length} bytes)`
  );

  const pdfReport = buildAuditPrepPdf(sampleAudit, sampleItems, 'IMPACTO AVIATION MRO');
  const pdfOut = pdfReport.output('arraybuffer');
  const pdfHeader = Buffer.from(pdfOut).subarray(0, 5).toString('utf8');
  check(
    pdfOut.byteLength > 1500 && pdfHeader === '%PDF-',
    `PDF gerado com assinatura %PDF- válida (${pdfOut.byteLength} bytes)`
  );

  // 5. Verificação de Limpeza Estrutural e Firestore Rules
  console.log('\n5. Verificação de Limpeza de Menus, Rotas e Regras Firestore');
  const navText = fs.readFileSync(path.resolve('src/config/navigationRegistry.ts'), 'utf8');
  const routerText = fs.readFileSync(path.resolve('src/components/app/AppViewRouter.tsx'), 'utf8');
  const rulesText = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

  check(
    navText.includes("label: 'Central de Preparação para Auditorias'") &&
      !navText.includes("id: 'biblioteca-checklists'") &&
      !navText.includes("id: 'biblioteca-requisitos'"),
    'navigationRegistry.ts consolidou na Central de Preparação para Auditorias e removeu menus legados'
  );
  check(
    routerText.includes('AuditPreparationCenterView') &&
      !routerText.includes('RequirementsLibraryView') &&
      !routerText.includes('AuditChecklistsLibraryView'),
    'AppViewRouter.tsx aponta todas as rotas legadas para AuditPreparationCenterView'
  );
  check(
    !fs.existsSync(path.resolve('src/components/RequirementsLibraryView.tsx')) &&
      !fs.existsSync(path.resolve('src/components/requirements')) &&
      !fs.existsSync(path.resolve('src/components/checklists')),
    'Componentes legados obsoletos (RequirementsLibraryView, requirements/, checklists/) removidos'
  );
  check(
    rulesText.includes('/audit_preparations/{auditId}') &&
      rulesText.includes('/audit_preparation_items/{itemId}'),
    'firestore.rules protege audit_preparations e audit_preparation_items com RBAC'
  );

  console.log(`\nResultado: ${passed} aprovados | ${failed} falharam.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Erro inesperado nos testes:', err);
  process.exit(1);
});
