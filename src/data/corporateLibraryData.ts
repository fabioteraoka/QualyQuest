/**
 * Base Canônica da Biblioteca Corporativa Única de Requisitos e Critérios de Auditoria
 * IMPACTO Aviation MRO (QualyQuest SGQ)
 * 
 * Arquitetura Unificada Multi-Fonte:
 * - 36 Critérios Técnicos Canônicos Únicos (CRIT-CORP-001 a CRIT-CORP-036)
 * - 177 Vínculos Formais com Normas e Clientes (ANAC, EASA, FAA, IOSA, Kalitta Air, Atlas Air, TACV, SGQ, SGSO, Processos)
 * - 100% das referências normativas e contratuais preservadas
 * - Montagem dinâmica de checklists sem redundância de registros
 */

import { CriterioBibliotecaCorporativa } from '../types';

export const CANONICAL_CORPORATE_CRITERIA: CriterioBibliotecaCorporativa[] = [
  // ==========================================================================
  // 1. INSTALAÇÕES, INFRAESTRUTURA E MEIO AMBIENTE
  // ==========================================================================
  {
    id: 'CRIT-CORP-001',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-001',
    titulo: 'Instalações Físicas, Hangares e Proteção contra Intempéries',
    categoria: 'Instalações e Infraestrutura',
    processo: 'Infraestrutura e Hangaragem',
    perguntaOuCriterio: 'A organização de manutenção possui instalações físicas, hangares e oficinas com dimensões suficientes e proteção adequada contra intempéries para acomodar as aeronaves e artigos contemplados no escopo de homologação?',
    textoDetalhado: 'As instalações devem prover isolamento adequado, áreas demarcadas, iluminação suficiente e proteção contra poeira, vento e chuva para serviços de manutenção de base e linha.',
    orientacaoEvidencia: 'Planta baixa aprovada dos hangares, contrato de locação/concessão aeroportuária, inspeção física in loco das baias e oficinas.',
    controleCentralId: 'CTRL-INFRA-01',
    controleCentralNome: 'Instalações, Condições Ambientais e Hangaragem',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.103(a) / MOMQ 3.3.1',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.25(a) Facility requirements',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.103(a) Housing and facilities',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'ORG 1.6.1 / MNT 1.3.1 Maintenance Facilities',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 3 Shop facilities',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities - Item 1 Hangar space',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 1 Line station hangar/ramp facilities',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-001 / MQ-001',
        itemOuSecaoNorma: 'PO-001 Gestão de Infraestrutura e Hangares',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 1,
    tags: ['Infraestrutura', 'Hangar', 'Instalações', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-002',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-002',
    titulo: 'Condições Ambientais, Temperatura, Umidade e Prevenção de Contaminação',
    categoria: 'Instalações e Infraestrutura',
    processo: 'Infraestrutura e 5S',
    perguntaOuCriterio: 'As condições ambientais (temperatura, umidade relativa, poeira e iluminação) são monitoradas e controladas de modo a não prejudicar a precisão dos trabalhos e a integridade de componentes e consumíveis?',
    textoDetalhado: 'Salas de ensaios, baterias, aviônicos, aplicação de selantes e materiais compostos exigem termo-higrômetros calibrados com leituras registradas.',
    orientacaoEvidencia: 'Termo-higrômetros calibrados, registros diários de temperatura/umidade, iluminação mínima aferida (luxímetro), housekeeping e 5S.',
    controleCentralId: 'CTRL-HOUSEKEEP-01',
    controleCentralNome: '5S, Prevenção de FOD e Organização de Hangares',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.103(b) / MOMQ 3.3.3',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.25(b) Environmental conditions',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.103(b) Environmental requirements',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.3.2 Environmental Protection',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 5 Lighting and environmental controls',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities - Item 2 Cleanliness & Environment',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGSO',
        normaDocumento: 'MGSO / 5S',
        itemOuSecaoNorma: 'PO-FOD-01 Programa 5S e Prevenção de FOD',
        revisaoVigente: 'Rev. 02',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 2,
    tags: ['Ambiente', 'Temperatura', 'Umidade', '5S', 'FOD', 'ANAC', 'EASA', 'FAA', 'IOSA'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 2. GESTÃO, PESSOAL E COMPETÊNCIAS TÉCNICAS
  // ==========================================================================
  {
    id: 'CRIT-CORP-003',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-003',
    titulo: 'Gestor Responsável, Responsável Técnico e Estrutura Organizacional',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Gestão da Qualidade e Direção',
    perguntaOuCriterio: 'A organização possui organograma formalizado com indicação clara do Gestor Responsável (Accountable Manager) e Responsável Técnico homologado perante as autoridades, com autoridade corporativa e financeira?',
    textoDetalhado: 'O Gestor Responsável deve possuir autoridade para assegurar que toda manutenção seja financiada e realizada conforme os regulamentos aplicáveis.',
    orientacaoEvidencia: 'Portaria de designação de Gestor Responsável e RT, aceitação formal ANAC/EASA/FAA, organograma no MOMQ Seção 1.',
    controleCentralId: 'CTRL-RESP-01',
    controleCentralNome: 'Estrutura Organizacional, Gestor Responsável e RT',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.103 / 145.151 / MOMQ 1.2',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.30(a)(b) Accountable manager & nominated persons',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.151 Management personnel required',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'ORG 1.1.1 Accountable Executive / MNT 1.1.1',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 4 Management contacts',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities - Item 3 Supervisory personnel',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MOMQ',
        itemOuSecaoNorma: 'MOMQ Seção 1.2 Estrutura Gerencial',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 3,
    tags: ['Gestor Responsável', 'RT', 'Organograma', 'Accountable Manager', 'ANAC', 'EASA', 'FAA', 'IOSA'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-004',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-004',
    titulo: 'Dimensionamento e Planejamento do Quadro de Pessoal Técnico',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Recursos Humanos e Produção',
    perguntaOuCriterio: 'A organização dispõe de planejamento de recursos humanos (manpower plan) que garanta quantidade suficiente de mecânicos e inspetores habilitados para a carga de trabalho planejada?',
    textoDetalhado: 'O dimensionamento de pessoal deve prever absenteísmo, turnos e evitar sobrecarga de trabalho que afete a qualidade ou segurança dos serviços.',
    orientacaoEvidencia: 'Planilha de dimensionamento de homem-hora (manpower plan), escalas mensais de trabalho, relação de técnicos ativos.',
    controleCentralId: 'CTRL-RH-01',
    controleCentralNome: 'Dimensionamento e Alocação de Pessoal Técnico',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.151(b) / MOMQ 3.5.1',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.30(d) Sufficient staff and manpower plan',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.151(b) Sufficient personnel',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.2.1 Resource Allocation / Manpower',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 6 Staffing adequate for scheduled workload',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 4,
    tags: ['Manpower', 'Recursos Humanos', 'Dimensionamento', 'Escalas', 'ANAC', 'EASA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-005',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-005',
    titulo: 'Programa de Treinamento Técnico Inicial, Periódico e Fatores Humanos',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Treinamento e Capacitação SGQ',
    perguntaOuCriterio: 'A organização mantém e executa programa formal de treinamento inicial e recorrente (mínimo a cada 24 meses) contemplando Fatores Humanos, SGSO, EWIS, Tanques de Combustível (CDCCL) e procedimentos específicos?',
    textoDetalhado: 'O treinamento deve ser aprovado e monitorado pela Garantia da Qualidade, com avaliação formal de eficácia e instrutores qualificados.',
    orientacaoEvidencia: 'Manual de Treinamento aprovado, matriz de treinamento anual atualizada, certificados de Fatores Humanos, EWIS e SMS com validade.',
    controleCentralId: 'CTRL-TREINA-01',
    controleCentralNome: 'Capacitação Técnica, Fatores Humanos e Recorrência',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.163 / IS 145.151-001',
        revisaoVigente: 'Emenda 06 / Rev. 2025',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.30(e) Human factors & safety training program',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.163 Training program requirements',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'ORG 1.6.3 / MNT 1.2.2 Human Factors & Technical Training',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 2 Training - Items 7 to 9 Initial, Recurrent, Fuel Tank Safety & EWIS',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities & Training - Item 5 Recurrent training',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 2 Type rating & recurrent training for B737-MAX',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MQ-001',
        itemOuSecaoNorma: 'MQ-001 Seção 6.2 Gestão de Treinamento e Competências',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 5,
    tags: ['Treinamento', 'Fatores Humanos', 'EWIS', 'CDCCL', 'Recorrência', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-006',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-006',
    titulo: 'Qualificação, Credenciamento e Roster de Pessoal Certificador (RTS / Carimbos)',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Garantia da Qualidade e Credenciamento',
    perguntaOuCriterio: 'A organização mantém relação nominal atualizada (roster) e cartas de autorização para todo o pessoal certificador (MMA / Certifying Staff), com controle rigoroso de escopo, validade e controle de carimbos?',
    textoDetalhado: 'Nenhum serviço de manutenção pode ser liberado sem assinatura e carimbo de técnico expressamente autorizado no Roster oficial da organização.',
    orientacaoEvidencia: 'Relação de Pessoal Certificador (Roster oficial), cartas individuais de autorização assinadas pelo RT, log de controle de carimbos técnicos.',
    controleCentralId: 'CTRL-CERTIF-01',
    controleCentralNome: 'Credenciamento, Autorização e Roster de Certificadores',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.157 / MOMQ 3.5.3',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.35 Certifying staff and support staff',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.157 Personnel authorized to approve an article',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.2.3 Certifying Staff Authorizations',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 2 Training - Items 10-12 Roster of authorized personnel and log of stamps',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Personnel - Item 7 Certifying technician roster',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 3 Designated B737-MAX Certifying Engineers Roster',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-003',
        itemOuSecaoNorma: 'PO-003 Concessão de Autorização Técnica e Controle de Carimbos',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 6,
    tags: ['Certificadores', 'Roster', 'Carimbos', 'Autorização', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-007',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-007',
    titulo: 'Prontuários e Dossiês Individuais de Treinamento e Qualificação',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Recursos Humanos e Qualidade',
    perguntaOuCriterio: 'A organização mantém dossiês individuais (training records) para todo o pessoal técnico, contendo escopo de licença CHT, certificados, experiência recente e avaliações práticas, retidos por no mínimo 2 anos após o desligamento?',
    textoDetalhado: 'Os registros devem ser mantidos em local seguro, físico ou digital com backup e trilha de auditoria rastreável.',
    orientacaoEvidencia: 'Dossiês individuais por amostragem com CHT ANAC ativa, certificados válidos de curso de tipo de aeronave e avaliações práticas.',
    controleCentralId: 'CTRL-RH-02',
    controleCentralNome: 'Dossiês Individuais de Qualificação e CHT',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.161 / MOMQ 3.5.5',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.35(j) Record retention of certifying staff',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.161 Records of management, supervisory, and inspection personnel',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 2 Training - Item 13 Training files retention and accessibility',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 7,
    tags: ['Dossiês', 'Prontuários', 'CHT', 'Retenção', 'ANAC', 'EASA', 'FAA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-008',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-008',
    titulo: 'Qualificação e Certificação de Pessoal em Ensaios Não Destrutivos (END)',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Ensaios Não Destrutivos (END/NDT)',
    perguntaOuCriterio: 'O pessoal que executa ensaios não destrutivos (Líquido Penetrante, Correntes Parasitas, Partículas Magnéticas, Ultrassom) é formalmente qualificado e certificado segundo norma aceita (NAS 410 / EN 4179 / ISO 9712)?',
    textoDetalhado: 'Os procedimentos e exames devem ser supervisionados por profissional Nível 3 formalmente homologado.',
    orientacaoEvidencia: 'Certificados Nível 2 e Nível 3 (NAS 410 / EN 4179), exame de acuidade visual anual, procedimentos operacionais aprovados pelo Nível 3.',
    controleCentralId: 'CTRL-END-01',
    controleCentralNome: 'Qualificação em Ensaios Não Destrutivos (NAS 410)',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.155 / IS 145-001H',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.30(f) Non-destructive testing personnel',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.155 Inspection personnel requirements',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.2.5 NDT Personnel Qualifications',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 8,
    tags: ['END', 'NDT', 'NAS 410', 'EN 4179', 'Inspeção', 'ANAC', 'EASA', 'FAA', 'IOSA'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-009',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-009',
    titulo: 'Supervisores Técnicos e Inspetores de Controle da Qualidade',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Controle da Qualidade (QC)',
    perguntaOuCriterio: 'A organização dispõe de supervisores e inspetores de controle de qualidade com experiência comprovada de no mínimo 3 anos nos métodos e técnicas de inspeção sob sua responsabilidade?',
    textoDetalhado: 'Os inspetores devem possuir autoridade para rejeitar trabalhos não conformes e realizar inspeções obrigatórias (RII).',
    orientacaoEvidencia: 'Lista de inspetores qualificados, registros de experiência profissional prévia e avaliações de proficiência técnica.',
    controleCentralId: 'CTRL-QC-01',
    controleCentralNome: 'Inspetores e Supervisores Técnicos da Qualidade',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.153 / MOMQ 3.5.2',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.30(c) Supervisory and quality control personnel',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.153 Supervisory personnel requirements',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 9,
    tags: ['Supervisores', 'Inspetores', 'QC', 'ANAC', 'EASA', 'FAA'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 3. FERRAMENTAL, EQUIPAMENTOS E METROLOGIA
  // ==========================================================================
  {
    id: 'CRIT-CORP-010',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-010',
    titulo: 'Disponibilidade, Inventário e Controle de Ferramentas e Equipamentos',
    categoria: 'Equipamentos e Metrologia',
    processo: 'Ferramentaria e Controle de Ferramentas',
    perguntaOuCriterio: 'A organização dispõe de inventário controlado de todas as ferramentas, equipamentos e bancadas recomendadas pelos fabricantes das aeronaves sob seu escopo de certificação, com sistema rastreável de empréstimo e devolução (Tool Control)?',
    textoDetalhado: 'Deve haver controle estrito para evitar esquecimento de ferramentas a bordo de aeronaves (prevenção de FOD).',
    orientacaoEvidencia: 'Lista mestre de ferramentas ativas, sistema digital ou fichas de empréstimo/devolução (shadow boards), inspeção física da ferramentaria.',
    controleCentralId: 'CTRL-FERRAM-01',
    controleCentralNome: 'Controle de Ferramentaria, Empréstimos e Shadow Boards',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.109(a) / MOMQ 3.4.1',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.40(a) Equipment and tools availability',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.109(a) Equipment, tools, and material',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.5.1 Maintenance Tooling Availability',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 3 Calibrated Tooling - Items 17 to 20 Tool inventory and tool control system',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 3 Tooling - Item 7 Tool availability',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 4 Line station tooling for B737-MAX',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-004',
        itemOuSecaoNorma: 'PO-004 Gestão e Controle de Ferramentaria',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 10,
    tags: ['Ferramentas', 'Tool Control', 'FOD', 'Inventário', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-011',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-011',
    titulo: 'Programa de Calibração e Rastreabilidade Metrológica (NIST / RBC / INMETRO)',
    categoria: 'Equipamentos e Metrologia',
    processo: 'Metrologia e Calibração',
    perguntaOuCriterio: 'Todos os equipamentos e ferramentas que requerem calibração periódica (torquímetros, manômetros, multímetros, tensiômetros) possuem calibração válida, rastreabilidade metrológica e etiquetas visíveis com data de validade?',
    textoDetalhado: 'Ferramentas fora de tolerância ou vencidas devem ser imediatamente segregadas em área de quarentena com etiqueta vermelha de advertência.',
    orientacaoEvidencia: 'Certificados de calibração vigentes emitidos por laboratórios acreditados RBC/Inmetro ou NIST, etiquetas físicas coladas nas ferramentas, procedimento de segregação.',
    controleCentralId: 'CTRL-METROL-01',
    controleCentralNome: 'Calibração, Incerteza e Rastreabilidade Metrológica',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.109(b) / IS 145.109-001C / MOMQ 3.4.2',
        revisaoVigente: 'Emenda 06 / Rev. C',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.40(b) Calibration program and traceability',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.109(b) Calibrated tools and equipment',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.5.2 Tooling Calibration Program',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 3 Calibrated Tooling - Items 21 to 26 Calibration labels, NIST standards, out of tolerance procedures',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 3 Tooling - Items 8 and 12-14 Calibration control, tags and standards',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 5 Torque wrenches and pressure gauges calibration',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MQ-001',
        itemOuSecaoNorma: 'MQ-001 Seção 7.1.5 Controle de Dispositivos de Medição',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 11,
    tags: ['Calibração', 'Metrologia', 'Rastreabilidade', 'RBC', 'NIST', 'Torquímetros', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-012',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-012',
    titulo: 'Procedimento de Equivalência e Substituição de Ferramentas e Equipamentos',
    categoria: 'Equipamentos e Metrologia',
    processo: 'Engenharia de Manutenção',
    perguntaOuCriterio: 'Existe procedimento formal aprovado para demonstrar e documentar a equivalência técnica de ferramentas ou equipamentos alternativos em relação aos recomendados pelo fabricante da aeronave?',
    textoDetalhado: 'A equivalência técnica deve ser comprovada por parecer da Engenharia e mantida no dossiê da ferramenta.',
    orientacaoEvidencia: 'Dossiês técnicos de equivalência de ferramental aprovados pelo Responsável Técnico e aceitos pelos operadores.',
    controleCentralId: 'CTRL-EQUIV-01',
    controleCentralNome: 'Equivalência Técnica de Ferramentas e Equipamentos',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.109(c) / MOMQ 3.4.3',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: 'AMC 145.A.40 Equipment, tools and material',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.109(c) Equivalent equipment and tools',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 3 Calibrated Tooling - Item 27 Equivalent tooling procedures and substantiation',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 12,
    tags: ['Equivalência', 'Engenharia', 'Ferramental Alternativo', 'ANAC', 'EASA', 'FAA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 4. DADOS TÉCNICOS E CONTROLE DOCUMENTAL
  // ==========================================================================
  {
    id: 'CRIT-CORP-013',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-013',
    titulo: 'Gestão, Atualização e Disponibilidade de Dados Técnicos Aprovados',
    categoria: 'Dados Técnicos e Publicações',
    processo: 'Engenharia e Controle de Publicações Técnicas',
    perguntaOuCriterio: 'A organização dispõe de dados técnicos vigentes e aprovados (AMM, IPC, CMM, SRM, AD/DA, SB) acessíveis de forma imediata aos mecânicos no posto de trabalho durante a execução dos serviços?',
    textoDetalhado: 'Deve haver controle de assinaturas digitais com fabricantes (Boeing, Airbus, Embraer) e verificação do status de revisão.',
    orientacaoEvidencia: 'Assinaturas vigentes de portais técnicos dos fabricantes, logs de sincronização eletrônica, terminais ou tablets na linha/hangar.',
    controleCentralId: 'CTRL-DOC-01',
    controleCentralNome: 'Controle de Publicações Técnicas, Manuais e Diretrizes (DA/AD)',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.109(d) / IS 145-001H / MOMQ 3.4.4',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.45 Maintenance data',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.109(d) Current technical data',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.1.1 Maintenance Data Control and Availability',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 4 Technical Data - Items 28 to 29 GMM, AMM, IPC, CMM current revisions accessible',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 4 Manuals - Item 9 Technical data current revisions',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 6 Access to operator maintenance data (B737-MAX AMM/IPC)',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-005',
        itemOuSecaoNorma: 'PO-005 Controle de Dados Técnicos da Engenharia',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 13,
    tags: ['Dados Técnicos', 'AMM', 'IPC', 'CMM', 'Manuais', 'Engenharia', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 5. MATERIAIS, ALMOXARIFADO E SUPRIMENTOS
  // ==========================================================================
  {
    id: 'CRIT-CORP-014',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-014',
    titulo: 'Armazenamento, Segregação e Preservação de Peças Aeronáuticas (ESD / Embalagem)',
    categoria: 'Materiais, Peças e Shelf-Life',
    processo: 'Almoxarifado e Armazenamento',
    perguntaOuCriterio: 'O almoxarifado possui áreas físicas delimitadas e segregação para materiais aceitos, peças em quarentena, sucata, componentes sensíveis a descargas eletrostáticas (ESD) e produtos químicos?',
    textoDetalhado: 'Componentes aviônicos devem possuir blindagem ESD e controle de umidade. Itens rejeitados devem ficar em armário trancado.',
    orientacaoEvidencia: 'Inspeção física do almoxarifado, prateleiras identificadas, área de quarentena trancada, sacos e pulseiras ESD.',
    controleCentralId: 'CTRL-ALMOX-01',
    controleCentralNome: 'Armazenamento, Segregação e Preservação de Peças',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.103(c) / 145.211(c) / MOMQ 3.3.4',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.25(d) Secure storage facilities / 145.A.42',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.103(b) Secure storage facilities',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.3.1 Parts and Materials Storage and Handling',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 5 Parts and Materials - Items 30 to 33 Storage conditions, ESD protection and bin labeling',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 2 Storage - Item 4 Parts storage and ESD protection',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 7 Spares and parts storage at line station',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-006',
        itemOuSecaoNorma: 'PO-006 Procedimentos de Almoxarifado e Preservação',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 14,
    tags: ['Almoxarifado', 'Armazenamento', 'ESD', 'Segregação', 'Quarentena', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-015',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-015',
    titulo: 'Inspeção de Recebimento, Certificação e Rastreabilidade de Peças e Matérias-Primas',
    categoria: 'Materiais, Peças e Shelf-Life',
    processo: 'Inspeção de Recebimento',
    perguntaOuCriterio: 'Todos os componentes, peças e consumíveis recebidos passam por inspeção de recebimento formal, verificando conformidade física, part number, embalagem e presença de certificados de liberação autorizada (FAA 8130-3, EASA Form 1, ANAC F 001-021 ou CoC do fabricante)?',
    textoDetalhado: 'Nenhum item pode ser disponibilizado para instalação sem o carimbo ou etiqueta de aceitação da inspeção de recebimento.',
    orientacaoEvidencia: 'Relatórios de inspeção de recebimento (RIR), certificados de conformidade originais arquivados e vinculados à ordem de serviço.',
    controleCentralId: 'CTRL-REC-01',
    controleCentralNome: 'Inspeção de Recebimento e Aceitação de Peças',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211(a) / IS 145-001H / MOMQ 3.6.1',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.42(a) Acceptance of components (EASA Form 1 / 8130-3)',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.211(a) Receiving inspection system',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.2.1 Parts and Materials Acceptance',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 5 Parts and Materials - Items 34 to 37 Receiving inspection, airworthiness documentation',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 5 Receiving - Item 10 Receiving documentation and tags',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MQ-001',
        itemOuSecaoNorma: 'MQ-001 Seção 8.4 Controle de Processos e Produtos Fornecidos',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 15,
    tags: ['Recebimento', 'Certificados', '8130-3', 'EASA Form 1', 'F 001-021', 'Rastreabilidade', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-016',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-016',
    titulo: 'Gestão de Validade de Consumíveis, Produtos Químicos e Shelf-Life',
    categoria: 'Materiais, Peças e Shelf-Life',
    processo: 'Almoxarifado e Controle de Validade',
    perguntaOuCriterio: 'Existe sistema formal de controle de prazo de validade (shelf-life) para selantes, tintas, resinas, óleos, graxas e anéis de vedação (O-rings), garantindo descarte imediato de materiais vencidos?',
    textoDetalhado: 'Todos os recipientes devem conter etiqueta de validade e data de abertura original.',
    orientacaoEvidencia: 'Planilha ou software de controle de shelf-life, armários de químicos inspecionados in loco com etiquetas legíveis e FISPQ.',
    controleCentralId: 'CTRL-SHELFLIFE-01',
    controleCentralNome: 'Gestão de Validade, Consumíveis e Shelf-Life',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211(b) / IS 145-009E / MOMQ 3.6.3',
        revisaoVigente: 'Emenda 06 / Rev. E',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.42(b) Shelf-life and consumable control',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.211 Shelf-life control system',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.3.3 Shelf-life Control Program',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 5 Parts and Materials - Items 38 to 39 Shelf-life expiration and chemical storage',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 2 Storage - Item 11 Shelf-life items tracking',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 16,
    tags: ['Shelf-Life', 'Validade', 'Consumíveis', 'Selantes', 'Químicos', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-017',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-017',
    titulo: 'Detecção, Quarentena e Notificação de Peças Suspeitas Não Aprovadas (SUP)',
    categoria: 'Materiais, Peças e Shelf-Life',
    processo: 'Inspeção e Prevenção de SUP',
    perguntaOuCriterio: 'A organização dispõe de procedimento formal para identificar, isolar imediatamente em quarentena e notificar às autoridades aeronáuticas e operadores quaisquer Peças Suspeitas de Não Serem Aprovadas (SUP)?',
    textoDetalhado: 'O procedimento deve seguir as diretrizes da IS 145-009 da ANAC e FAA AC 21-29.',
    orientacaoEvidencia: 'Procedimento formal de SUP no MOMQ Seção 3.6, formulário de relato à ANAC e operador, área de quarentena trancada.',
    controleCentralId: 'CTRL-SUP-01',
    controleCentralNome: 'Prevenção, Detecção e Notificação de SUP',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211 / IS 145-009E / MOMQ 3.6.4',
        revisaoVigente: 'Emenda 06 / Rev. E',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.42(c) Unapproved components quarantine and reporting',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.211 / FAA AC 21-29 Suspected Unapproved Parts',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.4.1 Suspected Unapproved Parts Program',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 5 Parts and Materials - Item 40 SUP reporting to Kalitta QA and FAA/ANAC',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 17,
    tags: ['SUP', 'Peças Não Aprovadas', 'Quarentena', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-018',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-018',
    titulo: 'Segregação e Mutilação Irreversível de Peças Sucateadas e Rejeitadas (Scrap)',
    categoria: 'Materiais, Peças e Shelf-Life',
    processo: 'Controle de Sucata e Descarte',
    perguntaOuCriterio: 'As peças e componentes inservíveis ou condenados são fisicamente mutilados de forma irreversível ou marcados indelevelmente como sucata para evitar reutilização inadvertida?',
    textoDetalhado: 'Deve haver registro fotográfico e termo de sucateamento assinado pelo Inspetor da Qualidade.',
    orientacaoEvidencia: 'Caixa de sucata trancada com placa "SUCATA / SCRAP", termos de mutilação de componentes preenchidos e assinados.',
    controleCentralId: 'CTRL-SCRAP-01',
    controleCentralNome: 'Mutilação e Descarte de Peças Inservíveis (Scrap)',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211(c) / MOMQ 3.6.5',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.42(d) Scrap mutilation and disposal',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 5 Parts and Materials - Item 41 Scrap parts mutilation and retention of records',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 18,
    tags: ['Sucata', 'Scrap', 'Mutilação', 'Descarte', 'ANAC', 'EASA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 6. SISTEMA DE GESTÃO DA QUALIDADE (SGQ) E MANUAIS
  // ==========================================================================
  {
    id: 'CRIT-CORP-019',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-019',
    titulo: 'Manual da Organização de Manutenção (MOMQ / MOE / RSM) e Suplementos Oficiais',
    categoria: 'Sistema de Garantia da Qualidade (SGQ)',
    processo: 'Controle de Manuais e Procedimentos da Qualidade',
    perguntaOuCriterio: 'A organização mantém o Manual da Organização de Manutenção (MOMQ), MOE (EASA) e RSM/QCM (FAA) aprovados, vigentes, controlados e com suplementos contratuais de clientes devidamente integrados?',
    textoDetalhado: 'Qualquer revisão deve ser submetida e aceita/aprovada pela autoridade aeronáutica competente antes de sua entrada em vigor.',
    orientacaoEvidencia: 'Página de controle de revisões (LEP) do MOMQ assinada pela ANAC, Suplemento EASA aprovado, Suplemento FAA vigente.',
    controleCentralId: 'CTRL-MANUAL-01',
    controleCentralNome: 'Gestão e Revisão do MOMQ e Suplementos Estrangeiros',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.207 / 145.209 / MOMQ Seção 1',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.70 Maintenance organization exposition (MOE)',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.207 / 145.209 Repair station manual and quality control manual',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.4.1 Maintenance Organization Exposition',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 1 KA GMM and manuals availability',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities - Item 1 Company manuals and customer supplements',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MQ-001',
        itemOuSecaoNorma: 'MQ-001 Seção 4.3 Escopo do SGQ e Manual da Qualidade',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 19,
    tags: ['MOMQ', 'MOE', 'RSM', 'QCM', 'Manuais', 'GMM', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-020',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-020',
    titulo: 'Programa Corporativo de Auditorias Internas da Qualidade (Auditorias de Sistema e Produto)',
    categoria: 'Sistema de Garantia da Qualidade (SGQ)',
    processo: 'Auditorias Internas e Monitoramento',
    perguntaOuCriterio: 'A organização planeja e executa programa independente de auditorias internas cobrindo todos os processos, hangares, oficinas e aeronaves em um ciclo máximo de 12 meses, com auditores qualificados e independentes da área auditada?',
    textoDetalhado: 'O programa deve incluir auditorias de sistema e amostragem de produto em aeronaves e componentes.',
    orientacaoEvidencia: 'Cronograma anual de auditorias internas, relatórios de auditoria concluídos, certificados de qualificação dos auditores internos.',
    controleCentralId: 'CTRL-AUDIT-01',
    controleCentralNome: 'Planejamento e Execução de Auditorias Internas SGQ',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211 / IS 145-010C / MOMQ 3.7.1',
        revisaoVigente: 'Emenda 06 / Rev. C',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.65(c) Independent quality audit system',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.211 Quality control system audits',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'ORG 2.1.1 / MNT 1.5.1 Quality Audit Program',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 4 Internal Quality Audit program and schedule',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities - Item 4 Quality audits frequency',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MQ-001',
        itemOuSecaoNorma: 'MQ-001 Seção 9.2 Auditorias Internas SGQ',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 20,
    tags: ['Auditorias Internas', 'SGQ', 'Cronograma', 'Independência', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-021',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-021',
    titulo: 'Tratamento de Não Conformidades, Análise de Causa Raiz e Verificação da Eficácia (CAPA)',
    categoria: 'Sistema de Garantia da Qualidade (SGQ)',
    processo: 'Ações Corretivas e Preventivas (CAPA)',
    perguntaOuCriterio: 'Existe fluxo estruturado e rastreável para emissão de Relatório de Não Conformidade (RNC / F 001-29), contenção imediata, análise de causa raiz (5 Porquês / Ishikawa), prazo de implementação de ação corretiva e comprovação formal de eficácia?',
    textoDetalhado: 'Não conformidades identificadas em auditorias de clientes ou autoridades devem ser respondidas no prazo regulamentar (máximo 30 dias).',
    orientacaoEvidencia: 'Dossiês de RNCs com formulação F 001-29, 5 Porquês preenchidos, plano de ação corretiva com prazos e relatórios de verificação de eficácia.',
    controleCentralId: 'CTRL-NC-01',
    controleCentralNome: 'Emissão, Causa Raiz e Eficácia de RNCs (F 001-29)',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211 / IS 145-010C / MOMQ 3.7.3',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.65(c) / 145.A.95 Findings and corrective action system',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'ORG 2.1.4 / MNT 1.5.2 Corrective Action Tracking and Root Cause Analysis',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 4b Corrective action response within 30 days',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'MQ-001',
        itemOuSecaoNorma: 'MQ-001 Seção 10.2 Tratamento de Não Conformidades e Ação Corretiva',
        revisaoVigente: 'Rev. 04',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 21,
    tags: ['RNC', 'CAPA', 'Causa Raiz', '5 Porquês', 'Eficácia', 'F 001-29', 'ANAC', 'EASA', 'IOSA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-022',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-022',
    titulo: 'Sistema de Relato de Dificuldades em Serviço (SDR) e Notificação Obrigatória de Ocorrências',
    categoria: 'Sistema de Garantia da Qualidade (SGQ)',
    processo: 'Relatos Mandatórios e Segurança Operacional',
    perguntaOuCriterio: 'Existe procedimento formal para notificar à ANAC, EASA/FAA e aos operadores qualquer falha grave, mau funcionamento ou defeito estrutural constatado em até 72 horas após a identificação (SDR / Mandatory Occurrence Reporting)?',
    textoDetalhado: 'Falhas de fadiga, corrosão severa em componentes primários ou falha em sistemas redundantes devem ser comunicadas imediatamente.',
    orientacaoEvidencia: 'Procedimento formal de SDR no MOMQ Seção 3.8, protocolo de transmissão de SDRs via sistema informatizado da ANAC/FAA.',
    controleCentralId: 'CTRL-SDR-01',
    controleCentralNome: 'Relato de Dificuldades em Serviço (SDR / MOR)',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.221 / MOMQ 3.8.1',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.60 Occurrence reporting',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.221 Service difficulty reports',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.7.1 Occurrence Reporting to Authorities and Operators',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 6 SDR - Items 42 to 44 SDR reporting to Kalitta Quality Control within 72h',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 22,
    tags: ['SDR', 'MOR', 'Ocorrências Mandatórias', '72 Horas', 'Defeitos Graves', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 7. SEGURANÇA OPERACIONAL (SGSO / SMS)
  // ==========================================================================
  {
    id: 'CRIT-CORP-023',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-023',
    titulo: 'Sistema de Gestão da Segurança Operacional (SGSO / SMS) e Gerenciamento de Riscos',
    categoria: 'Segurança Operacional (SGSO/SMS)',
    processo: 'Segurança Operacional (Safety)',
    perguntaOuCriterio: 'A organização mantém implantado o Sistema de Gestão da Segurança Operacional (SGSO) conforme RBAC 145 / IS 145.214, com comitê de segurança (CSO), identificação de perigos, matriz de risco e canal confidencial de relato voluntário?',
    textoDetalhado: 'A política de segurança deve enfatizar a Cultura Justa (Just Culture) e a garantia de não punição para relatos voluntários.',
    orientacaoEvidencia: 'Manual de Gerenciamento da Segurança Operacional (MGSO), atas do Comitê de Segurança (CSO), relatórios de identificação de perigos (RPOV).',
    controleCentralId: 'CTRL-SMS-01',
    controleCentralNome: 'Gerenciamento de Riscos e Relato Voluntário SGSO',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.107 / IS 145.214-001B / MGSO',
        revisaoVigente: 'Emenda 06 / Rev. B',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.200 Safety management system',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'ORG 1.3.1 Safety Policy / ORG 3.1.1 Risk Assessment and Hazard Identification',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGSO',
        normaDocumento: 'MGSO',
        itemOuSecaoNorma: 'MGSO Seção 2 Gestão de Riscos e Matriz de Severidade/Probabilidade',
        revisaoVigente: 'Rev. 02',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 23,
    tags: ['SGSO', 'SMS', 'Riscos', 'Cultura Justa', 'Perigos', 'CSO', 'ANAC', 'EASA', 'IOSA'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-024',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-024',
    titulo: 'Controle, Integridade e Retenção de Registros Técnicos de Manutenção (5 Anos)',
    categoria: 'Registros, Retenção e Liberação (CRS)',
    processo: 'Documentação Técnica e Retenção de Registros',
    perguntaOuCriterio: 'Todos os registros de manutenção (ordens de serviço, task cards, testes operacionais, fichas de peso e balanceamento) são preenchidos integralmente com carimbos e datas, e retidos em arquivo seguro por no mínimo 5 anos?',
    textoDetalhado: 'Os registros devem fornecer histórico completo e rastreável do trabalho executado e das peças aplicadas.',
    orientacaoEvidencia: 'Amostragem de pastas de ordens de serviço encerradas, retenção digital segura com backup e integridade inalterável.',
    controleCentralId: 'CTRL-REC-02',
    controleCentralNome: 'Arquivo, Retenção e Rastreabilidade de Registros por 5 Anos',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.219 / RBAC 43.9 / MOMQ 3.9.1',
        revisaoVigente: 'Emenda 06 / Emenda 04',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.55 Maintenance and airworthiness review records',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.219 / 14 CFR 43.9 Maintenance records',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.6.1 Maintenance Records Retention',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Work Processing - Items 49 to 55 Task card completion and dirty fingerprint records',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 7 Records - Items 11 to 12 Work order retention and signoffs',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 8 Work package records and flight logs',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-007',
        itemOuSecaoNorma: 'PO-007 Retenção e Arquivo de Registros Técnicos',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 24,
    tags: ['Registros', '5 Anos', 'Task Cards', 'Ordens de Serviço', 'Arquivo', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-025',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-025',
    titulo: 'Certificado de Liberação Autorizada (CLA / F 001-021) e Aprovação para Retorno ao Serviço (CRS)',
    categoria: 'Registros, Retenção e Liberação (CRS)',
    processo: 'Aprovação para Retorno ao Serviço (RTS)',
    perguntaOuCriterio: 'A emissão do Certificado de Liberação Autorizada (CLA / F 001-021) ou declaração de CRS em Diário de Bordo é realizada exclusivamente por pessoal credenciado, contendo descrição satisfatória dos trabalhos, dados técnicos utilizados e dados de aeronavegabilidade?',
    textoDetalhado: 'Nenhum artigo pode ser liberado sem verificação completa de que todos os itens da ordem de serviço foram concluídos e inspecionados.',
    orientacaoEvidencia: 'Certificados F 001-021 arquivados, lançamentos em Livro de Bordo (logbook), conferência de carimbo de liberação e CHT do certificador.',
    controleCentralId: 'CTRL-CRS-01',
    controleCentralNome: 'Emissão de CLA (F 001-021) e Retorno ao Serviço (CRS)',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.201 / RBAC 43.9 / IS 145-001H / F 001-021',
        revisaoVigente: 'Emenda 06 / Rev. H',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.50 Certification of maintenance (CRS / EASA Form 1)',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.201 / 14 CFR 43.9 / 43.11 Return to service',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 2.7.1 Certificate of Release to Service (CRS)',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Work Processing - Items 56 to 60 Logbook signoff and maintenance release statement',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 7 Records - Item 12 Return to service signoff',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-008',
        itemOuSecaoNorma: 'PO-008 Emissão de Certificados de Liberação Autorizada',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 25,
    tags: ['CRS', 'CLA', 'F 001-021', 'RTS', 'Retorno ao Serviço', 'Liberação', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  // ==========================================================================
  // 8. CONTROLES OPERACIONAIS ESPECÍFICOS E PROGRAMAS ESPECIAIS
  // ==========================================================================
  {
    id: 'CRIT-CORP-026',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-026',
    titulo: 'Programa de Prevenção ao Uso Indevido de Substâncias Psicoativas (PPSP / DOT Drug & Alcohol)',
    categoria: 'Segurança Operacional (SGSO/SMS)',
    processo: 'Recursos Humanos e PPSP',
    perguntaOuCriterio: 'A organização mantém implantado o Programa de Prevenção do Uso Indevido de Substâncias Psicoativas (PPSP / RBAC 120 / DOT FAA), com exames pré-admissionais, randômicos e pós-acidente devidamente documentados?',
    textoDetalhado: 'Todos os colaboradores designados para atividades de manutenção em aeronaves devem ser incluídos no rol de testagem randômica.',
    orientacaoEvidencia: 'Manual PPSP aprovado, contrato com clínica/laboratório credenciado, registros de testes randômicos realizados anualmente.',
    controleCentralId: 'CTRL-PPSP-01',
    controleCentralNome: 'Programa de Prevenção de Substâncias Psicoativas (RBAC 120)',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 120',
        itemOuSecaoNorma: 'RBAC 120 Subparte C / PPSP',
        revisaoVigente: 'Emenda 03',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 120',
        itemOuSecaoNorma: '14 CFR Part 120 Drug and alcohol testing program',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 14 DOT / FAA Drug and Alcohol Testing',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 1 Facilities - Item 8 Anti-drug program compliance',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 26,
    tags: ['PPSP', 'RBAC 120', 'Álcool e Drogas', 'DOT FAA', 'ANAC', 'FAA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-027',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-027',
    titulo: 'Controle de Limites de Jornada de Trabalho, Descanso e Prevenção de Fadiga (Duty Limitation)',
    categoria: 'Competência e Pessoal Técnico',
    processo: 'Recursos Humanos e Escalas Operacionais',
    perguntaOuCriterio: 'Existe sistema formal de controle e acompanhamento das jornadas de trabalho dos técnicos (duty limitations), garantindo descanso obrigatório de 24 horas consecutivas a cada período de 7 dias consecutivos?',
    textoDetalhado: 'A organização deve prevenir a fadiga humana limitando horas extras consecutivas em manutenções críticas.',
    orientacaoEvidencia: 'Espelhos de ponto eletrônico, escalas mensais de trabalho de hangar e linha de voo, controle de horas de prontidão.',
    controleCentralId: 'CTRL-FATIGUE-01',
    controleCentralNome: 'Limites de Jornada de Trabalho e Gestão de Fadiga',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 65 / Part 121',
        itemOuSecaoNorma: '14 CFR 65.89 / 121.377 Maintenance duty time limitations',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.47(b) Fatigue risk management and shift planning',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.2.6 Maintenance Duty Period Limitations',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 1 General Operations - Item 2 Duty limitation requirement and enforcement',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 27,
    tags: ['Fadiga', 'Duty Limitation', 'Escalas', 'Descanso', 'FAA', 'EASA', 'IOSA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-028',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-028',
    titulo: 'Procedimento de Passagem de Serviço e Continuidade de Tarefas entre Turnos (Shift Handover)',
    categoria: 'Operações de Linha e Trânsito',
    processo: 'Produção e Manutenção de Linha',
    perguntaOuCriterio: 'Existe procedimento formal e livro de passagem de serviço (shift turnover log) com registro claro do status de tarefas incompletas, peças pendentes e briefing verbal entre turnos de trabalho?',
    textoDetalhado: 'O procedimento assegura que o turno entrante compreenda o estágio exato das manutenções em andamento.',
    orientacaoEvidencia: 'Livro de passagem de turno físico ou digital devidamente assinado pelos supervisores de saída e entrada.',
    controleCentralId: 'CTRL-PROD-01',
    controleCentralNome: 'Passagem de Serviço entre Turnos e Continuidade de Tarefas',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211 / MOMQ 3.5.4',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.47(c) / AMC 145.A.47 Shift handover procedure',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Work Processing - Item 61 Shift turnover log and briefing',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ',
        normaDocumento: 'PO-009',
        itemOuSecaoNorma: 'PO-009 Procedimento de Passagem de Turno Operacional',
        revisaoVigente: 'Rev. 02',
        obrigatoriedade: 'MANDATORIO'
      }
    ],
    ordem: 28,
    tags: ['Passagem de Turno', 'Shift Handover', 'Continuidade', 'Briefing', 'ANAC', 'EASA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-029',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-029',
    titulo: 'Qualificação, Auditoria e Homologação de Oficinas Subcontratadas e Fornecedores Externos',
    categoria: 'Sistema de Garantia da Qualidade (SGQ)',
    processo: 'Compras e Qualificação de Fornecedores',
    perguntaOuCriterio: 'A organização mantém lista formal de fornecedores e oficinas subcontratadas aprovadas (AVL - Approved Vendor List), com avaliações periódicas de qualidade e controle de escopo contratado?',
    textoDetalhado: 'Serviços especializados subcontratados (como ensaios não destrutivos ou usinagem) devem ser executados sob o sistema de qualidade da IMPACTO.',
    orientacaoEvidencia: 'Lista de Fornecedores Aprovados (AVL), questionários de avaliação de fornecedor, auditorias de terceiros realizadas.',
    controleCentralId: 'CTRL-SUPPLIER-01',
    controleCentralNome: 'Qualificação e Auditoria de Fornecedores Externos (AVL)',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145',
        itemOuSecaoNorma: 'RBAC 145.211 / IS 145-001H / MOMQ 3.6.2',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_EASA',
        autoridadeOuCliente: 'EASA',
        normaDocumento: 'EASA Part-145',
        itemOuSecaoNorma: '145.A.75 / GM 145.A.75 Subcontracting maintenance',
        revisaoVigente: 'Issue 2024',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 145',
        itemOuSecaoNorma: '14 CFR 145.217 Contract maintenance',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'PADRAO_IOSA',
        autoridadeOuCliente: 'IATA / IOSA',
        normaDocumento: 'IOSA ISM',
        itemOuSecaoNorma: 'MNT 1.5.3 Subcontracted Maintenance Oversight',
        revisaoVigente: 'Ed. 16',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 7 Contracted Agencies - Items 62 to 65 Outside agency audits and Approved Vendor List',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 29,
    tags: ['Fornecedores', 'Subcontratação', 'AVL', 'Auditoria Externa', 'ANAC', 'EASA', 'FAA', 'IOSA', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-030',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-030',
    titulo: 'Segurança Operacional de Pátio, Calços, Travas, Capas Protetoras e Aterramento de Aeronaves',
    categoria: 'Operações de Linha e Trânsito',
    processo: 'Manutenção de Linha e Pátio',
    perguntaOuCriterio: 'Aeronaves no pátio ou hangar permanecem com calços de trem de pouso instalados, pinos de segurança de trem e portas, capas de tubos de pitot/estática e cabos de aterramento eletrostático devidamente conectados?',
    textoDetalhado: 'Deve haver verificação diária de segurança de rampa e desobstrução de saídas de emergência.',
    orientacaoEvidencia: 'Inspeção física das aeronaves estacionadas, disponibilidade de capas com bandeirolas "REMOVE BEFORE FLIGHT" e calços de borracha.',
    controleCentralId: 'CTRL-LINE-01',
    controleCentralNome: 'Segurança de Linha de Voo, Aterramento e Calços',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145 / RBAC 43',
        itemOuSecaoNorma: 'RBAC 145.103 / POP-RAMPA-01',
        revisaoVigente: 'Emenda 06',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Aircraft Audit - Items 66 to 69 Chocks, gear pins, grounding cables, pitot covers',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 6 Ramp Safety - Items 9 to 10 Aircraft securing and ground clearances',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 7 Ramp safety procedures for B737-MAX turnaround',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 30,
    tags: ['Linha de Voo', 'Calços', 'Pinos de Trem', 'Pitot', 'Aterramento', 'Rampa', 'ANAC', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-031',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-031',
    titulo: 'Itens de Inspeção Obrigatória (RII - Required Inspection Items) e Dupla Inspeção Mandatória',
    categoria: 'Operações de Linha e Trânsito',
    processo: 'Inspeção de Qualidade e RII',
    perguntaOuCriterio: 'A organização cumpre os procedimentos de Itens de Inspeção Obrigatória (RII) do operador, garantindo que o inspetor credenciado não seja o mesmo técnico que executou a manutenção e que haja assinatura/carimbo específico no logbook?',
    textoDetalhado: 'Ações que afetam comandos de voo ou superfícies críticas não podem ser concluídas sem inspeção RII independente.',
    orientacaoEvidencia: 'Lista de mecânicos credenciados como inspetores RII, task cards com dupla assinatura (Executor e Inspetor RII).',
    controleCentralId: 'CTRL-RII-01',
    controleCentralNome: 'Controle de Itens de Inspeção Obrigatória (RII)',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA',
        normaDocumento: '14 CFR Part 121 / Part 145',
        itemOuSecaoNorma: '14 CFR 121.369 / 121.371 Required inspection items (RII)',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Work Processing - Items 50 to 51 RII inspector qualification and separate sign-off',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 7 Records & QC - Item 14 RII procedure compliance',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 31,
    tags: ['RII', 'Required Inspection Items', 'Dupla Inspeção', 'FAA', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-032',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-032',
    titulo: 'Lançamento em Diário de Bordo, Itens Retidos (MEL / CDL) e Liberação de Voo',
    categoria: 'Operações de Linha e Trânsito',
    processo: 'Manutenção de Linha e Liberação',
    perguntaOuCriterio: 'Os registros no Diário de Bordo da aeronave (Aircraft Flight Logbook) são realizados conforme os procedimentos do operador aéreo, contendo ação corretiva precisa, referência de AMM/MEL, prazo de expiração de itens postergados e liberação CRS assinada?',
    textoDetalhado: 'Itens diferidos (MEL/CDL) devem ter plaqueta no cockpit e controle rigoroso de dias de operação.',
    orientacaoEvidencia: 'Cópias de páginas de Diário de Bordo de voos recentes, controle de itens diferidos em sistema (MEL tracking).',
    controleCentralId: 'CTRL-MEL-01',
    controleCentralNome: 'Lançamento em Diário de Bordo e Gestão de MEL/CDL',
    criticidade: 'CRITICA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 43 / RBAC 91 / RBAC 121',
        itemOuSecaoNorma: 'RBAC 43.9 / RBAC 91.405 / RBAC 121.369',
        revisaoVigente: 'Emenda 04',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Work Processing - Items 56 to 58 Logbook entries, MEL/CDL deferrals and tracking',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 7 Records - Item 15 Logbook signoffs and MEL items',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Audit',
        itemOuSecaoNorma: 'Item 8 Flight logbook CRS and MEL deferrals for B737-MAX',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 32,
    tags: ['Diário de Bordo', 'MEL', 'CDL', 'Logbook', 'Linha de Voo', 'ANAC', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-033',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-033',
    titulo: 'Calibração e Manutenção Preventiva de Equipamentos de Apoio de Solo (GSE)',
    categoria: 'Equipamentos e Metrologia',
    processo: 'Manutenção de GSE e Equipamentos',
    perguntaOuCriterio: 'Os equipamentos móveis de apoio de solo (GPU, unidades hidráulicas móveis, manômetros de enchimento de pneus e garrafas de nitrogênio/oxigênio) possuem manutenção preventiva e calibração periódica comprovadas?',
    textoDetalhado: 'Manômetros de bancadas de teste e calibradores de pneu devem estar sempre dentro da validade.',
    orientacaoEvidencia: 'Etiquetas de inspeção e calibração nos carrinhos de nitrogênio, GPUs e manômetros de serviço de pneu.',
    controleCentralId: 'CTRL-GSE-01',
    controleCentralNome: 'Manutenção Preventiva e Calibração de GSE',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145 / IS 145.109-001C',
        itemOuSecaoNorma: 'IS 145.109-001C Calibração de equipamentos de apoio',
        revisaoVigente: 'Rev. C',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 3 Calibrated Tooling - Items 24 to 25 GPU, hydraulic carts and tire pressure gauges calibration',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air Q2059',
        itemOuSecaoNorma: 'Section 3 Tooling - Item 16 Ground equipment calibration and readiness',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 33,
    tags: ['GSE', 'GPU', 'Manômetros', 'Nitrogênio', 'Apoio de Solo', 'ANAC', 'Kalitta', 'Atlas'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-034',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-034',
    titulo: 'Operações em Clima Severo, Degelo e Proteção de Aeronaves no Solo (De-icing / Anti-icing)',
    categoria: 'Operações de Linha e Trânsito',
    processo: 'Manutenção de Linha e Operações Especiais',
    perguntaOuCriterio: 'A organização dispõe de procedimentos, treinamento e equipamentos adequados para proteção de aeronaves em condições meteorológicas severas (ventos fortes, tempestades) e degelo/antigelo quando aplicável?',
    textoDetalhado: 'Amarração de aeronaves (tie-down) e proteção de superfícies móveis devem seguir o AMM do fabricante.',
    orientacaoEvidencia: 'POP de amarração e tempestades no pátio, registros de treinamento de técnicos em operações climáticas adversas.',
    controleCentralId: 'CTRL-WEATHER-01',
    controleCentralNome: 'Procedimentos de Clima Severo e Amarração de Aeronaves',
    criticidade: 'MEDIA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'AUTORIDADE_ANAC',
        autoridadeOuCliente: 'ANAC',
        normaDocumento: 'RBAC 145 / IS 145-001H',
        itemOuSecaoNorma: 'IS 145-001H Seção 5 Procedimentos de proteção de aeronaves',
        revisaoVigente: 'Rev. H',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta Air QA-14',
        itemOuSecaoNorma: 'Section 8 Work Processing - Items 52 to 53 Adverse weather operations and de-icing compliance',
        revisaoVigente: 'QA 14 Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 34,
    tags: ['Clima Severo', 'Degelo', 'Tie-Down', 'Ventos Fortes', 'ANAC', 'Kalitta'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-035',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-035',
    titulo: 'Aderência aos Manuais de Manutenção do Operador Aéreo (GMM do Cliente)',
    categoria: 'Sistema de Garantia da Qualidade (SGQ)',
    processo: 'Qualidade e Gestão Contratual',
    perguntaOuCriterio: 'A organização cumpre os procedimentos específicos definidos no Manual Geral de Manutenção (GMM) de cada operador contratante, incluindo canais de comunicação com o CCO e autorização prévia para serviços não programados?',
    textoDetalhado: 'Cada cliente possui particularidades contratuais que devem constar nas instruções de trabalho da equipe de linha.',
    orientacaoEvidencia: 'Lista de contatos do CCO/QA das companhias aéreas clientes, pastas operacionais com procedimentos do GMM Kalitta, Atlas, TACV.',
    controleCentralId: 'CTRL-CLIENT-01',
    controleCentralNome: 'Cumprimento de Requisitos Específicos de Clientes (GMM)',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Kalitta Air',
        normaDocumento: 'Kalitta GMM',
        itemOuSecaoNorma: 'GMM 1.1 / 3.1 / 6.1 / 6.2 Operator procedures adherence',
        revisaoVigente: 'Rev. 4',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Atlas Air',
        normaDocumento: 'Atlas Air GMM',
        itemOuSecaoNorma: 'Atlas Air GMM Section 3 Operator liaison and communications',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'CONTRATUAL'
      },
      {
        tipoEntidade: 'CLIENTE_OPERADOR',
        autoridadeOuCliente: 'Cabo Verde Airlines (TACV)',
        normaDocumento: 'TACV Line Station Manual',
        itemOuSecaoNorma: 'Section 4 Communications with TACV OCC',
        revisaoVigente: 'Rev. 2025',
        obrigatoriedade: 'CONTRATUAL'
      }
    ],
    ordem: 35,
    tags: ['GMM Cliente', 'Contratos', 'Comunicação CCO', 'Kalitta', 'Atlas', 'TACV'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  },

  {
    id: 'CRIT-CORP-036',
    organizationId: 'org_impacto_aviation',
    codigoUnico: 'CRIT-CORP-036',
    titulo: 'Segurança Ocupacional, Trabalho em Altura, Bloqueio LOTO e Conformidade Ambiental',
    categoria: 'Segurança do Trabalho e Ambiental',
    processo: 'Segurança do Trabalho (SST) e Meio Ambiente',
    perguntaOuCriterio: 'A organização assegura uso obrigatório de Equipamentos de Proteção Individual (EPI), linhas de vida para trabalho em altura (NR-35), procedimento de bloqueio de fontes de energia (LOTO) e descarte ambientalmente adequado de resíduos perigosos?',
    textoDetalhado: 'Óleos usados, filtros e solventes devem ser armazenados em bacia de contenção com destinação por empresa homologada.',
    orientacaoEvidencia: 'Fichas de entrega de EPIs assinadas, certificados de treinamento em trabalho em altura (NR-35), bacias de contenção de óleo e manifesto de resíduos CONAMA.',
    controleCentralId: 'CTRL-SST-01',
    controleCentralNome: 'Segurança Ocupacional (NRs), LOTO e Gestão Ambiental',
    criticidade: 'ALTA',
    situacaoAplicabilidade: 'APLICAVEL',
    situacaoConformidade: 'CONFORME',
    fontesVinculadas: [
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGQ / SST',
        normaDocumento: 'PO-010 / NR-06 / NR-35',
        itemOuSecaoNorma: 'PO-010 Segurança do Trabalho, EPI e Linha de Vida',
        revisaoVigente: 'Rev. 03',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'INTERNO_SGQ',
        autoridadeOuCliente: 'IMPACTO SGSO',
        normaDocumento: 'MGSO',
        itemOuSecaoNorma: 'MGSO Seção 4 Procedimentos de Bloqueio e Etiquetagem (LOTO)',
        revisaoVigente: 'Rev. 02',
        obrigatoriedade: 'MANDATORIO'
      },
      {
        tipoEntidade: 'AUTORIDADE_FAA',
        autoridadeOuCliente: 'FAA / OSHA',
        normaDocumento: 'OSHA 1910',
        itemOuSecaoNorma: 'OSHA General Industry Safety Standards',
        revisaoVigente: 'Rev. Vigente',
        obrigatoriedade: 'RECOMENDADO'
      }
    ],
    ordem: 36,
    tags: ['EPI', 'NR-35', 'LOTO', 'Meio Ambiente', 'Resíduos', 'SST', 'Segurança do Trabalho'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  }
];
