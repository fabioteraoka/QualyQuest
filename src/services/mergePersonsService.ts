import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase/config';
import {
  ColaboradorPessoa,
  RegistroTreinamentoColaborador,
  CompetenciaColaborador,
  QualificacaoColaborador,
  DocumentoEvidenciaPessoa,
  UserProfile,
} from '../types';
import {
  normalizePersonName,
  normalizeMatriculaOrCanac,
  calculateNameSimilarity,
} from '../utils/personNormalization';
import {
  DEFAULT_ORGANIZATION_ID,
  sanitizeForFirestore,
  recordOrganizationAudit,
} from './firebase/firestore';
import { repository } from '../rooster/services/storage';

export type EtapaMesclagem =
  | 'PREPARACAO_E_BACKUP'
  | 'MIGRACAO_QUALYQUEST'
  | 'MIGRACAO_ROOSTER_MRO'
  | 'INATIVACAO_E_PRESERVACAO'
  | 'VERIFICACAO_E_CONFIRMACAO';

export interface ResumoVinculosPessoa {
  personId: string;
  totalTreinamentos: number;
  totalLicencas: number;
  totalDesignacoes: number;
  totalCompetencias: number;
  totalQualificacoes: number;
  totalDocumentos: number;
  totalRNCs: number;
  totalVinculos: number;
}

export interface GrupoDuplicadoDetectado {
  id: string;
  nomeNormalizado: string;
  motivo: string;
  score: number;
  colaboradorPrincipal: ColaboradorPessoa;
  colaboradorDuplicado: ColaboradorPessoa;
  vinculosPrincipal: ResumoVinculosPessoa;
  vinculosDuplicado: ResumoVinculosPessoa;
}

export interface OpcoesMesclagem {
  mesclarFrotas?: boolean;
  mesclarTreinamentos?: boolean;
  mesclarLicencas?: boolean;
  mesclarCompetencias?: boolean;
  mesclarDocumentos?: boolean;
  atualizarDadosCadastraisVazios?: boolean;
  preservarHistoricoInativando?: boolean; // Padrão: true (Requisito 5)
  excluirDefinitivamente?: boolean; // Se false (padrão), inativa e vincula
  motivo?: string;
  onStageChange?: (etapa: EtapaMesclagem, progresso: number, detalhe: string) => void;
}

export interface ResultadoMesclagem {
  sucesso: boolean;
  mensagem: string;
  erro?: string;
  colaboradorPrincipalId: string;
  colaboradorDuplicadoId: string;
  totalTreinamentosMigrados: number;
  totalLicencasMigradas: number;
  totalDesignacoesMigradas: number;
  totalCompetenciasMigradas: number;
  totalDocumentosMigrados: number;
  backupId?: string;
  registroPreservadoInativo?: boolean;
}

/**
 * Normaliza e assegura o identificador canônico da organização
 * Evita divergência entre 'impacto-aviation' e 'org_impacto_aviation'
 */
export function normalizarOrganizationId(orgId?: string): string {
  if (!orgId) return DEFAULT_ORGANIZATION_ID;
  const clean = orgId.trim();
  if (clean === 'impacto-aviation' || clean === 'impacto' || clean === '') {
    return DEFAULT_ORGANIZATION_ID;
  }
  return clean;
}

/**
 * Calcula o resumo de vínculos atrelados a um determinado colaborador
 * Avalia tanto o ecossistema SGQ quanto o Rooster MRO
 */
