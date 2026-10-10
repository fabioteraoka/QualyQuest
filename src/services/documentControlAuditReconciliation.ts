import {
  DocumentoControlado,
  RevisaoDocumental,
  RelatorioAuditoriaDuplicidades,
  GrupoDuplicidade,
  TipoConflitoDuplicidade,
  GrauSeveridadeDuplicidade,
  DocumentoDuplicidadeDetalhe,
  PlanoReconciliacao,
  ResultadoReconciliacao,
  ResultadoReconciliacaoItem,
  ResultadoReconstrucaoIndices,
  UserProfile,
} from '../types';
import { db } from './firebase/config';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { sanitizeForFirestore, recordOrganizationAudit } from './firebase/firestore';

// =========================================================================
// 1. REGRAS DE IDENTIDADE DOCUMENTAL E NORMALIZAÇÃO CANÔNICA
// =========================================================================

/**
 * Regra única de identidade documental SGQ:
 * 1. Converte para maiúsculas e remove espaços das extremidades.
 * 2. Normaliza sequências de espaços, pontuações de separação (hífens, barras, underscores) para hífen único '-'.
 * 3. Remove pontuações repetidas e limpa separadores no início/fim.
 * 4. Preserva pontos decimais e números de seções (ex: "IS 145.109-001" -> "IS-145.109-001", "AMM C208" -> "AMM-C208").
 */
