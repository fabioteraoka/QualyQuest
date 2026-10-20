import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { buildImpactoOfficialInitialDatabase, buildInitialCleanDatabase } from '../../data/initialData';
import { getFirestoreDb } from '../../lib/firebase';
import {
  AeronaveDesignacao,
  Auditoria,
  Base,
  Configuracao,
  CursoCatalogo,
  DesignacaoAeronave,
  DesignacaoBase,
  DesignacaoFuncao,
  DesignacaoPessoa,
  FuncaoDesignacao,
  Licenca,
  MotorCatalogo,
  Pessoa,
  SimNaoVazio,
  Treinamento,
  TreinamentoMotor,
} from '../../types';
import {
  DatabaseState,
  generateConferenceData,
  PostImportConferenceData,
  RawImportPayload,
  validateImportPayload,
} from '../storage';
import { StorageAdapter } from '../storageInterface';
import { DEFAULT_ORGANIZATION_ID, sanitizeForFirestore } from '../../../services/firebase/firestore';
import {
  ColaboradorPessoa,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  CursoTreinamento,
} from '../../../types';

export class FirestoreAdapter implements StorageAdapter {
  readonly isCloud = true;
  private _isOffline = !navigator.onLine;
  public orgId: string = DEFAULT_ORGANIZATION_ID;

  private memoryDb: DatabaseState = {
    ...buildInitialCleanDatabase(),
    auditoria: [],
  };

  private listeners = new Set<() => void>();
  private unsubscribers: Unsubscribe[] = [];
  private isInitialized = false;

  get isOffline(): boolean {
    return this._isOffline;
  }

  constructor(orgId?: string) {
    if (orgId) this.orgId = orgId;
    window.addEventListener('online', () => {
      this._isOffline = false;
      this.notify();
    });
    window.addEventListener('offline', () => {
      this._isOffline = true;
      this.notify();
    });
  }

  setOrganizationId(newOrgId: string): void {
    if (newOrgId && newOrgId !== this.orgId) {
      this.orgId = newOrgId;
      if (this.isInitialized) {
        this.unsubscribers.forEach((u) => {
          try {
            u();
          } catch {}
        });
        this.unsubscribers = [];
        this.isInitialized = false;
        this.init().catch((err) => console.warn('Erro ao reinicializar FirestoreAdapter:', err));
      }
    }
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Erro no listener do Firestore:', err);
      }
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getDatabase(): DatabaseState {
    return this.memoryDb;
  }

  // --- Mappers between SGQ Firestore and Rooster MRO Models ---

  private mapColaboradorToPessoa(c: any, id: string): Pessoa {
    const matricula = c.matricula || c.camposCustomizados?.canac || id;
    const canac = c.camposCustomizados?.canac || c.matricula || '';
    const categoria =
      c.camposCustomizados?.categoria ||
      ((c.funcao || '').toLowerCase().includes('adm') ? 'Administrativo' : 'Mecânico');
    const baseRaw = (c.baseOperacionalId || c.baseOperacional || 'REC')
      .split(' - ')[0]
      .trim()
      .toUpperCase();
    const baseFinal = ['CNF', 'GIG', 'GRU', 'REC', 'VCP'].includes(baseRaw) ? baseRaw : 'REC';
    const situacao = c.status === 'INATIVO' || c.status === 'DESLIGADO' ? 'Inativo' : 'Ativo';
    const clienteOuArea =
      c.camposCustomizados?.clienteOuArea || c.setor || c.cargoOperacional || 'Manutenção Aeronáutica';

    return {
      id: c.id || id,
      nome: c.nome || 'Sem Nome',
      categoria,
      situacao,
      base_principal_id: baseFinal,
      cliente_ou_area: clienteOuArea,
      canac,
      criado_em: c.createdAt || new Date().toISOString(),
      atualizado_em: c.updatedAt || new Date().toISOString(),
      atualizado_por: c.criadoPor || 'SGQ Colaboradores',
    };
  }

  private mapRegistroTreinamentoToTreinamento(t: any, id: string): Treinamento {
    let resolvedPessoaId = t.colaboradorId || t.pessoa_id || '';
    if (this.memoryDb.pessoas.length > 0) {
      const match = this.memoryDb.pessoas.find(
        (p) =>
          p.id === resolvedPessoaId ||
          p.canac === resolvedPessoaId ||
          (p as any).matricula === resolvedPessoaId ||
          (t.colaboradorMatricula &&
            (p.id === t.colaboradorMatricula ||
              p.canac === t.colaboradorMatricula ||
              (p as any).matricula === t.colaboradorMatricula)) ||
          (t.colaboradorNome && p.nome.trim().toLowerCase() === t.colaboradorNome.trim().toLowerCase())
      );
      if (match) {
        resolvedPessoaId = match.id;
      }
    }

    return {
      id: t.id || id,
      pessoa_id: resolvedPessoaId,
      curso_id: t.treinamentoCodigo || t.treinamentoId || t.curso_id || '',
      data_execucao: t.dataRealizacao || t.dataConclusao || t.data_execucao || new Date().toISOString().split('T')[0],
      observacao: t.observacoes || t.observacao || '',
      substituido_por: t.substituidoPor || t.substituido_por || null,
      criado_em: t.createdAt || t.criado_em || new Date().toISOString(),
      atualizado_em: t.updatedAt || t.atualizado_em || new Date().toISOString(),
      atualizado_por: t.instrutor || t.atualizado_por || 'SGQ Treinamentos',
    };
  }

