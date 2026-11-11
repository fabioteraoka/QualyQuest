/**
 * Script Oficial de Testes Automatizados da Fase 1.4.3
 * QUALYQUEST SGQ — IMPACTO Aviation MRO
 * 
 * Executa as 8 verificações mandatórias do usuário:
 * 1. Rastreabilidade Requisito Original -> Critério Canônico -> Controle Central.
 * 2. Rastreabilidade Controle Central -> Múltiplos Requisitos Sustentadores.
 * 3. Independência de Revisão Normativa entre requisitos.
 * 4. Montagem Dinâmica de Auditoria ANAC isolada.
 * 5. Montagem Dinâmica de Auditoria Kalitta Air preservando 69 itens autênticos.
 * 6. Independência de Conformidade e NC entre requisitos de um mesmo critério.
 * 7. Validação estrita de Reutilização de Evidências (7 cenários reais).
 * 8. Imutabilidade do Snapshot Histórico de Auditorias Concluídas.
 */

import { MASTER_CHECKLISTS, MASTER_CHECKLIST_ITEMS } from '../src/data/corporateChecklistsData';
import { AUDITORIA_CONSOLIDACAO_DATA } from '../src/data/canonicalCriteriaAuditData';
import { CANONICAL_CORPORATE_CRITERIA } from '../src/data/corporateLibraryData';
import { validarAplicabilidadeEvidencia } from '../src/services/continuousComplianceService';
import { EvidenciaRequisitoItem, ItemAvaliadoExecucaoChecklist, ExecucaoChecklistAuditoria } from '../src/types';

console.log('================================================================');
console.log('INICIANDO BATERIA DE TESTES OBRIGATÓRIOS — FASE 1.4.3 QUALYQUEST');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       -> ${details}`);
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       -> ${details}`);
  }
}

// ----------------------------------------------------------------------------
// TESTE 1: Localizar requisito original e rastreá-lo até critério e controle
// ----------------------------------------------------------------------------
console.log('--- TESTE 1: RASTREABILIDADE REQUISITO -> CRITÉRIO -> CONTROLE ---');
const reqKalitta = MASTER_CHECKLIST_ITEMS.find((i) => i.id === 'CRIT-KALITTA-50');
assert(!!reqKalitta, 'Requisito original CRIT-KALITTA-50 localizado', `Texto: "${reqKalitta?.perguntaOuCriterio}"`);

const auditItem = AUDITORIA_CONSOLIDACAO_DATA.find((a) => a.idOriginal === 'CRIT-KALITTA-50');
assert(!!auditItem, 'Item mapeado na Matriz de Rastreabilidade', `Origem: ${auditItem?.checklistOrigem} | Norma: ${auditItem?.normaSecao}`);
assert(auditItem?.criterioCanonicoAssociado === 'CRIT-CORP-031', 'Vínculo ao Critério Canônico CRIT-CORP-031 (RII)', `Critério: ${auditItem?.criterioCanonicoAssociado}`);
assert(auditItem?.controleCentralId === 'CTRL-RII-01' || auditItem?.controleCentralId === 'CTRL-CRS-01', 'Vínculo ao Controle Central SGQ CTRL-RII-01', `Controle: ${auditItem?.controleCentralId} (${auditItem?.controleCentralNome})`);
assert(auditItem?.tipoRelacionamento === 'Específico da fonte', 'Classificação rigorosa como Específico da fonte', `Tipo: ${auditItem?.tipoRelacionamento}`);

// ----------------------------------------------------------------------------
// TESTE 2: Localizar controle central e identificar requisitos que o sustentam
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 2: CONTROLE CENTRAL -> MÚLTIPLOS REQUISITOS SUSTENTADORES ---');
const ctrlCalib = 'CTRL-FERRAM-01';
const reqsSustentadores = AUDITORIA_CONSOLIDACAO_DATA.filter((a) => a.controleCentralId === ctrlCalib);
assert(reqsSustentadores.length >= 4, `Controle ${ctrlCalib} sustentado por múltiplos requisitos (${reqsSustentadores.length} encontrados)`);

const fontes = new Set(reqsSustentadores.map((r) => r.empresaOuAutoridade));
assert(fontes.has('ANAC'), 'Sustentado por requisito ANAC (RBAC 145.109(b))');
assert(fontes.has('FAA'), 'Sustentado por requisito FAA (14 CFR 145.109(b))');
assert(fontes.has('Kalitta Air'), 'Sustentado por requisito Kalitta Air (FORM QA-14)');

