/**
 * Motor de Busca Híbrida e Enquadramento de Não Conformidades (NCs) no Acervo de IA
 * Combina pesquisa textual exata por código/item e semântica por termos técnicos regulatórios
 * Acervo de IA — QualyQuest SGQ
 */

import { FragmentoDocumento, ResultadoEnquadramentoNC } from '../../types/aiKnowledgeBase';
import { fragmentsRepository } from './fragmentsRepository';
import { extrairTokensBusca } from './documentIngestionPipeline';

export interface ScoreFragmento {
  fragmento: FragmentoDocumento;
  scoreTotal: number;
  matchExatoSubitem: boolean;
  matchTermosTecnicos: number;
  matchSemantico: number;
}

/**
 * Executa pesquisa híbrida (Textual Exata + Semântica) nos fragmentos do Acervo
 */
export async function pesquisarFragmentosHibrido(
  termoBusca: string,
  options?: {
    manualCodigo?: string;
    apenasVigentes?: boolean;
    limite?: number;
  }
): Promise<ScoreFragmento[]> {
  const todos = await fragmentsRepository.getAllFragments({
    apenasVigentes: options?.apenasVigentes !== false,
  });

  if (!termoBusca || termoBusca.trim().length === 0) {
    return todos.slice(0, options?.limite || 10).map((f) => ({
      fragmento: f,
      scoreTotal: 10,
      matchExatoSubitem: false,
      matchTermosTecnicos: 0,
      matchSemantico: 0,
    }));
  }

  const queryLimpa = termoBusca.toLowerCase().trim();
  const tokensQuery = extrairTokensBusca(termoBusca);

  // Extrai potenciais números de subitens na query (ex: "3.4.3", "2.4.3", "145.109")
  // Exige pontuação (ex: 3.4.3 ou 145.109) ou prefixo explícito (item/seção 3) para não confundir prazos como "45 dias"
  const subitemComPrefixo = queryLimpa.match(/(?:item|subitem|se[çc][ãa]o|cap[íi]tulo)\s*(\d+(?:\.\d+)*)/i);
  const subitemComPonto = queryLimpa.match(/\b(\d+\.\d+(?:\.\d+)*)\b/);
  const numeroItemProcurado = subitemComPrefixo ? subitemComPrefixo[1] : (subitemComPonto ? subitemComPonto[1] : null);

  // Dicionário de sinônimos e pesos de termos técnicos aeronáuticos
  const termosChavePrioritarios: Record<string, string[]> = {
    calibracao: ['calibracao', 'torquimetro', 'paquimetro', 'micrometro', 'rbc', 'inmetro', 'quarentena', 'metrologia'],
    torquimetro: ['torquimetro', 'calibracao', 'torque', 'aperto', 'ferramental'],
    documento: ['documento', 'procedimento', 'revisao', 'obsoleto', 'lista mestra', 'copia controlada', 'f 001-29'],
    treinamento: ['treinamento', 'qualificacao', 'licenca', 'cht', 'cct', 'fatores humanos', 'crs', 'liberacao'],
    inspecao: ['inspecao', 'boroscopia', 'ensaios nao destrutivos', 'end', 'ndi', 'recebimento'],
  };

  const resultados: ScoreFragmento[] = [];

  for (const frag of todos) {
    if (options?.manualCodigo) {
      const optClean = options.manualCodigo.toLowerCase().trim();
      const fragClean = frag.codigo.toLowerCase().trim();
      const matchCod = fragClean === optClean || fragClean.includes(optClean) || optClean.includes(fragClean);
      if (!matchCod) continue;
    }

    let score = 0;
    let matchExato = false;
    let matchTecnico = 0;
    let matchSemantico = 0;

    // 1. Pesquisa Exata por Subitem / Código
    if (numeroItemProcurado) {
      if (frag.subitem === numeroItemProcurado) {
        score += 150; // Boost máximo para correspondência exata de número de item
        matchExato = true;
      } else if (frag.subitem.startsWith(numeroItemProcurado) || numeroItemProcurado.startsWith(frag.subitem)) {
        score += 60;
      }
    }

    // Código do manual na query (ex: "MOMQ", "RBAC 145")
    if (queryLimpa.includes(frag.codigo.toLowerCase())) {
      score += 40;
    }

    // 2. Pesquisa Textual no Título e Subitem
    const titLower = frag.titulo.toLowerCase();
    const textoTabelas = (frag.tabelas || []).map((t) => t.markdown.toLowerCase()).join(' ');
    const conteudoCompletoLower = `${frag.conteudo.toLowerCase()} ${titLower} ${textoTabelas} ${(frag.palavrasChave || []).join(' ').toLowerCase()}`;

    if (tokensQuery.some((t) => t.length > 2 && titLower.includes(t))) {
      score += 25;
    }

    // 3. Vetorização Semântica e Similaridade Cosseno (Bag-of-Embeddings Normalizado)
    const tokensFragSet = new Set(frag.tokensBusca);
    let produtoEscalar = 0;
    let normaQuery = Math.sqrt(tokensQuery.length || 1);
    let normaFrag = Math.sqrt(frag.tokensBusca.length || 1);

    for (const tq of tokensQuery) {
      if (tokensFragSet.has(tq) || conteudoCompletoLower.includes(tq)) {
        produtoEscalar += 1;
        score += 8;
      }
    }

    // Similaridade Cosseno entre o vetor da Query e o vetor do Fragmento (0.0 a 1.0)
    const similaridadeCosseno = produtoEscalar / (normaQuery * normaFrag);
    const scoreSemanticoCosseno = Math.round(similaridadeCosseno * 50);
    score += scoreSemanticoCosseno;
    matchSemantico = produtoEscalar;

    // 4. Boost por Termos Técnicos Específicos
    for (const [_, termos] of Object.entries(termosChavePrioritarios)) {
      const queryContemTermo = termos.some((t) => queryLimpa.includes(t));
      if (queryContemTermo) {
        const fragContemTermo = termos.some((t) => conteudoCompletoLower.includes(t));
        if (fragContemTermo) {
          matchTecnico += 1;
          score += 25;
        }
      }
    }

    if (score > 0) {
      resultados.push({
        fragmento: frag,
        scoreTotal: score,
        matchExatoSubitem: matchExato,
        matchTermosTecnicos: matchTecnico,
        matchSemantico,
      });
    }
  }

  // Ordena por pontuação decrescente
  resultados.sort((a, b) => b.scoreTotal - a.scoreTotal);

  const limiteFinal = options?.limite || 10;
  return resultados.slice(0, limiteFinal);
}

