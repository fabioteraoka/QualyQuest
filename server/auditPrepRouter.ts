import express from "express";
import crypto from "crypto";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Type } from "@google/genai";
import {
  getGeminiClient,
  executeGeminiRequest,
} from "./gemini/index.ts";
import { findBestQuestionMatch } from "../src/utils/auditPrepMatcher.ts";
import type { PreviousItemCandidate } from "../src/utils/auditPrepMatcher.ts";

export interface ParsedAuditPrepItem {
  numeroItem: string;
  perguntaOriginal: string;
  referenciaNormativa: string;
}

const AUDIT_PREP_ITEMS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    itens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numeroItem: { type: Type.STRING },
          perguntaOriginal: { type: Type.STRING },
          referenciaNormativa: { type: Type.STRING },
        },
        required: ["numeroItem", "perguntaOriginal"],
      },
    },
  },
  required: ["itens"],
};

const AUDIT_PREP_SUGGESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    respostaSugerida: { type: Type.STRING },
    informacaoInsuficiente: { type: Type.BOOLEAN },
    fontesEncontradas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tipo: { type: Type.STRING },
          codigo: { type: Type.STRING },
          titulo: { type: Type.STRING },
          revisao: { type: Type.STRING },
          observacao: { type: Type.STRING },
        },
        required: ["tipo", "codigo", "titulo", "revisao"],
      },
    },
    lacunasOuFaltantes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    conflitosOuDivergencias: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    "respostaSugerida",
    "informacaoInsuficiente",
    "fontesEncontradas",
    "lacunasOuFaltantes",
    "conflitosOuDivergencias",
  ],
};

const AUDIT_PREP_MATCH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tempId: { type: Type.STRING },
          candidateKey: { type: Type.STRING },
          score: { type: Type.NUMBER },
          justificativa: { type: Type.STRING },
        },
        required: ["tempId", "candidateKey", "score", "justificativa"],
      },
    },
  },
  required: ["matches"],
};

async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfParseMod: any = await import("pdf-parse");
    if (typeof pdfParseMod.PDFParse === "function") {
      const parser = new pdfParseMod.PDFParse({ data: buffer });
      try {
        const res = await parser.getText();
        const txt = typeof res === "string" ? res : res?.text || "";
        return String(txt).trim();
      } finally {
        if (typeof parser.destroy === "function") {
          await parser.destroy().catch(() => {});
        }
      }
    }
    const legacyFn = pdfParseMod.default || pdfParseMod;
    if (typeof legacyFn === "function") {
      const data = await legacyFn(buffer);
      return String(data?.text || "").trim();
    }
    return "";
  } catch (err: any) {
    console.warn("[auditPrepRouter] Aviso ao extrair texto PDF:", err?.message || err);
    return "";
  }
}

async function extractDocxTextFromBuffer(buffer: Buffer): Promise<string> {
  try {
    const res = await mammoth.extractRawText({ buffer });
    return String(res?.value || "").trim();
  } catch (err: any) {
    console.warn("[auditPrepRouter] Aviso ao extrair texto DOCX:", err?.message || err);
    return "";
  }
}

function parseSpreadsheetBuffer(buffer: Buffer): {
  items: ParsedAuditPrepItem[];
  rawText: string;
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const items: ParsedAuditPrepItem[] = [];
  const textParts: string[] = [];

  for (const sheetName of workbook.SheetNames || []) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
      raw: false,
    });
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      textParts.push(`--- ABA: ${sheetName} ---\n${csv}`);
    }

    if (!rows || rows.length === 0) continue;

    // Detecção determinística de colunas comuns de checklists
    const keys = Object.keys(rows[0] || {});
    const findKey = (patterns: RegExp[]) =>
      keys.find((k) => patterns.some((p) => p.test(k.toLowerCase())));

    const numKey = findKey([
      /^item$/,
      /n[úu]mero/,
      /n[ºo°]/,
      /c[óo]digo/,
      /question\s*#/,
      /ref\.?\s*item/,
      /id/,
    ]);
    const perguntaKey = findKey([
      /pergunta/,
      /requisito/,
      /quest[ãa]o/,
      /crit[ée]rio/,
      /descri[çc][ãa]o/,
      /question/,
      /requirement/,
      /audit\s*item/,
      /check/,
      /texto/,
    ]);
    const refKey = findKey([
      /refer[êe]ncia/,
      /norma/,
      /rbac/,
      /easa/,
      /faa/,
      /iosa/,
      /momq/,
      /manual/,
      /documento/,
      /regulation/,
      /reference/,
      /clause/,
    ]);

    if (perguntaKey) {
      rows.forEach((row, idx) => {
        const pergunta = String(row[perguntaKey] ?? "").trim();
        if (!pergunta || pergunta.length < 4) return;
        const numeroRaw = numKey ? String(row[numKey] ?? "").trim() : "";
        const refRaw = refKey ? String(row[refKey] ?? "").trim() : "";
        items.push({
          numeroItem: numeroRaw || String(items.length + 1),
          perguntaOriginal: pergunta,
          referenciaNormativa: refRaw,
        });
      });
    } else {
      // Caso a planilha não tenha cabeçalho padronizado, lê matriz de células
      const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,
        defval: "",
      });
      matrix.forEach((row, rowIdx) => {
        if (!Array.isArray(row)) return;
        const cells = row.map((c) => String(c ?? "").trim()).filter(Boolean);
        if (cells.length === 0) return;
        if (rowIdx === 0 && cells.every((c) => c.length < 40)) return;
        const longest = cells.reduce((a, b) => (b.length > a.length ? b : a), "");
        if (longest.length < 8) return;
        const first = cells[0];
        const num =
          first !== longest && first.length <= 20 ? first : String(items.length + 1);
        const refCandidate = cells.find(
          (c) =>
            c !== longest &&
            c !== num &&
            /(rbac|easa|faa|iosa|14\s*cfr|momq|ptm|iso|is\s*\d|amm|gmm)/i.test(c)
        );
        items.push({
          numeroItem: num,
          perguntaOriginal: longest,
          referenciaNormativa: refCandidate || "",
        });
      });
    }
  }

  return { items, rawText: textParts.join("\n\n") };
}

function parsePlainTextChecklist(fullText: string): ParsedAuditPrepItem[] {
  const lines = fullText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ParsedAuditPrepItem[] = [];
  let current: ParsedAuditPrepItem | null = null;

  const extractRefFromLine = (txt: string): string => {
    const matches = txt.match(
      /(RBAC\s*\d+(?:\.\d+)*(?:\([a-z0-9]+\))?|14\s*CFR\s*\d+(?:\.\d+)*|EASA\s*Part[- ]?\d+(?:\.[A-Z0-9\.]+)?|IOSA\s*[A-Z]{2,4}\s*\d+(?:\.\d+)*|MOMQ[\s\-A-Z0-9\.]*|IS\s*\d+[\-\dA-Z]*|GMM[\s\d\.]*)/gi
    );
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))).join("; ") : "";
  };

  for (const line of lines) {
    const match = line.match(
      /^(?:Item\s+)?(\d+(?:\.\d+){0,3}|[A-Z]{1,3}[\.\-]\d+(?:\.\d+)?)\s*[\)\.\:\-\s]+(.+)$/i
    );
    if (match && match[2].trim().length >= 5) {
      if (current) {
        if (!current.referenciaNormativa) {
          current.referenciaNormativa = extractRefFromLine(current.perguntaOriginal);
        }
        items.push(current);
      }
      const numeroItem = match[1].trim();
      const perguntaOriginal = match[2].trim();
      current = {
        numeroItem,
        perguntaOriginal,
        referenciaNormativa: extractRefFromLine(perguntaOriginal),
      };
    } else if (current && line.length > 2) {
      current.perguntaOriginal = `${current.perguntaOriginal} ${line}`.trim();
    }
  }

  if (current) {
    if (!current.referenciaNormativa) {
      current.referenciaNormativa = extractRefFromLine(current.perguntaOriginal);
    }
    items.push(current);
  }

  return items;
}

