import * as XLSX from 'xlsx';
import { NCRecord } from '../types';

/**
 * Maps an NCRecord into a clean, complete flat record with all database fields
 * for Excel and CSV exports to integrate seamlessly with Power BI, ERPs, SharePoint, and external platforms.
 */
export function formatNCForDatabaseExport(nc: NCRecord, index: number) {
  const p1 = nc.analiseCausaRaiz?.cincoPorques?.[0] || '';
  const p2 = nc.analiseCausaRaiz?.cincoPorques?.[1] || '';
  const p3 = nc.analiseCausaRaiz?.cincoPorques?.[2] || '';
  const p4 = nc.analiseCausaRaiz?.cincoPorques?.[3] || '';
  const p5 = nc.analiseCausaRaiz?.cincoPorques?.[4] || '';

  const historicoFormatado = (nc.historicoPrazos || [])
    .map(
      (h, idx) =>
        `[#${idx + 1}: De ${h.dataAnterior || '-'} Para ${h.novaData || '-'} | Motivo: ${h.motivo || '-'} | Por: ${h.usuario || '-'} em ${h.alteradoEm ? new Date(h.alteradoEm).toLocaleDateString('pt-BR') : '-'}]`
    )
    .join(' ; ');

  return {
    'Item #': index + 1,
    'ID Sistema': nc.id,
    'Código Formulário': nc.codigoFormulario || 'F 001-29',
    'Revisão': nc.revisao || '00',
    'Data Emissão Ficha': nc.dataEmissaoFormulario || '',
    'Nº da NC': nc.numeroNC || '',
    'Título da NC': nc.titulo || '',
    'Tipo de Ação': nc.tipoAcao || 'Corretiva',
    'Norma / Requisito': nc.normaReferencia || '',
    'Setor / Base': nc.setor || '',
    'Categoria': nc.categoria || '',
    'Status Geral SGQ': nc.statusGeral || 'Aberta',
    'Data de Identificação': nc.dataIdentificacao || '',
    'Prazo de Resposta': nc.prazoResposta || '',
    'Auditor': nc.auditor || '',
    
    // Matriz de Risco Inicial
    'Risco Inicial - Código': nc.avaliacaoRiscoInicial?.codigo || '2C',
    'Risco Inicial - Severidade': nc.avaliacaoRiscoInicial?.severidade || '2',
    'Risco Inicial - Probabilidade': nc.avaliacaoRiscoInicial?.probabilidade || 'C',
    'Risco Inicial - Nível': nc.avaliacaoRiscoInicial?.nivel || 'Médio',

    // Descrição
    'Descrição da Não Conformidade': nc.descricaoNC || '',

    // Contenção
    'Ação de Contenção': nc.preAnaliseContencao?.descricao || '',
    'Responsável Contenção': nc.preAnaliseContencao?.responsavel || '',
    'Prazo Limite Contenção': nc.preAnaliseContencao?.dataLimite || '',
    'Status Contenção': nc.preAnaliseContencao?.status || 'Pendente',

    // Causa Raiz
    'Metodologia Causa': nc.analiseCausaRaiz?.metodologia || '5 Porquês',
    '1º Porquê': p1,
    '2º Porquê': p2,
    '3º Porquê': p3,
    '4º Porquê': p4,
    '5º Porquê (Causa Raiz)': p5,
    'Ishikawa - Método': nc.analiseCausaRaiz?.ishikawa?.metodo || '',
    'Ishikawa - Máquina': nc.analiseCausaRaiz?.ishikawa?.maquina || '',
    'Ishikawa - Mão de Obra': nc.analiseCausaRaiz?.ishikawa?.maoDeObra || '',
    'Ishikawa - Material': nc.analiseCausaRaiz?.ishikawa?.material || '',
    'Ishikawa - Medição': nc.analiseCausaRaiz?.ishikawa?.medicao || '',
    'Ishikawa - Meio Ambiente': nc.analiseCausaRaiz?.ishikawa?.meioAmbiente || '',
    'Conclusão Causa Raiz': nc.analiseCausaRaiz?.detalhes || '',

    // Ação Corretiva
    'Ação Corretiva': nc.acaoCorretiva?.descricao || '',
    'Como Será Feito (5W2H)': nc.acaoCorretiva?.comoSeraFeito || '',
    'Responsável Ação': nc.acaoCorretiva?.responsavel || '',
    'Prazo da Ação': nc.acaoCorretiva?.dataPrazo || '',
    'Status da Ação': nc.acaoCorretiva?.status || 'Não Iniciada',
    'Assinatura Responsável': nc.acaoCorretiva?.assinaturaResponsavel || '',

    // Verificação de Eficácia
    'Eficácia - Método': nc.verificacaoEficacia?.metodo || 'Documental',
    'Eficácia - Detalhe Outro': nc.verificacaoEficacia?.outroMetodoDetalhe || '',
    'Risco Residual - Código': nc.verificacaoEficacia?.avaliacaoRiscoResidual?.codigo || '4E',
    'Risco Residual - Nível': nc.verificacaoEficacia?.avaliacaoRiscoResidual?.nivel || 'Baixo',
    'Status Encerramento': nc.verificacaoEficacia?.encerrado || 'Pendente',
    'Eficácia - Motivo': nc.verificacaoEficacia?.motivo || '',
    'Eficácia - Evidências': nc.verificacaoEficacia?.evidencias || '',
    'Data Verificação Eficácia': nc.verificacaoEficacia?.dataVerificacao || '',
    'Auditor Verificador': nc.verificacaoEficacia?.auditorVerificador || '',

    // Auditoria do Sistema
    'Documento de Origem': nc.documentoOrigemNome || '',
    'Qtd Prorrogações': (nc.historicoPrazos || []).length,
    'Histórico de Prorrogações': historicoFormatado,
    'Data Criação': nc.criadoEm || '',
    'Última Atualização': nc.atualizadoEm || '',
  };
}

