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
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size === 0) {
        setUploadError('O arquivo selecionado está vazio (0 bytes). Não é permitido o envio de documentos sem conteúdo.');
        setUploadFile(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`O arquivo excede o limite máximo permitido de 50 MB (tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
        setUploadFile(null);
        return;
      }
      setUploadFile(file);
      setUploadError(null);
    }
  };

  const handleProcessUpload = async () => {
    if (!uploadFile) {
      setUploadError('Selecione um arquivo de manual (PDF, DOCX ou TXT).');
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
      let base64 = '';
      let textContent = '';
      const isText = uploadFile.type === 'text/plain' || uploadFile.name.endsWith('.txt') || uploadFile.name.endsWith('.csv') || uploadFile.name.endsWith('.md');
      const isPdf = uploadFile.name.endsWith('.pdf') || uploadFile.type === 'application/pdf';
      const isWord = isWordDocument(uploadFile.name, uploadFile.type);
      const resolvedMimeType = isPdf 
        ? 'application/pdf' 
        : isWord 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        : (uploadFile.type || 'text/plain');

      if (isText) {
        textContent = await uploadFile.text();
        if (!textContent || textContent.trim().length === 0) {
          throw new Error('O arquivo de texto selecionado está sem conteúdo ou vazio.');
        }
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

      if (!base64 || base64.trim().length === 0) {
        throw new Error('O arquivo não pôde ser lido ou o formato é inválido.');
      }

      let parsed: any = null;

      try {
        const orgId = userProfile?.organizationId || 'org_impacto_aviation';
        const response = await fetch('/api/parse-manual', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-organization-id': orgId,
            'x-user-org-id': userProfile?.organizationId || '',
          },
          body: JSON.stringify({
            organizationId: orgId,
            fileBase64: base64,
            mimeType: resolvedMimeType,
            fileName: uploadFile.name,
            textContent,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.manual) {
            parsed = data.manual;
          }
        } else {
          const errorData = await response.json().catch(() => null);
          console.warn('Backend manual parser returned error, will attempt client fallback:', errorData?.error);
        }
      } catch (fetchErr: any) {
        console.warn('Backend manual parser fallback to local parser:', fetchErr);
      }

      // If backend was unreachable or returned empty, attempt local parsing
      if (!parsed) {
        parsed = parseManualLocally(uploadFile.name, textContent);
      }

      // Ensure fallback chapters if empty
      const resolvedChapters = (parsed.capitulos && parsed.capitulos.length > 0)
        ? parsed.capitulos
        : [
            {
              numero: '1.0',
              titulo: 'Objetivo, Escopo e Aplicação',
              requisitoTexto: parsed.descricaoResumo || `Requisitos e procedimentos normativos de ${parsed.codigo || uploadFile.name}.`,
            },
            {
              numero: '2.0',
              titulo: 'Diretrizes Operacionais SGQ',
              requisitoTexto: textContent || 'Cumprimento estrito dos requisitos e procedimentos regulamentares da qualidade.',
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
        descricaoResumo: parsed.descricaoResumo || `Documento ${parsed.codigo || 'normativo'} indexado no SGQ.`,
        conteudoTexto: parsed.conteudoTexto || textContent || '',
        arquivoTextoCompleto: textContent || parsed.conteudoTexto || parsed.arquivoTextoCompleto || '',
        arquivoBase64: base64 || '',
        arquivoMimeType: resolvedMimeType,
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

      // Safely preserve the full original file binary in IndexedDB
      await saveManualToDB(newRecord);

      onSaveManual(newRecord);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setSelectedManual(newRecord);
      setToastMessage({ type: 'success', text: `Manual ${newRecord.codigo} (${newRecord.arquivoNome}) arquivado e indexado com sucesso!` });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error processing manual upload:', err);
      // PONTO 5: Se houver falha no processamento/leitura, exibir erro ao usuário e NÃO salvar registro incompleto
      setUploadError(
        err?.message 
          ? `Falha no processamento do documento: ${err.message}. O manual NÃO foi salvo. Por favor, verifique o arquivo e tente novamente.`
          : 'Não foi possível ler e processar o arquivo enviado. Nenhum registro foi salvo no acervo. Verifique o formato do documento e tente novamente.'
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const totalCapitulos = manuals.reduce((acc, m) => acc + (m.capitulos?.length || 0), 0);
  const manuaisVigentes = manuals.filter((m) => m.status === 'Vigente').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Manuais Cadastrados</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{manuals.length}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Revisões Vigentes</span>
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{manuaisVigentes}</h3>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">Requisitos Indexados</span>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{totalCapitulos}</h3>
          </div>
          <div className="w-10 h-10 rounded-[8px] bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-[12px] border border-slate-800 shadow-xs flex items-center justify-between">
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
            className="px-3 py-1.5 rounded-[8px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>Consultar IA</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-[12px] border border-slate-200 shadow-xs overflow-hidden">
        {/* Actions & Filters Bar */}
        <div className="p-5 border-b border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código (MOMQ, RBAC 145), título, requisito, palavra-chave..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
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
              title="Upload de arquivo PDF/TXT de manual"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Subir Arquivo (IA)</span>
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

      {/* Modal Upload Manual via IA */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Subir Manual / Extração com IA</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Envie o arquivo do manual (Word DOCX/DOC, PDF ou TXT). O sistema identificará automaticamente a <strong>última revisão aprovada</strong>, vigência e indexará todos os requisitos para a verificação de pertinência.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 p-8 rounded-2xl text-center cursor-pointer transition-all space-y-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".docx,.doc,.dotx,.pdf,.txt,.csv,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-indigo-600 mx-auto" />
                <div className="text-xs font-bold text-slate-900">
                  {uploadFile ? uploadFile.name : 'Clique para selecionar ou arraste o arquivo do manual'}
                </div>
                <span className="text-[11px] text-slate-400 block">Formatos aceitos: Word (.docx, .doc), PDF, TXT (até 50MB)</span>
              </div>

              {uploadError && (
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleProcessUpload}
                  disabled={!uploadFile || uploadLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center space-x-2 disabled:opacity-50"
                >
                  {uploadLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Processar e Indexar</span>
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
