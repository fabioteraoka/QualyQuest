/**
 * Validador e Normalizador do Schema Oficial de Importação JSON para Manuais Técnicos
 * Acervo de IA — QualyQuest SGQ
 */

import type { ManualStructuredImportJSON, SecaoImportacaoJSON } from '../../types/aiKnowledgeBase.ts';

export interface ResultadoValidacaoJSON {
  valido: boolean;
  erros: string[];
  avisos: string[];
  dadosNormalizados?: ManualStructuredImportJSON;
  linhaErroSintaxe?: number;
  colunaErroSintaxe?: number;
}

/**
 * Valida a sintaxe pura do JSON com indicação aproximada de linha/coluna
 */
export function validarSintaxeJSON(jsonStr: string): { valido: boolean; dados?: any; erro?: string; linha?: number; coluna?: number } {
  if (!jsonStr || jsonStr.trim().length === 0) {
    return { valido: false, erro: 'O arquivo JSON está vazio ou contém apenas espaços em branco.' };
  }

  try {
    const dados = JSON.parse(jsonStr);
    return { valido: true, dados };
  } catch (err: any) {
    const mensagem = err.message || 'Erro de sintaxe JSON';
    // Tenta extrair linha/posição da mensagem de erro do V8
    let linha: number | undefined;
    let coluna: number | undefined;
    const matchPos = mensagem.match(/position\s+(\d+)/i);
    if (matchPos && matchPos[1]) {
      const pos = parseInt(matchPos[1], 10);
      const atePos = jsonStr.substring(0, pos);
      linha = atePos.split('\n').length;
      coluna = pos - atePos.lastIndexOf('\n');
    }

    return {
      valido: false,
      erro: `Erro de sintaxe JSON: ${mensagem}`,
      linha,
      coluna,
    };
  }
}

/**
 * Valida o schema estruturado de um manual técnico em formato JSON
 * Conforme o Schema Oficial da Seção 7 da especificação.
 */
