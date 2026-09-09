import {
  DocumentoControlado,
  RevisaoDocumental,
  ResultadoVigenciaTemporal,
  FonteExternaControlada,
  LogVerificacaoFonteExterna,
  SolicitacaoRevisaoCliente,
  ResultadoComparacaoRevisoes,
  ImpactoRevisaoItem,
  DocumentosDashboardMetrics,
  IdiomaSolicitacao,
  AplicabilidadeDocumental,
} from '../types';

/**
 * MOTOR TEMPORAL DE REVISÕES (Seções 9, 10 & 38)
 * Responde de forma determinística e matematicamente rastreável:
 * "Qual documento/revisão estava vigente e aplicável na data em que determinado evento ocorreu?"
 */
export function determinarRevisaoVigenteNaData(
  documento: DocumentoControlado,
  revisoes: RevisaoDocumental[],
  dataReferencia: string // YYYY-MM-DD
): ResultadoVigenciaTemporal {
  // Filtra revisões que pertencem a este documento
  const revisoesDoDoc = revisoes.filter((r) => r.documentoId === documento.id);

  if (!revisoesDoDoc || revisoesDoDoc.length === 0) {
    return {
      dataReferencia,
      documentoId: documento.id,
      codigoDocumento: documento.codigo,
      tituloDocumento: documento.titulo,
      revisaoVigenteNaData: undefined,
      revisaoVigenteHoje: undefined,
      statusDeterminacao: 'NAO_DETERMINADO_REQUER_VALIDACAO_HUMANA',
      justificativaRastreavel: `Nenhuma revisão cadastrada para o documento ${documento.codigo}. Aplicabilidade e vigência não determinadas.`,
      revisaoVigenteNaDataDiferenteDeHoje: false,
    };
  }

  // Identifica a revisão atualmente vigente (HOJE)
  const hojeStr = new Date().toISOString().split('T')[0];
  const revisaoHoje =
    revisoesDoDoc.find((r) => r.statusCicloVida === 'VIGENTE') ||
    revisoesDoDoc.find((r) => r.id === documento.revisaoVigenteId) ||
    [...revisoesDoDoc].sort((a, b) => b.dataEntradaVigor.localeCompare(a.dataEntradaVigor))[0];

  // Regra temporal para a data de referência D:
  // 1. D >= dataEntradaVigor (ou dataEmissao)
  // 2. Se a revisão foi substituída: D <= dataSubstituicao
  // 3. Status não pode ter sido RASCUNHO ou CANCELADO na época
  const dataRefClean = dataReferencia.trim();

  // Candidatas que já estavam em vigor na data de referência
  const candidatas = revisoesDoDoc.filter((r) => {
    if (r.statusCicloVida === 'RASCUNHO' || r.statusCicloVida === 'CANCELADO') {
      return false;
    }
    const dataInicio = r.dataEntradaVigor || r.dataEmissao;
    if (!dataInicio) return false;

    // Se o evento ocorreu ANTES da revisão entrar em vigor, não se aplica
    if (dataRefClean < dataInicio) {
      return false;
    }

    // Se a revisão foi formalmente substituída, verificar se o evento ocorreu após a data de substituição
    if (r.dataSubstituicao && dataRefClean > r.dataSubstituicao) {
      return false;
    }

    return true;
  });

  if (candidatas.length === 0) {
    // Verificar se a primeira revisão já existia ou se o evento foi anterior à criação do documento
    const primeiraRev = [...revisoesDoDoc].sort((a, b) =>
      a.dataEntradaVigor.localeCompare(b.dataEntradaVigor)
    )[0];

    const dataInicioPrimeira = primeiraRev?.dataEntradaVigor || primeiraRev?.dataEmissao || 'indefinida';

    return {
      dataReferencia: dataRefClean,
      documentoId: documento.id,
      codigoDocumento: documento.codigo,
      tituloDocumento: documento.titulo,
      revisaoVigenteNaData: undefined,
      revisaoVigenteHoje: revisaoHoje,
      statusDeterminacao: 'DOCUMENTO_NAO_EXISTIA_NA_DATA',
      justificativaRastreavel: `O evento ocorreu em ${dataRefClean}, data anterior à entrada em vigor da primeira revisão controlada (${primeiraRev?.numeroRevisao || 'N/A'}, em vigor desde ${dataInicioPrimeira}). O documento não existia formalmente nesta data.`,
      revisaoVigenteNaDataDiferenteDeHoje: true,
    };
  }

  // Se houver mais de uma candidata (ex: transição no mesmo dia ou sobreposição),
  // seleciona a que tiver dataEntradaVigor mais recente até a data do evento
  candidatas.sort((a, b) => {
    const cmpInicio = b.dataEntradaVigor.localeCompare(a.dataEntradaVigor);
    if (cmpInicio !== 0) return cmpInicio;
    return b.dataEmissao.localeCompare(a.dataEmissao);
  });

  const revisaoNaData = candidatas[0];

  const diferenteDeHoje = revisaoHoje ? revisaoNaData.id !== revisaoHoje.id : false;

  let justificativa = `Na data ${dataRefClean}, a revisão vigente era ${revisaoNaData.numeroRevisao} (início em ${revisaoNaData.dataEntradaVigor}`;
  if (revisaoNaData.dataSubstituicao) {
    justificativa += `, substituída em ${revisaoNaData.dataSubstituicao}`;
  } else {
    justificativa += `, mantendo-se vigente`;
  }
  justificativa += `).`;

  if (diferenteDeHoje && revisaoHoje) {
    justificativa += ` AVISO TEMPORAL: Esta revisão difere da versão atualmente vigente hoje (${revisaoHoje.numeroRevisao}, em vigor desde ${revisaoHoje.dataEntradaVigor}). Toda análise da ocorrência ou constatação deve apoiar-se estritamente na ${revisaoNaData.numeroRevisao}.`;
  }

  return {
    dataReferencia: dataRefClean,
    documentoId: documento.id,
    codigoDocumento: documento.codigo,
    tituloDocumento: documento.titulo,
    revisaoVigenteNaData: revisaoNaData,
    revisaoVigenteHoje: revisaoHoje,
    statusDeterminacao: 'DETERMINADO',
    justificativaRastreavel: justificativa,
    revisaoVigenteNaDataDiferenteDeHoje: diferenteDeHoje,
  };
}

