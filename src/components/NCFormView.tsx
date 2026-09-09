import React, { useState, useMemo, useEffect } from 'react';
import { 
  Save, 
  ArrowLeft, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Plus, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  FileText,
  UserCheck,
  BookOpen,
  Search,
  Zap,
  Check,
  ShieldAlert,
  GitBranch,
  Info,
  Scale,
  Workflow,
  RefreshCw,
  Sliders,
  Target,
  Compass,
  ArrowRight,
  CheckCircle,
  XCircle,
  Link
} from 'lucide-react';
import { 
  NCRecord, 
  AvaliacaoRisco, 
  TipoAcao, 
  MetodoVerificacaoEficacia, 
  StatusGeralNC, 
  ManualRecord,
  SuggestionDecision,
  RegistroAuditoriaNC,
  DocumentoNormativoAplicavel,
  CoerenciaCausaRaizResultado,
  OrganizationRecord,
  AnaliseSetorResponsavel
} from '../types';
import { RiskMatrixWidget } from './RiskMatrixWidget';
import { formatarData, calcularDiasRestantes, getApplicableDocumentVersion } from '../utils/qualityHelpers';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ManualsConsultModal } from './ManualsConsultModal';
import { AISuggestionModal, AISuggestionResult } from './AISuggestionModal';
import { OrganizationBrandLogo } from './OrganizationBrandLogo';
import { DEFAULT_ORG_CONFIG } from '../services/firebase/firestore';
import { sanitizeManualsForAPI } from '../utils/manualsStorage';
import { useAuth } from '../contexts/AuthContext';
import { analisarSetorComIAEHeuristica } from '../utils/sectorAnalyzer';

interface NCFormViewProps {
  initialData?: NCRecord | null;
  initialTab?: 'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia';
  manuals?: ManualRecord[];
  organization?: OrganizationRecord | null;
  onSave: (nc: NCRecord) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onAuditNC?: (nc: NCRecord) => void;
}

