import { 
  SlideApresentacao, 
  RelatorioApresentacaoQualidade, 
  BoundingBox, 
  SafeBounds, 
  InfracaoGeometrica, 
  ResultadoIntegridadeVisualSlide, 
  RelatorioIntegridadeVisual, 
  ClassificacaoDensidadeSlide 
} from '../types';

/**
 * Motor Central de Estabilização Geométrica, Safe Area e Auto-Fit (FASE 12.3)
 * Widescreen 16:9 (13.333" x 7.50")
 * 
 * Regra Permanente:
 * Nenhum elemento visual ou textual pode transbordar da área útil segura do slide.
 * Todo o conteúdo se adapta aos limites físicos sem perda de dados essenciais.
 */

export const SAFE_BOUNDS_WIDESCREEN: SafeBounds = {
  slideWidth: 13.333,
  slideHeight: 7.50,
  safeLeft: 0.80,
  safeRight: 12.533, // 13.333 - 0.80
  headerBottom: 1.35,
  safeTop: 1.35,
  safeBottom: 6.85, // Garante 0.15" de folga mínima antes do rodapé (7.00")
  footerTop: 7.00,
  guardMarginBottom: 0.15,
};

/**
 * Valida os limites geométricos de um elemento contra os limites seguros do slide
 */
export function validateSlideBounds(
  element: BoundingBox, 
  safeBounds: SafeBounds = SAFE_BOUNDS_WIDESCREEN, 
  slideNumero: number
): InfracaoGeometrica[] {
  const infracoes: InfracaoGeometrica[] = [];
  const epsilon = 0.02; // Tolerância de arredondamento de 0.02 polegadas

  // Elementos do tipo HEADER ou FOOTER têm suas próprias zonas reservadas
  if (element.tipo === 'HEADER') {
    if (element.y < 0 - epsilon || element.y + element.h > safeBounds.headerBottom + epsilon) {
      infracoes.push({
        slideNumero,
        elementoId: element.id,
        tipoInfracao: 'COLISAO_CABECALHO',
        detalhes: `Cabeçalho ultrapassa faixa reservada (y: ${element.y.toFixed(2)}, h: ${element.h.toFixed(2)}, limite: ${safeBounds.headerBottom.toFixed(2)}).`,
        envelope: { ...element },
      });
    }
    return infracoes;
  }

  if (element.tipo === 'FOOTER') {
    if (element.y < safeBounds.footerTop - epsilon) {
      infracoes.push({
        slideNumero,
        elementoId: element.id,
        tipoInfracao: 'COLISAO_RODAPE',
        detalhes: `Rodapé posicionado acima da zona reservada (y: ${element.y.toFixed(2)}, esperado >= ${safeBounds.footerTop.toFixed(2)}).`,
        envelope: { ...element },
      });
    }
    return infracoes;
  }

  // 1. Limite Esquerdo
  if (element.x < safeBounds.safeLeft - epsilon) {
    infracoes.push({
      slideNumero,
      elementoId: element.id,
      tipoInfracao: 'FORA_DA_SAFE_AREA',
      detalhes: `Elemento ultrapassa margem esquerda (x: ${element.x.toFixed(2)}" < ${safeBounds.safeLeft.toFixed(2)}").`,
      envelope: { ...element },
    });
  }

  // 2. Limite Direito
  const rightEdge = element.x + element.w;
  if (rightEdge > safeBounds.safeRight + epsilon) {
    infracoes.push({
      slideNumero,
      elementoId: element.id,
      tipoInfracao: 'OVERFLOW_HORIZONTAL',
      detalhes: `Elemento ultrapassa margem direita (x+w: ${rightEdge.toFixed(2)}" > ${safeBounds.safeRight.toFixed(2)}").`,
      envelope: { ...element },
    });
  }

  // 3. Limite Superior
  if (element.y < safeBounds.safeTop - epsilon) {
    infracoes.push({
      slideNumero,
      elementoId: element.id,
      tipoInfracao: 'COLISAO_CABECALHO',
      detalhes: `Elemento invade área de cabeçalho (y: ${element.y.toFixed(2)}" < ${safeBounds.safeTop.toFixed(2)}").`,
      envelope: { ...element },
    });
  }

  // 4. Limite Inferior (Crítico: Colisão com Rodapé)
  const bottomEdge = element.y + element.h;
  if (bottomEdge > safeBounds.safeBottom + epsilon) {
    infracoes.push({
      slideNumero,
      elementoId: element.id,
      tipoInfracao: 'COLISAO_RODAPE',
      detalhes: `Elemento invade zona de segurança do rodapé (y+h: ${bottomEdge.toFixed(2)}" > ${safeBounds.safeBottom.toFixed(2)}", folga < ${safeBounds.guardMarginBottom.toFixed(2)}").`,
      envelope: { ...element },
    });
  }

  return infracoes;
}