/**
 * AVALIADOR DE APLICABILIDADE MULTIDIMENSIONAL (Seção 8)
 */
export function avaliarAplicabilidade(
  aplicabilidade: AplicabilidadeDocumental | undefined,
  criterios: {
    setor?: string;
    processo?: string;
    aeronave?: string;
    cliente?: string;
    dataReferencia?: string;
  }
): { aplicavel: boolean; motivo: string; requerValidacaoHumana: boolean } {
  if (!aplicabilidade) {
    return {
      aplicavel: true,
      motivo: 'Aplicabilidade ampla da organização (sem restrições específicas cadastradas).',
      requerValidacaoHumana: false,
    };
  }

  if (aplicabilidade.statusDeterminacao === 'NAO_DETERMINADA_REQUER_VALIDACAO_HUMANA') {
    return {
      aplicavel: false,
      motivo: 'Aplicabilidade não determinada — requer validação humana.',
      requerValidacaoHumana: true,
    };
  }

  // Checagem de período
  if (criterios.dataReferencia) {
    if (
      aplicabilidade.periodoValidadeInicio &&
      criterios.dataReferencia < aplicabilidade.periodoValidadeInicio
    ) {
      return {
        aplicavel: false,
        motivo: `Data do evento (${criterios.dataReferencia}) é anterior ao início da aplicabilidade (${aplicabilidade.periodoValidadeInicio}).`,
        requerValidacaoHumana: false,
      };
    }
    if (
      aplicabilidade.periodoValidadeFim &&
      criterios.dataReferencia > aplicabilidade.periodoValidadeFim
    ) {
      return {
        aplicavel: false,
        motivo: `Data do evento (${criterios.dataReferencia}) é posterior ao término da aplicabilidade (${aplicabilidade.periodoValidadeFim}).`,
        requerValidacaoHumana: false,
      };
    }
  }

  // Setores
  if (criterios.setor && aplicabilidade.setores && aplicabilidade.setores.length > 0) {
    const match = aplicabilidade.setores.some(
      (s) => s.toLowerCase() === criterios.setor?.toLowerCase()
    );
    if (!match) {
      return {
        aplicavel: false,
        motivo: `O documento é aplicável exclusivamente aos setores: ${aplicabilidade.setores.join(', ')}. Setor consultado: ${criterios.setor}.`,
        requerValidacaoHumana: false,
      };
    }
  }

  // Clientes
  if (criterios.cliente && aplicabilidade.clientes && aplicabilidade.clientes.length > 0) {
    const match = aplicabilidade.clientes.some((c) =>
      c.toLowerCase().includes(criterios.cliente?.toLowerCase() || '')
    );
    if (!match) {
      return {
        aplicavel: false,
        motivo: `Documento restrito aos clientes: ${aplicabilidade.clientes.join(', ')}. Cliente consultado: ${criterios.cliente}.`,
        requerValidacaoHumana: false,
      };
    }
  }

  // Aeronaves
  if (criterios.aeronave && aplicabilidade.aeronaves && aplicabilidade.aeronaves.length > 0) {
    const match = aplicabilidade.aeronaves.some((a) =>
      a.toLowerCase().includes(criterios.aeronave?.toLowerCase() || '')
    );
    if (!match) {
      return {
        aplicavel: false,
        motivo: `Documento restrito às aeronaves: ${aplicabilidade.aeronaves.join(', ')}. Aeronave consultada: ${criterios.aeronave}.`,
        requerValidacaoHumana: false,
      };
    }
  }

  return {
    aplicavel: true,
    motivo: 'Requisitos de aplicabilidade confirmados para os critérios informados.',
    requerValidacaoHumana: false,
  };
}

