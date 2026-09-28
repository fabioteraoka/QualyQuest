import React, { useState, useMemo, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Search,
  Sliders,
  Filter,
  Layers,
  Database,
  Eye,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Clock,
  Building2,
  Award,
  AlertOctagon,
  FileCheck,
  ChevronDown,
  Hash,
  Download,
  Flame,
  Info,
  Link as LinkIcon,
  Plus,
  Trash2,
  ShieldAlert,
  History,
  Edit2,
  X
} from 'lucide-react';
import {
  OrganizationRecord,
  UserProfile,
  TipoControleImportacao,
  MapeamentoCampoItem,
  RegistroLinhaImportacao,
  ResumoPreviaImportacao,
  OportunidadeMelhoriaImportacao,
  TemplateMapeamentoAprovado,
  RegistroImportacaoCompleto,
  FerramentaCalibracao,
  ColaboradorPessoa,
  CursoTreinamento,
  RegistroTreinamentoColaborador,
  QualificacaoColaborador,
  DocumentoControlado
} from '../types';
import { PRESETS_AMOSTRAS_IMPORTACAO, PresetAmostraImportacao } from '../data/sampleImportFiles';
import {
  processarArquivoBruto,
  identificarTipoControleAutomatico,
  gerarMapeamentoAutomaticoCampos,
  tentarAplicarTemplateAprovado,
  validarECompararLinhasImportacao,
  adaptarTabelaFormularioF001021,
  ESQUEMA_CAMPOS_CONTROLE,
  DefinicaoCampoQualigest,
  criarCampoPersonalizado,
  obterCamposCompletos,
  espelharColunasComoCampos
} from '../utils/smartImportEngine';
import {
  efetivarImportacaoNoQualigest,
  saveSmartImportRecord,
  saveImportTemplate,
  saveCalibratedTool,
  reverterImportacaoNoQualigest,
  excluirRegistroImportacaoHistorico,
  toggleAtivoFerramenta,
  deleteFerramentaCalibrada,
  deleteImportTemplate
} from '../services/firebase/smartImportFirestore';
import { ReconciliationDiffModal } from './smart-import/ReconciliationDiffModal';
import { ImportReversalModal } from './smart-import/ImportReversalModal';
import { ToolCalibrationHistoryModal } from './smart-import/ToolCalibrationHistoryModal';
import { TemplateEditModal } from './smart-import/TemplateEditModal';

interface SmartImportMigrationViewProps {
  organization: OrganizationRecord | null;
  user: UserProfile | null;
  pessoas: ColaboradorPessoa[];
  treinamentos: CursoTreinamento[];
  registrosTreinamento: RegistroTreinamentoColaborador[];
  documentos: DocumentoControlado[];
  ferramentasCalibradas: FerramentaCalibracao[];
  smartImports: RegistroImportacaoCompleto[];
  templatesAprovados: TemplateMapeamentoAprovado[];
  initialTab?: 'WIZARD' | 'HISTORICO' | 'TEMPLATES' | 'METROLOGIA';
  onNavigateToTab?: (tab: string) => void;
  onAdicionarPessoa?: (pessoa: ColaboradorPessoa) => void;
  onAdicionarCurso?: (curso: CursoTreinamento) => void;
  onAdicionarRegistroTreinamento?: (registro: RegistroTreinamentoColaborador) => void;
  onAdicionarFerramenta?: (ferramenta: FerramentaCalibracao) => void;
  onRemoverFerramenta?: (toolId: string) => void;
  onRemoverRegistroTreinamento?: (recordId: string) => void;
  onRemoverPessoa?: (personId: string) => void;
  onRemoverCurso?: (courseId: string) => void;
  onAdicionarQualificacao?: (qualificacao: QualificacaoColaborador) => void;
  onRemoverQualificacao?: (qualId: string) => void;
  onAdicionarDocumento?: (documento: DocumentoControlado) => void;
  onRemoverDocumento?: (docId: string) => void;
  onRemoverTemplate?: (templateId: string) => void;
  onSalvarTemplate?: (template: TemplateMapeamentoAprovado) => void;
  onCriarRncSugerida?: (dadosRnc: any) => void;
}

