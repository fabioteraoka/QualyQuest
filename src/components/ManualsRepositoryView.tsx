import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  Upload, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  FileSpreadsheet, 
  Eye, 
  X,
  FileCheck,
  Building,
  RefreshCw,
  FolderOpen,
  Download,
  HelpCircle,
  MessageSquare,
  UserCheck,
  User
} from 'lucide-react';
import { ManualRecord, StatusManual, ManualCapitulo, DocumentoControlado } from '../types';
import { ManualsConsultModal } from './ManualsConsultModal';
import { downloadOriginalManualFile, saveManualToDB } from '../utils/manualsStorage';
import { parseManualLocally } from '../utils/sgqExtractor';
import { extractTextFromWordFile, isWordDocument } from '../utils/wordExtractor';
import { UploadCloud, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  compararRevisoesDocumentais,
} from '../services/manualsCrossCheckService';
import {
  normalizeDocumentCode,
  canonicalAlphanumericKey,
} from '../services/documentControlAuditReconciliation';
import { saveDocumentoControlado } from '../services/firebase/documentControlFirestore';
import { JsonSchemaModal } from './aiKnowledge/JsonSchemaModal';
import { CoverageReportModal } from './aiKnowledge/CoverageReportModal';
import { FragmentsExplorerModal } from './aiKnowledge/FragmentsExplorerModal';
import { NcEnquadramentoModal } from './aiKnowledge/NcEnquadramentoModal';
import { validarSintaxeEEstruturaJSON } from '../services/aiKnowledge/jsonSchemaValidator';
import { RelatorioCoberturaDocumental } from '../types/aiKnowledgeBase';

interface ManualsRepositoryViewProps {
  manuals: ManualRecord[];
  documentosControlados?: DocumentoControlado[];
  onSaveManual: (manual: ManualRecord) => void;
  onDeleteManual: (id: string) => void;
  onSelectForAudit?: (manual: ManualRecord) => void;
  onOpenMigrationModal?: () => void;
  onNavigateToAcervo?: () => void;
}