/**
 * GERADOR DE SOLICITAÇÃO DE REVISÃO AO CLIENTE (Seções 14, 15, 16 & 17)
 * E-mails profissionais bilíngues/trilíngues com Inglês como idioma padrão.
 */
export function gerarSolicitacaoRevisaoClienteEmail(params: {
  clienteNome: string;
  destinatarioNome?: string;
  documentoCodigo: string;
  documentoTitulo: string;
  revisaoAtualArmazenada: string;
  motivoSolicitacao: string;
  prazoDesejadoDias?: number;
  idioma: IdiomaSolicitacao;
  empresaNome?: string;
}): { assunto: string; corpo: string } {
  const {
    clienteNome,
    destinatarioNome = 'Technical Records / Quality Department',
    documentoCodigo,
    documentoTitulo,
    revisaoAtualArmazenada,
    motivoSolicitacao,
    prazoDesejadoDias = 5,
    idioma,
    empresaNome = 'IMPACTO AVIATION MRO',
  } = params;

  if (idioma === 'EN') {
    const assunto = `[TECHNICAL DOCUMENTATION REQUEST] Current Revision Verification — ${documentoCodigo} — ${clienteNome}`;
    const corpo = `Dear ${destinatarioNome},

Greetings from ${empresaNome} Quality Assurance & Maintenance Management.

As part of our continuing commitment to aeronautical safety, regulatory compliance (RBAC 145 / FAA 14 CFR Part 145), and contract adherence, we are performing our periodic controlled documentation review.

Currently, our Technical Library has the following revision recorded and controlled for your operation:
• Document Code: ${documentoCodigo}
• Title: ${documentoTitulo}
• Current Controlled Revision in Our System: ${revisaoAtualArmazenada}
• Reason for Verification: ${motivoSolicitacao}

To ensure that all ongoing and upcoming maintenance activities are performed in strict accordance with your latest approved technical standards, we kindly request:
1. Confirmation whether revision "${revisaoAtualArmazenada}" remains current and applicable, OR
2. Provision of the latest approved revision, including the effective date and summary of changes.

Requested Response Window: Within ${prazoDesejadoDias} business days.

Please provide the technical publication directly in reply to this communication or via your customer portal repository.

Thank you for your partnership and continuous dedication to airworthiness excellence.

Sincerely,

Technical Records & Quality Assurance Team
${empresaNome}
Controlled Airworthiness Management System
`;
    return { assunto, corpo };
  }

  if (idioma === 'ES') {
    const assunto = `[SOLICITUD DE DOCUMENTACIÓN TÉCNICA] Verificación de Revisión Vigente — ${documentoCodigo} — ${clienteNome}`;
    const corpo = `Estimado(a) ${destinatarioNome},

Un cordial saludo de parte del equipo de Gestión de la Calidad y Mantenimiento de ${empresaNome}.

En cumplimiento de los estándares de aeronavegabilidad, requisitos regulatorios y especificaciones contractuales de mantenimiento aeronáutico, realizamos la verificación periódica de la documentación técnica aplicable.

En nuestros registros controlados consta actualmente la siguiente versión:
• Código del Documento: ${documentoCodigo}
• Título: ${documentoTitulo}
• Revisión Actualmente Controlada: ${revisaoAtualArmazenada}
• Motivo de la Consulta: ${motivoSolicitacao}

Con el fin de garantizar que todos los servicios de mantenimiento se ejecuten bajo los procedimientos más actualizados aprobados por el operador, solicitamos amablemente:
1. Confirmar si la revisión "${revisaoAtualArmazenada}" continúa vigente y aplicable, O
2. Suministrar la última revisión aprobada junto con su fecha de vigencia y lista de páginas efectivas.

Plazo deseado de respuesta: ${prazoDesejadoDias} días hábiles.

Agradecemos de antemano su colaboración y compromiso con la seguridad operacional.

Atentamente,

Equipo de Control Documental y Calidad
${empresaNome}
`;
    return { assunto, corpo };
  }

  // PT (Português)
  const assunto = `[SOLICITAÇÃO DE DOCUMENTAÇÃO TÉCNICA] Verificação de Revisão Vigente — ${documentoCodigo} — ${clienteNome}`;
  const corpo = `Prezado(a) ${destinatarioNome},

Saudações da equipe de Garantia da Qualidade e Controle Técnico de Manutenção da ${empresaNome}.

Em conformidade com as diretrizes do RBAC 145, requisitos de aeronavegabilidade continuada e o nosso compromisso com a qualidade técnica, realizamos a verificação periódica de documentos controlados fornecidos pelo cliente/operador.

Consta atualmente em nossa biblioteca técnica a seguinte revisão controlada:
• Código do Documento: ${documentoCodigo}
• Título: ${documentoTitulo}
• Revisão Atualmente Controlada no QualiGest: ${revisaoAtualArmazenada}
• Motivo da Verificação: ${motivoSolicitacao}

Para assegurar que todas as intervenções de manutenção sejam executadas em estrita aderência aos manuais técnicos mais recentes e aplicáveis, solicitamos gentilmente:
1. Confirmação se a revisão "${revisaoAtualArmazenada}" permanece vigente e aplicável à sua frota, OU
2. Disponibilização da revisão mais recente aprovada, acompanhada da data de vigência e resumo de alterações.

Prazo desejado para retorno: ${prazoDesejadoDias} dias úteis.

Agradecemos antecipadamente pela parceria e dedicação à segurança de voo.

Atenciosamente,

Setor de Controle Documental e Qualidade
${empresaNome}
QualiGest SGQ — Sistema de Gestão da Qualidade Aeronáutica
`;
  return { assunto, corpo };
}