function normalizeSearchText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const STOP_WORDS = new Set([
  "para", "como", "com", "que", "dos", "das", "nos", "nas", "uma", "uns", "umas",
  "por", "pela", "pelo", "pelas", "pelos", "sobre", "entre", "esta", "este", "essa",
  "esse", "isso", "isto", "qual", "quais", "onde", "quando", "existe", "existem",
  "possui", "possuem", "mantem", "manter", "todos", "todas", "cada", "deve", "devem",
  "the", "and", "for", "with", "that", "this", "from", "are", "have", "has", "does",
]);

function normalizeTokens(text: string): string[] {
  return normalizeSearchText(text)
    .replace(/[^a-z0-9\.\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

interface ExtractedChapterSection {
  numero: string;
  titulo: string;
  texto: string;
  palavrasChave?: string[];
}

function isInternalCompanyDoc(doc: {
  codigo?: string;
  titulo?: string;
  categoria?: string;
  tipoDocumento?: string;
  tipoOrigemDocumental?: string;
  origemRevisao?: string;
  proprietario?: string;
  emissor?: string;
  orgaoRegulador?: string;
  fonte?: string;
}): boolean {
  const code = String(doc.codigo || "").trim();
  const tipoDoc = normalizeSearchText(doc.tipoDocumento || "");
  const categoria = normalizeSearchText(doc.categoria || "");
  const origemDoc = normalizeSearchText(doc.tipoOrigemDocumental || "");
  const origemRev = normalizeSearchText(doc.origemRevisao || "");
  const owner = normalizeSearchText(
    `${doc.proprietario || ""} ${doc.emissor || ""} ${doc.fonte || ""}`
  );
  const reg = normalizeSearchText(doc.orgaoRegulador || "");

  if (
    categoria === "documento_interno" ||
    origemDoc === "interno" ||
    origemRev === "interna" ||
    tipoDoc.includes("manual interno") ||
    tipoDoc.includes("procedimento") ||
    tipoDoc.includes("instrucao")
  ) {
    return true;
  }

  if (
    /^(rbac|iso|nbr|abnt|14\s*cfr|cfr|easa|faa\s*order|iosa|is\s*\d|ac\s*\d)/i.test(code) &&
    !/(supplement|suplemento)/i.test(code)
  ) {
    return false;
  }

  if (
    /^(momq|moe|mgq|sgso|ptm|pop|it[\s\-]|pol[\s\-]|seg[\s\-]|pro[\s\-]|man[\s\-]|f\s*001)/i.test(
      code
    ) ||
    owner.includes("impacto") ||
    reg.includes("sgq interno")
  ) {
    return true;
  }

  if (
    tipoDoc.includes("normativo oficial") ||
    /^(anac|abnt|iso|faa|easa|iata)$/i.test(reg.trim())
  ) {
    return false;
  }

  return owner.includes("interno");
}

function extractSectionsFromRawText(rawText: string): ExtractedChapterSection[] {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const sections: ExtractedChapterSection[] = [];
  let currentChapter = "";
  let currentSection: ExtractedChapterSection | null = null;

  const pushCurrent = () => {
    if (currentSection && currentSection.texto.trim().length >= 15) {
      sections.push({
        numero: currentSection.numero,
        titulo: currentSection.titulo,
        texto: currentSection.texto.trim().slice(0, 750),
      });
    }
    currentSection = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Cabeçalho de Capítulo: "Capítulo 3 - Controle de Ferramentas..."
    const chapMatch = line.match(/^(?:Cap[íi]tulo|Chapter|Parte|Se[çc][ãa]o)\s+([0-9A-Z]+(?:\.\d+)*)\s*[-–:\.]\s*(.+)$/i);
    if (chapMatch) {
      currentChapter = `Cap. ${chapMatch[1]} (${chapMatch[2].trim()})`;
      // Se for uma Seção/Subseção direta com conteúdo, também inicia bloco
      if (/^Se[çc][ãa]o/i.test(line)) {
        pushCurrent();
        currentSection = {
          numero: chapMatch[1].trim(),
          titulo: chapMatch[2].trim(),
          texto: "",
        };
      }
      continue;
    }

    // Subseção numerada: "3.4.3 Gestão e Controle...: texto..." ou "3.4.3 - Título: texto"
    const subMatch = line.match(
      /^(\d+(?:\.\d+){1,3})\s*[-–:\.]?\s+([^:]{3,90}?)(?:\s*:\s*(.+))?$/
    );
    if (subMatch && subMatch[2].trim().length >= 4) {
      const secNum = subMatch[1].trim();
      const rawRest = (subMatch[3] || "").trim();
      const rawTitle = subMatch[2].trim();
      const looksLikeHeading =
        rawRest.length > 0 ||
        (rawTitle.length <= 75 && !/[.!?]$/.test(rawTitle));

      if (looksLikeHeading) {
        pushCurrent();
        currentSection = {
          numero: currentChapter ? `${currentChapter} · ${secNum}` : secNum,
          titulo: rawTitle,
          texto: rawRest,
        };
        continue;
      }
    }

    if (currentSection) {
      currentSection.texto = `${currentSection.texto} ${line}`.trim();
    } else if (line.length >= 25) {
      currentSection = {
        numero: currentChapter || "Geral",
        titulo: "Disposição do Manual",
        texto: line,
      };
    }
  }
  pushCurrent();

  return sections;
}

function findMatchingSectionsForDoc(
  structuredChapters: any[] | undefined,
  rawText: string | undefined,
  tokens: string[],
  queryNorm: string
): Array<ExtractedChapterSection & { score: number }> {
  const candidates: ExtractedChapterSection[] = [];

  if (Array.isArray(structuredChapters)) {
    for (const c of structuredChapters) {
      if (!c) continue;
      const num = String(c.numero || c.secao || c.capitulo || "").trim();
      const titulo = String(c.titulo || c.capituloTitulo || "").trim();
      const texto = String(c.requisitoTexto || c.conteudo || "").trim();
      if (!num && !titulo && !texto) continue;
      candidates.push({
        numero: num || "Seção",
        titulo: titulo || "Disposição",
        texto,
        palavrasChave: Array.isArray(c.palavrasChave) ? c.palavrasChave : undefined,
      });
    }
  }

  const parsedFromText = extractSectionsFromRawText(rawText || "");
  for (const s of parsedFromText) {
    // Evita duplicar se já existe seção estruturada com mesmo número e texto parecido
    const alreadyExists = candidates.some(
      (c) =>
        c.numero === s.numero ||
        (s.numero.includes(c.numero) && c.numero.length >= 3)
    );
    if (!alreadyExists) {
      candidates.push(s);
    } else {
      // Se o texto estruturado for mais curto que o texto integral extraído da mesma seção, enriquece
      const idx = candidates.findIndex(
        (c) => c.numero === s.numero || (s.numero.includes(c.numero) && c.numero.length >= 3)
      );
      if (idx >= 0 && s.texto.length > candidates[idx].texto.length + 30) {
        candidates[idx] = {
          ...candidates[idx],
          numero: s.numero,
          texto: s.texto,
        };
      }
    }
  }

  const scored: Array<ExtractedChapterSection & { score: number }> = [];
  for (const sec of candidates) {
    const searchable = normalizeSearchText(
      `${sec.numero} ${sec.titulo} ${sec.texto} ${(sec.palavrasChave || []).join(" ")}`
    );
    let score = 0;
    for (const tk of tokens) {
      if (searchable.includes(tk)) {
        score += 1;
        if (normalizeSearchText(sec.titulo).includes(tk)) score += 0.5;
        if ((sec.palavrasChave || []).some((kw) => normalizeSearchText(kw).includes(tk))) {
          score += 0.5;
        }
      }
    }
    const numOnly = sec.numero.replace(/^Cap\.\s*[^·]+·\s*/i, "").trim().toLowerCase();
    if (numOnly.length >= 3 && queryNorm.includes(numOnly)) {
      score += 4;
    }
    if (score >= 1) {
      scored.push({ ...sec, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 2);
}

function buildDeterministicSGQSuggestion(item: any, _audit: any, sgqContext: any) {
  const queryText = `${item?.numeroItem || ""} ${item?.perguntaOriginal || ""} ${item?.referenciaNormativa || ""}`;
  const queryNorm = normalizeSearchText(queryText);
  const tokens = normalizeTokens(queryText);

  const fontesEncontradas: Array<{
    tipo: "PROCEDIMENTO_NORMA" | "EVIDENCIA_REGISTRO" | "AUDITORIA_ANTERIOR";
    codigo: string;
    titulo: string;
    revisao: string;
    observacao?: string;
  }> = [];

  const docs = Array.isArray(sgqContext?.documentosControlados)
    ? sgqContext.documentosControlados
    : [];
  const revisoes = Array.isArray(sgqContext?.revisoesDocumentais)
    ? sgqContext.revisoesDocumentais
    : [];
  const manuals = Array.isArray(sgqContext?.manuals) ? sgqContext.manuals : [];
  const trainings = Array.isArray(sgqContext?.trainingRecords)
    ? sgqContext.trainingRecords
    : [];
  const qualifications = Array.isArray(sgqContext?.qualifications)
    ? sgqContext.qualifications
    : [];
  const tools = Array.isArray(sgqContext?.ferramentasCalibradas)
    ? sgqContext.ferramentasCalibradas
    : [];
  const ncs = Array.isArray(sgqContext?.nonConformities)
    ? sgqContext.nonConformities
    : [];
  const previousAnswers = Array.isArray(sgqContext?.previousAuditsAndAnswers)
    ? sgqContext.previousAuditsAndAnswers
    : [];
  const evidences = Array.isArray(sgqContext?.availableEvidences)
    ? sgqContext.availableEvidences
    : [];

  const scoreMatch = (target: string): number => {
    const lower = normalizeSearchText(target);
    let hits = 0;
    for (const tk of tokens) {
      if (lower.includes(tk)) hits++;
    }
    return hits;
  };

  interface MatchedDocDetail {
    score: number;
    isInternal: boolean;
    codigo: string;
    titulo: string;
    revisao: string;
    status?: string;
    sections: Array<ExtractedChapterSection & { score: number }>;
    fallbackExcerpt?: string;
  }

  const matchedDocsByCode = new Map<string, MatchedDocDetail>();

  const registerDocCandidate = (cand: MatchedDocDetail) => {
    const key = cand.codigo.toUpperCase();
    const prev = matchedDocsByCode.get(key);
    if (!prev) {
      matchedDocsByCode.set(key, cand);
      return;
    }
    // Mescla priorizando quem tem capítulos/seções e maior score
    const mergedSections = [...prev.sections, ...cand.sections]
      .sort((a, b) => b.score - a.score)
      .filter(
        (s, idx, arr) =>
          arr.findIndex((x) => x.numero === s.numero && x.titulo === s.titulo) === idx
      )
      .slice(0, 2);
    matchedDocsByCode.set(key, {
      ...prev,
      score: Math.max(prev.score, cand.score),
      isInternal: prev.isInternal || cand.isInternal,
      revisao: prev.revisao !== "Revisão não informada" ? prev.revisao : cand.revisao,
      sections: mergedSections,
      fallbackExcerpt: prev.fallbackExcerpt || cand.fallbackExcerpt,
    });
  };

  // 1a. Manuais (contêm capítulos estruturados e texto integral)
  for (const m of manuals) {
    const isInternal = isInternalCompanyDoc(m);
    const matchingSections = findMatchingSectionsForDoc(
      m.capitulos,
      m.conteudoTexto,
      tokens,
      queryNorm
    );
    const metaScore = scoreMatch(
      `${m.codigo || ""} ${m.titulo || ""} ${m.descricaoResumo || ""} ${m.conteudoTexto || ""}`
    );
    const sectionBoost = matchingSections.length > 0 ? matchingSections[0].score * 2 : 0;
    const totalScore = metaScore + sectionBoost + (isInternal ? 3 : 0);

    if (metaScore >= 1 || matchingSections.length > 0) {
      registerDocCandidate({
        score: totalScore,
        isInternal,
        codigo: String(m.codigo || m.id || "MANUAL"),
        titulo: String(m.titulo || "Manual SGQ"),
        revisao: String(m.revisao || "Revisão não informada"),
        status: m.status,
        sections: matchingSections,
        fallbackExcerpt: m.descricaoResumo ? String(m.descricaoResumo) : undefined,
      });
    }
  }

  // 1b. Revisões Documentais (Acervo com texto integral ou capítulos indexados)
  for (const rv of revisoes) {
    const matchingSections = findMatchingSectionsForDoc(
      rv.capitulosIndexados,
      rv.conteudoTextoIntegral,
      tokens,
      queryNorm
    );
    const metaScore = scoreMatch(
      `${rv.codigoDocumento || ""} ${rv.tituloDocumento || ""} ${rv.escopoAlteracoes || ""} ${rv.conteudoTextoIntegral || ""}`
    );
    const isInternal = isInternalCompanyDoc({
      codigo: rv.codigoDocumento,
      titulo: rv.tituloDocumento,
      origemRevisao: rv.origemRevisao,
    });
    if (metaScore >= 1 || matchingSections.length > 0) {
      registerDocCandidate({
        score: metaScore + (matchingSections[0]?.score || 0) * 2 + (isInternal ? 3 : 0),
        isInternal,
        codigo: String(rv.codigoDocumento || "DOC"),
        titulo: String(rv.tituloDocumento || "Documento Controlado"),
        revisao: String(rv.numeroRevisao || "Revisão não informada"),
        sections: matchingSections,
        fallbackExcerpt: rv.escopoAlteracoes ? String(rv.escopoAlteracoes) : undefined,
      });
    }
  }

  // 1c. Documentos Controlados (Master List)
  for (const d of docs) {
    const isInternal = isInternalCompanyDoc(d);
    const metaScore = scoreMatch(
      `${d.codigo || ""} ${d.titulo || ""} ${d.categoria || ""} ${d.tipoSubcategoria || ""} ${d.aplicabilidade || ""} ${d.detalhes || ""}`
    );
    if (metaScore >= 1) {
      registerDocCandidate({
        score: metaScore + (isInternal ? 3 : 0),
        isInternal,
        codigo: String(d.codigo || d.id || "DOC"),
        titulo: String(d.titulo || "Documento Controlado"),
        revisao: String(d.numeroRevisao || "Revisão não informada"),
        status: d.statusGeral,
        sections: [],
        fallbackExcerpt: d.aplicabilidade || d.detalhes || undefined,
      });
    }
  }

  const allMatchedDocs = Array.from(matchedDocsByCode.values());
  const internalDocMatches = allMatchedDocs
    .filter((d) => d.isInternal)
    .sort((a, b) => b.score - a.score);
  const authorityDocMatches = allMatchedDocs
    .filter((d) => !d.isInternal)
    .sort((a, b) => b.score - a.score);

  // Prioriza estritamente os manuais e procedimentos da IMPACTO; usa normas externas apenas se não houver interno ou 1 complementar
  const selectedDocs =
    internalDocMatches.length > 0
      ? [...internalDocMatches.slice(0, 3), ...authorityDocMatches.slice(0, 1)]
      : authorityDocMatches.slice(0, 2);

  selectedDocs.forEach((dm) => {
    const capSummary =
      dm.sections.length > 0
        ? dm.sections.map((s) => `Cap./Seção ${s.numero} — ${s.titulo}`).join(" | ")
        : dm.status
        ? `Situação documental: ${dm.status}`
        : undefined;

    fontesEncontradas.push({
      tipo: "PROCEDIMENTO_NORMA",
      codigo: dm.codigo,
      titulo: dm.titulo,
      revisao: dm.revisao,
      observacao: capSummary,
    });
  });

  // 2. Evidências e Registros operacionais reais
  const lowerQuery = queryText.toLowerCase();
  if (
    tools.length > 0 &&
    /(calibr|ferrament|torque|metrol|instrument|tool|rbc)/i.test(lowerQuery)
  ) {
    const validTools = tools.filter(
      (t: any) => t.status === "CALIBRADA" || t.status === "VALIDA" || t.dataProximaCalibracao
    );
    fontesEncontradas.push({
      tipo: "EVIDENCIA_REGISTRO",
      codigo: "METROLOGIA-SGQ",
      titulo: `Cadastro de Ferramental Calibrado (${tools.length} instrumento(s) no módulo Metrologia; ${validTools.length} com registro de calibração)`,
      revisao: "Registro vivo",
    });
  }
  if (
    (trainings.length > 0 || qualifications.length > 0) &&
    /(trein|training|cht|licen|qualif|autoriz|rii|etops|ewis|fts|human|compet)/i.test(lowerQuery)
  ) {
    fontesEncontradas.push({
      tipo: "EVIDENCIA_REGISTRO",
      codigo: "PESSOAS-TREIN-SGQ",
      titulo: `Registros de Treinamento (${trainings.length}) e Qualificações/CHTs (${qualifications.length}) no módulo Pessoas & Treinamentos`,
      revisao: "Registro vivo",
    });
  }
  if (
    ncs.length > 0 &&
    /(nao conform|não conform|rnc|corretiva|preventiva|audit|finding|melhoria|sgq)/i.test(lowerQuery)
  ) {
    fontesEncontradas.push({
      tipo: "EVIDENCIA_REGISTRO",
      codigo: "RNC-SGQ",
      titulo: `${ncs.length} registro(s) de RNC (F 001-29) no módulo de Não Conformidades`,
      revisao: "Registro vivo",
    });
  }

  for (const ev of evidences) {
    const score = scoreMatch(`${ev.titulo || ""} ${ev.referencia || ""} ${ev.tipo || ""}`);
    if (score >= 1) {
      fontesEncontradas.push({
        tipo: "EVIDENCIA_REGISTRO",
        codigo: String(ev.referencia || ev.evidenciaId || "EVID"),
        titulo: String(ev.titulo || "Evidência cadastrada"),
        revisao: ev.dataValidade ? `Validade: ${ev.dataValidade}` : "Sem validade informada",
      });
    }
  }

  // 3. Auditorias anteriores
  const prevMatches: Array<{ score: number; p: any }> = [];
  for (const p of previousAnswers) {
    const score = scoreMatch(`${p.numeroItem || ""} ${p.pergunta || ""} ${p.referencia || ""}`);
    if (score >= 2 && p.resposta) {
      prevMatches.push({ score, p });
    }
  }
  prevMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .forEach(({ p }) => {
      fontesEncontradas.push({
        tipo: "AUDITORIA_ANTERIOR",
        codigo: String(p.itemNumero || p.numeroItem || "HIST"),
        titulo: `Auditoria anterior: ${p.auditNome || "Histórico"} (${p.entidade || "Cliente/Autoridade"})`,
        revisao: String(p.dataAuditoria || "Data não informada"),
      });
    });

  const lacunasOuFaltantes: string[] = [];
  const conflitosOuDivergencias: string[] = [];

  const hasProcedure = fontesEncontradas.some((f) => f.tipo === "PROCEDIMENTO_NORMA");
  const hasEvidence = fontesEncontradas.some((f) => f.tipo === "EVIDENCIA_REGISTRO");

  if (!hasProcedure) {
    lacunasOuFaltantes.push(
      "Nenhum manual ou procedimento interno da IMPACTO correspondente foi localizado automaticamente no módulo Documental."
    );
  } else if (internalDocMatches.length === 0) {
    lacunasOuFaltantes.push(
      "Apenas norma de autoridade foi localizada; confirme qual capítulo do manual interno da IMPACTO (ex.: MOMQ, MOE, PTM ou POP) implementa este requisito."
    );
  }
  if (!hasEvidence) {
    lacunasOuFaltantes.push(
      "Nenhum registro automático localizado no acervo (anexo de evidência é opcional caso seja verificação visual/inspeção direta)."
    );
  }

  const informacaoInsuficiente = fontesEncontradas.length === 0;

  let respostaSugerida = "";
  if (informacaoInsuficiente) {
    respostaSugerida =
      "INFORMAÇÃO NÃO ENCONTRADA — Não foram localizados manuais internos, procedimentos controlados, registros operacionais ou respostas anteriores compatíveis na base do QualyQuest para este requisito. Preencha manualmente após consultar a documentação aplicável ou registre sua avaliação.";
  } else {
    const parts: string[] = [];

    if (internalDocMatches.length > 0) {
      const internalLines = internalDocMatches.slice(0, 3).map((dm) => {
        if (dm.sections.length > 0) {
          const secDetails = dm.sections
            .map((s) => {
              const quote = s.texto
                ? `: "${s.texto.slice(0, 380)}${s.texto.length > 380 ? "..." : ""}"`
                : "";
              return `  - Cap./Seção ${s.numero} — ${s.titulo}${quote}`;
            })
            .join("\n");
          return `• ${dm.codigo} (${dm.revisao}) — ${dm.titulo}:\n${secDetails}`;
        }
        const resumo = dm.fallbackExcerpt ? ` — Escopo: ${dm.fallbackExcerpt}` : "";
        return `• ${dm.codigo} (${dm.revisao}) — ${dm.titulo}${resumo}`;
      });
      parts.push(
        `[Procedimentos e Manuais Internos da IMPACTO — descrição documental]:\n${internalLines.join("\n")}`
      );
    }

    if (authorityDocMatches.length > 0 && internalDocMatches.length === 0) {
      const authLines = authorityDocMatches.slice(0, 2).map((dm) => {
        if (dm.sections.length > 0) {
          const secDetails = dm.sections
            .map((s) => {
              const quote = s.texto
                ? `: "${s.texto.slice(0, 320)}${s.texto.length > 320 ? "..." : ""}"`
                : "";
              return `  - Seção ${s.numero} — ${s.titulo}${quote}`;
            })
            .join("\n");
          return `• ${dm.codigo} (${dm.revisao}) — ${dm.titulo}:\n${secDetails}`;
        }
        return `• ${dm.codigo} (${dm.revisao}) — ${dm.titulo}`;
      });
      parts.push(
        `[Norma de Referência Externa localizada — sem procedimento interno correspondente indexado]:\n${authLines.join("\n")}`
      );
    }

    const evidList = fontesEncontradas
      .filter((f) => f.tipo === "EVIDENCIA_REGISTRO")
      .map((f) => `${f.codigo} — ${f.titulo}`);
    const prevList = fontesEncontradas
      .filter((f) => f.tipo === "AUDITORIA_ANTERIOR")
      .map((f) => `${f.titulo} [${f.revisao}]`);

    if (evidList.length > 0) {
      parts.push(
        `[Evidências / Registros localizados no SGQ — comprovação de execução]: Foram identificados registros relacionados: ${evidList.join("; ")}.`
      );
    } else {
      parts.push(
        `[Evidências de execução]: Nenhum registro automático localizado no acervo para este item (anexo opcional para verificações visuais ou inspeções diretas).`
      );
    }
    if (prevList.length > 0) {
      parts.push(
        `[Referência de auditorias anteriores — requer validação de vigência]: ${prevList.join("; ")}.`
      );
    }
    respostaSugerida = parts.join("\n\n");
  }

  return {
    respostaSugerida,
    fontesEncontradas,
    lacunasOuFaltantes,
    conflitosOuDivergencias,
    informacaoInsuficiente,
    geradoEm: new Date().toISOString(),
    modeloUtilizado: "motor-deterministico-sgq",
    validadaPelaQualidade: false,
  };
}

export function createAuditPrepRouter(): express.Router {
  const router = express.Router();

  // 1. Extração de itens de checklist (XLSX, DOCX, PDF) preservando numeração e texto originais
  router.post("/parse-items", async (req, res) => {
    try {
      const { base64, nomeArquivo, formato, organizationId } = req.body || {};

      if (!nomeArquivo || typeof nomeArquivo !== "string" || !nomeArquivo.trim()) {
        return res.status(400).json({
          success: false,
          code: "SOURCE_REQUIRED",
          error: "É obrigatório informar uma fonte documental identificável (nome do arquivo) para importar itens.",
        });
      }

      if (!base64 || typeof base64 !== "string") {
        return res.status(400).json({
          success: false,
          code: "IMPORT_FAILED",
          error: "Conteúdo do arquivo não recebido para leitura.",
        });
      }

      const rawData = base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(rawData, "base64");
      if (buffer.length === 0) {
        return res.status(400).json({
          success: false,
          code: "IMPORT_FAILED",
          error: "Arquivo vazio.",
        });
      }

      const hashSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      const ext = String(formato || nomeArquivo.split(".").pop() || "")
        .trim()
        .toUpperCase();

      let extractedText = "";
      let deterministicItems: ParsedAuditPrepItem[] = [];

      if (["XLSX", "XLS", "CSV"].includes(ext)) {
        const parsed = parseSpreadsheetBuffer(buffer);
        deterministicItems = parsed.items;
        extractedText = parsed.rawText;
      } else if (ext === "DOCX") {
        extractedText = await extractDocxTextFromBuffer(buffer);
        deterministicItems = parsePlainTextChecklist(extractedText);
      } else if (ext === "PDF") {
        extractedText = await extractPdfTextFromBuffer(buffer);
        deterministicItems = parsePlainTextChecklist(extractedText);
      } else {
        return res.status(400).json({
          success: false,
          code: "UNSUPPORTED_FORMAT",
          error: `Formato "${ext}" não suportado. Utilize Excel (XLSX), Word (DOCX) ou PDF.`,
        });
      }

      if (
        deterministicItems.length === 0 &&
        (!extractedText || extractedText.trim().length < 15)
      ) {
        return res.status(422).json({
          success: false,
          code: "IMPORT_FAILED",
          error:
            "Não foi possível extrair texto legível do arquivo. Verifique se o PDF não é apenas imagem digitalizada ou se o arquivo não está protegido por senha.",
        });
      }

      // Para Excel com colunas claras, devolvemos a extração exata determinística sem alterar o texto original.
      if (["XLSX", "XLS", "CSV"].includes(ext) && deterministicItems.length > 0) {
        return res.json({
          success: true,
          nomeArquivo,
          formato: ext,
          hashSha256,
          origemExtracao: "PLANILHA_DETERMINISTICA",
          itens: deterministicItems,
        });
      }

      // Para Word/PDF (ou Excel não tabular), Gemini pode auxiliar na leitura preservando número e texto original
      const ai = getGeminiClient();
      if (ai && extractedText.trim().length >= 15) {
        const orgId =
          typeof organizationId === "string" && organizationId.trim()
            ? organizationId.trim()
            : "org_impacto_aviation";
        const snippet = extractedText.slice(0, 32000);
        const prompt = `Você é um extrator documental para auditorias aeronáuticas da IMPACTO Aviation MRO.
Leia o texto real extraído do arquivo "${nomeArquivo}" e identifique todas as perguntas ou requisitos presentes.

REGRAS INVIOLÁVEIS:
1. PRESERVE a numeração original exatamente como aparece no documento (campo "numeroItem").
2. PRESERVE o texto original da pergunta/requisito sem resumir ou inventar conteúdo (campo "perguntaOriginal").
3. Se houver referência normativa/documental explícita no item, informe em "referenciaNormativa"; caso contrário, retorne "".
4. NUNCA crie ou invente requisitos que não estejam literalmente presentes no texto abaixo. Se nenhum item for encontrado, retorne array vazio.

Texto extraído do documento "${nomeArquivo}":
"""
${snippet}
"""`;

        try {
          const response = await executeGeminiRequest<{ itens: ParsedAuditPrepItem[] }>({
            operation: "audit-prep-parse-items",
            contents: prompt,
            models: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
            config: {
              responseMimeType: "application/json",
              responseSchema: AUDIT_PREP_ITEMS_SCHEMA,
            },
            ttlMs: 12 * 60 * 60 * 1000,
            organizationId: orgId,
          });

          const aiItens = Array.isArray(response.parsed?.itens)
            ? response.parsed.itens
                .filter(
                  (it) =>
                    it &&
                    typeof it.perguntaOriginal === "string" &&
                    it.perguntaOriginal.trim().length >= 4
                )
                .map((it, idx) => ({
                  numeroItem: String(it.numeroItem || idx + 1).trim(),
                  perguntaOriginal: String(it.perguntaOriginal).trim(),
                  referenciaNormativa: String(it.referenciaNormativa || "").trim(),
                }))
            : [];

          if (aiItens.length > 0) {
            return res.json({
              success: true,
              nomeArquivo,
              formato: ext,
              hashSha256,
              origemExtracao: "IA_GEMINI_DOCUMENTAL",
              itens: aiItens,
            });
          }
        } catch (aiErr: any) {
          console.warn(
            "[auditPrepRouter] Fallback determinístico após aviso Gemini em /parse-items:",
            aiErr?.message || aiErr
          );
        }
      }

      if (deterministicItems.length === 0) {
        return res.status(422).json({
          success: false,
          code: "NO_ITEMS_FOUND",
          error:
            "O arquivo foi lido, mas nenhum item ou pergunta numerada identificável foi encontrado. Utilize o cadastro manual ou revise a formatação do documento.",
        });
      }

      return res.json({
        success: true,
        nomeArquivo,
        formato: ext,
        hashSha256,
        origemExtracao: "LEITURA_DETERMINISTICA",
        itens: deterministicItems,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Erro interno ao processar arquivo.",
      });
    }
  });

  // 2. Sugestão de Resposta com IA estritamente fundamentada na base real do QualyQuest
  router.post("/suggest-answer", async (req, res) => {
    try {
      const { organizationId, audit, item, sgqContext } = req.body || {};
      const orgId =
        typeof organizationId === "string" && organizationId.trim()
          ? organizationId.trim()
          : "org_impacto_aviation";

      if (!item || !item.perguntaOriginal) {
        return res.status(400).json({
          success: false,
          error: "Dados do item da auditoria são obrigatórios.",
        });
      }

      const deterministicFallback = buildDeterministicSGQSuggestion(
        item,
        audit,
        sgqContext || {}
      );

      const ai = getGeminiClient();
      if (!ai) {
        return res.json({ success: true, sugestao: deterministicFallback });
      }

      // Monta contexto estritamente com dados reais enviados do SGQ QualyQuest,
      // separando Manuais/Procedimentos INTERNOS da IMPACTO (com capítulos e texto) das normas de autoridades
      const itemQueryTokens = normalizeTokens(
        `${item.numeroItem || ""} ${item.perguntaOriginal || ""} ${item.referenciaNormativa || ""}`
      );
      const itemQueryNorm = normalizeSearchText(
        `${item.numeroItem || ""} ${item.perguntaOriginal || ""} ${item.referenciaNormativa || ""}`
      );

      const allDocsList = Array.isArray(sgqContext?.documentosControlados)
        ? sgqContext.documentosControlados
        : [];
      const allManualsList = Array.isArray(sgqContext?.manuals) ? sgqContext.manuals : [];
      const allRevisoesList = Array.isArray(sgqContext?.revisoesDocumentais)
        ? sgqContext.revisoesDocumentais
        : [];

      const internalManualBlocks: string[] = [];
      const authorityManualBlocks: string[] = [];

      for (const m of allManualsList.slice(0, 25)) {
        const isInternal = isInternalCompanyDoc(m);
        const topSections = findMatchingSectionsForDoc(
          m.capitulos,
          m.conteudoTexto,
          itemQueryTokens,
          itemQueryNorm
        );
        const allChapOverview = Array.isArray(m.capitulos)
          ? m.capitulos
              .slice(0, 12)
              .map((c: any) => `Cap./Seção ${c.numero} (${c.titulo}): ${String(c.requisitoTexto || "").slice(0, 260)}`)
              .join("\n    ")
          : "";
        const matchedText =
          topSections.length > 0
            ? topSections
                .map((s) => `  > Trecho relevante [Cap./Seção ${s.numero} — ${s.titulo}]: "${s.texto.slice(0, 500)}"`)
                .join("\n")
            : allChapOverview
            ? `  > Capítulos indexados:\n    ${allChapOverview}`
            : `  > Resumo: ${(m.descricaoResumo || "").slice(0, 250)}`;

        const block = `- [${m.codigo}] ${m.titulo} | Rev: ${m.revisao || "N/I"} | Status: ${m.status || "N/I"}\n${matchedText}`;
        if (isInternal) {
          internalManualBlocks.push(block);
        } else {
          authorityManualBlocks.push(block);
        }
      }

      for (const rv of allRevisoesList.slice(0, 20)) {
        const isInternal = isInternalCompanyDoc({
          codigo: rv.codigoDocumento,
          titulo: rv.tituloDocumento,
          origemRevisao: rv.origemRevisao,
        });
        const topSections = findMatchingSectionsForDoc(
          rv.capitulosIndexados,
          rv.conteudoTextoIntegral,
          itemQueryTokens,
          itemQueryNorm
        );
        if (topSections.length > 0) {
          const block = `- [${rv.codigoDocumento}] ${rv.tituloDocumento} | Rev: ${rv.numeroRevisao || "N/I"}\n${topSections
            .map((s) => `  > Trecho [Cap./Seção ${s.numero} — ${s.titulo}]: "${s.texto.slice(0, 500)}"`)
            .join("\n")}`;
          if (isInternal) internalManualBlocks.push(block);
          else authorityManualBlocks.push(block);
        }
      }

      const internalDocsResumo = allDocsList
        .filter((d: any) => isInternalCompanyDoc(d))
        .slice(0, 40)
        .map(
          (d: any) =>
            `- [${d.codigo}] ${d.titulo} | Rev: ${d.numeroRevisao || "N/I"} | Status: ${d.statusGeral || "N/I"}${
              d.aplicabilidade ? ` | Aplicabilidade: ${d.aplicabilidade}` : ""
            }`
        )
        .join("\n");

      const authorityDocsResumo = allDocsList
        .filter((d: any) => !isInternalCompanyDoc(d))
        .slice(0, 25)
        .map((d: any) => `- [${d.codigo}] ${d.titulo} | Rev: ${d.numeroRevisao || "N/I"} | Status: ${d.statusGeral || "N/I"}`)
        .join("\n");

      const trainingsSummary = `Total de registros de treinamento no SGQ: ${(sgqContext?.trainingRecords || []).length}; Qualificações/CHTs: ${(sgqContext?.qualifications || []).length}`;
      const toolsSummary = `Total de ferramentas calibradas no módulo Metrologia: ${(sgqContext?.ferramentasCalibradas || []).length}`;

      const rncMatches = (sgqContext?.nonConformities || [])
        .slice(0, 20)
        .map((r: any) => `- RNC ${r.numeroNC || r.id}: ${r.titulo || ""} (Norma: ${r.normaReferencia || "N/I"}, Status: ${r.statusGeral || "N/I"})`)
        .join("\n");

      const prevResumo = (sgqContext?.previousAuditsAndAnswers || [])
        .slice(0, 20)
        .map((p: any) => `- [${p.auditNome} / ${p.entidade} / ${p.dataAuditoria}] Item ${p.itemNumero}: "${(p.pergunta || "").slice(0, 120)}" => Resposta: "${(p.resposta || "").slice(0, 220)}"`)
        .join("\n");

      const evidResumo = (sgqContext?.availableEvidences || [])
        .slice(0, 30)
        .map((e: any) => `- [${e.referencia || e.evidenciaId}] ${e.titulo} (${e.tipo}${e.dataValidade ? `, Validade: ${e.dataValidade}` : ""})`)
        .join("\n");

      const prompt = `Você é o Especialista de Garantia da Qualidade da IMPACTO AVIATION MRO.
Gere uma SUGESTÃO DE RESPOSTA (rascunho sujeito à validação humana da Qualidade) para o item de auditoria abaixo, consultando EXCLUSIVAMENTE os dados reais do SGQ fornecidos neste prompt.

DADOS DA AUDITORIA E DO ITEM:
- Auditoria: ${audit?.nome || "N/I"} | Entidade: ${audit?.entidade || "N/I"} | Tipo: ${audit?.tipo || "N/I"} | Data: ${audit?.dataAuditoria || "N/I"}
- Número do Item: ${item.numeroItem}
- Pergunta / Requisito Original: "${item.perguntaOriginal}"
- Referência Normativa: "${item.referenciaNormativa || "Não informada"}"

DADOS REAIS DO QUALYQUEST SGQ (ÚNICAS FONTES PERMITIDAS):
[1. Manuais e Procedimentos INTERNOS da IMPACTO (PRIORIDADE MÁXIMA — MOMQ, MOE, PTM, SGSO, POP, IT)]
${internalManualBlocks.join("\n") || "Nenhum manual interno com conteúdo detalhado informado."}
${internalDocsResumo ? `\nDocumentos internos na Master List:\n${internalDocsResumo}` : ""}

[2. Normas Externas / Autoridades (RBAC, ISO, FAA, EASA — usar apenas como referência secundária)]
${authorityManualBlocks.join("\n") || authorityDocsResumo || "Nenhuma norma externa informada."}

[3. Treinamentos, Qualificações e Metrologia]
${trainingsSummary}
${toolsSummary}

[4. Não Conformidades (RNC)]
${rncMatches || "Nenhuma RNC listada."}

[5. Respostas de Auditorias Anteriores]
${prevResumo || "Nenhuma resposta de auditoria anterior listada."}

[6. Evidências Disponíveis no Acervo]
${evidResumo || "Nenhuma evidência anexada no acervo."}

REGRAS OBRIGATÓRIAS E ANTI-ALUCINAÇÃO (DESCUMPRIR INVALIDA A RESPOSTA):
1. PRIORIZE SEMPRE os manuais e procedimentos INTERNOS da IMPACTO (Bloco [1], como MOMQ, MOE, PTM, SGSO, POP, IT) em vez de citar apenas normas das autoridades (Bloco [2]).
2. CITE EXPLICITAMENTE O CAPÍTULO / SEÇÃO encontrado (ex.: "MOMQ Rev. 14, Cap./Seção 3.4.3 — Gestão e Controle Centralizado de Calibração") e TRANSCREVA OU RESUMA FIELMENTE O QUE ESTÁ ESCRITO no procedimento da empresa conforme os trechos fornecidos no Bloco [1].
3. Cite EXCLUSIVAMENTE documentos, códigos, capítulos e revisões que constam nos blocos [1] a [6] acima. NUNCA invente capítulos, datas, certificados, treinamentos, aprovações ou revisões inexistentes.
4. Diferencie explicitamente no texto o que é "previsão em procedimento/manual interno da IMPACTO" (tipo: PROCEDIMENTO_NORMA) e o que é "evidência objetiva de execução" (tipo: EVIDENCIA_REGISTRO).
5. Nunca afirme que uma atividade foi executada se não houver evidência ou registro real nos dados acima.
6. Se as informações fornecidas forem insuficientes para responder com segurança, defina "informacaoInsuficiente": true e escreva claramente "INFORMAÇÃO NÃO ENCONTRADA" indicando exatamente o que falta.
7. Se identificar conflito ou divergência de revisão entre documentos/auditorias anteriores, registre em "conflitosOuDivergencias" solicitando validação humana.
8. Deixe claro que esta é uma sugestão preliminar que requer validação da equipe de Qualidade.

Responda estritamente no schema JSON solicitado.`;

      try {
        const response = await executeGeminiRequest<any>({
          operation: "audit-prep-suggest-answer",
          contents: prompt,
          models: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
          config: {
            responseMimeType: "application/json",
            responseSchema: AUDIT_PREP_SUGGESTION_SCHEMA,
          },
          ttlMs: 4 * 60 * 60 * 1000,
          organizationId: orgId,
        });

        const parsed = response.parsed || JSON.parse(response.text?.trim() || "{}");
        const fontesValidas = Array.isArray(parsed.fontesEncontradas)
          ? parsed.fontesEncontradas.map((f: any) => ({
              tipo:
                f.tipo === "EVIDENCIA_REGISTRO" || f.tipo === "AUDITORIA_ANTERIOR"
                  ? f.tipo
                  : "PROCEDIMENTO_NORMA",
              codigo: String(f.codigo || "").trim() || "N/I",
              titulo: String(f.titulo || "").trim() || "Fonte SGQ",
              revisao: String(f.revisao || "").trim() || "N/I",
              observacao: f.observacao ? String(f.observacao) : undefined,
            }))
          : deterministicFallback.fontesEncontradas;

        return res.json({
          success: true,
          sugestao: {
            respostaSugerida:
              String(parsed.respostaSugerida || "").trim() ||
              deterministicFallback.respostaSugerida,
            fontesEncontradas: fontesValidas,
            lacunasOuFaltantes: Array.isArray(parsed.lacunasOuFaltantes)
              ? parsed.lacunasOuFaltantes.map(String)
              : deterministicFallback.lacunasOuFaltantes,
            conflitosOuDivergencias: Array.isArray(parsed.conflitosOuDivergencias)
              ? parsed.conflitosOuDivergencias.map(String)
              : [],
            informacaoInsuficiente: Boolean(
              parsed.informacaoInsuficiente || fontesValidas.length === 0
            ),
            geradoEm: new Date().toISOString(),
            modeloUtilizado: response.modelUsed || "gemini-4-hydrogen",
            validadaPelaQualidade: false,
          },
        });
      } catch (aiErr: any) {
        console.warn(
          "[auditPrepRouter] Fallback determinístico após erro Gemini em /suggest-answer:",
          aiErr?.message || aiErr
        );
        return res.json({ success: true, sugestao: deterministicFallback });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Erro ao gerar sugestão de resposta.",
      });
    }
  });

  // 3. Verificação de perguntas iguais ou equivalentes em outras listas (determinística + semântica multilíngue IA)
  router.post("/match-previous", async (req, res) => {
    try {
      const { organizationId, importedItems, candidates } = req.body || {};
      const orgId =
        typeof organizationId === "string" && organizationId.trim()
          ? organizationId.trim()
          : "org_impacto_aviation";

      if (!Array.isArray(importedItems) || !Array.isArray(candidates)) {
        return res.status(400).json({
          success: false,
          error: "importedItems e candidates são obrigatórios.",
        });
      }

      const validCandidates: PreviousItemCandidate[] = candidates
        .filter((c: any) => c && c.key && c.pergunta)
        .slice(0, 250)
        .map((c: any) => ({
          key: String(c.key),
          auditId: String(c.auditId || ""),
          auditNome: String(c.auditNome || "Auditoria Anterior"),
          entidade: String(c.entidade || ""),
          dataAuditoria: String(c.dataAuditoria || ""),
          itemNumero: String(c.itemNumero || "-"),
          pergunta: String(c.pergunta),
          referenciaNormativa: String(c.referenciaNormativa || ""),
          resposta: String(c.resposta || ""),
          situacao: c.situacao || "PENDENTE_DE_AVALIACAO",
          validadoQualidade: Boolean(c.validadoQualidade),
          evidencias: Array.isArray(c.evidencias) ? c.evidencias : [],
          origem: c.origem === "HISTORICO_SGQ" ? "HISTORICO_SGQ" : "CENTRAL_AUDITORIAS",
        }));

      const candidateMap = new Map(validCandidates.map((c) => [c.key, c]));
      const results: Record<
        string,
        {
          candidateKey: string;
          score: number;
          matchType: "EXATA" | "EQUIVALENTE" | "SEMANTICA_IA";
          reason: string;
        }
      > = {};

      const remainingForAI: Array<{
        tempId: string;
        numeroItem: string;
        perguntaOriginal: string;
        referenciaNormativa: string;
      }> = [];

      const deterministicFallbackMap = new Map<
        string,
        {
          candidateKey: string;
          score: number;
          matchType: "EXATA" | "EQUIVALENTE" | "SEMANTICA_IA";
          reason: string;
        }
      >();

      for (const it of importedItems.slice(0, 250)) {
        if (!it || !it.tempId || !it.perguntaOriginal) continue;
        const tid = String(it.tempId);
        const det = findBestQuestionMatch(
          {
            perguntaOriginal: String(it.perguntaOriginal),
            referenciaNormativa: String(it.referenciaNormativa || ""),
          },
          validCandidates
        );
        if (det && det.score >= 78) {
          results[tid] = {
            candidateKey: det.candidate.key,
            score: det.score,
            matchType: det.matchType,
            reason: det.reason,
          };
        } else {
          if (det) {
            deterministicFallbackMap.set(tid, {
              candidateKey: det.candidate.key,
              score: det.score,
              matchType: det.matchType,
              reason: det.reason,
            });
          }
          remainingForAI.push({
            tempId: tid,
            numeroItem: String(it.numeroItem || ""),
            perguntaOriginal: String(it.perguntaOriginal),
            referenciaNormativa: String(it.referenciaNormativa || ""),
          });
        }
      }

      const ai = getGeminiClient();
      let aiCheckedCount = 0;
      let aiErrorMsg: string | null = null;

      if (ai && remainingForAI.length > 0 && validCandidates.length > 0) {
        // Usa apelidos curtos (C1, C2...) para evitar que a IA altere ou trunque IDs longos do Firestore
        const aiCandidates = validCandidates.slice(0, 200);
        const aliasToCandidateKey = new Map<string, string>();
        const candListText = aiCandidates
          .map((c, idx) => {
            const alias = `C${idx + 1}`;
            aliasToCandidateKey.set(alias, c.key);
            return `- [${alias}] (${c.auditNome} · Item ${c.itemNumero}${
              c.referenciaNormativa ? ` · Ref: ${c.referenciaNormativa}` : ""
            }) "${c.pergunta.replace(/\s+/g, " ").trim().slice(0, 240)}"`;
          })
          .join("\n");

        const BATCH_SIZE = 25;
        const batches: Array<typeof remainingForAI> = [];
        for (let i = 0; i < remainingForAI.length && batches.length < 8; i += BATCH_SIZE) {
          batches.push(remainingForAI.slice(i, i + BATCH_SIZE));
        }

        for (const batchItems of batches) {
          const aliasToTempId = new Map<string, string>();
          const queryListText = batchItems
            .map((q, idx) => {
              const alias = `Q${idx + 1}`;
              aliasToTempId.set(alias, q.tempId);
              return `- [${alias}] (Item ${q.numeroItem}${
                q.referenciaNormativa ? ` · Ref: ${q.referenciaNormativa}` : ""
              }) "${q.perguntaOriginal.replace(/\s+/g, " ").trim().slice(0, 240)}"`;
            })
            .join("\n");

          const prompt = `Você é um especialista bilíngue (Português, Inglês e Espanhol) de Garantia da Qualidade e Aeronáutica da IMPACTO Aviation MRO (RBAC 145 / FAA 14 CFR 145 / EASA Part-145 / IOSA / ISO 9001).
Compare TODAS as NOVAS PERGUNTAS IMPORTADAS com o BANCO DE PERGUNTAS DE LISTAS ANTERIORES.
ATENÇÃO ESPECIAL A OUTROS IDIOMAS: as listas podem estar em idiomas diferentes (por exemplo, pergunta importada em Inglês ou Espanhol e banco anterior em Português, ou vice-versa). Identifique sempre que duas perguntas tratam da MESMA exigência técnica ou regulatória, mesmo traduzidas ou redigidas de forma diferente.

NOVAS PERGUNTAS IMPORTADAS:
${queryListText}

BANCO DE PERGUNTAS DE LISTAS ANTERIORES:
${candListText}

REGRAS OBRIGATÓRIAS:
1. Para cada pergunta em NOVAS PERGUNTAS IMPORTADAS que possua equivalente real no BANCO (no mesmo idioma ou em outro idioma), retorne tempId = código Q (ex.: "Q1") e candidateKey = código C (ex.: "C4").
2. Retorne apenas correspondências técnicas reais com score >= 65 (de 0 a 100). Use 85-98 quando pedir exatamente a mesma verificação (mesmo traduzida) e 65-84 quando for equivalente parcial/próxima. Se não houver equivalente real, NÃO inclua o código Q.
3. Use EXATAMENTE os códigos Q1, Q2... e C1, C2... mostrados entre colchetes. NUNCA invente códigos.
4. Em "justificativa", escreva 1 frase curta em português indicando o motivo (ex.: "Equivalente em inglês sobre calibração rastreável de torquímetros").`;

          try {
            const response = await executeGeminiRequest<{
              matches: Array<{
                tempId: string;
                candidateKey: string;
                score: number;
                justificativa: string;
              }>;
            }>({
              operation: "audit-prep-match-previous",
              contents: prompt,
              models: ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
              config: {
                responseMimeType: "application/json",
                responseSchema: AUDIT_PREP_MATCH_SCHEMA,
              },
              ttlMs: 2 * 60 * 60 * 1000,
              organizationId: orgId,
              promptVersion: "v2-multilingual",
            });

            aiCheckedCount += batchItems.length;

            let parsedObj: any = response.parsed;
            if (!parsedObj && response.text) {
              const cleanedText = response.text
                .trim()
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
              try {
                parsedObj = JSON.parse(cleanedText);
              } catch {
                const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    parsedObj = JSON.parse(jsonMatch[0]);
                  } catch {
                    parsedObj = null;
                  }
                }
              }
            }

            const aiMatches = Array.isArray(parsedObj?.matches) ? parsedObj.matches : [];
            for (const m of aiMatches) {
              const rawQ = String(m.tempId || "").trim().replace(/^\[|\]$/g, "");
              const rawC = String(m.candidateKey || "").trim().replace(/^\[|\]$/g, "");
              const realTempId = aliasToTempId.get(rawQ) || (batchItems.some((b) => b.tempId === rawQ) ? rawQ : "");
              const realCandKey = aliasToCandidateKey.get(rawC) || (candidateMap.has(rawC) ? rawC : "");
              const score = Math.round(Number(m.score || 0));

              if (realTempId && realCandKey && candidateMap.has(realCandKey) && score >= 65) {
                const existing = results[realTempId];
                if (!existing || score > existing.score) {
                  results[realTempId] = {
                    candidateKey: realCandKey,
                    score: Math.min(98, score),
                    matchType: "SEMANTICA_IA",
                    reason: String(m.justificativa || "Equivalência semântica identificada pela IA"),
                  };
                }
              }
            }
          } catch (aiErr: any) {
            aiErrorMsg = String(aiErr?.message || "IA indisponível temporariamente");
            console.warn(
              "[auditPrepRouter] Fallback determinístico após aviso Gemini em /match-previous:",
              aiErrorMsg
            );
          }
        }
      }

      // Completa com matches determinísticos de faixa média (58..77) caso IA não tenha encontrado melhor
      for (const it of remainingForAI) {
        if (results[it.tempId]) continue;
        const detFallback = deterministicFallbackMap.get(it.tempId);
        if (detFallback) {
          results[it.tempId] = detFallback;
        }
      }

      return res.json({
        success: true,
        matches: results,
        meta: {
          aiAvailable: Boolean(ai),
          aiCheckedCount,
          aiError: aiErrorMsg,
          totalCandidatesChecked: validCandidates.length,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Erro ao verificar equivalência com listas anteriores.",
      });
    }
  });

  return router;
}
