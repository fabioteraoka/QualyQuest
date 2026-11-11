/**
 * SERVIÇO DE GESTÃO CONTÍNUA DA CONFORMIDADE — QUALYQUEST (FASE 1.4.1)
 * 
 * Funcionalidades:
 * 1. Cálculo dos Indicadores do Painel de Trabalho da Qualidade (Quality Compliance Dashboard).
 * 2. Gestão dos Controles Corporativos Centrais (CTRL-*) e vínculos com Requisitos Individuais.
 * 3. Matriz de Auditoria e Rastreabilidade da Consolidação (177 originais -> 36 canônicos).
 * 4. Validação de Aplicabilidade (Independente) e Conformidade (Independente).
 * 5. Reutilização de Evidências Corporativas entre Auditorias ANAC e Clientes.
 * 6. Histórico e Imutabilidade de Auditorias Concluídas.
 */

import {
  ControleCentralSGQ,
  RequisitoClienteItem,
  EvidenciaRequisitoItem,
  RespostaInstitucionalAprovada,
  StatusConformidadeSGQ,
  SituacaoAplicabilidadeImpacto,
  UserProfile
} from '../types';
import {
  AUDITORIA_CONSOLIDACAO_DATA,
  ItemAuditoriaConsolidacao,
  TipoRelacionamentoNormativo
} from '../data/canonicalCriteriaAuditData';
import { CONTROLES_CORPORATIVOS_EXPANDIDOS, INITIAL_COMPLIANCE_EVIDENCES, INITIAL_INSTITUTIONAL_RESPONSES } from './corporateComplianceMatrixService';

export interface IndicadoresPainelQualidade {
  controlesSemResponsavel: number;
  requisitosSemAplicabilidade: number;
  requisitosNaoAvaliadosConformidade: number;
  controlesNaoConformes: number;
  evidenciasAusentes: number;
  evidenciasVencidas: number;
  respostasPendentesAprovacao: number;
  avaliacoesPeriodicasVencidas: number;
  registrosPendentesDocumentacao: number;
  taxaConformidadeGeral: number;
  totalControlesAtivos: number;
  totalRequisitosMapeados: number;
}

export interface ResumoAuditoriaConsolidacao {
  totalRegistrosOriginais: number;
  totalCriteriosCanonicos: number;
  equivalentes: number;
  parcialmenteEquivalentes: number;
  relacionadosNaoEquivalentes: number;
  especificosDaFonte: number;
  naoDeterminadoOuPendente: number;
  totalVinculosNormativos: number;
  fontesValidadasOficiais: number;
  fontesPendentesDocumentacao: number;
}

/**
 * Calcula os indicadores em tempo real para o Painel de Trabalho da Qualidade
 */