export function validarSchemaManualJSON(dados: any): ResultadoValidacaoJSON {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return {
      valido: false,
      erros: ['A raiz do arquivo JSON deve ser um objeto estruturado contendo as propriedades "documento" e "secoes".'],
      avisos: [],
    };
  }

  // 1. Validação do bloco "documento"
  if (!dados.documento || typeof dados.documento !== 'object' || Array.isArray(dados.documento)) {
    erros.push('Propriedade obrigatória ausente ou inválida: "documento". É necessário um objeto com os metadados do manual.');
  } else {
    const doc = dados.documento;

    // Código do documento
    if (!doc.codigo || typeof doc.codigo !== 'string' || doc.codigo.trim().length === 0) {
      erros.push('Campo obrigatório ausente: "documento.codigo" deve ser uma string não vazia (ex: "MOMQ", "MNT-001", "RBAC 145").');
    }

    // Título ou Nome
    const tituloFinal = (doc.titulo || doc.nome || '').trim();
    if (!tituloFinal) {
      erros.push('Campo obrigatório ausente: "documento.titulo" ou "documento.nome" deve conter o título completo do manual.');
    }

    // Revisão
    if (!doc.revisao || typeof doc.revisao !== 'string' || doc.revisao.trim().length === 0) {
      erros.push('Campo obrigatório ausente: "documento.revisao" deve ser uma string identificando a revisão (ex: "Rev. 14", "07", "Emenda 03").');
    }

    // Validações secundárias de formato de datas
    if (doc.dataVigencia && typeof doc.dataVigencia === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}/.test(doc.dataVigencia)) {
        avisos.push(`Data de vigência "${doc.dataVigencia}" em formato não padrão (recomendado: YYYY-MM-DD).`);
      }
    }
  }

  // 2. Validação do bloco "secoes"
  if (!dados.secoes) {
    erros.push('Propriedade obrigatória ausente: "secoes". O arquivo deve conter uma lista com as seções e subitens do manual.');
  } else if (!Array.isArray(dados.secoes)) {
    erros.push('Propriedade "secoes" deve ser um array com a lista de requisitos/itens do documento.');
  } else if (dados.secoes.length === 0) {
    erros.push('A lista de "secoes" está vazia. O manual deve conter ao menos 1 seção/subitem estruturado com conteúdo integral.');
  } else {
    // Validar cada seção individualmente
    dados.secoes.forEach((sec: any, idx: number) => {
      const prefixo = `secoes[${idx}]`;

      if (!sec || typeof sec !== 'object' || Array.isArray(sec)) {
        erros.push(`${prefixo} deve ser um objeto estruturado com capitulo, secao, subitem, titulo e conteudo.`);
        return;
      }

      // Capítulo
      if (sec.capitulo === undefined || sec.capitulo === null || String(sec.capitulo).trim().length === 0) {
        erros.push(`${prefixo}: campo obrigatório "capitulo" não informado (ex: "2" ou "Capítulo 2").`);
      }

      // Seção
      if (sec.secao === undefined || sec.secao === null || String(sec.secao).trim().length === 0) {
        erros.push(`${prefixo}: campo obrigatório "secao" não informado (ex: "2.4").`);
      }

      // Subitem
      if (sec.subitem === undefined || sec.subitem === null || String(sec.subitem).trim().length === 0) {
        erros.push(`${prefixo}: campo obrigatório "subitem" não informado (ex: "2.4.3").`);
      }

      // Título
      if (!sec.titulo || typeof sec.titulo !== 'string' || sec.titulo.trim().length === 0) {
        erros.push(`${prefixo}: campo obrigatório "titulo" não informado ou vazio.`);
      }

      // Conteúdo
      if (!sec.conteudo || typeof sec.conteudo !== 'string' || sec.conteudo.trim().length === 0) {
        erros.push(`${prefixo}: campo obrigatório "conteudo" não informado ou vazio. O texto integral do requisito deve ser fornecido.`);
      } else if (sec.conteudo.trim().length < 10) {
        avisos.push(`${prefixo} (Subitem ${sec.subitem}): conteúdo textual muito curto (${sec.conteudo.trim().length} caracteres).`);
      }

      // Página (opcional, mas deve ser válida se fornecida)
      if (sec.pagina !== undefined && sec.pagina !== null) {
        const pagNum = Number(sec.pagina);
        if (isNaN(pagNum) || pagNum < 0) {
          avisos.push(`${prefixo}: "pagina" informada ("${sec.pagina}") não é um número válido.`);
        }
      }

      // Tabelas opcionais
      if (sec.tabelas && !Array.isArray(sec.tabelas)) {
        avisos.push(`${prefixo}: campo "tabelas" deve ser um array.`);
      }
    });
  }

  // Se houver erros, interrompe
  if (erros.length > 0) {
    return {
      valido: false,
      erros,
      avisos,
    };
  }

  // 3. Normalização dos dados válidos
  const docBruto = dados.documento;
  const secoesNormalizadas: SecaoImportacaoJSON[] = dados.secoes.map((s: any) => {
    return {
      capitulo: String(s.capitulo).trim(),
      capituloTitulo: s.capituloTitulo ? String(s.capituloTitulo).trim() : undefined,
      secao: String(s.secao).trim(),
      subitem: String(s.subitem).trim(),
      pagina: s.pagina !== undefined && s.pagina !== null && !isNaN(Number(s.pagina)) ? Number(s.pagina) : undefined,
      titulo: String(s.titulo).trim(),
      conteudo: String(s.conteudo).trim(),
      tabelas: Array.isArray(s.tabelas) ? s.tabelas : undefined,
      palavrasChave: Array.isArray(s.palavrasChave) ? s.palavrasChave.map((k: any) => String(k).trim()) : undefined,
      procedimentoRelacionado: s.procedimentoRelacionado ? String(s.procedimentoRelacionado).trim() : undefined,
      responsabilidade: s.responsabilidade
        ? String(s.responsabilidade).trim()
        : Array.isArray(s.responsabilidades)
        ? s.responsabilidades.join(', ')
        : (s.responsabilidades ? String(s.responsabilidades).trim() : undefined),
      controlePrevisto: s.controlePrevisto
        ? String(s.controlePrevisto).trim()
        : Array.isArray(s.controlesObrigatorios)
        ? s.controlesObrigatorios.join(', ')
        : (s.controlesObrigatorios ? String(s.controlesObrigatorios).trim() : undefined),
      evidenciaDocumental: s.evidenciaDocumental
        ? String(s.evidenciaDocumental).trim()
        : Array.isArray(s.evidenciasExigidas)
        ? s.evidenciasExigidas.join(', ')
        : (s.evidenciasExigidas ? String(s.evidenciasExigidas).trim() : undefined),
    };
  });

  const dadosNormalizados: ManualStructuredImportJSON = {
    $schema: dados.$schema || 'https://qualyquest.impacto.aero/schemas/manual-import-v1.json',
    versaoSchema: dados.versaoSchema || '1.0',
    documento: {
      codigo: String(docBruto.codigo).trim().toUpperCase(),
      nome: docBruto.nome ? String(docBruto.nome).trim() : String(docBruto.titulo).trim(),
      titulo: String(docBruto.titulo || docBruto.nome).trim(),
      revisao: String(docBruto.revisao).trim(),
      idioma: docBruto.idioma ? String(docBruto.idioma).trim() : 'pt-BR',
      orgaoRegulador: docBruto.orgaoRegulador ? String(docBruto.orgaoRegulador).trim() : 'SGQ Interno',
      dataVigencia: docBruto.dataVigencia ? String(docBruto.dataVigencia).trim() : new Date().toISOString().split('T')[0],
      dataRevisao: docBruto.dataRevisao ? String(docBruto.dataRevisao).trim() : undefined,
      dataAprovacao: docBruto.dataAprovacao ? String(docBruto.dataAprovacao).trim() : undefined,
      setoresAplicaveis: Array.isArray(docBruto.setoresAplicaveis)
        ? docBruto.setoresAplicaveis.map((s: any) => String(s).trim())
        : ['Qualidade', 'Manutenção'],
      descricaoResumo: docBruto.descricaoResumo ? String(docBruto.descricaoResumo).trim() : '',
      proprietario: docBruto.proprietario ? String(docBruto.proprietario).trim() : 'IMPACTO Aviation MRO',
      assessor: docBruto.assessor ? String(docBruto.assessor).trim() : 'Garantia da Qualidade & Auditoria SGQ',
      documentoControladoId: docBruto.documentoControladoId ? String(docBruto.documentoControladoId).trim() : undefined,
    },
    secoes: secoesNormalizadas,
  };

  return {
    valido: true,
    erros: [],
    avisos,
    dadosNormalizados,
  };
}

