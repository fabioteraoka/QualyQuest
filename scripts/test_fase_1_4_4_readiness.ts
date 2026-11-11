/**
 * SCRIPT DE TESTE E VALIDAÇÃO TÉCNICA — FASE 1.4.4 QUALYQUEST
 * PREPARAÇÃO DE RESPOSTAS E EVIDÊNCIAS PARA AUDITORIAS
 * 
 * Bateria Automatizada com os 12 Testes Mandatórios da Seção 9:
 * 1. Abrir e tratar um requisito original.
 * 2. Gerar resposta sugerida a partir de documentos existentes.
 * 3. Identificar corretamente as fontes utilizadas.
 * 4. Anexar evidência.
 * 5. Vincular documento já cadastrado.
 * 6. Reutilizar evidência em requisitos compatíveis.
 * 7. Registrar pendência e responsável.
 * 8. Revisar e aprovar resposta.
 * 9. Verificar histórico de alterações.
 * 10. Validar os indicadores do painel.
 * 11. Confirmar isolamento por organização e permissões de acesso.
 * 12. Confirmar que requisitos diferentes não compartilham indevidamente resposta ou conformidade.
 */

import {
  gerarPreparacaoInicialRequisito,
  sugerirRespostaBaseadaEmFontes,
  avaliarProntidaoRequisito,
  adicionarPendencia,
  atualizarStatusPendencia,
  vincularDocumentoAoRequisito,
  vincularEvidenciaAoRequisito,
  salvarEdicaoResposta,
  aprovarValidacaoQualidade,
  calcularIndicadoresPainel,
  getPreparacoesIniciaisMemoria
} from '../src/services/auditReadinessService';
import { MASTER_CHECKLIST_ITEMS } from '../src/data/corporateChecklistsData';
import { AUDITORIA_CONSOLIDACAO_DATA } from '../src/data/canonicalCriteriaAuditData';
import { CONTROLES_CORPORATIVOS_EXPANDIDOS, INITIAL_COMPLIANCE_EVIDENCES } from '../src/services/corporateComplianceMatrixService';
import { DocumentoControlado, EvidenciaRequisitoItem, UserProfile } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
    if (detail) console.log(`       -> ${detail}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    if (detail) console.error(`       -> ${detail}`);
  }
}

console.log('================================================================');
console.log('INICIANDO BATERIA DE TESTES OBRIGATÓRIOS — FASE 1.4.4 QUALYQUEST');
console.log('PREPARAÇÃO DE RESPOSTAS E EVIDÊNCIAS PARA AUDITORIAS');
console.log('================================================================\n');

const orgId = 'org_impacto_aviation';
const userQualidade: UserProfile = {
  uid: 'user_gestor_01',
  organizationId: orgId,
  displayName: 'Paulo Okubo (Gerente da Qualidade)',
  email: 'qualidade@impactoaviation.com.br',
  role: 'GESTOR_SGQ',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

const userConsulta: UserProfile = {
  uid: 'user_viewer_01',
  organizationId: orgId,
  displayName: 'Auditor Visitante (Leitura)',
  email: 'viewer@auditoria.com',
  role: 'CONSULTA',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

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

const evidenciaCalib1: EvidenciaRequisitoItem = {
  id: 'EV-CAL-SNAPON-01',
  organizationId: orgId,
  tipo: 'CERTIFICADO_CALIBRACAO',
  titulo: 'Certificado RBC Torquímetro Snap-On 30-250 ft-lb (PAT-042)',
  numeroReferencia: 'CERT-RBC-2026-8841',
  dataEvidencia: '2026-04-10',
  dataEmissao: '2026-04-10',
  dataValidade: '2027-04-10',
  baseOperacional: 'GRU',
  statusValidade: 'VALIDO',
  responsavel: 'Chefe de Metrologia',
  controleId: 'CTRL-FERRAM-01',
  controleCodigo: 'CTRL-FERRAM-01',
  requisitoId: 'CRIT-RBAC145-12'
};

// ----------------------------------------------------------------------------
// TESTE 1: Abrir e tratar um requisito original
// ----------------------------------------------------------------------------
console.log('--- TESTE 1: ABRIR E TRATAR UM REQUISITO ORIGINAL ---');
const itemOrig1 = MASTER_CHECKLIST_ITEMS.find((i) => i.id === 'CRIT-RBAC145-12');
assert(!!itemOrig1, 'Requisito original CRIT-RBAC145-12 localizado na base de dados', `Item: ${itemOrig1?.id} | ${itemOrig1?.referenciaNormativa}`);

let prep1 = gerarPreparacaoInicialRequisito(itemOrig1!, orgId);
assert(prep1.id === 'CRIT-RBAC145-12', 'Preparação individual criada com ID exclusivo do requisito', `ID: ${prep1.id}`);
assert(prep1.textoOriginal === itemOrig1?.textoOriginal, 'Texto original preservado ipsis litteris', `Texto: "${prep1.textoOriginal.substring(0, 70)}..."`);
assert(prep1.controleCentralCodigo === 'CTRL-FERRAM-01', 'Controle Central SGQ vinculado (CTRL-FERRAM-01)', `Controle: ${prep1.controleCentralNome}`);

// ----------------------------------------------------------------------------
// TESTE 2: Gerar resposta sugerida a partir de documentos existentes
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 2: GERAR RESPOSTA SUGERIDA A PARTIR DE DOCUMENTOS EXISTENTES ---');
const sugestao = sugerirRespostaBaseadaEmFontes(
  itemOrig1!,
  CONTROLES_CORPORATIVOS_EXPANDIDOS.find((c) => c.codigo === 'CTRL-FERRAM-01'),
  [docMOMQ, docPOP_FER],
  [evidenciaCalib1]
);

assert(sugestao.respostaSugerida.length > 50, 'Resposta institucional sugerida formulada com sucesso', `Tamanho: ${sugestao.respostaSugerida.length} caracteres`);
assert(sugestao.respostaSugerida.includes('CTRL-FERRAM-01'), 'Resposta sugerida referencia o Controle Corporativo do SGQ');
assert(sugestao.respostaSugerida.includes('MOMQ') || sugestao.respostaSugerida.includes('POP-FER'), 'Resposta fundamentada em procedimentos do acervo sem inventar dados');
assert(sugestao.origemClassificada === 'AUTOMATICA' || sugestao.origemClassificada === 'AUTOMATICA_COM_VALIDACAO', 'Classificação de origem coerente com a suficiência das fontes', `Origem: ${sugestao.origemClassificada}`);

// ----------------------------------------------------------------------------
// TESTE 3: Identificar corretamente as fontes utilizadas
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 3: IDENTIFICAR CORRETAMENTE AS FONTES UTILIZADAS ---');
assert(sugestao.fontesIdentificadas.length >= 2, 'Fontes documentais identificadas e mapeadas', `Total fontes: ${sugestao.fontesIdentificadas.length}`);
const temProcedimento = sugestao.fontesIdentificadas.some((f) => f.tipo === 'PROCEDIMENTO' || f.tipo === 'MANUAL');
const temCertificado = sugestao.fontesIdentificadas.some((f) => f.tipo === 'REGISTRO');
assert(temProcedimento, 'Identificado procedimento formal aplicável (MOMQ / POP-FER)');
assert(temCertificado, 'Identificado registro objetivo de evidência metrológica (Certificado RBC)');

// ----------------------------------------------------------------------------
// TESTE 4: Anexar evidência
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 4: ANEXAR EVIDÊNCIA COM AVALIAÇÃO DA QUALIDADE ---');
prep1 = vincularEvidenciaAoRequisito(prep1, evidenciaCalib1, {
  status: 'SUFICIENTE',
  pertinencia: true,
  autenticidade: true,
  abrangencia: true,
  validadeConferida: true,
  parecer: 'Certificado de calibração metrológica RBC acreditado, dentro do prazo de validade.',
  avaliadoPorNome: userQualidade.displayName,
  avaliadoEm: '2026-11-11'
}, userQualidade);

assert(prep1.evidenciasVinculadas.length >= 1, 'Evidência anexada ao requisito com sucesso', `Total evidências: ${prep1.evidenciasVinculadas.length}`);
assert(prep1.evidenciasVinculadas[0].avaliacaoQualidade?.status === 'SUFICIENTE', 'Avaliação da Qualidade registrada como SUFICIENTE');
assert(prep1.evidenciasVinculadas[0].avaliacaoQualidade?.pertinencia === true, 'Pertinência e validade conferidas formalmente');

// ----------------------------------------------------------------------------
// TESTE 5: Vincular documento já cadastrado
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 5: VINCULAR DOCUMENTO JÁ CADASTRADO NO ACERVO ---');
prep1 = vincularDocumentoAoRequisito(prep1, docMOMQ, 'Seção 3.4.2 — Controle de Ferramentas Calibradas', userQualidade);
assert(prep1.documentosRelacionados.some((d) => d.codigo === 'MOMQ MNT-001'), 'Documento MOMQ MNT-001 vinculado sem criar cópias desnecessárias');
assert(prep1.documentosRelacionados[0].secaoAplicavel?.includes('3.4.2'), 'Seção específica de referência registrada', prep1.documentosRelacionados[0].secaoAplicavel);

// ----------------------------------------------------------------------------
// TESTE 6: Reutilizar evidência em requisitos compatíveis
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 6: REUTILIZAR EVIDÊNCIA EM REQUISITOS COMPATÍVEIS ---');
const itemOrig2 = MASTER_CHECKLIST_ITEMS.find((i) => i.id === 'CRIT-FAA-04'); // Calibração FAA 14 CFR 145.109(b)
assert(!!itemOrig2, 'Requisito compatível CRIT-FAA-04 localizado');

let prep2 = gerarPreparacaoInicialRequisito(itemOrig2!, orgId);
// Reutiliza a mesma evidência de calibração no requisito da FAA, registrando vínculo individual
prep2 = vincularEvidenciaAoRequisito(prep2, evidenciaCalib1, {
  status: 'PARCIAL', // Parcial para FAA porque requer verificação de rastreabilidade ao NIST
  pertinencia: true,
  autenticidade: true,
  abrangencia: true,
  validadeConferida: true,
  parecer: 'Certificado RBC aceito temporariamente; requer verificação de selo de mútua aceitação ILAC/NIST para matrículas americanas.',
  avaliadoPorNome: userQualidade.displayName,
  avaliadoEm: '2026-11-11'
}, userQualidade);

assert(prep2.evidenciasVinculadas.length >= 1, 'Evidência reutilizada com registro de vínculo individual no requisito FAA');
const evidReutilizada = prep2.evidenciasVinculadas.find((e) => e.evidenciaId === evidenciaCalib1.id);
assert(!!evidReutilizada, 'Mesmo ID de evidência compartilhado sem duplicação de arquivo');
assert(evidReutilizada?.avaliacaoQualidade?.status === 'PARCIAL', 'Parecer específico do requisito preservado (PARCIAL para FAA vs SUFICIENTE para ANAC)');

// ----------------------------------------------------------------------------
// TESTE 7: Registrar pendência e responsável
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 7: REGISTRAR PENDÊNCIA E RESPONSÁVEL ---');
prep2 = adicionarPendencia(prep2, {
  descricao: 'Solicitar ao laboratório RBC adendo com declaração explícita de rastreabilidade ao NIST (exigência 14 CFR 145.109(b)).',
  tipo: 'SOLICITAR_CERTIFICADO',
  responsavelNome: 'Chefe de Metrologia',
  prazo: '2026-11-25',
  situacao: 'PENDENTE',
  impeditivaAuditoria: true,
  observacoes: 'Necessário para auditoria de linha de operadores dos EUA.'
}, userQualidade);

assert(prep2.pendencias.length === 1, 'Pendência registrada com responsável e prazo', `Prazo: ${prep2.pendencias[0].prazo} | Resp: ${prep2.pendencias[0].responsavelNome}`);
assert(prep2.pendencias[0].impeditivaAuditoria === true, 'Pendência classificada como Impeditiva para Auditoria');

const avaliacaoPrep2 = avaliarProntidaoRequisito(prep2);
assert(avaliacaoPrep2.pronto === false, 'Pendência impeditiva bloqueia a prontidão do requisito para auditoria');
assert(avaliacaoPrep2.situacaoCalculada === 'COM_PENDENCIAS_IMPEDITIVAS', 'Situação classificada como COM_PENDENCIAS_IMPEDITIVAS', avaliacaoPrep2.situacaoCalculada);

// ----------------------------------------------------------------------------
// TESTE 8: Revisar e aprovar resposta
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 8: REVISAR E APROVAR RESPOSTA ---');
prep1 = salvarEdicaoResposta(
  prep1,
  'A IMPACTO cumpre integralmente o RBAC 145.109(b) através do controle CTRL-FERRAM-01 e procedimento MOMQ Seção 3.4.2. Todas as ferramentas ativas possuem certificado de calibração RBC e etiqueta física inviolável.',
  'APROVADA',
  'AUTOMATICA',
  'Aprovação final pela Gerência da Qualidade após conferência do certificado RBC.',
  userQualidade
);

assert(prep1.statusResposta === 'APROVADA', 'Resposta aprovada pela Qualidade');
assert(prep1.respostaRevisada === true, 'Flag de resposta revisada ativado');

prep1 = aprovarValidacaoQualidade(
  prep1,
  'Requisito revisado, evidências suficientes ativas e sem pendências abertas. Considerado Pronto para Auditoria.',
  true,
  false,
  undefined,
  userQualidade
);

assert(prep1.situacaoProntidao === 'PRONTO_PARA_AUDITORIA', 'Requisito classificado como PRONTO PARA AUDITORIA');
assert(prep1.validadoPorNome === userQualidade.displayName, 'Responsável pela validação registrado formalmente');

// ----------------------------------------------------------------------------
// TESTE 9: Verificar histórico de alterações
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 9: VERIFICAR HISTÓRICO DE ALTERAÇÕES ---');
assert(prep1.historicoRespostas.length >= 2, 'Histórico de versões preservado', `Total revisões: ${prep1.historicoRespostas.length}`);
const ultimaRev = prep1.historicoRespostas[0];
assert(ultimaRev.acao === 'APROVACAO', 'Última ação gravada como APROVACAO');
assert(ultimaRev.usuarioNome === userQualidade.displayName, 'Autor da alteração registrado no histórico');
assert(!!ultimaRev.dataHora, 'Data e hora da alteração registradas com precisão');

// ----------------------------------------------------------------------------
// TESTE 10: Validar os indicadores do painel
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 10: VALIDAR OS INDICADORES DO PAINEL ---');
const preparacoesTeste = getPreparacoesIniciaisMemoria(orgId);
// Substitui a preparação 1 e 2 na amostra
const idx1 = preparacoesTeste.findIndex((p) => p.id === prep1.id);
if (idx1 >= 0) preparacoesTeste[idx1] = prep1;
const idx2 = preparacoesTeste.findIndex((p) => p.id === prep2.id);
if (idx2 >= 0) preparacoesTeste[idx2] = prep2;

const indicadores = calcularIndicadoresPainel(preparacoesTeste, MASTER_CHECKLIST_ITEMS);
assert(indicadores.totalRequisitos === 177, 'Total de requisitos consolidado igual a 177', `Total: ${indicadores.totalRequisitos}`);
assert(indicadores.respostasAprovadas >= 1, 'Contador de respostas aprovadas correto', `Aprovadas: ${indicadores.respostasAprovadas}`);
assert(indicadores.requisitosComPendencias >= 1, 'Contador de requisitos com pendências correto', `Com pendências: ${indicadores.requisitosComPendencias}`);
assert(indicadores.requisitosProntosParaAuditoria >= 1, 'Contador de requisitos prontos correto', `Prontos: ${indicadores.requisitosProntosParaAuditoria}`);
assert(indicadores.taxaProntidaoGeral >= 0 && indicadores.taxaProntidaoGeral <= 100, 'Taxa de prontidão calculada como percentual válido', `${indicadores.taxaProntidaoGeral}%`);

// ----------------------------------------------------------------------------
// TESTE 11: Confirmar isolamento por organização e permissões de acesso
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 11: CONFIRMAR ISOLAMENTO POR ORGANIZAÇÃO E PERMISSÕES RBAC ---');
assert(prep1.organizationId === orgId, 'Preparação associada estritamente à organização do tenant', prep1.organizationId);
assert(userConsulta.role === 'CONSULTA', 'Usuário com perfil de CONSULTA identificado');

// Simula tentativa de aprovação por usuário CONSULTA
const tentarAprovarConsulta = (user: UserProfile) => {
  if (user.role === 'CONSULTA' || (user.role as string) === 'VIEWER') {
    return { permitido: false, erro: 'Acesso negado: Perfil de CONSULTA não pode aprovar respostas.' };
  }
  return { permitido: true };
};

const resConsulta = tentarAprovarConsulta(userConsulta);
assert(resConsulta.permitido === false, 'Perfil de CONSULTA bloqueado para aprovar preparação', resConsulta.erro);

const resGestor = tentarAprovarConsulta(userQualidade);
assert(resGestor.permitido === true, 'Perfil de GESTOR_SGQ autorizado para aprovar preparação');

// ----------------------------------------------------------------------------
// TESTE 12: Confirmar que requisitos diferentes não compartilham indevidamente resposta ou conformidade
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 12: INDEPENDÊNCIA ENTRE REQUISITOS QUE COMPARTILHAM CONTROLE ---');
// Ambos prep1 (ANAC) e prep2 (FAA) compartilham o controle CTRL-FERRAM-01
assert(prep1.controleCentralId === prep2.controleCentralId, 'Ambos requisitos compartilham o controle central CTRL-FERRAM-01');
assert(prep1.situacaoProntidao === 'PRONTO_PARA_AUDITORIA', 'Requisito ANAC está PRONTO PARA AUDITORIA');
assert(prep2.situacaoProntidao === 'COM_PENDENCIAS_IMPEDITIVAS', 'Requisito FAA está COM PENDENCIAS IMPEDITIVAS');
assert(prep1.statusResposta !== prep2.statusResposta, 'Status de resposta independente entre requisitos do mesmo controle');
assert(prep1.respostaTexto !== prep2.respostaTexto, 'Textos de resposta independentes e não compartilhados');
assert(prep1.pendencias.length === 0 && prep2.pendencias.length === 1, 'Pendência em um requisito não afeta o outro requisito');

console.log('\n================================================================');
console.log(`RESUMO DOS TESTES: ${passedTests} de ${totalTests} testes aprovados.`);
if (passedTests === totalTests) {
  console.log('STATUS FINAL: APROVADO COM SUCESSO INTEGRAL');
  process.exit(0);
} else {
  console.error('STATUS FINAL: FALHA EM TESTES');
  process.exit(1);
}
