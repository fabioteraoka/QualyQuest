/**
 * Utilitário Central de Normalização de Nomes e Detecção de Homônimos / Duplicidades
 * QualyQuest SGQ / Rooster MRO Enterprise
 * 
 * Regras estritas:
 * - Converte minúsculas / maiúsculas
 * - Remove acentos e diacríticos de forma canônica (NFD)
 * - Remove pontuação irrelevante e caracteres especiais de formatação
 * - Colapsa espaços múltiplos e remove espaços nas extremidades
 * - Não remove partes significativas do nome (sobrenomes, preposições mantidas de forma controlada)
 * - Calcula similaridade de tokens (Jaccard e overlap) para homônimos e nomes semelhantes
 * - Prioriza chave de matrícula (canac, matricula, canac_id)
 */

export interface ResultadoComparacaoColaborador {
  ehMesmaPessoa: boolean;
  ehHomonimoExato: boolean;
  ehHomonimoProvavel: boolean;
  temMatriculaIdentica: boolean;
  temMatriculaConflitante: boolean;
  scoreSimilaridade: number;
  motivo: string;
}

/**
 * Normaliza um nome para comparação fidedigna e determinística.
 * Exemplo: "José da  Silva - Mecânico" -> "jose da silva mecanico"
 *          "ALÍPIO DOS SANTOS" -> "alipio dos santos"
 */
export function normalizePersonName(rawName: string | undefined | null): string {
  if (!rawName) return '';

  return String(rawName)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos e acentos
    .replace(/[^\w\s]/gi, ' ') // Substitui pontuações irrelevantes (., -, /, etc) por espaço
    .replace(/\s+/g, ' ') // Colapsa múltiplos espaços consecutivos
    .trim();
}

/**
 * Normaliza identificadores de matrícula / CANAC (remove letras irrelevantes se for puramente numérico, ou padroniza).
 */
export function normalizeMatriculaOrCanac(rawId: string | undefined | null): string {
  if (!rawId) return '';
  return String(rawId)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^IMP-?0*/, '') // Uniformiza prefixos corporativos como IMP-00123 ou IMP123 -> 123
    .replace(/^CANAC-?0*/, '');
}

/**
 * Calcula a distância de similaridade entre duas strings com base em tokens.
 * Retorna um valor entre 0.0 (totalmente diferente) e 1.0 (idêntico).
 */
export function calculateNameSimilarity(nomeA: string, nomeB: string): number {
  const normA = normalizePersonName(nomeA);
  const normB = normalizePersonName(nomeB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = normA.split(' ').filter((t) => t.length > 1);
  const tokensB = normB.split(' ').filter((t) => t.length > 1);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Interseção de tokens
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersec = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersec++;
  });

  const uniao = new Set([...tokensA, ...tokensB]).size;
  const jaccard = uniao > 0 ? intersec / uniao : 0;

  // Bônus se primeiro nome e último sobrenome forem rigorosamente iguais
  let bonusExtremidades = 0;
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    if (tokensA[0] === tokensB[0] && tokensA[tokensA.length - 1] === tokensB[tokensB.length - 1]) {
      bonusExtremidades = 0.25;
    }
  }

  return Math.min(1.0, Number((jaccard * 0.75 + bonusExtremidades).toFixed(3)));
}

/**
 * Avalia se dois registros de colaborador correspondem à mesma pessoa,
 * se são homônimos exatos, homônimos prováveis ou pessoas distintas.
 */
export function compararColaboradores(
  cand: { nome: string; matricula?: string; canac?: string },
  existente: { nome: string; matricula?: string; canac?: string }
): ResultadoComparacaoColaborador {
  const nomeNormCand = normalizePersonName(cand.nome);
  const nomeNormExistente = normalizePersonName(existente.nome);

  const matCand = normalizeMatriculaOrCanac(cand.matricula || cand.canac);
  const matExistente = normalizeMatriculaOrCanac(existente.matricula || existente.canac);

  const temMatriculaPreenchida = Boolean(matCand && matExistente);
  const temMatriculaIdentica = temMatriculaPreenchida && matCand === matExistente;
  const temMatriculaConflitante = temMatriculaPreenchida && matCand !== matExistente;

  const score = calculateNameSimilarity(cand.nome, existente.nome);
  const ehHomonimoExato = nomeNormCand.length > 3 && nomeNormCand === nomeNormExistente;

  // Cenário 1: Matrícula idêntica garantida
  if (temMatriculaIdentica) {
    return {
      ehMesmaPessoa: true,
      ehHomonimoExato,
      ehHomonimoProvavel: false,
      temMatriculaIdentica: true,
      temMatriculaConflitante: false,
      scoreSimilaridade: 1.0,
      motivo: `Matrícula/CANAC idêntica confirmada (${matCand}).`,
    };
  }

  // Cenário 2: Matrículas diferentes mas nome idêntico -> Homônimo crítico com matrícula conflitante
  if (temMatriculaConflitante && ehHomonimoExato) {
    return {
      ehMesmaPessoa: false,
      ehHomonimoExato: true,
      ehHomonimoProvavel: true,
      temMatriculaIdentica: false,
      temMatriculaConflitante: true,
      scoreSimilaridade: score,
      motivo: `Homônimo detectado: mesmo nome ("${existente.nome}"), porém matrículas conflitantes (Arquivo: ${matCand} vs Sistema: ${matExistente}). Decisão humana obrigatória.`,
    };
  }

  // Cenário 3: Nome exatamente igual, sem matrícula para desempate
  if (ehHomonimoExato) {
    return {
      ehMesmaPessoa: !temMatriculaConflitante,
      ehHomonimoExato: true,
      ehHomonimoProvavel: true,
      temMatriculaIdentica: false,
      temMatriculaConflitante: false,
      scoreSimilaridade: 1.0,
      motivo: `Nome idêntico ("${existente.nome}"). Reconciliação necessária: confirmar se é a mesma pessoa ou novo colaborador homônimo.`,
    };
  }

  // Cenário 4: Alta similaridade de nomes (>= 0.80)
  if (score >= 0.80) {
    return {
      ehMesmaPessoa: false,
      ehHomonimoExato: false,
      ehHomonimoProvavel: true,
      temMatriculaIdentica: false,
      temMatriculaConflitante,
      scoreSimilaridade: score,
      motivo: `Possível homônimo ou variação de grafia detectada com "${existente.nome}" (${Math.round(score * 100)}% similaridade).`,
    };
  }

  // Pessoas distintas
  return {
    ehMesmaPessoa: false,
    ehHomonimoExato: false,
    ehHomonimoProvavel: false,
    temMatriculaIdentica: false,
    temMatriculaConflitante,
    scoreSimilaridade: score,
    motivo: 'Pessoa distinta.',
  };
}