export const ESQUEMA_JSON_IMPORTACAO_OFICIAL = {
  $schema: 'https://qualyquest.impacto.aero/schemas/manual-import-v1.json',
  versao: '1.0.0',
  titulo: 'Schema Oficial de Importação Estruturada de Manuais Técnicos',
  descricao: 'Padrão mandatório para ingestão integral de manuais da IMPACTO no Acervo de IA.',
};

export function obterExemploSchemaJSONValido(): ManualStructuredImportJSON {
  return {
    $schema: 'https://qualyquest.impacto.aero/schemas/manual-import-v1.json',
    versaoSchema: '1.0.0',
    documento: {
      codigo: 'MNT-001',
      nome: 'Manual da Organização de Manutenção da Qualidade',
      titulo: 'Manual da Organização de Manutenção da Qualidade',
      revisao: '14',
      idioma: 'pt-BR',
      orgaoRegulador: 'ANAC / SGQ Interno',
      dataVigencia: '2025-06-01',
      dataRevisao: '2025-06-01',
      dataAprovacao: '2025-05-20',
      setoresAplicaveis: ['Qualidade / SGQ', 'Manutenção / Base', 'REC / Calibração'],
      descricaoResumo: 'Diretrizes gerais do Sistema de Gestão da Qualidade, procedimentos operacionais, metrologia e tratamento de não conformidades.',
      proprietario: 'IMPACTO Aviation MRO',
      assessor: 'Garantia da Qualidade & Auditoria SGQ',
    },
    secoes: [
      {
        capitulo: '1',
        capituloTitulo: 'Sistema de Gestão da Qualidade',
        secao: '1.1',
        subitem: '1.1',
        pagina: 10,
        titulo: 'Política da Qualidade e Segurança Operacional',
        conteudo: 'A organização deve garantir conformidade irrestrita com regulamentos aeronáuticos e normas de segurança de voo, estabelecendo barreiras preventivas em todas as etapas da manutenção.',
        palavrasChave: ['politica', 'qualidade', 'seguranca', 'regulamento'],
        procedimentoRelacionado: 'PO-SGQ-001',
        responsabilidades: ['Diretoria de Manutenção', 'Gerente da Qualidade'],
      },
      {
        capitulo: '2',
        capituloTitulo: 'Controle de Documentos e Registros Técnicos',
        secao: '2.4',
        subitem: '2.4.3',
        pagina: 35,
        titulo: 'Controle e Distribuição de Cópias e Manuais Técnicos',
        conteudo: 'Toda documentação técnica deve ser mantida na revisão vigente. É terminantemente proibido o uso de cópias obsoletas nas estações de trabalho e postos de manutenção.',
        procedimentoRelacionado: 'PR-SGQ-004',
        responsabilidades: ['Garantia da Qualidade', 'Chefias de Oficina'],
        controlesObrigatorios: ['Lista mestra digital única', 'Carimbo de cópia controlada'],
        evidenciasExigidas: ['Lista Mestra atualizada', 'Protocolo de entrega'],
      },
      {
        capitulo: '3',
        capituloTitulo: 'Controle de Ferramentas, Equipamentos e Metrologia',
        secao: '3.4',
        subitem: '3.4.3',
        pagina: 35,
        titulo: 'Controle e Calibração de Torquímetros e Instrumentos de Medição',
        conteudo: 'Todos os torquímetros de precisão e instrumentos de medição utilizados em serviços aeronáuticos devem possuir calibração rastreável à RBC (Rede Brasileira de Calibração) com periodicidade máxima de 180 dias. Instrumentos com calibração vencida devem ser imediatamente etiquetados em vermelho e segregados na área de quarentena do setor REC.',
        procedimentoRelacionado: 'PO-MNT-004 Procedimento de Calibração de Ferramental',
        responsabilidades: ['Inspetor Metrológico', 'Técnico de Manutenção'],
        controlesObrigatorios: ['Etiqueta de calibração inviolável', 'Bloqueio no sistema SGQ'],
        evidenciasExigidas: ['Certificado RBC vigente', 'Ordem de Serviço com nº do instrumento'],
        tabelas: [
          {
            titulo: 'Periodicidade Padrão de Calibração Metrológica',
            colunas: ['Instrumento', 'Faixa de Operação', 'Periodicidade Máxima', 'Padrão Rastreável'],
            linhas: [
              ['Torquímetro de Estalo', '5 a 250 Nm', '180 dias', 'RBC / INMETRO'],
              ['Paquímetro Digital', '0 a 300 mm', '365 dias', 'RBC / INMETRO'],
              ['Manômetro Hidráulico', '0 a 5000 PSI', '180 dias', 'RBC / INMETRO']
            ],
            markdown: '| Instrumento | Faixa de Operação | Periodicidade Máxima | Padrão Rastreável |\n|---|---|---|---|\n| Torquímetro de Estalo | 5 a 250 Nm | 180 dias | RBC / INMETRO |\n| Paquímetro Digital | 0 a 300 mm | 365 dias | RBC / INMETRO |\n| Manômetro Hidráulico | 0 a 5000 PSI | 180 dias | RBC / INMETRO |',
          }
        ]
      }
    ]
  };
}

