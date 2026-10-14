import {
  NCRecord,
  CicloAcaoCorretiva,
  AnaliseNaoEficacia,
  AcaoCorretiva,
  UserProfile,
  RegistroAuditoriaNC,
} from '../types';

export interface ValidacaoEncerramentoResultado {
  permitido: boolean;
  pendencias: string[];
}

/**
 * Garante que a NC possua a estrutura de ciclos inicializada de forma compatível
 * com registros existentes sem inventar dados fictícios.
 */
export function garantirCiclosInicializados(nc: NCRecord): NCRecord {
  if (nc.ciclosAcaoCorretiva && nc.ciclosAcaoCorretiva.length > 0) {
    return {
      ...nc,
      cicloAtualNumero: nc.cicloAtualNumero || nc.ciclosAcaoCorretiva.length,
      analisesNaoEficacia: nc.analisesNaoEficacia || [],
    };
  }

  // Se ainda não tem ciclos cadastrados, cria o Ciclo 1 a partir dos dados existentes
  const ciclo1: CicloAcaoCorretiva = {
    id: `ciclo-1-${nc.id}`,
    numeroCiclo: 1,
    dataAbertura: nc.dataIdentificacao || nc.criadoEm?.split('T')[0] || new Date().toISOString().split('T')[0],
    dataEncerramentoCiclo: nc.dataEncerramento || (nc.verificacaoEficacia?.encerrado === 'SIM' ? nc.verificacaoEficacia.dataVerificacao : undefined),
    motivoAbertura: 'Abertura original da Não Conformidade',
    statusCiclo:
      nc.verificacaoEficacia?.encerrado === 'SIM'
        ? 'CONCLUIDO_EFICAZ'
        : nc.verificacaoEficacia?.encerrado === 'NÃO'
        ? 'INEFICAZ_REABERTO'
        : nc.acaoCorretiva?.status === 'Concluída'
        ? 'AGUARDANDO_EFICACIA'
        : 'EM_ANDAMENTO',
    preAnaliseContencao: nc.preAnaliseContencao,
    analiseCausaRaiz: nc.analiseCausaRaiz,
    acaoCorretiva: { ...nc.acaoCorretiva },
    verificacaoEficacia: { ...nc.verificacaoEficacia },
    historicoPrazos: nc.historicoPrazos ? [...nc.historicoPrazos] : [],
    registradoPor: nc.auditor || 'SGQ',
    criadoEm: nc.criadoEm || new Date().toISOString(),
    atualizadoEm: nc.atualizadoEm || new Date().toISOString(),
  };

  return {
    ...nc,
    cicloAtualNumero: 1,
    ciclosAcaoCorretiva: [ciclo1],
    analisesNaoEficacia: nc.analisesNaoEficacia || [],
  };
}

/**
 * Retorna o ciclo ativo/atual da NC
 */
export function obterCicloAtual(nc: NCRecord): CicloAcaoCorretiva | null {
  const ncNorm = garantirCiclosInicializados(nc);
  const ciclos = ncNorm.ciclosAcaoCorretiva || [];
  const atualNumero = ncNorm.cicloAtualNumero || ciclos.length || 1;
  return ciclos.find((c) => c.numeroCiclo === atualNumero) || ciclos[ciclos.length - 1] || null;
}

/**
 * Registra a Análise de Não Eficácia e instancia um Novo Ciclo de Ação Corretiva
 * vinculado à NC original, preservando 100% dos dados da primeira e anteriores ações.
 */
