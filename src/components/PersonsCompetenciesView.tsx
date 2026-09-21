import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BookOpen,
  FileText,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  X,
  ChevronRight,
  UserCheck,
  Ban,
  Activity,
  Calendar,
  Lock,
  Unlock,
  PowerOff,
  RotateCcw,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  CompetenciaItem,
  CompetenciaColaborador,
  QualificacaoColaborador,
  RegistroTreinamentoColaborador,
  DocumentoEvidenciaPessoa,
  AtividadeCompetenciaRequerida,
  UserProfile,
  StatusColaborador,
  CriticidadeCompetencia,
  FaixaVencimentoItem,
} from '../types';
import {
  savePerson,
  deletePerson,
  inactivatePerson,
  reactivatePerson,
  verificarDependenciasPessoa,
  saveCompetency,
  savePersonCompetency,
} from '../services/firebase/competenciesFirestore';
import {
  verificarPodeExecutarAtividade,
  calcularDiasParaVencimento,
  consolidarCentralVencimentos,
} from '../services/competenciesEngine';
import { obterConfiguracaoStatusColaborador } from '../utils/qualityHelpers';

interface PersonsCompetenciesViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  persons: ColaboradorPessoa[];
  competencies: CompetenciaItem[];
  personCompetencies: CompetenciaColaborador[];
  qualifications: QualificacaoColaborador[];
  trainingRecords: RegistroTreinamentoColaborador[];
  documents: DocumentoEvidenciaPessoa[];
  activities: AtividadeCompetenciaRequerida[];
  nonConformities?: any[];
  initialStatusFilter?: string;
  onNavigateToTrainings?: () => void;
  onNavigateToExpirations?: () => void;
}

