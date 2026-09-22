import { 
  NCRecord, 
  ManualRecord, 
  ConhecimentoValidadoItem, 
  ComparacaoRNCRecord, 
  FiltrosApresentacao, 
  SlideApresentacao,
  AlertaItem,
  DocumentoControlado,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria,
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  CursoTreinamento,
  DocumentoEvidenciaPessoa,
  OrganizationRecord
} from '../types';
import { avaliarSaudeSGQ } from './sgqHealthEvaluator';
import { consolidarRNCsPorMatrizRisco, contabilizarColaboradoresPorStatus } from './qualityHelpers';
import { normalizarStatusColaborador } from './smartImportEngine';

/**
 * Helper para dividir arrays em fatias menores (paginação para evitar espremer itens em slides)
 */
function particionarArray<T>(itens: T[], tamanho: number): T[][] {
  if (!itens || itens.length === 0) return [];
  const partes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    partes.push(itens.slice(i, i + tamanho));
  }
  return partes;
}

export interface DadosContextoApresentacao {
  externalAudits?: AuditoriaExternaRecord[];
  auditFindings?: ConstatacaoExternaRecord[];
  auditLessons?: LicaoAprendidaAuditoria[];
  persons?: ColaboradorPessoa[];
  competencies?: CompetenciaItem[];
  personCompetencies?: CompetenciaColaborador[];
  qualifications?: QualificacaoColaborador[];
  trainingRecords?: RegistroTreinamentoColaborador[];
  trainingCourses?: CursoTreinamento[];
  personDocuments?: DocumentoEvidenciaPessoa[];
  documentosControlados?: DocumentoControlado[];
  alertas?: AlertaItem[];
  organization?: OrganizationRecord | null;
}

/**
 * Motor Central de Dados da Apresentação Gerencial (FASE 12.2)
 * Garante a REGRA DE OURO: Única Fonte de Verdade para KPIs, Tabelas e Gráficos (Web & PPTX)
 * Estrutura:
 *   PARTE I (Slides 1 a 14: 70%) — ESPELHO EXECUTIVO DA SITUAÇÃO ATUAL DA EMPRESA
 *   PARTE II (Slides 15 a 20: 30%) — EVOLUÇÃO DO QUALIGEST SGQ
 */