/**
 * Detecta sobreposição indevida entre dois elementos irmãos não aninhados
 */
export function detectarSobreposicaoElementos(
  elemA: BoundingBox, 
  elemB: BoundingBox,
  slideNumero: number
): InfracaoGeometrica | null {
  // Ignora se for o mesmo elemento ou containers de fundo
  if (elemA.id === elemB.id || elemA.tipo === 'CONTAINER' || elemB.tipo === 'CONTAINER') {
    return null;
  }

  const epsilon = 0.05; // Margem de tolerância
  const colideHorizontal = (elemA.x < elemB.x + elemB.w - epsilon) && (elemA.x + elemA.w > elemB.x + epsilon);
  const colideVertical = (elemA.y < elemB.y + elemB.h - epsilon) && (elemA.y + elemA.h > elemB.y + epsilon);

  if (colideHorizontal && colideVertical) {
    return {
      slideNumero,
      elementoId: `${elemA.id}_x_${elemB.id}`,
      tipoInfracao: 'SOBREPOSICAO',
      detalhes: `Sobreposição detectada entre "${elemA.id}" e "${elemB.id}".`,
      envelope: { ...elemA },
    };
  }

  return null;
}

/**
 * Calcula os envelopes geométricos reais esperados para cada elemento do slide
 */
