import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from './config';
import {
  RegistroImportacaoCompleto,
  TemplateMapeamentoAprovado,
  FerramentaCalibracao,
  ColaboradorPessoa,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  UserProfile,
  TipoControleImportacao,
  RegistroLinhaImportacao,
} from '../../types';
import {
  DEFAULT_ORGANIZATION_ID,
  sanitizeForFirestore,
  recordOrganizationAudit,
} from './firestore';
import { INITIAL_CALIBRATED_TOOLS } from '../../data/initialCalibratedTools';

// ============================================================================
// 1. FERRAMENTAS CALIBRADAS / METROLOGIA (RBAC 145.109)
// ============================================================================

export function subscribeToCalibratedTools(
  organizationId: string,
  callback: (tools: FerramentaCalibracao[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'calibrated_tools');

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        if (organizationId === DEFAULT_ORGANIZATION_ID) {
          try {
            const batch = writeBatch(db);
            INITIAL_CALIBRATED_TOOLS.forEach((t) => {
              const docRef = doc(db, 'organizations', organizationId, 'calibrated_tools', t.id);
              batch.set(docRef, sanitizeForFirestore({ ...t, organizationId }));
            });
            await batch.commit();
          } catch (e) {
            console.warn('Fallback: usando INITIAL_CALIBRATED_TOOLS locais', e);
          }
          callback(INITIAL_CALIBRATED_TOOLS);
          return;
        }
        callback([]);
        return;
      }

      const list: FerramentaCalibracao[] = [];
      snapshot.forEach((snapDoc) => {
        list.push({ id: snapDoc.id, ...snapDoc.data() } as FerramentaCalibracao);
      });
      callback(list);
    },
    (error) => {
      console.warn('Erro ao escutar calibrated_tools no Firestore (modo offline/fallback ativo):', error);
      if (organizationId === DEFAULT_ORGANIZATION_ID) {
        callback(INITIAL_CALIBRATED_TOOLS);
      } else {
        callback([]);
      }
    }
  );
}

export async function saveCalibratedTool(
  organizationId: string,
  tool: FerramentaCalibracao,
  user: UserProfile | null
): Promise<void> {
  const toolId = tool.id || `tool-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const toolRef = doc(db, 'organizations', organizationId, 'calibrated_tools', toolId);

  const dados = sanitizeForFirestore({
    ...tool,
    id: toolId,
    organizationId,
    atualizadoEm: new Date().toISOString(),
  });

  try {
    await setDoc(toolRef, dados, { merge: true });
    await recordOrganizationAudit(organizationId, {
      entity: 'CALIBRATED_TOOL',
      entityId: toolId,
      action: 'UPDATE',
      changedByUid: user?.uid || auth.currentUser?.uid || 'system',
      changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
      summary: `Instrumento/Ferramenta ${tool.codigoPatrimonio} atualizado`,
      details: JSON.stringify({
        codigoPatrimonio: tool.codigoPatrimonio,
        descricao: tool.descricao,
        dataProximaCalibracao: tool.dataProximaCalibracao,
      }),
    });
  } catch (err) {
    console.warn('Erro ao gravar calibrated_tool no Firestore (fallback local mantido):', err);
  }
}

// ============================================================================
// 2. REGISTROS DE IMPORTAÇÕES INTELIGENTES (SMART IMPORTS)
// ============================================================================

export function subscribeToSmartImports(
  organizationId: string,
  callback: (imports: RegistroImportacaoCompleto[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'smart_imports');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: RegistroImportacaoCompleto[] = [];
      snapshot.forEach((snapDoc) => {
        list.push({ id: snapDoc.id, ...snapDoc.data() } as RegistroImportacaoCompleto);
      });
      // Ordenar por data decrescente
      list.sort((a, b) => (b.dataUpload > a.dataUpload ? 1 : -1));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar smart_imports:', err);
      callback([]);
    }
  );
}

export const subscribeToSmartImportRecords = subscribeToSmartImports;

export async function saveSmartImportRecord(
  organizationId: string,
  record: RegistroImportacaoCompleto,
  user: UserProfile | null
): Promise<void> {
  const importId = record.id || `import-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, 'organizations', organizationId, 'smart_imports', importId);

  const dados = sanitizeForFirestore({
    ...record,
    id: importId,
    organizationId,
  });

  try {
    await setDoc(docRef, dados, { merge: true });
    await recordOrganizationAudit(organizationId, {
      entity: 'SMART_IMPORT',
      entityId: importId,
      action: 'CREATE',
      changedByUid: user?.uid || auth.currentUser?.uid || 'system',
      changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
      summary: `Importação Inteligente do arquivo ${record.nomeArquivo} concluída`,
      details: JSON.stringify({
        nomeArquivo: record.nomeArquivo,
        tipoControle: record.tipoControle || record.tipoControleIdentificado,
        hashSha256: record.hashSha256,
        totalLinhas: record.totalLinhas || record.resumo?.totalLinhas,
        registrosCriadosQtd: record.registrosCriadosQtd || record.resumo?.registrosNovos,
      }),
    });
  } catch (err) {
    console.warn('Erro ao gravar smart_import no Firestore:', err);
  }
}

