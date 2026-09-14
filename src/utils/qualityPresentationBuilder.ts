import { 
  NCRecord, 
  ManualRecord, 
  ConhecimentoValidadoItem, 
  ComparacaoRNCRecord, 
  FiltrosApresentacao, 
  RelatorioApresentacaoQualidade, 
  SlideApresentacao,
  AlertaItem,
  RelatorioCertificacaoIntegrada,
  RelatorioIntegridadeVisual,
  SlideGraficoDadoItem
} from '../types';
import { avaliarSaudeSGQ } from './sgqHealthEvaluator';
import { gerarSlidesApresentacao, DadosContextoApresentacao } from './presentationSlidesData';
import { executarTesteEspelho, RelatorioTesteEspelho, executarCertificacaoIntegrada } from './presentationConsistencyValidator';
import { SAFE_BOUNDS_WIDESCREEN, executarAuditoriaVisual } from './presentationGeometryValidator';
import PptxGenJS from 'pptxgenjs';

export type { DadosContextoApresentacao };

export interface RelatorioValidacaoPPTX {
  valido: boolean;
  conformidade: string;
  totalSlides: number;
  totalElementosVerificados: number;
  testeEspelhoAprovado: boolean;
  totalVerificacoesEspelho: number;
  relatorioEspelho: RelatorioTesteEspelho;
  relatorioVisual: RelatorioIntegridadeVisual;
  certificacaoIntegrada: RelatorioCertificacaoIntegrada;
}

/**
 * Validação de integridade, auto-fit e consistência Web vs PPTX (Certificação Dupla FASE 12.3)
 */
export function validarApresentacaoPPTX(apresentacao: RelatorioApresentacaoQualidade): RelatorioValidacaoPPTX {
  const certificacao = executarCertificacaoIntegrada(apresentacao);
  return {
    valido: certificacao.homologado,
    conformidade: certificacao.homologado 
      ? '100% Homologado — Paridade de Dados e Integridade Visual PASS (0 Overflow)' 
      : 'Revisão Necessária — Divergência ou Overflow Detectado',
    totalSlides: apresentacao.slides.length,
    totalElementosVerificados: certificacao.relatorioVisual.totalElementosAuditados,
    testeEspelhoAprovado: certificacao.paridadeDados.status === 'APROVADO',
    totalVerificacoesEspelho: certificacao.paridadeDados.totalVerificacoesCruzadas,
    relatorioEspelho: certificacao.relatorioEspelho,
    relatorioVisual: certificacao.relatorioVisual,
    certificacaoIntegrada: certificacao,
  };
}

/**
 * Helper para calcular larguras dinâmicas inteligentes de colunas de tabela (FASE 12.3)
 * Evita colunas estreitas demais que causam quebras excessivas de linha e empurram o rodapé.
 */
export function calcularLargurasColunasTabela(colunas: string[], larguraTotal: number): number[] {
  const n = colunas.length;
  if (n <= 1) return [larguraTotal];

  const pesos = colunas.map(col => {
    const nome = col.toLowerCase();
    if (nome.includes('título') || nome.includes('titulo') || nome.includes('descri') || nome.includes('denomina') || nome.includes('curso')) {
      return 2.4; // Descrições precisam de mais largura
    }
    if (nome.includes('código') || nome.includes('codigo') || nome.includes('rnc') || nome.includes('id') || nome.includes('rev')) {
      return 1.1; // Códigos curtos
    }
    if (nome.includes('status') || nome.includes('situa') || nome.includes('prazo') || nome.includes('data') || nome.includes('severidade') || nome.includes('risco')) {
      return 1.1; // Badges curtos
    }
    if (nome.includes('setor') || nome.includes('área') || nome.includes('area') || nome.includes('colaborador')) {
      return 1.4; // Nomes médios
    }
    return 1.2;
  });

  const somaPesos = pesos.reduce((acc, p) => acc + p, 0);
  let larguras = pesos.map(p => Number(((p / somaPesos) * larguraTotal).toFixed(2)));
  const somaAtual = larguras.reduce((acc, w) => acc + w, 0);
  const diff = Number((larguraTotal - somaAtual).toFixed(2));
  larguras[larguras.length - 1] = Number((larguras[larguras.length - 1] + diff).toFixed(2));

  return larguras;
}

/**
 * Helper para agrupar categorias em gráficos quando o número de itens excede o limite legível (FASE 12.3)
 * Preserva o total de dados agrupando excessos em "Outros"
 */
export function adaptarCategoriasGrafico(itens: SlideGraficoDadoItem[], maxCategorias = 5): SlideGraficoDadoItem[] {
  if (!itens || itens.length <= maxCategorias) return itens;

  const topItens = itens.slice(0, maxCategorias - 1);
  const excedentes = itens.slice(maxCategorias - 1);
  const somaExcedentes = excedentes.reduce((acc, curr) => acc + (curr.valor || 0), 0);

  return [
    ...topItens,
    {
      rotulo: 'Outros',
      valor: somaExcedentes,
      cor: '#94A3B8',
      subtitulo: `${excedentes.length} categorias agrupadas`,
    }
  ];
}

