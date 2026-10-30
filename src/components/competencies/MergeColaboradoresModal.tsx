import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  GitMerge,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  HelpCircle,
  Award,
  BookOpen,
  Plane,
  FileText,
  Sparkles,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  CompetenciaColaborador,
  DocumentoEvidenciaPessoa,
  UserProfile,
} from '../../types';
import {
  detectarColaboradoresDuplicados,
  obterResumoVinculosColaborador,
  mesclarColaboradores,
  desvincularEExcluirColaborador,
  GrupoDuplicadoDetectado,
} from '../../services/mergePersonsService';

interface MergeColaboradoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  userProfile?: UserProfile | null;
  persons: ColaboradorPessoa[];
  trainingRecords: RegistroTreinamentoColaborador[];
  qualifications: QualificacaoColaborador[];
  personCompetencies: CompetenciaColaborador[];
  documents: DocumentoEvidenciaPessoa[];
  nonConformities?: any[];
  preSelectedDuplicadoId?: string;
  onSuccess?: (mensagem: string) => void;
}

export const MergeColaboradoresModal: React.FC<MergeColaboradoresModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  userProfile,
  persons = [],
  trainingRecords = [],
  qualifications = [],
  personCompetencies = [],
  documents = [],
  nonConformities = [],
  preSelectedDuplicadoId,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'DETECTADOS' | 'MANUAL'>('DETECTADOS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Estados de Mesclagem Manual
  const [idPrincipal, setIdPrincipal] = useState<string>('');
  const [idDuplicado, setIdDuplicado] = useState<string>(preSelectedDuplicadoId || '');
  const [buscaPrincipal, setBuscaPrincipal] = useState('');
  const [buscaDuplicado, setBuscaDuplicado] = useState('');

  // Opções de Mesclagem
  const [mesclarFrotas, setMesclarFrotas] = useState(true);
  const [mesclarTreinamentos, setMesclarTreinamentos] = useState(true);
  const [mesclarLicencas, setMesclarLicencas] = useState(true);
  const [mesclarCompetencias, setMesclarCompetencias] = useState(true);
  const [mesclarDocumentos, setMesclarDocumentos] = useState(true);
  const [atualizarDadosCadastraisVazios, setAtualizarDadosCadastraisVazios] = useState(true);

  // Estado para exclusão forçada com limpeza de vínculos
  const [confirmarDescarteDireto, setConfirmarDescarteDireto] = useState(false);
  const [motivoDescarte, setMotivoDescarte] = useState('Descarte de cadastro duplicado com vínculos associados');

  // Contexto para contagem de vínculos
  const contextoVinculos = useMemo(
    () => ({
      trainingRecords,
      qualifications,
      personCompetencies,
      documents,
      nonConformities,
    }),
    [trainingRecords, qualifications, personCompetencies, documents, nonConformities]
  );

  // Duplicados detectados automaticamente
  const duplicadosDetectados = useMemo(() => {
    return detectarColaboradoresDuplicados(persons, contextoVinculos);
  }, [persons, contextoVinculos]);

  // Se houver preSelectedDuplicadoId ao abrir, já inicializa a tela manual com ele
  React.useEffect(() => {
    if (preSelectedDuplicadoId) {
      setIdDuplicado(preSelectedDuplicadoId);
      setActiveTab('MANUAL');

      // Tenta sugerir automaticamente um principal com mesmo nome ou matrícula
      const colabAlvo = persons.find((p) => p.id === preSelectedDuplicadoId);
      if (colabAlvo) {
        const par = duplicadosDetectados.find(
          (d) =>
            d.colaboradorDuplicado.id === preSelectedDuplicadoId ||
            d.colaboradorPrincipal.id === preSelectedDuplicadoId
        );
        if (par) {
          const sug = par.colaboradorPrincipal.id === preSelectedDuplicadoId
            ? par.colaboradorDuplicado.id
            : par.colaboradorPrincipal.id;
          setIdPrincipal(sug);
        }
      }
    } else if (duplicadosDetectados.length === 0) {
      setActiveTab('MANUAL');
    }
  }, [preSelectedDuplicadoId, duplicadosDetectados, persons]);

  if (!isOpen) return null;

  const colabPrincipal = persons.find((p) => p.id === idPrincipal);
  const colabDuplicado = persons.find((p) => p.id === idDuplicado);

  const vinculosPrincipal = colabPrincipal
    ? obterResumoVinculosColaborador(colabPrincipal.id, contextoVinculos)
    : null;
  const vinculosDuplicado = colabDuplicado
    ? obterResumoVinculosColaborador(colabDuplicado.id, contextoVinculos)
    : null;

  // Filtragem na busca de seleção manual
  const pessoasFiltradasPrincipal = persons
    .filter((p) => p.id !== idDuplicado)
    .filter((p) => {
      if (!buscaPrincipal.trim()) return true;
      const q = buscaPrincipal.toLowerCase();
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.matricula || '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });

  const pessoasFiltradasDuplicado = persons
    .filter((p) => p.id !== idPrincipal)
    .filter((p) => {
      if (!buscaDuplicado.trim()) return true;
      const q = buscaDuplicado.toLowerCase();
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.matricula || '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });

  // Executar Mesclagem Manual ou Automática
  const handleExecutarMesclagem = async (
    targetPrincipalId: string,
    targetDuplicadoId: string
  ) => {
    setMensagemErro(null);
    setMensagemSucesso(null);
    setIsProcessing(true);

    try {
      const res = await mesclarColaboradores(
        organizationId,
        targetPrincipalId,
        targetDuplicadoId,
        {
          mesclarFrotas,
          mesclarTreinamentos,
          mesclarLicencas,
          mesclarCompetencias,
          mesclarDocumentos,
          atualizarDadosCadastraisVazios,
        },
        userProfile
      );

      setMensagemSucesso(res.mensagem);
      if (onSuccess) onSuccess(res.mensagem);
    } catch (err: any) {
      setMensagemErro(err?.message || 'Falha ao executar unificação de colaboradores.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Executar Descarte Direto com Limpeza de Vínculos
  const handleExecutarDescarteComLimpeza = async (targetId: string) => {
    if (!targetId) return;
    setMensagemErro(null);
    setMensagemSucesso(null);
    setIsProcessing(true);

    try {
      const res = await desvincularEExcluirColaborador(
        organizationId,
        targetId,
        motivoDescarte,
        userProfile
      );

      setMensagemSucesso(res.mensagem);
      setConfirmarDescarteDireto(false);
      if (onSuccess) onSuccess(res.mensagem);
    } catch (err: any) {
      setMensagemErro(err?.message || 'Falha ao excluir colaborador com limpeza de vínculos.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-scale-in max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-100 text-sky-900 rounded-xl">
              <GitMerge className="w-5 h-5 text-sky-800" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Unificação &amp; Eliminação de Colaboradores Duplicados</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Preservação de Vínculos 100%
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Transfira treinamentos, licenças e designações para o cadastro correto em 1 clique e remova as duplicidades sem bloqueios.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {mensagemErro && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2.5 text-xs text-rose-950 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* Navegação por Abas */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('DETECTADOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'DETECTADOS'
                ? 'bg-sky-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Duplicidades Detectadas ({duplicadosDetectados.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MANUAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'MANUAL'
                ? 'bg-sky-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Mesclagem Manual Personalizada</span>
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* ========================================================================= */}
          {/* ABA 1: DUPLICIDADES DETECTADAS AUTOMATICAMENTE                           */}
          {/* ========================================================================= */}
          {activeTab === 'DETECTADOS' && (
            <div className="space-y-3">
              {duplicadosDetectados.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Nenhuma Duplicidade Crítica Detectada Automaticamente
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Não encontramos colaboradores com o mesmo CANAC ou nomes idênticos no momento. Caso saiba de dois registros que correspondam à mesma pessoa, utilize a aba <strong>&quot;Mesclagem Manual Personalizada&quot;</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Identificamos <strong>{duplicadosDetectados.length} par(es) de colaboradores repetidos</strong>. Você pode unificar os registros e transferir todos os históricos sem perder nada.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {duplicadosDetectados.map((grupo) => {
                      const p = grupo.colaboradorPrincipal;
                      const d = grupo.colaboradorDuplicado;
                      const vp = grupo.vinculosPrincipal;
                      const vd = grupo.vinculosDuplicado;

                      return (
                        <div
                          key={grupo.id}
                          className="bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-4 shadow-2xs space-y-3 transition"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                {grupo.nomeNormalizado.toUpperCase()}
                              </span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                                {grupo.motivo}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Confiança: {Math.round(grupo.score * 100)}%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {/* Card Principal */}
                            <div className="p-3 bg-emerald-50/60 border border-emerald-300 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                  ✓ MANTER (Principal Oficial)
                                </span>
                                <span className="font-mono text-xs font-bold text-emerald-900">
                                  {p.matricula || p.id}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{p.nome}</p>
                                <p className="text-[11px] text-slate-600">
                                  {p.funcao || 'Mecânico'} • {p.setor} • Base: {p.baseOperacional || 'N/A'}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-3 text-[11px] text-emerald-900 font-medium">
                                <span>📚 {vp.totalTreinamentos} treinamentos</span>
                                <span>📜 {vp.totalLicencas} licenças</span>
                                <span>✈️ {vp.totalDesignacoes} frotas</span>
                              </div>
                            </div>

                            {/* Card Duplicado */}
                            <div className="p-3 bg-rose-50/60 border border-rose-300 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                                  ✕ DUPLICADO (Será unificado e removido)
                                </span>
                                <span className="font-mono text-xs font-bold text-rose-900">
                                  {d.matricula || d.id}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{d.nome}</p>
                                <p className="text-[11px] text-slate-600">
                                  {d.funcao || 'Mecânico'} • {d.setor} • Base: {d.baseOperacional || 'N/A'}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-rose-900 font-medium">
                                <span>
                                  {vd.totalVinculos > 0
                                    ? `Serão migrados: ${vd.totalTreinamentos} treinos • ${vd.totalLicencas} licenças • ${vd.totalDesignacoes} frotas`
                                    : 'Sem vínculos pendentes (cadastro órfão)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <p className="text-[11px] text-slate-500">
                              💡 Todos os históricos serão transferidos para <strong>{p.nome}</strong> sem quebra de rastreabilidade.
                            </p>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleExecutarMesclagem(p.id, d.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                              <span>{isProcessing ? 'Unificando...' : 'Unificar Registros em 1 Clique'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: MESCLAGEM MANUAL PERSONALIZADA                                    */}
          {/* ========================================================================= */}
          {activeTab === 'MANUAL' && (
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Como funciona a unificação manual:</strong>
                  <span>
                    Selecione o cadastro <strong>Principal</strong> (o registro que você deseja manter ativo no sistema) e o cadastro <strong>Duplicado</strong> (o registro secundário). Todos os treinamentos, licenças CHT e autorizações de frota serão reatribuídos para o cadastro principal, e o registro duplicado será excluído de forma limpa.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna 1: Colaborador Principal */}
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-1">
                      1. Colaborador Principal (QUE FICARÁ ATIVO) *
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Receberá todos os treinamentos e licenças do cadastro duplicado.
                    </p>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrar por nome, matrícula ou ID..."
                        value={buscaPrincipal}
                        onChange={(e) => setBuscaPrincipal(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <select
                      value={idPrincipal}
                      onChange={(e) => setIdPrincipal(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    >
                      <option value="">-- Selecione o Colaborador Principal --</option>
                      {pessoasFiltradasPrincipal.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.matricula || p.id}) — {p.funcao || 'Mecânico'} [{p.baseOperacional || 'Sem Base'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {colabPrincipal && vinculosPrincipal && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1.5 text-emerald-950">
                      <div className="flex items-center justify-between font-bold">
                        <span>{colabPrincipal.nome}</span>
                        <span className="font-mono text-[11px]">{colabPrincipal.matricula}</span>
                      </div>
                      <p className="text-[11px] text-emerald-900">
                        {colabPrincipal.funcao} • {colabPrincipal.setor} • Base: {colabPrincipal.baseOperacional || 'N/A'}
                      </p>
                      <div className="pt-1.5 border-t border-emerald-200 flex flex-wrap gap-2 text-[10px] font-semibold text-emerald-800">
                        <span>📚 {vinculosPrincipal.totalTreinamentos} treinos atuais</span>
                        <span>📜 {vinculosPrincipal.totalLicencas} licenças</span>
                        <span>✈️ {vinculosPrincipal.totalDesignacoes} frotas</span>
                        <span>🎖️ {vinculosPrincipal.totalCompetencias} competências</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna 2: Colaborador Duplicado */}
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="text-xs font-bold text-rose-900 block mb-1">
                      2. Colaborador Duplicado (QUE SERÁ UNIFICADO E REMOVIDO) *
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Todos os links atrelados a este cadastro serão transferidos para o principal.
                    </p>
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrar por nome, matrícula ou ID..."
                        value={buscaDuplicado}
                        onChange={(e) => setBuscaDuplicado(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <select
                      value={idDuplicado}
                      onChange={(e) => setIdDuplicado(e.target.value)}
                      className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-950"
                    >
                      <option value="">-- Selecione o Colaborador Duplicado --</option>
                      {pessoasFiltradasDuplicado.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({p.matricula || p.id}) — {p.funcao || 'Mecânico'} [{p.baseOperacional || 'Sem Base'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {colabDuplicado && vinculosDuplicado && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs space-y-1.5 text-rose-950">
                      <div className="flex items-center justify-between font-bold">
                        <span>{colabDuplicado.nome}</span>
                        <span className="font-mono text-[11px]">{colabDuplicado.matricula}</span>
                      </div>
                      <p className="text-[11px] text-rose-900">
                        {colabDuplicado.funcao} • {colabDuplicado.setor} • Base: {colabDuplicado.baseOperacional || 'N/A'}
                      </p>
                      <div className="pt-1.5 border-t border-rose-200 flex flex-wrap gap-2 text-[10px] font-semibold text-rose-800">
                        <span>📚 {vinculosDuplicado.totalTreinamentos} treinos a transferir</span>
                        <span>📜 {vinculosDuplicado.totalLicencas} licenças a transferir</span>
                        <span>✈️ {vinculosDuplicado.totalDesignacoes} frotas a unir</span>
                        <span>🎖️ {vinculosDuplicado.totalCompetencias} competências a transferir</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Opções de Transferência */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-sky-700" />
                  <span>Opções de Consolidação e Reconciliação:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mesclarTreinamentos}
                      onChange={(e) => setMesclarTreinamentos(e.target.checked)}
                      className="rounded text-sky-900"
                    />
                    <span>Reatribuir treinamentos e reciclagens</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mesclarLicencas}
                      onChange={(e) => setMesclarLicencas(e.target.checked)}
                      className="rounded text-sky-900"
                    />
                    <span>Reatribuir licenças CHT / CCT / AMP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mesclarFrotas}
                      onChange={(e) => setMesclarFrotas(e.target.checked)}
                      className="rounded text-sky-900"
                    />
                    <span>Unir autorizações de frota (B737, A320, etc.) e APRS</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={atualizarDadosCadastraisVazios}
                      onChange={(e) => setAtualizarDadosCadastraisVazios(e.target.checked)}
                      className="rounded text-sky-900"
                    />
                    <span>Preencher campos cadastrais vazios do principal</span>
                  </label>
                </div>
              </div>

              {/* Botão de Ação de Mesclagem */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  {colabPrincipal && colabDuplicado ? (
                    <span>
                      Vínculos de <strong>{colabDuplicado.nome}</strong> serão movidos para{' '}
                      <strong>{colabPrincipal.nome}</strong>.
                    </span>
                  ) : (
                    <span>Selecione ambos os colaboradores para habilitar a unificação.</span>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  {colabDuplicado && (
                    <button
                      type="button"
                      onClick={() => setConfirmarDescarteDireto(true)}
                      className="px-3 py-2 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Excluir o duplicado e limpar os vínculos dele de uma vez só"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Vínculos e Descartar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!idPrincipal || !idDuplicado || isProcessing}
                    onClick={() => handleExecutarMesclagem(idPrincipal, idDuplicado)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sky-900 hover:bg-sky-800 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span>{isProcessing ? 'Executando Unificação...' : 'Confirmar e Unificar Vínculos'}</span>
                  </button>
                </div>
              </div>

              {/* Modal Secundário: Confirmar Descarte Direto com Limpeza */}
              {confirmarDescarteDireto && colabDuplicado && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Descartar Cadastro Duplicado e Limpar Vínculos Automaticamente</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Você está prestes a excluir definitivamente o cadastro de{' '}
                    <strong>{colabDuplicado.nome}</strong> ({colabDuplicado.matricula}) e remover
                    automaticamente os treinamentos e licenças atrelados a ele, sem precisar ir tela
                    por tela. Esta ação é auditada e irreversível.
                  </p>
                  <div>
                    <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                      Motivo do descarte:
                    </label>
                    <input
                      type="text"
                      value={motivoDescarte}
                      onChange={(e) => setMotivoDescarte(e.target.value)}
                      className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmarDescarteDireto(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleExecutarDescarteComLimpeza(colabDuplicado.id)}
                      className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? 'Excluindo...' : 'Confirmar Exclusão e Limpar Vínculos'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Conforme SGQ Impacto Aviation / RBAC 145: todas as transferências preservam as datas de conclusão oficiais.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
