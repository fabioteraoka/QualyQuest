import {
  DocumentoControlado,
  SolicitacaoRevisaoCliente,
  ClienteExterno,
  InteracaoCobrancaItem,
  CanalCobrancaDocumental,
} from '../types';
import {
  compararRevisoesDocumentaisDetalhada,
  ResultadoComparacaoRevisao,
} from './manualsCrossCheckService';
import {
  normalizeDocumentCode,
  canonicalAlphanumericKey,
} from './documentControlAuditReconciliation';

export interface MetricasEmpresasFrotas {
  totalEmpresasAtendidas: number;
  totalDocumentosClientes: number;
  totalMelsControladas: number;
  totalAmmsIpcsControlados: number;
  documentosPendentesSolicitacao: number;
  documentosAguardandoRetorno: number;
  documentosAguardandoConferencia: number;
  documentosConferidosAceitos: number;
  documentosComPendenciaRecebimento: number;
  revisoesPossivelmenteDesatualizadas: number;
  verificacoesNecessitamAnaliseManual: number;
  cobrancasNecessarias: number;
  solicitacoesPrazoUltrapassado: number;
  distribuicaoPorEmpresa: Record<string, {
    clienteNome: string;
    totalDocs: number;
    melsCount: number;
    pendentes: number;
    aguardandoConferencia: number;
    desatualizados: number;
    cobrancasAtrasadas: number;
    ultimaInteracao?: string;
  }>;
}

export interface FiltrosEmpresasFrotas {
  clienteId?: string;
  frota?: string;
  tipoDocumentalTecnico?: string;
  modeloAeronave?: string;
  situacaoRecebimento?: string;
  situacaoCobranca?: string;
  responsavel?: string;
  busca?: string;
}

/**
 * VERIFICAÇÃO SE UMA SOLICITAÇÃO ESTÁ COM PRAZO ULTRAPASSADO
 */
export function verificarAtrasoPrazoSolicitacao(solicitacao: SolicitacaoRevisaoCliente): boolean {
  if (
    solicitacao.status === 'DOCUMENTO_RECEBIDO' ||
    solicitacao.status === 'SOLICITACAO_ENCERRADA' ||
    solicitacao.status === 'VALIDADA' ||
    solicitacao.status === 'ENCERRADA'
  ) {
    return false;
  }

  const prazoStr = solicitacao.prazoRetornoData || solicitacao.dataLimiteResposta;
  if (!prazoStr) return false;

  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prazo = new Date(prazoStr);
    prazo.setHours(0, 0, 0, 0);
    return prazo < hoje;
  } catch {
    return false;
  }
}

/**
 * COMPARAÇÃO ENTRE REVISÃO RECEBIDA PELA IMPACTO E REVISÃO OFICIAL DE REFERÊNCIA
 */
export function compararRevisaoRecebidaComReferencia(
  revisaoReferencia: string,
  revisaoRecebida?: string
): {
  status: 'CONFORME_VIGENTE' | 'RECEBIDO_DESATUALIZADO' | 'RECEBIDO_POSTERIOR' | 'REVISAO_NAO_CONFIRMADA' | 'ANALISE_MANUAL_OBRIGATORIA';
  detalhes: string;
  requerAnaliseManual: boolean;
} {
  if (!revisaoRecebida || !revisaoRecebida.trim() || revisaoRecebida === '-') {
    return {
      status: 'REVISAO_NAO_CONFIRMADA',
      detalhes: 'Documento ainda não recebido ou revisão não informada.',
      requerAnaliseManual: false,
    };
  }

  if (!revisaoReferencia || !revisaoReferencia.trim() || revisaoReferencia === '-') {
    return {
      status: 'REVISAO_NAO_CONFIRMADA',
      detalhes: 'Revisão oficial de referência não confirmada para comparação.',
      requerAnaliseManual: true,
    };
  }

  const comp: ResultadoComparacaoRevisao = compararRevisoesDocumentaisDetalhada(
    revisaoRecebida,
    revisaoReferencia
  );

  if (comp.requerAnaliseManual) {
    return {
      status: 'ANALISE_MANUAL_OBRIGATORIA',
      detalhes: `Formatos de revisão heterogêneos ou ambíguos ("${revisaoRecebida}" vs "${revisaoReferencia}"). Exige validação humana obrigatória sem presunção de conformidade.`,
      requerAnaliseManual: true,
    };
  }

  if (comp.resultado === 0) {
    return {
      status: 'CONFORME_VIGENTE',
      detalhes: `Revisão recebida (${revisaoRecebida}) coincide com a revisão oficial vigente.`,
      requerAnaliseManual: false,
    };
  } else if (comp.resultado < 0) {
    return {
      status: 'RECEBIDO_DESATUALIZADO',
      detalhes: `Revisão recebida (${revisaoRecebida}) é inferior à revisão oficial vigente (${revisaoReferencia}). Necessária solicitação de atualização à empresa.`,
      requerAnaliseManual: false,
    };
  } else {
    return {
      status: 'RECEBIDO_POSTERIOR',
      detalhes: `Revisão recebida (${revisaoRecebida}) é mais recente que a referência cadastrada (${revisaoReferencia}). Requer conferência e homologação da nova revisão no acervo.`,
      requerAnaliseManual: false,
    };
  }
}

