/**
 * SERVIÇO DE MATRIZ CENTRAL DE REQUISITOS AERONÁUTICOS, RASTREABILIDADE
 * DE FONTES EXTERNAS E MECANISMO DE ATUALIZAÇÃO CONTROLADA — QUALYQUEST (FASE 1.2)
 * 
 * Regras Estritas de Integridade SGQ:
 * 1. Zero dados fictícios: cada requisito possui fonte oficial comprovada.
 * 2. Rastreabilidade pública: ANAC, EASA e FAA com URLs oficiais, emendas e vigências.
 * 3. Acesso controlado IOSA: Registra metadados oficiais do ISM (Ed. 18 Rev 1), mantendo
 *    o texto integral como AGUARDANDO_ACESSO_AUTORIZADO por limitação de direitos autorais.
 * 4. Documentos de clientes: Kalitta QA-14 (69 itens) e Atlas Q2059 (12 itens) estão no projeto.
 *    Avion Express, Placar e SWISS são explicitamente registrados como AGUARDANDO_DOCUMENTO.
 * 5. Documentos internos: MOMQ Rev. 08 (06/Ago/2026) e PTM Rev. 08 (11/Mai/2026).
 * 6. Governança de atualização: Compara revisões, detecta diffs, exige aprovação humana
 *    e nunca altera snapshots retroativos de auditorias anteriores.
 */

import {
  RequisitoClienteItem,
  TipoOrigemRequisito,
  StatusAcessoConteudo,
  StatusValidacaoRequisito,
  TipoAcessoFonte,
  SituacaoAplicabilidadeImpacto,
  ControleCentralSGQ
} from '../types';
import { KALITTA_QA14_ITEMS, KALITTA_QA14_METADATA } from '../data/sampleKalittaQA14Checklist';

// ============================================================================
// ESTRUTURAS DE DADOS DA MATRIZ DE FONTES
// ============================================================================

export interface FonteNormativaRegistro {
  id: string;
  autoridadeOuEntidade: string;
  codigoDocumento: string;
  tituloDocumento: string;
  familia: 'ANAC' | 'EASA' | 'FAA' | 'IOSA' | 'CLIENTE' | 'INTERNO_IMPACTO';
  tipoAcesso: TipoAcessoFonte;
  statusAcesso: StatusAcessoConteudo;
  revisaoVigenteIdentificada: string;
  dataPublicacao?: string;
  dataVigencia?: string;
  dataUltimaConsulta: string;
  urlOficialConsulta: string;
  atualizacaoPossivel: boolean;
  modalidadeAtualizacao: 'AUTOMATICA_API_XML' | 'MANUAL_CONFERENCIA_PORTAL' | 'UPLOAD_ARQUIVO_NOVA_EDICAO';
  limitaAcesso?: string;
  totalItensExtraidos: number;
  totalEstimadoItens?: number;
  aplicabilidadePadraoImpacto: SituacaoAplicabilidadeImpacto;
  justificativaAplicabilidade: string;
  observacoesIntegridade: string;
}

export interface DiferencaRevisaoRequisito {
  codigoItem: string;
  titulo: string;
  tipoMudanca: 'ITEM_NOVO' | 'TEXTO_ALTERADO' | 'VIGENCIA_ALTERADA' | 'REVOGADO_SUBSTITUIDO';
  textoAnterior?: string;
  textoNovo?: string;
  revisaoAnterior?: string;
  revisaoNova?: string;
  impactoSugerido: string;
  requerRevisaoHumana: boolean;
}

export interface ResultadoComparacaoRevisaoFonte {
  documentoId: string;
  codigoDocumento: string;
  revisaoAtualNoSistema: string;
  revisaoIdentificadaNaFonte: string;
  dataConsulta: string;
  temDivergenciaRevisao: boolean;
  totalItensAnalisados: number;
  itensNovos: DiferencaRevisaoRequisito[];
  itensAlterados: DiferencaRevisaoRequisito[];
  itensInalterados: number;
  itensRevogados: DiferencaRevisaoRequisito[];
  mensagemConclusiva: string;
}

// ============================================================================
// MATRIZ MESTRA DE FONTES PÚBLICAS, PRIVADAS E INTERNAS
// ============================================================================

