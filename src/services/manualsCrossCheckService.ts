import {
  DocumentoControlado,
  RevisaoDocumental,
  ManualRecord,
  UserProfile,
} from '../types';
import { db } from './firebase/config';
import { doc, runTransaction } from 'firebase/firestore';
import { sanitizeForFirestore, recordOrganizationAudit, saveManual } from './firebase/firestore';
import {
  saveDocumentoControlado,
  saveRevisaoDocumental,
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