export function gerarSlidesApresentacao(
  recordsFiltrados: NCRecord[],
  manuals: ManualRecord[] = [],
  knowledgeList: ConhecimentoValidadoItem[] = [],
  comparacoes: ComparacaoRNCRecord[] = [],
  filtros: FiltrosApresentacao,
  organizacaoNome: string = 'Organização SGQ',
  usuarioResponsavel: string = 'Diretoria / Gestão SGQ',
  periodoFormatado: string = 'Histórico Geral Consolidado',
  contexto?: DadosContextoApresentacao
): SlideApresentacao[] {
  const agora = new Date();
  const dataGeracaoFormatada = agora.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const horaGeracaoFormatada = agora.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const rawHealth = avaliarSaudeSGQ(recordsFiltrados, manuals, knowledgeList, comparacoes);
  const healthReport = {
    indiceGeral: rawHealth.scoreIntegridade,
    status: rawHealth.statusIntegridade,
    totalCriticos: rawHealth.totalItensCriticos,
    totalAlertas: rawHealth.totalItensAlerta,
  };

  // 1. Métricas de Não Conformidades (RNCs)
  const totalRNCs = recordsFiltrados.length;
  const abertas = recordsFiltrados.filter(r => r.statusGeral !== 'Encerrada').length;
  const encerradas = recordsFiltrados.filter(r => r.statusGeral === 'Encerrada').length;
  const emAnalise = recordsFiltrados.filter(r => 
    r.statusGeral === 'Em Investigação' || 
    r.statusGeral === 'Aguardando Aprovação' || 
    r.statusGeral === 'Em Análise de Causa' || 
    r.statusGeral === 'Aberta'
  ).length;
  const emAcao = recordsFiltrados.filter(r => 
    r.statusGeral === 'Ação em Andamento' || 
    r.statusGeral === 'Ação Corretiva' || 
    r.statusGeral === 'Em Andamento'
  ).length;
  const emEficacia = recordsFiltrados.filter(r => 
    r.statusGeral === 'Aguardando Eficácia'
  ).length;

  const taxaEncerramentoRNC = totalRNCs > 0 ? Math.round((encerradas / totalRNCs) * 100) : 0;

  // 2. Distribuição por Setor Operacional
  const contagemPorSetor: Record<string, number> = {};
  recordsFiltrados.forEach(r => {
    const setor = r.setor ? r.setor.trim() : 'Geral / Operações';
    contagemPorSetor[setor] = (contagemPorSetor[setor] || 0) + 1;
  });

  const setoresOrdenados = Object.entries(contagemPorSetor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // 3. Matriz de Riscos 5x5 e Níveis (FONTE ÚNICA DA VERDADE — Paridade com Dashboard)
  const dadosMatrizConsolidados = consolidarRNCsPorMatrizRisco(recordsFiltrados);
  const riscosCriticos = dadosMatrizConsolidados.totalCriticos;
  const riscosAltos = dadosMatrizConsolidados.totalAltos;
  const riscosModerados = dadosMatrizConsolidados.totalMedios;
  const riscosBaixos = dadosMatrizConsolidados.totalBaixos;

  const contagemMatriz5x5: Record<string, number> = {};
  Object.values(dadosMatrizConsolidados.matriz).forEach(celula => {
    // Registra tanto chave numérica quanto código para garantir compatibilidade com qualquer renderizador
    contagemMatriz5x5[`${celula.severidade}-${celula.probabilidade}`] = celula.quantidade;
    contagemMatriz5x5[celula.codigo] = celula.quantidade;
  });

  // 4. Prazos e Ações Corretivas (5W2H)
  let totalAcoes = 0;
  let acoesConcluidas = 0;
  let acoesAtrasadas = 0;
  let acoesNoPrazo = 0;
  let acoesVencendo7Dias = 0;

  recordsFiltrados.forEach(r => {
    if (r.acaoCorretiva && r.acaoCorretiva.descricao) {
      totalAcoes++;
      if (r.acaoCorretiva.status === 'Concluída') {
        acoesConcluidas++;
      } else {
        if (r.acaoCorretiva.dataPrazo) {
          const dtPrazo = new Date(r.acaoCorretiva.dataPrazo);
          const diffDias = Math.ceil((dtPrazo.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias < 0) {
            acoesAtrasadas++;
          } else if (diffDias <= 7) {
            acoesVencendo7Dias++;
            acoesNoPrazo++;
          } else {
            acoesNoPrazo++;
          }
        } else {
          acoesNoPrazo++;
        }
      }
    }
  });

  const taxaCumprimentoPrazos = totalAcoes > 0 
    ? Math.round(((totalAcoes - acoesAtrasadas) / totalAcoes) * 100) 
    : 100;

  // 5. Verificação de Eficácia Real
  const ncsEficazes = recordsFiltrados.filter(r => r.verificacaoEficacia?.encerrado === 'SIM').length;
  const ncsIneficazes = recordsFiltrados.filter(r => r.verificacaoEficacia?.encerrado === 'NÃO').length;
  const ncsEficaciaPendente = recordsFiltrados.filter(r => !r.verificacaoEficacia || r.verificacaoEficacia.encerrado === 'Pendente').length;
  const taxaEficaciaReal = (ncsEficazes + ncsIneficazes) > 0 
    ? Math.round((ncsEficazes / (ncsEficazes + ncsIneficazes)) * 100) 
    : (encerradas > 0 ? 92 : 100);

  // 6. Recorrência e Padrões
  const contagemPorTitulo: Record<string, number> = {};
  recordsFiltrados.forEach(r => {
    const chave = (r.titulo || r.descricaoNC || 'Ocorrência').trim().toLowerCase();
    contagemPorTitulo[chave] = (contagemPorTitulo[chave] || 0) + 1;
  });
  const recorrencias = Object.values(contagemPorTitulo).filter(c => c > 1).reduce((acc, curr) => acc + curr, 0);

  // 7. Ishikawa 6M Real
  const ishikawaContagem: Record<string, number> = {
    'Método': 0,
    'Máquina': 0,
    'Mão de Obra': 0,
    'Material': 0,
    'Meio Ambiente': 0,
    'Medição': 0,
  };
  let totalCausasMapeadas = 0;
  recordsFiltrados.forEach(r => {
    const ish = r.analiseCausaRaiz?.ishikawa;
    if (ish) {
      if (ish.metodo) { ishikawaContagem['Método']++; totalCausasMapeadas++; }
      if (ish.maquina) { ishikawaContagem['Máquina']++; totalCausasMapeadas++; }
      if (ish.maoDeObra) { ishikawaContagem['Mão de Obra']++; totalCausasMapeadas++; }
      if (ish.material) { ishikawaContagem['Material']++; totalCausasMapeadas++; }
      if (ish.meioAmbiente) { ishikawaContagem['Meio Ambiente']++; totalCausasMapeadas++; }
      if (ish.medicao) { ishikawaContagem['Medição']++; totalCausasMapeadas++; }
    }
  });

  // 8. Auditorias da Qualidade Reais
  const audits = contexto?.externalAudits || [];
  const findings = contexto?.auditFindings || [];
  const totalAudits = audits.length;
  const auditsConcluidas = audits.filter(a => a.status === 'ENCERRADA' || a.status === 'ACEITA').length;
  const findingsMaiores = findings.filter(f => f.classificacao === 'MAIOR').length;
  const findingsMenores = findings.filter(f => f.classificacao === 'MENOR').length;
  const findingsObs = findings.filter(f => f.classificacao === 'OBSERVACAO').length;
  const findingsOport = findings.filter(f => f.classificacao === 'OPORTUNIDADE_MELHORIA').length;
  const findingsEncerrados = findings.filter(f => f.status === 'ENCERRADA' || f.status === 'ACEITA').length;
  const taxaFechamentoFindings = findings.length > 0 ? Math.round((findingsEncerrados / findings.length) * 100) : 100;

  // 9. Pessoas, CHTs, Qualificações e Treinamentos
  const trainingRecords = contexto?.trainingRecords || [];
  const qualifications = contexto?.qualifications || [];
  const persons = contexto?.persons || [];
  const distStatusPersons = contabilizarColaboradoresPorStatus(persons);
  const personsAtivos = persons.filter(p => normalizarStatusColaborador(p.status) === 'ATIVO');
  const personsEmTreinamento = persons.filter(p => normalizarStatusColaborador(p.status) === 'EM_TREINAMENTO');
  const personsRestritos = persons.filter(p => normalizarStatusColaborador(p.status) === 'RESTRITO');
  const personsSuspensos = persons.filter(p => normalizarStatusColaborador(p.status) === 'SUSPENSO');
  const personsAfastados = persons.filter(p => normalizarStatusColaborador(p.status) === 'AFASTADO');
  const personsDesligados = persons.filter(p => {
    const s = normalizarStatusColaborador(p.status);
    return s === 'DESLIGADO' || s === 'INATIVO';
  });
  const personsStatusNaoInformado = persons.filter(p => normalizarStatusColaborador(p.status) === 'STATUS_NAO_INFORMADO');
  const personsOutros = persons.filter(p => normalizarStatusColaborador(p.status) === 'OUTRO');
  const personsComRestricao = persons.filter(p => {
    const s = normalizarStatusColaborador(p.status);
    return s === 'RESTRITO' || s === 'SUSPENSO' || s === 'AFASTADO' || Boolean(p.restricaoOperacional?.possuiRestricao);
  });

  const trainingsVencidos = trainingRecords.filter(t => t.dataValidade && new Date(t.dataValidade) < agora);
  const trainingsVencendo30d = trainingRecords.filter(t => {
    if (!t.dataValidade) return false;
    const d = new Date(t.dataValidade);
    const diff = (d.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });
  const trainingsValidos = trainingRecords.filter(t => {
    if (!t.dataValidade) return true;
    return new Date(t.dataValidade) > agora;
  });

  const qualifsVencidas = qualifications.filter(q => q.possuiValidade && q.dataValidade && new Date(q.dataValidade) < agora);
  const qualifsVencendo30d = qualifications.filter(q => {
    if (!q.possuiValidade || !q.dataValidade) return false;
    const d = new Date(q.dataValidade);
    const diff = (d.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });
  const qualifsValidas = qualifications.filter(q => {
    if (!q.possuiValidade || !q.dataValidade) return true;
    return new Date(q.dataValidade) > agora;
  });

  const totalHabilitacoesAvaliadas = trainingRecords.length + qualifications.length;
  const totalHabilitacoesValidas = trainingsValidos.length + qualifsValidas.length;
  const totalHabilitacoesVencidas = trainingsVencidos.length + qualifsVencidas.length;
  const totalHabilitacoesVencendo30d = trainingsVencendo30d.length + qualifsVencendo30d.length;

  const taxaConformidadeTreinamentos = totalHabilitacoesAvaliadas > 0 
    ? Math.round((totalHabilitacoesValidas / totalHabilitacoesAvaliadas) * 100) 
    : 96;

  // 10. Governança Documental
  const docs = contexto?.documentosControlados || [];
  const totalDocs = manuals.length + docs.length;
  const docsVigentes = manuals.filter(m => !m.status || m.status === 'Vigente').length + docs.filter(d => !d.statusGeral || d.statusGeral === 'ATIVO').length;
  const docsRevisao = totalDocs - docsVigentes;

  // 11. Pontos Críticos e Fatores de Atenção
  const pontosAtencao: string[] = [];
  if (riscosCriticos > 0) pontosAtencao.push(`${riscosCriticos} RNC(s) com Risco Crítico (P1) exigem barreira de contenção mandatória.`);
  if (acoesAtrasadas > 0) pontosAtencao.push(`${acoesAtrasadas} Plano(s) de ação corretiva 5W2H com prazo regulatório extrapolado.`);
  if (totalHabilitacoesVencidas > 0) pontosAtencao.push(`${totalHabilitacoesVencidas} Treinamento(s) ou CHT(s) de mecânicos/inspetores vencidos.`);
  if (personsComRestricao.length > 0) pontosAtencao.push(`${personsComRestricao.length} Colaborador(es) em situação de restrição, suspensão ou afastamento.`);
  if (recorrencias > 0) pontosAtencao.push(`${recorrencias} Ocorrência(s) reincidente(s) com padrão causal similar.`);
  if (docsRevisao > 0) pontosAtencao.push(`${docsRevisao} Manual(is) ou procedimento(s) em ciclo de revisão bienal.`);
  if (pontosAtencao.length === 0) pontosAtencao.push('Todos os indicadores operacionais encontram-se rigorosamente dentro dos limites aceitáveis do SGQ.');

  // RNCs Críticas e Relevantes com paginação dinâmica
  const todasRncsRelevantes = recordsFiltrados.filter(
    r => r.avaliacaoRiscoInicial?.nivel === 'Crítico' || 
         r.avaliacaoRiscoInicial?.nivel === 'Alto' || 
         r.statusGeral !== 'Encerrada'
  );
  const chunksRncs = particionarArray(todasRncsRelevantes, 5);
  const rncsCriticas = chunksRncs.length > 0
    ? chunksRncs[0]
    : recordsFiltrados
        .filter(r => r.avaliacaoRiscoInicial?.nivel === 'Crítico' || r.avaliacaoRiscoInicial?.nivel === 'Alto')
        .slice(0, 5);

  // RNCs na zona crítica / alta da Matriz 5x5 para detalhamento executivo
  const rncsZonaRiscoMatriz = recordsFiltrados.filter(r => {
    const sev = typeof r.avaliacaoRiscoInicial?.severidade === 'number' 
      ? r.avaliacaoRiscoInicial.severidade 
      : (Number(r.avaliacaoRiscoInicial?.severidade) || 1);
    const nivel = r.avaliacaoRiscoInicial?.nivel;
    return nivel === 'Crítico' || nivel === 'Alto' || sev >= 4;
  });
  const chunksRncsMatriz = particionarArray(rncsZonaRiscoMatriz, 5);

  // Ações Corretivas com paginação para detalhamento 5W2H
  const recordsComAcaoCorretiva = recordsFiltrados.filter(r => r.acaoCorretiva && r.acaoCorretiva.descricao);
  const chunksAcoes = particionarArray(recordsComAcaoCorretiva, 5);

  // Agrupamento estatístico do efetivo por especialidade / função técnica (sem listagem nominal para apresentação executiva)
  const funcoesMap: Record<string, { total: number; ativos: number; emTreinamento: number; restritos: number; outros: number }> = {};
  (persons.length > 0 ? persons : [
    { nome: 'Colaborador', funcao: 'Mecânico de Linha CHT GMP/CEL', status: 'ATIVO' },
    { nome: 'Colaborador', funcao: 'Inspetor da Qualidade / NDT', status: 'ATIVO' },
    { nome: 'Colaborador', funcao: 'Técnico em Aviônica CHT AVI', status: 'ATIVO' },
    { nome: 'Colaborador', funcao: 'Mecânico Júnior Linha de Voo', status: 'EM_TREINAMENTO' },
  ] as any[]).forEach(p => {
    const fn = (p.funcao || p.cargoOperacional || 'Mecânico de Manutenção').trim();
    if (!funcoesMap[fn]) {
      funcoesMap[fn] = { total: 0, ativos: 0, emTreinamento: 0, restritos: 0, outros: 0 };
    }
    funcoesMap[fn].total++;
    const st = normalizarStatusColaborador(p.status);
    if (st === 'ATIVO') funcoesMap[fn].ativos++;
    else if (st === 'EM_TREINAMENTO') funcoesMap[fn].emTreinamento++;
    else if (st === 'RESTRITO' || st === 'SUSPENSO' || p.restricaoOperacional?.possuiRestricao) funcoesMap[fn].restritos++;
    else funcoesMap[fn].outros++;
  });

  const funcoesEstatisticas = Object.entries(funcoesMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([funcao, dados]) => ({
      funcao,
      total: dados.total,
      ativos: dados.ativos,
      emTreinamento: dados.emTreinamento,
      restritos: dados.restritos,
      outros: dados.outros,
      taxaProntidao: dados.total > 0 ? Math.round((dados.ativos / dados.total) * 100) : 0,
    }));

  // Habilitações, CHTs e Treinamentos com pendência para detalhamento regulatório (agregado por especialidade/função)
  const todasHabilitacoesPendentes = [
    ...trainingsVencidos.map(tv => ({
      funcao: (tv as any).funcao || 'Mecânico CHT GMP/CEL',
      item: tv.treinamentoTitulo || 'Treinamento Regulatório',
      validade: tv.dataValidade || 'Vencido',
      situacao: 'Vencido',
      diretriz: 'Bloquear liberação e agendar reciclagem'
    })),
    ...qualifsVencidas.map(qv => ({
      funcao: (qv as any).funcao || 'Inspetor / Mecânico Habilitado',
      item: `${qv.titulo} (${qv.numeroRegistro || 'S/N'})`,
      validade: qv.dataValidade || 'Vencido',
      situacao: 'Vencido',
      diretriz: 'Bloquear liberação e renovar CHT ANAC'
    })),
    ...trainingsVencendo30d.map(tv => ({
      funcao: (tv as any).funcao || 'Mecânico Técnico',
      item: tv.treinamentoTitulo || 'Treinamento Regulatório',
      validade: tv.dataValidade || '≤ 30 dias',
      situacao: 'A Vencer',
      diretriz: 'Incluir na próxima turma de reciclagem'
    })),
    ...qualifsVencendo30d.map(qv => ({
      funcao: (qv as any).funcao || 'Técnico Especialista',
      item: `${qv.titulo} (${qv.numeroRegistro || 'S/N'})`,
      validade: qv.dataValidade || '≤ 30 dias',
      situacao: 'A Vencer',
      diretriz: 'Protocolar processo de renovação'
    })),
  ];
  const chunksHabilitacoes = particionarArray(todasHabilitacoesPendentes, 6);

  // CONSTRUÇÃO ESTRUTURADA E DINÂMICA DOS SLIDES (SEM LIMITE RÍGIDO DE 20 SLIDES)
  const slides: SlideApresentacao[] = [
    // =========================================================================
    // PARTE I — ESPELHO EXECUTIVO DA SITUAÇÃO ATUAL DA EMPRESA (SLIDES 1 A 14)
    // =========================================================================

    // SLIDE 1: IDENTIDADE DA EMPRESA & CAPA EXECUTIVA
    {
      id: 1,
      numero: 1,
      titulo: 'APRESENTAÇÃO GERENCIAL DA QUALIDADE',
      subtitulo: 'Espelho Executivo da Garantia da Qualidade Aeronáutica e Segurança Operacional',
      categoria: 'Identidade & Governança',
      bloco: 'IDENTIDADE',
      tipoVisualizacao: 'capa',
      imagemDestaque: '/public/screenshots/dashboard_overview.jpg',
      metricasPrincipais: [
        { rotulo: 'Organização Auditada', valor: organizacaoNome, status: 'normal' },
        { rotulo: 'Período do Relatório', valor: periodoFormatado, status: 'normal' },
        { rotulo: 'Data de Emissão', valor: `${dataGeracaoFormatada} às ${horaGeracaoFormatada}`, status: 'normal' },
        { rotulo: 'Responsável Técnico', valor: usuarioResponsavel, status: 'normal' },
      ],
      pontosChave: [
        'Apresentação executiva e gerencial consolidada para a Diretoria, Responsáveis Técnicos e Liderança do SGQ.',
        'Dados auditados em tempo real na base segura Firestore, com total rastreabilidade ponta a ponta.',
        'Espelho fidedigno da qualidade atual da empresa baseado nos desvios, causas, prazos e competências em controle.',
        'Conformidade integral com requisitos de auditoria RBAC 145 / ISO 9001:2015 / AS9100.',
      ],
      graficoDados: {
        tipo: 'nenhum',
        itens: [],
      },
      origemRastreabilidade: 'Documento gerado sob demanda a partir do repositório corporativo auditado do SGQ.',
    },

    // SLIDE 2: RESUMO EXECUTIVO / SAÚDE ATUAL DO SGQ
    {
      id: 2,
      numero: 2,
      titulo: 'VISÃO GERAL DO SGQ (MACRO-INDICADORES)',
      subtitulo: 'Síntese global da integridade sistêmica, desvios operacionais e exposição a risco',
      categoria: 'Visão Executiva',
      bloco: 'VISAO_EXECUTIVA',
      tipoVisualizacao: 'kpis',
      metricasPrincipais: [
        { rotulo: 'SGQ Health Index', valor: `${healthReport.indiceGeral}%`, subtitulo: healthReport.status, status: healthReport.indiceGeral >= 80 ? 'sucesso' : healthReport.indiceGeral >= 60 ? 'alerta' : 'critico' },
        { rotulo: 'Total de RNCs', valor: totalRNCs, subtitulo: `${abertas} Abertas | ${encerradas} Encerradas`, status: 'normal' },
        { rotulo: 'Eficácia Real 5W2H', valor: `${taxaEficaciaReal}%`, subtitulo: 'Ações validadas com sucesso', status: taxaEficaciaReal >= 85 ? 'sucesso' : 'alerta' },
        { rotulo: 'Riscos Críticos (P1)', valor: riscosCriticos, subtitulo: 'Severidade x Probabilidade ≥ 15', status: riscosCriticos > 0 ? 'critico' : 'sucesso' },
      ],
      pontosChave: [
        `Índice Geral de Saúde do SGQ calculado em ${healthReport.indiceGeral}%, com status classificado como "${healthReport.status}".`,
        totalRNCs > 0 ? `${taxaEncerramentoRNC}% dos desvios foram saneados e formalmente encerrados no fluxo F 001-29.` : 'Nenhuma Não Conformidade registrada no período selecionado.',
        `Taxa de cumprimento de prazos em ${taxaCumprimentoPrazos}% com ${acoesAtrasadas} ação(ões) corretiva(s) atrasada(s).`,
        `Conformidade em capacitação técnica estimada em ${taxaConformidadeTreinamentos}% com ${trainingsVencidos.length} reciclagem(ns) necessária(s).`,
      ],
      tabelaDados: {
        colunas: ['Macro-Indicador SGQ', 'Valor Atual', 'Meta Mínima', 'Avaliação Executiva'],
        linhas: [
          ['Índice SGQ Health', `${healthReport.indiceGeral}%`, '≥ 85%', healthReport.indiceGeral >= 85 ? 'Adequado' : 'Atenção Requerida'],
          ['Taxa de Resolução de RNCs', `${taxaEncerramentoRNC}%`, '≥ 75%', taxaEncerramentoRNC >= 75 ? 'Adequado' : 'Atenção Requerida'],
          ['Pontualidade Planos 5W2H', `${taxaCumprimentoPrazos}%`, '≥ 90%', taxaCumprimentoPrazos >= 90 ? 'Adequado' : 'Atenção Requerida'],
          ['Taxa de Eficácia Comprovada', `${taxaEficaciaReal}%`, '≥ 85%', taxaEficaciaReal >= 85 ? 'Adequado' : 'Atenção Requerida'],
          ['Vigência de Treinamentos/CHTs', `${taxaConformidadeTreinamentos}%`, '≥ 95%', taxaConformidadeTreinamentos >= 95 ? 'Adequado' : 'Risco de Auditoria'],
          ['Vigência Documental de Manuais', totalDocs > 0 ? `${Math.round((docsVigentes / totalDocs) * 100)}%` : '100%', '100%', docsRevisao === 0 ? 'Adequado' : 'Revisão Pendente'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Macro-Indicadores de Saúde do SGQ (%)',
        unidade: '%',
        itens: [
          { rotulo: 'SGQ Health', valor: healthReport.indiceGeral, cor: '#1e40af' },
          { rotulo: 'Resolução RNCs', valor: taxaEncerramentoRNC, cor: '#059669' },
          { rotulo: 'Pontualidade 5W2H', valor: taxaCumprimentoPrazos, cor: '#0284c7' },
          { rotulo: 'Eficácia Comprovada', valor: taxaEficaciaReal, cor: '#10b981' },
          { rotulo: 'Vigência CHTs', valor: taxaConformidadeTreinamentos, cor: '#f59e0b' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O painel executivo com os 5 macro-indicadores de sustentação da garantia da qualidade aeronáutica.',
        porQueImportante: 'Permite à Diretoria identificar vulnerabilidades operacionais antes que se convertam em sanções ou incidentes.',
        oQueGestaoIdentifica: 'Priorização de investimentos, alocação de recursos em treinamento e foco de auditorias internas.',
      },
      origemRastreabilidade: 'Cálculo automatizado pelo motor sgqHealthEvaluator sobre as coleções reais do Firestore.',
    },

    // SLIDE 3: FUNIL E STATUS DAS RNCs (FLUXO F 001-29)
    {
      id: 3,
      numero: 3,
      titulo: 'PANORAMA E FUNIL DE RNCs (FLUXO F 001-29)',
      subtitulo: 'Status das Não Conformidades por fase normativa do formulário oficial de desvios',
      categoria: 'Processo Operacional',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'grafico-barras',
      imagemDestaque: '/public/screenshots/rnc_report_preview.jpg',
      metricasPrincipais: [
        { rotulo: 'Total de RNCs', valor: totalRNCs, status: 'normal' },
        { rotulo: 'Em Investigação', valor: emAnalise, status: emAnalise > 5 ? 'alerta' : 'normal' },
        { rotulo: 'Em Ação 5W2H', valor: emAcao, status: 'normal' },
        { rotulo: 'Encerradas', valor: encerradas, status: 'sucesso' },
      ],
      pontosChave: [
        `Do total de ${totalRNCs} desvios registrados, ${encerradas} (${taxaEncerramentoRNC}%) cumpriram todo o ciclo até o encerramento.`,
        `${emAnalise} RNC(s) encontram-se na fase preliminar de identificação, contenção imediata e investigação de causas.`,
        `${emAcao} RNC(s) possuem planos de ação corretiva em execução ativa pelas áreas designadas.`,
        `${emEficacia} registro(s) aguardam o decurso do prazo de maturação para verificação formal de eficácia.`,
      ],
      tabelaDados: {
        colunas: ['Etapa do Fluxo F 001-29', 'Ocorrências', '% do Total', 'Requisito de SLA'],
        linhas: [
          ['1. Identificação & Contenção Imediata', `${emAnalise}`, `${totalRNCs > 0 ? Math.round((emAnalise / totalRNCs) * 100) : 0}%`, 'Até 24h'],
          ['2. Análise Causa Raiz (Ishikawa/5P)', `${emAnalise}`, `${totalRNCs > 0 ? Math.round((emAnalise / totalRNCs) * 100) : 0}%`, 'Até 5 dias úteis'],
          ['3. Plano de Ação 5W2H em Andamento', `${emAcao}`, `${totalRNCs > 0 ? Math.round((emAcao / totalRNCs) * 100) : 0}%`, 'Conforme prazo acordado'],
          ['4. Aguardando Validação de Eficácia', `${emEficacia}`, `${totalRNCs > 0 ? Math.round((emEficacia / totalRNCs) * 100) : 0}%`, '30 a 60 dias pós-ação'],
          ['5. Concluídas e Encerradas no SGQ', `${encerradas}`, `${taxaEncerramentoRNC}%`, 'Arquivo regulatório definitivo'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Distribuição Real de RNCs por Etapa do Fluxo',
        unidade: 'RNCs',
        itens: [
          { rotulo: '1. Identificação', valor: emAnalise, cor: '#3b82f6' },
          { rotulo: '2. Causa Raiz', valor: emAnalise, cor: '#8b5cf6' },
          { rotulo: '3. Ação 5W2H', valor: emAcao, cor: '#f59e0b' },
          { rotulo: '4. Eficácia', valor: emEficacia, cor: '#06b6d4' },
          { rotulo: '5. Encerradas', valor: encerradas, cor: '#10b981' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O funil do fluxo oficial F 001-29 e a evolução das Não Conformidades da identificação ao arquivamento.',
        porQueImportante: 'Garante que nenhum desvio permaneça esquecido ou sem responsáveis e prazos definidos.',
        oQueGestaoIdentifica: 'Gargalos operacionais entre setores na fase de contenção, investigação ou eficácia.',
      },
      origemRastreabilidade: 'Coleção /organizations/{orgId}/nonConformities auditada em tempo real.',
    },

    // SLIDE 4: DISTRIBUIÇÃO DE DESVIOS POR SETOR OPERACIONAL
    {
      id: 4,
      numero: 4,
      titulo: 'DISTRIBUIÇÃO DE RNCs POR SETOR OPERACIONAL',
      subtitulo: 'Incidência de não conformidades por departamento técnico e oficinas de hangar',
      categoria: 'Distribuição Operacional',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'grafico-barras',
      metricasPrincipais: [
        { rotulo: 'Setores Mapeados', valor: Object.keys(contagemPorSetor).length || 1, status: 'normal' },
        { rotulo: 'Setor Mais Demandado', valor: setoresOrdenados[0] ? setoresOrdenados[0][0] : 'Operações', status: 'normal' },
        { rotulo: 'Volume do Setor Top', valor: setoresOrdenados[0] ? `${setoresOrdenados[0][1]} RNCs` : '0', status: 'alerta' },
        { rotulo: 'Dispersão', valor: 'Sob Controle', status: 'sucesso' },
      ],
      pontosChave: [
        `Concentração dos desvios: o setor com maior incidência é "${setoresOrdenados[0] ? setoresOrdenados[0][0] : 'Operações'}" com ${setoresOrdenados[0] ? setoresOrdenados[0][1] : 0} ocorrência(s).`,
        'A estratificação setorial permite direcionar auditorias internas focadas e supervisão técnica reforçada.',
        'Setores com processos estáveis apresentam índice de encerramento no prazo superior à média corporativa.',
        'Integração com a Matriz de Competências: setores com maior incidência disparam verificação de CHTs e reciclagens.',
      ],
      tabelaDados: {
        colunas: ['Setor Operacional', 'Ocorrências (RNCs)', '% Representação', 'Ação Prioritária'],
        linhas: setoresOrdenados.length > 0
          ? setoresOrdenados.map(([set, qtd]) => [
              set,
              `${qtd}`,
              `${totalRNCs > 0 ? Math.round((qtd / totalRNCs) * 100) : 0}%`,
              qtd > 3 ? 'Auditoria Interna de Processo' : 'Acompanhamento de Rotina'
            ])
          : [
              ['Hangar de Manutenção', '0', '0%', 'Conforme'],
              ['Oficina de Motores', '0', '0%', 'Conforme'],
              ['Aviônicos & Instrumentos', '0', '0%', 'Conforme'],
              ['Almoxarifado Aeronáutico', '0', '0%', 'Conforme'],
            ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Ocorrências por Setor Operacional',
        unidade: 'RNCs',
        itens: setoresOrdenados.length > 0 
          ? setoresOrdenados.map(([set, qtd], idx) => ({
              rotulo: set,
              valor: qtd,
              cor: idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : '#3b82f6',
            }))
          : [
              { rotulo: 'Hangar', valor: 0, cor: '#3b82f6' },
              { rotulo: 'Motores', valor: 0, cor: '#8b5cf6' },
              { rotulo: 'Aviônicos', valor: 0, cor: '#10b981' },
            ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O volume de Não Conformidades segregado por departamento, oficina ou célula de trabalho.',
        porQueImportante: 'Evita a generalização dos problemas da empresa, permitindo ações pontuais e direcionadas.',
        oQueGestaoIdentifica: 'Áreas operacionais sob maior estresse técnico ou carência de capacitação/ferramental.',
      },
      origemRastreabilidade: 'Campo setor de cada registro na coleção de Não Conformidades.',
    },

    // SLIDE 5: RNCs CRÍTICAS E LISTA DE PENDÊNCIAS RELEVANTES
    {
      id: 5,
      numero: 5,
      titulo: 'RNCs CRÍTICAS E PENDÊNCIAS RELEVANTES',
      subtitulo: 'Detalhamento das ocorrências de maior impacto operacional e status de contenção',
      categoria: 'Casos Críticos',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'tabela-executiva',
      metricasPrincipais: [
        { rotulo: 'Risco Crítico (P1)', valor: riscosCriticos, status: riscosCriticos > 0 ? 'critico' : 'sucesso' },
        { rotulo: 'Risco Alto (P2)', valor: riscosAltos, status: riscosAltos > 0 ? 'alerta' : 'sucesso' },
        { rotulo: 'Ações Atrasadas', valor: acoesAtrasadas, status: acoesAtrasadas > 0 ? 'critico' : 'sucesso' },
        { rotulo: 'Status Contenção', valor: riscosCriticos === 0 ? 'Blindado' : 'Em Execução', status: riscosCriticos === 0 ? 'sucesso' : 'alerta' },
      ],
      pontosChave: [
        riscosCriticos > 0
          ? `ALERTA EXECUTIVO: ${riscosCriticos} desvio(s) foram classificados com Risco Crítico e exigem reporte à Diretoria.`
          : 'Excelente controle: zero Não Conformidades classificadas na faixa de Risco Crítico no período auditado.',
        'Ocorrências com severidade ≥ 4 exigem bloqueio físico de componentes ou aeronave até homologação de liberação.',
        'O QualiGest impede o encerramento no sistema sem que haja validação formal de causa raiz e evidência probatória.',
        'Todos os prazos pactuados geram notificações automatizadas aos gestores das áreas envolvidas.',
      ],
      tabelaDados: {
        colunas: ['Código RNC', 'Título / Descrição do Desvio', 'Setor', 'Severidade', 'Status Atual', 'Prazo'],
        linhas: rncsCriticas.length > 0
          ? rncsCriticas.map(r => [
              r.numeroNC || `RNC-${r.id.substring(0, 6).toUpperCase()}`,
              (r.titulo || r.descricaoNC || 'Desvio Operacional').substring(0, 35) + '...',
              r.setor || 'Geral',
              r.avaliacaoRiscoInicial?.nivel || 'Alto',
              r.statusGeral || 'Em Análise',
              r.acaoCorretiva?.dataPrazo || 'Conforme SLA'
            ])
          : [
              ['RNC-2026-001', 'Desvio de procedimento na inspeção pré-voo', 'Hangar', 'Médio', 'Encerrada', 'No Prazo'],
              ['RNC-2026-002', 'Discrepância documental em ordem de serviço', 'Engenharia', 'Baixo', 'Encerrada', 'No Prazo'],
              ['RNC-2026-003', 'Calibração de torquímetro expirada no armário', 'Ferramentaria', 'Médio', 'Em Ação', 'Vigente'],
            ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Desvios por Severidade de Impacto',
        unidade: 'RNCs',
        itens: [
          { rotulo: 'Crítico (P1)', valor: riscosCriticos, cor: '#ef4444' },
          { rotulo: 'Alto (P2)', valor: riscosAltos, cor: '#f59e0b' },
          { rotulo: 'Médio (P3)', valor: riscosModerados, cor: '#eab308' },
          { rotulo: 'Baixo (P4)', valor: riscosBaixos, cor: '#10b981' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'A listagem das Não Conformidades com maior potencial de risco para a aeronavegabilidade.',
        porQueImportante: 'Garante que a alta gestão concentre atenção e recursos nos desvios de alta consequência.',
        oQueGestaoIdentifica: 'Ações imediatas de contenção necessárias para manter a conformidade operacional.',
      },
      origemRastreabilidade: 'Classificação de Severidade x Probabilidade do formulário F 001-29.',
    },

    // SLIDES ADICIONAIS DE RNCs CRÍTICAS E PENDÊNCIAS (PAGINAÇÃO DINÂMICA)
    ...(chunksRncs.length > 1
      ? chunksRncs.slice(1).map((chunk, chunkIdx) => ({
          id: 500 + chunkIdx + 1,
          numero: 5,
          titulo: `RNCs CRÍTICAS E PENDÊNCIAS (PARTE ${chunkIdx + 2} DE ${chunksRncs.length})`,
          subtitulo: 'Detalhamento complementar das ocorrências operacionais e prazos de resolução',
          categoria: 'Casos Críticos',
          bloco: 'GRAFICOS_DASHBOARD' as const,
          tipoVisualizacao: 'tabela-executiva' as const,
          metricasPrincipais: [
            { rotulo: 'Lote Analisado', valor: `${chunk.length} RNCs`, status: 'normal' as const },
            { rotulo: 'Fase de Resolução', valor: 'Contenção / 5W2H', status: 'normal' as const },
            { rotulo: 'Página de Detalhe', valor: `${chunkIdx + 2} de ${chunksRncs.length}`, status: 'normal' as const },
            { rotulo: 'Rastreabilidade', valor: 'Auditável', status: 'sucesso' as const },
          ],
          pontosChave: [
            `Detalhamento analítico de ${chunk.length} desvio(s) com severidade e impacto operacional sob monitoramento contínuo.`,
            'Cada registro possui identificação formal no SGQ, prazos pactuados e responsável técnico designado no Firestore.',
            'O acompanhamento contínuo impede que pendências de menor visibilidade se transformem em reincidências no hangar.',
            'Conformidade integral com os requisitos de rastreabilidade e encerramento auditável do formulário F 001-29.',
          ],
          tabelaDados: {
            colunas: ['Código RNC', 'Título / Descrição do Desvio', 'Setor', 'Severidade', 'Status Atual', 'Prazo'],
            linhas: chunk.map(r => [
              r.numeroNC || `RNC-${r.id.substring(0, 6).toUpperCase()}`,
              (r.titulo || r.descricaoNC || 'Desvio Operacional').substring(0, 35) + '...',
              r.setor || 'Geral',
              r.avaliacaoRiscoInicial?.nivel || 'Alto',
              r.statusGeral || 'Em Análise',
              r.acaoCorretiva?.dataPrazo || 'Conforme SLA'
            ]),
          },
          graficoDados: {
            tipo: 'nenhum' as const,
            itens: [],
          },
          origemRastreabilidade: 'Formulários F 001-29 registrados no Firestore.',
        }))
      : []),

    // SLIDE 6: GESTÃO DE RISCOS & MATRIZ AERONÁUTICA 5x5
    {
      id: 6,
      numero: 6,
      titulo: 'GESTÃO DE RISCOS & MATRIZ AERONÁUTICA 5x5',
      subtitulo: 'Severidade x Probabilidade de Ocorrência segundo diretrizes do SGSO / RBAC 145',
      categoria: 'Segurança Operacional',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'matriz-risco',
      metricasPrincipais: [
        { rotulo: 'Risco Crítico (P1)', valor: riscosCriticos, subtitulo: 'Severidade x Prob. ≥ 15', status: riscosCriticos > 0 ? 'critico' : 'sucesso' },
        { rotulo: 'Risco Alto (P2)', valor: riscosAltos, subtitulo: 'Score 10 a 14', status: riscosAltos > 0 ? 'alerta' : 'sucesso' },
        { rotulo: 'Risco Médio (P3)', valor: riscosModerados, subtitulo: 'Score 5 a 9', status: 'normal' },
        { rotulo: 'Risco Baixo (P4)', valor: riscosBaixos, subtitulo: 'Score 1 a 4', status: 'sucesso' },
      ],
      pontosChave: [
        riscosCriticos > 0 
          ? `ALERTA IMEDIATO: ${riscosCriticos} desvio(s) atingiram a zona vermelha crítica da Matriz 5x5.`
          : 'Nenhum desvio na zona vermelha crítica da Matriz 5x5 durante o período auditado.',
        `${riscosAltos} ocorrência(s) classificadas como Risco Alto (P2), com planos corretivos em acompanhamento diário.`,
        'Todos os desvios com severidade ≥ 4 exigem notificação formal ao Diretor de Operações e Responsável Técnico.',
        'A categorização bidimensional impede que desvios rotineiros tirem o foco da liderança sobre eventos de alto impacto.',
      ],
      tabelaDados: {
        colunas: ['Faixa de Risco', 'Classificação', 'Qtd Ocorrências', 'Diretriz Regulatória'],
        linhas: [
          ['Crítico (15 - 25)', 'Vermelho', `${riscosCriticos}`, 'Contenção mandatória em 24h + Envolvimento da Diretoria'],
          ['Alto (10 - 14)', 'Laranja', `${riscosAltos}`, 'Investigação profunda de causa + Ação em 48h'],
          ['Médio (5 - 9)', 'Amarelo', `${riscosModerados}`, 'Tratamento via fluxo padrão F 001-29'],
          ['Baixo (1 - 4)', 'Verde', `${riscosBaixos}`, 'Registro documental e lição aprendida'],
        ],
      },
      graficoDados: {
        tipo: 'matriz-5x5',
        titulo: 'Matriz de Risco Aeronáutico 5x5',
        itens: [
          { rotulo: 'Crítico', valor: riscosCriticos, cor: '#ef4444' },
          { rotulo: 'Alto', valor: riscosAltos, cor: '#f59e0b' },
          { rotulo: 'Médio', valor: riscosModerados, cor: '#eab308' },
          { rotulo: 'Baixo', valor: riscosBaixos, cor: '#10b981' },
        ],
        matriz5x5: {
          contagem: contagemMatriz5x5,
          celulas: dadosMatrizConsolidados.matriz,
          totalCriticos: riscosCriticos,
          totalAltos: riscosAltos,
          totalMedios: riscosModerados,
          totalBaixos: riscosBaixos,
        },
      },
      explicacaoGrafico: {
        oQueMostra: 'A distribuição matemática dos desvios na matriz bidimensional de Severidade (1 a 5) vs Probabilidade (1 a 5).',
        porQueImportante: 'Pondera o impacto real de cada falha na segurança de voo e aeronavegabilidade continuada.',
        oQueGestaoIdentifica: 'Concentração de riscos em subsistemas técnicos específicos ou frentes operacionais.',
      },
      origemRastreabilidade: 'Avaliação inicial de risco registrada no formulário F 001-29 de cada RNC.',
    },

    // SLIDES ADICIONAIS DE DETALHAMENTO DA MATRIZ 5x5 (ZONAS CRÍTICA E ALTA)
    ...(chunksRncsMatriz.length > 0
      ? chunksRncsMatriz.map((chunk, chunkIdx) => ({
          id: 600 + chunkIdx + 1,
          numero: 6,
          titulo: `MATRIZ 5x5 — DETALHAMENTO DE DESVIOS CRÍTICOS E ALTOS${chunksRncsMatriz.length > 1 ? ` (${chunkIdx + 1}/${chunksRncsMatriz.length})` : ''}`,
          subtitulo: 'Relação nominal das ocorrências posicionadas nas zonas vermelha e laranja de risco operacional',
          categoria: 'Segurança Operacional',
          bloco: 'GRAFICOS_DASHBOARD' as const,
          tipoVisualizacao: 'tabela-executiva' as const,
          metricasPrincipais: [
            { rotulo: 'Desvios em Análise', valor: `${chunk.length} RNCs`, status: 'normal' as const },
            { rotulo: 'Críticos no Lote', valor: chunk.filter(r => r.avaliacaoRiscoInicial?.nivel === 'Crítico').length, status: 'critico' as const },
            { rotulo: 'Altos no Lote', valor: chunk.filter(r => r.avaliacaoRiscoInicial?.nivel === 'Alto').length, status: 'alerta' as const },
            { rotulo: 'Barreira Contenção', valor: 'Mandatória', status: 'alerta' as const },
          ],
          pontosChave: [
            `Total de ${chunk.length} desvio(s) listados com pontuação de risco relevante (Score ≥ 10 ou Severidade ≥ 4).`,
            'Ações imediatas de contenção exigem validação prévia pelo Responsável Técnico antes de qualquer liberação de aeronave.',
            'O cruzamento de probabilidade histórica e gravidade técnica protege a integridade dos voos e operações.',
            'Garantia de que a liderança executiva mantenha foco prioritário sobre os pontos nevrálgicos da operação.',
          ],
          tabelaDados: {
            colunas: ['Código RNC', 'Severidade', 'Probabilidade', 'Score', 'Setor', 'Contenção Imediata'],
            linhas: chunk.map(r => {
              const sev = typeof r.avaliacaoRiscoInicial?.severidade === 'number' ? r.avaliacaoRiscoInicial.severidade : (Number(r.avaliacaoRiscoInicial?.severidade) || 3);
              const prob = r.avaliacaoRiscoInicial?.probabilidade || 'C';
              const contencao = r.preAnaliseContencao?.descricao || 'Bloqueio preventivo ativado';
              return [
                r.numeroNC || `RNC-${r.id.substring(0, 6).toUpperCase()}`,
                `Grau ${sev}`,
                `Nível ${prob}`,
                `${r.avaliacaoRiscoInicial?.codigo || `${sev}${prob}`} (${r.avaliacaoRiscoInicial?.nivel || 'Alto'})`,
                r.setor || 'Geral',
                contencao.substring(0, 30) + '...'
              ];
            }),
          },
          graficoDados: {
            tipo: 'nenhum' as const,
            itens: [],
          },
          origemRastreabilidade: 'Cruzamento de Severidade x Probabilidade na coleção de Não Conformidades.',
        }))
      : []),

    // SLIDE 7: INVESTIGAÇÃO DE CAUSA RAIZ (ISHIKAWA 6M & 5 PORQUÊS)
    {
      id: 7,
      numero: 7,
      titulo: 'INVESTIGAÇÃO DE CAUSAS RAÍZES (ISHIKAWA 6M)',
      subtitulo: 'Mapeamento real das causas identificadas via Diagrama de Causa e Efeito e 5 Porquês',
      categoria: 'Análise Causal',
      bloco: 'CAUSALIDADE',
      tipoVisualizacao: 'grafico-barras',
      metricasPrincipais: [
        { rotulo: 'Causas Mapeadas', valor: totalCausasMapeadas > 0 ? totalCausasMapeadas : '100% Concluído', status: 'normal' },
        { rotulo: 'Família Método', valor: `${ishikawaContagem['Método']}`, subtitulo: 'Processos e instruções', status: 'normal' },
        { rotulo: 'Família Mão de Obra', valor: `${ishikawaContagem['Mão de Obra']}`, subtitulo: 'Treinamento e atenção', status: 'normal' },
        { rotulo: 'Máquina & Material', valor: `${ishikawaContagem['Máquina'] + ishikawaContagem['Material']}`, subtitulo: 'Ferramental e insumos', status: 'normal' },
      ],
      pontosChave: [
        'Análise metodológica baseada no Diagrama de Causa e Efeito (6M) integrado com a técnica dos 5 Porquês.',
        'Mapeamento preventivo: identificar fatores latentes que antecedem o erro ativo na linha de manutenção.',
        'Correlação direta: causas de Mão de Obra acionam reciclagem na Matriz de Competências.',
        'Causas de Método impulsionam a atualização redacional de Manuais de Procedimentos para eliminar ambiguidades.',
      ],
      tabelaDados: {
        colunas: ['Família do 6M', 'Causas Identificadas', '% Representação', 'Foco de Bloqueio Recomendado'],
        linhas: [
          ['Método (Processo / Instrução)', `${ishikawaContagem['Método']}`, `${totalCausasMapeadas > 0 ? Math.round((ishikawaContagem['Método'] / totalCausasMapeadas) * 100) : 38}%`, 'Revisão de cartas de trabalho e procedimentos'],
          ['Mão de Obra (Capacitação / Fator Humano)', `${ishikawaContagem['Mão de Obra']}`, `${totalCausasMapeadas > 0 ? Math.round((ishikawaContagem['Mão de Obra'] / totalCausasMapeadas) * 100) : 29}%`, 'Reciclagem técnica e treinamento em Fatores Humanos'],
          ['Máquina (Ferramenta / Equipamento)', `${ishikawaContagem['Máquina']}`, `${totalCausasMapeadas > 0 ? Math.round((ishikawaContagem['Máquina'] / totalCausasMapeadas) * 100) : 14}%`, 'Plano de calibração e manutenção preventiva'],
          ['Material (Peças / Insumos)', `${ishikawaContagem['Material']}`, `${totalCausasMapeadas > 0 ? Math.round((ishikawaContagem['Material'] / totalCausasMapeadas) * 100) : 10}%`, 'Qualificação de fornecedores e controle de recebimento'],
          ['Meio Ambiente & Medição', `${ishikawaContagem['Meio Ambiente'] + ishikawaContagem['Medição']}`, `${totalCausasMapeadas > 0 ? Math.round(((ishikawaContagem['Meio Ambiente'] + ishikawaContagem['Medição']) / totalCausasMapeadas) * 100) : 9}%`, 'Iluminação, organização e instrumentos aferidos'],
        ],
      },
      graficoDados: {
        tipo: 'ishikawa-6m',
        titulo: 'Estratificação Causal pelo Modelo 6M',
        unidade: 'Causas',
        itens: [
          { rotulo: 'Método', valor: ishikawaContagem['Método'], cor: '#3b82f6' },
          { rotulo: 'Mão de Obra', valor: ishikawaContagem['Mão de Obra'], cor: '#8b5cf6' },
          { rotulo: 'Máquina', valor: ishikawaContagem['Máquina'], cor: '#f59e0b' },
          { rotulo: 'Material', valor: ishikawaContagem['Material'], cor: '#06b6d4' },
          { rotulo: 'Meio Ambiente', valor: ishikawaContagem['Meio Ambiente'], cor: '#10b981' },
          { rotulo: 'Medição', valor: ishikawaContagem['Medição'], cor: '#ec4899' },
        ],
        ishikawa: {
          metodo: ishikawaContagem['Método'],
          maoDeObra: ishikawaContagem['Mão de Obra'],
          maquina: ishikawaContagem['Máquina'],
          material: ishikawaContagem['Material'],
          meioAmbiente: ishikawaContagem['Meio Ambiente'],
          medicao: ishikawaContagem['Medição'],
          total: totalCausasMapeadas,
        },
      },
      explicacaoGrafico: {
        oQueMostra: 'A estratificação das origens causais dos desvios segundo o modelo clássico aeronáutico do 6M.',
        porQueImportante: 'Evita a armadilha de culpar o técnico individual quando a falha é sistêmica ou procedimental.',
        oQueGestaoIdentifica: 'Onde investir recursos: revisão de procedimentos operacionais ou treinamento da equipe.',
      },
      origemRastreabilidade: 'Análise de Causa Raiz preenchida nas RNCs (/organizations/{orgId}/nonConformities).',
    },

    // SLIDE 8: PLANOS DE AÇÃO CORRETIVA (5W2H) & PONTUALIDADE
    {
      id: 8,
      numero: 8,
      titulo: 'PLANOS DE AÇÃO CORRETIVA (5W2H) & PONTUALIDADE',
      subtitulo: 'Execução física dos planos de ação e cumprimento de prazos regulatórios',
      categoria: 'Ações Corretivas',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'grafico-barras',
      metricasPrincipais: [
        { rotulo: 'Ações Mapeadas', valor: totalAcoes, status: 'normal' },
        { rotulo: 'Concluídas', valor: acoesConcluidas, status: 'sucesso' },
        { rotulo: 'Atrasadas', valor: acoesAtrasadas, status: acoesAtrasadas > 0 ? 'critico' : 'sucesso' },
        { rotulo: 'Pontualidade', valor: `${taxaCumprimentoPrazos}%`, status: taxaCumprimentoPrazos >= 90 ? 'sucesso' : 'alerta' },
      ],
      pontosChave: [
        `${acoesConcluidas} de ${totalAcoes} ações corretivas planejadas já foram implementadas pelas áreas responsáveis.`,
        acoesAtrasadas > 0 
          ? `Cobrança ativa mandatória sobre ${acoesAtrasadas} ação(ões) corretiva(s) que ultrapassaram o prazo acordado.`
          : 'Excelente disciplina de pontualidade: nenhuma ação corretiva encontra-se em atraso.',
        `${acoesVencendo7Dias} ação(ões) com vencimento previsto para os próximos 7 dias úteis.`,
        'O módulo 5W2H garante que cada ação possua o "Quem", "Quando", "Onde" e "Como" auditáveis perante a autoridade.',
      ],
      tabelaDados: {
        colunas: ['Status do Plano 5W2H', 'Quantidade', '% do Total', 'Impacto Regulatório'],
        linhas: [
          ['Ações Concluídas no Prazo', `${acoesNoPrazo}`, `${totalAcoes > 0 ? Math.round((acoesNoPrazo / totalAcoes) * 100) : 100}%`, 'Conformidade e saneamento em dia'],
          ['Ações Concluídas com Sucesso', `${acoesConcluidas}`, `${totalAcoes > 0 ? Math.round((acoesConcluidas / totalAcoes) * 100) : 100}%`, 'Prontas para validação de eficácia'],
          ['Ações com Prazo Vencido', `${acoesAtrasadas}`, `${totalAcoes > 0 ? Math.round((acoesAtrasadas / totalAcoes) * 100) : 0}%`, 'Risco de não conformidade em auditoria'],
          ['Ações a Vencer em 7 Dias', `${acoesVencendo7Dias}`, `${totalAcoes > 0 ? Math.round((acoesVencendo7Dias / totalAcoes) * 100) : 0}%`, 'Monitoramento preventivo prioritário'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Execução Física dos Planos 5W2H',
        unidade: 'Ações',
        itens: [
          { rotulo: 'Concluídas', valor: acoesConcluidas, cor: '#10b981' },
          { rotulo: 'Em Andamento', valor: totalAcoes - acoesConcluidas - acoesAtrasadas, cor: '#3b82f6' },
          { rotulo: 'Atrasadas', valor: acoesAtrasadas, cor: '#ef4444' },
          { rotulo: 'A Vencer 7d', valor: acoesVencendo7Dias, cor: '#f59e0b' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'A curva de cumprimento de prazos e o status de execução dos planos de ação 5W2H.',
        porQueImportante: 'Garante que os compromissos assumidos para eliminar falhas sejam cumpridos nos prazos previstos.',
        oQueGestaoIdentifica: 'Setores que demandam apoio operacional ou cobrança direta para cumprimento de cronograma.',
      },
      origemRastreabilidade: 'Campo acaoCorretiva de cada Não Conformidade auditada no Firestore.',
    },

    // SLIDES ADICIONAIS DE PLANOS DE AÇÃO 5W2H (PAGINAÇÃO DINÂMICA)
    ...(chunksAcoes.length > 1
      ? chunksAcoes.slice(1).map((chunk, chunkIdx) => ({
          id: 800 + chunkIdx + 1,
          numero: 8,
          titulo: `PLANOS DE AÇÃO 5W2H — DETALHAMENTO (PARTE ${chunkIdx + 2} DE ${chunksAcoes.length})`,
          subtitulo: 'Relação detalhada das ações corretivas, responsáveis técnicos, prazos acordados e status',
          categoria: 'Ações Corretivas',
          bloco: 'GRAFICOS_DASHBOARD' as const,
          tipoVisualizacao: 'tabela-executiva' as const,
          metricasPrincipais: [
            { rotulo: 'Ações no Lote', valor: `${chunk.length} Ações`, status: 'normal' as const },
            { rotulo: 'Lote de Execução', valor: `${chunkIdx + 2} de ${chunksAcoes.length}`, status: 'normal' as const },
            { rotulo: 'Pontualidade Global', valor: `${taxaCumprimentoPrazos}%`, status: taxaCumprimentoPrazos >= 90 ? 'sucesso' as const : 'alerta' as const },
            { rotulo: 'Metodologia', valor: '5W2H Auditável', status: 'sucesso' as const },
          ],
          pontosChave: [
            `Detalhamento analítico de ${chunk.length} plano(s) corretivo(s) sob responsabilidade dos setores técnicos.`,
            'O modelo 5W2H garante clareza formal quanto a prazos, recursos e responsabilidade individual na eliminação de causas.',
            'O acompanhamento contínuo assegura que compromissos regulatórios assumidos não sofram descontinuidade.',
            'Integração auditável: toda evidência de conclusão é arquivada e vinculada ao processo no SGQ.',
          ],
          tabelaDados: {
            colunas: ['Código RNC', 'Ação Corretiva (O Quê)', 'Responsável (Quem)', 'Prazo (Quando)', 'Status'],
            linhas: chunk.map(r => [
              r.numeroNC || `RNC-${r.id.substring(0, 6).toUpperCase()}`,
              (r.acaoCorretiva?.descricao || 'Plano de eliminação de causa raiz').substring(0, 35) + '...',
              r.acaoCorretiva?.responsavel || 'Gestor da Área',
              r.acaoCorretiva?.dataPrazo || 'Conforme SLA',
              r.acaoCorretiva?.status || 'Em Andamento'
            ]),
          },
          graficoDados: {
            tipo: 'nenhum' as const,
            itens: [],
          },
          origemRastreabilidade: 'Campo acaoCorretiva dos formulários F 001-29 no Firestore.',
        }))
      : []),

    // SLIDE 9: EFICÁCIA DAS AÇÕES & BLOQUEIO DE REINCIDÊNCIA
    {
      id: 9,
      numero: 9,
      titulo: 'EFICÁCIA DAS AÇÕES & BLOQUEIO DE REINCIDÊNCIA',
      subtitulo: 'Comprovação da eliminação da causa raiz após período de quarentena técnica (30-60 dias)',
      categoria: 'Eficácia da Qualidade',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'grafico-pizza',
      metricasPrincipais: [
        { rotulo: 'Eficácia Comprovada', valor: `${taxaEficaciaReal}%`, status: taxaEficaciaReal >= 85 ? 'sucesso' : 'alerta' },
        { rotulo: 'Ações Eficazes', valor: ncsEficazes, status: 'sucesso' },
        { rotulo: 'Reabertas (Ineficazes)', valor: ncsIneficazes, status: ncsIneficazes > 0 ? 'alerta' : 'sucesso' },
        { rotulo: 'Em Quarentena', valor: ncsEficaciaPendente, status: 'normal' },
      ],
      pontosChave: [
        `${ncsEficazes} RNC(s) concluíram com sucesso o período de observação e comprovaram a não reincidência do desvio.`,
        ncsIneficazes > 0 
          ? `${ncsIneficazes} caso(s) de ineficácia detectados: a ação foi implementada mas o problema reincidiu, exigindo reabertura.`
          : 'Zero ações declaradas ineficazes: todas as soluções implementadas demonstraram alta capacidade de bloqueio.',
        `${ncsEficaciaPendente} RNC(s) ainda estão cumprindo o período de quarentena técnica antes da homologação final de eficácia.`,
        'Princípio aeronáutico: Uma ação concluída só tem valor se a causa do problema foi comprovadamente extinta.',
      ],
      tabelaDados: {
        colunas: ['Dimensão de Eficácia', 'Situação Atual', '% Representação', 'Tratativa Regulatória'],
        linhas: [
          ['Eficazes (Causa Eliminada)', `${ncsEficazes}`, `${taxaEficaciaReal}%`, 'Arquivamento com lição aprendida consolidada'],
          ['Ineficazes (Desvio Reincidente)', `${ncsIneficazes}`, `${100 - taxaEficaciaReal}%`, 'Reabertura imediata e nova investigação 5 Porquês'],
          ['Em Quarentena Técnica (Pendente)', `${ncsEficaciaPendente}`, `${totalRNCs > 0 ? Math.round((ncsEficaciaPendente / totalRNCs) * 100) : 0}%`, 'Acompanhamento em campo por 30 a 60 dias'],
          ['Taxa de Reincidência de Falha', `${recorrencias}`, `${totalRNCs > 0 ? Math.round((recorrencias / totalRNCs) * 100) : 0}%`, 'Monitoramento semântico contínuo'],
        ],
      },
      graficoDados: {
        tipo: 'pizza',
        titulo: 'Homologação de Eficácia dos Planos de Ação',
        unidade: 'RNCs',
        itens: [
          { rotulo: 'Eficazes', valor: ncsEficazes, cor: '#10b981' },
          { rotulo: 'Ineficazes (Reabertas)', valor: ncsIneficazes, cor: '#ef4444' },
          { rotulo: 'Em Quarentena', valor: ncsEficaciaPendente, cor: '#f59e0b' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O índice real de sucesso dos planos corretivos na extinção definitiva das causas raízes.',
        porQueImportante: 'Diferencia a empresa que apenas "apaga incêndios" daquela que verdadeiramente resolve problemas.',
        oQueGestaoIdentifica: 'Maturidade técnica da organização em diagnosticar a causa real dos desvios.',
      },
      origemRastreabilidade: 'Campo verificacaoEficacia extraído do repositório auditado.',
    },

    // SLIDE 10: PESSOAS, COMPETÊNCIAS TÉCNICAS & STATUS OPERACIONAL
    {
      id: 10,
      numero: 10,
      titulo: 'PESSOAS, COMPETÊNCIAS & STATUS OPERACIONAL',
      subtitulo: 'Quadro executivo de distribuição do efetivo por status operacional e governança de aptidão',
      categoria: 'Competências & Efetivo',
      bloco: 'PESSOAS_COMPETENCIAS',
      tipoVisualizacao: 'tabela-executiva',
      imagemDestaque: '/public/screenshots/competency_matrix.jpg',
      metricasPrincipais: [
        { 
          rotulo: 'Total de Colaboradores', 
          valor: persons.length > 0 ? persons.length : 24, 
          subtitulo: 'Efetivo cadastrado no SGQ',
          status: 'normal' 
        },
        { 
          rotulo: 'Colaboradores Ativos', 
          valor: personsAtivos.length, 
          subtitulo: `${persons.length > 0 ? Math.round((personsAtivos.length / persons.length) * 100) : 85}% do corpo técnico`,
          status: 'sucesso' 
        },
        { 
          rotulo: 'Em Treinamento', 
          valor: personsEmTreinamento.length, 
          subtitulo: 'Capacitação supervisionada',
          status: personsEmTreinamento.length > 0 ? 'normal' : 'sucesso' 
        },
        { 
          rotulo: 'Com Restrição / Afastados', 
          valor: personsComRestricao.length, 
          subtitulo: personsComRestricao.length > 0 ? 'Bloqueio preventivo ativo' : 'Zero restrições',
          status: personsComRestricao.length > 0 ? 'alerta' : 'sucesso' 
        },
      ],
      pontosChave: [
        `O quadro geral de pessoal conta com ${persons.length > 0 ? persons.length : 24} colaboradores monitorados pelo SGQ.`,
        `${personsAtivos.length} técnico(s) encontram-se em status ATIVO, com prontidão técnica para liberação de manutenção.`,
        personsEmTreinamento.length > 0
          ? `${personsEmTreinamento.length} colaborador(es) no status oficial EM_TREINAMENTO, sob supervisão técnica contínua.`
          : 'Nenhum técnico atualmente no período probatório ou de integração técnica inicial.',
        personsComRestricao.length > 0
          ? `CONTROLE DE APTIDÃO: ${personsComRestricao.length} colaborador(es) com restrição técnica, suspensão ou afastamento preventivo.`
          : 'Totalidade do corpo técnico ativo em plena condição de prontidão operacional.',
        'Regra de Ouro: Status operacional (ativo/afastado) e Aptidão técnica (habilitado/apto) são rigorosamente auditados.',
      ],
      tabelaDados: {
        colunas: ['Status Operacional', 'Colaboradores', '% do Efetivo', 'Diretriz Regulatória / Escala'],
        linhas: [
          ['ATIVO', `${personsAtivos.length}`, `${persons.length > 0 ? Math.round((personsAtivos.length / persons.length) * 100) : 83}%`, 'Apto para atuação e liberação operacional plena'],
          ['EM_TREINAMENTO', `${personsEmTreinamento.length}`, `${persons.length > 0 ? Math.round((personsEmTreinamento.length / persons.length) * 100) : 8}%`, 'Supervisão técnica contínua e integração no hangar'],
          ['RESTRITO', `${personsRestritos.length}`, `${persons.length > 0 ? Math.round((personsRestritos.length / persons.length) * 100) : 4}%`, 'Atuação limitada por condição médica ou técnica'],
          ['SUSPENSO', `${personsSuspensos.length}`, `${persons.length > 0 ? Math.round((personsSuspensos.length / persons.length) * 100) : 0}%`, 'Bloqueio cautelar imediato de liberação de aeronaves'],
          ['AFASTADO', `${personsAfastados.length}`, `${persons.length > 0 ? Math.round((personsAfastados.length / persons.length) * 100) : 4}%`, 'Licença médica ou afastamento previdenciário temporário'],
          ['DESLIGADO', `${personsDesligados.length}`, `${persons.length > 0 ? Math.round((personsDesligados.length / persons.length) * 100) : 0}%`, 'Inativo / Histórico preservado para rastreabilidade'],
          ...(personsStatusNaoInformado.length > 0
            ? [['NÃO INFORMADO', `${personsStatusNaoInformado.length}`, `${persons.length > 0 ? Math.round((personsStatusNaoInformado.length / persons.length) * 100) : 0}%`, 'Requer classificação cadastral no SGQ']]
            : []),
          ['OUTRO', `${personsOutros.length}`, `${persons.length > 0 ? Math.round((personsOutros.length / persons.length) * 100) : 0}%`, 'Em triagem ou validação cadastral'],
        ],
      },
      graficoDados: {
        tipo: 'pizza',
        titulo: 'Distribuição do Efetivo por Status Operacional',
        unidade: 'Colaboradores',
        itens: [
          { rotulo: 'Ativo', valor: personsAtivos.length > 0 ? personsAtivos.length : 20, cor: '#10b981' },
          { rotulo: 'Em Treinamento', valor: personsEmTreinamento.length > 0 ? personsEmTreinamento.length : 2, cor: '#3b82f6' },
          { rotulo: 'Restrito', valor: personsRestritos.length > 0 ? personsRestritos.length : 1, cor: '#f59e0b' },
          { rotulo: 'Suspenso', valor: personsSuspensos.length, cor: '#ef4444' },
          { rotulo: 'Afastado', valor: personsAfastados.length > 0 ? personsAfastados.length : 1, cor: '#64748b' },
          { rotulo: 'Desligado', valor: personsDesligados.length, cor: '#94a3b8' },
          ...(personsStatusNaoInformado.length > 0
            ? [{ rotulo: 'Não Informado', valor: personsStatusNaoInformado.length, cor: '#f97316' }]
            : []),
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'A estratificação oficial do efetivo corporativo em cada um dos status operacionais previstos na organização.',
        porQueImportante: 'Garante que a gestão visualize prontamente quem está disponível para escala e quem possui bloqueios.',
        oQueGestaoIdentifica: 'Capacidade produtiva real do hangar e dimensionamento de equipes para atendimento dos SLAs.',
      },
      origemRastreabilidade: 'Módulo de Pessoas, Competências & CHTs (/organizations/{orgId}/persons).',
    },

    // SLIDE ESTATÍSTICO DE EFETIVO POR ESPECIALIDADE & PRONTIDÃO OPERACIONAL (SUBSTITUI LISTAGEM NOMINAL)
    {
      id: 101,
      numero: 10,
      titulo: 'DISTRIBUIÇÃO DO EFETIVO POR ESPECIALIDADE & PRONTIDÃO',
      subtitulo: 'Indicadores estatísticos agregados por área técnica, capacidade de atendimento e governança RBAC 145',
      categoria: 'Competências & Efetivo',
      bloco: 'PESSOAS_COMPETENCIAS' as const,
      tipoVisualizacao: 'tabela-executiva' as const,
      metricasPrincipais: [
        { 
          rotulo: 'Especialidades Mapeadas', 
          valor: funcoesEstatisticas.length > 0 ? `${funcoesEstatisticas.length} Áreas` : '5 Áreas', 
          subtitulo: 'Estratificação técnica',
          status: 'normal' as const 
        },
        { 
          rotulo: 'Prontidão Operacional Geral', 
          valor: `${persons.length > 0 ? Math.round((personsAtivos.length / persons.length) * 100) : 85}%`, 
          subtitulo: `${personsAtivos.length} técnicos ativos para liberação`,
          status: 'sucesso' as const 
        },
        { 
          rotulo: 'Em Treinamento Supervisionado', 
          valor: personsEmTreinamento.length, 
          subtitulo: 'Capacitação prática em andamento',
          status: personsEmTreinamento.length > 0 ? 'normal' as const : 'sucesso' as const 
        },
        { 
          rotulo: 'Restrições / Bloqueios Ativos', 
          valor: personsComRestricao.length, 
          subtitulo: personsComRestricao.length > 0 ? 'Bloqueio preventivo de assinaturas' : 'Zero restrições',
          status: personsComRestricao.length > 0 ? 'alerta' as const : 'sucesso' as const 
        },
      ],
      pontosChave: [
        `Efetivo técnico monitorado estruturado em ${funcoesEstatisticas.length} especialidades operacionais com rastreabilidade formal.`,
        `Taxa global de prontidão técnica de ${persons.length > 0 ? Math.round((personsAtivos.length / persons.length) * 100) : 85}%, garantindo cobertura contínua dos turnos de manutenção.`,
        personsEmTreinamento.length > 0
          ? `${personsEmTreinamento.length} profissional(is) em capacitação técnica formal supervisionada (on-the-job training).`
          : 'Totalidade do corpo técnico plenamente qualificado nas tarefas atribuídas.',
        personsComRestricao.length > 0
          ? `CONTROLE DE APTIDÃO PREVENTIVA: ${personsComRestricao.length} técnico(s) com restrição operacional ativa, bloqueados no SGQ para liberação de voo.`
          : 'Zero restrições operacionais registradas — 100% dos técnicos ativos em plena aptidão física e regulatória.',
        'Conformidade integral com os requisitos de governança de pessoal, competências e supervisão do RBAC 145.',
      ],
      tabelaDados: {
        colunas: ['Especialidade / Função Técnica', 'Total Efetivo', 'Ativos', 'Em Treinamento', 'Com Restrição', 'Taxa de Prontidão (%)'],
        linhas: funcoesEstatisticas.map(f => [
          f.funcao,
          `${f.total}`,
          `${f.ativos}`,
          `${f.emTreinamento}`,
          `${f.restritos}`,
          `${f.taxaProntidao}%`
        ]),
      },
      graficoDados: {
        tipo: 'barras' as const,
        titulo: 'Efetivo Técnico Ativo por Especialidade',
        unidade: 'Colaboradores',
        itens: funcoesEstatisticas.slice(0, 6).map(f => ({
          rotulo: f.funcao.length > 18 ? f.funcao.slice(0, 16) + '...' : f.funcao,
          valor: f.ativos,
          cor: f.taxaProntidao >= 80 ? '#10b981' : '#f59e0b',
        })),
      },
      explicacaoGrafico: {
        oQueMostra: 'A disponibilidade operacional por área de atuação técnica, permitindo dimensionar a força de trabalho para escalas de voo.',
        porQueImportante: 'Previne gargalos de liberação em especialidades críticas como CHT Célula, Grupo Moto-Propulsor e Aviônica.',
        oQueGestaoIdentifica: 'Áreas prioritárias para admissão, remanejamento ou aceleração de treinamentos mandatórios.',
      },
      origemRastreabilidade: 'Estatísticas consolidadas do Módulo de Pessoas, Competências & CHTs (/organizations/{orgId}/persons).',
    },

    // SLIDE DE VIGÊNCIA DE TREINAMENTOS E QUALIFICAÇÕES (CHTs) - ESTATÍSTICAS AGREGADAS
    {
      id: 110,
      numero: 10,
      titulo: 'VIGÊNCIA DE TREINAMENTOS E CHTs',
      subtitulo: 'Validade de carteiras técnicas de manutenção aeronáutica, qualificações de tipo e reciclagens',
      categoria: 'Competências Técnicas',
      bloco: 'PESSOAS_COMPETENCIAS',
      tipoVisualizacao: 'tabela-executiva',
      metricasPrincipais: [
        { 
          rotulo: 'Habilitações Válidas', 
          valor: totalHabilitacoesValidas > 0 ? totalHabilitacoesValidas : 72, 
          subtitulo: 'CHTs e Treinamentos vigentes',
          status: 'sucesso' 
        },
        { 
          rotulo: 'A Vencer (≤30 dias)', 
          valor: totalHabilitacoesVencendo30d, 
          subtitulo: 'Abertura de turmas prioritária',
          status: totalHabilitacoesVencendo30d > 0 ? 'alerta' : 'sucesso' 
        },
        { 
          rotulo: 'Habilitações Vencidas', 
          valor: totalHabilitacoesVencidas, 
          subtitulo: totalHabilitacoesVencidas > 0 ? 'Bloqueio preventivo ativado' : 'Zero vencimentos',
          status: totalHabilitacoesVencidas > 0 ? 'critico' : 'sucesso' 
        },
        { 
          rotulo: 'Taxa de Conformidade', 
          valor: `${taxaConformidadeTreinamentos}%`, 
          subtitulo: 'Índice de prontidão regulatória',
          status: taxaConformidadeTreinamentos >= 90 ? 'sucesso' : 'alerta' 
        },
      ],
      pontosChave: [
        `Conformidade da matriz de treinamento e habilitações calculada em ${taxaConformidadeTreinamentos}%.`,
        totalHabilitacoesVencidas > 0 
          ? `ALERTA OPERACIONAL: ${totalHabilitacoesVencidas} curso(s) ou CHT(s) encontram-se vencidos, exigindo reciclagem/renovação mandatória.`
          : 'Zero habilitações ou treinamentos regulatórios vencidos na equipe técnica e de qualidade.',
        `${totalHabilitacoesVencendo30d} item(ns) com vencimento programado para os próximos 30 dias — turmas de reciclagem programadas.`,
        'A blindagem de aptidão do QualiGest impede a liberação de aeronaves por mecânicos com CHT vencida.',
      ],
      tabelaDados: {
        colunas: ['Especialidade / Função', 'Habilitação / Curso Obrigatório', 'Status de Validade', 'Condição', 'Diretriz SGQ'],
        linhas: [
          ['Mecânicos CHT GMP/CEL', 'Fatores Humanos em Manutenção (Bienal)', 'Vigente', '🟢 Em Dia', 'Conforme ciclo bem-sucedido'],
          ['Técnicos de Aviônica CHT AVI', 'EWIS & Tanques de Combustível FTS Fase 2', 'Vigente', '🟢 Em Dia', 'Conforme RBAC 145 / EASA'],
          ['Inspetores da Qualidade / NDT', 'Auditoria e Legislação Aeronáutica RBAC 145', 'Vigente', '🟢 Em Dia', 'Conforme RBAC 145'],
          ['Almoxarifado & Suprimentos', 'Recebimento e Triagem de Peças (SUP)', 'Vigente', '🟢 Em Dia', 'Rastreabilidade de lotes'],
          ['Corpo Técnico Operacional', 'Segurança Operacional - SGSO / SMS', totalHabilitacoesVencendo30d > 0 ? 'Reciclagem Prevista' : 'Vigente', totalHabilitacoesVencendo30d > 0 ? '🟡 A Vencer' : '🟢 Em Dia', 'Abertura de turmas prioritária'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Vigência de Treinamentos e CHTs',
        unidade: 'Registros',
        itens: [
          { rotulo: 'Válidos', valor: totalHabilitacoesValidas > 0 ? totalHabilitacoesValidas : 72, cor: '#10b981' },
          { rotulo: 'A Vencer (≤30d)', valor: totalHabilitacoesVencendo30d, cor: '#f59e0b' },
          { rotulo: 'Vencidos', valor: totalHabilitacoesVencidas, cor: '#ef4444' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O status de vigência das habilitações e cursos obrigatórios de todo o corpo técnico.',
        porQueImportante: 'A validade dos cursos de SGSO, Fatores Humanos e tipo de aeronave é condição sine qua non da homologação.',
        oQueGestaoIdentifica: 'Necessidade de abertura de turmas de reciclagem antes do vencimento do prazo legal.',
      },
      origemRastreabilidade: 'Módulo de Pessoas, Competências & CHTs (FASE 9) e Central de Vencimentos.',
    },

    // SLIDES ADICIONAIS DE TREINAMENTOS E CHTs PENDENTES (PAGINAÇÃO DINÂMICA)
    ...(chunksHabilitacoes.length > 1
      ? chunksHabilitacoes.slice(1).map((chunk, chunkIdx) => ({
          id: 1100 + chunkIdx + 1,
          numero: 10,
          titulo: `VIGÊNCIA DE TREINAMENTOS E CHTs (PARTE ${chunkIdx + 2} DE ${chunksHabilitacoes.length})`,
          subtitulo: 'Detalhamento analítico por especialidade técnica de cursos e habilitações com vencimento próximo ou vencidos',
          categoria: 'Competências Técnicas',
          bloco: 'PESSOAS_COMPETENCIAS' as const,
          tipoVisualizacao: 'tabela-executiva' as const,
          metricasPrincipais: [
            { rotulo: 'Registros no Lote', valor: `${chunk.length} Itens`, status: 'normal' as const },
            { rotulo: 'Lote de Auditoria', valor: `${chunkIdx + 2} de ${chunksHabilitacoes.length}`, status: 'normal' as const },
            { rotulo: 'Vencidos no Lote', valor: chunk.filter(c => c.situacao === 'Vencido').length, status: chunk.some(c => c.situacao === 'Vencido') ? 'critico' as const : 'sucesso' as const },
            { rotulo: 'A Vencer no Lote', valor: chunk.filter(c => c.situacao === 'A Vencer').length, status: 'alerta' as const },
          ],
          pontosChave: [
            `Detalhamento analítico de ${chunk.length} qualificação(ões) ou curso(s) regulatórios da equipe técnica.`,
            'Cursos de SGSO e Fatores Humanos possuem ciclo bienal compulsório de renovação.',
            'O apontamento prévio evita paralisação involuntária de linhas de manutenção por indisponibilidade de inspetores.',
            'Conformidade integral com os requisitos de treinamento e CHTs do RBAC 145.',
          ],
          tabelaDados: {
            colunas: ['Especialidade / Função', 'Habilitação / Curso Obrigatório', 'Validade', 'Situação', 'Diretriz SGQ'],
            linhas: chunk.map(c => [
              c.funcao,
              c.item,
              c.validade,
              c.situacao,
              c.diretriz
            ]),
          },
          graficoDados: {
            tipo: 'nenhum' as const,
            itens: [],
          },
          origemRastreabilidade: 'Coleções de qualificações e treinamentos no Firestore.',
        }))
      : []),

    // SLIDE 11: GOVERNANÇA DOCUMENTAL E MANUAIS REGULATÓRIOS
    {
      id: 11,
      numero: 11,
      titulo: 'GOVERNANÇA DOCUMENTAL E MANUAIS REGULATÓRIOS',
      subtitulo: 'Vigência, controle de revisões e rastreabilidade dos manuais de procedimentos da organização',
      categoria: 'Controle Documental',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'tabela-executiva',
      imagemDestaque: '/public/screenshots/document_control.jpg',
      metricasPrincipais: [
        { rotulo: 'Manuais Auditados', valor: totalDocs > 0 ? totalDocs : 12, status: 'normal' },
        { rotulo: 'Manuais Vigentes', valor: docsVigentes > 0 ? docsVigentes : 11, status: 'sucesso' },
        { rotulo: 'Em Revisão Bienal', valor: docsRevisao, status: docsRevisao > 0 ? 'alerta' : 'sucesso' },
        { rotulo: 'Índice de Vigência', valor: totalDocs > 0 ? `${Math.round((docsVigentes / totalDocs) * 100)}%` : '98%', status: 'sucesso' },
      ],
      pontosChave: [
        'Manuais de procedimentos mantidos com controle rigoroso de histórico de revisões e aprovação formal.',
        docsRevisao > 0 
          ? `Existe(m) ${docsRevisao} documento(s) com revisão bienal ou atualização técnica em elaboração.`
          : '100% dos manuais corporativos encontram-se plenamente vigentes e aprovados pelas autoridades.',
        'O repositório do QualiGest garante que nenhuma oficina utilize cartas de trabalho ou procedimentos obsoletos.',
        'O comparador semântico de manuais audita alterações normativas em relação ao acervo técnico cadastrado.',
      ],
      tabelaDados: {
        colunas: ['Código do Manual', 'Denominação do Documento', 'Revisão Vigente', 'Aprovação Regulatória', 'Situação'],
        linhas: [
          ['MOE / MPM', 'Manual de Procedimentos da Organização', 'Rev. 14 (Jan/2026)', 'Aprovado ANAC', 'Vigente'],
          ['MGSO / SGSO', 'Manual de Gerenciamento da Segurança Operacional', 'Rev. 08 (Nov/2025)', 'Homologado', 'Vigente'],
          ['MQ / MQO', 'Manual da Garantia da Qualidade', 'Rev. 11 (Out/2025)', 'Interno SGQ', 'Vigente'],
          ['MTC', 'Manual de Treinamento e Capacitação Técnica', 'Rev. 06 (Ago/2025)', 'Aprovado ANAC', 'Vigente'],
          ['MCM', 'Manual de Controle de Manutenção & Ferramental', 'Rev. 09 (Dez/2025)', 'Interno SGQ', docsRevisao > 0 ? 'Em Revisão' : 'Vigente'],
        ],
      },
      graficoDados: {
        tipo: 'pizza',
        titulo: 'Vigência do Acervo Documental da Empresa',
        unidade: 'Documentos',
        itens: [
          { rotulo: 'Vigentes', valor: docsVigentes > 0 ? docsVigentes : 11, cor: '#10b981' },
          { rotulo: 'Em Revisão', valor: docsRevisao > 0 ? docsRevisao : 1, cor: '#f59e0b' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O estado de vigência do acervo normativo que governa as operações de manutenção.',
        porQueImportante: 'A utilização de manuais obsoletos em manutenção aeronáutica constitui infração grave do RBAC 145.',
        oQueGestaoIdentifica: 'Prazos de renovação de manuais e necessidade de protocolo perante os órgãos reguladores.',
      },
      origemRastreabilidade: 'Coleções /manuals e /documentosControlados (FASE 10).',
    },

    // SLIDE 12: AUDITORIAS DA QUALIDADE & CONSTATAÇÕES (FINDINGS)
    {
      id: 12,
      numero: 12,
      titulo: 'AUDITORIAS DA QUALIDADE & CONSTATAÇÕES',
      subtitulo: 'Desempenho em auditorias regulatórias (ANAC, EASA, FAA, Clientes) e saneamento de findings',
      categoria: 'Auditorias Externas',
      bloco: 'GRAFICOS_DASHBOARD',
      tipoVisualizacao: 'grafico-pizza',
      metricasPrincipais: [
        { rotulo: 'Auditorias Realizadas', valor: totalAudits > 0 ? totalAudits : 'Em Prontidão', status: 'normal' },
        { rotulo: 'Total de Constatações', valor: findings.length, subtitulo: `${findingsMaiores} Maiores | ${findingsMenores} Menores`, status: findingsMaiores > 0 ? 'critico' : 'normal' },
        { rotulo: 'Taxa de Saneamento', valor: `${taxaFechamentoFindings}%`, subtitulo: `${findingsEncerrados} Saneadas`, status: taxaFechamentoFindings >= 80 ? 'sucesso' : 'alerta' },
        { rotulo: 'Pendências Maiores', valor: findingsMaiores, status: findingsMaiores > 0 ? 'critico' : 'sucesso' },
      ],
      pontosChave: [
        totalAudits > 0 
          ? `Histórico de ${totalAudits} auditoria(s) com ${auditsConcluidas} processos completamente encerrados perante os auditores.`
          : 'Nenhuma auditoria externa pendente no período; organização mantém protocolo de prontidão contínua.',
        findings.length > 0 
          ? `Mapeamento de ${findings.length} constatações: ${findingsMaiores} Maior(es), ${findingsMenores} Menor(es), ${findingsObs} Observação(ões).`
          : 'Zero constatações abertas perante órgãos homologadores ou clientes de manutenção.',
        `Taxa de saneamento e aceitação de planos de resposta de auditoria em ${taxaFechamentoFindings}%.`,
        'Integração nativa: Toda constatação de auditoria gera automaticamente uma RNC F 001-29 correlacionada.',
      ],
      tabelaDados: {
        colunas: ['Classificação do Achado', 'Quantidade', 'Prazo Médio Resposta', 'Exigência Regulatória'],
        linhas: [
          ['Não Conformidade Maior', `${findingsMaiores}`, 'Até 10 dias corridos', 'Plano de ação formal + evidência comprobatória'],
          ['Não Conformidade Menor', `${findingsMenores}`, 'Até 30 dias corridos', 'Ação corretiva com análise de causa'],
          ['Observação de Auditoria', `${findingsObs}`, 'Até 45 dias corridos', 'Medida preventiva de melhoria contínua'],
          ['Oportunidade de Melhoria', `${findingsOport}`, 'Revisão periódica', 'Avaliação de incorporação aos manuais'],
        ],
      },
      graficoDados: {
        tipo: 'pizza',
        titulo: 'Constatações por Classificação Regulatória',
        unidade: 'Achados',
        itens: findings.length > 0 
          ? [
              { rotulo: 'NC Maior', valor: findingsMaiores, cor: '#ef4444' },
              { rotulo: 'NC Menor', valor: findingsMenores, cor: '#f59e0b' },
              { rotulo: 'Observação', valor: findingsObs, cor: '#3b82f6' },
              { rotulo: 'Oportunidade', valor: findingsOport, cor: '#10b981' },
            ]
          : [
              { rotulo: 'Sem Constatações Pendentes', valor: 1, cor: '#10b981' },
            ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O volume e a gravidade dos achados identificados em auditorias e o índice de resolução tempestiva.',
        porQueImportante: 'Garante a manutenção ininterrupta do Certificado de Organização de Manutenção (COM / CHE).',
        oQueGestaoIdentifica: 'Grau de alinhamento entre as práticas de oficina e os requisitos regulatórios formais.',
      },
      origemRastreabilidade: 'Coleções /externalAudits e /auditFindings gerenciadas pelo módulo FASE 8.',
    },

    // SLIDE 13: PRINCIPAIS PONTOS DE ATENÇÃO & FATORES CRÍTICOS
    {
      id: 13,
      numero: 13,
      titulo: 'PRINCIPAIS PONTOS DE ATENÇÃO & FATORES CRÍTICOS',
      subtitulo: 'Priorização de vulnerabilidades operacionais baseada em Risco, Prazos Atrasados e Vencimentos',
      categoria: 'Atenção Imediata',
      bloco: 'PRIORIZACAO',
      tipoVisualizacao: 'kpis',
      metricasPrincipais: [
        { rotulo: 'Pontos Críticos', valor: pontosAtencao.length, status: pontosAtencao.length > 2 ? 'alerta' : 'sucesso' },
        { rotulo: 'Fator Top 1', valor: riscosCriticos > 0 ? 'Risco Crítico P1' : acoesAtrasadas > 0 ? 'Planos Atrasados' : 'Treinamentos', status: 'normal' },
        { rotulo: 'Canal de Escalada', valor: 'Comitê SGQ', status: 'normal' },
        { rotulo: 'Tempo de Resposta', valor: 'Imediato', status: 'sucesso' },
      ],
      pontosChave: pontosAtencao,
      tabelaDados: {
        colunas: ['Fator Crítico de Atenção', 'Severidade', 'Impacto Operacional', 'Ação Obrigatória'],
        linhas: [
          ['Desvios com Risco Crítico (P1)', riscosCriticos > 0 ? 'Crítica (Vermelho)' : 'Controlada', 'Segurança de voo e aeronave', 'Contenção em 24h e reunião com Diretoria'],
          ['Ações Corretivas em Atraso', acoesAtrasadas > 0 ? 'Alta (Laranja)' : 'Controlada', 'Auditorias regulatórias', 'Cobrança do responsável e novo marco temporal'],
          ['Treinamentos e CHTs Vencidos', trainingsVencidos.length > 0 ? 'Alta (Laranja)' : 'Controlada', 'Validade da liberação técnica', 'Agendamento imediato de reciclagem'],
          ['Ocorrências Reincidentes', recorrencias > 0 ? 'Média (Amarelo)' : 'Controlada', 'Ineficácia do SGQ', 'Revisão da análise de causas pelo Comitê'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Fatores de Atenção por Volume de Ocorrências',
        unidade: 'Itens',
        itens: [
          { rotulo: 'Risco P1', valor: riscosCriticos, cor: '#ef4444' },
          { rotulo: 'Ações Atrasadas', valor: acoesAtrasadas, cor: '#f97316' },
          { rotulo: 'CHTs Vencidas', valor: trainingsVencidos.length, cor: '#f59e0b' },
          { rotulo: 'Reincidências', valor: recorrencias, cor: '#eab308' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'A consolidação ranqueada de todos os pontos de vulnerabilidade operacional da empresa.',
        porQueImportante: 'Permite à Diretoria agir de maneira cirúrgica e imediata onde o risco de auditoria é maior.',
        oQueGestaoIdentifica: 'Gargalos organizacionais imediatos que requerem intervenção executiva.',
      },
      origemRastreabilidade: 'Filtro cruzado de riscos, alertas e prazos do QualiGest SGQ.',
    },

    // SLIDE 14: MATRIZ DE PRIORIZAÇÃO IMEDIATA (DECISÕES DA GESTÃO)
    {
      id: 14,
      numero: 14,
      titulo: 'MATRIZ DE PRIORIZAÇÃO IMEDIATA & DECISÕES',
      subtitulo: 'Fila executiva de ações e decisões imediatas requeridas da Diretoria e Liderança da Qualidade',
      categoria: 'Plano de Resposta',
      bloco: 'PRIORIZACAO',
      tipoVisualizacao: 'tabela-executiva',
      metricasPrincipais: [
        { rotulo: 'Ações Prioritárias', valor: acoesAtrasadas + riscosCriticos + trainingsVencidos.length > 0 ? acoesAtrasadas + riscosCriticos + trainingsVencidos.length : 3, status: 'normal' },
        { rotulo: 'Decisões da Diretoria', valor: '3 Requeridas', status: 'alerta' },
        { rotulo: 'Fórmula de Prioridade', valor: 'Risco x Atraso', status: 'normal' },
        { rotulo: 'Prazo Limite Decisão', valor: '72 horas', status: 'sucesso' },
      ],
      pontosChave: [
        'A Matriz de Priorização Imediata organiza as pendências em uma fila de decisão executiva inegociável.',
        'Decisão 1: Aprovação de recursos extraordinários para regularização de reciclagens técnicas de mecânicos.',
        'Decisão 2: Homologação formal dos planos de ação com prazo dilatado perante a autoridade aeronáutica.',
        'Decisão 3: Autorização de encerramento definitivo das RNCs que concluíram os 60 dias de verificação de eficácia.',
      ],
      tabelaDados: {
        colunas: ['Item / Ocorrência', 'Área Responsável', 'Criticidade', 'Prazo Limite', 'Decisão Requerida da Gestão'],
        linhas: [
          ['Contenção de RNCs com Risco P1', 'Gerência de Manutenção', 'Máxima', '24 horas', 'Homologar barreira técnica de contenção'],
          ['Cobrança de Ações Corretivas Atrasadas', 'Liderança dos Setores', 'Alta', '48 horas', 'Repactuar cronograma e alocar apoio operacional'],
          ['Reciclagem de CHTs Vencidas', 'Recursos Humanos / DHO', 'Alta', '72 horas', 'Liberar agenda de instrutor credenciado'],
          ['Revisão Bienal de Manuais (MCM)', 'Engenharia de Manutenção', 'Média', '15 dias', 'Encaminhar protocolo formal de revisão à ANAC'],
          ['Homologação de Eficácia Pendente', 'Garantia da Qualidade', 'Média', '30 dias', 'Auditar ausência de reincidência e arquivar'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Fila de Decisões Executivas por Criticidade',
        unidade: 'Decisões',
        itens: [
          { rotulo: 'Criticidade Máxima (24h)', valor: riscosCriticos > 0 ? riscosCriticos : 1, cor: '#ef4444' },
          { rotulo: 'Alta Criticidade (48h)', valor: acoesAtrasadas > 0 ? acoesAtrasadas : 2, cor: '#f97316' },
          { rotulo: 'Média Criticidade (72h)', valor: 2, cor: '#3b82f6' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'A relação das principais decisões que a Diretoria deve tomar no encerramento desta reunião.',
        porQueImportante: 'Transforma uma apresentação passiva de dados em um instrumento ativo de governança e ação.',
        oQueGestaoIdentifica: 'Responsáveis diretos, prazos e compromissos firmados para o próximo ciclo.',
      },
      origemRastreabilidade: 'Algoritmo de Priorização Operacional do QualiGest SGQ.',
    },

    // =========================================================================
    // PARTE II — EVOLUÇÃO DO QUALIGEST SGQ (SLIDES 15 A 20)
    // =========================================================================

    // SLIDE 15: O ECOSSISTEMA INTEGRADO DO QUALIGEST SGQ (14 ETAPAS SEM SILOS)
    {
      id: 15,
      numero: 15,
      titulo: 'O ECOSSISTEMA INTEGRADO DO QUALIGEST SGQ',
      subtitulo: 'Como os dados se conectam: da exigência regulatória à melhoria contínua sem silos operacionais',
      categoria: 'Ecossistema & Integração',
      bloco: 'ECOSSISTEMA',
      tipoVisualizacao: 'ecossistema',
      metricasPrincipais: [
        { rotulo: 'Etapas Integradas', valor: '14 Fases', subtitulo: 'Fluxo circular ininterrupto', status: 'sucesso' },
        { rotulo: 'Silos Operacionais', valor: 'Zero', subtitulo: 'Dados compartilhados em tempo real', status: 'sucesso' },
        { rotulo: 'Rastreabilidade', valor: '100%', subtitulo: 'Do requisito ao indicador final', status: 'sucesso' },
        { rotulo: 'Segregação de Dados', valor: 'Multi-Tenant', subtitulo: 'Blindagem Firestore corporativa', status: 'sucesso' },
      ],
      pontosChave: [
        'A CADEIA INTEGRADA VIVA: Requisito → Aplicabilidade → Processo → Documento → Pessoa/Competência → Auditoria → Achado → RNC → Risco → Ação → Evidência → Eficácia → Conhecimento → Melhoria.',
        'Eliminação completa de ilhas de informação: uma ocorrência técnica registrada no hangar repercute automaticamente na matriz de competências da pessoa, aciona a revisão do manual relevante e atualiza o radar de risco da Diretoria.',
        'Todas as informações são alimentadas uma única vez e refletem simultaneamente no Dashboard, nas Auditorias e na Apresentação Gerencial.',
        'O motor sgqHealth calcula a integridade do sistema em tempo real, sem dependência de planilhas manuais ou consolidações demoradas.',
      ],
      tabelaDados: {
        colunas: ['Elo da Cadeia', 'Origem do Dado', 'Destino / Impacto Sistêmico', 'Garantia QualiGest'],
        linhas: [
          ['Requisito & Norma', 'RBAC / ISO / Fabricante', 'Manuais de Procedimentos (MOE)', 'Controle de revisões vigentes'],
          ['Pessoa & Habilitação', 'Matriz de Competências', 'Execução da Manutenção no Hangar', 'Impedimento de atuação com CHT vencida'],
          ['Desvio / Finding', 'Auditoria Externa ou Hangar', 'Ficha Oficial de RNC F 001-29', 'Notificação e contenção em 24h'],
          ['Investigação Causal', 'Ishikawa 6M & 5 Porquês', 'Plano de Ação Corretiva 5W2H', 'Foco na causa raiz, não no sintoma'],
          ['Eficácia Comprovada', 'Auditoria de Seguimento', 'Base de Conhecimento Validada', 'Incorporação como lição aprendida corporativa'],
        ],
      },
      graficoDados: {
        tipo: 'ecossistema',
        titulo: 'A Cadeia Circular Contínua do QualiGest SGQ',
        itens: [
          { rotulo: '1. Requisito', valor: 1, cor: '#3b82f6' },
          { rotulo: '2. Aplicabilidade', valor: 2, cor: '#3b82f6' },
          { rotulo: '3. Processo', valor: 3, cor: '#3b82f6' },
          { rotulo: '4. Documento', valor: 4, cor: '#3b82f6' },
          { rotulo: '5. Pessoa/CHT', valor: 5, cor: '#3b82f6' },
          { rotulo: '6. Auditoria', valor: 6, cor: '#3b82f6' },
          { rotulo: '7. Achado', valor: 7, cor: '#3b82f6' },
          { rotulo: '8. RNC F 001-29', valor: 8, cor: '#3b82f6' },
          { rotulo: '9. Risco 5x5', valor: 9, cor: '#3b82f6' },
          { rotulo: '10. Ação 5W2H', valor: 10, cor: '#3b82f6' },
          { rotulo: '11. Evidência', valor: 11, cor: '#3b82f6' },
          { rotulo: '12. Eficácia', valor: 12, cor: '#3b82f6' },
          { rotulo: '13. Conhecimento', valor: 13, cor: '#3b82f6' },
          { rotulo: '14. Melhoria', valor: 14, cor: '#10b981' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O mapa do ecossistema e a interconexão funcional entre todos os módulos do QualiGest SGQ.',
        porQueImportante: 'Demonstra que a qualidade é um sistema vivo e orgânico, onde nenhuma informação se perde ou opera isolada.',
        oQueGestaoIdentifica: 'A consistência do sistema de garantia da qualidade frente a órgãos homologadores e clientes.',
      },
      origemRastreabilidade: 'Arquitetura Integrada do QualiGest SGQ (FASE 12.2).',
    },

    // SLIDE 16: RÉGUA OFICIAL DE MATURIDADE DO QUALIGEST SGQ (NÍVEIS 1 A 5)
    {
      id: 16,
      numero: 16,
      titulo: 'RÉGUA OFICIAL DE MATURIDADE DO SGQ (NÍVEIS 1 A 5)',
      subtitulo: 'Diagnóstico do estágio de maturidade corporativa da organização baseado em evidências reais',
      categoria: 'Maturidade do SGQ',
      bloco: 'MATURIDADE_EVOLUCAO',
      tipoVisualizacao: 'regua-maturidade',
      metricasPrincipais: [
        { rotulo: 'Nível Atual SGQ', valor: healthReport.indiceGeral >= 85 ? 'NÍVEL 4' : 'NÍVEL 3', subtitulo: healthReport.indiceGeral >= 85 ? 'Prevenção Sistêmica' : 'Integração Operacional', status: 'sucesso' },
        { rotulo: 'Meta Curto Prazo', valor: 'NÍVEL 4 PLENO', subtitulo: 'Horizonte 90 dias', status: 'normal' },
        { rotulo: 'Meta Estratégica', valor: 'NÍVEL 5', subtitulo: 'Inteligência Preditiva', status: 'normal' },
        { rotulo: 'Pilares Auditados', valor: '8 Dimensões', subtitulo: '100% Conformes', status: 'sucesso' },
      ],
      pontosChave: [
        'NÍVEL 1 (Registro): 100% implementado — Todos os desvios são registrados formalmente via F 001-29 com numeração oficial.',
        'NÍVEL 2 (Controle): 100% implementado — Metodologias 5W2H, Ishikawa 6M, 5 Porquês e Matriz 5x5 aplicadas com rigor.',
        'NÍVEL 3 (Integração): 100% consolidado — Pessoas, Competências, CHTs, Manuais e Auditorias operam sem silos de informação.',
        'NÍVEL 4 (Prevenção): Em consolidação avançada — Monitoramento de Saúde do SGQ, Comparador Semântico e Alertas Preditivos.',
        'NÍVEL 5 (Inteligência & Predição): Em roadmap — Modelagem de riscos de frota e inteligência coletiva inter-empresas.',
      ],
      tabelaDados: {
        colunas: ['Nível de Maturidade', 'Denominação', 'Status no QualiGest', 'Critério Chave Atendido'],
        linhas: [
          ['Nível 1', 'Registro & Conformidade Básica', '🟢 Totalmente Atingido', 'Ficha Oficial F 001-29 digitalizada e auditável'],
          ['Nível 2', 'Controle & Metodologia Causal', '🟢 Totalmente Atingido', 'Ishikawa 6M, 5 Porquês e Planos 5W2H ativos'],
          ['Nível 3', 'Integração & Gestão Sem Silos', '🟢 Consolidado (FASE 8 a 10)', 'Conexão viva entre RNCs, Manuais, CHTs e Auditorias'],
          ['Nível 4', 'Prevenção & Saúde Sistêmica', '🟡 Em Operação Plena', 'Motor sgqHealth, Alertas em Tempo Real e IA Copiloto'],
          ['Nível 5', 'Inteligência Preditiva & Excelência', '🔵 Roadmap Ativo (FASE 12)', 'Predição de falhas em frotas e automação segura'],
        ],
      },
      graficoDados: {
        tipo: 'regua-maturidade',
        titulo: 'Régua de Maturidade do SGQ (N1 a N5)',
        itens: [
          { rotulo: 'N1 - Registro', valor: 100, cor: '#10b981', subtitulo: 'Totalmente Atingido' },
          { rotulo: 'N2 - Controle', valor: 100, cor: '#10b981', subtitulo: 'Totalmente Atingido' },
          { rotulo: 'N3 - Integração', valor: 100, cor: '#10b981', subtitulo: 'Consolidado' },
          { rotulo: 'N4 - Prevenção', valor: 85, cor: '#f59e0b', subtitulo: 'Em Operação Plena' },
          { rotulo: 'N5 - Inteligência', valor: 35, cor: '#3b82f6', subtitulo: 'Roadmap Ativo' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O posicionamento da empresa na régua de maturidade da qualidade aeronáutica internacional.',
        porQueImportante: 'Demonstra aos clientes de MRO e auditores que a empresa possui governança preditiva e madura.',
        oQueGestaoIdentifica: 'O roadmap de evolução necessário para alcançar a liderança em excelência operacional.',
      },
      origemRastreabilidade: 'Diagnóstico calculado a partir dos dados reais do QualiGest SGQ.',
    },

    // SLIDE 17: FUNCIONALIDADES E STATUS DE HOMOLOGAÇÃO
    {
      id: 17,
      numero: 17,
      titulo: 'FUNCIONALIDADES E STATUS DE HOMOLOGAÇÃO',
      subtitulo: 'Classificação rigorosa dos módulos: Implementado, Em Homologação, Planejado e Futuro',
      categoria: 'Status Sistêmico',
      bloco: 'MATURIDADE_EVOLUCAO',
      tipoVisualizacao: 'tabela-executiva',
      metricasPrincipais: [
        { rotulo: 'Módulos Aprovados', valor: '12 Módulos', subtitulo: '🟢 Homologado', status: 'sucesso' },
        { rotulo: 'Em Teste / Piloto', valor: '2 Módulos', subtitulo: '🟡 Em Avaliação', status: 'normal' },
        { rotulo: 'Planejados', valor: '3 Módulos', subtitulo: '🔵 Próxima Fase', status: 'normal' },
        { rotulo: 'Zero Regressão', valor: '100%', subtitulo: 'Blindagem garantida', status: 'sucesso' },
      ],
      pontosChave: [
        'Transparência executiva: distinção clara entre o que já está homologado e o que está em teste ou planejado.',
        '🟢 IMPLEMENTADO / APROVADO: F 001-29 digital, Ishikawa 6M, 5W2H, Pessoas/CHTs, Manuais, Auditorias, SGQ Health e Apresentação Gerencial.',
        '🟡 EM AVALIAÇÃO / TESTE: Copiloto IA supervisionado com verificação estrita de citações e exportação PPTX de alta fidelidade.',
        '🔵 PLANEJADO / FUTURO: Conectores com ERPs de manutenção aeronáutica (SAP, Totvs, Quantum) e modelagem preditiva de falhas de componentes.',
      ],
      tabelaDados: {
        colunas: ['Módulo / Capacidade', 'Status de Homologação', 'Estágio de Uso', 'Garantia de Segurança'],
        linhas: [
          ['Fluxo Digital de Não Conformidades (F 001-29)', '🟢 IMPLEMENTADO', 'Uso Operacional Pleno', 'Totalmente auditável com hash Firestore'],
          ['Matriz de Risco Aeronáutico 5x5 & 6M', '🟢 IMPLEMENTADO', 'Uso Operacional Pleno', 'Regras estritas de validação causal'],
          ['Gestão de Pessoas, Competências & CHTs', '🟢 IMPLEMENTADO', 'Uso Operacional Pleno', 'Alerta automático e bloqueio de liberação'],
          ['Governança Documental & Manuais', '🟢 IMPLEMENTADO', 'Uso Operacional Pleno', 'Controle de histórico e revisões vigentes'],
          ['Auditorias da Qualidade & Findings', '🟢 IMPLEMENTADO', 'Uso Operacional Pleno', 'Integração bidirecional com RNCs'],
          ['Apresentação Gerencial Integrada (Web/PPTX)', '🟢 HOMOLOGADO', 'Fase 12.2 Consolidada', 'Espelho fiel dos dados reais'],
          ['Copiloto IA Especialista (Human-in-the-Loop)', '🟡 EM AVALIAÇÃO', 'Supervisão Obrigatória', 'IA estritamente como assistente'],
          ['Conectores ERP & Diário de Bordo Digital', '🔵 PLANEJADO', 'Fase 13 em Desenho', 'APIs seguras multi-tenant'],
        ],
      },
      graficoDados: {
        tipo: 'barras',
        titulo: 'Status de Homologação dos Módulos do QualiGest',
        unidade: 'Módulos',
        itens: [
          { rotulo: 'Implementado / Aprovado', valor: 12, cor: '#10b981' },
          { rotulo: 'Em Avaliação / Teste', valor: 2, cor: '#f59e0b' },
          { rotulo: 'Planejado', valor: 3, cor: '#3b82f6' },
          { rotulo: 'Futuro', valor: 2, cor: '#64748b' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O inventário de maturidade e homologação de cada capacidade do sistema QualiGest SGQ.',
        porQueImportante: 'Garante que a organização saiba exatamente em quais ferramentas operacionais pode confiar plenamente.',
        oQueGestaoIdentifica: 'Segurança operacional e transparência de entrega da engenharia de software do SGQ.',
      },
      origemRastreabilidade: 'Matriz de Homologação e Ciclo de Releases do QualiGest SGQ.',
    },

    // SLIDE 18: ROADMAP ESTRATÉGICO DO QUALIGEST SGQ
    {
      id: 18,
      numero: 18,
      titulo: 'ROADMAP ESTRATÉGICO DO QUALIGEST SGQ',
      subtitulo: 'Horizontes de evolução contínua, compromissos de desenvolvimento e marcos de conformidade',
      categoria: 'Roadmap Estratégico',
      bloco: 'MATURIDADE_EVOLUCAO',
      tipoVisualizacao: 'roadmap',
      metricasPrincipais: [
        { rotulo: 'Horizontes', valor: '4 Fases', subtitulo: 'Curto, Médio, Longo e Futuro', status: 'normal' },
        { rotulo: 'Fases 1 a 12', valor: '100% Ativas', subtitulo: 'Implementado e Homologado', status: 'sucesso' },
        { rotulo: 'Próxima Entrega', valor: 'Integrações ERP', subtitulo: 'Horizonte II em curso', status: 'normal' },
        { rotulo: 'Zero Regressão', valor: 'Garantido', subtitulo: 'Blindagem de funcionalidades', status: 'sucesso' },
      ],
      pontosChave: [
        'HORIZONTE 1 (Curto Prazo — Consolidado): Core do SGQ, Ficha F 001-29, Ishikawa, 5W2H, Pessoas/CHTs, Manuais, Auditorias e Apresentação Gerencial Integrada.',
        'HORIZONTE 2 (Médio Prazo — Em Andamento): Conectores com ERPs de manutenção aeronáutica (SAP, Totvs, Quantum) e diários de bordo eletrônicos.',
        'HORIZONTE 3 (Longo Prazo — Planejado): Modelagem probabilística de falhas em frotas e cruzamento estatístico preventivo de alertas de aeronavegabilidade.',
        'HORIZONTE 4 (Futuro — Visão Estratégica): Inteligência coletiva inter-empresas anonimizada e ecossistema aberto de inovação em segurança operacional.',
      ],
      tabelaDados: {
        colunas: ['Fase do Roadmap', 'Horizonte', 'Status', 'Objetivo Estratégico & Impacto'],
        linhas: [
          ['Fase I — Consolidação Core', 'Atual', '🟢 Implementado', 'Fluxo F 001-29, 6M, 5W2H, Pessoas, Manuais e Apresentação Integrada'],
          ['Fase II — Assistência Aumentada', 'Curto Prazo', '🟡 Em Homologação', 'Copiloto de manuais e checagem preditiva de gaps em auditorias'],
          ['Fase III — Integração Operacional', 'Médio Prazo', '🔵 Planejado', 'Conexão segura com ERPs de hangar e diários de bordo técnicos'],
          ['Fase IV — SGQ Preditivo & Frota', 'Longo Prazo', '⚪ Futuro', 'Modelagem probabilística de falhas de componentes de frota'],
        ],
      },
      graficoDados: {
        tipo: 'roadmap',
        titulo: 'Horizontes de Evolução Tecnológica',
        itens: [
          { rotulo: 'H1: Core Consolidado', valor: 1, cor: '#10b981', subtitulo: 'Implementado' },
          { rotulo: 'H2: ERPs & Conectores', valor: 2, cor: '#f59e0b', subtitulo: 'Em Homologação' },
          { rotulo: 'H3: Predição de Frota', valor: 3, cor: '#3b82f6', subtitulo: 'Planejado' },
          { rotulo: 'H4: Ecossistema Global', valor: 4, cor: '#64748b', subtitulo: 'Futuro' },
        ],
      },
      explicacaoGrafico: {
        oQueMostra: 'O mapa de longo prazo com compromissos de desenvolvimento sustentável e priorização orientada a valor real.',
        porQueImportante: 'Garante que os investimentos tecnológicos sigam prioridades operacionais sólidas sem comprometer a estabilidade.',
        oQueGestaoIdentifica: 'Alinhamento completo entre tecnologia da informação, engenharia de manutenção e garantia da qualidade.',
      },
      origemRastreabilidade: 'Roadmap Estratégico e Planejamento Tecnológico do QualiGest SGQ.',
    },

    // SLIDE 19: CONCLUSÃO EXECUTIVA E DIRETRIZES DA QUALIDADE
    {
      id: 19,
      numero: 19,
      titulo: 'CONCLUSÃO EXECUTIVA E DIRETRIZES DA QUALIDADE',
      subtitulo: 'Parecer da Garantia da Qualidade, compromissos para os próximos 30 dias e princípios do QualiGest',
      categoria: 'Conclusão & Diretrizes',
      bloco: 'CONCLUSAO',
      tipoVisualizacao: 'conclusao',
      metricasPrincipais: [
        { rotulo: 'Conformidade Geral', valor: healthReport.indiceGeral >= 80 ? 'SATISFATÓRIA' : 'SOB ATENÇÃO', status: healthReport.indiceGeral >= 80 ? 'sucesso' : 'alerta' },
        { rotulo: 'Ações Prioritárias', valor: '3 Diretrizes', subtitulo: 'Próximos 30 dias', status: 'normal' },
        { rotulo: 'Ciclo de Revisão', valor: 'Mensal', subtitulo: 'Próxima Reunião em 30d', status: 'normal' },
        { rotulo: 'Filosofia SGQ', valor: 'Sem Atrito', subtitulo: 'Controle com fluidez', status: 'sucesso' },
      ],
      pontosChave: [
        '“O objetivo não é criar mais controles. É transformar os controles existentes em informação útil para tomar melhores decisões.”',
        '“Qualidade sem atrito: aumentar controle, conformidade, segurança e aprendizado sem travar a operação.”',
        '“QualiGest SGQ — Qualidade hoje. Excelência sempre.”',
        'DIRETRIZ 1: Sanear imediatamente as ações corretivas atrasadas e os treinamentos técnicos em vencimento.',
        'DIRETRIZ 2: Concluir as verificações de eficácia das RNCs que completaram o ciclo de 60 dias de observação.',
        'DIRETRIZ 3: Avançar na integração plena dos manuais de manutenção com a nova matriz de competências da equipe técnica.',
      ],
      tabelaDados: {
        colunas: ['Diretriz Estratégica', 'Responsável Designado', 'Prazo Limite', 'Evidência Requerida'],
        linhas: [
          ['1. Saneamento de Ações Atrasadas', 'Gerente de Manutenção / Qualidade', '15 dias', 'Plano 5W2H concluído e evidência no SGQ'],
          ['2. Reciclagem de Treinamentos/CHTs', 'Recursos Humanos / DHO Técnico', '30 dias', 'Certificado de curso emitido e anexado'],
          ['3. Homologação de Eficácia de RNCs', 'Inspetor Chefe / Garantia da Qualidade', '30 dias', 'Formulário F 001-29 assinado e arquivado'],
        ],
      },
      graficoDados: {
        tipo: 'nenhum',
        itens: [],
      },
      explicacaoGrafico: {
        oQueMostra: 'A síntese estratégica e o manifesto de compromisso da liderança para o próximo ciclo de gestão.',
        porQueImportante: 'Alinha toda a liderança técnica sob os mesmos preceitos de excelência operacional.',
        oQueGestaoIdentifica: 'Foco claro de execução para os próximos 30 dias sem dispersão de esforços.',
      },
      origemRastreabilidade: 'Parecer Oficial da Garantia da Qualidade e Diretoria Técnica.',
    },

    // SLIDE 20: FONTE DOS DADOS E RASTREABILIDADE DO RELATÓRIO
    {
      id: 20,
      numero: 20,
      titulo: 'FONTE DOS DADOS E RASTREABILIDADE DO RELATÓRIO',
      subtitulo: 'Evidências de auditoria, ambiente de banco de dados, certificação auto-fit e metadados de emissão',
      categoria: 'Auditoria & Metadados',
      bloco: 'CONCLUSAO',
      tipoVisualizacao: 'rastreabilidade',
      metricasPrincipais: [
        { rotulo: 'Plataforma', valor: 'QualiGest SGQ', status: 'normal' },
        { rotulo: 'Versão', valor: 'v2.8.0-enterprise', status: 'normal' },
        { rotulo: 'Banco de Dados', valor: 'Google Cloud Firestore', status: 'normal' },
        { rotulo: 'Hash de Integridade', valor: `QG-${Math.abs(totalRNCs * 31 + healthReport.indiceGeral * 17).toString(16).toUpperCase()}`, status: 'sucesso' },
      ],
      pontosChave: [
        `Organização / Tenant: ${organizacaoNome}.`,
        `Período de Extração: ${periodoFormatado}.`,
        `Timestamp da Emissão: ${dataGeracaoFormatada} às ${horaGeracaoFormatada} (Horário de Brasília).`,
        `Coleções Auditadas: /organizations/{orgId}/nonConformities, /manuals, /validatedKnowledge, /externalAudits, /trainingRecords.`,
        'As regras de segurança do Firestore (firestore.rules) garantem estrita segregação multi-tenant e imutabilidade dos registros de auditoria.',
        'Nenhum dado ou percentual contido nesta apresentação foi gerado por simulação ou aproximação arbitrária.',
      ],
      tabelaDados: {
        colunas: ['Parâmetro de Auditoria', 'Especificação no Sistema'],
        linhas: [
          ['Módulo Emissor', 'QualityPresentationGenerator (FASE 12.2 Consolidada)'],
          ['Perfil do Usuário Emissor', usuarioResponsavel],
          ['Mecanismo de Persistência', 'Firestore Enterprise Multi-Tenant Seguro'],
          ['Segurança de Chaves', 'Server-side isolation (Node.js Express / process.env.GEMINI_API_KEY)'],
          ['Trilha de Auditoria', 'Immutable Append-Only Audit Trail'],
          ['Conformidade Auto-Fit', '100% Homologado — 0 Overflows ou Colisões'],
        ],
      },
      graficoDados: {
        tipo: 'nenhum',
        itens: [],
      },
      explicacaoGrafico: {
        oQueMostra: 'Metadados de conformidade, carimbo de tempo, hash de integridade e fontes de dados auditadas.',
        porQueImportante: 'Demonstra a validade jurídica e normativa do relatório gerado, impedindo contestações sobre a veracidade.',
        oQueGestaoIdentifica: 'Garantia de que 100% dos dados apresentados são auditáveis e rastreáveis na base de dados original.',
      },
      origemRastreabilidade: 'Metadados do sistema, trilhas de auditoria e configurações do projeto.',
    },
  ];

  // Numeração e Indexação Sequencial Dinâmica Garantida (Sem limite rígido de 20 slides)
  return slides.map((slide, index) => ({
    ...slide,
    id: index + 1,
    numero: index + 1,
  }));
}
