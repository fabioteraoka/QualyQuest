import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import { ManualRecord, ConsultaManualResposta } from '../types';
import { sanitizeManualsForAPI } from '../utils/manualsStorage';

interface ManualsConsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  manuals: ManualRecord[];
  initialQuery?: string;
  onSelectRequirement?: (manualCodigo: string, capitulo: string, trecho: string) => void;
}

export const ManualsConsultModal: React.FC<ManualsConsultModalProps> = ({
  isOpen,
  onClose,
  manuals = [],
  initialQuery = '',
  onSelectRequirement,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaManualResposta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'Como proceder quando uma ferramenta estiver com calibração vencida?',
    'Qual é o procedimento para controle e distribuição de manuais com revisão atualizada?',
    'Qual o prazo padrão para elaboração e execução do plano de ação corretiva?',
    'Quais são os critérios mandatórios para inspeção de recebimento de peças?',
    'Como deve ser registrada a qualificação e treinamento dos executantes técnicos?',
  ];

  const handleSearch = async (queryString?: string) => {
    const q = queryString || query;
    if (!q.trim()) {
      setError('Digite uma dúvida ou selecione uma consulta sugerida.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sanitized = sanitizeManualsForAPI(manuals);
      let consultaData: ConsultaManualResposta | null = null;

      try {
        const response = await fetch('/api/consult-manuals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pergunta: q,
            manuals: sanitized,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.consulta) {
            consultaData = data.consulta;
          }
        }
      } catch (fetchErr) {
        console.warn('Backend manuals consult API unreachable, falling back locally:', fetchErr);
      }

      if (!consultaData) {
        const qLower = q.toLowerCase();
        const words = qLower.split(/[\s,.;]+/).filter(w => w.length > 3);
        
        let bestManual = manuals.find(m => 
          qLower.includes(m.codigo.toLowerCase()) || 
          qLower.includes(m.titulo.toLowerCase())
        );

        if (!bestManual && manuals.length > 0) {
          bestManual = manuals.find(m => 
            words.some(w => m.codigo.toLowerCase().includes(w) || m.titulo.toLowerCase().includes(w))
          );
        }

        if (bestManual) {
          let matchedCap = bestManual.capitulos?.find(c => 
            words.some(w => (c.titulo || '').toLowerCase().includes(w) || (c.requisitoTexto || '').toLowerCase().includes(w))
          );

          if (matchedCap) {
            consultaData = {
              pergunta: q,
              manualConsultado: `${bestManual.codigo} - ${bestManual.titulo}`,
              revisaoConsultada: bestManual.revisao || 'Não informada',
              resposta: `Com base nas diretrizes do manual ${bestManual.codigo} (${bestManual.titulo}), item ${matchedCap.numero} (${matchedCap.titulo}): ${matchedCap.requisitoTexto}`,
              citacoes: [
                {
                  capitulo: `${bestManual.codigo} - Item ${matchedCap.numero}`,
                  titulo: matchedCap.titulo,
                  trecho: matchedCap.requisitoTexto,
                }
              ],
              recomendacoesAuditoria: [
                'Verificar a conformidade do processo perante o requisito identificado;',
                'Comprovar registros operacionais e qualificação dos envolvidos;',
                'Formalizar o registro no SGQ em caso de desvio operacional.',
              ],
              nivelSuporteDocumental: 'Evidência moderada',
              justificativaSuporte: `Requisito localizado diretamente no manual cadastrado: ${bestManual.codigo}`,
              dataConsulta: new Date().toISOString(),
              origemMotor: 'MOTOR DETERMINÍSTICO',
            };
          } else {
            consultaData = {
              pergunta: q,
              manualConsultado: `${bestManual.codigo} - ${bestManual.titulo}`,
              revisaoConsultada: bestManual.revisao || 'Não informada',
              resposta: `O manual ${bestManual.codigo} (${bestManual.titulo}) foi consultado, mas nenhum requisito específico para o termo pesquisado foi localizado na estrutura cadastrada.`,
              citacoes: [],
              recomendacoesAuditoria: [
                'Consultar o gestor da qualidade para validação do procedimento aplicável;',
                'Verificar se o requisito faz parte de outro documento normativo.',
              ],
              nivelSuporteDocumental: 'Evidência insuficiente',
              justificativaSuporte: 'Nenhum item específico correspondente foi localizado na base cadastrada.',
              dataConsulta: new Date().toISOString(),
              origemMotor: 'MOTOR DETERMINÍSTICO',
            };
          }
        } else {
          consultaData = {
            pergunta: q,
            manualConsultado: 'Não localizado no repositório',
            revisaoConsultada: 'Não cadastrada',
            resposta: 'Nenhum manual correspondente aos termos consultados foi localizado no acervo cadastrado.',
            citacoes: [],
            recomendacoesAuditoria: [
              'Verifique se o manual ou norma de referência está cadastrado no acervo do SGQ.',
            ],
            nivelSuporteDocumental: 'Evidência insuficiente',
            justificativaSuporte: 'Acervo não contém documentos correspondentes aos termos consultados.',
            dataConsulta: new Date().toISOString(),
            origemMotor: 'MOTOR DETERMINÍSTICO',
          };
        }
      }

      setResult(consultaData);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao processar consulta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `CONSULTA AOS MANUAIS INTERNOS SGQ:
Pergunta: ${result.pergunta}
Manual: ${result.manualConsultado} (${result.revisaoConsultada})

RESPOSTA / DIRETRIZ:
${result.resposta}

CITAÇÕES DOS REQUISITOS:
${result.citacoes.map((c) => `- ${c.capitulo} [${c.titulo}]: ${c.trecho}`).join('\n')}

RECOMENDAÇÕES DE AUDITORIA:
${(result.recomendacoesAuditoria || []).map((r) => `• ${r}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Consulta Inteligente à Biblioteca de Manuais e Procedimentos
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  {manuals.length} Manuais Ativos
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                A IA analisa todo o acervo de manuais internos e procedimentos da empresa para responder dúvidas e encontrar o enquadramento exato.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          {/* Search Box */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              O que você deseja consultar nos manuais ou procedimentos internos da empresa?
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: Como proceder se o torquímetro estiver vencido? Qual o prazo para ação de contenção?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-inner"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Pesquisando no Acervo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Consultar IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-500">Exemplos rápidos de consulta:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      handleSearch(q);
                    }}
                    className="text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/80 transition-colors text-left font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <X className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Answer Card */}
              <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                      {result.manualConsultado}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {result.revisaoConsultada}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Confiança: {result.nivelConfianca}%
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado' : 'Copiar Resposta'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Diretriz e Parecer Técnico do Procedimento:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-normal bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100 whitespace-pre-line">
                    {result.resposta}
                  </p>
                </div>
              </div>

              {/* Citations / Requisitos citados */}
              {result.citacoes && result.citacoes.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Requisitos e Capítulos Regulamentares Citados ({result.citacoes.length})
                  </h4>

                  <div className="grid grid-cols-1 gap-2.5">
                    {result.citacoes.map((cit, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {cit.capitulo}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{cit.titulo}</span>
                          </div>

                          {onSelectRequirement && (
                            <button
                              onClick={() => onSelectRequirement(result.manualConsultado, cit.capitulo, cit.trecho)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <span>Usar Requisito</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">
                          "{cit.trecho}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendações de Auditoria */}
              {result.recomendacoesAuditoria && result.recomendacoesAuditoria.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Recomendações Práticas de Auditoria & Ação:
                  </span>
                  <ul className="space-y-1.5">
                    {result.recomendacoesAuditoria.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Pesquisa em tempo real na base de dados de manuais integrais ({manuals.length} manuais cadastrados)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
