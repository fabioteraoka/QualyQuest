import * as XLSX from 'xlsx';
import {
  RequisitoClienteItem,
  ControleCentralSGQ,
  RespostaInstitucionalAprovada,
  EvidenciaRequisitoItem,
} from '../types';

export interface RequirementsExportContext {
  organizationName?: string;
  requisitos: RequisitoClienteItem[];
  totalAcervo?: number;
  controles?: ControleCentralSGQ[];
  respostasInstitucionais?: RespostaInstitucionalAprovada[];
  evidencias?: EvidenciaRequisitoItem[];
  filtrosAtivosResumo?: string;
}

export interface RequisitoPlanilhaRow {
  ID: string;
  CodigoItem: string;
  OrigemNormativa: string;
  EntidadeEmissora: string;
  DocumentoFonte: string;
  EdicaoRevisao: string;
  ReferenciaOriginal: string;
  CapituloSecao: string;
  TituloCurto: string;
  TextoOriginal: string;
  ClienteOperador: string;
  ProgramaChecklist: string;
  Categoria: string;
  Criticidade: string;
  AplicabilidadeIMPACTO: string;
  JustificativaAplicabilidade: string;
  ControleCentralCodigo: string;
  ControleCentralNome: string;
  ProcedimentoInternoRef: string;
  ProcessoResponsavel: string;
  EvidenciaEsperada: string;
  CriterioAceitacao: string;
  StatusConformidadeSGQ: string;
  RespostaInstitucional: string;
  TotalEvidenciasVinculadas: number;
  StatusValidacao: string;
  ResponsavelValidacao: string;
  DataUltimaValidacao: string;
  StatusRegistro: string;
  Observacoes: string;
  AtualizadoEm: string;
}

const ORIGEM_LABELS: Record<string, string> = {
  REGULATORIO_ANAC: 'ANAC — RBAC 145',
  REGULATORIO_EASA: 'EASA — Part-145',
  PADRAO_SETORIAL_IOSA: 'IOSA — ISM MNT/ORG',
  CONTRATUAL_CLIENTE: 'Cliente Operador',
  INTERNO_IMPACTO: 'Interno IMPACTO',
  BOA_PRATICA_REFERENCIA: 'Boa Prática SGQ',
};

const APLICABILIDADE_LABELS: Record<string, string> = {
  APLICAVEL: 'Aplicável Integralmente',
  PARCIALMENTE_APLICAVEL: 'Parcialmente Aplicável',
  NAO_APLICAVEL: 'Não Aplicável',
  AGUARDANDO_AVALIACAO: 'Aguardando Avaliação',
};

export function sanitizeXmlString(value: unknown): string {
  if (value === null || value === undefined) return '';
  // Remove caracteres de controle inválidos em XML 1.0 (mantém \t, \n, \r)
  const cleaned = String(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\r\n|\r|\n/g, '&#10;');
}

export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return (cleaned || 'Planilha').slice(0, 31);
}

