import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
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
import { recordAudit, repository } from '../services/storage';
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
  const [basePrincipalId, setBasePrincipalId] = useState('');
  const [clienteOuArea, setClienteOuArea] = useState('');
  const [canac, setCanac] = useState('');
  const [matricula, setMatricula] = useState('');
  const [setor, setSetor] = useState('');
  const [funcao, setFuncao] = useState('');
  const [cargoOperacional, setCargoOperacional] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [contatoCorporativo, setContatoCorporativo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [possuiRestricao, setPossuiRestricao] = useState(false);
  const [motivoRestricao, setMotivoRestricao] = useState('');

  // Undo delete
  const [deletedPessoaBackup, setDeletedPessoaBackup] = useState<Pessoa | null>(null);

  // Mapeamento de bases para verificação de integridade
  const basesMap = useMemo(() => {
    const map = new Map<string, { id: string; sigla: string; nome: string; ativa: boolean; tipo?: string }>();
    db.bases.forEach((b) => {
      map.set(b.id.toUpperCase(), b);
      if (b.sigla) map.set(b.sigla.toUpperCase(), b);
    });
    return map;
  }, [db.bases]);

  const pessoasFiltradas = useMemo(() => {
    return db.pessoas.filter((p) => {
      if (filtroCategoria !== 'TODOS' && p.categoria !== filtroCategoria) return false;
      if (filtroSituacao !== 'TODOS' && p.situacao !== filtroSituacao) return false;

      if (filtroBase === 'PENDENTES_REGULARIZACAO') {
        const bId = (p.base_principal_id || '').trim().toUpperCase();
        const baseObj = basesMap.get(bId);
        if (bId && baseObj && baseObj.ativa) return false;
      } else if (filtroBase !== 'TODAS' && (p.base_principal_id || '').toUpperCase() !== filtroBase.toUpperCase()) {
        return false;
      }

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matches =
          p.nome.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.canac.includes(q) ||
          p.cliente_ou_area.toLowerCase().includes(q) ||
          (p.base_principal_id && p.base_principal_id.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [db.pessoas, filtroCategoria, filtroSituacao, filtroBase, busca, basesMap]);

  const handleOpenNew = () => {
    setEditingPessoa(null);
    const nextNum = db.pessoas.length + 1;
    setId(`MEC-${String(nextNum).padStart(3, '0')}`);
    setNome('');
    setCategoria('Mecânico');
    setSituacao('Ativo');
    // Não força valor automático de GRU ou REC
    const basesAtivas = db.bases.filter((b) => b.ativa);
    setBasePrincipalId(basesAtivas.length === 1 ? basesAtivas[0].id : '');
    setClienteOuArea('');
    setCanac('');
    setMatricula('');
    setSetor('Manutenção de Linha');
    setFuncao('Mecânico de Manutenção');
    setCargoOperacional('Mecânico de Linha');
    setDataAdmissao('');
    setContatoCorporativo('');
    setObservacoes('');
    setPossuiRestricao(false);
    setMotivoRestricao('');
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
    setMatricula(p.matricula || p.canac || '');
    setSetor(p.setor || p.cliente_ou_area || 'Manutenção');
    setFuncao(p.funcao || '');
    setCargoOperacional(p.cargo_operacional || '');
    setDataAdmissao(p.data_admissao || '');
    setContatoCorporativo(p.contato_corporativo || '');
    setObservacoes(p.observacoes || '');
    setPossuiRestricao(Boolean(p.restricao_operacional?.possuiRestricao));
    setMotivoRestricao(p.restricao_operacional?.motivo || '');
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
        matricula: matricula.trim() || canac.trim() || id.trim(),
        setor: setor.trim() || 'Manutenção',
        funcao: funcao.trim(),
        cargo_operacional: cargoOperacional.trim(),
        data_admissao: dataAdmissao || undefined,
        contato_corporativo: contatoCorporativo.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        restricao_operacional: {
          possuiRestricao,
          motivo: possuiRestricao ? motivoRestricao.trim() : undefined,
          impedeExecucao: possuiRestricao,
          registradoPor: currentUser.nome,
          registradoEm: new Date().toISOString(),
        },
        criado_em: editingPessoa?.criado_em || new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        atualizado_por: currentUser.nome,
      };

      // Se houver alteração de base principal em relação ao registro anterior, registra explicitamente no histórico
      if (editingPessoa && editingPessoa.base_principal_id !== basePrincipalId) {
        await recordAudit(
          'EDITAR',
          'pessoa',
          id.trim(),
          `Alteração da base principal do colaborador ${nome.trim()} de "${editingPessoa.base_principal_id || 'SEM BASE'}" para "${basePrincipalId || 'SEM BASE'}"`,
          { base_anterior: editingPessoa.base_principal_id },
          { base_nova: basePrincipalId },
          currentUser.nome
        );
      }

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
            <option value="PENDENTES_REGULARIZACAO">⚠️ Bases Pendentes / Não Cadastradas</option>
            {db.bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.sigla || b.id} - {b.nome} {!b.ativa ? '(Inativa)' : ''}
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
                    <td className="py-2.5 px-2 font-mono text-xs">
                      {(() => {
                        const rawBase = (p.base_principal_id || '').trim();
                        if (!rawBase) {
                          return (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Base não informada — necessária regularização
                            </span>
                          );
                        }
                        const baseObj = basesMap.get(rawBase.toUpperCase());
                        if (!baseObj) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-red-950 font-mono">{rawBase}</span>
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 text-[10px] font-bold"
                                title={`O registro original preserva o valor "${rawBase}", que não consta na tabela oficial de bases operacionais.`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                Base não cadastrada — necessária regularização
                              </span>
                            </div>
                          );
                        }
                        if (!baseObj.ativa) {
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-700 font-mono">{baseObj.sigla || baseObj.id}</span>
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold"
                                title="A base operacional está inativa no sistema, preservando o histórico do colaborador."
                              >
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                Base inativa (Histórico preservado)
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1 font-bold text-slate-900">
                            <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-sky-950 font-mono">
                              {baseObj.sigla || baseObj.id}
                            </span>
                            <span className="text-[11px] font-normal text-slate-600 truncate max-w-[140px]" title={baseObj.nome}>
                              {baseObj.nome}
                            </span>
                          </div>
                        );
                      })()}
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
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingPessoa ? 'Editar Colaborador (Cadastro Mestre Rooster)' : 'Novo Colaborador (Cadastro Mestre Rooster)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Os dados salvos aqui são a fonte canônica oficial consumida em tempo real por todo o ecossistema QualyQuest.
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">ID Único (PK):</label>
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">CANAC (ANAC):</label>
                <input
                  type="text"
                  placeholder="Ex.: 105420"
                  value={canac}
                  onChange={(e) => setCanac(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Matrícula Funcional:</label>
                <input
                  type="text"
                  placeholder="Ex.: MAT-4420"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Base Principal Oficial:
                </label>
                <select
                  value={basePrincipalId}
                  onChange={(e) => setBasePrincipalId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900"
                >
                  <option value="">-- Selecione uma Base Operacional Ativa --</option>
                  {/* Preserva opção não cadastrada ou inativa se já estiver vinculada historicamente */}
                  {basePrincipalId &&
                    !db.bases.some((b) => b.ativa && b.id.toUpperCase() === basePrincipalId.toUpperCase()) && (
                      <option value={basePrincipalId} className="text-red-700 font-bold bg-red-50">
                        ⚠️ {basePrincipalId} (Base não cadastrada ou inativa - Histórico Preservado)
                      </option>
                    )}
                  {db.bases
                    .filter((b) => b.ativa)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.sigla || b.id} - {b.nome} {b.cidade ? `(${b.cidade}/${b.estado})` : ''}
                      </option>
                    ))}
                </select>
                {basePrincipalId &&
                  !db.bases.some((b) => b.ativa && b.id.toUpperCase() === basePrincipalId.toUpperCase()) && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 font-medium">
                      ⚠️ <strong>Base não cadastrada — necessária regularização.</strong>
                      <br />
                      O registro preserva o valor histórico &quot;{basePrincipalId}&quot;. Para regularizar, escolha uma base ativa cadastrada ou inclua a nova localidade em <em>Cadastros Mestres → Bases e Locais Operacionais</em>.
                    </div>
                  )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Situação / Vínculo:</label>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Setor / Lotação:</label>
                <input
                  type="text"
                  placeholder="Ex.: Hangar GRU / Linha"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Função:</label>
                <input
                  type="text"
                  placeholder="Ex.: Mecânico de Manutenção"
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Cargo Operacional:</label>
                <input
                  type="text"
                  placeholder="Ex.: Mecânico Pleno B737"
                  value={cargoOperacional}
                  onChange={(e) => setCargoOperacional(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Data de Admissão:</label>
                <input
                  type="date"
                  value={dataAdmissao}
                  onChange={(e) => setDataAdmissao(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contato Corporativo (E-mail / Tel):</label>
                <input
                  type="text"
                  placeholder="Ex.: nome@impacto.aero | (11) 98765-4321"
                  value={contatoCorporativo}
                  onChange={(e) => setContatoCorporativo(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Cliente / Área de Atuação:</label>
              <input
                type="text"
                placeholder="Ex.: EuroAtlantic, Atlas/Kalitta, Diretoria"
                value={clienteOuArea}
                onChange={(e) => setClienteOuArea(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            {/* Restrição Operacional */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={possuiRestricao}
                  onChange={(e) => setPossuiRestricao(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-900">Possui Restrição Operacional ou Médica</span>
              </label>

              {possuiRestricao && (
                <div>
                  <label className="text-[11px] font-semibold text-amber-900 block mb-1">Motivo / Descrição da Restrição:</label>
                  <input
                    type="text"
                    required={possuiRestricao}
                    placeholder="Ex.: Apto com restrição para trabalho em altura / Aguardando cheque"
                    value={motivoRestricao}
                    onChange={(e) => setMotivoRestricao(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-amber-300 rounded text-slate-800"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Observações Gerais / SGQ:</label>
              <textarea
                rows={2}
                placeholder="Histórico técnico, observações relevantes ou anotações SGQ..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
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
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar no Cadastro Mestre'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
