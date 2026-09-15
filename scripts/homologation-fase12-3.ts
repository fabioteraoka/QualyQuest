import { 
  NCRecord, 
  ManualRecord, 
  FiltrosApresentacao,
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  LicaoAprendidaAuditoria,
  ColaboradorPessoa,
  CompetenciaItem,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  CursoTreinamento,
  DocumentoControlado
} from '../src/types';
import { construirRelatorioApresentacao, validarApresentacaoPPTX } from '../src/utils/qualityPresentationBuilder';
import { executarCertificacaoIntegrada } from '../src/utils/presentationConsistencyValidator';
import { SAFE_BOUNDS_WIDESCREEN } from '../src/utils/presentationGeometryValidator';

// 1. DATASET EXTREMO PARA ESTRESSE GEOMÉTRICO (FASE 12.3)
const gerarDatasetExtremo = () => {
  const records: NCRecord[] = [];
  const setores = [
    'Hangar de Manutenção de Grandes Aeronaves Turbofan',
    'Oficina Especializada em Aviônica e Navegação RNP/RNAV',
    'Ferramentaria de Precisão e Calibração de Torquímetros RBC',
    'Engenharia de Estruturas e Modificações RBAC 145/21',
    'Controle da Qualidade e Inspeção de Recebimento de Peças',
    'Ensaios Não Destrutivos (Líquido Penetrante, Eddy Current)',
    'Pintura e Tratamento de Superfícies Aeronáuticas',
    'Almoxarifado Geral e Controle de Itens com Vida Limite (Shelf Life)',
    'Logística Internacional e Desembaraço Aduaneiro de Peças AOG',
    'Segurança Operacional (SMS) e Prevenção de FOD em Pátio'
  ];

  for (let i = 1; i <= 65; i++) {
    const setor = setores[i % setores.length];
    records.push({
      id: `rnc-stress-${i}`,
      numeroNC: `RNC-2026-${String(i).padStart(3, '0')}`,
      setor,
      tipoNC: i % 3 === 0 ? 'Produto / Peça' : i % 3 === 1 ? 'Processo' : 'Documental',
      origemNC: i % 2 === 0 ? 'Auditoria Interna de Rotina no Hangar' : 'Inspeção Diária Pré-Voo',
      descricaoNC: `Desvio estrutural com texto extremamente longo contendo detalhamento minucioso de fadiga e corrosão identificado na longarina central da fuselagem número de série AF-${1000 + i}, exigindo parecer técnico imediato de engenharia aeronáutica e contenção preliminar conforme RBAC 145.`,
      statusGeral: i % 5 === 0 ? 'Aguardando Aprovação' : i % 5 === 1 ? 'Em Investigação' : i % 5 === 2 ? 'Ação em Andamento' : i % 5 === 3 ? 'Aguardando Eficácia' : 'Encerrada',
      dataIdentificacao: `2026-0${(i % 3) + 1}-10`,
      avaliacaoRiscoInicial: {
        codigo: '3C',
        severidade: String((i % 5) + 1),
        probabilidade: String(((i * 2) % 5) + 1),
        nivel: ((((i % 5) + 1) * (((i * 2) % 5) + 1)) >= 15) ? 'Crítico' : 'Médio'
      },
      ishikawa: {
        categoriaPrincipal: ['Máquina', 'Método', 'Mão de Obra', 'Medição', 'Meio Ambiente', 'Material'][i % 6],
        causaRaiz: `Causa raiz técnica e metodológica complexa associada a desgaste prematuro e ausência de calibragem de ferramental no procedimento operacional padrão número IT-QUAL-${i}`
      },
      acaoCorretiva: {
        descricao: `Plano de ação corretiva amplo englobando recolhimento de lote suspeito, treinamento dos mecânicos e revisão completa do manual de práticas padrão do fabricante`,
        responsavel: 'Eng. de Manutenção',
        status: i % 2 === 0 ? 'Concluída' : 'Em Andamento',
        dataPrazo: '2026-03-30'
      },
      verificacaoEficacia: i % 5 === 4 ? { encerrado: 'SIM', dataVerificacao: '2026-03-12', metodo: 'Documental' } : undefined,
      criadoEm: '2026-01-10T08:00:00Z',
      atualizadoEm: '2026-03-12T10:00:00Z',
    } as any);
  }

  const manuals: ManualRecord[] = [];
  for (let m = 1; m <= 15; m++) {
    manuals.push({
      id: `man-${m}`,
      codigo: `MOE-145-SEC-${m}`,
      titulo: `Manual da Organização de Manutenção Especializada com Denominação Extensa e Procedimentos Técnicos da Seção ${m}`,
      revisao: `Rev ${m}.0`,
      status: m % 4 === 0 ? 'Em Revisão' : 'Vigente',
      dataVigencia: '2025-10-01',
      dataValidade: '2026-10-01',
      criadoEm: '2025-10-01T00:00:00Z',
      atualizadoEm: '2025-10-01T00:00:00Z',
    } as any);
  }

  const trainings = [] as any[];
  for (let t = 1; t <= 30; t++) {
    trainings.push({
      id: `tr-${t}`,
      cursoId: `c-${t}`,
      colaboradorId: `colab-${t}`,
      dataConclusao: '2025-01-15',
      dataValidade: t % 3 === 0 ? '2026-01-10' : '2027-01-15',
      status: t % 3 === 0 ? 'Vencido' : 'Vigente',
      horasRealizadas: 40,
      notaAproveitamento: 95,
      criadoEm: '2025-01-15T00:00:00Z',
      atualizadoEm: '2025-01-15T00:00:00Z',
    });
  }

  const courses = [] as any[];
  for (let c = 1; c <= 20; c++) {
    courses.push({
      id: `c-${c}`,
      titulo: `Treinamento Especializado Avançado em Fatores Humanos e SGSO Módulo ${c}`,
      categoria: 'Técnico Aeronáutico',
      cargaHoraria: 40,
      periodicidadeMeses: 24,
      obrigatorioParaFuncoes: ['Inspetor Chefe', 'Mecânico de Manutenção'],
      ativo: true,
      criadoEm: '2025-01-01T00:00:00Z',
      atualizadoEm: '2025-01-01T00:00:00Z',
    });
  }

  return { records, manuals, trainings, courses };
};

