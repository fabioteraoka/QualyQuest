import {
  NCRecord,
  ItemComparacaoCampo,
  ClassificacaoDiferenca,
  ComparacaoRNCRecord,
  StatusComparacao,
  CorrespondenciaRNC,
} from '../types';

/**
 * Normaliza textos removendo espaços múltiplos, quebras e pontuação desnecessária
 */
function normalize(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similaridade semântica heurística e identificação de divergência
 */
function evaluateSemanticField(
  campoId: ItemComparacaoCampo['campoId'],
  nomeCampo: string,
  valorOriginal: string,
  valorResposta: string
): ItemComparacaoCampo {
  const normOriginal = normalize(valorOriginal);
  const normResposta = normalize(valorResposta);

  // 1. Caso NÃO INFORMADO
  if (!valorResposta || normResposta.length < 3 || /nao informado|n\/a|sem resposta/i.test(normResposta)) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: valorOriginal || 'Não cadastrado originalmente',
      valorRespostaUsuario: valorResposta || 'Não informado no documento de resposta',
      classificacao: 'NAO_INFORMADO',
      explicacaoAnalise: 'O documento de resposta não contém menção ou informação explícita para este campo.',
      sugestaoPrevalencia: 'ANALISE_ORIGINAL',
    };
  }

  // 2. Caso o original estivesse vazio e agora tem resposta -> NOVA INFORMAÇÃO
  if (!valorOriginal || normOriginal.length < 3) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: 'Não preenchido inicialmente',
      valorRespostaUsuario: valorResposta,
      classificacao: 'NOVA_INFORMACAO',
      explicacaoAnalise: 'A resposta do usuário traz conhecimento inédito que não constava no registro inicial do QualiGest.',
      sugestaoPrevalencia: 'RESPOSTA_USUARIO',
      tipoDiferenca: 'NOVO_FATO',
    };
  }

  // 3. Caso de Identidade ou Alta Similaridade Direta -> CONVERGENTE
  if (normOriginal === normResposta || normOriginal.includes(normResposta) || normResposta.includes(normOriginal)) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: valorOriginal,
      valorRespostaUsuario: valorResposta,
      classificacao: 'CONVERGENTE',
      explicacaoAnalise: 'A resposta fornecida pelo usuário coincide ou é conceitualmente compatível com a análise inicial do sistema.',
      sugestaoPrevalencia: 'RESPOSTA_USUARIO',
      tipoDiferenca: 'SEMANTICA_EQUIVALENTE',
    };
  }

  // 4. Análise de Palavras-Chave Semânticas por Campo (Identificação de Equivalência vs Divergência)
  const isMetrology = /calibra|medidor|torqu|paquimetro|micrometro|manometro|rec/i.test(normResposta);
  const isDoc = /procedimento|manual|momq|registro|pop|formul[áa]rio|obsolet|document/i.test(normResposta);
  const isTraining = /treinamento|qualifica[çc][ãa]o|licen[çc]a|compet[êe]ncia|reciclagem/i.test(normResposta);
  const isProcess = /metodo|processo|etapa|fluxo|barreira/i.test(normResposta);

  const origMetrology = /calibra|medidor|torqu|paquimetro|micrometro|manometro|rec/i.test(normOriginal);
  const origDoc = /procedimento|manual|momq|registro|pop|formul[áa]rio|obsolet|document/i.test(normOriginal);
  const origTraining = /treinamento|qualifica[çc][ãa]o|licen[çc]a|compet[êe]ncia|reciclagem/i.test(normOriginal);

  // Equivalência conceitual de calibração / metrologia
  if (isMetrology && origMetrology) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: valorOriginal,
      valorRespostaUsuario: valorResposta,
      classificacao: 'CONVERGENTE',
      explicacaoAnalise: 'Ambas as análises convergem para desvio de calibração e controle metrológico de ferramentas.',
      sugestaoPrevalencia: 'RESPOSTA_USUARIO',
      tipoDiferenca: 'SEMANTICA_EQUIVALENTE',
    };
  }

  // Complementação (ex: usuário detalha plano de ação ou acrescenta controles eletrônicos / auditorias)
  if (
    normResposta.length > normOriginal.length * 1.3 &&
    (normResposta.includes('implant') || normResposta.includes('auditoria') || normResposta.includes('reciclagem') || normResposta.includes('bloqueio'))
  ) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: valorOriginal,
      valorRespostaUsuario: valorResposta,
      classificacao: 'COMPLEMENTAR',
      explicacaoAnalise: 'O usuário acrescentou etapas executivas, melhorias ou controles complementares que enriquecem o plano original.',
      sugestaoPrevalencia: 'RESPOSTA_USUARIO',
      tipoDiferenca: 'COMPLEMENTO_PLANO',
    };
  }

  // DIVERGÊNCIA SIGNIFICATIVA: Causa raiz diferente (Ex: Treinamento vs Ferramental / Documento vs Metrologia)
  if ((origTraining && !isTraining && isMetrology) || (origDoc && isTraining) || (origMetrology && isDoc)) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: valorOriginal,
      valorRespostaUsuario: valorResposta,
      classificacao: 'DIVERGENTE',
      explicacaoAnalise: 'Divergência conceitual identificada: A análise preliminar inferiu um fator causal diferente do constatado in loco pelo responsável. Pela regra de prioridade SGQ, a resposta real do usuário prevalece.',
      sugestaoPrevalencia: 'RESPOSTA_USUARIO',
      tipoDiferenca: 'DISCORDANCIA_CAUSAL',
    };
  }

  // 5. Contradição Explícita
  if (
    (/nao se aplica|inexistente|desconsiderar|improcedente|rejeitada/i.test(normResposta) && !normOriginal.includes('improcedente')) ||
    (/eficaz/i.test(normOriginal) && /ineficaz|reabrir|rejeitada/i.test(normResposta))
  ) {
    return {
      campoId,
      nomeCampo,
      valorOriginalQualiGest: valorOriginal,
      valorRespostaUsuario: valorResposta,
      classificacao: 'CONTRADITORIO',
      explicacaoAnalise: 'A resposta do usuário contradiz frontalmente a hipótese ou status anterior. Requer validação do Gestor SGQ.',
      sugestaoPrevalencia: 'NECESSITA_REVISAO',
      tipoDiferenca: 'DISCORDANCIA_CAUSAL',
    };
  }

  // Divergência Padrão
  return {
    campoId,
    nomeCampo,
    valorOriginalQualiGest: valorOriginal,
    valorRespostaUsuario: valorResposta,
    classificacao: 'DIVERGENTE',
    explicacaoAnalise: 'A redação e direcionamento adotados pelo responsável diferem da sugestão inicial do sistema. Prevalece a resposta real do usuário.',
    sugestaoPrevalencia: 'RESPOSTA_USUARIO',
    tipoDiferenca: 'DISCORDANCIA_CAUSAL',
  };
}

