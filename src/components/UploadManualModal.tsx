import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Bot,
  UserCheck,
  Building,
  Calendar,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import {
  DocumentoControlado,
  RevisaoDocumental,
  CategoriaDocumental,
  UserProfile,
} from '../types';
import {
  saveDocumentFileToStorage,
  formatFileSize,
} from '../utils/documentFilesStorage';
import {
  saveDocumentoControlado,
  saveRevisaoDocumental,
} from '../services/firebase/documentControlFirestore';

interface UploadManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currentUser?: UserProfile | null;
  documentosExistentes?: DocumentoControlado[];
  documentoPreSelecionado?: DocumentoControlado | null;
  onSuccess: (doc: DocumentoControlado, rev: RevisaoDocumental, msg: string) => void;
}

const AREAS_PUBLICACAO_SUGERIDAS = [
  'Regulamentação Aeronáutica (ANAC / FAA)',
  'Manuais de Voo & Linha (AOM / AFM / FCOM)',
  'SGQ & Procedimentos da Organização (MOMQ / MGQ)',
  'Engenharia & Manutenção de Aeronaves (AMM / IPC / WDM)',
  'Oficinas de Componentes & Motores (CMM / EMM)',
  'Instruções de Trabalho & Rotinas Técnicas (IT / POP)',
  'Formulários & Registros da Qualidade (FORM)',
];

