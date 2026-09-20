import * as XLSX from 'xlsx';
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

export function normalizarStatusColaborador(valor: any): StatusColaborador {
  if (!valor) return 'ATIVO';
  const str = String(valor).trim().toUpperCase();
  if (str.includes('INATIV') || str === 'OFF' || str === 'NAO' || str === 'N' || str === '0') return 'INATIVO';
  if (str.includes('AFAST') || str.includes('LICEN')) return 'AFASTADO';
  if (str.includes('SUSP')) return 'SUSPENSO';
  if (str.includes('RESTRIT') || str.includes('LIMIT')) return 'RESTRITO';
  if (str.includes('DESLIG') || str.includes('DEMIT') || str.includes('RESCIS')) return 'DESLIGADO';
  if (str.includes('ATIV') || str === 'SIM' || str === 'S' || str === 'OK' || str === '1') return 'ATIVO';
  return 'OUTRO';
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
      sinonimos: ['patrimonio', 'codigo', 'tag', 'id', 'identificacao', 'num patrimonio', 'cod ferramenta'],
      descricao: 'Identificador único da ferramenta na oficina (ex: TQ-023, MULT-004)',
    },
    {
      campo: 'descricao',
      label: 'Descrição do Instrumento',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['descricao', 'instrumento', 'ferramenta', 'equipamento', 'nome', 'item', 'tipo'],
      descricao: 'Nome técnico e faixa de medição do instrumento (ex: Torquímetro de Estalo 20-100 Nm)',
    },
    {
      campo: 'fabricante',
      label: 'Fabricante',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['fabricante', 'marca', 'fornecedor', 'manufaturador'],
      descricao: 'Fabricante original do instrumento (ex: Stahlwille, Snap-on, Fluke, Mitutoyo)',
    },
    {
      campo: 'modelo',
      label: 'Modelo',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['modelo', 'part number', 'pn', 'tipo modelo'],
      descricao: 'Modelo comercial ou part number do instrumento',
    },
    {
      campo: 'numeroSerie',
      label: 'Número de Série (S/N)',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['serie', 'numero de serie', 'sn', 's/n', 'serial', 'nr serie'],
      descricao: 'Número de série gravado no instrumento para rastreabilidade metrológica',
    },
    {
      campo: 'setor',
      label: 'Setor / Oficina Alocada',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['setor', 'oficina', 'local', 'localizacao', 'area', 'base', 'hangar'],
      descricao: 'Setor operacional onde a ferramenta é utilizada ou custodiada',
    },
    {
      campo: 'dataUltimaCalibracao',
      label: 'Data da Última Calibração',
      tipo: 'date',
      obrigatorio: true,
      sinonimos: ['ultima calibracao', 'data calibracao', 'calibrado em', 'data afericao', 'afericao'],
      descricao: 'Data em que o instrumento foi aferido pelo laboratório credenciado',
    },
    {
      campo: 'dataProximaCalibracao',
      label: 'Data da Próxima Calibração (Validade)',
      tipo: 'date',
      obrigatorio: true,
      sinonimos: ['proxima calibracao', 'validade', 'vencimento', 'validade calibracao', 'expiracao'],
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
      sinonimos: ['laboratorio', 'calibrador', 'entidade rbc', 'lab', 'laboratorio acreditado'],
      descricao: 'Laboratório credenciado pela Rede Brasileira de Calibração (RBC/Inmetro/NIST)',
    },
    {
      campo: 'numeroCertificado',
      label: 'Nº do Certificado de Calibração',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['certificado', 'numero certificado', 'nr cert', 'laudo', 'relatorio calibracao'],
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
      label: 'Código do Documento',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['codigo', 'codigo documento', 'numero', 'identificador', 'doc id', 'cod'],
      descricao: 'Identificador formal do documento (ex: MOMQ, MPO-04, IT-MNT-12)',
    },
    {
      campo: 'titulo',
      label: 'Título Oficial do Documento',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['titulo', 'nome documento', 'descricao', 'denominacao', 'documento'],
      descricao: 'Nome por extenso do manual, instrução de trabalho ou política técnica',
    },
    {
      campo: 'tipoDocumento',
      label: 'Tipo / Categoria Documental',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['tipo', 'categoria', 'classificacao', 'natureza'],
      descricao: 'Categoria documental (Manual da Qualidade, Procedimento Operacional, Formulário, IT)',
    },
    {
      campo: 'numeroRevisao',
      label: 'Revisão Vigente',
      tipo: 'string',
      obrigatorio: true,
      sinonimos: ['revisao', 'rev', 'revisao atual', 'versao', 'edicao'],
      descricao: 'Número ou letra da revisão atualmente aprovada (ex: Rev. 05, Rev. B)',
    },
    {
      campo: 'dataAprovacao',
      label: 'Data de Aprovação / Vigência',
      tipo: 'date',
      obrigatorio: true,
      sinonimos: ['data aprovacao', 'data vigencia', 'vigente desde', 'aprovado em', 'data revisao', 'data'],
      descricao: 'Data de entrada em vigor da revisão atual',
    },
    {
      campo: 'dataProximaRevisao',
      label: 'Data da Próxima Revisão',
      tipo: 'date',
      obrigatorio: false,
      sinonimos: ['proxima revisao', 'validade', 'vencimento', 'revisao prevista', 'expiracao'],
      descricao: 'Data limite para revisão periódica obrigatória',
    },
    {
      campo: 'responsavel',
      label: 'Responsável / Elaborador',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['responsavel', 'elaborador', 'autor', 'aprovador', 'gestor'],
      descricao: 'Nome ou cargo do profissional responsável técnico pela elaboração/aprovação',
    },
    {
      campo: 'status',
      label: 'Status do Documento',
      tipo: 'string',
      obrigatorio: false,
      sinonimos: ['status', 'situacao', 'vigencia', 'estado'],
      descricao: 'Condição do documento (Vigente, Em Revisão, Obsoleto, Cancelado)',
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
  const palavrasDocColunas = ['documento', 'revisao', 'rev', 'vigencia', 'aprovacao', 'codigo doc', 'manual', 'procedimento', 'instrucao', 'master list', 'elaborador'];
  const palavrasDocValores = ['momq', 'mpo', 'sgq', 'it mnt', 'procedimento operacional', 'rev 0', 'rev 1', 'vigente', 'obsoleto', 'aprovado'];

  palavrasDocColunas.forEach((p) => {
    if (colunasNorm.some((c) => c.includes(p))) pontuacoes.CONTROLE_DOCUMENTAL += 15;
  });
  palavrasDocValores.forEach((p) => {
    if (valoresAmostraTexto.includes(p)) pontuacoes.CONTROLE_DOCUMENTAL += 10;
  });
  if (nomeNorm.includes('docum') || nomeNorm.includes('master') || nomeNorm.includes('manual') || nomeNorm.includes('procediment')) {
    pontuacoes.CONTROLE_DOCUMENTAL += 20;
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
    finalidadeProvavel = 'Lista Mestra (Master List) de documentos controlados, manuais técnicos e histórico de revisões';
    explicacao = `Identificados campos de codificação de manuais/procedimentos, números de revisão e controle de vigência com ${confianca}% de aderência.`;
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
// MAPEAMENTO AUTOMÁTICO DE COLUNAS
// ============================================================================

export function gerarMapeamentoAutomaticoCampos(
  colunas: string[],
  tipoControle: TipoControleImportacao,
  amostraLinhas: Record<string, any>[] = []
): MapeamentoCampoItem[] {
  const definicoes = ESQUEMA_CAMPOS_CONTROLE[tipoControle] || ESQUEMA_CAMPOS_CONTROLE.OUTROS;
  const mapeamentos: MapeamentoCampoItem[] = [];

  colunas.forEach((colunaOriginal) => {
    const colNorm = normalizarTexto(colunaOriginal);
    let melhorMatch: DefinicaoCampoQualigest | null = null;
    let maiorScore = 0;

    definicoes.forEach((def) => {
      // Comparação direta com o campo ou label
      if (colNorm === normalizarTexto(def.campo) || colNorm === normalizarTexto(def.label)) {
        melhorMatch = def;
        maiorScore = 100;
        return;
      }

      // Comparação com lista de sinônimos
      def.sinonimos.forEach((sinonimo) => {
        const sinNorm = normalizarTexto(sinonimo);
        if (colNorm === sinNorm) {
          if (95 > maiorScore) {
            maiorScore = 95;
            melhorMatch = def;
          }
        } else if (colNorm.includes(sinNorm) || sinNorm.includes(colNorm)) {
          const score = 80;
          if (score > maiorScore) {
            maiorScore = score;
            melhorMatch = def;
          }
        }
      });
    });

    const exemploValor = amostraLinhas.length > 0 && amostraLinhas[0][colunaOriginal] !== undefined
      ? String(amostraLinhas[0][colunaOriginal])
      : undefined;

    if (melhorMatch && maiorScore >= 70) {
      const matchDef = melhorMatch as DefinicaoCampoQualigest;
      mapeamentos.push({
        colunaOrigem: colunaOriginal,
        campoQualigest: matchDef.campo,
        campoLabel: matchDef.label,
        obrigatorio: matchDef.obrigatorio,
        tipoDado: matchDef.tipo,
        confiancaIA: maiorScore,
        exemploValor,
        descricao: matchDef.descricao,
        classificacaoUso: matchDef.obrigatorio ? 'OBRIGATORIO' : 'OPCIONAL',
        sugestaoIA: matchDef.obrigatorio ? 'OBRIGATORIO' : 'OPCIONAL',
      });
    } else {
      // Campo não mapeado por padrão
      mapeamentos.push({
        colunaOrigem: colunaOriginal,
        campoQualigest: 'ignorar',
        campoLabel: '(Ignorar Coluna)',
        obrigatorio: false,
        tipoDado: 'string',
        confiancaIA: 40,
        exemploValor,
        descricao: 'Não mapeado automaticamente. Selecione um campo ou mantenha ignorado.',
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

  const colunasNorm = colunas.map((c) => normalizarTexto(c));

  for (const template of templates) {
    const templateColunasNorm = template.colunasDetectadas.map((c) => normalizarTexto(c));
    // Verifica interseção de colunas
    const correspondencias = colunasNorm.filter((c) => templateColunasNorm.includes(c));
    const percentualAcerto = correspondencias.length / Math.max(colunasNorm.length, templateColunasNorm.length);

    if (percentualAcerto >= 0.75) {
      // Template reconhecido!
      return {
        templateEncontrado: template,
        mapeamentoSugerido: template.mapeamentos,
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

function validarDataISO(valor: any): { valida: boolean; isoString?: string } {
  if (!valor) return { valida: false };
  const str = String(valor).trim();
  
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

  // Testar padrão DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
        const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { valida: true, isoString: iso };
      }
    }
    return { valida: false };
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

    // 1. Validar campos obrigatórios
    for (const campoObrigatorio of camposObrigatorios) {
      const val = dadosMapeados[campoObrigatorio];
      if (!val || val === '') {
        statusQualidade = 'ERRO';
        const def = definicoes.find((d) => d.campo === campoObrigatorio);
        mensagensValidacao.push(`Campo obrigatório ausente: '${def?.label || campoObrigatorio}'.`);
      }
    }

    // 2. Validar tipos de dados e datas
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
                mensagensValidacao.push(
                  `Novo mecânico/colaborador identificado: "${dadosMapeados.pessoaNome}". Será cadastrado oficialmente em Pessoas & Competências após aprovação.`
                );
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
            // Checar se existe treinamento do mesmo curso com data diferente
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
              classificacaoReconciliacao = 'NOVO';
              decisaoUsuario = 'CRIAR';
              acaoDuplicidade = 'CRIAR_NOVO';
              totalNovos++;
              mensagensValidacao.push(`Nova reciclagem periódica do treinamento "${dadosMapeados.cursoTitulo}" para ${dadosMapeados.pessoaNome}. O histórico anterior será preservado.`);
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
            mensagensValidacao.push(`Documento já existe no Controle Documental. A importação registrará a nova revisão histórica (${dadosMapeados.revisaoNumero || 'Nova'}).`);
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

    return {
      linhaCabecalhoNumero: linhaCabecalhoManual,
      linhaCabecalhoIndex: idx,
      linhasPreambulo: preambulo,
      colunas,
      linhasDados,
      linhasRodape,
    };
  }

  // Dicionário ampliado de sinônimos para identificação do cabeçalho
  const sinonimosCabecalho = [
    'codigo', 'patrimonio', 'descricao', 'instrumento', 'ferramenta', 'modelo', 'fabricante',
    'serie', 'numero serie', 'n serie', 'validade', 'calibracao', 'proxima calibracao', 'ultima calibracao',
    'laboratorio', 'rbc', 'certificado', 'tolerancia', 'setor', 'funcionario', 'colaborador', 'pessoa',
    'nome', 'matricula', 'curso', 'treinamento', 'capacitacao', 'realizacao', 'carga horaria',
    'documento', 'revisao', 'rev', 'vigencia', 'titulo', 'situacao', 'status'
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

  return {
    linhaCabecalhoNumero: melhorLinhaIndex + 1,
    linhaCabecalhoIndex: melhorLinhaIndex,
    linhasPreambulo,
    colunas,
    linhasDados,
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
