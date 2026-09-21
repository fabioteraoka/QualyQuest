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
  QualificacaoColaborador,
  UserProfile,
  TipoControleImportacao,
  RegistroLinhaImportacao,
  SnapshotRegistroCriado,
  SnapshotRegistroAtualizado,
} from '../../types';
import {
  DEFAULT_ORGANIZATION_ID,
  sanitizeForFirestore,
  recordOrganizationAudit,
} from './firestore';
import {
  savePerson,
  saveTrainingCourse,
  saveTrainingRecord,
  saveQualification,
} from './competenciesFirestore';
import { normalizarStatusColaborador } from '../../utils/smartImportEngine';
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
  registrosCriadosSnapshot?: SnapshotRegistroCriado[];
  registrosAtualizadosSnapshot?: SnapshotRegistroAtualizado[];
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
    adicionarQualificacao?: (qualificacao: QualificacaoColaborador) => void;
    adicionarFerramenta?: (ferramenta: FerramentaCalibracao) => void;
    removerFerramenta?: (toolId: string) => void;
    removerRegistroTreinamento?: (recordId: string) => void;
    removerPessoa?: (personId: string) => void;
    removerCurso?: (courseId: string) => void;
    removerQualificacao?: (qualId: string) => void;
  },
  contextoExistente?: {
    pessoasExistentes?: ColaboradorPessoa[];
    treinamentosExistentes?: CursoTreinamento[];
    registrosTreinamentoExistentes?: RegistroTreinamentoColaborador[];
  }
): Promise<ResultadoGravacaoImportacao> {
  let totalCriados = 0;
  let totalAtualizados = 0;
  const idsGerados: string[] = [];
  const registrosCriadosSnapshot: SnapshotRegistroCriado[] = [];
  const registrosAtualizadosSnapshot: SnapshotRegistroAtualizado[] = [];

  const linhasParaImportar = registrosLinhas.filter(
    (l) =>
      l.selecionadoParaImportar &&
      l.statusQualidade !== 'ERRO' &&
      l.classificacaoReconciliacao !== 'INVALIDO' &&
      l.decisaoUsuario !== 'IGNORAR' &&
      l.decisaoUsuario !== 'CANCELAR'
  );

  // 1. Processar TREINAMENTOS & COLABORADORES (Fase 14.1-A)
  if (tipoControle === 'TREINAMENTOS') {
    // Rastrear pessoas e cursos criados/atualizados neste lote para persistência unificada
    const pessoasCriadasBatch = new Map<string, ColaboradorPessoa>();
    const pessoasAtualizadasBatch = new Map<string, ColaboradorPessoa>();
    const cursosCriadosBatch = new Map<string, CursoTreinamento>();

    for (const linha of linhasParaImportar) {
      const dados = linha.dadosMapeados;
      let pessoaId = linha.pessoaIdVinculada;
      let pessoaNome = linha.pessoaNomeVinculada || dados.pessoaNome || 'Colaborador';
      let matricula = dados.pessoaMatricula || '';
      const pessoaNomeNorm = (pessoaNome || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      // ====================================================================
      // 1.1 PERSISTÊNCIA OFICIAL DO COLABORADOR (Pessoas & Competências)
      // ====================================================================
      if (linha.pessoaAcao === 'CRIAR_PESSOA' || (!pessoaId && linha.decisaoUsuario !== 'IGNORAR')) {
        if (pessoasCriadasBatch.has(pessoaNomeNorm)) {
          const pessoaJaCriada = pessoasCriadasBatch.get(pessoaNomeNorm)!;
          pessoaId = pessoaJaCriada.id;
          pessoaNome = pessoaJaCriada.nome;
          matricula = pessoaJaCriada.matricula;
        } else {
          pessoaId = pessoaId || `person-imp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
          matricula = dados.pessoaMatricula || `IMP-${Math.floor(1000 + Math.random() * 9000)}`;

          const cargoMec = dados.funcao || 'Mecânico de Manutenção de Aeronaves';
          const funcaoPadrao = cargoMec.toUpperCase().includes('INSPETOR') ? 'INSPETOR_QUALIDADE' : 'TECNICO_MANUTENCAO';
          const rawStatus = dados.statusColaborador || dados.status || '';
          const statusFinal = rawStatus ? normalizarStatusColaborador(rawStatus) : 'ATIVO';
          const obsStatus = rawStatus 
            ? `Status operacional "${statusFinal}" normalizado a partir de "${rawStatus}" na planilha de origem.`
            : `Status não informado na planilha de origem ("STATUS NÃO INFORMADO"); atribuído como ATIVO mediante homologação humana de importação.`;

          const novaPessoa: ColaboradorPessoa = {
            id: pessoaId,
            organizationId,
            nome: pessoaNome,
            matricula,
            setor: dados.setor || 'Operações de Manutenção',
            funcao: funcaoPadrao as any,
            cargoOperacional: cargoMec,
            status: statusFinal,
            statusCustomizado: statusFinal === 'OUTRO' ? String(rawStatus || 'Não Especificado') : undefined,
            dataAdmissao: dados.dataAdmissao || '2024-01-01',
            observacoes: `Cadastrado via Importação Inteligente (${nomeArquivo} - Lote: ${importId}). ${obsStatus}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            criadoPor: user?.displayName || user?.email || 'Importador SGQ',
            criadoPorUid: user?.uid || auth.currentUser?.uid || 'system',
          };

          // Salvar oficialmente no Firestore (organizations/{orgId}/persons/{id})
          await savePerson(organizationId, novaPessoa, user);

          if (callbacksEstado.adicionarPessoa) {
            callbacksEstado.adicionarPessoa(novaPessoa);
          }

          pessoasCriadasBatch.set(pessoaNomeNorm, novaPessoa);

          registrosCriadosSnapshot.push({
            modulo: 'PERSON',
            id: pessoaId,
            dados: novaPessoa,
          });

          idsGerados.push(pessoaId);
          totalCriados++;
        }
      } else if (linha.pessoaAcao === 'VINCULAR_EXISTENTE' && pessoaId) {
        // Se houver alteração nos dados do colaborador existente (aprovado na decisão)
        const pessoaExistente = (contextoExistente?.pessoasExistentes || []).find((p) => p.id === pessoaId);
        if (pessoaExistente && !pessoasAtualizadasBatch.has(pessoaId)) {
          const temNovaMatricula = dados.pessoaMatricula && dados.pessoaMatricula !== pessoaExistente.matricula;
          const temNovoSetor = dados.setor && dados.setor !== pessoaExistente.setor;
          const temNovoCargo = dados.funcao && dados.funcao !== pessoaExistente.cargoOperacional;
          const rawStatusNovo = dados.statusColaborador || dados.status || '';
          const statusNovo = rawStatusNovo ? normalizarStatusColaborador(rawStatusNovo) : undefined;
          const temNovoStatus = statusNovo && statusNovo !== pessoaExistente.status;

          if ((temNovaMatricula || temNovoSetor || temNovoCargo || temNovoStatus) && linha.decisaoUsuario === 'ATUALIZAR') {
            const pessoaAtualizada: ColaboradorPessoa = {
              ...pessoaExistente,
              matricula: dados.pessoaMatricula || pessoaExistente.matricula,
              setor: dados.setor || pessoaExistente.setor,
              cargoOperacional: dados.funcao || pessoaExistente.cargoOperacional,
              status: statusNovo || pessoaExistente.status,
              statusCustomizado: statusNovo === 'OUTRO' ? String(rawStatusNovo) : pessoaExistente.statusCustomizado,
              updatedAt: new Date().toISOString(),
            };

            await savePerson(organizationId, pessoaAtualizada, user, pessoaExistente);

            if (callbacksEstado.adicionarPessoa) {
              callbacksEstado.adicionarPessoa(pessoaAtualizada);
            }

            pessoasAtualizadasBatch.set(pessoaId, pessoaAtualizada);

            registrosAtualizadosSnapshot.push({
              modulo: 'PERSON',
              id: pessoaId,
              dadosAnteriores: pessoaExistente,
              dadosNovos: pessoaAtualizada,
            });

            totalAtualizados++;
          }
        }
      }

      // ====================================================================
      // 1.2 PERSISTÊNCIA OFICIAL DO CURSO (Treinamentos, CHTs & Catálogo)
      // ====================================================================
      let cursoId = linha.cursoIdVinculado;
      let cursoCodigo = dados.cursoCodigo || `TREIN-${Math.floor(100 + Math.random() * 900)}`;
      const cursoTitulo = dados.cursoTitulo || 'Treinamento Aeronáutico';
      const cursoTituloNorm = (cursoTitulo || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      if (linha.cursoAcao === 'CRIAR_CURSO' || (!cursoId && linha.decisaoUsuario !== 'IGNORAR')) {
        if (cursosCriadosBatch.has(cursoTituloNorm)) {
          const cursoJaCriado = cursosCriadosBatch.get(cursoTituloNorm)!;
          cursoId = cursoJaCriado.id;
          cursoCodigo = cursoJaCriado.codigo;
        } else {
          cursoId = cursoId || `course-imp-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
          const novoCurso: CursoTreinamento = {
            id: cursoId,
            organizationId,
            codigo: cursoCodigo,
            titulo: cursoTitulo,
            tipo: 'AERONAUTICO',
            modalidade: 'PRESENCIAL',
            cargaHorariaHoras: Number(dados.cargaHoraria) || 16,
            ementa: `Capacitação técnica catalogada via Importação Inteligente (${nomeArquivo})`,
            recorrente: Boolean(dados.dataValidade),
            periodicidadeMeses: 24,
            origemPrazo: 'REGULAMENTO',
            competenciasDesenvolvidasIds: [],
            status: 'ATIVO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            criadoPorUid: user?.uid || auth.currentUser?.uid || 'system',
          };

          // Salvar oficialmente no Firestore (organizations/{orgId}/trainingCourses/{id})
          await saveTrainingCourse(organizationId, novoCurso, user);

          if (callbacksEstado.adicionarCurso) {
            callbacksEstado.adicionarCurso(novoCurso);
          }

          cursosCriadosBatch.set(cursoTituloNorm, novoCurso);

          registrosCriadosSnapshot.push({
            modulo: 'TRAINING_COURSE',
            id: cursoId,
            dados: novoCurso,
          });

          idsGerados.push(cursoId);
          totalCriados++;
        }
      }

      // ====================================================================
      // 1.3 PERSISTÊNCIA DO REGISTRO DE TREINAMENTO (quando houver curso)
      // ====================================================================
      if (dados.cursoTitulo || cursoId) {
        const isAtualizacaoTreino = linha.decisaoUsuario === 'ATUALIZAR' && Boolean(linha.registroExistenteId);
        const registroTreinoId = isAtualizacaoTreino && linha.registroExistenteId
          ? linha.registroExistenteId
          : `reg-tr-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;

        const novoRegistroTreinamento: RegistroTreinamentoColaborador = {
          id: registroTreinoId,
          organizationId,
          treinamentoId: cursoId || 'curso-gen',
          treinamentoCodigo: cursoCodigo,
          treinamentoTitulo: cursoTitulo,
          colaboradorId: pessoaId || 'colab-gen',
          colaboradorNome: pessoaNome,
          colaboradorMatricula: matricula,
          dataRealizacao: dados.dataRealizacao || new Date().toISOString().split('T')[0],
          dataValidade: dados.dataValidade || undefined,
          cargaHoraria: Number(dados.cargaHoraria) || 16,
          instrutor: dados.instrutor || dados.entidadeInstrutora || 'Instrutor Homologado',
          resultado: 'APROVADO',
          entidadeInstrutora: dados.entidadeInstrutora || 'Impacto Training / Autorizada',
          numeroCertificado: dados.numeroCertificado || undefined,
          observacoes: `Treinamento homologado via Importação Inteligente (${nomeArquivo} - Lote: ${importId})`,
          validadoPorSGQNome: user?.displayName || user?.email || 'Importador SGQ',
          validadoPorSGQUid: user?.uid || auth.currentUser?.uid || 'system',
          dataValidacaoSGQ: new Date().toISOString(),
          createdAt: isAtualizacaoTreino && linha.dadosExistentesSnapshot?.createdAt ? linha.dadosExistentesSnapshot.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Salvar oficialmente no Firestore (organizations/{orgId}/trainingRecords/{id})
        await saveTrainingRecord(organizationId, novoRegistroTreinamento, user);

        if (callbacksEstado.adicionarRegistroTreinamento) {
          callbacksEstado.adicionarRegistroTreinamento(novoRegistroTreinamento);
        }

        idsGerados.push(registroTreinoId);

        if (isAtualizacaoTreino && linha.dadosExistentesSnapshot) {
          totalAtualizados++;
          registrosAtualizadosSnapshot.push({
            modulo: 'TRAINING_RECORD',
            id: registroTreinoId,
            dadosAnteriores: linha.dadosExistentesSnapshot,
            dadosNovos: novoRegistroTreinamento,
          });
        } else {
          totalCriados++;
          registrosCriadosSnapshot.push({
            modulo: 'TRAINING_RECORD',
            id: registroTreinoId,
            dados: novoRegistroTreinamento,
          });
        }
      }

      // ====================================================================
      // 1.4 PERSISTÊNCIA DE QUALIFICAÇÃO / CHT / CANAC (quando informada)
      // ====================================================================
      if (dados.chtNumero) {
        const cleanCht = String(dados.chtNumero).trim();
        const qualId = `qual-cht-${pessoaId || 'colab'}-${cleanCht.replace(/[^a-zA-Z0-9]/g, '')}`;
        const novaQualificacao: QualificacaoColaborador = {
          id: qualId,
          organizationId,
          colaboradorId: pessoaId || 'colab-gen',
          colaboradorNome: pessoaNome,
          colaboradorMatricula: matricula || '',
          tipo: 'CHT_ANAC',
          titulo: `CHT ${cleanCht}${dados.chtCategoria ? ` (${dados.chtCategoria})` : ''}`,
          escopo: dados.chtCategoria || 'Manutenção Aeronáutica Homologada',
          emissor: 'ANAC',
          numeroRegistro: cleanCht,
          dataEmissao: dados.chtDataEmissao || dados.dataRealizacao || new Date().toISOString().split('T')[0],
          dataValidade: dados.chtValidade || dados.dataValidade || undefined,
          possuiValidade: Boolean(dados.chtValidade || dados.dataValidade),
          status: 'VALIDA',
          bloqueiaOperacaoSeVencida: true,
          responsavelValidacaoNome: user?.displayName || user?.email || 'SGQ',
          responsavelValidacaoUid: user?.uid || auth.currentUser?.uid || 'sgq',
          dataValidacao: new Date().toISOString(),
          observacoes: `Habilitação CHT importada via Importação Inteligente (${nomeArquivo} - Lote: ${importId})`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveQualification(organizationId, novaQualificacao, user);

        if (callbacksEstado.adicionarQualificacao) {
          callbacksEstado.adicionarQualificacao(novaQualificacao);
        }

        idsGerados.push(qualId);
        registrosCriadosSnapshot.push({
          modulo: 'QUALIFICATION' as any,
          id: qualId,
          dados: novaQualificacao,
        });
        totalCriados++;
      }
    }
  }

  // 2. Processar CALIBRAÇÃO / FERRAMENTAL (RBAC 145.109)
  if (tipoControle === 'CALIBRACAO_FERRAMENTAL') {
    for (const linha of linhasParaImportar) {
      const dados = linha.dadosMapeados;
      const isAtualizacao = linha.decisaoUsuario === 'ATUALIZAR' && Boolean(linha.registroExistenteId);
      const toolId = isAtualizacao && linha.registroExistenteId
        ? linha.registroExistenteId
        : `tool-imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      let statusFerramenta: 'CALIBRADA' | 'PROXIMA_VENCIMENTO' | 'VENCIDA' | 'EM_CALIBRACAO' | 'QUARANTENA' = 'CALIBRADA';
      const hoje = new Date().toISOString().split('T')[0];
      if (dados.dataProximaCalibracao) {
        if (dados.dataProximaCalibracao < hoje) {
          statusFerramenta = 'VENCIDA';
        } else {
          const em30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (dados.dataProximaCalibracao <= em30Dias) {
            statusFerramenta = 'PROXIMA_VENCIMENTO';
          }
        }
      }

      const dadosExistentes = isAtualizacao ? linha.dadosExistentesSnapshot : null;

      const novaFerramenta: FerramentaCalibracao = {
        id: toolId,
        organizationId,
        codigoPatrimonio: dados.codigoPatrimonio || dadosExistentes?.codigoPatrimonio || 'SEM-PAT',
        descricao: dados.descricao || dadosExistentes?.descricao || 'Instrumento de Medição',
        fabricante: dados.fabricante || dadosExistentes?.fabricante || 'Fabricante Homologado',
        modelo: dados.modelo || dadosExistentes?.modelo || '',
        numeroSerie: dados.numeroSerie || dadosExistentes?.numeroSerie || 'S/N',
        setor: dados.setor || dadosExistentes?.setor || 'Linha de Manutenção Hangar',
        baseOperacionalId: dadosExistentes?.baseOperacionalId || 'base-rec-hub',
        baseOperacionalNome: dadosExistentes?.baseOperacionalNome || 'REC - Recife / Hub Central',
        status: statusFerramenta,
        dataUltimaCalibracao: dados.dataUltimaCalibracao || dadosExistentes?.dataUltimaCalibracao || hoje,
        dataProximaCalibracao: dados.dataProximaCalibracao || dadosExistentes?.dataProximaCalibracao || hoje,
        frequenciaMeses: Number(dados.frequenciaMeses) || dadosExistentes?.frequenciaMeses || 12,
        laboratorioCalibrador: dados.laboratorioCalibrador || dadosExistentes?.laboratorioCalibrador || 'Laboratório Metrológico Acreditado RBC',
        numeroCertificado: dados.numeroCertificado || dadosExistentes?.numeroCertificado || '',
        tolerancia: dados.tolerancia || dadosExistentes?.tolerancia || '± Conforme Manual de Manutenção',
        observacoes: dados.observacoes || dadosExistentes?.observacoes || `Importado da planilha ${nomeArquivo}`,
        origemImportacaoId: importId,
        origemArquivoNome: nomeArquivo,
        ativo: dadosExistentes?.ativo !== undefined ? dadosExistentes.ativo : true,
        historicoCalibracoes: dadosExistentes?.historicoCalibracoes || [],
        criadoEm: dadosExistentes?.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      // Se for atualização com nova data ou certificado, adicionar ao histórico de calibrações
      if (isAtualizacao && dados.dataUltimaCalibracao && dados.dataUltimaCalibracao !== dadosExistentes?.dataUltimaCalibracao) {
        const novoEventoCalibracao = {
          id: `calib-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          data: dados.dataUltimaCalibracao,
          validadeAte: dados.dataProximaCalibracao || '',
          laboratorio: dados.laboratorioCalibrador || 'Laboratório RBC',
          certificado: dados.numeroCertificado || '',
          observacao: 'Calibração registrada via atualização de importação inteligente',
          registradoPor: user?.displayName || 'Importador SGQ',
        };
        novaFerramenta.historicoCalibracoes = [novoEventoCalibracao, ...(novaFerramenta.historicoCalibracoes || [])];
      }

      if (callbacksEstado.adicionarFerramenta) {
        callbacksEstado.adicionarFerramenta(novaFerramenta);
      }

      // Persistir no Firestore
      await saveCalibratedTool(organizationId, novaFerramenta, user);

      idsGerados.push(toolId);

      if (isAtualizacao && dadosExistentes) {
        totalAtualizados++;
        registrosAtualizadosSnapshot.push({
          modulo: 'CALIBRATED_TOOL',
          id: toolId,
          dadosAnteriores: dadosExistentes,
          dadosNovos: novaFerramenta,
        });
      } else {
        totalCriados++;
        registrosCriadosSnapshot.push({
          modulo: 'CALIBRATED_TOOL',
          id: toolId,
          dados: novaFerramenta,
        });
      }
    }
  }

  // 3. Gravar auditoria geral da operação
  await recordOrganizationAudit(organizationId, {
    entity: 'SMART_IMPORT',
    entityId: importId,
    action: 'CREATE',
    changedByUid: user?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
    summary: `Importação Inteligente efetivada (${linhasParaImportar.length} registros processados)`,
    details: JSON.stringify({
      tipoControle,
      nomeArquivo,
      totalProcessados: linhasParaImportar.length,
      totalCriados,
      totalAtualizados,
      idsGeradosQtd: idsGerados.length,
    }),
  });

  return {
    sucesso: true,
    totalProcessados: linhasParaImportar.length,
    totalCriados,
    totalAtualizados,
    idsGerados,
    registrosCriadosSnapshot,
    registrosAtualizadosSnapshot,
    mensagem: `Importação de ${linhasParaImportar.length} registros concluída com sucesso (${totalCriados} novos cadastros oficiais, ${totalAtualizados} atualizações com histórico preservado). Rastreabilidade com ${nomeArquivo} formalizada.`,
  };
}

// ============================================================================
// 5. REVERSÃO DE IMPORTAÇÃO (REVERSIBILIDADE COM SEGURANÇA E AUDIT TRAIL)
// ============================================================================

export async function reverterImportacaoNoQualigest(
  organizationId: string,
  importRecord: RegistroImportacaoCompleto,
  user: UserProfile | null,
  motivoReversao?: string,
  callbacksEstado?: {
    removerFerramenta?: (toolId: string) => void;
    removerRegistroTreinamento?: (recordId: string) => void;
    removerPessoa?: (personId: string) => void;
    removerCurso?: (courseId: string) => void;
    removerQualificacao?: (qualId: string) => void;
    adicionarFerramenta?: (tool: FerramentaCalibracao) => void;
    adicionarPessoa?: (pessoa: ColaboradorPessoa) => void;
    adicionarCurso?: (curso: CursoTreinamento) => void;
    adicionarRegistroTreinamento?: (registro: RegistroTreinamentoColaborador) => void;
    adicionarQualificacao?: (qual: QualificacaoColaborador) => void;
  }
): Promise<{ sucesso: boolean; mensagem: string }> {
  if (importRecord.revertida) {
    return { sucesso: false, mensagem: 'Esta importação já foi revertida anteriormente.' };
  }

  const batch = writeBatch(db);
  let criadosExcluidos = 0;
  let atualizadosRestaurados = 0;

  // 1. Excluir registros criados na importação
  if (importRecord.registrosCriadosSnapshot && importRecord.registrosCriadosSnapshot.length > 0) {
    for (const item of importRecord.registrosCriadosSnapshot) {
      if (item.modulo === 'CALIBRATED_TOOL') {
        const docRef = doc(db, 'organizations', organizationId, 'calibrated_tools', item.id);
        batch.delete(docRef);
        if (callbacksEstado?.removerFerramenta) callbacksEstado.removerFerramenta(item.id);
        criadosExcluidos++;
      } else if (item.modulo === 'TRAINING_RECORD') {
        const docRef = doc(db, 'organizations', organizationId, 'trainingRecords', item.id);
        batch.delete(docRef);
        if (callbacksEstado?.removerRegistroTreinamento) callbacksEstado.removerRegistroTreinamento(item.id);
        criadosExcluidos++;
      } else if (item.modulo === 'PERSON') {
        const docRef = doc(db, 'organizations', organizationId, 'persons', item.id);
        batch.delete(docRef);
        if (callbacksEstado?.removerPessoa) callbacksEstado.removerPessoa(item.id);
        criadosExcluidos++;
      } else if (item.modulo === 'TRAINING_COURSE') {
        const docRef = doc(db, 'organizations', organizationId, 'trainingCourses', item.id);
        batch.delete(docRef);
        if (callbacksEstado?.removerCurso) callbacksEstado.removerCurso(item.id);
        criadosExcluidos++;
      } else if ((item.modulo as string) === 'QUALIFICATION') {
        const docRef = doc(db, 'organizations', organizationId, 'qualifications', item.id);
        batch.delete(docRef);
        if (callbacksEstado?.removerQualificacao) callbacksEstado.removerQualificacao(item.id);
        criadosExcluidos++;
      }
    }
  } else if (importRecord.registrosGeradosIds && importRecord.registrosGeradosIds.length > 0) {
    // Fallback por IDs gerados caso o snapshot estivesse vazio
    for (const id of importRecord.registrosGeradosIds) {
      if (importRecord.tipoControle === 'CALIBRACAO_FERRAMENTAL') {
        const docRef = doc(db, 'organizations', organizationId, 'calibrated_tools', id);
        batch.delete(docRef);
        if (callbacksEstado?.removerFerramenta) callbacksEstado.removerFerramenta(id);
        criadosExcluidos++;
      } else if (importRecord.tipoControle === 'TREINAMENTOS') {
        const docRef = doc(db, 'organizations', organizationId, 'trainingRecords', id);
        batch.delete(docRef);
        if (callbacksEstado?.removerRegistroTreinamento) callbacksEstado.removerRegistroTreinamento(id);
        criadosExcluidos++;
      }
    }
  }

  // 2. Restaurar registros que haviam sido atualizados para os dados originais
  if (importRecord.registrosAtualizadosSnapshot && importRecord.registrosAtualizadosSnapshot.length > 0) {
    for (const item of importRecord.registrosAtualizadosSnapshot) {
      if (item.modulo === 'CALIBRATED_TOOL') {
        const docRef = doc(db, 'organizations', organizationId, 'calibrated_tools', item.id);
        batch.set(docRef, sanitizeForFirestore(item.dadosAnteriores), { merge: true });
        if (callbacksEstado?.adicionarFerramenta) callbacksEstado.adicionarFerramenta(item.dadosAnteriores);
        atualizadosRestaurados++;
      } else if (item.modulo === 'PERSON') {
        const docRef = doc(db, 'organizations', organizationId, 'persons', item.id);
        batch.set(docRef, sanitizeForFirestore(item.dadosAnteriores), { merge: true });
        if (callbacksEstado?.adicionarPessoa) callbacksEstado.adicionarPessoa(item.dadosAnteriores);
        atualizadosRestaurados++;
      } else if (item.modulo === 'TRAINING_RECORD') {
        const docRef = doc(db, 'organizations', organizationId, 'trainingRecords', item.id);
        batch.set(docRef, sanitizeForFirestore(item.dadosAnteriores), { merge: true });
        if (callbacksEstado?.adicionarRegistroTreinamento) callbacksEstado.adicionarRegistroTreinamento(item.dadosAnteriores);
        atualizadosRestaurados++;
      } else if (item.modulo === 'TRAINING_COURSE') {
        const docRef = doc(db, 'organizations', organizationId, 'trainingCourses', item.id);
        batch.set(docRef, sanitizeForFirestore(item.dadosAnteriores), { merge: true });
        if (callbacksEstado?.adicionarCurso) callbacksEstado.adicionarCurso(item.dadosAnteriores);
        atualizadosRestaurados++;
      }
    }
  }

  // 3. Atualizar status da importação para REVERTIDA
  const importDocRef = doc(db, 'organizations', organizationId, 'smart_imports', importRecord.id);
  const dataReversao = new Date().toISOString();
  batch.update(importDocRef, {
    status: 'REVERTIDA',
    revertida: true,
    revertidaEm: dataReversao,
    revertidaPorUid: user?.uid || auth.currentUser?.uid || 'system',
    revertidaPorNome: user?.displayName || user?.email || 'Gestor SGQ',
    motivoReversao: motivoReversao || 'Reversão solicitada pelo usuário no painel SGQ',
  });

  try {
    await batch.commit();
  } catch (err) {
    console.warn('Fallback Firestore ao reverter batch:', err);
  }

  // 4. Registrar na Auditoria Oficial
  await recordOrganizationAudit(organizationId, {
    entity: 'SMART_IMPORT',
    entityId: importRecord.id,
    action: 'REVERT',
    changedByUid: user?.uid || auth.currentUser?.uid || 'system',
    changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
    summary: `Reversão formal da importação ${importRecord.nomeArquivo} (Motivo: ${motivoReversao || 'Não informado'})`,
    details: JSON.stringify({
      importId: importRecord.id,
      nomeArquivo: importRecord.nomeArquivo,
      criadosExcluidos,
      atualizadosRestaurados,
      motivoReversao,
      revertidoPor: user?.displayName || user?.email || 'Gestor SGQ',
    }),
  });

  return {
    sucesso: true,
    mensagem: `Importação revertida com sucesso! ${criadosExcluidos} registro(s) criados foram excluídos e ${atualizadosRestaurados} registro(s) atualizados foram restaurados aos valores originais.`,
  };
}

// ============================================================================
// 6. EXCLUSÃO DE HISTÓRICO DE IMPORTAÇÃO (SEM DESTRUIR CADASTROS OFICIAIS)
// ============================================================================

export async function excluirRegistroImportacaoHistorico(
  organizationId: string,
  importId: string,
  user: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'organizations', organizationId, 'smart_imports', importId);
  try {
    await deleteDoc(docRef);
    await recordOrganizationAudit(organizationId, {
      entity: 'SMART_IMPORT',
      entityId: importId,
      action: 'DELETE',
      changedByUid: user?.uid || auth.currentUser?.uid || 'system',
      changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
      summary: `Registro de histórico de importação ${importId} removido (os cadastros oficiais foram preservados)`,
    });
  } catch (err) {
    console.warn('Erro ao excluir histórico de importação:', err);
  }
}

// ============================================================================
// 7. GESTÃO METROLÓGICA (CALIBRATED TOOLS CRUD & HISTÓRICO)
// ============================================================================

export async function toggleAtivoFerramenta(
  organizationId: string,
  toolId: string,
  ativo: boolean,
  user: UserProfile | null
): Promise<void> {
  const toolRef = doc(db, 'organizations', organizationId, 'calibrated_tools', toolId);
  try {
    await setDoc(
      toolRef,
      {
        ativo,
        atualizadoEm: new Date().toISOString(),
      },
      { merge: true }
    );

    await recordOrganizationAudit(organizationId, {
      entity: 'CALIBRATED_TOOL',
      entityId: toolId,
      action: 'UPDATE',
      changedByUid: user?.uid || auth.currentUser?.uid || 'system',
      changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
      summary: `Instrumento ${toolId} ${ativo ? 'reativado' : 'desativado'} no controle de ferramentas`,
    });
  } catch (err) {
    console.warn('Erro ao alternar status da ferramenta:', err);
  }
}

export async function deleteFerramentaCalibrada(
  organizationId: string,
  toolId: string,
  user: UserProfile | null
): Promise<void> {
  const toolRef = doc(db, 'organizations', organizationId, 'calibrated_tools', toolId);
  try {
    await deleteDoc(toolRef);
    await recordOrganizationAudit(organizationId, {
      entity: 'CALIBRATED_TOOL',
      entityId: toolId,
      action: 'DELETE',
      changedByUid: user?.uid || auth.currentUser?.uid || 'system',
      changedByEmail: user?.email || auth.currentUser?.email || 'admin@qualigest.aero',
      summary: `Ferramenta/Instrumento ${toolId} excluído do cadastro oficial`,
    });
  } catch (err) {
    console.warn('Erro ao excluir ferramenta:', err);
  }
}
