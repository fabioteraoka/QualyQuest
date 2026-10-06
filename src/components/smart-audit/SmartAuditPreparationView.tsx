import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  AlertCircle,
  HelpCircle,
  Camera,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  Check,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  RequisitoClienteItem,
  ResultadoAvaliacaoRequisito,
  ControleCentralSGQ,
  DocumentoControlado
} from '../../types';
import { ResultadoAvaliacaoInteligenteItem } from '../../services/smartAuditEngine';

interface SmartAuditPreparationViewProps {
  itens: ResultadoAvaliacaoInteligenteItem[];
  documentos: DocumentoControlado[];
  currentBaseCodigo: string;
  onAnswerQuestion: (item: ResultadoAvaliacaoInteligenteItem, resposta: 'SIM' | 'NAO') => Promise<void>;
  onAcceptSuggestion: (item: ResultadoAvaliacaoInteligenteItem, status: 'ACEITO' | 'REJEITADO' | 'EDITADO', texto?: string) => Promise<void>;
  onOpenEvidenceModal: (item: ResultadoAvaliacaoInteligenteItem, tipo: 'FOTO' | 'DOCUMENTO') => void;
  onOpenRNCModal: (item: ResultadoAvaliacaoInteligenteItem) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const SmartAuditPreparationView: React.FC<SmartAuditPreparationViewProps> = ({
  itens,
  documentos,
  currentBaseCodigo,
  onAnswerQuestion,
  onAcceptSuggestion,
  onOpenEvidenceModal,
  onOpenRNCModal,
  onNavigateToTab,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [customResponseText, setCustomResponseText] = useState<string>('');

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (resultado: ResultadoAvaliacaoRequisito) => {
    switch (resultado) {
      case 'CONFORME':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Conforme
          </span>
        );
      case 'NAO_CONFORME':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Não Conforme
          </span>
        );
      case 'ATENCAO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Atenção
          </span>
        );
      case 'VERIFICACAO_NECESSARIA':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-950/80 text-sky-300 border border-sky-800 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            Verificação Necessária
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {resultado}
          </span>
        );
    }
  };

  const getAcceptanceBadge = (status?: string) => {
    switch (status) {
      case 'RESPOSTA_ACEITA':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Resposta Aceita pelo Cliente (Alto Valor)
          </span>
        );
      case 'RESPOSTA_REJEITADA':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-700/60 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Resposta Rejeitada Anteriormente
          </span>
        );
      case 'RESPOSTA_ENVIADA':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            Resposta Enviada (Sem aceite formal)
          </span>
        );
      case 'RNC_ENCERRADA_INTERNAMENTE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            RNC Encerrada Internamente
          </span>
        );
      case 'ACAO_EFICAZ':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-700/60 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Ação com Eficácia Verificada
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
            Aceitação Não Confirmada
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Orientativo do Fluxo B */}
      <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border border-sky-800/40 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Fluxo B — Preparação Inteligente de Auditoria Requisito a Requisito
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
              O QualiGest analisa cada item do checklist de auditoria, cruza com a memória de auditorias anteriores,
              identifica quais procedimentos estão vigentes e alerta se houve revisão documental recente.
              Nenhuma resposta histórica é copiada cegamente: o auditor valida lacunas e sustentações antes da inspeção.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Itens com Estrutura Completa de Análise */}
      <div className="space-y-4">
        {itens.map((item) => {
          const req = item.requisito;
          const hist = item.respostaHistorica;
          const temHist = Boolean(hist);
          const isExpanded = expandedId === req.id || item.isExcecao;

          return (
            <div
              key={req.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                item.resultado === 'NAO_CONFORME'
                  ? 'border-rose-900/60 shadow-lg shadow-rose-950/10'
                  : item.resultado === 'ATENCAO'
                  ? 'border-amber-900/60 shadow-lg shadow-amber-950/10'
                  : item.resultado === 'VERIFICACAO_NECESSARIA'
                  ? 'border-sky-900/60 shadow-lg shadow-sky-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header do Card com Resumo */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-sky-400 bg-sky-950 border border-sky-800/60 px-2.5 py-0.5 rounded-lg">
                      {req.numeroItem}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {req.clienteNome}
                    </span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {req.programaCodigo}
                    </span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-400">
                      {req.categoria || 'Geral'}
                    </span>
                    {req.criticidade && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          req.criticidade === 'CRITICO'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {req.criticidade}
                      </span>
                    )}
                    {temHist && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Histórico Disponível
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight">{req.tituloCurto}</h4>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {getStatusBadge(item.resultado)}
                  <button
                    onClick={() => toggleExpand(req.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Corpo Detalhado */}
              {isExpanded && (
                <div className="p-5 pt-0 space-y-5 border-t border-slate-800/60 bg-slate-950/40">
                  {/* 1. REQUISITO ORIGINAL DO CLIENTE */}
                  <div className="mt-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      1. Requisito Original Recebido do Cliente / Autoridade
                    </div>
                    <p className="text-xs text-slate-200 italic font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                      "{req.textoOriginal}"
                    </p>
                    {req.criterioAceitacao && (
                      <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-300">Critério de Aceitação:</span>
                        <span>{req.criterioAceitacao}</span>
                      </div>
                    )}
                  </div>

                  {/* 2. O QUE JÁ TEMOS NO QUALIGEST */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                      2. O Que Já Temos no QualiGest SGQ
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">Procedimentos & Manuais Relacionados:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.oQueJaTemos.procedimentos.map((p, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 font-mono">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] font-medium">Evidências / Registros Disponíveis:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.oQueJaTemos.evidencias.length > 0 ? (
                            item.oQueJaTemos.evidencias.map((e, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                {e}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Nenhuma evidência documental direta anexada</span>
                          )}
                        </div>
                      </div>

                      {item.oQueJaTemos.treinamento && (
                        <div>
                          <span className="text-slate-400 text-[11px] font-medium">Treinamento Mandatório:</span>
                          <span className="ml-1 text-slate-200 font-mono">{item.oQueJaTemos.treinamento}</span>
                        </div>
                      )}

                      {item.oQueJaTemos.rncRelacionada && (
                        <div>
                          <span className="text-slate-400 text-[11px] font-medium">RNC Relacionada:</span>
                          <span className="ml-1 text-rose-300 font-mono">{item.oQueJaTemos.rncRelacionada}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. MEMÓRIA HISTÓRICA / "Já recebemos algo parecido?" */}
                  {hist ? (
                    <div className="bg-slate-900/90 border border-purple-900/40 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                            3. Memória Histórica — Precedentes Anteriores
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAcceptanceBadge(hist.statusAceitacao)}
                          <span className="text-[10px] font-mono text-slate-400">
                            Peso de Confiança: {hist.pesoConfiabilidade}%
                          </span>
                        </div>
                      </div>

                      {/* Regra Fundamental 3: Precedente NÃO é verdade regulatória */}
                      <div className="px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-600/50 text-amber-300 text-[11px] font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>PRECEDENTE INTERNO DE AUDITORIA — NÃO CONSTITUI VERDADE REGULATÓRIA</span>
                      </div>

                      {/* Alerta Temporal de Revisão Documental (Item 14 do brief) */}
                      {hist.alertaRevisao && (
                        <div
                          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                            hist.revisaoMudou
                              ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                              : 'bg-slate-950/80 border-slate-800 text-slate-300'
                          }`}
                        >
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${hist.revisaoMudou ? 'text-amber-400' : 'text-slate-400'}`} />
                          <div className="space-y-0.5">
                            <span className="font-bold">Controle Documental & Revisão Temporal:</span>
                            <p className="text-[11px]">{hist.alertaRevisao}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Auditoria Anterior de Referência:</span>
                          <span className="text-white font-semibold">
                            {hist.numeroAuditoria} ({hist.cliente}) • {hist.anoOuData}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[11px]">Decisão Oficial do Auditor Externo:</span>
                          <span className="text-slate-200">{hist.decisaoAuditorDetalhe}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] mb-1">Resposta Técnica Utilizada Anteriormente:</span>
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200 italic font-mono">
                          "{hist.respostaUtilizada}"
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 italic flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-500" />
                      <span><strong>Precedente de Auditoria:</strong> Nenhum finding ou auditoria anterior equivalente localizada. Declaração de GAP aplicável se não houver procedimento formal.</span>
                    </div>
                  )}

                  {/* 4. PROPOSTA DE RESPOSTA INTELIGENTE E SUSTENTAÇÃO */}
                  <div className="bg-slate-900 border border-sky-900/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        4. Resposta Sugerida pela IA (Categorização Rigorosa de Fontes)
                      </span>
                      {editingResponseId !== req.id && (
                        <button
                          onClick={() => {
                            setEditingResponseId(req.id);
                            setCustomResponseText(item.propostaResposta.textoRespostaSugerida);
                          }}
                          className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                        >
                          Personalizar / Editar
                        </button>
                      )}
                    </div>

                    {/* Classificação das 5 Fontes Utilizadas */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {req.referenciaNormativa && (
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50 font-semibold">
                          [A. FONTE REGULATÓRIA] {req.referenciaNormativa}
                        </span>
                      )}
                      {item.oQueJaTemos.procedimentos.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 font-semibold">
                          [B. FONTE INTERNA] {item.oQueJaTemos.procedimentos[0]}
                        </span>
                      )}
                      {item.evidenciasIdentificadas.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-semibold">
                          [C. EVIDÊNCIA] {item.evidenciasIdentificadas.length} Registro(s)
                        </span>
                      )}
                      {hist && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50 font-semibold">
                          [D. PRECEDENTE] {hist.numeroAuditoria}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        [E. INFERÊNCIA DA IA] Assistida
                      </span>
                    </div>

                    {editingResponseId === req.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={customResponseText}
                          onChange={(e) => setCustomResponseText(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-950 border border-sky-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingResponseId(null)}
                            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              await onAcceptSuggestion(item, 'EDITADO', customResponseText);
                              setEditingResponseId(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Salvar Edição
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-200 italic font-mono leading-relaxed">
                        "{item.propostaResposta.textoRespostaSugerida}"
                      </div>
                    )}

                    {/* Botões de Decisão Humana Obrigatória */}
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                      <span>
                        Base Normativa: <strong>{item.propostaResposta.baseDaResposta.join(', ') || 'Normas Aeronáuticas'}</strong>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onAcceptSuggestion(item, 'REJEITADO')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() => onAcceptSuggestion(item, 'EDITADO', item.propostaResposta.textoRespostaSugerida + ' [Em Revisão Técnica]')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-950 hover:text-amber-300 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Marcar para Revisão
                        </button>
                        <button
                          onClick={() => onAcceptSuggestion(item, 'ACEITO')}
                          className="px-3 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Adotar Resposta
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5. O QUE FALTA, O QUE DEVEMOS VERIFICAR E ONDE BUSCAR */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-rose-950/60">
                      <div className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">
                        O Que Falta
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.oQueFalta}</p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-amber-950/60">
                      <div className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">
                        O Que Devemos Verificar
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.oQueDevemosVerificar}</p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-sky-950/60">
                      <div className="text-[10px] font-bold uppercase text-sky-400 tracking-wider">
                        Onde Buscar no QualiGest
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-semibold">{item.ondeBuscar}</p>
                      {item.ondeBuscar.includes('Treinamentos') && onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('competencies')}
                          className="mt-2 text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                        >
                          Ir para Pessoas & Competências <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {item.ondeBuscar.includes('Metrologia') && onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('metrologia-ferramental')}
                          className="mt-2 text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                        >
                          Ir para Ferramental & Calibração <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {item.ondeBuscar.includes('Controle Documental') && onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('document-control')}
                          className="mt-2 text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                        >
                          Ir para Controle Documental <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 6. AÇÕES COMPLEMENTARES DE EXCEÇÃO */}
                  {item.isExcecao && (
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenEvidenceModal(item, 'FOTO')}
                          className="px-3 py-1.5 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-semibold border border-sky-800 flex items-center gap-1.5 transition-all"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Anexar Foto do Pátio/Hangar
                        </button>
                        <button
                          onClick={() => onOpenEvidenceModal(item, 'DOCUMENTO')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          Anexar Documento/Certificado
                        </button>
                      </div>

                      {item.resultado === 'NAO_CONFORME' && (
                        <button
                          onClick={() => onOpenRNCModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Abrir RNC F 001-29 Imediata
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