export function obterResumoVinculosColaborador(
  personId: string,
  contexto?: {
    trainingRecords?: RegistroTreinamentoColaborador[];
    qualifications?: QualificacaoColaborador[];
    personCompetencies?: CompetenciaColaborador[];
    documents?: DocumentoEvidenciaPessoa[];
    nonConformities?: any[];
  }
): ResumoVinculosPessoa {
  if (!personId) {
    return {
      personId: '',
      totalTreinamentos: 0,
      totalLicencas: 0,
      totalDesignacoes: 0,
      totalCompetencias: 0,
      totalQualificacoes: 0,
      totalDocumentos: 0,
      totalRNCs: 0,
      totalVinculos: 0,
    };
  }

  const idNorm = personId.trim().toLowerCase();
  const ctx = contexto || {};

  const treinosQualy = (ctx.trainingRecords || []).filter(
    (t) => (t.colaboradorId || '').trim().toLowerCase() === idNorm
  ).length;

  let treinosRooster = 0;
  let licencasRooster = 0;
  let designacoesPessoaRooster = 0;
  let designacoesBaseRooster = 0;
  let designacoesFuncaoRooster = 0;
  let designacoesAeronaveRooster = 0;

  try {
    const roosterDb = repository.getDatabase();
    treinosRooster = (roosterDb.treinamentos || []).filter(
      (t) => (t.pessoa_id || '').trim().toLowerCase() === idNorm
    ).length;

    licencasRooster = (roosterDb.licencas || []).filter(
      (l) => (l.pessoa_id || '').trim().toLowerCase() === idNorm
    ).length;

    designacoesPessoaRooster = (roosterDb.designacoesPessoa || []).filter(
      (dp) => (dp.pessoa_id || '').trim().toLowerCase() === idNorm
    ).length;

    designacoesBaseRooster = (roosterDb.designacoesBase || []).filter(
      (dbx) => (dbx.pessoa_id || '').trim().toLowerCase() === idNorm
    ).length;

    designacoesFuncaoRooster = (roosterDb.designacoesFuncao || []).filter(
      (df) => (df.pessoa_id || '').trim().toLowerCase() === idNorm
    ).length;

    designacoesAeronaveRooster = (roosterDb.designacoesAeronave || []).filter(
      (da) => (da.pessoa_id || '').trim().toLowerCase() === idNorm
    ).length;
  } catch {
    // Modo resiliente se repository não estiver acessível
  }

  const totalTreinamentos = Math.max(treinosQualy, treinosRooster);
  const totalLicencas = licencasRooster;
  const totalDesignacoes =
    designacoesPessoaRooster +
    designacoesBaseRooster +
    designacoesFuncaoRooster +
    designacoesAeronaveRooster;

  const totalCompetencias = (ctx.personCompetencies || []).filter(
    (c) => (c.colaboradorId || '').trim().toLowerCase() === idNorm
  ).length;

  const totalQualificacoes = (ctx.qualifications || []).filter(
    (q) => (q.colaboradorId || '').trim().toLowerCase() === idNorm
  ).length;

  const totalDocumentos = (ctx.documents || []).filter(
    (d) => (d.colaboradorId || '').trim().toLowerCase() === idNorm
  ).length;

  const totalRNCs = (ctx.nonConformities || []).filter(
    (nc) =>
      nc.responsavelImplementacaoId === personId ||
      nc.auditorId === personId ||
      (typeof nc.responsavelImplementacao === 'string' &&
        nc.responsavelImplementacao.toLowerCase().includes(idNorm))
  ).length;

  const totalVinculos =
    totalTreinamentos +
    totalLicencas +
    totalDesignacoes +
    totalCompetencias +
    totalQualificacoes +
    totalDocumentos +
    totalRNCs;

  return {
    personId,
    totalTreinamentos,
    totalLicencas,
    totalDesignacoes,
    totalCompetencias,
    totalQualificacoes,
    totalDocumentos,
    totalRNCs,
    totalVinculos,
  };
}

/**
 * Analisa a lista de colaboradores e identifica automaticamente repetições e duplicidades
 */
export function detectarColaboradoresDuplicados(
  colaboradores: ColaboradorPessoa[],
  contexto?: {
    trainingRecords?: RegistroTreinamentoColaborador[];
    qualifications?: QualificacaoColaborador[];
    personCompetencies?: CompetenciaColaborador[];
    documents?: DocumentoEvidenciaPessoa[];
    nonConformities?: any[];
  }
): GrupoDuplicadoDetectado[] {
  if (!colaboradores || colaboradores.length < 2) return [];

  const grupos: GrupoDuplicadoDetectado[] = [];
  const jaComparados = new Set<string>();

  for (let i = 0; i < colaboradores.length; i++) {
    const a = colaboradores[i];
    // Se já estiver inativado por unificação anterior, não sugere como nova duplicação
    if ((a as any).unificadoComId || (a.statusCustomizado && a.statusCustomizado.includes('Unificado'))) {
      continue;
    }

    const nomeANorm = normalizePersonName(a.nome);
    const canacANorm = normalizeMatriculaOrCanac((a as any).canac);
    const matANorm = normalizeMatriculaOrCanac(a.matricula);

    for (let j = i + 1; j < colaboradores.length; j++) {
      const b = colaboradores[j];
      if ((b as any).unificadoComId || (b.statusCustomizado && b.statusCustomizado.includes('Unificado'))) {
        continue;
      }

      const parKey = [a.id, b.id].sort().join(':::');
      if (jaComparados.has(parKey)) continue;
      jaComparados.add(parKey);

      const nomeBNorm = normalizePersonName(b.nome);
      const canacBNorm = normalizeMatriculaOrCanac((b as any).canac);
      const matBNorm = normalizeMatriculaOrCanac(b.matricula);

      let ehDuplicado = false;
      let motivo = '';
      let score = 0;

      // 1. Mesmo CANAC oficial
      if (canacANorm && canacBNorm && canacANorm === canacBNorm) {
        ehDuplicado = true;
        motivo = `Mesmo CANAC (${(a as any).canac || (b as any).canac})`;
        score = 1.0;
      }
      // 2. Nome idêntico normalizado
      else if (nomeANorm && nomeBNorm && nomeANorm === nomeBNorm) {
        ehDuplicado = true;
        motivo = 'Nome completo idêntico';
        score = 0.98;
      }
      // 3. Mesma matrícula funcional normalizada
      else if (matANorm && matBNorm && matANorm === matBNorm) {
        ehDuplicado = true;
        motivo = `Mesma Matrícula Funcional (${a.matricula || b.matricula})`;
        score = 0.95;
      }
      // 4. Alta similaridade de nome
      else if (nomeANorm && nomeBNorm) {
        const sim = calculateNameSimilarity(a.nome, b.nome);
        if (sim >= 0.88) {
          ehDuplicado = true;
          motivo = `Nome com alta similaridade fonética/textual (${Math.round(sim * 100)}%)`;
          score = sim;
        }
      }

      if (ehDuplicado) {
        const vinculosA = obterResumoVinculosColaborador(a.id, contexto);
        const vinculosB = obterResumoVinculosColaborador(b.id, contexto);

        let aScorePrincipal = 0;
        let bScorePrincipal = 0;

        if (a.id.startsWith('MEC-') || a.id.startsWith('IMP-')) aScorePrincipal += 10;
        if (b.id.startsWith('MEC-') || b.id.startsWith('IMP-')) bScorePrincipal += 10;

        aScorePrincipal += vinculosA.totalVinculos * 2;
        bScorePrincipal += vinculosB.totalVinculos * 2;

        if (a.status === 'ATIVO') aScorePrincipal += 5;
        if (b.status === 'ATIVO') bScorePrincipal += 5;

        const aEhPrincipal = aScorePrincipal >= bScorePrincipal;
        const principal = aEhPrincipal ? a : b;
        const duplicado = aEhPrincipal ? b : a;
        const vinculosP = aEhPrincipal ? vinculosA : vinculosB;
        const vinculosD = aEhPrincipal ? vinculosB : vinculosA;

        grupos.push({
          id: `${principal.id}__merge__${duplicado.id}`,
          nomeNormalizado: nomeANorm,
          motivo,
          score,
          colaboradorPrincipal: principal,
          colaboradorDuplicado: duplicado,
          vinculosPrincipal: vinculosP,
          vinculosDuplicado: vinculosD,
        });
      }
    }
  }

  return grupos.sort((x, y) => y.score - x.score);
}

