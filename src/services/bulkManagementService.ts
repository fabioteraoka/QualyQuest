import { doc, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import {
  ColaboradorPessoa,
  FerramentaCalibracao,
  StatusColaborador,
  UserProfile,
  RegistroTreinamentoColaborador,
  CompetenciaColaborador,
  QualificacaoColaborador,
  DocumentoEvidenciaPessoa,
} from '../types';
import { sanitizeForFirestore, recordOrganizationAudit } from './firebase/firestore';
import { verificarDependenciasPessoa, DependenciasPessoaResult } from './firebase/competenciesFirestore';

export type TipoAcaoLoteColaborador = 'EXCLUIR' | 'INATIVAR' | 'REATIVAR' | 'CLASSIFICAR_STATUS';
export type TipoAcaoLoteFerramenta = 'EXCLUIR' | 'INATIVAR' | 'REATIVAR';

export interface ItemAnaliseLote<T> {
  item: T;
  permitido: boolean;
  motivoBloqueio?: string;
  detalhesBloqueio?: string[];
  dependencias?: any;
}

export interface ResultadoAnaliseLote<T> {
  totalSelecionado: number;
  permitidos: ItemAnaliseLote<T>[];
  bloqueados: ItemAnaliseLote<T>[];
  podeProcessarParcial: boolean;
}

export interface ResultadoExecucaoLote {
  sucesso: boolean;
  totalProcessados: number;
  totalBloqueados: number;
  mensagem: string;
  idsAfetados: string[];
}

/**
 * Analisa dependências de colaboradores selecionados para uma determinada ação
 */
export function analisarLoteColaboradores(
  colaboradores: ColaboradorPessoa[],
  acao: TipoAcaoLoteColaborador,
  contexto: {
    trainingRecords: RegistroTreinamentoColaborador[];
    personCompetencies: CompetenciaColaborador[];
    qualifications: QualificacaoColaborador[];
    documents: DocumentoEvidenciaPessoa[];
    nonConformities: any[];
  }
): ResultadoAnaliseLote<ColaboradorPessoa> {
  const permitidos: ItemAnaliseLote<ColaboradorPessoa>[] = [];
  const bloqueados: ItemAnaliseLote<ColaboradorPessoa>[] = [];

  for (const colab of colaboradores) {
    if (acao === 'EXCLUIR') {
      const dep = verificarDependenciasPessoa(
        colab.id,
        contexto.trainingRecords,
        contexto.personCompetencies,
        contexto.qualifications,
        contexto.documents,
        contexto.nonConformities
      );

      if (dep.podeExcluir) {
        permitidos.push({
          item: colab,
          permitido: true,
          dependencias: dep,
        });
      } else {
        bloqueados.push({
          item: colab,
          permitido: false,
          motivoBloqueio: `Possui ${dep.totalVinculos} vínculo(s) histórico(s) regulatório(s) impeditivo(s)`,
          detalhesBloqueio: dep.motivosBloqueio,
          dependencias: dep,
        });
      }
    } else if (acao === 'INATIVAR') {
      if (colab.status === 'INATIVO' || colab.status === 'DESLIGADO') {
        bloqueados.push({
          item: colab,
          permitido: false,
          motivoBloqueio: 'Colaborador já se encontra inativo ou desligado',
        });
      } else {
        permitidos.push({ item: colab, permitido: true });
      }
    } else if (acao === 'REATIVAR') {
      if (colab.status === 'ATIVO') {
        bloqueados.push({
          item: colab,
          permitido: false,
          motivoBloqueio: 'Colaborador já se encontra no status ATIVO',
        });
      } else {
        permitidos.push({ item: colab, permitido: true });
      }
    } else if (acao === 'CLASSIFICAR_STATUS') {
      permitidos.push({ item: colab, permitido: true });
    }
  }

  return {
    totalSelecionado: colaboradores.length,
    permitidos,
    bloqueados,
    podeProcessarParcial: permitidos.length > 0 && bloqueados.length > 0,
  };
}

/**
 * Executa em lote a ação aprovada para Colaboradores
 */
export async function executarLoteColaboradores(
  organizationId: string,
  colaboradoresPermitidos: ColaboradorPessoa[],
  acao: TipoAcaoLoteColaborador,
  options: {
    motivo: string;
    novoStatus?: StatusColaborador;
    statusCustomizado?: string;
  },
  userProfile?: UserProfile | null
): Promise<ResultadoExecucaoLote> {
  if (!colaboradoresPermitidos || colaboradoresPermitidos.length === 0) {
    return {
      sucesso: false,
      totalProcessados: 0,
      totalBloqueados: 0,
      mensagem: 'Nenhum registro elegível para processamento.',
      idsAfetados: [],
    };
  }

  if (acao === 'EXCLUIR' && userProfile?.role && userProfile.role !== 'ADMIN' && userProfile.role !== 'GESTOR_SGQ') {
    throw new Error('Permissão negada: Exclusão em lote é estritamente restrita a GESTOR_SGQ e ADMIN.');
  }

  const agora = new Date().toISOString();
  const userName = userProfile?.displayName || auth.currentUser?.displayName || 'Gestor SGQ';
  const userUid = userProfile?.uid || auth.currentUser?.uid || 'anon';
  const userEmail = userProfile?.email || auth.currentUser?.email || 'anon@qualigest.aero';

  // Processamento em batches de no máximo 450 (limite Firestore = 500)
  const CHUNK_SIZE = 450;
  const chunks: ColaboradorPessoa[][] = [];
  for (let i = 0; i < colaboradoresPermitidos.length; i += CHUNK_SIZE) {
    chunks.push(colaboradoresPermitidos.slice(i, i + CHUNK_SIZE));
  }

  const idsAfetados: string[] = [];

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    for (const colab of chunk) {
      const docRef = doc(db, 'organizations', organizationId, 'persons', colab.id);
      idsAfetados.push(colab.id);

      if (acao === 'EXCLUIR') {
        batch.delete(docRef);
      } else if (acao === 'INATIVAR') {
        batch.set(
          docRef,
          sanitizeForFirestore({
            status: 'INATIVO',
            updatedAt: agora,
            inativadoEm: agora,
            inativadoPor: userName,
            motivoInativacao: options.motivo || 'Inativação em lote via gestão centralizada SGQ',
          }),
          { merge: true }
        );
      } else if (acao === 'REATIVAR') {
        batch.set(
          docRef,
          sanitizeForFirestore({
            status: 'ATIVO',
            updatedAt: agora,
            reativadoEm: agora,
            reativadoPor: userName,
            motivoReativacao: options.motivo || 'Reativação em lote via gestão centralizada SGQ',
          }),
          { merge: true }
        );
      } else if (acao === 'CLASSIFICAR_STATUS') {
        const payload: Record<string, any> = {
          status: options.novoStatus || 'ATIVO',
          updatedAt: agora,
        };
        if (options.statusCustomizado) {
          payload.statusCustomizado = options.statusCustomizado;
        }
        batch.set(docRef, sanitizeForFirestore(payload), { merge: true });
      }
    }

    await batch.commit();
  }

  // Registro de Auditoria Global da Operação em Lote
  await recordOrganizationAudit(organizationId, {
    entity: 'PERSON',
    entityId: `BULK-${acao}-${Date.now()}`,
    action: acao === 'EXCLUIR' ? 'DELETE' : acao === 'INATIVAR' ? 'INACTIVATE' : 'UPDATE',
    changedByUid: userUid,
    changedByEmail: userEmail,
    summary: `Operação em lote (${acao}) executada em ${idsAfetados.length} colaborador(es). Motivo: ${options.motivo}`,
    newValue: JSON.stringify({
      acao,
      totalAfetados: idsAfetados.length,
      novoStatus: options.novoStatus,
      motivo: options.motivo,
      ids: idsAfetados.slice(0, 50),
    }),
    reason: options.motivo || `Gestão em lote de colaboradores: ${acao}`,
    origin: 'PESSOAS_COMPETENCIAS_LOTE',
  });

  return {
    sucesso: true,
    totalProcessados: idsAfetados.length,
    totalBloqueados: 0,
    mensagem: `Operação de ${acao.toLowerCase()} concluída com sucesso para ${idsAfetados.length} colaborador(es).`,
    idsAfetados,
  };
}