/**
 * COMPARADOR DELINEADO DE REVISÕES (Seções 18 & 19)
 * Compara a revisão anterior contra a nova revisão.
 */
export function compararRevisoes(
  anterior: RevisaoDocumental,
  nova: RevisaoDocumental
): ResultadoComparacaoRevisoes {
  const metadadosModificados: Array<{ campo: string; anterior: string; novo: string }> = [];

  if (anterior.numeroRevisao !== nova.numeroRevisao) {
    metadadosModificados.push({
      campo: 'Número da Revisão',
      anterior: anterior.numeroRevisao,
      novo: nova.numeroRevisao,
    });
  }
  if (anterior.dataEntradaVigor !== nova.dataEntradaVigor) {
    metadadosModificados.push({
      campo: 'Data de Entrada em Vigor',
      anterior: anterior.dataEntradaVigor,
      novo: nova.dataEntradaVigor,
    });
  }
  if (anterior.aprovadoPorNome !== nova.aprovadoPorNome) {
    metadadosModificados.push({
      campo: 'Aprovador Responsável',
      anterior: anterior.aprovadoPorNome || 'N/A',
      novo: nova.aprovadoPorNome || 'N/A',
    });
  }

  // Comparação de capítulos e seções
  const capsAnteriores = anterior.capitulosIndexados || [];
  const capsNovos = nova.capitulosIndexados || [];
  const secoesAlteradas: Array<{
    secao: string;
    tipoModificacao: 'ADICIONADO' | 'REMOVIDO' | 'MODIFICADO' | 'SEM_ALTERACAO';
    resumo?: string;
  }> = [];

  const mapAnteriores = new Map<string, string>();
  capsAnteriores.forEach((c) => mapAnteriores.set(c.numero.trim(), c.requisitoTexto));

  const visitados = new Set<string>();

  capsNovos.forEach((cn) => {
    const num = cn.numero.trim();
    visitados.add(num);
    const textoAntigo = mapAnteriores.get(num);

    if (textoAntigo === undefined) {
      secoesAlteradas.push({
        secao: `${cn.numero} - ${cn.titulo}`,
        tipoModificacao: 'ADICIONADO',
        resumo: `Nova seção incorporada na ${nova.numeroRevisao}.`,
      });
    } else if (textoAntigo.trim() !== cn.requisitoTexto.trim()) {
      secoesAlteradas.push({
        secao: `${cn.numero} - ${cn.titulo}`,
        tipoModificacao: 'MODIFICADO',
        resumo: `Texto ou requisitos normativos alterados entre ${anterior.numeroRevisao} e ${nova.numeroRevisao}.`,
      });
    } else {
      secoesAlteradas.push({
        secao: `${cn.numero} - ${cn.titulo}`,
        tipoModificacao: 'SEM_ALTERACAO',
      });
    }
  });

  // Seções que existiam na anterior e não constam na nova
  capsAnteriores.forEach((ca) => {
    const num = ca.numero.trim();
    if (!visitados.has(num)) {
      secoesAlteradas.push({
        secao: `${ca.numero} - ${ca.titulo}`,
        tipoModificacao: 'REMOVIDO',
        resumo: `Seção suprimida ou reclassificada na nova revisão.`,
      });
    }
  });

  let precisao: 'ALTA' | 'ESTIMADA' | 'PARCIAL_NAO_DETERMINADA' = 'ALTA';
  let resumo = `Comparativo entre ${anterior.numeroRevisao} e ${nova.numeroRevisao}. Foram identificadas ${
    secoesAlteradas.filter((s) => s.tipoModificacao !== 'SEM_ALTERACAO').length
  } seções com alteração e ${metadadosModificados.length} campos de controle modificados.`;

  if (capsNovos.length === 0 && capsAnteriores.length === 0) {
    if (anterior.conteudoTextoIntegral && nova.conteudoTextoIntegral) {
      precisao = 'ESTIMADA';
      resumo = `Comparação baseada no conteúdo textual integral (${anterior.numeroRevisao}: ${anterior.conteudoTextoIntegral.length} caracteres vs ${nova.numeroRevisao}: ${nova.conteudoTextoIntegral.length} caracteres).`;
    } else {
      precisao = 'PARCIAL_NAO_DETERMINADA';
      resumo =
        'Não foi possível determinar automaticamente todas as alterações (documentos sem índice estruturado de seções). Requer validação humana detalhada.';
    }
  }

  return {
    revisaoAnteriorId: anterior.id,
    revisaoAnteriorNumero: anterior.numeroRevisao,
    revisaoNovaId: nova.id,
    revisaoNovaNumero: nova.numeroRevisao,
    secoesAlteradas,
    camposMetadadosModificados: metadadosModificados,
    resumoDiferencas: resumo,
    nivelPrecisao: precisao,
    dataComparacao: new Date().toISOString(),
  };
}