export function calcularIndicadoresPainelQualidade(
  controles: ControleCentralSGQ[],
  requisitos: RequisitoClienteItem[],
  evidencias: EvidenciaRequisitoItem[],
  respostas: RespostaInstitucionalAprovada[]
): IndicadoresPainelQualidade {
  const hoje = new Date().toISOString().split('T')[0];

  // 1. Controles sem responsável
  const controlesSemResponsavel = controles.filter(
    (c) => !c.responsavelPadrao || c.responsavelPadrao.trim() === ''
  ).length;

  // 2. Requisitos sem avaliação de aplicabilidade
  const requisitosSemAplicabilidade = requisitos.filter(
    (r) =>
      !r.aplicabilidadeContexto ||
      r.aplicabilidadeContexto.situacao === 'AGUARDANDO_AVALIACAO' ||
      !r.aplicabilidadeContexto.situacao
  ).length;

  // 3. Requisitos não avaliados quanto à conformidade
  const requisitosNaoAvaliadosConformidade = requisitos.filter(
    (r) => !r.statusValidacao || r.statusValidacao === 'PENDENTE_VALIDACAO'
  ).length;

  // 4. Controles não conformes
  const controlesNaoConformes = controles.filter(
    (c) => c.statusConformidade === 'NAO_CONFORME'
  ).length;

  // 5. Evidências ausentes em controles ativos
  const evidenciasAusentes = controles.filter(
    (c) => !c.evidenciasVinculadasIds || c.evidenciasVinculadasIds.length === 0
  ).length;

  // 6. Evidências vencidas (data de validade ultrapassada)
  const evidenciasVencidas = evidencias.filter(
    (e) => e.dataValidade && e.dataValidade < hoje
  ).length;

  // 7. Respostas institucionais pendentes de aprovação
  const respostasPendentesAprovacao = respostas.filter(
    (r) => r.status === 'EM_VALIDACAO' || r.status === 'RASCUNHO'
  ).length;

  // 8. Avaliações periódicas de controles vencidas
  const avaliacoesPeriodicasVencidas = controles.filter(
    (c) => c.dataProximaAvaliacao && c.dataProximaAvaliacao < hoje
  ).length;

  // 9. Registros pendentes de documentação na auditoria de consolidação
  const registrosPendentesDocumentacao = AUDITORIA_CONSOLIDACAO_DATA.filter(
    (item) => item.statusValidacaoDocumental === 'PENDENTE_VALIDACAO_DOCUMENTAL'
  ).length;

  // Taxa de conformidade dos controles
  const controlesAvaliados = controles.filter(
    (c) => c.statusConformidade === 'CONFORME' || c.statusConformidade === 'NAO_CONFORME'
  );
  const conformes = controles.filter((c) => c.statusConformidade === 'CONFORME').length;
  const taxaConformidadeGeral =
    controlesAvaliados.length > 0
      ? Math.round((conformes / controlesAvaliados.length) * 100)
      : 100;

  return {
    controlesSemResponsavel,
    requisitosSemAplicabilidade,
    requisitosNaoAvaliadosConformidade,
    controlesNaoConformes,
    evidenciasAusentes,
    evidenciasVencidas,
    respostasPendentesAprovacao,
    avaliacoesPeriodicasVencidas,
    registrosPendentesDocumentacao,
    taxaConformidadeGeral,
    totalControlesAtivos: controles.length,
    totalRequisitosMapeados: requisitos.length
  };
}

/**
 * Retorna as métricas de classificação da Auditoria de Consolidação (Fase 1.4.1)
 */
export function getResumoAuditoriaConsolidacao(): ResumoAuditoriaConsolidacao {
  const totalRegistrosOriginais = 177;
  const totalCriteriosCanonicos = 36;
  const equivalentes = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.tipoRelacionamento === 'Equivalente').length;
  const parcialmenteEquivalentes = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.tipoRelacionamento === 'Parcialmente equivalente').length;
  const relacionadosNaoEquivalentes = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.tipoRelacionamento === 'Relacionado, mas não equivalente').length;
  const especificosDaFonte = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.tipoRelacionamento === 'Específico da fonte').length;
  const naoDeterminadoOuPendente = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.tipoRelacionamento === 'Não foi possível determinar').length;
  
  const fontesValidadasOficiais = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.statusValidacaoDocumental === 'VALIDADO_OFICIAL').length;
  const fontesPendentesDocumentacao = AUDITORIA_CONSOLIDACAO_DATA.filter((i) => i.statusValidacaoDocumental === 'PENDENTE_VALIDACAO_DOCUMENTAL').length;

  return {
    totalRegistrosOriginais,
    totalCriteriosCanonicos,
    equivalentes,
    parcialmenteEquivalentes,
    relacionadosNaoEquivalentes,
    especificosDaFonte,
    naoDeterminadoOuPendente,
    totalVinculosNormativos: 177,
    fontesValidadasOficiais,
    fontesPendentesDocumentacao
  };
}

/**
 * Contexto de Auditoria e Requisito para validação rigorosa de evidências
 */
export interface ContextoValidacaoEvidencia {
  baseOperacional: string;
  clienteOuAutoridade: string;
  requisitoId?: string;
  requisitoNormaOuCodigo?: string;
  exigeValidadeTemporal?: boolean;
}

/**
 * Validação de aplicabilidade de evidência reutilizada (Fase 1.4.3):
 * Executa as 7 validações reais e objetivas de compatibilidade técnica e legal.
 */
