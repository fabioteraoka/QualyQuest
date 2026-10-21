import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit2,
  ExternalLink,
  Filter,
  MapPin,
  Plus,
  Search,
  Trash2,
  Undo2,
  UserCheck,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { CategoriaPessoa, Pessoa, SituacaoPessoa } from '../types';
import { formatarDataBr } from '../utils/businessRules';

export const PessoasView: React.FC = () => {
  const { db, currentUser, showToast, navigateToFicha } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS');
  const [filtroSituacao, setFiltroSituacao] = useState<string>('Ativo');
  const [filtroBase, setFiltroBase] = useState<string>('TODAS');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<Pessoa | null>(null);

  // Form states
  const [id, setId] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<CategoriaPessoa>('Mecânico');
  const [situacao, setSituacao] = useState<SituacaoPessoa>('Ativo');
  const [basePrincipalId, setBasePrincipalId] = useState('GRU');
  const [clienteOuArea, setClienteOuArea] = useState('');
  const [canac, setCanac] = useState('');

  // Undo delete
  const [deletedPessoaBackup, setDeletedPessoaBackup] = useState<Pessoa | null>(null);

  const pessoasFiltradas = useMemo(() => {
    return db.pessoas.filter((p) => {
      if (filtroCategoria !== 'TODOS' && p.categoria !== filtroCategoria) return false;
      if (filtroSituacao !== 'TODOS' && p.situacao !== filtroSituacao) return false;
      if (filtroBase !== 'TODAS' && p.base_principal_id !== filtroBase) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matches =
          p.nome.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.canac.includes(q) ||
          p.cliente_ou_area.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [db.pessoas, filtroCategoria, filtroSituacao, filtroBase, busca]);

  const handleOpenNew = () => {
    setEditingPessoa(null);
    const nextNum = db.pessoas.length + 1;
    setId(`MEC-${String(nextNum).padStart(3, '0')}`);
    setNome('');
    setCategoria('Mecânico');
    setSituacao('Ativo');
    setBasePrincipalId('GRU');
    setClienteOuArea('');
    setCanac('');
    setModalOpen(true);
  };

  const handleEdit = (p: Pessoa) => {
    setEditingPessoa(p);
    setId(p.id);
    setNome(p.nome);
    setCategoria(p.categoria);
    setSituacao(p.situacao);
    setBasePrincipalId(p.base_principal_id);
    setClienteOuArea(p.cliente_ou_area || '');
    setCanac(p.canac || '');
    setModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !nome.trim()) return;

    setIsSubmitting(true);
    try {
      const pessoaData: Pessoa = {
        id: id.trim(),
        nome: nome.trim(),
        categoria,
        situacao,
        base_principal_id: basePrincipalId,
        cliente_ou_area: clienteOuArea.trim(),
        canac: canac.trim(),
        criado_em: editingPessoa?.criado_em || new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        atualizado_por: currentUser.nome,
      };

      await repository.savePessoa(pessoaData, currentUser.nome);

      // If new mechanic, also ensure default designation record exists
      if (!editingPessoa) {
        await repository.saveDesignacaoPessoa({
          pessoa_id: id.trim(),
          imp: `IMP-${id.replace(/[^0-9]/g, '') || '999'}`,
          easa_type: 'N/A',
          incluir_na_lista: true,
          nome_na_lista: nome.trim(),
        });
        await repository.setDesignacaoBasesForPessoa(id.trim(), [basePrincipalId]);
      }

      setModalOpen(false);
      showToast(`Colaborador ${nome.trim()} salvo com sucesso no Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao persistir no Firestore: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (p: Pessoa) => {
    if (confirm(`Deseja realmente remover o colaborador ${p.nome}?`)) {
      try {
        const removed = await repository.deletePessoa(p.id, currentUser.nome);
        if (removed) {
          setDeletedPessoaBackup(removed);
          showToast(`Colaborador ${p.nome} excluído do Firestore.`);
        }
      } catch (err: any) {
        showToast(`Erro ao excluir do Firestore: ${err?.message || err}`);
      }
    }
  };

  const handleUndo = async () => {
    if (deletedPessoaBackup) {
      try {
        await repository.savePessoa(deletedPessoaBackup, currentUser.nome);
        showToast(`Exclusão de ${deletedPessoaBackup.nome} desfeita no Firestore.`);
        setDeletedPessoaBackup(null);
      } catch (err: any) {
        showToast(`Erro ao restaurar no Firestore: ${err?.message || err}`);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header and Controls */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Cadastro Geral de Pessoal &amp; Mecânicos</span>
            <span className="text-xs bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
              {pessoasFiltradas.length} pessoas
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerenciamento de mecânicos de linha, técnicos de hangar e equipe administrativa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {deletedPessoaBackup && (
            <button
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 rounded text-xs font-semibold hover:bg-amber-200 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Desfazer Exclusão</span>
            </button>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, ID, CANAC..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-52"
            />
          </div>

          {/* Base */}
          <select
            value={filtroBase}
            onChange={(e) => setFiltroBase(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODAS">Todas as Bases</option>
            {db.bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}
              </option>
            ))}
          </select>

          {/* Categoria */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODOS">Todas Categorias</option>
            <option value="Mecânico">Mecânico</option>
            <option value="Administrativo">Administrativo</option>
          </select>

          {/* Situação */}
          <select
            value={filtroSituacao}
            onChange={(e) => setFiltroSituacao(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODOS">Todas Situações</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>

          {currentUser.perfil !== 'Leitor' && (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Colaborador</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Nome Completo</th>
                <th className="py-2.5 px-2">Categoria</th>
                <th className="py-2.5 px-2">Base Principal</th>
                <th className="py-2.5 px-3">Cliente / Área</th>
                <th className="py-2.5 px-3 text-center">CANAC</th>
                <th className="py-2.5 px-2 text-center">Situação</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pessoasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs italic">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              ) : (
                pessoasFiltradas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-500">{p.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <button
                        onClick={() => navigateToFicha(p.id)}
                        className="hover:underline hover:text-sky-900 cursor-pointer text-left font-bold"
                      >
                        {p.nome}
                      </button>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.categoria === 'Mecânico'
                            ? 'bg-sky-50 text-sky-900 border border-sky-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {p.categoria}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                      {p.base_principal_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{p.cliente_ou_area || '-'}</td>
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-800">
                      {p.canac || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.situacao === 'Ativo'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.situacao}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigateToFicha(p.id)}
                          className="text-xs text-sky-700 hover:underline font-semibold cursor-pointer"
                        >
                          Ficha
                        </button>
                        {currentUser.perfil !== 'Leitor' && (
                          <>
                            <button
                              onClick={() => handleEdit(p)}
                              className="text-slate-500 hover:text-sky-700 p-1 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              className="text-slate-400 hover:text-red-700 p-1 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingPessoa ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">ID (PK):</label>
                <input
                  type="text"
                  required
                  disabled={!!editingPessoa}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">CANAC (6 dígitos):</label>
                <input
                  type="text"
                  placeholder="Ex.: 105420"
                  value={canac}
                  onChange={(e) => setCanac(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nome Completo Oficial:</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Categoria:</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="Mecânico">Mecânico</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Base Principal:</label>
                <select
                  value={basePrincipalId}
                  onChange={(e) => setBasePrincipalId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-bold"
                >
                  {db.bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Situação:</label>
                <select
                  value={situacao}
                  onChange={(e) => setSituacao(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Cliente / Área:</label>
              <input
                type="text"
                placeholder="Ex.: EuroAtlantic, Atlas/Kalitta, Diretoria"
                value={clienteOuArea}
                onChange={(e) => setClienteOuArea(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
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
                Salvar Colaborador
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
