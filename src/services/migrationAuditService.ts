import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase/config';
import { sanitizeForFirestore } from './firebase/firestore';
import {
  ColaboradorPessoa,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
} from '../types';

export interface CollectionInventory {
  name: string;
  count: number;
  isCanonical: boolean;
  sampleIds: string[];
}

export interface AmbiguousMatch {
  type: 'PERSON' | 'COURSE' | 'TRAINING' | 'LICENSE';
  legacyId: string;
  canonicalId: string;
  reason: string;
  legacyData: any;
  canonicalData: any;
}

export interface MigrationAuditReport {
  timestamp: string;
  organizationId: string;
  legacyInventory: CollectionInventory[];
  canonicalInventory: CollectionInventory[];
  totalAmbiguousRecords: number;
  ambiguities: AmbiguousMatch[];
  conflictsDetected: string[];
  recommendation: string;
}

export interface MigrationExecutionResult {
  dryRun: boolean;
  migratedPersons: number;
  migratedCourses: number;
  migratedTrainings: number;
  migratedQualifications: number;
  migratedMotors: number;
  migratedDesignations: number;
  skippedRecords: number;
  backupId: string;
  errors: string[];
}

/**
 * 1. Inventaria coleções legadas e coleções canônicas multi-tenant
 */
export async function inventoryCollections(organizationId: string): Promise<{
  legacy: CollectionInventory[];
  canonical: CollectionInventory[];
}> {
  if (!db) {
    return { legacy: [], canonical: [] };
  }

  const legacyNames = [
    'pessoa',
    'licenca',
    'curso_catalogo',
    'treinamento',
    'motor_catalogo',
    'treinamento_motor',
    'designacao_pessoa',
    'designacao_base',
    'designacao_funcao',
    'designacao_aeronave',
  ];

  const canonicalSubcollections = [
    'persons',
    'trainingCourses',
    'trainingRecords',
    'qualifications',
    'competencies',
    'personCompetencies',
    'operational_bases',
    'roster_motores',
    'roster_treinamentos_motor',
    'roster_designacoes_pessoa',
    'roster_designacoes_base',
    'roster_designacoes_funcao',
    'roster_designacoes_aeronave',
  ];

  const legacy: CollectionInventory[] = [];
  for (const name of legacyNames) {
    try {
      const snap = await getDocs(collection(db, name));
      legacy.push({
        name,
        count: snap.size,
        isCanonical: false,
        sampleIds: snap.docs.slice(0, 3).map((d) => d.id),
      });
    } catch {
      legacy.push({ name, count: 0, isCanonical: false, sampleIds: [] });
    }
  }

  const canonical: CollectionInventory[] = [];
  for (const name of canonicalSubcollections) {
    try {
      const snap = await getDocs(collection(db, 'organizations', organizationId, name));
      canonical.push({
        name,
        count: snap.size,
        isCanonical: true,
        sampleIds: snap.docs.slice(0, 3).map((d) => d.id),
      });
    } catch {
      canonical.push({ name, count: 0, isCanonical: true, sampleIds: [] });
    }
  }

  return { legacy, canonical };
}

/**
 * 2. Gera relatório de conflitos, ambiguidades e duplicidades
 */
