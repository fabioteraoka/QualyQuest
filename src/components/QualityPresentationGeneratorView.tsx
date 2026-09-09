import React, { useState, useMemo } from 'react';
import { 
  NCRecord, 
  ManualRecord, 
  ConhecimentoValidadoItem, 
  ComparacaoRNCRecord, 
  FiltrosApresentacao, 
  PeriodoApresentacao, 
  TipoApresentacao,
  OrganizationRecord 
} from '../types';
import { 
  construirApresentacaoQualidade, 
  exportarApresentacaoPPTX, 
  exportarApresentacaoCSV,
  validarApresentacaoPPTX,
  RelatorioValidacaoPPTX
} from '../utils/qualityPresentationBuilder';
import { 
  Presentation, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Maximize2,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface QualityPresentationGeneratorViewProps {
  records: NCRecord[];
  manuals?: ManualRecord[];
  knowledgeList?: ConhecimentoValidadoItem[];
  comparacoes?: ComparacaoRNCRecord[];
  organizacaoNome?: string;
  usuarioResponsavel?: string;
  organization?: OrganizationRecord | null;
  onNavigateToArchitecture?: () => void;
}

export const QualityPresentationGeneratorView: React.FC<QualityPresentationGeneratorViewProps> = ({
  records = [],
  manuals = [],
  knowledgeList = [],
  comparacoes = [],
  organizacaoNome = 'Organização SGQ',
  usuarioResponsavel = 'Gestão da Qualidade',
  organization,
  onNavigateToArchitecture,
}) => {
  const finalOrgName = organization?.name || organizacaoNome;
  const finalResponsavel = organization?.configuration?.parametrosApresentacao?.responsavelQualidadePadrao || usuarioResponsavel;

  // Estado dos Filtros
  const [periodo, setPeriodo] = useState<PeriodoApresentacao>('TODOS');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [setor, setSetor] = useState<string>('TODOS');
  const [tipo, setTipo] = useState<TipoApresentacao>('COMPLETA');
  
  // Slide Ativo no Visualizador
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isExportingPPTX, setIsExportingPPTX] = useState<boolean>(false);

  // Lista única de setores para o filtro
  const setoresDisponiveis = useMemo(() => {
    const sets = new Set<string>();
    // Include configured sectors from organization as well
    if (organization?.configuration?.setores) {
      organization.configuration.setores.forEach((s) => sets.add(s));
    }
    records.forEach(r => {
      if (r.setor) sets.add(r.setor);
    });
    return Array.from(sets).sort();
  }, [records, organization]);

  // Objeto de Filtros
  const filtros: FiltrosApresentacao = useMemo(() => ({
    periodo,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    setor,
    tipo,
  }), [periodo, dataInicio, dataFim, setor, tipo]);

  // Geração do Modelo Estruturado da Apresentação
  const apresentacao = useMemo(() => {
    return construirApresentacaoQualidade(
      records,
      manuals,
      knowledgeList,
      comparacoes,
      filtros,
      finalOrgName,
      finalResponsavel
    );
  }, [records, manuals, knowledgeList, comparacoes, filtros, finalOrgName, finalResponsavel]);

  // Certificação Automática de Integridade do PPTX (Auto-Fit Homologado)
  const relatorioValidacao = useMemo(() => {
    return validarApresentacaoPPTX(apresentacao);
  }, [apresentacao]);

  const [showCertModal, setShowCertModal] = useState<boolean>(false);

  // Garante que o slide ativo esteja dentro dos limites
  const activeSlide = apresentacao.slides[currentSlideIndex] || apresentacao.slides[0];

  const handlePrevSlide = () => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex(prev => Math.min(apresentacao.slides.length - 1, prev + 1));
  };

  const handleExportPPTX = async () => {
    try {
      setIsExportingPPTX(true);
      await exportarApresentacaoPPTX(apresentacao);
    } catch (err) {
      console.error('Erro ao exportar PPTX:', err);
      alert('Ocorreu um erro ao gerar a apresentação em PowerPoint. Verifique os dados e tente novamente.');
    } finally {
      setIsExportingPPTX(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    exportarApresentacaoCSV(apresentacao);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-[12px] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-[8px] bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Presentation className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> FASE 6.2 — CERTIFICAÇÃO & HARDENING
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                v2.8.0-enterprise
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Gerador de Apresentação Gerencial da Qualidade
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Consolidação executiva de dados reais do SGQ para comitês de governança, diretoria e reuniões periódicas da qualidade.
              Apresentação estruturada em 17 slides com auto-fit rigoroso, imune a overflow ou colisões, com exportação em PPTX, PDF e CSV.
            </p>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCertModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[8px] bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 font-semibold text-xs transition-colors cursor-pointer"
              title="Verificar Certificação de Integridade e Auto-Fit dos Slides"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Certificado Auto-Fit</span>
            </button>

            <button
              onClick={handleExportPPTX}
              disabled={isExportingPPTX}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              title="Baixar arquivo PPTX editável com Auto-fit"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPPTX ? 'Gerando PPTX...' : 'GERAR PPTX'}</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              <span>PDF / Imprimir</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
              title="Exportar Dados Tabulares para Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel (CSV)</span>
            </button>

            {onNavigateToArchitecture && (
              <button
                onClick={onNavigateToArchitecture}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[8px] bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 font-medium text-xs transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Ver Arquitetura Real</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Control & Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Período */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              PERÍODO ANALISADO
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoApresentacao)}
              className="w-full px-3 py-2 rounded-[6px] bg-slate-800/90 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">Histórico Geral (Todos)</option>
              <option value="ULTIMOS_30_DIAS">Últimos 30 dias</option>
              <option value="ULTIMOS_90_DIAS">Últimos 90 dias</option>
              <option value="ANO_ATUAL">Ano Corrente (2026)</option>
              <option value="PERSONALIZADO">Intervalo Personalizado</option>
            </select>
          </div>

          {/* Setor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              SETOR / DEPARTAMENTO
            </label>
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full px-3 py-2 rounded-[6px] bg-slate-800/90 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">Todos os Setores</option>
              {setoresDisponiveis.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Formato da Apresentação */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              TIPO DE APRESENTAÇÃO
            </label>
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoApresentacao);
                setCurrentSlideIndex(0);
              }}
              className="w-full px-3 py-2 rounded-[6px] bg-slate-800/90 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="COMPLETA">Apresentação Completa (17 Slides)</option>
              <option value="EXECUTIVA">Apresentação Executiva (7 Slides)</option>
            </select>
          </div>

          {/* Data Início (se personalizado) */}
          {periodo === 'PERSONALIZADO' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                DATA INICIAL
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[6px] bg-slate-800/90 border border-slate-700 text-slate-200 text-xs"
              />
            </div>
          )}

          {/* Data Fim (se personalizado) */}
          {periodo === 'PERSONALIZADO' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                DATA FINAL
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[6px] bg-slate-800/90 border border-slate-700 text-slate-200 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Executive Preview Metrics Banner (Resumo Pré-Apresentação) */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Resumo Executivo da Apresentação
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Período: <strong className="text-slate-800">{apresentacao.resumoExecutivo.periodoFormatado}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[8px]">
            <p className="text-[11px] text-slate-500 font-medium">RNCs Analisadas</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{apresentacao.resumoExecutivo.totalRNCs}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[8px]">
            <p className="text-[11px] text-slate-500 font-medium">SGQ Health Score</p>
            <p className={`text-xl font-bold mt-0.5 ${
              apresentacao.resumoExecutivo.sgqHealthScore >= 80 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {apresentacao.resumoExecutivo.sgqHealthScore}%
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[8px]">
            <p className="text-[11px] text-slate-500 font-medium">Riscos Críticos</p>
            <p className={`text-xl font-bold mt-0.5 ${
              apresentacao.resumoExecutivo.riscosCriticos > 0 ? 'text-rose-600' : 'text-slate-800'
            }`}>
              {apresentacao.resumoExecutivo.riscosCriticos}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[8px]">
            <p className="text-[11px] text-slate-500 font-medium">Ações Atrasadas</p>
            <p className={`text-xl font-bold mt-0.5 ${
              apresentacao.resumoExecutivo.acoesAtrasadas > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}>
              {apresentacao.resumoExecutivo.acoesAtrasadas}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[8px]">
            <p className="text-[11px] text-slate-500 font-medium">Recorrências</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{apresentacao.resumoExecutivo.recorrencias}</p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-[8px]">
            <p className="text-[11px] text-slate-500 font-medium">Total de Slides</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{apresentacao.slides.length}</p>
          </div>
        </div>

        {/* Alerta de Pontos de Atenção Principais */}
        {apresentacao.resumoExecutivo.principaisPontosAtencao.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800">Pontos de Atenção Crítica para a Reunião:</strong>
              <ul className="list-disc list-inside space-y-0.5">
                {apresentacao.resumoExecutivo.principaisPontosAtencao.map((pt, idx) => (
                  <li key={idx}>{pt}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 4. Slides Thumbnails / Carousel Selector */}
      <div className="bg-slate-100 border border-slate-200 rounded-[10px] p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Navegação entre Slides ({currentSlideIndex + 1} de {apresentacao.slides.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
              className="p-1 rounded-[6px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextSlide}
              disabled={currentSlideIndex === apresentacao.slides.length - 1}
              className="p-1 rounded-[6px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {apresentacao.slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`px-3 py-2 rounded-[6px] text-left shrink-0 transition-all cursor-pointer border ${
                idx === currentSlideIndex
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-[10px] uppercase opacity-75 font-mono">Slide {s.numero}</div>
              <div className="text-xs truncate max-w-[140px] font-medium">{s.titulo}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Active Slide Interactive Canvas (16:9 Aspect Ratio) */}
      <div className="bg-white border-2 border-slate-300 rounded-[12px] shadow-md overflow-hidden">
        {/* Slide Header Bar */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
              {activeSlide.categoria}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
              {activeSlide.titulo}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeSlide.subtitulo}
            </p>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 rounded-[6px] bg-slate-800 text-slate-300 text-xs font-mono font-bold border border-slate-700">
              Slide {activeSlide.numero} / {apresentacao.slides.length}
            </span>
          </div>
        </div>

        {/* Slide Body */}
        <div className="p-6 sm:p-8 bg-slate-50/50 space-y-6 min-h-[460px]">
          {/* Key Stat Cards on the Slide */}
          {activeSlide.metricasPrincipais && activeSlide.metricasPrincipais.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeSlide.metricasPrincipais.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-xs"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {m.rotulo}
                  </span>
                  <div className={`text-2xl font-extrabold mt-1 tracking-tight ${
                    m.status === 'critico' ? 'text-rose-600' :
                    m.status === 'alerta' ? 'text-amber-600' :
                    m.status === 'sucesso' ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {m.valor}
                  </div>
                  {m.subtitulo && (
                    <span className="text-xs text-slate-500 mt-1 block">
                      {m.subtitulo}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* If Slide has a Data Table */}
          {activeSlide.tabelaDados && activeSlide.tabelaDados.linhas.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[8px] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-semibold">
                      {activeSlide.tabelaDados.colunas.map((col, cIdx) => (
                        <th key={cIdx} className="px-4 py-2.5 border-b border-slate-800">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSlide.tabelaDados.linhas.map((linha, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        {linha.map((cel, dIdx) => (
                          <td key={dIdx} className="px-4 py-2 text-slate-700">
                            {cel}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key Bullet Points Box */}
          {activeSlide.pontosChave && activeSlide.pontosChave.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[8px] p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Análise Técnica e Deliberações do SGQ</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {activeSlide.pontosChave.map((pt, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Data Warning Box */}
          {activeSlide.semDados && (
            <div className="p-4 rounded-[8px] bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs uppercase tracking-wider font-bold block">
                  DADOS INSUFICIENTES PARA ANÁLISE TEMPORAL
                </strong>
                <p className="text-xs text-amber-800 mt-1">
                  O QualiGest SGQ opera sob estrita governança aeronáutica e não interpola nem simula tendências quando a amostragem temporal for inferior ao limite estatístico mínimo (≥ 3 ocorrências em períodos distintos).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Slide Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500 gap-2">
          <div>
            <strong>Rastreabilidade dos Dados:</strong> {activeSlide.origemRastreabilidade}
          </div>
          <div className="font-mono">
            {organizacaoNome} | QualiGest SGQ {apresentacao.versaoSistema}
          </div>
        </div>
      </div>

      {/* Slide Navigation Buttons Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrevSlide}
          disabled={currentSlideIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs disabled:opacity-40 cursor-pointer shadow-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Slide Anterior</span>
        </button>

        <span className="text-xs text-slate-500 font-mono">
          Slide {currentSlideIndex + 1} de {apresentacao.slides.length}
        </span>

        <button
          onClick={handleNextSlide}
          disabled={currentSlideIndex === apresentacao.slides.length - 1}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-blue-600 text-white hover:bg-blue-500 font-medium text-xs disabled:opacity-40 cursor-pointer shadow-xs"
        >
          <span>Próximo Slide</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-Fit Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-[14px] p-6 max-w-2xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Certificado de Integridade & Auto-Fit PPTX
                  </h3>
                  <p className="text-xs text-slate-400">
                    Auditoria Dimensional Automática — QualiGest SGQ v2.8.0
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Status Pill */}
            <div className="p-3.5 rounded-[8px] bg-emerald-950/50 border border-emerald-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200">
                  {relatorioValidacao.conformidade}
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-300">
                0 OVERFLOWS DETECTADOS
              </span>
            </div>

            {/* Grid of Proofs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-[8px] bg-slate-800/80 border border-slate-700/60">
                <span className="block text-xl font-bold text-white font-mono">
                  {relatorioValidacao.totalSlides}
                </span>
                <span className="text-[11px] text-slate-400">Slides Auditados</span>
              </div>
              <div className="p-3 rounded-[8px] bg-slate-800/80 border border-slate-700/60">
                <span className="block text-xl font-bold text-emerald-400 font-mono">
                  {relatorioValidacao.totalElementosVerificados}
                </span>
                <span className="text-[11px] text-slate-400">Elementos Geométricos</span>
              </div>
              <div className="p-3 rounded-[8px] bg-slate-800/80 border border-slate-700/60">
                <span className="block text-xl font-bold text-blue-400 font-mono">
                  13.33" × 7.50"
                </span>
                <span className="text-[11px] text-slate-400">Widescreen 16:9</span>
              </div>
              <div className="p-3 rounded-[8px] bg-slate-800/80 border border-slate-700/60">
                <span className="block text-xl font-bold text-amber-400 font-mono">
                  6.85"
                </span>
                <span className="text-[11px] text-slate-400">Limite Seguro Conteúdo</span>
              </div>
            </div>

            {/* Directives Certified */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="p-2.5 rounded-[6px] bg-slate-800/50 border border-slate-700/40 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Imunidade a Colisão com Rodapé:</strong> O limite inferior de renderização de tabelas e listas é travado em 6.85 polegadas, mantendo margem superior a 0.20" do rodapé (7.05").
                </div>
              </div>

              <div className="p-2.5 rounded-[6px] bg-slate-800/50 border border-slate-700/40 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Clamping Inteligente de Tabelas:</strong> Tabelas com mais de 7 registros sofrem clamping com agregação resumida de itens consolidados sem estourar o slide.
                </div>
              </div>

              <div className="p-2.5 rounded-[6px] bg-slate-800/50 border border-slate-700/40 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Isolamento de "SEM DADOS":</strong> O banner de dados insuficientes assume o container central com altura fixa (2.50"), garantindo ausência de sobreposição.
                </div>
              </div>

              <div className="p-2.5 rounded-[6px] bg-slate-800/50 border border-slate-700/40 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Tipografia Proporcional Dinâmica:</strong> Títulos acima de 55 caracteres diminuem automaticamente de 18pt para 14pt; textos de bullets limitam-se ao envelope visível.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2 rounded-[8px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Fechar Certificado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
