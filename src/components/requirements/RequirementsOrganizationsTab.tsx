import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Globe,
  Plane,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  Edit3,
  X,
  ExternalLink,
  Layers,
  Save
} from 'lucide-react';
import {
  ClienteExterno,
  TipoOrganizacaoExterna,
  StatusClienteExterno,
  ProgramaChecklistCliente,
  RequisitoClienteItem,
  UserProfile,
  BaseEstacaoOperacao
} from '../../types';
import { saveClienteExterno } from '../../services/firebase/clientRequirementsFirestore';

interface RequirementsOrganizationsTabProps {
  organizationId: string;
  clientes: ClienteExterno[];
  programas: ProgramaChecklistCliente[];
  requisitos: RequisitoClienteItem[];
  bases: BaseEstacaoOperacao[];
  currentUser?: UserProfile | null;
  onSelectCliente?: (clienteId: string) => void;
}

const TIPO_ORGANIZACAO_CONFIG: Record<
  TipoOrganizacaoExterna,
  { label: string; badgeClass: string; icon: string; desc: string }
> = {
  OPERADOR_AEREO: {
    label: 'Operador Aéreo (Comercial / Cargueiro)',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '✈️',
    desc: 'Companhia aérea regular, cargueira ou charter com requisitos de atendimento em linha e hangar.'
  },
  CLIENTE_CONTRATUAL: {
    label: 'Cliente Contratual / Corporativo',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: '🤝',
    desc: 'Operador executivo, proprietário de aeronave ou cliente com contrato de suporte técnico.'
  },
  AUTORIDADE_AERONAUTICA: {
    label: 'Autoridade de Aviação Civil (CAA)',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: '🏛️',
    desc: 'Órgão regulador governamental (ex: ANAC, FAA, EASA, AAC Cabo Verde, Transport Canada).'
  },
  ORGANISMO_AUDITOR: {
    label: 'Organismo Auditor / Setorial',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '📋',
    desc: 'Entidade de auditoria e padronização setorial (ex: IATA / IOSA, CASE, Qualiflyer).'
  },
  CERTIFICADORA: {
    label: 'Certificadora ISO / SGQ',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    icon: '🏅',
    desc: 'Organismo de certificação de normas de qualidade e gestão (ex: ISO 9001, AS9110).'
  },
  LESSOR: {
    label: 'Lessor / Empresa de Arrendamento',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: '🏦',
    desc: 'Empresa proprietária da aeronave com requisitos de preservação de valor e redelivery.'
  },
  OUTRO: {
    label: 'Outra Entidade',
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: '🏢',
    desc: 'Subcontratada, laboratório metrológico ou parceiro institucional.'
  }
};

