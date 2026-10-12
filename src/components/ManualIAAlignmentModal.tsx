import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  RefreshCw,
  Link,
  ArrowRight,
  HelpCircle,
  History,
  Info,
  Check,
  UploadCloud,
  Layers,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import {
  DocumentoControlado,
  ManualRecord,
  UserProfile,
  LogVerificacaoFonteExterna
} from '../types';
import {
  DiagnosticoAlinhamentoManualIA,
  verificarAlinhamentoManualIA,
  executarVerificacaoAlinhamentoBancoIA,
  atualizarManualNoBancoIAControlado,
  vincularDocumentoAoManualIA
} from '../services/manualsCrossCheckService';

interface ManualIAAlignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: DocumentoControlado | null;
  organizationId: string;
  manuals: ManualRecord[];
  currentUser?: UserProfile | null;
  logsVerificacao?: LogVerificacaoFonteExterna[];
  onManualsUpdated?: () => void;
  showToast?: (message: string) => void;
}

export const ManualIAAlignmentModal: React.FC<ManualIAAlignmentModalProps> = ({
  isOpen,
  onClose,
  documento,
  organizationId,
  manuals = [],
  currentUser,
  logsVerificacao = [],
  onManualsUpdated,
  showToast
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoAlinhamentoManualIA | null>(null);
  
  // Estado para Atualização Controlada do Banco IA
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);
  const [novaRevisao, setNovaRevisao] = useState('');
  const [novaDataVigencia, setNovaDataVigencia] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [novoResumo, setNovoResumo] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Estado para Vinculação Manual (quando não há correspondência automática segura)
  const [selectedManualIdToLink, setSelectedManualIdToLink] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Recalcular diagnóstico sempre que o documento abrir ou manuais mudarem
  useEffect(() => {
    if (documento && isOpen) {
      const diag = verificarAlinhamentoManualIA(documento, manuals);
      setDiagnostico(diag);
      setIsConfirmUpdateOpen(false);
      setNovaRevisao(diag.revisaoOficialReferencia || documento.numeroRevisao || '');
      setNovaDataVigencia(diag.dataOficialReferencia || new Date().toISOString().split('T')[0]);
      setJustificativa(
        `Alinhamento e atualização da referência no Banco de Manuais (IA) com base no controle oficial de revisões do Acervo SGQ (${documento.codigo}).`
      );
      setNovoResumo(
        diag.manualIA?.descricaoResumo ||
        `${documento.codigo} — ${documento.titulo}. Revisão oficial: ${diag.revisaoOficialReferencia || documento.numeroRevisao}.`
      );
    } else {
      setDiagnostico(null);
    }
  }, [documento, isOpen, manuals]);

  // Histórico de logs para este documento com o Banco IA
  const historicoLogs = useMemo(() => {
    if (!documento) return [];
    return logsVerificacao
      .filter(
        (log) =>
          (log.documentoId === documento.id || log.codigoDocumento === documento.codigo) &&
          (log.fonteNome.includes('Banco de Manuais') || log.fonteId === 'banco-manuais-ia')
      )
      .sort((a, b) => new Date(b.dataVerificacao).getTime() - new Date(a.dataVerificacao).getTime());
  }, [documento, logsVerificacao]);

  if (!isOpen || !documento) return null;

  // Handler para re-executar a verificação e persistir a evidência
  const handleExecutarVerificacaoPersistida = async () => {
    try {
      setIsVerifying(true);
      const diag = await executarVerificacaoAlinhamentoBancoIA(
        organizationId,
        documento,
        manuals,
        currentUser
      );
      setDiagnostico(diag);
      setNovaRevisao(diag.revisaoOficialReferencia || documento.numeroRevisao || '');
      setNovaDataVigencia(diag.dataOficialReferencia || new Date().toISOString().split('T')[0]);
      if (showToast) {
        showToast(`Verificação com Banco de Manuais (IA) concluída: ${diag.statusSincroniaIA}`);
      }
    } catch (err: any) {
      console.error('Erro na verificação com Banco IA:', err);
      alert(`Falha na verificação: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handler para submeter a atualização controlada do manual no Banco IA
  const handleConfirmarAtualizacaoControlada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnostico?.manualIA) {
      alert('Manual correspondente no Banco IA não encontrado.');
      return;
    }
    if (!novaRevisao.trim()) {
      alert('Informe a nova revisão.');
      return;
    }
    if (!justificativa.trim() || justificativa.trim().length < 10) {
      alert('Por favor, informe uma justificativa técnica formal (mínimo 10 caracteres) para a governança SGQ.');
      return;
    }

    try {
      setIsSubmittingUpdate(true);
      const res = await atualizarManualNoBancoIAControlado({
        organizationId,
        manualId: diagnostico.manualIA.id,
        docId: documento.id,
        novaRevisao: novaRevisao.trim(),
        novaDataVigencia: novaDataVigencia || new Date().toISOString().split('T')[0],
        novoConteudoTexto: novoResumo.trim() ? novoResumo : undefined,
        justificativaAtualizacao: justificativa.trim(),
        currentUser,
        manualExistente: diagnostico.manualIA,
        docControlado: documento,
      });

      if (!res.sucesso) {
        throw new Error(res.mensagem);
      }

      if (showToast) {
        showToast(res.mensagem);
      }
      if (onManualsUpdated) {
        onManualsUpdated();
      }
      setIsConfirmUpdateOpen(false);

      // Re-executa verificação para atualizar estado
      await handleExecutarVerificacaoPersistida();
    } catch (err: any) {
      alert(`Erro na atualização controlada: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Handler para vincular manualmente um manual existente do Banco IA
  const handleVincularManualManualmente = async () => {
    if (!selectedManualIdToLink) {
      alert('Selecione um manual da lista para vincular.');
      return;
    }
    const manualAlvo = manuals.find((m) => m.id === selectedManualIdToLink);
    if (!manualAlvo) {
      alert('Manual selecionado não encontrado.');
      return;
    }

    try {
      setIsLinking(true);
      const res = await vincularDocumentoAoManualIA(
        organizationId,
        documento,
        manualAlvo,
        currentUser
      );

      if (!res.sucesso) {
        throw new Error(res.mensagem);
      }

      if (showToast) {
        showToast(res.mensagem);
      }
      if (onManualsUpdated) {
        onManualsUpdated();
      }

      // Re-executa verificação após vincular
      const diag = await executarVerificacaoAlinhamentoBancoIA(
        organizationId,
        { ...documento, manualIAId: manualAlvo.id },
        manuals,
        currentUser
      );
      setDiagnostico(diag);
    } catch (err: any) {
      alert(`Falha ao vincular manual: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Verificação de Alinhamento com Banco de Manuais (IA)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Referência para NCs
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Garante que o conteúdo consultado pela IA nas análises de Não Conformidades corresponda à revisão oficial vigente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Card Resumo do Documento Controlado no Acervo */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  Documento Controlado no Acervo SGQ
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                  <span>{documento.codigo}</span>
                  <span className="text-xs font-normal text-slate-300">— {documento.titulo}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Revisão no Acervo:</span>
                <span className="text-xs font-bold text-sky-400 font-mono">
                  {documento.numeroRevisao || documento.revisaoVigenteNumero || 'Pendente'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div>
                <span className="text-slate-400 block">Emissor / Órgão:</span>
                <span className="text-slate-200 font-medium">{documento.emissor || 'SGQ'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Categoria:</span>
                <span className="text-slate-200 font-medium">{documento.categoria?.replace('DOCUMENTO_', '') || 'Geral'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Arquivo Digital:</span>
                <span className={documento.arquivoNome ? 'text-emerald-400 font-mono' : 'text-slate-400'}>
                  {documento.arquivoNome ? 'Disponível no Acervo' : 'Apenas Controle de Revisões'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Tipo de Verificação:</span>
                <span className={documento.tipoVerificacao === 'AUTOMATICO' ? 'text-indigo-400 font-medium' : 'text-amber-400 font-medium'}>
                  {documento.tipoVerificacao === 'AUTOMATICO' ? 'Automática (APIs)' : 'Manual (Portal/Cliente)'}
                </span>
              </div>
            </div>
          </div>

          {/* Comparativo de Fontes & Diagnóstico */}
          {diagnostico && (
            <div className="space-y-4">
              {/* Cards de Comparação Lado a Lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Lado 1: Referência Oficial Mais Recente */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      Referência Oficial Mais Recente
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        diagnostico.revisaoOficialReferencia
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      {diagnostico.revisaoOficialReferencia ? 'Evidência Identificada' : 'Não Confirmada'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xl font-bold font-mono text-white">
                      {diagnostico.revisaoOficialReferencia || 'Revisão Não Confirmada'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Data da Referência:{' '}
                      <span className="font-mono text-slate-300">
                        {diagnostico.dataOficialReferencia || 'Sem data'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Fonte de Determinação:{' '}
                      <span className="text-sky-300 font-medium">
                        {diagnostico.origemReferenciaOficial}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado 2: Conteúdo no Banco de Manuais (IA) */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-400" />
                      Banco de Manuais (IA) — Consulta NCs
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        diagnostico.manualIA
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {diagnostico.manualIA ? `Vínculo: ${diagnostico.metodoCorrespondencia}` : 'Sem Manual'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xl font-bold font-mono text-white">
                      {diagnostico.manualIA
                        ? diagnostico.manualIA.revisao || 'Sem revisão declarada'
                        : 'Manual Não Localizado'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Data no Banco IA:{' '}
                      <span className="font-mono text-slate-300">
                        {diagnostico.manualIA?.dataVigencia || diagnostico.manualIA?.atualizadoEm || 'N/A'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 truncate" title={diagnostico.manualIA?.titulo}>
                      Manual IA:{' '}
                      <span className="text-purple-300 font-medium">
                        {diagnostico.manualIA ? `${diagnostico.manualIA.codigo} — ${diagnostico.manualIA.titulo}` : 'Nenhum'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner de Diagnóstico e Alerta Principal */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  diagnostico.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : diagnostico.statusSincroniaIA === 'ACERVO_DESATUALIZADO'
                    ? 'bg-sky-950/30 border-sky-500/40 text-sky-200'
                    : diagnostico.statusSincroniaIA === 'SINCRONIZADO'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : diagnostico.statusSincroniaIA === 'SEM_CORRESPONDENCIA'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-slate-950/40 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {diagnostico.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : diagnostico.statusSincroniaIA === 'SINCRONIZADO' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold text-xs uppercase tracking-wide">
                      {diagnostico.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' && 'Alerta de Desatualização no Banco de Manuais (IA)'}
                      {diagnostico.statusSincroniaIA === 'SINCRONIZADO' && 'Banco de Manuais (IA) em Conformidade e Sincronizado'}
                      {diagnostico.statusSincroniaIA === 'ACERVO_DESATUALIZADO' && 'Atenção: Banco IA com Revisão Mais Recente que o Acervo'}
                      {diagnostico.statusSincroniaIA === 'SEM_CORRESPONDENCIA' && 'Atenção: Sem Correspondência Confiável no Banco IA'}
                      {diagnostico.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA' && 'Atualização Não Pôde Ser Confirmada (Evidência Insuficiente)'}
                    </span>
                    <p className="text-xs leading-relaxed opacity-95">
                      {diagnostico.mensagemAlerta}
                    </p>
                  </div>
                </div>

                {/* Orientação da Ação Necessária */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-300">
                    <strong className="text-white">Ação recomendada: </strong>
                    {diagnostico.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' &&
                      'Atualizar a revisão do manual no Banco IA para evitar fundamentação de NCs em norma desatualizada.'}
                    {diagnostico.statusSincroniaIA === 'SINCRONIZADO' &&
                      'Nenhuma ação necessária. Conteúdo validado para uso pelas rotinas de inteligência artificial.'}
                    {diagnostico.statusSincroniaIA === 'SEM_CORRESPONDENCIA' &&
                      'Vincular o documento manualmente ou disponibilizá-lo para que a IA possa utilizá-lo.'}
                    {diagnostico.statusSincroniaIA === 'REVISAO_NAO_CONFIRMADA' &&
                      'Registrar a revisão oficial com evidência documental comprobatória antes de atestar conformidade.'}
                  </div>

                  {/* Botões de Ação Dinâmicos Conforme Diagnóstico */}
                  {diagnostico.statusSincroniaIA === 'BANCO_IA_DESATUALIZADO' && (
                    <button
                      type="button"
                      onClick={() => setIsConfirmUpdateOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Atualizar Banco IA (Controlado)</span>
                    </button>
                  )}

                  {diagnostico.statusSincroniaIA === 'SEM_CORRESPONDENCIA' && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedManualIdToLink}
                        onChange={(e) => setSelectedManualIdToLink(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white max-w-[200px]"
                      >
                        <option value="">Selecionar Manual IA...</option>
                        {manuals.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.codigo} — {m.titulo} ({m.revisao})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleVincularManualManualmente}
                        disabled={!selectedManualIdToLink || isLinking}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>{isLinking ? 'Vinculando...' : 'Vincular'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Painel de Formulário para Atualização Controlada do Banco IA */}
              {isConfirmUpdateOpen && (
                <form
                  onSubmit={handleConfirmarAtualizacaoControlada}
                  className="p-4 rounded-xl bg-slate-950 border border-rose-500/50 space-y-4 animate-fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <span className="font-bold text-white text-xs">
                        Fluxo de Atualização Controlada do Banco de Manuais (IA)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConfirmUpdateOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <strong>Regra de Governança SGQ:</strong> A atualização não é executada automaticamente sem supervisão. Revise a nova revisão, confirme a data e forneça a justificativa técnica para registro auditável.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Nova Revisão Vigente no Banco IA:
                      </label>
                      <input
                        type="text"
                        value={novaRevisao}
                        onChange={(e) => setNovaRevisao(e.target.value)}
                        placeholder="Ex: Rev. 12"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Data de Vigência / Publicação:
                      </label>
                      <input
                        type="date"
                        value={novaDataVigencia}
                        onChange={(e) => setNovaDataVigencia(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Justificativa Técnica da Atualização (Obrigatória para Auditoria SGQ):
                    </label>
                    <textarea
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      rows={2}
                      placeholder="Descreva a razão do alinhamento (ex: Nova revisão emitida pelo fabricante e adotada pela qualidade)..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsConfirmUpdateOpen(false)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingUpdate}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSubmittingUpdate ? 'Registrando Atualização...' : 'Confirmar e Atualizar Banco IA'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Seção 6: Registro Histórico de Verificações com o Banco IA */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-400" />
                Histórico Rastreável de Consultas & Alinhamento
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {historicoLogs.length} registro(s) encontrado(s)
              </span>
            </div>

            {historicoLogs.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-center text-slate-500 text-[11px]">
                Nenhuma verificação prévia registrada para este documento com o Banco de Manuais (IA). Execute uma consulta para iniciar o histórico de auditoria.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {historicoLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-[11px]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.statusVerificacao === 'CONFORME'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : log.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA'
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {log.statusVerificacao}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(log.dataVerificacao).toLocaleString('pt-BR')}
                        </span>
                        <span className="text-slate-500">• Por: {log.executadoPor}</span>
                      </div>
                      <p className="text-slate-300 leading-snug">{log.mensagem}</p>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px]">
                      <span className="text-slate-400 block">IA: {log.revisaoIdentificadaNaFonte}</span>
                      <span className="text-slate-400 block">Acervo: {log.revisaoAtualControlada}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Consultas registradas em conformidade com RBAC 145.109 e ISO 9001:2015.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecutarVerificacaoPersistida}
              disabled={isVerifying}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Verificando...' : 'Reexecutar Verificação'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
