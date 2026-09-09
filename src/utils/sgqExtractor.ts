import { NCRecord, TipoAcao, MetodoVerificacaoEficacia, NivelRisco, SeveridadeRisco, ProbabilidadeRisco, AuditoriaPertinenciaResultado, ManualRecord, ManualCapitulo } from '../types';
import { obterVersaoNormativaAplicavel } from './qualityHelpers';

export function parseRNCLocalHeuristics(textContent?: string, fileName?: string): Partial<NCRecord> {
  const text = textContent || '';
  
  // 1. Extract Form Code, Revision and Issue Date from header/footer
  const formCodeMatch = text.match(/(F\s*001-29|F\s*\d{3}-\d{2})/i);
  const codigoFormulario = formCodeMatch ? formCodeMatch[1].replace(/\s+/, ' ').trim() : 'F 001-29';

  const revMatch = text.match(/(?:revis[ãa]o|rev|r)[:\.\s]*(\d{1,2})/i);
  const revisao = revMatch ? revMatch[1].padStart(2, '0') : '00';

  const emissaoMatch = text.match(/(?:data\s*emiss[ãa]o|emiss[ãa]o)[:\.\s]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i);
  const dataEmissaoFormulario = emissaoMatch ? emissaoMatch[1] : '02/09/2025';

  // 2. Extract NC Number
  const numMatch = text.match(/(?:n[ºo°\.]?\s*(?:da\s*)?nc|nc\s*n[ºo°\.]?|n[ºo°\.]?\s*:\s*)[:\s]*([a-zA-Z0-9\-_]+)/i);
  const numeroNC = numMatch ? numMatch[1].trim() : '';

  // 3. Extract Title
  let titulo = '';
  const titleMatch = text.match(/t[íi]tulo\s*:\s*([^\n\r\(\)]+)/i);
  if (titleMatch && titleMatch[1].trim()) {
    titulo = titleMatch[1].trim();
  } else if (fileName && !fileName.toLowerCase().includes('em_branco') && !fileName.toLowerCase().includes('formulario')) {
    titulo = fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
  }

  // 4. Extract Type of Action
  const isPreventiva = /(?:preventiva\s*\(\s*[xXvV\*\u2713\u25A0]\s*\)|\(\s*[xXvV\*\u2713\u25A0]\s*\)\s*preventiva|tipo\s*:\s*preventiva)/i.test(text);
  const tipoAcao: TipoAcao = isPreventiva ? 'Preventiva' : 'Corretiva';

  // 5. Extract Section 1: Description
  let descricaoNC = '';
  const descMatch = text.match(/(?:1\.\s*DESCRI[ÇC][ÃA]O\s*(?:DA\s*)?N[ÃA]O\s*CONFORMIDADE|Descri[çc][ãa]o\s*da\s*NC)[\s\:\-]+([\s\S]*?)(?:Avalia[çc][ãa]o\s*de\s*Risco|Prazo\s*de\s*Resposta|2\.\s*PR[ÉE]|Auditor\s*:|$)/i);
  if (descMatch && descMatch[1].trim()) {
    descricaoNC = descMatch[1].trim();
  }

  // 6. Extract Norm / Reference
  let normaReferencia = '';
  const normMatch = text.match(/(MOMQ\s*[\d\.]+|ISO\s*9001(?::\d+)?(?:\s*[\d\.]+)?|RBAC\s*145(?:\.[\d]+)?|DO-178[A-C]?|SGSO|MOE|FAR\s*145(?:\.[\d]+)?|ANAC\s*IS\s*[\d\-]+)/i);
  if (normMatch) {
    normaReferencia = normMatch[1].trim();
  }

  // 7. Extract Sector
  let setor = '';
  if (/REC|Calibra|Metrolog/i.test(text)) {
    setor = 'REC - Manutenção / Calibração';
  } else if (/Hangar|Oficina|Linha/i.test(text)) {
    setor = 'Hangar Principal / Manutenção';
  } else if (/Suprimentos|Almoxarifado|Estoque/i.test(text)) {
    setor = 'Suprimentos / Recebimento Técnico';
  } else if (/Engenharia|Confiabilidade/i.test(text)) {
    setor = 'Engenharia e Confiabilidade';
  } else if (/Qualidade|SGQ|Auditoria/i.test(text)) {
    setor = 'Garantia da Qualidade / SGQ';
  } else {
    const setorMatch = text.match(/Setor\s*(?:\/\s*Base)?\s*:\s*([^\n\r,]+)/i);
    if (setorMatch) setor = setorMatch[1].trim();
  }

  // 8. Extract Category
  let categoria = '';
  if (/Calibra|Metrolog|Instrumento|Torqu/i.test(text)) {
    categoria = 'Calibração e Metrologia';
  } else if (/Doc|Manual|Procedimento|MOMQ|Registro|Formul[áa]rio/i.test(text)) {
    categoria = 'Documentação e Registros';
  } else if (/Ferramenta|Equipamento|GSE/i.test(text)) {
    categoria = 'Ferramental e Equipamentos';
  } else if (/Treinamento|Qualifica[çc][ãa]o|Licen[çc]a/i.test(text)) {
    categoria = 'Treinamento e Capacitação';
  } else if (/Pe[çc]a|Material|Lote|Rastreabilidade/i.test(text)) {
    categoria = 'Materiais e Rastreabilidade';
  } else {
    const catMatch = text.match(/Categoria\s*:\s*([^\n\r,]+)/i);
    if (catMatch) categoria = catMatch[1].trim();
  }

  // 9. Extract Risk Code (e.g. 2C, 3B, 1A)
  let riskCode = '';
  const riskMatch = text.match(/Avalia[çc][ãa]o\s*de\s*Risco[^\n\r]*[:\s]*([1-5][A-E])/i);
  if (riskMatch) {
    riskCode = riskMatch[1].toUpperCase();
  } else {
    const rawRiskMatch = text.match(/\b([1-5][A-E])\b/i);
    if (rawRiskMatch) riskCode = rawRiskMatch[1].toUpperCase();
  }

  const sev = (riskCode ? riskCode[0] : '2') as SeveridadeRisco;
  const prob = (riskCode ? riskCode[1] : 'C') as ProbabilidadeRisco;
  let nivel: NivelRisco = 'Médio';
  if (['1A', '1B', '2A'].includes(riskCode)) nivel = 'Crítico';
  else if (['1C', '2B', '3A', '1D', '2C'].includes(riskCode)) nivel = 'Alto';
  else if (['3B', '3C', '4A', '4B'].includes(riskCode)) nivel = 'Médio';
  else if (riskCode) nivel = 'Baixo';

  // 10. Extract Response Deadline
  let prazoResposta = '';
  const prazoMatch = text.match(/Prazo\s*(?:de\s*Resposta)?[:\s]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (prazoMatch) {
    prazoResposta = convertToISO(prazoMatch[1]);
  }

  // 11. Extract Section 1 Date & Auditor
  let dataIdentificacao = '';
  let auditor = '';
  const auditorSectionMatch = text.match(/(?:Data\s*:\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2}))?[\s,;]*Auditor\s*:\s*([^\n\r]+)?/i);
  if (auditorSectionMatch) {
    if (auditorSectionMatch[1]) dataIdentificacao = convertToISO(auditorSectionMatch[1]);
    if (auditorSectionMatch[2]) auditor = auditorSectionMatch[2].replace(/Assinatura.*$/i, '').trim();
  }
  if (!auditor) {
    const audMatch = text.match(/Auditor(?:\s*Identificador)?\s*:\s*([^\n\r,]+)/i);
    if (audMatch) auditor = audMatch[1].trim();
  }

  // 12. Extract Section 2: Pré-Análise da Causa e Ação de Contenção Integral
  let contencaoDesc = '';
  let contencaoResp = '';
  let contencaoDataLimite = '';
  let contencaoDataConclusao = '';
  let contencaoObs = '';
  let contencaoStatus: 'Pendente' | 'Em Andamento' | 'Concluída' = 'Pendente';

  const contencaoBlockMatch = text.match(/(?:2\.\s*PR[ÉE]-AN[ÁA]LISE\s*(?:DA\s*CAUSA\s*)?(?:E\s*)?(?:A[ÇC][ÃA]O\s*DE\s*)?CONTEN[ÇC][ÃA]O|PR[ÉE]-AN[ÁA]LISE\s*(?:DA\s*CAUSA)?|A[çc][ãa]o\s*de\s*Conten[çc][ãa]o|A[çc][ãa]o\s*Imediata)[\s\:\-]+([\s\S]*?)(?:3\.\s*AN[ÁA]LISE|3\.\s*INVESTIGA|4\.\s*A[ÇC][ÃA]O\s*CORRETIVA|AN[ÁA]LISE\s*DA\s*CAUSA|$)/i);
  if (contencaoBlockMatch && contencaoBlockMatch[1].trim()) {
    const rawContencao = contencaoBlockMatch[1].trim();
    
    // Extrai metadados estruturados
    const respMatch = rawContencao.match(/Respons[áa]vel\s*:\s*([^\n\r,]+)/i);
    if (respMatch) contencaoResp = respMatch[1].trim();

    const dataLimMatch = rawContencao.match(/Data\s*Limite\s*:\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dataLimMatch) contencaoDataLimite = convertToISO(dataLimMatch[1]);

    const dataConcMatch = rawContencao.match(/Data\s*Conclus[ãa]o\s*:\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dataConcMatch) {
      contencaoDataConclusao = convertToISO(dataConcMatch[1]);
      contencaoStatus = 'Concluída';
    }

    // Limpa apenas linhas exclusivas de metadados sem remover o conteúdo da pré-análise e contenção
    const cleanedText = rawContencao
      .replace(/(?:^|\n)\s*(?:Respons[áa]vel|Data\s*Limite|Data\s*Conclus[ãa]o|Assinatura)\s*:\s*[^\n\r]+/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    contencaoDesc = cleanedText || rawContencao;
  }

  // 13. Extract Section 3: Análise Causa Raiz & 5 Porquês & Ishikawa
  let causaRaizDesc = '';
  const cincoPorques: string[] = [];
  const ishikawa = {
    metodo: '',
    maquina: '',
    maoDeObra: '',
    material: '',
    medicao: '',
    meioAmbiente: '',
  };

  const causaBlockMatch = text.match(/(?:3\.\s*AN[ÁA]LISE\s*DA\s*CAUSA\s*RAIZ|Causa\s*Raiz)[\s\:\-]+([\s\S]*?)(?:4\.\s*A[ÇC][ÃA]O|6\.\s*VERIFICA[ÇC][ÃA]O|$)/i);
  if (causaBlockMatch && causaBlockMatch[1].trim()) {
    const rawCausa = causaBlockMatch[1].trim();
    causaRaizDesc = rawCausa
      .replace(/(?:Respons[áa]vel|Data\s*Limite|Data\s*Conclus[ãa]o|Assinatura)\s*:\s*[^\n\r]+/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim() || rawCausa;

    // Look for 5 Porquês in text
    const porquesMatches = rawCausa.match(/(?:\d+[\.\)]\s*(?:Por\s*que|Porque)[^\n\r]+)/gi);
    if (porquesMatches && porquesMatches.length > 0) {
      porquesMatches.forEach(pq => cincoPorques.push(pq.trim()));
    }

    // Look for 6M in text
    const metodoM = rawCausa.match(/M[ée]todo\s*:\s*([^\n\r]+)/i);
    if (metodoM) ishikawa.metodo = metodoM[1].trim();
    const maquinaM = rawCausa.match(/M[áa]quina\s*:\s*([^\n\r]+)/i);
    if (maquinaM) ishikawa.maquina = maquinaM[1].trim();
    const maoM = rawCausa.match(/M[ãa]o\s*de\s*Obra\s*:\s*([^\n\r]+)/i);
    if (maoM) ishikawa.maoDeObra = maoM[1].trim();
    const materialM = rawCausa.match(/Material\s*:\s*([^\n\r]+)/i);
    if (materialM) ishikawa.material = materialM[1].trim();
    const medicaoM = rawCausa.match(/Medi[çc][ãa]o\s*:\s*([^\n\r]+)/i);
    if (medicaoM) ishikawa.medicao = medicaoM[1].trim();
    const meioM = rawCausa.match(/Meio\s*Ambiente\s*:\s*([^\n\r]+)/i);
    if (meioM) ishikawa.meioAmbiente = meioM[1].trim();
  }

  // 14. Extract Section 4: Ação Corretiva
  let acaoDesc = '';
  let acaoComo = '';
  let acaoResp = '';
  let acaoData = '';
  let acaoAssinatura = '';
  let acaoStatus: 'Não Iniciada' | 'Em Andamento' | 'Concluída' | 'Cancelada' = 'Não Iniciada';

  const acaoBlockMatch = text.match(/(?:4\.\s*A[ÇC][ÃA]O\s*CORRETIVA|Plano\s*de\s*A[çc][ãa]o)[\s\:\-]+([\s\S]*?)(?:6\.\s*VERIFICA[ÇC][ÃA]O|$)/i);
  if (acaoBlockMatch && acaoBlockMatch[1].trim()) {
    const rawAcao = acaoBlockMatch[1].trim();
    acaoDesc = rawAcao
      .replace(/(?:Respons[áa]vel|Data|Prazo|Assinatura)\s*:\s*[^\n\r]+/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim() || rawAcao;

    const respMatch = rawAcao.match(/Respons[áa]vel\s*:\s*([^\n\r,;]+)/i);
    if (respMatch) acaoResp = respMatch[1].trim();

    const dataPrazoMatch = rawAcao.match(/(?:Data|Prazo)\s*:\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dataPrazoMatch) acaoData = convertToISO(dataPrazoMatch[1]);

    const assinMatch = rawAcao.match(/Assinatura(?:\s*do\s*Respons[áa]vel)?\s*:\s*([^\n\r]+)/i);
    if (assinMatch) acaoAssinatura = assinMatch[1].trim();

    const comoMatch = rawAcao.match(/(?:Como\s*ser[áa]\s*feito|Metodologia\s*de\s*execu[çc][ãa]o)\s*:\s*([^\n\r]+)/i);
    if (comoMatch) acaoComo = comoMatch[1].trim();

    if (rawAcao.length > 30) acaoStatus = 'Em Andamento';
  }

  // Fallback for general responsible person if not matched inside block
  if (!acaoResp) {
    const genRespMatch = text.match(/Respons[áa]vel(?:\s*pela\s*Tratativa|\s*Geral)?\s*:\s*([^\n\r,;]+)/i);
    if (genRespMatch) acaoResp = genRespMatch[1].trim();
  }

  // 15. Extract Section 6: Verificação da Eficácia
  let metodoEficacia: MetodoVerificacaoEficacia = 'Documental';
  if (/\(\s*[xXvV\*\u2713\u25A0]\s*\)\s*Visual/i.test(text)) metodoEficacia = 'Visual';
  else if (/\(\s*[xXvV\*\u2713\u25A0]\s*\)\s*Entrevista/i.test(text)) metodoEficacia = 'Entrevista';
  else if (/\(\s*[xXvV\*\u2713\u25A0]\s*\)\s*Outro/i.test(text)) metodoEficacia = 'Outro';

  let outroDetalhe = '';
  const outroMatch = text.match(/Outro\s*[_\s]*([A-Za-zÀ-ÖØ-öø-ÿ0-9\s]+)/i);
  if (outroMatch && outroMatch[1].trim() && !outroMatch[1].includes('Avaliação')) {
    outroDetalhe = outroMatch[1].trim();
  }

  let riskResidual = '';
  const residualMatch = text.match(/Avalia[çc][ãa]o\s*de\s*Risco\s*ap[óo]s[^\n\r]*[:\s]*([1-5][A-E])/i);
  if (residualMatch) riskResidual = residualMatch[1].toUpperCase();

  let encerradoStatus: 'SIM' | 'NÃO' | 'Pendente' = 'Pendente';
  if (/(?:\[\s*[xXvV\*\u2713\u25A0]\s*\]|■)\s*SIM/i.test(text) || /Encerrado\s*:\s*SIM/i.test(text)) {
    encerradoStatus = 'SIM';
  } else if (/(?:\[\s*[xXvV\*\u2713\u25A0]\s*\]|■)\s*N[ÃA]O/i.test(text) || /Encerrado\s*:\s*N[ÃA]O/i.test(text)) {
    encerradoStatus = 'NÃO';
  }

  let motivo = '';
  const motivoMatch = text.match(/Motivo\s*:\s*([^\n\r]+)/i);
  if (motivoMatch && motivoMatch[1].trim() && !motivoMatch[1].toLowerCase().includes('data:')) {
    motivo = motivoMatch[1].trim();
  }

  let auditorVerificador = '';
  const verAuditorMatch = text.match(/Auditor(?:\s*Verificador)?\s*:\s*([^\n\r,]+)/i);
  if (verAuditorMatch && verAuditorMatch[1].trim() !== auditor) {
    auditorVerificador = verAuditorMatch[1].trim();
  } else if (auditor) {
    auditorVerificador = auditor;
  }

  let dataVerificacao = '';
  const dataVerMatch = text.match(/Data\s*da\s*Verifica[çc][ãa]o\s*:\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dataVerMatch) dataVerificacao = convertToISO(dataVerMatch[1]);

  const responsavelGeral = acaoResp || contencaoResp || '';

  return {
    codigoFormulario,
    revisao,
    dataEmissaoFormulario,
    numeroNC,
    titulo,
    tipoAcao,
    descricaoNC,
    normaReferencia,
    setor,
    categoria,
    responsavel: responsavelGeral,
    avaliacaoRiscoInicial: {
      codigo: riskCode || '2C',
      severidade: sev,
      probabilidade: prob,
      nivel,
    },
    prazoResposta,
    dataIdentificacao,
    auditor,
    preAnaliseContencao: {
      descricao: contencaoDesc,
      responsavel: contencaoResp || responsavelGeral,
      dataLimite: contencaoDataLimite,
      dataConclusao: contencaoDataConclusao,
      status: contencaoStatus,
      observacoes: contencaoObs,
    },
    analiseCausaRaiz: {
      metodologia: cincoPorques.length > 0 ? '5 Porquês' : '5 Porquês',
      cincoPorques,
      ishikawa,
      detalhes: causaRaizDesc,
    },
    acaoCorretiva: {
      descricao: acaoDesc,
      comoSeraFeito: acaoComo,
      responsavel: acaoResp || responsavelGeral,
      dataPrazo: acaoData,
      status: acaoStatus,
      assinaturaResponsavel: acaoAssinatura,
    },
    verificacaoEficacia: {
      metodo: metodoEficacia,
      outroMetodoDetalhe: outroDetalhe,
      avaliacaoRiscoResidual: {
        codigo: riskResidual || '4E',
        severidade: riskResidual ? (riskResidual[0] as any) : '4',
        probabilidade: riskResidual ? (riskResidual[1] as any) : 'E',
        nivel: 'Baixo',
      },
      encerrado: encerradoStatus,
      motivo,
      dataVerificacao,
      auditorVerificador,
    },
    statusGeral: encerradoStatus === 'SIM' ? 'Encerrada' : 'Aberta',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    historicoPrazos: [],
    documentoOrigemNome: fileName || 'documento_importado.pdf',
  };
}

function convertToISO(dStr?: string): string {
  if (!dStr) return '';
  const clean = dStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const match = clean.match(/^(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return clean;
}

/**
 * Robust local compliance and pertinência audit engine.
 * Correlates NC description, sector, and standard reference with all available manuals.
 */
export function auditNCComplianceLocally(nc: NCRecord, manuals: ManualRecord[]): AuditoriaPertinenciaResultado {
  const descLower = (nc.descricaoNC || '').toLowerCase();
  const titleLower = (nc.titulo || '').toLowerCase();
  const combinedText = `${descLower} ${titleLower}`;

  // Find best matching manual
  let bestManual: ManualRecord | undefined = undefined;
  if (nc.normaReferencia) {
    const normClean = nc.normaReferencia.toUpperCase();
    bestManual = manuals.find((m) => normClean.includes(m.codigo.toUpperCase()) || m.titulo.toUpperCase().includes(normClean));
  }

  if (!bestManual && manuals.length > 0) {
    if (combinedText.includes('ferramenta') || combinedText.includes('calibra') || combinedText.includes('aferição')) {
      bestManual = manuals.find((m) => m.codigo.includes('MOMQ') || m.titulo.toLowerCase().includes('manutenção') || m.titulo.toLowerCase().includes('qualidade'));
    } else if (combinedText.includes('treinamento') || combinedText.includes('qualifica') || combinedText.includes('certifica')) {
      bestManual = manuals.find((m) => m.codigo.includes('MTO') || m.titulo.toLowerCase().includes('treinamento'));
    } else if (combinedText.includes('inspeção') || combinedText.includes('recebimento') || combinedText.includes('peça')) {
      bestManual = manuals.find((m) => m.codigo.includes('SGQ') || m.titulo.toLowerCase().includes('recebimento'));
    }
  }

  // If no manual matched by code/reference, do not force an unrelated manual
  if (!bestManual && manuals.length > 0) {
    const descLower = combinedText.toLowerCase();
    bestManual = manuals.find(
      (m) =>
        descLower.includes((m.codigo || '').toLowerCase()) ||
        descLower.includes((m.titulo || '').toLowerCase())
    );
  }

  const dataOcorrencia = nc.dataIdentificacao || nc.dataEmissaoFormulario || new Date().toISOString().split('T')[0];
  const versaoInfo = obterVersaoNormativaAplicavel(bestManual, dataOcorrencia);

  const manualCodigo = bestManual?.codigo || nc.normaReferencia || 'Não identificado';
  const revisaoVigente = versaoInfo.revisaoAtualVigente || bestManual?.revisao || 'Não cadastrada';
  const revisaoAplicavel = versaoInfo.revisaoAplicavelNaData || revisaoVigente;

  // Check matching chapter in actual registered manual
  let matchedChapter: ManualCapitulo | undefined = undefined;
  if (bestManual?.capitulos && bestManual.capitulos.length > 0) {
    const found = bestManual.capitulos.find((c) => {
      const cTitle = (c.titulo || '').toLowerCase();
      const cReq = (c.requisitoTexto || '').toLowerCase();
      return combinedText.split(' ').some((word) => word.length > 4 && (cTitle.includes(word) || cReq.includes(word)));
    });
    if (found) {
      matchedChapter = found;
    }
  }

  const capNumero = matchedChapter?.numero || '';
  const capTitulo = matchedChapter?.titulo || 'Requisito não localizado na base documental';
  const trechoRequisito = matchedChapter?.requisitoTexto || 'Requisito não localizado na base documental.';
  const localizado = Boolean(matchedChapter && bestManual);

  return {
    ncId: nc.id || `nc-${Date.now()}`,
    veredicto: localizado ? 'Procedente' : 'Inconclusivo',
    nivelSuporteDocumental: localizado ? 'Evidência moderada' : 'Evidência insuficiente',
    justificativaNivelSuporte: localizado 
      ? `Requisito localizado no acervo cadastrado: ${manualCodigo} - Item ${capNumero}`
      : 'Documento normativo ou requisito não localizado no acervo cadastrado. Requer validação documental humana.',
    origemMotor: 'MOTOR DETERMINÍSTICO',
    resumoVeredito: localizado 
      ? `A não conformidade #${nc.numeroNC || 'Registrada'} foi analisada perante o manual ${manualCodigo} (Revisão: ${revisaoAplicavel}).`
      : `Não foi possível localizar o documento normativo ou versão aplicável para a NC #${nc.numeroNC || 'Registrada'} no acervo. Vigência e enquadramento requerem validação humana.`,
    validacaoRevisao: {
      manualCitado: nc.normaReferencia || manualCodigo,
      revisaoCitada: nc.revisao || 'Não informada',
      revisaoVigenteCadastrada: revisaoVigente,
      revisaoAplicavelNaData: revisaoAplicavel,
      dataReferenciaUtilizada: dataOcorrencia,
      statusRevisao: versaoInfo.statusVigenciaNaData,
      observacaoRevisao: versaoInfo.observacaoTemporal,
      fonteVerificacao: versaoInfo.fonteVersao,
    },
    enquadramentoRecomendado: {
      manualCorreto: manualCodigo,
      capituloItemCorreto: capNumero,
      tituloRequisito: capTitulo,
      trechoNormativoRelevante: trechoRequisito,
      localizadoNaBase: localizado,
    },
    trilhaAuditoriaConformidade: [
      {
        requisitoNormativo: `${manualCodigo}${capNumero ? ` - Item ${capNumero}: ${capTitulo}` : ''}`,
        fonteDocumental: `${manualCodigo} (${revisaoAplicavel})`,
        trechoReferencia: trechoRequisito,
        evidenciaEncontrada: nc.descricaoNC || 'Desvio relatado na não conformidade',
        avaliacaoTecnica: localizado 
          ? `O procedimento do manual ${manualCodigo} (${revisaoAplicavel}) exige conformidade e controle operacional.`
          : 'Documento não localizado na base. Requer validação humana.',
        lacunaIdentificada: 'Ausência de evidência de conformidade na rotina operacional.',
        conclusao: localizado ? 'Não conformidade analisada perante os requisitos cadastrados.' : 'Requer verificação documental.',
        localizadoNaBase: localizado,
      }
    ],
    analiseCritica: localizado
      ? `O procedimento operacional descrito no manual ${manualCodigo} (${revisaoAplicavel}) estabelece diretrizes para a qualidade e segurança. O evento descrito ("${nc.descricaoNC || 'Desvio identificado'}") deve ser investigado quanto à sua causa e mitigação.`
      : `A Não Conformidade cita documento normativo não catalogado no acervo ou sem vigência determinada na data da ocorrência. Requer complementação documental pelo gestor da qualidade.`,
    justificativaTecnica: localizado
      ? `Conforme estabelecido no ${manualCodigo}, todo desvio operacional deve ter sua contenção avaliada e causa investigada por meio de ferramentas estruturadas.`
      : 'Avaliação técnica pendente de localização de evidência documental oficial.',
    evidenciasExigidas: [
      'Registro fotográfico ou comprovante de identificação do item/processo não conforme',
      'Ordem de serviço, checklist ou formulário preenchido da atividade',
      'Registro de segregação ou bloqueio emitido pela chefia imediata',
      'Certificados de calibração ou qualificação do executante técnico',
    ],
    ajustesSugeridos: {
      tituloSugerido: nc.titulo && !nc.titulo.includes('Registro de') ? nc.titulo : `Desvio Operacional e Documental - ${nc.setor || 'SGQ'}`,
      normaReferenciaSugerida: `${manualCodigo} - Item ${capNumero}`,
      tipoAcaoSugerido: nc.tipoAcao || 'Corretiva',
      riscoSugerido: nc.avaliacaoRiscoInicial,
      acaoContencaoSugerida: `Segregar imediatamente ferramentas e itens impactados no setor ${nc.setor || 'operacional'}.`,
      planoAcaoSugerido: `Revisar procedimentos e instruir a equipe técnica conforme as exigências do ${manualCodigo} (${revisaoAplicavel}).`,
    },
    manuaisConsultados: manuals.map((m) => `${m.codigo} (${m.revisao})`),
    dataAnalise: new Date().toISOString(),
  };
}

/**
 * Local heuristic parser for newly uploaded manual documents.
 */
export function parseManualLocally(fileName: string, textContent?: string): Partial<ManualRecord> {
  const cleanName = (fileName || 'MANUAL').replace(/\.[^/.]+$/, '').trim();
  let text = (textContent || '').trim();

  // If text is brief or empty (e.g. uploaded binary PDF or scanned doc), synthesize informative baseline text
  if (!text || text.length < 50) {
    text = `Documento normativo do SGQ: ${cleanName}.\nEste manual foi indexado no acervo da qualidade a partir do arquivo ${fileName}.\nConsulte o arquivo anexo para verificação integral do conteúdo técnico e requisitos mandatórios.`;
  }

  // Extract Code
  let codigo = '';
  const codeMatch = text.match(/(?:Código|Manual|Doc\.?|Procedimento)[:\s]*([A-Z0-9\-_]{3,15})/i) || fileName.match(/^([A-Z0-9\-_]{3,12})/i);
  if (codeMatch) {
    codigo = codeMatch[1].toUpperCase();
  } else if (cleanName.toUpperCase().includes('MOMQ')) {
    codigo = 'MOMQ';
  } else if (cleanName.toUpperCase().includes('MTO')) {
    codigo = 'MTO';
  } else if (cleanName.toUpperCase().includes('MME')) {
    codigo = 'MME';
  } else if (cleanName.toUpperCase().includes('MOE')) {
    codigo = 'MOE';
  } else if (cleanName.toUpperCase().includes('SGSO')) {
    codigo = 'SGSO';
  } else if (cleanName.toUpperCase().includes('RBAC')) {
    codigo = 'RBAC-145';
  } else if (cleanName.toUpperCase().includes('SGQ')) {
    codigo = 'SGQ-01';
  } else {
    codigo = cleanName.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 12).toUpperCase() || 'SGQ-DOC';
  }

  // Extract Revision
  let revisao = 'Rev. 01';
  const revMatch = text.match(/(?:Revis[ãa]o|Rev\.?|R)[:\s]*(\d{1,2}|[A-Z])/i) || fileName.match(/(?:rev|r)[_\-\s]*(\d{1,2})/i);
  if (revMatch) {
    revisao = `Rev. ${revMatch[1].padStart(2, '0')}`;
  }

  // Extract Date
  let dataVigencia = '';
  const dateMatch = text.match(/(?:Vig[êe]ncia|Data|Emiss[ãa]o)[:\s]*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    dataVigencia = convertToISO(dateMatch[1]);
  } else {
    dataVigencia = new Date().toISOString().split('T')[0];
  }

  // Extract Title
  let titulo = cleanName.replace(/[_\-]/g, ' ').trim();
  const titleMatch = text.match(/(?:Título|Manual de|Procedimento de)[:\s]*([^\n\r]{5,80})/i);
  if (titleMatch && titleMatch[1].trim()) {
    titulo = titleMatch[1].trim();
  }

  // Extract Chapters directly from real text headings and subsequent content
  const capitulos: Array<{ id: string; numero: string; titulo: string; requisitoTexto: string }> = [];
  const capRegex = /(?:(?:Cap[íi]tulo|Item|Se[çc][ãa]o)\s*([\d\.]+)|(\b\d+\.\d+(?:\.\d+)?))\s*[:\.\-]?\s*([^\n\r]+)/gi;
  let match;
  let idx = 1;
  const sections: { index: number; numero: string; titulo: string }[] = [];

  while ((match = capRegex.exec(text)) !== null && idx <= 15) {
    const rawNum = match[1] || match[2] || `${idx}.0`;
    const rawHeading = (match[3] || '').trim();
    if (rawHeading.length > 2 && rawHeading.length < 100) {
      sections.push({
        index: match.index,
        numero: rawNum,
        titulo: rawHeading,
      });
      idx++;
    }
  }

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    const next = sections[i + 1];
    const startPos = current.index;
    const endPos = next ? next.index : Math.min(startPos + 2000, text.length);
    const sectionBody = text.substring(startPos, endPos).trim();
    const lines = sectionBody.split('\n').slice(1).join('\n').trim();

    capitulos.push({
      id: `cap_auto_${i + 1}_${Date.now()}`,
      numero: current.numero,
      titulo: current.titulo,
      requisitoTexto: lines.length > 10 ? lines.substring(0, 1500) : sectionBody.substring(0, 1500),
    });
  }

  // Se nenhum capítulo foi identificado nas seções do documento, sintetizar capítulos normativos mínimos
  if (capitulos.length === 0) {
    capitulos.push(
      {
        id: `cap_auto_1_${Date.now()}`,
        numero: '1.0',
        titulo: 'Objetivo, Escopo e Aplicação',
        requisitoTexto: `Estabelecer as diretrizes normativas e escopo operacional aplicáveis conforme especificado no documento ${codigo} (${titulo}).`,
      },
      {
        id: `cap_auto_2_${Date.now()}`,
        numero: '2.0',
        titulo: 'Requisitos Técnicos e Operacionais',
        requisitoTexto: text.length > 60 ? text.substring(0, 2000) : 'Cumprimento estrito dos procedimentos operacionais, segurança da aviação e padrões de qualidade SGQ.',
      },
      {
        id: `cap_auto_3_${Date.now()}`,
        numero: '3.0',
        titulo: 'Responsabilidades e Registros SGQ',
        requisitoTexto: 'Garantir a preservação e integridade dos registros técnicos, rastreabilidade documental e comunicação formal de desvios.',
      }
    );
  }

  return {
    codigo,
    titulo,
    revisao,
    dataVigencia: dataVigencia || undefined,
    orgaoRegulador: 'SGQ Interno',
    setoresAplicaveis: ['Qualidade / SGQ', 'Manutenção'],
    descricaoResumo: `Documento ${codigo} (${revisao}) indexado no SGQ a partir de ${fileName}.`,
    conteudoTexto: text.substring(0, 15000),
    arquivoTextoCompleto: text,
    capitulos,
    status: 'Vigente',
  };
}
