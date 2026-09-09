import { NCRecord, RegistroAuditoriaNC, OrigemAlteracao } from '../types';
import { INITIAL_RECORDS } from '../data/initialRecords';
import { LocalStorageAdapter, StorageAdapter } from './storageAdapter';

const STORAGE_KEY = 'qualigest_sgq_records_v1';

/**
 * Migration helper to ensure legacy records have all required fields safely (Section 26)
 */
export function migrateNCRecord(nc: any): NCRecord {
  const agora = new Date().toISOString();
  
  return {
    id: nc.id || `nc-${Date.now()}`,
    codigoFormulario: nc.codigoFormulario || 'F 001-29',
    revisao: nc.revisao || '00',
    dataEmissaoFormulario: nc.dataEmissaoFormulario || '02/09/2025',
    numeroNC: nc.numeroNC || '',
    titulo: nc.titulo || 'Registro de Não Conformidade',
    tipoAcao: nc.tipoAcao || 'Corretiva',
    descricaoNC: nc.descricaoNC || '',
    normaReferencia: nc.normaReferencia || 'MOMQ 3.4.3',
    documentoNormativoAplicavel: nc.documentoNormativoAplicavel || undefined,
    setor: nc.setor || 'Qualidade',
    categoria: nc.categoria || 'Geral',
    responsavel: nc.responsavel || nc.acaoCorretiva?.responsavel || nc.preAnaliseContencao?.responsavel || '',
    avaliacaoRiscoInicial: nc.avaliacaoRiscoInicial || {
      severidade: '2',
      probabilidade: 'C',
      codigo: '2C',
      nivel: 'Médio',
    },
    prazoResposta: nc.prazoResposta || '',
    dataIdentificacao: nc.dataIdentificacao || agora.split('T')[0],
    auditor: nc.auditor || 'Auditor SGQ',
    evidenciasObjetivas: Array.isArray(nc.evidenciasObjetivas) ? nc.evidenciasObjetivas : [],
    preAnaliseContencao: {
      descricao: nc.preAnaliseContencao?.descricao || '',
      responsavel: nc.preAnaliseContencao?.responsavel || '',
      dataLimite: nc.preAnaliseContencao?.dataLimite || '',
      dataConclusao: nc.preAnaliseContencao?.dataConclusao || '',
      status: nc.preAnaliseContencao?.status || 'Pendente',
      observacoes: nc.preAnaliseContencao?.observacoes || '',
      origem: nc.preAnaliseContencao?.origem || 'USUÁRIO',
      validadoPorHumano: nc.preAnaliseContencao?.validadoPorHumano ?? true,
    },
    analiseCausaRaiz: {
      metodologia: nc.analiseCausaRaiz?.metodologia || '5 Porquês',
      cincoPorques: Array.isArray(nc.analiseCausaRaiz?.cincoPorques) && nc.analiseCausaRaiz.cincoPorques.length > 0 
        ? nc.analiseCausaRaiz.cincoPorques 
        : ['', '', '', '', ''],
      explicacaoCausaSistemica: nc.analiseCausaRaiz?.explicacaoCausaSistemica || '',
      ishikawa: nc.analiseCausaRaiz?.ishikawa || {
        metodo: '',
        maquina: '',
        maoDeObra: '',
        material: '',
        medicao: '',
        meioAmbiente: '',
      },
      detalhes: nc.analiseCausaRaiz?.detalhes || '',
      statusValidacao: nc.analiseCausaRaiz?.statusValidacao || 'HIPÓTESE – REQUER VALIDAÇÃO HUMANA',
      evidenciasSustentacao: nc.analiseCausaRaiz?.evidenciasSustentacao || [],
      evidenciasFaltantes: nc.analiseCausaRaiz?.evidenciasFaltantes || [],
      perguntasInvestigacao: nc.analiseCausaRaiz?.perguntasInvestigacao || [],
      nivelSuporteDocumental: nc.analiseCausaRaiz?.nivelSuporteDocumental || 'Evidência moderada',
      validadoPorResponsavel: nc.analiseCausaRaiz?.validadoPorResponsavel ?? false,
      responsavelValidacao: nc.analiseCausaRaiz?.responsavelValidacao || '',
      dataValidacao: nc.analiseCausaRaiz?.dataValidacao || '',
    },
    acaoCorretiva: {
      descricao: nc.acaoCorretiva?.descricao || '',
      comoSeraFeito: nc.acaoCorretiva?.comoSeraFeito || '',
      responsavel: nc.acaoCorretiva?.responsavel || '',
      dataPrazo: nc.acaoCorretiva?.dataPrazo || '',
      dataConclusao: nc.acaoCorretiva?.dataConclusao || '',
      status: nc.acaoCorretiva?.status || 'Não Iniciada',
      assinaturaResponsavel: nc.acaoCorretiva?.assinaturaResponsavel || '',
      validadoPorHumano: nc.acaoCorretiva?.validadoPorHumano ?? true,
    },
    verificacaoEficacia: {
      metodo: nc.verificacaoEficacia?.metodo || 'Documental',
      outroMetodoDetalhe: nc.verificacaoEficacia?.outroMetodoDetalhe || '',
      avaliacaoRiscoResidual: nc.verificacaoEficacia?.avaliacaoRiscoResidual || {
        severidade: '4',
        probabilidade: 'E',
        codigo: '4E',
        nivel: 'Baixo',
      },
      encerrado: nc.verificacaoEficacia?.encerrado || 'Pendente',
      motivo: nc.verificacaoEficacia?.motivo || '',
      dataVerificacao: nc.verificacaoEficacia?.dataVerificacao || '',
      auditorVerificador: nc.verificacaoEficacia?.auditorVerificador || '',
      evidencias: nc.verificacaoEficacia?.evidencias || '',
      criterioAprovacao: nc.verificacaoEficacia?.criterioAprovacao || '',
    },
    statusGeral: nc.statusGeral || 'Aberta',
    criadoEm: nc.criadoEm || agora,
    atualizadoEm: agora,
    historicoPrazos: Array.isArray(nc.historicoPrazos) ? nc.historicoPrazos : [],
    trilhaAuditoria: Array.isArray(nc.trilhaAuditoria) ? nc.trilhaAuditoria : [],
    tags: nc.tags || [],
    documentoOrigemNome: nc.documentoOrigemNome,
    aprovadoPor: nc.aprovadoPor,
    dataAprovacao: nc.dataAprovacao,
    justificativaFechamento: nc.justificativaFechamento,
  };
}