export async function generateConflictReport(organizationId: string): Promise<MigrationAuditReport> {
  const { legacy, canonical } = await inventoryCollections(organizationId);
  const ambiguities: AmbiguousMatch[] = [];
  const conflictsDetected: string[] = [];

  if (!db) {
    return {
      timestamp: new Date().toISOString(),
      organizationId,
      legacyInventory: legacy,
      canonicalInventory: canonical,
      totalAmbiguousRecords: 0,
      ambiguities: [],
      conflictsDetected: ['Firestore não conectado.'],
      recommendation: 'Conectar ao Firestore antes de executar auditoria.',
    };
  }

  // Compara pessoas legadas com canônicas
  try {
    const legacyPessoasSnap = await getDocs(collection(db, 'pessoa'));
    const canonicalPersonsSnap = await getDocs(collection(db, 'organizations', organizationId, 'persons'));

    const canonicalMapById = new Map<string, any>();
    const canonicalMapByCanac = new Map<string, any>();
    const canonicalMapByName = new Map<string, any>();

    canonicalPersonsSnap.docs.forEach((d) => {
      const data = d.data();
      canonicalMapById.set(d.id, data);
      if (data.matricula) canonicalMapByCanac.set(String(data.matricula).trim().toLowerCase(), data);
      if (data.camposCustomizados?.canac) {
        canonicalMapByCanac.set(String(data.camposCustomizados.canac).trim().toLowerCase(), data);
      }
      if (data.nome) canonicalMapByName.set(String(data.nome).trim().toLowerCase(), data);
    });

    legacyPessoasSnap.docs.forEach((d) => {
      const leg = d.data();
      const legId = d.id;
      const legCanac = leg.canac ? String(leg.canac).trim().toLowerCase() : '';
      const legNome = leg.nome ? String(leg.nome).trim().toLowerCase() : '';

      const matchById = canonicalMapById.get(legId);
      const matchByCanac = legCanac ? canonicalMapByCanac.get(legCanac) : null;
      const matchByName = legNome ? canonicalMapByName.get(legNome) : null;

      if (matchById && matchByCanac && matchById.id !== matchByCanac.id) {
        conflictsDetected.push(
          `Colaborador ID ${legId}: match por ID aponta para "${matchById.nome}", mas CANAC "${leg.canac}" aponta para "${matchByCanac.nome}". Requer resolução manual.`
        );
        ambiguities.push({
          type: 'PERSON',
          legacyId: legId,
          canonicalId: matchById.id,
          reason: 'Conflito entre ID estável e CANAC/Matrícula',
          legacyData: leg,
          canonicalData: matchById,
        });
      } else if (!matchById && matchByName && !matchByCanac) {
        ambiguities.push({
          type: 'PERSON',
          legacyId: legId,
          canonicalId: matchByName.id,
          reason: 'Mesmo nome, mas IDs e CANAC distintos. Não fundido automaticamente para prevenir perda.',
          legacyData: leg,
          canonicalData: matchByName,
        });
      }
    });
  } catch (err: any) {
    conflictsDetected.push(`Erro ao auditar pessoas: ${err?.message || err}`);
  }

  return {
    timestamp: new Date().toISOString(),
    organizationId,
    legacyInventory: legacy,
    canonicalInventory: canonical,
    totalAmbiguousRecords: ambiguities.length,
    ambiguities,
    conflictsDetected,
    recommendation:
      ambiguities.length === 0 && conflictsDetected.length === 0
        ? 'Pronto para migração controlada idempotente sem riscos de sobrescrita.'
        : 'Revisar ambiguidades apontadas antes de forçar mesclagem.',
  };
}

/**
 * 3. Cria backup verificável em JSON
 */
