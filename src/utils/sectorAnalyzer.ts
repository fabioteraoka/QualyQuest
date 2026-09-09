import { 
  NCRecord, 
  ManualRecord, 
  ConhecimentoValidadoItem, 
  AnaliseSetorResponsavel 
} from '../types';

export interface SectorAnalysisParams {
  descricao?: string;
  titulo?: string;
  categoria?: string;
  tipoAcao?: string;
  normaReferencia?: string;
  causa?: string;
  setorInformado?: string;
  organizationSectors?: string[];
  historicalRecords?: NCRecord[];
  knowledgeBase?: ConhecimentoValidadoItem[];
  manuals?: ManualRecord[];
}

// Fallback sectors if organization has none configured
export const DEFAULT_FALLBACK_SECTORS: string[] = [
  'Qualidade / SGQ',
  'Manutenção / Calibração',
  'Engenharia / Publicações Técnicas',
  'Operações de Linha / Base',
  'Suprimentos / Almoxarifado',
  'Treinamento / RH Operacional',
  'Segurança Operacional (SGSO)',
];

interface SectorScore {
  setor: string;
  score: number;
  reasons: string[];
}

/**
 * Motor Heurístico & Determinístico de Análise de Setor Responsável
 * Executa análise semântica, correlação histórica, verificação de manuais e divergência.
 */
