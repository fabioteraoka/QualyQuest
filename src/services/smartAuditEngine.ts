import {
  RequisitoClienteItem,
  ControleCentralSGQ,
  AvaliacaoRequisitoCliente,
  ResultadoAvaliacaoRequisito,
  StatusDeterminacaoPrevia,
  PerguntaInteligenteResolucao,
  SugestaoResolucaoIA,
  EvidenciaRequisitoItem,
  FerramentaCalibracao,
  RegistroTreinamentoColaborador,
  DocumentoControlado,
  NCRecord,
  Person,
  ClienteExterno,
  ProgramaChecklistCliente,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria,
  ManualRecord
} from '../types';

export type CockpitPrioridade = 'CRITICO' | 'ATENCAO' | 'VERIFICACAO' | 'HISTORICO' | 'PREPARADO';

export type ClassificacaoInteligenteRequisito =
  | 'CONFORME'
  | 'NAO_CONFORME'
  | 'ATENCAO'
  | 'VERIFICACAO_NECESSARIA'
  | 'EVIDENCIA_NAO_LOCALIZADA'
  | 'RESPOSTA_PARCIAL'
  | 'NAO_APLICAVEL'
  | 'RESPOSTA_HISTORICA_DISPONIVEL'
  | 'AGUARDANDO_VALIDACAO';

export interface OQueJaTemosDetalhe {
  procedimentos: string[];
  manuais: string[];
  evidencias: string[];
  auditoriaAnterior?: string;
  respostaAnterior?: string;
  treinamento?: string;
  registro?: string;
  rncRelacionada?: string;
}

export interface RespostaHistoricaDetalhe {
  auditoriaId: string;
  numeroAuditoria: string;
  cliente: string;
  anoOuData: string;
  requisitoTexto: string;
  respostaUtilizada: string;
  evidencias: string[];
  statusAceitacao: 'RESPOSTA_ACEITA' | 'RESPOSTA_REJEITADA' | 'RESPOSTA_ENVIADA' | 'ACEITACAO_DESCONHECIDA' | 'RNC_ENCERRADA_INTERNAMENTE' | 'ACAO_EFICAZ';
  decisaoAuditorDetalhe?: string;
  documentoUtilizado?: string;
  revisaoNaEpoca?: string;
  revisaoVigenteAtual?: string;
  revisaoMudou?: boolean;
  alertaRevisao?: string;
  pesoConfiabilidade: number; // 0 a 100
}

export interface PropostaRespostaIA {
  textoRespostaSugerida: string;
  baseDaResposta: string[];
  evidenciasSustentacao: string[];
  historicoUtilizado?: string;
  limitacoes: string[];
  recomendacoes: string[];
}

export interface SugestaoAuditoriaInterna {
  sugerirInclusao: boolean;
  temaRecorrente: string;
  frequenciaRecorrencia: number;
  clientesQueExigem: string[];
  justificativa: string;
}

export interface ResumoAuditoriaPorExcecao {
  totalRequisitos: number;
  totalResolvidosAutomaticamente: number;
  totalConformes: number;
  totalNaoAplicaveis: number;
  totalExcecoes: number; // Requerem intervenção humana
  totalNaoConformes: number;
  totalAtencao: number;
  totalVerificacaoNecessaria: number;
  percentualAutomatizado: number;

  // Contadores para o Cockpit de Exceções 2.0
  totalCritico: number;
  totalAtencaoCockpit: number;
  totalVerificacao: number;
  totalHistorico: number;
  totalPreparado: number;
}

export interface ResultadoAvaliacaoInteligenteItem {
  requisito: RequisitoClienteItem;
  resultado: ResultadoAvaliacaoRequisito;
  statusCor: StatusDeterminacaoPrevia; // VERDE, VERMELHO, AMARELO, AZUL, CINZA
  isExcecao: boolean;
  justificativaConclusao: string;
  confiancaScore: number;
  evidenciasIdentificadas: EvidenciaRequisitoItem[];
  fonteDados: string;
  dataEvidencia: string;
  controleUtilizado?: ControleCentralSGQ;
  perguntaInteligente?: PerguntaInteligenteResolucao;
  sugestaoResolucao?: SugestaoResolucaoIA;

  // NOVOS CAMPOS PARA AUDITORIA INTELIGENTE 2.0 (REQUISITOS 8, 9, 10, 12, 14, 15, 16, 17, 18, 20)
  cockpitPrioridade: CockpitPrioridade;
  classificacaoInteligente: ClassificacaoInteligenteRequisito;
  oQueJaTemos: OQueJaTemosDetalhe;
  respostaHistorica?: RespostaHistoricaDetalhe;
  propostaResposta: PropostaRespostaIA;
  oQueFalta: string;
  oQueDevemosVerificar: string;
  ondeBuscar: string;
  sugestaoAuditoriaInterna?: SugestaoAuditoriaInterna;
}

export interface DadosAmbienteAuditoria {
  ferramentas?: FerramentaCalibracao[];
  treinamentos?: RegistroTreinamentoColaborador[];
  documentos?: DocumentoControlado[];
  rncs?: NCRecord[];
  pessoas?: Person[];
  baseCodigo?: string;
  audits?: AuditoriaExternaRecord[];
  findings?: ConstatacaoExternaRecord[];
  lessons?: LicaoAprendidaAuditoria[];
  manuals?: ManualRecord[];
  todosRequisitos?: RequisitoClienteItem[];
}

/**
 * Motor Central de Auditoria Inteligente e Determinação por Exceção 2.0
 */
export function executarAuditoriaInteligenteRequisito(
  requisito: RequisitoClienteItem,
  controle?: ControleCentralSGQ,
  dadosAmbiente?: DadosAmbienteAuditoria
): ResultadoAvaliacaoInteligenteItem {
  const baseItem = executarDeterminacaoBase(requisito, controle, dadosAmbiente);
  return enriquecerAvaliacaoInteligente(baseItem, dadosAmbiente);
}

