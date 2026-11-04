import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { ResultadoEnquadramentoNC } from '../../types/aiKnowledgeBase';

interface NcEnquadramentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  codigoManualSugerido?: string;
}

export const NcEnquadramentoModal: React.FC<NcEnquadramentoModalProps> = ({
  isOpen,
  onClose,
  codigoManualSugerido,
}) => {
  const [descricaoNC, setDescricaoNC] = useState(
    'Torquímetro de precisão utilizado na montagem dos freios da aeronave PR-WKL com certificado de calibração vencido há 42 dias no setor REC/Manutenção.'
  );
  const [subitemCitado, setSubitemCitado] = useState('3.4.3');
  const [manualCitado, setManualCitado] = useState(codigoManualSugerido || 'MOMQ');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnquadramentoNC | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimularEnquadramento = async () => {
    if (!descricaoNC.trim()) {
      setError('Informe a descrição da Não Conformidade para enquadrar.');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const response = await fetch('/api/manuals/enquadrar-nc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricaoNC,
          subitemCitado: subitemCitado || undefined,
          manualCitado: manualCitado || undefined,
          setor: 'REC - Manutenção / Calibração',
          categoria: 'Calibração e Metrologia',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Erro ao processar enquadramento');
      }

      const data = await response.json();
      setResultado(data.resultado);
    } catch (err: any) {
      setError(err.message || 'Falha ao executar enquadramento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-indigo-950 text-white flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Simulador de Enquadramento de NC com IA
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                  Anti-Alucinação Ativa
                </span>
              </h3>
              <p className="text-xs text-indigo-200">
                Consulta os fragmentos completos e declara explicitamente ausência de requisitos se não houver evidências suficientes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 bg-slate-50 flex-1">
          {/* Input Form */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Descrição do Fato / Desvio da Não Conformidade:
              </label>
              <textarea
                rows={3}
                value={descricaoNC}
                onChange={(e) => setDescricaoNC(e.target.value)}
                placeholder="Descreva o fato constatado na auditoria ou inspeção operacional..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Manual Citado (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: MOMQ ou RBAC 145"
                  value={manualCitado}
                  onChange={(e) => setManualCitado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subitem Específico (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: 3.4.3 ou 145.109"
                  value={subitemCitado}
                  onChange={(e) => setSubitemCitado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                A IA não cria requisitos fictícios. Se o requisito não existir, ela declarará insuficiência documental.
              </span>
              <button
                type="button"
                onClick={handleSimularEnquadramento}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Consultando Acervo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enquadrar contra o Acervo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {resultado && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Verdict Header */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                resultado.requisitoEncontrado
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    resultado.requisitoEncontrado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {resultado.requisitoEncontrado ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider">{resultado.veredicto}</span>
                      <span className="text-[10px] font-mono bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                        {resultado.nivelCerteza}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">{resultado.justificativa}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] block opacity-75">Pontuação de Confiança</span>
                  <span className="text-xl font-black">{resultado.pontuacaoConfianca}%</span>
                </div>
              </div>

              {/* Exact Citations */}
              {resultado.citacoes && resultado.citacoes.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Citações e Requisitos Técnicos Enquadrados ({resultado.citacoes.length})
                  </h4>

                  <div className="space-y-3">
                    {resultado.citacoes.map((cit, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold rounded border border-indigo-200 text-xs">
                              Item {cit.subitem}
                            </span>
                            <span className="font-bold text-slate-800">
                              {cit.manual} ({cit.revisao})
                            </span>
                            <span className="text-slate-500">
                              Cap. {cit.capitulo} • Seção {cit.secao}
                            </span>
                          </div>
                          {cit.pagina && (
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-700 text-[10px]">
                              Página {cit.pagina}
                            </span>
                          )}
                        </div>

                        <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-100">
                          {cit.textoIntegral}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1">
                          {cit.procedimento && (
                            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                              <strong className="text-blue-900 block">Procedimento Relacionado:</strong>
                              <span className="text-blue-800">{cit.procedimento}</span>
                            </div>
                          )}
                          {cit.responsabilidades && cit.responsabilidades.length > 0 && (
                            <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                              <strong className="text-amber-900 block">Responsabilidades Estabelecidas:</strong>
                              <span className="text-amber-800">{cit.responsabilidades.join(', ')}</span>
                            </div>
                          )}
                          {cit.controlesObrigatorios && cit.controlesObrigatorios.length > 0 && (
                            <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                              <strong className="text-emerald-900 block">Controles Obrigatórios:</strong>
                              <span className="text-emerald-800">{cit.controlesObrigatorios.join(', ')}</span>
                            </div>
                          )}
                          {cit.evidenciasExigidas && cit.evidenciasExigidas.length > 0 && (
                            <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                              <strong className="text-purple-900 block">Evidências Exigidas:</strong>
                              <span className="text-purple-800">{cit.evidenciasExigidas.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Audit Validation */}
              {resultado.validacaoRevisao && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block text-xs">Validação de Revisão e Vigência Temporal:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 block">Revisão Vigente:</span>
                      <span className="font-bold text-slate-800">{resultado.validacaoRevisao.revisaoVigente}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 block">Revisão Aplicável:</span>
                      <span className="font-bold text-slate-800">{resultado.validacaoRevisao.revisaoAplicavel}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 block">Status de Vigência:</span>
                      <span className="font-bold text-emerald-700">{resultado.validacaoRevisao.statusVigencia}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Plan Suggestions */}
              {resultado.acaoCorretivaSugerida && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 block">Proposta de Ação Corretiva Alinhada ao Requisito:</span>
                  <div className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100 text-indigo-950 whitespace-pre-line leading-relaxed">
                    {resultado.acaoCorretivaSugerida}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors"
          >
            Fechar Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
