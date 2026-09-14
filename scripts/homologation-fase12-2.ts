import { NCRecord, ManualRecord, FiltrosApresentacao } from '../src/types';
import { construirRelatorioApresentacao } from '../src/utils/qualityPresentationBuilder';
import { executarTesteEspelho } from '../src/utils/presentationConsistencyValidator';

const mockRecords: NCRecord[] = [
  {
    id: 'rnc-001',
    numeroNC: 'RNC-2026-001',
    setor: 'Hangar',
    tipoNC: 'Produto / Peça',
    origemNC: 'Auditoria Interna',
    descricaoNC: 'Trinca identificada na longarina esquerda durante inspeção de 100h',
    statusGeral: 'Encerrada',
    dataIdentificacao: '2026-02-10',
    avaliacaoRiscoInicial: { severidade: 5, probabilidade: 3, nivel: 'Crítico' },
    ishikawa: { categoriaPrincipal: 'Máquina', causaRaiz: 'Fadiga prematura do material' },
    acaoCorretiva: { descricao: 'Substituição do componente e reforço estrutural', status: 'Concluída', dataPrazo: '2026-02-20' },
    verificacaoEficacia: { encerrado: 'SIM', dataVerificacao: '2026-03-01' },
    criadoEm: '2026-02-10T08:00:00Z',
    atualizadoEm: '2026-03-01T10:00:00Z',
  },
  {
    id: 'rnc-002',
    numeroNC: 'RNC-2026-002',
    setor: 'Aviônica',
    tipoNC: 'Processo',
    origemNC: 'Operação de Voo',
    descricaoNC: 'Erro intermitente no barramento ARINC 429 durante teste de bancada',
    statusGeral: 'Ação em Andamento',
    dataIdentificacao: '2026-02-15',
    avaliacaoRiscoInicial: { severidade: 4, probabilidade: 2, nivel: 'Alto' },
    ishikawa: { categoriaPrincipal: 'Método', causaRaiz: 'Procedimento de teste com impedância incorreta' },
    acaoCorretiva: { descricao: 'Revisão da instrução de trabalho IT-AV-012', status: 'Em Andamento', dataPrazo: '2026-03-25' },
    criadoEm: '2026-02-15T09:00:00Z',
    atualizadoEm: '2026-02-15T09:00:00Z',
  },
  {
    id: 'rnc-003',
    numeroNC: 'RNC-2026-003',
    setor: 'Ferramentaria',
    tipoNC: 'Equipamento',
    origemNC: 'Inspeção de Rotina',
    descricaoNC: 'Torquímetro com calibração vencida em uso no setor de montagem de motores',
    statusGeral: 'Encerrada',
    dataIdentificacao: '2026-01-20',
    avaliacaoRiscoInicial: { severidade: 4, probabilidade: 3, nivel: 'Alto' },
    ishikawa: { categoriaPrincipal: 'Medição', causaRaiz: 'Falha no alerta de calibração periódica' },
    acaoCorretiva: { descricao: 'Envio para laboratório acreditado RBC e recalibração', status: 'Concluída', dataPrazo: '2026-01-25' },
    verificacaoEficacia: { encerrado: 'SIM', dataVerificacao: '2026-02-05' },
    criadoEm: '2026-01-20T10:00:00Z',
    atualizadoEm: '2026-02-05T14:00:00Z',
  },
  {
    id: 'rnc-004',
    numeroNC: 'RNC-2026-004',
    setor: 'Engenharia',
    tipoNC: 'Documental',
    origemNC: 'Auditoria Externa',
    descricaoNC: 'Revisão do manual de manutenção (AMM) desatualizada na bancada técnica',
    statusGeral: 'Encerrada',
    dataIdentificacao: '2026-01-15',
    avaliacaoRiscoInicial: { severidade: 3, probabilidade: 2, nivel: 'Médio' },
    ishikawa: { categoriaPrincipal: 'Método', causaRaiz: 'Atraso na distribuição controlada de manuais' },
    acaoCorretiva: { descricao: 'Distribuição digital sincronizada e recolhimento de cópias físicas', status: 'Concluída', dataPrazo: '2026-01-22' },
    verificacaoEficacia: { encerrado: 'SIM', dataVerificacao: '2026-02-10' },
    criadoEm: '2026-01-15T11:00:00Z',
    atualizadoEm: '2026-02-10T16:00:00Z',
  }
];