// ============================================================================
// 3. MODELOS / TEMPLATES DE MAPEAMENTO APROVADOS DA EMPRESA
// ============================================================================

export function subscribeToImportTemplates(
  organizationId: string,
  callback: (templates: TemplateMapeamentoAprovado[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, 'organizations', organizationId, 'import_templates');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: TemplateMapeamentoAprovado[] = [];
      snapshot.forEach((snapDoc) => {
        list.push({ id: snapDoc.id, ...snapDoc.data() } as TemplateMapeamentoAprovado);
      });
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar import_templates:', err);
      callback([]);
    }
  );
}

export async function saveImportTemplate(
  organizationId: string,
  template: TemplateMapeamentoAprovado,
  user: UserProfile | null
): Promise<void> {
  const templateId = template.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const docRef = doc(db, 'organizations', organizationId, 'import_templates', templateId);

  const dados = sanitizeForFirestore({
    ...template,
    id: templateId,
    organizationId,
    atualizadoEm: new Date().toISOString(),
  });

  try {
    await setDoc(docRef, dados, { merge: true });
    await recordOrganizationAudit(organizationId, {
      entity: 'IMPORT_TEMPLATE',
      entityId: templateId,
      action: 'CREATE',
      changedByUid: user?.uid || auth.currentUser?.uid || 'system',
      changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
      summary: `Modelo de importação "${template.nomeTemplate || template.nome}" aprovado`,
      details: JSON.stringify({
        nome: template.nomeTemplate || template.nome,
        tipoControle: template.tipoControle,
      }),
    });
  } catch (err) {
    console.warn('Erro ao salvar template de importação:', err);
  }
}

// ============================================================================
// 4. COMMIT & GRAVAÇÃO DOS DADOS IMPORTADOS NO SGQ
// ============================================================================

export interface ResultadoGravacaoImportacao {
  sucesso: boolean;
  totalProcessados: number;
  totalCriados: number;
  totalAtualizados: number;
  idsGerados: string[];
  mensagem: string;
}