export function calcularEnvelopesSlide(
  slide: SlideApresentacao, 
  safeBounds: SafeBounds = SAFE_BOUNDS_WIDESCREEN
): BoundingBox[] {
  const envelopes: BoundingBox[] = [];

  // 1. Envelope de Cabeçalho
  envelopes.push({
    id: `slide_${slide.numero}_header`,
    tipo: 'HEADER',
    x: safeBounds.safeLeft,
    y: 0.25,
    w: safeBounds.safeRight - safeBounds.safeLeft,
    h: 1.05,
  });

  // 2. Cards de Métricas (Top KPI - Até 6 Cards)
  const metricas = slide.metricasPrincipais || [];
  const totalCards = Math.min(metricas.length, 6);

  if (totalCards > 0) {
    const espacoEntreCards = totalCards > 4 ? 0.12 : 0.20;
    const larguraTotal = safeBounds.safeRight - safeBounds.safeLeft;
    const cardW = (larguraTotal - (totalCards - 1) * espacoEntreCards) / totalCards;
    const cardH = 0.95;
    const cardY = 1.38;

    for (let idx = 0; idx < totalCards; idx++) {
      envelopes.push({
        id: `slide_${slide.numero}_kpi_${idx + 1}`,
        tipo: 'CARD_KPI',
        x: safeBounds.safeLeft + idx * (cardW + espacoEntreCards),
        y: cardY,
        w: cardW,
        h: cardH,
      });
    }
  }

  // Ponto de início vertical do conteúdo
  const posYConteudo = totalCards > 0 ? 2.45 : 1.40;
  const availH = safeBounds.safeBottom - posYConteudo;

  // 3. Conteúdo Principal
  if (slide.semDados) {
    // Banner Formal de Dados Insuficientes
    envelopes.push({
      id: `slide_${slide.numero}_banner_sem_dados`,
      tipo: 'BANNER_SEM_DADOS',
      x: safeBounds.safeLeft,
      y: posYConteudo + 0.10,
      w: safeBounds.safeRight - safeBounds.safeLeft,
      h: Math.min(availH - 0.20, 2.50),
    });
  } else if (slide.graficoDados && slide.graficoDados.tipo !== 'nenhum') {
    // Layout Bi-Partido: Gráfico à Esquerda (5.60") | Tabela/Análise à Direita (5.80")
    const temTabela = slide.tabelaDados && slide.tabelaDados.linhas.length > 0;
    const wLeft = temTabela ? 5.60 : safeBounds.safeRight - safeBounds.safeLeft;
    const hContent = availH - 0.20;

    envelopes.push({
      id: `slide_${slide.numero}_grafico_${slide.graficoDados.tipo}`,
      tipo: 'GRAFICO',
      x: safeBounds.safeLeft,
      y: posYConteudo + 0.10,
      w: wLeft,
      h: hContent,
    });

    if (temTabela) {
      envelopes.push({
        id: `slide_${slide.numero}_tabela_lateral`,
        tipo: 'TABELA',
        x: 6.70, // safeLeft + 5.60 + 0.30 gap = 6.70
        y: posYConteudo + 0.10,
        w: 5.80, // 6.70 + 5.80 = 12.50 <= 12.533 (safeRight)
        h: hContent,
      });
    } else {
      envelopes.push({
        id: `slide_${slide.numero}_analise_lateral`,
        tipo: 'TEXTO_ANALISE',
        x: 6.70,
        y: posYConteudo + 0.10,
        w: 5.80,
        h: hContent,
      });
    }
  } else if (slide.tabelaDados && slide.tabelaDados.linhas.length > 0) {
    // Tabela Largura Completa
    envelopes.push({
      id: `slide_${slide.numero}_tabela_completa`,
      tipo: 'TABELA',
      x: safeBounds.safeLeft,
      y: posYConteudo + 0.10,
      w: safeBounds.safeRight - safeBounds.safeLeft,
      h: availH - 0.20,
    });
  } else {
    // Bloco de Análise Técnica / Bullets Largura Completa
    envelopes.push({
      id: `slide_${slide.numero}_analise_completa`,
      tipo: 'TEXTO_ANALISE',
      x: safeBounds.safeLeft,
      y: posYConteudo + 0.10,
      w: safeBounds.safeRight - safeBounds.safeLeft,
      h: Math.min(availH - 0.20, 3.80),
    });
  }

  // 4. Rodapé
  envelopes.push({
    id: `slide_${slide.numero}_footer`,
    tipo: 'FOOTER',
    x: safeBounds.safeLeft,
    y: 7.05,
    w: safeBounds.safeRight - safeBounds.safeLeft,
    h: 0.30,
  });

  return envelopes;
}

/**
 * Avalia a densidade de conteúdo e integridade visual de um slide específico
 */