export function validarAplicabilidadeEvidencia(
  evidencia: EvidenciaRequisitoItem,
  contexto: ContextoValidacaoEvidencia
): { valida: boolean; motivo?: string; codigoRegra?: string } {
  const hoje = new Date().toISOString().split('T')[0];

  // Regra 1: Documento sem data de validade quando o requisito exige vigência temporal
  if (contexto.exigeValidadeTemporal && !evidencia.dataValidade) {
    return {
      valida: false,
      motivo: 'Evidência sem data de validade cadastrada para requisito que exige controle periódico estrito.',
      codigoRegra: 'SEM_DATA_VALIDADE'
    };
  }

  // Regra 2: Certificado ou evidência vencida por data
  if (evidencia.dataValidade && evidencia.dataValidade < hoje) {
    return {
      valida: false,
      motivo: `Evidência vencida em ${evidencia.dataValidade}. Requer calibração metrológica ou renovação de treinamento.`,
      codigoRegra: 'EVIDENCIA_VENCIDA'
    };
  }

  // Regra 3: Status de validade vencido ou substituído por revisão recente
  if (evidencia.statusValidade === 'VENCIDO') {
    return {
      valida: false,
      motivo: 'Evidência com status VENCIDO no acervo SGQ. Requer aprovação da Engenharia da Qualidade ou renovação.',
      codigoRegra: 'STATUS_VENCIDO'
    };
  }

  // Regra 4: Evidência restrita por Base Operacional (ex: ferramentaria ou instalação local)
  if (
    evidencia.baseOperacional &&
    evidencia.baseOperacional !== 'TODAS' &&
    contexto.baseOperacional &&
    contexto.baseOperacional !== 'TODAS' &&
    evidencia.baseOperacional !== contexto.baseOperacional
  ) {
    return {
      valida: false,
      motivo: `Evidência restrita à base [${evidencia.baseOperacional}]. Não comprova conformidade na base [${contexto.baseOperacional}].`,
      codigoRegra: 'BASE_INCOMPATIVEL'
    };
  }

  // Regra 5: Evidência específica de cliente não aplicável a outro (ex: autorização RII Kalitta vs Atlas Air)
  if (
    evidencia.clienteNome &&
    evidencia.clienteNome !== 'TODOS' &&
    contexto.clienteOuAutoridade &&
    !contexto.clienteOuAutoridade.includes('ANAC') &&
    !contexto.clienteOuAutoridade.includes('INTERNO') &&
    evidencia.clienteNome.toLowerCase() !== contexto.clienteOuAutoridade.toLowerCase() &&
    !contexto.clienteOuAutoridade.toLowerCase().includes(evidencia.clienteNome.toLowerCase())
  ) {
    return {
      valida: false,
      motivo: `Evidência emitida com escopo restrito para o cliente [${evidencia.clienteNome}]. Não pode ser aproveitada para [${contexto.clienteOuAutoridade}] sem autorização bilateral.`,
      codigoRegra: 'CLIENTE_INCOMPATIVEL'
    };
  }

  // Regra 6: Treinamento insuficiente para escopo técnico (ex: Fatores Humanos ANAC não atende EWIS EASA ou GMM Kalitta)
  if (contexto.requisitoNormaOuCodigo) {
    const reqRef = contexto.requisitoNormaOuCodigo.toLowerCase();
    const tituloEv = (evidencia.titulo || '').toLowerCase();
    const descEv = (evidencia.descricao || '').toLowerCase();

    // Se o requisito exige EWIS / CDCCL da EASA
    if ((reqRef.includes('ewis') || reqRef.includes('cdccl') || reqRef.includes('145.a.30(e)')) &&
        !tituloEv.includes('ewis') && !tituloEv.includes('cdccl') && !descEv.includes('ewis')) {
      return {
        valida: false,
        motivo: 'Certificado de treinamento genérico (Fatores Humanos / SGSO) não comprova cumprimento do módulo mandatório EWIS / CDCCL (EASA).',
        codigoRegra: 'EMENTA_TREINAMENTO_INSUFICIENTE'
      };
    }

    // Se o requisito exige GMM específico da Kalitta Air
    if ((reqRef.includes('kalitta') || reqRef.includes('qa-14')) &&
        reqRef.includes('gmm') &&
        !tituloEv.includes('kalitta') && !descEv.includes('kalitta')) {
      return {
        valida: false,
        motivo: 'Treinamento de procedimentos internos da OM não atende ao requisito mandatório de familiarização no GMM da Kalitta Air.',
        codigoRegra: 'GMM_CLIENTE_AUSENTE'
      };
    }
  }

  // Regra 7: Evidência aceita
  return { valida: true };
}