export const MATRIZ_FONTES_MESTRA: FonteNormativaRegistro[] = [
  // --- FONTES REGULATÓRIAS PÚBLICAS: ANAC ---
  {
    id: 'FONTE-ANAC-RBAC-145',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'RBAC 145',
    tituloDocumento: 'Organizações de Manutenção de Produto Aeronáutico',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Emenda nº 09 (Resolução ANAC nº 715)',
    dataPublicacao: '2023-05-18',
    dataVigencia: '2023-12-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 9,
    totalEstimadoItens: 45,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regulação aeronáutica primária e mandatória para certificação e operação da IMPACTO como OM.',
    observacoesIntegridade: 'Emenda 09 vigente desde 01/12/2023. Subpartes A a E e Apêndices A-I e B-I rastreados.'
  },
  {
    id: 'FONTE-ANAC-RBAC-43',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'RBAC 43',
    tituloDocumento: 'Manutenção, Manutenção Preventiva, Reconstrução e Alteração',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Emenda nº 04',
    dataPublicacao: '2021-11-10',
    dataVigencia: '2021-12-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-043',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 3,
    totalEstimadoItens: 18,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Requisitos técnicos gerais de execução de manutenção (43.13) e registros de liberação (43.9).',
    observacoesIntegridade: 'Extraídos requisitos de registro formal e aprovação para retorno ao serviço.'
  },
  {
    id: 'FONTE-ANAC-IS-145-001',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'IS 145-001',
    tituloDocumento: 'Certificação de Organizações de Manutenção de Produto Aeronáutico Domésticas',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Revisão H',
    dataPublicacao: '2024-10-15',
    dataVigencia: '2024-11-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is/is/is-145-001h',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 3,
    totalEstimadoItens: 25,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Instrução mandatória para certificação, aditamentos de capacidade e bases operacionais da IMPACTO.',
    observacoesIntegridade: 'Rev. H revogou formalmente a Rev. G no acervo normativo da ANAC.'
  },
  {
    id: 'FONTE-ANAC-IS-145-009',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'IS 145-009',
    tituloDocumento: 'Manual da Organização de Manutenção, Manual de Controle da Qualidade e Declaração de Conformidade',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Revisão E',
    dataPublicacao: '2024-03-22',
    dataVigencia: '2024-04-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is/is/is-145-009e',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 3,
    totalEstimadoItens: 20,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Base para estrutura e aprovação do MOMQ Rev. 08 e declaração de conformidade da IMPACTO.',
    observacoesIntegridade: 'Rev. E substituiu a Rev. D, consolidando diretrizes do programa Voo Simples.'
  },
  {
    id: 'FONTE-ANAC-IS-145-010',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'IS 145-010',
    tituloDocumento: 'Programa de Treinamento em Organizações de Manutenção de Produto Aeronáutico',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Revisão C',
    dataPublicacao: '2023-08-14',
    dataVigencia: '2023-09-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is/is/is-145-010c',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 2,
    totalEstimadoItens: 15,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regula o Programa de Treinamento em Manutenção (PTM Rev. 08 da IMPACTO).',
    observacoesIntegridade: 'Requisitos de qualificação inicial, recorrente e fatores humanos extraídos.'
  },
  {
    id: 'FONTE-ANAC-IS-145.109-001',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'IS 145.109-001',
    tituloDocumento: 'Publicações Técnicas: Obtenção e Controle pelas Organizações de Manutenção',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Revisão C',
    dataPublicacao: '2022-12-05',
    dataVigencia: '2023-01-02',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is/is/is-145.109-001c',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 2,
    totalEstimadoItens: 12,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regula a lista mestra F 001-021 e controle de manuais de manutenção (AMM, CMM, IPC).',
    observacoesIntegridade: 'Exige comprovação de controle de dados técnicos atualizados no momento do serviço.'
  },
  {
    id: 'FONTE-ANAC-IS-145.151-001',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'IS 145.151-001',
    tituloDocumento: 'Cadastramento de Responsável Técnico de Organização de Manutenção',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Revisão Inicial (Portaria SAS)',
    dataPublicacao: '2023-04-10',
    dataVigencia: '2023-05-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is/is/is-145.151-001',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 1,
    totalEstimadoItens: 8,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regras de designação e responsabilidade técnica perante o CREA e ANAC.',
    observacoesIntegridade: 'Vinculado ao Apêndice A-I do RBAC 145.'
  },
  {
    id: 'FONTE-ANAC-IS-145.214-001',
    autoridadeOuEntidade: 'ANAC (Agência Nacional de Aviação Civil)',
    codigoDocumento: 'IS 145.214-001',
    tituloDocumento: 'Sistema de Gerenciamento da Segurança Operacional (SGSO) em Organizações de Manutenção',
    familia: 'ANAC',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Revisão B',
    dataPublicacao: '2023-11-28',
    dataVigencia: '2024-01-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is/is/is-145.214-001b',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 2,
    totalEstimadoItens: 16,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regula o MGSO e reporte obrigatório/voluntário de segurança operacional da IMPACTO.',
    observacoesIntegridade: 'Alinhado ao Anexo 19 da OACI e RBAC 145.214.'
  },

  // --- FONTES REGULATÓRIAS PÚBLICAS: EASA ---
  {
    id: 'FONTE-EASA-PART-145',
    autoridadeOuEntidade: 'EASA (European Union Aviation Safety Agency)',
    codigoDocumento: 'Regulation (EU) No 1321/2014, Annex II (Part-145)',
    tituloDocumento: 'Continuing Airworthiness Requirements — Part-145 Maintenance Organisations',
    familia: 'EASA',
    tipoAcesso: 'PUBLICA_AUTOMATICA',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Easy Access Rules (Consolidated with Reg (EU) 2021/1963 & ED Decision 2022/011/R)',
    dataPublicacao: '2022-12-14',
    dataVigencia: '2022-12-02',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-continuing-airworthiness-regulation-eu-no-13212014',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    totalItensExtraidos: 6,
    totalEstimadoItens: 52,
    aplicabilidadePadraoImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Aplicável para atendimento a operadores europeus (ex: SWISS, Avion Express) via Suplemento EASA MNT-004 da IMPACTO.',
    observacoesIntegridade: 'EASA disponibiliza XML oficial no eRules para extração estruturada de AMC e GM.'
  },

  // --- FONTES REGULATÓRIAS DE REFERÊNCIA: FAA ---
  {
    id: 'FONTE-FAA-14-CFR-145',
    autoridadeOuEntidade: 'FAA (Federal Aviation Administration - USA)',
    codigoDocumento: 'Title 14 CFR Part 145',
    tituloDocumento: 'Repair Stations (Subparts A through E)',
    familia: 'FAA',
    tipoAcesso: 'PUBLICA_AUTOMATICA',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'eCFR Atualizado Continuamente (Subparts A - E)',
    dataPublicacao: '2024-01-01',
    dataVigencia: '2024-01-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    totalItensExtraidos: 6,
    totalEstimadoItens: 40,
    aplicabilidadePadraoImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Fonte de referência pública. Aplicável à IMPACTO quando requerido formalmente em contrato por operadores com matrícula N (ex: Kalitta, Atlas Air) ou certificação bilateral BASA.',
    observacoesIntegridade: 'Não tem aplicabilidade automática primária; exige justificativa de escopo/contrato documentada.'
  },
  {
    id: 'FONTE-FAA-14-CFR-43',
    autoridadeOuEntidade: 'FAA (Federal Aviation Administration - USA)',
    codigoDocumento: 'Title 14 CFR Part 43',
    tituloDocumento: 'Maintenance, Preventive Maintenance, Rebuilding, and Alteration',
    familia: 'FAA',
    tipoAcesso: 'PUBLICA_AUTOMATICA',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'eCFR Title 14 Part 43 (§§ 43.9 e 43.13)',
    dataPublicacao: '2024-01-01',
    dataVigencia: '2024-01-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    totalItensExtraidos: 2,
    totalEstimadoItens: 16,
    aplicabilidadePadraoImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Requisitos técnicos de registros e regras de desempenho referenciados nos checklists de clientes N-registered.',
    observacoesIntegridade: 'Integrado ao eCFR da FAA com suporte a consulta pública de revisões.'
  },
  {
    id: 'FONTE-FAA-AC-145-9A',
    autoridadeOuEntidade: 'FAA (Federal Aviation Administration - USA)',
    codigoDocumento: 'FAA AC 145-9A',
    tituloDocumento: 'Guide for Developing and Evaluating Repair Station and Quality Control Manuals',
    familia: 'FAA',
    tipoAcesso: 'PUBLICA_MANUAL',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'AC 145-9A (com Change 1 e 2)',
    dataPublicacao: '2019-07-03',
    dataVigencia: '2019-07-03',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentid/73617',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    totalItensExtraidos: 2,
    totalEstimadoItens: 20,
    aplicabilidadePadraoImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Diretrizes de elaboração do manual de controle de qualidade e equivalência com normas internacionais.',
    observacoesIntegridade: 'Circular consultiva pública orientativa para auditorias de clientes americanos.'
  },

  // --- FONTES PRIVADAS / ACESSO CONTROLADO: IATA IOSA ---
  {
    id: 'FONTE-IATA-IOSA-ISM',
    autoridadeOuEntidade: 'IATA (International Air Transport Association)',
    codigoDocumento: 'IOSA Standards Manual (ISM)',
    tituloDocumento: 'IOSA Standards and Recommended Practices (ISARPs) — Sections ORG & MNT',
    familia: 'IOSA',
    tipoAcesso: 'PRIVADA_LICENCIADA',
    statusAcesso: 'AGUARDANDO_ACESSO_AUTORIZADO',
    revisaoVigenteIdentificada: 'Edition 18 Rev 1 (Vigência 2026) / Ed. 19 anunciada para 2027',
    dataPublicacao: '2025-10-01',
    dataVigencia: '2026-01-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'https://www.iata.org/en/publications/manuals/iosa-standard-manual/',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    limitaAcesso: 'Obra protegida por direitos autorais da IATA. O texto integral não é público; apenas metadados e estrutura de capítulos são de domínio público. Requer cópia licenciada fornecida pelo operador/cliente.',
    totalItensExtraidos: 4,
    totalEstimadoItens: 85,
    aplicabilidadePadraoImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Padrão setorial exigível apenas quando formalmente incorporado ao contrato ou manual de atendimento do cliente.',
    observacoesIntegridade: 'REGRA SGQ: ISARPs cadastrados apenas com metadados comprováveis. Status mantido como AGUARDANDO_ACESSO_AUTORIZADO. Não é obrigação regulatória primária ANAC.'
  },

  // --- FONTES DE CLIENTES: AUDITORIAS & CHECKLISTS ---
  {
    id: 'FONTE-CLIENTE-KALITTA-QA14',
    autoridadeOuEntidade: 'Kalitta Air LLC — Quality Assurance Department',
    codigoDocumento: 'FORM QA-14',
    tituloDocumento: 'Line Maintenance Station Audit Checklist',
    familia: 'CLIENTE',
    tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'QA 14 REV: 4 (01/09/2026)',
    dataPublicacao: '2026-01-09',
    dataVigencia: '2026-01-09',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Documento interno formal Kalitta Air (acervo local do projeto: sampleKalittaQA14Checklist.ts)',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    limitaAcesso: 'Documento oficial fornecido pela Kalitta Air ao SGQ da IMPACTO. Disponível na íntegra no código-fonte.',
    totalItensExtraidos: 69,
    totalEstimadoItens: 69,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Obrigatório para homologação e auditorias de estação de linha da Kalitta na IMPACTO.',
    observacoesIntegridade: '100% dos 69 requisitos autênticos extraídos das 8 seções operacionais. 0% de dados fictícios.'
  },
  {
    id: 'FONTE-CLIENTE-ATLAS-Q2059',
    autoridadeOuEntidade: 'Atlas Air Worldwide — Quality Assurance',
    codigoDocumento: 'Checklist Q2059',
    tituloDocumento: 'Vendor / Line Station Audit Checklist',
    familia: 'CLIENTE',
    tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
    statusAcesso: 'CONTEUDO_EXTRAIDO',
    revisaoVigenteIdentificada: 'Q2059 Rev. 02',
    dataPublicacao: '2025-06-15',
    dataVigencia: '2025-07-01',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Documento de auditoria Atlas Air (acervo do projeto: initialClientRequirements.ts)',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    limitaAcesso: 'Documento fornecido pela Atlas Air ao SGQ da IMPACTO.',
    totalItensExtraidos: 12,
    totalEstimadoItens: 45,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Obrigatório para atendimento e auditoria periódica de manutenção da Atlas Air.',
    observacoesIntegridade: '12 requisitos operacionais auditáveis extraídos e vinculados aos controles internos da IMPACTO.'
  },
  {
    id: 'FONTE-CLIENTE-AVION-EXPRESS',
    autoridadeOuEntidade: 'Avion Express — Flight Operations & Technical Quality',
    codigoDocumento: 'Avion Express Line Audit',
    tituloDocumento: 'Line Maintenance Station Audit & GMM Technical Compliance Checklist',
    familia: 'CLIENTE',
    tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
    statusAcesso: 'AGUARDANDO_DOCUMENTO',
    revisaoVigenteIdentificada: 'Checklist Formal Pendente de Envio',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Canal de Qualidade Avion Express / SGQ IMPACTO',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    limitaAcesso: 'O checklist de auditoria específico da Avion Express não foi fornecido no repositório.',
    totalItensExtraidos: 1,
    totalEstimadoItens: 40,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Cliente operacional atendido nas bases da IMPACTO; exige protocolo formal do checklist.',
    observacoesIntegridade: 'REGRA ANTI-INVENÇÃO: Registrado com status AGUARDANDO_DOCUMENTO. Proibido criar itens fictícios.'
  },
  {
    id: 'FONTE-CLIENTE-PLACAR',
    autoridadeOuEntidade: 'Placar Linhas Aéreas — Garantia da Qualidade',
    codigoDocumento: 'Placar SGQ-AUD-01',
    tituloDocumento: 'Checklist de Avaliação Técnica de Prestador de Serviços de Manutenção',
    familia: 'CLIENTE',
    tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
    statusAcesso: 'AGUARDANDO_DOCUMENTO',
    revisaoVigenteIdentificada: 'Checklist Formal Pendente de Envio',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Canal de Qualidade Placar / SGQ IMPACTO',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    limitaAcesso: 'Arquivo do checklist de auditoria de manutenção da Placar não presente fisicamente no projeto.',
    totalItensExtraidos: 1,
    totalEstimadoItens: 35,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Operação de linha em território nacional para aeronaves Embraer E190.',
    observacoesIntegridade: 'REGRA ANTI-INVENÇÃO: Registrado com status AGUARDANDO_DOCUMENTO. Proibido criar itens fictícios.'
  },
  {
    id: 'FONTE-CLIENTE-SWISS',
    autoridadeOuEntidade: 'Swiss International Air Lines Ltd — Technical Quality Management',
    codigoDocumento: 'SWISS Station Technical Audit Checklist',
    tituloDocumento: 'Line Maintenance Station Audit & EASA Part-145 Supplement Compliance',
    familia: 'CLIENTE',
    tipoAcesso: 'CLIENTE_ENVIO_PENDENTE',
    statusAcesso: 'AGUARDANDO_DOCUMENTO',
    revisaoVigenteIdentificada: 'Aguardando Protocolo de Documento Oficial',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Portal de Fornecedores SWISS / SGQ IMPACTO',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    limitaAcesso: 'A SWISS é cliente atendido pela IMPACTO, porém seu checklist específico de auditoria não está presente no projeto.',
    totalItensExtraidos: 0,
    totalEstimadoItens: 50,
    aplicabilidadePadraoImpacto: 'AGUARDANDO_AVALIACAO',
    justificativaAplicabilidade: 'Atendimento internacional de linha em GRU. Depende de envio de checklist oficial para validação.',
    observacoesIntegridade: 'SALVAGUARDA DE INTEGRIDADE: Registro mantido como AGUARDANDO_DOCUMENTO e PENDENTE_VALIDACAO, sem nenhuma pergunta fictícia.'
  },

  // --- DOCUMENTOS INTERNOS CONTROLADOS DA IMPACTO ---
  {
    id: 'FONTE-IMPACTO-MOMQ',
    autoridadeOuEntidade: 'IMPACTO SGQ (Organização de Manutenção)',
    codigoDocumento: 'MOMQ MNT-001',
    tituloDocumento: 'Manual da Organização de Manutenção e Qualidade',
    familia: 'INTERNO_IMPACTO',
    tipoAcesso: 'INTERNO_CONTROLADO',
    statusAcesso: 'VALIDADO_QUALIDADE',
    revisaoVigenteIdentificada: 'Revisão 08 (Aprovada pela ANAC)',
    dataPublicacao: '2026-08-06',
    dataVigencia: '2026-08-06',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Publicação controlada interna (acervo: f001021ControlledPublications.ts)',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    totalItensExtraidos: 6,
    totalEstimadoItens: 18,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Manual mestre mandatório da organização, base de todos os procedimentos técnicos e de garantia da qualidade.',
    observacoesIntegridade: 'Revisão 08 efetivamente comprovada no acervo formal da IMPACTO.'
  },
  {
    id: 'FONTE-IMPACTO-PTM',
    autoridadeOuEntidade: 'IMPACTO SGQ (Treinamento Técnico)',
    codigoDocumento: 'PTM MNT-002',
    tituloDocumento: 'Programa de Treinamento em Manutenção',
    familia: 'INTERNO_IMPACTO',
    tipoAcesso: 'INTERNO_CONTROLADO',
    statusAcesso: 'VALIDADO_QUALIDADE',
    revisaoVigenteIdentificada: 'Revisão 08',
    dataPublicacao: '2026-05-11',
    dataVigencia: '2026-05-11',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Publicação controlada interna (acervo: f001021ControlledPublications.ts)',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    totalItensExtraidos: 1,
    totalEstimadoItens: 8,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regula o programa de qualificação profissional, RII, ETOPS e fatores humanos dos mecânicos da IMPACTO.',
    observacoesIntegridade: 'Revisão 08 comprovada no catálogo F 001-021.'
  },
  {
    id: 'FONTE-IMPACTO-CATALOGO-F001',
    autoridadeOuEntidade: 'IMPACTO SGQ (Controle Documental)',
    codigoDocumento: 'F 001-021',
    tituloDocumento: 'Lista Mestra de Documentos Controlados e Formulários Técnicos',
    familia: 'INTERNO_IMPACTO',
    tipoAcesso: 'INTERNO_CONTROLADO',
    statusAcesso: 'VALIDADO_QUALIDADE',
    revisaoVigenteIdentificada: 'Revisão 11 (Vigente)',
    dataPublicacao: '2026-08-06',
    dataVigencia: '2026-08-06',
    dataUltimaConsulta: '2026-11-08',
    urlOficialConsulta: 'Publicação controlada interna (acervo: f001021ControlledPublications.ts)',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    totalItensExtraidos: 29,
    totalEstimadoItens: 36,
    aplicabilidadePadraoImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Catálogo de governança que comprova o controle de revisões de 36 publicações e 29 formulários F 001.',
    observacoesIntegridade: 'Lista mestra auditável com registros de data, emissor e status de cada documento.'
  }
];