/**
 * Compares two NC states and generates audit trail entries (Section 8)
 */
export function generateAuditEntries(
  oldNC: NCRecord | null,
  newNC: NCRecord,
  usuario: string = 'Usuário do Sistema',
  origem: OrigemAlteracao = 'Alteração manual pelo usuário',
  decisaoHumana?: 'Aceita' | 'Editada' | 'Rejeitada' | 'Rascunho',
  justificativa?: string
): RegistroAuditoriaNC[] {
  const entries: RegistroAuditoriaNC[] = [];
  const agora = new Date().toLocaleString('pt-BR');

  if (!oldNC) {
    entries.push({
      id: `audit-${Date.now()}-created`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Registro de Não Conformidade',
      valorAnterior: 'Não existia',
      novoValor: `Criada NC nº ${newNC.numeroNC || 'S/N'} (${newNC.titulo})`,
      origem,
      decisaoHumana: decisaoHumana || 'Rascunho',
      justificativa: justificativa || 'Criação inicial do registro',
    });
    return entries;
  }

  // Check Status Change
  if (oldNC.statusGeral !== newNC.statusGeral) {
    entries.push({
      id: `audit-${Date.now()}-status`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Status Geral',
      valorAnterior: oldNC.statusGeral,
      novoValor: newNC.statusGeral,
      origem,
      decisaoHumana: decisaoHumana || 'Aceita',
      justificativa,
    });
  }

  // Check Root Cause or Details Change
  if (oldNC.analiseCausaRaiz?.detalhes !== newNC.analiseCausaRaiz?.detalhes) {
    entries.push({
      id: `audit-${Date.now()}-causa`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Análise de Causa Raiz (Síntese)',
      valorAnterior: oldNC.analiseCausaRaiz?.detalhes || 'Não definido',
      novoValor: newNC.analiseCausaRaiz?.detalhes || 'Não definido',
      origem,
      decisaoHumana,
      justificativa,
    });
  }

  // Check Containment Change
  if (oldNC.preAnaliseContencao?.descricao !== newNC.preAnaliseContencao?.descricao) {
    entries.push({
      id: `audit-${Date.now()}-contencao`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Ação de Contenção Imediata',
      valorAnterior: oldNC.preAnaliseContencao?.descricao || 'Não definida',
      novoValor: newNC.preAnaliseContencao?.descricao || 'Não definida',
      origem,
      decisaoHumana,
      justificativa,
    });
  }

  // Check Corrective Action Change
  if (oldNC.acaoCorretiva?.descricao !== newNC.acaoCorretiva?.descricao) {
    entries.push({
      id: `audit-${Date.now()}-acao`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Plano de Ação Corretiva',
      valorAnterior: oldNC.acaoCorretiva?.descricao || 'Não definido',
      novoValor: newNC.acaoCorretiva?.descricao || 'Não definido',
      origem,
      decisaoHumana,
      justificativa,
    });
  }

  // Check Norm / Requirement Reference Change
  if (oldNC.normaReferencia !== newNC.normaReferencia) {
    entries.push({
      id: `audit-${Date.now()}-norma`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Norma / Requisito de Referência',
      valorAnterior: oldNC.normaReferencia || 'Não informado',
      novoValor: newNC.normaReferencia || 'Não informado',
      origem,
      decisaoHumana,
      justificativa,
    });
  }

  // Check Risk Change
  if (oldNC.avaliacaoRiscoInicial?.codigo !== newNC.avaliacaoRiscoInicial?.codigo) {
    entries.push({
      id: `audit-${Date.now()}-risco`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Matriz de Risco Inicial (5x5)',
      valorAnterior: `${oldNC.avaliacaoRiscoInicial?.codigo} (${oldNC.avaliacaoRiscoInicial?.nivel})`,
      novoValor: `${newNC.avaliacaoRiscoInicial?.codigo} (${newNC.avaliacaoRiscoInicial?.nivel})`,
      origem,
      decisaoHumana,
      justificativa,
    });
  }

  // If other general edits occurred and no specific field was logged
  if (entries.length === 0 && JSON.stringify(oldNC) !== JSON.stringify(newNC)) {
    entries.push({
      id: `audit-${Date.now()}-general`,
      dataHora: agora,
      usuario,
      campoAlterado: 'Dados Gerais da Não Conformidade',
      valorAnterior: 'Versão anterior',
      novoValor: 'Atualizado pelo usuário',
      origem,
      decisaoHumana: decisaoHumana || 'Aceita',
      justificativa,
    });
  }

  return entries;
}

