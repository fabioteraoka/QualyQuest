import { NCRecord, CorrespondenciaRNC, NivelConfianca, MetodoIdentificacaoRNC } from '../types';

/**
 * Utilitário de identificação e correspondência automática de RNCs
 * a partir de documentos respondidos (DOCX, TXT, etc.)
 */
export function identifyMatchingRNC(
  documentText: string,
  fileName: string,
  existingRecords: NCRecord[]
): CorrespondenciaRNC {
  if (!existingRecords || existingRecords.length === 0) {
    return {
      confianca: 0,
      nivelConfianca: 'INSUFICIENTE',
      metodoIdentificacao: 'NUMERO_EXATO',
      duvidaMotivo: 'Não há Não Conformidades cadastradas no sistema para associação.',
    };
  }

  const cleanDocText = documentText.toLowerCase();
  const cleanFileName = fileName.toLowerCase();

  // 1. Extração de padrões de Número de NC
  // Exemplos: NC-001, NC-2026-015, RNC 05, NC 05, N/C 12, RNC-2026-05, etc.
  const regexPatterns = [
    /(?:rnc|nc|n\/c|relat[óo]rio|n[uú]mero|num\.?)\s*[:#\-–—]?\s*(?:[a-z0-9_\-]+[/\-])?([0-9]{1,4})/gi,
    /nc-(\d{1,4})/gi,
    /rnc-(\d{1,4})/gi,
    /nc_(\d{1,4})/gi,
    /rnc_(\d{1,4})/gi,
  ];

  const extractedNumbers: string[] = [];
  
  // Buscar no nome do arquivo
  for (const regex of regexPatterns) {
    let match;
    while ((match = regex.exec(cleanFileName)) !== null) {
      if (match[1]) extractedNumbers.push(match[1]);
    }
  }

  // Buscar no início do documento (primeiros 2000 caracteres têm maior peso)
  const headerText = cleanDocText.substring(0, 2500);
  for (const regex of regexPatterns) {
    let match;
    while ((match = regex.exec(headerText)) !== null) {
      if (match[1]) extractedNumbers.push(match[1]);
    }
  }

  // Normalização de números encontrados (remover zeros à esquerda e formatar)
  const candidateScores: Map<string, { nc: NCRecord; score: number; reasons: string[] }> = new Map();

  for (const record of existingRecords) {
    let score = 0;
    const reasons: string[] = [];

    const rawNum = record.numeroNC.trim();
    const numClean = rawNum.replace(/[^0-9]/g, '');
    const numPadded = rawNum.padStart(2, '0');
    const numUnpadded = numClean ? String(parseInt(numClean, 10)) : rawNum;

    // A. Verificação de Correspondência Exata de Número
    const directMatch = extractedNumbers.some(
      (n) => n === rawNum || n === numClean || n === numPadded || n === numUnpadded
    );

    if (directMatch) {
      score += 75;
      reasons.push(`Número de RNC (${record.numeroNC}) identificado explicitamente no documento.`);
    }

    // B. Verificação no nome do arquivo
    if (cleanFileName.includes(record.numeroNC.toLowerCase()) || cleanFileName.includes(record.id.toLowerCase())) {
      score += 25;
      reasons.push(`Nome do arquivo contém a referência "${record.numeroNC}".`);
    }

    // C. Verificação de Título ou Palavras-Chave Específicas
    if (record.titulo && record.titulo.length > 5) {
      const titleTerms = record.titulo.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
      let matchedTerms = 0;
      for (const term of titleTerms) {
        if (cleanDocText.includes(term)) {
          matchedTerms++;
        }
      }
      if (titleTerms.length > 0) {
        const titleRatio = matchedTerms / titleTerms.length;
        if (titleRatio > 0.6) {
          score += 20;
          reasons.push(`Alta correspondência com o título da RNC (${Math.round(titleRatio * 100)}%).`);
        } else if (titleRatio > 0.3) {
          score += 10;
        }
      }
    }

    // D. Verificação de Setor e Norma
    if (record.setor && cleanDocText.includes(record.setor.toLowerCase())) {
      score += 10;
      reasons.push(`Setor "${record.setor}" citado no documento.`);
    }
    if (record.normaReferencia && cleanDocText.includes(record.normaReferencia.toLowerCase())) {
      score += 10;
      reasons.push(`Norma "${record.normaReferencia}" mencionada.`);
    }

    // E. Verificação de Auditor ou Responsável
    if (record.responsavel && cleanDocText.includes(record.responsavel.toLowerCase())) {
      score += 5;
      reasons.push(`Responsável "${record.responsavel}" citado.`);
    }

    // Limitar score a 100
    const finalScore = Math.min(score, 100);
    if (finalScore > 20) {
      candidateScores.set(record.id, { nc: record, score: finalScore, reasons });
    }
  }

  // Ordenar candidatos por pontuação decrescente
  const sortedCandidates = Array.from(candidateScores.values()).sort((a, b) => b.score - a.score);

  if (sortedCandidates.length === 0) {
    return {
      confianca: 15,
      nivelConfianca: 'BAIXA',
      metodoIdentificacao: 'ANALISE_SEMANTICA',
      duvidaMotivo: 'Não foi possível encontrar referências suficientes de número, título ou setor no documento.',
    };
  }

  const topMatch = sortedCandidates[0];

  // Caso 1: Conflito ou Dúvida relevante (Duas ou mais RNCs com pontuações próximas)
  if (sortedCandidates.length > 1) {
    const secondMatch = sortedCandidates[1];
    // Se a diferença de confiança for menor que 15% e ambas forem moderadas/altas
    if (topMatch.score < 90 && (topMatch.score - secondMatch.score) < 18) {
      return {
        rncId: topMatch.nc.id,
        numeroNC: topMatch.nc.numeroNC,
        tituloNC: topMatch.nc.titulo,
        confianca: topMatch.score,
        nivelConfianca: 'MEDIA',
        metodoIdentificacao: 'ANALISE_SEMANTICA',
        duvidaMotivo: `Há ambiguidade entre duas ou mais RNCs semelhantes (${topMatch.nc.numeroNC} com ${topMatch.score}% vs ${secondMatch.nc.numeroNC} com ${secondMatch.score}%). Confirmação humana mandatória.`,
        multiplasOpcoes: sortedCandidates.slice(0, 4).map((c) => ({
          rncId: c.nc.id,
          numeroNC: c.nc.numeroNC,
          titulo: c.nc.titulo,
          setor: c.nc.setor,
          confianca: c.score,
          motivoSimilaridade: c.reasons.join(' '),
        })),
      };
    }
  }

  // Caso 2: Confiança Alta (≥ 90%)
  if (topMatch.score >= 90) {
    return {
      rncId: topMatch.nc.id,
      numeroNC: topMatch.nc.numeroNC,
      tituloNC: topMatch.nc.titulo,
      confianca: topMatch.score,
      nivelConfianca: 'ALTA',
      metodoIdentificacao: topMatch.reasons.some((r) => r.includes('explicitamente')) ? 'NUMERO_EXATO' : 'CODIGO_SIMILAR',
    };
  }

  // Caso 3: Confiança Média (70% - 89%)
  if (topMatch.score >= 70) {
    return {
      rncId: topMatch.nc.id,
      numeroNC: topMatch.nc.numeroNC,
      tituloNC: topMatch.nc.titulo,
      confianca: topMatch.score,
      nivelConfianca: 'MEDIA',
      metodoIdentificacao: 'ANALISE_SEMANTICA',
      multiplasOpcoes: sortedCandidates.slice(0, 3).map((c) => ({
        rncId: c.nc.id,
        numeroNC: c.nc.numeroNC,
        titulo: c.nc.titulo,
        setor: c.nc.setor,
        confianca: c.score,
        motivoSimilaridade: c.reasons.join(' '),
      })),
    };
  }

  // Caso 4: Baixa Confiança (< 70%)
  return {
    rncId: topMatch.nc.id,
    numeroNC: topMatch.nc.numeroNC,
    tituloNC: topMatch.nc.titulo,
    confianca: topMatch.score,
    nivelConfianca: 'BAIXA',
    metodoIdentificacao: 'ANALISE_SEMANTICA',
    duvidaMotivo: 'Pontuação de similaridade abaixo do limiar de segurança (70%). Requer validação manual do auditor.',
    multiplasOpcoes: sortedCandidates.slice(0, 4).map((c) => ({
      rncId: c.nc.id,
      numeroNC: c.nc.numeroNC,
      titulo: c.nc.titulo,
      setor: c.nc.setor,
      confianca: c.score,
      motivoSimilaridade: c.reasons.join(' '),
    })),
  };
}
