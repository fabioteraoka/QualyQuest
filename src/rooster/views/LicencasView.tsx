import React, { useMemo, useState } from 'react';
import { Award, Calendar, Check, Download, Edit2, Filter, Plus, Search, Trash2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { HabilitacaoLicenca, ItemStatus, Licenca, OrgaoLicenca, TipoLicenca } from '../types';
import {
  calcularDiasParaVencer,
  calcularStatusLicenca,
  formatarDataBr,
  parseDataBrParaIso,
} from '../utils/businessRules';

export const LicencasView: React.FC = () => {
  const { db, dataReferencia, currentUser, showToast, navigateToFicha } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroOrgao, setFiltroOrgao] = useState<string>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLicenca, setEditingLicenca] = useState<Licenca | null>(null);

  // Quick inline edit state for CHT date
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineDateValue, setInlineDateValue] = useState<string>('');

  // Form states
  const [pessoaId, setPessoaId] = useState('');
  const [orgao, setOrgao] = useState<OrgaoLicenca>('ANAC');
  const [tipo, setTipo] = useState<TipoLicenca>('CHT');
  const [habilitacao, setHabilitacao] = useState<HabilitacaoLicenca>('CEL');
  const [numero, setNumero] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [status, setStatus] = useState<'VALIDA' | 'VENCIDA' | 'SUSPENSA' | 'REVOGADA'>('VALIDA');
  const [escopo, setEscopo] = useState('');
  const [limitacoesOperacionais, setLimitacoesOperacionais] = useState('');
  const [bloqueiaOperacaoSeVencida, setBloqueiaOperacaoSeVencida] = useState(true);
  const [observacoes, setObservacoes] = useState('');

  const pessoasMap = useMemo(() => {
    const map = new Map<string, string>();
    db.pessoas.forEach((p) => map.set(p.id, p.nome));
    return map;
  }, [db.pessoas]);

  const licencasFiltradas = useMemo(() => {
    return db.licencas.filter((l) => {
      if (filtroOrgao !== 'TODOS' && l.orgao !== filtroOrgao) return false;
      if (filtroTipo !== 'TODOS' && l.tipo !== filtroTipo) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const pNome = (pessoasMap.get(l.pessoa_id) || '').toLowerCase();
        const matches =
          pNome.includes(q) ||
          l.numero.toLowerCase().includes(q) ||
          l.pessoa_id.toLowerCase().includes(q) ||
          l.habilitacao.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [db.licencas, filtroOrgao, filtroTipo, busca, pessoasMap]);

  const handleOpenNew = () => {
    setEditingLicenca(null);
    setPessoaId(db.pessoas[0]?.id || '');
    setOrgao('ANAC');
    setTipo('CHT');
    setHabilitacao('CEL');
    setNumero('');
    setDataVencimento('');
    setDataExpedicao('');
    setStatus('VALIDA');
    setEscopo('');
    setLimitacoesOperacionais('');
    setBloqueiaOperacaoSeVencida(true);
    setObservacoes('');
    setModalOpen(true);
  };

  const handleEdit = (lic: Licenca) => {
    setEditingLicenca(lic);
    setPessoaId(lic.pessoa_id);
    setOrgao(lic.orgao);
    setTipo(lic.tipo);
    setHabilitacao(lic.habilitacao);
    setNumero(lic.numero);
    setDataVencimento(lic.data_vencimento || '');
    setDataExpedicao(lic.data_expedicao || '');
    setStatus(lic.status || 'VALIDA');
    setEscopo(lic.escopo || '');
    setLimitacoesOperacionais(lic.limitacoes_operacionais || '');
    setBloqueiaOperacaoSeVencida(lic.bloqueia_operacao_se_vencida !== false);
    setObservacoes(lic.observacoes || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaId || !numero.trim()) {
      showToast('Preencha o colaborador e o número da licença.');
      return;
    }

    try {
      const licData: Licenca = {
        id: editingLicenca?.id || `LIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        pessoa_id: pessoaId,
        orgao,
        tipo,
        habilitacao: habilitacao as any,
        numero: numero.trim(),
        data_vencimento: tipo === 'CHT' ? dataVencimento || null : null,
        data_expedicao: tipo === 'AMP' ? dataExpedicao || null : null,
        status,
        escopo: escopo.trim() || undefined,
        limitacoes_operacionais: limitacoesOperacionais.trim() || undefined,
        bloqueia_operacao_se_vencida: bloqueiaOperacaoSeVencida,
        observacoes: observacoes.trim() || undefined,
        criado_em: editingLicenca?.criado_em || new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        atualizado_por: currentUser.nome,
      };

      await repository.saveLicenca(licData, currentUser.nome);
      setModalOpen(false);
      showToast(`Licença ${licData.numero} salva com sucesso no cadastro mestre do Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao salvar licença no Firestore: ${err?.message || err}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta licença?')) {
      try {
        await repository.deleteLicenca(id, currentUser.nome);
        showToast('Licença removida com sucesso do Firestore.');
      } catch (err: any) {
        showToast(`Erro ao excluir licença do Firestore: ${err?.message || err}`);
      }
    }
  };

  const handleSaveInlineDate = async (lic: Licenca) => {
    if (!inlineDateValue) {
      setInlineEditId(null);
      return;
    }
    try {
      const updated: Licenca = {
        ...lic,
        data_vencimento: inlineDateValue,
        atualizado_em: new Date().toISOString(),
        atualizado_por: currentUser.nome,
      };
      await repository.saveLicenca(updated, currentUser.nome);
      setInlineEditId(null);
      showToast(`Data da CHT alterada para ${formatarDataBr(inlineDateValue)} no Firestore!`);
    } catch (err: any) {
      showToast(`Erro ao atualizar data no Firestore: ${err?.message || err}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Gestão de Licenças e Habilitações (ANAC / FAA)</span>
            <span className="text-xs bg-sky-100 text-sky-900 font-semibold px-2 py-0.5 rounded">
              {licencasFiltradas.length} licenças
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre e altere vencimentos de CHT, números de CCT e FAA AMP com atualização imediata.
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
              placeholder="Buscar por mecânico, nº..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white w-48"
            />
          </div>

          {/* Filter Órgão */}
          <select
            value={filtroOrgao}
            onChange={(e) => setFiltroOrgao(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODOS">Todos os Órgãos</option>
            <option value="ANAC">ANAC</option>
            <option value="FAA">FAA</option>
          </select>

          {/* Filter Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-xs p-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="CHT">CHT (Com Vencimento)</option>
            <option value="CCT">CCT (Sem Vencimento)</option>
            <option value="AMP">FAA AMP</option>
          </select>

          {currentUser.perfil !== 'Leitor' && (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Licença</span>
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
                <th className="py-2.5 px-3">Mecânico</th>
                <th className="py-2.5 px-2">Órgão</th>
                <th className="py-2.5 px-2">Tipo</th>
                <th className="py-2.5 px-2">Habilitação</th>
                <th className="py-2.5 px-3">Nº Licença</th>
                <th className="py-2.5 px-3 text-center">Data Expedição</th>
                <th className="py-2.5 px-3 text-center">Data Vencimento (Edição Rápida)</th>
                <th className="py-2.5 px-2 text-center">Dias Restantes</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {licencasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 text-xs italic">
                    Nenhuma licença encontrada.
                  </td>
                </tr>
              ) : (
                licencasFiltradas.map((lic) => {
                  const status = calcularStatusLicenca(lic, dataReferencia, db.configuracao);
                  const dias = lic.data_vencimento
                    ? calcularDiasParaVencer(lic.data_vencimento, dataReferencia)
                    : null;
                  const isInlineEditing = inlineEditId === lic.id;

                  return (
                    <tr key={lic.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => navigateToFicha(lic.pessoa_id)}
                          className="hover:underline hover:text-sky-900 cursor-pointer text-left"
                        >
                          {pessoasMap.get(lic.pessoa_id) || lic.pessoa_id}
                        </button>
                      </td>
                      <td className="py-2 px-2 font-bold text-slate-800">{lic.orgao}</td>
                      <td className="py-2 px-2 font-semibold text-slate-700">{lic.tipo}</td>
                      <td className="py-2 px-2 font-mono font-bold text-slate-900">
                        {lic.habilitacao || '-'}
                      </td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-800">{lic.numero}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                        {formatarDataBr(lic.data_expedicao)}
                      </td>

                      {/* Vencimento with Inline Quick Edit */}
                      <td className="py-1.5 px-3 text-center font-mono">
                        {lic.tipo === 'CHT' ? (
                          isInlineEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="date"
                                autoFocus
                                value={inlineDateValue}
                                onChange={(e) => setInlineDateValue(e.target.value)}
                                className="text-xs font-mono p-1 bg-white border border-sky-600 rounded"
                              />
                              <button
                                onClick={() => handleSaveInlineDate(lic)}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                                title="Salvar nova data"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setInlineEditId(null)}
                                className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                if (currentUser.perfil !== 'Leitor') {
                                  setInlineEditId(lic.id);
                                  setInlineDateValue(lic.data_vencimento || '');
                                }
                              }}
                              className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer font-bold ${
                                currentUser.perfil !== 'Leitor' ? 'hover:bg-sky-100 hover:text-sky-900' : ''
                              }`}
                              title="Clique para editar a data de vencimento desta CHT"
                            >
                              <span>{formatarDataBr(lic.data_vencimento)}</span>
                              {currentUser.perfil !== 'Leitor' && (
                                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-sky-700" />
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">Sem vencimento</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold">
                        {dias !== null ? (
                          <span className={dias < 0 ? 'text-red-700 font-bold' : 'text-slate-700'}>
                            {dias}d
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={status} size="sm" />
                      </td>

                      <td className="py-2 px-3 text-right">
                        {currentUser.perfil !== 'Leitor' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEdit(lic)}
                              className="text-slate-500 hover:text-sky-700 p-1 cursor-pointer"
                              title="Editar tudo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(lic.id)}
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
                  {editingLicenca ? 'Editar Habilitação / Licença (Cadastro Mestre Rooster)' : 'Cadastrar Nova Habilitação / Licença (Cadastro Mestre Rooster)'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cadastro oficial de CHT, CCT, AMP e qualificações aeronáuticas com validação de status técnico.
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

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mecânico / Colaborador:</label>
              <select
                required
                value={pessoaId}
                onChange={(e) => setPessoaId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
              >
                {[...db.pessoas]
                  .sort((a, b) => a.nome.localeCompare(b.nome))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Autoridade / Órgão:</label>
                <select
                  value={orgao}
                  onChange={(e) => setOrgao(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="ANAC">ANAC (Brasil)</option>
                  <option value="FAA">FAA (EUA)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tipo de Habilitação:</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="CHT">CHT (Tem Vencimento)</option>
                  <option value="CCT">CCT (Sem Vencimento)</option>
                  <option value="AMP">FAA AMP</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Habilitação Técnica:</label>
                <select
                  value={habilitacao}
                  onChange={(e) => setHabilitacao(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                >
                  <option value="CEL">CEL (Célula)</option>
                  <option value="GMP">GMP (Grupo Motopropulsor)</option>
                  <option value="AVI">AVI (Aviônicos)</option>
                  <option value="">Vazio / Outra</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Número da Licença / Registro:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: 06403 ou 123456"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Situação / Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold"
                >
                  <option value="VALIDA">Válida / Regular</option>
                  <option value="VENCIDA">Vencida</option>
                  <option value="SUSPENSA">Suspensa</option>
                  <option value="REVOGADA">Revogada</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {tipo === 'CHT' ? 'Data de Vencimento:' : 'Data de Expedição:'}
                </label>
                <input
                  type="date"
                  required={tipo === 'CHT'}
                  value={tipo === 'CHT' ? dataVencimento : dataExpedicao}
                  onChange={(e) => {
                    if (tipo === 'CHT') setDataVencimento(e.target.value);
                    else setDataExpedicao(e.target.value);
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Escopo Técnico Oficial:</label>
              <input
                type="text"
                placeholder="Ex.: Manutenção de Célula e Sistemas Mecânicos B737 / A320"
                value={escopo}
                onChange={(e) => setEscopo(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Limitações Operacionais (se houver):</label>
              <input
                type="text"
                placeholder="Ex.: Não autorizado para inspeção boroscópica / Apenas com óculos"
                value={limitacoesOperacionais}
                onChange={(e) => setLimitacoesOperacionais(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bloqueiaOperacaoSeVencida}
                  onChange={(e) => setBloqueiaOperacaoSeVencida(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Bloquear Liberação Técnica / APRS se esta Habilitação Estiver Vencida
                </span>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Observações da Habilitação:</label>
              <textarea
                rows={2}
                placeholder="Evidência comprobatória, portaria ANAC ou detalhes SGQ..."
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
                className="px-4 py-1.5 bg-sky-900 text-white rounded text-xs font-semibold hover:bg-sky-800 cursor-pointer"
              >
                Salvar Habilitação Mestre
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