function executarDeterminacaoBase(
  requisito: RequisitoClienteItem,
  controle?: ControleCentralSGQ,
  dadosAmbiente?: DadosAmbienteAuditoria
): {
  requisito: RequisitoClienteItem;
  resultado: ResultadoAvaliacaoRequisito;
  statusCor: StatusDeterminacaoPrevia;
  isExcecao: boolean;
  justificativaConclusao: string;
  confiancaScore: number;
  evidenciasIdentificadas: EvidenciaRequisitoItem[];
  fonteDados: string;
  dataEvidencia: string;
  controleUtilizado?: ControleCentralSGQ;
  perguntaInteligente?: PerguntaInteligenteResolucao;
  sugestaoResolucao?: SugestaoResolucaoIA;
} {
  const tools = dadosAmbiente?.ferramentas || [];
  const trainings = dadosAmbiente?.treinamentos || [];
  const docs = dadosAmbiente?.documentos || [];
  const rncs = dadosAmbiente?.rncs || [];
  const baseCodigo = dadosAmbiente?.baseCodigo || 'SOD';

  const textoRequisitoLower = (
    requisito.tituloCurto + ' ' +
    requisito.textoOriginal + ' ' +
    requisito.criterioAceitacao + ' ' +
    (requisito.categoria || '')
  ).toLowerCase();

  // 1. Regra de Não Aplicabilidade (⚪ NA)
  const basesAplicaveis = requisito.aplicabilidadeRegras?.basesAplicaveis;
  if (basesAplicaveis && basesAplicaveis.length > 0 && !basesAplicaveis.includes(baseCodigo) && !basesAplicaveis.includes('TODAS')) {
    return {
      requisito,
      resultado: 'NA',
      statusCor: 'CINZA',
      isExcecao: false,
      justificativaConclusao: `Requisito Não Aplicável à base ${baseCodigo}. O escopo do programa restringe este item às bases: ${basesAplicaveis.join(', ')}.`,
      confiancaScore: 98,
      evidenciasIdentificadas: [],
      fonteDados: 'Regra de Aplicabilidade Geográfica do SGQ',
      dataEvidencia: new Date().toISOString().split('T')[0],
      controleUtilizado: controle,
    };
  }

  // 2. Regra para Ferramentas, Calibração e Metrologia (RBAC 145.109 / Atlas / Kalitta)
  const isToolingRequirement =
    textoRequisitoLower.includes('calibr') ||
    textoRequisitoLower.includes('ferramenta') ||
    textoRequisitoLower.includes('torque') ||
    textoRequisitoLower.includes('tooling') ||
    textoRequisitoLower.includes('instrumento') ||
    requisito.moduloOrigemSugerido === 'MetrologiaFerramental';

  if (isToolingRequirement) {
    // Procura ferramentas cadastradas no sistema
    const ferramentasBase = tools.filter(
      (t) => !t.baseOperacionalNome || t.baseOperacionalNome.includes(baseCodigo) || t.baseOperacionalId === baseCodigo
    );
    const ferramentasVencidas = ferramentasBase.filter(
      (t) => t.status === 'VENCIDA' || (t.dataProximaCalibracao && new Date(t.dataProximaCalibracao) < new Date())
    );
    const ferramentasEmQuarentena = ferramentasBase.filter((t) => t.status === 'QUARANTENA');
    const ferramentasCalibradas = ferramentasBase.filter((t) => t.status === 'CALIBRADA');

    if (ferramentasVencidas.length > 0) {
      // 🔴 NÃO CONFORME: Ferramentas vencidas sem registro de quarentena
      const toolVencida = ferramentasVencidas[0];
      return {
        requisito,
        resultado: 'NAO_CONFORME',
        statusCor: 'VERMELHO',
        isExcecao: true,
        justificativaConclusao: `Identificado(s) ${ferramentasVencidas.length} instrumento(s) com calibração vencida (ex: ${toolVencida.codigoPatrimonio} - ${toolVencida.descricao}, vencido em ${toolVencida.dataProximaCalibracao}).`,
        confiancaScore: 95,
        fonteDados: 'Módulo de Metrologia e Ferramental QualiGest',
        dataEvidencia: toolVencida.dataProximaCalibracao || new Date().toISOString().split('T')[0],
        controleUtilizado: controle,
        evidenciasIdentificadas: [
          {
            id: `EVID-TOOL-${toolVencida.id}`,
            tipo: 'CERTIFICADO_CALIBRACAO',
            titulo: `Certificado Vencido: ${toolVencida.codigoPatrimonio} (${toolVencida.descricao})`,
            numeroReferencia: toolVencida.numeroCertificado || toolVencida.codigoPatrimonio,
            dataEvidencia: toolVencida.dataUltimaCalibracao,
            responsavel: 'Chefe de Ferramentaria',
            organizationId: requisito.organizationId,
            clienteId: requisito.clienteId,
            programaId: requisito.programaId,
            requisitoId: requisito.id,
            controleId: controle?.id,
          },
        ],
        perguntaInteligente: {
          id: `PERG-${requisito.id}`,
          pergunta: `Foram detectados ${ferramentasVencidas.length} instrumentos com calibração expirada na base ${baseCodigo}. Eles ainda estão disponíveis na bancada operacional?`,
          contexto: `Item ${toolVencida.codigoPatrimonio} (${toolVencida.descricao}) expirou em ${toolVencida.dataProximaCalibracao}.`,
          opcaoSim: 'Sim, há novo certificado RBC concluído',
          acaoSimTipo: 'ANEXAR_CERTIFICADO',
          opcaoNao: 'Não, equipamento deve ser segregado imediatamente',
          acaoNaoTipo: 'REGISTRAR_SEGREGAÇÃO',
        },
        sugestaoResolucao: {
          oQueFalta: `Certificado RBC válido ou etiqueta física de segregação/quarentena para o patrimônio ${toolVencida.codigoPatrimonio}.`,
          porQueImpedeConformidade: 'O RBAC 145.109 e os manuais de clientes exigem que nenhum ferramental vencido permaneça na linha de voo.',
          evidenciasPossiveis: [
            'Novo certificado emitido por laboratório RBC/Inmetro',
            'Comprovante de envio para calibração externa',
            'Relatório fotográfico da caixa de quarentena com etiqueta vermelha',
          ],
          controleSugeridoMelhorar: 'CTRL-FERR-01 (Controle Metrológico e Bloqueio Automático)',
          procedimentoRelacionado: 'MPO-FERR-004 - Gestão e Calibração de Ferramental',
          sugestaoAcao: `Segregar fisicamente ${toolVencida.codigoPatrimonio} na gaiola de quarentena e abrir RNC F 001-29.`,
          sugestaoRespostaCliente: `Informamos que o instrumento ${toolVencida.codigoPatrimonio} foi recolhido para calibração em laboratório acreditado RBC e substituído por unidade calibrada.`,
          statusDecisao: 'PENDENTE',
        },
      };
    }

    if (ferramentasCalibradas.length > 0) {
      // 🟢 CONFORME: Ferramentas 100% calibradas
      const amostra = ferramentasCalibradas[0];
      return {
        requisito,
        resultado: 'CONFORME',
        statusCor: 'VERDE',
        isExcecao: false,
        justificativaConclusao: `Controle metrológico validado: ${ferramentasCalibradas.length} instrumento(s) calibrados com certificados RBC vigentes e selos rastreáveis.`,
        confiancaScore: 96,
        fonteDados: 'Banco Metrológico QualiGest',
        dataEvidencia: amostra.dataUltimaCalibracao,
        controleUtilizado: controle,
        evidenciasIdentificadas: ferramentasCalibradas.slice(0, 3).map((f) => ({
          id: `EVID-${f.id}`,
          tipo: 'CERTIFICADO_CALIBRACAO',
          titulo: `Certificado RBC: ${f.codigoPatrimonio} - ${f.descricao}`,
          numeroReferencia: f.numeroCertificado || f.codigoPatrimonio,
          dataEvidencia: f.dataUltimaCalibracao,
          responsavel: f.laboratorioCalibrador || 'Laboratório RBC',
          organizationId: requisito.organizationId,
          clienteId: requisito.clienteId,
          programaId: requisito.programaId,
          requisitoId: requisito.id,
          controleId: controle?.id,
        })),
      };
    }
  }

  // 3. Regra para Treinamentos, CHTs e Pessoal (RBAC 145.163 / Atlas / Kalitta)
  const isTrainingRequirement =
    textoRequisitoLower.includes('treina') ||
    textoRequisitoLower.includes('cht') ||
    textoRequisitoLower.includes('ewis') ||
    textoRequisitoLower.includes('fuel tank') ||
    textoRequisitoLower.includes('fts') ||
    textoRequisitoLower.includes('fatores humanos') ||
    textoRequisitoLower.includes('qualific') ||
    requisito.moduloOrigemSugerido === 'PessoasTreinamentos';

  if (isTrainingRequirement) {
    const hoje = new Date();
    const treinamentosVencidos = trainings.filter(
      (t) => t.dataValidade && new Date(t.dataValidade) < hoje
    );
    const treinamentosProximosVencimento = trainings.filter((t) => {
      if (!t.dataValidade) return false;
      const diffDias = (new Date(t.dataValidade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
      return diffDias >= 0 && diffDias <= 30;
    });

    if (treinamentosVencidos.length > 0) {
      // 🔴 NÃO CONFORME
      const tVenc = treinamentosVencidos[0];
      return {
        requisito,
        resultado: 'NAO_CONFORME',
        statusCor: 'VERMELHO',
        isExcecao: true,
        justificativaConclusao: `Detectado(s) ${treinamentosVencidos.length} registro(s) de treinamento obrigatório vencido (ex: ${tVenc.treinamentoNome || 'Treinamento Obrigatório'} - ${tVenc.colaboradorNome}, expirado em ${tVenc.dataValidade}).`,
        confiancaScore: 94,
        fonteDados: 'Dossiê de Treinamentos e Competências QualiGest',
        dataEvidencia: tVenc.dataValidade,
        controleUtilizado: controle,
        evidenciasIdentificadas: [
          {
            id: `EVID-TREIN-${tVenc.id}`,
            tipo: 'REGISTRO_TREINAMENTO',
            titulo: `Treinamento Expirado: ${tVenc.treinamentoNome}`,
            numeroReferencia: tVenc.numeroCertificado || `COLAB-${tVenc.colaboradorId}`,
            dataEvidencia: tVenc.dataConclusao || tVenc.dataValidade,
            responsavel: 'Coordenação de Treinamento SGQ',
            organizationId: requisito.organizationId,
            clienteId: requisito.clienteId,
            programaId: requisito.programaId,
            requisitoId: requisito.id,
            controleId: controle?.id,
          },
        ],
        perguntaInteligente: {
          id: `PERG-${requisito.id}`,
          pergunta: `O colaborador ${tVenc.colaboradorNome} realizou a reciclagem do curso ${tVenc.treinamentoNome}?`,
          contexto: `O curso de reciclagem obrigatória está registrado como vencido em ${tVenc.dataValidade}.`,
          opcaoSim: 'Sim, treinamento já concluído',
          acaoSimTipo: 'VINCULAR_DADO',
          opcaoNao: 'Não, afastar técnico da liberação de voo',
          acaoNaoTipo: 'BLOQUEAR_ESCALA',
        },
        sugestaoResolucao: {
          oQueFalta: `Comprovante de reciclagem no curso ${tVenc.treinamentoNome} para o colaborador ${tVenc.colaboradorNome}.`,
          porQueImpedeConformidade: 'Técnicos de manutenção não podem liberar voos com habilitação ou treinamento mandatório expirado.',
          evidenciasPossiveis: [
            'Certificado de conclusão emitido por instituição homologada ANAC',
            'Lista de presença e avaliação de eficácia do treinamento',
          ],
          controleSugeridoMelhorar: 'CTRL-TREIN-01 (Matriz de Competências e Alertas Preventivos)',
          procedimentoRelacionado: 'MOMQ Seção 3.4 - Qualificação e Treinamento Técnico',
          sugestaoAcao: `Emitir ordem de afastamento operacional para ${tVenc.colaboradorNome} e agendar turma de reciclagem imediata.`,
          sugestaoRespostaCliente: `O técnico foi preventivamente remanejado para atividades sem liberação até a conclusão da reciclagem de ${tVenc.treinamentoNome}.`,
          statusDecisao: 'PENDENTE',
        },
      };
    }

    if (treinamentosProximosVencimento.length > 0) {
      // 🟡 ATENÇÃO: Vencendo em menos de 30 dias
      const tProx = treinamentosProximosVencimento[0];
      return {
        requisito,
        resultado: 'ATENCAO',
        statusCor: 'AMARELO',
        isExcecao: true,
        justificativaConclusao: `Atenção: ${treinamentosProximosVencimento.length} colaborador(es) com treinamento próximo do vencimento nos próximos 30 dias (ex: ${tProx.treinamentoNome} - ${tProx.colaboradorNome}, vence em ${tProx.dataValidade}).`,
        confiancaScore: 90,
        fonteDados: 'Central Preditiva de Vencimentos QualiGest',
        dataEvidencia: tProx.dataValidade,
        controleUtilizado: controle,
        evidenciasIdentificadas: [
          {
            id: `EVID-TREIN-${tProx.id}`,
            tipo: 'REGISTRO_TREINAMENTO',
            titulo: `Vencimento Próximo: ${tProx.treinamentoNome}`,
            numeroReferencia: `VENCE-${tProx.dataValidade}`,
            dataEvidencia: tProx.dataValidade,
            responsavel: 'Coordenação de Treinamento',
            organizationId: requisito.organizationId,
            clienteId: requisito.clienteId,
            programaId: requisito.programaId,
            requisitoId: requisito.id,
            controleId: controle?.id,
          },
        ],
        perguntaInteligente: {
          id: `PERG-${requisito.id}`,
          pergunta: `A reciclagem de ${tProx.treinamentoNome} para ${tProx.colaboradorNome} já está agendada no cronograma?`,
          contexto: `Prazo expira em menos de 30 dias (${tProx.dataValidade}).`,
          opcaoSim: 'Sim, já agendado para os próximos dias',
          acaoSimTipo: 'CONFIRMAR_USO',
          opcaoNao: 'Não, incluir na escala de treinamento',
          acaoNaoTipo: 'VINCULAR_DADO',
        },
        sugestaoResolucao: {
          oQueFalta: `Inscrição confirmada na próxima turma de reciclagem de ${tProx.treinamentoNome}.`,
          porQueImpedeConformidade: 'Garantir que a validade não expire durante o atendimento a voos da malha do cliente.',
          evidenciasPossiveis: ['Cronograma de treinamentos do mês', 'Confirmação de matrícula do instrutor'],
          controleSugeridoMelhorar: 'CTRL-TREIN-01 (Alertas Preditivos de 30 Dias)',
          procedimentoRelacionado: 'MOMQ Seção 3.4',
          sugestaoAcao: 'Confirmar data da reciclagem e notificar a supervisão de escala de turno.',
          sugestaoRespostaCliente: `O treinamento está vigente e com turma de reciclagem programada antes do vencimento (${tProx.dataValidade}).`,
          statusDecisao: 'PENDENTE',
        },
      };
    }

    if (trainings.length > 0) {
      // 🟢 CONFORME
      return {
        requisito,
        resultado: 'CONFORME',
        statusCor: 'VERDE',
        isExcecao: false,
        justificativaConclusao: 'Quadro técnico 100% qualificado: treinamentos mandatórios e CHTs ANAC vigentes.',
        confiancaScore: 97,
        fonteDados: 'Matriz Oficial de Treinamentos SGQ',
        dataEvidencia: new Date().toISOString().split('T')[0],
        controleUtilizado: controle,
        evidenciasIdentificadas: trainings.slice(0, 3).map((t) => ({
          id: `EVID-${t.id}`,
          tipo: 'REGISTRO_TREINAMENTO',
          titulo: `Treinamento Vigente: ${t.treinamentoNome}`,
          numeroReferencia: t.numeroCertificado || `CERT-${t.id.slice(0, 8)}`,
          dataEvidencia: t.dataConclusao || new Date().toISOString().split('T')[0],
          responsavel: 'Instrutor Homologado',
          organizationId: requisito.organizationId,
          clienteId: requisito.clienteId,
          programaId: requisito.programaId,
          requisitoId: requisito.id,
          controleId: controle?.id,
        })),
      };
    }
  }

  // 4. Regra para Inspeção Física no Pátio / Hangar (🔵 VERIFICAÇÃO NECESSÁRIA)
  const isPhysicalInspectionRequirement =
    textoRequisitoLower.includes('foto') ||
    textoRequisitoLower.includes('housekeeping') ||
    textoRequisitoLower.includes('fod') ||
    textoRequisitoLower.includes('pátio') ||
    textoRequisitoLower.includes('hangar') ||
    textoRequisitoLower.includes('cilindro') ||
    textoRequisitoLower.includes('quarentena') ||
    textoRequisitoLower.includes('extintor') ||
    textoRequisitoLower.includes('segregação') ||
    textoRequisitoLower.includes('loto') ||
    textoRequisitoLower.includes('lockout') ||
    textoRequisitoLower.includes('escada') ||
    textoRequisitoLower.includes('equipamento de apoio');

  if (isPhysicalInspectionRequirement) {
    return {
      requisito,
      resultado: 'VERIFICACAO_NECESSARIA',
      statusCor: 'AZUL',
      isExcecao: true,
      justificativaConclusao: 'Requisito de evidência física presencial no pátio/hangar. O sistema requer registro fotográfico ou checklist de inspeção recente para comprovação.',
      confiancaScore: 82,
      fonteDados: 'Inspeção Presencial / Evidência Fotográfica',
      dataEvidencia: new Date().toISOString().split('T')[0],
      controleUtilizado: controle,
      evidenciasIdentificadas: [],
      perguntaInteligente: {
        id: `PERG-${requisito.id}`,
        pergunta: `A inspeção física do pátio/hangar referente a "${requisito.tituloCurto}" foi realizada recentemente nesta base?`,
        contexto: 'Exigência de evidência fotográfica ou checklist físico assinado.',
        opcaoSim: 'Sim, desejo anexar foto do local agora',
        acaoSimTipo: 'ANEXAR_CERTIFICADO',
        opcaoNao: 'Não, realizar ronda operacional no hangar',
        acaoNaoTipo: 'VINCULAR_DADO',
      },
      sugestaoResolucao: {
        oQueFalta: 'Registro fotográfico nítido com data/hora comprovando a conformidade física no posto.',
        porQueImpedeConformidade: 'Auditores de clientes aéreos exigem evidência fotográfica objetiva das condições operacionais de pátio.',
        evidenciasPossiveis: [
          'Foto da área de trabalho limpa e sem FOD',
          'Foto dos cilindros de nitrogênio/oxigênio devidamente acorrentados e com capacetes de proteção',
          'Foto da caixa de quarentena com tranca e identificação visível',
        ],
        controleSugeridoMelhorar: 'CTRL-PATIO-01 (Inspeções Físicas Diárias e 5S Operacional)',
        procedimentoRelacionado: 'MOMQ Seção 4.8 - Organização e Segurança no Pátio de Aeronaves',
        sugestaoAcao: 'Realizar registro fotográfico utilizando a câmera do tablet ou upload de arquivo no QualiGest.',
        sugestaoRespostaCliente: 'Evidência fotográfica anexada demonstrando o atendimento integral aos padrões operacionais de hangar.',
        statusDecisao: 'PENDENTE',
      },
    };
  }

  // 5. Regra para Controle Documental e Manuais Técnicos (AMM/IPC/SRM)
  const isDocumentRequirement =
    textoRequisitoLower.includes('manual') ||
    textoRequisitoLower.includes('amm') ||
    textoRequisitoLower.includes('revis') ||
    textoRequisitoLower.includes('document') ||
    textoRequisitoLower.includes('publica') ||
    requisito.moduloOrigemSugerido === 'ControleDocumental';

  if (isDocumentRequirement) {
    const docsVencidos = docs.filter((d) => d.status === 'EM_REVISAO' || d.status === 'OBSOLETO');
    if (docsVencidos.length > 0) {
      return {
        requisito,
        resultado: 'ATENCAO',
        statusCor: 'AMARELO',
        isExcecao: true,
        justificativaConclusao: `Atenção: Encontrado(s) ${docsVencidos.length} manual(is) técnico(s) com revisão pendente de sincronização com o portal do operador/fabricante.`,
        confiancaScore: 89,
        fonteDados: 'Lista Mestra de Documentos Controlados QualiGest',
        dataEvidencia: new Date().toISOString().split('T')[0],
        controleUtilizado: controle,
        evidenciasIdentificadas: [
          {
            id: `EVID-DOC-${docsVencidos[0].id}`,
            tipo: 'DOCUMENTO',
            titulo: `Documento em Revisão: ${docsVencidos[0].codigo} (${docsVencidos[0].titulo})`,
            numeroReferencia: `Rev. ${docsVencidos[0].revisaoAtual}`,
            dataEvidencia: docsVencidos[0].dataAprovacao || new Date().toISOString().split('T')[0],
            responsavel: 'Engenharia de Manuais',
            organizationId: requisito.organizationId,
            clienteId: requisito.clienteId,
            programaId: requisito.programaId,
            requisitoId: requisito.id,
            controleId: controle?.id,
          },
        ],
        perguntaInteligente: {
          id: `PERG-${requisito.id}`,
          pergunta: `A última revisão do documento ${docsVencidos[0].codigo} já foi confirmada no portal oficial do cliente?`,
          contexto: 'Evitar divergência de procedimentos durante execução de ordens de serviço.',
          opcaoSim: 'Sim, validar sincronização do acervo',
          acaoSimTipo: 'CONFIRMAR_USO',
          opcaoNao: 'Não, consultar engenharia de publicações',
          acaoNaoTipo: 'VINCULAR_DADO',
        },
        sugestaoResolucao: {
          oQueFalta: 'Confirmação do número de revisão atualizado da publicação técnica no portal do cliente.',
          porQueImpedeConformidade: 'Uso de manuais obsoletos é não conformidade crítica de aeronavegabilidade.',
          evidenciasPossiveis: ['Print do portal MyBoeingFleet / AirbusWorld', 'Protocolo de recebimento de revisão'],
          controleSugeridoMelhorar: 'CTRL-DOC-01 (Monitoramento Contínuo de Fontes Externas)',
          procedimentoRelacionado: 'MPO-DOC-001 - Controle de Publicações Técnicas',
          sugestaoAcao: 'Acessar portal do fabricante e atualizar número de revisão na Lista Mestra.',
          sugestaoRespostaCliente: 'Acervo técnico revisado e alinhado com a última revisão oficial disponibilizada pelo operador.',
          statusDecisao: 'PENDENTE',
        },
      };
    }

    return {
      requisito,
      resultado: 'CONFORME',
      statusCor: 'VERDE',
      isExcecao: false,
      justificativaConclusao: 'Documentação técnica, AMM e procedimentos aplicáveis encontram-se vigentes e aprovados.',
      confiancaScore: 96,
      fonteDados: 'Controle Documental QualiGest',
      dataEvidencia: new Date().toISOString().split('T')[0],
      controleUtilizado: controle,
      evidenciasIdentificadas: docs.slice(0, 2).map((d) => ({
        id: `EVID-${d.id}`,
        tipo: 'DOCUMENTO',
        titulo: `${d.codigo} - ${d.titulo}`,
        numeroReferencia: `Rev. ${d.revisaoAtual}`,
        dataEvidencia: d.dataAprovacao || new Date().toISOString().split('T')[0],
        responsavel: d.aprovadorNome || 'Engenharia SGQ',
        organizationId: requisito.organizationId,
        clienteId: requisito.clienteId,
        programaId: requisito.programaId,
        requisitoId: requisito.id,
        controleId: controle?.id,
      })),
    };
  }

  // 6. Caso Genérico com Controle Central Existente
  if (controle) {
    return {
      requisito,
      resultado: 'CONFORME',
      statusCor: 'VERDE',
      isExcecao: false,
      justificativaConclusao: `Controle operacional central (${controle.codigo} - ${controle.nome}) ativo e com rotina periódica de verificação estabelecida no SGQ.`,
      confiancaScore: 91,
      fonteDados: `Controle Central SGQ (${controle.moduloOrigem})`,
      dataEvidencia: new Date().toISOString().split('T')[0],
      controleUtilizado: controle,
      evidenciasIdentificadas: [
        {
          id: `EVID-CTRL-${controle.id}`,
          tipo: 'DOCUMENTO',
          titulo: `Controle Central Vigente: ${controle.codigo}`,
          numeroReferencia: controle.codigo,
          dataEvidencia: new Date().toISOString().split('T')[0],
          responsavel: 'Garantia da Qualidade Impacto Aviation',
          organizationId: requisito.organizationId,
          clienteId: requisito.clienteId,
          programaId: requisito.programaId,
          requisitoId: requisito.id,
          controleId: controle.id,
        },
      ],
    };
  }

  // 7. Lacuna de Controle (🔵 Verificação Necessária / Exceção)
  return {
    requisito,
    resultado: 'VERIFICACAO_NECESSARIA',
    statusCor: 'AZUL',
    isExcecao: true,
    justificativaConclusao: 'Requisito específico sem controle central automatizado cadastrado. Necessita verificação manual do auditor.',
    confiancaScore: 65,
    fonteDados: 'Verificação Manual SGQ',
    dataEvidencia: new Date().toISOString().split('T')[0],
    evidenciasIdentificadas: [],
    perguntaInteligente: {
      id: `PERG-${requisito.id}`,
      pergunta: `Existe evidência física ou registro operacional que atenda a "${requisito.tituloCurto}"?`,
      contexto: 'Não há mapeamento automático preexistente no sistema.',
      opcaoSim: 'Sim, possuo evidência para anexar',
      acaoSimTipo: 'ANEXAR_CERTIFICADO',
      opcaoNao: 'Não, criar plano de ação corretiva no SGQ',
      acaoNaoTipo: 'ABRIR_RNC',
    },
    sugestaoResolucao: {
      oQueFalta: `Vínculo com um Controle Central SGQ ou anexo de evidência comprobatória para ${requisito.numeroItem}.`,
      porQueImpedeConformidade: 'Requisito não pode ser considerado atendido sem evidência rastreável.',
      evidenciasPossiveis: ['Procedimento Operacional Padronizado (POP)', 'Checklist assinado pelo responsável técnico'],
      controleSugeridoMelhorar: 'Novo Controle Central a ser criado para padronizar o processo',
      procedimentoRelacionado: 'MOMQ Seção 1.2 - Política da Qualidade',
      sugestaoAcao: 'Vincular a um procedimento operacional existente ou anexar evidência documental.',
      sugestaoRespostaCliente: 'Requisito atendido conforme sistemática operacional descrita no procedimento interno.',
      statusDecisao: 'PENDENTE',
    },
  };
}

/**
 * Enriquece a avaliação básica do requisito com Inteligência de Auditoria 2.0:
 * Memória Histórica de Auditorias Anteriores, Verificação Temporal de Revisões de Documentos,
 * Análise de O Que Já Temos vs Lacunas, e Sugestões para Auditoria Interna.
 */
function enriquecerAvaliacaoInteligente(
  baseItem: {
    requisito: RequisitoClienteItem;
    resultado: ResultadoAvaliacaoRequisito;
    statusCor: StatusDeterminacaoPrevia;
    isExcecao: boolean;
    justificativaConclusao: string;
    confiancaScore: number;
    evidenciasIdentificadas: EvidenciaRequisitoItem[];
    fonteDados: string;
    dataEvidencia: string;
    controleUtilizado?: ControleCentralSGQ;
    perguntaInteligente?: PerguntaInteligenteResolucao;
    sugestaoResolucao?: SugestaoResolucaoIA;
  },
  dadosAmbiente?: DadosAmbienteAuditoria
): ResultadoAvaliacaoInteligenteItem {
  const req = baseItem.requisito;
  const audits = dadosAmbiente?.audits || [];
  const findings = dadosAmbiente?.findings || [];
  const docs = dadosAmbiente?.documentos || [];
  const rncs = dadosAmbiente?.rncs || [];
  const tools = dadosAmbiente?.ferramentas || [];
  const trainings = dadosAmbiente?.treinamentos || [];

  const reqTextLower = (
    (req.numeroItem || '') + ' ' +
    (req.tituloCurto || '') + ' ' +
    (req.textoOriginal || '') + ' ' +
    (req.criterioAceitacao || '') + ' ' +
    (req.categoria || '')
  ).toLowerCase();

  // 1. O QUE JÁ TEMOS NO QUALIGEST
  const procedimentosEncontrados: string[] = [];
  const manuaisEncontrados: string[] = ['Manual da Organização de Manutenção (MOMQ)'];
  const evidenciasEncontradas: string[] = (baseItem.evidenciasIdentificadas || []).map((e) => e.titulo);

  // Procura procedimentos relevantes
  if (reqTextLower.includes('calibr') || reqTextLower.includes('ferramen') || reqTextLower.includes('torque')) {
    procedimentosEncontrados.push('MPO-FERR-004 (Gestão e Calibração de Ferramental)');
    manuaisEncontrados.push('Manual de Procedimentos Operacionais (MPO)');
  }
  if (reqTextLower.includes('treina') || reqTextLower.includes('cht') || reqTextLower.includes('ewis') || reqTextLower.includes('fts')) {
    procedimentosEncontrados.push('P 001-05 (Qualificação e Treinamento Mandatório)');
    manuaisEncontrados.push('Manual de Treinamento da Empresa (MTE)');
  }
  if (reqTextLower.includes('manual') || reqTextLower.includes('amm') || reqTextLower.includes('revis') || reqTextLower.includes('publica')) {
    procedimentosEncontrados.push('MPO-DOC-001 (Controle de Publicações Técnicas e Revisões)');
  }
  if (reqTextLower.includes('fod') || reqTextLower.includes('pátio') || reqTextLower.includes('hangar') || reqTextLower.includes('housekeeping')) {
    procedimentosEncontrados.push('POP-PATIO-002 (Inspeção Operacional de Pátio e Prevenção FOD)');
  }
  if (procedimentosEncontrados.length === 0) {
    procedimentosEncontrados.push('MOMQ Seção Geral de Manutenção e Qualidade');
  }

  // 2. BUSCA EM MEMÓRIA HISTÓRICA DE AUDITORIAS ANTERIORES
  let respostaHistorica: RespostaHistoricaDetalhe | undefined = undefined;

  // Busca constatação prévia relacionada ao assunto
  const matchingFinding = findings.find((f) => {
    const fDesc = (f.descricaoOriginal + ' ' + (f.interpretacaoInterna || '') + ' ' + (f.numeroExterno || '')).toLowerCase();
    if (req.numeroItem && fDesc.includes(req.numeroItem.toLowerCase())) return true;
    if (reqTextLower.includes('calibr') && (fDesc.includes('calibr') || fDesc.includes('ferramenta') || fDesc.includes('torque'))) return true;
    if (reqTextLower.includes('ewis') && fDesc.includes('ewis')) return true;
    if (reqTextLower.includes('fuel tank') && (fDesc.includes('fuel') || fDesc.includes('fts'))) return true;
    if (reqTextLower.includes('fod') && (fDesc.includes('fod') || fDesc.includes('pátio'))) return true;
    if (reqTextLower.includes('manual') && (fDesc.includes('manual') || fDesc.includes('amm') || fDesc.includes('revisão'))) return true;
    return false;
  });

  if (matchingFinding) {
    const parentAudit = audits.find((a) => a.id === matchingFinding.auditId);
    const clienteHistorico = parentAudit?.entidadeAuditora || parentAudit?.origem || 'Auditoria Externa';
    const numeroAud = parentAudit?.numeroAuditoria || 'AUD-ANTERIOR';
    const dataAud = parentAudit?.dataInicio || matchingFinding.createdAt || '2025';

    // Determina status de aceitação com diferenciação estrita (Requisito 8)
    let statusAceite: RespostaHistoricaDetalhe['statusAceitacao'] = 'ACEITACAO_DESCONHECIDA';
    if (matchingFinding.status === 'ACEITA') {
      statusAceite = 'RESPOSTA_ACEITA';
    } else if (matchingFinding.status === 'REJEITADA') {
      statusAceite = 'RESPOSTA_REJEITADA';
    } else if (matchingFinding.status === 'ENVIADA' || matchingFinding.status === 'RESPOSTA_ELABORADA') {
      statusAceite = 'RESPOSTA_ENVIADA';
    } else if (matchingFinding.rncInternaCriadaId) {
      const rncVinculada = rncs.find((r) => r.id === matchingFinding.rncInternaCriadaId);
      if (rncVinculada && (rncVinculada.statusGeral === 'Encerrada' || rncVinculada.verificacaoEficacia?.encerrado === 'SIM')) {
        statusAceite = rncVinculada.verificacaoEficacia?.encerrado === 'SIM' ? 'ACAO_EFICAZ' : 'RNC_ENCERRADA_INTERNAMENTE';
      }
    }

    // Calcula peso de confiabilidade baseado em comprovação de aceite (Requisito 10)
    let peso = 60;
    if (statusAceite === 'RESPOSTA_ACEITA') {
      peso = 95;
      if (req.clienteNome && clienteHistorico.toLowerCase().includes(req.clienteNome.toLowerCase())) {
        peso = 98; // Mesmo cliente e resposta aceita formalmente!
      }
    } else if (statusAceite === 'ACAO_EFICAZ' || statusAceite === 'RNC_ENCERRADA_INTERNAMENTE') {
      peso = 85;
    } else if (statusAceite === 'RESPOSTA_REJEITADA') {
      peso = 15; // Alerta crítico: resposta já foi rejeitada antes!
    }

    // Controle Documental e Verificação Temporal de Revisão (Requisito 14)
    const docMencionado = matchingFinding.respostaOficial?.acaoCorretiva?.includes('P 001-05') ? 'P 001-05' : 'MOMQ';
    const docControladoVigente = docs.find((d) => d.codigo.includes(docMencionado));
    const revisaoNaEpoca = '00';
    const revisaoAtual = docControladoVigente?.revisaoAtual || '01';
    const revisaoMudou = revisaoNaEpoca !== revisaoAtual;

    let alertaRevisao: string | undefined = undefined;
    if (revisaoMudou) {
      alertaRevisao = `⚠️ ALERTA TEMPORAL DE REVISÃO: O procedimento ${docMencionado} estava na Rev. ${revisaoNaEpoca} durante a auditoria anterior e atualmente está na Rev. ${revisaoAtual}. Verifique se as regras operacionais foram alteradas antes de reaproveitar a resposta!`;
      peso = Math.round(peso * 0.75); // Reduz confiança se o procedimento foi revisado
    } else {
      alertaRevisao = `Procedimento ${docMencionado} continua na mesma revisão (${revisaoAtual}) e vigente no SGQ.`;
    }

    const respostaTexto = [
      matchingFinding.respostaOficial?.correcaoImediata,
      matchingFinding.respostaOficial?.analiseCausa ? `Causa: ${matchingFinding.respostaOficial.analiseCausa}` : '',
      matchingFinding.respostaOficial?.acaoCorretiva ? `Ação Corretiva: ${matchingFinding.respostaOficial.acaoCorretiva}` : ''
    ].filter(Boolean).join(' | ') || matchingFinding.interpretacaoInterna || 'Resposta técnica registrada no SGQ.';

    respostaHistorica = {
      auditoriaId: matchingFinding.auditId,
      numeroAuditoria: numeroAud,
      cliente: clienteHistorico,
      anoOuData: dataAud,
      requisitoTexto: matchingFinding.descricaoOriginal,
      respostaUtilizada: respostaTexto,
      evidencias: (matchingFinding.respostaOficial as any)?.evidenciasCitadas || matchingFinding.respostaOficial?.referenciasDocumentais || ['Dossiê técnico aprovado', 'Lista de presença'],
      statusAceitacao: statusAceite,
      decisaoAuditorDetalhe: statusAceite === 'RESPOSTA_ACEITA' ? 'Resposta aceita formalmente pelo auditor externo sem ressalvas.' : 'Pendente de comprovação de aceite formal.',
      documentoUtilizado: docMencionado,
      revisaoNaEpoca,
      revisaoVigenteAtual: revisaoAtual,
      revisaoMudou,
      alertaRevisao,
      pesoConfiabilidade: peso,
    };
  }

  // 3. DETALHAMENTO DE "O QUE FALTA", "O QUE DEVERÍAMOS VERIFICAR" E "ONDE BUSCAR" (Requisito 12)
  let oQueFalta = '';
  let oQueDevemosVerificar = '';
  let ondeBuscar = '';

  if (baseItem.resultado === 'NAO_CONFORME') {
    if (reqTextLower.includes('calibr')) {
      oQueFalta = 'Certificados de calibração RBC válidos para os instrumentos expirados ou etiqueta de segregação física imediata.';
      oQueDevemosVerificar = 'Confirmar se os equipamentos vencidos foram recolhidos da bancada e alocados na caixa de quarentena trancada.';
      ondeBuscar = 'Ferramentas & Metrologia → Instrumentos em Quarentena / Laudos RBC.';
    } else if (reqTextLower.includes('treina')) {
      oQueFalta = 'Comprovante de reciclagem de treinamento obrigatório (EWIS / FTS / HF) com certificado assinado pelo instrutor.';
      oQueDevemosVerificar = 'Consultar escala dos colaboradores da base para agendar reciclagem antes da visita do auditor.';
      ondeBuscar = 'Pessoas & Competências → Dossiê de Treinamentos e Qualificações.';
    } else {
      oQueFalta = 'Evidência objetiva auditável conforme o critério de aceitação do requisito.';
      oQueDevemosVerificar = 'Confirmar execução do procedimento e assinatura dos técnicos responsáveis.';
      ondeBuscar = 'Controle Documental & Registros Operacionais.';
    }
  } else if (baseItem.resultado === 'VERIFICACAO_NECESSARIA') {
    oQueFalta = 'Registro fotográfico atualizado ou checklist de verificação física no local.';
    oQueDevemosVerificar = 'Fazer ronda operacional no pátio/hangar e registrar foto comprobatória com identificação clara da base.';
    ondeBuscar = 'Pátio Operacional / Cockpit de Auditoria Inteligente (Anexar Evidência Auditável).';
  } else if (baseItem.resultado === 'ATENCAO') {
    oQueFalta = 'Sincronização de número de revisão com o portal oficial do cliente ou fabricante.';
    oQueDevemosVerificar = 'Conferir no portal AirbusWorld ou MyBoeingFleet o número da última emenda do manual técnico.';
    ondeBuscar = 'Controle Documental → Acervo & Publicações Técnicas.';
  } else {
    oQueFalta = 'Nenhuma pendência crítica identificada. Requisito com conformidade preventiva atendida.';
    oQueDevemosVerificar = 'Manter disponibilidade do dossiê para rápida amostragem ao auditor do cliente.';
    ondeBuscar = 'QualiGest SGQ - Controles Centrais Validados.';
  }

  // 4. SUGESTÃO PARA PROGRAMA DE AUDITORIA INTERNA (Requisito 15)
  let sugestaoAuditoriaInterna: SugestaoAuditoriaInterna | undefined = undefined;
  const isTemaRecorrente = reqTextLower.includes('calibr') || reqTextLower.includes('ewis') || reqTextLower.includes('fts') || reqTextLower.includes('fod');
  if (isTemaRecorrente || baseItem.isExcecao) {
    sugestaoAuditoriaInterna = {
      sugerirInclusao: true,
      temaRecorrente: reqTextLower.includes('calibr') ? 'Controle Metrológico e Ferramental Especial' : reqTextLower.includes('ewis') ? 'Competências e Treinamentos EWIS/FTS' : 'Prevenção de FOD e Organização no Pátio',
      frequenciaRecorrencia: matchingFinding ? 3 : 1,
      clientesQueExigem: [req.clienteNome || 'Clientes Aéreos', 'Atlas Air', 'Kalitta Air', 'SWISS'],
      justificativa: `Item com histórico de exigência e impacto na segurança operacional. Recomendado para o Plano Anual de Auditoria Interna F 001-08.`,
    };
  }

  // 5. PROPOSTA DE RESPOSTA INTELIGENTE E SUSTENTAÇÃO (Requisito 11 e 12)
  let textoResposta = '';
  if (respostaHistorica && respostaHistorica.statusAceitacao === 'RESPOSTA_ACEITA' && !respostaHistorica.revisaoMudou) {
    textoResposta = `Conforme prática validada e aceita pelo auditor na auditoria ${respostaHistorica.numeroAuditoria} (${respostaHistorica.cliente}), a IMPACTO cumpre o requisito através do procedimento ${respostaHistorica.documentoUtilizado} (Rev. ${respostaHistorica.revisaoVigenteAtual}) e apresentação de evidências rastreáveis (${respostaHistorica.evidencias.join(', ')}).`;
  } else if (baseItem.resultado === 'CONFORME') {
    textoResposta = `A IMPACTO cumpre integralmente o requisito através do controle centralizado ${baseItem.controleUtilizado?.codigo || 'SGQ'}, respaldado pelas rotinas descritas no ${procedimentosEncontrados[0] || 'MOMQ'} e registros de conformidade vigentes.`;
  } else {
    textoResposta = baseItem.sugestaoResolucao?.sugestaoRespostaCliente || `A IMPACTO informa que o plano de adequação para a base está em execução, com segregação de itens pendentes e regularização documental sob o procedimento ${procedimentosEncontrados[0]}.`;
  }

  const propostaResposta: PropostaRespostaIA = {
    textoRespostaSugerida: textoResposta,
    baseDaResposta: procedimentosEncontrados,
    evidenciasSustentacao: evidenciasEncontradas.length > 0 ? evidenciasEncontradas : ['Dossiê da Qualidade Impacto Aviation'],
    historicoUtilizado: respostaHistorica ? `${respostaHistorica.numeroAuditoria} (${respostaHistorica.cliente}) - Aceitação: ${respostaHistorica.statusAceitacao}` : undefined,
    limitacoes: baseItem.isExcecao ? [oQueFalta] : [],
    recomendacoes: [oQueDevemosVerificar],
  };

  // 6. DETERMINAÇÃO DA PRIORIDADE NO COCKPIT E CLASSIFICAÇÃO INTELIGENTE
  let cockpitPrioridade: CockpitPrioridade = 'PREPARADO';
  if (baseItem.resultado === 'NAO_CONFORME' || req.criticidade === 'CRITICO') {
    cockpitPrioridade = 'CRITICO';
  } else if (baseItem.resultado === 'ATENCAO' || respostaHistorica?.revisaoMudou) {
    cockpitPrioridade = 'ATENCAO';
  } else if (baseItem.resultado === 'VERIFICACAO_NECESSARIA') {
    cockpitPrioridade = 'VERIFICACAO';
  } else if (respostaHistorica && respostaHistorica.statusAceitacao === 'RESPOSTA_ACEITA') {
    cockpitPrioridade = 'HISTORICO';
  }

  let classificacaoInteligente: ClassificacaoInteligenteRequisito = 'CONFORME';
  if (baseItem.resultado === 'NAO_CONFORME') classificacaoInteligente = 'NAO_CONFORME';
  else if (baseItem.resultado === 'ATENCAO') classificacaoInteligente = 'ATENCAO';
  else if (baseItem.resultado === 'VERIFICACAO_NECESSARIA') classificacaoInteligente = 'VERIFICACAO_NECESSARIA';
  else if (baseItem.resultado === 'NA') classificacaoInteligente = 'NAO_APLICAVEL';
  else if (respostaHistorica) classificacaoInteligente = 'RESPOSTA_HISTORICA_DISPONIVEL';

  return {
    ...baseItem,
    cockpitPrioridade,
    classificacaoInteligente,
    oQueJaTemos: {
      procedimentos: procedimentosEncontrados,
      manuais: manuaisEncontrados,
      evidencias: evidenciasEncontradas,
      auditoriaAnterior: respostaHistorica?.numeroAuditoria,
      respostaAnterior: respostaHistorica?.respostaUtilizada,
      treinamento: reqTextLower.includes('treina') ? 'EWIS / FTS Phase 2 / Human Factors' : undefined,
      registro: reqTextLower.includes('calibr') ? 'Laudo RBC com número de série' : undefined,
      rncRelacionada: matchingFinding?.numeroRNCInterna ? `RNC-${matchingFinding.numeroRNCInterna}` : undefined,
    },
    respostaHistorica,
    propostaResposta,
    oQueFalta,
    oQueDevemosVerificar,
    ondeBuscar,
    sugestaoAuditoriaInterna,
  };
}

/**
 * Calcula o Resumo de Auditoria por Exceção para um conjunto de requisitos
 */
export function calcularResumoAuditoriaPorExcecao(
  avaliacoes: ResultadoAvaliacaoInteligenteItem[]
): ResumoAuditoriaPorExcecao {
  const total = avaliacoes.length;
  if (total === 0) {
    return {
      totalRequisitos: 0,
      totalResolvidosAutomaticamente: 0,
      totalConformes: 0,
      totalNaoAplicaveis: 0,
      totalExcecoes: 0,
      totalNaoConformes: 0,
      totalAtencao: 0,
      totalVerificacaoNecessaria: 0,
      percentualAutomatizado: 100,
      totalCritico: 0,
      totalAtencaoCockpit: 0,
      totalVerificacao: 0,
      totalHistorico: 0,
      totalPreparado: 0,
    };
  }

  let totalConformes = 0;
  let totalNaoAplicaveis = 0;
  let totalNaoConformes = 0;
  let totalAtencao = 0;
  let totalVerificacaoNecessaria = 0;

  let totalCritico = 0;
  let totalAtencaoCockpit = 0;
  let totalVerificacao = 0;
  let totalHistorico = 0;
  let totalPreparado = 0;

  avaliacoes.forEach((a) => {
    switch (a.resultado) {
      case 'CONFORME':
        totalConformes++;
        break;
      case 'NA':
        totalNaoAplicaveis++;
        break;
      case 'NAO_CONFORME':
        totalNaoConformes++;
        break;
      case 'ATENCAO':
        totalAtencao++;
        break;
      case 'VERIFICACAO_NECESSARIA':
        totalVerificacaoNecessaria++;
        break;
    }

    switch (a.cockpitPrioridade) {
      case 'CRITICO':
        totalCritico++;
        break;
      case 'ATENCAO':
        totalAtencaoCockpit++;
        break;
      case 'VERIFICACAO':
        totalVerificacao++;
        break;
      case 'HISTORICO':
        totalHistorico++;
        break;
      case 'PREPARADO':
        totalPreparado++;
        break;
    }
  });

  const totalResolvidosAutomaticamente = totalConformes + totalNaoAplicaveis;
  const totalExcecoes = totalNaoConformes + totalAtencao + totalVerificacaoNecessaria;
  const percentualAutomatizado = Math.round((totalResolvidosAutomaticamente / total) * 100);

  return {
    totalRequisitos: total,
    totalResolvidosAutomaticamente,
    totalConformes,
    totalNaoAplicaveis,
    totalExcecoes,
    totalNaoConformes,
    totalAtencao,
    totalVerificacaoNecessaria,
    percentualAutomatizado,
    totalCritico,
    totalAtencaoCockpit,
    totalVerificacao,
    totalHistorico,
    totalPreparado,
  };
}