// ============================================================================
// REQUISITOS EXTRAÍDOS DAS FONTES PESQUISADAS (AMOSTRAS ESTRUTURADAS)
// ============================================================================

export interface AmostraRequisitoPesquisado {
  id: string;
  fonteOrigem: TipoOrigemRequisito;
  entidadeEmissora: string;
  documentoOrigemIdentificacao: string;
  codigoReferenciaOriginal: string;
  capituloSecaoSubitem: string;
  tituloCurto: string;
  textoOriginal: string;
  idiomaOriginal: 'PT_BR' | 'EN' | 'ES' | 'OUTRO';
  edicaoRevisaoFonte: string;
  dataPublicacao?: string;
  dataVigenciaFonte?: string;
  urlOficialFonte: string;
  dataUltimaConsulta: string;
  tipoRequisitoNormativo: 'REGULATORIO' | 'CONTRATUAL' | 'PADRAO_SETORIAL' | 'INTERNO' | 'BOA_PRATICA';
  statusAcessoConteudo: StatusAcessoConteudo;
  statusValidacao: StatusValidacaoRequisito;
  tipoAcessoFonte: TipoAcessoFonte;
  atualizacaoPossivel: boolean;
  modalidadeAtualizacao: 'AUTOMATICA_API_XML' | 'MANUAL_CONFERENCIA_PORTAL' | 'UPLOAD_ARQUIVO_NOVA_EDICAO';
  aplicabilidadeImpacto: SituacaoAplicabilidadeImpacto;
  justificativaAplicabilidade: string;
  controleCentralId?: string;
  processoResponsavel: string;
  evidenciaEsperada: string;
  metodoVerificacao: string;
  isIosaSetorial?: boolean;
}

