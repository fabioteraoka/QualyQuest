import React, { useState, useMemo, useEffect } from 'react';
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
  UploadCloud,
  Sparkles,
  Plane,
  CheckSquare,
  Square,
  History,
  Layers,
} from 'lucide-react';
import {
  ColaboradorPessoa,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  HistoricoCorrecaoTreinamento,
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
  corrigirRegistroTreinamento,
  batchDeleteTrainingRecords,
  saveQualification,
  deleteQualification,
  savePersonDocument,
  deletePersonDocument,
} from '../services/firebase/competenciesFirestore';
import {
  calcularDiasParaVencimento,
  calcularDataValidadeComTolerancia,
} from '../services/competenciesEngine';
import { TrainingDeduplicationModal } from './TrainingDeduplicationModal';
import { FROTAS_PADRAO, NIVEIS_CURSO_PADRAO } from './FleetCompetencyMatrixView';
import { formatarTituloCursoCompleto } from '../utils/courseFormatters';

interface TrainingsQualificationsViewProps {
  organizationId: string;
  userProfile?: UserProfile | null;
  persons: ColaboradorPessoa[];
  trainingCourses: CursoTreinamento[];
  trainingRecords: RegistroTreinamentoColaborador[];
  qualifications: QualificacaoColaborador[];
  documents: DocumentoEvidenciaPessoa[];
  initialTab?: 'QUALIFICACOES' | 'TREINAMENTOS_HISTORICO' | 'CURSOS' | 'DOCUMENTOS';
  onNavigateToImport?: () => void;
  onNavigateToRooster?: (roosterTab?: 'pessoas' | 'ficha' | 'catalogo' | 'treinamentos' | 'licencas') => void;
  onRegistrosRemovidos?: (ids: string[]) => void;
}