export const NCFormView: React.FC<NCFormViewProps> = ({
  initialData,
  initialTab = 'dados',
  manuals = [],
  organization,
  onSave,
  onCancel,
  onDelete,
  onAuditNC,
}) => {
  const { user, userProfile } = useAuth();
  const isEditing = !!initialData?.id;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultInitialQuery, setConsultInitialQuery] = useState('');
  
  // Available sectors and categories from active tenant configuration
  const availableSetores = organization?.configuration?.setores || DEFAULT_ORG_CONFIG.setores;
  const availableCategorias = organization?.configuration?.categorias || DEFAULT_ORG_CONFIG.categorias;
  
  // AI Suggestion State
  const [isAISuggestionModalOpen, setIsAISuggestionModalOpen] = useState(false);
  const [aiSuggestionResult, setAiSuggestionResult] = useState<AISuggestionResult | null>(null);
  const [aiToastMessage, setAiToastMessage] = useState<string | null>(null);
  const [isEvaluatingCoherence, setIsEvaluatingCoherence] = useState(false);
  const [coherenceResult, setCoherenceResult] = useState<CoerenciaCausaRaizResultado | null>(null);

  // SEÇÃO 6: Análise de Setor Responsável State
  const [isAnalyzingSector, setIsAnalyzingSector] = useState(false);
  const [analiseSetor, setAnaliseSetor] = useState<AnaliseSetorResponsavel | null>(initialData?.analiseSetor || null);
  const [justificativaDivergenciaInput, setJustificativaDivergenciaInput] = useState<string>('');
  const [showDivergenceJustifyBox, setShowDivergenceJustifyBox] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<NCRecord>(() => {
    if (initialData) {
      return {
        ...initialData,
        responsavel: initialData.responsavel || initialData.acaoCorretiva?.responsavel || initialData.preAnaliseContencao?.responsavel || '',
        decisoesSugestoes: initialData.decisoesSugestoes || [],
        trilhaAuditoria: initialData.trilhaAuditoria || [],
        analiseSetor: initialData.analiseSetor || undefined,
      };
    }
    return {
      id: `nc-${Date.now()}`,
      codigoFormulario: 'F 001-29',
      revisao: '00',
      dataEmissaoFormulario: '02/09/2025',
      numeroNC: '',
      titulo: '',
      tipoAcao: 'Corretiva',
      descricaoNC: '',
      normaReferencia: '',
      versaoDocumentoId: '',
      setor: '',
      categoria: 'Geral',
      responsavel: '',
      avaliacaoRiscoInicial: {
        severidade: '2',
        probabilidade: 'C',
        codigo: '2C',
        nivel: 'Médio',
      },
      prazoResposta: '',
      dataIdentificacao: new Date().toISOString().split('T')[0],
      auditor: userProfile?.displayName || user?.displayName || user?.email || '',
      preAnaliseContencao: {
        descricao: '',
        responsavel: '',
        dataLimite: '',
        status: 'Pendente',
      },
      analiseCausaRaiz: {
        metodologia: '5 Porquês',
        cincoPorques: ['', '', '', '', ''],
        ishikawa: {
          metodo: '',
          maquina: '',
          maoDeObra: '',
          material: '',
          medicao: '',
          meioAmbiente: '',
        },
        detalhes: '',
      },
      acaoCorretiva: {
        descricao: '',
        comoSeraFeito: '',
        responsavel: '',
        dataPrazo: '',
        status: 'Não Iniciada',
        assinaturaResponsavel: '',
      },
      verificacaoEficacia: {
        metodo: 'Documental',
        outroMetodoDetalhe: '',
        avaliacaoRiscoResidual: {
          severidade: '4',
          probabilidade: 'E',
          codigo: '4E',
          nivel: 'Baixo',
        },
        encerrado: 'Pendente',
        motivo: '',
        dataVerificacao: '',
        auditorVerificador: '',
      },
      statusGeral: 'Aberta',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      historicoPrazos: [],
      decisoesSugestoes: [],
      trilhaAuditoria: [],
    };
  });

  const [activeTab, setActiveTab] = useState<'dados' | 'risco' | 'contencao' | 'causa' | 'acao' | 'eficacia'>(initialTab);
  const [aiLoading, setAiLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, initialData?.id]);

  // Dynamic Normative and Version Identification
  const dataReferenciaOcorrencia = formData.dataIdentificacao || formData.dataEmissaoFormulario || new Date().toISOString().split('T')[0];

  const matchingManual = useMemo(() => {
    if (!formData.normaReferencia || !manuals || manuals.length === 0) return undefined;
    const norm = formData.normaReferencia.toUpperCase();
    return manuals.find(m => {
      const cod = (m.codigo || '').toUpperCase();
      const tit = (m.titulo || '').toUpperCase();
      return (cod && norm.includes(cod)) || (tit && norm.includes(tit));
    });
  }, [formData.normaReferencia, manuals]);

  const applicableVersionInfo = useMemo(() => {
    return getApplicableDocumentVersion(matchingManual, dataReferenciaOcorrencia);
  }, [matchingManual, dataReferenciaOcorrencia]);

  // Field change helpers
  const handleChange = (field: keyof NCRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResponsavelGeralChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      responsavel: val,
      acaoCorretiva: {
        ...prev.acaoCorretiva,
        responsavel: (!prev.acaoCorretiva.responsavel || prev.acaoCorretiva.responsavel === prev.responsavel) ? val : prev.acaoCorretiva.responsavel,
      },
    }));
  };

  const handleContencaoChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      preAnaliseContencao: { ...prev.preAnaliseContencao, [field]: value },
    }));
  };

  const handleCausaRaizChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      analiseCausaRaiz: { ...prev.analiseCausaRaiz, [field]: value },
    }));
  };

  const handleIshikawaChange = (factor: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      analiseCausaRaiz: {
        ...prev.analiseCausaRaiz,
        ishikawa: { ...prev.analiseCausaRaiz.ishikawa, [factor]: value },
      },
    }));
  };

  const handle5WhyChange = (index: number, value: string) => {
    const updated = [...(formData.analiseCausaRaiz.cincoPorques || [])];
    updated[index] = value;
    setFormData(prev => ({
      ...prev,
      analiseCausaRaiz: { ...prev.analiseCausaRaiz, cincoPorques: updated },
    }));
  };

  const handleAddWhy = () => {
    setFormData(prev => ({
      ...prev,
      analiseCausaRaiz: {
        ...prev.analiseCausaRaiz,
        cincoPorques: [...(prev.analiseCausaRaiz.cincoPorques || []), ''],
      },
    }));
  };

  const handleRemoveWhy = (indexToRemove: number) => {
    setFormData(prev => {
      const currentWhys = prev.analiseCausaRaiz.cincoPorques || [];
      if (currentWhys.length <= 1) return prev;
      const updated = currentWhys.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        analiseCausaRaiz: {
          ...prev.analiseCausaRaiz,
          cincoPorques: updated,
        },
      };
    });
  };

  const handleAcaoChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      acaoCorretiva: { ...prev.acaoCorretiva, [field]: value },
    }));
  };

  const handleEficaciaChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      verificacaoEficacia: { ...prev.verificacaoEficacia, [field]: value },
    }));
  };

  const showToast = (msg: string) => {
    setAiToastMessage(msg);
    setTimeout(() => setAiToastMessage(null), 4000);
  };

  // Trigger Full AI Suggestion Modal with Manuals
  const handleAIAssist = async () => {
    if (!formData.descricaoNC) {
      setValidationError('Preencha primeiro a Descrição da Não Conformidade para a IA consultar os manuais e gerar a análise.');
      setActiveTab('dados');
      return;
    }

    setAiLoading(true);
    setIsAISuggestionModalOpen(true);
    setValidationError(null);

    try {
      let sugestao: AISuggestionResult | null = null;
      const sanitized = sanitizeManualsForAPI(manuals || []);

      try {
        const res = await fetch('/api/ai-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descricaoNC: formData.descricaoNC,
            normaReferencia: formData.normaReferencia,
            setor: formData.setor,
            manuals: sanitized,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.success && data.sugestao) {
            sugestao = data.sugestao;
          }
        }
      } catch (fetchErr) {
        console.warn('API suggestion endpoint unreachable, using standard SGQ suggestion engine:', fetchErr);
      }

      if (!sugestao) {
        sugestao = {
          origemMotor: 'MOTOR DETERMINÍSTICO SGQ',
          enquadramentoManualSugerido: formData.normaReferencia || 'MOMQ Rev. 14',
          itemRequisitoIdentificado: 'Controle de Processos e Garantia da Qualidade SGQ',
          procedimentoInternoRecomendado: 'Procedimento Operacional Padrão de Tratamento de Não Conformidades',
          preAnaliseCausaContencao: {
            descricao: '1. Bloquear imediatamente os itens ou processos sob desvio;\n2. Segregar produtos afetados;\n3. Realizar auditoria emergencial de conformidade com os manuais.',
            justificativaNormativa: 'Contenção imediata obrigatória para evitar propagação do desvio operacional.',
            prazoSugeridoDias: 2,
            responsavelSugerido: formData.responsavel || 'Supervisor da Área',
          },
          analiseCausaRaiz: {
            cincoPorques: [
              `1. (Investigação) Qual o desvio factual imediato constatado no registro "${(formData.descricaoNC || 'processo').substring(0, 80)}"?`,
              `2. (Investigação) A execução da rotina operacional referente a ${formData.normaReferencia || 'SGQ'} possui registros comprobatórios de conformidade?`,
              `3. (Investigação) As barreiras intermediárias de controle previstas para o setor ${formData.setor || 'operacional'} foram executadas?`,
              '4. (Investigação) Há evidências de fatores causais sistêmicos (método, ferramenta, capacitação ou documentação)?',
              '5. (Conclusão) Hipótese causal não determinada por falta de evidências suficientes — Evidências adicionais necessárias para investigação.',
            ],
            sinteseCausaRaiz: 'Hipótese causal não determinada por falta de evidências suficientes.',
            explicacaoCausaSistemica: 'Evidências adicionais necessárias para investigação in loco da cadeia causal e identificação da causa sistêmica.',
            statusValidacao: 'PENDENTE DE VALIDAÇÃO HUMANA',
            evidenciasSustentacao: [
              'Fato relatado na abertura da Não Conformidade',
              formData.normaReferencia ? `Documento de referência: ${formData.normaReferencia}` : 'Cadastro preliminar da NC',
            ],
            evidenciasFaltantes: [
              'Evidências adicionais necessárias para investigação.',
              'Verificação in loco de registros físicos e ordens de serviço executadas',
              'Entrevistas com executantes e histórico operacional recente',
            ],
            perguntasInvestigacao: [
              'Quais fatores humanos, operacionais ou de ferramentas contribuíram diretamente para a ocorrência?',
              'Os colaboradores foram formalmente treinados na versão vigente do procedimento?',
            ],
            nivelSuporteDocumental: 'Evidência insuficiente',
            justificativaSuporte: 'Hipótese causal não determinada por falta de evidências suficientes. Requer investigação in loco e validação humana.',
            ishikawa: {
              metodo: `Requer verificação de aderência ao procedimento e instruções de trabalho (${formData.normaReferencia || 'SGQ'})`,
              maquina: 'Requer verificação de instrumentos, ferramentas e sistemas digitais utilizados',
              maoDeObra: 'Requer verificação de qualificação técnica e matriz de treinamento dos executantes',
              material: 'Requer verificação de certificados, peças e insumos aplicados',
              medicao: 'Requer verificação de calibração, checagens e parâmetros de tolerância',
              meioAmbiente: 'Requer verificação das condições de trabalho, iluminação e comunicação entre turnos',
            },
          },
          acaoCorretiva: {
            descricao: `1. Revisar e publicar o procedimento ${formData.normaReferencia || 'MOMQ'};\n2. Capacitar a equipe do setor ${formData.setor || 'responsável'};\n3. Implantar checklist de conferência e realizar auditoria em 30 dias.`,
            comoSeraFeito: 'Execução conjunta da Garantia da Qualidade e chefia de setor.',
            responsavelSugerido: formData.responsavel || 'Garantia da Qualidade',
            prazoSugeridoDias: 30,
            metodoVerificacaoSugerido: 'Documental e Auditoria Interna',
          },
        };
      }

      setAiSuggestionResult(sugestao);
    } catch (e) {
      console.error('Error generating suggestions:', e);
    } finally {
      setAiLoading(false);
    }
  };

  // Evento 1: Aceitar Sugestão Individual
  const handleAcceptSuggestion = (
    fieldId: string,
    fieldLabel: string,
    suggestedValue: any,
    source: string
  ) => {
    const user = formData.auditor || 'Auditor SGQ';
    const now = new Date().toISOString();

    // 1. Atualiza o formulário com base no campo
    setFormData(prev => {
      let updated = { ...prev };

      if (fieldId === 'enquadramento') {
        updated.normaReferencia = String(suggestedValue);
      } else if (fieldId === 'contencao') {
        const contencaoDesc = typeof suggestedValue === 'string' 
          ? suggestedValue 
          : suggestedValue?.descricao || '';
        updated.preAnaliseContencao = {
          ...prev.preAnaliseContencao,
          descricao: contencaoDesc,
        };
      } else if (fieldId === 'cincoPorques') {
        const porques = Array.isArray(suggestedValue) ? suggestedValue : [String(suggestedValue)];
        const cleanLastWhy = porques.length > 0 ? porques[porques.length - 1] : '';
        const suggestedSynthesis = aiSuggestionResult?.analiseCausaRaiz?.sinteseCausaRaiz || cleanLastWhy;
        updated.analiseCausaRaiz = {
          ...prev.analiseCausaRaiz,
          cincoPorques: porques,
          detalhes: suggestedSynthesis || prev.analiseCausaRaiz.detalhes,
        };
      } else if (fieldId === 'ishikawa') {
        updated.analiseCausaRaiz = {
          ...prev.analiseCausaRaiz,
          ishikawa: typeof suggestedValue === 'object' ? suggestedValue : prev.analiseCausaRaiz.ishikawa,
        };
      } else if (fieldId === 'acaoCorretiva') {
        const acaoDesc = typeof suggestedValue === 'string' 
          ? suggestedValue 
          : suggestedValue?.descricao || '';
        const comoSeraFeito = suggestedValue?.comoSeraFeito || prev.acaoCorretiva.comoSeraFeito;
        updated.acaoCorretiva = {
          ...prev.acaoCorretiva,
          descricao: acaoDesc,
          comoSeraFeito: comoSeraFeito,
        };
      }

      // 2. Registra a decisão humana em decisoesSugestoes
      const novaDecisao: SuggestionDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        field: fieldId,
        fieldLabel: fieldLabel,
        suggestedValue: typeof suggestedValue === 'object' ? JSON.stringify(suggestedValue) : String(suggestedValue),
        finalValue: typeof suggestedValue === 'object' ? JSON.stringify(suggestedValue) : String(suggestedValue),
        source: source,
        status: 'ACEITA',
        user: user,
        timestamp: now,
      };

      const decisoesFiltradas = (prev.decisoesSugestoes || []).filter(d => d.field !== fieldId);
      updated.decisoesSugestoes = [...decisoesFiltradas, novaDecisao];

      // 3. Registra na trilha de auditoria
      const novoRegistroAuditoria: RegistroAuditoriaNC = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: now,
        usuario: user,
        campoAlterado: fieldLabel,
        valorAnterior: '[Vazio / Não definido]',
        novoValor: typeof suggestedValue === 'object' ? JSON.stringify(suggestedValue) : String(suggestedValue),
        origem: 'Gerada pela IA',
        tipoEvento: 'SUGESTAO_ACEITA',
        decisaoHumana: 'Aceita',
        justificativa: `Sugestão de ${fieldLabel} gerada por ${source} aceita e incorporada à NC.`,
      };
      updated.trilhaAuditoria = [...(prev.trilhaAuditoria || []), novoRegistroAuditoria];

      return updated;
    });

    showToast(`Sugestão de "${fieldLabel}" aceita e incorporada ao formulário.`);
  };

  // Evento 2: Editar e Aceitar Sugestão
  const handleEditSuggestion = (
    fieldId: string,
    fieldLabel: string,
    originalValue: any,
    editedValue: any,
    source: string
  ) => {
    const user = formData.auditor || 'Auditor SGQ';
    const now = new Date().toISOString();

    setFormData(prev => {
      let updated = { ...prev };

      if (fieldId === 'enquadramento') {
        updated.normaReferencia = String(editedValue);
      } else if (fieldId === 'contencao') {
        updated.preAnaliseContencao = {
          ...prev.preAnaliseContencao,
          descricao: String(editedValue),
        };
      } else if (fieldId === 'cincoPorques') {
        const porques = Array.isArray(editedValue) ? editedValue : [String(editedValue)];
        updated.analiseCausaRaiz = {
          ...prev.analiseCausaRaiz,
          cincoPorques: porques,
        };
      } else if (fieldId === 'ishikawa') {
        updated.analiseCausaRaiz = {
          ...prev.analiseCausaRaiz,
          ishikawa: typeof editedValue === 'object' ? editedValue : prev.analiseCausaRaiz.ishikawa,
        };
      } else if (fieldId === 'acaoCorretiva') {
        updated.acaoCorretiva = {
          ...prev.acaoCorretiva,
          descricao: String(editedValue),
        };
      }

      // 2. Registra decisão EDITADA
      const novaDecisao: SuggestionDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        field: fieldId,
        fieldLabel: fieldLabel,
        suggestedValue: typeof originalValue === 'object' ? JSON.stringify(originalValue) : String(originalValue),
        finalValue: typeof editedValue === 'object' ? JSON.stringify(editedValue) : String(editedValue),
        source: `${source} + alteração humana`,
        status: 'EDITADA',
        user: user,
        timestamp: now,
      };

      const decisoesFiltradas = (prev.decisoesSugestoes || []).filter(d => d.field !== fieldId);
      updated.decisoesSugestoes = [...decisoesFiltradas, novaDecisao];

      // 3. Registra na trilha de auditoria
      const novoRegistroAuditoria: RegistroAuditoriaNC = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: now,
        usuario: user,
        campoAlterado: fieldLabel,
        valorAnterior: typeof originalValue === 'object' ? JSON.stringify(originalValue) : String(originalValue),
        novoValor: typeof editedValue === 'object' ? JSON.stringify(editedValue) : String(editedValue),
        origem: 'Modificada pelo usuário',
        tipoEvento: 'SUGESTAO_EDITADA',
        decisaoHumana: 'Editada',
        justificativa: `Sugestão de ${fieldLabel} gerada por ${source} foi ajustada pelo auditor antes da incorporação.`,
      };
      updated.trilhaAuditoria = [...(prev.trilhaAuditoria || []), novoRegistroAuditoria];

      return updated;
    });

    showToast(`Sugestão de "${fieldLabel}" editada e incorporada com sucesso.`);
  };

  // Evento 3: Rejeitar Sugestão
  const handleRejectSuggestion = (
    fieldId: string,
    fieldLabel: string,
    suggestedValue: any,
    source: string
  ) => {
    const user = formData.auditor || 'Auditor SGQ';
    const now = new Date().toISOString();

    setFormData(prev => {
      // Registra decisão REJEITADA sem alterar campos do formulário
      const novaDecisao: SuggestionDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        field: fieldId,
        fieldLabel: fieldLabel,
        suggestedValue: typeof suggestedValue === 'object' ? JSON.stringify(suggestedValue) : String(suggestedValue),
        finalValue: '[Rejeitado - Não aplicado]',
        source: source,
        status: 'REJEITADA',
        user: user,
        timestamp: now,
      };

      const decisoesFiltradas = (prev.decisoesSugestoes || []).filter(d => d.field !== fieldId);

      const novoRegistroAuditoria: RegistroAuditoriaNC = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: now,
        usuario: user,
        campoAlterado: fieldLabel,
        valorAnterior: typeof suggestedValue === 'object' ? JSON.stringify(suggestedValue) : String(suggestedValue),
        novoValor: '[Rejeitado pelo auditor]',
        origem: 'Rejeitada',
        tipoEvento: 'SUGESTAO_REJEITADA',
        decisaoHumana: 'Rejeitada',
        justificativa: `Sugestão de ${fieldLabel} gerada por ${source} foi rejeitada e não incorporada.`,
      };

      return {
        ...prev,
        decisoesSugestoes: [...decisoesFiltradas, novaDecisao],
        trilhaAuditoria: [...(prev.trilhaAuditoria || []), novoRegistroAuditoria],
      };
    });

    showToast(`Sugestão de "${fieldLabel}" rejeitada.`);
  };

  // Avaliação de Coerência Causal dos 5 Porquês com a Conclusão & Ação
  const handleEvaluateCoherence = async () => {
    setIsEvaluatingCoherence(true);
    try {
      const payload = {
        descricaoNC: formData.descricaoNC,
        titulo: formData.titulo,
        cincoPorques: formData.analiseCausaRaiz?.cincoPorques || [],
        conclusaoCausaRaiz: formData.analiseCausaRaiz?.detalhes || '',
        ishikawa: formData.analiseCausaRaiz?.ishikawa || {},
        acaoCorretiva: formData.acaoCorretiva?.descricao || '',
        normaReferencia: formData.normaReferencia || '',
        manuals: sanitizeManualsForAPI(manuals)
      };

      const response = await fetch('/api/evaluate-root-cause-coherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao auditar coerência');
      const data = await response.json();
      if (data.success && data.coerencia) {
        setCoherenceResult(data.coerencia);
        setFormData(prev => ({
          ...prev,
          analiseCausaRaiz: {
            ...prev.analiseCausaRaiz,
            coerenciaAvaliada: data.coerencia
          }
        }));
        showToast('Diagnóstico de coerência dos 5 Porquês com a conclusão realizado com sucesso.');
      }
    } catch (err: any) {
      console.warn('Erro ao avaliar coerência:', err);
      showToast('Não foi possível concluir a avaliação de coerência no momento.');
    } finally {
      setIsEvaluatingCoherence(false);
    }
  };

  const handleSyncConclusionWithLastWhy = () => {
    const whys = formData.analiseCausaRaiz?.cincoPorques || [];
    const validWhys = whys.filter(w => w && w.trim().length > 0);
    if (validWhys.length === 0) {
      showToast('Preencha ao menos uma etapa dos Porquês para sincronizar.');
      return;
    }
    const lastWhy = validWhys[validWhys.length - 1];
    const cleaned = lastWhy
      .replace(/^[0-9]+[.\-)]*\s*(por\s*qu[eê]\??:?\s*)?/i, '')
      .replace(/.*?(porque|devido a|em raz[aã]o de)\s*/i, '')
      .trim();
    const finalClean = cleaned.length > 5 ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : lastWhy;
    
    setFormData(prev => ({
      ...prev,
      analiseCausaRaiz: {
        ...prev.analiseCausaRaiz,
        detalhes: finalClean
      }
    }));
    showToast('Conclusão sincronizada com o último porquê da cadeia causal.');
  };

  const handleApplyHarmonizedConclusion = (conclusao: string) => {
    if (!conclusao) return;
    const user = formData.auditor || 'Auditor SGQ';
    const now = new Date().toISOString();

    setFormData(prev => {
      const novoRegistroAuditoria: RegistroAuditoriaNC = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: now,
        usuario: user,
        campoAlterado: 'Síntese da Causa Raiz (Harmonizada)',
        valorAnterior: prev.analiseCausaRaiz?.detalhes || '[Vazio]',
        novoValor: conclusao,
        origem: 'Harmonização IA 5 Porquês',
        tipoEvento: 'SUGESTAO_ACEITA',
        decisaoHumana: 'Aceita',
        justificativa: 'Conclusão alinhada e derivada diretamente dos 5 Porquês pela auditoria de coerência.',
      };

      return {
        ...prev,
        analiseCausaRaiz: {
          ...prev.analiseCausaRaiz,
          detalhes: conclusao
        },
        trilhaAuditoria: [...(prev.trilhaAuditoria || []), novoRegistroAuditoria]
      };
    });
    showToast('Conclusão harmonizada com os 5 Porquês aplicada com sucesso.');
  };

  const handleApplyHarmonizedWhys = (whys: string[]) => {
    if (!whys || whys.length === 0) return;
    const user = formData.auditor || 'Auditor SGQ';
    const now = new Date().toISOString();

    setFormData(prev => {
      const novoRegistroAuditoria: RegistroAuditoriaNC = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: now,
        usuario: user,
        campoAlterado: 'Cadeia dos 5 Porquês (Harmonizada)',
        valorAnterior: JSON.stringify(prev.analiseCausaRaiz?.cincoPorques || []),
        novoValor: JSON.stringify(whys),
        origem: 'Harmonização IA 5 Porquês',
        tipoEvento: 'SUGESTAO_ACEITA',
        decisaoHumana: 'Aceita',
        justificativa: 'Cadeia dos 5 Porquês reestruturada com encadeamento causal rigoroso.',
      };

      return {
        ...prev,
        analiseCausaRaiz: {
          ...prev.analiseCausaRaiz,
          cincoPorques: whys
        },
        trilhaAuditoria: [...(prev.trilhaAuditoria || []), novoRegistroAuditoria]
      };
    });
    showToast('Cadeia dos 5 Porquês harmonizada aplicada.');
  };

  const handleApplyHarmonizedAction = (action: string) => {
    if (!action) return;
    setFormData(prev => ({
      ...prev,
      acaoCorretiva: {
        ...prev.acaoCorretiva,
        descricao: action
      }
    }));
    showToast('Plano de ação corretiva alinhado à causa raiz do 5º porquê.');
  };

  const handleApplyFullHarmonization = (coherence: CoerenciaCausaRaizResultado) => {
    const user = formData.auditor || 'Auditor SGQ';
    const now = new Date().toISOString();

    setFormData(prev => {
      const novoRegistroAuditoria: RegistroAuditoriaNC = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dataHora: now,
        usuario: user,
        campoAlterado: 'Harmonização Total Causa Raiz & Ação',
        valorAnterior: 'Análise anterior',
        novoValor: `Conclusão: ${coherence.conclusaoSugeridaCoerente}`,
        origem: 'Harmonização Total IA',
        tipoEvento: 'SUGESTAO_ACEITA',
        decisaoHumana: 'Aceita',
        justificativa: 'Aplicação do pacote harmonizado completo (5 Porquês, Conclusão e Plano de Ação Corretiva).',
      };

      return {
        ...prev,
        analiseCausaRaiz: {
          ...prev.analiseCausaRaiz,
          cincoPorques: coherence.cincoPorquesSugeridosCoerentes?.length > 0 ? coherence.cincoPorquesSugeridosCoerentes : prev.analiseCausaRaiz.cincoPorques,
          detalhes: coherence.conclusaoSugeridaCoerente || prev.analiseCausaRaiz.detalhes,
          coerenciaAvaliada: coherence
        },
        acaoCorretiva: {
          ...prev.acaoCorretiva,
          descricao: coherence.acaoCorretivaSugeridaAlinhada || prev.acaoCorretiva.descricao
        },
        trilhaAuditoria: [...(prev.trilhaAuditoria || []), novoRegistroAuditoria]
      };
    });
    showToast('Pacote completo de causa raiz e ação harmonizada aplicado com sucesso!');
  };

  // ----------------------------------------------------
  // SEÇÃO 6: HANDLERS DE ANÁLISE DO SETOR RESPONSÁVEL
  // ----------------------------------------------------
  const handleAnalyzeSector = async () => {
    setIsAnalyzingSector(true);
    try {
      const resultado = await analisarSetorComIAEHeuristica({
        descricao: formData.descricaoNC,
        titulo: formData.titulo,
        categoria: formData.categoria,
        tipoAcao: formData.tipoAcao,
        normaReferencia: formData.normaReferencia,
        causa: formData.analiseCausaRaiz?.detalhes || (formData.analiseCausaRaiz?.cincoPorques || []).join(' '),
        setorInformado: formData.setor,
        organizationSectors: availableSetores,
        manuals: manuals,
      });

      setAnaliseSetor(resultado);
      setFormData(prev => ({
        ...prev,
        analiseSetor: resultado,
      }));
      showToast('Análise de setor responsável concluída.');
    } catch (err) {
      console.error('Erro na análise de setor:', err);
      showToast('Falha na análise de setor.');
    } finally {
      setIsAnalyzingSector(false);
    }
  };

  const handleAdoptSuggestedSector = () => {
    if (!analiseSetor) return;
    const setorSugerido = analiseSetor.setorSugerido;
    const now = new Date().toISOString();
    const user = userProfile?.displayName || formData.auditor || 'Usuário SGQ';

    const updatedAnalise: AnaliseSetorResponsavel = {
      ...analiseSetor,
      setorInformado: formData.setor,
      decisaoFinal: setorSugerido,
      usuarioDecisor: user,
      dataHoraDecisao: now,
      statusDecisao: 'ACEITA',
      requerAtencaoDivergencia: false,
    };

    setAnaliseSetor(updatedAnalise);
    setShowDivergenceJustifyBox(false);
    setFormData(prev => ({
      ...prev,
      setor: setorSugerido,
      analiseSetor: updatedAnalise,
      trilhaAuditoria: [
        ...(prev.trilhaAuditoria || []),
        {
          id: `audit-${Date.now()}`,
          dataHora: now,
          usuario: user,
          campoAlterado: 'Setor Responsável',
          valorAnterior: prev.setor || '[Não informado]',
          novoValor: setorSugerido,
          origem: 'Decisão Humana (Sugestão do Sistema Aceita)',
          tipoEvento: 'SUGESTAO_ACEITA',
          decisaoHumana: 'Aceita',
          justificativa: `Setor sugerido pelo sistema ('${setorSugerido}') adotado pelo auditor. Motivo: ${analiseSetor.justificativa}`,
        }
      ]
    }));
    showToast(`Setor '${setorSugerido}' adotado com sucesso.`);
  };

  const handleKeepUserSector = (justificativa?: string) => {
    if (!analiseSetor) return;
    const now = new Date().toISOString();
    const user = userProfile?.displayName || formData.auditor || 'Usuário SGQ';
    const justTexto = justificativa || justificativaDivergenciaInput.trim() || 'Auditor optou por manter o setor informado com base na responsabilidade operacional primária.';

    const updatedAnalise: AnaliseSetorResponsavel = {
      ...analiseSetor,
      setorInformado: formData.setor,
      decisaoFinal: formData.setor,
      usuarioDecisor: user,
      dataHoraDecisao: now,
      statusDecisao: 'DIVERGENTE_MANTIDA',
      justificativaDivergencia: justTexto,
      requerAtencaoDivergencia: false, // Registrada a decisão humana
    };

    setAnaliseSetor(updatedAnalise);
    setShowDivergenceJustifyBox(false);
    setFormData(prev => ({
      ...prev,
      analiseSetor: updatedAnalise,
      trilhaAuditoria: [
        ...(prev.trilhaAuditoria || []),
        {
          id: `audit-${Date.now()}`,
          dataHora: now,
          usuario: user,
          campoAlterado: 'Setor Responsável',
          valorAnterior: analiseSetor.setorSugerido,
          novoValor: prev.setor,
          origem: 'Decisão Humana (Divergência Mantida)',
          tipoEvento: 'SUGESTAO_REJEITADA',
          decisaoHumana: 'Rejeitada',
          justificativa: `Auditor manteve o setor informado ('${prev.setor}') divergente do sugerido ('${analiseSetor.setorSugerido}'). Justificativa registrada: ${justTexto}`,
        }
      ]
    }));
    showToast('Decisão registrada: mantido o setor informado com justificativa.');
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userProfile?.role === 'CONSULTA') {
      setValidationError('Permissão negada: Usuários com papel CONSULTA possuem perfil somente leitura e não podem salvar alterações no SGQ.');
      return;
    }
    if (!formData.numeroNC.trim()) {
      setValidationError('O número da NC é obrigatório (ex: 05 ou NC-05).');
      setActiveTab('dados');
      return;
    }
    if (!formData.titulo.trim()) {
      setValidationError('O título da Não Conformidade é obrigatório.');
      setActiveTab('dados');
      return;
    }
    if (!formData.descricaoNC.trim()) {
      setValidationError('A descrição da Não Conformidade é obrigatória.');
      setActiveTab('dados');
      return;
    }
    if (!formData.prazoResposta) {
      setValidationError('O prazo de resposta é obrigatório.');
      setActiveTab('dados');
      return;
    }
    if (!formData.auditor.trim()) {
      setValidationError('O nome do auditor é obrigatório.');
      setActiveTab('dados');
      return;
    }

    // Auto-evaluate status if not explicitly locked
    let calculatedStatus: StatusGeralNC = formData.statusGeral;
    if (formData.verificacaoEficacia.encerrado === 'SIM') {
      calculatedStatus = 'Encerrada';
    } else if (formData.verificacaoEficacia.encerrado === 'NÃO') {
      calculatedStatus = 'Reaberta';
    } else if (formData.acaoCorretiva.status === 'Concluída') {
      calculatedStatus = 'Aguardando Eficácia';
    } else if (formData.acaoCorretiva.status === 'Em Andamento') {
      calculatedStatus = 'Ação em Andamento';
    } else if (formData.preAnaliseContencao.status === 'Concluída') {
      calculatedStatus = 'Em Análise de Causa';
    } else {
      calculatedStatus = 'Aberta';
    }

    // Resolve persistent normative version ID and linkage
    const matchingVersaoConfig = matchingManual?.versoesConfiguracao?.find(
      v => v.revisaoOuEmenda.trim().toLowerCase() === applicableVersionInfo.revisaoAplicavelNaData.trim().toLowerCase()
    );

    const resolvedVersaoId = matchingVersaoConfig?.id || (matchingManual ? `${matchingManual.id}-${applicableVersionInfo.revisaoAplicavelNaData}` : (formData.versaoDocumentoId || applicableVersionInfo.revisaoAplicavelNaData));

    const docNormativo: DocumentoNormativoAplicavel = {
      manualOuRegulamentoId: matchingManual?.id,
      codigo: applicableVersionInfo.manualCodigo || formData.normaReferencia || 'SGQ',
      titulo: matchingManual?.titulo,
      revisaoOuEmenda: applicableVersionInfo.revisaoAplicavelNaData,
      tipo: (matchingManual?.tipoDocumento as any) || 'Manual da Empresa',
      fonte: applicableVersionInfo.fonteVersao,
      statusVigenciaNaData: applicableVersionInfo.statusVigenciaNaData as any,
      dataVigenciaInicio: matchingVersaoConfig?.inicioVigencia || matchingManual?.dataVigencia,
      dataVigenciaFim: matchingVersaoConfig?.fimVigencia,
      localizadoNaBase: Boolean(matchingManual),
    };

    onSave({
      ...formData,
      versaoDocumentoId: resolvedVersaoId,
      documentoNormativoAplicavel: docNormativo,
      statusGeral: calculatedStatus,
      atualizadoEm: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200/60 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block p-1 bg-slate-50 rounded-xl border border-slate-200/80">
              <OrganizationBrandLogo organization={organization} className="h-10 w-auto" width={140} height={38} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {isEditing ? `Editar Registro de Não Conformidade #${formData.numeroNC}` : 'Novo Registro de Não Conformidade (RNC)'}
              </h2>
              <p className="text-xs text-slate-500">
                Formulário estruturado em conformidade com o padrão SGQ / F 001-29
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {isEditing && onDelete && (userProfile?.role === 'ADMIN' || userProfile?.role === 'GESTOR_SGQ') && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold shadow-xs transition-colors"
              title="Excluir esta Não Conformidade"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Excluir</span>
            </button>
          )}

          {onAuditNC && (
            <button
              type="button"
              onClick={() => onAuditNC(formData)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white text-xs font-bold shadow-md shadow-indigo-200 hover:scale-[1.02] transition-all"
              title="Auditar Pertinência e Enquadramento contra as últimas revisões dos Manuais"
            >
              <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
              <span>Auditar com Manuais (IA)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAIAssist}
            disabled={aiLoading}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-200 hover:scale-[1.02] transition-all"
            title="Sugerir Pré-Análise, Contenção Imediata, 5 Porquês, Ishikawa (6M) e Plano de Ação baseado nos Manuais"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${aiLoading ? 'animate-spin' : 'animate-pulse'}`} />
            <span>{aiLoading ? 'Consultando Manuais...' : 'Assistente IA (Causa & Manuais)'}</span>
          </button>

          {userProfile?.role === 'CONSULTA' ? (
            <div
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold border border-slate-200 cursor-not-allowed"
              title="Perfil CONSULTA: visualização estritamente somente leitura"
            >
              <Save className="w-4 h-4 text-slate-400" />
              <span>Somente Leitura</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-100 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>Salvar RNC</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Success Toast Message */}
      {aiToastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{aiToastMessage}</span>
          </div>
          <button 
            onClick={() => setAiToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (initialData?.id && onDelete) {
            onDelete(initialData.id);
            onCancel();
          }
        }}
        record={initialData}
      />

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center space-x-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Step-based Workflow Navigation */}
      <div className="bg-white p-2 rounded-[12px] border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-xs font-semibold">
          {[
            { id: 'dados', num: '1', label: 'Identificação', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'risco', num: '2', label: `Risco (${formData.avaliacaoRiscoInicial.codigo})`, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'contencao', num: '3', label: 'Contenção', icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'causa', num: '4', label: 'Investigação', icon: <Search className="w-3.5 h-3.5" /> },
            { id: 'acao', num: '5', label: 'Ação 5W2H', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            { id: 'eficacia', num: '6', label: 'Eficácia', icon: <UserCheck className="w-3.5 h-3.5" /> },
          ].map((step) => {
            const isActive = activeTab === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveTab(step.id as any)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-[8px] transition-all text-left ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {step.num}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="bg-white rounded-[12px] border border-slate-200 p-6 shadow-xs space-y-6">
        {/* TAB 1: DADOS & DESCRIÇÃO */}
        {activeTab === 'dados' && (
          <div className="space-y-5">
            {/* Official Standard Header Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <OrganizationBrandLogo organization={organization} className="h-12 w-auto" width={180} height={50} />
                <div className="border-l border-slate-300 pl-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Registro de Não Conformidade
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Ação Corretiva ou Preventiva • SGQ F 001-29
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-slate-400 font-medium">Doc:</span>
                <strong className="text-slate-700 font-mono">F 001-29</strong>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400 font-medium">Rev:</span>
                <strong className="text-slate-700 font-mono">{formData.revisao || '00'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código Formulário
                </label>
                <input
                  type="text"
                  value={formData.codigoFormulario}
                  onChange={(e) => handleChange('codigoFormulario', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="F 001-29"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revisão / Versão
                </label>
                <input
                  type="text"
                  value={formData.revisao}
                  onChange={(e) => handleChange('revisao', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nº da Não Conformidade *
                </label>
                <input
                  type="text"
                  required
                  value={formData.numeroNC}
                  onChange={(e) => handleChange('numeroNC', e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: 05 ou NC-2026-05"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Ação *
                </label>
                <select
                  value={formData.tipoAcao}
                  onChange={(e) => handleChange('tipoAcao', e.target.value as TipoAcao)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                >
                  <option value="Corretiva">Corretiva</option>
                  <option value="Preventiva">Preventiva</option>
                  <option value="Oportunidade de Melhoria">Oportunidade de Melhoria</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título da Não Conformidade *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Pré Auditoria FAA / Controle de Calibração REC"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Requisito / Norma Referência
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setConsultInitialQuery(formData.descricaoNC || formData.titulo || '');
                      setIsConsultModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Consultar Manuais (IA)</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.normaReferencia}
                  onChange={(e) => handleChange('normaReferencia', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  placeholder="Ex: MOMQ 3.4.3, RBAC 145.109, ISO 9001:2015 7.1.5"
                />

                {/* Status da Versão Aplicável Normativa */}
                {formData.normaReferencia && (
                  <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-indigo-600" />
                        Revisão Aplicável:
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                        applicableVersionInfo.statusVigenciaNaData === 'Vigente'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {applicableVersionInfo.revisaoAplicavelNaData} ({applicableVersionInfo.statusVigenciaNaData})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {applicableVersionInfo.observacaoTemporal}
                    </p>
                    {matchingManual && (
                      <div className="text-[10px] text-indigo-700 font-medium pt-0.5 border-t border-slate-200/60 flex items-center justify-between">
                        <span>Acervo: {matchingManual.codigo}</span>
                        <span>Vigente Atual: {applicableVersionInfo.revisaoAtualVigente}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                1. Descrição Completa da Não Conformidade (Evidência Objetiva) *
              </label>
              <textarea
                rows={4}
                required
                value={formData.descricaoNC}
                onChange={(e) => handleChange('descricaoNC', e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                placeholder="Descreva detalhadamente o desvio encontrado, equipamento, base/local, amostra auditada e impacto observado."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Setor / Base Afetada
                </label>
                <input
                  type="text"
                  list="org-setores-list"
                  value={formData.setor}
                  onChange={(e) => handleChange('setor', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder={availableSetores[0] || "Ex: REC - Manutenção"}
                />
                <datalist id="org-setores-list">
                  {availableSetores.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria de Incidência
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {availableCategorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Identificação *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dataIdentificacao}
                  onChange={(e) => handleChange('dataIdentificacao', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Auditor (Identificador) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.auditor}
                  onChange={(e) => handleChange('auditor', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  placeholder="Ex: Paulo Okubo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Responsável pela Tratativa</span>
                  <span className="text-[10px] text-indigo-600 font-normal">Editável</span>
                </label>
                <input
                  type="text"
                  value={formData.responsavel || ''}
                  onChange={(e) => handleResponsavelGeralChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-indigo-300 bg-indigo-50/20 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  placeholder="Ex: Rair Rodrigues"
                />
              </div>
            </div>

            {/* SEÇÃO 6: ANÁLISE E SUGESTÃO DO SETOR RESPONSÁVEL (IA & SGQ) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Análise do Setor Responsável (IA & Heurística SGQ)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Avaliação técnica do conteúdo da NC para identificação do departamento responsável. A decisão final é sempre humana.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyzeSector}
                  disabled={isAnalyzingSector}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingSector ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingSector ? 'Analisando Conteúdo...' : 'Analisar Setor Sugerido'}</span>
                </button>
              </div>

              {analiseSetor ? (
                <div className="space-y-3 pt-1">
                  {/* Banner do Setor Sugerido pelo Sistema */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          SETOR SUGERIDO PELO SISTEMA
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          analiseSetor.confianca === 'ALTA'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : analiseSetor.confianca === 'MEDIA'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : analiseSetor.confianca === 'INSUFICIENTE'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          Confiança: {analiseSetor.confianca}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Origem: {analiseSetor.origem === 'IA_GEMINI_ANALYSIS' ? 'IA Gemini Especializada' : 'Regras SGQ & Histórico'}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{analiseSetor.setorSugerido}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {analiseSetor.justificativa}
                      </p>
                    </div>

                    {/* Botão de Adoção Rápida */}
                    {formData.setor !== analiseSetor.setorSugerido && (
                      <button
                        type="button"
                        onClick={handleAdoptSuggestedSector}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Adotar Setor Sugerido</span>
                      </button>
                    )}
                  </div>

                  {/* Setores Candidatos Secundários */}
                  {analiseSetor.setoresCandidatos && analiseSetor.setoresCandidatos.length > 1 && (
                    <div className="text-xs bg-white/70 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Setores Candidatos Analisados:</span>
                      <div className="flex flex-wrap gap-2">
                        {analiseSetor.setoresCandidatos.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              handleChange('setor', c.setor);
                            }}
                            className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                              formData.setor === c.setor
                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                            title={`Clique para selecionar: ${c.justificativa || ''}`}
                          >
                            <span>{c.setor}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {c.relevancia}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerta de Divergência Factual (6.2) */}
                  {(analiseSetor.requerAtencaoDivergencia || (formData.setor && analiseSetor.setorSugerido && formData.setor.trim().toLowerCase() !== analiseSetor.setorSugerido.trim().toLowerCase() && analiseSetor.statusDecisao !== 'ACEITA' && analiseSetor.statusDecisao !== 'DIVERGENTE_MANTIDA')) && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-900">
                            Atenção: O setor informado apresenta divergência em relação ao setor sugerido pela análise da NC.
                          </p>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Setor Informado: <strong className="font-semibold">{formData.setor || '[Não preenchido]'}</strong> × Setor Sugerido pelo Sistema: <strong className="font-semibold">{analiseSetor.setorSugerido}</strong>.
                            O sistema não bloqueia seu cadastro. A decisão final é de competência humana do SGQ.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={handleAdoptSuggestedSector}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                        >
                          Adotar Setor Sugerido ({analiseSetor.setorSugerido})
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDivergenceJustifyBox(!showDivergenceJustifyBox)}
                          className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-amber-300"
                        >
                          Manter Setor Informado com Justificativa
                        </button>
                      </div>

                      {showDivergenceJustifyBox && (
                        <div className="pt-2 space-y-1.5 border-t border-amber-200">
                          <label className="block text-[11px] font-semibold text-amber-900">
                            Justificativa da Decisão Humana para Manutenção do Setor:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={justificativaDivergenciaInput}
                              onChange={(e) => setJustificativaDivergenciaInput(e.target.value)}
                              placeholder="Ex: Responsabilidade executiva primária definida em reunião de alinhamento com a chefia de base."
                              className="flex-1 text-xs p-2 rounded border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleKeepUserSector(justificativaDivergenciaInput)}
                              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded transition-colors cursor-pointer shrink-0"
                            >
                              Confirmar e Registrar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirmação de Decisão Registrada */}
                  {analiseSetor.statusDecisao && analiseSetor.statusDecisao !== 'PENDENTE' && (
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Decisão Registrada: <strong>{analiseSetor.statusDecisao === 'ACEITA' ? 'Setor Sugerido Adotado' : 'Setor Informado Mantido (Divergência Justificada)'}</strong>
                          {analiseSetor.justificativaDivergencia ? ` — "${analiseSetor.justificativaDivergencia}"` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-mono">
                        {analiseSetor.usuarioDecisor} em {analiseSetor.dataHoraDecisao ? new Date(analiseSetor.dataHoraDecisao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-1 flex items-center justify-between">
                  <span>Preencha o título e a descrição da NC para que o sistema analise e sugira o departamento responsável com base nas normas, histórico e manuais.</span>
                  <button
                    type="button"
                    onClick={handleAnalyzeSector}
                    disabled={isAnalyzingSector}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Executar Análise Agora
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Prazo de Resposta da NC (Data Limite de Tratamento) *
                  </span>
                  <span className="text-[11px] text-amber-700">
                    O sistema monitorará este prazo e gerará alertas automáticos no dashboard.
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  required
                  value={formData.prazoResposta}
                  onChange={(e) => handleChange('prazoResposta', e.target.value)}
                  className="text-xs font-bold p-2 rounded-lg border border-amber-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs font-semibold text-amber-800">
                  ({calcularDiasRestantes(formData.prazoResposta)} dias restantes)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MATRIZ DE RISCO */}
        {activeTab === 'risco' && (
          <div className="space-y-4">
            <RiskMatrixWidget
              value={formData.avaliacaoRiscoInicial}
              interactive={true}
              onChange={(risco) => handleChange('avaliacaoRiscoInicial', risco)}
            />

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p><strong>Avaliação Atual:</strong> Severidade {formData.avaliacaoRiscoInicial.severidade} x Probabilidade {formData.avaliacaoRiscoInicial.probabilidade} = <strong>{formData.avaliacaoRiscoInicial.codigo}</strong> ({formData.avaliacaoRiscoInicial.nivel})</p>
              <p className="text-[11px] text-slate-500">
                A classificação de risco orienta a priorização das ações corretivas e os prazos de escalonamento para a diretoria da qualidade.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: CONTENÇÃO IMEDIATA */}
        {activeTab === 'contencao' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Pré-Análise da Causa e Ação de Contenção (Imediata)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ações emergenciais para mitigar imediatamente o efeito do desvio e evitar propagação de falhas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAIAssist}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Sugerir Pré-Análise & Contenção com Manuais (IA)</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição da Ação de Contenção *
                  </label>
                  <textarea
                    rows={3}
                    value={formData.preAnaliseContencao.descricao}
                    onChange={(e) => handleContencaoChange('descricao', e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                    placeholder="Ex: 1) Segregar imediatamente ferramentas com calibração vencida; 2) Bloquear uso na linha de montagem; 3) Realizar auditoria emergencial de conformidade com os manuais."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Responsável pela Contenção
                    </label>
                    <input
                      type="text"
                      value={formData.preAnaliseContencao.responsavel}
                      onChange={(e) => handleContencaoChange('responsavel', e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                      placeholder="Ex: Rair Rodrigues"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data Limite da Contenção
                    </label>
                    <input
                      type="date"
                      value={formData.preAnaliseContencao.dataLimite}
                      onChange={(e) => handleContencaoChange('dataLimite', e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status da Contenção
                    </label>
                    <select
                      value={formData.preAnaliseContencao.status}
                      onChange={(e) => handleContencaoChange('status', e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Concluída">Concluída</option>
                      <option value="Não Aplicável">Não Aplicável</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAUSA RAIZ */}
        {activeTab === 'causa' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    3. Análise da Causa Raiz (5 Porquês & Diagrama de Ishikawa 6M)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Investigação profunda baseada no acervo de manuais técnicos e normativas do SGQ.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleEvaluateCoherence}
                    disabled={isEvaluatingCoherence}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-lg border border-indigo-200 transition-colors shrink-0 disabled:opacity-50 shadow-xs"
                    title="Auditar se a conclusão decorre logicamente dos 5 Porquês"
                  >
                    {isEvaluatingCoherence ? (
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-700 animate-spin" />
                    ) : (
                      <Scale className="w-3.5 h-3.5 text-indigo-700" />
                    )}
                    <span>{isEvaluatingCoherence ? 'Avaliando Coerência...' : 'Diagnóstico de Coerência (IA)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAIAssist}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold rounded-lg transition-colors shrink-0 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    <span>Sugerir Causa Raiz com Manuais (IA)</span>
                  </button>
                </div>
              </div>

              {/* 5 Whys - Vertical Flow Chart */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Fluxo Causal Vertical (Metodologia dos 5 Porquês)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncConclusionWithLastWhy}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-[8px] border border-slate-300 transition-colors shadow-xs"
                      title="Copiar e formatar a causa raiz do último porquê para o campo de síntese"
                    >
                      <Link className="w-3.5 h-3.5 text-blue-600" />
                      <span>Sincronizar com Conclusão</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddWhy}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-[8px] border border-slate-300 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Adicionar Etapa (Por Quê)</span>
                    </button>
                  </div>
                </div>

                {/* Problem Statement Box */}
                <div className="bg-slate-100 p-3 rounded-[8px] border border-slate-200 text-xs">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Problema Inicial Constatado:</div>
                  <div className="text-slate-800 font-medium mt-0.5">{formData.titulo || formData.descricaoNC || 'Não Conformidade Registrada'}</div>
                </div>

                {/* Downward Connector Arrow */}
                <div className="flex justify-center -my-1">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                    ↓
                  </div>
                </div>

                {/* Dynamic Porquês Chain */}
                <div className="space-y-2">
                  {(formData.analiseCausaRaiz.cincoPorques || []).map((porQue, idx) => {
                    const isLast = idx === (formData.analiseCausaRaiz.cincoPorques?.length || 1) - 1;
                    return (
                      <React.Fragment key={idx}>
                        <div className={`p-3 rounded-[8px] border transition-all ${
                          isLast 
                            ? 'bg-rose-50/70 border-rose-200 shadow-xs' 
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-[4px] ${
                                isLast ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
                              }`}>
                                {idx + 1}º Por quê?
                              </span>
                              {isLast && (
                                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200">
                                  Nível da Causa Raiz Sistêmica
                                </span>
                              )}
                            </div>
                            {(formData.analiseCausaRaiz.cincoPorques?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveWhy(idx)}
                                title="Remover este por quê"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={porQue}
                            onChange={(e) => handle5WhyChange(idx, e.target.value)}
                            placeholder={`Ex: ${idx === 0 ? 'Por que o desvio imediato ocorreu?' : idx === 4 ? 'Por que não havia barreira sistêmica/governança?' : `Por que o fator do nível ${idx} aconteceu?`}`}
                            className="w-full text-xs p-2 rounded-[6px] border border-slate-300 bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                          />
                        </div>

                        {!isLast && (
                          <div className="flex justify-center -my-1">
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                              ↓
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Síntese da Causa Raiz */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Síntese da Causa Raiz Identificada (Conclusão Técnica do SGQ)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Deve refletir diretamente a causa raiz formulada no último porquê da cadeia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncConclusionWithLastWhy}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md border border-blue-200 transition-colors self-start sm:self-auto"
                    title="Atualizar síntese com base no 5º Porquê"
                  >
                    <Link className="w-3 h-3 text-blue-700" />
                    <span>Copiar do 5º Porquê</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={formData.analiseCausaRaiz.detalhes}
                  onChange={(e) => handleCausaRaizChange('detalhes', e.target.value)}
                  placeholder="Resumo técnico da causa raiz sistêmica para constar no relatório oficial F 001-29."
                  className="w-full text-xs p-2.5 rounded-[8px] border border-slate-300 bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Diagnóstico de Coerência Causal (IA) */}
              {(coherenceResult || formData.analiseCausaRaiz?.coerenciaAvaliada) && (
                (() => {
                  const r = coherenceResult || formData.analiseCausaRaiz?.coerenciaAvaliada;
                  if (!r) return null;
                  const isHigh = r.grauCoerencia === 'Alta' || r.scoreCoerencia >= 80;
                  const isMod = r.grauCoerencia === 'Moderada' || (r.scoreCoerencia >= 60 && r.scoreCoerencia < 80);
                  const isLow = !isHigh && !isMod;

                  return (
                    <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                      isHigh 
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                        : isMod
                        ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-current/15">
                        <div className="flex items-center space-x-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isHigh ? 'bg-emerald-600 text-white' : isMod ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            <Scale className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider">
                                Diagnóstico de Coerência dos 5 Porquês com a Conclusão (IA)
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isHigh 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                  : isMod 
                                  ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {r.grauCoerencia} ({r.scoreCoerencia}%)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              Motor: {r.origemMotor || 'IA SGQ'} • Avaliação de consistência causal e eliminação de saltos lógicos
                            </span>
                          </div>
                        </div>

                        {/* Botão de Harmonização Completa */}
                        <button
                          type="button"
                          onClick={() => handleApplyFullHarmonization(r)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-xs shrink-0"
                          title="Aplica 5 porquês, conclusão e ação perfeitamente alinhados"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Aplicar Harmonização Completa</span>
                        </button>
                      </div>

                      {/* Parecer Diagnóstico */}
                      <div className="p-3 bg-white/80 rounded-lg border border-current/10 text-xs space-y-1">
                        <span className="font-bold text-[11px] uppercase tracking-wide block">
                          Diagnóstico do Encadeamento Causal:
                        </span>
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {r.diagnostico}
                        </p>
                      </div>

                      {/* Saltos Lógicos ou Incoerências */}
                      {r.saltosLogicosIdentificados && r.saltosLogicosIdentificados.length > 0 && (
                        <div className="p-3 bg-rose-100/50 rounded-lg border border-rose-200 text-xs space-y-1">
                          <span className="font-bold text-[11px] uppercase tracking-wide text-rose-900 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                            <span>Inconsistências ou Saltos Lógicos Detectados:</span>
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-rose-950 font-medium pl-1">
                            {r.saltosLogicosIdentificados.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Análise Nível por Nível dos Porquês */}
                      {r.analiseEncadeamento && r.analiseEncadeamento.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Rastreamento de Elo Causal por Nível:
                          </span>
                          <div className="space-y-1">
                            {r.analiseEncadeamento.map((item, idx) => (
                              <div key={idx} className="p-2 bg-white/80 rounded-md border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-[11px]">
                                      {item.titulo}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                      item.status === 'Causa Raiz Conclusiva' 
                                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                        : item.status === 'Conectado'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                        : 'bg-rose-100 text-rose-900 border border-rose-200'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 text-[11px]">{item.texto}</p>
                                </div>
                                <span className="text-[10px] text-slate-500 italic shrink-0">
                                  {item.observacao}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Propostas de Harmonização com 1-Click Apply */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Conclusão Sugerida Alinhada */}
                        {r.conclusaoSugeridaCoerente && (
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-2 flex flex-col justify-between shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-[11px] text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Conclusão Sugerida (Coerente com 5 Porquês)</span>
                                </span>
                              </div>
                              <p className="text-slate-800 font-medium text-[11px] leading-snug">
                                {r.conclusaoSugeridaCoerente}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyHarmonizedConclusion(r.conclusaoSugeridaCoerente)}
                              className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-md border border-indigo-200 transition-colors w-full"
                            >
                              <Check className="w-3.5 h-3.5 text-indigo-700" />
                              <span>Aplicar Esta Conclusão Alinhada</span>
                            </button>
                          </div>
                        )}

                        {/* 5 Porquês Harmonizados */}
                        {r.cincoPorquesSugeridosCoerentes && r.cincoPorquesSugeridosCoerentes.length > 0 && (
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-2 flex flex-col justify-between shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-[11px] text-blue-900 uppercase tracking-wider flex items-center gap-1">
                                  <Workflow className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Cadeia dos 5 Porquês Harmonizada ({r.cincoPorquesSugeridosCoerentes.length} níveis)</span>
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] line-clamp-2">
                                {r.cincoPorquesSugeridosCoerentes[0]} ... ➔ {r.cincoPorquesSugeridosCoerentes[r.cincoPorquesSugeridosCoerentes.length - 1]}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyHarmonizedWhys(r.cincoPorquesSugeridosCoerentes)}
                              className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-md border border-blue-200 transition-colors w-full"
                            >
                              <Check className="w-3.5 h-3.5 text-blue-700" />
                              <span>Substituir pelos 5 Porquês Harmonizados</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ação Corretiva Sugerida Alinhada */}
                      {r.acaoCorretivaSugeridaAlinhada && (
                        <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-[11px] text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Ação Corretiva Focada na Eliminação da Causa Raiz:</span>
                            </span>
                            <p className="text-slate-800 text-[11px] font-medium leading-snug">
                              {r.acaoCorretivaSugeridaAlinhada}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyHarmonizedAction(r.acaoCorretivaSugeridaAlinhada)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-md transition-colors shrink-0 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Alinhar Plano de Ação</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Diagrama de Ishikawa 6M */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Diagrama de Ishikawa (6M - Fatores Contribuintes):
                  </span>
                  <span className="text-[10px] text-slate-400">Preenchimento e refino orientados pela IA</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ⚙️ Método (Procedimentos e Instruções)
                    </label>
                    <input
                      type="text"
                      value={formData.analiseCausaRaiz.ishikawa?.metodo || ''}
                      onChange={(e) => handleIshikawaChange('metodo', e.target.value)}
                      placeholder="Ex: Revisar procedimento de calibração MOMQ"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      💻 Máquina / Sistema (Softwares e Equipamentos)
                    </label>
                    <input
                      type="text"
                      value={formData.analiseCausaRaiz.ishikawa?.maquina || ''}
                      onChange={(e) => handleIshikawaChange('maquina', e.target.value)}
                      placeholder="Ex: Sistema integrado em nuvem com bloqueio automático"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      👥 Mão de Obra (Capacitação e Treinamentos)
                    </label>
                    <input
                      type="text"
                      value={formData.analiseCausaRaiz.ishikawa?.maoDeObra || ''}
                      onChange={(e) => handleIshikawaChange('maoDeObra', e.target.value)}
                      placeholder="Ex: Reciclagem técnica dos colaboradores"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📦 Material (Insumos, Ferramentas e Peças)
                    </label>
                    <input
                      type="text"
                      value={formData.analiseCausaRaiz.ishikawa?.material || ''}
                      onChange={(e) => handleIshikawaChange('material', e.target.value)}
                      placeholder="Ex: Formulários padronizados e etiquetas de calibração"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📏 Medição (Metrologia, Indicadores e Checagens)
                    </label>
                    <input
                      type="text"
                      value={formData.analiseCausaRaiz.ishikawa?.medicao || ''}
                      onChange={(e) => handleIshikawaChange('medicao', e.target.value)}
                      placeholder="Ex: Indicador de aderência e periodicidade de calibração"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🌐 Meio Ambiente (Condições de Trabalho e Comunicação)
                    </label>
                    <input
                      type="text"
                      value={formData.analiseCausaRaiz.ishikawa?.meioAmbiente || ''}
                      onChange={(e) => handleIshikawaChange('meioAmbiente', e.target.value)}
                      placeholder="Ex: Alinhamento de comunicação entre bases e setores"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AÇÃO CORRETIVA */}
        {activeTab === 'acao' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    4. Ação Corretiva / Preventiva (Plano 5W2H)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Definição do plano de ação estruturado para eliminar a causa raiz e validar o encerramento do desvio.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAIAssist}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Sugerir Plano de Ação com Manuais (IA)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  O Que Será Feito (Descrição da Ação Corretiva) *
                </label>
                <textarea
                  rows={3}
                  value={formData.acaoCorretiva.descricao}
                  onChange={(e) => handleAcaoChange('descricao', e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 1) Centralizar planilhas de calibração em sistema de nuvem com bloqueio; 2) Revisar MOMQ 3.4.3; 3) Treinar equipe."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Como Será Feito (Metodologia e Recursos)
                </label>
                <input
                  type="text"
                  value={formData.acaoCorretiva.comoSeraFeito || ''}
                  onChange={(e) => handleAcaoChange('comoSeraFeito', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  placeholder="Ex: Aquisição de licença de software metrológico e agendamento de treinamento de 4h."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsável pela Implementação *
                  </label>
                  <input
                    type="text"
                    value={formData.acaoCorretiva.responsavel}
                    onChange={(e) => handleAcaoChange('responsavel', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                    placeholder="Ex: Rair Rodrigues"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Prazo da Ação
                  </label>
                  <input
                    type="date"
                    value={formData.acaoCorretiva.dataPrazo}
                    onChange={(e) => handleAcaoChange('dataPrazo', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status da Ação
                  </label>
                  <select
                    value={formData.acaoCorretiva.status}
                    onChange={(e) => handleAcaoChange('status', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="Não Iniciada">Não Iniciada</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assinatura / Validação do Responsável
                </label>
                <input
                  type="text"
                  value={formData.acaoCorretiva.assinaturaResponsavel || ''}
                  onChange={(e) => handleAcaoChange('assinaturaResponsavel', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white italic"
                  placeholder="Ex: Rair Rodrigues - Engenheiro de Garantia da Qualidade"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: EFICÁCIA */}
        {activeTab === 'eficacia' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  6. Verificação da Eficácia & Decisão de Encerramento
                </h3>
                <p className="text-xs text-slate-500">
                  Auditoria realizada após a conclusão do plano de ação para comprovar que o desvio não se repetiu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {(['Documental', 'Visual', 'Entrevista', 'Outro'] as MetodoVerificacaoEficacia[]).map((met) => (
                  <label
                    key={met}
                    className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.verificacaoEficacia.metodo === met
                        ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="metodoEficacia"
                      checked={formData.verificacaoEficacia.metodo === met}
                      onChange={() => handleEficaciaChange('metodo', met)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs">{met}</span>
                  </label>
                ))}
              </div>

              {formData.verificacaoEficacia.metodo === 'Outro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Especificar Outro Método
                  </label>
                  <input
                    type="text"
                    value={formData.verificacaoEficacia.outroMetodoDetalhe || ''}
                    onChange={(e) => handleEficaciaChange('outroMetodoDetalhe', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Decisão de Encerramento
                  </label>
                  <select
                    value={formData.verificacaoEficacia.encerrado}
                    onChange={(e) => handleEficaciaChange('encerrado', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    <option value="Pendente">Pendente de Auditoria</option>
                    <option value="SIM">SIM - Não Conformidade Encerrada com Sucesso</option>
                    <option value="NÃO">NÃO - Ação Ineficaz (Reabrir NC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Auditoria de Eficácia
                  </label>
                  <input
                    type="date"
                    value={formData.verificacaoEficacia.dataVerificacao || ''}
                    onChange={(e) => handleEficaciaChange('dataVerificacao', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auditor Verificador
                  </label>
                  <input
                    type="text"
                    value={formData.verificacaoEficacia.auditorVerificador || ''}
                    onChange={(e) => handleEficaciaChange('auditorVerificador', e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                    placeholder="Ex: Paulo Okubo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Evidências Objetivas da Eficácia
                </label>
                <textarea
                  rows={2}
                  value={formData.verificacaoEficacia.motivo || ''}
                  onChange={(e) => handleEficaciaChange('motivo', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  placeholder="Ex: Auditoria documental realizada em 100% das bases confirmou ausência de calibradores vencidos e adoção do software único."
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Form Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Status calculado:</span>
            <span className="font-bold text-slate-800">{formData.statusGeral}</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Atualizar Não Conformidade' : 'Cadastrar Não Conformidade'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Modal de Consulta e Busca Inteligente por IA nos Manuais */}
      <ManualsConsultModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        manuals={manuals}
        initialQuery={consultInitialQuery}
        onSelectRequirement={(manualCodigo, item, trecho) => {
          const formattedRef = item ? `${manualCodigo} (Item ${item})` : manualCodigo;
          setFormData(prev => ({
            ...prev,
            normaReferencia: prev.normaReferencia ? `${prev.normaReferencia}, ${formattedRef}` : formattedRef,
          }));
        }}
      />

      {/* Modal Interativo de Sugestão de IA Fundamentado nos Manuais com Decisão Granular */}
      <AISuggestionModal
        isOpen={isAISuggestionModalOpen}
        onClose={() => setIsAISuggestionModalOpen(false)}
        isLoading={aiLoading}
        sugestao={aiSuggestionResult}
        manualsCount={manuals.length}
        descricaoNC={formData.descricaoNC}
        normaReferencia={formData.normaReferencia}
        currentUser={formData.auditor || 'Auditor SGQ'}
        decisoesSugestoes={formData.decisoesSugestoes || []}
        onAcceptSuggestion={handleAcceptSuggestion}
        onEditSuggestion={handleEditSuggestion}
        onRejectSuggestion={handleRejectSuggestion}
      />
    </div>
  );
};
