import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  BookOpen, 
  ArrowRight, 
  FileText, 
  RefreshCw, 
  Check, 
  X, 
  ChevronRight,
  ExternalLink,
  Layers,
  CheckSquare,
  Cpu,
  FileQuestion,
  Info
} from 'lucide-react';
import { NCRecord, ManualRecord, AuditoriaPertinenciaResultado, VereditoPertinencia, NivelSuporteDocumental } from '../types';
import { sanitizeManualsForAPI } from '../utils/manualsStorage';
import { auditNCComplianceLocally } from '../utils/sgqExtractor';
import { obterEstiloSuporteDocumental } from '../utils/qualityHelpers';
import { useAuth } from '../contexts/AuthContext';
import { geminiClientCache } from '../utils/geminiClientCache';

interface ComplianceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  nc: NCRecord | null;
  manuals: ManualRecord[];
  onApplySuggestions?: (updatedNC: Partial<NCRecord>) => void;
}

export const ComplianceAuditModal: React.FC<ComplianceAuditModalProps> = ({
  isOpen,
  onClose,
  nc,
  manuals = [],
  onApplySuggestions,
}) => {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<AuditoriaPertinenciaResultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'trilha' | 'detalhes' | 'evidencias'>('trilha');

  // Trigger audit on open if NC changes
  useEffect(() => {
    if (isOpen && nc) {
      handleRunAudit();
    } else {
      setResultado(null);
      setError(null);
      setApplied(false);
    }
  }, [isOpen, nc?.id]);

  const { userProfile } = useAuth();

  const handleRunAudit = async () => {
    if (!nc) return;
    setLoading(true);
    setError(null);
    setApplied(false);

    const orgId = nc.organizationId || userProfile?.organizationId || 'org_impacto_aviation';
    const cacheKey = geminiClientCache.generateKey({
      organizationId: orgId,
      operation: 'audit-compliance',
      input: {
        ncId: nc.id,
        desc: nc.descricaoNC,
        norma: nc.normaReferencia,
        setor: nc.setor,
        manualsCount: manuals.length,
      },
    });

    const cached = geminiClientCache.get<AuditoriaPertinenciaResultado>(cacheKey, orgId);
    if (cached) {
      setResultado(cached);
      setLoading(false);
      return;
    }

    try {
      const sanitized = sanitizeManualsForAPI(manuals);
      let auditResult: AuditoriaPertinenciaResultado | null = null;

      try {
        const response = await fetch('/api/audit-compliance', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-organization-id': orgId,
            'x-user-org-id': userProfile?.organizationId || '',
          },
          body: JSON.stringify({
            organizationId: orgId,
            nc,
            manuals: sanitized,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.auditoria) {
            auditResult = data.auditoria;
            geminiClientCache.set(cacheKey, data.auditoria, 30 * 60 * 1000, orgId);
          }
        }
      } catch (fetchErr) {
        console.warn('Backend audit API fallback to local audit engine:', fetchErr);
      }

      // If backend was unreachable or returned empty, run local compliance audit engine
      if (!auditResult) {
        auditResult = auditNCComplianceLocally(nc, manuals);
      }

      setResultado(auditResult);
    } catch (err: any) {
      console.error('Audit Error:', err);
      // Emergency fallback
      const fallbackResult = auditNCComplianceLocally(nc, manuals);
      setResultado(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!resultado || !onApplySuggestions) return;

    const updates: Partial<NCRecord> = {};
    const sug = resultado.ajustesSugeridos;

    if (sug.normaReferenciaSugerida) {
      updates.normaReferencia = sug.normaReferenciaSugerida;
    }
    if (sug.tituloSugerido && (!nc?.titulo || nc.titulo.includes('Registro de Não Conformidade'))) {
      updates.titulo = sug.tituloSugerido;
    }
    if (sug.tipoAcaoSugerido) {
      updates.tipoAcao = sug.tipoAcaoSugerido;
    }
    if (sug.riscoSugerido) {
      updates.avaliacaoRiscoInicial = sug.riscoSugerido;
    }

    onApplySuggestions(updates);
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen || !nc) return null;

  const getVereditoBadge = (veredito: VereditoPertinencia) => {
    switch (veredito) {
      case 'Procedente':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          label: 'Não Conformidade Procedente / Pertinente',
          desc: 'O fato descrito configura descumprimento de requisito normativo/manual cadastrado.',
        };
      case 'Parcialmente Procedente':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          label: 'Parcialmente Procedente',
          desc: 'Há desvio identificado, porém requer ajuste no enquadramento ou complementação probatória.',
        };
      case 'Enquadramento Incorreto':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-300',
          icon: <HelpCircle className="w-5 h-5 text-purple-600 shrink-0" />,
          label: 'Enquadramento Incorreto',
          desc: 'O fato é pertinente, porém a norma ou capítulo citado na NC está incorreto ou desatualizado.',
        };
      case 'Não Procedente':
      default:
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
          label: 'Não Procedente / Desvio Não Caracterizado',
          desc: 'O fato narrado não viola os requisitos estabelecidos na base normativa vigente.',
        };
    }
  };

  const badgeInfo = resultado ? getVereditoBadge(resultado.veredicto) : null;
  const nivelSuporte = resultado?.nivelSuporteDocumental || 'Evidência moderada';
  const suporteStyle = obterEstiloSuporteDocumental(nivelSuporte);
  const trilha = resultado?.trilhaAuditoriaConformidade;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-bold text-base text-white tracking-tight">
                  Auditoria de Pertinência & Enquadramento Normativo
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-indigo-300" />
                  <span>{resultado?.origemMotor || 'IA GEMINI'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Verificação da RNC #{nc.numeroNC || 'N/D'} contra acervo de normas e manuais vigentes
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

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Target NC Summary Box */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  NC {nc.numeroNC || 'N/D'}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{nc.titulo || 'Registro de Não Conformidade'}</h4>
                <span className="text-[11px] text-slate-500">({nc.setor || 'Geral'})</span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 italic">
                "{nc.descricaoNC || 'Sem descrição cadastrada'}"
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Norma Citada na NC</span>
                <span className="text-xs font-bold font-mono text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                  {nc.normaReferencia || 'Não informada'}
                </span>
              </div>
              <button
                onClick={handleRunAudit}
                disabled={loading}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Reexecutar verificação"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Warning / Audit Notice (Section 1 & 11) */}
          <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Assistente de Auditoria SGQ:</strong> Esta análise confronta os dados da RNC com a base normativa cadastrada. Recomendações e enquadramentos devem ser validados pelo responsável técnico.
            </span>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <BookOpen className="w-6 h-6 text-indigo-600 absolute animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Consultando Banco de Manuais e Normas...</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Cruzando o relato do desvio com os requisitos dos manuais ({manuals.map(m => m.codigo).join(', ')}), verificando pertinência e checando a última revisão aplicável.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Não foi possível concluir a auditoria</span>
              </div>
              <p className="text-xs text-rose-700">{error}</p>
              <button
                onClick={handleRunAudit}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Results State */}
          {resultado && !loading && badgeInfo && (
            <div className="space-y-4">
              {/* Verdict Card */}
              <div className={`p-4 rounded-2xl border ${badgeInfo.bg} shadow-xs space-y-3`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    {badgeInfo.icon}
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <h4 className="font-bold text-sm sm:text-base">{badgeInfo.label}</h4>
                        {/* Qualitative Evidence Support (Section 6) */}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${suporteStyle.bg} ${suporteStyle.text} ${suporteStyle.border}`}>
                          {nivelSuporte}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 opacity-90">{badgeInfo.desc}</p>
                      {resultado.justificativaSuporte && (
                        <p className="text-[11px] opacity-80 mt-1">
                          <strong>Base da classificação:</strong> {resultado.justificativaSuporte}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-semibold">
                <button
                  onClick={() => setActiveStepTab('trilha')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeStepTab === 'trilha' ? 'bg-indigo-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Cadeia de Auditoria (7 Passos)</span>
                </button>
                <button
                  onClick={() => setActiveStepTab('detalhes')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeStepTab === 'detalhes' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Vigência & Enquadramento</span>
                </button>
                <button
                  onClick={() => setActiveStepTab('evidencias')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeStepTab === 'evidencias' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Evidências & Perguntas</span>
                </button>
              </div>

              {/* TAB 1: 7-STEP CANONICAL AUDIT CHAIN (Section 11) */}
              {activeStepTab === 'trilha' && (
                <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs border-b border-indigo-100 pb-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Cadeia Canônica de Auditoria SGQ</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* 1. Requisito */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800 text-[11px] mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">1</span>
                          <span>Requisito Aplicável:</span>
                        </span>
                        <span className="font-mono text-indigo-700">{trilha?.requisito || resultado.enquadramentoRecomendado.capituloItemCorreto}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {resultado.enquadramentoRecomendado.tituloRequisito}
                      </p>
                    </div>

                    {/* 2. Fonte Documental */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between font-bold text-slate-800 text-[11px] mb-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">2</span>
                          <span>Fonte Documental & Vigência:</span>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          resultado.validacaoRevisao.statusRevisao === 'Vigente'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {resultado.validacaoRevisao.statusRevisao}
                        </span>
                      </div>
                      <p className="text-slate-700 font-mono text-[11px]">
                        {trilha?.fonteDocumental || resultado.validacaoRevisao.manualCitado} - {resultado.validacaoRevisao.revisaoVigenteCadastrada || 'Revisão Cadastrada'}
                      </p>
                    </div>

                    {/* 3. Trecho / Referência */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] mb-1">
                        <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">3</span>
                        <span>Trecho / Referência Normativa:</span>
                      </div>
                      <p className="text-slate-600 text-[11px] italic bg-white p-2 rounded border border-slate-100">
                        "{trilha?.trechoReferencia || resultado.enquadramentoRecomendado.trechoNormativoRelevante}"
                      </p>
                    </div>

                    {/* 4. Evidência Encontrada */}
                    <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-[11px] mb-1">
                        <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-mono">4</span>
                        <span>Evidência Encontrada no Relato:</span>
                      </div>
                      <p className="text-emerald-900 text-[11px] leading-relaxed">
                        {trilha?.evidenciaEncontrada || nc.descricaoNC}
                      </p>
                    </div>

                    {/* 5. Avaliação Técnica */}
                    <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-1.5 font-bold text-blue-950 text-[11px] mb-1">
                        <span className="w-4 h-4 rounded bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-mono">5</span>
                        <span>Avaliação Técnica & Confronto:</span>
                      </div>
                      <p className="text-blue-900 text-[11px] leading-relaxed">
                        {trilha?.avaliacaoTecnica || resultado.analiseCritica}
                      </p>
                    </div>

                    {/* 6. Lacuna / Desvio */}
                    <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950 text-[11px] mb-1">
                        <span className="w-4 h-4 rounded bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-mono">6</span>
                        <span>Lacuna / Desvio Identificado:</span>
                      </div>
                      <p className="text-amber-900 text-[11px] leading-relaxed">
                        {trilha?.lacunaIdentificada || 'Inconsistência entre a execução prática e o procedimento documental.'}
                      </p>
                    </div>

                    {/* 7. Conclusão */}
                    <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-[11px] mb-1">
                        <span className="w-4 h-4 rounded bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono">7</span>
                        <span>Conclusão de Auditoria:</span>
                      </div>
                      <p className="text-indigo-900 text-[11px] font-semibold leading-relaxed">
                        {trilha?.conclusao || resultado.justificativaTecnica}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETALHES & PARECER */}
              {activeStepTab === 'detalhes' && (
                <div className="space-y-4">
                  {/* Grid 2 Cols: Revisão vs Enquadramento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Validação da Revisão */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <span>Status da Revisão da Norma Citada</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          resultado.validacaoRevisao.statusRevisao === 'Vigente'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {resultado.validacaoRevisao.statusRevisao}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Manual Referenciado:</span>
                          <span className="font-semibold text-slate-800 font-mono">{resultado.validacaoRevisao.manualCitado}</span>
                        </div>
                        {resultado.validacaoRevisao.dataReferenciaUtilizada && (
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Data da Ocorrência (Referência):</span>
                            <span className="font-medium text-slate-700 font-mono">
                              {resultado.validacaoRevisao.dataReferenciaUtilizada}
                            </span>
                          </div>
                        )}
                        {resultado.validacaoRevisao.revisaoAplicavelNaData && (
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Versão Aplicável na Ocorrência:</span>
                            <span className="font-bold text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {resultado.validacaoRevisao.revisaoAplicavelNaData}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Revisão Atual do Acervo:</span>
                          <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">
                            {resultado.validacaoRevisao.revisaoVigenteCadastrada || 'Não cadastrada'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 pt-1 leading-relaxed">
                          {resultado.validacaoRevisao.observacaoRevisao}
                        </p>
                      </div>
                    </div>

                    {/* 2. Enquadramento Recomendado */}
                    <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>Enquadramento Recomendado</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                          Requisito Oficial
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-white rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-indigo-700 text-sm">
                              {resultado.enquadramentoRecomendado.manualCorreto} {resultado.enquadramentoRecomendado.capituloItemCorreto}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium truncate">
                              - {resultado.enquadramentoRecomendado.tituloRequisito}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                            "{resultado.enquadramentoRecomendado.trechoNormativoRelevante}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Análise Crítica e Justificativa Técnica */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs border-b border-slate-100 pb-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span>Parecer Crítico & Justificativa Técnica de Auditoria</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 block">Análise do Desvio:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {resultado.analiseCritica}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="font-bold text-slate-700 block">Embasamento Regulatório:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {resultado.justificativaTecnica}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: EVIDÊNCIAS & PERGUNTAS */}
              {activeStepTab === 'evidencias' && (
                <div className="space-y-4">
                  {/* Evidências Obrigatórias */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                      <span>Evidências Objetivas Mandatórias para Comprovação / Encerramento</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(resultado.evidenciasExigidas || []).map((ev, idx) => (
                        <div key={idx} className="flex items-start space-x-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] leading-tight">{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Evidências Faltantes */}
                  {resultado.evidenciasFaltantes && resultado.evidenciasFaltantes.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-2.5">
                      <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                        <FileQuestion className="w-4 h-4 text-amber-600" />
                        <span>Evidências Faltantes no Registro Atual</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {resultado.evidenciasFaltantes.map((ev, idx) => (
                          <div key={idx} className="flex items-start space-x-2 p-2 bg-amber-50/60 rounded-lg border border-amber-100 text-xs text-amber-950">
                            <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              !
                            </span>
                            <span className="text-[11px] leading-tight">{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Perguntas de Investigação */}
                  {resultado.perguntasInvestigacao && resultado.perguntasInvestigacao.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                        <HelpCircle className="w-4 h-4 text-indigo-600" />
                        <span>Perguntas para Investigação em Campo / Entrevista</span>
                      </div>
                      <div className="space-y-1.5">
                        {resultado.perguntasInvestigacao.map((p, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700">
                            <strong>P{idx + 1}:</strong> {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sugestões de Ajuste na NC */}
              <div className="bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 p-4 rounded-xl border border-indigo-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-xs text-indigo-950">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Proposta de Enquadramento dos Campos da RNC</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-semibold">Revisar e Aplicar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Norma Sugerida</span>
                    <span className="font-mono font-bold text-indigo-700 text-xs">
                      {resultado.ajustesSugeridos.normaReferenciaSugerida || nc.normaReferencia}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Título Recomendado</span>
                    <span className="font-bold text-slate-800 text-xs truncate block">
                      {resultado.ajustesSugeridos.tituloSugerido || nc.titulo}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo de Ação</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {resultado.ajustesSugeridos.tipoAcaoSugerido || nc.tipoAcao}
                    </span>
                  </div>
                </div>

                {onApplySuggestions && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleApply}
                      disabled={applied}
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                        applied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:scale-[1.02]'
                      }`}
                    >
                      {applied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Enquadramento Aplicado com Sucesso!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Aplicar Enquadramento à Não Conformidade</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{manuals.length} Manuais e Normas Cadastrados</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
