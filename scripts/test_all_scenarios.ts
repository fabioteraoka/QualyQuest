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
import { construirRelatorioApresentacao, exportarApresentacaoPPTX } from '../src/utils/qualityPresentationBuilder';
import { INITIAL_RECORDS } from '../src/data/initialRecords';
import { INITIAL_MANUALS } from '../src/data/initialManuals';
import { INITIAL_EXTERNAL_AUDITS, INITIAL_AUDIT_FINDINGS, INITIAL_AUDIT_LESSONS } from '../src/data/initialAudits';
import { INITIAL_COMPETENCIES, INITIAL_PERSON_COMPETENCIES, INITIAL_QUALIFICATIONS, INITIAL_TRAINING_RECORDS, INITIAL_TRAINING_COURSES, INITIAL_PERSON_DOCUMENTS } from '../src/data/initialCompetenciesData';
import { INITIAL_DOCUMENTOS_CONTROLADOS } from '../src/data/initialDocumentControl';
import { execSync } from 'child_process';

const filtros: FiltrosApresentacao = {
  periodo: 'TODOS',
  tipo: 'COMPLETA',
};

async function runScenario(name: string, filename: string, builderFn: () => any) {
  console.log(`\n==================================================`);
  console.log(`🧪 EXECUTANDO CENÁRIO: ${name}`);
  console.log(`==================================================`);
  const rel = builderFn();
  await exportarApresentacaoPPTX(rel, filename);
  console.log(`Arquivo salvo: ${filename} (${rel.slides.length} slides)`);

  const cmd = `python3 scripts/analyze_pptx.py ${filename}`;
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log(out);
    return true;
  } catch (err: any) {
    console.error(err.stdout || err.message);
    return false;
  }
}