/**
 * Analisa instrumentos/ferramentas para ação em lote
 */
export function analisarLoteFerramentas(
  ferramentas: FerramentaCalibracao[],
  acao: TipoAcaoLoteFerramenta
): ResultadoAnaliseLote<FerramentaCalibracao> {
  const permitidos: ItemAnaliseLote<FerramentaCalibracao>[] = [];
  const bloqueados: ItemAnaliseLote<FerramentaCalibracao>[] = [];

  for (const f of ferramentas) {
    if (acao === 'EXCLUIR') {
      const historicoLen = f.historicoCalibracoes?.length || 0;
      // Se tem mais de 1 calibração histórica, a exclusão física é bloqueada para auditoria metrológica
      if (historicoLen > 1) {
        bloqueados.push({
          item: f,
          permitido: false,
          motivoBloqueio: `Possui ${historicoLen} calibrações registradas no histórico. Conforme RBAC 145.109, utilize a Inativação.`,
        });
      } else {
        permitidos.push({ item: f, permitido: true });
      }
    } else if (acao === 'INATIVAR') {
      if (f.ativo === false) {
        bloqueados.push({
          item: f,
          permitido: false,
          motivoBloqueio: 'Instrumento já está inativo no sistema.',
        });
      } else {
        permitidos.push({ item: f, permitido: true });
      }
    } else if (acao === 'REATIVAR') {
      if (f.ativo !== false) {
        bloqueados.push({
          item: f,
          permitido: false,
          motivoBloqueio: 'Instrumento já está ativo no sistema.',
        });
      } else {
        permitidos.push({ item: f, permitido: true });
      }
    }
  }

  return {
    totalSelecionado: ferramentas.length,
    permitidos,
    bloqueados,
    podeProcessarParcial: permitidos.length > 0 && bloqueados.length > 0,
  };
}

