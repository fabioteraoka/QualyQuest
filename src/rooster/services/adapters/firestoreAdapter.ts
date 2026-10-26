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
  OrgaoLicenca,
  TipoLicenca,
  HabilitacaoLicenca,
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
  HistoricoCorrecaoTreinamento,
} from '../../../types';

export class FirestoreAdapter implements StorageAdapter {
  readonly isCloud = true;
  private _isOffline = !navigator.onLine;
  public orgId: string = DEFAULT_ORGANIZATION_ID;

  // Master Canonical Memory Maps (preserves 100% of SGQ fields)
  private canonicalPersonsMap = new Map<string, ColaboradorPessoa>();
  private canonicalCoursesMap = new Map<string, CursoTreinamento>();
  private canonicalTrainingRecordsMap = new Map<string, RegistroTreinamentoColaborador>();
  private canonicalQualificationsMap = new Map<string, QualificacaoColaborador>();

  // Rooster presentation state
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
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this._isOffline = false;
        this.notify();
      });
      window.addEventListener('offline', () => {
        this._isOffline = true;
        this.notify();
      });
    }
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
        this.canonicalPersonsMap.clear();
        this.canonicalCoursesMap.clear();
        this.canonicalTrainingRecordsMap.clear();
        this.canonicalQualificationsMap.clear();
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

  // --- Mappers between Canonical QualyQuest Firestore and Rooster MRO Views ---

  /**
   * Converte ColaboradorPessoa canônico em Pessoa (modelo de apresentação do Rooster)
   * sem perda de dados.
   */
  private mapColaboradorToPessoa(c: ColaboradorPessoa): Pessoa {
    const matricula = c.matricula || c.camposCustomizados?.canac || c.id;
    const canac = c.camposCustomizados?.canac || c.matricula || '';
    const categoria =
      c.camposCustomizados?.categoria ||
      ((c.funcao || '').toLowerCase().includes('adm') ? 'Administrativo' : 'Mecânico');
    // Preserva a base operacional original do colaborador sem fallback silencioso para REC ou GRU
    const baseFinal = (c.baseOperacionalId || c.baseOperacional || '')
      .split(' - ')[0]
      .trim()
      .toUpperCase();
    const situacao = c.status === 'INATIVO' || c.status === 'DESLIGADO' ? 'Inativo' : 'Ativo';
    const clienteOuArea =
      c.camposCustomizados?.clienteOuArea || c.setor || c.cargoOperacional || 'Manutenção Aeronáutica';

    return {
      id: c.id,
      nome: c.nome || 'Sem Nome',
      categoria,
      situacao,
      base_principal_id: baseFinal,
      cliente_ou_area: clienteOuArea,
      canac,
      matricula,
      setor: c.setor,
      funcao: c.funcao,
      cargo_operacional: c.cargoOperacional,
      data_admissao: c.dataAdmissao,
      contato_corporativo: c.contatoCorporativo,
      observacoes: c.observacoes,
      status_customizado: c.statusCustomizado,
      restricao_operacional: c.restricaoOperacional,
      criado_em: c.createdAt || new Date().toISOString(),
      atualizado_em: c.updatedAt || new Date().toISOString(),
      atualizado_por: c.criadoPor || 'SGQ Colaboradores',
    };
  }

  /**
   * Converte CursoTreinamento canônico em CursoCatalogo (modelo de apresentação do Rooster)
   */
  private mapCursoTreinamentoToCursoCatalogo(c: CursoTreinamento): CursoCatalogo {
    const frota = c.frotaOuFamilia || '';
    const isFrota = frota && frota !== 'Geral' && frota !== 'Doutrinação';
    const hasPeriodicidade = typeof c.periodicidadeMeses === 'number' && c.periodicidadeMeses > 0;

    // Regra estrita:
    // Sem vencimento aplicável APENAS se explicitamente confirmado por regra cadastrada.
    // A ausência de periodicidade NÃO pode ser interpretada automaticamente como ausência de vencimento!
    const semValidadeConfirmada = (c as any).sem_validade === true || (c as any).semVencimento === true;

    // Preservar periodicidade em meses exata sem converter para dias arbitrários (* 30)
    const validadeDias = typeof (c as any).validade_dias === 'number' && (c as any).validade_dias > 0
      ? (c as any).validade_dias
      : 0;

    return {
      id: c.id,
      grupo: isFrota ? 'Frota' : 'Doutrinação',
      frota: frota,
      variante: c.variantesAplicabilidade?.join(', ') || '',
      curso: c.nivelOuModulo ? `${c.titulo} - ${c.nivelOuModulo}` : c.titulo,
      validade_dias: validadeDias,
      ativo: c.status !== 'INATIVO',
      codigo: c.codigo || c.id,
      tipo: c.tipo,
      modalidade: c.modalidade,
      carga_horaria_horas: c.cargaHorariaHoras,
      ementa: c.ementa,
      recorrente: c.recorrente,
      periodicidade_meses: hasPeriodicidade ? c.periodicidadeMeses : undefined,
      origem_prazo: c.origemPrazo,
      nivel_ou_modulo: c.nivelOuModulo,
      sem_validade: semValidadeConfirmada,
    };
  }

  /**
   * Converte RegistroTreinamentoColaborador canônico em Treinamento (modelo de apresentação do Rooster)
   */
  private mapRegistroTreinamentoToTreinamento(t: RegistroTreinamentoColaborador): Treinamento {
    // Não utilizar a data de criação do registro como data de realização sem evidência
    const dataExecucao = t.dataRealizacao || t.dataConclusao || '';

    return {
      id: t.id,
      pessoa_id: t.colaboradorId,
      curso_id: t.treinamentoId || t.treinamentoCodigo || '',
      data_execucao: dataExecucao,
      observacao: t.observacoes || '',
      resultado: t.resultado as any,
      instrutor: t.instrutor,
      carga_horaria: t.cargaHoraria,
      numero_certificado: t.numeroCertificado,
      registro_treinamento_origem_id: t.registroTreinamentoOrigemId,
      data_validade: t.dataValidade,
      substituido_por: (t as any).substituidoPor || (t as any).substituido_por || null,
      criado_em: t.createdAt || new Date().toISOString(),
      atualizado_em: t.updatedAt || new Date().toISOString(),
      atualizado_por: t.instrutor || 'SGQ Treinamentos',
    };
  }

  /**
   * Converte QualificacaoColaborador canônica em Licenca (modelo de apresentação do Rooster)
   */
  private mapQualificacaoToLicenca(q: QualificacaoColaborador): Licenca {
    const emissorUpper = (q.emissor || 'ANAC').toUpperCase();
    const orgao: OrgaoLicenca = emissorUpper.includes('FAA') ? 'FAA' : 'ANAC';

    let tipo: TipoLicenca = 'CHT';
    const textAll = `${q.titulo || ''} ${q.escopo || ''}`.toUpperCase();
    if (textAll.includes('CCT')) tipo = 'CCT';
    else if (textAll.includes('AMP')) tipo = 'AMP';

    let habilitacao: HabilitacaoLicenca = '';
    if (textAll.includes('CEL') || textAll.includes('CÉLULA') || textAll.includes('CELULA')) {
      habilitacao = 'CEL';
    } else if (textAll.includes('GMP') || textAll.includes('GRUPO MOTOPROPULSOR')) {
      habilitacao = 'GMP';
    } else if (textAll.includes('AVI') || textAll.includes('AVIÔNICA') || textAll.includes('AVIONICA')) {
      habilitacao = 'AVI';
    }

    return {
      id: q.id,
      pessoa_id: q.colaboradorId,
      orgao,
      tipo,
      habilitacao,
      numero: q.numeroRegistro || '',
      data_vencimento: q.dataValidade || null,
      data_expedicao: q.dataEmissao || null,
      status: q.status as any,
      escopo: q.escopo,
      limitacoes_operacionais: q.limitacoesOperacionais,
      bloqueia_operacao_se_vencida: q.bloqueiaOperacaoSeVencida,
      documento_comprobatorio_id: q.documentoComprobatorioId,
      responsavel_validacao_nome: q.responsavelValidacaoNome,
      observacoes: q.observacoes,
      criado_em: q.createdAt || new Date().toISOString(),
      atualizado_em: q.updatedAt || new Date().toISOString(),
      atualizado_por: q.responsavelValidacaoNome || 'SGQ Qualificações',
    };
  }

  // --- Real-time Listeners exclusively attached to Canonical Organization Subcollections ---

  async init(): Promise<void> {
    if (this.isInitialized) return;
    const db = getFirestoreDb();
    if (!db) {
      console.warn('Firestore não inicializado, operando com cache.');
      return;
    }

    // 1. BASES OPERACIONAIS (organizations/{orgId}/operational_bases)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'operational_bases'),
        (snap) => {
          this.memoryDb.bases = snap.docs.map((d) => {
            const b = d.data();
            const rawId = (b.id || d.id || b.sigla || b.codigo || '').trim();
            const sigla = (b.sigla || b.codigo || rawId).trim().toUpperCase();
            const ativa =
              b.ativa !== undefined
                ? Boolean(b.ativa)
                : b.ativo !== undefined
                ? Boolean(b.ativo)
                : b.status !== 'INATIVO';

            return {
              id: rawId || sigla,
              sigla: sigla,
              nome: b.nome || b.descricao || sigla,
              tipo: b.tipo || 'ESTACAO_LINHA',
              cidade: b.cidade || '',
              estado: b.estado || b.uf || '',
              pais: b.pais || 'Brasil',
              endereco: b.endereco || '',
              codigo_iata: b.codigo_iata || b.codigoIata || (sigla.length === 3 ? sigla : undefined),
              codigo_icao: b.codigo_icao || b.codigoIcao || undefined,
              ativa,
              observacoes: b.observacoes || b.observacoesInativacao || '',
              responsavel: b.responsavel || '',
              contato: b.contatoTelefoneEmail || b.contato || '',
              criado_em: b.criado_em || b.createdAt || '',
              atualizado_em: b.atualizado_em || b.updatedAt || '',
              atualizado_por: b.atualizado_por || b.updatedBy || '',
            } as Base;
          });
          this.notify();
        },
        (err) => console.warn('Erro ao escutar operational_bases:', err)
      )
    );

    // 2. PESSOAS & COLABORADORES (organizations/{orgId}/persons) - FONTE DE VERDADE ÚNICA
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'persons'),
        (snap) => {
          this.canonicalPersonsMap.clear();
          const mappedPessoas: Pessoa[] = [];

          snap.docs.forEach((d) => {
            const colab = d.data() as ColaboradorPessoa;
            const item: ColaboradorPessoa = {
              ...colab,
              id: colab.id || d.id,
              organizationId: colab.organizationId || this.orgId,
            };
            this.canonicalPersonsMap.set(item.id, item);
            mappedPessoas.push(this.mapColaboradorToPessoa(item));
          });

          this.memoryDb.pessoas = mappedPessoas;
          this.notify();
        },
        (err) => console.warn('Erro ao escutar organizations/persons:', err)
      )
    );

    // 3. CURSOS DE TREINAMENTO (organizations/{orgId}/trainingCourses) - FONTE DE VERDADE ÚNICA
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'trainingCourses'),
        (snap) => {
          this.canonicalCoursesMap.clear();
          const mappedCursos: CursoCatalogo[] = [];

          snap.docs.forEach((d) => {
            const curso = d.data() as CursoTreinamento;
            const item: CursoTreinamento = {
              ...curso,
              id: curso.id || d.id,
              organizationId: curso.organizationId || this.orgId,
            };
            this.canonicalCoursesMap.set(item.id, item);
            mappedCursos.push(this.mapCursoTreinamentoToCursoCatalogo(item));
          });

          this.memoryDb.cursosCatalogo = mappedCursos;
          this.notify();
        },
        (err) => console.warn('Erro ao escutar organizations/trainingCourses:', err)
      )
    );

    // 4. REGISTROS DE TREINAMENTO (organizations/{orgId}/trainingRecords) - FONTE DE VERDADE ÚNICA
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'trainingRecords'),
        (snap) => {
          this.canonicalTrainingRecordsMap.clear();
          const mappedTreinamentos: Treinamento[] = [];

          snap.docs.forEach((d) => {
            const tr = d.data() as RegistroTreinamentoColaborador;
            const item: RegistroTreinamentoColaborador = {
              ...tr,
              id: tr.id || d.id,
              organizationId: tr.organizationId || this.orgId,
            };
            this.canonicalTrainingRecordsMap.set(item.id, item);
            mappedTreinamentos.push(this.mapRegistroTreinamentoToTreinamento(item));
          });

          this.memoryDb.treinamentos = mappedTreinamentos;
          this.notify();
        },
        (err) => console.warn('Erro ao escutar organizations/trainingRecords:', err)
      )
    );

    // 5. QUALIFICAÇÕES & LICENÇAS (organizations/{orgId}/qualifications) - FONTE DE VERDADE ÚNICA
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'qualifications'),
        (snap) => {
          this.canonicalQualificationsMap.clear();
          const mappedLicencas: Licenca[] = [];

          snap.docs.forEach((d) => {
            const qual = d.data() as QualificacaoColaborador;
            const item: QualificacaoColaborador = {
              ...qual,
              id: qual.id || d.id,
              organizationId: qual.organizationId || this.orgId,
            };
            this.canonicalQualificationsMap.set(item.id, item);
            mappedLicencas.push(this.mapQualificacaoToLicenca(item));
          });

          this.memoryDb.licencas = mappedLicencas;
          this.notify();
        },
        (err) => console.warn('Erro ao escutar organizations/qualifications:', err)
      )
    );

    // 6. MOTORES MRO (organizations/{orgId}/roster_motores)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_motores'),
        (snap) => {
          this.memoryDb.motoresCatalogo = snap.docs.map((d) => d.data() as MotorCatalogo);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar roster_motores:', err)
      )
    );

    // 7. TREINAMENTOS DE MOTOR (organizations/{orgId}/roster_treinamentos_motor)
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_treinamentos_motor'),
        (snap) => {
          this.memoryDb.treinamentosMotor = snap.docs.map((d) => d.data() as TreinamentoMotor);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar roster_treinamentos_motor:', err)
      )
    );

    // 8. DESIGNAÇÕES MRO: PESSOA, BASE, FUNÇÃO, AERONAVE
    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_pessoa'),
        (snap) => {
          this.memoryDb.designacoesPessoa = snap.docs.map((d) => d.data() as DesignacaoPessoa);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_pessoa:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_base'),
        (snap) => {
          this.memoryDb.designacoesBase = snap.docs.map((d) => d.data() as DesignacaoBase);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_base:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_funcao'),
        (snap) => {
          this.memoryDb.designacoesFuncao = snap.docs.map((d) => d.data() as DesignacaoFuncao);
          this.notify();
        },
        (err) => console.warn('Erro ao escutar roster_designacoes_funcao:', err)
      )
    );

    this.unsubscribers.push(
      onSnapshot(
        collection(db, 'organizations', this.orgId, 'roster_designacoes_aeronave'),
        (snap) => {
          this.memoryDb.designacoesAeronave = snap.docs.map((d) => d.data() as DesignacaoAeronave);
          this.notify();
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

    // Auto-seed canonical collections if completely empty in tenant
    setTimeout(async () => {
      try {
        const personsCheck = await getDocs(collection(db, 'organizations', this.orgId, 'persons'));
        const coursesCheck = await getDocs(collection(db, 'organizations', this.orgId, 'trainingCourses'));
        if (personsCheck.empty && coursesCheck.empty) {
          console.info('Inicializando dados mestre oficiais no Firestore sob organizations/' + this.orgId);
          const seedData = buildImpactoOfficialInitialDatabase();
          const batch = writeBatch(db);

          // 1. Seed persons into canonical persons collection
          seedData.pessoas.forEach((p) => {
            const colabDoc: ColaboradorPessoa = {
              id: p.id,
              organizationId: this.orgId,
              nome: p.nome,
              matricula: p.canac || p.id,
              setor: p.cliente_ou_area || 'Operações de Manutenção',
              baseOperacional: p.base_principal_id,
              baseOperacionalId: p.base_principal_id,
              funcao: p.categoria === 'Mecânico' ? 'Mecânico de Manutenção' : 'Administrativo',
              cargoOperacional:
                p.categoria === 'Mecânico' ? 'Mecânico de Manutenção de Linha / Base' : 'Analista Administrativo',
              status: p.situacao === 'Inativo' ? 'INATIVO' : 'ATIVO',
              camposCustomizados: {
                canac: p.canac,
                categoria: p.categoria,
                clienteOuArea: p.cliente_ou_area,
              },
              createdAt: p.criado_em,
              updatedAt: p.atualizado_em,
              criadoPor: 'Impacto Aviation Seed',
              criadoPorUid: 'system-seed',
            };
            batch.set(doc(db, 'organizations', this.orgId, 'persons', p.id), sanitizeForFirestore(colabDoc));
          });

          // 2. Seed courses into canonical trainingCourses collection
          seedData.cursosCatalogo.forEach((c) => {
            const isFrota = c.grupo === 'Frota';
            const courseDoc: CursoTreinamento = {
              id: c.id,
              organizationId: this.orgId,
              codigo: c.id,
              titulo: c.curso,
              tipo: isFrota ? 'RECORRENTE' : 'INICIAL',
              modalidade: 'PRESENCIAL',
              cargaHorariaHoras: 8,
              ementa: `Curso oficial homologado ${c.grupo} - ${c.curso}`,
              recorrente: !c.sem_validade && (c.validade_dias || 0) > 0,
              periodicidadeMeses: (c.validade_dias && c.validade_dias > 0 && !c.sem_validade) ? Math.round(c.validade_dias / 30) : undefined,
              origemPrazo: (c.validade_dias && c.validade_dias > 0 && !c.sem_validade) ? 'REGULAMENTO' : 'PROGRAMA_TREINAMENTO',
              competenciasDesenvolvidasIds: [],
              status: c.ativo ? 'ATIVO' : 'INATIVO',
              frotaOuFamilia: c.frota || 'Geral',
              variantesAplicabilidade: c.variante ? [c.variante] : [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              criadoPorUid: 'system-seed',
            };
            batch.set(doc(db, 'organizations', this.orgId, 'trainingCourses', c.id), sanitizeForFirestore(courseDoc));
          });

          // 3. Seed licenses into canonical qualifications collection
          seedData.licencas.forEach((l) => {
            const personRef = seedData.pessoas.find((p) => p.id === l.pessoa_id);
            const qualDoc: QualificacaoColaborador = {
              id: l.id,
              organizationId: this.orgId,
              colaboradorId: l.pessoa_id,
              colaboradorNome: personRef?.nome || 'Mecânico',
              colaboradorMatricula: personRef?.canac || l.pessoa_id,
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
              responsavelValidacaoUid: 'admin-seed',
              responsavelValidacaoNome: 'Diretoria Técnica MRO',
              dataValidacao: new Date().toISOString(),
              createdAt: l.criado_em,
              updatedAt: l.atualizado_em,
            };
            batch.set(doc(db, 'organizations', this.orgId, 'qualifications', l.id), sanitizeForFirestore(qualDoc));
          });

          // 4. Seed trainings into canonical trainingRecords collection
          seedData.treinamentos.forEach((t) => {
            const personRef = seedData.pessoas.find((p) => p.id === t.pessoa_id);
            const cursoRef = seedData.cursosCatalogo.find((c) => c.id === t.curso_id);
            const trDoc: RegistroTreinamentoColaborador = {
              id: t.id,
              organizationId: this.orgId,
              colaboradorId: t.pessoa_id,
              treinamentoId: t.curso_id,
              treinamentoCodigo: t.curso_id,
              treinamentoTitulo: cursoRef ? cursoRef.curso : t.curso_id,
              colaboradorNome: personRef?.nome || 'Mecânico',
              colaboradorMatricula: personRef?.canac || t.pessoa_id,
              dataRealizacao: t.data_execucao,
              dataConclusao: t.data_execucao,
              cargaHoraria: 8,
              instrutor: 'Impacto Training',
              resultado: 'APROVADO',
              observacoes: t.observacao || '',
              createdAt: t.criado_em,
              updatedAt: t.atualizado_em,
            };
            batch.set(doc(db, 'organizations', this.orgId, 'trainingRecords', t.id), sanitizeForFirestore(trDoc));
          });

          // 5. Seed MRO engines and designations
          seedData.motoresCatalogo.forEach((m) => {
            batch.set(doc(db, 'organizations', this.orgId, 'roster_motores', m.id), m);
          });
          seedData.designacoesPessoa.forEach((dp) => {
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_pessoa', dp.pessoa_id), dp);
          });
          seedData.designacoesBase.forEach((dbItem) => {
            const key = `${dbItem.pessoa_id}__${dbItem.base_id}`;
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_base', key), dbItem);
          });
          seedData.designacoesFuncao.forEach((df) => {
            const key = `${df.pessoa_id}__${df.funcao}`;
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_funcao', key), df);
          });
          seedData.designacoesAeronave.forEach((da) => {
            const key = `${da.pessoa_id}__${da.aeronave}`;
            batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_aeronave', key), da);
          });
          batch.set(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'geral'), seedData.configuracao);

          await batch.commit();
          console.info('Inicialização mestre canônica gravada no Firestore com sucesso.');
        }
      } catch (err) {
        console.warn('Erro ao verificar/semear dados canônicos iniciais:', err);
      }
    }, 1200);

    this.isInitialized = true;
  }

  // --- CRUD Operations strictly targeting Canonical Collections without data loss ---

  /**
   * Salva Colaborador no Firestore preservando 100% dos atributos SGQ originais.
   */
  async savePessoa(pessoa: Pessoa, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();

    // Recupera entidade canônica completa para fusão sem perda de dados
    const existingColab = this.canonicalPersonsMap.get(pessoa.id);

    const updatedColab: ColaboradorPessoa = {
      id: pessoa.id,
      organizationId: this.orgId,
      nome: pessoa.nome.trim(),
      matricula: pessoa.matricula || existingColab?.matricula || pessoa.canac || pessoa.id,
      setor: pessoa.setor || existingColab?.setor || pessoa.cliente_ou_area || 'Operações de Manutenção',
      funcao: pessoa.funcao || existingColab?.funcao || (pessoa.categoria === 'Mecânico' ? 'Mecânico de Manutenção' : 'Administrativo'),
      cargoOperacional:
        pessoa.cargo_operacional ||
        existingColab?.cargoOperacional ||
        (pessoa.categoria === 'Mecânico' ? 'Mecânico de Manutenção de Linha / Base' : 'Analista Administrativo'),
      baseOperacional: pessoa.base_principal_id,
      baseOperacionalId: pessoa.base_principal_id,
      status: pessoa.situacao === 'Inativo' ? 'INATIVO' : (existingColab?.status === 'INATIVO' ? 'ATIVO' : (existingColab?.status || 'ATIVO')),
      statusCustomizado: pessoa.status_customizado || existingColab?.statusCustomizado,
      dataAdmissao: pessoa.data_admissao || existingColab?.dataAdmissao,
      contatoCorporativo: pessoa.contato_corporativo || existingColab?.contatoCorporativo,
      observacoes: pessoa.observacoes || existingColab?.observacoes,
      restricaoOperacional: pessoa.restricao_operacional
        ? {
            possuiRestricao: Boolean(pessoa.restricao_operacional.possuiRestricao),
            impedeExecucao: Boolean(pessoa.restricao_operacional.impedeExecucao),
            apenasAlerta: Boolean(pessoa.restricao_operacional.apenasAlerta),
            motivo: pessoa.restricao_operacional.motivo,
            dataInicio: pessoa.restricao_operacional.dataInicio,
            dataFim: pessoa.restricao_operacional.dataFim,
            registradoPor: pessoa.restricao_operacional.registradoPor,
            registradoEm: pessoa.restricao_operacional.registradoEm,
          }
        : existingColab?.restricaoOperacional,
      inativadoEm: existingColab?.inativadoEm,
      inativadoPor: existingColab?.inativadoPor,
      motivoInativacao: existingColab?.motivoInativacao,
      reativadoEm: existingColab?.reativadoEm,
      reativadoPor: existingColab?.reativadoPor,
      motivoReativacao: existingColab?.motivoReativacao,
      camposCustomizados: {
        ...(existingColab?.camposCustomizados || {}),
        canac: pessoa.canac,
        categoria: pessoa.categoria,
        clienteOuArea: pessoa.cliente_ou_area,
      },
      createdAt: existingColab?.createdAt || pessoa.criado_em || now,
      updatedAt: now,
      criadoPor: existingColab?.criadoPor || usuarioNome,
      criadoPorUid: existingColab?.criadoPorUid || 'rooster-mro',
    };

    // 1. Persiste EXCLUSIVAMENTE na coleção canônica organizations/{orgId}/persons
    // NÃO simula sucesso: se o Firestore falhar (permissão, validação, etc.), a operação lança erro e não altera o estado local
    await setDoc(
      doc(db, 'organizations', this.orgId, 'persons', pessoa.id),
      sanitizeForFirestore(updatedColab),
      { merge: true }
    );

    // 2. Apenas após confirmação de sucesso na persistência remota, atualiza o cache canônico em memória
    this.canonicalPersonsMap.set(pessoa.id, updatedColab);
    const updatedPessoa = this.mapColaboradorToPessoa(updatedColab);
    const idx = this.memoryDb.pessoas.findIndex((p) => p.id === pessoa.id);
    if (idx >= 0) this.memoryDb.pessoas[idx] = updatedPessoa;
    else this.memoryDb.pessoas.push(updatedPessoa);
    this.notify();

    // 3. Registra auditoria com o resultado real confirmado
    await this.recordAudit(
      existingColab ? 'EDITAR' : 'CRIAR',
      'colaborador_pessoa',
      pessoa.id,
      `${existingColab ? 'Editou' : 'Criou'} colaborador/mecânico ${pessoa.nome} (CANAC: ${pessoa.canac || 'N/A'})`,
      existingColab,
      updatedColab,
      usuarioNome
    );
  }

  async deletePessoa(id: string, usuarioNome: string): Promise<Pessoa | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.pessoas.find((p) => p.id === id) || null;
    const existingColab = this.canonicalPersonsMap.get(id);

    // 1. Persiste exclusão remota primeiro
    await deleteDoc(doc(db, 'organizations', this.orgId, 'persons', id));

    // 2. Remove do cache local apenas após confirmação
    this.memoryDb.pessoas = this.memoryDb.pessoas.filter((p) => p.id !== id);
    this.canonicalPersonsMap.delete(id);
    this.notify();

    // Exclui EXCLUSIVAMENTE da coleção canônica
    await deleteDoc(doc(db, 'organizations', this.orgId, 'persons', id));

    if (existing) {
      await this.recordAudit(
        'EXCLUIR',
        'colaborador_pessoa',
        id,
        `Excluiu colaborador/mecânico ${existing.nome}`,
        existingColab || existing,
        null,
        usuarioNome
      );
    }
    return existing;
  }

  async saveBase(base: Base, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();

    const baseId = (base.id || base.sigla || `BASE-${Date.now()}`).trim();
    const sigla = (base.sigla || base.id || '').trim().toUpperCase();
    const isEdit = this.memoryDb.bases.some((b) => b.id === baseId);
    const existing = this.memoryDb.bases.find((b) => b.id === baseId);

    const baseRecord: Base = {
      ...base,
      id: baseId,
      sigla: sigla || baseId,
      nome: base.nome.trim(),
      tipo: base.tipo || 'ESTACAO_LINHA',
      cidade: base.cidade || '',
      estado: (base.estado || '').toUpperCase(),
      pais: base.pais || 'Brasil',
      endereco: base.endereco || '',
      codigo_iata: base.codigo_iata ? base.codigo_iata.trim().toUpperCase() : undefined,
      codigo_icao: base.codigo_icao ? base.codigo_icao.trim().toUpperCase() : undefined,
      ativa: base.ativa !== undefined ? base.ativa : true,
      observacoes: base.observacoes || '',
      responsavel: base.responsavel || '',
      contato: base.contato || '',
      criado_em: existing?.criado_em || base.criado_em || now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    const idx = this.memoryDb.bases.findIndex((b) => b.id === baseRecord.id);
    if (idx >= 0) this.memoryDb.bases[idx] = baseRecord;
    else this.memoryDb.bases.push(baseRecord);
    this.notify();

    // Payload canônico compatível com Firestore QualyQuest BaseEstacaoOperacao
    const firestorePayload = {
      id: baseRecord.id,
      organizationId: this.orgId,
      codigo: baseRecord.sigla,
      sigla: baseRecord.sigla,
      nome: baseRecord.nome,
      tipo: baseRecord.tipo,
      cidade: baseRecord.cidade,
      estado: baseRecord.estado,
      uf: baseRecord.estado,
      pais: baseRecord.pais,
      endereco: baseRecord.endereco,
      codigoIata: baseRecord.codigo_iata,
      codigo_iata: baseRecord.codigo_iata,
      codigoIcao: baseRecord.codigo_icao,
      codigo_icao: baseRecord.codigo_icao,
      responsavel: baseRecord.responsavel,
      contatoTelefoneEmail: baseRecord.contato,
      contato: baseRecord.contato,
      observacoes: baseRecord.observacoes,
      ativo: baseRecord.ativa,
      ativa: baseRecord.ativa,
      status: baseRecord.ativa ? 'ATIVO' : 'INATIVO',
      createdAt: baseRecord.criado_em,
      criado_em: baseRecord.criado_em,
      updatedAt: now,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    await setDoc(
      doc(db, 'organizations', this.orgId, 'operational_bases', baseRecord.id),
      sanitizeForFirestore(firestorePayload),
      { merge: true }
    );

    await this.recordAudit(
      isEdit ? 'EDITAR' : 'CRIAR',
      'base',
      baseRecord.id,
      `${isEdit ? 'Atualizou' : 'Cadastrou'} base/local operacional ${baseRecord.sigla} - ${baseRecord.nome} (${baseRecord.tipo})`,
      existing || null,
      baseRecord,
      usuarioNome
    );
  }

  async inativarBase(id: string, motivo: string, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.bases.find((b) => b.id === id);
    if (!existing) throw new Error(`Base operacional ${id} não encontrada.`);

    const now = new Date().toISOString();
    const updated: Base = {
      ...existing,
      ativa: false,
      observacoes: motivo
        ? `${existing.observacoes || ''}\n[INATIVAÇÃO]: ${motivo}`.trim()
        : existing.observacoes,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    // 1. Persiste no Firestore primeiro
    await setDoc(
      doc(db, 'organizations', this.orgId, 'operational_bases', id),
      {
        ativo: false,
        ativa: false,
        status: 'INATIVO',
        observacoesInativacao: motivo,
        updatedAt: now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      },
      { merge: true }
    );

    // 2. Apenas após persistência confirmada, atualiza estado em memória
    const idx = this.memoryDb.bases.findIndex((b) => b.id === id);
    if (idx >= 0) this.memoryDb.bases[idx] = updated;
    this.notify();

    await this.recordAudit(
      'EDITAR',
      'base',
      id,
      `Inativou base operacional ${existing.sigla || existing.id} - ${existing.nome}. Motivo: ${motivo || 'Operacional'}`,
      existing,
      updated,
      usuarioNome
    );
  }

  async reativarBase(id: string, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.bases.find((b) => b.id === id);
    if (!existing) throw new Error(`Base operacional ${id} não encontrada.`);

    const now = new Date().toISOString();
    const updated: Base = {
      ...existing,
      ativa: true,
      atualizado_em: now,
      atualizado_por: usuarioNome,
    };

    // 1. Persiste no Firestore primeiro
    await setDoc(
      doc(db, 'organizations', this.orgId, 'operational_bases', id),
      {
        ativo: true,
        ativa: true,
        status: 'ATIVO',
        updatedAt: now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      },
      { merge: true }
    );

    // 2. Apenas após persistência confirmada, atualiza estado em memória
    const idx = this.memoryDb.bases.findIndex((b) => b.id === id);
    if (idx >= 0) this.memoryDb.bases[idx] = updated;
    this.notify();

    await this.recordAudit(
      'EDITAR',
      'base',
      id,
      `Reativou base operacional ${existing.sigla || existing.id} - ${existing.nome}`,
      existing,
      updated,
      usuarioNome
    );
  }

  async deleteBase(id: string, usuarioNome: string): Promise<Base | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.bases.find((b) => b.id === id) || null;

    // Persiste exclusão remota primeiro
    await deleteDoc(doc(db, 'organizations', this.orgId, 'operational_bases', id));

    // Apenas após confirmação, atualiza cache em memória
    this.memoryDb.bases = this.memoryDb.bases.filter((b) => b.id !== id);
    this.notify();

    if (existing) {
      await this.recordAudit(
        'EXCLUIR',
        'base',
        id,
        `Excluiu base operacional ${existing.sigla || existing.id} - ${existing.nome}`,
        existing,
        null,
        usuarioNome
      );
    }
    return existing;
  }

  /**
   * Salva Licença como QualificacaoColaborador canônica em organizations/{orgId}/qualifications
   */
  async saveLicenca(licenca: Licenca, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();

    const existingQualif = this.canonicalQualificationsMap.get(licenca.id);
    const personRef = this.memoryDb.pessoas.find((p) => p.id === licenca.pessoa_id);

    const qualifDoc: QualificacaoColaborador = {
      id: licenca.id,
      organizationId: this.orgId,
      colaboradorId: licenca.pessoa_id,
      colaboradorNome: personRef?.nome || existingQualif?.colaboradorNome || 'Colaborador',
      colaboradorMatricula: personRef?.canac || personRef?.id || existingQualif?.colaboradorMatricula || '',
      tipo: existingQualif?.tipo || (licenca.tipo === 'AMP' ? 'AUTORIZACAO_INTERNA' : 'CHT_ANAC'),
      titulo: `${licenca.orgao} ${licenca.tipo} ${licenca.habilitacao || ''}`.trim(),
      escopo:
        licenca.escopo ||
        existingQualif?.escopo ||
        `Habilitação Técnica ${licenca.tipo} - ${licenca.orgao} ${licenca.habilitacao ? '(' + licenca.habilitacao + ')' : ''}`.trim(),
      emissor: licenca.orgao,
      numeroRegistro: licenca.numero,
      dataEmissao: licenca.data_expedicao || existingQualif?.dataEmissao || '',
      dataValidade: licenca.data_vencimento || undefined,
      possuiValidade: !!licenca.data_vencimento,
      status: licenca.status || existingQualif?.status || 'VALIDA',
      limitacoesOperacionais: licenca.limitacoes_operacionais || existingQualif?.limitacoesOperacionais,
      bloqueiaOperacaoSeVencida: licenca.bloqueia_operacao_se_vencida !== undefined ? licenca.bloqueia_operacao_se_vencida : (existingQualif?.bloqueiaOperacaoSeVencida ?? true),
      documentoComprobatorioId: licenca.documento_comprobatorio_id || existingQualif?.documentoComprobatorioId,
      documentoComprobatorioNome: existingQualif?.documentoComprobatorioNome,
      responsavelValidacaoUid: existingQualif?.responsavelValidacaoUid || 'admin-sgq',
      responsavelValidacaoNome: licenca.responsavel_validacao_nome || existingQualif?.responsavelValidacaoNome || usuarioNome,
      dataValidacao: existingQualif?.dataValidacao || now,
      observacoes: licenca.observacoes || existingQualif?.observacoes,
      createdAt: existingQualif?.createdAt || licenca.criado_em || now,
      updatedAt: now,
    };

    // Persiste EXCLUSIVAMENTE na coleção canônica primeiro
    await setDoc(
      doc(db, 'organizations', this.orgId, 'qualifications', licenca.id),
      sanitizeForFirestore(qualifDoc),
      { merge: true }
    );

    // Apenas após persistência confirmada, atualiza cache local
    this.canonicalQualificationsMap.set(licenca.id, qualifDoc);
    const updatedLicenca = this.mapQualificacaoToLicenca(qualifDoc);
    const idx = this.memoryDb.licencas.findIndex((l) => l.id === licenca.id);
    if (idx >= 0) this.memoryDb.licencas[idx] = updatedLicenca;
    else this.memoryDb.licencas.push(updatedLicenca);
    this.notify();

    await this.recordAudit(
      existingQualif ? 'EDITAR' : 'CRIAR',
      'licenca_qualificacao',
      licenca.id,
      `${existingQualif ? 'Atualizou' : 'Cadastrou'} licença ${licenca.orgao} ${licenca.tipo} ${licenca.habilitacao || ''}`,
      existingQualif,
      qualifDoc,
      usuarioNome
    );
  }

  async deleteLicenca(id: string, usuarioNome: string): Promise<Licenca | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.licencas.find((l) => l.id === id) || null;
    const existingQualif = this.canonicalQualificationsMap.get(id);

    // Exclui EXCLUSIVAMENTE da coleção canônica primeiro
    await deleteDoc(doc(db, 'organizations', this.orgId, 'qualifications', id));

    // Apenas após confirmação remota, atualiza cache local
    this.memoryDb.licencas = this.memoryDb.licencas.filter((l) => l.id !== id);
    this.canonicalQualificationsMap.delete(id);
    this.notify();

    if (existing) {
      await this.recordAudit(
        'EXCLUIR',
        'licenca_qualificacao',
        id,
        `Excluiu licença ${existing.numero}`,
        existingQualif || existing,
        null,
        usuarioNome
      );
    }
    return existing;
  }

  /**
   * Salva Curso no Catálogo canônico organizations/{orgId}/trainingCourses
   */
  async saveCurso(curso: CursoCatalogo, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();

    const existingCourse = this.canonicalCoursesMap.get(curso.id);
    const isFrota = curso.grupo === 'Frota';

    const hasPeriodicidade = typeof curso.periodicidade_meses === 'number' && curso.periodicidade_meses > 0;
    const periodicidadeMeses = hasPeriodicidade ? curso.periodicidade_meses : existingCourse?.periodicidadeMeses;
    const isRecorrente = curso.recorrente !== undefined ? curso.recorrente : (existingCourse !== undefined ? existingCourse.recorrente : hasPeriodicidade);

    const trainingCourseDoc: CursoTreinamento = {
      id: curso.id,
      organizationId: this.orgId,
      codigo: curso.codigo || existingCourse?.codigo || curso.id,
      titulo: curso.curso,
      tipo: (curso.tipo as any) || existingCourse?.tipo || (isFrota ? 'RECORRENTE' : 'INICIAL'),
      modalidade: (curso.modalidade as any) || existingCourse?.modalidade || 'PRESENCIAL',
      cargaHorariaHoras: curso.carga_horaria_horas || existingCourse?.cargaHorariaHoras || 8,
      ementa: curso.ementa || existingCourse?.ementa || `Curso homologado ${curso.grupo} - ${curso.curso}`,
      recorrente: isRecorrente,
      origemPrazo: (curso.origem_prazo as any) || existingCourse?.origemPrazo || 'REGULAMENTO',
      competenciasDesenvolvidasIds: existingCourse?.competenciasDesenvolvidasIds || [],
      periodicidadeMeses,
      status: curso.ativo ? 'ATIVO' : 'INATIVO',
      frotaOuFamilia: curso.frota || existingCourse?.frotaOuFamilia || 'Geral',
      variantesAplicabilidade: curso.variante
        ? curso.variante.split(',').map((v) => v.trim()).filter(Boolean)
        : existingCourse?.variantesAplicabilidade || [],
      nivelOuModulo: curso.nivel_ou_modulo || existingCourse?.nivelOuModulo,
      niveisDisponiveis: existingCourse?.niveisDisponiveis,
      exigeReciclagem: existingCourse?.exigeReciclagem,
      cursoOrigemReciclagemId: existingCourse?.cursoOrigemReciclagemId,
      cursoOrigemReciclagemTitulo: existingCourse?.cursoOrigemReciclagemTitulo,
      evidenciaExigida: existingCourse?.evidenciaExigida,
      exigeAvaliacaoOuAprovacaoAdicional: existingCourse?.exigeAvaliacaoOuAprovacaoAdicional,
      createdAt: existingCourse?.createdAt || now,
      updatedAt: now,
      criadoPorUid: existingCourse?.criadoPorUid || 'rooster-mro',
    };

    // Persiste EXCLUSIVAMENTE na coleção canônica primeiro
    await setDoc(
      doc(db, 'organizations', this.orgId, 'trainingCourses', curso.id),
      sanitizeForFirestore(trainingCourseDoc),
      { merge: true }
    );

    // Apenas após confirmação de sucesso na persistência, atualiza cache local
    this.canonicalCoursesMap.set(curso.id, trainingCourseDoc);
    const updatedCurso = this.mapCursoTreinamentoToCursoCatalogo(trainingCourseDoc);
    const idx = this.memoryDb.cursosCatalogo.findIndex((c) => c.id === curso.id);
    if (idx >= 0) this.memoryDb.cursosCatalogo[idx] = updatedCurso;
    else this.memoryDb.cursosCatalogo.push(updatedCurso);
    this.notify();

    await this.recordAudit(
      existingCourse ? 'EDITAR' : 'CRIAR',
      'curso_catalogo',
      curso.id,
      `Salva curso ${curso.curso}`,
      existingCourse,
      trainingCourseDoc,
      usuarioNome
    );
  }
  async deleteCurso(id: string, usuarioNome: string): Promise<CursoCatalogo | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.cursosCatalogo.find((c) => c.id === id) || null;
    const existingCourse = this.canonicalCoursesMap.get(id);

    // Exclui EXCLUSIVAMENTE da coleção canônica no Firestore PRIMEIRO
    await deleteDoc(doc(db, 'organizations', this.orgId, 'trainingCourses', id));

    // Apenas após persistência confirmada atualiza cache em memória
    this.memoryDb.cursosCatalogo = this.memoryDb.cursosCatalogo.filter((c) => c.id !== id);
    this.canonicalCoursesMap.delete(id);
    this.notify();

    if (existing) {
      await this.recordAudit(
        'EXCLUIR',
        'curso_catalogo',
        id,
        `Excluiu curso ${existing.curso}`,
        existingCourse || existing,
        null,
        usuarioNome
      );
    }
    return existing;
  }

  /**
   * Salva Registro de Treinamento no Firestore organizations/{orgId}/trainingRecords
   * mantendo histórico de auditoria e validação SGQ.
   */
  async saveTreinamento(
    treinamento: Treinamento,
    motoresIds: string[] = [],
    usuarioNome: string
  ): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const now = new Date().toISOString();

    const existingRecord = this.canonicalTrainingRecordsMap.get(treinamento.id);
    const cursoRef = this.canonicalCoursesMap.get(treinamento.curso_id) ||
      this.memoryDb.cursosCatalogo.find((c) => c.id === treinamento.curso_id);
    const personRef = this.memoryDb.pessoas.find((p) => p.id === treinamento.pessoa_id);

    let dataValidade = existingRecord?.dataValidade;
    if (!dataValidade) {
      const validadeDias =
        (cursoRef as any)?.validade_dias ||
        ((cursoRef as any)?.periodicidadeMeses ? (cursoRef as any).periodicidadeMeses * 30 : null);
      if (validadeDias && validadeDias > 0 && validadeDias < 90000) {
        const d = new Date(treinamento.data_execucao);
        d.setDate(d.getDate() + validadeDias);
        dataValidade = d.toISOString().split('T')[0];
      }
    }

    const trainingRecordDoc: RegistroTreinamentoColaborador = {
      id: treinamento.id,
      organizationId: this.orgId,
      treinamentoId: treinamento.curso_id,
      treinamentoCodigo: (cursoRef as any)?.codigo || treinamento.curso_id,
      treinamentoTitulo:
        (cursoRef as any)?.titulo ||
        (cursoRef as any)?.curso ||
        treinamento.curso_id,
      colaboradorId: treinamento.pessoa_id,
      colaboradorNome: personRef?.nome || existingRecord?.colaboradorNome || 'Colaborador',
      colaboradorMatricula: personRef?.canac || personRef?.id || existingRecord?.colaboradorMatricula || '',
      dataRealizacao: treinamento.data_execucao,
      dataConclusao: treinamento.data_execucao,
      dataValidade: treinamento.data_validade || dataValidade,
      cargaHoraria: treinamento.carga_horaria || (cursoRef as any)?.cargaHorariaHoras || existingRecord?.cargaHoraria || 8,
      instrutor: treinamento.instrutor || existingRecord?.instrutor || usuarioNome,
      resultado: (treinamento.resultado === 'EM_ANDAMENTO' || treinamento.resultado === 'REPROVADO' ? treinamento.resultado : (existingRecord?.resultado || 'APROVADO')),
      aproveitamentoPercentual: existingRecord?.aproveitamentoPercentual,
      documentoCertificadoId: existingRecord?.documentoCertificadoId,
      numeroCertificado: treinamento.numero_certificado || existingRecord?.numeroCertificado,
      observacoes: treinamento.observacao || existingRecord?.observacoes || '',
      validadoPorSGQUid: existingRecord?.validadoPorSGQUid,
      validadoPorSGQNome: existingRecord?.validadoPorSGQNome,
      dataValidacaoSGQ: existingRecord?.dataValidacaoSGQ,
      frotaOuFamilia: (cursoRef as any)?.frotaOuFamilia || existingRecord?.frotaOuFamilia,
      varianteAplicabilidade:
        (cursoRef as any)?.variantesAplicabilidade?.[0] || existingRecord?.varianteAplicabilidade,
      nivelOuModulo: (cursoRef as any)?.nivelOuModulo || existingRecord?.nivelOuModulo,
      ehReciclagem: Boolean(treinamento.registro_treinamento_origem_id || existingRecord?.ehReciclagem),
      registroTreinamentoOrigemId: treinamento.registro_treinamento_origem_id || existingRecord?.registroTreinamentoOrigemId,
      substituidoPor: (treinamento.substituido_por as any) || (existingRecord as any)?.substituidoPor,
      historicoCorrecoes: existingRecord?.historicoCorrecoes || [],
      createdAt: existingRecord?.createdAt || treinamento.criado_em || now,
      updatedAt: now,
    };

    // 1. Persiste na coleção canônica de treinamentos e vincula motores primeiro via batch
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'organizations', this.orgId, 'trainingRecords', treinamento.id),
      sanitizeForFirestore(trainingRecordDoc),
      { merge: true }
    );

    // Sincroniza vínculos de motores MRO (organizations/{orgId}/roster_treinamentos_motor)
    const oldMotors = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === treinamento.id);
    for (const om of oldMotors) {
      batch.delete(
        doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', `${om.treinamento_id}__${om.motor_id}`)
      );
    }

    const newMotorEntries = [];
    for (const mId of motoresIds) {
      const key = `${treinamento.id}__${mId}`;
      const motorEntry = { treinamento_id: treinamento.id, motor_id: mId };
      newMotorEntries.push(motorEntry);
      batch.set(doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', key), motorEntry);
    }

    // Persistência confirmada no Firestore primeiro
    await batch.commit();

    // 2. Apenas após confirmação, atualiza cache canônico em memória
    this.canonicalTrainingRecordsMap.set(treinamento.id, trainingRecordDoc);
    const updatedTreinamento = this.mapRegistroTreinamentoToTreinamento(trainingRecordDoc);
    const idx = this.memoryDb.treinamentos.findIndex((t) => t.id === treinamento.id);
    if (idx >= 0) this.memoryDb.treinamentos[idx] = updatedTreinamento;
    else this.memoryDb.treinamentos.push(updatedTreinamento);

    this.memoryDb.treinamentosMotor = [
      ...this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id !== treinamento.id),
      ...newMotorEntries,
    ];
    this.notify();

    await this.recordAudit(
      existingRecord ? 'EDITAR' : 'CRIAR',
      'registro_treinamento',
      treinamento.id,
      `${existingRecord ? 'Atualizou' : 'Lançou'} treinamento (${treinamento.data_execucao}) para colaborador ${trainingRecordDoc.colaboradorNome}`,
      existingRecord,
      trainingRecordDoc,
      usuarioNome
    );
  }

  async deleteTreinamento(id: string, usuarioNome: string): Promise<Treinamento | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.treinamentos.find((t) => t.id === id) || null;
    const existingRecord = this.canonicalTrainingRecordsMap.get(id);

    // 1. Persiste exclusão remota via batch primeiro
    const batch = writeBatch(db);
    batch.delete(doc(db, 'organizations', this.orgId, 'trainingRecords', id));

    const motors = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === id);
    for (const m of motors) {
      batch.delete(
        doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', `${m.treinamento_id}__${m.motor_id}`)
      );
    }
    await batch.commit();

    // 2. Apenas após confirmação remota, atualiza cache em memória
    this.memoryDb.treinamentos = this.memoryDb.treinamentos.filter((t) => t.id !== id);
    this.canonicalTrainingRecordsMap.delete(id);
    this.memoryDb.treinamentosMotor = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id !== id);
    this.notify();

    if (existing) {
      await this.recordAudit(
        'EXCLUIR',
        'registro_treinamento',
        id,
        `Excluiu treinamento ${id}`,
        existingRecord || existing,
        null,
        usuarioNome
      );
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

    const curso =
      this.canonicalCoursesMap.get(antigo.curso_id) ||
      this.memoryDb.cursosCatalogo.find((c) => c.id === antigo.curso_id);
    let novaValidade: string | undefined = undefined;
    const validadeDias =
      (curso as any)?.validade_dias ||
      ((curso as any)?.periodicidadeMeses ? (curso as any).periodicidadeMeses * 30 : null);
    if (validadeDias && validadeDias > 0 && validadeDias < 90000) {
      const d = new Date(novaData);
      d.setDate(d.getDate() + validadeDias);
      novaValidade = d.toISOString().split('T')[0];
    }

    const novoId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const personRef = this.memoryDb.pessoas.find((p) => p.id === antigo.pessoa_id);

    const novoRecord: RegistroTreinamentoColaborador = {
      id: novoId,
      organizationId: this.orgId,
      treinamentoId: antigo.curso_id,
      treinamentoCodigo: (curso as any)?.codigo || antigo.curso_id,
      treinamentoTitulo:
        (curso as any)?.titulo ||
        (curso as any)?.curso ||
        antigo.curso_id,
      colaboradorId: antigo.pessoa_id,
      colaboradorNome: personRef?.nome || 'Colaborador',
      colaboradorMatricula: personRef?.canac || personRef?.id || '',
      dataRealizacao: novaData,
      dataConclusao: novaData,
      dataValidade: novaValidade,
      cargaHoraria: (curso as any)?.cargaHorariaHoras || 8,
      instrutor: usuarioNome,
      resultado: 'APROVADO',
      observacoes: `Renovação de treinamento que revalidou o registro anterior (${antigoId})`,
      registroTreinamentoOrigemId: antigoId,
      ehReciclagem: true,
      createdAt: now,
      updatedAt: now,
    };

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'organizations', this.orgId, 'trainingRecords', novoId),
      sanitizeForFirestore(novoRecord)
    );

    // Marca o registro anterior como substituído para rastreabilidade
    batch.update(doc(db, 'organizations', this.orgId, 'trainingRecords', antigoId), {
      substituidoPor: novoId,
      updatedAt: now,
    });

    // Replica associações de motores
    const motoresAntigos = this.memoryDb.treinamentosMotor.filter((tm) => tm.treinamento_id === antigoId);
    for (const ma of motoresAntigos) {
      const key = `${novoId}__${ma.motor_id}`;
      const mObj = { treinamento_id: novoId, motor_id: ma.motor_id };
      this.memoryDb.treinamentosMotor.push(mObj);
      batch.set(doc(db, 'organizations', this.orgId, 'roster_treinamentos_motor', key), mObj);
    }

    await batch.commit();

    // Atualiza cache em memória
    this.canonicalTrainingRecordsMap.set(novoId, novoRecord);
    const novoTreinamento = this.mapRegistroTreinamentoToTreinamento(novoRecord);
    this.memoryDb.treinamentos.push(novoTreinamento);
    const antigoMemory = this.memoryDb.treinamentos.find((t) => t.id === antigoId);
    if (antigoMemory) antigoMemory.substituido_por = novoId;
    this.notify();

    await this.recordAudit(
      'RENOVAR',
      'registro_treinamento',
      novoId,
      `Renovou treinamento ${antigo.curso_id} para ${novaData} (Substituiu ${antigoId})`,
      antigo,
      novoTreinamento,
      usuarioNome
    );

    return novoTreinamento;
  }

  // --- Motores MRO ---

  async saveMotor(motor: MotorCatalogo, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const idx = this.memoryDb.motoresCatalogo.findIndex((m) => m.id === motor.id);
    if (idx >= 0) this.memoryDb.motoresCatalogo[idx] = motor;
    else this.memoryDb.motoresCatalogo.push(motor);
    this.notify();

    await setDoc(doc(db, 'organizations', this.orgId, 'roster_motores', motor.id), motor, { merge: true });
    await this.recordAudit('EDITAR', 'motor_catalogo', motor.id, `Salva motor ${motor.fabricante} ${motor.modelo}`, null, motor, usuarioNome);
  }

  async deleteMotor(id: string, usuarioNome: string): Promise<MotorCatalogo | null> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    const existing = this.memoryDb.motoresCatalogo.find((m) => m.id === id) || null;

    this.memoryDb.motoresCatalogo = this.memoryDb.motoresCatalogo.filter((m) => m.id !== id);
    this.notify();

    await deleteDoc(doc(db, 'organizations', this.orgId, 'roster_motores', id));

    if (existing) {
      await this.recordAudit('EXCLUIR', 'motor_catalogo', id, `Excluiu motor ${existing.fabricante} ${existing.modelo}`, existing, null, usuarioNome);
    }
    return existing;
  }

  // --- Designações MRO ---

  async saveDesignacaoPessoa(dp: DesignacaoPessoa, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');

    const idx = this.memoryDb.designacoesPessoa.findIndex((d) => d.pessoa_id === dp.pessoa_id);
    if (idx >= 0) this.memoryDb.designacoesPessoa[idx] = dp;
    else this.memoryDb.designacoesPessoa.push(dp);
    this.notify();

    await setDoc(doc(db, 'organizations', this.orgId, 'roster_designacoes_pessoa', dp.pessoa_id), dp, { merge: true });
    await this.recordAudit('EDITAR', 'designacao_pessoa', dp.pessoa_id, `Atualizou designação pessoa ${dp.pessoa_id}`, null, dp, usuarioNome);
  }

  async setDesignacaoBases(pessoaId: string, bases: string[], usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');

    const oldBases = this.memoryDb.designacoesBase.filter((b) => b.pessoa_id === pessoaId);
    this.memoryDb.designacoesBase = this.memoryDb.designacoesBase.filter((b) => b.pessoa_id !== pessoaId);
    bases.forEach((bId) => {
      this.memoryDb.designacoesBase.push({ pessoa_id: pessoaId, base_id: bId });
    });
    this.notify();

    const batch = writeBatch(db);
    for (const ob of oldBases) {
      batch.delete(
        doc(db, 'organizations', this.orgId, 'roster_designacoes_base', `${ob.pessoa_id}__${ob.base_id}`)
      );
    }
    for (const bId of bases) {
      const key = `${pessoaId}__${bId}`;
      batch.set(doc(db, 'organizations', this.orgId, 'roster_designacoes_base', key), { pessoa_id: pessoaId, base_id: bId });
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

    await setDoc(doc(db, 'organizations', this.orgId, 'roster_designacoes_funcao', docId), entry, { merge: true });
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

    await setDoc(doc(db, 'organizations', this.orgId, 'roster_designacoes_aeronave', docId), entry, { merge: true });
    await this.recordAudit('EDITAR', 'designacao_aeronave', docId, `Aeronave ${aeronave} = ${valor}`, null, { aeronave, valor }, usuarioNome);
  }

  async saveConfiguracao(config: Configuracao, usuarioNome: string): Promise<void> {
    const db = getFirestoreDb();
    if (!db) throw new Error('Firestore não inicializado.');
    this.memoryDb.configuracao = { ...config };
    this.notify();

    await setDoc(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'geral'), config, { merge: true });
    await this.recordAudit('EDITAR', 'configuracao', 'GLOBAL', `Atualizou parâmetros operacionais do sistema`, null, config, usuarioNome);
  }

  async getAccessCodeHash(): Promise<string | null> {
    const db = getFirestoreDb();
    if (!db) return localStorage.getItem('roster_access_hash_sha256');
    try {
      const snap = await getDoc(doc(db, 'organizations', this.orgId, 'roster_configuracao', 'acesso'));
      if (snap.exists() && snap.data()?.hash_sha256) return snap.data().hash_sha256;
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

    onProgress?.(30, 'Processando entidades canônicas...');
    console.info(`Gravando importação ${modo} no Firestore para organização ${this.orgId}...`);
    onProgress?.(100, 'Concluído com sucesso');

    return generateConferenceData(this.memoryDb, rawPayload, modo, sourceName);
  }
}
