import React from 'react';
import { ExplicacaoIAItem, OntologicalClassification } from '../types';
import { Sparkles, X, Info, CheckCircle2, BookOpen, FileText, Award, HelpCircle } from 'lucide-react';

interface AIExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  explicacao: ExplicacaoIAItem | null;
}

export const AIExplanationModal: React.FC<AIExplanationModalProps> = ({
  isOpen,
  onClose,
  explicacao,
}) => {
  if (!isOpen || !explicacao) return null;

  const getOntologyBadge = (ont: OntologicalClassification) => {
    switch (ont) {
      case 'FACT':
        return {
          label: 'FATO DOCUMENTAL',
          desc: 'Informação extraída diretamente de documento ou evidência objetiva auditada.',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
      case 'USER_RESPONSE':
        return {
          label: 'RESPOSTA DO EXECUTOR',
          desc: 'Declaração factual registrada pelo executor/técnico no formulário respondido.',
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'AI_SUGGESTION':
        return {
          label: 'HIPÓTESE / SUGESTÃO DE IA',
          desc: 'Proposta preliminar gerada pelo modelo para análise e julgamento humano.',
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
        };
      case 'INFERENCE':
        return {
          label: 'INFERÊNCIA CORRELACIONADA',
          desc: 'Dedução lógica sintetizada a partir de múltiplos registros de qualidade.',
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'VALIDATED_KNOWLEDGE':
        return {
          label: 'PADRÃO HOMOLOGADO SGQ',
          desc: 'Conhecimento organizacional previamente aprovado pelo Gestor da Qualidade.',
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        };
    }
  };

  const badge = getOntologyBadge(explicacao.ontologia);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-[12px] shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-purple-600/30 text-purple-300 border border-purple-500/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Explicabilidade da Sugestão SGQ</h3>
              <p className="text-[11px] text-slate-400">
                Transparência dos fundamentos, evidências e ontologia da informação
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Classification & Field */}
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-[8px] border border-slate-200">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Campo Auditado
              </span>
              <span className="text-xs font-bold text-slate-900">{explicacao.tituloCampo}</span>
            </div>

            <div className="text-right">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase inline-block ${badge.bg}`}
              >
                {badge.label}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                Confiança: <strong>{explicacao.nivelConfianca}</strong>
              </span>
            </div>
          </div>

          {/* 1. O que foi sugerido */}
          <div className="space-y-1.5 bg-blue-50/40 p-3.5 rounded-[8px] border border-blue-200">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              1. O que foi sugerido / concluído:
            </h4>
            <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
              {explicacao.oQueFoiSugerido}
            </p>
          </div>

          {/* 2. Por que foi sugerido */}
          <div className="space-y-1.5 bg-purple-50/40 p-3.5 rounded-[8px] border border-purple-200">
            <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-purple-600" />
              2. Por que o QualiGest sugeriu isso (Raciocínio):
            </h4>
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {explicacao.porQueFoiSugerido}
            </p>
          </div>

          {/* 3. Evidências Fatuais Consideradas */}
          {explicacao.evidenciasConsideradas && explicacao.evidenciasConsideradas.length > 0 && (
            <div className="space-y-1.5 p-3.5 rounded-[8px] border border-slate-200 bg-white">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. Evidências e Fatos Considerados:
              </h4>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-1">
                {explicacao.evidenciasConsideradas.map((ev, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Padrões de Conhecimento e RNCs Similares */}
          {(explicacao.padroesConhecimentoUtilizados?.length > 0 || explicacao.rncsSemelhantesConsultadas?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {explicacao.padroesConhecimentoUtilizados?.length > 0 && (
                <div className="p-3 bg-indigo-50/40 rounded-[8px] border border-indigo-200 space-y-1">
                  <h5 className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    Padrões da Base Consultados:
                  </h5>
                  <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                    {explicacao.padroesConhecimentoUtilizados.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {explicacao.rncsSemelhantesConsultadas?.length > 0 && (
                <div className="p-3 bg-sky-50/40 rounded-[8px] border border-sky-200 space-y-1">
                  <h5 className="text-[11px] font-bold text-sky-950 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                    RNCs Históricas Similares:
                  </h5>
                  <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                    {explicacao.rncsSemelhantesConsultadas.map((r, idx) => (
                      <li key={idx} className="font-mono">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Governança Warning */}
          <div className="p-3 rounded-[8px] bg-slate-100 text-slate-600 text-[11px] flex items-start gap-2 border border-slate-200">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              <strong>Diretriz Fundamental do SGQ:</strong> A IA atua em caráter estritamente consultivo.
              Informações factuais do executor prevalecem sobre hipóteses sugeridas e não são promovidas
              a conhecimento corporativo sem homologação formal.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Motor: <strong>{explicacao.modeloOuMotor || 'Gemini 3.7 Flash + Fallback Heurístico'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[6px] bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