/**
 * CÁLCULO DE MÉTRICAS CONSOLIDADAS POR EMPRESA E FROTAS
 * Baseado estritamente em dados reais persistidos (sem valores simulados)
 */
export function calcularMetricasEmpresasFrotas(
  documentos: DocumentoControlado[],
  solicitacoes: SolicitacaoRevisaoCliente[],
  clientes: ClienteExterno[]
): MetricasEmpresasFrotas {
  // Filtra documentos pertencentes a clientes/empresas atendidas
  const docsClientes = documentos.filter(
    (d) =>
      d.categoria === 'DOCUMENTO_CLIENTE' ||
      d.tipoOrigemDocumental === 'CLIENTE' ||
      Boolean(d.clienteId) ||
      Boolean(d.proprietarioCessor && d.proprietarioCessor !== 'IMPACTO')
  );

  let totalMels = 0;
  let totalAmmsIpcs = 0;
  let pendentesSolicitacao = 0;
  let aguardandoRetorno = 0;
  let aguardandoConferencia = 0;
  let conferidosAceitos = 0;
  let comPendencia = 0;
  let revisoesDesatualizadas = 0;
  let analiseManualNecessaria = 0;

  const distribuicaoPorEmpresa: MetricasEmpresasFrotas['distribuicaoPorEmpresa'] = {};

  // Inicializa mapa de clientes conhecidos
  clientes.forEach((cli) => {
    distribuicaoPorEmpresa[cli.id] = {
      clienteNome: cli.nome,
      totalDocs: 0,
      melsCount: 0,
      pendentes: 0,
      aguardandoConferencia: 0,
      desatualizados: 0,
      cobrancasAtrasadas: 0,
    };
  });

  docsClientes.forEach((doc) => {
    const isMel =
      doc.tipoDocumentalTecnico === 'MEL' ||
      doc.codigo.toUpperCase().includes('MEL') ||
      doc.titulo.toUpperCase().includes('MINIMUM EQUIPMENT LIST');

    const isAmmIpc =
      doc.tipoDocumentalTecnico === 'AMM' ||
      doc.tipoDocumentalTecnico === 'IPC' ||
      doc.codigo.toUpperCase().includes('AMM') ||
      doc.codigo.toUpperCase().includes('IPC');

    if (isMel) totalMels++;
    if (isAmmIpc) totalAmmsIpcs++;

    const sit = doc.situacaoRecebimento || 'PENDENTE_SOLICITACAO';
    if (sit === 'PENDENTE_SOLICITACAO') pendentesSolicitacao++;
    else if (sit === 'SOLICITADO' || sit === 'AGUARDANDO_RETORNO') aguardandoRetorno++;
    else if (sit === 'RECEBIDO' || sit === 'AGUARDANDO_CONFERENCIA') aguardandoConferencia++;
    else if (sit === 'CONFERIDO_ACEITO') conferidosAceitos++;
    else if (sit === 'RECEBIDO_COM_PENDENCIA') comPendencia++;

    const revOficial = doc.numeroRevisao || doc.revisaoOficialReferencia || doc.revisaoVigenteNumero || '';
    const comp = compararRevisaoRecebidaComReferencia(revOficial, doc.revisaoRecebida);
    if (comp.status === 'RECEBIDO_DESATUALIZADO') {
      revisoesDesatualizadas++;
    }
    if (comp.requerAnaliseManual || doc.statusVerificacao === 'VERIFICACAO_NAO_CONCLUSIVA') {
      analiseManualNecessaria++;
    }

    // Agrupamento por empresa
    const empId = doc.clienteId || doc.proprietarioCessor || 'OUTROS';
    const empNome = doc.clienteNome || doc.proprietarioCessor || doc.emissor || 'Empresa Não Identificada';

    if (!distribuicaoPorEmpresa[empId]) {
      distribuicaoPorEmpresa[empId] = {
        clienteNome: empNome,
        totalDocs: 0,
        melsCount: 0,
        pendentes: 0,
        aguardandoConferencia: 0,
        desatualizados: 0,
        cobrancasAtrasadas: 0,
      };
    }

    const empMetrics = distribuicaoPorEmpresa[empId];
    empMetrics.totalDocs++;
    if (isMel) empMetrics.melsCount++;
    if (sit === 'PENDENTE_SOLICITACAO' || sit === 'AGUARDANDO_RETORNO') empMetrics.pendentes++;
    if (sit === 'AGUARDANDO_CONFERENCIA') empMetrics.aguardandoConferencia++;
    if (comp.status === 'RECEBIDO_DESATUALIZADO') empMetrics.desatualizados++;
  });

  // Métricas de cobranças e solicitações
  let cobrancasNecessarias = 0;
  let solicitacoesAtrasadas = 0;

  solicitacoes.forEach((sol) => {
    const atrasada = verificarAtrasoPrazoSolicitacao(sol);
    if (atrasada) {
      solicitacoesAtrasadas++;
    }
    if (
      sol.status === 'COBRANCA_NECESSARIA' ||
      sol.status === 'PRAZO_ULTRAPASSADO' ||
      atrasada
    ) {
      cobrancasNecessarias++;
    }

    const empId = sol.clienteId || sol.clienteNome;
    if (distribuicaoPorEmpresa[empId]) {
      if (atrasada) distribuicaoPorEmpresa[empId].cobrancasAtrasadas++;
      if (sol.dataUltimaInteracao) {
        distribuicaoPorEmpresa[empId].ultimaInteracao = sol.dataUltimaInteracao;
      }
    }
  });

  const totalEmpresas = Object.keys(distribuicaoPorEmpresa).filter(
    (k) => distribuicaoPorEmpresa[k].totalDocs > 0
  ).length;

  return {
    totalEmpresasAtendidas: totalEmpresas,
    totalDocumentosClientes: docsClientes.length,
    totalMelsControladas: totalMels,
    totalAmmsIpcsControlados: totalAmmsIpcs,
    documentosPendentesSolicitacao: pendentesSolicitacao,
    documentosAguardandoRetorno: aguardandoRetorno,
    documentosAguardandoConferencia: aguardandoConferencia,
    documentosConferidosAceitos: conferidosAceitos,
    documentosComPendenciaRecebimento: comPendencia,
    revisoesPossivelmenteDesatualizadas: revisoesDesatualizadas,
    verificacoesNecessitamAnaliseManual: analiseManualNecessaria,
    cobrancasNecessarias,
    solicitacoesPrazoUltrapassado: solicitacoesAtrasadas,
    distribuicaoPorEmpresa,
  };
}