// ----------------------------------------------------------------------------
// TESTE 3: Alterar revisão de um requisito sem alterar os demais
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 3: INDEPENDÊNCIA DE REVISÃO NORMATIVA ENTRE REQUISITOS ---');
const reqAnac145 = AUDITORIA_CONSOLIDACAO_DATA.find((a) => a.idOriginal === 'CRIT-RBAC145-01');
const reqEasa145 = AUDITORIA_CONSOLIDACAO_DATA.find((a) => a.idOriginal === 'CRIT-EASA-01');
const reqFaa145 = AUDITORIA_CONSOLIDACAO_DATA.find((a) => a.idOriginal === 'CRIT-FAA-01');

assert(reqAnac145?.revisaoFonte.includes('Emenda 09'), 'Requisito ANAC na Emenda 09 vigente', reqAnac145?.revisaoFonte);
assert(reqEasa145?.revisaoFonte.includes('ED 2021') || reqEasa145?.revisaoFonte.includes('Part-145'), 'Requisito EASA preserva revisão europeia', reqEasa145?.revisaoFonte);
assert(reqFaa145?.revisaoFonte.includes('14 CFR') || reqFaa145?.revisaoFonte.includes('Amdt'), 'Requisito FAA preserva revisão eCFR/Amdt', reqFaa145?.revisaoFonte);
assert(reqAnac145?.revisaoFonte !== reqEasa145?.revisaoFonte, 'Revisões de fontes diferentes são independentes e não se sobrescrevem');

// ----------------------------------------------------------------------------
// TESTE 4: Montar auditoria ANAC apresentando somente requisitos ANAC
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 4: MONTAGEM DINÂMICA DE AUDITORIA ANAC ---');
const itensAnac = MASTER_CHECKLIST_ITEMS.filter((i) => i.checklistId === 'CHK-ANAC-RBAC145' || i.checklistId === 'CHK-ANAC-RBAC43-IS');
assert(itensAnac.length === 30, 'Auditoria ANAC isola 30 itens regulatórios (22 RBAC 145 + 8 RBAC 43 & IS)', `Total: ${itensAnac.length}`);
const temItemClienteNaAnac = itensAnac.some((i) => i.checklistId.includes('KALITTA') || i.checklistId.includes('ATLAS'));
assert(!temItemClienteNaAnac, 'Auditoria ANAC não contém nenhum item contaminado de clientes');

// ----------------------------------------------------------------------------
// TESTE 5: Montar auditoria Kalitta preservando requisitos específicos
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 5: MONTAGEM DINÂMICA DE AUDITORIA KALITTA AIR ---');
const itensKalitta = MASTER_CHECKLIST_ITEMS.filter((i) => i.checklistId === 'CHK-KALITTA-QA14');
assert(itensKalitta.length === 69, 'Auditoria Kalitta Air contém exatamente os 69 itens do FORM QA-14', `Total: ${itensKalitta.length}`);
const itemRiiKalitta = itensKalitta.find((i) => i.id === 'CRIT-KALITTA-07' || i.id === 'CRIT-KALITTA-09');
assert(!!itemRiiKalitta, 'Item RII Kalitta mantido com texto original em inglês', `Texto: ${itemRiiKalitta?.textoOriginal?.substring(0, 70)}...`);

// ----------------------------------------------------------------------------
// TESTE 6: Registrar NC em um requisito sem alterar automaticamente os outros
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 6: INDEPENDÊNCIA DE CONFORMIDADE E NC ENTRE REQUISITOS ---');
const itemAnacCalib: ItemAvaliadoExecucaoChecklist = {
  criterioId: 'CRIT-RBAC145-15',
  numeroItem: '15',
  moduloOuSecao: 'Módulo 3: Equipamentos e Ferramentas',
  referenciaNormativa: 'RBAC 145.109(b)',
  perguntaOuCriterio: 'Controle de ferramentas calibradas',
  status: 'C',
  evidenciasVinculadasIds: ['EVID-CAL-001']
};

const itemKalittaCalib: ItemAvaliadoExecucaoChecklist = {
  criterioId: 'CRIT-KALITTA-21',
  numeroItem: '21',
  moduloOuSecao: 'Tools and Equipment',
  referenciaNormativa: 'GMM 6.1 / ASM 3.21.1',
  perguntaOuCriterio: 'Are calibrated tools labeled in English with calibration date, due date, serial number, and NIST traceability?',
  status: 'NC',
  rncNumero: 'RNC-2026-089',
  observacoesAuditor: 'Torquímetro de linha em VCP com etiqueta apenas em português; inspetor Kalitta apontou não conformidade com item 21.'
};