/**
 * Enquadra uma Não Conformidade (NC) no Acervo de IA com localização exata de requisitos
 * Atende aos requisitos da Seção 8 da especificação.
 */
export async function enquadrarNCNoAcervo(params: {
  descricaoNC: string;
  normaReferencia?: string;
  setor?: string;
  incluirHistorico?: boolean;
  manualCodigoFiltro?: string;
}): Promise<ResultadoEnquadramentoNC> {
  const { descricaoNC, normaReferencia, setor, incluirHistorico, manualCodigoFiltro } = params;

  if (!descricaoNC || descricaoNC.trim().length === 0) {
    return {
      encontrado: false,
      declaracao: 'Não foi informada a descrição da Não Conformidade para enquadramento.',
    };
  }

  // Monta termo enriquecido para busca híbrida
  const termo = `${normaReferencia || ''} ${setor || ''} ${descricaoNC}`.trim();

  // Executa busca híbrida
  const ranking = await pesquisarFragmentosHibrido(termo, {
    manualCodigo: manualCodigoFiltro,
    apenasVigentes: !incluirHistorico,
    limite: 5,
  });

  // Limiar de confiança para declarar enquadramento seguro
  const LIMIAR_MINIMO_SCORE = 20;

  // Anti-alucinação rigoroso: precisa haver correspondência de subitem específico, OU termos técnicos comprovados, OU ao menos 2 termos semânticos da descrição do desvio
  const temEvidenciaSuficiente =
    ranking.length > 0 &&
    ranking[0].scoreTotal >= LIMIAR_MINIMO_SCORE &&
    (ranking[0].matchExatoSubitem || ranking[0].matchTermosTecnicos > 0 || ranking[0].matchSemantico >= 2);

  if (!temEvidenciaSuficiente) {
    return {
      encontrado: false,
      declaracao: 'Não foi localizada evidência ou requisito aplicável suficiente no acervo documental cadastrado para enquadrar este desvio com o rigor técnico exigido.',
      manuaisConsultados: Array.from(new Set((await fragmentsRepository.getAllFragments()).map((f) => f.codigo))),
    };
  }

  const vencedor = ranking[0].fragmento;
  const scoreVencedor = ranking[0].scoreTotal;

  // Calcula grau de aderência percentual normalizado (máximo 100%)
  const grauAderencia = Math.min(100, Math.round(50 + (scoreVencedor / 200) * 50));

  // Determina método utilizado
  const metodoBuscaUtilizado = ranking[0].matchExatoSubitem
    ? 'EXATO_ITEM'
    : 'HIBRIDO_SEMANTICO_TEXTUAL';

  // Monta citação formal exata
  const pagStr = vencedor.pagina ? ` (Pág. ${vencedor.pagina})` : '';
  const citacaoFormatada = `${vencedor.codigo} ${vencedor.revisao}, Cap. ${vencedor.capitulo}, Seção ${vencedor.secao}, Subitem ${vencedor.subitem}${pagStr}`;

  // Procedimento relacionado (sem invenção: apenas se constar expressamente no fragmento original)
  const procedimentoRelacionado = vencedor.procedimentoRelacionado || undefined;

  // Responsabilidade definida (sem invenção: apenas se constar expressamente no fragmento original)
  const responsabilidadeDefinida = vencedor.responsabilidade || undefined;

  // Controle previsto (sem invenção: apenas se constar expressamente no fragmento original)
  const controlePrevisto = vencedor.controlePrevisto || undefined;

  // Evidência documental pertinente (sem invenção: apenas se constar expressamente no fragmento original)
  const evidenciaDocumentalPertinente = vencedor.evidenciaDocumental || undefined;

  // Fragmentos adicionais relevantes
  const fragmentosRelevantesAdicionais = ranking.slice(1).map((r) => ({
    manual: r.fragmento.codigo,
    revisao: r.fragmento.revisao,
    subitem: r.fragmento.subitem,
    titulo: r.fragmento.titulo,
    trecho: r.fragmento.conteudo.substring(0, 150) + '...',
    pagina: r.fragmento.pagina,
    aderencia: Math.min(100, Math.round(40 + (r.scoreTotal / 200) * 50)),
  }));

  return {
    encontrado: true,
    declaracao: `Requisito identificado com ${grauAderencia}% de aderência no manual ${vencedor.codigo} (${vencedor.revisao}).`,
    requisitoAplicavel: vencedor.conteudo,
    documentoNome: vencedor.nomeDocumento,
    codigo: vencedor.codigo,
    revisao: vencedor.revisao,
    capitulo: vencedor.capitulo,
    secao: vencedor.secao,
    subitem: vencedor.subitem,
    pagina: vencedor.pagina,
    procedimentoRelacionado,
    responsabilidadeDefinida,
    controlePrevisto,
    evidenciaDocumentalPertinente,
    contextoIntegral: vencedor.contextoHierarquico,
    grauAderencia,
    fragmentoId: vencedor.id,
    citacaoFormatada,
    metodoBuscaUtilizado,
    manuaisConsultados: Array.from(new Set(ranking.map((r) => `${r.fragmento.codigo} (${r.fragmento.revisao})`))),
    fragmentosRelevantesAdicionais,
  };
}