/**
 * PREPARAÇÃO DE TEXTO PARA MENSAGEM / E-MAIL DE COBRANÇA
 * Não dispara envio automático fictício; prepara texto para cópia manual.
 */
export function prepararMensagemCobranca(
  doc: DocumentoControlado,
  solicitacao?: SolicitacaoRevisaoCliente | null,
  idioma: 'EN' | 'PT' = 'PT'
): { assunto: string; corpo: string } {
  const cliente = doc.clienteNome || doc.proprietarioCessor || doc.emissor || 'Operador Aéreo';
  const codigo = doc.codigo;
  const titulo = doc.titulo;
  const frota = doc.frota || (doc.frotas && doc.frotas.join(', ')) || 'Geral';
  const revAtual = doc.revisaoRecebida || doc.numeroRevisao || 'N/D';
  const revEsperada = doc.revisaoOficialReferencia || doc.revisaoNaFonteIdentificada || revAtual;
  const prazo = solicitacao?.prazoRetornoData || '5 dias úteis';

  if (idioma === 'EN') {
    return {
      assunto: `[TECHNICAL RECORDS AUDIT] Follow-up Request: ${codigo} (${frota}) — ${cliente}`,
      corpo: `Dear Technical Records & Quality Department,

Greetings from Quality Assurance at Impacto Aviation MRO.

This is a formal follow-up regarding our continuing airworthiness controlled documentation compliance (RBAC 145 / 14 CFR Part 145).

We are requesting the updated controlled technical document:
• Customer / Airline Operator: ${cliente}
• Publication Code: ${codigo}
• Title: ${titulo}
• Fleet / Scope: ${frota}
• Current Revision on File: ${revAtual}
• Expected / Verified Current Revision: ${revEsperada}

Kindly provide the latest approved revision file together with the List of Effective Pages (LEP) or confirm current validity by ${prazo}.

Thank you for your cooperation in maintaining flight safety and regulatory compliance.

Sincerely,
Technical Records & Quality Assurance Team
Impacto Aviation MRO
QualyQuest SGQ Aeronáutico`,
    };
  }

  return {
    assunto: `[CONTROLE DOCUMENTAL SGQ] Solicitação / Cobrança de Revisão: ${codigo} (${frota}) — ${cliente}`,
    corpo: `Prezado(a) Setor de Engenharia & Registros Técnicos,

Saudações da Garantia da Qualidade e Controle Documental da Impacto Aviation MRO.

Em cumprimento aos requisitos de aeronavegabilidade continuada (RBAC 145.109 / SGQ), realizamos o acompanhamento dos manuais técnicos aplicáveis aos serviços prestados para vossa empresa.

Consta em nosso acervo a seguinte publicação pendente de recebimento / atualização:
• Empresa / Operador Contratante: ${cliente}
• Documento / Manual: ${codigo}
• Título: ${titulo}
• Frota / Aplicação: ${frota}
• Revisão Atualmente Arquivada: ${revAtual}
• Revisão Vigente Identificada / Esperada: ${revEsperada}

Solicitamos a gentileza de encaminhar o arquivo atualizado ou a confirmação formal de vigência até a data de ${prazo}.

Agradecemos pela cooperação e parceria técnica contínua.

Atenciosamente,
Controle Documental & Garantia da Qualidade
Impacto Aviation MRO
QualyQuest SGQ Aeronáutico`,
  };
}