const filtros: FiltrosApresentacao = {
  periodo: 'TODOS',
  tipo: 'COMPLETA',
};

async function testarHomologacaoFase12_3() {
  console.log('================================================================');
  console.log('🚀 TESTE DE HOMOLOGAÇÃO FASE 12.3: ESTABILIZAÇÃO GEOMÉTRICA & AUTO-FIT');
  console.log('   Certificação Dupla: Paridade de Dados + Integridade Visual (0 Overflow)');
  console.log('================================================================\n');

  // CENÁRIO A: ESTRESSE COM ALTO VOLUME (65 RNCs, TEXTOS LONGOS, 30 TREINAMENTOS)
  console.log('--- CENÁRIO 1: Teste de Estresse Extremo (Volume Máximo & Textos Longos) ---');
  const datasetExtremo = gerarDatasetExtremo();
  
  const apresentacaoExtrema = construirRelatorioApresentacao(
    datasetExtremo.records,
    datasetExtremo.manuals,
    [],
    [],
    filtros,
    'Aerotécnica Internacional do Brasil — Linhas Aéreas & Manutenção Pesada S.A.',
    'Eng. Chefe de Garantia da Qualidade & Auditor Master RBAC 145',
    {
      trainingRecords: datasetExtremo.trainings,
      trainingCourses: datasetExtremo.courses,
    }
  );

  console.log(`✓ Apresentação construída: ${apresentacaoExtrema.slides.length} slides.`);
  
  // Executar a Certificação Integrada
  const certExtrema = executarCertificacaoIntegrada(apresentacaoExtrema);
  console.log(`\nAuditoria Geométrica:`);
  console.log(` - Elementos auditados: ${certExtrema.relatorioVisual.totalElementosAuditados}`);
  console.log(` - Total de infrações de overflow: ${certExtrema.relatorioVisual.infracoesDetectadas.length}`);
  console.log(` - Slides com infração: ${certExtrema.relatorioVisual.slidesComInfracao}`);
  console.log(` - Densidade geral: ${certExtrema.relatorioVisual.densidadeGeral}`);
  console.log(` - Margem mínima para rodapé: ${certExtrema.relatorioVisual.margemSegurancaRodapeMinima}"`);
  console.log(` - Paridade de dados (Teste de Espelho): ${certExtrema.paridadeDados.status} (${certExtrema.paridadeDados.totalVerificacoesCruzadas} verificações)`);

  certExtrema.relatorioVisual.detalhesPorSlide.forEach(r => {
    console.log(`   [Slide ${String(r.numero).padStart(2, '0')}] Folga Rodapé: ${r.margemInferiorRodape.toFixed(2)}" | Densidade: ${r.classificacaoDensidade} | Infrações: ${r.infracoes.length}`);
  });

  if (!certExtrema.homologado || certExtrema.relatorioVisual.infracoesDetectadas.length > 0) {
    console.error('❌ FALHA NO CENÁRIO 1: Houve infração geométrica ou divergência de dados no estresse extremo!');
    process.exit(1);
  }
  console.log('\n✅ CENÁRIO 1 APROVADO: 0 Overflows, 100% dos limites seguros respeitados!');

  // CENÁRIO B: BASE ZERO / SEM DADOS
  console.log('\n--- CENÁRIO 2: Base Zero (Total Ausência de Dados / SEM DADOS) ---');
  const apresentacaoVazia = construirRelatorioApresentacao(
    [],
    [],
    [],
    [],
    filtros,
    'Hangar Experimental SGQ',
    'Auditor SGQ'
  );

  const certVazia = executarCertificacaoIntegrada(apresentacaoVazia);
  console.log(`✓ Apresentação construída: ${apresentacaoVazia.slides.length} slides.`);
  console.log(` - Elementos auditados: ${certVazia.relatorioVisual.totalElementosAuditados}`);
  console.log(` - Total de infrações: ${certVazia.relatorioVisual.infracoesDetectadas.length}`);
  console.log(` - Paridade de dados: ${certVazia.paridadeDados.status}`);

  if (!certVazia.homologado || certVazia.relatorioVisual.infracoesDetectadas.length > 0) {
    console.error('❌ FALHA NO CENÁRIO 2: Base zero gerou infrações ou NaN!');
    process.exit(1);
  }
  console.log('✅ CENÁRIO 2 APROVADO: Tratamento formal de sem dados sem quebra dimensional!');

  // CENÁRIO C: VERIFICAÇÃO DO MÉTODO validarApresentacaoPPTX
  console.log('\n--- CENÁRIO 3: Validador de Apresentação PPTX (Dupla Certificação) ---');
  const validacao = validarApresentacaoPPTX(apresentacaoExtrema);
  console.log(`✓ Validação Válida: ${validacao.valido}`);
  console.log(`✓ Conformidade: ${validacao.conformidade}`);
  console.log(`✓ Total de slides verificados: ${validacao.totalSlides}`);
  console.log(`✓ Total de verificações de espelho: ${validacao.totalVerificacoesEspelho}`);
  console.log(`✓ Total de elementos geométricos auditados: ${validacao.totalElementosVerificados}`);

  if (!validacao.valido || !validacao.testeEspelhoAprovado) {
    console.error('❌ FALHA NO CENÁRIO 3: Dupla certificação falhou!');
    process.exit(1);
  }
  console.log('✅ CENÁRIO 3 APROVADO: Dupla Certificação 100% Homologada!');

  console.log('\n================================================================');
  console.log('🏆 HOMOLOGAÇÃO FASE 12.3 CONCLUÍDA COM SUCESSO TOTAL!');
  console.log('   - 0 Overflows em todas as condições testadas');
  console.log('   - Safe Bounds Widescreen (16:9) rigorosamente atendidas');
  console.log('   - Margem para rodapé ≥ 0.20" em 100% dos slides');
  console.log('   - Paridade de dados Web/PPTX SSoT 100% fidedigna');
  console.log('================================================================\n');
}

testarHomologacaoFase12_3().catch(err => {
  console.error('Erro inesperado no teste de homologação:', err);
  process.exit(1);
});
