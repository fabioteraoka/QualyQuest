import * as XLSX from 'xlsx';
import { separarNumeroEDataRevisao } from '../data/f001021ControlledPublications';
import {
  TipoControleImportacao,
  MapeamentoCampoItem,
  RegistroLinhaImportacao,
  ResumoPreviaImportacao,
  OportunidadeMelhoriaImportacao,
  TemplateMapeamentoAprovado,
  FerramentaCalibracao,
  ColaboradorPessoa,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  DocumentoControlado,
  CampoDivergente,
  ClassificacaoReconciliacao,
  DecisaoReconciliacao,
  AcaoConflitoDuplicidade,
  StatusColaborador,
} from '../types';

export interface ResultadoNormalizacaoStatusColaborador {
  status: StatusColaborador;
  statusOriginal: string;
  informado: boolean;
  statusNaoInformado: boolean;
  aviso?: string;
}

export function normalizarStatusColaboradorCompleto(valor: any): ResultadoNormalizacaoStatusColaborador {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return {
      status: 'STATUS_NAO_INFORMADO',
      statusOriginal: '',
      informado: false,
      statusNaoInformado: true,
      aviso: 'STATUS NÃO INFORMADO no cadastro/planilha — Requer classificação operacional (proibido presumir ATIVO).',
    };
  }

  const raw = String(valor).trim();
  const str = raw.toUpperCase();

  if (
    str === 'STATUS_NAO_INFORMADO' ||
    str === 'NAO_INFORMADO' ||
    str === 'NÃO INFORMADO' ||
    str === 'NAO INFORMADO' ||
    str === 'SEM STATUS' ||
    str === 'SEM_STATUS' ||
    str === 'PENDENTE' ||
    str === 'A DEFINIR' ||
    str === 'INDEFINIDO'
  ) {
    return {
      status: 'STATUS_NAO_INFORMADO',
      statusOriginal: raw,
      informado: false,
      statusNaoInformado: true,
      aviso: 'Status não informado no cadastro original.',
    };
  }

  if (
    str.includes('TREINAMENTO') || 
    str.includes('TRAINEE') || 
    str.includes('ESTAGI') || 
    str.includes('APRENDIZ') || 
    str.includes('FORMACAO')
  ) {
    return { status: 'EM_TREINAMENTO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }
  if (str.includes('AFAST') || str.includes('LICEN') || str.includes('INSS') || str.includes('MEDIC')) {
    return { status: 'AFASTADO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }
  if (str.includes('SUSP') || str.includes('BLOQUE')) {
    return { status: 'SUSPENSO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }
  if (str.includes('RESTRIT') || str.includes('LIMIT')) {
    return { status: 'RESTRITO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }
  if (str.includes('DESLIG') || str.includes('DEMIT') || str.includes('RESCIS') || str.includes('EX-') || str.includes('SAIDA')) {
    return { status: 'DESLIGADO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }
  if (str.includes('INATIV') || str === 'OFF' || str === 'NAO' || str === 'N' || str === '0') {
    return { status: 'INATIVO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }
  if (str.includes('ATIV') || str === 'SIM' || str === 'S' || str === 'OK' || str === '1' || str === 'OPERACIONAL') {
    return { status: 'ATIVO', statusOriginal: raw, informado: true, statusNaoInformado: false };
  }

  return {
    status: 'OUTRO',
    statusOriginal: raw,
    informado: true,
    statusNaoInformado: false,
    aviso: `Status operacional com terminologia específica: "${raw}". Registrado como OUTRO para validação.`,
  };
}

export function normalizarStatusColaborador(valor: any): StatusColaborador {
  const res = normalizarStatusColaboradorCompleto(valor);
  return res.status;
}

// ============================================================================
// DICIONÁRIOS SEMÂNTICOS DE MAPEAMENTO DE CAMPOS QUALIGEST
// ============================================================================

export interface DefinicaoCampoQualigest {
  campo: string;
  label: string;
  tipo: 'string' | 'date' | 'number' | 'boolean' | 'enum';
  obrigatorio: boolean;
  sinonimos: string[];
  descricao: string;
}

export const ESQUEMA_CAMPOS_CONTROLE: Record<TipoControleImportacao, DefinicaoCampoQualigest[]> = {
  TREINAMENTOS: [
    {
      campo: 'pessoaNome',
      label: 'Nome do Colaborador / Pessoa',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['funcionario', 'colaborador', 'pessoa', 'nome', 'tecnico', 'mecanico', 'inspetor', 'participante', 'aluno', 'empregado'],
      descricao: 'Nome completo da pessoa ou colaborador da organização',
    },
    {
      campo: 'pessoaMatricula',
      label: 'Matrícula / ID Funcional',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['matricula', 'id', 'registro', 're', 'codigo', 'matr', 'cracha'],
      descricao: 'Identificador funcional único da pessoa na empresa',
    },
    {
      campo: 'funcao',
      label: 'Função / Especialidade',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['funcao', 'cargo', 'especialidade', 'ocupacao', 'qualificacao'],
      descricao: 'Cargo técnico (ex: Mecânico CHT, Inspetor NDT, Técnico Aviônica)',
    },
    {
      campo: 'setor',
      label: 'Setor / Departamento / Base',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['setor', 'departamento', 'area', 'base', 'lotacao', 'oficina', 'secao', 'hangar'],
      descricao: 'Setor ou base operacional onde o colaborador atua (ex: Manutenção de Linha, Qualidade)',
    },
    {
      campo: 'statusColaborador',
      label: 'Status do Colaborador (Ativo/Inativo/Afastado/Restrito)',
      tipo: 'enum',
      obrigatorio: false,
      sinonimos: ['status colaborador', 'status funcionario', 'ativo', 'ativo/inativo', 'situacao cadastral', 'condicao funcionario', 'vinculo', 'estado colaborador', 'status'],
      descricao: 'Situação cadastral real da pessoa (Ativo, Inativo, Afastado, Suspenso, Restrito)',
    },
    {
      campo: 'cursoTitulo',
      label: 'Título do Treinamento / Curso',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['curso', 'treinamento', 'capacitacao', 'modulo', 'titulo', 'nome curso', 'disciplina', 'especializacao'],
      descricao: 'Nome ou título do curso aeronáutico (ex: EWIS, FTS, Fatores Humanos)',
    },
    {
      campo: 'dataRealizacao',
      label: 'Data de Realização',
      tipo: 'date',
      obrigatorio: false,
      sinonimos: ['data', 'data realizacao', 'data curso', 'conclusao', 'data termino', 'realizado em', 'data inicio', 'concluido'],
      descricao: 'Data em que o colaborador concluiu o treinamento',
    },
    {
      campo: 'dataValidade',
      label: 'Data de Validade / Expiração',
      tipo: 'date',
      obrigatorio: false,
      sinonimos: ['validade', 'data validade', 'expiracao', 'vencimento', 'proximo vencimento', 'valido ate'],
      descricao: 'Prazo limite da capacitação antes da reciclagem mandatória',
    },
    {
      campo: 'cargaHoraria',
      label: 'Carga Horária (Horas)',
      tipo: 'number',
      obrigatorio: false,
      sinonimos: ['carga horaria', 'horas', 'ch', 'duracao', 'tempo', 'h'],
      descricao: 'Duração em horas do treinamento ministrado',
    },
    {
      campo: 'entidadeInstrutora',
      label: 'Entidade / Instrutor',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['entidade', 'instrutor', 'instituicao', 'empresa instrutora', 'escola', 'fornecedor'],
      descricao: 'Nome da instituição ou instrutor homologado que ministrou o treinamento',
    },
    {
      campo: 'numeroCertificado',
      label: 'Nº do Certificado / Registro',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['certificado', 'numero certificado', 'registro', 'n certificado', 'comprovante', 'doc', 'evidencia'],
      descricao: 'Número ou identificador formal do certificado/evidência emitido',
    },
    {
      campo: 'chtNumero',
      label: 'Nº da CHT / Licença ANAC / CANAC',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['cht', 'canac', 'licenca', 'anac', 'numero cht', 'nr cht', 'licenca anac', 'habilitacao', 'cht/canac'],
      descricao: 'Número da Carteira de Habilitação Técnica ou código ANAC do colaborador',
    },
    {
      campo: 'chtValidade',
      label: 'Validade da CHT / Licença',
      tipo: 'date',
      obrigatorio: false,
      sinonimos: ['validade cht', 'vencimento cht', 'cht validade', 'data cht', 'expiracao cht', 'validade licenca'],
      descricao: 'Data de validade da habilitação técnica / CHT aeronáutica',
    },
    {
      campo: 'chtCategoria',
      label: 'Categoria / Especialidade CHT (CEL / GMP / AVI)',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['categoria cht', 'celula', 'habilitacao cht', 'especialidade cht', 'gmp', 'cel', 'avi', 'ramo'],
      descricao: 'Habilitações técnicas homologadas ANAC (Célula, Grupo Moto-Propulsor ou Aviônicos)',
    },
    {
      campo: 'situacao',
      label: 'Situação / Status',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['situacao', 'status', 'estado', 'condicao', 'aprovado'],
      descricao: 'Status da capacitação (Válido, Vencido, Em Andamento)',
    },
  ],

  CALIBRACAO_FERRAMENTAL: [
    {
      campo: 'codigoPatrimonio',
      label: 'Código de Patrimônio / Tag',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: [
        'patrimonio',
        'codigo',
        'tag',
        'id',
        'identificacao',
        'num patrimonio',
        'cod ferramenta',
        'ferramenta',
        'codigo da ferramenta',
        'n patrimonio',
        'nº patrimonio',
        'no patrimonio',
        'ativo',
        'n ativo',
        'nr patrimonio',
        'tombo',
        'cod',
        'item id',
        'tag id',
      ],
      descricao: 'Identificador único da ferramenta na oficina (ex: TQ-023, MULT-004)',
    },
    {
      campo: 'descricao',
      label: 'Descrição do Instrumento',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: [
        'descricao',
        'instrumento',
        'ferramenta',
        'equipamento',
        'nome',
        'item',
        'tipo',
        'especificacao',
        'denominacao',
        'discriminacao',
        'aparelho',
        'nome da ferramenta',
        'descricao da ferramenta',
      ],
      descricao: 'Nome técnico e faixa de medição do instrumento (ex: Torquímetro de Estalo 20-100 Nm)',
    },
    {
      campo: 'fabricante',
      label: 'Fabricante',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['fabricante', 'marca', 'fornecedor', 'manufaturador', 'mfr', 'brand'],
      descricao: 'Fabricante original do instrumento (ex: Stahlwille, Snap-on, Fluke, Mitutoyo)',
    },
    {
      campo: 'modelo',
      label: 'Modelo',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['modelo', 'part number', 'pn', 'tipo modelo', 'p/n', 'mod'],
      descricao: 'Modelo comercial ou part number do instrumento',
    },
    {
      campo: 'numeroSerie',
      label: 'Número de Série (S/N)',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: [
        'serie',
        'numero de serie',
        'sn',
        's/n',
        'serial',
        'nr serie',
        'n serie',
        'nº serie',
        'no serie',
        'serial number',
        'n. serie',
      ],
      descricao: 'Número de série gravado no instrumento para rastreabilidade metrológica',
    },
    {
      campo: 'setor',
      label: 'Setor / Oficina Alocada',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['setor', 'oficina', 'local', 'localizacao', 'area', 'base', 'hangar', 'departamento', 'custodia', 'responsavel'],
      descricao: 'Setor operacional onde a ferramenta é utilizada ou custodiada',
    },
    {
      campo: 'dataUltimaCalibracao',
      label: 'Data da Última Calibração',
      tipo: 'date',
      obrigatorio: false,
      sinonimos: [
        'ultima calibracao',
        'data calibracao',
        'calibrado em',
        'data afericao',
        'afericao',
        'dt calibracao',
        'data da calibracao',
        'ult calibracao',
        'data ult calib',
        'dt calib',
      ],
      descricao: 'Data em que o instrumento foi aferido pelo laboratório credenciado',
    },
    {
      campo: 'dataProximaCalibracao',
      label: 'Data da Próxima Calibração (Validade)',
      tipo: 'date',
      obrigatorio: true,
      sinonimos: [
        'proxima calibracao',
        'validade',
        'vencimento',
        'validade calibracao',
        'expiracao',
        'dt validade',
        'dt vencimento',
        'prox calibracao',
        'proxima afericao',
        'vencimento calibracao',
        'calibrar ate',
        'data vencto',
        'vencimento da calibracao',
        'proximo vencimento',
      ],
      descricao: 'Data limite após a qual o uso do instrumento é terminantemente proibido sem nova calibração',
    },
    {
      campo: 'frequenciaMeses',
      label: 'Frequência (Meses)',
      tipo: 'number',
      obrigatorio: false,
      sinonimos: ['frequencia', 'periodicidade', 'intervalo', 'meses', 'ciclo'],
      descricao: 'Periodicidade em meses entre as calibrações formais',
    },
    {
      campo: 'laboratorioCalibrador',
      label: 'Laboratório Calibrador RBC',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['laboratorio', 'calibrador', 'entidade rbc', 'lab', 'laboratorio acreditado', 'fornecedor', 'entidade calibradora', 'empresa calibradora', 'laboratorio credenciado'],
      descricao: 'Laboratório credenciado pela Rede Brasileira de Calibração (RBC/Inmetro/NIST)',
    },
    {
      campo: 'numeroCertificado',
      label: 'Nº do Certificado de Calibração',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: [
        'certificado',
        'numero certificado',
        'nr cert',
        'laudo',
        'relatorio calibracao',
        'n certificado',
        'nº certificado',
        'no certificado',
        'cert rbc',
        'certificado de calibracao',
        'cert',
        'num certificado',
      ],
      descricao: 'Número oficial do certificado emitido pelo laboratório credenciado',
    },
    {
      campo: 'situacao',
      label: 'Status Operacional',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['situacao', 'status', 'condicao', 'estado'],
      descricao: 'Status da ferramenta (Calibrada, Vencida, Quarentena, etc.)',
    },
    {
      campo: 'observacoes',
      label: 'Observações / Tolerâncias',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['observacoes', 'tolerancia', 'obs', 'notas', 'criterio'],
      descricao: 'Limites de tolerância de erro permissíveis e restrições de uso',
    },
  ],

  CONTROLE_DOCUMENTAL: [
    {
      campo: 'codigo',
      label: 'Publicação / Código do Documento',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: [
        'publicacao',
        'publicação',
        'publicacao tecnica',
        'publicação técnica',
        'publicacoes tecnicas',
        'publicações técnicas',
        'codigo',
        'codigo documento',
        'codigo do documento',
        'codigo da norma',
        'codigo da norma / regulamento',
        'norma',
        'regulamento',
        'numero',
        'identificador',
        'doc id',
        'cod',
        'manual',
        'publicacao / manual',
        'sigla',
      ],
      descricao: 'Identificador formal da publicação ou manual técnico (ex: MOMQ, PTM, AMM, RBAC 145, IS 145-001, F 001-02-1)',
    },
    {
      campo: 'titulo',
      label: 'Título Oficial / Título da Publicação',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: [
        'titulo',
        'titulo da publicacao',
        'titulo da publicação',
        'titulo oficial',
        'titulo da documentacao normativa',
        'nome documento',
        'descricao',
        'denominacao',
        'documento',
        'publicacao titulo',
        'titulo do manual',
      ],
      descricao: 'Nome por extenso do manual, publicação técnica, instrução de trabalho ou regulamento aeronáutico',
    },
    {
      campo: 'tipoDocumento',
      label: 'Tipo / Categoria Documental',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['tipo', 'categoria', 'categoria normativa', 'classificacao', 'natureza', 'tipo / categoria'],
      descricao: 'Categoria documental (Manual da Qualidade, Procedimento Operacional, Legislação Aeronáutica, Formulário, IT)',
    },
    {
      campo: 'numeroRevisao',
      label: 'Número da Revisão (Em que revisão está)',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: [
        'numero da revisao',
        'número da revisão',
        'em que revisao esta',
        'em que revisão está',
        'numero revisao',
        'revisao vigente',
        'revisao / emenda vigente',
        'revisao',
        'revisão',
        'rev',
        'emenda',
        'revisao atual',
        'versao',
        'edicao',
        'em que revisao',
      ],
      descricao: 'Em que revisão está a publicação (ex: Rev. 08, Rev. 02, Rev. D, Rev. 15, Emenda 07, 00, N/A)',
    },
    {
      campo: 'dataAprovacao',
      label: 'Data da Revisão / Aprovação',
      tipo: 'date',
      obrigatorio: true,
      sinonimos: [
        'data da revisao',
        'data da revisão',
        'data revisao',
        'data da revisao / emenda',
        'data aprovacao',
        'data de aprovacao',
        'data vigencia',
        'vigente desde',
        'aprovado em',
        'data',
        'data de revisao',
      ],
      descricao: 'Data de vigência da revisão da publicação (aceita formatos DD/MM/YYYY, DD/Mês/YYYY como 06/Ago/2026, e YYYY-MM-DD)',
    },
    {
      campo: 'dataProximaRevisao',
      label: 'Data da Próxima Revisão',
      tipo: 'date',
      obrigatorio: false,
      sinonimos: ['proxima revisao', 'data proxima revisao', 'validade', 'vencimento', 'revisao prevista', 'expiracao'],
      descricao: 'Data limite para revisão periódica obrigatória',
    },
    {
      campo: 'responsavel',
      label: 'Proprietário / Cessor / Elaborador',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: [
        'proprietario / cessor',
        'proprietario/cessor',
        'proprietario ou cessor',
        'proprietario ou cessor do manual',
        'proprietario',
        'proprietário',
        'cessor',
        'proprietario cessor',
        'emissor',
        'fabricante',
        'operador',
        'responsavel',
        'responsavel elaboracao',
        'orgao regulador',
        'elaborador',
        'autor',
        'aprovador',
        'gestor',
        'orgao emissor',
      ],
      descricao: 'Proprietário ou cessor do manual / entidade emissora (ex: IMPACTO, ANAC, BOEING, AIRBUS, KALITTA, FAA)',
    },
    {
      campo: 'numeroEDataRevisao',
      label: 'Número e Data da Revisão (Coluna Original)',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: [
        'numero e data da revisao',
        'número e data da revisão',
        'numero e data de revisao',
        'revisao e data',
        'revisão e data',
        'rev e data',
        'revisao/data',
      ],
      descricao: 'Coluna combinada original do formulário, desdobrada pela IA em Número da Revisão e Data da Revisão',
    },
    {
      campo: 'status',
      label: 'Status do Documento',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['status', 'status de adocao', 'situacao', 'vigencia', 'estado'],
      descricao: 'Condição do documento (Vigente, Em Revisão, STATUS_NAO_INFORMADO, Obsoleto, Cancelado)',
    },
    {
      campo: 'observacoes',
      label: 'Observações / Resumo das Alterações',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['observacoes', 'resumo', 'alteracoes', 'obs', 'historico'],
      descricao: 'Notas explicativas e histórico de modificações da revisão',
    },
  ],

  NAO_CONFORMIDADES: [
    {
      campo: 'numeroRNC',
      label: 'Número da RNC',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['numero rnc', 'rnc', 'numero', 'codigo rnc', 'registro'],
      descricao: 'Identificador no padrão RNC F 001-29',
    },
    {
      campo: 'descricaoDesvio',
      label: 'Descrição do Desvio / Fato Constatado',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['descricao', 'desvio', 'fato', 'problema', 'nao conformidade', 'detalhe'],
      descricao: 'Relato objetivo da não conformidade detectada',
    },
    {
      campo: 'setor',
      label: 'Setor Notificado',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['setor', 'area', 'departamento', 'oficina'],
      descricao: 'Setor onde o desvio ocorreu ou foi identificado',
    },
    {
      campo: 'dataIdentificacao',
      label: 'Data de Identificação',
      tipo: 'date',
      obrigatorio: true,
      sinonimos: ['data identificacao', 'data abertura', 'aberto em', 'data'],
      descricao: 'Data da constatação da RNC',
    },
  ],

  REQUISITOS_CLIENTES: [
    {
      campo: 'codigoRequisito',
      label: 'Código do Requisito',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['codigo', 'item', 'requisito', 'num requisito', 'id'],
      descricao: 'Código do item de auditoria do cliente (ex: ATLAS-04.01, KALITTA-QA-02)',
    },
    {
      campo: 'descricao',
      label: 'Texto do Requisito',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['descricao', 'texto', 'requisito texto', 'especificacao', 'clausula'],
      descricao: 'Enunciado do requisito contratual ou de qualidade do cliente',
    },
    {
      campo: 'clienteNome',
      label: 'Nome do Cliente',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['cliente', 'operador', 'empresa', 'cliente externo'],
      descricao: 'Nome da companhia aérea ou cliente (ex: Atlas Air, Kalitta Air)',
    },
  ],

  OUTROS: [
    {
      campo: 'item',
      label: 'Identificação / Item',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['item', 'identificacao', 'nome', 'codigo'],
      descricao: 'Identificador genérico do controle',
    },
    {
      campo: 'descricao',
      label: 'Descrição do Registro',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['descricao', 'detalhe', 'observacao', 'texto'],
      descricao: 'Informações detalhadas do registro',
    },
  ],
};

// ============================================================================
// FUNÇÕES DE HASH SHA-256 E UTILITÁRIOS
// ============================================================================

export async function calcularHashSha256(dados: Uint8Array | string): Promise<string> {
  try {
    const buffer = typeof dados === 'string' 
      ? new TextEncoder().encode(dados) 
      : (dados.buffer instanceof ArrayBuffer ? dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength) : dados);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('Fallback hash SHA-256:', err);
  }

  // Fallback FNV-1a / Murmur estilo para preview se SubtleCrypto não estiver disponível
  let h = 0x811c9dc5;
  const str = typeof dados === 'string' ? dados : new TextDecoder().decode(dados.slice(0, 10000));
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return 'sha256-sim-' + (h >>> 0).toString(16).padStart(8, '0') + '-' + Date.now().toString(16);
}

function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// IDENTIFICAÇÃO AUTOMÁTICA DE CONTROLES (HEURÍSTICA & CONTEÚDO)
// ============================================================================

export interface ResultadoIdentificacaoControle {
  tipoControle: TipoControleImportacao;
  confianca: number; // 0 a 100
  finalidadeProvavel: string;
  pontuacoes: Record<TipoControleImportacao, number>;
  explicacao: string;
}

export function identificarTipoControleAutomatico(
  nomeArquivo: string,
  colunas: string[],
  amostraLinhas: Record<string, any>[] = []
): ResultadoIdentificacaoControle {
  const pontuacoes: Record<TipoControleImportacao, number> = {
    TREINAMENTOS: 0,
    CALIBRACAO_FERRAMENTAL: 0,
    CONTROLE_DOCUMENTAL: 0,
    NAO_CONFORMIDADES: 0,
    REQUISITOS_CLIENTES: 0,
    OUTROS: 5,
  };

  const nomeNorm = normalizarTexto(nomeArquivo);
  const colunasNorm = colunas.map((c) => normalizarTexto(c));
  
  // Amostra de texto dos valores das 5 primeiras linhas
  const valoresAmostraTexto = normalizarTexto(
    amostraLinhas
      .slice(0, 5)
      .map((l) => Object.values(l).join(' '))
      .join(' ')
  );

  // 1. Scoring para TREINAMENTOS
  const palavrasTreinamentoColunas = ['funcionario', 'colaborador', 'pessoa', 'curso', 'treinamento', 'capacitacao', 'matricula', 'instrutor', 'realizacao', 'cht', 'horas', 'ch'];
  const palavrasTreinamentoValores = ['ewis', 'fts', 'fatores humanos', 'combate a incendio', 'primeiros socorros', 'sgso', 'sms', 'boeing', 'airbus', 'motor', 'boroscopia', 'mecanico', 'inspetor'];
  
  palavrasTreinamentoColunas.forEach((p) => {
    if (colunasNorm.some((c) => c.includes(p))) pontuacoes.TREINAMENTOS += 15;
  });
  palavrasTreinamentoValores.forEach((p) => {
    if (valoresAmostraTexto.includes(p)) pontuacoes.TREINAMENTOS += 10;
  });
  if (nomeNorm.includes('treinament') || nomeNorm.includes('capacita') || nomeNorm.includes('curso') || nomeNorm.includes('cht')) {
    pontuacoes.TREINAMENTOS += 20;
  }

  // 2. Scoring para CALIBRAÇÃO / FERRAMENTAL
  const palavrasCalibracaoColunas = ['patrimonio', 'ferramenta', 'instrumento', 'calibracao', 'afericao', 'torquimetro', 'multimetro', 'manometro', 'serie', 'tolerancia', 'rbc', 'laboratorio', 'paquimetro', 'micrometro'];
  const palavrasCalibracaoValores = ['stahlwille', 'snap on', 'fluke', 'mitutoyo', 'gedore', 'wika', 'cert rbc', 'labmetrologia', 'inmetro', 'nist', 'nm', 'psi', 'bar', 'aferido', 'quarentena'];

  palavrasCalibracaoColunas.forEach((p) => {
    if (colunasNorm.some((c) => c.includes(p))) pontuacoes.CALIBRACAO_FERRAMENTAL += 15;
  });
  palavrasCalibracaoValores.forEach((p) => {
    if (valoresAmostraTexto.includes(p)) pontuacoes.CALIBRACAO_FERRAMENTAL += 10;
  });
  if (nomeNorm.includes('calibr') || nomeNorm.includes('metrolog') || nomeNorm.includes('ferrament') || nomeNorm.includes('instrument')) {
    pontuacoes.CALIBRACAO_FERRAMENTAL += 20;
  }

  // 3. Scoring para CONTROLE DOCUMENTAL
  const palavrasDocColunas = [
    'documento',
    'revisao',
    'rev',
    'vigencia',
    'aprovacao',
    'codigo doc',
    'norma',
    'regulamento',
    'emenda',
    'manual',
    'procedimento',
    'instrucao',
    'master list',
    'elaborador',
    'publicacao',
    'proprietario',
    'cessor',
    'numero e data',
  ];
  const palavrasDocValores = ['momq', 'mpo', 'sgq', 'it mnt', 'rbac', 'anac', 'instrucao suplementar', 'procedimento operacional', 'rev 0', 'rev 1', 'vigente', 'obsoleto', 'aprovado', 'ago 26'];

  palavrasDocColunas.forEach((p) => {
    if (colunasNorm.some((c) => c.includes(p))) pontuacoes.CONTROLE_DOCUMENTAL += 15;
  });
  palavrasDocValores.forEach((p) => {
    if (valoresAmostraTexto.includes(p)) pontuacoes.CONTROLE_DOCUMENTAL += 10;
  });
  if (
    nomeNorm.includes('docum') ||
    nomeNorm.includes('contole') ||
    nomeNorm.includes('controle') ||
    nomeNorm.includes('normativ') ||
    nomeNorm.includes('f 001') ||
    nomeNorm.includes('master') ||
    nomeNorm.includes('manual') ||
    nomeNorm.includes('procediment') ||
    nomeNorm.includes('publica')
  ) {
    pontuacoes.CONTROLE_DOCUMENTAL += 25;
  }

  // Detecção de Alta Prioridade: Estritamente Formulário F 001-02-1 com 4 colunas originais
  const isFormulario4ColunasNormativas =
    nomeNorm.includes('f 001-02-1') ||
    nomeNorm.includes('f001-02-1') ||
    (colunasNorm.length === 4 &&
      colunasNorm.some((c) => c.includes('publica')) &&
      colunasNorm.some((c) => c.includes('titulo')) &&
      colunasNorm.some((c) => c.includes('proprietario') || c.includes('cessor')) &&
      colunasNorm.some((c) => c.includes('numero e data') || c.includes('revisao e data') || c.includes('rev e data')));

  if (isFormulario4ColunasNormativas) {
    pontuacoes.CONTROLE_DOCUMENTAL += 150;
  } else if (colunasNorm.some((c) => c.includes('publica')) && colunasNorm.some((c) => c.includes('titulo'))) {
    pontuacoes.CONTROLE_DOCUMENTAL += 35;
  }

  // 4. Scoring para NÃO CONFORMIDADES
  if (colunasNorm.some((c) => c.includes('rnc') || c.includes('desvio') || c.includes('causa'))) pontuacoes.NAO_CONFORMIDADES += 30;
  if (nomeNorm.includes('rnc') || nomeNorm.includes('nao conformidade')) pontuacoes.NAO_CONFORMIDADES += 25;

  // 5. Scoring para REQUISITOS DE CLIENTES
  if (colunasNorm.some((c) => c.includes('requisito') || c.includes('cliente') || c.includes('checklist'))) pontuacoes.REQUISITOS_CLIENTES += 30;
  if (valoresAmostraTexto.includes('atlas') || valoresAmostraTexto.includes('kalitta')) pontuacoes.REQUISITOS_CLIENTES += 20;

  // Determinar vencedor
  let melhorTipo: TipoControleImportacao = 'OUTROS';
  let maiorPontos = 0;

  for (const tipo of Object.keys(pontuacoes) as TipoControleImportacao[]) {
    if (pontuacoes[tipo] > maiorPontos) {
      maiorPontos = pontuacoes[tipo];
      melhorTipo = tipo;
    }
  }

  // Calcular confiança percentual (limitada entre 65% e 99%)
  let confianca = 70;
  if (maiorPontos >= 60) confianca = 96;
  else if (maiorPontos >= 40) confianca = 91;
  else if (maiorPontos >= 20) confianca = 84;
  else confianca = 68;

  let finalidadeProvavel = 'Controle operacional interno com dados tabulares para migração no SGQ';
  let explicacao = 'Identificação realizada por análise semântica dos títulos de colunas e dados amostrais.';

  if (melhorTipo === 'TREINAMENTOS') {
    finalidadeProvavel = 'Controle e comprovação de qualificações, CHTs e treinamentos mandatórios aeronáuticos (RBAC 145 / EASA)';
    explicacao = `Colunas identificadas como registro de pessoas, cursos aeronáuticos e datas de validade com ${confianca}% de aderência.`;
  } else if (melhorTipo === 'CALIBRACAO_FERRAMENTAL') {
    finalidadeProvavel = 'Gestão metrológica de ferramentas especiais e instrumentos com rastreabilidade RBC/Inmetro (RBAC 145.109)';
    explicacao = `Identificados campos de patrimônio de ferramentas, datas de calibração, laboratório RBC e números de série com ${confianca}% de aderência.`;
  } else if (melhorTipo === 'CONTROLE_DOCUMENTAL') {
    if (isFormulario4ColunasNormativas) {
      confianca = 99;
      finalidadeProvavel =
        'Relatório de Controle de Documentações Normativas / Manuais Técnicos Controlados (Formulário com 4 colunas originais: Publicação, Título, Proprietário / Cessor e Número/Data da Revisão)';
      explicacao =
        'A IA identificou o formulário F 001-02-1 com 4 colunas: Publicação, Título da publicação, Proprietário ou Cessor do manual e Número e data da revisão combinados.';
    } else {
      finalidadeProvavel = 'Lista Mestra (Master List) de documentos controlados, manuais técnicos e histórico de revisões';
      explicacao = `Identificados campos de codificação de manuais/procedimentos, títulos, revisões e controle de vigência com ${confianca}% de aderência.`;
    }
  } else if (melhorTipo === 'NAO_CONFORMIDADES') {
    finalidadeProvavel = 'Registro histórico e tratativa de Não Conformidades (RNC F 001-29)';
    explicacao = `Identificadas colunas de desvios, ações corretivas e causas de qualidade.`;
  } else if (melhorTipo === 'REQUISITOS_CLIENTES') {
    finalidadeProvavel = 'Requisitos contratuais e auditorias de homologação de clientes aéreos';
    explicacao = `Identificadas colunas com requisitos de auditoria e operadores.`;
  }

  return {
    tipoControle: melhorTipo,
    confianca,
    finalidadeProvavel,
    pontuacoes,
    explicacao,
  };
}

// ============================================================================
// MAPEAMENTO AUTOMÁTICO DE COLUNAS (ALGORITMO 1-PARA-1 EXCLUSIVO)
// ============================================================================

export function gerarMapeamentoAutomaticoCampos(
  colunas: string[],
  tipoControle: TipoControleImportacao,
  amostraLinhas: Record<string, any>[] = []
): MapeamentoCampoItem[] {
  const definicoes = ESQUEMA_CAMPOS_CONTROLE[tipoControle] || ESQUEMA_CAMPOS_CONTROLE.OUTROS;

  // 1. Calcula a matriz de afinidade/score entre cada coluna e cada definição de campo
  interface ScoreCandidato {
    colunaOriginal: string;
    def: DefinicaoCampoQualigest;
    score: number;
    ehExato: boolean;
  }

  const candidatosPorColuna: Map<string, ScoreCandidato[]> = new Map();
  const todosCandidatos: ScoreCandidato[] = [];

  colunas.forEach((colunaOriginal) => {
    const colNorm = normalizarTexto(colunaOriginal);
    const listaCandidatos: ScoreCandidato[] = [];

    definicoes.forEach((def) => {
      let score = 0;
      let ehExato = false;
      const campoNorm = normalizarTexto(def.campo);
      const labelNorm = normalizarTexto(def.label);

      // Match exato com nome do campo técnico ou label
      if (colNorm === campoNorm || colNorm === labelNorm) {
        score = 100;
        ehExato = true;
      } else {
        // Verifica sinônimos
        for (const sinonimo of def.sinonimos) {
          const sinNorm = normalizarTexto(sinonimo);
          if (colNorm === sinNorm) {
            score = Math.max(score, 95);
            ehExato = true;
            break;
          } else if (
            colNorm.startsWith(sinNorm + ' ') ||
            colNorm.endsWith(' ' + sinNorm) ||
            colNorm.includes(' ' + sinNorm + ' ')
          ) {
            score = Math.max(score, 88);
          } else if (sinNorm.length >= 4 && (colNorm.includes(sinNorm) || sinNorm.includes(colNorm))) {
            score = Math.max(score, 78);
          }
        }
      }

      if (score >= 70) {
        const item: ScoreCandidato = { colunaOriginal, def, score, ehExato };
        listaCandidatos.push(item);
        todosCandidatos.push(item);
      }
    });

    // Ordena candidatos da coluna por score decrescente
    listaCandidatos.sort((a, b) => b.score - a.score);
    candidatosPorColuna.set(colunaOriginal, listaCandidatos);
  });

  // 2. Algoritmo Guloso 1-para-1: Garante que NENHUM campo do QualiGest seja atribuído a mais de uma coluna
  todosCandidatos.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.ehExato !== a.ehExato) return b.ehExato ? 1 : -1;
    return (b.def.obrigatorio ? 1 : 0) - (a.def.obrigatorio ? 1 : 0);
  });

  const colunasAlocadas = new Set<string>();
  const camposAlocados = new Set<string>();
  const mapaFinal: Map<string, { def: DefinicaoCampoQualigest; score: number }> = new Map();

  for (const cand of todosCandidatos) {
    if (!colunasAlocadas.has(cand.colunaOriginal) && !camposAlocados.has(cand.def.campo)) {
      colunasAlocadas.add(cand.colunaOriginal);
      camposAlocados.add(cand.def.campo);
      mapaFinal.set(cand.colunaOriginal, { def: cand.def, score: cand.score });
    }
  }

  // 3. Monta mapeamentos preservando a ordem original das colunas
  const mapeamentos: MapeamentoCampoItem[] = [];

  colunas.forEach((colunaOriginal) => {
    const alocado = mapaFinal.get(colunaOriginal);
    const exemploValor =
      amostraLinhas.length > 0 && amostraLinhas[0][colunaOriginal] !== undefined
        ? String(amostraLinhas[0][colunaOriginal])
        : undefined;

    if (alocado) {
      mapeamentos.push({
        colunaOrigem: colunaOriginal,
        campoQualigest: alocado.def.campo,
        campoLabel: alocado.def.label,
        obrigatorio: alocado.def.obrigatorio,
        tipoDado: alocado.def.tipo,
        confiancaIA: alocado.score,
        exemploValor,
        descricao: alocado.def.descricao,
        classificacaoUso: alocado.def.obrigatorio ? 'OBRIGATORIO' : 'OPCIONAL',
        sugestaoIA: alocado.def.obrigatorio ? 'OBRIGATORIO' : 'OPCIONAL',
      });
    } else {
      // Verifica se houve tentativa de match que foi preterida para evitar duplicidade
      const candidatosPerdidos = candidatosPorColuna.get(colunaOriginal) || [];
      const conflitoCom = candidatosPerdidos.find((c) => camposAlocados.has(c.def.campo));
      const descDuplicidade = conflitoCom
        ? `Coluna mantida como ignorada para evitar conflito de apontamento duplo para o campo "${conflitoCom.def.label}". Altere manualmente caso deseje redirecionar.`
        : 'Não mapeado automaticamente. Selecione um campo ou mantenha ignorado.';

      mapeamentos.push({
        colunaOrigem: colunaOriginal,
        campoQualigest: 'ignorar',
        campoLabel: '(Ignorar Coluna)',
        obrigatorio: false,
        tipoDado: 'string',
        confiancaIA: 40,
        exemploValor,
        descricao: descDuplicidade,
        classificacaoUso: 'IGNORADO',
        sugestaoIA: 'IGNORADO',
      });
    }
  });

  return mapeamentos;
}

// ============================================================================
// APLICAÇÃO DE TEMPLATE SALVO / APRENDIZADO
// ============================================================================

export function tentarAplicarTemplateAprovado(
  colunas: string[],
  templates: TemplateMapeamentoAprovado[]
): { templateEncontrado: TemplateMapeamentoAprovado | null; mapeamentoSugerido: Record<string, string> } {
  if (!templates || templates.length === 0) {
    return { templateEncontrado: null, mapeamentoSugerido: {} };
  }

  // Carrega IDs de templates deletados do localStorage
  let deletedIds = new Set<string>();
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('qualigest_deleted_template_ids') : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) deletedIds = new Set(arr);
    }
  } catch (e) {}

  const colunasNorm = colunas.map((c) => normalizarTexto(c));

  for (const template of templates) {
    if (!template || deletedIds.has(template.id)) continue;

    const templateColunasNorm = (template.colunasDetectadas || []).map((c) => normalizarTexto(c));
    if (templateColunasNorm.length === 0) continue;

    // Verifica interseção de colunas
    const correspondencias = colunasNorm.filter((c) => templateColunasNorm.includes(c));
    const percentualAcerto = correspondencias.length / Math.max(colunasNorm.length, templateColunasNorm.length);

    // Exige aderência alta (>= 85%) e pelo menos 3 colunas para evitar falsos positivos
    if (percentualAcerto >= 0.85 && correspondencias.length >= Math.min(3, colunas.length)) {
      // Higieniza o mapeamento sugerido para garantir 1-para-1 (evita duplicidades herdadas de modelos legados)
      const mapeamentoHigienizado: Record<string, string> = {};
      const camposUsados = new Set<string>();

      Object.entries(template.mapeamentos || {}).forEach(([colOrigem, campoAlvo]) => {
        if (colunas.includes(colOrigem)) {
          if (campoAlvo !== 'ignorar' && camposUsados.has(campoAlvo)) {
            // Duplicidade evitada: se já havia sido usado, ignora a coluna duplicada
            mapeamentoHigienizado[colOrigem] = 'ignorar';
          } else {
            mapeamentoHigienizado[colOrigem] = campoAlvo;
            if (campoAlvo !== 'ignorar') {
              camposUsados.add(campoAlvo);
            }
          }
        }
      });

      return {
        templateEncontrado: template,
        mapeamentoSugerido: mapeamentoHigienizado,
      };
    }
  }

  return { templateEncontrado: null, mapeamentoSugerido: {} };
}

// ============================================================================
// VALIDAÇÃO DE QUALIDADE DOS DADOS & DETECÇÃO DE DUPLICIDADES
// ============================================================================

export interface ContextoValidacaoExistente {
  pessoasExistentes?: ColaboradorPessoa[];
  treinamentosExistentes?: CursoTreinamento[];
  registrosTreinamentoExistentes?: RegistroTreinamentoColaborador[];
  ferramentasExistentes?: FerramentaCalibracao[];
  documentosExistentes?: DocumentoControlado[];
}

export function validarDataISO(valor: any): { valida: boolean; isoString?: string } {
  if (valor === undefined || valor === null || valor === '') return { valida: false };

  // Caso seja número ou string de número (serial date do Excel, ex: 45520)
  if (typeof valor === 'number' || (/^\d{5}$/.test(String(valor).trim()) && Number(valor) > 30000 && Number(valor) < 65000)) {
    const num = Number(valor);
    // Excel epoch 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + num * msPerDay);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1990 && date.getFullYear() < 2100) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return { valida: true, isoString: `${y}-${m}-${d}` };
    }
  }

  const str = String(valor).trim();
  if (!str) return { valida: false };

  // Testar padrão YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        return { valida: true, isoString: str };
      }
    }
    return { valida: false };
  }

  // Testar padrão DD/MM/YYYY, DD.MM.YYYY ou DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (ddmmyyyyMatch) {
    const d = Number(ddmmyyyyMatch[1]);
    const m = Number(ddmmyyyyMatch[2]);
    let y = Number(ddmmyyyyMatch[3]);
    if (y < 100) {
      y += y >= 70 ? 1900 : 2000;
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { valida: true, isoString: iso };
      }
    }
  }

  // Testar padrão aeronáutico DD/Mês/YYYY, ex: "06/Ago/2026", "12/Set/2025", "19/Nov/2021", "21/Jan/2026", "11/Mai/2026"
  const ddMesAnoMatch = str.match(/^(\d{1,2})[\/\.\s-]+([a-zA-ZçÇãÃéÉ]+)[\/\.\s-]+(\d{2,4})$/);
  if (ddMesAnoMatch) {
    const dia = Number(ddMesAnoMatch[1]);
    const nomeMes = ddMesAnoMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let ano = Number(ddMesAnoMatch[3]);
    if (ano < 100) {
      ano += ano >= 70 ? 1900 : 2000;
    }
    const mesesAeroMap: Record<string, number> = {
      jan: 1, janeiro: 1, january: 1,
      fev: 2, fevereiro: 2, feb: 2, february: 2,
      mar: 3, marco: 3, march: 3,
      abr: 4, abril: 4, apr: 4, april: 4,
      mai: 5, maio: 5, may: 5,
      jun: 6, junho: 6, june: 6,
      jul: 7, julho: 7, july: 7,
      ago: 8, agosto: 8, aug: 8, august: 8,
      set: 9, setembro: 9, sep: 9, september: 9,
      out: 10, outubro: 10, oct: 10, october: 10,
      nov: 11, novembro: 11, november: 11,
      dez: 12, dezembro: 12, dec: 12, december: 12,
    };
    const mesNum = mesesAeroMap[nomeMes] || mesesAeroMap[nomeMes.slice(0, 3)];
    if (mesNum && dia >= 1 && dia <= 31 && ano >= 1970 && ano <= 2099) {
      const iso = `${ano}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { valida: true, isoString: iso };
    }
  }

  // Testar formato Mês/Ano em português, ex: "Ago.26", "Ago/26", "Ago-26", "Ago.2026", "Agosto/2026"
  const mesesPt: Record<string, number> = {
    jan: 1, janeiro: 1,
    fev: 2, fevereiro: 2,
    mar: 3, marco: 3, março: 3,
    abr: 4, abril: 4,
    mai: 5, maio: 5,
    jun: 6, junho: 6,
    jul: 7, julho: 7,
    ago: 8, agosto: 8,
    set: 9, setembro: 9,
    out: 10, outubro: 10,
    nov: 11, novembro: 11,
    dez: 12, dezembro: 12,
  };

  const mesAnoMatch = str.toLowerCase().match(/^([a-zçãé]+)[\/\.\s-]+(\d{2,4})$/);
  if (mesAnoMatch) {
    const nomeMes = mesAnoMatch[1];
    let ano = Number(mesAnoMatch[2]);
    if (ano < 100) {
      ano += ano >= 70 ? 1900 : 2000;
    }
    const mesNum = mesesPt[nomeMes];
    if (mesNum && ano >= 1990 && ano <= 2099) {
      const iso = `${ano}-${String(mesNum).padStart(2, '0')}-01`;
      return { valida: true, isoString: iso };
    }
  }

  // Testar padrão MM/YYYY ou MM.YYYY
  const mmyyyyMatch = str.match(/^(\d{1,2})[\/\.-](\d{4})$/);
  if (mmyyyyMatch) {
    const m = Number(mmyyyyMatch[1]);
    const y = Number(mmyyyyMatch[2]);
    if (m >= 1 && m <= 12 && y >= 1990 && y <= 2099) {
      const iso = `${y}-${String(m).padStart(2, '0')}-01`;
      return { valida: true, isoString: iso };
    }
  }

  // Tentar Date parse padrão
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1980 && parsed.getFullYear() < 2100) {
    const iso = parsed.toISOString().split('T')[0];
    return { valida: true, isoString: iso };
  }

  return { valida: false };
}

export function validarECompararLinhasImportacao(
  linhasOriginais: Record<string, any>[],
  mapeamentos: MapeamentoCampoItem[],
  tipoControle: TipoControleImportacao,
  contexto: ContextoValidacaoExistente,
  classificacaoCampos?: Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'>
): {
  registrosLinhas: RegistroLinhaImportacao[];
  resumo: ResumoPreviaImportacao;
  oportunidades: OportunidadeMelhoriaImportacao[];
} {
  const mapaDePara: Record<string, string> = {};
  const statusUsoCampo: Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'> = {};

  mapeamentos.forEach((m) => {
    const classif = (classificacaoCampos && classificacaoCampos[m.colunaOrigem]) || m.classificacaoUso;
    if (m.campoQualigest && m.campoQualigest !== 'ignorar' && classif !== 'IGNORADO') {
      mapaDePara[m.colunaOrigem] = m.campoQualigest;
      statusUsoCampo[m.campoQualigest] = classif || (m.obrigatorio ? 'OBRIGATORIO' : 'OPCIONAL');
    }
  });

  const definicoes = ESQUEMA_CAMPOS_CONTROLE[tipoControle] || ESQUEMA_CAMPOS_CONTROLE.OUTROS;
  
  // Campos que devem ser tratados como obrigatórios
  const camposObrigatorios = definicoes
    .filter((d) => {
      const customUso = statusUsoCampo[d.campo];
      if (customUso === 'IGNORADO') return false;
      if (customUso === 'OBRIGATORIO') return true;
      if (customUso === 'OPCIONAL') return false;
      return d.obrigatorio;
    })
    .map((d) => d.campo);

  const registrosLinhas: RegistroLinhaImportacao[] = [];
  let totalNovos = 0;
  let totalIguais = 0;
  let totalAlterados = 0;
  let totalDuplicidades = 0;
  let totalInvalidos = 0;
  let totalErros = 0;
  let totalAtencao = 0;
  let totalIgnorados = 0;
  let totalEvidencias = 0;

  // Dicionários para detecção de oportunidades de melhoria
  const oportunidades: OportunidadeMelhoriaImportacao[] = [];
  let qtdValidadeAusente = 0;
  let qtdSemEvidencia = 0;
  let qtdFerramentaVencida = 0;
  let qtdPessoasNaoCadastradas = 0;
  const pessoasDetectadas = new Set<string>();
  const cursosDetectados = new Set<string>();
  const ferramentasVencidasNomes: string[] = [];

  // Cache de pessoas e cursos detectados no lote para evitar duplicidades intra-planilha (Fase 14.1-A)
  const pessoasLoteMap = new Map<string, { id: string; nome: string; matricula: string; setor?: string; funcao?: string; isNew: boolean }>();
  const cursosLoteMap = new Map<string, { id: string; titulo: string; codigo: string; isNew: boolean }>();

  linhasOriginais.forEach((linhaOriginal, index) => {
    const dadosMapeados: Record<string, any> = {};
    const mensagensValidacao: string[] = [];
    let statusQualidade: 'OK' | 'ATENCAO' | 'ERRO' = 'OK';
    const camposDivergentes: CampoDivergente[] = [];

    // Mapear campos respeitando colunas ativas
    Object.entries(linhaOriginal).forEach(([coluna, valor]) => {
      const campoAlvo = mapaDePara[coluna];
      if (campoAlvo) {
        dadosMapeados[campoAlvo] = valor !== undefined && valor !== null ? String(valor).trim() : '';
      }
    });

    // Auto-recuperação e desdobramento para CONTROLE_DOCUMENTAL (Formulário F 001-02-1 com 4 colunas)
    if (tipoControle === 'CONTROLE_DOCUMENTAL') {
      if (!dadosMapeados.codigo) {
        dadosMapeados.codigo = String(linhaOriginal['Publicação'] || linhaOriginal['publicacao'] || linhaOriginal['Publicacao'] || '').trim();
      }
      if (!dadosMapeados.titulo) {
        dadosMapeados.titulo = String(linhaOriginal['Título'] || linhaOriginal['titulo'] || linhaOriginal['Titulo'] || '').trim();
      }
      if (!dadosMapeados.responsavel) {
        dadosMapeados.responsavel = String(
          linhaOriginal['Proprietário / Cessor'] ||
          linhaOriginal['proprietarioCessor'] ||
          linhaOriginal['Proprietário'] ||
          linhaOriginal['Cessor'] ||
          linhaOriginal['Proprietário ou Cessor'] ||
          ''
        ).trim();
      }

      const rawRevData =
        linhaOriginal['Número e data da revisão'] ||
        linhaOriginal['revisao e data'] ||
        linhaOriginal['rev e data'] ||
        dadosMapeados.numeroEDataRevisao ||
        '';

      const needsRevSeparation =
        (!dadosMapeados.numeroRevisao || String(dadosMapeados.numeroRevisao).length > 25 || String(dadosMapeados.numeroRevisao).includes('/')) ||
        !dadosMapeados.dataAprovacao;

      if (needsRevSeparation && rawRevData) {
        const { numeroRevisao, dataRevisao } = separarNumeroEDataRevisao(String(rawRevData));
        if (numeroRevisao && (!dadosMapeados.numeroRevisao || String(dadosMapeados.numeroRevisao).includes('/'))) {
          dadosMapeados.numeroRevisao = numeroRevisao;
        }
        if (dataRevisao && !dadosMapeados.dataAprovacao) {
          dadosMapeados.dataAprovacao = dataRevisao;
        }
      }

      if (!dadosMapeados.numeroRevisao && linhaOriginal['Número da Revisão']) {
        dadosMapeados.numeroRevisao = String(linhaOriginal['Número da Revisão']).trim();
      }
      if (!dadosMapeados.dataAprovacao && linhaOriginal['Data da Revisão']) {
        dadosMapeados.dataAprovacao = String(linhaOriginal['Data da Revisão']).trim();
      }

      // Se data ainda ausente ou N/A em manuais contínuos, assume data vigente padrão
      if (!dadosMapeados.dataAprovacao || dadosMapeados.dataAprovacao === 'N/A' || dadosMapeados.dataAprovacao === '-') {
        dadosMapeados.dataAprovacao = new Date().toISOString().split('T')[0];
      }
    }

    // 1. Validar campos obrigatórios
    for (const campoObrigatorio of camposObrigatorios) {
      const val = dadosMapeados[campoObrigatorio];
      if (!val || val === '') {
        statusQualidade = 'ERRO';
        const def = definicoes.find((d) => d.campo === campoObrigatorio);
        mensagensValidacao.push(`Campo obrigatório ausente: '${def?.label || campoObrigatorio}'.`);
      }
    }

    // 2. Validar tipos de dados, datas, revisões e regras de governança
    definicoes.forEach((def) => {
      const val = dadosMapeados[def.campo];
      if (val && def.tipo === 'date') {
        const valData = validarDataISO(val);
        if (!valData.valida) {
          statusQualidade = 'ERRO';
          mensagensValidacao.push(`Data inválida em '${def.label}': "${val}". Verifique dia/mês/ano.`);
        } else if (valData.isoString) {
          dadosMapeados[def.campo] = valData.isoString;
        }
      }

      // Governança de Revisões: SEMPRE STRING (ex: 'Rev. 08', 'Rev. D', '02', 'Emenda 07') — NUNCA CONVERTER PARA NÚMERO
      if (def.campo === 'numeroRevisao' || def.campo === 'revisaoNumero') {
        if (dadosMapeados[def.campo] !== undefined && dadosMapeados[def.campo] !== null) {
          dadosMapeados[def.campo] = String(dadosMapeados[def.campo]).trim();
        }
      }

      // Governança de Status: STATUS_NAO_INFORMADO proibido de converter silenciosamente para ATIVO
      if (def.campo === 'status') {
        const rawStatus = dadosMapeados[def.campo];
        if (
          rawStatus === undefined ||
          rawStatus === null ||
          rawStatus === '' ||
          String(rawStatus).toUpperCase() === 'STATUS_NAO_INFORMADO' ||
          String(rawStatus).toUpperCase() === 'NAO INFORMADO' ||
          String(rawStatus).toUpperCase() === 'NÃO INFORMADO' ||
          String(rawStatus).toUpperCase() === 'SEM STATUS' ||
          String(rawStatus).toUpperCase() === 'A DEFINIR' ||
          String(rawStatus).toUpperCase() === 'PENDENTE'
        ) {
          dadosMapeados[def.campo] = 'STATUS_NAO_INFORMADO';
          mensagensValidacao.push('Status não informado no arquivo original — Preservado como STATUS_NAO_INFORMADO (Governança SGQ: proibido presumir ATIVO).');
          if (statusQualidade === 'OK') statusQualidade = 'ATENCAO';
        }
      }
    });

    // 3. Contagem de evidências encontradas
    if (dadosMapeados.numeroCertificado || dadosMapeados.certificado || dadosMapeados.evidenciaCertificadoUrl) {
      totalEvidencias++;
    } else {
      qtdSemEvidencia++;
    }

    // ========================================================================
    // 4. RECONCILIAÇÃO INTELIGENTE 2.0 COM O BANCO EXISTENTE (5-WAY CLASSIFICATION)
    // ========================================================================
    let classificacaoReconciliacao: ClassificacaoReconciliacao = 'NOVO';
    let decisaoUsuario: DecisaoReconciliacao = 'CRIAR';
    let acaoDuplicidade: AcaoConflitoDuplicidade = 'CRIAR_NOVO';
    let registroExistenteId: string | undefined = undefined;
    let registroExistenteResumo: string | undefined = undefined;
    let dadosExistentesSnapshot: Record<string, any> | undefined = undefined;
    let duplicidadeDetectada = false;

    // Ações complementares para entidades vinculadas
    let pessoaAcao: 'CRIAR_PESSOA' | 'VINCULAR_EXISTENTE' | 'IGNORAR' | undefined = undefined;
    let pessoaIdVinculada: string | undefined = undefined;
    let pessoaNomeVinculada: string | undefined = undefined;
    let cursoAcao: 'CRIAR_CURSO' | 'VINCULAR_EXISTENTE' | 'IGNORAR' | undefined = undefined;
    let cursoIdVinculado: string | undefined = undefined;
    let documentoAcao: 'CRIAR_DOCUMENTO' | 'NOVA_REVISAO' | 'IGNORAR' | undefined = undefined;

    if (tipoControle === 'CALIBRACAO_FERRAMENTAL') {
      const pat = normalizarTexto(dadosMapeados.codigoPatrimonio || '');
      const serie = normalizarTexto(dadosMapeados.numeroSerie || '');
      const desc = normalizarTexto(dadosMapeados.descricao || '');

      // Registro inválido se não tiver nem patrimônio, nem série, nem descrição
      if (!pat && !serie && !desc) {
        classificacaoReconciliacao = 'INVALIDO';
        decisaoUsuario = 'IGNORAR';
        statusQualidade = 'ERRO';
        mensagensValidacao.push('Registro inválido: Ausência total de identificadores (Código, Série ou Descrição).');
        totalInvalidos++;
      } else {
        // Busca correspondente no banco oficial de ferramentas
        const ferramentaExistente = (contexto.ferramentasExistentes || []).find((f) => {
          const fPat = normalizarTexto(f.codigoPatrimonio);
          const fSerie = normalizarTexto(f.numeroSerie);
          return (pat && fPat === pat) || (serie && fSerie === serie);
        });

        if (ferramentaExistente) {
          registroExistenteId = ferramentaExistente.id;
          dadosExistentesSnapshot = { ...ferramentaExistente };
          registroExistenteResumo = `${ferramentaExistente.codigoPatrimonio} - ${ferramentaExistente.descricao} (S/N: ${ferramentaExistente.numeroSerie || 'N/A'}, Venc: ${ferramentaExistente.dataProximaCalibracao})`;

          // Comparar campos relevantes para detectar diferenças
          const camposParaComparar = [
            { campo: 'descricao', label: 'Descrição' },
            { campo: 'fabricante', label: 'Fabricante' },
            { campo: 'modelo', label: 'Modelo' },
            { campo: 'dataProximaCalibracao', label: 'Próxima Calibração' },
            { campo: 'dataUltimaCalibracao', label: 'Última Calibração' },
            { campo: 'laboratorioCalibrador', label: 'Laboratório RBC' },
            { campo: 'numeroCertificado', label: 'Nº Certificado' },
            { campo: 'setor', label: 'Setor Alocado' },
          ];

          camposParaComparar.forEach((c) => {
            const valAtual = (ferramentaExistente as any)[c.campo] || '';
            const valNovo = dadosMapeados[c.campo] || '';
            if (valNovo && normalizarTexto(String(valAtual)) !== normalizarTexto(String(valNovo))) {
              camposDivergentes.push({
                campo: c.campo,
                label: c.label,
                valorAtual: valAtual,
                valorImportado: valNovo,
              });
            }
          });

          if (camposDivergentes.length === 0) {
            // Todos os campos relevantes coincidem
            classificacaoReconciliacao = 'EXISTENTE_IGUAL';
            decisaoUsuario = 'IGNORAR';
            acaoDuplicidade = 'MANTER_EXISTENTE';
            totalIguais++;
            totalIgnorados++;
            mensagensValidacao.push(`Registro idêntico já cadastrado no Controle de Ferramentas (${ferramentaExistente.codigoPatrimonio}). Sugestão: Ignorar importação.`);
          } else {
            // Existem campos alterados
            classificacaoReconciliacao = 'EXISTENTE_ALTERADO';
            decisaoUsuario = 'ATUALIZAR';
            acaoDuplicidade = 'ATUALIZAR';
            duplicidadeDetectada = true;
            totalAlterados++;
            if (statusQualidade === 'OK') statusQualidade = 'ATENCAO';
            mensagensValidacao.push(
              `Instrumento existente com divergências (${camposDivergentes.map((c) => c.label).join(', ')}). Sugestão: Atualizar cadastro oficial.`
            );
          }
        } else {
          // Checar possível duplicidade por similaridade de descrição + fabricante
          const possivelDuplicata = (contexto.ferramentasExistentes || []).find((f) => {
            const fDesc = normalizarTexto(f.descricao);
            const fFab = normalizarTexto(f.fabricante);
            const fab = normalizarTexto(dadosMapeados.fabricante || '');
            return desc && fDesc && (desc === fDesc || desc.includes(fDesc) || fDesc.includes(desc)) && (fab && fFab && fab === fFab);
          });

          if (possivelDuplicata) {
            classificacaoReconciliacao = 'POSSIVEL_DUPLICIDADE';
            decisaoUsuario = 'REVISAR';
            duplicidadeDetectada = true;
            registroExistenteId = possivelDuplicata.id;
            dadosExistentesSnapshot = { ...possivelDuplicata };
            registroExistenteResumo = `Instrumento similar: ${possivelDuplicata.codigoPatrimonio} (${possivelDuplicata.descricao}) - S/N: ${possivelDuplicata.numeroSerie}`;
            totalDuplicidades++;
            if (statusQualidade === 'OK') statusQualidade = 'ATENCAO';
            mensagensValidacao.push(`Possível duplicidade com ${possivelDuplicata.codigoPatrimonio} (${possivelDuplicata.descricao}). Confirme antes de criar.`);
          } else {
            classificacaoReconciliacao = 'NOVO';
            decisaoUsuario = 'CRIAR';
            acaoDuplicidade = 'CRIAR_NOVO';
            totalNovos++;
          }
        }

        // Checar se ferramenta entra com calibração vencida
        if (dadosMapeados.dataProximaCalibracao) {
          const hojeIso = new Date().toISOString().split('T')[0];
          if (dadosMapeados.dataProximaCalibracao < hojeIso) {
            qtdFerramentaVencida++;
            ferramentasVencidasNomes.push(`${dadosMapeados.codigoPatrimonio || 'S/ID'} - ${dadosMapeados.descricao || 'Ferramenta'}`);
            if (statusQualidade !== 'ERRO') statusQualidade = 'ATENCAO';
            mensagensValidacao.push(`Atenção metrológica: Calibração VENCIDA em ${dadosMapeados.dataProximaCalibracao}. O item será colocado em quarentena técnica.`);
          }
        }
      }
    } else if (tipoControle === 'TREINAMENTOS') {
      const pessoaNomeNorm = normalizarTexto(dadosMapeados.pessoaNome || '');
      const cursoTituloNorm = normalizarTexto(dadosMapeados.cursoTitulo || '');
      const dataRealizacao = dadosMapeados.dataRealizacao || '';

      if (!pessoaNomeNorm && !cursoTituloNorm) {
        classificacaoReconciliacao = 'INVALIDO';
        decisaoUsuario = 'IGNORAR';
        statusQualidade = 'ERRO';
        mensagensValidacao.push('Registro incompleto: Nem o nome do colaborador nem o título do treinamento foram identificados.');
        totalInvalidos++;
      } else {
        if (pessoaNomeNorm) pessoasDetectadas.add(pessoaNomeNorm);
        if (cursoTituloNorm) cursosDetectados.add(cursoTituloNorm);

        // ====================================================================
        // 1. RECONCILIAÇÃO DO COLABORADOR (Pessoas & Competências - Fase 14.1-A)
        // ====================================================================
        if (pessoaNomeNorm) {
          // A. Busca exata por matrícula informada ou nome completo normalizado
          const pessoaCadastrada = (contexto.pessoasExistentes || []).find(
            (p) =>
              (dadosMapeados.pessoaMatricula && p.matricula && normalizarTexto(p.matricula) === normalizarTexto(dadosMapeados.pessoaMatricula)) ||
              normalizarTexto(p.nome) === pessoaNomeNorm
          );

          if (pessoaCadastrada) {
            pessoaAcao = 'VINCULAR_EXISTENTE';
            pessoaIdVinculada = pessoaCadastrada.id;
            pessoaNomeVinculada = pessoaCadastrada.nome;

            // Detectar se há alteração cadastral para decisão humana (matrícula, setor, função ou status)
            const camposPessoaDivergentes: CampoDivergente[] = [];
            if (dadosMapeados.pessoaMatricula && normalizarTexto(pessoaCadastrada.matricula || '') !== normalizarTexto(dadosMapeados.pessoaMatricula)) {
              camposPessoaDivergentes.push({
                campo: 'pessoaMatricula',
                label: 'Matrícula',
                valorAtual: pessoaCadastrada.matricula || 'Não informada',
                valorImportado: dadosMapeados.pessoaMatricula,
              });
            }
            if (dadosMapeados.setor && normalizarTexto(pessoaCadastrada.setor || '') !== normalizarTexto(dadosMapeados.setor)) {
              camposPessoaDivergentes.push({
                campo: 'setor',
                label: 'Setor',
                valorAtual: pessoaCadastrada.setor || 'Geral',
                valorImportado: dadosMapeados.setor,
              });
            }
            if (dadosMapeados.funcao && normalizarTexto(pessoaCadastrada.cargoOperacional || '') !== normalizarTexto(dadosMapeados.funcao)) {
              camposPessoaDivergentes.push({
                campo: 'funcao',
                label: 'Função / Cargo',
                valorAtual: pessoaCadastrada.cargoOperacional || 'Mecânico',
                valorImportado: dadosMapeados.funcao,
              });
            }
            const rawStatusImp = dadosMapeados.statusColaborador || dadosMapeados.status || '';
            if (rawStatusImp) {
              const statusNormalizado = normalizarStatusColaborador(rawStatusImp);
              if (pessoaCadastrada.status !== statusNormalizado) {
                camposPessoaDivergentes.push({
                  campo: 'status',
                  label: 'Status do Colaborador',
                  valorAtual: pessoaCadastrada.status,
                  valorImportado: statusNormalizado,
                });
              }
            }

            if (camposPessoaDivergentes.length > 0) {
              camposPessoaDivergentes.forEach((d) => camposDivergentes.push(d));
              mensagensValidacao.push(
                `Colaborador oficial identificado (${pessoaCadastrada.nome} - Matrícula: ${pessoaCadastrada.matricula || 'S/M'}). Dados complementares/alterações detectadas na planilha: ${camposPessoaDivergentes.map((c) => c.label).join(', ')}.`
              );
            }
          } else {
            // B. Verificar possível duplicidade / homônimo por similaridade de tokens no banco oficial
            const tokens = pessoaNomeNorm.split(' ').filter((t) => t.length > 2);
            const pessoaSimilar = (contexto.pessoasExistentes || []).find((p) => {
              const pTokens = normalizarTexto(p.nome).split(' ').filter((t) => t.length > 2);
              if (tokens.length >= 2 && pTokens.length >= 2) {
                return tokens[0] === pTokens[0] && tokens[tokens.length - 1] === pTokens[pTokens.length - 1];
              }
              return false;
            });

            if (pessoaSimilar) {
              duplicidadeDetectada = true;
              classificacaoReconciliacao = 'POSSIVEL_DUPLICIDADE';
              decisaoUsuario = 'REVISAR';
              registroExistenteId = pessoaSimilar.id;
              registroExistenteResumo = `Possível homônimo/duplicata com colaborador existente: ${pessoaSimilar.nome} (${pessoaSimilar.matricula || 'S/M'}) - Setor: ${pessoaSimilar.setor || 'Geral'}`;
              pessoaAcao = 'VINCULAR_EXISTENTE';
              pessoaIdVinculada = pessoaSimilar.id;
              pessoaNomeVinculada = pessoaSimilar.nome;
              if (statusQualidade !== 'ERRO') statusQualidade = 'ATENCAO';
              mensagensValidacao.push(
                `Possível homônimo/duplicidade detectada com "${pessoaSimilar.nome}". Decisão humana necessária para vincular ou criar novo colaborador.`
              );
            } else {
              // C. Novo colaborador: verificar se já apareceu em linha anterior desta planilha
              const pessoaEmLote = pessoasLoteMap.get(pessoaNomeNorm);
              if (pessoaEmLote) {
                pessoaAcao = 'CRIAR_PESSOA';
                pessoaIdVinculada = pessoaEmLote.id;
                pessoaNomeVinculada = pessoaEmLote.nome;
              } else {
                const newPersonId = `person-imp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
                pessoasLoteMap.set(pessoaNomeNorm, {
                  id: newPersonId,
                  nome: dadosMapeados.pessoaNome,
                  matricula: dadosMapeados.pessoaMatricula || '',
                  setor: dadosMapeados.setor,
                  funcao: dadosMapeados.funcao,
                  isNew: true,
                });
                pessoaAcao = 'CRIAR_PESSOA';
                pessoaIdVinculada = newPersonId;
                pessoaNomeVinculada = dadosMapeados.pessoaNome;
                qtdPessoasNaoCadastradas++;
                if (statusQualidade !== 'ERRO') statusQualidade = 'ATENCAO';

                const rawStatusColab = dadosMapeados.statusColaborador || dadosMapeados.status;
                const analiseStatus = normalizarStatusColaboradorCompleto(rawStatusColab);
                if (analiseStatus.statusNaoInformado) {
                  mensagensValidacao.push(
                    `Novo colaborador identificado: "${dadosMapeados.pessoaNome}" com STATUS NÃO INFORMADO na planilha. Validação e decisão humana obrigatórias antes da persistência.`
                  );
                } else {
                  mensagensValidacao.push(
                    `Novo colaborador identificado: "${dadosMapeados.pessoaNome}" com status ${analiseStatus.status} (original: "${analiseStatus.statusOriginal}"). Será cadastrado oficialmente em Pessoas & Competências após aprovação.`
                  );
                }
              }
            }
          }
        }

        // Se a linha tiver curso definido, faz a reconciliação do catálogo e do registro de treinamento
        if (cursoTituloNorm) {
          // ====================================================================
          // 2. RECONCILIAÇÃO DO CURSO NO CATÁLOGO (Fase 14.1-A)
          // ====================================================================
          const cursoCadastrado = (contexto.treinamentosExistentes || []).find(
            (c) =>
              (dadosMapeados.cursoCodigo && c.codigo && normalizarTexto(c.codigo) === normalizarTexto(dadosMapeados.cursoCodigo)) ||
              normalizarTexto(c.titulo) === cursoTituloNorm
          );

          if (cursoCadastrado) {
            cursoAcao = 'VINCULAR_EXISTENTE';
            cursoIdVinculado = cursoCadastrado.id;
          } else {
            // Checar se já foi planejado em linha anterior deste lote
            const cursoEmLote = cursosLoteMap.get(cursoTituloNorm);
            if (cursoEmLote) {
              cursoAcao = 'CRIAR_CURSO';
              cursoIdVinculado = cursoEmLote.id;
            } else {
              const newCourseId = `course-imp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
              cursosLoteMap.set(cursoTituloNorm, {
                id: newCourseId,
                titulo: dadosMapeados.cursoTitulo,
                codigo: dadosMapeados.cursoCodigo || '',
                isNew: true,
              });
              cursoAcao = 'CRIAR_CURSO';
              cursoIdVinculado = newCourseId;
              mensagensValidacao.push(
                `Novo treinamento identificado: "${dadosMapeados.cursoTitulo}". Será cadastrado no catálogo oficial de Treinamentos após aprovação.`
              );
            }
          }

          // ====================================================================
          // 3. RECONCILIAÇÃO DO REGISTRO DE TREINAMENTO (Fase 14.1-A)
          // ====================================================================
          const treinoExistente = (contexto.registrosTreinamentoExistentes || []).find((r) => {
            const matchColaborador =
              (pessoaIdVinculada && r.colaboradorId === pessoaIdVinculada) ||
              normalizarTexto(r.colaboradorNome) === pessoaNomeNorm;
            const matchCurso =
              (cursoIdVinculado && r.treinamentoId === cursoIdVinculado) ||
              normalizarTexto(r.treinamentoTitulo) === cursoTituloNorm;
            return matchColaborador && matchCurso && r.dataRealizacao === dataRealizacao;
          });

          if (treinoExistente) {
            registroExistenteId = treinoExistente.id;
            dadosExistentesSnapshot = { ...treinoExistente };
            registroExistenteResumo = `Treinamento realizado em ${dataRealizacao} (Validade: ${treinoExistente.dataValidade || 'N/A'}, Cert: ${treinoExistente.numeroCertificado || 'S/N'})`;

            const camposComparacaoTreino = [
              { campo: 'dataValidade', label: 'Data de Validade' },
              { campo: 'cargaHoraria', label: 'Carga Horária' },
              { campo: 'numeroCertificado', label: 'Nº Certificado' },
              { campo: 'entidadeInstrutora', label: 'Entidade / Instrutor' },
            ];

            camposComparacaoTreino.forEach((c) => {
              const valAtual = (treinoExistente as any)[c.campo] || '';
              const valNovo = dadosMapeados[c.campo] || '';
              if (valNovo && normalizarTexto(String(valAtual)) !== normalizarTexto(String(valNovo))) {
                camposDivergentes.push({
                  campo: c.campo,
                  label: c.label,
                  valorAtual: valAtual,
                  valorImportado: valNovo,
                });
              }
            });

            if (camposDivergentes.length === 0) {
              classificacaoReconciliacao = 'EXISTENTE_IGUAL';
              decisaoUsuario = 'IGNORAR';
              acaoDuplicidade = 'MANTER_EXISTENTE';
              totalIguais++;
              totalIgnorados++;
              mensagensValidacao.push(`Capacitação já homologada para este colaborador na mesma data. Sugestão: Manter existente.`);
            } else {
              classificacaoReconciliacao = 'EXISTENTE_ALTERADO';
              decisaoUsuario = 'ATUALIZAR';
              acaoDuplicidade = 'ATUALIZAR';
              duplicidadeDetectada = true;
              totalAlterados++;
              if (statusQualidade === 'OK') statusQualidade = 'ATENCAO';
              mensagensValidacao.push(`Registro existente com dados complementares (${camposDivergentes.map((c) => c.label).join(', ')}). Sugestão: Atualizar.`);
            }
          } else {
            // Checar se existe treinamento do mesmo curso para o colaborador (mesmo curso, data diferente ou reimportação)
            const mesmoCursoOutraData = (contexto.registrosTreinamentoExistentes || []).find((r) => {
              const matchColaborador =
                (pessoaIdVinculada && r.colaboradorId === pessoaIdVinculada) ||
                normalizarTexto(r.colaboradorNome) === pessoaNomeNorm;
              const matchCurso =
                (cursoIdVinculado && r.treinamentoId === cursoIdVinculado) ||
                normalizarTexto(r.treinamentoTitulo) === cursoTituloNorm;
              return matchColaborador && matchCurso;
            });

            if (mesmoCursoOutraData) {
              // Comparar com a data existente: atualizar o registro mantendo a base enxuta
              registroExistenteId = mesmoCursoOutraData.id;
              dadosExistentesSnapshot = { ...mesmoCursoOutraData };
              registroExistenteResumo = `Treinamento existente: ${mesmoCursoOutraData.treinamentoTitulo} (Última realização: ${mesmoCursoOutraData.dataRealizacao || 'N/A'}, Validade: ${mesmoCursoOutraData.dataValidade || 'N/A'})`;

              classificacaoReconciliacao = 'EXISTENTE_ALTERADO';
              decisaoUsuario = 'ATUALIZAR';
              acaoDuplicidade = 'ATUALIZAR';
              duplicidadeDetectada = true;
              totalAlterados++;
              if (statusQualidade === 'OK') statusQualidade = 'ATENCAO';
              mensagensValidacao.push(`Curso "${dadosMapeados.cursoTitulo || mesmoCursoOutraData.treinamentoTitulo}" já cadastrado para ${dadosMapeados.pessoaNome || mesmoCursoOutraData.colaboradorNome}. O registro será atualizado com a data mais recente (${dataRealizacao}), mantendo a base unificada sem duplicidades.`);
            } else {
              classificacaoReconciliacao = 'NOVO';
              decisaoUsuario = 'CRIAR';
              acaoDuplicidade = 'CRIAR_NOVO';
              totalNovos++;
            }
          }

          if (!dadosMapeados.dataValidade) {
            qtdValidadeAusente++;
          }
        } else {
          // Sem curso especificado: registro focado em Colaborador / Habilitação
          if (pessoaAcao === 'CRIAR_PESSOA') {
            classificacaoReconciliacao = 'NOVO';
            decisaoUsuario = 'CRIAR';
            totalNovos++;
            mensagensValidacao.push('Cadastro de novo colaborador para Pessoas & Competências.');
          } else if (pessoaAcao === 'VINCULAR_EXISTENTE') {
            if (camposDivergentes.length > 0) {
              classificacaoReconciliacao = 'EXISTENTE_ALTERADO';
              decisaoUsuario = 'ATUALIZAR';
              totalAlterados++;
              mensagensValidacao.push('Atualização cadastral do colaborador existente.');
            } else {
              classificacaoReconciliacao = 'EXISTENTE_IGUAL';
              decisaoUsuario = 'IGNORAR';
              totalIguais++;
              mensagensValidacao.push('Colaborador já cadastrado na organização com dados idênticos.');
            }
          }
        }

        if (dadosMapeados.chtNumero) {
          mensagensValidacao.push(`Habilitação CHT/CANAC ${dadosMapeados.chtNumero} identificada (Validade: ${dadosMapeados.chtValidade || 'Não informada'}).`);
        }
      }
    } else if (tipoControle === 'CONTROLE_DOCUMENTAL') {
      const codNorm = normalizarTexto(dadosMapeados.codigo || '');
      const tituloNorm = normalizarTexto(dadosMapeados.titulo || '');

      if (!codNorm && !tituloNorm) {
        classificacaoReconciliacao = 'INVALIDO';
        decisaoUsuario = 'IGNORAR';
        statusQualidade = 'ERRO';
        mensagensValidacao.push('Documento sem código ou título identificável.');
        totalInvalidos++;
      } else {
        const docExistente = (contexto.documentosExistentes || []).find(
          (d) => normalizarTexto(d.codigo) === codNorm || (tituloNorm && normalizarTexto(d.titulo) === tituloNorm)
        );

        if (docExistente) {
          registroExistenteId = docExistente.id;
          dadosExistentesSnapshot = { ...docExistente };
          registroExistenteResumo = `Documento ${docExistente.codigo} (${docExistente.titulo}) - Rev. Vigente: ${docExistente.revisaoVigenteNumero || '0'}`;

          const revImportada = normalizarTexto(dadosMapeados.revisaoNumero || dadosMapeados.numeroRevisao || '');
          const revVigente = normalizarTexto(docExistente.revisaoVigenteNumero || '');

          if (revImportada && revImportada === revVigente) {
            classificacaoReconciliacao = 'EXISTENTE_IGUAL';
            decisaoUsuario = 'IGNORAR';
            documentoAcao = 'IGNORAR';
            totalIguais++;
            totalIgnorados++;
            mensagensValidacao.push(`Documento ${docExistente.codigo} já está cadastrado exatamente na revisão ${docExistente.revisaoVigenteNumero}.`);
          } else {
            classificacaoReconciliacao = 'EXISTENTE_ALTERADO';
            decisaoUsuario = 'ATUALIZAR';
            documentoAcao = 'NOVA_REVISAO';
            duplicidadeDetectada = true;
            totalAlterados++;
            camposDivergentes.push({
              campo: 'revisaoVigenteNumero',
              label: 'Revisão Vigente',
              valorAtual: docExistente.revisaoVigenteNumero || 'Sem revisão',
              valorImportado: dadosMapeados.revisaoNumero || dadosMapeados.numeroRevisao || 'Nova',
            });
            if (statusQualidade === 'OK') statusQualidade = 'ATENCAO';
            mensagensValidacao.push(`Documento já existe no Controle Documental. A importação registrará a nova revisão histórica (${dadosMapeados.numeroRevisao || dadosMapeados.revisaoNumero || 'Nova'}).`);
          }
        } else {
          classificacaoReconciliacao = 'NOVO';
          decisaoUsuario = 'CRIAR';
          documentoAcao = 'CRIAR_DOCUMENTO';
          totalNovos++;
        }
      }
    } else {
      classificacaoReconciliacao = 'NOVO';
      decisaoUsuario = 'CRIAR';
      totalNovos++;
    }

    if (statusQualidade === 'ERRO') totalErros++;
    else if (statusQualidade === 'ATENCAO') totalAtencao++;

    registrosLinhas.push({
      indiceLinha: index + 1,
      dadosOriginais: linhaOriginal,
      dadosMapeados,
      statusQualidade,
      mensagensValidacao,
      duplicidadeDetectada,
      acaoDuplicidade,
      registroExistenteId,
      registroExistenteResumo,
      selecionadoParaImportar: statusQualidade !== 'ERRO' && classificacaoReconciliacao !== 'INVALIDO' && decisaoUsuario !== 'IGNORAR',
      classificacaoReconciliacao,
      camposDivergentes,
      dadosExistentesSnapshot,
      decisaoUsuario,
      pessoaAcao,
      pessoaIdVinculada,
      pessoaNomeVinculada,
      cursoAcao,
      cursoIdVinculado,
      documentoAcao,
      origemSugestao: 'AI_SUGGESTION',
      decisaoHumana: 'HUMAN_APPROVED',
    });
  });

  // ============================================================================
  // GERAÇÃO DE OPORTUNIDADES DE MELHORIA PÓS-IMPORTAÇÃO
  // ============================================================================

  if (qtdValidadeAusente > 0) {
    oportunidades.push({
      id: 'opp-val-ausente',
      tipo: 'VALIDADE_AUSENTE',
      titulo: `${qtdValidadeAusente} registros sem data de validade definida`,
      descricao: 'Treinamentos ou controles foram identificados sem prazo de expiração formal. Para conformidade regulatória aeronáutica (RBAC 145), certifique-se se o curso possui validade bienal ou é vitalício.',
      severidade: 'MEDIA',
      registrosAfetados: qtdValidadeAusente,
      acoesDisponiveis: ['CRIAR_ACAO', 'CORRIGIR_DADOS', 'IGNORAR'],
      status: 'PENDENTE',
    });
  }

  if (qtdSemEvidencia > 0) {
    oportunidades.push({
      id: 'opp-sem-evidencia',
      tipo: 'EVIDENCIA_AUSENTE',
      titulo: `${qtdSemEvidencia} registros sem certificado ou evidência anexada`,
      descricao: 'Para responder automaticamente a auditorias de clientes (Atlas Air, Kalitta Air), cada capacitação ou aferição deve possuir certificado rastreável vinculado.',
      severidade: 'ALTA',
      registrosAfetados: qtdSemEvidencia,
      acoesDisponiveis: ['CRIAR_ACAO', 'CORRIGIR_DADOS', 'IGNORAR'],
      status: 'PENDENTE',
    });
  }

  if (qtdFerramentaVencida > 0) {
    oportunidades.push({
      id: 'opp-calib-vencida',
      tipo: 'CALIBRACAO_VENCIDA_OU_PROXIMA',
      titulo: `${qtdFerramentaVencida} ferramenta(s) com calibração vencida detectada`,
      descricao: `Foram identificados instrumentos com prazo expirado (${ferramentasVencidasNomes.slice(0, 3).join(', ')}). Exige segregação imediata em quarentena conforme MOMQ 3.4.2 e abertura de RNC preventiva.`,
      severidade: 'CRITICA',
      registrosAfetados: qtdFerramentaVencida,
      detalhesLinhas: ferramentasVencidasNomes,
      acoesDisponiveis: ['CRIAR_RNC', 'CRIAR_ACAO', 'CORRIGIR_DADOS'],
      status: 'PENDENTE',
    });
  }

  if (qtdPessoasNaoCadastradas > 0) {
    oportunidades.push({
      id: 'opp-pessoas-novas',
      tipo: 'PESSOA_NAO_CADASTRADA',
      titulo: `${qtdPessoasNaoCadastradas} colaborador(es) não cadastrados formalmente`,
      descricao: 'A lista importada possui colaboradores que ainda não integram a Matriz de Pessoas do SGQ. A revisão humana permite criar ou vincular cada um.',
      severidade: 'BAIXA',
      registrosAfetados: qtdPessoasNaoCadastradas,
      acoesDisponiveis: ['CORRIGIR_DADOS', 'IGNORAR'],
      status: 'PENDENTE',
    });
  }

  const resumo: ResumoPreviaImportacao = {
    totalLinhas: linhasOriginais.length,
    registrosNovos: totalNovos,
    registrosAtualizacoes: totalAlterados,
    registrosDuplicados: totalDuplicidades,
    registrosComErro: totalErros,
    registrosComAtencao: totalAtencao,
    registrosIgnorados: totalIgnorados,
    evidenciasIdentificadas: totalEvidencias,
    registrosIguais: totalIguais,
    registrosAlterados: totalAlterados,
    possiveisDuplicidades: totalDuplicidades,
    registrosInvalidos: totalInvalidos,
  };

  return {
    registrosLinhas,
    resumo,
    oportunidades,
  };
}

// ============================================================================
// ADAPTAÇÃO ESPECIALIZADA DO FORMULÁRIO F 001-02-1 (4 COLUNAS ORIGINAIS)
// 1. Publicação, 2. Título, 3. Proprietário / Cessor, 4. Número e data da revisão
// Adaptação: Desdobra a 4ª coluna em "Número da Revisão" e "Data da Revisão"
// ============================================================================

export function adaptarTabelaFormularioF001021(
  colunas: string[],
  linhasDados: Record<string, any>[]
): { colunas: string[]; linhasDados: Record<string, any>[]; foiAdaptado: boolean } {
  if (!colunas || colunas.length === 0) {
    return { colunas, linhasDados, foiAdaptado: false };
  }

  const colunasNorm = colunas.map((c) => normalizarTexto(c));

  // Checa se a planilha já possui colunas separadas de revisão e data
  const jaTemColRevisao = colunasNorm.some((c) =>
    c === 'numero da revisao' || c === 'revisao' || c === 'rev' || c === 'revisao vigente' || c === 'em que revisao esta' || c === 'em que revisao'
  );
  const jaTemColData = colunasNorm.some((c) =>
    c === 'data da revisao' || c === 'data de aprovacao' || c === 'data revisao' || c === 'data' || c === 'data aprovacao' || c === 'data de revisao'
  );

  // Se já possui colunas separadas de revisão e data, NÃO altera as colunas da planilha do usuário
  if (jaTemColRevisao && jaTemColData) {
    return { colunas, linhasDados, foiAdaptado: false };
  }

  // Encontra se existe estritamente uma coluna combinada de "Número e data da revisão"
  const idxRevData = colunas.findIndex((c) => {
    const norm = normalizarTexto(c);
    return (
      norm.includes('numero e data') ||
      norm.includes('revisao e data') ||
      norm.includes('rev e data') ||
      norm.includes('revisao/data') ||
      norm.includes('revisao / data')
    );
  });

  const temPublicacao = colunasNorm.some((c) => c.includes('publica'));
  const temTitulo = colunasNorm.some((c) => c.includes('titulo'));
  const temProprietario = colunasNorm.some((c) => c.includes('proprietario') || c.includes('cessor'));
  const ehFormulario4Colunas = colunas.length === 4 && temPublicacao && temTitulo && temProprietario && idxRevData !== -1;

  // Se tem a coluna combinada de revisão+data especificamente identificada
  if (idxRevData !== -1 && (ehFormulario4Colunas || (!jaTemColRevisao && !jaTemColData))) {
    const colRevData = idxRevData !== -1 ? colunas[idxRevData] : '';
    const novasColunas = [...colunas];

    const temColNumRev = colunasNorm.some((c) => c === 'numero da revisao' || c === 'revisao vigente');
    const temColDataRev = colunasNorm.some((c) => c === 'data da revisao' || c === 'data de aprovacao' || c === 'data revisao');

    if (!temColNumRev) {
      novasColunas.push('Número da Revisão');
    }
    if (!temColDataRev) {
      novasColunas.push('Data da Revisão');
    }

    const linhasAdaptadas = (linhasDados || []).map((row) => {
      const novoRow = { ...row };

      const rawRevData = colRevData ? row[colRevData] : (row['Número e data da revisão'] || row['revisao'] || '');
      const { numeroRevisao, dataRevisao } = separarNumeroEDataRevisao(String(rawRevData || ''));

      if (!temColNumRev) {
        novoRow['Número da Revisão'] = numeroRevisao || 'Rev. 00';
      }
      if (!temColDataRev) {
        novoRow['Data da Revisão'] = dataRevisao || '';
      }

      // Garante que chaves com acentuação oficial estejam acessíveis
      if (!novoRow['Publicação'] && (row['publicacao'] || row['Publicacao'] || row['Publicação / Manual'])) {
        novoRow['Publicação'] = row['publicacao'] || row['Publicacao'] || row['Publicação / Manual'];
      }
      if (!novoRow['Título'] && (row['titulo'] || row['Titulo'] || row['Título da Publicação'])) {
        novoRow['Título'] = row['titulo'] || row['Titulo'] || row['Título da Publicação'];
      }
      if (!novoRow['Proprietário / Cessor'] && (row['proprietarioCessor'] || row['Proprietário'] || row['Cessor'] || row['Proprietário ou Cessor'])) {
        novoRow['Proprietário / Cessor'] = row['proprietarioCessor'] || row['Proprietário'] || row['Cessor'] || row['Proprietário ou Cessor'];
      }
      if (!novoRow['Número e data da revisão'] && rawRevData) {
        novoRow['Número e data da revisão'] = String(rawRevData);
      }

      return novoRow;
    });

    return {
      colunas: novasColunas,
      linhasDados: linhasAdaptadas,
      foiAdaptado: true,
    };
  }

  return { colunas, linhasDados, foiAdaptado: false };
}

// ============================================================================
// PARSER INTELIGENTE DE ESTRUTURAS TABULARES & PRÉ-CABEÇALHOS
// ============================================================================

export function detectarEstruturaTabular(
  matrizLinhas: any[][],
  linhaCabecalhoManual?: number
): {
  linhaCabecalhoNumero: number; // 1-indexed para o usuário
  linhaCabecalhoIndex: number; // 0-indexed
  linhasPreambulo: string[];
  colunas: string[];
  linhasDados: Record<string, any>[];
  linhasRodape: string[];
} {
  if (!matrizLinhas || matrizLinhas.length === 0) {
    return {
      linhaCabecalhoNumero: 1,
      linhaCabecalhoIndex: 0,
      linhasPreambulo: [],
      colunas: [],
      linhasDados: [],
      linhasRodape: [],
    };
  }

  // Se o usuário solicitou uma linha específica manualmente (1-indexed)
  if (linhaCabecalhoManual && linhaCabecalhoManual >= 1 && linhaCabecalhoManual <= matrizLinhas.length) {
    const idx = linhaCabecalhoManual - 1;
    const preambulo: string[] = [];
    for (let i = 0; i < idx; i++) {
      const textoLinha = matrizLinhas[i]
        .map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
        .filter(Boolean)
        .join(' — ');
      if (textoLinha) preambulo.push(textoLinha);
    }

    const colunasCruas = matrizLinhas[idx] || [];
    const colunas: string[] = [];
    colunasCruas.forEach((val, cIdx) => {
      const nome = val !== null && val !== undefined ? String(val).trim() : '';
      colunas.push(nome || `Coluna_${cIdx + 1}`);
    });

    const linhasDados: Record<string, any>[] = [];
    const linhasRodape: string[] = [];

    for (let r = idx + 1; r < matrizLinhas.length; r++) {
      const row = matrizLinhas[r] || [];
      const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmpties.length === 0) continue;

      // Detecta possíveis rodapés
      const primeiroTexto = String(nonEmpties[0] || '').toLowerCase();
      if (
        nonEmpties.length <= 2 &&
        (primeiroTexto.startsWith('observa') ||
          primeiroTexto.startsWith('aprovado') ||
          primeiroTexto.startsWith('total') ||
          primeiroTexto.startsWith('assinatura') ||
          primeiroTexto.startsWith('nota:'))
      ) {
        linhasRodape.push(nonEmpties.join(' — '));
        continue;
      }

      const item: Record<string, any> = {};
      colunas.forEach((col, cIdx) => {
        item[col] = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]).trim() : '';
      });
      linhasDados.push(item);
    }

    const adaptadoManual = adaptarTabelaFormularioF001021(colunas, linhasDados);

    return {
      linhaCabecalhoNumero: linhaCabecalhoManual,
      linhaCabecalhoIndex: idx,
      linhasPreambulo: preambulo,
      colunas: adaptadoManual.colunas,
      linhasDados: adaptadoManual.linhasDados,
      linhasRodape,
    };
  }

  // Dicionário ampliado de sinônimos para identificação do cabeçalho
  const sinonimosCabecalho = [
    'codigo', 'patrimonio', 'descricao', 'instrumento', 'ferramenta', 'modelo', 'fabricante',
    'serie', 'numero serie', 'n serie', 'validade', 'calibracao', 'proxima calibracao', 'ultima calibracao',
    'laboratorio', 'rbc', 'certificado', 'tolerancia', 'setor', 'funcionario', 'colaborador', 'pessoa',
    'nome', 'matricula', 'curso', 'treinamento', 'capacitacao', 'realizacao', 'carga horaria',
    'documento', 'revisao', 'rev', 'vigencia', 'titulo', 'situacao', 'status',
    'publicacao', 'publicação', 'proprietario', 'proprietário', 'cessor',
    'numero e data', 'revisao e data', 'numero da revisao', 'data da revisao'
  ];

  let melhorScore = -1;
  let melhorLinhaIndex = 0;

  const limiteVarredura = Math.min(matrizLinhas.length - 1, 25);

  for (let r = 0; r <= limiteVarredura; r++) {
    const row = matrizLinhas[r] || [];
    const celulasNaoVazias = row
      .map((c) => (c !== null && c !== undefined ? String(c).trim() : ''))
      .filter((s) => s.length > 0);

    if (celulasNaoVazias.length < 2) {
      // Linhas com 0 ou 1 célula quase certamente são títulos institucionais
      continue;
    }

    let matchCount = 0;
    celulasNaoVazias.forEach((celula) => {
      const norm = normalizarTexto(celula);
      if (sinonimosCabecalho.some((sin) => norm === sin || norm.includes(sin) || sin.includes(norm))) {
        matchCount++;
      }
    });

    // Linhas seguintes devem conter dados para confirmar que esta linha é o cabeçalho
    const proximaLinha = matrizLinhas[r + 1] || [];
    const celulasProx = proximaLinha.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    const temDadosDepois = celulasProx.length >= 2;

    const score = matchCount * 25 + celulasNaoVazias.length * 4 + (temDadosDepois ? 20 : 0);

    if (score > melhorScore && matchCount >= 1) {
      melhorScore = score;
      melhorLinhaIndex = r;
    }
  }

  // Fallback: se nenhum sinônimo bateu, procura a primeira linha com >= 2 células distintas
  if (melhorScore <= 0) {
    for (let r = 0; r <= limiteVarredura; r++) {
      const row = matrizLinhas[r] || [];
      const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmpties.length >= 3) {
        melhorLinhaIndex = r;
        break;
      }
    }
  }

  // Coleta preâmbulo (todas as linhas anteriores ao cabeçalho)
  const linhasPreambulo: string[] = [];
  for (let i = 0; i < melhorLinhaIndex; i++) {
    const texto = matrizLinhas[i]
      .map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
      .filter(Boolean)
      .join(' — ');
    if (texto) linhasPreambulo.push(texto);
  }

  // Extrai colunas
  const colunasRow = matrizLinhas[melhorLinhaIndex] || [];
  const colunasContagem: Record<string, number> = {};
  const colunas: string[] = [];

  colunasRow.forEach((val, idx) => {
    let col = val !== null && val !== undefined ? String(val).trim().replace(/\r?\n/g, ' ') : '';
    if (!col) col = `Coluna_${idx + 1}`;
    if (colunasContagem[col]) {
      colunasContagem[col]++;
      col = `${col}_${colunasContagem[col]}`;
    } else {
      colunasContagem[col] = 1;
    }
    colunas.push(col);
  });

  // Extrai linhas de dados e rodapés
  const linhasDados: Record<string, any>[] = [];
  const linhasRodape: string[] = [];

  for (let r = melhorLinhaIndex + 1; r < matrizLinhas.length; r++) {
    const row = matrizLinhas[r] || [];
    const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmpties.length === 0) continue;

    const primeiroTexto = String(nonEmpties[0] || '').toLowerCase();
    if (
      nonEmpties.length <= 3 &&
      (primeiroTexto.startsWith('observa') ||
        primeiroTexto.startsWith('aprovado') ||
        primeiroTexto.startsWith('elaborado') ||
        primeiroTexto.startsWith('revisado') ||
        primeiroTexto.startsWith('total') ||
        primeiroTexto.startsWith('assinatura') ||
        primeiroTexto.startsWith('nota:') ||
        primeiroTexto.startsWith('f 001') ||
        primeiroTexto.startsWith('f-001') ||
        primeiroTexto.startsWith('página') ||
        primeiroTexto.startsWith('pag.') ||
        primeiroTexto.startsWith('confidencial') ||
        primeiroTexto.includes('controle de documentações') ||
        primeiroTexto.includes('impacto aviation'))
    ) {
      linhasRodape.push(nonEmpties.join(' — '));
      continue;
    }

    // Ignora cabeçalhos repetidos em quebras de página
    const isRepeatedHeader =
      nonEmpties.length >= 2 &&
      nonEmpties.every((cell, idx) => {
        const colNorm = normalizarTexto(colunas[idx] || '');
        const cellNorm = normalizarTexto(String(cell));
        return colNorm && cellNorm && (colNorm === cellNorm || colNorm.includes(cellNorm) || cellNorm.includes(colNorm));
      });
    if (isRepeatedHeader) continue;

    const item: Record<string, any> = {};
    colunas.forEach((col, cIdx) => {
      item[col] = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]).trim() : '';
    });
    linhasDados.push(item);
  }

  const adaptado = adaptarTabelaFormularioF001021(colunas, linhasDados);

  return {
    linhaCabecalhoNumero: melhorLinhaIndex + 1,
    linhaCabecalhoIndex: melhorLinhaIndex,
    linhasPreambulo,
    colunas: adaptado.colunas,
    linhasDados: adaptado.linhasDados,
    linhasRodape,
  };
}

// ============================================================================
// PARSER DE ARQUIVOS (XLSX, XLS, CSV, DOCX, PDF, JSON) COM INTELIGÊNCIA DE CABEÇALHOS
// ============================================================================

export async function processarArquivoBruto(
  arquivo: File | { name: string; data: Uint8Array | string; type?: string; linhaCabecalhoManual?: number },
  linhaCabecalhoManual?: number
): Promise<{
  nomeArquivo: string;
  tamanhoBytes: number;
  tipoArquivo: 'XLSX' | 'XLS' | 'CSV' | 'DOCX' | 'PDF' | 'JSON';
  colunas: string[];
  linhas: Record<string, any>[];
  hashSha256: string;
  linhaCabecalhoDetectada: number;
  linhasPreambuloDetectadas: string[];
  linhasRodapeDetectadas: string[];
  conteudoTextoBruto?: string;
  totalLinhasBrutas: number;
  matrizLinhasBrutas?: any[][];
}> {
  let nomeArquivo = '';
  let tamanhoBytes = 0;
  let buffer: Uint8Array;
  const linhaForcada = linhaCabecalhoManual || ('linhaCabecalhoManual' in arquivo ? arquivo.linhaCabecalhoManual : undefined);

  if (arquivo instanceof File) {
    nomeArquivo = arquivo.name;
    tamanhoBytes = arquivo.size;
    const arrayBuffer = await arquivo.arrayBuffer();
    buffer = new Uint8Array(arrayBuffer);
  } else {
    nomeArquivo = arquivo.name;
    if (typeof arquivo.data === 'string') {
      buffer = new TextEncoder().encode(arquivo.data);
    } else {
      buffer = arquivo.data;
    }
    tamanhoBytes = buffer.length;
  }

  const hashSha256 = await calcularHashSha256(buffer);

  const ext = nomeArquivo.split('.').pop()?.toLowerCase() || '';
  let tipoArquivo: 'XLSX' | 'XLS' | 'CSV' | 'DOCX' | 'PDF' | 'JSON' = 'XLSX';

  if (ext === 'csv') tipoArquivo = 'CSV';
  else if (ext === 'xls') tipoArquivo = 'XLS';
  else if (ext === 'docx') tipoArquivo = 'DOCX';
  else if (ext === 'pdf') tipoArquivo = 'PDF';
  else if (ext === 'json') tipoArquivo = 'JSON';

  // 1. Processamento de Planilhas (XLSX, XLS, CSV) via biblioteca XLSX
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const primeiroNomeAba = workbook.SheetNames[0];
    const sheet = workbook.Sheets[primeiroNomeAba];
    
    // Converte a aba inteira para matriz bruta 2D
    const matrizBruta: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    const estrutura = detectarEstruturaTabular(matrizBruta, linhaForcada);

    return {
      nomeArquivo,
      tamanhoBytes,
      tipoArquivo,
      colunas: estrutura.colunas,
      linhas: estrutura.linhasDados,
      hashSha256,
      linhaCabecalhoDetectada: estrutura.linhaCabecalhoNumero,
      linhasPreambuloDetectadas: estrutura.linhasPreambulo,
      linhasRodapeDetectadas: estrutura.linhasRodape,
      totalLinhasBrutas: matrizBruta.length,
      matrizLinhasBrutas: matrizBruta.slice(0, 40),
    };
  }

  // 2. Processamento de JSON estruturado
  if (ext === 'json') {
    const texto = new TextDecoder().decode(buffer);
    try {
      const parsed = JSON.parse(texto);
      const linhasJson = Array.isArray(parsed) ? parsed : [parsed];
      const colunas = linhasJson.length > 0 ? Object.keys(linhasJson[0]) : [];
      return {
        nomeArquivo,
        tamanhoBytes,
        tipoArquivo: 'JSON',
        colunas,
        linhas: linhasJson,
        hashSha256,
        linhaCabecalhoDetectada: 1,
        linhasPreambuloDetectadas: [],
        linhasRodapeDetectadas: [],
        conteudoTextoBruto: texto,
        totalLinhasBrutas: linhasJson.length,
      };
    } catch (e) {
      console.warn('JSON parse fallback:', e);
    }
  }

  // 3. Processamento de DOCX / PDF / Arquivos de Texto com tabela
  const textoSimples = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const linhasTexto = textoSimples.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Verificar se há linhas tabulares com separadores (pipe, tabulação, ponto-e-vírgula)
  const matrizTexto: string[][] = [];
  linhasTexto.forEach((linha) => {
    if (linha.includes('|')) {
      // Ex: | Código | Descrição | Nº Série | Validade |
      const partes = linha.split('|').map((p) => p.trim()).filter((p, idx, arr) => {
        // Ignora bordas vazias de tabelas markdown
        if ((idx === 0 || idx === arr.length - 1) && p === '') return false;
        return true;
      });
      // Pular separadores como |---|---|
      if (partes.length > 1 && !partes.every((p) => /^[-:]+$/.test(p))) {
        matrizTexto.push(partes);
      }
    } else if (linha.includes('\t')) {
      matrizTexto.push(linha.split('\t').map((p) => p.trim()));
    } else if (linha.includes(';')) {
      matrizTexto.push(linha.split(';').map((p) => p.trim()));
    } else {
      matrizTexto.push([linha]);
    }
  });

  if (matrizTexto.length > 0 && matrizTexto.some((m) => m.length >= 2)) {
    const estrutura = detectarEstruturaTabular(matrizTexto, linhaForcada);
    return {
      nomeArquivo,
      tamanhoBytes,
      tipoArquivo,
      colunas: estrutura.colunas,
      linhas: estrutura.linhasDados,
      hashSha256,
      linhaCabecalhoDetectada: estrutura.linhaCabecalhoNumero,
      linhasPreambuloDetectadas: estrutura.linhasPreambulo,
      linhasRodapeDetectadas: estrutura.linhasRodape,
      conteudoTextoBruto: textoSimples,
      totalLinhasBrutas: matrizTexto.length,
      matrizLinhasBrutas: matrizTexto.slice(0, 40),
    };
  }

  // Fallback para documento sem tabela detectada
  return {
    nomeArquivo,
    tamanhoBytes,
    tipoArquivo,
    colunas: ['Conteúdo', 'Linha', 'Observação'],
    linhas: [
      {
        Conteúdo: `Documento ${nomeArquivo} processado para extração via IA`,
        Linha: '1',
        Observação: 'Utilize análise inteligente assistida.',
      },
    ],
    hashSha256,
    linhaCabecalhoDetectada: 1,
    linhasPreambuloDetectadas: [],
    linhasRodapeDetectadas: [],
    conteudoTextoBruto: textoSimples,
    totalLinhasBrutas: 1,
  };
}
