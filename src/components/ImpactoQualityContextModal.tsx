import React, { useState, useEffect } from 'react';
import {
  Wrench,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plane,
  UserCheck,
  Building2,
  FileText,
  X,
  RefreshCw,
  PlusCircle,
  Copy,
  Layers,
  HelpCircle,
  AlertOctagon,
  Award,
  Hash,
} from 'lucide-react';
import { ImpactoContextoQualidadeOS } from '../types/impactoMro';
import { impactoMroApi } from '../services/impactoMroApi';

interface ImpactoQualityContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordemServicoId: string;
  onImportEvidence?: (novaEvidencia: { descricao: string; tipo: 'FACT'; referencia: string }) => void;
}

export const ImpactoQualityContextModal: React.FC<ImpactoQualityContextModalProps> = ({
  isOpen,
  onClose,
  ordemServicoId,
  onImportEvidence,
}) => {
  const [loading, setLoading] = useState(false);
  const [contexto, setContexto] = useState<ImpactoContextoQualidadeOS | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'tecnicos' | 'ferramentas' | 'pecas' | 'alertas'>('geral');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && ordemServicoId) {
      carregarContexto();
    }
  }, [isOpen, ordemServicoId]);

  const carregarContexto = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await impactoMroApi.getContextoQualidadeOS(ordemServicoId);
      if (resp.success && resp.data) {
        setContexto(resp.data);
      } else {
        setError(resp.error || 'Não foi possível carregar o contexto da OS no Impacto Aviation MRO.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha de comunicação com o serviço de manutenção.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const os = contexto?.ordemServico;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyResumo = () => {
    if (!contexto?.resumoAuditavel) return;
    navigator.clipboard.writeText(contexto.resumoAuditavel);
    showToast('Resumo auditável copiado para a área de transferência!');
  };

  const handleImportEvidence = (titulo: string, detalhe: string) => {
    if (!onImportEvidence || !os) return;
    onImportEvidence({
      tipo: 'FACT',
      descricao: `[Evidência Externa - Impacto Aviation MRO - OS ${os.numero}] ${titulo}: ${detalhe}`,
      referencia: `Impacto MRO OS #${os.id}`,
    });
    showToast('Evidência incorporada à RNC sem sobrescrever dados oficiais!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho Oficial Impacto Aviation MRO */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between border-b border-indigo-900/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950 border border-amber-300">
                Fonte Externa Oficial
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-800/70 text-indigo-100 border border-indigo-700/50 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-400" />
                Impacto Aviation MRO
              </span>
              {contexto && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  contexto.metadadosConsulta?.statusConexao === 'ONLINE'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                    : contexto.metadadosConsulta?.statusConexao === 'ULTIMA_CONSULTA_CONHECIDA'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                    : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                }`}>
                  ● {contexto.metadadosConsulta?.statusConexao === 'ONLINE'
                    ? 'Conexão Online'
                    : contexto.metadadosConsulta?.statusConexao === 'ULTIMA_CONSULTA_CONHECIDA'
                    ? 'Última Consulta Conhecida'
                    : 'Offline / Indisponível'}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              Contexto de Qualidade da OS: {os?.numero || ordemServicoId}
            </h3>
            <p className="text-xs text-indigo-200/80">
              Registros técnicos de manutenção, equipe executante, ferramentas aferidas e conformidade operacional.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {os?.urlNavegavel && (
              <a
                href={os.urlNavegavel}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Abrir Ordem de Serviço diretamente no sistema Impacto Aviation MRO"
              >
                <span>Consultar no Impacto</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aviso de Última Consulta Conhecida (quando offline mas com dados anteriores) */}
        {contexto?.metadadosConsulta?.statusConexao === 'ULTIMA_CONSULTA_CONHECIDA' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Aviso de Histórico (Offline):</strong> API oficial do Impacto Aviation MRO indisponível no momento. Exibindo <strong>ÚLTIMA CONSULTA CONHECIDA</strong> ({contexto.metadadosConsulta.cachedAt || 'registro em cache'}) — este registro não constitui dado oficial atual em tempo real.
            </span>
          </div>
        )}

        {/* Notificação Toast */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-xs">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              {toastMsg}
            </span>
          </div>
        )}

        {/* Loading / Erro */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Consultando contexto completo da Ordem de Serviço no Impacto Aviation MRO...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-base font-bold text-slate-900">Falha ao consultar Impacto Aviation MRO</h4>
              <p className="text-xs text-slate-600">{error}</p>
            </div>
            <button
              onClick={carregarContexto}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}

        {/* Conteúdo Carregado */}
        {!loading && !error && contexto && os && (
          <>
            {/* Barra de Navegação Interna */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('geral')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'geral'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Geral & Aeronave</span>
              </button>

              <button
                onClick={() => setActiveTab('tecnicos')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'tecnicos'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Técnicos & Habilitações ({1 + (contexto.equipeTecnica?.length || 0)})</span>
              </button>

              <button
                onClick={() => setActiveTab('ferramentas')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'ferramentas'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Ferramentas Calibradas ({contexto.ferramentasUtilizadas?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('pecas')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'pecas'
                    ? 'border-indigo-600 text-indigo-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Peças & Discrepâncias ({contexto.pecasSubstituidas?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('alertas')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'alertas'
                    ? 'border-rose-600 text-rose-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                <span>Alertas de Qualidade ({contexto.alertasQualidadeDetectados?.length || 0})</span>
              </button>
            </div>

            {/* Painel do Tab Ativo */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* TAB 1: GERAL & AERONAVE */}
              {activeTab === 'geral' && (
                <div className="space-y-4">
                  {/* Resumo da OS */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">ID Estável Impacto</div>
                        <div className="font-mono text-xs font-bold text-slate-700">{os.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          os.status === 'CONCLUIDA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : os.status === 'EM_ANDAMENTO'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {os.status}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          os.prioridade === 'AOG'
                            ? 'bg-rose-600 text-white'
                            : os.prioridade === 'URGENTE'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          Prioridade: {os.prioridade}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{os.titulo}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {os.descricao}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">AERONAVE</span>
                        <strong className="text-slate-900 font-mono text-sm">{os.prefixoAeronave}</strong>
                        <span className="text-[11px] text-slate-600 block">{os.modeloAeronave}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">BASE OPERACIONAL</span>
                        <strong className="text-slate-900">{contexto.base?.nome || os.baseNome}</strong>
                        <span className="text-[10px] text-slate-500 font-mono block">ID: {os.baseId}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">CLIENTE / OPERADOR</span>
                        <strong className="text-slate-900">{os.clienteNome}</strong>
                        <span className="text-[11px] text-slate-600 block">{os.tipoManutencao}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 block">DATAS</span>
                        <span className="text-[11px] text-slate-700 block">Abertura: {os.dataAbertura}</span>
                        {os.dataConclusao && (
                          <span className="text-[11px] text-emerald-700 font-semibold block">Conclusão: {os.dataConclusao}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumo Auditável */}
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        Síntese Auditável para o SGQ
                      </h5>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyResumo}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </button>
                        {onImportEvidence && (
                          <button
                            onClick={() => handleImportEvidence('Síntese da OS', contexto.resumoAuditavel)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Vincular como Evidência</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-indigo-900/90 leading-relaxed font-sans">
                      {contexto.resumoAuditavel}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: TÉCNICOS & HABILITAÇÕES */}
              {activeTab === 'tecnicos' && (
                <div className="space-y-4">
                  {/* Técnico Responsável */}
                  <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                        Responsável Técnico Oficial (Impacto Aviation MRO)
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        ID: {contexto.tecnicoResponsavel.id}
                      </span>
                    </div>

                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{contexto.tecnicoResponsavel.nome}</h4>
                        <p className="text-xs text-slate-600">{contexto.tecnicoResponsavel.funcao}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-mono font-black">
                          {contexto.tecnicoResponsavel.cht}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Validade CHT: {contexto.tecnicoResponsavel.chtValidade}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-slate-500 font-semibold">Habilitações:</span>
                      {contexto.tecnicoResponsavel.categoriasCht.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Qualificações do Pessoal */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Habilitações de Tipo & Certificados Relevantes
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contexto.qualificacoesEnvolvidas.map((q) => (
                        <div key={q.id} className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900">{q.titulo}</strong>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {q.status}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">Técnico: {q.tecnicoNome || 'Equipe'}</p>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                            <span>Emissor: {q.emissor}</span>
                            <span>Validade: {q.dataValidade || 'Permanente'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Treinamentos Mandatórios */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Treinamentos Mandatórios em Dia (HF / EWIS / FTS)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {contexto.treinamentosEnvolvidos.map((t) => (
                        <div key={t.id} className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                          <strong className="text-slate-900 block">{t.cursoNome}</strong>
                          <span className="text-[11px] text-slate-600 block">{t.tecnicoNome}</span>
                          <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                            <span>Carga: {t.cargaHoraria}h</span>
                            <span>Venc: {t.dataValidade}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FERRAMENTAS CALIBRADAS */}
              {activeTab === 'ferramentas' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Ferramentas aferidas e padrões rastreáveis registrados para execução desta OS no Impacto Aviation MRO.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {contexto.ferramentasUtilizadas.map((ferr) => {
                      const isVencida = ferr.statusCalibracao === 'VENCIDO';
                      return (
                        <div
                          key={ferr.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isVencida
                              ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black px-2 py-0.5 bg-slate-900 text-white rounded">
                                  {ferr.codigo}
                                </span>
                                <h5 className="font-bold text-sm text-slate-900">{ferr.descricao}</h5>
                              </div>
                              <p className="text-xs text-slate-500">
                                Fabricante: {ferr.fabricante || 'N/A'} | S/N: {ferr.numeroSerie} | Local: {ferr.localizacao}
                              </p>
                            </div>

                            <div className="text-right">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                isVencida ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {ferr.statusCalibracao}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Próx. Calibração: <strong>{ferr.dataProximaCalibracao}</strong>
                              </div>
                            </div>
                          </div>

                          {isVencida && onImportEvidence && (
                            <div className="mt-3 pt-3 border-t border-rose-200 flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                Desvio metrológico detectado nesta OS!
                              </span>
                              <button
                                onClick={() => handleImportEvidence(
                                  `Ferramenta Calibrável Vencida na OS #${os.numero}`,
                                  `A ferramenta ${ferr.codigo} (${ferr.descricao}, S/N ${ferr.numeroSerie}) estava com calibração vencida em ${ferr.dataProximaCalibracao} durante o atendimento da OS.`
                                )}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Adicionar à Investigação da RNC</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: PEÇAS & DISCREPÂNCIAS */}
              {activeTab === 'pecas' && (
                <div className="space-y-4">
                  {/* Peças Substituídas */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Componentes Aeronáuticos Substituídos (Rastreabilidade)
                    </h5>
                    <div className="space-y-2">
                      {contexto.pecasSubstituidas.map((p, idx) => (
                        <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 text-sm font-mono">{p.partNumber}</strong>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {p.certificacaoForm1 || 'Form 1 Homologado'}
                            </span>
                          </div>
                          <p className="text-slate-600">{p.descricao}</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                            <span>S/N Removido: <strong className="font-mono">{p.serialNumberRemovido || 'N/A'}</strong></span>
                            <span>S/N Instalado: <strong className="font-mono">{p.serialNumberInstalado || 'N/A'}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Discrepâncias de Manutenção */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Discrepâncias Encontradas durante a Manutenção
                    </h5>
                    <div className="space-y-2">
                      {contexto.discrepanciasManutencao.map((d) => (
                        <div key={d.id} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-mono">{d.codigo}</strong>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {d.itemAta || 'ATA'}
                            </span>
                          </div>
                          <p className="text-slate-700">{d.descricao}</p>
                          {d.acaoTomada && (
                            <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                              <strong>Ação Corretiva Técnica:</strong> {d.acaoTomada}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ALERTAS DE QUALIDADE DA OS */}
              {activeTab === 'alertas' && (
                <div className="space-y-3">
                  {contexto.alertasQualidadeDetectados.length === 0 ? (
                    <div className="p-8 text-center space-y-2 bg-emerald-50/50 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <h5 className="text-sm font-bold text-emerald-900">Nenhum Alerta Crítico Detectado</h5>
                      <p className="text-xs text-emerald-700">
                        Os dados da Ordem de Serviço atendem plenamente aos critérios de conformidade técnica do Impacto Aviation MRO.
                      </p>
                    </div>
                  ) : (
                    contexto.alertasQualidadeDetectados.map((alerta, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          alerta.severidade === 'CRITICO'
                            ? 'bg-rose-50 border-rose-300 text-rose-950'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                            {alerta.tipo} ({alerta.severidade})
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white/70 px-2 py-0.5 rounded">
                            Ref: {alerta.itemReferencia}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{alerta.mensagem}</p>
                        {onImportEvidence && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleImportEvidence(
                                `Alerta de Qualidade Impacto MRO (${alerta.tipo})`,
                                alerta.mensagem
                              )}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold rounded border border-slate-300 transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <PlusCircle className="w-3 h-3 text-indigo-600" />
                              <span>Adicionar à RNC como Evidência</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </>
        )}

        {/* Rodapé do Modal */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-slate-500">
            Fonte oficial de dados: <strong className="text-slate-700">Impacto Aviation MRO</strong> | Não altera dados oficiais do QualyQuest
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
