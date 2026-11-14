/**
 * SERVIÇO DE COMPARAÇÃO SEMÂNTICA & PRÉ-AUDITORIA CONTRA BASE INSTITUCIONAL (177+ REQUISITOS)
 *
 * Princípios Obrigatórios:
 * 1. Preservação integral (ipsis litteris) do texto original de cada requisito importado.
 * 2. Correspondência por significado, domínio aeronáutico e contexto — não apenas palavra-chave isolada.
 * 3. Classificação estrita em exatamente 4 categorias:
 *    - EQUIVALÊNCIA CONFIRMADA
 *    - EQUIVALÊNCIA PARCIAL
 *    - REQUISITO SEM RESPOSTA APROVADA
 *    - NOVO REQUISITO
 * 4. Anti-alucinação e segurança de escopo:
 *    - Nunca marcar como EQUIVALÊNCIA CONFIRMADA se houver diferença de escopo (cliente, aeronave, localidade, atividade ou norma).
 *    - Nunca marcar como EQUIVALÊNCIA CONFIRMADA se a resposta base não estiver APROVADA, se houver alerta de reavaliação ou se evidências estiverem vencidas/ausentes.
 *    - Adaptações para uma auditoria específica NUNCA alteram a resposta institucional base aprovada.
 * 5. Snapshots imutáveis da pré-auditoria com resumo e estado congelado.
 */

import {
  AuditoriaExternaRecord,
  PreparacaoRequisitoAuditoria,
  UserProfile
} from '../types';
import {
  ClassificacaoCorrespondenciaBase,
  EscopoComparacaoAuditoria,
  ItemPreAuditoriaComparado,
  PreAuditoriaConsolidada,
  PreAuditoriaSnapshot,
  RequisitoAuditoriaExterna,
  ResumoClassificacaoPreAuditoria
} from '../types/auditRequirements';
import { auth } from './firebase/config';
import {
  ContextoCruzadoSGQ,
  detectarImpactosBaseInstitucional,
  consultarRegistrosRelacionadosSGQ
} from './auditReadinessService';

interface ConceptDef {
  id: string;
  weight: number;
  patterns: RegExp;
}