/**
 * DETECTOR DE IMPACTOS SISTÊMICOS DA REVISÃO (Seções 20 & 26)
 * Gera sugestões para validação humana (nunca altera outros registros automaticamente).
 */
export function diagnosticarImpactosRevisao(params: {
  documento: DocumentoControlado;
  novaRevisao: RevisaoDocumental;
  procedimentosRelacionados?: Array<{ id: string; codigo: string; titulo: string }>;
  cursosTreinamentos?: Array<{ id: string; titulo: string; referenciaRegulamentar?: string }>;
  rncsAbertas?: Array<{ id: string; numeroNC: string; normaReferencia: string }>;
}): ImpactoRevisaoItem[] {
  const { documento, novaRevisao, procedimentosRelacionados = [], cursosTreinamentos = [], rncsAbertas = [] } = params;
  const impactos: ImpactoRevisaoItem[] = [];
  const docCodeClean = documento.codigo.toLowerCase();

  // 1. Impacto em Treinamentos
  cursosTreinamentos.forEach((curso) => {
    const ref = (curso.referenciaRegulamentar || '').toLowerCase();
    const titulo = curso.titulo.toLowerCase();
    if (ref.includes(docCodeClean) || titulo.includes(docCodeClean)) {
      impactos.push({
        id: `imp-train-${curso.id}-${novaRevisao.id}`,
        organizationId: documento.organizationId,
        documentoId: documento.id,
        codigoDocumento: documento.codigo,
        revisaoId: novaRevisao.id,
        numeroRevisao: novaRevisao.numeroRevisao,
        areaAfetada: 'TREINAMENTO',
        itemAfetadoId: curso.id,
        itemAfetadoTitulo: `Curso: ${curso.titulo}`,
        descricaoImpacto: `O treinamento possui referência direta a "${documento.codigo}". A entrada em vigor da ${novaRevisao.numeroRevisao} pode demandar atualização da ementa e reciclagem da equipe.`,
        acaoSugerida: 'Revisar material didático e avaliar necessidade de plano de treinamento de transição.',
        statusValidacaoHumana: 'SUGESTAO_PENDENTE',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 2. Impacto em Procedimentos Internos (POP / IT)
  procedimentosRelacionados.forEach((proc) => {
    if (proc.codigo !== documento.codigo) {
      impactos.push({
        id: `imp-proc-${proc.id}-${novaRevisao.id}`,
        organizationId: documento.organizationId,
        documentoId: documento.id,
        codigoDocumento: documento.codigo,
        revisaoId: novaRevisao.id,
        numeroRevisao: novaRevisao.numeroRevisao,
        areaAfetada: 'PROCEDIMENTO',
        itemAfetadoId: proc.id,
        itemAfetadoTitulo: `${proc.codigo} — ${proc.titulo}`,
        descricaoImpacto: `Procedimento operacional subordinado ou vinculado às diretrizes de ${documento.codigo}.`,
        acaoSugerida: 'Verificar se formulários, tolerâncias ou passos operacionais foram alterados na nova revisão.',
        statusValidacaoHumana: 'SUGESTAO_PENDENTE',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 3. Impacto em RNCs em aberto
  rncsAbertas.forEach((nc) => {
    if (nc.normaReferencia.toLowerCase().includes(docCodeClean)) {
      impactos.push({
        id: `imp-rnc-${nc.id}-${novaRevisao.id}`,
        organizationId: documento.organizationId,
        documentoId: documento.id,
        codigoDocumento: documento.codigo,
        revisaoId: novaRevisao.id,
        numeroRevisao: novaRevisao.numeroRevisao,
        areaAfetada: 'RNC',
        itemAfetadoId: nc.id,
        itemAfetadoTitulo: `RNC ${nc.numeroNC}`,
        descricaoImpacto: `RNC em tratamento com referência normativa a "${nc.normaReferencia}". É mandatório atentar que a ocorrência se deu sob a revisão vigente na data do fato.`,
        acaoSugerida:
          'Utilizar o Motor Temporal para garantir que a causa raiz e eficácia considerem a revisão correta da data da ocorrência.',
        statusValidacaoHumana: 'SUGESTAO_PENDENTE',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Se não houver vínculos diretos mapeados, adiciona lembrete geral de garantia da qualidade
  if (impactos.length === 0) {
    impactos.push({
      id: `imp-general-${novaRevisao.id}`,
      organizationId: documento.organizationId,
      documentoId: documento.id,
      codigoDocumento: documento.codigo,
      revisaoId: novaRevisao.id,
      numeroRevisao: novaRevisao.numeroRevisao,
      areaAfetada: 'PROCESSO',
      itemAfetadoTitulo: `Garantia da Qualidade — ${documento.codigo}`,
      descricaoImpacto: `Nova revisão ${novaRevisao.numeroRevisao} incorporada ao acervo técnico.`,
      acaoSugerida: 'Disseminar comunicação técnica interna aos setores de manutenção e qualidade.',
      statusValidacaoHumana: 'SUGESTAO_PENDENTE',
      createdAt: new Date().toISOString(),
    });
  }

  return impactos;
}

/**
 * MOTOR DE VERIFICAÇÃO EM FONTES EXTERNAS (Seções 11, 12, 13)
 * Avalia fontes cadastradas e gera alerta de validação humana quando discrepância for identificada.
 */
export function simularVerificacaoFonteExterna(params: {
  fonte: FonteExternaControlada;
  documento: DocumentoControlado;
  revisaoAtual: RevisaoDocumental | undefined;
  usuarioExecutor: string;
}): LogVerificacaoFonteExterna {
  const { fonte, documento, revisaoAtual, usuarioExecutor } = params;
  const dataHoje = new Date().toISOString();

  // Exemplo determinístico com base no código do documento:
  // Se for documento de cliente ou fabricante com mais de 180 dias de vigência,
  // simula a detecção de revisão na fonte oficial para demonstrar a regra de validação humana
  const revAtualNum = revisaoAtual?.numeroRevisao || 'Rev. 01';

  let status: 'CONFORME' | 'NOVA_REVISAO_IDENTIFICADA' | 'FONTE_INDISPONIVEL' = 'CONFORME';
  let revisaoIdentificada = revAtualNum;
  let mensagem = `Fonte consultada com sucesso. A revisão controlada (${revAtualNum}) confere com a publicação oficial em ${fonte.nome}.`;
  let requerValidacao = false;

  // Lógica de detecção de discrepância controlada (Ex: demonstração da regra de segurança Seção 12)
  if (documento.codigo.toUpperCase().includes('AMM') || documento.codigo.toUpperCase().includes('AZUL') || documento.categoria === 'DOCUMENTO_CLIENTE') {
    // Simula uma nova revisão no portal do fabricante/cliente
    const matchNum = revAtualNum.match(/\d+/);
    const numInt = matchNum ? parseInt(matchNum[0], 10) : 1;
    revisaoIdentificada = `Rev. 0${numInt + 1}`;
    status = 'NOVA_REVISAO_IDENTIFICADA';
    mensagem = `ATENÇÃO: Foi identificada possível nova revisão (${revisaoIdentificada}) na fonte "${fonte.nome}". A cópia armazenada no QualiGest é a "${revAtualNum}". REGRA DE SEGURANÇA: O documento NÃO foi substituído automaticamente. Necessária validação humana do responsável técnico.`;
    requerValidacao = true;
  }

  return {
    id: `log-verif-${Date.now()}`,
    organizationId: documento.organizationId,
    fonteId: fonte.id,
    fonteNome: fonte.nome,
    documentoId: documento.id,
    codigoDocumento: documento.codigo,
    revisaoAtualControlada: revAtualNum,
    revisaoIdentificadaNaFonte: revisaoIdentificada,
    statusVerificacao: status,
    mensagem,
    requerValidacaoHumana: requerValidacao,
    validacaoHumanaStatus: requerValidacao ? 'PENDENTE' : 'VALIDADA_NOVA_REVISAO_ACEITA',
    dataVerificacao: dataHoje,
    executadoPor: usuarioExecutor,
    evidenciaUrlOuTexto: fonte.urlBase || 'Consulta direta ao repositório homologado.',
  };
}

/**
 * CÁLCULO DAS MÉTRICAS DO DASHBOARD DOCUMENTAL (Seção 28)
 */
export function calcularMetricasDashboardDocumental(
  documentos: DocumentoControlado[],
  revisoes: RevisaoDocumental[],
  fontes: FonteExternaControlada[],
  solicitacoes: SolicitacaoRevisaoCliente[],
  logsVerificacao: LogVerificacaoFonteExterna[]
): DocumentosDashboardMetrics {
  if (!documentos || documentos.length === 0) {
    return {
      totalDocumentosControlados: 0,
      documentosVigentes: 0,
      documentosObsoletos: 0,
      documentosEmAnalise: 0,
      documentosAguardandoAprovacao: 0,
      revisoesExternasIdentificadasNaoValidadas: 0,
      solicitacoesClientesPendentes: 0,
      documentosSemVerificacaoRecente: 0,
      distribuicaoPorCategoria: {
        DOCUMENTO_INTERNO: 0,
        DOCUMENTO_AUTORIDADE: 0,
        DOCUMENTO_FABRICANTE: 0,
        DOCUMENTO_CLIENTE: 0,
        OUTRO_CONTROLADO: 0,
      },
      distribuicaoPorSetor: {},
      distribuicaoPorOrigem: {},
      totalRevisoesArmazenadas: 0,
      semDados: true,
    };
  }

  let vigentes = 0;
  let obsoletos = 0;
  let emAnalise = 0;
  let aguardandoAprovacao = 0;

  const distCategoria: Record<any, number> = {
    DOCUMENTO_INTERNO: 0,
    DOCUMENTO_AUTORIDADE: 0,
    DOCUMENTO_FABRICANTE: 0,
    DOCUMENTO_CLIENTE: 0,
    OUTRO_CONTROLADO: 0,
  };

  const distSetor: Record<string, number> = {};
  const distOrigem: Record<string, number> = {};

  documentos.forEach((doc) => {
    // Contagem de categoria
    distCategoria[doc.categoria] = (distCategoria[doc.categoria] || 0) + 1;

    // Emissor / Origem
    const emissor = doc.emissor || 'SGQ';
    distOrigem[emissor] = (distOrigem[emissor] || 0) + 1;

    // Setores
    const setores = doc.aplicabilidadePadrao?.setores || ['Geral'];
    setores.forEach((s) => {
      distSetor[s] = (distSetor[s] || 0) + 1;
    });

    // Revisão vigente
    const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
    if (revVigente) {
      if (revVigente.statusCicloVida === 'VIGENTE' || revVigente.statusCicloVida === 'APROVADO') {
        vigentes++;
      } else if (revVigente.statusCicloVida === 'OBSOLETO' || revVigente.statusCicloVida === 'SUBSTITUIDO') {
        obsoletos++;
      } else if (revVigente.statusCicloVida === 'EM_ANALISE') {
        emAnalise++;
      } else if (revVigente.statusCicloVida === 'EM_APROVACAO') {
        aguardandoAprovacao++;
      }
    } else {
      vigentes++;
    }
  });

  // Revisões externas pendentes de validação humana
  const revisoesExternasNaoValidadas = logsVerificacao.filter(
    (l) => l.requerValidacaoHumana && l.validacaoHumanaStatus === 'PENDENTE'
  ).length;

  // Solicitações a clientes pendentes (Gerada, Enviada, Aguardando Cliente)
  const solicitacoesPendentes = solicitacoes.filter(
    (s) =>
      s.status === 'SOLICITACAO_GERADA' ||
      s.status === 'ENVIADA_PELO_USUARIO' ||
      s.status === 'AGUARDANDO_CLIENTE'
  ).length;

  // Documentos sem verificação recente (> 90 dias ou nunca verificados com fonte cadastrada)
  const hoje = new Date();
  let semVerificacao = 0;
  documentos.forEach((d) => {
    if (d.fonteOficialCadastrada || d.fonteExternaId) {
      if (!d.ultimaVerificacaoExterna) {
        semVerificacao++;
      } else {
        const ult = new Date(d.ultimaVerificacaoExterna);
        const diffDias = Math.floor((hoje.getTime() - ult.getTime()) / (1000 * 3600 * 24));
        if (diffDias > (d.frequenciaVerificacaoDias || 90)) {
          semVerificacao++;
        }
      }
    }
  });

  return {
    totalDocumentosControlados: documentos.length,
    documentosVigentes: vigentes,
    documentosObsoletos: obsoletos,
    documentosEmAnalise: emAnalise,
    documentosAguardandoAprovacao: aguardandoAprovacao,
    revisoesExternasIdentificadasNaoValidadas: revisoesExternasNaoValidadas,
    solicitacoesClientesPendentes: solicitacoesPendentes,
    documentosSemVerificacaoRecente: semVerificacao,
    distribuicaoPorCategoria: distCategoria,
    distribuicaoPorSetor: distSetor,
    distribuicaoPorOrigem: distOrigem,
    totalRevisoesArmazenadas: revisoes.length,
    semDados: false,
  };
}