export const TrainingsQualificationsView: React.FC<TrainingsQualificationsViewProps> = ({
  organizationId,
  userProfile,
  persons = [],
  trainingCourses = [],
  trainingRecords = [],
  qualifications = [],
  documents = [],
  initialTab = 'QUALIFICACOES',
  onNavigateToImport,
  onNavigateToRooster,
  onRegistrosRemovidos,
}) => {
  const [activeTab, setActiveTab] = useState<'QUALIFICACOES' | 'TREINAMENTOS_HISTORICO' | 'CURSOS' | 'DOCUMENTOS'>(initialTab);
  const [isDeduplicationModalOpen, setIsDeduplicationModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: 'QUALIFICACOES' | 'TREINAMENTOS_HISTORICO' | 'CURSOS' | 'DOCUMENTOS') => {
    setActiveTab(tab);
    setFilterStatus('TODOS');
    setFilterTipo('TODOS');
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterFrota, setFilterFrota] = useState('TODAS');
  const [filterNivel, setFilterNivel] = useState('TODOS');
  const [filterOrigem, setFilterOrigem] = useState<'TODOS' | 'IMPORTADO' | 'MANUAL'>('TODOS');
  const [filterColaborador, setFilterColaborador] = useState('TODOS');

  // Seleção e Exclusão em Lote
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [batchDeleteJustificativa, setBatchDeleteJustificativa] = useState('');
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteProgress, setBatchDeleteProgress] = useState<{ removidos: number; total: number } | null>(null);

  // Modal Curso
  const [modalCursoOpen, setModalCursoOpen] = useState(false);
  const [cursoParaEditar, setCursoParaEditar] = useState<CursoTreinamento | null>(null);

  // Modal Registro Treinamento (Lançamento e Correção Rastreável)
  const [modalTreinoOpen, setModalTreinoOpen] = useState(false);
  const [treinoParaEditar, setTreinoParaEditar] = useState<RegistroTreinamentoColaborador | null>(null);
  const [motivoCorrecao, setMotivoCorrecao] = useState('');
  const [isCorrigindoTreino, setIsCorrigindoTreino] = useState(false);

  // Estados controlados para preenchimento ágil e consistente de frota, nível e variante
  const [modalTreinoCursoId, setModalTreinoCursoId] = useState<string>('');
  const [modalTreinoFrota, setModalTreinoFrota] = useState<string>('');
  const [modalTreinoNivel, setModalTreinoNivel] = useState<string>('');
  const [modalTreinoVariante, setModalTreinoVariante] = useState<string>('');

  const handleAbrirModalTreino = (treino?: RegistroTreinamentoColaborador | null) => {
    setTreinoParaEditar(treino || null);
    setMotivoCorrecao('');
    if (treino) {
      setModalTreinoCursoId(treino.treinamentoId);
      setModalTreinoFrota(treino.frotaOuFamilia || '');
      setModalTreinoNivel(treino.nivelOuModulo || '');
      setModalTreinoVariante(treino.varianteAplicabilidade || '');
    } else {
      const primeiro = trainingCourses[0];
      setModalTreinoCursoId(primeiro?.id || '');
      setModalTreinoFrota(primeiro?.frotaOuFamilia || '');
      setModalTreinoNivel(primeiro?.nivelOuModulo || '');
      setModalTreinoVariante(
        primeiro?.variantesAplicabilidade && primeiro.variantesAplicabilidade.length > 0
          ? primeiro.variantesAplicabilidade.join(', ')
          : ''
      );
    }
    setModalTreinoOpen(true);
  };

  const handleTrocaCursoNoModal = (novoCursoId: string) => {
    setModalTreinoCursoId(novoCursoId);
    const c = trainingCourses.find((item) => item.id === novoCursoId);
    if (c) {
      if (c.frotaOuFamilia) setModalTreinoFrota(c.frotaOuFamilia);
      if (c.nivelOuModulo) setModalTreinoNivel(c.nivelOuModulo);
      if (c.variantesAplicabilidade && c.variantesAplicabilidade.length > 0) {
        setModalTreinoVariante(c.variantesAplicabilidade.join(', '));
      }
    }
  };

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

      const dias = calcularDiasParaVencimento(q.dataValidade);
      const isVencida = (dias !== null && dias < 0) || q.status === 'VENCIDA';
      const isVencendo = dias !== null && dias >= 0 && dias <= 30;

      let matchStatus = true;
      if (filterStatus === 'TODOS') {
        matchStatus = true;
      } else if (filterStatus === 'VENCIDA') {
        matchStatus = isVencida;
      } else if (filterStatus === 'VENCENDO') {
        matchStatus = isVencendo && !isVencida;
      } else if (filterStatus === 'VALIDA') {
        matchStatus = !isVencida && q.status !== 'SUSPENSA' && q.status !== 'REVOGADA';
      } else if (filterStatus === 'SUSPENSA') {
        matchStatus = q.status === 'SUSPENSA';
      } else {
        matchStatus = q.status === filterStatus;
      }

      return matchSearch && matchTipo && matchStatus;
    });
  }, [qualifications, searchTerm, filterTipo, filterStatus]);

  // Treinamentos realizados filtrados com frotas, níveis, lotes e colaboradores
  const treinosFiltrados = useMemo(() => {
    return trainingRecords.filter((t) => {
      const matchSearch =
        searchTerm === '' ||
        t.colaboradorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.treinamentoTitulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.instrutor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.numeroCertificado && t.numeroCertificado.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchResultado = filterStatus === 'TODOS' || t.resultado === filterStatus;

      const matchFrota =
        filterFrota === 'TODAS' ||
        (t.frotaOuFamilia && t.frotaOuFamilia.toLowerCase() === filterFrota.toLowerCase()) ||
        t.treinamentoTitulo.toLowerCase().includes(filterFrota.toLowerCase());

      const matchNivel =
        filterNivel === 'TODOS' ||
        (t.nivelOuModulo && t.nivelOuModulo.toLowerCase().includes(filterNivel.toLowerCase()));

      const matchOrigem =
        filterOrigem === 'TODOS' ||
        (filterOrigem === 'IMPORTADO' && Boolean(t.importadoAutomaticamente)) ||
        (filterOrigem === 'MANUAL' && !t.importadoAutomaticamente);

      const matchColaborador =
        filterColaborador === 'TODOS' || t.colaboradorId === filterColaborador;

      return matchSearch && matchResultado && matchFrota && matchNivel && matchOrigem && matchColaborador;
    });
  }, [
    trainingRecords,
    searchTerm,
    filterStatus,
    filterFrota,
    filterNivel,
    filterOrigem,
    filterColaborador,
  ]);

  // Seleção Múltipla
  const isAllSelected = useMemo(() => {
    return (
      treinosFiltrados.length > 0 &&
      treinosFiltrados.every((t) => selectedRecordIds.includes(t.id))
    );
  }, [treinosFiltrados, selectedRecordIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const idsFiltrados = new Set(treinosFiltrados.map((t) => t.id));
      setSelectedRecordIds((prev) => prev.filter((id) => !idsFiltrados.has(id)));
    } else {
      const novos = Array.from(new Set([...selectedRecordIds, ...treinosFiltrados.map((t) => t.id)]));
      setSelectedRecordIds(novos);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Exclusão em Lote
  const handleConfirmBatchDelete = async () => {
    if (selectedRecordIds.length === 0) return;
    if (userProfile?.role === 'CONSULTA' || userProfile?.role === 'VIEWER') {
      alert('Usuário com perfil de consulta não possui permissão para excluir registros de treinamento.');
      return;
    }

    if (!batchDeleteJustificativa.trim() || batchDeleteJustificativa.trim().length < 5) {
      alert('Justificativa técnica obrigatória: Informe o motivo da exclusão em lote (mínimo 5 caracteres) para rastreabilidade de auditoria SGQ.');
      return;
    }

    setIsBatchDeleting(true);
    setBatchDeleteProgress({ removidos: 0, total: selectedRecordIds.length });

    try {
      const idsParaExcluir = [...selectedRecordIds];
      await batchDeleteTrainingRecords(
        organizationId,
        idsParaExcluir,
        userProfile,
        (removidos, total) => {
          setBatchDeleteProgress({ removidos, total });
        },
        batchDeleteJustificativa
      );

      if (onRegistrosRemovidos) {
        onRegistrosRemovidos(idsParaExcluir);
      }

      alert(
        `Exclusão em lote realizada com sucesso!\n\n${idsParaExcluir.length} registro(s) de treinamento foram removidos do histórico com registro permanente na trilha de auditoria SGQ.`
      );
      setSelectedRecordIds([]);
      setIsBatchDeleteModalOpen(false);
      setBatchDeleteJustificativa('');
    } catch (err: any) {
      alert(`Erro durante a exclusão em lote: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsBatchDeleting(false);
      setBatchDeleteProgress(null);
    }
  };

  // Handlers para Cursos
  const handleSaveCurso = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const recorrente = formData.get('recorrente') === 'on';
    const exigeReciclagem = formData.get('exigeReciclagem') === 'on' || recorrente;
    const cursoOrigemReciclagemId = String(formData.get('cursoOrigemReciclagemId') || '').trim() || undefined;
    const cursoOrigem = cursoOrigemReciclagemId
      ? trainingCourses.find((c) => c.id === cursoOrigemReciclagemId)
      : undefined;

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
      frotaOuFamilia: String(formData.get('frotaOuFamilia') || '').trim() || undefined,
      nivelOuModulo: String(formData.get('nivelOuModulo') || '').trim() || undefined,
      variantesAplicabilidade: String(formData.get('variantesAplicabilidade') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      exigeReciclagem,
      cursoOrigemReciclagemId,
      cursoOrigemReciclagemTitulo: cursoOrigem?.titulo,
      evidenciaExigida: String(formData.get('evidenciaExigida') || 'Certificado de Conclusão').trim(),
      exigeAvaliacaoOuAprovacaoAdicional: formData.get('exigeAvaliacaoOuAprovacaoAdicional') === 'on',
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

  // Handlers para Treinamentos Realizados (Novo e Correção Rastreável)
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

    // Validação de datas
    if (dataValidade && dataRealizacao && dataValidade < dataRealizacao) {
      alert('Data inválida: A data de validade/reciclagem não pode ser anterior à data de realização do treinamento.');
      return;
    }

    const frotaOuFamilia = String(formData.get('frotaOuFamilia') || curso.frotaOuFamilia || '').trim() || undefined;
    const nivelOuModulo = String(formData.get('nivelOuModulo') || curso.nivelOuModulo || '').trim() || undefined;
    const varianteAplicabilidade = String(formData.get('varianteAplicabilidade') || '').trim() || undefined;
    const ehReciclagem = formData.get('ehReciclagem') === 'on' || curso.tipo === 'RECICLAGEM';
    const registroTreinamentoOrigemId = String(formData.get('registroTreinamentoOrigemId') || '').trim() || undefined;

    // Se estamos editando um registro existente -> Correção Rastreável com Auditoria SGQ
    if (treinoParaEditar) {
      if (userProfile?.role === 'CONSULTA' || userProfile?.role === 'VIEWER') {
        alert('Perfil de consulta não possui permissão para editar registros de treinamento.');
        return;
      }

      if (!motivoCorrecao.trim() || motivoCorrecao.trim().length < 5) {
        alert('Justificativa técnica obrigatória: Informe o motivo da correção (mínimo 5 caracteres) para rastreabilidade de auditoria SGQ.');
        return;
      }

      const confirmacao = window.confirm(
        `Confirma a gravação da correção deste treinamento no histórico com auditoria SGQ?\n\nColaborador: ${treinoParaEditar.colaboradorNome}\nCurso: ${treinoParaEditar.treinamentoTitulo}\nMotivo: ${motivoCorrecao}`
      );
      if (!confirmacao) return;

      setIsCorrigindoTreino(true);
      try {
        const dadosAtualizados: Partial<RegistroTreinamentoColaborador> = {
          dataRealizacao,
          dataValidade: dataValidade || undefined,
          cargaHoraria: Number(formData.get('cargaHoraria') || curso.cargaHorariaHoras),
          entidadeInstrutora: String(formData.get('entidadeInstrutora') || '').trim(),
          instrutor: String(formData.get('instrutor') || '').trim(),
          resultado: (formData.get('resultado') as any) || 'APROVADO',
          aproveitamentoPercentual: Number(formData.get('aproveitamentoPercentual') || 100),
          numeroCertificado: String(formData.get('numeroCertificado') || '').trim() || undefined,
          observacoes: String(formData.get('observacoes') || '').trim() || undefined,
          frotaOuFamilia,
          nivelOuModulo,
          varianteAplicabilidade,
          ehReciclagem,
          registroTreinamentoOrigemId,
        };

        await corrigirRegistroTreinamento(
          organizationId,
          treinoParaEditar.id,
          treinoParaEditar,
          dadosAtualizados,
          motivoCorrecao,
          userProfile
        );

        setModalTreinoOpen(false);
        setTreinoParaEditar(null);
        setMotivoCorrecao('');
      } catch (err: any) {
        alert(`Erro ao corrigir treinamento: ${err.message}`);
      } finally {
        setIsCorrigindoTreino(false);
      }
      return;
    }

    // Caso seja novo registro
    const rec: RegistroTreinamentoColaborador = {
      id: `tr-${Date.now()}`,
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
      frotaOuFamilia,
      nivelOuModulo,
      varianteAplicabilidade,
      ehReciclagem,
      registroTreinamentoOrigemId,
      validadoPorSGQNome: userProfile?.displayName || 'SGQ',
      validadoPorSGQUid: userProfile?.uid || 'sgq',
      dataValidacaoSGQ: new Date().toISOString(),
      createdAt: new Date().toISOString(),
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
            onClick={() => setIsDeduplicationModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
            title="Saneamento de duplicidades em treinamentos"
          >
            <Sparkles className="w-4 h-4" /> Deduplicar Cursos
          </button>
          {onNavigateToImport && (
            <button
              onClick={onNavigateToImport}
              className="inline-flex items-center gap-2 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
              title="Acessar Central de Importação de Dados SGQ"
            >
              <UploadCloud className="w-4 h-4 text-sky-600" /> Importação de Dados
            </button>
          )}
          {onNavigateToRooster && (
            <button
              onClick={() =>
                onNavigateToRooster(
                  activeTab === 'CURSOS'
                    ? 'catalogo'
                    : activeTab === 'TREINAMENTOS_HISTORICO'
                    ? 'treinamentos'
                    : 'licencas'
                )
              }
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-xs cursor-pointer"
              title="Abrir módulo oficial Rooster MRO para manutenção mestre"
            >
              <Plane className="w-4 h-4" /> Mestre: Rooster MRO
            </button>
          )}
          <button
            onClick={() => {
              if (onNavigateToRooster) {
                onNavigateToRooster('licencas');
              } else {
                setQualifParaEditar(null);
                setModalQualifOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Shield className="w-4 h-4" /> Nova Habilitação / CHT
          </button>
          <button
            onClick={() => {
              if (onNavigateToRooster) {
                onNavigateToRooster('treinamentos');
              } else {
                setTreinoParaEditar(null);
                setModalTreinoOpen(true);
              }
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
          onClick={() => handleTabChange('QUALIFICACOES')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'QUALIFICACOES'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-blue-600" /> Habilitações & CHTs ({qualifications.length})
        </button>
        <button
          onClick={() => handleTabChange('TREINAMENTOS_HISTORICO')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'TREINAMENTOS_HISTORICO'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-sky-600" /> Histórico de Treinamentos ({trainingRecords.length})
        </button>
        <button
          onClick={() => handleTabChange('CURSOS')}
          className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
            activeTab === 'CURSOS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-600" /> Catálogo de Cursos ({trainingCourses.length})
        </button>
        <button
          onClick={() => handleTabChange('DOCUMENTOS')}
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
          {/* Banner Sistema Mestre Rooster MRO */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-sky-600 shrink-0" />
              <div>
                <span className="font-bold">Sistema Mestre Oficial: Rooster MRO (Módulo Licenças e Habilitações)</span>
                <p className="text-sky-700 text-[11px] mt-0.5">
                  CHTs, CCTs e autorizações internas (RTS, RII, NDT) possuem manutenção oficial no Rooster MRO. Dados sincronizados em tempo real no Firestore.
                </p>
              </div>
            </div>
            {onNavigateToRooster && (
              <button
                onClick={() => onNavigateToRooster('licencas')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-xs transition shrink-0 cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5" /> Abrir Licenças no Rooster &rarr;
              </button>
            )}
          </div>

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
                      <div className="flex items-center gap-1.5">
                        {onNavigateToRooster && (
                          <button
                            onClick={() => onNavigateToRooster('licencas')}
                            className="px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded flex items-center gap-1 transition"
                            title="Editar no módulo mestre Rooster MRO"
                          >
                            <Plane className="w-3 h-3 text-indigo-600" /> Rooster
                          </button>
                        )}
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
      {/* ABA 2: HISTÓRICO DE TREINAMENTOS REALIZADOS (COM EXCLUSÃO EM LOTE E EDIÇÃO) */}
      {/* ========================================================================= */}
      {activeTab === 'TREINAMENTOS_HISTORICO' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          {/* Banner Sistema Mestre Rooster MRO */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">Sistema Mestre Oficial: Rooster MRO (Lançamento e Renovação de Treinamentos)</span>
                <p className="text-emerald-700 text-[11px] mt-0.5">
                  Registros de treinamentos, renovações com rastreabilidade histórica e lançamentos individuais ou em lote são centralizados no Rooster MRO.
                </p>
              </div>
            </div>
            {onNavigateToRooster && (
              <button
                onClick={() => onNavigateToRooster('treinamentos')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shrink-0 cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5" /> Lançar / Renovar no Rooster &rarr;
              </button>
            )}
          </div>
          {/* Barra Flutuante de Ações em Lote */}
          {selectedRecordIds.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 text-white p-3.5 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedRecordIds.length}
                </span>
                <span className="text-xs font-semibold">
                  {selectedRecordIds.length} registro(s) de treinamento selecionado(s)
                </span>
                <span className="text-[11px] text-slate-400">
                  (Selecione para purgar em lote após calibração de importação)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordIds([])}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Desmarcar Todos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchDeleteJustificativa('');
                    setIsBatchDeleteModalOpen(true);
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Selecionados em Lote ({selectedRecordIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Filtros Avançados: Busca, Resultado, Frota, Nível, Origem, Colaborador */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative col-span-1 md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por colaborador, treinamento, certificado ou instrutor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por Frota */}
            <select
              value={filterFrota}
              onChange={(e) => setFilterFrota(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 font-medium"
            >
              <option value="TODAS">Todas as Frotas ({FROTAS_PADRAO.length})</option>
              {FROTAS_PADRAO.map((f) => (
                <option key={f} value={f}>
                  ✈️ {f}
                </option>
              ))}
            </select>

            {/* Filtro por Nível / Módulo */}
            <select
              value={filterNivel}
              onChange={(e) => setFilterNivel(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 font-medium"
            >
              <option value="TODOS">Todos os Níveis / Módulos</option>
              <option value="Familiarização">Familiarização (Nível 1)</option>
              <option value="Ramp">Ramp & Transit (Nível 2)</option>
              <option value="Maintenance">Line & Base Maintenance (Nível 3)</option>
              <option value="Motor">Curso Específico de Motor</option>
              <option value="Reciclagem">Apenas Reciclagens</option>
            </select>

            {/* Filtro por Origem (Importado vs Manual) */}
            <select
              value={filterOrigem}
              onChange={(e) => setFilterOrigem(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 font-medium"
            >
              <option value="TODOS">Todas as Origens de Cadastro</option>
              <option value="IMPORTADO">📥 Apenas Importados Automaticamente</option>
              <option value="MANUAL">✍️ Apenas Cadastros Manuais / SGQ</option>
            </select>

            {/* Filtro por Resultado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 font-medium"
            >
              <option value="TODOS">Todos os Resultados</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REPROVADO">Reprovado</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
            </select>

            {/* Filtro por Colaborador */}
            <select
              value={filterColaborador}
              onChange={(e) => setFilterColaborador(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-800 font-medium col-span-1 md:col-span-2"
            >
              <option value="TODOS">Todos os Colaboradores ({persons.length})</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.matricula}) — {p.funcao}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Exibindo <strong>{treinosFiltrados.length}</strong> de <strong>{trainingRecords.length}</strong> registros de treinamento.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> Desmarcar todos exibidos
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Selecionar todos exibidos ({treinosFiltrados.length})
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      title="Selecionar todos os registros filtrados"
                      className="cursor-pointer text-slate-600 hover:text-blue-600"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Treinamento / Frota & Nível</th>
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
                    <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                      Nenhum treinamento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  treinosFiltrados.map((tr) => {
                    const dias = calcularDiasParaVencimento(tr.dataValidade);
                    const isVencido = dias !== null && dias < 0;
                    const isSelected = selectedRecordIds.includes(tr.id);

                    return (
                      <tr
                        key={tr.id}
                        className={`transition ${isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'}`}
                      >
                        {/* Checkbox individual */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectOne(tr.id)}
                            className="cursor-pointer text-slate-500 hover:text-blue-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Colaborador */}
                        <td className="p-3 font-medium text-slate-900">
                          <div>{tr.colaboradorNome}</div>
                          <div className="text-[11px] text-slate-500">{tr.colaboradorMatricula}</div>
                        </td>

                        {/* Treinamento / Frota / Nível */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>
                              {formatarTituloCursoCompleto({
                                titulo: tr.treinamentoTitulo,
                                frotaOuFamilia: tr.frotaOuFamilia,
                                nivelOuModulo: tr.nivelOuModulo,
                                variantesAplicabilidade: tr.varianteAplicabilidade,
                              })}
                            </span>
                            {tr.ehReciclagem && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                🔄 Reciclagem
                              </span>
                            )}
                            {tr.importadoAutomaticamente && (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-sky-100 text-sky-800 border border-sky-200"
                                title={`Importado automaticamente. Origem: ${tr.origemImportacao || 'Lote SGQ'}${tr.loteImportacaoId ? ` | Lote: ${tr.loteImportacaoId}` : ''}`}
                              >
                                📥 Auto
                              </span>
                            )}
                            {tr.historicoCorrecoes && tr.historicoCorrecoes.length > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                                title={`${tr.historicoCorrecoes.length} correção(ões) auditada(s)`}
                              >
                                ✍️ Auditado ({tr.historicoCorrecoes.length})
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{tr.treinamentoCodigo}</span>
                            <span>•</span>
                            <span>{tr.cargaHoraria}h</span>
                            {tr.frotaOuFamilia && (
                              <>
                                <span>•</span>
                                <span className="font-sans font-semibold text-blue-800">
                                  ✈️ {tr.frotaOuFamilia}
                                </span>
                              </>
                            )}
                            {tr.nivelOuModulo && (
                              <>
                                <span>•</span>
                                <span className="font-sans text-indigo-700">
                                  {tr.nivelOuModulo}
                                </span>
                              </>
                            )}
                            {tr.varianteAplicabilidade && (
                              <span className="font-sans text-slate-600 font-mono">
                                ({tr.varianteAplicabilidade})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Data Realização */}
                        <td className="p-3 text-slate-700 font-mono">{tr.dataRealizacao}</td>

                        {/* Validade / Reciclagem */}
                        <td className="p-3">
                          {tr.dataValidade ? (
                            <span className={isVencido ? 'text-rose-700 font-bold font-mono' : 'text-slate-700 font-mono'}>
                              {tr.dataValidade} ({dias !== null ? `${dias}d` : 'N/A'})
                            </span>
                          ) : (
                            <span className="text-slate-400">Não expira</span>
                          )}
                        </td>

                        {/* Instrutor / Entidade */}
                        <td className="p-3 text-slate-600">
                          <div>{tr.instrutor}</div>
                          <div className="text-[11px] text-slate-400">{tr.entidadeInstrutora}</div>
                        </td>

                        {/* Resultado */}
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

                        {/* Ações */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {onNavigateToRooster && (
                              <button
                                onClick={() => onNavigateToRooster('treinamentos')}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                                title="Abrir no Rooster MRO (Mestre Oficial de Treinamentos)"
                              >
                                <Plane className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* Botão de Edição Rastreável */}
                            <button
                              onClick={() => {
                                setTreinoParaEditar(tr);
                                setMotivoCorrecao('');
                                setModalTreinoOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Editar / Corrigir Registro com Auditoria SGQ"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão de Exclusão Individual */}
                            <button
                              onClick={() => handleDeleteTreino(tr.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Excluir Registro Individual"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CATÁLOGO DE CURSOS E PROGRAMAS DE TREINAMENTO                      */}
      {/* ========================================================================= */}
      {activeTab === 'CURSOS' && (
        <div className="space-y-4">
          {/* Banner Sistema Mestre Rooster MRO */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Sistema Mestre Oficial: Rooster MRO (Catálogo Oficial de Treinamentos)</span>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Cursos, cargas horárias, frotas e regras de validade são cadastrados oficialmente no Rooster MRO e compartilhados em tempo real com o QualyQuest.
                </p>
              </div>
            </div>
            {onNavigateToRooster && (
              <button
                onClick={() => onNavigateToRooster('catalogo')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition shrink-0 cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5" /> Abrir Catálogo no Rooster &rarr;
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Catálogo de Cursos & Grade Regulamentar</h2>
              <p className="text-sm text-slate-600">
                Grade de treinamentos obrigatórios conforme RBAC 145 e requisitos de SGQ interno.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onNavigateToRooster && (
                <button
                  onClick={() => onNavigateToRooster('catalogo')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plane className="w-3.5 h-3.5" /> + Novo Curso no Rooster
                </button>
              )}
              <button
                onClick={() => {
                  setCursoParaEditar(null);
                  setModalCursoOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Curso Local
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainingCourses.map((curso) => {
              const tituloCompleto = formatarTituloCursoCompleto(curso);

              return (
                <div
                  key={curso.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                          {curso.codigo}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">{tituloCompleto}</h3>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 shrink-0">
                        {curso.tipo}
                      </span>
                    </div>

                    {/* Identificação Visível Estruturada: Frota, Nível Técnico e Variantes */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {curso.frotaOuFamilia && (
                        <span className="text-[11px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                          <Plane className="w-3 h-3 text-blue-600" />
                          <span>{curso.frotaOuFamilia}</span>
                        </span>
                      )}
                      {curso.nivelOuModulo && (
                        <span className="text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-indigo-600" />
                          <span>{curso.nivelOuModulo}</span>
                        </span>
                      )}
                      {curso.variantesAplicabilidade && curso.variantesAplicabilidade.length > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-mono">
                          ⚙️ {curso.variantesAplicabilidade.join(' / ')}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">{curso.descricao || curso.ementa}</p>

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

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] font-mono text-slate-500">
                    {curso.status === 'ATIVO' ? '🟢 Ativo' : '⚪ Inativo'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onNavigateToRooster && (
                      <button
                        onClick={() => onNavigateToRooster('catalogo')}
                        className="px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded flex items-center gap-1 transition"
                        title="Editar Curso no Rooster MRO"
                      >
                        <Plane className="w-3 h-3 text-amber-600" /> Rooster
                      </button>
                    )}
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
              </div>
            );
          })}
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
      {/* MODAL: LANÇAR / EDITAR / CORRIGIR TREINAMENTO (AUDITORIA SGQ)              */}
      {/* ========================================================================= */}
      {modalTreinoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  {treinoParaEditar ? 'Editar / Corrigir Registro de Treinamento (Auditoria SGQ)' : 'Lançamento de Treinamento Realizado'}
                </h3>
                <p className="text-xs text-slate-500">
                  {treinoParaEditar
                    ? 'A correção atualiza as datas e dados sem apagar silenciosamente o histórico anterior.'
                    : 'Registre a conclusão de treinamentos iniciais ou reciclagens operacionais.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalTreinoOpen(false);
                  setTreinoParaEditar(null);
                  setMotivoCorrecao('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso de Origem de Importação Automática */}
            {treinoParaEditar?.importadoAutomaticamente && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Registro de Importação Automática:</strong> Origem: {treinoParaEditar.origemImportacao || 'Lote Documental SGQ'}{' '}
                  {treinoParaEditar.loteImportacaoId ? `(Lote: ${treinoParaEditar.loteImportacaoId})` : ''}.
                  As correções manuais de datas e dados serão registradas com trilha de auditoria formal.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveTreino} className="space-y-3.5 text-xs">
              {/* Colaborador */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Colaborador / Mecânico *</label>
                {treinoParaEditar ? (
                  <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-900 font-semibold flex justify-between items-center">
                    <span>{treinoParaEditar.colaboradorNome} ({treinoParaEditar.colaboradorMatricula})</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Vínculo Seguro</span>
                    <input type="hidden" name="colaboradorId" value={treinoParaEditar.colaboradorId} />
                  </div>
                ) : (
                  <select
                    name="colaboradorId"
                    required
                    defaultValue={persons[0]?.id}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.matricula}) — {p.funcao}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Treinamento / Curso com Identificação Completa por Frota e Nível */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Treinamento / Curso Homologado *
                  <span className="text-[11px] text-slate-500 font-normal ml-1">
                    (Selecione o nível e a frota correspondentes)
                  </span>
                </label>
                <select
                  name="treinamentoId"
                  required
                  value={modalTreinoCursoId}
                  onChange={(e) => handleTrocaCursoNoModal(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
                >
                  {trainingCourses.map((c) => {
                    const fullTitle = formatarTituloCursoCompleto(c);
                    const nivelTag = c.nivelOuModulo ? ` • ${c.nivelOuModulo}` : '';
                    const varTag = c.variantesAplicabilidade && c.variantesAplicabilidade.length > 0
                      ? ` • ${c.variantesAplicabilidade.join('/')}`
                      : '';
                    return (
                      <option key={c.id} value={c.id}>
                        {c.codigo} — {fullTitle}{nivelTag}{varTag} ({c.cargaHorariaHoras}h)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Frota, Nível e Variante com Sincronia Automática e Edição Rastreável */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Frota / Família</label>
                  <input
                    type="text"
                    name="frotaOuFamilia"
                    list="frotas-list"
                    value={modalTreinoFrota}
                    onChange={(e) => setModalTreinoFrota(e.target.value)}
                    placeholder="Ex: Airbus A320"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <datalist id="frotas-list">
                    {FROTAS_PADRAO.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nível ou Módulo Técnico</label>
                  <input
                    type="text"
                    name="nivelOuModulo"
                    list="niveis-list"
                    value={modalTreinoNivel}
                    onChange={(e) => setModalTreinoNivel(e.target.value)}
                    placeholder="Ex: Ramp & Transit"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <datalist id="niveis-list">
                    {NIVEIS_CURSO_PADRAO.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Variante / Motor</label>
                  <input
                    type="text"
                    name="varianteAplicabilidade"
                    value={modalTreinoVariante}
                    onChange={(e) => setModalTreinoVariante(e.target.value)}
                    placeholder="Ex: CFM56, LEAP-1A, CEO"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono uppercase"
                  />
                </div>
              </div>

              {/* Reciclagem & Treinamento Inicial Vinculado */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ehReciclagem"
                    name="ehReciclagem"
                    defaultChecked={treinoParaEditar?.ehReciclagem ?? false}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="ehReciclagem" className="font-bold text-amber-900 cursor-pointer">
                    Este treinamento é uma Reciclagem / Recorrente (atualiza validade sem apagar o curso inicial)
                  </label>
                </div>

                <div>
                  <label className="font-medium text-amber-800 text-[11px] block mb-0.5">
                    Vínculo com Treinamento Inicial de Referência (Opcional)
                  </label>
                  <select
                    name="registroTreinamentoOrigemId"
                    defaultValue={treinoParaEditar?.registroTreinamentoOrigemId || ''}
                    className="w-full p-1.5 border border-amber-200 rounded-lg bg-white text-xs"
                  >
                    <option value="">Nenhum / Curso Autônomo</option>
                    {trainingRecords
                      .filter((tr) => !tr.ehReciclagem && tr.id !== treinoParaEditar?.id)
                      .map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.colaboradorNome} — {tr.treinamentoTitulo} ({tr.dataRealizacao})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Datas de Realização e Validade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Realização *</label>
                  <input
                    type="date"
                    name="dataRealizacao"
                    required
                    defaultValue={treinoParaEditar?.dataRealizacao || new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Data de Reciclagem / Validade</label>
                  <input
                    type="date"
                    name="dataValidade"
                    defaultValue={treinoParaEditar?.dataValidade || ''}
                    placeholder="Calculada automaticamente se vazio"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Carga Horária, Instrutor e Entidade */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Carga Horária (h) *</label>
                  <input
                    type="number"
                    name="cargaHoraria"
                    required
                    defaultValue={treinoParaEditar?.cargaHoraria || 8}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Instrutor *</label>
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
                  <label className="font-semibold text-slate-700 block mb-1">Entidade Instrutora</label>
                  <input
                    type="text"
                    name="entidadeInstrutora"
                    defaultValue={treinoParaEditar?.entidadeInstrutora || 'Impacto Aviation SGQ'}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Resultado, Aproveitamento e Certificado */}
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nº do Certificado</label>
                  <input
                    type="text"
                    name="numeroCertificado"
                    defaultValue={treinoParaEditar?.numeroCertificado || ''}
                    placeholder="Ex: CERT-2025-084"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Observações Técnicas</label>
                <input
                  type="text"
                  name="observacoes"
                  defaultValue={treinoParaEditar?.observacoes || ''}
                  placeholder="Ex: Documentação comprobatória verificada conforme Manual de Treinamento."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Campo Obrigatório de Motivo/Justificativa da Correção (quando em modo de edição) */}
              {treinoParaEditar && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                  <label className="font-bold text-amber-900 block text-xs">
                    Motivo / Justificativa da Correção do Treinamento * (Auditoria SGQ)
                  </label>
                  <textarea
                    rows={2}
                    value={motivoCorrecao}
                    onChange={(e) => setMotivoCorrecao(e.target.value)}
                    placeholder="Ex: Correção da data de realização importada incorretamente pela planilha; alinhado com o Certificado original nº CERT-8493."
                    className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="text-[10px] text-amber-800">
                    Obrigatório (mínimo 5 caracteres). Ficará gravado permanentemente no histórico com seu usuário, data e valores anteriores.
                  </span>
                </div>
              )}

              {/* Histórico de Correções Anteriores */}
              {treinoParaEditar?.historicoCorrecoes && treinoParaEditar.historicoCorrecoes.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" />
                    Trilha de Correções Anteriores ({treinoParaEditar.historicoCorrecoes.length})
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                    {treinoParaEditar.historicoCorrecoes.map((hc) => (
                      <div key={hc.id} className="pt-1 text-[11px] text-slate-600">
                        <div className="flex justify-between font-semibold text-slate-700">
                          <span>{hc.usuarioNome}</span>
                          <span className="font-mono text-slate-400">{new Date(hc.dataHora).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-800 italic">"{hc.motivoCorrecao}"</p>
                        <p className="text-[10px] text-slate-500">
                          Campos alterados: {hc.camposAlterados.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setModalTreinoOpen(false);
                    setTreinoParaEditar(null);
                    setMotivoCorrecao('');
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCorrigindoTreino}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer ${
                    treinoParaEditar ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isCorrigindoTreino ? 'Gravando...' : treinoParaEditar ? 'Confirmar Correção Rastreável' : 'Confirmar Lançamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO EM LOTE DO HISTÓRICO DE TREINAMENTOS                       */}
      {/* ========================================================================= */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Exclusão em Lote do Histórico ({selectedRecordIds.length} Registros)
              </h3>
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Atenção: Ação Administrativa Irreversível!
              </p>
              <p>
                Você selecionou <strong>{selectedRecordIds.length}</strong> registro(s) de treinamento para expurgo.
                Esta operação é utilizada durante a calibração de importações e removerá definitivamente os registros selecionados do Firestore.
              </p>
            </div>

            {/* Resumo dos registros a excluir */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 max-h-36 overflow-y-auto">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider mb-1">
                Prévia dos Registros Selecionados:
              </span>
              {trainingRecords
                .filter((tr) => selectedRecordIds.includes(tr.id))
                .slice(0, 6)
                .map((tr) => (
                  <div key={tr.id} className="text-[11px] text-slate-600 flex justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-800">{tr.colaboradorNome}</span>
                    <span className="text-slate-500 truncate max-w-[200px]">{tr.treinamentoTitulo}</span>
                  </div>
                ))}
              {selectedRecordIds.length > 6 && (
                <p className="text-[10px] text-slate-500 italic pt-1">
                  ...e mais {selectedRecordIds.length - 6} outro(s) registro(s).
                </p>
              )}
            </div>

            {/* Justificativa Obrigatória */}
            <div>
              <label className="font-bold text-slate-800 text-xs block mb-1">
                Motivo / Justificativa da Exclusão em Lote * (Auditoria SGQ)
              </label>
              <textarea
                rows={3}
                value={batchDeleteJustificativa}
                onChange={(e) => setBatchDeleteJustificativa(e.target.value)}
                placeholder="Ex: Calibração do modelo de importação de cursos; remoção do lote redundante importado com erro de data."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                required
              />
              <span className="text-[10px] text-slate-400">
                Esta justificativa será registrada no log permanente de auditoria SGQ.
              </span>
            </div>

            {/* Barra de Progresso */}
            {isBatchDeleting && batchDeleteProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Excluindo registros...</span>
                  <span>{batchDeleteProgress.removidos} / {batchDeleteProgress.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-600 h-2 transition-all duration-200"
                    style={{
                      width: `${(batchDeleteProgress.removidos / batchDeleteProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isBatchDeleting || !batchDeleteJustificativa.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isBatchDeleting ? 'Excluindo...' : `Confirmar Exclusão (${selectedRecordIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR CURSO NO CATÁLOGO (COM FROTAS E NÍVEIS)               */}
      {/* ========================================================================= */}
      {modalCursoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {cursoParaEditar ? 'Editar Curso' : 'Cadastrar Curso no Catálogo'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure requisitos, frotas atendidas, níveis e regras de reciclagem.
                </p>
              </div>
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
                    defaultValue={cursoParaEditar?.tipo || 'REGULATORIO'}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="REGULATORIO">Regulatório (RBAC 145/ANAC)</option>
                    <option value="AERONAUTICO">Técnico Aeronáutico</option>
                    <option value="FABRICANTE">Fabricante (Airbus/Boeing/etc.)</option>
                    <option value="QUALIDADE">Qualidade / SGQ</option>
                    <option value="SEGURANCA">Segurança Operacional (SGSO)</option>
                    <option value="RECICLAGEM">Reciclagem Periódica</option>
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
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium text-slate-900"
                />
              </div>

              {/* Frota e Nível */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Frota / Família</label>
                  <input
                    type="text"
                    name="frotaOuFamilia"
                    list="frotas-curso-list"
                    defaultValue={cursoParaEditar?.frotaOuFamilia || ''}
                    placeholder="Ex: Airbus A320"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <datalist id="frotas-curso-list">
                    {FROTAS_PADRAO.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nível ou Módulo</label>
                  <input
                    type="text"
                    name="nivelOuModulo"
                    list="niveis-curso-list"
                    defaultValue={cursoParaEditar?.nivelOuModulo || ''}
                    placeholder="Ex: Ramp & Transit"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <datalist id="niveis-curso-list">
                    {NIVEIS_CURSO_PADRAO.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Variantes / Motores (separar por vírgula)</label>
                <input
                  type="text"
                  name="variantesAplicabilidade"
                  defaultValue={(cursoParaEditar?.variantesAplicabilidade || []).join(', ')}
                  placeholder="Ex: CFM56, LEAP-1A, V2500, CEO, NEO"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ementa / Descrição</label>
                <textarea
                  name="descricao"
                  rows={2}
                  defaultValue={cursoParaEditar?.ementa || ''}
                  placeholder="Conteúdo programático e escopo da capacitação..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tolerância (Dias)</label>
                  <input
                    type="number"
                    name="toleranciaDias"
                    defaultValue={cursoParaEditar?.toleranciaDias || 0}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Configurações de Reciclagem e Origem */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
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

                <div>
                  <label className="font-medium text-amber-900 text-[11px] block mb-0.5">
                    Curso de Origem que esta Reciclagem Revalida (se aplicável)
                  </label>
                  <select
                    name="cursoOrigemReciclagemId"
                    defaultValue={cursoParaEditar?.cursoOrigemReciclagemId || ''}
                    className="w-full p-1.5 border border-amber-200 rounded-lg bg-white text-xs"
                  >
                    <option value="">Nenhum / Curso Base Independente</option>
                    {trainingCourses
                      .filter((c) => c.id !== cursoParaEditar?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} — {c.titulo}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Evidência Exigida</label>
                  <input
                    type="text"
                    name="evidenciaExigida"
                    defaultValue={cursoParaEditar?.evidenciaExigida || 'Certificado de Conclusão'}
                    placeholder="Ex: Certificado, Avaliação Teórica/Prática"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="exigeAvaliacaoOuAprovacaoAdicional"
                    name="exigeAvaliacaoOuAprovacaoAdicional"
                    defaultChecked={cursoParaEditar?.exigeAvaliacaoOuAprovacaoAdicional ?? false}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="exigeAvaliacaoOuAprovacaoAdicional" className="font-semibold text-slate-700 cursor-pointer text-[11px]">
                    Exige Avaliação Formal / Portaria SGQ
                  </label>
                </div>
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

      {/* Modal de Saneamento e Deduplicação em Massa */}
      <TrainingDeduplicationModal
        isOpen={isDeduplicationModalOpen}
        onClose={() => setIsDeduplicationModalOpen(false)}
        organizationId={organizationId}
        userProfile={userProfile}
        trainingRecords={trainingRecords}
        onRegistrosRemovidos={onRegistrosRemovidos}
      />
    </div>
  );
};
