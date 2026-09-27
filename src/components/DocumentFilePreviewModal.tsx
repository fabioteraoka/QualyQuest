import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Eye,
  FileText,
  FileCheck,
  Calendar,
  Layers,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { DocumentoControlado, RevisaoDocumental } from '../types';
import {
  getDocumentFileFromStorage,
  formatFileSize,
  downloadOrViewDocumentFile,
} from '../utils/documentFilesStorage';

interface DocumentFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documento: DocumentoControlado | null;
  revisao?: RevisaoDocumental | null;
}

export const DocumentFilePreviewModal: React.FC<DocumentFilePreviewModalProps> = ({
  isOpen,
  onClose,
  documento,
  revisao,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fileDetails, setFileDetails] = useState<{
    nome: string;
    mime: string;
    tamanho: number;
    dataUpload: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !documento) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setFileDetails(null);
      return;
    }

    setLoading(true);
    const targetId = revisao?.id || documento.id;

    async function loadBinary() {
      try {
        let base64 = revisao?.arquivoBase64 || documento?.arquivoBase64;
        let mime = revisao?.arquivoMimeType || documento?.arquivoMimeType || 'application/pdf';
        let nome = revisao?.arquivoNome || documento?.arquivoNome || `${documento?.codigo}_RevVigente.pdf`;
        let tamanho = revisao?.arquivoTamanhoBytes || documento?.arquivoTamanhoBytes || 0;
        let dataUpload = revisao?.dataUpload || documento?.dataUpload || documento?.updatedAt || new Date().toISOString();

        if (!base64 && targetId) {
          const stored = await getDocumentFileFromStorage(targetId);
          if (stored) {
            base64 = stored.dataBase64;
            mime = stored.mimeType || mime;
            nome = stored.nome || nome;
            tamanho = stored.tamanhoBytes || tamanho;
            dataUpload = stored.dataUpload || dataUpload;
          }
        }

        setFileDetails({
          nome,
          mime,
          tamanho,
          dataUpload,
        });

        setIsPdf(mime.includes('pdf') || nome.toLowerCase().endsWith('.pdf'));

        if (base64) {
          const byteCharacters = atob(base64.split(',')[1] || base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mime });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        } else {
          setBlobUrl(null);
        }
      } catch (err) {
        console.warn('Erro ao carregar pré-visualização:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBinary();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [isOpen, documento, revisao]);

  if (!isOpen || !documento) return null;

  const currentRev = revisao?.numeroRevisao || documento.numeroRevisao || documento.revisaoVigenteNumero || 'Vigente';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {documento.codigo}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentRev}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • {documento.areaPublicacao || 'SGQ'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white truncate max-w-xl">
                {documento.titulo}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadOrViewDocumentFile(revisao || documento, 'download')}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Baixar arquivo original"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Faixa de Metadados do Arquivo */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-slate-300 font-mono">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              {fileDetails?.nome || documento.arquivoNome || 'Arquivo Anexado'}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              {formatFileSize(fileDetails?.tamanho || documento.arquivoTamanhoBytes)}
            </span>
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-purple-400" />
              {documento.proprietarioCessor || documento.emissor || 'Impacto Aviation'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              {new Date(fileDetails?.dataUpload || documento.dataUpload || documento.updatedAt).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Cópia Controlada Vigente
            </span>
          </div>
        </div>

        {/* Área Central de Visualização */}
        <div className="flex-1 bg-slate-950 overflow-hidden relative flex flex-col items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Carregando arquivo do acervo...</p>
            </div>
          ) : blobUrl && isPdf ? (
            <iframe
              src={blobUrl}
              title={documento.titulo}
              className="w-full h-full border-0 bg-slate-900"
            />
          ) : blobUrl && !isPdf ? (
            <div className="p-8 text-center max-w-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Documento em Formato Word / Office
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Este arquivo está salvo com segurança no repositório com integridade garantida. Para editar ou visualizar com paginação completa do Microsoft Office, utilize o botão de download abaixo.
                </p>
              </div>
              <button
                onClick={() => downloadOrViewDocumentFile(revisao || documento, 'download')}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar {fileDetails?.nome || 'Arquivo Word'}
              </button>
            </div>
          ) : (
            <div className="p-8 text-center max-w-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Metadados e Ficha de Controle Registrados
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O registro técnico e número de revisão vigente estão controlados no sistema. O arquivo digital pode ser anexado a qualquer momento através do botão de Upload no Acervo.
                </p>
              </div>
              {documento.urlFonteVerificacao && (
                <a
                  href={documento.urlFonteVerificacao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Acessar Fonte Oficial Externa
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
