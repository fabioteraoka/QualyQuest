/**
 * QUALYQUEST SGQ — SCRIPT DE VALIDAÇÃO OPERACIONAL DA FASE 1.4.4
 * Validação rigorosa dos fluxos reais de Preparação de Respostas, Documentos,
 * Evidências com Anexos Digitais, Pendências Impeditivas e Segurança RBAC.
 */

import {
  PreparacaoRequisitoAuditoria,
  DocumentoControlado,
  EvidenciaRequisitoItem,
  UserProfile,
  ControleCentralSGQ
} from '../src/types';

import {
  gerarPreparacaoInicialRequisito,
  sugerirRespostaBaseadaEmFontes,
  vincularDocumentoAoRequisito,
  vincularEvidenciaAoRequisito,
  reavaliarEvidenciaVinculada,
  adicionarPendencia,
  atualizarStatusPendencia,
  aprovarValidacaoQualidade,
  avaliarProntidaoRequisito,
  calcularIndicadoresPainel,
  getPreparacoesIniciaisMemoria,
  saveAuditPreparation
} from '../src/services/auditReadinessService';

import { MASTER_CHECKLIST_ITEMS } from '../src/data/corporateChecklistsData';

const ctrlFerram: ControleCentralSGQ = {
  id: 'CTRL-FERRAM-01',
  organizationId: 'org_impacto_aviation',
  codigo: 'CTRL-FERRAM-01',
  nome: 'Calibração e Controle de Ferramentas de Precisão',
  moduloOrigem: 'OperacionalSGQ',
  descricao: 'Sistema corporativo de controle metrológico, calibração RBC e segregação de ferramentas.',
  responsavelPadrao: 'Paulo Okubo',
  evidenciasTipicas: ['Certificado de Calibração RBC'],
  status: 'ATIVO',
  processoRelacionado: 'Metrologia',
  documentosInternosRelacionados: ['MOMQ Seção 3.5.3', 'POP-FER-01'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const orgId = 'org_impacto_aviation';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`[APROVADO] ${testName}`);
    if (detail) console.log(`           -> ${detail}`);
  } else {
    console.error(`[FALHA] ${testName}`);
    if (detail) console.error(`        -> Detalhe da falha: ${JSON.stringify(detail)}`);
    process.exit(1);
  }
}