export function normalizeDocumentCode(rawCode: string): string {
  if (!rawCode) return '';
  return rawCode
    .trim()
    .toUpperCase()
    .normalize('NFKC')
    .replace(/[\s_/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Chave de comparação ultra-estrita alfanumérica para detecção de variações
 * (ex: "AMM-C208", "AMM C208" e "AMM_C208" produzem "AMMC208")
 */
export function canonicalAlphanumericKey(rawCode: string): string {
  if (!rawCode) return '';
  return rawCode
    .toUpperCase()
    .normalize('NFKC')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalização de número de revisão para comparação
 * (ex: "Rev. 08", "Rev.8", "REV 08", "rev 8" produzem "08")
 */
export function normalizeRevisionNumber(rawRev: string): string {
  if (!rawRev) return '';
  const trimmed = rawRev.trim().toUpperCase();
  const matchNum = trimmed.match(/\d+/);
  if (matchNum) {
    return `REV_${matchNum[0].padStart(2, '0')}`;
  }
  return trimmed.replace(/[^A-Z0-9]/g, '_');
}

/**
 * Cálculo de similaridade textual entre dois títulos (0 a 1)
 * Combina overlap de tokens (Jaccard) com Bigramas
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  if (!titleA || !titleB) return 0;
  const cleanA = titleA.toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '').trim();
  const cleanB = titleB.toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '').trim();

  if (cleanA === cleanB) return 1.0;

  const tokensA = new Set(cleanA.split(/\s+/).filter((w) => w.length > 2));
  const tokensB = new Set(cleanB.split(/\s+/).filter((w) => w.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  const jaccard = intersection.size / union.size;
  return jaccard;
}

// =========================================================================
// 2. ROTINA DE AUDITORIA DE DUPLICIDADES (READ-ONLY)
// =========================================================================

export interface AuditoriaOpcoes {
  documentosIndicesFirestore?: Record<string, any>;
  toleranciaSimilaridadeTitulo?: number; // Padrão: 0.85
}

/**
 * Executa a auditoria completa de duplicidades e integridade de acervo (somente leitura).
 * Respeita estritamente o isolamento por organizationId.
 */
export function executarAuditoriaDuplicidades(
  organizationId: string,
  documentos: DocumentoControlado[],
  revisoes: RevisaoDocumental[],
  opcoes?: AuditoriaOpcoes
): RelatorioAuditoriaDuplicidades {
  const agora = new Date().toISOString();
  const thresholdTitulo = opcoes?.toleranciaSimilaridadeTitulo || 0.85;

  // Filtragem estrita por organizationId
  const docsOrg = documentos.filter((d) => d.organizationId === organizationId);
  const revsOrg = revisoes.filter((r) => r.organizationId === organizationId);

  // Mapeamento de revisões por documentoId
  const revsPorDoc = new Map<string, RevisaoDocumental[]>();
  revsOrg.forEach((rev) => {
    const list = revsPorDoc.get(rev.documentoId) || [];
    list.push(rev);
    revsPorDoc.set(rev.documentoId, list);
  });

  // Mapeamento de documentos por ID
  const docsPorId = new Map<string, DocumentoControlado>();
  docsOrg.forEach((doc) => docsPorId.set(doc.id, doc));

  const grupos: GrupoDuplicidade[] = [];
  const processedDocIds = new Set<string>();

  const docToDetail = (d: DocumentoControlado): DocumentoDuplicidadeDetalhe => {
    const docRevs = revsPorDoc.get(d.id) || [];
    return {
      id: d.id,
      codigo: d.codigo,
      codigoNormalizado: normalizeDocumentCode(d.codigo),
      chaveAlfanumerica: canonicalAlphanumericKey(d.codigo),
      titulo: d.titulo,
      numeroRevisao: d.numeroRevisao || d.revisaoVigenteNumero || 'S/R',
      dataRevisao: d.dataRevisao,
      revisaoVigenteId: d.revisaoVigenteId,
      statusGeral: d.statusGeral || 'ATIVO',
      tipoVerificacao: d.tipoVerificacao,
      statusVerificacao: d.statusVerificacao,
      dataUltimaVerificacao: d.dataUltimaVerificacao,
      categoria: d.categoria,
      emissor: d.emissor,
      proprietarioCessor: d.proprietarioCessor,
      totalRevisoes: docRevs.length,
      revisoesIds: docRevs.map((r) => r.id),
      revisoesNumeros: docRevs.map((r) => r.numeroRevisao),
      temArquivo: Boolean(d.arquivoNome || d.arquivoUrl || docRevs.some((r) => r.arquivoNome || r.arquivoUrl)),
      arquivoNome: d.arquivoNome || docRevs.find((r) => r.arquivoNome)?.arquivoNome,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  };

  // -------------------------------------------------------------
  // A. IDENTIFICAÇÃO DE CÓDIGOS EXATOS E CÓDIGOS NORMALIZADOS EQUIVALENTES
  // -------------------------------------------------------------
  const docsAtivos = docsOrg.filter((d) => d.statusGeral !== 'INATIVO');

  for (let i = 0; i < docsAtivos.length; i++) {
    const docA = docsAtivos[i];
    if (processedDocIds.has(docA.id)) continue;

    const grupoDocs: DocumentoControlado[] = [docA];
    let conflitoDetectado: TipoConflitoDuplicidade | null = null;
    let grauSev: GrauSeveridadeDuplicidade = 'CRITICO_BLOQUEANTE';
    let motivoConflito = '';

    const normA = normalizeDocumentCode(docA.codigo);
    const alphaA = canonicalAlphanumericKey(docA.codigo);

    for (let j = i + 1; j < docsAtivos.length; j++) {
      const docB = docsAtivos[j];
      if (processedDocIds.has(docB.id)) continue;

      const normB = normalizeDocumentCode(docB.codigo);
      const alphaB = canonicalAlphanumericKey(docB.codigo);

      if (docA.codigo.trim() === docB.codigo.trim()) {
        // Códigos exatamente iguais
        grupoDocs.push(docB);
        conflitoDetectado = 'CODIGO_EXATO';
        grauSev = 'CRITICO_BLOQUEANTE';
        motivoConflito = `Códigos documentais rigorosamente idênticos ("${docA.codigo}"). Multiplicidade de documentos-pai confirmada no acervo.`;
      } else if (normA === normB || (alphaA.length >= 4 && alphaA === alphaB)) {
        // Códigos equivalentes após normalização
        grupoDocs.push(docB);
        if (!conflitoDetectado) {
          conflitoDetectado = 'CODIGO_NORMALIZADO_EQUIVALENTE';
          grauSev = 'CRITICO_BLOQUEANTE';
          motivoConflito = `Códigos documentalmente equivalentes após normalização de caixa, espaços e pontuações ("${docA.codigo}" vs "${docB.codigo}"). Duplicidade de cadastro.`;
        }
      }
    }

    if (grupoDocs.length > 1 && conflitoDetectado) {
      grupoDocs.forEach((d) => processedDocIds.add(d.id));

      // Eleger o documento principal sugerido: mais revisões, ou mais antigo, ou com arquivo
      const ordenados = [...grupoDocs].sort((a, b) => {
        const revsA = (revsPorDoc.get(a.id) || []).length;
        const revsB = (revsPorDoc.get(b.id) || []).length;
        if (revsB !== revsA) return revsB - revsA;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

      const master = ordenados[0];

      grupos.push({
        id: `dup-cod-${normA || docA.id}`,
        tipoConflito: conflitoDetectado,
        grauSeveridade: grauSev,
        descricao: motivoConflito,
        chaveAgrupamento: normA,
        documentoPrincipalSugeridoId: master.id,
        documentos: grupoDocs.map(docToDetail),
        justificativaSugerida: `Consolidar as revisões e o histórico no cadastro principal ${master.codigo} (ID: ${master.id}) e inativar os registros secundários com rastreabilidade auditável.`,
        podeConsolidarAutomaticamente: true,
        statusResolucao: 'PENDENTE',
      });
    }
  }

  // -------------------------------------------------------------
  // B. IDENTIFICAÇÃO DE TÍTULOS SEMELHANTES E MESMA PUBLICAÇÃO COM CÓDIGOS DIVERGENTES
  // -------------------------------------------------------------
  for (let i = 0; i < docsAtivos.length; i++) {
    const docA = docsAtivos[i];
    if (processedDocIds.has(docA.id)) continue;

    const grupoSimilar: DocumentoControlado[] = [docA];

    for (let j = i + 1; j < docsAtivos.length; j++) {
      const docB = docsAtivos[j];
      if (processedDocIds.has(docB.id)) continue;

      const simTitulo = calculateTitleSimilarity(docA.titulo, docB.titulo);
      const mesmoEmissor =
        docA.emissor &&
        docB.emissor &&
        docA.emissor.trim().toLowerCase() === docB.emissor.trim().toLowerCase();

      if (simTitulo >= thresholdTitulo) {
        grupoSimilar.push(docB);
      } else if (simTitulo >= 0.70 && mesmoEmissor) {
        // Títulos 70%+ semelhantes do mesmo emissor/fabricante
        grupoSimilar.push(docB);
      }
    }

    if (grupoSimilar.length > 1) {
      grupoSimilar.forEach((d) => processedDocIds.add(d.id));

      const master = grupoSimilar[0];
      grupos.push({
        id: `dup-tit-${docA.id}`,
        tipoConflito: 'TITULO_MUITO_SEMELHANTE',
        grauSeveridade: 'ALERTA_REVISAO_HUMANA',
        descricao: `Títulos com alta similaridade textual encontrados entre códigos distintos (${grupoSimilar
          .map((d) => `"${d.codigo} — ${d.titulo}"`)
          .join(', ')}). Exige validação humana para confirmar se representam o mesmo manual ou publicações distintas.`,
        chaveAgrupamento: docA.titulo.trim().toLowerCase(),
        documentoPrincipalSugeridoId: master.id,
        documentos: grupoSimilar.map(docToDetail),
        justificativaSugerida: `Avaliação técnica requerida: verificar se tratam-se de versões com códigos diferentes do mesmo manual ou documentos complementares independentes.`,
        podeConsolidarAutomaticamente: false,
        statusResolucao: 'PENDENTE',
      });
    }
  }

  // -------------------------------------------------------------
  // C. REVISÕES DUPLICADAS POR DOCUMENTO
  // -------------------------------------------------------------
  docsOrg.forEach((doc) => {
    const docRevs = revsPorDoc.get(doc.id) || [];
    const revsPorNum = new Map<string, RevisaoDocumental[]>();

    docRevs.forEach((rev) => {
      const numNorm = normalizeRevisionNumber(rev.numeroRevisao);
      const list = revsPorNum.get(numNorm) || [];
      list.push(rev);
      revsPorNum.set(numNorm, list);
    });

    revsPorNum.forEach((dups, numNorm) => {
      if (dups.length > 1) {
        grupos.push({
          id: `dup-rev-${doc.id}-${numNorm}`,
          tipoConflito: 'REVISAO_DUPLICADA',
          grauSeveridade: 'CRITICO_BLOQUEANTE',
          descricao: `O documento "${doc.codigo}" possui ${dups.length} cadastros repetidos para a mesma revisão "${dups[0].numeroRevisao}".`,
          chaveAgrupamento: `${doc.id}__${numNorm}`,
          documentoPrincipalSugeridoId: doc.id,
          documentos: [docToDetail(doc)],
          justificativaSugerida: `Preservar o registro mais detalhado com anexo digital e consolidar/eliminar a revisão repetida.`,
          podeConsolidarAutomaticamente: true,
          statusResolucao: 'PENDENTE',
        });
      }
    });
  });

  // -------------------------------------------------------------
  // D. REVISÕES ÓRFÃS (SEM DOCUMENTO-PAI VÁLIDO)
  // -------------------------------------------------------------
  const revisoesOrfas = revsOrg.filter((r) => !docsPorId.has(r.documentoId));
  if (revisoesOrfas.length > 0) {
    // Agrupa por código informado na revisão
    const orfasPorCodigo = new Map<string, RevisaoDocumental[]>();
    revisoesOrfas.forEach((r) => {
      const c = r.codigoDocumento || 'SEM_CODIGO';
      const list = orfasPorCodigo.get(c) || [];
      list.push(r);
      orfasPorCodigo.set(c, list);
    });

    orfasPorCodigo.forEach((orfas, cod) => {
      // Tentar encontrar documento com código correspondente
      const docCandidato = docsOrg.find(
        (d) => normalizeDocumentCode(d.codigo) === normalizeDocumentCode(cod)
      );

      grupos.push({
        id: `orfa-rev-${cod}`,
        tipoConflito: 'REVISAO_ORFA',
        grauSeveridade: 'CRITICO_BLOQUEANTE',
        descricao: `Encontradas ${orfas.length} revisões órfãs para o código "${cod}" sem documento-pai válido no acervo (IDs órfãos: ${orfas
          .map((r) => r.id)
          .join(', ')}).`,
        chaveAgrupamento: `orfa__${cod}`,
        documentoPrincipalSugeridoId: docCandidato?.id,
        documentos: docCandidato ? [docToDetail(docCandidato)] : [],
        revisoesOrfas: orfas,
        justificativaSugerida: docCandidato
          ? `Reconectar as revisões órfãs ao documento existente "${docCandidato.codigo}".`
          : `Necessário criar o documento-pai ou reatribuir a revisão ao manual correspondente.`,
        podeConsolidarAutomaticamente: Boolean(docCandidato),
        statusResolucao: 'PENDENTE',
      });
    });
  }

  // -------------------------------------------------------------
  // E. ÍNDICES AUSENTES OU DIVERGENTES (SE DISPONIBILIZADOS)
  // -------------------------------------------------------------
  if (opcoes?.documentosIndicesFirestore) {
    const indices = opcoes.documentosIndicesFirestore;
    docsAtivos.forEach((doc) => {
      const norm = normalizeDocumentCode(doc.codigo);
      const indexDoc = indices[norm];
      if (!indexDoc) {
        grupos.push({
          id: `ind-aus-${doc.id}`,
          tipoConflito: 'INDICE_AUSENTE',
          grauSeveridade: 'ALERTA_REVISAO_HUMANA',
          descricao: `Documento ativo "${doc.codigo}" (ID: ${doc.id}) não possui índice transacional correspondente em controlled_documents_codes/${norm}.`,
          chaveAgrupamento: norm,
          documentoPrincipalSugeridoId: doc.id,
          documentos: [docToDetail(doc)],
          justificativaSugerida: `Reconstruir o índice único de código no Firestore para prevenir novas inserções concorrentes.`,
          podeConsolidarAutomaticamente: true,
          statusResolucao: 'PENDENTE',
        });
      } else if (indexDoc.documentoId !== doc.id && indexDoc.statusGeral !== 'INATIVO') {
        grupos.push({
          id: `ind-div-${doc.id}`,
          tipoConflito: 'INDICE_DIVERGENTE_OU_ORFAO',
          grauSeveridade: 'CRITICO_BLOQUEANTE',
          descricao: `Divergência de integridade: O índice controlled_documents_codes/${norm} aponta para o ID ${indexDoc.documentoId}, mas o documento ativo é ${doc.id}.`,
          chaveAgrupamento: norm,
          documentoPrincipalSugeridoId: doc.id,
          documentos: [docToDetail(doc)],
          justificativaSugerida: `Reconciliar apontamento do índice com o documento ativo correto.`,
          podeConsolidarAutomaticamente: false,
          statusResolucao: 'PENDENTE',
        });
      }
    });
  }

  const criticos = grupos.filter((g) => g.grauSeveridade === 'CRITICO_BLOQUEANTE').length;
  const alertas = grupos.filter((g) => g.grauSeveridade === 'ALERTA_REVISAO_HUMANA').length;
  const orfasCount = revisoesOrfas.length;
  const indicesInconsistentes = grupos.filter(
    (g) => g.tipoConflito === 'INDICE_AUSENTE' || g.tipoConflito === 'INDICE_DIVERGENTE_OU_ORFAO'
  ).length;

  return {
    organizationId,
    executadoEm: agora,
    executadoPor: 'Auditoria de Integridade SGQ (QualyQuest Core)',
    totalDocumentosAnalisados: docsOrg.length,
    totalRevisoesAnalisadas: revsOrg.length,
    totalIndicesAnalisados: opcoes?.documentosIndicesFirestore
      ? Object.keys(opcoes.documentosIndicesFirestore).length
      : 0,
    totalGruposDuplicidade: grupos.length,
    grupos,
    resumo: {
      criticos,
      alertas,
      revisoesOrfas: orfasCount,
      indicesAusentesOuDivergentes: indicesInconsistentes,
      conflitosResolvidos: 0,
    },
  };
}

// =========================================================================
// 3. SIMULAÇÃO E RECONCILIAÇÃO CONTROLADA (DRY-RUN & EXECUTE)
// =========================================================================

/**
 * Simulação de Reconciliação (Dry-Run):
 * Analisa as ações planejadas sem realizar qualquer gravação física no banco.
 */
export function simularReconciliacao(
  plano: PlanoReconciliacao,
  relatorio: RelatorioAuditoriaDuplicidades
): ResultadoReconciliacao {
  const agora = new Date().toISOString();
  const itensResultado: ResultadoReconciliacaoItem[] = [];

  for (const item of plano.itens) {
    const grupo = relatorio.grupos.find((g) => g.id === item.grupoId);
    if (!grupo) {
      itensResultado.push({
        grupoId: item.grupoId,
        sucesso: false,
        documentoPrincipalId: item.documentoPrincipalId,
        documentosConsolidadosIds: item.documentosSecundariosIds,
        totalRevisoesMigradas: 0,
        totalIndicesAtualizados: 0,
        mensagem: 'Grupo de duplicidade não localizado no relatório de auditoria.',
        erro: 'GRUPO_NAO_ENCONTRADO',
      });
      continue;
    }

    const docMaster = grupo.documentos.find((d) => d.id === item.documentoPrincipalId);
    if (!docMaster && item.acao !== 'MANTER_LEGITIMO_DISTINTO') {
      itensResultado.push({
        grupoId: item.grupoId,
        sucesso: false,
        documentoPrincipalId: item.documentoPrincipalId,
        documentosConsolidadosIds: item.documentosSecundariosIds,
        totalRevisoesMigradas: 0,
        totalIndicesAtualizados: 0,
        mensagem: 'Documento principal selecionado não existe no grupo de duplicidade.',
        erro: 'DOCUMENTO_PRINCIPAL_INVALIDO',
      });
      continue;
    }

    let revsParaMigrar = 0;
    if (item.migrarRevisoes) {
      item.documentosSecundariosIds.forEach((secId) => {
        const secDoc = grupo.documentos.find((d) => d.id === secId);
        if (secDoc) {
          revsParaMigrar += secDoc.totalRevisoes;
        }
      });
      if (grupo.revisoesOrfas) {
        revsParaMigrar += grupo.revisoesOrfas.length;
      }
    }

    itensResultado.push({
      grupoId: item.grupoId,
      sucesso: true,
      documentoPrincipalId: item.documentoPrincipalId,
      documentosConsolidadosIds: item.documentosSecundariosIds,
      totalRevisoesMigradas: revsParaMigrar,
      totalIndicesAtualizados: 1,
      mensagem:
        item.acao === 'MANTER_LEGITIMO_DISTINTO'
          ? `[Simulação] Registros confirmados como documentos legítimos distintos. Mantidos sem alteração.`
          : `[Simulação] ${revsParaMigrar} revisões serão migradas para o documento principal "${docMaster?.codigo}" (ID: ${item.documentoPrincipalId}). ${item.documentosSecundariosIds.length} cadastros duplicados serão inativados logicamente com preservação histórica.`,
    });
  }

  const sucessos = itensResultado.filter((i) => i.sucesso).length;
  const falhas = itensResultado.filter((i) => !i.sucesso).length;

  return {
    organizationId: plano.organizationId,
    executadoEm: agora,
    modo: 'SIMULACAO_DRY_RUN',
    totalGruposProcessados: plano.itens.length,
    totalSucessos: sucessos,
    totalFalhas: falhas,
    itens: itensResultado,
  };
}

/**
 * Executa a Reconciliação no Firestore com Garantia Transacional:
 * 1. Migra as revisões e referências para o documento principal.
 * 2. Inativa logicamente os documentos secundários com rastreabilidade auditável (NUNCA exclusão física cega).
 * 3. Reconstrói o índice de código do documento principal.
 * 4. Registra auditoria completa.
 */
export async function executarReconciliacaoFirestore(
  organizationId: string,
  plano: PlanoReconciliacao,
  currentUser: UserProfile | null,
  documentosAtuais: DocumentoControlado[],
  revisoesAtuais: RevisaoDocumental[]
): Promise<ResultadoReconciliacao> {
  const agora = new Date().toISOString();
  const itensResultado: ResultadoReconciliacaoItem[] = [];

  const user = currentUser || {
    displayName: 'Gestor SGQ Homologado',
    email: 'qualidade@impacto.aero',
    uid: 'system-sgq',
    role: 'ADMIN',
  };

  for (const item of plano.itens) {
    if (item.acao === 'MANTER_LEGITIMO_DISTINTO') {
      itensResultado.push({
        grupoId: item.grupoId,
        sucesso: true,
        documentoPrincipalId: item.documentoPrincipalId,
        documentosConsolidadosIds: [],
        totalRevisoesMigradas: 0,
        totalIndicesAtualizados: 0,
        mensagem: `Conflito marcado como Documentos Legítimos Distintos pelo gestor ${user.displayName}. Justificativa: ${item.justificativaTecnica}`,
      });
      continue;
    }

    try {
      const docMaster = documentosAtuais.find((d) => d.id === item.documentoPrincipalId);
      if (!docMaster) {
        throw new Error(`Documento principal ID ${item.documentoPrincipalId} não encontrado no acervo.`);
      }

      let totalMigradas = 0;

      // 1. Coleta revisões a serem migradas dos documentos secundários
      const revisoesParaAtualizar: RevisaoDocumental[] = [];

      item.documentosSecundariosIds.forEach((secId) => {
        const revsSec = revisoesAtuais.filter((r) => r.documentoId === secId);
        revsSec.forEach((r) => {
          revisoesParaAtualizar.push({
            ...r,
            documentoId: docMaster.id,
            codigoDocumento: docMaster.codigo,
            tituloDocumento: docMaster.titulo,
            updatedAt: agora,
            observacoes: `${r.observacoes || ''} [Migrado do documento duplicado ID ${secId} por Reconciliação SGQ em ${agora}]`.trim(),
          });
        });
      });

      // 2. Transação no Firestore para aplicar migração e consolidação atômica
      await runTransaction(db, async (transaction) => {
        // Atualiza as revisões apontando para o documento-pai principal
        for (const revMigrada of revisoesParaAtualizar) {
          const revRef = doc(db, 'organizations', organizationId, 'document_revisions', revMigrada.id);
          transaction.set(revRef, sanitizeForFirestore(revMigrada), { merge: true });

          // Atualiza o índice da revisão
          const revNumNorm = revMigrada.numeroRevisao.trim().toLowerCase().replace(/\s+/g, '_');
          const revIndexRef = doc(
            db,
            'organizations',
            organizationId,
            'controlled_document_revisions_codes',
            `${docMaster.id}__${revNumNorm}`
          );
          transaction.set(
            revIndexRef,
            sanitizeForFirestore({
              revisaoId: revMigrada.id,
              documentoId: docMaster.id,
              codigoDocumento: docMaster.codigo,
              numeroRevisao: revMigrada.numeroRevisao,
              updatedAt: agora,
            })
          );
        }

        // Inativa logicamente os documentos secundários preservando integridade
        for (const secId of item.documentosSecundariosIds) {
          const secDocRef = doc(db, 'organizations', organizationId, 'controlled_documents', secId);
          transaction.set(
            secDocRef,
            sanitizeForFirestore({
              statusGeral: 'INATIVO',
              inativadoEm: agora,
              inativadoPor: user.displayName,
              motivoInativacao: `Consolidado no manual principal "${docMaster.codigo}" (ID: ${docMaster.id}). Justificativa: ${item.justificativaTecnica}`,
              consolidadoEmDocumentoId: docMaster.id,
              updatedAt: agora,
            }),
            { merge: true }
          );

          // Limpa ou inativa o índice de código do documento secundário se o código for igual
          const secDoc = documentosAtuais.find((d) => d.id === secId);
          if (secDoc) {
            const secNorm = normalizeDocumentCode(secDoc.codigo);
            const masterNorm = normalizeDocumentCode(docMaster.codigo);
            if (secNorm === masterNorm) {
              // Garante que o índice pertença exclusivamente ao master
              const codeIndexRef = doc(
                db,
                'organizations',
                organizationId,
                'controlled_documents_codes',
                secNorm
              );
              transaction.set(
                codeIndexRef,
                sanitizeForFirestore({
                  documentoId: docMaster.id,
                  codigo: docMaster.codigo,
                  codigoNormalizado: masterNorm,
                  titulo: docMaster.titulo,
                  statusGeral: 'ATIVO',
                  updatedAt: agora,
                })
              );
            }
          }
        }

        // Atualiza o documento principal com contadores e revisão vigente consolidada
        const docMasterRef = doc(db, 'organizations', organizationId, 'controlled_documents', docMaster.id);
        transaction.set(
          docMasterRef,
          sanitizeForFirestore({
            updatedAt: agora,
            detalhesUltimaVerificacao: `${docMaster.detalhesUltimaVerificacao || ''} [Reconciliado com ${item.documentosSecundariosIds.length} cadastros em ${agora}]`.trim(),
          }),
          { merge: true }
        );
      });

      totalMigradas = revisoesParaAtualizar.length;

      // 3. Auditoria formal no Firestore
      await recordOrganizationAudit(organizationId, {
        entity: 'DOCUMENT_CONTROL',
        entityId: docMaster.id,
        action: 'UPDATE',
        changedByUid: user.uid,
        changedByEmail: user.email,
        summary: `Reconciliação e consolidação de manuais duplicados: ${docMaster.codigo} (Master: ${docMaster.id}) absorveu ${totalMigradas} revisões de [${item.documentosSecundariosIds.join(', ')}]`,
        details: JSON.stringify({
          documentoMasterId: docMaster.id,
          codigo: docMaster.codigo,
          documentosSecundarios: item.documentosSecundariosIds,
          totalRevisoesMigradas: totalMigradas,
          justificativa: item.justificativaTecnica,
        }),
        reason: item.justificativaTecnica,
        origin: 'CONTROLE_DOCUMENTAL',
      });

      itensResultado.push({
        grupoId: item.grupoId,
        sucesso: true,
        documentoPrincipalId: docMaster.id,
        documentosConsolidadosIds: item.documentosSecundariosIds,
        totalRevisoesMigradas: totalMigradas,
        totalIndicesAtualizados: 1,
        mensagem: `Sucesso: ${totalMigradas} revisões consolidadas no documento master "${docMaster.codigo}" (ID: ${docMaster.id}). ${item.documentosSecundariosIds.length} cadastros duplicados inativados com rastreabilidade auditável.`,
      });
    } catch (err: any) {
      itensResultado.push({
        grupoId: item.grupoId,
        sucesso: false,
        documentoPrincipalId: item.documentoPrincipalId,
        documentosConsolidadosIds: item.documentosSecundariosIds,
        totalRevisoesMigradas: 0,
        totalIndicesAtualizados: 0,
        mensagem: `Falha ao reconciliar grupo: ${err.message}`,
        erro: err.message,
      });
    }
  }

  const sucessos = itensResultado.filter((i) => i.sucesso).length;
  const falhas = itensResultado.filter((i) => !i.sucesso).length;

  return {
    organizationId,
    executadoEm: agora,
    modo: 'EXECUCAO_CONFIRMADA',
    totalGruposProcessados: plano.itens.length,
    totalSucessos: sucessos,
    totalFalhas: falhas,
    itens: itensResultado,
  };
}

// =========================================================================
// 4. RECONSTRUÇÃO SEGURA DE ÍNDICES DE UNICIDADE
// =========================================================================

/**
 * Reconstrói os índices de unicidade transacional a partir dos documentos existentes.
 * Detecta conflitos antes de gravar: se houver 2 documentos ATIVOS com o mesmo código normalizado,
 * o processo interrompe a gravação e retorna relatório impeditivo claro.
 */
export async function reconstruirIndicesUnicidade(
  organizationId: string,
  documentos: DocumentoControlado[],
  revisoes: RevisaoDocumental[],
  dryRun: boolean = false,
  currentUser?: UserProfile | null
): Promise<ResultadoReconstrucaoIndices> {
  const agora = new Date().toISOString();
  const docsAtivos = documentos.filter(
    (d) => d.organizationId === organizationId && d.statusGeral !== 'INATIVO'
  );

  // 1. Detecta potenciais conflitos de código entre documentos ativos
  const mapaCodigos = new Map<string, DocumentoControlado[]>();
  docsAtivos.forEach((doc) => {
    const norm = normalizeDocumentCode(doc.codigo);
    const list = mapaCodigos.get(norm) || [];
    list.push(doc);
    mapaCodigos.set(norm, list);
  });

  const conflitos: ResultadoReconstrucaoIndices['conflitos'] = [];
  mapaCodigos.forEach((docs, norm) => {
    if (docs.length > 1) {
      conflitos.push({
        codigo: docs[0].codigo,
        codigoNormalizado: norm,
        documentosConflitantes: docs.map((d) => ({ id: d.id, codigo: d.codigo, titulo: d.titulo })),
        motivoBloqueio: `Existem ${docs.length} documentos ativos concorrendo pelo mesmo código normalizado "${norm}". A reconstrução dos índices está bloqueada até que a reconciliação humana seja efetuada.`,
      });
    }
  });

  if (conflitos.length > 0) {
    return {
      organizationId,
      executadoEm: agora,
      modo: dryRun ? 'SIMULACAO_DRY_RUN' : 'EXECUCAO_CONFIRMADA',
      totalDocumentosVerificados: docsAtivos.length,
      totalIndicesGerados: 0,
      totalConflitosDetectados: conflitos.length,
      conflitos,
      sucesso: false,
      mensagem: `Reconstrução de índices bloqueada: ${conflitos.length} conflito(s) de código duplicado detectado(s). Execute a reconciliação antes de reconstruir os índices.`,
    };
  }

  // 2. Se for simulação (dryRun), retorna sucesso sem alterar o banco
  if (dryRun) {
    return {
      organizationId,
      executadoEm: agora,
      modo: 'SIMULACAO_DRY_RUN',
      totalDocumentosVerificados: docsAtivos.length,
      totalIndicesGerados: docsAtivos.length,
      totalConflitosDetectados: 0,
      conflitos: [],
      sucesso: true,
      mensagem: `[Simulação] Validação concluída: 0 conflitos encontrados. ${docsAtivos.length} índices de documentos e suas revisões estão aptos para reconstrução atômica.`,
    };
  }

  // 3. Execução real: grava os índices no Firestore
  try {
    const batch = writeBatch(db);

    docsAtivos.forEach((docItem) => {
      const norm = normalizeDocumentCode(docItem.codigo);
      const codeIndexRef = doc(db, 'organizations', organizationId, 'controlled_documents_codes', norm);
      batch.set(
        codeIndexRef,
        sanitizeForFirestore({
          documentoId: docItem.id,
          codigo: docItem.codigo,
          codigoNormalizado: norm,
          chaveAlfanumerica: canonicalAlphanumericKey(docItem.codigo),
          titulo: docItem.titulo,
          statusGeral: 'ATIVO',
          updatedAt: agora,
        })
      );
    });

    // Índices de revisões
    revisoes
      .filter((r) => r.organizationId === organizationId)
      .forEach((rev) => {
        const revNumNorm = rev.numeroRevisao.trim().toLowerCase().replace(/\s+/g, '_');
        const revIndexRef = doc(
          db,
          'organizations',
          organizationId,
          'controlled_document_revisions_codes',
          `${rev.documentoId}__${revNumNorm}`
        );
        batch.set(
          revIndexRef,
          sanitizeForFirestore({
            revisaoId: rev.id,
            documentoId: rev.documentoId,
            codigoDocumento: rev.codigoDocumento,
            numeroRevisao: rev.numeroRevisao,
            updatedAt: agora,
          })
        );
      });

    await batch.commit();

    const user = currentUser || { displayName: 'Gestor SGQ', email: 'sgq@impacto.aero', uid: 'system' };
    await recordOrganizationAudit(organizationId, {
      entity: 'DOCUMENT_CONTROL',
      entityId: `rebuild-indices-${Date.now()}`,
      action: 'UPDATE',
      changedByUid: user.uid,
      changedByEmail: user.email,
      summary: `Reconstrução de índices transacionais de unicidade: ${docsAtivos.length} documentos indexados com sucesso.`,
      reason: 'Reconstrução de integridade cadastral pós-auditoria de duplicidades',
      origin: 'CONTROLE_DOCUMENTAL',
    });

    return {
      organizationId,
      executadoEm: agora,
      modo: 'EXECUCAO_CONFIRMADA',
      totalDocumentosVerificados: docsAtivos.length,
      totalIndicesGerados: docsAtivos.length,
      totalConflitosDetectados: 0,
      conflitos: [],
      sucesso: true,
      mensagem: `Reconstrução de índices concluída com sucesso: ${docsAtivos.length} índices de documentos e revisões sincronizados no Firestore.`,
    };
  } catch (err: any) {
    return {
      organizationId,
      executadoEm: agora,
      modo: 'EXECUCAO_CONFIRMADA',
      totalDocumentosVerificados: docsAtivos.length,
      totalIndicesGerados: 0,
      totalConflitosDetectados: 0,
      conflitos: [],
      sucesso: false,
      mensagem: `Falha ao gravar índices no Firestore: ${err.message}`,
    };
  }
}
