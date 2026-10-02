import { NCRecord, ManualRecord, ConhecimentoValidadoItem, ComparacaoRNCRecord, RelatorioSaudeSGQ, ItemSaudeSGQ, CategoriaSaudeSGQ, SeveridadeSaudeSGQ } from '../types';

/**
 * Motor de Avaliação da Saúde e Integridade do SGQ (FASE 5)
 * Identifica proativamente falhas, pendências, desvios regulatórios e calcula o Índice de Integridade.
 */
export function avaliarSaudeSGQ(
  records: NCRecord[] = [],
  manuals: ManualRecord[] = [],
  knowledge: ConhecimentoValidadoItem[] = [],
  comparacoes: ComparacaoRNCRecord[] = []
): RelatorioSaudeSGQ {
  const itens: ItemSaudeSGQ[] = [];
  const hoje = new Date();

  // ----------------------------------------------------
  // 1. AVALIAÇÃO DO MÓDULO DE RNCS (Peso 35%)
  // ----------------------------------------------------
  let rncDeducoes = 0;
  let totalNCsAbertas = 0;

  records.forEach((nc) => {
    const isEncerrada =
      Boolean(nc.dataEncerramento) ||
      nc.statusGeral === 'Encerrada' ||
      nc.verificacaoEficacia?.encerrado === 'SIM';

    if (!isEncerrada) totalNCsAbertas++;

    const isTratamentoConcluido =
      isEncerrada ||
      nc.statusGeral === 'Aguardando Eficácia' ||
      nc.acaoCorretiva?.status === 'Concluída' ||
      Boolean(nc.dataConclusaoTratamento);

    // A1. RNC Vencida na Tratativa
    if (nc.prazoResposta && !isTratamentoConcluido) {
      const prazo = new Date(nc.prazoResposta);
      const diffDias = Math.floor((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias > 0) {
        rncDeducoes += Math.min(15, 5 + diffDias);
        itens.push({
          id: `rnc-vencida-${nc.id}`,
          categoria: 'RNC',
          severidade: diffDias > 15 ? 'CRITICO' : 'ALTO',
          titulo: `RNC ${nc.numeroNC} Vencida no Tratamento há ${diffDias} dias`,
          descricao: `O prazo limite de tratamento expirou em ${new Date(nc.prazoResposta).toLocaleDateString('pt-BR')} e a tratativa ainda está ${nc.statusGeral}.`,
          targetId: nc.id,
          targetNumeroNC: nc.numeroNC,
          targetType: 'RNC',
          acaoSugerida: 'Cobrar responsável imediato e registrar prorrogação justificada ou ação corretiva.',
        });
      } else if (diffDias >= -7) {
        itens.push({
          id: `rnc-vence-breve-${nc.id}`,
          categoria: 'RNC',
          severidade: 'MEDIO',
          titulo: `RNC ${nc.numeroNC} Vence Tratamento em ${Math.abs(diffDias)} dias`,
          descricao: `Prazo limite de tratamento previsto para ${new Date(nc.prazoResposta).toLocaleDateString('pt-BR')}.`,
          targetId: nc.id,
          targetNumeroNC: nc.numeroNC,
          targetType: 'RNC',
          acaoSugerida: 'Acompanhar conclusão da Seção 2 e 3 com o setor executor.',
        });
      }
    }

    // A2. Auditoria de Eficácia Vencida (quando a tratativa já foi concluída e está aguardando auditoria)
    const isEmFaseEficacia =
      !isEncerrada &&
      (nc.statusGeral === 'Aguardando Eficácia' ||
        (nc.acaoCorretiva?.status === 'Concluída' && !nc.verificacaoEficacia?.dataVerificacao));

    if (isEmFaseEficacia && !nc.verificacaoEficacia?.dataVerificacao && nc.verificacaoEficacia?.resultado !== 'EFICAZ') {
      const dataPrazoEficacia = nc.prazoEficacia || nc.verificacaoEficacia?.prazoEficacia || nc.verificacaoEficacia?.dataPrevista;
      if (dataPrazoEficacia) {
        const prazoEf = new Date(dataPrazoEficacia);
        const diffDiasEf = Math.floor((hoje.getTime() - prazoEf.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDiasEf > 0) {
          rncDeducoes += Math.min(10, 3 + diffDiasEf);
          itens.push({
            id: `rnc-eficacia-vencida-${nc.id}`,
            categoria: 'RNC',
            severidade: diffDiasEf > 30 ? 'CRITICO' : 'ALTO',
            titulo: `RNC ${nc.numeroNC} com Auditoria de Eficácia Vencida (${diffDiasEf}d)`,
            descricao: `O plano de ação foi concluído, mas o prazo para auditoria de eficácia expirou em ${new Date(dataPrazoEficacia).toLocaleDateString('pt-BR')}.`,
            targetId: nc.id,
            targetNumeroNC: nc.numeroNC,
            targetType: 'RNC',
            acaoSugerida: 'Designar auditor de qualidade para verificar a eficácia e formalizar o encerramento da NC.',
          });
        }
      }
    }

    // B. RNC sem análise de causa raiz após 7 dias de aberta
    if (!isEncerrada) {
      const temCausa = Boolean(
        nc.analiseCausaRaiz?.detalhes?.trim() ||
        (nc.analiseCausaRaiz?.cincoPorques && nc.analiseCausaRaiz.cincoPorques.filter(Boolean).length >= 3)
      );

      if (!temCausa && nc.criadoEm) {
        const dataCriacao = new Date(nc.criadoEm);
        const diasCriado = Math.floor((hoje.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24));
        if (diasCriado > 5) {
          rncDeducoes += 8;
          itens.push({
            id: `rnc-sem-causa-${nc.id}`,
            categoria: 'RNC',
            severidade: 'ALTO',
            titulo: `RNC ${nc.numeroNC} Sem Investigação de Causa Raiz`,
            descricao: `RNC aberta há ${diasCriado} dias sem os 5 Porquês ou Ishikawa devidamente preenchidos.`,
            targetId: nc.id,
            targetNumeroNC: nc.numeroNC,
            targetType: 'RNC',
            acaoSugerida: 'Executar a análise de 5 Porquês e Ishikawa no bloco 3 do formulário F 001-29.',
          });
        }
      }
    }

    // C. RNC com Causa mas sem Plano de Ação 5W2H
    if (!isEncerrada && nc.analiseCausaRaiz?.detalhes?.trim() && !nc.acaoCorretiva?.descricao?.trim()) {
      rncDeducoes += 6;
      itens.push({
        id: `rnc-sem-acao-${nc.id}`,
        categoria: 'RNC',
        severidade: 'ALTO',
        titulo: `RNC ${nc.numeroNC} Sem Plano de Ação 5W2H`,
        descricao: 'A causa raiz foi investigada, porém nenhuma ação corretiva correspondente foi cadastrada.',
        targetId: nc.id,
        targetNumeroNC: nc.numeroNC,
        targetType: 'RNC',
        acaoSugerida: 'Preencher o plano 5W2H no bloco 4 da RNC com responsável e data limite.',
      });
    }

    // D. Verificação de Eficácia pendente após conclusão da Ação
    if (nc.acaoCorretiva?.status === 'Concluída' && !isEncerrada && nc.acaoCorretiva.dataConclusao) {
      const dataConc = new Date(nc.acaoCorretiva.dataConclusao);
      const diasPosConc = Math.floor((hoje.getTime() - dataConc.getTime()) / (1000 * 60 * 60 * 24));
      if (diasPosConc > 60 && nc.verificacaoEficacia?.encerrado === 'Pendente') {
        rncDeducoes += 10;
        itens.push({
          id: `rnc-eficacia-atrasada-${nc.id}`,
          categoria: 'RNC',
          severidade: 'CRITICO',
          titulo: `RNC ${nc.numeroNC}: Eficácia Pendente (>60 dias)`,
          descricao: `Ação corretiva concluída há ${diasPosConc} dias sem a auditoria de verificação de eficácia de 60 dias.`,
          targetId: nc.id,
          targetNumeroNC: nc.numeroNC,
          targetType: 'RNC',
          acaoSugerida: 'Auditor Líder deve avaliar se houve reincidência e preencher o bloco 6 para encerramento formal.',
        });
      }
    }
  });

  const scoreRNC = Math.max(0, Math.min(100, 100 - rncDeducoes));

  // ----------------------------------------------------
  // 2. AVALIAÇÃO DA BASE DE CONHECIMENTO (Peso 20%)
  // ----------------------------------------------------
  let conhecimentoDeducoes = 0;

  // Padrões emergentes em análise sem homologação
  const pendentesValidacao = knowledge.filter((k) => k.status === 'PROPOSTO' || k.nivelMaturidade === 2);
  if (pendentesValidacao.length > 0) {
    conhecimentoDeducoes += pendentesValidacao.length * 4;
    itens.push({
      id: 'knowledge-pendentes',
      categoria: 'CONHECIMENTO',
      severidade: 'MEDIO',
      titulo: `${pendentesValidacao.length} Padrão(ões) Emergente(s) Aguardando Homologação`,
      descricao: 'Padrões recorrentes detectados que ainda não foram promovidos para Nível 3 (Validado pelo SGQ).',
      targetType: 'KNOWLEDGE',
      acaoSugerida: 'Gestor SGQ deve revisar na Base de Conhecimento e homologar ou refinar.',
    });
  }

  // Padrões Nível 5 sem evidências de 2+ RNCs
  knowledge.forEach((k) => {
    if (k.nivelMaturidade === 5 && (!k.rncsOrigemNumeros || k.rncsOrigemNumeros.length < 2)) {
      conhecimentoDeducoes += 8;
      itens.push({
        id: `knowledge-evidencia-insuficiente-${k.id}`,
        categoria: 'CONHECIMENTO',
        severidade: 'ALTO',
        titulo: `Padrão Corporativo '${k.tituloPadrao}' com Evidência Insuficiente`,
        descricao: 'Padrão elevado a Nível 5 sem o registro obrigatório de ao menos 2 RNCs de origem comprovadas.',
        targetId: k.id,
        targetType: 'KNOWLEDGE',
        acaoSugerida: 'Vincular as RNCs comprobatórias ou rebaixar maturidade para Nível 3.',
      });
    }
  });

  const scoreConhecimento = Math.max(0, Math.min(100, 100 - conhecimentoDeducoes));

  // ----------------------------------------------------
  // 3. AVALIAÇÃO DO REPOSITÓRIO DOCUMENTAL (Peso 15%)
  // ----------------------------------------------------
  let documentacaoDeducoes = 0;

  manuals.forEach((m) => {
    if (m.status === 'Obsoleto') {
      itens.push({
        id: `manual-obsoleto-${m.id}`,
        categoria: 'DOCUMENTACAO',
        severidade: 'BAIXO',
        titulo: `Manual Obsoleto no Repositório: ${m.codigo} (${m.revisao})`,
        descricao: 'Documento mantido como histórico. Certifique-se de que a nova revisão vigente está cadastrada.',
        targetId: m.id,
        targetType: 'MANUAL',
        acaoSugerida: 'Verificar se a revisão vigente subsequente está ativa no repositório.',
      });
    } else if (m.status === 'Em Revisão') {
      documentacaoDeducoes += 5;
      itens.push({
        id: `manual-em-revisao-${m.id}`,
        categoria: 'DOCUMENTACAO',
        severidade: 'MEDIO',
        titulo: `Manual em Revisão: ${m.codigo}`,
        descricao: 'Documento em processo de alteração e ainda não publicado como vigente.',
        targetId: m.id,
        targetType: 'MANUAL',
        acaoSugerida: 'Acompanhar aprovação final da emenda e publicação como Vigente.',
      });
    }

    if (!m.capitulos || m.capitulos.length === 0) {
      documentacaoDeducoes += 4;
      itens.push({
        id: `manual-sem-capitulos-${m.id}`,
        categoria: 'DOCUMENTACAO',
        severidade: 'MEDIO',
        titulo: `Manual ${m.codigo} sem Capítulos Estruturados`,
        descricao: 'O manual não possui seções cadastradas, o que limita a auditoria de pertinência da IA.',
        targetId: m.id,
        targetType: 'MANUAL',
        acaoSugerida: 'Cadastrar os principais capítulos e requisitos do manual.',
      });
    }
  });

  const scoreDocumentacao = Math.max(0, Math.min(100, 100 - documentacaoDeducoes));

  // ----------------------------------------------------
  // 4. AVALIAÇÃO DA GOVERNANÇA E FILA DE VALIDAÇÃO (Peso 15%)
  // ----------------------------------------------------
  let governancaDeducoes = 0;

  const comparacoesPendentes = comparacoes.filter((c) => c.statusGeral === 'PENDENTE_VALIDACAO');
  if (comparacoesPendentes.length > 0) {
    governancaDeducoes += Math.min(25, comparacoesPendentes.length * 5);
    itens.push({
      id: 'governanca-fila-pendente',
      categoria: 'GOVERNANCA',
      severidade: comparacoesPendentes.length > 3 ? 'ALTO' : 'MEDIO',
      titulo: `${comparacoesPendentes.length} Comparação(ões) na Fila de Validação`,
      descricao: 'Documentos respondidos importados aguardando homologação das divergências pelo Auditor Líder.',
      targetType: 'AUDIT',
      acaoSugerida: 'Acessar a Fila de Validação e homologar/mesclar as respostas factuais dos executores.',
    });
  }

  const scoreGovernanca = Math.max(0, Math.min(100, 100 - governancaDeducoes));

  // ----------------------------------------------------
  // 5. AVALIAÇÃO DE SEGURANÇA E MULTI-TENANT (Peso 15%)
  // ----------------------------------------------------
  let segurancaDeducoes = 0;

  // Verificação de consistência de tenant
  const ncsSemOrg = records.filter((r) => !(r as any).organizationId && !(r as any).id);
  if (ncsSemOrg.length > 0) {
    segurancaDeducoes += 30;
    itens.push({
      id: 'seguranca-sem-tenant',
      categoria: 'SEGURANCA',
      severidade: 'CRITICO',
      titulo: `${ncsSemOrg.length} Registros sem Vínculo de Tenant`,
      descricao: 'Registros legados sem organizationId explícito detectados.',
      targetType: 'AUDIT',
      acaoSugerida: 'Executar rotina de saneamento multi-tenant no Firestore.',
    });
  }

  const scoreSeguranca = Math.max(0, Math.min(100, 100 - segurancaDeducoes));

  // ----------------------------------------------------
  // CÁLCULO GERAL PONDERADO DO ÍNDICE DE INTEGRIDADE
  // ----------------------------------------------------
  const scoreIntegridade = Math.round(
    scoreRNC * 0.35 +
    scoreConhecimento * 0.20 +
    scoreDocumentacao * 0.15 +
    scoreGovernanca * 0.15 +
    scoreSeguranca * 0.15
  );

  let statusIntegridade: 'BOM' | 'ATENCAO' | 'CRITICO' = 'BOM';
  if (scoreIntegridade < 75 || itens.some((i) => i.severidade === 'CRITICO')) {
    statusIntegridade = scoreIntegridade < 60 ? 'CRITICO' : 'ATENCAO';
  }

  const totalItensCriticos = itens.filter((i) => i.severidade === 'CRITICO').length;
  const totalItensAlerta = itens.filter((i) => i.severidade === 'ALTO' || i.severidade === 'MEDIO').length;
  const totalItensNormais = itens.filter((i) => i.severidade === 'BAIXO').length;

  return {
    scoreIntegridade,
    statusIntegridade,
    breakdown: {
      rnc: scoreRNC,
      conhecimento: scoreConhecimento,
      documentacao: scoreDocumentacao,
      governanca: scoreGovernanca,
      seguranca: scoreSeguranca,
    },
    totalItensCriticos,
    totalItensAlerta,
    totalItensNormais,
    itens,
    geradoEm: new Date().toISOString(),
  };
}
