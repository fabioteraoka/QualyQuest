import {
  RequisitoClienteItem,
  TipoOrigemRequisito,
  SituacaoAplicabilidadeImpacto,
  ControleCentralSGQ,
  ClienteExterno,
  ProgramaChecklistCliente,
  UserProfile,
  RequisitoAuditoriaExterna
} from '../types';
import { KALITTA_QA14_ITEMS, KALITTA_QA14_METADATA } from '../data/sampleKalittaQA14Checklist';
import { CATALOGO_F001_02_1 } from '../data/f001021ControlledPublications';
import { saveRequisitosLote } from './firebase/clientRequirementsFirestore';

// ============================================================================
// TIPOS DO DIAGNÓSTICO E DA CARGA
// ============================================================================

export interface DiagnosticoRequisitosSGQ {
  totalRequisitos: number;
  porFonte: Record<TipoOrigemRequisito | 'SEM_CLASSIFICACAO', number>;
  porCliente: Record<string, number>;
  porStatusValidacao: {
    validado: number;
    pendenteValidacao: number;
    aguardandoProtocolo: number;
  };
  porAplicabilidade: Record<SituacaoAplicabilidadeImpacto, number>;
  comControleCentralCount: number;
  semControleCentralCount: number;
  semReferenciaDocumentalCount: number;
  semTextoOriginalCount: number;
  duplicidadesIdentificadas: Array<{
    tipo: 'CODIGO_IDENTICO' | 'TEXTO_SEMELHANTE';
    codigoA: string;
    codigoB: string;
    detalhes: string;
  }>;
  requisitosPrecisamRevisao: Array<{
    id: string;
    numeroItem: string;
    titulo: string;
    motivo: string;
  }>;
  lacunasControlesCentrais: Array<{
    requisitoId: string;
    numeroItem: string;
    titulo: string;
    fonte: string;
    recomendacao: string;
  }>;
  relacionamentoControles: Array<{
    controleId: string;
    controleCodigo: string;
    controleNome: string;
    totalRequisitosVinculados: number;
    requisitos: Array<{
      id: string;
      numeroItem: string;
      fonteOrigem?: TipoOrigemRequisito;
      clienteNome?: string;
    }>;
    clientesAtendidos: string[];
    fontesAtendidas: string[];
  }>;
}

export interface PacoteCargaRequisitos {
  id: string;
  nome: string;
  origem: TipoOrigemRequisito;
  emissor: string;
  documentoFonte: string;
  edicaoRevisao: string;
  dataVigencia: string;
  descricao: string;
  totalItens: number;
  statusValidacao: 'VALIDADO' | 'PENDENTE_VALIDACAO' | 'AGUARDANDO_PROTOCOLO';
  observacaoIntegridade?: string;
  requisitos: RequisitoClienteItem[];
}

export interface ResultadoComparacaoCarga {
  pacoteId: string;
  pacoteNome: string;
  totalNoPacote: number;
  novos: RequisitoClienteItem[];
  atualizacoes: Array<{
    existente: RequisitoClienteItem;
    novo: RequisitoClienteItem;
    diferencas: string[];
  }>;
  identicosJaExistentes: RequisitoClienteItem[];
  conflitosPotenciais: Array<{
    codigo: string;
    existente: RequisitoClienteItem;
    candidato: RequisitoClienteItem;
    motivo: string;
  }>;
}

// ============================================================================
// 1. DIAGNÓSTICO DOS DADOS EXISTENTES
// ============================================================================

export function executarDiagnosticoRequisitos(
  requisitos: RequisitoClienteItem[],
  clientes: ClienteExterno[],
  programas: ProgramaChecklistCliente[],
  controles: ControleCentralSGQ[]
): DiagnosticoRequisitosSGQ {
  const totalRequisitos = requisitos.length;

  const porFonte: Record<TipoOrigemRequisito | 'SEM_CLASSIFICACAO', number> = {
    REGULATORIO_ANAC: 0,
    REGULATORIO_EASA: 0,
    PADRAO_SETORIAL_IOSA: 0,
    CONTRATUAL_CLIENTE: 0,
    INTERNO_IMPACTO: 0,
    BOA_PRATICA_REFERENCIA: 0,
    SEM_CLASSIFICACAO: 0,
  };

  const porCliente: Record<string, number> = {};
  clientes.forEach((c) => {
    porCliente[c.nome || c.codigo] = 0;
  });
  porCliente['Sem Cliente (Regulatório/Interno)'] = 0;

  const porStatusValidacao = {
    validado: 0,
    pendenteValidacao: 0,
    aguardandoProtocolo: 0,
  };

  const porAplicabilidade: Record<SituacaoAplicabilidadeImpacto, number> = {
    APLICAVEL: 0,
    PARCIALMENTE_APLICAVEL: 0,
    NAO_APLICAVEL: 0,
    AGUARDANDO_AVALIACAO: 0,
  };

  let comControleCentralCount = 0;
  let semControleCentralCount = 0;
  let semReferenciaDocumentalCount = 0;
  let semTextoOriginalCount = 0;

  const duplicidadesIdentificadas: DiagnosticoRequisitosSGQ['duplicidadesIdentificadas'] = [];
  const requisitosPrecisamRevisao: DiagnosticoRequisitosSGQ['requisitosPrecisamRevisao'] = [];
  const lacunasControlesCentrais: DiagnosticoRequisitosSGQ['lacunasControlesCentrais'] = [];

  // Mapeamento para detectar duplicidades
  const mapaCodigos: Record<string, RequisitoClienteItem[]> = {};
  const mapaTextos: Record<string, RequisitoClienteItem[]> = {};

  requisitos.forEach((req) => {
    // Fonte
    if (req.fonteOrigem && porFonte[req.fonteOrigem] !== undefined) {
      porFonte[req.fonteOrigem]++;
    } else {
      porFonte.SEM_CLASSIFICACAO++;
      requisitosPrecisamRevisao.push({
        id: req.id,
        numeroItem: req.numeroItem,
        titulo: req.tituloCurto,
        motivo: 'Requisito cadastrado sem fonte de origem classificada.',
      });
    }

    // Cliente
    if (req.clienteNome) {
      porCliente[req.clienteNome] = (porCliente[req.clienteNome] || 0) + 1;
    } else {
      porCliente['Sem Cliente (Regulatório/Interno)']++;
    }

    // Status validação de conteúdo
    const statusVal = req.statusValidacaoConteudo || 'VALIDADO';
    if (statusVal === 'PENDENTE_VALIDACAO') porStatusValidacao.pendenteValidacao++;
    else if (statusVal === 'AGUARDANDO_PROTOCOLO') porStatusValidacao.aguardandoProtocolo++;
    else porStatusValidacao.validado++;

    // Aplicabilidade
    const sitAplic = req.aplicabilidadeContexto?.situacao || 'APLICAVEL';
    if (porAplicabilidade[sitAplic] !== undefined) {
      porAplicabilidade[sitAplic]++;
    }

    // Vínculo a Controles Centrais
    if (req.controleCentralId || req.controleCentralCodigo) {
      comControleCentralCount++;
    } else {
      semControleCentralCount++;
      lacunasControlesCentrais.push({
        requisitoId: req.id,
        numeroItem: req.numeroItem,
        titulo: req.tituloCurto,
        fonte: req.fonteDocumentoNome || req.fonteOrigem || 'Não especificada',
        recomendacao: `Vincular a um Controle Central SGQ existente ou criar novo controle para garantir conformidade contínua.`,
      });
    }

    // Referência documental
    if (!req.fonteDocumentoNome && !req.codigoReferenciaOriginal) {
      semReferenciaDocumentalCount++;
      requisitosPrecisamRevisao.push({
        id: req.id,
        numeroItem: req.numeroItem,
        titulo: req.tituloCurto,
        motivo: 'Ausência de menção expressa ao documento normativo oficial ou seção de origem.',
      });
    }

    // Texto original
    if (!req.textoOriginal || req.textoOriginal.trim().length < 10) {
      semTextoOriginalCount++;
      requisitosPrecisamRevisao.push({
        id: req.id,
        numeroItem: req.numeroItem,
        titulo: req.tituloCurto,
        motivo: 'Texto original normativo ausente ou demasiadamente simplificado.',
      });
    }

    // Checagem de duplicidade por código
    const codNorm = req.numeroItem.trim().toUpperCase();
    if (!mapaCodigos[codNorm]) mapaCodigos[codNorm] = [];
    mapaCodigos[codNorm].push(req);

    // Checagem de texto semelhante
    const textoLimpo = (req.textoOriginal || '')
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .substring(0, 80)
      .trim();
    if (textoLimpo.length > 25) {
      if (!mapaTextos[textoLimpo]) mapaTextos[textoLimpo] = [];
      mapaTextos[textoLimpo].push(req);
    }
  });

  // Consolidar duplicidades de código
  Object.keys(mapaCodigos).forEach((cod) => {
    const lista = mapaCodigos[cod];
    if (lista.length > 1) {
      for (let i = 0; i < lista.length - 1; i++) {
        duplicidadesIdentificadas.push({
          tipo: 'CODIGO_IDENTICO',
          codigoA: lista[i].numeroItem,
          codigoB: lista[i + 1].numeroItem,
          detalhes: `Dois requisitos utilizam o mesmo código "${cod}" (IDs: ${lista[i].id} e ${lista[i + 1].id}).`,
        });
      }
    }
  });

  // Consolidar duplicidades de texto
  Object.keys(mapaTextos).forEach((txt) => {
    const lista = mapaTextos[txt];
    if (lista.length > 1) {
      for (let i = 0; i < lista.length - 1; i++) {
        if (lista[i].numeroItem !== lista[i + 1].numeroItem) {
          duplicidadesIdentificadas.push({
            tipo: 'TEXTO_SEMELHANTE',
            codigoA: lista[i].numeroItem,
            codigoB: lista[i + 1].numeroItem,
            detalhes: `Requisitos com códigos diferentes (${lista[i].numeroItem} e ${lista[i + 1].numeroItem}) compartilham redação idêntica.`,
          });
        }
      }
    }
  });

  // Relacionamento com Controles Centrais ("Um controle, vários requisitos")
  const relacionamentoControles: DiagnosticoRequisitosSGQ['relacionamentoControles'] = controles.map((ctrl) => {
    const reqsVinculados = requisitos.filter(
      (r) => r.controleCentralId === ctrl.id || r.controleCentralCodigo === ctrl.codigo
    );

    const clientesUnicos = Array.from(
      new Set(reqsVinculados.map((r) => r.clienteNome).filter(Boolean) as string[])
    );
    const fontesUnicas = Array.from(
      new Set(reqsVinculados.map((r) => r.fonteOrigem).filter(Boolean) as string[])
    );

    return {
      controleId: ctrl.id,
      controleCodigo: ctrl.codigo,
      controleNome: ctrl.nome,
      totalRequisitosVinculados: reqsVinculados.length,
      requisitos: reqsVinculados.map((r) => ({
        id: r.id,
        numeroItem: r.numeroItem,
        fonteOrigem: r.fonteOrigem,
        clienteNome: r.clienteNome,
      })),
      clientesAtendidos: clientesUnicos,
      fontesAtendidas: fontesUnicas,
    };
  });

  return {
    totalRequisitos,
    porFonte,
    porCliente,
    porStatusValidacao,
    porAplicabilidade,
    comControleCentralCount,
    semControleCentralCount,
    semReferenciaDocumentalCount,
    semTextoOriginalCount,
    duplicidadesIdentificadas,
    requisitosPrecisamRevisao,
    lacunasControlesCentrais,
    relacionamentoControles,
  };
}

