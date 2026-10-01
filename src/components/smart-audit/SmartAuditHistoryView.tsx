import React, { useState, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  ExternalLink,
  Tag,
  Building2,
  Calendar,
  Sparkles,
  Layers,
  FileText,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  AuditoriaExternaRecord,
  ConstatacaoExternaRecord,
  NCRecord,
  UserProfile
} from '../../types';

interface SmartAuditHistoryViewProps {
  audits: AuditoriaExternaRecord[];
  findings: ConstatacaoExternaRecord[];
  rncs?: NCRecord[];
  userProfile?: UserProfile | null;
  onNavigateToTab?: (tab: string) => void;
}

export const SmartAuditHistoryView: React.FC<SmartAuditHistoryViewProps> = ({
  audits = [],
  findings = [],
  rncs = [],
  userProfile,
  onNavigateToTab,
}) => {
  const [selectedClient, setSelectedClient] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAuditId, setSelectedAuditId] = useState<string>('TODAS');

  // Clientes únicos identificados no histórico
  const clientesList = useMemo(() => {
    const setC = new Set<string>();
    audits.forEach((a) => {
      if (a.entidadeAuditora) setC.add(a.entidadeAuditora);
      if (a.origem) setC.add(a.origem);
    });
    return Array.from(setC);
  }, [audits]);

  // Constatações filtradas
  const findingsFiltrados = useMemo(() => {
    return findings.filter((f) => {
      const parentAudit = audits.find((a) => a.id === f.auditId);
      const clientName = parentAudit?.entidadeAuditora || parentAudit?.origem || '';

      if (selectedAuditId !== 'TODAS' && f.auditId !== selectedAuditId) {
        return false;
      }

      if (selectedClient !== 'TODOS' && !clientName.toLowerCase().includes(selectedClient.toLowerCase())) {
        return false;
      }

      if (selectedStatusFilter !== 'TODOS') {
        if (selectedStatusFilter === 'RESPOSTA_ACEITA' && f.status !== 'ACEITA') return false;
        if (selectedStatusFilter === 'RESPOSTA_REJEITADA' && f.status !== 'REJEITADA') return false;
        if (selectedStatusFilter === 'RESPOSTA_ENVIADA' && f.status !== 'ENVIADA' && f.status !== 'RESPOSTA_ELABORADA') return false;
        if (selectedStatusFilter === 'RNC_ENCERRADA_INTERNAMENTE' && !f.rncInternaCriadaId) return false;
      }

      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const matchNum = f.numeroExterno?.toLowerCase().includes(t);
        const matchDesc = f.descricaoOriginal?.toLowerCase().includes(t);
        const matchAud = parentAudit?.numeroAuditoria?.toLowerCase().includes(t);
        const matchResp = f.respostaOficial?.correcaoImediata?.toLowerCase().includes(t) || f.respostaOficial?.acaoCorretiva?.toLowerCase().includes(t);
        if (!matchNum && !matchDesc && !matchAud && !matchResp) return false;
      }

      return true;
    });
  }, [findings, audits, selectedAuditId, selectedClient, selectedStatusFilter, searchTerm]);

  // Contadores de aceitação
  const counts = useMemo(() => {
    let aceitas = 0;
    let rejeitadas = 0;
    let enviadas = 0;
    let rncEncerradas = 0;

    findings.forEach((f) => {
      if (f.status === 'ACEITA') aceitas++;
      else if (f.status === 'REJEITADA') rejeitadas++;
      else if (f.status === 'ENVIADA' || f.status === 'RESPOSTA_ELABORADA') enviadas++;
      if (f.rncInternaCriadaId) {
        const r = rncs.find((rc) => rc.id === f.rncInternaCriadaId);
        if (r && r.statusGeral === 'Encerrada') rncEncerradas++;
      }
    });

    return { aceitas, rejeitadas, enviadas, rncEncerradas, total: findings.length };
  }, [findings, rncs]);

  const renderStatusBadge = (status: string, finding: ConstatacaoExternaRecord) => {
    if (status === 'ACEITA') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Resposta Aceita (Conhecimento de Alto Valor)
        </span>
      );
    }
    if (status === 'REJEITADA') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700/60 flex items-center gap-1.5 shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          Resposta Rejeitada pelo Cliente
        </span>
      );
    }
    if (status === 'ENVIADA' || status === 'RESPOSTA_ELABORADA') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Resposta Enviada (Aguardando Aceite)
        </span>
      );
    }
    if (finding.rncInternaCriadaId) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          RNC Encerrada Internamente
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
        Aceitação Desconhecida / Não Confirmada
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header do Fluxo A */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Fluxo A — Centro de Memória Histórica de Auditorias e Constatações
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-4xl leading-relaxed">
              Base oficial de consultas do QualiGest. Diferenciação rigorosa entre <strong>resposta enviada</strong>,
              <strong>resposta aceita formalmente</strong> e <strong>processo interno encerrado</strong>.
              Respostas aceitas possuem alto peso para sugestões em auditorias futuras, sempre checando a vigência dos procedimentos e revisões.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards do Histórico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-emerald-900/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
            <span>🟢 Respostas Aceitas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.aceitas}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Conhecimento de alto valor</div>
        </div>

        <div className="bg-slate-900/90 border border-rose-900/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-rose-400 flex items-center justify-between">
            <span>🔴 Respostas Rejeitadas</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{counts.rejeitadas}</div>
          <div className="text-[11px] text-rose-500/80 mt-0.5">Exigem nova abordagem técnica</div>
        </div>

        <div className="bg-slate-900/90 border border-amber-900/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-amber-400 flex items-center justify-between">
            <span>🟡 Respostas Enviadas</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{counts.enviadas}</div>
          <div className="text-[11px] text-amber-500/80 mt-0.5">Pendente de homologação do auditor</div>
        </div>

        <div className="bg-slate-900/90 border border-blue-900/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-blue-400 flex items-center justify-between">
            <span>🔵 RNCs Tratadas</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 mt-1">{counts.rncEncerradas}</div>
          <div className="text-[11px] text-blue-500/80 mt-0.5">Vinculadas ao formulário F 001-29</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Cliente/Autoridade:</span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="bg-slate-900">Todos os Clientes</option>
              {clientesList.map((c) => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Status de Aceite:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="bg-slate-900">Todos os Status</option>
              <option value="RESPOSTA_ACEITA" className="bg-slate-900">🟢 Apenas Aceitas</option>
              <option value="RESPOSTA_REJEITADA" className="bg-slate-900">🔴 Apenas Rejeitadas</option>
              <option value="RESPOSTA_ENVIADA" className="bg-slate-900">🟡 Resposta Enviada</option>
              <option value="RNC_ENCERRADA_INTERNAMENTE" className="bg-slate-900">🔵 RNC Interna Encerrada</option>
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por constatação, requisito, texto..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 w-64"
            />
          </div>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Exibindo {findingsFiltrados.length} constatação(ões)
        </div>
      </div>

      {/* Lista de Constatações Históricas */}
      <div className="space-y-4">
        {findingsFiltrados.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            Nenhuma constatação encontrada com os filtros selecionados.
          </div>
        ) : (
          findingsFiltrados.map((finding) => {
            const parentAudit = audits.find((a) => a.id === finding.auditId);
            const rncVinculada = rncs.find((r) => r.id === finding.rncInternaCriadaId);

            return (
              <div
                key={finding.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Cabeçalho do Finding */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-purple-300 bg-purple-950 border border-purple-800/60 px-2.5 py-0.5 rounded-lg">
                      {finding.numeroExterno}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {parentAudit?.numeroAuditoria || 'Auditoria Externa'}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-300">
                      {parentAudit?.entidadeAuditora || 'Cliente Aéreo'}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">
                      {finding.requisitoNormativo?.norma || 'Norma'} {finding.requisitoNormativo?.itemRequisito || ''}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        finding.classificacao === 'MAIOR'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {finding.classificacao}
                    </span>
                  </div>

                  <div>
                    {renderStatusBadge(finding.status, finding)}
                  </div>
                </div>

                {/* Descrição Original do Auditor */}
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Apontamento Original do Auditor (Preservado Inalterado):
                  </div>
                  <p className="text-xs text-slate-200 italic font-mono bg-slate-950 p-3 rounded-xl border border-slate-850">
                    "{finding.descricaoOriginal}"
                  </p>
                </div>

                {/* Resposta Técnica da IMPACTO */}
                {finding.respostaOficial && (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      Resposta Oficial Apresentada pela IMPACTO:
                    </div>
                    {finding.respostaOficial.correcaoImediata && (
                      <div>
                        <strong className="text-slate-400">Contenção / Correção Imediata:</strong>{' '}
                        <span className="text-slate-200">{finding.respostaOficial.correcaoImediata}</span>
                      </div>
                    )}
                    {finding.respostaOficial.analiseCausa && (
                      <div>
                        <strong className="text-slate-400">Causa Raiz:</strong>{' '}
                        <span className="text-slate-200">{finding.respostaOficial.analiseCausa}</span>
                      </div>
                    )}
                    {finding.respostaOficial.acaoCorretiva && (
                      <div>
                        <strong className="text-slate-400">Ação Corretiva:</strong>{' '}
                        <span className="text-slate-200">{finding.respostaOficial.acaoCorretiva}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rodapé: RNC Vinculada + Auditor + Decisão */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/60 text-slate-400">
                  <div className="flex items-center gap-3">
                    {rncVinculada ? (
                      <span className="text-sky-400 font-mono font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        RNC Vinculada: {rncVinculada.numeroNC ? `RNC-${rncVinculada.numeroNC}` : rncVinculada.id} ({rncVinculada.statusGeral})
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Nenhuma RNC vinculada</span>
                    )}
                    {finding.responsavelNome && (
                      <span>Responsável: <strong>{finding.responsavelNome}</strong></span>
                    )}
                  </div>

                  {onNavigateToTab && (
                    <button
                      onClick={() => onNavigateToTab('audits-external')}
                      className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 text-[11px]"
                    >
                      Abrir no Módulo de Auditorias Externas <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
