/**
 * SERVIÇO DA MATRIZ CORPORATIVA DE CONFORMIDADE — QUALYQUEST (FASE 1.4)
 * 
 * Regras Estritas de Engenharia SGQ:
 * 1. Separação Absoluta de Conceitos: Aplicabilidade ≠ Conformidade.
 * 2. Ausência de evidência NUNCA é conformidade presumida.
 * 3. Existência de procedimento NÃO comprova implementação prática.
 * 4. Um Controle Corporativo Permanente atende N requisitos de autoridades e clientes.
 * 5. Requisitos de origem permanecem 100% individualizados.
 * 6. Respostas Institucionais aprovadas são reutilizáveis com controle de versão.
 * 7. Evidências objetivas possuem validade, processo, base e rastreabilidade documental.
 * 8. Snapshots históricos de auditorias concluídas permanecem 100% intocados.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './firebase/config';
import {
  RequisitoClienteItem,
  ControleCentralSGQ,
  RespostaInstitucionalAprovada,
  EvidenciaRequisitoItem,
  StatusConformidadeSGQ,
  SituacaoAplicabilidadeImpacto,
  StatusRespostaInstitucional,
  UserProfile,
  TipoOrigemRequisito
} from '../types';
import {
  DEFAULT_ORGANIZATION_ID,
  sanitizeForFirestore,
  recordOrganizationAudit
} from './firebase/firestore';
import { INITIAL_CENTRAL_CONTROLS } from '../data/initialClientRequirements';

// ============================================================================
// 1. EXPANSÃO DE CONTROLES CENTRAIS CORPORATIVOS DA IMPACTO
// ============================================================================

export const CONTROLES_CORPORATIVOS_EXPANDIDOS: ControleCentralSGQ[] = [
  ...INITIAL_CENTRAL_CONTROLS.map((c) => ({
    ...c,
    processoRelacionado:
      c.codigo === 'CTRL-TREIN-01'
        ? 'Treinamento & Qualificação Técnica'
        : c.codigo === 'CTRL-FERRAM-01'
        ? 'Metrologia & Ferramentaria'
        : c.codigo === 'CTRL-DOCS-01'
        ? 'Publicações Técnicas & Engenharia'
        : c.codigo === 'CTRL-MAT-01'
        ? 'Almoxarifado & Recebimento'
        : c.codigo === 'CTRL-QUARENT-01'
        ? 'Garantia da Qualidade / RNC'
        : c.codigo === 'CTRL-HOUSEKEEP-01'
        ? 'Operações de Hangar & Pátio'
        : 'Segurança Ocupacional & Manutenção',
    documentosInternosRelacionados:
      c.codigo === 'CTRL-TREIN-01'
        ? ['PTM MNT-002 Rev. 08', 'F 001-07 (Quadro de Pessoal)', 'F 001-19 (Ficha Individual de Treinamento)']
        : c.codigo === 'CTRL-FERRAM-01'
        ? ['MOMQ Seção 3.4.2', 'F 001-06 (Controle de Ferramentas Calibradas)', 'F 001-06-4 (Quarentena Ferramental)']
        : c.codigo === 'CTRL-DOCS-01'
        ? ['MOMQ Seção 1.2', 'F 001-021 (Lista Mestra de Documentos Controlados)', 'POP-DOC-01']
        : c.codigo === 'CTRL-MAT-01'
        ? ['MOMQ Seção 3.3', 'SEG-002 (Inspeção de Recebimento)', 'F 001-01-1 (Etiquetas de Aceitação)']
        : c.codigo === 'CTRL-QUARENT-01'
        ? ['MOMQ Seção 3.5', 'POP-QUA-01 (Segregação de Material Rejeitado)', 'F 001-20 (Ficha RNC)']
        : c.codigo === 'CTRL-HOUSEKEEP-01'
        ? ['POP-FOD-01 (Prevenção de FOD)', 'Checklist Diário F 001-30 (FOD Walk)']
        : ['POP-LOTO-01', 'F 001-28 (Registro de Aplicação de Travas)'],
    periodicidadeAcompanhamento: 'MENSAL',
    statusConformidade: 'CONFORME' as StatusConformidadeSGQ,
    dataUltimaAvaliacao: '2026-11-01',
    dataProximaAvaliacao: '2026-12-01',
    pendenciasPlanoAcao: '',
    evidenciasVinculadasIds: [],
    totalEvidenciasValidasCount: 3
  })),

  // Controles Complementares Fundamentais do SGQ Aeronáutico (Fase 1.4)
  {
    id: 'CTRL-AUDIT-01',
    organizationId: 'org_impacto_aviation',
    codigo: 'CTRL-AUDIT-01',
    nome: 'Programa de Auditorias Internas da Qualidade e Tratamento de RNCs',
    moduloOrigem: 'Auditorias',
    descricao: 'Auditorias internas programadas e extraordinárias, monitoramento de prazos de contenção e análise de causa raiz (5 Porquês, Ishikawa) para fechamento de Não Conformidades.',
    responsavelPadrao: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    evidenciasTipicas: ['Plano Anual de Auditorias', 'Relatórios de Auditoria Interna', 'RNCs Concluídas', 'Verificação de Eficácia'],
    status: 'ATIVO',
    requisitosVinculadosCount: 4,
    processoRelacionado: 'Garantia da Qualidade SGQ',
    documentosInternosRelacionados: ['MOMQ Seção 3.1 (Sistema de Qualidade)', 'POP-AUD-01', 'F 001-14 (Relatório de Auditoria)'],
    periodicidadeAcompanhamento: 'MENSAL',
    statusConformidade: 'CONFORME',
    dataUltimaAvaliacao: '2026-11-05',
    dataProximaAvaliacao: '2026-12-05',
    pendenciasPlanoAcao: '',
    evidenciasVinculadasIds: [],
    totalEvidenciasValidasCount: 4,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z'
  },
  {
    id: 'CTRL-SGSO-01',
    organizationId: 'org_impacto_aviation',
    codigo: 'CTRL-SGSO-01',
    nome: 'Sistema de Gerenciamento da Segurança Operacional & Reporte Voluntário',
    moduloOrigem: 'OperacionalSGQ',
    descricao: 'Identificação de perigos, gerenciamento proativo de riscos operacionais, comitê de segurança de manutenção, reporte sem punição (Cultura Justa) e alinhamento à IS 145.214.',
    responsavelPadrao: 'Gestor Responsável de Segurança Operacional (SGSO)',
    evidenciasTipicas: ['Manual de Gerenciamento da Segurança (MGSO)', 'Atas de Reunião do Comitê de Segurança', 'Relatórios RELPREV', 'Matriz de Riscos'],
    status: 'ATIVO',
    requisitosVinculadosCount: 3,
    processoRelacionado: 'Segurança Operacional (SGSO)',
    documentosInternosRelacionados: ['MGSO MNT-003', 'F 001-25 (Formulário de Reporte Voluntário)'],
    periodicidadeAcompanhamento: 'MENSAL',
    statusConformidade: 'CONFORME',
    dataUltimaAvaliacao: '2026-11-03',
    dataProximaAvaliacao: '2026-12-03',
    pendenciasPlanoAcao: '',
    evidenciasVinculadasIds: [],
    totalEvidenciasValidasCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z'
  },
  {
    id: 'CTRL-CRS-01',
    organizationId: 'org_impacto_aviation',
    codigo: 'CTRL-CRS-01',
    nome: 'Certificação de Retorno ao Serviço (CRS) e Liberação Técnica de Manutenção',
    moduloOrigem: 'OperacionalSGQ',
    descricao: 'Controle de mecânicos autorizados a emitir CRS (Certificate of Release to Service), assinaturas em Technical Logbooks, conformidade com RBAC 43.9 e Suplementos EASA/FAA.',
    responsavelPadrao: 'Eng. Chefe de Manutenção de Linha',
    evidenciasTipicas: ['Technical Logbook de Aeronave com CRS', 'Cartões de Trabalho (Work Orders) Fechados', 'Lista de Certifying Staff Aprovada'],
    status: 'ATIVO',
    requisitosVinculadosCount: 4,
    processoRelacionado: 'Manutenção de Linha & Liberação Técnica',
    documentosInternosRelacionados: ['MOMQ Seção 5.1 (Liberação de Aeronaves)', 'Suplemento EASA MNT-004'],
    periodicidadeAcompanhamento: 'MENSAL',
    statusConformidade: 'CONFORME',
    dataUltimaAvaliacao: '2026-11-02',
    dataProximaAvaliacao: '2026-12-02',
    pendenciasPlanoAcao: '',
    evidenciasVinculadasIds: [],
    totalEvidenciasValidasCount: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z'
  },
  {
    id: 'CTRL-TERC-01',
    organizationId: 'org_impacto_aviation',
    codigo: 'CTRL-TERC-01',
    nome: 'Homologação e Controle de Fornecedores e Serviços Subcontratados',
    moduloOrigem: 'OperacionalSGQ',
    descricao: 'Avaliação técnica inicial, auditoria presencial ou documental de oficinas terceirizadas e fornecedores de calibração metrológica e ensaios não destrutivos (END).',
    responsavelPadrao: 'Inspetor Chefe da Qualidade de Fornecedores',
    evidenciasTipicas: ['Lista de Fornecedores Qualificados (LFQ)', 'Questionários de Auditoria de Fornecedor', 'Certificados ANAC/EASA/FAA de Subcontratadas'],
    status: 'ATIVO',
    requisitosVinculadosCount: 3,
    processoRelacionado: 'Suprimentos & Qualidade Externa',
    documentosInternosRelacionados: ['MOMQ Seção 3.6 (Subcontratação)', 'F 001-09 (Avaliação de Fornecedores)'],
    periodicidadeAcompanhamento: 'TRIMESTRAL',
    statusConformidade: 'CONFORME',
    dataUltimaAvaliacao: '2026-10-15',
    dataProximaAvaliacao: '2027-01-15',
    pendenciasPlanoAcao: '',
    evidenciasVinculadasIds: [],
    totalEvidenciasValidasCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z'
  },
  {
    id: 'CTRL-INFRA-01',
    organizationId: 'org_impacto_aviation',
    codigo: 'CTRL-INFRA-01',
    nome: 'Infraestrutura Física, Proteção Ambiental e Condições de Hangar',
    moduloOrigem: 'OperacionalSGQ',
    descricao: 'Manutenção predial de hangares e estações de linha, iluminação técnica adequada em baías de manutenção, controle de umidade/temperatura em salas de aviônicos e baterias.',
    responsavelPadrao: 'Gerente de Infraestrutura e Facilidades',
    evidenciasTipicas: ['Laudo de Luminotécnica', 'Checklist Predial Periódico', 'Memorial Descritivo de Hangar Aprovado pela ANAC'],
    status: 'ATIVO',
    requisitosVinculadosCount: 3,
    processoRelacionado: 'Infraestrutura & Facilidades',
    documentosInternosRelacionados: ['MOMQ Seção 2.1 (Instalações)', 'RBAC 145.101'],
    periodicidadeAcompanhamento: 'SEMESTRAL',
    statusConformidade: 'CONFORME',
    dataUltimaAvaliacao: '2026-09-20',
    dataProximaAvaliacao: '2027-03-20',
    pendenciasPlanoAcao: '',
    evidenciasVinculadasIds: [],
    totalEvidenciasValidasCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z'
  }
];

// ============================================================================
// 2. RESPOSTAS INSTITUCIONAIS APROVADAS (REUTILIZÁVEIS PELA QUALIDADE)
// ============================================================================

export const INITIAL_INSTITUTIONAL_RESPONSES: RespostaInstitucionalAprovada[] = [
  {
    id: 'RESP-INST-FERRAM-01',
    organizationId: 'org_impacto_aviation',
    titulo: 'Resposta Institucional: Calibração de Ferramental e Rastreabilidade Metrológica',
    textoResposta:
      'A IMPACTO possui um sistema centralizado de controle de ferramentário e calibração metrológica (CTRL-FERRAM-01), em total conformidade com o RBAC 145.109(b), EASA Part-145.A.40, FAA 14 CFR 145.109 e exigências contratuais de clientes (Kalitta QA-14 Seção 3 e Atlas Q2059 Seção 2). Todos os instrumentos de medição, torquímetros, manômetros e bancadas de teste são calibrados por laboratórios credenciados pela Rede Brasileira de Calibração (RBC/INMETRO) ou rastreáveis ao NIST/internacional. Cada ferramenta recebe etiqueta física inviolável contendo número de patrimônio, data de calibração, data de vencimento e identificação do laboratório. Ferramentas vencidas ou danificadas são imediatamente recolhidas e transferidas para a área física de quarentena com etiqueta vermelha de bloqueio (CTRL-QUARENT-01), sendo impedida sua utilização em aeronaves.',
    controleCentralId: 'CTRL-FERRAM-01',
    controleCentralCodigo: 'CTRL-FERRAM-01',
    requisitosRelacionadosIds: [
      'REQ-ANAC-145-109',
      'ANAC-RBAC145-109B',
      'REQ-ATLAS-Q2059-02',
      'REQ-KALITTA-QA14-16',
      'REQ-KALITTA-QA14-17',
      'FAA-14-CFR-145-109',
      'EASA-145-A-40'
    ],
    documentosEvidenciasIds: ['EVID-CALIB-TORQ-01', 'EVID-CALIB-MANOM-01', 'EVID-PROC-F001-06'],
    referenciasProcedimentos: ['MOMQ Seção 3.4.2', 'F 001-06 (Lista Mestra de Ferramentas Calibradas)', 'F 001-06-4'],
    elaboradoPorNome: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    aprovadoPorNome: 'Diretoria Técnica & Garantia da Qualidade',
    dataAprovacao: '2026-08-10',
    versao: '2.1',
    status: 'APROVADA',
    historicoVersoes: [
      {
        versao: '1.0',
        data: '2025-02-10',
        autor: 'Paulo Okubo',
        resumoAlteracao: 'Emissão inicial para atendimento aos requisitos RBAC 145 e clientes Atlas/Kalitta.'
      },
      {
        versao: '2.0',
        data: '2026-01-15',
        autor: 'Paulo Okubo',
        resumoAlteracao: 'Harmonização com formulário QA-14 Rev. 4 da Kalitta e inclusão de rastreabilidade NIST.'
      },
      {
        versao: '2.1',
        data: '2026-08-10',
        autor: 'Paulo Okubo',
        resumoAlteracao: 'Revisão conforme MOMQ Rev. 08 aprovado pela ANAC.'
      }
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z'
  },
  {
    id: 'RESP-INST-TREIN-01',
    organizationId: 'org_impacto_aviation',
    titulo: 'Resposta Institucional: Programa de Treinamento Técnico, Fatores Humanos e Autorização Formal',
    textoResposta:
      'O programa de capacitação técnica da IMPACTO é regulado pelo Programa de Treinamento em Manutenção (PTM MNT-002 Rev. 08), aprovado pela ANAC sob a IS 145-010C e alinhado aos padrões EASA Part-145.A.30/35 e FAA 14 CFR 145.161. Todo mecânico ou inspetor atuante em bases de linha ou hangar possui carteira CHT válida emitida pela ANAC, treinamento inicial e recorrente em Fatores Humanos (HF com validade máxima de 24 meses), Segurança de Tanque de Combustível (FTS), EWIS (Electrical Wiring Interconnection System) e qualificação específica para o tipo de aeronave atendida (GenFam Boeing 747/777/767, Airbus A320 ou Embraer E190). A concessão de autorização de retorno ao serviço (Certifying Staff) é formalizada individualmente via Formulário F 001-07 e dossiê F 001-19, sob supervisão direta do Responsável Técnico perante o CREA e ANAC.',
    controleCentralId: 'CTRL-TREIN-01',
    controleCentralCodigo: 'CTRL-TREIN-01',
    requisitosRelacionadosIds: [
      'REQ-ANAC-145-161',
      'ANAC-RBAC145-161',
      'EASA-145-A-30',
      'REQ-ATLAS-Q2059-04',
      'REQ-KALITTA-QA14-06',
      'REQ-KALITTA-QA14-08'
    ],
    documentosEvidenciasIds: ['EVID-TREIN-HF-01', 'EVID-DOSSIE-CHT-01', 'EVID-LISTA-F001-07'],
    referenciasProcedimentos: ['PTM MNT-002 Rev. 08', 'F 001-07 (Quadro de Pessoal Técnico)', 'F 001-19'],
    elaboradoPorNome: 'Eng. Chefe de Treinamento Técnico',
    aprovadoPorNome: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    dataAprovacao: '2026-05-20',
    versao: '2.0',
    status: 'APROVADA',
    historicoVersoes: [
      {
        versao: '1.0',
        data: '2025-01-20',
        autor: 'Eng. Treinamento',
        resumoAlteracao: 'Emissão inicial PTM.'
      },
      {
        versao: '2.0',
        data: '2026-05-20',
        autor: 'Paulo Okubo',
        resumoAlteracao: 'Adequação à Revisão 08 do PTM e inclusão de módulo de Cultura Justa.'
      }
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z'
  },
  {
    id: 'RESP-INST-DOCS-01',
    organizationId: 'org_impacto_aviation',
    titulo: 'Resposta Institucional: Controle e Disponibilidade de Publicações Técnicas e AMMs Vigentes',
    textoResposta:
      'A gestão documental da IMPACTO obedece à Lista Mestra de Publicações Controladas F 001-021 (Rev. 11), em conformidade com o RBAC 145.109(d), IS 145.109-001C, EASA Part-145.A.45 e FAA 14 CFR 145.109. Os dados técnicos de fabricantes (Boeing MyBoeingFleet, AirbusWorld, Embraer FlyEmbraer) e manuais de políticas de manutenção de clientes (GMM Kalitta, Atlas Air Manuals) são acessados em tempo real diretamente pelos técnicos na linha de manutenção através de terminais dedicados e tablets certificados. As assinaturas técnicas corporativas são monitoradas mensalmente pelo setor de Engenharia de Publicações, garantindo que nenhum serviço de manutenção seja executado com dados técnicos obsoletos.',
    controleCentralId: 'CTRL-DOCS-01',
    controleCentralCodigo: 'CTRL-DOCS-01',
    requisitosRelacionadosIds: [
      'REQ-ANAC-145-209',
      'ANAC-RBAC145-109A',
      'REQ-ATLAS-Q2059-09',
      'REQ-KALITTA-QA14-01',
      'REQ-KALITTA-QA14-02',
      'FAA-14-CFR-145-109'
    ],
    documentosEvidenciasIds: ['EVID-LOG-BOEING-01', 'EVID-CATALOGO-F001-021'],
    referenciasProcedimentos: ['MOMQ Seção 1.2', 'F 001-021 Rev. 11', 'IS 145.109-001C'],
    elaboradoPorNome: 'Engenharia de Publicações Técnicas',
    aprovadoPorNome: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    dataAprovacao: '2026-08-06',
    versao: '1.8',
    status: 'APROVADA',
    historicoVersoes: [
      {
        versao: '1.8',
        data: '2026-08-06',
        autor: 'Engenharia Publicações',
        resumoAlteracao: 'Atualização alinhada à Revisão 11 do Catálogo F 001-021.'
      }
    ],
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-08-06T00:00:00.000Z'
  },
  {
    id: 'RESP-INST-MAT-01',
    organizationId: 'org_impacto_aviation',
    titulo: 'Resposta Institucional: Rastreabilidade de Peças Aeronáuticas, Formulários 8130-3 e Shelf-Life',
    textoResposta:
      'O recebimento, armazenamento e expedição de peças e consumíveis aeronáuticos seguem estritamente o procedimento SEG-002 e a Seção 3.3 do MOMQ. Nenhuma peça é disponibilizada para instalação em aeronaves sem a presença do certificado original de aeronavegabilidade reconhecido (FAA Form 8130-3, EASA Form 1 ou ANAC Form F-100 emitido por fabricante ou estação homologada). O controle metrológico de vida útil (shelf-life) para selantes, borrachas, tintas e graxas é gerenciado por sistema informatizado, com segregação visual e bloqueio físico 30 dias antes do vencimento.',
    controleCentralId: 'CTRL-MAT-01',
    controleCentralCodigo: 'CTRL-MAT-01',
    requisitosRelacionadosIds: [
      'EASA-145-A-42',
      'REQ-ATLAS-Q2059-03',
      'REQ-KALITTA-QA14-38',
      'REQ-KALITTA-QA14-39'
    ],
    documentosEvidenciasIds: ['EVID-FORM-8130-BOEING-01', 'EVID-MAPA-SHELFLIFE-01'],
    referenciasProcedimentos: ['MOMQ Seção 3.3', 'SEG-002', 'F 001-01-1'],
    elaboradoPorNome: 'Inspetor Chefe de Recebimento de Materiais',
    aprovadoPorNome: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    dataAprovacao: '2026-07-15',
    versao: '1.5',
    status: 'APROVADA',
    historicoVersoes: [
      {
        versao: '1.5',
        data: '2026-07-15',
        autor: 'Inspetor Materiais',
        resumoAlteracao: 'Revisão das regras de aceitação de peças sob acordo bilateral BASA Brasil-EUA.'
      }
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z'
  },
  {
    id: 'RESP-INST-HOUSEKEEP-01',
    organizationId: 'org_impacto_aviation',
    titulo: 'Resposta Institucional: Housekeeping, Padrões 5S e Prevenção de Foreign Object Debris (FOD)',
    textoResposta:
      'A IMPACTO mantém rotinas contínuas de prevenção de FOD e conservação de hangares e pátios de manutenção (CTRL-HOUSEKEEP-01), em conformidade com o RBAC 145.101 e exigências de operadoras como Kalitta Air e Atlas Air. Diariamente, antes e após cada intervenção de manutenção, são executadas varreduras de FOD (FOD walks) com preenchimento da ficha F 001-30. Caçambas com tampa e identificação de resíduos de manutenção estão posicionadas em todas as baías, e ferramentas manuais são controladas por caixas com silhuetas de espuma visual (shadow boards).',
    controleCentralId: 'CTRL-HOUSEKEEP-01',
    controleCentralCodigo: 'CTRL-HOUSEKEEP-01',
    requisitosRelacionadosIds: [
      'ANAC-RBAC145-101',
      'REQ-ATLAS-Q2059-01',
      'REQ-KALITTA-QA14-50',
      'REQ-KALITTA-QA14-51'
    ],
    documentosEvidenciasIds: ['EVID-FOD-WALK-LOG-01', 'EVID-FOTO-HANGAR-5S'],
    referenciasProcedimentos: ['POP-FOD-01', 'MOMQ Seção 2.1', 'F 001-30'],
    elaboradoPorNome: 'Supervisor de Operações de Hangar',
    aprovadoPorNome: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    dataAprovacao: '2026-08-01',
    versao: '1.2',
    status: 'APROVADA',
    historicoVersoes: [
      {
        versao: '1.2',
        data: '2026-08-01',
        autor: 'Supervisor Hangar',
        resumoAlteracao: 'Inclusão de rotina específica para estações de linha em Viracopos e Galeão.'
      }
    ],
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z'
  }
];

// ============================================================================
// 3. EVIDÊNCIAS DE CONFORMIDADE VINCULADAS (OBJETIVAS E AUDITÁVEIS)
// ============================================================================

export const INITIAL_COMPLIANCE_EVIDENCES: EvidenciaRequisitoItem[] = [
  {
    id: 'EVID-CALIB-TORQ-01',
    organizationId: 'org_impacto_aviation',
    tipo: 'CERTIFICADO_CALIBRACAO',
    titulo: 'Certificado de Calibração RBC — Torquímetro Snap-On 30-250 ft-lb (PAT-042)',
    descricao: 'Calibração metrológica anual realizada pelo Laboratório Metrológico Acreditado Cgcre/Inmetro nº 0128. Incerteza expandida de medição de 0,8%.',
    numeroReferencia: 'CERT-RBC-2026-8841',
    dataEvidencia: '2026-04-10',
    dataEmissao: '2026-04-10',
    dataValidade: '2027-04-10',
    baseOperacional: 'SOD',
    processoSetor: 'Metrologia / Ferramentaria',
    statusValidade: 'VALIDO',
    responsavel: 'Chefe de Metrologia & Ferramentaria',
    controleId: 'CTRL-FERRAM-01',
    controleCodigo: 'CTRL-FERRAM-01',
    requisitoId: 'REQ-ANAC-145-109',
    numeroItem: '145.109',
    urlOuArquivo: 'Documento arquivado no acervo metrológico físico e digital (Pasta MET-2026 / F 001-06)',
    aprovadoPorAuditor: true
  },
  {
    id: 'EVID-CALIB-MANOM-01',
    organizationId: 'org_impacto_aviation',
    tipo: 'CERTIFICADO_CALIBRACAO',
    titulo: 'Certificado de Calibração RBC — Manômetro Digital de Pressão Hidráulica (PAT-108)',
    descricao: 'Calibração de pressão padrão RBC com rastreabilidade ao INMETRO. Selo inviolável fixado no instrumento.',
    numeroReferencia: 'CERT-RBC-2026-9042',
    dataEvidencia: '2026-05-15',
    dataEmissao: '2026-05-15',
    dataValidade: '2027-05-15',
    baseOperacional: 'GRU',
    processoSetor: 'Metrologia / Linha',
    statusValidade: 'VALIDO',
    responsavel: 'Inspetor Chefe de Linha GRU',
    controleId: 'CTRL-FERRAM-01',
    controleCodigo: 'CTRL-FERRAM-01',
    requisitoId: 'REQ-ATLAS-Q2059-02',
    numeroItem: 'Q2059-02',
    urlOuArquivo: 'Certificado arquivado na estação de linha GRU (Pasta Ferramental 2026)',
    aprovadoPorAuditor: true
  },
  {
    id: 'EVID-TREIN-HF-01',
    organizationId: 'org_impacto_aviation',
    tipo: 'REGISTRO_TREINAMENTO',
    titulo: 'Atestado de Treinamento em Fatores Humanos (Human Factors) — Turma Linha 2026',
    descricao: 'Treinamento presencial de 16 horas ministrado por instrutor credenciado ANAC/EASA, abordando Dirty Dozen, comunicação, fadiga e cultura justa.',
    numeroReferencia: 'ATA-TREIN-HF-2026-02',
    dataEvidencia: '2026-03-20',
    dataEmissao: '2026-03-20',
    dataValidade: '2028-03-20',
    baseOperacional: 'SOD',
    processoSetor: 'Treinamento Técnico',
    statusValidade: 'VALIDO',
    responsavel: 'Eng. Chefe de Treinamento',
    controleId: 'CTRL-TREIN-01',
    controleCodigo: 'CTRL-TREIN-01',
    requisitoId: 'REQ-ANAC-145-161',
    numeroItem: '145.161',
    urlOuArquivo: 'Arquivo no dossiê de treinamento corporativo PTM / Sistema QualyQuest Pessoas',
    aprovadoPorAuditor: true
  },
  {
    id: 'EVID-LISTA-F001-07',
    organizationId: 'org_impacto_aviation',
    tipo: 'DOCUMENTO',
    titulo: 'Quadro Geral de Pessoal Técnico e Inspetores Designados (Formulário F 001-07)',
    descricao: 'Listagem oficial aprovada pelo Responsável Técnico, discriminando licenças CHT, habilitações por célula/GMP/aviônicos e autorizações de retorno ao serviço vigentes.',
    numeroReferencia: 'F 001-07-REV-2026-Q3',
    dataEvidencia: '2026-10-01',
    dataEmissao: '2026-10-01',
    dataValidade: '2027-01-01',
    baseOperacional: 'SOD',
    processoSetor: 'Garantia da Qualidade',
    statusValidade: 'VALIDO',
    responsavel: 'Paulo Okubo (Gerente da Garantia da Qualidade)',
    controleId: 'CTRL-TREIN-01',
    controleCodigo: 'CTRL-TREIN-01',
    requisitoId: 'REQ-ANAC-145-161',
    numeroItem: '145.161',
    urlOuArquivo: 'Documento protocolado eletronicamente perante a ANAC via SEI',
    aprovadoPorAuditor: true
  },
  {
    id: 'EVID-CATALOGO-F001-021',
    organizationId: 'org_impacto_aviation',
    tipo: 'DOCUMENTO',
    titulo: 'Lista Mestra de Publicações Controladas e Formulários SGQ (F 001-021 Rev. 11)',
    descricao: 'Catálogo de controle de configuração documental da IMPACTO contendo 36 publicações técnicas e 29 formulários formais.',
    numeroReferencia: 'F 001-021 Rev. 11',
    dataEvidencia: '2026-08-06',
    dataEmissao: '2026-08-06',
    dataValidade: '2027-08-06',
    baseOperacional: 'SOD',
    processoSetor: 'Controle Documental',
    statusValidade: 'VALIDO',
    responsavel: 'Engenharia de Publicações Técnicas',
    controleId: 'CTRL-DOCS-01',
    controleCodigo: 'CTRL-DOCS-01',
    requisitoId: 'REQ-ANAC-145-209',
    numeroItem: '145.209',
    urlOuArquivo: 'Acervo controlado do SGQ — f001021ControlledPublications.ts',
    aprovadoPorAuditor: true
  },
  {
    id: 'EVID-FORM-8130-BOEING-01',
    organizationId: 'org_impacto_aviation',
    tipo: 'DOCUMENTO',
    titulo: 'Certificado de Aeronavegabilidade FAA Form 8130-3 — Válvula Hidráulica B747 (P/N 65-42100-3)',
    descricao: 'Release tag oficial emitido por fabricante Boeing com aprovação de retorno ao serviço, arquivado no dossiê de recebimento da peça.',
    numeroReferencia: 'FAA-8130-3-BOEING-98214',
    dataEvidencia: '2026-06-12',
    dataEmissao: '2026-06-12',
    baseOperacional: 'GRU',
    processoSetor: 'Almoxarifado & Recebimento',
    statusValidade: 'VALIDO',
    responsavel: 'Inspetor de Recebimento de Materiais',
    controleId: 'CTRL-MAT-01',
    controleCodigo: 'CTRL-MAT-01',
    requisitoId: 'EASA-145-A-42',
    numeroItem: '145.A.42',
    urlOuArquivo: 'Arquivo físico e digital na baía de recebimento de Viracopos (VCP)',
    aprovadoPorAuditor: true
  },
  {
    id: 'EVID-FOD-WALK-LOG-01',
    organizationId: 'org_impacto_aviation',
    tipo: 'DOCUMENTO',
    titulo: 'Relatório Mensal de Inspeções Diárias de Pátio e Prevenção de FOD (F 001-30)',
    descricao: 'Fichas diárias de FOD walk assinadas pelos chefes de equipe em todos os turnos de trânsito em GRU e VCP.',
    numeroReferencia: 'FOD-LOG-2026-10',
    dataEvidencia: '2026-10-31',
    dataEmissao: '2026-10-31',
    dataValidade: '2026-11-30',
    baseOperacional: 'VCP',
    processoSetor: 'Operações de Pátio',
    statusValidade: 'PROXIMO_VENCIMENTO',
    responsavel: 'Supervisor de Manutenção de Linha',
    controleId: 'CTRL-HOUSEKEEP-01',
    controleCodigo: 'CTRL-HOUSEKEEP-01',
    requisitoId: 'REQ-ATLAS-Q2059-01',
    numeroItem: 'Q2059-01',
    urlOuArquivo: 'Pasta física de inspeções operacionais de pátio VCP',
    aprovadoPorAuditor: true
  }
];

// ============================================================================
// 4. PERSISTÊNCIA EM FIRESTORE: RESPOSTAS INSTITUCIONAIS
// ============================================================================

export function subscribeToInstitutionalResponses(
  organizationId: string,
  callback: (responses: RespostaInstitucionalAprovada[]) => void
): () => void {
  if (!organizationId || !auth.currentUser) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'institutional_responses');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_INSTITUTIONAL_RESPONSES.forEach((resp) => {
              const docRef = doc(db, 'organizations', organizationId, 'institutional_responses', resp.id);
              batch.set(docRef, sanitizeForFirestore({ ...resp, organizationId }));
            });
            await batch.commit();
          } catch (seedErr) {
            console.warn('[complianceMatrix] Seed fallback respostas institucionais para memória:', seedErr);
            callback(INITIAL_INSTITUTIONAL_RESPONSES);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: RespostaInstitucionalAprovada[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as RespostaInstitucionalAprovada);
      });
      list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      callback(list);
    },
    (err) => {
      console.warn('[complianceMatrix] Erro ao escutar institutional_responses:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_INSTITUTIONAL_RESPONSES : []);
    }
  );
}

export async function saveInstitutionalResponse(
  organizationId: string,
  response: Partial<RespostaInstitucionalAprovada>,
  currentUser?: UserProfile | null
): Promise<string> {
  const respId = response.id || `RESP-INST-${Date.now()}`;
  const now = new Date().toISOString();
  const userName = currentUser?.displayName || 'Garantia da Qualidade SGQ';
  const userUid = auth.currentUser?.uid || currentUser?.uid;

  const record: RespostaInstitucionalAprovada = {
    id: respId,
    organizationId,
    titulo: response.titulo || 'Resposta Institucional Aprovada',
    textoResposta: response.textoResposta || '',
    controleCentralId: response.controleCentralId,
    controleCentralCodigo: response.controleCentralCodigo,
    requisitosRelacionadosIds: response.requisitosRelacionadosIds || [],
    documentosEvidenciasIds: response.documentosEvidenciasIds || [],
    referenciasProcedimentos: response.referenciasProcedimentos || [],
    elaboradoPorNome: response.elaboradoPorNome || userName,
    elaboradoPorUid: response.elaboradoPorUid || userUid,
    aprovadoPorNome: response.aprovadoPorNome || (response.status === 'APROVADA' ? userName : undefined),
    aprovadoPorUid: response.aprovadoPorUid || (response.status === 'APROVADA' ? userUid : undefined),
    dataAprovacao: response.dataAprovacao || (response.status === 'APROVADA' ? now.split('T')[0] : undefined),
    versao: response.versao || '1.0',
    status: response.status || 'RASCUNHO',
    historicoVersoes: response.historicoVersoes || [
      {
        versao: response.versao || '1.0',
        data: now.split('T')[0],
        autor: userName,
        resumoAlteracao: 'Criação inicial da resposta institucional.'
      }
    ],
    createdAt: response.createdAt || now,
    updatedAt: now
  };

  const docRef = doc(db, 'organizations', organizationId, 'institutional_responses', respId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'INSTITUTIONAL_RESPONSE',
    entityId: respId,
    action: response.id ? 'UPDATE' : 'CREATE',
    summary: `Resposta Institucional salva: "${record.titulo}" (Versão ${record.versao}, Status: ${record.status})`,
    details: JSON.stringify({ respId, versao: record.versao, status: record.status }),
    changedByUid: userUid,
    changedByEmail: auth.currentUser?.email || currentUser?.email
  });

  return respId;
}

export async function deleteInstitutionalResponse(
  organizationId: string,
  responseId: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'institutional_responses', responseId);
  await deleteDoc(docRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'INSTITUTIONAL_RESPONSE',
    entityId: responseId,
    action: 'DELETE',
    summary: `Resposta Institucional excluída: ${responseId}`,
    details: JSON.stringify({ responseId }),
    changedByUid: auth.currentUser?.uid || currentUser?.uid,
    changedByEmail: auth.currentUser?.email || currentUser?.email
  });
}

// ============================================================================
// 5. PERSISTÊNCIA EM FIRESTORE: EVIDÊNCIAS DE CONFORMIDADE
// ============================================================================

export function subscribeToComplianceEvidences(
  organizationId: string,
  callback: (evidences: EvidenciaRequisitoItem[]) => void
): () => void {
  if (!organizationId || !auth.currentUser) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'compliance_evidences');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_COMPLIANCE_EVIDENCES.forEach((ev) => {
              const docRef = doc(db, 'organizations', organizationId, 'compliance_evidences', ev.id);
              batch.set(docRef, sanitizeForFirestore({ ...ev, organizationId }));
            });
            await batch.commit();
          } catch (seedErr) {
            console.warn('[complianceMatrix] Seed fallback evidências para memória:', seedErr);
            callback(INITIAL_COMPLIANCE_EVIDENCES);
            return;
          }
        } else {
          callback([]);
          return;
        }
      }

      const list: EvidenciaRequisitoItem[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as EvidenciaRequisitoItem);
      });
      list.sort((a, b) => (b.dataEvidencia || '').localeCompare(a.dataEvidencia || ''));
      callback(list);
    },
    (err) => {
      console.warn('[complianceMatrix] Erro ao escutar compliance_evidences:', err);
      callback(organizationId === DEFAULT_ORGANIZATION_ID ? INITIAL_COMPLIANCE_EVIDENCES : []);
    }
  );
}

export async function saveComplianceEvidence(
  organizationId: string,
  evidence: Partial<EvidenciaRequisitoItem>,
  currentUser?: UserProfile | null
): Promise<string> {
  const evId = evidence.id || `EVID-${Date.now()}`;
  const now = new Date().toISOString();
  const userName = currentUser?.displayName || 'Garantia da Qualidade SGQ';
  const userUid = auth.currentUser?.uid || currentUser?.uid;

  // Calcula status de validade
  let statusValidade = evidence.statusValidade || 'VALIDO';
  if (evidence.dataValidade) {
    const hoje = new Date().toISOString().split('T')[0];
    if (evidence.dataValidade < hoje) {
      statusValidade = 'VENCIDO';
    } else {
      const dVal = new Date(evidence.dataValidade).getTime();
      const dHoje = new Date(hoje).getTime();
      const diffDias = Math.ceil((dVal - dHoje) / (1000 * 60 * 60 * 24));
      if (diffDias <= 30) {
        statusValidade = 'PROXIMO_VENCIMENTO';
      } else {
        statusValidade = 'VALIDO';
      }
    }
  }

  const record: EvidenciaRequisitoItem = {
    id: evId,
    organizationId,
    tipo: evidence.tipo || 'DOCUMENTO',
    titulo: evidence.titulo || 'Evidência Documental SGQ',
    descricao: evidence.descricao,
    numeroReferencia: evidence.numeroReferencia,
    dataEvidencia: evidence.dataEvidencia || now.split('T')[0],
    dataEmissao: evidence.dataEmissao || evidence.dataEvidencia || now.split('T')[0],
    dataValidade: evidence.dataValidade,
    baseOperacional: evidence.baseOperacional || 'SOD',
    aeronaveEquipamento: evidence.aeronaveEquipamento,
    processoSetor: evidence.processoSetor || 'Garantia da Qualidade',
    statusValidade,
    responsavel: evidence.responsavel || userName,
    urlOuArquivo: evidence.urlOuArquivo,
    arquivoNome: evidence.arquivoNome,
    clienteId: evidence.clienteId,
    clienteNome: evidence.clienteNome,
    programaId: evidence.programaId,
    programaCodigo: evidence.programaCodigo,
    requisitoId: evidence.requisitoId,
    numeroItem: evidence.numeroItem,
    controleId: evidence.controleId,
    controleCodigo: evidence.controleCodigo,
    usuarioUid: userUid,
    usuarioNome: userName,
    aprovadoPorAuditor: evidence.aprovadoPorAuditor ?? true
  };

  const docRef = doc(db, 'organizations', organizationId, 'compliance_evidences', evId);
  await setDoc(docRef, sanitizeForFirestore(record), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'COMPLIANCE_EVIDENCE',
    entityId: evId,
    action: evidence.id ? 'UPDATE' : 'CREATE',
    summary: `Evidência de conformidade salva: "${record.titulo}" (Tipo: ${record.tipo}, Validade: ${record.dataValidade || 'N/A'})`,
    details: JSON.stringify({ evId, tipo: record.tipo, validade: record.dataValidade }),
    changedByUid: userUid,
    changedByEmail: auth.currentUser?.email || currentUser?.email
  });

  return evId;
}

export async function deleteComplianceEvidence(
  organizationId: string,
  evidenceId: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'compliance_evidences', evidenceId);
  await deleteDoc(docRef);

  await recordOrganizationAudit(organizationId, {
    entity: 'COMPLIANCE_EVIDENCE',
    entityId: evidenceId,
    action: 'DELETE',
    summary: `Evidência de conformidade removida: ${evidenceId}`,
    details: JSON.stringify({ evidenceId }),
    changedByUid: auth.currentUser?.uid || currentUser?.uid,
    changedByEmail: auth.currentUser?.email || currentUser?.email
  });
}

// ============================================================================
// 6. ATUALIZAÇÃO INTEGRADA: AVALIAÇÃO DE CONFORMIDADE E APLICABILIDADE
// ============================================================================

export async function updateRequisitoConformidadeEAplicabilidade(
  organizationId: string,
  requisitoId: string,
  params: {
    aplicabilidade: SituacaoAplicabilidadeImpacto;
    justificativaAplicabilidade?: string;
    conformidade: StatusConformidadeSGQ;
    constatacaoConformidade?: string;
    controleCentralId?: string;
    controleCentralCodigo?: string;
    controleCentralNome?: string;
    respostaInstitucionalId?: string;
    respostaInstitucionalTexto?: string;
    evidenciasVinculadasIds?: string[];
  },
  currentUser?: UserProfile | null
): Promise<void> {
  const now = new Date().toISOString();
  const userName = currentUser?.displayName || 'Garantia da Qualidade SGQ';
  const userUid = auth.currentUser?.uid || currentUser?.uid;

  const docRef = doc(db, 'organizations', organizationId, 'client_requirements', requisitoId);

  const updatePayload: Record<string, any> = {
    'aplicabilidadeContexto.situacao': params.aplicabilidade,
    'aplicabilidadeContexto.justificativa': params.justificativaAplicabilidade || '',
    statusConformidade: params.conformidade,
    constatacaoConformidade: params.constatacaoConformidade || '',
    dataUltimaAvaliacaoConformidade: now.split('T')[0],
    responsavelAvaliacaoConformidadeNome: userName,
    updatedAt: now
  };

  if (params.controleCentralId) {
    updatePayload.controleCentralId = params.controleCentralId;
    updatePayload.controleCentralCodigo = params.controleCentralCodigo;
    updatePayload.controleCentralNome = params.controleCentralNome;
  }

  if (params.respostaInstitucionalId) {
    updatePayload.respostaInstitucionalId = params.respostaInstitucionalId;
    updatePayload.respostaInstitucionalTexto = params.respostaInstitucionalTexto;
  }

  if (params.evidenciasVinculadasIds) {
    updatePayload.evidenciasVinculadasIds = params.evidenciasVinculadasIds;
    updatePayload.pendenciaEvidencia = params.evidenciasVinculadasIds.length === 0 && params.aplicabilidade !== 'NAO_APLICAVEL';
  }

  await setDoc(docRef, sanitizeForFirestore(updatePayload), { merge: true });

  await recordOrganizationAudit(organizationId, {
    entity: 'CLIENT_REQUIREMENT',
    entityId: requisitoId,
    action: 'UPDATE',
    summary: `Avaliação do requisito ${requisitoId}: Aplicabilidade [${params.aplicabilidade}], Conformidade [${params.conformidade}] por ${userName}`,
    details: JSON.stringify({
      requisitoId,
      aplicabilidade: params.aplicabilidade,
      conformidade: params.conformidade
    }),
    changedByUid: userUid,
    changedByEmail: auth.currentUser?.email || currentUser?.email
  });
}

// ============================================================================
// 7. INTEGRAÇÃO COM AUDITORIAS EXTERNAS: PRÉ-CARREGAMENTO INTELIGENTE
// ============================================================================

export interface ResultadoPreCarregamentoAuditoria {
  totalItensAnalisados: number;
  totalRespostasRecuperadas: number;
  totalEvidenciasVinculadas: number;
  itensCompletos: number;
  itensPendentes: number;
  detalhesItens: Array<{
    itemId: string;
    numeroItem: string;
    pergunta: string;
    respostaRecuperada?: string;
    controleVinculado?: string;
    evidenciasEncontradas: string[];
    statusSugerido: 'CONFORME' | 'AGUARDANDO_EVIDENCIA' | 'NA';
  }>;
}

export function preCarregarRespostasEEvidenciasParaAuditoria(
  itensAuditoria: Array<{ id: string; numeroItem: string; pergunta: string; categoria?: string; controleId?: string }>,
  requisitosMestres: RequisitoClienteItem[],
  respostasInstitucionais: RespostaInstitucionalAprovada[],
  evidenciasDisponiveis: EvidenciaRequisitoItem[]
): ResultadoPreCarregamentoAuditoria {
  let totalRespostas = 0;
  let totalEvidencias = 0;
  let itensCompletos = 0;
  let itensPendentes = 0;

  const detalhes = itensAuditoria.map((item) => {
    // 1. Tenta localizar requisito mestre equivalente por código ou pergunta
    const reqMestre = requisitosMestres.find(
      (r) =>
        r.numeroItem === item.numeroItem ||
        (r.tituloCurto && item.pergunta && item.pergunta.toLowerCase().includes(r.tituloCurto.toLowerCase())) ||
        (item.controleId && r.controleCentralId === item.controleId)
    );

    const ctrlId = item.controleId || reqMestre?.controleCentralId;

    // 2. Localiza resposta institucional aprovada vinculada ao controle ou requisito
    const respAprovada = respostasInstitucionais.find(
      (resp) =>
        (ctrlId && resp.controleCentralId === ctrlId) ||
        (reqMestre && resp.requisitosRelacionadosIds.includes(reqMestre.id))
    );

    // 3. Localiza evidências válidas
    const evids = evidenciasDisponiveis.filter(
      (ev) =>
        (ctrlId && ev.controleId === ctrlId) ||
        (reqMestre && ev.requisitoId === reqMestre.id) ||
        (respAprovada?.documentosEvidenciasIds && respAprovada.documentosEvidenciasIds.includes(ev.id))
    );

    const respostaTexto = respAprovada?.textoResposta || reqMestre?.respostaInstitucionalTexto;
    const evidenciasNomes = evids.map((e) => `${e.titulo} (${e.numeroReferencia || e.tipo})`);

    if (respostaTexto) totalRespostas++;
    totalEvidencias += evids.length;

    let statusSugerido: 'CONFORME' | 'AGUARDANDO_EVIDENCIA' | 'NA' = 'AGUARDANDO_EVIDENCIA';
    if (respostaTexto && evids.length > 0) {
      statusSugerido = 'CONFORME';
      itensCompletos++;
    } else {
      itensPendentes++;
    }

    return {
      itemId: item.id,
      numeroItem: item.numeroItem,
      pergunta: item.pergunta,
      respostaRecuperada: respostaTexto,
      controleVinculado: ctrlId,
      evidenciasEncontradas: evidenciasNomes,
      statusSugerido
    };
  });

  return {
    totalItensAnalisados: itensAuditoria.length,
    totalRespostasRecuperadas: totalRespostas,
    totalEvidenciasVinculadas: totalEvidencias,
    itensCompletos,
    itensPendentes,
    detalhesItens: detalhes
  };
}