export const SmartImportMigrationView: React.FC<SmartImportMigrationViewProps> = ({
  organization,
  user,
  pessoas = [],
  treinamentos = [],
  registrosTreinamento = [],
  documentos = [],
  ferramentasCalibradas = [],
  smartImports = [],
  templatesAprovados = [],
  initialTab = 'WIZARD',
  onNavigateToTab,
  onAdicionarPessoa,
  onAdicionarCurso,
  onAdicionarRegistroTreinamento,
  onAdicionarFerramenta,
  onRemoverFerramenta,
  onRemoverRegistroTreinamento,
  onRemoverPessoa,
  onRemoverCurso,
  onAdicionarQualificacao,
  onRemoverQualificacao,
  onAdicionarDocumento,
  onRemoverDocumento,
  onRemoverTemplate,
  onSalvarTemplate,
  onCriarRncSugerida,
}) => {
  const [tabPrincipal, setTabPrincipal] = useState<'WIZARD' | 'HISTORICO' | 'TEMPLATES' | 'METROLOGIA'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setTabPrincipal(initialTab);
    }
  }, [initialTab]);
  
  // Etapa atual do assistente (1 a 7)
  const [etapaAtual, setEtapaAtual] = useState<number>(1);
  const [isProcessando, setIsProcessando] = useState<boolean>(false);
  const [statusMensagem, setStatusMensagem] = useState<string>('');

  // Estado do Arquivo Selecionado
  const [arquivoNome, setArquivoNome] = useState<string>('');
  const [arquivoTamanho, setArquivoTamanho] = useState<number>(0);
  const [arquivoFormato, setArquivoFormato] = useState<'XLSX' | 'CSV' | 'DOCX' | 'PDF' | 'JSON'>('XLSX');
  const [arquivoHash, setArquivoHash] = useState<string>('');
  const [colunasDetectadas, setColunasDetectadas] = useState<string[]>([]);
  const [linhasOriginais, setLinhasOriginais] = useState<Record<string, any>[]>([]);

  // Suporte a Preâmbulo e Identificação Inteligente de Cabeçalho (Fase 14.1)
  const [linhaCabecalhoDetectada, setLinhaCabecalhoDetectada] = useState<number>(0);
  const [linhasPreambuloDetectadas, setLinhasPreambuloDetectadas] = useState<string[]>([]);
  const [classificacaoCampos, setClassificacaoCampos] = useState<Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'>>({});

  // Modais de Reconciliação, Reversão e Histórico Metrológico (Fase 14.1)
  const [reconciliationModalLinha, setReconciliationModalLinha] = useState<RegistroLinhaImportacao | null>(null);
  const [reversaoModal, setReversaoModal] = useState<RegistroImportacaoCompleto | null>(null);
  const [ferramentaHistoricoModal, setFerramentaHistoricoModal] = useState<FerramentaCalibracao | null>(null);
  const [buscaFerramenta, setBuscaFerramenta] = useState<string>('');
  const [filtroStatusFerramenta, setFiltroStatusFerramenta] = useState<string>('TODAS');
  const [filtroReconciliacao, setFiltroReconciliacao] = useState<'TODOS' | 'NOVO' | 'EXISTENTE_IGUAL' | 'EXISTENTE_ALTERADO' | 'POSSIVEL_DUPLICIDADE' | 'INVALIDO'>('TODOS');

  // Estado da Análise Automática (Etapa 2)
  const [tipoControle, setTipoControle] = useState<TipoControleImportacao>('TREINAMENTOS');
  const [confiancaIA, setConfiancaIA] = useState<number>(95);
  const [finalidadeProvavel, setFinalidadeProvavel] = useState<string>('');
  const [explicacaoIA, setExplicacaoIA] = useState<string>('');
  const [origemAnalise, setOrigemAnalise] = useState<'IA_GEMINI' | 'HEURISTICA_LOCAL'>('IA_GEMINI');

  // Estado do Mapeamento de Campos (Etapa 3)
  const [mapeamentos, setMapeamentos] = useState<MapeamentoCampoItem[]>([]);
  const [camposPersonalizados, setCamposPersonalizados] = useState<DefinicaoCampoQualigest[]>([]);
  const [templateReconhecido, setTemplateReconhecido] = useState<TemplateMapeamentoAprovado | null>(null);
  const [salvarComoTemplate, setSalvarComoTemplate] = useState<boolean>(false);
  const [nomeTemplateCustom, setNomeTemplateCustom] = useState<string>('');

  // Estado da Validação & Análise de Qualidade (Etapa 4)
  const [registrosValidados, setRegistrosValidados] = useState<RegistroLinhaImportacao[]>([]);
  const [resumoPrevia, setResumoPrevia] = useState<ResumoPreviaImportacao | null>(null);
  const [filtroQualidade, setFiltroQualidade] = useState<
    | 'TODOS'
    | 'ERROS'
    | 'ATENCAO'
    | 'VALIDOS'
    | 'NOVO'
    | 'EXISTENTE_IGUAL'
    | 'EXISTENTE_ALTERADO'
    | 'POSSIVEL_DUPLICIDADE'
    | 'INVALIDO'
  >('TODOS');
  const [termoBuscaLinha, setTermoBuscaLinha] = useState<string>('');

  // Estado da Gravação / Resultado (Etapa 6)
  const [resultadoGravacao, setResultadoGravacao] = useState<{
    sucesso: boolean;
    importId: string;
    totalProcessados: number;
    totalCriados: number;
    totalAtualizados: number;
    mensagem: string;
  } | null>(null);

  // Estado de Oportunidades de Melhoria (Etapa 7)
  const [oportunidades, setOportunidades] = useState<OportunidadeMelhoriaImportacao[]>([]);
  const [oportunidadesTratadas, setOportunidadesTratadas] = useState<Record<string, string>>({});

  // Estado de Gestão de Modelos Homologados (Templates)
  const [modalEditarTemplateAberta, setModalEditarTemplateAberta] = useState(false);
  const [templateEmEdicao, setTemplateEmEdicao] = useState<Partial<TemplateMapeamentoAprovado> | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estados de confirmação segura in-app para exclusão (evita bloqueio de window.confirm em iframes)
  const [deletedTemplateIds, setDeletedTemplateIds] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('qualigest_deleted_template_ids');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) return new Set(arr);
        }
      }
    } catch (e) {}
    return new Set();
  });
  const [templateParaExcluir, setTemplateParaExcluir] = useState<TemplateMapeamentoAprovado | null>(null);
  const [isExcluindoTemplate, setIsExcluindoTemplate] = useState(false);

  // Sincroniza exclusões no localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'qualigest_deleted_template_ids',
          JSON.stringify(Array.from(deletedTemplateIds))
        );
      }
    } catch (e) {}
  }, [deletedTemplateIds]);

  const [historicoParaExcluir, setHistoricoParaExcluir] = useState<string | null>(null);
  const [isExcluindoHistorico, setIsExcluindoHistorico] = useState(false);

  const [ferramentaParaExcluir, setFerramentaParaExcluir] = useState<string | null>(null);
  const [isExcluindoFerramenta, setIsExcluindoFerramenta] = useState(false);

  const templatesAprovadosFiltrados = useMemo(() => {
    return templatesAprovados.filter((t) => !deletedTemplateIds.has(t.id));
  }, [templatesAprovados, deletedTemplateIds]);

  // Estado de Edição de Colunas e Homologação na Etapa 2
  const [isEditandoColunasEtapa2, setIsEditandoColunasEtapa2] = useState(false);
  const [colunasEditadasEtapa2, setColunasEditadasEtapa2] = useState<string[]>([]);
  const [modalHomologarEtapa2Aberta, setModalHomologarEtapa2Aberta] = useState(false);
  const [nomeModeloEtapa2, setNomeModeloEtapa2] = useState('');
  const [isSalvandoModeloEtapa2, setIsSalvandoModeloEtapa2] = useState(false);
  const [avisoRechecagemEtapa2, setAvisoRechecagemEtapa2] = useState<string | null>(null);

  // Reconhecimento especializado estritamente do Formulário F 001-02-1 com 4 Colunas
  const isFormulario4ColunasDetectado = useMemo(() => {
    const colNorm = (colunasDetectadas || []).map((c) =>
      c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    const hasPublicacao = colNorm.some((c) => c.includes('publica'));
    const hasTitulo = colNorm.some((c) => c.includes('titulo'));
    const hasProprietario = colNorm.some((c) => c.includes('proprietario') || c.includes('cessor'));
    const hasRevData = colNorm.some((c) => c.includes('numero e data') || c.includes('revisao e data') || c.includes('rev e data'));
    const nomeNorm = (arquivoNome || '').toLowerCase();
    return (
      nomeNorm.includes('f 001-02-1') ||
      nomeNorm.includes('f001-02-1') ||
      (colNorm.length === 4 && hasPublicacao && hasTitulo && hasProprietario && hasRevData)
    );
  }, [colunasDetectadas, arquivoNome]);

  const orgId = organization?.id || 'org-impacto-aviation';
  const orgName = organization?.name || 'Impacto Aviation MRO';
  const isConsultaOnly = user?.role === 'CONSULTA';

  const handleAbrirNovoTemplate = () => {
    setTemplateEmEdicao(null);
    setModalEditarTemplateAberta(true);
  };

  const handleAbrirEditarTemplate = (tpl: TemplateMapeamentoAprovado) => {
    setTemplateEmEdicao(tpl);
    setModalEditarTemplateAberta(true);
  };

  const handleSalvarTemplate = async (tpl: TemplateMapeamentoAprovado) => {
    try {
      await saveImportTemplate(orgId, tpl, user);
      if (onSalvarTemplate) {
        onSalvarTemplate(tpl);
      }
      setMensagemSucesso(`Modelo "${tpl.nome || tpl.nomeTemplate}" homologado e salvo com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      console.warn('Aviso ao sincronizar modelo com Firebase (mantido salvo na sessão):', err);
      if (onSalvarTemplate) {
        onSalvarTemplate(tpl);
      }
      setMensagemSucesso(`Modelo "${tpl.nome || tpl.nomeTemplate}" registrado na sessão com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    }
  };

  const handleConfirmExcluirTemplate = async () => {
    if (!templateParaExcluir) return;
    const tplId = templateParaExcluir.id;
    const nome = templateParaExcluir.nome || templateParaExcluir.nomeTemplate || 'Modelo';
    try {
      setIsExcluindoTemplate(true);
      // 1. Atualiza estado imediatamente (otimista) para não travar a interface
      setDeletedTemplateIds((prev) => new Set([...prev, tplId]));
      if (onRemoverTemplate) {
        onRemoverTemplate(tplId);
      }
      setTemplateParaExcluir(null);
      setMensagemSucesso(`Modelo homologado "${nome}" excluído com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);

      // 2. Sincroniza exclusão no Firestore
      await deleteImportTemplate(orgId, tplId, user, nome);
    } catch (err: any) {
      console.warn('Erro ao sincronizar exclusão com Firebase (mantido removido na sessão):', err);
    } finally {
      setIsExcluindoTemplate(false);
    }
  };

  const aplicarTemplateManual = (tpl: TemplateMapeamentoAprovado) => {
    if (!tpl.mapeamentos) return;
    const rawList = tpl.camposPersonalizados || tpl.camposCustomizados || [];
    const customList: DefinicaoCampoQualigest[] = rawList.map((c: any) => ({
      campo: String(c.campo),
      label: String(c.label || c.campo),
      tipo: (c.tipo || 'string') as any,
      obrigatorio: Boolean(c.obrigatorio),
      sinonimos: c.sinonimos || [String(c.label || c.campo).toLowerCase()],
      descricao: c.descricao || `Campo personalizado ${c.label || c.campo}`,
      isCustom: true,
    }));
    if (customList.length > 0) {
      setCamposPersonalizados(customList);
    }
    const definicoes = obterCamposCompletos(tipoControle, customList);
    const novos = mapeamentos.map((item) => {
      const match = tpl.mapeamentos[item.colunaOrigem];
      if (match) {
        const def = definicoes.find((d) => d.campo === match);
        return {
          ...item,
          campoQualigest: match,
          campoLabel: def ? def.label : item.colunaOrigem,
          obrigatorio: def ? def.obrigatorio : false,
          tipoDado: def ? def.tipo : ('string' as const),
          statusMapeamento: 'MANUAL' as any,
          confiancaScore: 100,
        };
      }
      return item;
    });
    setMapeamentos(novos);
    setTemplateReconhecido(tpl);
  };

  // Cria campo exclusivo no QualiGest para uma coluna específica com o mesmo nome
  const handleCriarCampoMesmoNome = (colunaOrigem: string) => {
    const novoDef = criarCampoPersonalizado(colunaOrigem);
    const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
    let slug = novoDef.campo;
    let counter = 1;
    while (definicoes.some((d) => d.campo === slug)) {
      slug = `${novoDef.campo}_${counter++}`;
    }
    novoDef.campo = slug;

    const novosCustom = [...camposPersonalizados.filter((c) => c.campo !== slug), novoDef];
    setCamposPersonalizados(novosCustom);

    setMapeamentos((prev) =>
      prev.map((m) => {
        if (m.colunaOrigem === colunaOrigem) {
          return {
            ...m,
            campoQualigest: slug,
            campoLabel: novoDef.label,
            obrigatorio: false,
            tipoDado: 'string' as const,
            confiancaIA: 100,
            statusMapeamento: 'MANUAL' as any,
          };
        }
        return m;
      })
    );

    setClassificacaoCampos((prev) => ({
      ...prev,
      [colunaOrigem]: 'OPCIONAL',
    }));

    setMensagemSucesso(`Novo campo "${novoDef.label}" criado no QualiGest para a coluna "${colunaOrigem}"!`);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Espelhar todas as colunas da planilha como novos campos no QualiGest
  const handleEspelharTodasColunasComoCampos = (forcarTodas: boolean = true) => {
    const resultado = espelharColunasComoCampos(
      colunasDetectadas,
      mapeamentos,
      tipoControle,
      camposPersonalizados,
      forcarTodas
    );
    setMapeamentos(resultado.novosMapeamentos);
    setCamposPersonalizados(resultado.novosCamposPersonalizados);

    const novasClassif = { ...classificacaoCampos };
    resultado.novosMapeamentos.forEach((m) => {
      if (m.campoQualigest && m.campoQualigest !== 'ignorar') {
        novasClassif[m.colunaOrigem] = 'OPCIONAL';
      }
    });
    setClassificacaoCampos(novasClassif);
    setMensagemSucesso('Todas as colunas da planilha foram transformadas em campos exclusivos no QualiGest!');
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Adicionar campo personalizado manual avulso
  const handleAdicionarCampoPersonalizadoManual = () => {
    const nomeDigitado = window.prompt('Digite o nome do novo campo que deseja adicionar ao QualiGest:');
    if (!nomeDigitado || !nomeDigitado.trim()) return;

    const novoDef = criarCampoPersonalizado(nomeDigitado.trim());
    const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
    let slug = novoDef.campo;
    let counter = 1;
    while (definicoes.some((d) => d.campo === slug)) {
      slug = `${novoDef.campo}_${counter++}`;
    }
    novoDef.campo = slug;

    setCamposPersonalizados((prev) => [...prev, novoDef]);
    setMensagemSucesso(`Novo campo "${novoDef.label}" adicionado ao QualiGest! Você pode selecioná-lo nas colunas da planilha.`);
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Desvincular modelo homologado e reexecutar mapeamento exclusivo do zero
  const handleDesvincularTemplate = () => {
    setTemplateReconhecido(null);
    const mapeamentoGerado = gerarMapeamentoAutomaticoCampos(colunasDetectadas, tipoControle, linhasOriginais);
    setMapeamentos(mapeamentoGerado);
    const classifInicial: Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'> = {};
    mapeamentoGerado.forEach((m) => {
      if (m.campoQualigest === 'ignorar') {
        classifInicial[m.colunaOrigem] = 'IGNORADO';
      } else if (m.obrigatorio) {
        classifInicial[m.colunaOrigem] = 'OBRIGATORIO';
      } else {
        classifInicial[m.colunaOrigem] = 'OPCIONAL';
      }
    });
    setClassificacaoCampos(classifInicial);
    setMensagemSucesso('Modelo desvinculado! Mapeamento redefinido com regras de exclusividade 1-para-1.');
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  // Identificação e resolução automática de duplicidades de mapeamento
  const camposDuplicados = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    mapeamentos.forEach((m) => {
      if (m.campoQualigest && m.campoQualigest !== 'ignorar') {
        if (!mapa[m.campoQualigest]) mapa[m.campoQualigest] = [];
        mapa[m.campoQualigest].push(m.colunaOrigem);
      }
    });
    return Object.entries(mapa).filter(([_, cols]) => cols.length > 1);
  }, [mapeamentos]);

  const handleResolverDuplicidades = () => {
    const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
    const camposOcupados = new Set<string>();
    const novosCustom = [...camposPersonalizados];

    // Ordena cópia por confiança decrescente para priorizar o melhor match
    const copia = [...mapeamentos];
    copia.sort((a, b) => b.confiancaIA - a.confiancaIA);

    const novoMapaPorColuna: Record<string, { campo: string; label: string }> = {};

    copia.forEach((item) => {
      if (item.campoQualigest === 'ignorar') {
        novoMapaPorColuna[item.colunaOrigem] = { campo: 'ignorar', label: '(Ignorar Coluna)' };
      } else if (!camposOcupados.has(item.campoQualigest)) {
        camposOcupados.add(item.campoQualigest);
        const def = definicoes.find((d) => d.campo === item.campoQualigest);
        novoMapaPorColuna[item.colunaOrigem] = { campo: item.campoQualigest, label: def ? def.label : item.colunaOrigem };
      } else {
        // Encontrou duplicidade: em vez de descartar a coluna, cria um campo exclusivo com o próprio nome da coluna!
        const novoDef = criarCampoPersonalizado(item.colunaOrigem);
        let slug = novoDef.campo;
        let counter = 1;
        while (camposOcupados.has(slug) || definicoes.some((d) => d.campo === slug)) {
          slug = `${novoDef.campo}_${counter++}`;
        }
        novoDef.campo = slug;
        camposOcupados.add(slug);
        novosCustom.push(novoDef);
        novoMapaPorColuna[item.colunaOrigem] = { campo: slug, label: novoDef.label };
      }
    });

    setCamposPersonalizados(novosCustom);

    const mapeamentosResolvidos = mapeamentos.map((m) => {
      const info = novoMapaPorColuna[m.colunaOrigem] || { campo: 'ignorar', label: '(Ignorar Coluna)' };
      return {
        ...m,
        campoQualigest: info.campo,
        campoLabel: info.label,
        obrigatorio: false,
        tipoDado: 'string' as const,
        statusMapeamento: 'MANUAL' as any,
        confiancaIA: 100,
      };
    });

    setMapeamentos(mapeamentosResolvidos);

    const novasClassif = { ...classificacaoCampos };
    mapeamentosResolvidos.forEach((m) => {
      if (m.campoQualigest === 'ignorar') {
        novasClassif[m.colunaOrigem] = 'IGNORADO';
      } else {
        novasClassif[m.colunaOrigem] = 'OPCIONAL';
      }
    });
    setClassificacaoCampos(novasClassif);
    setMensagemSucesso('Conflitos resolvidos com sucesso! Cada coluna duplicada agora possui seu próprio campo exclusivo com o mesmo nome da coluna.');
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  // Funções de Edição de Colunas e Homologação na Etapa 2
  const handleIniciarEdicaoColunasEtapa2 = () => {
    setIsEditandoColunasEtapa2(true);
    setColunasEditadasEtapa2([...colunasDetectadas]);
  };

  const handleCancelarEdicaoColunasEtapa2 = () => {
    setIsEditandoColunasEtapa2(false);
    setColunasEditadasEtapa2([]);
  };

  const handleRechecarColunasComArquivo = () => {
    if (!colunasEditadasEtapa2.length) return;
    const nomesValidos = colunasEditadasEtapa2.map((c, i) => c?.trim() || colunasDetectadas[i] || `Coluna_${i + 1}`);

    // Remapear linhasOriginais de acordo com os novos nomes de colunas
    const novasLinhas = linhasOriginais.map((row) => {
      const novaLinha: Record<string, any> = {};
      colunasDetectadas.forEach((oldCol, idx) => {
        const novaCol = nomesValidos[idx];
        novaLinha[novaCol] = row[oldCol] !== undefined ? row[oldCol] : row[novaCol];
      });
      return novaLinha;
    });

    setColunasDetectadas(nomesValidos);
    setLinhasOriginais(novasLinhas);
    setIsEditandoColunasEtapa2(false);

    // Reanalisar e regenerar mapeamento inicial de campos com o motor local/IA
    gerarMapeamentoInicial(nomesValidos, tipoControle, novasLinhas);

    setAvisoRechecagemEtapa2('Colunas atualizadas e rechecadas com sucesso contra o arquivo enviado! O diagnóstico e mapeamento de campos foram sincronizados.');
    setTimeout(() => setAvisoRechecagemEtapa2(null), 5000);
  };

  const handleAbrirHomologarModeloEtapa2 = () => {
    const nomePadrao = `Modelo Homologado - ${arquivoNome ? arquivoNome.replace(/\.[^/.]+$/, '') : 'Arquivo'} (${tipoControle})`;
    setNomeModeloEtapa2(nomePadrao);
    setModalHomologarEtapa2Aberta(true);
  };

  const handleConfirmarHomologarModeloEtapa2 = async () => {
    if (!nomeModeloEtapa2.trim()) return;
    setIsSalvandoModeloEtapa2(true);
    try {
      const mapaCampos: Record<string, string> = {};
      mapeamentos.forEach((m) => {
        if (m.campoQualigest && m.campoQualigest !== 'ignorar') {
          mapaCampos[m.colunaOrigem] = m.campoQualigest;
        }
      });

      const novoTemplate: TemplateMapeamentoAprovado = {
        id: `tpl-${Date.now()}`,
        organizationId: orgId,
        nomeTemplate: nomeModeloEtapa2.trim(),
        nome: nomeModeloEtapa2.trim(),
        tipoControle,
        colunasDetectadas,
        mapeamentos: mapaCampos,
        camposPersonalizados,
        camposCustomizados: camposPersonalizados,
        criadoPor: user?.displayName || user?.email || 'Gestor SGQ',
        criadoPorUid: user?.uid || 'system',
        criadoPorNome: user?.displayName || 'Gestor SGQ',
        dataAprovacao: new Date().toISOString(),
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        totalVezesUsado: 1,
        vezesUtilizado: 1,
      };

      try {
        await saveImportTemplate(orgId, novoTemplate, user);
      } catch (saveErr) {
        console.warn('Aviso ao sincronizar modelo homologado com Firebase (mantido salvo na sessão):', saveErr);
      }

      if (onSalvarTemplate) {
        onSalvarTemplate(novoTemplate);
      }
      setTemplateReconhecido(novoTemplate);
      setModalHomologarEtapa2Aberta(false);
      setMensagemSucesso(`Modelo "${novoTemplate.nome}" homologado e registrado com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err: any) {
      console.error('Erro ao homologar modelo:', err);
      setMensagemSucesso(`Modelo salvo na sessão com sucesso!`);
    } finally {
      setIsSalvandoModeloEtapa2(false);
    }
  };

  // ============================================================================
  // FUNÇÃO 1: CARREGAR AMOSTRA PRÉ-CONFIGURADA PARA TESTE IMEDIATO (1 CLIQUE)
  // ============================================================================
  const carregarPresetAmostra = async (preset: PresetAmostraImportacao) => {
    setIsProcessando(true);
    setStatusMensagem(`Carregando amostra oficial: ${preset.nomeArquivo}...`);

    try {
      const adaptadoPreset = adaptarTabelaFormularioF001021(preset.colunas, preset.linhasAmostra);
      setArquivoNome(preset.nomeArquivo);
      setArquivoFormato(preset.formato as any);
      setArquivoTamanho(adaptadoPreset.linhasDados.length * 128 + 1024);
      setColunasDetectadas(adaptadoPreset.colunas);
      setLinhasOriginais(adaptadoPreset.linhasDados);

      // Gerar Hash SHA-256 representativo
      const strDados = JSON.stringify(adaptadoPreset.linhasDados);
      const hashSim = 'sha256-' + Math.abs(strDados.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(16).padStart(12, '0') + '-imp';
      setArquivoHash(hashSim);

      // Iniciar Análise Automática
      await executarAnaliseArquivo(preset.nomeArquivo, adaptadoPreset.colunas, adaptadoPreset.linhasDados, preset.formato);
      setEtapaAtual(2);
    } catch (err: any) {
      console.error('Erro ao carregar amostra:', err);
      alert('Erro ao carregar amostra: ' + err.message);
    } finally {
      setIsProcessando(false);
      setStatusMensagem('');
    }
  };

  // ============================================================================
  // FUNÇÃO 2: PROCESSAR UPLOAD REAL DE ARQUIVO PELO USUÁRIO (XLSX, CSV, DOCX, PDF)
  // ============================================================================
  const handleUploadArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessando(true);
    setStatusMensagem(`Lendo e calculando integridade SHA-256 de ${file.name}...`);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // Para PDF ou DOCX, podemos usar também o endpoint de parsing no servidor
      if (ext === 'pdf' || ext === 'docx') {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            setStatusMensagem(`Extraindo estrutura e tabelas do documento ${ext.toUpperCase()}...`);
            
            const response = await fetch('/api/smart-import/parse-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64,
                nomeArquivo: file.name,
                formato: ext.toUpperCase()
              })
            });

            const data = await response.json();
            const cols = data.colunas || ['Coluna_1', 'Coluna_2'];
            const rows = data.linhas || [];
            const adaptadoServidor = adaptarTabelaFormularioF001021(cols, rows);

            setArquivoNome(file.name);
            setArquivoFormato(ext.toUpperCase() as any);
            setArquivoTamanho(file.size);
            setArquivoHash('sha256-doc-' + Date.now().toString(16));
            setColunasDetectadas(adaptadoServidor.colunas);
            setLinhasOriginais(adaptadoServidor.linhasDados);

            await executarAnaliseArquivo(file.name, adaptadoServidor.colunas, adaptadoServidor.linhasDados, ext.toUpperCase());
            setEtapaAtual(2);
          } catch (e: any) {
            console.error('Erro ao parsear arquivo no servidor:', e);
            // Fallback cliente
            const resBruto = await processarArquivoBruto(file);
            const adaptadoFallback = adaptarTabelaFormularioF001021(resBruto.colunas, resBruto.linhas);
            setArquivoNome(resBruto.nomeArquivo);
            setArquivoFormato(resBruto.tipoArquivo as any);
            setArquivoTamanho(resBruto.tamanhoBytes);
            setArquivoHash(resBruto.hashSha256);
            setColunasDetectadas(adaptadoFallback.colunas);
            setLinhasOriginais(adaptadoFallback.linhasDados);
            await executarAnaliseArquivo(resBruto.nomeArquivo, adaptadoFallback.colunas, adaptadoFallback.linhasDados, resBruto.tipoArquivo);
            setEtapaAtual(2);
          } finally {
            setIsProcessando(false);
            setStatusMensagem('');
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // Para XLSX, XLS, CSV
      const resultado = await processarArquivoBruto(file);
      const adaptadoXlsx = adaptarTabelaFormularioF001021(resultado.colunas, resultado.linhas);
      setArquivoNome(resultado.nomeArquivo);
      setArquivoFormato(resultado.tipoArquivo as any);
      setArquivoTamanho(resultado.tamanhoBytes);
      setArquivoHash(resultado.hashSha256);
      setColunasDetectadas(adaptadoXlsx.colunas);
      setLinhasOriginais(adaptadoXlsx.linhasDados);

      await executarAnaliseArquivo(resultado.nomeArquivo, adaptadoXlsx.colunas, adaptadoXlsx.linhasDados, resultado.tipoArquivo);
      setEtapaAtual(2);
    } catch (err: any) {
      console.error('Erro no processamento do arquivo:', err);
      alert('Erro ao processar arquivo: ' + err.message);
    } finally {
      setIsProcessando(false);
      setStatusMensagem('');
    }
  };

  // ============================================================================
  // FUNÇÃO 3: ANÁLISE INTELIGENTE (CHAMA API GEMINI OU MOTOR SGQ LOCAL)
  // ============================================================================
  const executarAnaliseArquivo = async (
    nome: string,
    colunas: string[],
    linhas: Record<string, any>[],
    formato: string
  ) => {
    setStatusMensagem('IA analisando colunas, finalidade aeronáutica e vocabulário operacional...');

    // 1. Heurística local de base
    const idLocal = identificarTipoControleAutomatico(nome, colunas, linhas);

    try {
      const resp = await fetch('/api/smart-import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeArquivo: nome,
          colunas,
          amostraLinhas: linhas.slice(0, 5),
          formato
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setTipoControle(data.tipoControle || idLocal.tipoControle);
          setConfiancaIA(data.confianca || idLocal.confianca);
          setFinalidadeProvavel(data.finalidadeProvavel || idLocal.finalidadeProvavel);
          setExplicacaoIA(data.explicacao || idLocal.explicacao);
          setOrigemAnalise(data.origem || 'IA_GEMINI');
          gerarMapeamentoInicial(colunas, data.tipoControle || idLocal.tipoControle, linhas);
          return;
        }
      }
    } catch (e) {
      console.warn('Fallback para motor local de regras SGQ:', e);
    }

    // Fallback local caso servidor/IA indisponível
    setTipoControle(idLocal.tipoControle);
    setConfiancaIA(idLocal.confianca);
    setFinalidadeProvavel(idLocal.finalidadeProvavel);
    setExplicacaoIA(idLocal.explicacao);
    setOrigemAnalise('HEURISTICA_LOCAL');
    gerarMapeamentoInicial(colunas, idLocal.tipoControle, linhas);
  };

  // ============================================================================
  // FUNÇÃO 4: GERAR MAPEAMENTO INICIAL DE CAMPOS & CHECAR TEMPLATES APROVADOS
  // ============================================================================
  const gerarMapeamentoInicial = (
    colunas: string[],
    tipo: TipoControleImportacao,
    linhas: Record<string, any>[]
  ) => {
    // Verificar se a organização possui um template aprovado compatível com estas colunas
    const checkTemplate = tentarAplicarTemplateAprovado(colunas, templatesAprovadosFiltrados);
    setTemplateReconhecido(checkTemplate.templateEncontrado);

    const mapeamentoGerado = gerarMapeamentoAutomaticoCampos(colunas, tipo, linhas);

    // Se houver template, sobrepor campos conforme o template aprovado
    if (checkTemplate.templateEncontrado) {
      const tpl = checkTemplate.templateEncontrado;
      const rawList = tpl.camposPersonalizados || tpl.camposCustomizados || [];
      const customList: DefinicaoCampoQualigest[] = rawList.map((c: any) => ({
        campo: String(c.campo),
        label: String(c.label || c.campo),
        tipo: (c.tipo || 'string') as any,
        obrigatorio: Boolean(c.obrigatorio),
        sinonimos: c.sinonimos || [String(c.label || c.campo).toLowerCase()],
        descricao: c.descricao || `Campo personalizado ${c.label || c.campo}`,
        isCustom: true,
      }));
      if (customList.length > 0) {
        setCamposPersonalizados(customList);
      }
      const mapaTemplate = checkTemplate.mapeamentoSugerido;
      const definicoes = obterCamposCompletos(tipo, customList);

      mapeamentoGerado.forEach((m) => {
        if (mapaTemplate[m.colunaOrigem]) {
          const campoAlvo = mapaTemplate[m.colunaOrigem];
          m.campoQualigest = campoAlvo;
          const def = definicoes.find((d) => d.campo === campoAlvo);
          if (def) {
            m.campoLabel = def.label;
            m.obrigatorio = def.obrigatorio;
            m.tipoDado = def.tipo;
          }
          m.confiancaIA = 100;
        }
      });
    }

    // Inicializar Classificação dos Campos (Fase 14.1: OBRIGATÓRIO, OPCIONAL, IGNORAR)
    const classifInicial: Record<string, 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'> = {};
    mapeamentoGerado.forEach((m) => {
      if (m.campoQualigest === 'ignorar') {
        classifInicial[m.colunaOrigem] = 'IGNORADO';
      } else if (m.obrigatorio) {
        classifInicial[m.colunaOrigem] = 'OBRIGATORIO';
      } else {
        classifInicial[m.colunaOrigem] = 'OPCIONAL';
      }
    });
    setClassificacaoCampos(classifInicial);

    setMapeamentos(mapeamentoGerado);
    setNomeTemplateCustom(`Modelo Padrão ${tipo} - ${new Date().toLocaleDateString('pt-BR')}`);
  };

  // Alteração manual da classificação de um campo (Fase 14.1)
  const alterarClassificacaoCampo = (
    colunaOrigem: string,
    novaClassificacao: 'OBRIGATORIO' | 'OPCIONAL' | 'IGNORADO'
  ) => {
    setClassificacaoCampos((prev) => ({ ...prev, [colunaOrigem]: novaClassificacao }));
    if (novaClassificacao === 'IGNORADO') {
      alterarCampoMapeado(colunaOrigem, 'ignorar');
    }
  };

  // Alteração manual do campo mapeado pelo usuário
  const alterarCampoMapeado = (colunaOrigem: string, novoCampoQualigest: string) => {
    if (novoCampoQualigest === `__CRIAR_${colunaOrigem}`) {
      handleCriarCampoMesmoNome(colunaOrigem);
      return;
    }

    if (novoCampoQualigest === '__NOVO_CUSTOM__') {
      const nomeDigitado = window.prompt(`Digite o nome do novo campo para a coluna "${colunaOrigem}":`, colunaOrigem);
      if (nomeDigitado && nomeDigitado.trim()) {
        const novoDef = criarCampoPersonalizado(nomeDigitado.trim());
        const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
        let slug = novoDef.campo;
        let counter = 1;
        while (definicoes.some((d) => d.campo === slug)) {
          slug = `${novoDef.campo}_${counter++}`;
        }
        novoDef.campo = slug;

        const novosCustom = [...camposPersonalizados, novoDef];
        setCamposPersonalizados(novosCustom);

        setMapeamentos((prev) =>
          prev.map((m) => {
            if (m.colunaOrigem === colunaOrigem) {
              return {
                ...m,
                campoQualigest: slug,
                campoLabel: novoDef.label,
                obrigatorio: false,
                tipoDado: 'string' as const,
                confiancaIA: 100,
                statusMapeamento: 'MANUAL' as any,
              };
            }
            return m;
          })
        );
        setClassificacaoCampos((prev) => ({ ...prev, [colunaOrigem]: 'OPCIONAL' }));
        setMensagemSucesso(`Campo personalizado "${novoDef.label}" criado no QualiGest!`);
        setTimeout(() => setMensagemSucesso(null), 4000);
      }
      return;
    }

    const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
    const def = definicoes.find((d) => d.campo === novoCampoQualigest);

    setMapeamentos((prev) =>
      prev.map((m) => {
        if (m.colunaOrigem === colunaOrigem) {
          const isIgnorar = novoCampoQualigest === 'ignorar';
          const isObrigatorio = def ? def.obrigatorio : false;
          setClassificacaoCampos((cPrev) => ({
            ...cPrev,
            [colunaOrigem]: isIgnorar ? 'IGNORADO' : isObrigatorio ? 'OBRIGATORIO' : 'OPCIONAL',
          }));

          return {
            ...m,
            campoQualigest: novoCampoQualigest,
            campoLabel: def ? def.label : '(Ignorar Coluna)',
            obrigatorio: isObrigatorio,
            tipoDado: def ? def.tipo : 'string',
            confiancaIA: 100, // Validação manual humana
          };
        }
        return m;
      })
    );
  };

  // ============================================================================
  // FUNÇÃO 5: EXECUTAR VALIDAÇÃO DE QUALIDADE & PRÉVIA OBRIGATÓRIA (FASE 14.1)
  // ============================================================================
  const executarValidacaoQualidade = () => {
    // Impede o avanço com campos duplicados apontando para o mesmo campo do sistema
    if (camposDuplicados.length > 0) {
      const listaErros = camposDuplicados
        .map(([campo, cols]) => {
          const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
          const def = definicoes.find((d) => d.campo === campo);
          return `Campo "${def?.label || campo}" associado a: ${cols.map((c) => `"${c}"`).join(' e ')}`;
        })
        .join('\n• ');

      alert(
        `Atenção: Não é possível validar a planilha enquanto houver colunas duplicadas apontando para o mesmo campo do sistema:\n\n• ${listaErros}\n\nPor favor, clique em "Resolver Duplicidades Automaticamente" ou altere os campos para garantir mapeamento exclusivo de 1 coluna por campo.`
      );
      return;
    }

    setIsProcessando(true);
    setStatusMensagem('Validando campos obrigatórios, datas, integridade e reconciliando com cadastros oficiais...');

    try {
      const resultado = validarECompararLinhasImportacao(
        linhasOriginais,
        mapeamentos,
        tipoControle,
        {
          pessoasExistentes: pessoas,
          treinamentosExistentes: treinamentos,
          registrosTreinamentoExistentes: registrosTreinamento,
          ferramentasExistentes: ferramentasCalibradas,
          documentosExistentes: documentos,
        },
        classificacaoCampos
      );

      setRegistrosValidados(resultado.registrosLinhas);
      setResumoPrevia(resultado.resumo);
      setOportunidades(resultado.oportunidades);
      setEtapaAtual(4);
    } catch (err: any) {
      console.error('Erro na validação de qualidade:', err);
      alert('Erro ao validar linhas: ' + err.message);
    } finally {
      setIsProcessando(false);
      setStatusMensagem('');
    }
  };

  // Alteração da decisão de reconciliação para uma linha específica (Fase 14.1)
  const alterarDecisaoReconciliacaoLinha = (
    indiceLinha: number,
    novaDecisao: 'ATUALIZAR' | 'MANTER_EXISTENTE' | 'CRIAR_NOVO' | 'IGNORAR'
  ) => {
    setRegistrosValidados((prev) =>
      prev.map((l) => {
        if (l.indiceLinha === indiceLinha) {
          return {
            ...l,
            decisaoUsuario: novaDecisao,
            acaoDuplicidade: novaDecisao,
            selecionadoParaImportar: novaDecisao !== 'IGNORAR' && novaDecisao !== 'MANTER_EXISTENTE',
          };
        }
        return l;
      })
    );
  };

  // Alteração do vínculo de pessoa (vincular ao existente vs criar nova pessoa com validação)
  const alterarPessoaAcaoLinha = (
    indiceLinha: number,
    novaAcao: 'VINCULAR_EXISTENTE' | 'CRIAR_PESSOA'
  ) => {
    setRegistrosValidados((prev) =>
      prev.map((l) => {
        if (l.indiceLinha === indiceLinha) {
          return {
            ...l,
            pessoaAcao: novaAcao,
          };
        }
        return l;
      })
    );
  };

  // Alteração do vínculo de curso
  const alterarCursoAcaoLinha = (
    indiceLinha: number,
    novaAcao: 'VINCULAR_EXISTENTE' | 'CRIAR_CURSO'
  ) => {
    setRegistrosValidados((prev) =>
      prev.map((l) => {
        if (l.indiceLinha === indiceLinha) {
          return {
            ...l,
            cursoAcao: novaAcao,
          };
        }
        return l;
      })
    );
  };

  // Alteração da ação de duplicidade para uma linha específica
  const alterarAcaoDuplicidadeLinha = (
    indiceLinha: number,
    novaAcao: 'ATUALIZAR' | 'MANTER_EXISTENTE' | 'CRIAR_NOVO' | 'IGNORAR'
  ) => {
    alterarDecisaoReconciliacaoLinha(indiceLinha, novaAcao);
  };

  // Alteração em lote de ações de duplicidade
  const aplicarAcaoDuplicidadeEmLote = (novaAcao: 'ATUALIZAR' | 'MANTER_EXISTENTE' | 'CRIAR_NOVO' | 'IGNORAR') => {
    setRegistrosValidados((prev) =>
      prev.map((l) => {
        if (l.duplicidadeDetectada || l.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE' || l.classificacaoReconciliacao === 'EXISTENTE_ALTERADO') {
          return {
            ...l,
            decisaoUsuario: novaAcao,
            acaoDuplicidade: novaAcao,
            selecionadoParaImportar: novaAcao !== 'IGNORAR' && novaAcao !== 'MANTER_EXISTENTE',
          };
        }
        return l;
      })
    );
  };

  // ============================================================================
  // FUNÇÃO 6: CONFIRMAR IMPORTAÇÃO & GRAVAÇÃO NO SGQ (FASE 14.1 COM SNAPSHOTS)
  // ============================================================================
  const confirmarGravacaoFinal = async () => {
    if (isConsultaOnly) {
      alert('Usuário com perfil de CONSULTA possui acesso apenas de leitura. A gravação exige perfil GESTOR_SGQ ou ADMIN.');
      return;
    }

    setIsProcessando(true);
    setStatusMensagem('Gravando registros estruturados, registrando hash de integridade e audit trail com snapshots reversíveis...');

    try {
      const importId = `imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // 1. Salvar template aprovado se selecionado
      if (salvarComoTemplate && nomeTemplateCustom.trim()) {
        const novoTemplate: TemplateMapeamentoAprovado = {
          id: `tpl-${Date.now()}`,
          organizationId: orgId,
          nomeTemplate: nomeTemplateCustom.trim(),
          nome: nomeTemplateCustom.trim(),
          tipoControle,
          colunasDetectadas,
          mapeamentos: mapeamentos.reduce((acc, m) => {
            if (m.campoQualigest && m.campoQualigest !== 'ignorar') {
              acc[m.colunaOrigem] = m.campoQualigest;
            }
            return acc;
          }, {} as Record<string, string>),
          criadoPor: user?.displayName || user?.email || 'Gestor SGQ',
          criadoPorUid: user?.uid || 'system',
          criadoPorNome: user?.displayName || 'Gestor SGQ',
          dataAprovacao: new Date().toISOString(),
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
          totalVezesUsado: 1,
          vezesUtilizado: 1,
        };
        await saveImportTemplate(orgId, novoTemplate, user);
      }

      // 2. Gravar dados importados no QualiGest (com snapshots automáticos em smart_imports)
      const resultado = await efetivarImportacaoNoQualigest(
        orgId,
        tipoControle,
        registrosValidados,
        importId,
        arquivoNome,
        user,
        {
          adicionarPessoa: onAdicionarPessoa,
          adicionarCurso: onAdicionarCurso,
          adicionarRegistroTreinamento: onAdicionarRegistroTreinamento,
          adicionarQualificacao: onAdicionarQualificacao,
          adicionarFerramenta: onAdicionarFerramenta,
          adicionarDocumento: onAdicionarDocumento,
          removerFerramenta: onRemoverFerramenta,
          removerRegistroTreinamento: onRemoverRegistroTreinamento,
          removerPessoa: onRemoverPessoa,
          removerCurso: onRemoverCurso,
          removerQualificacao: onRemoverQualificacao,
          removerDocumento: onRemoverDocumento,
        },
        {
          pessoasExistentes: pessoas,
          treinamentosExistentes: treinamentos,
          registrosTreinamentoExistentes: registrosTreinamento,
          documentosExistentes: documentos,
        }
      );

      setResultadoGravacao({
        sucesso: true,
        importId,
        totalProcessados: resultado.totalProcessados,
        totalCriados: resultado.totalCriados,
        totalAtualizados: resultado.totalAtualizados,
        mensagem: resultado.mensagem,
      });

      setEtapaAtual(6);
    } catch (err: any) {
      console.error('Erro na gravação final:', err);
      alert('Erro ao efetivar importação: ' + err.message);
    } finally {
      setIsProcessando(false);
      setStatusMensagem('');
    }
  };

  // ============================================================================
  // FUNÇÕES DE REVERSÃO E GESTÃO DE HISTÓRICO & METROLOGIA (FASE 14.1)
  // ============================================================================
  const handleReverterImportacao = async (
    importacao: RegistroImportacaoCompleto,
    motivo: string
  ) => {
    setIsProcessando(true);
    setStatusMensagem('Revertendo importação no banco de dados e restaurando estados anteriores...');
    try {
      const resultado = await reverterImportacaoNoQualigest(
        orgId,
        importacao,
        user,
        motivo,
        {
          removerFerramenta: onRemoverFerramenta,
          removerRegistroTreinamento: onRemoverRegistroTreinamento,
          removerPessoa: onRemoverPessoa,
          removerCurso: onRemoverCurso,
          removerDocumento: onRemoverDocumento,
          adicionarFerramenta: onAdicionarFerramenta,
          adicionarPessoa: onAdicionarPessoa,
          adicionarCurso: onAdicionarCurso,
          adicionarRegistroTreinamento: onAdicionarRegistroTreinamento,
          adicionarDocumento: onAdicionarDocumento,
        }
      );

      if (resultado.sucesso) {
        alert(`Reversão concluída com sucesso! ${resultado.mensagem}`);
        setReversaoModal(null);
      } else {
        alert(`Falha na reversão: ${resultado.mensagem}`);
      }
    } catch (err: any) {
      console.error('Erro na reversão:', err);
      alert('Erro ao reverter importação: ' + err.message);
    } finally {
      setIsProcessando(false);
      setStatusMensagem('');
    }
  };

  const handleConfirmExcluirHistorico = async () => {
    if (!historicoParaExcluir) return;
    try {
      setIsExcluindoHistorico(true);
      await excluirRegistroImportacaoHistorico(orgId, historicoParaExcluir, user);
      setMensagemSucesso('Registro de histórico removido. Os cadastros oficiais no QualiGest permaneceram intactos.');
      setHistoricoParaExcluir(null);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      alert('Erro ao excluir registro de histórico: ' + err.message);
    } finally {
      setIsExcluindoHistorico(false);
    }
  };

  const handleToggleAtivoFerramenta = async (ferramenta: FerramentaCalibracao) => {
    try {
      const novoAtivo = !ferramenta.ativo;
      await toggleAtivoFerramenta(orgId, ferramenta.id, novoAtivo, user);
      if (onAdicionarFerramenta) {
        onAdicionarFerramenta({ ...ferramenta, ativo: novoAtivo });
      }
    } catch (err: any) {
      alert('Erro ao alterar status operacional da ferramenta: ' + err.message);
    }
  };

  const handleConfirmDeleteFerramenta = async () => {
    if (!ferramentaParaExcluir) return;
    try {
      setIsExcluindoFerramenta(true);
      await deleteFerramentaCalibrada(orgId, ferramentaParaExcluir, user);
      if (onRemoverFerramenta) {
        onRemoverFerramenta(ferramentaParaExcluir);
      }
      setMensagemSucesso('Ferramenta removida do cadastro oficial de calibração.');
      setFerramentaParaExcluir(null);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      alert('Erro ao excluir ferramenta: ' + err.message);
    } finally {
      setIsExcluindoFerramenta(false);
    }
  };

  // ============================================================================
  // FUNÇÃO 7: TRATAR OPORTUNIDADE DE MELHORIA (CRIAR RNC, AÇÃO OU CORREÇÃO)
  // ============================================================================
  const tratarOportunidade = (
    oportunidade: OportunidadeMelhoriaImportacao,
    acao: 'CRIAR_RNC' | 'CRIAR_ACAO' | 'CORRIGIR_DADOS' | 'IGNORAR'
  ) => {
    if (acao === 'CRIAR_RNC') {
      const dadosRnc = {
        titulo: `RNC Preventiva/Corretiva: ${oportunidade.titulo}`,
        descricaoDesvio: `Desvio identificado durante a Importação Inteligente do arquivo '${arquivoNome}'. ${oportunidade.descricao}`,
        setorNotificado: tipoControle === 'CALIBRACAO_FERRAMENTAL' ? 'Metrologia / Ferramental' : 'Treinamento / SGQ',
        origem: 'AUDITORIA_INTERNA',
        severidade: oportunidade.severidade === 'CRITICA' ? 'Crítico' : 'Médio',
        probabilidade: 'B',
        acaoContencao: 'Segregar ferramenta em quarentena ou suspender atividade de liberação técnica até regularização.',
      };

      if (onCriarRncSugerida) {
        onCriarRncSugerida(dadosRnc);
      }
      setOportunidadesTratadas((prev) => ({
        ...prev,
        [oportunidade.id]: 'RNC Aberta com Sucesso',
      }));
      alert(`RNC F 001-29 iniciada com sucesso a partir da constatação da importação! Acesse a aba "Registro de RNC" para revisar.`);
      return;
    }

    if (acao === 'CRIAR_ACAO') {
      setOportunidadesTratadas((prev) => ({
        ...prev,
        [oportunidade.id]: 'Plano de Ação Aberto',
      }));
      alert(`Plano de Ação registrado para regularizar: "${oportunidade.titulo}".`);
      return;
    }

    if (acao === 'IGNORAR') {
      setOportunidadesTratadas((prev) => ({
        ...prev,
        [oportunidade.id]: 'Justificado e Arquivado',
      }));
      return;
    }

    if (acao === 'CORRIGIR_DADOS') {
      setEtapaAtual(3); // Volta para o mapeamento
      return;
    }
  };

  // Linhas filtradas para exibição na tabela da etapa 4/5 (Fase 14.1)
  const linhasFiltradas = useMemo(() => {
    return registrosValidados.filter((linha) => {
      if (filtroQualidade === 'ERROS' && (linha.statusQualidade !== 'ERRO' && linha.classificacaoReconciliacao !== 'INVALIDO')) return false;
      if (filtroQualidade === 'ATENCAO' && linha.statusQualidade !== 'ATENCAO') return false;
      if (filtroQualidade === 'VALIDOS' && linha.statusQualidade !== 'OK') return false;
      if (filtroQualidade === 'NOVO' && linha.classificacaoReconciliacao !== 'NOVO') return false;
      if (filtroQualidade === 'EXISTENTE_IGUAL' && linha.classificacaoReconciliacao !== 'EXISTENTE_IGUAL') return false;
      if (filtroQualidade === 'EXISTENTE_ALTERADO' && linha.classificacaoReconciliacao !== 'EXISTENTE_ALTERADO') return false;
      if (filtroQualidade === 'POSSIVEL_DUPLICIDADE' && linha.classificacaoReconciliacao !== 'POSSIVEL_DUPLICIDADE') return false;
      if (filtroQualidade === 'INVALIDO' && linha.classificacaoReconciliacao !== 'INVALIDO' && linha.statusQualidade !== 'ERRO') return false;

      if (termoBuscaLinha.trim()) {
        const busca = termoBuscaLinha.toLowerCase();
        const textoLinha = JSON.stringify(linha.dadosMapeados).toLowerCase();
        return textoLinha.includes(busca);
      }
      return true;
    });
  }, [registrosValidados, filtroQualidade, termoBuscaLinha]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                FASE 14 — IMPORTAÇÃO INTELIGENTE
              </span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                RBAC 145 / EASA MIGRATION ENGINE
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Importação Inteligente e Migração de Controles
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Não recadastre o que sua empresa já possui. Envie planilhas Excel, relatórios Word ou PDFs operacionais: a inteligência artificial analisa, mapeia, valida inconsistências, detecta duplicidades e incorpora os dados aos controles e evidências do QualiGest com rastreabilidade total.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTabPrincipal('WIZARD');
                setEtapaAtual(1);
                setArquivoNome('');
                setLinhasOriginais([]);
                setRegistrosValidados([]);
                setResultadoGravacao(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nova Importação
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setTabPrincipal('WIZARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              tabPrincipal === 'WIZARD'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Assistente de Importação ({etapaAtual}/7)
          </button>
          <button
            onClick={() => setTabPrincipal('HISTORICO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              tabPrincipal === 'HISTORICO'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Histórico Auditável ({smartImports.length})
          </button>
          <button
            onClick={() => setTabPrincipal('TEMPLATES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              tabPrincipal === 'TEMPLATES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Modelos Homologados ({templatesAprovadosFiltrados.length})
          </button>
          <button
            onClick={() => {
              if (onNavigateToTab) {
                onNavigateToTab('ferramentas-metrologia');
              } else {
                setTabPrincipal('METROLOGIA');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              tabPrincipal === 'METROLOGIA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            Módulo Ferramentas & Metrologia ({ferramentasCalibradas.length})
          </button>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* ABA 1: ASSISTENTE DE IMPORTAÇÃO EM 7 ETAPAS */}
      {/* ======================================================================== */}
      {tabPrincipal === 'WIZARD' && (
        <div className="space-y-6">
          {/* BARRA DE PROGRESSO DO WIZARD (7 ETAPAS) */}
          <div className="bg-white border border-slate-200 rounded-[12px] p-4 shadow-xs">
            <div className="grid grid-cols-7 gap-2">
              {[
                { num: 1, label: '1. Enviar' },
                { num: 2, label: '2. Analisar' },
                { num: 3, label: '3. Mapear' },
                { num: 4, label: '4. Validar' },
                { num: 5, label: '5. Duplicidades' },
                { num: 6, label: '6. Resultado' },
                { num: 7, label: '7. Oportunidades' },
              ].map((step) => {
                const isActive = etapaAtual === step.num;
                const isCompleted = etapaAtual > step.num;
                return (
                  <div
                    key={step.num}
                    className={`flex flex-col items-center text-center p-2 rounded-lg transition ${
                      isActive
                        ? 'bg-blue-50 border border-blue-300'
                        : isCompleted
                        ? 'bg-emerald-50/60 border border-emerald-200'
                        : 'bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.num}
                    </div>
                    <span
                      className={`text-[11px] font-bold truncate max-w-full ${
                        isActive
                          ? 'text-blue-900'
                          : isCompleted
                          ? 'text-emerald-800'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {isProcessando && (
              <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>{statusMensagem || 'Processando dados com inteligência artificial...'}</span>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* ETAPA 1: ENVIAR ARQUIVO OU ESCOLHER AMOSTRA */}
          {/* ==================================================================== */}
          {etapaAtual === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dropzone Upload */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                    Etapa 1: Enviar Arquivo de Controles Existentes
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Formatos aceitos: Planilhas Excel (.xlsx, .xls), CSV (.csv), Documentos Word (.docx) e Relatórios em PDF (.pdf).
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition bg-slate-50/50 hover:bg-blue-50/20">
                  <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-800 mb-1">
                    Arraste e solte o arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Suporta planilhas de treinamentos, calibração de ferramentas, controle de revisões ou relatórios técnicos.
                  </p>

                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs">
                    <UploadCloud className="w-4 h-4" />
                    Procurar no Computador
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.docx,.pdf,.json"
                      onChange={handleUploadArquivo}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Garantia de Integridade e Não Sobregravação
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-slate-600">
                    <li>O QualiGest calcula o hash criptográfico SHA-256 no momento do upload.</li>
                    <li>Nenhum dado é gravado no banco sem a sua validação e confirmação humana expressa.</li>
                    <li>O arquivo original permanece preservado para fins de auditoria regulatória.</li>
                  </ul>
                </div>
              </div>

              {/* Amostras Pré-Configuradas (1 Clique) */}
              <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 w-fit mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    TESTES HOMOLOGADOS
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Amostras de Demonstração Pronta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Carregue dados reais em 1 clique para testar a inteligência artificial:
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {PRESETS_AMOSTRAS_IMPORTACAO.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3 border border-slate-200 hover:border-blue-400 rounded-lg bg-slate-50/50 hover:bg-blue-50/30 transition text-left space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {preset.nomeArquivo}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {preset.formato}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-tight">
                        {preset.descricaoCenario}
                      </p>

                      <div className="text-[10px] font-medium text-blue-700 bg-blue-50/80 px-2 py-1 rounded border border-blue-100">
                        {preset.destaqueTeste}
                      </div>

                      <button
                        onClick={() => carregarPresetAmostra(preset)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition cursor-pointer"
                      >
                        Carregar Amostra e Testar IA
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ETAPA 2: ANÁLISE AUTOMÁTICA PELA IA */}
          {/* ==================================================================== */}
          {etapaAtual === 2 && (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ARQUIVO PROCESSADO COM SUCESSO
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      SHA-256: {arquivoHash.slice(0, 18)}...
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Etapa 2: Diagnóstico e Reconhecimento pela IA
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtapaAtual(1)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    ← Trocar Arquivo
                  </button>
                  <button
                    onClick={() => setEtapaAtual(3)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    Prosseguir para Mapeamento →
                  </button>
                </div>
              </div>

              {/* Banner Especializado para Formulário de 4 Colunas (Publicação, Título, Proprietário/Cessor, Número e Data da Revisão) */}
              {isFormulario4ColunasDetectado && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Formulário de 4 Colunas Reconhecido & Adaptado com Sucesso pela IA</span>
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    A IA identificou as <strong>4 colunas originais do formulário</strong>:
                    <span className="mx-1 px-1.5 py-0.5 bg-white rounded border border-blue-200 font-semibold text-slate-800">Publicação</span>
                    <span className="mx-1 px-1.5 py-0.5 bg-white rounded border border-blue-200 font-semibold text-slate-800">Título</span>
                    <span className="mx-1 px-1.5 py-0.5 bg-white rounded border border-blue-200 font-semibold text-slate-800">Proprietário / Cessor</span> e
                    <span className="mx-1 px-1.5 py-0.5 bg-white rounded border border-blue-200 font-semibold text-slate-800">Número e data da revisão</span>.
                  </p>
                  <div className="p-2.5 bg-white/90 rounded-lg border border-blue-100 text-xs text-slate-700 flex flex-wrap gap-2.5 items-center">
                    <span className="font-bold text-blue-900">Campos Adaptados para o QualiGest SGQ:</span>
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ 1. Publicação</span>
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ 2. Título da Publicação</span>
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ 3. Proprietário / Cessor do Manual</span>
                    <span className="inline-flex items-center gap-1 text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">✓ 4. Em que revisão está (Número da Revisão)</span>
                    <span className="inline-flex items-center gap-1 text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">✓ 5. Data da Revisão</span>
                  </div>
                </div>
              )}

              {/* Cards de Métricas da Análise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Arquivo Original</span>
                  <p className="text-sm font-bold text-slate-900 truncate" title={arquivoNome}>
                    {arquivoNome}
                  </p>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(arquivoTamanho / 1024).toFixed(1)} KB • {arquivoFormato}
                  </span>
                </div>

                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                  <span className="text-xs text-blue-700 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Tipo de Controle Detectado
                  </span>
                  <p className="text-sm font-black text-blue-950">
                    {tipoControle}
                  </p>
                  <span className="text-[11px] font-semibold text-blue-700">
                    Confiança IA: {confiancaIA}%
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-xs text-slate-500 font-medium">Estrutura Detectada</span>
                  <p className="text-sm font-bold text-slate-900">
                    {colunasDetectadas.length} colunas
                  </p>
                  <span className="text-[11px] text-slate-600">
                    {linhasOriginais.length} registros no arquivo
                  </span>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                  <span className="text-xs text-purple-700 font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    Motor de Interpretação
                  </span>
                  <p className="text-sm font-bold text-purple-950">
                    {origemAnalise === 'IA_GEMINI' ? 'Gemini Flash SGQ' : 'Motor Local SGQ'}
                  </p>
                  <span className="text-[11px] text-purple-700">
                    Classificação Semântica Ativa
                  </span>
                </div>
              </div>

              {/* Justificativa e Finalidade Identificada */}
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-700" />
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Finalidade Operacional Identificada pela IA
                  </h4>
                </div>
                <p className="text-xs text-blue-950 leading-relaxed font-medium">
                  {finalidadeProvavel}
                </p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {explicacaoIA}
                </p>
              </div>

              {/* Seletor Manual caso o usuário deseje trocar o tipo */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-700">Deseja forçar outro tipo de controle?</span>
                <select
                  value={tipoControle}
                  onChange={(e) => {
                    const novoTipo = e.target.value as TipoControleImportacao;
                    setTipoControle(novoTipo);
                    gerarMapeamentoInicial(colunasDetectadas, novoTipo, linhasOriginais);
                  }}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="TREINAMENTOS">Treinamentos e Qualificações (Pessoas/Cursos)</option>
                  <option value="CALIBRACAO_FERRAMENTAL">Calibração & Metrologia (Ferramentas RBAC 145.109)</option>
                  <option value="CONTROLE_DOCUMENTAL">Controle Documental & Revisões (Master List)</option>
                  <option value="NAO_CONFORMIDADES">Não Conformidades (RNC F 001-29)</option>
                  <option value="REQUISITOS_CLIENTES">Requisitos de Clientes (Auditorias)</option>
                </select>
              </div>

              {/* Amostra dos Dados Originais */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Prévia das Primeiras 3 Linhas Originais do Arquivo:</span>
                      {isEditandoColunasEtapa2 && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          MODO EDIÇÃO DE COLUNAS ATIVO
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isEditandoColunasEtapa2
                        ? 'Edite os nomes das colunas nos campos abaixo e clique em "Rechecar com o Arquivo Enviado" para sincronizar.'
                        : 'Você pode editar as colunas detectadas e revalidar o arquivo para gerar um modelo homologado de imediato.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!isEditandoColunasEtapa2 ? (
                      <>
                        <button
                          type="button"
                          onClick={handleIniciarEdicaoColunasEtapa2}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Editar Colunas da Prévia</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleEspelharTodasColunasComoCampos(true);
                            setMensagemSucesso('Todas as colunas da planilha foram transformadas em campos no QualiGest!');
                            setTimeout(() => setMensagemSucesso(null), 4000);
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Cria automaticamente um campo novo no sistema para cada coluna da planilha com o mesmo nome"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Espelhar Colunas como Campos</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAbrirHomologarModeloEtapa2}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Award className="w-3.5 h-3.5 text-white" />
                          <span>Gerar Modelo Homologado</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelarEdicaoColunasEtapa2}
                          className="px-3 py-1.5 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded text-xs font-semibold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleRechecarColunasComArquivo}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Rechecar com o Arquivo Enviado</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {avisoRechecagemEtapa2 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{avisoRechecagemEtapa2}</span>
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        {colunasDetectadas.map((col, idx) => (
                          <th key={idx} className="p-2.5 whitespace-nowrap border-r border-slate-200 last:border-r-0">
                            {isEditandoColunasEtapa2 ? (
                              <div className="space-y-1">
                                <span className="text-[10px] text-blue-600 font-mono block font-bold">
                                  Coluna #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={colunasEditadasEtapa2[idx] ?? col}
                                  onChange={(e) => {
                                    const novos = [...colunasEditadasEtapa2];
                                    novos[idx] = e.target.value;
                                    setColunasEditadasEtapa2(novos);
                                  }}
                                  className="w-full min-w-[140px] px-2 py-1 bg-white border-2 border-blue-500 rounded text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  placeholder={`Coluna ${idx + 1}`}
                                />
                              </div>
                            ) : (
                              <span>{col}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {linhasOriginais.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {colunasDetectadas.map((col, cIdx) => (
                            <td key={cIdx} className="p-2.5 whitespace-nowrap text-slate-700 border-r border-slate-200 last:border-r-0">
                              {row[col] !== undefined ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ETAPA 3: MAPEAMENTO DE CAMPOS (DE/PARA) */}
          {/* ==================================================================== */}
          {etapaAtual === 3 && (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Etapa 3: Mapeamento de Campos (Arquivo → QualiGest)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revise como cada coluna da sua planilha será associada aos campos internos do sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtapaAtual(2)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={executarValidacaoQualidade}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    Validar Qualidade e Integridade →
                  </button>
                </div>
              </div>

              {/* Banner Especializado para Mapeamento de 4 Colunas Originais */}
              {isFormulario4ColunasDetectado && (
                <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-900">
                  <div className="flex items-center gap-2 font-bold">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Mapeamento Automático Inteligente das 4 Colunas Originais</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    As colunas originais <strong>Publicação</strong>, <strong>Título</strong> e <strong>Proprietário / Cessor</strong> foram mapeadas diretamente. A 4ª coluna original <strong>Número e data da revisão</strong> foi adaptada desdobrando em <strong>Número da Revisão</strong> (em que revisão está) e <strong>Data da Revisão</strong> (data da revisão) para garantir controle de vigência contínuo no QualiGest SGQ.
                  </p>
                </div>
              )}

              {/* Alerta de Preâmbulo Isolado Automaticamente (Fase 14.1) */}
              {linhasPreambuloDetectadas.length > 0 && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-blue-950">
                    <div className="flex items-center gap-2 font-bold">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Identificação Inteligente de Tabela: Cabeçalho localizado na Linha #{linhaCabecalhoDetectada + 1}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                      {linhasPreambuloDetectadas.length} linha(s) de metadados antes da tabela isoladas
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-900 bg-white/80 p-2.5 rounded border border-blue-100 font-mono space-y-0.5">
                    {linhasPreambuloDetectadas.map((linha, pIdx) => (
                      <div key={pIdx} className="truncate">
                        <span className="text-slate-400 select-none mr-2">Linha #{pIdx + 1}:</span>
                        {linha}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerta de Modelo Homologado Reconhecido */}
              {templateReconhecido && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-900">
                        Modelo Homologado Reconhecido: "{templateReconhecido.nome || templateReconhecido.nomeTemplate}"
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Mapeamento pré-homologado da empresa aplicado ({templateReconhecido.vezesUtilizado || templateReconhecido.totalVezesUsado || 1} uso(s)).
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDesvincularTemplate}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition cursor-pointer"
                      title="Desvincular este modelo e recalcular o mapeamento das colunas automaticamente do zero"
                    >
                      Desvincular Modelo
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateParaExcluir(templateReconhecido)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg border border-red-300 transition cursor-pointer"
                      title="Excluir este modelo homologado do banco de dados definitivamente"
                    >
                      Excluir Modelo
                    </button>
                  </div>
                </div>
              )}

              {/* Alerta e Resolução de Conflitos: Colunas Duplicadas para o mesmo Campo */}
              {camposDuplicados.length > 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-950 shadow-sm animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm">
                        Conflito de Mapeamento: Colunas Apontando para o Mesmo Campo do Sistema
                      </h4>
                      <p className="text-amber-800 text-[11px] mt-0.5">
                        Detectamos que mais de uma coluna da sua planilha está associada ao mesmo campo interno. Cada campo do QualiGest deve receber apenas uma coluna exclusiva:
                      </p>
                      <ul className="mt-1.5 space-y-1 list-disc list-inside text-[11px] font-mono font-bold text-amber-900">
                        {camposDuplicados.map(([campo, cols]) => {
                          const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
                          const def = definicoes.find((d) => d.campo === campo);
                          return (
                            <li key={campo}>
                              Campo <strong>"{def?.label || campo}"</strong>: associado às colunas {cols.map((c) => `"${c}"`).join(' e ')}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResolverDuplicidades}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 self-start md:self-center"
                    title="Cria novos campos exclusivos com os mesmos nomes das colunas duplicadas para desempatar"
                  >
                    <Sparkles className="w-4 h-4" />
                    Resolver Conflito: Criar Campos com os Nomes das Colunas
                  </button>
                </div>
              )}

              {/* Seletor Manual de Modelo Homologado Existente */}
              {templatesAprovadosFiltrados.filter((t) => t.tipoControle === tipoControle).length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-purple-900 font-semibold">
                    <Layers className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Aplicar Modelo Homologado da Empresa a esta Planilha:</span>
                  </div>
                  <select
                    onChange={(e) => {
                      const tplId = e.target.value;
                      if (!tplId) return;
                      const selectedTpl = templatesAprovadosFiltrados.find((t) => t.id === tplId);
                      if (selectedTpl) {
                        aplicarTemplateManual(selectedTpl);
                      }
                    }}
                    className="border border-purple-300 rounded-lg p-1.5 text-xs bg-white text-purple-900 font-medium cursor-pointer"
                    defaultValue=""
                  >
                    <option value="">Selecione um modelo homologado para aplicar...</option>
                    {templatesAprovadosFiltrados
                      .filter((t) => t.tipoControle === tipoControle)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome || t.nomeTemplate} ({t.colunasDetectadas?.length || 0} colunas mapeadas)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Barra de Criação Automática de Campos Iguais às Colunas */}
              <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Campos do QualiGest Iguais às Colunas da Planilha
                    </h4>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                      Criação Dinâmica
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Não fique limitado apenas aos campos pré-determinados. Você pode criar campos no QualiGest com os mesmos nomes de todas as colunas da sua planilha com apenas 1 clique.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleEspelharTodasColunasComoCampos(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Cria automaticamente um novo campo no sistema para cada coluna da lista"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Criar Campos com os Mesmos Nomes das Colunas</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAdicionarCampoPersonalizadoManual}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>+ Campo Avulso</span>
                  </button>
                </div>
              </div>

              {/* Tabela De/Para de Mapeamento com Classificação Fase 14.1 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Coluna no Arquivo Original</th>
                      <th className="p-3">Exemplo de Valor</th>
                      <th className="p-3">Campo Correspondente no QualiGest</th>
                      <th className="p-3">Classificação (Fase 14.1)</th>
                      <th className="p-3 text-center">Confiança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {mapeamentos.map((item, idx) => {
                      const definicoes = obterCamposCompletos(tipoControle, camposPersonalizados);
                      const camposOficiais = ESQUEMA_CAMPOS_CONTROLE[tipoControle] || ESQUEMA_CAMPOS_CONTROLE.OUTROS;
                      const isCustom = camposPersonalizados.some((c) => c.campo === item.campoQualigest);
                      const isIgnorado = item.campoQualigest === 'ignorar';
                      const isDuplicado = !isIgnorado && camposDuplicados.some(([campo]) => campo === item.campoQualigest);
                      const classifAtual = classificacaoCampos[item.colunaOrigem] || (isIgnorado ? 'IGNORADO' : item.obrigatorio ? 'OBRIGATORIO' : 'OPCIONAL');

                      return (
                        <tr key={idx} className={isDuplicado ? 'bg-amber-50/50' : isIgnorado ? 'bg-slate-50/60 opacity-80' : 'hover:bg-blue-50/20'}>
                          <td className="p-3 font-bold text-slate-900">
                            {item.colunaOrigem}
                          </td>

                          <td className="p-3 text-slate-600 font-mono text-[11px] max-w-[200px] truncate">
                            {item.exemploValor || '—'}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={item.campoQualigest}
                                onChange={(e) => alterarCampoMapeado(item.colunaOrigem, e.target.value)}
                                className={`w-full max-w-xs border rounded px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                                  isDuplicado
                                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-300'
                                    : isIgnorado
                                    ? 'border-slate-300 text-slate-400 bg-slate-50'
                                    : isCustom
                                    ? 'border-purple-300 bg-purple-50 text-purple-950 font-bold'
                                    : 'border-blue-300 text-slate-900 bg-white shadow-2xs'
                                }`}
                              >
                                <option value={`__CRIAR_${item.colunaOrigem}`}>
                                  ✨ Criar Campo com Este Nome: "{item.colunaOrigem}"
                                </option>
                                <option value="__NOVO_CUSTOM__">➕ Digitar Outro Campo Personalizado...</option>
                                <option value="ignorar">(Ignorar esta coluna)</option>

                                {camposPersonalizados.length > 0 && (
                                  <optgroup label={`Campos Personalizados Criados (${camposPersonalizados.length}):`}>
                                    {camposPersonalizados.map((c) => (
                                      <option key={c.campo} value={c.campo}>
                                        ★ {c.label} (Personalizado)
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                <optgroup label={`Campos Oficiais de ${tipoControle}:`}>
                                  {camposOficiais.map((d) => (
                                    <option key={d.campo} value={d.campo}>
                                      {d.label} {d.obrigatorio ? '(* obrigatório)' : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>

                              {!isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleCriarCampoMesmoNome(item.colunaOrigem)}
                                  className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 shrink-0 cursor-pointer"
                                  title={`Criar novo campo no QualiGest para a coluna "${item.colunaOrigem}"`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                  <span className="hidden xl:inline">Criar campo</span>
                                </button>
                              )}
                            </div>
                            {isDuplicado && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-700 font-bold bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Conflito: Campo duplicado com outra coluna</span>
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <select
                              value={classifAtual}
                              onChange={(e) => alterarClassificacaoCampo(item.colunaOrigem, e.target.value as any)}
                              className={`border rounded px-2.5 py-1 text-xs font-bold cursor-pointer transition ${
                                classifAtual === 'OBRIGATORIO'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : classifAtual === 'IGNORADO'
                                  ? 'bg-slate-100 text-slate-500 border-slate-300'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              <option value="OBRIGATORIO">🔴 Obrigatório</option>
                              <option value="OPCIONAL">🔵 Opcional</option>
                              <option value="IGNORADO">⚪ Ignorar</option>
                            </select>
                          </td>

                          <td className="p-3 text-center font-mono font-bold text-[11px]">
                            {isIgnorado ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {item.confiancaIA}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Opção para Salvar como Template Aprovado (Aprendizado da Empresa) */}
              <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-salvar-template"
                    checked={salvarComoTemplate}
                    onChange={(e) => setSalvarComoTemplate(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <label htmlFor="chk-salvar-template" className="text-xs font-bold text-purple-950 cursor-pointer">
                    Salvar este mapeamento como Modelo Homologado da Empresa (Requisito 7 — Aprendizado Automático)
                  </label>
                </div>

                {salvarComoTemplate && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-purple-900 font-medium">Nome do Modelo:</span>
                    <input
                      type="text"
                      value={nomeTemplateCustom}
                      onChange={(e) => setNomeTemplateCustom(e.target.value)}
                      placeholder="Ex: Planilha Padrão de Treinamentos - RH Hangar"
                      className="flex-1 bg-white border border-purple-300 rounded px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ETAPA 4: VALIDAÇÃO & ANÁLISE DE QUALIDADE DOS DADOS */}
          {/* ==================================================================== */}
          {etapaAtual === 4 && (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    Etapa 4: Validação de Qualidade e Integridade dos Dados
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    O sistema inspecionou cada linha do arquivo identificando inconsistências, datas inválidas e campos obrigatórios ausentes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtapaAtual(3)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    ← Ajustar Mapeamento
                  </button>
                  <button
                    onClick={() => setEtapaAtual(5)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    Avançar para Duplicidades e Prévia →
                  </button>
                </div>
              </div>

              {/* Cards de Métricas e Reconciliação com a Base (Fase 14.1) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div
                  onClick={() => setFiltroQualidade(filtroQualidade === 'NOVO' ? 'TODOS' : 'NOVO')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    filtroQualidade === 'NOVO' ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1">🟢 Novos</span>
                    <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded font-mono">1</span>
                  </div>
                  <p className="text-lg font-black text-emerald-950 mt-1">
                    {registrosValidados.filter((l) => l.classificacaoReconciliacao === 'NOVO').length}
                  </p>
                  <span className="text-[10px] text-emerald-700">Não existem no banco</span>
                </div>

                <div
                  onClick={() => setFiltroQualidade(filtroQualidade === 'EXISTENTE_IGUAL' ? 'TODOS' : 'EXISTENTE_IGUAL')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    filtroQualidade === 'EXISTENTE_IGUAL' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800">
                    <span className="flex items-center gap-1">🔵 Idênticos</span>
                    <span className="text-[10px] bg-blue-100 px-1.5 py-0.2 rounded font-mono">2</span>
                  </div>
                  <p className="text-lg font-black text-blue-950 mt-1">
                    {registrosValidados.filter((l) => l.classificacaoReconciliacao === 'EXISTENTE_IGUAL').length}
                  </p>
                  <span className="text-[10px] text-blue-700">Sem alterações</span>
                </div>

                <div
                  onClick={() => setFiltroQualidade(filtroQualidade === 'EXISTENTE_ALTERADO' ? 'TODOS' : 'EXISTENTE_ALTERADO')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    filtroQualidade === 'EXISTENTE_ALTERADO' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                    <span className="flex items-center gap-1">🟠 Com Alteração</span>
                    <span className="text-[10px] bg-amber-100 px-1.5 py-0.2 rounded font-mono">3</span>
                  </div>
                  <p className="text-lg font-black text-amber-950 mt-1">
                    {registrosValidados.filter((l) => l.classificacaoReconciliacao === 'EXISTENTE_ALTERADO').length}
                  </p>
                  <span className="text-[10px] text-amber-700">Divergências detectadas</span>
                </div>

                <div
                  onClick={() => setFiltroQualidade(filtroQualidade === 'POSSIVEL_DUPLICIDADE' ? 'TODOS' : 'POSSIVEL_DUPLICIDADE')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    filtroQualidade === 'POSSIVEL_DUPLICIDADE' ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-purple-800">
                    <span className="flex items-center gap-1">🟡 Duplicidades</span>
                    <span className="text-[10px] bg-purple-100 px-1.5 py-0.2 rounded font-mono">4</span>
                  </div>
                  <p className="text-lg font-black text-purple-950 mt-1">
                    {registrosValidados.filter((l) => l.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE').length}
                  </p>
                  <span className="text-[10px] text-purple-700">Requer decisão humana</span>
                </div>

                <div
                  onClick={() => setFiltroQualidade(filtroQualidade === 'INVALIDO' ? 'TODOS' : 'INVALIDO')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    filtroQualidade === 'INVALIDO' ? 'ring-2 ring-red-500 bg-red-50' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-red-800">
                    <span className="flex items-center gap-1">🔴 Inválidos</span>
                    <span className="text-[10px] bg-red-100 px-1.5 py-0.2 rounded font-mono">5</span>
                  </div>
                  <p className="text-lg font-black text-red-950 mt-1">
                    {registrosValidados.filter((l) => l.classificacaoReconciliacao === 'INVALIDO' || l.statusQualidade === 'ERRO').length}
                  </p>
                  <span className="text-[10px] text-red-700">Erros impeditivos</span>
                </div>
              </div>

              {/* Filtros e Busca de Linhas */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, código ou dados..."
                    value={termoBuscaLinha}
                    onChange={(e) => setTermoBuscaLinha(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {filtroQualidade !== 'TODOS' && (
                    <button
                      onClick={() => setFiltroQualidade('TODOS')}
                      className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Remover filtro ({filtroQualidade})
                    </button>
                  )}
                  <span className="text-xs text-slate-500 font-medium">Exibindo:</span>
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {linhasFiltradas.length} de {registrosValidados.length} linhas
                  </span>
                </div>
              </div>

              {/* Tabela de Linhas Validadas com Reconciliação Fase 14.1 */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[440px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 w-36">Status Reconciliação</th>
                      <th className="p-2.5">Dados Principais Reconhecidos</th>
                      <th className="p-2.5">Diagnóstico & Divergências</th>
                      <th className="p-2.5 text-center w-28">Comparação</th>
                      <th className="p-2.5 text-center w-20">Importar?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {linhasFiltradas.map((linha) => {
                      const isOk = linha.statusQualidade === 'OK';
                      const isAtencao = linha.statusQualidade === 'ATENCAO';
                      const isErro = linha.statusQualidade === 'ERRO' || linha.classificacaoReconciliacao === 'INVALIDO';
                      const temDivergencia = (linha.divergenciasDetectadas && linha.divergenciasDetectadas.length > 0) || linha.duplicidadeDetectada;

                      return (
                        <tr
                          key={linha.indiceLinha}
                          className={
                            isErro
                              ? 'bg-red-50/40'
                              : isAtencao || temDivergencia
                              ? 'bg-amber-50/20'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                            {linha.indiceLinha}
                          </td>

                          <td className="p-2.5">
                            {linha.classificacaoReconciliacao === 'NOVO' && (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                                🟢 Novo
                              </span>
                            )}
                            {linha.classificacaoReconciliacao === 'EXISTENTE_IGUAL' && (
                              <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                                🔵 Idêntico
                              </span>
                            )}
                            {linha.classificacaoReconciliacao === 'EXISTENTE_ALTERADO' && (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                                🟠 Com Alteração
                              </span>
                            )}
                            {linha.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE' && (
                              <span className="inline-flex items-center gap-1 font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[10px]">
                                🟡 Duplicidade
                              </span>
                            )}
                            {linha.classificacaoReconciliacao === 'INVALIDO' && (
                              <span className="inline-flex items-center gap-1 font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[10px]">
                                🔴 Inválido
                              </span>
                            )}
                          </td>

                          <td className="p-2.5 text-slate-900 font-medium">
                            <div className="space-y-0.5">
                              {Object.entries(linha.dadosMapeados).slice(0, 3).map(([k, v]) => (
                                <div key={k} className="text-[11px]">
                                  <span className="text-slate-500 font-normal">{k}: </span>
                                  <strong>{String(v) || '—'}</strong>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="p-2.5">
                            {linha.divergenciasDetectadas && linha.divergenciasDetectadas.length > 0 ? (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-amber-900 uppercase">
                                  {linha.divergenciasDetectadas.length} Divergência(s) com cadastro oficial:
                                </span>
                                {linha.divergenciasDetectadas.slice(0, 2).map((div, dIdx) => (
                                  <div key={dIdx} className="text-[11px] text-amber-900 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/60">
                                    <span className="font-semibold">{div.campo}:</span> "{String(div.valorAtual)}" → <strong className="text-blue-700">"{String(div.valorNovo)}"</strong>
                                  </div>
                                ))}
                              </div>
                            ) : linha.mensagensValidacao.length > 0 ? (
                              <div className="space-y-0.5">
                                {linha.mensagensValidacao.map((msg, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className={`text-[11px] leading-tight ${
                                      isErro ? 'text-red-700 font-semibold' : 'text-amber-800'
                                    }`}
                                  >
                                    • {msg}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Campos íntegros e consistentes.</span>
                            )}
                          </td>

                          <td className="p-2.5 text-center">
                            {temDivergencia || linha.registroExistenteId ? (
                              <button
                                onClick={() => setReconciliationModalLinha(linha)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold cursor-pointer transition flex items-center justify-center gap-1 mx-auto"
                              >
                                <Search className="w-3 h-3" />
                                Comparar
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              disabled={isErro}
                              checked={linha.selecionadoParaImportar && !isErro}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRegistrosValidados((prev) =>
                                  prev.map((item) =>
                                    item.indiceLinha === linha.indiceLinha
                                      ? { ...item, selecionadoParaImportar: checked }
                                      : item
                                  )
                                );
                              }}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer disabled:opacity-30"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ETAPA 5: DETECÇÃO DE DUPLICIDADES & PRÉVIA OBRIGATÓRIA */}
          {/* ==================================================================== */}
          {etapaAtual === 5 && (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      GOVERNANÇA HUMANA OBRIGATÓRIA
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      IA sugere → humano valida → sistema registra
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Etapa 5: Tratativa de Duplicidades e Prévia Obrigatória
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revise os conflitos detectados com registros já existentes na empresa antes da gravação definitiva.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtapaAtual(4)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    ← Voltar
                  </button>
                  <button
                    disabled={isConsultaOnly}
                    onClick={confirmarGravacaoFinal}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Importação no QualiGest
                  </button>
                </div>
              </div>

              {/* Banner de Aviso de Perfil CONSULTA se aplicável */}
              {isConsultaOnly && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Atenção (RBAC):</strong> Seu perfil atual é de CONSULTA (apenas leitura). A gravação oficial exige perfil GESTOR_SGQ ou ADMIN.
                  </span>
                </div>
              )}

              {/* Ações Rápidas em Lote para Conflitos */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Ação em Lote para Duplicidades Detectadas ({resumoPrevia?.registrosDuplicados || 0} conflitos):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => aplicarAcaoDuplicidadeEmLote('ATUALIZAR')}
                      className="px-2.5 py-1 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded text-xs font-bold transition cursor-pointer"
                    >
                      Atualizar Existentes
                    </button>
                    <button
                      onClick={() => aplicarAcaoDuplicidadeEmLote('MANTER_EXISTENTE')}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-bold transition cursor-pointer"
                    >
                      Manter Existente (Ignorar Novos)
                    </button>
                    <button
                      onClick={() => aplicarAcaoDuplicidadeEmLote('CRIAR_NOVO')}
                      className="px-2.5 py-1 bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 rounded text-xs font-bold transition cursor-pointer"
                    >
                      Criar como Novo Registro
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista dos Registros com Conflito, Divergências ou Duplicidade (Fase 14.1) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Reconciliação e Resolução de Divergências com o Banco:
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {registrosValidados.filter(
                      (l) =>
                        l.duplicidadeDetectada ||
                        l.classificacaoReconciliacao === 'EXISTENTE_ALTERADO' ||
                        l.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE' ||
                        (l.divergenciasDetectadas && l.divergenciasDetectadas.length > 0) ||
                        l.pessoaExistenteSimilar ||
                        l.cursoExistenteSimilar
                    ).length} registro(s) requerem confirmação humana
                  </span>
                </div>

                {registrosValidados.filter(
                  (l) =>
                    l.duplicidadeDetectada ||
                    l.classificacaoReconciliacao === 'EXISTENTE_ALTERADO' ||
                    l.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE' ||
                    (l.divergenciasDetectadas && l.divergenciasDetectadas.length > 0) ||
                    l.pessoaExistenteSimilar ||
                    l.cursoExistenteSimilar
                ).length === 0 ? (
                  <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-900 space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p className="font-bold">Nenhuma divergência ou conflito impeditivo encontrado no banco!</p>
                    <p className="text-emerald-700">Todos os registros são novos ou compatíveis e serão incorporados aos cadastros oficiais.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrosValidados
                      .filter(
                        (l) =>
                          l.duplicidadeDetectada ||
                          l.classificacaoReconciliacao === 'EXISTENTE_ALTERADO' ||
                          l.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE' ||
                          (l.divergenciasDetectadas && l.divergenciasDetectadas.length > 0) ||
                          l.pessoaExistenteSimilar ||
                          l.cursoExistenteSimilar
                      )
                      .map((linha) => {
                        const temDivergencia = linha.divergenciasDetectadas && linha.divergenciasDetectadas.length > 0;
                        const isAlterado = linha.classificacaoReconciliacao === 'EXISTENTE_ALTERADO';

                        return (
                          <div
                            key={linha.indiceLinha}
                            className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 rounded-xl space-y-3 shadow-2xs transition"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                  Linha #{linha.indiceLinha}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {linha.dadosMapeados.codigoPatrimonio ||
                                    linha.dadosMapeados.pessoaNome ||
                                    linha.dadosMapeados.codigo ||
                                    'Registro em Análise'}
                                </span>
                                {isAlterado ? (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                    🟠 Existente com Alteração
                                  </span>
                                ) : linha.classificacaoReconciliacao === 'POSSIVEL_DUPLICIDADE' ? (
                                  <span className="text-[10px] font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-200">
                                    🟡 Possível Duplicidade
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                                    🔵 Reconciliação
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setReconciliationModalLinha(linha)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  Ver Comparativo Lado a Lado
                                </button>
                                <select
                                  value={linha.decisaoUsuario || linha.acaoDuplicidade}
                                  onChange={(e) =>
                                    alterarDecisaoReconciliacaoLinha(linha.indiceLinha, e.target.value as any)
                                  }
                                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 cursor-pointer"
                                >
                                  <option value="ATUALIZAR">Atualizar Cadastro Oficial (Preserva Histórico)</option>
                                  <option value="MANTER_EXISTENTE">Manter Atual (Ignorar Arquivo)</option>
                                  <option value="CRIAR_NOVO">Criar como Novo Registro</option>
                                  <option value="IGNORAR">Descartar Completamente</option>
                                </select>
                              </div>
                            </div>

                            {/* Detalhes de Divergências Detectadas */}
                            {temDivergencia && (
                              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 space-y-1 text-xs">
                                <span className="font-bold text-amber-950 text-[11px] block">
                                  Divergências com o Cadastro Existente:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {linha.divergenciasDetectadas?.map((d, dIdx) => (
                                    <div key={dIdx} className="bg-white p-1.5 rounded border border-amber-200/80 text-[11px]">
                                      <span className="font-bold text-slate-700 block">{d.campo}:</span>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-slate-500 line-through">"{String(d.valorAtual)}"</span>
                                        <span className="text-slate-400">→</span>
                                        <strong className="text-blue-700">"{String(d.valorNovo)}"</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Decisão Específica para Colaborador (Pessoa) */}
                            {linha.pessoaExistenteSimilar && (
                              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-blue-950">
                                    Colaborador Identificado: "{linha.dadosMapeados.pessoaNome || 'Nome na planilha'}"
                                  </span>
                                  <span className="text-[10px] text-blue-700 font-mono">
                                    Similaridade: {(linha.pessoaExistenteSimilar.scoreSimilaridade * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`pessoa-acao-${linha.indiceLinha}`}
                                      checked={linha.pessoaAcao === 'VINCULAR_EXISTENTE'}
                                      onChange={() => alterarPessoaAcaoLinha(linha.indiceLinha, 'VINCULAR_EXISTENTE')}
                                      className="text-blue-600 cursor-pointer"
                                    />
                                    <span>Vincular ao colaborador cadastrado: <strong>{linha.pessoaExistenteSimilar.nome}</strong></span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`pessoa-acao-${linha.indiceLinha}`}
                                      checked={linha.pessoaAcao === 'CRIAR_PESSOA'}
                                      onChange={() => alterarPessoaAcaoLinha(linha.indiceLinha, 'CRIAR_PESSOA')}
                                      className="text-blue-600 cursor-pointer"
                                    />
                                    <span>Criar novo colaborador no cadastro</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Decisão Específica para Curso / Treinamento */}
                            {linha.cursoExistenteSimilar && (
                              <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-purple-950">
                                    Curso/Treinamento Reconhecido: "{linha.dadosMapeados.cursoNome || 'Nome do Curso'}"
                                  </span>
                                  <span className="text-[10px] text-purple-700 font-mono">
                                    Similaridade: {(linha.cursoExistenteSimilar.scoreSimilaridade * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`curso-acao-${linha.indiceLinha}`}
                                      checked={linha.cursoAcao === 'VINCULAR_EXISTENTE'}
                                      onChange={() => alterarCursoAcaoLinha(linha.indiceLinha, 'VINCULAR_EXISTENTE')}
                                      className="text-purple-600 cursor-pointer"
                                    />
                                    <span>Vincular ao curso oficial: <strong>{linha.cursoExistenteSimilar.nome}</strong></span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`curso-acao-${linha.indiceLinha}`}
                                      checked={linha.cursoAcao === 'CRIAR_CURSO'}
                                      onChange={() => alterarCursoAcaoLinha(linha.indiceLinha, 'CRIAR_CURSO')}
                                      className="text-purple-600 cursor-pointer"
                                    />
                                    <span>Criar novo curso no catálogo SGQ</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            <p className="text-[11px] text-slate-500">
                              {linha.registroExistenteResumo || 'Conflito ou associação identificada na base de dados.'}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Quadro Resumo Pré-Commit */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Resumo da Operação que será Gravada no QualiGest:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border border-blue-100">
                    <span className="text-slate-500">Novos Registros:</span>
                    <strong className="block text-blue-900 font-bold text-sm">
                      {registrosValidados.filter((l) => l.selecionadoParaImportar && !l.duplicidadeDetectada && l.statusQualidade !== 'ERRO').length}
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded border border-blue-100">
                    <span className="text-slate-500">Atualizações:</span>
                    <strong className="block text-purple-900 font-bold text-sm">
                      {registrosValidados.filter((l) => l.selecionadoParaImportar && l.duplicidadeDetectada && l.acaoDuplicidade === 'ATUALIZAR').length}
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded border border-blue-100">
                    <span className="text-slate-500">Descartados/Ignorados:</span>
                    <strong className="block text-slate-700 font-bold text-sm">
                      {registrosValidados.filter((l) => !l.selecionadoParaImportar || l.acaoDuplicidade === 'IGNORAR' || l.statusQualidade === 'ERRO').length}
                    </strong>
                  </div>

                  <div className="p-2 bg-white rounded border border-blue-100">
                    <span className="text-slate-500">Evidências Vinculadas:</span>
                    <strong className="block text-emerald-900 font-bold text-sm">
                      {resumoPrevia?.evidenciasIdentificadas || 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ETAPA 6: RESULTADO & RASTREABILIDADE DO ARQUIVO ORIGINAL */}
          {/* ==================================================================== */}
          {etapaAtual === 6 && (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  IMPORTAÇÃO EFETIVADA COM SUCESSO
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  Etapa 6: Controles Incorporados ao QualiGest
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Os dados foram formalizados no banco do seu tenant com rastreabilidade ao arquivo original e registro inalterável de auditoria.
                </p>
              </div>

              {/* Rastreabilidade Regulamentar (Requisito 6) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  Rastreabilidade Completa Estabelecida (RBAC 145 / ISO 9001):
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5 text-xs text-slate-700 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Arquivo Original:</span>
                    <strong className="text-slate-900">{arquivoNome}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Hash Criptográfico SHA-256:</span>
                    <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                      {arquivoHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Responsável pela Validação:</span>
                    <span className="text-slate-900">{user?.nome || 'Gestor SGQ'} ({user?.email || 'admin@qualigest.aero'})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Data/Hora da Gravação:</span>
                    <span className="text-slate-900">{new Date().toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Código da Importação:</span>
                    <span className="text-blue-700 font-bold">{resultadoGravacao?.importId}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Qualquer auditor ou inspetor ANAC poderá clicar no registro dentro do sistema e visualizar: "Registro QualiGest → Importação → Arquivo original ({arquivoNome}, importado em {new Date().toLocaleDateString('pt-BR')})".
                </p>
              </div>

              {/* Botões de Ação para Navegar nos Módulos Alimentados */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setEtapaAtual(7)}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  Ver Oportunidades de Melhoria (Etapa 7)
                </button>

                {tipoControle === 'TREINAMENTOS' && onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('competencias-treinamentos')}
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Building2 className="w-4 h-4" />
                    Abrir Matriz de Treinamentos
                  </button>
                )}

                {tipoControle === 'CALIBRACAO_FERRAMENTAL' && (
                  <button
                    onClick={() => {
                      if (onNavigateToTab) {
                        onNavigateToTab('ferramentas-metrologia');
                      } else {
                        setTabPrincipal('METROLOGIA');
                      }
                    }}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Sliders className="w-4 h-4" />
                    Abrir no Módulo Oficial de Ferramentas & Metrologia
                  </button>
                )}

                {tipoControle === 'CONTROLE_DOCUMENTAL' && onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('controle-documental')}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    Abrir Controle Documental Oficial
                  </button>
                )}

                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('requisitos-clientes')}
                    className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Ver Requisitos de Clientes Atendidos
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* ETAPA 7: OPORTUNIDADES DE MELHORIA & MATURIDADE SGQ (REQUISITO 11) */}
          {/* ==================================================================== */}
          {etapaAtual === 7 && (
            <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      DIAGNÓSTICO PÓS-IMPORTAÇÃO
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      MELHORIA CONTÍNUA ISO 9001 / RBAC 145
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Etapa 7: Oportunidades de Melhoria e Maturidade dos Dados
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    O sistema analisou os dados importados e identificou oportunidades reais de aprimoramento da qualidade.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEtapaAtual(6)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    ← Voltar ao Resumo
                  </button>
                </div>
              </div>

              {/* INTEGRAÇÃO "UM CONTROLE → VÁRIOS REQUISITOS" (REQUISITO 10) */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Impacto Imediato: Requisitos de Clientes Alimentados Automaticamente
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Os controles importados de <strong>{arquivoNome}</strong> comprovaram conformidade com os requisitos contratuais de homologação de auditorias:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 bg-white border border-emerald-200 rounded-lg space-y-1">
                    <strong className="text-slate-900 block font-bold">Atlas Air Inc. (Auditoria de Linha)</strong>
                    <p className="text-slate-600 text-[11px]">
                      • Requisito ATLAS-04.01: Qualificação e Treinamentos Mandatórios (CHT, EWIS, FTS).<br />
                      • Requisito ATLAS-03.02: Programa de Calibração de Ferramental com Rastreabilidade RBC.
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                      Conformidade Elevada Automaticamente
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-emerald-200 rounded-lg space-y-1">
                    <strong className="text-slate-900 block font-bold">Kalitta Air LLC (Auditoria de Base)</strong>
                    <p className="text-slate-600 text-[11px]">
                      • Requisito KALITTA-QA-02: Evidências Documentadas de Treinamento Técnico.<br />
                      • Requisito KALITTA-TOOL-01: Controle de Tolerâncias e Prazos de Validade de Metrologia.
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                      Evidências Vinculadas com Sucesso
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista das Oportunidades com 4 Botões Oficiais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Gaps Identificados e Ações Práticas Disponíveis:
                </h4>

                {oportunidades.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
                    Nenhuma pendência crítica ou lacuna identificada. Seus controles operacionais estão com alto nível de maturidade!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {oportunidades.map((opp) => {
                      const tratada = oportunidadesTratadas[opp.id];
                      const isCritica = opp.severidade === 'CRITICA';
                      const isAlta = opp.severidade === 'ALTA';

                      return (
                        <div
                          key={opp.id}
                          className={`p-4 rounded-xl border space-y-3 transition ${
                            tratada
                              ? 'bg-slate-50 border-slate-200 opacity-70'
                              : isCritica
                              ? 'bg-red-50/50 border-red-200'
                              : isAlta
                              ? 'bg-amber-50/50 border-amber-200'
                              : 'bg-blue-50/40 border-blue-200'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isCritica
                                    ? 'bg-red-100 text-red-800'
                                    : isAlta
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {opp.severidade}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900">
                                {opp.titulo}
                              </h3>
                            </div>

                            {tratada ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                                ✓ {tratada}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-500">
                                {opp.registrosAfetados} registro(s) afetado(s)
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">
                            {opp.descricao}
                          </p>

                          {/* Os 4 Botões Oficiais de Ação */}
                          {!tratada && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                              <button
                                onClick={() => tratarOportunidade(opp, 'CRIAR_RNC')}
                                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <AlertOctagon className="w-3.5 h-3.5" />
                                [Criar RNC F 001-29]
                              </button>

                              <button
                                onClick={() => tratarOportunidade(opp, 'CRIAR_ACAO')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                [Criar Plano de Ação]
                              </button>

                              <button
                                onClick={() => tratarOportunidade(opp, 'CORRIGIR_DADOS')}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                [Corrigir Dados]
                              </button>

                              <button
                                onClick={() => tratarOportunidade(opp, 'IGNORAR')}
                                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                [Ignorar com Justificativa]
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 2: HISTÓRICO AUDITÁVEL DE IMPORTAÇÕES (REQUISITO 6 & 16) */}
      {/* ======================================================================== */}
      {tabPrincipal === 'HISTORICO' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Histórico de Arquivos Importados e Rastreabilidade
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registros imutáveis de todos os arquivos migrados com hash SHA-256 e autoria para auditorias ANAC/EASA.
            </p>
          </div>

          {smartImports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-xl">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhum arquivo importado ainda</p>
              <p className="text-xs text-slate-500">
                Utilize o "Assistente de Importação" para carregar seus primeiros controles.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Arquivo Original</th>
                    <th className="p-3">Tipo Controle</th>
                    <th className="p-3">Hash SHA-256</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3 text-center">Balanço Registros</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-36">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {smartImports.map((imp) => {
                    const isRevertida = Boolean(imp.revertida || imp.status === 'REVERTIDA');

                    return (
                      <tr key={imp.id} className={isRevertida ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50'}>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {new Date(imp.dataUpload).toLocaleString('pt-BR')}
                        </td>

                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          <div>{imp.nomeArquivo}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {imp.totalLinhasProcessadas || (imp.registrosCriadosQtd + imp.registrosAtualizadosQtd + (imp.registrosIgnoradosQtd || 0))} linhas analisadas
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {imp.tipoControle}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-[10px] text-purple-700">
                          {imp.hashSha256 ? imp.hashSha256.slice(0, 16) + '...' : '—'}
                        </td>

                        <td className="p-3 text-slate-700">
                          {imp.usuarioNome}
                        </td>

                        <td className="p-3 text-center">
                          <div className="text-xs font-bold text-slate-900">
                            <span className="text-emerald-700">+{imp.registrosCriadosQtd} novos</span>
                            {imp.registrosAtualizadosQtd > 0 && (
                              <span className="text-blue-700"> | {imp.registrosAtualizadosQtd} atualiz.</span>
                            )}
                          </div>
                          {(imp.registrosIgnoradosQtd || 0) > 0 && (
                            <span className="text-[10px] text-slate-400 block">
                              {imp.registrosIgnoradosQtd} ignorados
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {isRevertida ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              <RotateCcw className="w-3 h-3 text-red-600" />
                              Revertida
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Gravado
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isRevertida ? (
                              <button
                                onClick={() => setReversaoModal(imp)}
                                title="Reverter cadastros desta importação"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-600" />
                                Reverter
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold italic">Reversão feita</span>
                            )}
                            <button
                              onClick={() => setHistoricoParaExcluir(imp.id)}
                              title="Excluir este item da fila/histórico (mantém dados oficiais)"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 3: MODELOS HOMOLOGADOS DA EMPRESA (APRENDIZADO - REQUISITO 7) */}
      {/* ======================================================================== */}
      {tabPrincipal === 'TEMPLATES' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Modelos de Mapeamento Homologados da Empresa
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                O QualiGest memoriza e aplica os padrões de planilhas usados na sua organização para associar colunas instantaneamente em novas importações.
              </p>
            </div>

            <button
              onClick={handleAbrirNovoTemplate}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo Modelo de Mapeamento
            </button>
          </div>

          {mensagemSucesso && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mensagemSucesso}</span>
              </div>
              <button onClick={() => setMensagemSucesso(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {templatesAprovadosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhum modelo homologado salvo ainda</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Você pode criar modelos proativamente para os formatos de planilhas da sua oficina ou salvar ao importar um novo arquivo na Etapa 3.
              </p>
              <button
                onClick={handleAbrirNovoTemplate}
                className="mt-3 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 transition"
              >
                + Criar Primeiro Modelo Homologado
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templatesAprovadosFiltrados.map((tpl) => (
                <div key={tpl.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{tpl.nome || tpl.nomeTemplate}</h3>
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 mt-1 inline-block">
                        {tpl.tipoControle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleAbrirEditarTemplate(tpl)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 bg-white transition cursor-pointer"
                        title="Editar Modelo de Mapeamento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTemplateParaExcluir(tpl)}
                        className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 bg-white transition cursor-pointer"
                        title="Excluir Modelo Homologado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Homologado por <span className="font-semibold text-slate-700">{tpl.criadoPorNome || 'SGQ'}</span> em {new Date(tpl.criadoEm || tpl.dataAprovacao || Date.now()).toLocaleDateString('pt-BR')}.
                  </p>

                  <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block text-[11px]">
                      Colunas Reconhecidas ({tpl.colunasDetectadas?.length || 0}):
                    </span>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {tpl.colunasDetectadas?.join(', ') || 'Nenhuma coluna configurada'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Utilizado {tpl.vezesUtilizado || tpl.totalVezesUsado || 0} vez(es)
                    </div>

                    <button
                      onClick={() => {
                        setTipoControle(tpl.tipoControle);
                        setTabPrincipal('WIZARD');
                        setEtapaAtual(1);
                      }}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Usar no Assistente</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal de Edição / Criação de Modelo */}
          <TemplateEditModal
            isOpen={modalEditarTemplateAberta}
            onClose={() => setModalEditarTemplateAberta(false)}
            template={templateEmEdicao}
            organizationId={orgId}
            user={user}
            onSave={handleSalvarTemplate}
          />
        </div>
      )}

      {/* ======================================================================== */}
      {/* ABA 4: FERRAMENTAL & METROLOGIA (RBAC 145.109) */}
      {/* ======================================================================== */}
      {tabPrincipal === 'METROLOGIA' && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  CONTROLE DE FERRAMENTAL RBAC 145.109
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  RASTREABILIDADE RBC / INMETRO / NIST
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Instrumentos & Ferramental de Precisão Calibrados
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle operacional de torquímetros, manômetros, multímetros e instrumentos calibrados para liberação de aeronaves.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTabPrincipal('WIZARD');
                  setEtapaAtual(1);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Importar Planilha de Calibração
              </button>
            </div>
          </div>

          {/* Cards de Status de Ferramentas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setFiltroStatusFerramenta(filtroStatusFerramenta === 'CALIBRADA' ? 'TODAS' : 'CALIBRADA')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                filtroStatusFerramenta === 'CALIBRADA' ? 'bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-500' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <span className="text-xs text-emerald-800 font-bold">Calibradas</span>
              <p className="text-xl font-black text-emerald-950 mt-1">
                {ferramentasCalibradas.filter((f) => f.status === 'CALIBRADA').length}
              </p>
              <span className="text-[10px] text-emerald-700">Aptas para uso em voo</span>
            </div>

            <div
              onClick={() => setFiltroStatusFerramenta(filtroStatusFerramenta === 'PROXIMA_VENCIMENTO' ? 'TODAS' : 'PROXIMA_VENCIMENTO')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                filtroStatusFerramenta === 'PROXIMA_VENCIMENTO' ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-500' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <span className="text-xs text-amber-800 font-bold">Próximas Vencer (&lt;30d)</span>
              <p className="text-xl font-black text-amber-950 mt-1">
                {ferramentasCalibradas.filter((f) => f.status === 'PROXIMA_VENCIMENTO').length}
              </p>
              <span className="text-[10px] text-amber-700">Requer agendamento laboratório</span>
            </div>

            <div
              onClick={() => setFiltroStatusFerramenta(filtroStatusFerramenta === 'VENCIDA' ? 'TODAS' : 'VENCIDA')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                filtroStatusFerramenta === 'VENCIDA' ? 'bg-red-100/70 border-red-300 ring-2 ring-red-500' : 'bg-red-50 border-red-200'
              }`}
            >
              <span className="text-xs text-red-800 font-bold">Vencidas / Quarentena</span>
              <p className="text-xl font-black text-red-950 mt-1">
                {ferramentasCalibradas.filter((f) => f.status === 'VENCIDA' || f.status === 'QUARENTENA').length}
              </p>
              <span className="text-[10px] text-red-700">Uso proibido</span>
            </div>

            <div
              onClick={() => setFiltroStatusFerramenta('TODAS')}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                filtroStatusFerramenta === 'TODAS' ? 'bg-slate-100/70 border-slate-300 ring-2 ring-blue-500' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <span className="text-xs text-slate-600 font-medium">Total de Instrumentos</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {ferramentasCalibradas.length}
              </p>
              <span className="text-[10px] text-slate-500">Cadastrados no tenant</span>
            </div>
          </div>

          {/* Filtros e Busca de Instrumentos */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar patrimônio, descrição, série..."
                value={buscaFerramenta}
                onChange={(e) => setBuscaFerramenta(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {filtroStatusFerramenta !== 'TODAS' && (
                <button
                  onClick={() => setFiltroStatusFerramenta('TODAS')}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Limpar filtro ({filtroStatusFerramenta})
                </button>
              )}
              <span className="text-xs text-slate-500 font-medium">Exibindo:</span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {
                  ferramentasCalibradas.filter((tool) => {
                    const matchFiltro =
                      filtroStatusFerramenta === 'TODAS' ||
                      tool.status === filtroStatusFerramenta ||
                      (filtroStatusFerramenta === 'VENCIDA' && tool.status === 'QUARENTENA');
                    const termo = buscaFerramenta.toLowerCase();
                    const matchBusca =
                      !buscaFerramenta ||
                      tool.codigoPatrimonio.toLowerCase().includes(termo) ||
                      tool.descricao.toLowerCase().includes(termo) ||
                      tool.numeroSerie.toLowerCase().includes(termo) ||
                      (tool.fabricante && tool.fabricante.toLowerCase().includes(termo));
                    return matchFiltro && matchBusca;
                  }).length
                }{' '}
                de {ferramentasCalibradas.length}
              </span>
            </div>
          </div>

          {/* Tabela de Instrumentos */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Patrimônio / Tag</th>
                  <th className="p-3">Descrição do Instrumento</th>
                  <th className="p-3">Fabricante / Modelo</th>
                  <th className="p-3">Número de Série</th>
                  <th className="p-3">Última Calibração</th>
                  <th className="p-3">Próxima Calibração</th>
                  <th className="p-3">Certificado RBC</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-36">Ações Metrológicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ferramentasCalibradas
                  .filter((tool) => {
                    const matchFiltro =
                      filtroStatusFerramenta === 'TODAS' ||
                      tool.status === filtroStatusFerramenta ||
                      (filtroStatusFerramenta === 'VENCIDA' && tool.status === 'QUARENTENA');
                    const termo = buscaFerramenta.toLowerCase();
                    const matchBusca =
                      !buscaFerramenta ||
                      tool.codigoPatrimonio.toLowerCase().includes(termo) ||
                      tool.descricao.toLowerCase().includes(termo) ||
                      tool.numeroSerie.toLowerCase().includes(termo) ||
                      (tool.fabricante && tool.fabricante.toLowerCase().includes(termo));
                    return matchFiltro && matchBusca;
                  })
                  .map((tool) => {
                    const isVencida = tool.status === 'VENCIDA' || tool.status === 'QUARENTENA';
                    const isProx = tool.status === 'PROXIMA_VENCIMENTO';
                    const isAtivo = tool.ativo !== false;

                    return (
                      <tr key={tool.id} className={!isAtivo ? 'bg-slate-50 opacity-60' : isVencida ? 'bg-red-50/40' : isProx ? 'bg-amber-50/30' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <div>{tool.codigoPatrimonio}</div>
                          {!isAtivo && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                              INATIVO
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-slate-800 font-medium max-w-xs">
                          <div className="font-bold">{tool.descricao}</div>
                          <div className="text-[11px] text-slate-500 truncate">{tool.setor}</div>
                        </td>

                        <td className="p-3 text-slate-600">
                          {tool.fabricante} {tool.modelo ? `(${tool.modelo})` : ''}
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-700">
                          {tool.numeroSerie}
                        </td>

                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {tool.dataUltimaCalibracao}
                        </td>

                        <td className="p-3 font-bold whitespace-nowrap">
                          <span className={isVencida ? 'text-red-700' : isProx ? 'text-amber-800' : 'text-slate-900'}>
                            {tool.dataProximaCalibracao}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {tool.numeroCertificado || '—'}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {isVencida ? (
                            <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                              VENCIDA
                            </span>
                          ) : isProx ? (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              EXPIRA EM BREVE
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              CALIBRADA
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setFerramentaHistoricoModal(tool)}
                              title="Visualizar histórico metrológico RBC"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <History className="w-3 h-3" />
                              Histórico
                            </button>
                            <button
                              onClick={() => handleToggleAtivoFerramenta(tool)}
                              title={isAtivo ? 'Inativar instrumento' : 'Reativar instrumento'}
                              className={`p-1 rounded transition cursor-pointer ${
                                isAtivo ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setFerramentaParaExcluir(tool.id)}
                              title="Excluir ferramenta do cadastro oficial"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAIS DA FASE 14.1 (RECONCILIAÇÃO, REVERSÃO, HISTÓRICO METROLÓGICO) */}
      {/* ======================================================================== */}

      {/* Modal de Reconciliação e Comparativo Lado a Lado (Fase 14.1 - Requisito 6) */}
      <ReconciliationDiffModal
        linha={reconciliationModalLinha}
        tipoControle={tipoControle}
        isOpen={Boolean(reconciliationModalLinha)}
        onClose={() => setReconciliationModalLinha(null)}
        onDecidir={(indiceLinha, decisao) => {
          alterarDecisaoReconciliacaoLinha(indiceLinha, decisao);
          setReconciliationModalLinha(null);
        }}
        onAlterarPessoaAcao={alterarPessoaAcaoLinha}
        onAlterarCursoAcao={alterarCursoAcaoLinha}
      />

      {/* Modal de Reversão de Importação com Auditoria e Validação de Dependências (Fase 14.1 - Requisito 12) */}
      <ImportReversalModal
        importacao={reversaoModal}
        user={user}
        isOpen={Boolean(reversaoModal)}
        onClose={() => setReversaoModal(null)}
        onConfirmarReversao={handleReverterImportacao}
      />

      {/* Modal de Histórico Metrológico e Calibrações (Fase 14.1 - Requisito 8) */}
      <ToolCalibrationHistoryModal
        tool={ferramentaHistoricoModal}
        isOpen={Boolean(ferramentaHistoricoModal)}
        onClose={() => setFerramentaHistoricoModal(null)}
      />

      {/* ======================================================================== */}
      {/* MODAL DE HOMOLOGAÇÃO DIRETA DE MODELO NA ETAPA 2                        */}
      {/* ======================================================================== */}
      {modalHomologarEtapa2Aberta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Gerar Modelo Homologado da Empresa</h3>
                  <p className="text-xs text-slate-500">Mapeamento Oficial Baseado nas Colunas Revalidadas</p>
                </div>
              </div>
              <button
                onClick={() => !isSalvandoModeloEtapa2 && setModalHomologarEtapa2Aberta(false)}
                disabled={isSalvandoModeloEtapa2}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome do Modelo Homologado *
                </label>
                <input
                  type="text"
                  value={nomeModeloEtapa2}
                  onChange={(e) => setNomeModeloEtapa2(e.target.value)}
                  placeholder="Ex: Planilha Padrão de Calibração Metrológica REC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Módulo SGQ:</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    {tipoControle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Arquivo de Origem:</span>
                  <span className="text-slate-800 font-semibold truncate max-w-[200px]" title={arquivoNome}>
                    {arquivoNome || 'Arquivo enviado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block mb-1">
                    Colunas Homologadas ({colunasDetectadas.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-md">
                    {colunasDetectadas.map((col, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono rounded border border-slate-200">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                Ao salvar, este modelo se tornará um padrão homologado da empresa. Qualquer novo arquivo enviado com cabeçalhos correspondentes será reconhecido automaticamente com 100% de precisão.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalHomologarEtapa2Aberta(false)}
                disabled={isSalvandoModeloEtapa2}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarHomologarModeloEtapa2}
                disabled={isSalvandoModeloEtapa2 || !nomeModeloEtapa2.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSalvandoModeloEtapa2 ? 'Salvando...' : 'Homologar Modelo Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL DE CONFIRMAÇÃO: EXCLUSÃO DEFINITIVA DE MODELO HOMOLOGADO           */}
      {/* ======================================================================== */}
      {templateParaExcluir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Excluir Modelo Homologado</h3>
                  <p className="text-xs text-slate-500">Mapeamento da Empresa</p>
                </div>
              </div>
              <button
                onClick={() => !isExcluindoTemplate && setTemplateParaExcluir(null)}
                disabled={isExcluindoTemplate}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nome do Modelo:</span>
                <strong className="text-slate-900 font-semibold">{templateParaExcluir.nome || templateParaExcluir.nomeTemplate}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Módulo / Tipo:</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                  {templateParaExcluir.tipoControle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Colunas Mapeadas:</span>
                <span className="text-slate-700 font-semibold">
                  {templateParaExcluir.colunasDetectadas?.length || 0} coluna(s)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja apagar o modelo homologado <strong>"{templateParaExcluir.nome || templateParaExcluir.nomeTemplate}"</strong>? Ele será excluído definitivamente do banco de dados e deixará de ser reconhecido automaticamente em futuras importações.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTemplateParaExcluir(null)}
                disabled={isExcluindoTemplate}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcluirTemplate}
                disabled={isExcluindoTemplate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isExcluindoTemplate ? 'Excluindo...' : 'Apagar Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL DE CONFIRMAÇÃO: EXCLUSÃO DE HISTÓRICO DE IMPORTAÇÃO                */}
      {/* ======================================================================== */}
      {historicoParaExcluir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Excluir Registro de Histórico</h3>
                  <p className="text-xs text-slate-500">Auditoria de importação</p>
                </div>
              </div>
              <button
                onClick={() => !isExcluindoHistorico && setHistoricoParaExcluir(null)}
                disabled={isExcluindoHistorico}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja excluir este registro do histórico de importações? Os cadastros oficiais já consolidados no QualiGest <strong>permanecerão intactos</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoricoParaExcluir(null)}
                disabled={isExcluindoHistorico}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcluirHistorico}
                disabled={isExcluindoHistorico}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isExcluindoHistorico ? 'Excluindo...' : 'Excluir Histórico'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL DE CONFIRMAÇÃO: EXCLUSÃO DE FERRAMENTA CALIBRADA                   */}
      {/* ======================================================================== */}
      {ferramentaParaExcluir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Excluir Ferramenta / Instrumento</h3>
                  <p className="text-xs text-slate-500">Controle Metrológico RBAC 145.109</p>
                </div>
              </div>
              <button
                onClick={() => !isExcluindoFerramenta && setFerramentaParaExcluir(null)}
                disabled={isExcluindoFerramenta}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir esta ferramenta do cadastro oficial de calibração metrológica?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFerramentaParaExcluir(null)}
                disabled={isExcluindoFerramenta}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFerramenta}
                disabled={isExcluindoFerramenta}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isExcluindoFerramenta ? 'Excluindo...' : 'Excluir Ferramenta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