export function registrarAnaliseNaoEficaciaECriarNovoCiclo(
  ncOriginal: NCRecord,
  dadosAnalise: {
    resultadoEsperado: string;
    resultadoObservado: string;
    evidenciasNaoEficacia: string;
    justificativaInsucesso: string;
    causaRaizContinuaValida: 'SIM' | 'NAO' | 'REQUER_REVISAO';
    justificativaCausaRaiz?: string;
    fatoresContribuintes?: string;
    mudancasAdotadasNovaTentativa: string;
    dataAnalise?: string;
    responsavelAnalise: string;
  },
  novaAcaoProposta: {
    descricao: string;
    comoSeraFeito?: string;
    responsavel: string;
    dataPrazo: string;
    dataPrevistaEficacia?: string;
  },
  userProfile?: UserProfile | null
): { ncAtualizada: NCRecord; novoCiclo: CicloAcaoCorretiva } {
  if (userProfile?.role === 'CONSULTA') {
    throw new Error('Permissão negada: Usuários com perfil CONSULTA não podem reabrir NCs ou criar novos ciclos.');
  }

  if (!dadosAnalise.resultadoEsperado?.trim()) {
    throw new Error('Validação de Eficácia: O resultado esperado da ação anterior deve ser informado.');
  }
  if (!dadosAnalise.resultadoObservado?.trim()) {
    throw new Error('Validação de Eficácia: O resultado efetivamente observado deve ser informado.');
  }
  if (!dadosAnalise.evidenciasNaoEficacia?.trim()) {
    throw new Error('Validação de Eficácia: As evidências objetivas da não eficácia são obrigatórias.');
  }
  if (!dadosAnalise.justificativaInsucesso?.trim()) {
    throw new Error('Validação de Eficácia: A justificativa técnica do insucesso da ação anterior é obrigatória.');
  }
  if (!dadosAnalise.mudancasAdotadasNovaTentativa?.trim()) {
    throw new Error('Validação de Eficácia: Informe quais mudanças serão adotadas na nova tentativa.');
  }
  if (!novaAcaoProposta.descricao?.trim()) {
    throw new Error('Validação de Eficácia: A descrição da nova ação corretiva é obrigatória.');
  }
  if (!novaAcaoProposta.responsavel?.trim()) {
    throw new Error('Validação de Eficácia: O responsável pela nova ação corretiva é obrigatório.');
  }
  if (!novaAcaoProposta.dataPrazo?.trim()) {
    throw new Error('Validação de Eficácia: O prazo da nova ação corretiva é obrigatório.');
  }

  const ncNorm = garantirCiclosInicializados(ncOriginal);
  const ciclosExistentes = [...(ncNorm.ciclosAcaoCorretiva || [])];
  const cicloAtualIndex = ciclosExistentes.findIndex((c) => c.numeroCiclo === ncNorm.cicloAtualNumero);

  const hoje = new Date().toISOString().split('T')[0];
  const agora = new Date().toISOString();
  const dataAnaliseFinal = dadosAnalise.dataAnalise || hoje;
  const cicloOrigemNum = ncNorm.cicloAtualNumero || 1;

  const analiseObj: AnaliseNaoEficacia = {
    id: `analise-ineficacia-${ncNorm.id}-c${cicloOrigemNum}-${Date.now()}`,
    dataAnalise: dataAnaliseFinal,
    responsavelAnalise: dadosAnalise.responsavelAnalise || userProfile?.displayName || userProfile?.email || 'Auditor SGQ',
    resultadoEsperado: dadosAnalise.resultadoEsperado.trim(),
    resultadoObservado: dadosAnalise.resultadoObservado.trim(),
    evidenciasNaoEficacia: dadosAnalise.evidenciasNaoEficacia.trim(),
    justificativaInsucesso: dadosAnalise.justificativaInsucesso.trim(),
    causaRaizContinuaValida: dadosAnalise.causaRaizContinuaValida,
    justificativaCausaRaiz: dadosAnalise.justificativaCausaRaiz?.trim(),
    fatoresContribuintes: dadosAnalise.fatoresContribuintes?.trim(),
    mudancasAdotadasNovaTentativa: dadosAnalise.mudancasAdotadasNovaTentativa.trim(),
    cicloOrigemNumero: cicloOrigemNum,
  };

  // 1. Arquivar o ciclo anterior sem sobrescrever seus dados
  if (cicloAtualIndex >= 0) {
    ciclosExistentes[cicloAtualIndex] = {
      ...ciclosExistentes[cicloAtualIndex],
      statusCiclo: 'INEFICAZ_REABERTO',
      dataEncerramentoCiclo: dataAnaliseFinal,
      verificacaoEficacia: {
        ...ciclosExistentes[cicloAtualIndex].verificacaoEficacia,
        encerrado: 'NÃO',
        resultado: 'INEFICAZ',
        dataVerificacao: dataAnaliseFinal,
        motivo: dadosAnalise.justificativaInsucesso,
        evidencias: dadosAnalise.evidenciasNaoEficacia,
        auditorVerificador: dadosAnalise.responsavelAnalise,
      },
      atualizadoEm: agora,
    };
  }

  // 2. Criar o novo ciclo
  const novoNumeroCiclo = cicloOrigemNum + 1;
  const prazoEficaciaPrevisto =
    novaAcaoProposta.dataPrevistaEficacia ||
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const novaCausaRaiz =
    dadosAnalise.causaRaizContinuaValida === 'SIM'
      ? { ...ncNorm.analiseCausaRaiz }
      : {
          ...ncNorm.analiseCausaRaiz,
          statusValidacao: 'HIPÓTESE – REQUER VALIDAÇÃO HUMANA' as const,
          detalhes: `${ncNorm.analiseCausaRaiz.detalhes}\n[Revisão Ciclo ${novoNumeroCiclo}]: ${dadosAnalise.justificativaCausaRaiz || 'Causa raiz sob reavaliação decorrente de não eficácia no ciclo anterior.'}`,
        };

  const novoCiclo: CicloAcaoCorretiva = {
    id: `ciclo-${novoNumeroCiclo}-${ncNorm.id}`,
    numeroCiclo: novoNumeroCiclo,
    dataAbertura: dataAnaliseFinal,
    motivoAbertura: `Reabertura por Ineficácia da Ação do Ciclo ${cicloOrigemNum}`,
    statusCiclo: 'EM_ANDAMENTO',
    analiseNaoEficaciaAnterior: analiseObj,
    preAnaliseContencao: ncNorm.preAnaliseContencao,
    analiseCausaRaiz: novaCausaRaiz,
    acaoCorretiva: {
      descricao: novaAcaoProposta.descricao.trim(),
      comoSeraFeito: novaAcaoProposta.comoSeraFeito?.trim() || '',
      responsavel: novaAcaoProposta.responsavel.trim(),
      dataPrazo: novaAcaoProposta.dataPrazo.trim(),
      status: 'Não Iniciada',
      validadoPorHumano: true,
    },
    verificacaoEficacia: {
      metodo: 'Documental',
      encerrado: 'Pendente',
      resultado: 'PENDENTE',
      dataPrevista: prazoEficaciaPrevisto,
      prazoEficacia: prazoEficaciaPrevisto,
    },
    historicoPrazos: [],
    registradoPor: userProfile?.displayName || userProfile?.email || 'SGQ',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  ciclosExistentes.push(novoCiclo);

  // 3. Atualizar a NC preservando o histórico auditável
  const novoRegistroAuditoria: RegistroAuditoriaNC = {
    id: `audit-${Date.now()}`,
    dataHora: agora,
    data: dataAnaliseFinal,
    usuario: userProfile?.displayName || userProfile?.email || 'SGQ',
    campoAlterado: 'ciclosAcaoCorretiva',
    valorAnterior: `Ciclo ${cicloOrigemNum} (Em Andamento/Eficácia)`,
    novoValor: `Ciclo ${novoNumeroCiclo} Iniciado (Ação: ${novaAcaoProposta.descricao.substring(0, 60)}...)`,
    tipoEvento: 'REABERTURA_NOVO_CICLO',
    justificativa: `Ação anterior considerada ineficaz no Ciclo ${cicloOrigemNum}. Novo ciclo instaurado com prazo ${novaAcaoProposta.dataPrazo}.`,
  };

  const ncAtualizada: NCRecord = {
    ...ncNorm,
    statusGeral: 'Reaberta',
    cicloAtualNumero: novoNumeroCiclo,
    ciclosAcaoCorretiva: ciclosExistentes,
    analisesNaoEficacia: [...(ncNorm.analisesNaoEficacia || []), analiseObj],
    // Top-level reflete o ciclo ativo atual para compatibilidade plena com views existentes
    acaoCorretiva: { ...novoCiclo.acaoCorretiva },
    verificacaoEficacia: { ...novoCiclo.verificacaoEficacia },
    analiseCausaRaiz: { ...novoCiclo.analiseCausaRaiz },
    dataEncerramento: undefined,
    dataConclusaoTratamento: undefined,
    prazoEficacia: prazoEficaciaPrevisto,
    atualizadoEm: agora,
    trilhaAuditoria: [...(ncNorm.trilhaAuditoria || []), novoRegistroAuditoria],
  };

  return { ncAtualizada, novoCiclo };
}

/**
 * Validação rigorosa para impedir encerramento indevido de NCs
 * quando houver pendências técnicas obrigatórias.
 */
export function validarEncerramentoNC(nc: NCRecord): ValidacaoEncerramentoResultado {
  const pendencias: string[] = [];

  if (!nc.descricaoNC || !nc.descricaoNC.trim()) {
    pendencias.push('Descrição da Não Conformidade é obrigatória.');
  }

  if (!nc.analiseCausaRaiz?.detalhes || !nc.analiseCausaRaiz.detalhes.trim()) {
    pendencias.push('Análise da causa raiz deve estar documentada.');
  }

  if (nc.analiseCausaRaiz?.statusValidacao === 'HIPÓTESE – REQUER VALIDAÇÃO HUMANA') {
    pendencias.push('A causa raiz está marcada como hipótese e requer validação humana formal.');
  }

  if (!nc.acaoCorretiva?.descricao || !nc.acaoCorretiva.descricao.trim()) {
    pendencias.push('Plano de ação corretiva deve estar documentado.');
  }

  if (nc.acaoCorretiva?.status !== 'Concluída') {
    pendencias.push(`Ação corretiva do ciclo atual não está concluída (Status atual: "${nc.acaoCorretiva?.status || 'Não Iniciada'}").`);
  }

  if (nc.verificacaoEficacia?.encerrado === 'NÃO') {
    pendencias.push('Ação corretiva foi avaliada como NÃO EFICAZ. A NC deve ser reaberta com um novo ciclo de ação.');
  }

  if (nc.verificacaoEficacia?.encerrado === 'Pendente' || !nc.verificacaoEficacia?.dataVerificacao) {
    pendencias.push('A verificação de eficácia ainda está pendente de auditoria formal.');
  }

  return {
    permitido: pendencias.length === 0,
    pendencias,
  };
}
