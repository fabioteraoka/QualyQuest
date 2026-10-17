/**
 * Utilitários de Formatação e Identificação Visível de Cursos e Treinamentos
 * QualyQuest SGQ - IMPACTO Aviation MRO
 */

export interface CursoIdentificavel {
  titulo: string;
  frotaOuFamilia?: string;
  nivelOuModulo?: string;
  variantesAplicabilidade?: string[] | string;
}

/**
 * Constrói a identificação visível padronizada de um curso de treinamento aeronáutico
 * Exemplo: 'A330 — Familiarização — Trent 700' ou 'Airbus A320 — Ramp & Transit (Nível 2) — CFM56 / LEAP-1A'
 */
export function formatarTituloCursoCompleto(curso?: CursoIdentificavel | null): string {
  if (!curso) return 'Treinamento';

  const tit = (curso.titulo || '').trim();
  const frota = (curso.frotaOuFamilia || '').trim();
  const nivel = (curso.nivelOuModulo || '').trim();
  
  let variantes = '';
  if (Array.isArray(curso.variantesAplicabilidade)) {
    variantes = curso.variantesAplicabilidade.filter(Boolean).join(' / ');
  } else if (typeof curso.variantesAplicabilidade === 'string') {
    variantes = curso.variantesAplicabilidade.trim();
  }

  // Títulos genéricos que exigem enriquecimento com Frota, Nível e Variante
  const titLower = tit.toLowerCase();
  const isGenerico =
    titLower === 'familiarização' ||
    titLower === 'familiarizacao' ||
    titLower === 'ramp & transit' ||
    titLower === 'ramp and transit' ||
    titLower === 'line & base maintenance' ||
    titLower === 'line and base maintenance' ||
    titLower === 'curso de tipo' ||
    titLower === 'curso de motor' ||
    titLower === 'treinamento operacional' ||
    titLower.startsWith('nível ') ||
    titLower.startsWith('nivel ');

  if (isGenerico) {
    const partes: string[] = [];
    if (frota) partes.push(frota);
    partes.push(tit);
    if (variantes) partes.push(variantes);
    return partes.join(' — ');
  }

  // Se o título não inclui a frota ou o nível, mas ambos foram definidos
  const contemFrota = frota && titLower.includes(frota.toLowerCase());
  const contemNivel = nivel && titLower.includes(nivel.toLowerCase());

  if (frota && !contemFrota && nivel && !contemNivel) {
    const partes: string[] = [frota, tit, nivel];
    if (variantes && !titLower.includes(variantes.toLowerCase())) {
      partes.push(variantes);
    }
    return partes.join(' — ');
  }

  if (frota && !contemFrota) {
    return `${frota} — ${tit}${variantes && !titLower.includes(variantes.toLowerCase()) ? ` — ${variantes}` : ''}`;
  }

  if (nivel && !contemNivel) {
    return `${tit} — ${nivel}${variantes && !titLower.includes(variantes.toLowerCase()) ? ` — ${variantes}` : ''}`;
  }

  return tit || 'Treinamento sem título';
}

/**
 * Retorna uma chave canônica única para identificação de duplicidade de curso,
 * considerando Código + Frota + Nível + Variante
 */
export function gerarChaveCanonicaCurso(curso: CursoIdentificavel & { codigo?: string }): string {
  const cod = (curso.codigo || '').trim().toLowerCase();
  const tit = (curso.titulo || '').trim().toLowerCase();
  const frota = (curso.frotaOuFamilia || '').trim().toLowerCase();
  const nivel = (curso.nivelOuModulo || '').trim().toLowerCase();
  const variantes = Array.isArray(curso.variantesAplicabilidade)
    ? curso.variantesAplicabilidade.map((v) => v.trim().toLowerCase()).sort().join('_')
    : (curso.variantesAplicabilidade || '').trim().toLowerCase();

  return `${cod}::${frota}::${nivel}::${variantes}::${tit}`;
}
