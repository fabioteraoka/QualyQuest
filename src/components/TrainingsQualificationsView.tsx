import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Award,
  FileText,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Calendar,
  Building,
  User,
  X,
  Edit,
  Trash2,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  DocumentoEvidenciaPessoa,
  UserProfile,
  TipoTreinamento,
  TipoQualificacao,
  StatusQualificacao,
} from '../types';
import {
  saveTrainingCourse,
  deleteTrainingCourse,
  saveTrainingRecord,
  deleteTrainingRecord,
  saveQualification,
  deleteQualification,
  savePersonDocument,
  deletePersonDocument,
} from '../services/firebase/competenciesFirestore';
import {
  calcularDiasParaVencimento,
  calcularDataValidadeComTolerancia,
} from '../services/competenciesEngine';

interface TrainingsQualificationsViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  persons: ColaboradorPessoa[];
  trainingCourses: CursoTreinamento[];
  trainingRecords: RegistroTreinamentoColaborador[];
  qualifications: QualificacaoColaborador[];
  documents: DocumentoEvidenciaPessoa[];
}

export const TrainingsQualificationsView: React.FC<TrainingsQualificationsViewProps> = ({
  organizationId,
  userProfile,
  persons,
  trainingCourses,
  trainingRecords,
  qualifications,
  documents,
}) => {
  const [activeTab, setActiveTab] = useState<'QUALIFICACOES' | 'TREINAMENTOS_HISTORICO' | 'CURSOS' | 'DOCUMENTOS'>('QUALIFICACOES');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  // Modal Curso
  const [modalCursoOpen, setModalCursoOpen] = useState(false);
  const [cursoParaEditar, setCursoParaEditar] = useState<CursoTreinamento | null>(null);

  // Modal Registro Treinamento
  const [modalTreinoOpen, setModalTreinoOpen] = useState(false);
  const [treinoParaEditar, setTreinoParaEditar] = useState<RegistroTreinamentoColaborador | null>(null);

  // Modal Qualificação / CHT
  const [modalQualifOpen, setModalQualifOpen] = useState(false);
  const [qualifParaEditar, setQualifParaEditar] = useState<QualificacaoColaborador | null>(null);

  // Modal Documento
  const [modalDocOpen, setModalDocOpen] = useState(false);
  const [docParaEditar, setDocParaEditar] = useState<DocumentoEvidenciaPessoa | null>(null);

  // Qualificações filtradas
  const qualificacoesFiltradas = useMemo(() => {
    return qualifications.filter((q) => {
      const matchSearch =
        searchTerm === '' ||
        q.colaboradorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.numeroRegistro && q.numeroRegistro.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.escopo && q.escopo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTipo = filterTipo === 'TODOS' || q.tipo === filterTipo;
      const matchStatus = filterStatus === 'TODOS' || q.status === filterStatus;

      return matchSearch && matchTipo && matchStatus;
    });
  }, [qualifications, searchTerm, filterTipo, filterStatus]);

  // Treinamentos realizados filtrados
  const treinosFiltrados = useMemo(() => {
    return trainingRecords.filter((t) => {
      const matchSearch =
        searchTerm === '' ||
        t.colaboradorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.treinamentoTitulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.instrutor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.numeroCertificado && t.numeroCertificado.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchResultado = filterStatus === 'TODOS' || t.resultado === filterStatus;

      return matchSearch && matchResultado;
    });
  }, [trainingRecords, searchTerm, filterStatus]);

  // Handlers para Cursos
  const handleSaveCurso = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const recorrente = formData.get('recorrente') === 'on';

    const curso: CursoTreinamento = {
      id: cursoParaEditar?.id || `curso-${Date.now()}`,
      organizationId,
      codigo: String(formData.get('codigo') || '').trim().toUpperCase(),
      titulo: String(formData.get('titulo') || '').trim(),
      ementa: String(formData.get('descricao') || '').trim(),
      tipo: (formData.get('tipo') as TipoTreinamento) || 'REGULATORIO',
      modalidade: (formData.get('modalidade') as any) || 'PRESENCIAL',
      cargaHorariaHoras: Number(formData.get('cargaHorariaHoras') || 8),
      recorrente,
      periodicidadeMeses: recorrente ? Number(formData.get('periodicidadeMeses') || 24) : undefined,
      toleranciaDias: Number(formData.get('toleranciaDias') || 0),
      origemPrazo: (formData.get('origemPrazo') as any) || 'REGULAMENTO',
      competenciasDesenvolvidasIds: [],
      status: 'ATIVO',
      createdAt: cursoParaEditar?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      criadoPorUid: userProfile?.uid || 'sgq',
    };

    try {
      await saveTrainingCourse(organizationId, curso, userProfile);
      setModalCursoOpen(false);
      setCursoParaEditar(null);
    } catch (err: any) {
      alert(`Erro ao salvar curso: ${err.message}`);
    }
  };

  const handleDeleteCurso = async (id: string) => {
    if (!confirm('Deseja excluir este curso do catálogo?')) return;
    try {
      await deleteTrainingCourse(organizationId, id, userProfile);
    } catch (err: any) {
      alert(`Erro ao excluir curso: ${err.message}`);
    }
  };

  // Handlers para Treinamentos Realizados
  const handleSaveTreino = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const colabId = String(formData.get('colaboradorId'));
    const cursoId = String(formData.get('treinamentoId'));
    const colab = persons.find((p) => p.id === colabId);
    const curso = trainingCourses.find((c) => c.id === cursoId);

    if (!colab || !curso) {
      alert('Selecione um colaborador e um curso válidos.');
      return;
    }

    const dataRealizacao = String(formData.get('dataRealizacao'));
    let dataValidade = String(formData.get('dataValidade') || '');

    // Se o curso é recorrente e não foi preenchida validade, calcula automaticamente
    if (!dataValidade && curso.recorrente && curso.periodicidadeMeses) {
      dataValidade = calcularDataValidadeComTolerancia(
        dataRealizacao,
        curso.periodicidadeMeses,
        curso.toleranciaDias || 0
      );
    }

    const rec: RegistroTreinamentoColaborador = {
      id: treinoParaEditar?.id || `tr-${Date.now()}`,
      organizationId,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      colaboradorMatricula: colab.matricula,
      treinamentoId: curso.id,
      treinamentoCodigo: curso.codigo,
      treinamentoTitulo: curso.titulo,
      dataRealizacao,
      dataValidade: dataValidade || undefined,
      cargaHoraria: Number(formData.get('cargaHoraria') || curso.cargaHorariaHoras),
      entidadeInstrutora: String(formData.get('entidadeInstrutora') || '').trim(),
      instrutor: String(formData.get('instrutor') || '').trim(),
      resultado: (formData.get('resultado') as any) || 'APROVADO',
      aproveitamentoPercentual: Number(formData.get('aproveitamentoPercentual') || 100),
      numeroCertificado: String(formData.get('numeroCertificado') || '').trim() || undefined,
      observacoes: String(formData.get('observacoes') || '').trim() || undefined,
      validadoPorSGQNome: userProfile?.displayName || 'SGQ',
      validadoPorSGQUid: userProfile?.uid || 'sgq',
      dataValidacaoSGQ: new Date().toISOString(),
      createdAt: treinoParaEditar?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveTrainingRecord(organizationId, rec, userProfile);
      setModalTreinoOpen(false);
      setTreinoParaEditar(null);
    } catch (err: any) {
      alert(`Erro ao lançar treinamento: ${err.message}`);
    }
  };

  const handleDeleteTreino = async (id: string) => {
    if (!confirm('Deseja excluir este registro de treinamento?')) return;
    try {
      await deleteTrainingRecord(organizationId, id, userProfile);
    } catch (err: any) {
      alert(`Erro ao excluir registro: ${err.message}`);
    }
  };

  // Handlers para Qualificações / CHTs
  const handleSaveQualif = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const colabId = String(formData.get('colaboradorId'));
    const colab = persons.find((p) => p.id === colabId);
    if (!colab) {
      alert('Selecione um colaborador.');
      return;
    }

    const bloqueia = formData.get('bloqueiaOperacaoSeVencida') === 'on';
    const dataValidade = String(formData.get('dataValidade') || '');

    const qual: QualificacaoColaborador = {
      id: qualifParaEditar?.id || `qual-${Date.now()}`,
      organizationId,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      colaboradorMatricula: colab.matricula,
      tipo: (formData.get('tipo') as TipoQualificacao) || 'CHT_ANAC',
      titulo: String(formData.get('titulo') || '').trim(),
      numeroRegistro: String(formData.get('numeroRegistro') || '').trim(),
      emissor: String(formData.get('emissor') || 'ANAC').trim(),
      escopo: String(formData.get('escopo') || '').trim(),
      dataEmissao: String(formData.get('dataEmissao') || ''),
      dataValidade: dataValidade || undefined,
      possuiValidade: Boolean(dataValidade),
      status: (formData.get('status') as StatusQualificacao) || 'VALIDA',
      bloqueiaOperacaoSeVencida: bloqueia,
      observacoes: String(formData.get('observacoes') || '').trim() || undefined,
      responsavelValidacaoNome: userProfile?.displayName || 'SGQ',
      responsavelValidacaoUid: userProfile?.uid || 'sgq',
      dataValidacao: new Date().toISOString(),
      createdAt: qualifParaEditar?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveQualification(organizationId, qual, userProfile);
      setModalQualifOpen(false);
      setQualifParaEditar(null);
    } catch (err: any) {
      alert(`Erro ao salvar qualificação: ${err.message}`);
    }
  };

  const handleDeleteQualif = async (id: string) => {
    if (!confirm('Deseja excluir esta qualificação?')) return;
    try {
      await deleteQualification(organizationId, id, userProfile);
    } catch (err: any) {
      alert(`Erro ao excluir qualificação: ${err.message}`);
    }
  };

  // Handlers para Documentos
  const handleSaveDoc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const colabId = String(formData.get('colaboradorId'));
    const colab = persons.find((p) => p.id === colabId);
    if (!colab) {
      alert('Selecione um colaborador.');
      return;
    }

    const dataValidade = String(formData.get('dataValidade') || '');

    const docItem: DocumentoEvidenciaPessoa = {
      id: docParaEditar?.id || `doc-${Date.now()}`,
      organizationId,
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      tipoDocumento: (formData.get('tipoDocumento') as any) || 'CERTIFICADO',
      titulo: String(formData.get('titulo') || '').trim(),
      emissor: String(formData.get('emissor') || '').trim(),
      dataEmissao: String(formData.get('dataEmissao') || ''),
      dataValidade: dataValidade || undefined,
      possuiValidade: Boolean(dataValidade),
      statusValidade: 'VALIDO',
      observacoes: String(formData.get('descricao') || '').trim() || undefined,
      hashArquivo: `sha256_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
      registradoPorUid: userProfile?.uid || 'sgq',
      createdAt: docParaEditar?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePersonDocument(organizationId, docItem, userProfile);
      setModalDocOpen(false);
      setDocParaEditar(null);
    } catch (err: any) {
      alert(`Erro ao salvar documento: ${err.message}`);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Deseja excluir este documento?')) return;
    try {
      await deletePersonDocument(organizationId, id, userProfile);
    } catch (err: any) {
      alert(`Erro ao excluir documento: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-100 text-sky-800 uppercase tracking-wider">
              SGQ Aeronáutico — Habilitações & Capacitação
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Treinamentos, CHTs & Qualificações Técnicas</h1>
          <p className="text-sm text-slate-600">
            Controle de CHTs ANAC, autorizações operacionais (RTS, RII, NDT) e histórico de treinamentos com cálculo de validade e bloqueio operacional.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setQualifParaEditar(null);
              setModalQualifOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Shield className="w-4 h-4" /> Nova Habilitação / CHT
          </button>
          <button
            onClick={() => {
              setTreinoParaEditar(null);
              setModalTreinoOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Lançar Treinamento
          </button>
        </div>
      </div>

      {/* Navegação Secundária */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('QUALIFICACOES')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'QUALIFICACOES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-blue-600" /> Habilitações & CHTs ({qualifications.length})
        </button>
        <button
          onClick={() => setActiveTab('TREINAMENTOS_HISTORICO')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'TREINAMENTOS_HISTORICO'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-sky-600" /> Histórico de Treinamentos ({trainingRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('CURSOS')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'CURSOS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" /> Catálogo de Cursos ({trainingCourses.length})
        </button>
        <button
          onClick={() => setActiveTab('DOCUMENTOS')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'DOCUMENTOS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" /> Documentos & Evidências ({documents.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: HABILITAÇÕES, CHTs E AUTORIZAÇÕES INTERNAS (RTS, RII, NDT)         */}
      {/* ========================================================================= */}
      {activeTab === 'QUALIFICACOES' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, registro, CHT ou escopo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2 py-2 bg-slate-50 text-slate-700"
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="CHT_ANAC">CHT ANAC</option>
                <option value="AUTORIZACAO_INTERNA">Autorização Interna (RTS/RII)</option>
                <option value="CERTIFICACAO_NDT">Certificação NDT</option>
                <option value="HABILITACAO_EMPRESA">Habilitação de Empresa</option>
                <option value="LICENCA_ESPECIFICA">Licença Específica</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2 py-2 bg-slate-50 text-slate-700"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="VALIDA">Válida</option>
                <option value="VENCENDO">Vencendo</option>
                <option value="VENCIDA">Vencida</option>
                <option value="SUSPENSA">Suspensa</option>
              </select>
            </div>
          </div>

          {/* Cards / Tabela */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qualificacoesFiltradas.length === 0 ? (
              <div className="col-span-full bg-slate-50 border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-500">
                <Shield className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="font-medium">Nenhuma qualificação ou CHT encontrada.</p>
              </div>
            ) : (
              qualificacoesFiltradas.map((qual) => {
                const dias = calcularDiasParaVencimento(qual.dataValidade);
                const isVencida = dias !== null && dias < 0;
                const isVencendo = dias !== null && dias >= 0 && dias <= 30;

                return (
                  <div
                    key={qual.id}
                    className={`bg-white border rounded-xl p-5 shadow-xs transition flex flex-col justify-between ${
                      isVencida
                        ? 'border-rose-300 bg-rose-50/30'
                        : isVencendo
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {qual.tipo}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm mt-1">{qual.titulo}</h3>
                        </div>

                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            isVencida
                              ? 'bg-rose-100 text-rose-800'
                              : isVencendo
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isVencida ? 'VENCIDA' : qual.status}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        <p>
                          <strong className="text-slate-800">Colaborador:</strong> {qual.colaboradorNome} (
                          {qual.colaboradorMatricula})
                        </p>
                        <p>
                          <strong className="text-slate-800">Registro:</strong> {qual.numeroRegistro} • Emissor:{' '}
                          {qual.emissor}
                        </p>
                        <p>
                          <strong className="text-slate-800">Escopo:</strong> {qual.escopo}
                        </p>
                        {qual.dataValidade && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span
                              className={`font-semibold ${
                                isVencida
                                  ? 'text-rose-700'
                                  : isVencendo
                                  ? 'text-amber-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              Validade: {qual.dataValidade} ({dias !== null ? `${dias} dias` : 'N/A'})
                            </span>
                          </div>
                        )}
                      </div>

                      {qual.bloqueiaOperacaoSeVencida && (
                        <div
                          className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 font-bold ${
                            isVencida
                              ? 'bg-rose-100 text-rose-900 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>BLOQUEIO OPERACIONAL SE VENCIDA</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[11px]">Validado por SGQ</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setQualifParaEditar(qual);
                            setModalQualifOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQualif(qual.id)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: HISTÓRICO DE TREINAMENTOS REALIZADOS                               */}
      {/* ========================================================================= */}
      {activeTab === 'TREINAMENTOS_HISTORICO' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, treinamento ou certificado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-md px-3 py-2 bg-slate-50 text-slate-700"
            >
              <option value="TODOS">Todos os Resultados</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REPROVADO">Reprovado</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Treinamento Realizado</th>
                  <th className="p-3">Data Realização</th>
                  <th className="p-3">Reciclagem / Validade</th>
                  <th className="p-3">Instrutor / Entidade</th>
                  <th className="p-3 text-center">Resultado</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {treinosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                      Nenhum treinamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  treinosFiltrados.map((tr) => {
                    const dias = calcularDiasParaVencimento(tr.dataValidade);
                    const isVencido = dias !== null && dias < 0;

                    return (
                      <tr key={tr.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-medium text-slate-900">
                          <div>{tr.colaboradorNome}</div>
                          <div className="text-[11px] text-slate-500">{tr.colaboradorMatricula}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{tr.treinamentoTitulo}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {tr.treinamentoCodigo} • {tr.cargaHoraria}h
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">{tr.dataRealizacao}</td>
                        <td className="p-3">
                          {tr.dataValidade ? (
                            <span className={isVencido ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                              {tr.dataValidade} ({dias !== null ? `${dias}d` : 'N/A'})
                            </span>
                          ) : (
                            <span className="text-slate-400">Não expira</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          <div>{tr.instrutor}</div>
                          <div className="text-[11px] text-slate-400">{tr.entidadeInstrutora}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              tr.resultado === 'APROVADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tr.resultado} {tr.aproveitamentoPercentual ? `(${tr.aproveitamentoPercentual}%)` : ''}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTreino(tr.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CATÁLOGO DE CURSOS E PROGRAMAS DE TREINAMENTO                      */}
      {/* ========================================================================= */}
      {activeTab === 'CURSOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Catálogo de Cursos & Grade Regulamentar</h2>
              <p className="text-sm text-slate-600">
                Grade de treinamentos obrigatórios conforme RBAC 145 e requisitos de SGQ interno.
              </p>
            </div>
            <button
              onClick={() => {
                setCursoParaEditar(null);
                setModalCursoOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Curso no Catálogo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainingCourses.map((curso) => (
              <div
                key={curso.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                        {curso.codigo}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1">{curso.titulo}</h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {curso.tipo}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{curso.descricao}</p>

                  <div className="text-xs space-y-1 text-slate-500 pt-2 border-t border-slate-100">
                    <p>
                      <strong>Carga Horária:</strong> {curso.cargaHorariaHoras}h •{' '}
                      <strong>Modalidade:</strong> {curso.modalidade}
                    </p>
                    <p>
                      <strong>Recorrência:</strong>{' '}
                      {curso.recorrente ? `A cada ${curso.periodicidadeMeses} meses` : 'Treinamento Único'}
                      {curso.toleranciaDias ? ` (+${curso.toleranciaDias}d tolerância)` : ''}
                    </p>
                    {curso.referenciaRegulamentar && (
                      <p className="text-blue-700 font-medium">
                        Ref: {curso.referenciaRegulamentar} ({curso.origemPrazo})
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-slate-400">
                  <button
                    onClick={() => {
                      setCursoParaEditar(curso);
                      setModalCursoOpen(true);
                    }}
                    className="p-1 hover:text-blue-600 rounded"
                    title="Editar Curso"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCurso(curso.id)}
                    className="p-1 hover:text-rose-600 rounded"
                    title="Excluir Curso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: DOCUMENTOS E EVIDÊNCIAS DE PESSOAS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'DOCUMENTOS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Evidências Objetivas & Documentos de Pessoas</h2>
              <p className="text-sm text-slate-600">
                Certificados, extratos ANAC e comprovações técnicas com hashes criptográficos de integridade.
              </p>
            </div>
            <button
              onClick={() => {
                setDocParaEditar(null);
                setModalDocOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Anexar Evidência Documental
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold text-slate-900 text-sm">{doc.titulo}</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                      {doc.tipoDocumento}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 mt-2">
                    <p>
                      <strong>Colaborador:</strong> {doc.colaboradorNome} ({doc.colaboradorMatricula})
                    </p>
                    <p>
                      <strong>Emissor:</strong> {doc.emissor} • Emissão: {doc.dataEmissao}
                    </p>
                    {doc.dataValidade && <p><strong>Validade:</strong> {doc.dataValidade}</p>}
                    {doc.hashArquivo && (
                      <p className="font-mono text-[10px] text-slate-400 truncate">
                        Hash SHA-256: {doc.hashArquivo}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-medium">Autenticidade Verificada</span>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HABILITAÇÃO / CHT                                                  */}
      {/* ========================================================================= */}
      {modalQualifOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {qualifParaEditar ? 'Editar Habilitação' : 'Nova Habilitação / CHT ANAC'}
              </h3>
              <button
                onClick={() => setModalQualifOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQualif} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador *</label>
                <select
                  name="colaboradorId"
                  required
                  defaultValue={qualifParaEditar?.colaboradorId || persons[0]?.id}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.matricula}) — {p.funcao}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Qualificação *</label>
                  <select
                    name="tipo"
                    required
                    defaultValue={qualifParaEditar?.tipo || 'CHT_ANAC'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CHT_ANAC">CHT ANAC (Carteira de Habilitação Técnica)</option>
                    <option value="AUTORIZACAO_INTERNA">Autorização Interna (RTS / RII)</option>
                    <option value="CERTIFICACAO_NDT">Certificação NDT (Ensaios Não Destrutivos)</option>
                    <option value="HABILITACAO_EMPRESA">Habilitação de Empresa</option>
                    <option value="LICENCA_ESPECIFICA">Licença Específica</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status *</label>
                  <select
                    name="status"
                    required
                    defaultValue={qualifParaEditar?.status || 'VALIDA'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="VALIDA">Válida</option>
                    <option value="VENCENDO">Vencendo</option>
                    <option value="VENCIDA">Vencida</option>
                    <option value="SUSPENSA">Suspensa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Título da Qualificação / CHT *</label>
                <input
                  type="text"
                  name="titulo"
                  required
                  defaultValue={qualifParaEditar?.titulo || ''}
                  placeholder="Ex: CHT ANAC — Mecânico de Manutenção Aeronáutica (CEL/GMP)"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Número de Registro / CANAC *</label>
                  <input
                    type="text"
                    name="numeroRegistro"
                    required
                    defaultValue={qualifParaEditar?.numeroRegistro || ''}
                    placeholder="Ex: CANAC 128450 ou RTS-042"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Entidade Emissora *</label>
                  <input
                    type="text"
                    name="emissor"
                    required
                    defaultValue={qualifParaEditar?.emissor || 'ANAC'}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Escopo Técnico e Modelos Autorizados</label>
                <input
                  type="text"
                  name="escopo"
                  defaultValue={qualifParaEditar?.escopo || ''}
                  placeholder="Ex: Célula, Grupo Motopropulsor, Cessna 208 Caravan, King Air C90"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Emissão</label>
                  <input
                    type="date"
                    name="dataEmissao"
                    defaultValue={qualifParaEditar?.dataEmissao || ''}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Validade (Vencimento)</label>
                  <input
                    type="date"
                    name="dataValidade"
                    defaultValue={qualifParaEditar?.dataValidade || ''}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  id="bloqueiaOperacaoSeVencida"
                  name="bloqueiaOperacaoSeVencida"
                  defaultChecked={qualifParaEditar?.bloqueiaOperacaoSeVencida ?? true}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="bloqueiaOperacaoSeVencida" className="font-bold text-amber-900 cursor-pointer">
                  Bloquear execução/assinatura de atividades se esta habilitação estiver vencida
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalQualifOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Salvar Habilitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LANÇAR TREINAMENTO REALIZADO                                       */}
      {/* ========================================================================= */}
      {modalTreinoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Lançamento de Treinamento Realizado</h3>
              <button
                onClick={() => setModalTreinoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTreino} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador *</label>
                <select
                  name="colaboradorId"
                  required
                  defaultValue={treinoParaEditar?.colaboradorId || persons[0]?.id}
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
                <label className="font-semibold text-slate-700 block mb-1">Treinamento / Curso *</label>
                <select
                  name="treinamentoId"
                  required
                  defaultValue={treinoParaEditar?.treinamentoId || trainingCourses[0]?.id}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {trainingCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} — {c.titulo} ({c.cargaHorariaHoras}h)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Realização *</label>
                  <input
                    type="date"
                    name="dataRealizacao"
                    required
                    defaultValue={treinoParaEditar?.dataRealizacao || new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Reciclagem (Opcional)</label>
                  <input
                    type="date"
                    name="dataValidade"
                    defaultValue={treinoParaEditar?.dataValidade || ''}
                    placeholder="Deixe em branco para calcular automaticamente"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Instrutor Responsável *</label>
                  <input
                    type="text"
                    name="instrutor"
                    required
                    defaultValue={treinoParaEditar?.instrutor || ''}
                    placeholder="Ex: Eng. Marcos Souza"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Entidade / Organização</label>
                  <input
                    type="text"
                    name="entidadeInstrutora"
                    defaultValue={treinoParaEditar?.entidadeInstrutora || 'Impacto Aviation SGQ'}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Resultado *</label>
                  <select
                    name="resultado"
                    required
                    defaultValue={treinoParaEditar?.resultado || 'APROVADO'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="APROVADO">Aprovado</option>
                    <option value="REPROVADO">Reprovado</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Aproveitamento (%)</label>
                  <input
                    type="number"
                    name="aproveitamentoPercentual"
                    min={0}
                    max={100}
                    defaultValue={treinoParaEditar?.aproveitamentoPercentual || 100}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Número do Certificado</label>
                <input
                  type="text"
                  name="numeroCertificado"
                  defaultValue={treinoParaEditar?.numeroCertificado || ''}
                  placeholder="Ex: CERT-2025-HF-084"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalTreinoOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO CURSO NO CATÁLOGO                                             */}
      {/* ========================================================================= */}
      {modalCursoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {cursoParaEditar ? 'Editar Curso' : 'Cadastrar Curso no Catálogo'}
              </h3>
              <button
                onClick={() => setModalCursoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCurso} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Código do Curso *</label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    defaultValue={cursoParaEditar?.codigo || ''}
                    placeholder="Ex: TREIN-HF-01"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo *</label>
                  <select
                    name="tipo"
                    required
                    defaultValue={cursoParaEditar?.tipo || 'REGULAMENTAR'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="REGULAMENTAR">Regulamentar (ANAC)</option>
                    <option value="TECNICO">Técnico Operacional</option>
                    <option value="QUALIDADE_SGQ">Qualidade / SGQ</option>
                    <option value="SEGURANCA_OPERACIONAL">Segurança Operacional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Título do Curso *</label>
                <input
                  type="text"
                  name="titulo"
                  required
                  defaultValue={cursoParaEditar?.titulo || ''}
                  placeholder="Ex: Fatores Humanos na Manutenção Aeronáutica"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descrição</label>
                <textarea
                  name="descricao"
                  rows={2}
                  defaultValue={cursoParaEditar?.descricao || ''}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Carga Horária (h) *</label>
                  <input
                    type="number"
                    name="cargaHorariaHoras"
                    required
                    defaultValue={cursoParaEditar?.cargaHorariaHoras || 8}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Periodicidade (Meses)</label>
                  <input
                    type="number"
                    name="periodicidadeMeses"
                    defaultValue={cursoParaEditar?.periodicidadeMeses || 24}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recorrente"
                  name="recorrente"
                  defaultChecked={cursoParaEditar?.recorrente ?? true}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="recorrente" className="font-semibold text-slate-700 cursor-pointer">
                  Treinamento Recorrente (exige reciclagem periódica)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalCursoOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Salvar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ANEXAR DOCUMENTO                                                   */}
      {/* ========================================================================= */}
      {modalDocOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Anexar Documento de Evidência</h3>
              <button
                onClick={() => setModalDocOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador *</label>
                <select
                  name="colaboradorId"
                  required
                  defaultValue={persons[0]?.id}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.matricula})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Documento *</label>
                <select
                  name="tipoDocumento"
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CERTIFICADO_TREINAMENTO">Certificado de Treinamento</option>
                  <option value="CHT_DIGITAL">Extrato CHT Digital ANAC</option>
                  <option value="FICHA_OJT">Ficha de OJT (On-the-Job Training)</option>
                  <option value="AVALIACAO_PRATICA">Avaliação Prática em Hangar</option>
                  <option value="AUTORIZACAO_FORMAL">Autorização Formal Assinada</option>
                  <option value="DIPLOMA_ESCOLARIDADE">Diploma / Certidão</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Título do Documento *</label>
                <input
                  type="text"
                  name="titulo"
                  required
                  placeholder="Ex: Certificado FTS Nível 2 — Válido até 2026"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Emissor *</label>
                  <input
                    type="text"
                    name="emissor"
                    required
                    placeholder="Ex: ANAC / Impacto"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Emissão *</label>
                  <input
                    type="date"
                    name="dataEmissao"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Data de Validade (se houver)</label>
                <input
                  type="date"
                  name="dataValidade"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalDocOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Registrar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
