import { ManualRecord } from '../types';

export const INITIAL_MANUALS: ManualRecord[] = [
  {
    id: 'man-momq-rev14',
    codigo: 'MOMQ',
    titulo: 'Manual da Organização de Manutenção da Qualidade',
    revisao: 'Rev. 14',
    tipoDocumento: 'Manual Interno',
    dataEmissao: '2025-05-15',
    dataVigencia: '2025-06-01',
    orgaoRegulador: 'SGQ Interno (Homologado ANAC/FAA)',
    fonte: 'Repositório de Manuais Controlados do SGQ Interno (Doc. OM-Q-001)',
    setoresAplicaveis: ['REC - Manutenção / Calibração', 'Qualidade', 'Engenharia', 'Almoxarifado Aeronáutico', 'Oficina de Motores'],
    descricaoResumo: 'Define as diretrizes de garantia de qualidade da organização de manutenção, controle de calibração de ferramentas (item 3.4.3), controle de registros e qualificações.',
    status: 'Vigente',
    arquivoNome: 'MOMQ_Rev14_2025_Aprovado.pdf',
    arquivoTamanho: '4.8 MB',
    criadoEm: '2025-06-01T08:00:00.000Z',
    atualizadoEm: '2026-08-01T10:00:00.000Z',
    versoesConfiguracao: [
      {
        id: 'cfg-momq-rev14',
        revisaoOuEmenda: 'Rev. 14',
        inicioVigencia: '2025-06-01',
        fonte: 'SGQ Interno - Portaria de Aprovação 014/2025',
        status: 'Vigente',
        resumoAlteracoes: 'Atualização do item 3.4.3 para controle 100% digital de calibrações e extinção de planilhas locais.'
      },
      {
        id: 'cfg-momq-rev13',
        revisaoOuEmenda: 'Rev. 13',
        inicioVigencia: '2023-08-10',
        fimVigencia: '2025-05-31',
        fonte: 'SGQ Interno - Histórico de Documentos',
        status: 'Obsoleto',
        resumoAlteracoes: 'Revisão anterior com permissão transitória de controle por planilha com validação mensal.'
      }
    ],
    conteudoTexto: `MANUAL DA ORGANIZAÇÃO DE MANUTENÇÃO DA QUALIDADE (MOMQ) - REVISÃO 14 (VIGENTE)
Data de Aprovação: 01/06/2025
Fonte: SGQ Interno

Capítulo 1 - Sistema de Gestão da Qualidade
1.1 Política da Qualidade: A organização deve garantir conformidade irrestrita com regulamentos aeronáuticos e normas de segurança de voo.
1.2 Controle de Registros de Qualidade: Todos os registros devem ser mantidos em base de dados centralizada e auditável por no mínimo 5 anos.

Capítulo 3 - Controle de Ferramentas, Equipamentos e Metrologia
3.4.1 Identificação e Armazenamento de Ferramental: Todo ferramental especial deve estar devidamente identificado e catalogado em painel controlado. Ferramentas avariadas ou vencidas devem ser imediatamente etiquetadas com 'QUARENTENA' e fisicamente segregadas.
3.4.2 Calibração de Equipamentos: Todo instrumento com impacto em medição e inspeção (torquímetros, multímetros, micrômetros, manômetros) deve possuir rastreabilidade metrológica a padrões RBC/INMETRO ou NIST.
3.4.3 Gestão e Controle Centralizado de Calibração: O controle de validade de calibração de todas as bases operacionais deve ser mantido em plataforma centralizada digital, sendo expressamente proibido o uso de planilhas locais descentralizadas sem conciliação sistêmica e sem travas de controle. Todo item próximo a 15 dias do vencimento deve gerar notificação preventiva.

Capítulo 4 - Qualificação e Treinamento
4.1 Registros de Treinamento Técnico: Nenhum técnico ou inspetor pode assinar liberação de serviço (CRS) sem que a comprovação do treinamento mandatório periódico de fatores humanos e tipo de aeronave esteja anexada ao dossiê funcional.

Capítulo 5 - Tratamento de Não Conformidades e Ações Corretivas
5.1 Abertura de RNC (Formulário F 001-29): Toda constatação de desvio deve ser formalizada em até 24 horas via RNC, contendo avaliação de risco 5x5, contenção imediata, análise de 5 Porquês e plano corretivo.`,
    capitulos: [
      {
        id: 'cap-1-2',
        numero: '1.2',
        titulo: 'Controle de Registros de Qualidade',
        requisitoTexto: 'Todos os registros técnicos e formulários de qualidade devem ser emitidos e preservados em repositório central com rastreabilidade auditável.',
        palavrasChave: ['registro', 'documento', 'qualidade', 'armazenamento']
      },
      {
        id: 'cap-3-4-1',
        numero: '3.4.1',
        titulo: 'Identificação e Armazenamento de Ferramental',
        requisitoTexto: 'Ferramental especial com suspeita de desvio ou calibração vencida deve receber etiqueta vermelha de quarentena e ser segregado imediatamente.',
        palavrasChave: ['ferramenta', 'quarentena', 'segregação', 'painel']
      },
      {
        id: 'cap-3-4-3',
        numero: '3.4.3',
        titulo: 'Gestão e Controle Centralizado de Calibração',
        requisitoTexto: 'O controle de calibração de instrumentos de medição deve ser integrado e corporativo, vedada a gestão descentralizada em planilhas locais desprovidas de travas sistêmicas.',
        palavrasChave: ['calibração', 'metrologia', 'planilha', 'descentralizada', 'torquímetro', 'validade']
      },
      {
        id: 'cap-4-1',
        numero: '4.1',
        titulo: 'Registros de Treinamento Técnico e Habilitação',
        requisitoTexto: 'Exige comprovação de treinamento e proficiência técnica atualizada antes da delegação de inspeções aeronáuticas críticas.',
        palavrasChave: ['treinamento', 'qualificação', 'inspetor', 'mecânico', 'certificado']
      }
    ]
  },
  {
    id: 'man-rbac-145',
    codigo: 'RBAC 145',
    titulo: 'Regulamento Brasileiro da Aviação Civil - Organizações de Manutenção',
    revisao: 'Emenda 07',
    tipoDocumento: 'Documento Normativo Oficial',
    dataEmissao: '2024-10-01',
    dataVigencia: '2024-11-15',
    orgaoRegulador: 'ANAC (Agência Nacional de Aviação Civil)',
    fonte: 'Diário Oficial da União / Portal Oficial de Legislação da ANAC',
    setoresAplicaveis: ['REC - Manutenção / Calibração', 'Qualidade', 'Engenharia', 'Operações de Manutenção'],
    descricaoResumo: 'Requisitos mandatórios da ANAC para certificação e operação de oficinas de manutenção aeronáutica, ferramentas, equipamentos e instalações.',
    status: 'Vigência não verificada',
    arquivoNome: 'RBAC_145_Emenda07_ANAC.pdf',
    arquivoTamanho: '3.2 MB',
    criadoEm: '2024-11-15T09:00:00.000Z',
    atualizadoEm: '2026-07-20T11:00:00.000Z',
    versoesConfiguracao: [
      {
        id: 'cfg-rbac-emenda07',
        revisaoOuEmenda: 'Emenda 07',
        inicioVigencia: '2024-11-15',
        fonte: 'Resolução ANAC nº 745/2024',
        status: 'Vigência não verificada',
        resumoAlteracoes: 'Harmonização dos requisitos de metrologia com a ICAO Annex 6.'
      },
      {
        id: 'cfg-rbac-emenda06',
        revisaoOuEmenda: 'Emenda 06',
        inicioVigencia: '2021-03-01',
        fimVigencia: '2024-11-14',
        fonte: 'Resolução ANAC nº 612/2021',
        status: 'Obsoleto',
        resumoAlteracoes: 'Versão histórica anterior.'
      }
    ],
    conteudoTexto: `RBAC 145 - ORGANIZAÇÕES DE MANUTENÇÃO AERONÁUTICA (EMENDA 07)
Subparte C - Instalações, Ferramentas e Equipamentos
Seção 145.109 Requisitos de Ferramentas e Equipamentos:
(a) O detentor do certificado deve possuir o ferramental, os padrões e os equipamentos de teste recomendados pelo fabricante da aeronave ou equivalente aceitável pela ANAC.
(b) O detentor do certificado deve garantir que todos os equipamentos de teste e de medição utilizados para determinar a conformidade com as especificações aplicáveis sejam calibrados em intervalos regulares com rastreabilidade metrológica comprovada.
(c) Ferramentas e equipamentos fora de especificação ou com prazo de calibração expirado não podem ser utilizados em nenhum serviço de manutenção.

Subparte D - Pessoal
Seção 145.153 Pessoal de Supervisão e Inspeção:
A organização de manutenção deve assegurar que o pessoal de supervisão e inspeção possua habilitação válida, treinamento atualizado e conheça os procedimentos do MOMQ.

Subparte E - Registros de Manutenção
Seção 145.219 Registros de Manutenção:
Cada organização deve manter registros detalhados demonstrando que todos os requisitos foram cumpridos antes da emissão do Certificado de Liberação de Serviço (CRS).`,
    capitulos: [
      {
        id: 'cap-145-109',
        numero: '145.109',
        titulo: 'Requisitos de Ferramentas e Equipamentos',
        requisitoTexto: 'Exige calibração periódica com rastreabilidade formal e proíbe terminantemente o uso de instrumentos vencidos em manutenção de aeronaves.',
        palavrasChave: ['calibração', 'ferramental', 'rastreabilidade', 'vencido']
      },
      {
        id: 'cap-145-219',
        numero: '145.219',
        titulo: 'Registros de Manutenção e Liberação Técnica',
        requisitoTexto: 'Todos os registros técnicos de intervenção devem ser arquivados com evidências de conformidade antes da liberação ao voo.',
        palavrasChave: ['crs', 'liberação', 'registro', 'manutenção']
      }
    ]
  },
  {
    id: 'man-iso-9001',
    codigo: 'ISO 9001:2015',
    titulo: 'Sistemas de Gestão da Qualidade - Requisitos',
    revisao: 'NBR ISO 9001:2015',
    tipoDocumento: 'Documento Normativo Oficial',
    dataEmissao: '2015-09-15',
    dataVigencia: '2015-09-15',
    orgaoRegulador: 'ABNT / ISO',
    fonte: 'Associação Brasileira de Normas Técnicas (ABNT)',
    setoresAplicaveis: ['Qualidade', 'Diretoria', 'Geral', 'Suprimentos', 'Recursos Humanos'],
    descricaoResumo: 'Norma internacional de gestão da qualidade: Recursos de monitoramento e medição (7.1.5), Informação documentada (7.5), Não conformidade e ação corretiva (10.2).',
    status: 'Vigência não verificada',
    arquivoNome: 'ABNT_NBR_ISO_9001_2015.pdf',
    arquivoTamanho: '2.1 MB',
    criadoEm: '2023-01-01T08:00:00.000Z',
    atualizadoEm: '2026-05-10T14:00:00.000Z',
    versoesConfiguracao: [
      {
        id: 'cfg-iso-2015',
        revisaoOuEmenda: 'Edição 2015',
        inicioVigencia: '2015-09-15',
        fonte: 'ABNT NBR ISO 9001:2015',
        status: 'Vigência não verificada',
        resumoAlteracoes: 'Abordagem baseada em riscos e estrutura de alto nível.'
      }
    ],
    conteudoTexto: `NBR ISO 9001:2015 - REQUISITOS DO SISTEMA DE GESTÃO DA QUALIDADE

Requisito 7.1.5 - Recursos de Monitoramento e Medição
7.1.5.1 Generalidades: A organização deve determinar e prover os recursos necessários para assegurar resultados válidos e confiáveis quando o monitoramento ou medição for utilizado para evidenciar a conformidade de produtos e serviços.
7.1.5.2 Rastreabilidade de Medição: Quando a rastreabilidade for um requisito, os equipamentos de medição devem ser:
a) Calibrados ou verificados a intervalos especificados, ou antes do uso, contra padrões de medição rastreáveis;
b) Identificados para determinar sua situação;
c) Protegidos contra ajustes, danos ou deterioração.

Requisito 8.7 - Controle de Saídas Não Conformes
A organização deve assegurar que saídas que não estejam conformes com seus requisitos sejam identificadas e controladas para prevenir seu uso ou entrega não intencional.

Requisito 10.2 - Não Conformidade e Ação Corretiva
Ao ocorrer uma não conformidade, a organização deve:
a) Reagir à não conformidade e, conforme aplicável: tomar ação para controlá-la e corrigi-la; lidar com as consequências;
b) Avaliar a necessidade de ação para eliminar a(s) causa(s) da não conformidade (análise de causa raiz);
c) Implementar qualquer ação necessária;
d) Analisar criticamente a eficácia de qualquer ação corretiva tomada.`,
    capitulos: [
      {
        id: 'cap-iso-7-1-5',
        numero: '7.1.5',
        titulo: 'Recursos de Monitoramento e Medição',
        requisitoTexto: 'Instrumentos de medição devem ser calibrados contra padrões rastreáveis e identificados quanto à situação de calibração.',
        palavrasChave: ['medição', 'calibração', 'rastreabilidade', 'monitoramento']
      },
      {
        id: 'cap-iso-10-2',
        numero: '10.2',
        titulo: 'Não Conformidade e Ação Corretiva',
        requisitoTexto: 'Exige análise formal de causa raiz, implementação de ações corretivas e verificação sistemática de eficácia.',
        palavrasChave: ['não conformidade', 'causa raiz', 'ação corretiva', 'eficácia']
      }
    ]
  },
  {
    id: 'man-sgso-rev06',
    codigo: 'SGSO',
    titulo: 'Manual do Sistema de Gerenciamento da Segurança Operacional',
    revisao: 'Rev. 06',
    tipoDocumento: 'Manual Interno',
    dataEmissao: '2025-01-05',
    dataVigencia: '2025-01-10',
    orgaoRegulador: 'ANAC / ICAO DOC 9859',
    fonte: 'Comitê de Segurança Operacional (CSO) / SGQ Interno',
    setoresAplicaveis: ['Segurança Operacional', 'Qualidade', 'Operações', 'Manutenção de Linha'],
    descricaoResumo: 'Diretrizes de identificação de perigos, gerenciamento e matriz de risco 5x5, garantia da segurança operacional e cultura justa.',
    status: 'Vigente',
    arquivoNome: 'SGSO_Manual_Rev06.pdf',
    arquivoTamanho: '5.1 MB',
    criadoEm: '2025-01-10T10:00:00.000Z',
    atualizadoEm: '2026-06-15T09:00:00.000Z',
    versoesConfiguracao: [
      {
        id: 'cfg-sgso-rev06',
        revisaoOuEmenda: 'Rev. 06',
        inicioVigencia: '2025-01-10',
        fonte: 'Aprovação Diretoria de Segurança de Voo',
        status: 'Vigente',
        resumoAlteracoes: 'Ajuste de matriz 5x5 e prazos mandatórios para riscos críticos.'
      }
    ],
    conteudoTexto: `MANUAL DO SISTEMA DE GERENCIAMENTO DA SEGURANÇA OPERACIONAL (SGSO) - REV. 06

Capítulo 2 - Matriz de Avaliação de Risco 5x5
2.3 Classificação de Severidade (1 a 5):
1 - Catastrófico: Perda de aeronave, fatalidades múltiplas.
2 - Crítico: Redução substancial das margens de segurança, lesões graves.
3 - Moderado: Redução das margens de segurança, lesões leves.
4 - Menor: Pequeno impacto operacional ou administrativo.
5 - Insignificante: Sem consequências operacionais perceptíveis.

2.4 Classificação de Probabilidade (A a E):
A - Frequente: Provável de ocorrer muitas vezes.
B - Ocasional: Provável de ocorrer algumas vezes.
C - Remoto: Improvável, mas possível de ocorrer.
D - Improvável: Muito improvável de ocorrer.
E - Extremamente Improvável: Quase inconcebível.

Capítulo 3 - Gestão de Ações Preventivas e Mitigatórias
3.1 Toda não conformidade com classificação de risco Alto ou Crítico exige plano de contenção em até 48 horas e monitoramento quinzenal até o encerramento com risco residual aceitável.`,
    capitulos: [
      {
        id: 'cap-sgso-2-3',
        numero: '2.3',
        titulo: 'Matriz de Risco e Classificação de Severidade / Probabilidade',
        requisitoTexto: 'Define os critérios objetivos para atribuição de códigos na matriz 5x5 e ações mandatórias para riscos críticos.',
        palavrasChave: ['matriz de risco', 'severidade', 'probabilidade', 'crítico']
      }
    ]
  },
  {
    id: 'man-moe-rev09',
    codigo: 'MOE',
    titulo: 'Maintenance Organization Exposition (EASA / FAA Supplement)',
    revisao: 'Rev. 09',
    tipoDocumento: 'Manual Interno',
    dataEmissao: '2025-03-01',
    dataVigencia: '2025-03-20',
    orgaoRegulador: 'FAA / EASA Part 145',
    fonte: 'Quality Assurance Department / FAA Certificate Holdership',
    setoresAplicaveis: ['REC - Manutenção / Calibração', 'Qualidade Internacional', 'Engenharia'],
    descricaoResumo: 'Suplemento internacional para atendimento a requisitos FAA 14 CFR Part 145 e EASA Part-145 para aprovação de oficinas estrangeiras.',
    status: 'Vigente',
    arquivoNome: 'MOE_FAA_EASA_Supplement_Rev09.pdf',
    arquivoTamanho: '6.4 MB',
    criadoEm: '2025-03-20T11:00:00.000Z',
    atualizadoEm: '2026-08-01T15:00:00.000Z',
    versoesConfiguracao: [
      {
        id: 'cfg-moe-rev09',
        revisaoOuEmenda: 'Rev. 09',
        inicioVigencia: '2025-03-20',
        fonte: 'FAA Principal Maintenance Inspector (PMI) Acceptance Letter',
        status: 'Vigente',
        resumoAlteracoes: 'Alinhamento dos procedimentos de calibração eletrônica com a FAA Order 8900.1.'
      }
    ],
    conteudoTexto: `MAINTENANCE ORGANIZATION EXPOSITION (MOE) - REVISION 09
FAA / EASA FOREIGN REPAIR STATION SUPPLEMENT

Section L2.4 - Tooling and Calibration Control Procedures
All calibrated tools utilized in maintenance operations for N-registered aircraft must comply with FAA Order 8900 and Manufacturer Maintenance Manuals (AMM).
Calibration records must be held in a unified electronic system with automated expiration tracking. Tooling with missing, illegible or expired calibration tags shall be quarantined immediately.

Section L2.7 - Non-Conformity Management and Root Cause Analysis
Discrepancies identified during internal or external FAA pre-audits must be documented on Form F 001-29 and submitted to the Quality Assurance Manager within agreed timelines.`,
    capitulos: [
      {
        id: 'cap-moe-l2-4',
        numero: 'L2.4',
        titulo: 'Tooling and Calibration Control Procedures (FAA Supplement)',
        requisitoTexto: 'Requires unified electronic calibration systems and mandatory quarantining for any expired or uncalibrated tool.',
        palavrasChave: ['faa', 'tooling', 'calibration', 'quarantine', 'order 8900']
      }
    ]
  }
];

