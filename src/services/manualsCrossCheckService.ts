import {
  DocumentoControlado,
  RevisaoDocumental,
  ManualRecord,
  UserProfile,
  LogVerificacaoFonteExterna,
} from '../types';
import { db } from './firebase/config';
import { doc, runTransaction } from 'firebase/firestore';
import { sanitizeForFirestore, recordOrganizationAudit, saveManual } from './firebase/firestore';
import {
  saveDocumentoControlado,
  saveRevisaoDocumental,
  saveLogVerificacao,
} from './firebase/documentControlFirestore';
import {
  normalizeDocumentCode,
  canonicalAlphanumericKey,
  normalizeRevisionNumber,
  calculateTitleSimilarity,
} from './documentControlAuditReconciliation';

export type StatusComparativoManualIA =
  | 'SINCRONIZADO'
  | 'BANCO_IA_MAIS_RECENTE'
  | 'ACERVO_SGQ_MAIS_RECENTE'
  | 'APENAS_NO_BANCO_IA'
  | 'APENAS_NO_ACERVO_SGQ';

export type AcaoRecomendadaManualIA =
  | 'IMPORTAR_REVISAO_PARA_SGQ'
  | 'ATUALIZAR_BANCO_IA'
  | 'CADASTRAR_NO_ACERVO_SGQ'
  | 'PUBLICAR_NO_BANCO_IA'
  | 'NENHUMA';

export interface ItemComparativoManualIA {
  id: string;
  codigo: string;
  codigoNormalizado: string;
  chaveAlfanumerica: string;
  titulo: string;
  origemTipo: 'INTERNO' | 'CLIENTE' | 'FABRICANTE' | 'REGULAMENTAR' | 'OUTRO';
  docSGQ?: DocumentoControlado;
  manualIA?: ManualRecord;
  revisaoSGQ?: string;
  dataSGQ?: string;
  revisaoIA?: string;
  dataIA?: string;
  temArquivoSGQ: boolean;
  temArquivoIA: boolean;
  statusComparacao: StatusComparativoManualIA;
  detalheDiferenca: string;
  acaoRecomendada: AcaoRecomendadaManualIA;
}

export interface RelatorioComparativoManuaisIA {
  geradoEm: string;
  organizationId: string;
  totalDocumentosSGQ: number;
  totalManuaisIA: number;
  totalSincronizados: number;
  totalBancoIAMaisRecente: number;
  totalAcervoSGQMaisRecente: number;
  totalApenasNoBancoIA: number;
  totalApenasNoAcervoSGQ: number;
  itens: ItemComparativoManualIA[];
}

/**
 * Extrai o valor numérico da revisão (ex: "Rev. 15" -> 15, "02" -> 2, "3.1" -> 3.1)
 */