// ============================================================================
// 2. PACOTES DE CARGA DE REQUISITOS REAIS E HOMOLOGADOS
// ============================================================================

export function getPacotesCargaHomologados(): PacoteCargaRequisitos[] {
  // A. Pacote Kalitta QA-14 Completo (69 itens)
  const requisitosKalittaQA14: RequisitoClienteItem[] = KALITTA_QA14_ITEMS.map((item) => {
    const itemNumPad = item.numeroItem.padStart(2, '0');
    const reqId = `REQ-KALITTA-QA14-${itemNumPad}`;

    // Mapeamento para controle central mais próximo
    let ctrlId: string | undefined;
    let ctrlCod: string | undefined;
    let ctrlNome: string | undefined;

    if (item.capituloOuSecao.includes('General Operations') || item.capituloOuSecao.includes('Publications')) {
      ctrlId = 'CTRL-DOCS-01';
      ctrlCod = 'CTRL-DOCS-01';
      ctrlNome = 'Controle de Publicações Técnicas, AMM e Manuais do Cliente';
    } else if (item.capituloOuSecao.includes('Training') || item.perguntaOuCriterio.includes('treinamento') || item.perguntaOuCriterio.includes('Fatores')) {
      ctrlId = 'CTRL-TREIN-01';
      ctrlCod = 'CTRL-TREIN-01';
      ctrlNome = 'Qualificação, Treinamento Recorrente e Fatores Humanos';
    } else if (item.capituloOuSecao.includes('Tool') || item.capituloOuSecao.includes('Calibration') || item.perguntaOuCriterio.includes('calibra')) {
      ctrlId = 'CTRL-FERRAM-01';
      ctrlCod = 'CTRL-FERRAM-01';
      ctrlNome = 'Calibração e Controle de Ferramentas de Precisão';
    } else if (item.capituloOuSecao.includes('Receiving') || item.capituloOuSecao.includes('Shelf') || item.perguntaOuCriterio.includes('shelf-life') || item.perguntaOuCriterio.includes('8130-3')) {
      ctrlId = 'CTRL-MAT-01';
      ctrlCod = 'CTRL-MAT-01';
      ctrlNome = 'Rastreabilidade de Peças, Certificação 8130-3 e Shelf-Life';
    } else if (item.capituloOuSecao.includes('Quarantine') || item.perguntaOuCriterio.includes('quarentena')) {
      ctrlId = 'CTRL-QUARENT-01';
      ctrlCod = 'CTRL-QUARENT-01';
      ctrlNome = 'Segregação Física e Procedimento de Peças em Quarentena';
    } else if (item.capituloOuSecao.includes('Housekeeping') || item.capituloOuSecao.includes('FOD')) {
      ctrlId = 'CTRL-HOUSEKEEP-01';
      ctrlCod = 'CTRL-HOUSEKEEP-01';
      ctrlNome = 'Housekeeping de Pátio/Hangar e Programa de Prevenção de FOD';
    } else if (item.capituloOuSecao.includes('LOTO') || item.perguntaOuCriterio.includes('bloqueio')) {
      ctrlId = 'CTRL-LOTO-01';
      ctrlCod = 'CTRL-LOTO-01';
      ctrlNome = 'Bloqueio e Etiquetagem de Segurança em Manutenção (LOTO)';
    }

    return {
      id: reqId,
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-KALITTA',
      clienteNome: 'Kalitta Air, LLC',
      programaId: 'PROG-KALITTA-QA14',
      programaCodigo: 'QA-14',
      numeroItem: `QA14-${itemNumPad}`,
      codigoReferenciaOriginal: `QA-14 Item ${item.numeroItem} (${item.referenciaNormativa})`,
      entidadeEmissora: 'Kalitta Air, LLC (Quality Assurance)',
      capituloSecaoSubitem: item.capituloOuSecao,
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: item.perguntaOuCriterio,
      textoOriginal: item.textoOriginal,
      categoria: item.categoriaSugerida || 'Operacional Linha',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'FORM QA-14 LINE MAINTENANCE STATION AUDIT CHECKLIST',
      edicaoRevisaoFonte: 'QA 14 REV: 4 (01/09/2026)',
      dataVigenciaFonte: '2026-09-01',
      perguntaAuditoria: item.perguntaOuCriterio,
      interpretacaoInterna: `Requisito auditado pela Kalitta Air via Form QA-14. Aplicável nas bases com contrato de atendimento ativo (SOD, GRU, VCP).`,
      procedimentoInternoRef: 'MOMQ Seção 3.2 e Procedimentos Kalitta GMM',
      processoResponsavel: 'Garantia da Qualidade & Manutenção de Linha',
      controleCentralId: ctrlId,
      controleCentralCodigo: ctrlCod,
      controleCentralNome: ctrlNome,
      evidenciaEsperada: `Evidências documentais e registros de amostragem conforme exigido na seção ${item.capituloOuSecao} do checklist.`,
      criticidade: item.criticidadeSugerida === 'CRITICA' ? 'ALTO' : item.criticidadeSugerida === 'ALTA' ? 'ALTO' : item.criticidadeSugerida === 'MEDIA' ? 'MEDIO' : 'BAIXO',
      status: 'ATIVO',
      aplicabilidadeRegras: {
        basesAplicaveis: ['SOD', 'GRU', 'VCP'],
        tiposEstacao: ['BASE_PRINCIPAL', 'ESTACAO_LINHA'],
      },
      aplicabilidadeContexto: {
        situacao: 'APLICAVEL',
        clientesAplicaveis: ['Kalitta Air, LLC'],
        basesAplicaveis: ['SOD', 'GRU', 'VCP'],
      },
      periodicidade: 'SEMESTRAL',
      metodoVerificacao: 'INSPECAO_FISICA',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };
  });

  // B. Pacote Atlas Air Q2059 (12 itens)
  const requisitosAtlasQ2059: RequisitoClienteItem[] = [
    {
      id: 'REQ-ATLAS-Q2059-01',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-ATLAS',
      clienteNome: 'Atlas Air, Inc.',
      programaId: 'PROG-ATLAS-Q2059',
      programaCodigo: 'Q2059',
      numeroItem: 'Q2059-01',
      codigoReferenciaOriginal: 'Q2059 Item 1 (Housekeeping & 5S)',
      entidadeEmissora: 'Atlas Air, Inc. (Station Quality)',
      capituloSecaoSubitem: 'Section 1 - Facility & Housekeeping',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Housekeeping, Limpeza e Prevenção de FOD',
      textoOriginal: 'All maintenance and storage areas must be maintained in a clean, orderly condition conforming to FAA Part 145 and Atlas Air Station Quality standards. Regular FOD walks must be documented.',
      categoria: 'Housekeeping',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Atlas Air Q2059 Station Audit Checklist',
      edicaoRevisaoFonte: 'Rev. 2025/2026',
      dataVigenciaFonte: '2025-06-15',
      perguntaAuditoria: 'A base mantém padrões rigorosos de limpeza, descarte seguro de resíduos e prevenção de FOD com registros periódicos?',
      controleCentralId: 'CTRL-HOUSEKEEP-01',
      controleCentralCodigo: 'CTRL-HOUSEKEEP-01',
      controleCentralNome: 'Housekeeping de Pátio/Hangar e Programa de Prevenção de FOD',
      criticidade: 'MEDIO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU', 'VCP', 'GIG', 'CNF'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Atlas Air, Inc.'] },
      periodicidade: 'TRIMESTRAL',
      metodoVerificacao: 'INSPECAO_FISICA',
      evidenciaEsperada: 'Registros de FOD Walk diário/semanal e fotos das áreas de trabalho organizadas.',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ATLAS-Q2059-02',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-ATLAS',
      clienteNome: 'Atlas Air, Inc.',
      programaId: 'PROG-ATLAS-Q2059',
      programaCodigo: 'Q2059',
      numeroItem: 'Q2059-02',
      codigoReferenciaOriginal: 'Q2059 Item 2 (Calibrated Tools)',
      entidadeEmissora: 'Atlas Air, Inc.',
      capituloSecaoSubitem: 'Section 2 - Tooling and Calibration',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Calibração de Ferramental e Rastreabilidade Metrológica',
      textoOriginal: 'All precision measurement tools, torque wrenches, pressure gauges, and avionics test sets must have current calibration stickers with NIST/RBC traceable certification.',
      categoria: 'Tooling / Calibration',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Atlas Air Q2059 Station Audit Checklist',
      edicaoRevisaoFonte: 'Rev. 2025/2026',
      dataVigenciaFonte: '2025-06-15',
      perguntaAuditoria: 'Todas as ferramentas calibráveis possuem etiquetas de calibração vigentes e certificados arquivados?',
      controleCentralId: 'CTRL-FERRAM-01',
      controleCentralCodigo: 'CTRL-FERRAM-01',
      controleCentralNome: 'Calibração e Controle de Ferramentas de Precisão',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU', 'VCP', 'GIG', 'CNF'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Atlas Air, Inc.'] },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'AMOSTRAGEM',
      evidenciaEsperada: 'Certificados de calibração RBC dos torquímetros e manômetros em uso.',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ATLAS-Q2059-03',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-ATLAS',
      clienteNome: 'Atlas Air, Inc.',
      programaId: 'PROG-ATLAS-Q2059',
      programaCodigo: 'Q2059',
      numeroItem: 'Q2059-03',
      codigoReferenciaOriginal: 'Q2059 Item 3 (Parts Traceability)',
      entidadeEmissora: 'Atlas Air, Inc.',
      capituloSecaoSubitem: 'Section 3 - Material Handling',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Rastreabilidade de Peças e Certificação 8130-3',
      textoOriginal: 'Aircraft parts and consumables must have valid FAA Form 8130-3 or EASA Form 1 and be stored in climate-controlled conditions.',
      categoria: 'Materials / Parts',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Atlas Air Q2059 Station Audit Checklist',
      edicaoRevisaoFonte: 'Rev. 2025/2026',
      dataVigenciaFonte: '2025-06-15',
      perguntaAuditoria: 'Todas as peças no almoxarifado contam com aprovação formal de aeronavegabilidade (8130-3 / Form 1) e validade de shelf-life?',
      controleCentralId: 'CTRL-MAT-01',
      controleCentralCodigo: 'CTRL-MAT-01',
      controleCentralNome: 'Rastreabilidade de Peças, Certificação 8130-3 e Shelf-Life',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU', 'VCP'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Atlas Air, Inc.'] },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'FAA 8130-3 / EASA Form 1, relatório de inspeção de recebimento F 001-01-1.',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ATLAS-Q2059-04',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-ATLAS',
      clienteNome: 'Atlas Air, Inc.',
      programaId: 'PROG-ATLAS-Q2059',
      programaCodigo: 'Q2059',
      numeroItem: 'Q2059-04',
      codigoReferenciaOriginal: 'Q2059 Item 4 (Personnel Training)',
      entidadeEmissora: 'Atlas Air, Inc.',
      capituloSecaoSubitem: 'Section 4 - Training and Qualifications',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Treinamento de Fatores Humanos e Autorização Técnica',
      textoOriginal: 'Maintenance personnel performing work on Atlas Air aircraft must hold valid regulatory licenses, current Human Factors training, Fuel Tank Safety / EWIS qualifications, and Atlas customer-specific procedural authorization.',
      categoria: 'Training',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Atlas Air Q2059 Station Audit Checklist',
      edicaoRevisaoFonte: 'Rev. 2025/2026',
      dataVigenciaFonte: '2025-06-15',
      perguntaAuditoria: 'Toda a equipe de manutenção possui treinamentos mandatórios e autorização de tipo vigentes?',
      controleCentralId: 'CTRL-TREIN-01',
      controleCentralCodigo: 'CTRL-TREIN-01',
      controleCentralNome: 'Qualificação, Treinamento Recorrente e Fatores Humanos',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU', 'VCP', 'GIG', 'CNF'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Atlas Air, Inc.'] },
      periodicidade: 'TRIMESTRAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Certificados de Fatores Humanos, EWIS, Combustível e lista F 001-07.',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ATLAS-Q2059-09',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-ATLAS',
      clienteNome: 'Atlas Air, Inc.',
      programaId: 'PROG-ATLAS-Q2059',
      programaCodigo: 'Q2059',
      numeroItem: 'Q2059-09',
      codigoReferenciaOriginal: 'Q2059 Item 9 (Technical Data)',
      entidadeEmissora: 'Atlas Air, Inc.',
      capituloSecaoSubitem: 'Section 9 - Technical Publications',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Disponibilidade de AMM e Dados Técnicos Boeing Vigentes',
      textoOriginal: 'Current technical data (Aircraft Maintenance Manuals, Wiring Diagram Manuals, Fault Isolation Manuals, Illustrated Parts Catalogs) appropriate for the Atlas fleet must be accessible to maintenance technicians at the point of work.',
      categoria: 'Technical Data',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Atlas Air Q2059 Station Audit Checklist',
      edicaoRevisaoFonte: 'Rev. 2025/2026',
      dataVigenciaFonte: '2025-06-15',
      perguntaAuditoria: 'Os manuais de manutenção da frota Atlas estão acessíveis em suas revisões vigentes aos mecânicos de linha?',
      controleCentralId: 'CTRL-DOCS-01',
      controleCentralCodigo: 'CTRL-DOCS-01',
      controleCentralNome: 'Controle de Publicações Técnicas, AMM e Manuais do Cliente',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU', 'VCP'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Atlas Air, Inc.'] },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Log de verificação de revisões Boeing/Atlas e acessos registrados pelos técnicos.',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  // C. Pacote ANAC RBAC 145 & Instruções Suplementares
  const requisitosANAC: RequisitoClienteItem[] = [
    {
      id: 'REQ-ANAC-145-109',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'ANAC (Regulatório Primário)',
      programaId: 'PROG-ANAC-RBAC-145',
      programaCodigo: 'RBAC-145',
      numeroItem: '145.109',
      codigoReferenciaOriginal: 'RBAC 145.109(a)(b)(c)(d)',
      entidadeEmissora: 'Agência Nacional de Aviação Civil (ANAC)',
      capituloSecaoSubitem: 'Subparte C — Instalações, Ferramentas e Equipamentos',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Equipamentos, Ferramentas e Materiais de Manutenção',
      textoOriginal: 'A organização de manutenção certificada deve possuir os equipamentos, ferramentas e materiais necessários para realizar a manutenção, manutenção preventiva ou alteração sob os termos de seu certificado e especificações operativas. As ferramentas de teste e medição devem ser calibradas de acordo com padrões aceitáveis pela ANAC.',
      categoria: 'Metrologia / Ferramental',
      fonteOrigem: 'REGULATORIO_ANAC',
      fonteDocumentoNome: 'ANAC RBAC 145 Emenda 09',
      edicaoRevisaoFonte: 'Rev. 09 (07/07/2023)',
      dataVigenciaFonte: '2023-07-07',
      perguntaAuditoria: 'A oficina mantém todas as ferramentas especiais e instrumentos calibrados com rastreabilidade RBC/INMETRO?',
      interpretacaoInterna: 'Obrigação regulatória primária de cumprimento obrigatório em 100% das bases homologadas da IMPACTO.',
      procedimentoInternoRef: 'MOMQ Seção 3.4.2 e F 001-06',
      processoResponsavel: 'Garantia da Qualidade / Metrologia',
      controleCentralId: 'CTRL-FERRAM-01',
      controleCentralCodigo: 'CTRL-FERRAM-01',
      controleCentralNome: 'Calibração e Controle de Ferramentas de Precisão',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Certificados de calibração RBC, fichas F 001-06 e controle de quarentena F 001-06-4.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ANAC-145-161',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'ANAC (Regulatório Primário)',
      programaId: 'PROG-ANAC-RBAC-145',
      programaCodigo: 'RBAC-145',
      numeroItem: '145.161',
      codigoReferenciaOriginal: 'RBAC 145.161(a)(b)',
      entidadeEmissora: 'Agência Nacional de Aviação Civil (ANAC)',
      capituloSecaoSubitem: 'Subparte D — Requisitos de Pessoal',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Requisitos de Registros de Pessoal Técnico e Inspetores',
      textoOriginal: 'A organização de manutenção deve manter uma listagem com os nomes de todo o pessoal de supervisão, inspeção e certificação de retorno ao serviço, contendo o escopo de autorização, licenças, habilitações e histórico de treinamento.',
      categoria: 'Recursos Humanos / Qualificações',
      fonteOrigem: 'REGULATORIO_ANAC',
      fonteDocumentoNome: 'ANAC RBAC 145 Emenda 09',
      edicaoRevisaoFonte: 'Rev. 09 (07/07/2023)',
      dataVigenciaFonte: '2023-07-07',
      perguntaAuditoria: 'O registro formal de pessoal técnico e designações (Form F 001-07 e F 001-29) reflete fielmente o corpo técnico?',
      interpretacaoInterna: 'Cumprimento estrito via formulário oficial F 001-07 e dossiê F 001-29.',
      procedimentoInternoRef: 'MOMQ Seção 4.1 e F 001-07 / F 001-19',
      processoResponsavel: 'Garantia da Qualidade / Recursos Humanos',
      controleCentralId: 'CTRL-TREIN-01',
      controleCentralCodigo: 'CTRL-TREIN-01',
      controleCentralNome: 'Qualificação, Treinamento Recorrente e Fatores Humanos',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'TRIMESTRAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Formulário F 001-07, dossiês F 001-19 e extratos de CHT da ANAC.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ANAC-145-209',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'ANAC (Regulatório Primário)',
      programaId: 'PROG-ANAC-RBAC-145',
      programaCodigo: 'RBAC-145',
      numeroItem: '145.209',
      codigoReferenciaOriginal: 'RBAC 145.209 / IS 145-009',
      entidadeEmissora: 'Agência Nacional de Aviação Civil (ANAC)',
      capituloSecaoSubitem: 'Subparte E — Manual da Organização de Manutenção',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Manual da Organização de Manutenção e da Qualidade (MOMQ)',
      textoOriginal: 'A organização de manutenção deve elaborar, manter e seguir um Manual da Organização de Manutenção (MOMQ) aprovado pela ANAC, descrevendo suas instalações, procedimentos de manutenção, controle de registros e garantia da qualidade.',
      categoria: 'Controle Documental',
      fonteOrigem: 'REGULATORIO_ANAC',
      fonteDocumentoNome: 'ANAC RBAC 145 Emenda 09 / IS 145-009 Rev. E',
      edicaoRevisaoFonte: 'Rev. 09 (07/07/2023)',
      dataVigenciaFonte: '2023-07-07',
      perguntaAuditoria: 'O MOMQ está aprovado pela ANAC na revisão vigente e acessível a todo o pessoal?',
      interpretacaoInterna: 'MOMQ MNT-001 aprovado pela autoridade e controlado digitalmente no QualyQuest.',
      procedimentoInternoRef: 'MOMQ Capítulos 1 a 6',
      processoResponsavel: 'Garantia da Qualidade',
      controleCentralId: 'CTRL-DOCS-01',
      controleCentralCodigo: 'CTRL-DOCS-01',
      controleCentralNome: 'Controle de Publicações Técnicas, AMM e Manuais do Cliente',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'SEMESTRAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Folha de aprovação da ANAC e lista de controle de revisões vigentes.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-ANAC-145-221',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'ANAC (Regulatório Primário)',
      programaId: 'PROG-ANAC-RBAC-145',
      programaCodigo: 'RBAC-145',
      numeroItem: '145.221',
      codigoReferenciaOriginal: 'RBAC 145.221-I(a)(b)',
      entidadeEmissora: 'Agência Nacional de Aviação Civil (ANAC)',
      capituloSecaoSubitem: 'Subparte E — Relatórios e Comunicações à ANAC',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Relatório Mensal de Atividades (RMA) e Informe Trimestral de Pessoal',
      textoOriginal: 'A organização de manutenção deve encaminhar mensalmente à ANAC o Relatório Mensal de Atividades de Manutenção (RMA) e trimestralmente o informe atualizado de pessoal técnico e inspetores habilitados.',
      categoria: 'Comunicação Regulatória',
      fonteOrigem: 'REGULATORIO_ANAC',
      fonteDocumentoNome: 'ANAC RBAC 145 Emenda 09 / IS 145.151-001',
      edicaoRevisaoFonte: 'Rev. 09 (07/07/2023)',
      dataVigenciaFonte: '2023-07-07',
      perguntaAuditoria: 'Os relatórios F 001-11 (RMA) e F 001-07 (Pessoal) foram transmitidos à ANAC nos prazos estabelecidos?',
      interpretacaoInterna: 'Obrigação de envio formal via protocolo SEI/ANAC mensal e trimestralmente.',
      procedimentoInternoRef: 'F 001-11, F 001-07 e I 001-23',
      processoResponsavel: 'Responsável Técnico (RT) / SGQ',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Recibos eletrônicos de protocolo SEI/ANAC e cópias dos relatórios F 001-11 e F 001-07.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  // D. Pacote EASA Part-145 & EASA Supplement
  const requisitosEASA: RequisitoClienteItem[] = [
    {
      id: 'REQ-EASA-145-A-30',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'EASA (Regulatório Estrangeiro)',
      programaId: 'PROG-EASA-PART-145',
      programaCodigo: 'PART-145',
      numeroItem: '145.A.30',
      codigoReferenciaOriginal: 'EASA Part-145.A.30(e)(j)',
      entidadeEmissora: 'European Union Aviation Safety Agency (EASA)',
      capituloSecaoSubitem: 'Section A — Technical Requirements (Personnel)',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Personnel Requirements & Human Factors Competence',
      textoOriginal: 'The organization must establish and control the competence of personnel involved in any maintenance, management and/or quality audits in accordance with a procedure and to a standard agreed by the competent authority.',
      categoria: 'Personnel / Competency',
      fonteOrigem: 'REGULATORIO_EASA',
      fonteDocumentoNome: 'EASA Annex II (Part-145) / Regulation (EU) No 1321/2014',
      edicaoRevisaoFonte: 'Consolidated Nov/2024',
      dataVigenciaFonte: '2024-11-01',
      perguntaAuditoria: 'O pessoal envolvido em manutenções com certificação EASA possui treinamento de Fatores Humanos em conformidade com o padrão europeu?',
      interpretacaoInterna: 'Exigível para atendimento de operadores e aeronaves sob certificação EASA (ex: Avion Express).',
      procedimentoInternoRef: 'EASA Supplement MNT-004 e MOMQ 4.1',
      processoResponsavel: 'Garantia da Qualidade & Treinamento',
      controleCentralId: 'CTRL-TREIN-01',
      controleCentralCodigo: 'CTRL-TREIN-01',
      controleCentralNome: 'Qualificação, Treinamento Recorrente e Fatores Humanos',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: {
        situacao: 'PARCIALMENTE_APLICAVEL',
        justificativaFormal: 'Aplicável exclusivamente às atividades de manutenção contratadas para aeronaves registradas em Estados membros da EASA ou operadas sob regulamento europeu.',
        contratosAplicaveis: ['Avion Express ACMI A320'],
      },
      periodicidade: 'SEMESTRAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Certificados EASA Human Factors, EASA Supplement MNT-004 e matriz de autorizações.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-EASA-145-A-42',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'EASA (Regulatório Estrangeiro)',
      programaId: 'PROG-EASA-PART-145',
      programaCodigo: 'PART-145',
      numeroItem: '145.A.42',
      codigoReferenciaOriginal: 'EASA Part-145.A.42(a)(b)',
      entidadeEmissora: 'European Union Aviation Safety Agency (EASA)',
      capituloSecaoSubitem: 'Section A — Acceptance of Components',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Acceptance of Components & EASA Form 1',
      textoOriginal: 'All components must be classified and appropriately segregated. The organization must ensure that components are released on an EASA Form 1 or equivalent recognized bilateral agreement release certificate.',
      categoria: 'Receiving / Components',
      fonteOrigem: 'REGULATORIO_EASA',
      fonteDocumentoNome: 'EASA Annex II (Part-145) Regulation 1321/2014',
      edicaoRevisaoFonte: 'Consolidated Nov/2024',
      dataVigenciaFonte: '2024-11-01',
      perguntaAuditoria: 'Os componentes instalados em aeronaves EASA possuem EASA Form 1 ou certificado bilateral equivalente e inspeção de recebimento comprovada?',
      interpretacaoInterna: 'Cumprimento das regras de aceitabilidade do Acordo Bilateral Brasil-União Europeia.',
      procedimentoInternoRef: 'MOMQ Seção 3.3 e EASA Supplement MNT-004',
      processoResponsavel: 'Almoxarifado Aeronáutico / Inspeção de Recebimento',
      controleCentralId: 'CTRL-MAT-01',
      controleCentralCodigo: 'CTRL-MAT-01',
      controleCentralNome: 'Rastreabilidade de Peças, Certificação 8130-3 e Shelf-Life',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: {
        situacao: 'PARCIALMENTE_APLICAVEL',
        justificativaFormal: 'Exigível quando do recebimento e instalação de componentes destinados a aeronaves sob jurisdição EASA.',
      },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'EASA Form 1, formulário F 001-01-1 e etiquetas de inspeção.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  // E. Pacote Regulatório de Referência: FAA (14 CFR Part 145 & Part 43)
  const requisitosFAA: RequisitoClienteItem[] = [
    {
      id: 'REQ-FAA-145-109',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'FAA (Regulatório EUA — Fonte de Referência)',
      programaId: 'PROG-FAA-14-CFR-145',
      programaCodigo: 'FAA-145',
      numeroItem: '14 CFR 145.109',
      codigoReferenciaOriginal: '14 CFR 145.109(a)(b)',
      entidadeEmissora: 'Federal Aviation Administration (FAA)',
      capituloSecaoSubitem: 'Subpart C — Housing, Facilities, Equipment, Materials, and Data',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Equipment, Materials, and Data Requirements (FAA)',
      textoOriginal: 'A certificated repair station must have the equipment, tools, and materials necessary to perform the maintenance in accordance with part 43. The equipment, tools, and material must be located on the premises and under the repair station control when the work is being done.',
      categoria: 'Equipamentos & Dados Técnicos',
      fonteOrigem: 'BOA_PRATICA_REFERENCIA',
      fonteDocumentoNome: 'Title 14 CFR Part 145 (eCFR)',
      edicaoRevisaoFonte: 'eCFR Vigente 2024/2026',
      dataVigenciaFonte: '2024-01-01',
      perguntaAuditoria: 'A estação possui todos os equipamentos, ferramentas e manuais sob seu controle direto para execução de trabalhos autorizados pela autoridade?',
      interpretacaoInterna: 'Fonte de referência pública. Aplicável à IMPACTO mediante requerimento contratual de operadores N-registered (ex: Kalitta Air, Atlas Air).',
      procedimentoInternoRef: 'MOMQ Cap. 3.4.3 e Lista Mestra F 001-021',
      processoResponsavel: 'Engenharia e Ferramentaria',
      controleCentralId: 'CTRL-FERRAM-01',
      controleCentralCodigo: 'CTRL-FERRAM-01',
      controleCentralNome: 'Calibração e Controle de Ferramentas de Precisão',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: {
        situacao: 'PARCIALMENTE_APLICAVEL',
        justificativaFormal: 'Fonte regulatória de referência. Aplicável à IMPACTO mediante contrato de prestação com operadores aéreos americanos.',
      },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'INSPECAO_FISICA',
      evidenciaEsperada: 'Inventário de ferramentário, registros de controle metrológico e contrato de estação.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-FAA-43-13',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'FAA (Regulatório EUA — Fonte de Referência)',
      programaId: 'PROG-FAA-14-CFR-43',
      programaCodigo: 'FAA-43',
      numeroItem: '14 CFR 43.13',
      codigoReferenciaOriginal: '14 CFR 43.13(a)',
      entidadeEmissora: 'Federal Aviation Administration (FAA)',
      capituloSecaoSubitem: 'General Performance Rules',
      tipoRequisitoNormativo: 'REGULATORIO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Performance Rules for Maintenance & Current ICA',
      textoOriginal: 'Each person performing maintenance shall use the methods, techniques, and practices prescribed in the current manufacturer maintenance manual or Instructions for Continued Airworthiness.',
      categoria: 'Dados Técnicos & Execução',
      fonteOrigem: 'BOA_PRATICA_REFERENCIA',
      fonteDocumentoNome: 'Title 14 CFR Part 43 § 43.13 (eCFR)',
      edicaoRevisaoFonte: 'eCFR Vigente 2024/2026',
      dataVigenciaFonte: '2024-01-01',
      perguntaAuditoria: 'A equipe técnica executa os serviços utilizando estritamente a revisão vigente do manual de manutenção do fabricante (AMM)?',
      interpretacaoInterna: 'Regra de execução técnica universal incorporada nas ordens de serviço da IMPACTO.',
      procedimentoInternoRef: 'MOMQ Cap. 4 e PTM 2.1',
      processoResponsavel: 'Manutenção de Linha',
      controleCentralId: 'CTRL-DOCS-01',
      controleCentralCodigo: 'CTRL-DOCS-01',
      controleCentralNome: 'Controle de Publicações Técnicas, AMM e Manuais do Cliente',
      criticidade: 'CRITICO',
      status: 'ATIVO',
      aplicabilidadeContexto: {
        situacao: 'APLICAVEL',
        justificativaFormal: 'Regra de ouro de execução técnica aplicável a toda manutenção realizada.',
      },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'AMOSTRAGEM',
      evidenciaEsperada: 'Acesso do mecânico ao manual vigente no momento da execução e O.S. assinada.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  // F. Pacote IOSA ISM (Padrão Setorial IATA)
  const requisitosIOSA: RequisitoClienteItem[] = [
    {
      id: 'REQ-IOSA-MNT-1-11-1',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'Padrão Setorial IATA (Operadores Aéreos)',
      programaId: 'PROG-IOSA-ISM-16',
      programaCodigo: 'IOSA-ISM',
      numeroItem: 'MNT 1.11.1',
      codigoReferenciaOriginal: 'IATA ISM MNT 1.11.1',
      entidadeEmissora: 'International Air Transport Association (IATA)',
      capituloSecaoSubitem: 'ISM Section 4 — Maintenance (MNT) / Subsection 1.11',
      tipoRequisitoNormativo: 'PADRAO_SETORIAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Aprovação de Organização de Manutenção Externa (AMO Approval)',
      textoOriginal: 'The Operator shall have a process to ensure each external maintenance organization that conducts maintenance on its aircraft holds valid approvals from the Authority and meets applicable standards.',
      categoria: 'Aprovações & Certificação',
      fonteOrigem: 'PADRAO_SETORIAL_IOSA',
      fonteDocumentoNome: 'IOSA Standards Manual (ISM) Edition 16',
      edicaoRevisaoFonte: 'Edição 16 (Vigência 2025/2026)',
      dataVigenciaFonte: '2025-09-01',
      perguntaAuditoria: 'A oficina mantém sua certificação RBAC 145/EASA ativa perante a autoridade e disponível para comprovação ao operador aéreo?',
      interpretacaoInterna: 'Padrão setorial de operadores aéreos IATA. Cumprido contratualmente conforme acordado no SLA com operadores IOSA (ex: Atlas, Kalitta, Swiss, Avion Express).',
      procedimentoInternoRef: 'MOMQ Seção 1.1 e Certificado ANAC 145001-29',
      processoResponsavel: 'Garantia da Qualidade',
      criticidade: 'ALTO',
      status: 'ATIVO',
      isIosaSetorial: true,
      contratoOuEscopoIncorporacaoIosa: 'Padrão setorial de operadores aéreos IATA. Cumprido contratualmente conforme acordado no SLA com operadores IOSA (ex: Atlas, Kalitta, Swiss, Avion Express).',
      aplicabilidadeContexto: {
        situacao: 'PARCIALMENTE_APLICAVEL',
        justificativaFormal: 'Padrão setorial voluntário da IATA voltado a operadores aéreos. Aplicável à IMPACTO exclusivamente quando previsto no escopo contratual com companhias aéreas registradas no IOSA.',
      },
      periodicidade: 'ANUAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Certificado de Homologação de Empresa (CHE) da ANAC e OpSpecs vigentes.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-IOSA-MNT-1-12-1',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'Padrão Setorial IATA (Operadores Aéreos)',
      programaId: 'PROG-IOSA-ISM-16',
      programaCodigo: 'IOSA-ISM',
      numeroItem: 'MNT 1.12.1',
      codigoReferenciaOriginal: 'IATA ISM MNT 1.12.1',
      entidadeEmissora: 'International Air Transport Association (IATA)',
      capituloSecaoSubitem: 'ISM Section 4 — Maintenance (MNT) / Subsection 1.12',
      tipoRequisitoNormativo: 'PADRAO_SETORIAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Sistema de Gestão da Qualidade e Auditoria Independente de AMO',
      textoOriginal: 'The Operator shall ensure maintenance organizations that perform work on its aircraft maintain an independent quality assurance system that monitors compliance with maintenance standards.',
      categoria: 'Garantia da Qualidade',
      fonteOrigem: 'PADRAO_SETORIAL_IOSA',
      fonteDocumentoNome: 'IOSA Standards Manual (ISM) Edition 16',
      edicaoRevisaoFonte: 'Edição 16 (Vigência 2025/2026)',
      dataVigenciaFonte: '2025-09-01',
      perguntaAuditoria: 'A organização de manutenção possui departamento de garantia da qualidade independente com programa anual de auditorias internas?',
      interpretacaoInterna: 'Estrutura assegurada pela Gerência da Garantia da Qualidade (GQ) da IMPACTO, com independência operacional.',
      procedimentoInternoRef: 'MOMQ Capítulo 2 (Sistema de Gestão da Qualidade)',
      processoResponsavel: 'Garantia da Qualidade',
      criticidade: 'ALTO',
      status: 'ATIVO',
      isIosaSetorial: true,
      contratoOuEscopoIncorporacaoIosa: 'Padrão setorial de operadores aéreos IATA. Cumprido contratualmente conforme acordado no SLA com operadores IOSA (ex: Atlas, Kalitta, Swiss, Avion Express).',
      aplicabilidadeContexto: {
        situacao: 'PARCIALMENTE_APLICAVEL',
        justificativaFormal: 'Aplicável mediante incorporação contratual em auditorias de operadores aéreos certificados IOSA.',
      },
      periodicidade: 'ANUAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Organograma institucional aprovado, manual MOMQ Capítulo 2 e relatórios de auditorias internas.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  // F. Pacote Requisitos Contratuais Específicos (Avion Express, Placar, Swiss)
  const requisitosContratuaisClientes: RequisitoClienteItem[] = [
    {
      id: 'REQ-AVION-01',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-AVION',
      clienteNome: 'Avion Express',
      programaId: 'PROG-AVION-ACMI',
      programaCodigo: 'AVION-A320',
      numeroItem: 'AV-01',
      codigoReferenciaOriginal: 'Avion Express SLA Cláusula 4.1 (Technical Data)',
      entidadeEmissora: 'Avion Express (Quality Department)',
      capituloSecaoSubitem: 'Section 4 - Technical Operations & Airbus Data',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Acesso Obrigatório ao Portal AirbusWorld e Manuais A320 Vigentes',
      textoOriginal: 'The maintenance organization must maintain active login credentials and real-time access to the AirbusWorld portal and current Avion Express Operations Specifications (OpSpecs) and GMM.',
      categoria: 'Controle Documental',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Avion Express Maintenance Provider Agreement',
      edicaoRevisaoFonte: 'SLA 2026 Rev. 01',
      dataVigenciaFonte: '2026-02-15',
      perguntaAuditoria: 'Os mecânicos possuem acesso funcional aos manuais vigentes do A320 no portal AirbusWorld?',
      interpretacaoInterna: 'Requisito contratual direto decorrente da operação charter e ACMI da frota A320 da Avion Express.',
      procedimentoInternoRef: 'MOMQ Seção 3.2 e Credenciais AirbusWorld',
      processoResponsavel: 'Controle Documental & Engenharia',
      controleCentralId: 'CTRL-DOCS-01',
      controleCentralCodigo: 'CTRL-DOCS-01',
      controleCentralNome: 'Controle de Publicações Técnicas, AMM e Manuais do Cliente',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU', 'VCP'], modelosAeronave: ['A320', 'A321'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Avion Express'], basesAplicaveis: ['SOD', 'GRU', 'VCP'] },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DEMONSTRACAO',
      evidenciaEsperada: 'Comprovante de login ativo no AirbusWorld e log de conferência de revisões.',
      createdAt: '2026-02-15T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-PLACAR-01',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-PLACAR',
      clienteNome: 'Placar Linhas Aéreas',
      programaId: 'PROG-PLACAR-LINE',
      programaCodigo: 'PLACAR-E190',
      numeroItem: 'PL-01',
      codigoReferenciaOriginal: 'Placar Contrato Cláusula 6.2 (Embraer TechCare)',
      entidadeEmissora: 'Placar Linhas Aéreas (Qualidade)',
      capituloSecaoSubitem: 'Cláusula 6 — Apoio Técnico e Publicações',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Acesso e Cumprimento das Publicações Embraer TechCare (E-Jets E2)',
      textoOriginal: 'A estação de manutenção deve assegurar acesso contínuo aos manuais técnicos vigentes da família Embraer E-Jets E2 através do portal Embraer TechCare e procedimentos do manual de manutenção da Placar Linhas Aéreas.',
      categoria: 'Controle Documental',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Contrato de Suporte em Linha Placar Linhas Aéreas',
      edicaoRevisaoFonte: 'Contrato nº CT-2026-PL01',
      dataVigenciaFonte: '2026-02-20',
      perguntaAuditoria: 'Os mecânicos possuem acesso aos manuais vigentes do E190-E2 no portal TechCare e procedimentos da Placar?',
      interpretacaoInterna: 'Requisito contratual específico para atendimento das aeronaves corporativas da Placar Linhas Aéreas.',
      procedimentoInternoRef: 'MOMQ Seção 3.2 e Credenciais Embraer TechCare',
      processoResponsavel: 'Controle Documental & Manutenção de Linha',
      controleCentralId: 'CTRL-DOCS-01',
      controleCentralCodigo: 'CTRL-DOCS-01',
      controleCentralNome: 'Controle de Publicações Técnicas, AMM e Manuais do Cliente',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeRegras: { basesAplicaveis: ['SOD', 'GRU'], modelosAeronave: ['E190-E2', 'E195-E2'] },
      aplicabilidadeContexto: { situacao: 'APLICAVEL', clientesAplicaveis: ['Placar Linhas Aéreas'], basesAplicaveis: ['SOD', 'GRU'] },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DEMONSTRACAO',
      evidenciaEsperada: 'Registros de acesso TechCare e folhas de cumprimento de rotinas de manutenção.',
      createdAt: '2026-02-20T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-SWISS-01',
      organizationId: 'org_impacto_aviation',
      clienteId: 'CLI-SWISS',
      clienteNome: 'SWISS International Air Lines',
      programaId: 'PROG-SWISS-STATION',
      programaCodigo: 'SWISS-MRO-CHK',
      numeroItem: 'SW-01',
      codigoReferenciaOriginal: 'SWISS Station Audit Requirements (Pendente de Protocolo)',
      entidadeEmissora: 'SWISS International Air Lines (Compliance)',
      capituloSecaoSubitem: 'Section 1 - Station Compliance',
      tipoRequisitoNormativo: 'CONTRATUAL',
      statusValidacaoConteudo: 'PENDENTE_VALIDACAO',
      tituloCurto: 'Requisitos Técnicos de Estação SWISS (Pendente de Protocolo Oficial)',
      textoOriginal: 'Item registrado no cadastro de acolhimento institucional perante a SWISS International Air Lines. Conforme a regra de integridade SGQ da IMPACTO, nenhum requisito fictício ou presumido é inserido. O conteúdo original será importado após recepção formal do checklist oficial.',
      categoria: 'Homologação Cliente',
      fonteOrigem: 'CONTRATUAL_CLIENTE',
      fonteDocumentoNome: 'Checklist Oficial de Auditoria SWISS (Aguardando Protocolo)',
      edicaoRevisaoFonte: 'Pendente de emissão pelo cliente',
      dataVigenciaFonte: '2026-03-01',
      perguntaAuditoria: 'Requisitos oficiais da SWISS International Air Lines protocolados e vigentes?',
      interpretacaoInterna: 'Estrutura técnica cadastrada e apta para recepção do documento oficial sem inventar requisitos normativos.',
      procedimentoInternoRef: 'Aguardando protocolo formal',
      processoResponsavel: 'Garantia da Qualidade',
      criticidade: 'MEDIO',
      status: 'EM_REVISAO',
      aplicabilidadeContexto: {
        situacao: 'AGUARDANDO_AVALIACAO',
        justificativaFormal: 'Aguardando fornecimento do checklist oficial pela SWISS International Air Lines. Registro preservado com integridade documental.',
      },
      periodicidade: 'ANUAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Protocolo formal do checklist de estação emitido pela companhia aérea.',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  // G. Pacote Requisitos e Procedimentos Internos IMPACTO (MOMQ / PTM)
  const requisitosInternosImpacto: RequisitoClienteItem[] = [
    {
      id: 'REQ-IMP-MOMQ-01',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'IMPACTO Aviation MRO (SGQ Interno)',
      programaId: 'PROG-IMP-MOMQ',
      programaCodigo: 'MOMQ-SGQ',
      numeroItem: 'MOMQ-2.4',
      codigoReferenciaOriginal: 'MOMQ Seção 2.4 (Controle de Registros de Qualidade)',
      entidadeEmissora: 'IMPACTO Aviation MRO (SGQ)',
      capituloSecaoSubitem: 'Capítulo 2 — Sistema de Gestão da Qualidade / Seção 2.4',
      tipoRequisitoNormativo: 'INTERNO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Preservação de Registros Técnicos de Manutenção por 5 Anos',
      textoOriginal: 'Todos os registros técnicos de manutenção, ordens de serviço (F 001-09-2), fichas de recebimento de material (F 001-01-1) e relatórios de auditoria devem ser arquivados em meio digital seguro e auditável pelo prazo mínimo de 5 (cinco) anos.',
      categoria: 'Controle de Registros',
      fonteOrigem: 'INTERNO_IMPACTO',
      fonteDocumentoNome: 'Manual da Organização de Manutenção e da Qualidade (MOMQ)',
      edicaoRevisaoFonte: 'Rev. 08 (06/08/2026) / Rev. 14 Acervo',
      dataVigenciaFonte: '2025-06-01',
      perguntaAuditoria: 'Os registros técnicos de liberação de aeronaves estão arquivados com rastreabilidade auditável por no mínimo 5 anos?',
      interpretacaoInterna: 'Procedimento mandatório interno com base no RBAC 145.219 e políticas de governança da IMPACTO.',
      procedimentoInternoRef: 'MOMQ Seção 2.4 e F 001-02-1',
      processoResponsavel: 'Garantia da Qualidade & Arquivo Técnico',
      controleCentralId: 'CTRL-DOCS-01',
      controleCentralCodigo: 'CTRL-DOCS-01',
      controleCentralNome: 'Controle de Publicações Técnicas, AMM e Manuais do Cliente',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'SEMESTRAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Pastas digitais de Ordens de Serviço encerradas, F 001-09-2 e log de integridade do SGQ.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-IMP-MOMQ-02',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'IMPACTO Aviation MRO (SGQ Interno)',
      programaId: 'PROG-IMP-MOMQ',
      programaCodigo: 'MOMQ-SGQ',
      numeroItem: 'MOMQ-3.3',
      codigoReferenciaOriginal: 'MOMQ Seção 3.3 e 3.4.3 (Controle Central de Metrologia)',
      entidadeEmissora: 'IMPACTO Aviation MRO (SGQ)',
      capituloSecaoSubitem: 'Capítulo 3 — Instalações e Ferramental / Seções 3.3 e 3.4.3',
      tipoRequisitoNormativo: 'INTERNO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Extinção de Planilhas Locais e Controle Centralizado de Calibrações',
      textoOriginal: 'O controle de validade de calibração de ferramentas de todas as bases operacionais deve ser unificado na base de dados centralizada do SGQ (QualyQuest), sendo expressamente proibido o uso de planilhas locais descentralizadas sem conciliação sistêmica. Ferramental próximo de 15 dias do vencimento deve gerar alerta preventivo.',
      categoria: 'Metrologia / SGQ Digital',
      fonteOrigem: 'INTERNO_IMPACTO',
      fonteDocumentoNome: 'Manual da Organização de Manutenção e da Qualidade (MOMQ)',
      edicaoRevisaoFonte: 'Rev. 08 (06/08/2026) / Rev. 14 Acervo',
      dataVigenciaFonte: '2025-06-01',
      perguntaAuditoria: 'Todas as ferramentas calibráveis das bases operacionais estão catalogadas com travas de bloqueio no QualyQuest?',
      interpretacaoInterna: 'Ação preventiva sistêmica decorrente de RNC histórica, auditada e homologada em auditorias ANAC e FAA.',
      procedimentoInternoRef: 'MOMQ Seção 3.4.3 e F 001-06',
      processoResponsavel: 'Garantia da Qualidade & Supervisão de Ferramental',
      controleCentralId: 'CTRL-FERRAM-01',
      controleCentralCodigo: 'CTRL-FERRAM-01',
      controleCentralNome: 'Calibração e Controle de Ferramentas de Precisão',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DEMONSTRACAO',
      evidenciaEsperada: 'Painel de ferramentas do QualyQuest com status em tempo real e certificados RBC vinculados.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'REQ-IMP-PTM-01',
      organizationId: 'org_impacto_aviation',
      clienteId: '',
      clienteNome: 'IMPACTO Aviation MRO (SGQ Interno)',
      programaId: 'PROG-IMP-PTM',
      programaCodigo: 'PTM-SGQ',
      numeroItem: 'PTM-2.1',
      codigoReferenciaOriginal: 'PTM Seção 2.1 (Matriz de Treinamentos Mandatórios)',
      entidadeEmissora: 'IMPACTO Aviation MRO (Treinamento)',
      capituloSecaoSubitem: 'Capítulo 2 — Programas de Capacitação Técnica',
      tipoRequisitoNormativo: 'INTERNO',
      statusValidacaoConteudo: 'VALIDADO',
      tituloCurto: 'Treinamento Periódico Bienal de Fatores Humanos e SGSO',
      textoOriginal: 'Todo o pessoal técnico de manutenção e inspeção deve realizar treinamento de reciclagem em Fatores Humanos e Gerenciamento de Segurança Operacional (SGSO) a cada 24 meses.',
      categoria: 'Capacitação / Treinamento',
      fonteOrigem: 'INTERNO_IMPACTO',
      fonteDocumentoNome: 'Programa de Treinamento da Manutenção (PTM)',
      edicaoRevisaoFonte: 'Rev. 08 (11/05/2026)',
      dataVigenciaFonte: '2026-05-11',
      perguntaAuditoria: '100% dos mecânicos e inspetores estão com treinamentos de Fatores Humanos e SGSO vigentes nos últimos 24 meses?',
      interpretacaoInterna: 'Controle contínuo via módulo de Treinamentos e Matriz de Competências.',
      procedimentoInternoRef: 'PTM Seção 2.1 e IS 145-010 Rev. C',
      processoResponsavel: 'Engenharia de Treinamento & Qualificações',
      controleCentralId: 'CTRL-TREIN-01',
      controleCentralCodigo: 'CTRL-TREIN-01',
      controleCentralNome: 'Qualificação, Treinamento Recorrente e Fatores Humanos',
      criticidade: 'ALTO',
      status: 'ATIVO',
      aplicabilidadeContexto: { situacao: 'APLICAVEL' },
      periodicidade: 'MENSAL',
      metodoVerificacao: 'DOCUMENTAL',
      evidenciaEsperada: 'Certificados emitidos por instrutor homologado, listas de presença e registro no dossiê F 001-19.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    },
  ];

  return [
    {
      id: 'PAC-KALITTA-QA14',
      nome: 'Kalitta Air — Checklist Oficial Completo FORM QA-14',
      origem: 'CONTRATUAL_CLIENTE',
      emissor: 'Kalitta Quality Assurance Department',
      documentoFonte: 'FORM QA-14 LINE MAINTENANCE STATION AUDIT CHECKLIST',
      edicaoRevisao: 'QA 14 REV: 4 (01/09/2026)',
      dataVigencia: '2026-09-01',
      descricao: 'Todos os 69 itens autênticos extraídos fielmente das 7 páginas do FORM QA-14 Rev. 4 da Kalitta Air (General Operations, Personnel, Publications, Housing, Tools/Equipment, Materials, Aircraft Maintenance, Quality/Safety).',
      totalItens: requisitosKalittaQA14.length,
      statusValidacao: 'VALIDADO',
      requisitos: requisitosKalittaQA14,
    },
    {
      id: 'PAC-ATLAS-Q2059',
      nome: 'Atlas Air — Station Audit Checklist Q2059',
      origem: 'CONTRATUAL_CLIENTE',
      emissor: 'Atlas Air, Inc. (Station Quality & Compliance)',
      documentoFonte: 'Atlas Air Q2059 Station Audit Checklist',
      edicaoRevisao: 'Rev. 2025/2026',
      dataVigencia: '2025-06-15',
      descricao: 'Requisitos operacionais críticos de estações de linha Atlas Air (Housekeeping, Ferramentas, Peças, Treinamentos, Dados Técnicos Boeing, RII e Quarentena).',
      totalItens: requisitosAtlasQ2059.length,
      statusValidacao: 'VALIDADO',
      requisitos: requisitosAtlasQ2059,
    },
    {
      id: 'PAC-ANAC-RBAC-145',
      nome: 'ANAC — RBAC 145 & Instruções Suplementares',
      origem: 'REGULATORIO_ANAC',
      emissor: 'Agência Nacional de Aviação Civil (ANAC)',
      documentoFonte: 'RBAC 145 Emenda 09 / IS 145-001, IS 145-009, IS 145.109-001',
      edicaoRevisao: 'Rev. 09 (07/07/2023)',
      dataVigencia: '2023-07-07',
      descricao: 'Requisitos regulatórios primários brasileiros para oficinas de manutenção aeronáutica (equipamentos e calibração 145.109, pessoal e qualificações 145.161, manual MOMQ 145.209 e relatórios RMA 145.221).',
      totalItens: requisitosANAC.length,
      statusValidacao: 'VALIDADO',
      requisitos: requisitosANAC,
    },
    {
      id: 'PAC-EASA-PART-145',
      nome: 'EASA — Part-145 & EASA Supplement MNT-004',
      origem: 'REGULATORIO_EASA',
      emissor: 'European Union Aviation Safety Agency (EASA)',
      documentoFonte: 'Regulation (EU) No 1321/2014 Annex II & Supplement MNT-004',
      edicaoRevisao: 'Consolidated Nov/2024 / Supplement Rev. 02',
      dataVigencia: '2024-11-01',
      descricao: 'Requisitos da autoridade aeronáutica europeia para aprovação de oficinas de manutenção estrangeiras e liberação de serviços em frotas registradas na UE.',
      totalItens: requisitosEASA.length,
      statusValidacao: 'VALIDADO',
      requisitos: requisitosEASA,
    },
    {
      id: 'PAC-FAA-14-CFR-145',
      nome: 'FAA — 14 CFR Part 145 & Part 43 (Fonte de Referência Pública)',
      origem: 'BOA_PRATICA_REFERENCIA',
      emissor: 'Federal Aviation Administration (FAA)',
      documentoFonte: 'Title 14 CFR Part 145 (Repair Stations) & Part 43',
      edicaoRevisao: 'eCFR Vigente 2024/2026',
      dataVigencia: '2024-01-01',
      descricao: 'Requisitos regulatórios de referência da autoridade aeronáutica dos Estados Unidos (instalações, ferramentas, manuais de oficina e regras de desempenho 43.13). Aplicável à IMPACTO mediante contrato de prestação para operadores N-registered.',
      totalItens: requisitosFAA.length,
      statusValidacao: 'VALIDADO',
      observacaoIntegridade: 'Fonte de referência pública (eCFR). Não possui aplicabilidade regulatória primária automática à IMPACTO perante a ANAC.',
      requisitos: requisitosFAA,
    },
    {
      id: 'PAC-IOSA-ISM-16',
      nome: 'IOSA — Standards Manual (ISM) MNT / ORG',
      origem: 'PADRAO_SETORIAL_IOSA',
      emissor: 'International Air Transport Association (IATA)',
      documentoFonte: 'IOSA Standards Manual (ISM) Edition 16',
      edicaoRevisao: 'Edição 16 (Vigência 2025/2026)',
      dataVigencia: '2025-09-01',
      descricao: 'Padrão setorial internacional para operadores aéreos da IATA. Exigível da IMPACTO exclusivamente quando incorporado no contrato com operador aéreo auditado.',
      totalItens: requisitosIOSA.length,
      statusValidacao: 'VALIDADO',
      observacaoIntegridade: 'Padrão setorial voluntário. Não constitui obrigação regulatória primária direta da IMPACTO perante a ANAC.',
      requisitos: requisitosIOSA,
    },
    {
      id: 'PAC-CLIENTES-CONTRATUAIS',
      nome: 'Clientes — Avion Express, Placar Linhas Aéreas e SWISS',
      origem: 'CONTRATUAL_CLIENTE',
      emissor: 'Avion Express / Placar Linhas Aéreas / SWISS',
      documentoFonte: 'Contratos e Especificações de Serviço de Estação',
      edicaoRevisao: 'Vigentes 2025/2026',
      dataVigencia: '2026-02-15',
      descricao: 'Especificações contratuais vigentes para manutenção de linha A320 (Avion Express), E190-E2 (Placar) e estrutura de homologação SWISS (pendente de protocolo formal).',
      totalItens: requisitosContratuaisClientes.length,
      statusValidacao: 'VALIDADO',
      observacaoIntegridade: 'Requisito SWISS registrado estritamente como PENDENTE DE VALIDAÇÃO até recepção do checklist oficial da operadora suíça.',
      requisitos: requisitosContratuaisClientes,
    },
    {
      id: 'PAC-IMPACTO-INTERNO',
      nome: 'IMPACTO — MOMQ, PTM e Formulários SGQ F 001',
      origem: 'INTERNO_IMPACTO',
      emissor: 'IMPACTO Aviation MRO (Garantia da Qualidade)',
      documentoFonte: 'MOMQ MNT-001 Rev. 08 e PTM Rev. 08 (F 001-02-1)',
      edicaoRevisao: 'Rev. 08 (06/08/2026)',
      dataVigencia: '2025-06-01',
      descricao: 'Procedimentos internos obrigatórios do manual da qualidade (MOMQ), programa de capacitação (PTM) e formulários operacionais (calibráveis F 001-06, quarentena F 001-06-4, dossiê F 001-29).',
      totalItens: requisitosInternosImpacto.length,
      statusValidacao: 'VALIDADO',
      requisitos: requisitosInternosImpacto,
    },
  ];
}

// ============================================================================
// 3. COMPARADOR INTELIGENTE DE REQUISITOS PARA IMPORTAÇÃO SEGURA
// ============================================================================

export function compararRequisitosParaImportacao(
  existentes: RequisitoClienteItem[],
  pacote: PacoteCargaRequisitos
): ResultadoComparacaoCarga {
  const novos: RequisitoClienteItem[] = [];
  const atualizacoes: ResultadoComparacaoCarga['atualizacoes'] = [];
  const identicosJaExistentes: RequisitoClienteItem[] = [];
  const conflitosPotenciais: ResultadoComparacaoCarga['conflitosPotenciais'] = [];

  const mapaExistentesPorCod: Record<string, RequisitoClienteItem> = {};
  existentes.forEach((e) => {
    mapaExistentesPorCod[e.numeroItem.trim().toUpperCase()] = e;
  });

  pacote.requisitos.forEach((candidato) => {
    const codNorm = candidato.numeroItem.trim().toUpperCase();
    const existente = mapaExistentesPorCod[codNorm];

    if (!existente) {
      novos.push(candidato);
      return;
    }

    // Se já existe, verificar se é idêntico
    const mesmoTexto = (existente.textoOriginal || '').trim() === (candidato.textoOriginal || '').trim();
    const mesmaFonte = existente.fonteOrigem === candidato.fonteOrigem;
    const mesmoDoc = existente.fonteDocumentoNome === candidato.fonteDocumentoNome;

    if (mesmoTexto && mesmaFonte && mesmoDoc) {
      identicosJaExistentes.push(existente);
      return;
    }

    // Se existe mas fonte diferente, alerta conflito potencial de código
    if (existente.fonteOrigem !== candidato.fonteOrigem) {
      conflitosPotenciais.push({
        codigo: candidato.numeroItem,
        existente,
        candidato,
        motivo: `O código "${candidato.numeroItem}" já existe na base sob a fonte "${existente.fonteOrigem}", mas o candidato pertence a "${candidato.fonteOrigem}".`,
      });
      return;
    }

    // É uma atualização com novidades
    const diferencas: string[] = [];
    if (!mesmoTexto) diferencas.push('Atualização da redação normativa oficial');
    if (!mesmoDoc) diferencas.push('Atualização do documento fonte ou revisão');
    if (candidato.controleCentralCodigo && !existente.controleCentralCodigo) {
      diferencas.push(`Associação ao Controle Central ${candidato.controleCentralCodigo}`);
    }
    if (candidato.edicaoRevisaoFonte && existente.edicaoRevisaoFonte !== candidato.edicaoRevisaoFonte) {
      diferencas.push(`Revisão: ${existente.edicaoRevisaoFonte || 'Antiga'} → ${candidato.edicaoRevisaoFonte}`);
    }

    atualizacoes.push({
      existente,
      novo: {
        ...existente,
        ...candidato,
        id: existente.id, // Preserva o ID original para nunca duplicar
        historicoAlteracoesRequisito: existente.historicoAlteracoesRequisito || [],
        createdAt: existente.createdAt,
      },
      diferencas,
    });
  });

  return {
    pacoteId: pacote.id,
    pacoteNome: pacote.nome,
    totalNoPacote: pacote.requisitos.length,
    novos,
    atualizacoes,
    identicosJaExistentes,
    conflitosPotenciais,
  };
}

// ============================================================================
// 4. EXECUÇÃO SEGURA DA CARGA (SEM SOBRESCREVER DADOS VÁLIDOS)
// ============================================================================

export async function executarCargaPacoteRequisitos(
  organizationId: string,
  pacote: PacoteCargaRequisitos,
  existentes: RequisitoClienteItem[],
  modo: 'SOMENTE_NOVOS' | 'NOVOS_E_ATUALIZACOES',
  currentUser?: UserProfile | null
): Promise<{
  inseridos: number;
  atualizados: number;
  preservados: number;
  erros: string[];
}> {
  const comparacao = compararRequisitosParaImportacao(existentes, pacote);
  const itensParaGravar: RequisitoClienteItem[] = [];

  // Novos sempre são incluídos
  itensParaGravar.push(...comparacao.novos);

  // Atualizações se o modo permitir
  if (modo === 'NOVOS_E_ATUALIZACOES') {
    comparacao.atualizacoes.forEach((a) => {
      itensParaGravar.push(a.novo);
    });
  }

  const { gravados, erros } = await saveRequisitosLote(
    organizationId,
    itensParaGravar,
    currentUser,
    `Carga segura do pacote [${pacote.nome}]`
  );

  return {
    inseridos: comparacao.novos.length,
    atualizados: modo === 'NOVOS_E_ATUALIZACOES' ? comparacao.atualizacoes.length : 0,
    preservados: comparacao.identicosJaExistentes.length,
    erros,
  };
}