const mockManuals: ManualRecord[] = [
  {
    id: 'man-01',
    codigo: 'MOE-145',
    titulo: 'Manual da Organização de Manutenção',
    versao: 'Rev 14',
    status: 'Vigente',
    dataPublicacao: '2025-11-01',
    dataValidade: '2026-11-01',
    criadoEm: '2025-11-01T00:00:00Z',
    atualizadoEm: '2025-11-01T00:00:00Z',
  }
];

const filtros: FiltrosApresentacao = {
  periodo: 'TODOS',
  tipo: 'COMPLETA',
};

async function testarHomologacaoFase12_2() {
  console.log('=== TESTE DE HOMOLOGAÇÃO - FASE 12.2: ESPELHO EXECUTIVO SGQ ===');

  // 1. Cenário com Dados Reais
  console.log('\n--- CENÁRIO 1: Geração com Dados Cadastrados ---');
  const apresentacao = construirRelatorioApresentacao(
    mockRecords,
    mockManuals,
    [],
    [],
    filtros,
    'AeroTech Manutenção Aeronáutica Ltda',
    'Auditoria SGQ / Gestão da Qualidade'
  );

  console.log(`Total de Slides Gerados: ${apresentacao.slides.length}`);
  if (apresentacao.slides.length !== 20) {
    throw new Error(`Esperado 20 slides, obtido ${apresentacao.slides.length}`);
  }

  const resEspelho = executarTesteEspelho(apresentacao);
  console.log(`Teste de Espelho Aprovado: ${resEspelho.aprovado}`);
  console.log(`Total de Verificações Cruzadas: ${resEspelho.totalVerificacoesCruzadas}`);
  console.log(`Divergências Detectadas: ${resEspelho.divergenciasDetectadas.length}`);

  if (!resEspelho.aprovado) {
    console.error('Falhas encontradas no Teste de Espelho:');
    resEspelho.divergenciasDetectadas.forEach(d => console.error(` - ${d}`));
    process.exit(1);
  }

  // 2. Cenário sem Dados (Zero registros)
  console.log('\n--- CENÁRIO 2: Geração com Zero Registros (Teste de Dados Insuficientes) ---');
  const apresentacaoVazia = construirRelatorioApresentacao(
    [],
    [],
    [],
    [],
    filtros,
    'Empresa Nova SGQ',
    'Gestor SGQ'
  );

  const resEspelhoVazio = executarTesteEspelho(apresentacaoVazia);
  console.log(`Teste de Espelho (Base Limpa) Aprovado: ${resEspelhoVazio.aprovado}`);
  console.log(`Total de Verificações: ${resEspelhoVazio.totalVerificacoesCruzadas}`);
  console.log(`Divergências: ${resEspelhoVazio.divergenciasDetectadas.length}`);

  if (!resEspelhoVazio.aprovado) {
    console.error('Falhas no Teste de Espelho sem dados:');
    resEspelhoVazio.divergenciasDetectadas.forEach(d => console.error(` - ${d}`));
    process.exit(1);
  }

  console.log('\n✅ TODOS OS TESTES DA FASE 12.2 FORAM APROVADOS COM 100% DE SUCESSO!');
  console.log('Regra de Ouro garantida: Única Fonte da Verdade (SSoT) entre Web Viewer e PPTX.');
}

testarHomologacaoFase12_2().catch(err => {
  console.error('Erro fatal no teste de homologação:', err);
  process.exit(1);
});
