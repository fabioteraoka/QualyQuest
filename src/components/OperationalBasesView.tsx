import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit,
  PowerOff,
  Power,
  Trash2,
  Users,
  Building,
  Shield,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { BaseEstacaoOperacao, ColaboradorPessoa, UserProfile } from '../types';
import {
  saveBaseOperacional,
  inactivateBaseOperacional,
  reactivateBaseOperacional,
  deleteBaseOperacional,
  verificarDependenciasBaseOperacional,
} from '../services/firebase/clientRequirementsFirestore';

interface OperationalBasesViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  bases: BaseEstacaoOperacao[];
  persons?: ColaboradorPessoa[];
  onBaseSaved?: () => void;
}

export const OperationalBasesView: React.FC<OperationalBasesViewProps> = ({
  organizationId,
  userProfile,
  bases = [],
  persons = [],
  onBaseSaved,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ATIVAS' | 'INATIVAS'>('TODAS');
  const [tipoFilter, setTipoFilter] = useState<'TODOS' | 'BASE_PRINCIPAL' | 'ESTACAO_LINHA' | 'SUBCONTRATADA'>('TODOS');

  // Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [baseEmEdicao, setBaseEmEdicao] = useState<BaseEstacaoOperacao | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal de Desativação
  const [baseParaDesativar, setBaseParaDesativar] = useState<BaseEstacaoOperacao | null>(null);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Modal de Detalhes / Vínculos
  const [baseDetalhes, setBaseDetalhes] = useState<BaseEstacaoOperacao | null>(null);

  const isReadOnly = useMemo(() => {
    const role = userProfile?.role;
    return role === 'CONSULTA' || role === 'VIEWER' || role === 'GUEST';
  }, [userProfile]);

  // Filtragem das bases
  const basesFiltradas = useMemo(() => {
    return bases.filter((b) => {
      const matchSearch =
        searchTerm === '' ||
        b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.responsavel && b.responsavel.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'TODAS' ||
        (statusFilter === 'ATIVAS' && b.ativo) ||
        (statusFilter === 'INATIVAS' && !b.ativo);

      const matchTipo = tipoFilter === 'TODOS' || b.tipo === tipoFilter;

      return matchSearch && matchStatus && matchTipo;
    });
  }, [bases, searchTerm, statusFilter, tipoFilter]);

  // Contadores
  const totalAtivas = useMemo(() => bases.filter((b) => b.ativo).length, [bases]);
  const totalInativas = useMemo(() => bases.filter((b) => !b.ativo).length, [bases]);

  const handleOpenNovo = () => {
    if (isReadOnly) return;
    setBaseEmEdicao(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditar = (base: BaseEstacaoOperacao) => {
    if (isReadOnly) return;
    setBaseEmEdicao(base);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isReadOnly) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    const codigo = String(formData.get('codigo') || '').trim().toUpperCase();
    const nome = String(formData.get('nome') || '').trim();
    const tipo = formData.get('tipo') as 'BASE_PRINCIPAL' | 'ESTACAO_LINHA' | 'SUBCONTRATADA';
    const cidade = String(formData.get('cidade') || '').trim();
    const estado = String(formData.get('estado') || '').trim().toUpperCase();
    const endereco = String(formData.get('endereco') || '').trim();
    const responsavel = String(formData.get('responsavel') || '').trim();
    const contatoTelefoneEmail = String(formData.get('contatoTelefoneEmail') || '').trim();
    const observacoes = String(formData.get('observacoes') || '').trim();
    const ativo = formData.get('ativo') === 'on';

    if (!codigo || !nome) {
      setModalError('Sigla/Código e Nome da Base Operacional são obrigatórios.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      const payload: Partial<BaseEstacaoOperacao> = {
        id: baseEmEdicao?.id,
        codigo,
        nome,
        tipo,
        cidade,
        estado,
        endereco,
        responsavel,
        contatoTelefoneEmail,
        observacoes,
        ativo,
      };

      await saveBaseOperacional(organizationId, payload, userProfile, bases);
      setIsModalOpen(false);
      setBaseEmEdicao(null);
      if (onBaseSaved) onBaseSaved();
    } catch (err: any) {
      setModalError(err?.message || 'Falha ao salvar base operacional.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmarDesativacao = async () => {
    if (!baseParaDesativar || isReadOnly) return;

    if (!motivoDesativacao.trim()) {
      alert('Por favor, informe a justificativa da desativação para o log de auditoria SGQ.');
      return;
    }

    setIsDeactivating(true);
    try {
      await inactivateBaseOperacional(
        organizationId,
        baseParaDesativar.id,
        userProfile,
        motivoDesativacao
      );
      setBaseParaDesativar(null);
      setMotivoDesativacao('');
      if (onBaseSaved) onBaseSaved();
    } catch (err: any) {
      alert(`Erro ao desativar base operacional: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReativar = async (base: BaseEstacaoOperacao) => {
    if (isReadOnly) return;
    const confirm = window.confirm(`Deseja reativar a base operacional "${base.codigo} - ${base.nome}"?`);
    if (!confirm) return;

    try {
      await reactivateBaseOperacional(organizationId, base.id, userProfile);
      if (onBaseSaved) onBaseSaved();
    } catch (err: any) {
      alert(`Erro ao reativar base operacional: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteFisico = async (base: BaseEstacaoOperacao) => {
    if (isReadOnly) return;
    const dep = verificarDependenciasBaseOperacional(base, persons);
    if (dep.temDependencias) {
      alert(
        `Exclusão física bloqueada pelo SGQ:\n\nExistem ${dep.totalColaboradores} colaboradores vinculados a esta base (${dep.nomesColaboradores.join(', ')}).\n\nPara preservar a rastreabilidade e histórico dos treinamentos e competências, utilize a opção "Desativar Base".`
      );
      return;
    }

    const confirm = window.confirm(
      `ATENÇÃO: Deseja realmente excluir em definitivo a base "${base.codigo} - ${base.nome}"?\n\nEsta operação não possui vínculos ativos e será removida do Firestore.`
    );
    if (!confirm) return;

    try {
      await deleteBaseOperacional(organizationId, base, persons, userProfile);
      if (onBaseSaved) onBaseSaved();
    } catch (err: any) {
      alert(`Erro ao excluir base operacional: ${err?.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header com métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
              SGQ Operacional — Infraestrutura & Estações
            </span>
            <span className="text-xs text-slate-500 font-mono">RBAC 145.103</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Bases & Estações Operacionais
          </h1>
          <p className="text-sm text-slate-600">
            Cadastro, edição e governança de bases principais e estações de linha de atendimento da IMPACTO.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ativas: <strong>{totalAtivas}</strong></span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Inativas: <strong>{totalInativas}</strong></span>
          </div>

          {!isReadOnly && (
            <button
              onClick={handleOpenNovo}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Base Operacional</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (ex: SOD, GRU), nome, cidade ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter('TODAS')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === 'TODAS' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({bases.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ATIVAS')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === 'ATIVAS' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativas ({totalAtivas})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INATIVAS')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                statusFilter === 'INATIVAS' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inativas ({totalInativas})
            </button>
          </div>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as any)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="BASE_PRINCIPAL">Base Principal (Hangar / MRO)</option>
            <option value="ESTACAO_LINHA">Estação de Linha</option>
            <option value="SUBCONTRATADA">Subcontratada / Apoio</option>
          </select>
        </div>
      </div>

      {/* Grade de Bases Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {basesFiltradas.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-slate-700">Nenhuma base operacional encontrada.</p>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de busca ou cadastre uma nova base operacional.</p>
          </div>
        ) : (
          basesFiltradas.map((base) => {
            const dep = verificarDependenciasBaseOperacional(base, persons);
            const isAtiva = base.ativo;

            return (
              <div
                key={base.id}
                className={`bg-white border rounded-xl p-5 shadow-xs transition flex flex-col justify-between ${
                  !isAtiva ? 'border-slate-200 bg-slate-50/70 opacity-80' : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg font-bold">
                        {base.codigo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          base.tipo === 'BASE_PRINCIPAL'
                            ? 'bg-purple-100 text-purple-800'
                            : base.tipo === 'ESTACAO_LINHA'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {base.tipo === 'BASE_PRINCIPAL'
                          ? 'Base Principal'
                          : base.tipo === 'ESTACAO_LINHA'
                          ? 'Estação Linha'
                          : 'Subcontratada'}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        isAtiva ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAtiva ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                      {isAtiva ? 'ATIVA' : 'INATIVA'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{base.nome}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{base.cidade}{base.estado ? ` - ${base.estado}` : ''}{base.pais ? ` (${base.pais})` : ''}</span>
                    </p>
                  </div>

                  {base.endereco && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                      {base.endereco}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    {base.responsavel && (
                      <p>
                        <strong className="text-slate-700">Responsável:</strong> {base.responsavel}
                      </p>
                    )}
                    {base.contatoTelefoneEmail && (
                      <p>
                        <strong className="text-slate-700">Contato:</strong> {base.contatoTelefoneEmail}
                      </p>
                    )}
                    {base.observacoes && (
                      <p className="text-slate-500 italic text-[11px]">
                        "{base.observacoes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setBaseDetalhes(base)}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{dep.totalColaboradores} mecânico(s)</span>
                  </button>

                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditar(base)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar base operacional"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {isAtiva ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBaseParaDesativar(base);
                            setMotivoDesativacao('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Desativar base operacional (mantém histórico)"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReativar(base)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Reativar base operacional"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!dep.temDependencias && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFisico(base)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir base sem dependências"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CADASTRO / EDIÇÃO DE BASE OPERACIONAL                               */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  {baseEmEdicao ? `Editar Base: ${baseEmEdicao.codigo}` : 'Cadastrar Nova Base Operacional'}
                </h3>
                <p className="text-xs text-slate-500">
                  {baseEmEdicao
                    ? 'Atualize os dados da base sem duplicar o cadastro nem romper vínculos históricos.'
                    : 'Registre a estação ou hangar para alocação de mecânicos e frotas.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Código / Sigla IATA-ICAO *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    maxLength={10}
                    defaultValue={baseEmEdicao?.codigo || ''}
                    placeholder="Ex: SOD, GRU, VCP"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Identificador único operacional</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Estação *</label>
                  <select
                    name="tipo"
                    required
                    defaultValue={baseEmEdicao?.tipo || 'ESTACAO_LINHA'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="ESTACAO_LINHA">Estação de Linha (Transit / Diário)</option>
                    <option value="BASE_PRINCIPAL">Base Principal (Hangar / MRO)</option>
                    <option value="SUBCONTRATADA">Subcontratada / Parceira</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nome da Base Operacional *</label>
                <input
                  type="text"
                  name="nome"
                  required
                  defaultValue={baseEmEdicao?.nome || ''}
                  placeholder="Ex: Base Sorocaba (SOD) - Hangar Principal"
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    defaultValue={baseEmEdicao?.cidade || ''}
                    placeholder="Ex: Sorocaba"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    name="estado"
                    maxLength={2}
                    defaultValue={baseEmEdicao?.estado || 'SP'}
                    placeholder="Ex: SP"
                    className="w-full p-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Endereço / Localização / Hangar</label>
                <input
                  type="text"
                  name="endereco"
                  defaultValue={baseEmEdicao?.endereco || ''}
                  placeholder="Ex: Aeroporto Estadual de Sorocaba, Hangar 4 - Lote 12"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Responsável Local</label>
                  <input
                    type="text"
                    name="responsavel"
                    defaultValue={baseEmEdicao?.responsavel || ''}
                    placeholder="Ex: Eng. Carlos Alberto"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contato (Telefone / E-mail)</label>
                  <input
                    type="text"
                    name="contatoTelefoneEmail"
                    defaultValue={baseEmEdicao?.contatoTelefoneEmail || ''}
                    placeholder="Ex: (15) 3232-0000 / sod@impacto.aero"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observações Técnicas / SGQ</label>
                <textarea
                  name="observacoes"
                  rows={2}
                  defaultValue={baseEmEdicao?.observacoes || ''}
                  placeholder="Ex: Hangar homologado para Checks C e manutenção de linha A320/B737."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ativo"
                  name="ativo"
                  defaultChecked={baseEmEdicao?.ativo ?? true}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="ativo" className="font-semibold text-slate-700 cursor-pointer">
                  Base Operacional Ativa (disponível para novas alocações de colaboradores)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {isSaving ? 'Gravando...' : 'Salvar Base Operacional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DESATIVAÇÃO DE BASE OPERACIONAL (COM AUDITORIA)                     */}
      {/* ========================================================================= */}
      {baseParaDesativar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-amber-700">
                <PowerOff className="w-5 h-5 text-amber-600" />
                Desativar Base: {baseParaDesativar.codigo}
              </h3>
              <button
                onClick={() => setBaseParaDesativar(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Preservação de Histórico SGQ:
              </p>
              <p>
                A base será marcada como <strong>INATIVA</strong>. Ela não será sugerida para novas admissões, mas permanecerá no banco de dados para consultas históricas de treinamentos e competências já realizadas.
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 text-xs block mb-1">
                Motivo / Justificativa da Desativação *
              </label>
              <textarea
                rows={3}
                value={motivoDesativacao}
                onChange={(e) => setMotivoDesativacao(e.target.value)}
                placeholder="Ex: Encerramento do contrato de atendimento na estação; equipe remanejada para GRU."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
              />
              <span className="text-[10px] text-slate-400">
                Esta justificativa será registrada no log de auditoria permanente da organização.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setBaseParaDesativar(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeactivating || !motivoDesativacao.trim()}
                onClick={handleConfirmarDesativacao}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm"
              >
                {isDeactivating ? 'Desativando...' : 'Confirmar Desativação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DE COLABORADORES VINCULADOS                                */}
      {/* ========================================================================= */}
      {baseDetalhes && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Mecânicos Alocados: {baseDetalhes.codigo} — {baseDetalhes.nome}
                </h3>
                <p className="text-xs text-slate-500">
                  Colaboradores vinculados a esta estação operacional.
                </p>
              </div>
              <button
                onClick={() => setBaseDetalhes(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {persons.filter((p) => {
                if (p.baseOperacionalId && p.baseOperacionalId === baseDetalhes.id) return true;
                if (p.baseOperacional) {
                  const bOp = p.baseOperacional.toLowerCase();
                  if (baseDetalhes.codigo && bOp.includes(baseDetalhes.codigo.toLowerCase())) return true;
                  if (baseDetalhes.nome && bOp.includes(baseDetalhes.nome.toLowerCase())) return true;
                }
                return false;
              }).length === 0 ? (
                <div className="p-4 text-center text-slate-500 italic">
                  Nenhum colaborador registrado nesta base no momento.
                </div>
              ) : (
                persons
                  .filter((p) => {
                    if (p.baseOperacionalId && p.baseOperacionalId === baseDetalhes.id) return true;
                    if (p.baseOperacional) {
                      const bOp = p.baseOperacional.toLowerCase();
                      if (baseDetalhes.codigo && bOp.includes(baseDetalhes.codigo.toLowerCase())) return true;
                      if (baseDetalhes.nome && bOp.includes(baseDetalhes.nome.toLowerCase())) return true;
                    }
                    return false;
                  })
                  .map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{p.nome}</div>
                        <div className="text-[11px] text-slate-500">{p.matricula} • {p.funcao}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {p.status}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setBaseDetalhes(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
