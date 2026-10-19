import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { buildInitialCleanDatabase } from '../../data/initialData';
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
  parseExcelDate,
  parseNullableString,
  parseNumber,
  parseSimNao,
  parseTextString,
  PostImportConferenceData,
  RawImportPayload,
  validateImportPayload,
} from '../storage';
import { StorageAdapter } from '../storageInterface';

const BATCH_LIMIT = 400; // Safe threshold well below Firestore's 500 limit

export class FirestoreAdapter implements StorageAdapter {
  readonly isCloud = true;
  private _isOffline = !navigator.onLine;

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

  constructor() {
    window.addEventListener('online', () => {
      this._isOffline = false;
      this.notify();
    });
    window.addEventListener('offline', () => {
      this._isOffline = true;
      this.notify();
    });
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

  async init(): Promise<void> {
    if (this.isInitialized) return;
    const db = getFirestoreDb();
    if (!db) {
      throw new Error('Firestore não está configurado. Verifique as variáveis VITE_FIREBASE_*.');
    }

    // Attach real-time onSnapshot listeners to each collection once
    // 1. base
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'base'),
        (snap) => {
          this.memoryDb.bases = snap.docs.map((d) => d.data() as Base);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção base:', err)
      )
    );

    // 2. pessoa
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'pessoa'),
        (snap) => {
          this.memoryDb.pessoas = snap.docs.map((d) => d.data() as Pessoa);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção pessoa:', err)
      )
    );

    // 3. licenca
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'licenca'),
        (snap) => {
          this.memoryDb.licencas = snap.docs.map((d) => d.data() as Licenca);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção licenca:', err)
      )
    );

    // 4. curso_catalogo
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'curso_catalogo'),
        (snap) => {
          this.memoryDb.cursosCatalogo = snap.docs.map((d) => d.data() as CursoCatalogo);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção curso_catalogo:', err)
      )
    );

    // 5. treinamento
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'treinamento'),
        (snap) => {
          this.memoryDb.treinamentos = snap.docs.map((d) => d.data() as Treinamento);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção treinamento:', err)
      )
    );

    // 6. motor_catalogo
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'motor_catalogo'),
        (snap) => {
          this.memoryDb.motoresCatalogo = snap.docs.map((d) => d.data() as MotorCatalogo);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção motor_catalogo:', err)
      )
    );

    // 7. treinamento_motor
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'treinamento_motor'),
        (snap) => {
          this.memoryDb.treinamentosMotor = snap.docs.map((d) => d.data() as TreinamentoMotor);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção treinamento_motor:', err)
      )
    );

    // 8. designacao_pessoa
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'designacao_pessoa'),
        (snap) => {
          this.memoryDb.designacoesPessoa = snap.docs.map((d) => d.data() as DesignacaoPessoa);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção designacao_pessoa:', err)
      )
    );

    // 9. designacao_base
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'designacao_base'),
        (snap) => {
          this.memoryDb.designacoesBase = snap.docs.map((d) => d.data() as DesignacaoBase);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção designacao_base:', err)
      )
    );

    // 10. designacao_funcao
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'designacao_funcao'),
        (snap) => {
          this.memoryDb.designacoesFuncao = snap.docs.map((d) => d.data() as DesignacaoFuncao);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção designacao_funcao:', err)
      )
    );

    // 11. designacao_aeronave
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'designacao_aeronave'),
        (snap) => {
          this.memoryDb.designacoesAeronave = snap.docs.map((d) => d.data() as DesignacaoAeronave);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção designacao_aeronave:', err)
      )
    );

    // 12. configuracao/geral
    this.unsubscribers.push(
      onSnapshot(
        doc(db, 'configuracao', 'geral'),
        (snap) => {
          if (snap.exists()) {
            this.memoryDb.configuracao = snap.data() as Configuracao;
          }
          this.notify();
        },
        (err) => console.warn('Erro ao escutar documento configuracao/geral:', err)
      )
    );

    // 13. auditoria (latest 500)
    const auditQuery = query(collection(db, 'auditoria'), orderBy('timestamp', 'desc'), limit(500));
    this.unsubscribers.push(
      onSnapshot(
        auditQuery,
        (snap) => {
          this.memoryDb.auditoria = snap.docs.map((d) => d.data() as Auditoria);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar coleção auditoria:', err)
      )
    );

    this.isInitialized = true;
  }

  // --- CRUD Operations ---

  async savePessoa(pessoa: Pessoa, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();
    const docRef = doc(db, 'pessoa', pessoa.id);
    const existing = this.memoryDb.pessoas.find((p) => p.id === pessoa.id);
    const updated: Pessoa = {
      ...pessoa,
      criado_em: existing?.criado_em || pessoa.criado_em || now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };
    await setDoc(docRef, updated, { merge: true });
    await this.recordAudit(
      existing ? 'EDITAR' : 'CRIAR',
      'pessoa',
      pessoa.id,
      `${existing ? 'Editou' : 'Criou'} pessoa ${pessoa.nome}`,
      existing,
      updated,
      usuarioNome
    );
  }

  async deletePessoa(id: string, usuarioNome: string): Promise<Pessoa | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.pessoas.find((p) => p.id === id) || null;
    await deleteDoc(doc(db, 'pessoa', id));
    if (existing) {
      await this.recordAudit('EXCLUIR', 'pessoa', id, `Excluiu pessoa ${existing.nome}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async saveBase(base: Base, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
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
    await setDoc(doc(db, 'licenca', licenca.id), updated, { merge: true });
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
    await deleteDoc(doc(db, 'licenca', id));
    if (existing) {
      await this.recordAudit('EXCLUIR', 'licenca', id, `Excluiu licença ${existing.numero}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async saveCurso(curso: CursoCatalogo, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    await setDoc(doc(db, 'curso_catalogo', curso.id), curso, { merge: true });
    await this.recordAudit('EDITAR', 'curso_catalogo', curso.id, `Salva curso ${curso.curso}`, null, curso, usuarioNome);
  }

  async deleteCurso(id: string, usuarioNome: string): Promise<CursoCatalogo | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.cursosCatalogo.find((c) => c.id === id) || null;
    await deleteDoc(doc(db, 'curso_catalogo', id));
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

    const batch = writeBatch(db);
    batch.set(doc(db, 'treinamento', treinamento.id), updated, { merge: true });

    // Sync motors: delete old links, set new ones
    const oldMotors = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === treinamento.id);
    for (const om of oldMotors) {
      batch.delete(doc(db, 'treinamento_motor', `${om.treinamento_id}__${om.motor_id}`));
    }
    for (const mId of motoresIds) {
      batch.set(doc(db, 'treinamento_motor', `${treinamento.id}__${mId}`), {
        treinamento_id: treinamento.id,
        motor_id: mId,
      });
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
    const batch = writeBatch(db);
    batch.delete(doc(db, 'treinamento', id));

    const motors = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === id);
    for (const m of motors) {
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

    const batch = writeBatch(db);
    batch.set(doc(db, 'treinamento', novoId), novo);
    batch.update(doc(db, 'treinamento', antigoId), {
      substituido_por: novoId,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    });

    const motoresAntigos = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === antigoId);
    for (const ma of motoresAntigos) {
      batch.set(doc(db, 'treinamento_motor', `${novoId}__${ma.motor_id}`), {
        treinamento_id: novoId,
        motor_id: ma.motor_id,
      });
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
    await setDoc(doc(db, 'motor_catalogo', motor.id), motor, { merge: true });
    await this.recordAudit('EDITAR', 'motor_catalogo', motor.id, `Salva motor ${motor.fabricante} ${motor.modelo}`, null, motor, usuarioNome);
  }

  async deleteMotor(id: string, usuarioNome: string): Promise<MotorCatalogo | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.motoresCatalogo.find((m) => m.id === id) || null;
    await deleteDoc(doc(db, 'motor_catalogo', id));
    if (existing) {
      await this.recordAudit('EXCLUIR', 'motor_catalogo', id, `Excluiu motor ${existing.fabricante} ${existing.modelo}`, existing, null, usuarioNome);
    }
    return existing;
  }

  async saveDesignacaoPessoa(dp: DesignacaoPessoa, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    await setDoc(doc(db, 'designacao_pessoa', dp.pessoa_id), dp, { merge: true });
    await this.recordAudit('EDITAR', 'designacao_pessoa', dp.pessoa_id, `Atualizou designação pessoa ${dp.pessoa_id}`, null, dp, usuarioNome);
  }

  async setDesignacaoBases(pessoaId: string, bases: string[], usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const batch = writeBatch(db);

    const oldBases = this.memoryDb.designacoesBase.filter((b) => b.pessoa_id === pessoaId);
    for (const ob of oldBases) {
      batch.delete(doc(db, 'designacao_base', `${ob.pessoa_id}__${ob.base_id}`));
    }
    for (const bId of bases) {
      batch.set(doc(db, 'designacao_base', `${pessoaId}__${bId}`), {
        pessoa_id: pessoaId,
        base_id: bId,
      });
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
    await setDoc(doc(db, 'designacao_funcao', docId), { pessoa_id: pessoaId, funcao, valor }, { merge: true });
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
    await setDoc(doc(db, 'designacao_aeronave', docId), { pessoa_id: pessoaId, aeronave, valor }, { merge: true });
    await this.recordAudit('EDITAR', 'designacao_aeronave', docId, `Aeronave ${aeronave} = ${valor}`, null, { aeronave, valor }, usuarioNome);
  }

  async saveConfiguracao(config: Configuracao, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    await setDoc(doc(db, 'configuracao', 'geral'), config, { merge: true });
    await this.recordAudit('EDITAR', 'configuracao', 'geral', `Atualizou parâmetros operacionais no Firestore`, null, config, usuarioNome);
  }

  async getAccessCodeHash(): Promise<string | null> {
    const db = getFirestoreDb();
    if (!db) return null;
    try {
      const snap = await getDoc(doc(db, 'configuracao', 'acesso'));
      if (snap.exists()) {
        return (snap.data() as any).hash_sha256 || null;
      }
    } catch (err) {
      console.warn('Erro ao ler configuracao/acesso:', err);
    }
    return null;
  }

  async setAccessCodeHash(hash: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();
    await setDoc(doc(db, 'configuracao', 'acesso'), {
      hash_sha256: hash,
      atualizado_em: now,
    });
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
    const auditItem: Auditoria = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      usuario_nome: usuarioNome,
      acao,
      tabela,
      registro_id,
      detalhes,
      dados_antes: dados_antes || null,
      dados_depois: dados_depois || null,
    };
    try {
      await setDoc(doc(db, 'auditoria', auditItem.id), auditItem);
    } catch (err) {
      console.warn('Erro ao gravar log de auditoria no Firestore:', err);
    }
  }

  // --- Batch Import & Migration Implementation ---

  async importBatch(
    payload: RawImportPayload,
    mode: 'substituir' | 'mesclar',
    usuarioNome: string,
    sourceName = 'Importação Firestore',
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<PostImportConferenceData> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não está configurado.');

    onProgress?.(5, 'Validando regras de integridade relacional...');
    const validation = validateImportPayload(payload, mode);
    if (!validation.canCommit) {
      throw new Error('Falha na integridade: existem erros bloqueantes no arquivo.');
    }

    const now = new Date().toISOString();

    // Prepare operations list to execute in batches of BATCH_LIMIT
    const operations: Array<{ type: 'set' | 'delete'; ref: any; data?: any }> = [];

    // If 'substituir', queue deletion of existing documents
    if (mode === 'substituir') {
      onProgress?.(10, 'Preparando limpeza de coleções existentes...');
      const collectionsToClear = [
        'base',
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
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          operations.push({ type: 'delete', ref: docSnap.ref });
        }
      }
    }

    onProgress?.(25, 'Preparando documentos normalizados para gravação...');

    // 1. base
    if (Array.isArray(payload.base)) {
      for (const r of payload.base) {
        const id = parseTextString(r.id);
        if (!id) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'base', id),
          data: { id, nome: parseTextString(r.nome || id), ativa: r.ativa !== false },
        });
      }
    }

    // 2. pessoa
    if (Array.isArray(payload.pessoa)) {
      for (const r of payload.pessoa) {
        const id = parseTextString(r.id);
        const nome = parseTextString(r.nome);
        if (!id || !nome) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'pessoa', id),
          data: {
            id,
            nome,
            categoria: r.categoria === 'Administrativo' ? 'Administrativo' : 'Mecânico',
            situacao: r.situacao === 'Inativo' ? 'Inativo' : 'Ativo',
            base_principal_id: parseTextString(r.base_principal_id || 'GRU'),
            cliente_ou_area: parseNullableString(r.cliente_ou_area) || '',
            canac: parseNullableString(r.canac) || '',
            criado_em: r.criado_em || now,
            atualizado_em: now,
            atualizado_por: usuarioNome,
          },
        });
      }
    }

    // 3. curso_catalogo
    if (Array.isArray(payload.curso_catalogo)) {
      for (const r of payload.curso_catalogo) {
        const id = parseTextString(r.id);
        const curso = parseTextString(r.curso);
        if (!id || !curso) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'curso_catalogo', id),
          data: {
            id,
            grupo: r.grupo === 'Doutrinação' ? 'Doutrinação' : 'Frota',
            frota: parseNullableString(r.frota) || '',
            variante: parseNullableString(r.variante) || '',
            curso,
            validade_dias: parseNumber(r.validade_dias, 1825),
            ativo: r.ativo !== false,
          },
        });
      }
    }

    // 4. motor_catalogo
    if (Array.isArray(payload.motor_catalogo)) {
      for (const r of payload.motor_catalogo) {
        const id = parseTextString(r.id);
        const fabricante = parseTextString(r.fabricante);
        if (!id || !fabricante) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'motor_catalogo', id),
          data: { id, fabricante, modelo: parseNullableString(r.modelo) || '' },
        });
      }
    }

    // 5. licenca
    if (Array.isArray(payload.licenca)) {
      for (const r of payload.licenca) {
        const id = parseTextString(r.id);
        const pessoa_id = parseTextString(r.pessoa_id);
        if (!id || !pessoa_id) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'licenca', id),
          data: {
            id,
            pessoa_id,
            orgao: r.orgao === 'FAA' ? 'FAA' : 'ANAC',
            tipo: r.tipo === 'CCT' ? 'CCT' : r.tipo === 'AMP' ? 'AMP' : 'CHT',
            habilitacao: parseTextString(r.habilitacao).toUpperCase(),
            numero: parseTextString(r.numero),
            data_vencimento: parseExcelDate(r.data_vencimento),
            data_expedicao: parseExcelDate(r.data_expedicao),
            criado_em: r.criado_em || now,
            atualizado_em: now,
            atualizado_por: usuarioNome,
          },
        });
      }
    }

    // 6. treinamento
    if (Array.isArray(payload.treinamento)) {
      for (const r of payload.treinamento) {
        const id = parseTextString(r.id);
        const pessoa_id = parseTextString(r.pessoa_id);
        const curso_id = parseTextString(r.curso_id);
        if (!id || !pessoa_id || !curso_id) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'treinamento', id),
          data: {
            id,
            pessoa_id,
            curso_id,
            data_execucao: parseExcelDate(r.data_execucao) || '',
            validade_dias_override: r.validade_dias_override != null ? Number(r.validade_dias_override) : null,
            motor_original: parseNullableString(r.motor_original) || '',
            observacao: parseNullableString(r.observacao) || '',
            substituido_por: parseNullableString(r.substituido_por),
            criado_em: r.criado_em || now,
            atualizado_em: now,
            atualizado_por: usuarioNome,
          },
        });
      }
    }

    // 7. treinamento_motor
    if (Array.isArray(payload.treinamento_motor)) {
      for (const r of payload.treinamento_motor) {
        const tId = parseTextString(r.treinamento_id);
        const mId = parseTextString(r.motor_id);
        if (!tId || !mId) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'treinamento_motor', `${tId}__${mId}`),
          data: { treinamento_id: tId, motor_id: mId },
        });
      }
    }

    // 8. designacao_pessoa
    if (Array.isArray(payload.designacao_pessoa)) {
      for (const r of payload.designacao_pessoa) {
        const pId = parseTextString(r.pessoa_id);
        if (!pId) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'designacao_pessoa', pId),
          data: {
            pessoa_id: pId,
            imp: parseTextString(r.imp),
            easa_type: r.easa_type === 'SIM' ? 'SIM' : r.easa_type === 'NÃO' ? 'NÃO' : 'N/A',
            incluir_na_lista: r.incluir_na_lista !== false,
            nome_na_lista: parseNullableString(r.nome_na_lista) || null,
          },
        });
      }
    }

    // 9. designacao_base
    if (Array.isArray(payload.designacao_base)) {
      for (const r of payload.designacao_base) {
        const pId = parseTextString(r.pessoa_id);
        const bId = parseTextString(r.base_id);
        if (!pId || !bId) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'designacao_base', `${pId}__${bId}`),
          data: { pessoa_id: pId, base_id: bId },
        });
      }
    }

    // 10. designacao_funcao
    if (Array.isArray(payload.designacao_funcao)) {
      for (const r of payload.designacao_funcao) {
        const pId = parseTextString(r.pessoa_id);
        const funcao = parseTextString(r.funcao);
        if (!pId || !funcao) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'designacao_funcao', `${pId}__${funcao}`),
          data: { pessoa_id: pId, funcao, valor: parseSimNao(r.valor, 'NÃO') },
        });
      }
    }

    // 11. designacao_aeronave
    if (Array.isArray(payload.designacao_aeronave)) {
      for (const r of payload.designacao_aeronave) {
        const pId = parseTextString(r.pessoa_id);
        const aeronave = parseTextString(r.aeronave);
        if (!pId || !aeronave) continue;
        operations.push({
          type: 'set',
          ref: doc(db, 'designacao_aeronave', `${pId}__${aeronave}`),
          data: { pessoa_id: pId, aeronave, valor: parseSimNao(r.valor, 'NÃO') },
        });
      }
    }

    // 12. configuracao
    if (payload.configuracao) {
      operations.push({
        type: 'set',
        ref: doc(db, 'configuracao', 'geral'),
        data: payload.configuracao,
      });
    }

    // Execute in batches of BATCH_LIMIT
    const totalOps = operations.length;
    for (let i = 0; i < totalOps; i += BATCH_LIMIT) {
      const slice = operations.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of slice) {
        if (op.type === 'set') batch.set(op.ref, op.data, { merge: true });
        else batch.delete(op.ref);
      }
      await batch.commit();

      const pct = Math.min(95, Math.round(25 + ((i + slice.length) / totalOps) * 70));
      onProgress?.(pct, `Gravando lote ${Math.floor(i / BATCH_LIMIT) + 1} (${i + slice.length}/${totalOps} itens)...`);
    }

    // Record audit
    await this.recordAudit(
      'IMPORTAR',
      'sistema',
      'FIRESTORE_IMPORT',
      `Importação concluída no Firestore (${sourceName}, modo: ${mode}). Total de operações: ${totalOps}.`,
      null,
      { totalOps, sourceName },
      usuarioNome
    );

    onProgress?.(100, 'Importação finalizada com sucesso!');

    return generateConferenceData(this.memoryDb, payload, mode, sourceName, totalOps);
  }

  async migrateLocalToCloud(
    localData: DatabaseState,
    usuarioNome: string,
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<{ totalMigrados: number }> {
    const rawPayload: RawImportPayload = {
      meta: {
        sistema: 'Migração Local -> Firestore',
        gerado_em: new Date().toISOString().slice(0, 10),
      },
      base: localData.bases,
      pessoa: localData.pessoas,
      licenca: localData.licencas,
      curso_catalogo: localData.cursosCatalogo,
      treinamento: localData.treinamentos,
      motor_catalogo: localData.motoresCatalogo,
      treinamento_motor: localData.treinamentosMotor,
      designacao_pessoa: localData.designacoesPessoa,
      designacao_base: localData.designacoesBase,
      designacao_funcao: localData.designacoesFuncao,
      designacao_aeronave: localData.designacoesAeronave,
      configuracao: localData.configuracao,
    };

    const conf = await this.importBatch(rawPayload, 'substituir', usuarioNome, 'Migração Local para Nuvem', onProgress);
    return { totalMigrados: conf.totalGravados };
  }
}