export const RequirementsOrganizationsTab: React.FC<RequirementsOrganizationsTabProps> = ({
  organizationId,
  clientes,
  programas,
  requisitos,
  bases,
  currentUser,
  onSelectCliente
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClienteExterno> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Filtros
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      if (selectedTipo !== 'TODOS' && (c.tipoOrganizacao || 'OPERADOR_AEREO') !== selectedTipo) return false;
      if (selectedStatus !== 'TODOS' && c.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const match =
          c.nome.toLowerCase().includes(t) ||
          c.codigo.toLowerCase().includes(t) ||
          (c.sigla || '').toLowerCase().includes(t) ||
          (c.pais || '').toLowerCase().includes(t) ||
          (c.codigoIcaoIata || '').toLowerCase().includes(t);
        if (!match) return false;
      }
      return true;
    });
  }, [clientes, selectedTipo, selectedStatus, searchTerm]);

  // Métricas
  const metricas = useMemo(() => {
    const total = clientes.length;
    const operadores = clientes.filter((c) => !c.tipoOrganizacao || c.tipoOrganizacao === 'OPERADOR_AEREO').length;
    const autoridades = clientes.filter((c) => c.tipoOrganizacao === 'AUTORIDADE_AERONAUTICA').length;
    const auditoras = clientes.filter((c) => c.tipoOrganizacao === 'ORGANISMO_AUDITOR').length;
    const ativos = clientes.filter((c) => c.status === 'ATIVO').length;
    const emHomologacao = clientes.filter((c) => c.status === 'EM_HOMOLOGACAO').length;

    return { total, operadores, autoridades, auditoras, ativos, emHomologacao };
  }, [clientes]);

  const handleOpenNew = () => {
    setEditingClient({
      id: '',
      codigo: '',
      nome: '',
      sigla: '',
      tipoOrganizacao: 'OPERADOR_AEREO',
      status: 'ATIVO',
      pais: 'Brasil',
      codigoIcaoIata: '',
      idiomaPadrao: 'PT',
      basesRelacionadasIds: ['BASE-SOD', 'BASE-GRU'],
      observacoes: '',
      responsavelInterno: currentUser?.displayName || 'Garantia da Qualidade SGQ',
      contatoPrincipal: {
        nome: '',
        cargo: 'Gerente da Garantia da Qualidade',
        email: '',
        telefone: ''
      }
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: ClienteExterno) => {
    setEditingClient({ ...cliente });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.codigo || !editingClient.nome) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Código e Nome da Organização são obrigatórios.' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await saveClienteExterno(organizationId, editingClient, currentUser);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Organização "${editingClient.nome}" salva com sucesso no Firestore institucional.`
      });
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (err: any) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: err.message || 'Erro ao salvar organização no Firestore.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal de Gestão Multi-Cliente */}
      <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Gestão Multicliente e Organizações Auditoras
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fase 1.3
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-4xl">
                Cadastro corporativo unificado para operadores aéreos, clientes contratuais, autoridades de aviação civil,
                organismos de auditoria e certificadoras. Suporte dinâmico para novas organizações sem alteração de código.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenNew}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Organização / Cliente</span>
          </button>
        </div>

        {/* Indicadores de Entidades */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-4 pt-3 border-t border-slate-800">
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Total Cadastrado</span>
            <span className="text-base font-bold text-white">{metricas.total}</span>
            <span className="text-[9px] text-slate-500 block">Entidades ativas</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Operadores Aéreos</span>
            <span className="text-base font-bold text-blue-400">{metricas.operadores}</span>
            <span className="text-[9px] text-slate-500 block">Atlas, Kalitta, TACV...</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Autoridades (CAA)</span>
            <span className="text-base font-bold text-purple-400">{metricas.autoridades}</span>
            <span className="text-[9px] text-slate-500 block">ANAC, FAA, EASA...</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Organismos Auditores</span>
            <span className="text-base font-bold text-amber-400">{metricas.auditoras}</span>
            <span className="text-[9px] text-slate-500 block">IATA IOSA, CASE</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Status Ativo</span>
            <span className="text-base font-bold text-emerald-400">{metricas.ativos}</span>
            <span className="text-[9px] text-slate-500 block">Operação regular</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-medium">Em Homologação</span>
            <span className="text-base font-bold text-amber-300">{metricas.emHomologacao}</span>
            <span className="text-[9px] text-slate-500 block">SWISS, etc.</span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, sigla, código (ex: TACV, Kalitta), país ou ICAO/IATA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-0 focus:outline-hidden text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="OPERADOR_AEREO">Operador Aéreo</option>
            <option value="CLIENTE_CONTRATUAL">Cliente Contratual</option>
            <option value="AUTORIDADE_AERONAUTICA">Autoridade Aeronáutica (CAA)</option>
            <option value="ORGANISMO_AUDITOR">Organismo Auditor</option>
            <option value="CERTIFICADORA">Certificadora SGQ</option>
            <option value="LESSOR">Lessor</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Ativo</option>
            <option value="EM_HOMOLOGACAO">Em Homologação</option>
            <option value="INATIVO">Inativo</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards de Organizações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientesFiltrados.map((cliente) => {
          const tipo = cliente.tipoOrganizacao || 'OPERADOR_AEREO';
          const cfgTipo = TIPO_ORGANIZACAO_CONFIG[tipo] || TIPO_ORGANIZACAO_CONFIG.OUTRO;
          const totalRequisitos = requisitos.filter((r) => r.clienteId === cliente.id || r.clienteNome === cliente.nome).length;
          const programasCliente = programas.filter((p) => p.clienteId === cliente.id);

          return (
            <div
              key={cliente.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {cliente.codigo}
                    </span>
                    {cliente.codigoIcaoIata && (
                      <span className="text-[10px] font-mono text-slate-500 ml-1.5">
                        {cliente.codigoIcaoIata}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cliente.status === 'ATIVO'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : cliente.status === 'EM_HOMOLOGACAO'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cliente.status === 'ATIVO'
                      ? 'Ativo'
                      : cliente.status === 'EM_HOMOLOGACAO'
                      ? 'Em Homologação'
                      : 'Inativo'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{cliente.nome}</span>
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <Globe className="w-3 h-3" />
                    <span>{cliente.pais || 'Não informado'}</span>
                    {cliente.idiomaPadrao && <span>• Idioma: {cliente.idiomaPadrao}</span>}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfgTipo.badgeClass}`}
                  >
                    <span>{cfgTipo.icon}</span>
                    <span>{cfgTipo.label}</span>
                  </span>
                  {cliente.observacoes && (
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1.5 line-clamp-2">
                      {cliente.observacoes}
                    </p>
                  )}
                </div>

                {/* Métricas do Cliente */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-[10px] text-slate-500 block">Requisitos no Acervo:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {totalRequisitos || cliente.totalRequisitosCount || 0} itens
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-[10px] text-slate-500 block">Checklists / Programas:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {programasCliente.length || cliente.programasAtivosCount || 0} ativo(s)
                    </span>
                  </div>
                </div>

                {cliente.contatoPrincipal?.nome && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {cliente.contatoPrincipal.nome} — {cliente.contatoPrincipal.cargo}
                    </div>
                    {cliente.contatoPrincipal.email && (
                      <div className="flex items-center gap-1 truncate text-slate-500">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{cliente.contatoPrincipal.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Cadastrado: {cliente.createdAt ? cliente.createdAt.split('T')[0] : 'Inicial'}
                </span>
                <button
                  onClick={() => handleOpenEdit(cliente)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro / Edição de Organização */}
      {isModalOpen && editingClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>{editingClient.id ? 'Editar Organização / Cliente' : 'Nova Organização / Cliente'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cadastre companhias aéreas, órgãos reguladores, certificadoras ou clientes corporativos.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClient(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Código Interno / Sigla *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TACV, KALITTA, BCAA"
                    value={editingClient.codigo || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Código ICAO / IATA
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TCV/VR, GTI/5Y, SWR/LX"
                    value={editingClient.codigoIcaoIata || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, codigoIcaoIata: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome Completo da Organização *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cabo Verde Airlines (TACV), Federal Aviation Administration"
                  value={editingClient.nome || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, nome: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Organização
                  </label>
                  <select
                    value={editingClient.tipoOrganizacao || 'OPERADOR_AEREO'}
                    onChange={(e) => setEditingClient({ ...editingClient, tipoOrganizacao: e.target.value as TipoOrganizacaoExterna })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="OPERADOR_AEREO">Operador Aéreo</option>
                    <option value="CLIENTE_CONTRATUAL">Cliente Contratual</option>
                    <option value="AUTORIDADE_AERONAUTICA">Autoridade Aeronáutica</option>
                    <option value="ORGANISMO_AUDITOR">Organismo Auditor</option>
                    <option value="CERTIFICADORA">Certificadora SGQ</option>
                    <option value="LESSOR">Lessor</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    País de Origem
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cabo Verde, Brasil, EUA"
                    value={editingClient.pais || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, pais: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Status
                  </label>
                  <select
                    value={editingClient.status || 'ATIVO'}
                    onChange={(e) => setEditingClient({ ...editingClient, status: e.target.value as StatusClienteExterno })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="EM_HOMOLOGACAO">Em Homologação</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observações e Escopo de Atendimento
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva o escopo contratual, frota atendida ou diretrizes regulatórias..."
                  value={editingClient.observacoes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, observacoes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Contato Principal da Qualidade
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nome do Auditor / Responsável"
                    value={editingClient.contatoPrincipal?.nome || ''}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        contatoPrincipal: {
                          ...editingClient.contatoPrincipal!,
                          nome: e.target.value
                        }
                      })
                    }
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="email"
                    placeholder="Email institucional"
                    value={editingClient.contatoPrincipal?.email || ''}
                    onChange={(e) =>
                      setEditingClient({
                        ...editingClient,
                        contatoPrincipal: {
                          ...editingClient.contatoPrincipal!,
                          email: e.target.value
                        }
                      })
                    }
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingClient(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar no Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
