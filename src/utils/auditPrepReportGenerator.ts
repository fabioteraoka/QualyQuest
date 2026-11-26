import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import {
  AuditoriaPreparacao,
  ItemAuditoriaPreparacao,
  SituacaoItemAuditoriaPrep,
  calcularResumoAuditoriaPrep,
} from '../types/auditPrep';

export const SITUACAO_LABELS: Record<SituacaoItemAuditoriaPrep, string> = {
  ATENDIDO: 'CONFORME',
  PARCIALMENTE_ATENDIDO: 'PARCIALMENTE CONFORME',
  NAO_ATENDIDO: 'NÃO CONFORME',
  NAO_APLICAVEL: 'NÃO APLICÁVEL',
  PENDENTE_DE_AVALIACAO: 'PENDENTE DE AVALIAÇÃO',
};

function formatDatePtBr(iso?: string): string {
  if (!iso) return 'Não informada';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('pt-BR');
}

function getPendingItems(items: ItemAuditoriaPreparacao[]): ItemAuditoriaPreparacao[] {
  return items.filter(
    (it) =>
      it.situacao === 'NAO_ATENDIDO' ||
      it.situacao === 'PARCIALMENTE_ATENDIDO' ||
      it.situacao === 'PENDENTE_DE_AVALIACAO' ||
      (it.observacoesPendencias && it.observacoesPendencias.trim().length > 0)
  );
}

function makeCell(
  text: string,
  options?: {
    bold?: boolean;
    fill?: string;
    color?: string;
    widthPct?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    size?: number;
  }
): TableCell {
  const lines = String(text || '-').split(/\r?\n/);
  return new TableCell({
    width: options?.widthPct
      ? { size: options.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    shading: options?.fill
      ? { fill: options.fill, type: ShadingType.CLEAR, color: 'auto' }
      : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: lines.map(
      (line) =>
        new Paragraph({
          alignment: options?.align || AlignmentType.LEFT,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: line || ' ',
              bold: Boolean(options?.bold),
              color: options?.color || '0F172A',
              size: options?.size ?? 19,
              font: 'Calibri',
            }),
          ],
        })
    ),
  });
}

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
};

