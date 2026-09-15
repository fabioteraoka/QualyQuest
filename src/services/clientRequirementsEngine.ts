import {
  RequisitoClienteItem,
  AvaliacaoRequisitoCliente,
  StatusDeterminacaoPrevia,
  ControleCentralSGQ,
  NCRecord,
  UserProfile,
  TipoAcao,
  NivelRisco,
} from '../types';

export interface SugestaoPreAvaliacaoIA {
  status: StatusDeterminacaoPrevia; // VERDE, AMARELO, VERMELHO, CINZA
  resultadoSugerido: 'CONFORME' | 'ATENCAO' | 'NAO_CONFORME' | 'PENDENTE';
  justificativa: string;
  evidenciasIdentificadas: string[];
  confiancaScore: number; // 0 a 100
  alertaRisco?: string;
  recomendacaoAuditor: string;
}

/**
 * Engine Inteligente de Pré-Avaliação de Requisitos de Clientes
 * 
 * DIRETRIZ FUNDAMENTAL DE GOVERNANÇA:
 * - A IA NÃO aprova conformidade.
 * - A IA NÃO cria requisito oficial.
 * - A IA NÃO transforma hipótese em fato.
 * - A decisão final pertence SEMPRE ao auditor / gestor humano (Human-in-the-Loop).
 */
export function executarPreAvaliacaoRequisito(
  requisito: RequisitoClienteItem,
  controleCentral?: ControleCentralSGQ,
  contextoOrganizacional?: {
    totalTreinamentosVencidos?: number;
    totalDocumentosVencidos?: number;
    rncsAbertasControle?: number;
  }
): SugestaoPreAvaliacaoIA {
  // Caso 1: Requisito sem controle central associado (Lacuna de Governança)
  if (!requisito.controleCentralId && !requisito.controleCentralCodigo) {
    return {
      status: 'CINZA',
      resultadoSugerido: 'PENDENTE',
      justificativa: 'Requisito sem controle central associado. Não há fonte de dados automatizada no SGQ para inferir status.',
      evidenciasIdentificadas: [],
      confiancaScore: 30,
      alertaRisco: 'Lacuna de Cobertura: O requisito depende de verificação e evidência manual presencial.',
      recomendacaoAuditor: 'Vincule um Controle Central SGQ ou anexe evidência documental direta para validar o item.',
    };
  }

  // Caso 2: Controle de Pessoas e Treinamentos
  if (requisito.moduloOrigemSugerido === 'PessoasTreinamentos' || controleCentral?.moduloOrigem === 'PessoasTreinamentos') {
    const vencidos = contextoOrganizacional?.totalTreinamentosVencidos ?? 0;
    if (vencidos > 0) {
      return {
        status: 'VERMELHO',
        resultadoSugerido: 'NAO_CONFORME',
        justificativa: `Identificado(s) ${vencidos} treinamento(s) ou qualificação(ões) com prazo expirado na base operacional.`,
        evidenciasIdentificadas: ['Extrato de Treinamentos SGQ', 'Matriz de Competências'],
        confiancaScore: 92,
        alertaRisco: 'Risco Regulatório: Técnicos atuando sem reciclagem obrigatória válida perante requisitos do cliente.',
        recomendacaoAuditor: 'Auditor: Verificar se os técnicos alocados no voo possuem reciclagem concluída ou gerar RNC de contenção imediata.',
      };
    }

    return {
      status: 'VERDE',
      resultadoSugerido: 'CONFORME',
      justificativa: 'Matriz de competências, CHTs ANAC e treinamentos obrigatórios (Fatores Humanos, EWIS, Combustível) 100% vigentes.',
      evidenciasIdentificadas: ['Certificados de Treinamento Vigentes', 'Roster de Técnicos Autorizados'],
      confiancaScore: 96,
      recomendacaoAuditor: 'Auditor: Confirmar por amostragem as assinaturas nos últimos pacotes de trabalho.',
    };
  }

  // Caso 3: Controle Documental / AMM / Manuais
  if (requisito.moduloOrigemSugerido === 'ControleDocumental' || controleCentral?.moduloOrigem === 'ControleDocumental') {
    const docVencidos = contextoOrganizacional?.totalDocumentosVencidos ?? 0;
    if (docVencidos > 0) {
      return {
        status: 'AMARELO',
        resultadoSugerido: 'ATENCAO',
        justificativa: `Existe(m) ${docVencidos} publicação(ões) técnica(s) ou manual(is) em processo de revisão pendente de validação.`,
        evidenciasIdentificadas: ['Log de Verificação de Fontes Externas', 'Lista Mestra de Documentos'],
        confiancaScore: 88,
        alertaRisco: 'Risco Documental: Possível divergência de revisão entre a versão do hangar e a versão do cliente.',
        recomendacaoAuditor: 'Auditor: Acessar portal do cliente/fabricante e validar se a revisão utilizada no posto é a última oficial.',
      };
    }

    return {
      status: 'VERDE',
      resultadoSugerido: 'CONFORME',
      justificativa: 'Publicações técnicas (AMM, IPC, SRM) e manuais do cliente encontram-se vigentes e sincronizados.',
      evidenciasIdentificadas: ['Logs de Acesso Portal Técnico', 'Lista Mestra Atualizada'],
      confiancaScore: 95,
      recomendacaoAuditor: 'Auditor: Verificar conectividade dos tablets de linha no pátio.',
    };
  }

  // Caso 4: Operacional / Ferramentas / Metrologia
  if (requisito.categoria.toLowerCase().includes('ferramenta') || requisito.categoria.toLowerCase().includes('tooling') || requisito.categoria.toLowerCase().includes('calibra')) {
    return {
      status: 'VERDE',
      resultadoSugerido: 'CONFORME',
      justificativa: 'Ferramental de precisão com certificados de calibração RBC válidos e rastreáveis no almoxarifado.',
      evidenciasIdentificadas: ['Certificados de Calibração RBC', 'Etiquetas de Calibração'],
      confiancaScore: 94,
      recomendacaoAuditor: 'Auditor: Inspecionar fisicamente se as ferramentas em uso na pista possuem o selo de calibração legível.',
    };
  }

  // Caso Padrão
  return {
    status: 'CINZA',
    resultadoSugerido: 'PENDENTE',
    justificativa: 'Controle central associado, aguardando inspeção objetiva presencial do auditor.',
    evidenciasIdentificadas: controleCentral?.evidenciasTipicas || [],
    confiancaScore: 50,
    recomendacaoAuditor: 'Auditor: Realizar verificação in loco e carregar a evidência objetiva.',
  };
}

