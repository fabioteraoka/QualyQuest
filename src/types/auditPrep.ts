import type { ArquivoEvidenciaRef } from '../types';

export type TipoAuditoriaPreparacao =
  | 'ANAC'
  | 'EASA'
  | 'FAA'
  | 'IOSA'
  | 'Cliente'
  | 'Auditoria Interna'
  | 'Outros';

export type SituacaoItemAuditoriaPrep =
  | 'ATENDIDO'
  | 'PARCIALMENTE_ATENDIDO'
  | 'NAO_ATENDIDO'
  | 'NAO_APLICAVEL'
  | 'PENDENTE_DE_AVALIACAO';

export type StatusAuditoriaPrep =
  | 'EM_PREPARACAO'
  | 'PRONTA'
  | 'CONCLUIDA'
  | 'ARQUIVADA';

export type TipoEvidenciaVinculadaPrep =
  | 'ARQUIVO'
  | 'DOCUMENTO_SGQ'
  | 'TREINAMENTO'
  | 'CALIBRACAO'
  | 'RNC'
  | 'OUTRO';

export interface EvidenciaVinculadaPrep {
  evidenciaId: string;
  titulo: string;
  tipo: TipoEvidenciaVinculadaPrep;
  referencia: string;
  dataValidade?: string;
  arquivoRef?: ArquivoEvidenciaRef;
  origemModulo?: string;
  observacao?: string;
  anexadoEm: string;
  anexadoPorNome: string;
}

export interface HistoricoAlteracaoItemPrep {
  id: string;
  dataHora: string;
  usuarioUid: string;
  usuarioNome: string;
  acao:
    | 'CRIACAO'
    | 'EDICAO'
    | 'SUGESTAO_IA'
    | 'VALIDACAO_QUALIDADE'
    | 'REUTILIZACAO_AUDITORIA'
    | 'EVIDENCIA_VINCULADA'
    | 'EVIDENCIA_REMOVIDA';
  situacaoAnterior?: SituacaoItemAuditoriaPrep;
  situacaoNova?: SituacaoItemAuditoriaPrep;
  respostaAnterior?: string;
  evidenciasAnterioresCount?: number;
  detalhes: string;
}

export interface FonteSugestaoIAPrep {
  tipo: 'PROCEDIMENTO_NORMA' | 'EVIDENCIA_REGISTRO' | 'AUDITORIA_ANTERIOR';
  codigo: string;
  titulo: string;
  revisao: string;
  observacao?: string;
}

export interface SugestaoIAAuditoriaPrep {
  respostaSugerida: string;
  fontesEncontradas: FonteSugestaoIAPrep[];
  lacunasOuFaltantes: string[];
  conflitosOuDivergencias: string[];
  informacaoInsuficiente: boolean;
  geradoEm: string;
  modeloUtilizado?: string;
  validadaPelaQualidade: boolean;
}

export interface FonteImportacaoItemPrep {
  tipo: 'MANUAL' | 'EXCEL' | 'WORD' | 'PDF';
  nomeArquivo?: string;
  hashSha256?: string;
  importadoEm: string;
  importadoPorNome: string;
}

export interface ReutilizacaoAuditoriaAnteriorRef {
  auditId: string;
  auditNome: string;
  entidade: string;
  dataAuditoria: string;
  itemNumero: string;
  validadeVerificada: boolean;
  verificadaPorNome?: string;
  verificadaEm?: string;
}

export interface AuditoriaPreparacao {
  id: string;
  organizationId: string;
  nome: string;
  entidade: string;
  tipo: TipoAuditoriaPreparacao;
  dataAuditoria: string;
  periodo?: string;
  responsavelPreparacao: string;
  observacoes?: string;
  status: StatusAuditoriaPrep;
  arquivada: boolean;
  arquivadaEm?: string;
  arquivadaPorNome?: string;
  criadoPorUid: string;
  criadoPorNome: string;
  atualizadoPorUid?: string;
  atualizadoPorNome?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemAuditoriaPreparacao {
  id: string;
  organizationId: string;
  auditId: string;
  ordem: number;
  // 7 campos principais do fluxo simplificado
  numeroItem: string;
  perguntaOriginal: string;
  referenciaNormativa: string;
  respostaImpacto: string;
  evidencias: EvidenciaVinculadaPrep[];
  situacao: SituacaoItemAuditoriaPrep;
  observacoesPendencias: string;
  // Rastreabilidade e Governança
  fonteImportacao: FonteImportacaoItemPrep;
  origemResposta:
    | 'NAO_PREENCHIDA'
    | 'MANUAL'
    | 'REUTILIZADA_AUDITORIA_ANTERIOR'
    | 'APROVADA_APOS_IA';
  sugestaoIA?: SugestaoIAAuditoriaPrep;
  reutilizadaDe?: ReutilizacaoAuditoriaAnteriorRef;
  validadoQualidade: boolean;
  validadoQualidadePorNome?: string;
  validadoQualidadeEm?: string;
  criadoPorUid: string;
  criadoPorNome: string;
  atualizadoPorUid?: string;
  atualizadoPorNome?: string;
  createdAt: string;
  updatedAt: string;
  historicoAlteracoes: HistoricoAlteracaoItemPrep[];
}

export interface ResumoAuditoriaPrep {
  totalItens: number;
  atendidos: number;
  parcialmenteAtendidos: number;
  naoAtendidos: number;
  naoAplicaveis: number;
  pendentes: number;
  itensSemEvidencia: number;
  situacaoGeral: string;
}

export function calcularResumoAuditoriaPrep(items: ItemAuditoriaPreparacao[]): ResumoAuditoriaPrep {
  const totalItens = items.length;
  const atendidos = items.filter((i) => i.situacao === 'ATENDIDO').length;
  const parcialmenteAtendidos = items.filter((i) => i.situacao === 'PARCIALMENTE_ATENDIDO').length;
  const naoAtendidos = items.filter((i) => i.situacao === 'NAO_ATENDIDO').length;
  const naoAplicaveis = items.filter((i) => i.situacao === 'NAO_APLICAVEL').length;
  const pendentes = items.filter((i) => i.situacao === 'PENDENTE_DE_AVALIACAO').length;

  const itensSemEvidencia = items.filter(
    (i) =>
      (i.situacao === 'ATENDIDO' || i.situacao === 'PARCIALMENTE_ATENDIDO') &&
      (!i.evidencias || i.evidencias.length === 0)
  ).length;

  let situacaoGeral = 'Sem itens cadastrados';
  if (totalItens > 0) {
    const concluidos = atendidos + naoAplicaveis;
    if (concluidos === totalItens && itensSemEvidencia === 0) {
      situacaoGeral = 'Pronta para Auditoria';
    } else if (naoAtendidos > 0) {
      situacaoGeral = `${naoAtendidos} Não Atendido(s)`;
    } else if (pendentes > 0 || parcialmenteAtendidos > 0) {
      situacaoGeral = `${pendentes + parcialmenteAtendidos} Pendente(s)`;
    } else if (itensSemEvidencia > 0) {
      situacaoGeral = `${itensSemEvidencia} Sem Evidência`;
    } else {
      situacaoGeral = 'Em Preparação';
    }
  }

  return {
    totalItens,
    atendidos,
    parcialmenteAtendidos,
    naoAtendidos,
    naoAplicaveis,
    pendentes,
    itensSemEvidencia,
    situacaoGeral,
  };
}