export const construirApresentacaoQualidade = construirRelatorioApresentacao;

/**
 * Motor de Geração de Apresentação Gerencial da Qualidade (FASE 12.2)
 * REGRA DE OURO: Consome dados auditados do SGQ e garante espelho 100% fiel entre Web Viewer e PPTX.
 */

// Helper para filtrar registros por período e setor
export function filtrarDadosApresentacao(
  records: NCRecord[],
  filtros: FiltrosApresentacao
): NCRecord[] {
  const agora = new Date();
  
  return records.filter((r) => {
    // 1. Filtro de Setor
    if (filtros.setor && filtros.setor !== 'TODOS') {
      if (r.setor !== filtros.setor) return false;
    }

    // Data de referência do registro
    const dataRegStr = r.dataIdentificacao || r.dataEmissaoFormulario || r.criadoEm;
    if (!dataRegStr) return true;
    
    const dataReg = new Date(dataRegStr);
    if (isNaN(dataReg.getTime())) return true;

    // 2. Filtro de Período
    switch (filtros.periodo) {
      case 'ULTIMOS_30_DIAS': {
        const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
        return dataReg >= trintaDiasAtras;
      }
      case 'ULTIMOS_90_DIAS': {
        const noventaDiasAtras = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
        return dataReg >= noventaDiasAtras;
      }
      case 'ANO_ATUAL': {
        const inicioAno = new Date(agora.getFullYear(), 0, 1);
        return dataReg >= inicioAno;
      }
      case 'PERSONALIZADO': {
        if (filtros.dataInicio) {
          const inicio = new Date(filtros.dataInicio);
          if (dataReg < inicio) return false;
        }
        if (filtros.dataFim) {
          const fim = new Date(filtros.dataFim);
          fim.setHours(23, 59, 59, 999);
          if (dataReg > fim) return false;
        }
        return true;
      }
      case 'TODOS':
      default:
        return true;
    }
  });
}

/**
 * Constrói o relatório e estrutura de dados da Apresentação Gerencial
 */
export function construirRelatorioApresentacao(
  records: NCRecord[],
  manuals: ManualRecord[] = [],
  knowledgeList: ConhecimentoValidadoItem[] = [],
  comparacoes: ComparacaoRNCRecord[] = [],
  filtros: FiltrosApresentacao,
  organizacaoNome: string = 'Organização SGQ',
  usuarioResponsavel: string = 'Diretoria / Gestão SGQ',
  contexto?: DadosContextoApresentacao
): RelatorioApresentacaoQualidade {
  const agora = new Date();
  const recordsFiltrados = filtrarDadosApresentacao(records, filtros);

  // Formata o rótulo de período
  let periodoFormatado = 'Histórico Geral Consolidado';
  if (filtros.periodo === 'ULTIMOS_30_DIAS') periodoFormatado = 'Últimos 30 Dias';
  else if (filtros.periodo === 'ULTIMOS_90_DIAS') periodoFormatado = 'Últimos 90 Dias';
  else if (filtros.periodo === 'ANO_ATUAL') periodoFormatado = `Ano de ${agora.getFullYear()}`;
  else if (filtros.periodo === 'PERSONALIZADO') {
    periodoFormatado = `${filtros.dataInicio || 'Início'} até ${filtros.dataFim || 'Hoje'}`;
  }

  // Avaliação de Saúde do SGQ
  const rawHealth = avaliarSaudeSGQ(recordsFiltrados, manuals, knowledgeList, comparacoes);

  // Contadores e métricas de RNCs
  const totalRNCs = recordsFiltrados.length;
  const abertas = recordsFiltrados.filter(r => r.statusGeral !== 'Encerrada').length;
  const encerradas = recordsFiltrados.filter(r => r.statusGeral === 'Encerrada').length;
  const emAndamento = totalRNCs - abertas - encerradas;

  // Riscos
  const criticos = recordsFiltrados.filter(r => r.avaliacaoRiscoInicial?.nivel === 'Crítico').length;
  const altos = recordsFiltrados.filter(r => r.avaliacaoRiscoInicial?.nivel === 'Alto').length;
  const moderados = recordsFiltrados.filter(r => r.avaliacaoRiscoInicial?.nivel === 'Médio').length;
  const baixos = recordsFiltrados.filter(r => r.avaliacaoRiscoInicial?.nivel === 'Baixo').length;

  // Eficácia
  const ncsEficazes = recordsFiltrados.filter(r => r.verificacaoEficacia?.encerrado === 'SIM').length;
  const ncsIneficazes = recordsFiltrados.filter(r => r.verificacaoEficacia?.encerrado === 'NÃO').length;
  const taxaEficacia = (ncsEficazes + ncsIneficazes) > 0 
    ? Math.round((ncsEficazes / (ncsEficazes + ncsIneficazes)) * 100) 
    : (encerradas > 0 ? 92 : 100);

  // Ações Corretivas e Atrasos
  let acoesAtrasadas = 0;
  let totalAcoes = 0;
  recordsFiltrados.forEach(r => {
    if (r.acaoCorretiva && r.acaoCorretiva.descricao) {
      totalAcoes++;
      if (r.acaoCorretiva.status !== 'Concluída' && r.acaoCorretiva.dataPrazo) {
        if (new Date(r.acaoCorretiva.dataPrazo).getTime() < agora.getTime()) {
          acoesAtrasadas++;
        }
      }
    }
  });

  const taxaResolucao = totalRNCs > 0 ? Math.round((encerradas / totalRNCs) * 100) : 0;

  // Gera os 20 slides utilizando o motor centralizado
  const slides = gerarSlidesApresentacao(
    recordsFiltrados,
    manuals,
    knowledgeList,
    comparacoes,
    filtros,
    organizacaoNome,
    usuarioResponsavel,
    periodoFormatado,
    contexto
  );

  return {
    geradoEm: agora.toISOString(),
    versaoSistema: 'v2.8.0-enterprise',
    organizacao: organizacaoNome,
    responsavel: usuarioResponsavel,
    filtros,
    resumoExecutivo: {
      periodoFormatado,
      totalRNCs,
      sgqHealthScore: rawHealth.scoreIntegridade,
      riscosCriticos: criticos,
      acoesAtrasadas,
      recorrencias: 0,
      principaisPontosAtencao: [
        `${totalRNCs} desvio(s) cadastrado(s) no período auditado`,
        `${encerradas} Não Conformidade(s) tratada(s) e encerrada(s)`,
        `${criticos} registro(s) de alta severidade operacional`,
      ],
    },
    slides,
  };
}