export function analisarSetorHeuristico(params: SectorAnalysisParams): AnaliseSetorResponsavel {
  const {
    descricao = '',
    titulo = '',
    categoria = '',
    tipoAcao = '',
    normaReferencia = '',
    causa = '',
    setorInformado = '',
    organizationSectors = [],
    historicalRecords = [],
    knowledgeBase = [],
    manuals = [],
  } = params;

  const validSectors = organizationSectors.length > 0 ? organizationSectors : DEFAULT_FALLBACK_SECTORS;
  const textoCompleto = `${titulo} ${descricao} ${categoria} ${normaReferencia} ${causa}`.toLowerCase().trim();

  // Caso 4 do teste obrigatório: Informação Insuficiente
  if (textoCompleto.length < 15 || (!descricao.trim() && !titulo.trim())) {
    return {
      setorSugerido: validSectors[0] || 'Qualidade / SGQ',
      confianca: 'INSUFICIENTE',
      justificativa: 'Informação textual insuficiente na descrição e no título para determinar com confiabilidade técnica o setor responsável.',
      setoresCandidatos: validSectors.slice(0, 3).map((s) => ({
        setor: s,
        relevancia: 'Indeterminada',
        justificativa: 'Necessário fornecer descrição factual detalhada.',
      })),
      origem: 'FALLBACK_DETERMINISTICO',
      dataHora: new Date().toISOString(),
      requerAtencaoDivergencia: false,
      setorInformado: setorInformado || undefined,
      statusDecisao: 'PENDENTE',
    };
  }

  // Inicializa tabela de pontuação
  const scores: Record<string, SectorScore> = {};
  validSectors.forEach((s) => {
    scores[s] = { setor: s, score: 0, reasons: [] };
  });

  const ensureSectorScore = (name: string): SectorScore => {
    if (!scores[name]) {
      scores[name] = { setor: name, score: 0, reasons: [] };
    }
    return scores[name];
  };

  // 1. ANÁLISE POR PALAVRAS-CHAVE E CONTEXTO TÉCNICO AERONÁUTICO
  const regrasSetores: Array<{
    palavras: string[];
    setoresAlvo: string[];
    peso: number;
    motivo: string;
  }> = [
    {
      palavras: ['calibração', 'calibrado', 'calibrar', 'metrologia', 'torquímetro', 'micrômetro', 'multímetro', 'rbc', 'inmetro', 'aferição', 'tolerância', 'manômetro', 'ferramenta especial'],
      setoresAlvo: ['Manutenção / Calibração', 'REC - Manutenção / Calibração', 'Manutenção'],
      peso: 15,
      motivo: 'Termos e artefatos específicos de controle metrológico e calibração de ferramental.',
    },
    {
      palavras: ['almoxarifado', 'quarentena', 'armazenamento', 'segregação', 'prateleira', 'lote', 'vida limite', 'shelf life', 'insumo vencido', 'recebimento de peças', 'etiqueta amarela'],
      setoresAlvo: ['Suprimentos / Almoxarifado', 'Almoxarifado Aeronáutico', 'Suprimentos'],
      peso: 15,
      motivo: 'Processos de recebimento, guarda, rastreabilidade de lotes e controle de prateleira.',
    },
    {
      palavras: ['procedimento', 'momq', 'auditoria', 'não conformidade', 'controle de documentos', 'norma', 'sgq', 'qualidade', 'emenda', 'revisão desatualizada', 'iso 9001', 'rbac'],
      setoresAlvo: ['Qualidade / SGQ', 'Qualidade'],
      peso: 12,
      motivo: 'Governança documental, cumprimento de requisitos normativos e auditoria de SGQ.',
    },
    {
      palavras: ['engenharia', 'boletim de serviço', 'service bulletin', 'diretriz de aeronavegabilidade', 'ad', 'da', 'publicação técnica', 'manual do fabricante', 'amm', 'ipc', 'esquema elétrico'],
      setoresAlvo: ['Engenharia / Publicações Técnicas', 'Engenharia'],
      peso: 14,
      motivo: 'Interpretação técnica de manuais de manutenção aeronáutica (AMM) e boletins mandatados.',
    },
    {
      palavras: ['linha', 'rampa', 'pré-voo', 'trânsito', 'pernoite', 'liberação de voo', 'crs', 'aeronave em solo', 'aog', 'inspeção diária', 'turnaround'],
      setoresAlvo: ['Operações de Linha / Base', 'Operações de Linha'],
      peso: 14,
      motivo: 'Atividades executivas de manutenção em linha de voo e atendimento na pista.',
    },
    {
      palavras: ['treinamento', 'qualificação', 'capacitação', 'recorrência', 'cht', 'carteira', 'fatores humanos', 'dossiê', 'instrutor', 'avaliação prática'],
      setoresAlvo: ['Treinamento / RH Operacional', 'Treinamento'],
      peso: 14,
      motivo: 'Requisitos de qualificação técnica mandatória, fatores humanos e certificação de mecânicos.',
    },
    {
      palavras: ['sgso', 'segurança operacional', 'incidente', 'quase acidente', 'fator contribuinte', 'perigo', 'relpreve', 'reporte voluntário', 'losA'],
      setoresAlvo: ['Segurança Operacional (SGSO)', 'SGSO'],
      peso: 14,
      motivo: 'Mitigação de perigos operacionais e gestão de segurança de voo (SGSO).',
    },
  ];

  regrasSetores.forEach((regra) => {
    let matches = 0;
    regra.palavras.forEach((p) => {
      if (textoCompleto.includes(p)) {
        matches++;
      }
    });

    if (matches > 0) {
      // Procura o setor mais aderente nos setores válidos da organização
      regra.setoresAlvo.forEach((alvo) => {
        const foundKey = validSectors.find(
          (s) => s.toLowerCase() === alvo.toLowerCase() || s.toLowerCase().includes(alvo.toLowerCase())
        );
        if (foundKey) {
          const entry = ensureSectorScore(foundKey);
          entry.score += regra.peso * matches;
          entry.reasons.push(`${regra.motivo} (${matches} termo(s) coincidente(s))`);
        }
      });
    }
  });

  // 2. CORRELAÇÃO HISTÓRICA DE RNCs ANTERIORES
  if (historicalRecords.length > 0) {
    historicalRecords.forEach((h) => {
      if (!h.setor) return;
      const matchingSector = validSectors.find(
        (s) => s.toLowerCase() === h.setor.toLowerCase() || s.toLowerCase().includes(h.setor.toLowerCase())
      );
      if (!matchingSector) return;

      // Se categoria coincidir
      if (categoria && h.categoria && h.categoria.toLowerCase() === categoria.toLowerCase()) {
        const entry = ensureSectorScore(matchingSector);
        entry.score += 8;
        entry.reasons.push(`Padrão histórico: RNC ${h.numeroNC} da mesma categoria (${categoria}) foi tratada por este setor.`);
      }

      // Se título similar
      if (titulo && h.titulo && (h.titulo.toLowerCase().includes(titulo.toLowerCase()) || titulo.toLowerCase().includes(h.titulo.toLowerCase()))) {
        const entry = ensureSectorScore(matchingSector);
        entry.score += 10;
        entry.reasons.push(`Precedente histórico direto: RNC ${h.numeroNC} com ocorrência similar.`);
      }
    });
  }

  // 3. ANÁLISE NA BASE DE CONHECIMENTO VALIDADO (Knowledge Base)
  if (knowledgeBase.length > 0) {
    knowledgeBase.forEach((k) => {
      if (!k.setor) return;
      const matchingSector = validSectors.find(
        (s) => s.toLowerCase() === k.setor.toLowerCase() || s.toLowerCase().includes(k.setor.toLowerCase())
      );
      if (!matchingSector) return;

      if (k.categoria && categoria && k.categoria.toLowerCase() === categoria.toLowerCase()) {
        const entry = ensureSectorScore(matchingSector);
        entry.score += 6;
        entry.reasons.push(`Base de Conhecimento: Padrão validado '${k.tituloPadrao}' associado a este setor.`);
      }
    });
  }

  // 4. ANÁLISE DOS MANUAIS VIGENTES
  if (manuals.length > 0 && normaReferencia) {
    manuals.forEach((m) => {
      if (m.codigo && normaReferencia.toUpperCase().includes(m.codigo.toUpperCase())) {
        if (m.setoresAplicaveis && m.setoresAplicaveis.length > 0) {
          m.setoresAplicaveis.forEach((setorManual) => {
            const matchingSector = validSectors.find(
              (s) => s.toLowerCase() === setorManual.toLowerCase() || s.toLowerCase().includes(setorManual.toLowerCase())
            );
            if (matchingSector) {
              const entry = ensureSectorScore(matchingSector);
              entry.score += 7;
              entry.reasons.push(`Manual ${m.codigo}: Norma ${normaReferencia} possui escopo de aplicação neste setor.`);
            }
          });
        }
      }
    });
  }

  // Ordena os setores por pontuação decrescente
  const sortedScores = Object.values(scores).sort((a, b) => b.score - a.score);
  const topCandidate = sortedScores[0];
  const secondCandidate = sortedScores[1];

  let setorSugerido = topCandidate && topCandidate.score > 0 ? topCandidate.setor : validSectors[0];
  let confianca: 'ALTA' | 'MEDIA' | 'BAIXA' | 'INSUFICIENTE' = 'BAIXA';
  let justificativa = '';

  if (!topCandidate || topCandidate.score === 0) {
    confianca = 'INSUFICIENTE';
    justificativa = 'Nenhum padrão técnico ou termo específico foi identificado com alta correlação nos dados da ocorrência. Sugestão baseada na distribuição geral do SGQ.';
  } else if (secondCandidate && secondCandidate.score > 0 && topCandidate.score - secondCandidate.score < 5) {
    // Caso 3: Envolvimento de múltiplos setores ou ambiguidade
    confianca = 'MEDIA';
    justificativa = `Ocorrência com interface técnica entre múltiplos setores: '${topCandidate.setor}' (relevância preponderante) e '${secondCandidate.setor}'. Verifique se a responsabilidade primária é compartilhada.`;
  } else if (topCandidate.score >= 20) {
    confianca = 'ALTA';
    justificativa = `Alta aderência técnica identificada: ${topCandidate.reasons.slice(0, 2).join(' ')}`;
  } else {
    confianca = 'MEDIA';
    justificativa = `Aderência moderada baseada em: ${topCandidate.reasons.slice(0, 2).join(' ') || 'termos gerais identificados.'}`;
  }

  // Identificação de Divergência entre Setor Informado e Setor Sugerido
  let requerAtencaoDivergencia = false;
  let statusDecisao: 'ACEITA' | 'DIVERGENTE_MANTIDA' | 'ALTERADA_MANUALMENTE' | 'PENDENTE' = 'PENDENTE';

  if (setorInformado && setorInformado.trim()) {
    const informadoNorm = setorInformado.trim().toLowerCase();
    const sugeridoNorm = setorSugerido.trim().toLowerCase();

    const isMatch = informadoNorm === sugeridoNorm ||
      informadoNorm.includes(sugeridoNorm) ||
      sugeridoNorm.includes(informadoNorm);

    if (!isMatch && confianca !== 'INSUFICIENTE') {
      requerAtencaoDivergencia = true;
      statusDecisao = 'PENDENTE';
    } else if (isMatch) {
      statusDecisao = 'ACEITA';
    }
  }

  const candidatosFormatados = sortedScores
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => ({
      setor: s.setor,
      relevancia: s.score >= 20 ? 'Alta' : s.score >= 10 ? 'Média' : 'Secundária',
      justificativa: s.reasons[0] || 'Correlação identificada no texto da NC.',
    }));

  return {
    setorSugerido,
    confianca,
    justificativa,
    setoresCandidatos: candidatosFormatados.length > 0 ? candidatosFormatados : undefined,
    origem: historicalRecords.length > 0 ? 'ANALISE_HEURISTICA_HISTORICO' : 'FALLBACK_DETERMINISTICO',
    dataHora: new Date().toISOString(),
    requerAtencaoDivergencia,
    setorInformado: setorInformado || undefined,
    statusDecisao,
  };
}