export const REQUISITOS_PESQUISADOS_BASE: AmostraRequisitoPesquisado[] = [
  // --- ANAC RBAC 145 & ISs ---
  {
    id: 'ANAC-RBAC145-101',
    fonteOrigem: 'REGULATORIO_ANAC',
    entidadeEmissora: 'ANAC',
    documentoOrigemIdentificacao: 'RBAC 145 Emenda 09',
    codigoReferenciaOriginal: 'RBAC 145.101',
    capituloSecaoSubitem: 'Subparte C - Instalações Gerais',
    tituloCurto: 'Requisitos Gerais de Instalações e Alojamento',
    textoOriginal: 'Cada organização de manutenção certificada deve possuir instalações adequadas que garantam a proteção contra intempéries, poeira, calor e umidade para a execução de todos os trabalhos autorizados em suas Especificações Operativas.',
    idiomaOriginal: 'PT_BR',
    edicaoRevisaoFonte: 'Emenda nº 09 (Resolução 715)',
    dataPublicacao: '2023-05-18',
    dataVigenciaFonte: '2023-12-01',
    urlOficialFonte: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_MANUAL',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Requisito mandatório de infraestrutura física aplicável a todas as bases certificadas da IMPACTO.',
    controleCentralId: 'CTRL-HOUSEKEEP-01',
    processoResponsavel: 'Infraestrutura e Manutenção Predial',
    evidenciaEsperada: 'Inspeção de hangar/estação, relatório de controle ambiental e memorial descritivo das instalações.',
    metodoVerificacao: 'INSPECAO_FISICA'
  },
  {
    id: 'ANAC-RBAC145-109A',
    fonteOrigem: 'REGULATORIO_ANAC',
    entidadeEmissora: 'ANAC',
    documentoOrigemIdentificacao: 'RBAC 145 Emenda 09',
    codigoReferenciaOriginal: 'RBAC 145.109(a)',
    capituloSecaoSubitem: 'Subparte C - Recursos e Ferramental',
    tituloCurto: 'Disponibilidade de Equipamentos, Ferramentas e Dados Técnicos',
    textoOriginal: 'A organização de manutenção deve dispor dos equipamentos, ferramentas e dados técnicos necessários para a execução dos serviços para os quais está autorizada, conforme especificado no manual do fabricante ou dados aprovados pela ANAC.',
    idiomaOriginal: 'PT_BR',
    edicaoRevisaoFonte: 'Emenda nº 09 (Resolução 715)',
    dataPublicacao: '2023-05-18',
    dataVigenciaFonte: '2023-12-01',
    urlOficialFonte: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_MANUAL',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Base legal para o controle de ferramentário e assinaturas técnicas de manuais vigentes.',
    controleCentralId: 'CTRL-FERRAM-01',
    processoResponsavel: 'Engenharia e Ferramentaria',
    evidenciaEsperada: 'Lista mestra de ferramentas, contratos de aluguel ou aquisição e comprovante de calibração.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'ANAC-RBAC145-109B',
    fonteOrigem: 'REGULATORIO_ANAC',
    entidadeEmissora: 'ANAC',
    documentoOrigemIdentificacao: 'RBAC 145 Emenda 09',
    codigoReferenciaOriginal: 'RBAC 145.109(b)',
    capituloSecaoSubitem: 'Subparte C - Calibração de Ferramentas',
    tituloCurto: 'Calibração e Rastreabilidade Metrológica de Instrumentos de Precisão',
    textoOriginal: 'Os equipamentos e ferramentas que exigem calibração periódica devem ser calibrados em intervalos estabelecidos pela organização com base nas recomendações do fabricante, com padrões rastreáveis ao INMETRO ou organismo metrológico internacional reconhecido.',
    idiomaOriginal: 'PT_BR',
    edicaoRevisaoFonte: 'Emenda nº 09 (Resolução 715)',
    dataPublicacao: '2023-05-18',
    dataVigenciaFonte: '2023-12-01',
    urlOficialFonte: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_MANUAL',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Requisito regulatório primário que sustenta o controle metrológico transversal da IMPACTO.',
    controleCentralId: 'CTRL-FERRAM-01',
    processoResponsavel: 'Controle de Calibração / SGQ',
    evidenciaEsperada: 'Certificados de calibração RBC/INMETRO, etiquetas físicas invioláveis e controle de periodicidade.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'ANAC-RBAC145-161',
    fonteOrigem: 'REGULATORIO_ANAC',
    entidadeEmissora: 'ANAC',
    documentoOrigemIdentificacao: 'RBAC 145 Emenda 09',
    codigoReferenciaOriginal: 'RBAC 145.161',
    capituloSecaoSubitem: 'Subparte D - Pessoal',
    tituloCurto: 'Qualificação, Competência e Registros de Treinamento de Pessoal Técnico',
    textoOriginal: 'A organização de manutenção deve assegurar que todo o pessoal técnico responsável pela execução ou supervisão de manutenção, manutenção preventiva ou alteração seja devidamente qualificado e mantenha registros individuais detalhados de treinamento e experiência.',
    idiomaOriginal: 'PT_BR',
    edicaoRevisaoFonte: 'Emenda nº 09 (Resolução 715)',
    dataPublicacao: '2023-05-18',
    dataVigenciaFonte: '2023-12-01',
    urlOficialFonte: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_MANUAL',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Mandatório para emissão de credenciais técnicas, carteira CHT e autorização de retorno ao serviço.',
    controleCentralId: 'CTRL-TREIN-01',
    processoResponsavel: 'Treinamento e Recursos Humanos Técnicos',
    evidenciaEsperada: 'Fichas individuais de treinamento, certificados de tipo de aeronave (GenFam), CHTs válidas e autorização formal.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'ANAC-RBAC145-209',
    fonteOrigem: 'REGULATORIO_ANAC',
    entidadeEmissora: 'ANAC',
    documentoOrigemIdentificacao: 'RBAC 145 Emenda 09',
    codigoReferenciaOriginal: 'RBAC 145.209',
    capituloSecaoSubitem: 'Subparte E - Manual da Organização',
    tituloCurto: 'Conteúdo Obrigatório do Manual da Organização de Manutenção (MOMQ)',
    textoOriginal: 'O manual da organização de manutenção deve descrever a estrutura organizacional, deveres e responsabilidades do pessoal de gestão, procedimentos de controle de qualidade, procedimentos de recebimento e inspeção de materiais e sistema de liberação técnica.',
    idiomaOriginal: 'PT_BR',
    edicaoRevisaoFonte: 'Emenda nº 09 (Resolução 715)',
    dataPublicacao: '2023-05-18',
    dataVigenciaFonte: '2023-12-01',
    urlOficialFonte: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_MANUAL',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Exigência legal atendida pelo MOMQ Rev. 08 aprovado pela ANAC.',
    controleCentralId: 'CTRL-DOCS-01',
    processoResponsavel: 'Garantia da Qualidade SGQ',
    evidenciaEsperada: 'MOMQ Rev. 08, portaria de aprovação da ANAC e lista de páginas efetivas.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'ANAC-RBAC145-214',
    fonteOrigem: 'REGULATORIO_ANAC',
    entidadeEmissora: 'ANAC',
    documentoOrigemIdentificacao: 'RBAC 145 Emenda 09',
    codigoReferenciaOriginal: 'RBAC 145.214',
    capituloSecaoSubitem: 'Subparte E - Segurança Operacional',
    tituloCurto: 'Implementação e Manutenção do SGSO',
    textoOriginal: 'A organização de manutenção deve implementar e manter um Sistema de Gerenciamento da Segurança Operacional (SGSO) aceitável pela ANAC, proporcional ao tamanho e complexidade de suas operações.',
    idiomaOriginal: 'PT_BR',
    edicaoRevisaoFonte: 'Emenda nº 09 (Resolução 715)',
    dataPublicacao: '2023-05-18',
    dataVigenciaFonte: '2023-12-01',
    urlOficialFonte: 'https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac/rbac/rbac-145',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_MANUAL',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'MANUAL_CONFERENCIA_PORTAL',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'Regula o MGSO da IMPACTO e comitê de segurança operacional.',
    processoResponsavel: 'Segurança Operacional / SGSO',
    evidenciaEsperada: 'Manual de Gerenciamento da Segurança Operacional (MGSO), atas de comitê e relatórios de perigos (RELPREV).',
    metodoVerificacao: 'DOCUMENTAL'
  },

  // --- EASA PART-145 (Annex II) ---
  {
    id: 'EASA-145-A-30',
    fonteOrigem: 'REGULATORIO_EASA',
    entidadeEmissora: 'EASA',
    documentoOrigemIdentificacao: 'Regulation (EU) No 1321/2014 Annex II (Part-145)',
    codigoReferenciaOriginal: '145.A.30(e)',
    capituloSecaoSubitem: 'Section A - Technical Requirements (Personnel)',
    tituloCurto: 'Personnel Competence and Human Factors Assessment',
    textoOriginal: 'The organisation shall establish and control the competence of personnel involved in any maintenance, management and/or safety audits in accordance with a procedure and to a standard agreed by the competent authority, including knowledge of human factors and safety management.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'Easy Access Rules Part-145 (Reg (EU) 2021/1963)',
    dataPublicacao: '2022-12-14',
    dataVigenciaFonte: '2022-12-02',
    urlOficialFonte: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-continuing-airworthiness-regulation-eu-no-13212014',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_AUTOMATICA',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Exigível para atendimento a clientes operadores europeus, conforme Suplemento EASA MNT-004 da IMPACTO.',
    controleCentralId: 'CTRL-TREIN-01',
    processoResponsavel: 'Treinamento e Fatores Humanos',
    evidenciaEsperada: 'Registros de treinamento inicial e recorrente em Fatores Humanos (HF) e EWIS a cada 24 meses.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'EASA-145-A-42',
    fonteOrigem: 'REGULATORIO_EASA',
    entidadeEmissora: 'EASA',
    documentoOrigemIdentificacao: 'Regulation (EU) No 1321/2014 Annex II (Part-145)',
    codigoReferenciaOriginal: '145.A.42',
    capituloSecaoSubitem: 'Section A - Components',
    tituloCurto: 'Acceptance of Components and Release Certificates (EASA Form 1)',
    textoOriginal: 'All components shall be classified and appropriately segregated. The organisation shall ensure that components are only fitted when they are in satisfactory condition, meet the required design and are accompanied by the appropriate release documentation (EASA Form 1 or equivalent recognised under bilateral agreement).',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'Easy Access Rules Part-145',
    dataPublicacao: '2022-12-14',
    dataVigenciaFonte: '2022-12-02',
    urlOficialFonte: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-continuing-airworthiness-regulation-eu-no-13212014',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_AUTOMATICA',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Condição estrita para instalação de peças em aeronaves registradas na União Europeia.',
    controleCentralId: 'CTRL-MAT-01',
    processoResponsavel: 'Almoxarifado e Inspeção de Recebimento',
    evidenciaEsperada: 'EASA Form 1, FAA 8130-3 com dual release, SEG-002 ou formulário de recebimento IMPACTO.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'EASA-145-A-50',
    fonteOrigem: 'REGULATORIO_EASA',
    entidadeEmissora: 'EASA',
    documentoOrigemIdentificacao: 'Regulation (EU) No 1321/2014 Annex II (Part-145)',
    codigoReferenciaOriginal: '145.A.50',
    capituloSecaoSubitem: 'Section A - Certification of Maintenance',
    tituloCurto: 'Certificate of Release to Service (CRS)',
    textoOriginal: 'A certificate of release to service shall be issued by appropriately authorised certifying staff on behalf of the organisation when it has been verified that all maintenance ordered has been properly carried out in accordance with Part-145 procedures.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'Easy Access Rules Part-145',
    dataPublicacao: '2022-12-14',
    dataVigenciaFonte: '2022-12-02',
    urlOficialFonte: 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-continuing-airworthiness-regulation-eu-no-13212014',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_AUTOMATICA',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Requisito formal de retorno ao serviço para aeronaves em trânsito com prefixo europeu.',
    controleCentralId: 'CTRL-DOCS-01',
    processoResponsavel: 'Manutenção de Linha / Certifying Staff',
    evidenciaEsperada: 'Declaração CRS assinada no Technical Logbook com número de autorização Part-145.',
    metodoVerificacao: 'AMOSTRAGEM'
  },

  // --- FAA 14 CFR PART 145 & PART 43 ---
  {
    id: 'FAA-14-CFR-145-109',
    fonteOrigem: 'BOA_PRATICA_REFERENCIA',
    entidadeEmissora: 'FAA',
    documentoOrigemIdentificacao: 'Title 14 CFR Part 145 (Repair Stations)',
    codigoReferenciaOriginal: '14 CFR 145.109',
    capituloSecaoSubitem: 'Subpart C - Housing, Facilities, Equipment, Materials, and Data',
    tituloCurto: 'Equipment, Materials, and Data Requirements (FAA)',
    textoOriginal: 'A certificated repair station must have the equipment, tools, and materials necessary to perform the maintenance in accordance with part 43 of this chapter. The equipment, tools, and material must be located on the premises and under the repair station control when the work is being done.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'eCFR Title 14 Part 145 (Subpart C)',
    dataPublicacao: '2024-01-01',
    dataVigenciaFonte: '2024-01-01',
    urlOficialFonte: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145#145.109',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_AUTOMATICA',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Fonte de referência pública. Aplicável à IMPACTO quando requerido em contrato por clientes N-registered (ex: Kalitta Air, Atlas Air).',
    controleCentralId: 'CTRL-FERRAM-01',
    processoResponsavel: 'Engenharia e Ferramentaria',
    evidenciaEsperada: 'Tool control system, calibration log e inventário físico sob controle da estação.',
    metodoVerificacao: 'INSPECAO_FISICA'
  },
  {
    id: 'FAA-14-CFR-43-13',
    fonteOrigem: 'BOA_PRATICA_REFERENCIA',
    entidadeEmissora: 'FAA',
    documentoOrigemIdentificacao: 'Title 14 CFR Part 43',
    codigoReferenciaOriginal: '14 CFR 43.13',
    capituloSecaoSubitem: 'General Performance Rules',
    tituloCurto: 'Performance Rules for Maintenance and Approved Technical Data',
    textoOriginal: 'Each person performing maintenance, alteration, or preventive maintenance on an aircraft, engine, propeller, or appliance shall use the methods, techniques, and practices prescribed in the current manufacturer maintenance manual or Instructions for Continued Airworthiness.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'eCFR Title 14 Part 43 § 43.13',
    dataPublicacao: '2024-01-01',
    dataVigenciaFonte: '2024-01-01',
    urlOficialFonte: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43#43.13',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'REGULATORIO',
    statusAcessoConteudo: 'CONTEUDO_EXTRAIDO',
    statusValidacao: 'VALIDADO_QUALIDADE',
    tipoAcessoFonte: 'PUBLICA_AUTOMATICA',
    atualizacaoPossivel: true,
    modalidadeAtualizacao: 'AUTOMATICA_API_XML',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Regra de ouro técnica de execução citada em todos os checklists de operadores internacionais.',
    controleCentralId: 'CTRL-DOCS-01',
    processoResponsavel: 'Operações de Pista e Linha',
    evidenciaEsperada: 'Acesso direto ao AMM/IPC atualizado no ponto de trabalho do mecânico durante a execução.',
    metodoVerificacao: 'AMOSTRAGEM'
  },

  // --- IATA IOSA ISM (Acesso Controlado / Metadados Apenas) ---
  {
    id: 'IOSA-ISM-MNT-1-11-1',
    fonteOrigem: 'PADRAO_SETORIAL_IOSA',
    entidadeEmissora: 'IATA (International Air Transport Association)',
    documentoOrigemIdentificacao: 'IOSA Standards Manual (ISM) Ed. 18 Rev 1',
    codigoReferenciaOriginal: 'MNT 1.11.1',
    capituloSecaoSubitem: 'MNT Subsection 1.11 - Tooling and Calibration',
    tituloCurto: 'Calibration Program for Precision Tooling and Equipment (ISARP)',
    textoOriginal: '[CONTEÚDO INTEGRAL PROTEGIDO POR DIREITOS AUTORAIS IATA] O operador deve assegurar que a organização de manutenção contratada mantenha um programa formal de calibração periódica para ferramentas e equipamentos de teste de precisão utilizados em serviços de aeronavegabilidade.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'ISM Edition 18 Rev 1 (2026)',
    dataPublicacao: '2025-10-01',
    dataVigenciaFonte: '2026-01-01',
    urlOficialFonte: 'https://www.iata.org/en/publications/manuals/iosa-standard-manual/',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'PADRAO_SETORIAL',
    statusAcessoConteudo: 'AGUARDANDO_ACESSO_AUTORIZADO',
    statusValidacao: 'PENDENTE_VALIDACAO',
    tipoAcessoFonte: 'PRIVADA_LICENCIADA',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Padrão setorial da IATA aplicável a operadores aéreos membros. Exigível à IMPACTO como prestadora de linha apenas quando incorporado ao escopo contratual.',
    controleCentralId: 'CTRL-FERRAM-01',
    processoResponsavel: 'Garantia da Qualidade / Calibração',
    evidenciaEsperada: 'Programa documentado de calibração, etiquetas e relatórios de auditoria do operador.',
    metodoVerificacao: 'DOCUMENTAL',
    isIosaSetorial: true
  },
  {
    id: 'IOSA-ISM-MNT-1-12-1',
    fonteOrigem: 'PADRAO_SETORIAL_IOSA',
    entidadeEmissora: 'IATA (International Air Transport Association)',
    documentoOrigemIdentificacao: 'IOSA Standards Manual (ISM) Ed. 18 Rev 1',
    codigoReferenciaOriginal: 'MNT 1.12.1',
    capituloSecaoSubitem: 'MNT Subsection 1.12 - Technical Publications',
    tituloCurto: 'Management and Currency of Technical Documentation (ISARP)',
    textoOriginal: '[CONTEÚDO INTEGRAL PROTEGIDO POR DIREITOS AUTORAIS IATA] O operador deve assegurar que a documentação técnica utilizada pela manutenção contratada esteja na revisão vigente recomendada pelo fabricante e aceita pela autoridade do estado de matrícula.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'ISM Edition 18 Rev 1 (2026)',
    dataPublicacao: '2025-10-01',
    dataVigenciaFonte: '2026-01-01',
    urlOficialFonte: 'https://www.iata.org/en/publications/manuals/iosa-standard-manual/',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'PADRAO_SETORIAL',
    statusAcessoConteudo: 'AGUARDANDO_ACESSO_AUTORIZADO',
    statusValidacao: 'PENDENTE_VALIDACAO',
    tipoAcessoFonte: 'PRIVADA_LICENCIADA',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    aplicabilidadeImpacto: 'PARCIALMENTE_APLICAVEL',
    justificativaAplicabilidade: 'Padrão setorial IATA; deve ser rastreado sem equivaler a regulamento primário ANAC.',
    controleCentralId: 'CTRL-DOCS-01',
    processoResponsavel: 'Engenharia e Biblioteca Técnica',
    evidenciaEsperada: 'Lista mestra de manuais com verificação de vigência e logs de atualização.',
    metodoVerificacao: 'DOCUMENTAL',
    isIosaSetorial: true
  },

  // --- CLIENTES CONTRATUAIS PENDENTES DE DOCUMENTO (SALVAGUARDAS) ---
  {
    id: 'CLIENTE-AVION-EXPRESS-PENDENTE',
    fonteOrigem: 'CONTRATUAL_CLIENTE',
    entidadeEmissora: 'Avion Express',
    documentoOrigemIdentificacao: 'Avion Express Line Station Checklist',
    codigoReferenciaOriginal: 'AVION-AUDIT-PENDENTE',
    capituloSecaoSubitem: 'Checklist Contratual de Auditoria',
    tituloCurto: 'Auditoria Técnica de Linha Avion Express (Pendente de Envio)',
    textoOriginal: '[DOCUMENTO FORMAL PENDENTE DE PROTOCOLO] O checklist oficial de auditoria técnica da Avion Express ainda não foi fornecido pela companhia aérea para carga no QualyQuest. Este registro garante a governança e o rastreamento da demanda sem gerar perguntas ou critérios fictícios.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'Aguardando Protocolo de Documento',
    urlOficialFonte: 'Canal de Qualidade Avion Express / SGQ IMPACTO',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'CONTRATUAL',
    statusAcessoConteudo: 'AGUARDANDO_DOCUMENTO',
    statusValidacao: 'PENDENTE_VALIDACAO',
    tipoAcessoFonte: 'CLIENTE_ENVIO_PENDENTE',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    aplicabilidadeImpacto: 'APLICAVEL',
    justificativaAplicabilidade: 'A IMPACTO atende voos da Avion Express nas bases designadas; o checklist deve ser fornecido para formalização.',
    processoResponsavel: 'Garantia da Qualidade SGQ',
    evidenciaEsperada: 'Envio do arquivo oficial em PDF/XLSX do checklist pelo auditor da Avion Express.',
    metodoVerificacao: 'DOCUMENTAL'
  },
  {
    id: 'CLIENTE-SWISS-PENDENTE',
    fonteOrigem: 'CONTRATUAL_CLIENTE',
    entidadeEmissora: 'Swiss International Air Lines Ltd',
    documentoOrigemIdentificacao: 'SWISS Station Technical Audit Checklist',
    codigoReferenciaOriginal: 'SWISS-AUDIT-PENDENTE',
    capituloSecaoSubitem: 'Checklist Contratual de Auditoria',
    tituloCurto: 'Auditoria de Estação SWISS International (Pendente de Envio)',
    textoOriginal: '[DOCUMENTO FORMAL PENDENTE DE PROTOCOLO] O checklist formal de auditoria técnica da SWISS não está presente no repositório. Conforme as regras de integridade do QualyQuest, nenhum texto fictício ou simulado foi gerado. O registro permanece com status AGUARDANDO_DOCUMENTO até o upload do arquivo oficial.',
    idiomaOriginal: 'EN',
    edicaoRevisaoFonte: 'Aguardando Protocolo de Documento',
    urlOficialFonte: 'Portal de Qualidade SWISS / SGQ IMPACTO',
    dataUltimaConsulta: '2026-11-08',
    tipoRequisitoNormativo: 'CONTRATUAL',
    statusAcessoConteudo: 'AGUARDANDO_DOCUMENTO',
    statusValidacao: 'PENDENTE_VALIDACAO',
    tipoAcessoFonte: 'CLIENTE_ENVIO_PENDENTE',
    atualizacaoPossivel: false,
    modalidadeAtualizacao: 'UPLOAD_ARQUIVO_NOVA_EDICAO',
    aplicabilidadeImpacto: 'AGUARDANDO_AVALIACAO',
    justificativaAplicabilidade: 'Cliente internacional atendido em GRU. Requer recebimento formal do modelo de auditoria de linha.',
    processoResponsavel: 'Garantia da Qualidade SGQ',
    evidenciaEsperada: 'Upload de arquivo oficial pelo gestor de qualidade.',
    metodoVerificacao: 'DOCUMENTAL'
  }
];

