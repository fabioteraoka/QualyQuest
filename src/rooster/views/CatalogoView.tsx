import React, { useMemo, useState } from 'react';
import { BookOpen, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { CursoCatalogo, GrupoCurso } from '../types';

export const CatalogoView: React.FC = () => {
  const { db, currentUser, showToast } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState<string>('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<CursoCatalogo | null>(null);

  // Form states
  const [id, setId] = useState('');
  const [grupo, setGrupo] = useState<GrupoCurso>('Frota');
  const [frota, setFrota] = useState('');
  const [variante, setVariante] = useState('');
  const [curso, setCurso] = useState('');
  const [validadeDias, setValidadeDias] = useState<number>(1825);

  const cursosFiltrados = useMemo(() => {
    return db.cursosCatalogo.filter((c) => {
      if (filtroGrupo !== 'TODOS' && c.grupo !== filtroGrupo) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matches =
          c.curso.toLowerCase().includes(q) ||
          c.variante.toLowerCase().includes(q) ||
          c.frota.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [db.cursosCatalogo, filtroGrupo, busca]);

  const handleOpenNew = () => {
    setEditingCurso(null);
    setId(`CUR-${Date.now()}`);
    setGrupo('Frota');
    setFrota('B737 NG/MAX');
    setVariante('B737 NG');
    setCurso('Line & Base');
    setValidadeDias(1825);
    setModalOpen(true);
  };

  const handleEdit = (c: CursoCatalogo) => {
    setEditingCurso(c);
    setId(c.id);
    setGrupo(c.grupo);
    setFrota(c.frota || '');
    setVariante(c.variante || '');
    setCurso(c.curso);
    setValidadeDias(c.validade_dias);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!curso) return;

    const cursoData: CursoCatalogo = {
      id: editingCurso?.id || id,
      grupo,
      frota: grupo === 'Frota' ? frota : '',
      variante: grupo === 'Frota' ? variante : '',
      curso,
      validade_dias: Number(validadeDias) || 1825,
      ativo: true,
    };

    repository.saveCursoCatalogo(cursoData, currentUser.nome);
    setModalOpen(false);
    showToast(`Curso ${curso} atualizado no catálogo!`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Catálogo Mestre de Cursos &amp; Treinamentos</span>
            <span className="text-xs bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
              {cursosFiltrados.length} cursos
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define a validade padrão em dias de cada treinamento (Doutrinação e Frotas de Aeronaves).
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
              placeholder="Buscar curso, variante..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-52"
            />
          </div>

          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODOS">Todos os Grupos</option>
            <option value="Doutrinação">Doutrinação</option>
            <option value="Frota">Frota</option>
          </select>

          {currentUser.perfil !== 'Leitor' && (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Curso</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Grupo</th>
                <th className="py-2.5 px-3">Frota</th>
                <th className="py-2.5 px-3">Variante da Aeronave</th>
                <th className="py-2.5 px-3">Nome do Curso</th>
                <th className="py-2.5 px-3 text-center">Validade Padrão</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cursosFiltrados.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.grupo === 'Doutrinação'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      {c.grupo}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-700">{c.frota || '—'}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{c.variante || '—'}</td>
                  <td className="py-2 px-3 font-bold text-slate-900">{c.curso}</td>
                  <td className="py-2 px-3 text-center font-mono tabular-nums font-bold text-slate-800">
                    {c.validade_dias >= 36500 ? (
                      <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Sem vencimento
                      </span>
                    ) : (
                      <span>
                        {c.validade_dias} dias{' '}
                        <span className="text-slate-400 font-normal">
                          (~{Math.round(c.validade_dias / 365)} anos)
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {currentUser.perfil !== 'Leitor' && (
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-slate-500 hover:text-sky-700 p-1 cursor-pointer"
                        title="Editar validade"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit / Add */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCurso ? 'Editar Curso' : 'Novo Curso no Catálogo'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Grupo:</label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              >
                <option value="Frota">Frota</option>
                <option value="Doutrinação">Doutrinação</option>
              </select>
            </div>

            {grupo === 'Frota' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Frota:</label>
                  <input
                    type="text"
                    required
                    value={frota}
                    onChange={(e) => setFrota(e.target.value)}
                    placeholder="Ex.: B737 NG/MAX"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Variante:</label>
                  <input
                    type="text"
                    required
                    value={variante}
                    onChange={(e) => setVariante(e.target.value)}
                    placeholder="Ex.: B737 NG"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nome do Curso:</label>
              <input
                type="text"
                required
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                placeholder="Ex.: Familiarization, Line & Base..."
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Validade Padrão em Dias (100000 = Sem Vencimento):
              </label>
              <input
                type="number"
                required
                value={validadeDias}
                onChange={(e) => setValidadeDias(parseInt(e.target.value) || 1825)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
              />
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => setValidadeDias(730)}
                  className="text-sky-700 hover:underline cursor-pointer"
                >
                  730d (2 anos)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setValidadeDias(1095)}
                  className="text-sky-700 hover:underline cursor-pointer"
                >
                  1095d (3 anos)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setValidadeDias(1825)}
                  className="text-sky-700 hover:underline cursor-pointer"
                >
                  1825d (5 anos)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setValidadeDias(100000)}
                  className="text-sky-700 hover:underline cursor-pointer"
                >
                  Sem Vencimento
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Salvar no Catálogo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
