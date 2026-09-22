import { TipoControleImportacao } from '../types';

export interface PresetAmostraImportacao {
  id: string;
  nomeArquivo: string;
  formato: 'XLSX' | 'CSV' | 'DOCX' | 'PDF';
  tipoEsperado: TipoControleImportacao;
  descricaoCenario: string;
  conteudoTexto?: string;
  linhasAmostra: Record<string, any>[];
  colunas: string[];
  destaqueTeste: string;
}

export const PRESETS_AMOSTRAS_IMPORTACAO: PresetAmostraImportacao[] = [
  {
    id: 'amostra-treinamentos-real',
    nomeArquivo: 'Controle_Treinamentos_Impacto_2026.xlsx',
    formato: 'XLSX',
    tipoEsperado: 'TREINAMENTOS',
    descricaoCenario: 'Planilha operacional padrão de treinamentos da Impacto Aviation MRO com mecânicos, inspetores e cursos mandatórios ANAC/EASA.',
    destaqueTeste: 'TESTE 1: Importação de treinamentos, identificação de cursos mandatórios, CHTs e integração com requisitos Atlas e Kalitta.',
    colunas: ['Funcionário', 'Matrícula', 'Função / Especialidade', 'Curso / Treinamento', 'Data Realização', 'Data Validade', 'Carga Horária (h)', 'Entidade Instrutora', 'Nº Certificado', 'Situação'],
    linhasAmostra: [
      {
        'Funcionário': 'Carlos Eduardo Silva',
        'Matrícula': 'MEC-1042',
        'Função / Especialidade': 'Mecânico de Linha CHT GMP/CEL',
        'Curso / Treinamento': 'EWIS - Electrical Wiring Interconnection System Target Group 1/2',
        'Data Realização': '2025-05-10',
        'Data Validade': '2027-05-10',
        'Carga Horária (h)': '16',
        'Entidade Instrutora': 'Impacto Training Academy',
        'Nº Certificado': 'CERT-EWIS-2025-088',
        'Situação': 'Válido'
      },
      {
        'Funcionário': 'Carlos Eduardo Silva',
        'Matrícula': 'MEC-1042',
        'Função / Especialidade': 'Mecânico de Linha CHT GMP/CEL',
        'Curso / Treinamento': 'FTS - Fuel Tank Safety Phase 2',
        'Data Realização': '2025-04-12',
        'Data Validade': '2027-04-12',
        'Carga Horária (h)': '8',
        'Entidade Instrutora': 'AeroQuali Consultoria',
        'Nº Certificado': 'CERT-FTS-2025-032',
        'Situação': 'Válido'
      },
      {
        'Funcionário': 'Juliana Ramos Albuquerque',
        'Matrícula': 'INS-2019',
        'Função / Especialidade': 'Inspetora da Qualidade Chefe / NDT',
        'Curso / Treinamento': 'Fatores Humanos na Manutenção Aeronáutica (Initial)',
        'Data Realização': '2024-11-20',
        'Data Validade': '2026-11-20',
        'Carga Horária (h)': '16',
        'Entidade Instrutora': 'ANAC Homologada Formação',
        'Nº Certificado': 'CERT-FH-2024-119',
        'Situação': 'Válido'
      },
      {
        'Funcionário': 'Marcos Vinícius Santos',
        'Matrícula': 'AVI-3004',
        'Função / Especialidade': 'Técnico em Aviônica CHT AVI',
        'Curso / Treinamento': 'Boeing 767-300 General Familiarization (ATA 104 Nível 1)',
        'Data Realização': '2023-08-15',
        'Data Validade': '',
        'Carga Horária (h)': '40',
        'Entidade Instrutora': 'Boeing Training Services',
        'Nº Certificado': 'B767-GEN-2023-994',
        'Situação': 'Vitalício'
      },
      {
        'Funcionário': 'Roberto Almeida Prado',
        'Matrícula': 'MEC-4109',
        'Função / Especialidade': 'Mecânico Júnior Linha de Voo',
        'Curso / Treinamento': 'Segurança Operacional - SGSO / SMS',
        'Data Realização': '2024-03-01',
        'Data Validade': '2026-03-01',
        'Carga Horária (h)': '12',
        'Entidade Instrutora': 'Impacto Aviation Safety Team',
        'Nº Certificado': 'SMS-IMP-2024-012',
        'Situação': 'Vencido'
      }
    ]
  },
  {
    id: 'amostra-calibracao-real',
    nomeArquivo: 'Calibracao_Metrologia_Bancada_2026.xlsx',
    formato: 'XLSX',
    tipoEsperado: 'CALIBRACAO_FERRAMENTAL',
    descricaoCenario: 'Controle de ferramentas e instrumentos de bancada sujeitos a calibração metrológica rastreável RBC/Inmetro (RBAC 145.109).',
    destaqueTeste: 'TESTE 2: Importação de metrologia aeronáutica, tolerâncias, certificados RBC e alerta de vencimentos.',
    colunas: ['Código Patrimônio', 'Descrição do Instrumento', 'Fabricante', 'Modelo', 'Número de Série', 'Setor Alocado', 'Última Calibração', 'Próxima Calibração', 'Frequência (Meses)', 'Laboratório Calibrador', 'Nº Certificado', 'Situação'],
    linhasAmostra: [
      {
        'Código Patrimônio': 'TQ-055',
        'Descrição do Instrumento': 'Torquímetro de Estalo 40 a 200 Nm Encaixe 1/2"',
        'Fabricante': 'Gedore',
        'Modelo': 'Torcofix-K 4550-20',
        'Número de Série': 'SN-GED-88912',
        'Setor Alocado': 'Hangar Linha de Manutenção',
        'Última Calibração': '2026-01-20',
        'Próxima Calibração': '2027-01-20',
        'Frequência (Meses)': '12',
        'Laboratório Calibrador': 'LabMetrologia RBC Acreditado C-0412',
        'Nº Certificado': 'CERT-RBC-91024/2026',
        'Situação': 'Calibrada'
      },
      {
        'Código Patrimônio': 'MULT-009',
        'Descrição do Instrumento': 'Multímetro Automotivo Digital Industrial',
        'Fabricante': 'Fluke',
        'Modelo': 'Fluke 179',
        'Número de Série': 'FLK-179-4401',
        'Setor Alocado': 'Oficina de Aviônicos',
        'Última Calibração': '2025-11-10',
        'Próxima Calibração': '2026-11-10',
        'Frequência (Meses)': '12',
        'Laboratório Calibrador': 'LabMetrologia RBC Acreditado C-0412',
        'Nº Certificado': 'CERT-RBC-88902/2025',
        'Situação': 'Calibrada'
      },
      {
        'Código Patrimônio': 'PAQ-019',
        'Descrição do Instrumento': 'Paquímetro Digital 0-150mm Resolução 0,01mm',
        'Fabricante': 'Mitutoyo',
        'Modelo': '500-196-30',
        'Número de Série': 'MIT-993214',
        'Setor Alocado': 'Usinagem & Reparos Estruturais',
        'Última Calibração': '2026-03-05',
        'Próxima Calibração': '2027-03-05',
        'Frequência (Meses)': '12',
        'Laboratório Calibrador': 'Metrologia Inmetro RBC 0102',
        'Nº Certificado': 'CERT-MIT-2026-44',
        'Situação': 'Calibrada'
      },
      {
        'Código Patrimônio': 'MAN-022',
        'Descrição do Instrumento': 'Manômetro de Teste de Pressão de Pneus e Amortecedores (0-300 PSI)',
        'Fabricante': 'Wika',
        'Modelo': '213.53',
        'Número de Série': 'WIK-88120',
        'Setor Alocado': 'Linha de Voo / Rodas e Freios',
        'Última Calibração': '2025-09-18',
        'Próxima Calibração': '2026-09-18',
        'Frequência (Meses)': '12',
        'Laboratório Calibrador': 'LabCentral RBC 0412',
        'Nº Certificado': 'CERT-WIK-2025-99',
        'Situação': 'Vence em Breve'
      }
    ]
  },
  {
    id: 'amostra-documento-real-xlsx',
    nomeArquivo: 'Contole de documento.xlsx',
    formato: 'XLSX',
    tipoEsperado: 'CONTROLE_DOCUMENTAL',
    descricaoCenario: 'Planilha operacional homologada "Contole de documento.xlsx" com revisões alfanuméricas ("Rev. 08", "Rev. D", "02"), variações de datas e teste estrito de governança de status.',
    destaqueTeste: 'TESTE HOMOLOGADO: Revisões alfanuméricas mantidas como STRING, governança estrita de status (STATUS_NAO_INFORMADO proibido de virar ATIVO) e limpeza de cabeçalhos.',
    colunas: ['Código do Documento', 'Título Oficial', 'Tipo / Categoria', 'Revisão Vigente', 'Data de Aprovação', 'Data Próxima Revisão', 'Responsável Elaboração', 'Status', 'Observações'],
    linhasAmostra: [
      {
        'Código do Documento': 'MOMQ',
        'Título Oficial': 'Manual da Organização de Manutenção QualiGest',
        'Tipo / Categoria': 'Manual da Empresa',
        'Revisão Vigente': 'Rev. 08',
        'Data de Aprovação': 'Ago.26',
        'Data Próxima Revisão': '2027-08-01',
        'Responsável Elaboração': 'Eng. Responsável Técnico',
        'Status': 'Vigente',
        'Observações': 'Atualizado com nova emenda do RBAC 145.'
      },
      {
        'Código do Documento': 'POP-MNT-04',
        'Título Oficial': 'Procedimento Operacional de Testes e Calibração de Ferramental',
        'Tipo / Categoria': 'Procedimento Operacional',
        'Revisão Vigente': 'Rev. D',
        'Data de Aprovação': '2025-11-10',
        'Data Próxima Revisão': '2026-11-10',
        'Responsável Elaboração': 'Inspetora Juliana Ramos',
        'Status': 'STATUS_NAO_INFORMADO',
        'Observações': 'Requer classificação operacional pelo SGQ (preservação estrita da governança).'
      },
      {
        'Código do Documento': 'IT-STR-01',
        'Título Oficial': 'Instrução de Trabalho: Reparo Estrutural em Chapa de Alumínio Aeronáutico',
        'Tipo / Categoria': 'Instrução de Trabalho',
        'Revisão Vigente': '02',
        'Data de Aprovação': '15/03/2026',
        'Data Próxima Revisão': '15/03/2027',
        'Responsável Elaboração': 'Mecânico Líder Estruturas',
        'Status': 'ATIVO',
        'Observações': 'Em conformidade com FAA AC 43.13-1B.'
      },
      {
        'Código do Documento': 'F 001-29',
        'Título Oficial': 'Formulário de Relatório de Não Conformidade (RNC)',
        'Tipo / Categoria': 'Formulário SGQ',
        'Revisão Vigente': 'Rev. 03',
        'Data de Aprovação': '01/01/2026',
        'Data Próxima Revisão': '01/01/2028',
        'Responsável Elaboração': 'Gestor da Qualidade',
        'Status': 'Vigente',
        'Observações': 'Formulário homologado para emissão e encerramento de RNCs.'
      }
    ]
  },
  {
    id: 'amostra-documental-normativas-pdf',
    nomeArquivo: 'F 001-02-1 - Controle de Documentações Normativas - Ago.26.pdf',
    formato: 'PDF',
    tipoEsperado: 'CONTROLE_DOCUMENTAL',
    descricaoCenario: 'Formulário F 001-02-1 em PDF para Controle de Documentações Normativas da Autoridade (RBACs ANAC, IS, ICA) com corte temporal Ago.26 e rodapé SGQ.',
    destaqueTeste: 'TESTE HOMOLOGADO: Extração tabular de PDF com formato de data "Ago.26", revisões emendas ("Emenda 07", "Rev. B") e eliminação de rodapés/preâmbulos institucionais.',
    colunas: ['Código da Norma / Regulamento', 'Título da Documentação Normativa', 'Categoria Normativa', 'Revisão / Emenda Vigente', 'Data da Revisão / Emenda', 'Órgão Regulador', 'Status de Adoção', 'Observações'],
    linhasAmostra: [
      {
        'Código da Norma / Regulamento': 'RBAC 145',
        'Título da Documentação Normativa': 'Organizações de Manutenção de Produto Aeronáutico',
        'Categoria Normativa': 'Legislação Aeronáutica ANAC',
        'Revisão / Emenda Vigente': 'Emenda 07',
        'Data da Revisão / Emenda': 'Ago.26',
        'Órgão Regulador': 'ANAC / SPO',
        'Status de Adoção': 'Vigente',
        'Observações': 'Base regulatória primordial para certificação MRO Impacto Aviation'
      },
      {
        'Código da Norma / Regulamento': 'RBAC 43',
        'Título da Documentação Normativa': 'Manutenção, Manutenção Preventiva, Reconstrução e Alteração',
        'Categoria Normativa': 'Legislação Aeronáutica ANAC',
        'Revisão / Emenda Vigente': 'Emenda 05',
        'Data da Revisão / Emenda': '2025-06-15',
        'Órgão Regulador': 'ANAC',
        'Status de Adoção': 'Vigente',
        'Observações': 'Critérios de liberação de aeronaves após serviço de manutenção'
      },
      {
        'Código da Norma / Regulamento': 'IS 145-009',
        'Título da Documentação Normativa': 'Procedimentos para Homologação de Ferramental Equivalente',
        'Categoria Normativa': 'Instrução Suplementar',
        'Revisão / Emenda Vigente': 'Rev. B',
        'Data da Revisão / Emenda': '12/04/2025',
        'Órgão Regulador': 'ANAC',
        'Status de Adoção': 'Vigente',
        'Observações': 'Requisitos de rastreabilidade RBC e equivalência metrológica'
      },
      {
        'Código da Norma / Regulamento': 'IS 145-010',
        'Título da Documentação Normativa': 'Qualificação e Autorização de Pessoal de Manutenção e Vistoria',
        'Categoria Normativa': 'Instrução Suplementar',
        'Revisão / Emenda Vigente': 'Rev. 01',
        'Data da Revisão / Emenda': '2024-10-01',
        'Órgão Regulador': 'ANAC',
        'Status de Adoção': 'STATUS_NAO_INFORMADO',
        'Observações': 'Aguardando homologação de nova revisão complementar pela diretoria'
      }
    ]
  },
  {
    id: 'amostra-documental-real',
    nomeArquivo: 'Master_List_Documental_Rev_2026.xlsx',
    formato: 'XLSX',
    tipoEsperado: 'CONTROLE_DOCUMENTAL',
    descricaoCenario: 'Lista Mestra (Master List) de Manuais, Procedimentos Operacionais e Especificações Técnicas de Manutenção.',
    destaqueTeste: 'TESTE 3: Importação de documentos controlados, controle de revisões vigentes e rastreabilidade temporal.',
    colunas: ['Código do Documento', 'Título Oficial', 'Tipo / Categoria', 'Revisão Vigente', 'Data de Aprovação', 'Data Próxima Revisão', 'Responsável Elaboração', 'Status Vigência', 'Observações'],
    linhasAmostra: [
      {
        'Código do Documento': 'MPO-04',
        'Título Oficial': 'Manual de Procedimentos da Oficina de Aviônica e Baterias',
        'Tipo / Categoria': 'Procedimento Técnico',
        'Revisão Vigente': 'Rev. 05',
        'Data de Aprovação': '2025-11-30',
        'Data Próxima Revisão': '2026-11-30',
        'Responsável Elaboração': 'Eng. Marcos Vinícius Santos',
        'Status Vigência': 'Vigente',
        'Observações': 'Atualizado com novas bancadas de teste de baterias Ni-Cd.'
      },
      {
        'Código do Documento': 'IT-MNT-12',
        'Título Oficial': 'Instrução de Trabalho: Torqueamento e Frenagem com Arame Inox',
        'Tipo / Categoria': 'Instrução de Trabalho',
        'Revisão Vigente': 'Rev. 02',
        'Data de Aprovação': '2026-01-10',
        'Data Próxima Revisão': '2027-01-10',
        'Responsável Elaboração': 'Inspetora Juliana Ramos',
        'Status Vigência': 'Vigente',
        'Observações': 'Baseado na AC 43.13-1B Capítulo 7.'
      },
      {
        'Código do Documento': 'SGQ-FOR-08',
        'Título Oficial': 'Formulário de Controle de Empréstimo e Quarentena de Ferramental',
        'Tipo / Categoria': 'Formulário SGQ',
        'Revisão Vigente': 'Rev. 01',
        'Data de Aprovação': '2024-06-15',
        'Data Próxima Revisão': '2026-06-15',
        'Responsável Elaboração': 'Coordenação da Qualidade',
        'Status Vigência': 'Revisão Pendente',
        'Observações': 'Necessita alinhamento com a FASE 14 de importação digital.'
      }
    ]
  },
  {
    id: 'amostra-generica-ia',
    nomeArquivo: 'Controle_Geral_Qualidade.xlsx',
    formato: 'XLSX',
    tipoEsperado: 'TREINAMENTOS',
    descricaoCenario: 'Arquivo com nome completamente neutro e desprovido da palavra "treinamento", para testar se a IA analisa o conteúdo real das colunas e linhas.',
    destaqueTeste: 'TESTE 4 / REQUISITO 8: IA identifica o controle a partir do conteúdo interno e não do nome do arquivo!',
    colunas: ['Colaborador', 'Registro Funcional', 'Módulo de Capacitação', 'Conclusão', 'Expiração', 'Instrutor', 'Status'],
    linhasAmostra: [
      {
        'Colaborador': 'Fernando Henrique Dias',
        'Registro Funcional': 'MAT-8841',
        'Módulo de Capacitação': 'Procedimentos RII (Required Inspection Items) Boeing 767',
        'Conclusão': '2025-07-14',
        'Expiração': '2027-07-14',
        'Instrutor': 'Inspetor Chefe EASA',
        'Status': 'Apto'
      },
      {
        'Colaborador': 'Aline Ferreira Costa',
        'Registro Funcional': 'MAT-9902',
        'Módulo de Capacitação': 'Inspeção Visual e Boroscopia em Motores CF6-80C2',
        'Conclusão': '2025-09-22',
        'Expiração': '2027-09-22',
        'Instrutor': 'CFM / GE Certified Specialist',
        'Status': 'Apto'
      }
    ]
  },
  {
    id: 'amostra-duplicidades-conflitos',
    nomeArquivo: 'Metrologia_Bancada_Atualizada_Com_Conflitos.xlsx',
    formato: 'XLSX',
    tipoEsperado: 'CALIBRACAO_FERRAMENTAL',
    descricaoCenario: 'Planilha contendo o Torquímetro TQ-023 (que já existe no sistema com outro vencimento) e novas ferramentas, para validar as 4 opções de conflito.',
    destaqueTeste: 'TESTE 6 & 7 / REQUISITO 4: Detecção precisa de duplicidade com opções Atualizar, Manter, Criar Novo ou Ignorar.',
    colunas: ['Patrimônio', 'Instrumento', 'Fabricante', 'Série', 'Data Calibração', 'Validade', 'Certificado', 'Status'],
    linhasAmostra: [
      {
        'Patrimônio': 'TQ-023',
        'Instrumento': 'Torquímetro de Estalo 20-100 Nm (Nova Calibração Realizada)',
        'Fabricante': 'Stahlwille',
        'Série': 'SN-44102-ST',
        'Data Calibração': '2026-09-10',
        'Validade': '2027-09-10',
        'Certificado': 'CERT-RBC-99881/2026',
        'Status': 'Calibrada'
      },
      {
        'Patrimônio': 'TQ-077',
        'Instrumento': 'Torquímetro Angular Eletrônico 10-200 Nm',
        'Fabricante': 'Stahlwille',
        'Série': 'SN-ANG-7740',
        'Data Calibração': '2026-08-01',
        'Validade': '2027-08-01',
        'Certificado': 'CERT-RBC-99014/2026',
        'Status': 'Calibrada'
      }
    ]
  },
  {
    id: 'amostra-com-erros-validacao',
    nomeArquivo: 'Importacao_Com_Erros_Campos_Vazios.csv',
    formato: 'CSV',
    tipoEsperado: 'TREINAMENTOS',
    descricaoCenario: 'Arquivo contendo erros críticos propositais: linha sem nome de funcionário, data inválida (31/02/2026) e curso sem identificação.',
    destaqueTeste: 'TESTE 5 & 8: Classificação visual em 🟢 OK, 🟡 Atenção e 🔴 Erro com bloqueio seletivo de linhas corrompidas.',
    colunas: ['Pessoa', 'Curso', 'Data', 'Validade', 'Certificado'],
    linhasAmostra: [
      {
        'Pessoa': 'Lucas Menezes Barbosa',
        'Curso': 'Segurança em Plataformas Elevatórias (NR-35)',
        'Data': '2025-10-10',
        'Validade': '2027-10-10',
        'Certificado': 'CERT-NR35-881'
      },
      {
        'Pessoa': '',
        'Curso': 'EWIS Target Group 4',
        'Data': '2025-05-15',
        'Validade': '2027-05-15',
        'Certificado': 'CERT-EWIS-44'
      },
      {
        'Pessoa': 'Carla Pires Mendes',
        'Curso': 'Fatores Humanos MRO',
        'Data': '31/02/2026',
        'Validade': '31/02/2028',
        'Certificado': 'CERT-FH-00'
      },
      {
        'Pessoa': 'Tiago Rocha Viana',
        'Curso': '',
        'Data': '2025-01-10',
        'Validade': '2026-01-10',
        'Certificado': 'SEM-NOME'
      }
    ]
  },
  {
    id: 'amostra-docx-procedimento',
    nomeArquivo: 'Relatorio_Treinamento_Oficina_Motor.docx',
    formato: 'DOCX',
    tipoEsperado: 'TREINAMENTOS',
    descricaoCenario: 'Documento do Microsoft Word (.docx) contendo ata de treinamento e lista tabular de participantes em manutenção preventiva de turbinas.',
    destaqueTeste: 'TESTE 9: Suporte a arquivos Microsoft Word (.docx) via extração estruturada de tabelas e metadados.',
    colunas: ['Nome Participante', 'Matrícula', 'Treinamento Realizado', 'Data', 'Carga Horária', 'Instrutor Responsável'],
    linhasAmostra: [
      {
        'Nome Participante': 'Rafael Gomes Bezerra',
        'Matrícula': 'MEC-9931',
        'Treinamento Realizado': 'Inspeção Boroscópica em Compressores Axiais CF6-80C2',
        'Data': '2026-02-14',
        'Carga Horária': '20h',
        'Instrutor Responsável': 'Eng. Carlos Andrade'
      },
      {
        'Nome Participante': 'Juliana Ramos Albuquerque',
        'Matrícula': 'INS-2019',
        'Treinamento Realizado': 'Inspeção Boroscópica em Compressores Axiais CF6-80C2',
        'Data': '2026-02-14',
        'Carga Horária': '20h',
        'Instrutor Responsável': 'Eng. Carlos Andrade'
      }
    ]
  },
  {
    id: 'amostra-pdf-metrologia',
    nomeArquivo: 'Certificados_Afericao_Metrologica_Lote_14.pdf',
    formato: 'PDF',
    tipoEsperado: 'CALIBRACAO_FERRAMENTAL',
    descricaoCenario: 'Relatório PDF com tabela de instrumentos aferidos pelo Laboratório Metrológico da Base REC.',
    destaqueTeste: 'TESTE 9 / PDF: Suporte a arquivos PDF contendo tabelas metrológicas e certificados rastreáveis.',
    colunas: ['Instrumento', 'Patrimônio', 'Nº Série', 'Calibração', 'Validade', 'Laboratório RBC', 'Certificado'],
    linhasAmostra: [
      {
        'Instrumento': 'Torquímetro de Estalo 100-500 Nm',
        'Patrimônio': 'TQ-108',
        'Nº Série': 'SN-GED-99881',
        'Calibração': '2026-02-28',
        'Validade': '2027-02-28',
        'Laboratório RBC': 'LabMetrologia RBC C-0412',
        'Certificado': 'CERT-RBC-94412/2026'
      },
      {
        'Instrumento': 'Manômetro Digital de Alta Pressão Nitrogênio',
        'Patrimônio': 'MAN-033',
        'Nº Série': 'SN-N2-0041',
        'Calibração': '2026-03-01',
        'Validade': '2027-03-01',
        'Laboratório RBC': 'LabMetrologia RBC C-0412',
        'Certificado': 'CERT-RBC-94413/2026'
      }
    ]
  }
];