const AVIATION_SEMANTIC_CONCEPTS: ConceptDef[] = [
  {
    id: 'CALIBRATION_METROLOGY',
    weight: 2.2,
    patterns: /\b(calibrat\w*|calibra[cç][aã]o|calibrad\w*|metrolog\w*|torqu[eê]\w*|nist|rbc|inmetro|iso\s*17025|rastreabil\w*|traceab\w*|precision\s*tool\w*|special\s*tool\w*|test\s*equipment)\b/i
  },
  {
    id: 'TRAINING_QUALIFICATION_CHT',
    weight: 2.0,
    patterns: /\b(treinament\w*|training|qualific\w*|cht|licen[cç]a|licens\w*|ojt|human\s*factor\w*|fatores?\s*humanos?|ewis|fts|fuel\s*tank|dangerous\s*goods|artigos?\s*perigosos?|hazmat|reciclag\w*|recorren\w*|recurrent|curr[ií]cul\w*|instrutor\w*|instructor)\b/i
  },
  {
    id: 'PARTS_RECEIVING_QUARANTINE_SHELF',
    weight: 2.1,
    patterns: /\b(pe[cç]as?|parts?|materi\w*|receiving|recebiment\w*|8130|form\s*1|segvoo\s*03|shelf[\s-]*life|validade\s*de\s*prateleira|quarentena|quarantine|unserviceable|sup\b|suspect\w*\s*unapproved|esd\b|electrostatic|armazen\w*|storage|traceability\s*tag|etiqueta\s*amarela|verde)\b/i
  },
  {
    id: 'TECHNICAL_DATA_MANUALS_REVISIONS',
    weight: 2.0,
    patterns: /\b(manual|manuais|momq|ptm|mpo|gmm|amm|cmm|ipc|srm|sb|ad\b|airworthiness\s*directive|diretriz\s*de\s*aeronavegabilidade|technical\s*data|dados?\s*t[eé]cnic\w*|publica[cç][oõ]es?|revis[aã]o|revision|currency|vig[eê]ncia|controle\s*documental|document\s*control)\b/i
  },
  {
    id: 'CRS_RTS_RII_WORK_ORDER',
    weight: 2.1,
    patterns: /\b(crs\b|rts\b|release\s*to\s*service|return\s*to\s*service|libera[cç][aã]o|rii\b|required\s*inspection|itens?\s*de\s*inspe[cç][aã]o\s*obrigat[oó]ria|logbook|di[aá]rio\s*de\s*bordo|ordem\s*de\s*servi[cç]o|work\s*order|task\s*card|ficha\s*de\s*servi[cç]o|deferr\w*|mel\b|cdl\b)\b/i
  },
  {
    id: 'FACILITIES_FOD_EHS_FIRE',
    weight: 1.9,
    patterns: /\b(fod\b|foreign\s*object|hangar|instala[cç][oõ]es|facilities|ilumina[cç][aã]o|lighting|ventila[cç][aã]o|fire\s*extinguish\w*|extintor\w*|inc[eê]ndio|epi\b|ppe\b|seguran[cç]a\s*do\s*trabalho|ehs\b|oxig[eê]nio|oxygen|nitrogen|cilindro\w*|oil|fluid|combust[ií]vel|fuel\b|housekeeping|limpeza)\b/i
  },
  {
    id: 'NDT_INSPECTION',
    weight: 2.2,
    patterns: /\b(ndt\b|ensaios?\s*n[aã]o\s*destrutiv\w*|end\b|nas\s*410|en\s*4179|ultrassom|ultrasonic|eddy\s*current|liquid\s*penetrant|magnetic\s*particle|borescope|boroscopia)\b/i
  },
  {
    id: 'QUALITY_AUDIT_SMS_RNC',
    weight: 1.9,
    patterns: /\b(qualidade|quality\s*assurance|qa\b|sgq|auditoria\s*interna|internal\s*audit|rnc\b|n[aã]o\s*conformidade|non[\s-]*conformance|corretiva|corrective\s*action|root\s*cause|causa\s*raiz|sms\b|safety\s*management|sgso|subcontrat\w*|vendor|fornecedor\w*|supplier)\b/i
  },
  {
    id: 'PERSONNEL_ROSTER_DESIGNATION',
    weight: 2.0,
    patterns: /\b(roster|designa[cç][aã]o|certifying\s*staff|pessoal\s*certificador|carimbo|stamp|assinatura|signature|a&p\b|mec[aâ]nico|mechanic|engenh\w*|accountable\s*manager|gestor\s*respons[aá]vel|rt\b|respons[aá]vel\s*t[eé]cnico)\b/i
  },
  {
    id: 'FLAMMABLES_CHEMICALS_BATTERY',
    weight: 2.0,
    patterns: /\b(inflam[aá]ve\w*|flammable|qu[ií]mic\w*|chemical|msds|fispq|sds\b|bateria\w*|battery|chumbo|ni-?cd|cadmium|lithium|hazmat\s*cabinet)\b/i
  }
];