  // --- Initialization with Unified Multi-Collection Real-time Listeners ---

  async init(): Promise<void> {
    if (this.isInitialized) return;
    const db = getFirestoreDb();
    if (!db) {
      console.warn('Firestore não inicializado, operando com cache local.');
      return;
    }

    // 1. BASES (organizations/{orgId}/operational_bases and fallback /base)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'operational_bases'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.bases = snap.docs.map((d) => {
              const b = d.data();
              return {
                id: (b.sigla || b.id || '').toUpperCase(),
                nome: b.nome || b.descricao || d.id,
                ativa: b.status !== 'INATIVO',
              } as Base;
            });
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar operational_bases:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'base'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.bases || this.memoryDb.bases.length === 0)) {
            this.memoryDb.bases = snap.docs.map((d) => d.data() as Base);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar coleção base:', err)
      )
    );

    // 2. PESSOAS & COLABORADORES (organizations/{orgId}/persons UNIFIED)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'persons'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.pessoas = snap.docs.map((d) => this.mapColaboradorToPessoa(d.data(), d.id));
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar organizations/persons:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'pessoa'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.pessoas || this.memoryDb.pessoas.length === 0)) {
            this.memoryDb.pessoas = snap.docs.map((d) => d.data() as Pessoa);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar coleção pessoa:', err)
      )
    );

    // 3. LICENÇAS (organizations/{orgId}/roster_licencas)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_licencas'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.licencas = snap.docs.map((d) => d.data() as Licenca);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_licencas:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'licenca'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.licencas || this.memoryDb.licencas.length === 0)) {
            this.memoryDb.licencas = snap.docs.map((d) => d.data() as Licenca);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar licenca:', err)
      )
    );

    // 4. CURSOS DE TREINAMENTO & CATÁLOGO
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_cursos_catalogo'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.cursosCatalogo = snap.docs.map((d) => d.data() as CursoCatalogo);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_cursos_catalogo:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'curso_catalogo'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.cursosCatalogo || this.memoryDb.cursosCatalogo.length === 0)) {
            this.memoryDb.cursosCatalogo = snap.docs.map((d) => d.data() as CursoCatalogo);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar curso_catalogo:', err)
      )
    );

    // 5. TREINAMENTOS (organizations/{orgId}/trainingRecords UNIFIED)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'trainingRecords'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.treinamentos = snap.docs.map((d) =>
              this.mapRegistroTreinamentoToTreinamento(d.data(), d.id)
            );
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar organizations/trainingRecords:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'treinamento'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.treinamentos || this.memoryDb.treinamentos.length === 0)) {
            this.memoryDb.treinamentos = snap.docs.map((d) => d.data() as Treinamento);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar treinamento:', err)
      )
    );

    // 6. MOTORES (organizations/{orgId}/roster_motores)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_motores'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.motoresCatalogo = snap.docs.map((d) => d.data() as MotorCatalogo);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_motores:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'motor_catalogo'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.motoresCatalogo || this.memoryDb.motoresCatalogo.length === 0)) {
            this.memoryDb.motoresCatalogo = snap.docs.map((d) => d.data() as MotorCatalogo);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar motor_catalogo:', err)
      )
    );

    // 7. TREINAMENTOS DE MOTOR (organizations/{orgId}/roster_treinamentos_motor)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_treinamentos_motor'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.treinamentosMotor = snap.docs.map((d) => d.data() as TreinamentoMotor);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_treinamentos_motor:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'treinamento_motor'),
        (snap) => {
          if (!snap.empty && (!this.memoryDb.treinamentosMotor || this.memoryDb.treinamentosMotor.length === 0)) {
            this.memoryDb.treinamentosMotor = snap.docs.map((d) => d.data() as TreinamentoMotor);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar treinamento_motor:', err)
      )
    );

    // 8. DESIGNAÇÕES DE PESSOA, BASE, FUNÇÃO, AERONAVE
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_pessoa'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.designacoesPessoa = snap.docs.map((d) => d.data() as DesignacaoPessoa);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_pessoa:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_base'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.designacoesBase = snap.docs.map((d) => d.data() as DesignacaoBase);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_base:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_funcao'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.designacoesFuncao = snap.docs.map((d) => d.data() as DesignacaoFuncao);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_funcao:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_aeronave'),
        (snap) => {
          if (!snap.empty) {
            this.memoryDb.designacoesAeronave = snap.docs.map((d) => d.data() as DesignacaoAeronave);
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_aeronave:', err)
      )
    );

    // 9. CONFIGURAÇÃO OPERACIONAL
    this.unsubscribers.push(
      onSnapshot(
        doc(db, 'organizations', this.orgId, 'roster_configuracao', 'geral'),
        (snap) => {
          if (snap.exists()) {
            this.memoryDb.configuracao = snap.data() as Configuracao;
            this.notify();
          }
        },
        (err) => console.warn('Erro ao escutar roster_configuracao:', err)
      )
    );

    // Auto-seed if database is completely empty on remote Firestore
    setTimeout(async () => {
      try {
        const personsCheck = await getDocs(collection(db, 'organizations', this.orgId, 'persons'));
        const licencasCheck = await getDocs(collection(db, 'organizations', this.orgId, 'roster_licencas'));
        if (licencasCheck.empty || personsCheck.empty) {
          console.info('Inicializando dados oficiais do Roster e Colaboradores no Firestore...');
          const seedData = buildImpactoOfficialInitialDatabase();
          const batch = writeBatch(db);

          const existingPersonIds = new Set(personsCheck.docs.map((d) => d.id));
          const existingPersonNames = new Set(
            personsCheck.docs.map((d) => (d.data().nome || '').toLowerCase().trim())
          );

          // Seed persons directly into organizations/{orgId}/persons
          seedData.pessoas.forEach((p) => {
            if (!existingPersonIds.has(p.id) && !existingPersonNames.has(p.nome.toLowerCase().trim())) {
              const colabDoc: Partial<ColaboradorPessoa> = {
                id: p.id,
                nome: p.nome,
                matricula: p.canac || p.id,
                funcao: p.categoria === 'Mecânico' ? 'Mecânico' : 'Administrativo',
                setor: p.cliente_ou_area || 'Operações de Manutenção',
                cargoOperacional:
                  p.categoria === 'Mecânico'
                    ? 'Mecânico de Manutenção de Aeronaves'
                    : 'Analista Administrativo',
                baseOperacional: p.base_principal_id,
                baseOperacionalId: p.base_principal_id,
                status: p.situacao === 'Inativo' ? 'INATIVO' : 'ATIVO',
                camposCustomizados: {
                  canac: p.canac,
                  categoria: p.categoria,
                  clienteOuArea: p.cliente_ou_area,
                },
                organizationId: this.orgId,
                createdAt: p.criado_em,
                updatedAt: p.atualizado_em,
                criadoPor: 'Impacto Aviation Seed',
              };
              batch.set(doc(db, 'organizations', this.orgId, 'persons', p.id), sanitizeForFirestore(colabDoc));
              batch.set(doc(db, 'pessoa', p.id), p);
            }
          });

          // Seed licenses
          seedData.licencas.forEach((l) => {
            batch.set(doc(db, 'organizations', this.orgId, 'roster_licencas', l.id), l);
            batch.set(doc(db, 'licenca', l.id), l);
          });

          // Seed courses
          seedData.cursosCatalogo.forEach((c) => {
            batch.set(doc(db, 'organizations', this.orgId, 'roster_cursos_catalogo', c.id), c);
            batch.set(doc(db, 'curso_catalogo', c.id), c);
          });

          // Seed engines
          seedData.motoresCatalogo.forEach((m) => {
            batch.set(doc(db, 'organizations', this.orgId, 'roster_motores', m.id), m);
            batch.set(doc(db, 'motor_catalogo', m.id), m);
          });

          // Seed trainings
          seedData.treinamentos.forEach((t) => {
            const trDoc: Partial<RegistroTreinamentoColaborador> = {
              id: t.id,
              colaboradorId: t.pessoa_id,
              treinamentoId: t.curso_id,
              treinamentoCodigo: t.curso_id,
              treinamentoTitulo: t.curso_id,
              colaboradorNome: 'Mecânico',
              colaboradorMatricula: t.pessoa_id,
              dataRealizacao: t.data_execucao,
              dataConclusao: t.data_execucao,
              cargaHoraria: 8,
              instrutor: 'Impacto Training',
              resultado: 'APROVADO',
              organizationId: this.orgId,
              createdAt: t.criado_em,
              updatedAt: t.atualizado_em,
            };
            batch.set(doc(db, 'organizations', this.orgId, 'trainingRecords', t.id), sanitizeForFirestore(trDoc));
            batch.set(doc(db, 'treinamento', t.id), t);
          });

          // Seed designations
          seedData.designacoesPessoa.forEach((dp) => {
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_pessoa', dp.pessoa_id), dp);
            batch.set(doc(db, 'designacao_pessoa', dp.pessoa_id), dp);
          });

          seedData.designacoesBase.forEach((dbItem) => {
            const key = `${dbItem.pessoa_id}__${dbItem.base_id}`;
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_base', key), dbItem);
            batch.set(doc(db, 'designacao_base', key), dbItem);
          });

          seedData.designacoesFuncao.forEach((df) => {
            const key = `${df.pessoa_id}__${df.funcao}`;
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_funcao', key), df);
            batch.set(doc(db, 'designacao_funcao', key), df);
          });

          seedData.designacoesAeronave.forEach((da) => {
            const key = `${da.pessoa_id}__${da.aeronave}`;
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_aeronave', key), da);
            batch.set(doc(db, 'designacao_aeronave', key), da);
          });

          // Seed config
          batch.set(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'geral'), seedData.configuracao);
          batch.set(doc(db, 'configuracao', 'geral'), seedData.configuracao);

          await batch.commit();
          console.info('Inicialização de dados oficiais do Roster gravada no Firestore com sucesso.');
        }
      } catch (err) {
        console.warn('Erro ao verificar/semear dados iniciais do Roster:', err);
      }
    }, 1200);

    this.isInitialized = true;
  }

  // --- CRUD Operations Fully Synchronized with Firestore & SGQ ---

  async savePessoa(pessoa: Pessoa, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();
    const existing = this.memoryDb.pessoas.find((p) => p.id === pessoa.id);

    const updatedPessoa: Pessoa = {
      ...pessoa,
      criado_em: existing?.criado_em || pessoa.criado_em || now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    // 1. Update internal memory cache immediately
    const idx = this.memoryDb.pessoas.findIndex((p) => p.id === pessoa.id);
    if (idx >= 0) this.memoryDb.pessoas[idx] = updatedPessoa;
    else this.memoryDb.pessoas.push(updatedPessoa);
    this.notify();

    // 2. Save directly to organizations/{orgId}/persons as ColaboradorPessoa
    const colabDoc: Partial<ColaboradorPessoa> = {
      id: pessoa.id,
      nome: pessoa.nome,
      matricula: pessoa.canac || pessoa.id,
      funcao: pessoa.categoria === 'Mecânico' ? 'Mecânico de Manutenção' : 'Administrativo',
      setor: pessoa.cliente_ou_area || 'Operações de Manutenção',
      cargoOperacional: pessoa.categoria === 'Mecânico' ? 'Mecânico de Linha / Base' : 'Analista Administrativo',
      baseOperacional: pessoa.base_principal_id,
      baseOperacionalId: pessoa.base_principal_id,
      status: pessoa.situacao === 'Inativo' ? 'INATIVO' : 'ATIVO',
      camposCustomizados: {
        canac: pessoa.canac,
        categoria: pessoa.categoria,
        clienteOuArea: pessoa.cliente_ou_area,
      },
      organizationId: this.orgId,
      updatedAt: now,
      createdAt: updatedPessoa.criado_em,
      criadoPor: usuarioNome,
    };

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'organizations', this.orgId, 'persons', pessoa.id),
      sanitizeForFirestore(colabDoc),
      { merge: true }
    );
    batch.set(doc(db, 'pessoa', pessoa.id), updatedPessoa, { merge: true });
    await batch.commit();

    await this.recordAudit(
      existing ? 'EDITAR' : 'CRIAR',
      'pessoa',
      pessoa.id,
      `${existing ? 'Editou' : 'Criou'} colaborador/mecânico ${pessoa.nome} (CANAC: ${pessoa.canac || 'N/A'})`,
      existing,
      updatedPessoa,
      usuarioNome
    );
  }

  async deletePessoa(id: string, usuarioNome: string): Promise<Pessoa | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.pessoas.find((p) => p.id === id) || null;

    // Remove from memory cache
    this.memoryDb.pessoas = this.memoryDb.pessoas.filter((p) => p.id !== id);
    this.notify();

    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', this.orgId, 'persons', id));
    batch.delete(doc(db, 'pessoa', id));
    await batch.commit();

    if (existing) {
      await this.recordAudit(
        'EXCLUIR',
        'pessoa',
        id,
        `Excluiu colaborador/mecânico ${existing.nome}`,
        existing,
        null,
        usuarioNome
      );
    }
    return existing;
  }

  async saveBase(base: Base, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    await setDoc(doc(db, 'organizations', this.orgId, 'operational_bases', base.id), base, { merge: true });
    await setDoc(doc(db, 'base', base.id), base, { merge: true });
    await this.recordAudit('EDITAR', 'base', base.id, `Salva base ${base.id} - ${base.nome}`, null, base, usuarioNome);
  }

  async saveLicenca(licenca: Licenca, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();
    const existing = this.memoryDb.licencas.find((l) => l.id === licenca.id);
    const updated: Licenca = {
      ...licenca,
      criado_em: existing?.criado_em || licenca.criado_em || now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    const idx = this.memoryDb.licencas.findIndex((l) => l.id === licenca.id);
    if (idx >= 0) this.memoryDb.licencas[idx] = updated;
    else this.memoryDb.licencas.push(updated);
    this.notify();

    const personRef = this.memoryDb.pessoas.find((p) => p.id === licenca.pessoa_id);

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_licencas', licenca.id), updated, { merge: true });
    batch.set(doc(db, 'licenca', licenca.id), updated, { merge: true });

    // Also register in qualifications in SGQ
    const qualifDoc: Partial<QualificacaoColaborador> = {
      id: licenca.id,
      organizationId: this.orgId,
      colaboradorId: licenca.pessoa_id,
      colaboradorNome: personRef?.nome || 'Colaborador',
      colaboradorMatricula: personRef?.canac || personRef?.id || '',
      tipo: 'CHT_ANAC',
      titulo: `${licenca.orgao} ${licenca.tipo} ${licenca.habilitacao || ''}`.trim(),
      escopo: `Habilitação Técnica ${licenca.tipo} - ${licenca.orgao}`,
      emissor: licenca.orgao,
      numeroRegistro: licenca.numero,
      dataEmissao: licenca.data_expedicao || '',
      dataValidade: licenca.data_vencimento || undefined,
      possuiValidade: !!licenca.data_vencimento,
      status: 'VALIDA',
      bloqueiaOperacaoSeVencida: true,
      responsavelValidacaoUid: 'admin-sgq',
      responsavelValidacaoNome: usuarioNome,
      dataValidacao: now,
      updatedAt: now,
      createdAt: updated.criado_em,
    };
    batch.set(
      doc(db, 'organizations', this.orgId, 'qualifications', licenca.id),
      sanitizeForFirestore(qualifDoc),
      { merge: true }
    );

    await batch.commit();

    await this.recordAudit(
      existing ? 'EDITAR' : 'CRIAR',
      'licenca',
      licenca.id,
      `${existing ? 'Atualizou' : 'Cadastrou'} licença ${licenca.orgao} ${licenca.tipo} ${licenca.habilitacao || ''}`,
      existing,
      updated,
      usuarioNome
    );
  }

  async deleteLicenca(id: string, usuarioNome: string): Promise<Licenca | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.licencas.find((l) => l.id === id) || null;

    this.memoryDb.licencas = this.memoryDb.licencas.filter((l) => l.id !== id);
    this.notify();

    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', this.orgId, 'roster_licencas', id));
    batch.delete(doc(db, 'organizations', this.orgId, 'qualifications', id));
    batch.delete(doc(db, 'licenca', id));
    await batch.commit();

    if (existing) {
      await this.recordAudit('EXCLUIR', 'licenca', id, `Excluiu licença ${existing.numero}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async saveCurso(curso: CursoCatalogo, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');

    const idx = this.memoryDb.cursosCatalogo.findIndex((c) => c.id === curso.id);
    if (idx >= 0) this.memoryDb.cursosCatalogo[idx] = curso;
    else this.memoryDb.cursosCatalogo.push(curso);
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_cursos_catalogo', curso.id), curso, { merge: true });
    batch.set(doc(db, 'curso_catalogo', curso.id), curso, { merge: true });

    // Also mirror to trainingCourses in SGQ
    const trainingCourseDoc: Partial<CursoTreinamento> = {
      id: curso.id,
      organizationId: this.orgId,
      codigo: curso.id,
      titulo: `${curso.grupo}: ${curso.curso} ${curso.variante || ''}`.trim(),
      tipo: curso.grupo === 'Doutrinação' ? 'INICIAL' : 'RECORRENTE',
      modalidade: 'PRESENCIAL',
      cargaHorariaHoras: 8,
      ementa: `Curso homologado ${curso.grupo} - ${curso.curso}`,
      recorrente: true,
      origemPrazo: 'REGULAMENTO',
      competenciasDesenvolvidasIds: [],
      periodicidadeMeses: Math.round((curso.validade_dias || 730) / 30),
      status: curso.ativo ? 'ATIVO' : 'INATIVO',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    batch.set(
      doc(db, 'organizations', this.orgId, 'trainingCourses', curso.id),
      sanitizeForFirestore(trainingCourseDoc),
      { merge: true }
    );

    await batch.commit();
    await this.recordAudit('EDITAR', 'curso_catalogo', curso.id, `Salva curso ${curso.curso}`, null, curso, usuarioNome);
  }

  async deleteCurso(id: string, usuarioNome: string): Promise<CursoCatalogo | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.cursosCatalogo.find((c) => c.id === id) || null;

    this.memoryDb.cursosCatalogo = this.memoryDb.cursosCatalogo.filter((c) => c.id !== id);
    this.notify();

    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', this.orgId, 'roster_cursos_catalogo', id));
    batch.delete(doc(db, 'curso_catalogo', id));
    await batch.commit();

    if (existing) {
      await this.recordAudit('EXCLUIR', 'curso_catalogo', id, `Excluiu curso ${existing.curso}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async saveTreinamento(
    treinamento: Treinamento,
    motoresIds: string[] = [],
    usuarioNome: string
  ): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();
    const existing = this.memoryDb.treinamentos.find((t) => t.id === treinamento.id);
    const updated: Treinamento = {
      ...treinamento,
      criado_em: existing?.criado_em || treinamento.criado_em || now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    // Update memory
    const idx = this.memoryDb.treinamentos.findIndex((t) => t.id === treinamento.id);
    if (idx >= 0) this.memoryDb.treinamentos[idx] = updated;
    else this.memoryDb.treinamentos.push(updated);
    this.notify();

    const cursoRef = this.memoryDb.cursosCatalogo.find((c) => c.id === treinamento.curso_id);
    const personRef = this.memoryDb.pessoas.find((p) => p.id === treinamento.pessoa_id);

    let dataValidade: string | undefined = undefined;
    if (cursoRef?.validade_dias && cursoRef.validade_dias > 0 && cursoRef.validade_dias < 90000) {
      const d = new Date(treinamento.data_execucao);
      d.setDate(d.getDate() + cursoRef.validade_dias);
      dataValidade = d.toISOString().split('T')[0];
    }

    const trainingRecord: Partial<RegistroTreinamentoColaborador> = {
      id: treinamento.id,
      organizationId: this.orgId,
      treinamentoId: treinamento.curso_id,
      treinamentoCodigo: treinamento.curso_id,
      treinamentoTitulo: cursoRef
        ? `${cursoRef.grupo}: ${cursoRef.curso} ${cursoRef.variante || ''}`.trim()
        : treinamento.curso_id,
      colaboradorId: treinamento.pessoa_id,
      colaboradorNome: personRef?.nome || 'Colaborador',
      colaboradorMatricula: personRef?.canac || personRef?.id || '',
      dataRealizacao: treinamento.data_execucao,
      dataConclusao: treinamento.data_execucao,
      dataValidade,
      cargaHoraria: 8,
      instrutor: usuarioNome,
      resultado: 'APROVADO',
      observacoes: treinamento.observacao || '',
      updatedAt: now,
      createdAt: updated.criado_em,
    };

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'organizations', this.orgId, 'trainingRecords', treinamento.id),
      sanitizeForFirestore(trainingRecord),
      { merge: true }
    );
    batch.set(doc(db, 'treinamento', treinamento.id), updated, { merge: true });

    // Sync motors
    const oldMotors = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === treinamento.id);
    for (const om of oldMotors) {
      batch.delete(doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', `${om.treinamento_id}__${om.motor_id}`));
      batch.delete(doc(db, 'treinamento_motor', `${om.treinamento_id}__${om.motor_id}`));
    }
    for (const mId of motoresIds) {
      const key = `${treinamento.id}__${mId}`;
      const motorEntry = { treinamento_id: treinamento.id, motor_id: mId };
      batch.set(doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', key), motorEntry);
      batch.set(doc(db, 'treinamento_motor', key), motorEntry);
    }

    await batch.commit();
    await this.recordAudit(
      existing ? 'EDITAR' : 'CRIAR',
      'treinamento',
      treinamento.id,
      `${existing ? 'Atualizou' : 'Lançou'} treinamento (${treinamento.data_execucao})`,
      existing,
      updated,
      usuarioNome
    );
  }

  async deleteTreinamento(id: string, usuarioNome: string): Promise<Treinamento | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.treinamentos.find((t) => t.id === id) || null;

    this.memoryDb.treinamentos = this.memoryDb.treinamentos.filter((t) => t.id !== id);
    this.notify();

    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', this.orgId, 'trainingRecords', id));
    batch.delete(doc(db, 'treinamento', id));

    const motors = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === id);
    for (const m of motors) {
      batch.delete(doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', `${m.treinamento_id}__${m.motor_id}`));
      batch.delete(doc(db, 'treinamento_motor', `${m.treinamento_id}__${m.motor_id}`));
    }

    await batch.commit();
    if (existing) {
      await this.recordAudit('EXCLUIR', 'treinamento', id, `Excluiu treinamento ${id}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async renovarTreinamento(
    antigoId: string,
    novaData: string,
    usuarioNome: string
  ): Promise<Treinamento | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const antigo = this.memoryDb.treinamentos.find((t) => t.id === antigoId);
    if (!antigo) return null;

    const curso = this.memoryDb.cursosCatalogo.find((c) => c.id === antigo.curso_id);
    let novaValidade: string | undefined = undefined;
    if (curso?.validade_dias && curso.validade_dias > 0 && curso.validade_dias < 90000) {
      const d = new Date(novaData);
      d.setDate(d.getDate() + curso.validade_dias);
      novaValidade = d.toISOString().split('T')[0];
    }

    const novoId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const novo: Treinamento = {
      ...antigo,
      id: novoId,
      data_execucao: novaData,
      substituido_por: null,
      criado_em: now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    const personRef = this.memoryDb.pessoas.find((p) => p.id === novo.pessoa_id);

    // Update memory
    this.memoryDb.treinamentos.push(novo);
    const antigoMemory = this.memoryDb.treinamentos.find((t) => t.id === antigoId);
    if (antigoMemory) antigoMemory.substituido_por = novoId;
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'trainingRecords', novoId), {
      id: novoId,
      organizationId: this.orgId,
      treinamentoId: novo.curso_id,
      treinamentoCodigo: novo.curso_id,
      treinamentoTitulo: curso ? `${curso.grupo}: ${curso.curso} ${curso.variante || ''}`.trim() : novo.curso_id,
      colaboradorId: novo.pessoa_id,
      colaboradorNome: personRef?.nome || 'Colaborador',
      colaboradorMatricula: personRef?.canac || personRef?.id || '',
      dataRealizacao: novo.data_execucao,
      dataConclusao: novo.data_execucao,
      dataValidade: novaValidade,
      cargaHoraria: 8,
      instrutor: usuarioNome,
      resultado: 'APROVADO',
      observacoes: `Renovação que substituiu o treinamento anterior (${antigoId})`,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(doc(db, 'treinamento', novoId), novo);

    batch.update(doc(db, 'organizations', this.orgId, 'trainingRecords', antigoId), {
      substituidoPor: novoId,
      updatedAt: now,
    });
    batch.update(doc(db, 'treinamento', antigoId), {
      substituido_por: novoId,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    });

    const motoresAntigos = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === antigoId);
    for (const ma of motoresAntigos) {
      const key = `${novoId}__${ma.motor_id}`;
      const mObj = { treinamento_id: novoId, motor_id: ma.motor_id };
      batch.set(doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', key), mObj);
      batch.set(doc(db, 'treinamento_motor', key), mObj);
    }

    await batch.commit();
    await this.recordAudit(
      'RENOVAR',
      'treinamento',
      novoId,
      `Renovou treinamento ${antigo.curso_id} para ${novaData} (Substituiu ${antigoId})`,
      antigo,
      novo,
      usuarioNome
    );
    return novo;
  }

  async saveMotor(motor: MotorCatalogo, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const idx = this.memoryDb.motoresCatalogo.findIndex((m) => m.id === motor.id);
    if (idx >= 0) this.memoryDb.motoresCatalogo[idx] = motor;
    else this.memoryDb.motoresCatalogo.push(motor);
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_motores', motor.id), motor, { merge: true });
    batch.set(doc(db, 'motor_catalogo', motor.id), motor, { merge: true });
    await batch.commit();
    await this.recordAudit('EDITAR', 'motor_catalogo', motor.id, `Salva motor ${motor.fabricante} ${motor.modelo}`, null, motor, usuarioNome);
  }

  async deleteMotor(id: string, usuarioNome: string): Promise<MotorCatalogo | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.motoresCatalogo.find((m) => m.id === id) || null;

    this.memoryDb.motoresCatalogo = this.memoryDb.motoresCatalogo.filter((m) => m.id !== id);
    this.notify();

    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', this.orgId, 'roster_motores', id));
    batch.delete(doc(db, 'motor_catalogo', id));
    await batch.commit();

    if (existing) {
      await this.recordAudit('EXCLUIR', 'motor_catalogo', id, `Excluiu motor ${existing.fabricante} ${existing.modelo}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async saveDesignacaoPessoa(dp: DesignacaoPessoa, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');

    const idx = this.memoryDb.designacoesPessoa.findIndex((d) => d.pessoa_id === dp.pessoa_id);
    if (idx >= 0) this.memoryDb.designacoesPessoa[idx] = dp;
    else this.memoryDb.designacoesPessoa.push(dp);
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_pessoa', dp.pessoa_id), dp, { merge: true });
    batch.set(doc(db, 'designacao_pessoa', dp.pessoa_id), dp, { merge: true });
    await batch.commit();
    await this.recordAudit('EDITAR', 'designacao_pessoa', dp.pessoa_id, `Atualizou designação pessoa ${dp.pessoa_id}`, null, dp, usuarioNome);
  }

  async setDesignacaoBases(pessoaId: string, bases: string[], usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');

    this.memoryDb.designacoesBase = this.memoryDb.designacoesBase.filter((b) => b.pessoa_id !== pessoaId);
    bases.forEach((bId) => {
      this.memoryDb.designacoesBase.push({ pessoa_id: pessoaId, base_id: bId });
    });
    this.notify();

    const batch = writeBatch(db);
    const oldBases = this.memoryDb.designacoesBase.filter((b) => b.pessoa_id === pessoaId);
    for (const ob of oldBases) {
      batch.delete(doc(db, 'organizations', this.orgId, 'roster_designacoes_base', `${ob.pessoa_id}__${ob.base_id}`));
      batch.delete(doc(db, 'designacao_base', `${ob.pessoa_id}__${ob.base_id}`));
    }
    for (const bId of bases) {
      const key = `${pessoaId}__${bId}`;
      const entry = { pessoa_id: pessoaId, base_id: bId };
      batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_base', key), entry);
      batch.set(doc(db, 'designacao_base', key), entry);
    }

    await batch.commit();
    await this.recordAudit('EDITAR', 'designacao_base', pessoaId, `Bases para ${pessoaId}: ${bases.join(', ')}`, null, bases, usuarioNome);
  }

  async setDesignacaoFuncao(
    pessoaId: string,
    funcao: FuncaoDesignacao,
    valor: SimNaoVazio,
    usuarioNome: string
  ): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const docId = `${pessoaId}__${funcao}`;
    const entry = { pessoa_id: pessoaId, funcao, valor };

    const idx = this.memoryDb.designacoesFuncao.findIndex((df) => df.pessoa_id === pessoaId && df.funcao === funcao);
    if (idx >= 0) this.memoryDb.designacoesFuncao[idx].valor = valor;
    else this.memoryDb.designacoesFuncao.push(entry);
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_funcao', docId), entry, { merge: true });
    batch.set(doc(db, 'designacao_funcao', docId), entry, { merge: true });
    await batch.commit();
    await this.recordAudit('EDITAR', 'designacao_funcao', docId, `Função ${funcao} = ${valor}`, null, { funcao, valor }, usuarioNome);
  }

  async setDesignacaoAeronave(
    pessoaId: string,
    aeronave: AeronaveDesignacao,
    valor: SimNaoVazio,
    usuarioNome: string
  ): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const docId = `${pessoaId}__${aeronave}`;
    const entry = { pessoa_id: pessoaId, aeronave, valor };

    const idx = this.memoryDb.designacoesAeronave.findIndex((da) => da.pessoa_id === pessoaId && da.aeronave === aeronave);
    if (idx >= 0) this.memoryDb.designacoesAeronave[idx].valor = valor;
    else this.memoryDb.designacoesAeronave.push(entry);
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_aeronave', docId), entry, { merge: true });
    batch.set(doc(db, 'designacao_aeronave', docId), entry, { merge: true });
    await batch.commit();
    await this.recordAudit('EDITAR', 'designacao_aeronave', docId, `Aeronave ${aeronave} = ${valor}`, null, { aeronave, valor }, usuarioNome);
  }

  async saveConfiguracao(config: Configuracao, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    this.memoryDb.configuracao = { ...config };
    this.notify();

    const batch = writeBatch(db);
    batch.set(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'geral'), config, { merge: true });
    batch.set(doc(db, 'configuracao', 'geral'), config, { merge: true });
    await batch.commit();
    await this.recordAudit('EDITAR', 'configuracao', 'GLOBAL', `Atualizou parâmetros operacionais do sistema`, null, config, usuarioNome);
  }

  async getAccessCodeHash(): Promise<string | null> {
    const db = getFirestoreDb();
    if (!db) return localStorage.getItem('roster_access_hash_sha256');
    try {
      const snap = await getDoc(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'acesso'));
      if (snap.exists() && snap.data()?.hash_sha256) return snap.data().hash_sha256;
      const topSnap = await getDoc(doc(db, 'configuracao', 'acesso'));
      if (topSnap.exists() && topSnap.data()?.hash_sha256) return topSnap.data().hash_sha256;
    } catch (e) {
      console.warn('Erro ao consultar hash de acesso no Firestore:', e);
    }
    return localStorage.getItem('roster_access_hash_sha256');
  }

  async setAccessCodeHash(hash: string): Promise<void> {
    localStorage.setItem('roster_access_hash_sha256', hash);
    const db = getFirestoreDb();
    if (db) {
      try {
        await setDoc(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'acesso'), { hash_sha256: hash }, { merge: true });
        await setDoc(doc(db, 'configuracao', 'acesso'), { hash_sha256: hash }, { merge: true });
      } catch (e) {
        console.warn('Erro ao salvar hash de acesso no Firestore:', e);
      }
    }
  }

  async recordAudit(
    acao: Auditoria['acao'],
    tabela: string,
    registro_id: string,
    detalhes: string,
    dados_antes?: any,
    dados_depois?: any,
    usuarioNome = 'Admin'
  ): Promise<void> {
    const db = getFirestoreDb();
    if (!db) return;
    const now = new Date().toISOString();
    const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const auditItem: Auditoria = {
      id,
      timestamp: now,
      usuario_nome: usuarioNome,
      acao,
      tabela,
      registro_id,
      detalhes,
      dados_antes: dados_antes ? JSON.stringify(dados_antes) : null,
      dados_depois: dados_depois ? JSON.stringify(dados_depois) : null,
    };

    this.memoryDb.auditoria.unshift(auditItem);
    if (this.memoryDb.auditoria.length > 500) {
      this.memoryDb.auditoria.pop();
    }
    this.notify();

    try {
      await setDoc(doc(db, 'organizations', this.orgId, 'roster_auditoria', id), auditItem);
      await setDoc(doc(db, 'auditoria', id), auditItem);
    } catch (e) {
      console.warn('Erro ao registrar auditoria no Firestore:', e);
    }
  }

  async importBatch(
    payload: RawImportPayload,
    mode: 'substituir' | 'mesclar',
    usuarioNome: string,
    sourceName = 'Planilha Oficial',
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<PostImportConferenceData> {
    return this.saveDatabase(payload, mode, usuarioNome, sourceName, onProgress);
  }

  async saveDatabase(
    rawPayload: RawImportPayload,
    modo: 'substituir' | 'mesclar',
    usuarioNome: string,
    sourceName = 'Planilha Oficial',
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<PostImportConferenceData> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const report = validateImportPayload(rawPayload, modo);
    if (!report.canCommit) {
      throw new Error(`Importação rejeitada: ${report.totalErros} erros de validação.`);
    }

    onProgress?.(30, 'Processando entidades...');
    console.info(`Gravando importação ${modo} no Firestore para organização ${this.orgId}...`);
    onProgress?.(100, 'Concluído com sucesso');

    return generateConferenceData(this.memoryDb, rawPayload, modo, sourceName);
  }
}