/**
 * Executa a comparação completa entre um registro de RNC existente e a resposta do usuário
 */
export function compareRNCWithRespondedDocument(
  rnc: NCRecord,
  extractedData: {
    descricaoNC?: string;
    normaReferencia?: string;
    setor?: string;
    categoria?: string;
    contencao?: string;
    preAnalise?: string;
    preAnaliseContencao?: any;
    causaRaiz?: string;
    cincoPorques?: string[] | string;
    ishikawa?: any;
    acaoCorretiva?: string;
    comoSeraFeito?: string;
    responsavelAcao?: string;
    prazoAcao?: string;
    verificacaoEficacia?: string;
    metodoEficacia?: string;
    riscoSeveridade?: any;
    riscoProbabilidade?: any;
  },
  meta: {
    documentoFonteId: string;
    nomeArquivoFonte: string;
    tipoArquivoFonte: 'DOCX' | 'PDF' | 'TXT' | 'TEXTO_COLADO';
    textoOriginalExtraido: string;
    tamanhoArquivo?: number;
    correspondencia: CorrespondenciaRNC;
  }
): ComparacaoRNCRecord {
  const campos: ItemComparacaoCampo[] = [];

  // Campo 1: Descrição da Não Conformidade
  campos.push(
    evaluateSemanticField(
      'descricao',
      'Descrição da Não Conformidade',
      rnc.descricaoNC || '',
      extractedData.descricaoNC || ''
    )
  );

  // Campo 2: Norma e Requisito de Referência
  campos.push(
    evaluateSemanticField(
      'normaReferencia',
      'Norma / Manual de Referência',
      rnc.normaReferencia || '',
      extractedData.normaReferencia || ''
    )
  );

  // Campo 3: 2. Pré-Análise da Causa e Ação de Contenção
  const contencaoOrig = rnc.preAnaliseContencao?.descricao
    ? (rnc.preAnaliseContencao.observacoes ? `${rnc.preAnaliseContencao.descricao}\n(Obs: ${rnc.preAnaliseContencao.observacoes})` : rnc.preAnaliseContencao.descricao)
    : '';
  const contencaoResp = extractedData.contencao || extractedData.preAnaliseContencao?.descricao || '';
  campos.push(
    evaluateSemanticField(
      'contencao',
      '2. Pré-Análise da Causa e Ação de Contenção',
      contencaoOrig,
      contencaoResp
    )
  );

  // Campo 4: Causa Raiz
  const causaOrig = rnc.analiseCausaRaiz?.detalhes || 
    (rnc.analiseCausaRaiz?.cincoPorques && rnc.analiseCausaRaiz.cincoPorques.join('\n')) || 
    '';
  const causaResp = extractedData.causaRaiz || 
    (Array.isArray(extractedData.cincoPorques) ? extractedData.cincoPorques.join('\n') : String(extractedData.cincoPorques || ''));
  campos.push(
    evaluateSemanticField(
      'causaRaiz',
      'Análise de Causa Raiz',
      causaOrig,
      causaResp
    )
  );

  // Campo 5: 5 Porquês
  const cincoPorquesOrig = (rnc.analiseCausaRaiz?.cincoPorques || []).join('\n');
  const cincoPorquesResp = Array.isArray(extractedData.cincoPorques)
    ? extractedData.cincoPorques.join('\n')
    : String(extractedData.cincoPorques || '');
  campos.push(
    evaluateSemanticField(
      'cincoPorques',
      'Desdobramento dos 5 Porquês',
      cincoPorquesOrig,
      cincoPorquesResp
    )
  );

  // Campo 6: Ação Corretiva (5W2H)
  const acaoOrig = [
    rnc.acaoCorretiva?.descricao || '',
    rnc.acaoCorretiva?.comoSeraFeito ? `Como: ${rnc.acaoCorretiva.comoSeraFeito}` : '',
    rnc.acaoCorretiva?.responsavel ? `Resp: ${rnc.acaoCorretiva.responsavel}` : '',
  ].filter(Boolean).join(' | ');

  const acaoResp = [
    extractedData.acaoCorretiva || '',
    extractedData.comoSeraFeito ? `Como: ${extractedData.comoSeraFeito}` : '',
    extractedData.responsavelAcao ? `Resp: ${extractedData.responsavelAcao}` : '',
  ].filter(Boolean).join(' | ');

  campos.push(
    evaluateSemanticField(
      'acaoCorretiva',
      'Plano de Ação Corretiva (5W2H)',
      acaoOrig,
      acaoResp
    )
  );

  // Campo 7: Verificação de Eficácia
  const eficOrig = [
    rnc.verificacaoEficacia?.motivo || '',
    rnc.verificacaoEficacia?.metodo ? `Método: ${rnc.verificacaoEficacia.metodo}` : '',
    rnc.verificacaoEficacia?.encerrado ? `Parecer: ${rnc.verificacaoEficacia.encerrado}` : '',
  ].filter(Boolean).join(' | ');

  const eficResp = [
    extractedData.verificacaoEficacia || '',
    extractedData.metodoEficacia ? `Método: ${extractedData.metodoEficacia}` : '',
  ].filter(Boolean).join(' | ');

  campos.push(
    evaluateSemanticField(
      'verificacaoEficacia',
      'Verificação da Eficácia',
      eficOrig,
      eficResp
    )
  );

  // Campo 8: Matriz de Risco 5x5
  const riscoOrig = rnc.avaliacaoRiscoInicial
    ? `${rnc.avaliacaoRiscoInicial.codigo} (${rnc.avaliacaoRiscoInicial.nivel})`
    : 'Não avaliado';
  const riscoResp = extractedData.riscoSeveridade && extractedData.riscoProbabilidade
    ? `${extractedData.riscoSeveridade}${extractedData.riscoProbabilidade}`
    : '';

  campos.push(
    evaluateSemanticField(
      'risco',
      'Matriz de Risco Inicial (5x5)',
      riscoOrig,
      riscoResp
    )
  );

  // Contabilização estatística
  let convergentes = 0;
  let complementares = 0;
  let divergentes = 0;
  let contraditorios = 0;
  let novasInformacoes = 0;
  let naoInformados = 0;

  const principaisDivergencias: string[] = [];
  const principaisComplementos: string[] = [];

  for (const c of campos) {
    switch (c.classificacao) {
      case 'CONVERGENTE':
        convergentes++;
        break;
      case 'COMPLEMENTAR':
        complementares++;
        principaisComplementos.push(c.nomeCampo);
        break;
      case 'DIVERGENTE':
        divergentes++;
        principaisDivergencias.push(c.nomeCampo);
        break;
      case 'CONTRADITORIO':
        contraditorios++;
        principaisDivergencias.push(`${c.nomeCampo} (Contradição)`);
        break;
      case 'NOVA_INFORMACAO':
        novasInformacoes++;
        break;
      case 'NAO_INFORMADO':
        naoInformados++;
        break;
    }
  }

  const camposAvaliados = campos.length - naoInformados;
  const taxaConcordancia = camposAvaliados > 0
    ? Math.round(((convergentes + complementares * 0.5) / camposAvaliados) * 100)
    : 100;

  // Status Geral do Resultado
  let statusGeral: StatusComparacao = 'PENDENTE_VALIDACAO';
  if (meta.correspondencia.nivelConfianca === 'BAIXA' || meta.correspondencia.duvidaMotivo) {
    statusGeral = 'DUVIDA_ASSOCIACAO';
  } else if (divergentes === 0 && contraditorios === 0) {
    statusGeral = 'VALIDADO_CONVERGENTE';
  } else {
    statusGeral = 'VALIDADO_COM_DIVERGENCIAS';
  }

  const now = new Date().toISOString();
  const comparisonId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: comparisonId,
    documentoFonteId: meta.documentoFonteId,
    nomeArquivoFonte: meta.nomeArquivoFonte,
    tipoArquivoFonte: meta.tipoArquivoFonte,
    textoOriginalExtraido: meta.textoOriginalExtraido,
    tamanhoArquivo: meta.tamanhoArquivo,
    dataUpload: now,
    rncIdAssociada: rnc.id,
    numeroNCAssociada: rnc.numeroNC,
    correspondencia: meta.correspondencia,
    statusGeral,
    camposComparados: campos,
    resumoComparacao: {
      totalCampos: campos.length,
      convergentes,
      complementares,
      divergentes,
      contraditorios,
      novasInformacoes,
      naoInformados,
      taxaConcordancia,
      principaisDivergencias,
      principaisComplementos,
    },
    propostaAtualizacaoRNC: {
      descricaoNC: extractedData.descricaoNC,
      normaReferencia: extractedData.normaReferencia,
      setor: extractedData.setor,
      preAnaliseContencao: extractedData.contencao ? { descricao: extractedData.contencao } : undefined,
      analiseCausaRaiz: extractedData.causaRaiz ? {
        detalhes: extractedData.causaRaiz,
        cincoPorques: Array.isArray(extractedData.cincoPorques) ? extractedData.cincoPorques : undefined,
      } : undefined,
      acaoCorretiva: extractedData.acaoCorretiva ? {
        descricao: extractedData.acaoCorretiva,
        comoSeraFeito: extractedData.comoSeraFeito,
        responsavel: extractedData.responsavelAcao,
        dataPrazo: extractedData.prazoAcao,
      } : undefined,
    },
    historicoDecisoes: [],
    criadoEm: now,
    atualizadoEm: now,
  };
}
