/**
 * Motor de Controle de Versões e Idempotência Documental
 * Acervo de IA — QualyQuest SGQ
 */

import {
  FragmentoDocumento,
  RegistroHistoricoRevisaoManual,
  ComparativoRevisoesManual,
} from '../../types/aiKnowledgeBase';
import { ManualRecord } from '../../types';
import { fragmentsRepository } from './fragmentsRepository';

/**
 * Normaliza string de revisão (ex: "Rev. 14" -> "14", "Emenda 07" -> "7")
 */
export function normalizarNumeroRevisao(revStr: string): number {
  if (!revStr) return 0;
  const match = revStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Registra ou atualiza um manual mantendo o histórico de versões e garantindo idempotência
 */
export async function aplicarControleVersaoManual(params: {
  manualNovo: ManualRecord;
  fragmentosNovos: FragmentoDocumento[];
  manuaisExistentes: ManualRecord[];
}): Promise<{
  manualFinal: ManualRecord;
  manuaisAtualizados: ManualRecord[];
  isNovaRevisao: boolean;
  isIdempotenteMesmaRevisao: boolean;
  revisaoAnterior?: string;
}> {
  const { manualNovo, fragmentosNovos, manuaisExistentes } = params;
  const codigoLimpo = manualNovo.codigo.trim().toLowerCase();
  const novaRevNum = normalizarNumeroRevisao(manualNovo.revisao);

  // Busca se já existe manual com mesmo código
  const manualExistente = manuaisExistentes.find(
    (m) => m.codigo.trim().toLowerCase() === codigoLimpo
  );

  if (!manualExistente) {
    // Caso 1: Primeiro cadastro do manual
    const historicoInicial: RegistroHistoricoRevisaoManual = {
      revisao: manualNovo.revisao,
      dataRevisao: manualNovo.dataRevisao || manualNovo.dataVigencia,
      dataVigencia: manualNovo.dataVigencia,
      status: 'Vigente',
      totalFragmentos: fragmentosNovos.length,
      totalCapitulos: manualNovo.capitulos?.length || 0,
      resumoAlteracoes: 'Cadastro e ingestão inicial no Acervo de IA.',
      criadoEm: new Date().toISOString(),
    };

    const manualFinal: ManualRecord = {
      ...manualNovo,
      isRevisaoVigente: true,
      status: 'Vigente',
      revisoesHistorico: [historicoInicial],
      versoesConfiguracao: [
        {
          id: `cfg_${manualNovo.id}_${manualNovo.revisao}`,
          revisaoOuEmenda: manualNovo.revisao,
          inicioVigencia: manualNovo.dataVigencia,
          fonte: manualNovo.fonte || 'Acervo de IA',
          status: 'Vigente',
          resumoAlteracoes: 'Versão inicial homologada.',
        },
      ],
    };

    return {
      manualFinal,
      manuaisAtualizados: [manualFinal, ...manuaisExistentes.filter((m) => m.id !== manualFinal.id)],
      isNovaRevisao: false,
      isIdempotenteMesmaRevisao: false,
    };
  }

  const revExistenteNum = normalizarNumeroRevisao(manualExistente.revisao);

  // Caso 2: Reimportação da MESMA revisão (Idempotência Estrita)
  if (manualExistente.revisao.trim().toLowerCase() === manualNovo.revisao.trim().toLowerCase() || novaRevNum === revExistenteNum) {
    // Atualiza metadados sem duplicar fragmentos
    const manualFinal: ManualRecord = {
      ...manualExistente,
      titulo: manualNovo.titulo || manualExistente.titulo,
      conteudoTexto: manualNovo.conteudoTexto || manualExistente.conteudoTexto,
      capitulos: manualNovo.capitulos || manualExistente.capitulos,
      fragmentosTotal: fragmentosNovos.length,
      fragmentosIndexados: fragmentosNovos.length,
      relatorioCobertura: manualNovo.relatorioCobertura || manualExistente.relatorioCobertura,
      formatoOrigem: manualNovo.formatoOrigem || manualExistente.formatoOrigem,
      isRevisaoVigente: true,
      status: 'Vigente',
      atualizadoEm: new Date().toISOString(),
    };

    // Atualiza fragmentos no repositório com flag vigente
    await fragmentsRepository.setRevisaoVigente(manualFinal.id, manualFinal.revisao);

    return {
      manualFinal,
      manuaisAtualizados: manuaisExistentes.map((m) => (m.id === manualFinal.id ? manualFinal : m)),
      isNovaRevisao: false,
      isIdempotenteMesmaRevisao: true,
    };
  }

  // Caso 3: Importação de NOVA revisão (ex: Rev. 14 -> Rev. 15 ou 07 -> 08)
  const isMaisRecente = novaRevNum > revExistenteNum;
  const revisaoAnterior = manualExistente.revisao;

  // Monta registro da versão anterior arquivada
  const historicoAnterior: RegistroHistoricoRevisaoManual = {
    revisao: manualExistente.revisao,
    dataRevisao: manualExistente.dataRevisao || manualExistente.dataVigencia,
    dataVigencia: manualExistente.dataVigencia,
    fimVigencia: manualNovo.dataVigencia || new Date().toISOString().split('T')[0],
    status: 'Substituído',
    totalFragmentos: manualExistente.fragmentosTotal || manualExistente.capitulos?.length || 0,
    totalCapitulos: manualExistente.capitulos?.length || 0,
    resumoAlteracoes: `Substituído pela revisão ${manualNovo.revisao} em ${new Date().toISOString().split('T')[0]}.`,
    substituidoPorRevisao: manualNovo.revisao,
    criadoEm: manualExistente.criadoEm,
  };

  const historicoNovo: RegistroHistoricoRevisaoManual = {
    revisao: manualNovo.revisao,
    dataRevisao: manualNovo.dataRevisao || manualNovo.dataVigencia,
    dataVigencia: manualNovo.dataVigencia,
    status: isMaisRecente ? 'Vigente' : 'Substituído',
    totalFragmentos: fragmentosNovos.length,
    totalCapitulos: manualNovo.capitulos?.length || 0,
    resumoAlteracoes: manualNovo.descricaoResumo || `Nova revisão ${manualNovo.revisao} indexada no Acervo de IA.`,
    criadoEm: new Date().toISOString(),
  };

  const historicoCompleto = [
    historicoNovo,
    historicoAnterior,
    ...(manualExistente.revisoesHistorico || []).filter(
      (h) => h.revisao !== manualExistente.revisao && h.revisao !== manualNovo.revisao
    ),
  ];

  const configAnterior = (manualExistente.versoesConfiguracao || []).map((cfg) =>
    cfg.revisaoOuEmenda === manualExistente.revisao
      ? { ...cfg, status: 'Obsoleto' as const, fimVigencia: manualNovo.dataVigencia }
      : cfg
  );

  const novaConfig = {
    id: `cfg_${manualExistente.id}_${manualNovo.revisao}`,
    revisaoOuEmenda: manualNovo.revisao,
    inicioVigencia: manualNovo.dataVigencia,
    fonte: manualNovo.fonte || 'Acervo de IA',
    status: (isMaisRecente ? 'Vigente' : 'Obsoleto') as 'Vigente' | 'Obsoleto',
    resumoAlteracoes: manualNovo.descricaoResumo || `Revisão ${manualNovo.revisao} homologada.`,
  };

  const manualFinal: ManualRecord = {
    ...manualExistente,
    revisao: isMaisRecente ? manualNovo.revisao : manualExistente.revisao,
    titulo: manualNovo.titulo || manualExistente.titulo,
    dataVigencia: isMaisRecente ? manualNovo.dataVigencia : manualExistente.dataVigencia,
    dataRevisao: isMaisRecente ? (manualNovo.dataRevisao || manualNovo.dataVigencia) : manualExistente.dataRevisao,
    dataAprovacao: manualNovo.dataAprovacao || manualExistente.dataAprovacao,
    conteudoTexto: isMaisRecente ? manualNovo.conteudoTexto : manualExistente.conteudoTexto,
    capitulos: isMaisRecente ? manualNovo.capitulos : manualExistente.capitulos,
    fragmentosTotal: isMaisRecente ? fragmentosNovos.length : manualExistente.fragmentosTotal,
    fragmentosIndexados: isMaisRecente ? fragmentosNovos.length : manualExistente.fragmentosIndexados,
    relatorioCobertura: isMaisRecente ? manualNovo.relatorioCobertura : manualExistente.relatorioCobertura,
    formatoOrigem: manualNovo.formatoOrigem || manualExistente.formatoOrigem,
    isRevisaoVigente: true,
    status: 'Vigente',
    revisoesHistorico: historicoCompleto,
    versoesConfiguracao: [novaConfig, ...configAnterior],
    atualizadoEm: new Date().toISOString(),
  };

  // Marca no repositório de fragmentos qual revisão é a vigente
  const revVigenteNome = isMaisRecente ? manualNovo.revisao : manualExistente.revisao;
  await fragmentsRepository.setRevisaoVigente(manualFinal.id, revVigenteNome);

  return {
    manualFinal,
    manuaisAtualizados: manuaisExistentes.map((m) => (m.id === manualFinal.id ? manualFinal : m)),
    isNovaRevisao: true,
    isIdempotenteMesmaRevisao: false,
    revisaoAnterior,
  };
}

/**
 * Compara duas revisões de um manual detalhando subitens novos, alterados e removidos
 */
export async function compararRevisoesDocumentaisAcervo(
  documentoId: string,
  revisaoA: string,
  revisaoB: string
): Promise<ComparativoRevisoesManual> {
  const normRev = (r: string) => (r || '').replace(/^rev\.?\s*/i, '').trim().toLowerCase();
  const targetA = normRev(revisaoA);
  const targetB = normRev(revisaoB);

  let fragsA = await fragmentsRepository.getFragmentsByDocumentId(documentoId, revisaoA);
  let fragsB = await fragmentsRepository.getFragmentsByDocumentId(documentoId, revisaoB);

  // Fallback inteligente caso os documentos tenham IDs de importação diferentes entre revisões (ex: man-momq-rev14 vs doc-momq-rev15-canonico)
  if (fragsA.length === 0 || fragsB.length === 0) {
    const todos = await fragmentsRepository.getAllFragments();
    const cleanId = (documentoId || '').trim().toLowerCase();
    const isMomqFamily = cleanId.includes('momq') || cleanId.includes('mnt');

    if (fragsA.length === 0) {
      fragsA = todos.filter((f) => {
        if (normRev(f.revisao) !== targetA) return false;
        if (isMomqFamily) {
          const fCod = (f.codigo || '').toLowerCase();
          const fDoc = (f.documentoId || '').toLowerCase();
          return fCod.includes('momq') || fCod.includes('mnt') || fDoc.includes('momq') || fDoc.includes('mnt');
        }
        return true;
      });
    }

    if (fragsB.length === 0) {
      fragsB = todos.filter((f) => {
        if (normRev(f.revisao) !== targetB) return false;
        if (isMomqFamily) {
          const fCod = (f.codigo || '').toLowerCase();
          const fDoc = (f.documentoId || '').toLowerCase();
          return fCod.includes('momq') || fCod.includes('mnt') || fDoc.includes('momq') || fDoc.includes('mnt');
        }
        return true;
      });
    }
  }

  const subitensA = new Map<string, FragmentoDocumento>();
  fragsA.forEach((f) => subitensA.set(f.subitem, f));

  const subitensB = new Map<string, FragmentoDocumento>();
  fragsB.forEach((f) => subitensB.set(f.subitem, f));

  const adicionados: string[] = [];
  const removidos: string[] = [];
  const alterados: Array<{ subitem: string; titulo: string; alteracaoResumo: string }> = [];

  // Itens em B que não estavam em A -> Adicionados
  subitensB.forEach((fB, sub) => {
    if (!subitensA.has(sub)) {
      adicionados.push(sub);
    } else {
      const fA = subitensA.get(sub)!;
      if (fA.conteudo !== fB.conteudo || fA.titulo !== fB.titulo) {
        alterados.push({
          subitem: sub,
          titulo: fB.titulo,
          alteracaoResumo: `Texto ou título atualizado na revisão ${revisaoB}.`,
        });
      }
    }
  });

  // Itens em A que não estão em B -> Removidos
  subitensA.forEach((_, sub) => {
    if (!subitensB.has(sub)) {
      removidos.push(sub);
    }
  });

  return {
    manualCodigo: fragsB[0]?.codigo || fragsA[0]?.codigo || documentoId,
    revisaoAnterior: revisaoA,
    revisaoNova: revisaoB,
    subitensAdicionados: adicionados,
    subitensRemovidos: removidos,
    subitensAlterados: alterados,
    totalFragmentosAnterior: fragsA.length,
    totalFragmentosNovo: fragsB.length,
    dataComparacao: new Date().toISOString(),
  };
}