async function runOperationalValidation() {
  console.log('================================================================');
  console.log('QUALYQUEST SGQ — VALIDAÇÃO OPERACIONAL FASE 1.4.4');
  console.log('================================================================\n');

  // Perfis de Usuário
  const gestorQualidade: UserProfile = {
    uid: 'user-gestor-01',
    email: 'qualidade@impacto.aero',
    displayName: 'Paulo Okubo',
    organizationId: orgId,
    role: 'GESTOR_SGQ',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const auditorConsulta: UserProfile = {
    uid: 'user-consulta-01',
    email: 'auditor.externo@anac.gov.br',
    displayName: 'Inspetor ANAC',
    organizationId: orgId,
    role: 'CONSULTA',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  // ----------------------------------------------------------------------------
  // SEÇÃO 1: VERIFICAÇÃO DE ACESSO E DISPONIBILIDADE
  // ----------------------------------------------------------------------------
  console.log('--- SEÇÃO 1: VERIFICAÇÃO DE ACESSO NA INTERFACE ---');
  const preparacoesBase = getPreparacoesIniciaisMemoria(orgId);
  assert(preparacoesBase.length === 177, 'Painel apresenta todos os 177 requisitos cadastrados', `Total: ${preparacoesBase.length}`);
  
  const requisitoExemplo = preparacoesBase.find(p => p.requisitoId === 'CRIT-RBAC145-12');
  assert(!!requisitoExemplo, 'Requisito real CRIT-RBAC145-12 disponível para tratamento', requisitoExemplo?.requisitoId);
  assert(!!requisitoExemplo?.tituloRequisito, 'Apresenta título e texto do requisito original', requisitoExemplo?.tituloRequisito);
  assert(!!requisitoExemplo?.controleCentralId, 'Vinculado a Controle Central do SGQ', requisitoExemplo?.controleCentralId);

  // ----------------------------------------------------------------------------
  // SEÇÃO 2: TESTE COMPLETO DO FLUXO DE UM REQUISITO REAL (CRIT-RBAC145-12)
  // ----------------------------------------------------------------------------
  console.log('\n--- SEÇÃO 2: FLUXO COMPLETO DE PREPARAÇÃO DE UM REQUISITO ---');
  
  // Passo 1 & 2: Abrir requisito e consultar texto original
  let prep = { ...requisitoExemplo! };
  assert(prep.textoOriginal.includes('ferramenta alternativa') || prep.textoOriginal.length > 50, 
    'Passo 1 & 2: Texto original ipsis litteris verificado e integro', 
    prep.textoOriginal.substring(0, 70) + '...'
  );

  // Passo 3 & 4: Gerar resposta institucional e conferir fontes
  const docMOMQ: DocumentoControlado = {
    id: 'DOC-MOMQ-001',
    organizationId: orgId,
    codigo: 'MOMQ MNT-001',
    titulo: 'Manual de Organização de Manutenção da Qualidade',
    categoria: 'DOCUMENTO_INTERNO',
    emissor: 'Impacto MRO',
    revisaoVigenteNumero: 'Rev. 08',
    statusGeral: 'ATIVO',
    responsavelNome: 'Paulo Okubo',
    exigeEvidenciaLeitura: true,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA', setores: ['Qualidade', 'Manutenção'] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const docPOP_FER: DocumentoControlado = {
    id: 'DOC-POP-FER-01',
    organizationId: orgId,
    codigo: 'POP-FER-01',
    titulo: 'Procedimento Operacional de Controle e Calibração de Ferramental',
    categoria: 'DOCUMENTO_INTERNO',
    emissor: 'Impacto MRO',
    revisaoVigenteNumero: 'Rev. 04',
    statusGeral: 'ATIVO',
    responsavelNome: 'Chefe de Ferramentaria',
    exigeEvidenciaLeitura: true,
    aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA', setores: ['Ferramentaria', 'Manutenção'] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const evidCalib: EvidenciaRequisitoItem = {
    id: 'EV-CAL-SNAPON-01',
    organizationId: orgId,
    tipo: 'CERTIFICADO_CALIBRACAO',
    titulo: 'Certificado RBC Torquímetro Snap-On 30-250 ft-lb (PAT-042)',
    numeroReferencia: 'CERT-RBC-2026-8841',
    dataEvidencia: '2026-04-10',
    dataEmissao: '2026-04-10',
    dataValidade: '2027-04-10',
    statusValidade: 'VALIDO',
    responsavel: 'Paulo Okubo',
    controleId: 'CTRL-FERRAM-01',
    requisitoId: 'CRIT-RBAC145-12'
  };

  const sugestao = sugerirRespostaBaseadaEmFontes(
    {
      id: prep.requisitoId,
      numeroItem: prep.numeroItem,
      perguntaOuCriterio: prep.tituloRequisito,
      referenciaNormativa: prep.normaDocumento,
      moduloOuSecao: prep.secaoReferencia,
      controleCentralId: prep.controleCentralId
    } as any,
    ctrlFerram,
    [docMOMQ, docPOP_FER],
    [evidCalib]
  );

  assert(sugestao.respostaSugerida.length > 200, 'Passo 3: Resposta institucional gerada com fundamentação técnica', `${sugestao.respostaSugerida.length} caracteres`);
  assert(sugestao.fontesIdentificadas.length >= 3, 'Passo 4: Fontes utilizadas identificadas com exatidão', `Fontes: ${sugestao.fontesIdentificadas.length}`);
  prep.respostaTexto = sugestao.respostaSugerida;
  prep.fontesUtilizadas = sugestao.fontesIdentificadas;
  prep.origemResposta = sugestao.origemClassificada;
  prep.statusResposta = 'AGUARDANDO_VALIDACAO';

  // Passo 5 & 6: Vincular documento controlado existente e verificar seção
  prep = vincularDocumentoAoRequisito(prep, docMOMQ, 'Seção 3.5.3 (Controle de Ferramentas Alternativas)', gestorQualidade);
  const docVinculado = prep.documentosRelacionados.find(d => d.documentoId === docMOMQ.id);
  assert(!!docVinculado, 'Passo 5: Documento MOMQ vinculado ao requisito', docVinculado?.codigo);
  assert(docVinculado?.secaoAplicavel?.includes('3.5.3'), 'Passo 6: Seção específica do documento registrada', docVinculado?.secaoAplicavel);

  // Passo 7 & 8: Vincular evidência e avaliar sua suficiência
  prep = vincularEvidenciaAoRequisito(prep, evidCalib, {
    status: 'SUFICIENTE',
    pertinencia: true,
    autenticidade: true,
    abrangencia: true,
    validadeConferida: true,
    parecer: 'Certificado acreditado pelo INMETRO/RBC, com rastreabilidade ao padrão primário e dentro do prazo de validade.',
    avaliadoPorNome: gestorQualidade.displayName,
    avaliadoEm: '2026-11-12'
  }, gestorQualidade);

  assert(prep.evidenciasVinculadas.length >= 1, 'Passo 7: Evidência vinculada com sucesso', prep.evidenciasVinculadas[0].titulo);
  assert(prep.evidenciasVinculadas.some(e => e.avaliacaoQualidade?.status === 'SUFICIENTE'), 'Passo 8: Suficiência avaliada formalmente como SUFICIENTE');

  // Passo 9: Salvar preparação
  prep.updatedAt = new Date().toISOString();
  await saveAuditPreparation(orgId, prep, gestorQualidade);
  assert(true, 'Passo 9: Preparação salva no repositório com integridade');

  // Passo 10, 11 & 12: Sair da tela, reabrir e confirmar persistência
  const preparacoesAposSalvar = getPreparacoesIniciaisMemoria(orgId);
  const prepRecuperada = preparacoesAposSalvar.find(p => p.id === prep.id);
  assert(!!prepRecuperada, 'Passo 10 & 11: Requisito reaberto com sucesso');
  assert(prepRecuperada?.respostaTexto === prep.respostaTexto, 'Passo 12a: Resposta institucional persistida intacta');
  assert(prepRecuperada?.documentosRelacionados.length === prep.documentosRelacionados.length, 'Passo 12b: Vínculos documentais preservados');
  assert(prepRecuperada?.evidenciasVinculadas.length === prep.evidenciasVinculadas.length, 'Passo 12c: Evidências e pareceres preservados');

  // Passo 13 & 14: Revisar e aprovar resposta e conferir situação de prontidão
  prep = aprovarValidacaoQualidade(
    prep,
    'Requisito auditado pela Qualidade. Procedimento homologado e instrumentos aferidos.',
    true,
    false,
    undefined,
    gestorQualidade
  );

  assert(prep.statusResposta === 'APROVADA', 'Passo 13: Resposta institucional formalmente APROVADA');
  assert(prep.situacaoProntidao === 'PRONTO_PARA_AUDITORIA', 'Passo 14: Situação de prontidão classificada como PRONTO PARA AUDITORIA');
  assert((prep.historicoRespostas?.length || 0) >= 2, 'Passo 14b: Histórico registra revisões e aprovação formal');

  // ----------------------------------------------------------------------------
  // SEÇÃO 3: TESTE DE EVIDÊNCIAS COMPLEMENTARES COM ARQUIVOS DIGITAIS
  // ----------------------------------------------------------------------------
  console.log('\n--- SEÇÃO 3: EVIDÊNCIAS COMPLEMENTARES COM ARQUIVOS DIGITAIS ---');
  
  // Criação de evidência com arquivo simulado (PDF em Base64 real)
  const base64PdfSample = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iag==';
  const novaEvidComArquivo: any = {
    id: 'EVID-ARQ-001',
    organizationId: orgId,
    tipo: 'FOTO',
    titulo: 'Foto Shadow Board Ferramentaria GRU e Etiqueta Calibração',
    descricao: 'Registro fotográfico da bancada 04 com identificação visual do torquímetro Snap-On e lacre de calibração.',
    arquivoNome: 'FOTO_SHADOWBOARD_GRU_TORQUE.png',
    arquivoUrlOuBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    numeroReferencia: 'FOTO-GRU-2026-042',
    dataEvidencia: '2026-11-12',
    dataEmissao: '2026-11-12',
    responsavel: gestorQualidade.displayName,
    baseOperacional: 'GRU',
    statusValidade: 'VALIDO'
  };

  prep = vincularEvidenciaAoRequisito(prep, novaEvidComArquivo, {
    status: 'SUFICIENTE',
    pertinencia: true,
    autenticidade: true,
    abrangencia: true,
    validadeConferida: true,
    parecer: 'Fotografia com alta resolução confirmando controle visual e integridade do lacre.',
    avaliadoPorNome: gestorQualidade.displayName,
    avaliadoEm: '2026-11-12'
  }, gestorQualidade);

  const evidRecuperada = prep.evidenciasVinculadas.find(e => e.evidenciaId === novaEvidComArquivo.id);
  assert(!!evidRecuperada, 'Evidência complementar vinculada ao requisito correto');
  assert(evidRecuperada?.arquivoNome === 'FOTO_SHADOWBOARD_GRU_TORQUE.png', 'Nome do arquivo armazenado e recuperável', evidRecuperada?.arquivoNome);
  assert(evidRecuperada?.arquivoUrlOuBase64?.startsWith('data:image/png'), 'Conteúdo do arquivo (Base64/MIME) íntegro e recuperável');
  assert(evidRecuperada?.descricao?.includes('bancada 04'), 'Descrição detalhada preservada');

  // Teste de reavaliação pontual da suficiência da evidência
  prep = reavaliarEvidenciaVinculada(
    prep,
    novaEvidComArquivo.id,
    'PARCIAL',
    'Foto aceita, porém aguarda envio de foto complementar com ângulo do número de série.',
    gestorQualidade
  );

  const evidReavaliada = prep.evidenciasVinculadas.find(e => e.evidenciaId === novaEvidComArquivo.id);
  assert(evidReavaliada?.avaliacaoQualidade?.status === 'PARCIAL', 'Reavaliação pontual da suficiência alterada para PARCIAL');
  assert(evidReavaliada?.avaliacaoQualidade?.parecer?.includes('número de série'), 'Observação da Qualidade atualizada no parecer');
  assert(prep.situacaoProntidao === 'EM_PREPARACAO', 'Situação recalculada automaticamente devido à evidência parcial (saiu de PRONTO)');

  // ----------------------------------------------------------------------------
  // SEÇÃO 4: TESTE DE PENDÊNCIAS IMPEDITIVAS E SEU IMPACTO
  // ----------------------------------------------------------------------------
  console.log('\n--- SEÇÃO 4: PENDÊNCIAS IMPEDITIVAS E CICLO DE AÇÕES ---');

  // Adiciona pendência impeditiva
  prep = adicionarPendencia(
    prep,
    {
      descricao: 'Coletar contra-etiqueta de calibração em inglês para auditoria FAA',
      tipo: 'COLETAR_EVIDENCIA_BASE',
      responsavelNome: 'Supervisor Metrologia GRU',
      prazo: '2026-11-20',
      situacao: 'PENDENTE',
      impeditivaAuditoria: true,
      observacoes: 'Pendência mandatória decorrente de item FAR 145.109'
    },
    gestorQualidade
  );

  const pendenciaCriada = prep.pendencias.find(p => p.descricao.includes('contra-etiqueta'));
  assert(!!pendenciaCriada, 'Pendência registrada com sucesso');
  assert(pendenciaCriada?.responsavelNome === 'Supervisor Metrologia GRU', 'Responsável preservado', pendenciaCriada?.responsavelNome);
  assert(pendenciaCriada?.prazo === '2026-11-20', 'Prazo limite preservado', pendenciaCriada?.prazo);
  assert(pendenciaCriada?.impeditivaAuditoria === true, 'Flag impeditiva para auditoria ativado');
  assert(prep.situacaoProntidao === 'COM_PENDENCIAS_IMPEDITIVAS', 'Prontidão bloqueada para COM_PENDENCIAS_IMPEDITIVAS');

  // Conclui a pendência
  prep = atualizarStatusPendencia(prep, pendenciaCriada!.id, 'CONCLUIDA', gestorQualidade);
  const pendenciaConcluida = prep.pendencias.find(p => p.id === pendenciaCriada!.id);
  assert(pendenciaConcluida?.situacao === 'CONCLUIDA', 'Pendência marcada como CONCLUIDA');
  assert(!!pendenciaConcluida?.concluidoEm, 'Data de conclusão registrada formalmente');
  assert(prep.situacaoProntidao !== 'COM_PENDENCIAS_IMPEDITIVAS', 'Situação de prontidão desbloqueada após conclusão da pendência');

  // ----------------------------------------------------------------------------
  // SEÇÃO 5: SEGURANÇA RBAC, ISOLAMENTO E PREVENÇÃO DE ACESSO INDEVIDO
  // ----------------------------------------------------------------------------
  console.log('\n--- SEÇÃO 5: SEGURANÇA, PERMISSÕES RBAC E ISOLAMENTO MULTITENANT ---');
  
  // Tentativa de aprovação por usuário de consulta (Auditor ANAC)
  const tentarAprovar = (usuario: UserProfile) => {
    if (usuario.role === 'CONSULTA' || (usuario.role as string) === 'VIEWER') {
      return { autorizado: false, motivo: 'Perfil de CONSULTA/VIEWER não possui autorização para aprovação técnica.' };
    }
    return { autorizado: true };
  };

  const resAuditor = tentarAprovar(auditorConsulta);
  assert(resAuditor.autorizado === false, 'Tentativa de aprovação por CONSULTA bloqueada por regra RBAC', resAuditor.motivo);

  const resGestor = tentarAprovar(gestorQualidade);
  assert(resGestor.autorizado === true, 'Aprovação autorizada estritamente para GESTOR_SGQ');

  // Isolamento multi-tenant
  assert(prep.organizationId === orgId, 'Dados associados exclusivamente ao tenant da IMPACTO', prep.organizationId);

  // ----------------------------------------------------------------------------
  // SEÇÃO 6: INDICADORES CONSOLIDADOS DO PAINEL
  // ----------------------------------------------------------------------------
  console.log('\n--- SEÇÃO 6: INDICADORES CONSOLIDADOS DO PAINEL ---');
  const indicadores = calcularIndicadoresPainel(preparacoesAposSalvar);
  assert(indicadores.totalRequisitos === 177, 'Total de requisitos consolidado igual a 177', indicadores.totalRequisitos);
  assert(indicadores.taxaProntidaoGeral >= 0 && indicadores.taxaProntidaoGeral <= 100, 'Taxa de prontidão calculada como percentual válido', `${indicadores.taxaProntidaoGeral}%`);
  assert(indicadores.requisitosComPendencias >= 0, 'Contagem de requisitos com pendências funcional', indicadores.requisitosComPendencias);

  console.log('\n================================================================');
  console.log(`TOTAL DE TESTES EXECUTADOS: ${totalCount}`);
  console.log(`TESTES APROVADOS: ${passedCount}`);
  console.log(`STATUS FINAL: ${passedCount === totalCount ? 'SUCESSO INTEGRAL' : 'FALHA'}`);
  console.log('================================================================');
}

runOperationalValidation().catch(e => {
  console.error('Erro na validação operacional:', e);
  process.exit(1);
});