export function validarIntegridadeVisualSlide(
  slide: SlideApresentacao, 
  safeBounds: SafeBounds = SAFE_BOUNDS_WIDESCREEN
): ResultadoIntegridadeVisualSlide {
  const envelopes = calcularEnvelopesSlide(slide, safeBounds);
  const infracoes: InfracaoGeometrica[] = [];

  // 1. Valida cada envelope individualmente contra os limites da Safe Area
  envelopes.forEach((elem) => {
    const falhas = validateSlideBounds(elem, safeBounds, slide.numero);
    infracoes.push(...falhas);
  });

  // 2. Valida sobreposições indevidas entre pares de elementos
  for (let i = 0; i < envelopes.length; i++) {
    for (let j = i + 1; j < envelopes.length; j++) {
      const colisao = detectarSobreposicaoElementos(envelopes[i], envelopes[j], slide.numero);
      if (colisao) {
        infracoes.push(colisao);
      }
    }
  }

  // 3. Calcula a margem inferior real até o rodapé
  const elementosConteudo = envelopes.filter(e => e.tipo !== 'HEADER' && e.tipo !== 'FOOTER');
  let maxYConteudo = 0;
  elementosConteudo.forEach(e => {
    const bottom = e.y + e.h;
    if (bottom > maxYConteudo) maxYConteudo = bottom;
  });
  const margemInferiorRodape = Math.max(0, safeBounds.footerTop - maxYConteudo);

  // 4. Cálculo do Score de Densidade
  // Base: proporção de área ocupada pelos componentes em relação à área segura
  const areaSeguraUtil = (safeBounds.safeRight - safeBounds.safeLeft) * (safeBounds.safeBottom - safeBounds.safeTop);
  let areaOcupada = 0;
  elementosConteudo.forEach(e => {
    areaOcupada += e.w * e.h;
  });
  let scoreDensidade = Math.round((areaOcupada / areaSeguraUtil) * 85);

  // Adiciona fatores de densidade por volume de texto/linhas
  if (slide.tabelaDados && slide.tabelaDados.linhas.length > 5) {
    scoreDensidade += Math.min(15, (slide.tabelaDados.linhas.length - 5) * 3);
  }
  if (slide.pontosChave && slide.pontosChave.length > 4) {
    scoreDensidade += Math.min(10, (slide.pontosChave.length - 4) * 2);
  }
  scoreDensidade = Math.min(100, scoreDensidade);

  // Classificação da Densidade
  let classificacaoDensidade: ClassificacaoDensidadeSlide = 'ADEQUADO';
  if (infracoes.length > 0 || scoreDensidade > 95 || margemInferiorRodape < safeBounds.guardMarginBottom) {
    classificacaoDensidade = 'OVERFLOW';
  } else if (scoreDensidade >= 75) {
    classificacaoDensidade = 'ALTA_DENSIDADE';
  }

  return {
    slideId: slide.id,
    numero: slide.numero,
    titulo: slide.titulo,
    aprovado: infracoes.length === 0 && classificacaoDensidade !== 'OVERFLOW',
    scoreDensidade,
    classificacaoDensidade,
    margemInferiorRodape: Number(margemInferiorRodape.toFixed(2)),
    infracoes,
    elementosInspecionados: envelopes,
  };
}

/**
 * Executa a auditoria geométrica completa em todos os slides da apresentação
 */
export function executarAuditoriaVisual(
  apresentacao: RelatorioApresentacaoQualidade, 
  safeBounds: SafeBounds = SAFE_BOUNDS_WIDESCREEN
): RelatorioIntegridadeVisual {
  const detalhesPorSlide: ResultadoIntegridadeVisualSlide[] = [];
  const infracoesDetectadas: InfracaoGeometrica[] = [];
  let totalElementosAuditados = 0;
  let slidesComInfracao = 0;
  let menorMargemRodape = 999;
  let maxDensidade = 0;

  apresentacao.slides.forEach((slide) => {
    const res = validarIntegridadeVisualSlide(slide, safeBounds);
    detalhesPorSlide.push(res);
    totalElementosAuditados += res.elementosInspecionados.length;
    if (res.margemInferiorRodape < menorMargemRodape) {
      menorMargemRodape = res.margemInferiorRodape;
    }
    if (res.scoreDensidade > maxDensidade) {
      maxDensidade = res.scoreDensidade;
    }

    if (!res.aprovado) {
      slidesComInfracao++;
      infracoesDetectadas.push(...res.infracoes);
    }
  });

  const aprovado = infracoesDetectadas.length === 0;

  let densidadeGeral: ClassificacaoDensidadeSlide = 'ADEQUADO';
  if (!aprovado) {
    densidadeGeral = 'OVERFLOW';
  } else if (maxDensidade >= 85) {
    densidadeGeral = 'ALTA_DENSIDADE';
  }

  return {
    aprovado,
    timestamp: new Date().toISOString(),
    totalSlidesAuditados: apresentacao.slides.length,
    totalElementosAuditados,
    slidesComInfracao,
    infracoesDetectadas,
    densidadeGeral,
    margemSegurancaRodapeMinima: Number((menorMargemRodape === 999 ? 0.20 : menorMargemRodape).toFixed(2)),
    safeBoundsUtilizados: safeBounds,
    detalhesPorSlide,
  };
}
