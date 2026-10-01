import React from 'react';
import {
  Sparkles,
  BookOpen,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { LicaoAprendidaAuditoria, UserProfile } from '../../types';
import { ResultadoAvaliacaoInteligenteItem } from '../../services/smartAuditEngine';

interface SmartAuditInternalLessonsViewProps {
  itens: ResultadoAvaliacaoInteligenteItem[];
  lessons: LicaoAprendidaAuditoria[];
  userProfile?: UserProfile | null;
  onSaveLesson?: (lesson: LicaoAprendidaAuditoria) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export const SmartAuditInternalLessonsView: React.FC<SmartAuditInternalLessonsViewProps> = ({
  itens,
  lessons = [],
  userProfile,
  onSaveLesson,
  onNavigateToTab,
}) => {
  // Itens com sugestão de auditoria interna
  const sugestoes = itens.filter((it) => it.sugestaoAuditoriaInterna?.sugerirInclusao);

  const handleCreateInternalAuditItem = async (it: ResultadoAvaliacaoInteligenteItem) => {
    if (!onSaveLesson || !it.sugestaoAuditoriaInterna) return;
    const novaLicao: LicaoAprendidaAuditoria = {
      id: `LESSON-${Date.now()}`,
      auditId: it.respostaHistorica?.auditoriaId || 'AUD-INTERNA',
      findingId: it.respostaHistorica?.auditoriaId,
      organizationId: it.requisito.organizationId || 'org_impacto_aviation',
      titulo: `Programa Interno: ${it.sugestaoAuditoriaInterna.temaRecorrente}`,
      oQueAconteceu: it.requisito.textoOriginal,
      oQueFuncionou: 'Controle central estabelecido no SGQ.',
      oQueFazerDiferente: `${it.oQueFalta} | Verificação: ${it.oQueDevemosVerificar}`,
      tags: ['Auditoria Interna F 001-08', it.requisito.categoria || 'Qualidade'],
      candidataBaseConhecimento: true,
      autorNome: userProfile?.displayName || 'Auditor SGQ',
      dataCriacao: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    await onSaveLesson(novaLicao);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Aprendizado Contínuo para o Programa de Auditoria Interna (F 001-08)
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
              O QualiGest monitora requisitos e constatações com alta incidência nas auditorias de clientes e autoridades.
              Esses temas são automaticamente priorizados para verificação no <strong>Plano Anual de Auditoria Interna</strong>,
              evitando que desvios conhecidos voltem a ser apontados por clientes externos.
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Recomendações Recorrentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sugestoes.map((it, idx) => {
          const sug = it.sugestaoAuditoriaInterna!;
          return (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-emerald-800/60 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                    Tema Recorrente em Auditorias
                  </span>
                  <h4 className="text-base font-bold text-white mt-1.5">{sug.temaRecorrente}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300">
                  {sug.frequenciaRecorrencia}x Recorrência
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{sug.justificativa}</p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">Clientes que Auditualmente Cobram:</span>
                <div className="flex flex-wrap gap-1">
                  {sug.clientesQueExigem.map((c, cIdx) => (
                    <span key={cIdx} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-400">
                <strong className="text-slate-300">Ação para Auditoria Interna:</strong> {it.oQueDevemosVerificar}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-850">
                <span className="text-[11px] text-slate-500 font-mono">
                  Base: {it.requisito.numeroItem} - {it.requisito.clienteNome}
                </span>
                <button
                  onClick={() => handleCreateInternalAuditItem(it)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Incluir no Plano Interno F 001-08
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lições Aprendidas já Registradas */}
      {lessons.length > 0 && (
        <div className="mt-8 space-y-3">
          <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Lições Aprendidas de Auditorias Cadastradas no QualiGest ({lessons.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lessons.map((l) => (
              <div key={l.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <div className="font-bold text-white">{l.titulo}</div>
                <div className="text-slate-400">Origem: <span className="text-slate-300">{l.origemAuditoria}</span></div>
                <p className="text-slate-300">{l.recomendaçõesAuditoriasFuturas || l.oQueMelhorar}</p>
                {l.tags && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {l.tags.map((t, tidx) => (
                      <span key={tidx} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
