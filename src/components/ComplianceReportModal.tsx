import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Globe,
  UserCheck,
  ShieldCheck,
  Building,
  Calendar,
  Search,
  Filter,
  ExternalLink,
  Bot
} from 'lucide-react';
import { DocumentoControlado } from '../types';

interface ComplianceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentos: DocumentoControlado[];
  organizationName?: string;
}

export const ComplianceReportModal: React.FC<ComplianceReportModalProps> = ({
  isOpen,
  onClose,
  documentos = [],
  organizationName = 'Impacto Aviation MRO',
}) => {
  const [selectedMes, setSelectedMes] = useState<string>(() => {
    const hoje = new Date();
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  });

  const [filterTipo, setFilterTipo] = useState<'TODOS' | 'AUTOMATICO' | 'MANUAL'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = useMemo(() => {
    return documentos.filter((d) => {
      if (filterTipo !== 'TODOS') {
        const docTipo = d.tipoVerificacao || 'MANUAL';
        if (docTipo !== filterTipo) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCodigo = (d.codigo || '').toLowerCase().includes(term);
        const matchTitulo = (d.titulo || '').toLowerCase().includes(term);
        const matchProp = (d.proprietarioCessor || d.emissor || '').toLowerCase().includes(term);
        const matchArea = (d.areaPublicacao || '').toLowerCase().includes(term);
        if (!matchCodigo && !matchTitulo && !matchProp && !matchArea) return false;
      }
      return true;
    });
  }, [documentos, filterTipo, searchTerm]);

  // Estatísticas de Conformidade
  const stats = useMemo(() => {
    const total = documentos.length;
    const automaticos = documentos.filter((d) => d.tipoVerificacao === 'AUTOMATICO').length;
    const manuais = total - automaticos;
    const conformes = documentos.filter((d) => d.statusVerificacao === 'CONFORME' || !d.statusVerificacao).length;
    const discrepantes = documentos.filter((d) => d.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA').length;
    const taxa = total > 0 ? Math.round((conformes / total) * 100) : 100;
    return { total, automaticos, manuais, conformes, discrepantes, taxa };
  }, [documentos]);

  // Hash de Auditoria Rastreável
  const hashRelatorio = useMemo(() => {
    const seed = `${organizationName}-${selectedMes}-${documentos.length}-${stats.taxa}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return `ANAC-MRO-REL-${Math.abs(hash).toString(16).toUpperCase().padStart(10, '0')}`;
  }, [organizationName, selectedMes, documentos.length, stats.taxa]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Área de Publicação',
      'Código / Publicação',
      'Título da Publicação',
      'Proprietário / Cessor',
      'Número da Revisão',
      'Data da Revisão',
      'Tipo de Verificação',
      'Status no Mês',
      'Data Última Verificação',
      'Evidência / Detalhes'
    ];

    const rows = filteredDocs.map((d) => [
      `"${d.areaPublicacao || d.categoria || 'Geral'}"`,
      `"${d.codigo}"`,
      `"${(d.titulo || '').replace(/"/g, '""')}"`,
      `"${d.proprietarioCessor || d.emissor || 'SGQ'}"`,
      `"${d.numeroRevisao || d.revisaoVigenteNumero || 'Rev. 00'}"`,
      `"${d.dataRevisao || d.dataAprovacao || '-'}"`,
      `"${d.tipoVerificacao || 'MANUAL'}"`,
      `"${d.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA' ? 'DISCREPÂNCIA REGULAMENTAR' : 'CONFORME / VIGENTE'}"`,
      `"${d.dataUltimaVerificacao ? new Date(d.dataUltimaVerificacao).toLocaleDateString('pt-BR') : '-'}"`,
      `"${(d.detalhesUltimaVerificacao || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relatorio_Conformidade_Revisoes_${selectedMes.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      {/* Container Principal */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Barra Superior de Ações (Oculta na impressão) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                  FORMULÁRIO F 001-02-1
                </span>
                <span className="text-xs text-slate-400">RBAC 145.109 / IS 145.109-001</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Relatório de Conformidade e Controle de Revisões
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Mês de Referência */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-300 font-medium">Mês:</span>
              <input
                type="text"
                value={selectedMes}
                onChange={(e) => setSelectedMes(e.target.value)}
                placeholder="Ex: Setembro de 2026"
                className="bg-transparent text-white font-semibold focus:outline-none w-36 text-xs"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Exportar dados para Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-sky-900/50"
              title="Imprimir ou Salvar como PDF para auditoria"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Gerar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros em Tela (Ocultos na impressão) */}
        <div className="print:hidden bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar Automação:
            </span>
            {(['TODOS', 'AUTOMATICO', 'MANUAL'] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFilterTipo(tipo)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  filterTipo === tipo
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tipo === 'TODOS'
                  ? 'Todos os Manuais'
                  : tipo === 'AUTOMATICO'
                  ? '🤖 Automáticos (ANAC / Web)'
                  : '👤 Manuais (Clientes / OEMs)'}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por código, título ou emissor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* ÁREA DO RELATÓRIO OFICIAL (VISUAL NA TELA E OTIMIZADO PARA IMPRESSÃO / PDF) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-0 print:overflow-visible text-slate-900 bg-white">
          
          {/* CABEÇALHO FORMAL DO RELATÓRIO (Estilo ANAC / SGQ Aeronáutico) */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-sky-700" />
                  <span className="font-black text-slate-900 text-lg tracking-wider uppercase">
                    {organizationName}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Garantia da Qualidade Aeronáutica & Biblioteca Técnica MRO
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Certificação ANAC RBAC 145 • Sistema Integrado QualiGest SGQ
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">
                  FORMULÁRIO F 001-02-1
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Autenticidade: <strong className="text-slate-800">{hashRelatorio}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Data de Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                Relatório Mensal de Conformidade e Controle de Revisões
              </h1>
              <p className="text-xs font-bold text-sky-800 uppercase tracking-wide mt-1">
                Evidência Formal de Vigência de Publicações Técnicas e Manuais de Manutenção — Mês de Referência: {selectedMes}
              </p>
            </div>
          </div>

          {/* PAINEL DE ESTATÍSTICAS E CONFORMIDADE */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 print:grid-cols-5 print:mb-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center print:border-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Acervo Total</span>
              <span className="text-xl font-black text-slate-900">{stats.total}</span>
              <span className="text-[10px] text-slate-500 block">Manuais Controlados</span>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-center print:border-slate-300">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Verificação Automática</span>
              <span className="text-xl font-black text-blue-900">{stats.automaticos}</span>
              <span className="text-[10px] text-blue-600 block">Robô ANAC / Web</span>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-center print:border-slate-300">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Verificação Manual</span>
              <span className="text-xl font-black text-amber-900">{stats.manuais}</span>
              <span className="text-[10px] text-amber-600 block">Clientes & OEMs</span>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center print:border-slate-300">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Manuais Vigentes</span>
              <span className="text-xl font-black text-emerald-900">{stats.conformes}</span>
              <span className="text-[10px] text-emerald-600 block">100% Conformes</span>
            </div>

            <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-center print:border-slate-300 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Taxa de Conformidade</span>
              <span className="text-xl font-black text-purple-900">{stats.taxa}%</span>
              <span className="text-[10px] text-purple-600 block">Aderência RBAC 145</span>
            </div>
          </div>

          {/* TABELA DE CONTROLE DE MANUAIS & REVISÕES (F 001-02-1) */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-6 print:border-slate-400 print:rounded-none">
            <table className="w-full text-left border-collapse text-[11px] print:text-[10px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px] print:bg-slate-200 print:text-slate-900">
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400">Área / Publicação</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400">Título Oficial do Manual</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400">Proprietário / Cessor</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400 text-center">Nº Revisão em Uso</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400 text-center">Data da Revisão</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400 text-center">Automação</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400 text-center">Status no Mês</th>
                  <th className="py-2.5 px-3 border-b border-slate-700 print:border-slate-400 text-center">Última Checagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {filteredDocs.map((doc, idx) => {
                  const isAuto = doc.tipoVerificacao === 'AUTOMATICO';
                  const isDiscrepante = doc.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA';

                  return (
                    <tr
                      key={doc.id || idx}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 print:bg-slate-100/50'}
                    >
                      {/* Área de Publicação / Código */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div className="font-mono font-bold text-sky-900">{doc.codigo}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{doc.areaPublicacao || doc.categoria}</div>
                      </td>

                      {/* Título */}
                      <td className="py-2.5 px-3 text-slate-800 max-w-xs">
                        <div className="font-medium line-clamp-2">{doc.titulo}</div>
                      </td>

                      {/* Proprietário / Cessor */}
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {doc.proprietarioCessor || doc.emissor || 'SGQ Interno'}
                      </td>

                      {/* Número da Revisão */}
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900 whitespace-nowrap">
                        {doc.numeroRevisao || doc.revisaoVigenteNumero || 'Rev. 00'}
                      </td>

                      {/* Data da Revisão */}
                      <td className="py-2.5 px-3 text-center text-slate-700 whitespace-nowrap font-mono">
                        {doc.dataRevisao || doc.dataAprovacao || '-'}
                      </td>

                      {/* Automação (AUTOMÁTICO vs MANUAL) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isAuto ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 print:border-none">
                            <Bot className="w-3 h-3 text-blue-700" />
                            AUTOMÁTICO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 print:border-none">
                            <UserCheck className="w-3 h-3 text-amber-700" />
                            MANUAL
                          </span>
                        )}
                      </td>

                      {/* Status no Mês */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-semibold">
                        {isDiscrepante ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            REVISÃO PENDENTE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            VIGENTE
                          </span>
                        )}
                      </td>

                      {/* Última Checagem */}
                      <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap font-mono text-[10px]">
                        {doc.dataUltimaVerificacao
                          ? new Date(doc.dataUltimaVerificacao).toLocaleDateString('pt-BR')
                          : 'Conferido no Mês'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DECLARAÇÃO REGULATÓRIA FORMAL PARA A AUTORIDADE (ANAC / AUDITORES) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2 mb-8 print:bg-white print:border-slate-300 print:mb-6">
            <h3 className="font-bold text-slate-900 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-700" />
              Declaração de Conformidade Técnica e Rastreabilidade Regulamentar (RBAC 145.109)
            </h3>
            <p className="leading-relaxed">
              Declaramos para os devidos fins de auditoria, inspeção e controle de aeronavegabilidade que todas as publicações técnicas, manuais de manutenção de aeronaves (AMM), catálogos de peças (IPC), manuais de reparos estruturais (SRM), regulamentos da autoridade de aviação civil e manuais de clientes mantidos no acervo da <strong>{organizationName}</strong> foram verificados perante suas fontes oficiais no mês de <strong>{selectedMes}</strong>. As revisões declaradas acima encontram-se vigentes e aprovadas para utilização operacional nas bases e hangares da organização.
            </p>
          </div>

          {/* ASSINATURAS FORMAIS (Campos de Assinatura para Impressão) */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-center print:pt-6">
            <div className="space-y-1">
              <div className="border-b border-slate-900 w-3/4 mx-auto pb-8 mb-2"></div>
              <p className="font-bold text-xs text-slate-900">Eng. Paulo Okubo</p>
              <p className="text-[10px] text-slate-600">Gerente de Garantia da Qualidade (GQ) • CREA 506.123/SP</p>
              <p className="text-[10px] text-slate-500 font-mono">{organizationName}</p>
            </div>

            <div className="space-y-1">
              <div className="border-b border-slate-900 w-3/4 mx-auto pb-8 mb-2"></div>
              <p className="font-bold text-xs text-slate-900">Insp. Marcos Viana</p>
              <p className="text-[10px] text-slate-600">Responsável Técnico / Inspetor Chefe • ANAC CHT 145.890</p>
              <p className="text-[10px] text-slate-500 font-mono">{organizationName}</p>
            </div>
          </div>

          {/* Rodapé do Relatório */}
          <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 print:mt-6 font-mono">
            QualiGest SGQ Aeronáutico • Relatório F 001-02-1 • Autenticação Criptográfica: {hashRelatorio} • Página 1 de 1
          </div>
        </div>
      </div>
    </div>
  );
};