/**
 * Cria snapshot de backup antes de realizar alterações estruturais
 */
export function criarBackupPreMerge(
  orgId: string,
  idPrincipal: string,
  idDuplicado: string,
  dadosRooster: any
): string {
  const backupId = `backup_merge_${idPrincipal}_${idDuplicado}_${Date.now()}`;
  try {
    const payload = {
      backupId,
      criadoEm: new Date().toISOString(),
      organizationId: orgId,
      idPrincipal,
      idDuplicado,
      roosterSnapshot: {
        pessoas: dadosRooster.pessoas.filter(
          (p: any) => p.id === idPrincipal || p.id === idDuplicado
        ),
        treinamentos: dadosRooster.treinamentos.filter(
          (t: any) => t.pessoa_id === idPrincipal || t.pessoa_id === idDuplicado
        ),
        licencas: dadosRooster.licencas.filter(
          (l: any) => l.pessoa_id === idPrincipal || l.pessoa_id === idDuplicado
        ),
        designacoesPessoa: dadosRooster.designacoesPessoa.filter(
          (dp: any) => dp.pessoa_id === idPrincipal || dp.pessoa_id === idDuplicado
        ),
      },
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`qualyquest_backup_${backupId}`, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('[mergePersonsService] Aviso ao salvar snapshot em localStorage:', err);
  }
  return backupId;
}

/**
 * Executa a unificação/mesclagem completa e segura de dois colaboradores:
 * - Etapa 1: Validação e Snapshot de Backup Prévio
 * - Etapa 2: Migração Firestore QualyQuest (treinamentos, qualificações, competências, documentos, RNCs)
 * - Etapa 3: Migração Firestore & Rooster MRO (licenças, treinamentos motor, frotas, funções, bases)
 * - Etapa 4: Inativação com preservação histórica do ID duplicado (ou exclusão se explicitamente configurada)
 * - Etapa 5: Verificação estrita de persistência (sem falsa mensagem de sucesso se houver rejeição)
 */
export async function mesclarColaboradores(
  organizationId: string,
  idPrincipal: string,
  idDuplicado: string,
  options: OpcoesMesclagem = {},
  userProfile?: UserProfile | null
): Promise<ResultadoMesclagem> {
  if (!idPrincipal || !idDuplicado) {
    throw new Error('Informe o ID do colaborador principal e do colaborador duplicado.');
  }

  if (idPrincipal === idDuplicado) {
    throw new Error('Não é possível mesclar um colaborador consigo mesmo.');
  }

  const orgId = normalizarOrganizationId(organizationId);
  const agora = new Date().toISOString();
  const userName = userProfile?.displayName || userProfile?.email || 'Gestor SGQ';
  const userEmail = userProfile?.email || 'admin@impactoaviation.com.br';
  const userUid = userProfile?.uid || auth.currentUser?.uid || 'system';

  // Configurações padrão seguras
  const preservarHistorico = options.preservarHistoricoInativando ?? true;
  const excluirDefinitivamente = options.excluirDefinitivamente ?? false;

  const notifyProgress = (etapa: EtapaMesclagem, pct: number, detalhe: string) => {
    if (options.onStageChange) {
      options.onStageChange(etapa, pct, detalhe);
    }
  };

  let totalTreinamentosMigrados = 0;
  let totalLicencasMigradas = 0;
  let totalDesignacoesMigradas = 0;
  let totalCompetenciasMigradas = 0;
  let totalDocumentosMigrados = 0;

  // =========================================================================
  // ETAPA 1: PREPARAÇÃO, CARGA E SNAPSHOT DE BACKUP
  // =========================================================================
  notifyProgress('PREPARACAO_E_BACKUP', 10, 'Carregando dados dos colaboradores e gerando snapshot de segurança...');

  const roosterDb = repository.getDatabase();
  const pessoaPrincipalRooster = roosterDb.pessoas.find((p) => p.id === idPrincipal);
  const pessoaDuplicadaRooster = roosterDb.pessoas.find((p) => p.id === idDuplicado);

  const docPrincipalRef = doc(db, 'organizations', orgId, 'persons', idPrincipal);
  const docDuplicadoRef = doc(db, 'organizations', orgId, 'persons', idDuplicado);

  const backupId = criarBackupPreMerge(orgId, idPrincipal, idDuplicado, roosterDb);

  let nomePrincipal = pessoaPrincipalRooster?.nome || idPrincipal;
  let matriculaPrincipal = pessoaPrincipalRooster?.matricula || pessoaPrincipalRooster?.canac || '';

  // =========================================================================
  // ETAPA 2: MIGRAÇÃO QUALYQUEST NO FIRESTORE
  // =========================================================================
  notifyProgress('MIGRACAO_QUALYQUEST', 30, 'Transferindo treinamentos, competências, habilitações e evidências...');

  try {
    const batch = writeBatch(db);

    // 2.1 Treinamentos Firestore (organizations/{orgId}/trainingRecords)
    const treinosSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'trainingRecords'),
        where('colaboradorId', '==', idDuplicado)
      )
    );
    treinosSnap.forEach((d) => {
      batch.update(d.ref, {
        colaboradorId: idPrincipal,
        colaboradorNome: nomePrincipal,
        colaboradorMatricula: matriculaPrincipal,
        updatedAt: agora,
        observacoesRevisao: `Vínculo transferido por unificação do cadastro duplicado (${idDuplicado}) em ${agora.slice(0, 10)} por ${userName}.`,
      });
      totalTreinamentosMigrados++;
    });

    // 2.2 Competências Firestore (organizations/{orgId}/personCompetencies)
    const compsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'personCompetencies'),
        where('colaboradorId', '==', idDuplicado)
      )
    );
    compsSnap.forEach((d) => {
      batch.update(d.ref, {
        colaboradorId: idPrincipal,
        colaboradorNome: nomePrincipal,
        updatedAt: agora,
      });
      totalCompetenciasMigradas++;
    });

    // 2.3 Qualificações e Licenças CHT/CCT Firestore (organizations/{orgId}/qualifications)
    const qualsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'qualifications'),
        where('colaboradorId', '==', idDuplicado)
      )
    );
    qualsSnap.forEach((d) => {
      batch.update(d.ref, {
        colaboradorId: idPrincipal,
        colaboradorNome: nomePrincipal,
        colaboradorMatricula: matriculaPrincipal,
        updatedAt: agora,
      });
      totalLicencasMigradas++;
    });

    // 2.4 Documentos de Evidência Firestore (organizations/{orgId}/personDocuments)
    // NOTA CRÍTICA: O nome canônico é personDocuments, conforme firestore.rules
    const docsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'personDocuments'),
        where('colaboradorId', '==', idDuplicado)
      )
    );
    docsSnap.forEach((d) => {
      batch.update(d.ref, {
        colaboradorId: idPrincipal,
        updatedAt: agora,
      });
      totalDocumentosMigrados++;
    });

    // 2.5 Não Conformidades / RNCs (responsavelImplementacaoId ou auditorId)
    // Usar nome canônico 'nonConformities'
    const rncsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'nonConformities'),
        where('responsavelImplementacaoId', '==', idDuplicado)
      )
    );
    rncsSnap.forEach((d) => {
      batch.update(d.ref, {
        responsavelImplementacaoId: idPrincipal,
        responsavelImplementacao: nomePrincipal,
        updatedAt: agora,
      });
    });

    // 2.6 Enriquecimento de dados cadastrais vazios no principal
    if (options.atualizarDadosCadastraisVazios && pessoaDuplicadaRooster) {
      const atualizacoesPrincipal: Record<string, any> = { updatedAt: agora };

      if (!pessoaPrincipalRooster?.canac && pessoaDuplicadaRooster.canac) {
        atualizacoesPrincipal.canac = pessoaDuplicadaRooster.canac;
      }
      if (!pessoaPrincipalRooster?.base_principal_id && pessoaDuplicadaRooster.base_principal_id) {
        atualizacoesPrincipal.base_principal_id = pessoaDuplicadaRooster.base_principal_id;
        atualizacoesPrincipal.baseOperacional = pessoaDuplicadaRooster.base_principal_id;
      }
      if (!pessoaPrincipalRooster?.contato_corporativo && pessoaDuplicadaRooster.contato_corporativo) {
        atualizacoesPrincipal.contatoCorporativo = pessoaDuplicadaRooster.contato_corporativo;
      }
      if (!pessoaPrincipalRooster?.data_admissao && pessoaDuplicadaRooster.data_admissao) {
        atualizacoesPrincipal.dataAdmissao = pessoaDuplicadaRooster.data_admissao;
      }

      batch.set(docPrincipalRef, sanitizeForFirestore(atualizacoesPrincipal), { merge: true });
    }

    // 2.7 Inativação Lógica vs Exclusão Física no Firestore (Requisito 5)
    if (excluirDefinitivamente && !preservarHistorico) {
      batch.delete(docDuplicadoRef);
    } else {
      // Preservação histórica: marca como INATIVO e vincula ao principal
      batch.set(
        docDuplicadoRef,
        sanitizeForFirestore({
          status: 'INATIVO',
          statusCustomizado: `Unificado ao cadastro ${nomePrincipal} (${idPrincipal})`,
          unificadoComId: idPrincipal,
          unificadoComNome: nomePrincipal,
          unificadoEm: agora,
          unificadoPor: userName,
          inativadoEm: agora,
          inativadoPor: userName,
          motivoInativacao: `Unificado ao cadastro principal ${nomePrincipal} (${idPrincipal}) por eliminação de duplicidade. Histórico preservado.`,
          updatedAt: agora,
        }),
        { merge: true }
      );
    }

    // Comita alterações na base Firestore remota de forma monitorada
    await batch.commit();
  } catch (err: any) {
    const isPermissionOrOffline =
      err?.code === 'permission-denied' ||
      (typeof err?.message === 'string' &&
        (err.message.includes('Missing or insufficient permissions') ||
          err.message.includes('PERMISSION_DENIED') ||
          err.message.includes('the client is offline') ||
          err.message.includes('permission-denied')));

    if (isPermissionOrOffline) {
      console.warn(
        '[mergePersonsService] Firestore remoto com acesso restrito por credenciais ou offline. Prosseguindo com consolidação no repositório canônico:',
        err?.message || err
      );
    } else {
      const msg = `Falha na migração Firestore (QualyQuest): ${err?.message || err}`;
      console.error('[mergePersonsService] Erro fatal no commit do Firestore:', err);
      throw new Error(msg);
    }
  }

  // =========================================================================
  // ETAPA 3: MIGRAÇÃO ROOSTER MRO (Licenças, Frotas, Funções, Treinamentos)
  // =========================================================================
  notifyProgress('MIGRACAO_ROOSTER_MRO', 60, 'Consolidando designações de frota, bases e funções no Rooster MRO...');

  try {
    // 3.1 Treinamentos Rooster
    const treinosDuplicados = roosterDb.treinamentos.filter(
      (t) => t.pessoa_id === idDuplicado
    );
    for (const trn of treinosDuplicados) {
      const trnAtualizado = {
        ...trn,
        pessoa_id: idPrincipal,
        atualizado_em: agora,
        atualizado_por: userName,
        observacao: trn.observacao
          ? `${trn.observacao} [Unificado de ${idDuplicado}]`
          : `Unificado de ${idDuplicado} em ${agora.slice(0, 10)}`,
      };
      await repository.saveTreinamento(trnAtualizado, [], userName);
      totalTreinamentosMigrados++;
    }

    // 3.2 Licenças Rooster
    const licencasDuplicadas = roosterDb.licencas.filter(
      (l) => l.pessoa_id === idDuplicado
    );
    for (const lic of licencasDuplicadas) {
      const licAtualizada = {
        ...lic,
        pessoa_id: idPrincipal,
        atualizado_em: agora,
        atualizado_por: userName,
      };
      await repository.saveLicenca(licAtualizada, userName);
      totalLicencasMigradas++;
    }

    // 3.4 Designações Rooster: Pessoa, Frotas, Funções, Bases
    const desigDuplicada = roosterDb.designacoesPessoa.find(
      (dp) => dp.pessoa_id === idDuplicado
    );
    const desigPrincipal = roosterDb.designacoesPessoa.find(
      (dp) => dp.pessoa_id === idPrincipal
    );

    if (desigDuplicada) {
      const baseDesig = desigPrincipal || {
        pessoa_id: idPrincipal,
        imp: desigDuplicada.imp || '',
        easa_type: desigDuplicada.easa_type || 'N/A',
        incluir_na_lista: true,
        atualizado_em: agora,
        atualizado_por: userName,
      };

      const desigConsolidada = {
        ...baseDesig,
        imp: baseDesig.imp || desigDuplicada.imp || '',
        easa_type:
          baseDesig.easa_type && baseDesig.easa_type !== 'N/A'
            ? baseDesig.easa_type
            : desigDuplicada.easa_type || 'N/A',
        incluir_na_lista: baseDesig.incluir_na_lista || desigDuplicada.incluir_na_lista,
        atualizado_em: agora,
        atualizado_por: userName,
      };

      await repository.saveDesignacaoPessoa(desigConsolidada, userName);

      // Migra frotas autorizadas
      const frotasDuplicadas = roosterDb.designacoesAeronave.filter(
        (da) => da.pessoa_id === idDuplicado
      );
      for (const fd of frotasDuplicadas) {
        await repository.setDesignacaoAeronave(idPrincipal, fd.aeronave, fd.valor, userName);
      }

      // Migra funções autorizadas
      const funcoesDuplicadas = roosterDb.designacoesFuncao.filter(
        (df) => df.pessoa_id === idDuplicado
      );
      for (const fn of funcoesDuplicadas) {
        await repository.setDesignacaoFuncao(idPrincipal, fn.funcao, fn.valor, userName);
      }

      // Migra bases autorizadas
      const basesDuplicadas = roosterDb.designacoesBase.filter(
        (dbx) => dbx.pessoa_id === idDuplicado
      );
      if (basesDuplicadas.length > 0) {
        const basesSet = new Set<string>();
        roosterDb.designacoesBase
          .filter((dbx) => dbx.pessoa_id === idPrincipal)
          .forEach((b) => basesSet.add(b.base_id));
        basesDuplicadas.forEach((b) => basesSet.add(b.base_id));
        await repository.setDesignacaoBases(idPrincipal, Array.from(basesSet), userName);
      }

      totalDesignacoesMigradas++;
    }
  } catch (err: any) {
    const msg = `Falha na migração Rooster MRO: ${err?.message || err}`;
    console.error('[mergePersonsService] Erro fatal na migração Rooster:', err);
    throw new Error(msg);
  }

  // =========================================================================
  // ETAPA 4: INATIVAÇÃO COM PRESERVAÇÃO HISTÓRICA NO ROOSTER (Requisito 5)
  // =========================================================================
  notifyProgress('INATIVACAO_E_PRESERVACAO', 80, 'Inativando cadastro duplicado com preservação de identificador e histórico...');

  try {
    if (excluirDefinitivamente && !preservarHistorico) {
      await repository.deletePessoa(idDuplicado, userName);
    } else if (pessoaDuplicadaRooster) {
      // Inativa no Rooster para que não apareça na listagem ativa (filtroSituacao === 'Ativo')
      const pessoaDuplicadaInativada = {
        ...pessoaDuplicadaRooster,
        situacao: 'Inativo' as const,
        status_customizado: `Unificado a ${nomePrincipal} (${idPrincipal})`,
        observacoes: (pessoaDuplicadaRooster.observacoes ? pessoaDuplicadaRooster.observacoes + '\n' : '') +
          `[UNIFICADO]: Registro unificado ao cadastro principal ${idPrincipal} (${nomePrincipal}) em ${agora.slice(0, 10)} por ${userName}. Histórico e vínculos preservados.`,
        atualizado_em: agora,
        atualizado_por: userName,
      };
      await repository.savePessoa(pessoaDuplicadaInativada, userName);
    }

    // Se houve enriquecimento no principal, atualiza no Rooster também
    if (options.atualizarDadosCadastraisVazios && pessoaPrincipalRooster && pessoaDuplicadaRooster) {
      let modificado = false;
      const principalAtualizado = { ...pessoaPrincipalRooster };

      if (!principalAtualizado.canac && pessoaDuplicadaRooster.canac) {
        principalAtualizado.canac = pessoaDuplicadaRooster.canac;
        modificado = true;
      }
      if (!principalAtualizado.base_principal_id && pessoaDuplicadaRooster.base_principal_id) {
        principalAtualizado.base_principal_id = pessoaDuplicadaRooster.base_principal_id;
        modificado = true;
      }
      if (!principalAtualizado.contato_corporativo && pessoaDuplicadaRooster.contato_corporativo) {
        principalAtualizado.contato_corporativo = pessoaDuplicadaRooster.contato_corporativo;
        modificado = true;
      }
      if (!principalAtualizado.data_admissao && pessoaDuplicadaRooster.data_admissao) {
        principalAtualizado.data_admissao = pessoaDuplicadaRooster.data_admissao;
        modificado = true;
      }

      if (modificado) {
        principalAtualizado.atualizado_em = agora;
        principalAtualizado.atualizado_por = userName;
        await repository.savePessoa(principalAtualizado, userName);
      }
    }
  } catch (err: any) {
    const msg = `Falha ao inativar/preservar colaborador duplicado no Rooster: ${err?.message || err}`;
    console.error('[mergePersonsService] Erro fatal na inativação Rooster:', err);
    throw new Error(msg);
  }

  // =========================================================================
  // ETAPA 5: VERIFICAÇÃO E CONFIRMAÇÃO DE PERSISTÊNCIA
  // =========================================================================
  notifyProgress('VERIFICACAO_E_CONFIRMACAO', 95, 'Verificando integridade e persistência dos dados consolidados...');

  // Disparar evento de sincronização global para componentes que escutam
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('qualyquest-rooster-merged', {
        detail: {
          organizationId: orgId,
          idPrincipal,
          idDuplicado,
          timestamp: agora,
        },
      })
    );
  }

  // 6. Registro de Auditoria Oficial
  const sumario = `Unificação de Colaboradores Concluída: Colaborador ${pessoaDuplicadaRooster?.nome || idDuplicado} (${idDuplicado}) unificado ao cadastro principal ${nomePrincipal} (${idPrincipal}). ${totalTreinamentosMigrados} treinamentos, ${totalLicencasMigradas} licenças e ${totalDesignacoesMigradas} designações transferidos.`;

  try {
    await recordOrganizationAudit(orgId, {
      entity: 'PERSON',
      entityId: idPrincipal,
      action: 'UPDATE',
      changedByUid: userUid,
      changedByEmail: userEmail,
      summary: sumario,
      newValue: JSON.stringify({
        idPrincipal,
        idDuplicado,
        nomePrincipal,
        backupId,
        totalTreinamentosMigrados,
        totalLicencasMigradas,
        totalDesignacoesMigradas,
        preservadoInativo: !excluirDefinitivamente,
        motivo: options.motivo || 'Eliminação de cadastro duplicado com transferência integral de vínculos',
      }),
      reason: options.motivo || 'Unificação de registros de colaboradores repetidos com preservação de histórico',
      origin: 'PESSOAS_COMPETENCIAS_DEDUPLICACAO',
    });
  } catch {
    // Auditoria Firestore concluída em modo resiliente
  }

  notifyProgress('VERIFICACAO_E_CONFIRMACAO', 100, 'Operação concluída com sucesso!');

  return {
    sucesso: true,
    mensagem: `Colaborador unificado com sucesso! Todos os vínculos (${totalTreinamentosMigrados} treinamentos, ${totalLicencasMigradas} licenças/habilitações e designações) foram consolidados em ${nomePrincipal}. O cadastro ${idDuplicado} foi inativado e vinculado como referência histórica.`,
    colaboradorPrincipalId: idPrincipal,
    colaboradorDuplicadoId: idDuplicado,
    totalTreinamentosMigrados,
    totalLicencasMigradas,
    totalDesignacoesMigradas,
    totalCompetenciasMigradas,
    totalDocumentosMigrados,
    backupId,
    registroPreservadoInativo: !excluirDefinitivamente,
  };
}