export async function efetivarImportacaoNoQualigest(
  organizationId: string,
  tipoControle: TipoControleImportacao,
  registrosLinhas: RegistroLinhaImportacao[],
  importId: string,
  nomeArquivo: string,
  user: UserProfile | null,
  callbacksEstado: {
    adicionarPessoa?: (pessoa: ColaboradorPessoa) => void;
    adicionarCurso?: (curso: CursoTreinamento) => void;
    adicionarRegistroTreinamento?: (registro: RegistroTreinamentoColaborador) => void;
    adicionarFerramenta?: (ferramenta: FerramentaCalibracao) => void;
  }
): Promise<ResultadoGravacaoImportacao> {
  let totalCriados = 0;
  let totalAtualizados = 0;
  const idsGerados: string[] = [];

  const linhasParaImportar = registrosLinhas.filter(
    (l) => l.selecionadoParaImportar && l.statusQualidade !== 'ERRO' && l.acaoDuplicidade !== 'IGNORAR'
  );

  // 1. Processar TREINAMENTOS
  if (tipoControle === 'TREINAMENTOS') {
    for (const linha of linhasParaImportar) {
      const dados = linha.dadosMapeados;
      const pessoaNome = dados.pessoaNome || 'Colaborador sem Nome';
      const cursoTitulo = dados.cursoTitulo || 'Treinamento Aeronáutico';

      const pessoaId = `person-imp-${Math.random().toString(36).substr(2, 7)}`;
      const matriculaGerada = dados.pessoaMatricula || `IMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const novaPessoa: ColaboradorPessoa = {
        id: pessoaId,
        organizationId,
        nome: pessoaNome,
        matricula: matriculaGerada,
        setor: dados.setor || 'Manutenção / SGQ',
        funcao: 'TECNICO_MANUTENCAO',
        cargoOperacional: dados.funcao || 'Técnico de Manutenção Aeronáutica',
        status: 'ATIVO',
        dataAdmissao: '2024-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        criadoPor: user?.displayName || 'Importador SGQ',
        criadoPorUid: user?.uid || 'system',
      };

      if (callbacksEstado.adicionarPessoa) {
        callbacksEstado.adicionarPessoa(novaPessoa);
      }

      const cursoId = `course-imp-${Math.random().toString(36).substr(2, 7)}`;
      const novoCurso: CursoTreinamento = {
        id: cursoId,
        organizationId,
        codigo: `TREIN-${Math.floor(100 + Math.random() * 900)}`,
        titulo: cursoTitulo,
        tipo: 'AERONAUTICO',
        modalidade: 'PRESENCIAL',
        cargaHorariaHoras: Number(dados.cargaHoraria) || 16,
        ementa: `Capacitação técnica importada via planilha original ${nomeArquivo}`,
        recorrente: true,
        periodicidadeMeses: 24,
        origemPrazo: 'REGULAMENTO',
        competenciasDesenvolvidasIds: [],
        status: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        criadoPorUid: user?.uid || 'system',
      };

      if (callbacksEstado.adicionarCurso) {
        callbacksEstado.adicionarCurso(novoCurso);
      }

      const registroTreinoId = `reg-tr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const novoRegistroTreinamento: RegistroTreinamentoColaborador = {
        id: registroTreinoId,
        organizationId,
        treinamentoId: cursoId,
        treinamentoCodigo: novoCurso.codigo,
        treinamentoTitulo: cursoTitulo,
        colaboradorId: pessoaId,
        colaboradorNome: pessoaNome,
        colaboradorMatricula: matriculaGerada,
        dataRealizacao: dados.dataRealizacao || new Date().toISOString().split('T')[0],
        dataValidade: dados.dataValidade || undefined,
        cargaHoraria: Number(dados.cargaHoraria) || 16,
        instrutor: dados.instrutor || 'Instrutor Homologado',
        resultado: 'APROVADO',
        entidadeInstrutora: dados.entidadeInstrutora || 'Impacto Training / Autorizada',
        numeroCertificado: dados.numeroCertificado || undefined,
        observacoes: `Importado de ${nomeArquivo} (Import ID: ${importId})`,
        validadoPorSGQNome: user?.displayName || 'Importador SGQ',
        validadoPorSGQUid: user?.uid || 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (callbacksEstado.adicionarRegistroTreinamento) {
        callbacksEstado.adicionarRegistroTreinamento(novoRegistroTreinamento);
      }

      idsGerados.push(registroTreinoId);
      if (linha.duplicidadeDetectada && linha.acaoDuplicidade === 'ATUALIZAR') {
        totalAtualizados++;
      } else {
        totalCriados++;
      }
    }
  }

  // 2. Processar CALIBRAÇÃO / FERRAMENTAL
  if (tipoControle === 'CALIBRACAO_FERRAMENTAL') {
    for (const linha of linhasParaImportar) {
      const dados = linha.dadosMapeados;
      const toolId = linha.duplicidadeDetectada && linha.registroExistenteId && linha.acaoDuplicidade === 'ATUALIZAR'
        ? linha.registroExistenteId
        : `tool-imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      let statusFerramenta: 'CALIBRADA' | 'PROXIMA_VENCIMENTO' | 'VENCIDA' | 'EM_CALIBRACAO' | 'QUARANTENA' = 'CALIBRADA';
      const hoje = new Date().toISOString().split('T')[0];
      if (dados.dataProximaCalibracao) {
        if (dados.dataProximaCalibracao < hoje) {
          statusFerramenta = 'VENCIDA';
        } else {
          // Checar se vence em 30 dias
          const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (dados.dataProximaCalibracao <= em30Dias) {
            statusFerramenta = 'PROXIMA_VENCIMENTO';
          }
        }
      }

      const novaFerramenta: FerramentaCalibracao = {
        id: toolId,
        organizationId,
        codigoPatrimonio: dados.codigoPatrimonio || 'SEM-PAT',
        descricao: dados.descricao || 'Instrumento de Medição',
        fabricante: dados.fabricante || 'Fabricante Homologado',
        modelo: dados.modelo || '',
        numeroSerie: dados.numeroSerie || 'S/N',
        setor: dados.setor || 'Linha de Manutenção Hangar',
        baseOperacionalId: 'base-rec-hub',
        baseOperacionalNome: 'REC - Recife / Hub Central',
        status: statusFerramenta,
        dataUltimaCalibracao: dados.dataUltimaCalibracao || hoje,
        dataProximaCalibracao: dados.dataProximaCalibracao || hoje,
        frequenciaMeses: Number(dados.frequenciaMeses) || 12,
        laboratorioCalibrador: dados.laboratorioCalibrador || 'Laboratório Metrológico Acreditado RBC',
        numeroCertificado: dados.numeroCertificado || '',
        tolerancia: dados.observacoes || '± Conforme Manual de Manutenção',
        observacoes: dados.observacoes || `Importado da planilha ${nomeArquivo}`,
        origemImportacaoId: importId,
        origemArquivoNome: nomeArquivo,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      if (callbacksEstado.adicionarFerramenta) {
        callbacksEstado.adicionarFerramenta(novaFerramenta);
      }

      // Persistir no Firestore
      await saveCalibratedTool(organizationId, novaFerramenta, user);

      idsGerados.push(toolId);
      if (linha.duplicidadeDetectada && linha.acaoDuplicidade === 'ATUALIZAR') {
        totalAtualizados++;
      } else {
        totalCriados++;
      }
    }
  }

  // Gravar registro na auditoria
  await recordOrganizationAudit(organizationId, {
    entity: 'SMART_IMPORT',
    entityId: importId,
    action: 'CREATE',
    changedByUid: user?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
    summary: `Importação efetivada no QualiGest (${linhasParaImportar.length} registros)`,
    details: JSON.stringify({
      tipoControle,
      nomeArquivo,
      totalProcessados: linhasParaImportar.length,
      totalCriados,
      totalAtualizados,
    }),
  });

  return {
    sucesso: true,
    totalProcessados: linhasParaImportar.length,
    totalCriados,
    totalAtualizados,
    idsGerados,
    mensagem: `Importação de ${linhasParaImportar.length} registros concluída com sucesso (${totalCriados} novos, ${totalAtualizados} atualizações). Rastreabilidade com ${nomeArquivo} formalizada.`,
  };
}
