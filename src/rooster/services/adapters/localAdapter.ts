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
} from '../../types';
import {
  addStorageListener,
  commitImportPayload,
  DatabaseState,
  loadDatabase,
  persistDatabase,
  PostImportConferenceData,
  RawImportPayload,
  recordAudit,
} from '../storage';
import { StorageAdapter } from '../storageInterface';

const ACCESS_HASH_KEY = 'impacto_aviation_access_hash';

export class LocalAdapter implements StorageAdapter {
  readonly isCloud = false;
  readonly isOffline = false;

  async init(): Promise<void> {
    loadDatabase();
  }

  getDatabase(): DatabaseState {
    return loadDatabase();
  }

  async savePessoa(pessoa: Pessoa, usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    const idx = db.pessoas.findIndex((p) => p.id === pessoa.id);
    const now = new Date().toISOString();
    let acao: Auditoria['acao'] = 'CRIAR';
    let antes: any = null;

    if (idx >= 0) {
      acao = 'EDITAR';
      antes = { ...db.pessoas[idx] };
      db.pessoas[idx] = { ...pessoa, atualizado_em: now, atualizado_por: usuarioNome };
    } else {
      db.pessoas.push({
        ...pessoa,
        criado_em: pessoa.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      });
    }

    persistDatabase(db);
    recordAudit(acao, 'pessoa', pessoa.id, `${acao === 'CRIAR' ? 'Criou' : 'Editou'} pessoa ${pessoa.nome}`, antes, pessoa, usuarioNome);
  }