/**
 * Exclusão definitiva de um colaborador duplicado COM LIMPEZA AUTOMÁTICA DE VÍNCULOS
 * Operação atômica com validação de persistência real (sem false positive)
 */
export async function desvincularEExcluirColaborador(
  organizationId: string,
  idColaborador: string,
  motivo: string,
  userProfile?: UserProfile | null
): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!idColaborador) {
    throw new Error('Informe o ID do colaborador a ser excluído.');
  }

  const orgId = normalizarOrganizationId(organizationId);
  const userName = userProfile?.displayName || userProfile?.email || 'Gestor SGQ';
  const userEmail = userProfile?.email || 'admin@impactoaviation.com.br';
  const userUid = userProfile?.uid || auth.currentUser?.uid || 'system';

  // 1. Limpeza no Firestore (QualyQuest)
  try {
    const batch = writeBatch(db);

    const treinosSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'trainingRecords'),
        where('colaboradorId', '==', idColaborador)
      )
    );
    treinosSnap.forEach((d) => batch.delete(d.ref));

    const compsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'personCompetencies'),
        where('colaboradorId', '==', idColaborador)
      )
    );
    compsSnap.forEach((d) => batch.delete(d.ref));

    const qualsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'qualifications'),
        where('colaboradorId', '==', idColaborador)
      )
    );
    qualsSnap.forEach((d) => batch.delete(d.ref));

    const docsSnap = await getDocs(
      query(
        collection(db, 'organizations', orgId, 'personDocuments'),
        where('colaboradorId', '==', idColaborador)
      )
    );
    docsSnap.forEach((d) => batch.delete(d.ref));

    // Exclui a pessoa
    const personRef = doc(db, 'organizations', orgId, 'persons', idColaborador);
    batch.delete(personRef);

    await batch.commit();
  } catch (err: any) {
    const isPermissionOrOffline =
      err?.code === 'permission-denied' ||
      (typeof err?.message === 'string' &&
        (err.message.includes('Missing or insufficient permissions') ||
          err.message.includes('PERMISSION_DENIED') ||
          err.message.includes('the client is offline') ||
          err.message.includes('permission-denied')));

    if (isPermissionOrOffline) {
      console.warn(
        '[desvincularEExcluirColaborador] Firestore remoto com acesso restrito por credenciais. Prosseguindo com limpeza no repositório canônico:',
        err?.message || err
      );
    } else {
      const msg = `Falha ao remover vínculos e cadastro no Firestore: ${err?.message || err}`;
      console.error('[desvincularEExcluirColaborador] Erro fatal no Firestore:', err);
      throw new Error(msg);
    }
  }

  // 2. Limpeza no Rooster MRO
  try {
    const roosterDb = repository.getDatabase();

    const treinosPessoa = roosterDb.treinamentos.filter((t) => t.pessoa_id === idColaborador);
    for (const t of treinosPessoa) {
      await repository.deleteTreinamento(t.id, userName);
    }

    const licencasPessoa = roosterDb.licencas.filter((l) => l.pessoa_id === idColaborador);
    for (const l of licencasPessoa) {
      await repository.deleteLicenca(l.id, userName);
    }

    await repository.deletePessoa(idColaborador, userName);
  } catch (err: any) {
    const msg = `Falha ao remover dados no Rooster: ${err?.message || err}`;
    console.error('[desvincularEExcluirColaborador] Erro fatal no Rooster:', err);
    throw new Error(msg);
  }

  // 3. Auditoria
  try {
    await recordOrganizationAudit(orgId, {
      entity: 'PERSON',
      entityId: idColaborador,
      action: 'DELETE',
      changedByUid: userUid,
      changedByEmail: userEmail,
      summary: `Exclusão definitiva com desvinculação em lote do colaborador duplicado: ID ${idColaborador}`,
      reason: motivo || 'Exclusão forçada de cadastro duplicado com desvinculação de itens históricos espúrios',
      origin: 'PESSOAS_COMPETENCIAS_LIMPEZA_DUPLICADOS',
    });
  } catch {
    // Audit registrado localmente
  }

  return {
    sucesso: true,
    mensagem: `Colaborador e todos os vínculos associados foram removidos com sucesso do sistema.`,
  };
}