/**
 * Ponto de entrada assíncrono que tenta chamar a API do servidor (com Gemini)
 * e aplica fallback gracioso sem interrupção.
 */
export async function analisarSetorComIAEHeuristica(
  params: SectorAnalysisParams
): Promise<AnaliseSetorResponsavel> {
  try {
    const response = await fetch('/api/suggest-sector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        descricao: params.descricao,
        titulo: params.titulo,
        categoria: params.categoria,
        tipoAcao: params.tipoAcao,
        normaReferencia: params.normaReferencia,
        causa: params.causa,
        setorInformado: params.setorInformado,
        organizationSectors: params.organizationSectors || DEFAULT_FALLBACK_SECTORS,
        historicoAmostras: (params.historicalRecords || []).slice(0, 5).map((r) => ({
          numeroNC: r.numeroNC,
          titulo: r.titulo,
          setor: r.setor,
          categoria: r.categoria,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.analise && data.analise.setorSugerido) {
        const resultadoIA: AnaliseSetorResponsavel = {
          ...data.analise,
          dataHora: new Date().toISOString(),
          origem: 'IA_GEMINI_ANALYSIS',
          setorInformado: params.setorInformado || undefined,
        };

        // Verifica divergência
        if (params.setorInformado && params.setorInformado.trim()) {
          const inf = params.setorInformado.trim().toLowerCase();
          const sug = resultadoIA.setorSugerido.trim().toLowerCase();
          if (inf !== sug && !inf.includes(sug) && !sug.includes(inf)) {
            resultadoIA.requerAtencaoDivergencia = true;
          }
        }

        return resultadoIA;
      }
    }
  } catch (err) {
    console.warn('[SectorAnalyzer] Falha de conexão com a API de IA. Acionando motor heurístico offline:', err);
  }

  // Executa o motor determinístico offline/fallback
  return analisarSetorHeuristico(params);
}