  async deletePessoa(id: string, usuarioNome: string): Promise<Pessoa | null> {
    const db = loadDatabase();
    const idx = db.pessoas.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const removed = db.pessoas[idx];
    db.pessoas.splice(idx, 1);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'pessoa', id, `Excluiu pessoa ${removed.nome}`, removed, null, usuarioNome);
    return removed;
  }

  async saveBase(base: Base, usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    const idx = db.bases.findIndex((b) => b.id === base.id);
    if (idx >= 0) {
      db.bases[idx] = base;
    } else {
      db.bases.push(base);
    }
    persistDatabase(db);
    recordAudit('EDITAR', 'base', base.id, `Salva base ${base.id} - ${base.nome}`, null, base, usuarioNome);
  }

  async saveLicenca(licenca: Licenca, usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    const idx = db.licencas.findIndex((l) => l.id === licenca.id);
    const now = new Date().toISOString();
    let acao: Auditoria['acao'] = 'CRIAR';
    let antes: any = null;

    if (idx >= 0) {
      acao = 'EDITAR';
      antes = { ...db.licencas[idx] };
      db.licencas[idx] = { ...licenca, atualizado_em: now, atualizado_por: usuarioNome };
    } else {
      db.licencas.push({
        ...licenca,
        criado_em: licenca.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      });
    }

    persistDatabase(db);
    recordAudit(
      acao,
      'licenca',
      licenca.id,
      `${acao === 'CRIAR' ? 'Cadastrou' : 'Atualizou'} licença ${licenca.orgao} ${licenca.tipo} ${licenca.habilitacao || ''}`,
      antes,
      licenca,
      usuarioNome
    );
  }

  async deleteLicenca(id: string, usuarioNome: string): Promise<Licenca | null> {
    const db = loadDatabase();
    const idx = db.licencas.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    const removed = db.licencas[idx];
    db.licencas.splice(idx, 1);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'licenca', id, `Excluiu licença ${removed.numero}`, removed, null, usuarioNome);
    return removed;
  }

  async saveCurso(curso: CursoCatalogo, usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    const idx = db.cursosCatalogo.findIndex((c) => c.id === curso.id);
    if (idx >= 0) {
      db.cursosCatalogo[idx] = curso;
    } else {
      db.cursosCatalogo.push(curso);
    }
    persistDatabase(db);
    recordAudit('EDITAR', 'curso_catalogo', curso.id, `Salva curso ${curso.curso}`, null, curso, usuarioNome);
  }

  async deleteCurso(id: string, usuarioNome: string): Promise<CursoCatalogo | null> {
    const db = loadDatabase();
    const idx = db.cursosCatalogo.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const removed = db.cursosCatalogo[idx];
    db.cursosCatalogo.splice(idx, 1);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'curso_catalogo', id, `Excluiu curso ${removed.curso}`, removed, null, usuarioNome);
    return removed;
  }

  async saveTreinamento(
    treinamento: Treinamento,
    motoresIds: string[] = [],
    usuarioNome: string
  ): Promise<void> {
    const db = loadDatabase();
    const idx = db.treinamentos.findIndex((t) => t.id === treinamento.id);
    const now = new Date().toISOString();
    let acao: Auditoria['acao'] = 'CRIAR';
    let antes: any = null;

    if (idx >= 0) {
      acao = 'EDITAR';
      antes = { ...db.treinamentos[idx] };
      db.treinamentos[idx] = { ...treinamento, atualizado_em: now, atualizado_por: usuarioNome };
    } else {
      db.treinamentos.push({
        ...treinamento,
        criado_em: treinamento.criado_em || now,
        atualizado_em: now,
        atualizado_por: usuarioNome,
      });
    }

    db.treinamentosMotor = db.treinamentosMotor.filter((tm) => tm.treinamento_id !== treinamento.id);
    motoresIds.forEach((mId) => {
      db.treinamentosMotor.push({ treinamento_id: treinamento.id, motor_id: mId });
    });

    persistDatabase(db);
    recordAudit(
      acao,
      'treinamento',
      treinamento.id,
      `${acao === 'CRIAR' ? 'Lançou' : 'Atualizou'} treinamento (${treinamento.data_execucao})`,
      antes,
      treinamento,
      usuarioNome
    );
  }

  async deleteTreinamento(id: string, usuarioNome: string): Promise<Treinamento | null> {
    const db = loadDatabase();
    const idx = db.treinamentos.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    const removed = db.treinamentos[idx];
    db.treinamentos.splice(idx, 1);
    db.treinamentosMotor = db.treinamentosMotor.filter((tm) => tm.treinamento_id !== id);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'treinamento', id, `Excluiu treinamento ${id}`, removed, null, usuarioNome);
    return removed;
  }

  async renovarTreinamento(
    antigoId: string,
    novaData: string,
    usuarioNome: string
  ): Promise<Treinamento | null> {
    const db = loadDatabase();
    const antigo = db.treinamentos.find((t) => t.id === antigoId);
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

    antigo.substituido_por = novoId;
    antigo.atualizado_em = now;
    antigo.atualizado_por = usuarioNome;

    db.treinamentos.push(novo);

    const motoresAntigos = db.treinamentosMotor.filter((tm) => tm.treinamento_id === antigoId);
    motoresAntigos.forEach((tm) => {
      db.treinamentosMotor.push({ treinamento_id: novoId, motor_id: tm.motor_id });
    });

    persistDatabase(db);
    recordAudit(
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
    const db = loadDatabase();
    const idx = db.motoresCatalogo.findIndex((m) => m.id === motor.id);
    if (idx >= 0) db.motoresCatalogo[idx] = motor;
    else db.motoresCatalogo.push(motor);
    persistDatabase(db);
    recordAudit('EDITAR', 'motor_catalogo', motor.id, `Salva motor ${motor.fabricante} ${motor.modelo}`, null, motor, usuarioNome);
  }

  async deleteMotor(id: string, usuarioNome: string): Promise<MotorCatalogo | null> {
    const db = loadDatabase();
    const idx = db.motoresCatalogo.findIndex((m) => m.id === id);
    if (idx < 0) return null;
    const removed = db.motoresCatalogo[idx];
    db.motoresCatalogo.splice(idx, 1);
    db.treinamentosMotor = db.treinamentosMotor.filter((tm) => tm.motor_id !== id);
    persistDatabase(db);
    recordAudit('EXCLUIR', 'motor_catalogo', id, `Excluiu motor ${removed.fabricante} ${removed.modelo}`, removed, null, usuarioNome);
    return removed;
  }

  async saveDesignacaoPessoa(dp: DesignacaoPessoa, usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    const idx = db.designacoesPessoa.findIndex((d) => d.pessoa_id === dp.pessoa_id);
    if (idx >= 0) db.designacoesPessoa[idx] = dp;
    else db.designacoesPessoa.push(dp);
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_pessoa', dp.pessoa_id, `Atualizou designação pessoa ${dp.pessoa_id}`, null, dp, usuarioNome);
  }

  async setDesignacaoBases(pessoaId: string, bases: string[], usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    db.designacoesBase = db.designacoesBase.filter((b) => b.pessoa_id !== pessoaId);
    bases.forEach((bId) => {
      db.designacoesBase.push({ pessoa_id: pessoaId, base_id: bId });
    });
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_base', pessoaId, `Bases para ${pessoaId}: ${bases.join(', ')}`, null, bases, usuarioNome);
  }

  async setDesignacaoFuncao(
    pessoaId: string,
    funcao: FuncaoDesignacao,
    valor: SimNaoVazio,
    usuarioNome: string
  ): Promise<void> {
    const db = loadDatabase();
    const idx = db.designacoesFuncao.findIndex((df) => df.pessoa_id === pessoaId && df.funcao === funcao);
    if (idx >= 0) db.designacoesFuncao[idx].valor = valor;
    else db.designacoesFuncao.push({ pessoa_id: pessoaId, funcao, valor });
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_funcao', `${pessoaId}-${funcao}`, `Função ${funcao} = ${valor}`, null, { funcao, valor }, usuarioNome);
  }

  async setDesignacaoAeronave(
    pessoaId: string,
    aeronave: AeronaveDesignacao,
    valor: SimNaoVazio,
    usuarioNome: string
  ): Promise<void> {
    const db = loadDatabase();
    const idx = db.designacoesAeronave.findIndex((da) => da.pessoa_id === pessoaId && da.aeronave === aeronave);
    if (idx >= 0) db.designacoesAeronave[idx].valor = valor;
    else db.designacoesAeronave.push({ pessoa_id: pessoaId, aeronave, valor });
    persistDatabase(db);
    recordAudit('EDITAR', 'designacao_aeronave', `${pessoaId}-${aeronave}`, `Aeronave ${aeronave} = ${valor}`, null, { aeronave, valor }, usuarioNome);
  }

  async saveConfiguracao(config: Configuracao, usuarioNome: string): Promise<void> {
    const db = loadDatabase();
    db.configuracao = { ...config };
    persistDatabase(db);
    recordAudit('EDITAR', 'configuracao', 'GLOBAL', `Atualizou parâmetros operacionais`, null, config, usuarioNome);
  }

  async getAccessCodeHash(): Promise<string | null> {
    return localStorage.getItem(ACCESS_HASH_KEY);
  }

  async setAccessCodeHash(hash: string): Promise<void> {
    localStorage.setItem(ACCESS_HASH_KEY, hash);
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
    recordAudit(acao, tabela, registro_id, detalhes, dados_antes, dados_depois, usuarioNome);
  }

  async importBatch(
    payload: RawImportPayload,
    mode: 'substituir' | 'mesclar',
    usuarioNome: string,
    sourceName = 'Importação Local',
    onProgress?: (porcentagem: number, etapa: string) => void
  ): Promise<PostImportConferenceData> {
    onProgress?.(20, 'Validando integridade dos dados...');
    onProgress?.(50, 'Gravando no armazenamento local...');
    const conf = commitImportPayload(payload, mode, usuarioNome, sourceName);
    onProgress?.(100, 'Concluído com sucesso!');
    return conf;
  }

  subscribe(listener: () => void): () => void {
    return addStorageListener(listener);
  }
}
