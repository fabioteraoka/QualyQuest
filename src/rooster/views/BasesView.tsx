import React, { useMemo, useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
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
  Plane,
  History,
  Layers,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { repository } from '../services/storage';
import { Base, TipoBaseOperacional } from '../types';
import { formatarDataBr } from '../utils/businessRules';

const TIPOS_BASE_CONFIG: Record<
  TipoBaseOperacional,
  { label: string; desc: string; badgeColor: string; icon: React.ElementType }
> = {
  BASE_PRINCIPAL: {
    label: 'Base Principal (Hub)',
    desc: 'Instalação permanente principal com estrutura técnica completa e almoxarifado.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: Building,
  },
  SUB_BASE: {
    label: 'Sub-Base Operacional',
    desc: 'Unidade permanente com equipe técnica e facilidades locais.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: MapPin,
  },
  ESTACAO_LINHA: {
    label: 'Estação de Linha',
    desc: 'Ponto de atendimento técnico de trânsito em aeroporto (Line Maintenance).',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    icon: Plane,
  },
  LOCAL_ATENDIMENTO: {
    label: 'Local de Atendimento / Site',
    desc: 'Local sob demanda, heliponto, instalação de cliente ou base temporária.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: MapPin,
  },
  HANGAR: {
    label: 'Hangar de Manutenção Pesada',
    desc: 'Instalação dedicada a grandes revisões (Heavy Maintenance / Base Maintenance).',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Building,
  },
};

export const BasesView: React.FC = () => {
  const { db, currentUser, showToast, navigateToFicha } = useApp();

  // Filtros e busca
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODAS' | 'ATIVAS' | 'INATIVAS'>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroUf, setFiltroUf] = useState<string>('TODAS');

  // Modais de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBase, setEditingBase] = useState<Base | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formId, setFormId] = useState('');
  const [formSigla, setFormSigla] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState<TipoBaseOperacional>('ESTACAO_LINHA');
  const [formCidade, setFormCidade] = useState('');
  const [formEstado, setFormEstado] = useState('');
  const [formPais, setFormPais] = useState('Brasil');
  const [formEndereco, setFormEndereco] = useState('');
  const [formIata, setFormIata] = useState('');
  const [formIcao, setFormIcao] = useState('');
  const [formAtiva, setFormAtiva] = useState(true);
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');
  const [formContato, setFormContato] = useState('');

  // Modal de Inativação com confirmação de vínculos
  const [baseParaInativar, setBaseParaInativar] = useState<Base | null>(null);
  const [motivoInativacao, setMotivoInativacao] = useState('');
  const [isInactivating, setIsInactivating] = useState(false);

  // Modal de Detalhes / Colaboradores Vinculados
  const [baseDetalhes, setBaseDetalhes] = useState<Base | null>(null);

  // Modal de Histórico / Auditoria
  const [baseAuditoria, setBaseAuditoria] = useState<Base | null>(null);

  // Permissões
  const isReadOnly = useMemo(() => {
    return currentUser?.perfil === 'CONSULTA';
  }, [currentUser]);

  // Lista única de UFs para filtro
  const ufsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    db.bases.forEach((b) => {
      if (b.estado) set.add(b.estado.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [db.bases]);

  // Mapeamento de contagem de colaboradores por base
  const colaboradoresPorBaseMap = useMemo(() => {
    const map: Record<string, { total: number; ativos: number; mecanicos: number; administrativos: number }> = {};
    db.pessoas.forEach((p) => {
      const bId = (p.base_principal_id || '').trim().toUpperCase();
      if (!map[bId]) {
        map[bId] = { total: 0, ativos: 0, mecanicos: 0, administrativos: 0 };
      }
      map[bId].total += 1;
      if (p.situacao === 'Ativo') map[bId].ativos += 1;
      if (p.categoria === 'Mecânico') map[bId].mecanicos += 1;
      else map[bId].administrativos += 1;
    });
    return map;
  }, [db.pessoas]);

  // Designações por base
  const designacoesPorBaseMap = useMemo(() => {
    const map: Record<string, number> = {};
    db.designacoesBase.forEach((dbItem) => {
      const bId = (dbItem.base_id || '').trim().toUpperCase();
      map[bId] = (map[bId] || 0) + 1;
    });
    return map;
  }, [db.designacoesBase]);

  // Colaboradores que apontam para bases não cadastradas ou inativas
  const pendenciasRegularizacao = useMemo(() => {
    const basesIds = new Set(db.bases.map((b) => b.id.toUpperCase()));
    const basesInativas = new Set(db.bases.filter((b) => !b.ativa).map((b) => b.id.toUpperCase()));

    const naoCadastradas: { pessoaId: string; pessoaNome: string; baseInformada: string }[] = [];
    const vinculadasInativas: { pessoaId: string; pessoaNome: string; baseInformada: string }[] = [];

    db.pessoas.forEach((p) => {
      const bId = (p.base_principal_id || '').trim().toUpperCase();
      if (!bId) {
        naoCadastradas.push({ pessoaId: p.id, pessoaNome: p.nome, baseInformada: '(Sem base informada)' });
      } else if (!basesIds.has(bId)) {
        naoCadastradas.push({ pessoaId: p.id, pessoaNome: p.nome, baseInformada: bId });
      } else if (basesInativas.has(bId)) {
        vinculadasInativas.push({ pessoaId: p.id, pessoaNome: p.nome, baseInformada: bId });
      }
    });

    return { naoCadastradas, vinculadasInativas };
  }, [db.bases, db.pessoas]);

  // Bases filtradas
  const basesFiltradas = useMemo(() => {
    return db.bases.filter((b) => {
      if (filtroStatus === 'ATIVAS' && !b.ativa) return false;
      if (filtroStatus === 'INATIVAS' && b.ativa) return false;
      if (filtroTipo !== 'TODOS' && b.tipo !== filtroTipo) return false;
      if (filtroUf !== 'TODAS' && (b.estado || '').toUpperCase().trim() !== filtroUf) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matches =
          (b.nome && b.nome.toLowerCase().includes(q)) ||
          (b.sigla && b.sigla.toLowerCase().includes(q)) ||
          (b.id && b.id.toLowerCase().includes(q)) ||
          (b.cidade && b.cidade.toLowerCase().includes(q)) ||
          (b.estado && b.estado.toLowerCase().includes(q)) ||
          (b.codigo_iata && b.codigo_iata.toLowerCase().includes(q)) ||
          (b.codigo_icao && b.codigo_icao.toLowerCase().includes(q)) ||
          (b.responsavel && b.responsavel.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [db.bases, filtroStatus, filtroTipo, filtroUf, busca]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = db.bases.length;
    const ativas = db.bases.filter((b) => b.ativa).length;
    const inativas = total - ativas;
    const hubs = db.bases.filter((b) => b.tipo === 'BASE_PRINCIPAL').length;
    const estacoes = db.bases.filter((b) => b.tipo === 'ESTACAO_LINHA').length;
    const locais = db.bases.filter((b) => b.tipo === 'LOCAL_ATENDIMENTO').length;
    const hangares = db.bases.filter((b) => b.tipo === 'HANGAR').length;
    return { total, ativas, inativas, hubs, estacoes, locais, hangares };
  }, [db.bases]);

  // Abrir modal de criação
  const handleOpenNew = () => {
    setEditingBase(null);
    setFormId('');
    setFormSigla('');
    setFormNome('');
    setFormTipo('ESTACAO_LINHA');
    setFormCidade('');
    setFormEstado('');
    setFormPais('Brasil');
    setFormEndereco('');
    setFormIata('');
    setFormIcao('');
    setFormAtiva(true);
    setFormObservacoes('');
    setFormResponsavel('');
    setFormContato('');
    setModalOpen(true);
  };

  // Abrir modal de edição
  const handleEdit = (base: Base) => {
    setEditingBase(base);
    setFormId(base.id);
    setFormSigla(base.sigla || base.id);
    setFormNome(base.nome);
    setFormTipo(base.tipo || 'ESTACAO_LINHA');
    setFormCidade(base.cidade || '');
    setFormEstado(base.estado || '');
    setFormPais(base.pais || 'Brasil');
    setFormEndereco(base.endereco || '');
    setFormIata(base.codigo_iata || '');
    setFormIcao(base.codigo_icao || '');
    setFormAtiva(base.ativa);
    setFormObservacoes(base.observacoes || '');
    setFormResponsavel(base.responsavel || '');
    setFormContato(base.contato || '');
    setModalOpen(true);
  };

  // Salvar base (Criar ou Atualizar)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const siglaLimpa = formSigla.trim().toUpperCase();
    const nomeLimpo = formNome.trim();

    if (!siglaLimpa) {
      showToast('⚠️ A Sigla / Código da base é obrigatório (ex: SDU, MAO, BSB).');
      return;
    }
    if (!nomeLimpo) {
      showToast('⚠️ O Nome oficial da base operacional é obrigatório.');
      return;
    }

    // Validação de sigla duplicada ao criar nova base
    if (!editingBase) {
      const duplicada = db.bases.find(
        (b) => (b.sigla || b.id).trim().toUpperCase() === siglaLimpa
      );
      if (duplicada) {
        showToast(`⚠️ Conflito: Já existe uma base cadastrada com a sigla "${siglaLimpa}" (${duplicada.nome}).`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // O ID estável deve ser preservado se editando. Se novo, usa a própria sigla ou ID específico.
      const targetId = editingBase ? editingBase.id : siglaLimpa;

      const baseToSave: Base = {
        id: targetId,
        sigla: siglaLimpa,
        nome: nomeLimpo,
        tipo: formTipo,
        cidade: formCidade.trim(),
        estado: formEstado.trim().toUpperCase(),
        pais: formPais.trim() || 'Brasil',
        endereco: formEndereco.trim(),
        codigo_iata: formIata.trim().toUpperCase() || undefined,
        codigo_icao: formIcao.trim().toUpperCase() || undefined,
        ativa: formAtiva,
        observacoes: formObservacoes.trim(),
        responsavel: formResponsavel.trim(),
        contato: formContato.trim(),
        criado_em: editingBase ? editingBase.criado_em : new Date().toISOString(),
      };

      await repository.saveBase(baseToSave, currentUser?.nome || 'Admin');
      showToast(`Base operacional ${baseToSave.sigla} salva com sucesso no Firestore!`);
      setModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar base:', err);
      showToast(`Erro ao salvar base: ${err?.message || 'Falha na persistência'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Iniciar inativação
  const handleIniciarInativacao = (base: Base) => {
    setBaseParaInativar(base);
    setMotivoInativacao('');
  };

  // Confirmar inativação lógica
  const handleConfirmarInativacao = async () => {
    if (!baseParaInativar || isInactivating) return;
    setIsInactivating(true);
    try {
      await repository.inativarBase(
        baseParaInativar.id,
        motivoInativacao.trim() || 'Inativação operacional',
        currentUser?.nome || 'Admin'
      );
      showToast(`Base ${baseParaInativar.sigla || baseParaInativar.id} inativada com sucesso. Histórico 100% preservado.`);
      setBaseParaInativar(null);
    } catch (err: any) {
      console.error('Erro ao inativar base:', err);
      showToast(`Erro ao inativar base: ${err?.message || 'Falha na operação'}`);
    } finally {
      setIsInactivating(false);
    }
  };

  // Reativar base
  const handleReativar = async (base: Base) => {
    try {
      await repository.reativarBase(base.id, currentUser?.nome || 'Admin');
      showToast(`Base ${base.sigla || base.id} reativada com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao reativar base:', err);
      showToast(`Erro ao reativar: ${err?.message || 'Falha na operação'}`);
    }
  };

  // Excluir base (somente se não tiver histórico/vínculos)
  const handleDelete = async (base: Base) => {
    const countVínculos = (colaboradoresPorBaseMap[base.id.toUpperCase()]?.total || 0) +
      (designacoesPorBaseMap[base.id.toUpperCase()] || 0);

    if (countVínculos > 0) {
      alert(
        `Atenção: Não é permitido excluir a base "${base.sigla || base.id}" pois existem ${countVínculos} colaboradores ou designações vinculadas.\n\nPara descontinuar a operação no local com preservação histórica, utilize a opção "Inativar Base".`
      );
      return;
    }

    if (!confirm(`Confirmar a exclusão permanente da base "${base.sigla || base.id} - ${base.nome}"? Esta ação é irreversível.`)) {
      return;
    }

    try {
      await repository.deleteBase(base.id, currentUser?.nome || 'Admin');
      showToast(`Base ${base.sigla || base.id} excluída com sucesso.`);
    } catch (err: any) {
      console.error('Erro ao excluir base:', err);
      showToast(`Erro ao excluir: ${err?.message || 'Falha'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header oficial de Cadastros Mestres */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
              <span>Cadastros Mestres</span>
              <span>•</span>
              <span>Rooster MRO &amp; QualyQuest</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Building className="w-6 h-6 text-sky-700" />
              Bases e Locais Operacionais
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Gerenciamento oficial centralizado de bases operacionais permanentes, estações de linha (line maintenance),
              hangares e locais de atendimento com sincronização em tempo real para todo o sistema.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isReadOnly && (
              <button
                onClick={handleOpenNew}
                className="flex items-center gap-2 px-4 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Base / Local
              </button>
            )}
          </div>
        </div>

        {/* Alerta de regularizações pendentes se houver colaboradores com bases não cadastradas ou inativas */}
        {(pendenciasRegularizacao.naoCadastradas.length > 0 || pendenciasRegularizacao.vinculadasInativas.length > 0) && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <span className="font-bold block">
                Atenção de Integridade Cadastral — Regularizações Pendentes Encontradas:
              </span>
              {pendenciasRegularizacao.naoCadastradas.length > 0 && (
                <p>
                  • <strong>{pendenciasRegularizacao.naoCadastradas.length} colaboradores</strong> possuem bases não cadastradas ou em branco (ex:{' '}
                  {pendenciasRegularizacao.naoCadastradas.slice(0, 3).map((p) => `${p.pessoaNome} [${p.baseInformada}]`).join(', ')}
                  {pendenciasRegularizacao.naoCadastradas.length > 3 ? '...' : ''}). Seus valores originais estão 100% preservados e aguardam regularização no cadastro de Pessoas.
                </p>
              )}
              {pendenciasRegularizacao.vinculadasInativas.length > 0 && (
                <p>
                  • <strong>{pendenciasRegularizacao.vinculadasInativas.length} colaboradores</strong> continuam vinculados historicamente a bases que foram inativadas. Nenhuma alteração silenciosa é feita sem decisão humana.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cards de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Cadastradas</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{stats.total}</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Bases Ativas</span>
            <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{stats.ativas}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Bases Principais</span>
            <span className="text-xl font-bold text-slate-800 mt-0.5 block">{stats.hubs}</span>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase block">Estações de Linha</span>
            <span className="text-xl font-bold text-indigo-900 mt-0.5 block">{stats.estacoes}</span>
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-700 uppercase block">Locais Atendimento</span>
            <span className="text-xl font-bold text-amber-900 mt-0.5 block">{stats.locais}</span>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <span className="text-[11px] font-semibold text-purple-700 uppercase block">Hangares</span>
            <span className="text-xl font-bold text-purple-900 mt-0.5 block">{stats.hangares}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca por texto */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, sigla (ex: REC, SDU, BSB), cidade ou IATA/ICAO..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-600 focus:border-sky-600 transition-colors"
            />
          </div>

          {/* Filtro de Status */}
          <div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-600 text-slate-700 font-medium"
            >
              <option value="TODAS">Todos os Status (Ativas e Inativas)</option>
              <option value="ATIVAS">Apenas Bases Ativas</option>
              <option value="INATIVAS">Apenas Bases Inativas</option>
            </select>
          </div>

          {/* Filtro de Tipo */}
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-600 text-slate-700 font-medium"
            >
              <option value="TODOS">Todos os Tipos de Base / Local</option>
              <option value="BASE_PRINCIPAL">Base Principal (Hub)</option>
              <option value="SUB_BASE">Sub-Base Operacional</option>
              <option value="ESTACAO_LINHA">Estação de Linha (Line Maint.)</option>
              <option value="LOCAL_ATENDIMENTO">Local de Atendimento / Site</option>
              <option value="HANGAR">Hangar de Manutenção Pesada</option>
            </select>
          </div>
        </div>

        {/* Filtro rápido por Estado (UF) */}
        {ufsDisponiveis.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1">Filtrar por UF:</span>
            <button
              onClick={() => setFiltroUf('TODAS')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filtroUf === 'TODAS'
                  ? 'bg-sky-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {ufsDisponiveis.map((uf) => (
              <button
                key={uf}
                onClick={() => setFiltroUf(uf)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  filtroUf === uf
                    ? 'bg-sky-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {uf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabela de Bases e Locais Operacionais */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Lista de Bases &amp; Locais ({basesFiltradas.length} registros)
          </span>
          <span className="text-[11px] text-slate-500">
            Coleção canônica: <code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded">organizations/{'{orgId}'}/operational_bases</code>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Sigla / ID</th>
                <th className="py-3 px-4">Nome da Base / Estação</th>
                <th className="py-3 px-4">Tipo Operacional</th>
                <th className="py-3 px-4">Localização</th>
                <th className="py-3 px-4">IATA / ICAO</th>
                <th className="py-3 px-4 text-center">Colaboradores</th>
                <th className="py-3 px-4 text-center">Designações</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {basesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Building className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Nenhuma base encontrada para os filtros selecionados.</p>
                    <p className="text-[11px] mt-0.5 text-slate-400">
                      Cadastre uma nova base ou ajuste o termo de busca.
                    </p>
                  </td>
                </tr>
              ) : (
                basesFiltradas.map((base) => {
                  const tipoConf = TIPOS_BASE_CONFIG[base.tipo] || TIPOS_BASE_CONFIG.ESTACAO_LINHA;
                  const Icon = tipoConf.icon;
                  const colabStats = colaboradoresPorBaseMap[base.id.toUpperCase()] || { total: 0, ativos: 0 };
                  const designacoesCount = designacoesPorBaseMap[base.id.toUpperCase()] || 0;

                  return (
                    <tr
                      key={base.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !base.ativa ? 'bg-slate-50/50 opacity-80' : ''
                      }`}
                    >
                      {/* Sigla / ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-sky-950 font-bold border border-slate-200">
                            {base.sigla || base.id}
                          </span>
                        </div>
                      </td>

                      {/* Nome */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{base.nome}</div>
                        {base.responsavel && (
                          <div className="text-[11px] text-slate-400 mt-0.5">Resp.: {base.responsavel}</div>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tipoConf.badgeColor}`}
                          title={tipoConf.desc}
                        >
                          <Icon className="w-3 h-3" />
                          {tipoConf.label}
                        </span>
                      </td>

                      {/* Localização */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {base.cidade ? `${base.cidade}` : 'Cidade não informada'}
                            {base.estado ? ` - ${base.estado}` : ''}
                          </span>
                        </div>
                        {base.endereco && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={base.endereco}>
                            {base.endereco}
                          </div>
                        )}
                      </td>

                      {/* IATA / ICAO */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {base.codigo_iata || base.codigo_icao ? (
                          <div className="space-x-1">
                            {base.codigo_iata && (
                              <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold" title="Código IATA">
                                {base.codigo_iata}
                              </span>
                            )}
                            {base.codigo_icao && (
                              <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold" title="Código ICAO">
                                {base.codigo_icao}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">N/A</span>
                        )}
                      </td>

                      {/* Colaboradores Vinculados */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setBaseDetalhes(base)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            colabStats.total > 0
                              ? 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title="Clique para visualizar os colaboradores vinculados"
                        >
                          <Users className="w-3 h-3" />
                          <span>{colabStats.total}</span>
                          {colabStats.ativos < colabStats.total && (
                            <span className="text-[10px] text-slate-500">({colabStats.ativos} ativos)</span>
                          )}
                        </button>
                      </td>

                      {/* Designações */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                            designacoesCount > 0 ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          <Plane className="w-3 h-3" />
                          <span>{designacoesCount}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {base.ativa ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <PowerOff className="w-2.5 h-2.5" />
                            Inativa
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detalhes / Colaboradores */}
                          <button
                            onClick={() => setBaseDetalhes(base)}
                            className="p-1.5 text-slate-500 hover:text-sky-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Ver Colaboradores e Detalhes"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          {!isReadOnly && (
                            <>
                              {/* Editar */}
                              <button
                                onClick={() => handleEdit(base)}
                                className="p-1.5 text-slate-500 hover:text-sky-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Editar Base"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Ativar / Inativar */}
                              {base.ativa ? (
                                <button
                                  onClick={() => handleIniciarInativacao(base)}
                                  className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                  title="Inativar Base (Preserva Histórico)"
                                >
                                  <PowerOff className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReativar(base)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                  title="Reativar Base Operacional"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Excluir se sem vínculos */}
                              <button
                                onClick={() => handleDelete(base)}
                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Excluir Permanentemente (apenas se sem vínculos)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição de Base */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building className="w-5 h-5 text-sky-800" />
                  {editingBase ? 'Editar Base / Local Operacional' : 'Cadastrar Nova Base / Local Operacional'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Os dados são salvos na coleção canônica de bases e sincronizados em tempo real para todo o sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Sigla / Código */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sigla / Código (Obrigatório):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: SDU, BSB, MAO"
                  value={formSigla}
                  onChange={(e) => setFormSigla(e.target.value.toUpperCase())}
                  disabled={!!editingBase}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold uppercase tracking-wider"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {editingBase ? 'ID Estável inalterável' : 'Chave primária única'}
                </span>
              </div>

              {/* Tipo de Base */}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tipo Operacional (Classificação Oficial):
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
                >
                  <option value="BASE_PRINCIPAL">Base Principal (Hub - Estrutura Completa)</option>
                  <option value="SUB_BASE">Sub-Base Operacional Permanente</option>
                  <option value="ESTACAO_LINHA">Estação de Linha (Line Maintenance)</option>
                  <option value="LOCAL_ATENDIMENTO">Local de Atendimento / Site do Cliente</option>
                  <option value="HANGAR">Hangar de Manutenção Pesada</option>
                </select>
              </div>
            </div>

            {/* Nome Oficial */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome Oficial da Base / Estação:
              </label>
              <input
                type="text"
                required
                placeholder="Ex.: Rio de Janeiro - Santos Dumont / Estação de Linha"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900"
              />
            </div>

            {/* Cidade, Estado, País */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Cidade:</label>
                <input
                  type="text"
                  placeholder="Ex.: Rio de Janeiro"
                  value={formCidade}
                  onChange={(e) => setFormCidade(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Estado (UF):</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Ex.: RJ, SP, PE"
                  value={formEstado}
                  onChange={(e) => setFormEstado(e.target.value.toUpperCase())}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">País:</label>
                <input
                  type="text"
                  value={formPais}
                  onChange={(e) => setFormPais(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Endereço / Instalação */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Endereço / Terminal / Pátio:
              </label>
              <input
                type="text"
                placeholder="Ex.: Praça Senador Salgado Filho, s/n - Aeroporto Santos Dumont, TPS 2"
                value={formEndereco}
                onChange={(e) => setFormEndereco(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            {/* Códigos Aeronáuticos (Opcionais) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Código IATA (Opcional - se aeroporto comercial):
                </label>
                <input
                  type="text"
                  maxLength={3}
                  placeholder="Ex.: SDU, BSB, REC"
                  value={formIata}
                  onChange={(e) => setFormIata(e.target.value.toUpperCase())}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Código ICAO (Opcional - se aeroporto homologado):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Ex.: SBRJ, SBBR, SBRF"
                  value={formIcao}
                  onChange={(e) => setFormIcao(e.target.value.toUpperCase())}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded font-mono uppercase font-bold"
                />
              </div>
            </div>

            {/* Responsável e Contato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Responsável Técnico / Supervisor:</label>
                <input
                  type="text"
                  placeholder="Ex.: Supervisor de Manutenção"
                  value={formResponsavel}
                  onChange={(e) => setFormResponsavel(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contato (Telefone / Rádio / E-mail):</label>
                <input
                  type="text"
                  placeholder="Ex.: (21) 3814-7000 | freq: 131.25"
                  value={formContato}
                  onChange={(e) => setFormContato(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Status & Observações */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="chk-ativa"
                  checked={formAtiva}
                  onChange={(e) => setFormAtiva(e.target.checked)}
                  className="rounded text-sky-800 focus:ring-sky-700"
                />
                <label htmlFor="chk-ativa" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Base Ativa no Sistema (Disponível para seleção e novas designações)
                </label>
              </div>

              <label className="text-xs font-semibold text-slate-700 block mb-1">Observações Técnicas / Regulatórias:</label>
              <textarea
                rows={2}
                placeholder="Observações adicionais sobre escopo operacional da base..."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Gravando no Firestore...' : 'Salvar Base Operacional'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Inativação com Auditoria e Verificação de Vínculos */}
      {baseParaInativar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 pb-3 border-b border-slate-100">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Inativar Base Operacional</h3>
                <p className="text-xs text-slate-500">
                  {baseParaInativar.sigla || baseParaInativar.id} - {baseParaInativar.nome}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-2">
              <p className="font-bold">Diretrizes de Integridade Histórica (Regra Seção 2.4):</p>
              <p>
                • A inativação não apaga nem modifica registros históricos de treinamentos, licenças ou designações passadas.
              </p>
              <p>
                • Novas designações para esta base serão impedidas, mas vínculos vigentes serão sinalizados para decisão humana dos gestores.
              </p>
              {colaboradoresPorBaseMap[baseParaInativar.id.toUpperCase()]?.total ? (
                <p className="font-bold text-amber-950">
                  ⚠️ Atenção: Existem {colaboradoresPorBaseMap[baseParaInativar.id.toUpperCase()].total} colaboradores vinculados a esta base como base principal.
                </p>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Justificativa / Motivo da Inativação (Registrado no Audit Trail):
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ex.: Encerramento temporário de contrato com a linha aérea no aeroporto..."
                value={motivoInativacao}
                onChange={(e) => setMotivoInativacao(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setBaseParaInativar(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarInativacao}
                disabled={isInactivating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isInactivating ? 'Inativando...' : 'Confirmar Inativação da Base'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Base e Colaboradores Vinculados */}
      {baseDetalhes && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base px-2 py-0.5 bg-slate-100 rounded text-sky-950 border border-slate-200">
                    {baseDetalhes.sigla || baseDetalhes.id}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{baseDetalhes.nome}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {baseDetalhes.cidade} - {baseDetalhes.estado} | Tipo:{' '}
                  {TIPOS_BASE_CONFIG[baseDetalhes.tipo]?.label || baseDetalhes.tipo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBaseDetalhes(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Colaboradores Vinculados */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Colaboradores com Base Principal em {baseDetalhes.sigla || baseDetalhes.id}</span>
                <span className="text-[11px] text-slate-500">
                  {db.pessoas.filter((p) => (p.base_principal_id || '').toUpperCase() === baseDetalhes.id.toUpperCase()).length} colaboradores
                </span>
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase">
                    <tr>
                      <th className="py-2 px-3">CANAC / ID</th>
                      <th className="py-2 px-3">Nome</th>
                      <th className="py-2 px-3">Categoria</th>
                      <th className="py-2 px-3">Cargo Operacional</th>
                      <th className="py-2 px-3">Situação</th>
                      <th className="py-2 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {db.pessoas.filter((p) => (p.base_principal_id || '').toUpperCase() === baseDetalhes.id.toUpperCase()).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Nenhum colaborador alocado nesta base como base principal.
                        </td>
                      </tr>
                    ) : (
                      db.pessoas
                        .filter((p) => (p.base_principal_id || '').toUpperCase() === baseDetalhes.id.toUpperCase())
                        .map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold">{p.canac || p.id}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{p.nome}</td>
                            <td className="py-2 px-3">{p.categoria}</td>
                            <td className="py-2 px-3 text-slate-600">{p.cargo_operacional || p.funcao || '-'}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  p.situacao === 'Ativo'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {p.situacao}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => {
                                  setBaseDetalhes(null);
                                  navigateToFicha(p.id);
                                }}
                                className="text-sky-700 hover:text-sky-900 font-semibold text-[11px] cursor-pointer"
                              >
                                Ver Ficha →
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Designações Ativas da Base */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Designações Vinculadas a esta Base ({db.designacoesBase.filter((d) => (d.base_id || '').toUpperCase() === baseDetalhes.id.toUpperCase()).length} pessoas designadas)
              </h4>
              <p className="text-[11px] text-slate-500">
                Pessoas habilitadas operacionalmente para prestar atendimento nesta localidade segundo a Matriz de Designações.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setBaseDetalhes(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
