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
 * Validação de aplicabilidade de evidência reutilizada:
 * Verifica se a evidência é válida, se está no prazo e se cobre a base e o escopo da auditoria.
 */
export function validarAplicabilidadeEvidencia(
  evidencia: EvidenciaRequisitoItem,
  contextoAuditoria: { baseOperacional: string; clienteOuAutoridade: string }
): { valida: boolean; motivo?: string } {
  const hoje = new Date().toISOString().split('T')[0];

  // 1. Verificar prazo de validade
  if (evidencia.dataValidade && evidencia.dataValidade < hoje) {
    return {
      valida: false,
      motivo: `Evidência vencida em ${evidencia.dataValidade}. Requer renovação metrológica ou documental.`
    };
  }

  // 2. Verificar status de validade
  if (evidencia.statusValidade === 'VENCIDO') {
    return {
      valida: false,
      motivo: `Evidência com status VENCIDO. Requer aprovação da Engenharia da Qualidade ou renovação.`
    };
  }

  // 3. Verificar aplicabilidade de base operacional (se especificada)
  if (
    evidencia.baseOperacional &&
    evidencia.baseOperacional !== 'TODAS' &&
    evidencia.baseOperacional !== contextoAuditoria.baseOperacional
  ) {
    return {
      valida: false,
      motivo: `Evidência restrita à base [${evidencia.baseOperacional}]. Não aplicável à base ${contextoAuditoria.baseOperacional}.`
    };
  }

  return { valida: true };
}