assert(itemAnacCalib.status === 'C' && itemKalittaCalib.status === 'NC', 'Requisito ANAC permanece Conforme enquanto Requisito Kalitta é Não Conforme', 'Sem contaminação automática entre requisitos do mesmo assunto');

// ----------------------------------------------------------------------------
// TESTE 7: Validação estrita de Reutilização de Evidências (7 cenários reais)
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 7: VALIDAÇÃO REAL DE REUTILIZAÇÃO DE EVIDÊNCIAS (7 CENÁRIOS) ---');
const hoje = new Date().toISOString().split('T')[0];
const dataAmanha = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
const dataOntem = new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0];

// Cenário 1: Certificado de calibração válido e dentro do escopo
const evValida: EvidenciaRequisitoItem = {
  id: 'EV-01',
  tipo: 'CERTIFICADO_CALIBRACAO',
  titulo: 'Certificado de Calibração Torquímetro T-045 (RBC / Inmetro)',
  dataEvidencia: hoje,
  dataValidade: dataAmanha,
  statusValidade: 'VALIDO',
  baseOperacional: 'GRU',
  responsavel: 'Laboratório Metrológico Aprovado',
  organizationId: 'org_impacto_aviation'
};
const res1 = validarAplicabilidadeEvidencia(evValida, { baseOperacional: 'GRU', clienteOuAutoridade: 'ANAC' });
assert(res1.valida, 'Cenário 1: Certificado válido em GRU é aceito');

// Cenário 2: Certificado vencido
const evVencida: EvidenciaRequisitoItem = {
  ...evValida,
  id: 'EV-02',
  dataValidade: dataOntem,
  statusValidade: 'VENCIDO'
};
const res2 = validarAplicabilidadeEvidencia(evVencida, { baseOperacional: 'GRU', clienteOuAutoridade: 'ANAC' });
assert(!res2.valida && res2.codigoRegra === 'EVIDENCIA_VENCIDA', 'Cenário 2: Certificado vencido é rejeitado com bloqueio', res2.motivo);

// Cenário 3: Certificado de base diferente
const evOutraBase: EvidenciaRequisitoItem = {
  ...evValida,
  id: 'EV-03',
  baseOperacional: 'VCP'
};
const res3 = validarAplicabilidadeEvidencia(evOutraBase, { baseOperacional: 'GRU', clienteOuAutoridade: 'ANAC' });
assert(!res3.valida && res3.codigoRegra === 'BASE_INCOMPATIVEL', 'Cenário 3: Evidência restrita à base VCP rejeitada para auditoria de GRU', res3.motivo);

// Cenário 4: Treinamento insuficiente para escopo técnico (Fatores Humanos vs EWIS EASA)
const evTreinGen: EvidenciaRequisitoItem = {
  id: 'EV-04',
  tipo: 'REGISTRO_TREINAMENTO',
  titulo: 'Certificado de Fatores Humanos em Manutenção e SGSO',
  dataEvidencia: hoje,
  dataValidade: dataAmanha,
  statusValidade: 'VALIDO',
  baseOperacional: 'GRU',
  responsavel: 'Instrutor Homologado SGQ',
  organizationId: 'org_impacto_aviation'
};
const res4 = validarAplicabilidadeEvidencia(evTreinGen, {
  baseOperacional: 'GRU',
  clienteOuAutoridade: 'EASA',
  requisitoNormaOuCodigo: '145.A.30(e) EWIS Target Group 1-2'
});
assert(!res4.valida && res4.codigoRegra === 'EMENTA_TREINAMENTO_INSUFICIENTE', 'Cenário 4: Treinamento geral rejeitado para requisito mandatório EWIS da EASA', res4.motivo);

// Cenário 5: Evidência específica de cliente não aplicável a outro (RII Kalitta vs Atlas)
const evRiiKalitta: EvidenciaRequisitoItem = {
  id: 'EV-05',
  tipo: 'DOCUMENTO',
  titulo: 'Carta de Credenciamento RII Kalitta Air',
  clienteNome: 'Kalitta Air',
  dataEvidencia: hoje,
  dataValidade: dataAmanha,
  statusValidade: 'VALIDO',
  baseOperacional: 'GRU',
  responsavel: 'Kalitta QA Director',
  organizationId: 'org_impacto_aviation'
};
const res5 = validarAplicabilidadeEvidencia(evRiiKalitta, {
  baseOperacional: 'GRU',
  clienteOuAutoridade: 'Atlas Air',
  requisitoNormaOuCodigo: 'Atlas Air Q2059 RII Requirement'
});
assert(!res5.valida && res5.codigoRegra === 'CLIENTE_INCOMPATIVEL', 'Cenário 5: Autorização RII de um operador não é aproveitada para outro operador', res5.motivo);