export const PersonsCompetenciesView: React.FC<PersonsCompetenciesViewProps> = ({
  organizationId,
  userProfile,
  persons = [],
  competencies = [],
  personCompetencies = [],
  qualifications = [],
  trainingRecords = [],
  documents = [],
  activities = [],
  nonConformities = [],
  initialStatusFilter,
  onNavigateToTrainings,
  onNavigateToExpirations,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'COLABORADORES' | 'MATRIZ' | 'CATALOGO'>('COLABORADORES');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter || 'TODOS');
  const [filterRestricao, setFilterRestricao] = useState(false);

  useEffect(() => {
    if (initialStatusFilter) {
      setSelectedStatus(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Colaborador Selecionado para Visão 360°
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorPessoa | null>(null);
  const [modalColaboradorOpen, setModalColaboradorOpen] = useState(false);
  const [colaboradorParaEditar, setColaboradorParaEditar] = useState<ColaboradorPessoa | null>(null);
  const [aba360, setAba360] = useState<
    'GERAL' | 'COMPETENCIAS' | 'TREINAMENTOS' | 'QUALIFICACOES' | 'VENCIMENTOS' | 'HISTORICO'
  >('GERAL');

  // Modais de Governança de Ciclo de Vida: Inativação, Reativação, Exclusão
  const [colaboradorParaInativar, setColaboradorParaInativar] = useState<ColaboradorPessoa | null>(null);
  const [modalInativarOpen, setModalInativarOpen] = useState(false);
  const [motivoInativacao, setMotivoInativacao] = useState('');

  const [colaboradorParaReativar, setColaboradorParaReativar] = useState<ColaboradorPessoa | null>(null);
  const [modalReativarOpen, setModalReativarOpen] = useState(false);
  const [motivoReativacao, setMotivoReativacao] = useState('');

  const [colaboradorParaExcluir, setColaboradorParaExcluir] = useState<ColaboradorPessoa | null>(null);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [motivoExclusao, setMotivoExclusao] = useState('');
  const [analiseDependenciasColab, setAnaliseDependenciasColab] = useState<{
    podeExcluir: boolean;
    totalVinculos: number;
    motivosBloqueio?: string[];
    detalhes?: string[];
  } | null>(null);

  const [isSubmittingAcao, setIsSubmittingAcao] = useState(false);

  // Modal de Nova / Editar Competência
  const [modalCompetenciaOpen, setModalCompetenciaOpen] = useState(false);
  const [competenciaParaEditar, setCompetenciaParaEditar] = useState<CompetenciaItem | null>(null);

  // Modal de Atribuição de Competência
  const [modalAtribuirCompOpen, setModalAtribuirCompOpen] = useState(false);
  const [atribuirCompData, setAtribuirCompData] = useState<{
    colaboradorId: string;
    competenciaId: string;
    nivel: number;
    validade: string;
    observacoes: string;
  }>({
    colaboradorId: '',
    competenciaId: '',
    nivel: 2,
    validade: '',
    observacoes: '',
  });

  // Atividade selecionada para simulação no painel 360
  const [selectedActivityId, setSelectedActivityId] = useState<string>(activities[0]?.id || '');

  // Setores únicos
  const setoresUnicos = useMemo(() => {
    const s = new Set<string>();
    persons.forEach((p) => {
      if (p.setor) s.add(p.setor);
    });
    return Array.from(s).sort();
  }, [persons]);

  // Contagens oficiais de colaboradores por status (Fonte Única da Verdade)
  const contagensPorStatus = useMemo(() => {
    const counts: Record<string, number> = {
      TODOS: persons.length,
      ATIVO: 0,
      EM_TREINAMENTO: 0,
      RESTRITO: 0,
      SUSPENSO: 0,
      AFASTADO: 0,
      DESLIGADO: 0,
      INATIVO: 0,
      OUTRO: 0,
    };

    persons.forEach((p) => {
      const st = p.status || 'ATIVO';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.OUTRO++;
      }
    });

    return counts;
  }, [persons]);

  // Colaboradores filtrados
  const colaboradoresFiltrados = useMemo(() => {
    return persons.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cargoOperacional && p.cargoOperacional.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.funcao.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSetor = selectedSetor === 'TODOS' || p.setor === selectedSetor;
      const matchStatus = selectedStatus === 'TODOS' || p.status === selectedStatus;
      const matchRestricao = !filterRestricao || (p.restricaoOperacional && p.restricaoOperacional.possuiRestricao);

      return matchSearch && matchSetor && matchStatus && matchRestricao;
    });
  }, [persons, searchTerm, selectedSetor, selectedStatus, filterRestricao]);

  // Dados 360° do colaborador selecionado
  const colabComps = useMemo(() => {
    if (!selectedColaborador) return [];
    return personCompetencies.filter((c) => c.colaboradorId === selectedColaborador.id);
  }, [personCompetencies, selectedColaborador]);

  const colabQualifs = useMemo(() => {
    if (!selectedColaborador) return [];
    return qualifications.filter((q) => q.colaboradorId === selectedColaborador.id);
  }, [qualifications, selectedColaborador]);

  const colabTreinos = useMemo(() => {
    if (!selectedColaborador) return [];
    return trainingRecords.filter((t) => t.colaboradorId === selectedColaborador.id);
  }, [trainingRecords, selectedColaborador]);

  const colabDocs = useMemo(() => {
    if (!selectedColaborador) return [];
    return documents.filter((d) => d.colaboradorId === selectedColaborador.id);
  }, [documents, selectedColaborador]);

  // Vencimentos consolidados específicos do colaborador 360
  const vencimentosColaborador = useMemo(() => {
    if (!selectedColaborador) return [];
    return consolidarCentralVencimentos(
      colabQualifs,
      colabTreinos,
      colabDocs,
      colabComps
    );
  }, [selectedColaborador, colabQualifs, colabTreinos, colabDocs, colabComps]);

  // Checagem da atividade selecionada para o colaborador 360
  const resultadoAtividade = useMemo(() => {
    if (!selectedColaborador) return null;
    const atv = activities.find((a) => a.id === selectedActivityId);
    if (!atv) return null;

    return {
      atividade: atv,
      resultado: verificarPodeExecutarAtividade(
        selectedColaborador,
        atv,
        personCompetencies,
        qualifications,
        trainingRecords
      ),
    };
  }, [selectedColaborador, selectedActivityId, activities, personCompetencies, qualifications, trainingRecords]);

  // Handlers para salvar/excluir
  const handleSaveColaborador = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const possuiRestricao = formData.get('possuiRestricao') === 'on';
    const impedeExecucao = formData.get('impedeExecucao') === 'on';

    const colab: ColaboradorPessoa = {
      id: colaboradorParaEditar?.id || `colab-${Date.now()}`,
      organizationId,
      nome: String(formData.get('nome') || '').trim(),
      matricula: String(formData.get('matricula') || '').trim(),
      setor: String(formData.get('setor') || '').trim(),
      funcao: String(formData.get('funcao') || '').trim(),
      cargoOperacional: String(formData.get('cargoOperacional') || '').trim(),
      status: (formData.get('status') as StatusColaborador) || 'ATIVO',
      statusCustomizado: String(formData.get('statusCustomizado') || '').trim() || undefined,
      dataAdmissao: String(formData.get('dataAdmissao') || ''),
      contatoCorporativo: String(formData.get('contatoCorporativo') || '').trim(),
      observacoes: String(formData.get('observacoes') || '').trim(),
      restricaoOperacional: {
        possuiRestricao,
        motivo: possuiRestricao ? String(formData.get('motivoRestricao') || '').trim() : undefined,
        dataInicio: possuiRestricao ? String(formData.get('dataInicioRestricao') || '') : undefined,
        dataFim: possuiRestricao ? String(formData.get('dataFimRestricao') || '') : undefined,
        impedeExecucao: possuiRestricao ? impedeExecucao : false,
        apenasAlerta: possuiRestricao ? !impedeExecucao : false,
        registradoPor: userProfile?.displayName || 'SGQ',
        registradoEm: new Date().toISOString(),
      },
      createdAt: colaboradorParaEditar?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      criadoPor: colaboradorParaEditar?.criadoPor || userProfile?.displayName || 'SGQ',
      criadoPorUid: colaboradorParaEditar?.criadoPorUid || userProfile?.uid || 'sgq',
    };

    try {
      await savePerson(organizationId, colab, userProfile, colaboradorParaEditar || undefined);
      setModalColaboradorOpen(false);
      setColaboradorParaEditar(null);
      if (selectedColaborador?.id === colab.id) {
        setSelectedColaborador(colab);
      }
    } catch (err: any) {
      alert(`Erro ao salvar colaborador: ${err.message}`);
    }
  };

  // Abrir Modal de Inativação Lógica
  const handleOpenInativar = (colab: ColaboradorPessoa) => {
    setColaboradorParaInativar(colab);
    setMotivoInativacao('');
    setModalInativarOpen(true);
  };

  // Confirmar Inativação Lógica
  const handleConfirmInativar = async () => {
    if (!colaboradorParaInativar) return;
    if (!motivoInativacao.trim()) {
      alert('Por favor, informe a justificativa ou motivo para a inativação do colaborador.');
      return;
    }

    try {
      setIsSubmittingAcao(true);
      await inactivatePerson(organizationId, colaboradorParaInativar.id, motivoInativacao.trim(), userProfile);
      setModalInativarOpen(false);
      setColaboradorParaInativar(null);
      setMotivoInativacao('');
      if (selectedColaborador?.id === colaboradorParaInativar.id) {
        setSelectedColaborador({
          ...selectedColaborador,
          status: 'INATIVO',
          inativadoEm: new Date().toISOString(),
          inativadoPor: userProfile?.displayName || 'SGQ',
          motivoInativacao: motivoInativacao.trim(),
        });
      }
    } catch (err: any) {
      alert(`Erro ao inativar colaborador: ${err.message}`);
    } finally {
      setIsSubmittingAcao(false);
    }
  };

  // Abrir Modal de Reativação
  const handleOpenReativar = (colab: ColaboradorPessoa) => {
    setColaboradorParaReativar(colab);
    setMotivoReativacao('Retorno às atividades operacionais e revalidação de requisitos SGQ');
    setModalReativarOpen(true);
  };

  // Confirmar Reativação
  const handleConfirmReativar = async () => {
    if (!colaboradorParaReativar) return;
    try {
      setIsSubmittingAcao(true);
      await reactivatePerson(organizationId, colaboradorParaReativar.id, motivoReativacao.trim(), userProfile);
      setModalReativarOpen(false);
      setColaboradorParaReativar(null);
      setMotivoReativacao('');
      if (selectedColaborador?.id === colaboradorParaReativar.id) {
        setSelectedColaborador({
          ...selectedColaborador,
          status: 'ATIVO',
          reativadoEm: new Date().toISOString(),
          reativadoPor: userProfile?.displayName || 'SGQ',
          motivoReativacao: motivoReativacao.trim(),
        });
      }
    } catch (err: any) {
      alert(`Erro ao reativar colaborador: ${err.message}`);
    } finally {
      setIsSubmittingAcao(false);
    }
  };

  // Abrir Modal de Exclusão Segura com Checagem Prévia de Dependências
  const handleOpenExcluir = (colab: ColaboradorPessoa) => {
    const analise = verificarDependenciasPessoa(
      colab.id,
      trainingRecords || [],
      personCompetencies || [],
      qualifications || [],
      documents || [],
      nonConformities || []
    );
    setColaboradorParaExcluir(colab);
    setAnaliseDependenciasColab(analise);
    setMotivoExclusao('');
    setModalExcluirOpen(true);
  };

  // Confirmar Exclusão Física (se permitido)
  const handleConfirmExcluir = async () => {
    if (!colaboradorParaExcluir) return;
    if (!analiseDependenciasColab?.podeExcluir) {
      alert('Exclusão não permitida devido a vínculos ativos no SGQ. Utilize a Inativação.');
      return;
    }

    try {
      setIsSubmittingAcao(true);
      await deletePerson(
        organizationId,
        colaboradorParaExcluir.id,
        userProfile,
        motivoExclusao.trim() || 'Exclusão de cadastro sem dependências vinculadas',
        analiseDependenciasColab
      );
      setModalExcluirOpen(false);
      if (selectedColaborador?.id === colaboradorParaExcluir.id) {
        setSelectedColaborador(null);
      }
      setColaboradorParaExcluir(null);
      setAnaliseDependenciasColab(null);
    } catch (err: any) {
      alert(`Erro ao excluir colaborador: ${err.message}`);
    } finally {
      setIsSubmittingAcao(false);
    }
  };

  const handleDeleteColaborador = async (colab: ColaboradorPessoa) => {
    handleOpenExcluir(colab);
  };

  const handleSaveCompetencia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const setoresArr = String(formData.get('setoresAplicaveis') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const funcoesArr = String(formData.get('funcoesAplicaveis') || '')
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const comp: CompetenciaItem = {
      id: competenciaParaEditar?.id || `comp-${Date.now()}`,
      organizationId,
      codigo: String(formData.get('codigo') || '').trim().toUpperCase(),
      nome: String(formData.get('nome') || '').trim(),
      descricao: String(formData.get('descricao') || '').trim(),
      setoresAplicaveis: setoresArr.length > 0 ? setoresArr : ['Todos'],
      funcoesAplicaveis: funcoesArr.length > 0 ? funcoesArr : ['Todas'],
      criticidade: (formData.get('criticidade') as CriticidadeCompetencia) || 'ALTA',
      niveisDefinidos: [
        { nivel: 1, nome: 'Nível 1 — Teórico', descricao: 'Conhecimento fundamental' },
        { nivel: 2, nome: 'Nível 2 — Sob Supervisão', descricao: 'Execução acompanhada' },
        { nivel: 3, nome: 'Nível 3 — Autônomo', descricao: 'Execução e assinatura autônoma' },
        { nivel: 4, nome: 'Nível 4 — Supervisor', descricao: 'Orientação e supervisão técnica' },
        { nivel: 5, nome: 'Nível 5 — Especialista', descricao: 'Homologação e instrução interna' },
      ],
      treinamentosRequeridosIds: [],
      qualificacaoObrigatoria: String(formData.get('qualificacaoObrigatoria') || '').trim() || undefined,
      status: (formData.get('status') as 'ATIVA' | 'INATIVA') || 'ATIVA',
      createdAt: competenciaParaEditar?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveCompetency(organizationId, comp, userProfile);
      setModalCompetenciaOpen(false);
      setCompetenciaParaEditar(null);
    } catch (err: any) {
      alert(`Erro ao salvar competência: ${err.message}`);
    }
  };

  const handleSalvarAtribuicaoComp = async () => {
    if (!atribuirCompData.colaboradorId || !atribuirCompData.competenciaId) {
      alert('Selecione o colaborador e a competência.');
      return;
    }

    const colab = persons.find((p) => p.id === atribuirCompData.colaboradorId);
    const comp = competencies.find((c) => c.id === atribuirCompData.competenciaId);
    if (!colab || !comp) return;

    const existing = personCompetencies.find(
      (pc) => pc.colaboradorId === colab.id && pc.competenciaId === comp.id
    );

    const payload: CompetenciaColaborador = {
      id: existing?.id || `pc-${colab.id}-${comp.id}`,
      organizationId,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      colaboradorMatricula: colab.matricula,
      setor: colab.setor,
      competenciaId: comp.id,
      competenciaCodigo: comp.codigo,
      competenciaNome: comp.nome,
      nivelAtual: atribuirCompData.nivel,
      status: 'QUALIFICADO',
      dataConcessao: new Date().toISOString().split('T')[0],
      dataValidade: atribuirCompData.validade || undefined,
      responsavelValidacaoNome: userProfile?.displayName || 'SGQ',
      responsavelValidacaoUid: userProfile?.uid || 'sgq',
      observacoes: atribuirCompData.observacoes,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePersonCompetency(organizationId, payload, userProfile);
      setModalAtribuirCompOpen(false);
    } catch (err: any) {
      alert(`Erro ao atribuir competência: ${err.message}`);
    }
  };

  const renderStatusBadge = (colab: ColaboradorPessoa) => {
    const config = obterConfiguracaoStatusColaborador(colab.status);
    const label = colab.statusCustomizado || config.label;

    return (
      <span
        title={config.descricao}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${config.badgeClass}`}
      >
        <span>{config.iconeEmoji}</span>
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegação Secundária da Fase 9 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Fase 9 — SGQ Pessoas & Competências
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Colaboradores & Matriz de Competências</h1>
          <p className="text-sm text-slate-600">
            Garantia da competência, qualificação e autorização técnica para atividades de manutenção e qualidade aeronáutica.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setColaboradorParaEditar(null);
              setModalColaboradorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Colaborador
          </button>
          <button
            onClick={() => {
              setCompetenciaParaEditar(null);
              setModalCompetenciaOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition"
          >
            <Award className="w-4 h-4 text-emerald-600" /> Nova Competência
          </button>
        </div>
      </div>

      {/* Sub-navegação em Abas */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('COLABORADORES')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'COLABORADORES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> Colaboradores Cadastrados ({persons.length})
        </button>
        <button
          onClick={() => setActiveSubTab('MATRIZ')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'MATRIZ'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" /> Matriz de Competências
        </button>
        <button
          onClick={() => setActiveSubTab('CATALOGO')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeSubTab === 'CATALOGO'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-purple-600" /> Catálogo de Competências ({competencies.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: LISTAGEM DE COLABORADORES & VISÃO 360°                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'COLABORADORES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna da Esquerda: Lista de Colaboradores */}
          <div className={`${selectedColaborador ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
            {/* Filtros e Busca */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, matrícula, função ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Chips Rápidos de Filtro por Status Operacional */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('TODOS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                    selectedStatus === 'TODOS'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Todos ({contagensPorStatus.TODOS})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('ATIVO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    selectedStatus === 'ATIVO'
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span>🟢</span>
                  <span>Ativos ({contagensPorStatus.ATIVO})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('EM_TREINAMENTO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    selectedStatus === 'EM_TREINAMENTO'
                      ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <span>🔵</span>
                  <span>Em treinamento ({contagensPorStatus.EM_TREINAMENTO})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('RESTRITO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    selectedStatus === 'RESTRITO'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span>🟡</span>
                  <span>Restritos ({contagensPorStatus.RESTRITO})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('SUSPENSO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    selectedStatus === 'SUSPENSO'
                      ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span>🔴</span>
                  <span>Suspensos ({contagensPorStatus.SUSPENSO})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('AFASTADO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    selectedStatus === 'AFASTADO'
                      ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                      : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <span>🟣</span>
                  <span>Afastados ({contagensPorStatus.AFASTADO})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('DESLIGADO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                    selectedStatus === 'DESLIGADO'
                      ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>⚫</span>
                  <span>Desligados ({contagensPorStatus.DESLIGADO})</span>
                </button>
                {contagensPorStatus.OUTRO > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('OUTRO')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                      selectedStatus === 'OUTRO'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚪</span>
                    <span>Outros ({contagensPorStatus.OUTRO})</span>
                  </button>
                )}
                {contagensPorStatus.INATIVO > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('INATIVO')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                      selectedStatus === 'INATIVO'
                        ? 'bg-zinc-700 text-white border-zinc-800 shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    <span>🔘</span>
                    <span>Inativos ({contagensPorStatus.INATIVO})</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                  value={selectedSetor}
                  onChange={(e) => setSelectedSetor(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-slate-50 text-slate-700"
                >
                  <option value="TODOS">Todos os Setores</option>
                  {setoresUnicos.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-slate-50 text-slate-700 font-medium"
                >
                  <option value="TODOS">Todos os Status ({contagensPorStatus.TODOS})</option>
                  <option value="ATIVO">🟢 Ativos ({contagensPorStatus.ATIVO})</option>
                  <option value="EM_TREINAMENTO">🔵 Em treinamento ({contagensPorStatus.EM_TREINAMENTO})</option>
                  <option value="RESTRITO">🟡 Restritos ({contagensPorStatus.RESTRITO})</option>
                  <option value="SUSPENSO">🔴 Suspensos ({contagensPorStatus.SUSPENSO})</option>
                  <option value="AFASTADO">🟣 Afastados ({contagensPorStatus.AFASTADO})</option>
                  <option value="DESLIGADO">⚫ Desligados ({contagensPorStatus.DESLIGADO})</option>
                  {contagensPorStatus.OUTRO > 0 && (
                    <option value="OUTRO">⚪ Outros ({contagensPorStatus.OUTRO})</option>
                  )}
                  {contagensPorStatus.INATIVO > 0 && (
                    <option value="INATIVO">🔘 Inativos ({contagensPorStatus.INATIVO})</option>
                  )}
                </select>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none ml-auto">
                  <input
                    type="checkbox"
                    checked={filterRestricao}
                    onChange={(e) => setFilterRestricao(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Com Restrição</span>
                </label>
              </div>
            </div>

            {/* Lista dos Cards */}
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {colaboradoresFiltrados.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="font-medium">Nenhum colaborador encontrado com os filtros aplicados.</p>
                </div>
              ) : (
                colaboradoresFiltrados.map((colab) => {
                  const isSelected = selectedColaborador?.id === colab.id;
                  const temRestricao = colab.restricaoOperacional?.possuiRestricao;
                  const bloqueia = colab.restricaoOperacional?.impedeExecucao;

                  return (
                    <div
                      key={colab.id}
                      onClick={() => setSelectedColaborador(colab)}
                      className={`p-4 rounded-xl border transition cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{colab.nome}</span>
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {colab.matricula}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-slate-800">{colab.funcao}</span> • {colab.setor}
                          </p>
                          {colab.cargoOperacional && (
                            <p className="text-xs text-slate-500">{colab.cargoOperacional}</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          {renderStatusBadge(colab)}

                          {temRestricao && (
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium ${
                                bloqueia
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {bloqueia ? 'Bloqueio Ativo' : 'Restrição Alerta'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2.5">
                          <span>
                            <strong>
                              {personCompetencies.filter((c) => c.colaboradorId === colab.id).length}
                            </strong>{' '}
                            comps
                          </span>
                          <span>
                            <strong>
                              {qualifications.filter((q) => q.colaboradorId === colab.id).length}
                            </strong>{' '}
                            qualifs
                          </span>
                          <span>
                            <strong>
                              {trainingRecords.filter((t) => t.colaboradorId === colab.id).length}
                            </strong>{' '}
                            treinos
                          </span>
                        </div>

                        {/* Botões de Ação Direta no Card */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setColaboradorParaEditar(colab);
                              setModalColaboradorOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Editar Cadastro"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {colab.status === 'INATIVO' || colab.status === 'DESLIGADO' ? (
                            <button
                              onClick={() => handleOpenReativar(colab)}
                              className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                              title="Reativar Colaborador"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenInativar(colab)}
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Inativar Colaborador (Lógica)"
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenExcluir(colab)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Excluir Registro (com verificação de vínculos)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setSelectedColaborador(colab)}
                            className="ml-1 px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-0.5 font-medium text-[11px]"
                            title="Abrir Visão 360°"
                          >
                            <span>360°</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna da Direita: Painel 360° do Colaborador Consolidado */}
          {selectedColaborador && (
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              {/* Header 360° */}
              <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-slate-100 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">{selectedColaborador.nome}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                      {selectedColaborador.matricula}
                    </span>
                    {renderStatusBadge(selectedColaborador)}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium text-slate-800">{selectedColaborador.funcao}</span> • {selectedColaborador.setor} •{' '}
                    {selectedColaborador.cargoOperacional || 'Sem cargo específico'}
                  </p>
                  {selectedColaborador.contatoCorporativo && (
                    <p className="text-xs text-slate-500 mt-0.5">{selectedColaborador.contatoCorporativo}</p>
                  )}
                </div>

                {/* Barra de Ações do Colaborador Selecionado */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setColaboradorParaEditar(selectedColaborador);
                      setModalColaboradorOpen(true);
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg transition flex items-center gap-1.5 border border-slate-200"
                    title="Editar Cadastro do Colaborador"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    <span>Editar</span>
                  </button>

                  {selectedColaborador.status === 'INATIVO' || selectedColaborador.status === 'DESLIGADO' ? (
                    <button
                      onClick={() => handleOpenReativar(selectedColaborador)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1.5 border border-emerald-200"
                      title="Reativar Colaborador"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reativar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenInativar(selectedColaborador)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-1.5 border border-amber-200"
                      title="Inativar Colaborador (Lógica)"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      <span>Inativar</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenExcluir(selectedColaborador)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition flex items-center gap-1.5 border border-rose-200"
                    title="Excluir Registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>

                  <button
                    onClick={() => setSelectedColaborador(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition hover:bg-slate-100 ml-1"
                    title="Fechar painel 360°"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Banner de Colaborador Inativo (Histórico Preservado) */}
              {(selectedColaborador.status === 'INATIVO' || selectedColaborador.status === 'DESLIGADO') && (
                <div className="p-4 rounded-xl border bg-slate-50 border-slate-300 text-slate-800 flex items-start gap-3">
                  <PowerOff className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      Colaborador Inativo / Desligado
                      <span className="font-normal text-xs text-slate-500">(Preservação Histórica Ativa)</span>
                    </p>
                    {selectedColaborador.inativadoEm && (
                      <p className="text-slate-600">
                        Inativado em{' '}
                        <strong>{new Date(selectedColaborador.inativadoEm).toLocaleString('pt-BR')}</strong> por{' '}
                        <strong>{selectedColaborador.inativadoPor || 'SGQ'}</strong>.
                      </p>
                    )}
                    {selectedColaborador.motivoInativacao && (
                      <p className="text-slate-700 bg-white/70 p-2 rounded border border-slate-200">
                        <span className="font-semibold text-slate-800">Motivo registrado:</span>{' '}
                        {selectedColaborador.motivoInativacao}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 pt-0.5">
                      ⚠️ Conforme RBAC 145.161 e EASA Part 145, o histórico de treinamentos, CHTs e assinaturas
                      deste colaborador é permanente e imutável para fins de auditoria regulatória.
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta de Restrição Operacional se houver */}
              {selectedColaborador.restricaoOperacional?.possuiRestricao && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    selectedColaborador.restricaoOperacional.impedeExecucao
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-sm">
                      {selectedColaborador.restricaoOperacional.impedeExecucao
                        ? 'Bloqueio Operacional Ativo (Impede Execução)'
                        : 'Alerta Operacional Não Impeditivo'}
                    </p>
                    <p>{selectedColaborador.restricaoOperacional.motivo}</p>
                    {selectedColaborador.restricaoOperacional.dataInicio && (
                      <p className="text-[11px] opacity-80">
                        Vigência: {selectedColaborador.restricaoOperacional.dataInicio} até{' '}
                        {selectedColaborador.restricaoOperacional.dataFim || 'Indeterminado'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navegação por Sub-Abas 360° */}
              <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
                <button
                  onClick={() => setAba360('GERAL')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    aba360 === 'GERAL'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Geral & Aptidão</span>
                </button>

                <button
                  onClick={() => setAba360('COMPETENCIAS')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    aba360 === 'COMPETENCIAS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Competências</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] text-slate-700">
                    {colabComps.length}
                  </span>
                </button>

                <button
                  onClick={() => setAba360('TREINAMENTOS')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    aba360 === 'TREINAMENTOS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span>Treinamentos</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] text-slate-700">
                    {colabTreinos.length}
                  </span>
                </button>

                <button
                  onClick={() => setAba360('QUALIFICACOES')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    aba360 === 'QUALIFICACOES'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>CHTs & Licenças</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] text-slate-700">
                    {colabQualifs.length}
                  </span>
                </button>

                <button
                  onClick={() => setAba360('VENCIMENTOS')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    aba360 === 'VENCIMENTOS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Vencimentos</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      vencimentosColaborador.some((v) => v.diasRestantes !== null && v.diasRestantes < 0)
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {vencimentosColaborador.length}
                  </span>
                </button>

                <button
                  onClick={() => setAba360('HISTORICO')}
                  className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
                    aba360 === 'HISTORICO'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Histórico & Docs</span>
                  <span className="ml-0.5 px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px] text-slate-700">
                    {colabDocs.length}
                  </span>
                </button>
              </div>

              {/* CONTEÚDO DAS SUB-ABAS 360° */}

              {/* SUB-ABA 1: GERAL & APTIDÃO OPERACIONAL */}
              {aba360 === 'GERAL' && (
                <div className="space-y-5">
                  {/* Cards de Métricas Rápidas do Colaborador */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Competências</p>
                      <p className="text-xl font-bold text-slate-900 mt-0.5">{colabComps.length}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        {colabComps.filter((c) => c.nivelAtual >= 3).length} nível 3+
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">CHTs & Licenças</p>
                      <p className="text-xl font-bold text-blue-900 mt-0.5">{colabQualifs.length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {colabQualifs.filter((q) => q.status === 'VALIDA').length} válidas
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Treinamentos</p>
                      <p className="text-xl font-bold text-sky-900 mt-0.5">{colabTreinos.length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Cursos concluídos</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Itens a Vencer</p>
                      <p
                        className={`text-xl font-bold mt-0.5 ${
                          vencimentosColaborador.some((v) => v.diasRestantes !== null && v.diasRestantes < 0)
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {vencimentosColaborador.filter((v) => v.diasRestantes !== null && v.diasRestantes <= 30).length}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Nos próximos 30d</p>
                    </div>
                  </div>

                  {/* Ficha Cadastral Estruturada */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" /> Ficha Cadastral & Lotação
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Matrícula:</span>
                        <span className="font-mono font-semibold text-slate-800">{selectedColaborador.matricula}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Função Primária:</span>
                        <span className="font-semibold text-slate-800">{selectedColaborador.funcao}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cargo / Especialidade:</span>
                        <span className="font-medium text-slate-800">
                          {selectedColaborador.cargoOperacional || 'Não especificado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Setor Operacional:</span>
                        <span className="font-medium text-slate-800">{selectedColaborador.setor}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Data de Admissão:</span>
                        <span className="font-medium text-slate-800">
                          {selectedColaborador.dataAdmissao || 'Não informada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">E-mail Corporativo:</span>
                        <span className="font-medium text-slate-800 truncate block">
                          {selectedColaborador.contatoCorporativo || 'Não informado'}
                        </span>
                      </div>
                    </div>

                    {selectedColaborador.observacoes && (
                      <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">Observações:</span>{' '}
                        {selectedColaborador.observacoes}
                      </div>
                    )}
                  </div>

                  {/* SIMULADOR OPERACIONAL INSTANTÂNEO: PODE EXECUTAR ATIVIDADE? */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-600" /> Verificação de Bloqueio Operacional
                      </span>
                      <span className="text-xs text-slate-500">Matriz Atividade x Competência</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={selectedActivityId}
                        onChange={(e) => setSelectedActivityId(e.target.value)}
                        className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium"
                      >
                        {activities.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.codigoAtividade} — {a.nomeAtividade}
                          </option>
                        ))}
                      </select>
                    </div>

                    {resultadoAtividade && (
                      <div
                        className={`p-3 rounded-lg border text-xs space-y-2 ${
                          resultadoAtividade.resultado.podeExecutar
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          {resultadoAtividade.resultado.podeExecutar ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>AUTORIZADO PARA EXECUÇÃO DA ATIVIDADE</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>BLOQUEIO OPERACIONAL — EXECUÇÃO NÃO AUTORIZADA</span>
                            </>
                          )}
                        </div>

                        {resultadoAtividade.resultado.motivosBloqueio.length > 0 && (
                          <div className="space-y-1">
                            <p className="font-semibold text-rose-800">Motivos do Bloqueio:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                              {resultadoAtividade.resultado.motivosBloqueio.map((m, idx) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {resultadoAtividade.resultado.alertasNaoImpeditivos.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-amber-200 text-amber-800">
                            <p className="font-semibold">Alertas de Atenção:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {resultadoAtividade.resultado.alertasNaoImpeditivos.map((a, idx) => (
                                <li key={idx}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-ABA 2: COMPETÊNCIAS REGISTRADAS */}
              {aba360 === 'COMPETENCIAS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Competências Atribuídas ({colabComps.length})
                    </h3>
                    <button
                      onClick={() => {
                        setAtribuirCompData({
                          colaboradorId: selectedColaborador.id,
                          competenciaId: competencies[0]?.id || '',
                          nivel: 3,
                          validade: '',
                          observacoes: '',
                        });
                        setModalAtribuirCompOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      + Atribuir Competência
                    </button>
                  </div>

                  {colabComps.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
                      Nenhuma competência formal mapeada para este colaborador.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {colabComps.map((cc) => (
                        <div
                          key={cc.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{cc.competenciaNome}</span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded font-bold">
                                {cc.competenciaCodigo}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <div
                                    key={lvl}
                                    className={`w-3.5 h-1.5 rounded-xs ${
                                      lvl <= cc.nivelAtual ? 'bg-emerald-500' : 'bg-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-medium text-slate-700">Nível {cc.nivelAtual}/5</span>
                              {cc.dataValidade && (
                                <span className="text-slate-500">
                                  • Validade: {cc.dataValidade} ({calcularDiasParaVencimento(cc.dataValidade) ?? 'N/A'} dias)
                                </span>
                              )}
                            </div>
                            {cc.observacoes && (
                              <p className="text-[11px] text-slate-500 italic">{cc.observacoes}</p>
                            )}
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                              cc.status === 'QUALIFICADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cc.status === 'VENCENDO'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {cc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 3: TREINAMENTOS & RECICLAGENS */}
              {aba360 === 'TREINAMENTOS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-sky-600" /> Treinamentos & Reciclagens ({colabTreinos.length})
                    </h3>
                    {onNavigateToTrainings && (
                      <button
                        onClick={onNavigateToTrainings}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Gerenciar Treinamentos →
                      </button>
                    )}
                  </div>

                  {colabTreinos.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
                      Nenhum registro de treinamento localizado para este colaborador.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {colabTreinos.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{tr.treinamentoTitulo}</p>
                            <p className="text-slate-600 text-[11px]">
                              Realizado em: <strong>{tr.dataRealizacao}</strong> • Carga: {tr.cargaHoraria}h • Instrutor: {tr.instrutor}
                            </p>
                            {tr.dataValidade && (
                              <p className="text-slate-500 text-[11px]">
                                Reciclagem: {tr.dataValidade} ({calcularDiasParaVencimento(tr.dataValidade) ?? 'N/A'} dias)
                              </p>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 shrink-0">
                            {tr.resultado} {tr.aproveitamentoPercentual ? `(${tr.aproveitamentoPercentual}%)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 4: CHTS & QUALIFICAÇÕES REGULAMENTARES */}
              {aba360 === 'QUALIFICACOES' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" /> Qualificações & CHTs ({colabQualifs.length})
                  </h3>

                  {colabQualifs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
                      Nenhuma qualificação ou CHT associada a este colaborador.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {colabQualifs.map((q) => {
                        const dias = calcularDiasParaVencimento(q.dataValidade);
                        const isVencida = dias !== null && dias < 0;
                        return (
                          <div
                            key={q.id}
                            className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                              isVencida ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900">{q.titulo}</p>
                              <p className="text-slate-600 text-[11px]">
                                {q.emissor} • Reg: <strong>{q.numeroRegistro}</strong> • Escopo: {q.escopo}
                              </p>
                              {q.dataValidade && (
                                <p
                                  className={`text-[11px] font-medium ${
                                    isVencida ? 'text-rose-700 font-bold' : 'text-slate-600'
                                  }`}
                                >
                                  Validade: {q.dataValidade} ({dias} dias)
                                  {q.bloqueiaOperacaoSeVencida && ' • BLOQUEIA OPERAÇÃO SE VENCIDA'}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                                q.status === 'VALIDA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : q.status === 'VENCENDO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {q.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 5: CENTRAL DE VENCIMENTOS DO COLABORADOR */}
              {aba360 === 'VENCIMENTOS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Todos os Vencimentos do Colaborador ({vencimentosColaborador.length})
                    </h3>
                    {onNavigateToExpirations && (
                      <button
                        onClick={onNavigateToExpirations}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Central de Vencimentos SGQ →
                      </button>
                    )}
                  </div>

                  {vencimentosColaborador.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
                      Nenhum item com data de vencimento controlada para este colaborador.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {vencimentosColaborador
                        .slice()
                        .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999))
                        .map((item) => {
                          const isVencido = item.diasRestantes !== null && item.diasRestantes < 0;
                          const isUrgente = item.diasRestantes !== null && item.diasRestantes >= 0 && item.diasRestantes <= 30;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                                isVencido
                                  ? 'bg-rose-50 border-rose-200'
                                  : isUrgente
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">{item.itemDescricao}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold">
                                    {item.tipoOrigem}
                                  </span>
                                </div>
                                <p className="text-slate-600 text-[11px]">
                                  Data Limite: <strong>{item.dataVencimento}</strong>
                                  {item.impactoOperacional && ` • Impacto: ${item.impactoOperacional}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    isVencido
                                      ? 'bg-rose-100 text-rose-800'
                                      : isUrgente
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.diasRestantes !== null
                                    ? isVencido
                                      ? `Vencido há ${Math.abs(item.diasRestantes)}d`
                                      : `Em ${item.diasRestantes} dias`
                                    : 'Sem data'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 6: HISTÓRICO, AUDITORIA & DOCUMENTOS */}
              {aba360 === 'HISTORICO' && (
                <div className="space-y-5">
                  {/* Trilha de Auditoria e Governança RBAC 145.161 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-blue-600" /> Trilha de Auditoria & Conformidade Regulatória
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-600">Cadastro Criado:</span>
                        <span className="font-medium text-slate-800">
                          {new Date(selectedColaborador.createdAt).toLocaleString('pt-BR')} por{' '}
                          <strong>{selectedColaborador.criadoPor || 'SGQ'}</strong>
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                        <span className="text-slate-600">Última Atualização Registrada:</span>
                        <span className="font-medium text-slate-800">
                          {new Date(selectedColaborador.updatedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {selectedColaborador.inativadoEm && (
                        <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 space-y-1">
                          <p className="font-semibold">Registro de Inativação:</p>
                          <p>
                            Em {new Date(selectedColaborador.inativadoEm).toLocaleString('pt-BR')} por{' '}
                            <strong>{selectedColaborador.inativadoPor || 'SGQ'}</strong>.
                          </p>
                          {selectedColaborador.motivoInativacao && (
                            <p className="text-[11px] italic">Motivo: {selectedColaborador.motivoInativacao}</p>
                          )}
                        </div>
                      )}

                      {selectedColaborador.reativadoEm && (
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 space-y-1">
                          <p className="font-semibold">Registro de Reativação:</p>
                          <p>
                            Em {new Date(selectedColaborador.reativadoEm).toLocaleString('pt-BR')} por{' '}
                            <strong>{selectedColaborador.reativadoPor || 'SGQ'}</strong>.
                          </p>
                          {selectedColaborador.motivoReativacao && (
                            <p className="text-[11px] italic">Motivo: {selectedColaborador.motivoReativacao}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documentos e Evidências Objetivas */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" /> Documentos & Evidências Objetivas ({colabDocs.length})
                    </h3>

                    {colabDocs.length === 0 ? (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
                        Nenhum documento ou certificado anexado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {colabDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                          >
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-900">{doc.titulo}</p>
                              <p className="text-[11px] text-slate-500">
                                {doc.tipoDocumento} • Emissor: {doc.emissor}
                                {doc.hashArquivo && ` • Hash SHA-256: ${doc.hashArquivo.substring(0, 12)}...`}
                              </p>
                            </div>
                            <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              {doc.statusValidade}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: MATRIZ DE COMPETÊNCIAS GERAL (PESSOAS x COMPETÊNCIAS)               */}
      {/* ========================================================================= */}
      {activeSubTab === 'MATRIZ' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Matriz de Competências & Habilitação Técnica</h2>
              <p className="text-sm text-slate-600">
                Visualização cruzada dos níveis de proficiência (1 a 5) atribuídos por colaborador ativo.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Qualificado (Nível 3+)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-400 inline-block" /> Em Desenvolvimento (Nível 1-2)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-200 inline-block" /> Não Mapeado
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-semibold sticky left-0 bg-slate-50 z-10 w-64">
                    Colaborador / Função
                  </th>
                  <th className="p-3 font-semibold w-24">Setor</th>
                  {competencies.map((c) => (
                    <th key={c.id} className="p-3 font-semibold text-center border-l border-slate-200 min-w-[140px]">
                      <div className="font-mono text-[10px] text-slate-500">{c.codigo}</div>
                      <div className="truncate max-w-[140px]" title={c.nome}>
                        {c.nome}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {persons.filter((p) => p.status === 'ATIVO').map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                      <div>{p.nome}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {p.matricula} • {p.funcao}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">{p.setor}</td>
                    {competencies.map((c) => {
                      const vinculo = personCompetencies.find(
                        (pc) => pc.colaboradorId === p.id && pc.competenciaId === c.id
                      );
                      const nivel = vinculo ? vinculo.nivelAtual : 0;

                      return (
                        <td key={c.id} className="p-3 text-center border-l border-slate-200">
                          {nivel > 0 ? (
                            <span
                              className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-bold ${
                                nivel >= 3
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              Nível {nivel}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CATÁLOGO DE COMPETÊNCIAS DEFINIDAS                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'CATALOGO' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Catálogo de Competências Técnicas e Operacionais</h2>
              <p className="text-sm text-slate-600">
                Requisitos e competências mapeadas para cada setor da organização aeronáutica.
              </p>
            </div>
            <button
              onClick={() => {
                setCompetenciaParaEditar(null);
                setModalCompetenciaOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Competência
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencies.map((comp) => (
              <div
                key={comp.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                        {comp.codigo}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          comp.criticidade === 'CRITICA'
                            ? 'bg-rose-100 text-rose-800'
                            : comp.criticidade === 'ALTA'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {comp.criticidade}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mt-1">{comp.nome}</h3>
                  </div>

                  <button
                    onClick={() => {
                      setCompetenciaParaEditar(comp);
                      setModalCompetenciaOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{comp.descricao}</p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <p>
                    <strong className="text-slate-700">Setores Aplicáveis:</strong>{' '}
                    {comp.setoresAplicaveis.join(', ')}
                  </p>
                  <p>
                    <strong className="text-slate-700">Funções:</strong> {comp.funcoesAplicaveis.join(', ')}
                  </p>
                  {comp.qualificacaoObrigatoria && (
                    <p className="text-amber-800 font-medium">
                      Exige Qualificação: {comp.qualificacaoObrigatoria}
                    </p>
                  )}
                </div>

                {/* Níveis de proficiência definidos */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Escala de Proficiência (1 a 5)
                  </p>
                  <div className="space-y-1">
                    {(comp.niveisDefinidos || []).map((nd) => (
                      <div key={nd.nivel} className="text-[11px] flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 w-14 shrink-0">Nível {nd.nivel}:</span>
                        <span className="text-slate-600">{nd.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR COLABORADOR                                          */}
      {/* ========================================================================= */}
      {modalColaboradorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {colaboradorParaEditar ? 'Editar Colaborador' : 'Novo Colaborador (SGQ Pessoas)'}
              </h3>
              <button
                onClick={() => setModalColaboradorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveColaborador} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    name="nome"
                    required
                    defaultValue={colaboradorParaEditar?.nome || ''}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Matrícula Interna *</label>
                  <input
                    type="text"
                    name="matricula"
                    required
                    defaultValue={colaboradorParaEditar?.matricula || ''}
                    placeholder="Ex: IMP-1042"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Setor Operacional *</label>
                  <select
                    name="setor"
                    required
                    defaultValue={colaboradorParaEditar?.setor || 'Operações de Manutenção'}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Operações de Manutenção">Operações de Manutenção</option>
                    <option value="Qualidade">Qualidade</option>
                    <option value="Suprimentos / Almoxarifado">Suprimentos / Almoxarifado</option>
                    <option value="Engenharia / Publicações Técnicas">Engenharia / Publicações Técnicas</option>
                    <option value="REC - Manutenção / Calibração">REC - Manutenção / Calibração</option>
                    <option value="Treinamento / RH Operacional">Treinamento / RH Operacional</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Função Primária *</label>
                  <select
                    name="funcao"
                    required
                    defaultValue={colaboradorParaEditar?.funcao || 'Mecânico'}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Mecânico">Mecânico</option>
                    <option value="Inspetor de Qualidade">Inspetor de Qualidade</option>
                    <option value="Inspetor">Inspetor</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Almoxarife">Almoxarife</option>
                    <option value="Técnico de Planejamento">Técnico de Planejamento</option>
                    <option value="Especialista">Especialista</option>
                    <option value="Instrutor">Instrutor</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cargo / Especialidade Técnica</label>
                  <input
                    type="text"
                    name="cargoOperacional"
                    defaultValue={colaboradorParaEditar?.cargoOperacional || ''}
                    placeholder="Ex: Mecânico de Célula e GMP"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status do Colaborador *</label>
                  <select
                    name="status"
                    required
                    defaultValue={colaboradorParaEditar?.status || 'ATIVO'}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="ATIVO">ATIVO (Disponível)</option>
                    <option value="EM_TREINAMENTO">EM TREINAMENTO (Capacitação / Formação)</option>
                    <option value="AFASTADO">AFASTADO (Licença / Atestado)</option>
                    <option value="SUSPENSO">SUSPENSO (Averiguação / Medida)</option>
                    <option value="RESTRITO">RESTRITO (Atividades Limitadas)</option>
                    <option value="INATIVO">INATIVO</option>
                    <option value="DESLIGADO">DESLIGADO</option>
                    <option value="OUTRO">OUTRO (Especificar abaixo)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Customizado / Detalhamento</label>
                  <input
                    type="text"
                    name="statusCustomizado"
                    defaultValue={colaboradorParaEditar?.statusCustomizado || ''}
                    placeholder="Ex: Em processo de homologação, Cedido, etc."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Admissão</label>
                  <input
                    type="date"
                    name="dataAdmissao"
                    defaultValue={colaboradorParaEditar?.dataAdmissao || ''}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">E-mail / Contato Corporativo</label>
                  <input
                    type="email"
                    name="contatoCorporativo"
                    defaultValue={colaboradorParaEditar?.contatoCorporativo || ''}
                    placeholder="carlos.silva@impactoaviation.com.br"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Seção de Restrição Operacional */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="possuiRestricao"
                    name="possuiRestricao"
                    defaultChecked={colaboradorParaEditar?.restricaoOperacional?.possuiRestricao || false}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="possuiRestricao" className="font-bold text-amber-900 cursor-pointer">
                    Colaborador com Restrição Operacional Ativa
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-amber-200/60">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Motivo da Restrição</label>
                    <input
                      type="text"
                      name="motivoRestricao"
                      defaultValue={colaboradorParaEditar?.restricaoOperacional?.motivo || ''}
                      placeholder="Ex: Licença médica temporária, restrição para trabalho em altura, etc."
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Início da Restrição</label>
                      <input
                        type="date"
                        name="dataInicioRestricao"
                        defaultValue={colaboradorParaEditar?.restricaoOperacional?.dataInicio || ''}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Término Previsto</label>
                      <input
                        type="date"
                        name="dataFimRestricao"
                        defaultValue={colaboradorParaEditar?.restricaoOperacional?.dataFim || ''}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="impedeExecucao"
                      name="impedeExecucao"
                      defaultChecked={colaboradorParaEditar?.restricaoOperacional?.impedeExecucao || false}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="impedeExecucao" className="font-semibold text-rose-900 cursor-pointer">
                      BLOQUEIO OPERACIONAL — Esta restrição IMPEDE a execução/assinatura de atividades técnicas
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observações Gerais</label>
                <textarea
                  name="observacoes"
                  rows={2}
                  defaultValue={colaboradorParaEditar?.observacoes || ''}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalColaboradorOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR COMPETÊNCIA                                          */}
      {/* ========================================================================= */}
      {modalCompetenciaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {competenciaParaEditar ? 'Editar Competência' : 'Cadastrar Nova Competência'}
              </h3>
              <button
                onClick={() => setModalCompetenciaOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompetencia} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Código da Competência *</label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    defaultValue={competenciaParaEditar?.codigo || ''}
                    placeholder="Ex: COMP-CEL-01"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Criticidade *</label>
                  <select
                    name="criticidade"
                    required
                    defaultValue={competenciaParaEditar?.criticidade || 'ALTA'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CRITICA">CRÍTICA (Impacta Aeronavegabilidade)</option>
                    <option value="ALTA">ALTA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="BAIXA">BAIXA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Título da Competência *</label>
                <input
                  type="text"
                  name="nome"
                  required
                  defaultValue={competenciaParaEditar?.nome || ''}
                  placeholder="Ex: Inspeção Visual e Estrutural de Célula"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descrição e Escopo Técnico *</label>
                <textarea
                  name="descricao"
                  required
                  rows={2}
                  defaultValue={competenciaParaEditar?.descricao || ''}
                  placeholder="Detalhamento das habilidades requeridas conforme manual..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Setores Aplicáveis (separados por vírgula)
                </label>
                <input
                  type="text"
                  name="setoresAplicaveis"
                  defaultValue={competenciaParaEditar?.setoresAplicaveis?.join(', ') || 'Operações de Manutenção, Qualidade'}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Funções Aplicáveis (separadas por vírgula)
                </label>
                <input
                  type="text"
                  name="funcoesAplicaveis"
                  defaultValue={competenciaParaEditar?.funcoesAplicaveis?.join(', ') || 'Mecânico, Inspetor'}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Qualificação Mandatória Exigida (se houver)</label>
                <input
                  type="text"
                  name="qualificacaoObrigatoria"
                  defaultValue={competenciaParaEditar?.qualificacaoObrigatoria || ''}
                  placeholder="Ex: CHT ANAC Célula, Certificado NDT Nível II"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalCompetenciaOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Salvar Competência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ATRIBUIR COMPETÊNCIA A COLABORADOR                                 */}
      {/* ========================================================================= */}
      {modalAtribuirCompOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Atribuir Nível de Competência</h3>
              <button
                onClick={() => setModalAtribuirCompOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador</label>
                <select
                  value={atribuirCompData.colaboradorId}
                  onChange={(e) =>
                    setAtribuirCompData({ ...atribuirCompData, colaboradorId: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.matricula}) — {p.funcao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Competência</label>
                <select
                  value={atribuirCompData.competenciaId}
                  onChange={(e) =>
                    setAtribuirCompData({ ...atribuirCompData, competenciaId: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {competencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nível de Proficiência Concedido: {atribuirCompData.nivel} de 5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={atribuirCompData.nivel}
                  onChange={(e) =>
                    setAtribuirCompData({ ...atribuirCompData, nivel: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>1 (Teórico)</span>
                  <span>2 (Supervisionado)</span>
                  <span>3 (Autônomo)</span>
                  <span>4 (Supervisor)</span>
                  <span>5 (Especialista)</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Data de Validade (opcional)</label>
                <input
                  type="date"
                  value={atribuirCompData.validade}
                  onChange={(e) =>
                    setAtribuirCompData({ ...atribuirCompData, validade: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observações / Justificativa</label>
                <textarea
                  rows={2}
                  value={atribuirCompData.observacoes}
                  onChange={(e) =>
                    setAtribuirCompData({ ...atribuirCompData, observacoes: e.target.value })
                  }
                  placeholder="Avaliação técnica realizada em hangar conforme procedimento..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalAtribuirCompOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarAtribuicaoComp}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Salvar Atribuição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INATIVAÇÃO LÓGICA DE COLABORADOR                                 */}
      {/* ========================================================================= */}
      {modalInativarOpen && colaboradorParaInativar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <PowerOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Inativar Colaborador (Lógica)</h3>
                  <p className="text-xs text-slate-500">Preservação Histórica Conforme RBAC 145</p>
                </div>
              </div>
              <button
                onClick={() => setModalInativarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800 text-sm">{colaboradorParaInativar.nome}</p>
              <p className="text-slate-600">
                Matrícula: <strong className="font-mono">{colaboradorParaInativar.matricula}</strong> • Setor:{' '}
                <strong>{colaboradorParaInativar.setor}</strong> • Função:{' '}
                <strong>{colaboradorParaInativar.funcao}</strong>
              </p>
              <div className="pt-2 border-t border-slate-200 flex items-center gap-3 text-slate-500">
                <span>
                  <strong>{personCompetencies.filter((c) => c.colaboradorId === colaboradorParaInativar.id).length}</strong> comps
                </span>
                <span>
                  <strong>{qualifications.filter((q) => q.colaboradorId === colaboradorParaInativar.id).length}</strong> qualifs
                </span>
                <span>
                  <strong>{trainingRecords.filter((t) => t.colaboradorId === colaboradorParaInativar.id).length}</strong> treinos
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                O que acontece na inativação?
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                O colaborador terá seu status alterado para <strong>INATIVO</strong> e não poderá ser escalado para
                atividades técnicas operacionais. <strong>Todo o histórico passado</strong> de qualificações, horas de
                treinamento e registros de manutenção permanecerá intacto para fins de rastreabilidade e auditoria da ANAC.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">
                Motivo / Justificativa da Inativação *
              </label>
              <textarea
                rows={3}
                value={motivoInativacao}
                onChange={(e) => setMotivoInativacao(e.target.value)}
                placeholder="Ex: Desligamento formal da empresa, transferência de unidade, afastamento definitivo..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalInativarOpen(false)}
                disabled={isSubmittingAcao}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInativar}
                disabled={isSubmittingAcao || !motivoInativacao.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingAcao ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Confirmar Inativação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REATIVAÇÃO DE COLABORADOR                                        */}
      {/* ========================================================================= */}
      {modalReativarOpen && colaboradorParaReativar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reativar Colaborador</h3>
                  <p className="text-xs text-slate-500">Retorno ao Quadro Ativo de Pessoal Técnico</p>
                </div>
              </div>
              <button
                onClick={() => setModalReativarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-800 text-sm">{colaboradorParaReativar.nome}</p>
              <p className="text-slate-600">
                Matrícula: <strong className="font-mono">{colaboradorParaReativar.matricula}</strong> • Setor:{' '}
                <strong>{colaboradorParaReativar.setor}</strong>
              </p>
              {colaboradorParaReativar.inativadoEm && (
                <p className="text-slate-500 text-[11px]">
                  Inativado anteriormente em:{' '}
                  {new Date(colaboradorParaReativar.inativadoEm).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">
                Justificativa / Observação da Reativação
              </label>
              <textarea
                rows={2}
                value={motivoReativacao}
                onChange={(e) => setMotivoReativacao(e.target.value)}
                placeholder="Ex: Retorno de afastamento médico, recontratação, reativação de escopo..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalReativarOpen(false)}
                disabled={isSubmittingAcao}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReativar}
                disabled={isSubmittingAcao}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingAcao ? (
                  <span>Processando...</span>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirmar Reativação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXCLUSÃO SEGURA COM ANÁLISE DE DEPENDÊNCIAS                       */}
      {/* ========================================================================= */}
      {modalExcluirOpen && colaboradorParaExcluir && analiseDependenciasColab && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    analiseDependenciasColab.podeExcluir
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {analiseDependenciasColab.podeExcluir ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <AlertOctagon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {analiseDependenciasColab.podeExcluir
                      ? 'Confirmar Exclusão de Registro'
                      : 'Exclusão Bloqueada por Requisito RBAC 145'}
                  </h3>
                  <p className="text-xs text-slate-500">Verificação de Integridade e Histórico SGQ</p>
                </div>
              </div>
              <button
                onClick={() => setModalExcluirOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-800 text-sm">{colaboradorParaExcluir.nome}</p>
              <p className="text-slate-600">
                Matrícula: <strong className="font-mono">{colaboradorParaExcluir.matricula}</strong> • Setor:{' '}
                <strong>{colaboradorParaExcluir.setor}</strong> • Status:{' '}
                <strong>{colaboradorParaExcluir.status}</strong>
              </p>
            </div>

            {!analiseDependenciasColab.podeExcluir ? (
              <div className="space-y-3 text-xs">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    Exclusão Física Não Permitida
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Este colaborador possui <strong>{analiseDependenciasColab.totalVinculos || analiseDependenciasColab.motivosBloqueio?.length || analiseDependenciasColab.detalhes?.length || 0} vínculo(s) histórico(s)</strong> no SGQ
                    que impedem a exclusão física definitiva, pois causariam quebra de rastreabilidade regulatória:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] font-medium text-rose-800">
                    {(analiseDependenciasColab.detalhes || analiseDependenciasColab.motivosBloqueio || []).map((det, idx) => (
                      <li key={idx}>{det}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-rose-700 pt-1 border-t border-rose-200/60">
                    💡 <strong>Solução Normativa:</strong> Utilize a <strong>Inativação Lógica</strong>. O colaborador
                    deixará de figurar nas escalas ativas, mas todos os registros permanecerão válidos perante a autoridade.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalExcluirOpen(false)}
                    className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalExcluirOpen(false);
                      handleOpenInativar(colaboradorParaExcluir);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Inativar em vez de Excluir</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Atenção: Ação Irreversível
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Nenhum vínculo ou histórico foi encontrado para este colaborador (registro sem treinamentos ou qualificações).
                    A exclusão removerá definitivamente o cadastro.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">
                    Motivo da Exclusão Definitiva *
                  </label>
                  <input
                    type="text"
                    value={motivoExclusao}
                    onChange={(e) => setMotivoExclusao(e.target.value)}
                    placeholder="Ex: Cadastro duplicado por engano de digitação"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalExcluirOpen(false)}
                    disabled={isSubmittingAcao}
                    className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExcluir}
                    disabled={isSubmittingAcao}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingAcao ? (
                      <span>Excluindo...</span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirmar Exclusão</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