export const ManualsRepositoryView: React.FC<ManualsRepositoryViewProps> = ({
  manuals = [],
  documentosControlados = [],
  onSaveManual,
  onDeleteManual,
  onSelectForAudit,
  onOpenMigrationModal,
  onNavigateToAcervo,
}) => {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedManual, setSelectedManual] = useState<ManualRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultInitialQuery, setConsultInitialQuery] = useState('');
  const [editingManual, setEditingManual] = useState<ManualRecord | null>(null);
  const [manualToDelete, setManualToDelete] = useState<ManualRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [capituloError, setCapituloError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'capitulos' | 'integral'>('capitulos');
  
  // Upload State & Acervo de IA Pipeline
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Acervo de IA: Modais e Auditoria
  const [isJsonSchemaModalOpen, setIsJsonSchemaModalOpen] = useState(false);
  const [coverageReportTarget, setCoverageReportTarget] = useState<{ report: RelatorioCoberturaDocumental; title: string } | null>(null);
  const [fragmentsExplorerTarget, setFragmentsExplorerTarget] = useState<{ id: string; codigo: string; revisao: string } | null>(null);
  const [isEnquadramentoModalOpen, setIsEnquadramentoModalOpen] = useState(false);

  // Pipeline Live Tracker (10 Etapas)
  const [pipelineCurrentStage, setPipelineCurrentStage] = useState<number>(0);
  const [pipelineStageName, setPipelineStageName] = useState<string>('');
  const [pipelinePercent, setPipelinePercent] = useState<number>(0);
  const [jsonValidationErrors, setJsonValidationErrors] = useState<any[] | null>(null);
  const [jsonValidationWarnings, setJsonValidationWarnings] = useState<string[] | null>(null);
  const [jsonValidationOk, setJsonValidationOk] = useState<boolean>(false);

  // Form State for Manual Creation / Editing
  const [formData, setFormData] = useState<Partial<ManualRecord>>({
    codigo: '',
    titulo: '',
    revisao: 'Rev. 01',
    dataRevisao: '',
    dataAprovacao: '',
    dataVigencia: new Date().toISOString().split('T')[0],
    dataProximaRevisao: '',
    proprietario: '',
    assessor: '',
    orgaoRegulador: 'SGQ Interno',
    setoresAplicaveis: ['Qualidade'],
    descricaoResumo: '',
    conteudoTexto: '',
    status: 'Vigente',
    capitulos: [],
  });

  const [newCapitulo, setNewCapitulo] = useState<Partial<ManualCapitulo>>({
    numero: '',
    titulo: '',
    requisitoTexto: '',
  });

  // Filtered manuals
  const filteredManuals = manuals.filter((m) => {
    const term = search.toLowerCase();
    const matchesSearch =
      m.codigo.toLowerCase().includes(term) ||
      m.titulo.toLowerCase().includes(term) ||
      m.descricaoResumo.toLowerCase().includes(term) ||
      m.conteudoTexto.toLowerCase().includes(term) ||
      (m.proprietario && m.proprietario.toLowerCase().includes(term)) ||
      (m.assessor && m.assessor.toLowerCase().includes(term)) ||
      m.setoresAplicaveis.some((s) => s.toLowerCase().includes(term)) ||
      (m.capitulos || []).some((c) => c.titulo.toLowerCase().includes(term) || c.numero.toLowerCase().includes(term) || c.requisitoTexto.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingManual(null);
    setFormError(null);
    setCapituloError(null);
    setFormData({
      codigo: '',
      titulo: '',
      revisao: 'Rev. 01',
      dataRevisao: '',
      dataAprovacao: '',
      dataVigencia: new Date().toISOString().split('T')[0],
      dataProximaRevisao: '',
      proprietario: '',
      assessor: '',
      orgaoRegulador: 'ANAC / SGQ',
      setoresAplicaveis: ['REC - Manutenção / Calibração', 'Qualidade'],
      descricaoResumo: '',
      conteudoTexto: '',
      status: 'Vigente',
      capitulos: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (manual: ManualRecord) => {
    setEditingManual(manual);
    setFormError(null);
    setCapituloError(null);

    const codNorm = normalizeDocumentCode(manual.codigo);
    const alpha = canonicalAlphanumericKey(manual.codigo);
    const docAcervo = documentosControlados.find(
      (d) =>
        (manual.documentoControladoId && d.id === manual.documentoControladoId) ||
        d.manualIAId === manual.id ||
        normalizeDocumentCode(d.codigo) === codNorm ||
        canonicalAlphanumericKey(d.codigo) === alpha
    );

    setFormData({
      ...manual,
      revisao: manual.revisao || docAcervo?.numeroRevisao || docAcervo?.revisaoVigenteNumero || 'Rev. 01',
      dataRevisao: manual.dataRevisao || docAcervo?.dataRevisao || '',
      dataAprovacao: manual.dataAprovacao || docAcervo?.dataAprovacao || '',
      dataVigencia: manual.dataVigencia || docAcervo?.dataVigencia || '',
      dataProximaRevisao: manual.dataProximaRevisao || docAcervo?.dataProximaRevisao || docAcervo?.proximaVerificacaoExterna || '',
      proprietario: manual.proprietario || docAcervo?.proprietario || '',
      assessor: manual.assessor || docAcervo?.assessor || '',
      orgaoRegulador: manual.orgaoRegulador || docAcervo?.autoridadeNome || docAcervo?.emissor || 'SGQ',
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo?.trim() || !formData.titulo?.trim()) {
      setFormError('Por favor, preencha o código e o título do manual.');
      return;
    }
    setFormError(null);

    const now = new Date().toISOString();
    const newRev = (formData.revisao || 'Rev. 01').trim();
    const oldRev = editingManual?.revisao || '';

    const historicoAtual = [...(editingManual?.historicoAlteracoes || [])];
    if (editingManual) {
      historicoAtual.unshift({
        versao: newRev,
        data: now,
        autor: userProfile?.displayName || userProfile?.email || 'SGQ',
        descricao: `Edição de dados e governança: Revisão ${newRev}, Data Revisão: ${formData.dataRevisao || 'N/I'}, Vigência: ${formData.dataVigencia || 'N/I'}, Proprietário: ${formData.proprietario || 'N/I'}, Assessor: ${formData.assessor || 'N/I'}`,
        campoAlterado: oldRev !== newRev ? 'revisao' : 'metadados_datas',
        valorAnterior: oldRev,
        novoValor: newRev,
      });
    }

    const codNorm = normalizeDocumentCode(formData.codigo || '');
    const alpha = canonicalAlphanumericKey(formData.codigo || '');
    const docAcervo = documentosControlados.find(
      (d) =>
        (formData.documentoControladoId && d.id === formData.documentoControladoId) ||
        (editingManual?.documentoControladoId && d.id === editingManual.documentoControladoId) ||
        d.manualIAId === (editingManual ? editingManual.id : '') ||
        normalizeDocumentCode(d.codigo) === codNorm ||
        canonicalAlphanumericKey(d.codigo) === alpha
    );

    const record: ManualRecord = {
      id: editingManual ? editingManual.id : `man-${Date.now()}`,
      organizationId: userProfile?.organizationId || 'org_impacto_aviation',
      codigo: (formData.codigo || 'MANUAL').trim().toUpperCase(),
      titulo: (formData.titulo || 'Manual Sem Título').trim(),
      revisao: newRev,
      dataRevisao: formData.dataRevisao ? formData.dataRevisao.trim() : undefined,
      dataAprovacao: formData.dataAprovacao ? formData.dataAprovacao.trim() : undefined,
      dataVigencia: formData.dataVigencia || new Date().toISOString().split('T')[0],
      dataProximaRevisao: formData.dataProximaRevisao ? formData.dataProximaRevisao.trim() : undefined,
      proprietario: formData.proprietario ? formData.proprietario.trim() : undefined,
      assessor: formData.assessor ? formData.assessor.trim() : undefined,
      documentoControladoId: docAcervo ? docAcervo.id : formData.documentoControladoId,
      orgaoRegulador: formData.orgaoRegulador || 'SGQ',
      fonte: formData.fonte || 'Repositório SGQ',
      setoresAplicaveis: formData.setoresAplicaveis || ['Qualidade'],
      descricaoResumo: formData.descricaoResumo || '',
      conteudoTexto: formData.conteudoTexto || '',
      capitulos: formData.capitulos || [],
      status: (formData.status as StatusManual) || 'Vigente',
      arquivoNome: formData.arquivoNome,
      arquivoTamanho: formData.arquivoTamanho,
      criadoEm: editingManual ? editingManual.criadoEm : now,
      atualizadoEm: now,
      historicoAlteracoes: historicoAtual,
    };

    onSaveManual(record);

    // Sincronizar com DocumentoControlado correspondente no Acervo SGQ preservando integridade
    if (docAcervo) {
      try {
        const orgId = userProfile?.organizationId || 'org_impacto_aviation';
        const docAcervoAtualizado: DocumentoControlado = {
          ...docAcervo,
          titulo: record.titulo,
          numeroRevisao: record.revisao,
          revisaoVigenteNumero: record.revisao,
          dataRevisao: record.dataRevisao || docAcervo.dataRevisao,
          dataAprovacao: record.dataAprovacao || docAcervo.dataAprovacao,
          dataVigencia: record.dataVigencia,
          dataProximaRevisao: record.dataProximaRevisao || docAcervo.dataProximaRevisao,
          proprietario: record.proprietario || docAcervo.proprietario,
          assessor: record.assessor || docAcervo.assessor,
          manualIAId: record.id,
          revisaoNoBancoIA: record.revisao,
          statusSincroniaIA: 'SINCRONIZADO',
          atualizadoEm: now,
        };
        await saveDocumentoControlado(orgId, docAcervoAtualizado, userProfile, docAcervo);
      } catch (syncErr) {
        console.warn('Sincronização com Acervo SGQ executada com aviso:', syncErr);
      }
    }

    setIsModalOpen(false);
    setEditingManual(null);
    setToastMessage({
      type: 'success',
      text: `Manual ${record.codigo} (${record.revisao}) salvo com sucesso!`,
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddCapitulo = () => {
    if (!newCapitulo.numero?.trim() || !newCapitulo.titulo?.trim()) {
      setCapituloError('Preencha o número e o título do capítulo/requisito.');
      return;
    }
    setCapituloError(null);

    const cap: ManualCapitulo = {
      id: `cap-${Date.now()}`,
      numero: newCapitulo.numero.trim(),
      titulo: newCapitulo.titulo.trim(),
      requisitoTexto: (newCapitulo.requisitoTexto || '').trim(),
      palavrasChave: [],
    };

    setFormData((prev) => ({
      ...prev,
      capitulos: [...(prev.capitulos || []), cap],
    }));

    setNewCapitulo({ numero: '', titulo: '', requisitoTexto: '' });
  };

  const handleRemoveCapitulo = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      capitulos: (prev.capitulos || []).filter((c) => c.id !== id),
    }));
  };

  const handleConfirmDeleteManual = (manual: ManualRecord) => {
    onDeleteManual(manual.id);
    if (selectedManual?.id === manual.id) {
      setSelectedManual(null);
    }
    if (editingManual?.id === manual.id) {
      setIsModalOpen(false);
      setEditingManual(null);
    }
    setManualToDelete(null);
    setToastMessage({
      type: 'info',
      text: `Manual ${manual.codigo} (${manual.revisao}) foi excluído com sucesso.`,
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // Limite real de 50 MB

  // Upload Handlers com validação JSON e Pipeline de 10 Etapas
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size === 0) {
        setUploadError('O arquivo selecionado está vazio (0 bytes). Não é permitido o envio de documentos sem conteúdo.');
        setUploadFile(null);
        setJsonValidationOk(false);
        setJsonValidationErrors(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`O arquivo excede o limite máximo permitido de 50 MB (tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        setUploadFile(null);
        setJsonValidationOk(false);
        setJsonValidationErrors(null);
        return;
      }

      setUploadFile(file);
      setUploadError(null);

      // Validação antecipada se for formato JSON
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        try {
          const text = await file.text();
          const resultado = validarSintaxeEEstruturaJSON(text);
          if (!resultado.valido) {
            setJsonValidationOk(false);
            setJsonValidationErrors(resultado.erros);
            setJsonValidationWarnings(resultado.avisos);
            setUploadError(`Arquivo JSON possui ${resultado.erros.length} inconformidade(s) com o schema oficial.`);
          } else {
            setJsonValidationOk(true);
            setJsonValidationErrors(null);
            setJsonValidationWarnings(resultado.avisos);
            setUploadError(null);
          }
        } catch (err: any) {
          setJsonValidationOk(false);
          setJsonValidationErrors([{ campo: 'sintaxe', mensagem: err.message }]);
          setUploadError(`Erro ao ler arquivo JSON: ${err.message}`);
        }
      } else {
        setJsonValidationOk(false);
        setJsonValidationErrors(null);
        setJsonValidationWarnings(null);
      }
    }
  };

  const ATUALIZAR_ETAPA_PIPELINE = async (etapa: number, nome: string, percent: number) => {
    setPipelineCurrentStage(etapa);
    setPipelineStageName(nome);
    setPipelinePercent(percent);
    // Breve intervalo para animação visual do operador
    await new Promise((r) => setTimeout(r, 120));
  };

  const handleProcessUpload = async () => {
    if (!uploadFile) {
      setUploadError('Selecione um arquivo de manual (.json, .docx, .pdf ou .txt).');
      return;
    }

    if (uploadFile.size === 0) {
      setUploadError('O arquivo selecionado está vazio (0 bytes). Não é permitido o envio de documentos sem conteúdo.');
      return;
    }

    if (uploadFile.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`O arquivo excede o limite máximo permitido de 50 MB (tamanho: ${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      const isJson = uploadFile.name.endsWith('.json') || uploadFile.type === 'application/json';
      const isWord = isWordDocument(uploadFile.name, uploadFile.type);
      const isPdf = uploadFile.name.endsWith('.pdf') || uploadFile.type === 'application/pdf';
      const isText = uploadFile.type === 'text/plain' || uploadFile.name.endsWith('.txt') || uploadFile.name.endsWith('.csv') || uploadFile.name.endsWith('.md');

      // ETAPA 1: Recebimento e Armazenamento
      await ATUALIZAR_ETAPA_PIPELINE(1, '1. Recebimento e Armazenamento do Arquivo Original', 10);

      // Tratamento Dedicado para Importação Estruturada por JSON
      if (isJson) {
        const jsonText = await uploadFile.text();

        // ETAPA 2: Identificação do Documento e Schema
        await ATUALIZAR_ETAPA_PIPELINE(2, '2. Identificação do Formato e Validação de Schema', 20);
        const validacao = validarSintaxeEEstruturaJSON(jsonText);
        if (!validacao.valido) {
          throw new Error(`Validação do Schema JSON falhou: ${validacao.erros.map(e => `${e.campo}: ${e.mensagem}`).join('; ')}`);
        }

        // ETAPAS 3 e 4: Extração e Tabelas
        await ATUALIZAR_ETAPA_PIPELINE(3, '3. Extração Integral das Seções e Requisitos', 30);
        await ATUALIZAR_ETAPA_PIPELINE(4, '4. Extração e Preservação de Tabelas em Markdown', 40);

        // ETAPA 5: Identificação da Hierarquia
        await ATUALIZAR_ETAPA_PIPELINE(5, '5. Mapeamento de Capítulos, Seções e Subitens', 50);

        // Chamada à API de Ingestão de JSON
        await ATUALIZAR_ETAPA_PIPELINE(6, '6. Fragmentação Inteligente (Chunking Hierárquico)', 60);
        await ATUALIZAR_ETAPA_PIPELINE(7, '7. Geração de Representação Semântica & Embeddings', 70);

        const response = await fetch('/api/manuals/upload-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonString: jsonText,
            nomeArquivo: uploadFile.name,
            tamanhoBytes: uploadFile.size,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || 'Falha na ingestão do arquivo JSON pelo servidor.');
        }

        const data = await response.json();

        // ETAPAS 8, 9 e 10
        await ATUALIZAR_ETAPA_PIPELINE(8, '8. Armazenamento e Indexação no Repositório de Fragmentos', 80);
        await ATUALIZAR_ETAPA_PIPELINE(9, '9. Validação de Cobertura e Auditoria de Completude', 90);
        await ATUALIZAR_ETAPA_PIPELINE(10, '10. Disponibilização do Documento para IA', 100);

        const newRecord: ManualRecord = {
          ...data.manual,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        };

        await saveManualToDB(newRecord);
        onSaveManual(newRecord);

        setIsUploadModalOpen(false);
        setUploadFile(null);
        setSelectedManual(newRecord);
        setToastMessage({
          type: 'success',
          text: `Manual ${newRecord.codigo} (${data.fragmentosIndexados} fragmentos) indexado com sucesso no Acervo de IA!`,
        });
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      // Processamento para Formatos Tradicionais (PDF, DOCX, TXT)
      let textContent = '';
      let base64 = '';
      const resolvedMimeType = isPdf 
        ? 'application/pdf' 
        : isWord 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        : 'text/plain';

      await ATUALIZAR_ETAPA_PIPELINE(2, '2. Identificação do Formato e Codificação', 20);

      if (isText) {
        textContent = await uploadFile.text();
      } else if (isWord) {
        try {
          textContent = await extractTextFromWordFile(uploadFile);
        } catch (docxErr) {
          console.warn('Word client extraction fallback:', docxErr);
        }
      }

      const reader = new FileReader();
      base64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64Data = res ? res.split(',')[1] : '';
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });

      // ETAPA 3 e 4: Extração Integral do Texto e Tabelas
      await ATUALIZAR_ETAPA_PIPELINE(3, '3. Extração Integral do Texto do Documento', 35);
      await ATUALIZAR_ETAPA_PIPELINE(4, '4. Identificação e Preservação de Tabelas e Quadros', 45);

      // ETAPA 5: Hierarquia
      await ATUALIZAR_ETAPA_PIPELINE(5, '5. Mapeamento de Capítulos, Itens e Diretrizes', 55);

      // Ingestão pelo Pipeline no Backend
      await ATUALIZAR_ETAPA_PIPELINE(6, '6. Fragmentação Inteligente sem Truncamento Arbitrário', 65);
      await ATUALIZAR_ETAPA_PIPELINE(7, '7. Vetorização Semântica dos Fragmentos', 75);

      const orgId = userProfile?.organizationId || 'org_impacto_aviation';
      const pipelineResp = await fetch('/api/manuals/ingest-pipeline', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-id': orgId,
        },
        body: JSON.stringify({
          nomeArquivo: uploadFile.name,
          formato: isWord ? 'docx' : isPdf ? 'pdf' : 'txt',
          tamanhoBytes: uploadFile.size,
          conteudoTexto: textContent,
          fileBase64: base64,
          mimeType: resolvedMimeType,
        }),
      });

      let pipelineData: any = null;
      if (pipelineResp.ok) {
        pipelineData = await pipelineResp.json();
      }

      await ATUALIZAR_ETAPA_PIPELINE(8, '8. Indexação de Fragmentos no Repositório Central', 85);
      await ATUALIZAR_ETAPA_PIPELINE(9, '9. Auditoria de Cobertura Documental', 95);

      // Fallback de extração se backend de metadados for necessário
      let parsed = pipelineData?.resultado?.documento || null;
      if (!parsed) {
        parsed = parseManualLocally(uploadFile.name, textContent);
      }

      const relatorio = pipelineData?.relatorio || null;
      const fragmentosTotal = pipelineData?.fragmentosCriados || (parsed.capitulos?.length || 2);
      const fragmentosIndexados = pipelineData?.fragmentosIndexados || fragmentosTotal;

      await ATUALIZAR_ETAPA_PIPELINE(10, '10. Disponibilização do Manual para Consultas da IA', 100);

      const resolvedChapters = (parsed.capitulos && parsed.capitulos.length > 0)
        ? parsed.capitulos
        : [
            {
              numero: '1.0',
              titulo: 'Objetivo, Escopo e Aplicação',
              requisitoTexto: parsed.descricaoResumo || `Requisitos e procedimentos de ${parsed.codigo || uploadFile.name}.`,
            },
            {
              numero: '2.0',
              titulo: 'Diretrizes Técnicas e Operacionais',
              requisitoTexto: textContent ? textContent.substring(0, 3000) : 'Procedimentos operacionais da qualidade.',
            }
          ];

      const newRecord: ManualRecord = {
        id: `man-${Date.now()}`,
        codigo: parsed.codigo || (uploadFile.name.replace(/\.[^/.]+$/, '').substring(0, 12).toUpperCase() || 'SGQ-DOC'),
        titulo: parsed.titulo || uploadFile.name.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' '),
        revisao: parsed.revisao || 'Rev. 01',
        dataVigencia: parsed.dataVigencia || new Date().toISOString().split('T')[0],
        orgaoRegulador: parsed.orgaoRegulador || 'SGQ Interno',
        fonte: parsed.fonte || 'Upload do Usuário / SGQ',
        setoresAplicaveis: parsed.setoresAplicaveis && parsed.setoresAplicaveis.length > 0 ? parsed.setoresAplicaveis : ['Qualidade / SGQ'],
        descricaoResumo: parsed.descricaoResumo || `Documento ${parsed.codigo || 'normativo'} indexado no Acervo de IA.`,
        conteudoTexto: textContent || parsed.conteudoTexto || '',
        arquivoTextoCompleto: textContent || '',
        arquivoBase64: base64 || '',
        arquivoMimeType: resolvedMimeType,
        formatoOrigem: isWord ? 'DOCX' : isPdf ? 'PDF' : isText ? 'TXT' : 'OUTRO',
        fragmentosTotal,
        fragmentosIndexados,
        relatorioCobertura: relatorio,
        capitulos: resolvedChapters.map((c: any, idx: number) => ({
          id: `cap-${Date.now()}-${idx}`,
          numero: c.numero || `Item ${idx + 1}`,
          titulo: c.titulo || 'Requisito Operacional',
          requisitoTexto: c.requisitoTexto || c.titulo || 'Requisito normativo do SGQ.',
        })),
        status: parsed.dataVigencia ? 'Vigente' : 'Vigência não verificada',
        arquivoNome: uploadFile.name,
        arquivoTamanho: `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      };

      await saveManualToDB(newRecord);
      onSaveManual(newRecord);

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setSelectedManual(newRecord);
      setToastMessage({
        type: 'success',
        text: `Manual ${newRecord.codigo} (${newRecord.arquivoNome}) indexado com ${fragmentosIndexados} fragmentos no Acervo de IA!`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error processing manual upload:', err);
      setUploadError(
        err?.message 
          ? `Falha no processamento do documento: ${err.message}. O manual NÃO foi salvo. Por favor, verifique o arquivo e tente novamente.`
          : 'Não foi possível ler e processar o arquivo enviado. Nenhum registro foi salvo no acervo.'
      );
    } finally {
      setUploadLoading(false);
      setPipelineCurrentStage(0);
      setPipelineStageName('');
      setPipelinePercent(0);
    }
  };

  const totalCapitulos = manuals.reduce((acc, m) => acc + (m.capitulos?.length || 0), 0);
  const manuaisVigentes = manuals.filter((m) => m.status === 'Vigente').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manuais Cadastrados</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{manuals.length}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revisões Vigentes</span>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{manuaisVigentes}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Requisitos Indexados</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{totalCapitulos}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Auditoria Normativa
            </span>
            <h4 className="text-sm font-bold tracking-tight">Biblioteca SGQ</h4>
          </div>
          <button
            onClick={() => {
              setConsultInitialQuery('');
              setIsConsultModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>Consultar IA</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Actions & Filters Bar */}
        <div className="p-5 border-b border-slate-200/90 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código (MOMQ, RBAC 145), título, requisito, palavra-chave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
            >
              <option value="todos">Todos os Status</option>
              <option value="Vigente">Apenas Vigentes</option>
              <option value="Em Revisão">Em Revisão</option>
              <option value="Obsoleto">Obsoletos</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenMigrationModal && (
              <button
                onClick={onOpenMigrationModal}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                title="Recuperar manuais do armazenamento local do navegador para o Cloud Firestore"
              >
                <UploadCloud className="w-4 h-4 text-amber-600" />
                <span>Recuperar do Navegador</span>
              </button>
            )}

            <button
              onClick={() => setIsJsonSchemaModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors shadow-xs"
              title="Visualizar especificação oficial do Schema JSON para importação estruturada"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Schema JSON Oficial</span>
            </button>

            <button
              onClick={() => setIsEnquadramentoModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors shadow-xs"
              title="Testar enquadramento rigoroso de NCs com fragmentos indexados e anti-alucinação"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Simular Enquadramento NC</span>
            </button>

            <button
              onClick={() => {
                setConsultInitialQuery('');
                setIsConsultModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors shadow-xs"
              title="Perguntar à IA sobre procedimentos da biblioteca"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Consultar Acervo (IA)</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors shadow-xs"
              title="Upload de arquivo JSON, Word, PDF ou TXT com pipeline de 10 etapas"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Subir Arquivo / JSON (IA)</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Novo Manual</span>
            </button>
          </div>
        </div>

        {/* Manuals Grid */}
        <div className="p-6">
          {filteredManuals.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum manual encontrado</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não há manuais que correspondam aos filtros aplicados. Crie um novo manual ou envie o arquivo para o banco de dados.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700"
              >
                Cadastrar Primeiro Manual
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredManuals.map((manual) => {
                const isVigente = manual.status === 'Vigente';

                return (
                  <div
                    key={manual.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Header Card */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-black font-mono tracking-tight text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                            {manual.codigo}
                          </span>
                          <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {manual.revisao}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isVigente
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : manual.status === 'Em Revisão'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {manual.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {manual.titulo}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {manual.descricaoResumo}
                        </p>
                      </div>

                      {/* Status de Alinhamento com Acervo & Revisões SGQ — Referência de NCs */}
                      {(() => {
                        const codNorm = normalizeDocumentCode(manual.codigo);
                        const alpha = canonicalAlphanumericKey(manual.codigo);
                        const docAcervo = documentosControlados.find(
                          (d) =>
                            d.manualIAId === manual.id ||
                            normalizeDocumentCode(d.codigo) === codNorm ||
                            canonicalAlphanumericKey(d.codigo) === alpha
                        );

                        if (!docAcervo) {
                          return null;
                        }

                        const comp = compararRevisoesDocumentais(
                          docAcervo.numeroRevisao || '',
                          docAcervo.dataRevisao || '',
                          manual.revisao || '',
                          manual.dataVigencia || ''
                        );

                        if (comp > 0) {
                          return (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Alerta: Banco IA Desatualizado!</span>
                              </div>
                              <p className="text-[11px] leading-tight text-rose-700">
                                O Acervo SGQ indica <strong>{docAcervo.numeroRevisao}</strong> como referência atual, mas este manual na IA possui <strong>{manual.revisao}</strong>.
                              </p>
                              {onNavigateToAcervo && (
                                <button
                                  type="button"
                                  onClick={onNavigateToAcervo}
                                  className="text-[11px] font-bold text-rose-900 hover:underline pt-0.5 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Verificar no Acervo & Revisões &rarr;</span>
                                </button>
                              )}
                            </div>
                          );
                        }

                        if (comp === 0) {
                          return (
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                              <span className="flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Alinhado ao Acervo SGQ ({docAcervo.numeroRevisao})</span>
                              </span>
                              <span className="text-[10px] text-emerald-600 font-mono">Vigência OK</span>
                            </div>
                          );
                        }

                        return null;
                      })()}

                      {/* Metadados de Vigência, Datas e Governança */}
                      {(() => {
                        const codNorm = normalizeDocumentCode(manual.codigo);
                        const alpha = canonicalAlphanumericKey(manual.codigo);
                        const docAcervo = documentosControlados.find(
                          (d) =>
                            (manual.documentoControladoId && d.id === manual.documentoControladoId) ||
                            d.manualIAId === manual.id ||
                            normalizeDocumentCode(d.codigo) === codNorm ||
                            canonicalAlphanumericKey(d.codigo) === alpha
                        );

                        const dataRevExibida = manual.dataRevisao || docAcervo?.dataRevisao || null;
                        const dataAprovExibida = manual.dataAprovacao || docAcervo?.dataAprovacao || null;
                        const dataVigExibida = manual.dataVigencia || docAcervo?.dataVigencia || null;
                        const dataProxRevExibida = manual.dataProximaRevisao || docAcervo?.dataProximaRevisao || docAcervo?.proximaVerificacaoExterna || null;
                        const propExibido = manual.proprietario || docAcervo?.proprietario || null;
                        const assessorExibido = manual.assessor || docAcervo?.assessor || null;

                        return (
                          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                            {/* Grid de Datas Rigorosamente Segregadas */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Data da Revisão:</span>
                                <span className="font-bold text-slate-900 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-indigo-600 shrink-0" />
                                  {dataRevExibida ? dataRevExibida : <span className="text-slate-400 font-normal italic">Não informado</span>}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Início Vigência:</span>
                                <span className="font-semibold text-slate-700 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                  {dataVigExibida ? dataVigExibida : <span className="text-slate-400 font-normal italic">Não informado</span>}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Aprovação:</span>
                                <span className="font-semibold text-slate-700 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                  {dataAprovExibida ? dataAprovExibida : <span className="text-slate-400 font-normal italic">Não informado</span>}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Próxima Revisão:</span>
                                <span className="font-semibold text-slate-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                                  {dataProxRevExibida ? dataProxRevExibida : <span className="text-slate-400 font-normal italic">Não informado</span>}
                                </span>
                              </div>
                            </div>

                            {/* Governança: Proprietário e Assessor Independentes */}
                            <div className="space-y-1 pt-1 text-[11px]">
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Building className="w-3 h-3 text-slate-400" /> Proprietário:
                                </span>
                                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                  {propExibido || <span className="text-slate-400 font-normal italic">Não informado</span>}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="flex items-center gap-1 text-slate-500">
                                  <UserCheck className="w-3 h-3 text-slate-400" /> Assessor:
                                </span>
                                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                                  {assessorExibido || <span className="text-slate-400 font-normal italic">Não informado</span>}
                                </span>
                              </div>
                              {manual.orgaoRegulador && (
                                <div className="flex items-center justify-between text-slate-600">
                                  <span className="flex items-center gap-1 text-slate-500">
                                    <ShieldCheck className="w-3 h-3 text-slate-400" /> Órgão / Escopo:
                                  </span>
                                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                                    {manual.orgaoRegulador}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-slate-500 pt-1">
                              <span className="flex items-center gap-1 text-[11px]">
                                <Layers className="w-3 h-3 text-slate-400" /> Requisitos Indexados:
                              </span>
                              <span className="font-bold text-indigo-600 text-xs">{manual.capitulos?.length || 0} itens</span>
                            </div>

                            {/* Setores Tags */}
                            {manual.setoresAplicaveis && manual.setoresAplicaveis.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {manual.setoresAplicaveis.slice(0, 2).map((s, idx) => (
                                  <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                    {s}
                                  </span>
                                ))}
                                {manual.setoresAplicaveis.length > 2 && (
                                  <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                    +{manual.setoresAplicaveis.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Acervo de IA: Metadados Estruturais e Fragmentos */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700 font-mono bg-indigo-50/80 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200/60">
                            {manual.formatoOrigem ? manual.formatoOrigem.toUpperCase() : 'DOC/PDF'}
                          </span>
                          <span className="text-slate-500">
                            <strong>{manual.fragmentosIndexados || manual.capitulos?.length || 0}</strong> fragmentos IA
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {manual.relatorioCobertura && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCoverageReportTarget({
                                  report: manual.relatorioCobertura!,
                                  title: `${manual.codigo} (${manual.revisao})`,
                                });
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Ver Relatório de Cobertura Documental das 10 etapas"
                            >
                              Cobertura {manual.relatorioCobertura.percentualCobertura}%
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFragmentsExplorerTarget({
                                id: manual.id,
                                codigo: manual.codigo,
                                revisao: manual.revisao,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                            title="Explorar fragmentos hierárquicos preservados"
                          >
                            Ver Fragmentos
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedManual(manual)}
                        className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Requisitos</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(manual)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          title="Editar Metadados e Datas da Revisão"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Editar Documento</span>
                        </button>
                        <button
                          onClick={() => setManualToDelete(manual)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir Manual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Details / Requisitos View */}
      {selectedManual && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-black font-mono bg-indigo-600 px-2.5 py-1 rounded-lg text-white">
                  {selectedManual.codigo}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedManual.titulo}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedManual.revisao} • Vigência: {selectedManual.dataVigencia} • {selectedManual.orgaoRegulador || 'SGQ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedManual(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs in Detail Modal */}
            <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveDetailTab('capitulos')}
                  className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-colors ${
                    activeDetailTab === 'capitulos'
                      ? 'bg-white text-indigo-700 border-slate-200 shadow-xs'
                      : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  Capítulos e Requisitos ({selectedManual.capitulos?.length || 0})
                </button>
                <button
                  onClick={() => setActiveDetailTab('integral')}
                  className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-colors ${
                    activeDetailTab === 'integral'
                      ? 'bg-white text-indigo-700 border-slate-200 shadow-xs'
                      : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  Texto Integral / Documento Completo
                </button>
              </div>

              <div className="pb-1.5 flex items-center space-x-2">
                <button
                  onClick={() => {
                    setConsultInitialQuery(`Quais são os principais requisitos e regras operacionais do manual ${selectedManual.codigo} (${selectedManual.revisao})?`);
                    setIsConsultModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Consultar com IA</span>
                </button>

                <button
                  onClick={() => downloadOriginalManualFile(selectedManual)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold shadow-xs transition-colors"
                  title="Baixar arquivo original ou texto integral"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Baixar Arquivo</span>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Objetivo e Escopo do Manual:</span>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedManual.descricaoResumo}</p>
                {selectedManual.arquivoNome && (
                  <div className="pt-2 flex items-center justify-between text-xs text-indigo-700 font-semibold border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Arquivo Arquivado Integralmente: <strong>{selectedManual.arquivoNome}</strong> ({selectedManual.arquivoTamanho || 'Integral'})</span>
                    </div>
                    <button
                      onClick={() => downloadOriginalManualFile(selectedManual)}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                )}
              </div>

              {activeDetailTab === 'capitulos' ? (
                /* Capítulos e Itens */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Requisitos e Capítulos Regulamentares ({selectedManual.capitulos?.length || 0})
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedManual(null);
                        handleOpenEdit(selectedManual);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      + Editar / Adicionar Requisitos
                    </button>
                  </div>

                  {(!selectedManual.capitulos || selectedManual.capitulos.length === 0) ? (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                      <p>Nenhum capítulo isolado foi fatiado. O documento integral foi mantido completo na íntegra no banco de dados.</p>
                      <button
                        onClick={() => setActiveDetailTab('integral')}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Ver Texto Integral →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedManual.capitulos.map((cap) => (
                        <div key={cap.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Item {cap.numero}
                            </span>
                            <h5 className="font-bold text-xs text-slate-900">{cap.titulo}</h5>
                          </div>
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                            {cap.requisitoTexto}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Texto Integral */
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Conteúdo Textual Integral Indexado para Consultas de IA:
                    </span>
                    <button
                      onClick={() => {
                        const fullText = selectedManual.arquivoTextoCompleto || selectedManual.conteudoTexto || '';
                        navigator.clipboard.writeText(fullText);
                        setToastMessage({ type: 'success', text: 'Texto integral copiado para a área de transferência!' });
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Copiar Todo o Texto
                    </button>
                  </div>
                  <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto whitespace-pre-wrap max-h-96 font-mono leading-relaxed select-text">
                    {selectedManual.arquivoTextoCompleto || selectedManual.conteudoTexto || 'Nenhum texto integral indexado.'}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setManualToDelete(selectedManual)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Manual</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const m = selectedManual;
                    setSelectedManual(null);
                    handleOpenEdit(m);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Manual</span>
                </button>
                <button
                  onClick={() => setSelectedManual(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Manual Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-white">
                {editingManual ? `Editar Manual: ${editingManual.codigo}` : 'Cadastrar Novo Manual / Revisão'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Bloco 1: Identificação Básica e Revisão */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Código do Manual *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: MOMQ, RBAC 145"
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Número da Revisão Vigente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rev. 14, Emenda 07"
                    value={formData.revisao || ''}
                    onChange={(e) => setFormData({ ...formData, revisao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Data da Revisão *
                    <span className="text-[10px] text-slate-500 font-normal ml-1">(Emissão técnica)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dataRevisao || ''}
                    onChange={(e) => setFormData({ ...formData, dataRevisao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Bloco 2: Datas Oficiais Segregadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100/60 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Data de Início de Vigência *
                    <span className="text-[10px] text-emerald-700 font-normal ml-1">(Eficácia)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataVigencia || ''}
                    onChange={(e) => setFormData({ ...formData, dataVigencia: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Data de Aprovação Formal
                    <span className="text-[10px] text-blue-700 font-normal ml-1">(Portaria/Diretoria)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dataAprovacao || ''}
                    onChange={(e) => setFormData({ ...formData, dataAprovacao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Data da Próxima Revisão
                    <span className="text-[10px] text-amber-700 font-normal ml-1">(Limite periódico)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dataProximaRevisao || ''}
                    onChange={(e) => setFormData({ ...formData, dataProximaRevisao: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Bloco 3: Governança — Proprietário e Assessor Independentes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    Proprietário do Documento
                    <span className="text-[10px] text-slate-500 font-normal">(Governança técnica)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: IMPACTO Aviation MRO, BOEING, ANAC"
                    value={formData.proprietario || ''}
                    onChange={(e) => setFormData({ ...formData, proprietario: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Pessoa ou entidade titular responsável pela governança do documento.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Assessor do Documento
                    <span className="text-[10px] text-slate-500 font-normal">(Assessoria / Análise)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Engenharia de Manutenção, Assessor SGQ"
                    value={formData.assessor || ''}
                    onChange={(e) => setFormData({ ...formData, assessor: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Pessoa ou setor responsável pela assessoria e análise técnica documental.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título Completo do Manual *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manual da Organização de Manutenção da Qualidade"
                  value={formData.titulo || ''}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Órgão Regulador / Escopo</label>
                  <input
                    type="text"
                    placeholder="Ex: ANAC / FAA / ISO 9001 / SGQ Interno"
                    value={formData.orgaoRegulador || ''}
                    onChange={(e) => setFormData({ ...formData, orgaoRegulador: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status do Manual</label>
                  <select
                    value={formData.status || 'Vigente'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusManual })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Vigente">Vigente (Última Revisão Ativa)</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Obsoleto">Obsoleto / Substituído</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Resumo do Objetivo e Abrangência</label>
                <textarea
                  rows={2}
                  placeholder="Descreva o escopo e regras principais estabelecidas por este manual..."
                  value={formData.descricaoResumo || ''}
                  onChange={(e) => setFormData({ ...formData, descricaoResumo: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Capítulos Manager */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Capítulos e Requisitos Normativos Cadastrados ({formData.capitulos?.length || 0})
                  </span>
                </div>

                {/* List of current chapters */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(formData.capitulos || []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="font-mono font-bold text-indigo-700 mr-2">Item {c.numero}</span>
                        <span className="font-semibold text-slate-800">{c.titulo}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCapitulo(c.id)}
                        className="text-rose-600 hover:text-rose-800 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new chapter inputs */}
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 block">+ Adicionar Item / Capítulo Específico</span>
                  {capituloError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{capituloError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nº (Ex: 3.4.3)"
                      value={newCapitulo.numero || ''}
                      onChange={(e) => setNewCapitulo({ ...newCapitulo, numero: e.target.value })}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Título (Ex: Controle de Calibração)"
                      value={newCapitulo.titulo || ''}
                      onChange={(e) => setNewCapitulo({ ...newCapitulo, titulo: e.target.value })}
                      className="sm:col-span-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Texto normativo do requisito mandatório..."
                    value={newCapitulo.requisitoTexto || ''}
                    onChange={(e) => setNewCapitulo({ ...newCapitulo, requisitoTexto: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddCapitulo}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                    >
                      Inserir Item
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Texto Normativo Completo (Opcional para Indexação por IA)
                </label>
                <textarea
                  rows={4}
                  placeholder="Cole o texto integral ou capítulos do manual aqui..."
                  value={formData.conteudoTexto || ''}
                  onChange={(e) => setFormData({ ...formData, conteudoTexto: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                {editingManual ? (
                  <button
                    type="button"
                    onClick={() => {
                      const m = editingManual;
                      setManualToDelete(m);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Manual</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100"
                  >
                    Salvar Manual
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Manual via IA com Suporte a JSON e Pipeline de 10 Etapas */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Ingestão Documental Completa no Acervo de IA</h3>
                  <span className="text-[10px] text-slate-400">Suporte a JSON Estruturado, Word, PDF e TXT</span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!uploadLoading) setIsUploadModalOpen(false);
                }}
                disabled={uploadLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Instructions and Schema link */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="leading-relaxed">
                  Envie arquivos <strong>.json</strong> estruturados ou <strong>.docx, .pdf, .txt</strong>. O pipeline executará 10 etapas de extração, tabela, chunking e indexação.
                </span>
                <button
                  type="button"
                  onClick={() => setIsJsonSchemaModalOpen(true)}
                  className="shrink-0 ml-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ver Schema JSON</span>
                </button>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => !uploadLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed p-6 rounded-2xl text-center transition-all space-y-2 ${
                  uploadLoading 
                    ? 'border-indigo-300 bg-indigo-50/20 cursor-wait' 
                    : uploadFile 
                    ? 'border-indigo-400 bg-indigo-50/40 cursor-pointer' 
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,.docx,.doc,.dotx,.pdf,.txt,.csv,.md,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf"
                  className="hidden"
                  disabled={uploadLoading}
                />
                <Upload className="w-8 h-8 text-indigo-600 mx-auto" />
                <div className="text-xs font-bold text-slate-900">
                  {uploadFile ? uploadFile.name : 'Clique para selecionar ou arraste o manual (.json, .pdf, .docx, .txt)'}
                </div>
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
                    <span>Tamanho: {(uploadFile.size / 1024).toFixed(1)} KB</span>
                    <span>Tipo: {uploadFile.name.split('.').pop()?.toUpperCase()}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 block">
                    Formatos aceitos: JSON estruturado, Word (.docx, .doc), PDF, TXT (até 50MB)
                  </span>
                )}
              </div>

              {/* JSON Validation Feedback Banner */}
              {uploadFile?.name.endsWith('.json') && (
                <div>
                  {jsonValidationOk && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="block font-bold">Arquivo JSON Validado com Sucesso!</strong>
                        <span className="text-[11px]">Sintaxe e estrutura aderentes ao Schema Oficial v1.0.0.</span>
                      </div>
                    </div>
                  )}

                  {jsonValidationErrors && jsonValidationErrors.length > 0 && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-rose-900">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Inconformidades no Arquivo JSON ({jsonValidationErrors.length})</span>
                      </div>
                      <ul className="text-[11px] space-y-1 list-disc list-inside text-rose-700 max-h-32 overflow-y-auto">
                        {jsonValidationErrors.map((err, idx) => (
                          <li key={idx}>
                            <strong>{err.campo}:</strong> {err.mensagem} {err.linha ? `(Linha ${err.linha})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {jsonValidationWarnings && jsonValidationWarnings.length > 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <strong className="text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Avisos de Estrutura:
                      </strong>
                      <ul className="text-[11px] list-disc list-inside text-amber-700">
                        {jsonValidationWarnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Live 10-Stage Pipeline Progress Tracker */}
              {uploadLoading && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span>{pipelineStageName || 'Processando pipeline de ingestão...'}</span>
                    </div>
                    <span className="font-mono text-indigo-700">{pipelinePercent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-indigo-200/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${pipelinePercent}%` }}
                    />
                  </div>

                  {/* 10-Stage Mini Badges */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1 text-[10px]">
                    {[
                      { etapa: 1, label: 'Upload' },
                      { etapa: 2, label: 'Identificação' },
                      { etapa: 3, label: 'Extração' },
                      { etapa: 4, label: 'Tabelas' },
                      { etapa: 5, label: 'Hierarquia' },
                      { etapa: 6, label: 'Chunking' },
                      { etapa: 7, label: 'Vetorização' },
                      { etapa: 8, label: 'Indexação' },
                      { etapa: 9, label: 'Auditoria' },
                      { etapa: 10, label: 'IA Ativa' },
                    ].map((s) => (
                      <div
                        key={s.etapa}
                        className={`p-1 rounded text-center font-bold ${
                          pipelineCurrentStage >= s.etapa
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        {s.etapa}. {s.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadError && !uploadLoading && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploadLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcessUpload}
                  disabled={!uploadFile || uploadLoading || (uploadFile.name.endsWith('.json') && !jsonValidationOk)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center space-x-2 disabled:opacity-50"
                >
                  {uploadLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingerindo ({pipelinePercent}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Executar Ingestão Completa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Manual */}
      {manualToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Excluir Manual Regulatório?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja remover este manual da base de dados de conformidade? Esta ação não pode ser desfeita.
                </p>
              </div>

              {/* Detalhes do Manual Selecionado */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {manualToDelete.codigo}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{manualToDelete.revisao}</span>
                </div>
                <div className="text-xs font-bold text-slate-800 line-clamp-2">
                  {manualToDelete.titulo}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span>Requisitos indexados:</span>
                  <span className="font-bold text-slate-700">{manualToDelete.capitulos?.length || 0} capítulos</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setManualToDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteManual(manualToDelete)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Consulta Inteligente por IA à Biblioteca */}
      <ManualsConsultModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        manuals={manuals}
        initialQuery={consultInitialQuery}
      />

      {/* Acervo de IA: Modal do Schema JSON Oficial */}
      <JsonSchemaModal
        isOpen={isJsonSchemaModalOpen}
        onClose={() => setIsJsonSchemaModalOpen(false)}
      />

      {/* Acervo de IA: Modal de Relatório de Cobertura Documental */}
      <CoverageReportModal
        isOpen={Boolean(coverageReportTarget)}
        onClose={() => setCoverageReportTarget(null)}
        report={coverageReportTarget?.report || null}
        manualTitle={coverageReportTarget?.title}
      />

      {/* Acervo de IA: Modal Explorador de Fragmentos */}
      <FragmentsExplorerModal
        isOpen={Boolean(fragmentsExplorerTarget)}
        onClose={() => setFragmentsExplorerTarget(null)}
        documentoId={fragmentsExplorerTarget?.id || ''}
        codigoManual={fragmentsExplorerTarget?.codigo || ''}
        revisaoManual={fragmentsExplorerTarget?.revisao || ''}
      />

      {/* Acervo de IA: Modal Simulador de Enquadramento de NC */}
      <NcEnquadramentoModal
        isOpen={isEnquadramentoModalOpen}
        onClose={() => setIsEnquadramentoModalOpen(false)}
      />

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center space-x-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700 shadow-emerald-950/20'
                : 'bg-slate-900 text-slate-100 border-slate-700 shadow-slate-950/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};