export function buildRequirementsPlanilhaRows(ctx: RequirementsExportContext): RequisitoPlanilhaRow[] {
  const respostasById = new Map<string, RespostaInstitucionalAprovada>();
  const respostasByReqId = new Map<string, RespostaInstitucionalAprovada>();
  for (const resp of ctx.respostasInstitucionais || []) {
    if (resp.id) respostasById.set(resp.id, resp);
    for (const relReqId of resp.requisitosRelacionadosIds || []) {
      if (relReqId) respostasByReqId.set(relReqId, resp);
    }
  }

  const evidenciasCountByReq = new Map<string, number>();
  for (const ev of ctx.evidencias || []) {
    if (ev.requisitoId) {
      evidenciasCountByReq.set(ev.requisitoId, (evidenciasCountByReq.get(ev.requisitoId) || 0) + 1);
    }
  }

  return ctx.requisitos.map((req) => {
    const origemKey = req.fonteOrigem || 'CONTRATUAL_CLIENTE';
    const aplicKey = req.aplicabilidadeContexto?.situacao || 'APLICAVEL';
    const respInst =
      (req.respostaInstitucionalId ? respostasById.get(req.respostaInstitucionalId) : undefined) ||
      respostasByReqId.get(req.id);

    const respostaTexto =
      req.respostaInstitucionalTexto ||
      respInst?.textoResposta ||
      '';

    const linkedEvidIds = req.evidenciasVinculadasIds?.length || 0;
    const mappedEvids = evidenciasCountByReq.get(req.id) || 0;

    return {
      ID: req.id || '',
      CodigoItem: req.numeroItem || '',
      OrigemNormativa: ORIGEM_LABELS[origemKey] || origemKey,
      EntidadeEmissora: req.entidadeEmissora || req.clienteNome || '',
      DocumentoFonte: req.fonteDocumentoNome || req.programaCodigo || '',
      EdicaoRevisao: req.edicaoRevisaoFonte || '',
      ReferenciaOriginal: req.codigoReferenciaOriginal || '',
      CapituloSecao: req.capituloSecaoSubitem || '',
      TituloCurto: req.tituloCurto || '',
      TextoOriginal: req.textoOriginal || '',
      ClienteOperador: req.clienteNome || '',
      ProgramaChecklist: req.programaCodigo || '',
      Categoria: req.categoria || '',
      Criticidade: req.criticidade || '',
      AplicabilidadeIMPACTO: APLICABILIDADE_LABELS[aplicKey] || aplicKey,
      JustificativaAplicabilidade:
        req.aplicabilidadeContexto?.justificativaFormal || req.justificativaAplicabilidade || '',
      ControleCentralCodigo: req.controleCentralCodigo || '',
      ControleCentralNome: req.controleCentralNome || '',
      ProcedimentoInternoRef: req.procedimentoInternoRef || '',
      ProcessoResponsavel: req.processoResponsavel || '',
      EvidenciaEsperada: req.evidenciaEsperada || '',
      CriterioAceitacao: req.criterioAceitacao || '',
      StatusConformidadeSGQ: req.statusConformidade || '',
      RespostaInstitucional: respostaTexto,
      TotalEvidenciasVinculadas: Math.max(linkedEvidIds, mappedEvids),
      StatusValidacao: req.statusValidacao || req.statusValidacaoConteudo || '',
      ResponsavelValidacao: req.responsavelValidacaoNome || '',
      DataUltimaValidacao: req.dataUltimaValidacao || '',
      StatusRegistro: req.status || 'ATIVO',
      Observacoes: req.observacoes || '',
      AtualizadoEm: req.updatedAt || req.createdAt || '',
    };
  });
}

interface XmlColumnDef {
  header: string;
  width: number;
  type?: 'String' | 'Number';
  wrap?: boolean;
}

function renderXmlRow(
  values: Array<{ value: string | number; type?: 'String' | 'Number'; styleId?: string }>,
  height?: number
): string {
  const heightAttr = height ? ` ss:Height="${height}"` : '';
  const cells = values
    .map((cell) => {
      const styleAttr = cell.styleId ? ` ss:StyleID="${cell.styleId}"` : '';
      const dataType = cell.type === 'Number' ? 'Number' : 'String';
      const rawVal = cell.type === 'Number' ? String(Number(cell.value) || 0) : sanitizeXmlString(cell.value);
      return `<Cell${styleAttr}><Data ss:Type="${dataType}">${rawVal}</Data></Cell>`;
    })
    .join('');
  return `<Row${heightAttr}>${cells}</Row>`;
}

/**
 * Gera documento XML no padrão SpreadsheetML 2003 (Excel / LibreOffice Calc / Google Sheets).
 */