export function createAuditPrepDocxDocument(
  audit: AuditoriaPreparacao,
  items: ItemAuditoriaPreparacao[],
  organizationName: string = 'IMPACTO AVIATION MRO'
): Document {
  const resumo = calcularResumoAuditoriaPrep(items);
  const pendentes = getPendingItems(items);
  const generatedAt = new Date().toLocaleString('pt-BR');

  // 1. CAPA
  const capaChildren: Paragraph[] = [
    new Paragraph({
      spacing: { before: 800, after: 120 },
      children: [
        new TextRun({
          text: organizationName.toUpperCase(),
          bold: true,
          size: 28,
          color: '1D4ED8',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: 'SISTEMA DE GESTÃO DA QUALIDADE — CENTRAL DE PREPARAÇÃO PARA AUDITORIAS',
          bold: true,
          size: 20,
          color: '475569',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 400, after: 160 },
      children: [
        new TextRun({
          text: 'DOSSIÊ DE PREPARAÇÃO DE AUDITORIA',
          bold: true,
          size: 40,
          color: '0F172A',
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: audit.nome,
          bold: true,
          size: 30,
          color: '1E3A8A',
          font: 'Calibri',
        }),
      ],
    }),
  ];

  const capaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          makeCell('Entidade Auditora / Cliente', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(audit.entidade, { widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Tipo de Auditoria', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(audit.tipo, { widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Data da Auditoria', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(formatDatePtBr(audit.dataAuditoria), { widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Período', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(audit.periodo || 'Não aplicável / Não informado', { widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Responsável pela Preparação', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(audit.responsavelPreparacao, { widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Situação Geral', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(resumo.situacaoGeral, { bold: true, widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Observações Gerais', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(audit.observacoes || 'Sem observações registradas.', { widthPct: 65 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Data/Hora de Geração', { bold: true, fill: 'F1F5F9', widthPct: 35 }),
          makeCell(generatedAt, { widthPct: 65 }),
        ],
      }),
    ],
  });

  // 2. RESUMO
  const resumoHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 180 },
    children: [
      new TextRun({ text: '1. RESUMO DA PREPARAÇÃO', bold: true, size: 28, color: '0F172A', font: 'Calibri' }),
    ],
  });

  const resumoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          makeCell('Indicador', { bold: true, fill: '0F172A', color: 'FFFFFF', widthPct: 65 }),
          makeCell('Quantidade', { bold: true, fill: '0F172A', color: 'FFFFFF', widthPct: 35, align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Total de Itens Cadastrados'),
          makeCell(String(resumo.totalItens), { bold: true, align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Itens Conformes'),
          makeCell(String(resumo.atendidos), { bold: true, color: '15803D', align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Itens Não Conformes'),
          makeCell(String(resumo.naoAtendidos), { bold: true, color: 'B91C1C', align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Itens Não Aplicáveis'),
          makeCell(String(resumo.naoAplicaveis), { align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Itens Pendentes de Avaliação'),
          makeCell(String(resumo.pendentes + resumo.parcialmenteAtendidos), { bold: true, color: '475569', align: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Itens com Evidência Anexada (opcional)'),
          makeCell(String(items.filter((i) => (i.evidencias?.length || 0) > 0).length), { bold: true, color: '1D4ED8', align: AlignmentType.RIGHT }),
        ],
      }),
    ],
  });

  // 3. DETALHAMENTO DOS ITENS
  const detalhesHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({ text: '2. DETALHAMENTO DOS ITENS DA AUDITORIA', bold: true, size: 28, color: '0F172A', font: 'Calibri' }),
    ],
  });

  const itemBlocks: Array<Paragraph | Table> = [];
  if (items.length === 0) {
    itemBlocks.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: 'Nenhum item cadastrado nesta auditoria até o momento.',
            italics: true,
            color: '64748B',
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );
  } else {
    items.forEach((it) => {
      const evidText =
        it.evidencias && it.evidencias.length > 0
          ? it.evidencias
              .map(
                (ev, idx) =>
                  `${idx + 1}. ${ev.titulo} [${ev.tipo}] — Ref.: ${ev.referencia || 'N/I'}${
                    ev.dataValidade ? ` (Validade: ${formatDatePtBr(ev.dataValidade)})` : ''
                  }`
              )
              .join('\n')
          : 'Sem anexo (evidência opcional / verificação visual).';

      const respLabel = it.respostaImpacto?.trim()
        ? it.respostaImpacto.trim()
        : it.situacao !== 'PENDENTE_DE_AVALIACAO'
        ? `Avaliação registrada diretamente como: ${SITUACAO_LABELS[it.situacao] || it.situacao}.`
        : 'Resposta ainda não preenchida.';

      const validTag = it.validadoQualidade
        ? `Validada pela Qualidade (${it.validadoQualidadePorNome || 'Qualidade'} em ${formatDatePtBr(it.validadoQualidadeEm)})`
        : 'Rascunho / Aguardando validação da Qualidade';

      itemBlocks.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: `Item ${it.numeroItem} — ${SITUACAO_LABELS[it.situacao] || it.situacao}`,
              bold: true,
              size: 22,
              color: '1E3A8A',
              font: 'Calibri',
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_BORDERS,
          rows: [
            new TableRow({
              children: [
                makeCell('Pergunta / Requisito Original', { bold: true, fill: 'F8FAFC', widthPct: 26 }),
                makeCell(it.perguntaOriginal, { widthPct: 74 }),
              ],
            }),
            new TableRow({
              children: [
                makeCell('Referência Normativa / Documental', { bold: true, fill: 'F8FAFC', widthPct: 26 }),
                makeCell(it.referenciaNormativa || 'Não informada', { widthPct: 74 }),
              ],
            }),
            new TableRow({
              children: [
                makeCell('Resposta da IMPACTO', { bold: true, fill: 'F8FAFC', widthPct: 26 }),
                makeCell(`${respLabel}\n\n[Governança: ${validTag}]`, { widthPct: 74 }),
              ],
            }),
            new TableRow({
              children: [
                makeCell('Evidências Associadas', { bold: true, fill: 'F8FAFC', widthPct: 26 }),
                makeCell(evidText, { widthPct: 74 }),
              ],
            }),
            new TableRow({
              children: [
                makeCell('Situação', { bold: true, fill: 'F8FAFC', widthPct: 26 }),
                makeCell(SITUACAO_LABELS[it.situacao] || it.situacao, { bold: true, widthPct: 74 }),
              ],
            }),
            new TableRow({
              children: [
                makeCell('Observações e Pendências', { bold: true, fill: 'F8FAFC', widthPct: 26 }),
                makeCell(it.observacoesPendencias || 'Sem observações ou pendências registradas.', { widthPct: 74 }),
              ],
            }),
          ],
        })
      );
    });
  }

  // 4. PENDÊNCIAS
  const pendenciasHeading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({ text: '3. LISTA CONSOLIDADA DE PENDÊNCIAS', bold: true, size: 28, color: '0F172A', font: 'Calibri' }),
    ],
  });

  const pendenciasBlocks: Array<Paragraph | Table> = [];
  if (pendentes.length === 0) {
    pendenciasBlocks.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: 'Nenhuma não conformidade ou pendência aberta identificada nesta auditoria.',
            color: '15803D',
            bold: true,
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );
  } else {
    pendenciasBlocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            children: [
              makeCell('Item', { bold: true, fill: '0F172A', color: 'FFFFFF', widthPct: 12 }),
              makeCell('Situação', { bold: true, fill: '0F172A', color: 'FFFFFF', widthPct: 22 }),
              makeCell('Requisito', { bold: true, fill: '0F172A', color: 'FFFFFF', widthPct: 32 }),
              makeCell('Observações / Pendência Identificada', { bold: true, fill: '0F172A', color: 'FFFFFF', widthPct: 34 }),
            ],
          }),
          ...pendentes.map((p) => {
            const obsParts: string[] = [];
            if (p.observacoesPendencias?.trim()) obsParts.push(p.observacoesPendencias.trim());
            if (obsParts.length === 0) {
              obsParts.push(`Situação atual: ${SITUACAO_LABELS[p.situacao]}`);
            }
            return new TableRow({
              children: [
                makeCell(p.numeroItem, { bold: true, widthPct: 12 }),
                makeCell(SITUACAO_LABELS[p.situacao] || p.situacao, { widthPct: 22 }),
                makeCell(p.perguntaOriginal.slice(0, 180) + (p.perguntaOriginal.length > 180 ? '...' : ''), { widthPct: 32 }),
                makeCell(obsParts.join(' | '), { widthPct: 34 }),
              ],
            });
          }),
        ],
      })
    );
  }

  return new Document({
    creator: 'QualyQuest SGQ — IMPACTO Aviation MRO',
    title: `Relatório de Preparação — ${audit.nome}`,
    description: `Preparação de Auditoria ${audit.entidade} (${audit.tipo})`,
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${organizationName} | ${audit.nome} (${audit.entidade})`,
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Central de Preparação para Auditorias — Página ',
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...capaChildren,
          capaTable,
          new Paragraph({ children: [new PageBreak()] }),
          resumoHeading,
          resumoTable,
          detalhesHeading,
          ...itemBlocks,
          pendenciasHeading,
          ...pendenciasBlocks,
        ],
      },
    ],
  });
}

export async function buildAuditPrepDocxBuffer(
  audit: AuditoriaPreparacao,
  items: ItemAuditoriaPreparacao[],
  organizationName?: string
): Promise<Uint8Array> {
  const doc = createAuditPrepDocxDocument(audit, items, organizationName);
  return await Packer.toBuffer(doc);
}

export async function exportAuditPrepToDocx(
  audit: AuditoriaPreparacao,
  items: ItemAuditoriaPreparacao[],
  organizationName: string = 'IMPACTO AVIATION MRO'
): Promise<void> {
  const doc = createAuditPrepDocxDocument(audit, items, organizationName);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const safeName = audit.nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 60);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Preparacao_Auditoria_${safeName || 'IMPACTO'}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildAuditPrepPdf(
  audit: AuditoriaPreparacao,
  items: ItemAuditoriaPreparacao[],
  organizationName: string = 'IMPACTO AVIATION MRO'
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxWidth = pageWidth - margin * 2;
  const resumo = calcularResumoAuditoriaPrep(items);
  const pendentes = getPendingItems(items);
  let y = 26;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = 20;
    }
  };

  const addWrappedText = (
    text: string,
    x: number,
    width: number,
    lineHeight: number,
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
    color: [number, number, number] = [15, 23, 42]
  ) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || '-'), width);
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      doc.text(line, x, y);
      y += lineHeight;
    }
  };

  // 1. CAPA
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(147, 197, 253);
  doc.text(organizationName.toUpperCase(), margin, 18);
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('DOSSIÊ DE PREPARAÇÃO PARA AUDITORIA', margin, 30);

  y = 56;
  addWrappedText(audit.nome, margin, maxWidth, 8, 16, 'bold', [30, 58, 138]);
  y += 4;

  const metaRows: Array<[string, string]> = [
    ['Entidade Auditora / Cliente', audit.entidade],
    ['Tipo de Auditoria', audit.tipo],
    ['Data da Auditoria', formatDatePtBr(audit.dataAuditoria)],
    ['Período', audit.periodo || 'Não aplicável / Não informado'],
    ['Responsável pela Preparação', audit.responsavelPreparacao],
    ['Situação Geral', resumo.situacaoGeral],
    ['Observações Gerais', audit.observacoes || 'Sem observações registradas.'],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
  ];

  metaRows.forEach(([k, v]) => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${k}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(String(v), maxWidth - 52);
    doc.text(wrapped, margin + 52, y);
    y += Math.max(6.5, wrapped.length * 4.8);
  });

  // 2. RESUMO
  doc.addPage();
  y = 20;
  addWrappedText('1. RESUMO DA PREPARAÇÃO', margin, maxWidth, 7, 13, 'bold', [15, 23, 42]);
  y += 2;
  const summaryLines = [
    `Total de itens cadastrados: ${resumo.totalItens}`,
    `Conformes: ${resumo.atendidos}`,
    `Não conformes: ${resumo.naoAtendidos}`,
    `Não aplicáveis: ${resumo.naoAplicaveis}`,
    `Pendentes de avaliação: ${resumo.pendentes + resumo.parcialmenteAtendidos}`,
    `Itens com evidência anexada (opcional): ${items.filter((i) => (i.evidencias?.length || 0) > 0).length}`,
  ];
  summaryLines.forEach((line) => addWrappedText(`• ${line}`, margin + 2, maxWidth - 4, 5.5, 10, 'normal'));

  // 3. DETALHAMENTO DOS ITENS
  y += 6;
  ensureSpace(14);
  addWrappedText('2. DETALHAMENTO DOS ITENS DA AUDITORIA', margin, maxWidth, 7, 13, 'bold', [15, 23, 42]);
  y += 2;

  if (items.length === 0) {
    addWrappedText('Nenhum item cadastrado nesta auditoria até o momento.', margin, maxWidth, 5.5, 10, 'italic', [100, 116, 139]);
  } else {
    items.forEach((it) => {
      ensureSpace(26);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      addWrappedText(
        `Item ${it.numeroItem} — ${SITUACAO_LABELS[it.situacao] || it.situacao}`,
        margin,
        maxWidth,
        6,
        11,
        'bold',
        [30, 58, 138]
      );
      addWrappedText(`Pergunta / Requisito: ${it.perguntaOriginal}`, margin, maxWidth, 4.8, 9.5, 'normal');
      addWrappedText(`Referência Normativa: ${it.referenciaNormativa || 'Não informada'}`, margin, maxWidth, 4.8, 9.5, 'normal', [51, 65, 85]);
      const pdfResposta = it.respostaImpacto?.trim()
        ? it.respostaImpacto.trim()
        : it.situacao !== 'PENDENTE_DE_AVALIACAO'
        ? `Avaliação registrada: ${SITUACAO_LABELS[it.situacao] || it.situacao}`
        : 'Não preenchida';
      addWrappedText(
        `Resposta da IMPACTO: ${pdfResposta} (${
          it.validadoQualidade ? 'Validada pela Qualidade' : 'Rascunho / Pendente de validação'
        })`,
        margin,
        maxWidth,
        4.8,
        9.5,
        'normal'
      );
      const evStr =
        it.evidencias && it.evidencias.length > 0
          ? it.evidencias
              .map((e) => `${e.titulo} [${e.tipo}] (${e.referencia || 'N/I'})`)
              .join('; ')
          : 'Sem anexo (evidência opcional / verificação visual)';
      addWrappedText(`Evidências: ${evStr}`, margin, maxWidth, 4.8, 9.5, 'normal', [51, 65, 85]);
      if (it.observacoesPendencias?.trim()) {
        addWrappedText(`Observações / Pendências: ${it.observacoesPendencias.trim()}`, margin, maxWidth, 4.8, 9.5, 'normal', [180, 83, 9]);
      }
      y += 3;
    });
  }

  // 4. PENDÊNCIAS
  y += 6;
  ensureSpace(14);
  addWrappedText('3. LISTA CONSOLIDADA DE PENDÊNCIAS', margin, maxWidth, 7, 13, 'bold', [15, 23, 42]);
  y += 2;
  if (pendentes.length === 0) {
    addWrappedText('Nenhuma não conformidade ou pendência aberta identificada.', margin, maxWidth, 5.5, 10, 'bold', [21, 128, 61]);
  } else {
    pendentes.forEach((p) => {
      const obs = p.observacoesPendencias?.trim() || SITUACAO_LABELS[p.situacao];
      addWrappedText(
        `• Item ${p.numeroItem} [${SITUACAO_LABELS[p.situacao]}]: ${obs}`,
        margin + 2,
        maxWidth - 4,
        5,
        9.5,
        'normal',
        [15, 23, 42]
      );
    });
  }

  // Rodapé com paginação
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${organizationName} — Central de Preparação para Auditorias | Página ${p} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  return doc;
}

export function exportAuditPrepToPdf(
  audit: AuditoriaPreparacao,
  items: ItemAuditoriaPreparacao[],
  organizationName: string = 'IMPACTO AVIATION MRO'
): void {
  const doc = buildAuditPrepPdf(audit, items, organizationName);
  const safeName = audit.nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 60);
  doc.save(`Preparacao_Auditoria_${safeName || 'IMPACTO'}.pdf`);
}
