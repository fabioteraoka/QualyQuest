import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  History,
  CheckCircle,
  FileText,
  AlertOctagon,
  Info
} from 'lucide-react';
import { ColaboradorPessoa, RestricaoOperacional, UserProfile } from '../../types';

interface RestricaoOperacionalModalProps {
  colaborador: ColaboradorPessoa;
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSalvar: (colaboradorAtualizado: ColaboradorPessoa, justificativaAuditoria: string) => Promise<void>;
}

export const RestricaoOperacionalModal: React.FC<RestricaoOperacionalModalProps> = ({
  colaborador,
  user,
  isOpen,
  onClose,
  onSalvar
}) => {
  const restricaoAtual = colaborador.restricaoOperacional;
  const isBloqueadoAtivo = restricaoAtual?.possuiRestricao ?? false;

  // Modos: 'VISUALIZAR' | 'EDITAR' | 'ENCERRAR'
  const [modo, setModo] = useState<'VISUALIZAR' | 'EDITAR' | 'ENCERRAR'>(
    isBloqueadoAtivo ? 'VISUALIZAR' : 'EDITAR'
  );

  // Estados de formulário de Edição / Aplicação de Bloqueio
  const [motivo, setMotivo] = useState(restricaoAtual?.motivo || '');
  const [tipoBloqueio, setTipoBloqueio] = useState<'IMPEDITIVO' | 'ALERTA'>(
    restricaoAtual?.impedeExecucao ? 'IMPEDITIVO' : 'ALERTA'
  );
  const [dataInicio, setDataInicio] = useState(
    restricaoAtual?.dataInicio || new Date().toISOString().slice(0, 10)
  );
  const [dataFim, setDataFim] = useState(restricaoAtual?.dataFim || '');

  // Estado de encerramento
  const [justificativaEncerramento, setJustificativaEncerramento] = useState('');
  const [isSalvando, setIsSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const podeEditar = user?.role === 'ADMIN' || user?.role === 'GESTOR_SGQ' || (user?.role as any) === 'RESPONSAVEL_TECNICO' || user?.role === 'AUDITOR_LIDER';

  const handleSalvarBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!motivo.trim()) {
      setErro('Informe o motivo detalhado da restrição operacional.');
      return;
    }

    if (!dataInicio) {
      setErro('Informe a data de início da restrição.');
      return;
    }

    try {
      setIsSalvando(true);
      const novaRestricao: RestricaoOperacional = {
        possuiRestricao: true,
        motivo: motivo.trim(),
        dataInicio,
        dataFim: dataFim || undefined,
        impedeExecucao: tipoBloqueio === 'IMPEDITIVO',
        apenasAlerta: tipoBloqueio === 'ALERTA',
        registradoPor: user?.name || user?.email || 'Gestor SGQ',
        registradoEm: new Date().toISOString(),
        historicoEncerramentos: restricaoAtual?.historicoEncerramentos || []
      };

      const colaboradorAtualizado: ColaboradorPessoa = {
        ...colaborador,
        restricaoOperacional: novaRestricao,
        updatedAt: new Date().toISOString()
      };

      const justificativaAuditoria = `${
        tipoBloqueio === 'IMPEDITIVO' ? 'Bloqueio Impeditivo' : 'Alerta Operacional'
      } cadastrado: ${motivo.trim()} por ${user?.name || user?.email}`;

      await onSalvar(colaboradorAtualizado, justificativaAuditoria);
      onClose();
    } catch (err: any) {
      setErro('Erro ao salvar restrição: ' + (err.message || 'Falha de comunicação.'));
    } finally {
      setIsSalvando(false);
    }
  };

  const handleConfirmarEncerramento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!justificativaEncerramento.trim()) {
      setErro('A justificativa técnica de encerramento da restrição é obrigatória.');
      return;
    }

    try {
      setIsSalvando(true);
      const historicoAnterior = restricaoAtual?.historicoEncerramentos || [];
      const novoRegistroEncerramento = {
        data: new Date().toISOString(),
        encerradoPor: user?.name || user?.email || 'Gestor SGQ',
        motivo: justificativaEncerramento.trim()
      };

      const novaRestricao: RestricaoOperacional = {
        possuiRestricao: false,
        motivo: undefined,
        dataInicio: undefined,
        dataFim: undefined,
        impedeExecucao: false,
        apenasAlerta: false,
        registradoPor: restricaoAtual?.registradoPor,
        registradoEm: restricaoAtual?.registradoEm,
        historicoEncerramentos: [...historicoAnterior, novoRegistroEncerramento]
      };

      const colaboradorAtualizado: ColaboradorPessoa = {
        ...colaborador,
        restricaoOperacional: novaRestricao,
        updatedAt: new Date().toISOString()
      };

      const justificativaAuditoria = `Restrição operacional encerrada por ${
        user?.name || user?.email
      }: ${justificativaEncerramento.trim()}`;

      await onSalvar(colaboradorAtualizado, justificativaAuditoria);
      onClose();
    } catch (err: any) {
      setErro('Erro ao encerrar restrição: ' + (err.message || 'Falha de comunicação.'));
    } finally {
      setIsSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className={`p-5 flex items-start justify-between border-b ${
          isBloqueadoAtivo
            ? restricaoAtual?.impedeExecucao ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isBloqueadoAtivo
                ? restricaoAtual?.impedeExecucao ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                : 'bg-blue-600 text-white'
            }`}>
              {isBloqueadoAtivo ? (
                restricaoAtual?.impedeExecucao ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gestão de Bloqueio Operacional Individual
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Colaborador: <strong className="text-slate-900">{colaborador.nome}</strong> • Matrícula/CANAC:{' '}
                <span className="font-mono">{colaborador.matricula || 'N/A'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informação Técnica de Arquitetura SGQ */}
        <div className="bg-sky-50/80 border-b border-sky-100 p-3.5 text-xs text-sky-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">Diferença de Origens no Rooster / QualyQuest:</span>
            <p className="text-sky-800 leading-relaxed text-[11px]">
              <strong>Bloqueio Individual (Cadastral):</strong> Editável aqui por gestores (motivo médico, afastamento, quarentena disciplinar ou decisão técnica formal).
              <br />
              <strong>Bloqueio Técnico (CHT / Treinamentos):</strong> Calculado dinamicamente pela matriz quando habilitações obrigatórias ou cursos periódicos vencem. Não deve ser editado manualmente sem a devida renovação do treinamento.
            </p>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-5">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* MODO 1: VISUALIZAÇÃO DO STATUS ATUAL */}
          {modo === 'VISUALIZAR' && isBloqueadoAtivo && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${
                restricaoAtual?.impedeExecucao ? 'bg-rose-50/70 border-rose-300' : 'bg-amber-50/70 border-amber-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    restricaoAtual?.impedeExecucao ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {restricaoAtual?.impedeExecucao ? 'Impede Execução / Bloqueio Total' : 'Alerta Operacional Não-Impeditivo'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Registrado em: {restricaoAtual?.registradoEm ? new Date(restricaoAtual.registradoEm).toLocaleDateString('pt-BR') : 'Data não informada'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block">Motivo Formal do Bloqueio:</span>
                    <p className="text-slate-900 text-sm mt-0.5 p-2 bg-white rounded border border-slate-200/80">
                      {restricaoAtual?.motivo || 'Nenhum motivo detalhado informado.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="font-semibold text-slate-700 block">Início da Restrição:</span>
                      <span className="text-slate-900 font-mono">{restricaoAtual?.dataInicio || 'Imediato'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block">Previsão de Término:</span>
                      <span className="text-slate-900 font-mono">{restricaoAtual?.dataFim || 'Indeterminado / Até regularização'}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="font-semibold text-slate-700 block">Autor do Registro:</span>
                    <span className="text-slate-900">{restricaoAtual?.registradoPor || 'Gestão da Qualidade'}</span>
                  </div>
                </div>
              </div>

              {/* Histórico de Encerramentos Anteriores */}
              {restricaoAtual?.historicoEncerramentos && restricaoAtual.historicoEncerramentos.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    Histórico de Encerramentos Anteriores ({restricaoAtual.historicoEncerramentos.length})
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-xs">
                    {restricaoAtual.historicoEncerramentos.map((enc, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-500 font-mono">
                          <span>{new Date(enc.data).toLocaleString('pt-BR')}</span>
                          <span>Por: {enc.encerradoPor}</span>
                        </div>
                        <p className="text-slate-800 font-medium">{enc.motivo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              {podeEditar ? (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModo('EDITAR')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Editar Parâmetros do Bloqueio
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo('ENCERRAR')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Encerrar / Liberar Bloqueio
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center italic pt-2">
                  Apenas usuários com perfil Gestor SGQ, Auditor Líder ou Administrador podem alterar bloqueios operacionais.
                </p>
              )}
            </div>
          )}

          {/* MODO 2: FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          {modo === 'EDITAR' && (
            <form onSubmit={handleSalvarBloqueio} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Restrição Operacional:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition ${
                      tipoBloqueio === 'IMPEDITIVO'
                        ? 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="tipoBloqueio"
                        value="IMPEDITIVO"
                        checked={tipoBloqueio === 'IMPEDITIVO'}
                        onChange={() => setTipoBloqueio('IMPEDITIVO')}
                        className="mt-1 text-rose-600"
                      />
                      <div className="text-xs">
                        <strong className="block font-bold">Bloqueio Impeditivo</strong>
                        <span className="text-[11px] text-slate-500">Impede atribuição em ordens de serviço e voos</span>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition ${
                      tipoBloqueio === 'ALERTA'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="tipoBloqueio"
                        value="ALERTA"
                        checked={tipoBloqueio === 'ALERTA'}
                        onChange={() => setTipoBloqueio('ALERTA')}
                        className="mt-1 text-amber-600"
                      />
                      <div className="text-xs">
                        <strong className="block font-bold">Alerta Não Impeditivo</strong>
                        <span className="text-[11px] text-slate-500">Aviso informativo sem travar execução técnica</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motivo Formal e Detalhado da Restrição <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex: Restrição médica preventiva de esforço repetitivo até nova junta, ou aguardando conclusão de investigação de incidente técnico..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data Início <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data Término (Opcional):
                    </label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      placeholder="Deixe em branco se indeterminado"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                {isBloqueadoAtivo && (
                  <button
                    type="button"
                    onClick={() => setModo('VISUALIZAR')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancelar Edição
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSalvando ? 'Gravando no Firestore...' : isBloqueadoAtivo ? 'Atualizar Restrição' : 'Aplicar Restrição'}
                </button>
              </div>
            </form>
          )}

          {/* MODO 3: ENCERRAMENTO COM JUSTIFICATIVA OBRIGATÓRIA */}
          {modo === 'ENCERRAR' && (
            <form onSubmit={handleConfirmarEncerramento} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Liberação de Bloqueio Operacional</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  Ao encerrar este bloqueio, o colaborador voltará ao status de liberação operacional normal (sujeito à validação das suas qualificações e treinamentos na matriz). Esta liberação é auditada e vinculada ao seu usuário.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justificativa Técnica de Encerramento <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={justificativaEncerramento}
                  onChange={(e) => setJustificativaEncerramento(e.target.value)}
                  placeholder="Ex: Apresentado atestado médico de aptidão sem restrições, ou concluída a reciclagem interna conforme procedimento..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModo('VISUALIZAR')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSalvando}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSalvando ? 'Registrando Liberação...' : 'Confirmar Liberação & Registrar Auditoria'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