async function main() {
  let allPass = true;

  // 1. CONTEÚDO NORMAL
  const pass1 = await runScenario('1. CONTEÚDO NORMAL (Dados Homologados)', 'pptx_1_normal.pptx', () => {
    return construirRelatorioApresentacao(
      INITIAL_RECORDS,
      INITIAL_MANUALS,
      [],
      [],
      filtros,
      'Impacto Aviation MRO',
      'Eng. Chefe SGQ & Auditoria',
      {
        externalAudits: INITIAL_EXTERNAL_AUDITS,
        auditFindings: INITIAL_AUDIT_FINDINGS,
        auditLessons: INITIAL_AUDIT_LESSONS,
        competencies: INITIAL_COMPETENCIES,
        personCompetencies: INITIAL_PERSON_COMPETENCIES,
        qualifications: INITIAL_QUALIFICATIONS,
        trainingRecords: INITIAL_TRAINING_RECORDS,
        trainingCourses: INITIAL_TRAINING_COURSES,
        personDocuments: INITIAL_PERSON_DOCUMENTS,
        documentosControlados: INITIAL_DOCUMENTOS_CONTROLADOS,
      }
    );
  });
  if (!pass1) allPass = false;

  // 2. TEXTOS LONGOS (Títulos longos, descrições longas, notas longas)
  const pass2 = await runScenario('2. TEXTOS LONGOS (Títulos, descrições e pareceres hiper-extensos)', 'pptx_2_long_texts.pptx', () => {
    const longRecords: NCRecord[] = INITIAL_RECORDS.map((r, i) => ({
      ...r,
      titulo: `Não Conformidade Crítica Extensa Identificada em Auditoria Especializada de Verificação de Procedimentos de Manutenção e Calibração #${i + 1}`,
      setor: `Superintendência de Engenharia de Manutenção Pesada e Oficinas de Componentes Especiais Subordinada #${i + 1}`,
      descricaoNC: `Durante a inspeção minuciosa e aprofundada da estrutura primária da aeronave e respectivos sistemas eletroeletrônicos e de aviônica avançada, foram constatadas discrepâncias sistêmicas recorrentes entre as orientações prescritas nos manuais de manutenção do fabricante (CMM/AMM) e as ordens de serviço executadas na bancada de ensaios número ${i + 1}, evidenciando falha nos mecanismos de barreira preventiva e necessitando reavaliação completa de processos.`,
      acaoCorretiva: {
        descricao: `Elaboração e implementação urgente de plano de ação corretiva abrangente, compreendendo a revisão integral dos procedimentos operacionais padrão (POP-QUAL-${i + 1}), treinamento formal de reciclagem obrigatório para 100% do corpo técnico de mecânicos e inspetores, aquisição de novas bancadas de calibração certificadas RBC e auditoria de acompanhamento quinzenal.`,
        responsavel: `Engenheiro Coordenador de Garantia da Qualidade e Segurança Operacional Nominal #${i + 1}`,
        status: 'Em Andamento',
        dataPrazo: '2026-12-31'
      }
    }));

    return construirRelatorioApresentacao(
      longRecords,
      INITIAL_MANUALS.map(m => ({
        ...m,
        titulo: `Manual de Organização de Manutenção Especializada com Denominação Extensa e Procedimentos Técnicos da Seção Primária de Qualidade Aeronáutica ${m.codigo}`
      })),
      [],
      [],
      filtros,
      'Impacto Aviation MRO — Empresa Brasileira de Manutenção de Aeronaves e Componentes de Alta Tecnologia S.A.',
      'Diretoria Executiva de Garantia da Qualidade, Segurança Operacional e Compliance Regulatório Aeronáutico',
      {
        externalAudits: INITIAL_EXTERNAL_AUDITS,
        auditFindings: INITIAL_AUDIT_FINDINGS,
        documentosControlados: INITIAL_DOCUMENTOS_CONTROLADOS,
      }
    );
  });
  if (!pass2) allPass = false;

  // 3. MUITAS LINHAS EM TABELAS (15+ manuais, 20+ treinamentos, 15+ auditorias)
  const pass3 = await runScenario('3. MUITAS LINHAS EM TABELAS (Tabelas com 25+ itens)', 'pptx_3_many_rows.pptx', () => {
    const manyManuals: ManualRecord[] = [];
    for (let i = 1; i <= 30; i++) {
      manyManuals.push({
        id: `man-extra-${i}`,
        codigo: `MAN-DOC-145-${String(i).padStart(3, '0')}`,
        titulo: `Procedimento Geral de Manutenção Aeronáutica e Controle de Ferramentas Seção #${i}`,
        revisao: `Rev ${i % 5}.0`,
        status: i % 3 === 0 ? 'Em Revisão' : 'Vigente',
        dataVigencia: '2025-01-01',
        dataValidade: '2026-12-31',
        criadoEm: '2025-01-01T00:00:00Z',
        atualizadoEm: '2025-01-01T00:00:00Z',
      } as any);
    }

    const manyTrainings: any[] = [];
    for (let t = 1; t <= 40; t++) {
      manyTrainings.push({
        id: `tr-extra-${t}`,
        organizationId: 'org-impacto',
        treinamentoId: `c-${(t % 5) + 1}`,
        treinamentoCodigo: `CUR-${(t % 5) + 1}`,
        treinamentoTitulo: `Curso Técnico ${(t % 5) + 1}`,
        colaboradorId: `colab-${(t % 8) + 1}`,
        colaboradorNome: `Colaborador ${(t % 8) + 1}`,
        colaboradorMatricula: `MAT-${1000 + t}`,
        dataRealizacao: '2025-05-10',
        dataValidade: t % 4 === 0 ? '2025-12-31' : '2027-05-10',
        cargaHoraria: 40,
        instrutor: 'Instrutor Master',
        resultado: 'Aprovado',
        aproveitamentoPercentual: 90,
      });
    }

    return construirRelatorioApresentacao(
      INITIAL_RECORDS,
      manyManuals,
      [],
      [],
      filtros,
      'Impacto Aviation MRO',
      'Auditor SGQ',
      {
        trainingRecords: manyTrainings,
        trainingCourses: INITIAL_TRAINING_COURSES,
        documentosControlados: INITIAL_DOCUMENTOS_CONTROLADOS,
      }
    );
  });
  if (!pass3) allPass = false;

  // 4. MUITOS RNCs (80 RNCs)
  const pass4 = await runScenario('4. MUITOS RNCs (Alto volume de ocorrências)', 'pptx_4_many_rncs.pptx', () => {
    const manyRncs: NCRecord[] = [];
    for (let i = 1; i <= 80; i++) {
      const template = INITIAL_RECORDS[i % INITIAL_RECORDS.length];
      manyRncs.push({
        ...template,
        id: `rnc-vol-${i}`,
        numeroNC: `RNC-VOL-${String(i).padStart(3, '0')}`,
        titulo: `Desvio de processo operacional #${i}`,
        statusGeral: i % 4 === 0 ? 'Encerrada' : i % 4 === 1 ? 'Ação em Andamento' : 'Em Investigação',
      });
    }

    return construirRelatorioApresentacao(
      manyRncs,
      INITIAL_MANUALS,
      [],
      [],
      filtros,
      'Impacto Aviation MRO',
      'Auditor SGQ'
    );
  });
  if (!pass4) allPass = false;

  // 5. AUSÊNCIA DE DADOS (Base Zero)
  const pass5 = await runScenario('5. AUSÊNCIA DE DADOS (Base Zero / Sem Dados)', 'pptx_5_empty_data.pptx', () => {
    return construirRelatorioApresentacao(
      [],
      [],
      [],
      [],
      filtros,
      'Nova Empresa Hangar SGQ',
      'Auditor em Treinamento',
      {
        externalAudits: [],
        auditFindings: [],
        auditLessons: [],
        competencies: [],
        personCompetencies: [],
        qualifications: [],
        trainingRecords: [],
        trainingCourses: [],
        personDocuments: [],
        documentosControlados: [],
      }
    );
  });
  if (!pass5) allPass = false;

  console.log(`\n==================================================`);
  if (allPass) {
    console.log(`🏆 TODOS OS 5 CENÁRIOS PASSARAM NO TESTE DO PPTX REAL!`);
  } else {
    console.log(`❌ UM OU MAIS CENÁRIOS APRESENTARAM INFRAÇÃO GEOMÉTRICA!`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
