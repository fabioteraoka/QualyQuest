/**
 * Script de Diagnóstico de Colaboradores Duplicados
 * QualyQuest SGQ / Rooster MRO Enterprise
 * 
 * Requisito 8:
 * Criar um relatório de diagnóstico dos colaboradores atualmente duplicados,
 * mostrando seus IDs e respectivos vínculos.
 */

import fs from 'fs';
import path from 'path';
import { ColaboradorPessoa } from '../src/types';
import {
  detectarColaboradoresDuplicados,
  gerarRelatorioDiagnosticoDuplicados,
  obterResumoVinculosColaborador,
} from '../src/services/mergePersonsService';
import { repository } from '../src/rooster/services/storage';

// Polyfill de localStorage para ambiente Node headless
if (typeof (global as any).localStorage === 'undefined') {
  const memStore: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => memStore[key] ?? null,
    setItem: (key: string, val: string) => { memStore[key] = String(val); },
    removeItem: (key: string) => { delete memStore[key]; },
    clear: () => { Object.keys(memStore).forEach((k) => delete memStore[k]); },
    key: (idx: number) => Object.keys(memStore)[idx] ?? null,
    get length() { return Object.keys(memStore).length; },
  };
}

async function main() {
  console.log('=================================================================');
  console.log('RELATÓRIO DE DIAGNÓSTICO DE DUPLICIDADES: QUALYQUEST / ROOSTER');
  console.log('=================================================================\n');

  // Carrega base do Rooster MRO
  const dbRooster = repository.getDatabase();
  console.log(`Total de pessoas no banco: ${dbRooster.pessoas.length}`);
  console.log(`Total de treinamentos: ${dbRooster.treinamentos.length}`);
  console.log(`Total de licenças: ${dbRooster.licencas.length}`);
  console.log(`Total de designações: ${dbRooster.designacoesPessoa.length}\n`);

  // Converte para modelo ColaboradorPessoa
  const colaboradores: ColaboradorPessoa[] = dbRooster.pessoas.map((p) => ({
    id: p.id,
    organizationId: 'org_impacto_aviation',
    nome: p.nome,
    matricula: p.matricula || p.canac || '',
    canac: p.canac || '',
    cargo: p.cargo_operacional || p.funcao || p.categoria,
    funcao: p.funcao || p.categoria,
    setor: p.setor || p.cliente_ou_area || 'Manutenção Aeronáutica',
    baseOperacional: p.base_principal_id,
    status: (p.situacao === 'Ativo' ? 'ATIVO' : 'INATIVO') as any,
    statusCustomizado: p.status_customizado,
    dataAdmissao: p.data_admissao || '',
    contatoCorporativo: p.contato_corporativo || '',
    observacoes: p.observacoes || '',
    possuiRestricao: !!(p as any).possui_restricao,
    motivoRestricao: (p as any).motivo_restricao || '',
    criadoPor: p.atualizado_por || 'Sistema',
    criadoPorUid: 'sistema',
    createdAt: p.criado_em,
    updatedAt: p.atualizado_em,
  }));

  const diagnostico = gerarRelatorioDiagnosticoDuplicados(colaboradores);

  console.log(`Duplicidades detectadas: ${diagnostico.totalDuplicadosEncontrados}`);
  console.log('-----------------------------------------------------------------');
  console.log(diagnostico.relatorioTexto);

  // Salva relatório em disco
  const relatorioDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(relatorioDir)) {
    fs.mkdirSync(relatorioDir, { recursive: true });
  }

  const outputPathMd = path.join(relatorioDir, 'relatorio_diagnostico_duplicados.md');
  const outputPathJson = path.join(relatorioDir, 'relatorio_diagnostico_duplicados.json');

  fs.writeFileSync(outputPathMd, diagnostico.relatorioTexto, 'utf8');
  fs.writeFileSync(
    outputPathJson,
    JSON.stringify(
      {
        geradoEm: new Date().toISOString(),
        totalDuplicados: diagnostico.totalDuplicadosEncontrados,
        grupos: diagnostico.grupos,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Relatório salvo em: ${outputPathMd}`);
  console.log(`JSON estruturado salvo em: ${outputPathJson}`);
}

main().catch((err) => {
  console.error('Erro na geração do relatório de diagnóstico:', err);
  process.exit(1);
});
