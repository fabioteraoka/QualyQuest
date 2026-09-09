import {
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  DocumentoEvidenciaPessoa,
  AtividadeCompetenciaRequerida,
  GapCompetenciaItem,
  FaixaVencimentoItem,
  CompetenciasDashboardMetrics,
  SugestaoIACompetencia,
  NCRecord,
  ConstatacaoExternaRecord,
} from '../types';

/**
 * Calcula a data de validade com base na periodicidade (em meses) e tolerância (em dias).
 */
export function calcularDataValidadeComTolerancia(
  dataInicio: string,
  meses: number,
  toleranciaDias: number = 0
): string {
  if (!dataInicio) return '';
  const parts = dataInicio.split('T')[0].split('-');
  if (parts.length < 3) return '';
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);

  const d = new Date(ano, mes + meses, dia);
  if (toleranciaDias > 0) {
    d.setDate(d.getDate() + toleranciaDias);
  }
  return d.toISOString().split('T')[0];
}

/**
 * Normaliza e calcula a diferença de dias entre a data informada e a data atual (fuso local).
 */
export function calcularDiasParaVencimento(dataIsoOuYmd?: string): number | null {
  if (!dataIsoOuYmd) return null;
  const parts = dataIsoOuYmd.split('T')[0].split('-');
  if (parts.length < 3) return null;
  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);

  const dataAlvo = new Date(ano, mes, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffMs = dataAlvo.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classifica a validade em faixas temporais padronizadas do SGQ.
 */
export function classificarFaixaVencimento(
  diasParaVencer: number | null,
  possuiValidade: boolean = true
): 'VENCIDO' | 'HOJE' | '7_DIAS' | '15_DIAS' | '30_DIAS' | '60_DIAS' | '90_DIAS' | 'FUTURO' | 'SEM_VALIDADE' {
  if (!possuiValidade || diasParaVencer === null) {
    return 'SEM_VALIDADE';
  }
  if (diasParaVencer < 0) return 'VENCIDO';
  if (diasParaVencer === 0) return 'HOJE';
  if (diasParaVencer <= 7) return '7_DIAS';
  if (diasParaVencer <= 15) return '15_DIAS';
  if (diasParaVencer <= 30) return '30_DIAS';
  if (diasParaVencer <= 60) return '60_DIAS';
  if (diasParaVencer <= 90) return '90_DIAS';
  return 'FUTURO';
}

/**
 * Verifica se um colaborador pode executar uma atividade específica
 * de acordo com a matriz Atividade x Competência x Qualificação e regras de bloqueio.
 */
export function verificarPodeExecutarAtividade(
  colaborador: ColaboradorPessoa,
  atividade: AtividadeCompetenciaRequerida,
  competenciasColaborador: CompetenciaColaborador[],
  qualificacoesColaborador: QualificacaoColaborador[],
  treinamentosColaborador: RegistroTreinamentoColaborador[]
): {
  podeExecutar: boolean;
  motivosBloqueio: string[];
  alertasNaoImpeditivos: string[];
  impedeExecucao: boolean;
  gaps: GapCompetenciaItem[];
} {
  const motivosBloqueio: string[] = [];
  const alertasNaoImpeditivos: string[] = [];
  const gaps: GapCompetenciaItem[] = [];
  const hojeStr = new Date().toISOString().split('T')[0];

  // 1. Verificação do Status do Colaborador (Inativo, Afastado ou Desligado)
  if (colaborador.status !== 'ATIVO') {
    motivosBloqueio.push(`Colaborador com status ${colaborador.status} não está disponível para execução operacional.`);
    return {
      podeExecutar: false,
      motivosBloqueio,
      alertasNaoImpeditivos,
      impedeExecucao: true,
      gaps,
    };
  }

  // 2. Verificação de Restrição Operacional individual
  if (colaborador.restricaoOperacional?.possuiRestricao) {
    const desc = colaborador.restricaoOperacional.motivo || 'Restrição operacional ativa registrada';
    if (colaborador.restricaoOperacional.impedeExecucao) {
      motivosBloqueio.push(`BLOQUEIO OPERACIONAL INDIVIDUAL: ${desc}`);
    } else {
      alertasNaoImpeditivos.push(`ALERTA DE RESTRIÇÃO: ${desc}`);
    }
  }

  // 3. Verificação de Competências Requeridas
  for (const req of atividade.competenciasExigidas || []) {
    const compColab = competenciasColaborador.find(
      (c) => c.competenciaId === req.competenciaId && c.colaboradorId === colaborador.id
    );

    if (!compColab) {
      const msg = `Competência ausente: "${req.competenciaNome}" (Nível mínimo requerido: ${req.nivelMinimo})`;
      if (atividade.impedeExecucaoSemQualificacao) {
        motivosBloqueio.push(msg);
      } else {
        alertasNaoImpeditivos.push(msg);
      }
      gaps.push({
        id: `gap-${colaborador.id}-${req.competenciaId}-${Date.now()}`,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        colaboradorMatricula: colaborador.matricula,
        setor: colaborador.setor,
        funcao: colaborador.funcao,
        competenciaId: req.competenciaId,
        competenciaNome: req.competenciaNome,
        tipoGap: 'COMPETENCIA_AUSENTE',
        descricaoGap: msg,
        nivelRequerido: req.nivelMinimo,
        nivelAtual: 0,
        criticidade: atividade.criticidade === 'CRITICA_SEGURANCA' ? 'CRITICA' : 'ALTA',
        bloqueiaOperacao: atividade.impedeExecucaoSemQualificacao,
        dataIdentificacao: hojeStr,
      });
    } else if (compColab.nivelAtual < req.nivelMinimo) {
      const msg = `Nível insuficiente na competência "${req.competenciaNome}": possui Nível ${compColab.nivelAtual}, requerido Nível ${req.nivelMinimo}`;
      if (atividade.impedeExecucaoSemQualificacao) {
        motivosBloqueio.push(msg);
      } else {
        alertasNaoImpeditivos.push(msg);
      }
      gaps.push({
        id: `gap-${colaborador.id}-${req.competenciaId}-lvl`,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        colaboradorMatricula: colaborador.matricula,
        setor: colaborador.setor,
        funcao: colaborador.funcao,
        competenciaId: req.competenciaId,
        competenciaNome: req.competenciaNome,
        tipoGap: 'NIVEL_INSUFICIENTE',
        descricaoGap: msg,
        nivelRequerido: req.nivelMinimo,
        nivelAtual: compColab.nivelAtual,
        criticidade: 'ALTA',
        bloqueiaOperacao: atividade.impedeExecucaoSemQualificacao,
        dataIdentificacao: hojeStr,
      });
    } else if (compColab.status === 'SUSPENSO' || compColab.status === 'BLOQUEADO') {
      motivosBloqueio.push(`Competência "${req.competenciaNome}" está ${compColab.status}.`);
    } else if (compColab.status === 'VENCIDO') {
      const msg = `Competência "${req.competenciaNome}" está com validade VENCIDA.`;
      if (atividade.impedeExecucaoSemQualificacao) {
        motivosBloqueio.push(msg);
      } else {
        alertasNaoImpeditivos.push(msg);
      }
    }
  }

  // 4. Verificação de Qualificações Exigidas (ex: CHT ANAC, RII, NDT)
  if (atividade.qualificacoesExigidasTipos && atividade.qualificacoesExigidasTipos.length > 0) {
    for (const tipoQualif of atividade.qualificacoesExigidasTipos) {
      const qualif = qualificacoesColaborador.find(
        (q) => q.tipo === tipoQualif && q.colaboradorId === colaborador.id
      );

      if (!qualif) {
        const msg = `Qualificação obrigatória ausente: tipo "${tipoQualif}"`;
        if (atividade.impedeExecucaoSemQualificacao) {
          motivosBloqueio.push(msg);
        } else {
          alertasNaoImpeditivos.push(msg);
        }
      } else {
        const dias = calcularDiasParaVencimento(qualif.dataValidade);
        if (qualif.possuiValidade && dias !== null && dias < 0) {
          const msg = `Qualificação "${qualif.titulo}" (${qualif.numeroRegistro}) está VENCIDA desde ${qualif.dataValidade}`;
          if (qualif.bloqueiaOperacaoSeVencida || atividade.impedeExecucaoSemQualificacao) {
            motivosBloqueio.push(msg);
          } else {
            alertasNaoImpeditivos.push(msg);
          }
          gaps.push({
            id: `gap-qualif-${qualif.id}`,
            colaboradorId: colaborador.id,
            colaboradorNome: colaborador.nome,
            colaboradorMatricula: colaborador.matricula,
            setor: colaborador.setor,
            funcao: colaborador.funcao,
            tipoGap: 'QUALIFICACAO_VENCIDA',
            descricaoGap: msg,
            criticidade: 'CRITICA',
            bloqueiaOperacao: qualif.bloqueiaOperacaoSeVencida || atividade.impedeExecucaoSemQualificacao,
            dataIdentificacao: hojeStr,
          });
        }
      }
    }
  }

  // 5. Verificação de Treinamentos Mandatórios
  if (atividade.treinamentosMandatoriosIds && atividade.treinamentosMandatoriosIds.length > 0) {
    for (const cursoId of atividade.treinamentosMandatoriosIds) {
      const registro = treinamentosColaborador.find(
        (t) => t.treinamentoId === cursoId && t.colaboradorId === colaborador.id && t.resultado === 'APROVADO'
      );
      if (!registro) {
        const msg = `Treinamento mandatório não realizado ou não aprovado (Curso ID: ${cursoId})`;
        if (atividade.impedeExecucaoSemQualificacao) {
          motivosBloqueio.push(msg);
        } else {
          alertasNaoImpeditivos.push(msg);
        }
      } else {
        const dias = calcularDiasParaVencimento(registro.dataValidade);
        if (dias !== null && dias < 0) {
          const msg = `Treinamento mandatório "${registro.treinamentoTitulo}" está com reciclagem VENCIDA em ${registro.dataValidade}`;
          if (atividade.impedeExecucaoSemQualificacao) {
            motivosBloqueio.push(msg);
          } else {
            alertasNaoImpeditivos.push(msg);
          }
        }
      }
    }
  }

  const podeExecutar = motivosBloqueio.length === 0;

  return {
    podeExecutar,
    motivosBloqueio,
    alertasNaoImpeditivos,
    impedeExecucao: motivosBloqueio.length > 0,
    gaps,
  };
}

/**
 * Diagnóstico consolidado de Gaps para toda a organização ou colaborador específico.
 */
export function diagnosticarGapsOrganizacao(
  colaboradores: ColaboradorPessoa[],
  competenciasCadastradas: CompetenciaItem[],
  competenciasColaboradores: CompetenciaColaborador[],
  qualificacoes: QualificacaoColaborador[],
  registrosTreinamento: RegistroTreinamentoColaborador[],
  atividades: AtividadeCompetenciaRequerida[],
  catalogoCursos: CursoTreinamento[]
): GapCompetenciaItem[] {
  const gaps: GapCompetenciaItem[] = [];
  const hojeStr = new Date().toISOString().split('T')[0];

  for (const colab of colaboradores) {
    // Se inativo, registrar como gap de disponibilidade caso tenha atribuições críticas
    if (colab.status !== 'ATIVO') {
      continue; // Colaboradores inativos não geram falsos gaps operacionais, mas ficam identificados
    }

    if (colab.restricaoOperacional?.possuiRestricao && colab.restricaoOperacional.impedeExecucao) {
      gaps.push({
        id: `gap-restricao-${colab.id}`,
        colaboradorId: colab.id,
        colaboradorNome: colab.nome,
        colaboradorMatricula: colab.matricula,
        setor: colab.setor,
        funcao: colab.funcao,
        tipoGap: 'RESTRICAO_ATIVA',
        descricaoGap: `Colaborador com restrição operacional ativa: ${colab.restricaoOperacional.motivo || 'Sem detalhe'}`,
        criticidade: 'ALTA',
        bloqueiaOperacao: true,
        dataIdentificacao: hojeStr,
      });
    }

    // 1. Verificar qualificações vencidas
    const qualifsColab = qualificacoes.filter((q) => q.colaboradorId === colab.id);
    for (const q of qualifsColab) {
      const dias = calcularDiasParaVencimento(q.dataValidade);
      if (q.possuiValidade && dias !== null && dias < 0) {
        gaps.push({
          id: `gap-q-${q.id}`,
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          colaboradorMatricula: colab.matricula,
          setor: colab.setor,
          funcao: colab.funcao,
          tipoGap: 'QUALIFICACAO_VENCIDA',
          descricaoGap: `Qualificação "${q.titulo}" (${q.numeroRegistro}) está VENCIDA desde ${q.dataValidade}`,
          criticidade: q.bloqueiaOperacaoSeVencida ? 'CRITICA' : 'MEDIA',
          bloqueiaOperacao: q.bloqueiaOperacaoSeVencida,
          dataIdentificacao: hojeStr,
        });
      }
    }

    // 2. Verificar treinamentos recorrentes vencidos
    const treinosColab = registrosTreinamento.filter((t) => t.colaboradorId === colab.id);
    for (const tr of treinosColab) {
      const dias = calcularDiasParaVencimento(tr.dataValidade);
      if (dias !== null && dias < 0) {
        const cursoInfo = catalogoCursos.find((c) => c.id === tr.treinamentoId);
        gaps.push({
          id: `gap-tr-${tr.id}`,
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          colaboradorMatricula: colab.matricula,
          setor: colab.setor,
          funcao: colab.funcao,
          tipoGap: 'TREINAMENTO_VENCIDO',
          descricaoGap: `Treinamento recorrente "${tr.treinamentoTitulo}" expirou em ${tr.dataValidade}`,
          treinamentoSugeridoId: tr.treinamentoId,
          treinamentoSugeridoTitulo: tr.treinamentoTitulo,
          criticidade: cursoInfo?.origemPrazo === 'REGULAMENTO' ? 'CRITICA' : 'ALTA',
          bloqueiaOperacao: cursoInfo?.origemPrazo === 'REGULAMENTO',
          dataIdentificacao: hojeStr,
        });
      }
    }

    // 3. Verificar competências requeridas para o setor e função do colaborador
    const compsAplicaveis = competenciasCadastradas.filter(
      (c) =>
        c.status === 'ATIVA' &&
        (c.setoresAplicaveis.includes(colab.setor) || c.setoresAplicaveis.includes('Todos')) &&
        (c.funcoesAplicaveis.includes(colab.funcao) || c.funcoesAplicaveis.includes('Todas'))
    );

    for (const comp of compsAplicaveis) {
      const cc = competenciasColaboradores.find(
        (item) => item.colaboradorId === colab.id && item.competenciaId === comp.id
      );

      if (!cc) {
        const cursoSugerido = catalogoCursos.find((c) =>
          c.competenciasDesenvolvidasIds?.includes(comp.id)
        );
        gaps.push({
          id: `gap-comp-ausente-${colab.id}-${comp.id}`,
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          colaboradorMatricula: colab.matricula,
          setor: colab.setor,
          funcao: colab.funcao,
          competenciaId: comp.id,
          competenciaNome: comp.nome,
          tipoGap: 'COMPETENCIA_AUSENTE',
          descricaoGap: `Competência aplicável à função/setor não mapeada para o colaborador: "${comp.nome}"`,
          nivelRequerido: 2, // nível padrão esperado para atuação
          nivelAtual: 0,
          treinamentoSugeridoId: cursoSugerido?.id,
          treinamentoSugeridoTitulo: cursoSugerido?.titulo,
          criticidade: comp.criticidade === 'CRITICA' ? 'CRITICA' : 'MEDIA',
          bloqueiaOperacao: comp.criticidade === 'CRITICA',
          dataIdentificacao: hojeStr,
        });
      } else if (cc.status === 'VENCIDO') {
        gaps.push({
          id: `gap-comp-vencida-${cc.id}`,
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          colaboradorMatricula: colab.matricula,
          setor: colab.setor,
          funcao: colab.funcao,
          competenciaId: comp.id,
          competenciaNome: comp.nome,
          tipoGap: 'TREINAMENTO_VENCIDO',
          descricaoGap: `Competência "${comp.nome}" está com periodicidade/reciclagem vencida`,
          nivelRequerido: cc.nivelAtual,
          nivelAtual: cc.nivelAtual,
          criticidade: 'ALTA',
          bloqueiaOperacao: false,
          dataIdentificacao: hojeStr,
        });
      }
    }
  }

  return gaps;
}

export const diagnosticarGapsOrganizacionais = diagnosticarGapsOrganizacao;

/**
 * Monta a lista consolidada da Central de Vencimentos em faixas temporais.
 */
export function consolidarCentralVencimentos(
  qualificacoes: QualificacaoColaborador[],
  treinamentos: RegistroTreinamentoColaborador[],
  documentos: DocumentoEvidenciaPessoa[],
  competencias: CompetenciaColaborador[]
): FaixaVencimentoItem[] {
  const itens: FaixaVencimentoItem[] = [];

  // 1. Qualificações
  for (const q of qualificacoes) {
    if (!q.possuiValidade || !q.dataValidade) continue;
    const dias = calcularDiasParaVencimento(q.dataValidade);
    if (dias === null) continue;
    const faixa = classificarFaixaVencimento(dias, true);
    if (faixa === 'SEM_VALIDADE') continue;

    itens.push({
      id: `venc-qualif-${q.id}`,
      tipoItem: 'QUALIFICACAO',
      colaboradorId: q.colaboradorId,
      colaboradorNome: q.colaboradorNome,
      colaboradorMatricula: q.colaboradorMatricula,
      setor: 'Qualificações Operacionais',
      titulo: q.titulo,
      subtitulo: `${q.emissor} • Registro: ${q.numeroRegistro}`,
      dataValidade: q.dataValidade,
      diasParaVencer: dias,
      faixa: faixa as any,
      bloqueiaOperacao: q.bloqueiaOperacaoSeVencida && dias < 0,
      status: q.status,
      documentoId: q.documentoComprobatorioId,
    });
  }

  // 2. Treinamentos Recorrentes
  for (const tr of treinamentos) {
    if (!tr.dataValidade) continue;
    const dias = calcularDiasParaVencimento(tr.dataValidade);
    if (dias === null) continue;
    const faixa = classificarFaixaVencimento(dias, true);
    if (faixa === 'SEM_VALIDADE') continue;

    itens.push({
      id: `venc-treino-${tr.id}`,
      tipoItem: 'TREINAMENTO',
      colaboradorId: tr.colaboradorId,
      colaboradorNome: tr.colaboradorNome,
      colaboradorMatricula: tr.colaboradorMatricula,
      setor: 'Treinamento & Reciclagem',
      titulo: tr.treinamentoTitulo,
      subtitulo: `Instrutor: ${tr.instrutor} • Certificado: ${tr.numeroCertificado || 'N/A'}`,
      dataValidade: tr.dataValidade,
      diasParaVencer: dias,
      faixa: faixa as any,
      bloqueiaOperacao: dias < 0,
      status: dias < 0 ? 'VENCIDO' : dias <= 30 ? 'VENCENDO' : 'EM_DIA',
      documentoId: tr.documentoCertificadoId,
    });
  }

  // 3. Documentos e Evidências
  for (const doc of documentos) {
    if (!doc.possuiValidade || !doc.dataValidade) continue;
    const dias = calcularDiasParaVencimento(doc.dataValidade);
    if (dias === null) continue;
    const faixa = classificarFaixaVencimento(dias, true);
    if (faixa === 'SEM_VALIDADE') continue;

    itens.push({
      id: `venc-doc-${doc.id}`,
      tipoItem: 'DOCUMENTO',
      colaboradorId: doc.colaboradorId,
      colaboradorNome: doc.colaboradorNome,
      colaboradorMatricula: '',
      setor: 'Arquivo Documental',
      titulo: doc.titulo,
      subtitulo: `${doc.tipoDocumento} • Emissor: ${doc.emissor}`,
      dataValidade: doc.dataValidade,
      diasParaVencer: dias,
      faixa: faixa as any,
      bloqueiaOperacao: dias < 0,
      status: doc.statusValidade,
      documentoId: doc.id,
    });
  }

  // 4. Competências com data de validade
  for (const comp of competencias) {
    if (!comp.dataValidade) continue;
    const dias = calcularDiasParaVencimento(comp.dataValidade);
    if (dias === null) continue;
    const faixa = classificarFaixaVencimento(dias, true);
    if (faixa === 'SEM_VALIDADE') continue;

    itens.push({
      id: `venc-comp-${comp.id}`,
      tipoItem: 'COMPETENCIA',
      colaboradorId: comp.colaboradorId,
      colaboradorNome: comp.colaboradorNome,
      colaboradorMatricula: comp.colaboradorMatricula,
      setor: comp.setor,
      titulo: comp.competenciaNome,
      subtitulo: `Nível Atual: ${comp.nivelAtual}`,
      dataValidade: comp.dataValidade,
      diasParaVencer: dias,
      faixa: faixa as any,
      bloqueiaOperacao: dias < 0,
      status: comp.status,
    });
  }

  // Ordena por criticidade: vencidos primeiro (menor diasParaVencer), depois os mais próximos de vencer
  return itens.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}

/**
 * Calcula os indicadores e estatísticas do Dashboard de Pessoas & Competências.
 */
export function calcularMetricasDashboardCompetencias(
  colaboradores: ColaboradorPessoa[],
  competenciasColaboradores: CompetenciaColaborador[],
  qualificacoes: QualificacaoColaborador[],
  treinamentos: RegistroTreinamentoColaborador[],
  documentos: DocumentoEvidenciaPessoa[],
  gaps: GapCompetenciaItem[],
  catalogoCompetencias: CompetenciaItem[]
): CompetenciasDashboardMetrics {
  const totalColaboradores = colaboradores.length;

  if (totalColaboradores === 0) {
    return {
      totalColaboradores: 0,
      colaboradoresAtivos: 0,
      colaboradoresInativos: 0,
      colaboradoresComRestricao: 0,
      totalCompetencias: catalogoCompetencias.length,
      taxaColaboradoresQualificados: 0,
      taxaTreinamentosEmDia: 0,
      vencidosTotal: 0,
      vencendoHoje: 0,
      vencendo7Dias: 0,
      vencendo15Dias: 0,
      vencendo30Dias: 0,
      vencendo60Dias: 0,
      vencendo90Dias: 0,
      totalGapsIdentificados: 0,
      gapsCriticosComBloqueio: 0,
      pessoasEmTreinamento: 0,
      distribuicaoPorSetor: {},
      semDados: true,
    };
  }

  const ativos = colaboradores.filter((c) => c.status === 'ATIVO');
  const inativos = colaboradores.filter((c) => c.status !== 'ATIVO');
  const comRestricao = colaboradores.filter((c) => c.restricaoOperacional?.possuiRestricao);

  // Vencimentos consolidados
  const centralVencimentos = consolidarCentralVencimentos(
    qualificacoes,
    treinamentos,
    documentos,
    competenciasColaboradores
  );

  const vencidosTotal = centralVencimentos.filter((v) => v.faixa === 'VENCIDO').length;
  const vencendoHoje = centralVencimentos.filter((v) => v.faixa === 'HOJE').length;
  const vencendo7Dias = centralVencimentos.filter((v) => v.faixa === '7_DIAS').length;
  const vencendo15Dias = centralVencimentos.filter((v) => v.faixa === '15_DIAS').length;
  const vencendo30Dias = centralVencimentos.filter((v) => v.faixa === '30_DIAS').length;
  const vencendo60Dias = centralVencimentos.filter((v) => v.faixa === '60_DIAS').length;
  const vencendo90Dias = centralVencimentos.filter((v) => v.faixa === '90_DIAS').length;

  // Pessoas em treinamento
  const emTreinamentoSet = new Set<string>();
  competenciasColaboradores
    .filter((c) => c.status === 'EM_TREINAMENTO')
    .forEach((c) => emTreinamentoSet.add(c.colaboradorId));
  treinamentos
    .filter((t) => t.resultado === 'EM_ANDAMENTO')
    .forEach((t) => emTreinamentoSet.add(t.colaboradorId));

  // Pessoas 100% qualificadas (ativas, sem qualificações vencidas, sem gaps com bloqueio)
  const colabsComBloqueioOuVencimento = new Set<string>();
  centralVencimentos.filter((v) => v.bloqueiaOperacao).forEach((v) => colabsComBloqueioOuVencimento.add(v.colaboradorId));
  gaps.filter((g) => g.bloqueiaOperacao).forEach((g) => colabsComBloqueioOuVencimento.add(g.colaboradorId));
  comRestricao.filter((c) => c.restricaoOperacional?.impedeExecucao).forEach((c) => colabsComBloqueioOuVencimento.add(c.id));

  const totalAtivosSemBloqueio = ativos.filter((c) => !colabsComBloqueioOuVencimento.has(c.id)).length;
  const taxaColaboradoresQualificados = ativos.length > 0
    ? Math.round((totalAtivosSemBloqueio / ativos.length) * 100)
    : 0;

  // Treinamentos em dia
  const totalTreinamentosAprovados = treinamentos.filter((t) => t.resultado === 'APROVADO').length;
  const treinamentosVencidos = treinamentos.filter((t) => {
    const d = calcularDiasParaVencimento(t.dataValidade);
    return d !== null && d < 0;
  }).length;
  const taxaTreinamentosEmDia = totalTreinamentosAprovados > 0
    ? Math.round(((totalTreinamentosAprovados - treinamentosVencidos) / totalTreinamentosAprovados) * 100)
    : 100;

  // Gaps críticos
  const gapsCriticos = gaps.filter((g) => g.bloqueiaOperacao).length;

  // Distribuição por Setor
  const distribuicaoPorSetor: Record<string, {
    totalPessoas: number;
    qualificados: number;
    gaps: number;
    vencidos: number;
    taxaConformidade: number;
  }> = {};

  for (const c of colaboradores) {
    const setor = c.setor || 'Sem Setor';
    if (!distribuicaoPorSetor[setor]) {
      distribuicaoPorSetor[setor] = {
        totalPessoas: 0,
        qualificados: 0,
        gaps: 0,
        vencidos: 0,
        taxaConformidade: 0,
      };
    }
    distribuicaoPorSetor[setor].totalPessoas += 1;
    if (c.status === 'ATIVO' && !colabsComBloqueioOuVencimento.has(c.id)) {
      distribuicaoPorSetor[setor].qualificados += 1;
    }
  }

  for (const g of gaps) {
    const setor = g.setor || 'Sem Setor';
    if (distribuicaoPorSetor[setor]) {
      distribuicaoPorSetor[setor].gaps += 1;
    }
  }

  for (const v of centralVencimentos) {
    if (v.faixa === 'VENCIDO') {
      const c = colaboradores.find((item) => item.id === v.colaboradorId);
      const setor = c?.setor || 'Sem Setor';
      if (distribuicaoPorSetor[setor]) {
        distribuicaoPorSetor[setor].vencidos += 1;
      }
    }
  }

  for (const setor of Object.keys(distribuicaoPorSetor)) {
    const s = distribuicaoPorSetor[setor];
    s.taxaConformidade = s.totalPessoas > 0
      ? Math.round((s.qualificados / s.totalPessoas) * 100)
      : 0;
  }

  return {
    totalColaboradores,
    colaboradoresAtivos: ativos.length,
    colaboradoresInativos: inativos.length,
    colaboradoresComRestricao: comRestricao.length,
    totalCompetencias: catalogoCompetencias.length,
    taxaColaboradoresQualificados,
    taxaTreinamentosEmDia,
    vencidosTotal,
    vencendoHoje,
    vencendo7Dias,
    vencendo15Dias,
    vencendo30Dias,
    vencendo60Dias,
    vencendo90Dias,
    totalGapsIdentificados: gaps.length,
    gapsCriticosComBloqueio: gapsCriticos,
    pessoasEmTreinamento: emTreinamentoSet.size,
    distribuicaoPorSetor,
    semDados: false,
  };
}

/**
 * Sugere de forma determinística relações entre uma RNC e possíveis gaps de treinamento/competência.
 * GOVERNANÇA: Apenas sugere hipóteses fundamentadas para avaliação humana (Aceitar / Rejeitar).
 */
export function sugerirCorrelacaoRNCComCompetencias(
  rnc: NCRecord,
  colaboradores: ColaboradorPessoa[],
  competencias: CompetenciaItem[],
  cursos: CursoTreinamento[]
): SugestaoIACompetencia[] {
  const sugestoes: SugestaoIACompetencia[] = [];
  const hojeStr = new Date().toISOString().split('T')[0];

  const textoCompleto = [
    rnc.descricaoNC,
    rnc.analiseCausaRaiz?.detalhes,
    rnc.analiseCausaRaiz?.explicacaoCausaSistemica,
    (rnc.analiseCausaRaiz?.cincoPorques || []).join(' '),
    rnc.analiseCausaRaiz?.ishikawa?.maoDeObra,
    rnc.analiseCausaRaiz?.ishikawa?.metodo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const termosTreinamento = [
    'treinamento',
    'capacitação',
    'qualificação',
    'falta de instrução',
    'procedimento não seguido',
    'conhecimento insuficiente',
    'desconhecimento do procedimento',
    'erro operacional',
    'falha na execução',
    'torque',
    'calibração',
    'recebimento',
    'inspeção visual',
    'mão de obra',
  ];

  const encontrouTermo = termosTreinamento.some((t) => textoCompleto.includes(t));

  if (encontrouTermo) {
    // Buscar se há curso relacionado ao setor
    const cursoRelacionado = cursos.find(
      (c) =>
        textoCompleto.includes(c.titulo.toLowerCase()) ||
        textoCompleto.includes(c.codigo.toLowerCase()) ||
        (rnc.setor && c.titulo.toLowerCase().includes(rnc.setor.toLowerCase()))
    );

    const compRelacionada = competencias.find(
      (comp) =>
        textoCompleto.includes(comp.nome.toLowerCase()) ||
        (rnc.setor && comp.setoresAplicaveis.includes(rnc.setor))
    );

    sugestoes.push({
      id: `sug-rnc-${rnc.id}-${Date.now()}`,
      organizationId: (rnc as any).organizationId || '',
      tipo: 'CORRELACAO_RNC_COMPETENCIA',
      titulo: `Possível correlação causal com Capacitação/Competência na RNC #${rnc.numeroNC}`,
      hipoteseSugestao: `A investigação causal da RNC #${rnc.numeroNC} indica elementos de execução de procedimento ou capacitação técnica. Sugere-se avaliar se a equipe do setor "${rnc.setor}" realizou a reciclagem do treinamento pertinente.`,
      justificativa: `Detecção de fatores causais relacionados a Mão de Obra ou Procedimento no Ishikawa / 5 Porquês da RNC.`,
      fonteAnalise: `RNC #${rnc.numeroNC} — Setor ${rnc.setor}`,
      confianca: cursoRelacionado || compRelacionada ? 'ALTA' : 'MEDIA',
      entidadeAlvoTipo: 'RNC',
      entidadeAlvoId: rnc.id,
      entidadeAlvoNome: `RNC #${rnc.numeroNC}`,
      decisaoHumana: 'PENDENTE',
      createdAt: hojeStr,
    });
  }

  return sugestoes;
}

/**
 * Sugere de forma determinística relações entre um Finding de Auditoria Externa e Competências.
 */
export function sugerirCorrelacaoFindingComCompetencias(
  finding: ConstatacaoExternaRecord,
  colaboradores: ColaboradorPessoa[],
  competencias: CompetenciaItem[],
  cursos: CursoTreinamento[]
): SugestaoIACompetencia[] {
  const sugestoes: SugestaoIACompetencia[] = [];
  const hojeStr = new Date().toISOString().split('T')[0];

  const texto = [
    finding.descricaoOriginal,
    finding.interpretacaoInterna,
    finding.requisitoNormativo?.descricaoRequisito,
    finding.requisitoNormativo?.norma,
    finding.requisitoNormativo?.itemRequisito,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const termosCompetencia = [
    'cht',
    'qualificação',
    'treinamento',
    'reciclagem',
    'habilitação',
    'competência',
    'autorização',
    'registro de treinamento',
    'ojt',
    '145.151',
    '145.153',
    '145.161',
    '145.163',
  ];

  const temTermo = termosCompetencia.some((t) => texto.includes(t));

  if (temTermo) {
    sugestoes.push({
      id: `sug-finding-${finding.id}-${Date.now()}`,
      organizationId: finding.organizationId || '',
      tipo: 'CORRELACAO_FINDING_COMPETENCIA',
      titulo: `Vínculo de Evidência de Competência/Treinamento ao Finding #${finding.numeroExterno}`,
      hipoteseSugestao: `O finding aponta exigência regulatória sobre qualificação ou treinamento do pessoal técnico. Vincular os certificados e qualificações vigentes dos colaboradores responsáveis à resposta oficial do SGQ para comprovação de conformidade.`,
      justificativa: `Constatação de auditoria envolve requisitos de pessoal e autorização de manutenção (RBAC 145).`,
      fonteAnalise: `Finding #${finding.numeroExterno}`,
      confianca: 'ALTA',
      entidadeAlvoTipo: 'FINDING',
      entidadeAlvoId: finding.id,
      entidadeAlvoNome: `Finding #${finding.numeroExterno}`,
      decisaoHumana: 'PENDENTE',
      createdAt: hojeStr,
    });
  }

  return sugestoes;
}