export function validarSintaxeEEstruturaJSON(jsonStr: string): {
  valido: boolean;
  erros: Array<{ campo: string; mensagem: string; linha?: number; coluna?: number }>;
  avisos: string[];
  dadosValidados?: ManualStructuredImportJSON;
  schemaVersao: string;
} {
  const sintaxe = validarSintaxeJSON(jsonStr);
  if (!sintaxe.valido) {
    return {
      valido: false,
      erros: [{
        campo: 'sintaxe_json',
        mensagem: sintaxe.erro || 'JSON malformado ou inválido',
        linha: sintaxe.linha,
        coluna: sintaxe.coluna,
      }],
      avisos: [],
      schemaVersao: '1.0.0',
    };
  }

  const schemaRes = validarSchemaManualJSON(sintaxe.dados);
  if (!schemaRes.valido) {
    return {
      valido: false,
      erros: schemaRes.erros.map(e => {
        const matchQuoted = e.match(/"([^"]+)"/);
        const campo = matchQuoted ? matchQuoted[1] : (e.includes('secoes') ? 'secoes' : 'documento');
        return {
          campo,
          mensagem: e,
        };
      }),
      avisos: schemaRes.avisos,
      schemaVersao: '1.0.0',
    };
  }

  return {
    valido: true,
    erros: [],
    avisos: schemaRes.avisos,
    dadosValidados: schemaRes.dadosNormalizados,
    schemaVersao: '1.0.0',
  };
}