export class NCRepository {
  private adapter: StorageAdapter<NCRecord>;

  constructor(adapter?: StorageAdapter<NCRecord>) {
    this.adapter = adapter || new LocalStorageAdapter<NCRecord>(STORAGE_KEY, INITIAL_RECORDS.map(migrateNCRecord));
  }

  async getAll(): Promise<NCRecord[]> {
    const rawList = await this.adapter.getAll();
    return rawList.map(migrateNCRecord);
  }

  async getById(id: string): Promise<NCRecord | null> {
    const item = await this.adapter.getById(id);
    return item ? migrateNCRecord(item) : null;
  }

  async save(
    nc: NCRecord,
    usuario: string = 'Usuário do Sistema',
    origem: OrigemAlteracao = 'Alteração manual pelo usuário',
    decisaoHumana?: 'Aceita' | 'Editada' | 'Rejeitada' | 'Rascunho',
    justificativa?: string
  ): Promise<NCRecord> {
    const existing = await this.getById(nc.id);
    const auditedNC: NCRecord = {
      ...migrateNCRecord(nc),
      atualizadoEm: new Date().toISOString(),
    };

    const newAuditEntries = generateAuditEntries(
      existing,
      auditedNC,
      usuario,
      origem,
      decisaoHumana,
      justificativa
    );

    auditedNC.trilhaAuditoria = [
      ...(auditedNC.trilhaAuditoria || []),
      ...newAuditEntries,
    ];

    await this.adapter.save(auditedNC);
    return auditedNC;
  }

  async delete(id: string, usuario: string = 'Usuário do Sistema'): Promise<void> {
    await this.adapter.delete(id);
  }

  async deleteMultiple(ids: string[], usuario: string = 'Usuário do Sistema'): Promise<void> {
    await this.adapter.deleteMultiple(ids);
  }

  async exportToJSON(): Promise<string> {
    const items = await this.getAll();
    return JSON.stringify(items, null, 2);
  }

  async importFromJSON(jsonString: string): Promise<NCRecord[]> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        throw new Error('O formato do arquivo importado deve ser uma lista de registros JSON.');
      }
      const migrated = parsed.map(migrateNCRecord);
      await this.adapter.saveAll(migrated);
      return migrated;
    } catch (e: any) {
      throw new Error(`Falha ao importar dados: ${e.message}`);
    }
  }
}

export const ncRepository = new NCRepository();