/**
 * Executa em lote a ação em Ferramentas e Instrumentos
 */
export async function executarLoteFerramentas(
  organizationId: string,
  ferramentasPermitidas: FerramentaCalibracao[],
  acao: TipoAcaoLoteFerramenta,
  options: { motivo: string },
  userProfile?: UserProfile | null
): Promise<ResultadoExecucaoLote> {
  if (!ferramentasPermitidas || ferramentasPermitidas.length === 0) {
    return {
      sucesso: false,
      totalProcessados: 0,
      totalBloqueados: 0,
      mensagem: 'Nenhum instrumento elegível para processamento.',
      idsAfetados: [],
    };
  }

  const agora = new Date().toISOString();
  const userName = userProfile?.displayName || auth.currentUser?.displayName || 'Gestor SGQ';
  const userUid = userProfile?.uid || auth.currentUser?.uid || 'anon';
  const userEmail = userProfile?.email || auth.currentUser?.email || 'anon@qualigest.aero';

  const CHUNK_SIZE = 450;
  const chunks: FerramentaCalibracao[][] = [];
  for (let i = 0; i < ferramentasPermitidas.length; i += CHUNK_SIZE) {
    chunks.push(ferramentasPermitidas.slice(i, i + CHUNK_SIZE));
  }

  const idsAfetados: string[] = [];

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    for (const f of chunk) {
      const docRef = doc(db, 'organizations', organizationId, 'calibrated_tools', f.id);
      idsAfetados.push(f.id);

      if (acao === 'EXCLUIR') {
        batch.delete(docRef);
      } else if (acao === 'INATIVAR') {
        batch.set(
          docRef,
          sanitizeForFirestore({
            ativo: false,
            atualizadoEm: agora,
            motivoInativacao: options.motivo || 'Inativação em lote de instrumentos',
          }),
          { merge: true }
        );
      } else if (acao === 'REATIVAR') {
        batch.set(
          docRef,
          sanitizeForFirestore({
            ativo: true,
            atualizadoEm: agora,
            motivoReativacao: options.motivo || 'Reativação em lote de instrumentos',
          }),
          { merge: true }
        );
      }
    }

    await batch.commit();
  }

  await recordOrganizationAudit(organizationId, {
    entity: 'CALIBRATED_TOOL',
    entityId: `BULK-TOOLS-${acao}-${Date.now()}`,
    action: acao === 'EXCLUIR' ? 'DELETE' : 'UPDATE',
    changedByUid: userUid,
    changedByEmail: userEmail,
    summary: `Operação em lote (${acao}) executada em ${idsAfetados.length} instrumento(s). Motivo: ${options.motivo}`,
    newValue: JSON.stringify({
      acao,
      totalAfetados: idsAfetados.length,
      motivo: options.motivo,
      ids: idsAfetados.slice(0, 50),
    }),
    reason: options.motivo || `Gestão em lote de ferramentas: ${acao}`,
    origin: 'FERRAMENTAS_METROLOGIA_LOTE',
  });

  return {
    sucesso: true,
    totalProcessados: idsAfetados.length,
    totalBloqueados: 0,
    mensagem: `Operação de ${acao.toLowerCase()} concluída para ${idsAfetados.length} instrumento(s).`,
    idsAfetados,
  };
}