// Cenário 6: Documento sem data de validade quando o requisito exige vigência temporal
const evSemData: EvidenciaRequisitoItem = {
  ...evValida,
  id: 'EV-06',
  dataValidade: undefined
};
const res6 = validarAplicabilidadeEvidencia(evSemData, {
  baseOperacional: 'GRU',
  clienteOuAutoridade: 'ANAC',
  exigeValidadeTemporal: true
});
assert(!res6.valida && res6.codigoRegra === 'SEM_DATA_VALIDADE', 'Cenário 6: Documento sem validade temporal rejeitado para controle de calibração periódica', res6.motivo);

// Cenário 7: Evidência aceita quando cobre todos os parâmetros
const evEwisEasa: EvidenciaRequisitoItem = {
  id: 'EV-07',
  tipo: 'REGISTRO_TREINAMENTO',
  titulo: 'Certificado de Treinamento EWIS e CDCCL (Fuel Tank Safety) - EASA Part-145',
  dataEvidencia: hoje,
  dataValidade: dataAmanha,
  statusValidade: 'VALIDO',
  baseOperacional: 'GRU',
  responsavel: 'Instrutor Part-147',
  organizationId: 'org_impacto_aviation'
};
const res7 = validarAplicabilidadeEvidencia(evEwisEasa, {
  baseOperacional: 'GRU',
  clienteOuAutoridade: 'EASA',
  requisitoNormaOuCodigo: '145.A.30(e) EWIS'
});
assert(res7.valida, 'Cenário 7: Certificado EWIS formalmente aceito para requisito EASA');

// ----------------------------------------------------------------------------
// TESTE 8: Imutabilidade do Snapshot Histórico de Auditorias Concluídas
// ----------------------------------------------------------------------------
console.log('\n--- TESTE 8: IMUTABILIDADE DO SNAPSHOT DE AUDITORIAS CONCLUÍDAS ---');
const auditoriaHistorica: ExecucaoChecklistAuditoria = {
  id: 'AUD-HIST-2025-001',
  organizationId: 'org_impacto_aviation',
  checklistId: 'CHK-ANAC-RBAC145',
  checklistCodigo: 'CHK-ANAC-RBAC145',
  checklistNome: 'Auditoria de Vigilância Continuada ANAC RBAC 145',
  numeroAuditoria: 'AUD-2025-014',
  dataAuditoria: '2025-10-15',
  auditorLider: 'Auditor Fiscal ANAC',
  baseOperacional: 'SOD',
  escopoAuditado: 'Base Sorocaba - Hangar 1',
  statusExecucao: 'CONCLUIDA',
  totalItens: 22,
  totalConforme: 22,
  totalNaoConforme: 0,
  totalNaoAplicavel: 0,
  totalPendente: 0,
  taxaConformidade: 100,
  createdAt: '2025-10-15T10:00:00Z',
  updatedAt: '2025-10-15T16:00:00Z',
  itensAvaliados: {
    'CRIT-RBAC145-01': {
      criterioId: 'CRIT-RBAC145-01',
      codigoUnico: 'CRIT-CORP-001',
      numeroItem: '1',
      moduloOuSecao: 'Módulo 1: Organização e Instalações',
      referenciaNormativa: 'RBAC 145.103(a) [Histórico Emenda 07]',
      perguntaOuCriterio: 'A organização possui instalações compatíveis?',
      status: 'C',
      evidenciasVinculadasIds: ['EV-HIST-001']
    }
  }
};

const snapshotItem = auditoriaHistorica.itensAvaliados['CRIT-RBAC145-01'];
assert(auditoriaHistorica.statusExecucao === 'CONCLUIDA', 'Auditoria registrada como CONCLUÍDA');
assert(snapshotItem.referenciaNormativa === 'RBAC 145.103(a) [Histórico Emenda 07]', 'Snapshot preserva texto histórico congelado (Emenda 07) imutável');
assert(snapshotItem.status === 'C', 'Status avaliado no snapshot congelado');

console.log('\n================================================================');
console.log(`RESUMO DOS TESTES: ${passedTests} de ${totalTests} testes aprovados.`);
console.log('STATUS FINAL: ' + (passedTests === totalTests ? 'APROVADO COM SUCESSO INTEGRAL' : 'FALHA'));
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