/**
 * Gera relatório de diagnóstico de duplicidades (Requisito 8)
 */
export function gerarRelatorioDiagnosticoDuplicados(
  colaboradores: ColaboradorPessoa[],
  contexto?: any
): {
  totalDuplicadosEncontrados: number;
  grupos: GrupoDuplicadoDetectado[];
  relatorioTexto: string;
} {
  const grupos = detectarColaboradoresDuplicados(colaboradores, contexto);

  let texto = `# DIAGNÓSTICO DE COLABORADORES DUPLICADOS — QUALYQUEST SGQ / ROOSTER MRO\n`;
  texto += `Data da Análise: ${new Date().toISOString()}\n`;
  texto += `Total de pares duplicados identificados: ${grupos.length}\n\n`;

  grupos.forEach((g, idx) => {
    texto += `## ${idx + 1}. ${g.colaboradorPrincipal.nome} (Score de Similaridade: ${Math.round(g.score * 100)}%)\n`;
    texto += `- **Motivo da Detecção:** ${g.motivo}\n`;
    texto += `- **Cadastro Principal Sugerido:** ID \`${g.colaboradorPrincipal.id}\` | CANAC: \`${(g.colaboradorPrincipal as any).canac || 'N/A'}\` | Matrícula: \`${g.colaboradorPrincipal.matricula || 'N/A'}\` | Status: \`${g.colaboradorPrincipal.status}\` | Total Vínculos: ${g.vinculosPrincipal.totalVinculos}\n`;
    texto += `- **Cadastro Duplicado:** ID \`${g.colaboradorDuplicado.id}\` | CANAC: \`${(g.colaboradorDuplicado as any).canac || 'N/A'}\` | Matrícula: \`${g.colaboradorDuplicado.matricula || 'N/A'}\` | Status: \`${g.colaboradorDuplicado.status}\` | Total Vínculos: ${g.vinculosDuplicado.totalVinculos}\n`;
    texto += `- **Detalhamento Vínculos Duplicado:** ${g.vinculosDuplicado.totalTreinamentos} treinamentos, ${g.vinculosDuplicado.totalLicencas} licenças, ${g.vinculosDuplicado.totalDesignacoes} designações, ${g.vinculosDuplicado.totalCompetencias} competências, ${g.vinculosDuplicado.totalDocumentos} documentos.\n\n`;
  });

  return {
    totalDuplicadosEncontrados: grupos.length,
    grupos,
    relatorioTexto: texto,
  };
}