// Termos sinônimos multilíngues (PT -> conceito normalizado) para comparação lexical complementar
const NORMALIZATION_SYNONYMS: Array<[RegExp, string]> = [
  [/\bcalibra(ted|tion|ção|cao|das?|dos?)\b/gi, 'calibracao'],
  [/\btools?|tooling|ferramentas?|equipamentos?\b/gi, 'ferramenta'],
  [/\btrainings?|treinamentos?|capacita(cao|ção)\b/gi, 'treinamento'],
  [/\brecords?|registros?|fichas?\b/gi, 'registro'],
  [/\bmanuals?|manuais?\b/gi, 'manual'],
  [/\bprocedures?|procedimentos?\b/gi, 'procedimento'],
  [/\bparts?|peças?|pecas?|materials?|materiais?\b/gi, 'material'],
  [/\bshelf[\s-]*life\b/gi, 'validade_prateleira'],
  [/\bquarantine|quarentena\b/gi, 'quarentena'],
  [/\brevisions?|revis(oes|ões|ao|ão)\b/gi, 'revisao'],
  [/\bfire\s*extinguishers?|extintores?\b/gi, 'extintor'],
  [/\binspections?|inspe(cao|ção|coes|ções)\b/gi, 'inspecao'],
  [/\bqualifications?|qualifica(cao|ção|coes|ções)\b/gi, 'qualificacao'],
  [/\bcertificates?|certificados?\b/gi, 'certificado'],
  [/\bstorage|armazenamento|estocagem\b/gi, 'armazenamento'],
  [/\blogbooks?|diario\s*de\s*bordo\b/gi, 'logbook'],
  [/\baudits?|auditorias?\b/gi, 'auditoria'],
  [/\bpersonnel|staff|pessoal|colaboradores?\b/gi, 'pessoal'],
  [/\bsubcontractors?|subcontratad[oa]s?|vendors?|fornecedores?\b/gi, 'fornecedor'],
  [/\bhousing|facilities|instalacoes|instalações|hangar\b/gi, 'instalacoes'],
  [/\bcurrent|vigente|up[\s-]*to[\s-]*date|atualizad[oa]s?\b/gi, 'vigente']
];

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'were', 'have', 'has', 'had', 'not',
  'que', 'para', 'com', 'dos', 'das', 'por', 'uma', 'uns', 'umas', 'como', 'sobre', 'entre',
  'requisito', 'auditoria', 'checklist', 'item', 'secao', 'secão', 'section', 'shall', 'must',
  'should', 'verify', 'check', 'ensure', 'confirm', 'verificar', 'garantir', 'assegurar',
  'system', 'sistema', 'process', 'processo', 'impacto', 'organization', 'organizacao'
]);