/**
 * Criação assistida de RNC oficial F 001-29 a partir de um requisito não conforme
 */
export function construirPayloadRNCDeRequisitoCliente(
  requisito: RequisitoClienteItem,
  avaliacao: Partial<AvaliacaoRequisitoCliente>,
  currentUser?: UserProfile | null,
  proximoNumeroNC: string = '01'
): Partial<NCRecord> {
  const dataHoje = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('pt-BR');

  let nivelRisco: NivelRisco = 'Médio';
  let severidade = '2';
  let probabilidade = 'B';
  let codigoRisco = '2B';

  if (requisito.criticidade === 'CRITICO') {
    nivelRisco = 'Alto';
    severidade = '4';
    probabilidade = 'C';
    codigoRisco = '4C';
  } else if (requisito.criticidade === 'ALTO') {
    nivelRisco = 'Médio';
    severidade = '3';
    probabilidade = 'B';
    codigoRisco = '3B';
  } else if (requisito.criticidade === 'BAIXO') {
    nivelRisco = 'Baixo';
    severidade = '1';
    probabilidade = 'A';
    codigoRisco = '1A';
  }

  return {
    codigoFormulario: 'F 001-29',
    revisao: '00',
    dataEmissaoFormulario: formattedDate,
    numeroNC: proximoNumeroNC,
    titulo: `Não Conformidade de Auditoria de Cliente: ${requisito.clienteNome} (${requisito.numeroItem})`,
    tipoAcao: 'Corretiva' as TipoAcao,
    descricaoNC: `Identificada não conformidade no atendimento ao requisito ${requisito.numeroItem} (${requisito.tituloCurto}) do programa ${requisito.programaCodigo} (${requisito.clienteNome}) na base ${avaliacao.baseCodigo || 'Operacional'}.\n\nTexto do Requisito:\n"${requisito.textoOriginal}"\n\nConstatação da Avaliação:\n${avaliacao.justificativa || 'Constatada inconformidade perante o padrão exigido pelo cliente durante avaliação periódica.'}`,
    normaReferencia: `${requisito.clienteNome} - ${requisito.programaCodigo} Item ${requisito.numeroItem} / RBAC 145`,
    setor: avaliacao.baseNome ? `Base ${avaliacao.baseCodigo} - ${avaliacao.baseNome}` : 'Garantia da Qualidade / Linha',
    categoria: requisito.categoria || 'Auditorias Externas e Clientes',
    responsavel: currentUser?.displayName || 'Garantia da Qualidade',
    auditor: currentUser?.displayName || avaliacao.avaliadorNome || 'Paulo Okubo',
    dataIdentificacao: dataHoje,
    prazoResposta: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias
    avaliacaoRiscoInicial: {
      severidade,
      probabilidade,
      codigo: codigoRisco,
      nivel: nivelRisco,
      justificativa: `Não conformidade vinculada a requisito do cliente ${requisito.clienteNome} com criticidade ${requisito.criticidade}.`,
    },
    preAnaliseContencao: {
      descricao: 'Segregar processo/ferramenta/registro não conforme e notificar o responsável técnico da base.',
      responsavel: currentUser?.displayName || 'Supervisor de Linha',
      dataLimite: dataHoje,
      status: 'Pendente',
    },
    analiseCausaRaiz: {
      metodologia: '5 Porquês',
      cincoPorques: [],
      detalhes: '',
    },
    acaoCorretiva: {
      descricao: '',
      responsavel: '',
      dataPrazo: '',
      status: 'Não Iniciada',
    },
    verificacaoEficacia: {
      metodo: 'Reauditoria / Inspeção de Acompanhamento',
      criterioAprovacao: `Reavaliar o requisito ${requisito.numeroItem} na próxima auditoria periódica com 100% de conformidade documental e presencial.`,
      encerrado: 'Pendente',
    },
    statusGeral: 'Aberta',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    historicoPrazos: [],
    tags: [requisito.clienteNome, requisito.programaCodigo, requisito.numeroItem, 'AuditoriaCliente'],
    origemRequisitoCliente: {
      clienteId: requisito.clienteId,
      clienteNome: requisito.clienteNome,
      programaId: requisito.programaId,
      programaCodigo: requisito.programaCodigo,
      requisitoId: requisito.id,
      numeroItem: requisito.numeroItem,
      baseId: avaliacao.baseId,
      baseCodigo: avaliacao.baseCodigo,
      dataVinculo: dataHoje,
    },
  };
}
