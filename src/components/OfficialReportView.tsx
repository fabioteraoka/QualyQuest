import React, { useRef, useState } from 'react';
import { Printer, Download, ArrowLeft, CheckCircle2, ShieldCheck, FileCheck, Share2, Trash2, FileSpreadsheet, Sparkles, ExternalLink, Loader2, Wrench } from 'lucide-react';
import { NCRecord, OrganizationRecord } from '../types';
import { formatarData, obterCorRisco, obterCorStatus } from '../utils/qualityHelpers';
import { exportToExcel } from '../utils/exportHelpers';
import { downloadOfficialNCPDF, openOfficialNCPrintWindow } from '../utils/printHelpers';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { OrganizationBrandLogo } from './OrganizationBrandLogo';
import { ImpactoQualityContextModal } from './ImpactoQualityContextModal';

interface OfficialReportViewProps {
  nc?: NCRecord;
  record?: NCRecord;
  organization?: OrganizationRecord | null;
  onBack: () => void;
  onEdit?: (nc: NCRecord) => void;
  onDelete?: (id: string) => void;
  onAuditNC?: (nc: NCRecord) => void;
}

export const OfficialReportView: React.FC<OfficialReportViewProps> = ({
  nc,
  record,
  organization,
  onBack,
  onEdit,
  onDelete,
  onAuditNC,
}) => {
  const currentNC = nc || record;
  const printRef = useRef<HTMLDivElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [printSuccessToast, setPrintSuccessToast] = useState<string | null>(null);
  const [isImpactoContextOpen, setIsImpactoContextOpen] = useState(false);

  const showToast = (msg: string) => {
    setPrintSuccessToast(msg);
    setTimeout(() => setPrintSuccessToast(null), 5000);
  };

  const handlePrint = async () => {
    if (!currentNC) return;
    setIsGeneratingPDF(true);
    try {
      // Generate and download pixel-perfect official PDF
      const success = await downloadOfficialNCPDF(currentNC, organization);
      if (success) {
        showToast(`PDF oficial da RNC #${currentNC.numeroNC} gerado e baixado com sucesso no formato oficial!`);
      } else {
        // Fallback: standalone printable window with embedded styles
        openOfficialNCPrintWindow(currentNC, organization);
      }
    } catch (e) {
      console.warn('PDF generation error, fallback to print window:', e);
      openOfficialNCPrintWindow(currentNC, organization);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOpenStandalonePrint = () => {
    if (currentNC) {
      openOfficialNCPrintWindow(currentNC, organization);
      showToast('Página de impressão oficial aberta com formatação completa!');
    }
  };

  const handleExportSingleExcel = () => {
    if (currentNC) {
      exportToExcel([currentNC], `rnc_${currentNC.numeroNC || 'registro'}`);
    }
  };

  const handleConfirmDelete = () => {
    if (currentNC && onDelete) {
      onDelete(currentNC.id);
      onBack();
    }
  };

  if (!currentNC) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
        <p className="text-slate-600 text-sm font-medium">Nenhum Registro de Não Conformidade selecionado.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
        >
          Voltar para Lista de Registros
        </button>
      </div>
    );
  }

  const isCorretiva = currentNC.tipoAcao === 'Corretiva';
  const isPreventiva = currentNC.tipoAcao === 'Preventiva';

  const isDoc = currentNC.verificacaoEficacia?.metodo === 'Documental';
  const isVisual = currentNC.verificacaoEficacia?.metodo === 'Visual';
  const isEntrevista = currentNC.verificacaoEficacia?.metodo === 'Entrevista';
  const isOutro = currentNC.verificacaoEficacia?.metodo === 'Outro';

  const isEncerradoSim = currentNC.verificacaoEficacia?.encerrado === 'SIM';
  const isEncerradoNao = currentNC.verificacaoEficacia?.encerrado === 'NÃO';

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200/60 shrink-0 cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Ficha RNC #{currentNC.numeroNC} - {currentNC.titulo}
              </h2>
              <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${obterCorStatus(currentNC.statusGeral).bg} ${obterCorStatus(currentNC.statusGeral).text}`}>
                {currentNC.statusGeral}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Formulário Padrão SGQ F 001-29 / Revisão {currentNC.revisao || '00'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onAuditNC && (
            <button
              onClick={() => onAuditNC(currentNC)}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white text-xs font-bold shadow-md shadow-indigo-200 hover:scale-[1.02] transition-all cursor-pointer"
              title="Verificar se a NC é pertinente e está enquadrada na última revisão do manual"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse shrink-0" />
              <span>Auditar IA</span>
            </button>
          )}

          <button
            onClick={handleExportSingleExcel}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Exportar esta RNC para Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(currentNC)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Editar
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              title="Excluir este registro de Não Conformidade"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}

          <button
            onClick={handleOpenStandalonePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Abrir página direta de impressão em nova aba"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="hidden sm:inline">Impressão</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isGeneratingPDF}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] cursor-pointer"
            title="Gerar e baixar PDF oficial da Ficha RNC (A4)"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                <span>Gerando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 shrink-0" />
                <span>Baixar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Impacto Aviation MRO Integration Banner */}
      {currentNC.origemImpactoMro && (
        <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-950 text-white tracking-wider">
                  Fonte Oficial de Manutenção
                </span>
                <span className="text-xs font-bold text-indigo-950">
                  Impacto Aviation MRO
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Ordem de Serviço: <strong className="font-mono text-indigo-700">{currentNC.origemImpactoMro.numeroOS}</strong> (ID: {currentNC.origemImpactoMro.ordemServicoId})
                {currentNC.origemImpactoMro.prefixoAeronave && ` • Aeronave: ${currentNC.origemImpactoMro.prefixoAeronave}`}
                {currentNC.origemImpactoMro.baseNome && ` • Base: ${currentNC.origemImpactoMro.baseNome}`}
                {currentNC.origemImpactoMro.tecnicoNome && ` • Resp. Técnico: ${currentNC.origemImpactoMro.tecnicoNome}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImpactoContextOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Ver Contexto de Qualidade</span>
            </button>
            {currentNC.origemImpactoMro.urlNavegavel && (
              <a
                href={currentNC.origemImpactoMro.urlNavegavel}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Consultar no Impacto</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Mobile Notice */}
      <div className="sm:hidden bg-blue-50 border border-blue-200 text-blue-800 text-[11px] p-2.5 rounded-xl">
        Arraste horizontalmente para visualizar o formulário A4 F 001-29 completo.
      </div>

      {/* Success Toast */}
      {printSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{printSuccessToast}</span>
          </div>
          <button
            onClick={() => setPrintSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        record={currentNC}
      />

      {/* Printable Sheet (F 001-29 Form) */}
      <div className="bg-slate-100 p-2 sm:p-6 rounded-2xl overflow-x-auto w-full flex justify-start sm:justify-center print:p-0 print:bg-white">
        <div
          ref={printRef}
          className="w-[800px] shrink-0 bg-white border border-slate-400 text-black shadow-xl print:shadow-none print:border-2 print:border-black font-sans text-[13px] leading-tight mx-auto"
          style={{ minHeight: '1050px' }}
        >
          {/* Header Block with Logo & Title */}
          <div className="grid grid-cols-12 border-b border-black">
            {/* Logo Box */}
            <div className="col-span-4 p-2.5 border-r border-black flex items-center justify-center bg-white">
              <OrganizationBrandLogo
                organization={organization}
                className="w-full max-w-[210px] h-auto"
                width={210}
                height={58}
              />
            </div>
            {/* Document Name */}
            <div className="col-span-8 p-3 flex items-center justify-center font-bold text-base sm:text-lg tracking-wide uppercase text-center">
              REGISTRO DE NÃO CONFORMIDADE
            </div>
          </div>

          {/* Subtitle Banner */}
          <div className="border-b border-black py-1.5 px-3 text-center font-bold uppercase text-xs sm:text-sm tracking-wide bg-slate-50 print:bg-transparent">
            REGISTRO DE NÃO CONFORMIDADE, AÇÃO CORRETIVA OU PREVENTIVA
          </div>

          {/* Header Metadata 3-column line */}
          <div className="grid grid-cols-12 border-b border-black text-xs font-semibold">
            <div className="col-span-4 p-1.5 border-r border-black">
              Data Emissão: <span className="font-normal">{currentNC.dataEmissaoFormulario || '02/09/2025'}</span>
            </div>
            <div className="col-span-4 p-1.5 border-r border-black text-center">
              Revisão: <span className="font-normal">{currentNC.revisao || '00'}</span>
            </div>
            <div className="col-span-4 p-1.5 text-right">
              Página: <span className="font-normal">1 de 1</span>
            </div>
          </div>

          {/* Title & Action Type */}
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-8 p-2 border-r border-black">
              <span className="font-bold">Título:</span> {currentNC.titulo}
            </div>
            <div className="col-span-4 p-2 text-xs flex flex-col justify-center gap-1 font-medium">
              <div className="flex items-center space-x-2">
                <span>Preventiva</span>
                <span className="font-bold">{isPreventiva ? '( X )' : '(   )'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Corretiva</span>
                <span className="font-bold">{isCorretiva ? '( X )' : '(   )'}</span>
              </div>
            </div>
          </div>

          {/* Nº da NC */}
          <div className="border-b border-black p-2 font-bold bg-slate-50/50 print:bg-transparent">
            Nº da NC: <span className="font-normal">{currentNC.numeroNC}</span>
            {currentNC.normaReferencia && (
              <span className="ml-4 text-xs font-normal text-slate-700">
                (Norma / Ref: <strong className="font-semibold">{currentNC.normaReferencia}</strong>)
              </span>
            )}
            {currentNC.origemImpactoMro && (
              <div className="mt-1 text-[11px] font-normal text-slate-800">
                <strong>Origem / Vínculo MRO:</strong> Impacto Aviation MRO • Ordem de Serviço: <strong className="font-mono">{currentNC.origemImpactoMro.numeroOS}</strong> (ID: {currentNC.origemImpactoMro.ordemServicoId})
                {currentNC.origemImpactoMro.prefixoAeronave && ` • Aeronave: ${currentNC.origemImpactoMro.prefixoAeronave}`}
                {currentNC.origemImpactoMro.tecnicoNome && ` • Resp. Técnico: ${currentNC.origemImpactoMro.tecnicoNome}`}
              </div>
            )}
          </div>

          {/* 1. DESCRIÇÃO DA NÃO CONFORMIDADE */}
          <div className="border-b border-black">
            <div className="bg-slate-200/90 print:bg-slate-200 px-2 py-1 font-bold text-xs uppercase border-b border-black">
              1. DESCRIÇÃO DA NÃO CONFORMIDADE
            </div>
            <div className="p-3 min-h-[90px] whitespace-pre-line text-xs sm:text-[13px] leading-relaxed">
              {currentNC.descricaoNC || 'Sem descrição cadastrada.'}
            </div>

            {/* Avaliação de Risco Inicial */}
            <div className="border-t border-black p-2 text-xs font-semibold bg-slate-50/70 print:bg-transparent flex flex-wrap items-center justify-between gap-2">
              <div>
                Avaliação de Risco (Severidade x Probabilidade):{' '}
                <span className="font-bold text-sm bg-slate-200 px-1.5 py-0.5 rounded border border-black/30">
                  {currentNC.avaliacaoRiscoInicial?.codigo || '2C'}
                </span>
                <span className="ml-2 font-normal text-slate-600">
                  (Classificação: {currentNC.avaliacaoRiscoInicial?.nivel || 'Médio'})
                </span>
              </div>
            </div>

            {/* Prazo de Resposta */}
            <div className="border-t border-black p-2 text-xs font-bold bg-slate-50/30 print:bg-transparent">
              Prazo de Resposta da NC: <span className="font-normal">{formatarData(currentNC.prazoResposta)}</span>
            </div>

            {/* Data, Auditor & Setor */}
            <div className="grid grid-cols-12 border-t border-black text-xs">
              <div className="col-span-4 p-2 border-r border-black font-bold">
                Data: <span className="font-normal">{formatarData(currentNC.dataIdentificacao)}</span>
              </div>
              <div className="col-span-4 p-2 border-r border-black font-bold">
                Auditor: <span className="font-normal">{currentNC.auditor}</span>
              </div>
              <div className="col-span-4 p-2 font-bold">
                Setor: <span className="font-normal">{currentNC.setor || 'Não informado'}</span>
              </div>
            </div>

            {/* Rastreabilidade de Análise de Setor Responsável (Seção 6) */}
            {currentNC.analiseSetor && (
              <div className="border-t border-black p-2 text-[11px] bg-slate-50/70 print:bg-transparent flex flex-wrap items-center justify-between gap-2 text-slate-700">
                <div>
                  <span className="font-semibold">Análise SGQ de Setor:</span>{' '}
                  <span>Sugerido: <strong>{currentNC.analiseSetor.setorSugerido}</strong> ({currentNC.analiseSetor.confianca})</span>
                  {currentNC.analiseSetor.statusDecisao === 'DIVERGENTE_MANTIDA' && (
                    <span className="ml-2 text-amber-900 font-medium">
                      • Divergência Mantida pelo Auditor: "{currentNC.analiseSetor.justificativaDivergencia}"
                    </span>
                  )}
                  {currentNC.analiseSetor.statusDecisao === 'ACEITA' && (
                    <span className="ml-2 text-emerald-800 font-medium">
                      • Adotado conforme análise do sistema ({currentNC.analiseSetor.usuarioDecisor})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. PRÉ-ANÁLISE DA CAUSA E AÇÃO DE CONTENÇÃO */}
          <div className="border-b border-black">
            <div className="bg-slate-200/90 print:bg-slate-200 px-2 py-1 font-bold text-xs uppercase border-b border-black">
              2. PRÉ-ANÁLISE DA CAUSA E AÇÃO DE CONTENÇÃO:
            </div>
            <div className="p-3 min-h-[75px] text-xs sm:text-[13px] whitespace-pre-line leading-relaxed">
              {currentNC.preAnaliseContencao?.descricao ? (
                <>
                  <p>{currentNC.preAnaliseContencao.descricao}</p>
                  {currentNC.preAnaliseContencao.responsavel && (
                    <div className="mt-2 text-[11px] text-slate-600">
                      <strong>Responsável Contenção:</strong> {currentNC.preAnaliseContencao.responsavel} |{' '}
                      <strong>Prazo Limite:</strong> {formatarData(currentNC.preAnaliseContencao.dataLimite)} |{' '}
                      <strong>Status:</strong> {currentNC.preAnaliseContencao.status}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-slate-400 italic">Nenhuma ação de contenção registrada.</span>
              )}
            </div>
          </div>

          {/* 3. ANÁLISE DA CAUSA RAIZ */}
          <div className="border-b border-black">
            <div className="bg-slate-200/90 print:bg-slate-200 px-2 py-1 font-bold text-xs uppercase border-b border-black">
              3. ANÁLISE DA CAUSA RAIZ:
            </div>
            <div className="p-3 min-h-[85px] text-xs sm:text-[13px] space-y-1.5 leading-relaxed">
              {currentNC.analiseCausaRaiz?.cincoPorques && currentNC.analiseCausaRaiz.cincoPorques.length > 0 ? (
                <div className="space-y-1">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-600 block">
                    Metodologia dos 5 Porquês:
                  </span>
                  {currentNC.analiseCausaRaiz.cincoPorques.map((pq, idx) => (
                    <div key={idx} className="pl-2 border-l-2 border-slate-300 text-xs">
                      {pq}
                    </div>
                  ))}
                </div>
              ) : null}

              {currentNC.analiseCausaRaiz?.detalhes && (
                <div className="mt-2 text-xs">
                  <strong>Conclusão da Causa Raiz:</strong> {currentNC.analiseCausaRaiz.detalhes}
                </div>
              )}

              {!currentNC.analiseCausaRaiz?.cincoPorques?.length && !currentNC.analiseCausaRaiz?.detalhes && (
                <span className="text-slate-400 italic">Em fase de investigação de causa raiz.</span>
              )}
            </div>
          </div>

          {/* 4. AÇÃO CORRETIVA */}
          <div className="border-b border-black">
            <div className="bg-slate-200/90 print:bg-slate-200 px-2 py-1 font-bold text-xs uppercase border-b border-black">
              4. AÇÃO CORRETIVA:
            </div>
            <div className="p-3 min-h-[85px] text-xs sm:text-[13px] whitespace-pre-line leading-relaxed">
              {currentNC.acaoCorretiva?.descricao ? (
                <div>
                  <p>{currentNC.acaoCorretiva.descricao}</p>
                  {currentNC.acaoCorretiva.comoSeraFeito && (
                    <p className="mt-1.5 text-xs text-slate-700">
                      <strong>Como será feito:</strong> {currentNC.acaoCorretiva.comoSeraFeito}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 italic">Plano de ação corretiva pendente de elaboração.</span>
              )}
            </div>

            {/* Responsável, Data, Assinatura Row */}
            <div className="grid grid-cols-12 border-t border-black text-xs">
              <div className="col-span-5 p-2 border-r border-black font-bold">
                Responsável: <span className="font-normal">{currentNC.responsavel || currentNC.acaoCorretiva?.responsavel || '-'}</span>
              </div>
              <div className="col-span-3 p-2 border-r border-black font-bold">
                Data: <span className="font-normal">{formatarData(currentNC.acaoCorretiva?.dataPrazo) || '-'}</span>
              </div>
              <div className="col-span-4 p-2 font-bold">
                Assinatura: <span className="font-normal italic text-[11px]">{currentNC.acaoCorretiva?.assinaturaResponsavel || '-'}</span>
              </div>
            </div>
          </div>

          {/* 6. VERIFICAÇÃO DA EFICÁCIA */}
          <div className="border-b border-black">
            <div className="bg-slate-200/90 print:bg-slate-200 px-2 py-1 font-bold text-xs uppercase border-b border-black">
              6. VERIFICAÇÃO DA EFICÁCIA:
            </div>

            {/* Verification Methods Checkboxes */}
            <div className="grid grid-cols-12 border-b border-black text-xs p-2 text-center font-medium">
              <div className="col-span-3 flex items-center justify-center gap-1.5">
                <span>{isDoc ? '( X )' : '(   )'}</span>
                <span>Documental</span>
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5">
                <span>{isVisual ? '( X )' : '(   )'}</span>
                <span>Visual</span>
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5">
                <span>{isEntrevista ? '( X )' : '(   )'}</span>
                <span>Entrevista</span>
              </div>
              <div className="col-span-3 flex items-center justify-center gap-1.5">
                <span>{isOutro ? '( X )' : '(   )'}</span>
                <span>Outro: <span className="underline">{currentNC.verificacaoEficacia?.outroMetodoDetalhe || '_________'}</span></span>
              </div>
            </div>

            {/* Avaliação de Risco residual */}
            <div className="p-2 border-b border-black text-xs font-semibold">
              Avaliação de Risco após tratamento da NC (Severidade x Probabilidade):{' '}
              <span className="font-bold text-sm bg-slate-200 px-1.5 py-0.5 rounded border border-black/30">
                {currentNC.verificacaoEficacia?.avaliacaoRiscoResidual?.codigo || '-'}
              </span>
              {currentNC.verificacaoEficacia?.avaliacaoRiscoResidual?.nivel && (
                <span className="ml-2 font-normal text-slate-600">
                  (Residual: {currentNC.verificacaoEficacia.avaliacaoRiscoResidual.nivel})
                </span>
              )}
            </div>

            {/* Encerrado SIM / NÃO Motivo */}
            <div className="p-2 border-b border-black text-xs font-bold flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>Encerrado:</span>
                <span className="flex items-center gap-1">
                  <span className="font-bold">{isEncerradoSim ? '■' : '□'}</span> SIM
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-bold">{isEncerradoNao ? '■' : '□'}</span> NÃO
                </span>
              </div>
              <div className="flex-1 font-normal">
                <strong>Motivo / Evidências:</strong> {currentNC.verificacaoEficacia?.motivo || currentNC.verificacaoEficacia?.evidencias || '-'}
              </div>
            </div>

            {/* Data & Auditor */}
            <div className="grid grid-cols-12 text-xs">
              <div className="col-span-6 p-2 border-r border-black font-bold">
                Data: <span className="font-normal">{formatarData(currentNC.verificacaoEficacia?.dataVerificacao) || '-'}</span>
              </div>
              <div className="col-span-6 p-2 font-bold">
                Auditor: <span className="font-normal">{currentNC.verificacaoEficacia?.auditorVerificador || currentNC.auditor || '-'}</span>
              </div>
            </div>
          </div>

          {/* Form Footer */}
          <div className="grid grid-cols-12 text-[11px] font-bold p-2 text-slate-800">
            <div className="col-span-4">{currentNC.codigoFormulario || 'F 001-29'}</div>
            <div className="col-span-4 text-center">R{currentNC.revisao || '00'}</div>
            <div className="col-span-4 text-right">{currentNC.dataEmissaoFormulario || '02/09/2025'}</div>
          </div>
        </div>
      </div>

      {/* Modal de Consulta ao Contexto Completo de Qualidade da OS */}
      {currentNC.origemImpactoMro && (
        <ImpactoQualityContextModal
          isOpen={isImpactoContextOpen}
          onClose={() => setIsImpactoContextOpen(false)}
          ordemServicoId={currentNC.origemImpactoMro.ordemServicoId}
        />
      )}
    </div>
  );
};
