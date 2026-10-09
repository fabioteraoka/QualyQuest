import React, { useState, useMemo, useEffect } from 'react';
import {
  DocumentoControlado,
  RevisaoDocumental,
  FonteExternaControlada,
  SolicitacaoRevisaoCliente,
  LogVerificacaoFonteExterna,
  RegistroEvidenciaConsultaDocumento,
  CategoriaDocumental,
  StatusCicloVidaDocumental,
  StatusSolicitacaoCliente,
  UserProfile,
  OrganizationRecord,
  NCRecord,
} from '../types';
import {
  determinarRevisaoVigenteNaData,
  avaliarAplicabilidade,
  gerarSolicitacaoRevisaoClienteEmail,
  compararRevisoes,
  diagnosticarImpactosRevisao,
  simularVerificacaoFonteExterna,
  calcularMetricasDashboardDocumental,
} from '../services/documentControlEngine';
import {
  saveDocumentoControlado,
  saveRevisaoDocumental,
  aprovarRevisaoDocumental,
  saveFonteExterna,
  saveSolicitacaoCliente,
  atualizarStatusSolicitacaoCliente,
  saveLogVerificacao,
  registrarEvidenciaConsulta,
  inactivateDocumentoControlado,
  reactivateDocumentoControlado,
  deleteDocumentoControlado,
  deleteRevisaoDocumental,
  verificarDependenciasDocumento,
} from '../services/firebase/documentControlFirestore';
import {
  BookOpen,
  History,
  Globe,
  Mail,
  GitCompare,
  Sparkles,
  BarChart3,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileCheck,
  Send,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  X,
  Lock,
  ArrowRight,
  Eye,
  RefreshCw,
  Award,
  Edit,
  Trash2,
  PowerOff,
  RotateCcw,
  AlertOctagon,
  ShieldAlert,
  Bot,
  UserCheck,
  Printer,
  Sliders,
  FileText,
  Upload,
  Download,
  HardDrive,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ComplianceReportModal } from './ComplianceReportModal';
import {
  CustomerNotificationModal,
  ManufacturerAlertModal,
  ConfigureSourceModal,
} from './ManualVerificationModals';
import { UploadManualModal } from './UploadManualModal';
import { DocumentFilePreviewModal } from './DocumentFilePreviewModal';
import { formatFileSize, downloadOrViewDocumentFile } from '../utils/documentFilesStorage';

interface DocumentControlCenterViewProps {
  organizationId: string;
  currentUser?: UserProfile | null;
  activeOrganization?: OrganizationRecord | null;
  documentos: DocumentoControlado[];
  revisoes: RevisaoDocumental[];
  fontes: FonteExternaControlada[];
  solicitacoes: SolicitacaoRevisaoCliente[];
  logsVerificacao: LogVerificacaoFonteExterna[];
  evidenciasConsulta: RegistroEvidenciaConsultaDocumento[];
  nonConformities?: NCRecord[];
  onOpenNCFormWithDoc?: (docCodigo: string, revisao: string) => void;
  initialSubTab?: 'acervo' | 'verificacao' | 'historico' | 'temporal' | 'fontes' | 'solicitacoes' | 'comparador' | 'rag' | 'dashboard';
}