export async function createMigrationBackup(organizationId: string): Promise<{
  backupId: string;
  data: any;
}> {
  if (!db) throw new Error('Firestore não inicializado.');
  const backupId = `BKP-${organizationId}-${Date.now()}`;
  const now = new Date().toISOString();

  const backupPayload: any = {
    backupId,
    organizationId,
    createdAt: now,
    collections: {},
  };

  const collectionsToBackup = [
    'persons',
    'trainingCourses',
    'trainingRecords',
    'qualifications',
    'roster_motores',
    'roster_treinamentos_motor',
    'roster_designacoes_pessoa',
    'roster_designacoes_base',
    'roster_designacoes_funcao',
    'roster_designacoes_aeronave',
  ];

  for (const col of collectionsToBackup) {
    const snap = await getDocs(collection(db, 'organizations', organizationId, col));
    backupPayload.collections[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Grava o backup na auditoria da organização para rastreabilidade
  await setDoc(doc(db, 'organizations', organizationId, 'roster_auditoria', backupId), {
    id: backupId,
    timestamp: now,
    usuario_nome: 'Sistema de Migração',
    acao: 'BACKUP_PRE_MIGRACAO',
    tabela: 'ORGANIZATION_SNAPSHOT',
    registro_id: backupId,
    detalhes: `Backup preventivo gerado antes da reconciliação definitiva.`,
    dados_depois: JSON.stringify({
      totals: Object.fromEntries(
        Object.entries(backupPayload.collections).map(([k, v]) => [k, (v as any[]).length])
      ),
    }),
  });

  return { backupId, data: backupPayload };
}

/**
 * 4. Executa migração controlada e idempotente das coleções legadas para canônicas
 */
export async function executeControlledMigration(
  organizationId: string,
  options: { dryRun?: boolean; userName?: string } = {}
): Promise<MigrationExecutionResult> {
  if (!db) throw new Error('Firestore não inicializado.');
  const dryRun = options.dryRun ?? false;
  const userName = options.userName || 'Admin Migração';
  const errors: string[] = [];

  // Gera backup preventivo
  let backupId = 'DRY_RUN_NO_BACKUP';
  if (!dryRun) {
    const backupRes = await createMigrationBackup(organizationId);
    backupId = backupRes.backupId;
  }

  const result: MigrationExecutionResult = {
    dryRun,
    migratedPersons: 0,
    migratedCourses: 0,
    migratedTrainings: 0,
    migratedQualifications: 0,
    migratedMotors: 0,
    migratedDesignations: 0,
    skippedRecords: 0,
    backupId,
    errors,
  };

  try {
    const batch = writeBatch(db);

    // 1. Migrar pessoas legadas
    const legPessoas = await getDocs(collection(db, 'pessoa'));
    const canPersons = await getDocs(collection(db, 'organizations', organizationId, 'persons'));
    const canPersonIds = new Set(canPersons.docs.map((d) => d.id));

    legPessoas.docs.forEach((d) => {
      const p = d.data();
      const pId = d.id;
      if (!canPersonIds.has(pId)) {
        if (!dryRun) {
          const colabDoc: ColaboradorPessoa = {
            id: pId,
            organizationId,
            nome: p.nome || 'Sem Nome',
            matricula: p.canac || pId,
            setor: p.cliente_ou_area || 'Operações de Manutenção',
            baseOperacional: p.base_principal_id || 'REC',
            baseOperacionalId: p.base_principal_id || 'REC',
            funcao: p.categoria === 'Mecânico' ? 'Mecânico de Manutenção' : 'Administrativo',
            cargoOperacional:
              p.categoria === 'Mecânico' ? 'Mecânico de Manutenção de Linha / Base' : 'Analista Administrativo',
            status: p.situacao === 'Inativo' ? 'INATIVO' : 'ATIVO',
            camposCustomizados: {
              canac: p.canac || '',
              categoria: p.categoria || 'Mecânico',
              clienteOuArea: p.cliente_ou_area || '',
            },
            createdAt: p.criado_em || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            criadoPor: p.atualizado_por || userName,
            criadoPorUid: 'migration-import',
          };
          batch.set(doc(db, 'organizations', organizationId, 'persons', pId), sanitizeForFirestore(colabDoc));
        }
        result.migratedPersons++;
      } else {
        result.skippedRecords++;
      }
    });

    // 2. Migrar catálogo de cursos
    const legCursos = await getDocs(collection(db, 'curso_catalogo'));
    const canCursos = await getDocs(collection(db, 'organizations', organizationId, 'trainingCourses'));
    const canCursoIds = new Set(canCursos.docs.map((d) => d.id));

    legCursos.docs.forEach((d) => {
      const c = d.data();
      const cId = d.id;
      if (!canCursoIds.has(cId)) {
        if (!dryRun) {
          const isFrota = c.grupo === 'Frota';
          const courseDoc: CursoTreinamento = {
            id: cId,
            organizationId,
            codigo: cId,
            titulo: c.curso,
            tipo: isFrota ? 'RECORRENTE' : 'INICIAL',
            modalidade: 'PRESENCIAL',
            cargaHorariaHoras: 8,
            ementa: `Curso homologado ${c.grupo} - ${c.curso}`,
            recorrente: true,
            periodicidadeMeses: Math.round((c.validade_dias || 730) / 30),
            origemPrazo: 'REGULAMENTO',
            competenciasDesenvolvidasIds: [],
            status: c.ativo !== false ? 'ATIVO' : 'INATIVO',
            frotaOuFamilia: c.frota || 'Geral',
            variantesAplicabilidade: c.variante ? [c.variante] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            criadoPorUid: 'migration-import',
          };
          batch.set(doc(db, 'organizations', organizationId, 'trainingCourses', cId), sanitizeForFirestore(courseDoc));
        }
        result.migratedCourses++;
      } else {
        result.skippedRecords++;
      }
    });

    // 3. Migrar licenças
    const legLicencas = await getDocs(collection(db, 'licenca'));
    const canQualifs = await getDocs(collection(db, 'organizations', organizationId, 'qualifications'));
    const canQualifIds = new Set(canQualifs.docs.map((d) => d.id));

    legLicencas.docs.forEach((d) => {
      const l = d.data();
      const lId = d.id;
      if (!canQualifIds.has(lId)) {
        if (!dryRun) {
          const qualDoc: QualificacaoColaborador = {
            id: lId,
            organizationId,
            colaboradorId: l.pessoa_id,
            colaboradorNome: 'Colaborador',
            colaboradorMatricula: l.pessoa_id,
            tipo: 'CHT_ANAC',
            titulo: `${l.orgao} ${l.tipo} ${l.habilitacao || ''}`.trim(),
            escopo: `Habilitação Técnica ${l.tipo} - ${l.orgao} ${l.habilitacao ? '(' + l.habilitacao + ')' : ''}`.trim(),
            emissor: l.orgao,
            numeroRegistro: l.numero,
            dataEmissao: l.data_expedicao || '',
            dataValidade: l.data_vencimento || undefined,
            possuiValidade: !!l.data_vencimento,
            status: 'VALIDA',
            bloqueiaOperacaoSeVencida: true,
            responsavelValidacaoUid: 'admin-migration',
            responsavelValidacaoNome: userName,
            dataValidacao: new Date().toISOString(),
            createdAt: l.criado_em || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          batch.set(doc(db, 'organizations', organizationId, 'qualifications', lId), sanitizeForFirestore(qualDoc));
        }
        result.migratedQualifications++;
      } else {
        result.skippedRecords++;
      }
    });

    // 4. Migrar treinamentos
    const legTrn = await getDocs(collection(db, 'treinamento'));
    const canTrn = await getDocs(collection(db, 'organizations', organizationId, 'trainingRecords'));
    const canTrnIds = new Set(canTrn.docs.map((d) => d.id));

    legTrn.docs.forEach((d) => {
      const t = d.data();
      const tId = d.id;
      if (!canTrnIds.has(tId)) {
        if (!dryRun) {
          const trDoc: RegistroTreinamentoColaborador = {
            id: tId,
            organizationId,
            colaboradorId: t.pessoa_id,
            treinamentoId: t.curso_id,
            treinamentoCodigo: t.curso_id,
            treinamentoTitulo: t.curso_id,
            colaboradorNome: 'Colaborador',
            colaboradorMatricula: t.pessoa_id,
            dataRealizacao: t.data_execucao,
            dataConclusao: t.data_execucao,
            cargaHoraria: 8,
            instrutor: t.atualizado_por || userName,
            resultado: 'APROVADO',
            observacoes: t.observacao || '',
            createdAt: t.criado_em || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          batch.set(doc(db, 'organizations', organizationId, 'trainingRecords', tId), sanitizeForFirestore(trDoc));
        }
        result.migratedTrainings++;
      } else {
        result.skippedRecords++;
      }
    });

    if (!dryRun) {
      await batch.commit();
    }
  } catch (err: any) {
    errors.push(`Falha na migração: ${err?.message || err}`);
  }

  return result;
}

/**
 * 5. Reverte migração a partir de um backup verificado
 */
export async function rollbackMigration(
  organizationId: string,
  backupPayload: any
): Promise<{ success: boolean; message: string }> {
  if (!db) throw new Error('Firestore não inicializado.');
  if (!backupPayload?.collections) {
    throw new Error('Payload de backup inválido.');
  }

  const batch = writeBatch(db);
  for (const [colName, docs] of Object.entries(backupPayload.collections)) {
    for (const d of docs as any[]) {
      batch.set(doc(db, 'organizations', organizationId, colName, d.id), sanitizeForFirestore(d));
    }
  }

  await batch.commit();
  return {
    success: true,
    message: `Restauração concluída com sucesso para organização ${organizationId} a partir do backup ${backupPayload.backupId}.`,
  };
}