export function buildRequisitosSpreadsheetXML(ctx: RequirementsExportContext): string {
  const rows = buildRequirementsPlanilhaRows(ctx);
  const nowIso = new Date().toISOString();
  const orgName = ctx.organizationName || 'IMPACTO Aviation MRO';

  const columns: Array<{ key: keyof RequisitoPlanilhaRow; def: XmlColumnDef }> = [
    { key: 'CodigoItem', def: { header: 'Item / Código', width: 100 } },
    { key: 'OrigemNormativa', def: { header: 'Origem Normativa', width: 135 } },
    { key: 'EntidadeEmissora', def: { header: 'Entidade Emissora', width: 120 } },
    { key: 'DocumentoFonte', def: { header: 'Documento / Norma Fonte', width: 170, wrap: true } },
    { key: 'EdicaoRevisao', def: { header: 'Edição / Revisão', width: 95 } },
    { key: 'ReferenciaOriginal', def: { header: 'Ref. Normativa Original', width: 120 } },
    { key: 'CapituloSecao', def: { header: 'Capítulo / Seção', width: 150, wrap: true } },
    { key: 'TituloCurto', def: { header: 'Título Curto', width: 200, wrap: true } },
    { key: 'TextoOriginal', def: { header: 'Texto Original (Integral)', width: 320, wrap: true } },
    { key: 'ClienteOperador', def: { header: 'Cliente / Operador', width: 120 } },
    { key: 'ProgramaChecklist', def: { header: 'Programa / Checklist', width: 115 } },
    { key: 'Categoria', def: { header: 'Categoria', width: 120 } },
    { key: 'Criticidade', def: { header: 'Criticidade', width: 85 } },
    { key: 'AplicabilidadeIMPACTO', def: { header: 'Aplicabilidade IMPACTO', width: 135 } },
    { key: 'JustificativaAplicabilidade', def: { header: 'Justificativa Aplicabilidade', width: 220, wrap: true } },
    { key: 'ControleCentralCodigo', def: { header: 'Código Controle SGQ', width: 105 } },
    { key: 'ControleCentralNome', def: { header: 'Controle Central SGQ', width: 190, wrap: true } },
    { key: 'ProcedimentoInternoRef', def: { header: 'Procedimento Interno (MOMQ/MPO)', width: 160, wrap: true } },
    { key: 'ProcessoResponsavel', def: { header: 'Processo Responsável', width: 135 } },
    { key: 'EvidenciaEsperada', def: { header: 'Evidência Esperada', width: 220, wrap: true } },
    { key: 'CriterioAceitacao', def: { header: 'Critério de Aceitação', width: 200, wrap: true } },
    { key: 'StatusConformidadeSGQ', def: { header: 'Status Conformidade SGQ', width: 130 } },
    { key: 'RespostaInstitucional', def: { header: 'Resposta Institucional', width: 280, wrap: true } },
    { key: 'TotalEvidenciasVinculadas', def: { header: 'Qtd. Evidências', width: 85, type: 'Number' } },
    { key: 'StatusValidacao', def: { header: 'Status Validação', width: 120 } },
    { key: 'ResponsavelValidacao', def: { header: 'Responsável Validação', width: 130 } },
    { key: 'DataUltimaValidacao', def: { header: 'Data Última Validação', width: 110 } },
    { key: 'StatusRegistro', def: { header: 'Status Registro', width: 90 } },
    { key: 'Observacoes', def: { header: 'Observações', width: 200, wrap: true } },
    { key: 'AtualizadoEm', def: { header: 'Atualizado Em', width: 130 } },
    { key: 'ID', def: { header: 'ID Interno', width: 130 } },
  ];

  // Aba 1: Requisitos Multi-Fontes
  const sheet1ColsXml = columns
    .map((c) => `<Column ss:AutoFitWidth="0" ss:Width="${c.def.width}"/>`)
    .join('');

  const sheet1TitleRow = renderXmlRow(
    [
      {
        value: `QUALYQUEST SGQ — BIBLIOTECA CENTRAL DE REQUISITOS MULTI-FONTES (${orgName})`,
        styleId: 'Title',
      },
    ],
    24
  );
  const sheet1SubtitleRow = renderXmlRow(
    [
      {
        value: `Gerado em: ${nowIso} | Registros exportados: ${rows.length} de ${
          ctx.totalAcervo ?? rows.length
        } | Filtros: ${ctx.filtrosAtivosResumo || 'Nenhum filtro restritivo'}`,
        styleId: 'Subtitle',
      },
    ],
    18
  );
  const sheet1HeaderRow = renderXmlRow(
    columns.map((c) => ({ value: c.def.header, styleId: 'Header' })),
    28
  );

  const sheet1DataRows = rows
    .map((row) =>
      renderXmlRow(
        columns.map((c) => {
          const val = row[c.key];
          if (c.def.type === 'Number') {
            return { value: Number(val) || 0, type: 'Number', styleId: 'CellNumber' };
          }
          let styleId = c.def.wrap ? 'CellWrap' : 'Cell';
          if (c.key === 'AplicabilidadeIMPACTO') {
            if (val === 'Aplicável Integralmente') styleId = 'BadgeOk';
            else if (val === 'Parcialmente Aplicável') styleId = 'BadgeWarn';
            else if (val === 'Não Aplicável') styleId = 'BadgeMuted';
          } else if (c.key === 'Criticidade') {
            if (val === 'ALTO' || val === 'CRITICO') styleId = 'BadgeDanger';
          }
          return { value: String(val ?? ''), type: 'String', styleId };
        })
      )
    )
    .join('\n');

  const sheet1RowCount = 3 + rows.length;

  // Aba 2: Resumo Executivo
  const countByOrigem = (key: string) =>
    ctx.requisitos.filter((r) => (r.fonteOrigem || 'CONTRATUAL_CLIENTE') === key).length;
  const countByAplic = (key: string) =>
    ctx.requisitos.filter((r) => (r.aplicabilidadeContexto?.situacao || 'APLICAVEL') === key).length;

  const summaryPairs: Array<[string, string | number]> = [
    ['Organização', orgName],
    ['Data/Hora da Geração', nowIso],
    ['Filtros Aplicados', ctx.filtrosAtivosResumo || 'Todos os registros'],
    ['Total Exportado na Planilha', rows.length],
    ['Total no Acervo Mestre', ctx.totalAcervo ?? rows.length],
    ['ANAC — RBAC 145', countByOrigem('REGULATORIO_ANAC')],
    ['EASA — Part-145', countByOrigem('REGULATORIO_EASA')],
    ['IOSA — ISM MNT/ORG (Setorial)', ctx.requisitos.filter((r) => r.fonteOrigem === 'PADRAO_SETORIAL_IOSA' || r.isIosaSetorial).length],
    ['Contratual — Clientes Operadores', countByOrigem('CONTRATUAL_CLIENTE')],
    ['Interno — IMPACTO (MOMQ / MPO)', countByOrigem('INTERNO_IMPACTO')],
    ['Boas Práticas SGQ', countByOrigem('BOA_PRATICA_REFERENCIA')],
    ['Aplicável Integralmente', countByAplic('APLICAVEL')],
    ['Parcialmente Aplicável', countByAplic('PARCIALMENTE_APLICAVEL')],
    ['Não Aplicável', countByAplic('NAO_APLICAVEL')],
    ['Aguardando Avaliação', countByAplic('AGUARDANDO_AVALIACAO')],
  ];

  const sheet2HeaderRow = renderXmlRow(
    [
      { value: 'Indicador / Dimensão SGQ', styleId: 'Header' },
      { value: 'Valor / Quantidade', styleId: 'Header' },
    ],
    24
  );
  const sheet2Rows = summaryPairs
    .map(([label, val]) =>
      renderXmlRow([
        { value: label, type: 'String', styleId: 'CellBold' },
        {
          value: val,
          type: typeof val === 'number' ? 'Number' : 'String',
          styleId: typeof val === 'number' ? 'CellNumber' : 'CellWrap',
        },
      ])
    )
    .join('\n');

  // Aba 3: Controles Centrais SGQ
  const controlesList = ctx.controles || [];
  const reqCountByCtrl = new Map<string, number>();
  for (const r of ctx.requisitos) {
    if (r.controleCentralId) {
      reqCountByCtrl.set(r.controleCentralId, (reqCountByCtrl.get(r.controleCentralId) || 0) + 1);
    }
  }

  const sheet3HeaderRow = renderXmlRow(
    [
      { value: 'Código Controle', styleId: 'Header' },
      { value: 'Título do Controle Central', styleId: 'Header' },
      { value: 'Módulo / Origem SGQ', styleId: 'Header' },
      { value: 'Procedimento / Referência', styleId: 'Header' },
      { value: 'Qtd. Requisitos Exportados Vinculados', styleId: 'Header' },
    ],
    24
  );
  const sheet3Rows = controlesList
    .map((ctrl) =>
      renderXmlRow([
        { value: ctrl.codigo || ctrl.id || '', type: 'String', styleId: 'CellBold' },
        { value: ctrl.nome || '', type: 'String', styleId: 'CellWrap' },
        { value: ctrl.moduloOrigem || ctrl.processoRelacionado || '', type: 'String', styleId: 'Cell' },
        { value: ctrl.documentosInternosRelacionados?.join(', ') || ctrl.descricao || '', type: 'String', styleId: 'CellWrap' },
        {
          value: reqCountByCtrl.get(ctrl.id) || 0,
          type: 'Number',
          styleId: 'CellNumber',
        },
      ])
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Biblioteca Central de Requisitos Multi-Fontes - QualyQuest SGQ</Title>
  <Author>${sanitizeXmlString(orgName)}</Author>
  <Created>${sanitizeXmlString(nowIso)}</Created>
  <Company>QualyQuest SGQ &amp; Rooster MRO</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Top"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Italic="1" ss:Color="#475569"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellWrap">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Top"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeOk">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#065F46"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeWarn">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#92400E"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeDanger">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BadgeMuted">
   <Alignment ss:Horizontal="Left" ss:Vertical="Top"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sanitizeSheetName('Requisitos Multi-Fontes')}">
  <Table ss:ExpandedColumnCount="${columns.length}" ss:ExpandedRowCount="${sheet1RowCount}" x:FullColumns="1" x:FullRows="1">
   ${sheet1ColsXml}
   ${sheet1TitleRow}
   ${sheet1SubtitleRow}
   ${sheet1HeaderRow}
   ${sheet1DataRows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>3</SplitHorizontal>
   <TopRowBottomPane>3</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
 <Worksheet ss:Name="${sanitizeSheetName('Resumo Multi-Fontes')}">
  <Table ss:ExpandedColumnCount="2" ss:ExpandedRowCount="${1 + summaryPairs.length}" x:FullColumns="1" x:FullRows="1">
   <Column ss:AutoFitWidth="0" ss:Width="260"/>
   <Column ss:AutoFitWidth="0" ss:Width="340"/>
   ${sheet2HeaderRow}
   ${sheet2Rows}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="${sanitizeSheetName('Controles Centrais SGQ')}">
  <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="${1 + controlesList.length}" x:FullColumns="1" x:FullRows="1">
   <Column ss:AutoFitWidth="0" ss:Width="130"/>
   <Column ss:AutoFitWidth="0" ss:Width="240"/>
   <Column ss:AutoFitWidth="0" ss:Width="160"/>
   <Column ss:AutoFitWidth="0" ss:Width="320"/>
   <Column ss:AutoFitWidth="0" ss:Width="160"/>
   ${sheet3HeaderRow}
   ${sheet3Rows}
  </Table>
 </Worksheet>
</Workbook>
`;
}

/**
 * Baixa o relatório de requisitos como Planilha XML (.xml - Excel SpreadsheetML).
 */
export function exportRequirementsToSpreadsheetXML(ctx: RequirementsExportContext): void {
  const xmlContent = buildRequisitosSpreadsheetXML(ctx);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const link = document.createElement('a');
  link.href = url;
  link.download = `qualyquest_requisitos_planilha_${dateStr}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Baixa o relatório de requisitos como Planilha Excel moderna (.xlsx).
 */
export function exportRequirementsToXLSX(ctx: RequirementsExportContext): void {
  const rows = buildRequirementsPlanilhaRows(ctx).map((r) => ({
    'Item / Código': r.CodigoItem,
    'Origem Normativa': r.OrigemNormativa,
    'Entidade Emissora': r.EntidadeEmissora,
    'Documento / Norma Fonte': r.DocumentoFonte,
    'Edição / Revisão': r.EdicaoRevisao,
    'Ref. Normativa Original': r.ReferenciaOriginal,
    'Capítulo / Seção': r.CapituloSecao,
    'Título Curto': r.TituloCurto,
    'Texto Original (Integral)': r.TextoOriginal,
    'Cliente / Operador': r.ClienteOperador,
    'Programa / Checklist': r.ProgramaChecklist,
    Categoria: r.Categoria,
    Criticidade: r.Criticidade,
    'Aplicabilidade IMPACTO': r.AplicabilidadeIMPACTO,
    'Justificativa Aplicabilidade': r.JustificativaAplicabilidade,
    'Código Controle SGQ': r.ControleCentralCodigo,
    'Controle Central SGQ': r.ControleCentralNome,
    'Procedimento Interno': r.ProcedimentoInternoRef,
    'Processo Responsável': r.ProcessoResponsavel,
    'Evidência Esperada': r.EvidenciaEsperada,
    'Critério de Aceitação': r.CriterioAceitacao,
    'Status Conformidade SGQ': r.StatusConformidadeSGQ,
    'Resposta Institucional': r.RespostaInstitucional,
    'Qtd. Evidências': r.TotalEvidenciasVinculadas,
    'Status Validação': r.StatusValidacao,
    'Responsável Validação': r.ResponsavelValidacao,
    'Data Última Validação': r.DataUltimaValidacao,
    'Status Registro': r.StatusRegistro,
    Observações: r.Observacoes,
    'Atualizado Em': r.AtualizadoEm,
    'ID Interno': r.ID,
  }));

  const wsReq = XLSX.utils.json_to_sheet(rows);
  wsReq['!cols'] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 34 },
    { wch: 55 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 12 },
    { wch: 24 },
    { wch: 36 },
    { wch: 16 },
    { wch: 30 },
    { wch: 26 },
    { wch: 22 },
    { wch: 36 },
    { wch: 32 },
    { wch: 22 },
    { wch: 48 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 32 },
    { wch: 22 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsReq, sanitizeSheetName('Requisitos Multi-Fontes'));

  const resumoRows = [
    { Indicador: 'Organização', Valor: ctx.organizationName || 'IMPACTO Aviation MRO' },
    { Indicador: 'Data/Hora da Geração', Valor: new Date().toISOString() },
    { Indicador: 'Filtros Aplicados', Valor: ctx.filtrosAtivosResumo || 'Todos os registros' },
    { Indicador: 'Total Exportado', Valor: rows.length },
    { Indicador: 'Total no Acervo Mestre', Valor: ctx.totalAcervo ?? rows.length },
    {
      Indicador: 'ANAC — RBAC 145',
      Valor: ctx.requisitos.filter((r) => r.fonteOrigem === 'REGULATORIO_ANAC').length,
    },
    {
      Indicador: 'EASA — Part-145',
      Valor: ctx.requisitos.filter((r) => r.fonteOrigem === 'REGULATORIO_EASA').length,
    },
    {
      Indicador: 'IOSA — ISM MNT/ORG',
      Valor: ctx.requisitos.filter((r) => r.fonteOrigem === 'PADRAO_SETORIAL_IOSA' || r.isIosaSetorial).length,
    },
    {
      Indicador: 'Contratual Clientes',
      Valor: ctx.requisitos.filter((r) => r.fonteOrigem === 'CONTRATUAL_CLIENTE').length,
    },
    {
      Indicador: 'Interno IMPACTO',
      Valor: ctx.requisitos.filter((r) => r.fonteOrigem === 'INTERNO_IMPACTO').length,
    },
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumoRows);
  wsResumo['!cols'] = [{ wch: 32 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, wsResumo, sanitizeSheetName('Resumo Multi-Fontes'));

  if (ctx.controles && ctx.controles.length > 0) {
    const reqCountByCtrl = new Map<string, number>();
    for (const r of ctx.requisitos) {
      if (r.controleCentralId) {
        reqCountByCtrl.set(r.controleCentralId, (reqCountByCtrl.get(r.controleCentralId) || 0) + 1);
      }
    }
    const ctrlRows = ctx.controles.map((c) => ({
      'Código Controle': c.codigo || c.id || '',
      'Título do Controle': c.nome || '',
      'Módulo / Processo': c.moduloOrigem || c.processoRelacionado || '',
      Descrição: c.descricao || '',
      'Requisitos Exportados Vinculados': reqCountByCtrl.get(c.id) || 0,
    }));
    const wsCtrl = XLSX.utils.json_to_sheet(ctrlRows);
    wsCtrl['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 24 }, { wch: 48 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(workbook, wsCtrl, sanitizeSheetName('Controles Centrais SGQ'));
  }

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `qualyquest_requisitos_planilha_${dateStr}.xlsx`);
}