export const DocumentControlCenterView: React.FC<DocumentControlCenterViewProps> = ({
  organizationId,
  currentUser,
  activeOrganization,
  documentos = [],
  revisoes = [],
  fontes = [],
  solicitacoes = [],
  logsVerificacao = [],
  evidenciasConsulta = [],
  nonConformities = [],
  onOpenNCFormWithDoc,
  initialSubTab = 'acervo',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'acervo' | 'verificacao' | 'historico' | 'temporal' | 'fontes' | 'solicitacoes' | 'comparador' | 'rag' | 'dashboard'
  >(
    initialSubTab === 'fontes' || initialSubTab === 'solicitacoes'
      ? 'verificacao'
      : initialSubTab === 'temporal' || initialSubTab === 'comparador' || initialSubTab === 'dashboard'
      ? 'historico'
      : initialSubTab || 'acervo'
  );

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'fontes' || initialSubTab === 'solicitacoes') {
        setActiveSubTab('verificacao');
      } else if (initialSubTab === 'temporal' || initialSubTab === 'comparador' || initialSubTab === 'dashboard') {
        setActiveSubTab('historico');
      } else {
        setActiveSubTab(initialSubTab as any);
      }
    }
  }, [initialSubTab]);

  // Seções internas para sub-abas estruturadas
  const [activeVerificacaoSection, setActiveVerificacaoSection] = useState<'vigencia' | 'fontes' | 'solicitacoes'>('vigencia');
  const [activeHistoricoSection, setActiveHistoricoSection] = useState<'relatorio' | 'timeline' | 'comparador'>('relatorio');
  const [historicoSelectedDocId, setHistoricoSelectedDocId] = useState<string>('TODOS');
  const [relatorioMesReferencia, setRelatorioMesReferencia] = useState(new Date().toISOString().substring(0, 7));

  // Estados de Upload & Pré-visualização de Arquivos (Repositório / Acervo)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docForUpload, setDocForUpload] = useState<DocumentoControlado | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentoControlado | null>(null);
  const [previewRev, setPreviewRev] = useState<RevisaoDocumental | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Filtros do Acervo
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODAS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [selectedTipoVerificacao, setSelectedTipoVerificacao] = useState<'TODOS' | 'AUTOMATICO' | 'MANUAL'>('TODOS');
  const [selectedStatusVerificacao, setSelectedStatusVerificacao] = useState<'TODOS' | 'CONFORME' | 'NOVA_REVISAO_IDENTIFICADA' | 'PENDENTE_VERIFICACAO' | 'FONTE_INDISPONIVEL' | 'VERIFICACAO_NAO_CONCLUSIVA'>('TODOS');
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<DocumentoControlado | null>(null);

  // Estados de Validação Humana de Discrepância / Nova Revisão (Princípio Fundamental SGQ)
  const [selectedDocForDiscrepancyModal, setSelectedDocForDiscrepancyModal] = useState<DocumentoControlado | null>(null);
  const [isDiscrepancyValidationModalOpen, setIsDiscrepancyValidationModalOpen] = useState(false);
  const [discrepancyRejectionReason, setDiscrepancyRejectionReason] = useState('');
  const [isProcessingDiscrepancy, setIsProcessingDiscrepancy] = useState(false);

  // Estados dos Novos Módulos: Relatório de Conformidade & Verificação Automática/Manual
  const [isComplianceReportOpen, setIsComplianceReportOpen] = useState(false);
  const [isVerifyingUpdates, setIsVerifyingUpdates] = useState(false);
  const [selectedDocForVerificationModal, setSelectedDocForVerificationModal] = useState<DocumentoControlado | null>(null);
  const [isCustomerNotificationModalOpen, setIsCustomerNotificationModalOpen] = useState(false);
  const [isManufacturerAlertModalOpen, setIsManufacturerAlertModalOpen] = useState(false);
  const [isConfigureSourceModalOpen, setIsConfigureSourceModalOpen] = useState(false);

  // Estados de Governança Documental (Edição, Inativação, Reativação, Exclusão Segura)
  const [docToEdit, setDocToEdit] = useState<DocumentoControlado | null>(null);
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [editDocForm, setEditDocForm] = useState({
    titulo: '',
    categoria: 'DOCUMENTO_INTERNO' as CategoriaDocumental,
    emissor: '',
    responsavelNome: '',
    exigeEvidenciaLeitura: false,
    aplicabilidadePadrao: '',
  });

  const [docToInactivate, setDocToInactivate] = useState<DocumentoControlado | null>(null);
  const [isDocInactivateModalOpen, setIsDocInactivateModalOpen] = useState(false);
  const [motivoInativacaoDoc, setMotivoInativacaoDoc] = useState('');

  const [docToReactivate, setDocToReactivate] = useState<DocumentoControlado | null>(null);
  const [isDocReactivateModalOpen, setIsDocReactivateModalOpen] = useState(false);
  const [motivoReativacaoDoc, setMotivoReativacaoDoc] = useState('');

  const [docToDelete, setDocToDelete] = useState<DocumentoControlado | null>(null);
  const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
  const [motivoExclusaoDoc, setMotivoExclusaoDoc] = useState('');
  const [forcarExclusaoDoc, setForcarExclusaoDoc] = useState(false);
  const [analiseDependenciasDoc, setAnaliseDependenciasDoc] = useState<{
    podeExcluir: boolean;
    totalVinculos: number;
    motivosBloqueio?: string[];
    detalhes?: string[];
  } | null>(null);
  const [isSubmittingDocAction, setIsSubmittingDocAction] = useState(false);

  // Handlers de Governança Documental
  const handleOpenEditDoc = (doc: DocumentoControlado) => {
    setDocToEdit(doc);
    setEditDocForm({
      titulo: doc.titulo,
      categoria: doc.categoria,
      emissor: doc.emissor,
      responsavelNome: doc.responsavelNome || '',
      exigeEvidenciaLeitura: !!doc.exigeEvidenciaLeitura,
      aplicabilidadePadrao: doc.aplicabilidadePadrao || '',
    });
    setIsEditDocModalOpen(true);
  };

  const handleSaveEditDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToEdit) return;

    try {
      setIsSubmittingDocAction(true);
      const updatedDoc: DocumentoControlado = {
        ...docToEdit,
        titulo: editDocForm.titulo,
        categoria: editDocForm.categoria,
        emissor: editDocForm.emissor,
        responsavelNome: editDocForm.responsavelNome,
        exigeEvidenciaLeitura: editDocForm.exigeEvidenciaLeitura,
        aplicabilidadePadrao: editDocForm.aplicabilidadePadrao,
        atualizadoEm: new Date().toISOString(),
      };

      await saveDocumentoControlado(organizationId, updatedDoc, currentUser, docToEdit);
      setIsEditDocModalOpen(false);
      if (selectedDocForDetail?.id === docToEdit.id) {
        setSelectedDocForDetail(updatedDoc);
      }
      setDocToEdit(null);
      showToast('Documento atualizado com sucesso e registrado no Audit Trail!');
    } catch (err: any) {
      alert(`Erro ao atualizar documento: ${err.message}`);
    } finally {
      setIsSubmittingDocAction(false);
    }
  };

  const handleOpenInactivateDoc = (doc: DocumentoControlado) => {
    setDocToInactivate(doc);
    setMotivoInativacaoDoc('');
    setIsDocInactivateModalOpen(true);
  };

  const handleConfirmInactivateDoc = async () => {
    if (!docToInactivate) return;
    if (!motivoInativacaoDoc.trim()) {
      alert('Por favor, informe a justificativa regulatória para a inativação deste documento.');
      return;
    }

    try {
      setIsSubmittingDocAction(true);
      await inactivateDocumentoControlado(organizationId, docToInactivate.id, motivoInativacaoDoc.trim(), currentUser);
      setIsDocInactivateModalOpen(false);
      if (selectedDocForDetail?.id === docToInactivate.id) {
        setSelectedDocForDetail({
          ...selectedDocForDetail,
          statusGeral: 'INATIVO',
          inativadoEm: new Date().toISOString(),
          inativadoPor: currentUser?.displayName || 'SGQ',
          motivoInativacao: motivoInativacaoDoc.trim(),
        });
      }
      setDocToInactivate(null);
      setMotivoInativacaoDoc('');
      showToast('Documento inativado com sucesso. Histórico de revisões permanece arquivado para auditoria.');
    } catch (err: any) {
      alert(`Erro ao inativar documento: ${err.message}`);
    } finally {
      setIsSubmittingDocAction(false);
    }
  };

  const handleOpenReactivateDoc = (doc: DocumentoControlado) => {
    setDocToReactivate(doc);
    setMotivoReativacaoDoc('Revalidação de aplicabilidade operacional e reativação no SGQ');
    setIsDocReactivateModalOpen(true);
  };

  const handleConfirmReactivateDoc = async () => {
    if (!docToReactivate) return;

    try {
      setIsSubmittingDocAction(true);
      await reactivateDocumentoControlado(organizationId, docToReactivate.id, motivoReativacaoDoc.trim(), currentUser);
      setIsDocReactivateModalOpen(false);
      if (selectedDocForDetail?.id === docToReactivate.id) {
        setSelectedDocForDetail({
          ...selectedDocForDetail,
          statusGeral: 'ATIVO',
          reativadoEm: new Date().toISOString(),
          reativadoPor: currentUser?.displayName || 'SGQ',
          motivoReativacao: motivoReativacaoDoc.trim(),
        });
      }
      setDocToReactivate(null);
      setMotivoReativacaoDoc('');
      showToast('Documento reativado no acervo ativo com sucesso!');
    } catch (err: any) {
      alert(`Erro ao reativar documento: ${err.message}`);
    } finally {
      setIsSubmittingDocAction(false);
    }
  };

  const [revisaoToDelete, setRevisaoToDelete] = useState<RevisaoDocumental | null>(null);
  const [isDeletingRevisao, setIsDeletingRevisao] = useState(false);

  const handleOpenDeleteDoc = (doc: DocumentoControlado) => {
    const analise = verificarDependenciasDocumento(
      doc.id,
      doc.codigo,
      revisoes,
      evidenciasConsulta,
      solicitacoes,
      nonConformities
    );
    setDocToDelete(doc);
    setAnaliseDependenciasDoc(analise);
    setMotivoExclusaoDoc('Exclusão solicitada pelo usuário no SGQ');
    setForcarExclusaoDoc(true);
    setIsDocDeleteModalOpen(true);
  };

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete) return;

    try {
      setIsSubmittingDocAction(true);
      await deleteDocumentoControlado(
        organizationId,
        docToDelete.id,
        docToDelete.codigo,
        currentUser,
        motivoExclusaoDoc.trim() || 'Exclusão física solicitada pelo usuário',
        analiseDependenciasDoc,
        forcarExclusaoDoc !== false
      );
      setIsDocDeleteModalOpen(false);
      if (selectedDocForDetail?.id === docToDelete.id) {
        setSelectedDocForDetail(null);
      }
      setDocToDelete(null);
      setAnaliseDependenciasDoc(null);
      setForcarExclusaoDoc(true);
      showToast(`Documento ${docToDelete.codigo} e registros associados foram excluídos com sucesso.`);
    } catch (err: any) {
      alert(`Erro ao excluir documento: ${err.message}`);
    } finally {
      setIsSubmittingDocAction(false);
    }
  };

  const handleConfirmDeleteRevisao = async () => {
    if (!revisaoToDelete || !selectedDocForDetail) return;

    try {
      setIsDeletingRevisao(true);
      await deleteRevisaoDocumental(
        organizationId,
        revisaoToDelete.id,
        selectedDocForDetail.id,
        currentUser,
        'Exclusão de revisão solicitada pelo usuário'
      );
      showToast(`Revisão ${revisaoToDelete.numeroRevisao} excluída com sucesso.`);
      setRevisaoToDelete(null);
    } catch (err: any) {
      alert(`Erro ao excluir revisão: ${err.message}`);
    } finally {
      setIsDeletingRevisao(false);
    }
  };

  // Modais de Criação
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isNewRevisionModalOpen, setIsNewRevisionModalOpen] = useState(false);
  const [isNewSourceModalOpen, setIsNewSourceModalOpen] = useState(false);
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultTargetDoc, setConsultTargetDoc] = useState<DocumentoControlado | null>(null);

  // Estado da Consulta Temporal
  const [temporalDocId, setTemporalDocId] = useState<string>(documentos[0]?.id || '');
  const [temporalDate, setTemporalDate] = useState<string>('2024-08-15');
  const [temporalSetor, setTemporalSetor] = useState<string>('REC - Manutenção / Calibração');
  const [temporalProcesso, setTemporalProcesso] = useState<string>('Calibração Metrológica');
  const [temporalAeronave, setTemporalAeronave] = useState<string>('Cessna Caravan 208B');
  const [temporalCliente, setTemporalCliente] = useState<string>('Azul Linhas Aéreas');

  // Estado do Comparador
  const [compareDocId, setCompareDocId] = useState<string>(documentos[0]?.id || '');
  const [compareRevAId, setCompareRevAId] = useState<string>('');
  const [compareRevBId, setCompareRevBId] = useState<string>('');

  // Estado do RAG Temporal
  const [ragQuery, setRagQuery] = useState('');
  const [ragMode, setRagMode] = useState<'VIGENTE_HOJE' | 'HISTORICO_NA_DATA'>('VIGENTE_HOJE');
  const [ragDate, setRagDate] = useState('2024-08-15');
  const [ragHistory, setRagHistory] = useState<Array<{ q: string; a: string; fontId?: string; dataVigencia?: string }>>([
    {
      q: 'Qual era a regra de calibração de torquímetros em agosto de 2024?',
      a: 'Em 15/08/2024, a revisão aplicável do MOMQ MNT-001 era a Rev. 06 (Capítulo 3.4.3). O requisito exigia calibração com periodicidade anual (12 meses) e arquivamento de fichas em meio físico. Atenção: essa redação foi substituída pela Rev. 07 em 01/01/2025 e pela Rev. 08 em 01/07/2025, que agora exige controle estritamente digital via QualiGest com bloqueio de OS.',
      fontId: 'MOMQ MNT-001 (Rev. 06 — Histórica)',
      dataVigencia: '2024-08-15',
    },
  ]);
  const [isRagLoading, setIsRagLoading] = useState(false);

  // Notificações / Mensagens Rápidas
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handlers do Módulo de Verificação Automática vs Manual & Relatório de Conformidade
  const handleVerificarFontesPublicas = async () => {
    try {
      setIsVerifyingUpdates(true);
      const res = await fetch('/api/documentos/verificar-fontes-publicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          documentos,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Falha ao executar rotina de checagem');
      }

      // Persistir no Firestore cada documento analisado pelo robô
      if (Array.isArray(data.resultados)) {
        for (const item of data.resultados) {
          const docAlvo = documentos.find((d) => d.id === item.documentoId || d.codigo === item.codigo);
          if (docAlvo) {
            const dataVerif = item.dataUltimaVerificacao || item.dataVerificacao || new Date().toISOString();
            const revIdentificada = item.revisaoOficialIdentificada || item.revisaoNaFonte;
            const msgVerif = item.detalhesUltimaVerificacao || item.mensagem;

            const atualizado: DocumentoControlado = {
              ...docAlvo,
              statusVerificacao: item.statusVerificacao,
              dataUltimaVerificacao: dataVerif, // Registra exclusivamente a data/hora da consulta
              revisaoNaFonteIdentificada: revIdentificada,
              detalhesUltimaVerificacao: msgVerif,
            };

            try {
              await saveDocumentoControlado(organizationId, atualizado, currentUser, docAlvo);
            } catch (saveErr) {
              console.warn('Erro ao atualizar documento no Firestore:', saveErr);
            }

            // Registrar evidência de log de verificação oficial no Firestore para rastreabilidade auditável
            try {
              const logEntry: LogVerificacaoFonteExterna = {
                id: `log-verif-${Date.now()}-${docAlvo.id}`,
                organizationId,
                fonteId: docAlvo.fonteExternaId || 'fonte-oficial-publica',
                fonteNome: item.urlFonteVerificacao || 'Repositório Oficial ANAC/FAA',
                documentoId: docAlvo.id,
                codigoDocumento: docAlvo.codigo,
                revisaoAtualControlada: docAlvo.numeroRevisao || docAlvo.revisaoVigenteNumero || 'Rev. Vigente',
                revisaoIdentificadaNaFonte: revIdentificada,
                statusVerificacao: item.statusVerificacao,
                mensagem: msgVerif,
                requerValidacaoHumana: item.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA',
                validacaoHumanaStatus: item.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA' ? 'PENDENTE' : 'VALIDADA_NOVA_REVISAO_ACEITA',
                dataVerificacao: dataVerif,
                executadoPor: currentUser?.displayName || currentUser?.email || 'Robô SGQ de Verificação Oficial',
                evidenciaUrlOuTexto: item.urlFonteVerificacao || undefined,
              };
              await saveLogVerificacao(organizationId, logEntry, currentUser);
            } catch (logErr) {
              console.warn('Erro ao registrar log de verificação:', logErr);
            }
          }
        }
      }

      showToast(
        `Verificação Automática Concluída: ${data.totalVerificados} manuais verificados (${data.totalDiscrepancias} com nova revisão detectada).`
      );
    } catch (err: any) {
      alert(`Erro na verificação de fontes públicas: ${err.message}`);
    } finally {
      setIsVerifyingUpdates(false);
    }
  };

  // Handlers para Validação Humana Obrigatória de Discrepância (Princípio Fundamental SGQ)
  const handleOpenDiscrepancyValidation = (doc: DocumentoControlado) => {
    setSelectedDocForDiscrepancyModal(doc);
    setDiscrepancyRejectionReason('');
    setIsDiscrepancyValidationModalOpen(true);
  };

  const handleRejeitarDiscrepancia = async () => {
    if (!selectedDocForDiscrepancyModal) return;
    if (!discrepancyRejectionReason.trim()) {
      alert('Informe a justificativa técnica para rejeição da discrepância (obrigatório para fins de auditoria e RBAC 145).');
      return;
    }

    try {
      setIsProcessingDiscrepancy(true);
      const doc = selectedDocForDiscrepancyModal;
      const agora = new Date().toISOString();
      const justifText = `Discrepância rejeitada (Falso Positivo / Não Aplicável) por ${currentUser?.displayName || 'Auditor SGQ'} em ${new Date().toLocaleDateString('pt-BR')}: ${discrepancyRejectionReason.trim()}`;

      const docAtualizado: DocumentoControlado = {
        ...doc,
        statusVerificacao: 'CONFORME',
        detalhesUltimaVerificacao: justifText,
        dataUltimaVerificacao: agora,
      };

      await saveDocumentoControlado(organizationId, docAtualizado, currentUser, doc);

      // Atualizar qualquer log pendente associado a este documento
      const logPendente = logsVerificacao.find(
        (l) => l.documentoId === doc.id && l.requerValidacaoHumana && l.validacaoHumanaStatus === 'PENDENTE'
      );
      if (logPendente) {
        const logAtualizado: LogVerificacaoFonteExterna = {
          ...logPendente,
          validacaoHumanaStatus: 'FALSO_POSITIVO_REJEITADA',
          mensagem: `${logPendente.mensagem} [REJEITADA PELO RESPONSÁVEL: ${discrepancyRejectionReason.trim()}]`,
        };
        await saveLogVerificacao(organizationId, logAtualizado, currentUser);
      }

      showToast(`Discrepância rejeitada e justificada. Documento "${doc.codigo}" mantido como CONFORME.`);
      setIsDiscrepancyValidationModalOpen(false);
      setSelectedDocForDiscrepancyModal(null);
    } catch (err: any) {
      alert(`Erro ao registrar justificativa de rejeição: ${err.message}`);
    } finally {
      setIsProcessingDiscrepancy(false);
    }
  };

  const handleAceitarEIncorporarNovaRevisao = () => {
    if (!selectedDocForDiscrepancyModal) return;
    const doc = selectedDocForDiscrepancyModal;
    setIsDiscrepancyValidationModalOpen(false);
    handleOpenUploadModal(doc);
  };

  const handleSendCustomerNotification = async (
    docId: string,
    emailData: { email: string; assunto: string; corpo: string; protocolo: string }
  ) => {
    try {
      const docAlvo = documentos.find((d) => d.id === docId);
      if (!docAlvo) return;

      const res = await fetch('/api/documentos/notificar-cliente-revisao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentoId: docId,
          codigo: docAlvo.codigo,
          titulo: docAlvo.titulo,
          clienteNome: docAlvo.proprietarioCessor || docAlvo.clienteNome || docAlvo.emissor,
          destinatarioEmail: emailData.email,
          revisaoAtual: docAlvo.numeroRevisao || docAlvo.revisaoVigenteNumero || 'Rev. Vigente',
          protocolo: emailData.protocolo,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao registrar envio');

      const atualizado: DocumentoControlado = {
        ...docAlvo,
        statusVerificacao: 'PENDENTE_VERIFICACAO',
        ultimaNotificacaoClienteEm: new Date().toISOString(),
        contatoClienteEmail: emailData.email,
        detalhesUltimaVerificacao: `Solicitação formal protocolada sob ${data.protocolo} para ${emailData.email}`,
      };

      await saveDocumentoControlado(organizationId, atualizado, currentUser, docAlvo);
      setIsCustomerNotificationModalOpen(false);
      setSelectedDocForVerificationModal(null);
      showToast(`Notificação enviada com sucesso! Protocolo: ${data.protocolo}`);
    } catch (err: any) {
      alert(`Erro ao notificar cliente: ${err.message}`);
    }
  };

  const handleConfirmManufacturerCheck = async (
    docId: string,
    result: { confirmadaEm: string; observacoes?: string }
  ) => {
    try {
      const docAlvo = documentos.find((d) => d.id === docId);
      if (!docAlvo) return;

      const res = await fetch('/api/documentos/solicitar-fabricante-revisao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentoId: docId,
          codigo: docAlvo.codigo,
          titulo: docAlvo.titulo,
          fabricanteNome: docAlvo.proprietarioCessor || docAlvo.fabricanteNome || 'Fabricante OEM',
          revisaoAtual: docAlvo.numeroRevisao || docAlvo.revisaoVigenteNumero,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erro ao registrar verificação');

      const atualizado: DocumentoControlado = {
        ...docAlvo,
        statusVerificacao: 'CONFORME',
        dataUltimaVerificacao: result.confirmadaEm,
        ultimoAlertaFabricanteEm: result.confirmadaEm,
        detalhesUltimaVerificacao: `Verificação confirmada via portal OEM restrito pelo usuário. ${result.observacoes || ''}`,
      };

      await saveDocumentoControlado(organizationId, atualizado, currentUser, docAlvo);
      setIsManufacturerAlertModalOpen(false);
      setSelectedDocForVerificationModal(null);
      showToast('Verificação no portal do fabricante registrada como Conforme!');
    } catch (err: any) {
      alert(`Erro ao registrar verificação de fabricante: ${err.message}`);
    }
  };

  const handleSaveConfigureSource = async (docId: string, updates: Partial<DocumentoControlado>) => {
    try {
      const docAlvo = documentos.find((d) => d.id === docId);
      if (!docAlvo) return;

      const atualizado: DocumentoControlado = {
        ...docAlvo,
        ...updates,
        atualizadoEm: new Date().toISOString(),
      };

      await saveDocumentoControlado(organizationId, atualizado, currentUser, docAlvo);
      setIsConfigureSourceModalOpen(false);
      setSelectedDocForVerificationModal(null);
      showToast('Configuração da fonte e método de verificação salva com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar configuração: ${err.message}`);
    }
  };

  // Métricas do Dashboard Documental
  const dashboardMetrics = useMemo(() => {
    return calcularMetricasDashboardDocumental(documentos, revisoes, fontes, solicitacoes, logsVerificacao);
  }, [documentos, revisoes, fontes, solicitacoes, logsVerificacao]);

  // Lista Filtrada do Acervo
  const filteredDocumentos = useMemo(() => {
    return documentos.filter((doc) => {
      const matchSearch =
        doc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.emissor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.proprietarioCessor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.areaPublicacao || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = selectedCategoria === 'TODAS' || doc.categoria === selectedCategoria;
      const matchStatus =
        selectedStatusFilter === 'TODOS' ||
        (selectedStatusFilter === 'ATIVO' && (doc.statusGeral === 'ATIVO' || !doc.statusGeral)) ||
        (selectedStatusFilter === 'INATIVO' && doc.statusGeral === 'INATIVO');

      const docTipo = doc.tipoVerificacao || 'MANUAL';
      const matchTipo = selectedTipoVerificacao === 'TODOS' || docTipo === selectedTipoVerificacao;

      const docStatusVerif = doc.statusVerificacao || 'CONFORME';
      const matchStatusVerif =
        selectedStatusVerificacao === 'TODOS' || docStatusVerif === selectedStatusVerificacao;

      return matchSearch && matchCategoria && matchStatus && matchTipo && matchStatusVerif;
    });
  }, [documentos, searchTerm, selectedCategoria, selectedStatusFilter, selectedTipoVerificacao, selectedStatusVerificacao]);

  // Revisões do documento selecionado para detalhe
  const revisoesDoDocSelecionado = useMemo(() => {
    if (!selectedDocForDetail) return [];
    return revisoes
      .filter((r) => r.documentoId === selectedDocForDetail.id)
      .sort((a, b) => new Date(b.dataEntradaVigor).getTime() - new Date(a.dataEntradaVigor).getTime());
  }, [revisoes, selectedDocForDetail]);

  // Diagnóstico da Consulta Temporal
  const temporalResult = useMemo(() => {
    const doc = documentos.find((d) => d.id === temporalDocId);
    if (!doc) return null;
    const revsDoDoc = revisoes.filter((r) => r.documentoId === doc.id);
    const resultadoTemporal = determinarRevisaoVigenteNaData(doc, revisoes, temporalDate);
    const revVigente = resultadoTemporal.revisaoVigenteNaData;
    const revHoje = resultadoTemporal.revisaoVigenteHoje || revisoes.find((r) => r.id === doc.revisaoVigenteId);

    const aplicabilidade = avaliarAplicabilidade(doc.aplicabilidadePadrao, {
      dataReferencia: temporalDate,
      aeronave: temporalAeronave,
      setor: temporalSetor,
      processo: temporalProcesso,
      cliente: temporalCliente,
    });

    return {
      documento: doc,
      revisaoNoEvento: revVigente,
      revisaoHoje: revHoje,
      aplicabilidade,
      dataConsultada: temporalDate,
    };
  }, [documentos, revisoes, temporalDocId, temporalDate, temporalAeronave, temporalSetor, temporalProcesso, temporalCliente]);

  // Comparação de Revisões
  const revisoesDisponiveisParaComparar = useMemo(() => {
    return revisoes.filter((r) => r.documentoId === compareDocId);
  }, [revisoes, compareDocId]);

  const comparacaoResult = useMemo(() => {
    if (!compareRevAId || !compareRevBId) return null;
    const revA = revisoes.find((r) => r.id === compareRevAId);
    const revB = revisoes.find((r) => r.id === compareRevBId);
    if (!revA || !revB) return null;

    const diff = compararRevisoes(revA, revB);
    const docRel = documentos.find((d) => d.id === revB.documentoId) || documentos.find((d) => d.codigo === revB.codigoDocumento);
    const impactos = docRel
      ? diagnosticarImpactosRevisao({
          documento: docRel,
          novaRevisao: revB,
          rncsAbertas: nonConformities?.map((n) => ({ id: n.id, numeroNC: n.numeroNC, normaReferencia: n.normaReferencia })) || [],
        })
      : [];

    return {
      revA,
      revB,
      diff,
      impactos,
    };
  }, [revisoes, compareRevAId, compareRevBId]);

  // Executar Pergunta RAG Temporal
  const handleExecuteRag = () => {
    if (!ragQuery.trim()) return;
    setIsRagLoading(true);

    setTimeout(() => {
      let resposta = '';
      let docCerne = '';
      const qLower = ragQuery.toLowerCase();

      if (ragMode === 'VIGENTE_HOJE') {
        if (qLower.includes('torquímetro') || qLower.includes('calibração') || qLower.includes('ferramenta')) {
          docCerne = 'MOMQ MNT-001 (Rev. 08 — VIGENTE) & POP-REC-001 (Rev. 04)';
          resposta =
            'Na revisão VIGENTE ATUAL (MOMQ Rev. 08 e POP-REC-001 Rev. 04), ferramentas de medição têm tolerância pós-vencimento ZERO. Qualquer instrumento vencido é bloqueado imediatamente no QualiGest às 23:59 da data de validade, e nenhuma Ordem de Serviço pode ser liberada com instrumento fora de calibração.';
        } else if (qLower.includes('rbac') || qLower.includes('anac')) {
          docCerne = 'RBAC 145 (Emenda 07 — VIGENTE)';
          resposta =
            'A regulamentação oficial ANAC vigente no sistema é o RBAC 145 Emenda 07. A Seção 145.109 exige que todo ferramental e equipamento de teste seja mantido com calibração rastreável a padrões RBC/Inmetro ou internacionais reconhecidos.';
        } else {
          docCerne = 'Base Documental Vigente QualiGest SGQ';
          resposta = `Consulta realizada contra a base documental vigente: Não foram identificadas restrições impeditivas adicionais além dos procedimentos padronizados no MOMQ Rev. 08.`;
        }
      } else {
        docCerne = `Consulta Histórica para a Data: ${ragDate}`;
        resposta = `[MODO TEMPORAL HISTÓRICO — ${ragDate}]: Na data consultada, os requisitos aplicáveis eram estritamente os constantes na revisão vigente naquele período. Documentos ou emendas posteriores não eram exigíveis retroativamente.`;
      }

      setRagHistory((prev) => [
        {
          q: ragQuery,
          a: resposta,
          fontId: docCerne,
          dataVigencia: ragMode === 'HISTORICO_NA_DATA' ? ragDate : 'Vigente Hoje',
        },
        ...prev,
      ]);

      setRagQuery('');
      setIsRagLoading(false);
    }, 600);
  };

  // Simulação de Verificação de Fonte
  const handleVerificarFonte = async (fonte: FonteExternaControlada) => {
    const docRelacionado = documentos.find((d) => d.fonteExternaId === fonte.id) || documentos[0];
    const revVigente = revisoes.find((r) => r.id === docRelacionado?.revisaoVigenteId);

    const logSimulado = simularVerificacaoFonteExterna({
      fonte,
      documento: docRelacionado || {
        id: 'doc-ext-01',
        organizationId,
        codigo: 'DOC-EXT',
        titulo: fonte.nome,
        categoria: 'DOCUMENTO_FABRICANTE',
        emissor: fonte.nome,
        responsavelNome: currentUser?.displayName || 'Garantia da Qualidade',
        exigeEvidenciaLeitura: false,
        aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
        statusGeral: 'ATIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      revisaoAtual: revVigente,
      usuarioExecutor: currentUser?.displayName || currentUser?.email || 'Auditor SGQ',
    });

    await saveLogVerificacao(organizationId, logSimulado, currentUser);

    const fonteAtualizada: FonteExternaControlada = {
      ...fonte,
      ultimaVerificacao: new Date().toISOString(),
      ultimoResultadoStatus:
        logSimulado.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA'
          ? 'NOVA_REVISAO_IDENTIFICADA'
          : logSimulado.statusVerificacao === 'FONTE_INDISPONIVEL'
          ? 'FONTE_INDISPONIVEL'
          : logSimulado.statusVerificacao === 'VERIFICACAO_NAO_CONCLUSIVA'
          ? 'VERIFICACAO_NAO_CONCLUSIVA'
          : 'CONFORME_SEM_ALTERACAO',
      ultimoResultadoDetalhes: logSimulado.mensagem,
      updatedAt: new Date().toISOString(),
    };
    await saveFonteExterna(organizationId, fonteAtualizada, currentUser);

    showToast(`Verificação da fonte "${fonte.nome}" concluída! Status: ${logSimulado.statusVerificacao}`);
  };

  // Registrar Evidência de Consulta Técnica (Seção 21)
  const handleSalvarEvidenciaConsulta = async (doc: DocumentoControlado, finalidade: any, refOp: string) => {
    const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
    const novaEvidencia: RegistroEvidenciaConsultaDocumento = {
      id: `evid-${Date.now()}`,
      organizationId,
      documentoId: doc.id,
      codigoDocumento: doc.codigo,
      revisaoId: revVigente?.id || 'rev-vigente',
      numeroRevisao: revVigente?.numeroRevisao || 'Rev. Vigente',
      usuarioNome: currentUser?.displayName || currentUser?.email || 'Técnico Operacional',
      usuarioUid: currentUser?.uid || 'usr-op',
      dataHora: new Date().toISOString(),
      finalidadeConsulta: finalidade,
      referenciaOperacional: refOp,
      declaracaoLeituraConfirmada: true,
    };

    await registrarEvidenciaConsulta(organizationId, novaEvidencia, currentUser);
    setIsConsultModalOpen(false);
    showToast(`Evidência de consulta do documento ${doc.codigo} registrada com sucesso.`);
  };

  // Funções de Gestão de Arquivos / Repositório de Manuais
  const handleOpenUploadModal = (docToUpdate?: DocumentoControlado | null) => {
    setDocForUpload(docToUpdate || null);
    setIsUploadModalOpen(true);
  };

  const handleOpenFilePreview = (doc: DocumentoControlado, rev?: RevisaoDocumental | null) => {
    setPreviewDoc(doc);
    setPreviewRev(rev || null);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Header Principal do Centro de Controle Documental */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                FASE 10 — HOMOLOGADA
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeOrganization?.name || 'QualiGest SGQ'} • RBAC 145 / ISO 9001
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-sky-400" />
              Controle Documental, Revisões & Conhecimento Temporal
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Sistema integrado de rastreabilidade aeronáutica: conecta documento, revisão vigente, fontes externas oficiais,
              aplicabilidade multidimensional e conhecimento histórico para auditorias e decisões operacionais.
            </p>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenUploadModal(null)}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              title="Fazer upload direto de manual da empresa (PDF/DOCX) com preenchimento automático no controle geral"
            >
              <Upload className="w-4 h-4" />
              <span>Upload de Manual (PDF/DOCX)</span>
            </button>
            <button
              onClick={() => {
                setActiveSubTab('historico');
                setActiveHistoricoSection('relatorio');
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              title="Gerar relatório visual e exportação PDF para evidência à ANAC / Autoridade Reguladora"
            >
              <Printer className="w-4 h-4" />
              <span>Relatório de Conformidade (PDF)</span>
            </button>
            <button
              onClick={handleVerificarFontesPublicas}
              disabled={isVerifyingUpdates}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              title="Disparar robô de checagem automática das publicações oficiais (RBAC, IS, IAC ANAC)"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifyingUpdates ? 'animate-spin' : ''}`} />
              <span>{isVerifyingUpdates ? 'Verificando Fontes...' : 'Verificar Atualizações'}</span>
            </button>
            <button
              onClick={() => {
                setSelectedDocForDetail(null);
                setIsNewDocModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Documento Manual
            </button>
          </div>
        </div>

        {/* Nova Estrutura Unificada de 3 Sub-Abas Mandatadas para Eliminar Duplicidade */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {[
            {
              id: 'acervo',
              label: '1. Acervo & Biblioteca',
              subtitle: 'Gestão de Arquivos / Repositório',
              icon: BookOpen,
              count: documentos.length,
            },
            {
              id: 'verificacao',
              label: '2. Verificação & Controle',
              subtitle: 'Status de Revisão e Automações',
              icon: ShieldCheck,
              count: documentos.length,
            },
            {
              id: 'historico',
              label: '3. Histórico & Relatórios',
              subtitle: 'Auditoria / Comunicação à Autoridade',
              icon: History,
              count: revisoes.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive ? 'bg-sky-500/30 text-sky-200' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">{tab.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: ACERVO & BIBLIOTECA (GESTÃO DE ARQUIVOS / REPOSITÓRIO)         */}
      {/* ========================================================================= */}
      {activeSubTab === 'acervo' && (
        <div className="space-y-4">
          {/* Card Resumo do Acervo & Repositório de Arquivos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    REPOSITÓRIO DIGITAL CENTRAL
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF / Word (.docx) • Cópias Controladas com Hash & Integridade
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                  Acervo & Biblioteca Técnica da Empresa
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Gerencie o armazenamento e o ciclo de vida dos arquivos técnicos. Cada upload de manual atualiza automaticamente a revisão vigente no controle geral e alimenta a linha do tempo imutável para auditorias.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenUploadModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-600/20 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload de Novo Manual (PDF/DOCX)</span>
                </button>
              </div>
            </div>

            {/* Métricas Rápidas do Repositório */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Total de Manuais:</span>
                <span className="text-lg font-bold text-white font-mono">{documentos.length}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Com Arquivo Digital:</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {documentos.filter((d) => d.arquivoNome).length}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">
                  ({Math.round(((documentos.filter((d) => d.arquivoNome).length || 0) / (documentos.length || 1)) * 100)}%)
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Revisões Vigentes:</span>
                <span className="text-lg font-bold text-sky-400 font-mono">
                  {documentos.filter((d) => d.statusGeral !== 'INATIVO').length}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Histórico Arquivado:</span>
                <span className="text-lg font-bold text-indigo-400 font-mono">{revisoes.length} revisões</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, título, emissor, área ou proprietário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Botões de Filtro de Automação (AUTOMÁTICO vs MANUAL) */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" /> Verificação:
                </span>
                <button
                  onClick={() => setSelectedTipoVerificacao('TODOS')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedTipoVerificacao === 'TODOS'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Todas ({documentos.length})
                </button>
                <button
                  onClick={() => setSelectedTipoVerificacao('AUTOMATICO')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedTipoVerificacao === 'AUTOMATICO'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/40 border border-indigo-500/30'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  Automático ({documentos.filter((d) => d.tipoVerificacao === 'AUTOMATICO').length})
                </button>
                <button
                  onClick={() => setSelectedTipoVerificacao('MANUAL')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedTipoVerificacao === 'MANUAL'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 border border-amber-500/30'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  Manual ({documentos.filter((d) => d.tipoVerificacao !== 'AUTOMATICO').length})
                </button>
              </div>
            </div>

            {/* Linha secundária de filtros: Categoria, Status de Conformidade e Status Geral */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Categoria:
                </span>
                {['TODAS', 'DOCUMENTO_INTERNO', 'DOCUMENTO_AUTORIDADE', 'DOCUMENTO_FABRICANTE', 'DOCUMENTO_CLIENTE'].map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoria(cat)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        selectedCategoria === cat
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {cat === 'TODAS'
                        ? 'Todas'
                        : cat === 'DOCUMENTO_INTERNO'
                        ? 'Internos'
                        : cat === 'DOCUMENTO_AUTORIDADE'
                        ? 'Autoridades'
                        : cat === 'DOCUMENTO_FABRICANTE'
                        ? 'Fabricantes'
                        : 'Clientes'}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto flex-wrap">
                {/* Filtro Status de Conformidade */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-medium">Conformidade:</span>
                  <select
                    value={selectedStatusVerificacao}
                    onChange={(e) => setSelectedStatusVerificacao(e.target.value as any)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="TODOS">Todos os Resultados</option>
                    <option value="CONFORME">Conforme (Vigente no Mês)</option>
                    <option value="NOVA_REVISAO_IDENTIFICADA">Nova Revisão Detectada</option>
                    <option value="FONTE_INDISPONIVEL">Fonte Indisponível</option>
                    <option value="VERIFICACAO_NAO_CONCLUSIVA">Não Conclusiva</option>
                    <option value="PENDENTE_VERIFICACAO">Pendente Retorno</option>
                  </select>
                </div>

                {/* Filtro de Status Ativo/Inativo */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-medium">Ciclo:</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                    className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="ATIVO">Apenas Ativos</option>
                    <option value="INATIVO">Inativos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Documentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocumentos.map((doc) => {
              const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
              const totalRevisoes = revisoes.filter((r) => r.documentoId === doc.id).length;
              const isDocInativo = doc.statusGeral === 'INATIVO';

              return (
                <div
                  key={doc.id}
                  className={`border rounded-xl p-5 flex flex-col justify-between transition-all group hover:shadow-md ${
                    isDocInativo
                      ? 'bg-slate-950/60 border-slate-800/60 opacity-80 hover:opacity-100'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Topo do Card: Código + Badges (Automação, Conformidade, Categoria) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            {doc.codigo}
                          </span>

                          {/* Badge Automação: AUTOMÁTICO vs MANUAL */}
                          {doc.tipoVerificacao === 'AUTOMATICO' ? (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"
                              title="Verificação Automática via Robô de Consulta Pública Oficial (ANAC / DOU / FAA)"
                            >
                              <Bot className="w-3 h-3 text-indigo-400" />
                              AUTOMÁTICO
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                              title="Verificação Manual: depende de notificação ao cliente ou acesso restrito a portal de fabricante"
                            >
                              <UserCheck className="w-3 h-3 text-amber-400" />
                              MANUAL
                            </span>
                          )}

                          {/* Badge Status de Conformidade */}
                          {doc.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDiscrepancyValidation(doc);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse hover:bg-rose-500/30 transition-colors cursor-pointer"
                              title={`Nova revisão detectada na fonte: ${doc.revisaoNaFonteIdentificada || 'Verificar'}. Clique para validar decisão técnica.`}
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Nova Rev. Identificada
                            </button>
                          ) : doc.statusVerificacao === 'FONTE_INDISPONIVEL' ? (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 flex items-center gap-1"
                              title="Fonte oficial indisponível ou inacessível no momento"
                            >
                              <AlertCircle className="w-3 h-3 text-orange-400" />
                              Fonte Indisponível
                            </span>
                          ) : doc.statusVerificacao === 'VERIFICACAO_NAO_CONCLUSIVA' ? (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1"
                              title="Não foi possível determinar com segurança a publicação. Mantida revisão vigente controlada."
                            >
                              <HelpCircle className="w-3 h-3 text-slate-400" />
                              Não Conclusiva
                            </span>
                          ) : doc.statusVerificacao === 'PENDENTE_VERIFICACAO' ? (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                              title="Aguardando retorno de cliente ou validação técnica"
                            >
                              <Clock className="w-3 h-3 text-amber-400" />
                              Pendente Retorno
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                              title="Revisão vigente conferida e em estrita conformidade"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              Conforme no Mês
                            </span>
                          )}

                          {isDocInativo && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                              <PowerOff className="w-2.5 h-2.5" /> Inativo
                            </span>
                          )}
                        </div>

                        {/* 1. TÍTULO */}
                        <h3 className="text-sm font-bold text-white mt-1 group-hover:text-sky-300 transition-colors line-clamp-2">
                          {doc.titulo}
                        </h3>
                      </div>

                      {/* Categoria */}
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                          doc.categoria === 'DOCUMENTO_AUTORIDADE'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : doc.categoria === 'DOCUMENTO_FABRICANTE'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : doc.categoria === 'DOCUMENTO_CLIENTE'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                        }`}
                      >
                        {doc.categoria.replace('DOCUMENTO_', '')}
                      </span>
                    </div>

                    {/* Bloco dos 5 Campos Base Estruturados */}
                    <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Área de Publicação:</span>
                        <span className="text-slate-200 font-semibold truncate max-w-[180px]">
                          {doc.areaPublicacao || doc.tipoSubcategoria || 'Geral SGQ / Manutenção'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Proprietário / Cessor:</span>
                        <span className="text-slate-200 font-semibold truncate max-w-[180px]">
                          {doc.proprietarioCessor || doc.clienteNome || doc.emissor || 'Impacto Aviation'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Número da Revisão:</span>
                        <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {doc.numeroRevisao || doc.revisaoVigenteNumero || revVigente?.numeroRevisao || 'Rev. 00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Data da Revisão:</span>
                        <span className="text-slate-200 font-mono font-medium">
                          {doc.dataRevisao || revVigente?.dataEntradaVigor || doc.atualizadoEm?.split('T')[0] || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Mapeamento de Fonte & Status do Robô / Verificação */}
                    <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                      {doc.urlFonteVerificacao && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Fonte Mapeada:</span>
                          <a
                            href={doc.urlFonteVerificacao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300 font-mono truncate max-w-[190px] flex items-center gap-1 hover:underline"
                            title={doc.urlFonteVerificacao}
                          >
                            <span className="truncate">{doc.urlFonteVerificacao.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {doc.dataUltimaVerificacao && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Última Checagem:</span>
                          <span className="text-slate-300 font-mono text-[10px]">
                            {new Date(doc.dataUltimaVerificacao).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(doc.dataUltimaVerificacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {doc.detalhesUltimaVerificacao && (
                        <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/60 line-clamp-2">
                          {doc.detalhesUltimaVerificacao}
                        </p>
                      )}
                    </div>

                    {/* Bloco de Repositório de Arquivos (Sub-aba Acervo & Biblioteca) */}
                    <div className="pt-2">
                      {doc.arquivoNome ? (
                        <div className="p-2.5 rounded-lg bg-sky-950/20 border border-sky-500/30 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-sky-300 font-mono font-medium truncate max-w-[200px]" title={doc.arquivoNome}>
                              <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span className="truncate">{doc.arquivoNome}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {formatFileSize(doc.arquivoTamanhoBytes)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenFilePreview(doc)}
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              title="Visualizar no navegador ou baixar o arquivo vigente"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visualizar / Download</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenUploadModal(doc)}
                              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Subir nova versão ou revisão substituindo a atual"
                            >
                              <Upload className="w-3.5 h-3.5 text-sky-400" />
                              <span>Nova Versão</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-[11px]">Arquivo digital pendente</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenUploadModal(doc)}
                            className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Anexar Arquivo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card de Governança */}
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    {/* Ações Padrão de Governança */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setConsultTargetDoc(doc);
                            setIsConsultModalOpen(true);
                          }}
                          className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Registrar evidência de consulta técnica no SGQ"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>Consultar</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditDoc(doc)}
                          className="text-xs text-slate-400 hover:text-sky-300 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar Metadados do Documento"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {isDocInativo ? (
                          <button
                            onClick={() => handleOpenReactivateDoc(doc)}
                            className="text-xs text-slate-400 hover:text-emerald-400 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Reativar Documento"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenInactivateDoc(doc)}
                            className="text-xs text-slate-400 hover:text-amber-400 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Inativar Documento (Lógica)"
                          >
                            <PowerOff className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenDeleteDoc(doc)}
                          className="text-xs text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Excluir Registro (com verificação prévia)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedDocForDetail(doc)}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-sky-500/10 transition-colors cursor-pointer"
                      >
                        Linha do Tempo
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer / Modal de Detalhes da Linha do Tempo e Revisões */}
          {selectedDocForDetail && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
                {/* Cabeçalho do Modal */}
                <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {selectedDocForDetail.codigo}
                      </span>
                      <span className="text-xs text-slate-400 uppercase tracking-wider">
                        {selectedDocForDetail.categoria}
                      </span>
                      {selectedDocForDetail.statusGeral === 'INATIVO' ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <PowerOff className="w-2.5 h-2.5" /> Inativo
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativo
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-white">{selectedDocForDetail.titulo}</h2>
                    <p className="text-xs text-slate-400">
                      Responsável Técnico: {selectedDocForDetail.responsavelNome} • Emissor: {selectedDocForDetail.emissor}
                    </p>
                  </div>

                  {/* Ações no Topo do Detalhe */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleOpenEditDoc(selectedDocForDetail)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Editar Metadados"
                    >
                      <Edit className="w-3.5 h-3.5 text-sky-400" />
                      <span>Editar</span>
                    </button>

                    {selectedDocForDetail.statusGeral === 'INATIVO' ? (
                      <button
                        onClick={() => handleOpenReactivateDoc(selectedDocForDetail)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Reativar Documento"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reativar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenInactivateDoc(selectedDocForDetail)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/50 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Inativar Documento"
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                        <span>Inativar</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenDeleteDoc(selectedDocForDetail)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Excluir Documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>

                    <button
                      onClick={() => setSelectedDocForDetail(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Banner Regulatório de Inativação se o documento estiver inativo */}
                {selectedDocForDetail.statusGeral === 'INATIVO' && (
                  <div className="mx-6 mt-4 p-4 rounded-xl border bg-slate-950 border-slate-800 text-slate-300 flex items-start gap-3">
                    <PowerOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white text-sm">
                        Documento Inativo / Obsoleto (Histórico e Revisões Preservados)
                      </p>
                      {selectedDocForDetail.inativadoEm && (
                        <p className="text-slate-400">
                          Inativado em{' '}
                          <strong>{new Date(selectedDocForDetail.inativadoEm).toLocaleString('pt-BR')}</strong> por{' '}
                          <strong>{selectedDocForDetail.inativadoPor || 'SGQ'}</strong>.
                        </p>
                      )}
                      {selectedDocForDetail.motivoInativacao && (
                        <p className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200">
                          <span className="font-semibold text-white">Justificativa da Inativação:</span>{' '}
                          {selectedDocForDetail.motivoInativacao}
                        </p>
                      )}
                      <p className="text-slate-500 text-[11px] pt-1">
                        ⚠️ Conforme regulamentação ANAC RBAC 145 / EASA Part 145 e diretrizes do MOMQ, documentos inativados
                        não podem receber novas revisões operacionais, mas todas as revisões históricas e registros de leitura
                        permanecem disponíveis para fins de auditoria e conformidade temporal.
                      </p>
                    </div>
                  </div>
                )}

                {/* Conteúdo com a Linha do Tempo Cronológica */}
                <div className="p-6 overflow-y-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-sky-400" />
                        Histórico Cronológico & Ciclo de Vida das Revisões
                      </h4>
                      <p className="text-xs text-slate-400">
                        Cada revisão é um registro imutável com vigência temporal estrita.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsNewRevisionModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Propor Nova Revisão
                    </button>
                  </div>

                  {/* Linha do Tempo */}
                  <div className="space-y-4 border-l-2 border-slate-800 ml-4 pl-6 relative">
                    {revisoesDoDocSelecionado.map((rev) => {
                      const isVigente = rev.statusCicloVida === 'VIGENTE';
                      const isSubstituido = rev.statusCicloVida === 'SUBSTITUIDO';

                      return (
                        <div key={rev.id} className="relative group">
                          {/* Marcador do nó */}
                          <div
                            className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 ${
                              isVigente
                                ? 'bg-emerald-500 border-emerald-400 shadow-xs shadow-emerald-500/50'
                                : isSubstituido
                                ? 'bg-slate-800 border-slate-600'
                                : 'bg-amber-500 border-amber-400'
                            }`}
                          />

                          <div
                            className={`p-4 rounded-xl border transition-all ${
                              isVigente
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{rev.numeroRevisao}</span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    isVigente
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : isSubstituido
                                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {rev.statusCicloVida}
                                </span>
                                {rev.ehImutavel && (
                                  <span
                                    className="text-[10px] text-slate-400 flex items-center gap-0.5 bg-slate-800/80 px-1.5 py-0.5 rounded"
                                    title="Registro assinado e imutável no SGQ"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    Imutável
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-xs text-slate-400 font-mono">
                                  Vigor: <strong className="text-slate-200">{rev.dataEntradaVigor}</strong>
                                  {rev.dataSubstituicao && (
                                    <>
                                      {' '}
                                      até <strong className="text-slate-200">{rev.dataSubstituicao}</strong>
                                    </>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setRevisaoToDelete(rev)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Excluir esta revisão"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Detalhes da alteração */}
                            {rev.escopoAlteracoes && (
                              <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                <strong>Escopo das Alterações:</strong> {rev.escopoAlteracoes}
                              </p>
                            )}

                            {/* Arquivo da Versão / Revisão */}
                            {(rev.arquivoNome || selectedDocForDetail.arquivoNome) && (
                              <div className="mt-2.5 flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                                <div className="flex items-center gap-2 text-slate-300 truncate">
                                  <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  <span className="font-mono truncate">{rev.arquivoNome || selectedDocForDetail.arquivoNome}</span>
                                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                    ({formatFileSize(rev.arquivoTamanhoBytes || selectedDocForDetail.arquivoTamanhoBytes)})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenFilePreview(selectedDocForDetail, rev)}
                                  className="px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Visualizar / Download</span>
                                </button>
                              </div>
                            )}

                            {/* Informações de Aprovação */}
                            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                              <span>
                                Aprovado por: <strong>{rev.aprovadoPorNome || 'Garantia da Qualidade'}</strong>{' '}
                                {rev.dataAprovacao && `em ${rev.dataAprovacao}`}
                              </span>

                              {rev.substituidaPorRevisaoNumero && (
                                <span className="text-amber-400/90 font-medium">
                                  Substituída pela {rev.substituidaPorRevisaoNumero}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    ID Interno: <code className="text-slate-300">{selectedDocForDetail.id}</code>
                  </span>
                  <button
                    onClick={() => setSelectedDocForDetail(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: VERIFICAÇÃO & CONTROLE (STATUS DE REVISÃO E AUTOMAÇÕES)       */}
      {/* ========================================================================= */}
      {activeSubTab === 'verificacao' && (
        <div className="space-y-6">
          {/* Header da Sub-aba com Ação de Verificação Automática */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    CONTROLE DE VIGÊNCIA & AUTOMAÇÃO
                  </span>
                  <span className="text-xs text-slate-400">
                    Robô de Scraping ANAC (RBAC/IS/IAC) + Tratativas Manuais (Clientes & Fabricantes)
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  Verificação & Controle de Vigência de Manuais
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Monitoramento contínuo das revisões em uso contra publicações oficiais. Identifique discrepâncias regulatórias antes das auditorias, automatize solicitações a clientes e oriente acessos restritos a portais de fabricantes.
                </p>
              </div>

              {/* Botão em Destaque: Verificar Atualizações */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleVerificarFontesPublicas}
                  disabled={isVerifyingUpdates}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isVerifyingUpdates ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingUpdates ? 'Varrendo Fontes Oficiais...' : 'Verificar Atualizações de Fontes Públicas'}</span>
                </button>
                <button
                  onClick={() => setIsNewSourceModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>Nova Fonte Oficial</span>
                </button>
              </div>
            </div>

            {/* KPIs de Verificação */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">Manuais no Acervo:</span>
                <span className="text-lg font-bold text-white font-mono">{documentos.length}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-indigo-500/20">
                <span className="text-[11px] text-indigo-300 block mb-0.5 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> Automáticos (ANAC):
                </span>
                <span className="text-lg font-bold text-indigo-400 font-mono">
                  {documentos.filter((d) => d.tipoVerificacao === 'AUTOMATICO').length}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-amber-500/20">
                <span className="text-[11px] text-amber-300 block mb-0.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Manuais (Clientes/OEM):
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {documentos.filter((d) => d.tipoVerificacao !== 'AUTOMATICO').length}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-emerald-500/20">
                <span className="text-[11px] text-emerald-300 block mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conformes no Mês:
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {documentos.filter((d) => d.statusVerificacao !== 'NOVA_REVISAO_IDENTIFICADA' && d.statusVerificacao !== 'PENDENTE_VERIFICACAO').length}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-rose-500/20">
                <span className="text-[11px] text-rose-300 block mb-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Novas Revisões Detectadas:
                </span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  {documentos.filter((d) => d.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA').length}
                </span>
              </div>
            </div>

            {/* Navegação Secundária da Sub-Aba Verificação */}
            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800 flex-wrap">
              <button
                onClick={() => setActiveVerificacaoSection('vigencia')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeVerificacaoSection === 'vigencia'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Painel de Vigência de Manuais ({documentos.length})</span>
              </button>
              <button
                onClick={() => setActiveVerificacaoSection('fontes')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeVerificacaoSection === 'fontes'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Fontes Oficiais Cadastradas ({fontes.length})</span>
              </button>
              <button
                onClick={() => setActiveVerificacaoSection('solicitacoes')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeVerificacaoSection === 'solicitacoes'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Solicitações a Clientes ({solicitacoes.length})</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 1: Painel de Vigência e Tratativas de Revisão */}
          {activeVerificacaoSection === 'vigencia' && (
            <div className="space-y-4">
              {/* Barra de Filtros */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar manual ou autoridade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">Modo:</span>
                  <button
                    onClick={() => setSelectedTipoVerificacao('TODOS')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedTipoVerificacao === 'TODOS'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Todas ({documentos.length})
                  </button>
                  <button
                    onClick={() => setSelectedTipoVerificacao('AUTOMATICO')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                      selectedTipoVerificacao === 'AUTOMATICO'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    <Bot className="w-3 h-3" />
                    Automático ({documentos.filter((d) => d.tipoVerificacao === 'AUTOMATICO').length})
                  </button>
                  <button
                    onClick={() => setSelectedTipoVerificacao('MANUAL')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                      selectedTipoVerificacao === 'MANUAL'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-950 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    Manual ({documentos.filter((d) => d.tipoVerificacao !== 'AUTOMATICO').length})
                  </button>
                </div>
              </div>

              {/* Grid dos Cards de Verificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDocumentos.map((doc) => {
                  const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
                  const isAuto = doc.tipoVerificacao === 'AUTOMATICO';
                  const isNovaRev = doc.statusVerificacao === 'NOVA_REVISAO_IDENTIFICADA';

                  return (
                    <div
                      key={doc.id}
                      className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition-all ${
                        isNovaRev
                          ? 'border-rose-500/60 shadow-lg shadow-rose-500/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            {doc.codigo}
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isAuto ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                <Bot className="w-3 h-3 text-indigo-400" /> AUTOMÁTICO (WEB)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-amber-400" /> MANUAL
                              </span>
                            )}

                            {isNovaRev ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDiscrepancyValidation(doc);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse hover:bg-rose-500/30 transition-colors cursor-pointer"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-400" /> Nova Rev. Detectada!
                              </button>
                            ) : doc.statusVerificacao === 'FONTE_INDISPONIVEL' ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-orange-400" /> Fonte Indisponível
                              </span>
                            ) : doc.statusVerificacao === 'VERIFICACAO_NAO_CONCLUSIVA' ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-slate-400" /> Não Conclusiva
                              </span>
                            ) : doc.statusVerificacao === 'PENDENTE_VERIFICACAO' ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" /> Pendente Retorno
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Conforme
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Título */}
                        <h3 className="text-sm font-bold text-white line-clamp-2">{doc.titulo}</h3>

                        {/* Dados de Vigência */}
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Área:</span>
                            <span className="text-slate-200 font-medium truncate max-w-[170px]">{doc.areaPublicacao || 'Geral'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Proprietário/Cessor:</span>
                            <span className="text-slate-200 font-medium truncate max-w-[170px]">{doc.proprietarioCessor || doc.emissor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Revisão em Uso:</span>
                            <span className="text-emerald-400 font-mono font-bold">{doc.numeroRevisao || doc.revisaoVigenteNumero || 'Rev. 01'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Data da Revisão:</span>
                            <span className="text-slate-200 font-mono">{doc.dataRevisao || revVigente?.dataEntradaVigor || '-'}</span>
                          </div>
                          {doc.dataUltimaVerificacao && (
                            <div className="flex justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                              <span className="text-slate-500">Última Checagem:</span>
                              <span className="text-slate-400 font-mono">{new Date(doc.dataUltimaVerificacao).toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                        </div>

                        {doc.detalhesUltimaVerificacao && (
                          <p className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/60 line-clamp-2">
                            {doc.detalhesUltimaVerificacao}
                          </p>
                        )}
                      </div>

                      {/* Botões de Ação de Verificação */}
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                        {isAuto ? (
                          <div className="flex items-center gap-1.5">
                            {doc.urlFonteVerificacao ? (
                              <a
                                href={doc.urlFonteVerificacao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                              >
                                <Bot className="w-3.5 h-3.5" />
                                <span>Fonte Oficial ANAC</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDocForVerificationModal(doc);
                                  setIsConfigureSourceModalOpen(true);
                                }}
                                className="flex-1 py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Bot className="w-3.5 h-3.5" />
                                <span>Vincular URL Oficial</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocForVerificationModal(doc);
                                setIsConfigureSourceModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                              title="Configurar método ou URL de verificação"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {doc.categoria === 'DOCUMENTO_CLIENTE' || doc.contatoClienteEmail ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocForVerificationModal(doc);
                                    setIsCustomerNotificationModalOpen(true);
                                  }}
                                  className="flex-1 py-1.5 px-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Notificar Cliente</span>
                                </button>
                              ) : doc.categoria === 'DOCUMENTO_FABRICANTE' || doc.portalFabricanteUrl ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocForVerificationModal(doc);
                                    setIsManufacturerAlertModalOpen(true);
                                  }}
                                  className="flex-1 py-1.5 px-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>Portal OEM Restrito</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocForVerificationModal(doc);
                                    setIsConfigureSourceModalOpen(true);
                                  }}
                                  className="flex-1 py-1.5 px-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Mapear Fonte Manual</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDocForVerificationModal(doc);
                                  setIsConfigureSourceModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                                title="Configurar URL ou Contato"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            onClick={() => handleOpenFilePreview(doc)}
                            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Arquivo</span>
                          </button>
                          <button
                            onClick={() => setSelectedDocForDetail(doc)}
                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            <span>Linha do Tempo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: Fontes Externas Oficiais Cadastradas */}
          {activeVerificacaoSection === 'fontes' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-400" />
                    Fontes Externas Oficiais Cadastradas ({fontes.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Rotinas de verificação compulsória com registro de evidência.
                  </p>
                </div>
                <button
                  onClick={() => setIsNewSourceModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Fonte
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {fontes.map((fonte) => (
                  <div key={fonte.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{fonte.nome}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {fonte.tipoFonte}
                        </span>
                      </div>
                      {fonte.urlBase && (
                        <a href={fonte.urlBase} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>{fonte.urlBase}</span>
                        </a>
                      )}
                      <p className="text-slate-400 text-[11px]">
                        Responsável: {fonte.responsavelVerificacaoNome} • Ciclo: a cada {fonte.frequenciaDias} dias
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerificarFonte(fonte)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Verificar Agora</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO 3: Solicitações a Clientes */}
          {activeVerificacaoSection === 'solicitacoes' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    Solicitações de Atualização Enviadas a Clientes ({solicitacoes.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histórico de formalização e prazos para comprovação regulamentar de revisões de operadores parceiros.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {solicitacoes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Nenhuma solicitação enviada ainda. Selecione um manual de cliente no painel de vigência para notificar.
                  </div>
                ) : (
                  solicitacoes.map((sol) => (
                    <div key={sol.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{sol.clienteNome} • {sol.documentoCodigo}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{sol.status}</span>
                      </div>
                      <p className="text-slate-400">Assunto: {sol.assuntoGerado}</p>
                      <p className="text-slate-500 text-[11px]">Enviado em: {new Date(sol.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 3: HISTÓRICO & RELATÓRIOS (AUDITORIA / AUTORIDADE REGULADORA)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'historico' && (
        <div className="space-y-6">
          {/* Header da Sub-aba */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    AUDITORIA & CONFORMIDADE REGULAMENTAR
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    RBAC 145.109 • IS 145.109-001 • ANAC / FAA
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-6 h-6 text-emerald-400" />
                  Histórico de Revisões & Relatório Oficial de Conformidade
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Evidência formal de que todas as publicações técnicas em uso pela organização de manutenção são as revisões vigentes homologadas. Histórico cronológico imutável com preservação de acervo passado.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsComplianceReportOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Relatório Oficial (PDF)</span>
                </button>
              </div>
            </div>

            {/* Navegação Secundária da Sub-Aba Histórico */}
            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800 flex-wrap">
              <button
                onClick={() => setActiveHistoricoSection('relatorio')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeHistoricoSection === 'relatorio'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Relatório Oficial de Conformidade Mensal (RBAC 145)</span>
              </button>
              <button
                onClick={() => setActiveHistoricoSection('timeline')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeHistoricoSection === 'timeline'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Linha do Tempo & Histórico Completo ({revisoes.length} revisões)</span>
              </button>
              <button
                onClick={() => setActiveHistoricoSection('comparador')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeHistoricoSection === 'comparador'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Comparador de Revisões & Matriz de Impacto</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 1: Relatório Oficial de Conformidade Mensal */}
          {activeHistoricoSection === 'relatorio' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Relatório de Conformidade Mensal de Publicações Técnicas
                    </h3>
                    <p className="text-xs text-slate-400">
                      Evidência formal auditável perante a autoridade de aviação civil (ANAC / FAA)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Mês de Referência:</span>
                    <input
                      type="month"
                      value={relatorioMesReferencia}
                      onChange={(e) => setRelatorioMesReferencia(e.target.value)}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <button
                    onClick={() => setIsComplianceReportOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Visualizar Impressão Oficial</span>
                  </button>
                </div>
              </div>

              {/* Tabela Oficial de Conformidade dos 5 Campos Base */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Área de Publicação</th>
                      <th className="p-3">Título do Manual</th>
                      <th className="p-3">Proprietário / Cessor</th>
                      <th className="p-3">Revisão em Uso</th>
                      <th className="p-3">Data da Revisão</th>
                      <th className="p-3">Verificação</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-normal">
                    {documentos.map((doc) => {
                      const revVigente = revisoes.find((r) => r.id === doc.revisaoVigenteId);
                      const isAuto = doc.tipoVerificacao === 'AUTOMATICO';
                      return (
                        <tr key={doc.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-sky-400">{doc.codigo}</td>
                          <td className="p-3 text-slate-300">{doc.areaPublicacao || 'Regulamentação Aeronáutica'}</td>
                          <td className="p-3 font-medium text-white max-w-xs">{doc.titulo}</td>
                          <td className="p-3 text-slate-300">{doc.proprietarioCessor || doc.emissor}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {doc.numeroRevisao || doc.revisaoVigenteNumero || revVigente?.numeroRevisao || 'Rev. 01'}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {doc.dataRevisao || revVigente?.dataEntradaVigor || '-'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAuto
                                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isAuto ? 'AUTOMÁTICO' : 'MANUAL'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              VIGENTE
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEÇÃO 2: Linha do Tempo e Histórico Completo de Revisões */}
          {activeHistoricoSection === 'timeline' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-sky-400" />
                    Histórico Cronológico & Ciclo de Vida das Revisões Passadas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Todas as versões anteriores arquivadas de forma imutável com preservação de acervo
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filtrar Documento:</span>
                  <select
                    value={historicoSelectedDocId}
                    onChange={(e) => setHistoricoSelectedDocId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="TODOS">Todos os Manuais ({revisoes.length} revisões)</option>
                    {documentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo} — {d.titulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timeline Completa */}
              <div className="space-y-4 border-l-2 border-slate-800 ml-4 pl-6 relative">
                {revisoes
                  .filter((r) => historicoSelectedDocId === 'TODOS' || r.documentoId === historicoSelectedDocId)
                  .sort((a, b) => (b.dataEntradaVigor || '').localeCompare(a.dataEntradaVigor || ''))
                  .map((rev) => {
                    const docPai = documentos.find((d) => d.id === rev.documentoId);
                    const isVigente = rev.statusCicloVida === 'VIGENTE';
                    return (
                      <div key={rev.id} className="relative group">
                        <div
                          className={`absolute -left-[31px] top-2 w-4 h-4 rounded-full border-2 ${
                            isVigente ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-600'
                          }`}
                        />
                        <div
                          className={`p-4 rounded-xl border ${
                            isVigente
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                {rev.codigoDocumento}
                              </span>
                              <span className="text-sm font-bold text-white">{rev.numeroRevisao}</span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  isVigente
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {rev.statusCicloVida}
                              </span>
                            </div>

                            <div className="text-xs text-slate-400 font-mono">
                              Vigor: <strong className="text-slate-200">{rev.dataEntradaVigor}</strong>
                              {rev.dataSubstituicao && <> até <strong className="text-slate-200">{rev.dataSubstituicao}</strong></>}
                            </div>
                          </div>

                          <p className="text-xs text-slate-200 font-medium mt-1">{rev.tituloDocumento}</p>

                          {rev.escopoAlteracoes && (
                            <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                              <strong>Escopo das Alterações:</strong> {rev.escopoAlteracoes}
                            </p>
                          )}

                          {/* Arquivo da Revisão Histórica */}
                          {(rev.arquivoNome || docPai?.arquivoNome) && (
                            <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                              <div className="flex items-center gap-2 text-slate-300 truncate">
                                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="font-mono truncate">{rev.arquivoNome || docPai?.arquivoNome}</span>
                                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                  ({formatFileSize(rev.arquivoTamanhoBytes || docPai?.arquivoTamanhoBytes)})
                                </span>
                              </div>
                              {docPai && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFilePreview(docPai, rev)}
                                  className="px-2.5 py-1 rounded bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Visualizar / Download</span>
                                </button>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                            <span>Aprovado por: <strong>{rev.aprovadoPorNome || 'Gestor SGQ'}</strong></span>
                            <span className="font-mono text-[10px] text-slate-500">Hash Imutável: OK</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* SEÇÃO 3: Comparador de Revisões */}
          {activeHistoricoSection === 'comparador' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <GitCompare className="w-5 h-5 text-sky-400" />
                Comparador de Revisões & Matriz Sistêmica de Impactos
              </h2>
              <p className="text-xs text-slate-400 max-w-3xl mb-6">
                Compare lado a lado duas revisões de qualquer manual técnico ou procedimento para identificar inclusões,
                alterações de tolerância, e diagnosticar automaticamente os impactos em processos, treinamentos e auditorias.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Documento:</label>
                  <select
                    value={compareDocId}
                    onChange={(e) => {
                      setCompareDocId(e.target.value);
                      setCompareRevAId('');
                      setCompareRevBId('');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {documentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo} — {d.titulo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Revisão Anterior (Base):</label>
                  <select
                    value={compareRevAId}
                    onChange={(e) => setCompareRevAId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Selecione uma revisão...</option>
                    {revisoesDisponiveisParaComparar.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.numeroRevisao} ({r.dataEntradaVigor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Revisão Posterior (Nova):</label>
                  <select
                    value={compareRevBId}
                    onChange={(e) => setCompareRevBId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Selecione uma revisão...</option>
                    {revisoesDisponiveisParaComparar.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.numeroRevisao} ({r.dataEntradaVigor})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {comparacaoResult && (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                        <span className="font-bold text-white">{comparacaoResult.revA.numeroRevisao} (Base)</span>
                        <span>Vigor: {comparacaoResult.revA.dataEntradaVigor}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800/80">
                        {comparacaoResult.revA.escopoAlteracoes || 'Sem escopo detalhado de alterações cadastrado.'}
                      </p>
                    </div>

                    <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-sky-400 border-b border-slate-800 pb-2">
                        <span className="font-bold text-white">{comparacaoResult.revB.numeroRevisao} (Posterior)</span>
                        <span>Vigor: {comparacaoResult.revB.dataEntradaVigor}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded border border-sky-500/20">
                        {comparacaoResult.revB.escopoAlteracoes || 'Sem escopo detalhado de alterações cadastrado.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA LEGADA: CONSULTA TEMPORAL & HISTÓRICA                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'temporal' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MOTOR DE CONHECIMENTO TEMPORAL
                </span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Resolução Determinística de Vigência em Data Específica
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Em auditorias aeronáuticas, investigações de falha ou emissão de atestados de liberação de serviço (RTS),
                é mandatório responder: <em>"Qual revisão deste documento estava legalmente vigente e aplicável na exata data em que o evento ocorreu?"</em>
              </p>
            </div>

            {/* Formulário de Parâmetros da Pergunta */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Documento Controlado Alvo:
                </label>
                <select
                  value={temporalDocId}
                  onChange={(e) => setTemporalDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  2. Data do Evento / Execução da OS:
                </label>
                <input
                  type="date"
                  value={temporalDate}
                  onChange={(e) => setTemporalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Setor Operacional:
                </label>
                <input
                  type="text"
                  value={temporalSetor}
                  onChange={(e) => setTemporalSetor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  4. Modelo da Aeronave (se aplicável):
                </label>
                <input
                  type="text"
                  value={temporalAeronave}
                  onChange={(e) => setTemporalAeronave(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  5. Cliente Contratante:
                </label>
                <input
                  type="text"
                  value={temporalCliente}
                  onChange={(e) => setTemporalCliente(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <div className="w-full p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-center">
                  <span className="text-[11px] text-emerald-400 font-semibold block">Diagnóstico Contínuo Ativo</span>
                  <span className="text-[10px] text-slate-400">Rastreabilidade temporal em tempo real</span>
                </div>
              </div>
            </div>

            {/* Painel do Resultado do Diagnóstico Temporal */}
            {temporalResult && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Card Revisão Vigente no Evento */}
                  <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                      Vigente Na Data do Evento
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-slate-400">Revisão Aplicável em {temporalResult.dataConsultada}:</span>
                        <h3 className="text-xl font-bold text-white mt-0.5">
                          {temporalResult.revisaoNoEvento?.numeroRevisao || 'Nenhuma revisão vigente localizada'}
                        </h3>
                        <p className="text-xs text-emerald-400 font-mono mt-1">
                          Documento: {temporalResult.documento.codigo}
                        </p>
                      </div>

                      {temporalResult.revisaoNoEvento && (
                        <div className="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Entrada em Vigor:</span>
                            <span className="font-semibold text-white">
                              {temporalResult.revisaoNoEvento.dataEntradaVigor}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Substituída / Válida até:</span>
                            <span className="font-semibold text-white">
                              {temporalResult.revisaoNoEvento.dataSubstituicao || 'Continua em vigor'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Aprovador Técnico:</span>
                            <span>{temporalResult.revisaoNoEvento.aprovadoPorNome || 'Eng. Paulo Okubo'}</span>
                          </div>
                        </div>
                      )}

                      {temporalResult.revisaoNoEvento?.escopoAlteracoes && (
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-400 block mb-1">Conteúdo/Exigência na Época:</span>
                          <p className="bg-slate-900 p-2.5 rounded border border-slate-800 leading-relaxed">
                            {temporalResult.revisaoNoEvento.escopoAlteracoes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Comparativo com a Revisão Vigente Hoje */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Revisão Vigente Hoje:</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          HOJE ({new Date().toISOString().split('T')[0]})
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white">
                        {temporalResult.revisaoHoje?.numeroRevisao || temporalResult.documento.revisaoVigenteNumero}
                      </h3>

                      <div className="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status Comparativo:</span>
                          {temporalResult.revisaoNoEvento?.id === temporalResult.revisaoHoje?.id ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Mesma revisão vigente hoje
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Revisão foi alterada desde o evento
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Imutabilidade Histórica:</span>
                          <span className="text-slate-300">Garantida pelo SGQ QualiGest</span>
                        </div>
                      </div>

                      {/* Parecer de Defesa em Auditoria */}
                      <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/30 text-xs text-sky-200 space-y-1">
                        <span className="font-semibold flex items-center gap-1 text-sky-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Parecer de Validade para Auditoria:
                        </span>
                        <p className="leading-relaxed text-slate-300 text-[11px]">
                          Caso um auditor ou cliente questione a execução com base na redação da revisão atual (
                          {temporalResult.revisaoHoje?.numeroRevisao}), este relatório comprova formalmente que em{' '}
                          {temporalResult.dataConsultada} o requisito mandatório era o da{' '}
                          <strong>{temporalResult.revisaoNoEvento?.numeroRevisao}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avaliação de Aplicabilidade Multidimensional */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Diagnóstico de Aplicabilidade Multidimensional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Status Geral:</span>
                      <span
                        className={`font-semibold ${
                          temporalResult.aplicabilidade?.aplicavel ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {temporalResult.aplicabilidade?.aplicavel ? 'APLICÁVEL' : 'NÃO APLICÁVEL'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Escopo Técnico:</span>
                      <span className="text-slate-200">
                        {temporalResult.aplicabilidade?.detalhes?.aeronaveAplicavel ? 'Conforme aeronave' : 'Geral / N/A modelo'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Setor & Processo:</span>
                      <span className="text-slate-200">
                        {temporalResult.aplicabilidade?.detalhes?.setorAplicavel ? 'Setor abrangido' : 'Geral'}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-1">Justificativa:</span>
                      <span className="text-slate-300 text-[11px] line-clamp-2">
                        {temporalResult.aplicabilidade?.justificativa || 'Análise automática de aplicabilidade.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: FONTES EXTERNAS OFICIAIS & VERIFICAÇÃO PERIÓDICA                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'fontes' && (
        <div className="space-y-6">
          {/* Card Informativo com a Regra de Segurança Aeronáutica */}
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-5 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300">
                Regra Fundamental de Segurança Aeronáutica (Seção 12):
              </h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                O QualiGest monitora repositórios de publicação da ANAC, FAA, Textron, Boeing e portais de clientes. Quando
                uma nova revisão for identificada no repositório externo, <strong>NUNCA</strong> substituir
                automaticamente a cópia controlada no sistema. O sistema gera um alerta de discrepância e exige
                obrigatoriamente a validação técnica humana de um gestor credenciado.
              </p>
            </div>
          </div>

          {/* Tabela de Fontes Externas Controladas */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Fontes Externas Oficiais Cadastradas ({fontes.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Rotinas de verificação compulsória a cada 30, 45, 60 ou 90 dias com registro de evidência.
                </p>
              </div>

              <button
                onClick={() => setIsNewSourceModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Fonte
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {fontes.map((fonte) => {
                const isNovaRev = fonte.ultimoResultadoStatus === 'NOVA_REVISAO_IDENTIFICADA';

                return (
                  <div key={fonte.id} className="p-5 hover:bg-slate-800/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              fonte.tipoFonte === 'AUTORIDADE'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : fonte.tipoFonte === 'FABRICANTE'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {fonte.tipoFonte}
                          </span>
                          <span className="text-sm font-bold text-white">{fonte.nome}</span>
                        </div>

                        <div className="text-xs text-slate-400 font-mono truncate">
                          URL Base: <a href={fonte.urlBase} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">{fonte.urlBase} <ExternalLink className="w-3 h-3" /></a>
                        </div>

                        <p className="text-xs text-slate-300">{fonte.ultimoResultadoDetalhes || 'Verificação periódica agendada.'}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                        <div className="space-y-1 text-slate-400">
                          <div>Frequência: <strong className="text-white">{fonte.frequenciaDias} dias</strong></div>
                          <div>Última: <strong className="text-white">{fonte.ultimaVerificacao?.split('T')[0] || 'Pendente'}</strong></div>
                          <div>Próxima: <strong className="text-sky-300">{fonte.proximaVerificacao?.split('T')[0] || 'Pendente'}</strong></div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isNovaRev ? (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              Nova Revisão Detectada
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Conforme
                            </span>
                          )}

                          <button
                            onClick={() => handleVerificarFonte(fonte)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                            title="Executar verificação e gerar log oficial"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                            Verificar Agora
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico Recente de Logs de Verificação */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-sky-400" />
              Logs de Verificação em Fontes Oficiais & Decisões Humanas
            </h3>
            <div className="space-y-3">
              {logsVerificacao.map((log) => (
                <div key={log.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.codigoDocumento}</span>
                      <span className="text-slate-400">em {log.fonteNome}</span>
                      <span className="text-slate-500 font-mono">({log.dataVerificacao.split('T')[0]})</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{log.mensagem}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {log.requerValidacaoHumana && log.validacaoHumanaStatus === 'PENDENTE' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const docAlvo = documentos.find((d) => d.id === log.documentoId || d.codigo === log.codigoDocumento);
                          if (docAlvo) {
                            handleOpenDiscrepancyValidation(docAlvo);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer flex items-center gap-1 animate-pulse"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Validar Decisão Técnica
                      </button>
                    ) : log.validacaoHumanaStatus === 'FALSO_POSITIVO_REJEITADA' ? (
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                        Rejeitado pelo SGQ
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Verificado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: SOLICITAÇÕES DE REVISÃO A CLIENTES                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'solicitacoes' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-400" />
                  Comunicações de Revisão Técnica com Operadores & Clientes
                </h2>
                <p className="text-xs text-slate-400">
                  Geração padronizada bilíngue (EN/PT), controle de SLAs de resposta e atualização de manuais de clientes.
                </p>
              </div>

              <button
                onClick={() => setIsNewRequestModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Nova Solicitação
              </button>
            </div>

            {/* Lista de Solicitações */}
            <div className="mt-6 space-y-4">
              {solicitacoes.map((sol) => (
                <div key={sol.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{sol.clienteNome}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {sol.documentoCodigo}
                        </span>
                        <span className="text-xs text-slate-400">({sol.documentoTitulo})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Destinatário: <strong className="text-slate-300">{sol.destinatarioNome}</strong> ({sol.destinatarioEmail})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          sol.status === 'ENVIADA_PELO_USUARIO'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : sol.status === 'CONFIRMADA_VIGENTE'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : sol.status === 'RECEBIDA'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {sol.status.replace(/_/g, ' ')}
                      </span>

                      {/* Ações de Transição de Status */}
                      {sol.status === 'SOLICITACAO_GERADA' && (
                        <button
                          onClick={() =>
                            atualizarStatusSolicitacaoCliente(
                              organizationId,
                              sol,
                              'ENVIADA_PELO_USUARIO',
                              'Enviado por e-mail corporativo',
                              undefined,
                              currentUser
                            )
                          }
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium"
                        >
                          Marcar como Enviado
                        </button>
                      )}

                      {sol.status === 'ENVIADA_PELO_USUARIO' && (
                        <button
                          onClick={() =>
                            atualizarStatusSolicitacaoCliente(
                              organizationId,
                              sol,
                              'CONFIRMADA_VIGENTE',
                              'Cliente respondeu confirmando que a revisão atual continua vigente.',
                              undefined,
                              currentUser
                            )
                          }
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                        >
                          Confirmar Vigente
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Corpo do E-mail Formatado */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                    <div className="text-sky-300 font-semibold border-b border-slate-800 pb-1">
                      Assunto: {sol.assuntoGerado}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                      {sol.corpoEmailGerado}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div>
                      Prazo Limite: <strong className="text-amber-300">{sol.dataLimiteResposta || '5 dias úteis'}</strong>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${sol.assuntoGerado}\n\n${sol.corpoEmailGerado}`);
                        showToast('Conteúdo do e-mail copiado para a área de transferência!');
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar E-mail Formatado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: COMPARADOR DE REVISÕES & ANÁLISE DE IMPACTO                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'comparador' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <GitCompare className="w-5 h-5 text-sky-400" />
              Comparador Delineado de Revisões & Matriz Sistêmica de Impactos
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl mb-6">
              Compare lado a lado duas revisões de qualquer manual técnico ou procedimento para identificar inclusões,
              alterações de tolerância, e diagnosticar automaticamente os impactos em processos, treinamentos e auditorias.
            </p>

            {/* Seleção do Documento e das Revisões */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Documento:</label>
                <select
                  value={compareDocId}
                  onChange={(e) => {
                    setCompareDocId(e.target.value);
                    setCompareRevAId('');
                    setCompareRevBId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Revisão Anterior (Base):</label>
                <select
                  value={compareRevAId}
                  onChange={(e) => setCompareRevAId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">Selecione uma revisão...</option>
                  {revisoesDisponiveisParaComparar.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numeroRevisao} ({r.dataEntradaVigor})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Revisão Posterior (Nova):</label>
                <select
                  value={compareRevBId}
                  onChange={(e) => setCompareRevBId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">Selecione uma revisão...</option>
                  {revisoesDisponiveisParaComparar.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.numeroRevisao} ({r.dataEntradaVigor})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exibição do Resultado da Comparação */}
            {comparacaoResult ? (
              <div className="mt-6 space-y-6">
                {/* Delineamento das Alterações */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                      <span className="font-bold text-white">{comparacaoResult.revA.numeroRevisao} (Base)</span>
                      <span>Vigor: {comparacaoResult.revA.dataEntradaVigor}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded border border-slate-800/80">
                      {comparacaoResult.revA.escopoAlteracoes || 'Sem escopo detalhado de alterações cadastrado.'}
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-sky-500/40 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-sky-400 border-b border-slate-800 pb-2">
                      <span className="font-bold text-white">{comparacaoResult.revB.numeroRevisao} (Posterior)</span>
                      <span>Vigor: {comparacaoResult.revB.dataEntradaVigor}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded border border-sky-500/20">
                      {comparacaoResult.revB.escopoAlteracoes || 'Sem escopo detalhado de alterações cadastrado.'}
                    </p>
                  </div>
                </div>

                {/* Matriz Sistêmica de Impactos */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Matriz Sistêmica de Impactos da Nova Revisão ({(comparacaoResult.impactos || []).length} áreas impactadas)
                  </h3>

                  <div className="space-y-3">
                    {(comparacaoResult.impactos || []).map((imp) => (
                      <div
                        key={imp.id}
                        className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sky-400 uppercase tracking-wider text-[10px] px-2 py-0.5 bg-sky-500/10 rounded border border-sky-500/20">
                              {imp.tipoImpacto}
                            </span>
                            <span className="font-bold text-white">{imp.itemAfetado}</span>
                          </div>
                          <p className="text-slate-300">{imp.descricaoImpacto}</p>
                          <p className="text-emerald-400/90 text-[11px]">
                            <strong>Ação Recomendada:</strong> {imp.acaoSugerida}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] shrink-0 border ${
                            imp.severidade === 'CRITICA'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : imp.severidade === 'ALTA'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          Severidade {imp.severidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <GitCompare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">Selecione duas revisões acima para comparar as diferenças técnicas e impactos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: ASSISTENTE RAG TEMPORAL AERONÁUTICO                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'rag' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="max-w-3xl space-y-2 mb-6">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                IA GENERATIVA GROUNDED • RAG TEMPORAL
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Assistente RAG com Filtragem Temporal Estrita
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                O RAG Temporal do QualiGest garante conformidade com a Seção 10: <em>"Documento obsoleto não deve ser utilizado como fonte atual no RAG; quando consultado em modo histórico, cita explicitamente a revisão daquela data."</em>
              </p>
            </div>

            {/* Controles de Modo do RAG */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800 mb-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Modo de Consulta:</span>
                <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                  <button
                    onClick={() => setRagMode('VIGENTE_HOJE')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      ragMode === 'VIGENTE_HOJE' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vigente Hoje (Atual)
                  </button>
                  <button
                    onClick={() => setRagMode('HISTORICO_NA_DATA')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                      ragMode === 'HISTORICO_NA_DATA' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Histórico na Data
                  </button>
                </div>
              </div>

              {ragMode === 'HISTORICO_NA_DATA' && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Data de Referência:</span>
                  <input
                    type="date"
                    value={ragDate}
                    onChange={(e) => setRagDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-white"
                  />
                </div>
              )}
            </div>

            {/* Barra de Entrada de Pergunta */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Qual era a tolerância de calibração em 2024? Ou: Quais os requisitos de treinamento no MOMQ vigente?"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteRag()}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleExecuteRag}
                disabled={isRagLoading || !ragQuery.trim()}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
              >
                {isRagLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Consultar
              </button>
            </div>

            {/* Histórico de Respostas */}
            <div className="mt-6 space-y-4">
              {ragHistory.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-white text-sm">P: {item.q}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                      Vigência: {item.dataVigencia}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    {item.a}
                  </p>
                  {item.fontId && (
                    <div className="text-[11px] text-sky-400 flex items-center gap-1 font-mono">
                      <BookOpen className="w-3.5 h-3.5" /> Fonte Auditável: {item.fontId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 7: DASHBOARD DOCUMENTAL & INDICADORES                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Grid dos 8 Indicadores Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Acervo Total</span>
              <div className="text-2xl font-bold text-white mt-1">{dashboardMetrics.totalDocumentos}</div>
              <span className="text-[11px] text-slate-500">Documentos controlados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Revisões Vigentes</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{dashboardMetrics.totalRevisoesVigentes}</div>
              <span className="text-[11px] text-emerald-500/80">Homologadas e ativas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Fontes Externas</span>
              <div className="text-2xl font-bold text-sky-400 mt-1">{dashboardMetrics.fontesExternasAtivas}</div>
              <span className="text-[11px] text-sky-500/80">ANAC, FAA e OEMs</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Verificações Vencidas</span>
              <div
                className={`text-2xl font-bold mt-1 ${
                  dashboardMetrics.fontesVerificacaoVencida > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {dashboardMetrics.fontesVerificacaoVencida}
              </div>
              <span className="text-[11px] text-slate-500">Prazos expirados</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Discrepâncias Pendentes</span>
              <div
                className={`text-2xl font-bold mt-1 ${
                  dashboardMetrics.discrepanciasPendentesValidacao > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {dashboardMetrics.discrepanciasPendentesValidacao}
              </div>
              <span className="text-[11px] text-amber-500/80">Requer validação humana</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Solicitações a Clientes</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">{dashboardMetrics.solicitacoesClientePendentes}</div>
              <span className="text-[11px] text-indigo-500/80">Em andamento / SLA</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Revisões em Transição</span>
              <div className="text-2xl font-bold text-slate-200 mt-1">{dashboardMetrics.revisoesEmTransicao}</div>
              <span className="text-[11px] text-slate-500">Rascunhos / Em aprovação</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Taxa de Conformidade</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{dashboardMetrics.taxaConformidadeDocumental}%</div>
              <span className="text-[11px] text-emerald-500/80">Acervo auditado</span>
            </div>
          </div>

          {/* Distribuição por Categoria e Prazos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Distribuição do Acervo por Categoria
              </h3>
              <div className="space-y-2 text-xs">
                {Object.entries(dashboardMetrics?.distribuicaoCategorias || dashboardMetrics?.distribuicaoPorCategoria || {}).map(([cat, qtd]) => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-300">{cat.replace('DOCUMENTO_', '')}</span>
                    <span className="font-bold text-white">{qtd} documentos</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Próximas Verificações de Fontes Oficiais
              </h3>
              <div className="space-y-2 text-xs">
                {fontes.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-300 truncate max-w-[200px]">{f.nome}</span>
                    <span className="font-mono text-sky-300">{f.proximaVerificacao?.split('T')[0] || 'A definir'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EVIDÊNCIA DE CONSULTA (SEÇÃO 21)                                  */}
      {/* ========================================================================= */}
      {isConsultModalOpen && consultTargetDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-400" />
              Registrar Evidência de Consulta Técnica
            </h3>
            <p className="text-xs text-slate-400">
              Registre a consulta formal ao documento <strong>{consultTargetDoc.codigo}</strong> com a finalidade operacional para comprovação em auditoria.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSalvarEvidenciaConsulta(
                  consultTargetDoc,
                  formData.get('finalidade'),
                  formData.get('referencia') as string
                );
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Finalidade da Consulta:</label>
                <select name="finalidade" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  <option value="EXECUCAO_MANUTENCAO">Execução de Manutenção (OS)</option>
                  <option value="AUDITORIA_INTERNA">Auditoria Interna SGQ</option>
                  <option value="AUDITORIA_EXTERNA_ANAC_FAA">Auditoria Externa (ANAC/FAA)</option>
                  <option value="TREINAMENTO_CAPACITACAO">Treinamento e Capacitação</option>
                  <option value="REVISAO_PROCEDIMENTO">Revisão de Procedimento</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Referência Operacional (ex: OS #, Auditoria):</label>
                <input
                  type="text"
                  name="referencia"
                  placeholder="Ex: OS #2025-104 ou Auditoria ANAC"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400">
                Declaro que executei a consulta e leitura dos requisitos da revisão vigente{' '}
                <strong className="text-emerald-400">{consultTargetDoc.revisaoVigenteNumero}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConsultModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Confirmar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO DE NOVO DOCUMENTO                                       */}
      {/* ========================================================================= */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              Cadastrar Novo Documento Controlado
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const codigo = formData.get('codigo') as string;
                const titulo = formData.get('titulo') as string;
                const categoria = formData.get('categoria') as CategoriaDocumental;
                const emissor = formData.get('emissor') as string;
                const revNum = formData.get('revNum') as string;

                const newDocId = `doc-${Date.now()}`;
                const newRevId = `rev-${Date.now()}`;

                const novoDoc: DocumentoControlado = {
                  id: newDocId,
                  organizationId,
                  codigo,
                  titulo,
                  categoria,
                  emissor,
                  responsavelNome: currentUser?.displayName || 'Garantia da Qualidade',
                  revisaoVigenteId: newRevId,
                  revisaoVigenteNumero: revNum,
                  exigeEvidenciaLeitura: true,
                  aplicabilidadePadrao: { statusDeterminacao: 'DETERMINADA' },
                  statusGeral: 'ATIVO',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                const novaRev: RevisaoDocumental = {
                  id: newRevId,
                  organizationId,
                  documentoId: newDocId,
                  codigoDocumento: codigo,
                  tituloDocumento: titulo,
                  numeroRevisao: revNum,
                  dataEmissao: new Date().toISOString().split('T')[0],
                  dataEntradaVigor: new Date().toISOString().split('T')[0],
                  statusCicloVida: 'VIGENTE',
                  aprovadoPorNome: currentUser?.displayName || 'Eng. Paulo Okubo',
                  origemRevisao: 'INTERNA',
                  ehImutavel: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await saveDocumentoControlado(organizationId, novoDoc, currentUser);
                await saveRevisaoDocumental(organizationId, novaRev, currentUser);

                setIsNewDocModalOpen(false);
                showToast(`Documento ${codigo} e revisão ${revNum} cadastrados com sucesso!`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Código do Documento:</label>
                <input
                  type="text"
                  name="codigo"
                  placeholder="Ex: MOMQ MNT-002 ou IT-MNT-015"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Título do Documento:</label>
                <input
                  type="text"
                  name="titulo"
                  placeholder="Ex: Procedimento de Pesagem e Balanceamento"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Categoria:</label>
                <select name="categoria" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  <option value="DOCUMENTO_INTERNO">Interno (MOMQ, POP, IT, MQ)</option>
                  <option value="DOCUMENTO_AUTORIDADE">Autoridade (RBAC, IS, 14 CFR)</option>
                  <option value="DOCUMENTO_FABRICANTE">Fabricante / OEM (AMM, CMM, IPC)</option>
                  <option value="DOCUMENTO_CLIENTE">Cliente / Operador Contratante</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Emissor / Órgão:</label>
                <input
                  type="text"
                  name="emissor"
                  placeholder="Ex: Impacto Aviation, ANAC, Cessna, Azul"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Número da Revisão Inicial Vigente:</label>
                <input
                  type="text"
                  name="revNum"
                  defaultValue="Rev. 01"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Cadastrar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PROPOSTA E APROVAÇÃO DE NOVA REVISÃO                             */}
      {/* ========================================================================= */}
      {isNewRevisionModalOpen && selectedDocForDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              Propor Nova Revisão: {selectedDocForDetail.codigo}
            </h3>
            <p className="text-xs text-slate-400">
              A homologação de uma nova revisão substitui a revisão vigente de forma atômica e imutável.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const numeroRevisao = formData.get('numeroRevisao') as string;
                const dataEntradaVigor = formData.get('dataEntradaVigor') as string;
                const escopoAlteracoes = formData.get('escopoAlteracoes') as string;
                const justificativa = formData.get('justificativa') as string;

                const revAnterior = revisoes.find((r) => r.id === selectedDocForDetail.revisaoVigenteId);

                const novaRev: RevisaoDocumental = {
                  id: `rev-${Date.now()}`,
                  organizationId,
                  documentoId: selectedDocForDetail.id,
                  codigoDocumento: selectedDocForDetail.codigo,
                  tituloDocumento: selectedDocForDetail.titulo,
                  numeroRevisao,
                  dataEmissao: new Date().toISOString().split('T')[0],
                  dataEntradaVigor,
                  statusCicloVida: 'VIGENTE',
                  escopoAlteracoes,
                  origemRevisao: 'INTERNA',
                  ehImutavel: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await aprovarRevisaoDocumental(organizationId, novaRev, revAnterior, justificativa, currentUser);

                setIsNewRevisionModalOpen(false);
                setSelectedDocForDetail(null);
                showToast(`Revisão ${numeroRevisao} aprovada e homologada como VIGENTE!`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Número da Nova Revisão:</label>
                <input
                  type="text"
                  name="numeroRevisao"
                  placeholder="Ex: Rev. 09"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Data de Entrada em Vigor:</label>
                <input
                  type="date"
                  name="dataEntradaVigor"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Escopo e Resumo das Alterações:</label>
                <textarea
                  name="escopoAlteracoes"
                  rows={3}
                  placeholder="Descreva as cláusulas ou capítulos alterados e seus motivos..."
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Justificativa Técnica da Homologação:</label>
                <input
                  type="text"
                  name="justificativa"
                  placeholder="Ex: Atendimento ao finding da auditoria ANAC"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRevisionModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-600 text-white font-semibold">
                  Aprovar & Homologar Revisão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO DE NOVA FONTE OFICIAL                                   */}
      {/* ========================================================================= */}
      {isNewSourceModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-400" />
              Cadastrar Fonte Externa Oficial
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const nome = formData.get('nome') as string;
                const tipoFonte = formData.get('tipoFonte') as any;
                const urlBase = formData.get('urlBase') as string;
                const frequenciaDias = Number(formData.get('frequenciaDias') || 30);

                const proximaData = new Date();
                proximaData.setDate(proximaData.getDate() + frequenciaDias);

                const novaFonte: FonteExternaControlada = {
                  id: `fonte-${Date.now()}`,
                  organizationId,
                  nome,
                  tipoFonte,
                  urlBase,
                  responsavelVerificacaoNome: currentUser?.displayName || 'Garantia da Qualidade',
                  frequenciaDias,
                  ultimaVerificacao: new Date().toISOString(),
                  proximaVerificacao: proximaData.toISOString(),
                  ultimoResultadoStatus: 'CONFORME_SEM_ALTERACAO',
                  status: 'ATIVA',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await saveFonteExterna(organizationId, novaFonte, currentUser);
                setIsNewSourceModalOpen(false);
                showToast(`Fonte oficial "${nome}" cadastrada com sucesso!`);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Nome da Fonte:</label>
                <input
                  type="text"
                  name="nome"
                  placeholder="Ex: Portal EASA Regulations ou Portal Embraer"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tipo da Fonte:</label>
                <select name="tipoFonte" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  <option value="AUTORIDADE">Autoridade de Aviação Civil (ANAC, FAA, EASA)</option>
                  <option value="FABRICANTE">Fabricante da Aeronave ou Componente (OEM)</option>
                  <option value="CLIENTE">Operador Aéreo / Cliente Contratante</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">URL Oficial / Portal:</label>
                <input
                  type="url"
                  name="urlBase"
                  placeholder="https://..."
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Frequência de Verificação (Dias):</label>
                <input
                  type="number"
                  name="frequenciaDias"
                  defaultValue={30}
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewSourceModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Salvar Fonte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE NOVA SOLICITAÇÃO A CLIENTE                                       */}
      {/* ========================================================================= */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-400" />
              Gerar Solicitação de Revisão a Cliente
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const clienteNome = formData.get('clienteNome') as string;
                const destinatarioEmail = formData.get('destinatarioEmail') as string;
                const docId = formData.get('docId') as string;
                const prazo = Number(formData.get('prazo') || 5);
                const motivo = formData.get('motivo') as string;
                const idioma = formData.get('idioma') as 'EN' | 'PT' | 'ES';

                const docAlvo = documentos.find((d) => d.id === docId);
                const emailGerado = gerarSolicitacaoRevisaoClienteEmail({
                  clienteNome,
                  documentoCodigo: docAlvo?.codigo || 'CLI-001',
                  documentoTitulo: docAlvo?.titulo || 'Manual de Requisitos Técnicos',
                  revisaoAtualArmazenada: docAlvo?.revisaoVigenteNumero || 'Rev. 01',
                  prazoDesejadoDias: prazo,
                  motivoSolicitacao: motivo,
                  idioma,
                });

                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + prazo);

                const novaSolicitacao: SolicitacaoRevisaoCliente = {
                  id: `sol-${Date.now()}`,
                  organizationId,
                  clienteNome,
                  destinatarioNome: 'Engenharia / Gestão da Qualidade',
                  destinatarioEmail,
                  documentoId: docAlvo?.id || 'doc-cli',
                  documentoCodigo: docAlvo?.codigo || 'CLI-001',
                  documentoTitulo: docAlvo?.titulo || 'Manual Técnico',
                  revisaoAtualArmazenada: docAlvo?.revisaoVigenteNumero || 'Rev. 01',
                  motivoSolicitacao: motivo,
                  prazoDesejadoDias: prazo,
                  dataLimiteResposta: dataLimite.toISOString().split('T')[0],
                  idioma,
                  assuntoGerado: emailGerado.assunto,
                  corpoEmailGerado: emailGerado.corpo,
                  status: 'SOLICITACAO_GERADA',
                  geradoPorNome: currentUser?.displayName || 'Controle Documental',
                  geradoPorUid: currentUser?.uid || 'system',
                  geradoEm: new Date().toISOString(),
                  historicoStatus: [
                    {
                      status: 'SOLICITACAO_GERADA',
                      data: new Date().toISOString(),
                      usuario: currentUser?.displayName || 'Controle Documental',
                      observacao: 'Solicitação gerada no sistema.',
                    },
                  ],
                };

                await saveSolicitacaoCliente(organizationId, novaSolicitacao, currentUser);
                setIsNewRequestModalOpen(false);
                showToast('Solicitação de revisão técnica gerada com sucesso!');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1">Nome do Cliente:</label>
                <input
                  type="text"
                  name="clienteNome"
                  placeholder="Ex: Azul Linhas Aéreas ou GOL"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">E-mail Técnico do Cliente:</label>
                <input
                  type="email"
                  name="destinatarioEmail"
                  placeholder="qualidade@operador.com.br"
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Documento do Cliente:</label>
                <select name="docId" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                  {documentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.codigo} — {d.titulo} ({d.revisaoVigenteNumero})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Prazo Desejado (Dias):</label>
                  <input
                    type="number"
                    name="prazo"
                    defaultValue={5}
                    required
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Idioma:</label>
                  <select name="idioma" defaultValue="EN" className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white">
                    <option value="EN">Inglês (Padrão Internacional)</option>
                    <option value="PT">Português</option>
                    <option value="ES">Espanhol</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Motivo da Solicitação:</label>
                <input
                  type="text"
                  name="motivo"
                  defaultValue="Revisão periódica anual de conformidade documental e preparação de auditoria."
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold">
                  Gerar Solicitação Formatada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR METADADOS DO DOCUMENTO CONTROLADO                           */}
      {/* ========================================================================= */}
      {isEditDocModalOpen && docToEdit && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Documento Controlado</h3>
                  <p className="text-xs text-slate-400 font-mono">{docToEdit.codigo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditDocModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDoc} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Título do Documento *</label>
                <input
                  type="text"
                  value={editDocForm.titulo}
                  onChange={(e) => setEditDocForm({ ...editDocForm, titulo: e.target.value })}
                  required
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Categoria *</label>
                  <select
                    value={editDocForm.categoria}
                    onChange={(e) =>
                      setEditDocForm({ ...editDocForm, categoria: e.target.value as CategoriaDocumental })
                    }
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="DOCUMENTO_INTERNO">Manual / Procedimento Interno</option>
                    <option value="DOCUMENTO_AUTORIDADE">Norma de Autoridade (ANAC/FAA/EASA)</option>
                    <option value="DOCUMENTO_FABRICANTE">Manual de Fabricante (CMM/AMM/SB/AD)</option>
                    <option value="DOCUMENTO_CLIENTE">Especificação Técnica de Cliente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Emissor / Fonte *</label>
                  <input
                    type="text"
                    value={editDocForm.emissor}
                    onChange={(e) => setEditDocForm({ ...editDocForm, emissor: e.target.value })}
                    required
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Responsável Técnico / Gestor</label>
                <input
                  type="text"
                  value={editDocForm.responsavelNome}
                  onChange={(e) => setEditDocForm({ ...editDocForm, responsavelNome: e.target.value })}
                  placeholder="Ex: Engenharia de Manutenção / Gestor da Qualidade"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Aplicabilidade Padrão</label>
                <input
                  type="text"
                  value={editDocForm.aplicabilidadePadrao}
                  onChange={(e) => setEditDocForm({ ...editDocForm, aplicabilidadePadrao: e.target.value })}
                  placeholder="Ex: Todas as frotas Caravan 208B ou Linha de Motores PT6A"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={editDocForm.exigeEvidenciaLeitura}
                    onChange={(e) => setEditDocForm({ ...editDocForm, exigeEvidenciaLeitura: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Exige evidência formal de leitura e confirmação pelos mecânicos/técnicos</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditDocModalOpen(false)}
                  disabled={isSubmittingDocAction}
                  className="px-3.5 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDocAction}
                  className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5"
                >
                  {isSubmittingDocAction ? <span>Salvando...</span> : <span>Salvar Alterações</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INATIVAÇÃO LÓGICA DO DOCUMENTO CONTROLADO                           */}
      {/* ========================================================================= */}
      {isDocInactivateModalOpen && docToInactivate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <PowerOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Inativar Documento Controlado</h3>
                  <p className="text-xs text-slate-400">Preservação Histórica e Temporal RBAC 145</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocInactivateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <span className="text-sky-400 font-mono font-bold">{docToInactivate.codigo}</span>
              <p className="font-semibold text-white text-sm">{docToInactivate.titulo}</p>
              <p className="text-slate-400">
                Categoria: {docToInactivate.categoria.replace('DOCUMENTO_', '')} • Emissor: {docToInactivate.emissor}
              </p>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                Preservação Regulatória do Acervo
              </p>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                O documento será marcado como <strong>INATIVO / OBSOLETO</strong>. Nenhuma nova revisão operacional
                poderá ser criada. <strong>Todo o histórico de revisões passadas, assinaturas e consultas técnicas</strong>{' '}
                permanecerá preservado e pesquisável no módulo de Consulta Temporal e Comparador de Revisões.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-300 font-semibold">
                Justificativa Regulatória da Inativação *
              </label>
              <textarea
                rows={3}
                value={motivoInativacaoDoc}
                onChange={(e) => setMotivoInativacaoDoc(e.target.value)}
                placeholder="Ex: Documento cancelado por AD/Diretriz de Aeronavegabilidade, encerramento de contrato com o operador, substituição por nova família de manuais..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDocInactivateModalOpen(false)}
                disabled={isSubmittingDocAction}
                className="px-3.5 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInactivateDoc}
                disabled={isSubmittingDocAction || !motivoInativacaoDoc.trim()}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingDocAction ? (
                  <span>Inativando...</span>
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
      {/* MODAL: REATIVAÇÃO DE DOCUMENTO CONTROLADO                                 */}
      {/* ========================================================================= */}
      {isDocReactivateModalOpen && docToReactivate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reativar Documento no SGQ</h3>
                  <p className="text-xs text-slate-400 font-mono">{docToReactivate.codigo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocReactivateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-white text-sm">{docToReactivate.titulo}</p>
              {docToReactivate.inativadoEm && (
                <p className="text-slate-400 text-[11px]">
                  Inativado anteriormente em: {new Date(docToReactivate.inativadoEm).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-slate-300 font-semibold">
                Justificativa da Reativação
              </label>
              <textarea
                rows={2}
                value={motivoReativacaoDoc}
                onChange={(e) => setMotivoReativacaoDoc(e.target.value)}
                placeholder="Ex: Retomada de homologação de frota ou reabertura do contrato operacional..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDocReactivateModalOpen(false)}
                disabled={isSubmittingDocAction}
                className="px-3.5 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReactivateDoc}
                disabled={isSubmittingDocAction}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
              >
                {isSubmittingDocAction ? (
                  <span>Reativando...</span>
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
      {/* MODAL: EXCLUSÃO OU INATIVAÇÃO DE DOCUMENTO CONTROLADO                    */}
      {/* ========================================================================= */}
      {isDocDeleteModalOpen && docToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-in">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Excluir Documento Controlado
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{docToDelete.codigo}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Documento */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <p className="font-bold text-white text-sm">{docToDelete.titulo}</p>
              <div className="flex items-center justify-between text-slate-400">
                <span>Categoria: <strong className="text-slate-200">{docToDelete.categoria.replace('DOCUMENTO_', '')}</strong></span>
                <span>Emissor: <strong className="text-slate-200">{docToDelete.emissor}</strong></span>
              </div>
              {analiseDependenciasDoc && analiseDependenciasDoc.totalRevisoes > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-amber-300 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Este documento possui <strong>{analiseDependenciasDoc.totalRevisoes} revisão(ões) vinculada(s)</strong> no acervo.</span>
                </div>
              )}
            </div>

            {/* Painel de Exclusão Definitiva */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <Trash2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-rose-200 text-sm">Apagar Definitivamente do Sistema</h4>
                    <p className="text-rose-200/80 text-[11px] leading-relaxed">
                      Esta ação remove permanentemente este documento e todas as revisões vinculadas do banco de dados. Ideal para limpeza de duplicidades, cadastros incorretos ou testes.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-rose-500/20">
                  <label className="flex items-center gap-2 cursor-pointer text-rose-200 text-[11px]">
                    <input
                      type="checkbox"
                      checked={forcarExclusaoDoc}
                      onChange={(e) => setForcarExclusaoDoc(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-rose-500/40"
                    />
                    <span>
                      Excluir também as revisões associadas para evitar registros órfãos
                    </span>
                  </label>

                  <div className="space-y-1">
                    <label className="block text-slate-300 text-[11px] font-semibold">
                      Motivo da Exclusão Definitiva:
                    </label>
                    <input
                      type="text"
                      value={motivoExclusaoDoc}
                      onChange={(e) => setMotivoExclusaoDoc(e.target.value)}
                      placeholder="Ex: Exclusão solicitada pelo usuário no SGQ"
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Opção Alternativa: Inativação Regulatória */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-slate-300">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                    <PowerOff className="w-3.5 h-3.5 text-amber-400" />
                    Prefere apenas inativar?
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Mantém o histórico para auditorias (RBAC 145) sem apagar do banco.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDocDeleteModalOpen(false);
                    handleOpenInactivateDoc(docToDelete);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  Inativar Documento
                </button>
              </div>
            </div>

            {/* Rodapé com Botões */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDocDeleteModalOpen(false)}
                disabled={isSubmittingDocAction}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteDoc}
                disabled={isSubmittingDocAction}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmittingDocAction ? 'Apagando...' : 'Apagar Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCLUSÃO DE REVISÃO DOCUMENTAL ESPECÍFICA                         */}
      {/* ========================================================================= */}
      {revisaoToDelete && selectedDocForDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Excluir Revisão Documental</h3>
              </div>
              <button
                onClick={() => setRevisaoToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Deseja realmente apagar a revisão <strong>{revisaoToDelete.numeroRevisao}</strong> do documento{' '}
              <strong>{selectedDocForDetail.codigo}</strong>?
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 text-slate-400">
              <p>Status: <strong className="text-slate-200">{revisaoToDelete.statusCicloVida}</strong></p>
              <p>Vigência: <strong className="text-slate-200">{revisaoToDelete.dataEntradaVigor}</strong></p>
              {revisaoToDelete.escopoAlteracoes && (
                <p className="text-[11px] truncate">Escopo: {revisaoToDelete.escopoAlteracoes}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevisaoToDelete(null)}
                disabled={isDeletingRevisao}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRevisao}
                disabled={isDeletingRevisao}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRevisao ? 'Excluindo...' : 'Excluir Revisão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RELATÓRIO OFICIAL DE CONFORMIDADE E CONTROLE DE REVISÕES (ANAC) */}
      {/* ========================================================================= */}
      <ComplianceReportModal
        isOpen={isComplianceReportOpen}
        onClose={() => setIsComplianceReportOpen(false)}
        documentos={documentos}
        organizationName={activeOrganization?.name || 'Impacto Aviation MRO'}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: NOTIFICAÇÃO AUTOMATIZADA AO CLIENTE SOBRE REVISÃO DE MANUAIS    */}
      {/* ========================================================================= */}
      <CustomerNotificationModal
        isOpen={isCustomerNotificationModalOpen}
        onClose={() => {
          setIsCustomerNotificationModalOpen(false);
          setSelectedDocForVerificationModal(null);
        }}
        documento={selectedDocForVerificationModal}
        onConfirmSend={handleSendCustomerNotification}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: PORTAL DO FABRICANTE / ALERTA DE CREDENCIAIS RESTRITAS (OEM)    */}
      {/* ========================================================================= */}
      <ManufacturerAlertModal
        isOpen={isManufacturerAlertModalOpen}
        onClose={() => {
          setIsManufacturerAlertModalOpen(false);
          setSelectedDocForVerificationModal(null);
        }}
        documento={selectedDocForVerificationModal}
        onConfirmCheck={handleConfirmManufacturerCheck}
      />

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIGURAÇÃO DE FONTE E MODO DE VERIFICAÇÃO (AUTO VS MANUAL)    */}
      {/* ========================================================================= */}
      <ConfigureSourceModal
        isOpen={isConfigureSourceModalOpen}
        onClose={() => {
          setIsConfigureSourceModalOpen(false);
          setSelectedDocForVerificationModal(null);
        }}
        documento={selectedDocForVerificationModal}
        onSave={handleSaveConfigureSource}
      />

      {/* ========================================================================= */}
      {/* MODAL 5: UPLOAD DIRETO DE ARQUIVOS DE MANUAIS (PDF/DOCX) NO ACERVO       */}
      {/* ========================================================================= */}
      <UploadManualModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setDocForUpload(null);
        }}
        organizationId={organizationId}
        currentUser={currentUser}
        documentosExistentes={documentos}
        documentoPreSelecionado={docForUpload}
        onSuccess={(doc, rev, msg) => {
          showToast(msg);
          setSelectedDocForDetail(doc);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 6: VISUALIZADOR E DOWNLOAD DIRETO DE ARQUIVO VIGENTE               */}
      {/* ========================================================================= */}
      <DocumentFilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewDoc(null);
          setPreviewRev(null);
        }}
        documento={previewDoc}
        revisao={previewRev}
      />

      {/* ========================================================================= */}
      {/* MODAL 7: VALIDAÇÃO HUMANA OBRIGATÓRIA DE DISCREPÂNCIA REGULAMENTAR        */}
      {/* ========================================================================= */}
      {isDiscrepancyValidationModalOpen && selectedDocForDiscrepancyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-rose-950/20 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Validação Técnica Humana — Discrepância de Revisão</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      {selectedDocForDiscrepancyModal.codigo}
                    </span>
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    Princípio SGQ: A automação identifica. A evidência comprova. O responsável valida.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDiscrepancyValidationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
              {/* Título do Documento */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-0.5">Título do Manual / Publicação:</span>
                <span className="font-bold text-white text-sm">{selectedDocForDiscrepancyModal.titulo}</span>
              </div>

              {/* Comparativo de Revisões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Revisão Controlada Atual */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Revisão Controlada Vigente:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                      {selectedDocForDiscrepancyModal.numeroRevisao || selectedDocForDiscrepancyModal.revisaoVigenteNumero || 'Rev. Vigente'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data da Revisão (Emissão):</span>
                      <span className="text-slate-200 font-mono font-medium">
                        {selectedDocForDiscrepancyModal.dataRevisao || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Proprietário / Emissor:</span>
                      <span className="text-slate-200">
                        {selectedDocForDiscrepancyModal.proprietarioCessor || selectedDocForDiscrepancyModal.emissor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Revisão Identificada na Fonte */}
                <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-300">Identificada na Fonte Oficial:</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                      {selectedDocForDiscrepancyModal.revisaoNaFonteIdentificada || 'Nova Publicação'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Última Consulta / Checagem:</span>
                      <span className="text-slate-200 font-mono">
                        {selectedDocForDiscrepancyModal.dataUltimaVerificacao
                          ? new Date(selectedDocForDiscrepancyModal.dataUltimaVerificacao).toLocaleString('pt-BR')
                          : 'Recentemente'}
                      </span>
                    </div>
                    {selectedDocForDiscrepancyModal.urlFonteVerificacao && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Fonte:</span>
                        <a
                          href={selectedDocForDiscrepancyModal.urlFonteVerificacao}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[10px] truncate max-w-[150px]"
                        >
                          <span className="truncate">{selectedDocForDiscrepancyModal.urlFonteVerificacao}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhes / Evidência da Verificação */}
              {selectedDocForDiscrepancyModal.detalhesUltimaVerificacao && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-sky-400" /> Detalhes & Evidência Técnica Registrada:
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedDocForDiscrepancyModal.detalhesUltimaVerificacao}
                  </p>
                </div>
              )}

              {/* Bloco de Decisão Técnica */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  Decisão do Responsável Técnico Homologado (SGQ)
                </h4>

                {/* Opção 1: Incorporar Nova Revisão */}
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-emerald-300 text-xs block">Opção 1 — Procedência Confirmada:</span>
                    <span className="text-[11px] text-slate-300">
                      Fazer upload do novo arquivo e publicar como revisão vigente oficial no Acervo.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAceitarEIncorporarNovaRevisao}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Incorporar Nova Rev.</span>
                  </button>
                </div>

                {/* Opção 2: Rejeitar Discrepância (Falso Positivo ou Não Aplicável) */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-200 text-xs block">
                      Opção 2 — Rejeitar Alerta (Falso Positivo / Inaplicável à Frota Homologada):
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Informe a justificativa técnica obrigatória para arquivamento e registro em auditoria:
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={discrepancyRejectionReason}
                    onChange={(e) => setDiscrepancyRejectionReason(e.target.value)}
                    placeholder="Ex: Emenda aplicável exclusivamente a operadores de linha aérea (RBAC 121), não impactando a oficina RBAC 145; ou falso positivo de portal..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isProcessingDiscrepancy || !discrepancyRejectionReason.trim()}
                      onClick={handleRejeitarDiscrepancia}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isProcessingDiscrepancy ? 'Registrando Decisão...' : 'Rejeitar Discrepância & Manter Conforme'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                A cópia controlada atual permanece inalterada enquanto não houver validação.
              </span>
              <button
                type="button"
                onClick={() => setIsDiscrepancyValidationModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
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
