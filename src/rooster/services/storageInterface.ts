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
} from '../types';
import type { DatabaseState, PostImportConferenceData, RawImportPayload } from './storage';

export interface StorageAdapter {
  readonly isCloud: boolean;
  readonly isOffline: boolean;

  init(): Promise<void>;
  getDatabase(): DatabaseState;
  setOrganizationId?(orgId: string): void;

  // Person CRUD
  savePessoa(pessoa: Pessoa, usuarioNome: string): Promise<void>;
  deletePessoa(id: string, usuarioNome: string): Promise<Pessoa | null>;

  // Base CRUD
  saveBase(base: Base, usuarioNome: string): Promise<void>;

  // License CRUD
  saveLicenca(licenca: Licenca, usuarioNome: string): Promise<void>;
  deleteLicenca(id: string, usuarioNome: string): Promise<Licenca | null>;

  // Course Catalog CRUD
  saveCurso(curso: CursoCatalogo, usuarioNome: string): Promise<void>;
  deleteCurso(id: string, usuarioNome: string): Promise<CursoCatalogo | null>;

  // Training CRUD & Renewal
  saveTreinamento(treinamento: Treinamento, motoresIds: string[], usuarioNome: string): Promise<void>;
  deleteTreinamento(id: string, usuarioNome: string): Promise<Treinamento | null>;
  renovarTreinamento(antigoId: string, novaData: string, usuarioNome: string): Promise<Treinamento | null>;

  // Engines Catalog CRUD
  saveMotor(motor: MotorCatalogo, usuarioNome: string): Promise<void>;
  deleteMotor(id: string, usuarioNome: string): Promise<MotorCatalogo | null>;

  // Designation methods
  saveDesignacaoPessoa(dp: DesignacaoPessoa, usuarioNome: string): Promise<void>;
  setDesignacaoBases(pessoaId: string, bases: string[], usuarioNome: string): Promise<void>;
  setDesignacaoFuncao(
    pessoaId: string,
    funcao: FuncaoDesignacao,
    valor: SimNaoVazio,
    usuarioNome: string
  ): Promise<void>;
  setDesignacaoAeronave(
    pessoaId: string,
    aeronave: AeronaveDesignacao,
    valor: SimNaoVazio,
    usuarioNome: string
  ): Promise<void>;

  // Configuration & Security
  saveConfiguracao(config: Configuracao, usuarioNome: string): Promise<void>;
  getAccessCodeHash(): Promise<string | null>;
  setAccessCodeHash(hash: string): Promise<void>;

  // Audit
  recordAudit(
    acao: Auditoria['acao'],
    tabela: string,
    registro_id: string,
    detalhes: string,
    dados_antes?: any,
    dados_depois?: any,
    usuarioNome?: string
  ): Promise<void>;

  // Batch Import
  importBatch(
    payload: RawImportPayload,
    mode: 'substituir' | 'mesclar',
    usuarioNome: string,
    sourceName?: string,
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<PostImportConferenceData>;

  // Local to Cloud Migration
  migrateLocalToCloud?(
    localData: DatabaseState,
    usuarioNome: string,
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<{ totalMigrados: number }>;

  // Real-time subscription
  subscribe(listener: () => void): () => void;
}