// Utilitário para truncar textos
function truncarTexto(texto: string, maxLen: number): string {
  if (!texto) return '';
  return texto.length > maxLen ? texto.substring(0, maxLen - 3) + '...' : texto;
}

/**
 * Exportador Oficial de Apresentação Gerencial para Microsoft PowerPoint (.pptx)
 * 16:9 Widescreen | Paleta Executiva Aeronáutica | Auto-Fit Rigoroso | Sincronizado com Web Viewer
 */
export async function exportarApresentacaoPPTX(
  apresentacao: RelatorioApresentacaoQualidade,
  nomeArquivo?: string
): Promise<void> {
  const pptx = new PptxGenJS();

  // Configuração Widescreen 16:9 (13.33 x 7.5 polegadas)
  pptx.layout = 'LAYOUT_16x9';

  // Paleta Executiva Corporativa
  const COR_NAVY = '0F172A';
  const COR_BLUE = '1E40AF';
  const COR_TEXT_DARK = '1E293B';
  const COR_TEXT_MUTED = '64748B';
  const COR_CARD_BG = 'F8FAFC';
  const COR_BORDER = 'E2E8F0';
  const COR_EMERALD = '059669';
  const COR_ROSE = 'DC2626';
  const COR_AMBER = 'D97706';

  // SLIDE DE CAPA
  const slideCapa = pptx.addSlide();
  slideCapa.background = { color: COR_NAVY };

  // Faixa decorativa superior
  slideCapa.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.25,
    fill: { color: COR_BLUE },
  });

  // Título e Subtítulo
  slideCapa.addText('QUALIGEST SGQ', {
    x: 1.0,
    y: 1.8,
    w: 11.33,
    h: 0.5,
    fontSize: 18,
    fontFace: 'Arial',
    color: '93C5FD',
    bold: true,
    charSpacing: 2,
  });

  slideCapa.addText('APRESENTAÇÃO GERENCIAL DA QUALIDADE', {
    x: 1.0,
    y: 2.3,
    w: 11.33,
    h: 1.2,
    fontSize: 28,
    fontFace: 'Arial',
    color: 'FFFFFF',
    bold: true,
  });

  slideCapa.addText('Espelho Executivo da Garantia da Qualidade Aeronáutica e Segurança Operacional', {
    x: 1.0,
    y: 3.5,
    w: 11.33,
    h: 0.6,
    fontSize: 14,
    fontFace: 'Arial',
    color: 'CBD5E1',
  });

  // Caixa de Metadados Institucionais
  slideCapa.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 4.5,
    w: 11.33,
    h: 1.9,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
    rectRadius: 0.08,
  });

  const dtEmissao = new Date(apresentacao.geradoEm).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const metaItems = [
    { rotulo: 'ORGANIZAÇÃO', valor: apresentacao.organizacao },
    { rotulo: 'PERÍODO AUDITADO', valor: apresentacao.resumoExecutivo.periodoFormatado },
    { rotulo: 'RESPONSÁVEL TÉCNICO', valor: apresentacao.responsavel },
    { rotulo: 'DATA DE EMISSÃO', valor: dtEmissao },
  ];

  metaItems.forEach((m, idx) => {
    const colW = 2.65;
    const colX = 1.25 + idx * 2.75;
    slideCapa.addText(m.rotulo, {
      x: colX,
      y: 4.8,
      w: colW,
      h: 0.3,
      fontSize: 8.5,
      fontFace: 'Arial',
      color: '94A3B8',
      bold: true,
    });
    slideCapa.addText(truncarTexto(m.valor, 30), {
      x: colX,
      y: 5.15,
      w: colW,
      h: 0.8,
      fontSize: 11,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true,
    });
  });

  // Rodapé da Capa
  slideCapa.addText(`QualiGest SGQ ${apresentacao.versaoSistema} | Documento Oficial Auditável | RBAC 145 / ISO 9001:2015`, {
    x: 1.0,
    y: 6.8,
    w: 11.33,
    h: 0.3,
    fontSize: 9,
    fontFace: 'Arial',
    color: '64748B',
  });

  // SLIDES DE CONTEÚDO (SLIDES 2 A 20)
  apresentacao.slides.slice(1).forEach((slideData) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Barra de Cabeçalho Superior
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.15,
      fill: { color: COR_NAVY },
    });

    // Número e Categoria do Slide
    slide.addText(`SLIDE ${slideData.numero} • ${slideData.categoria.toUpperCase()}`, {
      x: 0.8,
      y: 0.30,
      w: 10.0,
      h: 0.22,
      fontSize: 8.5,
      fontFace: 'Arial',
      color: COR_BLUE,
      bold: true,
      charSpacing: 1.5,
    });

    // Título do Slide com Dimensionamento Adaptativo (FASE 12.3)
    const titleLen = (slideData.titulo || '').length;
    const titleFontSize = titleLen > 65 ? 13 : titleLen > 45 ? 14.5 : 16;
    slide.addText(slideData.titulo, {
      x: 0.8,
      y: 0.52,
      w: 11.7,
      h: 0.45,
      fontSize: titleFontSize,
      fontFace: 'Arial',
      bold: true,
      color: COR_NAVY,
    });

    // Subtítulo do Slide
    const subLen = (slideData.subtitulo || '').length;
    const subFontSize = subLen > 110 ? 8.5 : 9.5;
    slide.addText(truncarTexto(slideData.subtitulo, 130), {
      x: 0.8,
      y: 0.98,
      w: 11.7,
      h: 0.32,
      fontSize: subFontSize,
      fontFace: 'Arial',
      color: COR_TEXT_MUTED,
    });

    // CARDS DE MÉTRICAS NO TOPO (4 Cards)
    const metricas = slideData.metricasPrincipais || [];
    const totalCards = Math.min(metricas.length, 4);

    if (totalCards > 0) {
      const margemX = 0.8;
      const espacoEntreCards = 0.2;
      const larguraTotal = 11.7;
      const cardW = (larguraTotal - (totalCards - 1) * espacoEntreCards) / totalCards;
      const cardH = 0.95;
      const cardY = 1.38;

      metricas.slice(0, 4).forEach((m, idx) => {
        const cardX = margemX + idx * (cardW + espacoEntreCards);
        let corValor = COR_NAVY;
        if (m.status === 'critico') corValor = COR_ROSE;
        else if (m.status === 'alerta') corValor = COR_AMBER;
        else if (m.status === 'sucesso') corValor = COR_EMERALD;

        slide.addShape(pptx.ShapeType.roundRect, {
          x: cardX,
          y: cardY,
          w: cardW,
          h: cardH,
          fill: { color: COR_CARD_BG },
          line: { color: COR_BORDER, width: 1 },
          rectRadius: 0.06,
        });

        slide.addText(truncarTexto(m.rotulo.toUpperCase(), 28), {
          x: cardX + 0.15,
          y: cardY + 0.08,
          w: cardW - 0.3,
          h: 0.22,
          fontSize: 7.5,
          fontFace: 'Arial',
          bold: true,
          color: COR_TEXT_MUTED,
        });

        const valorStr = String(m.valor);
        const fontSizeValor = valorStr.length > 12 ? 12 : valorStr.length > 8 ? 14 : 16;
        slide.addText(valorStr, {
          x: cardX + 0.15,
          y: cardY + 0.28,
          w: cardW - 0.3,
          h: 0.38,
          fontSize: fontSizeValor,
          fontFace: 'Arial',
          bold: true,
          color: corValor,
        });

        const subtituloTexto = m.subtitulo || (m.meta ? `Meta: ${m.meta}` : 'Monitoramento contínuo');
        slide.addText(truncarTexto(subtituloTexto, 35), {
          x: cardX + 0.15,
          y: cardY + 0.68,
          w: cardW - 0.3,
          h: 0.22,
          fontSize: 7.5,
          fontFace: 'Arial',
          color: COR_TEXT_MUTED,
        });
      });
    }

    // Ponto de início vertical do conteúdo principal
    const posYConteudo = totalCards > 0 ? 2.50 : 1.45;
    const maxBottomY = 6.85;
    const availH = maxBottomY - posYConteudo;

    // -------------------------------------------------------------
    // CENÁRIO A: SLIDE COM "SEM DADOS" -> BANNER FORMAL
    // -------------------------------------------------------------
    if (slideData.semDados) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: posYConteudo + 0.2,
        w: 11.7,
        h: 2.5,
        fill: { color: 'FEF3C7' },
        line: { color: 'F59E0B', width: 1.5 },
        rectRadius: 0.08,
      });

      slide.addText('DADOS INSUFICIENTES PARA ANÁLISE ESTATÍSTICA', {
        x: 1.1,
        y: posYConteudo + 0.5,
        w: 11.1,
        h: 0.40,
        fontSize: 13,
        fontFace: 'Arial',
        bold: true,
        color: 'B45309',
      });

      slide.addText('O QualiGest SGQ não inventa nem interpola tendências sem um histórico temporal com relevância estatística comprovada.', {
        x: 1.1,
        y: posYConteudo + 0.95,
        w: 11.1,
        h: 0.45,
        fontSize: 11,
        fontFace: 'Arial',
        color: '92400E',
      });

      slide.addText('Para desbloquear este indicador e gerar séries consolidadas, cadastre novas ocorrências ou conclua as verificações pendentes.', {
        x: 1.1,
        y: posYConteudo + 1.45,
        w: 11.1,
        h: 0.5,
        fontSize: 9.5,
        fontFace: 'Arial',
        color: '78350F',
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO B: SLIDE COM GRÁFICO (NATIVO PPTX OU MATRIZ) + TABELA / PONTOS
    // Layout Bi-Partido: Gráfico à Esquerda (5.60) | Tabela à Direita (5.80)
    // -------------------------------------------------------------
    else if (slideData.graficoDados && slideData.graficoDados.tipo !== 'nenhum') {
      const grafico = slideData.graficoDados;
      const temTabela = slideData.tabelaDados && slideData.tabelaDados.linhas.length > 0;

      // 1. LADO ESQUERDO: GRÁFICO PPTX NATIVO OU MATRIZ 5X5
      if (grafico.tipo === 'barras' || grafico.tipo === 'ishikawa-6m') {
        const itensAdaptados = adaptarCategoriasGrafico(grafico.itens || [], 6);
        const chartData = [
          {
            name: slideData.titulo,
            labels: itensAdaptados.map(i => truncarTexto(i.rotulo, 18)),
            values: itensAdaptados.map(i => i.valor),
          },
        ];

        slide.addChart(pptx.ChartType.bar, chartData, {
          x: 0.8,
          y: posYConteudo + 0.1,
          w: temTabela ? 5.6 : 11.7,
          h: availH - 0.2,
          showValue: true,
          chartColors: itensAdaptados.map(i => (i.cor ? i.cor.replace('#', '') : '1E40AF')),
          valGridLine: { color: 'E2E8F0', size: 0.5 },
          catAxisLabelFontSize: 8,
          valAxisLabelFontSize: 8,
        });
      } else if (grafico.tipo === 'pizza') {
        const itensAdaptados = adaptarCategoriasGrafico(grafico.itens || [], 5);
        const chartData = [
          {
            name: slideData.titulo,
            labels: itensAdaptados.map(i => truncarTexto(i.rotulo, 18)),
            values: itensAdaptados.map(i => i.valor),
          },
        ];

        slide.addChart(pptx.ChartType.pie, chartData, {
          x: 0.8,
          y: posYConteudo + 0.1,
          w: temTabela ? 5.6 : 11.7,
          h: availH - 0.2,
          showPercent: true,
          showLegend: true,
          legendPos: 'b',
          legendFontSize: 7.5,
          chartColors: itensAdaptados.map(i => (i.cor ? i.cor.replace('#', '') : '1E40AF')),
        });
      } else if (grafico.tipo === 'matriz-5x5') {
        // Renderiza a Matriz 5x5 em forma de Tabela Estruturada PPTX no lado esquerdo
        const severidades = ['5 - Catastrófica', '4 - Crítica', '3 - Significativa', '2 - Menor', '1 - Desprezível'];
        const probs = ['1-Imp', '2-Rem', '3-Remo', '4-Prov', '5-Freq'];
        const contagem = grafico.matriz5x5?.contagem || {};

        const headerRow: any[] = [
          { text: 'Sev \\ Prob', options: { bold: true, fill: { color: COR_NAVY }, color: 'FFFFFF', fontSize: 7.5, align: 'center' as const } },
          ...probs.map(p => ({ text: p, options: { bold: true, fill: { color: COR_BLUE }, color: 'FFFFFF', fontSize: 7.5, align: 'center' as const } }))
        ];

        const bodyRows: any[][] = [5, 4, 3, 2, 1].map((s, sIdx) => {
          const rowCells: any[] = [
            { text: severidades[sIdx], options: { bold: true, fill: { color: 'F1F5F9' }, color: COR_TEXT_DARK, fontSize: 7.0 } }
          ];
          [1, 2, 3, 4, 5].forEach(p => {
            const qtd = contagem[`${s}-${p}`] || 0;
            const score = s * p;
            let bgColor = 'E2E8F0';
            let txtColor = '000000';
            if (score >= 15) { bgColor = 'FEE2E2'; txtColor = '991B1B'; }
            else if (score >= 10) { bgColor = 'FFEDD5'; txtColor = '9A3412'; }
            else if (score >= 5) { bgColor = 'FEF9C3'; txtColor = '854D0E'; }
            else { bgColor = 'DCFCE7'; txtColor = '166534'; }

            rowCells.push({
              text: `${qtd}`,
              options: {
                fill: { color: bgColor },
                color: txtColor,
                fontSize: 8.0,
                bold: qtd > 0,
                align: 'center' as const,
              }
            });
          });
          return rowCells;
        });

        // Tabela Matriz com colW calibrado
        slide.addTable([headerRow, ...bodyRows], {
          x: 0.8,
          y: posYConteudo + 0.1,
          w: temTabela ? 5.6 : 11.7,
          colW: temTabela ? [1.60, 0.80, 0.80, 0.80, 0.80, 0.80] : [2.73, 1.80, 1.80, 1.80, 1.80, 1.80],
          rowH: 0.28,
          border: { pt: 0.5, color: COR_BORDER },
        });

        // Legenda de Faixas de Risco logo abaixo da Matriz
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: posYConteudo + 0.1 + (6 * 0.28) + 0.10,
          w: temTabela ? 5.6 : 11.7,
          h: 0.45,
          fill: { color: 'F8FAFC' },
          line: { color: COR_BORDER, width: 1 },
          rectRadius: 0.05,
        });

        slide.addText('Faixas de Risco: 🔴 Crítico (P1: 15-25) | 🟠 Alto (P2: 10-14) | 🟡 Médio (P3: 5-9) | 🟢 Baixo (P4: 1-4)', {
          x: 0.9,
          y: posYConteudo + 0.1 + (6 * 0.28) + 0.12,
          w: temTabela ? 5.4 : 11.5,
          h: 0.40,
          fontSize: 7.5,
          fontFace: 'Arial',
          color: COR_TEXT_DARK,
          align: 'center' as const,
        });
      } else {
        // Outros tipos (ecossistema, maturidade, roadmap): Card representativo
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8,
          y: posYConteudo + 0.1,
          w: temTabela ? 5.6 : 11.7,
          h: availH - 0.2,
          fill: { color: COR_CARD_BG },
          line: { color: COR_BORDER, width: 1 },
          rectRadius: 0.08,
        });

        slide.addText(grafico.titulo || 'Mapeamento Arquitetural', {
          x: 1.0,
          y: posYConteudo + 0.25,
          w: temTabela ? 5.2 : 11.3,
          h: 0.30,
          fontSize: 11,
          fontFace: 'Arial',
          bold: true,
          color: COR_NAVY,
        });

        const itensFormatados = (grafico.itens || []).slice(0, 6).map(it => ({
          text: `${it.rotulo}: ${it.subtitulo || it.valor}`,
          options: { bullet: true, fontSize: 8.5, fontFace: 'Arial', color: COR_TEXT_DARK, lineSpacing: 14 }
        }));

        slide.addText(itensFormatados, {
          x: 1.0,
          y: posYConteudo + 0.65,
          w: temTabela ? 5.2 : 11.3,
          h: availH - 0.9,
        });
      }

      // 2. LADO DIREITO: TABELA DE DADOS FORMATADA OU DESTAQUES
      if (temTabela && slideData.tabelaDados) {
        const colunas = slideData.tabelaDados.colunas;
        const linhasOriginais = slideData.tabelaDados.linhas;
        const maxLinhasVisiveis = 5;
        const precisaResumo = linhasOriginais.length > maxLinhasVisiveis;
        const linhasExibidas = precisaResumo ? linhasOriginais.slice(0, 4) : linhasOriginais;

        // Distribuição inteligente de larguras para 5.80 polegadas
        const largurasColunas = calcularLargurasColunasTabela(colunas, 5.80);

        const headerRow = colunas.map(c => ({
          text: truncarTexto(c, 24),
          options: {
            bold: true,
            fill: { color: COR_BLUE },
            color: 'FFFFFF',
            fontSize: 8.0,
            fontFace: 'Arial',
            align: 'left' as const,
          },
        }));

        const bodyRows = linhasExibidas.map((linha, rIdx) =>
          linha.map((celula, cIdx) => {
            const ehDescricao = cIdx === 1 || colunas[cIdx].toLowerCase().includes('título') || colunas[cIdx].toLowerCase().includes('descri');
            const maxChars = ehDescricao ? 28 : 16;
            return {
              text: truncarTexto(String(celula), maxChars),
              options: {
                fill: { color: rIdx % 2 === 0 ? 'FFFFFF' : 'F1F5F9' },
                color: COR_TEXT_DARK,
                fontSize: 7.5,
                fontFace: 'Arial',
                align: 'left' as const,
              },
            };
          })
        );

        if (precisaResumo) {
          const totalOmitidas = linhasOriginais.length - 4;
          const textoResumo = `Exibindo 4 de ${linhasOriginais.length} registros (+ ${totalOmitidas} omitidos)`;
          bodyRows.push(colunas.map((_, cIdx) => ({
            text: cIdx === 0 ? textoResumo : '',
            options: { fill: { color: 'E2E8F0' }, color: COR_TEXT_MUTED, fontSize: 7.0, fontFace: 'Arial', italic: true, align: 'left' as const },
          })));
        }

        const alturaTabela = 0.30 + linhasExibidas.length * 0.28 + (precisaResumo ? 0.28 : 0);

        slide.addTable([headerRow, ...bodyRows], {
          x: 6.7,
          y: posYConteudo + 0.1,
          w: 5.8,
          colW: largurasColunas,
          rowH: 0.28,
          border: { pt: 0.5, color: COR_BORDER },
        });

        // Síntese Executiva / Diretriz no espaço remanescente abaixo da tabela
        const espacoAbaixo = availH - alturaTabela - 0.30;
        if (espacoAbaixo >= 1.0) {
          const yBox = posYConteudo + 0.1 + alturaTabela + 0.12;
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 6.7,
            y: yBox,
            w: 5.8,
            h: Math.min(espacoAbaixo, 1.40),
            fill: { color: COR_CARD_BG },
            line: { color: COR_BORDER, width: 1 },
            rectRadius: 0.06,
          });

          slide.addText('Diretriz e Ação Recomendada SGQ', {
            x: 6.85,
            y: yBox + 0.10,
            w: 5.5,
            h: 0.22,
            fontSize: 9.0,
            fontFace: 'Arial',
            bold: true,
            color: COR_NAVY,
          });

          const notas = (slideData.pontosChave || []).slice(0, 2).map(p => ({
            text: truncarTexto(p, 110),
            options: { bullet: true, fontSize: 8.0, fontFace: 'Arial', color: COR_TEXT_DARK, lineSpacing: 13 }
          }));

          slide.addText(notas, {
            x: 6.85,
            y: yBox + 0.35,
            w: 5.5,
            h: Math.min(espacoAbaixo - 0.45, 0.95),
          });
        }
      } else {
        // Se não há tabela, pontos-chave no lado direito
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 6.7,
          y: posYConteudo + 0.1,
          w: 5.8,
          h: availH - 0.2,
          fill: { color: COR_CARD_BG },
          line: { color: COR_BORDER, width: 1 },
          rectRadius: 0.08,
        });

        slide.addText('Destaques e Análise Técnica SGQ', {
          x: 6.9,
          y: posYConteudo + 0.25,
          w: 5.4,
          h: 0.30,
          fontSize: 11,
          fontFace: 'Arial',
          bold: true,
          color: COR_NAVY,
        });

        const bullets = slideData.pontosChave.slice(0, 5).map(p => ({
          text: truncarTexto(p, 130),
          options: {
            bullet: true,
            fontSize: 8.5,
            fontFace: 'Arial',
            color: COR_TEXT_DARK,
            lineSpacing: 15,
          },
        }));

        slide.addText(bullets, {
          x: 6.9,
          y: posYConteudo + 0.65,
          w: 5.4,
          h: availH - 0.9,
        });
      }
    }

    // -------------------------------------------------------------
    // CENÁRIO C: TABELA DE DADOS FORMATADA (LARGURA COMPLETA)
    // -------------------------------------------------------------
    else if (slideData.tabelaDados && slideData.tabelaDados.linhas.length > 0) {
      const colunas = slideData.tabelaDados.colunas;
      const linhasOriginais = slideData.tabelaDados.linhas;
      const maxLinhasVisiveis = 6;
      const precisaResumo = linhasOriginais.length > maxLinhasVisiveis;
      const linhasExibidas = precisaResumo ? linhasOriginais.slice(0, 5) : linhasOriginais;

      const largurasColunas = calcularLargurasColunasTabela(colunas, 11.70);
      const rowHeight = 0.30;
      const tableFontSize = 8.5;

      const headerRow = colunas.map(c => ({
        text: truncarTexto(c, 30),
        options: {
          bold: true,
          fill: { color: COR_BLUE },
          color: 'FFFFFF',
          fontSize: 9.0,
          fontFace: 'Arial',
          align: 'left' as const,
        },
      }));

      const bodyRows = linhasExibidas.map((linha, rIdx) => 
        linha.map((celula, cIdx) => {
          const ehDescricao = cIdx === 1 || colunas[cIdx].toLowerCase().includes('título') || colunas[cIdx].toLowerCase().includes('descri');
          const maxChars = ehDescricao ? 42 : 22;
          return {
            text: truncarTexto(String(celula), maxChars),
            options: {
              fill: { color: rIdx % 2 === 0 ? 'FFFFFF' : 'F1F5F9' },
              color: COR_TEXT_DARK,
              fontSize: tableFontSize,
              fontFace: 'Arial',
              align: 'left' as const,
            },
          };
        })
      );

      if (precisaResumo) {
        const totalOmitidas = linhasOriginais.length - 5;
        const resumoLinha = colunas.map((_, cIdx) => ({
          text: cIdx === 0 ? `Exibindo 5 de ${linhasOriginais.length} registros (+ ${totalOmitidas} omitidos)` : '',
          options: {
            fill: { color: 'E2E8F0' },
            color: COR_TEXT_MUTED,
            fontSize: 8.0,
            fontFace: 'Arial',
            italic: true,
            align: 'left' as const,
          },
        }));
        bodyRows.push(resumoLinha);
      }

      slide.addTable([headerRow, ...bodyRows], {
        x: 0.8,
        y: posYConteudo + 0.1,
        w: 11.7,
        colW: largurasColunas,
        rowH: rowHeight,
        border: { pt: 0.5, color: COR_BORDER },
      });
    }

    // -------------------------------------------------------------
    // CENÁRIO D: PONTOS-CHAVE E ANÁLISE TÉCNICA (LARGURA COMPLETA)
    // -------------------------------------------------------------
    else {
      const boxHeight = Math.min(availH - 0.2, 3.8);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: posYConteudo + 0.1,
        w: 11.7,
        h: boxHeight,
        fill: { color: COR_CARD_BG },
        line: { color: COR_BORDER, width: 1 },
        rectRadius: 0.08,
      });

      slide.addText('Destaques e Análise Técnica SGQ', {
        x: 1.1,
        y: posYConteudo + 0.25,
        w: 11.1,
        h: 0.30,
        fontSize: 11,
        fontFace: 'Arial',
        bold: true,
        color: COR_NAVY,
      });

      const qtdBullets = slideData.pontosChave.length;
      const bulletFontSize = qtdBullets <= 4 ? 10.0 : qtdBullets <= 5 ? 9.0 : 8.5;
      const bulletLineSpacing = qtdBullets <= 4 ? 18 : qtdBullets <= 5 ? 15 : 13;
      const maxCharPorBullet = qtdBullets <= 4 ? 160 : 130;

      const bullets = slideData.pontosChave.map(p => ({
        text: truncarTexto(p, maxCharPorBullet),
        options: {
          bullet: true,
          fontSize: bulletFontSize,
          fontFace: 'Arial',
          color: COR_TEXT_DARK,
          lineSpacing: bulletLineSpacing,
        },
      }));

      slide.addText(bullets, {
        x: 1.1,
        y: posYConteudo + 0.65,
        w: 11.1,
        h: Math.min(boxHeight - 0.8, 3.0),
      });
    }

    // RODAPÉ DO SLIDE
    slide.addText(`QualiGest SGQ v2.8.0 | Organização: ${apresentacao.organizacao} | Fonte: ${slideData.origemRastreabilidade}`, {
      x: 0.8,
      y: 7.05,
      w: 11.7,
      h: 0.30,
      fontSize: 8,
      fontFace: 'Arial',
      color: COR_TEXT_MUTED,
    });
  });

  const defaultFileName = `Apresentacao_Qualidade_${apresentacao.organizacao.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pptx`;
  await pptx.writeFile({ fileName: nomeArquivo || defaultFileName });
}

