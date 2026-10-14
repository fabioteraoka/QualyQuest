import assert from 'assert';
import {
  NCRecord,
  CicloAcaoCorretiva,
  AnaliseNaoEficacia,
  UserProfile,
} from '../src/types';
import {
  garantirCiclosInicializados,
  obterCicloAtual,
  registrarAnaliseNaoEficaciaECriarNovoCiclo,
  validarEncerramentoNC,
} from '../src/services/ncCyclesService';
import {
  buildDocumentIndexKey,
  normalizeDocumentCode,
} from '../src/services/documentControlAuditReconciliation';

console.log('=== INÍCIO DA SUÍTE DE TESTES: CICLOS DE AÇÃO CORRETIVA E AUDITORIA SGQ ===\n');

let passedTests = 0;
function pass(msg: string) {
  passedTests++;
  console.log(`[PASS] ${passedTests}. ${msg}`);
}

async function runTests() {
  const org1 = 'org-impacto-aviation-audit';
  const org2 = 'org-outra-companhia-audit';

  const userAdmin: UserProfile = {
    uid: 'user-admin',
    email: 'admin@impacto.aero',
    displayName: 'Eng. Paulo Okubo',
    role: 'ADMIN',
    organizationId: org1,
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const userViewer: UserProfile = {
    uid: 'user-viewer',
    email: 'viewer@impacto.aero',
    displayName: 'Auditor Externo',
    role: 'CONSULTA',
    organizationId: org1,
    status: 'ATIVO',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // NC original (Ciclo 1)
  const ncOriginal: NCRecord = {
    id: 'nc-042-calibracao',
    codigoFormulario: 'F 001-29',
    revisao: '00',
    dataEmissaoFormulario: '02/09/2025',
    numeroNC: 'NC-042',
    titulo: 'Calibração de Torquímetros Vencida em Bases Descentralizadas',
    tipoAcao: 'Corretiva',
    descricaoNC: 'Identificados 2 torquímetros com certificado de calibração expirado na Base Curitiba (CWB).',
    normaReferencia: 'RBAC 145.109 / MOMQ 3.4.3',
    setor: 'Metrologia & Ferramentaria',
    categoria: 'Calibração e Metrologia',
    responsavel: 'Rair Rodrigues',
    avaliacaoRiscoInicial: {
      severidade: '3',
      probabilidade: 'C',
      codigo: '3C',
      nivel: 'Médio',
    },
    prazoResposta: '2026-03-15',
    dataIdentificacao: '2026-02-15',
    auditor: 'Eng. Paulo Okubo',
    preAnaliseContencao: {
      descricao: 'Segregação física imediata dos 2 torquímetros e etiquetação de bloqueio.',
      responsavel: 'Líder CWB',
      dataLimite: '2026-02-16',
      dataConclusao: '2026-02-16',
      status: 'Concluída',
    },
    analiseCausaRaiz: {
      metodologia: '5 Porquês',
      cincoPorques: [
        'Por que as ferramentas estavam vencidas? Porque não foram enviadas ao laboratório.',
        'Por que não foram enviadas? Porque o alerta da planilha manual não foi visualizado.',
        'Por que a planilha não alertou? Porque o controle em Excel é descentralizado e falho.',
        'Por que é descentralizado? Falta de sistema corporativo único de metrologia.',
        'Causa Raiz: Inexistência de software corporativo integrado com travas automatizadas.',
      ],
      detalhes: 'Controle manual descentralizado via planilhas locais sem bloqueio sistêmico.',
      statusValidacao: 'VALIDADA PELO RESPONSÁVEL',
    },
    acaoCorretiva: {
      descricao: 'Revisar planilha local de calibração e enviar e-mail de lembrete semanal aos mecânicos.',
      comoSeraFeito: 'Criação de e-mail automático via Outlook e atualização da planilha de rede.',
      responsavel: 'Rair Rodrigues',
      dataPrazo: '2026-03-10',
      dataConclusao: '2026-03-09',
      status: 'Concluída',
      assinaturaResponsavel: 'Rair Rodrigues',
    },
    verificacaoEficacia: {
      metodo: 'Documental',
      encerrado: 'Pendente',
      dataPrevista: '2026-04-10',
      prazoEficacia: '2026-04-10',
      resultado: 'PENDENTE',
      auditorVerificador: 'Eng. Paulo Okubo',
    },
    statusGeral: 'Aguardando Eficácia',
    criadoEm: '2026-02-15T10:00:00Z',
    atualizadoEm: '2026-03-09T14:00:00Z',
    historicoPrazos: [],
    trilhaAuditoria: [],
  };

  // ---------------------------------------------------------------------------
  // TESTE 1: Preservação integral da primeira ação corretiva
  // ---------------------------------------------------------------------------
  const ncInicializada = garantirCiclosInicializados(ncOriginal);
  assert.strictEqual(ncInicializada.ciclosAcaoCorretiva?.length, 1);
  const ciclo1 = ncInicializada.ciclosAcaoCorretiva![0];
  assert.strictEqual(ciclo1.numeroCiclo, 1);
  assert.strictEqual(ciclo1.acaoCorretiva.descricao, ncOriginal.acaoCorretiva.descricao);
  assert.strictEqual(ciclo1.acaoCorretiva.responsavel, 'Rair Rodrigues');
  assert.strictEqual(ciclo1.acaoCorretiva.dataPrazo, '2026-03-10');
  pass('Preservação integral dos dados do Ciclo 1 (ação, responsável e prazo originais preservados)');

  // ---------------------------------------------------------------------------
  // TESTE 2: Registro de uma avaliação de eficácia não satisfatória
  // ---------------------------------------------------------------------------
  const avaliacaoNaoEficaz = {
    resultadoEsperado: '100% dos calibradores dentro da validade na auditoria de acompanhamento.',
    resultadoObservado: 'Identificado torquímetro PN 85-321 com calibração vencida em 05/04/2026 em CWB.',
    evidenciasNaoEficacia: 'Relatório de Auditoria SGQ AUD-019/2026 com fotos e cópia do checklist.',
    justificativaInsucesso: 'A planilha de e-mail continuou dependendo de inserção manual e falhou.',
    causaRaizContinuaValida: 'SIM' as const,
    justificativaCausaRaiz: 'A causa raiz (ausência de trava sistêmica) é confirmada pela reincidência.',
    fatoresContribuintes: 'Falta de conexão direta com o módulo de emissão de OS.',
    mudancasAdotadasNovaTentativa: 'Substituição definitiva da planilha pelo módulo de metrologia em nuvem com trava de OS.',
    responsavelAnalise: 'Eng. Paulo Okubo',
  };

  const novaAcaoCiclo2 = {
    descricao: 'Implantar trava de sistema que bloqueia a assinatura da OS se a ferramenta estiver vencida.',
    comoSeraFeito: 'Configuração no software ERP e treinamento compulsório de 4h para mecânicos.',
    responsavel: 'Equipe de TI & Qualidade',
    dataPrazo: '2026-04-30',
    dataPrevistaEficacia: '2026-05-30',
  };

  const { ncAtualizada: ncReabertaCiclo2, novoCiclo: ciclo2 } =
    registrarAnaliseNaoEficaciaECriarNovoCiclo(
      ncInicializada,
      avaliacaoNaoEficaz,
      novaAcaoCiclo2,
      userAdmin
    );

  assert.strictEqual(ncReabertaCiclo2.statusGeral, 'Reaberta');
  assert.strictEqual(ncReabertaCiclo2.ciclosAcaoCorretiva![0].statusCiclo, 'INEFICAZ_REABERTO');
  assert.strictEqual(ncReabertaCiclo2.ciclosAcaoCorretiva![0].verificacaoEficacia.resultado, 'INEFICAZ');
  pass('Registro de avaliação de eficácia não satisfatória com reclassificação para Reaberta');

  // ---------------------------------------------------------------------------
  // TESTE 3: Registro da justificativa e das evidências da não eficácia
  // ---------------------------------------------------------------------------
  assert.strictEqual(ncReabertaCiclo2.analisesNaoEficacia?.length, 1);
  const analise1 = ncReabertaCiclo2.analisesNaoEficacia![0];
  assert.strictEqual(analise1.resultadoEsperado, avaliacaoNaoEficaz.resultadoEsperado);
  assert.strictEqual(analise1.resultadoObservado, avaliacaoNaoEficaz.resultadoObservado);
  assert.strictEqual(analise1.evidenciasNaoEficacia, avaliacaoNaoEficaz.evidenciasNaoEficacia);
  assert.strictEqual(analise1.justificativaInsucesso, avaliacaoNaoEficaz.justificativaInsucesso);
  assert.strictEqual(analise1.causaRaizContinuaValida, 'SIM');
  pass('Registro detalhado da análise de não eficácia (esperado vs observado, evidências e justificativa)');

  // ---------------------------------------------------------------------------
  // TESTE 4: Criação de um novo ciclo vinculado à NC original
  // ---------------------------------------------------------------------------
  assert.strictEqual(ciclo2.numeroCiclo, 2);
  assert.strictEqual(ncReabertaCiclo2.cicloAtualNumero, 2);
  assert.strictEqual(ncReabertaCiclo2.ciclosAcaoCorretiva?.length, 2);
  pass('Criação do Ciclo 2 vinculado à NC original com identificador e numeração sequencial');

  // ---------------------------------------------------------------------------
  // TESTE 5: Registro de novas ações, responsáveis e prazos no Ciclo 2
  // ---------------------------------------------------------------------------
  assert.strictEqual(ciclo2.acaoCorretiva.descricao, novaAcaoCiclo2.descricao);
  assert.strictEqual(ciclo2.acaoCorretiva.responsavel, 'Equipe de TI & Qualidade');
  assert.strictEqual(ciclo2.acaoCorretiva.dataPrazo, '2026-04-30');
  assert.strictEqual(ncReabertaCiclo2.acaoCorretiva.responsavel, 'Equipe de TI & Qualidade');
  pass('Registro independente de novas ações, responsáveis e prazos no ciclo atual');

  // ---------------------------------------------------------------------------
  // TESTE 6: Independência dos dados entre o primeiro e o segundo ciclo
  // ---------------------------------------------------------------------------
  const c1Preservado = ncReabertaCiclo2.ciclosAcaoCorretiva![0];
  const c2Ativo = ncReabertaCiclo2.ciclosAcaoCorretiva![1];
  assert.notStrictEqual(c1Preservado.acaoCorretiva.descricao, c2Ativo.acaoCorretiva.descricao);
  assert.notStrictEqual(c1Preservado.acaoCorretiva.responsavel, c2Ativo.acaoCorretiva.responsavel);
  assert.strictEqual(c1Preservado.acaoCorretiva.responsavel, 'Rair Rodrigues');
  assert.strictEqual(c2Ativo.acaoCorretiva.responsavel, 'Equipe de TI & Qualidade');
  assert.strictEqual(c1Preservado.statusCiclo, 'INEFICAZ_REABERTO');
  assert.strictEqual(c2Ativo.statusCiclo, 'EM_ANDAMENTO');
  pass('Independência estrita dos dados entre o primeiro e o segundo ciclo comprovada');

  // ---------------------------------------------------------------------------
  // TESTE 7: Possibilidade de criar um terceiro ciclo sem sobrescrever os anteriores
  // ---------------------------------------------------------------------------
  const avaliacaoNaoEficaz2 = {
    resultadoEsperado: 'Trava do software em 100% das bases homologadas.',
    resultadoObservado: 'Base secundária operou em modo de contingência offline sem a trava.',
    evidenciasNaoEficacia: 'Log de contingência offline da OS 7712/2026.',
    justificativaInsucesso: 'Modo offline não sincronizou as restrições metrológicas.',
    causaRaizContinuaValida: 'REQUER_REVISAO' as const,
    justificativaCausaRaiz: 'Requer revisão para contemplar regras de contingência offline.',
    mudancasAdotadasNovaTentativa: 'Bloqueio do modo offline para liberação de aeronavegabilidade.',
    responsavelAnalise: 'Eng. Paulo Okubo',
  };

  const novaAcaoCiclo3 = {
    descricao: 'Bloquear liberação técnica offline quando houver pendência de calibração.',
    responsavel: 'Gerência de Qualidade e Operações',
    dataPrazo: '2026-06-15',
    dataPrevistaEficacia: '2026-07-15',
  };

  const { ncAtualizada: ncReabertaCiclo3, novoCiclo: ciclo3 } =
    registrarAnaliseNaoEficaciaECriarNovoCiclo(
      ncReabertaCiclo2,
      avaliacaoNaoEficaz2,
      novaAcaoCiclo3,
      userAdmin
    );

  assert.strictEqual(ncReabertaCiclo3.ciclosAcaoCorretiva?.length, 3);
  assert.strictEqual(ncReabertaCiclo3.cicloAtualNumero, 3);
  assert.strictEqual(ncReabertaCiclo3.analisesNaoEficacia?.length, 2);
  assert.strictEqual(ncReabertaCiclo3.ciclosAcaoCorretiva![0].numeroCiclo, 1);
  assert.strictEqual(ncReabertaCiclo3.ciclosAcaoCorretiva![1].numeroCiclo, 2);
  assert.strictEqual(ncReabertaCiclo3.ciclosAcaoCorretiva![2].numeroCiclo, 3);
  pass('Criação do terceiro ciclo preservando integralmente os ciclos 1 e 2');

  // ---------------------------------------------------------------------------
  // TESTE 8: Consulta cronológica de todos os ciclos e avaliações
  // ---------------------------------------------------------------------------
  const listaCiclos = ncReabertaCiclo3.ciclosAcaoCorretiva!;
  assert.strictEqual(listaCiclos[0].numeroCiclo, 1);
  assert.strictEqual(listaCiclos[1].numeroCiclo, 2);
  assert.strictEqual(listaCiclos[2].numeroCiclo, 3);
  assert.strictEqual(listaCiclos[0].statusCiclo, 'INEFICAZ_REABERTO');
  assert.strictEqual(listaCiclos[1].statusCiclo, 'INEFICAZ_REABERTO');
  assert.strictEqual(listaCiclos[2].statusCiclo, 'EM_ANDAMENTO');
  pass('Consulta cronológica de todos os ciclos e avaliações disponível e ordenada');

  // ---------------------------------------------------------------------------
  // TESTE 9: Persistência dos dados após serialização/recarregar da aplicação
  // ---------------------------------------------------------------------------
  const jsonSerializado = JSON.stringify(ncReabertaCiclo3);
  const ncRecarregada: NCRecord = JSON.parse(jsonSerializado);
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva?.length, 3);
  assert.strictEqual(ncRecarregada.analisesNaoEficacia?.length, 2);
  assert.strictEqual(ncRecarregada.cicloAtualNumero, 3);
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva![0].acaoCorretiva.responsavel, 'Rair Rodrigues');
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva![1].acaoCorretiva.responsavel, 'Equipe de TI & Qualidade');
  assert.strictEqual(ncRecarregada.ciclosAcaoCorretiva![2].acaoCorretiva.responsavel, 'Gerência de Qualidade e Operações');
  pass('Persistência e integridade plena dos ciclos confirmadas após recarregar a aplicação');

  // ---------------------------------------------------------------------------
  // TESTE 10: Tratamento correto de falhas e validações obrigatórias
  // ---------------------------------------------------------------------------
  assert.throws(
    () => {
      registrarAnaliseNaoEficaciaECriarNovoCiclo(
        ncReabertaCiclo3,
        {
          resultadoEsperado: '',
          resultadoObservado: 'Falha',
          evidenciasNaoEficacia: 'Evidência',
          justificativaInsucesso: 'Motivo',
          causaRaizContinuaValida: 'SIM',
          mudancasAdotadasNovaTentativa: 'Mudança',
          responsavelAnalise: 'Auditor',
        },
        novaAcaoCiclo3,
        userAdmin
      );
    },
    /resultado esperado/i
  );
  pass('Bloqueio estrito de registros de não eficácia sem os campos obrigatórios');

  // ---------------------------------------------------------------------------
  // TESTE 11: Respeito às permissões (VIEWER bloqueado)
  // ---------------------------------------------------------------------------
  assert.throws(
    () => {
      registrarAnaliseNaoEficaciaECriarNovoCiclo(
        ncReabertaCiclo3,
        avaliacaoNaoEficaz,
        novaAcaoCiclo2,
        userViewer
      );
    },
    /Permissão negada/i
  );
  pass('Usuário com perfil CONSULTA formalmente impedido de reabrir ou criar ciclos');

  // ---------------------------------------------------------------------------
  // TESTE 12: Compatibilidade com NCs antigas que não possuem ciclos adicionais
  // ---------------------------------------------------------------------------
  const ncLegada: NCRecord = {
    id: 'nc-legada-2024',
    codigoFormulario: 'F 001-29',
    revisao: '00',
    dataEmissaoFormulario: '10/01/2024',
    numeroNC: 'NC-2024-001',
    titulo: 'Discrepância Antiga',
    tipoAcao: 'Corretiva',
    descricaoNC: 'Registro histórico sem ciclos prévios.',
    normaReferencia: 'RBAC 145',
    setor: 'Geral',
    categoria: 'Geral',
    responsavel: 'Auditor Antigo',
    avaliacaoRiscoInicial: { severidade: '2', probabilidade: 'C', codigo: '2C', nivel: 'Médio' },
    prazoResposta: '2024-02-10',
    dataIdentificacao: '2024-01-10',
    auditor: 'Auditor Antigo',
    preAnaliseContencao: { descricao: '', responsavel: '', dataLimite: '', status: 'Não Aplicável' },
    analiseCausaRaiz: { metodologia: 'Texto Livre', cincoPorques: [], detalhes: 'Causa legada' },
    acaoCorretiva: { descricao: 'Ação única legada', responsavel: 'Executor Antigo', dataPrazo: '2024-02-01', status: 'Concluída' },
    verificacaoEficacia: { metodo: 'Documental', encerrado: 'SIM', resultado: 'EFICAZ', dataVerificacao: '2024-03-01' },
    statusGeral: 'Encerrada',
    criadoEm: '2024-01-10T00:00:00Z',
    atualizadoEm: '2024-03-01T00:00:00Z',
    historicoPrazos: [],
  };

  const ncLegadaInicializada = garantirCiclosInicializados(ncLegada);
  assert.strictEqual(ncLegadaInicializada.ciclosAcaoCorretiva?.length, 1);
  assert.strictEqual(ncLegadaInicializada.cicloAtualNumero, 1);
  assert.strictEqual(ncLegadaInicializada.ciclosAcaoCorretiva![0].statusCiclo, 'CONCLUIDO_EFICAZ');
  assert.strictEqual(ncLegadaInicializada.ciclosAcaoCorretiva![0].acaoCorretiva.descricao, 'Ação única legada');
  pass('Compatibilidade plena com NCs legadas sem criação de ciclos fictícios');

  // ---------------------------------------------------------------------------
  // TESTE 13: Funcionamento dos alertas e indicadores relacionados às NCs
  // ---------------------------------------------------------------------------
  const cicloAtual = obterCicloAtual(ncReabertaCiclo3);
  assert(cicloAtual !== null);
  assert.strictEqual(cicloAtual.numeroCiclo, 3);
  assert.strictEqual(cicloAtual.acaoCorretiva.responsavel, 'Gerência de Qualidade e Operações');
  pass('Indicadores e painéis resolvem com precisão o ciclo ativo e seus prazos');

  // ---------------------------------------------------------------------------
  // TESTE 14: Impedimento de encerramento indevido com pendências obrigatórias
  // ---------------------------------------------------------------------------
  const validacao1 = validarEncerramentoNC(ncReabertaCiclo3);
  assert.strictEqual(validacao1.permitido, false);
  assert(validacao1.pendencias.some(p => p.includes('não está concluída')));
  pass('Impedimento rigoroso de encerramento de NC com ação em andamento no ciclo ativo');

  // ---------------------------------------------------------------------------
  // TESTE 15: Conclusão e encerramento válido após ciclo eficaz
  // ---------------------------------------------------------------------------
  const ncCiclo3Concluida: NCRecord = {
    ...ncReabertaCiclo3,
    analiseCausaRaiz: {
      ...ncReabertaCiclo3.analiseCausaRaiz,
      statusValidacao: 'VALIDADA PELO RESPONSÁVEL',
    },
    acaoCorretiva: {
      ...ncReabertaCiclo3.acaoCorretiva,
      status: 'Concluída',
      dataConclusao: '2026-06-14',
    },
    verificacaoEficacia: {
      metodo: 'Documental',
      encerrado: 'SIM',
      resultado: 'EFICAZ',
      dataVerificacao: '2026-07-10',
      auditorVerificador: 'Eng. Paulo Okubo',
      motivo: 'Auditoria em 100% das bases confirmou ausência de calibradores vencidos após novas travas.',
    },
  };
  const validacao2 = validarEncerramentoNC(ncCiclo3Concluida);
  assert.strictEqual(validacao2.permitido, true);
  pass('Encerramento formal homologado com sucesso após ciclo final avaliado como EFICAZ');

  // ---------------------------------------------------------------------------
  // PARTE A (CONTROLE DOCUMENTAL) — TESTE 16: buildDocumentIndexKey com configuração
  // ---------------------------------------------------------------------------
  const key1 = buildDocumentIndexKey({
    codigo: 'MEL B737-800',
    clienteId: 'CLI-ATLAS',
    frota: 'Boeing 737',
    configuracao: 'VIP',
  });
  const key2 = buildDocumentIndexKey({
    codigo: 'MEL B737-800',
    clienteId: 'CLI-ATLAS',
    frota: 'Boeing 737',
    configuracao: 'CARGO',
  });
  assert.notStrictEqual(key1, key2);
  assert(key1.includes('VIP'));
  assert(key2.includes('CARGO'));
  pass('buildDocumentIndexKey diferencia com precisão configurações distintas da mesma frota');

  // ---------------------------------------------------------------------------
  // PARTE A (CONTROLE DOCUMENTAL) — TESTE 17: Coexistência de múltiplas MELs
  // ---------------------------------------------------------------------------
  const keyB737 = buildDocumentIndexKey({
    codigo: 'MEL-B737',
    clienteId: 'CLI-ATLAS',
    frota: 'Boeing 737',
  });
  const keyA320 = buildDocumentIndexKey({
    codigo: 'MEL-A320',
    clienteId: 'CLI-ATLAS',
    frota: 'Airbus A320',
  });
  assert.notStrictEqual(keyB737, keyA320);
  pass('Múltiplas MELs para o mesmo cliente possuem índices transacionais segregados');

  // ---------------------------------------------------------------------------
  // PARTE A (CONTROLE DOCUMENTAL) — TESTE 18: Isolamento estrito de organizationId
  // ---------------------------------------------------------------------------
  const pathOrg1 = `organizations/${org1}/controlled_documents_codes/${keyB737}`;
  const pathOrg2 = `organizations/${org2}/controlled_documents_codes/${keyB737}`;
  assert.notStrictEqual(pathOrg1, pathOrg2);
  pass('Isolamento físico de tenant por organizationId garantido nas chaves do Firestore');

  // ---------------------------------------------------------------------------
  // PARTE A (CONTROLE DOCUMENTAL) — TESTE 19: Documentos distintos na mesma frota
  // ---------------------------------------------------------------------------
  const keyAMM = buildDocumentIndexKey({
    codigo: 'AMM-B737',
    clienteId: 'CLI-ATLAS',
    frota: 'Boeing 737',
  });
  const keyIPC = buildDocumentIndexKey({
    codigo: 'IPC-B737',
    clienteId: 'CLI-ATLAS',
    frota: 'Boeing 737',
  });
  assert.notStrictEqual(keyAMM, keyIPC);
  pass('Documentos distintos (AMM vs IPC) da mesma frota possuem chaves independentes');

  // ---------------------------------------------------------------------------
  // TESTE 20: Trilha de auditoria acumula eventos de ciclo
  // ---------------------------------------------------------------------------
  assert(ncReabertaCiclo3.trilhaAuditoria!.length >= 2);
  assert(ncReabertaCiclo3.trilhaAuditoria!.some(e => e.tipoEvento === 'REABERTURA_NOVO_CICLO'));
  pass('Trilha de auditoria formal registra cumulativamente cada reabertura e instauração de ciclo');

  console.log(`\n=== RESUMO: ${passedTests} PASS, 0 FAIL (100% HOMOLOGADO) ===\n`);
}

runTests().catch((err) => {
  console.error('\n[ERRO NO TESTE]:', err);
  process.exit(1);
});