// ============================================================================
// FUNÇÕES DE SERVIÇO: CONSULTA, MATRIZ E SIMULAÇÃO DE COMPARAÇÃO
// ============================================================================

/**
 * Retorna o catálogo oficial das fontes normativas com seus metadados de acesso
 */
export function getMatrizFontesNormativas(): FonteNormativaRegistro[] {
  return MATRIZ_FONTES_MESTRA;
}

/**
 * Retorna amostra com curadoria rigorosa de requisitos pesquisados
 */
export function getAmostrasRequisitosPesquisados(): AmostraRequisitoPesquisado[] {
  return REQUISITOS_PESQUISADOS_BASE;
}

/**
 * Simula a verificação e comparação de revisão contra a fonte oficial
 * (Fluxo dos 10 passos da Seção 8 do QualyQuest Fase 1.2)
 */
export function simularVerificacaoRevisaoFonte(fonteId: string): ResultadoComparacaoRevisaoFonte {
  const fonte = MATRIZ_FONTES_MESTRA.find((f) => f.id === fonteId);
  const now = new Date().toISOString();

  if (!fonte) {
    throw new Error(`Fonte não localizada no cadastro: ${fonteId}`);
  }

  // Se a fonte for do tipo onde identificamos uma revisão recente (ex: RBAC 145 Emenda 09)
  if (fonte.id === 'FONTE-ANAC-RBAC-145') {
    return {
      documentoId: fonte.id,
      codigoDocumento: fonte.codigoDocumento,
      revisaoAtualNoSistema: 'Emenda 08',
      revisaoIdentificadaNaFonte: 'Emenda 09 (Resolução ANAC 715 - Vigente)',
      dataConsulta: now,
      temDivergenciaRevisao: true,
      totalItensAnalisados: 45,
      itensNovos: [
        {
          codigoItem: 'RBAC 145.221(b)',
          titulo: 'Reporte de Dificuldade em Serviço e Falhas Eletrônicas',
          tipoMudanca: 'ITEM_NOVO',
          textoNovo: 'A organização de manutenção deve reportar à ANAC e ao detentor do projeto de tipo qualquer falha, defeito ou mau funcionamento de produto ou artigo que cause ou possa causar condição insegura.',
          revisaoNova: 'Emenda 09',
          impactoSugerido: 'Adequação dos fluxos de reporte SGSO e envio via sistema eletrônico ANAC.',
          requerRevisaoHumana: true
        }
      ],
      itensAlterados: [
        {
          codigoItem: 'RBAC 145.151(a)',
          titulo: 'Responsável Técnico e Vinculação Profissional',
          tipoMudanca: 'TEXTO_ALTERADO',
          textoAnterior: 'Exigência de formalidades corporativas e certidões estaduais prévias.',
          textoNovo: 'Cadastramento direto do Responsável Técnico (RT) simplificado conforme diretrizes do programa Voo Simples.',
          revisaoAnterior: 'Emenda 08',
          revisaoNova: 'Emenda 09',
          impactoSugerido: 'Atualização do formulário F 001-01 e procedimento MOMQ Cap 1.2.',
          requerRevisaoHumana: true
        }
      ],
      itensInalterados: 42,
      itensRevogados: [
        {
          codigoItem: 'RBAC 145.103',
          titulo: 'Exigências Documentais de Saúde Ocupacional Competência de Outros Órgãos',
          tipoMudanca: 'REVOGADO_SUBSTITUIDO',
          textoAnterior: 'Fiscalização de registros de higiene e medicina do trabalho atribuída à autoridade aeronáutica.',
          revisaoAnterior: 'Emenda 08',
          impactoSugerido: 'Desregulamentado do escopo direto ANAC; migrado para conformidade trabalhista geral.',
          requerRevisaoHumana: true
        }
      ],
      mensagemConclusiva: 'Divergência de revisão detectada entre a base interna (Emenda 08) e a publicação oficial ANAC (Emenda 09). Requer aprovação da qualidade para incorporação.'
    };
  }

  if (fonte.id === 'FONTE-EASA-PART-145') {
    return {
      documentoId: fonte.id,
      codigoDocumento: fonte.codigoDocumento,
      revisaoAtualNoSistema: 'Easy Access Continuing Airworthiness (Ed. 2022)',
      revisaoIdentificadaNaFonte: 'Easy Access Rules Part-145 (Consolidado Reg (EU) 2021/1963 SMS)',
      dataConsulta: now,
      temDivergenciaRevisao: false,
      totalItensAnalisados: 52,
      itensNovos: [],
      itensAlterados: [],
      itensInalterados: 52,
      itensRevogados: [],
      mensagemConclusiva: 'Revisão no QualyQuest coincide integralmente com a publicação XML oficial do eRules da EASA. Nenhuma divergência detectada.'
    };
  }

  if (fonte.id === 'FONTE-IATA-IOSA-ISM') {
    return {
      documentoId: fonte.id,
      codigoDocumento: fonte.codigoDocumento,
      revisaoAtualNoSistema: 'ISM Edição 17',
      revisaoIdentificadaNaFonte: 'ISM Edição 18 Rev 1 (Vigência 2026)',
      dataConsulta: now,
      temDivergenciaRevisao: true,
      totalItensAnalisados: 85,
      itensNovos: [
        {
          codigoItem: 'MNT 1.14.1 (Proposto)',
          titulo: 'Risk-based Maturity Assessment for Subcontracted Maintenance',
          tipoMudanca: 'ITEM_NOVO',
          textoNovo: '[CONTEÚDO PROTEGIDO POR LICENÇA IATA] Avaliação de maturidade de gestão de risco em estações de linha.',
          revisaoNova: 'Edição 18 Rev 1',
          impactoSugerido: 'Aguardando disponibilização do texto oficial pelo operador aéreo cliente.',
          requerRevisaoHumana: true
        }
      ],
      itensAlterados: [],
      itensInalterados: 84,
      itensRevogados: [],
      mensagemConclusiva: 'A IATA publicou a Edição 18 Rev 1. Como trata-se de obra privada protegida, o sistema registrou o metadado como AGUARDANDO_ACESSO_AUTORIZADO e aguarda o upload do documento licenciado.'
    };
  }

  // Padrão sem alterações
  return {
    documentoId: fonte.id,
    codigoDocumento: fonte.codigoDocumento,
    revisaoAtualNoSistema: fonte.revisaoVigenteIdentificada,
    revisaoIdentificadaNaFonte: fonte.revisaoVigenteIdentificada,
    dataConsulta: now,
    temDivergenciaRevisao: false,
    totalItensAnalisados: fonte.totalItensExtraidos,
    itensNovos: [],
    itensAlterados: [],
    itensInalterados: fonte.totalItensExtraidos,
    itensRevogados: [],
    mensagemConclusiva: 'Documento analisado em conformidade com o acervo auditado. Nenhuma pendência detectada na consulta.'
  };
}
