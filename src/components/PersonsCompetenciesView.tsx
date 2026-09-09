import React, { useState, useMemo } from 'react';
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
} from '../types';
import {
  savePerson,
  deletePerson,
  saveCompetency,
  savePersonCompetency,
} from '../services/firebase/competenciesFirestore';
import {
  verificarPodeExecutarAtividade,
  calcularDiasParaVencimento,
} from '../services/competenciesEngine';

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
  onNavigateToTrainings?: () => void;
  onNavigateToExpirations?: () => void;
}

export const PersonsCompetenciesView: React.FC<PersonsCompetenciesViewProps> = ({
  organizationId,
  userProfile,
  persons,
  competencies,
  personCompetencies,
  qualifications,
  trainingRecords,
  documents,
  activities,
  onNavigateToTrainings,
  onNavigateToExpirations,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'COLABORADORES' | 'MATRIZ' | 'CATALOGO'>('COLABORADORES');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSetor, setSelectedSetor] = useState('TODOS');
  const [selectedStatus, setSelectedStatus] = useState('TODOS');
  const [filterRestricao, setFilterRestricao] = useState(false);

  // Colaborador Selecionado para Visão 360°
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorPessoa | null>(null);
  const [modalColaboradorOpen, setModalColaboradorOpen] = useState(false);
  const [colaboradorParaEditar, setColaboradorParaEditar] = useState<ColaboradorPessoa | null>(null);

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
      await savePerson(organizationId, colab, userProfile);
      setModalColaboradorOpen(false);
      setColaboradorParaEditar(null);
      if (selectedColaborador?.id === colab.id) {
        setSelectedColaborador(colab);
      }
    } catch (err: any) {
      alert(`Erro ao salvar colaborador: ${err.message}`);
    }
  };

  const handleDeleteColaborador = async (colab: ColaboradorPessoa) => {
    if (!confirm(`Tem certeza que deseja excluir ${colab.nome} (${colab.matricula})? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deletePerson(organizationId, colab.id, userProfile);
      if (selectedColaborador?.id === colab.id) {
        setSelectedColaborador(null);
      }
    } catch (err: any) {
      alert(`Erro ao excluir colaborador: ${err.message}`);
    }
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
                  className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-slate-50 text-slate-700"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="AFASTADO">Afastado</option>
                  <option value="INATIVO">Inativo</option>
                  <option value="DESLIGADO">Desligado</option>
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
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              colab.status === 'ATIVO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : colab.status === 'AFASTADO'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {colab.status}
                          </span>

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
                        <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-1 text-blue-600 font-medium">
                          <span>Visão 360°</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna da Direita: Painel 360° do Colaborador */}
          {selectedColaborador && (
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Header 360° */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedColaborador.nome}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {selectedColaborador.matricula}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedColaborador.status === 'ATIVO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedColaborador.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedColaborador.funcao} • {selectedColaborador.setor} •{' '}
                    {selectedColaborador.cargoOperacional || 'Sem cargo específico'}
                  </p>
                  {selectedColaborador.contatoCorporativo && (
                    <p className="text-xs text-slate-500 mt-0.5">{selectedColaborador.contatoCorporativo}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setColaboradorParaEditar(selectedColaborador);
                      setModalColaboradorOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                    title="Editar Colaborador"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteColaborador(selectedColaborador)}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Excluir Colaborador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedColaborador(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
                    title="Fechar painel 360°"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

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

              {/* Seções em Mini-Abas 360° */}
              <div className="space-y-4">
                {/* 1. Competências Mapeadas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Competências Registradas ({colabComps.length})
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
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg">
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
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-200 px-1 py-0.5 rounded">
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
                                  • Validade: {cc.dataValidade} (
                                  {calcularDiasParaVencimento(cc.dataValidade) ?? 'N/A'} dias)
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
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

                {/* 2. Qualificações e Habilitações */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" /> Qualificações & CHTs ({colabQualifs.length})
                  </h3>
                  {colabQualifs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg">
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
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
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

                {/* 3. Treinamentos Concluídos */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-sky-600" /> Treinamentos & Reciclagens ({colabTreinos.length})
                  </h3>
                  {colabTreinos.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg">
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
                              Realizado em: {tr.dataRealizacao} • Carga: {tr.cargaHoraria}h • Instrutor: {tr.instrutor}
                            </p>
                            {tr.dataValidade && (
                              <p className="text-slate-500 text-[11px]">
                                Reciclagem: {tr.dataValidade} (
                                {calcularDiasParaVencimento(tr.dataValidade) ?? 'N/A'} dias)
                              </p>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            {tr.resultado} {tr.aproveitamentoPercentual ? `(${tr.aproveitamentoPercentual}%)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Documentos e Evidências */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" /> Documentos & Evidências Objetivas ({colabDocs.length})
                  </h3>
                  {colabDocs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg">
                      Nenhum documento ou certificado anexado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {colabDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-900">{doc.titulo}</p>
                            <p className="text-[11px] text-slate-500">
                              {doc.tipoDocumento} • Emissor: {doc.emissor}
                              {doc.hashArquivo && ` • Hash SHA-256: ${doc.hashArquivo.substring(0, 12)}...`}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {doc.statusValidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                    <option value="AFASTADO">AFASTADO (Licença/Atestado)</option>
                    <option value="INATIVO">INATIVO</option>
                    <option value="DESLIGADO">DESLIGADO</option>
                  </select>
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
    </div>
  );
};
