import { Type } from '@google/genai';

/**
 * Schemas nativos enxutos para respostas estruturadas do Gemini.
 * Apenas os campos consumidos pelo sistema são declarados, economizando tokens e latência.
 */

// 1. Schema para Extração de RNC (Formulário F 001-29)
export const RNC_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    numeroNC: { type: Type.STRING },
    clienteOuOperador: { type: Type.STRING },
    aeronave: { type: Type.STRING },
    ordemServico: { type: Type.STRING },
    descricaoNaoConformidade: { type: Type.STRING },
    descricaoEvidenciaObjetiva: { type: Type.STRING },
    requisitoViolado: { type: Type.STRING },
    classificacaoCriticidade: { type: Type.STRING },
    correcaoImediata: { type: Type.STRING },
    analiseCausaRaiz: { type: Type.STRING },
    acaoCorretivaDefinitiva: { type: Type.STRING },
    acaoPreventiva: { type: Type.STRING },
    responsavelTratamento: { type: Type.STRING },
    prazoDefinido: { type: Type.STRING },
  },
  required: ['numeroNC', 'descricaoNaoConformidade', 'classificacaoCriticidade'],
};

// 2. Schema para Auditoria de Conformidade de RNC
export const RNC_AUDIT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    statusGeral: { type: Type.STRING },
    notaGeral: { type: Type.NUMBER },
    resumoAuditoria: { type: Type.STRING },
    avaliacaoCausaRaiz: { type: Type.STRING },
    avaliacaoAcaoCorretiva: { type: Type.STRING },
    sugestaoMelhoria: { type: Type.STRING },
    riscoRecorrencia: { type: Type.STRING },
    itensEmConformidade: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    gapsIdentificados: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['statusGeral', 'notaGeral', 'resumoAuditoria'],
};

// 3. Schema para Documentos de Auditoria Geral (Relatório de Auditoria)
export const AUDIT_DOCUMENT_PARSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tipoDocumentoIdentificado: { type: Type.STRING },
    confiancaTipo: { type: Type.NUMBER },
    resumoExecutivo: { type: Type.STRING },
    dadosAuditoria: {
      type: Type.OBJECT,
      properties: {
        numeroAuditoria: { type: Type.STRING },
        clienteNome: { type: Type.STRING },
        tipoAuditoria: { type: Type.STRING },
        entidadeAuditora: { type: Type.STRING },
        dataInicio: { type: Type.STRING },
        dataTermino: { type: Type.STRING },
        escopo: { type: Type.STRING },
        baseOuLocal: { type: Type.STRING },
        auditoresNomes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        status: { type: Type.STRING },
        referenciaExterna: { type: Type.STRING },
      },
    },
    requisitosChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numeroItem: { type: Type.STRING },
          tituloCurto: { type: Type.STRING },
          textoOriginal: { type: Type.STRING },
          criterioAceitacao: { type: Type.STRING },
          categoria: { type: Type.STRING },
          criticidade: { type: Type.STRING },
          metodoVerificacao: { type: Type.STRING },
          controleSugeridoCodigo: { type: Type.STRING },
        },
      },
    },
    constatacoesFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numeroExterno: { type: Type.STRING },
          classificacao: { type: Type.STRING },
          descricaoOriginal: { type: Type.STRING },
          requisitoNormativo: {
            type: Type.OBJECT,
            properties: {
              norma: { type: Type.STRING },
              itemRequisito: { type: Type.STRING },
            },
          },
          setorResponsavel: { type: Type.STRING },
          nivelRisco: { type: Type.STRING },
          prazoResposta: { type: Type.STRING },
          statusAceitacao: { type: Type.STRING },
          decisaoAuditorDetalhe: { type: Type.STRING },
        },
      },
    },
  },
  required: ['tipoDocumentoIdentificado', 'resumoExecutivo'],
};

// 4. Schema para Checklist Estruturado
export const CHECKLIST_PARSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    clienteNome: { type: Type.STRING },
    programaCodigo: { type: Type.STRING },
    programaNome: { type: Type.STRING },
    revisao: { type: Type.STRING },
    itens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          numeroItem: { type: Type.STRING },
          capituloOuSecao: { type: Type.STRING },
          tituloCurto: { type: Type.STRING },
          textoOriginal: { type: Type.STRING },
          criterioAceitacao: { type: Type.STRING },
          referenciaNormativa: { type: Type.STRING },
          categoria: { type: Type.STRING },
          criticidade: { type: Type.STRING },
          metodoVerificacao: { type: Type.STRING },
          controleSugeridoCodigo: { type: Type.STRING },
        },
      },
    },
  },
  required: ['clienteNome', 'itens'],
};

// 5. Schema para Avaliação de Requisito de Checklist (Assistente Anti-Alucinação)
export const CHECKLIST_ITEM_EVALUATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    categoriaAtendimento: { type: Type.STRING },
    statusSugestao: { type: Type.STRING },
    textoRespostaSugerida: { type: Type.STRING },
    justificativaSustentacao: { type: Type.STRING },
    precedenteUtilizado: {
      type: Type.OBJECT,
      properties: {
        auditoriaNumero: { type: Type.STRING },
        findingNumero: { type: Type.STRING },
        respostaAceitaAnterior: { type: Type.STRING },
        ano: { type: Type.STRING },
      },
    },
    alertaTemporal: {
      type: Type.OBJECT,
      properties: {
        procedimentoCitado: { type: Type.STRING },
        revisaoNaAuditoria: { type: Type.STRING },
        revisaoAtualNoAcervo: { type: Type.STRING },
        houveAlteracaoRevisao: { type: Type.BOOLEAN },
      },
    },
    documentosInternosVinculados: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    evidenciasObjetivasSugeridas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    gapsOuInconsistencias: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    acoesNecessariasParaAtender: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['categoriaAtendimento', 'textoRespostaSugerida', 'justificativaSustentacao'],
};