export const UploadManualModal: React.FC<UploadManualModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  currentUser,
  documentosExistentes = [],
  documentoPreSelecionado = null,
  onSuccess,
}) => {
  const [isExistingMode, setIsExistingMode] = useState(!!documentoPreSelecionado);
  const [selectedDocId, setSelectedDocId] = useState(documentoPreSelecionado?.id || '');

  // Arquivo
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campos do Formulário
  const [areaPublicacao, setAreaPublicacao] = useState('Regulamentação Aeronáutica (ANAC / FAA)');
  const [titulo, setTitulo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [proprietarioCessor, setProprietarioCessor] = useState('Impacto Aviation');
  const [numeroRevisao, setNumeroRevisao] = useState('Rev. 01');
  const [dataRevisao, setDataRevisao] = useState(new Date().toISOString().split('T')[0]);
  const [tipoVerificacao, setTipoVerificacao] = useState<'AUTOMATICO' | 'MANUAL'>('MANUAL');
  const [urlFonteVerificacao, setUrlFonteVerificacao] = useState('');
  const [contatoClienteNome, setContatoClienteNome] = useState('');
  const [contatoClienteEmail, setContatoClienteEmail] = useState('');
  const [portalFabricanteUrl, setPortalFabricanteUrl] = useState('');
  const [escopoAlteracoes, setEscopoAlteracoes] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDocumental>('DOCUMENTO_INTERNO');

  useEffect(() => {
    if (documentoPreSelecionado) {
      setIsExistingMode(true);
      setSelectedDocId(documentoPreSelecionado.id);
      setTitulo(documentoPreSelecionado.titulo);
      setCodigo(documentoPreSelecionado.codigo);
      setAreaPublicacao(documentoPreSelecionado.areaPublicacao || 'SGQ & Procedimentos da Organização (MOMQ / MGQ)');
      setProprietarioCessor(
        documentoPreSelecionado.proprietarioCessor ||
        documentoPreSelecionado.clienteNome ||
        documentoPreSelecionado.emissor ||
        'Impacto Aviation'
      );
      setTipoVerificacao(documentoPreSelecionado.tipoVerificacao || 'MANUAL');
      setUrlFonteVerificacao(documentoPreSelecionado.urlFonteVerificacao || '');
      setContatoClienteNome(documentoPreSelecionado.contatoClienteNome || '');
      setContatoClienteEmail(documentoPreSelecionado.contatoClienteEmail || '');
      setPortalFabricanteUrl(documentoPreSelecionado.portalFabricanteUrl || '');
      setCategoria(documentoPreSelecionado.categoria || 'DOCUMENTO_INTERNO');

      // Sugere próxima revisão
      const currentRev = documentoPreSelecionado.numeroRevisao || documentoPreSelecionado.revisaoVigenteNumero || 'Rev. 01';
      const numMatch = currentRev.match(/\d+/);
      if (numMatch) {
        const nextNum = String(parseInt(numMatch[0], 10) + 1).padStart(2, '0');
        setNumeroRevisao(`Rev. ${nextNum}`);
      } else {
        setNumeroRevisao(`${currentRev} +1`);
      }
    } else {
      setIsExistingMode(false);
      setSelectedDocId('');
    }
  }, [documentoPreSelecionado, isOpen]);

  // Ao trocar o documento existente selecionado
  const handleSelectExistingDoc = (docId: string) => {
    setSelectedDocId(docId);
    const found = documentosExistentes.find((d) => d.id === docId);
    if (found) {
      setTitulo(found.titulo);
      setCodigo(found.codigo);
      setAreaPublicacao(found.areaPublicacao || 'SGQ & Procedimentos da Organização (MOMQ / MGQ)');
      setProprietarioCessor(found.proprietarioCessor || found.clienteNome || found.emissor || 'Impacto Aviation');
      setTipoVerificacao(found.tipoVerificacao || 'MANUAL');
      setUrlFonteVerificacao(found.urlFonteVerificacao || '');
      setContatoClienteNome(found.contatoClienteNome || '');
      setContatoClienteEmail(found.contatoClienteEmail || '');
      setPortalFabricanteUrl(found.portalFabricanteUrl || '');
      setCategoria(found.categoria || 'DOCUMENTO_INTERNO');

      const currentRev = found.numeroRevisao || found.revisaoVigenteNumero || 'Rev. 01';
      const numMatch = currentRev.match(/\d+/);
      if (numMatch) {
        const nextNum = String(parseInt(numMatch[0], 10) + 1).padStart(2, '0');
        setNumeroRevisao(`Rev. ${nextNum}`);
      } else {
        setNumeroRevisao(`${currentRev} +1`);
      }
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setUploadError(null);
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const fileNameLower = selectedFile.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!hasValidExt) {
      setUploadError('Por favor, selecione um arquivo em formato PDF (.pdf) ou Word (.docx / .doc).');
      return;
    }

    setFile(selectedFile);

    // Se estiver em modo novo documento e os campos estiverem vazios, infere do nome do arquivo
    if (!isExistingMode && (!titulo || !codigo)) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(/[-_ ]+/);

      if (!codigo && parts[0]) {
        setCodigo(parts[0].toUpperCase());
      }
      if (!titulo) {
        setTitulo(cleanName.replace(/_/g, ' '));
      }

      // Detecção de revisão no nome
      const revMatch = cleanName.match(/rev[._ -]?(\d+)/i) || cleanName.match(/emenda[._ -]?(\d+)/i);
      if (revMatch) {
        setNumeroRevisao(`Rev. ${revMatch[1].padStart(2, '0')}`);
      }

      // Detecção de tipo de fonte
      if (cleanName.toUpperCase().includes('RBAC') || cleanName.toUpperCase().includes('ANAC') || cleanName.toUpperCase().includes('IS')) {
        setTipoVerificacao('AUTOMATICO');
        setAreaPublicacao('Regulamentação Aeronáutica (ANAC / FAA)');
        setProprietarioCessor('ANAC');
        setCategoria('DOCUMENTO_AUTORIDADE');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Selecione ou arraste o arquivo do manual (PDF ou DOCX).');
      return;
    }
    if (!titulo.trim()) {
      setUploadError('Informe o título do documento.');
      return;
    }
    if (!codigo.trim()) {
      setUploadError('Informe o código identificador do documento.');
      return;
    }
    if (!numeroRevisao.trim()) {
      setUploadError('Informe o número da revisão.');
      return;
    }

    const codigoNorm = codigo.trim().toUpperCase();
    const revNorm = numeroRevisao.trim();

    // Validação de Duplicidade Cadastral
    if (!isExistingMode) {
      const docDuplicado = documentosExistentes.find(
        (d) => d.codigo.trim().toUpperCase() === codigoNorm
      );
      if (docDuplicado) {
        setUploadError(
          `O código documental "${codigoNorm}" já está cadastrado no Acervo ("${docDuplicado.titulo}"). Para atualizar ou anexar nova revisão a este manual, ative a opção "Adicionar Revisão a Manual Existente" para garantir a rastreabilidade e evitar duplicidade.`
        );
        return;
      }
    }

    setIsSaving(true);
    setUploadError(null);

    try {
      const now = new Date().toISOString();
      const existingDoc = isExistingMode && selectedDocId ? documentosExistentes.find((d) => d.id === selectedDocId) : undefined;
      const docId = existingDoc ? existingDoc.id : `doc-${Date.now()}`;

      // Se a revisão informada já for a vigente do documento existente, atualizamos o arquivo da revisão atual
      const ehMesmaRevisaoVigente = existingDoc && (existingDoc.numeroRevisao === revNorm || existingDoc.revisaoVigenteNumero === revNorm);
      const revId = ehMesmaRevisaoVigente && existingDoc.revisaoVigenteId ? existingDoc.revisaoVigenteId : `rev-${Date.now()}`;

      // 1. Salva o binário físico no IndexedDB e gera metadados de armazenamento
      const fileMeta = await saveDocumentFileToStorage(revId, docId, file, revId);

      // Também armazena sob a chave docId para acesso rápido à versão vigente
      await saveDocumentFileToStorage(docId, docId, file, revId);

      // 2. Cria ou atualiza o registro de RevisaoDocumental
      const novaRevisao: RevisaoDocumental = {
        id: revId,
        organizationId,
        documentoId: docId,
        codigoDocumento: codigoNorm,
        tituloDocumento: titulo.trim(),
        numeroRevisao: revNorm,
        dataEmissao: dataRevisao,
        dataEntradaVigor: dataRevisao,
        statusCicloVida: 'VIGENTE',
        aprovadoPorNome: currentUser?.displayName || 'Gestor SGQ Homologado',
        aprovadoPorUid: currentUser?.uid,
        dataAprovacao: now,
        justificativaAprovacao: escopoAlteracoes.trim() || (ehMesmaRevisaoVigente ? `Anexo digital da revisão vigente ${revNorm}: ${file.name}` : `Publicação e homologação da ${revNorm} no Acervo SGQ`),
        escopoAlteracoes: escopoAlteracoes.trim() || `Arquivo anexado: ${file.name} (${formatFileSize(file.size)})`,
        origemRevisao: tipoVerificacao === 'AUTOMATICO' ? 'FONTE_EXTERNA_OFICIAL' : 'INTERNA',
        fonteVerificacao: urlFonteVerificacao || undefined,
        urlFonteExterna: urlFonteVerificacao || undefined,
        arquivoNome: fileMeta.arquivoNome,
        arquivoTamanhoBytes: fileMeta.arquivoTamanhoBytes,
        arquivoMimeType: fileMeta.arquivoMimeType,
        arquivoCaminho: fileMeta.arquivoCaminho,
        arquivoUrl: fileMeta.arquivoCaminho,
        dataUpload: fileMeta.dataUpload,
        arquivoBase64: fileMeta.arquivoBase64,
        ehImutavel: true,
        createdAt: now,
        updatedAt: now,
      };

      await saveRevisaoDocumental(organizationId, novaRevisao, currentUser);

      // 3. Cadastra ou atualiza o DocumentoControlado no controle geral
      const docPayload: DocumentoControlado = {
        id: docId,
        organizationId,
        codigo: codigoNorm,
        titulo: titulo.trim(),
        categoria,
        tipoSubcategoria: categoria === 'DOCUMENTO_AUTORIDADE' ? 'RBAC' : 'MOMQ',
        emissor: proprietarioCessor.trim(),
        proprietarioCessor: proprietarioCessor.trim(),
        areaPublicacao: areaPublicacao.trim(),
        numeroRevisao: revNorm,
        dataRevisao, // Data oficial da revisão informada no cabeçalho/publicação
        revisaoVigenteId: revId,
        revisaoVigenteNumero: revNorm,
        responsavelNome: currentUser?.displayName || 'Gestor SGQ',
        responsavelUid: currentUser?.uid,
        exigeEvidenciaLeitura: existingDoc?.exigeEvidenciaLeitura ?? true,
        aplicabilidadePadrao: existingDoc?.aplicabilidadePadrao || { tipo: 'TODAS_BASES_E_MODELOS' },
        statusGeral: 'ATIVO',
        tipoVerificacao,
        urlFonteVerificacao: urlFonteVerificacao.trim() || undefined,
        contatoClienteNome: contatoClienteNome.trim() || undefined,
        contatoClienteEmail: contatoClienteEmail.trim() || undefined,
        portalFabricanteUrl: portalFabricanteUrl.trim() || undefined,
        // REGRA DE GOVERNANÇA DOCUMENTAL:
        // O upload de arquivo NÃO constitui verificação em fonte externa.
        // A data da verificação pertence à consulta à fonte; a data da revisão pertence ao documento.
        // Se nunca houve verificação em fonte externa, manter status anterior ou PENDENTE_VERIFICACAO.
        statusVerificacao: existingDoc?.statusVerificacao || 'PENDENTE_VERIFICACAO',
        dataUltimaVerificacao: existingDoc?.dataUltimaVerificacao || undefined,
        detalhesUltimaVerificacao:
          existingDoc?.detalhesUltimaVerificacao ||
          `Arquivo digital "${file.name}" (${formatFileSize(file.size)}) arquivado no acervo como ${revNorm}. Pendente conferência contra fonte oficial.`,
        arquivoNome: fileMeta.arquivoNome,
        arquivoMimeType: fileMeta.arquivoMimeType,
        arquivoTamanhoBytes: fileMeta.arquivoTamanhoBytes,
        arquivoCaminho: fileMeta.arquivoCaminho,
        arquivoUrl: fileMeta.arquivoCaminho,
        dataUpload: fileMeta.dataUpload,
        arquivoBase64: fileMeta.arquivoBase64,
        createdAt: existingDoc?.createdAt || now,
        updatedAt: now,
      };

      await saveDocumentoControlado(organizationId, docPayload, currentUser);

      onSuccess(
        docPayload,
        novaRevisao,
        isExistingMode
          ? `Nova revisão ${numeroRevisao} do documento "${codigo}" salva com arquivo anexado!`
          : `Novo manual "${codigo} — ${titulo}" cadastrado e arquivado com sucesso no Acervo!`
      );
      onClose();
    } catch (err: any) {
      console.error('Erro ao fazer upload do manual:', err);
      setUploadError(err.message || 'Erro ao processar e salvar o manual. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Repositório & Upload de Manuais Técnicos
              </h2>
              <p className="text-xs text-slate-400">
                Alimente automaticamente o acervo, a revisão vigente e a comprovação regulamentar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Seleção do Tipo de Ação: Novo Manual ou Nova Versão de Existente */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setIsExistingMode(false);
                setSelectedDocId('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                !isExistingMode
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Cadastrar Novo Manual no Acervo
            </button>
            <button
              type="button"
              onClick={() => {
                setIsExistingMode(true);
                if (documentosExistentes.length > 0 && !selectedDocId) {
                  handleSelectExistingDoc(documentosExistentes[0].id);
                }
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                isExistingMode
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Subir Nova Versão / Revisão de Manual Existente
            </button>
          </div>

          {/* Se estiver no modo de manual existente */}
          {isExistingMode && (
            <div className="space-y-1.5 p-4 rounded-xl bg-sky-950/20 border border-sky-500/30">
              <label className="block text-xs font-semibold text-sky-300">
                Selecione o Manual a ser Atualizado:
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => handleSelectExistingDoc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {documentosExistentes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} — {d.titulo} (Revisão Atual: {d.numeroRevisao || d.revisaoVigenteNumero || 'S/R'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                A versão anterior será mantida intacta no histórico de revisões com todas as evidências preservadas.
              </p>
            </div>
          )}

          {/* Zona de Drop & Upload do Arquivo (PDF / DOCX) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Arquivo do Manual (PDF ou Word):
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? 'border-sky-500 bg-sky-500/10'
                  : file
                  ? 'border-emerald-500/60 bg-emerald-950/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="space-y-1 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white break-all">{file.name}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {formatFileSize(file.size)} • {file.type || 'Documento Técnico'}
                  </p>
                  <span className="text-[11px] text-sky-400 hover:underline pt-1">
                    Clique para trocar de arquivo
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Upload className="w-6 h-6 text-sky-400" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Arraste o arquivo PDF ou Word aqui, ou clique para navegar
                  </p>
                  <p className="text-xs text-slate-500">
                    Suporta PDF (.pdf), Word (.docx, .doc) de até 100MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dados no Controle Geral (Área, Título, Proprietário/Cessor, Revisão, Data) */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Dados do Controle Geral (Registrados Automaticamente)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código do Documento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MOMQ, RBAC 145, AMM-C208"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Área de Publicação */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Área de Publicação *
                </label>
                <input
                  type="text"
                  required
                  list="areas-publicacao-list"
                  placeholder="Selecione ou digite a área..."
                  value={areaPublicacao}
                  onChange={(e) => setAreaPublicacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
                <datalist id="areas-publicacao-list">
                  {AREAS_PUBLICACAO_SUGERIDAS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>

              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título Completo do Manual *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manual de Operações da Manutenção e Qualidade"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Proprietário / Cessor */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proprietário / Cessor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Impacto Aviation, ANAC, Boeing, Azul Linhas Aéreas"
                  value={proprietarioCessor}
                  onChange={(e) => setProprietarioCessor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria Documental
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaDocumental)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="DOCUMENTO_INTERNO">Manual Interno da Organização (MOMQ / POP / IT)</option>
                  <option value="DOCUMENTO_AUTORIDADE">Regulamento de Autoridade (ANAC / FAA)</option>
                  <option value="DOCUMENTO_FABRICANTE">Publicação de Fabricante (AMM / IPC / CMM)</option>
                  <option value="DOCUMENTO_CLIENTE">Manual Cedido por Cliente</option>
                </select>
              </div>

              {/* Número da Revisão */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número da Revisão Vigente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rev. 08, Emenda 09, Edição 2026"
                  value={numeroRevisao}
                  onChange={(e) => setNumeroRevisao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Data da Revisão */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Data da Revisão / Emissão *</span>
                  <span className="text-[10px] text-amber-400 font-normal">Data de publicação no documento</span>
                </label>
                <input
                  type="date"
                  required
                  value={dataRevisao}
                  onChange={(e) => setDataRevisao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Data de emissão/vigor informada no manual. Não confundir com a data da verificação.
                </span>
              </div>
            </div>

            {/* Escopo da Alteração / Justificativa */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Escopo das Alterações / Justificativa Técnica
              </label>
              <textarea
                rows={2}
                placeholder="Descreva sumariamente o que foi alterado nesta revisão (ex: revisão anual obrigatória, adequação à emenda 09 do RBAC 145, alteração de ferramental)..."
                value={escopoAlteracoes}
                onChange={(e) => setEscopoAlteracoes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          {/* Módulo de Automação vs Manual */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-indigo-400" />
              Módulo de Verificação de Vigência (Automação vs. Manual)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoVerificacao('AUTOMATICO')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tipoVerificacao === 'AUTOMATICO'
                    ? 'bg-indigo-950/30 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  AUTOMÁTICO (Checagem via Robô ANAC / Web)
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Para legislações públicas da ANAC (RBAC 145, IS 145, IAC). O robô verifica atualizações na internet.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTipoVerificacao('MANUAL')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tipoVerificacao === 'MANUAL'
                    ? 'bg-amber-950/30 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  MANUAL (Clientes / Fabricantes Restritos)
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Para manuais sob login, fornecidos por clientes ou fabricantes com fluxo de e-mail e alerta.
                </p>
              </button>
            </div>

            {tipoVerificacao === 'AUTOMATICO' ? (
              <div className="space-y-1 p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
                <label className="block text-xs font-semibold text-indigo-300 mb-1">
                  URL da Fonte Oficial Pública (ANAC / Diário Oficial):
                </label>
                <input
                  type="url"
                  placeholder="https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbacs/..."
                  value={urlFonteVerificacao}
                  onChange={(e) => setUrlFonteVerificacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">
                      Ponto Focal no Cliente (Nome):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Engenharia de Manutenção Azul"
                      value={contatoClienteNome}
                      onChange={(e) => setContatoClienteNome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">
                      E-mail para Solicitação de Revisão:
                    </label>
                    <input
                      type="email"
                      placeholder="engenharia@cliente.com.br"
                      value={contatoClienteEmail}
                      onChange={(e) => setContatoClienteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">
                    Portal Restrito do Fabricante (Opcional):
                  </label>
                  <input
                    type="url"
                    placeholder="https://myboeingfleet.com ou https://portal.cessna.com"
                    value={portalFabricanteUrl}
                    onChange={(e) => setPortalFabricanteUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé / Ações */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900/95 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando no Acervo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Publicar e Arquivar Manual</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