/**
 * Exportador de Dados Tabulares da Apresentação em CSV
 */
export function exportarApresentacaoCSV(apresentacao: RelatorioApresentacaoQualidade): void {
  const linhasCSV: string[] = [];
  linhasCSV.push(`RELATÓRIO GERENCIAL DA QUALIDADE - QUALIGEST SGQ`);
  linhasCSV.push(`Organização;${apresentacao.organizacao}`);
  linhasCSV.push(`Período;${apresentacao.resumoExecutivo.periodoFormatado}`);
  linhasCSV.push(`Data de Emissão;${apresentacao.geradoEm}`);
  linhasCSV.push(`Versão;${apresentacao.versaoSistema}`);
  linhasCSV.push(``);
  linhasCSV.push(`SLIDES E INDICADORES CONSOLIDADOS`);
  linhasCSV.push(`Slide;Título;Categoria;Métrica;Valor;Rastreabilidade`);

  apresentacao.slides.forEach(s => {
    if (s.metricasPrincipais.length > 0) {
      s.metricasPrincipais.forEach(m => {
        linhasCSV.push(`${s.numero};"${s.titulo}";"${s.categoria}";"${m.rotulo}";"${m.valor}";"${s.origemRastreabilidade}"`);
      });
    } else {
      linhasCSV.push(`${s.numero};"${s.titulo}";"${s.categoria}";"N/A";"N/A";"${s.origemRastreabilidade}"`);
    }
  });

  const blob = new Blob([linhasCSV.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dados_Apresentacao_SGQ_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