function normalizeText(raw: string): string {
  let out = (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  NORMALIZATION_SYNONYMS.forEach(([regex, replacement]) => {
    out = out.replace(regex, ` ${replacement} `);
  });

  return out;
}

function extractTokens(raw: string): Set<string> {
  const normalized = normalizeText(raw);
  const words = normalized.split(/[^a-z0-9_]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

function extractConcepts(raw: string): Map<string, number> {
  const concepts = new Map<string, number>();
  AVIATION_SEMANTIC_CONCEPTS.forEach((c) => {
    if (c.patterns.test(raw || '')) {
      concepts.set(c.id, c.weight);
    }
  });
  return concepts;
}

function extractNormClauses(raw: string): Set<string> {
  const clauses = new Set<string>();
  const matches = (raw || '').match(/\b(?:rbac\s*145\.?\d*|145\.a\.?\d+|14\s*cfr\s*(?:43|145)\.\d+|iosa\s*(?:mnt|org)[\s\.\d]*|qa-?14|q2059|momq|ptm[\s-]*\d*|f[\s-]*001[\s-]*29|8130-3|form\s*1)\b/gi);
  if (matches) {
    matches.forEach((m) => clauses.add(m.toLowerCase().replace(/\s+/g, ' ').trim()));
  }
  return clauses;
}

function computeSemanticSimilarity(
  reqTexto: string,
  reqNorma: string,
  reqSecao: string,
  baseItem: PreparacaoRequisitoAuditoria
): { score: number; matchedConcepts: string[]; matchedClauses: string[] } {
  const queryFull = `${reqTexto} ${reqNorma} ${reqSecao}`;
  const baseFull = `${baseItem.tituloRequisito || ''} ${baseItem.textoOriginal || ''} ${baseItem.normaDocumento || ''} ${baseItem.secaoReferencia || ''} ${baseItem.criterioCanonicoTitulo || ''}`;

  const qConcepts = extractConcepts(queryFull);
  const bConcepts = extractConcepts(baseFull);

  let conceptWeightShared = 0;
  let conceptWeightUnion = 0;
  const matchedConcepts: string[] = [];

  const allConceptIds = new Set([...qConcepts.keys(), ...bConcepts.keys()]);
  allConceptIds.forEach((cid) => {
    const wQ = qConcepts.get(cid) || 0;
    const wB = bConcepts.get(cid) || 0;
    conceptWeightUnion += Math.max(wQ, wB);
    if (wQ > 0 && wB > 0) {
      conceptWeightShared += Math.min(wQ, wB);
      matchedConcepts.push(cid);
    }
  });

  const conceptScore = conceptWeightUnion > 0 ? conceptWeightShared / conceptWeightUnion : 0;

  // Token overlap (Jaccard / Dice hybrid)
  const qTokens = extractTokens(queryFull);
  const bTokens = extractTokens(baseFull);
  let sharedTokens = 0;
  qTokens.forEach((t) => {
    if (bTokens.has(t)) sharedTokens++;
  });
  const diceScore = (qTokens.size + bTokens.size) > 0 ? (2 * sharedTokens) / (qTokens.size + bTokens.size) : 0;

  // Norm clause match
  const qClauses = extractNormClauses(queryFull);
  const bClauses = extractNormClauses(baseFull);
  const matchedClauses: string[] = [];
  qClauses.forEach((cl) => {
    if (bClauses.has(cl)) matchedClauses.push(cl);
  });
  const clauseBoost = matchedClauses.length > 0 ? Math.min(0.2, matchedClauses.length * 0.12) : 0;

  // Controle / tópico direto
  let combined = conceptScore * 0.56 + diceScore * 0.34 + clauseBoost;

  // Se ambos possuem conceitos definidos e NENHUM conceito em comum, penaliza fortemente falso positivo lexical
  if (qConcepts.size > 0 && bConcepts.size > 0 && matchedConcepts.length === 0) {
    combined *= 0.45;
  }

  return {
    score: Math.min(1, Number(combined.toFixed(4))),
    matchedConcepts,
    matchedClauses
  };
}

function detectScopeDivergences(
  escopoAuditoria: EscopoComparacaoAuditoria | undefined,
  auditCliente: string,
  reqNorma: string,
  baseItem: PreparacaoRequisitoAuditoria
): string[] {
  const divergencias: string[] = [];

  const audClienteNorm = normalizeText(escopoAuditoria?.cliente || auditCliente);
  const baseClienteNorm = normalizeText(baseItem.autoridadeOuCliente || '');

  // Diferença entre clientes operadores / contratantes específicos
  const specificCustomers = ['kalitta', 'atlas', 'swiss', 'tacv', 'latam', 'azul', 'gol', 'ups', 'fedex', 'dhl', 'lufthansa'];
  const audCustomerHit = specificCustomers.find((c) => audClienteNorm.includes(c));
  const baseCustomerHit = specificCustomers.find((c) => baseClienteNorm.includes(c));

  if (audCustomerHit && baseCustomerHit && audCustomerHit !== baseCustomerHit) {
    divergencias.push(
      `Diferença de cliente/operador contratante: auditoria atual (${auditCliente}) vs. requisito base (${baseItem.autoridadeOuCliente}). Requisitos de manual/GMM do operador exigem validação específica.`
    );
  } else if (audCustomerHit && !baseCustomerHit && (baseItem.textoOriginal || '').toLowerCase().includes('gmm')) {
    divergencias.push(
      `O requisito cita GMM/procedimento específico do operador (${auditCliente}) enquanto o requisito base refere-se a norma geral (${baseItem.autoridadeOuCliente}).`
    );
  }

  // Diferença explícita de localidade / estação ou escopo declarado na auditoria vs base
  if (escopoAuditoria?.localidade && baseItem.escopoAplicavel?.bases?.length) {
    const locNorm = normalizeText(escopoAuditoria.localidade);
    const matchLoc = baseItem.escopoAplicavel.bases.some((l) => locNorm.includes(normalizeText(l)) || normalizeText(l).includes(locNorm));
    if (!matchLoc) {
      divergencias.push(`Estação/localidade da auditoria (${escopoAuditoria.localidade}) difere das bases cobertas pelo requisito base (${baseItem.escopoAplicavel.bases.join(', ')}).`);
    }
  }

  if (escopoAuditoria?.aeronave && baseItem.escopoAplicavel?.aeronaves?.length) {
    const acNorm = normalizeText(escopoAuditoria.aeronave);
    const matchAc = baseItem.escopoAplicavel.aeronaves.some((a) => acNorm.includes(normalizeText(a)) || normalizeText(a).includes(acNorm));
    if (!matchAc) {
      divergencias.push(`Frota/aeronave da auditoria (${escopoAuditoria.aeronave}) não coberta explicitamente no escopo aprovado da base (${baseItem.escopoAplicavel.aeronaves.join(', ')}).`);
    }
  }

  // Diferença regulatória primária explícita (ex.: EASA vs FAA vs RBAC 145 quando o texto menciona apenas uma autoridade específica)
  const reqNormLower = (reqNorma || '').toLowerCase();
  const baseNormLower = `${baseItem.autoridadeOuCliente || ''} ${baseItem.normaDocumento || ''}`.toLowerCase();
  if (
    (reqNormLower.includes('easa') && !baseNormLower.includes('easa') && baseNormLower.includes('rbac')) ||
    (reqNormLower.includes('14 cfr') && !baseNormLower.includes('14 cfr') && !baseNormLower.includes('faa') && baseNormLower.includes('easa'))
  ) {
    divergencias.push(`Diferença de enquadramento regulatório primário entre a norma auditada (${reqNorma}) e o requisito base (${baseItem.autoridadeOuCliente}).`);
  }

  return divergencias;
}

export function recalcularResumoPreAuditoria(
  itens: ItemPreAuditoriaComparado[]
): ResumoClassificacaoPreAuditoria {
  let equivalenciaConfirmada = 0;
  let equivalenciaParcial = 0;
  let semRespostaAprovada = 0;
  let novoRequisito = 0;
  let validadosParaAuditoria = 0;
  let incorporadosNaBase = 0;

  itens.forEach((it) => {
    if (it.classificacao === 'EQUIVALÊNCIA CONFIRMADA') equivalenciaConfirmada++;
    else if (it.classificacao === 'EQUIVALÊNCIA PARCIAL') equivalenciaParcial++;
    else if (it.classificacao === 'REQUISITO SEM RESPOSTA APROVADA') semRespostaAprovada++;
    else novoRequisito++;

    if (it.statusTratamento === 'VALIDADO_PARA_AUDITORIA' || it.statusTratamento === 'APROVADO_QUALIDADE' || it.statusTratamento === 'INCORPORADO_NA_BASE') {
      validadosParaAuditoria++;
    }
    if (it.statusTratamento === 'INCORPORADO_NA_BASE' || it.incorporadoNaBaseId) {
      incorporadosNaBase++;
    }
  });

  return {
    totalItens: itens.length,
    equivalenciaConfirmada,
    equivalenciaParcial,
    semRespostaAprovada,
    novoRequisito,
    validadosParaAuditoria,
    incorporadosNaBase
  };
}

/**
 * Compara um conjunto de requisitos importados de uma auditoria contra a Base Institucional (177+ requisitos).
 * Requer base já avaliada (ou executa detectarImpactosBaseInstitucional quando contextoSGQ for informado).
 */
export function analisarAuditoriaContraBaseInstitucional(params: {
  organizationId: string;
  audit: Pick<
    AuditoriaExternaRecord,
    'id' | 'numeroAuditoria' | 'entidadeAuditora' | 'origem' | 'escopo' | 'local' | 'checklistCodigo' | 'checklistRevisao'
  >;
  requisitosAuditados: RequisitoAuditoriaExterna[];
  preparacoesBase: PreparacaoRequisitoAuditoria[];
  contextoSGQ?: ContextoCruzadoSGQ;
  existingPreAudit?: PreAuditoriaConsolidada | null;
  currentUser?: UserProfile | null;
}): PreAuditoriaConsolidada {
  const {
    organizationId,
    audit,
    requisitosAuditados,
    preparacoesBase,
    contextoSGQ,
    existingPreAudit,
    currentUser
  } = params;

  const hoje = new Date().toISOString().split('T')[0];
  const agora = new Date().toISOString();

  // Garantir leitura atualizada de impactos na Base Institucional antes de comparar
  const baseAtualizada = contextoSGQ
    ? detectarImpactosBaseInstitucional(preparacoesBase, contextoSGQ)
    : preparacoesBase;

  const clienteAudit = audit.entidadeAuditora || audit.origem || 'Cliente Externo';
  const escopoAuditoria: EscopoComparacaoAuditoria = {
    cliente: clienteAudit,
    norma: audit.checklistCodigo || audit.escopo,
    localidade: audit.local,
    atividade: audit.escopo
  };

  // Preservar edições locais se for reexecução de análise sobre uma pré-auditoria já existente
  const existingByReqId = new Map<string, ItemPreAuditoriaComparado>();
  (existingPreAudit?.itens || []).forEach((it) => {
    existingByReqId.set(it.requisitoAuditoriaId, it);
  });

  const itensComparados: ItemPreAuditoriaComparado[] = requisitosAuditados.map((reqAud) => {
    const prevItem = existingByReqId.get(reqAud.id);
    const reqTexto = reqAud.textoOriginal || reqAud.perguntaOuCriterio || reqAud.tituloCurto || '';
    const reqNorma = reqAud.referenciaNormativa || '';
    const reqSecao = reqAud.capituloOuSecao || '';

    // Buscar melhor correspondência semântica na Base Institucional (177+ requisitos)
    let bestMatch: PreparacaoRequisitoAuditoria | null = null;
    let bestScore = 0;
    let bestConcepts: string[] = [];
    let bestClauses: string[] = [];

    for (const baseItem of baseAtualizada) {
      const sim = computeSemanticSimilarity(reqTexto, reqNorma, reqSecao, baseItem);
      if (sim.score > bestScore) {
        bestScore = sim.score;
        bestMatch = baseItem;
        bestConcepts = sim.matchedConcepts;
        bestClauses = sim.matchedClauses;
      }
    }

    const scorePercent = Math.round(bestScore * 100);
    const thresholdEquivalencia = 0.34; // Exige aderência conceitual/semântica real

    let classificacao: ClassificacaoCorrespondenciaBase = 'NOVO REQUISITO';
    let justificativaClassificacao = '';
    const fatoresDivergenciaEscopo: string[] = [];
    const lacunasIdentificadas: string[] = [];
    let documentosRelacionados: ItemPreAuditoriaComparado['documentosRelacionados'] = [];
    let evidenciasValidas: ItemPreAuditoriaComparado['evidenciasValidas'] = [];

    if (!bestMatch || bestScore < thresholdEquivalencia) {
      classificacao = 'NOVO REQUISITO';
      justificativaClassificacao =
        'Nenhum requisito equivalente foi localizado na Base Institucional (177+ requisitos). Necessário tratamento específico e eventual incorporação aprovada pela Qualidade.';

      // Ainda assim, consulta SGQ para sugerir docs/lacunas honestas se houver relação no acervo
      if (contextoSGQ) {
        const consultaNova = consultarRegistrosRelacionadosSGQ(
          {
            id: reqAud.id,
            requisitoId: reqAud.id,
            tituloRequisito: reqAud.tituloCurto,
            textoOriginal: reqTexto,
            normaDocumento: reqNorma,
            referenciaNormativa: reqNorma,
            secaoReferencia: reqSecao
          },
          contextoSGQ
        );
        documentosRelacionados = consultaNova.documentosControlados.slice(0, 6).map((d) => ({
          codigo: d.codigo,
          titulo: d.titulo,
          revisao: d.revisaoVigenteNumero,
          situacao: d.statusGeral
        }));
        lacunasIdentificadas.push(...consultaNova.lacunasIdentificadas);
      } else {
        lacunasIdentificadas.push('Requisito novo sem resposta institucional cadastrada na base.');
      }
    } else {
      // Existe candidato equivalente na base
      documentosRelacionados = (bestMatch.documentosRelacionados || []).map((d) => ({
        codigo: d.codigo,
        titulo: d.titulo,
        revisao: d.revisao,
        situacao: d.situacao
      }));

      const evsBase = bestMatch.evidenciasVinculadas || [];
      const evsValidas = evsBase.filter(
        (e) =>
          e.statusValidade !== 'VENCIDO' &&
          (!e.dataValidade || e.dataValidade >= hoje) &&
          e.avaliacaoQualidade?.status !== 'REJEITADA'
      );
      const evsVencidas = evsBase.filter(
        (e) => e.statusValidade === 'VENCIDO' || (e.dataValidade && e.dataValidade < hoje)
      );

      evidenciasValidas = evsValidas.map((e) => ({
        id: e.evidenciaId,
        titulo: e.titulo,
        numeroReferencia: e.numeroReferencia,
        dataValidade: e.dataValidade,
        statusValidade: e.statusValidade
      }));

      const respostaAprovada =
        bestMatch.statusResposta === 'APROVADA' &&
        Boolean(bestMatch.respostaRevisada) &&
        Boolean(bestMatch.respostaTexto && bestMatch.respostaTexto.trim().length >= 20);

      if (!respostaAprovada) {
        classificacao = 'REQUISITO SEM RESPOSTA APROVADA';
        justificativaClassificacao = `Correspondência identificada com [${bestMatch.requisitoId} — ${bestMatch.autoridadeOuCliente}] (${scorePercent}%), porém a resposta institucional encontra-se com status [${bestMatch.statusResposta}] e aguarda elaboração/aprovação pela Qualidade.`;
        lacunasIdentificadas.push(
          `Resposta institucional de ${bestMatch.requisitoId} ainda não está com status APROVADA pela Qualidade.`
        );
      } else {
        // A resposta base é APROVADA -> avaliar escopo, atualidade e evidências
        const divEscopo = detectScopeDivergences(escopoAuditoria, clienteAudit, reqNorma, bestMatch);
        fatoresDivergenciaEscopo.push(...divEscopo);

        if (bestMatch.reavaliacaoNecessaria && bestMatch.motivosReavaliacao?.length) {
          fatoresDivergenciaEscopo.push(
            `Impacto pendente na base institucional: ${bestMatch.motivosReavaliacao.join(' | ')}`
          );
          lacunasIdentificadas.push(...bestMatch.motivosReavaliacao);
        }

        if (evsVencidas.length > 0) {
          fatoresDivergenciaEscopo.push(
            `${evsVencidas.length} evidência(s) vinculada(s) ao requisito base encontra(m)-se VENCIDA(S).`
          );
          lacunasIdentificadas.push(
            `Atualizar evidência(s) vencida(s): ${evsVencidas.map((e) => e.titulo).join(', ')}.`
          );
        }

        const exigeEvidenciaCampo = bestMatch.modalidadeComprovacao !== 'DOCUMENTAL_PURO';
        if (exigeEvidenciaCampo && evsValidas.length === 0) {
          fatoresDivergenciaEscopo.push(
            `Modalidade [${bestMatch.modalidadeComprovacao}] exige evidência operacional válida; nenhuma evidência vigente disponível no momento.`
          );
          lacunasIdentificadas.push('Anexar ou atualizar evidência objetiva válida aplicável a esta auditoria.');
        }

        if (bestScore < 0.52) {
          fatoresDivergenciaEscopo.push(
            `Similaridade contextual moderada (${scorePercent}%). Conferência humana obrigatória para confirmar abrangência total.`
          );
        }

        if (fatoresDivergenciaEscopo.length === 0) {
          classificacao = 'EQUIVALÊNCIA CONFIRMADA';
          justificativaClassificacao = `Requisito equivalente ao item [${bestMatch.requisitoId}] (${scorePercent}% | conceitos: ${bestConcepts.join(', ') || 'normativo'}${bestClauses.length ? ` | cláusulas: ${bestClauses.join(', ')}` : ''}), com resposta institucional APROVADA, escopo compatível e evidências vigentes.`;
        } else {
          classificacao = 'EQUIVALÊNCIA PARCIAL';
          justificativaClassificacao = `Requisito correlacionado ao item [${bestMatch.requisitoId}] (${scorePercent}%), porém NÃO reutilizável automaticamente sem revisão devido a: ${fatoresDivergenciaEscopo[0]}`;
        }
      }
    }

    return {
      id: prevItem?.id || `PREITEM-${audit.id}-${reqAud.id}`,
      requisitoAuditoriaId: reqAud.id,
      numeroItem: reqAud.numeroItem,
      capituloOuSecao: reqAud.capituloOuSecao || 'Geral',
      textoOriginalRequisito: reqTexto, // Preservação ipsis litteris
      referenciaNormativa: reqAud.referenciaNormativa,
      classificacao,
      justificativaClassificacao,
      scoreSemantico: scorePercent,
      fatoresDivergenciaEscopo,
      requisitoBaseId: bestMatch && bestScore >= thresholdEquivalencia ? bestMatch.id : undefined,
      requisitoBaseCodigo: bestMatch && bestScore >= thresholdEquivalencia ? bestMatch.requisitoId : undefined,
      origemBaseMatch:
        bestMatch && bestScore >= thresholdEquivalencia
          ? bestMatch.origemBase || 'BASE_INICIAL_177'
          : undefined,
      statusRespostaBaseNoMomento:
        bestMatch && bestScore >= thresholdEquivalencia ? bestMatch.statusResposta : undefined,
      respostaInstitucionalBase:
        bestMatch && bestScore >= thresholdEquivalencia ? bestMatch.respostaTexto : undefined,
      respostaAdaptadaAuditoria: prevItem?.respostaAdaptadaAuditoria ?? (
        classificacao === 'EQUIVALÊNCIA CONFIRMADA' ? bestMatch?.respostaTexto : ''
      ),
      observacoesEscopo: prevItem?.observacoesEscopo,
      documentosRelacionados,
      evidenciasValidas,
      lacunasIdentificadas,
      statusTratamento:
        prevItem?.statusTratamento ||
        (classificacao === 'EQUIVALÊNCIA CONFIRMADA' ? 'VALIDADO_PARA_AUDITORIA' : 'PENDENTE'),
      incorporadoNaBaseId: prevItem?.incorporadoNaBaseId,
      incorporadoEm: prevItem?.incorporadoEm,
      validadoPorNome: prevItem?.validadoPorNome,
      validadoEm: prevItem?.validadoEm
    };
  });

  const resumo = recalcularResumoPreAuditoria(itensComparados);
  const temPendencias =
    resumo.semRespostaAprovada > 0 ||
    resumo.novoRequisito > 0 ||
    resumo.equivalenciaParcial > 0;

  return {
    id: existingPreAudit?.id || `PREAUD-${audit.id}`,
    organizationId,
    auditId: audit.id,
    numeroAuditoria: audit.numeroAuditoria,
    clienteOuEntidade: clienteAudit,
    codigoChecklist: audit.checklistCodigo,
    revisaoChecklist: audit.checklistRevisao,
    escopoAuditoria,
    statusPreAuditoria:
      existingPreAudit?.statusPreAuditoria === 'FINALIZADA_CONGELADA'
        ? 'FINALIZADA_CONGELADA'
        : temPendencias
        ? 'CONSOLIDADA_COM_PENDENCIAS'
        : 'PRONTA_PARA_AUDITORIA',
    resumo,
    itens: itensComparados,
    snapshots: existingPreAudit?.snapshots || [],
    baseInstitucionalTotalNoMomento: baseAtualizada.length,
    createdAt: existingPreAudit?.createdAt || agora,
    updatedAt: agora,
    criadoPorUid: existingPreAudit?.criadoPorUid || auth.currentUser?.uid || currentUser?.uid,
    criadoPorNome: existingPreAudit?.criadoPorNome || currentUser?.displayName || 'QualiGest SGQ'
  };
}

/**
 * Gera um Snapshot Imutável da Pré-Auditoria para rastreabilidade auditável (sem alterar snapshots anteriores).
 */
export function gerarSnapshotImutavelPreAuditoria(
  preAudit: PreAuditoriaConsolidada,
  currentUser?: UserProfile | null,
  observacoes?: string
): PreAuditoriaConsolidada {
  const agora = new Date().toISOString();
  const existingSnapshots = preAudit.snapshots || [];
  const nextVersion = existingSnapshots.length + 1;

  // Deep clone para garantir imutabilidade contra edições futuras
  const itensSnapshotClonados: ItemPreAuditoriaComparado[] = JSON.parse(JSON.stringify(preAudit.itens || []));
  const resumoAtual = recalcularResumoPreAuditoria(itensSnapshotClonados);

  const novoSnapshot: PreAuditoriaSnapshot = {
    snapshotId: `SNAP-${preAudit.id}-V${nextVersion}-${Date.now()}`,
    versaoSnapshot: nextVersion,
    geradoEm: agora,
    geradoPorNome: currentUser?.displayName || 'Garantia da Qualidade SGQ',
    geradoPorUid: auth.currentUser?.uid || currentUser?.uid,
    resumo: resumoAtual,
    itensSnapshot: itensSnapshotClonados,
    observacoes: observacoes || `Snapshot imutável v${nextVersion} da pré-auditoria ${preAudit.numeroAuditoria}.`,
    imutavel: true
  };

  return {
    ...preAudit,
    resumo: resumoAtual,
    snapshots: [...existingSnapshots, novoSnapshot],
    updatedAt: agora
  };
}
