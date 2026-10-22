import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  Download,
  Edit2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { CursoCatalogo, Treinamento } from '../types';
import {
  calcularStatusTreinamento,
  formatarDataBr,
  parseMotoresTexto,
} from '../utils/businessRules';

export const TreinamentosView: React.FC = () => {
  const { db, dataReferencia, currentUser, showToast, navigateToFicha } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Modals
  const [modalLoteOpen, setModalLoteOpen] = useState(false);
  const [modalIndividualOpen, setModalIndividualOpen] = useState(false);
  const [editingTrn, setEditingTrn] = useState<Treinamento | null>(null);
  const [modalRenovar, setModalRenovar] = useState<{ id: string; cursoNome: string; pessoaNome: string } | null>(null);

  // Individual Form State
  const [indPessoaId, setIndPessoaId] = useState('');
  const [indCursoId, setIndCursoId] = useState('');
  const [indDataExec, setIndDataExec] = useState(dataReferencia);
  const [indDataValidade, setIndDataValidade] = useState('');
  const [indResultado, setIndResultado] = useState<'APROVADO' | 'REPROVADO' | 'PENDENTE' | 'EM_ANDAMENTO'>('APROVADO');
  const [indInstrutor, setIndInstrutor] = useState('');
  const [indCargaHoraria, setIndCargaHoraria] = useState<number>(8);
  const [indNumeroCertificado, setIndNumeroCertificado] = useState('');
  const [indMotoresIds, setIndMotoresIds] = useState<string[]>([]);
  const [indObs, setIndObs] = useState('');

  // Batch Form State
  const [loteCursoId, setLoteCursoId] = useState('');
  const [loteDataExec, setLoteDataExec] = useState(dataReferencia);
  const [lotePessoasIds, setLotePessoasIds] = useState<string[]>([]);
  const [loteMotoresIds, setLoteMotoresIds] = useState<string[]>([]);
  const [loteObs, setLoteObs] = useState('');

  // Renewal Form State
  const [renovacaoData, setRenovacaoData] = useState(dataReferencia);

  const handleOpenNewIndividual = () => {
    setEditingTrn(null);
    setIndPessoaId(db.pessoas[0]?.id || '');
    setIndCursoId(db.cursosCatalogo[0]?.id || '');
    setIndDataExec(dataReferencia);
    setIndDataValidade('');
    setIndResultado('APROVADO');
    setIndInstrutor(currentUser.nome);
    setIndCargaHoraria(8);
    setIndNumeroCertificado('');
    setIndMotoresIds([]);
    setIndObs('');
    setModalIndividualOpen(true);
  };

  const handleEditIndividual = (t: Treinamento) => {
    setEditingTrn(t);
    setIndPessoaId(t.pessoa_id);
    setIndCursoId(t.curso_id);
    setIndDataExec(t.data_execucao);
    setIndDataValidade(t.data_validade || '');
    setIndResultado(t.resultado || 'APROVADO');
    setIndInstrutor(t.instrutor || '');
    setIndCargaHoraria(t.carga_horaria || 8);
    setIndNumeroCertificado(t.numero_certificado || '');
    const mIds = db.treinamentosMotor.filter((tm) => tm.treinamento_id === t.id).map((tm) => tm.motor_id);
    setIndMotoresIds(mIds);
    setIndObs(t.observacao || '');
    setModalIndividualOpen(true);
  };

  const handleSaveIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indPessoaId || !indCursoId || !indDataExec) {
      alert('Selecione o colaborador, o curso e a data de realização.');
      return;
    }

    const trnId = editingTrn?.id || `TRN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const trn: Treinamento = {
      id: trnId,
      pessoa_id: indPessoaId,
      curso_id: indCursoId,
      data_execucao: indDataExec,
      data_validade: indDataValidade || undefined,
      resultado: indResultado,
      instrutor: indInstrutor.trim() || currentUser.nome,
      carga_horaria: Number(indCargaHoraria) || 8,
      numero_certificado: indNumeroCertificado.trim() || undefined,
      observacao: indObs.trim() || undefined,
      substituido_por: editingTrn?.substituido_por || null,
      registro_treinamento_origem_id: editingTrn?.registro_treinamento_origem_id,
      criado_em: editingTrn?.criado_em || new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      atualizado_por: currentUser.nome,
    };

    try {
      await repository.saveTreinamento(trn, indMotoresIds, currentUser.nome);
      setModalIndividualOpen(false);
      showToast('Registro de treinamento salvo com sucesso no Firestore!');
    } catch (err: any) {
      showToast(`Erro ao salvar treinamento: ${err?.message || err}`);
    }
  };

  const cursosMap = useMemo(() => {
    const map = new Map<string, CursoCatalogo>();
    db.cursosCatalogo.forEach((c) => map.set(c.id, c));
    return map;
  }, [db.cursosCatalogo]);

  const pessoasMap = useMemo(() => {
    const map = new Map<string, string>();
    db.pessoas.forEach((p) => map.set(p.id, p.nome));
    return map;
  }, [db.pessoas]);

  const motoresMap = useMemo(() => {
    const map = new Map<string, string>();
    db.motoresCatalogo.forEach((m) => {
      map.set(m.id, m.modelo ? `${m.fabricante} ${m.modelo}` : m.fabricante);
    });
    return map;
  }, [db.motoresCatalogo]);

  const treinamentosFiltrados = useMemo(() => {
    return db.treinamentos.filter((t) => {
      if (!mostrarHistorico && t.substituido_por) return false;

      const curso = cursosMap.get(t.curso_id);
      if (filtroGrupo !== 'TODOS' && curso?.grupo !== filtroGrupo) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const pNome = (pessoasMap.get(t.pessoa_id) || '').toLowerCase();
        const cNome = (curso?.curso || '').toLowerCase();
        const cFrota = (curso?.variante || curso?.frota || '').toLowerCase();

        const matches =
          pNome.includes(q) ||
          cNome.includes(q) ||
          cFrota.includes(q) ||
          t.pessoa_id.toLowerCase().includes(q) ||
          (t.motor_original || '').toLowerCase().includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [db.treinamentos, mostrarHistorico, filtroGrupo, busca, cursosMap, pessoasMap]);

  // Handle Save Batch
  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loteCursoId || !loteDataExec || lotePessoasIds.length === 0) {
      alert('Selecione o curso, a data de execução e ao menos um colaborador.');
      return;
    }

    const now = new Date().toISOString();
    try {
      const savePromises = lotePessoasIds.map((pId) => {
        const id = `TRN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const trn: Treinamento = {
          id,
          pessoa_id: pId,
          curso_id: loteCursoId,
          data_execucao: loteDataExec,
          observacao: loteObs,
          substituido_por: null,
          criado_em: now,
          atualizado_em: now,
          atualizado_por: currentUser.nome,
        };
        return repository.saveTreinamento(trn, loteMotoresIds, currentUser.nome);
      });

      await Promise.all(savePromises);

      setModalLoteOpen(false);
      showToast(`Treinamento lançado para ${lotePessoasIds.length} colaboradores com sucesso no Firestore!`);
      setLotePessoasIds([]);
      setLoteMotoresIds([]);
    } catch (err: any) {
      showToast(`Erro ao lançar treinamento em lote: ${err?.message || err}`);
    }
  };

  const handleRenovacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRenovar || !renovacaoData) return;

    try {
      await repository.renovarTreinamento(modalRenovar.id, renovacaoData, currentUser.nome);
      setModalRenovar(null);
      showToast(`Treinamento renovado com sucesso no Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao renovar treinamento no Firestore: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este treinamento?')) {
      try {
        await repository.deleteTreinamento(id, currentUser.nome);
        showToast('Treinamento excluído do Firestore.');
      } catch (err: any) {
        showToast(`Erro ao excluir treinamento do Firestore: ${err?.message || err}`);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header and Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Treinamentos Executados &amp; Roster Operacional</span>
            <span className="text-xs bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
              {treinamentosFiltrados.length} registros
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lançamento individual e em lote (turmas de treinamento) com controle de vigência.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar mecânico, curso, frota..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-52"
            />
          </div>

          {/* Grupo */}
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODOS">Todos os Grupos</option>
            <option value="Frota">Treinamentos de Frota</option>
            <option value="Doutrinação">Doutrinação</option>
          </select>

          {/* Mostrar Historico Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarHistorico}
              onChange={(e) => setMostrarHistorico(e.target.checked)}
            />
            <span>Ver Histórico de Substituídos</span>
          </label>

          {currentUser.perfil !== 'Leitor' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenNewIndividual}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lançamento Individual</span>
              </button>
              <button
                onClick={() => setModalLoteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Lançamento em Lote</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Mecânico</th>
                <th className="py-2.5 px-2">Grupo</th>
                <th className="py-2.5 px-3">Frota / Variante</th>
                <th className="py-2.5 px-3">Curso</th>
                <th className="py-2.5 px-2 text-center">Data Execução</th>
                <th className="py-2.5 px-2 text-center">Data Vencimento</th>
                <th className="py-2.5 px-2 text-center">Dias Restantes</th>
                <th className="py-2.5 px-3 text-center">Situação</th>
                <th className="py-2.5 px-3">Motores Habilitados</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {treinamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 text-xs italic">
                    Nenhum treinamento encontrado.
                  </td>
                </tr>
              ) : (
                treinamentosFiltrados.map((t) => {
                  const c = cursosMap.get(t.curso_id);
                  const pNome = pessoasMap.get(t.pessoa_id) || t.pessoa_id;
                  const { status, data_vencimento, dias_para_vencer } = calcularStatusTreinamento(
                    t,
                    c,
                    dataReferencia,
                    db.configuracao
                  );

                  const motorIds = db.treinamentosMotor
                    .filter((tm) => tm.treinamento_id === t.id)
                    .map((tm) => tm.motor_id);

                  const motoresNomes = motorIds.map((mId) => motoresMap.get(mId) || mId);
                  const isSubstituido = !!t.substituido_por;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50 ${isSubstituido ? 'opacity-40 bg-slate-50/50' : ''}`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => navigateToFicha(t.pessoa_id)}
                          className="hover:underline hover:text-sky-900 cursor-pointer text-left font-bold"
                        >
                          {pNome}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600">{c?.grupo || '-'}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {c?.variante || c?.frota || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-medium">
                        {c?.curso || t.curso_id}
                        {isSubstituido && (
                          <span className="ml-1 text-[9px] text-slate-400 italic">
                            (Histórico)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                        {formatarDataBr(t.data_execucao)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        {data_vencimento ? formatarDataBr(data_vencimento) : 'Sem vencimento'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums font-semibold">
                        {dias_para_vencer !== null ? (
                          <span className={dias_para_vencer < 0 ? 'text-red-700 font-bold' : 'text-slate-700'}>
                            {dias_para_vencer}d
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        {motoresNomes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {motoresNomes.map((m, idx) => (
                              <span
                                key={idx}
                                className="bg-sky-50 text-sky-950 border border-sky-200 px-1.5 py-0.2 rounded font-mono text-[9px]"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : t.motor_original ? (
                          <span className="font-mono text-slate-700">{t.motor_original}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isSubstituido && currentUser.perfil !== 'Leitor' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditIndividual(t)}
                              className="text-slate-500 hover:text-sky-700 p-1 cursor-pointer"
                              title="Editar registro de treinamento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setModalRenovar({
                                  id: t.id,
                                  cursoNome: c?.curso || t.curso_id,
                                  pessoaNome: pNome,
                                })
                              }
                              className="text-sky-700 hover:text-sky-900 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                              title="Renovar treinamento"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Renovar</span>
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="text-slate-400 hover:text-red-700 p-1 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Lançamento em Lote (Turma) */}
      {modalLoteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLote}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Lançamento em Lote de Treinamento (Turma)
              </h3>
              <button
                type="button"
                onClick={() => setModalLoteOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Curso do Catálogo:
                </label>
                <select
                  required
                  value={loteCursoId}
                  onChange={(e) => setLoteCursoId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="">Selecione um curso...</option>
                  {db.cursosCatalogo.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.grupo}] {c.variante ? `${c.variante} - ` : ''}
                      {c.curso} ({c.validade_dias}d)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data de Execução da Turma:
                </label>
                <input
                  type="date"
                  required
                  value={loteDataExec}
                  onChange={(e) => setLoteDataExec(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            {/* Mechanics Multi-selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Selecionar Mecânicos ({lotePessoasIds.length} selecionados):
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setLotePessoasIds(
                        db.pessoas.filter((p) => p.categoria === 'Mecânico').map((p) => p.id)
                      )
                    }
                    className="text-sky-700 hover:underline cursor-pointer"
                  >
                    Selecionar Todos Mecânicos
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setLotePessoasIds([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded text-xs bg-slate-50">
                {db.pessoas.map((p) => {
                  const checked = lotePessoasIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setLotePessoasIds([...lotePessoasIds, p.id]);
                          else setLotePessoasIds(lotePessoasIds.filter((id) => id !== p.id));
                        }}
                      />
                      <span className="truncate">{p.nome}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Engines Multi-selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motores Habilitados por este Curso (Opcional):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded text-xs bg-slate-50">
                {db.motoresCatalogo.map((m) => {
                  const checked = loteMotoresIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setLoteMotoresIds([...loteMotoresIds, m.id]);
                          else setLoteMotoresIds(loteMotoresIds.filter((id) => id !== m.id));
                        }}
                      />
                      <span className="font-mono text-[11px]">
                        {m.fabricante} {m.modelo}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Observações do Lote:
              </label>
              <input
                type="text"
                placeholder="Ex.: Turma 2026/02 — Treinamento Teórico e Prático"
                value={loteObs}
                onChange={(e) => setLoteObs(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalLoteOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Lançar para {lotePessoasIds.length} Colaboradores
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Renovar */}
      {modalRenovar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRenovacao}
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Renovar Treinamento</h3>
              <button
                type="button"
                onClick={() => setModalRenovar(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Renovando <strong>{modalRenovar.cursoNome}</strong> para <strong>{modalRenovar.pessoaNome}</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nova Data de Execução:
              </label>
              <input
                type="date"
                required
                value={renovacaoData}
                onChange={(e) => setRenovacaoData(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalRenovar(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Confirmar Renovação
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal: Lançamento Individual / Edição */}
      {modalIndividualOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveIndividual}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingTrn ? 'Editar Treinamento (Cadastro Mestre Rooster)' : 'Novo Treinamento Individual (Cadastro Mestre Rooster)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Registro oficial com rastreabilidade de validade, evidência e motores habilitados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalIndividualOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Colaborador / Mecânico:</label>
                <select
                  value={indPessoaId}
                  onChange={(e) => setIndPessoaId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                  required
                >
                  <option value="">Selecione o Colaborador...</option>
                  {db.pessoas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.canac ? `(CANAC: ${p.canac})` : `(${p.id})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Curso do Catálogo:</label>
                <select
                  value={indCursoId}
                  onChange={(e) => setIndCursoId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                  required
                >
                  <option value="">Selecione o Curso...</option>
                  {db.cursosCatalogo.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.grupo}] {c.curso} {c.frota ? `— ${c.frota}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Data de Realização:</label>
                <input
                  type="date"
                  required
                  value={indDataExec}
                  onChange={(e) => setIndDataExec(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Data de Validade (Opcional):
                </label>
                <input
                  type="date"
                  value={indDataValidade}
                  onChange={(e) => setIndDataValidade(e.target.value)}
                  placeholder="Automático pelo catálogo se vazio"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Resultado:</label>
                <select
                  value={indResultado}
                  onChange={(e) => setIndResultado(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="APROVADO">Aprovado</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="REPROVADO">Reprovado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Instrutor / Entidade:</label>
                <input
                  type="text"
                  placeholder="Ex.: Impacto Aviation Training / Eng. Marcus"
                  value={indInstrutor}
                  onChange={(e) => setIndInstrutor(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Carga Horária (Horas):</label>
                <input
                  type="number"
                  min={1}
                  value={indCargaHoraria}
                  onChange={(e) => setIndCargaHoraria(parseInt(e.target.value) || 8)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Número do Certificado:</label>
                <input
                  type="text"
                  placeholder="Ex.: CERT-2026-0042"
                  value={indNumeroCertificado}
                  onChange={(e) => setIndNumeroCertificado(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            {/* Motores Habilitados */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motores Habilitados por este Curso (Opcional):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded text-xs bg-slate-50">
                {db.motoresCatalogo.map((m) => {
                  const checked = indMotoresIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setIndMotoresIds([...indMotoresIds, m.id]);
                          else setIndMotoresIds(indMotoresIds.filter((id) => id !== m.id));
                        }}
                      />
                      <span className="font-mono text-[11px]">
                        {m.fabricante} {m.modelo}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Observações do Treinamento:</label>
              <textarea
                rows={2}
                placeholder="Evidência física arquivada, aproveitamento, observações SGQ..."
                value={indObs}
                onChange={(e) => setIndObs(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalIndividualOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Salvar Registro Mestre
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
