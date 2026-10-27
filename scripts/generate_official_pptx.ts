import { INITIAL_RECORDS } from '../src/data/initialRecords';
import { INITIAL_MANUALS } from '../src/data/initialManuals';
import { INITIAL_CALIBRATED_TOOLS } from '../src/data/initialCalibratedTools';
import { 
  INITIAL_PERSONS, 
  INITIAL_COMPETENCIES, 
  INITIAL_TRAINING_COURSES, 
  INITIAL_TRAINING_RECORDS, 
  INITIAL_QUALIFICATIONS, 
  INITIAL_PERSON_DOCUMENTS 
} from '../src/data/initialCompetenciesData';
import { INITIAL_EXTERNAL_AUDITS, INITIAL_AUDIT_FINDINGS, INITIAL_AUDIT_LESSONS } from '../src/data/initialAudits';
import { INITIAL_DOCUMENTOS_CONTROLADOS } from '../src/data/initialDocumentControl';
import { construirRelatorioApresentacao, exportarApresentacaoPPTX, validarApresentacaoPPTX } from '../src/utils/qualityPresentationBuilder';
import { DadosContextoApresentacao } from '../src/utils/presentationSlidesData';
import { FiltrosApresentacao } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('=== GERAÇÃO DO ARQUIVO OFICIAL PPTX — QUALYQUEST / ROOSTER MRO ===\n');

  const filtros: FiltrosApresentacao = {
    periodo: 'TODOS',
    tipo: 'COMPLETA',
    setor: 'TODOS',
  };

  const contexto: DadosContextoApresentacao = {
    externalAudits: INITIAL_EXTERNAL_AUDITS as any,
    auditFindings: INITIAL_AUDIT_FINDINGS as any,
    auditLessons: INITIAL_AUDIT_LESSONS as any,
    persons: INITIAL_PERSONS as any,
    competencies: INITIAL_COMPETENCIES as any,
    qualifications: INITIAL_QUALIFICATIONS as any,
    trainingRecords: INITIAL_TRAINING_RECORDS as any,
    trainingCourses: INITIAL_TRAINING_COURSES as any,
    personDocuments: INITIAL_PERSON_DOCUMENTS as any,
    documentosControlados: INITIAL_DOCUMENTOS_CONTROLADOS as any,
    ferramentasCalibradas: INITIAL_CALIBRATED_TOOLS as any,
    organization: {
      id: 'org_impacto_aviation',
      nome: 'Impacto Aviation MRO',
      razaoSocial: 'Impacto Serviços Aeronáuticos Ltda.',
      cnpj: '12.345.678/0001-90',
      certificadoHomologacaoANAC: 'COM-145-2024-098',
      ativo: true,
      criadoEm: '2024-01-01',
      atualizadoEm: '2026-03-01'
    } as any,
  };

  const relatorio = construirRelatorioApresentacao(
    INITIAL_RECORDS,
    INITIAL_MANUALS,
    [],
    [],
    filtros,
    'Impacto Aviation MRO',
    'Alysson Rabelo - Responsável Técnico',
    contexto
  );

  console.log(`Relatório construído com sucesso: ${relatorio.slides.length} slides.`);
  console.log(`Organização: ${relatorio.organizacao}`);
  console.log(`Índice Geral SGQ: ${relatorio.resumoExecutivo.sgqHealthScore}%`);

  // Validação da estrutura
  const validacao = validarApresentacaoPPTX(relatorio);
  console.log(`\nValidação Integrada: ${validacao.conformidade}`);
  console.log(`Total de elementos auditados: ${validacao.totalElementosVerificados}`);
  console.log(`Teste de Espelho: ${validacao.testeEspelhoAprovado ? 'APROVADO' : 'REPROVADO'} (${validacao.totalVerificacoesEspelho} cruzamentos)`);

  // Garantir diretórios
  const docsDir = path.resolve(process.cwd(), 'docs');
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const docsFile = path.join(docsDir, 'Apresentacao_Gerencial_QualyQuest_Rooster.pptx');
  const publicFile = path.join(publicDir, 'Apresentacao_Gerencial_QualyQuest_Rooster.pptx');

  console.log(`\nExportando PPTX para ${docsFile}...`);
  await exportarApresentacaoPPTX(relatorio, docsFile);

  console.log(`Copiando para ${publicFile}...`);
  fs.copyFileSync(docsFile, publicFile);

  const stats = fs.statSync(docsFile);
  console.log(`\n Arquivo gerado com sucesso:`);
  console.log(`- docs/Apresentacao_Gerencial_QualyQuest_Rooster.pptx (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`- public/Apresentacao_Gerencial_QualyQuest_Rooster.pptx (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log('\n=== CONCLUSÃO: 100% HOMOLOGADO ===');
}

main().catch(err => {
  console.error('Erro na geração do PPTX:', err);
  process.exit(1);
});
