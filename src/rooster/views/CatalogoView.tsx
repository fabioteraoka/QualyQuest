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
  const [codigo, setCodigo] = useState('');
  const [grupo, setGrupo] = useState<GrupoCurso>('Frota');
  const [frota, setFrota] = useState('');
  const [variante, setVariante] = useState('');
  const [curso, setCurso] = useState('');
  const [tipo, setTipo] = useState<string>('RECORRENTE');
  const [modalidade, setModalidade] = useState<string>('PRESENCIAL');
  const [cargaHoraria, setCargaHoraria] = useState<number>(8);
  const [ementa, setEmenta] = useState<string>('');
  const [recorrente, setRecorrente] = useState<boolean>(true);
  const [periodicidadeMeses, setPeriodicidadeMeses] = useState<number>(24);
  const [origemPrazo, setOrigemPrazo] = useState<string>('REGULAMENTO');
  const [nivelOuModulo, setNivelOuModulo] = useState<string>('');
  const [ativo, setAtivo] = useState<boolean>(true);

  const cursosFiltrados = useMemo(() => {
    return db.cursosCatalogo.filter((c) => {
      if (filtroGrupo !== 'TODOS' && c.grupo !== filtroGrupo) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matches =
          c.curso.toLowerCase().includes(q) ||
          (c.codigo && c.codigo.toLowerCase().includes(q)) ||
          c.variante.toLowerCase().includes(q) ||
          c.frota.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [db.cursosCatalogo, filtroGrupo, busca]);

  const handleOpenNew = () => {
    setEditingCurso(null);
    const newId = `CUR-${Date.now()}`;
    setId(newId);
    setCodigo(newId);
    setGrupo('Frota');
    setFrota('B737 NG/MAX');
    setVariante('B737 NG');
    setCurso('');
    setTipo('RECORRENTE');
    setModalidade('PRESENCIAL');
    setCargaHoraria(8);
    setEmenta('');
    setRecorrente(true);
    setPeriodicidadeMeses(24);
    setOrigemPrazo('REGULAMENTO');
    setNivelOuModulo('');
    setAtivo(true);
    setModalOpen(true);
  };

  const handleEdit = (c: CursoCatalogo) => {
    setEditingCurso(c);
    setId(c.id);
    setCodigo(c.codigo || c.id);
    setGrupo(c.grupo);
    setFrota(c.frota || '');
    setVariante(c.variante || '');
    setCurso(c.curso);
    setTipo(c.tipo || (c.grupo === 'Frota' ? 'RECORRENTE' : 'INICIAL'));
    setModalidade(c.modalidade || 'PRESENCIAL');
    setCargaHoraria(c.carga_horaria_horas || 8);
    setEmenta(c.ementa || '');
    setRecorrente(c.recorrente !== undefined ? c.recorrente : (c.validade_dias > 0 && !c.sem_validade));
    setPeriodicidadeMeses(c.periodicidade_meses || (c.validade_dias > 0 ? Math.round(c.validade_dias / 30) : 24));
    setOrigemPrazo(c.origem_prazo || 'REGULAMENTO');
    setNivelOuModulo(c.nivel_ou_modulo || '');
    setAtivo(c.ativo !== false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curso.trim()) return;

    const validadeEmDias = recorrente ? (periodicidadeMeses * 30) : 0;

    const cursoData: CursoCatalogo = {
      id: editingCurso?.id || id,
      codigo: codigo.trim() || id,
      grupo,
      frota: grupo === 'Frota' ? frota : '',
      variante: grupo === 'Frota' ? variante : '',
      curso: curso.trim(),
      tipo,
      modalidade,
      carga_horaria_horas: Number(cargaHoraria) || 8,
      ementa: ementa.trim(),
      recorrente,
      periodicidade_meses: recorrente ? periodicidadeMeses : undefined,
      origem_prazo: origemPrazo,
      nivel_ou_modulo: nivelOuModulo.trim() || undefined,
      validade_dias: validadeEmDias,
      sem_validade: !recorrente,
      ativo,
    };

    try {
      await repository.saveCursoCatalogo(cursoData, currentUser.nome);
      setModalOpen(false);
      showToast(`Curso "${curso.trim()}" persistido no catálogo mestre do Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao salvar curso no Firestore: ${err?.message || err}`);
    }
  };

  const handleDelete = async (cursoId: string, cursoNome: string) => {
    if (confirm(`Deseja realmente remover o curso "${cursoNome}" do catálogo?`)) {
      try {
        await repository.deleteCurso(cursoId, currentUser.nome);
        showToast(`Curso "${cursoNome}" removido do Firestore.`);
      } catch (err: any) {
        showToast(`Erro ao remover curso do Firestore: ${err?.message || err}`);
      }
    }
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
                    {c.sem_validade || c.validade_dias === 0 || c.validade_dias >= 36500 ? (
                      <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] font-semibold">
                        Sem Vencimento
                      </span>
                    ) : (
                      <span className="text-slate-800 text-[11px]">
                        {c.periodicidade_meses ? `${c.periodicidade_meses} meses` : `${c.validade_dias} dias`}
                        <span className="text-slate-400 font-normal ml-1 text-[10px]">
                          ({Math.round(c.validade_dias / 30)}m)
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {currentUser.perfil !== 'Leitor' && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="text-slate-500 hover:text-sky-700 p-1 cursor-pointer"
                          title="Editar curso"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.curso)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          title="Remover curso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingCurso ? 'Editar Curso (Catálogo Mestre Rooster)' : 'Novo Curso no Catálogo Mestre Rooster'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Os cursos aqui cadastrados compõem a matriz de treinamentos canônica compartilhada com o QualyQuest.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Código do Curso:</label>
                <input
                  type="text"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex.: CUR-B737-MAX"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Grupo / Categoria:</label>
                <select
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="Frota">Frota / Aeronaves</option>
                  <option value="Doutrinação">Doutrinação / SGQ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo de Treinamento:</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="INICIAL">Inicial</option>
                  <option value="RECORRENTE">Recorrente</option>
                  <option value="ATUALIZACAO">Atualização / Reciclagem</option>
                  <option value="QUALIFICACAO_ESPECIAL">Qualificação Especial</option>
                  <option value="OJT">OJT (Treinamento em Serviço)</option>
                  <option value="DIALOGO_SEGURANCA">Diálogo de Segurança / SGSO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Título / Nome Oficial do Curso:</label>
              <input
                type="text"
                required
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                placeholder="Ex.: B737 MAX Avionics Systems Line & Base"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-bold"
              />
            </div>

            {grupo === 'Frota' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-sky-50/50 p-3 rounded-lg border border-sky-100">
                <div>
                  <label className="text-xs font-semibold text-sky-950 block mb-1">Frota / Família:</label>
                  <input
                    type="text"
                    required
                    value={frota}
                    onChange={(e) => setFrota(e.target.value)}
                    placeholder="Ex.: B737 NG/MAX, A320 Family, E190-E2"
                    className="w-full text-xs p-2 bg-white border border-sky-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sky-950 block mb-1">Variantes de Aplicabilidade:</label>
                  <input
                    type="text"
                    required
                    value={variante}
                    onChange={(e) => setVariante(e.target.value)}
                    placeholder="Ex.: B737-8 MAX, B737-9 MAX"
                    className="w-full text-xs p-2 bg-white border border-sky-200 rounded"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Modalidade:</label>
                <select
                  value={modalidade}
                  onChange={(e) => setModalidade(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                >
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="EAD">EAD / Online</option>
                  <option value="HIBRIDO">Híbrido</option>
                  <option value="PRATICO_HANGAR">Prático Hangar</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Carga Horária (Horas):</label>
                <input
                  type="number"
                  min={1}
                  value={cargaHoraria}
                  onChange={(e) => setCargaHoraria(parseInt(e.target.value) || 8)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nível / Módulo:</label>
                <input
                  type="text"
                  placeholder="Ex.: Nível III (Avançado)"
                  value={nivelOuModulo}
                  onChange={(e) => setNivelOuModulo(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Controle de Validade & Recorrência */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recorrente}
                    onChange={(e) => setRecorrente(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Treinamento Recorrente (Possui Validade Periódica)
                  </span>
                </label>

                <span className="text-[11px] font-medium text-slate-500">
                  {recorrente ? `${periodicidadeMeses} meses (${periodicidadeMeses * 30} dias)` : 'Sem prazo de expiração'}
                </span>
              </div>

              {recorrente ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Periodicidade (em Meses):</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={periodicidadeMeses}
                      onChange={(e) => setPeriodicidadeMeses(parseInt(e.target.value) || 24)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono font-bold"
                    />
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => setPeriodicidadeMeses(12)}
                        className="text-sky-700 hover:underline cursor-pointer"
                      >
                        12m (1 ano)
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setPeriodicidadeMeses(24)}
                        className="text-sky-700 hover:underline cursor-pointer"
                      >
                        24m (2 anos)
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setPeriodicidadeMeses(36)}
                        className="text-sky-700 hover:underline cursor-pointer"
                      >
                        36m (3 anos)
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setPeriodicidadeMeses(60)}
                        className="text-sky-700 hover:underline cursor-pointer"
                      >
                        60m (5 anos)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Origem do Prazo:</label>
                    <select
                      value={origemPrazo}
                      onChange={(e) => setOrigemPrazo(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded text-slate-700"
                    >
                      <option value="REGULAMENTO">Regulamento Aeronáutico (ANAC / FAA / EASA)</option>
                      <option value="FABRICANTE">Recomendação do Fabricante (OEM)</option>
                      <option value="SGQ_INTERNO">Manual de Procedimentos SGQ</option>
                      <option value="CLIENTE">Requisito Específico de Cliente / Auditoria</option>
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  Curso definitivo ou de validade permanente. Não será atribuída nenhuma validade automática presumida.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Ementa / Conteúdo Programático:</label>
              <textarea
                rows={2}
                placeholder="Conteúdo abordado, objetivos de aprendizagem e referências..."
                value={ementa}
                onChange={(e) => setEmenta(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                Salvar no Catálogo Mestre
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