/**
 * Exports all records to a formatted multi-tab Microsoft Excel (.xlsx) workbook.
 */
export function exportToExcel(records: NCRecord[], baseFileName = 'banco_dados_sgq_rnc') {
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `${baseFileName}_${dateStr}.xlsx`;

  // Sheet 1: Base Completa (All 45+ columns)
  const fullData = records.map((r, idx) => formatNCForDatabaseExport(r, idx));
  const wsDatabase = XLSX.utils.json_to_sheet(fullData);

  // Column width auto-adjust
  const colWidths = Object.keys(fullData[0] || {}).map((k) => ({
    wch: Math.max(k.length + 3, 14),
  }));
  wsDatabase['!cols'] = colWidths;

  // Sheet 2: Resumo Executivo / KPIs
  const statusCounts: Record<string, number> = {};
  const riscoCounts: Record<string, number> = {};
  const setorCounts: Record<string, number> = {};

  records.forEach((r) => {
    statusCounts[r.statusGeral || 'Aberta'] = (statusCounts[r.statusGeral || 'Aberta'] || 0) + 1;
    const rLevel = r.avaliacaoRiscoInicial?.nivel || 'Médio';
    riscoCounts[rLevel] = (riscoCounts[rLevel] || 0) + 1;
    const s = r.setor || 'Geral';
    setorCounts[s] = (setorCounts[s] || 0) + 1;
  });

  const resumoGeral = [
    { Indicador: 'Total de Não Conformidades Cadastradas', Valor: records.length },
    { Indicador: 'Não Conformidades Abertas / Em Tratamento', Valor: records.filter((r) => r.statusGeral !== 'Encerrada').length },
    { Indicador: 'Não Conformidades Encerradas com Sucesso', Valor: records.filter((r) => r.statusGeral === 'Encerrada').length },
    {
      Indicador: 'Taxa de Eficácia e Encerramento',
      Valor: records.length ? `${Math.round((records.filter((r) => r.statusGeral === 'Encerrada').length / records.length) * 100)}%` : '0%',
    },
    { Indicador: 'Data da Extração do Banco de Dados', Valor: new Date().toLocaleString('pt-BR') },
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumoGeral);
  wsResumo['!cols'] = [{ wch: 45 }, { wch: 25 }];

  // Sheet 3: Plano de Ações (Foco Execução)
  const planoAcoesData = records.map((r) => ({
    'Nº NC': r.numeroNC,
    'Título da NC': r.titulo,
    'Setor': r.setor,
    'Ação Corretiva': r.acaoCorretiva?.descricao || '',
    'Como Será Feito': r.acaoCorretiva?.comoSeraFeito || '',
    'Responsável': r.acaoCorretiva?.responsavel || '',
    'Prazo': r.acaoCorretiva?.dataPrazo || '',
    'Status Ação': r.acaoCorretiva?.status || 'Não Iniciada',
    'Status Geral RNC': r.statusGeral,
  }));
  const wsPlano = XLSX.utils.json_to_sheet(planoAcoesData);
  wsPlano['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 20 },
    { wch: 40 },
    { wch: 30 },
    { wch: 20 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
  ];

  // Assemble Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsDatabase, 'Banco de Dados RNC');
  XLSX.utils.book_append_sheet(workbook, wsPlano, 'Plano de Ações Corretivas');
  XLSX.utils.book_append_sheet(workbook, wsResumo, 'Resumo Executivo SGQ');

  // Trigger file download
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports records to UTF-8 CSV with BOM for high compatibility with Microsoft Excel and third-party systems.
 */
export function exportToCSV(records: NCRecord[], baseFileName = 'banco_dados_sgq_rnc') {
  const fullData = records.map((r, idx) => formatNCForDatabaseExport(r, idx));
  if (!fullData.length) return;

  const headers = Object.keys(fullData[0]);
  const rows = fullData.map((row) =>
    headers
      .map((header) => {
        const val = String((row as any)[header] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(';')
  );

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${baseFileName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the raw database in JSON format for direct API imports, backups or ETL pipelines.
 */
export function exportToJSON(records: NCRecord[], baseFileName = 'backup_banco_dados_sgq') {
  const dataStr = JSON.stringify(
    {
      sistema: 'QualiGest SGQ',
      versaoEsquema: '2.0-F001-29',
      exportadoEm: new Date().toISOString(),
      totalRegistros: records.length,
      registros: records,
    },
    null,
    2
  );

  const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${baseFileName}_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
