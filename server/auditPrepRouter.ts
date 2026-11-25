import express from "express";
import crypto from "crypto";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { Type } from "@google/genai";
import {
  getGeminiClient,
  executeGeminiRequest,
} from "./gemini/index.ts";

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

function normalizeTokens(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\.\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function buildDeterministicSGQSuggestion(item: any, audit: any, sgqContext: any) {
  const queryText = `${item?.numeroItem || ""} ${item?.perguntaOriginal || ""} ${item?.referenciaNormativa || ""}`;
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
    const lower = String(target || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    let hits = 0;
    for (const tk of tokens) {
      if (lower.includes(tk)) hits++;
    }
    return hits;
  };

  // 1. Documentos Controlados e Manuais (Procedimentos / Normas)
  const docMatches: Array<{ score: number; codigo: string; titulo: string; revisao: string; status?: string }> = [];
  for (const d of docs) {
    const score = scoreMatch(`${d.codigo || ""} ${d.titulo || ""} ${d.categoria || ""}`);
    if (score >= 1) {
      docMatches.push({
        score,
        codigo: String(d.codigo || d.id || "DOC"),
        titulo: String(d.titulo || "Documento Controlado"),
        revisao: String(d.numeroRevisao || "Revisão não informada"),
        status: d.statusGeral,
      });
    }
  }
  for (const m of manuals) {
    const score = scoreMatch(`${m.codigo || ""} ${m.titulo || ""} ${m.descricaoResumo || ""} ${m.conteudoTexto || ""}`);
    if (score >= 1) {
      docMatches.push({
        score,
        codigo: String(m.codigo || m.id || "MANUAL"),
        titulo: String(m.titulo || "Manual SGQ"),
        revisao: String(m.revisao || "Revisão não informada"),
        status: m.status,
      });
    }
  }
  docMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .forEach((dm) => {
      fontesEncontradas.push({
        tipo: "PROCEDIMENTO_NORMA",
        codigo: dm.codigo,
        titulo: dm.titulo,
        revisao: dm.revisao,
        observacao: dm.status ? `Situação documental: ${dm.status}` : undefined,
      });
    });

  // 2. Evidências e Registros operacionais reais
  const lowerQuery = queryText.toLowerCase();
  if (
    tools.length > 0 &&
    /(calibr|ferrament|torque|metrol|instrument|tool|rbc)/i.test(lowerQuery)
  ) {
    const validTools = tools.filter((t: any) => t.status === "CALIBRADA" || t.status === "VALIDA" || t.dataProximaCalibracao);
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
      "Nenhum manual ou procedimento controlado correspondente foi localizado automaticamente no módulo Documental."
    );
  }
  if (!hasEvidence) {
    lacunasOuFaltantes.push(
      "Nenhuma evidência objetiva de execução (registro, certificado ou anexo específico) foi localizada automaticamente — confirmar ou anexar evidência real."
    );
  }

  const informacaoInsuficiente = fontesEncontradas.length === 0;

  let respostaSugerida = "";
  if (informacaoInsuficiente) {
    respostaSugerida =
      "INFORMAÇÃO NÃO ENCONTRADA — Não foram localizados documentos controlados, registros operacionais ou respostas anteriores compatíveis na base do QualyQuest para este requisito. Preencha manualmente após consultar a documentação aplicável e anexar as evidências objetivas.";
  } else {
    const procList = fontesEncontradas
      .filter((f) => f.tipo === "PROCEDIMENTO_NORMA")
      .map((f) => `${f.codigo} (${f.revisao}) — ${f.titulo}`);
    const evidList = fontesEncontradas
      .filter((f) => f.tipo === "EVIDENCIA_REGISTRO")
      .map((f) => `${f.codigo} — ${f.titulo}`);
    const prevList = fontesEncontradas
      .filter((f) => f.tipo === "AUDITORIA_ANTERIOR")
      .map((f) => `${f.titulo} [${f.revisao}]`);

    const parts: string[] = [];
    if (procList.length > 0) {
      parts.push(
        `[Procedimentos / Normas localizados — descrição documental]: A IMPACTO possui previsão documental nos seguintes documentos do acervo: ${procList.join("; ")}.`
      );
    }
    if (evidList.length > 0) {
      parts.push(
        `[Evidências / Registros localizados no SGQ — comprovação de execução]: Foram identificados registros relacionados: ${evidList.join("; ")}.`
      );
    } else {
      parts.push(
        `[Evidências de execução]: INFORMAÇÃO NÃO ENCONTRADA — Procedimento localizado, porém sem evidência objetiva específica anexada a este item. Anexar comprovação antes de concluir o atendimento.`
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
            models: ["gemini-4-hydrogen", "gemini-flash-latest"],
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

      // Monta contexto estritamente com dados reais enviados do SGQ QualyQuest
      const docsResumo = (sgqContext?.documentosControlados || [])
        .slice(0, 60)
        .map((d: any) => `- [${d.codigo}] ${d.titulo} | Rev: ${d.numeroRevisao || "N/I"} | Status: ${d.statusGeral || "N/I"}`)
        .join("\n");

      const manualsResumo = (sgqContext?.manuals || [])
        .slice(0, 25)
        .map((m: any) => `- [${m.codigo}] ${m.titulo} | Rev: ${m.revisao || "N/I"} | Resumo: ${(m.descricaoResumo || "").slice(0, 180)}`)
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
[1. Documentos Controlados]
${docsResumo || "Nenhum documento controlado informado."}

[2. Manuais SGQ]
${manualsResumo || "Nenhum manual informado."}

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
1. Cite EXCLUSIVAMENTE documentos, códigos e revisões que constam nos blocos [1] a [6] acima.
2. NUNCA invente datas, certificados, treinamentos, aprovações, números de OS ou revisões inexistentes.
3. Diferencie explicitamente no texto o que é "descrição de procedimento/norma" (tipo: PROCEDIMENTO_NORMA) e o que é "evidência objetiva de execução" (tipo: EVIDENCIA_REGISTRO).
4. Nunca afirme que uma atividade foi executada se não houver evidência ou registro real nos dados acima.
5. Se as informações fornecidas forem insuficientes para responder com segurança, defina "informacaoInsuficiente": true e escreva claramente "INFORMAÇÃO NÃO ENCONTRADA" indicando exatamente o que falta.
6. Se identificar conflito ou divergência de revisão entre documentos/auditorias anteriores, registre em "conflitosOuDivergencias" solicitando validação humana.
7. Deixe claro que esta é uma sugestão preliminar que requer validação da equipe de Qualidade.

Responda estritamente no schema JSON solicitado.`;

      try {
        const response = await executeGeminiRequest<any>({
          operation: "audit-prep-suggest-answer",
          contents: prompt,
          models: ["gemini-4-hydrogen", "gemini-flash-latest"],
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

  return router;
}