export function extrairNumeroRevisao(rev: string = ''): number | null {
  if (!rev) return null;
  const match = rev.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Compara numericamente duas revisões (ex: "Rev. 15" vs "Rev. 14", "Emenda 03" vs "Emenda 02", "02" vs "01").
 * Retorna:
 * > 0 se revA for mais recente que revB
 * < 0 se revB for mais recente que revA
 * 0 se forem equivalentes
 */
export function compararRevisoesDocumentais(
  revA: string = '',
  dataA: string = '',
  revB: string = '',
  dataB: string = ''
): number {
  const normA = normalizeRevisionNumber(revA);
  const normB = normalizeRevisionNumber(revB);

  const numA = extrairNumeroRevisao(revA);
  const numB = extrairNumeroRevisao(revB);

  // 1. Comparação numérica direta se ambas possuírem número
  if (numA !== null && numB !== null) {
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  // 2. Se as strings normalizadas forem iguais, são a mesma revisão
  if (normA && normB && normA === normB) {
    return 0;
  }

  // 3. Critério de desempate por data de vigência / emissão
  if (dataA && dataB) {
    const timeA = new Date(dataA).getTime();
    const timeB = new Date(dataB).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
      if (timeA > timeB) return 1;
      if (timeA < timeB) return -1;
    }
  }

  // 4. Comparação alfanumérica simples
  return (normA || '').localeCompare(normB || '');
}

/**
 * Classifica a categoria de uso do manual com base no código e título
 */
function classificarOrigemManual(codigo: string, titulo: string): 'INTERNO' | 'CLIENTE' | 'FABRICANTE' | 'REGULAMENTAR' | 'OUTRO' {
  const c = codigo.toUpperCase();
  const t = titulo.toUpperCase();

  if (
    c.includes('MOMQ') ||
    c.includes('MGQ') ||
    c.includes('MOE') ||
    c.includes('SGSO') ||
    c.includes('POP') ||
    c.includes('IT-') ||
    c.includes('EASA') ||
    t.includes('EMPRESA') ||
    t.includes('INTERNO') ||
    t.includes('ORGANIZAÇÃO') ||
    t.includes('PROCEDIMENTO')
  ) {
    return 'INTERNO';
  }

  if (c.includes('RBAC') || c.includes('IS-') || c.includes('FAA') || c.includes('ICAO') || c.includes('ANAC')) {
    return 'REGULAMENTAR';
  }

  if (c.includes('AMM') || c.includes('CMM') || c.includes('IPC') || c.includes('SRM') || c.includes('WDM')) {
    return 'FABRICANTE';
  }

  if (t.includes('CLIENTE') || c.includes('CLI-')) {
    return 'CLIENTE';
  }

  return 'OUTRO';
}

/**
 * Executa auditoria cruzada read-only entre o Acervo SGQ (controlled_documents)
 * e o Banco de Manuais (IA) (manuals collection).
 */
export function executarComparativoAcervoComBancoManuaisIA(
  organizationId: string,
  documentosSGQ: DocumentoControlado[],
  revisoesSGQ: RevisaoDocumental[],
  manualsIA: ManualRecord[]
): RelatorioComparativoManuaisIA {
  const agora = new Date().toISOString();

  // Filtra documentos do Acervo SGQ ativos da organização
  const docsAtivos = documentosSGQ.filter(
    (d) => d.organizationId === organizationId && d.statusGeral !== 'INATIVO'
  );

  // Mapeia Manuais do Banco IA por código normalizado e chave alfanumérica
  const iaMapPorCodigoNorm = new Map<string, ManualRecord>();
  const iaMapPorChaveAlpha = new Map<string, ManualRecord>();
  const iaProcessados = new Set<string>();

  manualsIA.forEach((m) => {
    const norm = normalizeDocumentCode(m.codigo);
    const alpha = canonicalAlphanumericKey(m.codigo);
    if (norm) iaMapPorCodigoNorm.set(norm, m);
    if (alpha) iaMapPorChaveAlpha.set(alpha, m);
  });

  const itens: ItemComparativoManualIA[] = [];

  // 1. Analisa cada documento do Acervo SGQ e busca no Banco IA
  docsAtivos.forEach((docSGQ) => {
    const codigoNorm = normalizeDocumentCode(docSGQ.codigo);
    const chaveAlpha = canonicalAlphanumericKey(docSGQ.codigo);

    // Tenta encontrar correspondente no Banco IA
    let manualIA = iaMapPorCodigoNorm.get(codigoNorm) || iaMapPorChaveAlpha.get(chaveAlpha);

    // Se não encontrou por código estrito, tenta correspondência de alta similaridade textual
    if (!manualIA) {
      manualIA = manualsIA.find((m) => {
        if (iaProcessados.has(m.id)) return false;
        const sim = calculateTitleSimilarity(docSGQ.titulo, m.titulo);
        return sim >= 0.88;
      });
    }

    if (manualIA) {
      iaProcessados.add(manualIA.id);

      const revSGQ = docSGQ.numeroRevisao || '';
      const dataSGQ = docSGQ.dataRevisao || docSGQ.updatedAt || '';
      const revIA = manualIA.revisao || '';
      const dataIA = manualIA.dataVigencia || manualIA.atualizadoEm || '';

      const compRev = compararRevisoesDocumentais(revIA, dataIA, revSGQ, dataSGQ);

      let statusComparacao: StatusComparativoManualIA = 'SINCRONIZADO';
      let acaoRecomendada: AcaoRecomendadaManualIA = 'NENHUMA';
      let detalheDiferenca = `Manual sincronizado. Ambas as fontes estão na revisão ${revSGQ}.`;

      if (compRev > 0) {
        statusComparacao = 'BANCO_IA_MAIS_RECENTE';
        acaoRecomendada = 'IMPORTAR_REVISAO_PARA_SGQ';
        detalheDiferenca = `O Banco de Manuais (IA) possui a revisão mais recente "${revIA}" (${dataIA ? dataIA.split('T')[0] : 'sem data'}), enquanto o Acervo SGQ está na revisão "${revSGQ}" (${dataSGQ ? dataSGQ.split('T')[0] : 'sem data'}).`;
      } else if (compRev < 0) {
        statusComparacao = 'ACERVO_SGQ_MAIS_RECENTE';
        acaoRecomendada = 'ATUALIZAR_BANCO_IA';
        detalheDiferenca = `O Acervo SGQ possui a revisão mais recente "${revSGQ}" (${dataSGQ ? dataSGQ.split('T')[0] : 'sem data'}), enquanto o Banco de Manuais (IA) está na revisão anterior "${revIA}".`;
      }

      itens.push({
        id: `comp-${docSGQ.id}-${manualIA.id}`,
        codigo: docSGQ.codigo,
        codigoNormalizado: codigoNorm,
        chaveAlfanumerica: chaveAlpha,
        titulo: docSGQ.titulo,
        origemTipo: classificarOrigemManual(docSGQ.codigo, docSGQ.titulo),
        docSGQ,
        manualIA,
        revisaoSGQ: revSGQ,
        dataSGQ,
        revisaoIA: revIA,
        dataIA,
        temArquivoSGQ: !!docSGQ.arquivoNome,
        temArquivoIA: !!(manualIA.arquivoBase64 || manualIA.arquivoNome),
        statusComparacao,
        detalheDiferenca,
        acaoRecomendada,
      });
    } else {
      // Documento existe no Acervo SGQ mas NÃO existe no Banco de Manuais IA
      itens.push({
        id: `comp-sgq-only-${docSGQ.id}`,
        codigo: docSGQ.codigo,
        codigoNormalizado: codigoNorm,
        chaveAlfanumerica: chaveAlpha,
        titulo: docSGQ.titulo,
        origemTipo: classificarOrigemManual(docSGQ.codigo, docSGQ.titulo),
        docSGQ,
        manualIA: undefined,
        revisaoSGQ: docSGQ.numeroRevisao,
        dataSGQ: docSGQ.dataRevisao || docSGQ.updatedAt,
        revisaoIA: undefined,
        dataIA: undefined,
        temArquivoSGQ: !!docSGQ.arquivoNome,
        temArquivoIA: false,
        statusComparacao: 'APENAS_NO_ACERVO_SGQ',
        detalheDiferenca: `Documento controlado registrado no Acervo SGQ com revisão "${docSGQ.numeroRevisao}", mas ainda não indexado no Banco de Manuais (IA) para consultas inteligentes.`,
        acaoRecomendada: 'PUBLICAR_NO_BANCO_IA',
      });
    }
  });

  // 2. Analisa Manuais do Banco IA que NÃO foram mapeados para nenhum doc do Acervo SGQ
  manualsIA.forEach((manualIA) => {
    if (iaProcessados.has(manualIA.id)) return;

    const codigoNorm = normalizeDocumentCode(manualIA.codigo);
    const chaveAlpha = canonicalAlphanumericKey(manualIA.codigo);

    itens.push({
      id: `comp-ia-only-${manualIA.id}`,
      codigo: manualIA.codigo,
      codigoNormalizado: codigoNorm,
      chaveAlfanumerica: chaveAlpha,
      titulo: manualIA.titulo,
      origemTipo: classificarOrigemManual(manualIA.codigo, manualIA.titulo),
      docSGQ: undefined,
      manualIA,
      revisaoSGQ: undefined,
      dataSGQ: undefined,
      revisaoIA: manualIA.revisao,
      dataIA: manualIA.dataVigencia || manualIA.atualizadoEm,
      temArquivoSGQ: false,
      temArquivoIA: !!(manualIA.arquivoBase64 || manualIA.arquivoNome),
      statusComparacao: 'APENAS_NO_BANCO_IA',
      detalheDiferenca: `Manual presente no Banco de Manuais (IA) com revisão "${manualIA.revisao || 'N/A'}", porém sem cadastro formal correspondente no Acervo de Controle Documental SGQ.`,
      acaoRecomendada: 'CADASTRAR_NO_ACERVO_SGQ',
    });
  });

  // Contadores
  const totalSincronizados = itens.filter((i) => i.statusComparacao === 'SINCRONIZADO').length;
  const totalBancoIAMaisRecente = itens.filter((i) => i.statusComparacao === 'BANCO_IA_MAIS_RECENTE').length;
  const totalAcervoSGQMaisRecente = itens.filter((i) => i.statusComparacao === 'ACERVO_SGQ_MAIS_RECENTE').length;
  const totalApenasNoBancoIA = itens.filter((i) => i.statusComparacao === 'APENAS_NO_BANCO_IA').length;
  const totalApenasNoAcervoSGQ = itens.filter((i) => i.statusComparacao === 'APENAS_NO_ACERVO_SGQ').length;

  return {
    geradoEm: agora,
    organizationId,
    totalDocumentosSGQ: docsAtivos.length,
    totalManuaisIA: manualsIA.length,
    totalSincronizados,
    totalBancoIAMaisRecente,
    totalAcervoSGQMaisRecente,
    totalApenasNoBancoIA,
    totalApenasNoAcervoSGQ,
    itens,
  };
}

/**
 * Executa a conciliação atômica de um item individual entre o Acervo SGQ e o Banco de Manuais IA.
 */
export async function sincronizarItemBancoManuaisIA(
  organizationId: string,
  item: ItemComparativoManualIA,
  currentUser?: UserProfile | null
): Promise<{ sucesso: boolean; mensagem: string }> {
  const agora = new Date().toISOString();
  const user = currentUser || {
    displayName: 'Gestor SGQ',
    email: 'qualidade@impacto.aero',
    uid: 'system-sgq',
    role: 'ADMIN',
  };

  try {
    // -------------------------------------------------------------
    // CASO 1: BANCO IA MAIS RECENTE -> Importar revisão para Acervo SGQ
    // -------------------------------------------------------------
    if (item.statusComparacao === 'BANCO_IA_MAIS_RECENTE' && item.docSGQ && item.manualIA) {
      const docAlvo = item.docSGQ;
      const manualOrigem = item.manualIA;
      const novaRevNum = manualOrigem.revisao || 'Rev. Nova';
      const novaRevId = `rev-sync-${docAlvo.id}-${Date.now()}`;
      const dataRev = manualOrigem.dataVigencia || manualOrigem.dataEmissao || agora.split('T')[0];

      const novaRevisao: RevisaoDocumental = {
        id: novaRevId,
        organizationId,
        documentoId: docAlvo.id,
        codigoDocumento: docAlvo.codigo,
        tituloDocumento: docAlvo.titulo,
        numeroRevisao: novaRevNum,
        dataEmissao: dataRev,
        dataEntradaVigor: dataRev,
        statusCicloVida: 'VIGENTE',
        origemRevisao: 'IMPORTACAO',
        ehImutavel: true,
        arquivoNome: manualOrigem.arquivoNome,
        observacoes: `Revisão atualizada e conciliada a partir do Banco de Manuais (IA). Registro automático SGQ.`,
        createdAt: agora,
        updatedAt: agora,
      };

      // Salva a nova revisão com unicidade garantida
      await saveRevisaoDocumental(organizationId, novaRevisao, currentUser);

      // Atualiza o documento controlado
      const docAtualizado: DocumentoControlado = {
        ...docAlvo,
        numeroRevisao: novaRevNum,
        dataRevisao: dataRev,
        statusVerificacao: 'CONFORME',
        dataUltimaVerificacao: agora,
        detalhesUltimaVerificacao: `Sincronizado e conciliado com o Banco de Manuais (IA) em ${agora}. Revisão atual: ${novaRevNum}.`,
        arquivoNome: docAlvo.arquivoNome || manualOrigem.arquivoNome,
        updatedAt: agora,
      };

      await saveDocumentoControlado(organizationId, docAtualizado, currentUser, docAlvo);

      // Registro de Auditoria
      await recordOrganizationAudit(organizationId, {
        entity: 'DOCUMENT_CONTROL',
        entityId: docAlvo.id,
        action: 'UPDATE',
        changedByUid: user.uid,
        changedByEmail: user.email,
        summary: `Conciliação com Banco de Manuais (IA): Acervo SGQ atualizado para a revisão ${novaRevNum} do manual ${docAlvo.codigo}`,
        details: JSON.stringify({
          acao: 'IMPORTAR_REVISAO_PARA_SGQ',
          codigo: docAlvo.codigo,
          revisaoAnterior: docAlvo.numeroRevisao,
          revisaoNova: novaRevNum,
          origemManualId: manualOrigem.id,
        }),
        reason: 'Conciliação automática de revisão entre Banco de Manuais IA e Acervo SGQ',
        origin: 'CONTROLE_DOCUMENTAL',
      });

      return {
        sucesso: true,
        mensagem: `Acervo SGQ atualizado com sucesso! Manual "${docAlvo.codigo}" agora está na revisão ${novaRevNum}.`,
      };
    }

    // -------------------------------------------------------------
    // CASO 2: ACERVO SGQ MAIS RECENTE -> Atualizar Banco de Manuais (IA)
    // -------------------------------------------------------------
    if (item.statusComparacao === 'ACERVO_SGQ_MAIS_RECENTE' && item.docSGQ && item.manualIA) {
      const docOrigem = item.docSGQ;
      const manualAlvo = item.manualIA;

      const manualAtualizado: ManualRecord = {
        ...manualAlvo,
        revisao: docOrigem.numeroRevisao || '',
        dataVigencia: docOrigem.dataRevisao || manualAlvo.dataVigencia || agora.split('T')[0],
        atualizadoEm: agora,
        historicoAlteracoes: [
          ...(manualAlvo.historicoAlteracoes || []),
          {
            versao: docOrigem.numeroRevisao || '',
            data: agora,
            autor: user.displayName || 'Gestor SGQ',
            descricao: `Conciliado com o Acervo Oficial de Controle Documental SGQ. Revisão atualizada para ${docOrigem.numeroRevisao}.`,
          },
        ],
      };

      await saveManual(organizationId, manualAtualizado, currentUser);

      await recordOrganizationAudit(organizationId, {
        entity: 'MANUAL',
        entityId: manualAlvo.id,
        action: 'UPDATE',
        changedByUid: user.uid,
        changedByEmail: user.email,
        summary: `Conciliação com Acervo SGQ: Banco de Manuais (IA) atualizado para a revisão ${docOrigem.numeroRevisao} (${docOrigem.codigo})`,
        details: JSON.stringify({
          acao: 'ATUALIZAR_BANCO_IA',
          codigo: docOrigem.codigo,
          revisaoNova: docOrigem.numeroRevisao,
        }),
        reason: 'Sincronização de vigência com o acervo controlado oficial SGQ',
        origin: 'BANCO_MANUAIS_IA',
      });

      return {
        sucesso: true,
        mensagem: `Banco de Manuais (IA) sincronizado com sucesso! Manual "${manualAlvo.codigo}" atualizado para a revisão ${docOrigem.numeroRevisao}.`,
      };
    }

    // -------------------------------------------------------------
    // CASO 3: APENAS NO BANCO IA -> Cadastrar formalmente no Acervo SGQ
    // -------------------------------------------------------------
    if (item.statusComparacao === 'APENAS_NO_BANCO_IA' && item.manualIA) {
      const m = item.manualIA;
      const novoDocId = `doc-ia-${Date.now()}`;
      const revNum = m.revisao || '00';
      const dataRev = m.dataVigencia || m.dataEmissao || agora.split('T')[0];

      const novoDocControlado: DocumentoControlado = {
        id: novoDocId,
        organizationId,
        codigo: m.codigo,
        titulo: m.titulo,
        emissor: 'ORGANIZACAO',
        numeroRevisao: revNum,
        dataRevisao: dataRev,
        statusGeral: 'ATIVO',
        statusVerificacao: 'CONFORME',
        categoria: 'DOCUMENTO_INTERNO',
        responsavelNome: user.displayName || 'Qualidade / SGQ',
        exigeEvidenciaLeitura: false,
        dataUltimaVerificacao: agora,
        detalhesUltimaVerificacao: `Cadastrado no Acervo SGQ por conciliação a partir do Banco de Manuais (IA) em ${agora}.`,
        frequenciaVerificacaoDias: 90,
        arquivoNome: m.arquivoNome,
        aplicabilidadePadrao: {
          statusDeterminacao: 'DETERMINADA',
          observacoesAplicabilidade: 'Aplicável à organização conforme indexado no Banco de Manuais IA.',
        },
        createdAt: agora,
        updatedAt: agora,
      };

      await saveDocumentoControlado(organizationId, novoDocControlado, currentUser);

      // Cria a revisão inicial correspondente
      const novaRevisao: RevisaoDocumental = {
        id: `rev-init-${novoDocId}`,
        organizationId,
        documentoId: novoDocId,
        codigoDocumento: m.codigo,
        tituloDocumento: m.titulo,
        numeroRevisao: revNum,
        dataEmissao: dataRev,
        dataEntradaVigor: dataRev,
        statusCicloVida: 'VIGENTE',
        origemRevisao: 'IMPORTACAO',
        ehImutavel: true,
        arquivoNome: novoDocControlado.arquivoNome,
        observacoes: `Cadastro inicial no Acervo SGQ importado do Banco de Manuais (IA).`,
        createdAt: agora,
        updatedAt: agora,
      };

      await saveRevisaoDocumental(organizationId, novaRevisao, currentUser);

      await recordOrganizationAudit(organizationId, {
        entity: 'DOCUMENT_CONTROL',
        entityId: novoDocId,
        action: 'CREATE',
        changedByUid: user.uid,
        changedByEmail: user.email,
        summary: `Cadastro no Acervo SGQ por conciliação: "${m.codigo} — ${m.titulo}" importado do Banco de Manuais (IA)`,
        details: JSON.stringify({
          acao: 'CADASTRAR_NO_ACERVO_SGQ',
          codigo: m.codigo,
          manualOrigemId: m.id,
        }),
        reason: 'Incorporação de manual interno existente no Banco IA ao acervo formal controlado SGQ',
        origin: 'CONTROLE_DOCUMENTAL',
      });

      return {
        sucesso: true,
        mensagem: `Manual "${m.codigo}" cadastrado formalmente no Acervo SGQ com revisão ${revNum} e conformidade garantida!`,
      };
    }

    // -------------------------------------------------------------
    // CASO 4: APENAS NO ACERVO SGQ -> Publicar no Banco de Manuais (IA)
    // -------------------------------------------------------------
    if (item.statusComparacao === 'APENAS_NO_ACERVO_SGQ' && item.docSGQ) {
      const docOrigem = item.docSGQ;
      const novoManualId = `manual-sgq-${Date.now()}`;

      const novoManual: ManualRecord = {
        id: novoManualId,
        codigo: docOrigem.codigo,
        titulo: docOrigem.titulo,
        revisao: docOrigem.numeroRevisao || '',
        dataVigencia: docOrigem.dataRevisao || agora.split('T')[0],
        status: 'Vigente',
        setoresAplicaveis: ['Qualidade / SGQ', 'Manutenção'],
        descricaoResumo: docOrigem.titulo,
        conteudoTexto: `Manual do Acervo SGQ: ${docOrigem.codigo} — ${docOrigem.titulo}. Revisão Vigente: ${docOrigem.numeroRevisao}.`,
        fonte: 'Acervo SGQ Oficial',
        arquivoNome: docOrigem.arquivoNome,
        criadoEm: agora,
        atualizadoEm: agora,
        historicoAlteracoes: [
          {
            versao: docOrigem.numeroRevisao || '',
            data: agora,
            autor: user.displayName || 'Gestor SGQ',
            descricao: 'Publicado no Banco de Manuais (IA) a partir do Acervo de Controle Documental SGQ.',
          },
        ],
      };

      await saveManual(organizationId, novoManual, currentUser);

      await recordOrganizationAudit(organizationId, {
        entity: 'MANUAL',
        entityId: novoManualId,
        action: 'CREATE',
        changedByUid: user.uid,
        changedByEmail: user.email,
        summary: `Publicação no Banco de Manuais (IA): "${docOrigem.codigo} — ${docOrigem.titulo}" indexado para IA`,
        details: JSON.stringify({
          acao: 'PUBLICAR_NO_BANCO_IA',
          documentoId: docOrigem.id,
          codigo: docOrigem.codigo,
        }),
        reason: 'Disponibilização do manual controlado no Banco de Manuais para inteligência artificial',
        origin: 'BANCO_MANUAIS_IA',
      });

      return {
        sucesso: true,
        mensagem: `Documento "${docOrigem.codigo}" publicado com sucesso no Banco de Manuais (IA) para consultas!`,
      };
    }

    return {
      sucesso: true,
      mensagem: 'O documento já está sincronizado em conformidade.',
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Falha na conciliação: ${err.message || 'Erro desconhecido'}`,
    };
  }
}

/**
 * Executa a conciliação em lote de todas as pendências detectadas entre Acervo SGQ e Banco IA.
 */
export async function sincronizarTodasPendenciasBancoManuaisIA(
  organizationId: string,
  relatorio: RelatorioComparativoManuaisIA,
  currentUser?: UserProfile | null
): Promise<{ totalProcessados: number; sucessos: number; falhas: number; mensagens: string[] }> {
  const pendencias = relatorio.itens.filter((i) => i.statusComparacao !== 'SINCRONIZADO');
  let sucessos = 0;
  let falhas = 0;
  const mensagens: string[] = [];

  for (const item of pendencias) {
    const res = await sincronizarItemBancoManuaisIA(organizationId, item, currentUser);
    if (res.sucesso) {
      sucessos++;
    } else {
      falhas++;
    }
    mensagens.push(`${item.codigo}: ${res.mensagem}`);
  }

  return {
    totalProcessados: pendencias.length,
    sucessos,
    falhas,
    mensagens,
  };
}

// =============================================================================
// VERIFICAÇÃO DE ALINHAMENTO COM BANCO DE MANUAIS (IA) — REFERÊNCIA PARA NCS
// =============================================================================

export interface DiagnosticoAlinhamentoManualIA {
  documentoId: string;
  codigoDocumento: string;
  tituloDocumento: string;
  temCorrespondencia: boolean;
  manualIA: ManualRecord | null;
  metodoCorrespondencia:
    | 'VINCULO_DIRETO'
    | 'CODIGO_EXATO'
    | 'CODIGO_NORMALIZADO'
    | 'CHAVE_ALFANUMERICA'
    | 'TITULO_SIMILAR'
    | 'NENHUM';
  confiancaCorrespondencia: 'ALTA' | 'MEDIA' | 'BAIXA' | 'NENHUMA';
  revisaoOficialReferencia: string;
  dataOficialReferencia: string;
  origemReferenciaOficial: string;
  revisaoNoBancoIA: string;
  dataNoBancoIA: string;
  statusSincroniaIA:
    | 'SINCRONIZADO'
    | 'BANCO_IA_DESATUALIZADO'
    | 'ACERVO_DESATUALIZADO'
    | 'SEM_CORRESPONDENCIA'
    | 'REVISAO_NAO_CONFIRMADA';
  mensagemAlerta: string;
  acaoRecomendada:
    | 'ATUALIZAR_BANCO_IA'
    | 'ATUALIZAR_ACERVO_SGQ'
    | 'VINCULAR_MANUAL_IA'
    | 'CADASTRAR_NO_BANCO_IA'
    | 'CONFIRMAR_REVISAO_OFICIAL'
    | 'NENHUMA';
  dataVerificacao: string;
}

export interface RelatorioVerificacaoLoteIA {
  geradoEm: string;
  totalVerificados: number;
  totalSincronizados: number;
  totalBancoIADesatualizado: number;
  totalAcervoDesatualizado: number;
  totalSemCorrespondencia: number;
  totalRevisaoNaoConfirmada: number;
  diagnosticos: DiagnosticoAlinhamentoManualIA[];
}

/**
 * 1. IDENTIFICAR CORRESPONDÊNCIA:
 * Verifica se o documento controlado no acervo possui um manual correspondente no Banco de Manuais (IA),
 * utilizando identificadores confiáveis: código normalizado, chave canônica, vínculo direto ou título oficial.
 * Regra estrita: Se não houver correspondência confiável, sinaliza necessidade de identificação/associação
 * manual em vez de relacionar documentos incorretamente.
 */
export function identificarCorrespondenciaManualIA(
  doc: DocumentoControlado,
  manualsIA: ManualRecord[]
): {
  manual: ManualRecord | null;
  metodo:
    | 'VINCULO_DIRETO'
    | 'CODIGO_EXATO'
    | 'CODIGO_NORMALIZADO'
    | 'CHAVE_ALFANUMERICA'
    | 'TITULO_SIMILAR'
    | 'NENHUM';
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA' | 'NENHUMA';
} {
  if (!manualsIA || manualsIA.length === 0) {
    return { manual: null, metodo: 'NENHUM', confianca: 'NENHUMA' };
  }

  // 1.1 Vínculo direto explícito se o usuário já associou previamente
  if (doc.manualIAId) {
    const manualDir = manualsIA.find((m) => m.id === doc.manualIAId);
    if (manualDir) {
      return { manual: manualDir, metodo: 'VINCULO_DIRETO', confianca: 'ALTA' };
    }
  }

  const codDoc = (doc.codigo || '').trim().toUpperCase();
  const codNormDoc = normalizeDocumentCode(doc.codigo);
  const alphaDoc = canonicalAlphanumericKey(doc.codigo);

  // 1.2 Correspondência exata de código
  if (codDoc) {
    const matchExato = manualsIA.find((m) => (m.codigo || '').trim().toUpperCase() === codDoc);
    if (matchExato) {
      return { manual: matchExato, metodo: 'CODIGO_EXATO', confianca: 'ALTA' };
    }
  }

  // 1.3 Correspondência por código normalizado (unifica caixa, espaços e pontuações)
  if (codNormDoc) {
    const matchNorm = manualsIA.find((m) => normalizeDocumentCode(m.codigo) === codNormDoc);
    if (matchNorm) {
      return { manual: matchNorm, metodo: 'CODIGO_NORMALIZADO', confianca: 'ALTA' };
    }
  }

  // 1.4 Correspondência por chave alfanumérica canônica (ex: "AMM C208" vs "AMM-C208B")
  if (alphaDoc && alphaDoc.length >= 3) {
    const matchAlpha = manualsIA.find((m) => canonicalAlphanumericKey(m.codigo) === alphaDoc);
    if (matchAlpha) {
      return { manual: matchAlpha, metodo: 'CHAVE_ALFANUMERICA', confianca: 'ALTA' };
    }
  }

  // 1.5 Correspondência por similaridade de título oficial com alta exigência (threshold >= 0.88)
  const tituloDoc = (doc.titulo || '').trim();
  if (tituloDoc.length >= 6) {
    let melhorManual: ManualRecord | null = null;
    let maiorSim = 0;

    for (const m of manualsIA) {
      const sim = calculateTitleSimilarity(tituloDoc, m.titulo || '');
      if (sim > maiorSim) {
        maiorSim = sim;
        melhorManual = m;
      }
    }

    if (melhorManual && maiorSim >= 0.88) {
      return { manual: melhorManual, metodo: 'TITULO_SIMILAR', confianca: 'MEDIA' };
    }
  }

  // Sem correspondência confiável (não relaciona documentos incorretamente)
  return { manual: null, metodo: 'NENHUM', confianca: 'NENHUMA' };
}

/**
 * 2. DETERMINAR REFERÊNCIA DE ATUALIZAÇÃO:
 * Consulta as informações disponíveis para determinar qual é a revisão oficial mais recente conhecida do documento.
 * Aproveita o mecanismo de fontes públicas se validado (ex: ANAC/FAA), ou o controle de revisões vigente do acervo.
 * Regra: Se não for possível confirmar a revisão oficial, informa que a atualização não pôde ser confirmada,
 * sem declarar conformidade sem evidências suficientes.
 */
export function determinarReferenciaOficialDocumento(
  doc: DocumentoControlado
): {
  revisaoOficial: string;
  dataOficial: string;
  fonteReferencia: string;
  confiavel: boolean;
} {
  // 2.1 Se a fonte oficial pública (robô ANAC/FAA) confirmou conformidade
  if (
    doc.statusVerificacao === 'CONFORME' &&
    doc.revisaoNaFonteIdentificada &&
    doc.revisaoNaFonteIdentificada.trim()
  ) {
    return {
      revisaoOficial: doc.revisaoNaFonteIdentificada.trim(),
      dataOficial: doc.dataPublicacaoNaFonte || doc.dataRevisao || doc.dataUltimaVerificacao || '',
      fonteReferencia: `Fonte Pública Oficial Validada (${doc.urlFonteVerificacao || 'ANAC/FAA'})`,
      confiavel: true,
    };
  }

  // 2.2 Se a fonte oficial pública detectou uma nova revisão oficial identificada
  if (
    doc.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA' &&
    doc.revisaoNaFonteIdentificada &&
    doc.revisaoNaFonteIdentificada.trim()
  ) {
    return {
      revisaoOficial: doc.revisaoNaFonteIdentificada.trim(),
      dataOficial: doc.dataPublicacaoNaFonte || doc.dataUltimaVerificacao || '',
      fonteReferencia: 'Nova Revisão Identificada na Fonte Pública Oficial',
      confiavel: true,
    };
  }

  // 2.3 Revisão controlada formalmente no Acervo SGQ
  const revAcervo = (doc.numeroRevisao || doc.revisaoVigenteNumero || '').trim();
  if (revAcervo && revAcervo !== '-' && revAcervo.toLowerCase() !== 'pendente') {
    return {
      revisaoOficial: revAcervo,
      dataOficial: doc.dataRevisao || doc.updatedAt || '',
      fonteReferencia: 'Controle de Revisões Vigente do Acervo SGQ',
      confiavel: true,
    };
  }

  // 2.4 Não foi possível confirmar a revisão oficial
  return {
    revisaoOficial: '',
    dataOficial: '',
    fonteReferencia: 'Não foi possível confirmar a revisão oficial (evidências insuficientes)',
    confiavel: false,
  };
}

/**
 * 3 & 4 & 5. VERIFICAR ALINHAMENTO COM BANCO DE MANUAIS (IA):
 * Compara a versão identificada como referência atual com a versão do manual disponível no Banco de Manuais (IA).
 * Se o Banco IA estiver desatualizado, gera alerta claro orientando a ação necessária para evitar que a IA
 * fundamente análises de NCs em conteúdo obsoleto.
 */
export function verificarAlinhamentoManualIA(
  doc: DocumentoControlado,
  manualsIA: ManualRecord[]
): DiagnosticoAlinhamentoManualIA {
  const agora = new Date().toISOString();
  const correspondencia = identificarCorrespondenciaManualIA(doc, manualsIA);
  const referencia = determinarReferenciaOficialDocumento(doc);

  const base: Omit<
    DiagnosticoAlinhamentoManualIA,
    'statusSincroniaIA' | 'mensagemAlerta' | 'acaoRecomendada'
  > = {
    documentoId: doc.id,
    codigoDocumento: doc.codigo,
    tituloDocumento: doc.titulo,
    temCorrespondencia: !!correspondencia.manual,
    manualIA: correspondencia.manual,
    metodoCorrespondencia: correspondencia.metodo,
    confiancaCorrespondencia: correspondencia.confianca,
    revisaoOficialReferencia: referencia.revisaoOficial,
    dataOficialReferencia: referencia.dataOficial,
    origemReferenciaOficial: referencia.fonteReferencia,
    revisaoNoBancoIA: correspondencia.manual?.revisao || '',
    dataNoBancoIA:
      correspondencia.manual?.dataVigencia || correspondencia.manual?.atualizadoEm || '',
    dataVerificacao: agora,
  };

  // CASO 1: Documento não localizado no Banco IA
  if (!correspondencia.manual) {
    return {
      ...base,
      statusSincroniaIA: 'SEM_CORRESPONDENCIA',
      mensagemAlerta: `Documento controlado "${doc.codigo}" não possui manual correspondente localizado no Banco de Manuais (IA). Sinalizada a necessidade de identificação ou vinculação manual para que a IA possa utilizá-lo como referência oficial nas análises de NCs.`,
      acaoRecomendada: 'VINCULAR_MANUAL_IA',
    };
  }

  const manualIA = correspondencia.manual;

  // CASO 2: Revisão oficial não pôde ser confirmada com evidência suficiente
  if (!referencia.confiavel || !referencia.revisaoOficial) {
    return {
      ...base,
      statusSincroniaIA: 'REVISAO_NAO_CONFIRMADA',
      mensagemAlerta: `A atualização não pôde ser confirmada para "${doc.codigo}". O documento do acervo não possui revisão oficial válida registrada para atestar conformidade com o Banco de Manuais (IA).`,
      acaoRecomendada: 'CONFIRMAR_REVISAO_OFICIAL',
    };
  }

  // CASO 3: Manual no Banco IA não possui revisão declarada
  if (!manualIA.revisao || !manualIA.revisao.trim()) {
    return {
      ...base,
      statusSincroniaIA: 'REVISAO_NAO_CONFIRMADA',
      mensagemAlerta: `A atualização não pôde ser confirmada para "${doc.codigo}". O manual correspondente no Banco de Manuais (IA) não possui o número de revisão preenchido para comparação com a referência oficial (${referencia.revisaoOficial}).`,
      acaoRecomendada: 'ATUALIZAR_BANCO_IA',
    };
  }

  // CASO 4: Comparação semântica e cronológica de revisões
  // compararRevisoesDocumentais retorna > 0 se revA for maior que revB
  const comp = compararRevisoesDocumentais(
    referencia.revisaoOficial,
    referencia.dataOficial,
    manualIA.revisao,
    manualIA.dataVigencia
  );

  // Se comp > 0: referencia.revisaoOficial é mais recente que manualIA.revisao -> BANCO IA DESATUALIZADO!
  if (comp > 0) {
    return {
      ...base,
      statusSincroniaIA: 'BANCO_IA_DESATUALIZADO',
      mensagemAlerta: `Possível desatualização identificada no Banco de Manuais (IA). O acervo indica a revisão ${referencia.revisaoOficial} como referência atual, mas o conteúdo disponível para consulta pela IA corresponde à revisão ${manualIA.revisao}. Verifique o documento e atualize o banco de manuais, se necessário.`,
      acaoRecomendada: 'ATUALIZAR_BANCO_IA',
    };
  }

  // Se comp < 0: manualIA.revisao é mais recente que referencia.revisaoOficial -> ACERVO DESATUALIZADO!
  if (comp < 0) {
    return {
      ...base,
      statusSincroniaIA: 'ACERVO_DESATUALIZADO',
      mensagemAlerta: `O conteúdo disponível no Banco de Manuais (IA) corresponde à revisão ${manualIA.revisao}, superior à referência registrada no acervo (${referencia.revisaoOficial}). Verifique o documento e atualize o controle de revisões do acervo se necessário.`,
      acaoRecomendada: 'ATUALIZAR_ACERVO_SGQ',
    };
  }

  // Se comp === 0: Perfeitamente alinhados
  return {
    ...base,
    statusSincroniaIA: 'SINCRONIZADO',
    mensagemAlerta: `Banco de Manuais (IA) alinhado com a revisão oficial vigente (${referencia.revisaoOficial}). Conteúdo consistente para fundamentação e análise de Não Conformidades (NCs).`,
    acaoRecomendada: 'NENHUMA',
  };
}

/**
 * 6. EXECUTAR VERIFICAÇÃO INDIVIDUAL COM REGISTRO DE AUDITORIA:
 * Executa a verificação, atualiza o documento controlado no Firestore com os metadados de sincronia
 * e registra formalmente o log de auditoria em LogVerificacaoFonteExterna.
 */
export async function executarVerificacaoAlinhamentoBancoIA(
  organizationId: string,
  doc: DocumentoControlado,
  manualsIA: ManualRecord[],
  currentUser?: UserProfile | null
): Promise<DiagnosticoAlinhamentoManualIA> {
  const diag = verificarAlinhamentoManualIA(doc, manualsIA);
  const agora = new Date().toISOString();

  // 6.1 Atualiza metadados no DocumentoControlado
  const docAtualizado: DocumentoControlado = {
    ...doc,
    manualIAId: diag.manualIA?.id || doc.manualIAId,
    statusSincroniaIA: diag.statusSincroniaIA,
    revisaoNoBancoIA: diag.revisaoNoBancoIA || undefined,
    dataUltimaVerificacaoIA: agora,
    detalhesSincroniaIA: diag.mensagemAlerta,
    updatedAt: agora,
  };

  try {
    await saveDocumentoControlado(organizationId, docAtualizado, currentUser, doc);
  } catch (err) {
    console.warn('Aviso ao persistir statusSincroniaIA no documento controlado:', err);
  }

  // 6.2 Registra a evidência de log de verificação oficial no Firestore
  try {
    let statusLog: 'CONFORME' | 'NOVA_REVISAO_IDENTIFICADA' | 'FONTE_INDISPONIVEL' | 'VERIFICACAO_NAO_CONCLUSIVA' =
      'CONFORME';

    if (diag.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' || diag.statusSincroniaIA === 'ACERVO_DESATUALIZADO') {
      statusLog = 'NOVA_REVISAO_IDENTIFICADA';
    } else if (diag.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA') {
      statusLog = 'VERIFICACAO_NAO_CONCLUSIVA';
    } else if (diag.statusSincroniaIA === 'SEM_CORRESPONDENCIA') {
      statusLog = 'VERIFICACAO_NAO_CONCLUSIVA';
    }

    const logEntry: LogVerificacaoFonteExterna = {
      id: `log-ia-sync-${Date.now()}-${doc.id}`,
      organizationId,
      fonteId: 'banco-manuais-ia',
      fonteNome: 'Banco de Manuais (IA)',
      documentoId: doc.id,
      codigoDocumento: doc.codigo,
      revisaoAtualControlada: diag.revisaoOficialReferencia || doc.numeroRevisao || 'N/A',
      revisaoIdentificadaNaFonte: diag.revisaoNoBancoIA || 'Não localizada',
      statusVerificacao: statusLog,
      mensagem: diag.mensagemAlerta,
      requerValidacaoHumana: diag.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO',
      validacaoHumanaStatus:
        diag.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' ? 'PENDENTE' : 'VALIDADA_NOVA_REVISAO_ACEITA',
      dataVerificacao: agora,
      executadoPor: currentUser?.displayName || currentUser?.email || 'Verificação Automática SGQ / IA',
      evidenciaUrlOuTexto: diag.manualIA?.id ? `manual_id:${diag.manualIA.id}` : undefined,
    };

    await saveLogVerificacao(organizationId, logEntry, currentUser);
  } catch (logErr) {
    console.warn('Aviso ao registrar log de verificação do Banco IA:', logErr);
  }

  return diag;
}

/**
 * EXECUTAR VERIFICAÇÃO EM LOTE DE TODOS OS MANUAIS ATIVOS CONTRA O BANCO IA:
 */
export async function executarVerificacaoEmLoteBancoIA(
  organizationId: string,
  documentos: DocumentoControlado[],
  manualsIA: ManualRecord[],
  currentUser?: UserProfile | null
): Promise<RelatorioVerificacaoLoteIA> {
  const agora = new Date().toISOString();
  const docsAtivos = documentos.filter(
    (d) => d.organizationId === organizationId && d.statusGeral !== 'INATIVO'
  );

  const diagnosticos: DiagnosticoAlinhamentoManualIA[] = [];

  for (const doc of docsAtivos) {
    const diag = await executarVerificacaoAlinhamentoBancoIA(
      organizationId,
      doc,
      manualsIA,
      currentUser
    );
    diagnosticos.push(diag);
  }

  const totalSincronizados = diagnosticos.filter((d) => d.statusSincroniaIA === 'SINCRONIZADO').length;
  const totalBancoIADesatualizado = diagnosticos.filter(
    (d) => d.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO'
  ).length;
  const totalAcervoDesatualizado = diagnosticos.filter(
    (d) => d.statusSincroniaIA === 'ACERVO_DESATUALIZADO'
  ).length;
  const totalSemCorrespondencia = diagnosticos.filter(
    (d) => d.statusSincroniaIA === 'SEM_CORRESPONDENCIA'
  ).length;
  const totalRevisaoNaoConfirmada = diagnosticos.filter(
    (d) => d.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA'
  ).length;

  return {
    geradoEm: agora,
    totalVerificados: docsAtivos.length,
    totalSincronizados,
    totalBancoIADesatualizado,
    totalAcervoDesatualizado,
    totalSemCorrespondencia,
    totalRevisaoNaoConfirmada,
    diagnosticos,
  };
}

/**
 * ATUALIZAÇÃO CONTROLADA DO BANCO DE MANUAIS (IA):
 * Regra fundamental: A detecção de uma revisão mais recente NÃO provoca a substituição automática.
 * A atualização segue um fluxo controlado, onde o usuário revisa os dados e confirma formalmente a ação.
 */
export async function atualizarManualNoBancoIAControlado(params: {
  organizationId: string;
  manualId: string;
  docId: string;
  novaRevisao: string;
  novaDataVigencia: string;
  novoConteudoTexto?: string;
  novoArquivoNome?: string;
  justificativaAtualizacao?: string;
  currentUser?: UserProfile | null;
  manualExistente?: ManualRecord;
  docControlado?: DocumentoControlado;
}): Promise<{ sucesso: boolean; mensagem: string }> {
  const {
    organizationId,
    manualId,
    docId,
    novaRevisao,
    novaDataVigencia,
    novoConteudoTexto,
    novoArquivoNome,
    justificativaAtualizacao,
    currentUser,
    manualExistente,
    docControlado,
  } = params;

  const agora = new Date().toISOString();
  const user = currentUser || {
    displayName: 'Gestor SGQ',
    email: 'qualidade@impacto.aero',
    uid: 'system-sgq',
    role: 'ADMIN',
  };

  try {
    if (!manualExistente) {
      throw new Error('Manual do Banco IA não localizado para atualização.');
    }

    const revisaoAnterior = manualExistente.revisao;

    const manualAtualizado: ManualRecord = {
      ...manualExistente,
      revisao: novaRevisao.trim(),
      dataVigencia: novaDataVigencia || agora.split('T')[0],
      conteudoTexto: novoConteudoTexto || manualExistente.conteudoTexto,
      arquivoNome: novoArquivoNome || manualExistente.arquivoNome,
      status: 'Vigente',
      atualizadoEm: agora,
      historicoAlteracoes: [
        ...(manualExistente.historicoAlteracoes || []),
        {
          versao: novaRevisao.trim(),
          data: agora,
          autor: user.displayName || 'Gestor SGQ',
          descricao:
            justificativaAtualizacao ||
            `Atualização controlada para alinhamento com a revisão oficial vigente do Acervo SGQ (${novaRevisao}).`,
        },
      ],
    };

    await saveManual(organizationId, manualAtualizado, currentUser);

    // Atualiza o documento controlado para SINCRONIZADO
    if (docControlado) {
      const docAtualizado: DocumentoControlado = {
        ...docControlado,
        manualIAId: manualId,
        statusSincroniaIA: 'SINCRONIZADO',
        revisaoNoBancoIA: novaRevisao.trim(),
        dataUltimaVerificacaoIA: agora,
        detalhesSincroniaIA: `Banco de Manuais (IA) alinhado com a revisão oficial vigente (${novaRevisao.trim()}) após atualização controlada.`,
        updatedAt: agora,
      };

      await saveDocumentoControlado(organizationId, docAtualizado, currentUser, docControlado);

      // Registra Log Oficial
      const logEntry: LogVerificacaoFonteExterna = {
        id: `log-ia-update-${Date.now()}-${docControlado.id}`,
        organizationId,
        fonteId: 'banco-manuais-ia',
        fonteNome: 'Banco de Manuais (IA)',
        documentoId: docControlado.id,
        codigoDocumento: docControlado.codigo,
        revisaoAtualControlada: docControlado.numeroRevisao || 'N/A',
        revisaoIdentificadaNaFonte: novaRevisao.trim(),
        statusVerificacao: 'CONFORME',
        mensagem: `Manual no Banco de Manuais (IA) atualizado de forma controlada da revisão "${revisaoAnterior}" para "${novaRevisao.trim()}". Conteúdo alinhado para análises de NCs.`,
        requerValidacaoHumana: false,
        validacaoHumanaStatus: 'VALIDADA_NOVA_REVISAO_ACEITA',
        dataVerificacao: agora,
        executadoPor: user.displayName || 'Gestor SGQ',
      };

      await saveLogVerificacao(organizationId, logEntry, currentUser);
    }

    await recordOrganizationAudit(organizationId, {
      entity: 'MANUAL',
      entityId: manualId,
      action: 'UPDATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Atualização controlada no Banco de Manuais (IA): ${manualExistente.codigo} atualizado para ${novaRevisao}`,
      details: JSON.stringify({
        manualId,
        documentoControladoId: docId,
        revisaoAnterior,
        novaRevisao,
      }),
      reason: 'Alinhamento controlado do Banco de Manuais IA com a referência oficial do Acervo SGQ',
      origin: 'BANCO_MANUAIS_IA',
    });

    return {
      sucesso: true,
      mensagem: `Manual "${manualExistente.codigo}" atualizado com sucesso no Banco de Manuais (IA) para a revisão ${novaRevisao}. A IA agora utilizará este conteúdo oficial como referência nas NCs.`,
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro na atualização do manual no Banco IA: ${err.message || 'Erro inesperado'}`,
    };
  }
}

/**
 * VINCULAR DOCUMENTO CONTROLADO A MANUAL DO BANCO IA MANUALMENTE:
 * Utilizado quando não há correspondência automática confiável.
 */
export async function vincularDocumentoAoManualIA(
  organizationId: string,
  doc: DocumentoControlado,
  manualIA: ManualRecord,
  currentUser?: UserProfile | null
): Promise<{ sucesso: boolean; mensagem: string }> {
  const agora = new Date().toISOString();

  const docAtualizado: DocumentoControlado = {
    ...doc,
    manualIAId: manualIA.id,
    updatedAt: agora,
  };

  try {
    await saveDocumentoControlado(organizationId, docAtualizado, currentUser, doc);
    // Executa a verificação imediatamente com o novo vínculo
    await executarVerificacaoAlinhamentoBancoIA(
      organizationId,
      docAtualizado,
      [manualIA],
      currentUser
    );

    return {
      sucesso: true,
      mensagem: `Documento "${doc.codigo}" vinculado com sucesso ao manual "${manualIA.codigo}" no Banco de Manuais (IA).`,
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao vincular documento: ${err.message}`,
    };
  }
}

